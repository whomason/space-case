"""Runs schema.sql against a local Postgres that imitates Supabase (auth schema, roles), then plays out
sign-ups, saves, friends, crews and trades as different players, including things that must be refused."""
import json, os, sys, uuid
import psycopg2

DSN = dict(host='localhost', user='postgres', password='pg')
adm = psycopg2.connect(dbname='postgres', **DSN); adm.autocommit = True
adm.cursor().execute('drop database if exists sc_test'); adm.cursor().execute('create database sc_test')
db = psycopg2.connect(dbname='sc_test', **DSN); db.autocommit = True
c = db.cursor()
c.execute("""
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase gives these roles execute on new public functions by default; imitate that
alter default privileges in schema public grant execute on functions to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
""")
sql = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schema.sql')).read()
c.execute(sql); c.execute(sql)  # twice: must be safe to re-run
print('schema ran twice OK')

U = {n: str(uuid.uuid4()) for n in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']}
for n, u in U.items(): c.execute('insert into auth.users values (%s, %s)', (u, n.lower() + '@x.com'))

fails = 0
def as_user(n):
    c.execute('reset role'); c.execute("select set_config('request.jwt.claim.sub', %s, false)", (U[n] if n else '',))
    c.execute('set role ' + ('authenticated' if n else 'anon'))
def call(n, q, args=()):
    as_user(n)
    try:
        c.execute(q, args); r = c.fetchone(); return r[0] if r else None
    except Exception as e:
        return 'ERR: ' + str(e).split('\n')[0]
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info)
    if not cond: fails += 1
J = lambda x: json.dumps(x)

# --- sign up + migrate local saves
la = {'inv': {'w|blaster|1': {'l': 3, 'p': 1, 't': 1}, 'w|rifle|2': {'l': 1, 'p': 0, 't': 1}, 'w|beam|3': {'l': 2, 'p': 0, 't': 1}}, 'eq': {'weapon': 'w|blaster|1', 'weapon2': None}, 'coins': 5000, 'name': 'MASON', 'lvl': 7, 'planet': {'reached': 3}, 'stats': {'kills': 40}}
r = call('A', 'select init_player(%s)', (J(la),)); ok('A init creates cloud save from local', r['created'] and r['version'] == 1 and r['callsign'] == 'MASON', r)
r = call('A', 'select init_player(%s)', (J({'inv': {}, 'coins': 0}),)); ok('A init again keeps cloud save', not r['created'] and r['data']['coins'] == 5000, r)
lb = {'inv': {'b|backdrop|9': {'l': 1, 'p': 0, 't': 1}, 'w|rifle|2': {'l': 2, 'p': 1, 't': 1}}, 'eq': {}, 'coins': 300, 'name': 'MASON'}
r = call('B', 'select init_player(%s)', (J(lb),)); ok('B taken callsign is not copied', r['callsign'] is None, r)
r = call('B', "select set_callsign('mason')"); ok('B cannot take MASON', str(r).startswith('ERR') and 'TAKEN' in r, r)
r = call('B', "select set_callsign('sh1t lord')"); ok('bad word filter', str(r).startswith('ERR') and 'FRIENDLIER' in r, r)
r = call('B', "select set_callsign('k')"); ok('too short refused', str(r).startswith('ERR'), r)
r = call('B', "select set_callsign('  kai-7 ')"); ok('B callsign KAI-7', r['callsign'] == 'KAI-7' and r['version'] == 2, r)
r = call('C', 'select init_player(null)'); ok('C fresh account', r['created'] and r['callsign'] is None, r)

# --- direct table access must be blocked
as_user('B')
for q, name in [("update public.saves set data = '{}'", 'B cannot update saves'), ("insert into public.profiles (id) values (gen_random_uuid())", 'B cannot insert profiles'),
                ("delete from public.trades", 'B cannot delete trades'), ("update public.profiles set level = 99", 'B cannot edit profiles')]:
    try: c.execute(q); ok(name, False, 'was allowed')
    except Exception as e: ok(name, 'permission denied' in str(e), str(e))
as_user('B'); c.execute('select count(*), max(user_id::text) from public.saves'); n, uid = c.fetchone(); ok('B sees only own save', n == 1 and uid == U['B'], (n, uid))
r = call(None, 'select init_player(null)'); ok('signed-out cannot call API', str(r).startswith('ERR') and 'permission denied' in r, r)
r = call('B', "select sc_private.grant_items('{}'::jsonb, '{}'::jsonb, 999999)"); ok('helpers are private', str(r).startswith('ERR'), r)

