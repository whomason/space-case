// ===== STORE: Stardust, the FROSTFALL season pass, the shop, coin packs and the supporter plate =====
// Real money buys Stardust, the pass or the plate through Stripe (a Supabase Edge Function makes the
// checkout, a webhook pays it out). Everything else is spent from Stardust the server keeps.
// Store and reward cosmetics (ids ending |6000 to |6999) can't be traded, listed, sold or fused.

// ---------- the premium cosmetics: [cat, sub, style or pattern, name, hue, sat, light, rarity, where] ----------
const PREM = {
  6000: ['c', 'headgear', 'WIZARD HAT', "SANTA'S HAT", 0, 0.85, 0.5, 4, 'pass'],
  6001: ['k', 'armor', 'STRIPE', 'CANDY CANE ARMOR', 355, 0.85, 0.55, 4, 'pass'],
  6002: ['c', 'back', 'CAPE', 'NORTH POLE CAPE', 350, 0.8, 0.45, 4, 'pass'],
  6003: ['c', 'trail', 'SNOW', 'BLIZZARD TRAIL', 195, 0.7, 0.75, 4, 'pass'],
  6004: ['c', 'eyewear', 'STAR SHADES', 'TINSEL SHADES', 48, 0.95, 0.55, 4, 'pass'],
  6005: ['k', 'weapon', 'STRIPE', 'CANDY CANE BLASTER', 0, 0.85, 0.55, 4, 'pass'],
  6006: ['c', 'headgear', 'HORNS', 'REINDEER ANTLERS', 28, 0.55, 0.4, 4, 'pass'],
  6007: ['k', 'ship', 'GILDED', 'SLEIGH PAINT', 355, 0.8, 0.45, 5, 'pass'],
  6008: ['c', 'back', 'FAIRY WINGS', 'SNOWFLAKE WINGS', 195, 0.8, 0.8, 5, 'pass'],
  6009: ['b', 'backdrop', 'AURORA', 'WINTER AURORA', 160, 0.7, 0.55, 5, 'pass'],
  6010: ['c', 'killfx', 'FIREWORKS', 'NEW YEAR FIREWORKS', 48, 0.9, 0.6, 5, 'pass'],
  6011: ['c', 'headgear', 'CROWN', 'FROST KING CROWN', 195, 0.9, 0.7, 6, 'pass'],
  6020: ['c', 'trail', 'SNOW', 'SNOWFALL TRAIL', 210, 0.4, 0.85, 3, 'free'],
  6021: ['c', 'eyewear', 'GOGGLES', 'FROSTY GOGGLES', 190, 0.7, 0.7, 3, 'free'],
  6022: ['c', 'headgear', 'BEANIE', 'BOBBLE BEANIE', 140, 0.7, 0.4, 3, 'free'],
  6100: ['c', 'back', 'BANNER', 'STREAK BANNER', 48, 0.95, 0.55, 5, 'streak'],
  6101: ['c', 'trail', 'STARDUST', 'LOYAL STARDUST', 280, 0.85, 0.65, 5, 'streak'],
  6102: ['c', 'headgear', 'HALO', 'DEVOTED HALO', 50, 1, 0.7, 5, 'streak'],
  6103: ['c', 'killfx', 'STARS', 'STREAK STARS', 45, 0.95, 0.6, 5, 'streak'],
  6200: ['c', 'headgear', 'TOP HAT', 'MIDNIGHT TOPPER', 260, 0.5, 0.3, 4, 'shop'],
  6201: ['c', 'headgear', 'PROPELLER CAP', 'SUNNY PROPELLER', 45, 0.9, 0.55, 3, 'shop'],
  6202: ['c', 'headgear', 'CROWN', 'NEBULA CROWN', 300, 0.8, 0.55, 5, 'shop'],
  6203: ['c', 'eyewear', 'PIXEL SHADES', 'DEAL WITH IT SHADES', 0, 0, 0.12, 3, 'shop'],
  6204: ['c', 'eyewear', 'VISOR SHADES', 'PLASMA VISOR', 330, 0.9, 0.55, 4, 'shop'],
  6205: ['c', 'eyewear', 'LASER EYES', 'SUPERNOVA EYES', 15, 1, 0.55, 5, 'shop'],
  6206: ['c', 'back', 'SOLAR PANELS', 'SOLAR ARRAY', 210, 0.7, 0.5, 4, 'shop'],
  6207: ['c', 'back', 'MECH WINGS', 'STARFIGHTER WINGS', 200, 0.6, 0.55, 5, 'shop'],
  6208: ['c', 'back', 'WINGS', 'SERAPH WINGS', 50, 0.9, 0.75, 6, 'shop'],
  6209: ['c', 'trail', 'BUBBLES', 'SODA BUBBLES', 180, 0.8, 0.6, 3, 'shop'],
  6210: ['c', 'trail', 'BOLTS', 'THUNDER TRAIL', 55, 1, 0.6, 4, 'shop'],
  6211: ['c', 'trail', 'RAINBOW', 'PRISM TRAIL', 300, 0.9, 0.6, 5, 'shop'],
  6212: ['c', 'killfx', 'GLITCH', 'SYSTEM CRASH', 150, 0.9, 0.5, 4, 'shop'],
  6213: ['c', 'killfx', 'BLACK HOLE', 'EVENT HORIZON', 270, 0.9, 0.4, 5, 'shop'],
  6214: ['c', 'killfx', 'SHOCKWAVE', 'SONIC BOOM', 190, 1, 0.6, 6, 'shop'],
  6215: ['k', 'weapon', 'CIRCUIT', 'CIRCUIT BREAKER', 150, 0.9, 0.45, 4, 'shop'],
  6216: ['k', 'weapon', 'GALAXY', 'GALAXY BRAIN', 270, 0.8, 0.5, 5, 'shop'],
  6217: ['k', 'armor', 'CARBON', 'STEALTH CARBON', 220, 0.2, 0.25, 4, 'shop'],
  6218: ['k', 'armor', 'HOLO', 'HOLOGRAM SUIT', 190, 0.9, 0.6, 5, 'shop'],
  6219: ['k', 'ship', 'FLAME', 'HOT ROD FLAMES', 20, 1, 0.5, 4, 'shop'],
  6220: ['k', 'ship', 'GILDED', 'GOLD RUSH', 45, 0.9, 0.5, 5, 'shop'],
  6221: ['b', 'backdrop', 'SYNTHWAVE', 'NEON NIGHT', 310, 0.9, 0.5, 4, 'shop'],
  6222: ['b', 'backdrop', 'BLACK HOLE', 'GARGANTUA', 30, 0.8, 0.5, 5, 'shop'],
  6223: ['b', 'backdrop', 'STARGATE', 'THE GATE', 190, 0.9, 0.5, 6, 'shop'],
};
const isPremiumId = id => typeof id === 'string' && /^[ckb]\|[a-z_]+\|6\d{3}$/.test(id);
const premId = n => { const p = PREM[n]; return p ? `${p[0]}|${p[1]}|${n}` : null; };
const PREM_FROM = { pass: 'FROSTFALL SEASON PASS', free: 'FROSTFALL SEASON PASS (FREE)', streak: 'DAILY STREAK: EVERY 4TH WEEK', shop: 'THE STORE' };
// called from buildDef for ids in the premium range
function premDef(d, n) {
  const P = PREM[n]; if (!P) return;
  d.r = P[7]; d.ph = P[4]; d.ps = P[5]; d.pl = P[6]; d.pname = 'FROSTFALL'; d.name = P[3]; d.prem = P[8]; d.gh = P[4] + 180;
  d.metal = d.r >= 6 ? 'pearl' : d.r >= 4 ? 'gold' : 'chrome';
  if (d.cat === 'k') d.pat = P[2]; else d.style = P[2];
}

