// ===== GADGETS (activated abilities) and PETS (companions) =====
const GADGETS = {
  blackhole: { n: 'BLACK HOLE', txt: 'THROW A BLACK HOLE THAT SUCKS ALIENS IN AND CRUSHES THEM', cd: 16, dmg: 1.1, rad: 72, dur: 3 },
  cluster: { n: 'CLUSTER BOMB', txt: 'LOB A BOMB THAT BURSTS INTO SEVEN BLASTS', cd: 10, dmg: 1.6, rad: 26, dur: 0 },
  dome: { n: 'SHIELD DOME', txt: 'A DOME THAT EATS EVERY ALIEN SHOT AND PUSHES ALIENS OUT', cd: 18, dmg: 0.4, rad: 44, dur: 4 },
  timewarp: { n: 'TIME WARP', txt: 'SLOWS EVERY ALIEN AND ALIEN SHOT NEAR YOU TO A CRAWL', cd: 18, dmg: 0, rad: 150, dur: 5 },
  decoy: { n: 'HOLO DECOY', txt: 'A FAKE YOU THAT ALIENS CHASE, THEN IT BLOWS UP', cd: 14, dmg: 3, rad: 46, dur: 5 },
  orbital: { n: 'ORBITAL STRIKE', txt: 'CALLS A LASER FROM ORBIT DOWN ON YOUR CURSOR', cd: 15, dmg: 6, rad: 36, dur: 0.9 },
  freeze: { n: 'FREEZE NOVA', txt: 'FREEZES EVERY ALIEN AROUND YOU SOLID', cd: 14, dmg: 1, rad: 92, dur: 2.2 },
  blink: { n: 'BLINK', txt: 'TELEPORT TO YOUR CURSOR, ZAPPING EVERYTHING IN BETWEEN', cd: 7, dmg: 2.4, rad: 130, dur: 0 },
  turret: { n: 'AUTO TURRET', txt: 'DROP A TURRET THAT SHOOTS ALIENS FOR 10 SECONDS', cd: 20, dmg: 0.55, rad: 150, dur: 10 },
  medkit: { n: 'NANO HEAL', txt: 'NANOBOTS HEAL YOU OVER 3 SECONDS', cd: 22, dmg: 0, rad: 0, dur: 3 },
  emp: { n: 'CHAIN EMP', txt: 'LIGHTNING JUMPS BETWEEN ALIENS AND STUNS THEM', cd: 11, dmg: 2, rad: 110, dur: 1.2 },
  slam: { n: 'GRAVITY SLAM', txt: 'YANK ALIENS IN TO YOU, THEN SLAM THE GROUND', cd: 13, dmg: 3, rad: 130, dur: 0.6 },
};
const GADGET_KEYS = Object.keys(GADGETS);
const PETS = {
  bot: { n: 'ZAP BOT', txt: 'ZAPS THE NEAREST ALIEN EVERY FEW SECONDS' },
  cat: { n: 'SPACE CAT', txt: 'POUNCES ON ALIENS THAT GET CLOSE' },
  jelly: { n: 'MEDI JELLY', txt: 'SLOWLY HEALS YOU' },
  ufo: { n: 'MINI UFO', txt: 'BEAMS ORE AND COINS TO YOU FROM FAR AWAY, MORE ORE VALUE' },
  golem: { n: 'PEBBLE GOLEM', txt: 'BLOCKS A HIT FOR YOU EVERY FEW SECONDS' },
  fox: { n: 'COMET FOX', txt: 'MORE COINS FROM EVERY ALIEN' },
  slime: { n: 'GOO SLIME', txt: 'LEAVES STICKY GOO THAT SLOWS ALIENS' },
  owl: { n: 'STAR OWL', txt: 'MORE CRITICAL HITS AND SHOWS ALL ORE ON YOUR MAP' },
};
const PET_KEYS = Object.keys(PETS);
CATS.g = { n: 'GADGETS', subs: GADGET_KEYS, size: 40, pp: 0 };
CATS.p = { n: 'PETS', subs: PET_KEYS, size: 40, pp: 0 };
for (const k of GADGET_KEYS) SUB_LABEL[k] = GADGETS[k].n;
for (const k of PET_KEYS) SUB_LABEL[k] = PETS[k].n;
Object.assign(SUB_LABEL_FULL, SUB_LABEL);

