// ===== LOOKS: gear that looks better the rarer it is, bespoke store & pass art, in-game gear effects, ice =====
// M.L is a "light" pixel: an animation pattern decides its colour every frame (christmas lights, cores, sparks)
M.L = 8;
const WAVE8 = [0, 0, -1, -1, 0, 0, 1, 1];
function colsOf(g, x) { let t = -1, b = -1; if (x < 0 || x >= g.w) return [t, b]; for (let y = 0; y < g.h; y++) if (g.get(x, y) > 1) { if (t < 0) t = y; b = y; } return [t, b]; }

// ---------- weapons: one silhouette per class, more hardware for every rarity step ----------
// common: dull, no glow, taped up. uncommon: the base gun. rare: top rail + lit muzzle. epic: energy coils + a core.
// legendary: gold fins, spikes, glowing runes, light running through it. mythic: floating crystals + muzzle prongs. cosmic: all of it, twinkling, in every colour.
function rarityParts(g, sub, r, R, b, f = 0) {
  const { x0, x1 } = b, span = x1 - x0, X = k => Math.round(x0 + span * k);
  const put = (x, y, m) => { if (g.ok(x, y) && g.get(x, y) === 0) g.set(x, y, m); };
  const paint = (x, y, m, from) => { const v = g.get(x, y); if (v > 1 && (!from || from.includes(v))) g.set(x, y, m); };
  if (r === 0) {
    for (let i = 0; i < g.m.length; i++) if (g.m[i] === M.G || g.m[i] === M.W) g.m[i] = M.S;
    if (sub !== 'throwing') for (const k of [0.42, 0.47]) { const x = X(k); const [t, bt] = colsOf(g, x); if (t >= 0) for (let y = t; y <= bt; y++) paint(x, y, M.D); }
    return;
  }
  if (sub === 'throwing') return throwParts(g, r, f);
  if (r >= 2) {
    const a0 = X(0.3), a1 = X(0.52);
    for (let x = a0; x <= a1; x++) { const [t] = colsOf(g, x); if (t > 0) put(x, t - 1, M.A); }
    { const [t] = colsOf(g, a1); if (t > 1) put(a1, t - 1, M.G); }
    const [t, bt] = colsOf(g, x1); if (t >= 0) for (let y = t; y <= bt; y++) paint(x1, y, M.G);
  }
  if (r >= 3) {
    for (const k of [0.64, 0.74, 0.84]) { const x = X(k); const [t, bt] = colsOf(g, x); if (t < 0) continue; for (let y = t; y <= bt; y++) paint(x, y, M.G, [M.P, M.A, M.S, M.D]); paint(x, t, M.W); }
    const cx = X(0.38); const [t, bt] = colsOf(g, cx);
    if (t >= 0 && bt - t >= 3) { const cy = Math.round((t + bt) / 2); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(cx + dx, cy + dy, M.G); paint(cx, cy, M.W); }
  }
  if (r >= 4) {
    for (let i = 0; i < 3; i++) { const x = X(0.16) + i; const [t, bt] = colsOf(g, x); if (t < 0) continue; for (let k = 1; k <= 3 - i; k++) { put(x, t - k, M.A); put(x, bt + k, M.A); } }
    for (let x = X(0.56); x < X(0.92); x += 4) { const [t] = colsOf(g, x); if (t > 0) put(x, t - 1, M.A); }
    for (let x = X(0.08); x < X(0.6); x += 3) { const [t, bt] = colsOf(g, x); if (t >= 0) paint(x, Math.round((t + bt) / 2), M.G, [M.P, M.S]); }
  }
  if (r >= 5) {
    const [t, bt] = colsOf(g, x1);
    if (t >= 0) { put(x1 + 1, t - 1, M.A); put(x1 + 2, t - 2, M.G); put(x1 + 1, bt + 1, M.A); put(x1 + 2, bt + 2, M.G); }
    const sx = X(0.6), bob = WAVE8[f & 7]; const [st, sb] = colsOf(g, sx);
    const gem = (y) => { if (y < 1 || y > g.h - 2) return; put(sx, y - 1, M.G); put(sx - 1, y, M.G); put(sx + 1, y, M.G); put(sx, y + 1, M.G); put(sx, y, M.W); };
    if (st >= 0) { gem(st - 3 + bob); gem(sb + 3 - bob); }
  }
}
function throwParts(g, r, f) {
  const cx = 16, cy = 7.5; let md = 0; const px0 = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) > 1) { const d = Math.hypot(x - cx, y - cy); md = Math.max(md, d); px0.push([x, y, d]); }
  const put = (x, y, m) => { x = Math.round(x); y = Math.round(y); if (g.ok(x, y) && g.get(x, y) === 0) g.set(x, y, m); };
  if (r >= 2) { g.set(cx, Math.round(cy), M.W); g.set(cx - 1, Math.round(cy), M.G); g.set(cx + 1, Math.round(cy), M.G); }
  if (r >= 3) for (const [x, y, d] of px0) if (d > md - 1.6) g.set(x, y, M.G);
  if (r >= 4) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.39; put(cx + Math.cos(a) * (md + 1.2), cy + Math.sin(a) * (md + 1.2) * 0.9, M.A); }
  if (r >= 5) for (let i = 0; i < 2; i++) { const a = (f / 8) * TAU + i * Math.PI; put(cx + Math.cos(a) * (md + 2.5), cy + Math.sin(a) * Math.min(6.5, md + 2.5), i ? M.G : M.W); }
}
// light running through the glow of legendary+ gear, energy seams on mythic, twinkles on cosmic
function rarityPat(d, f) {
  const r = d.r; if (!'wastc'.includes(d.cat) || r < 4) return null;
  return (x, y, m, s) => {
    if (m === M.G) { const k = (((x + y - f * 2) % 12) + 12) % 12; if (k < 2) return [M.W, s]; if (k < 3) return [M.G, s + 1]; return [m, s]; }
    if (r >= 6 && (m === M.P || m === M.S)) { const h = hashStr(x + ',' + y) % 23; if (h === (f * 3) % 23 || h === (f * 3 + 11) % 23) return [M.W, 1]; }
    if (r === 5 && m === M.D && ((x + y + f) % 7 === 0)) return [M.G, 0];
    return [m, s];
  };
}
// the gun in your hand is only 16x8, so it gets its own small extras
function heldParts(g, d, f) {
  const r = d.r; if (r < 2 || d.sub === 'throwing') return;
  let x1 = 0; for (let x = 0; x < g.w; x++) if (colsOf(g, x)[0] >= 0) x1 = x;
  const put = (x, y, m) => { if (g.ok(x, y) && g.get(x, y) === 0) g.set(x, y, m); };
  { const [t, b] = colsOf(g, x1); if (t >= 0) g.set(x1, Math.round((t + b) / 2), M.G); }
  if (r >= 3) { const x = Math.round(x1 * 0.7); const [t, b] = colsOf(g, x); if (t >= 0) for (let y = t; y <= b; y++) g.set(x, y, M.G); }
  if (r >= 4) { const x = Math.round(x1 * 0.25); const [t, b] = colsOf(g, x); if (t >= 0) { put(x, t - 1, M.A); put(x + 1, t - 1, M.A); put(x, b + 1, M.A); } }
  if (r >= 5) { const x = Math.round(x1 * 0.55); const [t] = colsOf(g, x); if (t >= 0) put(x, t - 2 + (WAVE8[f & 7] < 0 ? -1 : 0), M.W); }
}
function heldGrid(d, f) {
  const A = premArt(d); if (A && A.held) { const g = new Spr(16, 8); A.held(g, f); return g.fin(); }
  const g = shrinkGrid(buildItemGrid(d, f)); heldParts(g, d, f); g.outline(); return g;
}
function gridAnimated(d) { const A = premArt(d); if (A) return !!A.geo; return 'wast'.includes(d.cat) && d.r >= 5; }
function itemPat(d, f) { const A = premArt(d); if (A && A.pat) return A.pat(f); return rarityPat(d, f); }

// commons look worn: washed out colours
function rarityTone(d) { return (d.r === 0 && 'wast'.includes(d.cat)) ? 0.5 : 1; }

