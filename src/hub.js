// ===== HUB: the station deck, panels, star map, warp, title =====
const HUB = { panel: null, flashT: 0, flashCol: '#fff', choice: null, ps: {}, sel: 0, coinShow: null, turnT: 0, launch: null };
const NAV = [
  { id: 'launch', n: 'LAUNCH', sub: 'PICK A PLANET. HAUL ORE. FIGHT ALIENS.', icon: 'rocket' },
  { id: 'crates', n: 'CRATES', sub: 'SPEND COINS ON CRATES', icon: 'crate' },
  { id: 'locker', n: 'LOCKER', sub: 'WEAPONS, ARMOR, TOOLS AND STYLE', icon: 'helmet' },
  { id: 'hangar', n: 'HANGAR', sub: 'SHIP PARTS RAISE YOUR RATING AND UNLOCK PLANETS', icon: 'ship' },
  { id: 'collection', n: 'COLLECTION', sub: 'COLLECTION PAGES, SETS AND THE CODEX', icon: 'grid' },
  { id: 'workshop', n: 'WORKSHOP', sub: 'BLUEPRINTS, EVOLUTIONS AND ARTIFACTS', icon: 'wrench' },
  { id: 'profile', n: 'PROFILE', sub: 'SKILLS, TITLES AND STATS', icon: 'star' },
  { id: 'mining', n: 'MINING', sub: 'AUTO-MINERS EARN COINS WHILE YOU ARE AWAY', icon: 'pick' },
];
const ICONS = {
  rocket: '.....#.....|....###....|....#.#....|...#####...|...##.##...|...#####...|...#####...|..#######..|.##.###.##.|.#..#.#..#.|....#.#....',
  crate: '###########|#.........#|###########|#..#...#..#|#..#.#.#..#|#..#...#..#|#..#...#..#|#.........#|###########',
  helmet: '...#####...|..#.....#..|.#.#####.#.|.#.#...#.#.|.#.#...#.#.|.#.#####.#.|.#.......#.|..#######..|...#...#...',
  ship: '.....#.....|....###....|....###....|...#.#.#...|..##.#.##..|.###.#.###.|##.#####.##|#..#####..#|...##.##...|...#...#...',
  grid: '###.###.###|###.###.###|...........|###.###.###|###.###.###|...........|###.###.###|###.###.###',
  wrench: '.......###.|......#..#.|......#....|.....###..#|....###.##.|...###.....|..###......|.###.......|###........|##.........',
  star: '.....#.....|.....#.....|....###....|###########|.#########.|..#######..|..###.###..|.###...###.|.#.......#.',
  pick: '..#######..|.#...#...#.|#....#....#|.....#.....|.....#.....|.....#.....|.....#.....|....###....',
};
function drawIcon(name, x, y, c, sc = 1) { const rows = ICONS[name].split('|'); ctx.fillStyle = c; rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) if (r[xx] === '#') ctx.fillRect(Math.floor(x) + xx * sc, Math.floor(y) + yy * sc, sc, sc); }); }
function openStation(id) {
  SND.play('click');
  if (id === 'crates' || id === 'vendor') { BAY.auto = true; setScene('crates'); return; }
  if (id === 'map') { setScene('map'); return; }
  if (id === 'launch') { if (SCENE === 'hub' && HUB.launch === null) { HUB.launch = 0; HUB.panel = null; SND.play('unlock'); } else setScene('map'); return; }
  HUB.panel = id; HUB.ps[id] = HUB.ps[id] || { tab: 0, slot: id === 'hangar' ? 'engine' : 'weapon', scroll: 0 };
  if (id === 'mining') tickMiners();
}
// ---------- starfield ----------
const STARS = []; for (let i = 0; i < 170; i++) STARS.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, c: Math.random() < 0.12 ? '#dec0f1' : Math.random() < 0.12 ? '#957fef' : Math.random() < 0.06 ? '#fca311' : '#fafaff' });
function drawStarfield(dt, speed = 0.2, opt = {}) {
  const bd = opt.plain ? null : equippedBackdrop(); const bdd = bd ? getDef(bd) : null;
  if (bdd) ctx.drawImage(backdropCanvas(bd), 0, 0);
  else { rect(0, 0, W, H, opt.bg || '#000000'); drawNebula(opt.ox || 0); }
  const sa = bdd ? (bdd.style === 'TWIN SUNS' || bdd.style === 'DEEP SEA' || bdd.style === 'PIXEL CITY' ? 0 : 0.45) : 1;
  for (const s of STARS) { s.x -= s.z * speed * 20 * dt; if (s.x < 0) s.x += W; if (!sa) continue; const tw = (Math.sin(T_NOW * 3 + s.y) > 0.7) ? 1 : 0; ctx.globalAlpha = (0.3 + s.z * 0.7) * sa; px(s.x, s.y, s.c); if (s.z > 0.85 && tw) { px(s.x - 1, s.y, s.c); px(s.x + 1, s.y, s.c); } ctx.globalAlpha = 1; }
  if (bdd) backdropFx(bdd);
}
let NEB = null;
function drawNebula(ox = 0) {
  if (!NEB) {
    NEB = mkCanvas(W, H); const nz = makeNoise(42); const id = NEB.x.createImageData(W, H);
    const cols = [[35, 25, 66], [30, 39, 73], [94, 84, 142], [190, 149, 196], [113, 97, 239]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = nz.fbm(x * 0.008, y * 0.012, 5), v2 = nz.fbm(x * 0.01 + 50, y * 0.01, 4); const o = (y * W + x) * 4;
      const a = clamp((v - 0.44) * 3, 0, 1); if (!dith(x, y, a * 0.95)) continue;
      const c = a > 0.75 ? (v2 > 0.5 ? cols[3] : cols[4]) : a > 0.45 ? cols[2] : (v2 > 0.5 ? cols[0] : cols[1]); const k = 0.45 + 0.35 * a;
      id.data[o] = c[0] * k; id.data[o + 1] = c[1] * k; id.data[o + 2] = c[2] * k; id.data[o + 3] = 255;
    }
    NEB.x.putImageData(id, 0, 0);
  }
  ctx.drawImage(NEB, -((ox % W) + W) % W, 0); ctx.drawImage(NEB, W - ((ox % W) + W) % W, 0);
}
// ---------- hub update ----------
function navBadge(id) {
  switch (id) {
    case 'launch': { const n = S.planet.reached + 1; return shipRating() >= PLANET_REQ(n) && n <= maxMapPlanet() ? { t: 'NEW PLANET', c: COL.gold } : null; }
    case 'crates': { const n = Math.floor(S.coins / CRATE_COIN); return n ? { t: 'X' + Math.min(99, n), c: COL.gold } : null; }
    case 'hangar': { const n = freshCount('hangar'); return n ? { t: n + ' NEW', c: COL.pink, pulse: true } : { t: '' + shipRating(), c: COL.blueL, quiet: true }; }
    case 'locker': { const n = freshCount('locker'); return n ? { t: n + ' NEW', c: COL.pink, pulse: true } : null; }
    case 'collection': { const n = PAGES.filter(pg => pageDone(pg) && !S.pages[pg.id]).length; return n ? { t: n + ' REWARD' + (n > 1 ? 'S' : ''), c: COL.pink } : null; }
    case 'workshop': { const ready = CLASSES.some(c => { const m = S.mast[c]; return m && m.c < MAST_STEPS.length && m.k >= MAST_STEPS[Math.min(m.c, MAST_STEPS.length - 1)]; }) || Object.values(S.bp || {}).some(Boolean) || Object.keys(S.inv).some(id => { const d = getDef(id); return d.cat === 'w' && d.r <= 2 && !d.evo && d.o.t !== 'art' && !owned('e|' + id) && (S.ikills[id] || 0) >= EVO_NEED[d.r]; }); return ready ? { t: 'READY', c: COL.pink } : null; }
    case 'profile': return S.sp ? { t: S.sp + ' PT' + (S.sp > 1 ? 'S' : ''), c: COL.pink } : null;
    case 'mining': { let a = 0; for (const k in S.miners.acc) a += S.miners.acc[k]; return a >= 1 ? { t: fmt(a), c: COL.gold } : null; }
  }
  return null;
}
function updateHub(dt) {
  if (HUB.flashT > 0) HUB.flashT -= dt;
  if (HUB.launch !== null) {
    const t0 = HUB.launch; HUB.launch += dt; const t = HUB.launch;
    if (t0 < 0.4 && t >= 0.4) { SND.play('boost'); shake(3); }
    if (t0 < 0.75 && t >= 0.75) { SND.play('launch'); SND.play('burst'); shake(6); }
    if (t > 1.45 || (IN.pr && t > 0.15)) { HUB.launch = null; setScene('map'); }
    return;
  }
  if (HUB.choice) { updateChoiceOverlay(dt); return; }
  if (S.haulCrates && S.haulCrates.length) { startHaulOpen(S.haulCrates.splice(0)); return; }
  if (!HUB.choice && S.choiceQueue.length) nextQueuedChoice();
  if (HUB.panel) { if (kp('Escape')) { HUB.panel = null; SND.play('click'); } return; }
  if (kp('ArrowDown') || kp('KeyS')) { HUB.sel = (HUB.sel + 1) % NAV.length; SND.play('hover'); }
  if (kp('ArrowUp') || kp('KeyW')) { HUB.sel = (HUB.sel + NAV.length - 1) % NAV.length; SND.play('hover'); }
  if (kp('Enter') || kp('KeyE') || kp('Space')) openStation(NAV[HUB.sel].id);
  for (let i = 0; i < NAV.length; i++) if (kp('Digit' + (i + 1))) openStation(NAV[i].id);
  if (kp('KeyC')) openStation('crates'); if (kp('KeyM') || kp('KeyL')) openStation('launch');
  tickMinersLite();
}
// ---------- hub draw ----------
let HUB_PLANET = null, HUB_PT = 0;
const HUB_FX = new Particles(300);
let _mlT = 0; function tickMinersLite() { if (T_NOW - _mlT > 5) { _mlT = T_NOW; tickMiners(); } }
function topItems(n) { return Object.keys(S.inv).sort((a, b) => (getDef(b).r * 20 + S.inv[b].l) - (getDef(a).r * 20 + S.inv[a].l)).slice(0, n); }
function drawHub(dt) {
  const flashing = HUB.flashT > 0; const fc = flashing ? (HUB.flashCol === 'RAINBOW' ? rainbow(T_NOW) : HUB.flashCol) : null;
  drawStarfield(dt, 0.15, { ox: T_NOW * 1.5 });
  // big planet
  const pd = planetDef(S.planet.cur || 1); HUB_PT += dt;
  const PR = 104, PX = 372, PY = 186;
  if (!HUB_PLANET || HUB_PLANET.pi !== pd.i || HUB_PT > 0.12) { HUB_PT = 0; HUB_PLANET = renderSphere(pd, PR, T_NOW * 0.05, { canvas: HUB_PLANET && HUB_PLANET.pi === pd.i ? HUB_PLANET : null }); HUB_PLANET.pi = pd.i; }
  drawRings(pd, PX, PY, PR, false); ctx.drawImage(HUB_PLANET, PX - PR - HUB_PLANET.pad, PY - PR - HUB_PLANET.pad); drawRings(pd, PX, PY, PR, true);
  ctx.globalAlpha = 0.12; circ(PX - 30, PY - 40, 60, '#dec0f1'); ctx.globalAlpha = 1;
  // comet
  const ct = (T_NOW % 13) / 13; if (ct < 0.18) { const k = ct / 0.18; const x = 480 - k * 300, y = 30 + k * 40; for (let i = 0; i < 16; i++) { ctx.globalAlpha = 1 - i / 16; px(x + i * 2, y - i * 0.3, i < 2 ? '#fafaff' : '#dec0f1'); } ctx.globalAlpha = 1; }
  // ship held by tractor beams
  const LT = HUB.launch; let sb = Math.round(Math.sin(T_NOW * 1.3) * 2); let sx = 206, sy = 78 + sb;
  if (LT !== null) { if (LT > 0.4 && LT < 0.8) { sx += Math.round((R0() - 0.5) * 3); sy += Math.round((R0() - 0.5) * 3); } if (LT > 0.75) { const k = (LT - 0.75) / 0.6; sx += Math.round(k * k * 460); sy -= Math.round(k * k * 110); } }
  if (LT === null || LT < 0.4) for (const bx of [sx + 34, sx + 66]) for (let y = 0; y < sy + 18; y += 2) { const k = y / (sy + 18); if (dith(bx, y + Math.floor(T_NOW * 20), 0.25 + 0.2 * k)) { rect(bx - 3 + Math.round(k * 2), y, 7 - Math.round(k * 4), 1, 'rgba(149,127,239,0.35)'); } }
  if (LT !== null && LT > 0.75) { const k = Math.min(1, (LT - 0.75) / 0.4); for (let i = 0; i < 26; i++) { const yy = sy + 20 + ((i * 37) % 40) - 10, len = 30 + (i * 53) % 80; ctx.globalAlpha = 0.5 * k; rect(sx - len * k * 1.5 - (i * 13) % 30, yy, len * k, 1, i % 3 ? '#fafaff' : COL.pink); } ctx.globalAlpha = 1; }
  drawShip(S.eq, sx, sy, 2, T_NOW, { shield: LT === null, thrust: LT !== null && LT > 0.4 ? 1 : 0 });
  if (LT !== null && LT > 0.4) { for (let i = 0; i < 3; i++) HUB_FX.add({ x: sx + 4 + R0() * 6, y: sy + 30 + (R0() - 0.5) * 14, vx: -60 - R0() * 120, vy: (R0() - 0.5) * 20, life: 0.4, c: R0() < 0.5 ? COL.gold : COL.pink, s: 2, t: 'shrink' }); }
  // deck
  rect(0, 214, W, H - 214, '#05070f');
  for (let i = 0; i < 9; i++) { const y = 216 + i * i * 0.8; rect(0, y, W, 1, i === 0 ? '#273469' : 'rgba(39,52,105,0.5)'); }
  for (let x = -200; x <= W + 200; x += 40) line(W / 2 + (x - W / 2) * 0.35, 216, x, H, 'rgba(39,52,105,0.45)');
  rect(0, 212, W, 2, fc || '#957fef'); ctx.globalAlpha = 0.25; rect(0, 208, W, 4, fc || '#957fef'); rect(0, 214, W, 3, fc || '#957fef'); ctx.globalAlpha = 1;
  for (let x = 6; x < W; x += 12) px(x, 212, (Math.floor(T_NOW * 6) + x / 12) % 9 === 0 ? '#fafaff' : (fc || '#b79ced'));
  // astronaut on deck, looking out at the planet, turning around now and then
  HUB.turnT += dt; const look = (HUB.turnT % 9) > 7.2 ? 0 : 1;
  if (LT === null) { shadow(286, 252, 14, 3, 0.5); ctx.drawImage(astroSprite(S.eq, look, 0), 266, 200, 40, 52); cosmeticAura(HUB_FX, 286, 252 - 22, S.eq); if (S.name && !HUB.panel) { const nw = textW(S.name, FS) + 6; ctx.globalAlpha = 0.7; rect(286 - nw / 2, 190, nw, 9, '#000'); ctx.globalAlpha = 1; text(S.name, 286, 192, COL.cream, FS, 1); } }
  else if (LT < 0.42) { const k = LT / 0.4; for (let y = sy + 40; y < 252; y += 2) { ctx.globalAlpha = 0.35 * (1 - k * 0.5); rect(274, y, 24, 1, y % 4 ? COL.blueL : COL.lilac); } ctx.globalAlpha = 1 - k; ctx.drawImage(astroSprite(S.eq, 1, 0), 266, Math.round(200 - k * 90), 40, 52); ctx.globalAlpha = 1; if (R0() < 0.6) HUB_FX.add({ x: 270 + R0() * 32, y: 250 - R0() * 50, vx: 0, vy: -80, life: 0.4, c: COL.lilac, s: 1 }); }
  HUB_FX.update(dt); HUB_FX.draw();
  // top shade
  for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.6 * (1 - i / 26); rect(0, i, W, 1, '#000'); } ctx.globalAlpha = 1;
  // left shade behind nav
  for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.55 * (1 - i / 70); rect(170 + i, 24, 1, 188, '#000'); } ctx.globalAlpha = 0.55; rect(0, 24, 170, 188, '#000'); ctx.globalAlpha = 1;
  if (flashing) { ctx.globalAlpha = 0.1 * Math.min(1, HUB.flashT) * (0.5 + 0.5 * Math.sin(T_NOW * 12)); rect(0, 0, W, H, fc); ctx.globalAlpha = 1; }
  if (LT !== null) { if (LT > 1.2) { ctx.globalAlpha = Math.min(1, (LT - 1.2) / 0.25); rect(0, 0, W, H, '#fafaff'); ctx.globalAlpha = 1; } textO(LT < 0.4 ? 'BOARDING' : LT < 0.75 ? 'ENGINES HOT' : 'LAUNCH!', W / 2 - 40, 34, COL.gold, '#000', FB, 1, 2); return; }
  if (!HUB.panel) drawHubTop();
  if (!S.name && !S.nameAsked && !NAMEUI.open && !HUB.panel && !HUB.choice && T_NOW > 0.6) openNameUI(true);
  if (!HUB.panel && !HUB.choice) { drawNav(); drawNextUp(); }
  else { ctx.globalAlpha = 0.35; drawNav(true); ctx.globalAlpha = 1; }
  if (HUB.panel) drawPanel();
  if (HUB.choice) drawChoiceOverlay();
}
function drawHubTop() {
  // level pill + title + xp
  const t = S.titles.eq && TITLES.find(t => t.id === S.titles.eq);
  panel(8, 5, 34, 14, { bg: COL.blue, bd: '#c9c0ff' }); text('LV ' + S.lvl, 25, 9, COL.ink, FB, 1);
  if (S.name) { text(S.name, 48, 6, COL.cream, FS); text(t ? t.n : 'ASTRONAUT', 48 + textW(S.name, FS) + 6, 6, COL.lilac, FS); } else text(t ? t.n : 'ASTRONAUT', 48, 6, COL.cream, FS);
  bar(48, 13, 90, 3, S.xp / xpNeed(S.lvl), COL.blueL, COL.void3, '#c9c0ff');
  // coins
  if (HUB.coinShow === null) HUB.coinShow = S.coins;
  HUB.coinShow = Math.abs(S.coins - HUB.coinShow) < 1 ? S.coins : lerp(HUB.coinShow, S.coins, 0.15);
  const cs = fmt(HUB.coinShow); const cw = textW(cs, FB, 2);
  drawCoinIcon(W - 70 - cw, 7); textO(cs, W - 60, 5, COL.gold, '#000', FB, 2, 2);
  // sound + music toggles
  const tog = (x, on, icon, tip, fn) => { if (button(x, 4, 16, 16, '', { tip, icon })) fn(); if (!on) line(x + 3, 7, x + 13, 17, COL.coral); };
  tog(W - 54, !SND.muted, (x, y, w, h, c) => { rect(x + 4, y + 6, 2, 4, c); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 10, y + 3); ctx.lineTo(x + 10, y + 13); ctx.lineTo(x + 6, y + 10); ctx.fill(); }, SND.muted ? 'SOUND IS OFF' : 'SOUND IS ON', () => { SND.setMute(!SND.muted); S.settings.mute = SND.muted; dirty(); });
  tog(W - 36, SND.musicOn, (x, y, w, h, c) => { rect(x + 5, y + 4, 1, 7, c); rect(x + 10, y + 3, 1, 7, c); rect(x + 5, y + 3, 6, 2, c); rect(x + 3, y + 10, 3, 2, c); rect(x + 8, y + 9, 3, 2, c); }, SND.musicOn ? 'MUSIC IS ON' : 'MUSIC IS OFF. CLICK TO TURN IT ON', () => { SND.setMusic(!SND.musicOn); S.settings.music = SND.musicOn; if (SND.musicOn) SND.playSong('hub'); dirty(); });
  drawOnlinePill(Math.max(168, 60 + textW((S.name ? S.name + ' ' : '') + (t ? t.n : 'ASTRONAUT'), FS) + 14), 5);
  if (button(W - 18, 4, 14, 16, '?', { font: FS, tip: 'W/S OR ARROWS TO PICK, ENTER TO OPEN. 1-8 JUMP STRAIGHT TO A ROOM' })) { }
}
function drawNav(dimmed) {
  const x = 10, w = 162;
  // LAUNCH: the big primary action
  const lh = 42, ly = 30; const lhov = !dimmed && inBox(x, ly, w, lh); if (lhov) HUB.sel = 0;
  const lsel = HUB.sel === 0;
  const pulse = 0.5 + 0.5 * Math.sin(T_NOW * 3);
  ctx.globalAlpha = 0.18 + 0.14 * pulse; rect(x - 3, ly - 3, w + 6, lh + 6, COL.gold); ctx.globalAlpha = 1;
  panel(x, ly, w, lh, { bg: lsel ? '#ffb83f' : COL.gold, bd: '#ffe2a8' });
  for (let i = 0; i < lh - 2; i++) if (i % 2 === 0) { ctx.globalAlpha = 0.07; rect(x + 1, ly + 1 + i, w - 2, 1, '#fff'); ctx.globalAlpha = 1; }
  drawIcon('rocket', x + 8, ly + 9, COL.navy, 2);
  text('LAUNCH', x + 36, ly + 8, COL.navy, FB, 0, 2);
  const nextP = Math.min(maxMapPlanet(), Math.max(1, S.planet.cur || 1));
  text(S.planet.landings ? `BACK TO ${planetDef(nextP).name}` : `FIRST STOP: ${planetDef(1).name}`, x + 36, ly + 27, COL.void3, FS);
  const lb = navBadge('launch'); if (lb) { const bw = textW(lb.t, FS) + 6; panel(x + w - bw - 4, ly - 5, bw, 10, { bg: COL.pink, bd: '#fff', flat: true }); text(lb.t, x + w - bw / 2 - 4, ly - 3, COL.navy, FS, 1); }
  if (lhov) { IN.cursor = 'pointer'; if (clickIn(x, ly, w, lh)) openStation('launch'); }
  // rows
  const ry0 = 80, rh = 21;
  for (let i = 1; i < NAV.length; i++) {
    const n = NAV[i], y = ry0 + (i - 1) * (rh + 2); const hov = !dimmed && inBox(x, y, w, rh); if (hov && HUB.sel !== i) { HUB.sel = i; SND.play('hover'); }
    const sel = HUB.sel === i;
    if (sel) { panel(x, y, w, rh, { bg: COL.void3, bd: COL.steel }); rect(x, y + 2, 2, rh - 4, COL.pink); }
    const off = sel ? 3 : 0;
    drawIcon(n.icon, x + 6 + off, y + 5, sel ? COL.pink : COL.blueL);
    text(n.n, x + 22 + off, y + 4, sel ? COL.ink : COL.cream, FB, 0, 2);
    const b = navBadge(n.id);
    if (b) { const bw = textW(b.t, FS) + 6; if (b.quiet) text(b.t, x + w - 5, y + 8, b.c, FS, 2); else { if (b.pulse) { ctx.globalAlpha = 0.3 + 0.25 * Math.sin(T_NOW * 6); rect(x + w - bw - 5, y + 3, bw + 4, 14, b.c); ctx.globalAlpha = 1; } panel(x + w - bw - 3, y + 5, bw, 10, { bg: b.c, bd: b.pulse ? '#fff' : b.c, flat: true }); text(b.t, x + w - bw / 2 - 3, y + 7, COL.navy, FS, 1); } }
    if (hov) { IN.cursor = 'pointer'; if (clickIn(x, y, w, rh)) openStation(n.id); }
  }
  if (!dimmed) { const s = NAV[HUB.sel].sub; wrap(s, w, FS).forEach((l, k) => text(l, x + 2, 244 + k * 7, COL.dim, FS)); }
  // first-time guidance
  if (!dimmed) {
    const tip = S.stats.crates === 0 ? [1, 'START HERE: OPEN A CRATE'] : S.planet.landings === 0 ? [0, 'NEXT: LAUNCH TO DUSTMOOR'] : null;
    if (tip) { const yy = tip[0] === 0 ? ly + 16 : ry0 + 5; const bx = x + w + 8 + Math.round(Math.sin(T_NOW * 6) * 3); ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.moveTo(bx, yy + 4); ctx.lineTo(bx + 6, yy); ctx.lineTo(bx + 6, yy + 8); ctx.fill(); const tw = textW(tip[1], FS) + 8; panel(bx + 7, yy - 2, tw, 12, { bg: COL.pink, bd: '#fff', flat: true }); text(tip[1], bx + 7 + tw / 2, yy + 1, COL.navy, FS, 1); }
  }
}
function drawNextUp() {
  // the goal: one clear next step with a reward
  const G = goalInfo(), done = S.goal.done;
  const x = 318, y = 28, w = 156; const lines = wrap(G.t, w - 12, FB).slice(0, 2);
  const h = 26 + lines.length * 9 + (G.sub ? 8 : 0) + (G.need > 1 ? 7 : 0) + 17;
  if (done) { ctx.globalAlpha = 0.2 + 0.15 * Math.sin(T_NOW * 5); rect(x - 3, y - 3, w + 6, h + 6, COL.gold); ctx.globalAlpha = 1; }
  panel(x, y, w, h, { bg: 'rgba(14,22,48,0.94)', bd: done ? COL.gold : COL.pink });
  rect(x + 1, y + 1, w - 2, 11, done ? COL.gold : 'rgba(30,39,73,0.95)');
  text(done ? 'GOAL DONE!' : `GOAL ${S.goal.i + 1}`, x + 6, y + 4, done ? COL.navy : COL.pink, FS);
  if (G.rw === 'choice') text('+ CHOICE CRATE', x + w - 6, y + 4, done ? COL.navy : COL.lilac, FS, 2);
  else { const rs = '+' + fmt(G.rw); text(rs, x + w - 6, y + 4, done ? COL.navy : COL.gold, FS, 2); drawCoinMini(x + w - 13 - textW(rs, FS), y + 4, done ? COL.navy : COL.gold); }
  let yy = y + 16; lines.forEach(l => { text(l, x + 6, yy, done ? COL.gold : COL.ink, FB); yy += 9; });
  if (G.sub) { text(G.sub, x + 6, yy, COL.dim, FS); yy += 8; }
  yy += 1; bar(x + 6, yy, w - 12, 3, Math.min(1, G.cur / G.need), done ? COL.gold : COL.pink, COL.void3); yy += 5;
  if (G.need > 1) { text(`${fmt(Math.min(G.cur, G.need))}/${fmt(G.need)}`, x + w - 6, yy, COL.dim, FS, 2); yy += 7; }
  yy += 1;
  if (done) { if (button(x + 6, yy, w - 12, 14, 'CLAIM REWARD', { kind: 'primary', font: FS }) || kp('KeyR')) { claimGoal(); HUB_FX.burst(x + w / 2, yy + 8, 40, { c: [COL.gold, '#fff', COL.pink], sp: 140, life: 0.8, s: 2, t: 'shrink' }); } }
  else if (button(x + 6, yy, w - 12, 14, 'GO', { kind: 'blue', font: FS, icon: (bx, by, bw, bh, c) => { for (let i = 0; i < 3; i++) line(bx + bw / 2 + 8 + i, by + 4, bx + bw / 2 + 11 + i, by + 7, c), line(bx + bw / 2 + 11 + i, by + 7, bx + bw / 2 + 8 + i, by + 10, c); } })) openStation(G.go);
  // today's contracts
  const C = ensureContracts(); let cy = y + h + 5; const ch = 14 + C.list.length * 15;
  panel(x, cy, w, ch, { bg: 'rgba(14,22,48,0.94)', bd: COL.mauve });
  rect(x + 1, cy + 1, w - 2, 10, 'rgba(30,39,73,0.95)'); text("TODAY'S CONTRACTS", x + 6, cy + 3, COL.lilac, FS); text(`${C.list.filter(c => c.claimed).length}/${C.list.length}`, x + w - 6, cy + 3, COL.mute, FS, 2);
  C.list.forEach((c, i) => {
    const I = contractInfo(c); const ry = cy + 13 + i * 15; const rw = contractReward(i);
    let t = I.t; while (textW(t, FS) > w - 52 && t.length > 6) t = t.slice(0, -1);
    text(t, x + 5, ry + 1, c.claimed ? COL.mute : c.done ? COL.gold : COL.ink, FS); bar(x + 5, ry + 8, w - 54, 2, I.cur / I.need, c.done ? COL.gold : COL.lilac, COL.void3);
    if (inBox(x + 2, ry - 1, w - 48, 13)) TIP.set(`${I.t}. ${I.cur}/${I.need}. TIP: ${I.why}. REWARD: ${rw === 'choice' ? 'A CHOICE CRATE' : fmt(rw) + ' COINS'}`);
    if (c.claimed) text('DONE', x + w - 6, ry + 3, COL.mute, FS, 2);
    else if (c.done) { if (button(x + w - 44, ry, 40, 12, 'CLAIM', { kind: 'primary', font: FS })) claimContract(i); }
    else text(rw === 'choice' ? 'CRATE' : fmt(rw), x + w - 6, ry + 3, rw === 'choice' ? COL.lilac : COL.gold, FS, 2);
  });
  // tracked build
  const T = trackInfo(); if (!T) return;
  const ty = cy + ch + 5; const hov = inBox(x, ty, w, 20);
  panel(x, ty, w, 20, { bg: hov ? 'rgba(30,39,73,0.95)' : 'rgba(14,22,48,0.94)', bd: COL.pink });
  let t = 'TRACKING: ' + T.t; while (textW(t, FS) > w - 10 && t.length > 6) t = t.slice(0, -1); text(t, x + 5, ty + 3, COL.pink, FS);
  bar(x + 5, ty + 12, w - 10, 3, T.cur / T.need, COL.pink, COL.void3);
  if (hov) { IN.cursor = 'pointer'; TIP.set(`${T.t}: ${T.cur}/${T.need}${T.sub ? '. ' + T.sub : ''}. CLICK TO GO THERE`); if (clickIn(x, ty, w, 20)) openStation(T.go); }
}
// ---------- panels ----------
function panelFrame(title, color = COL.gold, coins = false) {
  ctx.globalAlpha = 0.72; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  panel(6, 6, W - 12, H - 12, { bg: COL.void1, bd: COL.steel });
  rect(7, 7, W - 14, 18, COL.void2); rect(7, 25, W - 14, 1, COL.steel); rect(7, 7, 3, 18, color);
  text(title, 16, 11, COL.ink, FB, 0, 1); rect(16, 20, textW(title), 1, color);
  if (coins) { const cs = fmt(S.coins); drawCoinIcon(W - 84 - textW(cs), 11); text(cs, W - 74, 11, COL.gold, FB, 2); }
  if (button(W - 66, 8, 58, 16, 'CLOSE', { font: FS, kind: 'cream', tip: 'OR PRESS ESC', icon: (x, y, w, h, c) => { line(x + 6, y + 5, x + 11, y + 10, c); line(x + 11, y + 5, x + 6, y + 10, c); } })) { HUB.panel = null; SND.play('click'); return true; }
  return false;
}
function drawPanel() {
  const p = HUB.panel, st = HUB.ps[p];
  if (p === 'locker') return panelLocker(st);
  if (p === 'hangar') return panelHangar(st);
  if (p === 'collection') return panelCollection(st);
  if (p === 'workshop') return panelWorkshop(st);
  if (p === 'profile') return panelProfile(st);
  if (p === 'mining') return panelMining(st);
  if (p === 'social') return panelSocial(st);
}
function ownedFor(slot) {
  const want = slot === 'weapon2' ? 'weapon' : slot; const ids = Object.keys(S.inv).filter(id => { const d = getDef(id); return slotOf(d) === want; });
  ids.sort((a, b) => power(getDef(b), lvl(b)) - power(getDef(a), lvl(a)) || getDef(b).r - getDef(a).r);
  return ids;
}
const SLOT_LABEL = { weapon: 'WEAPON', weapon2: '2ND WPN', tool: 'TOOL', helmet: 'HELMET', chest: 'CHEST', boots: 'BOOTS', jetpack: 'JETPACK', o2: 'O2 TANK', eyewear: 'EYEWEAR', headgear: 'HEADGEAR', back: 'BACK', trail: 'TRAIL', killfx: 'KILL FX', skin_weapon: 'WPN SKIN', skin_armor: 'SUIT SKIN', skin_tool: 'TOOL SKIN', skin_ship: 'SHIP SKIN', backdrop: 'BACKDROP', engine: 'ENGINE', hull: 'HULL', cargo: 'CARGO', scanner: 'SCANNER', shield: 'SHIELD' };
function equipSlotGrid(st, x, y, w, h) {
  const slot = st.slot; const ids = ownedFor(slot); const optional = !SLOTS_GEAR.includes(slot) && !SLOTS_SHIP.includes(slot);
  const list = optional ? [null].concat(ids) : ids;
  text(`${SLOT_LABEL[slot]}: ${ids.length} OWNED`, x, y - 10, COL.ink, FS);
  const big = slot === 'weapon' || slot === 'skin_weapon';
  // sell mode
  if ((slot === 'weapon' || slot === 'weapon2') && S.eq[slot] && !st.sell && button(x + w - 112, y - 14, 44, 12, 'TEST IT', { font: FS, kind: 'blue', tip: 'TRY THIS WEAPON IN THE TEST RANGE' })) { startRange(S.eq[slot], 'locker'); return; }
  if (button(x + w - 64, y - 14, 64, 12, st.sell ? 'DONE SELLING' : 'SELL ITEMS', { font: FS, kind: st.sell ? 'cream' : 'def', tip: 'SELL GEAR YOU DO NOT NEED FOR COINS' })) { st.sell = !st.sell; st.sellSel = null; st.bulk = 0; SND.play('click'); }
  const gh = st.sell ? h - 26 : h;
  const c = itemGrid(st, list, x, y, w, gh, { cw: big ? 40 : 30, ch: big ? 22 : 26, sel: st.sell ? st.sellSel : S.eq[slot], empty: 'OPEN CRATES TO FIND MORE', eqd: st.sell ? Object.values(S.eq) : null });
  if (st.sell) {
    const by = y + h - 22; panel(x, by, w, 22, { bg: COL.void2, bd: COL.gold });
    const sid = st.sellSel && S.inv[st.sellSel] ? st.sellSel : null;
    if (sid) { const d = getDef(sid); let nm = d.name; while (textW(nm, FS) > w - 150 && nm.length > 6) nm = nm.slice(0, -1); text(nm, x + 6, by + 4, rcol(d.r) === 'RAINBOW' ? rainbow(T_NOW) : rcol(d.r), FS); text(`LEVEL ${lvl(sid)}`, x + 6, by + 12, COL.mute, FS);
      if (button(x + w - 140, by + 4, 84, 14, `SELL ${fmt(sellValue(sid))}`, { kind: 'primary', font: FS })) { const v = sellItem(sid); if (v) { SND.play('coin'); toast(`SOLD FOR ${fmt(v)} COINS`, COL.gold); } st.sellSel = null; }
      if (button(x + w - 52, by + 4, 46, 14, 'CANCEL', { font: FS })) st.sellSel = null; }
    else {
      const junk = ids.filter(id => !isEquipped(id) && getDef(id).r <= 1); const jv = junk.reduce((a, id) => a + sellValue(id), 0);
      text('CLICK AN ITEM TO SELL IT. EQUIPPED GEAR IS SAFE', x + 6, by + 8, COL.dim, FS);
      if (junk.length && button(x + w - 128, by + 4, 122, 14, st.bulk ? `SURE? +${fmt(jv)} COINS` : `SELL ${junk.length} COMMON+UNC`, { kind: st.bulk ? 'primary' : 'cream', font: FS, tip: 'SELLS EVERY UNEQUIPPED COMMON AND UNCOMMON IN THIS SLOT' })) {
        if (!st.bulk) st.bulk = 1; else { let t = 0; for (const id of junk) t += sellItem(id); st.bulk = 0; SND.play('coin'); SND.play('win'); toast(`SOLD ${junk.length} ITEMS FOR ${fmt(t)} COINS`, COL.gold); }
      }
    }
    if (c && c !== 'NONE') { if (isEquipped(c)) { SND.play('deny'); toast('THAT ONE IS EQUIPPED. SWAP IT OUT FIRST', COL.coral); } else { st.sellSel = c; st.bulk = 0; SND.play('click'); } }
    return;
  }
  if (c === 'NONE') { delete S.eq[slot]; SND.play('click'); dirty(); }
  else if (c) { equipped(c); if (S.eq[slot] !== c) S.stats.equips++; const other = slot === 'weapon' ? 'weapon2' : slot === 'weapon2' ? 'weapon' : null; if (other && S.eq[other] === c) S.eq[other] = S.eq[slot] || null; S.eq[slot] = c; if (!S.eq.weapon && S.eq.weapon2) { S.eq.weapon = S.eq.weapon2; S.eq.weapon2 = null; } SND.play('pickup'); dirty(); }
}
function panelLocker(st) {
  if (panelFrame('LOCKER', COL.gold, true)) return;
  // preview
  panel(14, 30, 80, 100, { bg: '#05070f', bd: COL.steel });
  ctx.globalAlpha = 0.35; for (let gx = 14; gx < 94; gx += 10) rect(gx, 31, 1, 98, COL.steel); for (let gy = 34; gy < 130; gy += 10) rect(15, gy, 78, 1, COL.steel); ctx.globalAlpha = 1;
  const dirs = [0, 3, 1, 2]; const dir = dirs[Math.floor(T_NOW / 1.5) % 4];
  shadow(54, 120, 18, 4, 0.5); ctx.drawImage(astroSprite(S.eq, dir, 0), 24, 42, 60, 78);
  // stats
  const L = loadout(); let yy = 136;
  const row = (k, v, c = COL.ink) => { text(k, 16, yy, COL.mute, FS); text(v, 92, yy, c, FS, 2); yy += 8; };
  row('HEALTH', fmt(L.hp)); row('RESIST', Math.round(L.armor * 100) + '%'); row('SPEED', (L.speed / 64).toFixed(2) + 'X'); row('OXYGEN', Math.round(L.o2) + 'S'); row('LIGHT', Math.round(L.light));
  row('BOOST', L.boostCd.toFixed(1) + 'S'); if (L.weapon) { const W2 = L.weapon; row('DPS', fmt(W2.cls === 'beam' ? W2.dmg : W2.dmg * W2.rate * (W2.pellets || 1)), COL.gold); }
  row('TOOL TIER', 'T' + L.toolTier, COL.mint); row('CRIT', Math.round(L.crit * 100) + '%'); if (L.frontier > 1) row('FRONTIER', '+' + Math.round((L.frontier - 1) * 100) + '%', COL.gold);
  for (const k in L.setAb) { text(SET_ABIL[k].n + (L.setAb[k] > 1 ? ' II' : ''), 16, yy, COL.pink, FS); yy += 7; }
  const sc = setCounts(); for (const s in sc.a) if (sc.a[s] >= 3) { text(`${SET_NAMES[s]} ${sc.a[s] >= 5 ? '5' : '3'}PC`, 16, yy, COL.magenta, FS); yy += 7; }
  // slots
  const col = (arr, x, y0, sp = 26) => arr.forEach((s, i) => { const y = y0 + i * sp; const id = S.eq[s]; const skin = s === 'weapon' ? S.eq.skin_weapon : s === 'tool' ? S.eq.skin_tool : null; if (slotBox(x, y, 42, sp - 1, id, SLOT_LABEL[s], st.slot === s, { skin, fresh: freshIn(s) > 0 })) { st.slot = s; st.scroll = 0; SND.play('click'); } });
  text('GEAR', 120, 28, COL.mute, FS); col(['weapon', 'weapon2'].concat(SLOTS_GEAR.slice(1)), 99, 36);
  text('STYLE', 166, 28, COL.mute, FS); col(SLOTS_COS.concat(['skin_weapon', 'skin_armor', 'skin_tool', 'backdrop']), 145, 36, 24);
  // grid
  rect(192, 30, 1, H - 44, COL.void3);
  equipSlotGrid(st, 198, 42, W - 212, H - 58);
}
function panelHangar(st) {
  if (panelFrame('HANGAR', COL.gold, true)) return;
  panel(14, 30, 200, 120, { bg: '#000000', bd: COL.steel });
  ctx.save(); ctx.beginPath(); ctx.rect(15, 31, 198, 118); ctx.clip();
  for (const s of STARS) { const x = 15 + ((s.x * 0.5 - T_NOW * 30 * s.z) % 198 + 198) % 198; px(x, 31 + s.y * 0.43, s.c); }
  drawShip(S.eq, 42, 50 + Math.round(Math.sin(T_NOW * 2) * 2), 3, T_NOW, { shield: true, thrust: 0.3 });
  ctx.restore();
  const rt = shipRating(); textO('' + rt, 222, 34, COL.cyan, '#000', FB, 0, 3); text('SHIP RATING', 222, 58, COL.dim, FS);
  const next = S.planet.reached + 1; const req = PLANET_REQ(next);
  text(`NEXT: ${planetDef(next).name}`, 222, 70, COL.ink, FS); text(`NEEDS ${req}`, 222, 78, rt >= req ? COL.mint : COL.coral, FS);
  bar(222, 87, 100, 5, rt / req, rt >= req ? COL.mint : COL.cyan, COL.void2);
  text('ENGINE COUNTS DOUBLE', 222, 98, COL.mute, FS);
  const sc = setCounts(); let yy = 108; for (const s in sc.s) if (sc.s[s] >= 2) { text(`${SET_NAMES[s]} FLEET ${sc.s[s]}/5`, 222, yy, sc.s[s] >= 3 ? COL.magenta : COL.dim, FS); yy += 7; if (sc.s[s] >= 3) { wrap(bonusLine(SHIP_SET_BONUS[s][sc.s[s] >= 5 ? 1 : 0]), 100, FS).forEach(l => { text(l, 226, yy, COL.magenta, FS); yy += 7; }); } }
  SLOTS_SHIP.concat(['skin_ship']).forEach((s, i) => { const x = 14 + i * 34; if (slotBox(x, 156, 32, 30, S.eq[s], SLOT_LABEL[s], st.slot === s, { fresh: freshIn(s) > 0 })) { st.slot = s; st.scroll = 0; SND.play('click'); } });
  text('SHIP CRATES COST 3X. BETTER PARTS UNLOCK NEW PLANETS', 14, 192, COL.mute, FS);
  if (button(14, 200, 120, 16, 'OPEN SHIP CRATES', { font: FS, kind: 'primary' })) { BAY.kind = 'ship'; BAY.auto = true; HUB.panel = null; setScene('crates'); }
  rect(330, 30, 1, H - 44, COL.void3);
  equipSlotGrid(st, 336, 42, W - 350, H - 58);
}
function panelCollection(st) {
  if (panelFrame('COLLECTION', COL.magenta)) return;
  st.tab = tabs(118, 10, ['PAGES', 'CODEX', 'DREAMS', 'REACTIONS'], st.tab, 54);
  if (st.tab === 0) pagesTab(st); else if (st.tab === 1) codexTab(st); else if (st.tab === 2) dreamsTab(st); else reactionsTab(st);
}
function pagesTab(st) {
  const list = PAGES.slice().sort((a, b) => { const sa = pageDone(a) && !S.pages[a.id] ? 2 : finisherOk(a) ? 1 : 0, sb = pageDone(b) && !S.pages[b.id] ? 2 : finisherOk(b) ? 1 : 0; if (sa !== sb) return sb - sa; const fa = S.pages[a.id] ? -1 : pageOwned(a) / a.ids.length, fb = S.pages[b.id] ? -1 : pageOwned(b) / b.ids.length; return fb - fa; });
  const x = 12, y = 30, w = 168, h = H - 44, RH = 17;
  const maxS = Math.max(0, list.length * RH - h); if (inBox(x, y, w, h)) st.ls = clamp((st.ls || 0) + IN.wheel * RH * 2, 0, maxS);
  if (!st.page) st.page = list[0].id;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  list.forEach((pg, i) => {
    const yy = y + i * RH - (st.ls || 0); if (yy < y - RH || yy > y + h) return;
    const sel = st.page === pg.id, hov = inBox(x, yy, w - 4, RH - 1) && inBox(x, y, w, h); const o = pageOwned(pg), n = pg.ids.length; const claimed = S.pages[pg.id], ready = o === n && !claimed;
    rect(x, yy, w - 4, RH - 1, sel ? COL.void3 : hov ? COL.void2 : COL.void1);
    text(pg.n, x + 4, yy + 2, claimed ? COL.mute : COL.ink, FS); text(pg.kind, x + w - 8, yy + 2, COL.mute, FS, 2);
    bar(x + 4, yy + 10, w - 40, 3, o / n, claimed ? COL.mute : ready ? COL.gold : COL.magenta, COL.void0);
    text(claimed ? 'DONE' : ready ? 'CLAIM!' : `${o}/${n}`, x + w - 8, yy + 9, ready ? (Math.floor(T_NOW * 4) % 2 ? COL.gold : '#fff') : COL.dim, FS, 2);
    if (hov && clickIn(x, yy, w - 4, RH - 1)) { st.page = pg.id; SND.play('click'); }
  });
  ctx.restore();
  const pg = PAGES.find(p => p.id === st.page); if (!pg) return;
  const dx = 190, dw = W - dx - 14; rect(184, 30, 1, H - 44, COL.void3);
  textO(pg.n, dx, 32, COL.magenta, '#000', FB); text(`${pg.kind}  ${pageOwned(pg)}/${pg.ids.length}`, dx, 42, COL.dim, FS);
  text(pg.hint, dx, 50, COL.mute, FS);
  text('REWARD: ' + REWARD_TXT(pg.rw), dx, 60, COL.gold, FS);
  if (pg.set) { const bon = pg.set[0] === 'a' ? ARMOR_SET_BONUS[pg.set[1]] : SHIP_SET_BONUS[pg.set[1]]; text(`SET BONUS 3: ${bonusLine(bon[0])}`, dx, 68, COL.cyan, FS); text(`5: ${bonusLine(bon[1])}`, dx, 75, COL.cyan, FS); }
  const cols = 4, cw = 64, ch = 46;
  pg.ids.forEach((id, i) => {
    const bx = dx + (i % cols) * (cw + 4), by = 86 + Math.floor(i / cols) * (ch + 4); const d = getDef(id), own = owned(id);
    panel(bx, by, cw, ch, { bg: COL.void0, bd: own ? (d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c) : COL.void3, flat: true });
    drawItemIn(id, bx + 2, by + 2, cw - 4, 26, { sil: !own, maxSc: 2, noFx: !own });
    if (own) { text(RAR[d.r].n, bx + cw / 2, by + 30, d.r === 6 ? 'RAINBOW' : RAR[d.r].c, FS, 1); text('LV ' + lvl(id), bx + cw / 2, by + 37, COL.cyan, FS, 1); }
    else { text('???', bx + cw / 2, by + 30, COL.mute, FS, 1); const rh = roleHint(id); let t = rh; while (textW(t, FS) > cw - 4 && t.length > 3) t = t.slice(0, -1); text(t, bx + cw / 2, by + 37, COL.dim, FS, 1); }
    if (inBox(bx, by, cw, ch)) TIP.set(own ? { item: id } : `MISSING: ${RAR[d.r].n} ${roleHint(id)}. FIND IT IN: ${whereToFind(id)}`);
  });
  const by = H - 34;
  if (pageDone(pg) && !S.pages[pg.id]) { if (button(dx, by, 150, 20, 'CLAIM REWARD', { col: '#4a3a10', tc: COL.gold })) claimPage(pg); }
  else if (S.pages[pg.id]) text('REWARD CLAIMED', dx, by + 6, COL.mint, FB);
  if (finisherOk(pg)) { if (button(dx + 156, by, dw - 156, 20, 'SET FINISHER CRATE', { col: '#3a1d4a', tc: COL.magenta, tip: 'A CRATE WITH ONLY YOUR MISSING PIECES' })) { BAY.kind = 'finisher:' + pg.id; BAY.auto = true; HUB.panel = null; setScene('crates'); } }
  else if (!pageDone(pg)) text(`OWN ${Math.ceil(pg.ids.length * 0.6)} FOR A FINISHER CRATE`, dx + 156, by + 7, COL.mute, FS);
}
function claimPage(pg) {
  S.pages[pg.id] = 1; const rw = pg.rw;
  if (rw.t === 'keys') earn(rw.v * 100); if (rw.t === 'coins') earn(rw.v); if (rw.t === 'choice') S.choiceQueue.push(rw.v);
  SND.play('fanfare'); toast(`${pg.n} COMPLETE: ${REWARD_TXT(rw)}`, COL.gold); HUB.flashT = 3; HUB.flashCol = COL.magenta; checkTitles(); dirty();
  if (rw.t === 'choice') { HUB.panel = null; nextQueuedChoice(); }
}
const CODEX_CATS = [['w', 'WEAPONS'], ['a', 'ARMOR'], ['s', 'SHIP'], ['t', 'MINING'], ['k', 'SKINS'], ['c', 'COSMETICS'], ['b', 'BACKDROPS']];
function codexTab(st) {
  st.cc = st.cc || 0; st.sub = st.sub || 0;
  CODEX_CATS.forEach(([c, n], i) => {
    const x = 12 + i * 66, y = 30; const ids = ALL_BASE[c]; const own = ids.filter(owned).length; const sel = st.cc === i; const hov = inBox(x, y, 62, 26);
    panel(x, y, 62, 26, { bg: sel ? COL.void3 : COL.void1, bd: sel ? COL.magenta : hov ? COL.line : COL.void3 });
    text(n, x + 31, y + 4, sel ? COL.ink : COL.dim, FS, 1); text(`${fmt(own)}/${fmt(ids.length)}`, x + 31, y + 12, COL.mute, FS, 1); bar(x + 4, y + 20, 54, 2, own / ids.length, COL.magenta, COL.void0);
    if (clickIn(x, y, 62, 26)) { st.cc = i; st.sub = 0; st.scroll = 0; SND.play('click'); }
  });
  const cat = CODEX_CATS[st.cc][0]; const subs = CATS[cat].subs;
  const sub = subs[st.sub % subs.length];
  if (button(12, 60, 14, 13, '<', { font: FS })) { st.sub = (st.sub + subs.length - 1) % subs.length; st.scroll = 0; }
  text(SUB_LABEL[sub] || sub, 58, 63, COL.ink, FS, 1);
  if (button(90, 60, 14, 13, '>', { font: FS })) { st.sub = (st.sub + 1) % subs.length; st.scroll = 0; }
  const ids = ALL_BASE[cat].filter(id => id.split('|')[1] === sub || (id.startsWith('x|') && cat === 'w' && ARTIFACTS[+id.slice(2)].cls === sub));
  const own = ids.filter(owned).length; text(`${own}/${ids.length} FOUND IN THIS GROUP. MISSING ITEMS SHOW THEIR ROLE AND WHERE TO LOOK`, 112, 63, COL.mute, FS);
  itemGrid(st, ids, 12, 78, W - 24, H - 92, { cw: cat === 'w' || cat === 'b' || sub === 'weapon' ? 30 : 24, ch: cat === 'w' || cat === 'b' || sub === 'weapon' ? 18 : 22 });
}
function panelWorkshop(st) {
  if (panelFrame('WORKSHOP', COL.orange)) return;
  if (st.pick) return blueprintPicker(st);
  st.tab = tabs(130, 10, ['BLUEPRINTS', 'EVOLVE', 'ARTIFACTS', 'RESEARCH'], st.tab, 66);
  const x = 14, y = 32;
  if (st.tab === 0) {
    text('FINISH A WEAPON CHALLENGE TO EARN A BLUEPRINT. A BLUEPRINT BUILDS A WEAPON YOU CHOOSE, NO DROP NEEDED', x, y, COL.dim, FS);
    CLASSES.forEach((c, i) => {
      const yy = y + 10 + i * 19; const m = S.mast[c] || { k: 0, c: 0 }; const stp = Math.min(m.c, MAST_STEPS.length - 1); const need = MAST_STEPS[stp]; const done = m.c >= MAST_STEPS.length;
      panel(x, yy, 452, 17, { bg: COL.void1, bd: COL.void3, flat: true });
      text(CLS[c].n, x + 6, yy + 3, COL.ink, FS); text(`DEFEAT ${need} ALIENS WITH A ${CLS[c].n}`, x + 90, yy + 3, COL.dim, FS);
      bar(x + 90, yy + 11, 160, 3, done ? 1 : m.k / need, COL.orange, COL.void0); text(done ? 'ALL DONE' : `${Math.min(m.k, need)}/${need}`, x + 256, yy + 8, COL.dim, FS);
      const maxR = Math.min(5, 2 + stp); const bp = (S.bp || {})[c] || 0;
      if (!done && m.k >= need) { if (button(x + 300, yy + 2, 70, 13, 'CLAIM', { font: FS, col: '#4a3010', tc: COL.gold })) { m.c++; S.bp = S.bp || {}; S.bp[c] = Math.max(S.bp[c] || 0, maxR + 1); S.mast[c] = m; SND.play('fanfare'); toast(`${CLS[c].n} BLUEPRINT EARNED (UP TO ${RAR[maxR].n})`, COL.orange); dirty(); } }
      if (bp) { if (button(x + 376, yy + 2, 72, 13, `BUILD ${RAR[bp - 1].n.slice(0, 4)}`, { font: FS, col: '#1d3a4a', tc: COL.cyan })) { st.pick = { cls: c, maxR: bp - 1 }; st.pscroll = 0; } }
      else text(`NEXT: UP TO ${RAR[maxR].n}`, x + 376, yy + 5, COL.mute, FS);
    });
  } else if (st.tab === 1) {
    text('ANY COMMON, UNCOMMON OR RARE WEAPON CAN EVOLVE. USE IT ON PLANETS TO FILL ITS QUEST', x, y, COL.dim, FS);
    const ws = Object.keys(S.inv).filter(id => { const d = getDef(id); return d.cat === 'w' && d.r <= 2 && !d.evo && d.o.t !== 'art'; }).sort((a, b) => (S.ikills[b] || 0) - (S.ikills[a] || 0)).slice(0, 10);
    if (!ws.length) text('NO WEAPONS CAN EVOLVE YET', W / 2, 120, COL.mute, FB, 1);
    ws.forEach((id, i) => {
      const yy = y + 10 + i * 21; const d = getDef(id); const k = S.ikills[id] || 0, need = EVO_NEED[d.r]; const eid = 'e|' + id; const has = owned(eid);
      panel(x, yy, 452, 19, { bg: COL.void1, bd: COL.void3, flat: true }); drawItemIn(id, x + 2, yy + 1, 28, 17, { maxSc: 1 });
      text(d.name, x + 34, yy + 3, RAR[d.r].c, FS); text(`QUEST: DEFEAT ${need} ALIENS WITH IT`, x + 34, yy + 11, COL.mute, FS);
      bar(x + 220, yy + 8, 120, 3, k / need, COL.mint, COL.void0); text(`${Math.min(k, need)}/${need}`, x + 346, yy + 6, COL.dim, FS);
      if (has) text('EVOLVED', x + 400, yy + 6, COL.mint, FS);
      else if (k >= need) { if (button(x + 384, yy + 3, 64, 13, 'EVOLVE', { font: FS, col: '#1d4a3a', tc: COL.mint })) { addItem(eid); S.eq.weapon = eid; SND.play('reveal', getDef(eid).r); HUB.flashT = 3; HUB.flashCol = RAR[getDef(eid).r].c; toast(`EVOLVED INTO ${getDef(eid).name}!`, COL.mint); dirty(); } }
      if (inBox(x + 2, yy + 1, 28, 17)) TIP.set({ item: id });
      if (inBox(x + 384, yy + 3, 64, 13) && !has) TIP.set({ item: eid });
    });
  } else if (st.tab === 2) {
    text('CLUES IN PLANET WRECKS REVEAL HOW ORDINARY ITEMS COMBINE INTO A UNIQUE ARTIFACT', x, y, COL.dim, FS);
    ARTIFACTS.forEach((A, k) => {
      const yy = y + 10 + k * 34; const ing = artifactIngredients(k); const cl = S.clues[k] || [0, 0, 0]; const aid = 'x|' + k; const done = owned(aid);
      panel(x, yy, 452, 32, { bg: COL.void1, bd: done ? 'RAINBOW' === RAR[6].c ? rainbow(T_NOW) : COL.gold : COL.void3, flat: true });
      drawItemIn(aid, x + 3, yy + 3, 40, 26, { sil: !done, maxSc: 1 }); text(A.n, x + 48, yy + 4, done ? 'RAINBOW' : COL.ink, FB); text(A.txt, x + 48, yy + 14, COL.dim, FS);
      ing.forEach((id, j) => { const bx = x + 260 + j * 46; const known = cl[j]; panel(bx, yy + 3, 42, 26, { bg: COL.void0, bd: known ? (owned(id) ? COL.mint : COL.gold) : COL.void3, flat: true }); if (known) { drawItemIn(id, bx + 1, yy + 4, 40, 18, { sil: !owned(id), maxSc: 1 }); text(owned(id) ? 'OWNED' : 'NEEDED', bx + 21, yy + 22, owned(id) ? COL.mint : COL.gold, FS, 1); if (inBox(bx, yy + 3, 42, 26)) TIP.set(owned(id) ? { item: id } : `NEEDED: ${getDef(id).name}. FIND: ${whereToFind(id)}`); } else { text('?', bx + 21, yy + 10, COL.mute, FB, 1); if (inBox(bx, yy + 3, 42, 26)) TIP.set('FIND A CLUE IN A PLANET WRECK'); } });
      const ready = !done && cl.every(Boolean) && ing.every(owned);
      if (ready && button(x + 400, yy + 9, 48, 14, 'FORGE', { font: FS, col: '#4a3010', tc: COL.gold })) { addItem(aid); S.forged[k] = 1; SND.play('reveal', 6); HUB.flashT = 4; HUB.flashCol = 'RAINBOW'; toast(`FORGED ${A.n}!`, COL.gold); checkTitles(); dirty(); }
    });
  } else {
    text('MAXED ITEMS TURN EXTRA COPIES INTO RESEARCH MATERIAL', x, y, COL.dim, FS);
    textO(fmt(S.research), x, y + 14, COL.ink, '#000', FB, 0, 2); text('RESEARCH MATERIAL', x, y + 32, COL.mute, FS);
    const trade = (yy, cost, label, fn) => { panel(x, yy, 300, 22, { bg: COL.void1, bd: COL.void3, flat: true }); text(label, x + 6, yy + 4, COL.ink, FS); text(`${cost} RESEARCH`, x + 6, yy + 12, COL.mute, FS); if (button(x + 220, yy + 4, 74, 14, 'TRADE', { font: FS, disabled: S.research < cost })) { S.research -= cost; fn(); SND.play('win'); dirty(); } };
    trade(y + 44, 10, '150 COINS', () => { earn(150); toast('+150 COINS', COL.gold); });
    trade(y + 70, 80, 'RANDOM BLUEPRINT (UP TO RARE)', () => { const c = R0.pick(CLASSES); S.bp = S.bp || {}; S.bp[c] = Math.max(S.bp[c] || 0, 3); toast(`${CLS[c].n} BLUEPRINT (UP TO RARE)`, COL.orange); });
    trade(y + 96, 300, 'RANDOM BLUEPRINT (UP TO EPIC)', () => { const c = R0.pick(CLASSES); S.bp = S.bp || {}; S.bp[c] = Math.max(S.bp[c] || 0, 4); toast(`${CLS[c].n} BLUEPRINT (UP TO EPIC)`, COL.orange); });
    trade(y + 122, 40, 'CHOICE CRATE (COMET TIER)', () => { S.choiceQueue.push(1); HUB.panel = null; nextQueuedChoice(); });
  }
}
function blueprintPicker(st) {
  const P = st.pick; const x = 14, y = 32;
  textO(`BUILD A ${CLS[P.cls].n}: PICK ANY ONE, UP TO ${RAR[P.maxR].n}`, x, y - 2, COL.orange, '#000', FB);
  if (!P.cands) {
    const set = new Set(); for (const pg of PAGES) for (const id of pg.ids) { const d = getDef(id); if (d.cat === 'w' && d.sub === P.cls && d.r <= P.maxR && !owned(id) && d.o.t !== 'boss') set.add(id); }
    const R = RNG(Date.now() & 0xffff); const pool = POOLS['class:' + P.cls]; for (let r = P.maxR; r >= 0 && set.size < 24; r--) { const arr = pool[r].slice(); R.shuffle(arr); for (const id of arr.slice(0, 5)) set.add(id); }
    P.cands = [...set].sort((a, b) => getDef(b).r - getDef(a).r).slice(0, 30);
  }
  text('MISSING PIECES FROM YOUR COLLECTION PAGES COME FIRST. HOVER TO PREVIEW', x, y + 10, COL.dim, FS);
  const c = itemGrid(st, P.cands, x, y + 20, W - 28, H - 80, { cw: 40, ch: 24, allOwned: true });
  if (c && c !== 'NONE') { addItem(c); S.bp[P.cls] = 0; st.pick = null; SND.play('reveal', getDef(c).r); toast(`BUILT ${getDef(c).name}`, COL.orange); dirty(); }
  if (button(x, H - 34, 100, 18, 'CANCEL', { font: FS })) st.pick = null;
}
function panelProfile(st) {
  if (panelFrame('TROPHIES & SKILLS', COL.gold)) return;
  const x = 14, y = 30;
  textO('LEVEL ' + S.lvl, x, y, COL.cyan, '#000', FB, 0, 2); bar(x, y + 18, 150, 4, S.xp / xpNeed(S.lvl), COL.cyan, COL.void2); text(`${fmt(S.xp)}/${fmt(xpNeed(S.lvl))} XP`, x, y + 25, COL.mute, FS);
  text(`${S.sp} SKILL POINT${S.sp === 1 ? '' : 'S'}`, x + 150, y + 25, S.sp ? COL.gold : COL.mute, FS, 2);
  SKILLS.forEach((sk, i) => {
    const yy = y + 36 + i * 24; const r = S.skills[sk.id];
    panel(x, yy, 220, 22, { bg: COL.void1, bd: COL.void3, flat: true });
    text(sk.n, x + 5, yy + 3, COL.ink, FB); text(sk.txt(r), x + 5, yy + 13, COL.dim, FS);
    for (let k = 0; k < sk.max; k++) rect(x + 90 + k * 6, yy + 4, 5, 4, k < r ? COL.cyan : COL.void3);
    if (button(x + 196, yy + 4, 20, 14, '+', { disabled: !S.sp || r >= sk.max })) { S.sp--; S.skills[sk.id]++; SND.play('levelup'); dirty(); }
  });
  let yy = y + 136;
  if (S.nova.count > 0) {
    text(`SUPERNOVA X${S.nova.count}  STARS: ${S.nova.stars}`, x, yy, COL.magenta, FB); yy += 10;
    NOVA_PERKS.forEach(pk => { const r = S.nova.perks[pk.id]; text(`${pk.n} ${r}/${pk.max}: ${pk.txt(r)}`, x, yy + 2, COL.dim, FS); if (button(x + 196, yy, 20, 11, '+', { font: FS, disabled: !S.nova.stars || r >= pk.max })) { S.nova.stars--; S.nova.perks[pk.id]++; dirty(); } yy += 13; });
  }
  const s = S.stats; const lines = [['CRATES OPENED', s.crates], ['ALIENS DEFEATED', s.kills], ['ORE HAULED', s.ore], ['COINS EARNED', s.coinsEarned], ['WRECKS LOOTED', s.wrecks], ['BEST COMBO', 'X' + s.bestCombo], ['ITEMS FOUND', Object.keys(S.inv).length], ['LEGENDARY+', s.legendaries + s.mythics + s.cosmics], ['STAGGERS', s.staggers || 0], ['PERFECT DODGES', s.perfects || 0], ['REACTIONS FOUND', Object.keys(S.reactions || {}).length + '/' + REACT_KEYS.length], ['EVENTS WON', s.events || 0], ['CACHES DUG UP', s.caches || 0], ['DREAMS FOUND', Object.keys(S.inv).filter(isDream).length + '/' + DREAMS.length]];
  yy = Math.max(yy + 4, 196); lines.forEach(([k, v], i) => { const cx = x + (i % 2) * 112, cy = yy + Math.floor(i / 2) * 9; text(k, cx, cy, COL.mute, FS); text(typeof v === 'number' ? fmt(v) : v, cx + 106, cy, COL.ink, FS, 2); });
  // titles
  const tx = 250; text('TITLES', tx, y, COL.gold, FB); text('CLICK AN EARNED TITLE TO WEAR IT', tx + 50, y + 1, COL.mute, FS);
  TITLES.forEach((t, i) => {
    const bx = tx + (i % 2) * 108, by = y + 12 + Math.floor(i / 2) * 22; const e = S.titles.earned[t.id], eqd = S.titles.eq === t.id; const hov = inBox(bx, by, 104, 20);
    panel(bx, by, 104, 20, { bg: eqd ? '#3a3010' : COL.void1, bd: eqd ? COL.gold : e ? COL.line : COL.void3, flat: true });
    text(e ? t.n : '???', bx + 4, by + 3, e ? (eqd ? COL.gold : COL.ink) : COL.mute, FS); let rq = t.req; while (textW(rq, FS) > 98) rq = rq.slice(0, -1); text(rq, bx + 4, by + 11, COL.mute, FS);
    if (hov && e && clickIn(bx, by, 104, 20)) { S.titles.eq = eqd ? null : t.id; SND.play('click'); dirty(); }
  });
  // callsign
  text('CALLSIGN', 250, H - 38, COL.mute, FS); text(S.name || 'NOT SET', 250, H - 30, S.name ? COL.cream : COL.mute, FB);
  if (button(250 + Math.max(textW(S.name || 'NOT SET', FB), 40) + 6, H - 32, 44, 13, S.name ? 'RENAME' : 'SET', { font: FS, kind: 'blue' })) openNameUI(!S.name);
  // reset
  if (!st.reset) { if (button(W - 96, H - 30, 80, 14, 'RESET SAVE', { font: FS, col: '#2a0a14', tc: COL.coral })) st.reset = true; }
  else { text('ERASE EVERYTHING?', W - 210, H - 27, COL.coral, FS); if (button(W - 120, H - 30, 50, 14, 'YES', { font: FS, col: '#5a1020' })) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } S = newState(); save(); HUB.panel = null; toast('NEW GAME STARTED', COL.mint); } if (button(W - 66, H - 30, 50, 14, 'NO', { font: FS })) st.reset = false; }
}
function panelMining(st) {
  if (panelFrame('MINING OFFICE', COL.mint, true)) return;
  tickMiners();
  const x = 14, y = 30; const slots = minerSlots(); const miners = Object.keys(S.inv).filter(id => id.startsWith('t|miner'));
  text('BEAT A PLANET BOSS TO OPEN A MINING SLOT THERE. AUTO-MINERS EARN COINS WHILE YOU ARE AWAY (UP TO 8 HOURS)', x, y, COL.dim, FS);
  let total = 0; for (const k in S.miners.acc) total += S.miners.acc[k];
  drawCoinIcon(x, y + 12); text(fmt(total) + ' WAITING', x + 10, y + 12, COL.gold, FB);
  if (button(x + 150, y + 9, 90, 14, 'COLLECT ALL', { font: FS, disabled: total < 1, col: '#4a3a10', tc: COL.gold })) { earn(Math.floor(total)); S.miners.acc = {}; SND.play('coin'); SND.play('win'); toast(`+${fmt(total)} COINS FROM AUTO-MINERS`, COL.gold); dirty(); }
  if (!slots.length) text('NO SLOTS YET. BEAT THE BURROW QUEEN ON DUSTMOOR', W / 2, 120, COL.mute, FB, 1);
  slots.forEach((p, i) => {
    const bx = x + (i % 2) * 226, by = y + 30 + Math.floor(i / 2) * 36; const id = S.miners.slots[p]; const sel = st.mslot === p;
    panel(bx, by, 222, 34, { bg: sel ? COL.void3 : COL.void1, bd: sel ? COL.mint : COL.void3, flat: true });
    text(planetDef(p).name, bx + 4, by + 3, COL.ink, FS); text(`ORE: ${planetDef(p).ore[0]}`, bx + 4, by + 11, COL.mute, FS);
    if (id) { drawItemIn(id, bx + 100, by + 3, 26, 26, { maxSc: 1 }); text(`${fmt(minerRate(id, p))}/MIN`, bx + 130, by + 6, COL.mint, FS); text(`${fmt(S.miners.acc[p] || 0)} READY`, bx + 130, by + 16, COL.gold, FS); }
    else text('EMPTY SLOT', bx + 110, by + 12, COL.gold, FS);
    if (clickIn(bx, by, 222, 34)) { st.mslot = p; SND.play('click'); }
  });
  if (st.mslot) {
    text(`PLACE A MINER ON ${planetDef(st.mslot).name}:`, x, H - 64, COL.ink, FS);
    const c = itemGrid(st, miners, x, H - 56, W - 28, 40, { cw: 30, ch: 26, empty: 'FIND AUTO-MINERS IN MINING CRATES' });
    if (c && c !== 'NONE') { for (const p in S.miners.slots) if (S.miners.slots[p] === c) delete S.miners.slots[p]; S.miners.slots[st.mslot] = c; SND.play('pickup'); dirty(); }
  }
}