function gStats(d, L = 1) {
  const G = GADGETS[d.sub]; const m = RAR_WDMG[d.r] * d.q * lvMul(L, 0.1);
  return { k: d.sub, r: d.r, cd: G.cd * (1 - 0.05 * d.r) * Math.max(0.6, 1 - 0.012 * (L - 1)), dmg: 30 * G.dmg * m, rad: G.rad * (1 + 0.05 * d.r), dur: G.dur * (1 + 0.08 * d.r), heal: 0.3 + 0.03 * d.r };
}
function pStats(d, L = 1) {
  const m = (1 + 0.22 * d.r) * d.q * lvMul(L, 0.08);
  return { k: d.sub, r: d.r, m, cd: { bot: 2.4, cat: 3, golem: 14, slime: 1.2 }[d.sub] * Math.max(0.5, 1 - 0.06 * d.r), dmg: 16 * m, heal: 0.008 * m, ore: 0.05 * m, coin: 0.12 * m, crit: 0.035 * m };
}
function gadgetStatLines(d, L) {
  const s = gStats(d, L);
  const k = d.sub, rows = [['COOLDOWN', s.cd.toFixed(1) + 'S']];
  if (k === 'medkit') rows.push(['HEALS', Math.round(s.heal * 100) + '% HP']);
  else if (s.dmg && GADGETS[k].dmg) rows.push(['DAMAGE', fmt(s.dmg)]);
  if (GADGETS[k].dur && k !== 'orbital' && k !== 'slam') rows.push(['LASTS', s.dur.toFixed(1) + 'S']);
  else if (s.rad) rows.push(['RADIUS', Math.round(s.rad)]);
  return rows;
}
function petStatLines(d, L) {
  const s = pStats(d, L);
  switch (d.sub) {
    case 'bot': return [['ZAP', fmt(s.dmg)], ['EVERY', s.cd.toFixed(1) + 'S']];
    case 'cat': return [['POUNCE', fmt(s.dmg * 1.6)], ['EVERY', s.cd.toFixed(1) + 'S']];
    case 'jelly': return [['HEALS', (s.heal * 100).toFixed(1) + '%/S']];
    case 'ufo': return [['ORE VALUE', '+' + Math.round(s.ore * 100) + '%'], ['PICKUP', 'X2.5']];
    case 'golem': return [['BLOCKS', '1 HIT'], ['EVERY', s.cd.toFixed(0) + 'S']];
    case 'fox': return [['KILL COINS', '+' + Math.round(s.coin * 100) + '%']];
    case 'slime': return [['SLOWS', 'ALIENS'], ['GOO EVERY', s.cd.toFixed(1) + 'S']];
    case 'owl': return [['CRIT', '+' + Math.round(s.crit * 100) + '%'], ['MAP', 'ALL ORE']];
  }
  return [];
}

