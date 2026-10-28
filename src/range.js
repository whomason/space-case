// ===== TEST RANGE: take new loot for a spin right away =====
let RANGE = null;
const RANGE_B = [26, 44, 454, 234];
function startRange(id, back) {
  let d = getDef(id); if (d.cat !== 'w' && d.cat !== 'g') return;
  const L = loadout(); const gid = d.cat === 'g' ? id : null; if (gid) { id = S.eq.weapon; if (!id) return; d = getDef(id); }
  const w = makeWorld({ pi: Math.max(1, S.planet.cur || 1), practice: true, noHurt: true });
  w.hpMul = Math.pow(1.21, Math.max(0, S.planet.reached - 1)); w.dmgMul = 1; w.crit = L.crit; w.comboMax = L.combo;
  const B = RANGE_B; w.bounds = B;
  w.solid = (x, y) => x < B[0] - 8 || x > B[2] + 8 || y < B[1] - 10 || y > B[3] + 8;
  w.collide = ent => { ent.x = clamp(ent.x, B[0], B[2]); ent.y = clamp(ent.y, B[1], B[3]); };
  const pl = makePlayer(80, 140, L); w.player = pl;
  const Wst = Object.assign(wStats(d, effL(id, Math.max(1, lvl(id) || 1), Math.max(gradeOf(id), back === 'open' && OPEN ? OPEN.tier : 0))), { id }); Wst.dmg *= L.dmgMul; Wst.col = weaponColor(id);
  pl.Ws = [Wst]; pl.W = Wst; pl.wi = 0;
  const gg = gid || S.eq.gadget; if (gg && (owned(gg) || gid)) { const gs = gStats(getDef(gg), effL(gg, Math.max(1, lvl(gg) || 1), Math.max(gradeOf(gg), back === 'open' && OPEN ? OPEN.tier : 0))); gs.dmg *= L.dmgMul; pl.G = Object.assign(gs, { id: gg, max: gs.cd, cd: 0 }); }
  if (L.pet) pl.pet = Object.assign({}, L.pet, { t: 1 });
  RANGE = { id, gid, w, L, back: back || 'hub', t: 0, cam: { x: 0, y: 0 }, respawn: [], podT: 0, eq: Object.assign({}, S.eq, { weapon: id }) };
  w.onKill = e => { if (e.slot) RANGE.respawn.push({ slot: e.slot, t: 1.6 }); };
  for (const sl of ['group', 'group', 'group', 'group', 'group', 'mover', 'mover', 'mover', 'brute', 'spitter']) spawnRangeTarget(sl);
  const dm = spawnEnemy(w, 'brute', 400, 140); dm.dummy = true; dm.hp = dm.maxHp = 1e6; dm.r = 8; dm.face = -1; dm.armored = false;
  rangePods();
  SND.playSong(null); setScene('range');
}
function spawnRangeTarget(slot) {
  const w = RANGE.w; let e;
  if (slot === 'group') { e = spawnEnemy(w, 'crawler', 300 + (R0() - 0.5) * 30, 86 + (R0() - 0.5) * 20); e.passive = true; e.hx = 300; e.hy = 88; e.prx = 18; e.pry = 10; e.pspd = 1.4; e.pph = R0() * TAU; }
  if (slot === 'mover') { e = spawnEnemy(w, 'swarm', 240, 205); e.passive = true; e.hx = 250; e.hy = 205; e.prx = 140; e.pry = 14; e.pspd = 0.9 + R0() * 0.5; e.pph = R0() * TAU; e.hp = e.maxHp = e.hp * 2; }
  if (slot === 'brute') e = spawnEnemy(w, 'brute', 360, 200);
  if (slot === 'spitter') e = spawnEnemy(w, 'spitter', 420, 70);
  e.slot = slot; e.coin = 0; return e;
}
function rangePods() { const w = RANGE.w; w.props = w.props.filter(p => !p.dead); if (w.props.length) return; for (let i = 0; i < 3; i++) w.props.push({ kind: 'pod', x: 170 + i * 12, y: 78 + (i % 2) * 6, r: 6, cy: 5, hp: 1, shoot: true, solid: false, col: '#ff5c9a', dead: false, flash: 0, t: 0 }); }
function updateRange(dt) {
  const G = RANGE; if (!G) return; const w = G.w, pl = w.player; G.t += dt; w.t += dt;
  if (kp('Escape')) { leaveRange(); return; }
  const inp = { mx: (key('KeyD') || key('ArrowRight') ? 1 : 0) - (key('KeyA') || key('ArrowLeft') ? 1 : 0), my: (key('KeyS') || key('ArrowDown') ? 1 : 0) - (key('KeyW') || key('ArrowUp') ? 1 : 0), ax: IN.mx, ay: IN.my, fire: IN.down && IN.my > 30 && IN.my < 240, boost: kp('Space') || kp('ShiftLeft') };
  if (IN.touch || TOUCH.size) { const t = touchInput(pl, { x: 0, y: 0 }, w); Object.assign(inp, { mx: t.mx, my: t.my, ax: t.ax, ay: t.ay, fire: t.fire, boost: t.boost }); }
  updatePlayer(w, pl, inp, dt, G.L);
  if (S.eq.trail && S.inv[S.eq.trail] && pl.moving && R0() < 0.6) trailFx(w, pl, getDef(S.eq.trail));
  fireWeapon(w, pl, pl.W, inp, dt); updateDrones(w, pl, pl.W, dt);
  if ((kp('KeyF') || kp('Digit2')) && pl.G) { if (pl.G.cd <= 0) useGadget(w, pl, inp.ax, inp.ay); else SND.play('deny'); }
  w.zaps.forEach(z => z.t += dt); w.zaps = w.zaps.filter(z => z.t < 0.15);
  updateShots(w, dt); updateMines(w, dt); updateEnemies(w, dt); updateEShots(w, dt); updateTele(w, dt); w.fx.update(dt);
  if (w.comboT > 0) { w.comboT -= dt; if (w.comboT <= 0) w.combo = 0; }
  for (const r of G.respawn) { r.t -= dt; if (r.t <= 0) { r.done = true; spawnRangeTarget(r.slot); } } G.respawn = G.respawn.filter(r => !r.done);
  if (!w.props.some(p => !p.dead)) { G.podT += dt; if (G.podT > 4) { G.podT = 0; rangePods(); } }
  pl.hp = pl.maxHp;
  w.dmgLog = (w.dmgLog || []).filter(x => w.t - x[0] < 3);
}
function leaveRange() {
  const G = RANGE; RANGE = null; SND.play('click');
  if (G.back === 'open' && OPEN) { setScene('open'); return; }
  setScene('hub'); SND.playSong('hub'); if (G.back === 'locker') openStation('locker');
}
function drawRange(dt) {
  const G = RANGE, w = G.w, pl = w.player, d = getDef(G.gid || G.id);
  rect(0, 0, W, H, '#05060d');
  const B = RANGE_B;
  ctx.globalAlpha = 0.5; for (let x = B[0]; x <= B[2]; x += 16) rect(x, B[1] - 8, 1, B[3] - B[1] + 16, '#14213d'); for (let y = B[1] - 8; y <= B[3] + 8; y += 12) rect(B[0] - 8, y, B[2] - B[0] + 16, 1, '#14213d'); ctx.globalAlpha = 1;
  ctx.strokeStyle = COL.blueL; ctx.strokeRect(B[0] - 8.5, B[1] - 10.5, B[2] - B[0] + 17, B[3] - B[1] + 19);
  text('GROUP', 300, 64, COL.mute, FS, 1); text('MOVING', 110, 226, COL.mute, FS, 1); text('PODS', 182, 64, COL.mute, FS, 1);
  drawTele(w, 0, 0);
  const objs = [];
  for (const e of (w.ents || NO_ENTS)) objs.push([e.y, 0, e]); for (const p of w.props) if (!p.dead) objs.push([p.y, 1, p]); objs.push([pl.y, 2, pl]);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of objs) { if (k === 0) drawEnemy(w, o, 0, 0); else if (k === 1) drawProp({ w, L: G.L, pi: w.pi, signal: 0, scanR: 0 }, o, 0, 0); else drawPlayer(w, pl, 0, 0, G.eq); }
  drawShots(w, 0, 0); w.fx.draw(0, 0);
  // top bar
  rect(0, 0, W, 22, COL.void1); rect(0, 22, W, 1, COL.steel);
  if (button(4, 4, 56, 14, '< BACK', { font: FS })) { leaveRange(); return; }
  text('TEST RANGE', 68, 4, COL.gold, FS); let nm = d.name; while (textW(nm, FB) > 200 && nm.length > 6) nm = nm.slice(0, -1); text(nm, 68, 11, d.r === 6 ? 'RAINBOW' : rcol(d.r), FB);
  const dps = (w.dmgLog || []).reduce((a, x) => a + x[1], 0) / 3;
  text('DUMMY DPS', W - 150, 4, COL.mute, FS); textO(fmt(dps), W - 150, 11, COL.gold, '#000', FB);
  const tid = G.gid || G.id, tsl = G.gid ? 'gadget' : 'weapon'; const eqd = S.eq[tsl] === tid;
  if (owned(tid) && !eqd) {
    if (button(W - 96, 3, 88, 16, G.gid ? 'EQUIP GADGET' : 'EQUIP', { kind: 'primary', font: FS })) { equipped(tid); S.eq[tsl] = tid; S.stats.equips++; dirty(); SND.play('pickup'); if (!G.gid) G.eq.weapon = tid; }
  } else if (eqd) text('EQUIPPED', W - 8, 9, COL.mint, FS, 2);
  // bottom tips
  rect(0, H - 26, W, 26, COL.void1); rect(0, H - 26, W, 1, COL.steel);
  if (pl.G) { const ready = pl.G.cd <= 0; text('GADGET', 220, 4, COL.mute, FS); text(ready ? 'F: READY' : 'RECHARGING ' + pl.G.cd.toFixed(1), 220, 11, ready ? COL.gold : COL.dim, FS); }
  const tips = G.gid ? [itemHeadline(d), 'PRESS F OR 2 TO USE IT ON THE TARGETS. YOUR EQUIPPED WEAPON STILL FIRES', 'ESC TO LEAVE'] : [d.sig ? 'SIGNATURE: ' + d.lore : itemHeadline(d), TECH[d.sub] ? 'TECHNIQUE: ' + TECH[d.sub] : '', 'BOOST THROUGH ATTACKS FOR A PERFECT DODGE. HIT ALIENS FROM BEHIND. HIT A FLASHING ! TO STAGGER. ESC TO LEAVE'];
  tips.filter(Boolean).slice(0, 3).forEach((t, i) => { let s = t; while (textW(s, FS) > W - 16 && s.length > 8) s = s.slice(0, -1); text(s, 8, H - 22 + i * 7, i === 0 ? COL.cream : i === 1 ? COL.lilac : COL.mute, FS); });
  if (!IN.touch) { const x = Math.floor(IN.mx), y = Math.floor(IN.my); rect(x - 4, y, 3, 1, COL.ink); rect(x + 2, y, 3, 1, COL.ink); rect(x, y - 4, 1, 3, COL.ink); rect(x, y + 2, 1, 3, COL.ink); }
}
