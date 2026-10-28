-- =====================================================================
-- SPACE CASE  ·  online backend, part 1
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again later: it only creates what is missing and
-- replaces the functions with their latest version.
--
-- What it sets up
--   profiles        public card for every astronaut (callsign, level, loadout)
--   saves           each player's save. Only the owner can read it, and
--                   nobody can write it directly: every change goes
--                   through the functions below, with a version number so
--                   an old tab or device can never overwrite newer progress
--   friendships     friend requests and friends
--   crews           crews, members (leader / officer / member), invites
--   trades          item + coin trades. Offered items are held in escrow,
--                   so nothing can be traded twice or duplicated
--   deliveries      a mailbox: items and coins sent to you by trades
--
-- Players can only READ through the API (and only what they are allowed
-- to see). Every WRITE happens inside the functions at the bottom, which
-- check who is calling and whether the move is allowed.
-- =====================================================================

create schema if not exists sc_private;
revoke all on schema sc_private from public;

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  callsign    text unique check (callsign ~ '^[A-Z0-9][A-Z0-9 -]{1,10}[A-Z0-9]$'),
  level       int  not null default 1,
  title       text,
  planet      int  not null default 1,
  loadout     jsonb not null default '{}'::jsonb,
  showcase    jsonb not null default '[]'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.saves (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb  not null default '{}'::jsonb,
  version     bigint not null default 1,
  updated_at  timestamptz not null default now()
);
-- the save version of the last time items or coins moved between players (trades, mailbox).
-- A device whose save is older than this can never overwrite the cloud, so nothing can be duplicated.
alter table public.saves add column if not exists econ_ver bigint not null default 0;

create table if not exists public.friendships (
  a            uuid not null references public.profiles(id) on delete cascade,
  b            uuid not null references public.profiles(id) on delete cascade,
  status       text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null,
  created_at   timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create table if not exists public.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 3 and 16),
  tag         text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  motto       text not null default '' check (char_length(motto) <= 40),
  leader      uuid not null references public.profiles(id),
  open        boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists crews_name_key on public.crews (upper(name));

create table if not exists public.crew_members (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  crew_id    uuid not null references public.crews(id) on delete cascade,
  role       text not null check (role in ('leader', 'officer', 'member')),
  joined_at  timestamptz not null default now()
);
create index if not exists crew_members_crew on public.crew_members (crew_id);