# --- saving with versions
la2 = dict(la, coins=5200)
r = call('A', 'select save_game(%s, 1)', (J(la2),)); ok('A save v1 -> v2', r['ok'] and r['version'] == 2, r)
r = call('A', 'select save_game(%s, 1)', (J(dict(la, coins=1)),)); ok('stale device gets conflict + newer save', (not r['ok']) and r['conflict'] and r['data']['coins'] == 5200 and r['version'] == 2, r)
r = call('A', 'select save_game(%s, 2)', (J({'coins': -5, 'inv': {}}),)); ok('negative coins refused', str(r).startswith('ERR'), r)
r = call('A', 'select save_game(%s, 2)', (J(dict(la2, name='HACKER')),)); ok('save keeps server callsign', r['ok'], r)
r = call('A', 'select load_game()'); ok('load returns callsign-stamped save', r['data']['name'] == 'MASON' and r['version'] == 3, r)
r = call('B', "select get_profile('mason')"); ok('B can view A profile + loadout', r['level'] == 7 and r['loadout']['weapon'] == 'w|blaster|1' and r['planet'] == 3 and r['friend'] == 'none', r)

# --- friends
r = call('A', "select friend_request('kai-7')"); ok('A -> KAI-7 request', r == 'sent', r)
r = call('A', "select friend_request('kai-7')"); ok('duplicate request', r == 'already sent', r)
r = call('B', 'select my_social()'); ok('B sees incoming', len(r['incoming']) == 1 and r['incoming'][0]['callsign'] == 'MASON', r)
r = call('B', 'select friend_respond(%s, true)', (U['A'],)); ok('B accepts', r == 'accepted', r)
r = call('A', 'select my_social()'); ok('A friend list has KAI-7 online', len(r['friends']) == 1 and r['friends'][0]['callsign'] == 'KAI-7' and r['friends'][0]['online'], r)
r = call('A', "select friend_request('nobody')"); ok('unknown callsign', str(r).startswith('ERR') and 'NO ASTRONAUT' in r, r)
r = call('A', "select search_players('ka')"); ok('search finds KAI-7', any(p['callsign'] == 'KAI-7' for p in r), r)

# --- crews
r = call('C', "select crew_create('lonely', 'LN', true)"); ok('no callsign -> cannot create crew', str(r).startswith('ERR') and 'CALLSIGN' in r, r)
r = call('A', "select crew_create('Star Pirates', 'sp', false)"); crew = r; ok('A creates closed crew', len(str(r)) == 36, r)
r = call('B', "select crew_create('star pirates', 'XX', true)"); ok('crew name unique', str(r).startswith('ERR') and 'TAKEN' in r, r)
r = call('B', 'select crew_join(%s)', (crew,)); ok('closed crew -> request', r == 'requested', r)
r = call('A', 'select my_social()'); ok('leader sees request', len(r['crew']['requests']) == 1 and r['crew']['tag'] == 'SP', r)
r = call('A', 'select crew_respond(%s, true)', (U['B'],)); ok('leader accepts', r == 'accepted', r)
r = call('B', 'select crew_kick(%s)', (U['A'],)); ok('member cannot kick leader', str(r).startswith('ERR'), r)
r = call('A', 'select crew_set_role(%s, %s)', (U['B'], 'officer')); ok('promote to officer', r == 'officer', r)
call('C', "select set_callsign('zed')")
r = call('B', "select crew_invite('zed')"); ok('officer invites ZED', r == 'invited', r)
r = call('C', 'select my_social()'); ok('ZED sees invite', len(r['invites']) == 1, r)
r = call('C', 'select crew_join(%s)', (crew,)); ok('invited player joins closed crew', r == 'joined', r)
r = call('C', "select crew_create('second', 'SC', true)"); ok('one crew at a time', str(r).startswith('ERR'), r)
r = call('A', 'select crew_leave()'); ok('leader leaves', r == 'left', r)
r = call('B', 'select my_social()'); ok('officer KAI-7 became leader', r['crew']['my_role'] == 'leader' and len(r['crew']['members']) == 2, r)
r = call('B', 'select crew_kick(%s)', (U['C'],)); ok('new leader kicks ZED', r == 'kicked', r)
r = call('B', 'select crew_leave()'); ok('last member leaving disbands', r == 'disbanded', r)
r = call('B', "select crew_list('')"); ok('crew list empty after disband', r == [], r)

