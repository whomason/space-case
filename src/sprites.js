// ===== SPRITES: material-grid pixel art, auto shading/outline, palettes, skins =====
const M = { O: 1, P: 2, S: 3, A: 4, G: 5, D: 6, W: 7 };
class Spr {
  constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.s = new Int8Array(w * h); }
  ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, m, s = 0) { x = Math.round(x); y = Math.round(y); if (this.ok(x, y)) { const i = y * this.w + x; this.m[i] = m; this.s[i] = s; } }
  get(x, y) { return this.ok(x, y) ? this.m[y * this.w + x] : 0; }
  rect(x, y, w, h, m, s = 0) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, m, s); }
  ell(cx, cy, rx, ry, m, s = 0) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5); if (dx * dx + dy * dy <= 1) this.set(x, y, m, s);
    }
  }
  line(x0, y0, x1, y1, m, s = 0, th = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) { const x = Math.round(lerp(x0, x1, i / n)), y = Math.round(lerp(y0, y1, i / n)); this.set(x, y, m, s); if (th > 1) { this.set(x + 1, y, m, s); if (th > 2) this.set(x, y + 1, m, s); } }
  }
  poly(pts, m, s = 0) {
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, m, s);
    }
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.line(a[0], a[1], b[0], b[1], m, s); }
  }
  ring(cx, cy, r0, r1, m, s = 0) {
    for (let y = Math.floor(cy - r1 - 1); y <= cy + r1 + 1; y++) for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r1 + 0.4 && d >= r0 - 0.4) this.set(x, y, m, s); }
  }
  clear(x, y) { this.set(x, y, 0); }
  bbox() { let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.m[y * this.w + x] > 1) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; }
  mirrorX() { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w >> 1; x++) { const i = y * this.w + x, j = y * this.w + (this.w - 1 - x); this.m[j] = this.m[i]; this.s[j] = this.s[i]; } }
  shade() {
    const { w, h, m, s } = this; const e = (x, y) => { const v = this.get(x, y); return v <= 1; };
    const ns = new Int8Array(s);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, v = m[i]; if (v < 2 || s[i] !== 0) continue;
      if (v === M.G) { if (!e(x, y - 1) && !e(x, y + 1) && !e(x - 1, y) && !e(x + 1, y)) ns[i] = 1; else if (e(x, y - 1)) ns[i] = 1; continue; }
      if (v === M.W) continue;
      let sh = 0;
      if (e(x, y - 1)) sh += 1;
      if (e(x - 1, y) && !e(x, y - 1)) sh += 0;
      if (e(x, y + 1)) sh -= 1;
      if (e(x + 1, y) && e(x, y + 1)) sh -= 1;
      if (e(x, y - 1) && e(x - 1, y)) sh += 1;
      ns[i] = clamp(sh, -2, 2);
    }
    this.s = ns; return this;
  }
  outline() {
    const { w, h, m } = this; const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (m[y * w + x] !== 0) continue;
      if (this.get(x - 1, y) > 1 || this.get(x + 1, y) > 1 || this.get(x, y - 1) > 1 || this.get(x, y + 1) > 1) add.push(y * w + x);
    }
    for (const i of add) m[i] = 1; return this;
  }
  fin() { return this.shade().outline(); }
}

const WHITE_RAMP = [[120, 130, 165], [190, 200, 228], [236, 240, 255], [255, 255, 255], [255, 255, 255]];
function makePal(h, s, l, o = {}) {
  const h2 = o.h2 !== undefined ? o.h2 : h + 28;
  return {
    P: ramp(h, s, l), S: ramp(h2, o.s2 !== undefined ? o.s2 : s * 0.9, o.l2 !== undefined ? o.l2 : clamp(l * 0.82, 0.18, 0.82)),
    A: o.A || ramp(222, 0.1, 0.6), G: ramp(o.gh !== undefined ? o.gh : h, o.gs !== undefined ? o.gs : 1, o.gl || 0.6),
    D: ramp(o.dh !== undefined ? o.dh : h, 0.22, 0.17), Wr: WHITE_RAMP, O: hsl(towardHue(h, 250, 0.45), 0.5, 0.05),
  };
}
const METALS = { steel: () => ramp(222, 0.1, 0.6), gold: () => ramp(44, 0.88, 0.56), chrome: () => ramp(235, 0.16, 0.38), pearl: () => ramp(270, 0.25, 0.82), bronze: () => ramp(28, 0.55, 0.45), black: () => ramp(250, 0.2, 0.2) };

// skin patterns: return [material, shadeDelta]
function patternFn(name, seed, t = 0) {
  const nz = makeNoise(seed);
  const r = RNG(seed);
  switch (name) {
    case 'STRIPE': return (x, y, m, s) => (m === M.P && (((x + y) >> 1) % 3 === 0)) ? [M.S, s] : [m, s];
    case 'CAMO': return (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const n = nz.n2(x * 0.32, y * 0.32); return n < 0.38 ? [M.S, s] : n > 0.7 ? [M.D, s + 1] : [M.P, s]; };
    case 'CIRCUIT': return (x, y, m, s) => (m === M.P && ((x % 6 === 0 && y % 2 === 0) || (y % 5 === 0 && x % 3 !== 0))) ? [M.G, 0] : [m, s];
    case 'CHECKER': return (x, y, m, s) => (m === M.P && (((x >> 1) + (y >> 1)) & 1)) ? [M.S, s] : [m, s];
    case 'TIGER': return (x, y, m, s) => (m === M.P && Math.sin(x * 0.9 + nz.n2(x * 0.2, y * 0.4) * 6) > 0.55) ? [M.D, s + 1] : [m, s];
    case 'FLAME': return (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const v = (y / 12) + nz.n2(x * 0.5, y * 0.5 - t) * 0.5; return v > 0.95 ? [M.G, 1] : v > 0.75 ? [M.G, -1] : [m, s]; };
    case 'DOTS': return (x, y, m, s) => (m === M.P && x % 4 === 1 && y % 3 === 1) ? [M.W, 0] : [m, s];
    case 'CARBON': return (x, y, m, s) => (m === M.P || m === M.S) ? [M.D, ((x + y) & 1) ? s + 1 : s] : [m, s];
    case 'SCALES': return (x, y, m, s) => (m === M.P && ((y % 3 === 0 && (x + (y % 6 === 0 ? 0 : 2)) % 4 !== 0))) ? [M.S, s - 1] : [m, s];
    case 'GALAXY': return (x, y, m, s) => { if (m !== M.P && m !== M.S) return [m, s]; const n = nz.n2(x * 0.3, y * 0.3); const h = hashStr(x + ',' + y + ',' + seed) % 23; return h === 0 ? [M.W, 1] : n > 0.62 ? [M.S, 0] : [M.D, s]; };
    case 'HOLO': return (x, y, m, s) => (m === M.P || m === M.S || m === M.A) ? [((x + y + Math.floor(t * 8)) >> 2) % 2 ? M.G : M.S, s + 1] : [m, s];
    case 'GILDED': return (x, y, m, s) => (m === M.S) ? [M.A, s] : [m, s];
    case 'ZEBRA': return (x, y, m, s) => (m === M.P) ? [Math.sin((x - y * 0.6) * 0.8 + nz.n2(x * 0.3, y * 0.3) * 4) > 0.2 ? M.D : M.W, s] : [m, s];
    case 'FADE': return (x, y, m, s) => (m === M.P && (x / 24 + (BAYER[((y & 3) << 2) + (x & 3)] - 0.5) * 0.3) > 0.55) ? [M.S, s] : [m, s];
    case 'PIXEL': return (x, y, m, s) => (m === M.P && (hashStr(seed + ':' + x + ':' + y) % 5 === 0)) ? [r.chance(0.5) ? M.G : M.S, 0] : [m, s];
    default: return null;
  }
}

