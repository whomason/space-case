// ===== UI: item cards, tooltips, grids, tabs =====
function itemCardH(id, w) {
  const d = getDef(id); let h = 34 + wrap(d.name, w - 36, FB).length * 9;
  h += wrap(itemHeadline(d), w - 12, FS).length * 7 + 4; for (const l of itemExtraLines(d)) h += wrap(l, w - 12, FS).length * 7;
  h += 20 + 10; if (d.set !== undefined) h += 16; if (GRADEABLE[d.cat]) h += 8; return h;
}
function drawItemCard(id, x, y, w, o = {}) {
  const d = getDef(id); const L0 = o.level || lvl(id) || 1; const gr = o.grade ?? gradeOf(id); const L = effL(id, L0, gr); const h = itemCardH(id, w) + (o.compare ? 9 : 0);
  x = clamp(Math.floor(x), 2, W - w - 2); y = clamp(Math.floor(y), 2, H - h - 2);
  const c = rcol(d.r);
  panel(x, y, w, h, { bg: '#0e1630', bd: c === 'RAINBOW' ? rainbow(T_NOW) : c });
  rect(x + 1, y + 1, w - 2, 2, c === 'RAINBOW' ? rainbow(T_NOW) : c);
  panel(x + 4, y + 6, 26, 22, { bg: COL.void0, bd: COL.void3, flat: true }); drawItemIn(id, x + 5, y + 7, 24, 20, { maxSc: 1 });
  let yy = y + 7; const nl = wrap(d.name, w - 36, FB); nl.forEach(l => { text(l, x + 34, yy, COL.ink, FB); yy += 9; });
  text(`${RAR[d.r].n} ${SUB_LABEL[d.sub]}`, x + 34, yy, d.r === 6 ? 'RAINBOW' : c, FS); yy += 8;
  if (owned(id)) { const inv = S.inv[id]; text(`LEVEL ${inv.l}${inv.l >= 10 ? ' MAX' : `  ${inv.p}/${inv.l} TO NEXT`}`, x + 34, yy, COL.cyan, FS); }
  else text(o.sil ? 'NOT FOUND YET' : 'NOT OWNED', x + 34, yy, COL.mute, FS);
  if (GRADEABLE[d.cat]) { yy += 8; text(gradeName(gr), x + 34, yy, tierColor(gr), FS); }
  yy = Math.max(yy + 10, y + 32);
  wrap(itemHeadline(d), w - 12, FS).forEach(l => { text(l, x + 6, yy, d.r === 6 ? COL.gold : (c === 'RAINBOW' ? COL.gold : c), FS); yy += 7; }); yy += 2;
  for (const l of itemExtraLines(d)) wrap(l, w - 12, FS).forEach(ll => { text(ll, x + 6, yy, COL.ink, FS); yy += 7; });
  yy += 2; const sl = statLines(d, L); const cw = Math.floor((w - 12) / Math.max(1, sl.length));
  sl.forEach((s, k) => { text(s[0], x + 6 + k * cw, yy, COL.mute, FS); text(String(s[1]), x + 6 + k * cw, yy + 7, COL.ink, FS); }); yy += 17;
  if (d.set !== undefined) { const bon = d.cat === 'a' ? ARMOR_SET_BONUS[d.set] : SHIP_SET_BONUS[d.set]; text(`${SET_NAMES[d.set]} SET 3: ${bonusLine(bon[0])}`, x + 6, yy, COL.magenta, FS); text(`5: ${bonusLine(bon[1])}`, x + 6, yy + 7, COL.magenta, FS); yy += 16; }
  if (o.compare) {
    const sl2 = slotOf(d); const cur = sl2 && S.eq[sl2];
    if (cur && cur !== id && (d.cat === 'w' || d.cat === 'a' || d.cat === 's' || d.sub === 'tool')) { const a = power(d, L), b = power(getDef(cur), effL(cur)); const df = a - b; text(df > 0 ? `+${df} POWER VS EQUIPPED` : df < 0 ? `${df} POWER VS EQUIPPED` : 'SAME POWER AS EQUIPPED', x + 6, yy, df > 0 ? COL.mint : df < 0 ? COL.coral : COL.dim, FS); }
    else if (cur === id) text('EQUIPPED', x + 6, yy, COL.mint, FS);
    if (owned(id)) text(`SELLS FOR ${fmt(sellValue(id))}`, x + w - 6, yy, COL.gold, FS, 2);
    yy += 9;
  }
  text(`FIND: ${whereToFind(id)}`, x + 6, yy, COL.mute, FS);
}
function drawTip() {
  const v = TIP.v; TIP.v = null; if (!v) return;
  if (typeof v === 'object' && v.item) { const w = 170; drawItemCard(v.item, IN.mx + 10, IN.my + 8, w, { compare: true }); return; }
  const lines = wrap(String(v), 170, FS); const w = Math.max(...lines.map(l => textW(l, FS))) + 10, h = lines.length * 7 + 7;
  const x = clamp(IN.mx + 8, 2, W - w - 2), y = clamp(IN.my + 10, 2, H - h - 2);
  panel(x, y, w, h, { bg: '#0e1630', bd: COL.line }); lines.forEach((l, i) => text(l, x + 5, y + 4 + i * 7, COL.ink, FS));
}
function keycap(x, y, label, pressed) {
  x = Math.floor(x); y = Math.floor(y); const w = Math.max(11, textW(label, FS) + 6), o = pressed ? 1 : 0;
  rect(x, y + 2, w, 10, '#7a6f9a'); rect(x, y + o, w, 10, COL.cream); rect(x + 1, y + o + 1, w - 2, 1, '#fff'); text(label, x + w / 2, y + 3 + o, COL.navy, FS, 1); return w;
}
function tabs(x, y, names, cur, w = 70) {
  let pick = cur;
  names.forEach((n, i) => { const sel = i === cur; const tx = x + i * (w + 3); const hov = inBox(tx, y, w, 13); panel(tx, y, w, 13, { bg: sel ? COL.void3 : COL.void2, bd: sel ? COL.blueL : hov ? COL.line : COL.steel, flat: true }); if (sel) rect(tx + 2, y + 11, w - 4, 1, COL.gold); text(n, tx + w / 2, y + 4, sel ? COL.ink : COL.dim, FS, 1); if (hov) IN.cursor = 'pointer'; if (clickIn(tx, y, w, 13)) { pick = i; SND.play('click'); } });
  return pick;
}
// a NEW badge goes away once you hover the item for a moment
let FRESH_HOV = { id: null, t: 0 };
function seeFresh(id) {
  if (!S.fresh || !S.fresh[id]) return;
  if (FRESH_HOV.id !== id || T_NOW - FRESH_HOV.t > 1) FRESH_HOV = { id, t: T_NOW, last: T_NOW };
  else if (T_NOW - FRESH_HOV.last > 0.1) FRESH_HOV = { id, t: T_NOW, last: T_NOW };   // the mouse left and came back: start over
  else { FRESH_HOV.last = T_NOW; if (T_NOW - FRESH_HOV.t > 0.3) { delete S.fresh[id]; dirty(); } }
}
// generic scrolling grid of item ids. returns clicked id
function itemGrid(st, ids, x, y, w, h, o = {}) {
  const cw = o.cw || 28, ch = o.ch || 22, gap = 2, cols = Math.max(1, Math.floor((w - 4) / (cw + gap)));
  const rows = Math.ceil(ids.length / cols), total = rows * (ch + gap), maxS = Math.max(0, total - h + 4);
  if (inBox(x, y, w, h)) st.scroll = clamp((st.scroll || 0) + IN.wheel * (ch + gap) * 2, 0, maxS); else st.scroll = clamp(st.scroll || 0, 0, maxS);
  let clicked = null;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const r0 = Math.floor(st.scroll / (ch + gap));
  for (let r = r0; r < Math.min(rows, r0 + Math.ceil(h / (ch + gap)) + 2); r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; if (i >= ids.length) break; const id = ids[i];
    const bx = x + 2 + c * (cw + gap), by = y + 2 + r * (ch + gap) - st.scroll;
    if (id === null) { const hov = inBox(bx, by, cw, ch) && inBox(x, y, w, h); panel(bx, by, cw, ch, { bg: COL.void0, bd: hov ? COL.ink : COL.void3, flat: true }); line(bx + 6, by + 6, bx + cw - 7, by + ch - 7, COL.mute); text('NONE', bx + cw / 2, by + ch - 7, COL.mute, FS, 1); if (hov && clickIn(bx, by, cw, ch)) clicked = 'NONE'; continue; }
    const d = getDef(id); const own = o.allOwned || owned(id); const sel = o.sel === id || (o.multi && o.multi.includes(id)); const hov = inBox(bx, by, cw, ch) && inBox(x, y, w, h);
    panel(bx, by, cw, ch, { bg: sel ? COL.void3 : COL.void0, bd: sel ? COL.mint : own ? (hov ? COL.ink : (d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c)) : COL.void3, flat: true });
    drawItemIn(id, bx + 1, by + 1, cw - 2, ch - 2, { sil: !own, maxSc: o.maxSc || 1, noFx: !own });
    if (own && S.inv[id] && S.inv[id].l > 1) text(S.inv[id].l + '', bx + cw - 2, by + ch - 6, S.inv[id].l >= 10 ? COL.gold : COL.cyan, FS, 2);
    if (o.eqd && o.eqd.includes(id)) { rect(bx + 1, by + 1, 4, 4, COL.mint); }
    if (o.multi && o.multi.includes(id)) { ctx.strokeStyle = COL.gold; ctx.strokeRect(bx + 0.5, by + 0.5, cw - 1, ch - 1); rect(bx + cw - 7, by + 1, 6, 6, COL.gold); line(bx + cw - 6, by + 4, bx + cw - 5, by + 5, '#05020c'); line(bx + cw - 5, by + 5, bx + cw - 3, by + 2, '#05020c'); }
    if (S.fresh && S.fresh[id] && own) { if (Math.floor(T_NOW * 3) % 2) { ctx.strokeStyle = COL.pink; ctx.strokeRect(bx + 0.5, by + 0.5, cw - 1, ch - 1); } panel(bx + 1, by + 1, 15, 7, { bg: COL.pink, bd: COL.pink, flat: true }); text('NEW', bx + 2, by + 2, COL.navy, FS); }
    if (hov) { IN.cursor = 'pointer'; TIP.set(own ? { item: id } : `??? ${RAR[d.r].n} ${roleHint(id)}. FIND: ${whereToFind(id)}`); if (clickIn(bx, by, cw, ch)) clicked = id; if (own) seeFresh(id); }
  }
  ctx.restore();
  if (maxS > 0) { const sh = Math.max(10, h * h / total); rect(x + w - 2, y + (h - sh) * (st.scroll / maxS), 2, sh, COL.steel); }
  if (!ids.length) text(o.empty || 'NOTHING HERE YET', x + w / 2, y + h / 2 - 3, COL.mute, FS, 1);
  return clicked;
}
function slotBox(x, y, w, h, id, label, sel, o = {}) {
  const hov = inBox(x, y, w, h);
  panel(x, y, w, h, { bg: sel ? COL.void3 : COL.void0, bd: sel ? COL.cyan : hov ? COL.ink : id ? (RAR[getDef(id).r].c === 'RAINBOW' ? rainbow(T_NOW) : RAR[getDef(id).r].c) : COL.void3, flat: true });
  if (id) drawItemIn(id, x + 1, y + 1, w - 2, h - 9, { maxSc: 1, skin: o.skin });
  text(label, x + w / 2, y + h - 7, sel ? COL.cyan : COL.mute, FS, 1);
  if (o.fresh) { const bl = Math.floor(T_NOW * 3) % 2; panel(x + w - 17, y - 3, 19, 8, { bg: COL.pink, bd: bl ? '#fff' : COL.pink, flat: true }); text('NEW', x + w - 15, y - 1, COL.navy, FS); }
  if (hov) { IN.cursor = 'pointer'; if (id) TIP.set({ item: id }); else TIP.set(label + ': EMPTY' + (o.fresh ? '. NEW GEAR INSIDE' : '')); }
  return clickIn(x, y, w, h);
}

