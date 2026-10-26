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

U = {n: str(uuid.uuid4()) for n in ['A', 'B', 'C', 'D']}
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
print('\nFAILURES:', fails); sys.exit(1 if fails else 0)
