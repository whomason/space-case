// ===== LIVE: daily rewards, friend pulse + challenges, market, reports + moderation, settings =====

// ---------- pulse: friends coming online, 1v1 challenges, matches you can watch ----------
const PULSE = { t: -1e9, busy: false, online: null, watch: [], admin: false, flagged: false, seen: new Set(), popup: null, sent: null, off: false };
function pulseTick() {
  if (NET.st !== 'on' || PULSE.busy || PULSE.off) return;
  if (T_NOW - PULSE.t < (PULSE.sent || HUB.panel === 'social' || HUB.panel === 'arena' ? 4 : 8)) return;
  PULSE.t = T_NOW; PULSE.busy = true;
  rpc('pulse').then(r => {
    const now = new Set(r.online || []);
    if (PULSE.online) for (const cs of now) if (!PULSE.online.has(cs)) { toast(`${cs} IS ONLINE`, '#7dffb0'); SND.play('click'); }
    PULSE.online = now; PULSE.watch = r.watch || []; PULSE.admin = !!r.admin; PULSE.flagged = !!r.flagged;
    if ((r.mail | 0) > NET.mail) NET.mail = r.mail | 0;
    for (const c of r.challenges || []) if (!PULSE.seen.has(c.id)) { PULSE.seen.add(c.id); PULSE.popup = { id: c.id, from: c.from, kind: c.kind || 'duel', planet: c.planet, t0: T_NOW }; SND.play('upgradeHint'); }
    for (const a of r.answers || []) if (COOP.inviteId && a.id === COOP.inviteId && !COOP.answered) { COOP.answered = true; if (a.status === 'declined') { toast(`${a.to} SAID NOT RIGHT NOW`, COL.coral); coopReset(); } }
    for (const a of r.answers || []) if (PULSE.sent && a.id === PULSE.sent.id) {
      if (a.status === 'declined') { toast(`${a.to} SAID NOT RIGHT NOW`, COL.coral); if (DQ.on && DQ.code === PULSE.sent.code) duelCancel(); }
      else toast(`${a.to} ACCEPTED! FINDING EACH OTHER...`, '#7dffb0');
      PULSE.sent = null;
    }
  }).catch(e => { if (e.code === 'PGRST202') PULSE.off = true; }).finally(() => { PULSE.busy = false; });
}
function challengeFriend(cs) {
  netDo(() => rpc('challenge_send', { p_callsign: cs }).then(r => { PULSE.sent = { id: r.id, code: r.code, to: cs }; duelSearch(false, r.code); return r; }), `CHALLENGE SENT. WAITING FOR ${cs}`);
}
function watchOf(cs) { return PULSE.watch.find(w => w.a === cs || w.b === cs); }
// the challenge popup sits on top of the station screens
const POP = { x: W / 2 - 120, y: 26, w: 240, h: 36 };
function livePopupUp() { return PULSE.popup && (SCENE === 'hub' || SCENE === 'crates' || SCENE === 'map') && !NAMEUI.open && !NET.choice; }
function liveGrab() { if (livePopupUp() && inBox(POP.x, POP.y, POP.w, POP.h) && IN.pr) { IN.pr = false; return true; } return false; }
function liveOverlay(grabbed) {
  const p = PULSE.popup; if (!p) return;
  const left = 60 - (T_NOW - p.t0); if (left <= 0) { PULSE.popup = null; return; }
  if (!livePopupUp()) return;
  const pr = IN.pr; IN.pr = grabbed; IN.used = false;
  const { x, y, w, h } = POP, pulse = (Math.sin(T_NOW * 6) + 1) / 2;
  ctx.globalAlpha = 0.25 + pulse * 0.25; rect(x - 3, y - 3, w + 6, h + 6, COL.coral); ctx.globalAlpha = 1;
  panel(x, y, w, h, { bg: '#1c0f2e', bd: COL.coral });
  textO(p.kind === 'coop' ? `${p.from}: LAND ON ${planetDef(p.planet || 1).name} TOGETHER?` : `${p.from} CHALLENGES YOU TO A 1V1!`, x + 8, y + 5, COL.ink, '#000', FB);
  bar(x + 8, y + 30, w - 16, 2, left / 60, COL.coral, COL.void0);
  if (button(x + 8, y + 15, 70, 13, 'ACCEPT', { kind: 'primary', font: FS })) {
    const id = p.id; PULSE.popup = null;
    if (p.kind === 'coop') coopAccept(id);
    else rpc('challenge_respond', { p_id: id, p_accept: true }).then(r => { if (r.code) { if (RUN) { RUN = null; } duelSearch(false, r.code); } }).catch(e => toast(e.message, COL.coral));
  }
  if (button(x + 84, y + 15, 60, 13, 'NOT NOW', { font: FS })) { const id = p.id; PULSE.popup = null; rpc('challenge_respond', { p_id: id, p_accept: false }).catch(() => { }); }
  IN.pr = pr;
}

