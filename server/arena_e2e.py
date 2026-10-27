"""Arena end-to-end against the local mock Supabase, with tabs talking over BroadcastChannel:
practice modes, a shared FFA server with two real players + AI pilots, kill credit, rewards,
host hand-over, a ranked 1v1 between two players, and a ranked duel against an AI pilot."""
import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
import psycopg2
from playwright.async_api import async_playwright
OUT = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/eaeb4748-0665-5d2a-83cf-34ae4d8c3f0d/scratchpad/shots/')
srv, M = MS.start(8124)
BASE = 'http://localhost:8124/?api=http://localhost:8124'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
def q(sql, a=()):
    with psycopg2.connect(dbname=M.dbname, **MS.DSN) as cn: c = cn.cursor(); c.execute(sql, a); return c.fetchall() if c.description else None
async def boot(ctx, tag):
    pg = await ctx.new_page(); errs = []; pg.tag = tag
    pg.on('pageerror', lambda e: errs.append(tag + ' ' + str(e)[:300]))
    await pg.goto(BASE + '&ns=' + tag.lower()); await pg.wait_for_timeout(900); await pg.mouse.click(480, 300); await pg.wait_for_timeout(120); await pg.mouse.click(480, 300); await pg.wait_for_timeout(650); await pg.wait_for_timeout(300)
    await pg.evaluate("S.nameAsked = true; closeNameUI()")
    return pg, errs
