"""End-to-end: three browser 'devices', two accounts, against the local mock Supabase.
Sign up through the real form, cloud migration, callsigns, friends, crews, a full trade with
escrow + mailbox, two-device conflict, sign out / in. Screenshots go to the scratchpad."""
import asyncio, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
import psycopg2
from playwright.async_api import async_playwright

OUT = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/eaeb4748-0665-5d2a-83cf-34ae4d8c3f0d/scratchpad/shots/')
srv, M = MS.start()
BASE = 'http://localhost:8123/?api=http://localhost:8123'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
def q(sql, args=()):
    with psycopg2.connect(dbname=M.dbname, **MS.DSN) as cn:
        c = cn.cursor(); c.execute(sql, args); return c.fetchall()

async def boot(ctx, seed=None, tag=''):
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(tag + ' PAGEERR ' + str(e)[:300]))
    pg.on('console', lambda m: errs.append(tag + ' CONSOLE ' + m.text[:300]) if m.type == 'error' else None)
    await pg.goto(BASE); await pg.wait_for_timeout(900)
    await pg.mouse.click(480, 300); await pg.wait_for_timeout(500)
    if seed: await pg.evaluate(seed)
    return pg, errs
async def wait_for(pg, js, ms=8000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(100)
    return False
async def gclick(pg, x, y): await pg.mouse.click(x * 2, y * 2); await pg.wait_for_timeout(250)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        cA = await b.new_context(viewport={'width': 960, 'height': 540})
        cB = await b.new_context(viewport={'width': 960, 'height': 540})
        cA2 = await b.new_context(viewport={'width': 960, 'height': 540})
        # ---- A: has offline progress, signs up through the form
        A, eA = await boot(cA, "S.name='MASON'; S.nameAsked=true; S.coins=4000; S.lvl=5; S.stats.crates=12; addItem('w|rifle|7'); addItem('b|backdrop|3'); closeNameUI(); save()", 'A')
        await A.screenshot(path=OUT + 'n1_hub_pill.png')
        await A.evaluate("openStation('social')"); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT + 'n2_signin.png')
        await A.get_by_label('Email').fill('Mason@Example.com'); await A.get_by_label('Password').fill('secret1')
        await gclick(A, 302, 153)  # CREATE ACCOUNT
        ok('A signs up via form', await wait_for(A, "NET.st === 'on'"), await A.evaluate('NET.err'))
        r = q("select s.data->'coins', p.callsign, s.version from public.saves s join public.profiles p on p.id = s.user_id")
        ok('A offline progress moved to cloud with callsign', r and float(r[0][0]) == 4000 and r[0][1] == 'MASON', r)
        await A.wait_for_timeout(400); await A.screenshot(path=OUT + 'n3_friends_empty.png')
        # wrong password message
        cX = await b.new_context(viewport={'width': 960, 'height': 540}); X, eX = await boot(cX, "S.nameAsked=true; closeNameUI()", 'X')
        msg = await X.evaluate("netSignIn('mason@example.com', 'wrongpw', false).then(() => 'ok').catch(e => e.message)")
        ok('wrong password is explained', 'INVALID LOGIN' in msg, msg)
        msg = await X.evaluate("netSignIn('mason@example.com', 'secret1', true).then(() => 'ok').catch(e => e.message)")
        ok('duplicate sign up is explained', 'ALREADY REGISTERED' in msg, msg)
        await cX.close()
        # ---- B: brand new player picks a callsign on the prompt, then signs up
        B, eB = await boot(cB, None, 'B'); await B.wait_for_timeout(700)
        ok('B gets callsign prompt', await B.evaluate('NAMEUI.open'))
        await B.keyboard.type('kai 7'); await B.keyboard.press('Enter'); await B.wait_for_timeout(300)
        ok('B local callsign', await B.evaluate("S.name") == 'KAI 7')
        await B.evaluate("netSignIn('kai@example.com', 'secret2', true)")
        ok('B online with callsign', await wait_for(B, "NET.st === 'on' && NET.callsign === 'KAI 7'"), await B.evaluate('[NET.st, NET.callsign, NET.err]'))
        # ---- friends: B adds MASON through the panel field + Enter
        await B.evaluate("openStation('social')"); await B.wait_for_timeout(500)
        await B.get_by_label('Friend callsign').fill('mason'); await B.get_by_label('Friend callsign').press('Enter')
        ok('B friend request stored', await wait_for(B, "!!(NET.social && NET.social.outgoing.length)"), q('select status from public.friendships'))
        await B.screenshot(path=OUT + 'n4_b_sent.png')
        await A.evaluate("NET.socialT = -1e9"); await wait_for(A, "!!(NET.social && NET.social.incoming.length)")
        await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'n5_a_incoming.png')
        await gclick(A, 167, 66)  # YES
        ok('A accepts friend', await wait_for(A, "!!(NET.social && NET.social.friends.length === 1)"), q('select status from public.friendships'))
        await gclick(A, 60, 66); await wait_for(A, "!!(NET.prof['KAI 7'] && NET.prof['KAI 7'].p)"); await A.wait_for_timeout(400)
        await A.screenshot(path=OUT + 'n6_a_profile.png')
        # ---- crew: A creates through the form, B joins
        await A.evaluate("HUB.ps.social.tab = 1"); await A.wait_for_timeout(300)
        await A.get_by_label('Crew name').fill('Star Pirates'); await A.get_by_label('Crew tag').fill('sp')
        await A.wait_for_timeout(150); await gclick(A, 166, 77)
        ok('A created crew', await wait_for(A, "!!(NET.social && NET.social.crew)"), await A.evaluate('NET.err'))
        crew = q('select id from public.crews')[0][0]
        await B.evaluate(f"rpc('crew_join', {{ p_crew: '{crew}' }}).then(() => {{ NET.socialT = -1e9; }})")
        ok('B joined crew', await wait_for(B, "!!(NET.social && NET.social.crew && NET.social.crew.members.length === 2)"))
        await A.evaluate("NET.socialT = -1e9"); await wait_for(A, "NET.social.crew.members.length === 2"); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT + 'n7_crew.png')
        # ---- trade: B offers 150 coins for A's rifle, using the builder
        await B.evaluate("HUB.ps.social.tab = 2; tradeStart(HUB.ps.social, 'MASON')")
        ok('B sees A tradeable items', await wait_for(B, "!!(NET.tinv['MASON'] && NET.tinv['MASON'].inv && NET.tinv['MASON'].inv['w|rifle|7'])"), await B.evaluate("JSON.stringify(NET.tinv)"))
        await B.evaluate("HUB.ps.social.build.want.push('w|rifle|7')"); await B.wait_for_timeout(200)
        await B.get_by_label('Coins you give').fill('150'); await B.get_by_label('Trade note').fill('nice rifle'); await B.wait_for_timeout(200)
        b_coins = await B.evaluate('S.coins')
        await B.screenshot(path=OUT + 'n8_builder.png')
        await gclick(B, 405, 237)
        ok('B offer sent, coins held in escrow', await wait_for(B, f"S.coins === {b_coins} - 150 && !HUB.ps.social.build"), [await B.evaluate('S.coins'), await B.evaluate('NET.err'), q("select status, give_coins from public.trades")])
        await A.evaluate("HUB.ps.social.tab = 2; NET.socialT = -1e9"); await wait_for(A, "NET.social.trades.length === 1")
        await A.wait_for_timeout(300); await gclick(A, 60, 66); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT + 'n9_offer.png')
        a_coins = await A.evaluate('S.coins')
        await gclick(A, 275, 243); await gclick(A, 275, 243)  # ACCEPT, CONFIRM
        ok('A accepted: rifle gone, coins in', await wait_for(A, f"!S.inv['w|rifle|7'] && S.coins === {a_coins} + 150"), [await A.evaluate('S.coins'), await A.evaluate('NET.err')])
        await B.evaluate("NET.socialT = -1e9")
        ok('B mailbox delivers rifle', await wait_for(B, "!!S.inv['w|rifle|7'] && !!S.fresh['w|rifle|7']", 12000), await B.evaluate("[NET.mail, NET.err, Object.keys(S.inv).length]"))
        tot = q("select sum((data->>'coins')::numeric) from public.saves")[0][0]
        ok('no coins created or lost', float(tot) == a_coins + b_coins, (tot, a_coins, b_coins))
        await B.evaluate("HUB.panel = null"); await B.wait_for_timeout(1500); await B.screenshot(path=OUT + 'n10_b_toast.png')
        # ---- second device for A
        A2, eA2 = await boot(cA2, "S.nameAsked=true; closeNameUI()", 'A2')
        await A2.evaluate("netSignIn('mason@example.com', 'secret1', false)")
        ok('new device loads cloud save', await wait_for(A2, f"NET.st === 'on' && S.coins === {a_coins} + 150 && !S.inv['w|rifle|7']"), await A2.evaluate("[NET.st, S.coins, NET.err]"))
        await A2.evaluate("S.coins += 1000; netSync(true)"); await A2.wait_for_timeout(600)
        await A.evaluate("HUB.panel = null; S.coins += 5; netSync(true)")
        ok('old device gets the two-saves choice', await wait_for(A, "!!NET.choice"), await A.evaluate("[NET.err, !!NET.pending]"))
        await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'n11_choice.png')
        await gclick(A, 316, 183)  # USE ACCOUNT SAVE
        ok('picked account save', await wait_for(A, f"!NET.choice && S.coins === {a_coins} + 1150"), await A.evaluate('S.coins'))
        # ---- sign out and back in
        await A.evaluate("netSignOut()"); await A.wait_for_timeout(500)
        ok('signed out', await A.evaluate("NET.st === 'off' && !localStorage.getItem('spacecase.auth.v1')"))
        await A.evaluate("netSignIn('mason@example.com', 'secret1', false)")
        ok('signed back in, same save', await wait_for(A, f"NET.st === 'on' && !NET.choice && S.coins === {a_coins} + 1150"), await A.evaluate("[NET.st, !!NET.choice, S.coins]"))
        # ---- reload keeps the session
        await A.reload(); await A.wait_for_timeout(900); await A.mouse.click(480, 300)
        ok('session survives reload', await wait_for(A, "NET.st === 'on' && NET.callsign === 'MASON'"), await A.evaluate("[NET.st, NET.err]"))
        await A.evaluate("openStation('social'); HUB.ps.social.tab = 3"); await A.wait_for_timeout(500); await A.screenshot(path=OUT + 'n12_account.png')
        errs = eA + eB + eA2
        ok('no page errors', not errs, errs[:5])
        print('rpc calls:', len(M.calls))
        await b.close()
    print('\nFAILURES:', fails)
asyncio.run(main())
srv.shutdown()
sys.exit(1 if fails else 0)