// ---------- daily rewards: a 7-day streak ----------
const DAILY_BASE = [[600, [], 0], [400, [0], 0], [1000, [], 10], [600, [1], 0], [1500, [], 15], [1000, [1, 0], 0], [4000, [1, 2, 3], 60]];   // coins, crate tier steps, stardust (same as the server)
const DAILY = { st: null, t: -1e9, busy: false, shown: false, local: false };
function localDay(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyDays() {
  const pl = Math.max(1, S.planet.reached || 1), k = clamp(pl / 2.5, 1, 8), t = Math.min(5, 1 + Math.floor(pl / 4));
  return DAILY_BASE.map(([c, cr, sd]) => ({ coins: Math.round(c * k / 50) * 50, crates: cr.map(s => Math.min(6, t + s)), dust: sd, item: null }));
}
// signed in: the server keeps the streak. Not signed in: this device does
function dailyInfo() {
  if (NET.st === 'on' && !DAILY.local) return DAILY.st;
  const d = S.daily || {}, today = localDay(), y = localDay(new Date(Date.now() - 864e5));
  const streak = d.last === today || d.last === y ? d.streak || 0 : 0, can = d.last !== today;
  return { streak, can, next: can ? (streak % 7) + 1 : null, today_done: !can, days: dailyDays() };
}
function dailyRefresh(force) {
  if (NET.st !== 'on' || DAILY.local || DAILY.busy || (!force && T_NOW - DAILY.t < 120)) return;
  DAILY.busy = true; DAILY.t = T_NOW;
  rpc('daily_status', { p_tz: new Date().getTimezoneOffset() }).then(r => { DAILY.st = r; }).catch(e => { if (e.code === 'PGRST202') DAILY.local = true; }).finally(() => { DAILY.busy = false; });
}
function dailyClaim() {
  const info = dailyInfo(); if (!info || !info.can) return;
  if (NET.st === 'on' && !DAILY.local) {
    netDo(() => rpc('daily_claim', { p_tz: new Date().getTimezoneOffset() }).then(r => { NET.mail = Math.max(NET.mail, 1); DAILY.t = -99; dailyRefresh(true); DAILY.flash = 1; return r; }),
      r => { passXP(300); track('daily', { day: r.day }); return `DAY ${r.day}: +${fmt(r.coins)} COINS${r.crates.length ? ` + ${r.crates.length} CRATE${r.crates.length > 1 ? 'S' : ''}` : ''}${r.dust ? ` + ${r.dust} STARDUST` : ''}${r.item ? ' + AN EXCLUSIVE' : ''}. IT IS IN YOUR MAILBOX`; });
    return;
  }
  const d = S.daily || {}, today = localDay(), y = localDay(new Date(Date.now() - 864e5));
  const streak = d.last === y ? (d.streak || 0) + 1 : 1, day = ((streak - 1) % 7) + 1, rw = dailyDays()[day - 1];
  S.daily = { last: today, streak }; S.coins += rw.coins; S.stats.earned = (S.stats.earned || 0) + rw.coins;
  for (const t of rw.crates) S.choiceQueue.push({ tier: t, title: 'DAILY CRATE' });
  passXP(300); dirty(); SND.play('fanfare'); DAILY.flash = 1; toast(`DAY ${day}: +${fmt(rw.coins)} COINS${rw.crates.length ? ` + ${rw.crates.length} CRATE${rw.crates.length > 1 ? 'S' : ''}` : ''}`, COL.gold);
}
function dailyCan() { const i = dailyInfo(); return !!(i && i.can); }
function drawDailyButton(x, y) {
  const can = dailyCan(), pulse = can && Math.floor(T_NOW * 3) % 2;
  if (button(x, y, 16, 16, '', { tip: can ? 'DAILY REWARD READY!' : 'DAILY REWARDS', icon: (bx, by, w, h, c) => { rect(bx + 3, by + 6, 10, 7, can ? COL.gold : c); rect(bx + 2, by + 4, 12, 3, can ? '#ffe36b' : c); rect(bx + 7, by + 4, 2, 9, can ? COL.coral : '#05020c'); rect(bx + 5, by + 2, 2, 2, can ? COL.coral : c); rect(bx + 9, by + 2, 2, 2, can ? COL.coral : c); } })) openStation('daily');
  if (pulse) { rect(x + 12, y - 2, 6, 6, COL.coral); text('!', x + 15, y - 1, '#fff', FS, 1); }
}
function panelDaily(st) {
  if (panelFrame('DAILY REWARDS', COL.gold)) return;
  const info = dailyInfo();
  if (!info) { text('LOADING...', W / 2, 120, COL.dim, FS, 1); dailyRefresh(true); return; }
  const days = info.days || dailyDays(), cur = info.can ? info.next : ((info.streak - 1) % 7) + 1;
  text(`STREAK: ${info.streak || 0} DAY${info.streak === 1 ? '' : 'S'}`, W / 2, 34, COL.gold, FB, 1);
  text('COME BACK EVERY DAY. MISS ONE AND THE STREAK STARTS OVER. DAY 7 IS HUGE', W / 2, 46, COL.dim, FS, 1);
  const wk = info.week || Math.floor(Math.max(0, (info.streak || 0) - (info.can ? 0 : 1)) / 7) + 1, toEx = (4 - (wk % 4)) % 4;
  text(toEx ? `WEEK ${wk}. EVERY 4TH WEEK, DAY 7 ALSO GIVES AN EXCLUSIVE COSMETIC (${toEx} WEEK${toEx > 1 ? 'S' : ''} TO GO)` : `WEEK ${wk}: THIS WEEK'S DAY 7 HAS AN EXCLUSIVE COSMETIC!`, W / 2, 54, toEx ? COL.mute : COL.magenta, FS, 1);
  const gap = 4, cw = 54, bigW = 92, x0 = Math.floor(W / 2 - (6 * cw + bigW + 6 * gap) / 2), y0 = 72, online = NET.st === 'on' && !DAILY.local;
  days.forEach((d, i) => {
    const n = i + 1, big = n === 7, w = big ? bigW : cw, x = x0 + i * (cw + gap), got = n < cur || (n === cur && !info.can), now = n === cur && info.can;
    const ch = big ? 104 : 96, y = y0 + (big ? -6 : 0);
    if (now || big) { ctx.globalAlpha = now ? 0.3 + 0.3 * Math.sin(T_NOW * 5) : 0.12 + 0.08 * Math.sin(T_NOW * 3); rect(x - 2, y - 2, w + 4, ch + 4, now ? COL.gold : COL.magenta); ctx.globalAlpha = 1; }
    panel(x, y, w, ch, { bg: got ? '#132018' : now ? '#2a2310' : big ? '#1f0f2e' : COL.void1, bd: now ? COL.gold : got ? '#7dffb0' : big ? COL.magenta : COL.steel });
    text(big ? 'DAY 7!' : 'DAY ' + n, x + w / 2, y + 5, now ? COL.gold : got ? '#7dffb0' : big ? COL.magenta : COL.ink, FB, 1);
    let yy = y + 18;
    drawCoinIcon(x + 6, yy); text(fmtShort(d.coins), x + 16, yy + 1, COL.gold, FS); yy += 11;
    if (d.crates && d.crates.length) { d.crates.forEach((t, k) => miniCrate(x + 6 + k * 15, yy + 1, t)); text(d.crates.length > 1 ? `${d.crates.length} CRATES` : (TIERS[d.crates[0]] ? TIERS[d.crates[0]].n : 'CRATE'), x + w / 2, yy + 13, COL.lilac, FS, 1); yy += 24; }
    if (d.dust) { if (!online) ctx.globalAlpha = 0.4; drawStardustIcon(x + 6, yy); text(online ? `${d.dust} DUST` : 'SIGN IN', x + 16, yy + 1, '#c9a6ff', FS); ctx.globalAlpha = 1; yy += 11; }
    if (d.item) { drawItemIn(d.item, x + 4, yy, w - 8, 22, { maxSc: 2 }); if (inBox(x, yy, w, 22)) TIP.set({ item: d.item }); yy += 24; }
    if (got) { text('CLAIMED', x + w / 2, y + ch - 12, '#7dffb0', FS, 1); }
    else if (now) text('TODAY', x + w / 2, y + ch - 12, COL.gold, FS, 1);
  });
  const by = 176;
  if (info.can) { if (button(W / 2 - 80, by, 160, 22, 'CLAIM DAY ' + cur, { kind: 'primary', disabled: NET.act })) dailyClaim(); }
  else {
    const t = new Date(); t.setHours(24, 0, 0, 0); const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    text(`NEXT REWARD IN ${Math.floor(s / 3600)}H ${Math.floor(s / 60) % 60}M`, W / 2, by + 6, COL.dim, FB, 1);
  }
  text(NET.st === 'on' ? 'YOUR STREAK IS SAVED ON YOUR ACCOUNT' : 'SIGN IN TO KEEP YOUR STREAK ON EVERY DEVICE', W / 2, by + 32, COL.mute, FS, 1);
  if (DAILY.flash > 0) { DAILY.flash -= 1 / 60; ctx.globalAlpha = DAILY.flash * 0.5; rect(0, 0, W, H, COL.gold); ctx.globalAlpha = 1; }
}

// ---------- the market (a tab of the ONLINE panel) ----------
const MK = { list: null, t: -1e9, busy: false, err: '' };
const MK_CATS = [['ALL', null], ['WEAPONS', ['w', 'u', 'e']], ['ARMOR', ['a']], ['SHIP', ['s']], ['LOOKS', ['c', 'k', 'b']], ['OTHER', ['t', 'g', 'p']]];
function mkRefresh(force) {
  if (MK.busy || (!force && T_NOW - MK.t < 15)) return; MK.busy = true; MK.t = T_NOW;
  rpc('market_browse', {}).then(r => { MK.list = (r || []).filter(x => netValid(x.item)); MK.err = ''; }).catch(e => { MK.err = e.code === 'PGRST202' ? 'THE MARKET OPENS AFTER THE SERVER UPDATE' : e.message; }).finally(() => { MK.busy = false; });
}
function mkCat(id) { const c = id.split('|')[0]; return c; }
function socialMarket(st, so) {
  mkRefresh(false);
  if (st.msell) return marketSell(st);
  const LX = 14, LW = 290;
  MK_CATS.forEach(([n], i) => { if (button(LX + i * 46, 30, 44, 12, n, { font: FS, kind: (st.mcat || 0) === i ? 'primary' : 'def' })) { st.mcat = i; st.mscroll = 0; } });
  const q = textField('mkFind', LX, 45, 150, 13, { ph: 'SEARCH BY NAME', max: 20, label: 'Search the market' });
  if (button(LX + 156, 45, 64, 13, st.mmine ? 'ALL LISTINGS' : 'MY LISTINGS', { font: FS, kind: st.mmine ? 'cream' : 'def' })) { st.mmine = !st.mmine; st.mscroll = 0; }
  if (button(LX + 224, 45, 66, 13, 'SELL AN ITEM', { font: FS, kind: 'blue', disabled: PULSE.flagged })) { st.msell = { id: null }; setField('mkPrice', ''); }
  if (PULSE.flagged) text('TRADING IS PAUSED WHILE A MODERATOR CHECKS YOUR ACCOUNT', LX, H - 10, COL.coral, FS);
  if (MK.err) { wrap(MK.err, LW, FS).forEach((l, i) => text(l, LX + LW / 2, 120 + i * 8, COL.coral, FS, 1)); return; }
  if (!MK.list) { text('LOADING THE MARKET...', LX + LW / 2, 120, COL.dim, FS, 1); return; }
  const cat = MK_CATS[st.mcat || 0][1], qs = (q.value || '').trim().toUpperCase();
  const rows = MK.list.filter(m => (!st.mmine || m.mine) && (!cat || cat.includes(mkCat(m.item))) && (!qs || getDef(m.item).name.includes(qs)));
  const y0 = 62, RH = 20, LH = H - 22 - y0, off = listScroll(st, 'mscroll', LX, y0, LW, LH, RH, rows.length);
  if (!rows.length) text(st.mmine ? 'YOU ARE NOT SELLING ANYTHING' : 'NOTHING FOR SALE HERE YET. BE THE FIRST!', LX + LW / 2, y0 + 30, COL.mute, FS, 1);
  rows.slice(off, off + Math.floor(LH / RH)).forEach((m, i) => {
    const y = y0 + i * RH, d = getDef(m.item), sel = st.msel === m.id, hov = sRow(LX, y, LW - 4, RH - 2, sel);
    tradeTile(m.item, LX + 2, y + 1, 26, 16, { lv: m.l });
    let nm = d.name; while (textW(nm, FS) > 150 && nm.length > 4) nm = nm.slice(0, -1);
    text(nm, LX + 32, y + 3, d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c, FS); text(`${RAR[d.r].n}${m.l > 1 ? '  LV ' + m.l : ''}  ${m.mine ? 'YOURS' : m.seller}`, LX + 32, y + 11, COL.mute, FS);
    drawCoinIcon(LX + LW - 58, y + 5); text(fmt(m.price), LX + LW - 8, y + 6, COL.gold, FS, 2);
    if (hov && clickIn(LX, y, LW - 4, RH - 2)) { st.msel = m.id; st.mconf = false; SND.play('click'); }
  });
  // right: the chosen listing
  const RX = 310, RW = W - 14 - RX; panel(RX, 30, RW, H - 44, { bg: '#05070f', bd: COL.steel });
  const m = MK.list.find(x => x.id === st.msel);
  if (!m) { ['PICK SOMETHING TO SEE IT.', 'SELLERS GET PAID WHEN IT SELLS,', 'MINUS A 5% MARKET FEE.', 'LISTINGS LAST 7 DAYS.'].forEach((l, i) => text(l, RX + RW / 2, 100 + i * 9, COL.mute, FS, 1)); return; }
  const d = getDef(m.item);
  panel(RX + 8, 38, RW - 16, 46, { bg: COL.void0, bd: d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c, flat: true }); drawItemIn(m.item, RX + 9, 39, RW - 18, 44, { maxSc: 3 });
  if (inBox(RX + 8, 38, RW - 16, 46)) TIP.set({ item: m.item });
  wrap(d.name, RW - 16, FS).slice(0, 2).forEach((l, i) => text(l, RX + 8, 90 + i * 8, d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c, FS));
  text(`${RAR[d.r].n}  LV ${m.l || 1}${m.g ? '  ' + (TIERS[m.g] ? TIERS[m.g].n + ' GRADE' : '') : ''}`, RX + 8, 108, COL.dim, FS);
  if (m.mine) text('SELLER: YOU', RX + 8, 118, COL.mute, FS); else { text('SELLER:', RX + 8, 118, COL.mute, FS); nameLink(m.seller, m.seller, RX + 8 + textW('SELLER: ', FS), 118, COL.cream); } text(`LISTED ${ago(m.at)}`, RX + 8, 127, COL.mute, FS);
  drawCoinIcon(RX + 8, 140); textO(fmt(m.price), RX + 18, 139, COL.gold, '#000', FB);
  if (owned(m.item) && !m.mine) text('YOU ALREADY OWN ONE (IT WOULD LEVEL UP)', RX + 8, 154, COL.lilac, FS);
  const by = H - 38;
  if (m.mine) { if (button(RX + 8, by, RW - 16, 18, 'TAKE IT DOWN', { kind: 'danger', font: FS, disabled: NET.act })) { const id = m.id; st.msel = null; netDo(() => rpc('market_cancel', { p_id: id }).then(r => { NET.mail = Math.max(NET.mail, 1); MK.t = -99; return r; }), 'TAKEN DOWN. IT IS ON ITS WAY BACK'); } }
  else {
    const can = S.coins >= m.price && !PULSE.flagged;
    if (S.coins < m.price) text('NOT ENOUGH COINS', RX + 8, by - 10, COL.coral, FS);
    if (button(RX + 8, by, RW - 16, 18, st.mconf ? `CONFIRM: ${fmt(m.price)}` : 'BUY', { kind: 'primary', disabled: NET.act || !can })) {
      if (!st.mconf) st.mconf = true;
      else { st.mconf = false; const id = m.id; st.msel = null; netDo(() => netEcon('market_buy', { p_id: id }).then(r => { MK.t = -99; SND.play('fanfare'); HUB.flashT = 2; HUB.flashCol = COL.gold; return r; }), 'BOUGHT! IT IS IN YOUR LOCKER'); }
    }
  }
}
function marketSell(st) {
  const b = st.msell;
  textO('SELL AN ITEM ON THE MARKET', 14, 31, COL.gold, '#000', FB);
  if (button(W - 76, 30, 62, 14, '< BACK', { font: FS })) { st.msell = null; return; }
  const mine = Object.keys(S.inv).filter(id => netValid(id) && !isPremiumId(id)).sort(byRarity), eqd = mine.filter(id => isEquipped(id));
  const sel = b.id ? [b.id] : [];
  tradeGrid(st, 'msgrid', mine, 14, 46, 300, H - 60, sel, { locked: eqd, lv: id => lvl(id), empty: 'NO ITEMS' });
  if (sel[0] !== b.id) b.id = sel.length ? sel[sel.length - 1] : null; if (sel.length > 1) b.id = sel[sel.length - 1];
  const RX = 320, RW = W - 14 - RX; panel(RX, 46, RW, H - 60, { bg: '#05070f', bd: COL.steel });
  if (!b.id) { ['PICK WHAT TO SELL.', 'EQUIPPED GEAR CANNOT', 'BE SOLD. UNEQUIP IT FIRST.'].forEach((l, i) => text(l, RX + RW / 2, 100 + i * 9, COL.mute, FS, 1)); return; }
  const d = getDef(b.id);
  drawItemIn(b.id, RX + 6, 52, RW - 12, 40, { maxSc: 3 });
  wrap(d.name, RW - 12, FS).slice(0, 2).forEach((l, i) => text(l, RX + 6, 96 + i * 8, d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c, FS));
  text(`${RAR[d.r].n}  LV ${lvl(b.id)}`, RX + 6, 114, COL.dim, FS);
  text(`SELLS TO THE SHOP FOR ${fmt(sellValue(b.id))}`, RX + 6, 124, COL.mute, FS);
  text('YOUR PRICE', RX + 6, 138, COL.mute, FS);
  const pf = textField('mkPrice', RX + 6, 146, RW - 12, 15, { ph: fmt(sellValue(b.id) * 3), max: 10, filter: v => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, ''), mode: 'numeric', label: 'Price in coins' });
  const price = +pf.value || 0;
  if (price) text(`YOU GET ${fmt(price - Math.floor(price / 20))} AFTER THE 5% FEE`, RX + 6, 166, '#7dffb0', FS);
  if (button(RX + 6, H - 36, RW - 12, 18, 'LIST FOR SALE', { kind: 'primary', disabled: NET.act || !price || PULSE.flagged })) {
    const id = b.id; netDo(() => netEcon('market_list', { p_item: id, p_price: price }).then(r => { st.msell = null; st.mmine = true; MK.t = -99; return r; }), 'LISTED! YOU GET PAID WHEN IT SELLS');
  }
}