// ---------- star map ----------
const MAP = { scroll: 0, sel: 1, spheres: {}, sT: 0, init: false };
function mapPos(n) { return { x: 70 + (n - 1) * 92, y: 108 + Math.sin(n * 0.85) * 44 + (n % 2 ? 12 : -12) }; }
function maxMapPlanet() { return Math.max(20, S.planet.bosses[20] ? S.planet.reached + 1 : 20); }
function drawMap(dt) {
  if (!MAP.init) { MAP.init = true; ensureEvents(); const nx = S.planet.reached + 1; MAP.sel = (nx <= maxMapPlanet() && shipRating() >= PLANET_REQ(nx)) ? nx : Math.min(maxMapPlanet(), S.planet.cur || 1); MAP.scroll = clamp(mapPos(MAP.sel).x - W / 2, 0, mapPos(maxMapPlanet()).x - W + 70); }
  const maxS = Math.max(0, mapPos(maxMapPlanet()).x - W + 70);
  if (IN.wheel) MAP.scroll = clamp(MAP.scroll + IN.wheel * 50, 0, maxS);
  if (key('ArrowRight') || key('KeyD')) MAP.scroll = clamp(MAP.scroll + 240 * dt, 0, maxS); if (key('ArrowLeft') || key('KeyA')) MAP.scroll = clamp(MAP.scroll - 240 * dt, 0, maxS);
  if (IN.down && IN.my > 22 && IN.my < 190) { MAP.scroll = clamp(MAP.scroll - (IN.mx - (MAP.lmx ?? IN.mx)), 0, maxS); if (Math.abs(IN.dragX) > 4) MAP.dragging = true; } MAP.lmx = IN.mx; if (!IN.down) MAP.dragging = false;
  drawStarfield(dt, 0.1, { ox: MAP.scroll * 0.3 });
  const ox = MAP.scroll; const rt = shipRating(); const top = maxMapPlanet();
  MAP.sT += dt; const redraw = MAP.sT > 0.15; if (redraw) MAP.sT = 0;
  // path
  for (let n = 1; n < top; n++) { const a = mapPos(n), b = mapPos(n + 1); const lit = n + 1 <= S.planet.reached; for (let k = 0; k < 1; k += 0.04) { const x = lerp(a.x, b.x, k) - ox, y = lerp(a.y, b.y, k); if (x < -10 || x > W + 10) continue; const blink = lit && ((k * 25 + T_NOW * 6) % 4 < 1); px(x, y, lit ? (blink ? '#fafaff' : COL.gold) : '#273469'); } }
  for (let n = 1; n <= top; n++) {
    const p = planetDef(n), pos = mapPos(n); const x = pos.x - ox, y = pos.y; if (x < -40 || x > W + 40) continue;
    const req = PLANET_REQ(n); const ok = n <= S.planet.reached || rt >= req; const r = n === 20 ? 24 : 16 + (n * 7 % 5);
    let sp = MAP.spheres[n]; if (!sp || (redraw && Math.abs(x - W / 2) < 300)) { sp = MAP.spheres[n] = renderSphere(p, r, T_NOW * 0.25 + n, { dim: !ok, canvas: sp }); }
    const sel = MAP.sel === n; const hov = Math.hypot(IN.mx - x, IN.my - y) < r + 6;
    if (sel) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T_NOW * 4); circ(x, y, r + 7, COL.gold); ctx.globalAlpha = 1; ring(x, y, r + 9, COL.gold); }
    drawRings(p, x, y, r, false, ok ? 1 : 0.35); ctx.drawImage(sp, Math.floor(x - r - sp.pad), Math.floor(y - r - sp.pad)); drawRings(p, x, y, r, true, ok ? 1 : 0.35);
    text(p.name, x, y + r + 8, ok ? (sel ? COL.ink : COL.dim) : COL.mute, FS, 1);
    if (!ok) { rect(x - 4, y - 2, 9, 7, COL.lilac); rect(x - 4, y - 2, 9, 1, '#fff'); ring(x, y - 3, 3, COL.lilac); px(x, y + 1, COL.navy); text('NEED ' + req, x, y + r + 15, COL.coral, FS, 1); }
    else if (S.planet.bosses[n]) { line(x + r - 2, y - r + 1, x + r, y - r + 3, COL.mint); line(x + r, y - r + 3, x + r + 4, y - r - 2, COL.mint); }
    if (p.mastery) { const stt = S.planet.stars[n] || [0, 0, 0]; for (let k = 0; k < 3; k++) text('*', x - 6 + k * 6, y - r - 10, stt[k] ? COL.gold : COL.steel, FS, 1); }
    const ek = ok && S.tutorial.planet && S.planet.landings > 0 && S.planet.ev[n]; if (ek) { const E = EVENTS[ek]; const yy = y + r + 22 + (ok ? 0 : 7); const tw = textW(E.tag, FS) + 6; panel(x - tw / 2, yy - 2, tw, 9, { bg: COL.void0, bd: E.c, flat: true }); text(E.tag, x, yy, E.c, FS, 1); }
    if (n === (S.planet.cur || 1) && S.planet.landings) { const b = Math.round(Math.sin(T_NOW * 5) * 2); text('YOU', x, y - r - 18 + b, COL.pink, FS, 1); }
    if (hov) { IN.cursor = 'pointer'; if (IN.rl && Math.abs(IN.dragX) < 5) { MAP.sel = n; SND.play('click'); } }
  }
  if (drawTopBar('STAR MAP', true) || kp('Escape')) { MAP.init = false; goHub(); return; }
  // info panel
  const n = MAP.sel, p = planetDef(n), req = PLANET_REQ(n), ok = n <= S.planet.reached || rt >= req;
  panel(4, 192, W - 8, 74, { bg: 'rgba(14,22,48,0.96)', bd: ok ? COL.gold : COL.steel, notch: true });
  let big = MAP.big; if (!big || big.n !== n || redraw) { big = MAP.big = renderSphere(p, 28, T_NOW * 0.2, { canvas: big && big.n === n ? big : null }); big.n = n; }
  drawRings(p, 40, 229, 28, false); ctx.drawImage(big, 40 - 28 - big.pad, 229 - 28 - big.pad); drawRings(p, 40, 229, 28, true);
  textO(`${n}. ${p.name}`, 78, 197, COL.ink, '#000', FB); text(p.look, 78, 207, COL.dim, FS);
  text(p.trait ? `HAZARD: ${p.trait}. ${TRAIT_TXT[p.trait]}` : 'NO HAZARDS', 78, 215, p.trait ? COL.orange : COL.mute, FS);
  oreIcon(n, 78, 221); text(`${p.ore[0]}  TIER ${p.ore[1]} ORE  ${ORE_VALUE(p.ore[1])} COINS EACH`, 94, 226, COL.ink, FS);
  text(`BOSS: ${p.boss[0]}${S.planet.bosses[n] ? (S.planet.bossCd[n] > 0 ? ` (BACK IN ${S.planet.bossCd[n]} LANDINGS)` : ' (READY AGAIN)') : ' (DROPS 3 CRATES)'}`, 78, 236, S.planet.bosses[n] ? COL.mint : COL.coral, FS);
  text(`ALIENS: ${p.alien[0]}S  THREAT ${'!'.repeat(Math.min(10, Math.ceil(n / 2)))}`, 78, 244, COL.dim, FS);
  const evk = S.tutorial.planet && S.planet.landings > 0 ? S.planet.ev[n] : null; if (evk) { const E = EVENTS[evk]; text(`EVENT: ${E.n} (${E.tag})  +${E.rw} CRATE${E.rw > 1 ? 'S' : ''}`, 78, 252, E.c, FS); text(E.txt, 78, 259, COL.dim, FS); }
  if (p.mastery) { const stt = S.planet.stars[n] || [0, 0, 0]; p.mastery.forEach((c, k) => text(`${stt[k] ? '*' : '-'} ${MASTERY_TXT(c)}`, 290, 197 + k * 8, stt[k] ? COL.gold : COL.dim, FS)); text('3 STARS: EXCLUSIVE COSMETIC', 290, 221, COL.magenta, FS); }
  text(n === 1 ? 'NO SHIP RATING NEEDED' : `SHIP RATING ${rt} / ${req}`, 290, 229, ok ? COL.lilac : COL.coral, FS);
  if (ok) { const lbl = (S.planet.visited[n] ? 'LAND ON ' : 'WARP TO ') + p.name; ctx.globalAlpha = 0.2 + 0.15 * Math.sin(T_NOW * 4); rect(W - 152, 238, 146, 26, COL.gold); ctx.globalAlpha = 1; if (button(W - 150, 240, 142, 22, lbl, { kind: 'primary' }) || kp('Enter') || kp('Space')) { MAP.init = false; if (!S.planet.visited[n]) startWarp(n); else startRun(n); } }
  else { button(W - 150, 240, 142, 22, 'NEED RATING ' + req, { disabled: true }); if (button(W - 204, 240, 50, 22, 'HANGAR', { font: FS, kind: 'blue', tip: 'BETTER SHIP PARTS RAISE YOUR RATING' })) { MAP.init = false; goHub(); openStation('hangar'); } }
  if (S.planet.bosses[20] && n >= 20) { if (button(W - 230, 240, 108, 20, 'GO SUPERNOVA', { col: '#4a1d3a', tc: COL.magenta, tip: 'RESET PLANETS AND COINS. KEEP EVERY ITEM. GAIN STARS, BETTER ORE AND THE SINGULARITY TIER' })) MAP.nova = true; }
  if (MAP.nova) drawNovaConfirm();
  text('CLICK A PLANET. DRAG OR SCROLL TO MOVE', W - 8, 23, COL.dim, FS, 2);
}
function drawNovaConfirm() {
  ctx.globalAlpha = 0.8; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  panel(80, 50, 320, 150, { bd: COL.magenta, notch: true, notchCol: COL.magenta });
  textO('GO SUPERNOVA?', W / 2, 60, COL.magenta, '#000', FB, 1, 2);
  ['YOUR HOME STAR EXPLODES AND YOU WARP TO A HARDER GALAXY.', 'YOU KEEP: EVERY ITEM, LEVELS, SHIP, COSMETICS, TITLES, XP.', 'RESETS: PLANET PROGRESS AND COINS.', 'YOU GAIN: +3 SUPERNOVA STARS, +50% ORE VALUE PER NOVA,', 'THE SINGULARITY CRATE TIER AND AN EXCLUSIVE BACK ITEM.'].forEach((l, i) => text(l, W / 2, 84 + i * 10, i === 3 || i === 4 ? COL.mint : COL.ink, FS, 1));
  if (button(W / 2 - 110, 160, 100, 20, 'DO IT', { col: '#4a1d3a', tc: COL.magenta })) { goSupernova(); MAP.nova = false; }
  if (button(W / 2 + 10, 160, 100, 20, 'NOT YET')) MAP.nova = false;
}
function goSupernova() {
  S.nova.count++; S.nova.stars += 3; S.coins = 0;
  S.planet = { reached: 1, cur: 1, visited: {}, bosses: {}, bossCd: {}, stars: S.planet.stars, landings: S.planet.landings, ev: {} };
  S.miners.slots = {}; S.miners.acc = {};
  const id = novaItem(S.nova.count); addItem(id); checkTitles(); dirty(); save();
  flash(1, '#fff'); SND.play('bigboom'); SND.play('reveal', 6); toast(`SUPERNOVA ${S.nova.count}! ${getDef(id).name} UNLOCKED`, COL.magenta); HUB.flashT = 5; HUB.flashCol = 'RAINBOW';
  MAP.init = false; MAP.spheres = {}; goHub();
}
// ---------- warp cutscene ----------
let WARP = null;
function startWarp(n) { WARP = { n, t: 0, stars: [] }; for (let i = 0; i < 200; i++) WARP.stars.push({ a: Math.random() * TAU, d: Math.random() * 300, s: 0.5 + Math.random() }); SND.play('warp'); SND.playSong(null); setScene('warp'); }
function drawWarp(dt) {
  const w = WARP; w.t += dt; const p = planetDef(w.n);
  rect(0, 0, W, H, '#02030a');
  if (w.t < 2.6) {
    const sp = Math.min(1, w.t / 1.2); const hue = (w.t * 120) % 360;
    for (const s of w.stars) { s.d += (40 + s.d * 2.5) * sp * s.s * dt * 3; if (s.d > 320) s.d = Math.random() * 20; const x0 = W / 2 + Math.cos(s.a) * s.d, y0 = H / 2 + Math.sin(s.a) * s.d * 0.7; const L = s.d * 0.25 * sp; line(x0, y0, x0 - Math.cos(s.a) * L, y0 - Math.sin(s.a) * L * 0.7, hex(hsl(hue + s.a * 30, 0.8, 0.7))); }
    const sh = Math.round((Math.random() - 0.5) * 4 * sp);
    drawShip(S.eq, W / 2 - 48 + sh, H / 2 - 32, 2, T_NOW, { thrust: 1 });
    if (w.t > 2.2) { ctx.globalAlpha = (w.t - 2.2) / 0.4; rect(0, 0, W, H, '#fff'); ctx.globalAlpha = 1; }
  } else {
    const k = w.t - 2.6; drawStarfield(dt, 0.1);
    if (!w.sph || Math.floor(w.t * 10) % 2 === 0) w.sph = renderSphere(p, 56, w.t * 0.15, { canvas: w.sph });
    const px0 = 130; drawRings(p, px0, 140, 56, false); ctx.drawImage(w.sph, px0 - 56 - w.sph.pad, 140 - 56 - w.sph.pad); drawRings(p, px0, 140, 56, true);
    if (k < 0.4) { ctx.globalAlpha = 1 - k / 0.4; rect(0, 0, W, H, '#fff'); ctx.globalAlpha = 1; }
    const tx = 220; const a = clamp((k - 0.3) / 0.5, 0, 1); ctx.globalAlpha = a;
    text('ARRIVING AT', tx, 70, COL.dim, FS); textO(p.name, tx, 80, COL.ink, '#000', FB, 0, 3);
    text(p.look, tx, 108, COL.cyan, FB);
    text(`THREAT ${'!'.repeat(Math.min(10, Math.ceil(w.n / 2)))}`, tx, 122, COL.coral, FS);
    if (p.trait) text(`HAZARD: ${p.trait}`, tx, 132, COL.orange, FS);
    oreIcon(w.n, tx, 140); text(`NEW ORE: ${p.ore[0]} (TIER ${p.ore[1]})`, tx + 16, 145, COL.ink, FS);
    text(`BOSS: ${p.boss[0]}`, tx, 158, COL.coral, FS); text(`NEW: ${p.name} SALVAGE CRATES`, tx, 168, COL.mint, FS);
    ctx.globalAlpha = 1;
    if (k > 1.2) text('CLICK TO LAND', tx, 196, Math.floor(T_NOW * 3) % 2 ? COL.gold : '#fff6c0', FB);
    if ((k > 1.2 && (IN.pr || kp('Enter') || kp('Space'))) || k > 6) { startRun(w.n); WARP = null; }
  }
}
// ---------- title ----------
function drawTitle(dt) {
  drawStarfield(dt, 0.4);
  const t = T_NOW;
  // floating crates
  for (let i = 0; i < 5; i++) { const x = 40 + i * 100 + Math.sin(t * 0.7 + i) * 10, y = 200 + Math.sin(t + i * 1.7) * 8; ctx.globalAlpha = 0.85; ctx.drawImage(getCrate([0, 2, 3, 5, 6][i], ['weapon', 'armor', 'ship', 'cosmetic', 'galaxy'][i]), x, y, 32, 28); ctx.globalAlpha = 1; }
  drawShip(S.eq, 300 + Math.sin(t * 0.8) * 6, 110 + Math.sin(t * 1.3) * 4, 2, t, { thrust: 0.4 });
  ctx.drawImage(astroSprite(S.eq, 3, Math.floor(t * 4) % 2 ? 0 : 0), 120, 120 + Math.round(Math.sin(t * 1.5) * 3), 40, 52);
  const title = 'SPACE CASE'; const sc = 5; const tw = textW(title, FB, sc); let x = W / 2 - tw / 2;
  for (let i = 0; i < title.length; i++) { const ch = title[i]; const y = 30 + Math.round(Math.sin(t * 3 + i * 0.5) * 3); const c = hex(hsl((t * 60 + i * 24) % 360, 0.85, 0.62)); text(ch, x + sc, y + sc, '#000', FB, 0, sc); text(ch, x, y, c, FB, 0, sc); x += ch === ' ' ? (FB.spaceW + 1) * sc : ((FB.g[ch] || FB.g['?']).w + 1) * sc; }
  text('CRACK CRATES. HAUL ORE. CONQUER 20 PLANETS.', W / 2, 76, COL.dim, FB, 1);
  const b = Math.floor(t * 2) % 2;
  textO(S.stats.crates || S.planet.landings ? 'CLICK TO CONTINUE' : 'CLICK TO START', W / 2, 176, b ? COL.gold : '#fff6c0', '#000', FB, 1, 2);
  text('BEST WITH SOUND ON', W / 2, 196, COL.mute, FS, 1);
  if (IN.pr || kp('Enter') || kp('Space')) { SND.unlock(); SND.setMute(S.settings.mute); SND.setMusic(S.settings.music); goHub(); }
}
function dreamsTab(st) {
  text('HANDCRAFTED WEAPONS WITH ONE-OF-A-KIND TRICKS. HOVER FOR DETAILS, CLICK TO TRACK ONE', W / 2, 30, COL.dim, FS, 1);
  const cols = 6, cw = 74, chh = 66, x0 = Math.floor((W - cols * cw) / 2);
  DREAMS.forEach((D, k) => {
    const id = 'u|' + k, d = getDef(id), own = owned(id); const bx = x0 + (k % cols) * cw, by = 40 + Math.floor(k / cols) * (chh + 4); const hov = inBox(bx + 2, by, cw - 4, chh);
    const tracked = S.track && S.track.k === 'dream' && S.track.dk === k;
    panel(bx + 2, by, cw - 4, chh, { bg: hov ? COL.void3 : COL.void0, bd: tracked ? COL.pink : own ? rcol(d.r) : COL.steel, flat: true });
    drawItemIn(id, bx + 4, by + 3, cw - 8, 24, { sil: !own, maxSc: 2 });
    const nl = wrap(D.n, cw - 10, FS).slice(0, 2); nl.forEach((l, i) => text(l, bx + cw / 2, by + 30 + i * 7, own ? COL.ink : COL.cream, FS, 1));
    text(RAR[D.r].n, bx + cw / 2, by + 46, D.r === 6 ? 'RAINBOW' : RAR[D.r].c, FS, 1);
    text(own ? 'FOUND!' : tracked ? 'TRACKING' : CLS[D.cls].n, bx + cw / 2, by + 55, own ? COL.mint : tracked ? COL.pink : COL.mute, FS, 1);
    if (hov) { IN.cursor = 'pointer'; TIP.set(own ? { item: id } : `${D.n}: ${D.txt}. FIND IT IN WEAPON OR GALAXY CRATES`); if (clickIn(bx + 2, by, cw - 4, chh) && !own) setTrack({ k: 'dream', dk: k, n: D.n }); }
  });
  text(`${DREAMS.filter((D, k) => owned('u|' + k)).length}/${DREAMS.length} FOUND. DREAM WEAPONS ROLL MORE OFTEN THAN NORMAL ITEMS OF THEIR RARITY`, W / 2, H - 14, COL.mute, FS, 1);
}
function reactionsTab(st) {
  text('HIT AN ALIEN WITH ONE ELEMENT WHILE IT SUFFERS FROM ANOTHER. TWO WEAPON SLOTS MAKE THIS EASY', W / 2, 30, COL.dim, FS, 1);
  const found = REACT_KEYS.filter(k => S.reactions[k]).length;
  REACT_KEYS.forEach((k, i) => {
    const R = REACTIONS[k], has = S.reactions[k]; const bx = 14 + (i % 2) * 228, by = 40 + Math.floor(i / 2) * 32;
    panel(bx, by, 222, 29, { bg: COL.void0, bd: has ? R.c : COL.steel, flat: true });
    const ea = R.a === 'pod' ? 'EXPLOSIVE POD' : R.a === 'any' ? 'ANY STATUS' : ELEM_INFO[R.a].n;
    if (has) { text(R.n, bx + 6, by + 4, R.c, FB); text(`${ea} + ${ELEM_INFO[R.b].n}`, bx + 216, by + 5, COL.dim, FS, 2); wrap(R.txt, 210, FS).slice(0, 2).forEach((l, j) => text(l, bx + 6, by + 14 + j * 7, COL.ink, FS)); }
    else { text('???', bx + 6, by + 4, COL.mute, FB); text(`${ea} + ???`, bx + 216, by + 5, COL.mute, FS, 2); text('NOT DISCOVERED YET', bx + 6, by + 16, COL.mute, FS); }
  });
  text(`${found}/${REACT_KEYS.length} REACTIONS DISCOVERED`, W / 2, H - 14, COL.gold, FS, 1);
}