async def wait_for(pg, js, ms=10000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(120)
    return False
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 960, 'height': 540})  # one browser profile: BroadcastChannel reaches all tabs
        A, eA = await boot(ctx, 'A')
        # ---- practice works with no account
        await A.evaluate("addItem('w|shotgun|4'); S.eq.weapon = 'w|shotgun|4'; arPractice('ffa')"); await A.wait_for_timeout(300)
        ok('the arena uses your equipped weapon', await A.evaluate("AM.me.wpn.cls") == 'shotgun', await A.evaluate("AM.me.wpn.cls"))
        await A.keyboard.press('KeyQ'); await A.wait_for_timeout(100)
        ok('no custom loadout: Q keeps the same weapon', await A.evaluate("AM.me.wpn.cls") == 'shotgun')
        await A.screenshot(path=OUT + 'ar0_slots.png')
        nf = await A.evaluate("AM.fighters.size")
        ok("practice FFA: you + 1-5 AI pilots", 2 <= nf <= 6, nf)
        await A.mouse.move(700, 270); await A.mouse.down()
        for i in range(30):
            await A.keyboard.down(['KeyW', 'KeyD', 'KeyS', 'KeyA'][i % 4]); await A.wait_for_timeout(150); await A.keyboard.up(['KeyW', 'KeyD', 'KeyS', 'KeyA'][i % 4])
            await A.evaluate("AM.me.hp = AM.me.maxHp")
        await A.mouse.up()
        await A.evaluate("(() => { const b = [...AM.fighters.values()].find(f => f.bot && f.alive); b.inv = 0; arTakeDmg(b, 9999, AM.me.id); })()"); await A.wait_for_timeout(250)
        ok('my kill: eliminated pop, slow-mo, hit marker', await A.evaluate("!!AM.killPop && AM.hitT > 0"), await A.evaluate("[!!AM.killPop, AM.hitT]"))
        await A.screenshot(path=OUT + 'ar1b_kill.png')
        kills = await A.evaluate("[...AM.fighters.values()].reduce((a, f) => a + f.kills, 0)")
        ok('AI pilots fight and score kills', kills > 0, kills)
        await A.screenshot(path=OUT + 'ar1_practice.png')
        await A.keyboard.down('Tab'); await A.wait_for_timeout(200); await A.screenshot(path=OUT + 'ar2_scores.png'); await A.keyboard.up('Tab')
        await A.evaluate("arLeave(true)"); await A.wait_for_timeout(200)
        await A.evaluate("arPractice('duel')"); await A.wait_for_timeout(3500)
        await A.evaluate("(() => { const bot = [...AM.fighters.values()].find(f => f.bot); for (let i = 0; i < 5; i++) { arDie(bot, AM.me.id, false); bot.alive = true; } })()")
        ok('practice duel ends at 5 kills', await wait_for(A, "AM && AM.ended && AM.result.won"))
        await A.wait_for_timeout(1200); await A.screenshot(path=OUT + 'ar3_duel_end.png')
        await A.evaluate("arLeave(true)")
        # ---- accounts
        await A.evaluate("S.name = 'MASON'; netSignIn('a@x.com', 'secret1', true)"); await wait_for(A, "NET.st === 'on' && NET.callsign === 'MASON'")
        B, eB = await boot(ctx, 'B')
        await B.evaluate("S.name = 'KAI'; netSignIn('b@x.com', 'secret2', true)"); await wait_for(B, "NET.st === 'on' && NET.callsign === 'KAI'")
        await A.evaluate("openStation('arena')"); await wait_for(A, "!!(ARL.list && ARL.me)"); await A.wait_for_timeout(400)
        await A.screenshot(path=OUT + 'ar4_lobby.png')
        # ---- shared FFA server
        await A.evaluate("arJoinServer('alpha')"); await wait_for(A, "SCENE === 'arena' && AM && AM.room")
        await B.evaluate("arJoinServer('alpha')"); await wait_for(B, "SCENE === 'arena' && AM && AM.room")
        ok('both see each other + 1-5 AI pilots', await wait_for(A, "AM.humans === 2 && AM.fighters.size >= 3 && AM.fighters.size <= 7") and await wait_for(B, "AM.fighters.size >= 3 && AM.fighters.size === %d && !AM.host" % (await A.evaluate("AM.fighters.size"))), [await A.evaluate("[AM.humans, AM.fighters.size, AM.host]"), await B.evaluate("[AM.humans, AM.fighters.size, AM.host]")])
        ok('B sees the same AI pilots as host A', await wait_for(B, "(() => { const ids = [...AM.fighters.values()].filter(f => f.bot).map(f => f.id).sort().join(); return ids.length > 0 && ids === window.__hostBots; })()" .replace('window.__hostBots', repr(await A.evaluate("[...AM.fighters.values()].filter(f => f.bot).map(f => f.id).sort().join()")))))
        ok('B sees A moving', await wait_for(B, "(() => { const a = [...AM.fighters.values()].find(f => f.human && !f.local); return a && a.x > 0 && a.cs === 'MASON'; })()"))
        await B.screenshot(path=OUT + 'ar5_ffa_B.png')
        # A gets hit by B until down: kill credit goes to B (decided on A's side)
        bid = await B.evaluate("AM.me.id")
        await A.evaluate(f"(() => {{ arRespawn(AM.me); AM.me.inv = 0; arTakeDmg(AM.me, 9999, '{bid}'); }})()")
        ok('B credited with the kill of a real player', await wait_for(B, "AM.me.kills === 1 && AM.rk === 1 && AM.rhk === 1"), await B.evaluate("[AM.me.kills, AM.rk, AM.rhk]"))
        # B shoots a bot down: host A decides it
        bot = await A.evaluate("[...AM.fighters.values()].find(f => f.bot && f.alive).id")
        await A.evaluate(f"(() => {{ const b = AM.fighters.get('{bot}'); b.inv = 0; arTakeDmg(b, 9999, '{bid}'); }})()")
        ok('host gives B credit for an AI kill', await wait_for(B, "AM.me.kills === 2 && AM.rk === 2"), [await B.evaluate("[AM.me.kills, AM.rk]"), await B.evaluate(f"(() => {{ const v = AM.fighters.get('{bot}'); return v ? [v.alive, v.deaths, v.cs] : 'missing'; }})()"), await A.evaluate(f"(() => {{ const v = AM.fighters.get('{bot}'); return v ? [v.alive, v.deaths, v.cs, AM.host] : 'missing'; }})()")])
        q("update public.arena_presence set reported_at = now() - interval '30 seconds'")
        await B.evaluate("arReport(false)")
        ok('kills paid: coins + trophies + mailbox', await wait_for(B, "!!(NET.arena && NET.arena.trophies === 4)", 6000), [q("select kills, trophies from public.arena_stats"), q("select coins, reason from public.deliveries")])
        # host leaves: B takes over the AI pilots
        await A.evaluate("arLeave(true)")
        ok('B becomes host and keeps the AI pilots', await wait_for(B, "AM.host && AM.humans === 1 && AM.fighters.size >= 2 && AM.fighters.size <= 6", 9000), await B.evaluate("[AM.host, AM.humans, AM.fighters.size]"))
        await B.wait_for_timeout(1500)
        ok('taken-over AI keeps fighting', await B.evaluate("(() => { const b = [...AM.fighters.values()].filter(f => f.bot); return b.length > 0 && b.every(f => f.ai); })()"), await B.evaluate("[...AM.fighters.values()].filter(f => f.bot).map(f => !!f.ai)"))
        await B.evaluate("arLeave(true)"); await B.wait_for_timeout(500)
        ok('presence cleared after leaving', q("select count(*) from public.arena_presence")[0][0] == 0)
        # ---- ranked 1v1 between two real players
        await A.evaluate("duelSearch(true)"); await A.wait_for_timeout(1700)
        await B.evaluate("duelSearch(true)")
        ok('both matched into the same duel', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel'", 12000) and await wait_for(B, "SCENE === 'arena' && AM && AM.mode === 'duel'", 12000), [await A.evaluate("[SCENE, DQ.on]"), await B.evaluate("[SCENE, DQ.on]")])
        ok('same match id, A hosts', await A.evaluate("AM.matchId") == await B.evaluate("AM.matchId") and await A.evaluate("AM.host") and not await B.evaluate("AM.host"))
        ok('duel players see each other', await wait_for(A, "[...AM.fighters.values()].some(f => !f.local && f.cs === 'KAI' && f.x > 0)") and await wait_for(B, "[...AM.fighters.values()].some(f => !f.local && f.cs === 'MASON')"))
        await A.wait_for_timeout(3200)
        await A.screenshot(path=OUT + 'ar6_duel_live.png')
        aid = await A.evaluate("AM.me.id")
        for i in range(5):
            await B.evaluate(f"(() => {{ AM.me.inv = 0; arTakeDmg(AM.me, 9999, '{aid}'); }})()"); await B.wait_for_timeout(450)
            await B.evaluate("arRespawn(AM.me)")
        ok('A wins 5-0 on both screens', await wait_for(A, "AM.ended && AM.result.won", 8000) and await wait_for(B, "AM.ended && !AM.result.won", 8000), [await A.evaluate("[AM.me.kills, AM.ended]"), await B.evaluate("[AM.me.deaths, AM.ended]")])
        ok('ranked result saved: A +30', await wait_for(A, "!!(AM.result.r && AM.result.r.trophy_change === 30)", 12000), await A.evaluate("JSON.stringify(AM.result)"))
        await A.screenshot(path=OUT + 'ar7_victory.png')
        await A.evaluate("arLeave(true)"); await B.evaluate("arLeave(true)")
        # ---- ranked and unranked searchers still meet
        await A.evaluate("duelSearch(true)"); await A.wait_for_timeout(1500); await B.evaluate("duelSearch(false)")
        ok('ranked meets unranked after a few seconds', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel' && !AM.vsAI", 15000) and await wait_for(B, "SCENE === 'arena' && AM && AM.mode === 'duel'", 15000), [await A.evaluate("[SCENE, DQ.on]"), await B.evaluate("[SCENE, DQ.on]")])
        ok('cross-mode match is unranked', await A.evaluate("AM.ranked") is False and await A.evaluate("AM.matchId") == await B.evaluate("AM.matchId"))
        await A.evaluate("arLeave(true)"); await B.evaluate("arLeave(true)"); await A.wait_for_timeout(400)
        # ---- friends with a code; then one closes the game mid-match and an AI takes over
        await B.evaluate("duelSearch(true)"); await A.evaluate("duelSearch(false, 'PALS')"); await A.wait_for_timeout(3000)
        ok('a code search ignores public searchers', await A.evaluate("DQ.on && !DQ.found") and await B.evaluate("DQ.on && !DQ.found"), [await A.evaluate("[DQ.on, !!DQ.found]"), await B.evaluate("[DQ.on, !!DQ.found]")])
        await B.evaluate("duelCancel()"); await B.wait_for_timeout(300)
        await B.evaluate("openStation('arena'); HUB.ps.arena.tab = 1"); await B.wait_for_timeout(200); await B.screenshot(path=OUT + 'ar5b_duel_tab.png')
        await B.evaluate("duelSearch(false, 'pals')")
        ok('same code: friends matched', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel' && !AM.vsAI", 12000) and await wait_for(B, "SCENE === 'arena' && AM && AM.mode === 'duel'", 12000))
        await wait_for(A, "[...AM.fighters.values()].some(f => !f.local && f.human)")
        await B.evaluate("AM.room.leave(); AM = null; goHub()")
        ok('opponent closed the game: the duel ends and you win', await wait_for(A, "AM && AM.ended && AM.result.won && AM.result.left && !AM.vsAI", 26000), await A.evaluate("JSON.stringify(AM && [AM.t, AM.oppSeenT, AM.result])"))
        ok('the forfeit win is saved', await wait_for(A, "!!(AM.result.r && AM.result.r.done && AM.result.r.won && AM.result.r.coins > 0)", 8000), await A.evaluate("JSON.stringify(AM && AM.result)"))
        await A.wait_for_timeout(800); await A.screenshot(path=OUT + 'ar7b_opp_left.png')
        await A.evaluate("arLeave(true)"); await A.wait_for_timeout(300)
        # ---- leaving with the button: you lose on the spot, they win on the spot
        await B.evaluate("duelSearch(false, 'pals2')"); await A.evaluate("duelSearch(false, 'pals2')")
        ok('friends matched again', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel' && !AM.vsAI", 12000) and await wait_for(B, "SCENE === 'arena' && AM && AM.mode === 'duel'", 12000))
        await wait_for(A, "[...AM.fighters.values()].some(f => !f.local && f.human)"); await wait_for(B, "[...AM.fighters.values()].some(f => !f.local && f.human)")
        await B.wait_for_timeout(1500); await B.evaluate("arLeave()")
        ok('the pilot who stays wins straight away', await wait_for(A, "AM && AM.ended && AM.result.won && AM.result.left", 8000), await A.evaluate("JSON.stringify(AM && AM.result)"))
        ok('both sides settled: winner paid', await wait_for(A, "!!(AM.result.r && AM.result.r.done && AM.result.r.won && AM.result.r.coins > 0)", 10000), await A.evaluate("JSON.stringify(AM && AM.result)"))
        await A.evaluate("arLeave(true)"); await A.wait_for_timeout(300)
        # ---- ranked vs AI: others are online, so it keeps looking for a real pilot until you ask for an AI
        await A.evaluate("duelSearch(true)"); await A.wait_for_timeout(15000)
        ok('other pilots online: keeps looking past 15s', await A.evaluate("DQ.on && !DQ.found && DQ.wait >= 30"), await A.evaluate("[DQ.on, DQ.wait, DQ.others]"))
        await A.screenshot(path=OUT + 'ar5c_searching.png')
        await A.evaluate("DQ.aiNow = true")
        ok('FIGHT AN AI NOW: matched with an AI pilot', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel' && AM.vsAI", 9000), await A.evaluate("[SCENE, DQ.on, DQ.t]"))
        ok('AI pilot looks like a player', await A.evaluate("(() => { const b = [...AM.fighters.values()].find(f => f.bot); return b && b.cs.length >= 3 && !/\\b(AI|BOT)\\b/.test(b.cs) && !!b.eq.weapon; })()"))
        await A.evaluate("(() => { const bot = [...AM.fighters.values()].find(f => f.bot); for (let i = 0; i < 5; i++) { arDie(bot, AM.me.id, false); bot.alive = true; } })()")
        ok('beat the AI: +14 trophies', await wait_for(A, "!!(AM.result && AM.result.r && AM.result.r.trophy_change === 14)", 8000), await A.evaluate("JSON.stringify(AM && AM.result)"))
        await A.evaluate("arLeave(true)"); await A.wait_for_timeout(300)
        # ---- leaderboards and counts
        await A.evaluate("openStation('arena'); HUB.ps.arena.tab = 2"); await wait_for(A, "!!ARL.lb.trophies"); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT + 'ar8_ranks.png')
        lb = await A.evaluate("ARL.lb.trophies.top.map(r => r.callsign + ':' + r.value).join(' ')")
        ok('leaderboard has both players', 'MASON' in lb and 'KAI' in lb, lb)
        errs = eA + eB
        ok('no page errors', not errs, errs[:4])
        await b.close()
    print('\nFAILURES:', fails)
asyncio.run(main())
srv.shutdown()
sys.exit(1 if fails else 0)