// ---------- premium art: every store/pass weapon, gadget and pet has its own drawing ----------
const premArt = d => (d && d.o && d.o.t === 'prem' && PREM_ART[d.n]) || null;
const stripes = (x, y, w = 2) => ((x + y) % (w * 2)) < w;
const PREM_ART = {
  // JINGLE BELL BLASTER: red body, gold ribbon, holly on top, a bell for a muzzle
  6012: {
    frames: 8,
    grid(g, f) {
      g.poly([[9, 9], [13, 9], [11, 15], [7, 15]], M.D); g.line(13, 10, 15, 11, M.A);
      g.rect(5, 4, 14, 5, M.P); g.rect(6, 3, 12, 1, M.P); g.rect(11, 3, 2, 6, M.A); g.rect(4, 5, 1, 3, M.S);
      g.rect(19, 5, 4, 3, M.A);
      g.poly([[22, 5], [25, 3], [28, 1], [29, 1], [29, 12], [28, 12], [25, 10], [22, 8]], M.A); g.rect(29, 1, 1, 12, M.A);
      g.line(24, 4, 27, 2, M.W); g.set(30, 6 + (f % 4 < 2 ? 0 : 1), M.G); g.set(30, 7 + (f % 4 < 2 ? 0 : 1), M.G);
      g.ell(7.5, 2, 2, 1, M.S); g.ell(14.5, 2, 2, 1, M.S); g.set(10, 2, M.P); g.set(11, 1, M.P); g.set(12, 2, M.P);
    },
    geo: true,
    pat: f => (x, y, m, s) => (m === M.A && x === 23 + (f % 7)) ? [M.W, s] : [m, s],
    held(g, f) { g.rect(2, 2, 7, 3, M.P); g.rect(5, 2, 1, 3, M.A); g.rect(9, 3, 2, 1, M.A); g.poly([[11, 2], [13, 0], [14, 0], [14, 6], [13, 6], [11, 4]], M.A); g.rect(3, 5, 2, 3, M.D); g.set(3, 1, M.S); g.set(7, 1, M.S); g.set(5, 1, M.P); g.set(15, 3 + (f % 4 < 2 ? 0 : 1), M.G); },
    aura: ['#ffd84a', '#e8303a'], fx: 'bells',
  },
  // CANDY CANE CARBINE: candy-striped rifle with a hooked stock and a spinning peppermint drum
  6014: {
    frames: 8,
    grid(g) {
      g.rect(2, 5, 7, 2, M.P); g.ring(2.6, 8.4, 1.2, 2.6, M.P); for (let y = 8; y < 16; y++) for (let x = 3; x < 6; x++) g.set(x, y, 0);
      g.rect(8, 4, 11, 5, M.P); g.rect(19, 5, 10, 2, M.A); g.rect(29, 4, 2, 4, M.A); g.set(30, 5, M.G); g.set(30, 6, M.G);
      g.rect(10, 2, 7, 2, M.S); g.set(17, 2, M.W); g.set(17, 3, M.W);
      g.ell(14, 10.5, 2.7, 2.7, M.L);
      g.poly([[9, 9], [12, 9], [11, 14], [8, 14]], M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m === M.P) return stripes(x, y) ? [M.W, s] : [m, s];
      if (m === M.L) { const a = Math.atan2(y - 10.5, x - 14) + f * 0.785; return (((Math.floor(a / (Math.PI / 3)) % 2) + 2) % 2) ? [M.P, s] : [M.W, s]; }
      return [m, s];
    },
    held(g) { g.rect(1, 2, 2, 1, M.P); g.set(0, 3, M.P); g.set(0, 4, M.P); g.rect(3, 2, 7, 3, M.P); g.rect(10, 3, 5, 1, M.A); g.set(15, 3, M.G); g.rect(5, 5, 2, 2, M.L); g.rect(4, 1, 3, 1, M.S); g.rect(8, 5, 1, 2, M.D); },
    aura: ['#ffffff', '#e8303a'], fx: 'mint',
  },
  // SNOWFLAKE SHURIKEN: a real six-armed snowflake that spins
  6016: {
    frames: 8, geo: true,
    grid(g, f) {
      const cx = 16, cy = 7.5, rot = f / 8 * (Math.PI / 3);
      for (let i = 0; i < 6; i++) {
        const a = rot + i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
        g.line(cx, cy, cx + c * 7, cy + s * 7, M.P);
        for (const sg of [-1, 1]) { const b = a + sg * 0.9; g.line(cx + c * 4.2, cy + s * 4.2, cx + c * 4.2 + Math.cos(b) * 2.2, cy + s * 4.2 + Math.sin(b) * 2.2, M.P); }
        g.set(cx + c * 7, cy + s * 7, M.W);
      }
      g.ell(cx, cy, 1.6, 1.6, M.G); g.set(cx, cy, M.W);
    },
    held(g, f) { const cx = 7.5, cy = 3.5, rot = f / 8 * (Math.PI / 3); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; g.line(cx, cy, cx + Math.cos(a) * 3.4, cy + Math.sin(a) * 3.4, M.P); } g.set(8, 4, M.W); },
    aura: ['#dff8ff', '#7fe9ff'], fx: 'frost',
  },
  // THE SLEIGHBREAKER: candy-striped launcher, gold ribbons, twinkling lights, a sleigh runner and a present in the barrel
  6017: {
    frames: 8,
    grid(g) {
      g.rect(4, 3, 20, 8, M.P); g.rect(1, 2, 3, 10, M.A); g.rect(9, 3, 2, 8, M.A); g.rect(17, 3, 2, 8, M.A);
      g.rect(4, 2, 20, 1, M.D); for (let x = 5; x < 24; x += 3) g.set(x, 1, M.L);
      g.rect(24, 3, 7, 8, M.S); g.rect(27, 3, 1, 8, M.A); g.rect(24, 6, 7, 1, M.A); g.set(26, 2, M.A); g.set(28, 2, M.A); g.set(25, 1, M.A); g.set(29, 1, M.A); g.set(27, 2, M.G);
      g.line(6, 14, 22, 14, M.A); g.line(22, 14, 25, 11, M.A); g.set(5, 13, M.A); g.rect(9, 11, 1, 3, M.A); g.rect(19, 11, 1, 3, M.A);
      g.rect(12, 11, 3, 2, M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m === M.P) return stripes(x, y, 2) && x > 4 && x < 24 ? [M.W, s] : [m, s];
      if (m === M.L) return [[M.P, M.G, M.S, M.W][((x / 3 | 0) + f) % 4], 1];
      return [m, s];
    },
    held(g) { g.rect(1, 1, 10, 4, M.P); g.rect(0, 1, 1, 4, M.A); g.rect(4, 1, 1, 4, M.A); g.rect(8, 1, 1, 4, M.A); g.rect(11, 1, 4, 4, M.S); g.rect(13, 1, 1, 4, M.A); g.rect(11, 2, 4, 1, M.A); for (const x of [2, 5, 8]) g.set(x, 0, M.L); g.line(2, 6, 11, 6, M.A); g.set(12, 5, M.A); },
    aura: ['#e8303a', '#2fbf5a', '#ffd84a'], fx: 'lights',
  },
  // THUNDERCLAP: a storm in a jar on top, tesla coils, lightning jumping between the prongs
  6300: {
    frames: 8, geo: true,
    grid(g, f) {
      g.poly([[1, 5], [8, 5], [8, 9], [3, 10], [1, 10]], M.S); g.rect(8, 4, 11, 5, M.P);
      g.line(10, 5, 12, 6, M.G); g.line(12, 6, 11, 7, M.G); g.line(11, 7, 14, 7, M.G);
      g.rect(11, 1, 5, 3, M.G); g.rect(11, 0, 5, 1, M.A); g.set(12, 2, M.D); g.set(13, 1, M.D); g.set(14, 2, M.D);
      g.rect(19, 5, 8, 2, M.A); g.rect(20, 3, 1, 6, M.A); g.rect(23, 3, 1, 6, M.A); g.rect(21, 4, 2, 4, M.G);
      g.line(27, 5, 30, 2, M.A); g.line(27, 6, 30, 9, M.A);
      const R = RNG(f * 7 + 3); let y = 3; for (let x = 28; x <= 31; x++) { y = clamp(y + R.ir(-1, 2), 3, 8); g.set(x, y, M.L); }
      if (f % 2) { g.set(21, 2, M.L); g.set(22, 1, M.L); } else { g.set(24, 9, M.L); g.set(25, 10, M.L); }
      g.poly([[13, 9], [16, 9], [17, 13], [15, 14], [13, 11]], M.D); g.poly([[9, 9], [12, 9], [11, 14], [8, 14]], M.D);
    },
    pat: f => (x, y, m, s) => m === M.L ? [(x + f) % 2 ? M.W : M.G, 1] : [m, s],
    held(g, f) { g.rect(0, 2, 3, 3, M.S); g.rect(3, 2, 6, 3, M.P); g.set(5, 1, M.G); g.set(6, 1, M.G); g.rect(9, 3, 4, 1, M.A); g.rect(10, 2, 1, 3, M.A); g.set(13, 2, M.A); g.set(13, 4, M.A); g.set(14, 2 + (f % 3), M.L); g.set(15, 3 + ((f + 1) % 2), M.L); g.rect(4, 5, 1, 2, M.D); },
    aura: ['#fff25a', '#9fd6ff'], fx: 'storm',
  },
  // DRAGON'S BREATH: a scaled shotgun with a dragon's head for a muzzle and fire in its mouth
  6301: {
    frames: 8,
    grid(g) {
      g.poly([[1, 4], [9, 5], [9, 10], [1, 12]], M.S); g.rect(9, 4, 9, 7, M.P);
      g.poly([[18, 3], [27, 4], [31, 6], [27, 7], [18, 7]], M.P); g.poly([[18, 9], [26, 10], [29, 12], [24, 12], [18, 12]], M.P); g.rect(18, 7, 4, 2, M.P);
      for (let x = 22; x < 31; x++) for (let y = 7; y <= 9; y++) if (g.get(x, y) === M.P && y > 7) g.set(x, y, 0);
      g.set(23, 7, M.W); g.set(26, 7, M.W); g.set(24, 10, M.W); g.set(27, 10, M.W);
      g.set(21, 5, M.G); g.set(22, 5, M.W); g.poly([[18, 3], [15, 0], [21, 3]], M.A); g.line(22, 3, 21, 0, M.A);
      for (let x = 24; x < 31; x++) g.set(x, 8, M.L); g.set(30, 9, M.L); g.set(29, 7, M.L);
      g.rect(12, 11, 6, 2, M.D); g.poly([[10, 11], [13, 11], [12, 15], [9, 15]], M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m === M.L) { const k = (x * 3 + y + f * 5) % 6; return [k < 2 ? M.W : k < 4 ? M.G : M.P, 1]; }
      if (m === M.P && x < 18 && x % 3 === 0 && y % 2 === 0) return [M.S, s - 1];
      return [m, s];
    },
    held(g) { g.rect(0, 2, 3, 3, M.S); g.rect(3, 1, 5, 5, M.P); g.rect(8, 1, 6, 2, M.P); g.rect(8, 4, 5, 2, M.P); g.set(15, 2, M.P); g.set(9, 1, M.G); g.set(7, 0, M.A); g.rect(11, 3, 4, 1, M.L); g.rect(4, 6, 2, 2, M.D); },
    aura: ['#ff9a3d', '#ffd84a'], fx: 'embers',
  },
  // THE LAST WORD: a long void sniper, a glowing eye in the scope, runes that light up in turn, a crescent blade
  6302: {
    frames: 8,
    grid(g) {
      g.poly([[1, 7], [8, 6], [8, 10], [4, 10], [1, 12]], M.S); g.rect(8, 6, 9, 4, M.P);
      g.rect(17, 7, 13, 1, M.A); g.rect(24, 6, 6, 3, M.D); g.set(30, 7, M.A); g.set(31, 7, M.G);
      g.rect(9, 1, 11, 3, M.D); g.rect(8, 1, 1, 3, M.A); g.rect(20, 1, 1, 3, M.L); g.set(11, 4, M.A); g.set(17, 4, M.A); g.set(10, 1, M.W);
      for (const x of [18, 20, 22]) g.set(x, 7, M.L); g.set(9, 7, M.L); g.set(12, 8, M.L); g.set(15, 7, M.L);
      for (let x = 17; x <= 24; x++) g.set(x, 9 + Math.round(((x - 20.5) / 3.5) ** 2 * -1.5 + 1.5), M.A);
      g.poly([[10, 10], [13, 10], [12, 14], [9, 14]], M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m !== M.L) return [m, s];
      if (x === 20 && y <= 3) return [f % 4 < 2 ? M.W : M.G, 1];
      const i = [9, 12, 15, 18, 20, 22].indexOf(x); return [i === (f % 6) ? M.W : i === ((f + 5) % 6) ? M.G : M.S, 0];
    },
    held(g, f) { g.rect(0, 3, 3, 2, M.S); g.rect(3, 3, 5, 2, M.P); g.rect(8, 3, 7, 1, M.A); g.rect(12, 3, 3, 2, M.D); g.rect(4, 1, 5, 1, M.D); g.set(9, 1, M.L); g.set(15, 3, M.G); g.rect(4, 5, 1, 2, M.D); g.set(9 + (f % 4), 4, M.L); },
    aura: ['#b45cff', '#f0d0ff'], fx: 'void',
  },
  // STARFALL RAIL: a molten meteor held between the rails, a comet tail and a star at the tip
  6303: {
    frames: 8,
    grid(g) {
      g.rect(1, 3, 9, 9, M.P); g.ell(5, 7.5, 2.6, 2.6, M.L); g.rect(9, 4, 6, 7, M.S);
      g.rect(15, 2, 15, 2, M.A); g.rect(15, 11, 15, 2, M.A); for (const x of [16, 20]) g.rect(x, 2, 1, 11, M.S);
      g.rect(15, 7, 8, 1, M.G); g.rect(17, 6, 5, 1, M.G); g.rect(17, 8, 5, 1, M.G);
      g.ell(25, 7.5, 2.5, 2.5, M.L);
      g.set(30, 7, M.W); g.set(31, 7, M.W); g.set(30, 6, M.W); g.set(30, 8, M.W); g.set(29, 7, M.W);
      g.rect(5, 12, 3, 3, M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m === M.L) { const d = Math.hypot(x - (x < 12 ? 5 : 25), y - 7.5); const k = (d * 2 + f) % 4; return [k < 1 ? M.W : k < 2.5 ? M.G : M.P, 1]; }
      if (m === M.G && (x + f) % 4 === 0) return [M.W, s];
      return [m, s];
    },
    held(g, f) { g.rect(0, 1, 5, 6, M.P); g.set(2, 3, M.L); g.set(2, 4, M.L); g.rect(5, 0, 10, 1, M.A); g.rect(5, 7, 10, 1, M.A); g.rect(5, 3, 6, 2, M.G); g.rect(11, 3, 2, 2, M.L); g.set(15, 3, M.W); g.set(14, 3 + (f % 2), M.W); },
    aura: ['#ff9a3d', '#fff2a0'], fx: 'meteor',
  },
  // SWARM QUEEN: a hive remote, a crowned queen drone and two workers buzzing around her
  6304: {
    frames: 8, geo: true,
    grid(g, f) {
      g.rect(1, 8, 12, 7, M.P); g.set(1, 8, 0); g.set(12, 8, 0); g.line(11, 8, 13, 3, M.A); g.set(13, 2, M.G);
      g.ell(23, 8, 5, 3, M.S); g.rect(21, 6, 1, 5, M.D); g.rect(24, 6, 1, 5, M.D); g.set(27, 8, M.G); g.set(28, 7, M.W);
      g.rect(21, 4, 5, 1, M.A); g.set(21, 3, M.A); g.set(23, 2, M.A); g.set(25, 3, M.A); g.set(23, 3, M.G);
      const wf = f % 2; g.ell(20, 5 - wf, 2, 1, M.W); g.ell(26, 5 - wf, 2, 1, M.W);
      const b1 = WAVE8[f & 7], b2 = WAVE8[(f + 4) & 7];
      g.rect(15, 2 + b1, 2, 2, M.S); g.set(17, 3 + b1, M.G); g.set(15, 1 + b1, M.W);
      g.rect(29, 12 + b2, 2, 2, M.S); g.set(31, 13 + b2, M.G); g.set(29, 11 + b2, M.W);
    },
    pat: () => (x, y, m, s) => (m === M.P && y > 8 && ((x + (y % 2 ? 1 : 0) * 2) % 4 === 0)) ? [M.S, s] : [m, s],
    held(g, f) { g.rect(0, 3, 6, 4, M.P); g.set(5, 2, M.A); g.ell(10.5, 4, 2.5, 1.6, M.S); g.set(10, 2, M.A); g.set(12, 2, M.A); g.set(13, 4, M.G); g.set(9, 2 - (f % 2), M.W); g.set(15, 1 + (WAVE8[f & 7] < 0 ? 0 : 1), M.S); },
    aura: ['#8cff3a', '#ffe05a'], fx: 'swarm',
  },
  // RAINBOW ROAD: a prism lens splits the beam into every colour
  6305: {
    frames: 8,
    grid(g) {
      g.ell(10, 7, 8, 3.6, M.P); g.rect(4, 6, 12, 2, M.L); for (let i = 0; i < 4; i++) g.rect(5 + i * 3, 2, 1, 2, M.S);
      g.rect(17, 5, 3, 5, M.A); g.poly([[20, 2], [27, 7.5], [20, 13]], M.G); g.line(21, 4, 21, 11, M.W); g.line(22, 6, 24, 7, M.W);
      for (let k = 0; k < 4; k++) g.set(28 + k, 6 + k * 0.6, M.L);
      g.rect(8, 10, 2, 4, M.D);
    },
    pat: f => (x, y, m, s) => m === M.L ? [[M.P, M.S, M.G, M.A, M.W][(x + f) % 5], 1] : [m, s],
    held(g) { g.ell(4.5, 3.5, 4, 2, M.P); g.rect(1, 3, 6, 1, M.L); g.rect(9, 2, 1, 3, M.A); g.poly([[10, 0], [14, 3.5], [10, 7]], M.G); g.set(15, 3, M.L); },
    aura: ['RAINBOW'], fx: 'rainbow',
  },
  // SUNSPLITTER: a sun-disk guard and a blade made of fire
  6306: {
    frames: 8, geo: true,
    grid(g, f) {
      g.ell(2, 7.5, 1.6, 1.6, M.A); g.rect(3, 6, 6, 3, M.D); g.set(5, 6, M.S); g.set(7, 6, M.S); g.set(4, 8, M.S); g.set(6, 8, M.S);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; if (Math.cos(a) > 0.5) continue; g.line(10 + Math.cos(a) * 2, 7.5 + Math.sin(a) * 2, 10 + Math.cos(a) * 4.6, 7.5 + Math.sin(a) * 4.6, M.A); }
      g.ell(10, 7.5, 2.4, 2.4, M.A); g.set(10, 7, M.G); g.set(10, 8, M.G);
      g.poly([[13, 5], [27, 5], [31, 7.5], [27, 10], [13, 10]], M.P); g.rect(13, 7, 15, 1, M.G);
      for (let x = 14; x < 28; x++) { const h = ((x + f) % 4 === 0) ? 2 : ((x + f) % 4 === 2 ? 1 : 0); for (let k = 1; k <= h; k++) g.set(x, 5 - k, M.L); }
    },
    pat: f => (x, y, m, s) => m === M.L ? [(x + y + f) % 3 ? M.G : M.W, 1] : [m, s],
    held(g, f) { g.rect(0, 3, 3, 2, M.D); g.ell(4, 3.5, 1.5, 1.5, M.A); g.poly([[6, 2], [13, 2], [15, 3.5], [13, 5], [6, 5]], M.P); g.rect(6, 3, 7, 1, M.G); for (let x = 7; x < 13; x += 2) g.set(x + (f % 2), 1, M.L); },
    aura: ['#ffd84a', '#ff7a2e'], fx: 'sun',
  },
  // EVENT HORIZON: a black hole sits in the muzzle with its accretion disk spinning around it
  6307: {
    frames: 8,
    grid(g) {
      g.rect(4, 3, 15, 8, M.P); g.rect(1, 2, 3, 10, M.S); g.poly([[5, 3], [9, 3], [7, 0]], M.A); g.poly([[5, 11], [9, 11], [7, 14]], M.A);
      g.rect(19, 4, 2, 6, M.A); for (const x of [8, 13]) g.rect(x, 3, 1, 8, M.S);
      const cx = 26, cy = 7.5;
      for (let y = 0; y < 16; y++) for (let x = 19; x < 32; x++) { const e = ((x - cx) / 5.6) ** 2 + ((y - cy) / 2) ** 2; if (e <= 1.05 && e >= 0.35) g.set(x, y, M.L); }
      for (let y = 0; y < 16; y++) for (let x = 22; x < 31; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= 3.2 && (y < 8 || g.get(x, y) !== M.L)) g.set(x, y, M.D); if (d > 3.2 && d <= 3.8 && y < 7) g.set(x, y, M.W); }
      g.rect(9, 11, 2, 3, M.D);
    },
    pat: f => (x, y, m, s) => {
      if (m !== M.L) return [m, s];
      const a = Math.atan2((y - 7.5) * 2.6, x - 26) - f * 0.785; const k = ((a % TAU) + TAU) % TAU;
      return [k < 1.2 ? M.W : k < 2.6 ? M.G : M.S, 1];
    },
    held(g) { g.rect(1, 2, 8, 4, M.P); g.rect(0, 1, 1, 6, M.S); g.rect(9, 2, 1, 4, M.A); for (let x = 10; x < 16; x++) g.set(x, 4, M.L); g.set(10, 3, M.L); g.set(15, 3, M.L); g.ell(12.5, 3, 1.5, 1.5, M.D); },
    aura: ['#b45cff', '#2a0050'], fx: 'hole',
  },
  // SNOW GLOBE gadget: a little tree inside a glass dome, snow swirling
  6013: {
    frames: 8, geo: true,
    grid(g, f) {
      g.ell(8, 7, 6, 6, M.G); g.poly([[8, 3], [11, 10], [5, 10]], M.S); g.set(8, 3, M.A); g.set(8, 11, M.D); g.set(8, 12, M.D);
      g.set(4, 4, M.W); g.set(4, 5, M.W); g.set(5, 3, M.W);
      g.rect(3, 12, 10, 3, M.A); g.rect(4, 11, 8, 1, M.A); g.rect(3, 13, 10, 1, M.D);
      const R = RNG(31); for (let i = 0; i < 7; i++) { const x = 3 + R.int(10), y0 = 2 + R.int(9); const y = 2 + ((y0 - 2 + f) % 9); if (Math.hypot(x - 8, y - 7) < 5.2 && g.get(x, y) === M.G) g.set(x, y, M.W); }
    },
    aura: ['#dff8ff'],
  },
};
// RUDOLPH: a reindeer with antlers, a bell collar and a nose that glows
const PET_ART = {
  6015: { draw(g, f) {
    const b = f ? 1 : 0;
    g.ell(9.5, 10, 4.6, 2.8, M.P); g.ell(4.5, 7, 2.8, 2.4, M.P); g.ell(2.2, 8, 1.8, 1.2, M.P); g.ell(1, 8, 1.3, 1.3, M.G); if (f) g.set(1, 7, M.W);
    g.set(4, 6, M.D); g.poly([[6, 5], [8, 4], [7, 6]], M.P);
    g.line(4, 5, 3, 1, M.S); g.line(3, 3, 1, 2, M.S); g.line(5, 5, 7, 1, M.S); g.line(6, 3, 8, 3, M.S);
    g.rect(6, 9, 1, 3, M.A); g.set(6, 12, M.A);
    g.rect(6, 12, 1, 3 - b, M.D); g.rect(8, 12, 1, 2 + b, M.D); g.rect(11, 12, 1, 3 - b, M.D); g.rect(13, 12, 1, 2 + b, M.D); g.set(14, 8, M.W);
  }, glow: '#ff3040', nose: [1, 8] },
};