// ---------- the season pass (the server has the same table) ----------
const PASS = {
  id: 'frostfall', name: 'FROSTFALL', sub: 'A SPACE CRATES CHRISTMAS', starts: Date.parse('2026-10-26T00:00:00Z'), ends: Date.parse('2027-01-01T05:00:00Z'), tiers: 30, xp: 1000, sd: 500, usd: '$4.99',
  free: [{ c: 600 }, { cr: 0 }, { c: 900 }, { sd: 10 }, { cr: 1 }, { c: 1200 }, { cr: 0 }, { sd: 10 }, { c: 1500 }, { it: 'c|trail|6020' },
    { c: 1800 }, { cr: 1 }, { sd: 15 }, { c: 2000 }, { cr: 2 }, { c: 2200 }, { sd: 15 }, { cr: 1 }, { c: 2600 }, { it: 'c|eyewear|6021' },
    { c: 3000 }, { cr: 2 }, { sd: 20 }, { c: 3500 }, { cr: 2 }, { c: 4000 }, { sd: 25 }, { cr: 3 }, { c: 5000 }, { it: 'c|headgear|6022' }],
  prem: [{ it: 'c|headgear|6000' }, { sd: 50 }, { c: 3000 }, { cr: 2 }, { it: 'k|armor|6001' }, { sd: 50 }, { c: 4000 }, { it: 'c|back|6002' }, { cr: 2 }, { it: 'c|trail|6003' },
    { sd: 75 }, { c: 6000 }, { it: 'c|eyewear|6004' }, { cr: 3 }, { it: 'k|weapon|6005' }, { sd: 75 }, { c: 8000 }, { it: 'c|headgear|6006' }, { cr: 3 }, { it: 'k|ship|6007' },
    { sd: 100 }, { c: 10000 }, { it: 'c|back|6008' }, { cr: 3 }, { it: 'b|backdrop|6009' }, { sd: 100 }, { c: 15000 }, { it: 'c|killfx|6010' }, { cr: 4 }, { it: 'c|headgear|6011' }],
};
// what money can buy (the Edge Function and the database have the same prices)
const PRODUCTS = [
  { id: 'sd_180', sd: 180, usd: '$1.99' }, { id: 'sd_500', sd: 500, usd: '$4.99' }, { id: 'sd_1100', sd: 1100, usd: '$9.99', tag: '+10% BONUS' }, { id: 'sd_2400', sd: 2400, usd: '$19.99', tag: '+20% BONUS' },
];
const passLive = () => Date.now() < PASS.ends;
function passState() { if (!S.pass || S.pass.id !== PASS.id) S.pass = { id: PASS.id, xp: 0 }; return S.pass; }
function passTier() { return Math.min(PASS.tiers, Math.floor(passState().xp / PASS.xp)); }
// pass XP from playing. Every 1,000 XP is a tier.
function passXP(n, why) {
  if (!S || !passLive() || !(n > 0)) return;
  if (typeof RUN !== 'undefined' && RUN && RUN.boost && RUN.boost.xp) n *= 2;
  const p = passState(), t0 = passTier(); p.xp = Math.min(PASS.tiers * PASS.xp + 5000, p.xp + Math.round(n)); dirty();
  const t1 = passTier(); if (t1 > t0) { toast(`${PASS.name} PASS: TIER ${t1} REACHED! CLAIM IT IN THE STORE`, '#9fe7ff'); SND.play('unlock'); STORE.badge = true; }
}