function renderSpr(g, pal, pat) {
  const c = mkCanvas(g.w, g.h); const id = c.x.createImageData(g.w, g.h); const d = id.data;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const i = y * g.w + x; const m = g.m[i]; if (!m) continue;
    let col;
    if (m === 1) col = pal.O;
    else {
      let mat = m, sh = g.s[i];
      if (pat) { const r = pat(x, y, mat, sh); mat = r[0]; sh = r[1]; }
      const rp = mat === M.P ? pal.P : mat === M.S ? pal.S : mat === M.A ? pal.A : mat === M.G ? pal.G : mat === M.D ? pal.D : pal.Wr;
      col = rp[clamp(2 + sh, 0, 4)];
    }
    const o = i * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  c.x.putImageData(id, 0, 0); return c;
}
// masks / halos
function maskOf(c, col = '#fff') { const m = mkCanvas(c.width, c.height); m.x.drawImage(c, 0, 0); m.x.globalCompositeOperation = 'source-in'; m.x.fillStyle = col; m.x.fillRect(0, 0, c.width, c.height); return m; }
function haloOf(c) {
  const w = c.width, h = c.height, src = c.x.getImageData(0, 0, w, h).data;
  const o = mkCanvas(w + 2, h + 2); const id = o.x.createImageData(w + 2, h + 2); const d = id.data;
  const a = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? src[(y * w + x) * 4 + 3] : 0;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (a(x, y)) continue;
    if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) { const k = ((y + 1) * (w + 2) + (x + 1)) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = 255; }
  }
  o.x.putImageData(id, 0, 0); return o;
}
const _tints = new WeakMap();
function tinted(c, col) {
  let m = _tints.get(c); if (!m) { m = new Map(); _tints.set(c, m); }
  let t = m.get(col); if (!t) { t = maskOf(c, col); m.set(col, t); if (m.size > 40) m.delete(m.keys().next().value); }
  return t;
}

