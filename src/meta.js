// ===== META: analytics, crash logs, bug reports, legal pages, and the moderator stats screen =====
// Analytics are our own (no outside trackers): a random id per browser, a few events, no personal info.
const GAME_VER = '2026.10.29';
const META = { q: [], sendT: 5, beatT: 60, sess: Math.random().toString(36).slice(2, 10), t0: Date.now(), act: 0, crashes: new Set(), on: false };
// only talk to a real server (the website, or the local test server); never from a saved copy of the page
META.on = (() => { try { return location.protocol === 'https:' || /^http:\/\/(localhost|127\.0\.0\.1)/.test(NET.url); } catch (e) { return false; } })();
function deviceId() {
  if (META.dev) return META.dev;
  let d = null; try { d = localStorage.getItem('spacecase.device' + TEST_NS); } catch (e) { d = null; }
  if (!d || !/^[a-z0-9]{8,40}$/.test(d)) { d = ''; for (let i = 0; i < 20; i++) d += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; try { localStorage.setItem('spacecase.device' + TEST_NS, d); } catch (e) { } }
  return (META.dev = d);
}
function track(k, d) { if (!META.on) return; META.q.push({ k, d: d || {} }); if (META.q.length > 60) META.q.splice(0, META.q.length - 60); }
// the first time something happens on this save: first crate, first equip, first landing...
function firstTime(what) { if (!S) return; S.firsts = S.firsts || {}; if (S.firsts[what]) return; S.firsts[what] = 1; dirty(); track('first', { what }); }
async function anonRpc(fn, args) {
  const tok = NET.sess && NET.sess.at && Date.now() < (NET.sess.exp || 0) - 30000 ? NET.sess.at : null;
  try { return await netFetch('/rest/v1/rpc/' + fn, args, tok); }
  catch (e) { if (tok && (e.status === 401 || e.status === 403)) return netFetch('/rest/v1/rpc/' + fn, args, null); throw e; }
}
function metaFlush() {
  if (!META.on || !META.q.length || META.flushing) return;
  const batch = META.q.splice(0, 40); META.flushing = true;
  anonRpc('track', { p_device: deviceId(), p_events: batch }).catch(() => { }).finally(() => { META.flushing = false; });
}
function metaTick(dt) {
  if (!META.on) return;
  if (!META.started) { META.started = true; track('session', { s: META.sess, v: GAME_VER, w: innerWidth, h: innerHeight, touch: IN.touch ? 1 : 0, lv: S ? S.lvl : 0, pl: S ? S.planet.reached : 0, ref: (() => { try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 40) : ''; } catch (e) { return ''; } })() }); }
  if (!document.hidden) { META.act += Math.min(dt, 0.25); META.beatT -= dt; if (META.beatT <= 0) { META.beatT = 120; track('beat', { s: META.sess, m: Math.round(META.act / 60), sc: SCENE }); } }   // minutes actually on screen
  META.sendT -= dt; if (META.sendT <= 0) { META.sendT = 15; metaFlush(); }
  if (S && NET.st === 'on') firstTime('signup');
  if (S && S.stats && S.stats.equips > 0) firstTime('equip');
}
addEventListener('pagehide', () => { try { if (META.on && META.started) track('end', { s: META.sess, m: Math.round(META.act / 6) / 10, sc: SCENE }); if (META.on && META.q.length) { const b = JSON.stringify({ p_device: deviceId(), p_events: META.q.splice(0, 40) }); fetch(NET.url + '/rest/v1/rpc/track', { method: 'POST', keepalive: true, headers: { apikey: NET_KEY, 'Content-Type': 'application/json' }, body: b }).catch(() => { }); } } catch (e) { } });

// ---------- crashes: every error the game catches gets logged once per session ----------
function logCrash(e) {
  try {
    if (!META.on || !e) return; const msg = String(e.message || e).slice(0, 300); if (META.crashes.has(msg) || META.crashes.size > 12) return; META.crashes.add(msg);
    anonRpc('log_crash', { p_device: deviceId(), p_msg: msg, p_stack: String(e.stack || '').slice(0, 2000), p_scene: SCENE, p_ver: GAME_VER }).catch(() => { });
  } catch (x) { }
}
addEventListener('error', ev => logCrash(ev.error || ev.message));
addEventListener('unhandledrejection', ev => { const r = ev.reason; if (r && (r.net || r.status)) return; logCrash(r); });

