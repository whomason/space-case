// ===== PLANET RUNS: top-down extraction with depth =====
const TS = 16, MW = 72, MH = 72;
let RUN = null;

function groundRamp(p) {
  const a = hsl(p.g2[0], p.g2[1], p.g2[2] * 0.85), b = hsl(p.g2[0], p.g2[1], p.g2[2]), c = hsl(p.g[0], p.g[1], p.g[2]), d = hsl(towardHue(p.g[0], 55, 0.1), p.g[1] * 0.9, Math.min(0.95, p.g[2] * 1.12 + 0.03));
  return [a, b, c, d];
}
function genPlanetMap(pi, seed) {
  const p = planetDef(pi), R = RNG(seed), nz = makeNoise(seed), nz2 = makeNoise(seed + 9);
  const cx = MW / 2, cy = MH / 2; const GW = MW * TS, GH = MH * TS;
  // liquid field at 4px resolution, smooth edges
  const LM = 4, LW = GW / LM + 1, LH = GH / LM + 1, lv = new Float32Array(LW * LH);
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const tx = x * LM / TS, ty = y * LM / TS; let v = p.liq ? nz2.fbm(tx * 0.085, ty * 0.085, 3) : 1;
    const dc = Math.hypot(tx - cx, ty - cy); if (dc < 8) v = Math.max(v, 0.33 + (8 - dc) * 0.04);
    const edge = Math.min(tx, ty, MW - tx, MH - ty); if (edge < 1.2) v = Math.min(v, 0.33 - (1.2 - edge) * 0.4);
    lv[y * LW + x] = v;
  }
  const lvAt = (x, y) => { const fx = x / LM, fy = y / LM, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy; if (ix < 0 || iy < 0 || ix >= LW - 1 || iy >= LH - 1) return 0; const i = iy * LW + ix; return lerp(lerp(lv[i], lv[i + 1], ax), lerp(lv[i + LW], lv[i + LW + 1], ax), ay); };
  const TH = 0.33;
  // boss lair far away on dry land, then dry out around it
  const shipX = cx * TS, shipY = cy * TS;
  let lair = null; for (let k = 0; k < 300; k++) { const a = R() * TAU, dd = R.range(380, 470); const x = shipX + Math.cos(a) * dd, y = shipY + Math.sin(a) * dd; if (x > 100 && y > 100 && x < GW - 100 && y < GH - 100 && lvAt(x, y) > TH + 0.05) { lair = { x, y }; break; } }
  if (!lair) lair = { x: shipX + 400, y: shipY };
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const d = Math.hypot((x * LM - lair.x) / 1.2, y * LM - lair.y); if (d < 110) lv[y * LW + x] = Math.max(lv[y * LW + x], TH + (110 - d) * 0.004); }
  // pixel mask
  const mask = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (lvAt(x, y) < TH) mask[y * GW + x] = 1;
  const solidP = (x, y) => { x = x | 0; y = y | 0; return x < 0 || y < 0 || x >= GW || y >= GH || mask[y * GW + x] === 1; };
  const tiles = new Uint8Array(MW * MH);
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) tiles[ty * MW + tx] = (solidP(tx * TS + 8, ty * TS + 8) || solidP(tx * TS + 2, ty * TS + 2) || solidP(tx * TS + 14, ty * TS + 14)) ? 1 : 0;
  const solidT = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || tiles[y * MW + x] === 1;
  // ground canvas
  const gc = mkCanvas(GW, GH); const id = gc.x.createImageData(GW, GH); const d = id.data;
  const rmp = groundRamp(p); const BS = 4, BW = GW / BS + 1, BH = GH / BS + 1; const bn = new Float32Array(BW * BH);
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) bn[y * BW + x] = nz.fbm(x * 0.045, y * 0.045, 4);
  const liqC = p.liq ? [hsl(p.liq[1], p.liq[2], p.liq[3]), hsl(p.liq[1], p.liq[2], Math.min(0.95, p.liq[3] * 1.25 + 0.05)), hsl(p.liq[1], p.liq[2], p.liq[3] * 0.7)] : [mix(rmp[0], [0, 0, 8], 0.7), mix(rmp[0], [0, 0, 8], 0.6), mix(rmp[0], [0, 0, 8], 0.8)];
  const run = new Int16Array(GW);
  const wallA = mix(rmp[0], [0, 0, 0], 0.15), wallB = mix(rmp[0], [0, 0, 0], 0.45);
  for (let y = 0; y < GH; y++) {
    const by = y / BS | 0, fy = (y % BS) / BS;
    for (let x = 0; x < GW; x++) {
      const o = (y * GW + x) * 4; const i = y * GW + x;
      if (mask[i]) {
        run[x] = run[x] + 1;
        if (run[x] <= 6 && y > 6) { const c = run[x] === 1 ? rmp[1] : mix(wallA, wallB, (run[x] - 2) / 4); d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; if ((x * 7 + run[x]) % 6 === 0 && run[x] > 1) { d[o] *= 0.82; d[o + 1] *= 0.82; d[o + 2] *= 0.82; } d[o + 3] = 255; continue; }
        const v = nz2.fbm(x * 0.05, y * 0.05, 2); const c = liqC[dith(x, y, v) ? 0 : 2];
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; continue;
      }
      run[x] = 0;
      const bx = x / BS | 0, fx = (x % BS) / BS;
      const v = lerp(lerp(bn[by * BW + bx], bn[by * BW + bx + 1], fx), lerp(bn[(by + 1) * BW + bx], bn[(by + 1) * BW + bx + 1], fx), fy);
      const q = clamp((v - 0.3) / 0.4, 0, 0.999) * 3; let li = Math.floor(q) + (dith(x, y, q - Math.floor(q)) ? 1 : 0); li = clamp(li, 0, 3);
      let c = rmp[li];
      if (y > 0 && mask[i - GW]) c = rmp[3]; else if (y > 1 && mask[i - GW * 2]) c = mix(rmp[li], [0, 0, 0], 0.2);
      else if ((x > 0 && mask[i - 1]) || (x < GW - 1 && mask[i + 1])) c = mix(rmp[li], [0, 0, 0], 0.25);
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  gc.x.putImageData(id, 0, 0);
  const G = gc.x;
  paintDetails(G, p, R, solidP, GW, GH, rmp);
  // decorations
  const decos = []; const kinds = p.decos; const wts = kinds.map(k => k[1]);
  const variants = new Map();
  const getVar = (ki) => { let v = variants.get(ki); if (!v) { v = []; for (let s = 0; s < 6; s++) v.push(decoSprite(kinds[ki][0], kinds[ki][2], seed + ki * 100 + s, p)); variants.set(ki, v); } return v; };
  const occ = [];
  const freeAt = (x, y, r) => { for (const o of occ) if (Math.hypot(o[0] - x, o[1] - y) < r + o[2]) return false; return true; };
  occ.push([shipX, shipY, 46]);
  occ.push([lair.x, lair.y, 80]);
  const nDeco = 260;
  for (let i = 0; i < nDeco * 3 && decos.length < nDeco; i++) {
    const x = R.range(24, GW - 24), y = R.range(24, GH - 24);
    if (solidP(x, y) || solidP(x + 9, y) || solidP(x - 9, y) || solidP(x, y - 4)) continue;
    const ki = kinds.indexOf(R.wpick(kinds, wts)); const kind = kinds[ki][0];
    if (kind === 'crater') { decalDraw(G, 'crater', Math.floor(x), Math.floor(y), R, p); continue; }
    const v = R.pick(getVar(ki));
    if (v.solid && !freeAt(x, y, v.r + 10)) continue;
    if (!v.solid) { G.drawImage(v.c, Math.floor(x - v.w / 2), Math.floor(y - v.h)); continue; }
    decos.push({ x, y, s: v, r: v.r, flip: R.chance(0.5) }); occ.push([x, y, v.r]);
  }
  // lair markers
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const v = decoSprite('obelisk', { c: p.boss[2], glow: [p.boss[2][0], 1, 0.6] }, seed + 999 + (i % 2), p); decos.push({ x: lair.x + Math.cos(a) * 64, y: lair.y + Math.sin(a) * 40, s: v, r: 4, lair: true }); }
  G.globalAlpha = 0.25; G.fillStyle = '#000'; G.beginPath(); G.ellipse(lair.x, lair.y, 72, 44, 0, 0, TAU); G.fill(); G.globalAlpha = 1;
  G.strokeStyle = hex(hsl(p.boss[2][0], 0.9, 0.5)); G.setLineDash([3, 3]); G.beginPath(); G.ellipse(lair.x, lair.y, 60, 36, 0, 0, TAU); G.stroke(); G.setLineDash([]);
  // landing pad
  G.fillStyle = 'rgba(0,0,0,0.25)'; G.beginPath(); G.ellipse(shipX, shipY + 6, 40, 18, 0, 0, TAU); G.fill();
  G.strokeStyle = '#fca311'; G.setLineDash([4, 4]); G.beginPath(); G.ellipse(shipX, shipY + 6, 34, 15, 0, 0, TAU); G.stroke(); G.setLineDash([]);
  // spatial grid for decos
  const grid = new Map(); const gk = (x, y) => (x >> 6) + ',' + (y >> 6);
  for (const dd of decos) { const k = gk(dd.x | 0, dd.y | 0); (grid.get(k) || grid.set(k, []).get(k)).push(dd); }
  // ores
  const ores = []; const oreTypes = [pi]; for (let k = 1; k <= 3; k++) if (pi - k >= 1) oreTypes.push(pi - k);
  const nOre = 62;
  for (let i = 0; i < nOre * 6 && ores.length < nOre; i++) {
    const x = R.range(30, GW - 30), y = R.range(30, GH - 30);
    if (solidP(x, y) || solidP(x + 8, y) || solidP(x - 8, y) || !freeAt(x, y, 14) || Math.hypot(x - shipX, y - shipY) < 70) continue;
    const t = R() < 0.42 ? pi : oreTypes[R.int(oreTypes.length)]; const sz = R.wpick([0, 1, 2], [5, 3, 1.4]);
    const tier = planetDef(t).ore[1]; const units = [3, 5, 8][sz];
    ores.push({ x, y, pi: t, tier, size: sz, units, left: units, prog: 0, shake: 0 }); occ.push([x, y, 10]);
  }
  // wrecks
  const wrecks = []; for (let i = 0; i < 60 && wrecks.length < 3; i++) { const x = R.range(80, GW - 80), y = R.range(80, GH - 80); if (solidP(x, y) || solidP(x + 18, y) || solidP(x - 18, y) || !freeAt(x, y, 30) || Math.hypot(x - shipX, y - shipY) < 200) continue; wrecks.push({ x, y, looted: false, smoke: 0 }); occ.push([x, y, 26]); }
  // minimap
  const mm = mkCanvas(MW, MH); const md = mm.x.createImageData(MW, MH);
  for (let i = 0; i < MW * MH; i++) { const c = tiles[i] ? (liqC ? mix(liqC[0], [0, 0, 0], 0.3) : [10, 10, 20]) : mix(rmp[1], [0, 0, 0], 0.35); md.data[i * 4] = c[0]; md.data[i * 4 + 1] = c[1]; md.data[i * 4 + 2] = c[2]; md.data[i * 4 + 3] = 255; }
  mm.x.putImageData(md, 0, 0);
  // liquid tiles list for shimmer
  const liq = []; for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (tiles[y * MW + x]) liq.push([x, y]);
  return { tiles, ground: gc, decos, grid, ores, wrecks, lair, shipX, shipY, mm, liq, liqC, GW, GH, solidT, solidP, rmp, occ };
}
function paintDetails(G, p, R, solidP, GW, GH, rmp) {
  const isG = (x, y) => !solidP(x, y) && !solidP(x + 3, y) && !solidP(x - 3, y) && !solidP(x, y + 3) && !solidP(x, y - 3);
  const hi = hex(rmp[3]), lo = hex(rmp[0]), mid = hex(rmp[1]);
  const put = (x, y, c, w = 1, h = 1) => { if (isG(x, y)) { G.fillStyle = c; G.fillRect(Math.floor(x), Math.floor(y), w, h); } };
  const N = 2600;
  switch (p.detail) {
    case 'grass': case 'turf': case 'moss': case 'storm': for (let i = 0; i < N; i++) { const x = R() * GW, y = R() * GH; put(x, y, hi, 1, 2); put(x + 1, y + 1, mid, 1, 1); if (R() < 0.04) put(x + 3, y, p.detail === 'moss' ? '#b7ff4a' : p.detail === 'storm' ? '#5a7cff' : R.pick(['#ffe36b', '#ff7aa8', '#ffffff']), 1, 1); } break;
    case 'snow': case 'tundra': for (let i = 0; i < N; i++) { const x = R() * GW, y = R() * GH; put(x, y, R() < 0.3 ? '#ffffff' : hi); } break;
    case 'basalt': case 'ash': for (let i = 0; i < 90; i++) { let x = R() * GW, y = R() * GH; G.fillStyle = p.detail === 'ash' ? '#ff7a2e' : '#ff5a1e'; for (let k = 0; k < 14; k++) { x += R.ir(-1, 2); y += R.ir(-1, 1); if (isG(x, y)) G.fillRect(Math.floor(x), Math.floor(y), 1, 1); } } for (let i = 0; i < N / 2; i++) put(R() * GW, R() * GH, R() < 0.05 ? '#ffb04a' : lo); break;
    case 'salt': G.strokeStyle = rgba(hsl(340, 0.3, 0.95), 0.6); for (let y = 0; y < GH; y += 18) for (let x = (y / 18 % 2) * 15; x < GW; x += 30) { G.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU; const xx = x + Math.cos(a) * 10, yy = y + Math.sin(a) * 9; k ? G.lineTo(xx, yy) : G.moveTo(xx, yy); } G.stroke(); } break;
    case 'sand': case 'dunes': case 'seabed': for (let y = 4; y < GH; y += 7) { G.fillStyle = y % 14 ? mid : hi; for (let x = 0; x < GW; x += 2) { const yy = y + Math.round(Math.sin(x * 0.05 + y) * 2); if (isG(x, yy) && R() < 0.7) G.fillRect(x, yy, 2, 1); } } if (p.detail === 'seabed') for (let i = 0; i < 300; i++) put(R() * GW, R() * GH, R() < 0.5 ? '#6ff' : '#f6f'); break;
    case 'dark': for (let i = 0; i < 500; i++) put(R() * GW, R() * GH, R() < 0.5 ? '#2a6f7a' : '#5a2a7a'); for (let i = 0; i < 160; i++) put(R() * GW, R() * GH, R() < 0.5 ? '#4ef' : '#f5d'); break;
    case 'reef': for (let i = 0; i < N / 2; i++) put(R() * GW, R() * GH, R.pick(['#fff4e8', '#ffb8c8', hi]), 1, 1); break;
    case 'metal': case 'tiles': case 'gold': {
      const s = p.detail === 'metal' ? 32 : 16; G.fillStyle = lo;
      for (let y = 0; y < GH; y += s) for (let x = 0; x < GW; x += s) { if (!isG(x + 2, y + 2)) continue; G.fillStyle = lo; G.fillRect(x, y, s, 1); G.fillRect(x, y, 1, s); G.fillStyle = hi; G.fillRect(x + 1, y + 1, s - 2, 1); if (p.detail === 'metal') { G.fillStyle = mid; G.fillRect(x + 3, y + 3, 1, 1); G.fillRect(x + s - 4, y + 3, 1, 1); G.fillRect(x + 3, y + s - 4, 1, 1); G.fillRect(x + s - 4, y + s - 4, 1, 1); } if (p.detail === 'gold' && R() < 0.2) { G.fillStyle = '#7ff4ff'; G.fillRect(x + 4, y + 7, 8, 1); G.fillRect(x + 7, y + 4, 1, 8); } if (p.detail === 'tiles' && R() < 0.15) { G.fillStyle = hex(hsl(170, .6, .5)); G.fillRect(x + 5, y + 5, 6, 1); } }
      break;
    }
    case 'rust': for (let i = 0; i < 70; i++) { let x = R() * GW, y = R() * GH; G.fillStyle = lo; for (let k = 0; k < 24; k++) { x += R.ir(-1, 2); y += R.ir(-1, 1); if (isG(x, y)) G.fillRect(Math.floor(x), Math.floor(y), 2, 1); } } for (let i = 0; i < N / 2; i++) put(R() * GW, R() * GH, R() < 0.5 ? '#ffb070' : mid); break;
    case 'crystal': for (let i = 0; i < 900; i++) put(R() * GW, R() * GH, hex(hsl(R() * 360, 0.6, 0.85))); break;
    default: for (let i = 0; i < N; i++) put(R() * GW, R() * GH, R() < 0.5 ? hi : lo);
  }
}