// ---------- premium cosmetics: their own shapes on the icon AND on your astronaut ----------
// icons (16x16)
const PC_ICON = {
  'SANTA HAT'(g) { g.poly([[2, 12], [14, 12], [11, 5], [8, 2], [5, 3]], M.P); g.poly([[8, 2], [11, 2], [14, 5], [13, 7], [10, 4]], M.P); g.line(6, 5, 4, 11, M.S); g.ell(14, 8, 1.8, 1.8, M.W); g.rect(1, 11, 14, 3, M.W); },
  'ANTLERS'(g) { for (const s of [-1, 1]) { const x0 = 8 + s * 2; g.line(x0, 14, x0 + s * 3, 3, M.P); g.line(x0 + s * 1, 10, x0 + s * 5, 8, M.P); g.line(x0 + s * 2, 6, x0 + s * 6, 3, M.P); g.line(x0 + s * 3, 3, x0 + s * 2, 0, M.P); } g.ell(4, 13, 1.6, 1, M.S); g.ell(12, 13, 1.6, 1, M.S); g.set(8, 14, M.A); },
  'ICE CROWN'(g) { g.rect(2, 10, 12, 4, M.P); [[2, 3], [5, 5], [7, 8], [10, 5], [13, 3]].forEach(([x, h], i) => { g.rect(x, 10 - h, i === 2 ? 2 : 1, h, M.W); g.set(x, 9 - h, i === 2 ? M.G : M.W); }); g.set(4, 12, M.G); g.set(8, 11, M.G); g.set(8, 12, M.G); g.set(11, 12, M.G); g.rect(2, 13, 12, 1, M.S); },
  'XMAS BEANIE'(g) { g.ell(8, 11, 6.4, 6.5, M.P); g.rect(1, 12, 15, 5, 0); g.rect(2, 7, 12, 1, M.W); g.rect(2, 9, 12, 1, M.S); g.rect(1, 11, 14, 3, M.W); g.ell(8, 3.4, 1.8, 1.8, M.W); },
  'STAR TOPHAT'(g) { g.rect(1, 12, 14, 2, M.D); g.rect(4, 2, 8, 10, M.D); g.rect(4, 9, 8, 2, M.P); g.set(5, 9, M.G); g.set(8, 10, M.G); g.set(10, 9, M.G); g.ring(12, 4, 1.2, 2.2, M.A); g.rect(12, 2, 2, 3, 0); g.set(2, 3, M.W); g.set(14, 8, M.W); },
  'BEANIE COPTER'(g) { g.ell(8, 11, 6, 4, M.P); g.rect(2, 12, 12, 4, 0); for (let y = 7; y < 12; y++) for (let x = 2; x < 15; x++) if (g.get(x, y) === M.P) g.set(x, y, [M.P, M.S, M.G, M.A][Math.floor((x - 2) / 3.3)]); g.rect(1, 11, 14, 1, M.D); g.line(8, 7, 8, 4, M.A); g.rect(2, 3, 12, 1, M.W); g.set(8, 3, M.A); },
  'NEBULA CROWN'(g) { g.rect(2, 9, 12, 4, M.P); for (const x of [2, 7, 12]) g.poly([[x, 9], [x + 1, 4], [x + 2, 9]], M.P); g.ell(8, 11, 1.4, 1.4, M.G); g.set(4, 11, M.S); g.set(12, 11, M.S); g.ell(3, 2, 1, 1, M.G); g.ell(13, 2, 1, 1, M.S); g.set(8, 1, M.W); },
  'DOUBLE HALO'(g) { g.ring(8, 8, 4.6, 6, M.G); g.rect(0, 7, 16, 9, 0); g.ring(8, 10, 3, 4.4, M.A); g.rect(0, 10, 16, 6, 0); g.set(3, 6, M.W); g.set(12, 9, M.W); },
  'TINSEL SHADES'(g) { for (const cx of [4.5, 11.5]) { const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? 1.5 : 3.8; pts.push([cx + Math.cos(a) * rr, 7 + Math.sin(a) * rr]); } g.poly(pts, M.A); g.set(Math.round(cx), 7, M.G); } g.rect(7, 7, 2, 1, M.A); for (let x = 1; x < 15; x++) g.set(x, 12 + (x % 2), x % 3 ? M.G : M.W); },
  'SKI GOGGLES'(g) { g.rect(0, 7, 16, 2, M.P); g.poly([[2, 5], [14, 5], [15, 7], [14, 11], [9, 11], [8, 10], [7, 11], [2, 11], [1, 7]], M.A); g.poly([[3, 6], [13, 6], [13, 10], [9, 10], [8, 9], [7, 10], [3, 10]], M.G); g.line(5, 9, 8, 6, M.W); g.line(6, 9, 9, 6, M.W); },
  'DEAL SHADES'(g) { g.rect(1, 6, 14, 2, M.D); g.rect(2, 8, 5, 2, M.D); g.rect(9, 8, 5, 2, M.D); g.set(3, 8, M.W); g.set(4, 9, M.W); g.set(10, 8, M.W); g.set(11, 9, M.W); g.rect(0, 6, 1, 1, M.D); g.rect(15, 6, 1, 1, M.D); },
  'PLASMA VISOR'(g) { g.poly([[0, 5], [16, 5], [15, 11], [1, 11]], M.G); g.rect(0, 4, 16, 1, M.A); g.rect(1, 8, 14, 1, M.W); g.set(3, 6, M.W); g.set(4, 6, M.W); },
  'NOVA EYES'(g) { for (const cx of [4, 12]) { g.ell(cx, 8, 2.2, 2.2, M.G); g.set(cx, 8, M.W); g.line(cx, 3, cx, 13, M.P); g.line(cx - 4, 8, cx + 4, 8, M.P); g.set(cx - 2, 6, M.W); g.set(cx + 2, 10, M.W); } },
  'SANTA CAPE'(g) { g.poly([[5, 2], [11, 2], [14, 14], [2, 14]], M.P); g.line(6, 5, 4, 13, M.S); g.line(10, 5, 12, 13, M.S); g.rect(2, 13, 13, 2, M.W); g.rect(4, 1, 8, 2, M.W); g.set(8, 3, M.A); },
  'ICE WINGS'(g) { for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) { const tx = 8 + s * (7 - i), ty = 1 + i * 3; g.poly([[8 + s, 6 + i], [tx, ty], [8 + s * (5 - i), ty + 3]], i % 2 ? M.G : M.P); g.set(tx, ty, M.W); } } g.rect(7, 4, 2, 8, M.A); },
  'GIFT SACK'(g) { g.ell(8, 10, 6, 5, M.P); g.rect(4, 4, 8, 3, M.P); g.rect(4, 6, 8, 1, M.A); g.rect(3, 1, 4, 4, M.S); g.rect(4, 1, 1, 4, M.A); g.rect(9, 0, 4, 4, M.G); g.rect(10, 0, 1, 4, M.W); g.set(6, 11, M.D); g.set(10, 12, M.D); },
  'SOLAR WINGS'(g) { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = s < 0 ? 5 - (i + 1) * 2 : 10 + i * 2; g.rect(x, 3 + i, 2, 10 - i * 2, M.G); g.set(x, 3 + i, M.W); } g.rect(6, 6, 4, 4, M.A); g.rect(7, 7, 2, 2, M.P); },
  'X WINGS'(g) { g.line(7, 7, 1, 2, M.P, 0, 2); g.line(9, 7, 15, 2, M.P, 0, 2); g.line(7, 9, 1, 14, M.P, 0, 2); g.line(9, 9, 15, 14, M.P, 0, 2); for (const [x, y] of [[0, 1], [15, 1], [0, 14], [15, 14]]) { g.rect(x - (x ? 1 : 0), y - (y < 8 ? 0 : 1), 2, 2, M.G); } g.rect(6, 6, 4, 4, M.A); g.set(8, 8, M.W); },
  'SERAPH'(g) { for (const s of [-1, 1]) { g.poly([[8, 6], [8 + s * 8, 0], [8 + s * 7, 5]], M.P); g.poly([[8, 8], [8 + s * 8, 6], [8 + s * 6, 10]], M.S); g.poly([[8, 10], [8 + s * 6, 13], [8 + s * 3, 14]], M.P); g.set(8 + s * 8, 0, M.W); g.set(8 + s * 8, 6, M.W); g.set(8 + s * 6, 13, M.W); } g.ell(8, 8, 1.4, 3, M.G); },
  'FLAME BANNER'(g) { g.line(4, 1, 4, 15, M.A); g.poly([[5, 1], [14, 2], [12, 5], [14, 8], [5, 8]], M.P); g.poly([[8, 7], [7, 5], [9, 3], [9, 5], [11, 4], [10, 7]], M.G); g.set(9, 6, M.W); },
  // trails & finishers just need a picture
  'BLIZZARD'(g) { for (const [x, y, r] of [[4, 11, 2.6], [11, 5, 3.4], [13, 13, 1.6]]) { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.line(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, M.W); } g.set(x, y, M.G); } g.line(1, 6, 6, 3, M.G); g.line(6, 15, 10, 12, M.G); },
  'SNOWFALL'(g) { for (const [x, y] of [[3, 3], [9, 2], [13, 6], [6, 8], [11, 11], [3, 13], [14, 14]]) { g.set(x, y, M.W); g.set(x - 1, y, M.W); g.set(x + 1, y, M.W); g.set(x, y - 1, M.W); g.set(x, y + 1, M.W); } g.rect(0, 15, 16, 1, M.W); },
  'SODA'(g) { g.rect(2, 6, 6, 9, M.P); g.rect(2, 8, 6, 3, M.W); g.rect(3, 5, 4, 1, M.A); for (const [x, y, r] of [[11, 12, 1.5], [12, 7, 1.2], [10, 3, 2], [14, 2, 1]]) g.ring(x, y, r - 0.6, r + 0.4, M.G); },
  'THUNDER'(g) { g.poly([[9, 0], [3, 8], [7, 8], [5, 16], [13, 6], [9, 6], [11, 0]], M.G); g.line(8, 2, 6, 6, M.W); g.set(1, 3, M.P); g.set(14, 11, M.P); g.set(13, 2, M.W); },
  'PRISM'(g) { g.poly([[2, 13], [6, 3], [10, 13]], M.W); for (let i = 0; i < 5; i++) g.line(8, 8, 15, 4 + i * 2, [M.P, M.S, M.G, M.A, M.W][i]); g.line(0, 9, 5, 8, M.W); },
  'COMET DUST'(g) { g.ell(12, 4, 2.4, 2.4, M.W); g.set(12, 4, M.G); for (let i = 0; i < 7; i++) g.set(10 - i * 1.4, 6 + i * 1.3, i % 2 ? M.G : M.P); g.line(10, 5, 2, 12, M.S); },
  'NEW YEAR'(g) { for (const [cx, cy, n, r, m] of [[5, 5, 8, 4, M.P], [11, 9, 10, 5, M.G], [4, 12, 6, 2.5, M.S]]) { for (let i = 0; i < n; i++) { const a = i / n * TAU; g.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, m); g.set(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, M.W); } } },
  'BLUESCREEN'(g) { g.rect(1, 2, 14, 11, M.P); g.rect(3, 4, 2, 2, M.W); g.rect(3, 8, 9, 1, M.W); g.rect(3, 10, 6, 1, M.W); g.rect(9, 4, 3, 1, M.W); g.rect(10, 13, 6, 2, M.G); g.rect(0, 6, 3, 1, M.S); },
  'SINGULARITY'(g) { for (let i = 0; i < 24; i++) { const a = i * 0.55, r = 1.5 + i * 0.27; g.set(8 + Math.cos(a) * r, 8 + Math.sin(a) * r, i % 3 ? M.G : M.P); } g.ell(8, 8, 1.8, 1.8, M.D); g.set(8, 8, 0); },
  'SONIC BOOM'(g) { g.ring(8, 8, 6, 7, M.G); g.ring(8, 8, 3.5, 4.4, M.P); g.ring(8, 8, 1, 1.8, M.W); for (const [x, y] of [[0, 4], [0, 12], [16, 4], [16, 12]]) g.line(x, y, 8 + (x ? 4 : -4), 8 + (y < 8 ? -2 : 2), M.W); },
  'STAR SHOWER'(g) { for (const [x, y, r] of [[8, 7, 4], [3, 3, 1.6], [13, 3, 1.6], [3, 13, 1.6], [13, 12, 2]]) { const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } g.poly(pts, r > 3 ? M.A : M.G); } g.set(8, 7, M.W); },
};
// on the astronaut. head items sit above the helmet: cx is the head's middle, top its top row
const PC_HEAD = {
  'SANTA HAT'(g, dir, cx, top, af) {
    const fl = dir === 2 ? 1 : -1, bob = [0, 1, 0, -1][af];
    g.poly([[cx - 4, top + 1], [cx + 4, top + 1], [cx + 1, top - 5], [cx - 2, top - 4]], M.P);
    g.poly([[cx - 1, top - 5], [cx + 2, top - 5], [cx + 1 + fl * 4, top - 2 + bob], [cx + fl * 3, top - 3]], M.P);
    g.rect(cx + fl * 4 + (fl < 0 ? -1 : 0), top - 3 + bob, 2, 2, M.W);
    g.rect(cx - 5, top, 11, 2, M.W); g.set(cx - 3, top - 2, M.S);
  },
  'ANTLERS'(g, dir, cx, top, af) {
    for (const s of [-1, 1]) { const x0 = cx + s * 3; g.line(x0, top + 1, x0 + s * 2, top - 5, M.P); g.line(x0 + s, top - 2, x0 + s * 4, top - 3, M.P); g.set(x0 + s * 2, top - 6 + (af === 1 && s > 0 ? 1 : 0), M.P); }
    if (dir === 0) { g.set(cx - 5, top + 2, M.S); g.set(cx + 5, top + 2, M.S); }
    g.set(cx + (dir === 2 ? -2 : 2), top + 1, af % 2 ? M.W : M.A);
  },
  'ICE CROWN'(g, dir, cx, top, af) {
    g.rect(cx - 4, top, 9, 2, M.P); [2, 3, 5, 3, 2].forEach((h, i) => { const x = cx - 4 + i * 2; g.rect(x, top - h, 1, h, M.W); if (i === 2) g.set(x, top - h - 1, M.W); });
    g.set(cx, top + 1, M.G); g.set(cx - 3, top + 1, M.G); g.set(cx + 3, top + 1, M.G); g.set(cx - 4 + af * 2, top, M.W);
  },
  'XMAS BEANIE'(g, dir, cx, top, af) { const b = af === 1 ? 1 : 0; g.ell(cx, top, 4.5, 2.8, M.P); g.rect(cx - 4, top - 1, 9, 1, M.W); g.rect(cx - 4, top, 9, 1, M.S); g.rect(cx - 5, top + 1, 11, 2, M.W); g.rect(cx - 1, top - 5 - b, 3, 3, M.W); },
  'STAR TOPHAT'(g, dir, cx, top, af) { g.rect(cx - 4, top + 1, 9, 1, M.D); g.rect(cx - 2, top - 6, 5, 7, M.D); g.rect(cx - 2, top - 1, 5, 1, M.P); g.set(cx - 2 + af, top - 1, M.G); g.set(cx + 2, top - 6, af === 2 ? M.W : M.D); if (af === 3) { g.set(cx + 4, top - 7, M.W); g.set(cx + 5, top - 6, M.G); } g.set(cx + 3, top - 4, M.A); },
  'BEANIE COPTER'(g, dir, cx, top, af) { g.ell(cx, top + 1, 4, 2, M.P); g.rect(cx - 4, top, 2, 2, M.S); g.rect(cx + 2, top, 2, 2, M.G); g.rect(cx - 1, top - 1, 2, 1, M.A); g.line(cx, top - 1, cx, top - 3, M.A); const w = [4, 2, 0, 2][af]; g.rect(cx - w, top - 4, w * 2 + 1, 1, M.W); if (!w) g.set(cx, top - 4, M.W); },
  'NEBULA CROWN'(g, dir, cx, top, af) { g.rect(cx - 3, top, 7, 2, M.P); g.set(cx - 3, top - 1, M.P); g.set(cx, top - 2, M.P); g.set(cx, top - 1, M.P); g.set(cx + 3, top - 1, M.P); g.set(cx, top, M.G); const a = af / 4 * TAU; g.set(cx + Math.round(Math.cos(a) * 6), top - 3 + Math.round(Math.sin(a) * 1.5), M.G); g.set(cx - Math.round(Math.cos(a) * 6), top - 3 - Math.round(Math.sin(a) * 1.5), M.S); g.set(cx, top - 4, af % 2 ? M.W : M.G); },
  'DOUBLE HALO'(g, dir, cx, top, af) { const hy = top - 4 - (af === 1 || af === 2 ? 1 : 0); g.rect(cx - 4, hy, 9, 1, M.G); g.rect(cx - 3, hy - 1, 7, 1, M.G); g.rect(cx - 2, hy, 5, 1, 0); g.rect(cx - 2, hy - 3, 5, 1, M.A); g.set(cx - 3, hy - 2, M.A); g.set(cx + 3, hy - 2, M.A); g.set(cx - 3 + af * 2, hy - 1, M.W); },
};
const PC_EYES = {
  'TINSEL SHADES'(g, dir, ox, y, af) { if (dir === 0) { g.rect(ox + 4, y - 1, 3, 3, M.A); g.rect(ox + 9, y - 1, 3, 3, M.A); g.set(ox + 5, y, M.G); g.set(ox + 10, y, M.G); g.rect(ox + 7, y, 2, 1, M.A); g.set([ox + 4, ox + 6, ox + 9, ox + 11][af], y - 1, M.W); } else { const x = dir === 2 ? ox + 3 : ox + 11; g.rect(x, y - 1, 2, 3, M.A); g.set(x, y, M.G); if (af % 2) g.set(x + 1, y - 1, M.W); } },
  'SKI GOGGLES'(g, dir, ox, y, af) { if (dir === 0) { g.rect(ox + 3, y - 1, 10, 3, M.A); g.rect(ox + 4, y - 1, 8, 2, M.G); g.set(ox + 4 + af * 2, y - 1, M.W); g.set(ox + 5 + af * 2, y, M.W); } else { const x = dir === 2 ? ox + 2 : ox + 11; g.rect(x, y - 1, 3, 3, M.A); g.rect(x + (dir === 2 ? 0 : 1), y - 1, 2, 2, M.G); g.rect(dir === 2 ? x + 3 : x - 3, y, 3, 1, M.P); } },
  'DEAL SHADES'(g, dir, ox, y, af) { if (dir === 0) { g.rect(ox + 4, y, 8, 1, M.D); g.rect(ox + 4, y + 1, 3, 1, M.D); g.rect(ox + 9, y + 1, 3, 1, M.D); g.set(ox + 5 + af, y, M.W); g.set(ox + 10 + (af >> 1), y + 1, M.W); } else { const x = dir === 2 ? ox + 3 : ox + 11; g.rect(x, y, 2, 2, M.D); g.rect(dir === 2 ? x + 2 : x - 3, y, 3, 1, M.D); if (af === 1) g.set(x, y, M.W); } },
  'PLASMA VISOR'(g, dir, ox, y, af) { if (dir === 0) { g.rect(ox + 3, y - 1, 10, 3, M.G); g.rect(ox + 3 + af * 2, y - 1, 2, 3, M.W); } else { const x = dir === 2 ? ox + 2 : ox + 11; g.rect(x, y - 1, 3, 3, M.G); g.set(x + (af % 3), y, M.W); } },
  'NOVA EYES'(g, dir, ox, y, af) { const n = 1 + (af % 2); if (dir === 0) { for (const x of [ox + 6, ox + 10]) { g.set(x, y, M.W); g.rect(x - n, y, n * 2 + 1, 1, M.G); g.rect(x, y - n, 1, n * 2 + 1, M.G); g.set(x, y, M.W); } } else { const x = dir === 2 ? ox + 4 : ox + 12; g.rect(x - n, y, n * 2 + 1, 1, M.G); g.rect(x, y - n, 1, n * 2 + 1, M.G); g.set(x, y, M.W); g.rect(dir === 2 ? x - 4 - af : x + 2, y, 2 + af, 1, M.P); } },
};
const PC_BACK = {
  'SANTA CAPE'(g, dir, cx, y, sw, af) {
    const fl = [0, 1, 2, 1][af];
    if (dir === 0) { g.rect(cx - 6 - (af === 2 ? 1 : 0), y + 1, 2, 8, M.P); g.rect(cx + 5 + (af === 2 ? 1 : 0), y + 1, 2, 8, M.P); g.rect(cx - 6, y + 8, 2, 1, M.W); g.rect(cx + 5, y + 8, 2, 1, M.W); g.rect(cx - 5, y, 11, 1, M.W); return; }
    const f2 = sw + fl;
    if (dir === 1) { g.poly([[cx - 5, y], [cx + 5, y], [cx + 6 + f2, y + 10], [cx - 6 - f2, y + 10]], M.P); g.rect(cx - 6 - f2, y + 10, 13 + f2 * 2, 2, M.W); g.rect(cx - 5, y - 1, 11, 2, M.W); g.set(cx, y + 1, M.A); }
    else { const s = dir === 2 ? 1 : -1, ex = cx + s * (7 + f2), ey = y + 10 - (fl >> 1); g.poly([[cx + s * 3, y - 1], [cx + s * 6, y - 1], [ex, ey], [cx + s * 2, y + 11]], M.P); g.line(cx + s * 2, y + 11, ex, ey, M.W); g.line(cx + s * 2, y + 12, ex, ey + 1, M.W); g.rect(cx + (s < 0 ? -6 : 3), y - 2, 4, 2, M.W); }
  },
  'ICE WINGS'(g, dir, cx, y, sw, af) {
    const up = sw + [0, 1, 2, 1][af] * 2;
    const wing = (s) => { for (let i = 0; i < 3; i++) { const tx = cx + s * (10 - i * 2), ty = y - 5 - up + i * 4; g.poly([[cx + s * 2, y + i * 2], [tx, ty], [cx + s * (6 - i), ty + 3]], i % 2 ? M.P : M.G); g.set(tx, ty, M.W); } };
    if (dir === 0) { for (const s of [-1, 1]) { g.poly([[cx + s * 6, y + 1], [cx + s * 10, y - 4 - up], [cx + s * 8, y + 4]], M.G); g.set(cx + s * 10, y - 4 - up, M.W); } return; }
    if (dir === 1) { wing(-1); wing(1); } else wing(dir === 2 ? 1 : -1);
    if (af === 1) { g.set(cx - 9, y - 8, M.W); g.set(cx + 9, y - 8, M.W); }
  },
  'GIFT SACK'(g, dir, cx, y, sw, af) {
    if (dir === 0) { g.rect(cx + 6, y - 3, 3, 3, M.S); g.set(cx + 7, y - 4, M.A); return; }
    const x = dir === 1 ? cx - 4 : dir === 2 ? cx + 2 : cx - 7, wd = dir === 1 ? 9 : 5;
    g.ell(x + wd / 2, y + 4, wd / 2 + 0.5, 3.5, M.P); g.rect(x + 1, y, wd - 2, 1, M.A);
    g.rect(x, y - 3, 3, 3, M.S); g.set(x + 1, y - 3, M.A); g.rect(x + wd - 3, y - 4 + (af === 1 ? 1 : 0), 3, 3, M.G); g.set(x + wd - 2, y - 4, M.W);
  },
  'SOLAR WINGS'(g, dir, cx, y, sw, af) {
    const o = af === 1 ? 1 : 0;
    if (dir === 0) { g.rect(cx - 11, y - 3 - o, 3, 6, M.G); g.rect(cx + 9, y - 3 - o, 3, 6, M.G); return; }
    for (const s of dir === 1 ? [-1, 1] : [dir === 2 ? 1 : -1]) for (let i = 0; i < 3; i++) { const x = s < 0 ? cx - 5 - (i + 1) * 3 : cx + 5 + i * 3; g.rect(x, y - 4 - o + i, 3, 7 - i * 2, M.G); g.set(x + ((af + i) % 3), y - 4 - o + i, M.W); }
    g.rect(cx - 4, y - 1, 9, 1, M.A);
  },
  'X WINGS'(g, dir, cx, y, sw, af) {
    const e = af % 2 ? M.W : M.G;
    if (dir === 0) { for (const s of [-1, 1]) { g.line(cx + s * 6, y + 1, cx + s * 10, y - 3, M.P); g.set(cx + s * 10, y - 4, e); } return; }
    for (const s of dir === 1 ? [-1, 1] : [dir === 2 ? 1 : -1]) for (const v of [-1, 1]) { g.line(cx + s * 2, y + 2, cx + s * 9, y + 2 + v * 5, M.P); g.line(cx + s * 2, y + 3, cx + s * 9, y + 3 + v * 5, M.P); g.rect(cx + s * 9 - (s < 0 ? 1 : 0), y + 2 + v * 5, 2, 2, e); }
    g.rect(cx - 2, y, 5, 5, M.A);
  },
  'SERAPH'(g, dir, cx, y, sw, af) {
    const up = sw + [0, 1, 2, 1][af] * 2;
    const wing = (s) => { g.poly([[cx + s * 2, y + 1], [cx + s * 12, y - 7 - up], [cx + s * 10, y + 1 - (up >> 1)], [cx + s * 3, y + 4]], M.P); g.poly([[cx + s * 2, y + 3], [cx + s * 10, y + 2 - (up >> 1)], [cx + s * 8, y + 7], [cx + s * 3, y + 6]], M.S); g.poly([[cx + s * 2, y + 6], [cx + s * 7, y + 9], [cx + s * 3, y + 9]], M.P); g.set(cx + s * 12, y - 7 - up, M.W); g.set(cx + s * 10, y + 2 - (up >> 1), M.W); g.set(cx + s * 7, y + 9, M.W); };
    if (dir === 0) { for (const s of [-1, 1]) { g.poly([[cx + s * 6, y + 1], [cx + s * 11, y - 6 - up], [cx + s * 9, y + 4]], M.P); g.set(cx + s * 11, y - 6 - up, M.W); } return; }
    if (dir === 1) { wing(-1); wing(1); } else wing(dir === 2 ? 1 : -1);
  },
  'FLAME BANNER'(g, dir, cx, y, sw, af) {
    const x = dir === 3 ? cx - 4 : cx + 3, s2 = dir === 3 ? -1 : 1, wv = [0, 1, 0, -1][af];
    if (dir === 0) { g.line(cx + 6, y + 6, cx + 8, y - 8, M.A); g.rect(cx + 8, y - 8 + wv, 4, 4, M.P); g.set(cx + 9, y - 7 + wv, M.G); return; }
    g.line(x, y + 6, x, y - 10, M.A); g.poly([[x, y - 10], [x + s2 * 5, y - 9 + wv], [x + s2 * 8, y - 8 + sw - wv], [x, y - 4]], M.P); g.set(x + s2 * 3, y - 8, M.G); g.set(x + s2 * 3, y - 7, af % 2 ? M.W : M.G);
  },
};
// skin patterns for the store/pass skins. animated ones get 8 frames
const PC_PAT = {
  CANDY: { fn: () => (x, y, m, s) => (m === M.P || m === M.S) ? (stripes(x, y) ? [M.W, s] : [M.P, s]) : [m, s] },
  GINGER: { fn: () => (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const r = y % 6; if ((r === 2 && x % 2 === 0) || (r === 3 && x % 2 === 1)) return [M.W, s]; if (x % 6 === 3 && r === 5) return [M.G, 1]; return [M.P, s]; } },
  SLEIGH: { fn: () => (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; if (s >= 1) return [M.W, 0]; if (y % 5 === 2) return [M.A, s]; if ((x + y * 2) % 9 === 0) return [M.A, s]; return [M.P, s]; } },
  'LIVE CIRCUIT': { anim: 1, fn: (seed, t) => (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const tr = (x % 6 === 0 && y % 2 === 0) || (y % 5 === 0 && x % 3 !== 0); if (!tr) return [M.D, s]; const k = (((x + y * 2 - Math.floor(t * 48)) % 16) + 16) % 16; return [k < 2 ? M.W : M.G, k < 2 ? 1 : 0]; } },
  'DEEP GALAXY': { anim: 1, fn: (seed, t) => { const nz = makeNoise(seed); return (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const n = nz.n2(x * 0.28 + t * 1.5, y * 0.28); const h = hashStr(x + ':' + y) % 19; if (h === Math.floor(t * 8) % 19 || h === (Math.floor(t * 8) + 9) % 19) return [M.W, 1]; return n > 0.66 ? [M.G, 0] : n > 0.5 ? [M.S, 0] : [M.D, s]; }; } },
  STEALTH: { anim: 1, fn: (seed, t) => (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; if (y % 6 === 3) return [(x + Math.floor(t * 24)) % 10 < 3 ? M.W : M.G, 0]; return [M.D, ((x + y) & 1) ? s + 1 : s]; } },
  HOLOGRAM: { anim: 1, fn: (seed, t) => (x, y, m, s) => { if (m === 1 || m === M.D) return [m, s]; const sc = ((y + Math.floor(t * 16)) % 5); if (sc === 0) return [M.W, 1]; return [((x + y) >> 1) % 2 ? M.G : M.S, sc === 1 ? 1 : 0]; } },
  'HOT ROD': { anim: 1, fn: (seed, t) => { const nz = makeNoise(seed); return (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const v = (1 - x / 20) + nz.n2(x * 0.4 - t * 3, y * 0.5) * 0.6 - Math.abs(y - 8) * 0.04; return v > 0.95 ? [M.W, 1] : v > 0.75 ? [M.G, 0] : v > 0.6 ? [M.S, 0] : [M.D, s]; }; } },
  'GOLD RUSH': { anim: 1, fn: (seed, t) => (x, y, m, s) => { if (m !== M.P && m !== M.S && m !== M.A) return [m, s]; const k = (((x - y - Math.floor(t * 40)) % 20) + 20) % 20; if (k < 2) return [M.W, 1]; if ((x + y) % 4 === 0 && (x - y) % 4 === 0) return [M.S, s]; return [M.A, s]; } },
};
// trails (called from trailFx) and finishers (called from burstKill)
const PC_TRAIL = {
  BLIZZARD(w, x, y, pl, c, big) { w.fx.add({ x: x + (R0() - 0.5) * 8, y: y - 6 - R0() * 10, vx: (R0() - 0.5) * 30, vy: -6 + R0() * 12, life: 1, c: R0() < 0.7 ? '#ffffff' : '#bff6ff', t: 'pat', pat: R0() < 0.4 ? TRAIL_PAT.spark4 : TRAIL_PAT.flake, drag: 0.8, fn: (p, dt) => { p.x += Math.sin(T_NOW * 8 + p.max * 40) * 30 * dt; } }); if (R0() < 0.5) w.fx.add({ x, y: y - 2, vx: (R0() - 0.5) * 50, vy: -4, life: 0.4, c: '#dff8ff', s: 1, t: 'spark', drag: 2 }); },
  SNOWFALL(w, x, y) { w.fx.add({ x: x + (R0() - 0.5) * 14, y: y - 18, vx: (R0() - 0.5) * 6, vy: 14, life: 1.1, c: '#ffffff', t: R0() < 0.6 ? 'pat' : 'fade', pat: TRAIL_PAT.flake, s: 1, drag: 0.4, fn: (p, dt) => { p.x += Math.sin(T_NOW * 4 + p.max * 20) * 8 * dt; } }); if (R0() < 0.3) w.fx.add({ x, y: y + 1, life: 0.6, c: '#eaf6ff', s: 3, t: 'puff', drag: 1 }); },
  SODA(w, x, y, pl, c, big) { w.fx.add({ x: x + (R0() - 0.5) * 6, y: y - 4, vx: (R0() - 0.5) * 10, vy: -26 - R0() * 20, life: 0.8, c: R0() < 0.5 ? '#ffffff' : c[1], s: 1 + (R0() < 0.4 ? 2 : 0), t: 'ring', drag: 0.6, fn: (p, dt) => { p.x += Math.sin(T_NOW * 14 + p.max * 9) * 10 * dt; } }); },
  THUNDER(w, x, y) { if (R0() < 0.25) { let px1 = x + (R0() - 0.5) * 20, py1 = y - 30; for (let i = 0; i < 4; i++) { const nx = px1 + (R0() - 0.5) * 8, ny = py1 + 7; w.fx.add({ x: nx, y: ny, vx: 0, vy: 0, life: 0.15, c: i % 2 ? '#fff25a' : '#ffffff', t: 'pat', pat: TRAIL_PAT.bolt, drag: 0 }); px1 = nx; py1 = ny; } } w.fx.add({ x, y: y - 2, vx: (R0() - 0.5) * 70, vy: -R0() * 40, life: 0.2, c: '#fff25a', s: 1, t: 'spark', drag: 2 }); },
  PRISM(w, x, y, pl) { for (let k = 0; k < 6; k++) w.fx.add({ x: pl.x - (pl.dir === 2 ? -3 : pl.dir === 3 ? 3 : 0), y: y - 12 + k * 2, vx: 0, vy: 0, life: 0.6, c: hex(hsl(k * 50 + T_NOW * 120, 0.95, 0.65)), s: 2, t: 'fade' }); if (R0() < 0.3) w.fx.add({ x: x + (R0() - 0.5) * 10, y: y - 8 - R0() * 8, life: 0.6, c: '#fff', t: 'pat', pat: TRAIL_PAT.star, drag: 1 }); },
  'COMET DUST'(w, x, y, pl, c) { w.fx.add({ x, y: y - 6, vx: (R0() - 0.5) * 6, vy: -2, life: 1.2, c: R0() < 0.5 ? '#fff6c0' : c[1], t: 'pat', pat: R0() < 0.3 ? TRAIL_PAT.spark4 : TRAIL_PAT.star, drag: 1 }); w.fx.add({ x: x + (R0() - 0.5) * 4, y: y - 8, life: 0.9, c: c[0], s: 2, t: 'shrink', drag: 1 }); },
};
const PC_KILL = {
  'NEW YEAR'(F, x, y, cols, big) { const cs = ['#ffd84a', '#ff4a5a', '#3ddc84', '#ffffff', '#7fd8ff']; for (let b = 0; b < 1 + big; b++) { const bx = x + (b ? (R0() - 0.5) * 30 : 0), by = y - (b ? 10 + R0() * 14 : 0), c = cs[R0.int(cs.length)]; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; F.add({ x: bx, y: by, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, life: 0.7, c: i % 2 ? c : '#fff', s: 1, t: 'spark', drag: 3, g: 40 }); } F.add({ x: bx, y: by, life: 0.25, c, s: 12, t: 'ring' }); } for (let i = 0; i < 6; i++) F.add({ x: x + (R0() - 0.5) * 30, y: y - R0() * 20, vx: 0, vy: 10, life: 0.9, c: '#ffd84a', s: 1, t: 'pat', pat: TRAIL_PAT.star, drag: 1 }); },
  BLUESCREEN(F, x, y, cols, big) { for (let i = 0; i < 10 * big; i++) F.add({ x: x + (R0() - 0.5) * 20, y: y + (R0() - 0.5) * 14, vx: (R0() - 0.5) * 160, vy: 0, life: 0.3, c: R0() < 0.6 ? '#1e5bff' : '#ffffff', s: 2 + R0.int(3), drag: 9 }); F.text(x, y - 10, ':(', '#ffffff', { f: FS, life: 0.7, vy: -20 }); },
  SINGULARITY(F, x, y, cols, big) { for (let i = 0; i < 24 * big; i++) { const a = i / 24 * TAU, d = 22 + R0() * 6; F.add({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a + 0.9) * d * 3, vy: -Math.sin(a + 0.9) * d * 3, life: 0.35, c: i % 3 ? cols[1] : '#ffffff', s: 1, drag: 0 }); } F.add({ x, y, life: 0.4, c: '#000000', s: 5, t: 'puff' }); F.add({ x, y, life: 0.3, c: cols[1], s: 20, t: 'ring' }); },
  'SONIC BOOM'(F, x, y, cols, big) { for (let k = 0; k < 3; k++) F.add({ x, y, life: 0.3 + k * 0.12, c: k ? cols[1] : '#ffffff', s: (14 + k * 9) * big, t: 'ring' }); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; F.add({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.2, c: '#ffffff', s: 1, t: 'spark', drag: 4 }); } },
  'STAR SHOWER'(F, x, y, cols, big) { for (let i = 0; i < 8 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 120, vy: -40 - R0() * 90, g: 220, life: 0.9, c: i % 2 ? '#ffd84a' : cols[1], t: 'pat', pat: i % 3 ? TRAIL_PAT.star : TRAIL_PAT.spark4, drag: 0.6 }); },
};