// ---------- icons ----------
const GGEN = {
  blackhole(g) { g.ell(8, 8, 4, 4, M.D); g.ring(8, 8, 5, 6, M.G); g.rect(1, 8, 14, 1, M.P); g.set(3, 7, M.P); g.set(13, 9, M.P); g.set(8, 8, 0); },
  cluster(g) { g.ell(8, 9, 5, 5, M.P); g.rect(6, 2, 4, 3, M.A); g.line(9, 2, 12, 0, M.D); g.set(12, 0, M.G); g.set(6, 8, M.W); for (const [x, y] of [[4, 12], [11, 12], [8, 13]]) g.set(x, y, M.S); },
  dome(g) { g.ring(8, 11, 5, 7, M.G); g.rect(0, 11, 16, 5, 0); g.rect(1, 11, 14, 2, M.A); g.set(5, 6, M.W); g.ell(8, 10, 2, 2, M.P); },
  timewarp(g) { g.poly([[3, 2], [13, 2], [8, 8]], M.A); g.poly([[3, 14], [13, 14], [8, 8]], M.A); g.poly([[5, 3], [11, 3], [8, 7]], M.G); g.rect(7, 11, 3, 2, M.G); g.rect(2, 1, 12, 1, M.P); g.rect(2, 14, 12, 1, M.P); },
  decoy(g) { g.ell(8, 6, 4, 4, M.G); g.rect(5, 10, 6, 4, M.G); for (let y = 2; y < 15; y += 2) g.rect(3, y, 10, 1, 0); g.ell(7, 6, 1.5, 1.5, M.W); },
  orbital(g) { g.rect(5, 2, 6, 4, M.A); g.rect(1, 3, 3, 2, M.P); g.rect(12, 3, 3, 2, M.P); g.rect(7, 6, 2, 9, M.G); g.set(6, 14, M.W); g.set(9, 14, M.W); },
  freeze(g) { g.line(8, 1, 8, 15, M.G); g.line(1, 8, 15, 8, M.G); g.line(3, 3, 13, 13, M.P); g.line(13, 3, 3, 13, M.P); g.ell(8, 8, 2, 2, M.W); },
  blink(g) { g.poly([[2, 13], [6, 3], [9, 3], [7, 8], [12, 8], [5, 15]], M.G); g.set(12, 3, M.W); g.set(13, 5, M.P); g.set(2, 6, M.P); },
  turret(g) { g.rect(4, 10, 8, 5, M.A); g.ell(8, 9, 3, 3, M.P); g.rect(9, 7, 6, 2, M.D); g.set(15, 7, M.G); g.rect(5, 15, 6, 1, M.D); },
  medkit(g) { g.rect(2, 4, 12, 10, M.W); g.rect(7, 6, 2, 6, M.P); g.rect(5, 8, 6, 2, M.P); g.rect(6, 2, 4, 2, M.A); },
  emp(g) { g.poly([[9, 0], [3, 9], [7, 9], [5, 16], [13, 6], [9, 6]], M.G); g.set(9, 3, M.W); },
  slam(g) { g.rect(3, 2, 10, 6, M.A); g.rect(6, 8, 4, 4, M.D); g.rect(1, 13, 14, 2, M.P); g.set(0, 11, M.G); g.set(15, 11, M.G); g.set(4, 3, M.W); },
};
function petBody(g, k, f) {
  const b = f ? 1 : 0;
  switch (k) {
    case 'bot': g.rect(3, 4 + b, 10, 8, M.A); g.rect(4, 6 + b, 8, 3, M.D); g.set(6, 7 + b, M.G); g.set(9, 7 + b, M.G); g.line(8, 4 + b, 8, 1 + b, M.D); g.set(8, 0 + b, M.G); g.rect(5, 12 + b, 6, 1, M.P); g.set(4, 13, f ? M.G : 0); g.set(11, 13, f ? 0 : M.G); break;
    case 'cat': g.ell(8, 10, 5, 3, M.P); g.ell(5, 6, 3, 3, M.P); g.poly([[2, 4], [3, 0 + b], [5, 3]], M.P); g.poly([[5, 3], [7, 0 + b], [8, 4]], M.P); g.set(4, 6, M.G); g.set(6, 6, M.G); g.line(13, 9, 15, 5 + b * 2, M.P); g.rect(4, 13, 2, 2, M.S); g.rect(10, 13, 2, 2, M.S); break;
    case 'jelly': g.ell(8, 6, 6, 4, M.G); g.ell(8, 5, 4, 2, M.W); for (let i = 0; i < 4; i++) g.line(4 + i * 3, 9, 3 + i * 3 + (i % 2 ? b : -b) * 1, 14, M.P); g.set(6, 7, M.D); g.set(10, 7, M.D); break;
    case 'ufo': g.ell(8, 9, 7, 2, M.A); g.ell(8, 6, 3, 3, M.G); g.set(7, 5, M.W); for (let i = 0; i < 4; i++) g.set(3 + i * 3, 9, (i + b) % 2 ? M.G : M.P); if (b) g.poly([[6, 11], [10, 11], [12, 15], [4, 15]], M.G); break;
    case 'golem': g.rect(3, 4 + b, 10, 9, M.P); g.rect(1, 6 + b, 2, 5, M.S); g.rect(13, 6 + b, 2, 5, M.S); g.rect(5, 7 + b, 2, 2, M.G); g.rect(9, 7 + b, 2, 2, M.G); g.rect(4, 13, 3, 2, M.D); g.rect(9, 13, 3, 2, M.D); g.set(5, 4 + b, M.S); break;
    case 'fox': g.ell(9, 10, 5, 3, M.P); g.ell(5, 7, 3, 3, M.P); g.poly([[2, 5], [3, 1], [5, 4]], M.P); g.poly([[5, 4], [7, 1], [8, 5]], M.P); g.ell(2, 8, 2, 1, M.W); g.set(4, 7, M.D); g.poly([[13, 9], [16, 4 + b * 2], [15, 11]], M.G); g.rect(6, 13, 2, 2, M.D); g.rect(11, 13, 2, 2, M.D); break;
    case 'slime': g.ell(8, 10 - b, 6, 4 + b, M.G); g.ell(6, 8 - b, 2, 1, M.W); g.set(6, 10 - b, M.D); g.set(10, 10 - b, M.D); g.rect(4, 14, 8, 1, M.P); break;
    case 'owl': g.ell(8, 8, 5, 6, M.P); g.ell(6, 6, 2, 2, M.W); g.ell(10, 6, 2, 2, M.W); g.set(6, 6, M.D); g.set(10, 6, M.D); g.poly([[7, 8], [9, 8], [8, 10]], M.G); g.poly([[3, 7 - b], [0, 11 - b], [3, 12]], M.S); g.poly([[13, 7 - b], [16, 11 - b], [13, 12]], M.S); g.rect(6, 14, 1, 2, M.G); g.rect(9, 14, 1, 2, M.G); break;
  }
}
const PET_SPR = new Map();
function petSprite(id, f = 0) {
  const key = id + '|' + f; let c = PET_SPR.get(key); if (c) return c;
  const d = getDef(id); const g = new Spr(16, 16); const PA = d.o.t === 'prem' && PET_ART[d.n]; if (PA) PA.draw(g, f); else petBody(g, d.sub, f); g.fin();
  c = renderSpr(g, itemPal(d, d.r === 6 ? Math.floor(T_NOW * 8) % 8 : 0)); PET_SPR.set(key, c); if (PET_SPR.size > 120) PET_SPR.delete(PET_SPR.keys().next().value); return c;
}
function drawPetAt(id, x, y, sc = 1, flip = false) {
  if (!id || !S.inv) return; const d = getDef(id); if (d.cat !== 'p') return;
  const f = Math.floor(T_NOW * 4) % 2, bob = Math.round(Math.sin(T_NOW * 4) * (d.sub === 'ufo' || d.sub === 'jelly' || d.sub === 'owl' || d.sub === 'bot' ? 2 : 0.5) * sc);
  const s = petSprite(id, f); x = Math.floor(x); y = Math.floor(y);
  shadow(x, y + 1, 5 * sc, 1.5 * sc, 0.35);
  if (d.r >= 3) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(T_NOW * 3); ctx.drawImage(tinted(haloOf(s), rcol(d.r) === 'RAINBOW' ? rainbow(T_NOW) : rcol(d.r)), x - 8 * sc - sc, y - 16 * sc - sc + bob, 18 * sc, 18 * sc); ctx.globalAlpha = 1; }
  if (flip) { ctx.save(); ctx.translate(x + 8 * sc, 0); ctx.scale(-1, 1); ctx.drawImage(s, 0, y - 16 * sc + bob, 16 * sc, 16 * sc); ctx.restore(); }
  else ctx.drawImage(s, x - 8 * sc, y - 16 * sc + bob, 16 * sc, 16 * sc);
  const PA = d.o.t === 'prem' && PET_ART[d.n];
  if (PA && PA.glow) { const nx = flip ? x + 8 * sc - (PA.nose[0] + 0.5) * sc : x - 8 * sc + (PA.nose[0] + 0.5) * sc, ny = y - 16 * sc + bob + (PA.nose[1] + 0.5) * sc; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T_NOW * 5); circ(nx, ny, Math.round(3 * sc), PA.glow); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T_NOW * 5); circ(nx, ny, Math.round(1.6 * sc), PA.glow); ctx.globalAlpha = 1; }
}

