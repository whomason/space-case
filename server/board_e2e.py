"""Data board: a moderator signs in on board.html and sees the stats; a normal player is refused."""
import asyncio, os, sys, time, random, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
import psycopg2
from playwright.async_api import async_playwright
OUT = os.environ.get('SHOTS', '/tmp/')
srv, M = MS.start(8127)
BASE = 'http://localhost:8127'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
def q(sql, a=()):
    with psycopg2.connect(dbname=M.dbname, **MS.DSN) as cn: c = cn.cursor(); c.execute(sql, a); return c.fetchall() if c.description else None
def seed():
    R = random.Random(7); rows = []; devs = []
    for i in range(60):
        dev = 'dev%06d' % i; age = R.randint(0, 25); first = f"now() - interval '{age} days' - interval '{R.randint(0, 20)} hours'"
        q(f"insert into public.devices (device, first_at, last_at) values (%s, {first}, now()) on conflict do nothing", (dev,)); devs.append((dev, age))
    for dev, age in devs:
        for day in range(age, -1, -1):
            if day != age and R.random() > 0.35: continue
            s = '%08x' % R.getrandbits(32); hr = R.randint(0, 23); at = f"now() - interval '{day} days' - interval '{hr} hours'"
            q(f"insert into public.events (device, kind, data, at) values (%s, 'session', %s, {at})", (dev, json.dumps({'s': s, 'touch': 1 if R.random() < .3 else 0, 'pl': R.randint(1, 8), 'ref': R.choice(['', '', 'reddit.com', 'discord.com', 'youtube.com'])})))
            m = R.choice([0, 1, 3, 6, 12, 20, 35, 70])
            for b in range(2, m + 1, 2): q(f"insert into public.events (device, kind, data, at) values (%s, 'beat', %s, {at} + interval '{b} minutes')", (dev, json.dumps({'s': s, 'm': b, 'sc': R.choice(['planet', 'planet', 'planet', 'hub', 'open', 'crates', 'map', 'arena'])})))
            for _ in range(m // 4): q(f"insert into public.events (device, kind, data, at) values (%s, 'land', %s, {at})", (dev, json.dumps({'p': R.randint(1, 6), 'ore': R.randint(5, 60), 'k': R.randint(5, 90), 'lost': 1 if R.random() < .35 else 0, 's': R.randint(40, 240)})))
            for _ in range(m // 5): q(f"insert into public.events (device, kind, data, at) values (%s, 'crate', %s, {at})", (dev, json.dumps({'k': R.choice(['weapon', 'armor', 'ship', 'haul', 'class:rifle']), 'n': R.choice([1, 1, 5]), 't': 1})))
            if day == age:
                for w in ['crate', 'equip', 'land', 'boss', 'signup'][:R.randint(0, 5)]: q(f"insert into public.events (device, kind, data, at) values (%s, 'first', %s, {at})", (dev, json.dumps({'what': w})))
            if R.random() < .2: q(f"insert into public.events (device, kind, data, at) values (%s, 'duel', %s, {at})", (dev, json.dumps({'won': R.randint(0, 1), 'ai': R.randint(0, 1)})))
    q("insert into public.events (device, kind, data, at) values ('dev000001', 'beat', '{\"s\":\"live1\",\"m\":4,\"sc\":\"planet\"}', now())")
    q("insert into public.events (device, kind, data) select 'dev000002', 'store_click', '{\"product\":\"sd_500\"}' from generate_series(1, 6)")
async def main():
    seed()
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        # make two accounts through the game's API: a moderator and a normal player
        await pg.goto(BASE + '/?api=' + BASE); await pg.wait_for_timeout(600)
        await pg.evaluate("fetch('/auth/v1/signup', {method:'POST', headers:{'Content-Type':'application/json', apikey:'k'}, body: JSON.stringify({email:'mod@x.com', password:'secret1'})})")
        await pg.evaluate("fetch('/auth/v1/signup', {method:'POST', headers:{'Content-Type':'application/json', apikey:'k'}, body: JSON.stringify({email:'pl@x.com', password:'secret1'})})")
        await pg.wait_for_timeout(300)
        uid = M.users['mod@x.com'][0]; q("insert into public.profiles (id, callsign) values (%s, 'MASON') on conflict (id) do update set callsign = 'MASON'", (uid,)); q("insert into public.admins (user_id) values (%s) on conflict do nothing", (uid,))
        q("update public.devices set user_id = %s where device = 'dev000003'", (uid,)); q("insert into public.events (device, kind, data) select 'dev000003', 'beat', jsonb_build_object('s', 'big', 'm', 900, 'sc', 'hub') ")
        pg2 = await ctx.new_page(); await pg2.goto(BASE + '/board.html?api=' + BASE); await pg2.wait_for_timeout(500)
        await pg2.fill('#em', 'pl@x.com'); await pg2.fill('#pw', 'secret1'); await pg2.click('button[type=submit]'); await pg2.wait_for_timeout(1200)
        ok('a normal player is turned away', 'not a moderator' in (await pg2.inner_text('#le')), await pg2.inner_text('#le'))
        await pg2.fill('#em', 'mod@x.com'); await pg2.fill('#pw', 'secret1'); await pg2.click('button[type=submit]')
        await pg2.wait_for_selector('text=Players per day', timeout=15000)
        await pg2.wait_for_timeout(500)
        t = await pg2.inner_text('#app')
        ok('board shows the headline numbers', 'Playing right now' in t and 'All-time players' in t, t[:400])
        ok('board shows planets and the moderator by name', 'DUSTMOOR' in t and 'MASON' in t, t[:2000])
        await pg2.screenshot(path=OUT + 'board_full.png', full_page=True)
        await pg2.set_viewport_size({'width': 390, 'height': 844}); await pg2.wait_for_timeout(300)
        await pg2.screenshot(path=OUT + 'board_phone.png', full_page=True)
        sw = await pg2.evaluate("document.documentElement.scrollWidth"); ok('no sideways scroll on a phone', sw <= 392, sw)
        await pg2.set_viewport_size({'width': 1280, 'height': 900})
        await pg2.click('[data-days="7"]'); await pg2.wait_for_selector('text=last 7 days', timeout=8000); ok('switching to 7 days reloads', True)
        await pg2.reload(); await pg2.wait_for_selector('text=Players per day', timeout=8000); ok('stays signed in after a reload', True)
        ok('no page errors', not errs, errs)
        await b.close()
    print('\nFAILURES:', fails)
asyncio.run(main())