// ---------- weapon generators (32x16, muzzle right). each class keeps one readable silhouette ----------
const WGEN = {
  blaster(g, r, R) { // pistol / raygun: short body, angled grip, no stock
    const t = R.int(3), oy = R.ir(0, 1);
    g.poly([[9, 9 + oy], [13, 9 + oy], [11, 15], [7, 15]], M.D);
    g.line(13, 10 + oy, 15, 11 + oy, M.A); g.set(15, 10 + oy, M.A);
    if (t === 0) { g.rect(5, 4 + oy, 15, 5, M.P); g.rect(6, 3 + oy, 13, 1, M.S); g.rect(20, 5 + oy, 6, 2, M.A); g.rect(26, 4 + oy, 2, 4, M.A); g.rect(8, 5 + oy, 5, 2, M.G); g.rect(4, 4 + oy, 1, 3, M.S); }
    else if (t === 1) { g.ell(11, 6 + oy, 6.5, 3.2, M.P); g.ell(4.5, 6 + oy, 2.5, 2.5, M.S); g.rect(17, 5 + oy, 8, 2, M.A); for (const x of [18, 21, 24]) g.rect(x, 3 + oy, 1, 6, M.S); g.ell(26.5, 6 + oy, 1.6, 1.6, M.G); g.rect(8, 5 + oy, 4, 1, M.G); }
    else { g.rect(5, 3 + oy, 14, 6, M.P); g.rect(7, 2 + oy, 9, 1, M.A); g.rect(19, 4 + oy, 7, 4, M.A); g.rect(26, 3 + oy, 1, 6, M.A); g.set(25, 5 + oy, M.G); g.set(25, 6 + oy, M.G); g.rect(8, 5 + oy, 7, 2, M.G); }
    return { x0: 4, x1: 27, y0: 3 + oy, y1: 9 + oy };
  },
  rifle(g, r, R) { // stock + receiver + long barrel + curved mag
    const st = R.int(3);
    if (st === 0) g.poly([[1, 5], [8, 5], [8, 9], [3, 10], [1, 10]], M.S);
    else if (st === 1) { g.rect(1, 5, 7, 1, M.S); g.rect(1, 9, 7, 1, M.S); g.rect(1, 5, 2, 5, M.S); }
    else { g.poly([[1, 6], [8, 5], [8, 9], [1, 9]], M.S); g.set(2, 10, M.S); }
    g.rect(8, 4, 12, 5, M.P); g.rect(9, 3, 8, 1, M.A);
    g.rect(20, 5, 9, 2, M.A); g.rect(20, 4, 6, 4, M.S); g.rect(29, 4, 2, 4, M.A);
    g.poly([[13, 9], [16, 9], [17, 13], [15, 14], [13, 11]], M.D);
    g.poly([[9, 9], [12, 9], [11, 14], [8, 14]], M.D);
    if (R.chance(0.6)) { g.rect(10, 1, 7, 2, M.A); g.set(10, 1, M.G); g.set(16, 1, M.G); }
    g.rect(10, 6, R.ir(3, 6), 1, M.G);
    return { x0: 1, x1: 30, y0: 3, y1: 9 };
  },
  shotgun(g, r, R) { // fat double barrel, pump grip, chunky stock
    g.poly([[1, 4], [9, 5], [9, 10], [1, 12]], M.S);
    g.rect(9, 4, 8, 7, M.P);
    const dbl = R.chance(0.6);
    if (dbl) { g.rect(17, 4, 12, 2, M.A); g.rect(17, 7, 12, 2, M.A); g.rect(17, 6, 12, 1, M.D); }
    else g.rect(17, 4, 12, 5, M.A);
    g.rect(29, 3, 2, 7, M.A);
    g.rect(18, 9, 8, 3, M.S); for (const x of [19, 21, 23, 25]) g.set(x, 10, M.D);
    g.poly([[11, 11], [14, 11], [13, 15], [10, 15]], M.D);
    g.set(4, 7, M.G); g.set(6, 7, M.G); g.rect(11, 6, 4, 2, M.G);
    return { x0: 1, x1: 30, y0: 4, y1: 11 };
  },
  sniper(g, r, R) { // very long thin barrel, big scope, bipod
    g.poly([[1, 7], [8, 6], [8, 10], [4, 10], [1, 12]], M.S); g.rect(3, 5, 4, 1, M.S);
    g.rect(8, 6, 9, 4, M.P);
    g.rect(17, 7, 13, 1, M.A); g.rect(29, 6, 2, 3, M.A);
    g.rect(9, 1, 11, 3, M.D); g.rect(8, 1, 1, 3, M.G); g.rect(20, 1, 1, 3, M.G); g.set(11, 4, M.A); g.set(17, 4, M.A); g.set(9, 1, M.W);
    g.line(22, 8, 20, 13, M.A); g.line(23, 8, 25, 13, M.A);
    g.poly([[10, 10], [13, 10], [12, 14], [9, 14]], M.D);
    g.rect(10, 7, 4, 1, M.G);
    return { x0: 1, x1: 30, y0: 1, y1: 10 };
  },
  railgun(g, r, R) { // power cell + forked rails with glowing core
    g.rect(1, 3, 9, 9, M.P); g.rect(3, 5, 5, 4, M.G); g.rect(9, 4, 6, 7, M.S);
    for (const x of [16, 20, 24]) g.rect(x, 2, 2, 11, M.S);
    g.rect(15, 2, 15, 2, M.A); g.rect(15, 11, 15, 2, M.A);
    g.set(30, 4, M.A); g.set(30, 10, M.A);
    g.rect(15, 6, 13, 3, M.G); g.rect(15, 7, 14, 1, M.W);
    g.rect(5, 12, 3, 3, M.D);
    return { x0: 1, x1: 30, y0: 2, y1: 12 };
  },
  launcher(g, r, R) { // big tube with a rocket warhead peeking out
    g.rect(4, 3, 22, 8, M.P); g.rect(1, 2, 3, 10, M.S);
    for (const x of [9, 17]) g.rect(x, 3, 1, 8, M.S);
    const wt = R.int(2);
    if (wt === 0) g.poly([[26, 4], [31, 7], [26, 10]], M.G); else { g.rect(26, 4, 2, 6, M.A); g.poly([[28, 5], [31, 7], [28, 9]], M.G); }
    g.rect(12, 1, 5, 2, M.A); g.set(16, 1, M.G);
    g.rect(10, 11, 2, 4, M.D); g.rect(19, 11, 2, 3, M.D);
    return { x0: 1, x1: 30, y0: 3, y1: 11 };
  },
  beam(g, r, R) { // laser cannon with a big round lens dish
    g.ell(10, 7, 8, 3.6, M.P); g.rect(4, 6, 12, 2, M.G);
    for (let i = 0; i < 4; i++) g.rect(5 + i * 3, 2, 1, 2, M.S);
    g.rect(17, 5, 4, 5, M.A);
    g.ell(25, 7.5, 4.2, 5.4, M.S); g.ell(25.5, 7.5, 2.6, 3.6, M.G); g.set(24, 5, M.W); g.set(25, 5, M.W);
    g.rect(8, 10, 2, 4, M.D);
    return { x0: 2, x1: 29, y0: 2, y1: 12 };
  },
  blade(g, r, R) { // a sword: pommel, wrapped hilt, guard, long blade with a point
    g.ell(2, 7.5, 1.6, 1.6, M.A); g.rect(3, 6, 6, 3, M.D); g.set(5, 6, M.S); g.set(7, 6, M.S); g.set(4, 8, M.S); g.set(6, 8, M.S);
    const gt = R.int(3);
    if (gt === 0) g.rect(9, 2, 2, 11, M.A); else if (gt === 1) g.ell(10, 7.5, 1.6, 4.4, M.A); else g.poly([[9, 1], [12, 5], [12, 10], [9, 14]], M.A);
    const bt = R.int(4);
    if (bt === 0) { g.poly([[12, 5], [27, 5], [31, 7.5], [27, 10], [12, 10]], M.P); g.rect(13, 7, 13, 1, M.S); }
    else if (bt === 1) { for (let x = 12; x <= 30; x++) { const k = (x - 12) / 18; const y = 6 - Math.floor(k * k * 4); g.rect(x, y, 1, x > 28 ? 1 : 3, M.P); } }
    else if (bt === 2) { g.poly([[12, 5], [27, 5], [31, 7.5], [27, 10], [12, 10]], M.G); g.rect(12, 7, 16, 1, M.W); }
    else { g.rect(12, 3, 14, 8, M.P); g.poly([[26, 3], [31, 2], [30, 11], [26, 11]], M.P); g.ell(16, 6, 1.2, 1.2, 0); g.rect(13, 10, 13, 1, M.S); }
    return { x0: 1, x1: 30, y0: 3, y1: 10 };
  },
  throwing(g, r, R) { // shuriken, chakram, boomerang or kunai, drawn big
    const t = R.int(4), cx = 16, cy = 7.5;
    if (t === 0) { const n = R.pick([4, 4, 6]), pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2 + 0.25, rr = i % 2 ? 2.6 : 7.2; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } g.poly(pts, M.P); g.ell(cx, cy, 1.4, 1.4, M.D); g.set(cx, cy, M.A); }
    else if (t === 1) { g.ring(cx, cy, 3.6, 6.6, M.P); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.set(cx + Math.cos(a) * 7.4, cy + Math.sin(a) * 7.4, M.A); } g.ring(cx, cy, 4.4, 5, M.G); }
    else if (t === 2) { g.poly([[5, 2], [16, 10], [27, 2], [29, 5], [16, 14], [3, 5]], M.P); g.line(6, 4, 15, 10, M.S); g.line(26, 4, 17, 10, M.S); g.set(16, 11, M.G); }
    else { g.poly([[9, 7.5], [19, 3], [31, 7.5], [19, 12]], M.A); g.rect(19, 7, 10, 1, M.W); g.rect(3, 7, 6, 2, M.D); g.ring(2, 7.5, 1, 2, M.A); }
    return { x0: 3, x1: 29, y0: 1, y1: 14 };
  },
  mine(g, r, R) { // launcher body with a spiked round mine loaded up front
    g.rect(2, 5, 13, 6, M.P); g.ell(8, 8, 3.6, 3.6, M.S); g.ell(8, 8, 1.2, 1.2, M.A);
    g.rect(15, 5, 4, 6, M.A);
    g.ell(25, 8, 4.2, 4.2, M.D); g.ell(25, 8, 1.6, 1.6, M.G);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.set(25 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, M.A); }
    g.rect(5, 11, 3, 4, M.D);
    return { x0: 2, x1: 30, y0: 3, y1: 13 };
  },
  drone(g, r, R) { // handheld remote + a hovering drone with rotors
    g.rect(1, 8, 12, 7, M.P); g.set(1, 8, 0); g.set(12, 8, 0); g.rect(3, 9, 6, 3, M.G); g.set(11, 10, M.A); g.set(11, 12, M.A);
    g.line(11, 8, 13, 3, M.A); g.set(13, 2, M.G);
    g.ell(23, 7, 5.6, 3.2, M.S); g.ell(24, 7, 1.8, 1.8, M.G); g.set(23, 6, M.W);
    g.rect(15, 1, 6, 1, M.A); g.rect(26, 1, 6, 1, M.A); g.line(19, 2, 20, 5, M.A); g.line(28, 2, 27, 5, M.A);
    g.line(20, 10, 19, 12, M.D); g.line(27, 10, 28, 12, M.D);
    g.set(15, 6, M.G); g.set(16, 5, M.G);
    return { x0: 1, x1: 31, y0: 1, y1: 12 };
  },
};
function embellish(g, r, R, b) {
  const { x0, x1, y0, y1 } = b;
  if (r >= 3) { const n = r - 1; for (let i = 0; i < n; i++) { const x = R.ir(x0 + 3, x1 - 4); if (g.get(x, y0) > 1 && g.get(x, y0 - 1) === 0 && y0 > 1) g.set(x, y0 - 1, M.S); } }
  if (r >= 4) { for (let x = x0 + 3; x < x1 - 6; x += 4) if (g.get(x, y1 - 1) === M.P) g.set(x, y1 - 1, M.A); }
  if (r >= 5) { for (let i = 0; i < 4; i++) { const x = R.ir(x0 + 2, x1 - 2), y = R.ir(y0, y1); if (g.get(x, y) === M.P) g.set(x, y, M.G); } }
  if (r >= 6) { for (let i = 0; i < 3; i++) { const x = R.ir(x0 + 4, x1 - 4); for (let y = y0 - 1; y >= 0; y--) { if (g.get(x, y) === 0) { g.set(x, y, M.G); if (y > 0) g.set(x, y - 1, M.G, 1); break; } } } }
}
// half-size version for the gun in your hand: majority material per 2x2 block, then re-shade and re-outline
function shrinkGrid(src) {
  const w = src.w >> 1, h = src.h >> 1, g = new Spr(w, h); const pri = { 5: 6, 7: 5, 4: 4, 2: 3, 3: 2, 6: 1 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cnt = {}; let n = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const m = src.get(x * 2 + dx, y * 2 + dy); if (m > 1) { cnt[m] = (cnt[m] || 0) + 1; n++; } }
    if (n < 2) continue; let best = 0, bc = -1; for (const m in cnt) { const sc = cnt[m] * 10 + (pri[m] || 0); if (sc > bc) { bc = sc; best = +m; } }
    g.set(x, y, best);
  }
  return g.fin();
}