// ---------- bug reports ----------
const BUG = { open: false, sent: false };
function openBugReport() { BUG.open = true; BUG.sent = false; setField('bugNote', ''); SND.play('click'); }
function drawBugReport() {
  ctx.globalAlpha = 0.75; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  const x = 70, y = 50, w = W - 140, h = 160; panel(x, y, w, h, { bg: COL.void1, bd: COL.coral });
  textO('REPORT A BUG', x + 10, y + 8, COL.coral, '#000', FB);
  text('WHAT HAPPENED? WHAT WERE YOU DOING WHEN IT BROKE?', x + 10, y + 26, COL.ink, FS);
  const f = textField('bugNote', x + 10, y + 36, w - 20, 16, { ph: 'THE BOSS GOT STUCK IN A WALL ON GLACIS...', max: 300, label: 'Describe the bug' });
  text('WE ALSO SEND: GAME VERSION, SCREEN, YOUR PLANET AND LEVEL, AND RECENT ERRORS.', x + 10, y + 58, COL.mute, FS);
  text('NOTHING PERSONAL. NO EMAIL, NO PASSWORDS.', x + 10, y + 66, COL.mute, FS);
  const note = f.value.trim();
  if (button(x + 10, y + h - 28, 120, 18, 'SEND REPORT', { kind: 'primary', disabled: note.length < 3 || NET.act })) {
    const info = { v: GAME_VER, scene: SCENE, w: innerWidth, h: innerHeight, ua: navigator.userAgent.slice(0, 160), lv: S.lvl, pl: S.planet.reached, cur: S.planet.cur, online: NET.st, errs: [...META.crashes].slice(0, 6), err: ERR ? String(ERR.message || ERR).slice(0, 200) : null };
    NET.act = true; anonRpc('bug_report', { p_device: deviceId(), p_note: note, p_info: info }).then(r => { toast(r || 'THANKS! YOUR BUG REPORT WAS SENT', '#7dffb0'); BUG.open = false; setField('bugNote', ''); }).catch(e => toast(e.message, COL.coral)).finally(() => { NET.act = false; });
  }
  if (button(x + w - 90, y + h - 28, 80, 18, 'CANCEL', { font: FS }) || kp('Escape')) { BUG.open = false; setField('bugNote', ''); }
  if (!META.on) text('BUG REPORTS ONLY SEND FROM THE WEBSITE', x + 10, y + h - 40, COL.coral, FS);
}

// ---------- legal pages (they live next to the game on the website) ----------
function openLegal(which) {
  const base = /spacecrates\.net$/.test(location.hostname) ? location.origin + '/' : /whomason\.github\.io/.test(location.hostname) ? location.origin + '/space-case/' : 'https://spacecrates.net/';
  const url = base + (which === 'privacy' ? 'privacy.html' : 'terms.html');
  try { const w = window.open(url, '_blank'); if (!w) location.href = url; } catch (e) { toast('OPEN ' + url.toUpperCase(), COL.dim); }
}

