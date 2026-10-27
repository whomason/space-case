// ===== COMBAT: shared world sim for planets and holo demos =====
function makeWorld(o = {}) {
  return {
    t: 0, demo: !!o.demo, practice: !!o.practice, ents: [], shots: [], eshots: [], mines: [], tele: [], pulls: [], zaps: [], drones: [], rails: [], slashes: [],
    props: [], hazards: [], clouds: [], strikes: [], decoy: null, halo: null, tempDrones: 0, tempDroneT: 0,
    fx: new Particles(o.demo ? 350 : 1600), player: null, pi: o.pi || 1, collide: o.collide || null, solid: o.solid || (() => false),
    onKill: o.onKill || (() => { }), onHurt: o.onHurt || (() => { }), onDeath: o.onDeath || (() => { }), onProp: o.onProp || (() => { }), killfx: o.killfx || null,
    beam: null, sndOn: !o.demo, hpMul: 1, dmgMul: 1, combo: 0, comboT: 0, comboMax: 3, bounds: o.bounds || null, noHurt: !!o.noHurt,
  };
}
function weaponColor(id) { const d = getDef(id); const p = itemPal(d, Math.floor(T_NOW * 8) % (d.r === 6 ? 8 : 1)); return { core: hex(p.G[4]), mid: hex(p.G[3]), edge: hex(p.G[2]), dark: hex(p.G[1]) }; }
function wsnd(w, name, p) { if (w.sndOn) SND.play(name, p); }
function nearestEnemy(w, x, y, maxD = 1e9, skip) {
  let best = null, bd = maxD;
  for (const e of w.ents) { if (e.dead || e.under || e.hidden || (skip && skip.has(e))) continue; const d = Math.hypot(e.x - x, e.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
  return best;
}
// ---------- firing ----------
// the tip of the gun the pilot is holding (drawPlayer measures it)
function muzzlePt(pl, a) { const L = (pl.gunLen || 11) - 1; return [pl.x + Math.cos(a) * L, pl.y - 8 + Math.sin(a) * L]; }
function makeShot(w, pl, W, a, o = {}) {
  const cls = W.cls; const col = W.col;
  let [sx, sy] = o.child ? [pl.x + Math.cos(a) * 8, pl.y - 6 + Math.sin(a) * 8] : muzzlePt(pl, a);
  if (!o.child) for (const e of w.ents) if (!e.dead && segDist(e.x, e.y - 4, pl.x, pl.y - 6, sx, sy) < e.r + 3) { sx = pl.x + Math.cos(a) * 3; sy = pl.y - 6 + Math.sin(a) * 3; break; }
  const s = {
    x: sx, y: sy, ang: a, spd: o.spd || W.spd || 200, dmg: o.dmg || W.dmg, life: (o.rng || W.rng) / (o.spd || W.spd || 200), r: o.r || 3,
    pierce: (W.pierce || 0) + (W.v.pierce ? W.v.pierce + 1 : 0), hits: new Set(), v: o.noVerbs ? {} : W.v, el: W.el, col, kind: o.kind || 'bolt', t: 0, owner: pl,
    bounce: W.v.bounce || 0, child: !!o.child, aoe: W.aoe || 0, phase: 0, travel: 0, rng: o.rng || W.rng,
  };
  if (!o.child) { s.W = W; s.sig = W.sig || null; }
  if (s.v.orbit && !o.child) { s.orbitT = 0.55 + 0.1 * s.v.orbit; s.oa = a + Math.PI; s.orbitR = 14; }
  if (s.v.burrow && !o.child) { s.burrow = true; s.burrowT = Math.min(s.life * 0.7, 0.9); }
  if (s.v.spiral) { s.spin = (R0() < 0.5 ? -1 : 1) * 6; }
  if (!o.child && pl === w.player) {
    if (W.quirk === 'giant' && R0() < 0.125) { s.r *= 2; s.dmg *= 2; s.giant = true; }
    if (pl.solarReady) { pl.solarReady = false; pl.solarT = 0; s.solar = true; s.r += 1; }
  }
  s.vx = Math.cos(a) * s.spd; s.vy = Math.sin(a) * s.spd;
  w.shots.push(s); return s;
}
function fireWeapon(w, pl, W, inp, dt) {
  const a = pl.aim; const cls = W.cls;
  pl.fireCd -= dt; if (pl.ocT > 0) pl.ocT -= dt;
  if (cls === 'beam') {
    if (inp.fire) { pl.heat = Math.min(1, (pl.heat || 0) + dt / 2); w.beam = { a, heat: pl.heat, multi: W.sig === 'prism3' ? [a - 0.24, a, a + 0.24] : null }; pl.beamTick = (pl.beamTick || 0) - dt; if (pl.beamTick <= 0) { pl.beamTick = 0.08; beamDamage(w, pl, W, a, 0.08); wsnd(w, 'beam'); } }
    else { w.beam = null; pl.heat = Math.max(0, (pl.heat || 0) - dt * 2); }
    return;
  }
  if (cls === 'railgun') {
    if (inp.fire && pl.fireCd <= 0) {
      const was = pl.charge || 0; pl.charge = Math.min(1.2, was + dt);
      if (was < 1.2 && pl.charge >= 1.2) { pl.fullAt = w.t; w.fx.add({ x: pl.x + Math.cos(a) * 14, y: pl.y - 6 + Math.sin(a) * 14, vx: 0, vy: 0, life: 0.25, c: '#fff', s: 10, t: 'ring' }); wsnd(w, 'tick', 1600); }
      if (Math.random() < 0.3) { const k = pl.charge; w.fx.add({ x: pl.x + Math.cos(a) * 14 + (R0() - 0.5) * 20, y: pl.y - 6 + Math.sin(a) * 14 + (R0() - 0.5) * 20, vx: 0, vy: 0, life: 0.2, c: W.col.mid, s: 1, fn: (p, d) => { p.x = lerp(p.x, pl.x + Math.cos(pl.aim) * 14, d * 10); p.y = lerp(p.y, pl.y - 6 + Math.sin(pl.aim) * 14, d * 10); } }); if (w.sndOn && Math.random() < 0.4) SND.play('charge', k); }
    }
    else if (!inp.fire && pl.charge > 0.12) { railFire(w, pl, W, a, pl.charge); pl.charge = 0; pl.fullAt = undefined; pl.fireCd = 1 / W.rate; }
    else if (!inp.fire) { pl.charge = 0; pl.fullAt = undefined; }
    return;
  }
  if (cls === 'drone') { const k = inp.fire ? 1.6 : 1; pl.droneFocus = inp.fire; pl.droneRate = k; return; }
  if (!inp.fire || pl.fireCd > 0) return;
  pl.fireCd = 1 / (W.rate * (pl.ocT > 0 ? 1.35 : 1));
  pl.recoil = 2; pl.shotN = (pl.shotN || 0) + 1;
  const shots = []; const fire = (ang, o) => { const s = makeShot(w, pl, W, ang, o); shots.push(s); return s; };
  switch (cls) {
    case 'blaster': fire(a + (R0() - 0.5) * 0.04); wsnd(w, 'pew'); break;
    case 'rifle': fire(a + (R0() - 0.5) * W.spread * 2, { r: 2 }); wsnd(w, 'rifle'); break;
    case 'shotgun': for (let i = 0; i < W.pellets; i++) fire(a + (i / (W.pellets - 1) - 0.5) * W.spread + (R0() - 0.5) * 0.08, { kind: 'pellet', spd: W.spd * (0.85 + R0() * 0.3), r: 2 }); wsnd(w, 'shotgun'); if (!w.demo) shake(2); pl.pbShown = false; break;
    case 'sniper': fire(a, { kind: 'slug', r: 3 }); wsnd(w, 'sniper'); if (!w.demo) shake(2.5); break;
    case 'launcher': {
      if (W.sig === 'spud') { const s = fire(a, { kind: 'spud', r: 4, spd: 165 }); s.v = Object.assign({}, s.v, { detonate: 1 }); s.bounce = 3; wsnd(w, 'throw'); break; }
      if (W.sig === 'presents') { const s = fire(a, { kind: 'present', r: 4, spd: 190 }); s.v = Object.assign({}, s.v, { detonate: Math.max(1, s.v.detonate || 0) }); s.bounce = 2; s.presents = true; wsnd(w, 'throw'); break; }
      const s = fire(a, { kind: 'rocket', r: 4 }); s.v = Object.assign({}, s.v, { detonate: Math.max(s.v.detonate || 0, 1) }); s.rocket = true; wsnd(w, 'launch'); break;
    }
    case 'throwing': if (W.sig === 'fan') { for (let i = 0; i < 5; i++) fire(a + (i - 2) * 0.22, { kind: 'star', r: 3 }); } else fire(a, { kind: 'disc', r: 4 }); wsnd(w, 'throw'); break;
    case 'blade': bladeSwing(w, pl, W, a); wsnd(w, 'slash'); break;
    case 'mine': {
      const tx = clamp(inp.ax - pl.x, -W.rng, W.rng), ty = clamp(inp.ay - pl.y, -W.rng, W.rng); const dd = Math.hypot(tx, ty), k = dd > W.rng ? W.rng / dd : 1;
      w.mines.push({ x: pl.x, y: pl.y - 4, sx: pl.x, sy: pl.y - 4, tx: pl.x + tx * k, ty: pl.y + ty * k, t: 0, arm: 0.45, life: 18, W, col: W.col });
      if (w.mines.length > 8) w.mines.shift(); wsnd(w, 'mine'); break;
    }
  }
  if (shots.length && !w.demo) gunFx(w.fx, pl, a, W.col, cls);
  if (W.sig === 'reliable' && pl.shotN % 6 === 0) shots.forEach(s => { s.forceCrit = true; s.r += 1; });
  if (W.sig === 'zeus' && pl.shotN % 5 === 0) shots.forEach(s => { s.zeus = true; s.r = 3; });
  if (W.quirk === 'echo' && pl.shotN % 4 === 0) for (const s0 of shots) { const c = Object.assign({}, s0, { hits: new Set(), ang: s0.ang + 0.08, giant: false }); c.vx = Math.cos(c.ang) * c.spd; c.vy = Math.sin(c.ang) * c.spd; w.shots.push(c); }
}
const GUN_KICK = { blaster: 0.8, rifle: 0.6, shotgun: 2.6, sniper: 3, launcher: 2.2, throwing: 0.6, railgun: 4 };
function gunFx(F, pl, a, col, cls) {
  const [mx, my] = muzzlePt(pl, a), big = cls === 'shotgun' ? 1.6 : cls === 'sniper' || cls === 'railgun' ? 1.9 : cls === 'launcher' ? 1.4 : cls === 'rifle' ? 0.8 : 1;
  if (cls !== 'throwing' && cls !== 'mine') F.add({ x: mx, y: my, life: 0.07, c: col.mid, c2: col.core, a, s: big, t: 'muzzle', drag: 0 });
  const n = cls === 'shotgun' ? 5 : cls === 'throwing' || cls === 'mine' ? 0 : 2;
  for (let i = 0; i < n; i++) { const sa = a + (R0() - 0.5) * (cls === 'shotgun' ? 0.9 : 0.5), sp = 110 + R0() * 90; F.add({ x: mx, y: my, vx: Math.cos(sa) * sp, vy: Math.sin(sa) * sp, life: 0.09 + R0() * 0.06, c: R0() < 0.5 ? '#ffffff' : col.core, t: 'spark', drag: 7 }); }
  if (cls === 'blaster' || cls === 'rifle' || cls === 'shotgun' || cls === 'sniper') { const side = Math.cos(a) < 0 ? 1 : -1, px0 = -Math.sin(a) * side, py0 = Math.cos(a) * side; F.add({ x: pl.x + Math.cos(a) * 4, y: pl.y - 9, vx: px0 * 45 + (R0() - 0.5) * 20, vy: -55 - R0() * 30, g: 340, life: 0.32, c: cls === 'shotgun' ? '#d84a3a' : '#e8c36a', drag: 1 }); }
  if (cls === 'shotgun' || cls === 'sniper' || cls === 'launcher' || cls === 'railgun') for (let i = 0; i < 2; i++) F.add({ x: mx + Math.cos(a) * 3, y: my + Math.sin(a) * 3, vx: Math.cos(a) * 18 + (R0() - 0.5) * 10, vy: Math.sin(a) * 18 - 10, life: 0.45, c: '#8d88a8', s: 1.5 + R0(), t: 'puff', drag: 2 });
  const k = GUN_KICK[cls] || 0.8; pl.kickX = (pl.kickX || 0) - Math.cos(a) * k; pl.kickY = (pl.kickY || 0) - Math.sin(a) * k;
}
// where a shot lands: sparks fly back the way it came
function impactFx(F, x, y, dx, dy, col, crit) {
  const back = Math.atan2(-(dy || 0), -(dx || 1)), n = crit ? 6 : 3;
  for (let i = 0; i < n; i++) { const a = back + (R0() - 0.5) * 1.7, sp = 60 + R0() * 80; F.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.1 + R0() * 0.08, c: i % 3 === 0 ? '#ffffff' : (col ? col.core : '#ffe9a8'), t: 'spark', drag: 6 }); }
  F.add({ x, y, life: crit ? 0.1 : 0.06, c: crit ? '#ffd23d' : (col ? col.mid : '#ffffff'), s: crit ? 5 : 3, t: 'hitflash', drag: 0 });
}
function bladeSwing(w, pl, W, a) {
  const R = W.rng + 6;
  w.slashes.push({ x: pl.x, y: pl.y - 6, a, t: 0, R, col: W.col });
  for (const e of w.ents) {
    if (e.dead) continue; const d = Math.hypot(e.x - pl.x, e.y - pl.y);
    if (d < R + e.r && Math.abs(angDiff(a, Math.atan2(e.y - pl.y, e.x - pl.x))) < 1.15) { hitEnemy(w, e, W.dmg, { W, x: e.x, y: e.y, shot: null, dx: e.x - pl.x }); e.kx += Math.cos(a) * 90; e.ky += Math.sin(a) * 90; }
  }
  for (const p of w.props) if (!p.dead && p.shoot && Math.hypot(p.x - pl.x, p.y - pl.y) < R + p.r && Math.abs(angDiff(a, Math.atan2(p.y - pl.y, p.x - pl.x))) < 1.2) hitProp(w, p, W.dmg, W.el ? W.el[0] : null);
  // parry: swing into enemy shots to send them back
  let parried = 0;
  for (const es of w.eshots) {
    if (es.life <= 0) continue; const ex = es.x - pl.x, ey = es.y - (pl.y - 6), d = Math.hypot(ex, ey);
    if (d < R + 8 && Math.abs(angDiff(a, Math.atan2(ey, ex))) < 1.35) {
      es.life = 0; parried++;
      const tg = nearestEnemy(w, es.x, es.y, 320); const ra = tg ? Math.atan2(tg.y - 4 - es.y, tg.x - es.x) : a;
      const s = makeShot(w, pl, W, ra, { kind: 'bolt', spd: 320, rng: 300, r: 3, dmg: W.dmg * 1.6, child: true, noVerbs: true }); s.x = es.x; s.y = es.y; s.pierce = 1;
    }
  }
  if (parried) { w.fx.text(pl.x, pl.y - 32, 'PARRY!', COL.gold, { f: FB, life: 0.8 }); wsnd(w, 'stamp'); if (!w.demo) FX.hitstop = Math.max(FX.hitstop, 0.05); stat(w, 'parries', parried); }
  if (W.sig === 'firetrail') for (let i = -2; i <= 2; i++) { const aa = a + i * 0.45; w.hazards.push({ x: pl.x + Math.cos(aa) * R * 0.8, y: pl.y + Math.sin(aa) * R * 0.6, r: 9, t: 2.2, dps: W.dmg * 0.9, el: 'plasma', col: '#ff9a3d', kind: 'fire' }); }
  const vs = Object.keys(W.v).filter(k => k !== 'pierce');
  if (vs.length) { const s = makeShot(w, pl, W, a, { kind: 'wave', spd: 190, rng: 95, r: 6, dmg: W.dmg * 0.6 }); s.pierce += 2; }
}
function railFire(w, pl, W, a, ch) {
  const perfect = ch >= 1.2 && pl.fullAt !== undefined && w.t - pl.fullAt < 0.3;
  const dmg = W.dmg * (0.35 + ch * 0.65 / 1.2) * (perfect ? 1.6 : ch >= 1.2 ? 1.25 : 1);
  const x0 = pl.x, y0 = pl.y - 6, L = W.rng, x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
  w.rails.push({ x0, y0, x1, y1, t: 0, col: W.col, wd: 1 + Math.floor(ch * 2) + (perfect ? 1 : 0) });
  for (const e of w.ents) {
    if (e.dead) continue;
    const px = e.x - x0, py = e.y - y0, along = px * Math.cos(a) + py * Math.sin(a); if (along < 0 || along > L) continue;
    const perp = Math.abs(-px * Math.sin(a) + py * Math.cos(a)); if (perp < e.r + 5) hitEnemy(w, e, dmg, { W, x: e.x, y: e.y, rail: true, dx: Math.cos(a), forceCrit: perfect });
  }
  for (const p of w.props) { if (p.dead || !p.shoot) continue; const px = p.x - x0, py = p.y - y0, along = px * Math.cos(a) + py * Math.sin(a); if (along < 0 || along > L) continue; if (Math.abs(-px * Math.sin(a) + py * Math.cos(a)) < p.r + 5) hitProp(w, p, dmg, W.el ? W.el[0] : null); }
  if (perfect) { w.fx.text(pl.x, pl.y - 32, 'PERFECT SHOT!', COL.gold, { f: FB, life: 0.9 }); if (!w.demo) FX.hitstop = Math.max(FX.hitstop, 0.06); }
  if (W.sig === 'meteors') for (let i = 1; i <= 5; i++) { const k = i / 5.5; w.strikes.push({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) + 6, t: 0, max: 0.35 + i * 0.12, r: 24, dmg: dmg * 0.7, col: PLASMA_COL }); }
  if (W.sig === 'rift') for (let i = 1; i <= 8; i++) { const k = i / 8.5; w.hazards.push({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) + 6, r: 11, t: 2.6, dps: dmg * 0.35, el: 'void', col: '#b45cff', kind: 'rift' }); }
  for (let i = 0; i < 30; i++) { const k = R0(); w.fx.add({ x: lerp(x0, x1, k), y: lerp(y0, y1, k), vx: (R0() - 0.5) * 30, vy: (R0() - 0.5) * 30, life: 0.4, c: W.col.mid, s: 1 }); }
  wsnd(w, 'rail'); if (!w.demo) { shake(3 + ch * 3 + (perfect ? 3 : 0)); gunFx(w.fx, pl, a, W.col, 'railgun'); } pl.recoil = 4;
}
function beamDamage(w, pl, W, a, dt) {
  if (w.beam.multi) { w.beam.lens = w.beam.multi.map(aa => beamCast(w, pl, W, aa, dt, 0.6)); w.beam.len = w.beam.lens[1]; }
  else w.beam.len = beamCast(w, pl, W, a, dt, 1);
}
// ---------- hits & effects ----------
function hitEnemy(w, e, dmg, o = {}) {
  if (e.dead) return;
  if (w.visualOnly) { if (o.x !== undefined) impactFx(w.fx, o.x, o.y, o.dx || 0, o.dy || 0, o.W && o.W.col, false); e.flash = 0.08; return; }
  const W = o.W; const pl = w.player;
  let mult = 1, tag = null;
  if (o.dx !== undefined && !e.boss && !e.dummy) {
    const back = o.dx * e.face > 0.15;
    if (e.armored) { if (back) { mult *= 2; tag = 'WEAK POINT'; } else if (!(e.stun > 0)) { mult *= 0.45; tag = 'ARMOR'; } }
    else if (back) { mult *= 1.25; tag = 'back'; }
  }
  if (e.boss && e.shieldFront && o.dx !== undefined && !(e.stun > 0) && !(e.coreT > 0)) { if (o.dx * e.face > 0.15) { mult *= 1.5; tag = 'WEAK POINT'; } else { mult *= 0.35; tag = 'ARMOR'; } }
  if (e.boss && e.coreT > 0) { mult *= 2; tag = 'CORE HIT'; }
  if (e.stun > 0) mult *= 1.5;
  if (e.corrode > 0) mult *= 1.5;
  if (e.steam > 0) mult *= 1.3;
  if (pl) {
    if (pl.focusT > 0) mult *= 1.5;
    if (!w.demo && !w.arena && typeof relicPower === 'function') mult *= relicPower();
    const sa = pl.setAb || {};
    if (sa[8] && pl.hp < pl.maxHp * 0.35) mult *= sa[8] > 1 ? 1.7 : 1.5;
    if (sa[10] && w.combo >= 12) mult *= sa[10] > 1 ? 1.35 : 1.2;
    const q = W && W.quirk;
    if (q) { const dd = Math.hypot(e.x - pl.x, e.y - pl.y); if (q === 'steady' && dd > 140) mult *= 1.4; if (q === 'brawler' && dd < 55) mult *= 1.4; if (q === 'hunter' && (e.carrier || e.elite || e.nest)) mult *= 1.5; }
  }
  if (o.mult) mult *= o.mult;
  dmg *= mult;
  const crit = !o.noCrit && (o.forceCrit || R0() < (w.crit || 0.06) + (pl && pl.shadowT > 0 ? 0.3 : 0));
  if (crit) dmg *= 2;
  if ((e.st === 'wind' || e.windup) && !e.dummy && !(e.stun > 0)) { e.windDmg = (e.windDmg || 0) + dmg; const need = e.maxHp * (e.boss ? 0.045 : e.elite ? 0.07 : 0.13) * (W && W.quirk === 'bully' ? 0.5 : 1); if (e.windDmg >= need) staggerEnemy(w, e); }
  if (tag && tag !== 'back' && (!o.quiet || R0() < 0.1)) w.fx.text(e.x + 8, e.y - e.r - 12, tag, tag === 'ARMOR' ? '#9aa3c0' : COL.gold, { f: FS, life: 0.5 });
  if (tag && tag !== 'ARMOR' && !o.quiet) stat(w, 'weakhits');
  w.lastW = W || null;
  if (o.x !== undefined && !o.quiet && !w.demo) impactFx(w.fx, o.x, o.y, o.dx, o.dy, W && W.col, crit);
  if (o.dx !== undefined && o.dy !== undefined && !e.boss && !e.nest && !e.dummy && !e.part) { const kb = (e.armored ? 14 : 34) * (o.kb ?? 1); e.kx = clamp(e.kx + o.dx * kb, -160, 160); e.ky = clamp(e.ky + o.dy * kb, -160, 160); }
  damageEnemy(w, e, dmg, { crit, quiet: o.quiet, col: o.col });
  if (!W || o.noFx) return;
  if (W.el && !o.child2 && !e.dead) applyElement(w, e, W, dmg, o);
  const v = W.v || {};
  if (o.beam || o.rail) {
    if (v.chain && R0() < (o.beam ? 0.12 : 1)) chainZap(w, e, W.dmg * 0.5, v.chain + 1, W.col);
    if (v.bounce && R0() < (o.beam ? 0.1 : 1)) chainZap(w, e, W.dmg * 0.4, v.bounce, W.col);
    if (v.detonate && R0() < (o.beam ? 0.06 : 1)) explode(w, o.x, o.y, 14 + v.detonate * 5, W.dmg * 0.6, W.col);
    if (v.pull && R0() < (o.beam ? 0.05 : 1)) w.pulls.push({ x: o.x, y: o.y, r: 50, str: 140, t: 0.4 });
    if (v.split && R0() < (o.beam ? 0.08 : 1)) splitShots(w, o.x, o.y, W, v.split + 1, Math.atan2(e.y - w.player.y, e.x - w.player.x));
    if (v.stick && o.rail) e.sticky = { t: 0.6, dmg: W.dmg * 0.8, W, w };
  }
}
function damageEnemy(w, e, dmg, o = {}) {
  if (e.dead) return;
  if (w.visualOnly) { e.flash = 0.08; return; }
  if (e.invuln || e.under || e.hidden) { if (!o.quiet && R0() < 0.25) w.fx.text(e.x, e.y - e.r - 10, 'IMMUNE', '#9aa3c0', { f: FS, life: 0.4 }); return; }
  if (e.dummy) { (w.dmgLog = w.dmgLog || []).push([w.t, dmg]); }
  e.hp -= dmg; e.flash = 0.08; e.lastSrc = o.src || null; if (e.pvp) { e.lastByW = w.player; e.lastAtk = w.player; }
  if (!o.quiet || R0() < 0.15) {
    const T = e.dmgTxt;
    if (!o.crit && T && T.life > T.max - 0.35 && T.life > 0) { T.val += dmg; T.txt = fmt(Math.max(1, T.val)); T.life = T.max; T.pop = 0.05; T.x = e.x; T.vy = -28; }
    else { const p = w.fx.text(e.x + (R0() - 0.5) * 4, e.y - e.r - 6, fmt(Math.max(1, dmg)), o.crit ? COL.gold : (o.col || '#fff'), { sc: 1, f: o.crit ? FB : FS, life: o.crit ? 0.9 : 0.7, vy: o.crit ? -55 : -40 }); p.val = dmg; if (!o.crit) e.dmgTxt = p; else p.pop = 0.06; }
  }
  if (!o.quiet) wsnd(w, 'hit');
  if (o.crit && !w.demo) { FX.hitstop = Math.max(FX.hitstop, 0.03); }
  if (e.dummy && e.hp <= 0) e.hp = e.maxHp;
  if (e.hp <= 0) killEnemy(w, e);
}
function killEnemy(w, e) {
  if (e.dead || e.pvp || e.ghost) return; e.dead = true;
  const kc = w.killfx; const cols = kc ? kc.cols : ['#fff', e.col || '#9f9', e.col2 || '#ff9'];
  const st = kc ? kc.style : 'PIXEL POP';
  burstKill(w, e.x, e.y - 3, st, cols, e.boss ? 3 : e.elite ? 2 : 1);
  if (e.poison > 0) for (const o of w.ents) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 45) { o.poison = 3; o.poisonDps = Math.max(o.poisonDps || 0, e.poisonDps || 1); w.fx.burst(o.x, o.y, 4, { c: '#8cff3a', sp: 40 }); }
  if (e.sticky) explode(w, e.x, e.y, 24, e.sticky.dmg, e.sticky.W.col);
  if (e.boss) { w.bw = null; for (const o of w.ents) if (o.owner === e && !o.dead) { o.dead = true; w.fx.burst(o.x, o.y - 6, 10, { c: [o.col || '#fff', '#fff'], sp: 70 }); } }
  if (e.arch === 'splitter' && !w.demo) for (let i = 0; i < 2; i++) { const m = spawnEnemy(w, 'swarm', e.x + (i ? 6 : -6), e.y); m.hp = m.maxHp = e.maxHp * 0.35; m.col = e.col; m.kx = (i ? 1 : -1) * 120; }
  if (e.volatile && !w.demo) w.tele.push({ x: e.x, y: e.y, r: 28, t: 0, max: 0.45, dmg: e.dmg * 1.2, col: '#ff9a3d' });
  const W = w.lastW;
  if (W) {
    if (W.sig === 'shatter' && (e.freeze > 0 || (e.chill || 0) > 0.2)) { for (let i = 0; i < 6; i++) { const s = makeShot(w, w.player, W, i / 6 * TAU, { kind: 'shard', spd: 220, rng: 90, r: 2, dmg: W.dmg * 0.6, child: true, noVerbs: true }); s.x = e.x; s.y = e.y - 4; s.col = ICE_COL; s.el = ['cryo', 1]; } wsnd(w, 'freeze'); }
    if (W.sig === 'grow') explode(w, e.x, e.y - 4, 34, W.dmg * 1.1, { core: '#fff', mid: '#ffe2a8', edge: '#ff88cc', dark: '#7161ef' });
    if (W.sig === 'hive') { w.tempDrones = Math.min(4, w.tempDrones + 1); w.tempDroneT = 6; }
    if (W.quirk === 'festive' || W.sig === 'confetti') burstKill(w, e.x, e.y - 4, 'CONFETTI', cols, 1);
  }
  wsnd(w, e.boss ? 'bigboom' : 'kill');
  w.onKill(e);
}
function burstKill(w, x, y, st, cols, big = 1) {
  const F = w.fx;
  switch (st) {
    case 'CONFETTI': for (let i = 0; i < 18 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 140, vy: -R0() * 120, g: 200, life: 0.9, c: rainbow(R0() * 3, i * 40), s: 1, drag: 1.5 }); break;
    case 'GHOSTS': for (let i = 0; i < 2 * big; i++) F.add({ x: x + (R0() - 0.5) * 10, y, vx: (R0() - 0.5) * 10, vy: -25, life: 1.1, c: '#fff', s: 3, t: 'fade', drag: 0.5 }); break;
    case 'COIN BURST': for (let i = 0; i < 10 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 120, vy: -R0() * 110 - 20, g: 260, life: 0.8, c: i % 2 ? '#fca311' : '#ffe2a8', s: 2, drag: 1 }); break;
    case 'SKULLS': F.text(x, y - 4, '*', cols[0], { f: FB, life: 0.8 }); F.burst(x, y, 8 * big, { c: cols, sp: 70 }); break;
    case 'BLACK HOLE': for (let i = 0; i < 20 * big; i++) { const a = R0() * TAU, d = 18 + R0() * 10; F.add({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * d * 2.5, vy: -Math.sin(a) * d * 2.5, life: 0.4, c: i % 3 ? cols[1] : '#000', s: 1, drag: 0 }); } break;
    case 'FIREWORKS': for (let i = 0; i < 16 * big; i++) { const a = i / 16 * TAU; F.add({ x, y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.6, c: cols[i % cols.length], s: 1, t: 'spark', drag: 3 }); } break;
    case 'SHOCKWAVE': F.add({ x, y, vx: 0, vy: 0, life: 0.4, c: cols[1], s: 24 * big, t: 'ring' }); F.add({ x, y, vx: 0, vy: 0, life: 0.3, c: '#fff', s: 14 * big, t: 'ring' }); break;
    case 'GLITCH': for (let i = 0; i < 8 * big; i++) F.add({ x: x + (R0() - 0.5) * 16, y: y + (R0() - 0.5) * 10, vx: (R0() - 0.5) * 200, vy: 0, life: 0.25, c: cols[i % cols.length], s: 2, drag: 8 }); break;
    case 'FLOWERS': case 'HEARTS': case 'STARS': for (let i = 0; i < 6 * big; i++) F.text(x + (R0() - 0.5) * 16, y + (R0() - 0.5) * 8, st === 'HEARTS' ? '<' : '*', cols[i % cols.length], { f: FS, life: 0.8, vy: -30 }); F.burst(x, y, 6, { c: cols, sp: 60 }); break;
    default: F.burst(x, y, 12 * big, { c: cols, sp: 90, life: 0.45, s: 2, t: 'shrink' });
  }
}
function applyElement(w, e, W, dmg, o) {
  const [el, pow] = W.el;
  if (!(e.rxCd > w.t) && !e.dummy) {
    const st = statusOf(e);
    for (const k of REACT_KEYS) { const R = REACTIONS[k]; if (R.b !== el || R.a === 'pod') continue; if (R.a === 'any' ? st.some(x => x !== el) : st.includes(R.a)) { e.rxCd = w.t + 0.7; doReaction(w, e, k, dmg, W); break; } }
  }
  if (e.dead) return;
  switch (el) {
    case 'plasma': e.burn = 2; e.burnDps = Math.max(e.burnDps || 0, dmg * 0.4 * pow); break;
    case 'cryo': e.slow = 1.5; e.chill = (e.chill || 0) + 0.35 * pow; if (e.chill >= 1 && !e.boss) { e.freeze = 1; e.chill = 0.5; wsnd(w, 'freeze'); w.fx.burst(e.x, e.y, 6, { c: ['#bff6ff', '#7fe9ff'], sp: 40 }); } break;
    case 'arc': e.shock = 1.6; if (R0() < 0.6) chainZap(w, e, dmg * 0.35 * pow, 1 + Math.floor(pow * 1.5), ARC_COL, true); break;
    case 'void': e.vmark = 2.5; if (R0() < 0.35) w.pulls.push({ x: e.x, y: e.y, r: 34 + 14 * pow, str: 70 * pow, t: 0.3, col: '#b45cff' }); break;
    case 'toxin': e.poison = 3; e.poisonDps = Math.max(e.poisonDps || 0, dmg * 0.3 * pow); break;
    case 'prism': if (R0() < 0.3 * pow) { for (let i = 0; i < 3; i++) { const s = makeShot(w, w.player, W, R0() * TAU, { kind: 'prism', spd: 260, rng: 70, r: 2, dmg: dmg * 0.3 * pow, child: true, noVerbs: true }); s.x = e.x; s.y = e.y; s.hits.add(e); s.pierce = 3; s.el = null; } } break;
  }
}
function chainZap(w, from, dmg, n, col, quietEl) {
  let cur = from; const hit = new Set([from]);
  for (let i = 0; i < n; i++) {
    const nx = nearestEnemy(w, cur.x, cur.y, 75, hit); if (!nx) break;
    w.zaps.push({ x0: cur.x, y0: cur.y - 3, x1: nx.x, y1: nx.y - 3, t: 0, col: col.mid || col });
    hit.add(nx); damageEnemy(w, nx, dmg, { quiet: true, col: '#fff25a' }); cur = nx;
  }
  wsnd(w, 'zap');
}
function explode(w, x, y, r, dmg, col, src) {
  for (const e of w.ents) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < r + e.r) { damageEnemy(w, e, dmg * (d < r * 0.5 ? 1 : 0.6), { quiet: true, src }); e.kx += (e.x - x) / (d + 1) * 120; e.ky += (e.y - y) / (d + 1) * 120; } }
  for (const p of w.props) if (!p.dead && p.shoot && Math.hypot(p.x - x, p.y - y) < r + p.r) hitProp(w, p, dmg, src === 'pod' ? null : null);
  for (const m of w.mines) if (!m.dead && m.t > m.arm + 0.3 && Math.hypot(m.x - x, m.y - y) < r + 8) m.life = Math.min(m.life, 0.01);
  const c = col || { core: '#fff', mid: '#ffcb3d', edge: '#ff6a00', dark: '#802000' };
  w.fx.add({ x, y, vx: 0, vy: 0, life: 0.3, c: c.core, s: r, t: 'ring' });
  w.fx.burst(x, y, 10 + r * 0.4, { c: [c.core, c.mid, c.edge, '#fff'], sp: r * 4, life: 0.4, s: 2, t: 'shrink' });
  w.fx.burst(x, y, 6, { c: ['#555a', '#333'], sp: r * 2, life: 0.7, s: 2, t: 'fade' });
  wsnd(w, 'boom'); if (!w.demo) shake(Math.min(5, r * 0.12));
}
function splitShots(w, x, y, W, n, a) {
  for (let i = 0; i < n; i++) { const aa = a + (i / Math.max(1, n - 1) - 0.5) * 1.3; const s = makeShot(w, w.player, W, aa, { kind: 'shard', spd: 220, rng: 80, r: 2, dmg: W.dmg * 0.45, child: true }); s.x = x; s.y = y; s.v = {}; s.bounce = 0; s.pierce = 0; }
}
// ---------- shots update ----------
function updateShots(w, dt) {
  const pl = w.player;
  for (const s of w.shots) {
    if (s.dead) continue; s.t += dt;
    if (s.stuck) { s.x = s.stuck.x + s.sox; s.y = s.stuck.y + s.soy; s.fuse -= dt; if (s.fuse <= 0 || s.stuck.dead) { explode(w, s.x, s.y, 20 + (s.v.stick || 1) * 6, s.dmg * 1.3, s.col); s.dead = true; } continue; }
    if (s.orbitT && s.t < s.orbitT) {
      s.oa += dt * 11; s.x = pl.x + Math.cos(s.oa) * s.orbitR; s.y = pl.y - 6 + Math.sin(s.oa) * s.orbitR * 0.8;
      for (const e of w.ents) if (!e.dead && !s.hits.has(e) && Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) { s.hits.add(e); hitEnemy(w, e, s.dmg * 0.5, { W: s.W || wStatsLike(s), x: s.x, y: s.y, noFx: true }); }
      if (s.t + dt >= s.orbitT) { const tg = nearestEnemy(w, s.x, s.y, 220); s.ang = tg ? Math.atan2(tg.y - s.y, tg.x - s.x) : pl.aim; s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; s.hits.clear(); }
      continue;
    }
    if (s.sig === 'grow') { s.r = Math.min(9, s.r + dt * 6); s.dmg *= 1 + dt * 0.9; }
    if (s.v.spiral && !s.child) { s.ang += s.spin * dt / (1 + s.t * 1.5) * (1 + s.v.spiral * 0.2); s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; }
    if (s.v.home && !s.burrow) { const tg = nearestEnemy(w, s.x, s.y, 90 + s.v.home * 40, s.hits); if (tg) { const ta = Math.atan2(tg.y - s.y, tg.x - s.x); s.ang += clamp(angDiff(s.ang, ta), -(1.5 + s.v.home * 1.6) * dt, (1.5 + s.v.home * 1.6) * dt); s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; } }
    if (s.v.return && !s.child) {
      if (s.phase === 0 && s.travel > s.rng * 0.55) { s.phase = 1; s.hits.clear(); if (s.sig === 'multiply' && !s.mult) multiplyDisc(w, s); }
      if (s.phase === 1) { const ta = Math.atan2(pl.y - 6 - s.y, pl.x - s.x); s.ang += clamp(angDiff(s.ang, ta), -9 * dt, 9 * dt); s.vx = Math.cos(s.ang) * s.spd * 1.1; s.vy = Math.sin(s.ang) * s.spd * 1.1; if (Math.hypot(pl.x - s.x, pl.y - 6 - s.y) < 9) { s.dead = true; if (!s.copy && pl.W && pl.W.cls === 'throwing') { pl.fireCd = 0; w.fx.text(pl.x, pl.y - 28, 'CATCH!', COL.lilac, { f: FS, life: 0.5 }); } continue; } s.life = Math.max(s.life, 0.3); }
    }
    if (s.rocket) { s.spd = Math.min(s.spd * (1 + dt * 1.8), 320); s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; if (R0() < 0.6) w.fx.add({ x: s.x, y: s.y, vx: (R0() - 0.5) * 10, vy: (R0() - 0.5) * 10, life: 0.4, c: R0() < 0.5 ? '#9aa' : s.col.mid, s: 2, t: 'fade' }); }
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt; s.travel += s.spd * dt;
    if (s.burrow) {
      s.x = nx; s.y = ny; if (R0() < 0.7) w.fx.add({ x: s.x, y: s.y + 2, vx: (R0() - 0.5) * 30, vy: -R0() * 30, life: 0.3, c: '#6b5a48', s: 1 });
      const tg = nearestEnemy(w, s.x, s.y, 10);
      if (s.t >= s.burrowT || tg) { s.burrow = false; explode(w, s.x, s.y, 16 + (s.v.burrow || 1) * 5, s.dmg * 1.2, s.col); w.fx.burst(s.x, s.y, 10, { c: ['#6b5a48', '#8a7660'], sp: 80, g: 200 }); if (!s.v.split) { s.dead = true; } else { splitShots(w, s.x, s.y, s.W || wStatsLike(s), s.v.split + 1, s.ang); s.dead = true; } }
      continue;
    }
    if (w.solid(nx, ny)) {
      if (s.bounce > 0) { if (w.solid(nx, s.y)) s.vx = -s.vx; if (w.solid(s.x, ny)) s.vy = -s.vy; s.ang = Math.atan2(s.vy, s.vx); s.bounce--; if (s.sig === 'pinball') pinball(s); }
      else { if (s.presents) presentBurst(w, s); if (s.v.detonate) explode(w, s.x, s.y, 14 + s.v.detonate * 6, s.dmg * 0.8, s.col); else impactFx(w.fx, s.x, s.y, s.vx / (s.spd || 1), s.vy / (s.spd || 1), s.col, false); if (s.sig === 'dragon') fireAt(w, s.x, s.y, s.dmg); s.dead = true; continue; }
    } else { s.x = nx; s.y = ny; }
    if ((w.bw || (w.boss && (w.boss.shards || w.boss.reflect > 0))) && bossBlocksShot(w, s)) { s.dead = true; continue; }
    s.life -= dt;
    let removed = false;
    for (const e of w.ents) {
      if (e.dead || s.hits.has(e)) continue;
      if (Math.hypot(e.x - s.x, e.y - 4 - s.y) < e.r + s.r) {
        s.hits.add(e);
        const Wl = s.W || wStatsLike(s);
        let mult = 1;
        if (s.kind === 'pellet' && s.travel < 48) { mult = 1.35; if (!pl.pbShown) { pl.pbShown = true; w.fx.text(e.x, e.y - e.r - 16, 'POINT BLANK', COL.lilac, { f: FS, life: 0.5 }); } }
        if (s.kind === 'slug' && s.travel > 200) { mult = 1.5; w.fx.text(e.x, e.y - e.r - 16, 'LONG SHOT', COL.lilac, { f: FS, life: 0.5 }); }
        hitEnemy(w, e, s.dmg, { W: Wl, x: s.x, y: s.y, dx: s.vx / (s.spd || 1), dy: s.vy / (s.spd || 1), kb: s.kind === 'pellet' ? 0.6 : s.kind === 'slug' ? 2.2 : 1, forceCrit: s.forceCrit, mult });
        if (s.zeus) { chainZap(w, e, s.dmg * 1.2, 8, ARC_COL); w.zaps.push({ x0: e.x, y0: e.y - 120, x1: e.x, y1: e.y - 3, t: 0, col: '#fff25a' }); }
        if (s.solar) explode(w, s.x, s.y, 32, s.dmg * 2, PLASMA_COL);
        if (s.sig === 'dragon') fireAt(w, s.x, s.y, s.dmg);
        if (s.sig === 'blackhole') { blackHole(w, s); s.dead = true; removed = true; break; }
        if (s.sig === 'lastword' && e.dead) { const nt = nearestEnemy(w, s.x, s.y, 320, s.hits); if (nt) { s.dmg *= 1.25; s.ang = Math.atan2(nt.y - 4 - s.y, nt.x - s.x); s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; s.life = Math.max(s.life, 1.2); w.fx.text(s.x, s.y - 12, 'NEXT!', COL.gold, { f: FS, life: 0.4 }); continue; } }
        if (s.v.stick && !s.child) { s.stuck = e; s.sox = s.x - e.x; s.soy = s.y - e.y; s.fuse = 0.6; w.fx.burst(s.x, s.y, 3, { c: [s.col.core], sp: 30 }); break; }
        if (s.v.detonate) explode(w, s.x, s.y, (s.aoe || 14) + s.v.detonate * 6, s.dmg * 0.8, s.col);
        if (s.presents && !(s.bounce > 0)) { presentBurst(w, s); s.presents = false; }
        if (s.v.chain) chainZap(w, e, s.dmg * 0.55, s.v.chain + 1, s.col);
        if (s.v.pull) w.pulls.push({ x: s.x, y: s.y, r: 46 + s.v.pull * 10, str: 120 + s.v.pull * 40, t: 0.5, col: s.col.mid });
        if (s.v.split && !s.child) { splitShots(w, s.x, s.y, Wl, s.v.split + 1, s.ang); }
        if (s.bounce > 0) { const nt = nearestEnemy(w, s.x, s.y, 110, s.hits); if (nt) { s.bounce--; s.ang = Math.atan2(nt.y - s.y, nt.x - s.x); s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; s.life = Math.max(s.life, 0.5); if (s.sig === 'pinball') pinball(s); w.fx.burst(s.x, s.y, 3, { c: [s.col.core], sp: 40 }); continue; } }
        if (s.v.return && !s.child) continue;
        if (s.pierce > 0) { s.pierce--; continue; }
        removed = true; break;
      }
    }
    if (!removed && w.props.length) for (const p of w.props) {
      if (p.dead || !p.shoot || s.hits.has(p)) continue;
      if (p.kind === 'prism') { if (Math.hypot(p.x - s.x, p.y - (p.cy || 4) - s.y) < p.r + s.r) { s.hits.add(p); prismSplit(w, s, p); } continue; }
      if (Math.hypot(p.x - s.x, p.y - (p.cy || 4) - s.y) < p.r + s.r) { s.hits.add(p); hitProp(w, p, s.dmg, s.el ? s.el[0] : null); if (s.v.detonate) explode(w, s.x, s.y, (s.aoe || 14) + s.v.detonate * 6, s.dmg * 0.8, s.col); if (s.sig === 'blackhole') { blackHole(w, s); removed = true; break; } if (s.pierce > 0) { s.pierce--; continue; } removed = true; break; }
    }
    if (removed) { s.dead = true; continue; }
    if (s.life <= 0) {
      if (s.v.return && !s.child && s.phase === 0) { s.phase = 1; s.hits.clear(); s.life = 1; if (s.sig === 'multiply' && !s.mult) multiplyDisc(w, s); continue; }
      if (s.v.split && !s.child) splitShots(w, s.x, s.y, s.W || wStatsLike(s), s.v.split + 1, s.ang);
      if (s.sig === 'blackhole') blackHole(w, s);
      else if (s.rocket || (s.v.detonate && !s.child)) explode(w, s.x, s.y, (s.aoe || 14) + (s.v.detonate || 0) * 5, s.dmg * 0.7, s.col);
      if (s.presents) presentBurst(w, s);
      if (s.sig === 'dragon') fireAt(w, s.x, s.y, s.dmg);
      s.dead = true;
    }
  }
  w.shots = w.shots.filter(s => !s.dead);
}
function wStatsLike(s) { return { v: s.v, el: s.el, dmg: s.dmg, col: s.col, spd: s.spd, rng: 80, pierce: 0 }; }
// ---------- mines & drones ----------
function updateMines(w, dt) {
  for (const m of w.mines) {
    m.t += dt;
    if (m.t < 0.3) { const k = m.t / 0.3; m.x = lerp(m.sx, m.tx, k); m.y = lerp(m.sy, m.ty, k) - Math.sin(k * Math.PI) * 12; continue; }
    m.life -= dt; const v = m.W.v;
    if (v.home) { const tg = nearestEnemy(w, m.x, m.y, 90); if (tg) { const a = Math.atan2(tg.y - m.y, tg.x - m.x); m.x += Math.cos(a) * 30 * v.home * dt; m.y += Math.sin(a) * 30 * v.home * dt; } }
    if (m.t < m.arm + 0.3) continue;
    if (m.W.sig === 'choir' && R0() < dt * 4) w.pulls.push({ x: m.x, y: m.y, r: 70, str: 60, t: 0.3, col: '#b45cff' });
    const tg = nearestEnemy(w, m.x, m.y, 16);
    if (tg || m.life <= 0) {
      m.dead = true; explode(w, m.x, m.y, m.W.aoe + (v.detonate || 0) * 8, m.W.dmg, m.col);
      if (v.chain && tg) chainZap(w, tg, m.W.dmg * 0.5, v.chain + 1, m.col);
      if (v.pull) w.pulls.push({ x: m.x, y: m.y, r: 60, str: 150, t: 0.5, col: m.col.mid });
      if (v.split) splitShots(w, m.x, m.y, m.W, v.split + 2, R0() * TAU);
      if (tg && m.W.el) applyElement(w, tg, m.W, m.W.dmg, {});
      if (m.W.sig === 'choir') for (const o of w.mines) if (!o.dead && o.W.sig === 'choir') o.life = Math.min(o.life, 0.01);
    }
  }
  w.mines = w.mines.filter(m => !m.dead);
}
function updateDrones(w, pl, W, dt) {
  if (!W || W.cls !== 'drone') { w.drones.length = 0; return; }
  const n = Math.min(10, (W.sig === 'hive' ? 6 : Math.min(4, 1 + Math.floor(W.r / 2))) + (w.tempDrones || 0));
  while (w.drones.length < n) w.drones.push({ a: w.drones.length / n * TAU, cd: R0() * 0.5, x: pl.x, y: pl.y });
  w.drones.length = n;
  w.drones.forEach((d, i) => {
    d.a += dt * 2.2; const tx = pl.x + Math.cos(d.a + i * TAU / n) * (18 + (i % 2) * 6), ty = pl.y - 10 + Math.sin(d.a + i * TAU / n) * 10;
    d.x = lerp(d.x, tx, dt * 8); d.y = lerp(d.y, ty, dt * 8);
    d.cd -= dt * (pl.droneRate || 1);
    if (d.cd <= 0) {
      let a = null;
      if (pl.droneFocus) a = pl.aim; else { const tg = nearestEnemy(w, d.x, d.y, W.rng); if (tg) a = Math.atan2(tg.y - 4 - d.y, tg.x - d.x); }
      if (a !== null) { d.cd = 1 / W.rate; const s = makeShot(w, pl, W, a, { kind: 'bolt', r: 2, spd: 240 }); s.x = d.x; s.y = d.y; wsnd(w, 'drone'); }
      else d.cd = 0.1;
    }
  });
}
// ---------- enemies ----------
const ARCH = {
  crawler: { hp: 26, spd: 34, dmg: 8, r: 6, coin: 3, xp: 3 }, swarm: { hp: 10, spd: 52, dmg: 4, r: 4, coin: 1, xp: 1 },
  dasher: { hp: 22, spd: 30, dmg: 12, r: 6, coin: 4, xp: 4 }, spitter: { hp: 18, spd: 26, dmg: 7, r: 6, coin: 4, xp: 4 }, brute: { hp: 85, spd: 20, dmg: 16, r: 9, coin: 10, xp: 9 },
  nest: { hp: 240, spd: 0, dmg: 0, r: 10, coin: 25, xp: 20 },
};
function spawnEnemy(w, arch, x, y, lvlMul = 1) {
  const A = ARCH[arch]; const p = planetDef(w.pi);
  const e = { x, y, vx: 0, vy: 0, kx: 0, ky: 0, arch, r: A.r, hp: A.hp * w.hpMul * lvlMul, spd: A.spd * (0.9 + R0() * 0.2), dmg: A.dmg * w.dmgMul, t: R0() * 3, st: 'move', cd: 1 + R0() * 2, flash: 0, slow: 0, freeze: 0, burn: 0, poison: 0, face: 1, coin: A.coin, xp: A.xp, col: hex(hsl(p.alien[1][0], p.alien[1][1], p.alien[1][2])), col2: hex(hsl(p.alien[1][0] + 180, 1, 0.6)) };
  if (arch === 'brute' || A.armored) e.armored = true; if (arch === 'nest') { e.nest = true; e.col = hex(hsl(p.alien[1][0], 0.6, 0.35)); }
  e.maxHp = e.hp; w.ents.push(e); return e;
}
function spawnBoss(w, x, y) {
  const p = planetDef(w.pi); const n = w.pi;
  const e = { x, y, vx: 0, vy: 0, kx: 0, ky: 0, arch: 'boss', boss: true, r: 18, hp: 1100 * w.hpMul * (n > 20 ? 1.5 : 1), spd: 24, dmg: 20 * w.dmgMul, t: 0, st: 'intro', cd: 2, flash: 0, slow: 0, freeze: 0, burn: 0, poison: 0, face: 1, pat: 0, pt: 0, coin: 120, xp: 150, col: hex(hsl(p.boss[2][0], p.boss[2][1], p.boss[2][2])), col2: '#fff' };
  e.maxHp = e.hp; w.ents.push(e); w.boss = e; if (BOSS_KITS[bossBase(n)]) setupBossKit(w, e); return e;
}
function enemyShoot(w, e, a, spd = 85, dmg) { w.eshots.push({ x: e.x, y: e.y - 4, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 3, dmg: dmg || e.dmg, life: 4, col: e.col2 || '#f55' }); }
function updateEnemies(w, dt) {
  const pl = w.player;
  updateHazards(w, dt); updateGadgetFx(w, dt);
  for (const e of w.ents) {
    if (e.dead) continue;
    e.t += dt; e.flash -= dt;
    if (e.shock > 0) e.shock -= dt; if (e.vmark > 0) e.vmark -= dt; if (e.corrode > 0) e.corrode -= dt; if (e.steam > 0) e.steam -= dt; if (e.coreT > 0) e.coreT -= dt;
    if (e.burn > 0) { e.burn -= dt; if (R0() < 0.4) w.fx.add({ x: e.x + (R0() - 0.5) * e.r, y: e.y - e.r, vx: 0, vy: -30, life: 0.4, c: R0() < 0.5 ? '#ff7a2e' : '#fca311', s: 1 }); }
    if (e.poison > 0) { e.poison -= dt; if (R0() < 0.25) w.fx.add({ x: e.x + (R0() - 0.5) * e.r, y: e.y - e.r, vx: 0, vy: -20, life: 0.5, c: '#8cff3a', s: 1 }); }
    e.dotAcc = (e.dotAcc || 0) + dt;
    if (e.dotAcc >= 0.25) { const dps = (e.burn > 0 ? e.burnDps : 0) + (e.poison > 0 ? e.poisonDps : 0); e.dotAcc = 0; if (dps > 0) damageEnemy(w, e, dps * 0.25, { quiet: true, col: e.burn > 0 ? '#ff9a3d' : '#8cff3a' }); if (e.dead) continue; }
    if (e.sticky) { e.sticky.t -= dt; if (e.sticky.t <= 0) { const st = e.sticky; e.sticky = null; explode(w, e.x, e.y, 26, st.dmg, st.W.col); if (e.dead) continue; } }
    if (e.freeze > 0) { e.freeze -= dt; e.kx *= 0.8; e.ky *= 0.8; e.x += e.kx * dt; e.y += e.ky * dt; continue; }
    if (e.stun > 0) { e.stun -= dt; e.kx *= 0.85; e.ky *= 0.85; e.x += e.kx * dt; e.y += e.ky * dt; if (w.collide) w.collide(e); continue; }
    if (e.dummy) continue;
    const slowK = (e.warp > 0 ? 0.3 : 1) * (e.slow > 0 ? 0.55 : 1); if (e.slow > 0) e.slow -= dt; if (e.warp > 0) e.warp -= dt;
    let tx = pl.x, ty = pl.y;
    if (w.decoy && !e.boss) { tx = w.decoy.x; ty = w.decoy.y; }
    else if (e.tgt && !e.tgt.dead) { tx = e.tgt.x; ty = e.tgt.y; }
    else if (pl.shadowT > 0 && !e.boss) { tx = e.x + Math.sin(e.t * 0.9 + e.r) * 40; ty = e.y + Math.cos(e.t * 0.7) * 40; }
    let tAlly = false; if (w.allies && !e.tgt && !(w.decoy && !e.boss)) for (const al of w.allies) if (al && al.alive && Math.hypot(al.x - e.x, al.y - e.y) < Math.hypot(tx - e.x, ty - e.y) - 10) { tx = al.x; ty = al.y; tAlly = true; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    const dpl = Math.hypot(pl.x - e.x, pl.y - e.y); const da = tAlly || (e.tgt && !e.tgt.dead && e.tgt.hp !== undefined) ? d : dpl; // attacks aim at the player or a real objective, never a wander point
    let mx = 0, my = 0;
    if (e.passive) { const pa = e.t * (e.pspd || 0.8) + (e.pph || 0); mx = (e.hx + Math.cos(pa) * (e.prx || 30) - e.x) * 0.08; my = (e.hy + Math.sin(pa) * (e.pry || 20) - e.y) * 0.08; }
    else if (w.demo) { mx = dx / d * 0.3; my = dy / d * 0.3; if (d < 26) { mx = -dx / d; my = -dy / d; } }
    else if (e.boss) { if (e.kit) kitAI(w, e, dt, d, a); else bossAI(w, e, dt, d, a); mx = e.mx || 0; my = e.my || 0; }
    else if (e.part) { mx = 0; my = 0; }
    else if (e.clone) { e.life -= dt; e.cd -= dt; if (e.cd <= 0) { e.cd = 2.2; bShot(w, e.x, e.y - 14, a, 60, (e.owner ? e.owner.dmg : e.dmg) * 0.45, { col: '#b45cff', home: 1, life: 5, r: 3 }); } if (e.life <= 0) { e.dead = true; w.fx.burst(e.x, e.y - 14, 14, { c: ['#000', e.col], sp: 70 }); continue; } }
    else switch (e.arch) {
      case 'crawler': mx = dx / d; my = dy / d; break;
      case 'swarm': mx = dx / d + Math.sin(e.t * 6) * 0.6; my = dy / d + Math.cos(e.t * 5) * 0.6; break;
      case 'brute':
        if (e.st === 'wind') { e.st_t -= dt; if (e.st_t <= 0) { e.st = 'move'; e.windDmg = 0; w.tele.push({ x: e.x, y: e.y, r: e.elite ? 46 : 32, t: 0, max: 0.2, dmg: e.dmg * 1.3, col: e.col }); } }
        else { mx = dx / d; my = dy / d; e.cd -= dt; if (e.cd <= 0 && da < (e.elite ? 95 : 70)) { e.cd = e.elite ? 2.6 : 4; e.st = 'wind'; e.st_t = e.elite ? 0.85 : 0.7; e.windDmg = 0; } }
        break;
      case 'dasher':
        if (e.st === 'move') { mx = dx / d; my = dy / d; e.cd -= dt; if (da < 95 && e.cd <= 0) { e.st = 'wind'; e.st_t = 0.6; e.da = a; e.windDmg = 0; } }
        else if (e.st === 'wind') { e.st_t -= dt; e.da = a; if (e.st_t <= 0) { e.st = 'dash'; e.st_t = 0.45; } }
        else if (e.st === 'dash') { e.st_t -= dt; e.x += Math.cos(e.da) * 175 * dt * slowK; e.y += Math.sin(e.da) * 175 * dt * slowK; if (R0() < 0.5) w.fx.add({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.25, c: e.col, s: 2, t: 'fade' }); if (e.st_t <= 0) { e.st = 'move'; e.cd = 1.2; } }
        break;
      case 'spitter':
        if (d > 140) { mx = dx / d; my = dy / d; } else if (d < 95) { mx = -dx / d; my = -dy / d; } else { mx = -dy / d * 0.6; my = dx / d * 0.6; }
        e.cd -= dt; if (e.cd <= 0 && d < 200) { e.cd = 2 + R0(); const aa = a + (R0() - 0.5) * 0.2; w.eshots.push({ x: e.x, y: e.y - 4, vx: Math.cos(aa) * 85, vy: Math.sin(aa) * 85, r: 3, dmg: e.dmg, life: 4, col: e.col2 || '#f55' }); if (w.sndOn) SND.play('pew'); }
        break;
      case 'nest': e.spawnT = (e.spawnT || 3) - dt; if (e.spawnT <= 0 && (dpl < 260 || e.egg) && w.ents.length < 40) { e.spawnT = 5 + R0() * 2; if (e.egg) e.dead = true; const k = 2 + R0.int(2); for (let i = 0; i < k; i++) spawnEnemy(w, R0() < 0.5 ? 'swarm' : 'crawler', e.x + (R0() - 0.5) * 20, e.y + 8 + R0() * 8); w.fx.burst(e.x, e.y - 6, 10, { c: [e.col, '#fff'], sp: 60 }); } break;
      default: { const r = foeAI(w, e, dt, { d, a, dx, dy, da, pl }); mx = r[0]; my = r[1]; if (e.dead) continue; }
    }
    if (e.carrier && !w.demo) { const cdx = pl.x - e.x, cdy = pl.y - e.y, cd = Math.hypot(cdx, cdy) || 1; if (cd < 130) { mx = -cdx / cd + Math.sin(e.t * 3) * 0.5; my = -cdy / cd + Math.cos(e.t * 2.4) * 0.5; } else { mx = Math.sin(e.t * 0.8) * 0.6; my = Math.cos(e.t * 1.1) * 0.6; } if (R0() < 0.3) w.fx.add({ x: e.x + (R0() - 0.5) * 10, y: e.y - 6 - R0() * 8, vx: 0, vy: -16, life: 0.6, c: R0() < 0.5 ? COL.gold : '#fff', s: 1 }); }
    if (mx || my) { if (!e.passive || Math.abs(mx) > 0.05) e.face = mx < 0 ? -1 : 1; }
    const sp = e.spd * slowK * (w.enemySpd || 1);
    if (e.nest) { e.kx = 0; e.ky = 0; } else if (e.passive) { e.x += mx * 60 * dt; e.y += my * 60 * dt; } else { e.x += (mx * sp + e.kx) * dt; e.y += (my * sp + e.ky) * dt; }
    e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
    if (w.collide && e.arch !== 'nest') w.collide(e);
    if (e.tgt && !e.tgt.dead && e.tgt.hp !== undefined && d < e.r + (e.tgt.r || 10) + 2 && !e.passive) { e.tgt.hp -= e.dmg * dt * 1.4; e.tgt.hitT = 0.15; }
    else if (!w.demo && !e.passive && e.arch !== 'nest' && !e.under && !e.hidden && !e.part && dpl < e.r + pl.r + 2) hurtPlayer(w, e.dmg, e);
  }
  const es = w.ents;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j]; if (a.dead || b.dead) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
    if (d < m && d > 0.01) { const p = (m - d) / 2; const nx = dx / d, ny = dy / d; const fa = a.boss || a.nest || a.dummy, fb = b.boss || b.nest || b.dummy; if (!fa) { a.x -= nx * p; a.y -= ny * p; } if (!fb) { b.x += nx * p; b.y += ny * p; } }
  }
  for (const p of w.pulls) { p.t -= dt; for (const e of w.ents) { if (e.dead || e.boss || e.nest || e.dummy) continue; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy); if (d < p.r && d > 3) { e.x += dx / d * p.str * dt; e.y += dy / d * p.str * dt; } } if (R0() < 0.5) { const a = R0() * TAU; w.fx.add({ x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r, vx: -Math.cos(a) * p.r * 2.5, vy: -Math.sin(a) * p.r * 2.5, life: 0.35, c: p.col || '#b45cff', s: 1, drag: 0 }); } }
  w.pulls = w.pulls.filter(p => p.t > 0);
  w.ents = w.ents.filter(e => !e.dead);
}
function bossAI(w, e, dt, d, a) {
  const pl = w.player; const p = planetDef(w.pi); const pats = p.boss[1]; const enr = e.hp < e.maxHp * 0.5 ? 1.35 : 1;
  e.mx = 0; e.my = 0; e.windup = false;
  if (e.st === 'intro') { e.cd -= dt; if (e.cd <= 0) { e.st = 'idle'; e.cd = 1.2; } return; }
  if (e.st === 'idle') { e.mx = Math.cos(a) * 0.6; e.my = Math.sin(a) * 0.6; e.cd -= dt * enr; if (e.cd <= 0) { e.st = pats[e.pat % pats.length]; e.pat++; e.pt = 0; e.n = 0; } return; }
  e.pt += dt * enr;
  const done = (cd = 1.4, core = 0) => { e.st = 'idle'; e.cd = cd; if (core) { e.coreT = core; w.fx.text(e.x, e.y - e.r - 22, 'CORE EXPOSED', COL.gold, { f: FB, life: 1 }); } };
  switch (e.st) {
    case 'radial': if (e.pt > e.n * 0.6 && e.n < 3) { const N = 14 + Math.floor(enr * 4); for (let i = 0; i < N; i++) enemyShoot(w, e, i / N * TAU + e.n * 0.2, 70 * enr, e.dmg * 0.6); e.n++; wsnd(w, 'launch'); } if (e.pt > 2) done(1.4, 0.9); break;
    case 'spiral': if (e.pt > e.n * 0.07) { const ba = e.pt * 3.2; for (let k = 0; k < 3; k++) enemyShoot(w, e, ba + k * TAU / 3, 80, e.dmg * 0.5); e.n++; } if (e.pt > 2.6) done(); break;
    case 'charge':
      if (e.n === 0) { e.ca = a; e.n = 1; e.cx0 = e.x; e.cy0 = e.y; w.tele.push({ line: true, x: e.x, y: e.y, a: e.ca, len: 170, t: 0, max: 0.75, dmg: 0, col: e.col }); }
      e.windup = e.pt < (e.n === 1 ? 0.75 : 0.6);
      if (e.pt > 0.75 && e.pt < 1.35) { e.x += Math.cos(e.ca) * 260 * dt; e.y += Math.sin(e.ca) * 260 * dt; if (w.collide) w.collide(e); if (R0() < 0.6) w.fx.add({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, c: e.col, s: 4, t: 'fade' }); }
      if (e.pt > 1.6) { if (e.n < 3) { e.pt = 0; e.n++; e.ca = Math.atan2(pl.y - e.y, pl.x - e.x); w.tele.push({ line: true, x: e.x, y: e.y, a: e.ca, len: 170, t: 0, max: 0.6, dmg: 0, col: e.col }); } else done(1.6, 1.4); }
      break;
    case 'summon': e.windup = e.n === 0; if (e.n === 0 && e.pt > 0.9) { e.n = 1; const k = 3 + Math.floor(enr * 2); for (let i = 0; i < k; i++) { const aa = i / k * TAU; spawnEnemy(w, R0.pick(p.alien[2]), e.x + Math.cos(aa) * 30, e.y + Math.sin(aa) * 30); } w.fx.burst(e.x, e.y, 20, { c: [e.col, '#fff'], sp: 120 }); if (w.sndOn) SND.play('bossroar'); } if (e.n === 0 && R0() < 0.4) w.fx.add({ x: e.x + (R0() - 0.5) * 40, y: e.y + (R0() - 0.5) * 30, vx: 0, vy: -40, life: 0.4, c: e.col, s: 2 }); if (e.pt > 1.8) done(); break;
    case 'slam': if (e.n < 3 && e.pt > e.n * 0.45) { w.tele.push({ x: pl.x + (R0() - 0.5) * 50, y: pl.y + (R0() - 0.5) * 40, r: 30, t: 0, max: 0.9, dmg: e.dmg, col: e.col }); e.n++; } if (e.pt > 2.2) done(1.4, 1.1); break;
    case 'rain': if (e.n < 8 && e.pt > e.n * 0.18) { const aa = R0() * TAU, rr = R0() * 110; w.tele.push({ x: pl.x + Math.cos(aa) * rr, y: pl.y + Math.sin(aa) * rr, r: 16, t: 0, max: 1.0, dmg: e.dmg * 0.8, col: e.col, meteor: true }); e.n++; } if (e.pt > 2.6) done(); break;
    default: done();
  }
}
function updateTele(w, dt) {
  const pl = w.player;
  for (const t of w.tele) {
    t.t += dt;
    if (t.t >= t.max && !t.done) {
      t.done = true;
      if (t.onDone) t.onDone(t);
      if (t.line) { if (t.dmg > 0) { if (segDist(pl.x, pl.y - 6, t.x, t.y, t.x + Math.cos(t.a) * t.len, t.y + Math.sin(t.a) * t.len) < (t.wd || 6) / 2 + pl.r) hurtPlayer(w, t.dmg, null); for (let k = 0; k < t.len; k += 24) w.fx.add({ x: t.x + Math.cos(t.a) * k, y: t.y + Math.sin(t.a) * k, life: 0.3, c: t.col, s: Math.max(2, (t.wd || 6) * 0.6), t: 'shrink' }); } continue; }
      if (!t.safe && Math.hypot(pl.x - t.x, pl.y - t.y) < t.r + pl.r) hurtPlayer(w, t.dmg, null);
      w.fx.burst(t.x, t.y, 14, { c: [t.col, '#fff', '#ffcb3d'], sp: t.r * 4, life: 0.4, s: 2, t: 'shrink' }); w.fx.add({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.3, c: '#fff', s: t.r, t: 'ring' });
      if (w.sndOn) SND.play('boom'); shake(2);
    }
  }
  w.tele = w.tele.filter(t => t.t < t.max + 0.05);
  updateBossSys(w, dt);
}
function updateEShots(w, dt) {
  const pl = w.player;
  for (const s of w.eshots) {
    if (s.home) { const ta = Math.atan2(pl.y - 6 - s.y, pl.x - s.x), ca = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy); const na = ca + clamp(angDiff(ca, ta), -s.home * dt, s.home * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
    if (s.saw && R0() < 0.3) w.fx.add({ x: s.x, y: s.y, life: 0.2, c: '#dfe4f5', s: 1, t: 'fade' });
    if (s.bounce > 0 && w.solid(s.x + s.vx * dt, s.y + s.vy * dt)) { if (w.solid(s.x + s.vx * dt, s.y)) s.vx = -s.vx; if (w.solid(s.x, s.y + s.vy * dt)) s.vy = -s.vy; s.bounce--; }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (w.solid(s.x, s.y)) { s.life = 0; w.fx.burst(s.x, s.y, 3, { c: [s.col], sp: 30 }); }
    if (!s.passed && Math.hypot(pl.x - s.x, pl.y - 6 - s.y) < pl.r + s.r) { if (hurtPlayer(w, s.dmg, null)) s.passed = true; else { s.life = 0; if (s.slow) pl.slowT = Math.max(pl.slowT || 0, s.slow); } }
  }
  w.eshots = w.eshots.filter(s => s.life > 0);
}
function hurtPlayer(w, dmg, src) {
  const pl = w.player; if (w.demo || pl.dead || (w.noHurt && w.arena)) return false;
  if (pl.boostT > 0) { const attack = !src || src.boss || src.elite || src.st === 'dash'; if (attack && !pl.pdDone && w.t - (pl.lastPD || -9) > 1) perfectDodge(w, pl); return true; }
  if (pl.inv > 0 || w.noHurt) return false;
  if (petBlocks(w, pl)) return false;
  if (w.gx && w.gx.some(g => g.k === 'dome' && !src)) return false; // shots can't reach you inside the dome
  const sa = pl.setAb || {};
  let d = dmg * (1 - (pl.armor || 0)); if (sa[8] && pl.hp < pl.maxHp * 0.35) d *= sa[8] > 1 ? 0.4 : 0.5;
  pl.hp -= d; pl.inv = 0.7; pl.hurtT = 0.3;
  if (src && pl.perks && pl.perks.thorns) damageEnemy(w, src, pl.maxHp * 0.1, { quiet: false, col: '#ff9' });
  if (src && sa[7] && !src.boss) { src.freeze = sa[7] > 1 ? 2.5 : 1.5; w.fx.burst(src.x, src.y - 4, 8, { c: ['#bff6ff', '#fff'], sp: 50 }); }
  w.fx.text(pl.x, pl.y - 22, '-' + fmt(Math.max(1, d)), COL.coral, { f: FB, life: 0.8 });
  SND.play('hurt'); shake(4); flash(0.25, '#ff2040');
  w.onHurt(d);
  if (pl.hp <= 0) { pl.hp = 0; pl.dead = true; w.onDeath(); }
  return false;
}
// ---------- draw ----------
// a glowing streak: dim tail, bright 2px head
function drawBolt(x, y, vx, vy, L, c, t) {
  const grow = Math.min(1, (t || 1) / 0.05), tx = x - vx * L * grow, ty = y - vy * L * grow, horiz = Math.abs(vx) > Math.abs(vy);
  ctx.globalAlpha = 0.28; circ(x, y, 3, c.mid); ctx.globalAlpha = 1;
  line(tx, ty, x, y, c.edge); if (horiz) line(tx, ty + 1, x, y + 1, c.edge); else line(tx + 1, ty, x + 1, y, c.edge);
  const hx = lerp(tx, x, 0.55), hy = lerp(ty, y, 0.55); line(hx, hy, x, y, c.mid); if (horiz) line(hx, hy + 1, x, y + 1, c.mid); else line(hx + 1, hy, x + 1, y, c.mid);
  rect(x - (horiz ? 1 : 0), y, 2, 2, c.core);
}
function drawShots(w, ox, oy) {
  for (const s of w.shots) {
    if (s.burrow) continue;
    const x = s.x - ox, y = s.y - oy; const c = s.col;
    if (s.solar || s.zeus || s.forceCrit) { ctx.globalAlpha = 0.4; circ(x, y, 4, s.solar ? '#fca311' : s.zeus ? '#fff25a' : '#fff'); ctx.globalAlpha = 1; }
    if (s.stuck) { rect(x - 1, y - 1, 3, 3, (Math.floor(T_NOW * 20) % 2) ? '#fff' : c.mid); continue; }
    switch (s.kind) {
      case 'pellet': case 'shard': if (s.giant) { circ(x, y, 3, c.mid); px(x, y, c.core); break; } line(x, y, x - s.vx * 0.012, y - s.vy * 0.012, c.edge); rect(x - 1, y - 1, 2, 2, c.mid); px(x, y, c.core); break;
      case 'spud': { const f = Math.floor(s.t * 10) % 2; ellipse(x, y, 3, f ? 2 : 3, '#8a6a3a'); px(x - 1, y - 1, '#c8a060'); px(x + 1, y, '#5a4020'); break; }
      case 'present': { const b = Math.floor(s.t * 8) % 2; rect(x - 3, y - 3, 7, 7, '#05020c'); rect(x - 2, y - 2, 5, 5, b ? '#e8303a' : '#2fbf5a'); rect(x, y - 2, 1, 5, '#ffd84a'); rect(x - 2, y, 5, 1, '#ffd84a'); px(x - 1, y - 3, '#ffd84a'); px(x + 1, y - 3, '#ffd84a'); break; }
      case 'cane': { line(x, y, x - s.vx * 0.02, y - s.vy * 0.02, '#ffffff'); px(x, y, '#e8303a'); px(Math.round(x - s.vx * 0.01), Math.round(y - s.vy * 0.01), '#e8303a'); break; }
      case 'star': { const f = Math.floor(s.t * 24) % 2; if (f) { line(x - 3, y, x + 3, y, c.mid); line(x, y - 3, x, y + 3, c.mid); } else { line(x - 2, y - 2, x + 2, y + 2, c.mid); line(x - 2, y + 2, x + 2, y - 2, c.mid); } px(x, y, '#fff'); break; }
      case 'rocket': rect(x - 2, y - 2, 4, 4, c.edge); rect(x - 1, y - 1, 2, 2, c.core); break;
      case 'disc': { const f = Math.floor(s.t * 20) % 2; if (f) { rect(x - 3, y, 7, 1, c.mid); rect(x, y - 3, 1, 7, c.mid); } else { line(x - 2, y - 2, x + 2, y + 2, c.mid); line(x - 2, y + 2, x + 2, y - 2, c.mid); } px(x, y, c.core); break; }
      case 'wave': { ctx.strokeStyle = c.mid; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - Math.cos(s.ang) * 4, y - Math.sin(s.ang) * 4, 7, s.ang - 1, s.ang + 1); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = c.core; ctx.beginPath(); ctx.arc(x - Math.cos(s.ang) * 4, y - Math.sin(s.ang) * 4, 7, s.ang - 0.6, s.ang + 0.6); ctx.stroke(); break; }
      case 'prism': line(x, y, x - s.vx * 0.025, y - s.vy * 0.025, rainbow(T_NOW * 3, s.t * 500)); break;
      case 'slug': line(x, y, x - s.vx * 0.02, y - s.vy * 0.02, c.mid); line(x, y, x - s.vx * 0.008, y - s.vy * 0.008, c.core); break;
      default: { if (s.r >= 4) { ctx.globalAlpha = 0.3; circ(x, y, Math.floor(s.r) + 2, c.mid); ctx.globalAlpha = 1; circ(x, y, Math.floor(s.r), c.edge); circ(x, y, Math.max(1, Math.floor(s.r) - 1), c.mid); px(x, y, '#fff'); break; } drawBolt(x, y, s.vx, s.vy, s.kind === 'bolt' && s.r <= 2 ? 0.03 : 0.024, s.zeus ? { edge: '#fff25a', mid: '#fff', core: '#fff' } : c, s.t); }
    }
  }
  for (const s of w.eshots) { const x = s.x - ox, y = s.y - oy; const b = Math.floor(T_NOW * 12) % 2; rect(x - 2, y - 2, 4, 4, b ? '#fff' : s.col); rect(x - 1, y - 1, 2, 2, b ? s.col : '#fff'); }
  for (const m of w.mines) { const x = m.x - ox, y = m.y - oy; circ(x, y, 2, '#222'); const blink = m.t > m.arm + 0.3 && Math.floor(T_NOW * 6) % 2; px(x, y, blink ? '#fff' : m.col.mid); px(x - 3, y, '#555'); px(x + 3, y, '#555'); px(x, y - 3, '#555'); }
  for (const d of w.drones) { const x = d.x - ox, y = d.y - oy, c = w.player.W ? w.player.W.col : { mid: '#4ef' }; shadow(x, y + 9, 3, 1, 0.25); circ(x, y, 2, '#2a3150'); rect(x - 4, y - 3, 3, 1, '#9ab'); rect(x + 2, y - 3, 3, 1, '#9ab'); px(x, y, c.mid); }
  for (const z of w.zaps) { z.t += 1 / 60; let x0 = z.x0 - ox, y0 = z.y0 - oy; const x1 = z.x1 - ox, y1 = z.y1 - oy; const n = 5; for (let i = 1; i <= n; i++) { const k = i / n; const nx = lerp(z.x0 - ox, x1, k) + (i < n ? (R0() - 0.5) * 8 : 0), ny = lerp(z.y0 - oy, y1, k) + (i < n ? (R0() - 0.5) * 8 : 0); line(x0, y0, nx, ny, R0() < 0.5 ? '#fff' : z.col); x0 = nx; y0 = ny; } }
  w.zaps = w.zaps.filter(z => z.t < 0.12);
  for (const r of w.rails) { r.t += 1 / 60; const k = 1 - r.t / 0.3; ctx.globalAlpha = Math.max(0, k); ctx.strokeStyle = r.col.mid; ctx.lineWidth = r.wd + 2; ctx.beginPath(); ctx.moveTo(r.x0 - ox, r.y0 - oy); ctx.lineTo(r.x1 - ox, r.y1 - oy); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = r.wd; ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; }
  w.rails = w.rails.filter(r => r.t < 0.3);
  for (const sl of w.slashes) { sl.t += 1 / 60; const k = sl.t / 0.14; ctx.globalAlpha = 1 - k; ctx.strokeStyle = sl.col.core; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sl.x - ox, sl.y - oy, sl.R * (0.7 + k * 0.3), sl.a - 1.1 + k * 0.4, sl.a + 1.1 - k * 0.4); ctx.stroke(); ctx.strokeStyle = sl.col.mid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sl.x - ox, sl.y - oy, sl.R * (0.55 + k * 0.3), sl.a - 0.9, sl.a + 0.9); ctx.stroke(); ctx.globalAlpha = 1; }
  w.slashes = w.slashes.filter(s => s.t < 0.14);
  if (w.beam && w.player) {
    const pl = w.player, c = pl.W.col; const angs = w.beam.multi || [w.beam.a]; const lens = w.beam.lens || [w.beam.len || 0];
    angs.forEach((a, i) => {
      const L = lens[i] || 0; const x0 = pl.x + Math.cos(w.beam.a) * 10 - ox, y0 = pl.y - 6 + Math.sin(w.beam.a) * 10 - oy, x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      const wd = (w.beam.multi ? 1 : 2) + Math.floor(w.beam.heat * 3) + (Math.floor(T_NOW * 30) % 2);
      ctx.strokeStyle = w.beam.multi ? rainbow(T_NOW * 2, i * 120) : c.edge; ctx.lineWidth = wd + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = w.beam.multi ? rainbow(T_NOW * 2, i * 120 + 40) : c.mid; ctx.lineWidth = wd; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, wd - 2); ctx.stroke(); ctx.lineWidth = 1;
      circ(x1, y1, 2 + Math.floor(R0() * 2), '#fff');
    });
  }
}
function drawTele(w, ox, oy) {
  drawHazards(w, ox, oy); drawBossSys(w, ox, oy);
  for (const t of w.tele) {
    const k = t.t / t.max, blink = Math.floor(T_NOW * (8 + k * 16)) % 2;
    if (t.line) { if (t.dmg > 0 && t.wd) { ctx.globalAlpha = 0.15 + 0.25 * k; ctx.strokeStyle = t.col || '#ff3050'; ctx.lineWidth = t.wd; ctx.beginPath(); ctx.moveTo(t.x - ox, t.y - oy); ctx.lineTo(t.x + Math.cos(t.a) * t.len - ox, t.y + Math.sin(t.a) * t.len - oy); ctx.stroke(); ctx.lineWidth = 1; } ctx.globalAlpha = 0.5 + 0.4 * blink; for (let d = 0; d < t.len; d += 4) px(t.x + Math.cos(t.a) * d - ox, t.y + Math.sin(t.a) * d - oy, '#ff3050'); ctx.globalAlpha = 1; continue; }
    const x = t.x - ox, y = t.y - oy;
    ctx.globalAlpha = 0.18 + 0.2 * k; ellipse(x, y, t.r, Math.floor(t.r * 0.6), '#ff2040'); ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.6 + 0.4 * blink; ctx.strokeStyle = '#ff5060'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, t.r, t.r * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, t.r * k, t.r * 0.6 * k, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (t.meteor) { const hh = (1 - k) * 120; rect(x - 2, y - hh - 2, 4, 4, '#ffcb3d'); rect(x - 1, y - hh - 10, 2, 8, 'rgba(255,120,40,0.6)'); }
  }
}
const ARMOR_MASK = new WeakMap();
function armorMasks(spr) { let m = ARMOR_MASK.get(spr); if (!m) { m = [maskOf(spr, '#9aa3c0'), maskOf(spr, '#dfe4f5')]; ARMOR_MASK.set(spr, m); } return m; }
function drawEnemy(w, e, ox, oy) {
  const x = Math.floor(e.x - ox), y = Math.floor(e.y - oy);
  if (e.nest) { drawNest(e, x, y); return; }
  if (e.dummy) { drawDummy(e, x, y); return; }
  const fr = Math.floor(e.t * (e.arch === 'swarm' ? 10 : 6)) % 2;
  if (e.under) { drawBurrowMound(e, x, y); return; }
  if (e.boss && e.hidden) { drawHiddenBoss(w, e, x, y); return; }
  if (e.part || e.clone) { drawPart(w, e, x, y); return; }
  const spr = e.boss ? (e.kit ? kitBossSprite(w.pi, fr, e.flash > 0) : bossSprite(w.pi, fr, e.flash > 0)) : alienSprite(w.pi, e.arch, fr, e.flash > 0);
  const sc = e.elite ? 2 : e.big ? 1.35 : 1;
  const sw = spr.width * sc, sh = spr.height * sc;
  shadow(x, y + 1, Math.floor(sw * 0.35), Math.max(2, Math.floor(sw * 0.12)), 0.35);
  if (e.carrier) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(T_NOW * 8); ellipse(x, y - sh / 2, sw * 0.8, sh * 0.6, COL.gold); ctx.globalAlpha = 1; }
  if (e.elite) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 5); ellipse(x, y - sh / 2, sw * 0.7, sh * 0.55, COL.pink); ctx.globalAlpha = 1; }
  if (e.boss && e.coreT > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(T_NOW * 14); ellipse(x, y - sh / 2, sw * 0.7, sh * 0.6, COL.gold); ctx.globalAlpha = 1; }
  const bob = (e.arch === 'swarm' || e.arch === 'orbiter' || e.arch === 'healer' ? Math.floor(Math.sin(e.t * 8) * 2) - 3 : 0) - Math.round(e.hop || 0);
  const winding = (e.st === 'wind' || e.windup) && !(e.stun > 0);
  ctx.save(); ctx.translate(x, y + bob);
  if (e.face < 0) ctx.scale(-1, 1);
  if (e.flash > 0 && !e.boss) ctx.scale(1.14, 0.88);
  if (winding && Math.floor(T_NOW * 30) % 2) ctx.translate(1, 0);
  ctx.drawImage(spr, -Math.floor(sw / 2), -sh + 2, sw, sh);
  if (winding && Math.floor(T_NOW * 12) % 2) { ctx.globalAlpha = 0.55; ctx.drawImage(maskOf(spr, '#fff2a0'), -Math.floor(sw / 2), -sh + 2, sw, sh); ctx.globalAlpha = 1; }
  if (e.armored && !e.boss && !(e.stun > 0)) {   // a steel shell over the front half that follows the body's outline
    const fx0 = Math.floor(sw * 0.05), fw = Math.ceil(sw / 2) - fx0;
    ctx.save(); ctx.beginPath(); ctx.rect(fx0, -sh + 2, fw, sh); ctx.clip();
    const am = armorMasks(spr);
    ctx.globalAlpha = 0.8; ctx.drawImage(am[1], -Math.floor(sw / 2) + 1, -sh + 1, sw, sh); ctx.globalAlpha = 0.6; ctx.drawImage(am[0], -Math.floor(sw / 2), -sh + 2, sw, sh);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (e.freeze > 0) { ctx.globalAlpha = 0.5; rect(x - sw / 2, y - sh + 2, sw, sh - 2, '#9fefff'); ctx.globalAlpha = 1; }
  if (e.boss && e.kit) drawBossExtra(w, e, x, y); else drawFoeExtra(w, e, x, y, sh);
  if (winding) { const by = y - sh - 10 + Math.round(Math.sin(T_NOW * 16)); rect(x - 1, by, 3, 6, '#fff2a0'); rect(x - 1, by + 7, 3, 2, '#fff2a0'); if (e.boss || e.elite) text('HIT IT!', x, by - 8, '#fff2a0', FS, 1); }
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = T_NOW * 6 + i * TAU / 3; px(x + Math.cos(a) * (sw * 0.4 + 2), y - sh - 2 + Math.sin(a) * 2, i ? COL.gold : '#fff'); }
  // status pips
  const st = []; if (e.burn > 0) st.push('#ff9a3d'); if ((e.chill || 0) > 0.2 || e.freeze > 0) st.push('#7fe9ff'); if (e.poison > 0) st.push('#8cff3a'); if (e.shock > 0) st.push('#fff25a'); if (e.vmark > 0) st.push('#b45cff'); if (e.corrode > 0) st.push('#c8ff8a'); if (e.steam > 0) st.push('#e5e5e5');
  st.forEach((c, i) => rect(x - st.length * 2 + i * 4, y + 3, 3, 2, c));
  if (e.carrier) { const by = y - sh - 12 + Math.round(Math.sin(T_NOW * 4) * 1.5); miniCrate(x - 6, by, RUN ? RUN.haulTier : 0); bar(x - 10, by + 12, 20, 2, e.hp / e.maxHp, COL.gold, '#300'); }
  else if (e.elite) { text(e.name || 'ELITE', x, y - sh - 14, COL.pink, FS, 1); bar(x - 18, y - sh - 6, 36, 3, e.hp / e.maxHp, COL.pink, '#300'); }
  else if (!e.boss && e.hp < e.maxHp) { bar(x - 7, y - sh - 1, 14, 2, e.hp / e.maxHp, '#ff5468', '#300'); }
}
function cosmeticAura(fx, x, y, eq) {
  for (const [sl, oy] of [['eyewear', 20], ['headgear', 26], ['back', 14]]) {
    const id = eq[sl]; if (!id || !S.inv[id]) continue; const L = S.inv[id].l; if (L < 3) continue;
    const ch = L >= 10 ? 0.22 : L >= 6 ? 0.12 : 0.05; if (R0() > ch) continue;
    const pal = itemPal(getDef(id)); const c = L >= 10 ? rainbow(T_NOW, R0() * 360) : hex(pal.G[3]);
    fx.add({ x: x + (R0() - 0.5) * 12, y: y - oy + (R0() - 0.5) * 6, vx: (R0() - 0.5) * 8, vy: -10 - R0() * 10, life: 0.7, c, s: 1, t: L >= 6 ? 'px' : 'fade' });
  }
}
// ---------- player ----------
function makePlayer(x, y, L) {
  const sa = L.setAb || {}; const ch = (L.perks.double ? 2 : 1) + (sa[5] || 0);
  return { x, y, vx: 0, vy: 0, r: 5, hp: L.hp, maxHp: L.hp, armor: L.armor, aim: 0, dir: 0, walk: 0, moving: false, fireCd: 0, boostCd: 0, boostT: 0, charges: ch, maxCharges: ch, inv: 0, mode: 'weapon', charge: 0, heat: 0, perks: L.perks, recoil: 0, hurtT: 0, sprintT: 0, setAb: sa, focusT: 0, shadowT: 0, solarT: 0, wi: 0 };
}
function updatePlayer(w, pl, inp, dt, L) {
  pl.inv -= dt; pl.hurtT -= dt; pl.recoil = Math.max(0, pl.recoil - dt * 20); if (pl.kickX) { const d = Math.pow(0.0005, dt); pl.kickX *= d; pl.kickY *= d; }
  if (pl.focusT > 0) pl.focusT -= dt; if (pl.shadowT > 0) pl.shadowT -= dt;
  const sa = pl.setAb || {};
  if (sa[9] && !pl.solarReady) { pl.solarT += dt; if (pl.solarT >= (sa[9] > 1 ? 2.5 : 4)) { pl.solarReady = true; w.fx.text(pl.x, pl.y - 30, 'FLARE READY', '#fca311', { f: FS, life: 0.6 }); } }
  pl.aim = Math.atan2(inp.ay - (pl.y - 6), inp.ax - pl.x);
  let mx = inp.mx, my = inp.my; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  if (pl.rootT > 0) { pl.rootT -= dt; mx = 0; my = 0; if (R0() < 0.3) w.fx.add({ x: pl.x + (R0() - 0.5) * 12, y: pl.y - 10 + (R0() - 0.5) * 14, life: 0.3, c: '#7fe9ff', s: 1 }); }
  pl.moving = ml > 0.1;
  const neon = sa[10] && w.combo >= 12 ? (sa[10] > 1 ? 1.25 : 1.15) : 1;
  const spd = L.speed * (w.moveMul || 1) * (pl.sprintT > 0 ? 1.35 : 1) * neon * (pl.slowT > 0 ? 0.5 : 1); pl.sprintT -= dt; if (pl.slowT > 0) pl.slowT -= dt;
  const cdMul = sa[5] ? 0.75 : 1;
  pl.boostCd -= dt; if (pl.boostCd <= 0 && pl.charges < pl.maxCharges) { pl.charges++; pl.boostCd = pl.charges < pl.maxCharges ? L.boostCd * cdMul : 0; }
  if (inp.boost && pl.charges > 0 && pl.boostT <= 0) {
    pl.charges--; if (pl.boostCd <= 0) pl.boostCd = L.boostCd * cdMul;
    pl.boostT = 0.22; pl.pdDone = false; const ba = pl.moving ? Math.atan2(my, mx) : pl.aim; pl.bvx = Math.cos(ba) * 290 * L.boostPow; pl.bvy = Math.sin(ba) * 290 * L.boostPow;
    if (!w.demo) { SND.play('boost'); shake(1.5); }
    if (sa[0]) explode(w, pl.x, pl.y - 4, sa[0] > 1 ? 56 : 42, (pl.W ? pl.W.dmg : 10) * (sa[0] > 1 ? 2.4 : 1.5), { core: '#fff', mid: '#9fd6ff', edge: '#7161ef', dark: '#14213d' });
    if (sa[1]) pl.shadowT = (sa[1] > 1 ? 2.5 : 1.5) + 0.22;
  }
  if (pl.boostT > 0) {
    pl.boostT -= dt; pl.vx = pl.bvx; pl.vy = pl.bvy;
    for (let i = 0; i < 3; i++) w.fx.add({ x: pl.x - Math.cos(Math.atan2(pl.bvy, pl.bvx)) * 6 + (R0() - 0.5) * 4, y: pl.y - 6 + (R0() - 0.5) * 4, vx: -pl.bvx * 0.2 + (R0() - 0.5) * 30, vy: -pl.bvy * 0.2 + (R0() - 0.5) * 30, life: 0.3, c: R0() < 0.5 ? '#fca311' : '#ff7a2e', s: 2, t: 'shrink' });
    if (pl.perks.blastoff || sa[2]) for (const e of w.ents) if (!e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < e.r + 9 && !(e.boostHit > w.t)) { e.boostHit = w.t + 0.3; damageEnemy(w, e, (pl.W ? pl.W.dmg : 10) * 2, {}); if (sa[2] && !e.boss) { e.stun = Math.max(e.stun || 0, sa[2] > 1 ? 2 : 1.2); e.kx += pl.bvx * 0.8; e.ky += pl.bvy * 0.8; w.fx.text(e.x, e.y - 16, 'BONK', COL.gold, { f: FS, life: 0.5 }); } }
    if (sa[6] && R0() < 0.7 && w.hazards.length < 70) w.hazards.push({ x: pl.x, y: pl.y + 2, r: 9, t: sa[6] > 1 ? 3 : 2, dps: (pl.W ? pl.W.dmg : 10) * 1.2, el: 'plasma', col: '#ff9a3d', kind: 'fire' });
  } else {
    const acc = w.slippery ? 4 : 18;
    pl.vx = lerp(pl.vx, mx * spd, Math.min(1, acc * dt)); pl.vy = lerp(pl.vy, my * spd, Math.min(1, acc * dt));
  }
  pl.x += pl.vx * dt; pl.y += pl.vy * dt;
  if (w.bw && w.bw.wind) { const wd = w.bw.wind, wdx = wd.x - pl.x, wdy = wd.y - pl.y, wdd = Math.hypot(wdx, wdy) || 1; pl.x += wdx / wdd * wd.str * dt; pl.y += wdy / wdd * wd.str * dt; }
  if (w.collide) w.collide(pl);
  if (w.bounds) { pl.x = clamp(pl.x, w.bounds[0], w.bounds[2]); pl.y = clamp(pl.y, w.bounds[1], w.bounds[3]); }
  if (pl.moving) pl.walk += dt * 9;
  const ca = Math.cos(pl.aim), sa2 = Math.sin(pl.aim);
  pl.dir = Math.abs(ca) > Math.abs(sa2) * 0.9 ? (ca < 0 ? 2 : 3) : (sa2 < 0 ? 1 : 0);
  if (pl.perks.regen && !w.demo) pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.008 * dt);
  if (pl.G && pl.G.cd > 0) pl.G.cd -= dt;
  petTick(w, pl, dt);
  if (pl.perks.sparks && pl.moving && R0() < dt * 3) { const tg = nearestEnemy(w, pl.x, pl.y, 30); if (tg) chainZap(w, { x: pl.x, y: pl.y }, (pl.W ? pl.W.dmg : 8) * 0.5, 1, { mid: '#fff25a' }); }
}
function drawPlayer(w, pl, ox, oy, eq, opt = {}) {
  const x = Math.floor(pl.x - ox), y = Math.floor(pl.y - oy);
  const fr = pl.moving ? 1 + (Math.floor(pl.walk) % 3) : 0;
  const spr = astroSprite(eq, pl.dir, fr === 2 ? 0 : fr);
  shadow(x, y, 6, 2, 0.4);
  if (pl.focusT > 0) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(T_NOW * 16); ellipse(x, y - 12, 12, 15, COL.gold); ctx.globalAlpha = 1; }
  if (pl.solarReady) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 8); circ(x, y - 12, 13, '#fca311'); ctx.globalAlpha = 1; }
  const drawGun = () => {
    if (opt.noGun) return;
    const id = pl.mode === 'tool' ? eq.tool : eq.weapon; if (!id) return;
    const skin = pl.mode === 'tool' ? eq.skin_tool : eq.skin_weapon;
    const s = pl.mode === 'tool' ? (skin ? getSkinnedSpr(id, skin) : getItemSpr(id)) : getHeldSpr(id, skin);
    const img = frameOf(s); if (pl.mode !== 'tool') pl.gunLen = s.w;
    const a = pl.aim, flip = Math.cos(a) < 0;
    ctx.save(); ctx.translate(x + Math.cos(a) * (3 - pl.recoil), y - 8 + Math.sin(a) * 3); ctx.rotate(a); if (flip) ctx.scale(1, -1);
    ctx.drawImage(img, pl.mode === 'tool' ? -4 : -3, -Math.floor(s.h / 2));
    ctx.restore();
  };
  const behind = pl.dir === 1;
  if (pl.pet && pl.petY !== undefined && pl.petY < pl.y) drawPetWorld(w, pl, ox, oy);
  if (behind) drawGun();
  if ((pl.inv > 0 && Math.floor(T_NOW * 20) % 2) || pl.shadowT > 0) ctx.globalAlpha = pl.shadowT > 0 ? 0.35 : 0.5;
  ctx.drawImage(spr, x - 10, y - 25);
  ctx.globalAlpha = 1;
  if (pl.hurtT > 0) { ctx.globalAlpha = 0.6; ctx.drawImage(maskOf(spr, '#ff3050'), x - 10, y - 25); ctx.globalAlpha = 1; }
  if (!behind) drawGun();
  if (w.fx) cosmeticAura(w.fx, pl.x, pl.y, eq);
  if (pl.pet && pl.petY !== undefined && pl.petY >= pl.y) drawPetWorld(w, pl, ox, oy);
  if (pl.charge > 0 && pl.W) { const k = pl.charge / 1.2; const full = k >= 1; ring(x + Math.cos(pl.aim) * 14, y - 8 + Math.sin(pl.aim) * 14, Math.floor(2 + k * 4), full ? (Math.floor(T_NOW * 20) % 2 ? '#fff' : COL.gold) : pl.W.col.mid); }
}
function stat(w, k, n = 1) { if (w.demo || w.practice || typeof S === 'undefined' || !S || !S.stats) return; S.stats[k] = (S.stats[k] || 0) + n; }
const PLASMA_COL = { core: '#fff2a0', mid: '#ff9a3d', edge: '#ff5a1e', dark: '#802000' }, ICE_COL = { core: '#ffffff', mid: '#bff6ff', edge: '#7fe9ff', dark: '#2a6a8a' }, ARC_COL = { core: '#fffbd0', mid: '#fff25a', edge: '#c8a800' }, VOID_COL = { core: '#f0d0ff', mid: '#b45cff', edge: '#6a20c0', dark: '#2a0050' }, TOX_COL = { core: '#e8ffb0', mid: '#8cff3a', edge: '#3a9a10' };
function beamCast(w, pl, W, a, dt, mul) {
  const x0 = pl.x + Math.cos(a) * 10, y0 = pl.y - 6 + Math.sin(a) * 10; const heatMul = (1 + 1.5 * (pl.heat || 0)) * mul;
  let pierce = W.v.pierce ? W.v.pierce + 1 : 0; const hit = new Set(); let L = W.rng;
  for (let d = 0; d < W.rng; d += 3) {
    const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
    if (w.solid(x, y)) { L = d; break; }
    let stop = false;
    for (const p of w.props) if (!p.dead && p.shoot && Math.hypot(p.x - x, p.y - (p.cy || 4) - y) < p.r + 2) { hitProp(w, p, W.dmg * heatMul * dt, W.el ? W.el[0] : null); L = d; stop = true; break; }
    if (stop) break;
    for (const e of w.ents) { if (e.dead || hit.has(e)) continue; if (Math.hypot(e.x - x, e.y - y) < e.r + 3) { hit.add(e); hitEnemy(w, e, W.dmg * heatMul * dt, { W, x, y, beam: true, quiet: true, dx: Math.cos(a) }); if (pierce-- <= 0) { L = d; d = 1e9; break; } } }
  }
  const ex = x0 + Math.cos(a) * L, ey = y0 + Math.sin(a) * L;
  if (R0() < 0.8) w.fx.add({ x: ex, y: ey, vx: (R0() - 0.5) * 80, vy: (R0() - 0.5) * 80, life: 0.2, c: W.col.core, s: 1, t: 'spark' });
  return L;
}
function staggerEnemy(w, e) {
  e.windDmg = 0; e.windup = false; e.st = e.boss ? 'idle' : 'move'; e.st_t = 0; e.cd = Math.max(e.cd || 0, 1.5);
  e.stun = e.boss ? 2.4 : e.elite ? 2 : 1.6; if (e.boss) { e.coreT = 2.4; e.pt = 0; }
  w.fx.text(e.x, e.y - e.r - 20, e.boss ? 'STAGGERED! CORE EXPOSED' : 'STAGGERED!', COL.gold, { f: FB, life: 1 });
  w.fx.add({ x: e.x, y: e.y - e.r, vx: 0, vy: 0, life: 0.35, c: COL.gold, s: e.r * 2 + 6, t: 'ring' });
  wsnd(w, 'stamp'); if (!w.demo) { shake(4); FX.hitstop = Math.max(FX.hitstop, 0.07); }
  stat(w, 'staggers');
}
function statusOf(e) { const s = []; if (e.freeze > 0 || (e.chill || 0) > 0.3) s.push('cryo'); if (e.burn > 0) s.push('plasma'); if (e.poison > 0) s.push('toxin'); if (e.shock > 0) s.push('arc'); if (e.vmark > 0) s.push('void'); return s; }
function discoverReaction(w, k) {
  if (w.demo || !S || !S.reactions || S.reactions[k]) return; S.reactions[k] = 1; dirty();
  toast('NEW REACTION FOUND: ' + REACTIONS[k].n, COL.gold); SND.play('fanfare');
  if (typeof RUN !== 'undefined' && RUN && RUN.w === w) banner(`NEW REACTION: ${REACTIONS[k].n}! ${REACTIONS[k].txt}`, COL.gold);
}
function doReaction(w, e, k, dmg, W) {
  const R = REACTIONS[k]; const base = Math.max(dmg, W.dmg || dmg);
  w.fx.text(e.x, e.y - e.r - 18, R.n + '!', R.c, { f: FB, life: 1.1 });
  w.fx.add({ x: e.x, y: e.y - 4, vx: 0, vy: 0, life: 0.4, c: R.c, s: 26, t: 'ring' });
  switch (k) {
    case 'shatter': e.freeze = 0; e.chill = 0; damageEnemy(w, e, base * 3, { crit: true });
      for (let i = 0; i < 6; i++) { const s = makeShot(w, w.player, W, i / 6 * TAU + 0.3, { kind: 'shard', spd: 200, rng: 70, r: 2, dmg: base * 0.6, child: true, noVerbs: true }); s.x = e.x; s.y = e.y - 4; s.col = ICE_COL; s.el = null; s.hits.add(e); }
      wsnd(w, 'freeze'); break;
    case 'steam': e.burn = 0; w.clouds.push({ x: e.x, y: e.y, r: 48, t: 3.5, max: 3.5 }); wsnd(w, 'beam'); break;
    case 'combust': e.poison = 0; explode(w, e.x, e.y, 42, base * 2.2, PLASMA_COL); break;
    case 'overload': { for (const o of w.ents) if (!o.dead && o !== e && ((o.chill || 0) > 0 || o.freeze > 0) && Math.hypot(o.x - e.x, o.y - e.y) < 170) { w.zaps.push({ x0: e.x, y0: e.y - 3, x1: o.x, y1: o.y - 3, t: 0, col: '#fff25a' }); damageEnemy(w, o, base * 1.3, { quiet: true, col: '#fff25a' }); o.stun = Math.max(o.stun || 0, 0.6); } damageEnemy(w, e, base * 1.3, { col: '#fff25a' }); wsnd(w, 'zap'); break; }
    case 'nerve': for (const o of w.ents) if (!o.dead && o.poison > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 110) { o.stun = Math.max(o.stun || 0, 1.5); w.zaps.push({ x0: e.x, y0: e.y - 3, x1: o.x, y1: o.y - 3, t: 0, col: '#c8ff8a' }); } wsnd(w, 'zap'); break;
    case 'singular': w.pulls.push({ x: e.x, y: e.y, r: 85, str: 240, t: 0.8, col: '#b45cff' });
      for (const o of w.ents) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 85) { if (e.burn > 0) { o.burn = 2; o.burnDps = e.burnDps; } if (e.poison > 0) { o.poison = 3; o.poisonDps = e.poisonDps; } if ((e.chill || 0) > 0) o.chill = (o.chill || 0) + 0.5; }
      wsnd(w, 'warp'); break;
    case 'lightshow': for (let i = 0; i < 6; i++) { const s = makeShot(w, w.player, W, i / 6 * TAU, { kind: 'prism', spd: 300, rng: 120, r: 2, dmg: base * 0.8, child: true, noVerbs: true }); s.x = e.x; s.y = e.y - 4; s.pierce = 4; s.el = null; s.hits.add(e); } wsnd(w, 'zap'); break;
    case 'corrode': e.corrode = 5; break;
  }
  if (!w.demo) shake(2);
  stat(w, 'reactions'); discoverReaction(w, k);
}
function hitProp(w, p, dmg, el) {
  if (p.dead || !p.shoot) return false;
  p.hp -= dmg; p.flash = 0.08;
  if (p.kind !== 'pod') w.fx.text(p.x + (R0() - 0.5) * 6, p.y - (p.cy || 6) - 8, fmt(Math.max(1, dmg)), '#dec0f1', { f: FS, life: 0.5, vy: -30 });
  if (p.hp <= 0) { p.dead = true; if (p.kind === 'pod') podBlast(w, p, el); else w.fx.burst(p.x, p.y - 4, 16, { c: [p.col || '#9aa', '#fff'], sp: 100, life: 0.5, s: 2, t: 'shrink' }); w.onProp(p, el); }
  return true;
}
function podBlast(w, p, el) {
  const dmg = 45 * (w.hpMul || 1); const k = { plasma: 'fireball', cryo: 'icebomb', arc: 'stormpod', toxin: 'gaspod' }[el] || null;
  switch (k) {
    case 'fireball': explode(w, p.x, p.y, 64, dmg * 1.8, PLASMA_COL, 'pod'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.hazards.push({ x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 18, r: 11, t: 3, dps: dmg * 0.5, el: 'plasma', col: '#ff9a3d', kind: 'fire' }); } break;
    case 'icebomb': explode(w, p.x, p.y, 40, dmg * 0.6, ICE_COL, 'pod'); for (const e of w.ents) if (!e.dead && !e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 80) { e.freeze = 2.8; e.chill = 0.6; } wsnd(w, 'freeze'); break;
    case 'stormpod': explode(w, p.x, p.y, 40, dmg * 0.7, ARC_COL, 'pod'); for (const e of w.ents) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 100) { w.zaps.push({ x0: p.x, y0: p.y - 4, x1: e.x, y1: e.y - 3, t: 0, col: '#fff25a' }); damageEnemy(w, e, dmg, { quiet: true, src: 'pod', col: '#fff25a' }); e.shock = 2; e.stun = Math.max(e.stun || 0, 0.8); } break;
    case 'gaspod': explode(w, p.x, p.y, 30, dmg * 0.5, TOX_COL, 'pod'); w.clouds.push({ x: p.x, y: p.y, r: 60, t: 4.5, max: 4.5, toxic: true, dps: dmg * 0.5 }); break;
    default: explode(w, p.x, p.y, 46, dmg, { core: '#fff', mid: '#ff5c9a', edge: '#c0306a', dark: '#400020' }, 'pod');
  }
  if (k) { w.fx.text(p.x, p.y - 26, REACTIONS[k].n + '!', REACTIONS[k].c, { f: FB, life: 1.1 }); stat(w, 'reactions'); discoverReaction(w, k); }
}
function pinball(s) { s.spd = Math.min(520, s.spd * 1.15); s.dmg *= 1.15; s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd; s.life = Math.max(s.life, 0.6); }
function fireAt(w, x, y, dmg) { if (w.hazards.length < 70) w.hazards.push({ x, y: y + 4, r: 8, t: 2, dps: dmg * 1.2, el: 'plasma', col: '#ff9a3d', kind: 'fire' }); }
function multiplyDisc(w, s) { s.mult = true; for (const da of [-0.5, 0.5]) { const c = Object.assign({}, s, { hits: new Set(), ang: s.ang + da, copy: true, mult: true }); c.vx = Math.cos(c.ang) * c.spd; c.vy = Math.sin(c.ang) * c.spd; w.shots.push(c); } }
function blackHole(w, s) {
  w.pulls.push({ x: s.x, y: s.y, r: 90, str: 260, t: 1.4, col: '#b45cff' });
  w.strikes.push({ x: s.x, y: s.y, t: 0, max: 1.4, r: 60, dmg: s.dmg * 2.2, col: VOID_COL, hole: true });
  w.fx.add({ x: s.x, y: s.y, vx: 0, vy: 0, life: 1.4, c: '#b45cff', s: 30, t: 'ring' }); wsnd(w, 'warp');
}
function updateHazards(w, dt) {
  for (const h of w.hazards) {
    h.t -= dt; h.tick = (h.tick || 0) - dt;
    if (h.tick <= 0) { h.tick = 0.25; for (const e of w.ents) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r) { damageEnemy(w, e, h.dps * 0.25, { quiet: true, col: h.col }); if (h.el === 'plasma' && !e.dead) { e.burn = Math.max(e.burn, 1); e.burnDps = Math.max(e.burnDps || 0, h.dps * 0.2); } if (h.el === 'void' && !e.dead) e.vmark = 1; } }
    if (R0() < 0.25) w.fx.add({ x: h.x + (R0() - 0.5) * h.r * 1.6, y: h.y - 2, vx: 0, vy: -18 - R0() * 12, life: 0.35, c: R0() < 0.5 ? h.col : (h.kind === 'rift' ? '#f0d0ff' : '#fff2a0'), s: 1 });
  }
  w.hazards = w.hazards.filter(h => h.t > 0); if (w.hazards.length > 80) w.hazards.splice(0, w.hazards.length - 80);
  for (const c of w.clouds) { c.t -= dt; for (const e of w.ents) if (!e.dead && Math.hypot(e.x - c.x, e.y - c.y) < c.r) { if (c.toxic) { e.poison = Math.max(e.poison, 1); e.poisonDps = Math.max(e.poisonDps || 0, c.dps || 3); } else { e.steam = 0.5; e.slow = Math.max(e.slow, 0.3); } } }
  w.clouds = w.clouds.filter(c => c.t > 0);
  for (const s of w.strikes) { s.t += dt; if (s.t >= s.max && !s.done) { s.done = true; explode(w, s.x, s.y, s.r, s.dmg, s.col); if (s.hole) { w.fx.burst(s.x, s.y, 30, { c: ['#b45cff', '#fff', '#000'], sp: 200, life: 0.6, s: 2, t: 'shrink' }); shake(5); } } }
  w.strikes = w.strikes.filter(s => !s.done);
  if (w.decoy) { w.decoy.t -= dt; if (w.decoy.t <= 0) w.decoy = null; }
  const pl = w.player; const ha = pl && pl.setAb && pl.setAb[11];
  if (ha && !pl.dead) {
    const n = ha > 1 ? 3 : 2; w.halo = [];
    for (let i = 0; i < n; i++) { const a = w.t * 3 + i * TAU / n; const x = pl.x + Math.cos(a) * 22, y = pl.y - 6 + Math.sin(a) * 14; w.halo.push({ x, y }); for (const e of w.ents) if (!e.dead && Math.hypot(e.x - x, e.y - 4 - y) < e.r + 4 && !(e.haloHit > w.t)) { e.haloHit = w.t + 0.4; damageEnemy(w, e, (pl.W ? pl.W.dmg : 10) * 0.6, { quiet: true, col: '#fff2a0' }); } }
  } else w.halo = null;
  if (w.tempDrones > 0) { w.tempDroneT -= dt; if (w.tempDroneT <= 0) w.tempDrones = 0; }
}
function drawHazards(w, ox, oy) {
  for (const c of w.clouds) { const k = Math.min(1, c.t / 0.6); const x = c.x - ox, y = c.y - oy; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + T_NOW * 0.4; ctx.globalAlpha = 0.18 * k; ellipse(x + Math.cos(a) * c.r * 0.5, y + Math.sin(a) * c.r * 0.3, Math.floor(c.r * 0.45), Math.floor(c.r * 0.28), c.toxic ? '#8cff3a' : '#e5e5e5'); } ctx.globalAlpha = 1; }
  for (const h of w.hazards) { const x = h.x - ox, y = h.y - oy; const k = Math.min(1, h.t / 0.5); const fl = Math.floor(T_NOW * 12 + h.x) % 2; ctx.globalAlpha = 0.45 * k; ellipse(x, y, h.r, Math.floor(h.r * 0.55), h.col); ctx.globalAlpha = 0.8 * k; ellipse(x, y, Math.floor(h.r * 0.55), Math.floor(h.r * 0.3), fl ? '#fff2a0' : h.col); ctx.globalAlpha = 1; }
  for (const s of w.strikes) { const k = s.t / s.max; const x = s.x - ox, y = s.y - oy; if (s.hole) { const r = 6 + 10 * Math.sin(k * Math.PI); circ(x, y - 4, Math.floor(r), '#000'); ring(x, y - 4, Math.floor(r) + 1, '#b45cff'); continue; } ctx.globalAlpha = 0.3 + 0.3 * k; ctx.strokeStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, s.r * k, s.r * 0.6 * k, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; const hh = (1 - k) * 140; rect(x - 2 + hh * 0.3, y - hh - 2, 5, 5, '#ffcb3d'); rect(x - 1 + hh * 0.3 + 2, y - hh - 10, 2, 8, 'rgba(255,120,40,0.7)'); }
  if (w.decoy) { const d = w.decoy; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(T_NOW * 10); ctx.drawImage(maskOf(astroSprite(S.eq, 0, 0), '#b79ced'), Math.floor(d.x - ox - 10), Math.floor(d.y - oy - 25)); ctx.globalAlpha = 1; }
  if (w.halo) for (const o of w.halo) { circ(o.x - ox, o.y - oy, 2, '#fff2a0'); px(o.x - ox, o.y - oy, '#fff'); if (R0() < 0.3) w.fx.add({ x: o.x, y: o.y, vx: 0, vy: 0, life: 0.25, c: '#fff2a0', s: 1 }); }
  drawGadgetFx(w, ox, oy);
}
function perfectDodge(w, pl) {
  pl.pdDone = true; pl.lastPD = w.t; pl.focusT = 2.5; FX.slowmo = Math.max(FX.slowmo || 0, 0.5); pl.charges = Math.min(pl.maxCharges, pl.charges + 1);
  w.fx.text(pl.x, pl.y - 34, 'PERFECT DODGE!', COL.gold, { f: FB, life: 1 }); w.fx.add({ x: pl.x, y: pl.y - 8, vx: 0, vy: 0, life: 0.45, c: '#fff', s: 26, t: 'ring' });
  SND.play('upgradeHint'); flash(0.12, '#fff');
  stat(w, 'perfects');
  const sa = pl.setAb || {}; if (sa[3]) w.decoy = { x: pl.x, y: pl.y, t: sa[3] > 1 ? 4 : 2.5 };
}
function drawNest(e, x, y) {
  const pulse = Math.sin(T_NOW * 4 + e.x) * 1.5; const r = 10 + pulse;
  shadow(x, y + 1, 14, 4, 0.4);
  ellipse(x, y - 6, Math.floor(r + 2), Math.floor(r * 0.8), '#2a0a20'); ellipse(x, y - 6, Math.floor(r), Math.floor(r * 0.75), e.flash > 0 ? '#fff' : e.col);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + e.t * 0.5; circ(x + Math.cos(a) * r * 0.55, y - 6 + Math.sin(a) * r * 0.4, 2, e.col2); }
  circ(x, y - 7, 3, '#fff2a0'); px(x, y - 8, '#fff');
  bar(x - 12, y - 22, 24, 3, e.hp / e.maxHp, COL.coral, '#300');
}
function drawDummy(e, x, y) {
  shadow(x, y + 1, 10, 3, 0.4);
  rect(x - 1, y - 6, 3, 7, '#6b5a48'); rect(x - 6, y - 26, 13, 20, e.flash > 0 ? '#fff' : '#d6bfb2'); rect(x - 5, y - 25, 11, 18, e.flash > 0 ? '#fff' : '#efd9ce');
  ring(x, y - 16, 4, COL.coral); ring(x, y - 16, 2, COL.coral); px(x, y - 16, COL.coral);
  text('DUMMY', x, y - 34, COL.cream, FS, 1);
}