// ---------- state from the server ----------
const STORE = { p: null, t: -1e9, busy: false, badge: false, paidPoll: 0 };
function storeRefresh(force) {
  if (NET.st !== 'on' || STORE.busy || (!force && T_NOW - STORE.t < 60)) return;
  STORE.busy = true; STORE.t = T_NOW;
  rpc('premium_get').then(r => { STORE.p = r; }).catch(e => { if (e.code === 'PGRST202') STORE.missing = true; }).finally(() => { STORE.busy = false; });
}
const hasSupporter = () => !!(STORE.p && STORE.p.supporter);
const stardust = () => STORE.p ? STORE.p.sd : 0;
const ownsPass = () => !!(STORE.p && (STORE.p.passes || []).includes(PASS.id));
function claimedSet(track) { const c = STORE.p && STORE.p.claims && STORE.p.claims[PASS.id]; return new Set((c && c[track]) || []); }
function storeSpend(kind, id, msg) { netDo(() => rpc('premium_spend', { p_kind: kind, p_id: id || '' }).then(r => { STORE.p = r; NET.mail = Math.max(NET.mail, 1); return r; }), msg); }
function passClaim(tier, track) {
  const rw = (track === 'p' ? PASS.prem : PASS.free)[tier - 1];
  netDo(() => rpc('pass_claim', { p_tier: tier, p_track: track, p_xp: passState().xp }).then(r => { STORE.p = r; NET.mail = Math.max(NET.mail, 1); SND.play('fanfare'); return r; }), `TIER ${tier}: ${rewardText(rw)}${rw.sd ? '' : '. IT IS IN YOUR MAILBOX'}`);
}
// open Stripe Checkout for a product
async function checkout(product) {
  if (NET.st !== 'on') { toast('SIGN IN FIRST. PURCHASES ARE SAVED ON YOUR ACCOUNT', COL.coral); openStation('social'); return; }
  track('store_click', { product });
  NET.act = true;
  try {
    const at = await netToken();
    const r = await fetch(NET.url + '/functions/v1/checkout', { method: 'POST', headers: { apikey: NET_KEY, Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: JSON.stringify({ product }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(r.status === 404 ? 'PAYMENTS ARE NOT SET UP YET' : String(j.message || 'CHECKOUT FAILED').toUpperCase());
    STORE.lastUrl = j.url;
    const w = window.open(j.url, '_blank'); if (!w) location.href = j.url;
    STORE.paidPoll = 90; toast('FINISH PAYING IN THE NEW TAB. YOUR STARDUST SHOWS UP HERE RIGHT AFTER', COL.gold);
  } catch (e) { toast(e.message || 'CHECKOUT FAILED', COL.coral); }
  finally { NET.act = false; }
}
// back from Stripe: ?paid=1
(() => { try { const q = new URLSearchParams(location.search); if (q.get('paid') === '1') { STORE.paidPoll = 90; STORE.thanks = true; } if (q.get('paid')) history.replaceState(null, '', location.pathname); } catch (e) { } })();
function storeTick(dt) {
  if (STORE.paidPoll > 0) {
    STORE.paidPoll -= dt; const before = STORE.p ? JSON.stringify([STORE.p.sd, STORE.p.supporter, STORE.p.passes]) : '';
    if (NET.st === 'on' && !STORE.busy && T_NOW - STORE.t > 4) { STORE.busy = true; STORE.t = T_NOW; rpc('premium_get').then(r => { const now = JSON.stringify([r.sd, r.supporter, r.passes]); if (before && now !== before) { STORE.paidPoll = 0; toast('THANK YOU! YOUR PURCHASE ARRIVED', COL.gold); SND.play('fanfare'); } STORE.p = r; }).catch(() => { }).finally(() => { STORE.busy = false; }); }
  }
  if (STORE.thanks && SCENE === 'hub' && NET.st === 'on') { STORE.thanks = false; toast('THANKS FOR SUPPORTING SPACE CRATES!', COL.gold); }
  if (SCENE === 'hub') storeRefresh(false);
}

// ---------- drawing helpers ----------
function drawStardustIcon(x, y) { x = Math.floor(x); y = Math.floor(y); rect(x + 3, y, 1, 7, '#c9a6ff'); rect(x, y + 3, 7, 1, '#c9a6ff'); rect(x + 2, y + 2, 3, 3, '#f0e0ff'); px(x + 3, y + 3, '#ffffff'); px(x + 1, y + 1, '#9f7fef'); px(x + 5, y + 5, '#9f7fef'); }
function drawSupporterBadge(x, y) { x = Math.floor(x); y = Math.floor(y); rect(x, y + 1, 7, 5, '#7a4a00'); rect(x + 1, y, 5, 7, '#7a4a00'); rect(x + 1, y + 1, 5, 5, COL.gold); px(x + 3, y + 2, '#fff6c2'); px(x + 2, y + 3, '#fff6c2'); px(x + 4, y + 3, '#fff6c2'); px(x + 3, y + 4, '#fff6c2'); }
function drawSupporterPlate(x, y) {
  const s = 'SUPPORTER', w = textW(s, FS) + 14, sh = Math.floor(T_NOW * 40) % (w + 30) - 15;
  panel(x, y, w, 10, { bg: '#3a2a10', bd: COL.gold, flat: true }); drawSupporterBadge(x + 2, y + 1); text(s, x + 11, y + 2, COL.gold, FS);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, 8); ctx.clip(); ctx.globalAlpha = 0.35; for (let i = 0; i < 3; i++) rect(x + sh + i, y + 1, 1, 8, '#fff'); ctx.restore(); ctx.globalAlpha = 1;
}
function rewardText(rw) {
  if (!rw) return '';
  const k = STORE.p ? STORE.p.k || 1 : clamp(Math.max(1, S.planet.reached || 1) / 2.5, 1, 8);
  if (rw.c) return `${fmt(Math.round(rw.c * k / 50) * 50)} COINS`;
  if (rw.sd) return `${rw.sd} STARDUST`;
  if (rw.cr !== undefined) { const t = Math.min(6, Math.min(5, 1 + Math.floor((S.planet.reached || 1) / 4)) + rw.cr); return `${TIERS[t] ? TIERS[t].n : 'BIG'} CRATE`; }
  if (rw.it) return getDef(rw.it).name;
  return '';
}
function drawReward(rw, x, y, w, h, dim) {
  if (dim) ctx.globalAlpha = 0.45;
  if (rw.it) drawItemIn(rw.it, x + 2, y + 2, w - 4, h - 12, { maxSc: 2, noFx: true });
  else if (rw.sd) { drawStardustIcon(x + w / 2 - 4, y + 6); text(rw.sd + '', x + w / 2, y + h - 18, '#c9a6ff', FS, 1); }
  else if (rw.c) { drawCoinIcon(x + w / 2 - 4, y + 6); const k = STORE.p ? STORE.p.k || 1 : 1; text(fmtShort(Math.round(rw.c * k / 50) * 50), x + w / 2, y + h - 18, COL.gold, FS, 1); }
  else if (rw.cr !== undefined) { const t = Math.min(6, Math.min(5, 1 + Math.floor((S.planet.reached || 1) / 4)) + rw.cr); miniCrate(x + w / 2 - 6, y + 5, t); }
  ctx.globalAlpha = 1;
}
function fmtShort(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : fmt(n); }
function timeLeft(ms) { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return d ? `${d}D ${h}H` : `${h}H ${m}M`; }
// the store button in the station's top bar
function drawStoreButton(x, y) {
  const sd = STORE.p ? fmt(STORE.p.sd) : '', w = 30 + (sd ? textW(sd, FS) + 10 : 0);
  const claim = storeClaimable() > 0, pulse = (claim || STORE.badge) && Math.floor(T_NOW * 3) % 2;
  if (button(x - w, y, w, 16, '', { tip: 'THE STORE: SEASON PASS, SHOP AND STARDUST', kind: 'def' })) { STORE.badge = false; openStation('store'); }
  text('SHOP', x - w + 5, y + 5, '#c9a6ff', FS); if (sd) { drawStardustIcon(x - w + 28, y + 4); text(sd, x - w + 37, y + 5, '#f0e0ff', FS); }
  if (pulse) { rect(x - 5, y - 2, 6, 6, COL.coral); text('!', x - 2, y - 1, '#fff', FS, 1); }
  return w;
}
function storeClaimable() {
  if (!STORE.p || !passLive()) return 0; const t = passTier(), f = claimedSet('f'), p = claimedSet('p'); let n = 0;
  for (let i = 1; i <= t; i++) { if (!f.has(i)) n++; if (ownsPass() && !p.has(i)) n++; }
  return n;
}

// ---------- the store panel ----------
function panelStore(st) {
  if (panelFrame('STORE', '#c9a6ff')) return;
  storeRefresh(false);
  // stardust balance, top right next to CLOSE
  const sd = fmt(stardust()); drawStardustIcon(W - 84 - textW(sd, FB), 11); text(sd, W - 74, 11, '#f0e0ff', FB, 2);
  st.tab = tabs(70, 9, ['SEASON PASS', 'SHOP', 'STARDUST', 'SUPPORTER'], st.tab || 0, 66);
  if (NET.st !== 'on') {
    textO('SIGN IN TO USE THE STORE', W / 2, 90, '#c9a6ff', '#000', FB, 1, 2);
    text('PURCHASES AND STARDUST ARE SAVED ON YOUR ACCOUNT SO THEY ARE NEVER LOST', W / 2, 112, COL.dim, FS, 1);
    if (button(W / 2 - 60, 128, 120, 20, 'SIGN IN', { kind: 'primary' })) openStation('social');
    if (st.tab === 0) passTrack(st, 160, true);
    return;
  }
  if (!STORE.p) { text(STORE.missing ? 'THE STORE IS NOT SET UP ON THE SERVER YET' : 'LOADING...', W / 2, 120, COL.dim, FS, 1); return; }
  if (st.tab === 0) storePass(st);
  else if (st.tab === 1) storeShop(st);
  else if (st.tab === 2) storeDust(st);
  else storeSupporter(st);
  text('PAYMENTS BY STRIPE. BY BUYING YOU AGREE TO THE', 14, H - 17, COL.mute, FS);
  const lx = 14 + textW('PAYMENTS BY STRIPE. BY BUYING YOU AGREE TO THE ', FS); if (button(lx, H - 20, 40, 11, 'TERMS', { font: FS })) openLegal('terms');
  text('UNDER 18? ASK A PARENT FIRST', lx + 46, H - 17, COL.mute, FS);
}
function storePass(st) {
  const now = Date.now(), live = now < PASS.ends, p = passState(), tier = passTier(), into = p.xp - tier * PASS.xp;
  // header
  textO(PASS.name, 14, 31, '#bff6ff', '#0a1a30', FB, 0, 2); text(PASS.sub, 14 + textW(PASS.name, FB, 2) + 8, 37, COL.cream, FS);
  text(live ? `ENDS IN ${timeLeft(PASS.ends - now)}` : 'THIS SEASON IS OVER', W - 14, 31, live ? COL.coral : COL.mute, FS, 2);
  text(`TIER ${tier} / ${PASS.tiers}`, W - 14, 40, COL.gold, FS, 2);
  bar(14, 50, W - 28, 4, tier >= PASS.tiers ? 1 : into / PASS.xp, '#9fe7ff', COL.void0, '#ffffff'); text(tier >= PASS.tiers ? 'MAXED OUT!' : `${fmt(into)} / ${fmt(PASS.xp)} XP TO THE NEXT TIER. PLAY ANYTHING TO EARN IT`, 14, 57, COL.mute, FS);
  passTrack(st, 68, false);
  // buy the pass
  if (!ownsPass()) {
    const by = 210; panel(14, by, W - 28, 32, { bg: '#0a1a30', bd: '#9fe7ff' });
    text('UNLOCK THE PREMIUM TRACK: 12 CHRISTMAS COSMETICS, 450 STARDUST BACK, COINS AND CRATES', 20, by + 5, COL.ink, FS);
    text('TIERS YOU ALREADY REACHED UNLOCK RIGHT AWAY', 20, by + 14, COL.mute, FS);
    if (button(W - 196, by + 9, 86, 16, `BUY ${PASS.usd}`, { kind: 'primary', font: FS, disabled: NET.act || !live })) checkout('pass_' + PASS.id);
    if (button(W - 104, by + 9, 84, 16, '', { kind: 'blue', font: FS, disabled: NET.act || !live || stardust() < PASS.sd })) storeSpend('pass', PASS.id, 'PASS UNLOCKED! CLAIM YOUR TIERS');
    drawStardustIcon(W - 96, by + 13); text(`${PASS.sd}`, W - 86, by + 14, '#f0e0ff', FS);
  } else {
    const n = storeClaimable(); text(n ? `${n} REWARD${n > 1 ? 'S' : ''} READY. CLICK THE GLOWING TIERS` : 'YOU HAVE THE PASS. EVERYTHING YOU EARN IS YOURS', W / 2, 220, n ? COL.gold : '#7dffb0', FS, 1);
    if (n && button(W / 2 - 50, 230, 100, 14, 'CLAIM ALL', { kind: 'primary', font: FS, disabled: NET.act })) claimAll();
  }
}
function claimAll() {
  const t = passTier(), f = claimedSet('f'), pp = claimedSet('p'), todo = [];
  for (let i = 1; i <= t; i++) { if (!f.has(i)) todo.push([i, 'f']); if (ownsPass() && !pp.has(i)) todo.push([i, 'p']); }
  if (!todo.length) return;
  netDo(async () => { let r = null; for (const [i, tr] of todo) r = await rpc('pass_claim', { p_tier: i, p_track: tr, p_xp: passState().xp }); STORE.p = r; NET.mail = Math.max(NET.mail, 1); SND.play('fanfare'); return r; }, `CLAIMED ${todo.length} REWARDS. ITEMS, COINS AND CRATES ARE IN YOUR MAILBOX`);
}
// the two rows of tiers, scrolling sideways
function passTrack(st, y, preview) {
  const cw = 42, gap = 3, x0 = 52, vw = W - 14 - x0, tier = passTier(), f = claimedSet('f'), pp = claimedSet('p'), owns = ownsPass();
  const maxS = Math.max(0, PASS.tiers * (cw + gap) - vw);
  if (st.pScroll === undefined) st.pScroll = clamp((Math.max(1, tier) - 2) * (cw + gap), 0, maxS);
  if (inBox(x0, y, vw, 76)) st.pScroll = clamp(st.pScroll + IN.wheel * 40, 0, maxS);
  if (IN.down && inBox(x0, y, vw, 76)) { st.pScroll = clamp(st.pScroll - (IN.mx - (st.plmx ?? IN.mx)), 0, maxS); } st.plmx = IN.down ? IN.mx : undefined;
  text('FREE', 14, y + 14, COL.ink, FS); text('PASS', 14, y + 52, '#9fe7ff', FS); if (!owns) { rect(16, y + 61, 7, 5, COL.mute); ring(19, y + 60, 2, COL.mute); }
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y - 2, vw, 80); ctx.clip();
  for (let i = 0; i < PASS.tiers; i++) {
    const n = i + 1, x = x0 + i * (cw + gap) - st.pScroll; if (x < x0 - cw || x > W) continue;
    const reached = n <= tier;
    text(n + '', x + cw / 2, y - 1 + 0, reached ? COL.gold : COL.mute, FS, 1);
    for (const [row, track, list, set] of [[0, 'f', PASS.free, f], [1, 'p', PASS.prem, pp]]) {
      const ry = y + 7 + row * 36, rw = list[i], got = set.has(n), ready = !preview && reached && !got && (track === 'f' || owns), locked = track === 'p' && !owns;
      if (ready) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(T_NOW * 6); rect(x - 1, ry - 1, cw + 2, 34, COL.gold); ctx.globalAlpha = 1; }
      const big = !!rw.it;
      panel(x, ry, cw, 32, { bg: got ? '#132018' : track === 'p' ? (big ? '#162a44' : '#0f1b2e') : COL.void1, bd: ready ? COL.gold : got ? '#7dffb0' : big ? (getDef(rw.it).r === 6 ? rainbow(T_NOW) : RAR[getDef(rw.it).r].c) : COL.steel, flat: true });
      drawReward(rw, x, ry, cw, 32, !reached || locked);
      if (got) { line(x + cw - 9, ry + 25, x + cw - 6, ry + 28, '#7dffb0'); line(x + cw - 6, ry + 28, x + cw - 2, ry + 22, '#7dffb0'); }
      else if (locked) { rect(x + cw - 9, ry + 24, 6, 5, COL.mute); ring(x + cw - 6, ry + 23, 2, COL.mute); }
      const hov = inBox(x, ry, cw, 32) && inBox(x0, y, vw, 80);
      if (hov) { TIP.set(rw.it ? { item: rw.it } : `TIER ${n}: ${rewardText(rw)}${locked ? '. NEEDS THE PASS' : !reached ? `. REACH TIER ${n} FIRST` : got ? '. CLAIMED' : '. CLICK TO CLAIM'}`); if (ready) IN.cursor = 'pointer'; if (ready && IN.rl && Math.abs(IN.dragX) < 5 && !NET.act) passClaim(n, track); }
    }
  }
  ctx.restore();
  if (maxS > 0) { rect(x0, y + 78, vw, 1, COL.void3); rect(x0 + (vw - 40) * (st.pScroll / maxS), y + 78, 40, 1, COL.steel); }
}
function storeShop(st) {
  const P = STORE.p, list = P.shop || [], now = Date.now(), ends = P.shop_ends ? Date.parse(P.shop_ends) : now;
  text('FEATURED TODAY', 14, 31, COL.gold, FB); text(`NEW ITEMS IN ${timeLeft(ends - now)}`, W - 14, 32, COL.dim, FS, 2);
  const cw = 148, ch = 74, gx = 6;
  list.forEach(([id, price], i) => {
    const x = 14 + (i % 3) * (cw + gx), y = 44 + Math.floor(i / 3) * (ch + 6), d = getDef(id), own = (P.owned || []).includes(id), rc = d.r === 6 ? rainbow(T_NOW) : RAR[d.r].c;
    panel(x, y, cw, ch, { bg: COL.void0, bd: rc });
    drawItemIn(id, x + 4, y + 4, 56, ch - 8, { maxSc: d.cat === 'b' ? 2 : 3 }); if (inBox(x + 4, y + 4, 56, ch - 8)) TIP.set({ item: id });
    const nm = wrap(d.name, cw - 68, FS).slice(0, 2); nm.forEach((l, k) => text(l, x + 64, y + 6 + k * 8, rc, FS));
    text(`${RAR[d.r].n} ${(SUB_LABEL_FULL[d.sub] || '').replace('BACKDROP', 'BACKDROP')}`, x + 64, y + 24, COL.mute, FS);
    if (own) text('OWNED', x + 64, y + ch - 18, '#7dffb0', FB);
    else if (button(x + 64, y + ch - 22, cw - 70, 16, '', { kind: stardust() >= price ? 'primary' : 'def', font: FS, disabled: NET.act })) {
      if (stardust() < price) { toast('NOT ENOUGH STARDUST. GET MORE ON THE STARDUST TAB', COL.coral); st.tab = 2; }
      else storeSpend('item', id, `${d.name} IS YOURS! IT IS IN YOUR MAILBOX`);
    }
    if (!own) { drawStardustIcon(x + 70, y + ch - 18); text(fmt(price), x + 80, y + ch - 17, '#f0e0ff', FS); }
  });
  // coin packs
  const y0 = 208; text('COIN PACKS', 14, y0, COL.gold, FS);
  (P.packs || []).forEach(([id, cost, base], i) => {
    const x = 14 + i * (cw + gx), y = y0 + 9, coins = Math.round(base * (P.k || 1) / 50) * 50;
    panel(x, y, cw, 22, { bg: COL.void0, bd: COL.steel, flat: true }); drawCoinIcon(x + 6, y + 8); text(fmt(coins), x + 16, y + 8, COL.gold, FB);
    if (button(x + cw - 56, y + 3, 52, 16, '', { kind: 'blue', font: FS, disabled: NET.act || stardust() < cost })) storeSpend('coins', id, `+${fmt(coins)} COINS. THEY ARE IN YOUR MAILBOX`);
    drawStardustIcon(x + cw - 50, y + 7); text(cost + '', x + cw - 40, y + 8, '#f0e0ff', FS);
  });
}
function storeDust(st) {
  textO('STARDUST', 14, 31, '#c9a6ff', '#000', FB, 0, 2); text('SPEND IT ON THE SEASON PASS, SHOP COSMETICS AND COIN PACKS', 14, 49, COL.dim, FS);
  const cw = 108, gx = 6;
  PRODUCTS.forEach((p, i) => {
    const x = 14 + i * (cw + gx), y = 64, h = 104;
    if (p.tag) { ctx.globalAlpha = 0.2 + 0.15 * Math.sin(T_NOW * 4); rect(x - 2, y - 2, cw + 4, h + 4, '#c9a6ff'); ctx.globalAlpha = 1; }
    panel(x, y, cw, h, { bg: '#140c26', bd: p.tag ? '#c9a6ff' : COL.steel });
    const n = Math.min(5, 1 + i * 1.4); for (let k = 0; k < n; k++) { const a = k * 2.4 + T_NOW * 0.6, r = k ? 8 + k * 3 : 0; drawStardustIcon(x + cw / 2 - 4 + Math.cos(a) * r, y + 22 + Math.sin(a) * r * 0.6); }
    textO(fmt(p.sd), x + cw / 2, y + 48, '#f0e0ff', '#000', FB, 1, 2); text('STARDUST', x + cw / 2, y + 66, '#c9a6ff', FS, 1);
    if (p.tag) text(p.tag, x + cw / 2, y + 4, COL.gold, FS, 1);
    if (button(x + 8, y + h - 24, cw - 16, 18, p.usd, { kind: 'primary', disabled: NET.act })) checkout(p.id);
  });
  text('THE DAILY REWARD ALSO GIVES STARDUST ON DAYS 3, 5 AND 7', 14, 182, COL.mute, FS);
  text('STARDUST IS SAVED ON YOUR ACCOUNT. IT HAS NO VALUE OUTSIDE THE GAME AND CANNOT BE TRADED OR CASHED OUT', 14, 191, COL.mute, FS);
}
function storeSupporter(st) {
  textO('SUPPORTER NAMEPLATE', 14, 31, COL.gold, '#000', FB, 0, 2);
  text('A ONE-TIME THANK YOU. IT KEEPS THE SERVERS RUNNING AND NEW PLANETS COMING', 14, 49, COL.dim, FS);
  const x = 14, y = 62; panel(x, y, 220, 120, { bg: '#1c140a', bd: COL.gold });
  ctx.drawImage(astroSprite(S.eq, 0, 0), x + 14, y + 22, 40, 52);
  textO(S.name || 'YOU', x + 64, y + 26, COL.ink, '#000', FB, 0, 2); drawSupporterPlate(x + 64, y + 46);
  text('HOW IT LOOKS IN THE ARENA:', x + 10, y + 86, COL.mute, FS);
  const nm = S.name || 'YOU', tw = textW(nm, FS) + 4; panel(x + 10, y + 96, tw + 2, 9, { bg: '#3a2a10', bd: COL.gold, flat: true }); text(nm, x + 11 + tw / 2, y + 98, COL.gold, FS, 1);
  const rx = 248;
  ['A GOLD SUPPORTER PLATE ON YOUR PROFILE', 'A GOLD FRAME ON YOUR NAME IN ARENAS', 'A STAR NEXT TO YOUR NAME ON LEADERBOARDS', 'IT IS JUST FOR LOOKS. NO EXTRA POWER'].forEach((l, i) => { drawSupporterBadge(rx, y + 4 + i * 14); text(l, rx + 10, y + 5 + i * 14, i === 3 ? COL.mute : COL.ink, FS); });
  if (hasSupporter()) textO('YOU ARE A SUPPORTER. THANK YOU!', rx, y + 74, COL.gold, '#000', FB);
  else {
    if (button(rx, y + 70, 100, 20, 'BUY $4.99', { kind: 'primary', disabled: NET.act })) checkout('supporter');
    if (button(rx + 106, y + 70, 100, 20, '', { kind: 'blue', disabled: NET.act || stardust() < 500 })) storeSpend('supporter', '', 'YOU ARE A SUPPORTER. THANK YOU!');
    drawStardustIcon(rx + 128, y + 76); text('500', rx + 138, y + 77, '#f0e0ff', FB);
  }
}