// ---------- moderators: how the game is doing ----------
const ADM = { d: null, t: -1e9, busy: false, err: '' };
function socialStats(st) {
  if (!ADM.busy && T_NOW - ADM.t > 20) { ADM.busy = true; ADM.t = T_NOW; rpc('admin_stats').then(r => { ADM.d = r; ADM.err = ''; }).catch(e => { ADM.err = e.message; }).finally(() => { ADM.busy = false; }); }
  if (ADM.err) { text(ADM.err, W / 2, 120, COL.coral, FS, 1); return; }
  const d = ADM.d; if (!d) { text('LOADING...', W / 2, 120, COL.dim, FS, 1); return; }
  st.sv = tabs(14, 30, ['PLAYERS', 'MONEY', 'BUGS', 'CRASHES'], st.sv || 0, 60);
  const x = 14, y = 48;
  if (st.sv === 0) {
    // active players per day, with new players on top
    const days = d.days || [], max = Math.max(1, ...days.map(r => r.active)), bw = 22, ch = 90;
    text('PLAYERS PER DAY (LAST 14 DAYS)', x, y, COL.gold, FS);
    days.forEach((r, i) => { const bx = x + i * (bw + 4), hA = Math.round(ch * r.active / max), hN = Math.round(ch * r.new / max); rect(bx, y + 12 + ch - hA, bw, hA, '#2a6a8a'); rect(bx, y + 12 + ch - hN, bw, hN, '#7dffb0'); text(r.active + '', bx + bw / 2, y + 4 + ch - hA, COL.ink, FS, 1); text(String(r.day).slice(8, 10), bx + bw / 2, y + 16 + ch, COL.mute, FS, 1); });
    rect(x, y + 128, 6, 5, '#2a6a8a'); text('PLAYED THAT DAY', x + 9, y + 127, COL.mute, FS); rect(x + 90, y + 128, 6, 5, '#7dffb0'); text('BRAND NEW', x + 99, y + 127, COL.mute, FS);
    const R = d.ret || {}, F = d.funnel || {}, rx = 380;
    text('COMING BACK', rx, y, COL.gold, FS);
    text(`NEXT DAY: ${d.ret1 ?? '-'}%`, rx, y + 12, COL.ink, FS); text(`AFTER 7 DAYS: ${R.d7 ?? '-'}%`, rx, y + 22, COL.ink, FS); text(`(${R.cohort || 0} PLAYERS 8-30 DAYS OLD)`, rx, y + 32, COL.mute, FS);
    text(`AVG SESSION: ${d.mins ?? '-'} MIN`, rx, y + 46, COL.ink, FS);
    text('NEW PLAYER FUNNEL (30 DAYS)', rx, y + 62, COL.gold, FS);
    const fn = [['STARTED', F.devices], ['OPENED A CRATE', F.crate], ['EQUIPPED', F.equip], ['LANDED', F.land], ['BEAT A BOSS', F.boss], ['MADE AN ACCOUNT', F.signup]];
    fn.forEach(([n, v], i) => { const pc = F.devices ? Math.round(100 * (v || 0) / F.devices) : 0; text(n, rx, y + 74 + i * 9, COL.dim, FS); text(`${v || 0} (${pc}%)`, W - 16, y + 74 + i * 9, COL.ink, FS, 2); });
  } else if (st.sv === 1) {
    const m = d.money || {};
    text('MONEY (AFTER REFUNDS, BEFORE STRIPE FEES)', x, y, COL.gold, FS);
    textO(`$${((m.cents30 || 0) / 100).toFixed(2)}`, x, y + 14, '#7dffb0', '#000', FB, 0, 2); text('LAST 30 DAYS', x + 90, y + 20, COL.mute, FS);
    text(`ALL TIME: $${((m.cents || 0) / 100).toFixed(2)}   BUYERS: ${m.buyers || 0}`, x, y + 40, COL.ink, FS);
    let yy = y + 56; text('SOLD', x, yy, COL.gold, FS); yy += 10;
    for (const [k, n] of Object.entries(m.by || {})) { text(k.toUpperCase(), x, yy, COL.dim, FS); text(n + '', x + 150, yy, COL.ink, FS, 2); yy += 9; }
  } else if (st.sv === 2) {
    const bugs = d.bugs || []; text(`OPEN BUG REPORTS (${bugs.length})`, x, y, COL.gold, FS);
    const RH = 26, off = listScroll(st, 'bugscroll', x, y + 10, W - 28, H - 70, RH, bugs.length);
    bugs.slice(off, off + Math.floor((H - 70) / RH)).forEach((b, i) => {
      const yy = y + 10 + i * RH; panel(x, yy, W - 28, RH - 2, { bg: COL.void0, bd: b.status === 'new' ? COL.coral : COL.steel, flat: true });
      text(`${new Date(b.created_at).toLocaleDateString()} ${b.who || 'SIGNED OUT'}  ${b.info && b.info.scene ? b.info.scene.toUpperCase() : ''} V${(b.info && b.info.v) || '?'}`, x + 4, yy + 3, COL.mute, FS);
      text(wrap(String(b.note).toUpperCase(), W - 140, FS)[0] || '', x + 4, yy + 13, COL.ink, FS);
      if (button(W - 104, yy + 5, 40, 13, 'FIXED', { font: FS, kind: 'primary' })) netDo(() => rpc('admin_bug', { p_id: b.id, p_status: 'fixed' }).then(r => { ADM.t = -1e9; return r; }), 'MARKED FIXED');
      if (button(W - 60, yy + 5, 40, 13, 'JUNK', { font: FS })) netDo(() => rpc('admin_bug', { p_id: b.id, p_status: 'junk' }).then(r => { ADM.t = -1e9; return r; }), 'REMOVED');
      if (inBox(x, yy, W - 140, RH - 2)) TIP.set(String(b.note).toUpperCase().slice(0, 300) + (b.info && b.info.err ? '  ERROR: ' + String(b.info.err).toUpperCase() : ''));
    });
    if (!bugs.length) text('NO OPEN BUG REPORTS', W / 2, 120, '#7dffb0', FS, 1);
  } else {
    const cr = d.crashes || []; text('CRASHES IN THE LAST 14 DAYS (MOST COMMON FIRST)', x, y, COL.gold, FS);
    cr.slice(0, 16).forEach((c, i) => { const yy = y + 12 + i * 11; text(`${c.n}X  ${c.players} PLAYERS`, x, yy, COL.coral, FS); text(String(c.message).toUpperCase().slice(0, 64), x + 90, yy, COL.ink, FS); if (inBox(x, yy - 2, W - 28, 10)) TIP.set(`${String(c.message).toUpperCase()} (IN ${String(c.scene || '').toUpperCase()}, V${c.ver})`); });
    if (!cr.length) text('NO CRASHES. NICE', W / 2, 120, '#7dffb0', FS, 1);
  }
}
