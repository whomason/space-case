// ===== SIGS: every planet's signature mechanic, map layout, and the relic chain =====
// Each planet has one thing you remember it for. Its boss drops a RELIC, and that relic is the
// key to the NEXT planet's mechanic: beat one world and you are ready for the next.
const SIGS = [
  null,
  { n: 'SUPPLY DROPS', t: 'POD DROPS CRASH DOWN NEAR YOU. CRACK THEM OPEN FOR ORE AND COINS', k: 'drops', lay: 'craters', relic: ['THORNHIDE PLATING', 'THORNS CANNOT HURT YOU. +5% HEALTH', '#9aa3c0'] },
  { n: 'THORNS + BOUNCE CAPS', t: 'THORN THICKETS HURT. GIANT BOUNCE CAPS LAUNCH YOU OVER THEM', k: 'thorns', lay: null, relic: ['CLEAT SPIKES', 'NO SLIDING ON ICE. +5% SPEED', '#9fe6ff'] },
  { n: 'BLACK ICE', t: 'FROZEN LAKES YOU SLIDE ACROSS. ICICLES FALL WHEN THE ICE CRACKS', k: 'ice', lay: 'icelakes', relic: ['COOLANT CORE', 'NO HEAT O2 DRAIN. ERUPTIONS HIT HALF AS HARD', '#4ee8ff'] },
  { n: 'ERUPTIONS', t: 'LAVA VENTS BLAST FIRE ON A RHYTHM. THE RICHEST ORE SITS RIGHT BESIDE THEM', k: 'erupt', lay: 'rivers', relic: ['TIDE CHART', 'LOW TIDE LASTS TWICE AS LONG', '#ff9a3d'] },
  { n: 'TIDES', t: 'BRINE POOLS SWELL AND DRAIN. LOW TIDE UNCOVERS SALT CACHES', k: 'tide', lay: null, relic: ['GALE ANCHOR', 'GUSTS CANNOT PUSH YOU', '#e9a6c8'] },
  { n: 'GUSTS', t: 'WIND BLASTS SHOVE EVERYTHING, SHOTS INCLUDED. WATCH THE ARROWS', k: 'gust', lay: null, relic: ['STORM GOGGLES', 'SEE CLEARLY IN BONE STORMS', '#bfe9ff'] },
  { n: 'BONE STORMS', t: 'SANDSTORMS ROLL IN, BLIND YOU, AND WAKE THE BONES', k: 'storm', lay: 'ribs', relic: ['GLOW LANTERN', 'YOUR LIGHT REACHES MUCH FARTHER IN THE DARK', '#ffe36b'] },
  { n: 'DARKNESS + GLOWBLOOMS', t: 'PITCH BLACK. GLOWBLOOMS LIGHT THE WAY. SHOOT ONE FOR A FLARE', k: 'dark', lay: null, relic: ['REEF WARD', 'CORAL SPIKES WARN LONGER AND HIT HALF AS HARD', '#ff7ab8'] },
  { n: 'LIVING REEF', t: 'LINES OF CORAL SPIKES BURST FROM THE GROUND. WATCH THE RED LINES', k: 'reef', lay: null, relic: ['GRAVITY DAMPER', 'NO HEAVY GRAVITY. MAGNETS CANNOT PULL YOU', '#c8c8d8'] },
  { n: 'MAGNET PULSES', t: 'PYLONS PULSE AND DRAG YOU, YOUR SHOTS AND LOOSE ORE TOWARD THEM', k: 'magnet', lay: null, relic: ['SPORE FILTER', 'SPORE CLOUDS CANNOT CHOKE YOU', '#8cff3a'] },
  { n: 'SPORE CLOUDS', t: 'DRIFTING SPORE CLOUDS SLOW YOU DOWN AND CHOKE YOUR O2', k: 'spores', lay: null, relic: ['MACHINE KEY', 'OLD MACHINES START FOR FREE', '#fca311'] },
  { n: 'DORMANT MACHINES', t: 'FEED ORE TO OLD WAR MACHINES AND THEY FIGHT FOR YOU', k: 'machines', lay: null, relic: ['AURORA LENS', 'AURORA LIGHT CHARGES YOU TWICE AS FAST', '#7dffb0'] },
  { n: 'AURORA BANDS', t: 'STAND IN THE FALLING AURORA TO SUPERCHARGE YOUR WEAPON', k: 'aurora', lay: null, relic: ['TRUE SIGHT', 'MIRAGES ARE REVEALED', '#ffd27a'] },
  { n: 'MIRAGES', t: 'SOME ORE IS A MIRAGE AND VANISHES WHEN YOU MINE IT. REAL ORE CASTS A SHADOW', k: 'mirage', lay: null, relic: ['LIGHTNING ROD', 'LIGHTNING NEVER HITS YOU. NEAR MISSES CHARGE YOUR GUN', '#fff25a'] },
  { n: 'LIGHTNING RODS', t: 'LIGHTNING STRIKES THE RODS. STAND CLOSE (NOT TOO CLOSE) TO GET CHARGED', k: 'rods', lay: null, relic: ['PRISM SHARD', 'SHOTS THROUGH PRISMS SPLIT INTO 3', '#c77dff'] },
  { n: 'PRISMS', t: 'SHOOT THROUGH CRYSTAL PRISMS AND YOUR SHOTS SPLIT', k: 'prism', lay: null, relic: ['SONAR PULSE', 'YOUR OWN PULSE LIGHTS THE ABYSS EVERY FEW SECONDS', '#4ee8ff'] },
  { n: 'GLOW PULSES', t: 'TOTAL DARK. GLOWING LIFE PULSES AND SHOWS YOU THE WAY FOR A MOMENT', k: 'abyss', lay: null, relic: ['ASH CLOAK', 'STARFALLS WARN LONGER AND HIT HALF AS HARD', '#ff7a2e'] },
  { n: 'STARFALL', t: 'HUGE BURNING ROCKS SMASH DOWN AND LEAVE CRATERS FULL OF ORE', k: 'starfall', lay: 'craters', relic: ['CHRONO SHARD', 'TIME FIELDS NO LONGER SLOW YOU', '#e5d8ff'] },
  { n: 'TIME FIELDS', t: 'INSIDE THE CLOCK RINGS, ALIENS AND SHOTS CRAWL. SO DO YOU', k: 'time', lay: 'rings', relic: ['CONVERGENCE CORE', 'THE CONVERGENCE CHANGES MORE SLOWLY', '#ffffff'] },
  { n: 'THE CONVERGENCE', t: 'THIS WORLD CYCLES THROUGH THE POWERS OF EVERY PLANET BEFORE IT', k: 'converge', lay: null, relic: ['CROWN OF STARS', 'EVERY RELIC IS 50% STRONGER', '#fff6c2'] },
];
const sigOf = pi => SIGS[((pi - 1) % 20) + 1];
const relicOf = pi => { const s = sigOf(pi); return { n: s.relic[0], t: s.relic[1], c: s.relic[2] }; };
const hasRelic = pi => !!(S.relics && S.relics[pi]);
const relicCount = () => S.relics ? Object.keys(S.relics).length : 0;
// relics found also make you a little stronger everywhere
function relicPower() { return 1 + relicCount() * 0.02 * (hasRelic(20) ? 1.5 : 1); }
function drawRelicIcon(pi, x, y, s = 1, dim) {
  const c = relicOf(pi).c, k = s; x = Math.floor(x); y = Math.floor(y);
  if (dim) ctx.globalAlpha = 0.35;
  rect(x + 3 * k, y, 4 * k, k, '#05020c'); rect(x + k, y + k, 8 * k, 8 * k, '#05020c'); rect(x + 3 * k, y + 9 * k, 4 * k, k, '#05020c');
  rect(x + 2 * k, y + k, 6 * k, 7 * k, c); rect(x + 3 * k, y + 2 * k, 2 * k, 2 * k, '#ffffff'); rect(x + 2 * k, y + 6 * k, 6 * k, 2 * k, mixHex(c, '#05020c', 0.4));
  ctx.globalAlpha = 1;
}

