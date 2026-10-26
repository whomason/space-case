// ===== ARENA: FFA servers, private servers and 1v1 duels =====
// Every device runs its own pilot. The first player in a room also runs the AI pilots.
// Hits are decided by the one getting hit, so what you see is what hits you.
let AM = null;
const AR_FIGHTERS = 10, AR_MAX_AI = 5, AR_DUEL_TO = 5, AR_DUEL_TIME = 180, AR_SEND = 0.2;
const arAIFor = humans => Math.max(0, Math.min(AR_MAX_AI, AR_FIGHTERS - humans));
const AR_RANKS = [['ROOKIE', 0, '#9aa3c0'], ['BRONZE', 50, '#c8875a'], ['SILVER', 200, '#cfd6e6'], ['GOLD', 500, '#fca311'], ['PLATINUM', 1000, '#7fe9ff'], ['DIAMOND', 2000, '#9fd3ff'], ['MASTER', 3500, '#e0b1cb'], ['GALACTIC', 6000, 'RAINBOW']];
const rankOf = t => { let r = AR_RANKS[0]; for (const k of AR_RANKS) if (t >= k[1]) r = k; return r; };
const BN1 = ['KAI', 'NOVA', 'ZED', 'LUNA', 'RIO', 'JAX', 'MILO', 'ZARA', 'ACE', 'NYX', 'ECHO', 'VEX', 'ORION', 'SKY', 'REX', 'PIXEL', 'BLAZE', 'FROST', 'DUSK', 'COMET', 'TACO', 'MOCHI', 'BEANS', 'GOOSE', 'SPUD', 'WAFFLE', 'NOODLE', 'PICKLE', 'TURBO', 'GHOST', 'RAVEN', 'VIPER', 'ASTRO', 'COSMO', 'JUNO', 'KODA', 'ROOK', 'SAGE', 'ZION', 'NIKO', 'OTTO', 'REI', 'TOBI', 'YUKI', 'BEAR', 'CHIP', 'DOT', 'FINN', 'IVY', 'LEO', 'MAX', 'OLLIE', 'PIP', 'QUINN', 'RUBY', 'SOL', 'TEX', 'UMA', 'WREN'];
const BN2 = ['KING', 'BOY', 'GIRL', 'DOG', 'CAT', 'MAN', 'WOLF', 'FOX', 'MAIN', 'PRO', 'YT', 'GG', 'X', 'Z', 'JR', 'TV', 'HD', 'OG'];
function botName(R) {
  for (let t = 0; t < 20; t++) {
    const a = R.pick(BN1), b = R.pick(BN2), n = R.ir(1, 99), f = R.int(7);
    const s = f === 0 ? a : f === 1 ? a + n : f === 2 ? a + ' ' + b : f === 3 ? a + b : f === 4 ? a + '_' + n : f === 5 ? 'THE ' + a : a + '-' + R.ir(1, 9);
    if (s.length >= 3 && s.length <= 12) return s;
  }
  return 'PILOT' + R.ir(10, 99);
}
// every weapon class is tuned to the same damage per second here, so skill decides fights. Rarity and grade add a little.
function arenaWeapon(id, g) {
  let d; try { d = getDef(id); } catch (e) { d = null; }
  if (!d || d.cat !== 'w') d = getDef('w|blaster|0');
  const C = CLS[d.sub] || CLS.blaster; const pel = C.pellets || 1;
  const want = 34 * (1 + 0.06 * d.r) * (1 + 0.025 * (g || 0));
  const rate = d.sub === 'beam' ? 10 : C.rate;
  return { cls: d.sub, id: d.id, dmg: want / (rate * pel), rate, spd: C.spd || (d.sub === 'railgun' ? 1200 : d.sub === 'drone' ? 190 : d.sub === 'mine' ? 150 : 260), rng: Math.max(60, C.rng || 200), pellets: pel, spread: C.spread || 0, aoe: C.aoe || 0, col: weaponColor(d.id) };
}
function arColPack(c) { return [c.core, c.mid, c.edge]; }
function arColUnpack(a) { return a && a.length ? { core: a[0], mid: a[1], edge: a[2], dark: a[2] } : { core: '#fff', mid: '#9ff', edge: '#4ef', dark: '#226' }; }
// ---------- maps ----------
function arMap(seed, duel) {
  const R = RNG(seed), w = duel ? 520 : 640, h = duel ? 380 : 480, blocks = [];
  const free = (x, y, bw, bh, m) => blocks.every(b => x + bw + m < b[0] || x > b[0] + b[2] + m || y + bh + m < b[1] || y > b[1] + b[3] + m);
  const n = duel ? 5 : 8;
  for (let i = 0; i < 200 && blocks.length < n * 2; i++) {
    const bw = R.ir(2, 6) * 8, bh = R.ir(2, 4) * 8, x = R.ir(36, w / 2 - bw - 10), y = R.ir(36, h - 36 - bh);
    const x2 = w - x - bw, y2 = h - y - bh;
    if (!free(x, y, bw, bh, 26) || !free(x2, y2, bw, bh, 26) || Math.abs(x2 - x) < bw + 30 && Math.abs(y2 - y) < bh + 30) continue;
    blocks.push([x, y, bw, bh], [x2, y2, bw, bh]);
  }
  const blocked = (x, y, m) => blocks.some(b => x > b[0] - m && x < b[0] + b[2] + m && y > b[1] - m && y < b[1] + b[3] + m);
  const spawns = [];
  if (duel) spawns.push([40, h / 2], [w - 40, h / 2]);
  for (let t = 0; t < 2000 && spawns.length < 18; t++) { const x = R.ir(28, w - 28), y = R.ir(28, h - 28); if (!blocked(x, y, 16) && spawns.every(s => Math.hypot(s[0] - x, s[1] - y) > 70)) spawns.push([x, y]); }
  return { w, h, blocks, spawns, blocked, seed };
}
function arFloor(M, theme) {
  const p = planetDef(theme), c = mkCanvas(M.w, M.h), g = c.x;
  const base = hsl(p.g[0], Math.min(0.5, p.g[1] + 0.05), Math.min(0.32, p.g[2] * 0.7)), alt = hsl(p.g2[0], Math.min(0.5, p.g2[1] + 0.05), Math.min(0.28, p.g2[2] * 0.7));
  for (let y = 0; y < M.h; y += 16) for (let x = 0; x < M.w; x += 16) { g.fillStyle = hex(((x + y) / 16) % 2 ? base : alt); g.fillRect(x, y, 16, 16); }
  g.fillStyle = hex(hsl(p.g[0] + 180, 0.8, 0.6)); g.globalAlpha = 0.18;
  for (let x = 0; x <= M.w; x += 32) g.fillRect(x, 0, 1, M.h); for (let y = 0; y <= M.h; y += 32) g.fillRect(0, y, M.w, 1);
  g.globalAlpha = 1; g.fillStyle = '#05060d'; g.fillRect(0, 0, M.w, 6); g.fillRect(0, M.h - 6, M.w, 6); g.fillRect(0, 0, 6, M.h); g.fillRect(M.w - 6, 0, 6, M.h);
  g.fillStyle = hex(hsl(p.g[0] + 180, 0.9, 0.62)); g.fillRect(6, 6, M.w - 12, 1); g.fillRect(6, M.h - 7, M.w - 12, 1); g.fillRect(6, 6, 1, M.h - 12); g.fillRect(M.w - 7, 6, 1, M.h - 12);
  return { c, top: hex(hsl(p.g[0], 0.25, 0.55)), side: hex(hsl(p.g[0], 0.3, 0.3)), edge: hex(hsl(p.g[0] + 180, 0.9, 0.65)) };
}
// ---------- fighters ----------
function arFighter(o) {
  return Object.assign({ x: 0, y: 0, vx: 0, vy: 0, nx: 0, ny: 0, aim: 0, dir: 0, walk: 0, moving: false, recoil: 0, mode: 'weapon', inv: 0, hurtT: 0, r: 6,
    hp: 150, maxHp: 150, alive: true, respT: 0, kills: 0, deaths: 0, streak: 0, boostCd: 0, boostT: 0, fireCd: 0, charge: 0, lastHit: 99, fired: [] }, o);
}
// the two weapons you bring into arenas (your pick, from anything you own)
function arenaLoadout() {
  const okW = id => id && S.inv[id] && getDef(id).cat === 'w';
  const L = S.arenaLoadout = S.arenaLoadout || {};
  if (!okW(L.w1)) L.w1 = okW(S.eq.weapon) ? S.eq.weapon : Object.keys(S.inv).find(okW) || null;
  if (L.w2 && (!okW(L.w2) || L.w2 === L.w1)) L.w2 = null;
  return L;
}
function myFighter() {
  const eq = Object.assign({}, S.eq); delete eq.backdrop;
  const LO = arenaLoadout(); if (LO.w1) eq.weapon = LO.w1;
  const ar = ['helmet', 'chest', 'boots', 'jetpack', 'o2'].map(s => S.eq[s] ? getDef(S.eq[s]).r : 0); const avg = ar.reduce((a, b) => a + b, 0) / 5;
  const hp = Math.round(150 + avg * 5);
  const wpns = [LO.w1, LO.w2].filter(Boolean);
  return arFighter({ id: NET.sess ? NET.sess.uid : 'me', cs: S.name || 'YOU', human: true, local: true, eq, wpns, wi: 0, wpn: arenaWeapon(wpns[0] || S.eq.weapon, gradeOf(wpns[0] || S.eq.weapon)), hp, maxHp: hp, lvl: S.lvl, title: S.titles.eq });
}
function botLoadout(R, skill) {
  const pick = (cat, sub, rmax) => { const P = POOLS[cat]; for (let t = 0; t < 60; t++) { const r = Math.min(6, Math.floor(R() * R() * (rmax + 1))); const arr = P && P[r]; if (!arr || !arr.length) continue; const id = arr[R.int(arr.length)]; if (!sub || getDef(id).sub === sub) return id; } return null; };
  const eq = { weapon: pick('w', null, 3 + skill * 3) };
  for (const s of ['helmet', 'chest', 'boots', 'jetpack', 'o2']) eq[s] = pick('a', s, 2 + skill * 3);
  for (const s of ['eyewear', 'headgear', 'back', 'trail']) if (R() < 0.35 + skill * 0.3) eq[s] = pick('c', s, 4);
  if (R() < 0.25) eq.skin_armor = pick('k', 'armor', 4); if (R() < 0.2) eq.skin_weapon = pick('k', 'weapon', 4);
  for (const k in eq) if (!eq[k]) delete eq[k];
  return eq;
}
function arMakeBot(id, R, skill, o = {}) {
  const eq = o.eq || botLoadout(R, skill); const hp = 150 + Math.round(R() * 20);
  return arFighter(Object.assign({ id, cs: o.cs || botName(R), bot: true, eq, wpn: arenaWeapon(eq.weapon, R.int(4)), hp, maxHp: hp, lvl: o.lvl || R.ir(3, 25 + Math.round(skill * 20)),
    ai: { skill, t: R() * 3, str: R() < 0.5 ? 1 : -1, tgt: null, think: 0, aimErr: (1 - skill) * 0.32 + 0.03, want: 0, idle: 0 } }, o.extra || {}));
}
// ---------- start / leave ----------
function arStart(o) {
  const duel = o.mode === 'duel', seed = hashStr(String(o.seed || (o.server && o.server.id) || o.matchId || 'practice'));
  const M = arMap(seed, duel), theme = o.theme || (o.server && o.server.theme) || 1 + (seed % 20);
  const me = myFighter();
  AM = { mode: o.mode, practice: !!o.practice, server: o.server || null, matchId: o.matchId || null, ranked: !!o.ranked, M, F: arFloor(M, theme), theme, me, fighters: new Map([[me.id, me]]),
    shots: [], fx: new Particles(900), t: 0, cam: { x: 0, y: 0 }, room: null, host: true, peers: [], sendT: 0, hiT: 0, feed: [], banner: null,
    rk: 0, rhk: 0, rd: 0, best: 0, reportT: 0, pingT: 0, humans: 1, menu: false, ended: false, result: null, timer: duel ? AR_DUEL_TIME : 0, count: duel ? 3 : 0, botSeq: 0, botR: RNG(seed ^ 0x5bd1e995),
    opp: o.opponent || null, vsAI: !!o.vsAI, oppSeenT: 0, connecting: !!o.live, liveErr: '', skill: o.skill ?? 0.5, joinedAt: Date.now() };
  if (duel) AM.host = !!(o.vsAI || o.practice || o.hostFirst);
  arRespawn(me, true);
  if (duel && o.vsAI) arAddDuelBot(o.botCard);
  if (o.mode === 'ffa' || o.mode === 'practice') arFillBots();
  if (o.live) {
    const topic = (duel ? 'duel-' + o.matchId : 'arena-' + o.server.id);
    rtJoin(topic, { id: me.id, cs: me.cs, j: o.hostFirst ? 1 : AM.joinedAt }, { msg: arOnMsg, peers: arOnPeers })
      .then(room => { if (!AM) { room.leave(); return; } AM.room = room; AM.connecting = false; arSendHi(); })
      .catch(e => { if (!AM) return; AM.connecting = false; AM.liveErr = e.message; if (duel) arDuelFallback(); });
  }
  SND.playSong('boss'); setScene('arena');
}
function arLeave(quiet) {
  const A = AM; if (!A) return;
  const rep = A.mode !== 'duel' && !A.practice ? arReport(true) : null;
  if (A.mode === 'duel' && !A.ended && !A.practice) { arDuelReport(false); }
  if (A.room) { try { A.room.send('bye', {}); A.room.leave(); } catch (e) { } }
  if (A.server && !A.practice) Promise.resolve(rep).catch(() => { }).then(() => rpc('arena_leave')).catch(() => { });
  AM = null; goHub(); if (!quiet) openStation('arena');
}
// ---------- bots ----------
function arBots() { return [...AM.fighters.values()].filter(f => f.bot); }
function arFillBots() {
  const A = AM; if (!A.host || A.mode === 'duel') return;
  const want = arAIFor(A.humans), bots = arBots();
  if (bots.length > want) { const extra = bots.sort((a, b) => (a.alive - b.alive) || (a.kills - b.kills)).slice(0, bots.length - want); for (const b of extra) A.fighters.delete(b.id); }
  for (let i = bots.length; i < want; i++) { const id = 'b' + (++A.botSeq) + '-' + A.me.id.slice(0, 4); const b = arMakeBot(id, A.botR, 0.2 + A.botR() * 0.55); A.fighters.set(id, b); arRespawn(b, true); }
}
function arAddDuelBot(card) {
  const A = AM, R = A.botR; const sk = clamp(0.62 + (S.lvl || 1) * 0.004 + A.skill * 0.25, 0.6, 0.95);
  const b = arMakeBot('ai-' + (A.matchId || 'x'), R, sk, card ? { cs: card.callsign, lvl: card.level, eq: card.eq } : {});
  b.card = card || { callsign: b.cs, level: b.lvl, trophies: Math.max(0, (NET.arena && NET.arena.trophies || 0) + R.ir(-60, 60)) };
  A.fighters.set(b.id, b); arRespawn(b); b.inv = 0.5; return b;
}
function arDuelFallback() { // the other player never showed up or dropped: an AI pilot keeps the match going
  const A = AM; if (!A || A.ended) return;
  const opp = [...A.fighters.values()].find(f => !f.local && f.human); if (opp) A.fighters.delete(opp.id);
  if (!arBots().length) { const c = A.opp ? { callsign: A.opp.callsign, level: A.opp.level, eq: A.oppEq } : null; arAddDuelBot(c); }
  A.host = true; A.vsAI = true;
}
function arRespawn(f, first) {
  const A = AM, M = A.M; let best = M.spawns[0], bd = -1;
  if (A.mode === 'duel' && first) best = (f.local ? A.host : !A.host) ? M.spawns[0] : M.spawns[1];
  else for (const s of M.spawns) { let md = 1e9; for (const o of A.fighters.values()) if (o !== f && o.alive) md = Math.min(md, Math.hypot(o.x - s[0], o.y - s[1])); md += Math.random() * 40; if (md > bd) { bd = md; best = s; } }
  f.x = f.nx = best[0]; f.y = f.ny = best[1]; f.vx = f.vy = 0; f.hp = f.maxHp; f.alive = true; f.inv = first ? 0.5 : 1.5; f.respT = 0; f.lastHit = 99;
}
function arLOS(x0, y0, x1, y1) { const M = AM.M, d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 8); for (let i = 1; i < n; i++) { const k = i / n; if (M.blocked(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 0)) return false; } return true; }
function arBotAI(b, dt) {
  const A = AM, ai = b.ai; ai.think -= dt; ai.t += dt;
  if (ai.think <= 0) {
    ai.think = 0.35 + Math.random() * 0.3;
    let best = null, bs = 1e9;
    for (const o of A.fighters.values()) { if (o === b || !o.alive) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); const s = d * (0.6 + o.hp / o.maxHp * 0.6) * (arLOS(b.x, b.y - 6, o.x, o.y - 6) ? 1 : 1.8) * (o === ai.tgt ? 0.75 : 1); if (s < bs) { bs = s; best = o; } }
    ai.tgt = best; if (Math.random() < 0.12) ai.str = -ai.str; ai.idle = Math.random() < 0.04 * (1 - ai.skill) ? 0.5 : 0;
  }
  const t = ai.tgt; let mx = 0, my = 0, fire = false, aim = b.aim;
  const W = b.wpn, pref = W.cls === 'blade' ? 18 : W.cls === 'shotgun' ? 55 : W.cls === 'sniper' || W.cls === 'railgun' ? Math.min(220, W.rng * 0.7) : Math.min(140, W.rng * 0.65);
  if (ai.idle > 0) ai.idle -= dt;
  else if (t && t.alive) {
    const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy) || 1, los = arLOS(b.x, b.y - 6, t.x, t.y - 6);
    const low = b.hp < b.maxHp * 0.3 && ai.skill > 0.45;
    const r = low ? -1 : d > pref + 25 || !los ? 1 : d < pref - 25 ? -1 : 0;
    mx = dx / d * r + (-dy / d) * ai.str * 0.8; my = dy / d * r + (dx / d) * ai.str * 0.8;
    const lead = ai.skill * Math.min(0.35, d / Math.max(120, W.spd)); const tx = t.x + (t.vx || 0) * lead, ty = t.y + (t.vy || 0) * lead;
    aim = Math.atan2(ty - b.y, tx - b.x) + (Math.sin(ai.t * 2.3) + Math.sin(ai.t * 5.1)) * 0.5 * ai.aimErr;
    fire = los && d < W.rng + 20 && Math.abs(angDiff(b.aim, aim)) < 0.6;
    // dodge shots coming at us
    if (b.boostCd <= 0 && Math.random() < ai.skill * dt * 6) for (const s of A.shots) { if (s.o === b.id) continue; const sx = b.x - s.x, sy = b.y - 6 - s.y; const ahead = (sx * s.vx + sy * s.vy) / (Math.hypot(s.vx, s.vy) || 1); if (ahead > 0 && ahead < 60 && Math.abs(sx * s.vy - sy * s.vx) / (Math.hypot(s.vx, s.vy) || 1) < 10) { const pa = Math.atan2(s.vy, s.vx) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); arBoost(b, Math.cos(pa), Math.sin(pa)); break; } }
  } else { mx = Math.sin(ai.t * 0.7) * 0.6; my = Math.cos(ai.t * 0.5) * 0.6; }
  // steer around blocks
  const ml = Math.hypot(mx, my); if (ml > 0.01) { mx /= ml; my /= ml; for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.2]) { const a = Math.atan2(my, mx) + da; if (!A.M.blocked(b.x + Math.cos(a) * 14, b.y + Math.sin(a) * 14, 4)) { mx = Math.cos(a); my = Math.sin(a); break; } } }
  b.aim = aim; arMove(b, mx * (0.8 + ai.skill * 0.25), my * (0.8 + ai.skill * 0.25), dt);
  if (fire) arTryFire(b, dt); else b.fireCd -= dt;
}
// ---------- movement / combat ----------
function arCollide(f) {
  const M = AM.M; f.x = clamp(f.x, 10, M.w - 10); f.y = clamp(f.y, 12, M.h - 8);
  for (const b of M.blocks) { const cx = clamp(f.x, b[0], b[0] + b[2]), cy = clamp(f.y, b[1], b[1] + b[3]); const dx = f.x - cx, dy = f.y - cy, d = Math.hypot(dx, dy); if (d < f.r) { if (d > 0.01) { f.x = cx + dx / d * f.r; f.y = cy + dy / d * f.r; } else { f.y = b[1] - f.r; } } }
}
function arMove(f, mx, my, dt) {
  const spd = 78 * (f.boostT > 0 ? 3.2 : 1);
  if (f.boostT > 0) { f.boostT -= dt; mx = f.bx; my = f.by; }
  f.vx = mx * spd; f.vy = my * spd; f.x += f.vx * dt; f.y += f.vy * dt; arCollide(f);
  f.moving = Math.hypot(mx, my) > 0.1; if (f.moving) f.walk += dt * 9;
  f.boostCd -= dt; if (f.inv > 0) f.inv -= dt; if (f.recoil > 0) f.recoil = Math.max(0, f.recoil - dt * 20); if (f.hurtT > 0) f.hurtT -= dt;
  const ca = Math.cos(f.aim), sa = Math.sin(f.aim); f.dir = Math.abs(ca) > Math.abs(sa) * 0.9 ? (ca < 0 ? 2 : 3) : (sa < 0 ? 1 : 0);
  f.lastHit += dt; if (f.lastHit > 4 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + 14 * dt);
}
function arBoost(f, dx, dy) {
  if (f.boostCd > 0) return; const l = Math.hypot(dx, dy); if (l < 0.1) { dx = Math.cos(f.aim); dy = Math.sin(f.aim); } else { dx /= l; dy /= l; }
  f.bx = dx; f.by = dy; f.boostT = 0.16; f.boostCd = 2; f.inv = Math.max(f.inv, 0.25);
  for (let i = 0; i < 6; i++) AM.fx.add({ x: f.x, y: f.y - 4, vx: -dx * 60 + (Math.random() - 0.5) * 30, vy: -dy * 60 + (Math.random() - 0.5) * 30, life: 0.3, c: '#dff8ff', s: 2, t: 'shrink' });
  if (f.local) SND.play('boost');
}
function arTryFire(f, dt) {
  f.fireCd -= dt; if (f.fireCd > 0) return;
  f.fireCd += 1 / f.wpn.rate; if (f.fireCd < 0) f.fireCd = 0;
  const seed = (Math.random() * 1e6) | 0, x = f.x + Math.cos(f.aim) * 9, y = f.y - 7 + Math.sin(f.aim) * 9;
  arSpawnShots(f, x, y, f.aim, seed, 0); f.fired.push([Math.round(x), Math.round(y), Math.round(f.aim * 1000) / 1000, seed]); f.recoil = 2;
  if (f.local) SND.play(f.wpn.cls === 'rifle' || f.wpn.cls === 'beam' ? 'rifle' : f.wpn.cls === 'blade' ? 'slash' : 'pew');
}
function arSpawnShots(f, x, y, a, seed, ff) {
  const A = AM, W = f.wpn, R = RNG(seed), col = W.col;
  if (W.cls === 'blade') { arSlash(f, x, y, a); return; }
  for (let i = 0; i < W.pellets; i++) {
    const aa = a + (W.pellets > 1 ? (i / (W.pellets - 1) - 0.5) * W.spread : (R() - 0.5) * W.spread);
    const spd = W.spd * (W.pellets > 1 ? 0.85 + R() * 0.3 : 1);
    const s = { o: f.id, x, y, vx: Math.cos(aa) * spd, vy: Math.sin(aa) * spd, life: W.rng / spd, dmg: W.dmg, r: W.cls === 'launcher' ? 3 : W.cls === 'railgun' ? 4 : 2, kind: W.cls, aoe: W.aoe, col, pierce: W.cls === 'sniper' || W.cls === 'railgun' ? 1 : 0, home: W.cls === 'drone' ? 2.5 : 0, hit: new Set(), t: 0 };
    if (W.cls === 'mine') { s.life = 6; s.stopT = Math.min(W.rng, 90) / spd; s.arm = 0.45; }
    if (ff) { s.x += s.vx * ff; s.y += s.vy * ff; s.life -= ff; }
    A.shots.push(s);
  }
}
function arSlash(f, x, y, a) {
  const A = AM; A.fx.add({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, life: 0.15, c: f.wpn.col.mid, s: 22, t: 'ring' });
  for (const o of A.fighters.values()) { if (o === f || !o.alive) continue; const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy); if (d < f.wpn.rng + 10 && Math.abs(angDiff(a, Math.atan2(dy, dx))) < 1) arHit(o, f.wpn.dmg, f.id, o.x, o.y - 8); }
}
// decide damage: only for my own pilot, or for AI pilots if I run them
function arAuth(o) { return o.local || (o.bot && AM.host); }
function arHit(o, dmg, by, x, y) {
  const A = AM; A.fx.burst(x, y, 4, { c: ['#fff', '#ffcb3d'], sp: 60, life: 0.25 });
  if (by === A.me.id && o !== A.me && o.alive && !(o.inv > 0)) { A.hitT = 0.14; SND.play('hit'); A.fx.text(o.x + (Math.random() - 0.5) * 8, o.y - 26, Math.max(1, Math.round(dmg)) + '', dmg >= 30 ? '#ffcb3d' : '#ffffff', { f: FS, vy: -40, life: 0.6 }); }
  if (!arAuth(o) || !o.alive || o.inv > 0) return;
  o.hp -= dmg; o.lastHit = 0; o.hurtT = 0.15; o.lastBy = by;
  if (o.local) { shake(2); SND.play('hurt'); }
  if (o.hp <= 0) arDie(o, by, true);
}
function arDie(o, by, broadcast) {
  const A = AM; if (!o.alive) return; o.alive = false; o.hp = 0; o.respT = 3; o.deaths++; o.streak = 0;
  const k = A.fighters.get(by); if (k && k !== o) { k.kills++; k.streak++; if (k.local) { A.rk++; if (o.human) A.rhk++; A.best = Math.max(A.best, k.streak); arStreakBanner(k.streak); arKillFx(o); } }
  if (o.local) { A.rd++; SND.play('lose'); }
  A.feed.unshift({ k: k ? k.cs : '?', v: o.cs, t: 5, me: (k && k.local) || o.local }); if (A.feed.length > 5) A.feed.pop();
  A.fx.burst(o.x, o.y - 8, 34, { c: [o.wpn.col.mid, '#fff', '#ff5a6e', o.wpn.col.core], sp: 150, life: 0.7, s: 2, g: 120 });
  A.fx.add({ x: o.x, y: o.y - 8, life: 0.45, c: '#ffffff', s: 34, t: 'ring' }); A.fx.add({ x: o.x, y: o.y - 8, life: 0.6, c: o.wpn.col.mid, s: 52, t: 'ring' });
  (A.ghosts = A.ghosts || []).push({ x: o.x, y: o.y, eq: o.eq || {}, dir: o.dir, t: 0 });
  if (broadcast && A.room) A.room.send('d', { v: o.id, by });
  if (A.mode === 'duel') arDuelCheck();
}
function arStreakBanner(n) { const t = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 5: 'ON FIRE', 7: 'UNSTOPPABLE', 10: 'GODLIKE' }[n]; if (t) { AM.banner = { t, life: 1.6 }; SND.play('fanfare'); } }
function arExplode(s, x, y) {
  const A = AM, R = s.aoe || 26; A.fx.add({ x, y, life: 0.3, c: s.col.mid, s: R, t: 'ring' }); A.fx.burst(x, y, 14, { c: [s.col.core, s.col.mid, '#fff'], sp: 110, life: 0.4 }); SND.play('boom');
  for (const o of A.fighters.values()) { if (!o.alive || o.id === s.o) continue; const d = Math.hypot(o.x - x, o.y - 6 - y); if (d < R + o.r) arHit(o, s.dmg * (1 - d / (R + o.r) * 0.5), s.o, o.x, o.y - 6); }
}
function arUpdateShots(dt) {
  const A = AM, M = A.M;
  for (const s of A.shots) {
    s.t += dt;
    if (s.home) { let best = null, bd = 160; for (const o of A.fighters.values()) { if (o.id === s.o || !o.alive) continue; const d = Math.hypot(o.x - s.x, o.y - 6 - s.y); if (d < bd) { bd = d; best = o; } } if (best) { const ca = Math.atan2(s.vy, s.vx), ta = Math.atan2(best.y - 6 - s.y, best.x - s.x), sp = Math.hypot(s.vx, s.vy); const na = ca + clamp(angDiff(ca, ta), -s.home * dt, s.home * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; } }
    if (s.stopT !== undefined) { if (s.t > s.stopT) { s.vx = 0; s.vy = 0; } if (s.t > s.stopT + s.arm) { for (const o of A.fighters.values()) if (o.alive && o.id !== s.o && Math.hypot(o.x - s.x, o.y - 6 - s.y) < 16) { s.life = 0; arExplode(s, s.x, s.y); break; } } }
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (M.blocked(nx, ny, 0) || nx < 6 || ny < 6 || nx > M.w - 6 || ny > M.h - 6) { s.life = 0; if (s.aoe) arExplode(s, s.x, s.y); else A.fx.burst(s.x, s.y, 3, { c: [s.col.mid, '#fff'], sp: 40, life: 0.2 }); continue; }
    s.x = nx; s.y = ny; s.life -= dt;
    if (s.stopT === undefined) for (const o of A.fighters.values()) {
      if (!o.alive || o.id === s.o || s.hit.has(o.id)) continue;
      if (Math.hypot(o.x - s.x, o.y - 7 - s.y) < o.r + s.r + 1) {
        s.hit.add(o.id);
        if (s.aoe) { s.life = 0; arExplode(s, s.x, s.y); break; }
        arHit(o, s.dmg, s.o, s.x, s.y);
        if (s.pierce-- <= 0) { s.life = 0; break; }
      }
    }
    if (s.life <= 0 && s.aoe && s.stopT === undefined) arExplode(s, s.x, s.y);
  }
  A.shots = A.shots.filter(s => s.life > 0);
}
// ---------- network ----------
function arSendHi() {
  const A = AM; if (!A.room) return; const me = A.me;
  const eq = {}; for (const k of ['weapon', 'helmet', 'chest', 'boots', 'jetpack', 'o2', 'eyewear', 'headgear', 'back', 'trail', 'skin_armor', 'skin_weapon']) if (me.eq[k]) eq[k] = me.eq[k];
  const msg = { cs: me.cs, eq, w: [me.wpn.cls, +me.wpn.dmg.toFixed(2), me.wpn.rate, me.wpn.spd, me.wpn.rng, me.wpn.pellets, me.wpn.spread, me.wpn.aoe, arColPack(me.wpn.col)], mh: me.maxHp, k: me.kills, dd: me.deaths, lv: me.lvl };
  if (A.host) msg.bots = arBots().map(b => ({ id: b.id, cs: b.cs, eq: b.eq, w: [b.wpn.cls, +b.wpn.dmg.toFixed(2), b.wpn.rate, b.wpn.spd, b.wpn.rng, b.wpn.pellets, b.wpn.spread, b.wpn.aoe, arColPack(b.wpn.col)], mh: b.maxHp, k: b.kills, dd: b.deaths, lv: b.lvl, sk: b.ai ? b.ai.skill : 0.5 }));
  A.room.send('hi', msg);
}
function arWpnFrom(w) { return { cls: w[0], dmg: w[1], rate: w[2], spd: w[3], rng: w[4], pellets: w[5], spread: w[6], aoe: w[7], col: arColUnpack(w[8]) }; }
function arPackF(f) { const o = [Math.round(f.x), Math.round(f.y), Math.round(f.vx), Math.round(f.vy), Math.round(f.aim * 100) / 100, Math.round(f.hp), f.alive ? 1 : 0, f.fired]; f.fired = []; return o; }
function arApplyF(f, a, now) {
  if (!f.local) { f.nx = a[0]; f.ny = a[1]; f.vx = a[2]; f.vy = a[3]; f.aim = a[4]; f.hp = a[5]; if (a[6] && !f.alive) { f.alive = true; f.x = a[0]; f.y = a[1]; } f.seenT = now; }
  for (const s of a[7] || []) if (f.wpn) arSpawnShots(f, s[0], s[1], s[2], s[3], 0.06);
}
function arOnMsg(ev, d, from) {
  const A = AM; if (!A || !d) return; const now = A.t;
  if (ev === 'hi') {
    let f = A.fighters.get(from); if (!f) { f = arFighter({ id: from, human: true, x: -999, y: -999, alive: false }); A.fighters.set(from, f); }
    Object.assign(f, { cs: cleanName(d.cs).slice(0, 12) || '?', eq: netCleanEq(d.eq), wpn: arWpnFrom(d.w), maxHp: clamp(+d.mh || 150, 100, 200), kills: d.k | 0, deaths: d.dd | 0, lvl: d.lv | 0 });
    f.seenT = now;
    if (A.mode === 'duel') { A.oppSeenT = now; A.oppEq = f.eq; }
    if (d.bots && !A.host) {
      const keep = new Set();
      for (const b of d.bots) { keep.add(b.id); let f2 = A.fighters.get(b.id); if (!f2) { f2 = arFighter({ id: b.id, bot: true, alive: false, x: -999, y: -999 }); A.fighters.set(b.id, f2); } Object.assign(f2, { cs: cleanName(b.cs).slice(0, 12), eq: netCleanEq(b.eq), wpn: arWpnFrom(b.w), maxHp: b.mh, kills: b.k | 0, deaths: b.dd | 0, lvl: b.lv | 0, skill: b.sk }); }
      for (const b of arBots()) if (!keep.has(b.id)) A.fighters.delete(b.id);
    }
    return;
  }
  if (ev === 's') {
    const f = A.fighters.get(from); if (f && f.wpn) arApplyF(f, d.p, now); else if (!f) arSendHiSoon();
    if (A.mode === 'duel' && f && f.human) A.oppSeenT = now;
    if (d.b && from === A.hostId && !A.host) for (const bs of d.b) { const b = A.fighters.get(bs[0]); if (b) arApplyF(b, bs.slice(1), now); }
    return;
  }
  if (ev === 'd') { const v = A.fighters.get(d.v); if (v && !v.local && !(v.bot && A.host)) { v.alive = true; arDie(v, d.by, false); } return; }
  if (ev === 'bye') { A.fighters.delete(from); return; }
}
let AR_HI_SOON = 0; function arSendHiSoon() { if (AM && AM.t - AR_HI_SOON > 1) { AR_HI_SOON = AM.t; arSendHi(); } }
function arOnPeers(list) {
  const A = AM; if (!A) return;
  list.sort((a, b) => (a.j - b.j) || (a.id < b.id ? -1 : 1));
  const wasHost = A.host; A.peers = list; A.humans = list.length; A.hostId = list.length ? list[0].id : A.me.id; A.host = A.hostId === A.me.id;
  for (const f of [...A.fighters.values()]) if (f.human && !f.local && !list.some(p => p.id === f.id)) { A.fighters.delete(f.id); }
  if (A.host && !wasHost) for (const b of arBots()) { b.ai = b.ai || { skill: b.skill || 0.5, t: 0, str: 1, tgt: null, think: 0, aimErr: (1 - (b.skill || 0.5)) * 0.32 + 0.03, idle: 0 }; b.x = b.nx || b.x; b.y = b.ny || b.y; }
  if (A.mode !== 'duel') arFillBots();
  arSendHi();
}
function arNet(dt) {
  const A = AM; if (!A.room) return;
  A.sendT -= dt; A.hiT -= dt;
  if (A.hiT <= 0) { A.hiT = 6; arSendHi(); }
  if (A.sendT <= 0) {
    A.sendT = AR_SEND; const msg = { p: arPackF(A.me) };
    if (A.host && A.humans > 1) msg.b = arBots().map(b => [b.id].concat(arPackF(b)));
    else for (const b of arBots()) b.fired = [];
    A.room.send('s', msg);
  }
  // remote pilots: smooth toward where they said they were
  for (const f of A.fighters.values()) {
    if (f.local || (f.bot && A.host)) continue;
    f.nx += f.vx * dt; f.ny += f.vy * dt; const k = Math.min(1, dt * 10); f.x += (f.nx - f.x) * k; f.y += (f.ny - f.y) * k; f.moving = Math.hypot(f.vx, f.vy) > 5; if (f.moving) f.walk += dt * 9;
    const ca = Math.cos(f.aim), sa = Math.sin(f.aim); f.dir = Math.abs(ca) > Math.abs(sa) * 0.9 ? (ca < 0 ? 2 : 3) : (sa < 0 ? 1 : 0); if (f.inv > 0) f.inv -= dt;
  }
}
// ---------- duel flow ----------
function arDuelCheck() {
  const A = AM; if (A.ended) return; const me = A.me, opp = [...A.fighters.values()].find(f => f !== me);
  if (!opp) return;
  if (me.kills >= AR_DUEL_TO || opp.kills >= AR_DUEL_TO) arDuelEnd(me.kills > opp.kills);
}
function arDuelEnd(won) {
  const A = AM; if (A.ended) return; A.ended = true; A.endT = 0; A.result = { won, pending: !A.practice, msg: '' };
  SND.play(won ? 'fanfare' : 'lose'); SND.playSong(null);
  if (A.room) A.room.send('end', {});
  if (!A.practice) arDuelReport(won);
}
function arDuelReport(won, tries = 0) {
  const A = AM, mid = A && A.matchId; if (!mid) return;
  rpc('duel_report', { p_match: mid, p_won: won }).then(r => {
    if (!AM || AM.matchId !== mid) { if (r && r.done && r.trophy_change !== undefined) toast(`${won ? 'WIN' : 'LOSS'}: ${r.trophy_change >= 0 ? '+' : ''}${r.trophy_change} TROPHIES`, COL.gold); return; }
    if (r.pending && tries < 12) { AM.result.msg = 'WAITING FOR THE OTHER PILOT TO CONFIRM...'; setTimeout(() => arDuelReport(won, tries + 1), 3000); return; }
    AM.result.pending = false; AM.result.r = r; if (r.disputed) AM.result.msg = 'RESULTS DID NOT MATCH. NO TROPHIES THIS TIME';
    if (r.trophies !== undefined) NET.arena = Object.assign(NET.arena || {}, { trophies: r.trophies, rank: r.rank });
  }).catch(e => { if (AM && AM.result) { AM.result.pending = false; AM.result.msg = e.message; } });
}
function arReport(final) {
  const A = AM; if (!A || A.practice || !A.server || NET.st !== 'on') return null;
  if (!A.rk && !A.rd && !final) return null;
  const args = { p_server: A.server.id, p_kills: A.rk, p_human_kills: A.rhk, p_deaths: A.rd, p_streak: A.best };
  A.rk = 0; A.rhk = 0; A.rd = 0;
  return rpc('arena_report', args).then(r => { if (r && (r.coins || r.crates)) toast(`ARENA: +${fmt(r.coins)} COINS, +${r.trophies_gained} TROPHIES${r.crates ? `, ${r.crates} CRATE${r.crates > 1 ? 'S' : ''}!` : ''}`, COL.gold); if (r) NET.arena = Object.assign(NET.arena || {}, { trophies: r.trophies, rank: r.rank }); NET.mail = Math.max(NET.mail, 1); }).catch(() => { });
}
// ---------- update ----------
function arUpdate(dt) {
  const A = AM; if (!A) return; const me = A.me;
  if (A.hitT > 0) A.hitT -= dt; if (A.kPop > 0) A.kPop -= dt; if (A.killHit > 0) A.killHit -= dt;
  if (A.slow > 0) { A.slow -= dt; dt *= 0.3; }
  A.t += dt;
  if (kp('Escape')) { if (A.pick) A.pick = 0; else A.menu = !A.menu; SND.play('click'); }
  if (!A.menu && !A.pick && me.alive) { if (kp('KeyQ') || IN.wheel) arSwap(1 - me.wi); if (kp('Digit1')) arSwap(0); if (kp('Digit2')) arSwap(1); }
  if (A.ended) { A.endT += dt; arUpdateShots(dt); A.fx.update(dt); return; }
  if (A.count > 0) { const c0 = Math.ceil(A.count); A.count -= dt; if (Math.ceil(A.count) !== c0 && A.count > 0) SND.play('tick'); if (A.count <= 0) SND.play('fanfare'); }
  // me
  const inp = { mx: (key('KeyD') || key('ArrowRight') ? 1 : 0) - (key('KeyA') || key('ArrowLeft') ? 1 : 0), my: (key('KeyS') || key('ArrowDown') ? 1 : 0) - (key('KeyW') || key('ArrowUp') ? 1 : 0), fire: IN.down && !A.menu && !A.pick && IN.my > 20 && !(IN.my > H - 34 && IN.mx < 92), boost: kp('Space') || kp('ShiftLeft') };
  let ax = IN.mx + A.cam.x, ay = IN.my + A.cam.y;
  if (IN.touch || TOUCH.size) { const t = touchInput(me, A.cam, { player: me }); inp.mx = t.mx; inp.my = t.my; inp.fire = t.fire; inp.boost = t.boost; ax = t.ax; ay = t.ay; }
  const frozen = A.count > 0 || A.menu && false;
  if (me.alive) {
    me.aim = Math.atan2(ay - (me.y - 7), ax - me.x);
    if (inp.boost && !frozen) arBoost(me, inp.mx, inp.my);
    const l = Math.hypot(inp.mx, inp.my) || 1; arMove(me, frozen ? 0 : inp.mx / l, frozen ? 0 : inp.my / l, dt);
    if (inp.fire && !frozen) arTryFire(me, dt); else me.fireCd = Math.max(0, me.fireCd - dt);
  } else { me.respT -= dt; if (me.respT <= 0) arRespawn(me); }
  // AI pilots (when I run them)
  if (A.host) for (const b of arBots()) { if (!b.alive) { b.respT -= dt; if (b.respT <= 0) arRespawn(b); continue; } if (A.count <= 0) arBotAI(b, dt); }
  arUpdateShots(dt); arNet(dt); A.fx.update(dt);
  for (const f of A.feed) f.t -= dt; A.feed = A.feed.filter(f => f.t > 0);
  if (A.banner) { A.banner.life -= dt; if (A.banner.life <= 0) A.banner = null; }
  // camera
  const tx = me.x - W / 2, ty = me.y - H / 2 - 6; A.cam.x = clamp(lerp(A.cam.x, tx, Math.min(1, dt * 8)), -20, A.M.w - W + 20); A.cam.y = clamp(lerp(A.cam.y, ty, Math.min(1, dt * 8)), -30, A.M.h - H + 20);
  if (A.M.w < W) A.cam.x = (A.M.w - W) / 2; if (A.M.h < H) A.cam.y = (A.M.h - H) / 2 - 8;
  // match bookkeeping
  if (A.mode === 'duel') {
    if (A.count <= 0) { A.timer -= dt; if (A.timer <= 0) { const opp = [...A.fighters.values()].find(f => f !== me); if (!opp || me.kills !== opp.kills) arDuelEnd(!opp || me.kills > opp.kills); else A.timer = 30; } }
    if (!A.vsAI && !A.practice && A.t > 12 && (!A.oppSeenT || A.t - A.oppSeenT > 10) && !A.connecting) arDuelFallback();
  } else if (!A.practice && A.server) {
    A.reportT += dt; if (A.reportT > 60) { A.reportT = 0; arReport(false); }
    A.pingT -= dt; if (A.pingT <= 0) { A.pingT = 10; rpc('arena_ping', { p_server: A.server.id }).catch(() => { }); }
  }
}
// ---------- drawing ----------
function arDraw(dt) {
  const A = AM; if (!A) return; const cx = Math.floor(A.cam.x), cy = Math.floor(A.cam.y), M = A.M;
  rect(0, 0, W, H, '#03040b'); ctx.drawImage(A.F.c, -cx, -cy);
  const objs = [];
  for (const b of M.blocks) objs.push([b[1] + b[3], 0, b]);
  for (const f of A.fighters.values()) if (f.alive && f.x > -500) objs.push([f.y, 1, f]);
  objs.sort((a, b) => a[0] - b[0]);
  const wf = { fx: A.fx };
  for (const [, k, o] of objs) {
    if (k === 0) { const x = o[0] - cx, y = o[1] - cy; rect(x, y - 10, o[2], o[3], A.F.side); rect(x, y - 10, o[2], o[3] - 4, A.F.top); rect(x, y - 10, o[2], 1, A.F.edge); rect(x, y + o[3] - 4, o[2], 4, '#05060d'); continue; }
    const f = o; drawPlayer(wf, f, cx, cy, f.eq || {}, {});
    const nx = Math.floor(f.x - cx), ny = Math.floor(f.y - cy) - 34;
    const tag = f.cs; const tw = textW(tag, FS) + 4; ctx.globalAlpha = 0.6; rect(nx - tw / 2, ny - 1, tw, 7, '#000'); ctx.globalAlpha = 1; text(tag, nx, ny, f.local ? COL.gold : COL.cream, FS, 1);
    const bw = f.local ? 26 : 20; rect(nx - bw / 2 - 1, ny + 6, bw + 2, 4, '#000'); bar(nx - bw / 2, ny + 7, bw, 2, f.hp / f.maxHp, f.hp < f.maxHp * 0.3 ? COL.coral : f.local ? COL.gold : '#7dffb0', '#300');
  }
  // shots
  for (const s of A.shots) {
    const x = s.x - cx, y = s.y - cy, c = s.col;
    if (s.stopT !== undefined) { circ(x, y, 2, '#222'); px(x, y, s.t > s.stopT + s.arm && Math.floor(T_NOW * 8) % 2 ? '#fff' : c.mid); continue; }
    if (s.kind === 'launcher') { rect(x - 2, y - 2, 4, 4, c.edge); rect(x - 1, y - 1, 2, 2, c.core); continue; }
    if (s.kind === 'throwing') { const f = Math.floor(s.t * 20) % 2; if (f) { rect(x - 3, y, 7, 1, c.mid); rect(x, y - 3, 1, 7, c.mid); } else { line(x - 2, y - 2, x + 2, y + 2, c.mid); line(x - 2, y + 2, x + 2, y - 2, c.mid); } continue; }
    const L = s.kind === 'railgun' || s.kind === 'sniper' ? 0.03 : 0.02; line(x, y, x - s.vx * L, y - s.vy * L, c.mid); px(x, y, c.core);
  }
  A.fx.draw(cx, cy); arDrawKillFeel(cx, cy, dt);
  // dead overlay
  const me = A.me;
  if (!me.alive && !A.ended) { ctx.globalAlpha = 0.45; rect(0, 0, W, H, '#200008'); ctx.globalAlpha = 1; textO('DOWN!', W / 2, 100, COL.coral, '#000', FB, 1, 3); text(`BACK IN ${Math.ceil(me.respT)}`, W / 2, 130, COL.cream, FB, 1); const k = A.fighters.get(me.lastBy); if (k) text(`BY ${k.cs}`, W / 2, 142, COL.dim, FS, 1); }
  arHUD(); arDrawKillPop(dt);
  if (A.pick) { drawWeaponPicker(A.pickSt = A.pickSt || {}, A.pick, () => { A.pick = 0; }); }
  else if (A.menu && !A.ended) arMenu();
  if (AM && AM.ended) arEndScreen();
  if (AM && !IN.touch && !A.menu && !A.ended && !A.pick) {
    const x = Math.floor(IN.mx), y = Math.floor(IN.my);
    rect(x - 5, y, 3, 1, COL.ink); rect(x + 3, y, 3, 1, COL.ink); rect(x, y - 5, 1, 3, COL.ink); rect(x, y + 3, 1, 3, COL.ink); px(x, y, COL.gold);
    if (A.hitT > 0) { const c = A.killHit > 0 ? COL.coral : '#ffffff', g = A.killHit > 0 ? 6 : 4; line(x - g - 3, y - g - 3, x - g, y - g, c); line(x + g + 3, y - g - 3, x + g, y - g, c); line(x - g - 3, y + g + 3, x - g, y + g, c); line(x + g + 3, y + g + 3, x + g, y + g, c); }
  }
}
function arHUD() {
  const A = AM, me = A.me;
  panel(6, 6, 120, 30, { bg: 'rgba(5,6,15,0.75)', bd: COL.steel });
  text('HP', 12, 11, COL.mute, FS); bar(26, 10, 94, 6, me.hp / me.maxHp, me.hp < me.maxHp * 0.3 ? COL.coral : '#7dffb0', '#200'); text(Math.ceil(me.hp) + '', 73, 11, '#000', FS, 1);
  if (A.kPop > 0) textO(`K ${me.kills}`, 12, 19, COL.gold, '#000', FB); else text(`K ${me.kills}`, 12, 21, COL.cream, FS); text(`D ${me.deaths}`, 46, 21, COL.dim, FS); if (me.streak >= 2) text(`STREAK ${me.streak}`, 120, 21, COL.gold, FS, 2);
  bar(12, 30, 108, 2, me.boostCd > 0 ? 1 - me.boostCd / 2 : 1, me.boostCd > 0 ? COL.steel : COL.cyan, COL.void0);
  // top center: mode / timer / score
  const title = A.mode === 'duel' ? `${A.ranked ? 'RANKED' : 'UNRANKED'} 1V1` : A.practice ? 'PRACTICE ARENA' : (A.server ? A.server.name : 'ARENA');
  text(title, W / 2, 6, COL.dim, FS, 1);
  if (A.mode === 'duel') {
    const opp = [...A.fighters.values()].find(f => f !== me);
    const t = Math.max(0, Math.ceil(A.timer)); textO(`${me.kills}  -  ${opp ? opp.kills : 0}`, W / 2, 14, COL.ink, '#000', FB, 1, 2);
    text(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}   FIRST TO ${AR_DUEL_TO}`, W / 2, 32, COL.mute, FS, 1);
    if (opp) text(opp.cs, W / 2 + 34, 18, COL.coral, FS); text(me.cs, W / 2 - 34, 18, COL.gold, FS, 2);
  } else {
    const list = [...A.fighters.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths); const place = list.indexOf(me) + 1;
    text(`#${place} OF ${list.length}`, W / 2, 14, COL.gold, FB, 1);
    const pilots = A.fighters.size; text(`${pilots} PILOTS`, W / 2, 24, COL.mute, FS, 1);
  }
  if (A.count > 0) textO(Math.ceil(A.count) + '', W / 2, 110, COL.gold, '#000', FB, 1, 4);
  if (A.connecting) text('CONNECTING TO THE SERVER...', W / 2, H - 22, COL.dim, FS, 1);
  // killfeed
  A.feed.forEach((f, i) => { const s = `${f.k} > ${f.v}`; const w = textW(s, FS) + 8; ctx.globalAlpha = Math.min(1, f.t); panel(W - w - 6, 6 + i * 10, w, 9, { bg: f.me ? '#3a2a10' : 'rgba(5,6,15,0.75)', bd: f.me ? COL.gold : COL.void3, flat: true }); text(s, W - w - 2, 8 + i * 10, f.me ? COL.gold : COL.cream, FS); ctx.globalAlpha = 1; });
  // scoreboard (TAB) or mini top 3
  if (key('Tab')) arScoreboard();
  else if (A.mode !== 'duel') {
    const list = [...A.fighters.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths); const top = list.slice(0, 5); if (!top.includes(me)) top.push(me);
    panel(6, 40, 92, 12 + top.length * 8, { bg: 'rgba(5,6,15,0.75)', bd: COL.void3, flat: true }); text('KILLS', 10, 43, COL.gold, FS); text('TAB', 94, 43, COL.mute, FS, 2);
    top.forEach((f, i) => { const yy = 51 + i * 8; const pl = list.indexOf(f) + 1; if (f.local) rect(7, yy - 1, 90, 7, '#3a2a10'); let nm = f.cs; while (textW(nm, FS) > 60 && nm.length > 3) nm = nm.slice(0, -1); text(`${pl}. ${nm}`, 10, yy, f.local ? COL.gold : COL.cream, FS); text(f.kills + '', 94, yy, f.local ? COL.gold : COL.ink, FS, 2); });
  }
  drawArenaSlots(10, H - 26, slot => { A.pick = slot; });
  if (A.banner) { const k = Math.min(1, A.banner.life); ctx.globalAlpha = k; textO(A.banner.t, W / 2, 60, COL.gold, '#000', FB, 1, 2); ctx.globalAlpha = 1; }
  if (button(W - 52, H - 20, 46, 14, 'MENU', { font: FS })) A.menu = !A.menu;
  if (IN.touch || TOUCH.size) { const B = TC.btn; if (B && B.boost) { const b = B.boost; panel(b[0], b[1], b[2], b[3], { bg: 'rgba(5,6,15,0.6)', bd: COL.steel }); text('BOOST', b[0] + b[2] / 2, b[1] + 8, COL.ink, FS, 1); } }
}
function arScoreboard() {
  const A = AM, list = [...A.fighters.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const w = 240, h = 18 + Math.min(20, list.length) * 10, x = (W - w) / 2, y = 40;
  panel(x, y, w, h, { bg: 'rgba(5,6,15,0.92)', bd: COL.steel });
  text('PILOT', x + 8, y + 5, COL.mute, FS); text('KILLS', x + w - 60, y + 5, COL.mute, FS); text('DEATHS', x + w - 30, y + 5, COL.mute, FS);
  list.slice(0, 20).forEach((f, i) => { const yy = y + 14 + i * 10; if (f.local) rect(x + 2, yy - 2, w - 4, 9, '#2a2310'); text(`${i + 1}. ${f.cs}`, x + 8, yy, f.local ? COL.gold : COL.ink, FS); text(f.lvl ? 'LV ' + f.lvl : '', x + 120, yy, COL.mute, FS); text(f.kills + '', x + w - 48, yy, COL.ink, FS, 1); text(f.deaths + '', x + w - 18, yy, COL.dim, FS, 1); });
}
function arMenu() {
  const A = AM; ctx.globalAlpha = 0.6; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  panel(W / 2 - 90, 70, 180, 116, { bg: COL.void1, bd: COL.steel });
  textO(A.mode === 'duel' ? 'LEAVE THE DUEL?' : 'ARENA MENU', W / 2, 80, COL.ink, '#000', FB, 1);
  if (A.mode === 'duel') text('LEAVING NOW COUNTS AS A LOSS', W / 2, 94, COL.coral, FS, 1);
  else text(A.practice ? 'PRACTICE: NO REWARDS' : 'KILLS ARE PAID EVERY MINUTE AND WHEN YOU LEAVE', W / 2, 94, COL.dim, FS, 1);
  if (button(W / 2 - 70, 110, 140, 18, 'KEEP PLAYING', { kind: 'primary' })) A.menu = false;
  if (button(W / 2 + 74, 110, 60, 18, 'LOADOUT', { kind: 'blue', font: FS })) { A.pick = 1; A.menu = false; }
  if (button(W / 2 - 70, 134, 140, 18, A.mode === 'duel' ? 'FORFEIT AND LEAVE' : 'LEAVE ARENA', { kind: 'danger' })) { arLeave(); return; }
  text('WASD MOVE. MOUSE AIM AND FIRE. SPACE BOOSTS. Q OR 1/2 SWAPS WEAPONS', W / 2, 162, COL.mute, FS, 1); text('BOOSTING THROUGH SHOTS DODGES THEM', W / 2, 170, COL.mute, FS, 1);
}
function arEndScreen() {
  const A = AM, r = A.result; ctx.globalAlpha = Math.min(0.75, A.endT); rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const won = r.won; textO(won ? 'VICTORY' : 'DEFEAT', W / 2, 60, won ? COL.gold : COL.coral, '#000', FB, 1, 4);
  const opp = [...A.fighters.values()].find(f => f !== A.me); text(`${A.me.kills} - ${opp ? opp.kills : 0}${opp ? '  VS ' + opp.cs : ''}`, W / 2, 98, COL.cream, FB, 1);
  if (A.practice) text('PRACTICE MATCH: NO TROPHIES', W / 2, 116, COL.dim, FS, 1);
  else if (r.pending) text(r.msg || 'SAVING THE RESULT...', W / 2, 116, COL.dim, FS, 1);
  else if (r.r && r.r.trophy_change !== undefined) {
    const d = r.r.trophy_change; textO(`${d >= 0 ? '+' : ''}${d} TROPHIES`, W / 2, 114, d >= 0 ? COL.gold : COL.coral, '#000', FB, 1, 2);
    const rk = rankOf(r.r.trophies); text(`${rk[0]} RANK  ${fmt(r.r.trophies)} TROPHIES`, W / 2, 134, rk[2], FS, 1); if (r.r.coins) text(`+${fmt(r.r.coins)} COINS SENT TO YOUR MAILBOX`, W / 2, 144, COL.dim, FS, 1);
  } else if (r.msg) text(r.msg, W / 2, 116, COL.dim, FS, 1);
  if (A.endT > 1) {
    if (button(W / 2 - 124, 170, 118, 20, 'PLAY AGAIN', { kind: 'primary' })) { const rk = A.ranked, pr = A.practice; arLeave(true); if (pr) arPractice('duel'); else duelSearch(rk); return; }
    if (button(W / 2 + 6, 170, 118, 20, 'BACK', {})) { arLeave(); return; }
  }
}
// ---------- entry points ----------
function arPractice(mode) { arStart({ mode: mode === 'duel' ? 'duel' : 'practice', practice: true, vsAI: mode === 'duel', seed: 'practice' + (Date.now() % 9), theme: 1 + R0.int(20) }); }
async function arJoinServer(id, code) {
  if (NET.st !== 'on') { toast('SIGN IN TO PLAY ONLINE ARENAS', COL.coral); return; }
  if (!NET.callsign) { openNameUI(false); return; }
  try { await netFlush(); } catch (e) { }
  const s = await rpc('arena_join', { p_server: id || null, p_code: code || null });
  arStart({ mode: 'ffa', server: s, live: true });
}
// matchmaking: look for a real pilot for a few seconds, then match an AI pilot
const DQ = { on: false, ranked: false, t: 0, busy: false, found: null };
function duelSearch(ranked) {
  if (NET.st !== 'on') { toast('SIGN IN FOR 1V1. PRACTICE WORKS OFFLINE', COL.coral); return; }
  if (!NET.callsign) { openNameUI(false); return; }
  Object.assign(DQ, { on: true, ranked: !!ranked, t: 0, busy: false, found: null, poll: 0 }); setScene('hub'); openStation('arena'); HUB.ps.arena.tab = 1;
}
function duelTick(dt) {
  if (!DQ.on) return; DQ.t += dt; DQ.poll -= dt;
  if (DQ.found) { DQ.ft = (DQ.ft || 0) + dt; if (DQ.ft > 2.2) { const f = DQ.found; DQ.on = false; DQ.found = null; arStart({ mode: 'duel', matchId: f.match, ranked: f.ranked, opponent: f.opponent, live: !f.ai, vsAI: !!f.ai, botCard: f.ai ? f.card : null, hostFirst: f.host, seed: f.match }); } return; }
  if (DQ.busy || DQ.poll > 0) return; DQ.busy = true; DQ.poll = 1.5;
  const giveUp = DQ.t > 10 + Math.random() * 4;
  (giveUp ? rpc('duel_cancel').then(r => r.match ? r : rpc('duel_ai', { p_ranked: DQ.ranked }).then(x => Object.assign(x, { ai: true }))) : rpc('duel_find', { p_ranked: DQ.ranked }))
    .then(r => {
      if (!DQ.on) { if (r && r.match && !r.ai) rpc('duel_cancel').catch(() => { }); return; }
      if (r && r.match) {
        if (r.ai) { const R = RNG(hashStr(r.match)); const tro = Math.max(0, ((NET.arena && NET.arena.trophies) || 0) + R.ir(-80, 80)); r.card = { callsign: botName(R), level: Math.max(1, (S.lvl || 1) + R.ir(-4, 6)), trophies: tro }; r.opponent = r.card; }
        DQ.found = r; DQ.ft = 0; SND.play('upgradeHint');
      }
    }).catch(e => { DQ.on = false; toast(e.message, COL.coral); }).finally(() => { DQ.busy = false; });
}
function duelCancel() { DQ.on = false; DQ.found = null; rpc('duel_cancel').catch(() => { }); }
// ---------- the ARENA station panel ----------
const ARL = { list: null, listT: -99, lb: {}, lbT: {}, me: null, meT: -99, counts: null, cT: -99 };
function arenaRefresh(force) {
  if (NET.st !== 'on') return;
  if (force || T_NOW - ARL.listT > 8) { ARL.listT = T_NOW; rpc('arena_list').then(r => { ARL.list = r; }).catch(() => { }); }
  if (force || T_NOW - ARL.meT > 15) { ARL.meT = T_NOW; rpc('my_arena').then(r => { ARL.me = r; NET.arena = r; }).catch(() => { }); }
  if (force || T_NOW - ARL.cT > 20) { ARL.cT = T_NOW; rpc('online_counts').then(r => { ARL.counts = r; NET.counts = r; }).catch(() => { }); }
}
function panelArena(st) {
  if (panelFrame('ARENA', COL.coral)) { if (DQ.on) duelCancel(); return; }
  st.tab = tabs(92, 9, ['FFA', '1V1', 'RANKS'], st.tab || 0, 60);
  const on = NET.st === 'on'; arenaRefresh(false);
  const c = ARL.counts; if (c) text(`${fmt(c.online + c.ai)} ONLINE`, W - 74, 13, '#7dffb0', FS, 2);
  // my rank strip
  const me = ARL.me; const tr = me ? me.trophies : 0, rk = rankOf(tr);
  panel(14, 30, W - 28, 25, { bg: COL.void0, bd: COL.void3, flat: true });
  drawRankBadge(20, 33, rk, 16);
  text(on ? (NET.callsign || 'NO CALLSIGN') : 'OFFLINE', 42, 34, COL.ink, FB); text(on ? `${rk[0]}  ${fmt(tr)} TROPHIES` : 'SIGN IN FOR REWARDS, TROPHIES AND RANKS', 42, 43, rk[2] === 'RAINBOW' ? rainbow(T_NOW) : rk[2], FS);
  if (me) { text(`KILLS ${fmt(me.kills)}  BEST STREAK ${me.best_streak}`, W - 152, 35, COL.dim, FS, 2); text(`1V1 ${me.duels_won}W ${me.duels_lost}L`, W - 152, 43, COL.dim, FS, 2); }
  text('YOUR', W - 142, 35, COL.mute, FS); text('ARENA', W - 142, 41, COL.mute, FS); text('GUNS', W - 142, 47, COL.mute, FS); drawArenaSlots(W - 106, 32, slot => { st.pick = slot; });
  if (!on && button(W - 214, 33, 90, 16, 'SIGN IN', { kind: 'blue', font: FS })) openStation('social');
  if (st.tab === 0) arenaFFA(st, on); else if (st.tab === 1) arenaDuel(st, on); else arenaRanks(st, on);
  if (st.pick) drawWeaponPicker(st.pickSt = st.pickSt || {}, st.pick, () => { st.pick = 0; });
}
function drawRankBadge(x, y, rk, s) {
  const c = rk[2] === 'RAINBOW' ? rainbow(T_NOW) : rk[2];
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s, y + s * 0.3); ctx.lineTo(x + s * 0.85, y + s); ctx.lineTo(x + s * 0.15, y + s); ctx.lineTo(x, y + s * 0.3); ctx.fill();
  ctx.fillStyle = '#0e1630'; ctx.beginPath(); ctx.moveTo(x + s / 2, y + 3); ctx.lineTo(x + s - 3, y + s * 0.35); ctx.lineTo(x + s * 0.78, y + s - 3); ctx.lineTo(x + s * 0.22, y + s - 3); ctx.lineTo(x + 3, y + s * 0.35); ctx.fill();
  text(String(AR_RANKS.indexOf(rk) + 1), x + s / 2, y + s / 2 - 2, c, FS, 1);
}
function arenaFFA(st, on) {
  const x = 14, y = 58;
  text('FREE FOR ALL: UP TO 10 PILOTS PER SERVER. EVERY KILL PAYS COINS AND TROPHIES, SOMETIMES A CRATE', x, y, COL.dim, FS);
  const list = (ARL.list || []);
  if (on && !ARL.list) text('LOADING SERVERS...', x, y + 14, COL.dim, FS);
  list.slice(0, 6).forEach((s, i) => {
    const yy = y + 10 + i * 22; panel(x, yy, 300, 20, { bg: COL.void1, bd: s.private ? COL.magenta : COL.void3, flat: true });
    const pd = planetDef(s.theme || 1); text(s.name, x + 6, yy + 3, COL.ink, FB); text(`${s.private ? 'PRIVATE: ' + (s.owner || '') + (s.code ? '  CODE ' + s.code : '') : pd.name + ' ARENA'}`, x + 6, yy + 12, s.private ? COL.magenta : COL.mute, FS);
    const pilots = s.humans > 0 ? s.humans + arAIFor(s.humans) : 0; text(`${pilots}/${AR_FIGHTERS}`, x + 240, yy + 7, s.humans > 0 ? '#7dffb0' : COL.mute, FS, 2);
    if (button(x + 248, yy + 3, 48, 14, s.humans >= s.cap ? 'FULL' : 'JOIN', { kind: 'primary', font: FS, disabled: !on || s.humans >= s.cap || NET.act })) netDo(() => arJoinServer(s.id));
    if (inBox(x, yy, 240, 20) && s.players && s.players.length) TIP.set('IN HERE NOW: ' + s.players.join(', '));
  });
  // right column: private servers + practice
  // all-time kill leaders
  const kb = ARL.lb.kills; if (on && T_NOW - (ARL.lbT.kills || -99) > 20) { ARL.lbT.kills = T_NOW; rpc('leaderboard', { p_kind: 'kills' }).then(r => { ARL.lb.kills = r; }).catch(() => { }); }
  const ky = y + 10 + Math.min(6, list.length) * 22 + 6; text('TOP KILLERS, ALL TIME', x, ky, COL.gold, FS);
  ((kb && kb.top) || []).slice(0, 5).forEach((r, i) => { const yy = ky + 9 + i * 8; text(`${i + 1}. ${(r.crew ? '[' + r.crew + '] ' : '') + r.callsign}`, x + 4, yy, r.me ? COL.gold : COL.cream, FS); text(fmt(r.value) + ' KILLS', x + 296, yy, COL.dim, FS, 2); });
  if (kb && !(kb.top || []).length) text('NO KILLS YET. GO GET THE FIRST ONE', x + 4, ky + 9, COL.mute, FS);
  if (kb && kb.me && kb.me.value) text(`YOU: #${kb.me.place}`, x + 296, ky, COL.gold, FS, 2);
  const rx = 324, rw = W - 14 - rx; let ry = y + 10;
  text('PRIVATE SERVER', rx, ry, COL.magenta, FS); ry += 8;
  const nm = textField('arenaName', rx, ry, rw - 52, 14, { ph: 'SERVER NAME', max: 16, label: 'Private server name' });
  if (button(rx + rw - 48, ry, 48, 14, 'CREATE', { kind: 'blue', font: FS, disabled: !on || !nm.value.trim() || NET.act })) { const n = nm.value; netDo(() => rpc('arena_create', { p_name: n }).then(r => { setField('arenaName', ''); ARL.listT = -99; return r; }), r => `SERVER MADE. FRIENDS SEE IT. CODE ${r.code}`); }
  ry += 20; text('JOIN WITH A CODE', rx, ry, COL.mute, FS); ry += 8;
  const cd = textField('arenaCode', rx, ry, rw - 52, 14, { ph: 'CODE', max: 6, filter: v => v.toUpperCase().replace(/[^A-Z0-9]/g, ''), label: 'Server code' });
  if (button(rx + rw - 48, ry, 48, 14, 'JOIN', { kind: 'primary', font: FS, disabled: !on || cd.value.length < 6 || NET.act }) || (cd.enter && cd.value.length === 6 && on)) { const v = cd.value; netDo(() => arJoinServer(null, v).then(() => setField('arenaCode', ''))); }
  ry += 26; text('NO INTERNET? WARM UP OFFLINE', rx, ry, COL.mute, FS); ry += 8;
  if (button(rx, ry, rw, 16, 'PRACTICE VS AI', { font: FS })) arPractice('ffa');

}
function arenaDuel(st, on) {
  const x = 14, y = 60;
  if (DQ.on) {
    panel(W / 2 - 120, y + 10, 240, 120, { bg: COL.void1, bd: COL.gold });
    if (DQ.found) { const o = DQ.found.opponent || {}; const rk = rankOf(o.trophies || 0); textO('MATCH FOUND!', W / 2, y + 22, COL.gold, '#000', FB, 1, 2); text('VS', W / 2, y + 48, COL.dim, FS, 1); textO(o.callsign || '???', W / 2, y + 60, COL.ink, '#000', FB, 1, 2); text(`LV ${o.level || 1}  ${rk[0]}`, W / 2, y + 80, rk[2] === 'RAINBOW' ? rainbow(T_NOW) : rk[2], FS, 1); return; }
    textO(`FINDING A ${DQ.ranked ? 'RANKED' : 'UNRANKED'} OPPONENT`, W / 2, y + 24, COL.ink, '#000', FB, 1);
    const n = Math.floor(T_NOW * 3) % 4; text('SEARCHING' + '.'.repeat(n), W / 2, y + 46, COL.dim, FS, 1); text(`${Math.floor(DQ.t)}S`, W / 2, y + 56, COL.mute, FS, 1);
    for (let i = 0; i < 8; i++) { const a = T_NOW * 3 + i / 8 * TAU; ctx.globalAlpha = (i + 1) / 8; rect(W / 2 + Math.cos(a) * 14 - 1, y + 82 + Math.sin(a) * 10, 3, 3, COL.gold); } ctx.globalAlpha = 1;
    if (button(W / 2 - 40, y + 102, 80, 16, 'CANCEL', { font: FS })) duelCancel();
    return;
  }
  text('1V1 DUEL: FIRST TO 5 KILLS, 3 MINUTES. SAME DAMAGE FOR EVERY WEAPON TYPE, SO SKILL DECIDES', x, y - 2, COL.dim, FS);
  const box = (bx, title, sub, kind, fn) => { panel(bx, y + 10, 140, 92, { bg: COL.void1, bd: COL.steel }); textO(title, bx + 70, y + 20, COL.ink, '#000', FB, 1); sub.forEach((l, i) => text(l, bx + 70, y + 36 + i * 8, COL.dim, FS, 1)); if (button(bx + 14, y + 78, 112, 18, 'PLAY', { kind, disabled: !on && kind !== 'def' })) fn(); };
  box(x, 'RANKED', ['WIN +30 TROPHIES', 'LOSE -15', 'CLIMB THE RANKS'], 'primary', () => duelSearch(true));
  box(x + 150, 'UNRANKED', ['NO TROPHIES ON THE LINE', 'COINS FOR PLAYING', 'GOOD FOR WARMING UP'], 'blue', () => duelSearch(false));
  box(x + 300, 'PRACTICE', ['VS AN AI PILOT', 'WORKS OFFLINE', 'NO REWARDS'], 'def', () => arPractice('duel'));
  // rank ladder
  const ly = y + 112; text('RANKS', x, ly, COL.gold, FS);
  AR_RANKS.forEach((r, i) => { const bx = x + i * 56; drawRankBadge(bx, ly + 8, r, 14); text(r[0], bx + 16, ly + 10, r[2] === 'RAINBOW' ? rainbow(T_NOW, i * 40) : r[2], FS); text(fmt(r[1]), bx + 16, ly + 17, COL.mute, FS); });
}
function arenaRanks(st, on) {
  const x = 14, y = 58;
  const kinds = [['trophies', 'TROPHIES'], ['kills', 'KILLS'], ['streak', 'BEST STREAK'], ['duels', 'RANKED WINS']];
  st.lk = st.lk || 0; kinds.forEach(([k, n], i) => { if (button(x + i * 76, y, 72, 14, n, { font: FS, kind: st.lk === i ? 'primary' : 'def' })) st.lk = i; });
  if (!on) { text('SIGN IN TO SEE THE LEADERBOARDS', W / 2, 140, COL.dim, FS, 1); return; }
  const k = kinds[st.lk][0];
  if (T_NOW - (ARL.lbT[k] || -99) > 15) { ARL.lbT[k] = T_NOW; rpc('leaderboard', { p_kind: k }).then(r => { ARL.lb[k] = r; }).catch(() => { }); }
  const lb = ARL.lb[k]; if (!lb) { text('LOADING...', W / 2, 140, COL.dim, FS, 1); return; }
  const rows = lb.top || []; const RH = 10, y0 = y + 22, LH = H - 30 - y0, off = listScroll(st, 'lbscroll', x, y0, W - 28, LH, RH, rows.length);
  rows.slice(off, off + Math.floor(LH / RH)).forEach((r, i) => {
    const yy = y0 + i * RH, place = off + i + 1; if (r.me) rect(x, yy - 2, W - 28, 9, '#2a2310');
    text(`${place}.`, x + 18, yy, place <= 3 ? COL.gold : COL.mute, FS, 2); text((r.crew ? `[${r.crew}] ` : '') + r.callsign, x + 24, yy, r.me ? COL.gold : COL.ink, FS);
    const rk = AR_RANKS.find(q => q[0] === r.rank) || AR_RANKS[0]; text(r.rank, x + 200, yy, rk[2] === 'RAINBOW' ? rainbow(T_NOW) : rk[2], FS); text(fmt(r.value), W - 22, yy, COL.ink, FS, 2);
  });
  if (!rows.length) text('NOBODY HAS PLAYED YET. BE FIRST!', W / 2, 140, COL.dim, FS, 1);
  if (lb.me) text(`YOU: #${lb.me.place} WITH ${fmt(lb.me.value)}`, W / 2, H - 22, COL.gold, FS, 1);
}

// ---------- kill feel ----------
function arKillFx(o) {
  const A = AM; A.killPop = { cs: o.cs, t: 0, coins: A.practice ? 0 : (o.human ? 60 : 20), streak: A.me.streak }; A.kPop = 0.5; A.slow = 0.14; A.hitT = 0.3; A.killHit = 0.3;
  flash(0.12, '#fff6c0'); shake(4); SND.play('kill'); SND.play('coin'); if (A.me.streak >= 3) SND.play('win');
  for (let i = 0; i < 14; i++) A.fx.add({ x: o.x + (Math.random() - 0.5) * 10, y: o.y - 10, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 90, life: 0.9, c: i % 3 ? '#fca311' : '#fff2a0', s: 2, g: 160, t: 'shrink' });
}
function arDrawKillFeel(cx, cy, dt) {
  const A = AM;
  if (A.ghosts) { for (const g of A.ghosts) { g.t += dt; const spr = astroSprite(g.eq, g.dir === 3 ? 3 : 2, 0); ctx.globalAlpha = Math.max(0, 0.7 - g.t); ctx.drawImage(maskOf(spr, '#dff8ff'), Math.floor(g.x - cx - 10), Math.floor(g.y - cy - 25 - g.t * 30)); ctx.globalAlpha = 1; } A.ghosts = A.ghosts.filter(g => g.t < 0.75); }
}
function arDrawKillPop(dt) {
  const A = AM, P = A.killPop; if (!P) return; P.t += dt; if (P.t > 1.6) { A.killPop = null; return; }
  const k = Math.min(1, P.t / 0.12), sc = P.t < 0.12 ? 3 - 2 * k : 1, a = P.t > 1.2 ? 1 - (P.t - 1.2) / 0.4 : 1;
  ctx.globalAlpha = a; text('ELIMINATED', W / 2, 38, COL.coral, FS, 1);
  ctx.save(); ctx.translate(W / 2, 54); ctx.scale(sc, sc); textO(P.cs, 0, -7, '#ffffff', '#000', FB, 1, 2); ctx.restore();
  if (P.coins) text(`+${P.coins} COINS`, W / 2, 68, COL.gold, FS, 1);
  ctx.globalAlpha = 1;
}
// ---------- loadout: swap and pick ----------
function arSwap(i) {
  const A = AM, me = A.me; if (!me.wpns || !me.wpns[i] || i === me.wi) return;
  me.wi = i; const id = me.wpns[i]; me.wpn = arenaWeapon(id, gradeOf(id)); me.eq.weapon = id; me.fireCd = 0.25; SND.play('click');
  if (A.room && A.t - (A.swapHiT || -9) > 0.3) { A.swapHiT = A.t; arSendHi(); } else if (A.room) A.hiT = Math.min(A.hiT, 0.35);
}
function arSetLoadout(slot, id) {
  const L = arenaLoadout();
  if (slot === 1) { if (L.w2 === id) L.w2 = L.w1; L.w1 = id; } else { if (id && L.w1 === id) L.w1 = L.w2 || id; L.w2 = id && id !== L.w1 ? id : null; }
  dirty();
  if (AM) { const me = AM.me; me.wpns = [L.w1, L.w2].filter(Boolean); me.wi = Math.min(me.wi, me.wpns.length - 1); const cur = me.wpns[me.wi]; me.wpn = arenaWeapon(cur, gradeOf(cur)); me.eq.weapon = cur; if (AM.room) arSendHi(); }
}
// a weapon grid over whatever is on screen. st keeps the scroll
function drawWeaponPicker(st, slot, close) {
  ctx.globalAlpha = 0.7; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const x = 40, y = 26, w = W - 80, h = H - 52; panel(x, y, w, h, { bg: COL.void1, bd: COL.gold });
  textO(`ARENA WEAPON ${slot}`, x + 10, y + 7, COL.gold, '#000', FB); text('EVERY TYPE DOES THE SAME DAMAGE PER SECOND HERE. RARITY AND GRADE ADD A LITTLE', x + 10, y + 19, COL.dim, FS);
  if (button(x + w - 56, y + 5, 48, 14, 'CLOSE', { font: FS, kind: 'cream' }) || kp('Escape')) { close(); return; }
  const L = arenaLoadout(); const ids = Object.keys(S.inv).filter(id => getDef(id).cat === 'w').sort((a, b) => getDef(b).r - getDef(a).r || power(getDef(b), effL(b)) - power(getDef(a), effL(a)));
  const c = itemGrid(st, slot === 2 ? [null].concat(ids) : ids, x + 8, y + 30, w - 16, h - 38, { cw: 40, ch: 22, sel: slot === 1 ? L.w1 : L.w2, eqd: [L.w1, L.w2].filter(Boolean) });
  if (c) { arSetLoadout(slot, c === 'NONE' ? null : c); SND.play('pickup'); close(); }
}
function drawArenaSlots(x, y, onClick) {
  const L = arenaLoadout(); const cur = AM ? AM.me.wi : -1;
  [L.w1, L.w2].forEach((id, i) => {
    const bx = x + i * 42, hov = inBox(bx, y, 38, 22), act = cur === i;
    const rc = id ? (getDef(id).r === 6 ? rainbow(T_NOW) : RAR[getDef(id).r].c) : COL.void3;
    panel(bx, y, 38, 22, { bg: act ? COL.void3 : COL.void0, bd: act ? COL.gold : hov ? COL.ink : rc, flat: true });
    if (id) drawItemIn(id, bx + 1, y + 3, 36, 16, { maxSc: 1, noFx: true }); else text('+', bx + 19, y + 7, COL.mute, FB, 1);
    keycap(bx - 3, y - 4, String(i + 1));
    if (hov) { IN.cursor = 'pointer'; TIP.set(id ? { item: id } : 'PICK A SECOND WEAPON'); if (clickIn(bx, y, 38, 22)) onClick(i + 1); }
  });
}
