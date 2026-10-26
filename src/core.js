'use strict';
// ===== CORE: canvas, input, math, rng, color, font, drawing, particles =====
const W = 480, H = 270, TAU = Math.PI * 2;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d', { alpha: false });
cvs.width = W; cvs.height = H;
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = Math.min(vw / W, vh / H);
  const si = Math.floor(s);
  if (si >= 2 && si / s > 0.8) s = si;
  cvs.style.width = Math.floor(W * s) + 'px';
  cvs.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fitCanvas); fitCanvas();

// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const ang = (a, b, c, d) => Math.atan2(d - b, c - a);
const fl = Math.floor;
const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  io: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
};
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

// ---------- rng ----------
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
function RNG(seed) {
  let a = (seed >>> 0) || 1;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.int = n => Math.floor(f() * n);
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.ir = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.wpick = (arr, wts) => { let s = 0; for (const w of wts) s += w; let r = f() * s; for (let i = 0; i < arr.length; i++) { r -= wts[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return f;
}
const R0 = RNG(Date.now() & 0xffffffff); // gameplay randomness

// ---------- color ----------
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function towardHue(h, t, a) { const d = ((t - h + 540) % 360) - 180; return h + d * a; }
// 5-step hue-shifted ramp: shadows drift blue/purple, highlights drift warm
function ramp(h, s, l) {
  return [
    hsl(towardHue(h, 255, 0.35), s * 0.85, l * 0.36),
    hsl(towardHue(h, 255, 0.17), s * 0.95, l * 0.66),
    hsl(h, s, l),
    hsl(towardHue(h, 55, 0.14), s * 0.95, l + (1 - l) * 0.38),
    hsl(towardHue(h, 55, 0.28), s * 0.75, l + (1 - l) * 0.72),
  ];
}
function rainbow(t, off = 0, s = 0.85, l = 0.72) { return hex(hsl((t * 120 + off) % 360, s, l)); }

// ---------- dithering ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const dith = (x, y, v) => v > BAYER[((y & 3) << 2) + (x & 3)];

// ---------- noise ----------
function makeNoise(seed) {
  const r = RNG(seed), perm = new Uint16Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { vals[i] = r(); perm[i] = i; }
  for (let i = 255; i > 0; i--) { const j = r.int(i + 1); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const lat = (ix, iy) => vals[perm[(ix & 255) + perm[iy & 255]]];
  function n2(x, y, px) {
    let ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    let ix1 = ix + 1;
    if (px) { ix = ((ix % px) + px) % px; ix1 = ((ix1 % px) + px) % px; }
    return lerp(lerp(lat(ix, iy), lat(ix1, iy), u), lerp(lat(ix, iy + 1), lat(ix1, iy + 1), u), v);
  }
  function fbm(x, y, oct = 4, px) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f, px ? px * f : 0); n += a; a *= 0.5; f *= 2; }
    return s / n;
  }
  return { n2, fbm };
}

// ---------- offscreen ----------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; c.x = x; return c; }

// ---------- drawing ----------
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h)); }
function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
function line(x0, y0, x1, y1, c, g = ctx) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  g.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  while (n++ < 2000) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function circ(cx, cy, r, c, g = ctx) {
  g.fillStyle = c; cx = Math.floor(cx); cy = Math.floor(cy);
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
function ring(cx, cy, r, c, g = ctx) {
  g.fillStyle = c; cx = Math.floor(cx); cy = Math.floor(cy);
  const n = Math.max(12, Math.floor(r * 6));
  let lx = null, ly = null;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r); if (x !== lx || y !== ly) g.fillRect(x, y, 1, 1); lx = x; ly = y; }
}
function ellipse(cx, cy, rx, ry, c, g = ctx) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5)))); g.fillRect(Math.floor(cx - w), Math.floor(cy + y), w * 2 + 1, 1); }
}
function shadow(cx, cy, rx, ry, a = 0.35) { ctx.globalAlpha = a; ellipse(cx, cy, rx, ry, '#000'); ctx.globalAlpha = 1; }
function blit(img, x, y, s = 1) { ctx.drawImage(img, Math.floor(x), Math.floor(y), img.width * s, img.height * s); }