// ---------- map layouts: each changes the land/liquid field ----------
// v < 0.33 is solid (liquid / pit). tx, ty in tiles (72 x 72), ship at the middle.
function sigLayoutInit(pi, R) {
  const lay = sigOf(pi).lay, L = { lay, c: [] };
  if (lay === 'craters') for (let i = 0; i < 14; i++) { const a = R() * TAU, d = 10 + R() * 24; L.c.push([36 + Math.cos(a) * d, 36 + Math.sin(a) * d, 2.5 + R() * 3]); }
  if (lay === 'rivers') { L.rv = [[18 + R() * 6, R() * 6, 0.11 + R() * 0.04], [50 + R() * 6, R() * 6, 0.09 + R() * 0.04]]; L.br = 7 + Math.floor(R() * 3); }
  if (lay === 'rings') { L.rg = [11, 19, 27].map(r => ({ r, gaps: [0, 1, 2, 3].map(() => R() * TAU) })); }
  if (lay === 'ribs') { L.rb = R() * 2; }
  return L;
}
function sigLayoutV(L, tx, ty, v) {
  if (!L || !L.lay) return v;
  if (L.lay === 'craters') { for (const [x, y, r] of L.c) { const d = Math.hypot(tx - x, ty - y); if (d < r) return Math.min(v, 0.1); if (d < r + 1.2) return Math.max(v, 0.6); } return v; }
  if (L.lay === 'rivers') {
    for (const [y0, ph, k] of L.rv) { const yy = y0 + Math.sin(tx * k + ph) * 5; if (Math.abs(ty - yy) < 1.6 && (Math.floor(tx) % L.br) > 1) return 0.05; }
    return Math.max(v, 0.45);
  }
  if (L.lay === 'rings') {
    const d = Math.hypot(tx - 36, ty - 36), a = Math.atan2(ty - 36, tx - 36);
    for (const g of L.rg) if (Math.abs(d - g.r) < 0.9 && !g.gaps.some(ga => Math.abs(angDiff(a, ga)) < 0.32)) return 0.05;
    return Math.max(v, 0.45);
  }
  if (L.lay === 'ribs') { const u = (tx + ty * 0.6 + L.rb) % 9; if (u < 1 && (Math.floor(ty / 3) % 3) !== 0 && Math.hypot(tx - 36, ty - 36) > 9) return 0.05; return Math.max(v, 0.42); }
  if (L.lay === 'icelakes') return Math.max(v, 0.42);   // the "lakes" are walkable ice, painted on later
  return v;
}