# --- trades with escrow + mailbox
r = call('A', "select trade_propose('kai-7', array['w|blaster|1'], array['b|backdrop|9'], 0, 0, '')"); ok('equipped item refused', str(r).startswith('ERR') and 'UNEQUIP' in r, r)
r = call('A', "select trade_propose('kai-7', array['w|nope|1'], array[]::text[], 0, 0, '')"); ok('unowned item refused', str(r).startswith('ERR') and 'NOT OWNED' in r, r)
r = call('A', "select trade_propose('kai-7', array['w|beam|3'], array['w|nothere|1'], 0, 0, '')"); ok('asking for item they lack refused', str(r).startswith('ERR') and 'THEY DO NOT OWN' in r, r)
r = call('A', "select trade_propose('kai-7', array[]::text[], array[]::text[], 0, 0, '')"); ok('empty offer refused', str(r).startswith('ERR') and 'ADD AN ITEM' in r, r)
r = call('A', "select trade_propose('kai-7', array['w|rifle|2'], array['b|backdrop|9'], 100, 0, 'swap?')"); t1 = r.get('trade') if isinstance(r, dict) else None
ok('A offers rifle + 100 for backdrop', t1 and 'w|rifle|2' not in r['data']['inv'] and r['data']['coins'] == 5100 and r['version'] == 4, r)
r = call('A', 'select save_game(%s, 3)', (J(la2),)); ok('old local save cannot restore escrowed item', (not r['ok']) and r['conflict'], r)
r = call('A', 'select save_game(%s, 3, true)', (J(la2),)); ok('...not even when forced', (not r['ok']) and r['conflict'] and r['can_force'] is False, r)
r = call('A', "select trade_inventory('kai-7')"); ok('friend inventory visible for trading', 'b|backdrop|9' in r['inv'] and r['eq'] == [], r)
r = call('A', "select trade_inventory('zed')"); ok('non-friend inventory hidden', str(r).startswith('ERR') and 'FRIENDS' in r, r)
r = call('A', "select trade_propose('zed', array[]::text[], array[]::text[], 5, 0, '')"); ok('cannot trade with strangers', str(r).startswith('ERR') and 'FRIENDS' in r, r)
r = call('B', 'select my_social()'); ok('B sees offer', len(r['trades']) == 1 and r['trades'][0]['give'] == ['w|rifle|2'] and not r['trades'][0]['mine'], r)
r = call('C', 'select trade_accept(%s)', (t1,)); ok('third player cannot accept', str(r).startswith('ERR'), r)
r = call('B', 'select trade_accept(%s)', (t1,)); bd = r.get('data') if isinstance(r, dict) else {}
ok('B accepts: gets rifle level-up dup + coins, loses backdrop', bd and 'b|backdrop|9' not in bd['inv'] and bd['inv']['w|rifle|2']['l'] == 3 and bd['coins'] == 400, r)
r = call('B', 'select trade_accept(%s)', (t1,)); ok('cannot accept twice', str(r).startswith('ERR'), r)
r = call('A', 'select claim_mail()'); ok('A claims backdrop from mailbox', r['data']['inv']['b|backdrop|9']['l'] == 1 and r['data']['fresh']['b|backdrop|9'] == 1 and r['got'][0]['from'] == 'KAI-7', r)
r = call('A', 'select claim_mail()'); ok('mailbox empty after claim', r['got'] == [] and 'data' not in r, r)
r = call('A', "select trade_propose('kai-7', array['w|beam|3'], array[]::text[], 0, 50, '')"); t2 = r['trade']
r = call('B', 'select trade_decline(%s)', (t2,)); ok('B declines', r == 'closed', r)
r = call('A', 'select claim_mail()'); ok('declined item returns to A', r['data']['inv']['w|beam|3']['l'] == 2, r)
v = r['version']
r = call('A', "select trade_propose('kai-7', array[]::text[], array[]::text[], 6000, 0, '')"); ok('cannot offer more coins than owned', str(r).startswith('ERR') and 'COINS' in r, r)
for i in range(5): call('A', "select trade_propose('kai-7', array[]::text[], array[]::text[], 1, 0, '')")
r = call('A', "select trade_propose('kai-7', array[]::text[], array[]::text[], 1, 0, '')"); ok('max 5 open offers', str(r).startswith('ERR') and '5 OFFERS' in r, r)
# expiry refunds
c.execute('reset role'); c.execute("update public.trades set created_at = now() - interval '4 days' where status = 'open'")
r = call('A', 'select my_social()'); ok('expired offers vanish', r['trades'] == [] and r['mail'] == 5, r)
r = call('A', 'select claim_mail()'); ok('expired coins come back', len(r['got']) == 5, r)
r = call('A', 'select load_game()'); ok('coin total adds up after all trades', r['data']['coins'] == 5100, r['data']['coins'])

