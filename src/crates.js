// ===== CRATES: the crate bay, opening sequence, reels, reveals, holo demos, choice crates =====
const BAY = { kind: 'weapon', tier: 0, scroll: 0, upgrader: false, hoverKind: null };
let OPEN = null;

// ---------- mini helpers ----------
function emblemDraw(kind, x, y, c) { const em = EMBLEM[kindInfo(kind).em] || EMBLEM.weapon; em.split('|').forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === '#') px(x + xx, y + yy, c); }); }
function tierColor(t) { return t === 7 ? rainbow(T_NOW) : hex(hsl(TIERS[t].h, TIERS[t].s, 0.62)); }
function drawTopBar(title, back, help) {
  rect(0, 0, W, 20, COL.void1); rect(0, 20, W, 1, COL.steel);
  let clicked = false;
  if (back) clicked = button(4, 3, 62, 14, '< STATION', { font: FS });
  if (title) { text(title, back ? 74 : 8, 7, COL.ink, FB); rect(back ? 74 : 8, 15, textW(title), 1, COL.gold); if (help) helpButton((back ? 74 : 8) + textW(title) + 7, 5, help); }
  let x = W - 6;
  const seg = (str, col, icon, sc = 1) => { const w = textW(str, FB, sc); x -= w; text(str, x, sc > 1 ? 3 : 7, col, FB, 0, sc); x -= 11; icon(x, 7); x -= 12; };
  seg(fmt(S.research), COL.dim, (x, y) => { rect(x + 1, y, 5, 7, COL.mauve); rect(x + 2, y + 1, 3, 2, COL.lilac); });
  seg(fmt(S.coins), COL.gold, (x, y) => drawCoinIcon(x, y), 2);
  return clicked;
}
function miniCrate(x, y, t, ok = true) {
  const c = ok ? tierColor(t) : COL.steel; x = Math.floor(x); y = Math.floor(y);
  rect(x, y + 2, 12, 7, c); rect(x - 1, y, 14, 3, ok ? mixHex(c.length === 7 ? c : '#ff88cc', '#ffffff', 0.25) : COL.mauve); rect(x + 5, y + 3, 2, 3, COL.void0); rect(x, y + 8, 12, 1, 'rgba(0,0,0,0.4)');
}