// ---------- setup on landing ----------
function sigSetup(R, rng) {
  const s = sigOf(R.pi), map = R.map, w = R.w;
  const G = R.sig = { k: s.k, s, t: 0, objs: [], first: !(S.planet.sigSeen && S.planet.sigSeen[R.pi]), nextT: 6, phase: 0, mode: null };
  const spot = (r, minShip) => propSpot(R, rng, r, minShip == null ? 90 : minShip);
  const add = o => { G.objs.push(Object.assign({ t: 0 }, o)); return o; };
  const k = s.k === 'converge' ? null : s.k;
  if (k === 'thorns') { for (let i = 0; i < 18; i++) { const p = spot(16, 70); if (p) add({ k: 'thorn', x: p.x, y: p.y, r: 14 + rng() * 10 }); } for (let i = 0; i < 9; i++) { const p = spot(10, 60); if (p) add({ k: 'shroom', x: p.x, y: p.y, r: 10, bounce: 0 }); } }
  if (k === 'ice') {
    const g = map.ground.x;
    for (let i = 0; i < 9; i++) { const p = spot(40, 60); if (!p) continue; const o = add({ k: 'icelake', x: p.x, y: p.y, r: 40 + rng() * 30 });
      g.save(); g.globalAlpha = 0.55; g.fillStyle = '#bfefff'; g.beginPath(); g.ellipse(o.x, o.y, o.r, o.r * 0.7, 0, 0, TAU); g.fill(); g.globalAlpha = 0.8; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      for (let c = 0; c < 6; c++) { g.beginPath(); let x = o.x + (rng() - 0.5) * o.r, y = o.y + (rng() - 0.5) * o.r * 0.6; g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (rng() - 0.5) * 18; y += (rng() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); } g.restore(); }
  }
  if (k === 'erupt') for (let i = 0; i < 10; i++) { const p = spot(18, 110); if (!p) continue; add({ k: 'vent', x: p.x, y: p.y, r: 32, cd: 3 + rng() * 6, st: 'idle' }); map.ores.push({ x: p.x + 22, y: p.y + 6, pi: R.pi, tier: R.p.ore[1], size: 2, units: 8, left: 8, prog: 0, shake: 0 }); }
  if (k === 'tide') for (let i = 0; i < 10; i++) { const p = spot(30, 100); if (p) add({ k: 'pool', x: p.x, y: p.y, r0: 26 + rng() * 18, cache: rng() < 0.7, got: false }); }
  if (k === 'storm' || k === 'gust' || k === 'reef' || k === 'drops' || k === 'aurora' || k === 'starfall') { /* timed: nothing to place */ }
  if (k === 'dark' || k === 'abyss') for (let i = 0; i < 16; i++) { const p = spot(8, 60); if (p) add({ k: 'bloom', x: p.x, y: p.y, r: 8, flare: 0 }); }
  if (k === 'magnet') for (let i = 0; i < 6; i++) { const p = spot(12, 150); if (p) add({ k: 'pylon2', x: p.x, y: p.y, r: 10, cd: 4 + i * 2.5, on: 0 }); }
  if (k === 'machines') for (let i = 0; i < 5; i++) { const p = spot(10, 100); if (p) w.props.push({ kind: 'turret', x: p.x, y: p.y, r: 8, use: hasRelic(R.pi - 1) ? 'E  START THE MACHINE' : 'E  FEED 5 ORE TO START IT', solid: true, on: 0, cd: 0, aim: 0, machine: true, dead: false, flash: 0, t: 0 }); }
  if (k === 'mirage') { const fakes = hasRelic(R.pi - 1); for (const o of map.ores) if (rng() < 0.4) o.fake = true; G.reveal = fakes; }
  if (k === 'rods') for (let i = 0; i < 6; i++) { const p = spot(10, 110); if (p) add({ k: 'rod', x: p.x, y: p.y, r: 6, cd: 3 + rng() * 6 }); }
  if (k === 'prism') for (let i = 0; i < 14; i++) { const p = spot(10, 70); if (p) w.props.push({ kind: 'prism', x: p.x, y: p.y, r: 8, cy: 10, hp: 1e9, maxHp: 1e9, shoot: true, solid: true, col: '#c77dff', dead: false, flash: 0, t: 0 }); }
  if (k === 'time') for (let i = 0; i < 6; i++) { const p = spot(30, 120); if (p) add({ k: 'clock', x: p.x, y: p.y, r: 58 + rng() * 20 }); }
  if (s.k === 'converge') { G.mode = 'drops'; G.modeT = 0; }
  // arrival: the first time here, a cache waits by the ship to show what this world pays
  if (!(S.planet.arrived && S.planet.arrived[R.pi])) {
    const p = propSpot(R, rng, 10, 50) || { x: map.shipX + 50, y: map.shipY + 30 };
    w.props.push({ kind: 'arrival', x: p.x, y: p.y, r: 9, use: 'E  OPEN THE ARRIVAL CACHE', solid: true, dead: false, flash: 0, t: 0 });
  }
  if (!S.planet.sigSeen) S.planet.sigSeen = {}; S.planet.sigSeen[R.pi] = 1;
}
const sigRelicHelps = R => hasRelic(R.pi - 1) * (hasRelic(20) ? 1.5 : 1);   // the relic from the planet before this one