create table if not exists public.crew_requests (
  crew_id    uuid not null references public.crews(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('invite', 'request')),
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists public.trades (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references public.profiles(id) on delete cascade,
  to_user      uuid not null references public.profiles(id) on delete cascade,
  give_items   jsonb  not null default '{}'::jsonb,   -- escrow: item id -> {l, p}
  want_items   jsonb  not null default '[]'::jsonb,   -- item ids asked for
  give_coins   bigint not null default 0 check (give_coins >= 0),
  want_coins   bigint not null default 0 check (want_coins >= 0),
  note         text not null default '',
  status       text not null default 'open' check (status in ('open', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists trades_from on public.trades (from_user, status);
create index if not exists trades_to on public.trades (to_user, status);

create table if not exists public.deliveries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  items       jsonb  not null default '{}'::jsonb,    -- item id -> {l, p}
  coins       bigint not null default 0,
  reason      text   not null,
  from_user   uuid,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz
);
create index if not exists deliveries_open on public.deliveries (user_id) where claimed_at is null;
-- store balances (Stardust, supporter plate, premium cosmetics, season passes); more in the store section below
create table if not exists public.premium (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  stardust    bigint not null default 0 check (stardust >= 0),
  supporter   boolean not null default false,
  owned       text[] not null default '{}',
  passes      text[] not null default '{}',
  claims      jsonb not null default '{}'::jsonb,
  spent_cents bigint not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.deliveries add column if not exists crates jsonb not null default '[]'::jsonb;  -- free crate tiers (arena rewards)

-- ------------------------------------------------- read rules (RLS)
alter table public.profiles      enable row level security;
alter table public.saves         enable row level security;
alter table public.friendships   enable row level security;
alter table public.crews         enable row level security;
alter table public.crew_members  enable row level security;
alter table public.crew_requests enable row level security;
alter table public.trades        enable row level security;
alter table public.deliveries    enable row level security;

-- nobody writes tables directly, signed in or not
revoke insert, update, delete, truncate on public.profiles, public.saves, public.friendships, public.crews,
  public.crew_members, public.crew_requests, public.trades, public.deliveries from anon, authenticated;
revoke select on public.profiles, public.saves, public.friendships, public.crews,
  public.crew_members, public.crew_requests, public.trades, public.deliveries from anon;
grant select on public.profiles, public.saves, public.friendships, public.crews,
  public.crew_members, public.crew_requests, public.trades, public.deliveries to authenticated;

drop policy if exists "profiles are public to players" on public.profiles;
create policy "profiles are public to players" on public.profiles for select to authenticated using (true);
drop policy if exists "only you can read your save" on public.saves;
create policy "only you can read your save" on public.saves for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "see your own friendships" on public.friendships;
create policy "see your own friendships" on public.friendships for select to authenticated using ((select auth.uid()) in (a, b));
drop policy if exists "crews are public to players" on public.crews;
create policy "crews are public to players" on public.crews for select to authenticated using (true);
drop policy if exists "crew rosters are public to players" on public.crew_members;
create policy "crew rosters are public to players" on public.crew_members for select to authenticated using (true);
drop policy if exists "see your invites, or your crew's requests" on public.crew_requests;
create policy "see your invites, or your crew's requests" on public.crew_requests for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.crew_members m where m.crew_id = crew_requests.crew_id and m.user_id = (select auth.uid()) and m.role in ('leader', 'officer')));
drop policy if exists "see your own trades" on public.trades;
create policy "see your own trades" on public.trades for select to authenticated using ((select auth.uid()) in (from_user, to_user));
drop policy if exists "see your own mailbox" on public.deliveries;
create policy "see your own mailbox" on public.deliveries for select to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------------ helpers
-- who is calling. Banned players are stopped here, at the door of every server function
create or replace function sc_private.me() returns uuid language plpgsql stable set search_path = '' as $$
declare v uuid := auth.uid(); b record;
begin
  if v is null then raise exception 'SIGN IN FIRST'; end if;
  select banned_until, ban_reason into b from public.moderation where user_id = v and banned_until > now();
  if found then
    raise exception 'THIS ACCOUNT IS BANNED %. %', case when b.banned_until > now() + interval '50 years' then 'FOR GOOD' else 'UNTIL ' || to_char(b.banned_until, 'MON DD') end, upper(coalesce(b.ban_reason, ''));
  end if;
  return v;
end $$;

create or replace function sc_private.clean_name(p text) returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9 -]', '', 'g'), '\s+', ' ', 'g'))
$$;

create or replace function sc_private.bad_name(p text) returns boolean language sql immutable set search_path = '' as $$
  select exists (
    select 1 from unnest(array['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAGG', 'NAZI', 'KKK', 'RETARD', 'WHORE', 'SLUT', 'BITCH', 'PENIS', 'PUSSY', 'RAPIST', 'HITLER']) as b(w)
    where translate(regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9]', '', 'g'), '013457', 'OIEAST') like '%' || b.w || '%')
$$;

create or replace function sc_private.check_callsign(p text) returns text language plpgsql immutable set search_path = '' as $$
declare c text := sc_private.clean_name(p);
begin
  if c !~ '^[A-Z0-9][A-Z0-9 -]{1,10}[A-Z0-9]$' then raise exception 'CALLSIGNS ARE 3-12 LETTERS, NUMBERS, SPACES OR -'; end if;
  if sc_private.bad_name(c) then raise exception 'PICK A FRIENDLIER CALLSIGN'; end if;
  return c;
end $$;

create or replace function sc_private.num(j jsonb) returns numeric language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(j) = 'number' then (j #>> '{}')::numeric else null end
$$;

-- add items + coins to a save (duplicates level the item up, like opening a crate)
create or replace function sc_private.grant_items(d jsonb, items jsonb, coins numeric) returns jsonb language plpgsql volatile set search_path = '' as $$
declare k text; e jsonb; cur jsonb; l int; p int; t bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if jsonb_typeof(d -> 'inv') is distinct from 'object' then d := jsonb_set(d, '{inv}', '{}'::jsonb); end if;
  if jsonb_typeof(d -> 'fresh') is distinct from 'object' then d := jsonb_set(d, '{fresh}', '{}'::jsonb); end if;
  for k, e in select * from jsonb_each(coalesce(items, '{}'::jsonb)) loop
    cur := d -> 'inv' -> k;
    if cur is null then
      d := jsonb_set(d, array['inv', k], jsonb_build_object('l', greatest(1, least(10, coalesce(sc_private.num(e -> 'l'), 1)::int)), 'p', greatest(0, coalesce(sc_private.num(e -> 'p'), 0)::int), 't', t,
        'g', greatest(0, least(7, coalesce(sc_private.num(e -> 'g'), 0)::int))));
      d := jsonb_set(d, array['fresh', k], '1'::jsonb);
    else
      l := coalesce(sc_private.num(cur -> 'l'), 1)::int; p := coalesce(sc_private.num(cur -> 'p'), 0)::int;
      -- a traded copy from a higher crate tier upgrades your grade
      if coalesce(sc_private.num(e -> 'g'), 0) > coalesce(sc_private.num(cur -> 'g'), 0) then
        cur := cur || jsonb_build_object('g', least(7, sc_private.num(e -> 'g')::int));
        d := jsonb_set(d, array['inv', k], cur);
      end if;
      if l >= 10 then
        d := jsonb_set(d, '{research}', to_jsonb(coalesce(sc_private.num(d -> 'research'), 0) + 100));
      else
        p := p + 1; if p >= l then p := p - l; l := l + 1; end if;
        d := jsonb_set(d, array['inv', k], cur || jsonb_build_object('l', l, 'p', p));
      end if;
    end if;
  end loop;
  if coalesce(coins, 0) <> 0 then d := jsonb_set(d, '{coins}', to_jsonb(coalesce(sc_private.num(d -> 'coins'), 0) + coins)); end if;
  return d;
end $$;

-- remove items + coins from a save; refuses items you do not own or have equipped
create or replace function sc_private.take_items(d jsonb, ids text[], coins numeric, out d2 jsonb, out taken jsonb) language plpgsql volatile set search_path = '' as $$
declare k text; eqd text[];
begin
  taken := '{}'::jsonb; d2 := d;
  select coalesce(array_agg(v), '{}') into eqd from jsonb_each_text(case when jsonb_typeof(d -> 'eq') = 'object' then d -> 'eq' else '{}'::jsonb end) as x(s, v) where v is not null;
  foreach k in array coalesce(ids, '{}') loop
    if taken ? k then raise exception 'THE SAME ITEM IS LISTED TWICE'; end if;
    if d2 -> 'inv' -> k is null then raise exception 'ITEM NOT OWNED: %', k; end if;
    if k = any(eqd) then raise exception 'UNEQUIP IT BEFORE TRADING: %', k; end if;
    if sc_private.is_premium_id(k) then raise exception 'STORE AND REWARD ITEMS CANNOT BE TRADED OR SOLD'; end if;
    taken := taken || jsonb_build_object(k, jsonb_build_object('l', d2 -> 'inv' -> k -> 'l', 'p', d2 -> 'inv' -> k -> 'p', 'g', coalesce(d2 -> 'inv' -> k -> 'g', '0'::jsonb)));
    d2 := d2 #- array['inv', k];
    d2 := d2 #- array['fresh', k];
  end loop;
  if coalesce(coins, 0) > 0 then
    if coalesce(sc_private.num(d2 -> 'coins'), 0) < coins then raise exception 'NOT ENOUGH COINS'; end if;
    d2 := jsonb_set(d2, '{coins}', to_jsonb(sc_private.num(d2 -> 'coins') - coins));
  end if;
end $$;

create or replace function sc_private.check_save(d jsonb) returns void language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(d) is distinct from 'object' then raise exception 'BAD SAVE'; end if;
  if octet_length(d::text) > 3000000 then raise exception 'SAVE TOO BIG'; end if;
  if jsonb_typeof(d -> 'inv') is distinct from 'object' then raise exception 'BAD SAVE: NO INVENTORY'; end if;
  if coalesce(sc_private.num(d -> 'coins'), -1) < 0 or sc_private.num(d -> 'coins') > 1e15 then raise exception 'BAD SAVE: COINS'; end if;
end $$;

-- refresh the public card from a save
create or replace function sc_private.sync_profile(uid uuid, d jsonb) returns void language plpgsql volatile set search_path = '' as $$
begin
  update public.profiles set
    level    = coalesce(sc_private.num(d -> 'lvl')::int, level),
    title    = case when jsonb_typeof(d -> 'titles' -> 'eq') = 'string' then left(d -> 'titles' ->> 'eq', 40) else null end,
    planet   = coalesce(sc_private.num(d -> 'planet' -> 'reached')::int, planet),
    loadout  = case when jsonb_typeof(d -> 'eq') = 'object' then d -> 'eq' else '{}'::jsonb end,
    showcase = case when jsonb_typeof(d -> '_pub' -> 'showcase') = 'array' then d -> '_pub' -> 'showcase' else '[]'::jsonb end,
    stats    = jsonb_build_object(
                 'kills', d -> 'stats' -> 'kills', 'crates', d -> 'stats' -> 'crates', 'bestCombo', d -> 'stats' -> 'bestCombo',
                 'legendaries', d -> 'stats' -> 'legendaries', 'mythics', d -> 'stats' -> 'mythics', 'cosmics', d -> 'stats' -> 'cosmics',
                 'power', d -> '_pub' -> 'power', 'items', (select count(*) from jsonb_object_keys(d -> 'inv'))),
    last_seen = now()
  where id = uid;
end $$;

create or replace function sc_private.card(uid uuid) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'callsign', p.callsign, 'level', p.level, 'title', p.title, 'planet', p.planet,
    'online', p.last_seen > now() - interval '90 seconds', 'last_seen', p.last_seen,
    'plate', coalesce((select x.supporter from public.premium x where x.user_id = p.id), false),
    'bg', (select s.data ->> 'cardBg' from public.saves s join public.premium x on x.user_id = s.user_id where s.user_id = p.id and jsonb_typeof(s.data -> 'cardBg') = 'string' and ('card:' || (s.data ->> 'cardBg')) = any(x.owned)),
    'crew', (select jsonb_build_object('id', c.id, 'name', c.name, 'tag', c.tag) from public.crew_members m join public.crews c on c.id = m.crew_id where m.user_id = p.id))
  from public.profiles p where p.id = uid
$$;

create or replace function sc_private.find_callsign(p text) returns uuid language plpgsql stable set search_path = '' as $$
declare v uuid;
begin
  select id into v from public.profiles where callsign = sc_private.clean_name(p);
  if v is null then raise exception 'NO ASTRONAUT CALLED %', sc_private.clean_name(p); end if;
  return v;
end $$;

create or replace function sc_private.expire_trades() returns void language plpgsql volatile set search_path = '' as $$
declare t record;
begin
  for t in select * from public.trades where status = 'open' and created_at < now() - interval '3 days' for update skip locked loop
    update public.trades set status = 'expired', resolved_at = now() where id = t.id;
    insert into public.deliveries (user_id, items, coins, reason, from_user) values (t.from_user, t.give_items, t.give_coins, 'trade expired', t.to_user);
  end loop;
end $$;

create or replace function sc_private.can_trade(uid uuid, them uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.friendships where a = least(uid, them) and b = greatest(uid, them) and status = 'accepted')
      or exists (select 1 from public.crew_members m1 join public.crew_members m2 on m1.crew_id = m2.crew_id where m1.user_id = uid and m2.user_id = them)
$$;

create or replace function sc_private.my_crew_role(uid uuid, out crew uuid, out role text) language sql stable set search_path = '' as $$
  select crew_id, role from public.crew_members where user_id = uid
$$;

-- --------------------------------------------------- player & save API
create or replace function public.init_player(p_local jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record; created boolean := false; nm text;
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into s from public.saves where user_id = uid for update;
  if not found then
    if p_local is not null then perform sc_private.check_save(p_local); p_local := sc_private.strip_premium(uid, p_local); end if;
    insert into public.saves (user_id, data, version) values (uid, coalesce(p_local, '{"inv":{},"coins":0}'::jsonb), 1)
      returning * into s;
    created := true;
    -- keep the callsign from the local save if it is free and clean
    if p_local is not null and jsonb_typeof(p_local -> 'name') = 'string' then
      begin
        nm := sc_private.check_callsign(p_local ->> 'name');
        update public.profiles set callsign = nm where id = uid and callsign is null;
      exception when others then null;
      end;
    end if;
    perform sc_private.sync_profile(uid, s.data);
  end if;
  return jsonb_build_object('data', s.data, 'version', s.version, 'econ', s.econ_ver, 'created', created,
    'callsign', (select callsign from public.profiles where id = uid),
    'mail', (select count(*) from public.deliveries where user_id = uid and claimed_at is null));
end $$;

drop function if exists public.save_game(jsonb, bigint);
create or replace function public.save_game(p_data jsonb, p_base bigint, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record; cs text; why text;
begin
  perform sc_private.check_save(p_data);
  select * into s from public.saves where user_id = uid for update;
  if not found then raise exception 'NO SAVE YET'; end if;
  if s.version <> p_base and not (coalesce(p_force, false) and p_base >= s.econ_ver) then
    -- another device or tab saved first: hand back the newer save instead of overwriting it.
    -- can_force says whether this device may still choose to keep its own progress
    -- (only if no trades or mail happened since this device last synced)
    return jsonb_build_object('ok', false, 'conflict', true, 'data', s.data, 'version', s.version, 'can_force', p_base >= s.econ_ver);
  end if;
  select callsign into cs from public.profiles where id = uid;
  if cs is not null then p_data := jsonb_set(p_data, '{name}', to_jsonb(cs)); end if;
  p_data := sc_private.strip_premium(uid, p_data);
  why := sc_private.audit_save(s.data, p_data, extract(epoch from now() - s.updated_at));
  if why is not null then perform sc_private.flag(uid, why); end if;
  update public.saves set data = p_data, version = s.version + 1, updated_at = now() where user_id = uid;
  perform sc_private.sync_profile(uid, p_data);
  return jsonb_build_object('ok', true, 'version', s.version + 1,
    'mail', (select count(*) from public.deliveries where user_id = uid and claimed_at is null));
end $$;

create or replace function public.load_game() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record;
begin
  select * into s from public.saves where user_id = uid;
  if not found then return null; end if;
  return jsonb_build_object('data', s.data, 'version', s.version, 'callsign', (select callsign from public.profiles where id = uid));
end $$;

create or replace function public.touch() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set last_seen = now() where id = auth.uid()
$$;

create or replace function public.set_callsign(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); nm text := sc_private.check_callsign(p_name); v bigint;
begin
  begin
    update public.profiles set callsign = nm where id = uid;
  exception when unique_violation then raise exception 'THAT CALLSIGN IS TAKEN';
  end;
  update public.saves set data = jsonb_set(data, '{name}', to_jsonb(nm)), version = version + 1, updated_at = now()
    where user_id = uid returning version into v;
  return jsonb_build_object('callsign', nm, 'version', v);
end $$;

create or replace function public.get_profile(p_callsign text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); p record; f record;
begin
  select * into p from public.profiles where id = them;
  select * into f from public.friendships where a = least(uid, them) and b = greatest(uid, them);
  return sc_private.card(them) || jsonb_build_object('loadout', p.loadout, 'showcase', p.showcase, 'stats', p.stats,
    'friend', case when f is null then 'none' when f.status = 'accepted' then 'friends' when f.requested_by = uid then 'sent' else 'incoming' end,
    'me', them = uid,
    'arena', (select jsonb_build_object('trophies', a.trophies, 'kills', a.kills, 'deaths', a.deaths, 'best_streak', a.best_streak, 'duels_won', a.duels_won, 'duels_lost', a.duels_lost) from public.arena_stats a where a.user_id = them));
end $$;

create or replace function public.search_players(p_query text) returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(sc_private.card(p.id) order by p.last_seen desc), '[]'::jsonb)
  from (select id, last_seen from public.profiles
        where callsign is not null and callsign like sc_private.clean_name(p_query) || '%' and id <> auth.uid()
        order by last_seen desc limit 12) p
$$;

-- ------------------------------------------------------------- friends
create or replace function public.friend_request(p_callsign text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); f record;
begin
  if them = uid then raise exception 'THAT IS YOU'; end if;
  select * into f from public.friendships where a = least(uid, them) and b = greatest(uid, them) for update;
  if found then
    if f.status = 'accepted' then return 'already friends'; end if;
    if f.requested_by = uid then return 'already sent'; end if;
    update public.friendships set status = 'accepted' where a = f.a and b = f.b;
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where requested_by = uid and status = 'pending') >= 50 then raise exception 'TOO MANY REQUESTS WAITING'; end if;
  if (select count(*) from public.friendships where uid in (a, b) and status = 'accepted') >= 200 then raise exception 'FRIEND LIST IS FULL'; end if;
  insert into public.friendships (a, b, status, requested_by) values (least(uid, them), greatest(uid, them), 'pending', uid);
  return 'sent';
end $$;

create or replace function public.friend_respond(p_other uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  if p_accept then
    update public.friendships set status = 'accepted' where a = least(uid, p_other) and b = greatest(uid, p_other) and status = 'pending' and requested_by = p_other;
    if not found then raise exception 'NO REQUEST FROM THEM'; end if;
    return 'accepted';
  end if;
  delete from public.friendships where a = least(uid, p_other) and b = greatest(uid, p_other) and status = 'pending';
  return 'declined';
end $$;

create or replace function public.friend_remove(p_other uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  delete from public.friendships where a = least(uid, p_other) and b = greatest(uid, p_other);
  return 'removed';
end $$;

-- --------------------------------------------------------------- crews
create or replace function public.crew_create(p_name text, p_tag text, p_open boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); nm text := sc_private.clean_name(p_name); tg text := sc_private.clean_name(p_tag); cid uuid;
begin
  if exists (select 1 from public.crew_members where user_id = uid) then raise exception 'LEAVE YOUR CREW FIRST'; end if;
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  if char_length(nm) not between 3 and 16 then raise exception 'CREW NAMES ARE 3-16 CHARACTERS'; end if;
  tg := replace(replace(tg, ' ', ''), '-', '');
  if tg !~ '^[A-Z0-9]{2,4}$' then raise exception 'CREW TAGS ARE 2-4 LETTERS OR NUMBERS'; end if;
  if sc_private.bad_name(nm) or sc_private.bad_name(tg) then raise exception 'PICK A FRIENDLIER NAME'; end if;
  begin
    insert into public.crews (name, tag, leader, open) values (nm, tg, uid, coalesce(p_open, true)) returning id into cid;
  exception when unique_violation then raise exception 'THAT CREW NAME IS TAKEN';
  end;
  insert into public.crew_members (user_id, crew_id, role) values (uid, cid, 'leader');
  delete from public.crew_requests where user_id = uid;
  return cid;
end $$;

create or replace function public.crew_join(p_crew uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); c record; invited boolean;
begin
  if exists (select 1 from public.crew_members where user_id = uid) then raise exception 'LEAVE YOUR CREW FIRST'; end if;
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  select * into c from public.crews where id = p_crew for update;
  if not found then raise exception 'THAT CREW NO LONGER EXISTS'; end if;
  invited := exists (select 1 from public.crew_requests where crew_id = p_crew and user_id = uid and kind = 'invite');
  if not c.open and not invited then
    insert into public.crew_requests (crew_id, user_id, kind) values (p_crew, uid, 'request') on conflict do nothing;
    return 'requested';
  end if;
  if (select count(*) from public.crew_members where crew_id = p_crew) >= 20 then raise exception 'THAT CREW IS FULL (20)'; end if;
  insert into public.crew_members (user_id, crew_id, role) values (uid, p_crew, 'member');
  delete from public.crew_requests where user_id = uid;
  return 'joined';
end $$;

create or replace function public.crew_decline_invite(p_crew uuid) returns text
language sql security definer set search_path = '' as $$
  delete from public.crew_requests where crew_id = p_crew and user_id = auth.uid() and kind = 'invite' returning 'declined'
$$;

create or replace function public.crew_leave() returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); m record; heir uuid;
begin
  select * into m from public.crew_members where user_id = uid for update;
  if not found then return 'not in a crew'; end if;
  perform 1 from public.crews where id = m.crew_id for update;
  delete from public.crew_members where user_id = uid;
  if m.role = 'leader' then
    select user_id into heir from public.crew_members where crew_id = m.crew_id
      order by (role = 'officer') desc, joined_at asc limit 1;
    if heir is null then
      delete from public.crews where id = m.crew_id;
      return 'disbanded';
    end if;
    update public.crew_members set role = 'leader' where user_id = heir;
    update public.crews set leader = heir where id = m.crew_id;
  end if;
  return 'left';
end $$;

create or replace function public.crew_kick(p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); me_m record; t record;
begin
  select * into me_m from public.crew_members where user_id = uid;
  select * into t from public.crew_members where user_id = p_user;
  if me_m is null or t is null or me_m.crew_id <> t.crew_id then raise exception 'NOT IN YOUR CREW'; end if;
  if p_user = uid then raise exception 'USE LEAVE CREW INSTEAD'; end if;
  if not (me_m.role = 'leader' or (me_m.role = 'officer' and t.role = 'member')) then raise exception 'YOUR RANK CANNOT DO THAT'; end if;
  delete from public.crew_members where user_id = p_user;
  return 'kicked';
end $$;

create or replace function public.crew_set_role(p_user uuid, p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); me_m record;
begin
  select * into me_m from public.crew_members where user_id = uid;
  if me_m is null or me_m.role <> 'leader' then raise exception 'ONLY THE LEADER CAN CHANGE RANKS'; end if;
  if p_role not in ('officer', 'member') then raise exception 'BAD RANK'; end if;
  if p_user = uid then raise exception 'USE MAKE LEADER TO HAND OVER'; end if;
  update public.crew_members set role = p_role where user_id = p_user and crew_id = me_m.crew_id;
  if not found then raise exception 'NOT IN YOUR CREW'; end if;
  return p_role;
end $$;

create or replace function public.crew_transfer(p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); me_m record;
begin
  select * into me_m from public.crew_members where user_id = uid for update;
  if me_m is null or me_m.role <> 'leader' then raise exception 'ONLY THE LEADER CAN HAND OVER'; end if;
  update public.crew_members set role = 'leader' where user_id = p_user and crew_id = me_m.crew_id and user_id <> uid;
  if not found then raise exception 'NOT IN YOUR CREW'; end if;
  update public.crew_members set role = 'officer' where user_id = uid;
  update public.crews set leader = p_user where id = me_m.crew_id;
  return 'transferred';
end $$;

create or replace function public.crew_invite(p_callsign text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); me_m record;
begin
  select * into me_m from public.crew_members where user_id = uid;
  if me_m is null or me_m.role not in ('leader', 'officer') then raise exception 'ONLY LEADERS AND OFFICERS CAN INVITE'; end if;
  if exists (select 1 from public.crew_members where user_id = them) then raise exception 'THEY ARE ALREADY IN A CREW'; end if;
  if exists (select 1 from public.crew_requests where crew_id = me_m.crew_id and user_id = them and kind = 'request') then
    if (select count(*) from public.crew_members where crew_id = me_m.crew_id) >= 20 then raise exception 'YOUR CREW IS FULL (20)'; end if;
    insert into public.crew_members (user_id, crew_id, role) values (them, me_m.crew_id, 'member');
    delete from public.crew_requests where user_id = them;
    return 'joined';
  end if;
  insert into public.crew_requests (crew_id, user_id, kind) values (me_m.crew_id, them, 'invite')
    on conflict (crew_id, user_id) do update set kind = 'invite', created_at = now();
  return 'invited';
end $$;

create or replace function public.crew_respond(p_user uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); me_m record;
begin
  select * into me_m from public.crew_members where user_id = uid;
  if me_m is null or me_m.role not in ('leader', 'officer') then raise exception 'ONLY LEADERS AND OFFICERS CAN DO THAT'; end if;
  if not exists (select 1 from public.crew_requests where crew_id = me_m.crew_id and user_id = p_user and kind = 'request') then raise exception 'NO REQUEST FROM THEM'; end if;
  if not p_accept then delete from public.crew_requests where crew_id = me_m.crew_id and user_id = p_user; return 'declined'; end if;
  if exists (select 1 from public.crew_members where user_id = p_user) then delete from public.crew_requests where user_id = p_user; raise exception 'THEY JOINED ANOTHER CREW'; end if;
  if (select count(*) from public.crew_members where crew_id = me_m.crew_id) >= 20 then raise exception 'YOUR CREW IS FULL (20)'; end if;
  insert into public.crew_members (user_id, crew_id, role) values (p_user, me_m.crew_id, 'member');
  delete from public.crew_requests where user_id = p_user;
  return 'accepted';
end $$;

create or replace function public.crew_update(p_motto text, p_open boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); me_m record; mt text := left(sc_private.clean_name(p_motto), 40);
begin
  select * into me_m from public.crew_members where user_id = uid;
  if me_m is null or me_m.role <> 'leader' then raise exception 'ONLY THE LEADER CAN EDIT THE CREW'; end if;
  if sc_private.bad_name(mt) then raise exception 'PICK A FRIENDLIER MOTTO'; end if;
  update public.crews set motto = mt, open = coalesce(p_open, open) where id = me_m.crew_id;
  return 'saved';
end $$;

create or replace function public.crew_list(p_query text default '') returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by (x ->> 'members')::int desc), '[]'::jsonb) from (
    select jsonb_build_object('id', c.id, 'name', c.name, 'tag', c.tag, 'motto', c.motto, 'open', c.open,
      'members', (select count(*) from public.crew_members m where m.crew_id = c.id),
      'leader', (select callsign from public.profiles where id = c.leader)) as x
    from public.crews c where upper(c.name) like '%' || sc_private.clean_name(p_query) || '%'
    order by (select count(*) from public.crew_members m where m.crew_id = c.id) desc limit 30) q
$$;

create or replace function public.crew_view(p_crew uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'name', c.name, 'tag', c.tag, 'motto', c.motto, 'open', c.open, 'created_at', c.created_at,
    'members', (select coalesce(jsonb_agg(sc_private.card(m.user_id) || jsonb_build_object('role', m.role) order by
                 case m.role when 'leader' then 0 when 'officer' then 1 else 2 end, m.joined_at), '[]'::jsonb)
                from public.crew_members m where m.crew_id = c.id))
  from public.crews c where c.id = p_crew
$$;

-- -------------------------------------------------------------- trades
create or replace function public.trade_propose(p_to text, p_give text[], p_want text[], p_give_coins bigint default 0, p_want_coins bigint default 0, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_to); s record; their jsonb; r record; tid uuid; k text;
begin
  perform sc_private.expire_trades();
  perform sc_private.need_clean(uid);
  if sc_private.flagged(them) then raise exception 'THEIR TRADING IS PAUSED RIGHT NOW'; end if;
  if them = uid then raise exception 'YOU CANNOT TRADE WITH YOURSELF'; end if;
  if not sc_private.can_trade(uid, them) then raise exception 'YOU CAN ONLY TRADE WITH FRIENDS OR CREWMATES'; end if;
  if coalesce(array_length(p_give, 1), 0) > 6 or coalesce(array_length(p_want, 1), 0) > 6 then raise exception 'UP TO 6 ITEMS EACH WAY'; end if;
  if coalesce(p_give_coins, 0) < 0 or coalesce(p_want_coins, 0) < 0 or p_give_coins > 1e12 or p_want_coins > 1e12 then raise exception 'BAD COIN AMOUNT'; end if;
  if coalesce(array_length(p_give, 1), 0) + coalesce(array_length(p_want, 1), 0) = 0 and coalesce(p_give_coins, 0) + coalesce(p_want_coins, 0) = 0 then raise exception 'ADD AN ITEM OR SOME COINS'; end if;
  if (select count(*) from public.trades where from_user = uid and status = 'open') >= 5 then raise exception 'YOU HAVE 5 OFFERS WAITING. CANCEL ONE FIRST'; end if;
  select data into their from public.saves where user_id = them;
  foreach k in array coalesce(p_want, '{}') loop
    if their -> 'inv' -> k is null then raise exception 'THEY DO NOT OWN: %', k; end if;
  end loop;
  select * into s from public.saves where user_id = uid for update;
  select * into r from sc_private.take_items(s.data, p_give, p_give_coins);
  update public.saves set data = r.d2, version = s.version + 1, econ_ver = s.version + 1, updated_at = now() where user_id = uid;
  insert into public.trades (from_user, to_user, give_items, want_items, give_coins, want_coins, note)
    values (uid, them, r.taken, to_jsonb(coalesce(p_want, '{}')), coalesce(p_give_coins, 0), coalesce(p_want_coins, 0), left(sc_private.clean_name(p_note), 60))
    returning id into tid;
  return jsonb_build_object('trade', tid, 'data', r.d2, 'version', s.version + 1);
end $$;

create or replace function public.trade_accept(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); t record; s record; r record; d jsonb; want text[];
begin
  select * into t from public.trades where id = p_id and to_user = uid for update;
  if not found or t.status <> 'open' then raise exception 'THAT OFFER IS NO LONGER OPEN'; end if;
  if t.created_at < now() - interval '3 days' then raise exception 'THAT OFFER EXPIRED'; end if;
  perform sc_private.need_clean(uid);
  if sc_private.flagged(t.from_user) then raise exception 'THAT OFFER IS ON HOLD WHILE A MODERATOR CHECKS THE SENDER'; end if;
  select coalesce(array_agg(x), '{}') into want from jsonb_array_elements_text(t.want_items) as x;
  select * into s from public.saves where user_id = uid for update;
  select * into r from sc_private.take_items(s.data, want, t.want_coins);
  d := sc_private.grant_items(r.d2, t.give_items, t.give_coins);
  update public.saves set data = d, version = s.version + 1, econ_ver = s.version + 1, updated_at = now() where user_id = uid;
  insert into public.deliveries (user_id, items, coins, reason, from_user) values (t.from_user, r.taken, t.want_coins, 'trade', uid);
  update public.trades set status = 'accepted', resolved_at = now() where id = p_id;
  return jsonb_build_object('data', d, 'version', s.version + 1);
end $$;

create or replace function public.trade_decline(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); t record;
begin
  select * into t from public.trades where id = p_id and uid in (from_user, to_user) for update;
  if not found or t.status <> 'open' then raise exception 'THAT OFFER IS NO LONGER OPEN'; end if;
  update public.trades set status = case when uid = t.from_user then 'cancelled' else 'declined' end, resolved_at = now() where id = p_id;
  insert into public.deliveries (user_id, items, coins, reason, from_user)
    values (t.from_user, t.give_items, t.give_coins, case when uid = t.from_user then 'trade cancelled' else 'trade declined' end, t.to_user);
  return 'closed';
end $$;

-- what a friend or crewmate owns, so you can ask for something in a trade
create or replace function public.trade_inventory(p_callsign text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); d jsonb;
begin
  if them = uid then raise exception 'THAT IS YOU'; end if;
  if not sc_private.can_trade(uid, them) then raise exception 'YOU CAN ONLY TRADE WITH FRIENDS OR CREWMATES'; end if;
  select data into d from public.saves where user_id = them;
  return jsonb_build_object(
    'inv', (select coalesce(jsonb_object_agg(e.k, coalesce(e.v -> 'l', '1'::jsonb)), '{}'::jsonb) from jsonb_each(coalesce(d -> 'inv', '{}'::jsonb)) as e(k, v)),
    'eq', (select coalesce(jsonb_agg(x.v), '[]'::jsonb) from jsonb_each_text(case when jsonb_typeof(d -> 'eq') = 'object' then d -> 'eq' else '{}'::jsonb end) as x(s, v) where x.v is not null));
end $$;

-- collect everything in your mailbox into your save
create or replace function public.claim_mail() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record; m record; d jsonb; got jsonb := '[]'::jsonb;
begin
  select * into s from public.saves where user_id = uid for update;
  if not found then raise exception 'NO SAVE YET'; end if;
  d := s.data;
  for m in select * from public.deliveries where user_id = uid and claimed_at is null order by id for update skip locked loop
    d := sc_private.grant_items(d, m.items, m.coins);
    if jsonb_array_length(coalesce(m.crates, '[]'::jsonb)) > 0 then
      if jsonb_typeof(d -> 'choiceQueue') is distinct from 'array' then d := jsonb_set(d, '{choiceQueue}', '[]'::jsonb); end if;
      d := jsonb_set(d, '{choiceQueue}', (d -> 'choiceQueue') || (select coalesce(jsonb_agg(jsonb_build_object('tier', least(7, greatest(0, (t #>> '{}')::int)), 'title', case when m.reason like 'daily%' then 'DAILY CRATE' when m.reason like 'season%' then 'SEASON CRATE' else 'ARENA CRATE' end)), '[]'::jsonb) from jsonb_array_elements(m.crates) t));
    end if;
    update public.deliveries set claimed_at = now() where id = m.id;
    got := got || jsonb_build_array(jsonb_build_object('items', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(m.items) k),
      'coins', m.coins, 'crates', jsonb_array_length(coalesce(m.crates, '[]'::jsonb)), 'reason', m.reason, 'from', (select callsign from public.profiles where id = m.from_user)));
  end loop;
  if jsonb_array_length(got) = 0 then return jsonb_build_object('got', got, 'version', s.version); end if;
  update public.saves set data = d, version = s.version + 1, econ_ver = s.version + 1, updated_at = now() where user_id = uid;
  return jsonb_build_object('got', got, 'data', d, 'version', s.version + 1);
end $$;

-- ------------------------------------------- one call for the social screen
create or replace function public.my_social() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); cm record;
begin
  perform sc_private.expire_trades();
  update public.profiles set last_seen = now() where id = uid;
  select * into cm from public.crew_members where user_id = uid;
  return jsonb_build_object(
    'me', sc_private.card(uid),
    'friends', (select coalesce(jsonb_agg(sc_private.card(case when f.a = uid then f.b else f.a end) order by f.created_at), '[]'::jsonb)
                from public.friendships f where uid in (f.a, f.b) and f.status = 'accepted'),
    'incoming', (select coalesce(jsonb_agg(sc_private.card(f.requested_by)), '[]'::jsonb)
                 from public.friendships f where uid in (f.a, f.b) and f.status = 'pending' and f.requested_by <> uid),
    'outgoing', (select coalesce(jsonb_agg(sc_private.card(case when f.a = uid then f.b else f.a end)), '[]'::jsonb)
                 from public.friendships f where uid in (f.a, f.b) and f.status = 'pending' and f.requested_by = uid),
    'crew', case when cm is null then null else public.crew_view(cm.crew_id) || jsonb_build_object('my_role', cm.role,
              'requests', case when cm.role in ('leader', 'officer') then (select coalesce(jsonb_agg(sc_private.card(r.user_id)), '[]'::jsonb)
                from public.crew_requests r where r.crew_id = cm.crew_id and r.kind = 'request') else '[]'::jsonb end) end,
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'tag', c.tag)), '[]'::jsonb)
                from public.crew_requests r join public.crews c on c.id = r.crew_id where r.user_id = uid and r.kind = 'invite'),
    'trades', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'mine', t.from_user = uid,
                 'other', sc_private.card(case when t.from_user = uid then t.to_user else t.from_user end),
                 'give', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(t.give_items) k), 'want', t.want_items,
                 'give_coins', t.give_coins, 'want_coins', t.want_coins, 'note', t.note, 'created_at', t.created_at) order by t.created_at desc), '[]'::jsonb)
               from public.trades t where uid in (t.from_user, t.to_user) and t.status = 'open'),
    'mail', (select count(*) from public.deliveries where user_id = uid and claimed_at is null));
