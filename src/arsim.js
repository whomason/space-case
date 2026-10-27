// ===== ARENA SIM: arenas and 1v1s run on the exact same weapon, gadget and armor code as planets =====
// Every pilot owns a small combat world (its shots, mines, drones, beams and gadgets). The other pilots
// stand inside it as targets, so every weapon trait, element, signature and gadget works like it does
// against aliens. Damage still counts only on the device that owns the pilot getting hit.
const AR_VERBS = ['pierce', 'bounce', 'home', 'split', 'chain', 'detonate', 'pull', 'stick', 'orbit', 'burrow', 'spiral', 'return'];
const AR_ELS = ['plasma', 'cryo', 'arc', 'void', 'toxin', 'prism'];
const AR_STATUS = ['shock', 'vmark', 'corrode', 'steam', 'slow', 'warp', 'freeze', 'stun', 'burn', 'poison', 'chill'];
const arNum = (v, lo, hi, d) => { v = +v; return isFinite(v) ? clamp(v, lo, hi) : d; };
const arTok = s => typeof s === 'string' && /^[a-z0-9]{1,14}$/.test(s) ? s : null;

// ---------- kits: what a pilot brings ----------
function arKW(W) { return { id: W.id, cls: W.cls, dmg: W.dmg, rate: W.rate, spd: W.spd, rng: W.rng, spread: W.spread, pellets: W.pellets, pierce: W.pierce, aoe: W.aoe, v: W.v, el: W.el, r: W.r, sig: W.sig, quirk: W.quirk }; }
function arKG(G) { return { id: G.id, k: G.k, r: G.r, cd: G.cd, dmg: G.dmg, rad: G.rad, dur: G.dur, heal: G.heal }; }
// your kit: the same numbers the planets use (weapon, gadget, health, armor, speed, jetpack)
function arMyPlate() { return typeof hasSupporter === 'function' && hasSupporter() ? 1 : 0; }
function arMyKit() {
  const L = loadout(); const id = arenaLoadout().w1 || 'w|blaster|0';
  const W = L.weapon && L.weapon.id === id ? Object.assign({}, L.weapon) : Object.assign(wStats(getDef(id), effL(id)), { id });
  if (!(L.weapon && L.weapon.id === id)) W.dmg *= L.dmgMul;
  const rp = typeof relicPower === 'function' ? relicPower() : 1; W.dmg *= rp;
  const G = L.gadget ? Object.assign({}, L.gadget) : null; if (G) G.dmg *= rp;
  const sa = L.setAb || {};
  return { W: arKW(W), G: G && arKG(G), hp: Math.round(L.hp), ar: L.armor, sp: L.speed, bcd: L.boostCd, bp: L.boostPow, ch: (L.perks.double ? 2 : 1) + (sa[5] || 0), cr: L.crit, sa };
}
function arDps(W) {
  if (!W) return 1;
  if (W.cls === 'beam') return W.dmg * 1.6;
  const n = W.cls === 'drone' ? (W.sig === 'hive' ? 6 : Math.min(4, 1 + Math.floor((W.r || 0) / 2))) : 1;
  return W.dmg * W.rate * (W.pellets || 1) * n;
}
// AI pilots: real items, scaled to fight close to your level
function arBotKit(eq, skill, R) {
  const ref = (AM && AM.refKit) || arMyKit();
  let wid = eq.weapon; try { if (!wid || getDef(wid).cat !== 'w') wid = 'w|blaster|0'; } catch (e) { wid = 'w|blaster|0'; }
  const W = Object.assign(wStats(getDef(wid), 1 + R.int(10)), { id: wid });
  W.dmg *= arDps(ref.W) * (0.5 + 0.42 * skill) * (0.9 + R() * 0.2) / Math.max(0.01, arDps(W));
  let G = null;
  if (eq.gadget) { try { const gd = getDef(eq.gadget); const g = gStats(gd, 1); G = arKG(Object.assign(g, { id: eq.gadget, dmg: arDps(W) * GADGETS[gd.sub].dmg * 0.8 })); } catch (e) { G = null; } }
  const rr = s => { try { return eq[s] ? getDef(eq[s]).r : 0; } catch (e) { return 0; } };
  return { W: arKW(W), G, hp: Math.round(ref.hp * (0.7 + 0.4 * skill)), ar: Math.min(0.4, 0.04 * rr('chest')), sp: 66 * (1 + 0.045 * rr('boots')), bcd: Math.max(0.6, 2.3 - 0.22 * rr('jetpack')), bp: 1 + 0.08 * rr('jetpack'), ch: 1, cr: 0.06, sa: {} };
}
// a kit that came over the network: keep only sane values
function arCleanKit(k) {
  if (!k || typeof k !== 'object') return null;
  const w = k.W || {}; let id = typeof w.id === 'string' ? w.id : 'w|blaster|0', d = null;
  try { d = getDef(id); } catch (e) { d = null; }
  if (!d || d.cat !== 'w') { id = 'w|blaster|0'; d = getDef(id); }
  const v = {}; if (w.v && typeof w.v === 'object') for (const key of AR_VERBS) if (w.v[key]) v[key] = Math.round(arNum(w.v[key], 0, 6, 0));
  const el = Array.isArray(w.el) && AR_ELS.includes(w.el[0]) ? [w.el[0], arNum(w.el[1], 0, 4, 1)] : null;
  const W = { id, cls: d.sub, dmg: arNum(w.dmg, 0.1, 1e9, 5), rate: arNum(w.rate, 0.1, 30, 2), spd: arNum(w.spd, 0, 2000, 200), rng: arNum(w.rng, 10, 700, 200), spread: arNum(w.spread, 0, 3, 0), pellets: Math.round(arNum(w.pellets, 1, 16, 1)), pierce: Math.round(arNum(w.pierce, 0, 8, 0)), aoe: arNum(w.aoe, 0, 140, 0), v, el, r: Math.round(arNum(w.r, 0, 6, 0)), sig: arTok(w.sig), quirk: arTok(w.quirk) };
  let G = null; const g = k.G;
  if (g && typeof g === 'object' && GADGETS[g.k]) G = { id: typeof g.id === 'string' ? g.id.slice(0, 40) : null, k: g.k, r: Math.round(arNum(g.r, 0, 6, 0)), cd: arNum(g.cd, 2, 60, 15), dmg: arNum(g.dmg, 0, 1e9, 10), rad: arNum(g.rad, 0, 320, 50), dur: arNum(g.dur, 0, 12, 1), heal: arNum(g.heal, 0, 1, 0.3) };
  const sa = {}; if (k.sa && typeof k.sa === 'object') for (const kk in k.sa) if (/^\d{1,2}$/.test(kk)) sa[kk] = Math.round(arNum(k.sa[kk], 0, 2, 0));
  return { W, G, hp: arNum(k.hp, 20, 1e10, 150), ar: arNum(k.ar, 0, 0.6, 0), sp: arNum(k.sp, 30, 150, 66), bcd: arNum(k.bcd, 0.4, 4, 2.3), bp: arNum(k.bp, 0.5, 2.5, 1), ch: Math.round(arNum(k.ch, 1, 4, 1)), cr: arNum(k.cr, 0, 0.8, 0.06), sa };
}
function arApplyKit(f, k) {
  if (!k) return;
  f.kit = k;
  const W = Object.assign({}, k.W, { col: weaponColor(k.W.id) }); f.W = W; f.Ws = [W];
  f.G = k.G ? Object.assign({}, k.G, { max: k.G.cd, cd: f.G && f.G.k === k.G.k ? f.G.cd : 0 }) : null;
  const was = f.maxHp; f.maxHp = Math.max(1, k.hp); if (!was || f.hp >= was || f.hp > f.maxHp) f.hp = f.maxHp;
  f.armor = k.ar; f.spd = k.sp; f.bcd = k.bcd; f.bp = k.bp; f.maxCharges = k.ch; if (f.charges === undefined) f.charges = k.ch;
  f.setAb = k.sa || {}; f.perks = f.perks || {}; f.crit = k.cr;
  f.wpn = { cls: W.cls, col: W.col, rng: Math.max(24, W.rng || 30), spd: W.spd || 260 };
  if (f.eq) f.eq.weapon = W.id;
  if (f.w) f.w.crit = k.cr;
}