// ---------- bitmap fonts ----------
const FONT_B_DEF = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###', J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '.#.|##.|.#.|.#.|.#.|.#.|###',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.|.|.|.|.|.|#', ',': '.|.|.|.|.|#|#', '!': '#|#|#|#|#|.|#', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ':': '.|#|.|.|.|#|.', '-': '....|....|....|####|....|....|....', '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....', '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '(': '.#|#.|#.|#.|#.|#.|.#', ')': '#.|.#|.#|.#|.#|.#|#.', "'": '#|#|.|.|.|.|.', '"': '#.#|#.#|...|...|...|...|...',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '=': '.....|.....|#####|.....|#####|.....|.....', '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '_': '.....|.....|.....|.....|.....|.....|#####', '[': '##|#.|#.|#.|#.|#.|##', ']': '##|.#|.#|.#|.#|.#|##',
  '#': '.#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.', '&': '.##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#',
  '^': '..#..|.#.#.|#...#|.....|.....|.....|.....', '~': '.....|.....|.#...|#.#.#|...#.|.....|.....',
  '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.####',
};
const FONT_S_DEF = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
  4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
  8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  '.': '.|.|.|.|#', ':': '.|#|.|#|.', '-': '...|...|###|...|...', '+': '...|.#.|###|.#.|...', '/': '..#|..#|.#.|#..|#..',
  '%': '#.#|..#|.#.|#..|#.#', '!': '#|#|#|.|#', '?': '##.|..#|.#.|...|.#.', '(': '.#|#.|#.|#.|.#', ')': '#.|.#|.#|.#|#.',
  "'": '#|#|.|.|.', ',': '.|.|.|#|#', '<': '..#|.#.|#..|.#.|..#', '>': '#..|.#.|..#|.#.|#..', '=': '...|###|...|###|...',
  '*': '...|#.#|.#.|#.#|...', '#': '#.#|###|#.#|###|#.#', '&': '.#.|#.#|.#.|#.#|.##', '[': '##|#.|#.|#.|##', ']': '##|.#|.#|.#|##',
  '@': '###|#.#|#.#|#..|.##', '_': '...|...|...|...|###',
};
function buildFont(def, h, spaceW) {
  const g = {}; let x = 0;
  for (const ch in def) { const rows = def[ch].split('|'); g[ch] = { w: rows[0].length, rows, sx: x }; x += rows[0].length + 1; }
  const atlas = mkCanvas(x, h);
  atlas.x.fillStyle = '#fff';
  for (const ch in g) { const gl = g[ch]; gl.rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') atlas.x.fillRect(gl.sx + i, y, 1, 1); }); }
  return { g, atlas, h, spaceW, tints: new Map() };
}
const FB = buildFont(FONT_B_DEF, 7, 3), FS = buildFont(FONT_S_DEF, 5, 2);
function fontTint(f, col) {
  let t = f.tints.get(col);
  if (!t) {
    t = mkCanvas(f.atlas.width, f.atlas.height);
    t.x.drawImage(f.atlas, 0, 0); t.x.globalCompositeOperation = 'source-in'; t.x.fillStyle = col; t.x.fillRect(0, 0, t.width, t.height);
    f.tints.set(col, t); if (f.tints.size > 400) f.tints.delete(f.tints.keys().next().value);
  }
  return t;
}
function textW(s, f = FB, sc = 1) {
  s = String(s).toUpperCase(); let w = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === ' ') w += f.spaceW + 1; else { const g = f.g[c] || f.g['?']; w += g.w + 1; } }
  return Math.max(0, w - 1) * sc;
}
// align: 0 left, 1 center, 2 right
function text(s, x, y, col = '#fff', f = FB, align = 0, sc = 1, g = ctx) {
  s = String(s).toUpperCase();
  if (align) x -= align === 1 ? Math.floor(textW(s, f, sc) / 2) : textW(s, f, sc);
  x = Math.floor(x); y = Math.floor(y);
  const rb = col === 'RAINBOW';
  let atlas = rb ? null : fontTint(f, col);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === ' ') { x += (f.spaceW + 1) * sc; continue; }
    const gl = f.g[c] || f.g['?'];
    if (rb) atlas = fontTint(f, rainbow(T_NOW * 1.5, i * 25));
    g.drawImage(atlas, gl.sx, 0, gl.w, f.h, x, y, gl.w * sc, f.h * sc);
    x += (gl.w + 1) * sc;
  }
  return x;
}
function textS(s, x, y, col = '#fff', sh = '#000', f = FB, align = 0, sc = 1) {
  text(s, x + sc, y + sc, sh, f, align, sc); return text(s, x, y, col, f, align, sc);
}
function textO(s, x, y, col, oc = '#000', f = FB, align = 0, sc = 1) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) text(s, x + dx * sc, y + dy * sc, oc, f, align, sc);
  return text(s, x, y, col, f, align, sc);
}
function wrap(s, maxW, f = FB) {
  const words = String(s).toUpperCase().split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t, f) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function fmt(n) {
  n = Math.floor(n);
  if (n < 0) return '-' + fmt(-n);
  if (n < 100000) return n.toLocaleString('en-US');
  if (n < 1e6) return (n / 1e3).toFixed(0) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1) + 'M';
  return (n / 1e9).toFixed(2) + 'B';
}