end $$;

-- =====================================================================
-- ARENAS, 1V1 DUELS, TROPHIES AND LEADERBOARDS
-- Matches run on players' devices (with AI pilots filling empty spots);
-- the server keeps the records, checks reports against time limits and
-- pays out coins, crates and trophies through the mailbox.
-- =====================================================================
create table if not exists public.arena_stats (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  kills        int not null default 0,
  deaths       int not null default 0,
  best_streak  int not null default 0,
  trophies     int not null default 0,
  duels_won    int not null default 0,
  duels_lost   int not null default 0,
  ranked_won   int not null default 0,
  ranked_lost  int not null default 0,
  updated_at   timestamptz not null default now()
);
create index if not exists arena_stats_trophies on public.arena_stats (trophies desc);
create index if not exists arena_stats_kills on public.arena_stats (kills desc);

create table if not exists public.arena_servers (
  id          text primary key,
  name        text not null,
  private     boolean not null default false,
  code        text unique,
  owner       uuid references public.profiles(id) on delete cascade,
  theme       int not null default 1,
  created_at  timestamptz not null default now()
);
insert into public.arena_servers (id, name, theme) values
  ('alpha', 'ALPHA STATION', 3), ('bravo', 'BRAVO RING', 8), ('nova', 'NOVA PIT', 14), ('void', 'VOID DOME', 20)
  on conflict (id) do nothing;

create table if not exists public.arena_presence (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  server_id    text not null references public.arena_servers(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  reported_at  timestamptz not null default now()
);
create index if not exists arena_presence_server on public.arena_presence (server_id, last_seen);

create table if not exists public.duel_queue (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  ranked      boolean not null,
  trophies    int not null default 0,
  created_at  timestamptz not null default now(),
  match_id    uuid
);

create table if not exists public.duels (
  id          uuid primary key default gen_random_uuid(),
  a           uuid not null references public.profiles(id) on delete cascade,
  b           uuid references public.profiles(id) on delete cascade,   -- null: an AI pilot
  ranked      boolean not null,
  created_at  timestamptz not null default now(),
  a_result    text check (a_result in ('win', 'loss')),
  b_result    text check (b_result in ('win', 'loss')),
  done        boolean not null default false,
  winner      uuid
);
alter table public.duels add column if not exists a_change int;
alter table public.duels add column if not exists b_change int;
alter table public.duels add column if not exists a_ai boolean not null default false;   -- this side ended up fighting an AI pilot
alter table public.duels add column if not exists b_ai boolean not null default false;
alter table public.duel_queue add column if not exists seen_at timestamptz not null default now();   -- last poll: only live searchers get matched
alter table public.duel_queue add column if not exists code text;                                      -- friends who type the same code only meet each other

-- these tables are only reached through the functions below
alter table public.arena_stats    enable row level security;
alter table public.arena_servers  enable row level security;
alter table public.arena_presence enable row level security;
alter table public.duel_queue     enable row level security;
alter table public.duels          enable row level security;
revoke all on public.arena_stats, public.arena_servers, public.arena_presence, public.duel_queue, public.duels from anon, authenticated;

-- ranks by trophies
create or replace function sc_private.rank_of(t int) returns text language sql immutable set search_path = '' as $$
  select case when t >= 6000 then 'GALACTIC' when t >= 3500 then 'MASTER' when t >= 2000 then 'DIAMOND' when t >= 1000 then 'PLATINUM'
              when t >= 500 then 'GOLD' when t >= 200 then 'SILVER' when t >= 50 then 'BRONZE' else 'ROOKIE' end
$$;
create or replace function sc_private.rank_idx(t int) returns int language sql immutable set search_path = '' as $$
  select case when t >= 6000 then 7 when t >= 3500 then 6 when t >= 2000 then 5 when t >= 1000 then 4 when t >= 500 then 3 when t >= 200 then 2 when t >= 50 then 1 else 0 end
$$;
create or replace function sc_private.astats(uid uuid) returns public.arena_stats language plpgsql volatile set search_path = '' as $$
declare r public.arena_stats;
begin
  perform sc_private.season();
  insert into public.arena_stats (user_id) values (uid) on conflict (user_id) do nothing;
  select * into r from public.arena_stats where user_id = uid for update;
  return r;
end $$;
create or replace function sc_private.humans_in(sid text) returns int language sql stable set search_path = '' as $$
  select count(*)::int from public.arena_presence where server_id = sid and last_seen > now() - interval '25 seconds'
$$;
create or replace function sc_private.arena_cap() returns int language sql immutable set search_path = '' as $$ select 5 $$;  -- real players per arena (free Supabase plan)

-- ------------------------------------------------------------ arenas
create or replace function public.arena_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  return (select coalesce(jsonb_agg(x order by (x ->> 'private')::boolean, x ->> 'name'), '[]'::jsonb) from (
    select jsonb_build_object('id', s.id, 'name', s.name, 'private', s.private, 'theme', s.theme, 'humans', sc_private.humans_in(s.id), 'cap', sc_private.arena_cap(),
      'owner', (select callsign from public.profiles where id = s.owner), 'mine', s.owner = uid, 'code', case when s.owner = uid then s.code else null end,
      'players', (select coalesce(jsonb_agg(p.callsign), '[]'::jsonb) from public.arena_presence ap join public.profiles p on p.id = ap.user_id where ap.server_id = s.id and ap.last_seen > now() - interval '25 seconds')) as x
    from public.arena_servers s
    where not s.private or s.owner = uid
       or exists (select 1 from public.friendships f where f.status = 'accepted' and f.a = least(uid, s.owner) and f.b = greatest(uid, s.owner))) q);
end $$;

create or replace function public.arena_create(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); nm text := left(sc_private.clean_name(p_name), 16); sid text; cd text;
begin
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  if char_length(nm) < 3 then raise exception 'SERVER NAMES ARE 3-16 CHARACTERS'; end if;
  if sc_private.bad_name(nm) then raise exception 'PICK A FRIENDLIER NAME'; end if;
  delete from public.arena_servers where owner = uid and private;   -- one private server each
  sid := 'p' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);
  cd := upper(translate(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6), '01', '89'));
  insert into public.arena_servers (id, name, private, code, owner, theme) values (sid, nm, true, cd, uid, 1 + floor(random() * 20)::int);
  return jsonb_build_object('id', sid, 'code', cd, 'name', nm);
end $$;