# --- a second device may keep its own progress only when no trades happened since it synced
call('D', 'select init_player(%s)', (J({'inv': {}, 'coins': 10}),))
r = call('D', 'select save_game(%s, 1)', (J({'inv': {}, 'coins': 20}),)); ok('D v2', r['ok'] and r['version'] == 2, r)
r = call('D', 'select save_game(%s, 1)', (J({'inv': {}, 'coins': 99}),)); ok('D stale device conflict, may force', r['conflict'] and r['can_force'] is True, r)
r = call('D', 'select save_game(%s, 1, true)', (J({'inv': {}, 'coins': 99}),)); ok('D keeps this device progress', r['ok'] and r['version'] == 3, r)
r = call('D', 'select load_game()'); ok('D cloud now has device save', r['data']['coins'] == 99, r)
# --- arenas, duels, trophies
r = call('A', 'select arena_list()'); ok('4 public arenas listed', len([x for x in r if not x['private']]) == 4 and all(x['cap'] == 5 for x in r), r)
r = call('A', "select arena_join('alpha')"); ok('A joins alpha', r['id'] == 'alpha', r)
r = call('B', "select arena_join('alpha')"); ok('B joins alpha', r['id'] == 'alpha', r)
r = call('A', 'select arena_list()'); al = [x for x in r if x['id'] == 'alpha'][0]; ok('alpha shows 2 humans', al['humans'] == 2 and set(al['players']) == {'MASON', 'KAI-7'}, al)
r = call('A', 'select online_counts()'); ok('counts: real players + AI pilots (max 5 AI, 10 pilots)', r['in_arenas'] == 2 and r['ai'] == 5 and r['online'] >= 2, r)
r = call('A', "select arena_report('alpha', 50, 5, 3, 9)"); ok('kills capped by time passed', r['kills'] <= 2, r)
c.execute('reset role'); c.execute("update public.arena_presence set reported_at = now() - interval '60 seconds' where user_id = %s", (U['A'],))
r = call('A', "select arena_report('alpha', 20, 4, 3, 9)"); ok('a minute of kills pays coins and trophies', r['kills'] == 20 and r['coins'] == 16 * 20 + 4 * 60 and r['trophies_gained'] == 28, r)
r = call('A', 'select claim_mail()'); ok('arena coins arrive by mail', any(g['reason'] == 'arena kills' for g in r['got']), r)
r = call('A', "select arena_report('bravo', 5, 0, 0, 1)"); ok('cannot report for an arena you are not in', str(r).startswith('ERR'), r)
r = call('A', "select arena_create('mason pals')"); code = r['code']; pid = r['id']; ok('private server made', len(code) == 6, r)
r = call('B', 'select arena_list()'); ok('friend sees private server, without its code', any(x['id'] == pid and x['code'] is None for x in r), r)
r = call('C', 'select arena_list()'); ok('stranger does not see it', not any(x['id'] == pid for x in r), r)
r = call('C', f"select arena_join('{pid}')"); ok('stranger cannot join without code', str(r).startswith('ERR') and 'PRIVATE' in r, r)
r = call('C', f"select arena_join(null, '{code.lower()}')"); ok('anyone with the code can join', r['id'] == pid, r)
r = call('C', 'select arena_leave()'); r = call('A', 'select arena_list()'); ok('leaving frees the slot', [x for x in r if x['id'] == pid][0]['humans'] == 0, r)
r = call('A', "select leaderboard('trophies')"); ok('trophy leaderboard', r['top'][0]['callsign'] == 'MASON' and r['me']['place'] == 1, r)
r = call('B', "select get_profile('mason')"); ok('profile shows arena stats', r['arena']['kills'] == 22 or r['arena']['kills'] >= 20, r.get('arena'))
# duels: two humans find each other
r = call('A', 'select duel_find(true)'); ok('A waits in queue', r.get('waiting') is True, r)
r = call('B', 'select duel_find(true)'); m = r.get('match'); ok('B is matched with A', m and r['opponent']['callsign'] == 'MASON' and r['host'] is False, r)
r = call('A', 'select duel_find(true)'); ok('A learns the match and hosts', r.get('match') == m and r['host'] is True and r['opponent']['callsign'] == 'KAI-7', r)
r = call('A', f"select duel_report('{m}', true)"); ok('winner report waits for the other side', r.get('pending') is True, r)
r = call('C', f"select duel_report('{m}', true)"); ok('outsider cannot report', str(r).startswith('ERR'), r)
before = call('A', 'select my_arena()')['trophies']
r = call('B', f"select duel_report('{m}', false)"); ok('loser concedes: done', r['done'] and r['trophy_change'] <= 0, r)
r = call('A', 'select my_arena()'); ok('ranked win +30 trophies', r['trophies'] == before + 30 and r['ranked_won'] == 1, r)
r = call('A', f"select duel_report('{m}', true)"); ok('settled match: winner still learns +30, no double pay', r['done'] and r['won'] and r['trophy_change'] == 30 and call('A', 'select my_arena()')['trophies'] == before + 30, r)
# vs AI
r = call('D', "select set_callsign('dee')")
r = call('D', 'select duel_ai(true)'); mai = r['match']
r = call('D', f"select duel_report('{mai}', true)"); ok('beating the AI in ranked gives a few trophies', r['done'] and r['trophy_change'] == 14, r)
r = call('D', 'select duel_ai(true)'); mai2 = r['match']
r = call('D', f"select duel_report('{mai2}', false)"); ok('losing to the AI costs some', r['trophy_change'] == -8, r)
r = call('D', 'select duel_ai(false)'); mai3 = r['match']
r = call('D', f"select duel_report('{mai3}', true)"); ok('unranked changes no trophies', r['trophy_change'] == 0, r)
r = call('B', 'select duel_find(false)'); r = call('B', 'select duel_cancel()'); ok('cancel queue', r.get('cancelled') is True, r)
# matchmaking for a small player base
for n, cs in [('E', 'echo'), ('F', 'fox'), ('G', 'golf'), ('H', 'hotel')]: call(n, 'select init_player(null)'); call(n, "select set_callsign(%s)", (cs,))
def age(n, secs, col='created_at'): c.execute('reset role'); c.execute(f"update public.duel_queue set {col} = now() - interval '{secs} seconds' where user_id = %s", (U[n],))
r = call('E', 'select duel_find(false)'); ok('E waits, told how many others are around', r.get('waiting') is True and r['others'] >= 1, r)
r = call('F', 'select duel_find(true)'); ok('ranked F does not grab unranked E straight away', r.get('waiting') is True and r['searching'] == 1, r)
age('E', 6); r = call('F', 'select duel_find(true)'); mx = r.get('match'); ok('after a few seconds ranked and unranked meet, as unranked', mx and r['ranked'] is False and r['opponent']['callsign'] == 'ECHO', r)
r = call('E', 'select duel_find(false)'); ok('E hosts the cross-mode match', r.get('match') == mx and r['host'] is True, r)
r = call('G', 'select duel_find(false)'); age('G', 25, 'seen_at')
r = call('H', 'select duel_find(false)'); ok('a searcher who closed the game is not matched', r.get('waiting') is True, r)
r = call('G', "select duel_find(false, 'pals')"); ok('G waits for a friend code', r.get('waiting') is True, r)
r = call('H', 'select duel_find(false)'); ok('public search skips code searchers', r.get('waiting') is True, r)
r = call('H', "select duel_find(false, 'p a l s')"); mf = r.get('match'); ok('same code (any case) matches friends, unranked', mf and r['ranked'] is False and r['opponent']['callsign'] == 'GOLF', r)
r = call('G', "select duel_find(true, 'pals')"); ok('G gets the friend match', r.get('match') == mf, r)
r = call('E', "select duel_find(false, 'x')"); ok('short codes refused', str(r).startswith('ERR'), r)
# the other pilot never connects: each side settles as an AI match, no dispute
c.execute('reset role'); c.execute("update public.duels set ranked = true where id = %s", (mx,))
t0 = call('E', 'select my_arena()')['trophies']
r = call('E', f"select duel_report('{mx}', true, true)"); ok('stand-in AI win pays like an AI match', r['done'] and r['trophy_change'] == 14, r)
r = call('E', f"select duel_report('{mx}', true, true)"); ok('reporting again does not pay twice', r['done'] and r['trophy_change'] == 14 and call('E', 'select my_arena()')['trophies'] == t0 + 14, r)
r = call('F', f"select duel_report('{mx}', true)"); ok('other side also settles vs AI', r['done'] and r['trophy_change'] == 14, r)
# an old match nobody played does not trap a searcher
r = call('G', 'select duel_find(false)'); r = call('H', 'select duel_find(false)'); mo = r.get('match')
c.execute('reset role'); c.execute("update public.duels set created_at = now() - interval '2 minutes' where id = %s", (mo,))
r = call('G', 'select duel_find(false)'); ok('stale match is dropped and search goes on', r.get('waiting') is True, r)
call('G', 'select duel_cancel()')
# ===================== fair play, moderation, daily, seasons, market, challenges
def sql(q, args=()): c.execute('reset role'); c.execute(q, args); return c.fetchall() if c.description else None
def save_of(n): return sql('select data, version from public.saves where user_id = %s', (U[n],))[0]
# A and B are friends (from above). E is a plain player.
d, v = save_of('E'); d['coins'] = 1000; d['inv'] = {'w|blaster|1': {'l': 1, 'p': 0, 't': 1}, 'w|rifle|2': {'l': 2, 'p': 0, 't': 1}, 'a|helmet|3': {'l': 1, 'p': 0, 't': 1}}; d['eq'] = {'weapon': 'w|blaster|1'}
r = call('E', 'select save_game(%s, %s)', (J(d), v)); ok('normal save is fine', r['ok'] and not sql('select flagged from public.moderation where user_id = %s', (U['E'],)), r)
d['coins'] = 1000; d['lvl'] = 3; v = r['version']
r = call('E', 'select save_game(%s, %s)', (J(d), v)); v = r['version']
ok('honest progress is never flagged', not (sql('select flagged from public.moderation where user_id = %s', (U['E'],)) or [[False]])[0][0])
# F cheats: a billion coins out of nowhere
d2, v2 = save_of('F'); d2['coins'] = 999999999; d2['inv'] = {'w|blaster|1': {'l': 1, 'p': 0, 't': 1}, 'w|rifle|2': {'l': 1, 'p': 0, 't': 1}}
r = call('F', 'select save_game(%s, %s)', (J(d2), v2)); ok('cheat save still saves (nothing is deleted)', r['ok'], r)
ok('impossible coin jump flags the account', sql('select flagged, flag_reason from public.moderation where user_id = %s', (U['F'],))[0][0], sql('select * from public.moderation where user_id = %s', (U['F'],)))
ok('the flag opens an automatic report', sql("select count(*) from public.reports where target = %s and reason = 'AUTO'", (U['F'],))[0][0] == 1)
d3, v3 = save_of('G'); d3['inv'] = {'w|blaster|1': {'l': 99, 'p': 0, 't': 1}}
call('G', 'select save_game(%s, %s)', (J(d3), v3)); ok('an impossible item level flags too', sql('select flagged from public.moderation where user_id = %s', (U['G'],))[0][0])
d4, v4 = save_of('H'); d4['tamper'] = 1
call('H', 'select save_game(%s, %s)', (J(d4), v4)); ok('an edited save file flags too', sql('select flag_reason from public.moderation where user_id = %s', (U['H'],))[0][0].startswith('THE SAVE FILE'))
r = call('F', "select market_list('w|rifle|2', 100)"); ok('flagged player cannot sell on the market', str(r).startswith('ERR') and 'PAUSED' in r, r)
r = call('F', 'select leaderboard()'); sql("update public.arena_stats set trophies = 9999 where user_id = %s", (U['F'],))
r = call('A', 'select leaderboard()'); ok('flagged player is hidden from leaderboards', not any(x['callsign'] == 'FOX' for x in r['top']), r['top'][:3])
# reports + moderators
r = call('A', "select report_player('fox', 'cheating', 'a billion coins')"); ok('report a player', 'THANKS' in r, r)
r = call('A', "select report_player('fox', 'cheating', 'again')"); ok('one open report per player', 'ALREADY' in r, r)
r = call('A', "select report_player('fox', 'because')"); ok('report needs a real reason', str(r).startswith('ERR'), r)
r = call('A', 'select mod_queue()'); ok('only moderators see the queue', str(r).startswith('ERR') and 'MODERATORS' in r, r)
sql('insert into public.admins values (%s) on conflict do nothing', (U['A'],))
r = call('A', 'select mod_queue()'); fx = [p for p in r['players'] if p['callsign'] == 'FOX']; ok('moderator sees the reported player with both reports', fx and fx[0]['n'] == 2 and fx[0]['flagged'] and fx[0]['coins'] == 999999999, r['players'][:1])
r = call('A', 'select pulse()'); ok('pulse tells a moderator they are one', r['admin'] is True and r['flagged'] is False, r)
r = call('A', 'select mod_action(%s, %s, %s, %s)', (U['F'], 'ban', 3, 'cheating')); ok('ban for 3 days', r == 'DONE', r)
r = call('F', 'select my_social()'); ok('a banned player is stopped everywhere', str(r).startswith('ERR') and 'BANNED UNTIL' in r and 'CHEATING' in r, r)
r = call('A', 'select mod_queue()'); ok('reports are closed after acting', not any(p['callsign'] == 'FOX' for p in r['players']) and any(b['callsign'] == 'FOX' for b in r['banned']), r)
r = call('A', 'select mod_action(%s, %s)', (U['F'], 'unban')); r = call('F', 'select pulse()'); ok('unban lets them back in, still flagged', r.get('flagged') is True, r)
r = call('A', 'select mod_action(%s, %s)', (U['F'], 'clear')); r = call('F', 'select pulse()'); ok('clearing the flag', r['flagged'] is False, r)
r = call('A', 'select mod_action(%s, %s)', (U['G'], 'rename')); ok('rename makes them pick a new callsign', sql('select callsign from public.profiles where id = %s', (U['G'],))[0][0] is None)
r = call('B', 'select mod_action(%s, %s)', (U['A'], 'ban')); ok('players cannot moderate', str(r).startswith('ERR'), r)
r = call('A', 'select mod_action(%s, %s)', (U['A'], 'ban')); ok('moderators cannot ban themselves', str(r).startswith('ERR'), r)
# daily rewards
r = call('E', 'select daily_status(240)'); ok('daily: first day ready', r['can'] and r['next'] == 1 and len(r['days']) == 7, r)
r = call('E', 'select daily_claim(240)'); ok('claim day 1: coins by mail', r['day'] == 1 and r['coins'] >= 300, r)
r = call('E', 'select daily_claim(240)'); ok('only once a day', str(r).startswith('ERR') and 'ALREADY' in r, r)
r = call('E', 'select daily_claim(-600)'); ok('changing the time zone does not give a second claim', str(r).startswith('ERR'), r)
sql("update public.daily set last_day = last_day - 1, last_at = now() - interval '1 day' where user_id = %s", (U['E'],))
r = call('E', 'select daily_claim(240)'); ok('next day: streak 2', r['day'] == 2 and r['streak'] == 2, r)
sql("update public.daily set last_day = last_day - 1, last_at = now() - interval '1 day' where user_id = %s", (U['E'],))
r = call('E', 'select daily_claim(240)'); ok('day 3 gives a crate', r['day'] == 3 and len(r['crates']) == 1, r)
sql("update public.daily set last_day = last_day - 3, last_at = now() - interval '3 days' where user_id = %s", (U['E'],))
r = call('E', 'select daily_claim(240)'); ok('missing a day restarts the streak', r['day'] == 1 and r['streak'] == 1, r)
r = call('E', 'select claim_mail()'); ok('daily crate arrives as a DAILY CRATE', any(x.get('title') == 'DAILY CRATE' for x in r['data']['choiceQueue']), r['data'].get('choiceQueue'))
# seasons
r = call('A', 'select my_arena()'); ok('season 1 is running', r['season'] == 1 and r['season_ends'] is not None, r)
sql("update public.arena_stats set trophies = 1200 where user_id = %s", (U['A'],)); sql("update public.arena_stats set trophies = 300 where user_id = %s", (U['B'],))
sql("update public.season_state set ends_at = now() - interval '1 second'")
r = call('A', 'select my_arena()'); ok('season rolls over: season 2, trophies halved', r['season'] == 2 and r['trophies'] == 600, r)
ok('last season result is kept (FOX, cleared, is #1 with 9999)', r['last_season'] and r['last_season']['place'] == 2 and r['last_season']['rank'] == 'PLATINUM', r.get('last_season'))
r = call('B', 'select claim_mail()'); ok('season rewards by mail', any('season 1 reward' in g['reason'] for g in r['got']), r['got'])
r = call('A', 'select my_arena()'); ok('it only rolls once', r['season'] == 2 and r['trophies'] == 600, r)
# market
dE, vE = save_of('E'); cE = dE['coins']
r = call('E', "select market_list('w|blaster|1', 500)"); ok('cannot sell what you have equipped', str(r).startswith('ERR') and 'UNEQUIP' in r, r)
r = call('E', "select market_list('w|rifle|2', 0)"); ok('price must be positive', str(r).startswith('ERR'), r)
r = call('E', "select market_list('w|rifle|2', 500)"); lid = r['listing']; ok('list an item: it leaves your save', 'w|rifle|2' not in r['data']['inv'], r)
r = call('B', 'select market_browse()'); ok('everyone sees it, with the seller', any(x['id'] == lid and x['seller'] == 'ECHO' and x['l'] == 2 for x in r), r)
r = call('E', f'select market_buy({lid})'); ok('cannot buy your own', str(r).startswith('ERR'), r)
dB, vB = save_of('B'); sql("update public.saves set data = jsonb_set(data, '{coins}', '100') where user_id = %s", (U['B'],))
r = call('B', f'select market_buy({lid})'); ok('not enough coins', str(r).startswith('ERR') and 'NOT ENOUGH' in r, r)
sql("update public.saves set data = jsonb_set(data, '{coins}', '2000') where user_id = %s", (U['B'],))
r = call('B', f'select market_buy({lid})'); ok('buy: item in, coins out', r['data']['inv'].get('w|rifle|2') and r['data']['coins'] == 1500, r)
r = call('A', f'select market_buy({lid})'); ok('sold items cannot be bought twice', str(r).startswith('ERR'), r)
r = call('E', 'select claim_mail()'); ok('seller gets the price minus 5%', any(g['reason'] == 'market sale' and g['coins'] == 475 for g in r['got']), r['got'])
r = call('E', "select market_list('a|helmet|3', 50)"); l2 = r['listing']
r = call('E', f'select market_cancel({l2})'); r = call('E', 'select claim_mail()'); ok('cancel: the item comes back', 'a|helmet|3' in r['data']['inv'], r['got'])
# friend challenges + pulse
r = call('B', 'select pulse()'); ok('pulse: friends online', 'MASON' in r['online'], r)
r = call('A', "select challenge_send('echo')"); ok('can only challenge friends', str(r).startswith('ERR') and 'FRIENDS' in r, r)
r = call('A', "select challenge_send('kai-7')"); cid, code = r['id'], r['code']; ok('challenge a friend', code.startswith('C'), r)
r = call('B', 'select pulse()'); ok('friend sees the challenge', any(x['id'] == cid and x['from'] == 'MASON' for x in r['challenges']), r)
r = call('B', f'select challenge_respond({cid}, true)'); ok('accepting hands over the shared code', r['code'] == code, r)
r = call('A', 'select pulse()'); ok('challenger learns it was accepted', any(x['id'] == cid and x['status'] == 'accepted' for x in r['answers']), r)
r = call('A', "select duel_find(false, %s)", (code,)); r = call('B', "select duel_find(false, %s)", (code,)); mch = r.get('match'); ok('the code matches them', bool(mch), r)
r = call('E', 'select pulse()'); ok('strangers cannot see the match', not r['watch'], r)
call('E', "select friend_request('mason')"); call('A', 'select friend_respond(%s, true)', (U['E'],))
r = call('E', 'select pulse()'); ok('a friend can watch it live', any(x['match'] == mch for x in r['watch']), r['watch'])
r = call('A', "select challenge_send('kai-7')"); c2 = r['id']; r = call('B', f'select challenge_respond({c2}, false)'); r = call('A', 'select pulse()')
ok('declines come back too', any(x['id'] == c2 and x['status'] == 'declined' for x in r['answers']), r['answers'])
print('\nFAILURES:', fails); sys.exit(1 if fails else 0)
