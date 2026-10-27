"""Co-op landings end to end: two players in real browser tabs against the mock Supabase. Invite, accept,
land on the same map, the guest sees and shoots the host's aliens, kills pay both, aliens chase either player,
and when one player leaves the other carries on."""
import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
from playwright.async_api import async_playwright
OUT = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/eaeb4748-0665-5d2a-83cf-34ae4d8c3f0d/scratchpad/shots/')
srv, M = MS.start(8127)
BASE = 'http://localhost:8127/?api=http://localhost:8127'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
async def boot(ctx, tag):
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(tag + ' ' + str(e)[:300]))
    await pg.goto(BASE + '&ns=' + tag.lower()); await pg.wait_for_timeout(700)
    await pg.mouse.click(480, 300); await pg.wait_for_timeout(120); await pg.mouse.click(480, 300); await pg.wait_for_timeout(800)
    await pg.evaluate("S.nameAsked = true; closeNameUI(); S.planet.landings = 3; S.planet.reached = 3; S.tutorial.planet = true; DAILY.shown = true; S.eq.weapon = S.eq.weapon || Object.keys(S.inv).find(id => getDef(id).cat === 'w')")
    return pg, errs
async def wait_for(pg, js, ms=10000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(120)
    return False
async def sign(pg, cs, em):
    await pg.evaluate(f"S.name = '{cs}'; netSignIn('{em}', 'secret1', true)"); return await wait_for(pg, f"NET.st === 'on' && NET.callsign === '{cs}'")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 960, 'height': 540})
        A, eA = await boot(ctx, 'A'); B, eB = await boot(ctx, 'B')
        ok('two players signed in', await sign(A, 'MASON', 'a@x.com') and await sign(B, 'KAI', 'b@x.com'))
        await A.evaluate("rpc('friend_request', { p_callsign: 'KAI' })"); await A.wait_for_timeout(300); await B.evaluate("rpc('friend_request', { p_callsign: 'MASON' })"); await B.wait_for_timeout(300)
        await A.evaluate("PULSE.t = -1e9"); ok('A sees KAI online', await wait_for(A, "PULSE.online && PULSE.online.has('KAI')", 12000))
        # ---- invite from the star map
        await A.evaluate("setScene('map'); MAP.init = false"); await A.wait_for_timeout(400); await A.evaluate("MAP.sel = 2; coopOpen(2)"); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT + 'coop_pick.png')
        await A.evaluate("coopInvite('KAI')"); ok('A is hosting', await wait_for(A, "COOP.st === 'hosting' && !!COOP.room", 6000))
        await B.evaluate("PULSE.t = -1e9"); ok('B gets the co-op popup', await wait_for(B, "PULSE.popup && PULSE.popup.kind === 'coop' && PULSE.popup.planet === 2", 12000), await B.evaluate("PULSE.popup"))
        await B.screenshot(path=OUT + 'coop_popup.png')
        await B.evaluate("coopAccept(PULSE.popup.id); PULSE.popup = null")
        ok('both are in the lobby', await wait_for(A, "!!COOP.partner && COOP.partner.cs === 'KAI'", 8000) and await wait_for(B, "!!COOP.partner && COOP.partner.cs === 'MASON'", 8000))
        await A.screenshot(path=OUT + 'coop_ready.png')
        # ---- launch together
        await A.evaluate("coopLaunch()")
        ok('A lands, B lands on the same map', await wait_for(B, "SCENE === 'planet' && RUN && RUN.coop === 'guest'", 8000) and await A.evaluate("RUN.coop") == 'host')
        sa, sb = await A.evaluate("[RUN.seed, RUN.pi, RUN.map.shipX, RUN.map.lair.x]"), await B.evaluate("[RUN.seed, RUN.pi, RUN.map.shipX, RUN.map.lair.x]")
        ok('same seed, planet, ship and lair', sa == sb, (sa, sb))
        # the host spawns aliens near both; the guest sees them as ghosts
        await A.evaluate("RUN.state = 'play'; for (let i = 0; i < 4; i++) spawnEnemy(RUN.w, 'crawler', RUN.w.player.x + 60 + i * 12, RUN.w.player.y + 10)")
        await B.evaluate("RUN.state = 'play'")
        ok("the guest sees the host's aliens", await wait_for(B, "RUN.w.ents.filter(e => e.ghost).length >= 4", 6000), await B.evaluate("RUN.w.ents.length"))
        ok('the host sees the guest walking around', await wait_for(A, "COOP.ally && Math.abs(COOP.ally.x - %s) < 40" % await B.evaluate("RUN.w.player.x"), 5000))
        # the guest shoots one: the host's alien loses that health
        cid, hp0 = await B.evaluate("(() => { const g = RUN.w.ents.find(e => e.ghost); return [g.cid, g.hp]; })()")
        await B.evaluate(f"(() => {{ const g = RUN.w.ents.find(e => e.cid === {cid}); damageEnemy(RUN.w, g, g.maxHp * 0.4, {{}}); }})()")
        ok("the guest's damage reaches the host", await wait_for(A, f"(() => {{ const e = RUN.w.ents.find(x => x.cid === {cid}); return e && e.hp < e.maxHp * 0.7; }})()", 4000))
        coins0 = await B.evaluate("RUN.coins")
        await A.evaluate(f"(() => {{ const e = RUN.w.ents.find(x => x.cid === {cid}); damageEnemy(RUN.w, e, 1e9, {{}}); }})()")
        ok('a kill pays the guest too', await wait_for(B, f"RUN.coins > {coins0} && !RUN.w.ents.some(e => e.cid === {cid})", 4000), await B.evaluate("[RUN.coins, RUN.kills]"))
        ok('and the host', await A.evaluate("RUN.kills") >= 1)
        # aliens chase whoever is closest: move the guest next to one far from the host
        await A.evaluate("(() => { const e = spawnEnemy(RUN.w, 'crawler', RUN.w.player.x + 300, RUN.w.player.y); e.cid = 9999; RUN.w.cidSeq = Math.max(RUN.w.cidSeq || 0, 9999); window.__far = e; })()")
        await B.evaluate("(() => { const pl = RUN.w.player; pl.x = RUN.map.shipX + 330; pl.y = RUN.map.shipY + 26; })()")
        await A.wait_for_timeout(1500)
        d = await A.evaluate("(() => { const e = window.__far, a = COOP.ally; return [Math.round(Math.hypot(e.x - a.x, e.y - a.y)), Math.round(Math.hypot(e.x - RUN.w.player.x, e.y - RUN.w.player.y))]; })()")
        ok('an alien goes after the guest when the guest is closer', d[0] < d[1], d)
        # the guest gets hurt by the ghost touching them
        hp_b = await B.evaluate("RUN.w.player.hp")
        await B.evaluate("(() => { const g = RUN.w.ents.find(e => e.ghost); if (g) { RUN.w.player.inv = 0; RUN.w.player.x = g.x; RUN.w.player.y = g.y; } })()"); await B.wait_for_timeout(300)
        ok('touching an alien hurts the guest on their own screen', await B.evaluate("RUN.w.player.hp") < hp_b, [hp_b, await B.evaluate("RUN.w.player.hp")])
        await A.screenshot(path=OUT + 'coop_host.png'); await B.screenshot(path=OUT + 'coop_guest.png')
        # boss: the host spawns it when the guest walks into the lair
        await B.evaluate("(() => { const pl = RUN.w.player; pl.x = RUN.map.lair.x + 30; pl.y = RUN.map.lair.y + 30; pl.inv = 99; })()")
        ok('the guest walking into the lair wakes the boss on the host', await wait_for(A, "!!RUN.w.boss", 6000))
        ok('the guest sees the boss', await wait_for(B, "!!RUN.w.boss && RUN.w.boss.ghost", 6000))
        await B.screenshot(path=OUT + 'coop_boss.png')
        await A.evaluate("damageEnemy(RUN.w, RUN.w.boss, 1e12, {})")
        ok('beating the boss together pays the guest arsenal crates', await wait_for(B, "RUN.bossBeaten && RUN.crates.length >= 1", 6000), await B.evaluate("[RUN.bossBeaten, RUN.crates.length]"))
        # the host leaves: the guest keeps playing with real aliens
        await A.evaluate("(() => { const e = spawnEnemy(RUN.w, 'brute', RUN.map.lair.x, RUN.map.lair.y + 50); })()"); await A.wait_for_timeout(500)
        await A.evaluate("RUN.state = 'leave'; RUN.st = 99"); await A.wait_for_timeout(600)
        ok('host finishes normally', await wait_for(A, "SCENE === 'results'", 5000))
        ok('the guest carries on alone with real aliens', await wait_for(B, "RUN && !RUN.coop && RUN.w.ents.every(e => !e.ghost)", 15000), await B.evaluate("[RUN && RUN.coop, RUN && RUN.w.ents.map(e => e.ghost)]"))
        ok('the guest is still playing', await B.evaluate("SCENE") == 'planet')
        errs = eA + eB; ok('no page errors', not errs, errs[:5])
        ok('no game errors', not await A.evaluate("ERR && String(ERR.message)") and not await B.evaluate("ERR && String(ERR.message)"), [await A.evaluate("ERR && String(ERR.stack)"), await B.evaluate("ERR && String(ERR.stack)")])
        await b.close()
    print('\nFAILURES:', fails); srv.shutdown()
asyncio.run(main())