create or replace function public.arena_join(p_server text, p_code text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record; n int;
begin
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  if p_code is not null and p_code <> '' then select * into s from public.arena_servers where code = upper(btrim(p_code));
  else select * into s from public.arena_servers where id = p_server; end if;
  if not found then raise exception 'NO SERVER WITH THAT CODE'; end if;
  if s.private and s.owner <> uid and coalesce(upper(btrim(p_code)), '') <> s.code
     and not exists (select 1 from public.friendships f where f.status = 'accepted' and f.a = least(uid, s.owner) and f.b = greatest(uid, s.owner)) then
    raise exception 'THAT SERVER IS PRIVATE';
  end if;
  n := (select count(*) from public.arena_presence where server_id = s.id and user_id <> uid and last_seen > now() - interval '25 seconds');
  if n >= sc_private.arena_cap() then raise exception 'SERVER FULL. TRY ANOTHER'; end if;
  insert into public.arena_presence (user_id, server_id) values (uid, s.id)
    on conflict (user_id) do update set server_id = excluded.server_id, joined_at = now(), last_seen = now(), reported_at = now();
  perform sc_private.astats(uid);
  return jsonb_build_object('id', s.id, 'name', s.name, 'theme', s.theme, 'private', s.private, 'code', case when s.owner = uid then s.code else null end);
end $$;

create or replace function public.arena_ping(p_server text) returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  update public.arena_presence set last_seen = now() where user_id = uid and server_id = p_server;
  update public.profiles set last_seen = now() where id = uid;
  return sc_private.humans_in(p_server);
end $$;

create or replace function public.arena_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.arena_presence where user_id = auth.uid()
$$;

-- kills since the last report. Limited by the time that passed, so nobody can claim more than they could have done.
create or replace function public.arena_report(p_server text, p_kills int, p_human_kills int, p_deaths int, p_streak int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); pr record; st public.arena_stats; secs numeric; k int; hk int; dth int; coins int; tro int; crates jsonb := '[]'::jsonb; i int; tier int;
begin
  select * into pr from public.arena_presence where user_id = uid and server_id = p_server for update;
  if not found then raise exception 'NOT IN THAT ARENA'; end if;
  secs := extract(epoch from now() - pr.reported_at);
  k := least(greatest(coalesce(p_kills, 0), 0), floor(secs / 1.2)::int + 2);
  hk := least(greatest(coalesce(p_human_kills, 0), 0), k);
  dth := least(greatest(coalesce(p_deaths, 0), 0), floor(secs / 2)::int + 2);
  update public.arena_presence set reported_at = now(), last_seen = now() where user_id = uid;
  st := sc_private.astats(uid);
  coins := (k - hk) * 20 + hk * 60;
  tro := k + hk * 2;
  tier := least(6, 2 + sc_private.rank_idx(st.trophies) / 2);
  for i in 1..k loop
    if jsonb_array_length(crates) < 3 and random() < (case when i <= hk then 0.10 else 0.03 end) then crates := crates || to_jsonb(tier); end if;
  end loop;
  update public.arena_stats set kills = kills + k, deaths = deaths + dth, trophies = trophies + tro,
    best_streak = greatest(best_streak, least(greatest(coalesce(p_streak, 0), 0), kills + k)), updated_at = now() where user_id = uid;
  if coins > 0 or jsonb_array_length(crates) > 0 then
    insert into public.deliveries (user_id, coins, crates, reason) values (uid, coins, crates, 'arena kills');
  end if;
  return jsonb_build_object('kills', k, 'coins', coins, 'crates', jsonb_array_length(crates), 'trophies_gained', tro, 'trophies', st.trophies + tro, 'rank', sc_private.rank_of(st.trophies + tro));
end $$;

-- ------------------------------------------------------------ 1v1 duels
drop function if exists public.duel_find(boolean);
create or replace function public.duel_find(p_ranked boolean, p_code text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); q record; o record; st public.arena_stats; mid uuid; dl record; has_dl boolean; waited numeric; cd text; rk boolean;
begin
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  cd := nullif(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), '');
  if cd is not null and length(cd) < 3 then raise exception 'USE A CODE OF 3 OR MORE LETTERS'; end if;
  cd := left(cd, 12);
  -- searchers who stopped asking are gone
  delete from public.duel_queue where user_id <> uid and seen_at < now() - interval '20 seconds';
  update public.profiles set last_seen = now() where id = uid;
  st := sc_private.astats(uid);
  insert into public.duel_queue (user_id, ranked, trophies, code) values (uid, coalesce(p_ranked, false), st.trophies, cd)
    on conflict (user_id) do update set ranked = excluded.ranked, trophies = excluded.trophies, code = excluded.code, seen_at = now(),
      created_at = case when public.duel_queue.match_id is null and public.duel_queue.ranked = excluded.ranked and public.duel_queue.code is not distinct from excluded.code
                        then public.duel_queue.created_at else now() end;
  select * into q from public.duel_queue where user_id = uid for update;
  if q.match_id is not null then
    select * into dl from public.duels where id = q.match_id; has_dl := found;
    if has_dl and not dl.done and dl.created_at > now() - interval '45 seconds' then
      delete from public.duel_queue where user_id = uid;
      return jsonb_build_object('match', dl.id, 'host', dl.a = uid, 'ranked', dl.ranked, 'opponent', sc_private.card(case when dl.a = uid then dl.b else dl.a end));
    end if;
    update public.duel_queue set match_id = null, created_at = now() where user_id = uid;   -- an old match nobody played: search again
    q.created_at := now();
  end if;
  waited := extract(epoch from now() - q.created_at);
  -- anyone still searching right now. Same mode first; after a few seconds ranked and unranked meet (then it is unranked)
  select * into o from public.duel_queue x
    where x.user_id <> uid and x.match_id is null and x.seen_at > now() - interval '6 seconds'
      and x.code is not distinct from cd
      and (cd is not null or x.ranked = q.ranked or greatest(waited, extract(epoch from now() - x.created_at)) > 4)
      and (cd is not null or abs(x.trophies - q.trophies) <= 200 + 40 * greatest(waited, extract(epoch from now() - x.created_at)))
    order by (x.ranked = q.ranked) desc, x.created_at limit 1 for update skip locked;
  if not found then
    return jsonb_build_object('waiting', true, 'waited', floor(waited),
      'others', (select count(*) from public.profiles where id <> uid and last_seen > now() - interval '90 seconds'),
      'searching', (select count(*) from public.duel_queue where user_id <> uid and match_id is null and seen_at > now() - interval '6 seconds' and code is null));
  end if;
  rk := q.ranked and o.ranked and cd is null;
  insert into public.duels (a, b, ranked) values (o.user_id, uid, rk) returning id into mid;
  update public.duel_queue set match_id = mid where user_id = o.user_id;
  delete from public.duel_queue where user_id = uid;
  return jsonb_build_object('match', mid, 'host', false, 'ranked', rk, 'opponent', sc_private.card(o.user_id));
end $$;

create or replace function public.duel_cancel() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); q record; dl record;
begin
  select * into q from public.duel_queue where user_id = uid for update;
  if not found then return jsonb_build_object('cancelled', true); end if;
  if q.match_id is not null then   -- someone found us at the last second
    select * into dl from public.duels where id = q.match_id; delete from public.duel_queue where user_id = uid;
    return jsonb_build_object('match', dl.id, 'host', dl.a = uid, 'ranked', dl.ranked, 'opponent', sc_private.card(case when dl.a = uid then dl.b else dl.a end));
  end if;
  delete from public.duel_queue where user_id = uid;
  return jsonb_build_object('cancelled', true);
end $$;

create or replace function public.duel_ai(p_ranked boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); mid uuid;
begin
  delete from public.duel_queue where user_id = uid;
  perform sc_private.astats(uid);
  insert into public.duels (a, b, ranked) values (uid, null, coalesce(p_ranked, false)) returning id into mid;
  return jsonb_build_object('match', mid, 'host', true, 'ranked', coalesce(p_ranked, false));
end $$;

alter table public.duels add column if not exists left_by uuid;     -- the pilot who quit: their late report counts as a loss
alter table public.duels add column if not exists a_coins int;
alter table public.duels add column if not exists b_coins int;

-- 1v1 coins follow how far you've got: a win is worth a couple of crates at your current tier, ranked or not
create or replace function sc_private.duel_coins(uid uuid, won boolean, vs_ai boolean) returns int language plpgsql stable set search_path = '' as $$
declare reached int; crate int;
begin
  select coalesce(case when jsonb_typeof(data -> 'planet' -> 'reached') = 'number' then (data -> 'planet' ->> 'reached')::int end, 1) into reached from public.saves where user_id = uid;
  reached := greatest(1, coalesce(reached, 1));
  crate := 200 * (case when reached >= 16 then 64 when reached >= 13 then 32 when reached >= 10 then 16 when reached >= 7 then 8 when reached >= 4 then 4 when reached >= 2 then 2 else 1 end);
  return greatest(case when won then 200 else 60 end,
    round(crate * case when won then (case when vs_ai then 1.0 else 2.5 end) else (case when vs_ai then 0.25 else 0.5 end) end)::int);
end $$;

create or replace function sc_private.duel_settle(uid uuid, won boolean, ranked boolean, vs_ai boolean) returns jsonb language plpgsql volatile set search_path = '' as $$
declare st public.arena_stats; dt int := 0; coins int;
begin
  st := sc_private.astats(uid);
  if ranked then dt := case when won then (case when vs_ai then 14 else 30 end) else -(case when vs_ai then 8 else 15 end) end; end if;
  dt := greatest(dt, -st.trophies);
  update public.arena_stats set trophies = trophies + dt,
    duels_won = duels_won + (case when won then 1 else 0 end), duels_lost = duels_lost + (case when won then 0 else 1 end),
    ranked_won = ranked_won + (case when ranked and won then 1 else 0 end), ranked_lost = ranked_lost + (case when ranked and not won then 1 else 0 end), updated_at = now()
    where user_id = uid;
  coins := sc_private.duel_coins(uid, won, vs_ai);
  insert into public.deliveries (user_id, coins, crates, reason) values (uid, coins,
    case when won and ranked and random() < 0.35 then jsonb_build_array(least(6, 2 + sc_private.rank_idx(st.trophies + dt) / 2)) else '[]'::jsonb end, case when won then 'duel won' else 'duel played' end);
  return jsonb_build_object('won', won, 'trophy_change', dt, 'trophies', st.trophies + dt, 'rank', sc_private.rank_of(st.trophies + dt), 'coins', coins);
end $$;

drop function if exists public.duel_report(uuid, boolean);
drop function if exists public.duel_report(uuid, boolean, boolean);
-- p_forfeit: the other pilot left the match, so this pilot wins right away. Whoever leaves loses, even if their report comes in later.
create or replace function public.duel_report(p_match uuid, p_won boolean, p_ai boolean default false, p_forfeit boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); dl record; mine text := case when p_won then 'win' else 'loss' end; other text; res jsonb; oth jsonb; is_a boolean; opp uuid;
begin
  select * into dl from public.duels where id = p_match for update;
  if not found or uid not in (dl.a, coalesce(dl.b, dl.a)) then raise exception 'NOT YOUR MATCH'; end if;
  is_a := uid = dl.a; opp := case when is_a then dl.b else dl.a end;
  if dl.done or (dl.b is not null and (case when is_a then dl.a_change else dl.b_change end) is not null and (case when is_a then dl.a_ai else dl.b_ai end)) then
    return jsonb_build_object('done', true, 'won', case when (case when is_a then dl.a_ai else dl.b_ai end) then (case when is_a then dl.a_result else dl.b_result end) = 'win' else dl.winner is not null and dl.winner = uid end,
      'disputed', dl.winner is null and dl.b is not null and not dl.a_ai and not dl.b_ai,
      'left', dl.left_by is not null and dl.left_by <> uid,
      'trophy_change', coalesce(case when is_a then dl.a_change else dl.b_change end, 0), 'coins', coalesce(case when is_a then dl.a_coins else dl.b_coins end, 0),
      'trophies', (select trophies from public.arena_stats where user_id = uid), 'rank', sc_private.rank_of(coalesce((select trophies from public.arena_stats where user_id = uid), 0)));
  end if;
  if dl.created_at < now() - interval '30 minutes' then raise exception 'THAT MATCH IS TOO OLD'; end if;
  if dl.b is null then   -- against an AI pilot
    update public.duels set a_result = mine where id = dl.id;
    res := sc_private.duel_settle(uid, p_won, dl.ranked, true);
    update public.duels set done = true, winner = case when p_won then uid else null end, a_change = (res ->> 'trophy_change')::int, a_coins = (res ->> 'coins')::int where id = dl.id;
    return jsonb_build_object('done', true) || res;
  end if;
  -- the other pilot left: this pilot wins now, the leaver gets their loss when (if) they report
  if p_forfeit and p_won and (case when is_a then dl.b_result else dl.a_result end) is null then
    res := sc_private.duel_settle(uid, true, dl.ranked, false);
    if is_a then update public.duels set a_result = 'win', a_ai = true, a_change = (res ->> 'trophy_change')::int, a_coins = (res ->> 'coins')::int, left_by = opp, winner = uid where id = dl.id;
    else update public.duels set b_result = 'win', b_ai = true, b_change = (res ->> 'trophy_change')::int, b_coins = (res ->> 'coins')::int, left_by = opp, winner = uid where id = dl.id; end if;
    return jsonb_build_object('done', true, 'left', true) || res;
  end if;
  -- this pilot left (the other side already took the win), or one side fought an AI stand-in: settle just this side
  if dl.left_by = uid or p_ai or (is_a and dl.b_ai) or (not is_a and dl.a_ai) then
    if dl.left_by = uid then mine := 'loss'; res := sc_private.duel_settle(uid, false, dl.ranked, false);
    else res := sc_private.duel_settle(uid, p_won, dl.ranked, true); end if;
    if is_a then update public.duels set a_result = mine, a_ai = true, a_change = (res ->> 'trophy_change')::int, a_coins = (res ->> 'coins')::int where id = dl.id;
    else update public.duels set b_result = mine, b_ai = true, b_change = (res ->> 'trophy_change')::int, b_coins = (res ->> 'coins')::int where id = dl.id; end if;
    update public.duels set done = (a_change is not null and b_change is not null) where id = dl.id;
    return jsonb_build_object('done', true) || res;
  end if;
  if is_a then update public.duels set a_result = mine where id = dl.id; other := dl.b_result;
  else update public.duels set b_result = mine where id = dl.id; other := dl.a_result; end if;
  if other is null and not (mine = 'loss' or dl.created_at < now() - interval '4 minutes') then
    return jsonb_build_object('done', false, 'pending', true);
  end if;
  update public.duels set done = true where id = dl.id;
  if other is not null and other = mine then return jsonb_build_object('done', true, 'disputed', true); end if;   -- both claim the same: nobody gains
  if p_won then update public.duels set winner = uid where id = dl.id; else update public.duels set winner = opp where id = dl.id; end if;
  -- reporting a loss before the other side has reported means this pilot quit
  if not p_won and other is null then update public.duels set left_by = uid where id = dl.id; end if;
  res := sc_private.duel_settle(uid, p_won, dl.ranked, false);
  oth := sc_private.duel_settle(opp, not p_won, dl.ranked, false);
  update public.duels set a_change = case when is_a then (res ->> 'trophy_change')::int else (oth ->> 'trophy_change')::int end,
                          b_change = case when is_a then (oth ->> 'trophy_change')::int else (res ->> 'trophy_change')::int end,
                          a_coins = case when is_a then (res ->> 'coins')::int else (oth ->> 'coins')::int end,
                          b_coins = case when is_a then (oth ->> 'coins')::int else (res ->> 'coins')::int end where id = dl.id;
  return jsonb_build_object('done', true) || res;
end $$;

-- ------------------------------------------------------- leaderboards
create or replace function public.leaderboard(p_kind text default 'trophies') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); col text := case p_kind when 'kills' then 'kills' when 'streak' then 'best_streak' when 'duels' then 'ranked_won' else 'trophies' end; top jsonb; me jsonb;
begin
  execute format($q$select coalesce(jsonb_agg(jsonb_build_object('callsign', p.callsign, 'value', a.%1$I, 'rank', sc_private.rank_of(a.trophies),
      'crew', (select c.tag from public.crew_members m join public.crews c on c.id = m.crew_id where m.user_id = a.user_id), 'me', a.user_id = $1, 'plate', coalesce((select x.supporter from public.premium x where x.user_id = a.user_id), false)) order by a.%1$I desc, a.updated_at), '[]'::jsonb)
    from (select * from public.arena_stats x where not sc_private.flagged(x.user_id) order by %1$I desc, updated_at limit 50) a join public.profiles p on p.id = a.user_id where p.callsign is not null$q$, col) into top using uid;
  execute format($q$select jsonb_build_object('value', a.%1$I, 'place', (select count(*) + 1 from public.arena_stats b where b.%1$I > a.%1$I)) from public.arena_stats a where a.user_id = $1$q$, col) into me using uid;
  return jsonb_build_object('kind', col, 'top', top, 'me', me);
end $$;