// ---------- worlds and targets ----------
function arWorldFor(f) {
  const A = AM, M = A.M;
  const w = makeWorld({ practice: true, noHurt: true, pi: A.theme || 1, solid: (x, y) => M.blocked(x, y, 0) || x < 6 || y < 6 || x > M.w - 6 || y > M.h - 6 });
  w.fx = A.fx; w.player = f; w.sndOn = !!f.local; w.crit = f.crit || 0.06; w.arena = true;
  return w;
}
function arProxy(f) {
  if (!f.px) f.px = { pvp: true, f, x: f.x, y: f.y - 3, r: 6, hp: 1, maxHp: 1, kx: 0, ky: 0, face: 1, t: 0, flash: 0, col: '#ffffff', col2: '#ffffff', arch: 'pvp' };
  return f.px;
}
function arClearStatus(f) { const p = f.px; if (!p) return; for (const k of AR_STATUS) p[k] = 0; p.sticky = null; p.burnDps = 0; p.poisonDps = 0; f.slowK = 1; f.stuck = false; }
// other pilots' worlds never shake, flash or freeze my screen
function arQuiet(f, fn) {
  if (f.local) return fn();
  const s = [FX.shake, FX.hitstop, FX.slowmo, FX.flash];
  try { return fn(); } finally { FX.shake = s[0]; FX.hitstop = s[1]; FX.slowmo = s[2]; FX.flash = s[3]; }
}