// ---------- crate bay ----------
function crateListRows() {
  const rows = [];
  rows.push({ h: 'CATEGORY' }); for (const k of ['weapon', 'gadget', 'pet', 'armor', 'ship', 'mining', 'skin', 'cosmetic', 'backdrop', 'galaxy']) rows.push({ k });
  const sal = Object.keys(S.planet.visited).map(Number).sort((a, b) => a - b); rows.push({ h: 'PLANET SALVAGE' }); if (!sal.length) rows.push({ note: 'LAND ON A PLANET FIRST' }); for (const p of sal) rows.push({ k: 'salvage:' + p });
  const bs = Object.keys(S.planet.bosses).map(Number).sort((a, b) => a - b); rows.push({ h: 'BOSS ARSENAL' }); if (!bs.length) rows.push({ note: 'BEAT A BOSS FIRST' }); for (const b of bs) rows.push({ k: 'boss:' + b });
  const fin = PAGES.filter(finisherOk); rows.push({ h: 'SET FINISHERS' }); if (!fin.length) rows.push({ note: 'OWN 60% OF A PAGE' }); for (const pg of fin) rows.push({ k: 'finisher:' + pg.id });
  return rows;
}
function bestTier(kind) { let b = 0; for (let t = 0; t < 8; t++) if (tierUnlocked(t) && S.coins >= crateCost(kind, t)) b = t; return b; }
function fmtPct(o) { return o === 0 ? '-' : o < 0.1 ? o.toFixed(3) + '%' : o < 1 ? o.toFixed(2) + '%' : o.toFixed(1) + '%'; }
function drawCrateBay(dt) {
  drawBayBackground();
  if (drawTopBar('CRATE BAY', true, 'bay') || kp('Escape')) { goHub(); return; }
  // ---- left: crate types
  const LX = 4, LY = 24, LW = 120, LH = H - LY - 4;
  panel(LX, LY, LW, LH, { bg: COL.void1 });
  const rows = crateListRows(); const RH = 14; const total = rows.length * RH; const maxS = Math.max(0, total - (LH - 6));
  if (inBox(LX, LY, LW, LH)) BAY.scroll = clamp(BAY.scroll + IN.wheel * 28, 0, maxS); else BAY.scroll = clamp(BAY.scroll, 0, maxS);
  ctx.save(); ctx.beginPath(); ctx.rect(LX + 1, LY + 2, LW - 2, LH - 4); ctx.clip();
  let y = LY + 4 - BAY.scroll;
  for (const r of rows) {
    if (y > LY - RH && y < LY + LH) {
      if (r.h) { text(r.h, LX + 6, y + 5, COL.gold, FS); }
      else if (r.note) text(r.note, LX + 8, y + 4, COL.mute, FS);
      else {
        const sel = BAY.kind === r.k, hov = inBox(LX + 2, y, LW - 4, RH - 1) && inBox(LX, LY, LW, LH);
        if (sel || hov) rect(LX + 2, y, LW - 4, RH - 1, sel ? COL.void3 : COL.void2);
        if (sel) rect(LX + 2, y + 1, 2, RH - 3, COL.gold);
        emblemDraw(r.k, LX + 7, y + 3, sel ? COL.gold : COL.blueL);
        const ki = kindInfo(r.k); let nm = ki.n; if (r.k.startsWith('finisher:')) nm = nm.replace(' FINISHER', '');
        while (textW(nm, FS) > 70 && nm.length > 4) nm = nm.slice(0, -1);
        text(nm, LX + 16, y + 4, sel ? COL.ink : COL.cream, FS);
        if (S.track && S.track.k === 'dream' && (r.k === 'weapon' || r.k === 'galaxy')) text('*', LX + 16 + textW(nm, FS) + 2, y + 4, COL.pink, FS);
        const own = poolOwned(r.k), tot = poolSize(r.k); text(r.k.startsWith('finisher:') ? `${tot} LEFT` : `${own}/${tot}`, LX + LW - 6, y + 4, COL.mute, FS, 2);
        if (hov) { IN.cursor = 'pointer'; if (clickIn(LX + 2, y, LW - 4, RH - 1)) { BAY.kind = r.k; SND.play('click'); BAY.manual = false; BAY.tier = bestTier(r.k); } }
      }
    }
    y += RH;
  }
  ctx.restore();
  if (maxS > 0) { const sh = (LH - 4) * (LH - 6) / total; rect(LX + LW - 3, LY + 2 + (LH - 4 - sh) * (BAY.scroll / maxS), 2, sh, COL.steel); }
  // ---- center: the crate
  if (BAY.kind.startsWith('finisher:') && poolSize(BAY.kind) === 0) BAY.kind = 'weapon';
  if (BAY.auto) { BAY.auto = false; BAY.manual = false; }
  if (S.stats.crates === 0) BAY.kind = 'weapon';   // your first crate gives you a gun
  if (!BAY.manual) BAY.tier = bestTier(BAY.kind);   // always the best crate you can buy, unless you picked one yourself
  if (!tierUnlocked(BAY.tier)) BAY.tier = 0;
  const kind = BAY.kind, tier = BAY.tier, ki = kindInfo(kind);
  const cx = 222; const cost = crateCost(kind, tier); const tc = tierColor(tier);
  drawBeam(cx, 26, 132, 90, tc);
  textO(`${TIERS[tier].n} ${ki.n} CRATE`, cx, 28, COL.ink, '#000', FB, 1);
  const bob = Math.round(Math.sin(T_NOW * 2) * 2);
  ellipse(cx, 130, 46, 8, COL.void0); ellipse(cx, 128, 42, 6, COL.steel); ellipse(cx, 127, 38, 4, COL.void3); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; px(cx + Math.cos(a) * 41, 128 + Math.sin(a) * 6, (Math.floor(T_NOW * 8) + i) % 4 ? tc : '#fff'); }
  shadow(cx, 125, 32, 4, 0.5);
  ctx.drawImage(getCrate(tier, ki.em), cx - 48, 40 + bob, 96, 84);
  if (tier === 6) drawAccretion(cx, 82 + bob, 60, 14);
  // pool line + teaser
  const pool = poolFor(kind); const tot = poolSize(kind), own = poolOwned(kind);
  text(`${fmt(tot)} ITEMS INSIDE. YOU OWN ${fmt(own)}`, cx, 140, COL.dim, FS, 1);
  const dreams = [].concat(...pool.map(dreamsIn)).sort((a, b) => getDef(b).r - getDef(a).r);
  const top = dreams.length ? dreams.slice(0, 4) : []; if (!top.length) for (let r = 6; r >= 0 && top.length < 4; r--) { const P = pool[r]; const n = Math.min(4 - top.length, P.length); for (let k = 0; k < n; k++) top.push(P[Math.floor((k + 0.5) * P.length / n)]); }
  const off = Math.floor((4 - top.length) * 47 / 2);
  top.forEach((id, i) => {
    const bx = cx - 94 + off + i * 47, by = 149; const d = getDef(id); const tracked = S.track && S.track.k === 'dream' && S.track.dk === d.dream;
    panel(bx, by, 45, 22, { bg: COL.void0, bd: tracked ? COL.pink : owned(id) ? rcol(d.r) : d.dream !== undefined ? COL.gold : COL.steel, flat: true });
    drawItemIn(id, bx + 1, by + 1, 43, 20, { sil: !owned(id), maxSc: 1 });
    if (inBox(bx, by, 45, 22)) TIP.set(owned(id) ? { item: id } : d.dream !== undefined ? `${d.name} (${RAR[d.r].n} ${CLS[d.sub].n}): ${d.lore}` : `??? ${RAR[d.r].n} ${roleHint(id)}`);
  });
  text(dreams.length ? `DREAM WEAPONS INSIDE: ${dreams.filter(owned).length}/${dreams.length} FOUND` : 'THE BEST IN THIS CRATE', cx, 174, dreams.length ? COL.gold : COL.mute, FS, 1);
  // open buttons
  [1, 2, 5, 10].forEach((n, i) => {
    const bx = 128 + i * 48, by = 184, need = cost * n, ok = S.coins >= need;
    if (button(bx, by, 46, 28, '', { disabled: !ok, kind: i === 0 ? 'primary' : 'def', tip: ok ? `OPEN ${n} FOR ${fmt(need)} COINS` : `NEED ${fmt(need)} COINS. HAUL MORE ORE` })) startOpen(kind, tier, n);
    text('OPEN ' + n, bx + 23, by + 6, ok ? (i === 0 ? COL.navy : COL.ink) : COL.mute, FB, 1);
    const ct = fmt(need); const tw = textW(ct, FS) + 8; drawCoinMini(bx + 23 - tw / 2, by + 17, i === 0 && ok ? COL.navy : COL.gold); text(ct, bx + 23 - tw / 2 + 8, by + 18, ok ? (i === 0 ? COL.navy : COL.gold) : COL.mute, FS);
  });
  if (kp('Space') && S.coins >= cost) startOpen(kind, tier, 1);
  if (S.stats.crates === 0 && S.coins >= cost) { const ay = 170 + Math.round(Math.sin(T_NOW * 6) * 2); ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.moveTo(146, ay + 10); ctx.lineTo(156, ay + 10); ctx.lineTo(151, ay + 14); ctx.fill(); const tw = textW('START HERE', FS) + 8; panel(151 - tw / 2, ay, tw, 10, { bg: COL.pink, bd: '#fff', flat: true }); text('START HERE', 151, ay + 2, COL.navy, FS, 1); }
  // upgrader toggle
  const ux = 130, uy = 218; const uh = inBox(ux, uy, 186, 20);
  panel(ux, uy + 2, 10, 10, { bg: BAY.upgrader ? COL.pink : COL.void0, bd: uh ? COL.ink : COL.steel, flat: true }); if (BAY.upgrader) { line(ux + 2, uy + 7, ux + 4, uy + 9, COL.navy); line(ux + 4, uy + 9, ux + 8, uy + 4, COL.navy); }
  text('CRATE UPGRADER', ux + 15, uy + 2, BAY.upgrader ? COL.pink : COL.cream, FB); text(tier >= 7 ? 'ALREADY THE TOP TIER' : `${Math.round(UPG_CHANCE[tier] * 100)}% TO BUMP TO ${TIERS[tier + 1].n}. MISS AND IT BURNS`, ux + 15, uy + 11, COL.mute, FS);
  if (uh) IN.cursor = 'pointer'; if (clickIn(ux, uy, 186, 20)) { BAY.upgrader = !BAY.upgrader; SND.play('click'); }
  wrap('HIGHER TIERS COST MORE BUT ROLL MUCH BETTER RARITIES. NEW TIERS UNLOCK AS YOU REACH NEW PLANETS', 186, FS).forEach((l, k) => text(l, 130, 244 + k * 7, COL.dim, FS));
  // ---- right: tier ladder + exact odds
  const RX = 322, RY = 24, RW = W - RX - 4;
  panel(RX, RY, RW, H - RY - 4, { bg: COL.void1 });
  text('PICK A TIER', RX + 6, RY + 4, COL.gold, FS); text('ODDS', RX + 86, RY + 4, COL.mute, FS); text('PRICE', RX + RW - 6, RY + 4, COL.mute, FS, 2);
  for (let t = 0; t < 8; t++) {
    const by = RY + 12 + t * 15, ok = tierUnlocked(t), sel = t === tier, hov = inBox(RX + 2, by, RW - 4, 14);
    if (sel) panel(RX + 2, by, RW - 4, 14, { bg: COL.void3, bd: COL.gold, flat: true }); else if (hov) rect(RX + 2, by, RW - 4, 14, COL.void2);
    miniCrate(RX + 7, by + 3, t, ok);
    text(TIERS[t].n, RX + 22, by + 5, ok ? (sel ? COL.ink : COL.cream) : COL.mute, FS);
    // stacked odds bar for this tier
    const o = oddsFor(kind, t);
    if (ok) { let bx = RX + 86; const bw = 34; for (let r = 0; r < 7; r++) { const w2 = o[r] / 100 * bw; if (w2 <= 0) continue; rect(bx, by + 5, Math.max(1, Math.round(w2)), 4, rcol(r)); bx += w2; } text(fmt(crateCost(kind, t)), RX + RW - 6, by + 5, sel ? COL.gold : COL.dim, FS, 2); }
    else { const lx = RX + RW - 6 - textW(TIERS[t].unlock === 'nova' ? 'AFTER SUPERNOVA' : 'REACH PLANET ' + TIERS[t].unlock, FS); rect(lx - 8, by + 4, 5, 4, COL.mute); rect(lx - 7, by + 2, 3, 2, COL.mute); text(TIERS[t].unlock === 'nova' ? 'AFTER SUPERNOVA' : 'REACH PLANET ' + TIERS[t].unlock, RX + RW - 6, by + 5, COL.mute, FS, 2); }
    if (hov) { IN.cursor = ok ? 'pointer' : 'default'; TIP.set(ok ? `${TIERS[t].n}: ${fmt(crateCost(kind, t))} COINS. LEGENDARY OR BETTER ${fmtPct(o[4] + o[5] + o[6])}` : `${TIERS[t].n} UNLOCKS ${TIERS[t].unlock === 'nova' ? 'AFTER YOUR FIRST SUPERNOVA' : 'WHEN YOU REACH PLANET ' + TIERS[t].unlock}`); }
    if (clickIn(RX + 2, by, RW - 4, 14)) { if (ok) { BAY.tier = t; BAY.manual = t !== bestTier(BAY.kind); SND.play('click'); } else SND.play('deny'); }
  }
  let yy = RY + 136; rect(RX + 6, yy - 3, RW - 12, 1, COL.steel);
  text(`EXACT ODDS: ${TIERS[tier].n}`, RX + 6, yy, COL.gold, FS); yy += 9;
  const odds = oddsFor(kind, tier);
  for (let r = 0; r < 7; r++) {
    const has = pool[r].length > 0;
    rect(RX + 6, yy, 4, 4, has ? rcol(r) : COL.void3); text(RAR[r].n, RX + 13, yy, has ? (r === 6 ? 'RAINBOW' : RAR[r].c) : COL.mute, FS);
    if (has) text(`${pool[r].filter(owned).length}/${pool[r].length}`, RX + 98, yy, COL.mute, FS, 2);
    text(fmtPct(odds[r]), RX + RW - 6, yy, has ? COL.ink : COL.mute, FS, 2); yy += 8;
  }
  yy += 3; rect(RX + 6, yy - 2, RW - 12, 1, COL.steel); yy += 2;
  const mods = [];
  if (S.firstOpen) mods.push(['FIRST CRATE EVER: RARE OR BETTER', COL.lilac]);
  const lk = luckPct(); if (lk > 0 && !kind.startsWith('finisher')) mods.push([`LUCK ${lk}%: ODDS SHIFTED UP`, COL.blueL]);
  if (kind.startsWith('class:')) mods.push([`ONLY ${CLS[kind.split(':')[1]].n}S`, COL.pink]);
  if (kind.startsWith('salvage:')) mods.push([`ONLY ${planetDef(+kind.split(':')[1]).name} GEAR`, COL.pink]);
  if (kind.startsWith('boss:')) mods.push(['BOSS GEAR ONLY, RARE OR BETTER', COL.pink]);
  if (kind.startsWith('finisher:')) mods.push([`ONLY YOUR ${tot} MISSING PIECES`, COL.gold]);
  if (BAY.upgrader && tier < 7) mods.push([`UPGRADER: ${Math.round(UPG_CHANCE[tier] * 100)}% BUMP, ${100 - Math.round(UPG_CHANCE[tier] * 100)}% BURN`, COL.pink]);
  mods.push([`DOUBLE OR NOTHING: ${donChance(0)}% ON COMMONS, LESS THE RARER IT IS`, COL.dim]);
  for (const [m, c] of mods) { if (yy > H - 12) break; text(m, RX + 6, yy, c, FS); yy += 8; }
  coachBay();
}
function drawCoinMini(x, y, c = COL.gold) { x = Math.floor(x); y = Math.floor(y); rect(x + 1, y, 3, 5, c); rect(x, y + 1, 5, 3, c); px(x + 1, y + 1, c === COL.gold ? '#fff2c4' : c); }
function drawBeam(cx, y0, y1, wd, c) {
  ctx.fillStyle = c;
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) / (y1 - y0); const ww = wd * (0.55 + 0.45 * k) + Math.sin(y * 0.15 + T_NOW * 4) * 2;
    for (let x = -ww / 2; x < ww / 2; x++) { const e = 1 - Math.abs(x) / (ww / 2); const v = e * e * (0.35 + 0.25 * k) * (0.85 + 0.15 * Math.sin(T_NOW * 3)); if (dith(Math.floor(cx + x), y, v)) ctx.fillRect(Math.floor(cx + x), y, 1, 1); }
  }
}
function mixHex(a, b, t) { return hex(mix(hexRgb(a.length === 7 ? a : '#888888'), hexRgb(b), t)); }
function drawAccretion(cx, cy, rx, ry, front) {
  for (let a = 0; a < TAU; a += 0.03) { const s = Math.sin(a + T_NOW); const x = cx + Math.cos(a + T_NOW) * rx, y = cy + s * ry; px(x, y, s > 0 ? '#b79ced' : '#5e548e'); if ((a * 10 | 0) % 3 === 0) px(x, y - 1, '#fafaff'); }
}
let BAY_BG = null;
function drawBayBackground() {
  if (!BAY_BG) { BAY_BG = mkCanvas(W, H); const g = BAY_BG.x; g.fillStyle = '#05060d'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { g.fillStyle = (x / 16 + y / 16) % 2 ? '#0c1229' : '#0a0f22'; g.fillRect(x, y, 16, 16); g.fillStyle = '#161f3f'; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 16); } const gr = g.createRadialGradient(222, 90, 10, 222, 90, 200); gr.addColorStop(0, 'rgba(113,97,239,0.22)'); gr.addColorStop(0.5, 'rgba(190,149,196,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  ctx.drawImage(BAY_BG, 0, 0);
  if (HUB.flashT > 0) { ctx.globalAlpha = 0.12 * Math.min(1, HUB.flashT) * (0.6 + 0.4 * Math.sin(T_NOW * 10)); rect(0, 0, W, H, HUB.flashCol === 'RAINBOW' ? rainbow(T_NOW) : HUB.flashCol); ctx.globalAlpha = 1; }
}

// ---------- opening ----------
function startOpen(kind, tier, n) {
  if (poolSize(kind) === 0) { SND.play('deny'); toast('THIS CRATE IS EMPTY. YOU OWN EVERYTHING IN IT', COL.dim); BAY.kind = 'weapon'; return; }
  const cost = crateCost(kind, tier) * n;
  if (S.coins < cost) { SND.play('deny'); toast('NOT ENOUGH COINS. HAUL MORE ORE', COL.coral); return; }
  S.coins -= cost; S.stats.crates += n; passXP(25 * n); firstTime('crate'); dirty();
  OPEN = { kind, tier, n, cost, t: 0, st: BAY.upgrader ? 'upgrade' : 'insert', st_t: 0, results: [], shadow: {}, keysFly: [], parts: new Particles(1200), cards: [], sel: -1, demo: null, upg: null, list: null };
  if (tier >= 7) OPEN.st = 'insert';
  if (OPEN.st === 'upgrade') OPEN.upg = { a: 0, v: 14 + R0() * 4, done: false, p: UPG_CHANCE[tier] };
  rollResults();
  setScene('open'); SND.playSong(null);
}
// crates earned during a haul open for free right after it
function startHaulOpen(list) {
  if (!list.length) return goHub();
  S.stats.crates += list.length; passXP(25 * list.length); dirty();
  const best = list.reduce((a, c) => c.tier > a.tier ? c : a, list[0]);
  OPEN = { kind: list.length === 1 ? list[0].kind : 'galaxy', tier: best.tier, n: list.length, cost: 0, t: 0, st: 'insert', st_t: 0, results: [], shadow: {}, keysFly: [], parts: new Particles(1200), cards: [], sel: -1, demo: null, upg: null, list, haul: true };
  rollResults();
  setScene('open'); SND.playSong(null);
}
function rollResults() {
  const O = OPEN; O.results = [];
  const firstR = {};
  for (let i = 0; i < O.n; i++) {
    const kd = O.list ? O.list[i].kind : O.kind, tr = O.list ? O.list[i].tier : O.tier;
    const id = rollCrate(kd, tr, O.list ? { noFirst: true } : {}); const r = getDef(id).r; let first = false;
    if (r >= 3 && !firstR[r] && !Object.keys(S.inv).some(x => getDef(x).r === r)) { first = true; firstR[r] = 1; }
    O.results.push({ id, labels: labelsSim(id, O.shadow, tr), lost: false, first, kind: kd, tier: tr });
  }
  O.best = Math.max(...O.results.map(r => getDef(r.id).r));
  O.hint = O.best; O.fake = O.best >= 3 && R0() < 0.55 ? Math.max(1, O.best - 1 - R0.int(2)) : null;
  O.keysFly = []; if (!O.haul) for (let i = 0; i < Math.min(8, 2 + O.n); i++) O.keysFly.push({ d: i * 0.07 });
}
function labelsSim(id, sh, tier = 0) {
  const real = S.inv[id]; const sim = sh[id] ? Object.assign({}, sh[id]) : (real ? Object.assign({}, real) : null);
  const save = S.inv[id]; if (sim) S.inv[id] = sim; else delete S.inv[id];
  const L = pullLabels(id, tier);
  if (save) S.inv[id] = save; else delete S.inv[id];
  // advance shadow
  if (!sim) sh[id] = { l: 1, p: 0, g: tier }; else { if (sim.l < 10) { sim.p++; if (sim.p >= sim.l) { sim.p -= sim.l; sim.l++; } } sim.g = Math.max(sim.g || 0, tier); sh[id] = sim; }
  return L;
}
function pullValue(r) { const d = getDef(r.id); return Math.round(SELL_VAL[d.r] * (1 + 0.1 * (r.tier ?? (OPEN ? OPEN.tier : 0)))); }
function sellPull(r) { if (r.lost || r.sold) return 0; const v = pullValue(r); r.sold = true; S.coins += v; S.stats.sold = (S.stats.sold || 0) + 1; SND.play('coin'); dirty(); return v; }
function collectOpen() {
  const O = OPEN; if (!O || O.collected) return; O.collected = true; const got = [];
  for (const r of O.results) if (!r.lost && !r.sold) { const res = addItem(r.id, r.tier ?? O.tier); got.push(res); }
  const ups = got.filter(g => g.levelUp).length, news = got.filter(g => g.isNew).length, rs = got.reduce((a, g) => a + g.research, 0);
  if (news) toast(`${news} NEW DISCOVER${news > 1 ? 'IES' : 'Y'} ADDED`, COL.mint);
  if (ups) toast(`${ups} ITEM${ups > 1 ? 'S' : ''} LEVELED UP`, COL.cyan);
  if (rs) toast(`+${rs} RESEARCH MATERIAL`, COL.dim);
  addXP(O.n * 3); checkTitles(); dirty(); save();
  const best = Math.max(-1, ...O.results.filter(r => !r.lost).map(r => getDef(r.id).r));
  if (best >= 4) { HUB.flashT = 4; HUB.flashCol = RAR[best].c; }
}
function updateOpen(dt) {
  const O = OPEN; O.t += dt; O.st_t += dt; O.parts.update(dt);
  const fast = IN.pr && !['show', 'summary', 'burned', 'reel', 'upgrade', 'detail', 'don'].includes(O.st);
  if (fast) O.st_t += 0.5;
  switch (O.st) {
    case 'upgrade': {
      const u = O.upg;
      if (!u.done) {
        u.a += u.v * dt; u.v *= Math.pow(0.48, dt); if (u.v < 0.5) { u.done = true; u.doneT = O.st_t; u.v = 0; const k = ((u.a % TAU) + TAU) % TAU; u.win = k < TAU * u.p; if (u.win) { SND.play('upgradeHint'); flash(0.6, tierColor(Math.min(7, O.tier + 1))); } else { SND.play('lose'); flash(0.4, '#ff4020'); } }
        if (Math.floor(u.a * 3) !== Math.floor((u.a - u.v * dt) * 3)) SND.play('spin', u.v);
      } else if (O.st_t - u.doneT > 1.4) {
        if (u.win && O.tier < 7 && (O.tier + 1 < 7 || S.nova.count > 0)) { O.tier++; rollResults(); O.st = 'insert'; O.st_t = 0; toast(`UPGRADED TO ${TIERS[O.tier].n}!`, COL.magenta); }
        else if (u.win) { O.st = 'insert'; O.st_t = 0; }
        else { O.st = 'burned'; O.st_t = 0; O.results.forEach(r => r.lost = true); for (let i = 0; i < 60; i++) O.parts.add({ x: W / 2 + (R0() - 0.5) * 80, y: 120 + (R0() - 0.5) * 60, vx: (R0() - 0.5) * 40, vy: -40 - R0() * 60, life: 1.2, c: R0() < 0.5 ? '#ff7a2e' : '#fca311', s: 2, t: 'shrink' }); SND.play('boom'); }
      }
      break;
    }
    case 'insert': {
      for (const k of O.keysFly) { if (!k.snd && O.st_t > k.d + 0.35) { k.snd = true; SND.play('coin'); } }
      if (O.st_t > 0.35 + O.keysFly.length * 0.07 + 0.5) { O.st = 'shake'; O.st_t = 0; SND.play('unlock'); }
      break;
    }
    case 'shake': {
      const dur = 1.3 + O.tier * 0.12 + (O.best >= 4 ? 0.5 : 0);
      O.shakeK = O.st_t / dur;
      const iv = Math.max(0.06, 0.28 - O.shakeK * 0.22); O.lastShake = O.lastShake || 0;
      if (O.st_t - O.lastShake > iv) { O.lastShake = O.st_t; SND.play('shake', Math.floor(O.shakeK * 8)); if (R0() < 0.6) SND.play('crack', O.shakeK * 4); }
      O.hint = (O.fake !== null && O.shakeK < 0.72) ? O.fake : O.best;
      if (O.fake !== null && O.shakeK >= 0.72 && !O.fakeDone) { O.fakeDone = true; SND.play('upgradeHint'); flash(0.7, RAR[O.best].c === 'RAINBOW' ? '#fff' : RAR[O.best].c); O.parts.burst(W / 2, 115, 30, { c: [rcol(O.best), '#fff'], sp: 160 }); }
      if (R0() < O.shakeK) O.parts.add({ x: W / 2 + (R0() - 0.5) * 70, y: 115 + (R0() - 0.5) * 50, vx: (R0() - 0.5) * 30, vy: -30 - R0() * 40, life: 0.6, c: rcol(O.hint), s: 1 });
      if (O.st_t > dur) { O.st = 'burst'; O.st_t = 0; SND.play('burst'); flash(1, '#fff'); shake(6 + O.best * 1.5); O.parts.burst(W / 2, 115, 80 + O.best * 20, { c: [rcol(O.best), '#fff', rcol(O.best)], sp: 260, life: 1, s: 2, t: 'shrink' }); }
      break;
    }
    case 'burst': {
      if (O.st_t > 0.55) { O.st_t = 0; if (O.n === 1) { O.st = 'reel'; buildReel(); } else { O.st = 'cards'; buildCards(); } }
      break;
    }
    case 'reel': updateReel(dt); break;
    case 'build': { if (O.st_t > 1.25 || (IN.pr && O.st_t > 0.2)) { O.st = 'show'; O.st_t = 0; revealFx(O.results[0].id); } break; }
    case 'cards': updateCards(dt); break;
    case 'don': updateDoN(dt); break;
  }
  if (O.demo) updateDemo(O.demo, dt);
}
function revealFx(id) {
  const d = getDef(id); SND.play('reveal', d.r);
  if (d.r >= 4) { shake(4 + d.r * 2); flash(0.8, d.r === 6 ? '#fff' : RAR[d.r].c); FX.hitstop = 0.1; HUB.flashT = 4; HUB.flashCol = RAR[d.r].c; }
  OPEN.parts.burst(150, 110, 30 + d.r * 15, { c: [rcol(d.r), '#fff'], sp: 140 + d.r * 30, life: 0.9, s: 2, t: 'shrink' });
  if (d.r >= 5) for (let i = 0; i < 3; i++) OPEN.parts.add({ x: 150, y: 110, vx: 0, vy: 0, life: 0.6 + i * 0.2, c: rcol(d.r), s: 60 + i * 30, t: 'ring' });
  if (OPEN.results.findIndex(r => r.id === id) >= 0 || OPEN.st === 'show') OPEN.stamp = 0;
  OPEN.demo = makeDemo(id);
}
// ---------- reel ----------
function buildReel() {
  const O = OPEN, win = O.results[0].id, wr = getDef(win).r; const odds = oddsFor(O.kind, O.tier); const pool = poolFor(O.kind);
  const items = []; const N = 50, WI = 42;
  for (let i = 0; i < N; i++) {
    if (i === WI) { items.push(win); continue; }
    let r = rollRarity(odds); if (!pool[r].length) r = 0; const arr = pool[r].length ? pool[r] : pool.find(a => a.length);
    items.push(arr[R0.int(arr.length)]);
  }
  if (wr < 4 && R0() < 0.6) { for (let r = 6; r > wr; r--) if (pool[r].length) { items[WI + 1] = pool[r][R0.int(pool[r].length)]; break; } }
  if (R0() < 0.4) { for (let r = 5; r > wr; r--) if (pool[r].length) { items[WI - 1] = pool[r][R0.int(pool[r].length)]; break; } }
  O.reel = { items, WI, CW: 56, pos: 0, target: WI * 56 + (R0() - 0.5) * 44, dur: 6.4, t: 0, last: -1 };
}
function updateReel(dt) {
  const O = OPEN, rl = O.reel; rl.t += dt * (IN.down && rl.t > 0.3 ? 3 : 1);
  const k = Math.min(1, rl.t / rl.dur); const e = 1 - Math.pow(1 - k, 4);
  rl.pos = rl.target * e;
  const idx = Math.floor((rl.pos + rl.CW / 2) / rl.CW);
  if (idx !== rl.last) { rl.last = idx; const v = 4 * Math.pow(1 - k, 3); SND.play('tick', 500 + v * 900); }
  if (k >= 1) { if (!rl.endT) { rl.endT = rl.t; } if (rl.t - rl.endT > 0.45) { O.st = 'build'; O.st_t = 0; prepBuild(O.results[0].id); SND.play('crack', 6); } }
}
function prepBuild(id) {
  const s = getItemSpr(id), c = s.frames[0], d = c.x.getImageData(0, 0, c.width, c.height).data; const pts = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const o = (y * c.width + x) * 4; if (d[o + 3]) pts.push([x, y, `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`, R0() * 0.25 + x / c.width * 0.6 + (c.height - y) / c.height * 0.15]); }
  pts.sort((a, b) => a[3] - b[3]); OPEN.build = { pts, id };
}
// ---------- multi cards ----------
function buildCards() {
  const O = OPEN; const n = O.n; const order = O.results.map((r, i) => i).sort((a, b) => getDef(O.results[a].id).r - getDef(O.results[b].id).r);
  const cols = n <= 5 ? n : 5, rows = Math.ceil(n / cols), CW = 74, CH = 84, gx = 8;
  const x0 = W / 2 - (cols * CW + (cols - 1) * gx) / 2, y0 = rows === 1 ? 70 : 34;
  O.cards = order.map((ri, k) => ({ ri, x: x0 + (k % cols) * (CW + gx), y: y0 + Math.floor(k / cols) * (CH + 10), w: CW, h: CH, flip: 0, flipped: false, t0: 0.15 + k * 0.08 }));
  O.flipIdx = 0; O.flipT = 1.1;
}
function updateCards(dt) {
  const O = OPEN;
  O.flipT -= dt * (IN.down ? 4 : 1);
  if (O.flipIdx < O.cards.length && O.flipT <= 0) {
    const c = O.cards[O.flipIdx]; c.flipped = true; c.ft = 0; const d = getDef(O.results[c.ri].id);
    SND.play('flip'); SND.play('reveal', Math.min(d.r, 6));
    O.parts.burst(c.x + c.w / 2, c.y + c.h / 2, 12 + d.r * 8, { c: [rcol(d.r), '#fff'], sp: 80 + d.r * 25, life: 0.6, s: 1 });
    if (d.r >= 4) { shake(3 + d.r); flash(0.5, d.r === 6 ? '#fff' : RAR[d.r].c); HUB.flashT = 4; HUB.flashCol = RAR[d.r].c; }
    O.flipIdx++; const next = O.cards[O.flipIdx]; O.flipT = next ? (getDef(O.results[next.ri].id).r >= 4 ? 1.4 : getDef(O.results[next.ri].id).r >= 2 ? 0.6 : 0.42) : 0;
  }
  for (const c of O.cards) if (c.flipped) c.ft += dt;
  if (O.flipIdx >= O.cards.length && O.cards.every(c => c.ft >= 0.2)) { O.st = 'summary'; O.st_t = 0; }
}
// ---------- double or nothing ----------
// big, pulsing, impossible to miss
function donButton(x, y, w, h, r, can) {
  if (r.lost) return button(x, y, w, h, 'THE PULL IS GONE', { disabled: true, font: FS });
  if (!can) return button(x, y, w, h, 'ALREADY COSMIC: CAN\'T DOUBLE', { disabled: true, font: FS });
  const pulse = 0.5 + 0.5 * Math.sin(T_NOW * 5);
  ctx.globalAlpha = 0.25 + 0.3 * pulse; rect(x - 3, y - 3, w + 6, h + 6, '#ff5cb0'); ctx.globalAlpha = 1;
  const hit = button(x, y, w, h, '', { kind: 'don' });
  // dice icon
  const dx = x + 6, dy = y + 4; rect(dx, dy, 12, 12, '#fff'); rect(dx + 1, dy + 1, 10, 10, '#ffe3f2');
  for (const [a, b] of [[3, 3], [8, 8], [3, 8], [8, 3], [5.5, 5.5]]) rect(dx + a, dy + b, 2, 2, '#a8286a');
  text('DOUBLE OR NOTHING', x + 24, y + 3, '#ffffff', FB);
  text(`${donChance(getDef(r.id).r)}% TO WIN`, x + 24, y + 12, '#ffe3f2', FS);
  text('X2', x + w - 8, y + 6, Math.floor(T_NOW * 4) % 2 ? '#fff25a' : '#ffffff', FB, 2);
  return hit;
}
function startDoN(i) {
  const O = OPEN; const r = O.results[i]; const d = getDef(r.id); if (d.r >= 6 || r.lost) return;
  const kd = r.kind || O.kind; const up = rollUpSame(r.id, d.r) || rollUp(kd.startsWith('finisher') ? 'galaxy' : kd, d.r); if (!up) { toast('NOTHING HIGHER IN THIS POOL', COL.dim); return; }
  O.don = { i, t: 0, a: 0, v: 16 + R0() * 3, win: null, up, from: r.id, back: O.st, p: donChance(d.r) / 100 };
  O.st = 'don'; SND.play('click');
}
function updateDoN(dt) {
  const O = OPEN, dn = O.don; dn.t += dt;
  if (dn.win === null) {
    dn.a += dn.v * dt; dn.v *= Math.pow(0.42, dt);
    if (Math.floor(dn.a * 3) !== Math.floor((dn.a - dn.v * dt) * 3)) SND.play('spin', dn.v);
    if (dn.v < 0.45) { const k = ((dn.a % TAU) + TAU) % TAU; const p = dn.p; dn.win = k < TAU * p; dn.t2 = 0;
      const r = O.results[dn.i];
      if (dn.win) { S.stats.donWins++; r.dons = (r.dons || 0) + 1; r.id = dn.up; r.labels = labelsSim(dn.up, O.shadow, r.tier || O.tier); r.labels.unshift('DOUBLED'); SND.play('win'); }
      else { r.lost = true; SND.play('lose'); O.parts.burst(150, 110, 60, { c: [rcol(getDef(dn.from).r), '#fff', '#555'], sp: 200, life: 1, s: 2, g: 200 }); shake(5); }
    }
  } else {
    dn.t2 += dt;
    if (dn.t2 > 1.3) {
      if (dn.win) { O.st = dn.back === 'summary' || dn.back === 'detail' ? 'detail' : 'build'; O.st_t = 0; O.sel = dn.i; if (O.st === 'build') prepBuild(O.results[dn.i].id); else revealFx(O.results[dn.i].id); }
      else { O.st = dn.back === 'summary' || dn.back === 'detail' ? 'summary' : 'show'; O.st_t = 0; }
      O.don = null;
    }
  }
}
// ---------- holo demos ----------
function makeDemo(id) {
  const d = getDef(id); const D = { id, d, t: 0, kind: 'astro' };
  if (d.cat === 'w' || (d.cat === 'k' && d.sub === 'weapon')) {
    const wid = d.cat === 'w' ? id : S.eq.weapon; const L = lvl(id) || 1;
    const Wd = getDef(wid); const Wst = Object.assign(wStats(Wd, d.cat === 'w' ? effL(id, Math.max(1, L), Math.max(gradeOf(id), (OPEN && OPEN.tier) || 0)) : effL(wid)), { col: weaponColor(d.cat === 'k' ? id : wid) });
    if (d.cat === 'k') { const p = itemPal(d); Wst.col = { core: hex(p.G[4]), mid: hex(p.G[3]), edge: hex(p.G[2]), dark: hex(p.G[1]) }; }
    const w = makeWorld({ demo: true, pi: Math.max(1, S.planet.cur || 1), bounds: [8, 20, 60, 100] });
    w.hpMul = 1; w.dmgMul = 1; w.sndOn = false;
    const pl = makePlayer(34, 70, loadout()); pl.W = Wst; pl.hp = pl.maxHp = 999; w.player = pl;
    D.kind = 'weapon'; D.w = w; D.W = Wst; D.wid = wid; D.skin = d.cat === 'k' ? id : (Wd.id === S.eq.weapon ? S.eq.skin_weapon : null);
  } else if (d.cat === 's' || (d.cat === 'k' && d.sub === 'ship')) D.kind = 'ship';
  else if (d.cat === 't' || (d.cat === 'k' && d.sub === 'tool')) D.kind = d.sub === 'miner' ? 'miner' : 'tool';
  else if (d.cat === 'c' && d.sub === 'killfx') { D.kind = 'killfx'; D.fx = new Particles(300); }
  else if (d.cat === 'c' && d.sub === 'trail') { D.kind = 'trail'; D.fx = new Particles(300); }
  else if (d.cat === 'b') D.kind = 'backdrop';
  else if (d.cat === 'g') { D.kind = 'gadget'; D.w = makeGadgetDemo(id); }
  else if (d.cat === 'p') D.kind = 'pet';
  return D;
}
function updateDemo(D, dt) {
  D.t += dt;
  if (D.kind === 'gadget') {
    const w = D.w, pl = w.player; w.t += dt; pl.G.cd -= dt;
    while (w.ents.filter(e => !e.dead).length < 4) { const e = spawnEnemy(w, R0() < 0.5 ? 'crawler' : 'swarm', 100 + R0() * 50, 35 + R0() * 60); e.hp = e.maxHp = pl.G.dmg * (2 + R0() * 3) + 20; e.spd = 10; }
    const tg = nearestEnemy(w, pl.x, pl.y, 999); pl.aim = tg ? Math.atan2(tg.y - pl.y, tg.x - pl.x) : 0; pl.dir = 3;
    if (pl.G.cd <= 0 && tg) useGadget(w, pl, tg.x, tg.y);
    updateShots(w, dt); updateEnemies(w, dt); updateEShots(w, dt); updateTele(w, dt); w.fx.update(dt); w.zaps.forEach(z => z.t += dt); w.zaps = w.zaps.filter(z => z.t < 0.15);
    if (pl.x !== 40 && pl.G.k === 'blink' && pl.G.cd < pl.G.max - 0.6) { pl.x = 40; pl.y = 70; }
    return;
  }
  if (D.kind === 'weapon') {
    const w = D.w, pl = w.player, W = D.W; w.t += dt;
    const near = W.cls === 'blade' ? [58, 66] : [110, 150];
    while (w.ents.length < 3) { const e = spawnEnemy(w, 'crawler', near[0] + R0() * (near[1] - near[0]), 40 + R0() * 60); e.hp = e.maxHp = W.dmg * (3 + R0() * 4); e.spd = 8; }
    const tg = nearestEnemy(w, pl.x, pl.y, 999);
    const ax = tg ? tg.x : 140, ay = tg ? tg.y : 70;
    pl.aim = Math.atan2(ay - (pl.y - 6), ax - pl.x);
    let fire = true; if (W.cls === 'railgun') fire = (D.t % 1.6) < 1.25;
    const inp = { mx: 0, my: 0, ax, ay, fire, boost: false };
    pl.dir = Math.cos(pl.aim) < 0 ? 2 : 3;
    fireWeapon(w, pl, W, inp, dt); updateDrones(w, pl, W, dt);
    updateShots(w, dt); updateMines(w, dt); updateEnemies(w, dt); w.fx.update(dt);
  } else if (D.fx) {
    D.fx.update(dt);
    if (D.kind === 'killfx') { D.cd = (D.cd || 0) - dt; if (D.cd <= 0) { D.cd = 1.1; const kp0 = itemPal(D.d); const w = { fx: D.fx }; const kx = 120 + R0() * 30, ky = 60 + R0() * 20; burstKill(w, kx, ky, D.d.style, [hex(kp0.P[3]), hex(kp0.G[3]), hex(kp0.S[3]), '#fff'], 1); killFlair(D.fx, kx, ky, D.d.r); } }
    if (D.kind === 'trail') { const x = 85 + Math.cos(D.t * 1.6) * 50, y = 66 + Math.sin(D.t * 3.2) * 18; D.px = x; D.py = y; const w = { fx: D.fx }; if (R0() < 0.7) trailFx(w, { x, y }, D.d); }
  }
}
function drawDemo(D, x, y, w, h) {
  panel(x, y, w, h, { bg: '#0a0b1e', bd: COL.cyan });
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
  // holo floor grid
  ctx.globalAlpha = 0.25; for (let gx = x + ((T_NOW * 8) % 12); gx < x + w; gx += 12) rect(gx, y + 1, 1, h, '#5e548e'); for (let gy = y + 8; gy < y + h; gy += 12) rect(x, gy, w, 1, '#5e548e'); ctx.globalAlpha = 1;
  const eq = Object.assign({}, S.eq); const d = D.d;
  if (D.kind === 'weapon') {
    const wd = D.w; const ox = -x, oy = -y;
    drawHazards(wd, ox, oy);
    for (const e of wd.ents) drawEnemy(wd, e, ox, oy);
    const eq2 = Object.assign({}, eq, { weapon: D.wid, skin_weapon: D.skin });
    drawPlayer(wd, wd.player, ox, oy, eq2);
    drawShots(wd, ox, oy); wd.fx.draw(ox, oy);
  } else if (D.kind === 'gadget') {
    const wd = D.w; const ox = -x, oy = -y;
    drawHazards(wd, ox, oy);
    for (const e of wd.ents) drawEnemy(wd, e, ox, oy);
    drawPlayer(wd, wd.player, ox, oy, eq); drawShots(wd, ox, oy); wd.fx.draw(ox, oy);
    for (const z of wd.zaps) line(z.x0 + x, z.y0 + y, z.x1 + x, z.y1 + y, z.col || '#fff25a');
    const G = wd.player.G; text(G.cd > 0 ? 'RECHARGING ' + Math.max(0, G.cd).toFixed(1) + 'S' : 'READY', x + w - 4, y + h - 9, G.cd > 0 ? COL.mute : COL.gold, FS, 2);
  } else if (D.kind === 'pet') {
    shadow(x + 60, y + h - 18, 14, 3, 0.4); ctx.drawImage(astroSprite(eq, 3, 0), x + 44, y + h - 18 - 52, 40, 52);
    drawPetAt(D.id, x + 104, y + h - 16, 2, true);
    text(PETS[d.sub].n, x + w - 4, y + h - 9, COL.cream, FS, 2);
  } else if (D.kind === 'backdrop') {
    drawBackdropPreview(D.id, x + 1, y + 1, w - 2, h - 2, { noFrame: true });
    const sp = astroSprite(eq, 3, 0); shadow(x + 40, y + h - 10, 12, 3, 0.4); ctx.drawImage(sp, x + 26, y + h - 10 - 39, 30, 39);
    text('YOUR STATION', x + w - 4, y + h - 9, COL.cream, FS, 2);
  } else if (D.kind === 'ship') {
    const eq2 = Object.assign({}, eq); if (d.cat === 's') eq2[d.sub] = D.id; else eq2.skin_ship = D.id;
    drawShip(eq2, x + w / 2 - 48, y + h / 2 - 32 + Math.round(Math.sin(D.t * 2) * 2), 2, D.t, { shield: d.sub === 'shield' });
  } else if (D.kind === 'tool' || D.kind === 'miner') {
    const ox = x + 55, oy = y + 72; const pi = Math.max(1, S.planet.cur || 1);
    const os = oreSprite(pi, 2, Math.floor(T_NOW * 8) % 8); ctx.drawImage(os, x + 104, oy - os.height + 3);
    if (D.kind === 'miner') { drawItem(D.id, x + 100, oy - 40 + Math.round(Math.sin(D.t * 3) * 2), 2); if (Math.floor(D.t * 2) % 2) text('+COINS', x + 118, y + 12, COL.gold, FS, 1); }
    else {
      const eq2 = Object.assign({}, eq); if (d.cat === 't') eq2.tool = D.id; else eq2.skin_tool = D.id;
      const pl = { x: ox - x + x, y: oy, dir: 3, moving: false, walk: 0, aim: -0.1, mode: 'tool', recoil: 0, inv: 0, charge: 0, hurtT: 0 };
      drawPlayer({}, pl, 0, 0, eq2);
      const c = weaponColor(eq2.tool); for (let i = 0; i < 2; i++) line(ox + 14, oy - 9, x + 112 + (R0() - 0.5) * 6, oy - 8 + (R0() - 0.5) * 6, i ? c.core : c.mid);
      if (R0() < 0.3) px(x + 112 + (R0() - 0.5) * 12, oy - 10 - R0() * 8, '#fff');
    }
  } else {
    const eq2 = Object.assign({}, eq); const sl = slotOf(d); if (sl) eq2[sl] = D.id;
    const dirs = [0, 3, 1, 2]; const dir = D.kind === 'trail' ? (Math.cos(D.t * 1.6) * -1 > 0 ? 3 : 2) : dirs[Math.floor(D.t / 1.2) % 4];
    const fr = D.kind === 'trail' ? 1 + Math.floor(D.t * 9) % 3 : 0;
    const spr = astroSprite(eq2, dir, fr === 2 ? 0 : fr);
    if (D.kind === 'trail') { D.fx.draw(-x, -y); ctx.drawImage(spr, Math.floor(x + D.px - 10), Math.floor(y + D.py - 25)); }
    else if (D.kind === 'killfx') { const e = Math.floor(D.t * 6) % 2; if ((D.cd || 0) > 0.5) ctx.drawImage(alienSprite(Math.max(1, S.planet.cur || 1), 'crawler', e, false), x + 112, y + 52); D.fx.draw(-x, -y); ctx.drawImage(astroSprite(eq, 3, 0), x + 30, y + 40); }
    else { shadow(x + w / 2, y + h - 18, 16, 4, 0.4); ctx.drawImage(spr, x + w / 2 - 30, y + h - 18 - 75, 60, 78); }
  }
  // scanlines + flicker
  ctx.globalAlpha = 0.18; for (let yy = y + (Math.floor(T_NOW * 30) % 2); yy < y + h; yy += 2) rect(x, yy, w, 1, '#000'); ctx.globalAlpha = 1;
  const sweep = y + ((T_NOW * 40) % (h + 20)) - 10; ctx.globalAlpha = 0.12; rect(x, sweep, w, 4, COL.cyan); ctx.globalAlpha = 1;
  ctx.restore();
  text('HOLO DEMO', x + 4, y + 3, COL.cyan, FS);
}

