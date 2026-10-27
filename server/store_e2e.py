"""End-to-end for the store in a real browser against the mock Supabase: buying Stardust through checkout
(the webhook is imitated with grant_purchase), the season pass, the shop, coin packs, the supporter plate,
store items staying untradeable, clickable profiles, bug reports, crash logs and analytics."""
import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
import psycopg2
from playwright.async_api import async_playwright
OUT = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/eaeb4748-0665-5d2a-83cf-34ae4d8c3f0d/scratchpad/shots/')
srv, M = MS.start(8126)
BASE = 'http://localhost:8126/?api=http://localhost:8126'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
def q(sql, a=()):
    with psycopg2.connect(dbname=M.dbname, **MS.DSN) as cn: c = cn.cursor(); c.execute(sql, a); return c.fetchall() if c.description else None
async def boot(ctx, tag):
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(tag + ' ' + str(e)[:300]))
    await pg.goto(BASE + '&ns=' + tag.lower()); await pg.wait_for_timeout(700)
    await pg.mouse.click(480, 300); await pg.wait_for_timeout(120); await pg.mouse.click(480, 300); await pg.wait_for_timeout(800)
    await pg.evaluate("S.nameAsked = true; closeNameUI(); S.planet.landings = 2; S.planet.reached = 5; S.tutorial.planet = true")
    return pg, errs