// ---------- reporting a player ----------
const REPORT_WHY = [['NAME', 'BAD CALLSIGN'], ['CHEATING', 'CHEATING'], ['MEAN', 'BEING MEAN'], ['SPAM', 'SPAMMING'], ['OTHER', 'SOMETHING ELSE']];
function reportOverlay() {
  const r = NET.report; if (!r) return;
  ctx.globalAlpha = 0.7; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const x = W / 2 - 120, y = 50, w = 240, h = 160; panel(x, y, w, h, { bg: COL.void1, bd: COL.coral });
  textO(`REPORT ${r.cs}`, x + 10, y + 8, COL.coral, '#000', FB);
  text('WHAT IS WRONG?', x + 10, y + 22, COL.dim, FS);
  REPORT_WHY.forEach(([k, n], i) => { if (button(x + 10 + (i % 2) * 112, y + 32 + Math.floor(i / 2) * 18, 108, 15, n, { font: FS, kind: r.why === k ? 'primary' : 'def' })) r.why = k; });
  const note = textField('reportNote', x + 10, y + 92, w - 20, 15, { ph: 'MORE DETAIL (OPTIONAL)', max: 140, label: 'Report details' });
  text('A MODERATOR WILL LOOK. THEY WILL NOT SEE WHO REPORTED.', x + 10, y + 112, COL.mute, FS);
  if (button(x + 10, y + h - 26, 100, 18, 'SEND REPORT', { kind: 'danger', font: FS, disabled: !r.why || NET.act })) { const a = { p_callsign: r.cs, p_reason: r.why, p_note: note.value || '' }; NET.report = null; setField('reportNote', ''); netDo(() => rpc('report_player', a), x2 => x2); }
  if (button(x + w - 90, y + h - 26, 80, 18, 'CANCEL', { font: FS }) || kp('Escape')) { NET.report = null; setField('reportNote', ''); }
}