// ---------- start / end ----------
function startRun(pi) {
  const p = planetDef(pi); S.planet.landings++; S.planet.cur = pi;
  if (!S.planet.visited[pi]) { S.planet.visited[pi] = 1; toast(`${p.name} SALVAGE CRATES UNLOCKED`, COL.mint); }
  if (pi > S.planet.reached) S.planet.reached = pi;
  for (const b in S.planet.bossCd) if (S.planet.bossCd[b] > 0) S.planet.bossCd[b]--;
  const evKey = S.tutorial.planet && S.planet.landings > 1 ? (S.planet.ev[pi] || rollEvent(pi)) : null;
  S.planet.ev[pi] = rollEvent(pi, evKey);
  dirty();
  const seed = hashStr(p.name + ':' + S.planet.landings + ':' + Date.now());
  const map = genPlanetMap(pi, seed);
  const L = loadout();
  const w = makeWorld({ pi });
  // aliens are tough on their own planet; they get easy once you're geared for the next one (weapons gain 15% per planet reached)
  w.hpMul = 1.35 * Math.pow(1.21, pi - 1) * (1 + S.nova.count * 0.6); w.dmgMul = 1.2 * Math.pow(1.13, pi - 1) * (1 + S.nova.count * 0.4);
  w.crit = L.crit; w.comboMax = L.combo;
  w.moveMul = p.trait === 'LOW GRAVITY' ? 1.22 : p.trait === 'HEAVY GRAVITY' ? 0.8 : 1; w.slippery = p.trait === 'LOW GRAVITY';
  if (S.eq.killfx) { const kd = getDef(S.eq.killfx); const kp = itemPal(kd); w.killfx = { style: kd.style, cols: [hex(kp.P[3]), hex(kp.G[3]), hex(kp.S[3]), '#fff'] }; }
  w.solid = (x, y) => map.solidP(x, y);
  w.collide = ent => collideMap(map, ent, w);
  const pl = makePlayer(map.shipX, map.shipY + 26, L); w.player = pl;
  pl.Ws = [L.weapon].filter(Boolean).map(Wx => Object.assign(Wx, { col: weaponColor(Wx.id) }));
  pl.W = pl.Ws[0] || null; pl.wi = 0;
  if (L.gadget) pl.G = Object.assign({}, L.gadget, { max: L.gadget.cd, cd: 0 });
  if (L.pet) pl.pet = Object.assign({}, L.pet, { t: 1 });
  const scanD = S.eq.scanner ? getDef(S.eq.scanner) : null;
  RUN = {
    pi, p, map, w, L, t: 0, o2: L.o2, o2max: L.o2, cargo: {}, cargoN: 0, coins: 0, kills: 0, xp: 0, bestCombo: 0, crates: [], choices: 0, wrecks: 0, bossBeaten: false, bossHit: false,
    spawnT: 2.5, cam: { x: pl.x - W / 2, y: pl.y - H / 2 }, msg: null, msgT: 0, paused: false, state: 'land', st: 0, chunks: [], amb: [], reserveUsed: false, oreChain: 0, oreChainT: 0,
    bossAvail: !(S.planet.bossCd[pi] > 0), lightningT: 6, meteorT: 5, spores: [], o2warn: 0, choice: null, evac: false, bannerT: 0, tut: S.tutorial.planet ? null : { i: 0, t: 0, dist: 0, fireT: 0 }, carrier: null, carrierT: 22 + R0() * 12, haulTier: haulTier(pi),
    scanR: scanD ? scanD.r : 0, sigT: 0, ev: null,
  };
  if (p.trait === 'SPORE CLOUDS') for (let i = 0; i < 9; i++) RUN.spores.push({ x: R0() * map.GW, y: R0() * map.GH, r: 30 + R0() * 30, vx: (R0() - 0.5) * 8, vy: (R0() - 0.5) * 8 });
  w.onKill = e => onRunKill(e); w.onDeath = () => endRun('dead'); w.onProp = (pr, el) => onRunProp(pr, el);
  setupProps(RUN, RNG(seed + 77));
  if (evKey) setupEvent(RUN, evKey, RNG(seed + 91));
  SND.playSong('planet');
  setScene('planet');
}
// ---------- first-landing training ----------
const TUT = [
  { k: 'move', keys: ['W', 'A', 'S', 'D'], t: 'MOVE AROUND', tt: 'DRAG ON THE LEFT SIDE TO MOVE' },
  { k: 'shoot', keys: ['CLICK'], t: 'AIM WITH THE MOUSE. HOLD CLICK TO SHOOT', tt: 'TOUCH THE RIGHT SIDE TO AIM AND SHOOT' },
  { k: 'tool', keys: ['Q'], t: 'SWITCH TO YOUR MINING TOOL', tt: 'TAP SWAP FOR YOUR MINING TOOL' },
  { k: 'mine', keys: ['CLICK'], t: 'WALK UP TO GLOWING ORE AND HOLD CLICK ON IT', tt: 'WALK UP TO GLOWING ORE AND HOLD ON IT' },
  { k: 'boost', keys: ['SPACE'], t: 'BOOST FORWARD. IT RECHARGES OVER TIME', tt: 'TAP BOOST TO DASH FORWARD' },
  { k: 'weapon', keys: ['Q'], t: 'SWAP BACK TO YOUR WEAPON. KEYS 1 2 3 PICK A SLOT TOO', tt: 'TAP SWAP FOR YOUR WEAPON' },
  { k: 'o2', keys: ['E'], t: 'YOUR O2 IS RUNNING NOW. GET BACK TO THE SHIP AND PRESS E BEFORE IT HITS ZERO', tt: 'YOUR O2 IS RUNNING NOW. GET BACK TO THE SHIP AND TAP USE BEFORE IT HITS ZERO' },
];
function tutTick(dt, inp) {
  const R = RUN, T = R.tut; if (!T || R.state !== 'play') return; const pl = R.w.player; T.t += dt;
  if (T.doneT !== undefined) { T.doneT += dt; if (T.doneT > 0.8) { T.i++; T.t = 0; T.doneT = undefined; if (T.i >= TUT.length) { R.tut = null; S.tutorial.planet = true; dirty(); banner('TRAINING DONE. FILL YOUR CARGO AND HUNT FOR CRATES', COL.gold); } } return; }
  let ok = false;
  switch (TUT[T.i].k) {
    case 'move': if (T.lx !== undefined) T.dist += Math.hypot(pl.x - T.lx, pl.y - T.ly); T.lx = pl.x; T.ly = pl.y; ok = T.dist > 40; break;
    case 'shoot': if (inp.fire && pl.mode === 'weapon') T.fireT += dt; ok = T.fireT > 0.6 || R.kills > 0; break;
    case 'tool': ok = pl.mode === 'tool'; break;
    case 'mine': ok = R.cargoN >= 2; break;
    case 'boost': if (inp.boost) T.boosted = true; ok = !!T.boosted; break;
    case 'weapon': ok = pl.mode === 'weapon'; break;
    case 'o2': ok = T.t > 8; break;
  }
  if (ok) { T.doneT = 0; SND.play('win'); R.w.fx.text(pl.x, pl.y - 32, 'NICE!', COL.gold, { f: FB }); }
}
function drawTut(R) {
  const T = R.tut; if (!T || R.state !== 'play' || R.paused) return; const st = TUT[Math.min(T.i, TUT.length - 1)]; const done = T.doneT !== undefined;
  const msg = IN.touch ? st.tt : st.t; const lines = wrap(msg, 190, FB); const w = 270, h = 20 + lines.length * 9, x = W / 2 - w / 2, y = 38;
  const k = Math.min(1, T.t / 0.25); ctx.globalAlpha = done ? Math.max(0, 1 - T.doneT / 0.8) + 0.3 : k;
  panel(x, y, w, h, { bg: 'rgba(14,22,48,0.92)', bd: done ? COL.gold : COL.pink }); rect(x + 1, y + 1, w - 2, 9, 'rgba(30,39,73,0.95)');
  text(`TRAINING ${Math.min(T.i + 1, TUT.length)}/${TUT.length}`, x + 6, y + 3, COL.pink, FS);
  { const sx = x + w - 96, hov = inBox(sx - 2, y + 1, 30, 9); text('SKIP', sx, y + 3, hov ? COL.gold : COL.mute, FS); if (clickIn(sx - 2, y + 1, 30, 9)) { R.tut = null; S.tutorial.planet = true; dirty(); SND.play('click'); banner('TRAINING SKIPPED. GOOD LUCK OUT THERE', COL.gold); } }
  for (let i = 0; i < TUT.length; i++) rect(x + w - 8 - (TUT.length - i) * 7, y + 4, 5, 3, i < T.i || (i === T.i && done) ? COL.gold : COL.steel);
  if (!IN.touch) { let kx = x + 8; const press = Math.floor(T_NOW * 2) % 2 === 0; for (const kc of st.keys) kx += keycap(kx, y + 14 + (lines.length - 1) * 4, kc, press && !done) + 2; }
  lines.forEach((l, i) => text(l, IN.touch ? W / 2 : x + 74, y + 14 + i * 9, done ? COL.gold : COL.ink, FB, IN.touch ? 1 : 0));
  if (done) textO('NICE!', x + w - 30, y + h - 12, COL.gold, '#000', FB, 1);
  ctx.globalAlpha = 1;
  if (st.k === 'o2' && !done) { const a = Math.floor(T_NOW * 4) % 2; if (a) { ctx.strokeStyle = COL.gold; ctx.strokeRect(3.5, 17.5, 106, 14); } }
}
function drawTutWorld(R, cx, cy) {
  const T = R.tut; if (!T || T.doneT !== undefined || R.state !== 'play') return; const pl = R.w.player;
  if (TUT[T.i].k === 'mine') {
    let best = null, bd = 1e9; for (const o of R.map.ores) { if (o.left <= 0 || o.tier > R.L.toolTier) continue; const d = Math.hypot(o.x - pl.x, o.y - pl.y); if (d < bd) { bd = d; best = o; } }
    if (best) { const x = best.x - cx, y = best.y - cy - 30 + Math.round(Math.sin(T_NOW * 6) * 3); ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.fill(); text('MINE ME', x, y - 8, COL.gold, FS, 1);
      if (x < 0 || y < 0 || x > W || y > H) { const a = Math.atan2(y - H / 2, x - W / 2); const ax = clamp(W / 2 + Math.cos(a) * 180, 20, W - 20), ay = clamp(H / 2 + Math.sin(a) * 100, 60, H - 40); for (let i = 0; i < 4; i++) line(ax, ay, ax - Math.cos(a + (i < 2 ? 0.5 : -0.5)) * 7, ay - Math.sin(a + (i < 2 ? 0.5 : -0.5)) * 7, COL.gold); text('ORE', ax, ay + 6, COL.gold, FS, 1); } }
  }
}
function haulTier(pi) { let t = 0; for (let i = 0; i < 7; i++) if (TIERS[i].unlock !== 'nova' && TIERS[i].unlock <= pi) t = i; return t; }
function addHaulCrate(kind, tier, x, y) {
  const R = RUN; R.crates.push({ kind, tier });
  R.chunks.push({ x, y, vx: (R0() - 0.5) * 120, vy: -60 - R0() * 80, t: 0, crate: true, tier, delay: 0.45 + R.crates.length * 0.05 });
}
function collideMap(map, ent, w) {
  const r = ent.r;
  const gx = ent.x >> 6, gy = ent.y >> 6;
  for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
    const arr = map.grid.get(xx + ',' + yy); if (!arr) continue;
    for (const d of arr) { const dx = ent.x - d.x, dy = (ent.y - d.y) * 1.6, dd = Math.hypot(dx, dy), m = d.r + r * 0.7; if (dd < m && dd > 0.01) { ent.x += dx / dd * (m - dd); ent.y += dy / dd * (m - dd) / 1.6; } }
  }
  for (const o of map.ores) { if (o.left <= 0) continue; const dx = ent.x - o.x, dy = (ent.y - o.y) * 1.5, dd = Math.hypot(dx, dy), m = 6 + o.size * 2 + r * 0.6; if (dd < m && dd > 0.01) { ent.x += dx / dd * (m - dd); ent.y += dy / dd * (m - dd) / 1.5; } }
  if (w) for (const o of w.props) { if (o.dead || !o.solid) continue; const dx = ent.x - o.x, dy = (ent.y - o.y) * 1.5, dd = Math.hypot(dx, dy), m = o.r * 0.8 + r * 0.6; if (dd < m && dd > 0.01) { ent.x += dx / dd * (m - dd); ent.y += dy / dd * (m - dd) / 1.5; } }
  if (ent.lx === undefined) { ent.lx = ent.x; ent.ly = ent.y; }
  const hit = (x, y) => { if (map.solidP(x, y)) return true; for (let k = 0; k < 8; k++) { const a = k * 0.7854; if (map.solidP(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6)) return true; } return false; };
  if (hit(ent.x, ent.y)) {
    if (!hit(ent.x, ent.ly)) ent.y = ent.ly;
    else if (!hit(ent.lx, ent.y)) ent.x = ent.lx;
    else if (!hit(ent.lx, ent.ly)) { ent.x = ent.lx; ent.y = ent.ly; }
  }
  ent.x = clamp(ent.x, TS + r, map.GW - TS - r); ent.y = clamp(ent.y, TS + r, map.GH - TS - r);
  ent.lx = ent.x; ent.ly = ent.y;
}
// ---------- props: the planet fights back, and helps ----------
function onRunKill(e) {
  const R = RUN, w = R.w, pl = w.player;
  if (!e.boss) {
    if (!e.nest) { w.combo = (w.comboT > 0 ? w.combo + 1 : 1); w.comboT = w.comboMax; }
    const mult = Math.min(10, 1 + Math.floor(w.combo / 3));
    R.bestCombo = Math.max(R.bestCombo, mult);
    const val = Math.ceil(e.coin * ORE_VALUE(R.p.ore[1]) / 5 * mult * (1 + S.nova.count * 0.5) * (R.L.coinMul || 1));
    R.coins += val; R.kills++; R.xp += e.xp;
    for (let i = 0; i < Math.min(6, 1 + (val >> 2)); i++) R.chunks.push({ x: e.x, y: e.y - 4, vx: (R0() - 0.5) * 120, vy: -R0() * 100, t: 0, coin: true, delay: 0.25 + R0() * 0.2 });
    if (pl.perks.sprint) pl.sprintT = 1.2;
    if (e.carrier) { R.carrier = null; S.stats.carriers++; addHaulCrate('salvage:' + R.pi, R.haulTier, e.x, e.y - 6); banner('CRATE CARRIER DOWN! +1 SALVAGE CRATE FOR YOUR HAUL', COL.gold); SND.play('unlock'); SND.play('win'); flash(0.35, COL.gold); shake(4); w.fx.burst(e.x, e.y - 6, 40, { c: [COL.gold, '#fff', COL.pink], sp: 160, life: 0.8, s: 2, t: 'shrink' }); }
    if (e.elite && R.ev && R.ev.k === 'elite') { S.stats.elites++; completeEvent(R, e.x, e.y); }
    if (e.nest && R.ev && R.ev.k === 'nests') { R.ev.n++; banner(R.ev.n >= R.ev.need ? 'LAST NEST DOWN!' : `NEST DESTROYED ${R.ev.n}/${R.ev.need}`, COL.coral); if (R.ev.n >= R.ev.need) completeEvent(R, e.x, e.y); }
    if (e.lastSrc === 'pod') S.stats.podkills++;
    // weapon quirks and set abilities that trigger on kills
    const q = pl.mode === 'weapon' && pl.W ? pl.W.quirk : null;
    if (q === 'lucky' && R0() < 0.12) { R.coins += val * 4; for (let i = 0; i < 6; i++) R.chunks.push({ x: e.x, y: e.y - 4, vx: (R0() - 0.5) * 160, vy: -R0() * 140, t: 0, coin: true, delay: 0.3 }); w.fx.text(e.x, e.y - 20, 'LUCKY!', COL.gold, { f: FS, life: 0.6 }); }
    if (q === 'vampire') pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.02);
    if (q === 'overclock') pl.ocT = 2;
    if (q === 'scavenger' && R0() < 0.15) R.chunks.push({ x: e.x, y: e.y - 6, vx: (R0() - 0.5) * 90, vy: -60, t: 0, pi: R.pi, delay: 0.25 });
    const sa = pl.setAb || {}; if (sa[4] && R0() < (sa[4] > 1 ? 0.35 : 0.22)) R.chunks.push({ x: e.x, y: e.y - 6, vx: (R0() - 0.5) * 60, vy: -50, t: 0, heal: true, delay: 0.3 });
  } else {
    R.bossBeaten = true; w.boss = null;
    const first = !S.planet.bosses[R.pi];
    const nC = first ? 3 : 1;
    S.planet.bosses[R.pi] = (S.planet.bosses[R.pi] || 0) + 1; S.planet.bossCd[R.pi] = 2;
    R.coins += Math.ceil(e.coin * ORE_VALUE(R.p.ore[1]) / 5 * 5); R.xp += e.xp;
    ensureBossPool(R.pi);
    for (let i = 0; i < nC; i++) addHaulCrate('boss:' + R.pi, Math.min(7, R.haulTier + 1), e.x, e.y - 10);
    banner(first ? `${R.p.boss[0]} DEFEATED! +3 ARSENAL CRATES FOR YOUR HAUL` : `${R.p.boss[0]} DEFEATED! +1 ARSENAL CRATE`, COL.gold);
    SND.play('fanfare'); flash(0.6, '#fff'); shake(8); FX.hitstop = 0.25;
    if (R.p.mastery) checkMastery('noHitBoss', !R.bossHit);
    SND.playSong('planet'); dirty();
  }
  const wid = pl.mode === 'weapon' && pl.W ? pl.W.id : S.eq.weapon;
  const cls = wid && getDef(wid).sub;
  if (cls) { S.mast[cls] = S.mast[cls] || { k: 0, c: 0 }; S.mast[cls].k++; S.stats.clsKills[cls] = (S.stats.clsKills[cls] || 0) + 1; }
  if (wid) S.ikills[wid] = (S.ikills[wid] || 0) + 1;
  S.stats.kills++;
  if (R.p.mastery) { checkMastery('kills', R.kills); checkMastery('combo', R.bestCombo); }
}
function checkMastery(type, val) {
  const R = RUN; const m = R.p.mastery; if (!m) return;
  const st = S.planet.stars[R.pi] = S.planet.stars[R.pi] || [0, 0, 0];
  m.forEach((c, i) => {
    if (st[i] || c[0] !== type) return;
    const ok = type === 'noHitBoss' ? val === true : val >= c[1];
    if (ok) { st[i] = 1; toast(`MASTERY STAR: ${MASTERY_TXT(c)}`, COL.gold); SND.play('win'); if (st.every(Boolean)) { const id = masteryItem(R.pi); addItem(id, 4); toast(`ALL 3 STARS! EXCLUSIVE COSMETIC: ${getDef(id).name}`, COL.magenta); SND.play('fanfare'); } dirty(); }
  });
}
function banner(t, c) { RUN.msg = t; RUN.msgT = 3.5; RUN.msgC = c || COL.ink; }
function endRun(reason) {
  const R = RUN; if (R.state === 'leave' || R.state === 'results') return;
  if (reason === 'dead' || reason === 'o2') { R.lost = true; for (const k in R.cargo) R.cargo[k] = Math.floor(R.cargo[k] / 2); banner(reason === 'o2' ? 'OUT OF OXYGEN. EMERGENCY EVAC, HALF THE ORE IS LOST' : 'SUIT BREACHED. EMERGENCY EVAC, HALF THE ORE IS LOST', COL.coral); SND.play('lose'); }
  else SND.play('unlock');
  R.state = 'leave'; R.st = 0; R.reason = reason;
  if (!S.tutorial.planet) { S.tutorial.planet = true; R.tut = null; dirty(); } // training only ever runs on your first landing
  if (R.p.mastery) { checkMastery('haul', R.cargoN); checkMastery('wrecks', R.wrecks); }
}
function finishRun() {
  const R = RUN; const L = R.L;
  const lines = []; let total = 0;
  const keys = Object.keys(R.cargo).map(Number).sort((a, b) => planetDef(b).ore[1] - planetDef(a).ore[1]);
  for (const k of keys) { const n = R.cargo[k]; if (!n) continue; const v = ORE_VALUE(planetDef(k).ore[1]); const t = Math.round(n * v * L.oreMul); lines.push({ pi: k, n, v, t }); total += t; }
  const kc = Math.round(R.coins); total += kc;
  earn(total); S.stats.ore += R.cargoN; S.stats.maxHaul = Math.max(S.stats.maxHaul, R.cargoN); S.stats.bestCombo = Math.max(S.stats.bestCombo, R.bestCombo);
  const xp = Math.round(R.xp + R.cargoN * 2 + 10); const lvBefore = S.lvl; addXP(xp);
  checkTitles(); dirty(); save();
  S.haulCrates = (S.haulCrates || []).concat(R.crates.map(c => poolSize(c.kind) > 0 ? c : { kind: 'galaxy', tier: c.tier })); save();
  RES = { lines, kc, total, xp, lvUp: S.lvl - lvBefore, crates: R.crates.slice(), choices: R.choices, t: 0, shown: 0, acc: 0, pi: R.pi, lost: R.lost, mult: L.oreMul, combo: R.bestCombo, kills: R.kills };
  setScene('results');
}

