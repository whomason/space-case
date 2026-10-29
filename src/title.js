// ===== TITLE: the first thing anyone sees =====
// Intro (about 3s, a click skips it): hyperspace jump -> flash -> ship and pilot fly in over a giant planet ->
// the logo slams down letter by letter -> a crate drops and keeps cracking open better and better loot.
const TT = { t: 0, ready: false, leave: -1, P: null, cr: null, shoot: [], dust: [] };
const TT_INTRO = 3.1;
// chunky 6x7 logo letters, each "pixel" is a bevelled tile
const LOGO_GLYPH = {
  S: ['.####.', '##..##', '##....', '.####.', '....##', '##..##', '.####.'],
  P: ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....'],
  A: ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  C: ['.####.', '##..##', '##....', '##....', '##....', '##..##', '.####.'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
  R: ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
  T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
};
const LOGO_K = 5, LOGO_DEPTH = 4;
const LOGO_A = 'SPACE', LOGO_B = 'CRATES', LOGO_N = LOGO_A.length + LOGO_B.length;
const LOGO_COLS = {
  cool: ['#d8fdff', '#8ff3ff', '#4fd8ff', '#2fa8ff', '#3b74ff', '#5a4cff', '#7a37e6'],
  warm: ['#fff6c2', '#ffe36b', '#ffc53d', '#ffa024', '#ff7b1c', '#f2521e', '#d6341f'],
};
function ttLetter(ch, cols) {
  const g = LOGO_GLYPH[ch], k = LOGO_K, D = LOGO_DEPTH, w = 6 * k, h = 7 * k;
  const c = mkCanvas(w + D + 4, h + D + 4), x = c.x, o = 2;
  const cells = []; g.forEach((row, r) => [...row].forEach((v, q) => { if (v === '#') cells.push([q, r]); }));
  // black outline, then the extruded side, then the face
  x.fillStyle = '#05020c'; for (const [q, r] of cells) x.fillRect(o + q * k - 2, o + r * k - 2, k + 4 + D, k + 4 + D);
  for (let d = D; d >= 1; d--) { x.fillStyle = d > D / 2 ? '#1a0a2e' : '#2d1450'; for (const [q, r] of cells) x.fillRect(o + q * k + d, o + r * k + d, k, k); }
  const has = (q, r) => g[r] && g[r][q] === '#';
  for (const [q, r] of cells) {
    // a smooth gradient down the letter, light on the top and left edges, shade on the bottom and right
    const X = o + q * k, Y = o + r * k;
    for (let yy = 0; yy < k; yy++) { const v = (r * k + yy) / (7 * k) * 6; const i = Math.min(5, Math.floor(v)); x.fillStyle = hex(mix(hexRgb(cols[i]), hexRgb(cols[i + 1]), v - i)); x.fillRect(X, Y + yy, k, 1); }
    x.fillStyle = 'rgba(255,255,255,0.6)'; if (!has(q, r - 1)) x.fillRect(X, Y, k, 1); if (!has(q - 1, r)) x.fillRect(X, Y, 1, k);
    x.fillStyle = 'rgba(40,0,40,0.35)'; if (!has(q, r + 1)) x.fillRect(X, Y + k - 1, k, 1); if (!has(q + 1, r)) x.fillRect(X + k - 1, Y, 1, k);
  }
  // a glossy band across the upper third
  x.fillStyle = 'rgba(255,255,255,0.16)'; for (const [q, r] of cells) if (r === 1) x.fillRect(o + q * k, o + r * k + 1, k, 2);
  // a white copy of just the face, for the shine that sweeps across
  const m = mkCanvas(c.width, c.height); m.x.fillStyle = '#ffffff'; for (const [q, r] of cells) m.x.fillRect(o + q * k, o + r * k, k, k);
  c.mask = m; return c;
}
function ttInit() {
  // sky: a dithered gradient with two soft nebula glows, no noise, so the logo reads clearly
  const bg = mkCanvas(W, H), id = bg.x.createImageData(W, H), d = id.data;
  const top = [4, 2, 14], mid = [12, 6, 34], low = [34, 12, 58];
  const blobs = [[70, 60, 150, [120, 40, 170]], [420, 90, 170, [30, 90, 170]], [250, 200, 220, [110, 30, 120]]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = y / H; let c = v < 0.55 ? mix(top, mid, v / 0.55) : mix(mid, low, (v - 0.55) / 0.45);
    for (const [bx, by, br, bc] of blobs) { const k = Math.max(0, 1 - Math.hypot(x - bx, (y - by) * 1.4) / br); if (k > 0) c = mix(c, bc, dith(x, y, k * k * 0.9) ? k * 0.55 : k * 0.3); }
    const o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  bg.x.putImageData(id, 0, 0); TT.bg = bg;
  const R = RNG(7); TT.stars = [];
  for (let i = 0; i < 170; i++) TT.stars.push({ x: R() * W, y: R() * 200, z: 0.2 + R() * 0.8, c: ['#ffffff', '#cfe8ff', '#ffe9c7', '#e7d2ff'][R.int(4)], ph: R() * 9 });
  TT.big = []; for (let i = 0; i < 7; i++) TT.big.push({ x: 20 + R() * 440, y: 10 + R() * 170, ph: R() * 9, c: ['#ffffff', '#9fe8ff', '#ffd9a0'][R.int(3)] });
  // a giant planet on the horizon
  TT.pl = renderSphere(planetDef(3), 250, 2.2);
  TT.word1 = [...LOGO_A].map(ch => ttLetter(ch, LOGO_COLS.cool));
  TT.word2 = [...LOGO_B].map(ch => ttLetter(ch, LOGO_COLS.warm));
  TT.P = new Particles(700); TT.ready = true; TT.t = 0;
  TT.warp = []; for (let i = 0; i < 160; i++) TT.warp.push({ a: R() * TAU, d: R() * 40, s: 0.4 + R() * 0.9, c: R() < 0.25 ? '#8ff3ff' : '#ffffff' });
  TT.rocks = []; for (let i = 0; i < 6; i++) TT.rocks.push({ x: R() * W, y: 30 + R() * 150, s: 1 + R.int(3), v: 3 + R() * 6, c: ['#3a2e57', '#4a3b6b', '#2b2342'][R.int(3)] });
}
const ttEase = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ttBack = t => { t = clamp(t, 0, 1); const s = 1.9; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
function ttRar(r) { return r === 6 ? rainbow(T_NOW) : RAR[r].c; }
// logo layout: one line, centred
function ttLogoPos() {
  const k = LOGO_K, lw = 6 * k, gap = 5, sp = 20;
  const total = LOGO_N * lw + (LOGO_N - 2) * gap + sp; let x = Math.round(W / 2 - total / 2) - 2; const out = [];
  for (let i = 0; i < LOGO_N; i++) { out.push(x); x += lw + gap; if (i === LOGO_A.length - 1) x += sp - gap; }
  return out;
}
function drawTitle(dt) {
  if (!TT.ready) { ttInit(); rect(0, 0, W, H, '#000'); return; }
  TT.t += dt; const t = TT.t, P = TT.P;
  const go = IN.pr || kp('Enter') || kp('Space');   // one click starts the game, even during the intro
  const skip = t < TT_INTRO && (go || kp('Escape'));
  if (skip) { TT.t = TT_INTRO; IN.pr = false; for (let i = 0; i < LOGO_N; i++) TT['landed' + i] = true; }
  // ---- 1. hyperspace
  if (t < 1.15) {
    rect(0, 0, W, H, '#020109'); const sp = Math.min(1, t / 0.9);
    for (const s of TT.warp) {
      s.d += (30 + s.d * 3.2) * s.s * sp * dt * 2.2; if (s.d > 330) s.d = Math.random() * 25;
      const x0 = W / 2 + Math.cos(s.a) * s.d, y0 = H / 2 + Math.sin(s.a) * s.d * 0.62, L = s.d * 0.3 * sp;
      line(x0, y0, x0 - Math.cos(s.a) * L, y0 - Math.sin(s.a) * L * 0.62, s.c);
    }
    const g = Math.min(1, t / 1.1); ctx.globalAlpha = 0.5 * g; circ(W / 2, H / 2, 4 + g * 10, '#bff7ff'); ctx.globalAlpha = 1; circ(W / 2, H / 2, 2 + g * 3, '#ffffff');
    if (t > 0.9) { ctx.globalAlpha = (t - 0.9) / 0.25; rect(0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; }
    return;
  }
  // ---- 2. the scene
  ctx.drawImage(TT.bg, 0, 0);
  for (const s of TT.stars) { s.x -= s.z * 4 * dt; if (s.x < 0) s.x += W; const tw = Math.sin(T_NOW * (1.5 + s.z * 3) + s.ph); ctx.globalAlpha = clamp(0.25 + s.z * 0.6 + tw * 0.2, 0.1, 1); px(s.x, s.y, s.c); } ctx.globalAlpha = 1;
  for (const b of TT.big) { const k = (Math.sin(T_NOW * 1.7 + b.ph) + 1) / 2, L = 1 + Math.round(k * 2); ctx.globalAlpha = 0.5 + k * 0.5; px(b.x, b.y, '#fff'); for (let i = 1; i <= L; i++) { px(b.x - i, b.y, b.c); px(b.x + i, b.y, b.c); px(b.x, b.y - i, b.c); px(b.x, b.y + i, b.c); } ctx.globalAlpha = 1; }
  for (const r of TT.rocks) { r.x += r.v * dt; if (r.x > W + 6) r.x = -6; rect(r.x, r.y, r.s + 1, r.s, r.c); px(r.x, r.y, '#6d5c94'); }
  // shooting stars
  if (Math.random() < dt * 0.45) TT.shoot.push({ x: 60 + Math.random() * 380, y: 8 + Math.random() * 60, vx: -150 - Math.random() * 90, vy: 55 + Math.random() * 40, life: 0.7 });
  for (const s of TT.shoot) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; const a = clamp(s.life / 0.7, 0, 1); ctx.globalAlpha = a; line(s.x, s.y, s.x - s.vx * 0.09, s.y - s.vy * 0.09, '#bfe9ff'); px(s.x, s.y, '#ffffff'); ctx.globalAlpha = 1; }
  TT.shoot = TT.shoot.filter(s => s.life > 0);
  // planet: rises a little as the scene opens
  const rise = ttEase((t - 1.15) / 0.9), py = 196 + (1 - rise) * 40, pl = TT.pl;
  for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.07 + i * 0.03; ctx.fillStyle = '#7fd6ff'; ctx.beginPath(); ctx.arc(W / 2, py + 250, 250 + 14 - i * 3, Math.PI, TAU); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.drawImage(pl, Math.round(W / 2 - 250 - pl.pad), Math.round(py - pl.pad));
  ctx.globalAlpha = 0.35; ctx.strokeStyle = '#d8f6ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2, py + 250, 250.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.globalAlpha = 1;
  // darker toward the bottom so the button and small print read over the bright planet
  if (!TT.vig) { TT.vig = mkCanvas(W, 70); const g = TT.vig.x.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, 'rgba(5,2,12,0)'); g.addColorStop(0.55, 'rgba(5,2,12,0.55)'); g.addColorStop(1, 'rgba(5,2,12,0.85)'); TT.vig.x.fillStyle = g; TT.vig.x.fillRect(0, 0, W, 70); }
  ctx.drawImage(TT.vig, 0, H - 70);
  // ---- the ship and the pilot fly in
  const sk = ttEase((t - 1.2) / 0.85), leaving = TT.leave >= 0 ? TT.leave : 0;
  const shx = -110 + sk * 140 + leaving * leaving * 900, shy = 116 + Math.sin(T_NOW * 1.3) * 4 - leaving * 30;
  if (sk < 1 && t > 1.2 && Math.random() < 0.8) P.add({ x: shx + 10, y: shy + 20 + Math.random() * 24, vx: -220, vy: 0, life: 0.25, c: '#bfe9ff', t: 'spark' });
  drawShip(S.eq, shx, shy, 2, T_NOW, { thrust: sk < 1 || leaving ? 1 : 0.45 });
  const ak = ttEase((t - 1.45) / 1), ax = 490 - ak * 92, ay = 128 + Math.sin(T_NOW * 1.6 + 1) * 5;
  if (t > 1.45 && Math.random() < dt * 14) P.add({ x: ax + 26, y: ay + 34, vx: 20 + Math.random() * 10, vy: 18, life: 0.5, c: '#ffd27a', t: 'shrink', s: 2 });
  ctx.drawImage(astroSprite(S.eq, 2, Math.floor(T_NOW * 3) % 2), Math.round(ax), Math.round(ay), 40, 52);
  // ---- the crate show
  ttCrate(dt, t);
  P.update(dt); P.draw();
  // ---- the logo
  ttLogo(t);
  // tagline types itself out
  const tag = 'OPEN CRATES.  GEAR UP.  CONQUER 20 PLANETS.', tn = Math.floor(clamp((t - 2.15) / 0.7, 0, 1) * tag.length);
  if (tn > 0) { const full = textW(tag, FS); const tx = Math.round(W / 2 - full / 2); textO(tag.slice(0, tn), tx, 84, '#e6dcff', '#05020c', FS); if (tn < tag.length && Math.floor(T_NOW * 8) % 2) rect(tx + textW(tag.slice(0, tn), FS) + 1, 84, 3, 5, '#ffe36b'); }
  // ---- call to action
  const ck = ttBack((t - 2.75) / 0.45);
  if (t > 2.75 && TT.leave < 0) {
    const label = (IN.touch ? 'TAP' : 'CLICK') + (S.stats.crates || S.planet.landings ? ' TO CONTINUE' : ' TO START');
    const bw = 200, bh = 24, bx = W / 2 - bw / 2, by = 222, hov = inBox(bx, by, bw, bh); const pulse = (Math.sin(T_NOW * 4) + 1) / 2;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(ck, ck); ctx.translate(-W / 2, -(by + bh / 2));
    ctx.globalAlpha = 0.18 + pulse * 0.22; rect(bx - 4, by - 4, bw + 8, bh + 8, '#ffc53d'); ctx.globalAlpha = 1;
    rect(bx - 2, by - 2, bw + 4, bh + 4, '#05020c'); rect(bx, by, bw, bh, hov ? '#3a1d0c' : '#1c0f2e'); rect(bx, by, bw, 2, '#ffe36b'); rect(bx, by + bh - 2, bw, 2, '#d6341f'); rect(bx, by, 2, bh, '#ffc53d'); rect(bx + bw - 2, by, 2, bh, '#ffa024');
    textO(label, W / 2, by + 6, hov || pulse > 0.5 ? '#fff6c2' : '#ffc53d', '#05020c', FB, 1, 2);
    ctx.restore();
    if (hov) IN.cursor = 'pointer';
    ctx.globalAlpha = clamp((t - 3) / 0.4, 0, 1);
    if (S.name) textO(`WELCOME BACK, ${S.name}`, W / 2, 210, '#8ff3ff', '#05020c', FS, 1);
    textO('BEST WITH SOUND ON', W / 2, 254, '#b7a9d9', '#05020c', FS, 1);
    if (NET.counts) { const s = `${fmt(shownOnline(NET.counts))} PILOTS ONLINE`; const sw = textW(s, FS); px(W - 12 - sw - 6, 258, '#7dffb0'); rect(W - 12 - sw - 7, 257, 3, 3, '#7dffb0'); text(s, W - 10, 255, '#7dffb0', FS, 2); }
    ctx.globalAlpha = 1;
  }
  if (t < 1.5) { ctx.globalAlpha = clamp(1 - (t - 1.15) / 0.35, 0, 1); rect(0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; }
  // ---- start: the ship punches it, white out, into the station
  if (TT.leave >= 0) {
    TT.leave += dt; ctx.globalAlpha = clamp((TT.leave - 0.15) / 0.3, 0, 1); rect(0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1;
    if (TT.leave > 0.5) { TT.leave = -1; TT.ready = false; flash(0.8); goHub(); }
    return;
  }
  if (TT.leave < 0 && (skip ? go : t >= TT_INTRO && go)) { firstTime('start'); SND.unlock(); SND.setMute(S.settings.mute); SND.setMusic(S.settings.music); SND.play('warp'); TT.leave = 0; }
}
function ttLogo(t) {
  const xs = ttLogoPos(), letters = TT.word1.concat(TT.word2), base = 22;
  for (let i = 0; i < LOGO_N; i++) {
    const t0 = 1.5 + i * 0.075, k = (t - t0) / 0.32; if (k <= 0) continue;
    const y = base + (1 - ttBack(k)) * -70 + Math.sin(T_NOW * 2.2 + i * 0.55) * (k > 1.6 ? 1.5 : 0);
    if (k >= 1 && !TT['landed' + i]) { TT['landed' + i] = true; shake(i === LOGO_N - 1 ? 5 : 2); TT.P.burst(xs[i] + 15, base + 38, 8, { c: ['#ffffff', '#e6dcff', i < LOGO_A.length ? '#8ff3ff' : '#ffe36b'], sp: 70, life: 0.45, ang: -Math.PI / 2, spread: 2.4, g: 140, s: 1 }); }
    ctx.globalAlpha = clamp(k * 3, 0, 1); ctx.drawImage(letters[i], xs[i] - 2, Math.round(y) - 2); ctx.globalAlpha = 1;
  }
  // a shine sweeps across every few seconds
  const st = (t - 2.4) % 3.6; if (t > 2.4 && st < 0.7) {
    const sx = -40 + st / 0.7 * (W + 80);
    ctx.save(); ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 16, 0); ctx.lineTo(sx - 14, 90); ctx.lineTo(sx - 30, 90); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.7; for (let i = 0; i < LOGO_N; i++) { const y = base + Math.sin(T_NOW * 2.2 + i * 0.55) * 1.5; ctx.drawImage(letters[i].mask, xs[i] - 2, Math.round(y) - 2); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
// a crate in the middle keeps cracking open, each one rarer than the last
const TT_SHOW = [[1, 2], [2, 3], [3, 4], [5, 5], [7, 6]];
function ttCrate(dt, t) {
  if (t < 2.35) return;
  const P = TT.P; let c = TT.cr;
  if (!c) c = TT.cr = { i: 0, st: 'drop', t: 0, id: null };
  c.t += dt; const cx = W / 2, cy = 152, [tier, rar] = TT_SHOW[c.i % TT_SHOW.length], col = ttRar(rar);
  // the glowing pad it sits on
  const glow = c.st === 'shake' ? 0.35 + c.t : c.st === 'reveal' ? 0.9 : 0.35;
  for (let i = 3; i >= 0; i--) { ctx.globalAlpha = glow * (0.12 + (3 - i) * 0.06); ctx.fillStyle = c.st === 'idle' || c.st === 'drop' ? '#8ff3ff' : col; ctx.beginPath(); ctx.ellipse(cx, cy + 30, 30 + i * 6, 5 + i * 1.6, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
  const img = getCrate(tier, 'weapon'), cw = img.width * 2, ch = img.height * 2;
  if (c.st === 'drop') {
    const k = ttBack(c.t / 0.45), y = cy - ch / 2 - (1 - k) * 120;
    ctx.drawImage(img, Math.round(cx - cw / 2), Math.round(y), cw, ch);
    if (c.t > 0.45) { c.st = 'idle'; c.t = 0; P.burst(cx, cy + 26, 10, { c: ['#8ff3ff', '#ffffff'], sp: 60, life: 0.4, ang: -Math.PI / 2, spread: 2.8, g: 90 }); }
  } else if (c.st === 'idle' || c.st === 'shake') {
    const amp = c.st === 'shake' ? c.t * 5 : 0, bob = c.st === 'idle' ? Math.sin(c.t * 3) * 2 : 0;
    const ox = (Math.random() - 0.5) * amp, oy = (Math.random() - 0.5) * amp * 0.6 + bob;
    ctx.drawImage(img, Math.round(cx - cw / 2 + ox), Math.round(cy - ch / 2 + oy), cw, ch);
    if (c.st === 'shake' && Math.random() < dt * 30) P.add({ x: cx + (Math.random() - 0.5) * cw, y: cy - ch / 2 + Math.random() * ch, vx: (Math.random() - 0.5) * 40, vy: -40, life: 0.4, c: col === 'RAINBOW' ? '#fff' : col, t: 'shrink', s: 2 });
    if (c.st === 'idle' && c.t > 1.1) { c.st = 'shake'; c.t = 0; }
    if (c.st === 'shake' && c.t > 0.75) {
      c.st = 'reveal'; c.t = 0; const pool = (POOLS.w && POOLS.w[rar]) || []; c.id = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      shake(rar >= 5 ? 6 : 4); P.burst(cx, cy, 34, { c: rar === 6 ? ['#ff5c9a', '#fca311', '#7dffb0', '#8ff3ff', '#c77dff'] : [col, '#ffffff'], sp: 150, life: 0.7, s: 2, t: 'shrink' });
      P.add({ x: cx, y: cy, life: 0.5, c: '#ffffff', t: 'ring', s: 60 }); P.add({ x: cx, y: cy, life: 0.7, c: rar === 6 ? '#ff5c9a' : col, t: 'ring', s: 90 });
    }
  } else if (c.st === 'reveal') {
    const k = ttBack(c.t / 0.4), fade = c.t > 1.9 ? 1 - (c.t - 1.9) / 0.3 : 1;
    // light rays
    ctx.save(); ctx.translate(cx, cy - 6); ctx.rotate(T_NOW * 0.7); ctx.globalAlpha = 0.22 * fade;
    for (let i = 0; i < 12; i++) { ctx.fillStyle = rar === 6 ? hex(hsl(i * 30 + T_NOW * 120, 0.9, 0.65)) : i % 2 ? col : '#ffffff'; ctx.beginPath(); ctx.moveTo(0, 0); const a = i / 12 * TAU; ctx.lineTo(Math.cos(a - 0.12) * 120, Math.sin(a - 0.12) * 120); ctx.lineTo(Math.cos(a + 0.12) * 120, Math.sin(a + 0.12) * 120); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
    if (c.id) { const d = getDef(c.id), sc = Math.max(1, Math.min(3, Math.floor(70 / d.w))); ctx.globalAlpha = fade; ctx.save(); ctx.translate(cx, cy - 6 - k * 6); ctx.scale(k, k); drawItem(c.id, -d.w * sc / 2, -d.h * sc / 2, sc); ctx.restore(); ctx.globalAlpha = 1; }
    if (c.t > 0.25) { ctx.globalAlpha = fade; textO(RAR[rar].n + '!', cx, cy + 22, rar === 6 ? rainbow(T_NOW) : col, '#05020c', FB, 1, 1); ctx.globalAlpha = 1; }
    if (Math.random() < dt * 12 * fade) P.add({ x: cx + (Math.random() - 0.5) * 70, y: cy - 20 + (Math.random() - 0.5) * 30, vx: 0, vy: -12, life: 0.6, c: '#ffffff', t: 'pat', pat: '.#.|###|.#.' });
    if (c.t > 2.2) { c.i++; c.st = 'drop'; c.t = 0; }
  }
}