// ---------- moderators: reports, flags, bans ----------
const MODQ = { data: null, t: -1e9, busy: false, err: '' };
function socialMod(st) {
  if (!MODQ.busy && T_NOW - MODQ.t > 10) { MODQ.busy = true; MODQ.t = T_NOW; rpc('mod_queue').then(r => { MODQ.data = r; MODQ.err = ''; }).catch(e => { MODQ.err = e.message; }).finally(() => { MODQ.busy = false; }); }
  const refresh = () => { MODQ.t = -99; };
  if (MODQ.err) { text(MODQ.err, W / 2, 120, COL.coral, FS, 1); return; }
  const q = MODQ.data; if (!q) { text('LOADING...', W / 2, 120, COL.dim, FS, 1); return; }
  const LX = 14, LW = 170; text(`REPORTED (${q.players.length})`, LX, 31, COL.coral, FS);
  const rows = q.players.map(p => ({ k: 'r', p })).concat(q.banned.filter(b => !q.players.some(p => p.id === b.id)).map(b => ({ k: 'b', p: b })));
  const y0 = 40, RH = 22, LH = H - 14 - y0, off = listScroll(st, 'modscroll', LX, y0, LW, LH, RH, rows.length);
  if (!rows.length) text('ALL CLEAR. NOTHING TO REVIEW', LX + LW / 2, y0 + 20, '#7dffb0', FS, 1);
  rows.slice(off, off + Math.floor(LH / RH)).forEach((r, i) => {
    const y = y0 + i * RH, p = r.p, sel = st.modsel === p.id, hov = sRow(LX, y, LW - 4, RH - 2, sel);
    text(p.callsign || '(NO CALLSIGN)', LX + 5, y + 3, COL.ink, FB);
    text(r.k === 'b' ? 'BANNED' : `${p.n} REPORT${p.n > 1 ? 'S' : ''}${p.flagged ? '  FLAGGED' : ''}${p.banned_until ? '  BANNED' : ''}`, LX + 5, y + 13, r.k === 'b' || p.flagged ? COL.coral : COL.mute, FS);
    if (hov && clickIn(LX, y, LW - 4, RH - 2)) { st.modsel = p.id; st.modconf = null; SND.play('click'); }
  });
  const RX = 190, RW = W - 14 - RX; panel(RX, 31, RW, H - 45, { bg: '#05070f', bd: COL.steel });
  const row = rows.find(r => r.p.id === st.modsel); if (!row) { text('PICK A PLAYER', RX + RW / 2, 120, COL.mute, FS, 1); return; }
  const p = row.p; let y = 37;
  textO(p.callsign || '(NO CALLSIGN)', RX + 8, y, COL.ink, '#000', FB); y += 12;
  if (row.k === 'r') { text(`LV ${p.level}  ${fmt(p.coins || 0)} COINS  ${p.items} ITEMS`, RX + 8, y, COL.dim, FS); y += 9; }
  if (p.flagged) { text('FLAGGED: ' + (p.flag_reason || ''), RX + 8, y, COL.coral, FS); y += 9; }
  const bu = p.banned_until || p.until; if (bu) { text(`BANNED UNTIL ${new Date(bu).getFullYear() > 2100 ? 'FOREVER' : new Date(bu).toLocaleDateString()}: ${(p.ban_reason || p.reason || '').toUpperCase()}`, RX + 8, y, COL.coral, FS); y += 9; }
  y += 3;
  (p.reports || []).slice(0, 6).forEach(rp => { wrap(`${rp.reason}${rp.by ? ' (BY ' + rp.by + ')' : ' (AUTO)'}: ${(rp.note || '').toUpperCase()}`, RW - 16, FS).slice(0, 2).forEach(l => { text(l, RX + 8, y, COL.cream, FS); y += 8; }); y += 2; });
  const act = (label, kind, a, days, why) => [label, kind, () => {
    if (a === 'ban' && days === 0 && st.modconf !== label) { st.modconf = label; return; }
    st.modconf = null; netDo(() => rpc('mod_action', { p_target: p.id, p_action: a, p_days: days || 0, p_reason: why || (p.reports && p.reports[0] ? p.reports[0].reason : '') }).then(r => { refresh(); return r; }), `${label}: DONE`);
  }];
  const acts = [act('DISMISS', 'def', 'dismiss'), act('BAN 1 DAY', 'danger', 'ban', 1), act('BAN 7 DAYS', 'danger', 'ban', 7), act(st.modconf === 'BAN FOREVER' ? 'SURE?' : 'BAN FOREVER', 'danger', 'ban', 0),
    act('UNBAN', 'blue', 'unban'), act(p.flagged ? 'CLEAR FLAG' : 'FLAG', 'blue', p.flagged ? 'clear' : 'flag'), act('FORCE RENAME', 'def', 'rename')];
  if (st.modconf === 'BAN FOREVER') acts[3][0] = 'SURE?';
  let bx = RX + 8, by = H - 56;
  acts.forEach(([label, kind, fn]) => { const bw = textW(label, FS) + 12; if (bx + bw > RX + RW - 6) { bx = RX + 8; by += 18; } if (button(bx, by, bw, 15, label, { kind, font: FS, disabled: NET.act })) fn(); bx += bw + 4; });
}