create or replace function public.my_arena() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); st public.arena_stats; ss record;
begin
  st := sc_private.astats(uid); select * into ss from sc_private.season();
  return to_jsonb(st) - 'user_id' || jsonb_build_object('rank', sc_private.rank_of(st.trophies), 'rank_idx', sc_private.rank_idx(st.trophies),
    'season', ss.season, 'season_ends', ss.ends_at,
    'last_season', (select jsonb_build_object('season', r.season, 'place', r.place, 'rank', r.rank, 'trophies', r.trophies) from public.season_results r where r.user_id = uid order by r.season desc limit 1));
end $$;

-- how busy it is: real players online, plus the AI pilots flying in arenas that are running right now
create or replace function public.online_counts() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'online', (select count(*) from public.profiles where last_seen > now() - interval '90 seconds'),
    'in_arenas', (select count(*) from public.arena_presence where last_seen > now() - interval '25 seconds'),
    'ai', (select coalesce(sum(least(5, greatest(0, 10 - h))), 0) from (select count(*) as h from public.arena_presence where last_seen > now() - interval '25 seconds' group by server_id) x)
         + (select count(*) from public.duels where b is null and not done and created_at > now() - interval '5 minutes'))
$$;

-- =====================================================================
-- FAIR PLAY, MODERATION, DAILY REWARDS, SEASONS, MARKET, CHALLENGES
-- =====================================================================
-- private per-player records (nobody reads these tables directly)
create table if not exists public.moderation (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  flagged      boolean not null default false,     -- a save looked impossible: trading, market and leaderboards pause until a moderator checks
  flag_reason  text,
  flagged_at   timestamptz,
  banned_until timestamptz,
  ban_reason   text
);
create table if not exists public.admins (user_id uuid primary key references public.profiles(id) on delete cascade);
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  reporter    uuid references public.profiles(id) on delete set null,   -- null: the automatic fair-play check
  target      uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  note        text not null default '',
  status      text not null default 'open' check (status in ('open', 'done')),
  created_at  timestamptz not null default now(),
  handled_by  uuid,
  handled_at  timestamptz
);
create index if not exists reports_open on public.reports (status, created_at);
create table if not exists public.mod_log (
  id bigint generated always as identity primary key, admin uuid, target uuid, action text, detail text, created_at timestamptz not null default now()
);
create table if not exists public.daily (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  last_day date, last_at timestamptz, streak int not null default 0
);
create table if not exists public.season_state (
  id int primary key default 1 check (id = 1), season int not null, ends_at timestamptz not null
);
create table if not exists public.season_results (
  season int not null, user_id uuid not null references public.profiles(id) on delete cascade, trophies int not null, rank text not null, place int not null,
  primary key (season, user_id)
);
create table if not exists public.market (
  id          bigint generated always as identity primary key,
  seller      uuid not null references public.profiles(id) on delete cascade,
  item_id     text not null,
  item        jsonb not null,                       -- {l, p, g}
  price       bigint not null check (price between 1 and 1000000000),
  status      text not null default 'open' check (status in ('open', 'sold', 'cancelled', 'expired')),
  buyer       uuid,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index if not exists market_open on public.market (status, created_at desc);
create index if not exists market_seller on public.market (seller, status);
create table if not exists public.challenges (
  id          bigint generated always as identity primary key,
  from_user   uuid not null references public.profiles(id) on delete cascade,
  to_user     uuid not null references public.profiles(id) on delete cascade,
  code        text not null,
  status      text not null default 'open' check (status in ('open', 'accepted', 'declined', 'expired')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists challenges_to on public.challenges (to_user, status);
alter table public.challenges add column if not exists kind text not null default 'duel';   -- 'duel' or 'coop' (land on a planet together)
alter table public.challenges add column if not exists planet int;
do $$ declare t text; begin
  foreach t in array array['moderation', 'admins', 'reports', 'mod_log', 'daily', 'season_state', 'season_results', 'market', 'challenges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

create or replace function sc_private.is_admin(uid uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = uid)
$$;
create or replace function sc_private.flagged(uid uuid) returns boolean language sql stable set search_path = '' as $$
  select coalesce((select flagged from public.moderation where user_id = uid), false)
$$;
create or replace function sc_private.flag(uid uuid, why text) returns void language plpgsql volatile set search_path = '' as $$
begin
  if sc_private.flagged(uid) then return; end if;
  insert into public.moderation (user_id, flagged, flag_reason, flagged_at) values (uid, true, why, now())
    on conflict (user_id) do update set flagged = true, flag_reason = why, flagged_at = now();
  insert into public.reports (reporter, target, reason, note) values (null, uid, 'AUTO', why);
end $$;
create or replace function sc_private.need_clean(uid uuid) returns void language plpgsql stable set search_path = '' as $$
begin
  if sc_private.flagged(uid) then raise exception 'TRADING IS PAUSED ON THIS ACCOUNT UNTIL A MODERATOR CHECKS IT'; end if;
end $$;

-- the fair-play check on every cloud save: generous limits, only impossible jumps trip it.
-- It never rejects or changes a save; it flags the account for a moderator to look at.
create or replace function sc_private.audit_save(old jsonb, d jsonb, secs numeric) returns text language plpgsql immutable set search_path = '' as $$
declare c0 numeric := coalesce(sc_private.num(old -> 'coins'), 0); c1 numeric := coalesce(sc_private.num(d -> 'coins'), 0);
        n0 int; n1 int; bad text; s numeric := greatest(0, least(coalesce(secs, 0), 86400 * 30));
begin
  -- only when the mark first appears, so a moderator's all-clear sticks
  if coalesce(d ->> 'tamper', '0') not in ('0', 'false') and coalesce(old ->> 'tamper', '0') in ('0', 'false') then return 'THE SAVE FILE WAS EDITED BY HAND'; end if;
  if c1 > 5e10 then return 'MORE COINS THAN THE GAME CAN GIVE'; end if;
  if c1 - c0 > 600000 + c0 * 2 + s * 12000 then return 'COINS JUMPED FROM ' || c0::bigint || ' TO ' || c1::bigint; end if;
  select count(*) into n0 from jsonb_object_keys(coalesce(old -> 'inv', '{}'::jsonb));
  select count(*) into n1 from jsonb_object_keys(coalesce(d -> 'inv', '{}'::jsonb));
  if n1 - n0 > 120 + s / 2 then return (n1 - n0) || ' NEW ITEMS AT ONCE'; end if;
  select k into bad from jsonb_each(coalesce(d -> 'inv', '{}'::jsonb)) as e(k, v)
    where length(k) > 64 or k !~ '^[a-z0-9|_:#.-]+$' or coalesce(sc_private.num(v -> 'l'), 1) > 10 or coalesce(sc_private.num(v -> 'l'), 1) < 1
       or coalesce(sc_private.num(v -> 'g'), 0) > 7 or coalesce(sc_private.num(v -> 'g'), 0) < 0 limit 1;
  if bad is not null then return 'AN ITEM THE GAME CANNOT MAKE: ' || left(bad, 40); end if;
  if coalesce(sc_private.num(d -> 'lvl'), 1) - coalesce(sc_private.num(old -> 'lvl'), 1) > 15 + s / 120 then return 'LEVEL JUMPED'; end if;
  if coalesce(sc_private.num(d -> 'lvl'), 1) > 400 then return 'LEVEL TOO HIGH'; end if;
  return null;
end $$;

-- ------------------------------------------------------------ reports + moderation
create or replace function public.report_player(p_callsign text, p_reason text, p_note text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); r text := upper(coalesce(p_reason, ''));
begin
  if them = uid then raise exception 'YOU CANNOT REPORT YOURSELF'; end if;
  if r not in ('NAME', 'CHEATING', 'MEAN', 'SPAM', 'OTHER') then raise exception 'PICK A REASON'; end if;
  if (select count(*) from public.reports where reporter = uid and created_at > now() - interval '1 day') >= 10 then raise exception 'TOO MANY REPORTS TODAY'; end if;
  if exists (select 1 from public.reports where reporter = uid and target = them and status = 'open') then return 'ALREADY REPORTED. A MODERATOR WILL LOOK'; end if;
  insert into public.reports (reporter, target, reason, note) values (uid, them, r, left(coalesce(p_note, ''), 140));
  return 'THANKS. A MODERATOR WILL LOOK';
end $$;

create or replace function public.mod_queue() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  if not sc_private.is_admin(uid) then raise exception 'MODERATORS ONLY'; end if;
  return jsonb_build_object(
    'players', (select coalesce(jsonb_agg(x order by x.last desc), '[]'::jsonb) from (
      select p.id, p.callsign, p.level, max(r.created_at) as last, count(*) as n,
             jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note, 'by', (select callsign from public.profiles q where q.id = r.reporter), 'at', r.created_at) order by r.created_at desc) as reports,
             coalesce(m.flagged, false) as flagged, m.flag_reason, m.banned_until, m.ban_reason,
             (select coalesce(sc_private.num(s.data -> 'coins'), 0) from public.saves s where s.user_id = p.id) as coins,
             (select count(*) from public.saves s, jsonb_object_keys(coalesce(s.data -> 'inv', '{}'::jsonb)) where s.user_id = p.id) as items
      from public.reports r join public.profiles p on p.id = r.target left join public.moderation m on m.user_id = p.id
      where r.status = 'open' group by p.id, m.flagged, m.flag_reason, m.banned_until, m.ban_reason limit 60) x),
    'banned', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'callsign', p.callsign, 'until', m.banned_until, 'reason', m.ban_reason)), '[]'::jsonb)
               from public.moderation m join public.profiles p on p.id = m.user_id where m.banned_until > now()));
end $$;

-- actions: ban (p_days; 0 = for good), unban, clear (flag), flag, rename (makes them pick a new callsign), dismiss (close reports)
create or replace function public.mod_action(p_target uuid, p_action text, p_days int default 0, p_reason text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); a text := lower(coalesce(p_action, ''));
begin
  if not sc_private.is_admin(uid) then raise exception 'MODERATORS ONLY'; end if;
  if p_target = uid and a = 'ban' then raise exception 'YOU CANNOT BAN YOURSELF'; end if;
  insert into public.moderation (user_id) values (p_target) on conflict (user_id) do nothing;
  if a = 'ban' then
    update public.moderation set banned_until = case when coalesce(p_days, 0) <= 0 then now() + interval '100 years' else now() + make_interval(days => p_days) end,
      ban_reason = left(coalesce(p_reason, ''), 80) where user_id = p_target;
    update public.duel_queue set seen_at = now() - interval '1 hour' where user_id = p_target;
    delete from public.arena_presence where user_id = p_target;
    -- open market listings go back to their mailbox
    insert into public.deliveries (user_id, items, reason) select seller, jsonb_build_object(item_id, item), 'market listing returned' from public.market where seller = p_target and status = 'open';
    update public.market set status = 'cancelled', closed_at = now() where seller = p_target and status = 'open';
  elsif a = 'unban' then update public.moderation set banned_until = null, ban_reason = null where user_id = p_target;
  elsif a = 'clear' then update public.moderation set flagged = false, flag_reason = null where user_id = p_target;
  elsif a = 'flag' then update public.moderation set flagged = true, flag_reason = coalesce(nullif(p_reason, ''), 'FLAGGED BY A MODERATOR'), flagged_at = now() where user_id = p_target;
  elsif a = 'rename' then update public.profiles set callsign = null where id = p_target;
  elsif a <> 'dismiss' then raise exception 'UNKNOWN ACTION';
  end if;
  update public.reports set status = 'done', handled_by = uid, handled_at = now() where target = p_target and status = 'open';
  insert into public.mod_log (admin, target, action, detail) values (uid, p_target, a, coalesce(p_days, 0) || ' ' || coalesce(p_reason, ''));
  return 'DONE';
end $$;

-- daily rewards: see 'daily rewards v2' below

-- ------------------------------------------------------------ ranked seasons (one per month)
-- When a season ends, everyone with trophies gets a reward by rank, and trophies drop by half.
create or replace function sc_private.season() returns public.season_state language plpgsql volatile set search_path = '' as $$
declare s public.season_state; a record; pl int := 0; ri int; coins int; cr jsonb;
begin
  select * into s from public.season_state where id = 1;
  if not found then
    -- the first season runs to the end of this month, or next month if this one is nearly over
    insert into public.season_state (id, season, ends_at) values (1, 1,
      case when date_trunc('month', now()) + interval '1 month' - now() < interval '14 days' then date_trunc('month', now()) + interval '2 months' else date_trunc('month', now()) + interval '1 month' end)
      on conflict (id) do nothing;
    select * into s from public.season_state where id = 1;
  end if;
  if s.ends_at > now() then return s; end if;
  select * into s from public.season_state where id = 1 for update;
  if s.ends_at > now() then return s; end if;   -- someone else rolled it while we waited
  for a in select st.user_id, st.trophies from public.arena_stats st join public.profiles p on p.id = st.user_id
           where st.trophies > 0 and not sc_private.flagged(st.user_id) order by st.trophies desc, st.updated_at loop
    pl := pl + 1; ri := sc_private.rank_idx(a.trophies);
    insert into public.season_results (season, user_id, trophies, rank, place) values (s.season, a.user_id, a.trophies, sc_private.rank_of(a.trophies), pl) on conflict do nothing;
    coins := least(30000, 300 + a.trophies * 3);
    cr := case when ri <= 0 then '[]'::jsonb when ri >= 7 then jsonb_build_array(6, 6) when ri = 6 then jsonb_build_array(5, 5) else jsonb_build_array(least(6, ri)) end;
    if pl <= 3 then cr := cr || jsonb_build_array(6); end if;
    insert into public.deliveries (user_id, coins, crates, reason) values (a.user_id, coins, cr, 'season ' || s.season || ' reward: #' || pl || ' ' || sc_private.rank_of(a.trophies));
  end loop;
  update public.arena_stats set trophies = trophies / 2, updated_at = now() where trophies > 0;
  update public.season_state set season = s.season + 1, ends_at = date_trunc('month', now()) + interval '1 month' where id = 1 returning * into s;
  return s;
end $$;

-- ------------------------------------------------------------ the market: sell to anyone for coins
create or replace function sc_private.expire_market() returns void language plpgsql volatile set search_path = '' as $$
declare m record;
begin
  for m in select * from public.market where status = 'open' and created_at < now() - interval '7 days' for update skip locked loop
    update public.market set status = 'expired', closed_at = now() where id = m.id;
    insert into public.deliveries (user_id, items, reason) values (m.seller, jsonb_build_object(m.item_id, m.item), 'market listing expired');
  end loop;
end $$;
create or replace function public.market_list(p_item text, p_price bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); s record; r record; mid bigint;
begin
  perform sc_private.need_clean(uid);
  if (select callsign from public.profiles where id = uid) is null then raise exception 'SET A CALLSIGN FIRST'; end if;
  if coalesce(p_price, 0) < 1 or p_price > 1000000000 then raise exception 'PRICE MUST BE 1 TO 1,000,000,000 COINS'; end if;
  if (select count(*) from public.market where seller = uid and status = 'open') >= 10 then raise exception 'UP TO 10 THINGS FOR SALE AT ONCE'; end if;
  select * into s from public.saves where user_id = uid for update;
  select * into r from sc_private.take_items(s.data, array[p_item], 0);
  update public.saves set data = r.d2, version = s.version + 1, econ_ver = s.version + 1, updated_at = now() where user_id = uid;
  insert into public.market (seller, item_id, item, price) values (uid, p_item, r.taken -> p_item, p_price) returning id into mid;
  return jsonb_build_object('listing', mid, 'data', r.d2, 'version', s.version + 1);
end $$;
create or replace function public.market_cancel(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); m record;
begin
  select * into m from public.market where id = p_id and seller = uid for update;
  if not found or m.status <> 'open' then raise exception 'THAT LISTING IS NOT OPEN'; end if;
  update public.market set status = 'cancelled', closed_at = now() where id = p_id;
  insert into public.deliveries (user_id, items, reason) values (uid, jsonb_build_object(m.item_id, m.item), 'market listing cancelled');
  return 'BACK IN YOUR MAILBOX';
