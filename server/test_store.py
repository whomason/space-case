"""The store, Stardust, the season pass, daily rewards v2, bug reports, crash logs and analytics,
run against the real schema in a local Postgres that imitates Supabase. Includes things that must be refused."""
import json, os, uuid
import psycopg2

DSN = dict(host='localhost', user='postgres', password='pg')
adm = psycopg2.connect(dbname='postgres', **DSN); adm.autocommit = True
adm.cursor().execute('drop database if exists sc_store'); adm.cursor().execute('create database sc_store')
db = psycopg2.connect(dbname='sc_store', **DSN); db.autocommit = True
c = db.cursor()
c.execute("""
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema auth; create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
""")
sql = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schema.sql')).read()
c.execute(sql); c.execute(sql)
U = {n: str(uuid.uuid4()) for n in ['A', 'B', 'M']}
for n, u in U.items(): c.execute('insert into auth.users values (%s, %s)', (u, n.lower() + '@x.com'))
fails = 0
def as_user(n):
    c.execute('reset role'); c.execute("select set_config('request.jwt.claim.sub', %s, false)", (U[n] if n in U else '',))
    c.execute('set role ' + ('service_role' if n == 'svc' else 'authenticated' if n else 'anon'))
def call(n, q, args=()):
    as_user(n)
    try: c.execute(q, args); r = c.fetchone(); return r[0] if r else None
    except Exception as e: return 'ERR: ' + str(e).split('\n')[0]
def sql_(q, args=()): c.execute('reset role'); c.execute(q, args); return c.fetchone() if c.description else None
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info)
    if not cond: fails += 1
J = json.dumps
for n, cs in [('A', 'ALPHA'), ('B', 'BRAVO'), ('M', 'MODDY')]:
    call(n, 'select init_player(%s)', (J({'inv': {'w|blaster|1': {'l': 1}}, 'coins': 1000, 'name': cs, 'planet': {'reached': 5}, 'lvl': 9}),))
sql_("insert into public.admins values (%s)", (U['M'],))