// ---------- settings: fullscreen + controls ----------
const BIND_LABEL = { up: 'MOVE UP', left: 'MOVE LEFT', down: 'MOVE DOWN', right: 'MOVE RIGHT', boost: 'BOOST', interact: 'USE / MINE', gadget: 'GADGET', swap: 'SWAP WEAPON', emote: 'ARENA EMOTES', pause: 'PAUSE' };
function keyName(c) {
  if (!c) return '?'; if (/^Key[A-Z]$/.test(c)) return c.slice(3); if (/^Digit\d$/.test(c)) return c.slice(5); if (/^Numpad\d$/.test(c)) return 'NUM ' + c.slice(6);
  return ({ Space: 'SPACE', ShiftLeft: 'L SHIFT', ShiftRight: 'R SHIFT', ControlLeft: 'L CTRL', ControlRight: 'R CTRL', AltLeft: 'L ALT', AltRight: 'R ALT', Tab: 'TAB', CapsLock: 'CAPS', Enter: 'ENTER', Backspace: 'BKSP',
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' })[c] || c.toUpperCase().slice(0, 6);
}
function keyOf(a) { return (S.settings.binds && S.settings.binds[a]) || BIND_DEF[a]; }
function keyLabel(a) { return keyName(keyOf(a)); }
function setBind(a, code) {
  const b = Object.assign({}, S.settings.binds || {}), old = keyOf(a);
  for (const o in BIND_DEF) if (o !== a && keyOf(o) === code) b[o] = old;   // that key was taken: the two swap
  b[a] = code; for (const k in b) if (b[k] === BIND_DEF[k]) delete b[k];
  S.settings.binds = b; applyBinds(b); dirty();
}
function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (isFull()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.catch) r.catch(() => toast('FULLSCREEN IS NOT ALLOWED HERE. PRESS F11', COL.coral)); }
  } catch (e) { toast('FULLSCREEN IS NOT ALLOWED HERE. PRESS F11', COL.coral); }
}
function panelSettings(st) {
  if (panelFrame('SETTINGS', COL.blueL)) { KEYCAP.wait = null; return; }
  const x = 24; let y = 34;
  text('SCREEN', x, y, COL.gold, FS); y += 10;
  if (button(x, y, 120, 18, isFull() ? 'EXIT FULLSCREEN' : 'FULLSCREEN', { kind: 'primary', font: FS })) toggleFullscreen();
  y += 28;
  text('SOUND', x, y, COL.gold, FS); y += 10;
  if (button(x, y, 58, 16, SND.muted ? 'SOUND OFF' : 'SOUND ON', { font: FS, kind: SND.muted ? 'def' : 'blue' })) { SND.setMute(!SND.muted); S.settings.mute = SND.muted; dirty(); }
  if (button(x + 62, y, 58, 16, SND.musicOn ? 'MUSIC ON' : 'MUSIC OFF', { font: FS, kind: SND.musicOn ? 'blue' : 'def' })) { SND.setMusic(!SND.musicOn); S.settings.music = SND.musicOn; if (SND.musicOn) SND.playSong('hub'); dirty(); }
  y += 28;
  text('MOUSE: AIM AND SHOOT', x, y, COL.mute, FS); text('WHEEL OR 1/2/3: SWITCH SLOT', x, y + 8, COL.mute, FS); text('ARROW KEYS ALWAYS MOVE TOO', x, y + 16, COL.mute, FS);
  y += 32; text('HELP', x, y, COL.gold, FS); y += 10;
  if (button(x, y, 120, 16, 'REPORT A BUG', { font: FS, kind: 'danger', tip: 'TELL US WHAT BROKE' })) openBugReport();
  y += 20; if (button(x, y, 58, 14, 'TERMS', { font: FS })) openLegal('terms'); if (button(x + 62, y, 58, 14, 'PRIVACY', { font: FS })) openLegal('privacy');
  text('VERSION ' + GAME_VER, x, y + 20, COL.mute, FS);
  // controls
  const cx = 170; let cy = 34;
  text('CONTROLS: CLICK ONE, THEN PRESS THE NEW KEY', cx, cy, COL.gold, FS); cy += 11;
  if (KEYCAP.wait && KEYCAP.got) { const g = KEYCAP.got; KEYCAP.got = null; if (g !== 'Escape') { setBind(KEYCAP.wait, g); SND.play('pickup'); } KEYCAP.wait = null; }
  Object.keys(BIND_DEF).forEach((a, i) => {
    const ry = cy + i * 17, waiting = KEYCAP.wait === a, changed = keyOf(a) !== BIND_DEF[a];
    text(BIND_LABEL[a], cx, ry + 4, COL.ink, FS);
    const lbl = waiting ? (Math.floor(T_NOW * 3) % 2 ? 'PRESS A KEY' : '') : keyLabel(a);
    if (button(cx + 110, ry, 90, 14, lbl, { font: FS, kind: waiting ? 'primary' : changed ? 'blue' : 'def', tip: waiting ? 'ESC TO CANCEL' : 'CLICK TO CHANGE' })) { KEYCAP.wait = waiting ? null : a; KEYCAP.got = null; }
    if (changed) text('WAS ' + keyName(BIND_DEF[a]), cx + 206, ry + 4, COL.mute, FS);
  });
  if (button(cx, cy + 10 * 17 + 4, 110, 15, 'RESET CONTROLS', { font: FS, disabled: !S.settings.binds || !Object.keys(S.settings.binds).length })) { S.settings.binds = {}; applyBinds({}); KEYCAP.wait = null; dirty(); toast('CONTROLS RESET', COL.mint); }
}