// ---------- ice: frozen aliens are encased in a block of ice ----------
const ICE_SHELL = new WeakMap();
function iceShell(spr) {
  let s = ICE_SHELL.get(spr); if (s) return s;
  const h = haloOf(spr); s = { body: maskOf(spr, '#bfefff'), rim: maskOf(h, '#f2fdff'), hi: maskOf(spr, '#ffffff') }; ICE_SHELL.set(spr, s); return s;
}
// call inside the alien's transform (so it flips with it). dx,dy is where the sprite was drawn
function drawIceOn(e, spr, dx, dy, sw, sh) {
  const sh0 = iceShell(spr), sc = sw / spr.width;
  ctx.globalAlpha = 0.85; ctx.drawImage(sh0.rim, dx - sc, dy - sc, sw + 2 * sc, sh + 2 * sc);
  ctx.globalAlpha = 0.55; ctx.drawImage(sh0.body, dx, dy, sw, sh);
  // frost-crystal spikes poking out of the block
  const seed = (e.iceSeed = e.iceSeed || 1 + Math.floor(R0() * 9999)); const R = RNG(seed);
  const n = 3 + (sw > 20 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = Math.round(dx + 1 + t * (sw - 3)), base = Math.round(dy + 3 + R() * sh * 0.3), len = Math.round(3 + R.int(4) * sc), lean = (t - 0.5) * 3;
    ctx.globalAlpha = 0.95;
    for (let k = 0; k < len; k++) { const wd = k < len * 0.45 ? 2 : 1, xx = Math.round(x + lean * k / len); rect(xx, base - k, wd, 1, '#e8fdff'); if (wd > 1) rect(xx + 1, base - k, 1, 1, '#7fd2ee'); }
    rect(Math.round(x + lean), base - len, 1, 1, '#ffffff');
  }
  // a glint sliding across the ice
  const per = 1.6, k = ((T_NOW + seed * 0.01) % per) / per;
  if (k < 0.4) { ctx.save(); ctx.beginPath(); const bx = dx - sh + (k / 0.4) * (sw + sh); ctx.moveTo(bx, dy + sh); ctx.lineTo(bx + 2, dy + sh); ctx.lineTo(bx + 2 + sh, dy); ctx.lineTo(bx + sh, dy); ctx.closePath(); ctx.clip(); ctx.globalAlpha = 0.8; ctx.drawImage(sh0.hi, dx, dy, sw, sh); ctx.restore(); }
  ctx.globalAlpha = 1;
}
function iceWorldFx(w, e, x, y, sw, sh) {
  ctx.globalAlpha = 0.4; ellipse(x, y + 1, Math.max(6, sw * 0.55), 3, '#dff8ff'); ctx.globalAlpha = 0.6; ellipse(x, y + 1, Math.max(4, sw * 0.35), 2, '#ffffff'); ctx.globalAlpha = 1;
  if (w.fx && R0() < 0.22) w.fx.add({ x: e.x + (R0() - 0.5) * sw, y: e.y - R0() * sh, vx: (R0() - 0.5) * 6, vy: -8 - R0() * 6, life: 0.9, c: R0() < 0.5 ? '#ffffff' : '#bff6ff', t: R0() < 0.35 ? 'pat' : 'fade', pat: TRAIL_PAT.flake, s: 1, drag: 0.6 });
  if (w.fx && R0() < 0.08) w.fx.add({ x: e.x + (R0() - 0.5) * sw * 0.8, y: e.y - 2, vx: (R0() - 0.5) * 4, vy: -3, life: 1, c: '#eaf9ff', s: 2, t: 'puff', drag: 1 });
}
// the moment something freezes, and the moment it thaws out
function iceBurst(w, x, y, big = 1) {
  if (!w.fx) return;
  for (let i = 0; i < 10 * big; i++) { const a = R0() * TAU, sp = 40 + R0() * 70; w.fx.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, g: 160, life: 0.55, c: R0() < 0.5 ? '#ffffff' : R0() < 0.5 ? '#bff6ff' : '#7fe9ff', s: 1 + (R0() < 0.4 ? 1 : 0), drag: 1 }); }
  for (let i = 0; i < 4 * big; i++) w.fx.add({ x: x + (R0() - 0.5) * 10, y: y + (R0() - 0.5) * 8, vx: (R0() - 0.5) * 20, vy: -12, life: 0.8, c: '#ffffff', t: 'pat', pat: i % 2 ? TRAIL_PAT.flake : TRAIL_PAT.spark4, drag: 1 });
  w.fx.add({ x, y, life: 0.3, c: '#dff8ff', s: 14 * big, t: 'ring' });
}