# ---- reading the store
r = call('A', 'select premium_get()'); ok('store opens with 0 stardust', r['sd'] == 0 and not r['supporter'] and len(r['shop']) == 6 and r['season']['id'] == 'frostfall', r)
ok('season pass: 30 tiers each side', len(r['season']['free']) == 30 and len(r['season']['prem']) == 30)
ok('shop prices are set', all(isinstance(x[1], int) and x[1] >= 300 for x in r['shop']), r['shop'])
# ---- real money only through the service role
r = call('A', "select grant_purchase('cs_1', %s, 'sd_1100', 999)", (U['A'],)); ok('a player cannot grant themselves stardust', str(r).startswith('ERR'), r)
r = call(None, "select grant_purchase('cs_1', %s, 'sd_1100', 999)", (U['A'],)); ok('nobody signed out can either', str(r).startswith('ERR'), r)
r = call('svc', "select grant_purchase('cs_1', %s, 'sd_1100', 999)", (U['A'],)); ok('the webhook grants 1100 stardust', r == 'granted', r)
r = call('svc', "select grant_purchase('cs_1', %s, 'sd_1100', 999)", (U['A'],)); ok('the same checkout twice grants once', r == 'already granted', r)
r = call('svc', "select grant_purchase('cs_x', %s, 'sd_999999', 1)", (U['A'],)); ok('unknown products refused', str(r).startswith('ERR'), r)
r = call('A', 'select premium_get()'); ok('balance is 1100', r['sd'] == 1100, r['sd'])
# ---- spending
shop = r['shop']; first = shop[0]
notin = [x for x in sql_("select sc_private.shop_items()")[0] if x[0] not in [s[0] for s in shop]][0]
r = call('A', "select premium_spend('item', %s)", (notin[0],)); ok('cannot buy what is not featured today', str(r).startswith('ERR') and 'SHOP' in r, r)
r = call('A', "select premium_spend('item', %s)", (first[0],)); ok('buy a featured cosmetic', isinstance(r, dict) and first[0] in r['owned'] and r['sd'] == 1100 - first[1], r if not isinstance(r, dict) else r['sd'])
r = call('A', "select premium_spend('item', %s)", (first[0],)); ok('cannot buy it twice', str(r).startswith('ERR'), r)
before = call('A', 'select premium_get()')['sd']
r = call('A', "select premium_spend('coins', 'c1')"); ok('coin pack costs 100 stardust', isinstance(r, dict) and r['sd'] == before - 100, r)
r = call('A', 'select claim_mail()'); got = r['data']; ok('coins + the cosmetic arrive by mail', first[0] in got['inv'] and got['coins'] > 1000, (got.get('coins'), list(got['inv'])))
c_after = got['coins']
call('svc', "select grant_purchase('cs_arm', %s, 'sd_2400', 1999)", (U['A'],)); sd0 = call('A', 'select premium_get()')['sd']
r = call('A', "select premium_spend('weapon', 'w|sniper|6302')"); ok('the armory sells THE LAST WORD for 2400', isinstance(r, dict) and 'w|sniper|6302' in r['owned'] and r['sd'] == sd0 - 2400, r if not isinstance(r, dict) else r['sd'])
r = call('A', "select premium_spend('weapon', 'w|blaster|6012')"); ok('pass weapons are not for sale', str(r).startswith('ERR'), r)
r = call('A', "select premium_spend('coins', 'c9')"); ok('unknown coin pack refused', str(r).startswith('ERR'), r)
# profile backgrounds: bought with stardust, shown to everyone only if you own the one you picked
sql_('update public.premium set stardust = stardust + 500 where user_id = %s', (U['A'],)); sdb = call('A', 'select premium_get()')['sd']
r = call('A', "select premium_spend('card', 'synth')"); ok('buy a profile background for 400', isinstance(r, dict) and 'card:synth' in r['owned'] and r['sd'] == sdb - 400, r if not isinstance(r, dict) else r['sd'])
r = call('A', "select premium_spend('card', 'synth')"); ok('cannot buy a background twice', str(r).startswith('ERR'), r)
r = call('A', "select premium_spend('card', 'gold')"); ok('unknown background refused', str(r).startswith('ERR'), r)
ok('the store lists the backgrounds', len(call('A', 'select premium_get()')['cards']) == 8)
sql_("update public.saves set data = jsonb_set(data, '{cardBg}', '\"synth\"') where user_id = %s", (U['A'],))
ok('an owned background shows on your public card', sql_('select sc_private.card(%s)', (U['A'],))[0]['bg'] == 'synth')
sql_("update public.saves set data = jsonb_set(data, '{cardBg}', '\"hole\"') where user_id = %s", (U['A'],))
ok('one you do not own does not', sql_('select sc_private.card(%s)', (U['A'],))[0]['bg'] is None)
sql_("update public.saves set data = jsonb_set(data, '{cardBg}', '\"synth\"') where user_id = %s", (U['A'],))
r = call('B', "select premium_spend('pass', 'frostfall')"); ok('no stardust, no pass', str(r).startswith('ERR') and 'NOT ENOUGH' in r, r)
r = call('svc', "select grant_purchase('cs_2', %s, 'pass_frostfall', 499)", (U['B'],)); ok('buying the pass for $4.99 works', r == 'granted', r)
r = call('B', 'select premium_get()'); ok('B owns FROSTFALL', 'frostfall' in r['passes'], r['passes'])
r = call('svc', "select grant_purchase('cs_3', %s, 'supporter', 499)", (U['B'],)); r = call('B', 'select premium_get()'); ok('supporter plate bought', r['supporter'], r)
r = call('A', "select get_profile('BRAVO')"); ok('everyone sees the supporter plate', r['plate'] is True, r.get('plate'))
call('svc', "select grant_purchase('cs_4', %s, 'sd_500', 499)", (U['A'],)); r = call('A', "select premium_spend('supporter', '')"); ok('A buys the plate with 500 stardust', isinstance(r, dict) and r['supporter'], r)
# ---- season pass
r = call('A', "select pass_claim(1, 'f', 0)"); ok('need xp for a tier', str(r).startswith('ERR') and 'XP' in r, r)
r = call('A', "select pass_claim(1, 'f', 1000)"); ok('free tier 1 claimed', isinstance(r, dict) and 1 in r['claims']['frostfall']['f'], r)
r = call('A', "select pass_claim(1, 'f', 1000)"); ok('only once', str(r).startswith('ERR') and 'ALREADY' in r, r)
r = call('A', "select pass_claim(1, 'p', 1000)"); ok('premium track needs the pass', str(r).startswith('ERR') and 'PASS' in r, r)
r = call('B', "select pass_claim(1, 'p', 1000)"); ok('pass owner claims premium tier 1 (a hat)', isinstance(r, dict) and 'c|headgear|6000' in r['owned'], r)
r = call('B', "select pass_claim(2, 'p', 2000)"); ok('premium tier 2: 50 stardust', isinstance(r, dict) and r['sd'] >= 50, r)
r = call('B', "select pass_claim(5, 'p', 5000)"); ok('premium tier 5: the Jingle Bell Blaster', isinstance(r, dict) and 'w|blaster|6012' in r['owned'], r)
sql_("update public.premium set passes = passes where true")
r = call('B', "select pass_claim(1, 'b', 31000)"); ok('bonus stars need 32,000 xp', str(r).startswith('ERR'), r)
r = call('B', "select pass_claim(1, 'b', 32000)"); ok('bonus star 1: +25 stardust', isinstance(r, dict) and 1 in r['claims']['frostfall']['b'], r)
r = call('B', "select pass_claim(41, 'b', 99000)"); ok('only 40 bonus stars', str(r).startswith('ERR'), r)
r = call('B', "select pass_claim(30, 'p', 9999999)"); ok('impossible xp refused', str(r).startswith('ERR') and 'ADD UP' in r, r)
r = call('B', 'select claim_mail()'); ok('pass hat arrives by mail', 'c|headgear|6000' in r['data']['inv'], list(r['data']['inv']))
ok('pass weapons arrive at a good grade', r['data']['inv'].get('w|blaster|6012', {}).get('g') == 4, r['data']['inv'].get('w|blaster|6012'))
r = call('B', "select market_list('w|blaster|6012', 500)"); ok('pass weapons cannot be sold on the market', str(r).startswith('ERR') and 'CANNOT BE TRADED' in r, r)
# ---- premium items stay with you
r = call('B', "select market_list('c|headgear|6000', 500)"); ok('pass items cannot go on the market', str(r).startswith('ERR') and 'CANNOT BE TRADED' in r, r)
sql_("insert into public.friendships (a, b, status, requested_by) values (least(%s::uuid, %s::uuid), greatest(%s::uuid, %s::uuid), 'accepted', %s)", (U['A'], U['B'], U['A'], U['B'], U['A']))
r = call('B', "select trade_propose('ALPHA', array['c|headgear|6000'], array[]::text[], 0, 0, '')"); ok('or be traded', str(r).startswith('ERR') and 'CANNOT BE TRADED' in r, r)
s = call('A', 'select load_game()'); d = s['data']; d['inv']['c|back|6008'] = {'l': 1}; d['inv']['k|ship|6219'] = {'l': 1}; d['eq'] = {'back': 'c|back|6008', 'weapon': 'w|blaster|1'}
r = call('A', 'select save_game(%s, %s)', (J(d), s['version'])); s2 = call('A', 'select load_game()')
ok('store items added by editing the save are removed', 'c|back|6008' not in s2['data']['inv'] and 'k|ship|6219' not in s2['data']['inv'] and 'back' not in s2['data']['eq'] and first[0] in s2['data']['inv'], list(s2['data']['inv']))
# ---- refunds
r = call('svc', "select refund_purchase('cs_3')"); r2 = call('B', 'select premium_get()'); ok('a refund takes the plate back', r == 'refunded' and not r2['supporter'], (r, r2['supporter']))
# ---- daily v2
r = call('A', 'select daily_status(240)'); ok('daily: 7 days with stardust and a big day 7', len(r['days']) == 7 and r['days'][6]['dust'] == 60 and len(r['days'][6]['crates']) == 3, r['days'][6])
sql_("insert into public.daily (user_id, last_day, last_at, streak) values (%s, (now() at time zone 'utc')::date - 1, now() - interval '1 day', 27) on conflict (user_id) do update set last_day = excluded.last_day, last_at = excluded.last_at, streak = 27", (U['A'],))
r = call('A', 'select daily_status(0)'); ok('week 4 shows the exclusive on day 7', r['days'][6]['item'] == 'c|back|6100', r['days'][6])
r = call('A', 'select daily_claim(0)'); ok('day 28: coins, 3 crates, 60 stardust and the exclusive', r['day'] == 7 and r['dust'] == 60 and r['item'] == 'c|back|6100' and len(r['crates']) == 3, r)
r = call('A', 'select premium_get()'); ok('the exclusive is yours for good', 'c|back|6100' in r['owned'], r['owned'])
# ---- analytics, crash logs and bug reports work signed out too
r = call(None, "select track('dev12345678', %s)", (J([{'k': 'session', 'd': {}}, {'k': 'first', 'd': {'what': 'crate'}}, {'k': 'BAD KIND!', 'd': {}}]),)); ok('signed-out events are counted, bad ones skipped', r == 2, r)
r = call(None, "select track('x', %s)", (J([{'k': 'session'}]),)); ok('bad device id ignored', r == 0, r)
r = call('A', "select track('devAAAAAAAA'::text, %s)", (J([{'k': 'beat', 'd': {'s': 'abc', 'm': 4}}]),)); ok('device ids must be lower case', r == 0, r)
r = call('A', "select track('devaaaaaaaa', %s)", (J([{'k': 'beat', 'd': {'s': 'abc', 'm': 4}}]),)); ok('signed-in events', r == 1, r)
r = call(None, "select log_crash('dev12345678', 'TypeError: x is undefined', 'at a\nat b', 'planet', 'v1')"); call(None, "select log_crash('dev87654321', 'TypeError: x is undefined', 'at a\nat b', 'planet', 'v1')")
ok('the same crash is grouped', sql_("select n, cardinality(devices) from public.crash_log")[0:2] == (2, 2), sql_("select n, cardinality(devices) from public.crash_log"))
r = call(None, "select bug_report('dev12345678', 'the boss got stuck in a wall', %s)", (J({'scene': 'planet'}),)); ok('bug report sent', 'THANKS' in r, r)
r = call(None, "select bug_report('dev12345678', '', '{}')"); ok('empty bug report refused', str(r).startswith('ERR'), r)
r = call('A', 'select admin_stats()'); ok('stats are for moderators only', str(r).startswith('ERR'), r)
r = call('M', 'select admin_stats()'); ok('moderator stats: days, retention, money, bugs, crashes', isinstance(r, dict) and len(r['days']) == 14 and r['money']['cents'] == 999 + 499 + 499 + 499 + 1999 - 499 and len(r['bugs']) == 1 and len(r['crashes']) == 1, r if not isinstance(r, dict) else r['money'])
bid = r['bugs'][0]['id']; r = call('M', 'select admin_bug(%s, %s)', (bid, 'fixed')); ok('mark a bug fixed', r == 'OK' and len(call('M', 'select admin_stats()')['bugs']) == 0, r)
r = call('A', "select select_from_events()") if False else None
as_user('A')
try: c.execute('select * from public.events'); ok('raw tables are closed', False)
except Exception: ok('raw tables are closed', True)
c.execute('reset role')
print('\nFAILURES:', fails)