// ---------- input ----------
const TOUCH = new Map();
const IN = { mx: W / 2, my: H / 2, down: false, pr: false, rl: false, rdown: false, rpr: false, rrl: false, wheel: 0, keys: new Set(), kp: new Set(), used: false, touch: false, dragX: 0, dragY: 0, lastX: 0, lastY: 0, cursor: 'default' };
function evPos(e) { const r = cvs.getBoundingClientRect(); IN.mx = (e.clientX - r.left) / r.width * W; IN.my = (e.clientY - r.top) / r.height * H; }
function tpos(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
cvs.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { const [x, y] = tpos(e); TOUCH.set(e.pointerId, { x, y, sx: x, sy: y, t: performance.now(), tap: true }); } });
cvs.addEventListener('pointermove', e => { if (e.pointerType === 'touch' && TOUCH.has(e.pointerId)) { const t = TOUCH.get(e.pointerId); const [x, y] = tpos(e); t.x = x; t.y = y; if (Math.hypot(x - t.sx, y - t.sy) > 6) t.tap = false; } });
addEventListener('pointerup', e => { if (e.pointerType === 'touch') TOUCH.delete(e.pointerId); });
addEventListener('pointercancel', e => { if (e.pointerType === 'touch') TOUCH.delete(e.pointerId); });
cvs.addEventListener('pointermove', e => { evPos(e); if (IN.down) { IN.dragX += IN.mx - IN.lastX; IN.dragY += IN.my - IN.lastY; } IN.lastX = IN.mx; IN.lastY = IN.my; });
cvs.addEventListener('pointerdown', e => {
  evPos(e); IN.lastX = IN.mx; IN.lastY = IN.my; IN.dragX = 0; IN.dragY = 0;
  try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  cvs.focus();
  if (e.button === 2) { IN.rdown = true; IN.rpr = true; } else { IN.down = true; IN.pr = true; }
  IN.touch = e.pointerType === 'touch';
  if (typeof SND !== 'undefined') SND.unlock();
  e.preventDefault();
});
addEventListener('pointerup', e => { if (e.button === 2) { if (IN.rdown) IN.rrl = true; IN.rdown = false; } else { if (IN.down) IN.rl = true; IN.down = false; } });
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('wheel', e => { IN.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') { if (['Enter', 'NumpadEnter', 'Escape', 'Tab'].includes(e.code)) IN.kp.add(e.code); if (typeof SND !== 'undefined') SND.unlock(); return; } // typing in a text box
  if (!IN.keys.has(e.code)) IN.kp.add(e.code);
  IN.keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (typeof SND !== 'undefined') SND.unlock();
});
addEventListener('keyup', e => IN.keys.delete(e.code));
addEventListener('blur', () => { IN.keys.clear(); IN.down = false; IN.rdown = false; });
const key = c => IN.keys.has(c);
const kp = c => IN.kp.has(c);
function endInput() { IN.pr = IN.rl = IN.rpr = IN.rrl = false; IN.wheel = 0; IN.kp.clear(); IN.used = false; }
const inBox = (x, y, w, h) => IN.mx >= x && IN.my >= y && IN.mx < x + w && IN.my < y + h;
function clickIn(x, y, w, h) { if (!IN.used && IN.pr && inBox(x, y, w, h)) { IN.used = true; return true; } return false; }

// ---------- time & fx ----------
let T_NOW = 0;
const FX = { shake: 0, flash: 0, flashCol: '#fff', hitstop: 0, slowmo: 0 };
function shake(v) { FX.shake = Math.max(FX.shake, v); }
function flash(v, c = '#fff') { FX.flash = Math.max(FX.flash, v); FX.flashCol = c; }

