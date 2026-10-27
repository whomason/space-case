"""Rename while offline reaches the server; private servers have no AI pilots."""
import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_supabase as MS
from playwright.async_api import async_playwright
srv, M = MS.start(8126)
BASE = 'http://localhost:8126/?api=http://localhost:8126'
fails = 0
def ok(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, '' if cond else info, flush=True)
    if not cond: fails += 1
async def boot(ctx, tag):
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: print('PAGEERR', tag, str(e)[:300]))
    await pg.goto(BASE + '&ns=' + tag.lower()); await pg.wait_for_timeout(700)
    await pg.mouse.click(480, 300); await pg.wait_for_timeout(120); await pg.mouse.click(480, 300); await pg.wait_for_timeout(800)
    await pg.evaluate("S.nameAsked = true; closeNameUI()"); return pg
async def wait_for(pg, js, ms=10000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(120)
    return False
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 960, 'height': 540})
        A = await boot(ctx, 'A'); B = await boot(ctx, 'B')
        await A.evaluate("S.name = 'MASON'; netSignIn('a@x.com', 'secret1', true)"); await wait_for(A, "NET.st === 'on' && NET.callsign === 'MASON'")
        await B.evaluate("S.name = 'KAI'; netSignIn('b@x.com', 'secret1', true)"); await wait_for(B, "NET.st === 'on' && NET.callsign === 'KAI'")
        # connection drops, A renames anyway
        await A.evaluate("NET.st = 'error'; openNameUI(false); nameEl().value = 'MASON TWO'; saveName()")
        ok('rename while offline is kept locally and marked', await A.evaluate("S.name === 'MASON TWO' && S.namePending === true"))
        await A.evaluate("netSignIn('a@x.com', 'secret1', false)")
        ok('reconnecting pushes the new callsign to the server', await wait_for(A, "NET.st === 'on' && NET.callsign === 'MASON TWO' && !S.namePending"), await A.evaluate("[NET.st, NET.callsign, S.name, NET.err]"))
        r = await B.evaluate("rpc('friend_request', { p_callsign: 'MASON TWO' }).catch(e => 'ERR ' + e.message)")
        ok('friend request to the new name works', r == 'sent', r)
        r = await B.evaluate("rpc('friend_request', { p_callsign: 'MASON' }).catch(e => 'ERR ' + e.message)")
        ok('the old name is gone', str(r).startswith('ERR'), r)
        # private server: no bots
        await A.evaluate("rpc('arena_create', { p_name: 'MY ROOM' }).then(s => arJoinServer(s.id))")
        await A.wait_for_timeout(5000)
        st = await A.evaluate("AM ? { mode: AM.mode, priv: !!(AM.server && AM.server.private), bots: arBots().length } : null")
        ok('private server has no AI pilots', st and st['priv'] and st['bots'] == 0, st)
        await b.close()
    print('\nFAILURES:', fails)
asyncio.run(main())