// ---------- callsign (username) ----------
const NAMEUI = { open: false, first: false, err: '', t: 0, box: null };
const NAME_BAD = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAGG', 'NAZI', 'KKK', 'RETARD', 'WHORE', 'SLUT', 'BITCH', 'PENIS', 'PUSSY', 'RAPIST', 'HITLER'];
const NAME_A = ['COSMIC', 'NOVA', 'ASTRO', 'LUNAR', 'SOLAR', 'TURBO', 'PIXEL', 'STAR', 'ROCKET', 'COMET', 'NEBULA', 'ORBIT', 'QUASAR', 'ZERO-G', 'HYPER', 'GALAXY'];
const NAME_B = ['OTTER', 'FOX', 'WOLF', 'PILOT', 'RAVEN', 'TIGER', 'MOTH', 'VIPER', 'KOALA', 'GHOST', 'JACKAL', 'FALCON', 'PANDA', 'SHARK', 'GECKO', 'YETI'];
const nameEl = () => document.getElementById('nameIn');
function cleanName(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9 \-]/g, '').replace(/\s+/g, ' ').replace(/^ /, '').slice(0, 12); }
function nameProblem(s) {
  const t = s.trim(); if (t.length < 3) return 'USE AT LEAST 3 LETTERS OR NUMBERS';
  const flat = t.replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A').replace(/5/g, 'S').replace(/7/g, 'T');
  if (NAME_BAD.some(b => flat.includes(b))) return 'PICK A FRIENDLIER CALLSIGN';
  return '';
}
function randomName() { for (let i = 0; i < 30; i++) { const s = NAME_A[R0.int(NAME_A.length)] + ' ' + NAME_B[R0.int(NAME_B.length)]; if (s.length <= 12) return s; } return 'ASTRO ' + (10 + R0.int(90)); }
function openNameUI(first) {
  NAMEUI.open = true; NAMEUI.first = !!first; NAMEUI.err = ''; NAMEUI.t = 0;
  const el = nameEl(); if (!el) return; el.value = S.name || ''; el.hidden = false; NAMEUI.box = null;
  setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (e) { } }, 0);
}
function closeNameUI() { NAMEUI.open = false; const el = nameEl(); if (el) { el.blur(); el.hidden = true; } try { cvs.focus(); } catch (e) { } }
function saveName() {
  const el = nameEl(); const v = cleanName(el ? el.value : '').trim(); const p = nameProblem(v);
  if (p) { NAMEUI.err = p; SND.play('deny'); return; }
  if (typeof NET !== 'undefined' && NET.st === 'on') {
    if (NAMEUI.busy) return; NAMEUI.busy = true; NAMEUI.err = '';
    rpc('set_callsign', { p_name: v }).then(r => {
      const was = S.name; S.name = r.callsign; NET.callsign = r.callsign; if (NET.ver === r.version - 1) NET.ver = r.version; NET.prof = {};
      S.nameAsked = true; dirty(); closeNameUI(); SND.play('fanfare'); NET.socialT = -1e9;
      toast(was ? `CALLSIGN CHANGED TO ${r.callsign}` : `WELCOME ABOARD, ${r.callsign}`, COL.gold);
    }).catch(e => { NAMEUI.err = e.message; SND.play('deny'); }).finally(() => { NAMEUI.busy = false; });
    return;
  }
  const was = S.name; S.name = v; S.nameAsked = true; dirty(); closeNameUI(); SND.play('fanfare');
  toast(was ? `CALLSIGN CHANGED TO ${v}` : `WELCOME ABOARD, ${v}`, COL.gold);
}
function placeNameEl(x, y, w, h) {
  const el = nameEl(); if (!el) return; const r = cvs.getBoundingClientRect();
  const k = x + ',' + y + ',' + r.left + ',' + r.top + ',' + r.width; if (NAMEUI.box === k) return; NAMEUI.box = k;
  el.style.left = (r.left + x / W * r.width) + 'px'; el.style.top = (r.top + y / H * r.height) + 'px'; el.style.width = (w / W * r.width) + 'px'; el.style.height = (h / H * r.height) + 'px';
}
function drawNameUI(dt) {
  NAMEUI.t += dt; const el = nameEl(); if (!el) { NAMEUI.open = false; return; }
  ctx.globalAlpha = Math.min(0.8, NAMEUI.t * 4); rect(0, 0, W, H, '#03040b'); ctx.globalAlpha = 1;
  const bw = 250, bh = 118, bx = Math.floor((W - bw) / 2), by = Math.floor((H - bh) / 2) - 8;
  panel(bx, by, bw, bh, { bg: COL.void1, bd: COL.gold });
  drawIcon('rocket', bx + 10, by + 8, COL.gold);
  textO(NAMEUI.first ? 'CREATE YOUR CALLSIGN' : 'CHANGE YOUR CALLSIGN', W / 2, by + 8, COL.gold, '#000', FB, 1);
  text('YOUR NAME ON THE STATION, AND LATER TO CREWS AND FRIENDS', W / 2, by + 20, COL.dim, FS, 1);
  const fx = bx + 18, fy = by + 32, fw = bw - 36, fh = 24; placeNameEl(fx, fy, fw, fh);
  const focused = document.activeElement === el;
  const v = cleanName(el.value); if (v !== el.value) el.value = v;
  panel(fx, fy, fw, fh, { bg: '#05070f', bd: focused ? COL.cyan : inBox(fx, fy, fw, fh) ? COL.ink : COL.steel, flat: true });
  if (v) textO(v, W / 2, fy + 5, COL.ink, '#000', FB, 1, 2); else text(focused ? 'TYPE A NAME' : 'CLICK HERE TO TYPE', W / 2, fy + 9, COL.mute, FS, 1);
  if (focused && Math.floor(NAMEUI.t * 2.5) % 2 === 0) rect(W / 2 + (v ? textW(v, FB, 2) / 2 + 2 : 26), fy + 4, 2, 16, COL.cyan);
  if (inBox(fx, fy, fw, fh)) IN.cursor = 'text';
  if (clickIn(fx, fy, fw, fh)) { try { el.focus({ preventScroll: true }); } catch (e) { } }
  text(`${v.length}/12  LETTERS, NUMBERS, SPACES AND -`, W / 2, fy + fh + 4, COL.mute, FS, 1);
  if (NAMEUI.err) text(NAMEUI.err, W / 2, fy + fh + 13, COL.coral, FS, 1);
  if (v && NAMEUI.err && !nameProblem(v)) NAMEUI.err = '';
  const yb = by + bh - 24;
  if (button(bx + 12, yb, 60, 16, NAMEUI.first ? 'LATER' : 'CANCEL', { font: FS }) || kp('Escape')) { if (NAMEUI.first) { S.nameAsked = true; dirty(); toast('YOU CAN SET A CALLSIGN IN TROPHIES ANY TIME', COL.dim); } closeNameUI(); SND.play('click'); return; }
  if (button(bx + 78, yb, 72, 16, 'RANDOM', { font: FS, kind: 'blue', tip: 'ROLL A RANDOM CALLSIGN' })) { el.value = randomName(); NAMEUI.err = ''; SND.play('tick'); }
  if (NAMEUI.busy) text('SAVING...', W / 2, yb - 9, COL.dim, FS, 1);
  if (button(bx + bw - 92, yb, 80, 16, 'SAVE', { kind: 'primary', disabled: NAMEUI.busy }) || ((kp('Enter') || kp('NumpadEnter')) && !NAMEUI.busy)) saveName();
}

