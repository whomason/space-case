// ===== ONLINE: accounts, cloud saves, friends, crews and trades (Supabase backend) =====
// The game still saves to this device every few seconds. When signed in it also syncs to the
// cloud. Anything that moves items between players (trades, mailbox) happens on the server.
const NET_URL = 'https://covyfmkuqynrlzsaieme.supabase.co';
const NET_KEY = 'sb_publishable_ImfcmYTq1l8lW_Y-rnHqBA_PwwgC6JV';
const NET_SESS_KEY = 'spacecase.auth.v1', NET_META_KEY = 'spacecase.netmeta.v1';
const NET = {
  url: NET_URL, st: 'off', sess: null, ver: 0, last: '', lastT: 0, busy: null, err: '', offline: false, mail: 0,
  social: null, socialT: -1e9, socialBusy: false, pending: null, choice: null, syncT: 0, retryT: 0, touchT: 0,
  prof: {}, crews: null, crewsT: -1e9, tinv: {}, act: false, claiming: false, callsign: null,
};
(() => { try { const q = new URLSearchParams(location.search).get('api'); if (q && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(q)) NET.url = q; } catch (e) { } })();

// ---------- http ----------
async function netFetch(path, body, token) {
  const h = { apikey: NET_KEY, 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  let r;
  try { r = await fetch(NET.url + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }); }
  catch (e) { const er = new Error(/whomason\.github\.io|localhost|127\.0\.0\.1/.test(location.hostname) ? "CAN'T REACH THE SERVER. CHECK YOUR INTERNET" : "CAN'T REACH THE SERVER FROM HERE. PLAY ONLINE AT WHOMASON.GITHUB.IO/SPACE-CASE"); er.net = true; throw er; }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
  if (!r.ok) {
    const m = (j && (j.message || j.msg || j.error_description || j.error)) || ('SERVER ERROR ' + r.status);
    const er = new Error(String(m).toUpperCase().replace(/\.$/, '').slice(0, 90)); er.status = r.status; er.code = j && (j.code || j.error_code); throw er;
  }
  return j;
}
function netSaveSess(s) { NET.sess = s; try { if (s) localStorage.setItem(NET_SESS_KEY, JSON.stringify(s)); else localStorage.removeItem(NET_SESS_KEY); } catch (e) { } }
function sessFrom(j) { return { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: j.user && j.user.id, email: j.user && j.user.email }; }
let NET_REFRESH = null;
async function netToken(forceRefresh) {
  const s = NET.sess; if (!s) throw new Error('SIGN IN FIRST');
  if (forceRefresh || Date.now() > s.exp - 60000) {
    if (!NET_REFRESH) NET_REFRESH = netFetch('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.rt }).then(j => netSaveSess(sessFrom(j))).finally(() => { NET_REFRESH = null; });
    try { await NET_REFRESH; } catch (e) { if (!e.net) netLostSession(); throw e; }
  }
  return NET.sess.at;
}
async function rpc(fn, args) {
  let at = await netToken();
  try { return await netFetch('/rest/v1/rpc/' + fn, args || {}, at); }
  catch (e) { if (e.status !== 401) throw e; at = await netToken(true); return netFetch('/rest/v1/rpc/' + fn, args || {}, at); }
}
function netLostSession() { netSaveSess(null); NET.st = 'off'; NET.social = null; toast('SIGNED OUT. SIGN IN AGAIN TO KEEP SYNCING', COL.coral); }

// ---------- save bookkeeping ----------
function netHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
function netMeta() { try { return JSON.parse(localStorage.getItem(NET_META_KEY) || 'null') || {}; } catch (e) { return {}; } }
function netMetaSave() { try { localStorage.setItem(NET_META_KEY, JSON.stringify({ uid: NET.sess && NET.sess.uid, ver: NET.ver, hash: netHash(NET.last) })); } catch (e) { } }
function netPayload() { const o = Object.assign({}, S); try { o._pub = { showcase: topItems(4), power: shipRating() }; } catch (e) { } return o; }
const netSafeScene = () => SCENE === 'hub' || SCENE === 'title' || SCENE === 'map' || SCENE === 'crates';
function netSum(d) { d = d || {}; return { lvl: d.lvl || 1, coins: Math.floor(d.coins || 0), items: Object.keys(d.inv || {}).length, planet: (d.planet && d.planet.reached) || 1, crates: (d.stats && d.stats.crates) || 0 }; }
const netHasProgress = d => { const s = netSum(d); return s.lvl > 1 || s.crates > 0 || s.planet > 1; };
function netAdopt(data, ver, msg) {
  if (!data) return;
  if (!netSafeScene()) { NET.pending = { data, ver, msg }; return; }
  NET.pending = null;
  try { localStorage.setItem(SAVE_KEY + '.backup', JSON.stringify(S)); } catch (e) { }
  S = normalizeSave(data); NET.ver = ver; save();
  NET.last = JSON.stringify(netPayload()); netMetaSave();
  HUB.coinShow = null; if (msg) toast(msg, COL.cyan);
}

// ---------- connect / sync ----------
async function netConnect() {
  if (!NET.sess) { NET.st = 'off'; return; }
  NET.st = 'connecting'; NET.err = '';
  try {
    const meta = netMeta(), uid = NET.sess.uid;
    // a save that belongs to a different account never becomes this account's starting save
    const other = meta.uid && meta.uid !== uid;
    const local = other ? newState() : netPayload();
    const r = await rpc('init_player', { p_local: local });
    NET.callsign = r.callsign; NET.st = 'on'; NET.offline = false; NET.retryT = 0;
    if (r.created) {
      NET.ver = r.version;
      if (other) netAdopt(r.data, r.version, 'NEW ACCOUNT: FRESH START');
      else { NET.last = JSON.stringify(local); netMetaSave(); toast('YOUR PROGRESS IS NOW SAVED TO YOUR ACCOUNT', COL.mint); }
    } else {
      const lj = JSON.stringify(netPayload()), clean = meta.hash === netHash(lj);
      if (meta.uid === uid && meta.ver === r.version) { NET.ver = r.version; NET.last = clean ? lj : ''; }
      else if (meta.uid === uid && clean) netAdopt(r.data, r.version, 'LOADED YOUR LATEST PROGRESS');
      else if (meta.uid === uid) netOpenChoice(r.data, r.version, meta.ver || 0, (meta.ver || 0) >= (r.econ || 0));
      else if (!meta.uid && netHasProgress(S) && JSON.stringify(netSum(S)) !== JSON.stringify(netSum(r.data))) netOpenChoice(r.data, r.version, 0, !r.econ);
      else netAdopt(r.data, r.version, 'WELCOME BACK. LOADED YOUR ACCOUNT');
    }
    if (NET.choice) { /* sorted out after they pick a save */ }
    else if (!r.callsign && S.name) { try { const c = await rpc('set_callsign', { p_name: S.name }); NET.callsign = c.callsign; if (NET.ver === c.version - 1) NET.ver = c.version; } catch (e) { toast(`CALLSIGN ${S.name} IS TAKEN ONLINE. PICK ANOTHER`, COL.coral); S.name = ''; openNameUI(false); } }
    else if (r.callsign && S.name !== r.callsign && !NET.choice) { S.name = r.callsign; }
    netRefreshSocial();
  } catch (e) {
    NET.err = e.message;
    if (NET.sess) { NET.st = 'error'; NET.offline = !!e.net; }
  }
}
function netOpenChoice(data, ver, base, canForce) {
  NET.choice = { data, ver, base, canForce, t: 0, busy: false };
}
function netSync(flush) {
  if (NET.st !== 'on' || NET.choice || NET.pending) return Promise.resolve(false);
  if (NET.busy) return flush ? NET.busy.then(() => netSync(true)) : NET.busy;
  const body = netPayload(), js = JSON.stringify(body);
  if (js === NET.last) {
    if (!flush && T_NOW - NET.touchT > 50) { NET.touchT = T_NOW; rpc('touch').catch(() => { }); }
    return Promise.resolve(true);
  }
  NET.busy = (async () => {
    try {
      const r = await rpc('save_game', { p_data: body, p_base: NET.ver });
      if (r && r.ok) { NET.ver = r.version; NET.last = js; NET.lastT = Date.now(); NET.err = ''; NET.offline = false; NET.touchT = T_NOW; netMetaSave(); NET.mail = r.mail || 0; return true; }
      if (r && r.conflict) { NET.pending = { conflict: r }; return false; }
      return false;
    } catch (e) { NET.err = e.message; NET.offline = !!e.net; return false; }
    finally { NET.busy = null; }
  })();
  return NET.busy;
}
async function netFlush() { const ok = await netSync(true); if (!ok) throw new Error(NET.pending || NET.choice ? 'YOUR SAVES NEED SORTING OUT FIRST' : (NET.err || 'COULD NOT SAVE. TRY AGAIN')); }
// anything that changes your items on the server: save first, then adopt what the server hands back
async function netEcon(fn, args) {
  await netFlush();
  const r = await rpc(fn, args);
  if (r && r.data) { NET.ver = r.version; netAdopt(r.data, r.version); }
  return r;
}
async function netClaimMail() {
  const r = await netEcon('claim_mail', {});
  NET.mail = 0;
  for (const g of (r && r.got) || []) {
    const n = g.items.length, what = [n ? `${n} ITEM${n > 1 ? 'S' : ''}` : '', g.coins ? `${fmt(g.coins)} COINS` : ''].filter(Boolean).join(' + ');
    toast(g.reason === 'trade' ? `TRADE DONE: GOT ${what} FROM ${g.from || 'A FRIEND'}` : `${g.reason.toUpperCase()}: ${what} RETURNED`, COL.gold);
    if (n) { SND.play('win'); HUB.flashT = 2; HUB.flashCol = COL.gold; }
  }
}
async function netRefreshSocial() {
  if (NET.st !== 'on' || NET.socialBusy) return;
  NET.socialBusy = true; NET.socialT = T_NOW;
  try { NET.social = await rpc('my_social'); NET.mail = NET.social.mail || 0; if (NET.social.me) NET.callsign = NET.social.me.callsign; NET.offline = false; }
  catch (e) { NET.err = e.message; NET.offline = !!e.net; }
  finally { NET.socialBusy = false; }
}
function netTick(dt) {
  if (!NET.sess) return;
  if (NET.st === 'error') { NET.retryT += dt; if (NET.retryT > 20) { NET.retryT = 0; netConnect(); } return; }
  if (NET.st !== 'on') return;
  const safe = netSafeScene();
  if (NET.pending && safe && !NET.choice && !NAMEUI.open) {
    const p = NET.pending; NET.pending = null;
    if (p.conflict) { if (p.conflict.can_force) netOpenChoice(p.conflict.data, p.conflict.version, NET.ver, true); else netAdopt(p.conflict.data, p.conflict.version, 'LOADED NEWER PROGRESS FROM ANOTHER DEVICE'); }
    else netAdopt(p.data, p.ver, p.msg);
  }
  NET.syncT += dt; if (NET.syncT > 12) { NET.syncT = 0; netSync(); }
  if (T_NOW - NET.socialT > (HUB.panel === 'social' ? 8 : 30)) netRefreshSocial();
  if (NET.mail > 0 && safe && !NET.claiming && !NET.busy && !NET.choice && !NET.pending) { NET.claiming = true; netClaimMail().catch(e => { NET.err = e.message; }).finally(() => { NET.claiming = false; }); }
}
function netBoot() {
  try { NET.sess = JSON.parse(localStorage.getItem(NET_SESS_KEY) || 'null'); } catch (e) { NET.sess = null; }
  if (NET.sess && NET.sess.at) netConnect(); else NET.sess = null;
  document.addEventListener('visibilitychange', () => { if (document.hidden) netSync(); });
}
async function netSignIn(email, pw, create) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('ENTER A REAL EMAIL ADDRESS');
  if (String(pw || '').length < 6) throw new Error('PASSWORDS NEED AT LEAST 6 CHARACTERS');
  const j = await netFetch(create ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', { email, password: pw });
  if (!j || !j.access_token) throw new Error(create ? 'ACCOUNT MADE. CONFIRM YOUR EMAIL, THEN SIGN IN' : 'SIGN IN FAILED');
  netSaveSess(sessFrom(j)); await netConnect();
  if (NET.st !== 'on') throw new Error(NET.err || 'COULD NOT CONNECT');
}
async function netSignOut() {
  try { await netFlush(); } catch (e) { }
  const at = NET.sess && NET.sess.at; netSaveSess(null);
  Object.assign(NET, { st: 'off', social: null, prof: {}, crews: null, tinv: {}, mail: 0, pending: null, choice: null });
  if (at) netFetch('/auth/v1/logout', {}, at).catch(() => { });
  toast('SIGNED OUT. YOUR PROGRESS STAYS ON THIS DEVICE', COL.dim);
}
// run a button's server action, show the result, refresh the lists
function netDo(fn, ok) {
  if (NET.act) return; NET.act = true;
  Promise.resolve().then(fn)
    .then(r => { if (ok) { SND.play('pickup'); toast(typeof ok === 'function' ? ok(r) : ok, COL.mint); } NET.socialT = -1e9; return netRefreshSocial(); })
    .catch(e => { SND.play('deny'); toast(e.message || 'SOMETHING WENT WRONG', COL.coral); })
    .finally(() => { NET.act = false; });
}
function netProfile(cs, force) {
  const c = NET.prof[cs];
  if (!force && c && (c.loading || T_NOW - c.t < 30)) return c.p;
  NET.prof[cs] = { p: c ? c.p : null, t: T_NOW, loading: true };
  rpc('get_profile', { p_callsign: cs }).then(p => { NET.prof[cs] = { p, t: T_NOW }; }).catch(e => { NET.prof[cs] = { p: null, t: T_NOW, err: e.message }; });
  return c ? c.p : null;
}
const NET_VALID = new Map();
function netValid(id) {
  if (typeof id !== 'string' || id.length > 40) return false;
  let v = NET_VALID.get(id); if (v !== undefined) return v;
  try { const d = getDef(id); v = !!(d && d.name && RAR[d.r]); } catch (e) { v = false; }
  NET_VALID.set(id, v); return v;
}
function netCleanEq(eq) { const o = {}; if (eq && typeof eq === 'object') for (const k in eq) if (netValid(eq[k])) o[k] = eq[k]; return o; }
function ago(iso) { const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return s < 90 ? 'JUST NOW' : s < 3600 ? Math.floor(s / 60) + 'M AGO' : s < 86400 ? Math.floor(s / 3600) + 'H AGO' : Math.floor(s / 86400) + 'D AGO'; }

// ---------- station badge (top bar) ----------
function netBadgeCount() {
  const so = NET.social; if (!so) return 0;
  return (so.incoming || []).length + (so.invites || []).length + (so.trades || []).filter(t => !t.mine).length + ((so.crew && so.crew.requests) || []).length;
}
function drawOnlinePill(x, y) {
  const on = NET.st === 'on', n = netBadgeCount();
  const label = NET.st === 'off' ? 'PLAY ONLINE' : NET.st === 'connecting' ? 'CONNECTING' : NET.st === 'error' || NET.offline ? 'OFFLINE' : 'ONLINE';
  const fo = on && NET.social ? (NET.social.friends || []).filter(f => f.online).length : 0;
  const w = textW(label, FS) + (on ? 22 : 12) + (fo ? textW(fo + '', FS) + 8 : 0);
  if (button(x, y, w, 14, '', { kind: NET.st === 'off' ? 'blue' : 'def', tip: NET.st === 'off' ? 'SIGN IN FOR CLOUD SAVES, FRIENDS, CREWS AND TRADING' : NET.err && (NET.st === 'error' || NET.offline) ? NET.err : 'FRIENDS, CREW AND TRADES' })) openStation('social');
  let tx = x + 6;
  if (on) { rect(tx, y + 5, 4, 4, NET.offline ? COL.coral : '#7dffb0'); tx += 8; }
  text(label, tx, y + 5, NET.st === 'error' || NET.offline ? COL.coral : COL.ink, FS); tx += textW(label, FS) + 4;
  if (fo) { text(fo + '', tx + 2, y + 5, '#7dffb0', FS); }
  if (n) { const bw = textW(n + '', FS) + 6; panel(x + w - 4, y - 4, bw, 9, { bg: COL.pink, bd: '#fff', flat: true }); text(n + '', x + w - 4 + bw / 2, y - 2, COL.navy, FS, 1); }
}

// ---------- the ONLINE panel ----------
function panelSocial(st) {
  if (panelFrame('ONLINE', COL.cyan)) return;
  if (NET.st === 'off' || NET.st === 'connecting' || (NET.st === 'error' && !NET.social)) return socialSignIn(st);
  st.tab = tabs(92, 9, ['FRIENDS', 'CREW', 'TRADES', 'ACCOUNT'], st.tab || 0, 58);
  const so = NET.social;
  if (!NET.callsign && st.tab !== 3) {
    text('PICK A CALLSIGN SO FRIENDS CAN FIND YOU', W / 2, 110, COL.ink, FB, 1);
    if (button(W / 2 - 50, 126, 100, 18, 'SET CALLSIGN', { kind: 'primary' })) openNameUI(false);
    return;
  }
  if (!so) { text(NET.err || 'LOADING...', W / 2, 120, NET.err ? COL.coral : COL.dim, FS, 1); return; }
  if (st.tab === 0) socialFriends(st, so);
  else if (st.tab === 1) socialCrew(st, so);
  else if (st.tab === 2) socialTrades(st, so);
  else socialAccount(st);
  if (NET.act) text('WORKING...', W - 74, 32, COL.dim, FS);
}
function socialSignIn(st) {
  const x = 120, w = 240; let y = 40;
  textO('PLAY ONLINE', W / 2, y, COL.cyan, '#000', FB, 1, 2); y += 22;
  ['YOUR SAVE IN THE CLOUD, ON ANY DEVICE', 'FRIENDS, CREWS AND TRADING'].forEach(l => { text(l, W / 2, y, COL.dim, FS, 1); y += 8; }); y += 6;
  text('EMAIL', x, y, COL.mute, FS); y += 7;
  const em = textField('email', x, y, w, 16, { type: 'email', auto: 'email', caps: false, max: 80, ph: 'YOU@EXAMPLE.COM', mode: 'email', label: 'Email' }); y += 22;
  text('PASSWORD (6+ CHARACTERS)', x, y, COL.mute, FS); y += 7;
  const pw = textField('pw', x, y, w, 16, { type: 'password', auto: st.create ? 'new-password' : 'current-password', caps: false, max: 72, label: 'Password' }); y += 24;
  const go = create => { if (NET.act) return; NET.act = true; NET.err = ''; netSignIn(em.value, pw.value, create).then(() => { setField('pw', ''); SND.play('fanfare'); }).catch(e => { NET.err = e.message; SND.play('deny'); }).finally(() => { NET.act = false; }); };
  if (button(x, y, 116, 18, 'SIGN IN', { kind: 'primary', disabled: NET.act }) || ((em.enter || pw.enter) && !NET.act)) go(false);
  if (button(x + 124, y, 116, 18, 'CREATE ACCOUNT', { kind: 'blue', disabled: NET.act, font: FS })) go(true);
  y += 26;
  if (NET.act || NET.st === 'connecting') text('CONNECTING...', W / 2, y, COL.dim, FS, 1);
  else if (NET.err) wrap(NET.err, 300, FS).forEach((l, i) => text(l, W / 2, y + i * 8, COL.coral, FS, 1));
  y += 20;
  ['THE FIRST TIME YOU SIGN IN, YOUR PROGRESS ON THIS DEVICE', 'MOVES INTO YOUR ACCOUNT. NO EMAILS ARE SENT.'].forEach(l => { text(l, W / 2, y, COL.mute, FS, 1); y += 8; });
}
// list row helper
function sRow(x, y, w, h, sel) { const hov = inBox(x, y, w, h); panel(x, y, w, h, { bg: sel ? COL.void3 : hov ? COL.void2 : COL.void0, bd: sel ? COL.cyan : COL.void3, flat: true }); if (hov) IN.cursor = 'pointer'; return hov; }
function sDot(x, y, on) { rect(x, y, 4, 4, on ? '#7dffb0' : COL.steel); }
function cardLine(p) { return `LV ${p.level}  ${planetDef(Math.max(1, p.planet || 1)).name}`; }
function socialFriends(st, so) {
  const LX = 14, LW = 200;
  text('ADD A FRIEND', LX, 31, COL.mute, FS);
  const f = textField('addFriend', LX, 38, LW - 50, 15, { ph: 'THEIR CALLSIGN', max: 12, filter: cleanName, label: 'Friend callsign' });
  if ((button(LX + LW - 46, 38, 46, 15, 'ADD', { kind: 'blue', font: FS, disabled: NET.act || !f.value.trim() }) || (f.enter && f.value.trim())) && !NET.act) { const cs = f.value.trim(); netDo(() => rpc('friend_request', { p_callsign: cs }).then(r => { setField('addFriend', ''); return r; }), r => r === 'accepted' ? `YOU AND ${cs} ARE NOW FRIENDS` : r === 'sent' ? `FRIEND REQUEST SENT TO ${cs}` : r.toUpperCase()); }
  const rows = [];
  for (const p of so.incoming || []) rows.push({ k: 'in', p });
  for (const p of (so.friends || []).slice().sort((a, b) => (b.online - a.online) || a.callsign.localeCompare(b.callsign))) rows.push({ k: 'f', p });
  for (const p of so.outgoing || []) rows.push({ k: 'out', p });
  const y0 = 58, RH = 19, LH = H - 14 - y0, off = listScroll(st, 'fscroll', LX, y0, LW, LH, RH, rows.length);
  if (!rows.length) { ['NO FRIENDS YET.', 'ADD ONE BY THEIR CALLSIGN,', 'OR FIND THEM IN A CREW.'].forEach((l, i) => text(l, LX + LW / 2, y0 + 20 + i * 8, COL.mute, FS, 1)); }
  rows.slice(off, off + Math.floor(LH / RH)).forEach((r, i) => {
    const y = y0 + i * RH, p = r.p, sel = st.sel === p.callsign;
    const hov = sRow(LX, y, LW - 4, RH - 2, sel);
    if (r.k === 'f') sDot(LX + 5, y + 7, p.online);
    text(p.callsign, LX + 13, y + 3, r.k === 'out' ? COL.mute : COL.ink, FB);
    text(r.k === 'in' ? 'WANTS TO BE FRIENDS' : r.k === 'out' ? 'REQUEST SENT' : (p.crew ? `[${p.crew.tag}] ` : '') + cardLine(p), LX + 13, y + 11, r.k === 'in' ? COL.gold : COL.mute, FS);
    if (r.k === 'in') {
      if (button(LX + LW - 60, y + 2, 26, 13, 'YES', { kind: 'primary', font: FS, disabled: NET.act })) netDo(() => rpc('friend_respond', { p_other: p.id, p_accept: true }), `YOU AND ${p.callsign} ARE NOW FRIENDS`);
      if (button(LX + LW - 31, y + 2, 24, 13, 'NO', { font: FS, disabled: NET.act })) netDo(() => rpc('friend_respond', { p_other: p.id, p_accept: false }));
    } else if (r.k === 'out') { if (button(LX + LW - 50, y + 2, 43, 13, 'CANCEL', { font: FS, disabled: NET.act })) netDo(() => rpc('friend_remove', { p_other: p.id })); }
    else if (hov && clickIn(LX, y, LW - 4, RH - 2)) { st.sel = p.callsign; st.rmConfirm = false; SND.play('click'); netProfile(p.callsign, true); }
  });
  // right: the selected astronaut
  const RX = 222, RW = W - 14 - RX;
  if (!st.sel) { panel(RX, 31, RW, H - 45, { bg: COL.void0, bd: COL.void3 }); ['PICK A FRIEND TO SEE', 'THEIR LOADOUT AND BEST FINDS'].forEach((l, i) => text(l, RX + RW / 2, 120 + i * 9, COL.mute, FS, 1)); return; }
  const p = netProfile(st.sel);
  const acts = [];
  if (p && p.friend === 'friends') {
    acts.push(['TRADE', 'primary', () => { st.tab = 2; tradeStart(st, p.callsign); }]);
    const cr = so.crew; if (cr && (cr.my_role === 'leader' || cr.my_role === 'officer') && !p.crew) acts.push(['INVITE TO CREW', 'blue', () => netDo(() => rpc('crew_invite', { p_callsign: p.callsign }), r => r === 'joined' ? `${p.callsign} JOINED YOUR CREW` : `CREW INVITE SENT TO ${p.callsign}`)]);
    acts.push([st.rmConfirm ? 'SURE?' : 'UNFRIEND', 'danger', () => { if (!st.rmConfirm) { st.rmConfirm = true; return; } st.rmConfirm = false; const id = p.id; netDo(() => rpc('friend_remove', { p_other: id }), 'FRIEND REMOVED'); st.sel = null; }]);
  }
  drawProfileCard(p, RX, 31, RW, H - 45, acts, st.sel);
}
function drawProfileCard(p, x, y, w, h, acts, cs) {
  panel(x, y, w, h, { bg: '#05070f', bd: COL.steel });
  if (!p) { const c = NET.prof[cs]; text(c && c.err ? c.err : 'LOADING...', x + w / 2, y + h / 2, c && c.err ? COL.coral : COL.dim, FS, 1); return; }
  const eq = netCleanEq(p.loadout);
  ctx.globalAlpha = 0.3; for (let gx = x + 4; gx < x + 74; gx += 10) rect(gx, y + 4, 1, 92, COL.steel); ctx.globalAlpha = 1;
  shadow(x + 40, y + 92, 16, 3, 0.5); ctx.drawImage(astroSprite(eq, [0, 3, 1, 2][Math.floor(T_NOW / 1.5) % 4], 0), x + 10, y + 14, 60, 78); if (eq.pet) drawPetAt(eq.pet, x + 66, y + 94, 1, true);
  const tx = x + 80;
  textO(p.callsign || '???', tx, y + 6, COL.ink, '#000', FB, 0, 2);
  const tt = p.title && TITLES.find(t => t.id === p.title);
  text(tt ? tt.n : 'ASTRONAUT', tx, y + 24, COL.lilac, FS);
  if (p.crew) text(`CREW [${p.crew.tag}] ${p.crew.name}`, tx, y + 32, COL.cyan, FS);
  sDot(tx, y + 41, p.online); text(p.online ? 'ONLINE NOW' : 'SEEN ' + ago(p.last_seen), tx + 7, y + 40, p.online ? '#7dffb0' : COL.mute, FS);
  const s = p.stats || {}; const rows = [['LEVEL', p.level], ['FURTHEST', planetDef(Math.max(1, p.planet || 1)).name], ['SHIP RATING', s.power || '-'], ['ITEMS FOUND', s.items || 0], ['ALIENS', fmt(s.kills || 0)], ['CRATES', fmt(s.crates || 0)], ['LEGENDARY+', (s.legendaries || 0) + (s.mythics || 0) + (s.cosmics || 0)]];
  rows.forEach(([k, v], i) => { const cx = tx + (i % 2) * 82, cy = y + 52 + Math.floor(i / 2) * 9; text(k, cx, cy, COL.mute, FS); text(String(v), cx + 78, cy, COL.ink, FS, 2); });
  text('BEST FINDS', x + 8, y + 104, COL.gold, FS);
  const sh = (Array.isArray(p.showcase) ? p.showcase : []).filter(netValid).slice(0, 4);
  sh.forEach((id, i) => { const bx = x + 8 + i * 56, by = y + 112; const d = getDef(id); panel(bx, by, 52, 30, { bg: COL.void0, bd: d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c, flat: true }); drawItemIn(id, bx + 1, by + 1, 50, 28, { maxSc: 1 }); if (inBox(bx, by, 52, 30)) TIP.set({ item: id }); });
  if (!sh.length) text('NOTHING TO SHOW YET', x + 8, y + 116, COL.mute, FS);
  text('LOADOUT', x + 8, y + 148, COL.gold, FS);
  const slots = ['weapon', 'gadget', 'tool', 'pet', 'helmet', 'chest', 'boots', 'jetpack'];
  slots.forEach((sl, i) => { const id = eq[sl]; const bx = x + 8 + i * 28, by = y + 156; panel(bx, by, 26, 20, { bg: COL.void0, bd: id ? (getDef(id).r === 6 ? rainbow(T_NOW) : RAR[getDef(id).r].c) : COL.void3, flat: true }); if (id) { drawItemIn(id, bx + 1, by + 1, 24, 18, { maxSc: 1, noFx: true }); if (inBox(bx, by, 26, 20)) TIP.set({ item: id }); } });
  let bx = x + 8; const by = y + h - 22;
  for (const [label, kind, fn] of acts || []) { const bw = textW(label, FS) + 14; if (button(bx, by, bw, 16, label, { kind, font: FS, disabled: NET.act })) fn(); bx += bw + 4; }
}
function socialCrew(st, so) {
  const cr = so.crew;
  if (!cr) return socialNoCrew(st, so);
  const isLead = cr.my_role === 'leader', isOff = isLead || cr.my_role === 'officer';
  // header
  textO(`[${cr.tag}] ${cr.name}`, 14, 31, COL.cyan, '#000', FB, 0, 2);
  text(cr.motto || (isLead ? 'NO MOTTO YET' : ''), 14, 49, COL.dim, FS);
  text(`${cr.members.length}/20 MEMBERS  ${cr.open ? 'OPEN: ANYONE CAN JOIN' : 'CLOSED: JOIN BY REQUEST'}`, 14, 57, COL.mute, FS);
  if (isLead && button(W - 172, 31, 76, 14, cr.open ? 'MAKE CLOSED' : 'MAKE OPEN', { font: FS, disabled: NET.act })) netDo(() => rpc('crew_update', { p_motto: cr.motto, p_open: !cr.open }), cr.open ? 'CREW IS NOW CLOSED' : 'CREW IS NOW OPEN');
  if (button(W - 92, 31, 78, 14, st.leaveConfirm ? 'REALLY LEAVE?' : 'LEAVE CREW', { kind: 'danger', font: FS, disabled: NET.act })) { if (!st.leaveConfirm) st.leaveConfirm = true; else { st.leaveConfirm = false; st.msel = null; netDo(() => rpc('crew_leave'), r => r === 'disbanded' ? 'CREW DISBANDED' : 'YOU LEFT THE CREW'); } }
  if (isLead) {
    const m = textField('motto', W - 172, 48, 120, 13, { ph: 'NEW MOTTO', max: 40, label: 'Crew motto' });
    if ((button(W - 48, 48, 34, 13, 'SET', { font: FS, disabled: NET.act || !m.value.trim() }) || (m.enter && m.value.trim())) && !NET.act) { const v = m.value; netDo(() => rpc('crew_update', { p_motto: v, p_open: cr.open }).then(r => { setField('motto', ''); return r; }), 'MOTTO SAVED'); }
  }
  // members list
  const rows = [];
  for (const p of cr.requests || []) rows.push({ k: 'req', p });
  for (const p of cr.members) rows.push({ k: 'm', p });
  const LX = 14, LW = 200, y0 = 68, RH = 19;
  let LH = H - 14 - y0; if (isOff) LH -= 20;
  const off = listScroll(st, 'cscroll', LX, y0, LW, LH, RH, rows.length);
  rows.slice(off, off + Math.floor(LH / RH)).forEach((r, i) => {
    const y = y0 + i * RH, p = r.p, sel = st.msel === p.callsign; const hov = sRow(LX, y, LW - 4, RH - 2, sel);
    if (r.k === 'm') sDot(LX + 5, y + 7, p.online);
    const badge = r.k === 'req' ? 'WANTS TO JOIN' : p.role === 'leader' ? 'LEADER' : p.role === 'officer' ? 'OFFICER' : 'MEMBER';
    text(p.callsign, LX + 13, y + 3, p.callsign === NET.callsign ? COL.gold : COL.ink, FB);
    text(`${badge}  ${cardLine(p)}`, LX + 13, y + 11, r.k === 'req' ? COL.gold : p.role === 'leader' ? COL.gold : p.role === 'officer' ? COL.cyan : COL.mute, FS);
    if (r.k === 'req') {
      if (button(LX + LW - 60, y + 2, 26, 13, 'YES', { kind: 'primary', font: FS, disabled: NET.act })) netDo(() => rpc('crew_respond', { p_user: p.id, p_accept: true }), `${p.callsign} JOINED THE CREW`);
      if (button(LX + LW - 31, y + 2, 24, 13, 'NO', { font: FS, disabled: NET.act })) netDo(() => rpc('crew_respond', { p_user: p.id, p_accept: false }));
    } else if (hov && clickIn(LX, y, LW - 4, RH - 2)) { st.msel = p.callsign; st.kickConfirm = false; SND.play('click'); netProfile(p.callsign, true); }
  });
  if (isOff) {
    const f = textField('crewInvite', LX, H - 31, LW - 58, 15, { ph: 'INVITE BY CALLSIGN', max: 12, filter: cleanName, label: 'Invite callsign' });
    if ((button(LX + LW - 54, H - 31, 50, 15, 'INVITE', { kind: 'blue', font: FS, disabled: NET.act || !f.value.trim() }) || (f.enter && f.value.trim())) && !NET.act) { const cs = f.value.trim(); netDo(() => rpc('crew_invite', { p_callsign: cs }).then(r => { setField('crewInvite', ''); return r; }), r => r === 'joined' ? `${cs} JOINED THE CREW` : `INVITE SENT TO ${cs}`); }
  }
  const RX = 222, RW = W - 14 - RX;
  const m = st.msel && cr.members.find(x => x.callsign === st.msel);
  if (!m) { panel(RX, 68, RW, H - 82, { bg: COL.void0, bd: COL.void3 }); ['PICK A CREWMATE TO SEE', 'THEIR LOADOUT'].forEach((l, i) => text(l, RX + RW / 2, 150 + i * 9, COL.mute, FS, 1)); return; }
  const acts = [];
  if (m.callsign !== NET.callsign) {
    acts.push(['TRADE', 'primary', () => { st.tab = 2; tradeStart(st, m.callsign); }]);
    if (isLead) {
      acts.push([m.role === 'officer' ? 'DEMOTE' : 'PROMOTE', 'blue', () => netDo(() => rpc('crew_set_role', { p_user: m.id, p_role: m.role === 'officer' ? 'member' : 'officer' }), r => `${m.callsign} IS NOW ${r === 'officer' ? 'AN OFFICER' : 'A MEMBER'}`)]);
      acts.push(['MAKE LEADER', 'outline', () => netDo(() => rpc('crew_transfer', { p_user: m.id }), `${m.callsign} LEADS THE CREW NOW`)]);
    }
    if (isLead || (cr.my_role === 'officer' && m.role === 'member')) acts.push([st.kickConfirm ? 'SURE?' : 'KICK', 'danger', () => { if (!st.kickConfirm) { st.kickConfirm = true; return; } st.kickConfirm = false; st.msel = null; netDo(() => rpc('crew_kick', { p_user: m.id }), `${m.callsign} WAS REMOVED`); }]);
  }
  drawProfileCard(netProfile(m.callsign), RX, 68, RW, H - 82, acts, m.callsign);
}
function socialNoCrew(st, so) {
  const LX = 14, LW = 200; let y = 31;
  textO('START A CREW', LX, y, COL.cyan, '#000', FB); y += 12;
  text('CREW NAME', LX, y, COL.mute, FS); text('TAG', LX + 150, y, COL.mute, FS); y += 7;
  const nm = textField('crewName', LX, y, 144, 15, { ph: '3-16 CHARACTERS', max: 16, label: 'Crew name' });
  const tg = textField('crewTag', LX + 150, y, 50, 15, { ph: 'ABC', max: 4, filter: v => v.toUpperCase().replace(/[^A-Z0-9]/g, ''), label: 'Crew tag' }); y += 20;
  if (button(LX, y, 96, 15, st.closed ? 'CLOSED: BY REQUEST' : 'OPEN: ANYONE JOINS', { font: FS, tip: 'CLICK TO SWITCH' })) st.closed = !st.closed;
  if (button(LX + 104, y, 96, 15, 'CREATE CREW', { kind: 'primary', font: FS, disabled: NET.act || !nm.value.trim() || tg.value.length < 2 })) { const n = nm.value, t = tg.value; netDo(() => rpc('crew_create', { p_name: n, p_tag: t, p_open: !st.closed }).then(r => { setField('crewName', ''); setField('crewTag', ''); return r; }), 'CREW CREATED. YOU ARE THE LEADER'); }
  y += 24;
  text('CREW INVITES', LX, y, COL.gold, FS); y += 9;
  const inv = so.invites || [];
  if (!inv.length) { text('NO INVITES RIGHT NOW', LX, y + 2, COL.mute, FS); y += 12; }
  inv.slice(0, 5).forEach(c => { sRow(LX, y, LW - 4, 17, false); text(`[${c.tag}] ${c.name}`, LX + 5, y + 5, COL.ink, FS); if (button(LX + LW - 74, y + 2, 34, 13, 'JOIN', { kind: 'primary', font: FS, disabled: NET.act })) netDo(() => rpc('crew_join', { p_crew: c.id }), `WELCOME TO ${c.name}`); if (button(LX + LW - 37, y + 2, 30, 13, 'NO', { font: FS, disabled: NET.act })) netDo(() => rpc('crew_decline_invite', { p_crew: c.id })); y += 19; });
  // browse
  const RX = 222, RW = W - 14 - RX;
  text('FIND A CREW', RX, 31, COL.gold, FS);
  const q = textField('crewSearch', RX, 38, RW - 50, 15, { ph: 'SEARCH NAMES', max: 16, label: 'Search crews' });
  if (button(RX + RW - 46, 38, 46, 15, 'SEARCH', { font: FS }) || q.enter || (!NET.crews && T_NOW - NET.crewsT > 5)) { NET.crewsT = T_NOW; const qq = q.value; rpc('crew_list', { p_query: qq }).then(r => { NET.crews = r || []; }).catch(e => { NET.crews = []; toast(e.message, COL.coral); }); }
  const list = NET.crews || []; const y0 = 58, RH = 21, LH = H - 14 - y0, off = listScroll(st, 'crscroll', RX, y0, RW, LH, RH, list.length);
  if (NET.crews && !list.length) text('NO CREWS YET. START THE FIRST ONE!', RX + RW / 2, y0 + 20, COL.mute, FS, 1);
  list.slice(off, off + Math.floor(LH / RH)).forEach((c, i) => {
    const y = y0 + i * RH; sRow(RX, y, RW - 4, RH - 2, false);
    text(`[${c.tag}] ${c.name}`, RX + 5, y + 3, COL.ink, FB);
    text(`${c.members}/20  LEADER ${c.leader || '?'}  ${c.open ? 'OPEN' : 'CLOSED'}`, RX + 5, y + 12, COL.mute, FS);
    const invited = (so.invites || []).some(x => x.id === c.id);
    if (button(RX + RW - 50, y + 3, 42, 13, c.open || invited ? 'JOIN' : 'ASK', { kind: c.open || invited ? 'primary' : 'blue', font: FS, disabled: NET.act || c.members >= 20, tip: c.open ? 'JOIN RIGHT AWAY' : 'ASK THE LEADER TO LET YOU IN' })) netDo(() => rpc('crew_join', { p_crew: c.id }), r => r === 'joined' ? `WELCOME TO ${c.name}` : `REQUEST SENT TO ${c.name}`);
  });
}
// ---------- trades ----------
function tradeStart(st, cs) {
  st.build = { to: cs, give: [], want: [], gs: 0, ws: 0 };
  setField('giveCoins', ''); setField('wantCoins', ''); setField('tradeNote', '');
  NET.tinv[cs] = null;
  rpc('trade_inventory', { p_callsign: cs }).then(r => { NET.tinv[cs] = r; }).catch(e => { NET.tinv[cs] = { err: e.message }; });
}
function tradeTile(id, x, y, w, h, o = {}) {
  const ok = netValid(id); const d = ok ? getDef(id) : null; const hov = inBox(x, y, w, h);
  panel(x, y, w, h, { bg: o.sel ? '#2a2310' : COL.void0, bd: o.sel ? COL.gold : hov ? COL.ink : d ? (d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c) : COL.void3, flat: true });
  if (d) drawItemIn(id, x + 1, y + 1, w - 2, h - 2, { maxSc: 1, noFx: true }); else text('?', x + w / 2, y + h / 2 - 3, COL.mute, FS, 1);
  if (o.lv > 1) text(o.lv + '', x + w - 2, y + h - 6, COL.cyan, FS, 2);
  if (o.locked) { ctx.globalAlpha = 0.6; rect(x + 1, y + 1, w - 2, h - 2, '#000'); ctx.globalAlpha = 1; text('EQ', x + 2, y + 2, COL.mute, FS); }
  if (o.sel) rect(x + 1, y + 1, 4, 4, COL.gold);
  if (hov) { IN.cursor = o.locked ? 'not-allowed' : 'pointer'; if (d) TIP.set(o.locked ? 'EQUIPPED, SO IT CANNOT BE TRADED' : { item: id }); }
  return hov && !o.locked && clickIn(x, y, w, h);
}
function tradeGrid(st, key, ids, x, y, w, h, selArr, o = {}) {
  const cw = 30, ch = 22, cols = Math.floor((w - 4) / (cw + 2)), rows = Math.ceil(ids.length / cols);
  const off = listScroll(st, key, x, y, w, h, ch + 2, rows);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let r = off; r < Math.min(rows, off + Math.ceil(h / (ch + 2))); r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; if (i >= ids.length) break; const id = ids[i];
    const sel = selArr.includes(id), locked = o.locked && o.locked.includes(id);
    if (tradeTile(id, x + 2 + c * (cw + 2), y + 2 + (r - off) * (ch + 2), cw, ch, { sel, locked, lv: o.lv ? o.lv(id) : 0 })) {
      if (sel) selArr.splice(selArr.indexOf(id), 1); else if (selArr.length < 6) selArr.push(id); else toast('UP TO 6 ITEMS EACH WAY', COL.coral);
      SND.play('click');
    }
  }
  ctx.restore();
  if (!ids.length) text(o.empty || 'NOTHING HERE', x + w / 2, y + h / 2, COL.mute, FS, 1);
}
const byRarity = (a, b) => getDef(b).r - getDef(a).r || getDef(a).name.localeCompare(getDef(b).name);
function socialTrades(st, so) {
  if (st.build) return tradeBuilder(st, so);
  const LX = 14, LW = 200;
  text('START A TRADE WITH', LX, 31, COL.mute, FS);
  const f = textField('tradeWith', LX, 38, LW - 58, 15, { ph: 'FRIEND OR CREWMATE', max: 12, filter: cleanName, label: 'Trade with callsign' });
  if ((button(LX + LW - 54, 38, 54, 15, 'START', { kind: 'primary', font: FS, disabled: !f.value.trim() }) || (f.enter && f.value.trim()))) { tradeStart(st, f.value.trim()); setField('tradeWith', ''); return; }
  const list = so.trades || [];
  const y0 = 58, RH = 21, LH = H - 14 - y0, off = listScroll(st, 'tscroll', LX, y0, LW, LH, RH, list.length);
  if (!list.length) ['NO OPEN OFFERS.', 'OFFERS LAST 3 DAYS. ITEMS YOU OFFER', 'ARE HELD SAFE UNTIL THE TRADE ENDS.'].forEach((l, i) => text(l, LX + LW / 2, y0 + 16 + i * 8, COL.mute, FS, 1));
  list.slice(off, off + Math.floor(LH / RH)).forEach((t, i) => {
    const y = y0 + i * RH, sel = st.tsel === t.id; const hov = sRow(LX, y, LW - 4, RH - 2, sel);
    text((t.mine ? 'TO ' : 'FROM ') + t.other.callsign, LX + 5, y + 3, t.mine ? COL.dim : COL.gold, FB);
    const g = t.give.length, wn = t.want.length;
    text(`${g} ITEM${g === 1 ? '' : 'S'}${t.give_coins ? ' +' + fmt(t.give_coins) : ''} FOR ${wn} ITEM${wn === 1 ? '' : 'S'}${t.want_coins ? ' +' + fmt(t.want_coins) : ''}`, LX + 5, y + 12, COL.mute, FS);
    if (!t.mine) { rect(LX + LW - 12, y + 7, 4, 4, Math.floor(T_NOW * 3) % 2 ? COL.gold : COL.pink); }
    if (hov && clickIn(LX, y, LW - 4, RH - 2)) { st.tsel = t.id; st.acceptConfirm = false; SND.play('click'); }
  });
  const RX = 222, RW = W - 14 - RX; const t = list.find(x => x.id === st.tsel);
  panel(RX, 31, RW, H - 45, { bg: '#05070f', bd: COL.steel });
  if (!t) { ['PICK AN OFFER TO SEE IT,', 'OR START A NEW TRADE'].forEach((l, i) => text(l, RX + RW / 2, 120 + i * 9, COL.mute, FS, 1)); return; }
  const theyGive = t.mine ? t.want : t.give, youGive = t.mine ? t.give : t.want;
  const theyCoins = t.mine ? t.want_coins : t.give_coins, youCoins = t.mine ? t.give_coins : t.want_coins;
  textO(t.mine ? `YOUR OFFER TO ${t.other.callsign}` : `${t.other.callsign} OFFERS YOU`, RX + 8, 37, COL.ink, '#000', FB);
  if (t.note) text('NOTE: ' + t.note, RX + 8, 48, COL.dim, FS);
  const box = (label, ids, coins, y, col) => {
    text(label, RX + 8, y, col, FS);
    ids.forEach((id, i) => tradeTile(id, RX + 8 + (i % 6) * 38, y + 8 + Math.floor(i / 6) * 28, 36, 26, {}));
    if (!ids.length) text('NO ITEMS', RX + 8, y + 16, COL.mute, FS);
    if (coins) { drawCoinIcon(RX + 8, y + 40); text(fmt(coins) + ' COINS', RX + 18, y + 41, COL.gold, FS); }
  };
  box('YOU GET', theyGive, theyCoins, 58, '#7dffb0');
  box('YOU GIVE', youGive, youCoins, 118, COL.coral);
  const by = H - 36;
  if (t.mine) { if (button(RX + 8, by, 90, 18, 'CANCEL OFFER', { kind: 'danger', font: FS, disabled: NET.act })) { st.tsel = null; netDo(() => rpc('trade_decline', { p_id: t.id }), 'OFFER CANCELLED. YOUR ITEMS ARE ON THEIR WAY BACK'); } }
  else {
    const eqd = youGive.filter(id => isEquipped(id)), missing = youGive.filter(id => !owned(id));
    if (missing.length) text("YOU NO LONGER OWN SOMETHING THEY ASKED FOR", RX + 8, by - 10, COL.coral, FS);
    else if (eqd.length) text('UNEQUIP WHAT THEY ASKED FOR TO ACCEPT', RX + 8, by - 10, COL.coral, FS);
    else if (youCoins > S.coins) text('NOT ENOUGH COINS', RX + 8, by - 10, COL.coral, FS);
    const can = !missing.length && !eqd.length && youCoins <= S.coins;
    if (button(RX + 8, by, 90, 18, st.acceptConfirm ? 'CONFIRM' : 'ACCEPT', { kind: 'primary', disabled: NET.act || !can })) {
      if (!st.acceptConfirm) st.acceptConfirm = true;
      else { st.acceptConfirm = false; st.tsel = null; netDo(() => netEcon('trade_accept', { p_id: t.id }), () => { SND.play('fanfare'); HUB.flashT = 2.5; HUB.flashCol = COL.gold; return 'TRADE DONE. CHECK YOUR LOCKER'; }); }
    }
    if (button(RX + 104, by, 70, 18, 'DECLINE', { font: FS, disabled: NET.act })) { st.tsel = null; netDo(() => rpc('trade_decline', { p_id: t.id }), 'OFFER DECLINED'); }
  }
}
function tradeBuilder(st, so) {
  const b = st.build, inv = NET.tinv[b.to];
  textO(`TRADE WITH ${b.to}`, 14, 31, COL.gold, '#000', FB);
  if (button(W - 76, 30, 62, 14, '< BACK', { font: FS })) { st.build = null; return; }
  const half = (W - 36) / 2, LX = 14, RX = 14 + half + 8, gy = 56, gh = H - 14 - gy - 52;
  // yours
  text(`YOU GIVE (${b.give.length}/6)`, LX, 46, COL.coral, FS);
  const mine = Object.keys(S.inv).filter(netValid).sort(byRarity);
  const myEq = mine.filter(id => isEquipped(id));
  tradeGrid(st, 'gscroll', mine, LX, gy, half, gh, b.give, { locked: myEq, lv: id => lvl(id), empty: 'NO ITEMS' });
  // theirs
  text(`YOU WANT (${b.want.length}/6)`, RX, 46, '#7dffb0', FS);
  if (!inv) text('LOADING THEIR ITEMS...', RX + half / 2, gy + gh / 2, COL.dim, FS, 1);
  else if (inv.err) wrap(inv.err, half - 10, FS).forEach((l, i) => text(l, RX + half / 2, gy + 30 + i * 8, COL.coral, FS, 1));
  else { const theirs = Object.keys(inv.inv || {}).filter(netValid).sort(byRarity); tradeGrid(st, 'wscroll', theirs, RX, gy, half, gh, b.want, { locked: inv.eq || [], lv: id => inv.inv[id] || 1, empty: 'THEY HAVE NOTHING TO TRADE' }); }
  // coins + note + send
  const yb = gy + gh + 6; const digits = v => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
  text('+ COINS', LX, yb + 4, COL.mute, FS); const gc = textField('giveCoins', LX + 34, yb, 80, 14, { ph: '0', max: 12, filter: digits, mode: 'numeric', label: 'Coins you give' });
  text(`YOU HAVE ${fmt(S.coins)}`, LX + 120, yb + 4, COL.mute, FS);
  text('+ COINS', RX, yb + 4, COL.mute, FS); const wc = textField('wantCoins', RX + 34, yb, 80, 14, { ph: '0', max: 12, filter: digits, mode: 'numeric', label: 'Coins you want' });
  const note = textField('tradeNote', LX, yb + 20, W - 28 - 130, 15, { ph: 'NOTE (OPTIONAL)', max: 60, label: 'Trade note' });
  const g = +gc.value || 0, wv = +wc.value || 0; const empty = !b.give.length && !b.want.length && !g && !wv;
  if (button(W - 136, yb + 18, 122, 18, 'SEND OFFER', { kind: 'primary', disabled: NET.act || empty || g > S.coins || !inv || !!inv.err, tip: 'YOUR ITEMS ARE HELD SAFE UNTIL THEY ANSWER, OR FOR 3 DAYS' })) {
    const args = { p_to: b.to, p_give: b.give.slice(), p_want: b.want.slice(), p_give_coins: g, p_want_coins: wv, p_note: note.value || '' };
    netDo(() => netEcon('trade_propose', args).then(r => { st.build = null; st.tsel = r.trade; return r; }), `OFFER SENT TO ${b.to}`);
  }
}
function socialAccount(st) {
  const x = 30; let y = 40;
  text('SIGNED IN AS', x, y, COL.mute, FS); text((NET.sess && NET.sess.email) || '', x, y + 8, COL.ink, FB); y += 26;
  text('CALLSIGN', x, y, COL.mute, FS); text(NET.callsign || 'NOT SET', x, y + 8, NET.callsign ? COL.gold : COL.mute, FB);
  if (button(x + Math.max(60, textW(NET.callsign || 'NOT SET', FB)) + 10, y + 5, 56, 14, NET.callsign ? 'RENAME' : 'SET', { kind: 'blue', font: FS })) openNameUI(!NET.callsign);
  y += 30;
  text('CLOUD SAVE', x, y, COL.mute, FS);
  const synced = NET.last && JSON.stringify(netPayload()) === NET.last;
  text(NET.offline ? "OFFLINE. SAVING ON THIS DEVICE UNTIL THE SERVER IS BACK" : synced ? `ALL SYNCED${NET.lastT ? ' (' + ago(new Date(NET.lastT).toISOString()) + ')' : ''}` : 'SYNCING SOON', x, y + 8, NET.offline ? COL.coral : synced ? '#7dffb0' : COL.dim, FS);
  text(`VERSION ${NET.ver}`, x, y + 16, COL.mute, FS);
  if (button(x, y + 26, 80, 16, 'SYNC NOW', { font: FS, disabled: NET.act })) netDo(() => netFlush(), 'SAVED TO THE CLOUD');
  y += 56;
  if (button(x, y, 80, 16, 'SIGN OUT', { kind: 'danger', font: FS, disabled: NET.act })) netDo(() => netSignOut());
  text('YOUR GAME KEEPS SAVING ON THIS DEVICE TOO.', x, y + 26, COL.mute, FS);
  text('IF YOU PLAY ON TWO DEVICES, THE GAME ASKS WHICH SAVE TO KEEP.', x, y + 34, COL.mute, FS);
}
// ---------- two saves: pick one ----------
function drawNetChoice(dt) {
  const c = NET.choice; c.t += dt;
  ctx.globalAlpha = Math.min(0.85, c.t * 4); rect(0, 0, W, H, '#03040b'); ctx.globalAlpha = 1;
  const bw = 320, bh = 150, bx = (W - bw) / 2, by = (H - bh) / 2 - 6;
  panel(bx, by, bw, bh, { bg: COL.void1, bd: COL.gold });
  textO('TWO DIFFERENT SAVES', W / 2, by + 8, COL.gold, '#000', FB, 1);
  text('THIS DEVICE AND YOUR ACCOUNT HAVE DIFFERENT PROGRESS.', W / 2, by + 20, COL.dim, FS, 1);
  text('PICK ONE TO KEEP. THE OTHER IS BACKED UP ON THIS DEVICE.', W / 2, by + 28, COL.dim, FS, 1);
  const card = (label, d, x) => { const s = netSum(d); panel(x, by + 40, 140, 66, { bg: COL.void0, bd: COL.steel, flat: true }); text(label, x + 70, by + 45, COL.cyan, FB, 1); [['LEVEL', s.lvl], ['COINS', fmt(s.coins)], ['ITEMS', s.items], ['FURTHEST', planetDef(Math.max(1, s.planet)).name]].forEach(([k, v], i) => { text(k, x + 8, by + 58 + i * 10, COL.mute, FS); text(String(v), x + 132, by + 58 + i * 10, COL.ink, FS, 2); }); };
  card('THIS DEVICE', S, bx + 14); card('YOUR ACCOUNT', c.data, bx + bw - 154);
  if (button(bx + bw - 154, by + bh - 30, 140, 18, 'USE ACCOUNT SAVE', { kind: 'blue', font: FS, disabled: c.busy })) { NET.choice = null; netAdopt(c.data, c.ver, 'LOADED YOUR ACCOUNT SAVE'); return; }
  if (button(bx + 14, by + bh - 30, 140, 18, 'KEEP THIS DEVICE', { kind: 'primary', font: FS, disabled: c.busy || !c.canForce, tip: c.canForce ? 'UPLOADS THIS DEVICE PROGRESS TO YOUR ACCOUNT' : 'TRADES HAPPENED ON YOUR ACCOUNT SINCE THIS DEVICE LAST SYNCED, SO ITS ITEMS ARE OUT OF DATE' })) {
    c.busy = true; const body = netPayload();
    rpc('save_game', { p_data: body, p_base: c.base, p_force: true }).then(r => {
      NET.choice = null;
      if (r && r.ok) { try { localStorage.setItem(SAVE_KEY + '.backup', JSON.stringify(c.data)); } catch (e) { } NET.ver = r.version; NET.last = JSON.stringify(body); netMetaSave(); toast('THIS DEVICE PROGRESS IS NOW ON YOUR ACCOUNT', COL.mint); }
      else if (r && r.conflict) netAdopt(r.data, r.version, 'YOUR ACCOUNT CHANGED. LOADED IT INSTEAD');
    }).catch(e => { c.busy = false; toast(e.message, COL.coral); });
  }
  if (!c.canForce) text('TRADES CHANGED YOUR ACCOUNT, SO ONLY ITS SAVE CAN BE USED', W / 2, by + bh - 8, COL.coral, FS, 1);
}