// ---------- update ----------
const TC = { joy: null, aim: null, btn: {} };
function touchInput(pl, c, w) {
  w = w || (RUN && RUN.w);
  let mx = 0, my = 0, fire = false, ax = pl.x + Math.cos(pl.aim) * 50, ay = pl.y + Math.sin(pl.aim) * 50, boost = false, swap = false, use = false, gadget = false;
  TC.joy = null; TC.aim = null;
  const B = TC.btn = { boost: [W - 44, H - 76, 38, 22], swap: [W - 86, H - 76, 38, 22], use: [W - 128, H - 76, 38, 22], gadget: pl.G ? [W - 44, H - 102, 38, 22] : null };
  for (const [id, t] of TOUCH) {
    const inB = k => t.sx >= B[k][0] && t.sy >= B[k][1] && t.sx < B[k][0] + B[k][2] && t.sy < B[k][1] + B[k][3];
    if (inB('boost')) { if (!t.used) { boost = true; t.used = true; } continue; }
    if (inB('swap')) { if (!t.used) { swap = true; t.used = true; } continue; }
    if (inB('use')) { if (!t.used) { use = true; t.used = true; } continue; }
    if (B.gadget && inB('gadget')) { if (!t.used) { gadget = true; t.used = true; } continue; }
    if (t.sx < W / 2) { const dx = t.x - t.sx, dy = t.y - t.sy, d = Math.hypot(dx, dy); const k = Math.min(1, d / 24); if (d > 3) { mx = dx / d * k; my = dy / d * k; } TC.joy = t; }
    else { fire = true; ax = t.x + c.x; ay = t.y + c.y; TC.aim = t; }
  }
  if (!TC.aim && pl.mode === 'weapon') { const e = w && nearestEnemy(w, pl.x, pl.y, 150); if (e) { ax = e.x; ay = e.y - 4; fire = true; } }
  if (gadget) { const e = w && nearestEnemy(w, pl.x, pl.y, 200); if (e) { ax = e.x; ay = e.y - 4; } }
  return { mx, my, ax, ay, fire, boost, swap, use, gadget };
}
function runInput() {
  const pl = RUN.w.player; const c = RUN.cam;
  if (TOUCH.size || IN.touch) { const t = touchInput(pl, c); if (t.use) IN.kp.add('KeyE'); return t; }
  const slot = kp('Digit1') ? 0 : kp('Digit3') ? 2 : undefined;
  return {
    gadget: kp('KeyF') || kp('Digit2'),
    mx: (key('KeyD') || key('ArrowRight') ? 1 : 0) - (key('KeyA') || key('ArrowLeft') ? 1 : 0), my: (key('KeyS') || key('ArrowDown') ? 1 : 0) - (key('KeyW') || key('ArrowUp') ? 1 : 0),
    ax: IN.mx + c.x, ay: IN.my + c.y, fire: IN.down && !IN.overUI, boost: kp('Space') || kp('ShiftLeft') || kp('ShiftRight'), swap: kp('KeyQ') || IN.wheel !== 0 || (IN.rpr && pl.mode === 'tool'), slot,
  };
}
function updateRun(dt) {
  const R = RUN, w = R.w, pl = w.player, map = R.map;
  if (R.choice) { updateChoiceOverlay(dt); return; }
  if (R.paused) return;
  R.t += dt; w.t += dt; R.st += dt;
  if (R.state === 'land') { if (R.st > 1.4) { R.state = 'play'; R.st = 0; banner(R.ev ? `${R.p.name}. EVENT: ${EVENTS[R.ev.k].n}. ${EVENTS[R.ev.k].txt}` : `${R.p.name}. ${R.bossAvail ? 'BOSS: ' + R.p.boss[0] : 'BOSS RESTING'}`, R.ev ? EVENTS[R.ev.k].c : COL.cyan); } }
  if (R.state === 'leave') { if (R.st > 2.2) finishRun(); w.fx.update(dt); return; }
  const inp = runInput();
  if (R.state === 'play' && !pl.dead) {
    if (inp.swap) cycleSlot(pl, w);
    if (inp.slot !== undefined) setSlot(pl, w, inp.slot);
    if (inp.gadget && pl.G) { if (pl.G.cd > 0) { if (!pl.gDenyT || w.t - pl.gDenyT > 0.4) { pl.gDenyT = w.t; SND.play('deny'); } } else useGadget(w, pl, inp.ax, inp.ay); }
    updatePlayer(w, pl, inp, dt, R.L); tutTick(dt, inp);
    if (pl.mode === 'weapon' && pl.W) fireWeapon(w, pl, pl.W, inp, dt); else { w.beam = null; }
    updateDrones(w, pl, pl.mode === 'weapon' ? pl.W : null, dt);
    if (pl.mode === 'tool') updateExtract(dt, inp);
    else R.extracting = null;
    // o2
    const heat = R.p.trait === 'HEAT' ? 1 + 0.6 * (1 - R.L.shield) : 1;
    if (!R.tut || R.tut.i >= TUT.length - 1) R.o2 -= dt * heat;
    if (R.o2 < R.o2max * 0.25) { R.o2warn -= dt; if (R.o2warn <= 0) { R.o2warn = R.o2 < R.o2max * 0.1 ? 0.5 : 1.2; SND.play('o2'); } }
    if (R.o2 <= 0) { if (pl.perks.reserve && !R.reserveUsed) { R.reserveUsed = true; R.o2 = R.o2max * 0.3; banner('RESERVE O2 TANK ENGAGED', COL.cyan); } else endRun('o2'); }
    // interactions
    const dShip = Math.hypot(pl.x - map.shipX, pl.y - map.shipY - 10);
    R.prompt = null;
    if (dShip < 30) { R.prompt = { x: map.shipX, y: map.shipY - 30, t: `E  LAUNCH (${R.cargoN} ORE)` }; if (kp('KeyE')) endRun('launch'); }
    for (const wr of map.wrecks) if (!wr.looted && Math.hypot(pl.x - wr.x, pl.y - wr.y) < 28) { R.prompt = { x: wr.x, y: wr.y - 22, t: 'E  SEARCH WRECK' }; if (kp('KeyE')) lootWreck(wr); }
    updateProps(R, dt);
    updateEvent(R, dt);
    updateSignal(R, dt);
    // boss lair
    if (R.bossAvail && !w.boss && !R.bossBeaten && Math.hypot(pl.x - map.lair.x, pl.y - map.lair.y) < 95) { spawnBoss(w, map.lair.x, map.lair.y); SND.play('bossroar'); SND.playSong('boss'); shake(6); banner(`${R.p.boss[0]}. HIT IT WHEN IT WINDS UP, PUNISH THE GLOWING CORE`, COL.coral); R.bossHit = false; }
    // spawns
    R.spawnT -= dt * (R.tut ? (R.tut.i < 1 ? 0 : 0.4) : 1);
    if (R.spawnT <= 0) {
      R.spawnT = Math.max(0.9, 3.4 - R.t * 0.018) * (w.boss ? 1.8 : 1);
      if (w.ents.length < 34) {
        const ros = planetRoster(w.pi); const arch = R0() < 0.55 ? R0.pick(R.p.alien[2]) : R0.pick(ros); const n = arch === 'swarm' ? 3 + R0.int(3) : arch === 'turret' || arch === 'healer' || arch === 'sniper' ? 1 : 1 + R0.int(R.t > 60 ? 3 : 2);
        for (let tries = 0; tries < 10; tries++) { const a = R0() * TAU, d = 230 + R0() * 50; const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (!w.solid(x, y) && x > 30 && y > 30 && x < map.GW - 30 && y < map.GH - 30) { for (let i = 0; i < n; i++) foeVariant(spawnEnemy(w, arch, x + (R0() - 0.5) * 24, y + (R0() - 0.5) * 24), R.t); break; } }
      }
    }
    // crate carriers
    if (!w.boss && !R.carrier && !R.tut) R.carrierT -= dt;
    if (R.carrierT <= 0 && !R.carrier) {
      R.carrierT = 38 + R0() * 22;
      for (let tries = 0; tries < 14; tries++) { const a = R0() * TAU, d = 150 + R0() * 60; const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (!w.solid(x, y) && x > 40 && y > 40 && x < map.GW - 40 && y < map.GH - 40) { const e = spawnEnemy(w, 'crawler', x, y); e.carrier = true; e.hp = e.maxHp = e.hp * 6; e.spd *= 1.35; e.dmg *= 0.3; e.coin *= 3; e.life = 30; R.carrier = e; banner('A CRATE CARRIER APPEARED! CHASE IT DOWN', COL.gold); SND.play('upgradeHint'); break; } }
    }
    if (R.carrier) { const e = R.carrier; if (e.dead) R.carrier = null; else { e.life -= dt; if (e.life <= 0) { e.dead = true; w.fx.burst(e.x, e.y - 6, 24, { c: [COL.blueL, '#fff'], sp: 120, life: 0.6, s: 2 }); banner('THE CRATE CARRIER WARPED AWAY', COL.dim); SND.play('deny'); R.carrier = null; } } }
    // hazards
    if (R.p.trait === 'LIGHTNING') { R.lightningT -= dt; if (R.lightningT <= 0) { R.lightningT = 4 + R0() * 4; w.tele.push({ x: pl.x + (R0() - 0.5) * 120, y: pl.y + (R0() - 0.5) * 90, r: 20, t: 0, max: 1.1, dmg: 12 * w.dmgMul * (1 - R.L.shield), col: '#fff25a', bolt: true }); } }
    if (R.p.trait === 'METEORS') { R.meteorT -= dt; if (R.meteorT <= 0) { R.meteorT = 3 + R0() * 3; for (let i = 0; i < 1 + R0.int(3); i++) w.tele.push({ x: pl.x + (R0() - 0.5) * 160, y: pl.y + (R0() - 0.5) * 120, r: 18, t: 0, max: 1.2, dmg: 14 * w.dmgMul * (1 - R.L.shield), col: '#ff7a2e', meteor: true }); } }
    if (R.spores.length) { let inSp = false; for (const s of R.spores) { s.x += s.vx * dt; s.y += s.vy * dt; if (Math.hypot(pl.x - s.x, pl.y - s.y) < s.r) inSp = true; } w.moveMul = inSp ? 0.6 * (1 - R.L.shield) + 0.4 : 1; }
  }
  if (w.comboT > 0) { w.comboT -= dt; if (w.comboT <= 0) w.combo = 0; }
  updateShots(w, dt); updateMines(w, dt); updateEnemies(w, dt); updateEShots(w, dt); updateTele(w, dt);
  if (w.boss && pl.hurtT > 0.29) R.bossHit = true;
  w.fx.update(dt);
  updateChunks(dt);
  // camera
  let lead = 0.18; let lx = (IN.mx - W / 2) * lead, ly = (IN.my - H / 2) * lead;
  if (IN.rdown && pl.W && pl.W.cls === 'sniper' && pl.mode === 'weapon') { lx = (IN.mx - W / 2) * 0.9; ly = (IN.my - H / 2) * 0.9; R.scope = true; } else R.scope = false;
  const tx = clamp(pl.x - W / 2 + lx, 0, map.GW - W), ty = clamp(pl.y - 12 - H / 2 + ly, 0, map.GH - H);
  R.cam.x = lerp(R.cam.x, tx, Math.min(1, dt * 6)); R.cam.y = lerp(R.cam.y, ty, Math.min(1, dt * 6));
  if (R.msgT > 0) R.msgT -= dt;
  if (kp('Escape') || kp('KeyP')) { R.paused = true; SND.play('click'); }
}
function updateExtract(dt, inp) {
  const R = RUN, pl = R.w.player, map = R.map;
  let best = null, bd = 1e9;
  const cand = map.ores.filter(o => o.left > 0).concat(R.w.props.filter(p => !p.dead && (p.mine || (p.dig && p.found))));
  for (const o of cand) { const d = Math.hypot(o.x - pl.x, o.y - pl.y); if (d < 36) { const dc = Math.hypot(o.x - inp.ax, o.y - inp.ay); if (dc < bd) { bd = dc; best = o; } } }
  R.extractTarget = best;
  R.extracting = null;
  if (!best || !inp.fire) return;
  const isProp = !!best.kind;
  if (R.L.toolTier < best.tier) { if (Math.random() < dt * 2) { R.w.fx.text(best.x, best.y - 16, `NEEDS A TIER ${best.tier} TOOL`, COL.coral, { f: FS }); SND.play('deny'); } return; }
  if (!isProp && R.cargoN >= R.L.cargo) { if (Math.random() < dt * 2) { R.w.fx.text(pl.x, pl.y - 30, 'CARGO FULL. RETURN TO SHIP', COL.gold, { f: FS }); } return; }
  R.extracting = best;
  const hard = 0.9 + best.tier * 0.12;
  best.prog += dt * R.L.extract * 2.6 / hard; best.shake = 0.1;
  if (Math.random() < 0.5) R.w.fx.add({ x: best.x + (R0() - 0.5) * 8, y: best.y - 5 + (R0() - 0.5) * 6, vx: (R0() - 0.5) * 70, vy: -R0() * 60, g: 160, life: 0.4, c: R0() < 0.5 ? '#fff' : isProp ? (best.kind === 'seal' ? '#bff6ff' : '#c8a060') : oreHex(best.pi), s: 1 });
  SND.play('extract', best.tier / 12);
  if (isProp) { while (best.left > 0 && best.prog >= 1) { best.prog -= 1; best.left--; } if (best.left <= 0 && !best.dead) propMined(best); return; }
  if (pl.perks.tchain) for (const o of map.ores) if (o !== best && o.left > 0 && Math.hypot(o.x - best.x, o.y - best.y) < 40 && R.L.toolTier >= o.tier) o.prog += dt * R.L.extract * 0.8 / hard;
  for (const o of map.ores) {
    while (o.left > 0 && o.prog >= 1) {
      o.prog -= 1; o.left--;
      const n = pl.perks.tdouble && R0() < 0.2 ? 2 : 1;
      for (let k = 0; k < n; k++) R.chunks.push({ x: o.x, y: o.y - 6, vx: (R0() - 0.5) * 90, vy: -60 - R0() * 60, t: 0, pi: o.pi, delay: 0.25 });
      if (o.left <= 0) { R.w.fx.burst(o.x, o.y - 4, 16, { c: [oreHex(o.pi), '#fff'], sp: 90, s: 2, t: 'shrink' }); SND.play('kill'); if (o.meteor && R.ev && R.ev.k === 'meteor' && R.ev.st === 'active') { R.ev.n++; banner(`METEOR DEPOSIT ${R.ev.n}/${R.ev.need}`, '#ff9a3d'); if (R.ev.n >= R.ev.need) completeEvent(R, o.x, o.y); } }
    }
  }
}
const oreHex = pi => { const c = oreColor(planetDef(pi)); return c ? hex(hsl(c[0], c[1], c[2])) : rainbow(T_NOW, 0); };
function updateChunks(dt) {
  const R = RUN, pl = R.w.player; const mag = (pl.perks.magnet || (pl.W && pl.W.quirk === 'magnet') ? 120 : 40) * (R.L.petMagnet ? 2.5 : 1);
  R.oreChainT -= dt; if (R.oreChainT <= 0) R.oreChain = 0;
  for (const c of R.chunks) {
    c.t += dt; c.vy += 220 * dt * (c.t < c.delay ? 1 : 0);
    if (c.t < c.delay) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.96; continue; }
    const dx = pl.x - c.x, dy = pl.y - 8 - c.y, d = Math.hypot(dx, dy);
    if (d < mag || c.t > 1.2) { const sp = 220 + c.t * 200; c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; }
    if (d < 7) {
      c.done = true;
      if (c.coin) SND.play('coin');
      else if (c.crate) { SND.play('unlock'); R.w.fx.text(pl.x, pl.y - 28, '+1 CRATE', COL.gold, { f: FB }); }
      else if (c.heal) { pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.04); SND.play('pickup'); R.w.fx.text(pl.x, pl.y - 26, '+HP', '#9fffb4', { f: FS, life: 0.5 }); }
      else {
        if (R.cargoN < R.L.cargo) { R.cargo[c.pi] = (R.cargo[c.pi] || 0) + 1; R.cargoN++; R.oreChain++; R.oreChainT = 1.2; SND.play('ore', R.oreChain); R.w.fx.text(pl.x + (R0() - 0.5) * 8, pl.y - 26, '+1', oreHex(c.pi), { f: FS, life: 0.5 }); if (pl.perks.overflow) R.o2 = Math.min(R.o2max, R.o2 + 0.6); if (R.cargoN === R.L.cargo) banner('CARGO FULL. HEAD BACK TO YOUR SHIP', COL.gold); }
      }
    }
  }
  R.chunks = R.chunks.filter(c => !c.done);
}
function lootWreck(wr) {
  const R = RUN, w = R.w; wr.looted = true; R.wrecks++; S.stats.wrecks++;
  const tier = clamp(Math.floor((R.pi - 1) / 3), 0, 6);
  let clue = null;
  if (R0() < 0.3) { const opts = []; ARTIFACTS.forEach((a, k) => { const c = S.clues[k] || [0, 0, 0]; c.forEach((v, j) => { if (!v) opts.push([k, j]); }); }); if (opts.length) { const [k, j] = R0.pick(opts); (S.clues[k] = S.clues[k] || [0, 0, 0])[j] = 1; clue = `CLUE FOUND: ${ARTIFACTS[k].n} NEEDS ${getDef(artifactIngredients(k)[j]).name}`; } }
  S.choiceQueue.push({ tier, title: 'WRECK SALVAGE' }); R.choices++;
  banner('WRECK SALVAGED! +1 CHOICE CRATE. PICK 1 OF 3 AFTER THE HAUL', COL.pink); if (clue) toast(clue, COL.lilac);
  w.fx.burst(wr.x, wr.y - 10, 24, { c: [COL.pink, '#fff', COL.gold], sp: 110, life: 0.7, s: 2 });
  SND.play('unlock'); SND.play('win'); dirty();
  if (R.p.mastery) checkMastery('wrecks', R.wrecks);
}
function artifactIngredients(k) { const r = RNG(k * 7919 + 1); const cats = [['w', CLASSES], ['a', CATS.a.subs], ['c', CATS.c.subs]]; return cats.map(([c, subs]) => { const sub = r.pick(subs); for (let i = 0; i < 99; i++) { const n = r.int(120); if (rarityOf(c, sub, n) <= 1 && originOf(c, sub, n).t === 'gen') return `${c}|${sub}|${n}`; } return `${c}|${sub}|0`; }); }

