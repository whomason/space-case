// ===== BOSSES: twenty different fights, each with its own tricks and three phases =====
const bossBase = pi => ((pi - 1) % 20) + 1;
// ---------- world systems bosses use ----------
function BW(w) { return w.bw || (w.bw = { walls: [], lasers: [], haz: [], ring: null, wind: null, sand: 0, lights: [] }); }
function bShot(w, x, y, a, spd, dmg, o = {}) { const s = { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 3, dmg, life: o.life || 4, col: o.col || '#ff5a6e', home: o.home || 0, acc: o.acc || 0, slow: o.slow || 0, big: o.big, saw: o.saw, bounce: o.bounce || 0 }; w.eshots.push(s); return s; }
function bRing(w, x, y, n, spd, dmg, col, off = 0, gap = null, o = {}) { for (let i = 0; i < n; i++) { const a = off + i / n * TAU; if (gap && Math.abs(angDiff(a, gap[0])) < gap[1]) continue; bShot(w, x, y, a, spd, dmg, Object.assign({ col }, o)); } }
function bFan(w, x, y, a, n, spread, spd, dmg, col, o) { for (let i = 0; i < n; i++) bShot(w, x, y, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), spd, dmg, Object.assign({ col }, o || {})); }
function bTele(w, x, y, r, max, dmg, col, o = {}) { const t = Object.assign({ x, y, r, t: 0, max, dmg, col }, o); w.tele.push(t); return t; }
function bLine(w, x, y, a, len, wd, max, dmg, col) { w.tele.push({ line: true, x, y, a, len, wd, t: 0, max, dmg, col }); }
function bLaser(w, o) { const L = Object.assign({ t: 0, warm: 0.7, dur: 2, wd: 8, len: 240, va: 0, dmg: 10, col: '#ff4f6d' }, o); BW(w).lasers.push(L); return L; }
function bWall(w, x, y, r, dur, col, o = {}) { const wl = Object.assign({ x, y, r, t: dur, col, vx: 0, vy: 0, dmg: 0 }, o); BW(w).walls.push(wl); return wl; }
function bHaz(w, x, y, r, dur, dps, col, kind) { BW(w).haz.push({ x, y, r, t: dur, max: dur, dps, col, kind }); }
function segDist(px0, py0, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1; const t = clamp(((px0 - x0) * dx + (py0 - y0) * dy) / L, 0, 1); return Math.hypot(px0 - (x0 + dx * t), py0 - (y0 + dy * t)); }
function updateBossSys(w, dt) {
  const b = w.bw; if (!b) return; const pl = w.player; if (!pl) return;
  for (const wl of b.walls) {
    wl.t -= dt; wl.x += wl.vx * dt; wl.y += wl.vy * dt;
    const d = Math.hypot(pl.x - wl.x, pl.y - wl.y);
    if (d < wl.r + pl.r) { const nx = (pl.x - wl.x) / (d || 1), ny = (pl.y - wl.y) / (d || 1); pl.x = wl.x + nx * (wl.r + pl.r); pl.y = wl.y + ny * (wl.r + pl.r); if (wl.dmg) hurtPlayer(w, wl.dmg, null); }
  }
  b.walls = b.walls.filter(wl => wl.t > 0);
  for (const L of b.lasers) {
    L.t += dt; if (L.follow) { if (L.follow.dead) L.t = 99; else { L.x = L.follow.x + (L.fox || 0); L.y = L.follow.y - (L.foy || 10); } }
    if (L.t > L.warm) L.a += L.va * dt;
    if (L.t > L.warm && L.t < L.warm + L.dur) { const x1 = L.x2 !== undefined ? L.x2 : L.x + Math.cos(L.a) * L.len, y1 = L.y2 !== undefined ? L.y2 : L.y + Math.sin(L.a) * L.len; if (segDist(pl.x, pl.y - 6, L.x, L.y, x1, y1) < L.wd / 2 + pl.r) hurtPlayer(w, L.dmg, null); }
  }
  b.lasers = b.lasers.filter(L => L.t < L.warm + L.dur);
  for (const h of b.haz) {
    h.t -= dt;
    if (Math.hypot(pl.x - h.x, pl.y - h.y) < h.r + pl.r * 0.5) { if (h.kind === 'slow' || h.kind === 'ink') pl.slowT = Math.max(pl.slowT || 0, 0.35); else hurtPlayer(w, h.dps, null); }
    if (R0() < 0.15) w.fx.add({ x: h.x + (R0() - 0.5) * h.r * 1.6, y: h.y + (R0() - 0.5) * h.r, vy: -12, life: 0.6, c: h.col, s: 1, t: 'fade' });
  }
  b.haz = b.haz.filter(h => h.t > 0);
  if (b.wind) { b.wind.t -= dt; if (b.wind.t <= 0) b.wind = null; }
  if (b.ring) { const R = b.ring; R.t += dt; R.r = Math.max(R.min, R.r - R.spd * dt); if (R.t > R.dur) b.ring = null; else if (Math.hypot(pl.x - R.x, pl.y - R.y) > R.r) hurtPlayer(w, R.dmg, null); }
  if (b.sand > 0) b.sand -= dt;
}
function drawBossSys(w, ox, oy) {
  const b = w.bw; if (!b) return;
  for (const h of b.haz) { const x = h.x - ox, y = h.y - oy, k = Math.min(1, h.t / 0.4); ctx.globalAlpha = (h.kind === 'ink' ? 0.7 : 0.4) * k; ellipse(x, y, h.r, h.r * 0.6, h.col); ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = h.col; ctx.beginPath(); ctx.ellipse(Math.floor(x) + 0.5, Math.floor(y) + 0.5, h.r, h.r * 0.6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  if (b.ring) { const R = b.ring; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T_NOW * 8); ctx.strokeStyle = '#ffcb3d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(R.x - ox, R.y - oy, R.r, R.r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 0.12; ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.ellipse(R.x - ox, R.y - oy, R.r, R.r * 0.8, 0, 0, TAU, true); ctx.fill('evenodd'); ctx.globalAlpha = 1; }
  for (const L of b.lasers) {
    const x0 = L.x - ox, y0 = L.y - oy, x1 = (L.x2 !== undefined ? L.x2 : L.x + Math.cos(L.a) * L.len) - ox, y1 = (L.y2 !== undefined ? L.y2 : L.y + Math.sin(L.a) * L.len) - oy;
    if (L.t < L.warm) { ctx.globalAlpha = 0.35 + 0.35 * (Math.floor(T_NOW * 16) % 2); line(x0, y0, x1, y1, L.col); ctx.globalAlpha = 1; }
    else { ctx.globalAlpha = 0.45; ctx.strokeStyle = L.col; ctx.lineWidth = L.wd + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, L.wd * 0.35); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.lineWidth = 1; }
  }
  for (const wl of b.walls) { const x = wl.x - ox, y = wl.y - oy, a = Math.min(1, wl.t * 3); ctx.globalAlpha = a; shadow(x, y + 2, wl.r, wl.r * 0.4, 0.4); rect(x - wl.r + 1, y - wl.r * 2.2, wl.r * 2 - 2, wl.r * 2.2, wl.col); rect(x - wl.r + 2, y - wl.r * 2.2, 2, wl.r * 2.2, '#ffffff'); rect(x - wl.r + 1, y - wl.r * 2.2 - 2, wl.r * 2 - 2, 2, '#ffffff'); ctx.globalAlpha = 1; }
}
function drawBossOverlay(w) { const b = w.bw; if (!b || !(b.sand > 0)) return; ctx.globalAlpha = Math.min(0.55, b.sand * 0.4); rect(0, 0, W, H, '#c8a06a'); ctx.globalAlpha = 1; for (let i = 0; i < 40; i++) px((T_NOW * 300 + i * 53) % W, (i * 37 + Math.sin(T_NOW + i) * 20) % H, '#f2d9a8'); }
function bossBlocksShot(w, s) {
  const b = w.bw; if (b) for (const wl of b.walls) if (Math.hypot(s.x - wl.x, s.y - (wl.y - wl.r) ) < wl.r + s.r) { w.fx.burst(s.x, s.y, 3, { c: [wl.col, '#fff'], sp: 40 }); return true; }
  const e = w.boss; if (!e || e.dead) return false;
  if (e.shards) for (let i = 0; i < e.shards.length; i++) { const sh = e.shards[i]; if (sh.hp <= 0) continue; const sx = e.x + Math.cos(sh.a) * 30, sy = e.y - 10 + Math.sin(sh.a) * 22; if (Math.hypot(s.x - sx, s.y - sy) < 6 + s.r) { sh.hp--; sh.flash = 0.1; if (sh.hp <= 0) { w.fx.burst(sx, sy, 12, { c: ['#bff6ff', '#fff', e.col], sp: 90 }); sh.re = 10; } return true; } }
  if (e.reflect > 0 && Math.hypot(s.x - e.x, s.y - (e.y - 10)) < e.r + s.r + 4) { const pl = w.player; const a = Math.atan2(pl.y - 6 - s.y, pl.x - s.x); bShot(w, s.x, s.y, a, 150, e.dmg * 0.5, { col: '#ffffff' }); w.fx.burst(s.x, s.y, 4, { c: ['#fff', '#bff6ff'], sp: 40 }); return true; }
  return false;
}
// ---------- kits ----------
const BOSS_KITS = {
  1: { n: 'BURROW QUEEN', mv: 'chase', moves: [['burrow', 'eggs', 'spit'], ['burrow', 'eggs', 'spit', 'tunnel'], ['burrow', 'tunnel', 'eggs', 'burrow', 'spit']] },
  2: { n: 'BLOOM MAW', mv: 'root', hp: 1.1, moves: [['vines', 'pods', 'suck'], ['vines', 'petals', 'pods', 'suck'], ['lash', 'petals', 'vines', 'suck', 'pods']] },
  3: { n: 'RIME COLOSSUS', mv: 'slow', hp: 1.15, moves: [['walls', 'breath', 'icicles'], ['stomp', 'walls', 'breath', 'icicles'], ['stomp', 'icicles', 'walls', 'breath', 'stomp']] },
  4: { n: 'CINDER WYRM', mv: 'chase', moves: [['dive', 'fireballs', 'lava'], ['dive', 'lava', 'fireballs', 'tail'], ['dive', 'tail', 'lava', 'dive', 'fireballs']] },
  5: { n: 'BRINE LEVIATHAN', mv: 'chase', moves: [['submerge', 'tidal', 'skimmers'], ['submerge', 'tidal', 'whirlpool', 'skimmers'], ['whirlpool', 'submerge', 'tidal', 'submerge']] },
  6: { n: 'STORM MATRIARCH', mv: 'hover', moves: [['rods', 'gust', 'jellies'], ['rods', 'storm', 'gust', 'jellies'], ['storm', 'rods', 'gust', 'storm']] },
  7: { n: 'THE OSSIFIER', mv: 'slow', moves: [['cage', 'spears', 'raise'], ['cage', 'spears', 'bonestorm', 'raise'], ['bonestorm', 'cage', 'spears', 'cage']] },
  8: { n: 'THE HOLLOW', mv: 'hover', moves: [['shade', 'clones', 'nightmare'], ['shade', 'clones', 'shade', 'nightmare'], ['shade', 'nightmare', 'clones', 'shade']] },
  9: { n: 'TIDECALLER', mv: 'hover', moves: [['orbs', 'tide', 'coral'], ['orbs', 'tide', 'coral', 'tide'], ['tide', 'orbs', 'coral', 'orbs']] },
  10: { n: 'ANVIL TITAN', mv: 'slow', hp: 1.25, moves: [['pound', 'gravity', 'anvils'], ['pound', 'anvils', 'gravity', 'charge'], ['charge', 'pound', 'anvils', 'gravity', 'pound']] },
  11: { n: 'MYCELORD', mv: 'slow', moves: [['shrooms', 'spores', 'roots'], ['roots', 'spores', 'shrooms', 'lords'], ['spores', 'roots', 'shrooms', 'roots']] },
  12: { n: 'SCRAP HYDRA', mv: 'slow', hp: 0.8, moves: [['hydra'], ['hydra', 'saws'], ['saws', 'hydra']] },
  13: { n: 'POLAR SERAPH', mv: 'hover', moves: [['beams', 'feathers', 'halo'], ['beams', 'judgment', 'halo', 'feathers'], ['judgment', 'halo', 'beams', 'judgment']] },
  14: { n: 'SANDWRAITH', mv: 'hover', moves: [['mirage', 'quicksand', 'sandstorm'], ['mirage', 'sandstorm', 'quicksand', 'dashes'], ['dashes', 'mirage', 'sandstorm', 'dashes']] },
  15: { n: 'THUNDER RAM', mv: 'chase', moves: [['ram', 'field', 'bolts'], ['ram', 'bolts', 'ram', 'field'], ['ram', 'field', 'ram', 'bolts', 'ram']] },
  16: { n: 'SHARDMOTHER', mv: 'hover', moves: [['prism', 'mites', 'reflect'], ['prism', 'reflect', 'mites', 'prism'], ['reflect', 'prism', 'mites', 'prism']] },
  17: { n: 'DEPTH WARDEN', mv: 'lurk', moves: [['lunge', 'ink', 'anglerbeam'], ['lunge', 'anglerbeam', 'ink', 'lunge'], ['lunge', 'lunge', 'anglerbeam', 'ink']] },
  18: { n: 'METEOR KING', mv: 'slow', moves: [['bigrock', 'crown', 'firering'], ['bigrock', 'firering', 'crown', 'bigrock'], ['firering', 'bigrock', 'crown', 'bigrock']] },
  19: { n: 'THE TIMEKEEPER', mv: 'hover', moves: [['hands', 'stop', 'rewind'], ['hands', 'stop', 'rewind', 'hands'], ['stop', 'hands', 'rewind', 'stop', 'hands']] },
  20: { n: 'THE WARDEN', mv: 'hover', hp: 1.5, moves: [['grid', 'icicles', 'spears', 'tide'], ['shrink', 'grid', 'cage', 'beams', 'spears'], ['shrink', 'hands', 'anvils', 'grid', 'cage', 'beams']] },
};
function bossKitOf(pi) { return BOSS_KITS[bossBase(pi)]; }
function setupBossKit(w, e) {
  const K = bossKitOf(w.pi); e.kit = bossBase(w.pi); e.phase = 0; e.seq = []; e.r = 18;
  e.hp = e.maxHp = 2400 * w.hpMul * (w.pi > 20 ? 1.5 : 1) * (K.hp || 1); e.dmg = 26 * w.dmgMul; e.coin = 200; e.xp = 260;
  e.spd = K.mv === 'chase' ? 34 : K.mv === 'slow' ? 18 : K.mv === 'root' ? 0 : 30;
  if (e.kit === 4) e.trail = [];
  if (e.kit === 16) e.shards = [0, 1, 2, 3].map(i => ({ a: i / 4 * TAU, hp: 3, flash: 0, re: 0 }));
  if (e.kit === 17) e.lures = [{ x: e.x + 60, y: e.y, vx: 0, vy: 0 }];
  if (e.kit === 12) spawnHeads(w, e, 1);
}
function nextMove(e) {
  const K = BOSS_KITS[e.kit]; if (!e.seq.length) { e.seq = K.moves[e.phase].slice(); for (let i = e.seq.length - 1; i > 0; i--) { const j = R0.int(i + 1); [e.seq[i], e.seq[j]] = [e.seq[j], e.seq[i]]; } if (e.seq[0] === e.last && e.seq.length > 1) e.seq.push(e.seq.shift()); }
  e.last = e.seq.shift(); return e.last;
}
function kitAI(w, e, dt, d, a) {
  const K = BOSS_KITS[e.kit], pl = w.player;
  e.mx = 0; e.my = 0; e.windup = false;
  const ph = e.hp < e.maxHp * 0.28 ? 2 : e.hp < e.maxHp * 0.62 ? 1 : 0;
  if (ph > e.phase && e.st !== 'intro') {
    e.phase = ph; e.st = 'phase'; e.pt = 0; e.invuln = true; e.hidden = false; e.seq = [];
    w.fx.text(e.x, e.y - e.r - 26, ph === 1 ? 'PHASE 2' : 'FINAL PHASE', COL.coral, { f: FB, sc: 2, life: 1.4 }); if (w.sndOn) SND.play('bossroar'); if (!w.demo) shake(8);
    w.fx.add({ x: e.x, y: e.y - 10, life: 0.6, c: e.col, s: 90, t: 'ring' });
  }
  if (e.st === 'phase') { e.pt += dt; if (e.pt > 1.3) { e.invuln = false; e.st = 'idle'; e.cd = 0.4; } return; }
  bossPassive(w, e, dt);
  if (e.st === 'intro') { e.cd -= dt; if (e.cd <= 0) { e.st = 'idle'; e.cd = 1; } return; }
  const enr = 1 + e.phase * 0.22;
  if (e.st === 'idle') {
    bossMove(w, e, dt, d, a, K.mv);
    e.cd -= dt * enr; if (e.cd <= 0) { e.st = nextMove(e); e.pt = 0; e.n = 0; }
    return;
  }
  e.pt += dt * enr;
  const done = (cd = 1.1, core = 0) => { e.st = 'idle'; e.cd = cd; e.hidden = false; if (e.kit !== 12) e.invuln = false; if (core) { e.coreT = core; w.fx.text(e.x, e.y - e.r - 22, 'CORE EXPOSED', COL.gold, { f: FB, life: 1 }); } };
  const fn = BOSS_MOVES[e.st]; if (fn) fn(w, e, dt, pl, a, d, done, enr); else done();
}
function bossMove(w, e, dt, d, a, mv) {
  const pl = w.player;
  if (mv === 'root') return;
  if (mv === 'hover' || mv === 'lurk') { const want = mv === 'lurk' ? 110 : 120; const ra = a + Math.PI + Math.sin(e.t * 0.7) * 1.2; const tx = pl.x + Math.cos(ra) * want, ty = pl.y + Math.sin(ra) * want * 0.75; const dd = Math.hypot(tx - e.x, ty - e.y) || 1; e.mx = (tx - e.x) / dd * Math.min(1, dd / 30); e.my = (ty - e.y) / dd * Math.min(1, dd / 30); return; }
  const k = mv === 'slow' ? 0.8 : 1; if (d > 50) { e.mx = Math.cos(a) * k; e.my = Math.sin(a) * k; }
}
function bossPassive(w, e, dt) {
  const pl = w.player;
  if (e.kit === 4) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 90) e.trail.pop(); for (let i = 12; i < e.trail.length; i += 12) { const [sx, sy] = e.trail[i]; if (Math.hypot(pl.x - sx, pl.y - sy) < 10) hurtPlayer(w, e.dmg * 0.6, e); } }
  if (e.kit === 9) { const pyl = w.ents.filter(o => !o.dead && o.part && o.owner === e && o.pk === 'coral'); if (pyl.length && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.012 * pyl.length * dt); if (R0() < 0.2) for (const p of pyl) w.zaps.push({ x0: p.x, y0: p.y - 10, x1: e.x, y1: e.y - 10, t: 0, col: '#7dffb0' }); } }
  if (e.kit === 12) { const heads = w.ents.filter(o => !o.dead && o.part && o.owner === e); e.invuln = heads.length > 0; if (!heads.length && !e.exposeT) { e.exposeT = 7; e.coreT = 7; w.fx.text(e.x, e.y - 40, 'BODY EXPOSED', COL.gold, { f: FB, life: 1.2 }); } if (e.exposeT > 0) { e.exposeT -= dt; if (e.exposeT <= 0) { e.exposeT = 0; spawnHeads(w, e, e.phase >= 1 ? 0.7 : 0.5); } } for (const h of heads) hydraHead(w, e, h, dt); }
  if (e.kit === 16) { for (const sh of e.shards) { sh.a += dt * (1.2 + e.phase * 0.5); if (sh.flash > 0) sh.flash -= dt; if (sh.hp <= 0) { sh.re -= dt; if (sh.re <= 0) sh.hp = 3; } } if (e.phase >= 1 && e.shards.length < 6) { e.shards.push({ a: 0, hp: 3, flash: 0, re: 0 }, { a: Math.PI, hp: 3, flash: 0, re: 0 }); } if (e.reflect > 0) e.reflect -= dt; }
  if (e.kit === 17) { BW(w).lights = []; const want = e.phase >= 1 ? 2 : 1; while (e.lures.length < want) e.lures.push({ x: e.x, y: e.y, vx: 0, vy: 0 }); for (const L of e.lures) { const t = e.t * 0.5 + e.lures.indexOf(L) * 3; const tx = pl.x + Math.cos(t) * 90, ty = pl.y + Math.sin(t * 1.3) * 60; L.x += (tx - L.x) * dt * 1.2; L.y += (ty - L.y) * dt * 1.2; BW(w).lights.push(L); } }
  if (e.kit === 18) { e.metT = (e.metT || 1.5) - dt; if (e.metT <= 0) { e.metT = 1.5 - e.phase * 0.4; const aa = R0() * TAU, rr = R0() * 90; bTele(w, pl.x + Math.cos(aa) * rr, pl.y + Math.sin(aa) * rr, 16, 1.0, e.dmg * 0.7, e.col, { meteor: true }); } }
  if (e.kit === 19 && e.markHp) { e.markT -= dt; if (e.markT <= 0) { const dealt = e.markHp - e.hp; if (dealt < e.maxHp * 0.07) { e.hp = Math.min(e.maxHp, e.markHp); w.fx.text(e.x, e.y - 40, 'REWOUND!', '#7fe9ff', { f: FB, life: 1.2 }); if (w.sndOn) SND.play('lose'); } else { e.coreT = 1.8; w.fx.text(e.x, e.y - 40, 'REWIND BROKEN', COL.gold, { f: FB, life: 1.2 }); } e.markHp = 0; } }
}
function spawnHeads(w, e, hpk) {
  const kinds = ['laser', 'missile', 'flame'];
  kinds.forEach((k, i) => { const h = spawnEnemy(w, 'crawler', e.x, e.y); Object.assign(h, { arch: 'part', part: true, pk: k, owner: e, ox: (i - 1) * 26, oy: -26 + Math.abs(i - 1) * 10, hp: e.maxHp * 0.22 * hpk, maxHp: e.maxHp * 0.22 * hpk, r: 9, spd: 0, cd: 1 + i, coin: 20, xp: 20, col: e.col, col2: '#ff9a3d' }); });
  e.exposeT = 0; w.fx.text(e.x, e.y - 50, 'HEADS REGROW', COL.coral, { f: FS, life: 1 });
}
function hydraHead(w, e, h, dt) {
  const pl = w.player; h.x = e.x + h.ox + Math.sin(e.t * 2 + h.ox) * 3; h.y = e.y + h.oy + Math.cos(e.t * 1.7 + h.ox) * 2;
  h.cd -= dt * (1 + e.phase * 0.25); if (h.cd > 0) return; const a = Math.atan2(pl.y - 6 - h.y, pl.x - h.x);
  if (h.pk === 'laser') { h.cd = 4.5; bLaser(w, { follow: h, fox: 0, foy: 4, a: a - 0.6, va: 0.55, warm: 0.8, dur: 2, len: 260, wd: 6, dmg: e.dmg * 0.8, col: '#ff4f6d' }); }
  else if (h.pk === 'missile') { h.cd = 3.2; for (let i = 0; i < 3; i++) bShot(w, h.x, h.y - 4, a + (i - 1) * 0.6, 70, e.dmg * 0.7, { col: '#ffcb3d', home: 1.6, life: 5, r: 3 }); }
  else { h.cd = 2.2; if (Math.hypot(pl.x - h.x, pl.y - h.y) < 150) bFan(w, h.x, h.y - 4, a, 7, 0.8, 140, e.dmg * 0.5, '#ff7a2e', { life: 0.9 }); }
}
// ---------- the moves ----------
const BOSS_MOVES = {
  // 1 burrow queen
  burrow(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.hidden = true; e.invuln = true; w.fx.burst(e.x, e.y, 18, { c: ['#7a6450', '#c89a6a', e.col], sp: 90, g: 200 }); }
    if (e.n === 1) { const dd = Math.hypot(pl.x - e.x, pl.y - e.y) || 1; e.x += (pl.x - e.x) / dd * 170 * dt; e.y += (pl.y - e.y) / dd * 170 * dt; if (R0() < 0.6) w.fx.add({ x: e.x + (R0() - 0.5) * 16, y: e.y, vy: -20, life: 0.3, c: '#7a6450', s: 2, g: 100 }); if (e.pt > 1.1) { e.n = 2; e.tx = pl.x; e.ty = pl.y; bTele(w, e.tx, e.ty, 34, 0.75, e.dmg * 1.3, e.col); } }
    if (e.n === 2 && e.pt > 1.9) { e.n = 3; e.x = e.tx; e.y = e.ty; e.hidden = false; e.invuln = false; bRing(w, e.x, e.y - 6, 14 + e.phase * 4, 95, e.dmg * 0.6, e.col, R0()); w.fx.burst(e.x, e.y, 30, { c: ['#7a6450', '#c89a6a', '#fff'], sp: 140, g: 200 }); if (!w.demo) shake(5); }
    if (e.n === 3 && e.pt > 2.4) { if (e.phase >= 1 && !e.again) { e.again = true; e.n = 0; e.pt = 0; } else { e.again = false; done(1.3, 1.3); } }
  },
  eggs(w, e, dt, pl, a, d, done) {
    e.windup = e.pt < 0.7;
    if (e.n === 0 && e.pt > 0.7) { e.n = 1; const k = 2 + e.phase; for (let i = 0; i < k; i++) { const aa = R0() * TAU; const g = spawnEnemy(w, 'nest', e.x + Math.cos(aa) * 50, e.y + Math.sin(aa) * 40); g.egg = true; g.hp = g.maxHp = 70 * w.hpMul; g.r = 6; g.spawnT = 4; g.coin = 3; } w.fx.text(e.x, e.y - 40, 'EGGS! BREAK THEM', COL.coral, { f: FS, life: 1 }); }
    if (e.pt > 1.4) done(0.9);
  },
  spit(w, e, dt, pl, a, d, done) {
    if (e.n < 3 && e.pt > e.n * 0.35) { const ox = (R0() - 0.5) * 50, oy = (R0() - 0.5) * 40; const tx = pl.x + ox, ty = pl.y + oy; bTele(w, tx, ty, 18, 0.9, e.dmg * 0.8, '#8cff3a', { onDone: () => bHaz(w, tx, ty, 20, 3.5, e.dmg * 0.4, '#8cff3a', 'poison') }); e.n++; }
    if (e.pt > 1.8) done(1);
  },
  tunnel(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.ta = a; e.n = 1; e.hidden = true; e.invuln = true; }
    if (e.n >= 1 && e.n < 10 && e.pt > 0.3 + (e.n - 1) * 0.13) { const dd = 26 * e.n; bTele(w, e.x + Math.cos(e.ta) * dd, e.y + Math.sin(e.ta) * dd, 16, 0.55, e.dmg, '#c89a6a'); e.n++; }
    if (e.pt > 2.2) { e.x += Math.cos(e.ta) * 200; e.y += Math.sin(e.ta) * 200; if (w.collide) w.collide(e); done(1.1, 1); }
  },
  // 2 bloom maw
  vines(w, e, dt, pl, a, d, done) {
    if (e.n < 2 && e.pt > e.n * 0.9) { const n = 5 + e.phase * 2; for (let i = 0; i < n; i++) bLine(w, e.x, e.y - 8, a + (i / (n - 1) - 0.5) * 1.2 + e.n * 0.12, 240, 10, 0.85, e.dmg * 0.9, '#7bd389'); e.n++; }
    if (e.pt > 2.2) done(1, 0.8);
  },
  pods(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; for (let i = 0; i < 5 + e.phase; i++) { const aa = R0() * TAU, rr = 20 + R0() * 70; const tx = pl.x + Math.cos(aa) * rr, ty = pl.y + Math.sin(aa) * rr; bTele(w, tx, ty, 20, 1 + i * 0.1, e.dmg * 0.7, '#c27bff', { onDone: () => bHaz(w, tx, ty, 22, 4, e.dmg * 0.35, '#b7ff5a', 'poison') }); } }
    if (e.pt > 1.9) done(1);
  },
  suck(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; BW(w).wind = { x: e.x, y: e.y, str: 62 + e.phase * 12, t: 2.2 }; bTele(w, e.x, e.y, 40, 2.2, e.dmg * 1.6, e.col); w.fx.text(e.x, e.y - 40, 'RUN!', COL.coral, { f: FB, life: 1 }); }
    if (R0() < 0.8) { const aa = R0() * TAU; w.fx.add({ x: e.x + Math.cos(aa) * 110, y: e.y + Math.sin(aa) * 80, vx: -Math.cos(aa) * 200, vy: -Math.sin(aa) * 150, life: 0.5, c: '#b7ff5a', s: 1 }); }
    if (e.pt > 2.6) done(1.2, 1.2);
  },
  petals(w, e, dt, pl, a, d, done) { if (e.pt > e.n * 0.12 && e.n < 22) { const ba = e.pt * 2.4; for (let k = 0; k < 3; k++) bShot(w, e.x, e.y - 10, ba + k * TAU / 3, 85, e.dmg * 0.5, { col: '#ff9fd6' }); e.n++; } if (e.pt > 3) done(1); },
  lash(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let k = 0; k < 2; k++) bLaser(w, { x: e.x, y: e.y - 8, a: a + k * Math.PI, va: 1.1, warm: 0.9, dur: 2.6, len: 230, wd: 8, dmg: e.dmg, col: '#7bd389' }); } if (e.pt > 3.6) done(1, 1); },
  // 3 rime colossus
  walls(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; const n = 8, gap = R0.int(n); for (let i = 0; i < n; i++) { if (i === gap) continue; const aa = i / n * TAU; bWall(w, pl.x + Math.cos(aa) * 52, pl.y + Math.sin(aa) * 40, 7, 4.5, '#9fefff'); } w.fx.text(pl.x, pl.y - 40, 'ICE WALLS', '#bff6ff', { f: FS, life: 0.8 }); }
    if (e.n === 1 && e.pt > 0.9) { e.n = 2; for (let i = 0; i < 6; i++) { const aa = R0() * TAU, rr = R0() * 40; bTele(w, pl.x + Math.cos(aa) * rr, pl.y + Math.sin(aa) * rr, 14, 0.9, e.dmg * 0.8, '#bff6ff', { meteor: true }); } }
    if (e.pt > 2.2) done(1);
  },
  breath(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.6; if (e.pt > 0.6 + e.n * 0.35 && e.n < 3) { bFan(w, e.x, e.y - 12, a, 9, 1.0, 110, e.dmg * 0.55, '#bff6ff', { slow: 1.6 }); e.n++; } if (e.pt > 1.9) done(1.1, 1); },
  icicles(w, e, dt, pl, a, d, done) { if (e.n < 12 && e.pt > e.n * 0.12) { const aa = R0() * TAU, rr = R0() * 80; bTele(w, pl.x + Math.cos(aa) * rr, pl.y + Math.sin(aa) * rr, 15, 0.95, e.dmg * 0.75, '#bff6ff', { meteor: true }); e.n++; } if (e.pt > 2.4) done(1); },
  stomp(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.8; e.shieldFront = true; if (e.n < 2 && e.pt > 0.8 + e.n * 0.6) { bRing(w, e.x, e.y - 4, 30, 80, e.dmg * 0.6, '#9fefff', R0(), [R0() * TAU, 0.45]); e.n++; if (!w.demo) shake(5); } if (e.pt > 2.2) done(1.2, 1); },
  // 4 cinder wyrm
  dive(w, e, dt, pl, a, d, done) {
    const reps = 3 + e.phase;
    if (e.n === 0) { e.ca = a; e.n = 1; bLine(w, e.x, e.y, e.ca, 220, 14, 0.6, 0, e.col); }
    e.windup = e.pt < 0.6;
    if (e.pt > 0.6 && e.pt < 1.15) { e.x += Math.cos(e.ca) * 320 * dt; e.y += Math.sin(e.ca) * 320 * dt; if (w.collide) w.collide(e); e.fireT = (e.fireT || 0) - dt; if (e.fireT <= 0) { e.fireT = 0.07; bHaz(w, e.x, e.y, 9, 2.5, e.dmg * 0.4, '#ff7a2e', 'fire'); } }
    if (e.pt > 1.35) { if (e.n < reps) { e.pt = 0; e.n++; e.ca = Math.atan2(pl.y - e.y, pl.x - e.x); bLine(w, e.x, e.y, e.ca, 220, 14, 0.55, 0, e.col); } else done(1.2, 1.2); }
  },
  fireballs(w, e, dt, pl, a, d, done) { if (e.pt > e.n * 0.09 && e.n < 30) { const ba = e.pt * 3; for (let k = 0; k < 4; k++) bShot(w, e.x, e.y - 8, ba + k * TAU / 4, 80, e.dmg * 0.5, { col: '#ff9a3d' }); e.n++; } if (e.pt > 3) done(1); },
  lava(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let i = 0; i < 6 + e.phase * 2; i++) { const aa = R0() * TAU, rr = 10 + R0() * 80; const tx = pl.x + Math.cos(aa) * rr, ty = pl.y + Math.sin(aa) * rr; bTele(w, tx, ty, 18, 1.1, e.dmg * 0.8, '#ff5a1e', { onDone: () => bHaz(w, tx, ty, 18, 4, e.dmg * 0.4, '#ff7a2e', 'fire') }); } } if (e.pt > 1.6) done(1); },
  tail(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; bLaser(w, { follow: e, a: a - 1.6, va: 2.2, warm: 0.7, dur: 1.4, len: 95, wd: 12, dmg: e.dmg, col: '#ff7a2e' }); } if (e.pt > 2.4) done(1, 1); },
  // 5 brine leviathan
  submerge(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.hidden = true; e.invuln = true; w.fx.burst(e.x, e.y, 20, { c: ['#9fe7ff', '#fff'], sp: 80, g: 150 }); }
    if (e.n === 1) { const dd = Math.hypot(pl.x - e.x, pl.y - e.y) || 1; e.x += (pl.x - e.x) / dd * 150 * dt; e.y += (pl.y - e.y) / dd * 150 * dt; if (e.pt > 1.4) { e.n = 2; e.tx = pl.x; e.ty = pl.y; bTele(w, e.tx, e.ty, 38, 0.8, e.dmg * 1.4, '#9fe7ff'); } }
    if (e.n === 2 && e.pt > 2.2) { e.n = 3; e.x = e.tx; e.y = e.ty; e.hidden = false; e.invuln = false; bRing(w, e.x, e.y - 6, 18, 100, e.dmg * 0.55, '#9fe7ff', R0()); w.fx.burst(e.x, e.y, 34, { c: ['#9fe7ff', '#fff', e.col], sp: 150, g: 200 }); if (!w.demo) shake(6); }
    if (e.n === 3 && e.pt > 2.8) done(1.2, 1.3);
  },
  tidal(w, e, dt, pl, a, d, done) {
    if (e.n < 3 && e.pt > e.n * 1.1) { const side = R0() < 0.5 ? -1 : 1, gy = (R0() - 0.5) * 140; for (let yy = -130; yy <= 130; yy += 16) { if (Math.abs(yy - gy) < 26) continue; bShot(w, pl.x + side * 230, pl.y + yy, side > 0 ? Math.PI : 0, 115, e.dmg * 0.6, { col: '#9fe7ff', r: 4, life: 4.2 }); } e.n++; }
    if (e.pt > 3.6) done(1, 0.8);
  },
  skimmers(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.6; if (e.n === 0 && e.pt > 0.6) { e.n = 1; for (let i = 0; i < 3 + e.phase; i++) { const aa = i / 3 * TAU; spawnEnemy(w, 'dasher', e.x + Math.cos(aa) * 40, e.y + Math.sin(aa) * 30); } } if (e.pt > 1.2) done(1); },
  whirlpool(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BW(w).wind = { x: e.x, y: e.y, str: 48, t: 3.2 }; } if (e.pt > e.n * 0.18 && e.n < 18) { const ba = e.pt * 1.8; for (let k = 0; k < 4; k++) bShot(w, e.x, e.y - 8, ba + k * TAU / 4, 70, e.dmg * 0.5, { col: '#9fe7ff' }); e.n++; } if (e.pt > 3.4) done(1.2, 1); },
  // 6 storm matriarch
  rods(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.rods = []; const base = R0() * TAU; for (let i = 0; i < 3 + (e.phase > 1 ? 1 : 0); i++) { const aa = base + i / (3 + (e.phase > 1 ? 1 : 0)) * TAU; const rx = pl.x + Math.cos(aa) * 70, ry = pl.y + Math.sin(aa) * 55; e.rods.push([rx, ry]); bWall(w, rx, ry, 4, 4.2, '#fff25a'); } }
    if (e.n === 1 && e.pt > 1.0) { e.n = 2; const R = e.rods; for (let i = 0; i < R.length; i++) { const p = R[i], q = R[(i + 1) % R.length]; bLaser(w, { x: p[0], y: p[1] - 8, x2: q[0], y2: q[1] - 8, warm: 0.6, dur: 2.4, wd: 6, dmg: e.dmg * 0.9, col: '#fff25a' }); } }
    if (e.pt > 4) done(1);
  },
  gust(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BW(w).wind = { x: e.x, y: e.y, str: -90, t: 2 }; } if (e.n < 4 && e.pt > 0.3 + (e.n - 1) * 0.5) { bFan(w, e.x, e.y - 12, Math.atan2(pl.y - e.y, pl.x - e.x), 5, 0.7, 120, e.dmg * 0.5, '#dff8ff'); e.n++; } if (e.pt > 2.4) done(1); },
  jellies(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.5) { e.n = 1; for (let i = 0; i < 4 + e.phase * 2; i++) spawnEnemy(w, 'swarm', e.x + (R0() - 0.5) * 50, e.y + (R0() - 0.5) * 40); } if (e.pt > 1) done(0.8); },
  storm(w, e, dt, pl, a, d, done) { if (e.n < 9 && e.pt > e.n * 0.42) { bTele(w, pl.x + (R0() - 0.5) * 20, pl.y + (R0() - 0.5) * 16, 18, 0.6, e.dmg * 0.9, '#fff25a', { bolt: true }); e.n++; } if (e.pt > 4.2) done(1.2, 1); },
  // 7 ossifier
  cage(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; const n = 12, gap = R0.int(n); for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n) continue; const aa = i / n * TAU; const x0 = pl.x + Math.cos(aa) * 80, y0 = pl.y + Math.sin(aa) * 62; bWall(w, x0, y0, 6, 2.6, '#efe6d0', { vx: -Math.cos(aa) * 22, vy: -Math.sin(aa) * 17, dmg: e.dmg * 0.6 }); } w.fx.text(pl.x, pl.y - 44, 'FIND THE GAP', '#efe6d0', { f: FS, life: 1 }); }
    if (e.pt > 2.8) done(1, 1);
  },
  spears(w, e, dt, pl, a, d, done) { if (e.n < 3 + e.phase && e.pt > e.n * 0.55) { const aa = Math.atan2(pl.y - e.y, pl.x - e.x); bLine(w, e.x, e.y - 8, aa, 300, 9, 0.55, e.dmg * 1.2, '#efe6d0'); e.n++; } if (e.pt > 0.55 * (3 + e.phase) + 0.6) done(1); },
  raise(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.7; if (e.n === 0 && e.pt > 0.7) { e.n = 1; for (let i = 0; i < 4 + e.phase; i++) { const aa = R0() * TAU; const s = spawnEnemy(w, 'crawler', pl.x + Math.cos(aa) * 90, pl.y + Math.sin(aa) * 70); s.hp = s.maxHp = s.hp * 1.5; w.fx.burst(s.x, s.y, 8, { c: ['#efe6d0', '#fff'], sp: 50 }); } } if (e.pt > 1.3) done(1); },
  bonestorm(w, e, dt, pl, a, d, done) { if (e.pt > e.n * 0.1 && e.n < 30) { const ba = e.pt * 3.6; for (let k = 0; k < 3; k++) bShot(w, e.x, e.y - 10, ba + k * TAU / 3, 95, e.dmg * 0.5, { col: '#efe6d0' }); e.n++; } if (e.pt > 3.1) done(1, 1); },
  // 8 the hollow
  shade(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.hidden = true; e.invuln = true; w.fx.burst(e.x, e.y - 10, 16, { c: ['#000', e.col], sp: 60 }); }
    if (e.n === 1 && e.pt > 0.6) { e.n = 2; const ba = pl.aim + Math.PI; e.x = pl.x + Math.cos(ba) * 30; e.y = pl.y + Math.sin(ba) * 22; e.hidden = false; e.invuln = false; w.fx.burst(e.x, e.y - 10, 16, { c: ['#000', e.col], sp: 60 }); }
    if (e.n === 2) { e.windup = true; if (e.pt > 0.95) { e.n = 3; bTele(w, e.x, e.y, 32, 0.05, e.dmg * 1.3, e.col); } }
    if (e.n === 3 && e.pt > 1.3) { if (e.phase >= 1 && !e.again) { e.again = true; e.n = 0; e.pt = 0; } else { e.again = false; done(1, 1); } }
  },
  clones(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; const k = 3 + e.phase; const spots = []; for (let i = 0; i <= k; i++) { const aa = i / (k + 1) * TAU + R0(); spots.push([pl.x + Math.cos(aa) * 100, pl.y + Math.sin(aa) * 75]); } const real = R0.int(spots.length); spots.forEach((s, i) => { if (i === real) { e.x = s[0]; e.y = s[1]; return; } const c = spawnEnemy(w, 'crawler', s[0], s[1]); Object.assign(c, { arch: 'clone', clone: true, owner: e, hp: 1, maxHp: 1, r: 14, spd: 0, life: 9, cd: 1 + R0() * 2, coin: 0, xp: 0, col: e.col }); }); w.fx.burst(e.x, e.y, 20, { c: ['#000', e.col], sp: 80 }); }
    if (e.pt > 1.2) done(1.4);
  },
  nightmare(w, e, dt, pl, a, d, done) { if (e.n < 8 + e.phase * 2 && e.pt > e.n * 0.2) { bShot(w, e.x, e.y - 12, a + (R0() - 0.5) * 2, 55, e.dmg * 0.6, { col: '#b45cff', home: 1.4, life: 6, r: 4 }); e.n++; } if (e.pt > 2.4) done(1); },
  // 9 tidecaller
  orbs(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.orbs = 6 + e.phase * 2; }
    e.windup = e.pt < 1.2; if (e.pt > 1.2 && e.n - 1 < e.orbs && e.pt > 1.2 + (e.n - 1) * 0.22) { const k = e.n - 1; const oa = T_NOW * 3 + k / e.orbs * TAU; bShot(w, e.x + Math.cos(oa) * 22, e.y - 10 + Math.sin(oa) * 16, Math.atan2(pl.y - 6 - e.y, pl.x - e.x), 150, e.dmg * 0.6, { col: '#9fe7ff', r: 4, home: e.phase >= 1 ? 0.8 : 0 }); e.n++; }
    if (e.pt > 1.4 + e.orbs * 0.22) { e.orbs = 0; done(1); }
  },
  tide(w, e, dt, pl, a, d, done) { const reps = 2 + (e.phase >= 1 ? 1 : 0); if (e.n < reps && e.pt > e.n * 0.8) { const g1 = R0() * TAU; bRing(w, e.x, e.y - 6, 40, 75, e.dmg * 0.55, '#9fe7ff', 0, [g1, 0.32]); e.n++; } if (e.pt > reps * 0.8 + 0.8) done(1, 0.9); },
  coral(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.5) { e.n = 1; for (let i = 0; i < 2; i++) { const aa = R0() * TAU; const c = spawnEnemy(w, 'crawler', e.x + Math.cos(aa) * 80, e.y + Math.sin(aa) * 60); Object.assign(c, { arch: 'part', part: true, pk: 'coral', owner: e, hp: 140 * w.hpMul, maxHp: 140 * w.hpMul, r: 8, spd: 0, coin: 10, xp: 10, col: '#ff7ab8' }); } w.fx.text(e.x, e.y - 40, 'CORAL HEALS HER. BREAK IT', COL.coral, { f: FS, life: 1.4 }); } if (e.pt > 1.2) done(1); },
  // 10 anvil titan
  pound(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.8; if (e.n < 3 && e.pt > 0.8 + e.n * 0.5) { bRing(w, e.x, e.y - 4, 34, 70 + e.n * 15, e.dmg * 0.7, '#c9c0ff', e.n * 0.1, [R0() * TAU, 0.25]); e.n++; if (!w.demo) shake(6); } if (e.pt > 2.6) done(1.2, 1.2); },
  gravity(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BW(w).wind = { x: e.x, y: e.y, str: 55, t: 2.4 }; bTele(w, e.x, e.y, 42, 2.4, e.dmg * 1.8, '#c9c0ff'); } if (e.pt > 2.8) done(1, 1.3); },
  anvils(w, e, dt, pl, a, d, done) { if (e.n < 4 + e.phase && e.pt > e.n * 0.4) { bTele(w, pl.x + (R0() - 0.5) * 30, pl.y + (R0() - 0.5) * 24, 34, 1.1, e.dmg * 1.6, '#c9c0ff', { meteor: true }); e.n++; } if (e.pt > 0.4 * (4 + e.phase) + 1.3) done(1); },
  charge(w, e, dt, pl, a, d, done) {
    e.shieldFront = true;
    if (e.n === 0) { e.ca = a; e.n = 1; bLine(w, e.x, e.y, e.ca, 200, 18, 0.75, 0, e.col); }
    e.windup = e.pt < 0.75;
    if (e.pt > 0.75 && e.pt < 1.35) { e.x += Math.cos(e.ca) * 250 * dt; e.y += Math.sin(e.ca) * 250 * dt; if (w.collide) w.collide(e); }
    if (e.pt > 1.6) { if (e.n < 3) { e.pt = 0; e.n++; e.ca = Math.atan2(pl.y - e.y, pl.x - e.x); bLine(w, e.x, e.y, e.ca, 200, 18, 0.6, 0, e.col); } else done(1.4, 1.4); }
  },
  // 11 mycelord
  shrooms(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.5) { e.n = 1; for (let i = 0; i < 3; i++) { const aa = R0() * TAU; const t = spawnEnemy(w, 'turret', pl.x + Math.cos(aa) * 110, pl.y + Math.sin(aa) * 80); t.col = e.col; } } if (e.pt > 1) done(1); },
  spores(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let i = 0; i < 6 + e.phase * 2; i++) { const aa = R0() * TAU, rr = 20 + R0() * 90; const tx = pl.x + Math.cos(aa) * rr, ty = pl.y + Math.sin(aa) * rr; bTele(w, tx, ty, 24, 1, 0, '#c27bff', { onDone: () => bHaz(w, tx, ty, 26, 5, e.dmg * 0.35, '#c27bff', 'poison') }); } } if (e.pt > 1.5) done(1); },
  roots(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.ta = a; e.tx = e.x; e.ty = e.y; } if (e.n < 9 && e.pt > e.n * 0.12) { e.n++; bTele(w, e.tx + Math.cos(e.ta) * e.n * 24, e.ty + Math.sin(e.ta) * e.n * 24, 16, 0.5, e.dmg * 0.9, '#7a6450'); } if (e.pt > 1.8) { if (e.phase >= 1 && !e.again) { e.again = true; e.n = 0; e.pt = 0; e.ta = Math.atan2(pl.y - e.y, pl.x - e.x); } else { e.again = false; done(1); } } },
  lords(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.8 && !e.lordsDone) { e.n = 1; e.lordsDone = true; for (let i = 0; i < 2; i++) { const b = spawnEnemy(w, 'brute', e.x + (i ? 40 : -40), e.y + 20); b.elite = true; b.name = 'MINI LORD'; b.hp = b.maxHp = b.hp * 6; b.col = e.col; } } e.windup = e.pt < 0.8; if (e.pt > 1.4) done(1); },
  // 12 scrap hydra
  hydra(w, e, dt, pl, a, d, done) { if (e.pt > 2) done(0.5); },
  saws(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.4) { e.n = 1; for (let i = 0; i < 4 + e.phase; i++) bShot(w, e.x, e.y - 10, a + (i - 2) * 0.5, 120, e.dmg * 0.8, { col: '#dfe4f5', r: 5, saw: true, bounce: 3, life: 5 }); } if (e.pt > 1.4) done(1); },
  // 13 polar seraph
  beams(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; const k = 3 + (e.phase >= 1 ? 1 : 0); for (let i = 0; i < k; i++) bLaser(w, { follow: e, a: a + i / k * TAU + 0.4, va: (e.phase >= 2 ? 1.1 : 0.85) * (R0() < 0.5 ? 1 : -1), warm: 0.9, dur: 2.8, len: 260, wd: 7, dmg: e.dmg * 0.9, col: '#bff6ff' }); } if (e.pt > 3.8) done(1, 0.9); },
  feathers(w, e, dt, pl, a, d, done) { if (e.n < 3 && e.pt > e.n * 0.45) { bFan(w, e.x, e.y - 14, Math.atan2(pl.y - e.y, pl.x - e.x), 9, 1.1, 115, e.dmg * 0.5, '#ffffff'); e.n++; } if (e.pt > 1.6) done(1); },
  halo(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; e.halo = bTele(w, pl.x, pl.y, 30, 2, e.dmg * 1.6, '#fff6c0'); } if (e.halo && e.pt < 1.4) { e.halo.x = pl.x; e.halo.y = pl.y; } if (e.pt > 2.3) { e.halo = null; done(1); } },
  judgment(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BOSS_MOVES.beams(w, e, dt, pl, a, d, () => { }); e.n = 1; } if (e.pt > 1 && e.fz === undefined) e.fz = 0; if (e.pt > 1 + (e.fz || 0) * 0.6 && (e.fz || 0) < 4) { bFan(w, e.x, e.y - 14, Math.atan2(pl.y - e.y, pl.x - e.x), 7, 0.9, 110, e.dmg * 0.45, '#ffffff'); e.fz++; } if (e.pt > 3.8) { e.fz = undefined; done(1.2, 1.2); } },
  // 14 sandwraith
  mirage(w, e, dt, pl, a, d, done) { BOSS_MOVES.clones(w, e, dt, pl, a, d, done); },
  quicksand(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let i = 0; i < 4; i++) { const aa = i / 4 * TAU + R0(); bHaz(w, pl.x + Math.cos(aa) * 45, pl.y + Math.sin(aa) * 35, 28, 5, 0, '#c8a06a', 'slow'); } } if (e.n < 4 && e.pt > 0.4 + (e.n - 1) * 0.4) { bFan(w, e.x, e.y - 10, Math.atan2(pl.y - e.y, pl.x - e.x), 5, 0.6, 105, e.dmg * 0.5, '#f2d9a8'); e.n++; } if (e.pt > 2) done(1); },
  sandstorm(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BW(w).sand = 3.6; } if (e.pt > 0.3 && e.pt < 3.4 && R0() < 0.35) { const side = R0() * TAU; bShot(w, pl.x + Math.cos(side) * 220, pl.y + Math.sin(side) * 150, side + Math.PI + (R0() - 0.5) * 0.3, 120, e.dmg * 0.45, { col: '#f2d9a8' }); } if (e.pt > 3.6) done(1); },
  dashes(w, e, dt, pl, a, d, done) {
    if (e.n === 0 || (e.pt > 1.2 && e.n < 4)) { if (e.n > 0) e.pt = 0; e.n++; const ba = R0() * TAU; e.x = pl.x + Math.cos(ba) * 110; e.y = pl.y + Math.sin(ba) * 80; e.ca = Math.atan2(pl.y - e.y, pl.x - e.x); bLine(w, e.x, e.y, e.ca, 230, 14, 0.5, 0, '#f2d9a8'); w.fx.burst(e.x, e.y - 10, 14, { c: ['#f2d9a8', e.col], sp: 70 }); }
    if (e.pt > 0.5 && e.pt < 1.0) { e.x += Math.cos(e.ca) * 300 * dt; e.y += Math.sin(e.ca) * 300 * dt; }
    if (e.n >= 4 && e.pt > 1.2) done(1.2, 1.2);
  },
  // 15 thunder ram
  ram(w, e, dt, pl, a, d, done) {
    const maxB = 3 + e.phase;
    if (e.n === 0) { e.n = 1; e.ca = a; e.bn = 0; bLine(w, e.x, e.y, e.ca, 220, 18, 0.8, 0, '#fff25a'); }
    e.windup = e.n === 1 && e.pt < 0.8;
    if (e.pt > 0.8 && e.n === 1) {
      const sp = 260 + e.phase * 50; const nx = e.x + Math.cos(e.ca) * sp * dt, ny = e.y + Math.sin(e.ca) * sp * dt;
      if (w.solid(nx, ny) || (w.bounds && (nx < w.bounds[0] || nx > w.bounds[2] || ny < w.bounds[1] || ny > w.bounds[3])) || e.pt > 4) { e.bn++; if (!w.demo) shake(5); bRing(w, e.x, e.y - 6, 10, 90, e.dmg * 0.5, '#fff25a'); if (e.bn >= maxB) { e.n = 2; e.pt = 0; e.stun = 1.4; done(1.6, 1.8); return; } e.ca = Math.atan2(pl.y - e.y, pl.x - e.x) + (R0() - 0.5) * 0.3; }
      else { e.x = nx; e.y = ny; e.zT = (e.zT || 0) - dt; if (e.zT <= 0) { e.zT = 0.08; bHaz(w, e.x, e.y, 8, 1.6, e.dmg * 0.35, '#fff25a', 'shock'); } }
    }
  },
  field(w, e, dt, pl, a, d, done) { e.windup = e.pt < 0.5; if (e.n < 3 && e.pt > 0.5 + e.n * 0.55) { bRing(w, e.x, e.y - 6, 24, 85, e.dmg * 0.55, '#fff25a', e.n * 0.13); e.n++; } if (e.pt > 2.3) done(1, 1); },
  bolts(w, e, dt, pl, a, d, done) { if (e.n < 7 && e.pt > e.n * 0.3) { bTele(w, pl.x + (R0() - 0.5) * 40, pl.y + (R0() - 0.5) * 30, 18, 0.65, e.dmg * 0.9, '#fff25a', { bolt: true }); e.n++; } if (e.pt > 2.8) done(1); },
  // 16 shardmother
  prism(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (const sh of e.shards) if (sh.hp > 0) bLaser(w, { follow: e, a: sh.a, va: 1.2 + e.phase * 0.5, warm: 0.7, dur: 2.2, len: 230, wd: 6, dmg: e.dmg * 0.8, col: '#d9a6ff' }); } if (e.pt > 3.1) done(1); },
  mites(w, e, dt, pl, a, d, done) { if (e.n === 0 && e.pt > 0.4) { e.n = 1; for (let i = 0; i < 5 + e.phase * 2; i++) spawnEnemy(w, 'swarm', e.x + (R0() - 0.5) * 50, e.y + (R0() - 0.5) * 40); } if (e.pt > 1) done(0.8); },
  reflect(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; e.reflect = 2.6; w.fx.text(e.x, e.y - 44, 'REFLECTING! HOLD FIRE', '#ffffff', { f: FS, life: 1.4 }); } if (e.pt > 2.8) done(0.8, 1.4); },
  // 17 depth warden
  lunge(w, e, dt, pl, a, d, done) {
    if (e.n === 0) { e.n = 1; e.ca = a; bLine(w, e.x, e.y, e.ca, 200, 16, 0.55, 0, '#7fe9ff'); }
    if (e.pt > 0.55 && e.pt < 1.05) { e.x += Math.cos(e.ca) * 300 * dt; e.y += Math.sin(e.ca) * 300 * dt; if (w.collide) w.collide(e); }
    if (e.pt > 1.3) { if (e.phase >= 1 && e.n < 3) { e.n++; e.pt = 0; e.ca = Math.atan2(pl.y - e.y, pl.x - e.x); bLine(w, e.x, e.y, e.ca, 200, 16, 0.5, 0, '#7fe9ff'); } else done(1.2, 1.2); }
  },
  ink(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let i = 0; i < 5; i++) { const aa = R0() * TAU, rr = 20 + R0() * 70; bHaz(w, pl.x + Math.cos(aa) * rr, pl.y + Math.sin(aa) * rr, 26, 5, 0, '#10101c', 'ink'); } } if (e.pt > 1) done(1); },
  anglerbeam(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (const L of e.lures) bLaser(w, { x: L.x, y: L.y, a: Math.atan2(pl.y - L.y, pl.x - L.x) - 0.7, va: 0.6, warm: 0.8, dur: 2.2, len: 240, wd: 7, dmg: e.dmg * 0.9, col: '#7fe9ff' }); } if (e.pt > 3.1) done(1); },
  // 18 meteor king
  bigrock(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; const tx = pl.x, ty = pl.y; bTele(w, tx, ty, 50, 1.6, e.dmg * 2.2, '#ff7a2e', { meteor: true, onDone: () => bRing(w, tx, ty - 4, 10, 120, e.dmg * 0.6, '#ff9a3d', R0()) }); } if (e.pt > 2.2) done(1); },
  crown(w, e, dt, pl, a, d, done) { e.windup = e.pt < 1; if (e.pt > 1 && e.n < 20 && e.pt > 1 + e.n * 0.08) { const ba = e.pt * 4; bShot(w, e.x, e.y - 20, ba, 100, e.dmg * 0.5, { col: '#ffcb3d' }); bShot(w, e.x, e.y - 20, ba + Math.PI, 100, e.dmg * 0.5, { col: '#ffcb3d' }); e.n++; } if (e.pt > 2.8) done(1, 1); },
  firering(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; for (let i = 0; i < 14; i++) { if (i === 3) continue; const aa = i / 14 * TAU; bHaz(w, pl.x + Math.cos(aa) * 85, pl.y + Math.sin(aa) * 65, 14, 4.5, e.dmg * 0.5, '#ff7a2e', 'fire'); } } if (e.n < 6 && e.pt > 0.6 + (e.n - 1) * 0.4) { bTele(w, pl.x + (R0() - 0.5) * 40, pl.y + (R0() - 0.5) * 30, 16, 0.8, e.dmg * 0.8, '#ff7a2e', { meteor: true }); e.n++; } if (e.pt > 3) done(1); },
  // 19 timekeeper
  hands(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; const k = e.phase >= 1 ? 3 : 2; const sp = [0.7, 1.5, 2.3]; for (let i = 0; i < k; i++) bLaser(w, { follow: e, a: a + i * 2.1, va: sp[i] * (1 + e.phase * 0.2), warm: 0.8, dur: 4, len: 210 - i * 40, wd: 6 + (2 - i) * 2, dmg: e.dmg * 0.9, col: i === 0 ? '#ffcb3d' : '#7fe9ff' }); } if (e.pt > 5) done(1, 1); },
  stop(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; const tx = pl.x, ty = pl.y; bTele(w, tx, ty, 46, 1.4, 0, '#7fe9ff', { onDone: () => { if (Math.hypot(pl.x - tx, pl.y - ty) < 46) { pl.rootT = 0.9; w.fx.text(pl.x, pl.y - 34, 'TIME STOP', '#7fe9ff', { f: FB, life: 1 }); for (let i = 0; i < 10; i++) { const aa = i / 10 * TAU; bShot(w, pl.x + Math.cos(aa) * 90, pl.y + Math.sin(aa) * 70, aa + Math.PI, 75, e.dmg * 0.55, { col: '#7fe9ff', life: 1.6 }); } } } }); w.fx.text(pl.x, pl.y - 50, 'GET OUT OF THE CLOCK', '#7fe9ff', { f: FS, life: 1.2 }); } if (e.pt > 2.2) done(1); },
  rewind(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; e.markHp = e.hp; e.markT = 4.2; w.fx.text(e.x, e.y - 44, 'REWIND IN 4. HIT IT HARD', '#7fe9ff', { f: FS, life: 1.6 }); } if (e.pt > 1) done(0.8); },
  // 20 the warden
  grid(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; const ox = pl.x + (R0() - 0.5) * 20, oy = pl.y + (R0() - 0.5) * 20; for (let i = -2; i <= 2; i++) { bLaser(w, { x: ox - 240, y: oy + i * 34 + 17, x2: ox + 240, y2: oy + i * 34 + 17, warm: 1.0, dur: 1.4, wd: 5, dmg: e.dmg, col: '#ffcb3d' }); bLaser(w, { x: ox + i * 44 + 22, y: oy - 160, x2: ox + i * 44 + 22, y2: oy + 160, warm: 1.0, dur: 1.4, wd: 5, dmg: e.dmg, col: '#ffcb3d' }); } } if (e.pt > 2.6) done(1); },
  shrink(w, e, dt, pl, a, d, done) { if (e.n === 0) { e.n = 1; BW(w).ring = { x: e.x, y: e.y, r: 260, min: 110, spd: 45, t: 0, dur: 9, dmg: e.dmg * 0.6 }; w.fx.text(e.x, e.y - 50, 'THE ARENA CLOSES', '#ffcb3d', { f: FB, life: 1.4 }); } if (e.pt > 1.2) done(1); },
};
// ---------- looks: every boss gets its own body ----------
const BOSS_DRAW = {
  1(g, f) { g.ell(24, 30, 14, 9, M.P); for (let i = 0; i < 3; i++) g.rect(13 + i * 8, 24, 2, 12, M.S); g.ell(24, 16, 9, 7, M.P); g.ell(20, 14, 2, 2, M.G); g.ell(28, 14, 2, 2, M.G); g.poly([[16, 10], [12, 2 - f], [19, 9]], M.A); g.poly([[32, 10], [36, 2 - f], [29, 9]], M.A); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g.line(24 + s * 8, 20 + k * 3, 24 + s * 20, 24 + k * 5 + (k % 2 ? f : -f), M.D); g.rect(21, 20, 6, 2, M.W); },
  2(g, f) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * 0.1; g.ell(24 + Math.cos(a) * 14, 20 + Math.sin(a) * 11, 6, 5, i % 2 ? M.P : M.S); } g.ell(24, 20, 10, 8, M.D); g.ell(24, 21, 7, 5, 0); g.ell(24, 21, 7, 5, M.D); for (let i = -2; i <= 2; i++) { g.set(24 + i * 3, 16, M.W); g.set(24 + i * 3, 26, M.W); } g.rect(22, 32, 4, 9, M.S); g.line(18, 41, 22, 34, M.S); g.line(30, 41, 26, 34, M.S); },
  3(g, f) { g.rect(12, 14, 24, 20, M.P); g.rect(16, 4, 16, 12, M.S); g.rect(19, 8, 3, 3, M.G); g.rect(26, 8, 3, 3, M.G); g.rect(4, 14 + f, 8, 16, M.S); g.rect(36, 14 - f, 8, 16, M.S); g.rect(14, 34, 7, 7, M.D); g.rect(27, 34, 7, 7, M.D); for (let i = 0; i < 5; i++) g.poly([[14 + i * 5, 14], [16 + i * 5, 6 + (i % 2) * 3], [18 + i * 5, 14]], M.W); g.rect(20, 22, 8, 6, M.G); },
  4(g, f) { g.ell(24, 22, 14, 11, M.P); g.poly([[12, 20], [2, 14 + f], [10, 28]], M.S); g.poly([[36, 20], [46, 14 - f], [38, 28]], M.S); g.ell(24, 28, 9, 5, M.D); for (let i = -3; i <= 3; i++) g.set(24 + i * 2, 29, M.W); g.ell(18, 17, 3, 2, M.G); g.ell(30, 17, 3, 2, M.G); g.poly([[16, 12], [14, 2], [20, 10]], M.A); g.poly([[32, 12], [34, 2], [28, 10]], M.A); g.ell(24, 34, 4, 2, M.G); },
  5(g, f) { g.ell(24, 22, 20, 12, M.P); g.ell(24, 26, 16, 6, M.S); g.poly([[4, 22], [0, 12 + f], [0, 32 - f]], M.P); g.ell(34, 18, 3, 3, M.W); g.set(35, 18, M.D); g.rect(30, 26, 14, 2, M.D); for (let i = 0; i < 5; i++) g.set(31 + i * 3, 27, M.W); g.poly([[20, 10], [26, 2], [28, 11]], M.A); for (let i = 0; i < 3; i++) g.line(12 + i * 4, 18, 14 + i * 4, 26, M.G); },
  6(g, f) { g.ell(24, 14, 16, 11, M.P); g.ell(24, 11, 11, 6, M.S); for (let i = 0; i < 6; i++) { const x = 12 + i * 5; g.line(x, 22, x + (i % 2 ? f : -f), 40, i % 2 ? M.G : M.P); } g.ell(19, 14, 2, 2, M.W); g.ell(29, 14, 2, 2, M.W); g.set(19, 14, M.D); g.set(29, 14, M.D); g.poly([[22, 2], [26, -1], [24, 6]], M.G); g.set(10, 8 + f, M.G); g.set(38, 8 - f, M.G); },
  7(g, f) { g.ell(24, 12, 10, 9, M.W); g.ell(20, 12, 3, 3, M.D); g.ell(28, 12, 3, 3, M.D); g.set(20, 12, M.G); g.set(28, 12, M.G); g.poly([[23, 15], [25, 15], [24, 18]], M.D); g.rect(19, 19, 10, 3, M.W); for (let i = 0; i < 4; i++) { g.line(14, 24 + i * 4, 24, 23 + i * 4, M.W); g.line(34, 24 + i * 4, 24, 23 + i * 4, M.W); } g.rect(23, 22, 2, 18, M.S); g.line(10, 22, 4, 34 + f, M.W, 0, 2); g.line(38, 22, 44, 34 - f, M.W, 0, 2); g.poly([[16, 5], [12, -1], [19, 4]], M.P); g.poly([[32, 5], [36, -1], [29, 4]], M.P); },
  8(g, f) { g.poly([[24, 2], [38, 16], [36, 40], [30, 34 + f], [24, 40], [18, 34 - f], [12, 40], [10, 16]], M.D); g.ell(24, 14, 9, 8, M.P); for (const [x, y] of [[19, 13], [29, 13], [24, 18], [16, 20], [32, 20]]) { g.ell(x, y, 1.5, 1.5, M.G); g.set(x, y, M.W); } g.line(10, 22, 2, 30 + f, M.P); g.line(38, 22, 46, 30 - f, M.P); },
  9(g, f) { g.ell(24, 26, 10, 12, M.P); g.ell(24, 12, 7, 7, M.S); g.ell(21, 12, 1.5, 1.5, M.G); g.ell(27, 12, 1.5, 1.5, M.G); for (let i = 0; i < 5; i++) g.line(18 + i * 3, 6, 15 + i * 4, -1 + (i % 2) * 2 + f, M.A); g.poly([[14, 30], [4, 40], [14, 38]], M.S); g.poly([[34, 30], [44, 40], [34, 38]], M.S); g.ell(24, 26, 5, 6, M.G); g.set(23, 23, M.W); },
  10(g, f) { g.rect(8, 10, 32, 24, M.P); g.rect(14, 4, 20, 8, M.A); g.rect(18, 7, 12, 2, M.G); g.rect(0, 12 + f, 8, 14, M.S); g.rect(40, 12 - f, 8, 14, M.S); g.rect(-1, 24 + f, 10, 8, M.A); g.rect(39, 24 - f, 10, 8, M.A); g.rect(12, 34, 9, 8, M.D); g.rect(27, 34, 9, 8, M.D); g.rect(18, 18, 12, 8, M.D); g.rect(21, 20, 6, 4, M.G); for (let i = 0; i < 4; i++) g.set(10 + i * 9, 12, M.W); },
  11(g, f) { g.ell(24, 14, 20, 11, M.P); for (const [x, y] of [[14, 10], [24, 7], [33, 12], [19, 16], [29, 17]]) g.ell(x, y, 2.5, 2, M.W); g.rect(18, 22, 12, 16, M.S); g.ell(21, 27, 2, 2, M.G); g.ell(27, 27, 2, 2, M.G); g.rect(21, 32, 6, 2, M.D); for (let i = 0; i < 4; i++) g.line(18 + i * 4, 38, 14 + i * 6 + (i % 2 ? f : -f), 42, M.D); },
  12(g, f) { g.rect(10, 20, 28, 16, M.P); g.rect(14, 16, 20, 6, M.A); g.rect(8, 36, 32, 4, M.D); for (let i = 0; i < 4; i++) g.ell(13 + i * 7, 40, 3, 2, M.S); g.rect(20, 25, 8, 6, M.G); for (let i = 0; i < 3; i++) g.line(16 + i * 8, 16, 12 + i * 12, 6 + f, M.D, 0, 2); g.set(14, 22, M.W); g.set(34, 22, M.W); },
  13(g, f) { g.poly([[24, 8], [30, 20], [28, 40], [20, 40], [18, 20]], M.W); g.ell(24, 10, 5, 5, M.S); g.ring(24, 3, 4, 5, M.G); g.rect(19, 1, 11, 2, 0); g.ring(24, 3, 4, 5, M.G); for (const s of [-1, 1]) { g.poly([[24 + s * 6, 16], [24 + s * 24, 4 - f], [24 + s * 22, 18], [24 + s * 14, 26]], M.P); g.poly([[24 + s * 10, 18], [24 + s * 20, 10 - f], [24 + s * 18, 22]], M.S); } g.ell(22, 10, 1, 1, M.G); g.ell(26, 10, 1, 1, M.G); },
  14(g, f) { g.poly([[24, 4], [34, 14], [38, 42], [10, 42], [14, 14]], M.P); g.ell(24, 12, 7, 7, M.D); g.ell(21, 12, 1.5, 1, M.G); g.ell(27, 12, 1.5, 1, M.G); for (let i = 0; i < 5; i++) g.line(12 + i * 6, 42, 10 + i * 7 + f, 46, M.S); g.line(10, 20, 2, 26 + f, M.P, 0, 2); g.line(38, 20, 46, 26 - f, M.P, 0, 2); g.rect(18, 26, 12, 2, M.A); },
  15(g, f) { g.ell(24, 26, 15, 10, M.P); g.ell(24, 16, 9, 8, M.S); for (const s of [-1, 1]) { g.ring(24 + s * 10, 12, 3, 6, M.A); } g.ell(20, 17, 1.5, 1.5, M.G); g.ell(28, 17, 1.5, 1.5, M.G); g.rect(21, 21, 6, 3, M.D); for (let i = 0; i < 4; i++) g.rect(12 + i * 7, 34, 3, 8 + (i % 2 ? f : -f), M.D); g.line(10, 22, 6, 18, M.G); g.line(38, 22, 42, 18, M.G); },
  16(g, f) { g.poly([[24, 0], [32, 14], [30, 34], [24, 42], [18, 34], [16, 14]], M.G); g.poly([[24, 4], [28, 14], [24, 30], [20, 14]], M.W); g.poly([[12, 20], [6, 10 + f], [14, 28]], M.P); g.poly([[36, 20], [42, 10 - f], [34, 28]], M.P); g.poly([[16, 34], [8, 40], [20, 38]], M.S); g.poly([[32, 34], [40, 40], [28, 38]], M.S); g.ell(24, 18, 2, 2, M.D); },
  17(g, f) { g.ell(24, 26, 20, 12, M.D); g.ell(24, 30, 15, 6, M.P); for (let i = 0; i < 8; i++) g.poly([[12 + i * 3, 28], [13 + i * 3, 33 + (i % 2) * 2], [14 + i * 3, 28]], M.W); g.ell(32, 20, 3, 3, M.G); g.set(33, 20, M.W); g.line(24, 14, 30, 4, M.A); g.line(30, 4, 36, 2 + f, M.A); g.poly([[4, 26], [0, 18 + f], [0, 34 - f]], M.P); },
  18(g, f) { g.ell(24, 26, 16, 14, M.P); for (const [x, y] of [[16, 22], [30, 30], [22, 34], [32, 20]]) g.ell(x, y, 3, 2, M.D); g.ell(24, 22, 8, 6, M.S); g.ell(21, 21, 1.5, 1.5, M.G); g.ell(27, 21, 1.5, 1.5, M.G); for (let i = -2; i <= 2; i++) g.poly([[24 + i * 5 - 2, 12], [24 + i * 5, 3 - Math.abs(i) * 2], [24 + i * 5 + 2, 12]], M.A); g.rect(19, 11, 11, 2, M.A); g.set(24, 6, M.G); g.line(8, 26, 2, 34 + f, M.S, 0, 2); g.line(40, 26, 46, 34 - f, M.S, 0, 2); },
  19(g, f) { g.ell(24, 20, 17, 17, M.A); g.ell(24, 20, 14, 14, M.W); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.set(24 + Math.cos(a) * 12, 20 + Math.sin(a) * 12, M.D); } g.line(24, 20, 24 + Math.cos(f * 0.5 - 1.6) * 10, 20 + Math.sin(f * 0.5 - 1.6) * 10, M.D); g.line(24, 20, 31, 22, M.P); g.ell(24, 20, 1.5, 1.5, M.G); g.rect(18, 38, 12, 4, M.S); g.rect(21, 0, 6, 3, M.S); for (const s of [-1, 1]) g.line(24 + s * 16, 28, 24 + s * 22, 38 + f, M.S, 0, 2); },
  20(g, f) { g.poly([[24, 0], [36, 10], [40, 30], [32, 42], [16, 42], [8, 30], [12, 10]], M.A); g.poly([[24, 6], [32, 14], [30, 30], [18, 30], [16, 14]], M.P); g.ell(24, 18, 5, 4, M.G); g.ell(24, 18, 2, 2, M.W); for (const s of [-1, 1]) { g.poly([[24 + s * 14, 14], [24 + s * 24, 2 - f], [24 + s * 22, 22]], M.S); g.rect(24 + s * 18 - 2, 30, 4, 10 + (s > 0 ? f : -f), M.A); } g.rect(20, 34, 8, 2, M.G); },
};
function kitBossSprite(pi, frame, flash) {
  const key = 'K' + pi + frame + (flash ? 'f' : ''); let c = ALIENS.get(key); if (c) return c;
  const p = planetDef(pi); const g = new Spr(48, 46); BOSS_DRAW[bossBase(pi)](g, frame); g.fin();
  const bc = p.boss[2]; const pal = makePal(bc[0], bc[1], bc[2], { h2: bc[0] + 25, gh: bc[0] + 160, A: METALS.gold() });
  if (flash) { pal.P = pal.S = pal.D = pal.A = WHITE_RAMP.map(() => [255, 255, 255]); }
  c = renderSpr(g, pal); ALIENS.set(key, c); return c;
}
function drawBossExtra(w, e, x, y) {
  if (e.kit === 4 && e.trail) for (let i = e.trail.length - 1; i >= 12; i -= 12) { const [sx, sy] = e.trail[i]; const s = 9 - i / 18; const ox = x - e.x, oy = y - e.y; ellipse(sx + ox, sy + oy - 6, s, s * 0.8, e.col); ellipse(sx + ox, sy + oy - 7, s * 0.6, s * 0.4, '#ffcb3d'); }
  if (e.kit === 16 && e.shards) for (const sh of e.shards) { if (sh.hp <= 0) continue; const sx = x + Math.cos(sh.a) * 30, sy = y - 10 + Math.sin(sh.a) * 22; ctx.fillStyle = sh.flash > 0 ? '#fff' : '#d9a6ff'; ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 4, sy); ctx.fill(); px(sx, sy - 2, '#fff'); }
  if (e.reflect > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(T_NOW * 20); ellipse(x, y - 18, 26, 26, '#ffffff'); ctx.globalAlpha = 1; }
  if (e.kit === 17 && e.lures) for (const L of e.lures) { const lx = L.x - (e.x - x), ly = L.y - (e.y - y); ctx.globalAlpha = 0.3; circ(lx, ly, 9, '#7fe9ff'); ctx.globalAlpha = 1; circ(lx, ly, 3, '#ffffff'); }
  if (e.orbs && e.st === 'orbs') for (let k = e.n - 1; k < e.orbs; k++) { const oa = T_NOW * 3 + k / e.orbs * TAU; circ(x + Math.cos(oa) * 22, y - 10 + Math.sin(oa) * 16, 3, '#9fe7ff'); }
  if (e.markHp) { const k = clamp(e.markT / 4.2, 0, 1); bar(x - 20, y - 52, 40, 3, k, '#7fe9ff', '#123'); text('REWIND', x, y - 60, '#7fe9ff', FS, 1); }
  if (e.invuln && !e.hidden && e.st !== 'phase' && Math.floor(T_NOW * 6) % 2) { ctx.globalAlpha = 0.5; text('IMMUNE', x, y - 50, '#9aa3c0', FS, 1); ctx.globalAlpha = 1; }
}
function drawHiddenBoss(w, e, x, y) {
  if (e.kit === 8 || e.kit === 14) { ctx.globalAlpha = 0.25; ellipse(x, y, 10, 3, '#000'); ctx.globalAlpha = 1; return; }
  const c = e.kit === 5 ? '#9fe7ff' : '#7a6450'; ctx.globalAlpha = 0.7; ellipse(x, y, 16, 5, c); ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) px(x + Math.sin(T_NOW * 9 + i * 2) * 12, y - 2 - (i % 2), '#fff');
}
function drawPart(w, e, x, y) {
  const fl = e.flash > 0;
  if (e.pk === 'coral') { for (let i = 0; i < 4; i++) rect(x - 6 + i * 3, y - 16 + (i % 2) * 4, 2, 16 - (i % 2) * 4, fl ? '#fff' : '#ff7ab8'); rect(x - 7, y - 2, 14, 3, '#b8306a'); }
  else if (e.clone) { const owner = e.owner; const spr = kitBossSprite(w.pi, Math.floor(e.t * 6) % 2, fl); ctx.globalAlpha = 0.85 + (Math.floor(T_NOW * 5 + e.cd) % 7 === 0 ? -0.35 : 0); ctx.drawImage(spr, x - 24, y - 44); ctx.globalAlpha = 1; return; }
  else { const c = e.pk === 'laser' ? '#ff4f6d' : e.pk === 'missile' ? '#ffcb3d' : '#ff7a2e'; const owner = e.owner; if (owner) line(x, y - 4, owner.x - (e.x - x), owner.y - (e.y - y) - 16, '#555a70'); circ(x, y - 8, 8, fl ? '#fff' : '#3a3f55'); circ(x, y - 8, 5, c); rect(x - 1, y - 10, 3, 3, '#fff'); }
  bar(x - 10, y + 3, 20, 2, e.hp / e.maxHp, '#ff5468', '#300');
}