end $$;
-- 5% of every sale disappears as a market fee, so coins leave the game too
create or replace function public.market_buy(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); m record; s record; r record; d jsonb;
begin
  perform sc_private.need_clean(uid);
  select * into m from public.market where id = p_id for update;
  if not found or m.status <> 'open' then raise exception 'SOMEONE ELSE GOT IT FIRST'; end if;
  if m.seller = uid then raise exception 'THAT IS YOUR OWN LISTING'; end if;
  if sc_private.flagged(m.seller) then raise exception 'THAT LISTING IS ON HOLD'; end if;
  select * into s from public.saves where user_id = uid for update;
  select * into r from sc_private.take_items(s.data, '{}', m.price);
  d := sc_private.grant_items(r.d2, jsonb_build_object(m.item_id, m.item), 0);
  update public.saves set data = d, version = s.version + 1, econ_ver = s.version + 1, updated_at = now() where user_id = uid;
  update public.market set status = 'sold', buyer = uid, closed_at = now() where id = p_id;
  insert into public.deliveries (user_id, coins, reason, from_user) values (m.seller, m.price - m.price / 20, 'market sale', uid);
  return jsonb_build_object('data', d, 'version', s.version + 1, 'item', m.item_id);
end $$;
create or replace function public.market_browse(p_mine boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  perform sc_private.expire_market();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'item', m.item_id, 'l', m.item -> 'l', 'g', coalesce(m.item -> 'g', '0'::jsonb), 'price', m.price,
            'seller', p.callsign, 'mine', m.seller = uid, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
          from (select * from public.market where status = 'open' and (not coalesce(p_mine, false) or seller = uid) and not sc_private.flagged(seller)
                order by created_at desc limit 300) m join public.profiles p on p.id = m.seller);
end $$;

-- ------------------------------------------------------------ friend challenges + a quick pulse
create or replace function public.challenge_send(p_callsign text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); cd text; cid bigint;
begin
  if them = uid then raise exception 'THAT IS YOU'; end if;
  if not exists (select 1 from public.friendships where a = least(uid, them) and b = greatest(uid, them) and status = 'accepted') then raise exception 'YOU CAN ONLY CHALLENGE FRIENDS'; end if;
  if (select last_seen from public.profiles where id = them) < now() - interval '90 seconds' then raise exception '% IS NOT ONLINE', sc_private.clean_name(p_callsign); end if;
  update public.challenges set status = 'expired' where from_user = uid and status = 'open';
  cd := 'C' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
  insert into public.challenges (from_user, to_user, code) values (uid, them, cd) returning id into cid;
  return jsonb_build_object('id', cid, 'code', cd);
end $$;
-- co-op: ask a friend to land on a planet with you
create or replace function public.coop_invite(p_callsign text, p_planet int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); them uuid := sc_private.find_callsign(p_callsign); cd text; cid bigint;
begin
  if them = uid then raise exception 'THAT IS YOU'; end if;
  if not exists (select 1 from public.friendships where a = least(uid, them) and b = greatest(uid, them) and status = 'accepted') then raise exception 'YOU CAN ONLY INVITE FRIENDS'; end if;
  if (select last_seen from public.profiles where id = them) < now() - interval '90 seconds' then raise exception '% IS NOT ONLINE', sc_private.clean_name(p_callsign); end if;
  if coalesce(p_planet, 0) < 1 or p_planet > 60 then raise exception 'PICK A PLANET'; end if;
  update public.challenges set status = 'expired' where from_user = uid and status = 'open';
  cd := 'P' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 9));
  insert into public.challenges (from_user, to_user, code, kind, planet) values (uid, them, cd, 'coop', p_planet) returning id into cid;
  return jsonb_build_object('id', cid, 'code', cd);
end $$;
create or replace function public.challenge_respond(p_id bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); c record;
begin
  select * into c from public.challenges where id = p_id and to_user = uid for update;
  if not found or c.status <> 'open' or c.created_at < now() - interval '90 seconds' then raise exception 'THAT CHALLENGE ENDED'; end if;
  update public.challenges set status = case when p_accept then 'accepted' else 'declined' end, answered_at = now() where id = p_id;
  return jsonb_build_object('code', case when p_accept then c.code else null end, 'kind', c.kind, 'planet', c.planet, 'from', (select callsign from public.profiles where id = c.from_user));
end $$;
-- polled every few seconds while signed in: who is online, challenges, friends you can watch
create or replace function public.pulse() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  update public.profiles set last_seen = now() where id = uid;
  return jsonb_build_object(
    'online', (select coalesce(jsonb_agg(p.callsign), '[]'::jsonb) from public.friendships f join public.profiles p on p.id = case when f.a = uid then f.b else f.a end
               where uid in (f.a, f.b) and f.status = 'accepted' and p.last_seen > now() - interval '90 seconds' and p.callsign is not null),
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'from', p.callsign, 'kind', c.kind, 'planet', c.planet)), '[]'::jsonb) from public.challenges c join public.profiles p on p.id = c.from_user
                   where c.to_user = uid and c.status = 'open' and c.created_at > now() - interval '60 seconds'),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'to', p.callsign, 'status', c.status, 'kind', c.kind)), '[]'::jsonb) from public.challenges c join public.profiles p on p.id = c.to_user
                where c.from_user = uid and c.status in ('accepted', 'declined') and c.answered_at > now() - interval '30 seconds'),
    'watch', (select coalesce(jsonb_agg(jsonb_build_object('match', d.id, 'a', pa.callsign, 'b', coalesce(pb.callsign, 'AI'), 'ai', d.b is null, 'ranked', d.ranked)), '[]'::jsonb)
              from public.duels d join public.profiles pa on pa.id = d.a left join public.profiles pb on pb.id = d.b
              where not d.done and d.created_at > now() - interval '4 minutes' and uid not in (d.a, coalesce(d.b, d.a))
                and exists (select 1 from public.friendships f where f.status = 'accepted' and uid in (f.a, f.b) and (case when f.a = uid then f.b else f.a end) in (d.a, coalesce(d.b, d.a)))),
    'mail', (select count(*) from public.deliveries where user_id = uid and claimed_at is null),
    'admin', sc_private.is_admin(uid),
    'flagged', sc_private.flagged(uid));
end $$;

-- ============================================================ the store: Stardust, the season pass, the supporter plate
-- Real money only ever comes in through the Stripe webhook (an Edge Function using the service role key),
-- which calls public.grant_purchase. Everything else spends Stardust the server keeps.
-- Premium and reward cosmetics (ids ending in |6000-|6999) can never be traded, listed or sold.
create table if not exists public.premium (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  stardust    bigint not null default 0 check (stardust >= 0),
  supporter   boolean not null default false,
  owned       text[] not null default '{}',
  passes      text[] not null default '{}',
  claims      jsonb not null default '{}'::jsonb,       -- season -> {"f": [tiers], "p": [tiers], "xp": n}
  spent_cents bigint not null default 0,
  updated_at  timestamptz not null default now()
);
create table if not exists public.purchases (
  id         text primary key,                          -- the Stripe checkout session id
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product    text not null,
  cents      int not null default 0,
  refunded   boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.bugs (
  id bigint generated always as identity primary key, user_id uuid, device text, note text not null, info jsonb,
  status text not null default 'new' check (status in ('new', 'seen', 'fixed', 'junk')), created_at timestamptz not null default now()
);
create table if not exists public.crash_log (
  sig text primary key, message text not null, stack text, scene text, ver text,
  n bigint not null default 1, devices text[] not null default '{}', first_at timestamptz not null default now(), last_at timestamptz not null default now()
);
create table if not exists public.events (
  id bigint generated always as identity primary key, device text not null, user_id uuid, kind text not null, data jsonb, at timestamptz not null default now()
);
create index if not exists events_at on public.events (at);
create index if not exists events_dev on public.events (device, at);
create index if not exists events_kind on public.events (kind, at);
create table if not exists public.devices (
  device text primary key, user_id uuid, first_at timestamptz not null default now(), last_at timestamptz not null default now(), sessions int not null default 0
);
do $$ declare t text; begin
  foreach t in array array['premium', 'purchases', 'bugs', 'crash_log', 'events', 'devices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- catalog (the game keeps the same lists to draw them)
create or replace function sc_private.is_premium_id(k text) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(k ~ '^[ckbwgp]\|[a-z_]+\|6[0-9]{3}$', false)
$$;
create or replace function sc_private.season_pass() returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', 'frostfall', 'name', 'FROSTFALL', 'starts', '2026-10-26T00:00:00Z', 'ends', '2027-01-01T05:00:00Z', 'tiers', 30, 'xp', 1000, 'sd', 500,
    'bonus_xp', 2000, 'bonus_sd', 25, 'bonus_max', 40,
    'free', '[{"c":600},{"cr":0},{"sd":10},{"c":900},{"it":"c|trail|6020"},{"cr":1},{"c":1200},{"sd":15},{"cr":1},{"it":"c|eyewear|6021"},
              {"c":1600},{"cr":1},{"sd":15},{"c":2000},{"it":"c|headgear|6022"},{"cr":2},{"c":2400},{"sd":20},{"cr":2},{"it":"k|weapon|6023"},
              {"c":3000},{"cr":2},{"sd":25},{"c":3500},{"cr":3},{"c":4000},{"sd":25},{"cr":3},{"c":5000},{"it":"c|back|6024"}]'::jsonb,
    'prem', '[{"it":"c|headgear|6000"},{"sd":50},{"cr":2},{"it":"k|armor|6001"},{"it":"w|blaster|6012"},{"sd":50},{"cr":3},{"it":"c|back|6002"},{"c":6000},{"it":"g|freeze|6013"},
              {"sd":75},{"it":"c|trail|6003"},{"cr":3},{"it":"c|eyewear|6004"},{"it":"w|rifle|6014"},{"sd":75},{"it":"c|headgear|6006"},{"cr":4},{"it":"k|weapon|6005"},{"it":"p|fox|6015"},
              {"sd":100},{"it":"k|ship|6007"},{"cr":4},{"it":"c|back|6008"},{"it":"w|throwing|6016"},{"sd":100},{"it":"b|backdrop|6009"},{"it":"c|killfx|6010"},{"it":"c|headgear|6011"},{"it":"w|launcher|6017"}]'::jsonb)
$$;
-- the armory: top weapons for Stardust, always for sale
create or replace function sc_private.armory() returns jsonb language sql immutable set search_path = '' as $$
  select '[["w|rifle|6300",1400],["w|shotgun|6301",1400],["w|drone|6304",1600],["w|blade|6306",1400],["w|sniper|6302",2400],["w|railgun|6303",2400],["w|beam|6305",2400],["w|launcher|6307",2400]]'::jsonb
$$;
-- store gear arrives at a good grade; cosmetics just at level 1
create or replace function sc_private.prem_item(k text) returns jsonb language sql immutable set search_path = '' as $$
  select case when k ~ '^[wgp]\|' then jsonb_build_object('l', 1, 'g', 4) else jsonb_build_object('l', 1) end
$$;
-- the shop sells these for Stardust; 6 of them are featured each day (UTC)
create or replace function sc_private.shop_items() returns jsonb language sql immutable set search_path = '' as $$
  select '[["c|headgear|6200",600],["c|headgear|6201",300],["c|headgear|6202",1000],["c|eyewear|6203",300],["c|eyewear|6204",600],["c|eyewear|6205",1000],
           ["c|back|6206",600],["c|back|6207",1000],["c|back|6208",1500],["c|trail|6209",300],["c|trail|6210",600],["c|trail|6211",1000],
           ["c|killfx|6212",600],["c|killfx|6213",1000],["c|killfx|6214",1500],["k|weapon|6215",600],["k|weapon|6216",1000],["k|armor|6217",600],
           ["k|armor|6218",1000],["k|ship|6219",600],["k|ship|6220",1000],["b|backdrop|6221",600],["b|backdrop|6222",1000],["b|backdrop|6223",1500]]'::jsonb
$$;
create or replace function sc_private.shop_today(d date default (now() at time zone 'utc')::date) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.e order by x.h), '[]'::jsonb) from (
    select e, md5(d::text || (e ->> 0)) as h from jsonb_array_elements(sc_private.shop_items()) e order by md5(d::text || (e ->> 0)) limit 6) x
$$;
create or replace function sc_private.coin_packs() returns jsonb language sql immutable set search_path = '' as $$
  select '[["c1",100,2500],["c2",450,12500],["c3",900,27500]]'::jsonb
$$;
-- what Stripe can sell: product -> [cents, stardust]
create or replace function sc_private.products() returns jsonb language sql immutable set search_path = '' as $$
  select '{"sd_180":[199,180],"sd_500":[499,500],"sd_1100":[999,1100],"sd_2400":[1999,2400],"pass_frostfall":[499,0],"supporter":[499,0]}'::jsonb
$$;
create or replace function sc_private.coin_k(uid uuid) returns numeric language sql stable set search_path = '' as $$
  select greatest(1, least(8, coalesce((select planet from public.profiles where id = uid), 1) / 2.5))
$$;
create or replace function sc_private.prem(uid uuid) returns public.premium language plpgsql volatile set search_path = '' as $$
declare p public.premium;
begin
  insert into public.premium (user_id) values (uid) on conflict (user_id) do nothing;
  select * into p from public.premium where user_id = uid for update;
  return p;
end $$;
-- premium items in a save that the account never got are removed (a hand-edited save can't make them)
create or replace function sc_private.strip_premium(uid uuid, d jsonb) returns jsonb language plpgsql stable set search_path = '' as $$
declare k text; own text[] := coalesce((select owned from public.premium where user_id = uid), '{}'); s text; v text;
begin
  for k in select x from jsonb_object_keys(coalesce(d -> 'inv', '{}'::jsonb)) x loop
    if sc_private.is_premium_id(k) and not (k = any(own)) then d := d #- array['inv', k]; d := d #- array['fresh', k]; end if;
  end loop;
  if jsonb_typeof(d -> 'eq') = 'object' then
    for s, v in select * from jsonb_each_text(d -> 'eq') loop
      if v is not null and sc_private.is_premium_id(v) and not (v = any(own)) then d := d #- array['eq', s]; end if;
    end loop;
  end if;
  return d;
end $$;

-- ---------- reading your store
-- profile card backgrounds: [id, stardust price]. Owned ones live in premium.owned as 'card:<id>'
create or replace function sc_private.cards() returns jsonb language sql immutable set search_path = '' as $$
  select '[["nebula",250],["sunset",250],["synth",400],["aurora",400],["frost",500],["galaxy",500],["hole",750],["gate",750]]'::jsonb
$$;

create or replace function public.premium_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); p public.premium; sp jsonb := sc_private.season_pass();
begin
  p := sc_private.prem(uid);
  return jsonb_build_object('sd', p.stardust, 'supporter', p.supporter, 'owned', to_jsonb(p.owned), 'passes', to_jsonb(p.passes), 'claims', p.claims,
    'season', sp, 'shop', sc_private.shop_today(), 'shop_ends', ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc',
    'packs', sc_private.coin_packs(), 'armory', sc_private.armory(), 'cards', sc_private.cards(), 'k', sc_private.coin_k(uid), 'products', sc_private.products(), 'now', now());
end $$;