// ---------- particles ----------
const PAT_CACHE = {};
class Particles {
  constructor(max = 1400) { this.a = []; this.max = max; }
  add(p) { if (this.a.length >= this.max) this.a.shift(); p.life = p.life ?? 0.6; p.max = p.life; p.drag = p.drag ?? 0; p.vx = p.vx || 0; p.vy = p.vy || 0; this.a.push(p); return p; }
  burst(x, y, n, opt) {
    for (let i = 0; i < n; i++) {
      const a = opt.ang !== undefined ? opt.ang + (R0() - 0.5) * (opt.spread ?? TAU) : R0() * TAU;
      const sp = (opt.sp ?? 60) * (0.35 + R0() * 0.9);
      const c = Array.isArray(opt.c) ? opt.c[R0.int(opt.c.length)] : opt.c;
      this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (opt.life ?? 0.5) * (0.6 + R0() * 0.8), c, s: opt.s ?? 1, g: opt.g ?? 0, drag: opt.drag ?? 2.5, t: opt.t || 'px', z: opt.z || 0 });
    }
  }
  text(x, y, s, c, opt = {}) { this.add({ x, y, vx: opt.vx ?? 0, vy: opt.vy ?? -30, life: opt.life ?? 0.8, c, s: opt.sc || 1, txt: String(s), t: 'txt', drag: 3, f: opt.f || FS, oc: opt.oc || '#000' }); }
  update(dt) {
    const a = this.a; let j = 0;
    for (let i = 0; i < a.length; i++) {
      const p = a[i]; p.life -= dt;
      if (p.life <= 0) continue;
      p.vx -= p.vx * Math.min(1, p.drag * dt); p.vy -= p.vy * Math.min(1, p.drag * dt);
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.fn) p.fn(p, dt);
      a[j++] = p;
    }
    a.length = j;
  }
  draw(ox = 0, oy = 0) {
    for (const p of this.a) {
      const k = p.life / p.max, x = Math.floor(p.x - ox), y = Math.floor(p.y - oy);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      if (p.t === 'txt') { textO(p.txt, x, y, p.c, p.oc, p.f, 1, p.s); continue; }
      if (p.t === 'ring') { ctx.globalAlpha = k; ring(x, y, Math.floor((1 - k) * p.s + 2), p.c); ctx.globalAlpha = 1; continue; }
      if (p.t === 'spark') { const L = 3; line(x, y, x - p.vx * 0.02 * L, y - p.vy * 0.02 * L, p.c); continue; }
      if (p.t === 'pat') { const rows = PAT_CACHE[p.pat] || (PAT_CACHE[p.pat] = p.pat.split('|')); ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = p.c; const x0 = x - (rows[0].length >> 1), y0 = y - (rows.length >> 1); for (let r = 0; r < rows.length; r++) for (let c2 = 0; c2 < rows[r].length; c2++) if (rows[r][c2] === '#') ctx.fillRect(x0 + c2, y0 + r, 1, 1); ctx.globalAlpha = 1; continue; }
      if (p.t === 'puff') { ctx.globalAlpha = k * 0.7; const rr = Math.floor(p.s + (1 - k) * 4); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; continue; }
      const s = p.t === 'shrink' ? Math.max(1, Math.ceil(p.s * k)) : p.s;
      if (p.t === 'fade') ctx.globalAlpha = k;
      ctx.fillStyle = p.c; ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- small UI primitives ----------
// palette built from the player's picks: black, navy (#14213d #1e2749 #273469 #231942), periwinkle/violet (#7161ef #957fef #b79ced),
// pinks (#be95c4 #e0b1cb #dec0f1), cream (#efd9ce #fafaff) and the gold pop (#fca311)
const COL = {
  void0: '#000000', void1: '#0e1630', void2: '#14213d', void3: '#1e2749', steel: '#273469', line: '#5e548e',
  ink: '#fafaff', dim: '#b7a9d9', mute: '#6a62a0', cyan: '#957fef', mint: '#dec0f1', gold: '#fca311', coral: '#f25f7a',
  magenta: '#e0b1cb', orange: '#fca311', glass: '#b79ced', pink: '#e0b1cb', pinkD: '#be95c4', blue: '#7161ef', blueL: '#957fef',
  cream: '#efd9ce', navy: '#14213d', lilac: '#dec0f1', plum: '#231942', mauve: '#5e548e',
};
function panel(x, y, w, h, opt = {}) {
  x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
  const bg = opt.bg || COL.void1, bd = opt.bd || COL.steel;
  rect(x + 1, y, w - 2, h, bg); rect(x, y + 1, w, h - 2, bg);
  rect(x + 1, y, w - 2, 1, bd); rect(x + 1, y + h - 1, w - 2, 1, bd); rect(x, y + 1, 1, h - 2, bd); rect(x + w - 1, y + 1, 1, h - 2, bd);
  if (!opt.flat && h > 6) { rect(x + 1, y + 1, w - 2, 1, opt.hi || 'rgba(239,217,206,0.08)'); rect(x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,0.3)'); }
  if (opt.notch) { const c = opt.notchCol || COL.gold; for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) { rect(Math.min(cx, cx + sx * 4), cy, 5, 1, c); rect(cx, Math.min(cy, cy + sy * 4), 1, 5, c); } }
}
// immediate-mode button. returns true when clicked. kinds: primary (pink), blue, cream, danger, outline, default
const BTN_KIND = {
  primary: { bg: '#fca311', hov: '#ffb83f', pr: '#d9860a', bd: '#ffe2a8', tc: '#14213d' },
  blue: { bg: '#7161ef', hov: '#8577ff', pr: '#5a4bd0', bd: '#c9c0ff', tc: '#fafaff' },
  cream: { bg: '#efd9ce', hov: '#fafaff', pr: '#d6bfb2', bd: '#ffffff', tc: '#14213d' },
  danger: { bg: '#3a1430', hov: '#521c42', pr: '#26091f', bd: '#f25f7a', tc: '#ff9fb2' },
  outline: { bg: '#14213d', hov: '#1e2749', pr: '#0e1630', bd: '#e0b1cb', tc: '#e0b1cb' },
  def: { bg: '#14213d', hov: '#1e2749', pr: '#0e1630', bd: '#273469', tc: '#fafaff' },
  don: { bg: '#d63a8c', hov: '#f04fa3', pr: '#a8286a', bd: '#ffd1ea', tc: '#ffffff' },
};
function button(x, y, w, h, label, opt = {}) {
  x = Math.floor(x); y = Math.floor(y);
  const hov = inBox(x, y, w, h) && !opt.disabled;
  const press = hov && IN.down;
  let kind = opt.kind;
  if (!kind) kind = opt.tc === COL.mint ? 'primary' : opt.tc === COL.magenta ? 'outline' : opt.tc === COL.gold ? 'cream' : opt.tc === COL.coral ? 'danger' : opt.tc === COL.cyan ? 'blue' : 'def';
  const K = BTN_KIND[kind];
  if (opt.disabled) panel(x, y, w, h, { bg: COL.void1, bd: COL.void3, flat: true });
  else {
    if (hov && (kind === 'primary' || kind === 'blue')) { ctx.globalAlpha = 0.25; rect(x - 2, y - 2, w + 4, h + 4, K.bg); ctx.globalAlpha = 1; }
    panel(x, y + (press ? 1 : 0), w, h, { bg: press ? K.pr : hov ? K.hov : K.bg, bd: hov ? K.bd : (kind === 'def' ? K.bd : K.bd + '99') });
    if (kind === 'def' && hov) rect(x + 1, y + h - 2 + (press ? 1 : 0), w - 2, 1, COL.blueL);
  }
  if (hov && !opt.disabled) IN.cursor = 'pointer';
  const tc = opt.disabled ? COL.mute : K.tc;
  if (opt.icon) opt.icon(x, y + (press ? 1 : 0), w, h, tc);
  if (label) text(label, x + w / 2 + (opt.lx || 0), y + Math.floor((h - (opt.font === FS ? 5 : 7)) / 2) + (press ? 1 : 0), tc, opt.font || FB, 1);
  if (hov && opt.tip) TIP.set(opt.tip);
  if (hov && !BTN_HOV.has(x * 1000 + y)) { BTN_HOV.add(x * 1000 + y); if (typeof SND !== 'undefined') SND.play('hover'); }
  if (!hov) BTN_HOV.delete(x * 1000 + y);
  if (!opt.disabled && clickIn(x, y, w, h)) { if (typeof SND !== 'undefined') SND.play('click'); return true; }
  if (opt.disabled && clickIn(x, y, w, h) && typeof SND !== 'undefined') SND.play('deny');
  return false;
}
const BTN_HOV = new Set();
const TIP = { v: null, set(v) { this.v = v; } };
function bar(x, y, w, h, frac, c, bg = COL.void0, c2) {
  rect(x, y, w, h, bg);
  const fw = Math.floor((w) * clamp(frac, 0, 1));
  if (fw > 0) { rect(x, y, fw, h, c); if (c2) rect(x, y, fw, 1, c2); }
}