// ---------- in-game: your gear shows off ----------
const HELD_HALO = new WeakMap();
function heldHalo(img) { let h = HELD_HALO.get(img); if (!h) { h = haloOf(img); HELD_HALO.set(img, h); } return h; }
function auraCol(d, i = 0) { const A = premArt(d); if (A && A.aura) { const c = A.aura[i % A.aura.length]; return c === 'RAINBOW' ? rainbow(T_NOW, i * 60) : c; } return d.r === 6 ? rainbow(T_NOW, i * 70) : rcol(d.r); }
// glow drawn behind the gun in your hand (inside its transform)
function drawHeldGlow(d, img, ox, oy) {
  const A = premArt(d); if (d.r < 3 && !A) return;
  const k = 0.45 + 0.3 * Math.sin(T_NOW * 4); ctx.globalAlpha = (d.r >= 5 || A) ? 0.65 + 0.25 * Math.sin(T_NOW * 6) : k * 0.8;
  ctx.drawImage(tinted(heldHalo(img), auraCol(d, Math.floor(T_NOW * 2))), ox - 1, oy - 1); ctx.globalAlpha = 1;
}
// particles off the gun: rarer = more. store/pass weapons each have their own
function heldFx(w, d, mx, my, a) {
  if (!w || !w.fx) return; const F = w.fx, A = premArt(d);
  if (A && A.fx) {
    switch (A.fx) {
      case 'bells': if (R0() < 0.06) F.add({ x: mx, y: my - 2, vx: (R0() - 0.5) * 10, vy: -14, life: 0.7, c: '#ffd84a', t: 'pat', pat: TRAIL_PAT.star, drag: 1 }); break;
      case 'mint': if (R0() < 0.08) F.add({ x: mx, y: my, vx: (R0() - 0.5) * 12, vy: -10, life: 0.6, c: R0() < 0.5 ? '#ffffff' : '#e8303a', s: 1, t: 'fade', drag: 1 }); break;
      case 'frost': if (R0() < 0.14) F.add({ x: mx + (R0() - 0.5) * 6, y: my + (R0() - 0.5) * 6, vx: (R0() - 0.5) * 8, vy: -6, life: 0.8, c: R0() < 0.5 ? '#ffffff' : '#bff6ff', t: R0() < 0.4 ? 'pat' : 'fade', pat: TRAIL_PAT.flake, s: 1, drag: 1 }); break;
      case 'lights': if (R0() < 0.1) F.add({ x: mx - Math.cos(a) * 6, y: my - 3, vx: (R0() - 0.5) * 8, vy: -8, life: 0.7, c: ['#e8303a', '#2fbf5a', '#ffd84a', '#7fd8ff'][R0.int(4)], s: 1, t: 'fade', drag: 1 }); if (R0() < 0.05) F.add({ x: mx, y: my - 4, vx: 0, vy: 8, life: 0.9, c: '#fff', t: 'pat', pat: TRAIL_PAT.flake, drag: 0.5 }); break;
      case 'storm': if (R0() < 0.12) F.add({ x: mx + (R0() - 0.5) * 4, y: my + (R0() - 0.5) * 4, vx: (R0() - 0.5) * 90, vy: (R0() - 0.5) * 90, life: 0.12, c: R0() < 0.5 ? '#fff25a' : '#ffffff', s: 1, t: 'spark', drag: 3 }); break;
      case 'embers': if (R0() < 0.18) F.add({ x: mx, y: my, vx: Math.cos(a) * 10 + (R0() - 0.5) * 10, vy: -16 - R0() * 12, life: 0.6, c: R0() < 0.4 ? '#ffd84a' : '#ff7a2e', s: 1, t: 'fade', drag: 1 }); if (R0() < 0.04) F.add({ x: mx, y: my - 2, vx: 0, vy: -8, life: 0.9, c: '#5d6270', s: 2, t: 'puff', drag: 1 }); break;
      case 'void': if (R0() < 0.12) F.add({ x: mx + (R0() - 0.5) * 8, y: my + (R0() - 0.5) * 6, vx: 0, vy: -6, life: 0.9, c: R0() < 0.6 ? '#b45cff' : '#f0d0ff', s: 1, t: 'fade', drag: 1, fn: (p, dt) => { p.x += Math.sin(T_NOW * 9 + p.max * 30) * 6 * dt; } }); break;
      case 'meteor': if (R0() < 0.14) F.add({ x: mx, y: my, vx: (R0() - 0.5) * 20, vy: 10 + R0() * 10, g: 60, life: 0.5, c: R0() < 0.5 ? '#ff9a3d' : '#fff2a0', s: 1, drag: 1 }); break;
      case 'swarm': if (R0() < 0.1) { const t0 = R0() * TAU; F.add({ x: mx + Math.cos(t0) * 6, y: my + Math.sin(t0) * 4, vx: 0, vy: 0, life: 0.5, c: '#ffe05a', s: 1, t: 'fade', drag: 0, fn: (p, dt) => { p.x += Math.cos(T_NOW * 14 + p.max) * 20 * dt; p.y += Math.sin(T_NOW * 14 + p.max) * 20 * dt; } }); } break;
      case 'rainbow': if (R0() < 0.2) F.add({ x: mx, y: my, vx: (R0() - 0.5) * 16, vy: -10, life: 0.6, c: rainbow(T_NOW, R0() * 360), s: 1, t: 'fade', drag: 1 }); break;
      case 'sun': if (R0() < 0.16) F.add({ x: mx - Math.cos(a) * R0() * 10, y: my - Math.sin(a) * R0() * 10, vx: (R0() - 0.5) * 6, vy: -18, life: 0.5, c: R0() < 0.5 ? '#ffd84a' : '#ff7a2e', s: 1 + (R0() < 0.3 ? 1 : 0), t: 'shrink', drag: 1 }); break;
      case 'hole': if (R0() < 0.18) { const t0 = R0() * TAU, d0 = 9; F.add({ x: mx + Math.cos(t0) * d0, y: my + Math.sin(t0) * d0, vx: -Math.cos(t0 + 0.8) * d0 * 3, vy: -Math.sin(t0 + 0.8) * d0 * 3, life: 0.3, c: R0() < 0.5 ? '#b45cff' : '#ffffff', s: 1, drag: 0 }); } break;
    }
    return;
  }
  const r = d.r; if (r < 4) return;
  const p = [0, 0, 0, 0, 0.05, 0.12, 0.2][r];
  if (R0() < p) F.add({ x: mx + (R0() - 0.5) * 8, y: my + (R0() - 0.5) * 6, vx: (R0() - 0.5) * 8, vy: -10 - R0() * 8, life: 0.7, c: r === 6 ? rainbow(T_NOW, R0() * 360) : R0() < 0.5 ? '#ffffff' : auraCol(d), t: r >= 5 && R0() < 0.5 ? 'pat' : 'fade', pat: TRAIL_PAT.star, s: 1, drag: 1 });
}
// armour: the best piece you wear decides how much your suit glows
const GEAR_R = new Map();
function armorRank(eq) {
  const k = [eq.helmet, eq.chest, eq.boots, eq.jetpack].join(','); let v = GEAR_R.get(k); if (v !== undefined) return v;
  const rs = ['helmet', 'chest', 'boots', 'jetpack'].map(s => eq[s] ? getDef(eq[s]).r : 0); v = Math.max(...rs) + (rs.every(r => r >= 4) ? 1 : 0); v = Math.min(6, v); GEAR_R.set(k, v); return v;
}
function armorAura(w, pl, eq) {
  if (!w || !w.fx) return; const r = armorRank(eq); if (r < 4) return;
  const p = [0, 0, 0, 0, 0.04, 0.09, 0.15][r];
  if (R0() < p) { const c = r === 6 ? rainbow(T_NOW, R0() * 360) : R0() < 0.4 ? '#ffffff' : rcol(r); w.fx.add({ x: pl.x + (R0() - 0.5) * 14, y: pl.y - 4 - R0() * 18, vx: 0, vy: -8 - R0() * 6, life: 0.8, c, t: r >= 5 && R0() < 0.4 ? 'pat' : 'fade', pat: TRAIL_PAT.star, s: 1, drag: 1 }); }
}
// details drawn onto the astronaut for each armour piece's rarity
function armorDetailLayers(L, eq, dir, ox, oy, by, legA, af) {
  const R = s => eq[s] ? getDef(eq[s]).r : -1;
  const hr = R('helmet'), cr = R('chest'), br = R('boots'), jr = R('jetpack');
  const side = dir === 2; const front = dir === 0, back = dir === 1;
  if (hr >= 2) {
    const g = new Spr(20, 26), cx = side ? ox + 7 : ox + 8;
    if (!back) { if (front) { g.set(ox + 3, by + 5, M.S); g.set(ox + 13, by + 5, M.S); } else g.set(ox + 10, by + 5, M.S); }
    if (hr >= 3 && !eq.headgear) { g.rect(cx - (front ? 1 : 0), by, front ? 2 : 2, 1, M.A); }
    if (hr >= 4 && !eq.headgear) { g.rect(cx, by - 2, 1, 2, M.A); g.set(cx, by - 3, M.G); if (side) { g.set(cx + 1, by - 1, M.A); g.set(cx + 2, by, M.A); } }
    if (hr >= 5 && !eq.headgear) { g.line(cx - 3, by + 1, cx - 5, by - 2, M.A); g.line(cx + 3, by + 1, cx + 5, by - 2, M.A); }
    if (hr >= 4 && front) g.set(ox + 5 + (af % 4), by + 5, M.W);
    if (g.bbox().x1 >= 0) L.push([g, palOfItem(eq.helmet)]);
  }
  if (cr >= 2) {
    const g = new Spr(20, 26);
    if (front) { g.set(ox + 8, by + 14, M.G); if (cr >= 3) { g.rect(ox + 1, by + 9, 3, 2, M.S); g.rect(ox + 12, by + 9, 3, 2, M.S); } if (cr >= 4) { g.set(ox + 7, by + 11, M.A); g.set(ox + 9, by + 11, M.A); g.set(ox + 8, by + 10, M.A); g.set(ox + 8, by + 12, M.A); g.set(ox + 8, by + 11, M.G); } if (cr >= 5) { g.rect(ox + 4, by + 11 + (af % 2), 1, 2, M.G); g.rect(ox + 11, by + 11 + ((af + 1) % 2), 1, 2, M.G); } }
    else if (side) { g.set(ox + 6, by + 14, M.G); if (cr >= 3) g.rect(ox + 6, by + 9, 3, 2, M.S); if (cr >= 4) g.set(ox + 5, by + 11, M.A); if (cr >= 5) g.rect(ox + 4, by + 11 + (af % 2), 1, 2, M.G); }
    else if (cr >= 3) { g.rect(ox + 1, by + 9, 3, 2, M.S); g.rect(ox + 12, by + 9, 3, 2, M.S); }
    if (g.bbox().x1 >= 0) L.push([g, palOfItem(eq.chest)]);
  }
  if (br >= 3) {
    const g = new Spr(20, 26);
    if (front || back) { g.rect(ox + 4, oy + 18 + Math.min(0, legA), 3, 1, M.G); g.rect(ox + 9, oy + 18 + Math.min(0, -legA), 3, 1, M.G); if (br >= 4) { g.set(ox + 3, oy + 16 + Math.min(0, legA), M.A); g.set(ox + 12, oy + 16 + Math.min(0, -legA), M.A); } }
    else { g.rect(ox + 4 + legA, oy + 18, 3, 1, M.G); g.rect(ox + 7 - legA, oy + 18, 3, 1, M.G); if (br >= 4) g.set(ox + 10 - legA, oy + 16, M.A); }
    L.push([g, palOfItem(eq.boots)]);
  }
  if (jr >= 3) {
    const g = new Spr(20, 26);
    if (front) { g.rect(ox, by + 9, 1, 3, M.P); g.rect(ox + 15, by + 9, 1, 3, M.P); if (jr >= 4) { g.set(ox, by + 8, M.G); g.set(ox + 15, by + 8, M.G); } }
    else if (back) { g.rect(ox + 1, by + 10, 2, 4, M.P); g.rect(ox + 13, by + 10, 2, 4, M.P); if (jr >= 4) { g.set(ox + 4, by + 16, af % 2 ? M.W : M.G); g.set(ox + 11, by + 16, af % 2 ? M.G : M.W); } if (jr >= 5) { g.line(ox + 1, by + 10, ox - 1, by + 7, M.P); g.line(ox + 14, by + 10, ox + 16, by + 7, M.P); } }
    else { g.rect(ox + 13, by + 9, 1, 4, M.P); if (jr >= 4) g.set(ox + 12, by + 16, af % 2 ? M.W : M.G); if (jr >= 5) g.line(ox + 13, by + 9, ox + 15, by + 6, M.P); }
    L.push([g, palOfItem(eq.jetpack)]);
  }
}
const armorAnimates = eq => armorRank(eq) >= 4;
// premium cosmetic icons take over from the crate drawings
for (const k of ['headgear', 'eyewear', 'back', 'trail', 'killfx']) { const base = CGEN[k]; CGEN[k] = (g, st, R) => PC_ICON[st] ? PC_ICON[st](g, R) : base(g, st, R); }