-- ---------- spending Stardust
create or replace function public.premium_spend(p_kind text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); p public.premium; price int; e jsonb; coins bigint; sp jsonb := sc_private.season_pass();
begin
  p := sc_private.prem(uid);
  if p_kind = 'item' then
    select (x ->> 1)::int into price from jsonb_array_elements(sc_private.shop_today()) x where x ->> 0 = p_id;
    if price is null then raise exception 'THAT IS NOT IN THE SHOP TODAY'; end if;
    if p_id = any(p.owned) then raise exception 'YOU ALREADY OWN IT'; end if;
    if p.stardust < price then raise exception 'NOT ENOUGH STARDUST'; end if;
    update public.premium set stardust = stardust - price, owned = array_append(owned, p_id), updated_at = now() where user_id = uid;
    insert into public.deliveries (user_id, items, reason) values (uid, jsonb_build_object(p_id, sc_private.prem_item(p_id)), 'store: bought with stardust');
  elsif p_kind = 'weapon' then
    select (x ->> 1)::int into price from jsonb_array_elements(sc_private.armory()) x where x ->> 0 = p_id;
    if price is null then raise exception 'THE ARMORY DOES NOT SELL THAT'; end if;
    if p_id = any(p.owned) then raise exception 'YOU ALREADY OWN IT'; end if;
    if p.stardust < price then raise exception 'NOT ENOUGH STARDUST'; end if;
    update public.premium set stardust = stardust - price, owned = array_append(owned, p_id), updated_at = now() where user_id = uid;
    insert into public.deliveries (user_id, items, reason) values (uid, jsonb_build_object(p_id, sc_private.prem_item(p_id)), 'armory: bought with stardust');
  elsif p_kind = 'coins' then
    select x into e from jsonb_array_elements(sc_private.coin_packs()) x where x ->> 0 = p_id;
    if e is null then raise exception 'NO SUCH COIN PACK'; end if;
    price := (e ->> 1)::int; if p.stardust < price then raise exception 'NOT ENOUGH STARDUST'; end if;
    coins := (round((e ->> 2)::numeric * sc_private.coin_k(uid) / 50) * 50)::bigint;
    update public.premium set stardust = stardust - price, updated_at = now() where user_id = uid;
    insert into public.deliveries (user_id, coins, reason) values (uid, coins, 'store: coin pack');
  elsif p_kind = 'pass' then
    if p_id <> sp ->> 'id' then raise exception 'THAT PASS IS NOT ON SALE'; end if;
    if now() > (sp ->> 'ends')::timestamptz then raise exception 'THIS SEASON IS OVER'; end if;
    if p_id = any(p.passes) then raise exception 'YOU ALREADY HAVE THE PASS'; end if;
    price := (sp ->> 'sd')::int; if p.stardust < price then raise exception 'NOT ENOUGH STARDUST'; end if;
    update public.premium set stardust = stardust - price, passes = array_append(passes, p_id), updated_at = now() where user_id = uid;
  elsif p_kind = 'card' then
    select (x ->> 1)::int into price from jsonb_array_elements(sc_private.cards()) x where x ->> 0 = p_id;
    if price is null then raise exception 'NO SUCH BACKGROUND'; end if;
    if ('card:' || p_id) = any(p.owned) then raise exception 'YOU ALREADY OWN IT'; end if;
    if p.stardust < price then raise exception 'NOT ENOUGH STARDUST'; end if;
    update public.premium set stardust = stardust - price, owned = array_append(owned, 'card:' || p_id), updated_at = now() where user_id = uid;
  elsif p_kind = 'supporter' then
    if p.supporter then raise exception 'YOU ARE ALREADY A SUPPORTER'; end if;
    if p.stardust < 500 then raise exception 'NOT ENOUGH STARDUST'; end if;
    update public.premium set stardust = stardust - 500, supporter = true, updated_at = now() where user_id = uid;
  else raise exception 'UNKNOWN PURCHASE';
  end if;
  return public.premium_get();
end $$;

-- ---------- the season pass
create or replace function public.pass_claim(p_tier int, p_track text, p_xp int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); p public.premium; sp jsonb := sc_private.season_pass(); sid text := sp ->> 'id'; rw jsonb; c jsonb;
        hrs numeric; tr text := case when p_track in ('p', 'b') then p_track else 'f' end; k numeric := sc_private.coin_k(uid); t int; need int;
begin
  if tr = 'b' then
    if p_tier < 1 or p_tier > (sp ->> 'bonus_max')::int then raise exception 'NO SUCH BONUS STAR'; end if;
    need := (sp ->> 'tiers')::int * (sp ->> 'xp')::int + p_tier * (sp ->> 'bonus_xp')::int;
  else
    if p_tier < 1 or p_tier > (sp ->> 'tiers')::int then raise exception 'NO SUCH TIER'; end if;
    need := p_tier * (sp ->> 'xp')::int;
  end if;
  if now() > (sp ->> 'ends')::timestamptz + interval '7 days' then raise exception 'THIS SEASON IS OVER'; end if;
  -- sanity cap on what the game reports. It used to be 1,200 XP an hour and threw an error, which blocked real players
  -- who finished the pass fast (crate openings and weekly missions pay a lot). Now it is generous and only limits, never errors.
  hrs := greatest(0, extract(epoch from now() - (sp ->> 'starts')::timestamptz) / 3600);
  p_xp := least(coalesce(p_xp, 0), (hrs * 5000 + 15000)::int);
  if p_xp < need then raise exception 'EARN MORE PASS XP FIRST'; end if;
  p := sc_private.prem(uid);
  if tr = 'p' and not (sid = any(p.passes)) then raise exception 'GET THE PASS TO CLAIM THIS'; end if;
  c := coalesce(p.claims -> sid, '{}'::jsonb);
  if coalesce(c -> tr, '[]'::jsonb) @> to_jsonb(p_tier) then raise exception 'ALREADY CLAIMED'; end if;
  c := jsonb_set(c, array[tr], coalesce(c -> tr, '[]'::jsonb) || to_jsonb(p_tier));
  c := jsonb_set(c, '{xp}', to_jsonb(greatest(coalesce(sc_private.num(c -> 'xp'), 0), p_xp)));
  rw := case when tr = 'b' then jsonb_build_object('sd', (sp ->> 'bonus_sd')::int) else sp -> (case when tr = 'p' then 'prem' else 'free' end) -> (p_tier - 1) end;
  update public.premium set claims = jsonb_set(claims, array[sid], c), updated_at = now() where user_id = uid;
  t := least(5, 1 + coalesce((select planet from public.profiles where id = uid), 1) / 4);
  if rw ? 'sd' then update public.premium set stardust = stardust + (rw ->> 'sd')::int where user_id = uid; end if;
  if rw ? 'c' then insert into public.deliveries (user_id, coins, reason) values (uid, (round((rw ->> 'c')::numeric * k / 50) * 50)::bigint, 'season pass tier ' || p_tier); end if;
  if rw ? 'cr' then insert into public.deliveries (user_id, crates, reason) values (uid, jsonb_build_array(least(6, t + (rw ->> 'cr')::int)), 'season pass tier ' || p_tier); end if;
  if rw ? 'it' then
    update public.premium set owned = array_append(owned, rw ->> 'it') where user_id = uid and not ((rw ->> 'it') = any(owned));
    insert into public.deliveries (user_id, items, reason) values (uid, jsonb_build_object(rw ->> 'it', sc_private.prem_item(rw ->> 'it')), 'season pass tier ' || p_tier);
  end if;
  return public.premium_get();
end $$;

-- ---------- real money: only the Stripe webhook (service role) may call this. Safe to call twice.
create or replace function public.grant_purchase(p_session text, p_user uuid, p_product text, p_cents int) returns text
language plpgsql security definer set search_path = '' as $$
declare pr jsonb := sc_private.products() -> p_product; n int;
begin
  if pr is null then raise exception 'UNKNOWN PRODUCT %', p_product; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'NO SUCH PLAYER'; end if;
  insert into public.purchases (id, user_id, product, cents) values (p_session, p_user, p_product, coalesce(p_cents, 0)) on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'already granted'; end if;
  perform sc_private.prem(p_user);
  update public.premium set spent_cents = spent_cents + coalesce(p_cents, 0), updated_at = now() where user_id = p_user;
  if p_product like 'sd\_%' then update public.premium set stardust = stardust + (pr ->> 1)::int where user_id = p_user;
  elsif p_product = 'supporter' then update public.premium set supporter = true where user_id = p_user;
  elsif p_product like 'pass\_%' then update public.premium set passes = array_append(passes, substr(p_product, 6)) where user_id = p_user and not (substr(p_product, 6) = any(passes));
  end if;
  insert into public.events (device, user_id, kind, data) values ('server', p_user, 'purchase', jsonb_build_object('product', p_product, 'cents', p_cents));
  return 'granted';
end $$;
-- a refund takes back what it gave (Stardust can't go below zero)
create or replace function public.refund_purchase(p_session text) returns text
language plpgsql security definer set search_path = '' as $$
declare r record; pr jsonb;
begin
  select * into r from public.purchases where id = p_session for update;
  if not found or r.refunded then return 'nothing to refund'; end if;
  pr := sc_private.products() -> r.product;
  update public.purchases set refunded = true where id = p_session;
  if r.product like 'sd\_%' then update public.premium set stardust = greatest(0, stardust - (pr ->> 1)::int) where user_id = r.user_id;
  elsif r.product = 'supporter' then update public.premium set supporter = false where user_id = r.user_id;
  elsif r.product like 'pass\_%' then update public.premium set passes = array_remove(passes, substr(r.product, 6)) where user_id = r.user_id;
  end if;
  return 'refunded';
end $$;

-- ============================================================ daily rewards v2: every 7th day is a big one
drop function if exists public.daily_status(int);
drop function if exists public.daily_claim(int);
drop function if exists sc_private.daily_reward(int, int);
-- day:   1      2         3          4         5          6             7
--      coins  crate   coins+dust  crate  coins+dust  2 crates   BIG: coins, 3 top crates, 60 dust, and every 4th week an exclusive
create or replace function sc_private.daily_reward(day int, planet int, streak int, out coins int, out crates jsonb, out dust int, out item text) language plpgsql immutable set search_path = '' as $$
declare k numeric := greatest(1, least(8, planet / 2.5)); t int := least(5, 1 + planet / 4); wk int := (greatest(streak, 1) - 1) / 7 + 1;
begin
  coins := (round((array[600, 400, 1000, 600, 1500, 1000, 4000])[day] * k / 50) * 50)::int;
  crates := case day when 2 then jsonb_build_array(t) when 4 then jsonb_build_array(least(6, t + 1)) when 6 then jsonb_build_array(least(6, t + 1), t)
                     when 7 then jsonb_build_array(least(6, t + 1), least(6, t + 2), least(6, t + 3)) else '[]'::jsonb end;
  dust := case day when 3 then 10 when 5 then 15 when 7 then 60 else 0 end;
  item := case when day = 7 and wk % 4 = 0 then (array['c|back|6100', 'c|trail|6101', 'c|headgear|6102', 'c|killfx|6103'])[((wk / 4 - 1) % 4) + 1] else null end;
end $$;
create or replace function public.daily_status(p_tz int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); d record; today date := ((now() at time zone 'utc') - make_interval(mins => greatest(-840, least(840, coalesce(p_tz, 0)))))::date;
        st int; can boolean; pl int := coalesce((select planet from public.profiles where id = uid), 1); days jsonb := '[]'::jsonb; r record; base int;
begin
  select * into d from public.daily where user_id = uid;
  st := case when d.last_day is null then 0 when d.last_day >= today - 1 then d.streak else 0 end;
  can := d.last_day is null or (d.last_day < today and d.last_at < now() - interval '16 hours');
  base := ((case when can then st else greatest(st - 1, 0) end) / 7) * 7;   -- the streak count at the start of this week
  for i in 1..7 loop select * into r from sc_private.daily_reward(i, pl, base + i); days := days || jsonb_build_object('coins', r.coins, 'crates', r.crates, 'dust', r.dust, 'item', r.item); end loop;
  return jsonb_build_object('streak', st, 'can', can, 'next', case when can then (st % 7) + 1 else null end, 'today_done', not can and d.last_day = today, 'days', days,
    'week', base / 7 + 1);
end $$;
create or replace function public.daily_claim(p_tz int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); d record; today date := ((now() at time zone 'utc') - make_interval(mins => greatest(-840, least(840, coalesce(p_tz, 0)))))::date;
        st int; day int; r record; pl int := coalesce((select planet from public.profiles where id = uid), 1);
begin
  insert into public.daily (user_id) values (uid) on conflict (user_id) do nothing;
  select * into d from public.daily where user_id = uid for update;
  if d.last_day is not null and (d.last_day >= today or d.last_at > now() - interval '16 hours') then raise exception 'ALREADY CLAIMED TODAY. COME BACK TOMORROW'; end if;
  st := case when d.last_day is not null and d.last_day = today - 1 then d.streak + 1 else 1 end;
  day := ((st - 1) % 7) + 1;
  select * into r from sc_private.daily_reward(day, pl, st);
  update public.daily set last_day = today, last_at = now(), streak = st where user_id = uid;
  insert into public.deliveries (user_id, coins, crates, items, reason) values (uid, r.coins, r.crates,
    case when r.item is null then '{}'::jsonb else jsonb_build_object(r.item, jsonb_build_object('l', 1)) end, 'daily reward day ' || day);
  if r.dust > 0 or r.item is not null then
    perform sc_private.prem(uid);
    update public.premium set stardust = stardust + r.dust, owned = case when r.item is null or r.item = any(owned) then owned else array_append(owned, r.item) end where user_id = uid;
  end if;
  return jsonb_build_object('day', day, 'streak', st, 'coins', r.coins, 'crates', r.crates, 'dust', r.dust, 'item', r.item);
end $$;

-- ============================================================ bug reports, crash logs, analytics
-- These three also work without an account (signed-out players are most players), keyed by a random device id.
create or replace function sc_private.dev_ok(p text) returns boolean language sql immutable set search_path = '' as $$ select coalesce(p ~ '^[a-z0-9]{8,40}$', false) $$;
create or replace function public.track(p_device text, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e jsonb; n int := 0; today int;
begin
  if not sc_private.dev_ok(p_device) or jsonb_typeof(p_events) <> 'array' then return 0; end if;
  select count(*) into today from public.events where device = p_device and at > now() - interval '1 day';
  if today > 2000 then return 0; end if;
  insert into public.devices (device, user_id) values (p_device, uid) on conflict (device) do update set last_at = now(), user_id = coalesce(excluded.user_id, public.devices.user_id);
  for e in select * from jsonb_array_elements(p_events) limit 40 loop
    if jsonb_typeof(e -> 'k') <> 'string' or (e ->> 'k') !~ '^[a-z_]{2,20}$' or octet_length(coalesce(e -> 'd', '{}'::jsonb)::text) > 1500 then continue; end if;
    insert into public.events (device, user_id, kind, data) values (p_device, uid, e ->> 'k', coalesce(e -> 'd', '{}'::jsonb));
    if e ->> 'k' = 'session' then update public.devices set sessions = sessions + 1 where device = p_device; end if;
    n := n + 1;
  end loop;
  return n;
end $$;
create or replace function public.log_crash(p_device text, p_msg text, p_stack text, p_scene text, p_ver text) returns void
language plpgsql security definer set search_path = '' as $$
declare sg text := md5(left(coalesce(p_msg, ''), 200) || split_part(coalesce(p_stack, ''), E'\n', 2));
begin
  if not sc_private.dev_ok(p_device) or coalesce(p_msg, '') = '' then return; end if;
  insert into public.crash_log (sig, message, stack, scene, ver, devices) values (sg, left(p_msg, 300), left(p_stack, 2000), left(p_scene, 20), left(p_ver, 20), array[p_device])
  on conflict (sig) do update set n = public.crash_log.n + 1, last_at = now(), ver = excluded.ver, scene = excluded.scene,
    devices = case when p_device = any(public.crash_log.devices) or cardinality(public.crash_log.devices) >= 200 then public.crash_log.devices else array_append(public.crash_log.devices, p_device) end;
end $$;
create or replace function public.bug_report(p_device text, p_note text, p_info jsonb) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not sc_private.dev_ok(p_device) then raise exception 'BAD DEVICE'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'TELL US WHAT HAPPENED'; end if;
  if (select count(*) from public.bugs where device = p_device and created_at > now() - interval '1 day') >= 8 then raise exception 'THANKS! THAT IS ENOUGH REPORTS FOR TODAY'; end if;
  insert into public.bugs (user_id, device, note, info) values (auth.uid(), p_device, left(p_note, 600), case when octet_length(coalesce(p_info, '{}'::jsonb)::text) > 4000 then '{}'::jsonb else coalesce(p_info, '{}'::jsonb) end);
  return 'THANKS! YOUR BUG REPORT WAS SENT';
end $$;
-- moderators: players coming back, money, bugs and crashes
create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me();
begin
  if not sc_private.is_admin(uid) then raise exception 'MODERATORS ONLY'; end if;
  return jsonb_build_object(
    'days', (select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
       select g.day::date as day,
         (select count(distinct e.device) from public.events e where e.at >= g.day and e.at < g.day + interval '1 day') as active,
         (select count(*) from public.devices d where d.first_at >= g.day and d.first_at < g.day + interval '1 day') as new
       from generate_series((now() at time zone 'utc')::date - 13, (now() at time zone 'utc')::date, interval '1 day') g(day)) x),
    'ret', (select jsonb_build_object(
       'd1', round(100.0 * count(*) filter (where exists (select 1 from public.events e where e.device = d.device and e.at >= d.first_at + interval '1 day' and e.at < d.first_at + interval '2 days')) / greatest(count(*), 1)),
       'd7', round(100.0 * count(*) filter (where exists (select 1 from public.events e where e.device = d.device and e.at >= d.first_at + interval '7 days' and e.at < d.first_at + interval '8 days')) / greatest(count(*), 1)),
       'cohort', count(*))
       from public.devices d where d.first_at > now() - interval '30 days' and d.first_at < now() - interval '8 days'),
    'ret1', (select round(100.0 * count(*) filter (where exists (select 1 from public.events e where e.device = d.device and e.at >= d.first_at + interval '1 day' and e.at < d.first_at + interval '2 days')) / greatest(count(*), 1))
       from public.devices d where d.first_at > now() - interval '15 days' and d.first_at < now() - interval '2 days'),
    'mins', (select round(avg(m)) from (select max((e.data ->> 'm')::numeric) as m from public.events e where e.kind = 'beat' and e.at > now() - interval '7 days' group by e.device, e.data ->> 's') q),
    'funnel', (select jsonb_build_object(
       'devices', (select count(*) from public.devices where first_at > now() - interval '30 days'),
       'crate', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'crate' and at > now() - interval '30 days'),
       'equip', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'equip' and at > now() - interval '30 days'),
       'land', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'land' and at > now() - interval '30 days'),
       'boss', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'boss' and at > now() - interval '30 days'),
       'signup', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'signup' and at > now() - interval '30 days'))),
    'money', (select jsonb_build_object('cents30', coalesce(sum(cents) filter (where created_at > now() - interval '30 days' and not refunded), 0), 'cents', coalesce(sum(cents) filter (where not refunded), 0),
       'buyers', count(distinct user_id), 'by', (select coalesce(jsonb_object_agg(product, n), '{}'::jsonb) from (select product, count(*) n from public.purchases where not refunded group by product) z)) from public.purchases),
    'bugs', (select coalesce(jsonb_agg(b order by b.id desc), '[]'::jsonb) from (select id, note, info, status, created_at, (select callsign from public.profiles where id = user_id) as who from public.bugs where status in ('new', 'seen') order by id desc limit 40) b),
    'crashes', (select coalesce(jsonb_agg(c order by c.n desc), '[]'::jsonb) from (select sig, message, scene, ver, n, cardinality(devices) as players, last_at from public.crash_log where last_at > now() - interval '14 days' order by n desc limit 20) c));