// ---------- draw opening ----------
function drawOpen(dt) {
  const O = OPEN;
  rect(0, 0, W, H, '#03040b');
  // spotlight rays
  const showR = (O.st === 'show' || O.st === 'detail' || O.st === 'build') && O.results[O.st === 'detail' ? O.sel : 0] ? getDef(O.results[O.st === 'detail' ? O.sel : 0].id).r : -1;
  const rc = O.st === 'shake' || O.st === 'burst' ? rcol(O.hint) : showR >= 0 ? rcol(showR) : tierColor(O.tier);
  const rayA = showR >= 4 ? 0.16 : showR >= 2 ? 0.11 : 0.08, raySp = showR >= 4 ? 0.6 : 0.2, rcx = showR >= 0 && O.st !== 'build' ? 150 : W / 2;
  ctx.globalAlpha = rayA; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + T_NOW * raySp; ctx.fillStyle = showR === 6 ? rainbow(T_NOW, i * 30) : rc; ctx.beginPath(); ctx.moveTo(rcx, 110); ctx.lineTo(rcx + Math.cos(a) * 420, 110 + Math.sin(a) * 420); ctx.lineTo(rcx + Math.cos(a + 0.12) * 420, 110 + Math.sin(a + 0.12) * 420); ctx.fill(); } ctx.globalAlpha = 1;
  const ki = kindInfo(O.kind);
  const crate = getCrate(O.tier, ki.em);
  let sx = 0, sy = 0;
  if (O.st === 'shake') { const k = O.shakeK; const amp = 1 + k * k * 7; sx = Math.round((R0() - 0.5) * amp * 2); sy = Math.round((R0() - 0.5) * amp); }
  const cx = W / 2, cy = 115;
  if (['upgrade', 'insert', 'shake', 'burned'].includes(O.st)) {
    textO(O.haul ? (O.n > 1 ? 'YOUR HAUL CRATES' : `${TIERS[O.tier].n} ${ki.n} CRATE`) : `${TIERS[O.tier].n} ${ki.n} CRATE`, W / 2, 26, tierColor(O.tier), '#000', FB, 1, 2);
    if (O.n > 1) text(`X${O.n}`, W / 2, 44, COL.ink, FB, 1);
    ellipse(cx, 166, 60, 10, '#14213d'); shadow(cx, 162, 48, 6, 0.5);
    if (O.st !== 'burned' || O.st_t < 0.8) {
      if (O.st === 'burned') ctx.globalAlpha = Math.max(0, 1 - O.st_t / 0.8);
      ctx.drawImage(crate, cx - 64 + sx, cy - 56 + sy, 128, 112);
      if (O.tier === 6) drawAccretion(cx, cy, 80, 18);
      ctx.globalAlpha = 1;
    }
    if (O.st === 'shake') { // cracks of light
      const k = O.shakeK; const c = rcol(O.hint); const n = Math.floor(k * 9);
      const R = RNG(77);
      for (let i = 0; i < n; i++) { const x0 = cx - 56 + R() * 112, y0 = cy - 40 + R() * 90; let x = x0, y = y0; for (let s = 0; s < 6; s++) { const nx = x + (R() - 0.5) * 14, ny = y + (R() - 0.5) * 10; line(x + sx, y + sy, nx + sx, ny + sy, c); x = nx; y = ny; } }
      ctx.globalAlpha = k * 0.35; ctx.drawImage(tinted(crate, c), cx - 64 + sx, cy - 56 + sy, 128, 112); ctx.globalAlpha = 1;
      for (let i = 0; i < Math.floor(k * 8); i++) { const a = i / 8 * TAU + T_NOW; ctx.globalAlpha = k * 0.3; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200); ctx.lineTo(cx + Math.cos(a + 0.05) * 200, cy + Math.sin(a + 0.05) * 200); ctx.fill(); ctx.globalAlpha = 1; }
    }
    if (O.st === 'insert') {
      O.keysFly.forEach(k => { const t = clamp((O.st_t - k.d) / 0.35, 0, 1); if (t <= 0 || t >= 1) return; const e = ease.io(t); const x = lerp(W - 40, cx, e), y = lerp(8, cy - 20, e) - Math.sin(t * Math.PI) * 30; drawCoinIcon(x, y); });
      const lt = O.st_t - (0.35 + O.keysFly.length * 0.07); if (lt > 0) { const a = lt * 14; ctx.save(); ctx.translate(cx, cy - 18); ctx.rotate(a); rect(-1, -5, 2, 10, COL.gold); rect(-5, -1, 10, 2, COL.gold); ctx.restore(); }
      text(O.haul ? 'HAUL CRATES. FREE TO OPEN' : 'UNLOCKING', W / 2, 190, O.haul ? COL.gold : COL.dim, FS, 1);
    }
    if (O.st === 'upgrade') drawUpgrader(O);
    if (O.st === 'burned') { textO('CRATE BURNED', W / 2, 150, COL.coral, '#000', FB, 1, 3); if (O.st_t > 1) { text('THE UPGRADER FAILED. THE COINS ARE GONE', W / 2, 180, COL.dim, FS, 1); if (button(W / 2 - 60, 200, 120, 18, 'BACK TO BAY', { kind: 'primary' }) || kp('Escape')) backToBay(); } }
  }
  if (O.st === 'burst') { const k = O.st_t / 0.55; ctx.drawImage(crate, cx - 64, cy - 56 - k * 200, 128, 50); ctx.globalAlpha = 1 - k; rect(0, 0, W, H, '#fff'); ctx.globalAlpha = 1; }
  if (O.st === 'reel') drawReel(O);
  if (O.st === 'build') drawBuild(O);
  if (O.st === 'show') drawShow(O, 0, true);
  if (O.st === 'cards' || O.st === 'summary') drawCards(O);
  if (O.st === 'detail') drawShow(O, O.sel, false);
  if (O.st === 'don') drawDoN(O);
  O.parts.draw();
  if (['shake', 'insert', 'burst', 'cards'].includes(O.st)) text('CLICK TO SPEED UP', W / 2, H - 10, COL.mute, FS, 1);
}
function drawWheel(cx, cy, R, p, ang, winCol, loseCol, winLbl, loseLbl) {
  const ry = 0.55;
  for (let a = 0; a < TAU; a += 0.008) { const win = a < TAU * p; const seg = Math.floor(a / TAU * 24) % 2; for (let rr = R - 10; rr <= R; rr++) { const edge = rr === R || rr === R - 10; const c = win ? (edge ? winCol[0] : seg ? winCol[1] : winCol[2]) : (edge ? loseCol[0] : seg ? loseCol[1] : loseCol[2]); px(cx + Math.cos(a - Math.PI / 2) * rr, cy + Math.sin(a - Math.PI / 2) * rr * ry, c); } }
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU - Math.PI / 2; const on = (Math.floor(T_NOW * 8) + i) % 3 === 0; px(cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3) * ry, on ? '#fff' : '#5e548e'); }
  const a = ang - Math.PI / 2; for (let k = 0; k < 2; k++) line(cx + k, cy, cx + Math.cos(a) * (R + 6) + k, cy + Math.sin(a) * (R + 6) * ry, '#fff'); circ(cx, cy, 3, '#fff'); circ(cx, cy, 1, '#273469');
  text(winLbl, cx + R * 0.6, cy - R * ry - 12, winCol[0], FS, 1); text(loseLbl, cx - R * 0.6, cy - R * ry - 12, loseCol[0], FS, 1);
}
function drawUpgrader(O) {
  const u = O.upg, cx = W / 2, cy = 222, R = 44;
  drawWheel(cx, cy, R, u.p, u.a, ['#c9c0ff', '#7161ef', '#4a3fb0'], ['#ff9fb2', '#9a2a4a', '#5a1430'], 'BUMP', 'BURN');
  if (u.done) textO(u.win ? (O.tier < 6 || S.nova.count > 0 ? `UPGRADED TO ${TIERS[Math.min(7, O.tier + 1)].n}!` : 'ALREADY AT THE TOP TIER') : 'BURN!', W / 2, 170, u.win ? COL.mint : COL.coral, '#000', FB, 1, 2);
  else text(`${Math.round(u.p * 100)}% CHANCE TO BUMP THE TIER`, W / 2, 175, COL.magenta, FS, 1);
}
function drawAfterCollect(O, r, d, bx) {
  const id = r.id; O.afterT = (O.afterT || 0) + 1 / 60;
  textO('ADDED TO YOUR LOCKER', bx + 88, 144, COL.mint, '#000', FS, 1);
  const sl = slotOf(d); const isW = d.cat === 'w';
  const eqd = S.eq[sl] === id; const isG = d.cat === 'g';
  if (eqd) button(bx, 150, 176, 20, 'EQUIPPED', { disabled: true });
  else if (button(bx, 150, 176, 20, 'EQUIP', { kind: 'primary' })) { equipped(id); S.eq[sl] = id; S.stats.equips++; dirty(); SND.play('pickup'); toast(isW ? 'EQUIPPED AS YOUR WEAPON' : isG ? 'GADGET EQUIPPED. PRESS F OR 2 ON A PLANET' : 'EQUIPPED', COL.mint); }
  let y = 174;
  if (isW || isG) { if (button(bx, y, 176, 20, 'TEST IT', { kind: 'blue', tip: 'GROUPED ALIENS, MOVING TARGETS AND A DUMMY THAT SHOWS YOUR DPS' })) { startRange(id, 'open'); return; } y += 24; }
  const opts = trackOptionsFor(id);
  if (opts.length) { const o = opts[0]; const on = S.track && S.track.k === o.k && (S.track.pg === o.pg && S.track.s === o.s && S.track.id === o.id && S.track.dk === o.dk); if (button(bx, y, 176, 20, on ? 'TRACKING IT' : 'TRACK: ' + o.n, { kind: on ? 'def' : 'outline', font: FS, disabled: on, tip: 'SHOWS ITS PROGRESS ON YOUR STATION AND HUD' })) setTrack(o); y += 24; }
  if (!O.haul) { const tr = BAY.manual ? Math.min(BAY.tier, 7) : bestTier(O.kind), cost = crateCost(O.kind, tr), ok = S.coins >= cost; if (button(bx, y, 176, 18, `OPEN ANOTHER: ${fmt(cost)} COINS`, { disabled: !ok, kind: 'def', font: FS })) { startOpen(O.kind, tr, 1); return; } y += 22; }
  if (button(bx, Math.min(y, H - 22), 176, 18, 'DONE', { font: FS }) || ((kp('Enter') || kp('Escape') || kp('Space')) && O.afterT > 0.2)) finishOpen();
}
function cardFrame(x, y, w, h, r, glow = true) {
  const c = rcol(r);
  if (glow && r >= 2) { ctx.globalAlpha = 0.2 + 0.1 * Math.sin(T_NOW * 4); rect(x - 2, y - 2, w + 4, h + 4, c); ctx.globalAlpha = 1; }
  panel(x, y, w, h, { bg: '#14213d', bd: c, flat: true });
  ctx.globalAlpha = 0.25; for (let i = 0; i < 6; i++) rect(x + 1, y + h - 2 - i * 2, w - 2, 1, c); ctx.globalAlpha = 1;
  rect(x + 1, y + h - 4, w - 2, 3, c);
}
function drawReel(O) {
  const rl = O.reel; const cy = 84, CH = 64, CW = rl.CW;
  textO(`${TIERS[O.tier].n} ${kindInfo(O.kind).n} CRATE`, W / 2, 30, tierColor(O.tier), '#000', FB, 1);
  rect(0, cy - 6, W, CH + 12, '#0e1630'); rect(0, cy - 7, W, 1, COL.steel); rect(0, cy + CH + 6, W, 1, COL.steel);
  const start = Math.max(0, Math.floor((rl.pos - W / 2) / CW) - 1);
  for (let i = start; i < Math.min(rl.items.length, start + 12); i++) {
    const x = Math.floor(W / 2 - rl.pos + i * CW - CW / 2 + 2); const id = rl.items[i], d = getDef(id);
    cardFrame(x, cy, CW - 4, CH, d.r, false);
    drawItemIn(id, x + 1, cy + 4, CW - 6, CH - 14, { maxSc: 2, noFx: d.r < 3 });
    text(RAR[d.r].n.slice(0, 4), x + (CW - 4) / 2, cy + CH - 12, d.r === 6 ? 'RAINBOW' : RAR[d.r].c, FS, 1);
  }
  // edge fades
  for (let i = 0; i < 40; i++) { ctx.globalAlpha = (1 - i / 40) * 0.9; rect(i * 2, cy - 6, 2, CH + 12, '#03040b'); rect(W - i * 2 - 2, cy - 6, 2, CH + 12, '#03040b'); } ctx.globalAlpha = 1;
  // marker
  const mc = COL.gold; rect(W / 2, cy - 10, 1, CH + 20, mc); ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(W / 2 - 5, cy - 12); ctx.lineTo(W / 2 + 6, cy - 12); ctx.lineTo(W / 2 + 0.5, cy - 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(W / 2 - 5, cy + CH + 12); ctx.lineTo(W / 2 + 6, cy + CH + 12); ctx.lineTo(W / 2 + 0.5, cy + CH + 5); ctx.fill();
  const k = Math.min(1, rl.t / rl.dur);
  if (k >= 1) { const d = getDef(rl.items[rl.WI]); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T_NOW * 20); ctx.strokeStyle = rcol(d.r); ctx.lineWidth = 2; ctx.strokeRect(W / 2 - CW / 2 + 1, cy - 2, CW - 2, CH + 4); ctx.lineWidth = 1; ctx.globalAlpha = 1; }
  text('HOLD CLICK TO SPIN FASTER', W / 2, cy + CH + 18, COL.mute, FS, 1);
}
function drawBuild(O) {
  const b = O.build, d = getDef(b.id); const sc = d.w > 16 ? 6 : 7; const k = clamp(O.st_t / 1.0, 0, 1);
  const x0 = Math.floor(150 - d.w * sc / 2), y0 = Math.floor(110 - d.h * sc / 2);
  // beam
  const c = rcol(d.r); for (let y = 0; y < H; y += 2) { const ww = 70 + Math.sin(y * 0.1 + T_NOW * 8) * 6; ctx.globalAlpha = 0.18; rect(150 - ww / 2, y, ww, 2, c); } ctx.globalAlpha = 1;
  const n = Math.floor(b.pts.length * k);
  for (let i = 0; i < n; i++) { const [x, y, col] = b.pts[i]; const fresh = i > n - 12; rect(x0 + x * sc, y0 + y * sc, sc, sc, fresh ? '#fff' : col); }
  if (R0() < 0.8) O.parts.add({ x: x0 + R0() * d.w * sc, y: y0 + d.h * sc + 10, vx: 0, vy: -60 - R0() * 60, life: 0.8, c, s: 1 });
  textO(RAR[d.r].n, 150, 30, c === 'RAINBOW' ? 'RAINBOW' : c, '#000', FB, 1, 2);
}
function drawShow(O, i, single) {
  const r = O.results[i]; if (!r) return; const id = r.id, d = getDef(id); const t = O.st_t;
  // left showcase
  const cxl = 150; const c = rcol(d.r);
  for (let y = 0; y < H; y += 2) { ctx.globalAlpha = 0.07 + (d.r >= 4 ? 0.05 : 0); rect(cxl - 80 + Math.sin(y * 0.05 + T_NOW * 3) * 4, y, 160, 2, c); } ctx.globalAlpha = 1;
  if (R0() < 0.3 + d.r * 0.1) O.parts.add({ x: cxl + (R0() - 0.5) * 120, y: 170, vx: 0, vy: -30 - R0() * 40, life: 1.2, c: d.r === 6 ? rainbow(T_NOW, R0() * 360) : c, s: 1 });
  const nl = wrap(d.name, 140, FB); const big = nl.length <= 2; const nl2 = big ? nl : wrap(d.name, 280, FB);
  nl2.forEach((l, k) => textO(l, cxl, (big ? 10 : 14) + k * (big ? 17 : 10), COL.ink, '#000', FB, 1, big ? 2 : 1));
  const ry = (big ? 12 : 16) + nl2.length * (big ? 17 : 10);
  const catN = d.o.t === 'art' ? 'ARTIFACT' : d.o.t === 'evo' ? 'EVOLVED' : `#${String(d.n).padStart(4, '0')}`;
  textO(`${RAR[d.r].n} ${SUB_LABEL[d.sub]}`, cxl, ry, d.r === 6 ? 'RAINBOW' : c, '#000', FB, 1);
  if (GRADEABLE[d.cat]) { const gg = Math.max(gradeOf(id), r.tier ?? O.tier ?? 0); const tx = text(catN + '  ', cxl - textW(catN + '  ' + gradeName(gg), FS) / 2, ry + 10, COL.mute, FS); text(gradeName(gg), tx, ry + 10, tierColor(gg), FS); } else text(catN, cxl, ry + 10, COL.mute, FS, 1);
  const sc = d.w > 16 ? 5 : 6; const bob = Math.round(Math.sin(T_NOW * 2.5) * 2);
  const ix = Math.floor(cxl - d.w * sc / 2), iy = Math.floor(108 - d.h * sc / 2) + bob;
  if (d.cat === 'b') drawBackdropPreview(id, cxl - 64, 108 - 36 + bob, 128, 72); else drawItem(id, ix, iy, sc, { skin: null });
  if (r.lost) { textO('LOST', cxl, 100, COL.coral, '#000', FB, 1, 3); }
  if (r.first) { const k = Math.min(1, t / 0.3); textO(`YOUR FIRST ${RAR[d.r].n} EVER!`, cxl, 1 - (1 - k) * 20, d.r === 6 ? 'RAINBOW' : COL.gold, '#000', FS, 1); if (d.r >= 4 && Math.random() < 0.3) O.parts.add({ x: cxl + (Math.random() - 0.5) * 200, y: -4, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 60, life: 2, c: rainbow(T_NOW, Math.random() * 360), s: 2, drag: 0.2 }); }
  if (d.r >= 4 && Math.random() < 0.06) { O.parts.add({ x: cxl, y: 108, vx: 0, vy: 0, life: 0.7, c: rcol(d.r), s: 70, t: 'ring' }); }
  // labels row
  let lx = 10; const ly = 146; const ls = r.labels.filter(l => l !== 'NEW');
  const isNew = r.labels.includes('NEW') && !r.lost;
  if (isNew) {
    const st = Math.min(1, t / 0.25); ctx.save(); ctx.translate(cxl + 78, 136); ctx.rotate(-0.18); const s = 1 + (1 - st) * 2; ctx.scale(s, s); ctx.globalAlpha = st;
    rect(-46, -9, 92, 18, COL.mint); rect(-44, -7, 88, 14, '#14213d'); text('NEW DISCOVERY', 0, -3, COL.mint, FB, 1); ctx.restore(); ctx.globalAlpha = 1;
    if (!O.stampSnd && t > 0.2) { O.stampSnd = true; SND.play('stamp'); shake(2); }
  } else {
    const L = S.inv[id] ? S.inv[id].l : 1; const sh = O.shadow[id] || { l: L, p: 0 };
    text(`LEVEL ${sh.l}${sh.l >= 10 ? ' MAX' : ''}`, cxl, 136, COL.cyan, FS, 1); if (sh.l < 10) bar(cxl - 40, 130, 80, 4, sh.p / sh.l, COL.cyan, COL.void2);
  }
  for (const l of ls) { const w = textW(l, FS) + 8; panel(lx, ly, w, 10, { bg: COL.void0, bd: LABEL_COL[l] || COL.gold, flat: true }); text(l, lx + 4, ly + 3, LABEL_COL[l] || COL.gold, FS); lx += w + 3; }
  // behavior first, then why it matters
  let yy = 162; const head = itemHeadline(d);
  wrap(head, 280, FB).slice(0, 2).forEach(l => { textO(l, 10, yy, d.r === 6 ? 'RAINBOW' : c, '#000', FB); yy += 10; });
  let nx = 0; for (const l of itemExtraLines(d)) { for (const ll of wrap(l, 280, FS)) { if (nx >= 3) break; text(ll, 10, yy, l.startsWith('QUIRK') ? COL.pink : l.startsWith('TECHNIQUE') ? COL.lilac : COL.ink, FS); yy += 8; nx++; } }
  yy += 2; const sl = statLines(d, effL(id, Math.max(1, (O.shadow[id] || {}).l || 1), Math.max(gradeOf(id), r.tier ?? O.tier ?? 0)));
  sl.forEach((s, k) => { const sx = 10 + k * 70; text(s[0], sx, yy, COL.mute, FS); text(String(s[1]), sx, yy + 7, COL.ink, FS); });
  yy += 17;
  if (r.impId !== id) { r.impId = id; r.impact = O.after ? [] : impactLines(id); }
  for (const [t2, c2] of (r.impact || []).slice(0, 2)) { const tw = textW(t2, FS) + 10; panel(8, yy - 2, Math.min(284, tw), 9, { bg: COL.void0, bd: c2, flat: true }); text(t2, 13, yy, c2, FS); yy += 10; }
  if (yy < H - 8) text(`FROM ${whereToFind(id)}`, 10, Math.min(yy + 1, H - 8), COL.mute, FS);
  // right: demo + buttons
  if (O.demo && O.demo.id === id) drawDemo(O.demo, 296, 22, 176, 120);
  const bx = 296;
  if (single && O.after) { drawAfterCollect(O, r, d, bx); return; }
  if (O.st_t > 0.6 && !r.lost) coachReveal(single);
  if (single) {
    if (r.lost) { if (button(bx, 150, 176, 20, 'CONTINUE', { kind: 'def' }) || kp('Space') || kp('Enter')) { collectOpen(); finishOpen(); return; } }
    else if (button(bx, 150, 112, 20, 'COLLECT', { kind: 'primary' }) || kp('Space') || kp('Enter')) { collectOpen(); if (slotOf(d)) { O.after = true; O.afterT = 0; SND.play('pickup'); } else finishOpen(); return; }
    if (!r.lost && button(bx + 116, 150, 60, 20, `SELL ${fmt(pullValue(r))}`, { kind: 'cream', font: FS, tip: 'SELL IT RIGHT NOW INSTEAD OF KEEPING IT' })) { const v = sellPull(r); toast(`SOLD FOR ${fmt(v)} COINS`, COL.gold); collectOpen(); finishOpen(); return; }
    const canD = d.r < 6 && !r.lost && !r.sold;
    if (donButton(bx, 174, 176, 20, r, canD)) startDoN(i);
    if (!O.haul) {
      const tr = BAY.manual ? Math.min(BAY.tier, 7) : bestTier(O.kind), cost = crateCost(O.kind, tr), ok = S.coins >= cost && (!O.kind.startsWith('finisher') || poolSize(O.kind) > 1);
      if (button(bx, 198, 176, 20, `${r.lost ? '' : 'COLLECT + '}OPEN ANOTHER: ${fmt(cost)} COINS`, { disabled: !ok, kind: 'blue', font: FS, tip: ok ? '' : 'NOT ENOUGH COINS' })) { collectOpen(); const k = O.kind; startOpen(k, tr, 1); return; }
    }
    if ((d.cat === 'w' || d.cat === 'g') && !r.lost && button(bx, 222, 176, 18, 'TEST IT IN THE RANGE FIRST', { font: FS, tip: 'TRY IT ON TARGETS, THEN COME BACK' })) { startRange(id, 'open'); return; }
  } else {
    // sell sits up top; going back to the whole haul is the big white button at the bottom, so it's hard to sell by accident
    if (!r.lost && !r.sold && button(bx, 150, 176, 20, `SELL IT: +${fmt(pullValue(r))} COINS`, { kind: 'cream', font: FS })) { const v = sellPull(r); toast(`SOLD FOR ${fmt(v)} COINS`, COL.gold); O.st = 'summary'; O.demo = null; return; }
    const canD = d.r < 6 && !r.lost && !r.sold;
    if (donButton(bx, 174, 176, 20, r, canD)) startDoN(i);
    if ((d.cat === 'w' || d.cat === 'g') && !r.lost && !r.sold && button(bx, 198, 176, 20, 'TEST IT IN THE RANGE', { kind: 'blue', font: FS })) { startRange(id, 'open'); return; }
    if (button(bx, 224, 176, 22, 'BACK TO ALL PULLS', { kind: 'white' }) || kp('Escape')) { O.st = 'summary'; O.demo = null; return; }
  }
}
function drawCards(O) {
  textO(O.haul ? `${O.n} HAUL CRATES` : `${O.n} X ${TIERS[O.tier].n} ${kindInfo(O.kind).n}`, W / 2, 16, tierColor(O.tier), '#000', FB, 1);
  for (const c of O.cards) {
    const r = O.results[c.ri]; const d = getDef(r.id);
    const appear = clamp((O.t - c.t0 - 0.8) / 0.3, 0, 1); if (O.st === 'cards' && appear <= 0) continue;
    const y = c.y + (1 - ease.back(appear)) * 40;
    if (!c.flipped) { panel(c.x, y, c.w, c.h, { bg: COL.void3, bd: COL.mauve }); for (let i = 0; i < 5; i++) ring(c.x + c.w / 2, y + c.h / 2, 4 + i * 6, COL.steel); emblemDraw(r.kind || O.kind, c.x + c.w / 2 - 2, y + c.h / 2 - 3, COL.lilac); if (O.haul) { text(TIERS[r.tier].n, c.x + c.w / 2, y + c.h - 14, tierColor(r.tier), FS, 1); text(kindInfo(r.kind).n, c.x + c.w / 2, y + 6, COL.dim, FS, 1); } continue; }
    const fk = Math.min(1, c.ft / 0.18); const sw = Math.abs(Math.cos(fk * Math.PI / 2 + Math.PI / 2));
    const ww = Math.max(2, Math.floor(c.w * (fk < 1 ? sw : 1)));
    const xx = c.x + (c.w - ww) / 2;
    const hov = O.st === 'summary' && inBox(c.x, y, c.w, c.h);
    cardFrame(xx, y - (hov ? 2 : 0), ww, c.h, d.r);
    if (fk >= 1) {
      drawItemIn(r.id, c.x + 3, y + 6 - (hov ? 2 : 0), c.w - 6, 40, { maxSc: d.w > 16 ? 2 : 3 });
      text(RAR[d.r].n, c.x + c.w / 2, y + 48, d.r === 6 ? 'RAINBOW' : RAR[d.r].c, FS, 1);
      const nm = wrap(d.name, c.w - 6, FS); nm.slice(0, 2).forEach((l, k) => text(l, c.x + c.w / 2, y + 56 + k * 7, COL.ink, FS, 1));
      const lab = r.lost ? 'LOST' : r.labels[0] || ''; if (lab) { text(lab === 'NEW' ? 'NEW!' : lab, c.x + c.w / 2, y + c.h - 12, r.lost ? COL.coral : LABEL_COL[lab] || COL.gold, FS, 1); }
      if (r.lost) { ctx.globalAlpha = 0.6; rect(c.x + 1, y + 1, c.w - 2, c.h - 2, '#000'); ctx.globalAlpha = 1; text('LOST', c.x + c.w / 2, y + 30, COL.coral, FB, 1); }
      else if (r.sold) { ctx.globalAlpha = 0.6; rect(c.x + 1, y + 1, c.w - 2, c.h - 2, '#000'); ctx.globalAlpha = 1; text('SOLD', c.x + c.w / 2, y + 30, COL.gold, FB, 1); }
    }
    if (hov) { IN.cursor = 'pointer'; if (clickIn(c.x, y, c.w, c.h)) { O.sel = c.ri; O.st = 'detail'; O.st_t = 0; O.stampSnd = true; O.demo = makeDemo(r.id); SND.play('click'); } }
  }
  if (O.st === 'summary') {
    text('CLICK A CARD FOR DETAILS, A HOLO DEMO, OR DOUBLE OR NOTHING', W / 2, H - 42, COL.dim, FS, 1);
    const dupes = O.results.filter(r => !r.lost && !r.sold && owned(r.id)), dv = dupes.reduce((a, r) => a + pullValue(r), 0);
    const left = O.results.filter(r => !r.lost && !r.sold);
    if (button(W / 2 - (dupes.length ? 166 : 80), H - 32, 160, 20, left.length ? 'COLLECT ALL' : 'CONTINUE', { kind: 'primary' }) || kp('Space') || kp('Enter')) { collectOpen(); finishOpen(); }
    if (dupes.length && button(W / 2 + 6, H - 32, 160, 20, `SELL ${dupes.length} I OWN: +${fmt(dv)}`, { kind: 'cream', font: FS, tip: 'SELLS THE PULLS YOU ALREADY HAVE. NEW FINDS ARE KEPT' })) { let t = 0; for (const r of dupes) t += sellPull(r); toast(`SOLD ${dupes.length} FOR ${fmt(t)} COINS`, COL.gold); }
  }
}
function drawDoN(O) {
  const dn = O.don; const r = O.results[dn.i]; const d = getDef(dn.from);
  ctx.globalAlpha = 0.85; rect(0, 0, W, H, '#03040b'); ctx.globalAlpha = 1;
  textO('DOUBLE OR NOTHING', W / 2, 24, COL.magenta, '#000', FB, 1, 2);
  if (dn.win === null || !dn.win) drawItem(dn.from, W / 2 - d.w * 2, 60, 4); else { const nd = getDef(dn.up); drawItem(dn.up, W / 2 - nd.w * 2, 60, 4); }
  const cx = W / 2, cy = 196, R = 56, p = dn.p;
  drawWheel(cx, cy, R, p, dn.a, ['#ffe2a8', '#fca311', '#a35f00'], ['#ff9fb2', '#7a1d3a', '#3a0a20'], 'DOUBLE', 'NOTHING');
  if (dn.win === true) textO(`WON! ${RAR[getDef(dn.up).r].n}`, W / 2, 138, COL.gold, '#000', FB, 1, 2);
  if (dn.win === false) textO('LOST IT ALL', W / 2, 138, COL.coral, '#000', FB, 1, 2);
}
function backToBay() { OPEN = null; setScene('crates'); SND.playSong('hub'); }
function finishOpen() { const h = OPEN && OPEN.haul; if (h) { OPEN = null; goHub(); SND.playSong('hub'); } else backToBay(); }