// ---------- armour, ship parts and tools: more hardware for every rarity step (16x16 icons) ----------
function armorParts(g, sub, r, f = 0) {
  const put = (x, y, m) => { x = Math.round(x); y = Math.round(y); if (g.ok(x, y) && g.get(x, y) === 0) g.set(x, y, m); };
  if (r === 0) { for (let i = 0; i < g.m.length; i++) if (g.m[i] === M.G || g.m[i] === M.W) g.m[i] = M.S; return; }
  const b = g.bbox(); if (b.x1 < 0) return; const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2);
  if (r >= 2) { for (const x of [b.x0 + 1, b.x1 - 1]) { const [t, bt] = colsOf(g, x); if (t >= 0) g.set(x, Math.round((t + bt) / 2), M.A); } }
  if (r >= 3) { let gx = cx, gy = cy; if (g.get(gx, gy) <= 1) { for (let d = 1; d < 5 && g.get(gx, gy) <= 1; d++) gy = cy + (d % 2 ? d : -d); } if (g.get(gx, gy) > 1) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (g.get(gx + dx, gy + dy) > 1) g.set(gx + dx, gy + dy, M.G); g.set(gx, gy, M.W); } }
  if (r >= 4) { const wy = b.y0 + Math.round((b.y1 - b.y0) * 0.3); for (const s of [-1, 1]) { const ex = s < 0 ? b.x0 - 1 : b.x1 + 1; put(ex, wy, M.A); put(ex, wy - 1, M.A); put(ex + s, wy - 2, M.A); put(ex, wy + 1, M.A); } for (let x = b.x0 + 2; x <= b.x1 - 2; x += 3) { const [t] = colsOf(g, x); if (t > 0 && t <= b.y0 + 1) put(x, t - 1, M.A); } }
  if (r >= 5) { const bob = WAVE8[f & 7] < 0 ? -1 : WAVE8[f & 7] > 0 ? 1 : 0; const y = Math.max(1, b.y0 - 2 + bob); put(cx, y - 1, M.G); put(cx - 1, y, M.G); put(cx + 1, y, M.G); put(cx, y + 1, M.G); put(cx, y, M.W); }
}
// a twinkle that walks around a legendary+ cosmetic on your astronaut
function cosSparkle(g, r, af) {
  if (r < 4) return; const px0 = []; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.m[y * g.w + x] > 1 && g.get(x, y - 1) === 0) px0.push(x, y);
  const n = px0.length >> 1; if (!n) return; const k = r >= 5 ? 2 : 1;
  for (let i = 0; i < k; i++) { const j = ((af * 5 + i * Math.floor(n / 2)) % n) * 2; g.set(px0[j], px0[j + 1], M.W); }
}