end $$;
create or replace function public.admin_bug(p_id bigint, p_status text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not sc_private.is_admin(sc_private.me()) then raise exception 'MODERATORS ONLY'; end if;
  update public.bugs set status = p_status where id = p_id;
  return 'OK';
end $$;

-- ------------------------------------------------- the data board (board.html): everything about how people play
create or replace function public.admin_board(p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := sc_private.me(); d int := least(greatest(coalesce(p_days, 30), 7), 90); tz text := 'America/Detroit';
        since timestamptz; today timestamptz; r jsonb;
begin
  if not sc_private.is_admin(uid) then raise exception 'MODERATORS ONLY'; end if;
  today := date_trunc('day', now() at time zone tz) at time zone tz;
  since := today - (d - 1) * interval '1 day';
  -- one row per play session: its length is the last heartbeat's minute count
  create temp table if not exists _bs (device text, s text, mins numeric, last_at timestamptz) on commit drop;
  truncate pg_temp._bs;
  insert into pg_temp._bs select e.device, e.data ->> 's', max(sc_private.num(e.data -> 'm')), max(e.at)
    from public.events e where e.kind in ('beat', 'end') and e.at >= since and e.data ? 's' group by e.device, e.data ->> 's';
  r := jsonb_build_object(
    'now', now(), 'days_n', d, 'tz', tz,
    'totals', jsonb_build_object(
      'players', (select count(*) from public.devices),
      'accounts', (select count(*) from public.profiles where callsign is not null),
      'online', (select count(distinct device) from public.events where at > now() - interval '5 minutes' and device <> 'server'),
      'dau', (select count(distinct device) from public.events where at > now() - interval '1 day' and device <> 'server'),
      'wau', (select count(distinct device) from public.events where at > now() - interval '7 days' and device <> 'server'),
      'mau', (select count(distinct device) from public.events where at > now() - interval '30 days' and device <> 'server'),
      'new_today', (select count(*) from public.devices where first_at >= today),
      'new_period', (select count(*) from public.devices where first_at >= since),
      'sessions', (select count(*) from public.events where kind = 'session' and at >= since),
      'avg_mins', (select round(avg(mins), 1) from pg_temp._bs where mins > 0),
      'med_mins', (select percentile_cont(0.5) within group (order by mins) from pg_temp._bs where mins > 0),
      'play_hours', (select round(coalesce(sum(mins), 0) / 60.0, 1) from pg_temp._bs),
      'landings', (select count(*) from public.events where kind = 'land' and at >= since),
      'crates', (select coalesce(sum(coalesce(sc_private.num(data -> 'n'), 1)), 0) from public.events where kind = 'crate' and at >= since),
      'duels', (select count(*) from public.events where kind = 'duel' and at >= since)),
    'days', (select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
      select to_char(g.day, 'YYYY-MM-DD') as day,
        (select count(distinct e.device) from public.events e where e.at >= g.day at time zone tz and e.at < (g.day + interval '1 day') at time zone tz and e.device <> 'server') as active,
        (select count(*) from public.devices v where v.first_at >= g.day at time zone tz and v.first_at < (g.day + interval '1 day') at time zone tz) as new,
        (select count(*) from public.events e where e.kind = 'session' and e.at >= g.day at time zone tz and e.at < (g.day + interval '1 day') at time zone tz) as sessions,
        (select round(coalesce(sum(b.mins), 0)) from pg_temp._bs b where b.last_at >= g.day at time zone tz and b.last_at < (g.day + interval '1 day') at time zone tz) as minutes,
        (select count(*) from public.events e where e.kind = 'land' and e.at >= g.day at time zone tz and e.at < (g.day + interval '1 day') at time zone tz) as landings,
        (select count(distinct e.device) from public.events e where e.kind = 'first' and e.data ->> 'what' = 'signup' and e.at >= g.day at time zone tz and e.at < (g.day + interval '1 day') at time zone tz) as signups
      from generate_series(((now() at time zone tz)::date - (d - 1))::timestamp, (now() at time zone tz)::date::timestamp, interval '1 day') g(day)) x),   -- local days (timestamp, not timestamptz)
    'lengths', (select jsonb_build_object(
      'u2', greatest(0, (select count(*) from public.events where kind = 'session' and at >= since) - (select count(*) from pg_temp._bs)) + (select count(*) from pg_temp._bs where mins < 2),
      'm2_5', count(*) filter (where mins >= 2 and mins < 5), 'm5_15', count(*) filter (where mins >= 5 and mins < 15),
      'm15_30', count(*) filter (where mins >= 15 and mins < 30), 'm30_60', count(*) filter (where mins >= 30 and mins < 60), 'm60', count(*) filter (where mins >= 60)) from pg_temp._bs),
    'scenes', (select coalesce(jsonb_object_agg(sc, n), '{}'::jsonb) from (
      select coalesce(e.data ->> 'sc', '?') as sc, count(*) * 2 as n from public.events e where e.kind = 'beat' and e.at >= since group by 1) q),
    'hours', (select coalesce(jsonb_agg(n order by h), '[]'::jsonb) from (
      select g.h, (select count(*) from public.events e where e.kind in ('beat', 'session') and e.at >= since and extract(hour from e.at at time zone tz) = g.h) as n
      from generate_series(0, 23) g(h)) q),
    'cohorts', (select coalesce(jsonb_agg(c order by c.day desc), '[]'::jsonb) from (
      select to_char(g.day, 'YYYY-MM-DD') as day, count(v.device) as size,
        case when now() > (g.day + interval '2 days') at time zone tz then round(100.0 * count(v.device) filter (where exists (select 1 from public.events e where e.device = v.device and e.at >= (g.day + interval '1 day') at time zone tz and e.at < (g.day + interval '2 days') at time zone tz)) / greatest(count(v.device), 1)) end as d1,
        case when now() > (g.day + interval '4 days') at time zone tz then round(100.0 * count(v.device) filter (where exists (select 1 from public.events e where e.device = v.device and e.at >= (g.day + interval '3 days') at time zone tz and e.at < (g.day + interval '4 days') at time zone tz)) / greatest(count(v.device), 1)) end as d3,
        case when now() > (g.day + interval '8 days') at time zone tz then round(100.0 * count(v.device) filter (where exists (select 1 from public.events e where e.device = v.device and e.at >= (g.day + interval '7 days') at time zone tz and e.at < (g.day + interval '8 days') at time zone tz)) / greatest(count(v.device), 1)) end as d7
      from generate_series(((now() at time zone tz)::date - 20)::timestamp, (now() at time zone tz)::date::timestamp, interval '1 day') g(day)
      left join public.devices v on v.first_at >= g.day at time zone tz and v.first_at < (g.day + interval '1 day') at time zone tz
      group by g.day) c),
    'funnel', (select jsonb_build_object(
      'opened', (select count(*) from public.devices where first_at >= since),
      'crate', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'crate' and at >= since),
      'equip', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'equip' and at >= since),
      'land', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'land' and at >= since),
      'boss', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'boss' and at >= since),
      'signup', (select count(distinct device) from public.events where kind = 'first' and data ->> 'what' = 'signup' and at >= since))),
    'planets', (select coalesce(jsonb_agg(q order by q.p), '[]'::jsonb) from (
      select (e.data ->> 'p')::int as p, count(*) as landings, count(distinct e.device) as players,
        round(100.0 * count(*) filter (where e.data ->> 'lost' = '1') / count(*)) as died,
        round(avg(sc_private.num(e.data -> 'ore'))) as ore, round(avg(sc_private.num(e.data -> 'k'))) as kills, round(avg(sc_private.num(e.data -> 's'))) as secs
      from public.events e where e.kind = 'land' and e.at >= since and e.data ->> 'p' ~ '^[0-9]{1,3}$' group by 1) q),
    'reach', (select coalesce(jsonb_object_agg(p, n), '{}'::jsonb) from (
      select p, count(*) as n from (select e.device, max(sc_private.num(e.data -> 'pl'))::int as p from public.events e where e.kind in ('session', 'reach') group by e.device) z group by p) q),
    'crates', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
      select coalesce(e.data ->> 'k', '?') as k, sum(coalesce(sc_private.num(e.data -> 'n'), 1)) as n from public.events e where e.kind = 'crate' and e.at >= since group by 1) q),
    'modes', jsonb_build_object(
      'duels', (select count(*) from public.events where kind = 'duel' and at >= since),
      'duel_win', (select round(100.0 * count(*) filter (where data ->> 'won' = '1') / greatest(count(*), 1)) from public.events where kind = 'duel' and at >= since),
      'duel_ai', (select count(*) from public.events where kind = 'duel' and data ->> 'ai' = '1' and at >= since),
      'arena', (select count(*) from public.events where kind = 'arena' and at >= since),
      'coop', (select count(*) from public.events where kind = 'coop' and at >= since),
      'dailies', (select count(*) from public.events where kind = 'daily' and at >= since),
      'missions', (select count(*) from public.events where kind = 'mission' and at >= since),
      'bosses', (select count(*) from public.events where kind = 'boss' and at >= since)),
    'devices', jsonb_build_object(
      'touch', (select count(distinct device) filter (where data ->> 'touch' = '1') from public.events where kind = 'session' and at >= since),
      'desktop', (select count(distinct device) filter (where coalesce(data ->> 'touch', '0') <> '1') from public.events where kind = 'session' and at >= since),
      'refs', (select coalesce(jsonb_agg(q order by q.n desc), '[]'::jsonb) from (select coalesce(nullif(data ->> 'ref', ''), 'direct') as ref, count(distinct device) as n from public.events where kind = 'session' and at >= since group by 1 order by 2 desc limit 8) q)),
    'top', (select coalesce(jsonb_agg(q order by q.mins desc), '[]'::jsonb) from (
      select coalesce((select p.callsign from public.devices v join public.profiles p on p.id = v.user_id where v.device = b.device), 'GUEST ' || upper(right(b.device, 4))) as who,
        round(sum(b.mins)) as mins, count(*) as sessions, max(b.last_at) as last_at
      from pg_temp._bs b group by b.device order by sum(b.mins) desc limit 12) q),
    'store', jsonb_build_object(
      'clicks', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(data ->> 'product', '?') as k, count(*) as n from public.events where kind = 'store_click' and at >= since group by 1) q),
      'cents', (select coalesce(sum(cents) filter (where not refunded), 0) from public.purchases where created_at >= since),
      'cents_all', (select coalesce(sum(cents) filter (where not refunded), 0) from public.purchases),
      'buyers', (select count(distinct user_id) from public.purchases where not refunded),
      'by', (select coalesce(jsonb_object_agg(product, n), '{}'::jsonb) from (select product, count(*) as n from public.purchases where not refunded and created_at >= since group by 1) z)),
    'health', jsonb_build_object(
      'bugs_open', (select count(*) from public.bugs where status in ('new', 'seen')),
      'crashes', (select coalesce(sum(n), 0) from public.crash_log where last_at >= since),
      'top_crash', (select message from public.crash_log where last_at >= since order by n desc limit 1),
      'list', (select coalesce(jsonb_agg(c order by c.n desc), '[]'::jsonb) from (select message, scene, ver, n, cardinality(devices) as players, last_at, left(stack, 700) as stack from public.crash_log where last_at >= since order by n desc limit 6) c)));
  return r;
end $$;

-- ------------------------------------------------- who may call what
do $$
declare f record;
begin
  -- internal helpers: nobody but the functions above
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'sc_private' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
  -- the game API: signed-in players only
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('init_player', 'save_game', 'load_game', 'touch', 'set_callsign', 'get_profile', 'search_players',
             'friend_request', 'friend_respond', 'friend_remove', 'crew_create', 'crew_join', 'crew_decline_invite', 'crew_leave', 'crew_kick',
             'crew_set_role', 'crew_transfer', 'crew_invite', 'crew_respond', 'crew_update', 'crew_list', 'crew_view',
             'trade_propose', 'trade_accept', 'trade_decline', 'trade_inventory', 'claim_mail', 'my_social',
             'arena_list', 'arena_create', 'arena_join', 'arena_ping', 'arena_leave', 'arena_report',
             'duel_find', 'duel_cancel', 'duel_ai', 'duel_report', 'leaderboard', 'my_arena', 'online_counts',
             'report_player', 'mod_queue', 'mod_action', 'daily_status', 'daily_claim', 'market_list', 'market_cancel', 'market_buy', 'market_browse',
             'challenge_send', 'challenge_respond', 'pulse', 'premium_get', 'premium_spend', 'pass_claim', 'admin_stats', 'admin_board', 'admin_bug', 'coop_invite') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  -- open to everyone, signed in or not: analytics, crash logs and bug reports
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('track', 'log_crash', 'bug_report') loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
  -- money: only the Stripe webhook, which uses the service role key
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('grant_purchase', 'refund_purchase') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f.sig); end if;
  end loop;
end $$;