// ---------- text boxes: a real (invisible) <input> sits over a box drawn on the canvas ----------
// so phones get their keyboard, and paste / autofill / password managers all work
const FIELDS = new Map();
function textField(key, x, y, w, h, o = {}) {
  let f = FIELDS.get(key);
  if (!f) {
    const el = document.createElement('input'); el.className = 'scField'; el.hidden = true;
    el.type = o.type || 'text'; el.maxLength = o.max || 40; el.spellcheck = false;
    el.setAttribute('autocomplete', o.auto || 'off'); el.setAttribute('autocapitalize', o.caps === false ? 'none' : 'characters'); el.setAttribute('autocorrect', 'off');
    if (o.mode) el.setAttribute('inputmode', o.mode); if (o.label) el.setAttribute('aria-label', o.label);
    el.setAttribute('enterkeyhint', o.enterHint || 'go');
    f = { el, used: false, box: '', enter: false };
    el.addEventListener('keydown', e => { if (e.key === 'Enter') f.enter = true; });
    document.body.appendChild(el); FIELDS.set(key, f);
  }
  const el = f.el; f.used = true; if (el.hidden && !NAMEUI.open && !(typeof NET !== 'undefined' && NET.choice)) el.hidden = false;
  if (o.filter) { const v = o.filter(el.value); if (v !== el.value) el.value = v; }
  const r = cvs.getBoundingClientRect(); const k = x + ',' + y + ',' + w + ',' + r.left + ',' + r.top + ',' + r.width;
  if (f.box !== k) { f.box = k; el.style.left = (r.left + x / W * r.width) + 'px'; el.style.top = (r.top + y / H * r.height) + 'px'; el.style.width = (w / W * r.width) + 'px'; el.style.height = (h / H * r.height) + 'px'; }
  const focused = document.activeElement === el, hov = inBox(x, y, w, h);
  panel(x, y, w, h, { bg: '#05070f', bd: focused ? COL.cyan : hov ? COL.ink : COL.steel, flat: true });
  let shown = o.type === 'password' ? '*'.repeat(el.value.length) : el.value;
  const fnt = o.font || FS, ty = y + Math.floor((h - (fnt === FS ? 5 : 7)) / 2);
  while (shown && textW(shown, fnt) > w - 8) shown = shown.slice(1);
  if (shown) text(shown, x + 4, ty, COL.ink, fnt); else if (!focused) text(o.ph || '', x + 4, ty, COL.mute, fnt);
  if (focused && Math.floor(T_NOW * 2.5) % 2 === 0) rect(x + 4 + (shown ? textW(shown, fnt) + 1 : 0), ty - 1, 1, fnt === FS ? 7 : 9, COL.cyan);
  if (hov) IN.cursor = 'text';
  if (clickIn(x, y, w, h)) { try { el.focus({ preventScroll: true }); } catch (e) { } }
  const enter = f.enter; f.enter = false;
  return { value: el.value, focused, enter, set(v) { el.value = v; }, el };
}
function fieldVal(key) { const f = FIELDS.get(key); return f ? f.el.value : ''; }
function setField(key, v) { const f = FIELDS.get(key); if (f) f.el.value = v; }
function endFields(hideAll) {
  for (const f of FIELDS.values()) {
    if ((hideAll || !f.used) && !f.el.hidden) { if (document.activeElement === f.el) { f.el.blur(); try { cvs.focus(); } catch (e) { } } f.el.hidden = true; f.box = ''; }
    f.used = false;
  }
}
// a scrolling list: returns the scroll offset in rows and draws a scrollbar
function listScroll(st, key, x, y, w, h, rowH, n) {
  const vis = Math.floor(h / rowH), max = Math.max(0, n - vis);
  st[key] = clamp((st[key] || 0) + (inBox(x, y, w, h) ? IN.wheel : 0), 0, max);
  if (max > 0) { const sh = Math.max(8, h * vis / n); rect(x + w - 2, y + (h - sh) * (st[key] / max), 2, sh, COL.steel); }
  return st[key];
}