// ---------- every frame ----------
function sigUpdate(R, dt) {
  const G = R.sig; if (!G || R.state !== 'play') return; const w = R.w, pl = w.player, map = R.map;
  G.t += dt;
  const key = G.s.k === 'converge' ? false : !!sigRelicHelps(R);
  // the signature introduces itself on the first landing
  if (G.first && G.t > 1.2 && !G.told) { G.told = true; banner(`${R.p.name}: ${G.s.n}. ${G.s.t}`, COL.gold); }
  const k = G.s.k === 'converge' ? G.mode : G.s.k;
  if (G.s.k === 'converge') { G.modeT += dt; if (G.modeT > (hasRelic(19) ? 60 : 40)) { G.modeT = 0; const m = ['drops', 'gust', 'reef', 'storm', 'aurora', 'starfall'].filter(x => x !== G.mode); G.mode = m[Math.floor(R0() * m.length)]; G.nextT = 4; banner(`THE CONVERGENCE SHIFTS: ${SIGS.find(x => x && x.k === G.mode).n}`, COL.magenta); } }
  G.nextT -= dt;
  const near = (rad) => { for (let i = 0; i < 12; i++) { const a = R0() * TAU, d = rad * (0.4 + R0() * 0.6); const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (!w.solid(x, y) && x > 40 && y > 40 && x < map.GW - 40 && y < map.GH - 40) return { x, y }; } return null; };
  w.slippery = R.p.trait === 'LOW GRAVITY';
  if (k === 'drops' && G.nextT <= 0) {
    G.nextT = 24 + R0() * 10; const p = near(130);
    if (p) w.tele.push({ x: p.x, y: p.y, r: 22, t: 0, max: 2.2, dmg: 12 * w.dmgMul, col: '#fca311', onDone: t => { G.objs.push({ k: 'pod', x: t.x, y: t.y, r: 9, t: 0 }); shake(5); w.fx.burst(t.x, t.y - 4, 30, { c: ['#fca311', '#fff', '#9aa3c0'], sp: 150, life: 0.7, s: 2 }); } });
    if (p && G.first && !G.podTold) { G.podTold = true; banner('SUPPLY POD INCOMING! STAND CLEAR, THEN CRACK IT OPEN WITH E', COL.gold); }
  }
  if (k === 'thorns') for (const o of G.objs) {
    const d = Math.hypot(pl.x - o.x, (pl.y - o.y) * 1.3);
    if (o.k === 'thorn' && d < o.r && !key && pl.boostT <= 0) { G.thornT = (G.thornT || 0) - dt; if (G.thornT <= 0) { G.thornT = 0.5; hurtPlayer(w, 5 * w.dmgMul, null); w.fx.text(pl.x, pl.y - 28, 'THORNS!', '#9be36b', { f: FS, life: 0.5 }); } }
    if (o.k === 'shroom') { o.bounce = Math.max(0, o.bounce - dt * 4); if (d < o.r && !(pl.boostT > 0)) { const a = Math.hypot(pl.vx, pl.vy) > 5 ? Math.atan2(pl.vy, pl.vx) : pl.aim; pl.boostT = 0.42; pl.bvx = Math.cos(a) * 420; pl.bvy = Math.sin(a) * 420; pl.inv = Math.max(pl.inv, 0.5); o.bounce = 1; SND.play('boost'); w.fx.burst(o.x, o.y - 8, 14, { c: ['#ff9fd0', '#fff'], sp: 120 }); } }
  }
  if (k === 'ice') {
    let on = false; for (const o of G.objs) if (o.k === 'icelake' && Math.hypot(pl.x - o.x, (pl.y - o.y) / 0.7) < o.r) on = true;
    if (on && !key) w.slippery = true;
    if (on && G.nextT <= 0) { G.nextT = 7 + R0() * 4; for (let i = 0; i < 3; i++) { const p = near(70); if (p) w.tele.push({ x: p.x, y: p.y, r: 14, t: 0, max: 1.3, dmg: 14 * w.dmgMul, col: '#bff6ff' }); } }
  }
  if (k === 'erupt') for (const o of G.objs) {
    o.cd -= dt;
    if (o.st === 'idle' && o.cd <= 0) { o.st = 'warn'; o.cd = key ? 1.6 : 1.2; }
    else if (o.st === 'warn' && o.cd <= 0) { o.st = 'blast'; o.cd = 1.6; if (Math.hypot(o.x - pl.x, o.y - pl.y) < 200) { SND.play('boom'); shake(3); } }
    else if (o.st === 'blast') { if (Math.random() < 0.6) w.fx.add({ x: o.x + (R0() - 0.5) * o.r, y: o.y - 4, vx: (R0() - 0.5) * 40, vy: -80 - R0() * 80, life: 0.6, c: R0() < 0.5 ? '#ff9a3d' : '#fff2a0', s: 2, t: 'shrink' });
      if (Math.hypot(pl.x - o.x, pl.y - o.y) < o.r) { G.burnT = (G.burnT || 0) - dt; if (G.burnT <= 0) { G.burnT = 0.3; hurtPlayer(w, (key ? 5 : 10) * w.dmgMul, null); } }
      for (const e of (w.ents || NO_ENTS)) if (!e.dead && !e.boss && Math.hypot(e.x - o.x, e.y - o.y) < o.r) { e.burn = Math.max(e.burn || 0, 1); e.burnDps = Math.max(e.burnDps || 0, 6 * w.hpMul); }
      if (o.cd <= 0) { o.st = 'idle'; o.cd = 5 + R0() * 3; } }
  }
  if (k === 'tide') {
    const per = 36, ph = (G.t % per) / per, low = key ? 0.5 : 0.25;
    G.tide = ph < low ? 0.35 : ph < low + 0.15 ? lerp(0.35, 1.4, (ph - low) / 0.15) : ph < 0.85 ? 1.4 : lerp(1.4, 0.35, (ph - 0.85) / 0.15);
    G.lowTide = G.tide < 0.5;
    for (const o of G.objs) { o.r = o.r0 * G.tide; const d = Math.hypot(pl.x - o.x, (pl.y - o.y) / 0.7);
      if (d < o.r) { w.moveMul = 0.7; G.brineT = (G.brineT || 0) - dt; if (G.brineT <= 0) { G.brineT = 0.6; hurtPlayer(w, 3 * w.dmgMul, null); } }
      if (o.cache && !o.got && G.lowTide && Math.hypot(pl.x - o.x, pl.y - o.y) < 18) { R.prompt = { x: o.x, y: o.y - 20, t: 'E  GRAB THE SALT CACHE' }; if (kp('KeyE')) { o.got = true; sigLoot(R, o.x, o.y, 1); } } }
    if (G.first && !G.tideTold && G.lowTide) { G.tideTold = true; banner('LOW TIDE! SALT CACHES ARE SHOWING IN THE POOL BEDS', COL.pink); }
  }
  if (k === 'gust') {
    if (!G.gust && G.nextT <= 0) { G.gust = { a: R0() < 0.5 ? 0 : Math.PI, t: 0, warn: 2 }; G.gust.a += (R0() - 0.5) * 0.8; }
    if (G.gust) { const g = G.gust; g.t += dt;
      if (g.t > g.warn) { const f = 110 * dt * 6; if (!key) { pl.x += Math.cos(g.a) * 70 * dt; pl.y += Math.sin(g.a) * 70 * dt; w.collide(pl); }
        for (const e of (w.ents || NO_ENTS)) if (!e.dead && !e.boss) { e.kx += Math.cos(g.a) * f * 0.5; e.ky += Math.sin(g.a) * f * 0.5; }
        for (const s of w.shots) { s.vx += Math.cos(g.a) * 160 * dt; s.vy += Math.sin(g.a) * 160 * dt; s.ang = Math.atan2(s.vy, s.vx); }
        for (const c of R.chunks) { c.x += Math.cos(g.a) * 60 * dt; c.y += Math.sin(g.a) * 60 * dt; } }
      if (g.t > g.warn + 3.5) { G.gust = null; G.nextT = 9 + R0() * 6; } }
  }
  if (k === 'storm') {
    if (!G.storm && G.nextT <= 0) { G.storm = { t: 0 }; banner('BONE STORM! THE DEAD ARE WAKING', COL.cream); }
    if (G.storm) { G.storm.t += dt; R.spawnT -= dt * 0.8; if (G.storm.t > 16) { G.storm = null; G.nextT = 32 + R0() * 14; } }
  }
  if (k === 'dark' || k === 'abyss') {
    for (const o of G.objs) if (o.flare > 0) o.flare -= dt;
    for (const s of w.shots) for (const o of G.objs) if (o.k === 'bloom' && o.flare <= 0 && Math.hypot(s.x - o.x, s.y - (o.y - 6)) < 10) { o.flare = 8; s.life = 0; SND.play('unlock'); w.fx.burst(o.x, o.y - 6, 26, { c: ['#7dffb0', '#fff', '#4ee8ff'], sp: 120 }); for (const e of (w.ents || NO_ENTS)) if (!e.dead && !e.boss && Math.hypot(e.x - o.x, e.y - o.y) < 90) e.stun = Math.max(e.stun || 0, 1.5); }
    if (k === 'abyss') { G.pulseT = (G.pulseT ?? 2) - dt; if (G.pulseT <= 0) { G.pulseT = 8; const o = G.objs[Math.floor(R0() * G.objs.length)]; if (o) (G.pulses = G.pulses || []).push({ x: o.x, y: o.y, t: 0 }); }
      if (key) { G.sonarT = (G.sonarT ?? 1) - dt; if (G.sonarT <= 0) { G.sonarT = 4; (G.pulses = G.pulses || []).push({ x: pl.x, y: pl.y, t: 0, mine: true }); SND.play('tick', 900); } }
      for (const p of G.pulses || []) p.t += dt; G.pulses = (G.pulses || []).filter(p => p.t < 2.4); }
  }
  if (k === 'reef' && G.nextT <= 0) {
    G.nextT = 5 + R0() * 3; const a = R0() * TAU, ox = pl.x - Math.cos(a) * 90, oy = pl.y - Math.sin(a) * 90, warn = key ? 1.5 : 1.0;
    for (let i = 0; i < 9; i++) { const x = ox + Math.cos(a) * i * 22, y = oy + Math.sin(a) * i * 22; if (!w.solid(x, y)) w.tele.push({ x, y, r: 12, t: 0, max: warn + i * 0.06, dmg: (key ? 8 : 16) * w.dmgMul, col: '#ff4f8a' }); }
  }
  if (k === 'magnet') for (const o of G.objs) {
    o.cd -= dt; if (o.on > 0) { o.on -= dt;
      const pull = (x, y) => { const dx = o.x - x, dy = o.y - 8 - y, d = Math.hypot(dx, dy) || 1; return d < 230 ? [dx / d, dy / d, 1 - d / 230] : null; };
      if (!key) { const q = pull(pl.x, pl.y); if (q) { pl.x += q[0] * 55 * q[2] * dt * 2; pl.y += q[1] * 55 * q[2] * dt * 2; w.collide(pl); } }
      for (const s of w.shots) { const q = pull(s.x, s.y); if (q) { s.vx += q[0] * 260 * q[2] * dt; s.vy += q[1] * 260 * q[2] * dt; s.ang = Math.atan2(s.vy, s.vx); } }
      for (const c of R.chunks) { const q = pull(c.x, c.y); if (q) { c.x += q[0] * 90 * dt; c.y += q[1] * 90 * dt; } } }
    else if (o.cd <= 0) { o.on = 3; o.cd = 11 + R0() * 4; if (Math.hypot(o.x - pl.x, o.y - pl.y) < 260) SND.play('charge', 0.5); }
  }
  if (k === 'spores' && !key && R.spores) { let inSp = false; for (const s of R.spores) if (Math.hypot(pl.x - s.x, pl.y - s.y) < s.r) inSp = true; if (inSp) R.o2 -= dt * 0.8; G.hidden = inSp; }
  if (k === 'aurora') {
    if (!G.band && G.nextT <= 0) { G.band = { x: pl.x + (R0() - 0.5) * 160, w: 46, t: 0, dir: R0() < 0.5 ? -1 : 1 }; if (G.first && !G.auroraTold) { G.auroraTold = true; banner('THE AURORA IS FALLING! STAND IN THE LIGHT', '#7dffb0'); } }
    if (G.band) { const b = G.band; b.t += dt; b.x += b.dir * 14 * dt; if (Math.abs(pl.x - b.x) < b.w / 2 && b.t > 1) { G.charge = Math.min(1, (G.charge || 0) + dt / (key ? 1.5 : 3)); if (G.charge >= 1) { G.charge = 0; pl.focusT = 10; banner('SUPERCHARGED! +50% DAMAGE FOR 10 SECONDS', '#7dffb0'); SND.play('fanfare'); } }
      if (b.t > 12) { G.band = null; G.nextT = 10 + R0() * 6; } }
  }
  if (k === 'rods') for (const o of G.objs) {
    o.cd -= dt; if (o.cd <= 0) { o.cd = 7 + R0() * 5; const d = Math.hypot(pl.x - o.x, pl.y - o.y);
      w.tele.push({ x: o.x, y: o.y, r: 16, t: 0, max: 1.1, dmg: key ? 0 : 20 * w.dmgMul, col: '#fff25a', bolt: true, onDone: () => { const d2 = Math.hypot(pl.x - o.x, pl.y - o.y); if (d2 > 16 && d2 < 70) { pl.focusT = Math.max(pl.focusT || 0, 6); banner('CHARGED BY THE ROD! +50% DAMAGE', COL.gold); } } }); }
  }
  if (k === 'starfall' && G.nextT <= 0) {
    G.nextT = 26 + R0() * 10; const p = near(110);
    if (p) { w.tele.push({ x: p.x, y: p.y, r: 46, t: 0, max: key ? 3 : 2.2, dmg: (key ? 20 : 40) * w.dmgMul, col: '#ff7a2e', meteor: true, onDone: t => { shake(9); flash(0.3, '#ffcb8a'); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; map.ores.push({ x: t.x + Math.cos(a) * 20, y: t.y + Math.sin(a) * 14, pi: R.pi, tier: R.p.ore[1], size: 2, units: 8, left: 8, prog: 0, shake: 0, meteor: true }); } } }); banner('STARFALL! GET CLEAR, THEN MINE THE CRATER', '#ff7a2e'); }
  }
  if (k === 'time') {
    const inRing = (x, y) => G.objs.some(o => o.k === 'clock' && Math.hypot(x - o.x, (y - o.y) / 0.75) < o.r);
    if (inRing(pl.x, pl.y) && !key) w.moveMul = Math.min(w.moveMul, 0.6);
    for (const e of (w.ents || NO_ENTS)) if (!e.dead && inRing(e.x, e.y)) { if (e.px !== undefined) { e.x = e.px + (e.x - e.px) * 0.35; e.y = e.py + (e.y - e.py) * 0.35; } }
    for (const s of w.eshots) if (inRing(s.x, s.y)) { s.x -= s.vx * dt * 0.65; s.y -= s.vy * dt * 0.65; }
    for (const e of (w.ents || NO_ENTS)) { e.px = e.x; e.py = e.y; }
  }
}
// a cache's worth of loot: ore, coins and sometimes a crate
function sigLoot(R, x, y, big) {
  const w = R.w; for (let i = 0; i < 4 + big * 3; i++) R.chunks.push({ x, y: y - 6, vx: (R0() - 0.5) * 120, vy: -60 - R0() * 70, t: 0, pi: R.pi, delay: 0.25 });
  for (let i = 0; i < 6; i++) R.chunks.push({ x, y: y - 6, vx: (R0() - 0.5) * 140, vy: -R0() * 120, t: 0, coin: true, delay: 0.3 });
  R.coins += Math.round(60 * Math.pow(1.3, R.pi - 1) * (1 + big));
  if (big > 1 || R0() < 0.25) { addHaulCrate('salvage:' + R.pi, Math.min(7, R.haulTier + (big > 1 ? 1 : 0)), x, y - 8); banner('+1 SALVAGE CRATE FOR YOUR HAUL', COL.gold); }
  w.fx.burst(x, y - 6, 26, { c: [COL.gold, '#fff', oreHex(R.pi)], sp: 140, life: 0.7, s: 2, t: 'shrink' }); SND.play('win');
}
// pods, arrival caches and machines you press E at
function sigInteract(R) {
  const G = R.sig, w = R.w, pl = w.player; if (!G) return;
  for (const o of G.objs) if (o.k === 'pod' && !o.got && Math.hypot(pl.x - o.x, pl.y - o.y) < 22) { R.prompt = { x: o.x, y: o.y - 22, t: 'E  CRACK THE POD' }; if (kp('KeyE')) { o.got = true; sigLoot(R, o.x, o.y, 1); eventWave(R, o.x, o.y, 2 + R0.int(3), null); } }
  for (const p of w.props) {
    if (p.dead || Math.hypot(pl.x - p.x, pl.y - p.y) > p.r + 16) continue;
    if (p.kind === 'arrival' && kp('KeyE')) {
      p.dead = true; (S.planet.arrived = S.planet.arrived || {})[R.pi] = 1; dirty();
      sigLoot(R, p.x, p.y, 2); flash(0.4, COL.gold); shake(4);
      const rl = relicOf(R.pi); banner(`ARRIVAL CACHE! THE PRIZE HERE: ${rl.n}. BEAT ${R.p.boss[0]} FOR IT`, COL.gold);
    }
    if (p.kind === 'turret' && p.machine && !p.on && kp('KeyE')) {
      const free = hasRelic(R.pi - 1);
      if (!free) { let need = 5; for (const kk in R.cargo) { const t = Math.min(need, R.cargo[kk]); R.cargo[kk] -= t; R.cargoN -= t; need -= t; if (!need) break; } if (need > 0) { for (const kk in R.cargo) { } toast('NEEDS 5 ORE IN YOUR CARGO', COL.coral); SND.play('deny'); continue; } }
      p.on = 40; p.use = null; banner('THE MACHINE WAKES UP AND FIGHTS FOR YOU', COL.blueL); SND.play('unlock');
    }
  }
}
// called when an ore finishes being mined: mirages vanish
function sigOreFake(R, o) { if (!o.fake) return false; o.left = 0; R.w.fx.burst(o.x, o.y - 4, 20, { c: ['#ffd27a', '#fff6c2'], sp: 80, life: 0.5 }); R.w.fx.text(o.x, o.y - 20, 'MIRAGE!', '#ffd27a', { f: FB }); SND.play('deny'); return true; }
// boss down: the relic
function sigBossDown(R) {
  if (hasRelic(R.pi) || R.pi > 20) return;
  S.relics = S.relics || {}; S.relics[R.pi] = 1; dirty();
  const rl = relicOf(R.pi), nx = R.pi < 20 ? planetDef(R.pi + 1).name : null;
  R.relicShow = { t: 0, pi: R.pi };
  banner(nx ? `RELIC FOUND: ${rl.n}! YOU NEED IT ON ${nx}` : `RELIC FOUND: ${rl.n}!`, COL.gold); SND.play('reveal', 6);
}