// a shot through a prism splits into 2 (3 with the prism shard)
function prismSplit(w, s, p) {
  if (s.prismed) return; const n = hasRelic(15) ? 3 : 2; p.flash = 0.1;
  w.fx.burst(s.x, s.y, 8, { c: ['#c77dff', '#fff', '#7fe9ff'], sp: 90, life: 0.3 });
  for (let i = 0; i < n; i++) { const a = s.ang + (i - (n - 1) / 2) * 0.32; const c = Object.assign({}, s, { hits: new Set([p]), ang: a, prismed: true, dmg: s.dmg * 0.8, life: Math.max(s.life, 0.6) }); c.vx = Math.cos(a) * s.spd; c.vy = Math.sin(a) * s.spd; w.shots.push(c); }
  s.dead = true;
}

// the Sleighbreaker's present bursts into eight candy canes that freeze what they hit
const CANE_COL = { core: '#ffffff', mid: '#ff4060', edge: '#ffd0d8', dark: '#801020' };
function presentBurst(w, s) {
  if (s.burst) return; s.burst = true;
  const W = s.W || wStatsLike(s);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + (s.ang || 0); const c = makeShot(w, w.player, W, a, { kind: 'cane', spd: 230, rng: 95, r: 2, dmg: s.dmg * 0.45, child: true, noVerbs: true }); c.x = s.x; c.y = s.y; c.el = ['cryo', 1.6]; c.col = CANE_COL; c.pierce = 1; if (s.hits) c.hits = new Set(s.hits); }
  w.fx.burst(s.x, s.y, 18, { c: ['#e8303a', '#2fbf5a', '#ffd84a', '#ffffff'], sp: 120, life: 0.6, s: 2, t: 'shrink' });
  for (let i = 0; i < 6; i++) w.fx.add({ x: s.x, y: s.y, vx: (R0() - 0.5) * 60, vy: -20 - R0() * 40, life: 1.2, c: '#ffffff', s: 1, g: 20, drag: 1 });
  wsnd(w, 'freeze');
}
