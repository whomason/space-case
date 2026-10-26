"""End-to-end for the live features, in real browser tabs against the mock Supabase:
daily rewards, the market, reports + moderation + bans, friend popups, 1v1 challenges,
watching a friend's match, arena emotes, password reset, rebinding keys, and the fair-play flag."""
import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
import psycopg2
from playwright.async_api import async_playwright
OUT = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/eaeb4748-0665-5d2a-83cf-34ae4d8c3f0d/scratchpad/shots/')
srv, M = MS.start(8125)
BASE = 'http://localhost:8125/?api=http://localhost:8125'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
def q(sql, a=()):
    with psycopg2.connect(dbname=M.dbname, **MS.DSN) as cn: c = cn.cursor(); c.execute(sql, a); return c.fetchall() if c.description else None
async def boot(ctx, tag, url=None):
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(tag + ' ' + str(e)[:300]))
    await pg.goto(url or (BASE + '&ns=' + tag.lower())); await pg.wait_for_timeout(700)
    await pg.mouse.click(480, 300); await pg.wait_for_timeout(120); await pg.mouse.click(480, 300); await pg.wait_for_timeout(800)
    await pg.evaluate("S.nameAsked = true; closeNameUI()")
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
        A, eA = await boot(ctx, 'A'); B, eB = await boot(ctx, 'B'); C, eC = await boot(ctx, 'C')
        ok('three players signed in', await sign(A, 'MASON', 'a@x.com') and await sign(B, 'KAI', 'b@x.com') and await sign(C, 'ZED', 'c@x.com'))
        await A.evaluate("rpc('friend_request', { p_callsign: 'KAI' })"); await A.evaluate("rpc('friend_request', { p_callsign: 'ZED' })"); await A.wait_for_timeout(400)
        await B.evaluate("rpc('my_social').then(s => rpc('friend_respond', { p_other: s.incoming[0].id, p_accept: true }))")
        await C.evaluate("rpc('my_social').then(s => rpc('friend_respond', { p_other: s.incoming[0].id, p_accept: true }))"); await A.wait_for_timeout(600)
        # ---- friends coming online pop up
        await A.evaluate("PULSE.online = new Set(); PULSE.t = -99"); await A.wait_for_timeout(200)
        await A.evaluate("PULSE.online = new Set(['ZED']); PULSE.t = -99"); ok('a friend coming online pops up', await wait_for(A, "TOASTS.some(t => /KAI IS ONLINE/.test(t.txt))", 6000), await A.evaluate("TOASTS.map(t => t.txt)"))
        # ---- daily rewards
        await A.evaluate("S.planet.landings = 1; DAILY.shown = false; HUB.panel = null; DAILY.t = -99"); await A.wait_for_timeout(200)
        ok('daily reward offers itself in the station', await wait_for(A, "HUB.panel === 'daily' && DAILY.st && DAILY.st.can"), await A.evaluate("[HUB.panel, JSON.stringify(DAILY.st)]"))
        await A.screenshot(path=OUT + 'lv1_daily.png')
        c0 = await A.evaluate("S.coins")
        await A.evaluate("dailyClaim()"); ok('claiming pays through the mailbox', await wait_for(A, f"S.coins >= {c0} + 300", 9000), await A.evaluate("[S.coins, NET.mail]"))
        await A.evaluate("DAILY.t = -99; dailyRefresh(true)"); await A.wait_for_timeout(500)
        ok('then it waits until tomorrow', await A.evaluate("DAILY.st && !DAILY.st.can && DAILY.st.streak === 1"), await A.evaluate("JSON.stringify(DAILY.st)"))
        await A.wait_for_timeout(300); await A.screenshot(path=OUT + 'lv2_daily_done.png')
        # ---- market: A sells, B buys, A gets paid
        item = await A.evaluate("(() => { const id = POOLS.w[3].find(i => !S.inv[i]); addItem(id); netFlush(); return id; })()"); await A.wait_for_timeout(800)
        await A.evaluate("HUB.panel = null; openStation('social'); HUB.ps.social.tab = 4"); await A.wait_for_timeout(500)
        await A.evaluate(f"netDo(() => netEcon('market_list', {{ p_item: '{item}', p_price: 1000 }}), 'LISTED')")
        ok('listing takes the item out of your save', await wait_for(A, f"!S.inv['{item}']"), await A.evaluate("NET.err"))
        await B.evaluate("S.coins += 5000; netFlush(); HUB.panel = null; openStation('social'); HUB.ps.social.tab = 4; MK.t = -99"); await B.wait_for_timeout(800)
        ok('the other player sees it', await wait_for(B, f"!!(MK.list && MK.list.some(m => m.item === '{item}' && m.seller === 'MASON'))"), await B.evaluate("JSON.stringify(MK.list)"))
        await B.evaluate(f"HUB.ps.social.msel = MK.list.find(m => m.item === '{item}').id"); await B.wait_for_timeout(300); await B.screenshot(path=OUT + 'lv3_market.png')
        cb = await B.evaluate("S.coins")
        await B.evaluate(f"netDo(() => netEcon('market_buy', {{ p_id: MK.list.find(m => m.item === '{item}').id }}), 'BOUGHT')")
        ok('buying: item in, coins out', await wait_for(B, f"!!S.inv['{item}'] && S.coins === {cb} - 1000"), await B.evaluate(f"[!!S.inv['{item}'], S.coins]"))
        ca = await A.evaluate("S.coins"); await A.evaluate("NET.mail = 1")
        ok('seller paid minus the 5% fee', await wait_for(A, f"S.coins === {ca} + 950", 9000), await A.evaluate("S.coins"))
        await B.evaluate("st = HUB.ps.social; st.msell = { id: null }"); await B.wait_for_timeout(300); await B.screenshot(path=OUT + 'lv4_market_sell.png'); await B.evaluate("HUB.ps.social.msell = null")
        # ---- reports + moderators
        await B.evaluate("HUB.ps.social.tab = 0; HUB.ps.social.sel = 'MASON'; netProfile('MASON', true)"); await B.wait_for_timeout(500)
        await B.evaluate("NET.report = { cs: 'MASON', why: 'NAME' }"); await B.wait_for_timeout(300); await B.screenshot(path=OUT + 'lv5_report.png')
        await B.evaluate("netDo(() => rpc('report_player', { p_callsign: 'MASON', p_reason: 'NAME', p_note: 'test' }), r => r); NET.report = null"); await B.wait_for_timeout(500)
        ok('report reaches the queue', q("select count(*) from public.reports where reason = 'NAME'")[0][0] == 1)
        q("insert into public.admins select id from public.profiles where callsign = 'ZED'")
        await C.evaluate("PULSE.t = -99"); ok('a moderator gets the MOD tab', await wait_for(C, "PULSE.admin === true"))
        await C.evaluate("HUB.panel = null; openStation('social'); HUB.ps.social.tab = 5"); ok('mod queue loads', await wait_for(C, "!!(MODQ.data && MODQ.data.players.some(p => p.callsign === 'MASON'))"))
        await C.evaluate("HUB.ps.social.modsel = MODQ.data.players.find(p => p.callsign === 'MASON').id"); await C.wait_for_timeout(300); await C.screenshot(path=OUT + 'lv6_mod.png')
        uidB = q("select id from public.profiles where callsign = 'KAI'")[0][0]
        await C.evaluate(f"rpc('mod_action', {{ p_target: '{uidB}', p_action: 'ban', p_days: 1, p_reason: 'testing' }})"); await C.wait_for_timeout(500)
        r = await B.evaluate("rpc('pulse').then(() => 'ok').catch(e => e.message)"); ok('a banned player is locked out', 'BANNED' in r, r)
        await C.evaluate(f"rpc('mod_action', {{ p_target: '{uidB}', p_action: 'unban' }})"); await C.wait_for_timeout(300)
        r = await B.evaluate("rpc('pulse').then(() => 'ok').catch(e => e.message)"); ok('and back after an unban', r == 'ok', r)
        # ---- challenge a friend, they accept from the popup, both land in the same 1v1
        await A.evaluate("HUB.panel = null; goHub(); challengeFriend('KAI')"); await A.wait_for_timeout(300)
        await B.evaluate("HUB.panel = null; goHub(); PULSE.t = -99")
        ok('the friend gets a challenge popup', await wait_for(B, "!!PULSE.popup && PULSE.popup.from === 'MASON'", 9000))
        await B.wait_for_timeout(200); await B.screenshot(path=OUT + 'lv7_challenge.png')
        await B.mouse.click((POPX := 0) or (240 - 120 + 8 + 35) * 2, (26 + 15 + 6) * 2)
        ok('accepting puts both in one 1v1', await wait_for(A, "SCENE === 'arena' && AM && AM.mode === 'duel' && !AM.vsAI", 15000) and await wait_for(B, "SCENE === 'arena' && AM && AM.mode === 'duel'", 15000), [await A.evaluate("[SCENE, DQ.on]"), await B.evaluate("[SCENE, DQ.on, !!PULSE.popup]")])
        ok('same match', await A.evaluate("AM.matchId") == await B.evaluate("AM.matchId"))
        await wait_for(A, "[...AM.fighters.values()].some(f => !f.local && f.human && f.x > 0)")
        # ---- a third friend watches it live
        await C.evaluate("HUB.panel = null; PULSE.t = -99"); ok('the match shows up to watch', await wait_for(C, "PULSE.watch.length > 0", 9000))
        await C.evaluate("arSpectate(PULSE.watch[0])")
        ok('the spectator sees both pilots', await wait_for(C, "AM && AM.spec && AM.fighters.size === 2 && [...AM.fighters.values()].every(f => f.x > 0)", 12000), await C.evaluate("AM && [AM.fighters.size, [...AM.fighters.values()].map(f => f.cs + ':' + Math.round(f.x))]"))
        ok('the spectator is not a player', await A.evaluate("AM.humans") == 2 and await A.evaluate("AM.fighters.size") == 2)
        # ---- quick chat
        await A.keyboard.press('KeyT'); await A.wait_for_timeout(100); await A.keyboard.press('Digit1')
        ok('an emote reaches the other player', await wait_for(B, "[...AM.fighters.values()].some(f => !f.local && f.emote && EMOTES[f.emote.i] === 'GG')", 5000))
        ok('and the spectator', await wait_for(C, "[...AM.fighters.values()].some(f => f.emote)", 5000))
        await C.wait_for_timeout(300); await C.screenshot(path=OUT + 'lv8_spectate.png'); await A.screenshot(path=OUT + 'lv9_emote.png')
        # A wins: the spectator sees who won
        aid = await A.evaluate("AM.me.id")
        for i in range(5):
            await B.evaluate(f"(() => {{ AM.me.inv = 0; arHit(AM.me, 9999, '{aid}', 0, 0); }})()"); await B.wait_for_timeout(450); await B.evaluate("arRespawn(AM.me)")
        ok('the spectator sees the winner', await wait_for(C, "AM && AM.ended && AM.result.winner === 'MASON'", 9000), await C.evaluate("AM && [AM.ended, JSON.stringify(AM.result)]"))
        await A.evaluate("arLeave(true)"); await B.evaluate("arLeave(true)"); await C.evaluate("AM && arLeave(true)")
        # ---- an AI 1v1 can be watched too
        await A.evaluate("duelSearch(false); DQ.aiNow = true"); ok('AI duel started', await wait_for(A, "SCENE === 'arena' && AM && AM.vsAI && !!AM.room", 9000))
        await C.evaluate("PULSE.t = -99"); await wait_for(C, "PULSE.watch.some(w => w.ai)", 9000); await C.evaluate("arSpectate(PULSE.watch.find(w => w.ai))")
        ok('watching a friend fight an AI pilot', await wait_for(C, "AM && AM.spec && AM.fighters.size === 2 && [...AM.fighters.values()].some(f => f.bot && f.x > 0)", 12000), await C.evaluate("AM && AM.fighters.size"))
        await A.evaluate("arLeave(true)"); await C.evaluate("AM && arLeave(true)")
        # ---- settings: rebind a key
        await A.evaluate("HUB.panel = null; goHub(); openStation('settings')"); await A.wait_for_timeout(300)
        await A.evaluate("KEYCAP.wait = 'up'"); await A.keyboard.press('KeyI'); await A.wait_for_timeout(200)
        ok('rebinding: MOVE UP is now I', await A.evaluate("keyOf('up') === 'KeyI'"))
        await A.keyboard.down('KeyI'); await A.wait_for_timeout(50); held = await A.evaluate("IN.keys.has('KeyW')"); await A.keyboard.up('KeyI')
        ok('pressing I moves up', held)
        await A.evaluate("KEYCAP.wait = 'down'"); await A.keyboard.press('KeyI'); await A.wait_for_timeout(200)
        ok('taking a used key swaps the two', await A.evaluate("keyOf('down') === 'KeyI' && keyOf('up') === 'KeyS'"))
        await A.screenshot(path=OUT + 'lv10_settings.png')
        # ---- password reset
        await A.evaluate("netSignOut()"); await A.wait_for_timeout(500); await A.evaluate("HUB.panel = null; openStation('social'); setField('email', 'a@x.com')"); await A.wait_for_timeout(300)
        await A.evaluate("netForgot('a@x.com')"); await A.wait_for_timeout(300)
        ok('reset email requested with a link back to the game', getattr(M, 'recovered', []) and M.recovered[-1][0] == 'a@x.com' and 'localhost:8125' in M.recovered[-1][1], getattr(M, 'recovered', None))
        uidA = q("select id from public.profiles where callsign = 'MASON'")[0][0]; sess = M.session(uidA, 'a@x.com')
        await A.goto('about:blank'); await A.goto(BASE + '&ns=a#access_token=' + sess['access_token'] + '&refresh_token=' + sess['refresh_token'] + '&expires_in=3600&type=recovery'); await A.wait_for_timeout(600)
        ok('the link opens the new-password form', await A.evaluate("!!NET.recovery") and '#' not in await A.evaluate("location.href"))
        await A.mouse.click(480, 300); await A.wait_for_timeout(120); await A.mouse.click(480, 300); await A.wait_for_timeout(900); await A.evaluate("closeNameUI()")
        ok('it opens by itself', await wait_for(A, "HUB.panel === 'social'"))
        await A.wait_for_timeout(200); await A.screenshot(path=OUT + 'lv11_newpw.png')
        await A.evaluate("netSetPassword('newpass9')"); ok('new password saved and signed in', await wait_for(A, "NET.st === 'on' && !NET.recovery"))
        await A.evaluate("netSignOut()"); await A.wait_for_timeout(400)
        r = await A.evaluate("netSignIn('a@x.com', 'newpass9', false).then(() => 'ok').catch(e => e.message)"); ok('signing in with the new password works', r == 'ok', r)
        # ---- fair play: an edited save pauses trading
        await B.evaluate("S.tamper = 1; netFlush()"); await B.wait_for_timeout(600); await B.evaluate("PULSE.t = -99")
        ok('an edited save gets flagged', await wait_for(B, "PULSE.flagged === true", 9000))
        r = await B.evaluate(f"rpc('market_list', {{ p_item: Object.keys(S.inv).find(i => !isEquipped(i)), p_price: 5 }}).then(() => 'ok').catch(e => e.message)"); ok('and cannot sell', 'PAUSED' in r, r)
        errs = eA + eB + eC
        ok('no page errors', not errs, errs[:4])
        await b.close()
    print('\nFAILURES:', fails)
asyncio.run(main())
srv.shutdown()
sys.exit(1 if fails else 0)
