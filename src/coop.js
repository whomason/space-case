// ===== CO-OP: land on a planet with a friend =====
// The host's game runs the aliens and the boss. The guest sees copies of them ("ghosts"), shoots them,
// and tells the host how much damage it did. Each player decides their own hits (what you see is what
// hits you), mines their own copy of the ore and keeps their own cargo. Every kill pays both players.
const COOP = { st: 'idle', role: null, room: null, code: null, inviteId: null, to: null, from: null, planet: 1, partner: null, ally: null, aw: null, ui: null, sendT: 0, out: null, live: false, peersT: 0, seenT: 0 };
const COOP_SEND = 0.15;
function coopMe() { return { id: (NET.sess && NET.sess.uid) || 'me' + Math.random().toString(36).slice(2, 8), cs: S.name || 'PILOT', j: Date.now() }; }
function coopReset(msg) {
  if (COOP.room) try { COOP.room.send('bye', {}); COOP.room.leave(); } catch (e) { }
  Object.assign(COOP, { st: 'idle', role: null, room: null, code: null, inviteId: null, to: null, from: null, partner: null, ally: null, aw: null, ui: null, live: false, out: null });
  if (RUN && RUN.w) RUN.w.allies = null;
  if (msg) toast(msg, COL.dim);
}
// ---------- the lobby ----------
function coopOpen(pi) {
  if (NET.st !== 'on') { toast('SIGN IN TO PLAY WITH FRIENDS', COL.coral); return; }
  if (COOP.st !== 'idle') { COOP.ui = 'lobby'; return; }
  COOP.planet = pi; COOP.ui = 'pick'; SND.play('click');
}
function coopInvite(cs) {
  const pi = COOP.planet;
  netDo(() => rpc('coop_invite', { p_callsign: cs, p_planet: pi }).then(async r => {
    Object.assign(COOP, { st: 'hosting', role: 'host', code: r.code, inviteId: r.id, to: cs, ui: 'lobby', partner: null });
    await coopJoin(r.code); return r;
  }), `INVITE SENT TO ${cs}. WAITING...`);
}
function coopAccept(id) {
  rpc('challenge_respond', { p_id: id, p_accept: true }).then(async r => {
    if (!r.code) throw new Error('THAT INVITE ENDED');
    Object.assign(COOP, { st: 'joining', role: 'guest', code: r.code, from: r.from, planet: r.planet || 1, ui: 'lobby', partner: null });
    await coopJoin(r.code); toast(`JOINED ${r.from}. WAITING FOR THEM TO LAUNCH`, '#7dffb0');
  }).catch(e => { toast(e.message, COL.coral); coopReset(); });
}
async function coopJoin(code) {
  const me = coopMe(); COOP.meId = me.id;
  const room = await rtJoin('coop-' + code, me, { msg: coopOnMsg, peers: coopOnPeers });
  if (!COOP.code || COOP.code !== code) { room.leave(); return; }
  COOP.room = room; coopHi();
}
function coopHi() {
  if (!COOP.room) return;
  const eq = {}; for (const k of ['weapon', 'helmet', 'chest', 'boots', 'jetpack', 'o2', 'eyewear', 'headgear', 'back', 'trail', 'skin_armor', 'skin_weapon', 'gadget']) if (S.eq[k]) eq[k] = S.eq[k];
  COOP.room.send('hi', { cs: S.name || 'PILOT', eq, kit: arMyKit(), lv: S.lvl, plate: arMyPlate() });
}
function coopOnPeers(list) {
  const other = list.find(p => p.id !== COOP.meId);
  if (!other && COOP.partner) {
    const cs = COOP.partner.cs; COOP.partner = null;
    if (COOP.live) coopPartnerLeft(cs); else toast(`${cs} LEFT`, COL.coral);
  }
}
function coopOnMsg(ev, d, from) {
  if (!d) return;
  if (ev === 'hi') {
    const first = !COOP.partner; COOP.partner = { id: from, cs: cleanName(d.cs).slice(0, 12) || '?', eq: netCleanEq(d.eq), kit: arCleanKit(d.kit), lv: d.lv | 0, plate: d.plate ? 1 : 0 };
    if (first) { coopHi(); SND.play('unlock'); toast(COOP.role === 'host' ? `${COOP.partner.cs} IS READY. LAUNCH TOGETHER!` : `WITH ${COOP.partner.cs}`, '#7dffb0'); }
    if (COOP.ally) coopMakeAlly();
    return;
  }
  if (ev === 'start' && COOP.role === 'guest') { coopGuestStart(d); return; }
  if (ev === 'busy' && COOP.role === 'host') { toast(`${COOP.partner ? COOP.partner.cs : 'YOUR FRIEND'} IS BUSY RIGHT NOW`, COL.coral); return; }
  if (ev === 'bye') { const cs = COOP.partner ? COOP.partner.cs : 'YOUR FRIEND'; COOP.partner = null; if (COOP.live) coopPartnerLeft(cs); else { toast(`${cs} LEFT`, COL.coral); if (COOP.role === 'guest') coopReset(); } return; }
  if (!COOP.live || !RUN) return;
  if (ev === 'w' && COOP.role === 'guest') coopGuestApply(d);
  if (ev === 'g' && COOP.role === 'host') coopHostApply(d);
}
// the host launches: the guest lands on the same map
function coopHostStarted() {
  if (COOP.role !== 'host' || !COOP.room || !COOP.partner || !RUN) return;
  COOP.live = true; COOP.st = 'live'; COOP.ui = null; RUN.coop = 'host';
  COOP.room.send('start', { pi: RUN.pi, seed: RUN.seed });
  coopRunSetup();
}
function coopGuestStart(d) {
  if (RUN || SCENE === 'arena' || SCENE === 'open' || SCENE === 'range' || SCENE === 'results' || SCENE === 'warp') { COOP.room && COOP.room.send('busy', {}); return; }
  if (HUB.panel) HUB.panel = null;
  COOP.ui = null; COOP.live = true; COOP.st = 'live';
  startRun(clamp(d.pi | 0, 1, 60), { seed: (d.seed >>> 0) || 1, guest: true }); track('coop', { p: d.pi | 0, guest: 1 });
  RUN.coop = 'guest'; coopRunSetup();
  banner(`LANDED WITH ${COOP.partner ? COOP.partner.cs : 'YOUR FRIEND'}. STICK TOGETHER!`, '#7dffb0');
}
function coopRunSetup() {
  const R = RUN; COOP.out = { f: [], d: {}, ev: [] }; COOP.sendT = 0; COOP.seenT = T_NOW;
  coopMakeAlly();
  R.w.allies = COOP.role === 'host' ? [COOP.ally] : null;
  R.w.cidSeq = R.w.cidSeq || 0;
}
function coopMakeAlly() {
  const P = COOP.partner; if (!P || !RUN) return;
  const R = RUN, old = COOP.ally;
  const a = arFighter({ id: P.id, cs: P.cs, eq: Object.assign({}, P.eq), x: old ? old.x : R.map.shipX + 16, y: old ? old.y : R.map.shipY + 30, alive: true, human: true, plate: P.plate });
  a.nx = a.x; a.ny = a.y; a.mode = 'weapon';
  arApplyKit(a, P.kit || arCleanKit({}));
  if (old) { a.hp = old.hp; a.maxHp = old.maxHp || a.maxHp; a.alive = old.alive; }
  COOP.ally = a;
  // a world just for the partner's shots and gadgets: they show, but only real reports do damage
  const w = makeWorld({ pi: R.pi, practice: true, noHurt: true, solid: R.w.solid });
  w.fx = R.w.fx; w.player = a; w.sndOn = false; w.visualOnly = true; w.ents = R.w.ents;
  COOP.aw = w;
  if (COOP.role === 'host') R.w.allies = [a];
}
function coopPartnerLeft(cs) {
  const R = RUN; toast(`${cs} LEFT THE PLANET`, COL.coral);
  if (R && R.coop === 'guest') coopGoSolo();
  COOP.ally = null; COOP.aw = null; if (R) { R.w.allies = null; R.coop = null; }
  COOP.live = false; coopReset();
}
// the host is gone: their aliens become real aliens and this becomes a normal landing
function coopGoSolo() {
  const R = RUN, w = R.w;
  w.ents = w.ents.filter(e => !e.dead).map(g => {
    if (!g.ghost) return g;
    if (g.boss) { const b = spawnBoss(w, g.x, g.y); b.hp = Math.max(1, g.hp); b.st = 'idle'; w.ents.pop(); return b; }
    const A = ARCH[g.arch] ? g.arch : 'crawler'; const e = spawnEnemy(w, A, g.x, g.y); w.ents.pop(); e.hp = Math.max(1, Math.min(e.maxHp, g.hp)); e.elite = g.elite; return e;
  });
  w.boss = w.ents.find(e => e.boss) || null;
  R.coop = null; banner('YOU ARE ON YOUR OWN NOW. THE ALIENS ARE ALL YOURS', COL.gold);
}
// ---------- during the landing ----------
const ARCH_IDS = {};
function coopPackPlayer(pl, R) { return [Math.round(pl.x), Math.round(pl.y), Math.round(pl.vx || 0), Math.round(pl.vy || 0), Math.round(pl.aim * 100) / 100, Math.round(pl.hp), Math.round(pl.maxHp), pl.dead || R.state === 'leave' ? 0 : 1, pl.mode === 'tool' ? 1 : 0]; }
function coopApplyPlayer(a, p) {
  if (!a || !Array.isArray(p)) return;
  a.nx = +p[0] || a.nx; a.ny = +p[1] || a.ny; a.vx = +p[2] || 0; a.vy = +p[3] || 0; a.aim = +p[4] || 0; a.hp = +p[5] || 0; a.maxHp = Math.max(1, +p[6] || a.maxHp); a.alive = !!p[7]; a.mode = p[8] ? 'tool' : 'weapon';
  COOP.seenT = T_NOW;
}
// called every frame from updateRun
function coopTick(R, dt) {
  if (!COOP.live || !COOP.room) return;
  const a = COOP.ally, w = R.w;
  if (a) {
    a.nx += a.vx * dt; a.ny += a.vy * dt; const k = Math.min(1, dt * 10); a.x += (a.nx - a.x) * k; a.y += (a.ny - a.y) * k;
    a.moving = Math.hypot(a.vx, a.vy) > 5; if (a.moving) a.walk += dt * 9;
    const ca = Math.cos(a.aim), sa = Math.sin(a.aim); a.dir = Math.abs(ca) > Math.abs(sa) * 0.9 ? (ca < 0 ? 2 : 3) : (sa < 0 ? 1 : 0);
    a.dead = !a.alive; if (a.recoil > 0) a.recoil = Math.max(0, a.recoil - dt * 20);
    const aw = COOP.aw; if (aw) { aw.ents = w.ents; aw.t += dt; updateShots(aw, dt); updateMines(aw, dt); updateDrones(aw, a, a.alive && a.mode === 'weapon' ? a.W : null, dt); updateGadgetFx(aw, dt); if (a.hold && a.W && a.W.cls === 'beam') fireWeapon(aw, a, a.W, { fire: true, ax: a.x + Math.cos(a.aim) * 60, ay: a.y + Math.sin(a.aim) * 60 }, dt); else aw.beam = null; }
  }
  if (T_NOW - COOP.seenT > 12) { coopPartnerLeft(a ? a.cs : 'YOUR FRIEND'); return; }
  if (R.coop === 'guest') coopGuestTick(R, dt);
  COOP.sendT -= dt; if (COOP.sendT > 0) return; COOP.sendT = COOP_SEND;
  const pl = w.player, out = COOP.out;
  if (R.coop === 'host') {
    // aliens near the guest, the boss always
    const ents = []; for (const e of (w.ents || NO_ENTS)) { if (e.dead) continue; if (!e.cid) e.cid = ++w.cidSeq; if (e.boss || !a || Math.hypot(e.x - a.x, e.y - a.y) < 420) ents.push(e); }
    ents.sort((p, q) => (q.boss ? 1 : 0) - (p.boss ? 1 : 0) || Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    const e = ents.slice(0, 45).map(x => [x.cid, x.boss ? 'boss' : x.arch, Math.round(x.x), Math.round(x.y), Math.round(x.hp), Math.round(x.maxHp), x.face < 0 ? -1 : 1,
      (x.boss ? 1 : 0) | (x.elite ? 2 : 0) | (x.armored ? 4 : 0) | (x.freeze > 0 ? 8 : 0) | (x.stun > 0 ? 16 : 0) | (x.under ? 32 : 0) | (x.hidden ? 64 : 0) | ((x.st === 'wind' || x.windup) ? 128 : 0) | (x.carrier ? 256 : 0) | (x.nest ? 512 : 0) | (x.passive ? 1024 : 0) | (x.big ? 2048 : 0),
      x.r, Math.round(x.dmg)]);
    // new alien shots and warnings, so the guest can dodge (and be hit by) the same ones
    const ev = out.ev; out.ev = [];
    for (const s of w.eshots) if (!s.cs) { s.cs = 1; if (!a || Math.hypot(s.x - a.x, s.y - a.y) < 460) ev.push(['es', Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.r || 3, Math.round(s.dmg || 1), s.col || '#f55', +(s.life || 4).toFixed(2), s.slow || 0]); }
    for (const t of w.tele) if (!t.cs) { t.cs = 1; if (t.onDone || t.safe) continue; if (!a || Math.hypot(t.x - a.x, t.y - a.y) < 460) ev.push(['te', Math.round(t.x), Math.round(t.y), t.r || 0, +(t.max - t.t).toFixed(2), Math.round(t.dmg || 0), t.col || '#ff3050', t.line ? 1 : 0, +(t.a || 0).toFixed(3), t.len || 0, t.wd || 0, t.meteor ? 1 : 0, t.bolt ? 1 : 0]); }
    COOP.room.send('w', { p: coopPackPlayer(pl, R), e, f: out.f, ev, boss: w.boss ? 1 : 0 });
  } else {
    const d = Object.entries(out.d).map(([id, v]) => [+id, Math.round(v * 10) / 10]); out.d = {};
    COOP.room.send('g', { p: coopPackPlayer(pl, R), d, f: out.f, hold: COOP.hold ? 1 : 0 });
  }
  out.f = [];
}
// host: a kill pays the guest too
function coopKill(e) {
  if (!COOP.live || !RUN || RUN.coop !== 'host' || !COOP.out) return;
  if (!e.cid) e.cid = ++RUN.w.cidSeq;
  COOP.out.ev.push(['k', e.cid, Math.round(e.x), Math.round(e.y), e.coin || 0, e.xp || 0, e.boss ? 1 : 0, e.elite ? 1 : 0, e.nest ? 1 : 0]);
}
function coopHostApply(d) {
  const R = RUN, w = R.w, a = COOP.ally;
  coopApplyPlayer(a, d.p);
  if (a) a.hold = d.hold ? 1 : 0;
  // damage the guest says it did
  if (Array.isArray(d.d)) for (const [id, v] of d.d.slice(0, 60)) {
    const e = w.ents.find(x => x.cid === id && !x.dead); if (!e) continue;
    const amt = clamp(+v || 0, 0, e.maxHp * 2); if (amt > 0) damageEnemy(w, e, amt, { quiet: R0() > 0.4, col: '#9fe7ff' });
  }
  if (Array.isArray(d.f) && a) for (const ev of d.f.slice(0, 24)) coopReplay(a, ev);
}
// ---------- guest side ----------
function coopGuestApply(d) {
  const R = RUN, w = R.w, a = COOP.ally;
  coopApplyPlayer(a, d.p);
  // ghosts of the host's aliens
  const seen = new Set(), P = planetDef(R.pi);
  for (const s of Array.isArray(d.e) ? d.e : []) {
    const [cid, arch, x, y, hp, maxHp, face, fl, r, dmg] = s; seen.add(cid);
    let g = w.ents.find(e => e.cid === cid);
    if (!g) {
      g = { cid, ghost: true, arch: String(arch).slice(0, 16), x, y, nx: x, ny: y, vx: 0, vy: 0, kx: 0, ky: 0, r: r || 6, hp, maxHp, dmg: dmg || 5, t: R0() * 3, st: 'move', cd: 1, flash: 0, slow: 0, freeze: 0, burn: 0, poison: 0, face, coin: 0, xp: 0, pend: 0,
        col: (fl & 1) ? hex(hsl(P.boss[2][0], P.boss[2][1], P.boss[2][2])) : hex(hsl(P.alien[1][0], P.alien[1][1], P.alien[1][2])), col2: hex(hsl(P.alien[1][0] + 180, 1, 0.6)) };
      w.ents.push(g);
    }
    g.nx = x; g.ny = y; g.face = face; g.maxHp = maxHp; g.hp = g.hp0 = Math.max(1, hp - (g.pend || 0)); g.miss = 0; g.r = r || g.r; g.dmg = dmg || g.dmg;
    g.boss = !!(fl & 1); g.elite = !!(fl & 2); g.armored = !!(fl & 4); g.freeze = (fl & 8) ? 0.2 : 0; g.stun = (fl & 16) ? 0.2 : 0; g.under = !!(fl & 32); g.hidden = !!(fl & 64);
    g.windup = !!(fl & 128); g.carrier = !!(fl & 256); g.nest = !!(fl & 512); g.passive = !!(fl & 1024); g.big = !!(fl & 2048);
    if (g.boss) w.boss = g;
  }
  for (const g of (w.ents || NO_ENTS)) if (g.ghost && !seen.has(g.cid)) { g.miss = (g.miss || 0) + 1; if (g.miss > 3) g.dead = true; }
  w.ents = w.ents.filter(e => !e.dead);
  if (w.boss && (w.boss.dead || !w.ents.includes(w.boss))) w.boss = null;
  // events: alien shots, warnings, kills
  for (const ev of Array.isArray(d.ev) ? d.ev.slice(0, 80) : []) {
    if (ev[0] === 'es') w.eshots.push({ x: ev[1], y: ev[2], vx: ev[3], vy: ev[4], r: ev[5], dmg: ev[6], col: ev[7], life: ev[8], slow: ev[9] || undefined });
    else if (ev[0] === 'te') w.tele.push(ev[7] ? { line: true, x: ev[1], y: ev[2], a: ev[8], len: ev[9], wd: ev[10], t: 0, max: ev[4], dmg: ev[5], col: ev[6] } : { x: ev[1], y: ev[2], r: ev[3], t: 0, max: ev[4], dmg: ev[5], col: ev[6], meteor: !!ev[11], bolt: !!ev[12] });
    else if (ev[0] === 'k') {
      const g = w.ents.find(e => e.cid === ev[1]); const x = g ? g.x : ev[2], y = g ? g.y : ev[3];
      if (g) { g.dead = true; burstKill(w, x, y - 3, w.killfx ? w.killfx.style : 'PIXEL POP', w.killfx ? w.killfx.cols : ['#fff', g.col, g.col2], ev[6] ? 3 : ev[7] ? 2 : 1); }
      onRunKill({ x, y, coin: ev[4], xp: ev[5], boss: !!ev[6], elite: !!ev[7], nest: !!ev[8], arch: 'ghost' });
      if (ev[6]) w.boss = null;
    }
  }
  w.ents = w.ents.filter(e => !e.dead);
  if (Array.isArray(d.f) && a) for (const ev of d.f.slice(0, 24)) coopReplay(a, ev);
}
// the ghosts glide to where the host says they are; touching one still hurts
function coopGuestTick(R, dt) {
  const w = R.w, pl = w.player;
  for (const g of (w.ents || NO_ENTS)) {
    if (!g.ghost) continue;
    g.t += dt; g.flash -= dt; if (g.pend > 0) g.pend = Math.max(0, g.pend - g.maxHp * dt * 0.5);
    const k = Math.min(1, dt * 9); g.x += (g.nx - g.x) * k; g.y += (g.ny - g.y) * k;
    for (const s of ['shock', 'vmark', 'corrode', 'steam', 'burn', 'poison', 'slow']) if (g[s] > 0) g[s] -= dt;
    g.kx = 0; g.ky = 0;
    if (!pl.dead && !g.passive && !g.nest && !g.under && !g.hidden && Math.hypot(pl.x - g.x, pl.y - g.y) < g.r + pl.r + 2) hurtPlayer(w, g.dmg, g);
  }
}
// what the guest's shots took off the ghosts goes to the host
function coopMeasure(R) {
  for (const g of R.w.ents) {
    if (!g.ghost) continue;
    if (g.hp0 !== undefined && g.hp < g.hp0) { const d = g.hp0 - g.hp; COOP.out.d[g.cid] = (COOP.out.d[g.cid] || 0) + d; g.pend = (g.pend || 0) + d; }
    if (g.hp <= 0) g.hp = 1;
    g.hp0 = g.hp;
  }
}
// record my own firing so the partner sees it
function coopRecordFire(R, pl, n0, r0, ch0, full0, inp) {
  if (!COOP.live || !COOP.out) return;
  const w = R.w, a = Math.round(pl.aim * 1000) / 1000;
  if ((pl.shotN || 0) !== n0) COOP.out.f.push(['s', Math.round(pl.x), Math.round(pl.y), a, Math.round(inp.ax), Math.round(inp.ay)]);
  if (w.rails.length > r0) COOP.out.f.push(['r', Math.round(pl.x), Math.round(pl.y), a, +ch0.toFixed(2), ch0 >= 1.2 && full0 !== undefined && w.t - full0 < 0.3 ? 1 : 0]);
  COOP.hold = inp.fire && pl.W && pl.W.cls === 'beam' ? 1 : 0;
}
function coopRecordGadget(pl, ax, ay) { if (COOP.live && COOP.out) COOP.out.f.push(['g', Math.round(pl.x), Math.round(pl.y), Math.round(pl.aim * 1000) / 1000, Math.round(ax), Math.round(ay)]); }
function coopReplay(a, ev) {
  const w = COOP.aw; if (!w || !a.W || !Array.isArray(ev)) return;
  const x0 = a.x, y0 = a.y, a0 = a.aim, n = (v, d) => (isFinite(+v) ? +v : d);
  a.x = n(ev[1], a.x); a.y = n(ev[2], a.y); a.aim = n(ev[3], a.aim);
  const s = [FX.shake, FX.hitstop, FX.slowmo, FX.flash];
  try {
    if (ev[0] === 's') { a.fireCd = 0; fireWeapon(w, a, a.W, { fire: true, ax: n(ev[4], a.x), ay: n(ev[5], a.y) }, 0); }
    else if (ev[0] === 'r' && a.W.cls === 'railgun') { a.fullAt = ev[5] ? w.t : undefined; railFire(w, a, a.W, a.aim, clamp(n(ev[4], 0.5), 0.12, 1.2)); a.charge = 0; }
    else if (ev[0] === 'g' && a.G) { a.G.cd = 0; useGadget(w, a, n(ev[4], a.x), n(ev[5], a.y)); }
  } catch (e) { }
  FX.shake = s[0]; FX.hitstop = s[1]; FX.slowmo = s[2]; FX.flash = s[3];
  a.x = x0; a.y = y0; a.aim = a0;
}
// ---------- drawing ----------
function coopDrawAlly(R, cx, cy) {
  const a = COOP.ally; if (!COOP.live || !a || !a.alive) return;
  try { drawPlayer(COOP.aw || R.w, a, cx, cy, a.eq || {}, {}); } catch (e) { }
  const nx = Math.floor(a.x - cx), ny = Math.floor(a.y - cy) - 34, tw = textW(a.cs, FS) + 4;
  if (a.plate) { panel(nx - tw / 2 - 1, ny - 2, tw + 2, 9, { bg: '#3a2a10', bd: COL.gold, flat: true }); text(a.cs, nx, ny, COL.gold, FS, 1); }
  else { ctx.globalAlpha = 0.6; rect(nx - tw / 2, ny - 1, tw, 7, '#000'); ctx.globalAlpha = 1; text(a.cs, nx, ny, '#7dffb0', FS, 1); }
  rect(nx - 11, ny + 6, 22, 4, '#000'); bar(nx - 10, ny + 7, 20, 2, a.hp / (a.maxHp || 1), '#7dffb0', '#300');
}
function coopDrawShots(cx, cy) { if (COOP.live && COOP.aw) { drawShots(COOP.aw, cx, cy); drawGadgetFx(COOP.aw, cx, cy); } }
function coopHUD(R) {
  const a = COOP.ally; if (!COOP.live || !a) return;
  const y = 50; panel(4, y, 104, 14, { bg: 'rgba(5,6,15,0.82)', bd: '#7dffb0' });
  text(a.cs, 8, y + 4, '#7dffb0', FS); bar(56, y + 5, 48, 4, a.alive ? a.hp / (a.maxHp || 1) : 0, '#7dffb0', '#300');
  if (!a.alive) text('DOWN', 80, y + 4, COL.coral, FS, 1);
  if (a.alive) drawArrowTo(R, a, '#7dffb0', a.cs);
}
// ---------- lobby overlay (on top of the star map or station) ----------
function coopOverlay() {
  ctx.globalAlpha = 0.75; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const x = 100, y = 40, w = W - 200, h = 180; panel(x, y, w, h, { bg: COL.void1, bd: '#7dffb0' });
  const p = planetDef(COOP.planet);
  textO('LAND WITH A FRIEND', x + 10, y + 8, '#7dffb0', '#000', FB);
  text(`PLANET: ${p.name}`, x + w - 10, y + 10, COL.gold, FS, 2);
  const close = () => { if (COOP.st === 'idle') COOP.ui = null; else { if (COOP.inviteId && COOP.role === 'host' && !COOP.partner) rpc('challenge_respond', { p_id: COOP.inviteId, p_accept: false }).catch(() => { }); coopReset(); } };
  if (COOP.ui === 'pick') {
    text('YOU BOTH LAND ON THE SAME MAP. ALIENS AND THE BOSS ARE SHARED, AND EVERY KILL PAYS YOU BOTH.', x + 10, y + 24, COL.dim, FS);
    text('EACH OF YOU MINES YOUR OWN ORE AND KEEPS YOUR OWN CARGO.', x + 10, y + 32, COL.dim, FS);
    const on = [...(PULSE.online || [])];
    text(on.length ? 'FRIENDS ONLINE NOW' : 'NO FRIENDS ONLINE RIGHT NOW. ADD FRIENDS IN THE ONLINE SCREEN', x + 10, y + 46, on.length ? COL.gold : COL.mute, FS);
    on.slice(0, 7).forEach((cs, i) => { const yy = y + 56 + i * 15; text(cs, x + 14, yy + 3, COL.ink, FS); if (button(x + w - 74, yy, 64, 13, 'INVITE', { kind: 'primary', font: FS, disabled: NET.act })) coopInvite(cs); });
  } else {
    const ready = !!COOP.partner;
    if (COOP.role === 'host') {
      textO(ready ? `${COOP.partner.cs} IS IN!` : `WAITING FOR ${COOP.to}...`, x + w / 2, y + 50, ready ? '#7dffb0' : COL.ink, '#000', FB, 1, 2);
      text(ready ? 'LAUNCH WHEN YOU ARE READY. THEY LAND WITH YOU' : 'THEY GET A POPUP. IT LASTS 60 SECONDS', x + w / 2, y + 74, COL.dim, FS, 1);
      if (ready) { if (button(x + w / 2 - 70, y + 96, 140, 22, 'LAUNCH TOGETHER', { kind: 'primary' })) { COOP.ui = null; coopLaunch(); return; } }
      else { const k = Math.floor(T_NOW * 4) % 4; text('.'.repeat(k), x + w / 2, y + 100, COL.mute, FB, 1); }
    } else {
      textO(ready ? `WITH ${COOP.partner.cs}` : 'CONNECTING...', x + w / 2, y + 50, '#7dffb0', '#000', FB, 1, 2);
      text(`WAITING FOR ${COOP.from || 'YOUR FRIEND'} TO LAUNCH TO ${p.name}`, x + w / 2, y + 74, COL.dim, FS, 1);
      text('YOU CAN KEEP BROWSING. YOU LAND AS SOON AS THEY DO', x + w / 2, y + 84, COL.mute, FS, 1);
      if (button(x + w / 2 - 50, y + 100, 100, 18, 'KEEP BROWSING', { font: FS })) COOP.ui = null;
    }
  }
  if (button(x + w - 74, y + h - 24, 64, 16, COOP.st === 'idle' ? 'CLOSE' : 'CANCEL', { font: FS }) || kp('Escape')) close();
}
// the host's launch button in the overlay goes through the star map's normal launch (boosts included)
function coopLaunch() {
  const n = COOP.planet, p = planetDef(n);
  if (typeof buyBoosts === 'function' && !buyBoosts(p)) return;
  MAP.init = false; HUB.panel = null; startRun(n); track('coop', { p: n, guest: 0 });
}
// a little bar under the station header while you are in a co-op lobby
function coopLobbyChip() {
  if (COOP.st === 'idle' || COOP.live || COOP.ui) return;
  const t = COOP.role === 'host' ? (COOP.partner ? `${COOP.partner.cs} IS WAITING. LAUNCH FROM THE STAR MAP` : `WAITING FOR ${COOP.to}`) : `WITH ${COOP.from}: WAITING FOR THEM TO LAUNCH`;
  const w = textW(t, FS) + 54, x = W / 2 - w / 2, y = H - 18;
  panel(x, y, w, 13, { bg: '#0f2a1a', bd: '#7dffb0', flat: true }); text(t, x + 5, y + 4, '#7dffb0', FS);
  if (button(x + w - 44, y + 1, 42, 11, 'LEAVE', { font: FS })) coopReset('LEFT THE CO-OP');
}