// ---------- drawing ----------
function sigDrawGround(R, cx, cy) {
  const G = R.sig; if (!G) return; const k = G.s.k === 'converge' ? G.mode : G.s.k;
  for (const o of G.objs) {
    const x = o.x - cx, y = o.y - cy; if (x < -90 || y < -90 || x > W + 90 || y > H + 90) continue;
    if (o.k === 'thorn') { const key = !!sigRelicHelps(R); ctx.globalAlpha = 0.85; ellipse(x, y, o.r, o.r * 0.6, key ? '#3a5a2a' : '#2a4a1c'); ctx.globalAlpha = 1; for (let i = 0; i < 10; i++) { const a = i * 2.4 + o.x, rr = o.r * (0.3 + (i % 3) * 0.25); const tx = x + Math.cos(a) * rr, ty = y + Math.sin(a) * rr * 0.6; line(tx, ty, tx + 1, ty - 4, '#9be36b'); px(tx + 1, ty - 5, '#e8ffb0'); } }
    if (o.k === 'pool') { if (o.r < 2) continue; ctx.globalAlpha = 0.75; ellipse(x, y, o.r, o.r * 0.7, '#4fb7b0'); ctx.globalAlpha = 0.4; ellipse(x, y, o.r * 0.7, o.r * 0.45, '#bff6ff'); ctx.globalAlpha = 1;
      if (o.cache && !o.got && G.lowTide) { rect(x - 4, y - 5, 8, 6, '#efd9ce'); rect(x - 3, y - 4, 6, 1, '#fff'); if (Math.floor(T_NOW * 4) % 2) px(x, y - 8, COL.gold); } }
    if (o.k === 'clock') { ctx.globalAlpha = 0.18; ellipse(x, y, o.r, o.r * 0.75, '#e5d8ff'); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#e5d8ff'; ctx.beginPath(); ctx.ellipse(x, y, o.r, o.r * 0.75, 0, 0, TAU); ctx.stroke(); const a = T_NOW * 0.4; line(x, y, x + Math.cos(a) * o.r * 0.6, y + Math.sin(a) * o.r * 0.45, '#ffffff'); line(x, y, x + Math.cos(a * 12) * o.r * 0.35, y + Math.sin(a * 12) * o.r * 0.26, '#c77dff'); ctx.globalAlpha = 1; }
    if (o.k === 'vent') { const glow = o.st === 'warn' ? (Math.floor(T_NOW * 10) % 2 ? 0.7 : 0.3) : o.st === 'blast' ? 0.8 : 0.15; ctx.globalAlpha = glow; ellipse(x, y, o.r, o.r * 0.6, o.st === 'blast' ? '#ff9a3d' : '#ff5a1e'); ctx.globalAlpha = 1; ellipse(x, y, 7, 4, '#1a0a06'); ellipse(x, y, 4, 2, o.st === 'idle' ? '#802000' : '#fff2a0'); }
  }
  if (k === 'aurora' && G.band) { const b = G.band, x = b.x - cx, a = Math.min(1, b.t) * (b.t > 11 ? 12 - b.t : 1); for (let i = 0; i < 6; i++) { ctx.globalAlpha = a * (0.06 + i * 0.03); rect(x - b.w / 2 + i * 3, 0, b.w - i * 6, H, i % 2 ? '#7dffb0' : '#4ee8ff'); } ctx.globalAlpha = 1; }
}
function sigDrawObjs(R, cx, cy) {
  const G = R.sig; if (!G) return;
  for (const o of G.objs) {
    const x = o.x - cx, y = o.y - cy; if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
    if (o.k === 'shroom') { const b = o.bounce; shadow(x, y, 10, 3, 0.4); rect(x - 2, y - 10, 4, 10, '#efd9ce'); ellipse(x, y - 12 + b * 3, 12 + b * 2, 6 - b * 2, '#ff6fb3'); ellipse(x, y - 13 + b * 3, 9, 3, '#ffb3d9'); px(x - 5, y - 13, '#fff'); px(x + 4, y - 12, '#fff'); if (Math.floor(T_NOW * 2) % 2) text('BOUNCE', x, y - 26, '#ffb3d9', FS, 1); }
    if (o.k === 'pod' && !o.got) { shadow(x, y, 9, 3, 0.4); rect(x - 7, y - 16, 14, 16, '#5a6a8a'); rect(x - 6, y - 15, 12, 3, '#9aa3c0'); rect(x - 2, y - 10, 4, 4, Math.floor(T_NOW * 4) % 2 ? '#fca311' : '#ff5a1e'); }
    if (o.k === 'pod' && o.got) { rect(x - 7, y - 6, 14, 6, '#3a4058'); }
    if (o.k === 'bloom') { const fl = o.flare > 0; ellipse(x, y - 3, 5 + (fl ? 2 : 0), 4, fl ? '#ffffff' : '#7dffb0'); px(x, y - 4, '#fff'); rect(x, y - 1, 1, 3, '#2a5a3a'); }
    if (o.k === 'pylon2') { shadow(x, y, 6, 2, 0.4); rect(x - 3, y - 22, 6, 22, '#6a7080'); rect(x - 4, y - 24, 8, 4, o.on > 0 ? '#ff4f8a' : '#9aa3c0'); if (o.on > 0) { ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ff4f8a'; for (let i = 0; i < 3; i++) { const rr = ((T_NOW * 120 + i * 70) % 210); ctx.beginPath(); ctx.arc(x, y - 8, 230 - rr, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; } }
    if (o.k === 'rod') { shadow(x, y, 4, 2, 0.4); rect(x - 1, y - 30, 2, 30, '#c8c8d8'); rect(x - 3, y - 32, 6, 3, '#fff25a'); if (o.cd < 1.2 && Math.floor(T_NOW * 10) % 2) { ctx.globalAlpha = 0.3; circ(x, y - 30, 8, '#fff25a'); ctx.globalAlpha = 1; } }
    if (o.k === 'icelake' || o.k === 'thorn' || o.k === 'pool' || o.k === 'clock' || o.k === 'vent') continue;
  }
}
function sigDrawSky(R, cx, cy) {
  const G = R.sig; if (!G) return; const k = G.s.k === 'converge' ? G.mode : G.s.k, key = !!sigRelicHelps(R);
  if (k === 'gust' && G.gust) { const g = G.gust, on = g.t > g.warn; ctx.globalAlpha = on ? 0.5 : 0.35; for (let i = 0; i < 26; i++) { const y = (i * 37 + 13) % H, x = ((T_NOW * (on ? 420 : 60) * Math.cos(g.a) + i * 97) % (W + 60) + W + 60) % (W + 60) - 30; line(x, y, x - Math.cos(g.a) * (on ? 26 : 8), y - Math.sin(g.a) * 6, '#e8f4ff'); } ctx.globalAlpha = 1;
    if (!on && Math.floor(T_NOW * 6) % 2) { textO('GUST INCOMING', W / 2, 60, '#bfe9ff', '#000', FB, 1); const ax = W / 2 + Math.cos(g.a) * 60; textO(Math.cos(g.a) > 0 ? '>>>' : '<<<', ax, 72, '#bfe9ff', '#000', FB, 1); } }
  if (k === 'storm' && G.storm) { const s = G.storm.t, a = Math.min(1, s / 2, (16 - s) / 2); if (!key) { if (!DARK_C) DARK_C = mkCanvas(W, H); const g = DARK_C.x, pl = R.w.player; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = `rgba(150,120,80,${0.88 * a})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.beginPath(); g.ellipse(pl.x - cx, pl.y - 10 - cy, 70, 55, 0, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; ctx.drawImage(DARK_C, 0, 0); }
    ctx.globalAlpha = 0.5 * a; for (let i = 0; i < 40; i++) { const x = ((T_NOW * 300 + i * 53) % W), y = (i * 29 + T_NOW * 40) % H; rect(x, y, 3, 1, '#e8d8b0'); } ctx.globalAlpha = 1; }
}
// extra light holes for dark worlds (blooms, flares, pulses, the lantern)
function sigLight(R, hole, cx, cy) {
  const G = R.sig; if (!G) return;
  for (const o of G.objs) if (o.k === 'bloom') { hole(o.x - cx, o.y - 6 - cy, o.flare > 0 ? 120 : 34, o.flare > 0 ? 0.95 : 0.6); }
  for (const p of G.pulses || []) { const r = 40 + p.t * 140; hole(p.x - cx, p.y - cy, r, Math.max(0, 0.9 - p.t * 0.35)); }
}
function sigLightMul(R) { return R.sig && R.pi === 8 && hasRelic(7) ? 1.7 : 1; }
function sigHUD(R) {
  const G = R.sig; if (!G) return; const k = G.s.k === 'converge' ? G.mode : G.s.k;
  let y = R.ev ? 92 : 68; const x = W - 104;
  const rl = relicOf(R.pi);
  // the prize and relic notes are for when you land: they fade out after a few seconds so the minimap stays clear
  const intro = R.t < 8, ia = clamp((8 - R.t) / 1, 0, 1), showPrize = intro && !hasRelic(R.pi) && R.pi <= 20, showHelp = intro && sigRelicHelps(R) && R.pi > 1;
  const live = (k === 'tide' && G.tide !== undefined ? 9 : 0) + (k === 'aurora' && G.charge > 0 ? 14 : 0) + (k === 'converge' ? 9 : 0);
  const rows = (showPrize ? 18 : 0) + live + (showHelp ? 16 : 0);
  if (rows) { ctx.globalAlpha = 0.72 * (live ? 1 : ia); rect(x - 18, y - 4, 122, rows + 4, '#05060f'); ctx.globalAlpha = 1; }
  if (showPrize) { ctx.globalAlpha = ia; drawRelicIcon(R.pi, x - 14, y - 1, 1); text('PRIZE: ' + rl.n, x, y, rl.c, FS); text('BEAT ' + R.p.boss[0], x, y + 7, COL.mute, FS); ctx.globalAlpha = 1; y += 18; }
  if (k === 'tide' && G.tide !== undefined) { text(G.lowTide ? 'LOW TIDE' : 'HIGH TIDE', x, y, G.lowTide ? COL.gold : '#4fb7b0', FS); y += 9; }
  if (k === 'aurora' && G.charge > 0) { text('AURORA CHARGE', x, y, '#7dffb0', FS); bar(x, y + 8, 80, 3, G.charge, '#7dffb0', COL.void0); y += 14; }
  if (k === 'converge') { text('NOW: ' + SIGS.find(s => s && s.k === G.mode).n, x, y, COL.magenta, FS); y += 9; }
  if (showHelp) { ctx.globalAlpha = ia; drawRelicIcon(R.pi - 1, x - 14, y - 1, 1); text(relicOf(R.pi - 1).n, x, y, '#7dffb0', FS); text('IS HELPING YOU', x, y + 7, COL.mute, FS); ctx.globalAlpha = 1; }
  if (R.relicShow) drawRelicReveal(R);
}
function drawRelicReveal(R) {
  const F = R.relicShow; F.t += 1 / 60; if (F.t > 5) { R.relicShow = null; return; }
  const a = Math.min(1, F.t * 3, (5 - F.t) * 2), rl = relicOf(F.pi);
  ctx.globalAlpha = a * 0.75; rect(0, 70, W, 90, '#05020c'); ctx.globalAlpha = a;
  drawRelicIcon(F.pi, W / 2 - 15, 82, 3);
  textO('RELIC FOUND: ' + rl.n, W / 2, 118, rl.c, '#000', FB, 1);
  text(rl.t, W / 2, 130, COL.cream, FS, 1);
  if (F.pi < 20) text(`IT IS THE KEY TO ${planetDef(F.pi + 1).name}: ${sigOf(F.pi + 1).n}`, W / 2, 142, COL.gold, FS, 1);
  ctx.globalAlpha = 1;
}