// ---------- every frame ----------
function liveTick(dt) {
  if (S && S.settings && S.settings.binds !== KEY_BINDS) applyBinds(S.settings.binds);
  if (KEYCAP.wait && HUB.panel !== 'settings') KEYCAP.wait = null;
  pulseTick(); if (SCENE === 'hub') dailyRefresh(false); storeTick(dt); metaTick(dt);
  if (NET.recovery && SCENE === 'hub' && HUB.panel !== 'social' && !NET.recoveryOpened) { NET.recoveryOpened = true; openStation('social'); }
  // offer the daily reward once per visit, after the first landing
  if (!DAILY.shown && SCENE === 'hub' && !HUB.panel && !HUB.choice && !NAMEUI.open && !NET.choice && S.nameAsked && S.planet.landings >= 1 && dailyCan() && HUB.launch === null) { DAILY.shown = true; openStation('daily'); }
}

// ---------- clickable names: any callsign on a leaderboard opens that pilot's profile ----------
function nameLink(cs, label, x, y, col, font = FS, align = 0) {
  const w = textW(label, font), x0 = align === 1 ? x - w / 2 : align === 2 ? x - w : x, hov = cs && inBox(x0 - 1, y - 2, w + 2, 9);
  text(label, x, y, hov ? '#ffffff' : col, font, align);
  if (hov) { rect(x0, y + 6, w, 1, col); IN.cursor = 'pointer'; TIP.set('SEE ' + cs + "'S PROFILE"); if (IN.pr) { IN.pr = false; IN.used = true; openProfile(cs); } }
}
function openProfile(cs) {
  if (!cs) return;
  if (NET.st !== 'on') { toast('SIGN IN TO SEE PROFILES', COL.coral); return; }
  NET.viewProf = cs; NET.prof[cs] = null; netProfile(cs, true); SND.play('click');
}
function drawProfilePopup() {
  const cs = NET.viewProf; ctx.globalAlpha = 0.72; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const p = netProfile(cs), x = 88, y = 36, w = 304, h = 214, acts = [];
  if (p && !p.me) {
    if (p.friend === 'none') acts.push(['ADD FRIEND', 'blue', () => netDo(() => rpc('friend_request', { p_callsign: p.callsign }), r => r === 'accepted' ? `YOU AND ${p.callsign} ARE NOW FRIENDS` : `FRIEND REQUEST SENT TO ${p.callsign}`)]);
    else if (p.friend === 'incoming') acts.push(['ACCEPT FRIEND', 'primary', () => netDo(() => rpc('friend_request', { p_callsign: p.callsign }), `YOU AND ${p.callsign} ARE NOW FRIENDS`)]);
    else if (p.friend === 'sent') acts.push(['REQUEST SENT', 'def', () => { }]);
    const wm = watchOf(p.callsign);
    if (wm) acts.push(['WATCH 1V1', 'blue', () => { NET.viewProf = null; arSpectate(wm); }]);
    else if (p.friend === 'friends' && p.online) acts.push(['1V1', 'blue', () => { NET.viewProf = null; challengeFriend(p.callsign); }]);
  }
  textO('PILOT PROFILE', x, y - 14, COL.gold, '#000', FB);
  drawProfileCard(p, x, y, w, h, acts, cs);
  if (button(x + w - 50, y - 15, 50, 13, 'CLOSE', { font: FS, kind: 'cream' }) || (kp('Escape') && !NET.report) || (IN.pr && !inBox(x, y - 16, w, h + 16))) NET.viewProf = null;
  if (NET.report) reportOverlay();
}