// ---------- firing: the planet code, plus a record so the others can replay it ----------
function arFire(f, fire, ax, ay, dt) {
  const A = AM; if (!f.w) f.w = arWorldFor(f);
  const w = f.w;
  if (!f.W || !f.alive) { w.beam = null; return; }
  if (f.stuck || A.count > 0) fire = false;
  const n0 = f.shotN || 0, r0 = w.rails.length, ch0 = f.charge || 0, full0 = f.fullAt;
  arQuiet(f, () => fireWeapon(w, f, f.W, { fire, ax, ay }, dt));
  f.hold = fire && (f.W.cls === 'beam' || f.W.cls === 'drone') ? 1 : 0;
  if (!f.local && !(f.bot && A.host)) return;
  const a = Math.round(f.aim * 1000) / 1000, x = Math.round(f.x), y = Math.round(f.y);
  if ((f.shotN || 0) !== n0) f.fired.push(['s', x, y, a, Math.round(ax), Math.round(ay)]);
  if (w.rails.length > r0) f.fired.push(['r', x, y, a, +ch0.toFixed(2), ch0 >= 1.2 && full0 !== undefined && w.t - full0 < 0.3 ? 1 : 0]);
}
function arGadget(f, ax, ay) {
  if (!f.G || !f.alive || f.stuck || (AM && AM.count > 0)) return false;
  if (f.G.cd > 0) { if (f.local && (!f.gDenyT || AM.t - f.gDenyT > 0.4)) { f.gDenyT = AM.t; SND.play('deny'); } return false; }
  if (!f.w) f.w = arWorldFor(f);
  const ok = arQuiet(f, () => useGadget(f.w, f, ax, ay));
  if (ok && (f.local || (f.bot && AM.host))) f.fired.push(['g', Math.round(f.x), Math.round(f.y), Math.round(f.aim * 1000) / 1000, Math.round(ax), Math.round(ay)]);
  return ok;
}
// a shot, rail or gadget another device says its pilot made
function arReplay(f, ev) {
  if (!Array.isArray(ev) || !f.W) return;
  if (!f.w) f.w = arWorldFor(f);
  const w = f.w, k = ev[0], x0 = f.x, y0 = f.y, a0 = f.aim;
  const ex = arNum(ev[1], -50, 2000, f.x), ey = arNum(ev[2], -50, 2000, f.y), ea = arNum(ev[3], -7, 7, f.aim);
  f.x = ex; f.y = ey; f.aim = ea;
  arQuiet(f, () => {
    if (k === 's') { f.fireCd = 0; fireWeapon(w, f, f.W, { fire: true, ax: arNum(ev[4], -50, 2000, ex), ay: arNum(ev[5], -50, 2000, ey) }, 0); }
    else if (k === 'r' && f.W.cls === 'railgun') { f.fullAt = ev[5] ? w.t : undefined; railFire(w, f, f.W, ea, arNum(ev[4], 0.12, 1.2, 0.5)); f.fullAt = undefined; f.charge = 0; }
    else if (k === 'g' && f.G) { f.G.cd = 0; useGadget(w, f, arNum(ev[4], -50, 2000, ex), arNum(ev[5], -50, 2000, ey)); }
  });
  if (k !== 'g') { f.x = x0; f.y = y0; }
  f.aim = a0;
}