// ---------- armor / ship / tool generators (16x16) ----------
const AGEN = {
  helmet(g, r, R) {
    g.ell(8, 7.5, 6, 6, M.P);
    const v = R.int(5);
    if (v === 0) g.rect(3, 6, 10, 3, M.G); else if (v === 1) g.ell(8, 7, 3, 2.6, M.G); else if (v === 2) { g.rect(4, 6, 8, 2, M.G); g.rect(7, 8, 2, 3, M.G); } else if (v === 3) g.rect(3, 7, 10, 1, M.G); else g.ell(8, 8, 4.5, 2.6, M.G);
    g.set(5, 6, M.W); g.set(6, 6, M.W);
    g.rect(4, 13, 8, 2, M.A);
    const ex = R.int(4);
    if (ex === 1) { g.line(11, 2, 13, 0, M.A); g.set(13, 0, M.G); } else if (ex === 2) g.rect(7, 0, 2, 3, M.S); else if (ex === 3) { g.rect(1, 6, 2, 3, M.S); g.rect(13, 6, 2, 3, M.S); }
    if (r >= 3) { g.set(3, 2, M.S); g.set(12, 2, M.S); g.set(2, 1, M.S); g.set(13, 1, M.S); }
  },
  chest(g, r, R) {
    g.poly([[3, 3], [13, 3], [12, 13], [4, 13]], M.P);
    g.ell(3, 4, 2.5, 2, M.S); g.ell(13, 4, 2.5, 2, M.S); g.rect(6, 2, 4, 2, M.A);
    const c = R.int(3); if (c === 0) g.ell(8, 7, 1.5, 1.5, M.G); else if (c === 1) { g.line(5, 6, 8, 9, M.G); g.line(11, 6, 8, 9, M.G); } else g.rect(6, 6, 4, 3, M.G);
    g.rect(4, 11, 8, 1, M.D); g.set(8, 11, M.A); if (R.chance(0.5)) g.rect(5, 9, 6, 1, M.S);
    if (r >= 3) { g.set(1, 2, M.A); g.set(15, 2, M.A); }
  },
  boots(g, r, R) {
    const h = R.ir(6, 8); g.rect(4, 10 - h, 5, h, M.P); g.rect(4, 9, 8 + R.int(2), 3, M.P); g.rect(10, 9, 3, 3, M.A);
    g.rect(3, 12, 11, 2, M.D); g.rect(3, 10 - h, 7, 2, M.S); if (R.chance(0.6)) g.rect(4, 6, 5, 1, M.S);
    if (r >= 2) { g.rect(5, 14, 2, 1, M.G); g.rect(10, 14, 2, 1, M.G); }
    if (r >= 4) g.poly([[3, 4], [1, 2], [3, 6]], M.A);
  },
  jetpack(g, r, R) {
    const tw = R.chance(0.7);
    if (tw) { g.ell(4.5, 7, 3, 5.4, M.P); g.ell(11.5, 7, 3, 5.4, M.P); g.rect(6, 3, 4, 8, M.S); }
    else { g.ell(8, 7, 5, 5.5, M.P); g.rect(5, 4, 6, 1, M.S); }
    g.rect(2, 5, 12, 1, M.A);
    g.rect(2, 12, 4, 2, M.A); g.rect(10, 12, 4, 2, M.A); g.rect(3, 14, 2, 2, M.G); g.rect(11, 14, 2, 2, M.G);
    if (r >= 3) { g.poly([[1, 6], [0, 11], [2, 9]], M.S); g.poly([[15, 6], [16, 11], [14, 9]], M.S); }
    g.set(8, 6, M.G);
  },
  o2(g, r, R) {
    g.rect(4, 4, 8, 10, M.P); g.ell(8, 4, 4, 2, M.P); g.ell(8, 13, 4, 1.6, M.P);
    g.rect(7, 0, 2, 3, M.A); g.rect(5, 1, 6, 1, M.A);
    g.ell(8, 7, 2, 2, M.W); g.set(8, 7, M.D); g.set(9, 6, M.D);
    g.rect(4, 10, 8, 1, M.S); g.rect(4, 12, 8, 1, M.S);
    if (R.chance(0.5)) g.rect(5, 4, 1, 3, M.G);
  },
  engine(g, r, R) {
    g.rect(7, 4, 7, 8, M.P); g.rect(12, 3, 2, 10, M.S);
    const n = R.ir(1, 3), ys = n === 1 ? [8] : n === 2 ? [5.5, 10.5] : [4, 8, 12];
    for (const y of ys) { const hh = n === 3 ? 1.5 : 2.2; g.poly([[7, y - hh * 0.6], [3, y - hh], [3, y + hh], [7, y + hh * 0.6]], M.A); g.rect(1, Math.round(y - 1), 2, 2, M.G); g.set(0, Math.round(y), M.G); }
    g.set(10, 7, M.G); g.set(10, 8, M.G);
    if (r >= 3) { g.poly([[9, 4], [12, 0], [13, 4]], M.S); g.poly([[9, 12], [12, 15], [13, 12]], M.S); }
  },
  hull(g, r, R) {
    const n = R.ir(13, 15);
    g.poly([[2, 6], [9, 4], [n, 7.5], [9, 11], [2, 10]], M.P);
    g.ell(9, 7.5, 2, 1.4, M.G); g.set(8, 7, M.W);
    const w = R.int(3);
    if (w === 0) { g.poly([[4, 10], [8, 10], [5, 14], [2, 14]], M.S); g.poly([[4, 6], [8, 5], [5, 1], [2, 1]], M.S); }
    else if (w === 1) { g.poly([[5, 10], [9, 11], [10, 14], [6, 13]], M.S); g.poly([[5, 5], [9, 4], [10, 1], [6, 2]], M.S); }
    else { g.rect(4, 2, 3, 3, M.S); g.rect(4, 11, 3, 3, M.S); }
    g.rect(1, 7, 2, 2, M.A);
  },
  cargo(g, r, R) {
    g.rect(2, 5, 12, 9, M.P); g.rect(5, 5, 1, 9, M.S); g.rect(10, 5, 1, 9, M.S);
    g.set(2, 5, M.A); g.set(13, 5, M.A); g.set(2, 13, M.A); g.set(13, 13, M.A); g.rect(7, 8, 2, 2, M.G);
    if (R.chance(0.6)) { g.rect(4, 1, 8, 4, M.S); g.rect(7, 1, 2, 4, M.P); }
    if (r >= 3) g.rect(2, 9, 12, 1, M.A);
  },
  scanner(g, r, R) {
    g.rect(7, 9, 2, 5, M.A); g.rect(4, 13, 8, 2, M.S);
    for (let x = 2; x <= 13; x++) { const k = (x - 7.5) / 5.5; const y = Math.round(6 + k * k * 3.2); g.set(x, y, M.P); g.set(x, y - 1, M.P); }
    g.line(7, 8, 8, 4, M.A); g.set(8, 3, M.G); g.set(9, 3, M.G);
    if (R.chance(0.6)) { g.set(11, 1, M.G); g.set(12, 2, M.G); g.set(13, 1, M.G); }
  },
  shield(g, r, R) {
    const hex = R.chance(0.5);
    if (hex) { const pts = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; pts.push([8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7]); } g.poly(pts, M.G); const ip = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ip.push([8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5]); } g.poly(ip, 0); }
    else g.ring(8, 8, 5, 7, M.G);
    g.ell(8, 8, 2.5, 2.5, M.P); g.set(8, 8, M.W);
    for (const [x, y] of [[8, 1], [8, 15], [1, 8], [15, 8]]) g.set(x, y, M.A);
  },
  tool(g, r, R) {
    const t = R.int(5);
    if (t === 0) { g.poly([[3, 9], [7, 5], [10, 8], [6, 12]], M.P); g.poly([[7, 5], [10, 8], [14.5, 1.5]], M.A); g.line(9, 5, 10, 6, M.S); g.line(11, 3, 12, 4, M.S); g.poly([[3, 9], [6, 12], [3, 15], [0, 12]], M.D); g.set(6, 8, M.G); }
    else if (t === 1) { g.poly([[2, 11], [8, 5], [11, 8], [5, 14]], M.P); g.ell(12, 4, 2, 2, M.G); g.set(14, 2, M.G); g.set(15, 1, M.W); g.rect(2, 13, 3, 3, M.D); }
    else if (t === 2) { g.line(3, 14, 11, 6, M.D, 0, 2); for (let a = -0.4; a <= 1.9; a += 0.08) g.set(10 + Math.cos(a - 1) * 5.5, 6 + Math.sin(a - 1) * 5.5, M.A); g.set(5, 4, M.A); g.set(15, 10, M.A); }
    else if (t === 3) { g.line(2, 14, 10, 6, M.D, 0, 2); g.poly([[8, 2], [14, 8], [11, 11], [5, 5]], M.A); g.poly([[12, 6], [14, 8], [11, 11], [10, 9]], M.S); }
    else { g.poly([[2, 12], [8, 6], [10, 8], [4, 14]], M.P); g.rect(9, 4, 3, 3, M.A); g.set(13, 3, M.G); g.set(14, 2, M.G); g.set(13, 2, M.G); g.set(15, 1, M.W); }
    if (r >= 3) g.set(5, 10, M.G);
  },
  miner(g, r, R) {
    g.rect(4, 3, 8, 7, M.P); g.rect(5, 5, 6, 2, M.D); g.set(6, 5, M.G); g.set(9, 5, M.G);
    g.poly([[6, 10], [10, 10], [8, 15]], M.A); g.line(8, 0, 8, 2, M.A); g.set(8, 0, M.G);
    g.line(4, 8, 1, 12, M.D); g.line(11, 8, 14, 12, M.D); g.rect(4, 9, 8, 1, M.S);
  },
};
const SKIN_REF = { weapon: ['w', 'blaster', 32, 16], armor: ['a', 'helmet', 16, 16], ship: ['s', 'hull', 16, 16], tool: ['t', 'tool', 16, 16] };