// ---------- better crate trails & finishers (they override the old ones by style name) ----------
const EXTRA_PAT = { ghost: '.###.|#####|#.#.#|#####|#.#.#', skull: '.###.|#.#.#|#####|.#.#.', coin: '.##.|####|####|.##.', flower: '.#.|#.#|.#.', bigheart: '.#.#.|#####|#####|.###.|..#..', note2: '..##|..#.|.##.|###.', leaf2: '..##|.###|###.|#...' };   // merged into TRAIL_PAT in planet.js
Object.assign(PC_TRAIL, {
  FLAMES(w, x, y, pl, c, big) { for (let i = 0; i < 2 + big; i++) w.fx.add({ x: x + (R0() - 0.5) * 5, y: y - 2, vx: (R0() - 0.5) * 10, vy: -30 - R0() * 16, life: 0.5, c: R0() < 0.35 ? '#fff2a0' : R0() < 0.5 ? '#ffb02e' : R0() < 0.5 ? '#ff5a1e' : c[1], s: 3, t: 'shrink', drag: 1.6 }); if (R0() < 0.15) w.fx.add({ x, y: y - 10, vx: (R0() - 0.5) * 6, vy: -16, life: 0.9, c: '#4a3f48', s: 2, t: 'puff', drag: 1 }); },
  BOLTS(w, x, y) { w.fx.add({ x: x + (R0() - 0.5) * 8, y: y - 6 - R0() * 6, vx: (R0() - 0.5) * 20, vy: -6, life: 0.3, c: R0() < 0.5 ? '#fff25a' : '#bff3ff', t: 'pat', pat: TRAIL_PAT.bolt, drag: 2 }); for (let i = 0; i < 2; i++) w.fx.add({ x, y: y - 4, vx: (R0() - 0.5) * 110, vy: (R0() - 0.5) * 110, life: 0.15, c: '#fff25a', s: 1, t: 'spark', drag: 1 }); },
  HEARTS(w, x, y, pl, c) { w.fx.add({ x, y: y - 8, vx: (R0() - 0.5) * 10, vy: -16, life: 1, c: R0() < 0.5 ? '#ff5c9a' : c[0], t: 'pat', pat: R0() < 0.3 ? TRAIL_PAT.bigheart : TRAIL_PAT.heart, drag: 1, fn: (p, dt) => { p.x += Math.sin(T_NOW * 7 + p.max * 20) * 10 * dt; } }); },
  NOTES(w, x, y, pl, c) { w.fx.add({ x, y: y - 10, vx: (R0() - 0.5) * 14, vy: -18, life: 1, c: c[R0.int(3)], t: 'pat', pat: R0() < 0.5 ? TRAIL_PAT.note : TRAIL_PAT.note2, drag: 1.2, fn: (p, dt) => { p.x += Math.sin(T_NOW * 9 + p.max * 20) * 14 * dt; } }); },
  SPARKLES(w, x, y, pl, c, big) { w.fx.add({ x, y: y - 4 - R0() * 10, vx: (R0() - 0.5) * 6, vy: -5, life: 0.8, c: R0() < 0.4 ? '#fff' : c[R0.int(3)], t: 'pat', pat: R0() < 0.25 + big * 0.3 ? TRAIL_PAT.spark4 : TRAIL_PAT.star, drag: 1 }); if (R0() < 0.4) w.fx.add({ x: x + (R0() - 0.5) * 10, y: y - 6, life: 0.4, c: '#ffffff', s: 1, t: 'fade' }); },
  LEAVES(w, x, y, pl, c) { w.fx.add({ x, y: y - 10, vx: (R0() - 0.5) * 16, vy: 6, life: 1.2, c: R0() < 0.4 ? '#7bd389' : R0() < 0.5 ? '#f2a541' : c[1], t: 'pat', pat: R0() < 0.5 ? TRAIL_PAT.leaf : TRAIL_PAT.leaf2, g: 10, drag: 1, fn: (p, dt) => { p.x += Math.sin(T_NOW * 6 + p.max * 30) * 14 * dt; } }); },
});
const ring8 = (F, x, y, n, sp, c, life, o = {}) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + (o.a || 0); F.add(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, c: typeof c === 'function' ? c(i) : c, s: 1, drag: 2 }, o.p || {})); } };
Object.assign(PC_KILL, {
  CONFETTI(F, x, y, cols, big) { for (let i = 0; i < 26 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 170, vy: -R0() * 150 - 20, g: 200, life: 1.1, c: rainbow(R0() * 3, i * 40), s: 1 + (i % 3 === 0 ? 1 : 0), drag: 1.8, fn: (p, dt) => { p.x += Math.sin(T_NOW * 18 + p.max * 40) * 18 * dt; } }); F.add({ x, y, life: 0.2, c: '#ffffff', s: 10, t: 'ring' }); },
  'PIXEL POP'(F, x, y, cols, big) { ring8(F, x, y, 12 * big, 110, i => cols[i % 3], 0.45, { p: { s: 2, t: 'shrink' } }); F.add({ x, y, life: 0.22, c: cols[1], s: 12 * big, t: 'ring' }); F.add({ x, y, life: 0.12, c: '#ffffff', s: 5, t: 'hitflash' }); },
  GHOSTS(F, x, y, cols, big) { for (let i = 0; i < 2 + big; i++) F.add({ x: x + (R0() - 0.5) * 12, y, vx: (R0() - 0.5) * 8, vy: -22 - R0() * 8, life: 1.3, c: i % 2 ? '#ffffff' : cols[1], t: 'pat', pat: TRAIL_PAT.ghost, drag: 0.4, fn: (p, dt) => { p.x += Math.sin(T_NOW * 6 + p.max * 9) * 12 * dt; } }); F.add({ x, y, life: 0.6, c: '#dfe4f5', s: 4, t: 'puff' }); },
  'COIN BURST'(F, x, y, cols, big) { for (let i = 0; i < 10 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 130, vy: -R0() * 120 - 40, g: 280, life: 0.9, c: i % 3 ? '#fca311' : '#ffe2a8', t: 'pat', pat: i % 2 ? TRAIL_PAT.coin : TRAIL_PAT.star, drag: 0.8 }); F.text(x, y - 8, '+$', '#ffe2a8', { f: FS, life: 0.6, vy: -30 }); },
  SKULLS(F, x, y, cols, big) { F.add({ x, y: y - 4, vx: 0, vy: -20, life: 0.9, c: '#ffffff', t: 'pat', pat: TRAIL_PAT.skull, drag: 0.5 }); ring8(F, x, y, 10 * big, 80, i => i % 2 ? cols[1] : '#4a3f48', 0.45, { p: { s: 2, t: 'shrink' } }); F.add({ x, y, life: 0.7, c: '#2a2030', s: 5, t: 'puff' }); },
  FLOWERS(F, x, y, cols, big) { for (let i = 0; i < 7 * big; i++) F.add({ x, y, vx: (R0() - 0.5) * 90, vy: -30 - R0() * 70, g: 60, life: 1, c: i % 2 ? cols[0] : '#ffd1ea', t: 'pat', pat: TRAIL_PAT.flower, drag: 1 }); ring8(F, x, y, 8, 50, '#7bd389', 0.4, { p: { t: 'fade' } }); },
  HEARTS(F, x, y, cols, big) { for (let i = 0; i < 6 * big; i++) F.add({ x: x + (R0() - 0.5) * 10, y, vx: (R0() - 0.5) * 60, vy: -30 - R0() * 50, life: 1, c: i % 2 ? '#ff5c9a' : cols[0], t: 'pat', pat: i === 0 ? TRAIL_PAT.bigheart : TRAIL_PAT.heart, drag: 1 }); F.add({ x, y, life: 0.25, c: '#ff5c9a', s: 12, t: 'ring' }); },
  STARS(F, x, y, cols, big) { ring8(F, x, y, 8 * big, 90, i => i % 2 ? '#ffd84a' : cols[1], 0.6, { p: { t: 'pat', pat: TRAIL_PAT.star, drag: 2.5 } }); F.add({ x, y, life: 0.6, c: '#ffffff', t: 'pat', pat: TRAIL_PAT.spark4, vy: -10, drag: 1 }); },
  GLITCH(F, x, y, cols, big) { for (let i = 0; i < 12 * big; i++) F.add({ x: x + (R0() - 0.5) * 22, y: y + (R0() - 0.5) * 14, vx: (R0() - 0.5) * 220, vy: 0, life: 0.3, c: [cols[1], '#ff2a6a', '#2affd8', '#ffffff'][i % 4], s: 2 + R0.int(3), drag: 9 }); F.add({ x, y, life: 0.15, c: '#ffffff', s: 8, t: 'hitflash' }); },
  'BLACK HOLE'(F, x, y, cols, big) { for (let i = 0; i < 24 * big; i++) { const a = R0() * TAU, d = 20 + R0() * 10; F.add({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a + 0.6) * d * 3, vy: -Math.sin(a + 0.6) * d * 3, life: 0.35, c: i % 3 ? cols[1] : '#ffffff', s: 1, drag: 0 }); } F.add({ x, y, life: 0.45, c: '#000000', s: 4, t: 'puff' }); F.add({ x, y, life: 0.35, c: cols[1], s: 16, t: 'ring' }); },
  SHOCKWAVE(F, x, y, cols, big) { F.add({ x, y, life: 0.4, c: cols[1], s: 26 * big, t: 'ring' }); F.add({ x, y, life: 0.3, c: '#ffffff', s: 15 * big, t: 'ring' }); ring8(F, x, y, 10, 160, '#ffffff', 0.18, { p: { t: 'spark', drag: 4 } }); },
  FIREWORKS(F, x, y, cols, big) { ring8(F, x, y, 18 * big, 115, i => cols[i % cols.length], 0.7, { p: { t: 'spark', drag: 3, g: 40 } }); ring8(F, x, y, 8, 50, '#ffffff', 0.5, { a: 0.2, p: { t: 'fade', drag: 2 } }); F.add({ x, y, life: 0.2, c: '#ffffff', s: 6, t: 'hitflash' }); },
});
// rarer finishers and trails get an extra layer on top of their own effect
function killFlair(F, x, y, r, big = 1) {
  if (r >= 4) for (let i = 0; i < 3 + big; i++) F.add({ x: x + (R0() - 0.5) * 18, y: y + (R0() - 0.5) * 14, vx: 0, vy: -14, life: 0.7, c: r === 6 ? rainbow(T_NOW, i * 80) : '#ffffff', t: 'pat', pat: i % 2 ? TRAIL_PAT.spark4 : TRAIL_PAT.star, drag: 1 });
  if (r >= 5) F.add({ x, y, life: 0.35, c: r === 6 ? rainbow(T_NOW) : rcol(r), s: 20 * big, t: 'ring' });
  if (r >= 6) ring8(F, x, y, 12, 140, i => rainbow(T_NOW, i * 30), 0.5, { p: { t: 'spark', drag: 3 } });
}
function trailFlair(w, x, y, r) {
  if (r >= 4 && R0() < [0, 0, 0, 0, 0.15, 0.3, 0.45][r]) w.fx.add({ x: x + (R0() - 0.5) * 10, y: y - 4 - R0() * 12, vx: 0, vy: -6, life: 0.6, c: r === 6 ? rainbow(T_NOW, R0() * 360) : '#ffffff', t: 'pat', pat: r >= 5 && R0() < 0.4 ? TRAIL_PAT.spark4 : TRAIL_PAT.star, drag: 1 });
}