// ---------- the step ----------
function arSimStep(dt) {
  const A = AM; if (!A) return;
  const fs = [...A.fighters.values()], tg = [];
  for (const f of fs) {
    if (!f.w) f.w = arWorldFor(f);
    f.dead = !f.alive;
    const p = arProxy(f);
    p.dead = false; p.x = p.x0 = f.x; p.y = p.y0 = f.y - 3; p.hp = p.hp0 = Math.max(1, f.hp); p.maxHp = f.maxHp || 1;
    p.face = Math.cos(f.aim || 0) < 0 ? -1 : 1; p.kx = 0; p.ky = 0; p.lastByW = null; p.invuln = false;
    if (f.alive && f.x > -500 && !(f.inv > 0) && !(f.boostT > 0)) tg.push(p);
  }
  for (const f of fs) {
    const w = f.w; w.ents = tg.filter(p => p.f !== f); w.t += dt; w.crit = f.crit || 0.06;
    // remote beams and drone focus are held, not single shots
    const remote = !f.local && !(f.bot && A.host);
    if (remote && f.W && f.alive && (f.W.cls === 'beam' || f.W.cls === 'drone')) arQuiet(f, () => fireWeapon(w, f, f.W, { fire: !!f.hold, ax: f.x + Math.cos(f.aim) * 60, ay: f.y + Math.sin(f.aim) * 60 }, dt));
    else if (remote) w.beam = null;
    arQuiet(f, () => {
      updateShots(w, dt); updateMines(w, dt); updateDrones(w, f, f.alive ? f.W : null, dt);
      updateHazards(w, dt); updateGadgetFx(w, dt); updateTele(w, dt); arPulls(w, dt);
    });
    if (f.G && f.G.cd > 0) f.G.cd -= dt;
  }
  arCrossWorld(fs);
  for (const f of fs) {
    const p = f.px; if (!p) continue;
    const dmg = p.hp0 - p.hp, by = p.lastByW;
    if (by && by.local && dmg > 0 && by !== f) { A.hitT = 0.14; }
    if (arAuth(f) && f.alive) {
      if (p.kx || p.ky) { f.shoveX = (f.shoveX || 0) + clamp(p.kx, -160, 160) * 0.35; f.shoveY = (f.shoveY || 0) + clamp(p.ky, -160, 160) * 0.35; }
      const mx = p.x - p.x0, my = p.y - p.y0; if (mx || my) { f.x += clamp(mx, -6, 6); f.y += clamp(my, -6, 6); arCollide(f); }
      if (dmg > 0) arTakeDmg(f, dmg, by ? by.id : p.lastAtk ? p.lastAtk.id : null);
    }
    arStatusTick(f, p, dt);
  }
}
function arPulls(w, dt) {
  for (const p of w.pulls) {
    p.t -= dt;
    for (const e of w.ents) { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy); if (d < p.r && d > 3) { e.x += dx / d * p.str * dt; e.y += dy / d * p.str * dt; } }
    if (R0() < 0.5) { const a = R0() * TAU; w.fx.add({ x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r, vx: -Math.cos(a) * p.r * 2.5, vy: -Math.sin(a) * p.r * 2.5, life: 0.35, c: p.col || '#b45cff', s: 1, drag: 0 }); }
  }
  w.pulls = w.pulls.filter(p => p.t > 0);
}
// gadgets that reach into other pilots' worlds: domes stop shots, time warps slow them
function arCrossWorld(fs) {
  for (const f of fs) {
    const gx = f.w.gx; if (!gx || !gx.length) continue;
    for (const g of gx) {
      if (g.k !== 'dome' && g.k !== 'timewarp') continue;
      for (const o of fs) {
        if (o === f) continue;
        for (const s of o.w.shots) {
          if (s.dead || Math.hypot(s.x - g.x, s.y - g.y) > g.rad) continue;
          if (g.k === 'dome') { s.dead = true; f.w.fx.add({ x: s.x, y: s.y, life: 0.2, c: '#9fe7ff', s: 3, t: 'ring' }); }
          else if (!s.warped) { s.warped = true; s.vx *= 0.3; s.vy *= 0.3; s.spd *= 0.3; s.life *= 2; }
        }
      }
    }
  }
}
function arStatusTick(f, p, dt) {
  if (!f.alive) { arClearStatus(f); return; }
  for (const k of ['shock', 'vmark', 'corrode', 'steam', 'slow', 'warp', 'freeze', 'stun']) if (p[k] > 0) p[k] -= dt;
  if (p.freeze > 2.5) p.freeze = 2.5; if (p.stun > 1.5) p.stun = 1.5;
  const fx = AM.fx;
  if (p.burn > 0) { p.burn -= dt; if (R0() < 0.4) fx.add({ x: f.x + (R0() - 0.5) * 8, y: f.y - 14, vx: 0, vy: -30, life: 0.4, c: R0() < 0.5 ? '#ff7a2e' : '#fca311', s: 1 }); }
  if (p.poison > 0) { p.poison -= dt; if (R0() < 0.25) fx.add({ x: f.x + (R0() - 0.5) * 8, y: f.y - 14, vx: 0, vy: -20, life: 0.5, c: '#8cff3a', s: 1 }); }
  p.dotAcc = (p.dotAcc || 0) + dt;
  if (p.dotAcc >= 0.25) {
    p.dotAcc = 0; const dps = (p.burn > 0 ? p.burnDps || 0 : 0) + (p.poison > 0 ? p.poisonDps || 0 : 0);
    if (dps > 0) { fx.text(f.x + (R0() - 0.5) * 4, f.y - 20, fmt(Math.max(1, dps * 0.25)), p.burn > 0 ? '#ff9a3d' : '#8cff3a', { f: FS, life: 0.5, vy: -30 }); if (arAuth(f)) arTakeDmg(f, dps * 0.25, p.lastAtk ? p.lastAtk.id : null); }
  }
  if (p.sticky) { p.sticky.t -= dt; if (p.sticky.t <= 0) { const st = p.sticky; p.sticky = null; if (st.w) explode(st.w, p.x, p.y, 26, st.dmg, st.W.col); } }
  f.slowK = (p.warp > 0 ? 0.3 : 1) * (p.slow > 0 ? 0.55 : 1);
  f.stuck = p.freeze > 0 || p.stun > 0;
}
function arTakeDmg(f, dmg, byId) {
  const A = AM; if (!f.alive || f.inv > 0 || f.boostT > 0) return;
  const d = dmg * (1 - (f.armor || 0));
  f.hp -= d; f.lastHit = 0; f.hurtT = 0.15; f.lastBy = byId;
  if (f.local) { shake(2); SND.play('hurt'); }
  if (f.hp <= 0) arDie(f, byId, true);
}
// ---------- drawing ----------
function arDrawGround(cx, cy) { for (const f of AM.fighters.values()) if (f.w) drawTele(f.w, cx, cy); }
function arDrawTop(cx, cy) { for (const f of AM.fighters.values()) if (f.w) { drawShots(f.w, cx, cy); drawGadgetFx(f.w, cx, cy); } }
function arDrawStatus(f, cx, cy) {
  const p = f.px; if (!p || !f.alive) return; const x = Math.floor(f.x - cx), y = Math.floor(f.y - cy);
  if (p.freeze > 0) { ctx.globalAlpha = 0.45; rect(x - 7, y - 24, 14, 24, '#bff6ff'); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(x - 6.5, y - 23.5, 13, 23); }
  else if (p.stun > 0) { for (let i = 0; i < 3; i++) { const a = T_NOW * 6 + i * TAU / 3; px(x + Math.cos(a) * 7, y - 28 + Math.sin(a) * 2, '#fff25a'); } }
  if ((p.slow > 0 || p.warp > 0) && Math.floor(T_NOW * 4) % 2) px(x - 6, y - 2, '#7fe9ff');
}
// the gadget box under the weapon box
function drawArenaGadget(x, y) {
  const me = AM && AM.me, G = me && me.G, id = G && G.id;
  const ready = G && G.cd <= 0, rc = id ? (getDef(id).r === 6 ? rainbow(T_NOW) : RAR[getDef(id).r].c) : COL.void3;
  panel(x, y, 30, 22, { bg: COL.void0, bd: ready ? rc : COL.steel, flat: true });
  if (id) { drawItemIn(id, x + 1, y + 3, 28, 16, { maxSc: 1, noFx: true }); if (!ready) { const k = clamp(G.cd / (G.max || 1), 0, 1); ctx.globalAlpha = 0.65; rect(x + 1, y + 1, 28, Math.round(20 * k), '#000'); ctx.globalAlpha = 1; text(Math.ceil(G.cd) + '', x + 15, y + 8, COL.ink, FS, 1); } }
  else text('-', x + 15, y + 8, COL.mute, FS, 1);
  if (!IN.touch) keycap(x + 9, y - 9, keyLabel('gadget'));
  if (inBox(x, y, 30, 22)) TIP.set(id ? { item: id } : 'EQUIP A GADGET IN THE LOCKER. IT WORKS HERE TOO');
}
