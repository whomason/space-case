// ===== BACKDROPS: collectible station backgrounds =====
const BD_STYLES = ['NEBULA', 'AURORA', 'SYNTHWAVE', 'GALAXY', 'BLACK HOLE', 'RINGED GIANT', 'TWIN SUNS', 'CRYSTAL FIELD', 'METEOR STORM', 'DEEP SEA', 'PIXEL CITY', 'STARGATE'];
const BD_CACHE = new Map();
function backdropCanvas(id) {
  let c = BD_CACHE.get(id); if (c) return c;
  const d = getDef(id); c = mkCanvas(W, H); drawBackdrop(c.x, d, W, H); c.x.fillStyle = 'rgba(0,0,8,0.16)'; c.x.fillRect(0, 0, W, H); // keeps station text readable
  BD_CACHE.set(id, c); if (BD_CACHE.size > 5) BD_CACHE.delete(BD_CACHE.keys().next().value);
  return c;
}
function backdropThumb(d) { const c = mkCanvas(d.w, d.h); drawBackdrop(c.x, d, d.w, d.h); return c; }
function drawBackdrop(g, d, w, h) {
  const R = RNG(d.seed), hu = d.ph, h2 = d.h2, s = Math.min(0.95, d.ps + 0.1), r = d.r;
  const C = (hh, ss, ll, a = 1) => { const c = hsl(((hh % 360) + 360) % 360, clamp(ss, 0, 1), clamp(ll, 0, 1)); return a < 1 ? `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})` : hex(c); };
  const sky = (top, bot) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const stars = (n, cols) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[R.int(cols.length)]; const x = R.int(w), y = R.int(h); g.fillRect(x, y, 1, 1); if (w > 100 && R() < 0.06) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } } };
  const k = w / 480; // scale factor (thumbnails are tiny)
  const nStars = Math.floor(w * h / (r >= 3 ? 260 : 420));
  switch (d.style) {
    case 'NEBULA': {
      g.fillStyle = C(hu, s, 0.04); g.fillRect(0, 0, w, h);
      const nz = makeNoise(d.seed), id = g.getImageData(0, 0, w, h), px = id.data;
      const cols = [hsl(hu, s * 0.6, 0.12), hsl(hu + 20, s * 0.6, 0.16), hsl(hu, s * 0.7, 0.32), hsl(h2, s * 0.6, 0.55), hsl(hu + 15, s * 0.8, 0.5)];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = nz.fbm(x / k * 0.007, y / k * 0.011, 5), v2 = nz.fbm(x / k * 0.01 + 40, y / k * 0.01, 3); const a = clamp((v - 0.44) * 3, 0, 1); if (!dith(x, y, a * 0.95)) continue; const c = a > 0.75 ? (v2 > 0.5 ? cols[3] : cols[4]) : a > 0.45 ? cols[2] : (v2 > 0.5 ? cols[0] : cols[1]); const o = (y * w + x) * 4; const m = 0.5 + 0.4 * a; px[o] = c[0] * m; px[o + 1] = c[1] * m; px[o + 2] = c[2] * m; }
      g.putImageData(id, 0, 0); stars(nStars, ['#fafaff', C(h2, 0.6, 0.85)]); break;
    }
    case 'AURORA': {
      sky(C(hu + 200, 0.6, 0.05), C(hu + 220, 0.5, 0.14)); stars(nStars, ['#fafaff']);
      for (let b = 0; b < 3; b++) { const bh = b ? h2 : hu; for (let x = 0; x < w; x++) { const y0 = h * (0.18 + b * 0.12) + Math.sin(x / w * 7 + b * 2 + d.seed % 7) * h * 0.08 + Math.sin(x / w * 17 + b) * h * 0.03; const len = h * (0.22 + 0.08 * Math.sin(x / w * 11 + b)); for (let y = 0; y < len; y++) { const a = (1 - y / len) * 0.5; if (!dith(x, Math.floor(y0 + y), a)) continue; g.fillStyle = C(bh + y / len * 40, 0.9, 0.55 + 0.2 * (1 - y / len)); g.fillRect(x, Math.floor(y0 + y), 1, 1); } } }
      g.fillStyle = C(hu + 210, 0.4, 0.06); g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += Math.max(1, 4 * k)) g.lineTo(x, h * 0.78 - Math.abs(Math.sin(x / w * 9 + 1)) * h * 0.12 - Math.sin(x / w * 23) * h * 0.03); g.lineTo(w, h); g.fill(); break;
    }
    case 'WINTER AURORA': {
      sky(C(220, 0.6, 0.04), C(205, 0.5, 0.16)); stars(nStars, ['#fafaff', '#bff6ff']);
      for (let b = 0; b < 3; b++) { const bh = [150, 125, 290][b]; for (let x = 0; x < w; x++) { const y0 = h * (0.1 + b * 0.09) + Math.sin(x / w * 6 + b * 2) * h * 0.07 + Math.sin(x / w * 15 + b) * h * 0.025; const len = h * (0.24 + 0.08 * Math.sin(x / w * 9 + b)); for (let y = 0; y < len; y++) { const a = (1 - y / len) * 0.55; if (!dith(x, Math.floor(y0 + y), a)) continue; g.fillStyle = C(bh + y / len * 30, 0.85, 0.55 + 0.2 * (1 - y / len)); g.fillRect(x, Math.floor(y0 + y), 1, 1); } } }
      for (let L = 0; L < 2; L++) { g.fillStyle = C(215, 0.35, 0.16 + L * 0.1); g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += Math.max(1, 3 * k)) g.lineTo(x, h * (0.58 + L * 0.1) - Math.abs(Math.sin(x / w * (5 + L * 3) + L)) * h * 0.14); g.lineTo(w, h); g.fill(); g.fillStyle = '#eaf6ff'; for (let x = 0; x <= w; x += Math.max(1, 2 * k)) { const yy = h * (0.58 + L * 0.1) - Math.abs(Math.sin(x / w * (5 + L * 3) + L)) * h * 0.14; if (Math.abs(Math.sin(x / w * (5 + L * 3) + L)) > 0.7) g.fillRect(Math.floor(x), Math.floor(yy), Math.max(1, 2 * k), Math.max(1, 3 * k)); } }
      g.fillStyle = '#eef8ff'; g.fillRect(0, Math.floor(h * 0.84), w, h); g.fillStyle = '#cfe6f5'; for (let x = 0; x < w; x += Math.max(1, 5 * k)) g.fillRect(Math.floor(x), Math.floor(h * 0.84 + Math.sin(x * 0.3) * k), Math.max(1, 3 * k), Math.max(1, k));
      for (let i = 0; i < 14; i++) { const x = R() * w, s2 = (0.6 + R() * 0.8) * h * 0.14, base = h * (0.86 + R() * 0.06); for (let t = 0; t < 4; t++) { g.fillStyle = C(150, 0.45, 0.14 + t * 0.03); g.beginPath(); g.moveTo(x, base - s2 - t * 0); g.lineTo(x - s2 * (0.25 + t * 0.1), base - s2 * (0.9 - t * 0.28) + s2 * 0.25); g.lineTo(x + s2 * (0.25 + t * 0.1), base - s2 * (0.9 - t * 0.28) + s2 * 0.25); g.fill(); } g.fillStyle = '#ffffff'; g.fillRect(Math.floor(x - 1 * k), Math.floor(base - s2), Math.max(1, 2 * k), Math.max(1, 2 * k)); g.fillStyle = '#4a2f1e'; g.fillRect(Math.floor(x - k), Math.floor(base), Math.max(1, 2 * k), Math.max(1, 3 * k)); }
      break;
    }
    case 'SYNTHWAVE': {
      sky(C(hu, 0.8, 0.08), C(h2, 0.9, 0.45)); stars(nStars >> 1, ['#fafaff']);
      const cx = w / 2, cy = h * 0.52, sr = h * 0.26; for (let y = -sr; y < sr; y++) { const yy = cy + y; if (y > 0 && Math.floor((y / sr) * 8) % 2 === 1) continue; const hw = Math.sqrt(sr * sr - y * y); g.fillStyle = C(50 - (y + sr) / (2 * sr) * 60, 1, 0.6); g.fillRect(Math.floor(cx - hw), Math.floor(yy), Math.ceil(hw * 2), 1); }
      g.fillStyle = C(hu + 10, 0.7, 0.1); g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += Math.max(1, 6 * k)) g.lineTo(x, h * 0.62 - Math.abs(Math.sin(x / w * 6)) * h * 0.1); g.lineTo(w, h * 0.62); g.fill();
      g.fillStyle = C(hu, 0.7, 0.06); g.fillRect(0, Math.floor(h * 0.62), w, h); g.fillStyle = C(h2, 1, 0.6);
      for (let i = 0; i < 12; i++) { const y = h * 0.62 + Math.pow(i / 12, 2) * h * 0.38; g.fillRect(0, Math.floor(y), w, 1); }
      for (let i = -12; i <= 12; i++) { const x0 = cx + i * w * 0.02, x1 = cx + i * w * 0.12; for (let t = 0; t < 1; t += 1 / (h * 0.4)) g.fillRect(Math.floor(lerp(x0, x1, t)), Math.floor(h * 0.62 + t * h * 0.38), 1, 1); }
      break;
    }
    case 'GALAXY': {
      g.fillStyle = C(hu, s, 0.03); g.fillRect(0, 0, w, h); stars(nStars, ['#fafaff', C(h2, 0.5, 0.8)]);
      const cx = w * (0.4 + R() * 0.2), cy = h * 0.5; const N = Math.floor(9000 * k * k) + 60;
      for (let i = 0; i < N; i++) { const arm = i % 2, t = R() * 4.2; const a = t * 1.6 + arm * Math.PI + (R() - 0.5) * 0.5; const rr = t * w * 0.07 * (1 + (R() - 0.5) * 0.3); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.45; g.fillStyle = R() < 0.3 ? '#fafaff' : C(t < 1.2 ? 45 : (arm ? hu : h2), 0.8, 0.5 + R() * 0.3); g.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
      g.fillStyle = C(45, 0.6, 0.85); g.beginPath(); g.ellipse(cx, cy, w * 0.025, h * 0.03, 0, 0, TAU); g.fill(); break;
    }
    case 'BLACK HOLE': {
      g.fillStyle = '#020208'; g.fillRect(0, 0, w, h); stars(nStars, ['#fafaff', C(h2, 0.5, 0.7)]);
      const cx = w * 0.55, cy = h * 0.45, rr = h * 0.18;
      { const gr = g.createRadialGradient(cx, cy, rr, cx, cy, rr * 3.2); gr.addColorStop(0, C(hu, 1, 0.5, 0.5)); gr.addColorStop(1, C(hu, 1, 0.5, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      for (let i = 0; i < 3; i++) { g.strokeStyle = C(hu + i * 15, 1, 0.55 - i * 0.1); g.lineWidth = Math.max(1, (6 - i * 2) * k * 2); g.beginPath(); g.ellipse(cx, cy, rr * (2.4 - i * 0.25), rr * (0.55 - i * 0.05), -0.15, 0, TAU); g.stroke(); }
      g.lineWidth = 1; g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); g.strokeStyle = C(hu + 30, 1, 0.8); g.beginPath(); g.arc(cx, cy, rr + Math.max(1, k * 2), 0, TAU); g.stroke();
      g.strokeStyle = C(hu, 1, 0.6); g.beginPath(); g.ellipse(cx, cy, rr * 2.2, rr * 0.5, -0.15, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); break;
    }
    case 'RINGED GIANT': {
      sky(C(hu + 180, 0.5, 0.04), C(hu + 200, 0.5, 0.1)); stars(nStars, ['#fafaff']);
      const cx = w * 0.68, cy = h * 0.6, pr = h * 0.42;
      for (let y = -pr; y < pr; y++) { const hw = Math.sqrt(pr * pr - y * y); for (let x = -hw; x < hw; x++) { const lit = clamp(0.35 + (-x / pr) * 0.35 + (-y / pr) * 0.2, 0.05, 0.9); const band = Math.sin((y / pr) * 9 + Math.sin(x / pr * 3) * 0.4) * 0.08; g.fillStyle = C(hu + band * 200, s, lit * 0.6 + band); g.fillRect(Math.floor(cx + x), Math.floor(cy + y), 1, 1); } }
      g.strokeStyle = C(h2, 0.7, 0.7); for (let i = 0; i < 3; i++) { g.lineWidth = Math.max(1, 3 * k); g.beginPath(); g.ellipse(cx, cy, pr * (1.6 + i * 0.12), pr * (0.28 + i * 0.02), -0.25, 0, TAU); g.stroke(); } g.lineWidth = 1; break;
    }
    case 'TWIN SUNS': {
      sky(C(hu + 260, 0.6, 0.15), C(30, 0.9, 0.55));
      for (const [sx, sr, sh] of [[0.3, 0.09, 45], [0.62, 0.05, 15]]) { g.fillStyle = C(sh, 1, 0.75); g.beginPath(); g.arc(w * sx, h * 0.4, h * sr * 2, 0, TAU); g.fill(); g.fillStyle = C(sh, 1, 0.65, 0.25); g.beginPath(); g.arc(w * sx, h * 0.4, h * sr * 3.2, 0, TAU); g.fill(); }
      for (let L = 0; L < 3; L++) { g.fillStyle = C(25 + L * 6, 0.6, 0.3 - L * 0.08); g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += Math.max(1, 4 * k)) g.lineTo(x, h * (0.62 + L * 0.1) - Math.sin(x / w * (3 + L * 2) + L * 2) * h * 0.06); g.lineTo(w, h); g.fill(); }
      break;
    }
    case 'CRYSTAL FIELD': {
      sky(C(hu, s, 0.05), C(hu + 20, s, 0.12)); stars(nStars >> 1, ['#fafaff']);
      for (let i = 0; i < 26; i++) { const x = R() * w, hh2 = h * (0.15 + R() * 0.4), ww = w * (0.012 + R() * 0.03); const col = i % 3 ? hu : h2; const dk = 0.6 + 0.4 * (hh2 / (h * 0.55)); g.fillStyle = C(col, 0.8, 0.4, 0.18); g.beginPath(); g.moveTo(x - ww * 2.5, h); g.lineTo(x, h - hh2 * 1.1); g.lineTo(x + ww * 2.5, h); g.fill(); g.fillStyle = C(col, 0.75, 0.32 * dk); g.beginPath(); g.moveTo(x - ww, h); g.lineTo(x, h - hh2); g.lineTo(x + ww, h); g.fill(); g.fillStyle = C(col, 0.6, 0.7); g.fillRect(Math.floor(x - ww * 0.2), Math.floor(h - hh2 * 0.9), Math.max(1, ww * 0.3), hh2 * 0.6); }
      break;
    }
    case 'METEOR STORM': {
      sky(C(hu, s, 0.04), C(hu + 15, s, 0.1)); stars(nStars, ['#fafaff']);
      for (let i = 0; i < 40; i++) { const x = R() * w * 1.2, y = R() * h, len = w * (0.04 + R() * 0.1); for (let t = 0; t < 1; t += 1 / Math.max(2, len)) { g.fillStyle = C(R() < 0.5 ? hu : h2, 1, 0.4 + t * 0.4, t); g.fillRect(Math.floor(x - len * (1 - t)), Math.floor(y - len * 0.5 * (1 - t)), 1, 1); } g.fillStyle = '#fff'; g.fillRect(Math.floor(x), Math.floor(y), Math.max(1, 2 * k), Math.max(1, 2 * k)); }
      break;
    }
    case 'DEEP SEA': {
      sky(C(hu + 180, 0.7, 0.25), C(hu + 200, 0.8, 0.04));
      for (let i = 0; i < 7; i++) { const x = w * (0.1 + i * 0.13); g.fillStyle = C(hu + 170, 0.8, 0.7, 0.07); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w * 0.05, 0); g.lineTo(x + w * 0.12, h); g.lineTo(x + w * 0.02, h); g.fill(); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = C(hu + 170, 0.6, 0.8, 0.6); g.beginPath(); g.arc(R() * w, R() * h, Math.max(1, (1 + R() * 3) * k * 2), 0, TAU); g.stroke(); }
      for (let i = 0; i < 18; i++) { const x = R() * w, hh2 = h * (0.15 + R() * 0.3); g.strokeStyle = C(h2 + 100, 0.6, 0.25); g.lineWidth = Math.max(1, 3 * k); g.beginPath(); g.moveTo(x, h); for (let t = 0; t < 1; t += 0.1) g.lineTo(x + Math.sin(t * 6 + i) * 6 * k, h - t * hh2); g.stroke(); } g.lineWidth = 1;
      break;
    }
    case 'PIXEL CITY': {
      sky(C(hu + 230, 0.6, 0.06), C(h2, 0.7, 0.3)); stars(nStars >> 1, ['#fafaff']);
      g.fillStyle = C(50, 0.3, 0.9); g.beginPath(); g.arc(w * 0.78, h * 0.22, h * 0.08, 0, TAU); g.fill();
      let x = 0; while (x < w) { const bw = w * (0.03 + R() * 0.05), bh = h * (0.18 + R() * 0.45); g.fillStyle = C(hu + 230, 0.5, 0.08 + R() * 0.05); g.fillRect(Math.floor(x), Math.floor(h - bh), Math.ceil(bw), Math.ceil(bh)); const ws = Math.max(1, 3 * k * 2); for (let wy = h - bh + ws; wy < h - ws; wy += ws * 2) for (let wx = x + ws; wx < x + bw - ws; wx += ws * 2) if (R() < 0.35) { g.fillStyle = R() < 0.7 ? C(48, 1, 0.65) : C(h2, 1, 0.7); g.fillRect(Math.floor(wx), Math.floor(wy), Math.max(1, ws * 0.7), Math.max(1, ws * 0.7)); } x += bw + w * 0.004; }
      break;
    }
    case 'STARGATE': {
      g.fillStyle = C(hu, s, 0.03); g.fillRect(0, 0, w, h); stars(nStars, ['#fafaff']);
      const cx = w / 2, cy = h / 2; for (let i = 18; i > 0; i--) { const rr = Math.pow(i / 18, 1.6) * h * 0.75; g.strokeStyle = C(i % 2 ? hu : h2, 0.8, 0.12 + (1 - i / 18) * 0.45, 0.55); g.lineWidth = Math.max(1, (i / 18) * 6 * k * 2); g.beginPath(); g.ellipse(cx, cy, rr * 1.4, rr, 0, 0, TAU); g.stroke(); } g.lineWidth = 1;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, Math.max(1, 3 * k * 2), 0, TAU); g.fill(); break;
    }
  }
  if (r >= 2 && w > 100) { // a vignette to keep the station UI readable
    const gr = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
}
// animated layer for epic+ backdrops
function backdropFx(d) {
  if (d.r < 3) return;
  const t = T_NOW;
  if (d.style === 'WINTER AURORA') for (let i = 0; i < 60; i++) { const sp = 12 + (i % 5) * 6, x = (i * 83 + Math.sin(t * 0.8 + i) * 14 + W * 4) % W, y = ((i * 47 + t * sp) % (H + 10)) - 5; ctx.globalAlpha = 0.5 + (i % 3) * 0.2; px(x, y, '#ffffff'); if (i % 4 === 0) { px(x - 1, y, '#ffffff'); px(x + 1, y, '#ffffff'); px(x, y - 1, '#ffffff'); px(x, y + 1, '#ffffff'); } ctx.globalAlpha = 1; }
  if (d.o.t === 'prem' && d.style === 'SYNTHWAVE') { const k = (t * 0.6) % 1; ctx.globalAlpha = 0.5; for (let i = 0; i < 4; i++) { const y = H * 0.62 + Math.pow((i + k) / 4, 2) * H * 0.38; rect(0, Math.floor(y), W, 1, '#ff6ad5'); } ctx.globalAlpha = 1; }
  if (d.o.t === 'prem' && d.style === 'BLACK HOLE') { for (let i = 0; i < 40; i++) { const a = t * (0.6 + (i % 4) * 0.15) + i * 0.7, rr = H * (0.25 + (i % 7) * 0.035); ctx.globalAlpha = 0.6; px(W * 0.55 + Math.cos(a) * rr * 2.2, H * 0.45 + Math.sin(a) * rr * 0.5, i % 3 ? '#ffcb6b' : '#ffffff'); } ctx.globalAlpha = 1; }
  if (d.o.t === 'prem' && d.style === 'STARGATE') { const k = (t * 0.5) % 1; ctx.globalAlpha = (1 - k) * 0.6; ctx.strokeStyle = hex(hsl(d.ph, 0.9, 0.7)); ctx.beginPath(); ctx.ellipse(W / 2, H / 2, k * H * 1.05, k * H * 0.75, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  if (d.r >= 4) { const k = (t * 0.35) % 3; if (k < 0.5) { const x0 = W * 0.9 - k * 600, y0 = 20 + (Math.floor(t / 3) * 37 % 80); for (let i = 0; i < 18; i++) { ctx.globalAlpha = 1 - i / 18; px(x0 + i * 2, y0 - i * 0.6, i < 2 ? '#fff' : hex(hsl(d.h2, 0.8, 0.75))); } ctx.globalAlpha = 1; } }
  if (d.r >= 5) { ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 1.5); rect(0, 0, W, H, d.r === 6 ? rainbow(t * 0.3) : hex(hsl(d.ph, 0.9, 0.6))); ctx.globalAlpha = 1; }
  for (let i = 0; i < d.r * 3; i++) { const ph = (t * 0.7 + i * 0.37) % 1, x = (i * 97 + Math.floor(t * 0.7 + i * 0.37) * 53) % W, y = (i * 61 + Math.floor(t * 0.7 + i * 0.37) * 29) % H; const a = Math.sin(ph * Math.PI); if (a > 0.3) { ctx.globalAlpha = a; const c = d.r === 6 ? rainbow(t, i * 40) : '#fafaff'; rect(x, y - 1, 1, 3, c); rect(x - 1, y, 3, 1, c); ctx.globalAlpha = 1; } }
}
// item sprite for a backdrop: a smooth miniature of the real scene
function backdropSpr(d) {
  const big = mkCanvas(d.w * 4, d.h * 4); drawBackdrop(big.x, d, d.w * 4, d.h * 4);
  const mid = mkCanvas(d.w * 2, d.h * 2); mid.x.imageSmoothingEnabled = true; mid.x.drawImage(big, 0, 0, d.w * 2, d.h * 2);
  const c = mkCanvas(d.w, d.h); c.x.imageSmoothingEnabled = true; c.x.drawImage(mid, 0, 0, d.w, d.h);
  const s = { frames: [c], w: d.w, h: d.h, halo: haloOf(c), sil: maskOf(c, '#1e2749'), white: maskOf(c, '#ffffff'), edge: [], grid: null };
  for (let x = 0; x < d.w; x += 2) s.edge.push([x, 0], [x, d.h - 1]); for (let y = 2; y < d.h - 1; y += 2) s.edge.push([0, y], [d.w - 1, y]);
  return s;
}
// a framed, smooth-scaled preview of the full scene (crate reveals, holo demo)
function drawBackdropPreview(id, x, y, w, h, o = {}) {
  const d = getDef(id); x = Math.floor(x); y = Math.floor(y);
  const c = d.r === 6 ? rainbow(T_NOW) : rcol(d.r);
  if (!o.noFrame) { rect(x - 3, y - 3, w + 6, h + 6, '#000'); rect(x - 2, y - 2, w + 4, h + 4, c); rect(x - 1, y - 1, w + 2, h + 2, '#000'); }
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true; ctx.drawImage(backdropCanvas(id), x, y, w, h); ctx.imageSmoothingEnabled = sm;
  if (d.r >= 3) { // a few twinkles so the miniature feels alive
    for (let i = 0; i < d.r; i++) { const ph = (T_NOW * 0.9 + i * 0.41) % 1, k = Math.floor(T_NOW * 0.9 + i * 0.41); const tx = x + ((k * 53 + i * 97) % w), ty = y + ((k * 31 + i * 61) % h); const a = Math.sin(ph * Math.PI); if (a > 0.3) { ctx.globalAlpha = a; const cc = d.r === 6 ? rainbow(T_NOW, i * 50) : '#fff'; rect(tx, ty - 1, 1, 3, cc); rect(tx - 1, ty, 3, 1, cc); ctx.globalAlpha = 1; } }
  }
  if (!o.noFrame && d.r >= 4) { const per = 2.6, t = (T_NOW % per) / per; if (t < 0.3) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); const bx = x - h + (t / 0.3) * (w + h); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx, y + h); ctx.lineTo(bx + 10, y + h); ctx.lineTo(bx + 10 + h, y); ctx.lineTo(bx + h, y); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; } }
}
// the station background: the equipped backdrop or the default nebula
function equippedBackdrop() { return typeof S !== 'undefined' && S && S.eq && S.eq.backdrop && S.inv[S.eq.backdrop] ? S.eq.backdrop : null; }