// ---------- cosmetic icon generators (16x16) ----------
const CGEN = {
  eyewear(g, st) {
    const L = (cx, cy, rx, ry, m) => g.ell(cx, cy, rx, ry, m);
    switch (st) {
      case 'AVIATORS': L(4.5, 8, 3, 2.3, M.G); L(11.5, 8, 3, 2.3, M.G); g.rect(7, 6, 2, 1, M.A); g.rect(1, 6, 2, 1, M.A); g.rect(13, 6, 2, 1, M.A); break;
      case 'ROUND SHADES': L(4.5, 8, 2.5, 2.5, M.D); L(11.5, 8, 2.5, 2.5, M.D); g.rect(7, 7, 2, 1, M.A); g.set(3, 7, M.W); g.set(10, 7, M.W); break;
      case 'STAR SHADES': for (const cx of [4.5, 11.5]) { const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? 1.4 : 3.6; pts.push([cx + Math.cos(a) * rr, 8 + Math.sin(a) * rr]); } g.poly(pts, M.P); } g.rect(7, 8, 2, 1, M.A); break;
      case 'PIXEL SHADES': g.rect(1, 6, 14, 2, M.D); g.rect(2, 8, 5, 2, M.D); g.rect(9, 8, 5, 2, M.D); g.set(3, 8, M.W); g.set(10, 8, M.W); break;
      case 'MONOCLE': g.ring(9, 8, 2, 3, M.A); L(9, 8, 1.5, 1.5, M.G); g.line(12, 10, 14, 15, M.A); break;
      case 'GOGGLES': g.rect(0, 7, 16, 2, M.P); g.ring(4.5, 8, 1.5, 3, M.S); g.ring(11.5, 8, 1.5, 3, M.S); L(4.5, 8, 1.4, 1.4, M.G); L(11.5, 8, 1.4, 1.4, M.G); break;
      case 'HEART SHADES': for (const cx of [4, 12]) { L(cx - 1.4, 7, 1.5, 1.5, M.G); L(cx + 1.4, 7, 1.5, 1.5, M.G); g.poly([[cx - 3, 7.5], [cx + 3, 7.5], [cx, 11]], M.G); } g.rect(7, 7, 2, 1, M.A); break;
      case 'VISOR SHADES': g.poly([[1, 6], [15, 6], [14, 10], [2, 10]], M.G); g.rect(3, 7, 4, 1, M.W); break;
      case '3D GLASSES': g.rect(1, 6, 14, 5, M.Wr || M.W); g.rect(2, 7, 5, 3, M.P); g.rect(9, 7, 5, 3, M.G); break;
      case 'CAT EYES': g.poly([[1, 7], [7, 7], [6, 10], [2, 10], [0, 5]], M.P); g.poly([[9, 7], [15, 7], [16, 5], [14, 10], [10, 10]], M.P); g.rect(2, 8, 3, 1, M.G); g.rect(11, 8, 3, 1, M.G); break;
      case 'SPORT SHADES': g.poly([[0, 7], [8, 6], [16, 7], [15, 10], [9, 9], [8, 10], [7, 9], [1, 10]], M.G); g.rect(0, 7, 16, 1, M.P); break;
      default: g.rect(2, 7, 4, 2, M.G); g.rect(10, 7, 4, 2, M.G); g.line(6, 8, 0, 13, M.G); g.line(10, 8, 16, 13, M.G); g.set(4, 8, M.W); g.set(12, 8, M.W);
    }
  },
  headgear(g, st) {
    switch (st) {
      case 'CAP': g.ell(7, 9, 5, 4, M.P); g.rect(2, 9, 12, 4, 0); g.rect(8, 10, 7, 2, M.S); g.set(7, 5, M.A); break;
      case 'CROWN': g.rect(2, 9, 12, 4, M.A); for (const x of [2, 7, 12]) g.poly([[x, 9], [x + 1, 3], [x + 2, 9]], M.A); g.set(5, 11, M.G); g.set(8, 11, M.P); g.set(11, 11, M.G); break;
      case 'ANTENNA': g.rect(6, 12, 4, 2, M.A); g.line(8, 12, 8, 5, M.D); g.ell(8, 4, 2.2, 2.2, M.G); break;
      case 'HALO': g.ring(8, 8, 4, 6, M.G); g.rect(0, 9, 16, 7, 0); g.ring(8, 9, 4, 6, M.G); g.rect(2, 4, 12, 4, 0); break;
      case 'HORNS': g.poly([[2, 13], [5, 13], [3, 6], [0, 3]], M.P); g.poly([[11, 13], [14, 13], [16, 3], [13, 6]], M.P); break;
      case 'MOHAWK': g.rect(3, 12, 10, 2, M.D); for (let i = 0; i < 5; i++) g.poly([[3 + i * 2, 12], [4 + i * 2, 4 + Math.abs(i - 2) * 2], [6 + i * 2, 12]], i % 2 ? M.P : M.S); break;
      case 'TOP HAT': g.rect(1, 12, 14, 2, M.D); g.rect(4, 2, 8, 10, M.D); g.rect(4, 9, 8, 2, M.P); break;
      case 'PROPELLER CAP': g.ell(8, 11, 6, 4, M.P); g.rect(2, 12, 12, 4, 0); g.rect(6, 6, 4, 3, M.S); g.line(8, 6, 8, 3, M.A); g.rect(3, 2, 10, 1, M.G); break;
      case 'BUNNY EARS': g.ell(5, 6, 1.8, 5, M.P); g.ell(11, 6, 1.8, 5, M.P); g.rect(5, 3, 1, 6, M.S); g.rect(11, 3, 1, 6, M.S); g.rect(3, 12, 10, 2, M.A); break;
      case 'CAT EARS': g.poly([[2, 13], [4, 4], [7, 13]], M.P); g.poly([[9, 13], [12, 4], [14, 13]], M.P); g.poly([[4, 12], [4.5, 8], [6, 12]], M.S); g.poly([[10, 12], [11.5, 8], [12, 12]], M.S); break;
      case 'PARTY HAT': g.poly([[3, 14], [8, 1], [13, 14]], M.P); g.line(5, 10, 10, 6, M.S); g.line(6, 13, 11, 9, M.S); g.ell(8, 1.5, 1.4, 1.4, M.G); break;
      case 'WIZARD HAT': g.rect(1, 12, 14, 2, M.P); g.poly([[3, 12], [6, 2], [9, 1], [13, 12]], M.P); g.set(7, 7, M.G); g.set(10, 9, M.G); g.set(6, 10, M.G); break;
      case 'FLOWER': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.ell(8 + Math.cos(a) * 3.6, 8 + Math.sin(a) * 3.6, 2, 2, M.P); } g.ell(8, 8, 2, 2, M.G); break;
      case 'BANDANA': g.rect(1, 7, 14, 4, M.P); for (let x = 2; x < 14; x += 3) g.set(x, 8, M.W); g.poly([[14, 9], [16, 13], [13, 12]], M.P); break;
      case 'BEANIE': g.ell(8, 10, 6, 5, M.P); g.rect(2, 11, 12, 5, 0); g.rect(2, 10, 12, 2, M.S); g.ell(8, 4, 1.8, 1.8, M.G); break;
      default: g.rect(4, 10, 8, 3, M.W); g.ell(5, 6, 3, 3, M.W); g.ell(11, 6, 3, 3, M.W); g.ell(8, 5, 3, 3, M.W); g.rect(4, 12, 8, 1, M.S);
    }
  },
  back(g, st) {
    switch (st) {
      case 'CAPE': g.poly([[5, 1], [11, 1], [14, 15], [2, 15]], M.P); g.line(6, 4, 4, 14, M.S); g.line(10, 4, 12, 14, M.S); g.rect(5, 1, 6, 2, M.A); break;
      case 'WINGS': for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.poly([[8, 5 + i], [8 + s * (7 - i), 2 + i * 3], [8 + s * (5 - i), 4 + i * 3]], i % 2 ? M.P : M.S); break;
      case 'MECH WINGS': g.poly([[7, 7], [0, 2], [2, 6], [0, 9], [3, 11]], M.A); g.poly([[9, 7], [16, 2], [14, 6], [16, 9], [13, 11]], M.A); g.line(1, 3, 6, 7, M.G); g.line(15, 3, 10, 7, M.G); g.rect(6, 5, 4, 5, M.P); break;
      case 'BANNER': g.line(4, 1, 4, 15, M.A); g.poly([[5, 1], [14, 2], [12, 5], [14, 8], [5, 8]], M.P); g.set(8, 4, M.G); break;
      case 'BACKPACK': g.rect(3, 3, 10, 11, M.P); g.rect(4, 8, 8, 4, M.S); g.rect(5, 2, 6, 1, M.A); g.set(8, 10, M.A); break;
      case 'BAT WINGS': for (const s of [-1, 1]) g.poly([[8, 6], [8 + s * 8, 2], [8 + s * 7, 8], [8 + s * 5, 7], [8 + s * 4, 10], [8 + s * 2, 9]], M.D); g.set(2, 3, M.P); g.set(13, 3, M.P); break;
      case 'FAIRY WINGS': g.ell(4, 5, 3.6, 4, M.G); g.ell(12, 5, 3.6, 4, M.G); g.ell(5, 11, 2.4, 3, M.G); g.ell(11, 11, 2.4, 3, M.G); g.rect(7, 4, 2, 9, M.P); break;
      case 'SOLAR PANELS': g.rect(0, 4, 6, 8, M.G); g.rect(10, 4, 6, 8, M.G); g.rect(6, 7, 4, 2, M.A); for (const x of [2, 4, 12, 14]) g.rect(x, 4, 1, 8, M.D); g.rect(0, 8, 16, 1, M.D); g.rect(6, 7, 4, 2, M.A); break;
      case 'ROCKET FINS': g.poly([[6, 3], [1, 14], [6, 11]], M.P); g.poly([[10, 3], [15, 14], [10, 11]], M.P); g.rect(6, 2, 4, 11, M.S); g.rect(7, 13, 2, 2, M.G); break;
      default: g.ell(6, 10, 4, 4, M.P); g.line(9, 7, 15, 1, M.D); g.ell(6, 10, 1.4, 1.4, M.D); g.rect(13, 0, 3, 2, M.A);
    }
  },
  trail(g, st, R) {
    const pts = [[2, 13], [5, 10], [8, 8], [11, 5], [14, 2]];
    pts.forEach(([x, y], i) => {
      const m = i % 2 ? M.P : M.G;
      switch (st) {
        case 'BUBBLES': g.ring(x, y, i * 0.2 + 0.5, i * 0.25 + 1.4, M.G); break;
        case 'HEARTS': g.set(x - 1, y, m); g.set(x + 1, y, m); g.rect(x - 1, y + 1, 3, 1, m); g.set(x, y + 2, m); break;
        case 'PIXELS': g.rect(x - 1, y - 1, 2, 2, m); break;
        case 'NOTES': g.rect(x, y - 3, 1, 4, M.D); g.rect(x - 1, y, 2, 2, m); break;
        case 'BOLTS': g.line(x, y - 2, x - 1, y, M.G); g.line(x - 1, y, x + 1, y + 1, M.G); break;
        case 'FLAMES': g.ell(x, y, 1.5, 2, i % 2 ? M.G : M.P); break;
        case 'SNOW': g.set(x, y, M.W); g.set(x - 1, y, M.W); g.set(x + 1, y, M.W); g.set(x, y - 1, M.W); g.set(x, y + 1, M.W); break;
        case 'LEAVES': g.ell(x, y, 1.5, 1, m); break;
        case 'RAINBOW': g.rect(x - 1, y - 1, 3, 3, [M.P, M.S, M.G, M.A, M.W][i]); break;
        case 'SMOKE': g.ell(x, y, 1.5 + i * 0.3, 1.5 + i * 0.3, M.D); break;
        default: g.set(x, y, M.W); g.set(x - 1, y, m); g.set(x + 1, y, m); g.set(x, y - 1, m); g.set(x, y + 1, m);
      }
    });
  },
  killfx(g, st, R) {
    switch (st) {
      case 'CONFETTI': for (let i = 0; i < 14; i++) g.rect(R.ir(1, 13), R.ir(1, 13), 2, 1, [M.P, M.S, M.G, M.A][i % 4]); break;
      case 'PIXEL POP': for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.rect(8 + Math.cos(a) * 5 - 1, 8 + Math.sin(a) * 5 - 1, 2, 2, i % 2 ? M.G : M.P); } g.rect(7, 7, 2, 2, M.W); break;
      case 'GHOSTS': g.ell(8, 7, 5, 5, M.W); g.rect(3, 7, 11, 6, M.W); for (const x of [3, 7, 11]) g.set(x + 1, 13, 0); g.rect(5, 6, 2, 2, M.D); g.rect(9, 6, 2, 2, M.D); break;
      case 'COIN BURST': for (const [x, y] of [[4, 4], [11, 3], [8, 9], [3, 11], [12, 11]]) { g.ell(x, y, 2, 2, M.A); g.set(x, y, M.G); } break;
      case 'SKULLS': g.ell(8, 7, 5, 4.5, M.W); g.rect(5, 11, 6, 3, M.W); g.rect(5, 6, 2, 2, M.D); g.rect(9, 6, 2, 2, M.D); g.set(8, 9, M.D); g.set(7, 13, M.D); g.set(9, 13, M.D); break;
      case 'FLOWERS': for (const [x, y] of [[5, 5], [11, 9]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.ell(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.2, 1.2, M.P); } g.set(x, y, M.G); } break;
      case 'BLACK HOLE': g.ell(8, 8, 7, 3, M.G); g.ell(8, 8, 3.5, 3.5, M.D); g.rect(7, 7, 2, 2, M.D); break;
      case 'FIREWORKS': for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.line(8 + Math.cos(a) * 2, 8 + Math.sin(a) * 2, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, i % 2 ? M.G : M.P); } break;
      case 'SHOCKWAVE': g.ring(8, 8, 6, 7, M.G); g.ring(8, 8, 3, 4, M.P); g.set(8, 8, M.W); break;
      case 'GLITCH': for (let y = 2; y < 14; y += 2) g.rect(R.ir(0, 6), y, R.ir(4, 9), 1, [M.G, M.P, M.S][y % 3]); break;
      case 'HEARTS': g.ell(5.5, 6, 3, 3, M.P); g.ell(10.5, 6, 3, 3, M.P); g.poly([[2.5, 7], [13.5, 7], [8, 14]], M.P); g.set(5, 5, M.W); break;
      default: for (let i = 0; i < 5; i++) { const pts = []; const cx = [8, 3, 13, 4, 12][i], cy = [8, 3, 4, 13, 12][i], s = i ? 1.5 : 3.5; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } g.poly(pts, i ? M.G : M.P); }
    }
  },
};