// ---------- choice crates (wrecks, rewards) ----------
function makeChoice(ids, title, tier, clue) { return { ids, title, tier, t: 0, picked: -1, clue, hover: -1, labels: ids.map(id => pullLabels(id, tier)), demo: null }; }
function updateChoiceOverlay(dt) { const C = RUN && RUN.choice ? RUN.choice : HUB.choice; if (!C) return; C.t += dt; if (C.demo) updateDemo(C.demo, dt); if (C.picked >= 0) { C.pt = (C.pt || 0) + dt; } }
function drawChoiceOverlay() {
  const inRun = RUN && RUN.choice && SCENE === 'planet'; const C = inRun ? RUN.choice : HUB.choice; if (!C) return;
  ctx.globalAlpha = 0.86; rect(0, 0, W, H, '#03040b'); ctx.globalAlpha = 1;
  textO('CHOOSE ONE', W / 2, 14, COL.gold, '#000', FB, 1, 2);
  text(`${C.title}  ${TIERS[C.tier].n} TIER`, W / 2, 32, COL.dim, FS, 1);
  const cw = 110, chh = 120, gap = 14, x0 = W / 2 - (cw * 3 + gap * 2) / 2, y0 = 44;
  C.ids.forEach((id, i) => {
    const d = getDef(id); const x = x0 + i * (cw + gap); const fk = clamp((C.t - 0.2 - i * 0.25) / 0.2, 0, 1);
    if (fk < 1) { if (fk > 0 && !C['s' + i]) { C['s' + i] = 1; SND.play('flip'); SND.play('reveal', d.r); } panel(x + cw / 2 - cw * (1 - fk) / 2, y0, Math.max(2, cw * (1 - fk)), chh, { bg: '#1e2749', bd: COL.line }); return; }
    const hov = inBox(x, y0, cw, chh) && C.picked < 0; const dim = C.picked >= 0 && C.picked !== i;
    if (dim) ctx.globalAlpha = Math.max(0.15, 1 - (C.pt || 0) * 2);
    cardFrame(x, y0 - (hov ? 3 : 0), cw, chh, d.r);
    drawItemIn(id, x + 4, y0 + 8 - (hov ? 3 : 0), cw - 8, 44, { maxSc: d.w > 16 ? 3 : 3 });
    text(RAR[d.r].n, x + cw / 2, y0 + 56, d.r === 6 ? 'RAINBOW' : RAR[d.r].c, FS, 1);
    wrap(d.name, cw - 8, FS).slice(0, 2).forEach((l, k) => text(l, x + cw / 2, y0 + 64 + k * 7, COL.ink, FS, 1));
    wrap(itemHeadline(d), cw - 8, FS).slice(0, 3).forEach((l, k) => text(l, x + cw / 2, y0 + 82 + k * 7, d.r === 6 ? COL.gold : RAR[d.r].c === 'RAINBOW' ? COL.gold : RAR[d.r].c, FS, 1));
    const lab = C.labels[i][0]; if (lab) text(lab === 'NEW' ? 'NEW DISCOVERY' : lab, x + cw / 2, y0 + chh - 12, LABEL_COL[lab] || COL.gold, FS, 1);
    ctx.globalAlpha = 1;
    if (hov) { IN.cursor = 'pointer'; if (!C.demo || C.demo.id !== id) C.demo = makeDemo(id); if (clickIn(x, y0, cw, chh)) { C.picked = i; C.pt = 0; const res = addItem(id, C.tier); SND.play('win'); toast(res.isNew ? `KEPT: ${d.name}` : `KEPT: ${d.name} (LEVEL ${res.to})`, COL.mint); if (d.r >= 4) { HUB.flashT = 4; HUB.flashCol = RAR[d.r].c; } checkTitles(); dirty(); } }
  });
  if (C.demo && C.picked < 0) drawDemo(C.demo, W / 2 - 88, 172, 176, 76);
  if (C.clue) text(C.clue, W / 2, H - 14, COL.orange, FS, 1);
  if (C.picked >= 0 && C.pt > 0.8) { if (inRun) RUN.choice = null; else { HUB.choice = null; nextQueuedChoice(); } }
}
function nextQueuedChoice() {
  if (HUB.choice || !S.choiceQueue.length) return;
  const q = S.choiceQueue.shift(); const tier = typeof q === 'object' ? q.tier : q; const ids = []; while (ids.length < 3) { const id = rollCrate('galaxy', tier, { noFirst: true }); if (!ids.includes(id)) ids.push(id); }
  HUB.choice = makeChoice(ids, (q && q.title) || 'REWARD CRATE', tier, null); dirty();
}