// ---------- gadgets in the world ----------
function useGadget(w, pl, ax, ay) {
  const G = pl.G; if (!G || G.cd > 0 || pl.dead) return false;
  G.cd = G.max; const k = G.k;
  const dx = ax - pl.x, dy = ay - pl.y, dd = Math.hypot(dx, dy) || 1;
  const reach = (max) => { const r = Math.min(max, dd); return { x: pl.x + dx / dd * r, y: pl.y + dy / dd * r }; };
  w.gx = w.gx || [];
  wsnd(w, 'gadget'); if (!w.demo) stat(w, 'kills2');
  switch (k) {
    case 'blackhole': { const p = reach(150); w.gx.push({ k, x: p.x, y: p.y, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg }); wsnd(w, 'launch'); break; }
    case 'cluster': { const p = reach(160); w.gx.push({ k, x0: pl.x, y0: pl.y - 6, x: p.x, y: p.y, t: 0, dur: 0.45, rad: G.rad, dmg: G.dmg }); break; }
    case 'dome': w.gx.push({ k, x: pl.x, y: pl.y, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg, follow: true }); wsnd(w, 'unlock'); break;
    case 'timewarp': w.gx.push({ k, x: pl.x, y: pl.y, t: 0, dur: G.dur, rad: G.rad, follow: true }); if (!w.demo) FX.slowmo = Math.max(FX.slowmo, 0.15); break;
    case 'decoy': { const p = reach(70); w.decoy = { x: p.x, y: p.y, t: G.dur }; w.gx.push({ k, x: p.x, y: p.y, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg }); break; }
    case 'orbital': { const p = reach(220); w.gx.push({ k, x: p.x, y: p.y, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg }); break; }
    case 'freeze': {
      for (const e of (w.ents || NO_ENTS)) { if (e.dead || Math.hypot(e.x - pl.x, e.y - pl.y) > G.rad) continue; if (e.boss) { e.slow = Math.max(e.slow || 0, G.dur); e.chill = 1; } else e.freeze = Math.max(e.freeze || 0, G.dur); damageEnemy(w, e, G.dmg, { quiet: true, col: '#bff6ff' }); }
      w.gx.push({ k, x: pl.x, y: pl.y, t: 0, dur: 0.5, rad: G.rad }); wsnd(w, 'freeze'); break;
    }
    case 'blink': {
      let tx = pl.x, ty = pl.y; const steps = Math.ceil(Math.min(G.rad, dd) / 4);
      for (let i = 1; i <= steps; i++) { const nx = pl.x + dx / dd * i * 4, ny = pl.y + dy / dd * i * 4; if (w.solid(nx, ny) || (w.bounds && (nx < w.bounds[0] || nx > w.bounds[2] || ny < w.bounds[1] || ny > w.bounds[3]))) break; tx = nx; ty = ny; }
      const hit = new Set(); for (const e of (w.ents || NO_ENTS)) { if (e.dead) continue; const t = clamp(((e.x - pl.x) * (tx - pl.x) + (e.y - pl.y) * (ty - pl.y)) / Math.max(1, (tx - pl.x) ** 2 + (ty - pl.y) ** 2), 0, 1); const cx = pl.x + (tx - pl.x) * t, cy = pl.y + (ty - pl.y) * t; if (Math.hypot(e.x - cx, e.y - cy) < e.r + 10) hit.add(e); }
      w.gx.push({ k, x0: pl.x, y0: pl.y, x: tx, y: ty, t: 0, dur: 0.3 });
      for (let i = 0; i < 10; i++) w.fx.add({ x: pl.x, y: pl.y - 8, vx: (R0() - 0.5) * 80, vy: (R0() - 0.5) * 80, life: 0.35, c: '#bff3ff', s: 2, t: 'shrink' });
      pl.x = tx; pl.y = ty; pl.inv = Math.max(pl.inv, 0.4);
      for (const e of hit) damageEnemy(w, e, G.dmg, { col: '#bff3ff' });
      wsnd(w, 'zap'); break;
    }
    case 'turret': w.gx.push({ k, x: pl.x + Math.cos(pl.aim) * 14, y: pl.y + Math.sin(pl.aim) * 10, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg, cd: 0, a: pl.aim }); wsnd(w, 'unlock'); break;
    case 'medkit': w.gx.push({ k, x: pl.x, y: pl.y, t: 0, dur: G.dur, heal: G.heal, follow: true }); wsnd(w, 'levelup'); break;
    case 'emp': {
      const first = nearestEnemy(w, ax, ay, 90) || nearestEnemy(w, pl.x, pl.y, G.rad);
      if (first) { w.zaps.push({ x0: pl.x, y0: pl.y - 8, x1: first.x, y1: first.y - 3, t: 0, col: '#fff25a' }); damageEnemy(w, first, G.dmg, { col: '#fff25a' }); if (!first.boss) first.stun = Math.max(first.stun || 0, G.dur); chainZap(w, first, G.dmg * 0.8, 4 + G.r, { mid: '#fff25a' }); for (const e of (w.ents || NO_ENTS)) if (!e.dead && !e.boss && Math.hypot(e.x - first.x, e.y - first.y) < 80) e.stun = Math.max(e.stun || 0, G.dur * 0.7); }
      else { G.cd = 0.5; w.fx.text(pl.x, pl.y - 30, 'NO TARGET', COL.dim, { f: FS, life: 0.5 }); }
      break;
    }
    case 'slam': w.gx.push({ k, x: pl.x, y: pl.y, t: 0, dur: G.dur, rad: G.rad, dmg: G.dmg, follow: true }); w.pulls.push({ x: pl.x, y: pl.y, r: G.rad, str: 260, t: G.dur }); wsnd(w, 'launch'); break;
  }
  if (G.cd > 0.6) gadgetJuice(w, pl, k);
  return true;
}
function updateGadgetFx(w, dt) {
  if (!w.gx || !w.gx.length) return;
  const pl = w.player;
  for (const g of w.gx) {
    g.t += dt; if (g.follow && pl) { g.x = pl.x; g.y = pl.y; }
    switch (g.k) {
      case 'blackhole': {
        for (const e of (w.ents || NO_ENTS)) { if (e.dead || e.nest || e.dummy) continue; const dx = g.x - e.x, dy = g.y - e.y, d = Math.hypot(dx, dy); if (d < g.rad && d > 2) { const s = (e.boss ? 25 : 150) * (1 - d / g.rad * 0.5); e.x += dx / d * s * dt; e.y += dy / d * s * dt; } if (d < g.rad * 0.45) { g.acc = (g.acc || 0) + dt; } }
        g.tick = (g.tick || 0) + dt; if (g.tick > 0.25) { g.tick = 0; for (const e of (w.ents || NO_ENTS)) if (!e.dead && Math.hypot(e.x - g.x, e.y - g.y) < g.rad * 0.45) damageEnemy(w, e, g.dmg * 0.25, { quiet: true, col: '#d9a6ff' }); }
        if (R0() < 0.9) { const a = R0() * TAU, r = g.rad * (0.6 + R0() * 0.4); w.fx.add({ x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r * 0.7, vx: -Math.cos(a) * r * 2.4 - Math.sin(a) * 50, vy: -Math.sin(a) * r * 1.7 + Math.cos(a) * 35, life: 0.4, c: R0() < 0.5 ? '#b066ff' : '#2a0a40', s: 1 }); }
        if (g.t >= g.dur && !g.done) { g.done = true; explode(w, g.x, g.y, g.rad * 0.7, g.dmg * 3, { core: '#fff', mid: '#d9a6ff', edge: '#7a2cff', dark: '#14002a' }); }
        break;
      }
      case 'cluster': if (g.t >= g.dur && !g.done) { g.done = true; explode(w, g.x, g.y, g.rad, g.dmg); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const bx = g.x + Math.cos(a) * 30, by = g.y + Math.sin(a) * 22; w.tele.push({ x: bx, y: by, r: 0, t: 0, max: 0.25 + i * 0.05, dmg: 0, col: '#ff9a3d', onDone: () => explode(w, bx, by, g.rad * 0.85, g.dmg * 0.8) }); } } break;
      case 'dome': {
        for (const s of w.eshots) if (Math.hypot(s.x - g.x, s.y - g.y) < g.rad) { s.life = 0; w.fx.add({ x: s.x, y: s.y, life: 0.2, c: '#9fe7ff', s: 3, t: 'ring' }); }
        for (const e of (w.ents || NO_ENTS)) { if (e.dead || e.boss || e.nest) continue; const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy); if (d < g.rad && d > 1) { e.kx += dx / d * 300 * dt; e.ky += dy / d * 300 * dt; } }
        break;
      }
      case 'timewarp':
        for (const e of (w.ents || NO_ENTS)) if (!e.dead && Math.hypot(e.x - g.x, e.y - g.y) < g.rad) { e.warp = 0.3; }
        for (const s of w.eshots) if (!s.warped && Math.hypot(s.x - g.x, s.y - g.y) < g.rad) { s.warped = true; s.vx *= 0.3; s.vy *= 0.3; s.life *= 2; }
        break;
      case 'decoy': if (w.decoy) { w.decoy.x = g.x; w.decoy.y = g.y; } if (g.t >= g.dur && !g.done) { g.done = true; w.decoy = null; explode(w, g.x, g.y, g.rad, g.dmg, { core: '#fff', mid: '#b79ced', edge: '#7161ef', dark: '#14213d' }); } break;
      case 'orbital': if (g.t >= g.dur && !g.done) { g.done = true; for (const e of (w.ents || NO_ENTS)) if (!e.dead && Math.hypot(e.x - g.x, e.y - g.y) < g.rad + e.r) damageEnemy(w, e, g.dmg, { col: '#fff6c0' }); explode(w, g.x, g.y, g.rad * 0.6, 0, { core: '#fff', mid: '#fff6c0', edge: '#fca311', dark: '#802000' }); g.flashT = 0.35; if (!w.demo) { shake(7); FX.flash = 0.25; FX.flashCol = '#fff6c0'; if (!w.arena) FX.hitstop = Math.max(FX.hitstop, 0.06); } for (let i = 0; i < 16; i++) { const a = R0() * TAU, sp = 60 + R0() * 120; w.fx.add({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 40, g: 200, life: 0.6, c: R0() < 0.5 ? '#fff6c0' : '#8a6a3a', s: 2, drag: 1 }); } } break;
      case 'turret': {
        g.cd -= dt; const tg = nearestEnemy(w, g.x, g.y, g.rad);
        if (tg) { g.a = Math.atan2(tg.y - 4 - g.y, tg.x - g.x); if (g.cd <= 0) { g.cd = 0.3; const s = makeShot(w, w.player, { dmg: g.dmg, col: { core: '#fff', mid: '#9fe7ff', edge: '#4ac6ff', dark: '#14213d' }, v: {}, el: null, spd: 260, rng: g.rad, pierce: 0 }, g.a, { child: true, noVerbs: true, kind: 'bolt', spd: 260, rng: g.rad, r: 2, dmg: g.dmg }); s.x = g.x + Math.cos(g.a) * 6; s.y = g.y - 6 + Math.sin(g.a) * 6; wsnd(w, 'pew'); } }
        break;
      }
      case 'medkit': if (pl && !pl.dead) { pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * g.heal / g.dur * dt); if (R0() < 0.4) w.fx.add({ x: pl.x + (R0() - 0.5) * 14, y: pl.y - 8 - R0() * 12, vx: 0, vy: -20, life: 0.6, c: '#7dffb0', t: 'pat', pat: '.#.|###|.#.' }); } break;
      case 'slam': if (g.t >= g.dur && !g.done) { g.done = true; explode(w, g.x, g.y, g.rad * 0.5, g.dmg, { core: '#fff', mid: '#c9c0ff', edge: '#7161ef', dark: '#14213d' }); for (const e of (w.ents || NO_ENTS)) if (!e.dead && !e.boss && Math.hypot(e.x - g.x, e.y - g.y) < g.rad * 0.6) e.stun = Math.max(e.stun || 0, 0.8); if (!w.demo) { shake(8); if (!w.arena) FX.hitstop = Math.max(FX.hitstop, 0.06); } for (let r = 0; r < 3; r++) w.fx.add({ x: g.x, y: g.y, life: 0.3 + r * 0.1, c: r ? '#c9c0ff' : '#ffffff', s: g.rad * (0.4 + r * 0.3), t: 'ring' }); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; w.fx.add({ x: g.x + Math.cos(a) * 10, y: g.y + Math.sin(a) * 6, vx: Math.cos(a) * 140, vy: Math.sin(a) * 90, life: 0.45, c: '#9a8f86', s: 3, t: 'puff', drag: 3 }); } } break;
      case 'goo': for (const e of (w.ents || NO_ENTS)) if (!e.dead && Math.hypot(e.x - g.x, e.y - g.y) < g.rad + e.r) e.slow = Math.max(e.slow || 0, 0.5); break;
    }
  }
  w.gx = w.gx.filter(g => g.t < g.dur + (g.k === 'orbital' ? 0.4 : 0.05));
}
function drawGadgetFx(w, ox, oy) {
  if (!w.gx) return;
  for (const g of w.gx) {
    const x = Math.floor(g.x - ox), y = Math.floor(g.y - oy), k = g.dur ? g.t / g.dur : 1;
    switch (g.k) {
      case 'blackhole': { const r = Math.max(3, g.rad * 0.22 * Math.min(1, g.t * 4)); ctx.globalAlpha = 0.25; ellipse(x, y, g.rad, g.rad * 0.7, '#2a0a40'); ctx.globalAlpha = 1; ellipse(x, y, r * 1.6, r * 0.5, '#d9a6ff'); circ(x, y, Math.floor(r), '#000'); ctx.strokeStyle = '#b066ff'; ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, r + 1, 0, TAU); ctx.stroke(); break; }
      case 'cluster': if (!g.done) { const t = Math.min(1, g.t / g.dur); const bx = lerp(g.x0 - ox, x, t), by = lerp(g.y0 - oy, y, t) - Math.sin(t * Math.PI) * 30; circ(bx, by, 2, '#ff9a3d'); px(bx, by - 3, Math.floor(T_NOW * 20) % 2 ? '#fff' : '#fca311'); ctx.globalAlpha = 0.4; ellipse(x, y, g.rad, g.rad * 0.6, '#ff9a3d'); ctx.globalAlpha = 1; } break;
      case 'dome': { const a = 0.25 + 0.15 * Math.sin(T_NOW * 8) - (k > 0.8 && Math.floor(T_NOW * 12) % 2 ? 0.15 : 0); ctx.globalAlpha = a; ctx.fillStyle = '#9fe7ff'; ctx.beginPath(); ctx.ellipse(x, y - 6, g.rad, g.rad * 0.85, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#dff8ff'; ctx.beginPath(); ctx.ellipse(x + 0.5, y - 5.5, g.rad, g.rad * 0.85, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break; }
      case 'timewarp': { ctx.globalAlpha = 0.12; ellipse(x, y - 4, g.rad, g.rad * 0.7, '#7fe9ff'); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#bff6ff'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(x + 0.5, y - 3.5, g.rad, g.rad * 0.7, T_NOW * 0.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; const ha = T_NOW * 3; line(x, y - 20, x + Math.cos(ha) * 8, y - 20 + Math.sin(ha) * 8, '#bff6ff'); break; }
      case 'decoy': if (!g.done) { ctx.globalAlpha = 0.4; ellipse(x, y, g.rad * 0.4, g.rad * 0.25, '#7161ef'); ctx.globalAlpha = 1; text(Math.ceil(g.dur - g.t) + '', x, y - 34, COL.lilac, FS, 1); } break;
      case 'orbital': if (!g.done) { const kk = g.t / g.dur; ctx.globalAlpha = 0.25 + kk * 0.4; ellipse(x, y, g.rad * (1.4 - kk * 0.4), g.rad * 0.6 * (1.4 - kk * 0.4), '#fca311'); ctx.globalAlpha = 0.5 + kk * 0.5; rect(x - 1, 0, 2, y, '#fff6c0'); ctx.globalAlpha = 1; } else if (g.flashT > 0) { g.flashT -= 1 / 60; ctx.globalAlpha = g.flashT * 2.5; rect(x - g.rad * 0.3, 0, g.rad * 0.6, y, '#fff6c0'); rect(x - 3, 0, 6, y, '#ffffff'); ctx.globalAlpha = 1; } break;
      case 'freeze': { const e2 = 1 - Math.pow(1 - k, 3); ctx.globalAlpha = 0.25 * (1 - k); ellipse(x, y, g.rad * e2, g.rad * 0.7 * e2, '#bff6ff'); ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.strokeStyle = '#dff8ff'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, g.rad * e2, g.rad * 0.7 * e2, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, g.rad * e2 * 0.8, g.rad * 0.56 * e2, 0, 0, TAU); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, rr = g.rad * e2; const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * 0.7; rect(sx - 1, sy - 3, 2, 6, '#ffffff'); rect(sx - 3, sy - 1, 6, 2, '#bff6ff'); } ctx.globalAlpha = 1; break; }
      case 'blink': { ctx.globalAlpha = 1 - k; line(g.x0 - ox, g.y0 - oy - 8, x, y - 8, '#bff3ff'); line(g.x0 - ox, g.y0 - oy - 7, x, y - 7, '#ffffff'); if (w.player) { const spr = maskOf(astroSprite(S.eq || {}, w.player.dir || 0, 0), '#bff3ff'); for (let i = 1; i <= 4; i++) { const t = i / 5; ctx.globalAlpha = (1 - k) * (0.15 + t * 0.35); ctx.drawImage(spr, Math.floor(lerp(g.x0 - ox, x, t)) - 10, Math.floor(lerp(g.y0 - oy, y, t)) - 25); } } ctx.globalAlpha = 1; break; }
      case 'turret': { rect(x - 4, y - 4, 8, 5, '#273469'); circ(x, y - 6, 3, '#7161ef'); line(x, y - 6, x + Math.cos(g.a) * 7, y - 6 + Math.sin(g.a) * 7, '#dff8ff'); bar(x - 6, y + 3, 12, 2, 1 - k, '#9fe7ff', COL.void0); break; }
      case 'slam': if (!g.done) { ctx.globalAlpha = 0.3 + k * 0.4; ctx.strokeStyle = '#c9c0ff'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, g.rad * (1 - k * 0.6), g.rad * 0.7 * (1 - k * 0.6), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } break;
      case 'goo': ctx.globalAlpha = 0.5 * (1 - k * 0.7); ellipse(x, y, g.rad, g.rad * 0.55, g.col || '#7dff9a'); ctx.globalAlpha = 1; break;
    }
  }
}
// ---------- pets in the world ----------
function petTick(w, pl, dt) {
  const P = pl.pet; if (!P || pl.dead) return;
  // follow a little behind
  const side = pl.dir === 2 ? 1 : pl.dir === 3 ? -1 : 0.7;
  const tx = pl.x + side * 14, ty = pl.y + 4;
  if (pl.petX === undefined) { pl.petX = tx; pl.petY = ty; }
  const leap = P.leap; if (leap) { leap.t += dt; const kk = Math.min(1, leap.t / 0.25); pl.petX = lerp(leap.x0, leap.x, kk); pl.petY = lerp(leap.y0, leap.y, kk) - Math.sin(kk * Math.PI) * 10; if (leap.t > 0.5) P.leap = null; }
  else { pl.petX = lerp(pl.petX, tx, Math.min(1, dt * 6)); pl.petY = lerp(pl.petY, ty, Math.min(1, dt * 6)); }
  P.t = (P.t || 0) - dt;
  if (w.demo && P.k !== 'jelly') { if (P.t > 0) return; }
  switch (P.k) {
    case 'bot': if (P.t <= 0) { const e = nearestEnemy(w, pl.petX, pl.petY, 120); if (e) { P.t = P.cd; w.zaps.push({ x0: pl.petX, y0: pl.petY - 10, x1: e.x, y1: e.y - 3, t: 0, col: '#9fe7ff' }); damageEnemy(w, e, P.dmg, { quiet: true, col: '#9fe7ff' }); wsnd(w, 'zap'); } } break;
    case 'cat': if (P.t <= 0) { const e = nearestEnemy(w, pl.x, pl.y, 75); if (e) { P.t = P.cd; P.leap = { x0: pl.petX, y0: pl.petY, x: e.x, y: e.y + 2, t: 0 }; damageEnemy(w, e, P.dmg * 1.6, { col: '#ffd1ea' }); if (!e.boss) e.stun = Math.max(e.stun || 0, 0.4); } } break;
    case 'jelly': if (!w.demo && pl.hp < pl.maxHp) { pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * P.heal * dt); if (R0() < 0.05) w.fx.add({ x: pl.petX, y: pl.petY - 10, vy: -16, life: 0.6, c: '#7dffb0', t: 'pat', pat: '.#.|###|.#.' }); } break;
    case 'golem': if (pl.petShieldT > 0) pl.petShieldT -= dt; break;
    case 'slime': if (P.t <= 0 && pl.moving) { P.t = P.cd; (w.gx = w.gx || []).push({ k: 'goo', x: pl.petX, y: pl.petY, t: 0, dur: 3, rad: 10 + P.r * 1.5, col: '#7dff9a' }); } break;
  }
}
function petBlocks(w, pl) {
  const P = pl.pet; if (!P || P.k !== 'golem' || (pl.petShieldT || 0) > 0) return false;
  pl.petShieldT = P.cd; pl.inv = Math.max(pl.inv, 0.5);
  w.fx.text(pl.x, pl.y - 30, 'BLOCKED', '#c9c0ff', { f: FB, life: 0.7 }); w.fx.burst(pl.x, pl.y - 8, 10, { c: ['#c9c0ff', '#fff'], sp: 60 }); wsnd(w, 'freeze');
  return true;
}
function drawPetWorld(w, pl, ox, oy) {
  if (!pl.pet || pl.petX === undefined) return;
  drawPetAt(pl.pet.id, pl.petX - ox, pl.petY - oy, 1, pl.petX < pl.x);
  if (pl.pet.k === 'golem' && (pl.petShieldT || 0) <= 0) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 6); ctx.strokeStyle = '#c9c0ff'; ctx.beginPath(); ctx.ellipse(Math.floor(pl.x - ox) + 0.5, Math.floor(pl.y - oy) - 11.5, 11, 14, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
// ---------- holo demo for gadgets ----------
function makeGadgetDemo(id) {
  const d = getDef(id); const w = makeWorld({ demo: true, pi: Math.max(1, S.planet.cur || 1), bounds: [8, 20, 160, 100] }); w.hpMul = 1; w.dmgMul = 1; w.sndOn = false;
  const L = loadout(); const pl = makePlayer(40, 70, L); pl.hp = pl.maxHp = 999; w.player = pl;
  const gs = gStats(d, Math.max(1, lvl(id) || 1)); pl.G = Object.assign(gs, { id, max: Math.min(2.4, gs.cd), cd: 0.8 });
  return w;
}