// ---------- feel: hitmarkers, kill punch, gadget punch ----------
const HITM = { t: 0, crit: false, kill: false, bloom: 0 };
function hitMark(crit) { HITM.t = 0.16; if (crit) HITM.crit = true; }
function drawHitMark(x, y, dt) {
  HITM.bloom = Math.max(0, HITM.bloom - dt * 8);
  if (HITM.t <= 0) { HITM.crit = HITM.kill = false; return; }
  HITM.t -= dt; const k = HITM.t / 0.16, c = HITM.kill ? '#ff4a5a' : HITM.crit ? COL.gold : '#ffffff', g = (HITM.kill ? 6 : 4) + Math.round((1 - k) * 2);
  ctx.globalAlpha = Math.min(1, k * 2.5);
  line(x - g - 3, y - g - 3, x - g, y - g, c); line(x + g + 3, y - g - 3, x + g, y - g, c); line(x - g - 3, y + g + 3, x - g, y + g, c); line(x + g + 3, y + g + 3, x + g, y + g, c);
  if (HITM.kill) { line(x - g - 2, y - g - 3, x - g + 1, y - g, c); line(x + g + 2, y - g - 3, x + g - 1, y - g, c); }
  ctx.globalAlpha = 1;
}
// a kill should land: a beat of hitstop, chunks of the alien, a flash ring, a sound that climbs with your combo
function killJuice(w, e) {
  if (w.demo || !w.fx) return;
  const big = e.boss ? 3 : e.elite ? 2 : 1, c = e.col || '#9f9';
  if (!w.arena && !w.visualOnly) FX.hitstop = Math.max(FX.hitstop, e.boss ? 0.2 : e.elite ? 0.07 : 0.025);
  if (w.player && (!w.arena)) { HITM.t = 0.22; HITM.kill = true; }
  w.fx.add({ x: e.x, y: e.y - 4, life: 0.12, c: '#ffffff', s: 6 + e.r, t: 'hitflash' });
  w.fx.add({ x: e.x, y: e.y - 4, life: 0.25, c: '#ffffff', s: e.r * 2 + 6, t: 'ring' });
  for (let i = 0; i < 5 * big; i++) { const a = R0() * TAU, sp = 50 + R0() * 90; w.fx.add({ x: e.x, y: e.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 260, life: 0.5 + R0() * 0.3, c: R0() < 0.3 ? (e.col2 || '#ffffff') : c, s: 2, drag: 1.5 }); }
  if (big > 1) shake(big * 1.5); else if (w.combo >= 10 && R0() < 0.5) shake(0.8);
}
// every gadget lands with a punch; the big ones shake the screen
const GADGET_PUNCH = { blackhole: ['#b066ff', 2, 'launch'], cluster: ['#ff9a3d', 1.5, 'throw'], dome: ['#9fe7ff', 2, 'unlock'], timewarp: ['#7fe9ff', 1, 'charge'], decoy: ['#b79ced', 1, 'unlock'], orbital: ['#fff6c0', 1.5, 'charge'], freeze: ['#bff6ff', 4, 'freeze'], blink: ['#bff3ff', 1.5, 'zap'], turret: ['#9fe7ff', 1.5, 'mine'], medkit: ['#7dffb0', 1, 'levelup'], emp: ['#fff25a', 3.5, 'zap'], slam: ['#c9c0ff', 3, 'launch'] };
function gadgetJuice(w, pl, k) {
  if (!w.fx) return; const P = GADGET_PUNCH[k] || ['#ffffff', 1.5]; const c = P[0];
  w.fx.add({ x: pl.x, y: pl.y - 8, life: 0.3, c, s: 26, t: 'ring' }); w.fx.add({ x: pl.x, y: pl.y - 8, life: 0.18, c: '#ffffff', s: 14, t: 'ring' });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.fx.add({ x: pl.x, y: pl.y - 8, vx: Math.cos(a) * 120, vy: Math.sin(a) * 90, life: 0.25, c: i % 2 ? c : '#ffffff', s: 1, t: 'spark', drag: 4 }); }
  if (w.demo) return;
  shake(P[1]); if (!w.arena) FX.hitstop = Math.max(FX.hitstop, 0.035); FX.flash = Math.max(FX.flash || 0, 0.12); FX.flashCol = c;
  if (k === 'freeze') {
    for (let r = 0; r < 3; r++) w.fx.add({ x: pl.x, y: pl.y - 4, life: 0.35 + r * 0.12, c: r ? '#bff6ff' : '#ffffff', s: (pl.G ? pl.G.rad : 90) * (0.6 + r * 0.25), t: 'ring' });
    for (let i = 0; i < 22; i++) { const a = R0() * TAU, sp = 90 + R0() * 120; w.fx.add({ x: pl.x, y: pl.y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, life: 0.5, c: R0() < 0.5 ? '#ffffff' : '#bff6ff', t: R0() < 0.4 ? 'pat' : 'spark', pat: TRAIL_PAT.flake, s: 1, drag: 2.5 }); }
    let n = 0; for (const e of w.ents) if (!e.dead && e.freeze > 0 && n < 10 && Math.hypot(e.x - pl.x, e.y - pl.y) < (pl.G ? pl.G.rad : 90)) { iceBurst(w, e.x, e.y - 6); n++; }
  }
  if (k === 'emp') { FX.flash = 0.2; FX.flashCol = '#fff25a'; }
  if (k === 'blink') { const g = w.gx && w.gx[w.gx.length - 1]; if (g && g.k === 'blink') g.ghost = true; }
}
// cooldown done: a ping and a ring so you know it's back
function gadgetReady(w, pl) {
  if (!w.fx || w.demo) return; const P = GADGET_PUNCH[pl.G.k] || ['#ffffff'];
  w.fx.add({ x: pl.x, y: pl.y - 10, life: 0.35, c: P[0], s: 16, t: 'ring' }); w.fx.text(pl.x, pl.y - 30, 'GADGET READY', P[0], { f: FS, life: 0.6 }); wsnd(w, 'tick', 1400);
}