// ---------- draw ----------
function drawRun() {
  const R = RUN, w = R.w, map = R.map, pl = w.player, p = R.p;
  let cx = Math.floor(R.cam.x + (pl.kickX || 0)), cy = Math.floor(R.cam.y + (pl.kickY || 0));
  if (FX.shake > 0) { cx += Math.round((R0() - 0.5) * FX.shake * 2); cy += Math.round((R0() - 0.5) * FX.shake * 2); }
  rect(0, 0, W, H, '#000');
  ctx.drawImage(map.ground, cx, cy, W, H, 0, 0, W, H);
  // liquid shimmer
  if (p.liq) {
    const t = T_NOW; const lc = hex(map.liqC[1]); const kind = p.liq[0];
    for (const [tx, ty] of map.liq) {
      const sx = tx * TS - cx, sy = ty * TS - cy; if (sx < -TS || sy < -TS || sx > W || sy > H) continue; if (!map.solidP(tx * TS + 8, ty * TS + 8) || !map.solidP(tx * TS + 8, ty * TS - 2)) continue;
      const above = !map.tiles[(ty - 1) * MW + tx];
      const ph = Math.sin(t * 2 + tx * 1.3 + ty * 0.7);
      if (kind === 'lava' || kind === 'magma') { ctx.globalAlpha = 0.35 + 0.25 * ph; rect(sx + ((tx * 5 + Math.floor(t * 3)) % 12), sy + 7 + (above ? 2 : 0), 3, 1, '#fff2a0'); rect(sx + ((ty * 7 + Math.floor(t * 2)) % 10), sy + 12, 2, 1, '#ffd04a'); ctx.globalAlpha = 1; if (R0() < 0.002) w.fx.add({ x: tx * TS + 8, y: ty * TS + 8, vx: 0, vy: -20, life: 0.8, c: '#ff9a3d', s: 1 }); }
      else if (kind === 'cloud') { ctx.globalAlpha = 0.25; rect(sx + ((tx * 3 + Math.floor(t * 4)) % 16) - 4, sy + 8 + Math.floor(ph * 2), 8, 3, '#fff'); ctx.globalAlpha = 1; }
      else if (kind === 'void' || kind === 'trench' || kind === 'darkwater' || kind === 'oil') { if ((tx * 13 + ty * 7) % 9 === 0) px(sx + 6 + Math.floor(ph * 2), sy + 9, kind === 'darkwater' ? '#3fe' : '#aab'); }
      else if (ph > 0.6) rect(sx + 3 + ((tx + ty) % 6), sy + 6 + (above ? 2 : 0), 4, 1, lc);
    }
  }
  drawTele(w, cx, cy);
  // y-sorted objects
  const objs = [];
  const vis = (x, y, m = 60) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m * 1.6;
  for (const d of map.decos) if (vis(d.x, d.y)) objs.push([d.y, 0, d]);
  for (const o of map.ores) if (o.left > 0 && vis(o.x, o.y)) objs.push([o.y, 1, o]);
  for (const wr of map.wrecks) if (vis(wr.x, wr.y)) objs.push([wr.y, 2, wr]);
  for (const pr of w.props) if (!pr.dead && vis(pr.x, pr.y)) objs.push([pr.y, 6, pr]);
  if (vis(map.shipX, map.shipY, 80)) objs.push([map.shipY + 8, 3, null]);
  for (const e of w.ents) if (vis(e.x, e.y)) objs.push([e.y, 4, e]);
  if (!pl.dead && R.state !== 'leave') objs.push([pl.y, 5, pl]);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of objs) {
    if (k === 0) { const s = o.s; const x = Math.floor(o.x - s.w / 2 - cx), y = Math.floor(o.y - s.h - cy + 2); shadow(o.x - cx, o.y - cy, Math.floor(s.w * 0.38), Math.max(2, Math.floor(s.w * 0.12)), 0.3); if (o.flip) { ctx.save(); ctx.translate(x + s.w, y); ctx.scale(-1, 1); ctx.drawImage(s.c, 0, 0); ctx.restore(); } else ctx.drawImage(s.c, x, y); if (o.lair && R.bossAvail && !R.bossBeaten && s.glow) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T_NOW * 4); ctx.drawImage(s.glow, x, y); ctx.globalAlpha = 1; } }
    else if (k === 1) { const s = oreSprite(o.pi, o.size, Math.floor(T_NOW * 8) % 8); const sh = o.shake > 0 ? Math.round((R0() - 0.5) * 2) : 0; o.shake -= 1 / 60; const x = Math.floor(o.x - s.width / 2 - cx) + sh, y = Math.floor(o.y - s.height - cy + 3); const gl = 0.16 + 0.1 * Math.sin(T_NOW * 3 + o.x); ctx.globalAlpha = gl; ellipse(o.x - cx, o.y - cy - 2, 12 + o.size * 3, 6 + o.size, oreHex(o.pi)); ctx.globalAlpha = 1; shadow(o.x - cx, o.y - cy + 1, 6 + o.size * 2, 2, 0.3); ctx.drawImage(s, x, y); if (o === R.extractTarget && pl.mode === 'tool') { const ok = R.L.toolTier >= o.tier; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T_NOW * 8); ctx.drawImage(tinted(s, ok ? '#ffffff' : '#ff3050'), x, y); ctx.globalAlpha = 1; } if (((T_NOW * 1.7 + o.x * 0.01) % 2) < 0.12) { const sx = x + (o.x % (s.width - 2)) + 1, sy = y + 2; rect(sx, sy - 1, 1, 3, '#fff'); rect(sx - 1, sy, 3, 1, '#fff'); } if (o.left < o.units) bar(o.x - cx - 6, y - 4, 12, 2, o.left / o.units, oreHex(o.pi)); }
    else if (k === 2) { const s = wreckSprite(R.pi); const x = Math.floor(o.x - s.width / 2 - cx), y = Math.floor(o.y - s.height - cy + 4); shadow(o.x - cx, o.y - cy, 18, 4, 0.35); ctx.drawImage(s, x, y); if (!o.looted) { if (R0() < 0.08) w.fx.add({ x: o.x + (R0() - 0.5) * 10, y: o.y - 14, vx: 4, vy: -14, life: 1.6, c: '#5a5a66', s: 2, t: 'fade', drag: 0.2 }); if (Math.floor(T_NOW * 3) % 2) px(x + 27, y + 13, '#4ef'); const by = Math.floor(o.y - cy - 34 + Math.sin(T_NOW * 3) * 2); text('!', o.x - cx, by, COL.gold, FB, 1); } }
    else if (k === 3) { const sx = map.shipX - 24 - cx, sy = map.shipY - 24 - cy + (R.state === 'land' ? -Math.max(0, 1 - R.st / 1.2) * 120 : 0) + (R.state === 'leave' ? -Math.pow(R.st, 2.2) * 40 : 0); shadow(map.shipX - cx, map.shipY + 8 - cy, 22, 5, 0.35); drawShip(S.eq, sx, sy, 1, T_NOW, { thrust: R.state === 'leave' ? 1 : 0 }); if (R.state === 'leave' && !pl.dead) {} }
    else if (k === 4) drawEnemy(w, o, cx, cy);
    else if (k === 6) drawProp(R, o, cx, cy);
    else if (k === 5) {
      const eq = pl.wi === 1 && pl.Ws[1] ? Object.assign({}, S.eq, { weapon: pl.Ws[1].id }) : S.eq; drawPlayer(w, pl, cx, cy, eq);
      if (eq.trail && pl.moving && R0() < 0.6) trailFx(w, pl, getDef(eq.trail));
      if (R.extracting) { const o2 = R.extracting; const a = Math.atan2(o2.y - 6 - (pl.y - 8), o2.x - pl.x); const x0 = pl.x + Math.cos(a) * 14 - cx, y0 = pl.y - 8 + Math.sin(a) * 6 - cy; const c = weaponColor(eq.tool); for (let i = 0; i < 2; i++) line(x0, y0, o2.x - cx + (R0() - 0.5) * 4, o2.y - 6 - cy + (R0() - 0.5) * 4, i ? c.core : c.mid); }
    }
  }
  drawShots(w, cx, cy);
  drawEventWorld(R, cx, cy);
  // chunks
  for (const c of R.chunks) { const x = c.x - cx, y = c.y - cy; if (c.coin) { rect(x - 1, y - 1, 3, 3, '#fca311'); px(x, y - 1, '#ffe2a8'); } else if (c.crate) { miniCrate(x - 6, y - 5, c.tier); } else if (c.heal) { rect(x - 2, y - 1, 5, 3, '#9fffb4'); rect(x - 1, y - 2, 3, 5, '#9fffb4'); px(x, y, '#fff'); } else { rect(x - 1, y - 1, 3, 3, oreHex(c.pi)); px(x - 1, y - 1, '#fff'); } }
  w.fx.draw(cx, cy);
  // spores
  for (const s of R.spores) { ctx.globalAlpha = 0.16 + 0.05 * Math.sin(T_NOW * 2 + s.x); ellipse(s.x - cx, s.y - cy, Math.floor(s.r), Math.floor(s.r * 0.6), '#c86bff'); ctx.globalAlpha = 1; if (R0() < 0.2) w.fx.add({ x: s.x + (R0() - 0.5) * s.r, y: s.y + (R0() - 0.5) * s.r * 0.6, vx: 0, vy: -8, life: 1, c: '#b7ff4a', s: 1, t: 'fade' }); }
  // darkness
  drawBossOverlay(w);
  if (p.dark) drawDarkness(R, cx, cy);
  drawAmbient(R, cx, cy);
  // telegraph bolts (lightning flash)
  for (const t of w.tele) if (t.bolt && t.t >= t.max - 0.02 && !t.flashed) { t.flashed = true; flash(0.35, '#fffbd0'); SND.play('rail'); let x = t.x - cx, y = -10; for (let i = 0; i < 8; i++) { const nx = (t.x - cx) + (R0() - 0.5) * 20, ny = (t.y - cy) * (i + 1) / 8; line(x, y, nx, ny, '#fff'); x = nx; y = ny; } }
  // sniper scope line
  if (R.scope && !pl.dead) { const a = pl.aim; ctx.globalAlpha = 0.6; for (let d = 14; d < 380; d += 3) px(pl.x + Math.cos(a) * d - cx, pl.y - 8 + Math.sin(a) * d - cy, '#ff3050'); ctx.globalAlpha = 1; }
  // prompt
  if (R.prompt) { const t = R.prompt.t, ww = textW(t, FS) + 8; const x = Math.floor(R.prompt.x - cx - ww / 2), y = Math.floor(R.prompt.y - cy + Math.sin(T_NOW * 4) * 1.5); panel(x, y, ww, 11, { bg: COL.void0, bd: COL.gold }); text(t, x + ww / 2, y + 3, COL.gold, FS, 1); }
  drawTutWorld(R, cx, cy);
  drawRunHUD(R);
  drawTut(R);
  if (R.paused) drawPause(R);
  if (R.choice) drawChoiceOverlay();
}
const TRAIL_PAT = { heart: '#.#|###|.#.', note: '.##|.#.|.#.|##.', star: '.#.|###|.#.', leaf: '.##|###|#..', bolt: '..#|.#.|###|.#.|#..', flake: '#.#|.#.|#.#', spark4: '..#..|..#..|##.##|..#..|..#..' };
function trailFx(w, pl, d) {
  const pal = itemPal(d, Math.floor(T_NOW * 8) % 8); const c = [hex(pal.P[3]), hex(pal.G[3]), hex(pal.S[4] || pal.S[3])];
  const x = pl.x + (R0() - 0.5) * 6, y = pl.y - 2, L = (S.inv[d.id] && S.inv[d.id].l) || 1, big = L >= 6 ? 1 : 0;
  const pick = () => c[R0.int(3)];
  switch (d.style) {
    case 'SPARKLES': w.fx.add({ x, y: y - 4 - R0() * 8, vx: 0, vy: -4, life: 0.7, c: R0() < 0.4 ? '#fff' : pick(), t: 'pat', pat: big && R0() < 0.3 ? TRAIL_PAT.spark4 : TRAIL_PAT.star, drag: 1 }); break;
    case 'FLAMES': for (let i = 0; i < 1 + big; i++) w.fx.add({ x: x + (R0() - 0.5) * 3, y, vx: (R0() - 0.5) * 6, vy: -26 - R0() * 10, life: 0.45, c: R0() < 0.4 ? '#ffd54a' : R0() < 0.5 ? '#ff7a2e' : c[1], s: 3, t: 'shrink', drag: 1.5 }); break;
    case 'BUBBLES': w.fx.add({ x, y: y - 6, vx: (R0() - 0.5) * 6, vy: -14, life: 1, c: R0() < 0.5 ? '#bff3ff' : c[1], s: 3 + big * 2, t: 'ring', drag: 0.5 }); break;
    case 'HEARTS': w.fx.add({ x, y: y - 8, vx: (R0() - 0.5) * 8, vy: -16, life: 0.9, c: R0() < 0.5 ? '#ff5c9a' : pick(), t: 'pat', pat: TRAIL_PAT.heart, drag: 1 }); break;
    case 'PIXELS': w.fx.add({ x, y: y - 6, vx: (R0() - 0.5) * 30, vy: -20 - R0() * 10, life: 0.8, c: pick(), s: 2, g: 90, drag: 0.5 }); break;
    case 'STARDUST': w.fx.add({ x, y: y - 6, vx: (R0() - 0.5) * 4, vy: -3, life: 1.1, c: R0() < 0.5 ? '#fff6c0' : pick(), t: 'pat', pat: TRAIL_PAT.star, drag: 1 }); if (R0() < 0.5) w.fx.add({ x: x + (R0() - 0.5) * 8, y: y - 4, life: 0.8, c: '#fff', s: 1, t: 'fade' }); break;
    case 'NOTES': w.fx.add({ x, y: y - 10, vx: (R0() - 0.5) * 14, vy: -18, life: 0.9, c: pick(), t: 'pat', pat: TRAIL_PAT.note, drag: 1.2 }); break;
    case 'BOLTS': w.fx.add({ x, y: y - 6, vx: (R0() - 0.5) * 20, vy: -6, life: 0.35, c: R0() < 0.5 ? '#fff25a' : '#bff3ff', t: 'pat', pat: TRAIL_PAT.bolt, drag: 2 }); w.fx.add({ x, y: y - 4, vx: (R0() - 0.5) * 80, vy: (R0() - 0.5) * 80, life: 0.18, c: '#fff25a', s: 1, t: 'spark', drag: 1 }); break;
    case 'LEAVES': w.fx.add({ x, y: y - 10, vx: (R0() - 0.5) * 16, vy: 6, life: 1.1, c: R0() < 0.5 ? '#7bd389' : R0() < 0.5 ? '#f2a541' : c[1], t: 'pat', pat: TRAIL_PAT.leaf, g: 10, drag: 1, fn: (p, dt) => { p.x += Math.sin(T_NOW * 6 + p.max * 30) * 12 * dt; } }); break;
    case 'SNOW': w.fx.add({ x, y: y - 12, vx: (R0() - 0.5) * 8, vy: 10, life: 1.1, c: '#ffffff', t: R0() < 0.5 ? 'pat' : 'fade', pat: TRAIL_PAT.flake, s: 1, drag: 0.5 }); break;
    case 'RAINBOW': for (let k = 0; k < 5; k++) w.fx.add({ x: pl.x - (pl.dir === 2 ? -4 : pl.dir === 3 ? 4 : 0), y: y - 10 + k * 2, life: 0.5, c: hex(hsl(k * 55 + T_NOW * 40, 0.9, 0.62)), s: 2, t: 'fade' }); break;
    case 'SMOKE': w.fx.add({ x, y: y - 4, vx: (R0() - 0.5) * 6, vy: -8, life: 1, c: R0() < 0.5 ? '#8a8f9c' : '#5d6270', s: 2, t: 'puff', drag: 0.8 }); break;
    default: w.fx.add({ x, y: y - 3, vx: (R0() - 0.5) * 10, vy: -8, life: 0.7, c: pick(), s: 2, t: 'fade' });
  }
}
let DARK_C = null;
function drawDarkness(R, cx, cy) {
  if (!DARK_C) DARK_C = mkCanvas(W, H);
  const g = DARK_C.x, pl = R.w.player, L = R.L.light;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(2,3,10,0.93)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { g.globalAlpha = a; g.beginPath(); g.ellipse(Math.floor(x), Math.floor(y), r, r * 0.8, 0, 0, TAU); g.fill(); };
  const px0 = pl.x - cx, py0 = pl.y - 10 - cy;
  hole(px0, py0, L * 1.25, 0.35); hole(px0, py0, L, 0.55); hole(px0, py0, L * 0.75, 1);
  for (const o of R.map.ores) if (o.left > 0) hole(o.x - cx, o.y - 6 - cy, 14, 0.5);
  for (const s of R.w.shots) hole(s.x - cx, s.y - cy, 10, 0.5);
  hole(R.map.shipX - cx, R.map.shipY - cy, 50, 0.5);
  for (const e of R.w.ents) if (e.boss) hole(e.x - cx, e.y - 10 - cy, 40, 0.4);
  if (R.w.beam) hole(px0 + Math.cos(R.w.beam.a) * 40, py0 + Math.sin(R.w.beam.a) * 40, 40, 0.5);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  ctx.drawImage(DARK_C, 0, 0);
  // glowing bits shine through
  for (const d of R.map.decos) if (d.s.glow && d.x > cx - 40 && d.x < cx + W + 40 && d.y > cy - 20 && d.y < cy + H + 60) { const x = Math.floor(d.x - d.s.w / 2 - cx), y = Math.floor(d.y - d.s.h - cy + 2); ctx.globalAlpha = 0.85 + 0.15 * Math.sin(T_NOW * 2 + d.x); if (d.flip) { ctx.save(); ctx.translate(x + d.s.w, y); ctx.scale(-1, 1); ctx.drawImage(d.s.glow, 0, 0); ctx.restore(); } else ctx.drawImage(d.s.glow, x, y); ctx.globalAlpha = 1; }
  for (const e of R.w.ents) { const x = e.x - cx, y = e.y - cy; if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue; const sz = e.boss ? 2 : 1; rect(x - 2 - sz, y - e.r - 3, sz + 1, sz, e.col2 || '#f44'); rect(x + 1, y - e.r - 3, sz + 1, sz, e.col2 || '#f44'); }
}
function drawAmbient(R, cx, cy) {
  const a = R.p.amb, A = R.amb; const dt = 1 / 60;
  const spawn = (n, f) => { for (let i = 0; i < n; i++) if (A.length < 140) A.push(f()); };
  switch (a) {
    case 'snow': spawn(2, () => ({ x: R0() * (W + 60), y: -4, vx: -14 - R0() * 8, vy: 22 + R0() * 18, c: '#fff', l: 14 })); break;
    case 'embers': spawn(1, () => ({ x: R0() * W, y: H + 4, vx: (R0() - 0.5) * 8, vy: -16 - R0() * 20, c: R0() < 0.5 ? '#ff9a3d' : '#ffd04a', l: 14 })); break;
    case 'emberfall': spawn(2, () => ({ x: R0() * (W + 80), y: -4, vx: -20, vy: 24 + R0() * 14, c: R0() < 0.4 ? '#ff7a2e' : '#7a7a80', l: 14 })); break;
    case 'spores': case 'spores2': case 'motes': case 'motes2': spawn(R0() < 0.4 ? 1 : 0, () => ({ x: R0() * W, y: R0() * H, vx: (R0() - 0.5) * 6, vy: -4 - R0() * 6, c: a === 'motes2' ? '#ffe9a0' : a === 'spores' ? '#c8ff8a' : a === 'spores2' ? (R0() < 0.5 ? '#b7ff4a' : '#d48bff') : (R0() < 0.5 ? '#4ef' : '#f6d'), l: 6 + R0() * 4, tw: true })); break;
    case 'bubbles': spawn(R0() < 0.3 ? 1 : 0, () => ({ x: R0() * W, y: H + 4, vx: 0, vy: -14 - R0() * 10, c: '#7fe9ff', l: 20, ring: true })); break;
    case 'sand': spawn(2, () => ({ x: W + 4, y: R0() * H, vx: -90 - R0() * 60, vy: 4, c: 'rgba(255,240,200,0.35)', l: 6, streak: true })); break;
    case 'dust': spawn(R0() < 0.3 ? 1 : 0, () => ({ x: R0() * W, y: R0() * H, vx: 6, vy: -2, c: 'rgba(220,220,240,0.35)', l: 8 })); break;
    case 'storm': spawn(4, () => ({ x: R0() * (W + 60), y: -6, vx: -40, vy: 260, c: 'rgba(150,170,255,0.4)', l: 2, streak: true })); if (R0() < 0.004) flash(0.25, '#d8e0ff'); break;
    case 'glint': spawn(R0() < 0.25 ? 1 : 0, () => ({ x: R0() * W, y: R0() * H, vx: 0, vy: 0, c: '#fff', l: 0.4, star: true })); break;
  }
  for (const p of A) {
    p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.star) { const k = Math.sin(p.l / 0.4 * Math.PI); if (k > 0.3) { rect(p.x, p.y - 1, 1, 3, p.c); rect(p.x - 1, p.y, 3, 1, p.c); } continue; }
    if (p.ring) { ring(p.x, p.y, 2, p.c); continue; }
    if (p.streak) { line(p.x, p.y, p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.c); continue; }
    if (p.tw && Math.sin(T_NOW * 4 + p.x) < -0.3) continue;
    rect(p.x, p.y, 1, 1, p.c);
  }
  R.amb = A.filter(p => p.l > 0 && p.y < H + 10 && p.y > -12 && p.x > -20 && p.x < W + 80);
  if (a === 'aurora') { for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.07; const c = ['#5cffb4', '#4ee8ff', '#c46dff'][i]; ctx.fillStyle = c; for (let x = 0; x < W; x += 4) { const y = 40 + i * 50 + Math.sin(x * 0.02 + T_NOW * 0.5 + i) * 30 + Math.sin(x * 0.007 - T_NOW * 0.3) * 20; ctx.fillRect(x, y, 4, 26); } ctx.globalAlpha = 1; } }
  if (a === 'cloudshadow') { ctx.globalAlpha = 0.12; for (let i = 0; i < 3; i++) { const x = ((T_NOW * 10 + i * 220) % (W + 300)) - 150 - (cx * 0.2 % 50), y = 40 + i * 80; ellipse(x, y, 80, 30, '#000'); } ctx.globalAlpha = 1; }
}
function drawCoinIcon(x, y) { x = Math.floor(x); y = Math.floor(y); rect(x + 1, y, 5, 7, '#fca311'); rect(x, y + 1, 7, 5, '#fca311'); rect(x + 2, y + 1, 1, 5, '#ffe2a8'); rect(x + 4, y + 2, 1, 3, '#a35f00'); }
function drawRunHUD(R) {
  const w = R.w, pl = w.player, L = R.L;
  // hp / o2
  panel(4, 4, 104, 30, { bg: 'rgba(5,6,15,0.82)', bd: COL.steel });
  text('HP', 9, 9, COL.coral, FS); bar(22, 8, 80, 7, pl.hp / pl.maxHp, '#ff4f6d', '#2a0a14', '#ff9aa8'); text(fmt(pl.hp), 62, 9, '#fff', FS, 1);
  const o2k = R.o2 / R.o2max, low = o2k < 0.25 && Math.floor(T_NOW * 4) % 2;
  text('O2', 9, 21, low ? COL.coral : COL.cyan, FS); bar(22, 20, 80, 7, o2k, low ? '#ff4f6d' : '#4ee8ff', '#06202a', '#bff6ff'); text(Math.ceil(R.o2) + 'S', 62, 21, '#fff', FS, 1);
  // current goal
  if (S.goal && !R.tut) { const G = goalInfo(); const done = S.goal.done; let t = done ? 'GOAL DONE! CLAIM IT AT THE STATION' : `GOAL: ${G.t}${G.need > 1 ? ` ${fmt(Math.min(G.cur, G.need))}/${fmt(G.need)}` : ''}`; while (textW(t, FS) > 200 && t.length > 8) t = t.slice(0, -1);
    const gw = textW(t, FS) + 8; ctx.globalAlpha = 0.9; panel(4, 37, gw, 11, { bg: 'rgba(5,6,15,0.82)', bd: done ? COL.gold : COL.steel }); ctx.globalAlpha = 1; text(t, 8, 40, done ? (Math.floor(T_NOW * 3) % 2 ? COL.gold : '#fff') : COL.pink, FS); }
  // combo
  if (w.combo > 0 && w.comboT > 0) { const m = Math.min(10, 1 + Math.floor(w.combo / 3)); const sc = m >= 5 ? 2 : 1; const t = `X${m} COMBO`; textO(t, W / 2, 6, m >= 8 ? 'RAINBOW' : m >= 5 ? COL.gold : COL.ink, '#000', FB, 1, sc); bar(W / 2 - 30, 8 + 7 * sc, 60, 2, w.comboT / w.comboMax, COL.gold); text(`${w.combo} KILLS`, W / 2, 13 + 7 * sc, COL.dim, FS, 1); }
  // boss bar
  if (w.boss) { const e = w.boss; panel(W / 2 - 110, 30, 220, 18, { bg: 'rgba(5,6,15,0.85)', bd: COL.coral }); text(R.p.boss[0], W / 2, 33, COL.coral, FS, 1); bar(W / 2 - 104, 40, 208, 4, e.hp / e.maxHp, '#ff4f6d', '#300', '#ffb0b8'); }
  // minimap
  const mx = W - 62, my = 4, ms = 56; panel(mx - 2, my - 2, ms + 4, ms + 4, { bg: '#000', bd: COL.steel });
  ctx.drawImage(R.map.mm, mx, my, ms, ms);
  const sc = ms / R.map.GW; const P = (x, y, c, s = 1) => rect(mx + x * sc - (s >> 1), my + y * sc - (s >> 1), s, s, c);
  const scanR = L.scan;
  for (const o of R.map.ores) if (o.left > 0 && (L.perks.scan || Math.hypot(o.x - pl.x, o.y - pl.y) < scanR)) P(o.x, o.y, oreHex(o.pi));
  for (const wr of R.map.wrecks) if (!wr.looted && (Math.hypot(wr.x - pl.x, wr.y - pl.y) < scanR * 1.6)) P(wr.x, wr.y, COL.gold, 2);
  for (const e of w.ents) if (Math.hypot(e.x - pl.x, e.y - pl.y) < 200) P(e.x, e.y, '#ff4f6d');
  if (R.bossAvail && !R.bossBeaten) { const bx = mx + R.map.lair.x * sc, by = my + R.map.lair.y * sc; if (Math.floor(T_NOW * 3) % 2) { rect(bx - 2, by - 2, 5, 5, '#ff2040'); px(bx - 1, by - 1, '#fff'); px(bx + 1, by - 1, '#fff'); } }
  if (R.carrier && Math.floor(T_NOW * 4) % 2) { const bx = mx + R.carrier.x * sc, by = my + R.carrier.y * sc; rect(bx - 2, by - 2, 5, 5, COL.gold); px(bx, by, '#fff'); }
  drawMinimapProps(R, mx, my, sc);
  P(R.map.shipX, R.map.shipY, '#fff', 3);
  P(pl.x, pl.y, Math.floor(T_NOW * 6) % 2 ? COL.mint : '#fff', 2);
  ctx.globalAlpha = 0.3; ctx.strokeStyle = COL.cyan; ctx.beginPath(); ctx.arc(mx + pl.x * sc, my + pl.y * sc, scanR * sc, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  // ship arrow
  const sx = R.map.shipX - R.cam.x, sy = R.map.shipY - R.cam.y;
  if (sx < 0 || sy < 0 || sx > W || sy > H) { const a = Math.atan2(sy - H / 2, sx - W / 2); const ax = clamp(W / 2 + Math.cos(a) * 200, 14, W - 14), ay = clamp(H / 2 + Math.sin(a) * 110, 50, H - 40); const full = R.cargoN >= L.cargo || R.o2 < R.o2max * 0.3; const c = full ? (Math.floor(T_NOW * 4) % 2 ? COL.gold : '#fff') : COL.dim; for (let i = 0; i < 4; i++) line(ax, ay, ax - Math.cos(a + (i < 2 ? 0.5 : -0.5)) * 6, ay - Math.sin(a + (i < 2 ? 0.5 : -0.5)) * 6, c); text('SHIP', ax, ay + 6, c, FS, 1); }
  if (R.carrier) { const ex = R.carrier.x - R.cam.x, ey = R.carrier.y - R.cam.y; if (ex < 0 || ey < 0 || ex > W || ey > H) { const a = Math.atan2(ey - H / 2, ex - W / 2); const ax = clamp(W / 2 + Math.cos(a) * 200, 14, W - 14), ay = clamp(H / 2 + Math.sin(a) * 110, 50, H - 40); const c = Math.floor(T_NOW * 5) % 2 ? COL.gold : '#fff'; for (let i = 0; i < 4; i++) line(ax, ay, ax - Math.cos(a + (i < 2 ? 0.5 : -0.5)) * 7, ay - Math.sin(a + (i < 2 ? 0.5 : -0.5)) * 7, c); text('CRATE ' + Math.ceil(R.carrier.life) + 'S', ax, ay + 6, c, FS, 1); } }
  // bottom-left: weapon / tool
  const slot = (x, id, active, label, skin, key) => { panel(x, H - 30, 40, 26, { bg: active ? COL.void3 : 'rgba(5,6,15,0.82)', bd: active ? COL.cyan : COL.steel }); if (id) drawItemIn(id, x + 2, H - 28, 36, 18, { skin, maxSc: 1, noFx: true }); else text('EMPTY', x + 20, H - 21, COL.mute, FS, 1); text(label, x + 20, H - 9, active ? COL.cyan : COL.mute, FS, 1); if (!IN.touch) { rect(x + 1, H - 29, 7, 7, active ? COL.cyan : COL.void3); text(key, x + 3, H - 28, active ? COL.navy : COL.dim, FS); } };
  slot(4, pl.Ws[0] && pl.Ws[0].id, pl.mode === 'weapon' && pl.wi === 0, 'WEAPON', S.eq.skin_weapon, '1'); gadgetSlot(46, pl); slot(88, S.eq.tool, pl.mode === 'tool', `TOOL T${L.toolTier}`, S.eq.skin_tool, '3');
  if (!IN.touch) { const kw = keycap(132, H - 29, 'Q', R.tut && TUT[R.tut.i] && TUT[R.tut.i].keys[0] === 'Q' && Math.floor(T_NOW * 2) % 2 === 0); text('SWAP', 135 + kw, H - 27, COL.dim, FS); const sw = keycap(132, H - 16, 'SPACE'); text('BOOST', 135 + sw, H - 14, COL.dim, FS); }
  const cx0 = IN.touch ? 132 : 188, cy0 = IN.touch ? H - 10 : H - 13; for (let i = 0; i < pl.maxCharges; i++) { const ready = i < pl.charges; rect(cx0 + i * 8, cy0, 6, 4, ready ? COL.gold : COL.void3); if (!ready && i === pl.charges) rect(cx0 + i * 8, cy0, Math.floor(6 * (1 - Math.max(0, pl.boostCd) / L.boostCd)), 4, '#7a5a10'); }
  if (pl.focusT > 0) textO('FOCUS X1.5', 132, H - 40, COL.gold, '#000', FS);
  // bottom-right: cargo
  panel(W - 112, H - 30, 108, 26, { bg: 'rgba(5,6,15,0.82)', bd: R.cargoN >= L.cargo ? COL.gold : COL.steel });
  text('CARGO', W - 106, H - 26, COL.dim, FS); text(`${R.cargoN}/${L.cargo}`, W - 10, H - 26, R.cargoN >= L.cargo ? COL.gold : COL.ink, FS, 2);
  bar(W - 106, H - 18, 96, 4, R.cargoN / L.cargo, COL.gold, COL.void2);
  let val = 0; for (const k in R.cargo) val += R.cargo[k] * ORE_VALUE(planetDef(+k).ore[1]); val = Math.round(val * L.oreMul + R.coins);
  drawCoinIcon(W - 106, H - 12); text(fmt(val), W - 96, H - 11, COL.gold, FS);
  const nCr = R.crates.length + R.choices; if (nCr) { miniCrate(W - 52, H - 14, R.haulTier); text('X' + nCr, W - 37, H - 11, COL.gold, FS); }
  drawEventHUD(R);
  // banner
  if (R.msgT > 0 && R.msg) { const a = Math.min(1, R.msgT); ctx.globalAlpha = a; const lines = wrap(R.msg, 320); lines.forEach((l, i) => textO(l, W / 2, (R.tut ? 82 : 92) + i * 10, R.msgC, '#000', FB, 1)); ctx.globalAlpha = 1; }
  if (R.state === 'land' && R.st < 1.4) { ctx.globalAlpha = Math.max(0, 1 - R.st / 1.4); rect(0, 0, W, H, '#fff'); ctx.globalAlpha = 1; }
  if (R.state === 'leave') { ctx.globalAlpha = Math.min(1, R.st / 2.2); rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
  if (IN.touch) {
    const B = TC.btn; for (const k in B) { const b = B[k]; if (!b) continue; panel(b[0], b[1], b[2], b[3], { bg: 'rgba(5,6,15,0.6)', bd: COL.steel }); text(k.toUpperCase(), b[0] + b[2] / 2, b[1] + 8, COL.ink, FS, 1); }
    if (TC.joy) { ctx.globalAlpha = 0.5; ring(TC.joy.sx, TC.joy.sy, 24, COL.ink); circ(TC.joy.x, TC.joy.y, 6, COL.ink); ctx.globalAlpha = 1; }
    else text('DRAG LEFT SIDE TO MOVE. TOUCH RIGHT SIDE TO AIM AND FIRE', W / 2, H - 40, COL.mute, FS, 1);
  }
  // crosshair
  if (!R.paused && !R.choice && !IN.touch) { const c = pl.mode === 'tool' ? COL.mint : COL.ink; const x = Math.floor(IN.mx), y = Math.floor(IN.my); rect(x - 4, y, 3, 1, c); rect(x + 2, y, 3, 1, c); rect(x, y - 4, 1, 3, c); rect(x, y + 2, 1, 3, c); }
}
function drawPause(R) {
  ctx.globalAlpha = 0.7; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  panel(W / 2 - 90, 60, 180, 140, { notch: true });
  textO('PAUSED', W / 2, 72, COL.cyan, '#000', FB, 1, 2);
  if (button(W / 2 - 70, 100, 140, 18, 'RESUME') || kp('Escape')) { R.paused = false; IN.kp.delete('Escape'); }
  if (button(W / 2 - 70, 122, 140, 18, 'EVACUATE (LOSE HALF ORE)', { col: '#5a1d2a' })) { R.paused = false; endRun('o2'); }
  if (button(W / 2 - 70, 144, 140, 18, SND.muted ? 'SOUND: OFF' : 'SOUND: ON')) { SND.setMute(!SND.muted); S.settings.mute = SND.muted; dirty(); }
  text('WASD MOVE  MOUSE AIM  CLICK FIRE', W / 2, 172, COL.dim, FS, 1); text('Q OR 1 2 3 SWAP  SPACE BOOST  E USE', W / 2, 180, COL.dim, FS, 1);
}

// ---------- results ----------
let RES = null;
function drawResults(dt) {
  const r = RES; r.t += dt;
  drawStarfield(dt, 1.5);
  const p = planetDef(r.pi);
  const sx = ((r.t * 60) % (W + 160)) - 120; drawShip(S.eq, sx, 2 + Math.sin(r.t * 2) * 2, 1, T_NOW, { thrust: 1 });
  if (!r.fx) r.fx = new Particles(300); r.fx.update(dt);
  if (r.dsnd && r.t < 6 && Math.random() < 0.5) r.fx.add({ x: 60 + Math.random() * 360, y: 18, vx: 0, vy: 40 + Math.random() * 40, g: 120, life: 2.2, c: Math.random() < 0.5 ? '#fca311' : COL.pink, s: 2 });
  panel(60, 18, 360, 234, { notch: true, bg: 'rgba(10,15,36,0.95)' });
  r.fx.draw();
  textO(r.lost ? 'EMERGENCY EVAC' : 'HAUL COMPLETE', W / 2, 26, r.lost ? COL.coral : COL.gold, '#000', FB, 1, 2);
  text(p.name, W / 2, 44, COL.dim, FS, 1);
  let y = 56; let shownTotal = 0; const step = 0.35;
  r.lines.forEach((l, i) => {
    const k = clamp((r.t - 0.4 - i * step) / step, 0, 1); if (k <= 0) return;
    if (k > 0 && !l.snd) { l.snd = true; SND.play('tally', i * 3); }
    oreIcon(l.pi, 76, y - 3); text(planetDef(l.pi).ore[0], 94, y, COL.ink, FB); text(`${l.n} X ${l.v}`, 260, y, COL.dim, FS, 2);
    const v = Math.round(l.t * k); text(fmt(v), 400, y, COL.gold, FB, 2); shownTotal += v; y += 13;
  });
  const kk = clamp((r.t - 0.4 - r.lines.length * step) / step, 0, 1);
  if (kk > 0) { text(`ALIENS (${r.kills})  BEST COMBO X${r.combo}`, 94, y, COL.ink, FB); text(fmt(r.kc * kk), 400, y, COL.gold, FB, 2); shownTotal += Math.round(r.kc * kk); y += 13; }
  if (r.mult > 1 && kk > 0) { text(`ORE VALUE BONUS X${r.mult.toFixed(2)} INCLUDED`, 94, y, COL.dim, FS); y += 10; }
  const nCr = r.crates.length;
  // haul crates showcase fills the space under the tally
  if (nCr || r.choices) {
    const kC = clamp((r.t - 0.6 - (r.lines.length + 1) * step) / 0.6, 0, 1);
    const big = nCr <= 10, cw = big ? 30 : 16, show = Math.min(nCr, big ? 10 : 18); const row0 = Math.max(y + 8, 112);
    const tw = show * cw + (r.choices ? 76 : 0); let x0 = Math.floor(W / 2 - tw / 2);
    text('HAUL CRATES. THEY OPEN NEXT', W / 2, row0 - 10, COL.pink, FS, 1);
    for (let i = 0; i < show; i++) { const c = r.crates[i]; const a = clamp(kC * show - i, 0, 1); if (a <= 0) continue; if (!c.snd) { c.snd = true; SND.play('unlock'); } const bob = Math.round(Math.sin(T_NOW * 3 + i * 0.8) * 1.5); const cx2 = x0 + i * cw, cy2 = row0 + 4 + bob - Math.round((1 - ease.back(a)) * 14);
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 4 + i); ellipse(cx2 + (big ? 12 : 6), cy2 + (big ? 20 : 10), big ? 14 : 7, 3, tierColor(c.tier)); ctx.globalAlpha = 1;
      if (big) { ctx.save(); ctx.translate(cx2, cy2); ctx.scale(2, 2); miniCrate(0, 0, c.tier); ctx.restore(); } else miniCrate(cx2, cy2, c.tier);
      if (inBox(cx2 - 2, cy2 - 2, cw, big ? 24 : 12)) TIP.set(`${TIERS[c.tier].n} ${kindInfo(c.kind).n} CRATE`); }
    let tx = x0 + show * cw + 2; if (nCr > show) { text(`+${nCr - show}`, tx, row0 + 10, COL.gold, FB); tx += 22; }
    if (r.choices && kC >= 1) { text(`+${r.choices} CHOICE`, tx, row0 + 6, COL.lilac, FS); text(`CRATE${r.choices > 1 ? 'S' : ''}`, tx, row0 + 13, COL.lilac, FS); }
  }
  y = Math.max(y, 176);
  rect(76, y, 328, 1, COL.steel); y += 6;
  drawCoinIcon(76, y); text('TOTAL', 90, y, COL.ink, FB);
  const done = r.t > 0.6 + (r.lines.length + 1) * step;
  textO(fmt(done ? r.total : shownTotal), 404, y - 3, COL.gold, '#000', FB, 2, 2);
  if (done && !r.dsnd) { r.dsnd = true; SND.play('coin'); SND.play('win'); }
  y += 18;
  text(`+${r.xp} XP${r.lvUp ? `  LEVEL UP! NOW LEVEL ${S.lvl}` : ''}`, 90, y, COL.cyan, FS);
  text(`YOU HAVE ${fmt(S.coins)} COINS`, 404, y, COL.dim, FS, 2);
  y += 11;
  if (!nCr && !r.choices) text('NO CRATES THIS HAUL. TRY CARRIERS, BOSSES, EVENTS, SEALS AND CACHES', W / 2, y + 2, COL.mute, FS, 1);
  if (done || r.t > 1) {
    if (nCr) {
      if (button(W / 2 - 100, 224, 200, 22, `OPEN ${nCr} HAUL CRATE${nCr > 1 ? 'S' : ''}`, { kind: 'primary' }) || kp('Enter') || kp('Space')) { startHaulOpen(S.haulCrates.splice(0)); return; }
    } else {
      if (button(W / 2 - 150, 226, 140, 18, r.choices ? 'PICK YOUR SALVAGE' : 'BACK TO STATION', { kind: 'primary' }) || kp('Enter')) { goHub(); }
      if (button(W / 2 + 10, 226, 140, 18, 'LAND AGAIN', { kind: 'blue' })) { startRun(r.pi); }
    }
  }
  if (IN.pr && !done) r.t += 10;
}
function rollEvent(pi, not) { const opts = EVENT_KEYS.filter(k => k !== not); return opts[R0.int(opts.length)]; }
function ensureEvents() { for (let p = 1; p <= Math.min(99, S.planet.reached + 1); p++) if (!S.planet.ev[p]) S.planet.ev[p] = rollEvent(p); }
function gadgetSlot(x, pl) {
  const G = pl.G; const ready = G && G.cd <= 0;
  panel(x, H - 30, 40, 26, { bg: ready ? '#1d1440' : 'rgba(5,6,15,0.82)', bd: ready ? (Math.floor(T_NOW * 3) % 2 ? COL.gold : COL.cyan) : COL.steel });
  if (G) {
    drawItemIn(G.id, x + 2, H - 28, 36, 18, { maxSc: 1, noFx: true });
    if (!ready) { const k = clamp(G.cd / G.max, 0, 1); ctx.globalAlpha = 0.7; rect(x + 1, H - 29, 38, Math.ceil(18 * k), '#000'); ctx.globalAlpha = 1; textO(Math.ceil(G.cd) + '', x + 20, H - 24, COL.ink, '#000', FB, 1); }
  } else text('NONE', x + 20, H - 21, COL.mute, FS, 1);
  text(G ? (ready ? 'READY' : 'GADGET') : 'GADGET', x + 20, H - 9, ready ? COL.gold : COL.mute, FS, 1);
  if (!IN.touch && G) { rect(x + 1, H - 29, 7, 7, COL.void0); text('F', x + 3, H - 28, COL.ink, FS); }
}
function setSlot(pl, w, slot) {
  if (slot === 2) { if (pl.mode === 'tool') return; pl.mode = 'tool'; }
  else { if (!pl.Ws[slot] || (pl.mode === 'weapon' && pl.wi === slot)) return; pl.mode = 'weapon'; pl.wi = slot; pl.W = pl.Ws[slot]; }
  w.beam = null; pl.charge = 0; pl.fullAt = undefined; pl.heat = 0; SND.play('click');
  const name = pl.mode === 'tool' ? 'MINING TOOL' : getDef(pl.W.id).name; w.fx.text(pl.x, pl.y - 30, name, COL.lilac, { f: FS, life: 0.6 });
}
function cycleSlot(pl, w) { const order = [0]; order.push(2); const cur = pl.mode === 'tool' ? 2 : pl.wi; const i = order.indexOf(cur); setSlot(pl, w, order[(i + 1) % order.length]); }
function propSpot(R, rng, r, minShip, far) {
  const map = R.map;
  for (let i = 0; i < 160; i++) {
    const x = rng.range(50, map.GW - 50), y = rng.range(50, map.GH - 50);
    if (map.solidP(x, y) || map.solidP(x + r, y) || map.solidP(x - r, y) || map.solidP(x, y - r * 0.7) || map.solidP(x, y + r * 0.7)) continue;
    if (Math.hypot(x - map.shipX, y - map.shipY) < minShip) continue;
    if (Math.hypot(x - map.lair.x, y - map.lair.y) < 90) continue;
    if (far && far.some(f => Math.hypot(f.x - x, f.y - y) < f.d)) continue;
    let ok = true; for (const o of map.occ) if (Math.hypot(o[0] - x, o[1] - y) < r + o[2]) { ok = false; break; } if (!ok) continue;
    map.occ.push([x, y, r]); return { x, y };
  }
  return null;
}
function setupProps(R, rng) {
  const w = R.w, P = w.props, pi = R.pi, hm = w.hpMul;
  const add = (o) => { P.push(Object.assign({ dead: false, flash: 0, t: 0 }, o)); return P[P.length - 1]; };
  for (let c = 0; c < 6; c++) { const s = propSpot(R, rng, 10, 120); if (!s) continue; const n = 2 + rng.int(2); for (let i = 0; i < n; i++) add({ kind: 'pod', x: s.x + (i - 1) * 11 + rng.range(-3, 3), y: s.y + rng.range(-6, 6), r: 6, cy: 5, hp: 1, shoot: true, solid: true, col: '#ff5c9a' }); }
  for (let i = 0; i < 10; i++) { const s = propSpot(R, rng, 11, 90); if (s) add({ kind: 'boulder', x: s.x, y: s.y, r: 10, cy: 7, hp: 55 * hm, maxHp: 55 * hm, shoot: true, solid: true, col: '#9aa3c0' }); }
  const tier = clamp(planetDef(pi).ore[1] + 2, 2, 12);
  for (let i = 0; i < 2; i++) { const s = propSpot(R, rng, 12, 220); if (s) add({ kind: 'seal', x: s.x, y: s.y, r: 11, cy: 10, mine: true, tier, prog: 0, units: 5, left: 5, solid: true }); }
  for (let i = 0; i < 2; i++) { const s = propSpot(R, rng, 10, 160); if (s) add({ kind: 'turret', x: s.x, y: s.y, r: 8, use: 'E  ACTIVATE TURRET', solid: true, on: 0, cd: 0, aim: 0 }); }
  { const s = propSpot(R, rng, 10, 200); if (s) add({ kind: 'o2st', x: s.x, y: s.y, r: 8, use: 'E  REFILL O2', solid: true }); }
  for (let i = 0; i < 2; i++) { const s = propSpot(R, rng, 10, 260, P.filter(p => p.kind === 'cache').map(p => ({ x: p.x, y: p.y, d: 300 }))); if (s) add({ kind: 'cache', x: s.x, y: s.y, r: 8, cy: 3, hidden: true, found: false, dig: true, tier: 1, prog: 0, units: 3, left: 3 }); }
}
function onRunProp(p, el) {
  const R = RUN, w = R.w;
  if (p.kind === 'boulder') { const n = 4 + R0.int(4); for (let i = 0; i < n; i++) R.chunks.push({ x: p.x, y: p.y - 8, vx: (R0() - 0.5) * 120, vy: -60 - R0() * 70, t: 0, pi: R.pi, delay: 0.3 }); if (R0() < 0.3) for (let i = 0; i < 4; i++) R.chunks.push({ x: p.x, y: p.y - 8, vx: (R0() - 0.5) * 120, vy: -R0() * 100, t: 0, coin: true, delay: 0.3 }); SND.play('kill'); shake(2); }
}
function propMined(p) {
  const R = RUN, w = R.w;
  p.dead = true;
  if (p.kind === 'seal') { addHaulCrate('salvage:' + R.pi, Math.min(7, R.haulTier + 1), p.x, p.y - 10); for (let i = 0; i < 8; i++) R.chunks.push({ x: p.x, y: p.y - 8, vx: (R0() - 0.5) * 140, vy: -R0() * 120, t: 0, coin: true, delay: 0.3 }); banner('CRYSTAL SEAL CRACKED! +1 SALVAGE CRATE', COL.gold); w.fx.burst(p.x, p.y - 10, 40, { c: ['#bff6ff', '#fff', COL.gold], sp: 160, life: 0.8, s: 2, t: 'shrink' }); SND.play('win'); shake(4); }
  if (p.kind === 'cache') {
    S.stats.caches++; const roll = R0(); w.fx.burst(p.x, p.y - 4, 30, { c: [COL.gold, '#fff', COL.pink], sp: 140, life: 0.8, s: 2, t: 'shrink' }); SND.play('fanfare'); shake(3);
    if (roll < 0.5) { addHaulCrate(R0() < 0.5 ? 'galaxy' : 'salvage:' + R.pi, Math.min(7, R.haulTier + 1), p.x, p.y - 8); banner('BURIED CACHE! +1 CRATE FOR YOUR HAUL', COL.gold); }
    else if (roll < 0.8) { const v = Math.round(200 * Math.pow(1.3, R.pi - 1)); R.coins += v; for (let i = 0; i < 10; i++) R.chunks.push({ x: p.x, y: p.y - 6, vx: (R0() - 0.5) * 160, vy: -R0() * 140, t: 0, coin: true, delay: 0.3 }); banner(`BURIED CACHE! +${fmt(v)} COINS`, COL.gold); }
    else { const opts = []; ARTIFACTS.forEach((a, k) => { const c = S.clues[k] || [0, 0, 0]; c.forEach((v, j) => { if (!v) opts.push([k, j]); }); }); if (opts.length) { const [k, j] = R0.pick(opts); (S.clues[k] = S.clues[k] || [0, 0, 0])[j] = 1; banner(`ANCIENT TABLET: ${ARTIFACTS[k].n} NEEDS ${getDef(artifactIngredients(k)[j]).name}`, COL.lilac); } else { addHaulCrate('galaxy', R.haulTier, p.x, p.y - 8); banner('BURIED CACHE! +1 CRATE', COL.gold); } }
    dirty();
  }
}
const TURRET_W = { cls: 'blaster', rate: 3.2, spd: 280, rng: 180, v: {}, el: null, col: { core: '#ffffff', mid: '#7fe9ff', edge: '#7161ef' }, pierce: 0, aoe: 0 };
function updateProps(R, dt) {
  const w = R.w, pl = w.player;
  for (const p of w.props) {
    if (p.dead) continue; p.t += dt; if (p.flash > 0) p.flash -= dt;
    const d = Math.hypot(pl.x - p.x, pl.y - p.y);
    if (p.use && d < p.r + 16 && !R.prompt) {
      R.prompt = { x: p.x, y: p.y - 30, t: p.use };
      if (p.kind === 'turret' && kp('KeyE')) { p.on = 25; p.use = null; banner('TURRET ONLINE FOR 25 SECONDS', COL.blueL); SND.play('unlock'); }
      if (p.kind === 'o2st' && kp('KeyE')) { R.o2 = Math.min(R.o2max, R.o2 + R.o2max * 0.45); p.use = null; p.used = true; w.fx.burst(p.x, p.y - 10, 20, { c: ['#4ee8ff', '#fff'], sp: 80 }); w.fx.text(pl.x, pl.y - 30, '+O2', '#4ee8ff', { f: FB }); SND.play('pickup'); }
      if (p.kind === 'pylon' && !p.on) { if (key('KeyE') || (IN.touch && IN.down)) { p.charge = (p.charge || 0) + dt; if (R0() < 0.4) w.fx.add({ x: p.x + (R0() - 0.5) * 10, y: p.y - 20, vx: 0, vy: -30, life: 0.4, c: '#7fe9ff', s: 1 }); if (p.charge >= 2.5) { p.on = true; p.use = null; R.ev.n++; SND.play('unlock'); banner(R.ev.n >= R.ev.need ? 'ALL PYLONS ON! THE VAULT IS OPEN' : `PYLON POWERED ${R.ev.n}/${R.ev.need}`, COL.gold); if (R.ev.n >= R.ev.need) { const v = w.props.find(q => q.kind === 'vault'); if (v) { v.use = 'E  OPEN THE VAULT'; v.open = true; } } else eventWave(R, p.x, p.y, 4); } } }
      if (p.kind === 'vault' && p.open && kp('KeyE')) { p.use = null; p.looted = true; completeEvent(R, p.x, p.y); }
      if (p.kind === 'drill' && R.ev && R.ev.st === 'ready' && kp('KeyE')) { R.ev.st = 'run'; R.ev.t = 40; p.use = null; banner('DRILL STARTED. KEEP IT ALIVE FOR 40 SECONDS', COL.blueL); SND.play('unlock'); }
      if (p.kind === 'start' && kp('KeyE')) { p.dead = true; startRace(R); }
    }
    if (p.kind === 'turret' && p.on > 0) {
      p.on -= dt; p.cd -= dt; const tg = nearestEnemy(w, p.x, p.y, 170);
      if (tg) { p.aim = Math.atan2(tg.y - 4 - (p.y - 12), tg.x - p.x); if (p.cd <= 0) { p.cd = 1 / TURRET_W.rate; const Wt = Object.assign({}, TURRET_W, { dmg: 9 * w.hpMul }); const s = makeShot(w, { x: p.x, y: p.y - 6 }, Wt, p.aim, { r: 2 }); s.x = p.x + Math.cos(p.aim) * 8; s.y = p.y - 12 + Math.sin(p.aim) * 8; SND.play('pew'); } }
      if (p.on <= 0) { p.on = 0; w.fx.burst(p.x, p.y - 10, 10, { c: ['#9aa3c0', '#fff'], sp: 60 }); }
    }
    if (p.kind === 'cache' && !p.found && d < 22) { p.found = true; p.hidden = false; banner('SOMETHING IS BURIED HERE. DIG IT UP WITH YOUR MINING TOOL', COL.gold); SND.play('upgradeHint'); }
  }
}
function updateSignal(R, dt) {
  const pl = R.w.player; let best = 1e9;
  for (const p of R.w.props) if (p.kind === 'cache' && !p.dead) best = Math.min(best, Math.hypot(p.x - pl.x, p.y - pl.y));
  R.signal = clamp(1 - best / 280, 0, 1);
  if (R.signal > 0) { R.sigT -= dt; if (R.sigT <= 0) { R.sigT = lerp(1.3, 0.12, R.signal); SND.play('tick', 500 + R.signal * 1200); } }
}
// ---------- events ----------
function setupEvent(R, k, rng) {
  const w = R.w, hm = w.hpMul; R.ev = { k, st: 'active', n: 0, need: 0, t: 0 };
  const far = (pts, d) => pts.map(p => ({ x: p.x, y: p.y, d }));
  if (k === 'vault') {
    const pts = []; for (let i = 0; i < 3; i++) { const s = propSpot(R, rng, 12, 220, far(pts, 320)); if (s) { pts.push(s); w.props.push({ kind: 'pylon', x: s.x, y: s.y, r: 8, use: 'HOLD E  POWER THE PYLON', solid: true, on: false, dead: false, flash: 0, t: 0 }); } }
    const v = propSpot(R, rng, 18, 260, far(pts, 200)) || propSpot(R, rng, 18, 120) || { x: R.map.shipX + 70, y: R.map.shipY + 50 }; w.props.push({ kind: 'vault', x: v.x, y: v.y, r: 16, solid: true, open: false, dead: false, flash: 0, t: 0 });
    R.ev.need = pts.length; if (!pts.length) { R.ev = null; return; }
  }
  if (k === 'nests') { const pts = []; for (let i = 0; i < 4; i++) { const s = propSpot(R, rng, 14, 260, far(pts, 260)); if (!s) continue; pts.push(s); const e = spawnEnemy(w, 'nest', s.x, s.y); e.hp = e.maxHp = 240 * hm; } R.ev.need = pts.length; if (!pts.length) R.ev = null; }
  if (k === 'drill') { const s = propSpot(R, rng, 14, 140) || { x: R.map.shipX + 120, y: R.map.shipY }; w.props.push({ kind: 'drill', x: s.x, y: s.y, r: 12, use: 'E  START THE DRILL', solid: true, hp: 300 * w.dmgMul, maxHp: 300 * w.dmgMul, dead: false, flash: 0, t: 0 }); R.ev.st = 'ready'; R.ev.drill = w.props[w.props.length - 1]; }
  if (k === 'elite') { const s = propSpot(R, rng, 14, 330) || propSpot(R, rng, 14, 160) || { x: R.map.shipX - 90, y: R.map.shipY + 40 }; const e = spawnEnemy(w, 'brute', s.x, s.y); e.elite = true; e.armored = true; e.hp = e.maxHp = e.hp * 14; e.r = 14; e.dmg *= 1.5; e.spd *= 0.95; e.coin *= 12; e.xp *= 10; e.name = rng.pick(ELITE_NAMES); e.home = s; R.ev.elite = e; R.ev.need = 1; }
  if (k === 'race') { const s = propSpot(R, rng, 10, 60) || { x: R.map.shipX + 60, y: R.map.shipY + 40 }; w.props.push({ kind: 'start', x: s.x, y: s.y, r: 8, use: 'E  START THE SIGNAL RACE', solid: false, dead: false, flash: 0, t: 0 }); R.ev.st = 'ready'; R.ev.need = 5; }
  if (k === 'meteor') { R.ev.need = 5; R.ev.mT = 6; }
}
function eventWave(R, x, y, n, tgt) {
  const w = R.w, arch = planetRoster(w.pi);
  for (let i = 0; i < n; i++) for (let tries = 0; tries < 8; tries++) { const a = R0() * TAU, d = 150 + R0() * 60; const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d; if (!w.solid(ex, ey)) { const e = spawnEnemy(w, R0.pick(arch), ex, ey); if (tgt) e.tgt = tgt; break; } }
}
function startRace(R) { R.ev.st = 'run'; R.ev.n = 0; nextBeacon(R); banner('RACE! REACH THE BEACON BEFORE THE TIMER RUNS OUT', COL.mint); SND.play('unlock'); }
function nextBeacon(R) {
  const pl = R.w.player, map = R.map;
  for (let i = 0; i < 80; i++) { const a = R0() * TAU, d = 170 + R0() * 110; const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (x < 50 || y < 50 || x > map.GW - 50 || y > map.GH - 50 || map.solidP(x, y) || map.solidP(x + 6, y) || map.solidP(x - 6, y)) continue; R.ev.b = { x, y }; R.ev.t = 14 - R.ev.n; return; }
  R.ev.b = { x: map.shipX, y: map.shipY + 30 }; R.ev.t = 14;
}
function completeEvent(R, x, y) {
  const ev = R.ev; if (!ev || ev.st === 'done') return; ev.st = 'done';
  const k = ev.k, n = EVENTS[k].rw, t = Math.min(7, R.haulTier + 1);
  const kind = { vault: 'salvage:' + R.pi, nests: 'galaxy', drill: 'mining', elite: 'weapon', race: 'galaxy', meteor: 'mining' }[k];
  for (let i = 0; i < n; i++) addHaulCrate(kind, t, x, y - 8);
  if (k === 'drill') for (let i = 0; i < 18; i++) R.chunks.push({ x, y: y - 8, vx: (R0() - 0.5) * 160, vy: -R0() * 140, t: 0, pi: R.pi, delay: 0.3 });
  S.stats.events++; dirty();
  banner(`EVENT COMPLETE: ${EVENTS[k].n}! +${n} CRATE${n > 1 ? 'S' : ''} FOR YOUR HAUL`, COL.gold); SND.play('fanfare'); flash(0.4, COL.gold); shake(5);
  R.w.fx.burst(x, y - 8, 50, { c: [COL.gold, '#fff', EVENTS[k].c], sp: 180, life: 0.9, s: 2, t: 'shrink' });
}
function failEvent(R, why) { if (!R.ev || R.ev.st === 'done' || R.ev.st === 'failed') return; R.ev.st = 'failed'; banner(`EVENT FAILED: ${why}`, COL.coral); SND.play('lose'); }
function updateEvent(R, dt) {
  const ev = R.ev; if (!ev || ev.st === 'done' || ev.st === 'failed') return; const w = R.w, pl = w.player;
  if (ev.k === 'drill' && ev.st === 'run') {
    const dr = ev.drill; ev.t -= dt; ev.waveT = (ev.waveT || 0) - dt;
    if (ev.waveT <= 0) { ev.waveT = 5; eventWave(R, dr.x, dr.y, 3 + Math.floor((40 - ev.t) / 10), dr); }
    if (R0() < 0.5) w.fx.add({ x: dr.x + (R0() - 0.5) * 16, y: dr.y - 4, vx: (R0() - 0.5) * 50, vy: -R0() * 60, g: 200, life: 0.5, c: oreHex(R.pi), s: 1 });
    if (dr.hp <= 0) { dr.dead = true; failEvent(R, 'THE DRILL WAS DESTROYED'); for (const e of w.ents) if (e.tgt === dr) e.tgt = null; }
    else if (ev.t <= 0) { for (const e of w.ents) if (e.tgt === dr) e.tgt = null; completeEvent(R, dr.x, dr.y); }
  }
  if (ev.k === 'race' && ev.st === 'run') {
    ev.t -= dt;
    if (Math.hypot(pl.x - ev.b.x, pl.y - ev.b.y) < 20) { ev.n++; SND.play('win'); w.fx.burst(ev.b.x, ev.b.y - 10, 24, { c: [COL.mint, '#fff'], sp: 120 }); if (ev.n >= ev.need) completeEvent(R, pl.x, pl.y); else { nextBeacon(R); banner(`BEACON ${ev.n}/${ev.need}`, COL.mint); } }
    else if (ev.t <= 0) failEvent(R, 'TOO SLOW. THE SIGNAL FADED');
  }
  if (ev.k === 'elite' && ev.elite && !ev.elite.dead) { const e = ev.elite; const dp = Math.hypot(pl.x - e.x, pl.y - e.y); if (dp > 220 && !e.tgt) { e.tgt = null; e.st = 'move'; if (!e.wander || R0() < 0.01) e.wander = { x: e.home.x + (R0() - 0.5) * 140, y: e.home.y + (R0() - 0.5) * 100, dead: false, r: 4 }; e.tgt = e.wander; } else if (dp <= 220 && e.tgt) e.tgt = null; }
  if (ev.k === 'meteor') {
    ev.mT -= dt;
    if (ev.mT <= 0) { ev.mT = 7 + R0() * 3; const a = R0() * TAU, d = 50 + R0() * 120; const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (!w.solid(x, y)) w.tele.push({ x, y, r: 22, t: 0, max: 1.6, dmg: 16 * w.dmgMul, col: '#ff7a2e', meteor: true, onDone: t => { const o = { x: t.x, y: t.y, pi: R.pi, tier: R.p.ore[1], size: 2, units: 8, left: 8, prog: 0, shake: 0, meteor: true }; R.map.ores.push(o); R.w.fx.burst(t.x, t.y - 4, 30, { c: ['#ff9a3d', '#fff', oreHex(R.pi)], sp: 140, life: 0.7, s: 2 }); } }); }
  }
}
function drawProp(R, p, cx, cy) {
  const x = Math.floor(p.x - cx), y = Math.floor(p.y - cy), fl = p.flash > 0;
  switch (p.kind) {
    case 'pod': {
      const g = 0.35 + 0.25 * Math.sin(T_NOW * 4 + p.x); shadow(x, y, 5, 2, 0.35);
      ctx.globalAlpha = g; ellipse(x, y - 5, 8, 8, '#ff5c9a'); ctx.globalAlpha = 1;
      ellipse(x, y - 4, 5, 5, '#5a1030'); ellipse(x, y - 5, 4, 5, fl ? '#fff' : '#ff5c9a'); rect(x - 1, y - 8, 2, 2, '#ffd0e0'); px(x + 2, y - 3, '#c0306a');
      break;
    }
    case 'boulder': {
      shadow(x, y + 1, 10, 3, 0.35); const c = fl ? '#fff' : '#7d8299', c2 = fl ? '#fff' : '#a9aec4';
      ellipse(x, y - 6, 10, 8, '#3a3e52'); ellipse(x, y - 7, 9, 7, c); ellipse(x - 2, y - 9, 5, 3, c2);
      line(x - 4, y - 10, x - 1, y - 6, '#3a3e52'); line(x + 2, y - 11, x + 5, y - 7, '#3a3e52');
      const oc = oreHex(R.pi); px(x - 5, y - 6, oc); px(x + 4, y - 4, oc); px(x + 1, y - 12, oc); if (((T_NOW * 2 + p.x) % 3) < 0.2) { px(x + 1, y - 13, '#fff'); px(x, y - 12, '#fff'); px(x + 2, y - 12, '#fff'); }
      if (p.hp < p.maxHp) bar(x - 8, y - 19, 16, 2, p.hp / p.maxHp, '#dec0f1', COL.void3);
      break;
    }
    case 'seal': {
      shadow(x, y + 1, 9, 3, 0.35); const k = p.left / p.units; const sh = p.shake > 0 ? Math.round((R0() - 0.5) * 2) : 0; p.shake -= 1 / 60;
      ctx.fillStyle = '#4a8aa8'; ctx.beginPath(); ctx.moveTo(x + sh, y - 26); ctx.lineTo(x + 9 + sh, y - 10); ctx.lineTo(x + sh, y); ctx.lineTo(x - 9 + sh, y - 10); ctx.fill();
      ctx.fillStyle = '#bff6ff'; ctx.beginPath(); ctx.moveTo(x + sh, y - 24); ctx.lineTo(x + 6 + sh, y - 11); ctx.lineTo(x + sh, y - 3); ctx.lineTo(x - 3 + sh, y - 12); ctx.fill();
      rect(x - 2 + sh, y - 14, 5, 4, '#1e2749'); rect(x - 1 + sh, y - 17, 3, 3, '#1e2749'); px(x + sh, y - 13, COL.gold);
      ctx.globalAlpha = 0.2 + 0.15 * Math.sin(T_NOW * 3); ellipse(x, y - 12, 14, 14, '#bff6ff'); ctx.globalAlpha = 1;
      if (k < 1) bar(x - 8, y - 32, 16, 2, k, '#bff6ff', COL.void3);
      if (Math.hypot(R.w.player.x - p.x, R.w.player.y - p.y) < 60) text(`T${p.tier} SEAL`, x, y - 38, R.L.toolTier >= p.tier ? '#bff6ff' : COL.coral, FS, 1);
      break;
    }
    case 'turret': {
      shadow(x, y + 1, 8, 3, 0.35); rect(x - 6, y - 6, 12, 6, '#3a3e52'); rect(x - 5, y - 5, 10, 4, '#7d8299'); rect(x - 3, y - 12, 6, 6, '#a9aec4');
      const a = p.aim || 0; line(x, y - 9, x + Math.cos(a) * 8, y - 9 + Math.sin(a) * 6, '#e5e5e5');
      px(x, y - 10, p.on > 0 ? (Math.floor(T_NOW * 6) % 2 ? '#8cff3a' : '#fff') : p.use ? '#fca311' : '#555');
      if (p.on > 0) bar(x - 7, y - 17, 14, 2, p.on / 25, '#7fe9ff', COL.void3);
      break;
    }
    case 'o2st': {
      shadow(x, y + 1, 7, 2, 0.35); rect(x - 5, y - 16, 10, 16, p.used ? '#3a3e52' : '#273469'); rect(x - 3, y - 14, 6, 10, p.used ? '#555' : '#4ee8ff'); rect(x - 2, y - 13, 1, 8, '#bff6ff');
      text('O2', x, y - 23, p.used ? COL.mute : '#4ee8ff', FS, 1); break;
    }
    case 'pylon': {
      shadow(x, y + 1, 7, 2, 0.35); rect(x - 3, y - 24, 6, 24, '#273469'); rect(x - 2, y - 23, 4, 22, p.on ? '#7fe9ff' : '#5e548e'); rect(x - 5, y - 4, 10, 4, '#1e2749');
      if (p.on) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(T_NOW * 6); rect(x - 2, y - 120, 4, 96, '#7fe9ff'); ctx.globalAlpha = 1; }
      else { if (Math.floor(T_NOW * 2) % 2) px(x, y - 26, COL.gold); if (p.charge > 0) { ctx.strokeStyle = COL.gold; ctx.beginPath(); ctx.arc(x + 0.5, y - 14.5, 12, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, p.charge / 2.5)); ctx.stroke(); } }
      break;
    }
    case 'vault': {
      ctx.globalAlpha = 0.3; ellipse(x, y, 22, 9, '#000'); ctx.globalAlpha = 1;
      rect(x - 16, y - 10, 32, 14, '#3a2a10'); rect(x - 15, y - 9, 30, 12, p.open ? '#fca311' : '#7a5a20'); rect(x - 15, y - 9, 30, 2, '#ffe2a8');
      for (let i = -12; i <= 12; i += 6) rect(x + i, y - 6, 2, 8, p.open ? '#fff2c4' : '#3a2a10');
      if (p.open && !p.looted) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(T_NOW * 6); rect(x - 14, y - 60, 28, 50, '#fca311'); ctx.globalAlpha = 1; }
      text(p.looted ? 'EMPTY' : p.open ? 'OPEN!' : 'VAULT', x, y - 18, p.open ? COL.gold : COL.dim, FS, 1);
      break;
    }
    case 'drill': {
      shadow(x, y + 1, 12, 3, 0.4); rect(x - 10, y - 8, 20, 8, '#3a3e52'); rect(x - 9, y - 7, 18, 6, '#fca311'); rect(x - 2, y - 26, 4, 18, '#7d8299');
      const sp = RUN.ev && RUN.ev.st === 'run' ? Math.floor(T_NOW * 20) % 3 : 0; rect(x - 3 + sp % 2, y - 4, 6, 6, '#e5e5e5');
      if (p.hitT > 0) { p.hitT -= 1 / 60; ctx.globalAlpha = 0.6; rect(x - 10, y - 26, 20, 26, '#ff3050'); ctx.globalAlpha = 1; }
      bar(x - 12, y - 32, 24, 3, p.hp / p.maxHp, COL.blueL, '#300');
      break;
    }
    case 'start': { rect(x - 1, y - 22, 2, 22, '#e5e5e5'); rect(x + 1, y - 22, 8, 5, COL.mint); ellipse(x, y, 8, 3, '#273469'); break; }
    case 'cache': {
      const pl = R.w.player; const near = Math.hypot(pl.x - p.x, pl.y - p.y) < 60;
      if (!p.found) {
        rect(x - 6, y - 2, 3, 2, '#5e548e'); rect(x + 4, y - 3, 3, 2, '#5e548e'); rect(x - 1, y + 2, 3, 2, '#5e548e');
        rect(x - 2, y - 8, 4, 6, '#6a62a0'); const glow = R.signal > 0.6 || R.scanR >= 4; px(x - 1, y - 6, glow && Math.floor(T_NOW * 4) % 2 ? COL.gold : '#3a3462'); px(x, y - 5, glow ? '#dec0f1' : '#3a3462');
        if (R.scanR >= 4 || (near && R.signal > 0.85)) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T_NOW * 6); line(x - 4, y - 2, x + 4, y + 4, COL.gold); line(x + 4, y - 2, x - 4, y + 4, COL.gold); ctx.globalAlpha = 1; }
      } else {
        const k = p.left / p.units; ellipse(x, y + 1, 9, 4, '#3a2a10'); line(x - 5, y - 3, x + 5, y + 5, COL.gold); line(x + 5, y - 3, x - 5, y + 5, COL.gold);
        if (R0() < 0.2) R.w.fx.add({ x: p.x + (R0() - 0.5) * 10, y: p.y - 2, vx: 0, vy: -20, life: 0.5, c: COL.gold, s: 1 });
        bar(x - 8, y - 10, 16, 2, 1 - k + (p.prog / p.units), COL.gold, COL.void3); text('DIG', x, y - 18, COL.gold, FS, 1);
      }
      break;
    }
  }
}
function drawEventWorld(R, cx, cy) {
  const ev = R.ev; if (!ev) return;
  if (ev.k === 'race' && ev.st === 'run' && ev.b) {
    const x = ev.b.x - cx, y = ev.b.y - cy;
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 8); rect(x - 4, y - 140, 8, 140, COL.mint); ctx.globalAlpha = 1;
    ellipse(x, y, 14, 6, '#1e2749'); ring(x, y, 10 + Math.floor((T_NOW * 10) % 6), COL.mint);
    textO(Math.ceil(ev.t) + 'S', x, y - 30, ev.t < 4 ? COL.coral : COL.mint, '#000', FB, 1);
  }
}
function eventTarget(R) {
  const ev = R.ev, w = R.w, pl = w.player; if (!ev || ev.st === 'done' || ev.st === 'failed') return null;
  const near = arr => { let b = null, bd = 1e9; for (const o of arr) { const d = Math.hypot(o.x - pl.x, o.y - pl.y); if (d < bd) { bd = d; b = o; } } return b; };
  if (ev.k === 'vault') { const v = w.props.find(p => p.kind === 'vault'); if (v && v.open) return { x: v.x, y: v.y, l: 'VAULT' }; const p = near(w.props.filter(p => p.kind === 'pylon' && !p.on)); return p ? { x: p.x, y: p.y, l: 'PYLON' } : null; }
  if (ev.k === 'nests') { const e = near(w.ents.filter(e => e.nest && !e.dead)); return e ? { x: e.x, y: e.y, l: 'NEST' } : null; }
  if (ev.k === 'drill') return ev.drill && !ev.drill.dead ? { x: ev.drill.x, y: ev.drill.y, l: 'DRILL' } : null;
  if (ev.k === 'elite') return ev.elite && !ev.elite.dead ? { x: ev.elite.x, y: ev.elite.y, l: 'ELITE' } : null;
  if (ev.k === 'race') { if (ev.st === 'run') return { x: ev.b.x, y: ev.b.y, l: Math.ceil(ev.t) + 'S' }; const s = w.props.find(p => p.kind === 'start' && !p.dead); return s ? { x: s.x, y: s.y, l: 'START' } : null; }
  return null;
}
function drawArrowTo(R, t, c, lbl) {
  const sx = t.x - R.cam.x, sy = t.y - R.cam.y; if (sx >= 0 && sy >= 0 && sx <= W && sy <= H) return;
  const a = Math.atan2(sy - H / 2, sx - W / 2); const ax = clamp(W / 2 + Math.cos(a) * 200, 14, W - 14), ay = clamp(H / 2 + Math.sin(a) * 110, 50, H - 40);
  for (let i = 0; i < 4; i++) line(ax, ay, ax - Math.cos(a + (i < 2 ? 0.5 : -0.5)) * 7, ay - Math.sin(a + (i < 2 ? 0.5 : -0.5)) * 7, c); text(lbl, ax, ay + 6, c, FS, 1);
}
function drawEventHUD(R) {
  const ev = R.ev; const x = W - 152, y = 64;
  if (ev) {
    const E = EVENTS[ev.k]; let line2 = '';
    if (ev.st === 'done') line2 = 'COMPLETE! CRATES ADDED'; else if (ev.st === 'failed') line2 = 'FAILED';
    else switch (ev.k) {
      case 'vault': line2 = `PYLONS ${ev.n}/${ev.need}`; break; case 'nests': line2 = `NESTS ${ev.n}/${ev.need}`; break;
      case 'drill': line2 = ev.st === 'ready' ? 'FIND THE DRILL, PRESS E' : `KEEP IT ALIVE ${Math.ceil(ev.t)}S`; break;
      case 'elite': line2 = 'HIT IT FROM BEHIND'; break; case 'race': line2 = ev.st === 'ready' ? 'PRESS E AT THE FLAG TO START' : `BEACON ${ev.n + 1}/${ev.need}  ${Math.ceil(ev.t)}S`; break;
      case 'meteor': line2 = `METEOR DEPOSITS ${ev.n}/${ev.need}`; break;
    }
    panel(x, y, 148, 22, { bg: 'rgba(5,6,15,0.85)', bd: ev.st === 'done' ? COL.gold : ev.st === 'failed' ? COL.coral : E.c });
    text(E.n, x + 5, y + 4, E.c, FS); text(E.tag, x + 143, y + 4, COL.mute, FS, 2); text(line2, x + 5, y + 13, ev.st === 'done' ? COL.gold : ev.st === 'failed' ? COL.coral : COL.ink, FS);
    const t = eventTarget(R); if (t) drawArrowTo(R, t, E.c, t.l);
  }
  // signal meter for buried caches
  if (R.signal > 0) { const sx = 4, sy = R.tut ? 82 : 51; panel(sx, sy, 62, 12, { bg: 'rgba(5,6,15,0.82)', bd: R.signal > 0.85 ? COL.gold : COL.steel }); text('SIGNAL', sx + 4, sy + 4, COL.gold, FS); const n = Math.ceil(R.signal * 5); for (let i = 0; i < 5; i++) rect(sx + 32 + i * 5, sy + 8 - i, 3, 2 + i, i < n ? (Math.floor(T_NOW * (2 + R.signal * 8)) % 2 && i === n - 1 ? '#fff' : COL.gold) : COL.void3); }
}
function drawMinimapProps(R, mx, my, sc) {
  const w = R.w, pl = w.player; const P = (x, y, c, s = 1) => rect(mx + x * sc - (s >> 1), my + y * sc - (s >> 1), s, s, c);
  const bl = Math.floor(T_NOW * 4) % 2;
  for (const p of w.props) {
    if (p.dead) continue;
    switch (p.kind) {
      case 'seal': P(p.x, p.y, '#bff6ff', 2); break; case 'turret': if (p.use) P(p.x, p.y, '#e5e5e5', 2); break; case 'o2st': if (p.use) P(p.x, p.y, '#4ee8ff', 2); break;
      case 'pylon': P(p.x, p.y, p.on ? '#7fe9ff' : (bl ? COL.gold : '#7fe9ff'), 3); break; case 'vault': P(p.x, p.y, COL.gold, 3); break; case 'drill': P(p.x, p.y, COL.blueL, 3); break; case 'start': P(p.x, p.y, COL.mint, 3); break;
      case 'cache': if (!p.found && R.scanR >= 2 && Math.hypot(p.x - pl.x, p.y - pl.y) < R.L.scan * 1.6) { if (bl) P(p.x, p.y, COL.gold, 2); } else if (p.found) P(p.x, p.y, COL.gold, 2); break;
    }
  }
  for (const e of w.ents) if ((e.nest || e.elite) && !e.dead) P(e.x, e.y, e.elite ? (bl ? COL.pink : '#fff') : '#ff2040', 3);
  if (R.ev && R.ev.k === 'race' && R.ev.st === 'run') P(R.ev.b.x, R.ev.b.y, bl ? COL.mint : '#fff', 3);
}