async def wait_for(pg, js, ms=10000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(120)
    return False
async def sign(pg, cs, em):
    await pg.evaluate(f"S.name = '{cs}'; netSignIn('{em}', 'secret1', true)"); return await wait_for(pg, f"NET.st === 'on' && NET.callsign === '{cs}'")
def fake_webhook(product):
    sid, uid, prod = [c for c in M.checkouts if c[2] == product][-1]
    return q("select public.grant_purchase(%s, %s, %s, %s)", (sid, uid, prod, 499))[0][0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 960, 'height': 540})
        A, eA = await boot(ctx, 'A'); B, eB = await boot(ctx, 'B')
        ok('two players signed in', await sign(A, 'MASON', 'a@x.com') and await sign(B, 'KAI', 'b@x.com'))
        await A.evaluate("HUB.panel = null; openStation('store')")
        ok('the store loads from the server', await wait_for(A, "!!STORE.p && STORE.p.sd === 0"))
        # ---- buy stardust: checkout opens, the webhook pays out, the game notices
        await A.evaluate("HUB.ps.store.tab = 2"); await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'st_dust.png')
        await A.mouse.click(2 * (14 + 1 * 114 + 54), 2 * (64 + 104 - 15)); await A.wait_for_timeout(800)
        ok('BUY $4.99 asks the server for a checkout', any(c[2] == 'sd_500' for c in getattr(M, 'checkouts', [])), getattr(M, 'checkouts', None))
        ok('the webhook grants it', fake_webhook('sd_500') == 'granted')
        ok('the game sees 500 stardust without a reload', await wait_for(A, "STORE.p && STORE.p.sd === 500", 15000), await A.evaluate("STORE.p && STORE.p.sd"))
        # ---- the pass with stardust, then claim tiers
        await A.evaluate("HUB.ps.store.tab = 0"); await A.wait_for_timeout(200)
        await A.evaluate("storeSpend('pass', 'frostfall', 'ok')"); ok('pass bought with 500 stardust', await wait_for(A, "ownsPass() && STORE.p.sd === 0"))
        await A.evaluate("passXP(3600)"); ok('pass xp: tier 3', await A.evaluate("passTier()") == 3)
        await A.screenshot(path=OUT + 'st_pass.png')
        await A.evaluate("claimAll()"); ok('claim all: 6 tiers claimed', await wait_for(A, "claimedSet('f').size === 3 && claimedSet('p').size === 3"))
        ok('premium tier 2 paid 50 stardust', await A.evaluate("STORE.p.sd") == 50)
        await A.evaluate("netClaimMail && netClaimMail()") if await A.evaluate("typeof netClaimMail === 'function'") else await A.evaluate("rpc('claim_mail').then(r => { if (r.data) { netApplyRemote ? netApplyRemote(r) : null; } })")
        ok("SANTA'S HAT arrives in the locker", await wait_for(A, "!!S.inv['c|headgear|6000']", 15000), await A.evaluate("Object.keys(S.inv).filter(isPremiumId)"))
        # ---- store items stay with you
        r = await A.evaluate("rpc('market_list', { p_item: 'c|headgear|6000', p_price: 100 }).then(() => 'listed').catch(e => e.message)")
        ok('store items cannot go on the market', 'CANNOT BE TRADED' in r, r)
        ok('or show up to sell in the market list', await A.evaluate("Object.keys(S.inv).filter(id => netValid(id) && !isPremiumId(id)).includes('c|headgear|6000')") is False)
        ok('or be fused', await A.evaluate("fusable('c|headgear|6000')") is False)
        # ---- the shop
        await A.evaluate("HUB.ps.store.tab = 1"); await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'st_shop.png')
        cheap = await A.evaluate("STORE.p.shop.slice().sort((a, b) => a[1] - b[1])[0]")
        q("update public.premium set stardust = stardust + 2000 where user_id = (select id from public.profiles where callsign = 'MASON')"); await A.evaluate("STORE.t = -1e9; storeRefresh(true)"); await wait_for(A, "STORE.p.sd >= 2000")
        await A.evaluate(f"storeSpend('item', '{cheap[0]}', 'ok')"); ok('bought a featured cosmetic', await wait_for(A, f"STORE.p.owned.includes('{cheap[0]}')"))
        await A.evaluate("storeSpend('coins', 'c1', 'ok')"); ok('coin pack: 100 stardust', await wait_for(A, f"STORE.p.sd === {50 + 2000 - cheap[1] - 100}"), await A.evaluate("STORE.p.sd"))
        # ---- supporter plate, seen by someone else
        await A.evaluate("checkout('supporter')"); await A.wait_for_timeout(600); ok('supporter checkout + webhook', fake_webhook('supporter') == 'granted')
        ok('A is a supporter', await wait_for(A, "hasSupporter()", 15000))
        await B.evaluate("openProfile('MASON')"); ok('B opens MASON from a name and sees the plate', await wait_for(B, "NET.viewProf === 'MASON' && NET.prof.MASON && NET.prof.MASON.p && NET.prof.MASON.p.plate === true"))
        await B.wait_for_timeout(400); await B.screenshot(path=OUT + 'st_profile.png')
        await B.keyboard.press('Escape'); ok('the profile closes with ESC', await wait_for(B, "!NET.viewProf", 3000))
        # ---- clickable leaderboard names
        q("insert into public.arena_stats (user_id, trophies, kills) select id, 120, 30 from public.profiles where callsign = 'MASON' on conflict (user_id) do update set trophies = 120, kills = 30")
        await B.evaluate("HUB.panel = null; openStation('arena'); HUB.ps.arena.tab = 2"); await B.wait_for_timeout(1500)
        await B.screenshot(path=OUT + 'st_ranks.png')
        await B.mouse.click(2 * (14 + 24 + 8), 2 * (58 + 22 + 3)); ok('clicking a name on the leaderboard opens the profile', await wait_for(B, "NET.viewProf === 'MASON'", 4000), await B.evaluate("[NET.viewProf, ARL.lb.trophies && ARL.lb.trophies.top.map(r => r.callsign)]"))
        await B.evaluate("NET.viewProf = null")
        # ---- bug reports, crash logs and analytics
        await A.evaluate("HUB.panel = null; openStation('settings'); openBugReport()"); await A.wait_for_timeout(300)
        await A.evaluate("setField('bugNote', 'THE BOSS GOT STUCK IN A WALL')"); await A.wait_for_timeout(100)
        await A.screenshot(path=OUT + 'st_bug.png')
        await A.mouse.click(2 * (70 + 60), 2 * (50 + 160 - 19)); ok('bug report reaches the server', await wait_for(A, "!BUG.open", 5000) and len(q("select * from public.bugs")) == 1, q("select note from public.bugs"))
        await A.evaluate("logCrash(new Error('TEST BOOM'))"); await A.wait_for_timeout(600)
        ok('crashes are logged', len(q("select * from public.crash_log where message = 'TEST BOOM'")) == 1)
        await A.evaluate("track('first', { what: 'crate' }); metaFlush()"); await A.wait_for_timeout(800)
        ok('analytics: sessions and events arrive', len(q("select * from public.events where kind = 'session'")) >= 2 and len(q("select * from public.events where kind = 'first'")) >= 1, q("select kind, count(*) from public.events group by kind"))
        q("insert into public.admins select id from public.profiles where callsign = 'MASON'")
        await A.evaluate("PULSE.admin = true; HUB.panel = null; openStation('social'); HUB.ps.social.tab = 6"); ok('moderator stats load', await wait_for(A, "!!ADM.d && ADM.d.days.length === 14", 8000), await A.evaluate("ADM.err"))
        await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'st_stats.png')
        await A.evaluate("HUB.ps.social.sv = 1"); await A.wait_for_timeout(300); ok('money shows the purchases', await A.evaluate("ADM.d.money.cents") == 998, await A.evaluate("ADM.d.money")); await A.screenshot(path=OUT + 'st_money.png')
        errs = eA + eB; ok('no page errors', not errs, errs[:5])
        ok('no game errors', not await A.evaluate("ERR && String(ERR.message)") and not await B.evaluate("ERR && String(ERR.message)"), [await A.evaluate("ERR && String(ERR.stack)"), await B.evaluate("ERR && String(ERR.stack)")])
        await b.close()
    print('\nFAILURES:', fails); srv.shutdown()
asyncio.run(main())