// ---------- crates (32x28) ----------
const EMBLEM = {
  weapon: '..#..|.###.|##.##|#...#|##.##|.###.|..#..', armor: '.###.|#####|#.#.#|#####|.###.|.#.#.|.....', ship: '..#..|.###.|.#.#.|.###.|#####|#.#.#|..#..',
  mining: '.###.|#.#.#|..#..|..#..|..#..|..#..|.....', skin: '..#..|..#..|.###.|#####|#####|.###.|.....', cosmetic: '.....|##.##|##.##|#####|.#.#.|.....|.....',
  galaxy: '.###.|#...#|#.#.#|#.#.#|..#.#|###.#|.....', salvage: '.###.|#.#.#|##..#|#..##|.###.|.....|.....', boss: '.###.|#####|#.#.#|#####|.###.|.#.#.|.....',
  finisher: '.##..|.##.#|#####|#####|.##..|.##..|.....', choice: '.....|.....|#.#.#|.....|.....|.....|.....', class: '#...#|.#.#.|..#..|.#.#.|#...#|.....|.....',
  backdrop: '#####|#...#|#.#.#|##.##|#####|.....|.....',
  gadget: '..#..|.###.|##.##|.###.|..#..|.#.#.|.....', pet: '#...#|##.##|#####|#.#.#|.###.|.....|.....',
};
function crateSprite(tier, kind, frame = 0) {
  const g = new Spr(32, 28), R = RNG(tier * 97 + 13);
  const T = TIERS[tier];
  // lid + body
  g.rect(1, 2, 30, 8, M.P); g.rect(2, 10, 28, 16, M.P);
  g.rect(1, 9, 30, 1, M.D, -1);
  g.rect(8, 2, 2, 24, M.S); g.rect(22, 2, 2, 24, M.S);
  for (const [x, y] of [[1, 2], [28, 2], [2, 23], [27, 23]]) g.rect(x, y, 3, 3, M.A);
  g.rect(13, 7, 6, 6, M.A); g.rect(15, 9, 2, 2, M.D); g.set(15, 11, M.D);
  const em = EMBLEM[kind] || EMBLEM.weapon; em.split('|').forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') g.set(14 + x, 15 + y, M.G); });
  // tier flavor
  if (tier === 0) { for (let i = 0; i < 26; i++) { const x = R.ir(2, 29), y = R.ir(3, 25); if (g.get(x, y) === M.P) g.set(x, y, M.D, 1); } g.line(4, 12, 7, 18, M.D); g.line(25, 13, 27, 20, M.D); }
  if (tier === 1) { for (let x = 2; x < 30; x++) if (R.chance(0.5)) g.set(x, 2, M.W); g.line(3, 13, 7, 22, M.G); g.line(25, 12, 28, 20, M.G); }
  if (tier === 2) { g.line(3, 11, 6, 17, M.G); g.line(6, 17, 4, 23, M.G); g.line(26, 11, 28, 16, M.G); g.line(11, 3, 12, 8, M.G); g.line(27, 4, 25, 8, M.G); }
  if (tier === 3) { const nz = makeNoise(5); for (let y = 2; y < 26; y++) for (let x = 2; x < 30; x++) if (g.get(x, y) === M.P && nz.fbm(x * 0.15, y * 0.15) > 0.55) g.set(x, y, M.S, 1); }
  if (tier === 4) { g.rect(2, 13, 28, 1, M.G); g.rect(2, 20, 28, 1, M.G); g.rect(4, 4, 3, 3, M.G); g.rect(25, 4, 3, 3, M.G); }
  if (tier === 5) { g.rect(2, 2, 28, 1, M.W); for (let y = 11; y < 25; y += 3) { g.set(4, y, M.G); g.set(27, y, M.G); } g.rect(11, 13, 10, 1, M.A); }
  if (tier === 6) { g.ring(16, 18, 4, 5, M.G); g.rect(11, 14, 10, 10, 0); g.rect(11, 14, 10, 10, M.D); g.rect(13, 15, 6, 7, M.G); }
  if (tier === 7) { for (let y = 2; y < 26; y++) for (let x = 2; x < 30; x++) if (g.get(x, y) === M.P && ((x + y + frame) % 6 < 2)) g.set(x, y, M.S, 1); }
  // re-stamp emblem
  em.split('|').forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') g.set(14 + x, 15 + y, M.G, 1); });
  g.fin();
  let pal;
  const th = tier === 7 ? (frame * 45) % 360 : T.h;
  if (tier === 0) pal = makePal(28, 0.28, 0.42, { h2: 22, gh: 40, gs: 0.6, A: METALS.bronze() });
  else if (tier === 1) pal = makePal(198, 0.5, 0.62, { h2: 210, gh: 190, A: METALS.steel() });
  else if (tier === 2) pal = makePal(15, 0.2, 0.26, { h2: 10, gh: 22, A: METALS.chrome() });
  else if (tier === 3) pal = makePal(285, 0.5, 0.38, { h2: 325, gh: 300, l2: 0.6, A: METALS.pearl() });
  else if (tier === 4) pal = makePal(225, 0.6, 0.26, { h2: 205, gh: 185, A: METALS.steel() });
  else if (tier === 5) pal = makePal(46, 0.5, 0.76, { h2: 40, gh: 50, gl: 0.75, A: METALS.gold() });
  else if (tier === 6) pal = makePal(265, 0.3, 0.1, { h2: 270, gh: 280, A: METALS.black() });
  else pal = makePal(th, 0.8, 0.55, { h2: th + 120, gh: th + 60, A: METALS.pearl() });
  return renderSpr(g, pal);
}
const _crateCache = new Map();
function getCrate(tier, kind) {
  const f = tier === 7 ? Math.floor(T_NOW * 8) % 8 : 0;
  const k = tier + '|' + kind + '|' + f;
  let c = _crateCache.get(k); if (!c) { c = crateSprite(tier, kind, f); _crateCache.set(k, c); }
  return c;
}
