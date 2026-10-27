// ===== STORE: Stardust, the FROSTFALL season pass, the shop, coin packs and the supporter plate =====
// Real money buys Stardust, the pass or the plate through Stripe (a Supabase Edge Function makes the
// checkout, a webhook pays it out). Everything else is spent from Stardust the server keeps.
// Store and reward cosmetics (ids ending |6000 to |6999) can't be traded, listed, sold or fused.

// ---------- the premium items: [cat, sub, style or pattern, name, hue, sat, light, rarity, where, extra] ----------
// weapons carry extra: { sig, el, verbs, lore, h2, gh, q, noCycle }
const PREM = {
  // FROSTFALL pass, premium track
  6000: ['c', 'headgear', 'WIZARD HAT', "SANTA'S HAT", 0, 0.85, 0.5, 4, 'pass'],
  6001: ['k', 'armor', 'STRIPE', 'CANDY CANE ARMOR', 355, 0.85, 0.55, 4, 'pass'],
  6002: ['c', 'back', 'CAPE', 'NORTH POLE CAPE', 350, 0.8, 0.45, 4, 'pass'],
  6003: ['c', 'trail', 'SNOW', 'BLIZZARD TRAIL', 195, 0.7, 0.75, 4, 'pass'],
  6004: ['c', 'eyewear', 'STAR SHADES', 'TINSEL SHADES', 48, 0.95, 0.55, 4, 'pass'],
  6005: ['k', 'weapon', 'STRIPE', 'CANDY CANE WRAP', 0, 0.85, 0.55, 4, 'pass'],
  6006: ['c', 'headgear', 'HORNS', 'REINDEER ANTLERS', 28, 0.55, 0.4, 4, 'pass'],
  6007: ['k', 'ship', 'GILDED', 'SLEIGH PAINT', 355, 0.8, 0.45, 5, 'pass'],
  6008: ['c', 'back', 'FAIRY WINGS', 'SNOWFLAKE WINGS', 195, 0.8, 0.8, 5, 'pass'],
  6009: ['b', 'backdrop', 'AURORA', 'WINTER AURORA', 160, 0.7, 0.55, 5, 'pass'],
  6010: ['c', 'killfx', 'FIREWORKS', 'NEW YEAR FIREWORKS', 48, 0.9, 0.6, 5, 'pass'],
  6011: ['c', 'headgear', 'CROWN', 'FROST KING CROWN', 195, 0.9, 0.7, 6, 'pass'],
  6012: ['w', 'blaster', null, 'JINGLE BELL BLASTER', 50, 0.95, 0.55, 5, 'pass', { sig: 'reliable', el: ['cryo', 1], verbs: [['bounce', 2]], h2: 355, gh: 130, lore: 'EVERY 6TH SHOT RINGS THE BELL: A SURE CRITICAL HIT. SHOTS CHILL AND BOUNCE' }],
  6013: ['g', 'freeze', null, 'SNOW GLOBE', 195, 0.7, 0.75, 5, 'pass'],
  6014: ['w', 'rifle', null, 'CANDY CANE CARBINE', 355, 0.9, 0.55, 5, 'pass', { sig: 'shatter', el: ['cryo', 1.2], verbs: [['pierce', 2]], h2: 0, gh: 195, lore: 'FROZEN ALIENS SHATTER INTO SIX ICE SHARDS. ROUNDS PIERCE' }],
  6015: ['p', 'fox', null, 'RUDOLPH', 5, 0.85, 0.45, 5, 'pass'],
  6016: ['w', 'throwing', null, 'SNOWFLAKE SHURIKEN', 195, 0.8, 0.8, 5, 'pass', { sig: 'fan', el: ['cryo', 1.2], verbs: [['return', 1]], h2: 210, gh: 190, lore: 'THROWS A FAN OF FIVE SNOWFLAKES THAT COME BACK TO YOU' }],
  6017: ['w', 'launcher', null, 'THE SLEIGHBREAKER', 355, 0.9, 0.5, 6, 'pass', { sig: 'presents', el: ['cryo', 1.6], verbs: [['bounce', 2], ['detonate', 3]], h2: 48, gh: 130, q: 1.12, noCycle: true, lore: 'FIRES GIFT-WRAPPED PRESENTS THAT BOUNCE, BLOW UP AND BURST INTO EIGHT CANDY CANE SHARDS THAT FREEZE EVERYTHING' }],
  // FROSTFALL pass, free track
  6020: ['c', 'trail', 'SNOW', 'SNOWFALL TRAIL', 210, 0.4, 0.85, 3, 'free'],
  6021: ['c', 'eyewear', 'GOGGLES', 'FROSTY GOGGLES', 190, 0.7, 0.7, 3, 'free'],
  6022: ['c', 'headgear', 'BEANIE', 'BOBBLE BEANIE', 140, 0.7, 0.4, 3, 'free'],
  6023: ['k', 'weapon', 'CHECKER', 'GINGERBREAD WRAP', 28, 0.65, 0.42, 3, 'free'],
  6024: ['c', 'back', 'BACKPACK', 'PRESENT SACK', 355, 0.75, 0.45, 4, 'free'],
  // daily streak, every 4th week
  6100: ['c', 'back', 'BANNER', 'STREAK BANNER', 48, 0.95, 0.55, 5, 'streak'],
  6101: ['c', 'trail', 'STARDUST', 'LOYAL STARDUST', 280, 0.85, 0.65, 5, 'streak'],
  6102: ['c', 'headgear', 'HALO', 'DEVOTED HALO', 50, 1, 0.7, 5, 'streak'],
  6103: ['c', 'killfx', 'STARS', 'STREAK STARS', 45, 0.95, 0.6, 5, 'streak'],
  // the shop's daily cosmetics
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
  // the armory: top-shelf weapons for Stardust, always in stock
  6300: ['w', 'rifle', null, 'THUNDERCLAP', 55, 1, 0.55, 5, 'armory', { sig: 'zeus', el: ['arc', 1], verbs: [['chain', 2], ['pierce', 1]], h2: 220, gh: 55, lore: 'EVERY 5TH SHOT CALLS DOWN LIGHTNING THAT CHAINS THROUGH 8 ALIENS' }],
  6301: ['w', 'shotgun', null, "DRAGON'S BREATH", 15, 0.95, 0.5, 5, 'armory', { sig: 'dragon', el: ['plasma', 1], verbs: [['split', 1]], h2: 40, gh: 20, lore: 'PELLETS LEAVE BURNING GROUND WHEREVER THEY LAND' }],
  6302: ['w', 'sniper', null, 'THE LAST WORD', 270, 0.85, 0.45, 6, 'armory', { sig: 'lastword', el: ['void', 1.4], verbs: [['pierce', 2]], h2: 300, gh: 280, lore: 'A KILL SENDS THE ROUND ON TO THE NEXT ALIEN, HARDER EACH TIME' }],
  6303: ['w', 'railgun', null, 'STARFALL RAIL', 30, 0.95, 0.55, 6, 'armory', { sig: 'meteors', el: ['plasma', 1.4], verbs: [['detonate', 2]], h2: 50, gh: 25, lore: 'METEORS RAIN DOWN ALL ALONG THE BEAM' }],
  6304: ['w', 'drone', null, 'SWARM QUEEN', 140, 0.85, 0.5, 5, 'armory', { sig: 'hive', el: ['arc', 1], verbs: [['home', 2]], h2: 60, gh: 140, lore: 'SIX DRONES, PLUS ONE MORE FOR EVERY KILL' }],
  6305: ['w', 'beam', null, 'RAINBOW ROAD', 300, 0.9, 0.6, 6, 'armory', { sig: 'prism3', el: ['prism', 1.4], verbs: [['pierce', 2]], lore: 'SPLITS INTO THREE RAINBOW BEAMS' }],
  6306: ['w', 'blade', null, 'SUNSPLITTER', 40, 1, 0.55, 5, 'armory', { sig: 'firetrail', el: ['plasma', 1], verbs: [['split', 2]], h2: 10, gh: 45, lore: 'EVERY SWING LEAVES A WALL OF FIRE' }],
  6307: ['w', 'launcher', null, 'EVENT HORIZON', 260, 0.9, 0.35, 6, 'armory', { sig: 'blackhole', el: ['void', 1.4], verbs: [['pull', 2]], h2: 280, gh: 270, lore: 'EACH SHOT OPENS A BLACK HOLE THAT SWALLOWS ALIENS' }],
};
const isPremiumId = id => typeof id === 'string' && /^[ckbwgp]\|[a-z_]+\|6\d{3}$/.test(id);
const premId = n => { const p = PREM[n]; return p ? `${p[0]}|${p[1]}|${n}` : null; };
const PREM_FROM = { pass: 'FROSTFALL SEASON PASS', free: 'FROSTFALL SEASON PASS (FREE)', streak: 'DAILY STREAK: EVERY 4TH WEEK', shop: 'THE STORE', armory: 'THE ARMORY (STORE)' };
// the armory's weapons and prices (the server has the same list)
const ARMORY = [['w|rifle|6300', 1400], ['w|shotgun|6301', 1400], ['w|drone|6304', 1600], ['w|blade|6306', 1400], ['w|sniper|6302', 2400], ['w|railgun|6303', 2400], ['w|beam|6305', 2400], ['w|launcher|6307', 2400]];
// called from buildDef for ids in the premium range
function premDef(d, n) {
  const P = PREM[n]; if (!P) return; const X = P[9] || {};
  d.r = P[7]; d.ph = P[4]; d.ps = P[5]; d.pl = P[6]; d.pname = 'FROSTFALL'; d.name = P[3]; d.prem = P[8]; d.gh = X.gh ?? P[4] + 180; if (X.h2 !== undefined) d.h2 = X.h2;
  d.metal = d.r >= 6 ? 'pearl' : d.r >= 4 ? 'gold' : 'chrome';
  if (d.cat === 'k') d.pat = P[2]; else if (P[2]) d.style = P[2];
  if (d.cat === 'w') { d.sig = X.sig || null; d.el = X.el || null; d.verbs = (X.verbs || []).map(v => v.slice()); d.lore = X.lore || ''; d.q = X.q || 1.06; d.quirk = X.quirk || null; }
  if (X.noCycle) d.noCycle = true;
}

// ---------- the season pass (the server has the same table) ----------
const PASS = {
  id: 'frostfall', name: 'FROSTFALL', sub: 'A SPACE CRATES CHRISTMAS', starts: Date.parse('2026-10-26T00:00:00Z'), ends: Date.parse('2027-01-01T05:00:00Z'), tiers: 30, xp: 1000, sd: 500, usd: '$4.99',
  bonusXp: 2000, bonusSd: 25, bonusMax: 40,
  free: [{ c: 600 }, { cr: 0 }, { sd: 10 }, { c: 900 }, { it: 'c|trail|6020' }, { cr: 1 }, { c: 1200 }, { sd: 15 }, { cr: 1 }, { it: 'c|eyewear|6021' },
    { c: 1600 }, { cr: 1 }, { sd: 15 }, { c: 2000 }, { it: 'c|headgear|6022' }, { cr: 2 }, { c: 2400 }, { sd: 20 }, { cr: 2 }, { it: 'k|weapon|6023' },
    { c: 3000 }, { cr: 2 }, { sd: 25 }, { c: 3500 }, { cr: 3 }, { c: 4000 }, { sd: 25 }, { cr: 3 }, { c: 5000 }, { it: 'c|back|6024' }],
  prem: [{ it: 'c|headgear|6000' }, { sd: 50 }, { cr: 2 }, { it: 'k|armor|6001' }, { it: 'w|blaster|6012' }, { sd: 50 }, { cr: 3 }, { it: 'c|back|6002' }, { c: 6000 }, { it: 'g|freeze|6013' },
    { sd: 75 }, { it: 'c|trail|6003' }, { cr: 3 }, { it: 'c|eyewear|6004' }, { it: 'w|rifle|6014' }, { sd: 75 }, { it: 'c|headgear|6006' }, { cr: 4 }, { it: 'k|weapon|6005' }, { it: 'p|fox|6015' },
    { sd: 100 }, { it: 'k|ship|6007' }, { cr: 4 }, { it: 'c|back|6008' }, { it: 'w|throwing|6016' }, { sd: 100 }, { it: 'b|backdrop|6009' }, { it: 'c|killfx|6010' }, { it: 'c|headgear|6011' }, { it: 'w|launcher|6017' }],
};
// what money can buy (the Edge Function and the database have the same prices)
const PRODUCTS = [
  { id: 'sd_180', sd: 180, usd: '$1.99' }, { id: 'sd_500', sd: 500, usd: '$4.99' }, { id: 'sd_1100', sd: 1100, usd: '$9.99', tag: 'POPULAR', bonus: '+10%' }, { id: 'sd_2400', sd: 2400, usd: '$19.99', tag: 'BEST VALUE', bonus: '+20%' },
];
const passLive = () => Date.now() < PASS.ends;
function passState() { if (!S.pass || S.pass.id !== PASS.id) S.pass = { id: PASS.id, xp: 0 }; return S.pass; }
function passTier() { return Math.min(PASS.tiers, Math.floor(passState().xp / PASS.xp)); }
// after tier 30, every 2,000 XP is a bonus star worth 25 Stardust
function passBonus() { return clamp(Math.floor((passState().xp - PASS.tiers * PASS.xp) / PASS.bonusXp), 0, PASS.bonusMax); }
// pass XP from playing. Every 1,000 XP is a tier.
function passXP(n, why) {
  if (!S || !passLive() || !(n > 0)) return;
  if (typeof RUN !== 'undefined' && RUN && RUN.boost && RUN.boost.xp) n *= 2;
  const p = passState(), t0 = passTier(), b0 = passBonus(); p.xp = Math.min(PASS.tiers * PASS.xp + PASS.bonusMax * PASS.bonusXp, p.xp + Math.round(n)); dirty();
  const t1 = passTier(); if (t1 > t0) { toast(`${PASS.name} PASS: TIER ${t1} REACHED! CLAIM IT IN THE STORE`, '#9fe7ff'); SND.play('unlock'); STORE.badge = true; }
  else if (passBonus() > b0) { toast(`${PASS.name}: BONUS STAR! +${PASS.bonusSd} STARDUST TO CLAIM`, '#c9a6ff'); SND.play('unlock'); STORE.badge = true; }
}

// ---------- weekly pass missions: three goals a week, each worth a lot of pass XP ----------
const MISSIONS = [
  ['kills', 400, 'DEFEAT 400 ALIENS', 2000], ['crates', 30, 'OPEN 30 CRATES', 1500], ['ore', 200, 'MINE 200 ORE', 1500],
  ['landings', 8, 'FINISH 8 LANDINGS', 2000], ['wrecks', 10, 'SEARCH 10 WRECKS', 1200], ['events', 3, 'COMPLETE 3 PLANET EVENTS', 1800],
  ['bosses', 2, 'BEAT 2 BOSSES', 2500], ['arenaKills', 25, 'GET 25 ARENA KILLS', 2000], ['weakhits', 50, 'LAND 50 WEAK-POINT HITS', 1200], ['carriers', 2, 'CATCH 2 CRATE CARRIERS', 1500],
];
function missionStat(k) { if (k === 'landings') return S.planet.landings || 0; if (k === 'bosses') return Object.values(S.planet.bosses || {}).reduce((a, b) => a + (+b || 0), 0); return +(S.stats[k] || 0); }
function passWeek() { return Math.max(0, Math.floor((Date.now() - PASS.starts) / (7 * 864e5))); }
function passMissions() {
  const p = passState(), w = passWeek();
  if (!p.wk || p.wk.w !== w) { const base = {}; for (const m of MISSIONS) base[m[0]] = missionStat(m[0]); p.wk = { w, base, done: [] }; dirty(); }
  const R = RNG(hashStr('frostfall-missions-' + w)), pool = MISSIONS.slice(), pick = [];
  while (pick.length < 3 && pool.length) pick.push(pool.splice(R.int(pool.length), 1)[0]);
  return pick.map(m => { const cur = Math.max(0, missionStat(m[0]) - (p.wk.base[m[0]] || 0)); return { k: m[0], need: m[1], t: m[2], xp: m[3], cur: Math.min(cur, m[1]), ok: cur >= m[1], done: p.wk.done.includes(m[0]) }; });
}
function missionClaim(m) {
  const p = passState(); if (!m.ok || m.done || !passLive()) return;
  p.wk.done.push(m.k); dirty(); passXP(m.xp); SND.play('fanfare'); toast(`MISSION DONE: +${fmt(m.xp)} PASS XP`, '#9fe7ff'); track('mission', { k: m.k });
}
function missionsReady() { return passLive() ? passMissions().filter(m => m.ok && !m.done).length : 0; }

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
  const rw = track === 'b' ? { sd: PASS.bonusSd } : (track === 'p' ? PASS.prem : PASS.free)[tier - 1];
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
// a Stardust crystal: a little purple gem with a sparkle
function drawStardustIcon(x, y, s = 1) {
  x = Math.floor(x); y = Math.floor(y); const R = (a, b, w, h, c) => rect(x + a * s, y + b * s, w * s, h * s, c);
  R(3, 0, 1, 1, '#f0e0ff'); R(2, 1, 3, 1, '#c9a6ff'); R(1, 2, 5, 1, '#b38cff'); R(0, 3, 7, 1, '#9f7fef'); R(1, 4, 5, 1, '#7d5ce0'); R(2, 5, 3, 1, '#5d3fc0'); R(3, 6, 1, 1, '#45309a');
  R(2, 2, 1, 1, '#ffffff'); R(3, 1, 1, 1, '#ffffff');
}
function drawSupporterBadge(x, y) { x = Math.floor(x); y = Math.floor(y); rect(x, y + 1, 7, 5, '#7a4a00'); rect(x + 1, y, 5, 7, '#7a4a00'); rect(x + 1, y + 1, 5, 5, COL.gold); px(x + 3, y + 2, '#fff6c2'); px(x + 2, y + 3, '#fff6c2'); px(x + 4, y + 3, '#fff6c2'); px(x + 3, y + 4, '#fff6c2'); }
function drawSupporterPlate(x, y) {
  const s = 'SUPPORTER', w = textW(s, FS) + 14, sh = Math.floor(T_NOW * 40) % (w + 30) - 15;
  panel(x, y, w, 10, { bg: '#3a2a10', bd: COL.gold, flat: true }); drawSupporterBadge(x + 2, y + 1); text(s, x + 11, y + 2, COL.gold, FS);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, 8); ctx.clip(); ctx.globalAlpha = 0.35; for (let i = 0; i < 3; i++) rect(x + sh + i, y + 1, 1, 8, '#fff'); ctx.restore(); ctx.globalAlpha = 1;
}
const rcolOf = r => r === 6 ? rainbow(T_NOW * 1.4) : RAR[r].c;
function crateTierFor(cr) { return Math.min(6, Math.min(5, 1 + Math.floor((S.planet.reached || 1) / 4)) + cr); }
function rewardText(rw) {
  if (!rw) return '';
  const k = STORE.p ? STORE.p.k || 1 : clamp(Math.max(1, S.planet.reached || 1) / 2.5, 1, 8);
  if (rw.c) return `${fmt(Math.round(rw.c * k / 50) * 50)} COINS`;
  if (rw.sd) return `${rw.sd} STARDUST`;
  if (rw.cr !== undefined) { const t = crateTierFor(rw.cr); return `${TIERS[t] ? TIERS[t].n : 'BIG'} CRATE`; }
  if (rw.it) return getDef(rw.it).name;
  return '';
}
function rewardKind(rw) { if (!rw.it) return rw.c ? 'COINS' : rw.sd ? 'STARDUST' : 'CRATE'; const d = getDef(rw.it); return d.cat === 'w' ? CLS[d.sub].n : (SUB_LABEL_FULL[d.sub] || d.sub.toUpperCase()); }
function drawReward(rw, x, y, w, h, dim) {
  if (dim) ctx.globalAlpha = 0.4;
  if (rw.it) drawItemIn(rw.it, x + 2, y + 3, w - 4, h - 8, { maxSc: 2, noFx: true });
  else if (rw.sd) { drawStardustIcon(x + w / 2 - 7, y + 5, 2); text(rw.sd + '', x + w / 2, y + h - 11, '#e6d6ff', FS, 1); }
  else if (rw.c) { drawCoinIcon(x + w / 2 - 8, y + 7); drawCoinIcon(x + w / 2 - 2, y + 5); drawCoinIcon(x + w / 2 + 2, y + 9); const k = STORE.p ? STORE.p.k || 1 : 1; text(fmtShort(Math.round(rw.c * k / 50) * 50), x + w / 2, y + h - 11, COL.gold, FS, 1); }
  else if (rw.cr !== undefined) { const t = crateTierFor(rw.cr); miniCrate(x + w / 2 - 6, y + 7, t); text(TIERS[t].n.split(' ')[0].slice(0, 7), x + w / 2, y + h - 11, tierColor(t), FS, 1); }
  ctx.globalAlpha = 1;
}
function fmtShort(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : fmt(n); }
function timeLeft(ms) { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return d ? `${d}D ${h}H` : `${h}H ${m}M`; }
// a vertical gradient box with a 1px border
function gbox(x, y, w, h, top, bot, bd) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (bd) { ctx.strokeStyle = bd; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}
// soft light rays turning behind a showcased item
function rays(cx, cy, r, col, a0 = 0.18) {
  ctx.save(); ctx.globalAlpha = a0; ctx.fillStyle = col;
  for (let i = 0; i < 10; i++) { const a = T_NOW * 0.4 + i * TAU / 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.12) * r, cy + Math.sin(a - 0.12) * r); ctx.lineTo(cx + Math.cos(a + 0.12) * r, cy + Math.sin(a + 0.12) * r); ctx.fill(); }
  ctx.restore();
}
// a price pill: stardust and a number, or a dollar price
function pricePill(x, y, w, label, ok, sd) {
  const hov = inBox(x, y, w, 13);
  gbox(x, y, w, 13, ok ? (hov ? '#ffd166' : '#fca311') : '#3a3350', ok ? (hov ? '#f08a10' : '#c86a00') : '#26203a', ok ? '#fff1c2' : '#4a4266');
  const tw = textW(label, FS) + (sd ? 10 : 0), tx = x + Math.round((w - tw) / 2);
  if (sd) drawStardustIcon(tx, y + 3);
  text(label, tx + (sd ? 10 : 0), y + 4, ok ? '#2a1400' : '#8a80a8', FS);
  if (hov) IN.cursor = 'pointer';
  return hov && IN.pr;
}
// buying anything takes two clicks, so nobody spends by accident
function confirmBuy(key) {
  if (STORE.confirm && STORE.confirm.k === key && T_NOW - STORE.confirm.t < 3) { STORE.confirm = null; IN.pr = false; return true; }
  STORE.confirm = { k: key, t: T_NOW }; SND.play('click'); IN.pr = false; return false;
}
const confirming = key => STORE.confirm && STORE.confirm.k === key && T_NOW - STORE.confirm.t < 3;
// the store button in the station's top bar
function drawStoreButton(x, y) {
  const sd = STORE.p ? fmt(STORE.p.sd) : '', w = 34 + (sd ? textW(sd, FS) + 12 : 0);
  const claim = storeClaimable() + missionsReady() > 0, pulse = (claim || STORE.badge) && Math.floor(T_NOW * 3) % 2;
  if (button(x - w, y, w, 16, '', { tip: 'THE STORE: SEASON PASS, ARMORY, SHOP AND STARDUST', kind: 'def' })) { STORE.badge = false; openStation('store'); }
  text('STORE', x - w + 5, y + 5, '#e6d6ff', FS); if (sd) { drawStardustIcon(x - w + 31, y + 4); text(sd, x - w + 41, y + 5, '#f0e0ff', FS); }
  if (pulse) { rect(x - 5, y - 2, 6, 6, COL.coral); text('!', x - 2, y - 1, '#fff', FS, 1); }
  return w;
}
function storeClaimable() {
  if (!STORE.p || Date.now() > PASS.ends + 7 * 864e5) return 0; const t = passTier(), f = claimedSet('f'), p = claimedSet('p'), b = claimedSet('b'); let n = 0;
  for (let i = 1; i <= t; i++) { if (!f.has(i)) n++; if (ownsPass() && !p.has(i)) n++; }
  for (let i = 1; i <= passBonus(); i++) if (!b.has(i)) n++;
  return n;
}
function claimAll() {
  const t = passTier(), f = claimedSet('f'), pp = claimedSet('p'), bb = claimedSet('b'), todo = [];
  for (let i = 1; i <= t; i++) { if (!f.has(i)) todo.push([i, 'f']); if (ownsPass() && !pp.has(i)) todo.push([i, 'p']); }
  for (let i = 1; i <= passBonus(); i++) if (!bb.has(i)) todo.push([i, 'b']);
  if (!todo.length) return;
  netDo(async () => { let r = null; for (const [i, tr] of todo) r = await rpc('pass_claim', { p_tier: i, p_track: tr, p_xp: passState().xp }); STORE.p = r; NET.mail = Math.max(NET.mail, 1); SND.play('fanfare'); STORE.flash = 1; return r; }, `CLAIMED ${todo.length} REWARD${todo.length > 1 ? 'S' : ''}. ITEMS, COINS AND CRATES ARE IN YOUR MAILBOX`);
}

// ---------- the store panel ----------
const STORE_TABS = [['PASS', 'pass', '#9fe7ff'], ['ARMORY', 'gun', '#ff8a5c'], ['SHOP', 'bag', '#ffd166'], ['STARDUST', 'gem', '#c9a6ff'], ['SUPPORTER', 'crown', COL.gold]];
function storeTabIcon(k, x, y, c) {
  if (k === 'pass') { rect(x + 3, y, 1, 7, c); rect(x, y + 3, 7, 1, c); px(x + 1, y + 1, c); px(x + 5, y + 1, c); px(x + 1, y + 5, c); px(x + 5, y + 5, c); }
  else if (k === 'gun') { rect(x, y + 2, 7, 2, c); rect(x + 1, y + 4, 2, 3, c); px(x + 6, y + 1, c); }
  else if (k === 'bag') { rect(x, y + 2, 7, 5, c); rect(x + 2, y, 3, 1, c); px(x + 1, y + 1, c); px(x + 5, y + 1, c); }
  else if (k === 'gem') drawStardustIcon(x, y);
  else { rect(x, y + 2, 7, 4, c); px(x, y + 1, c); px(x + 3, y, c); px(x + 6, y + 1, c); }
}
function storeSnow(dt) {
  const sn = STORE.snow = STORE.snow || [];
  while (sn.length < 70) sn.push({ x: 8 + Math.random() * (W - 16), y: 8 + Math.random() * (H - 16), v: 6 + Math.random() * 14, s: Math.random() < 0.2 ? 2 : 1, ph: Math.random() * 9 });
  for (const f of sn) { f.y += f.v * dt; f.x += Math.sin(T_NOW + f.ph) * 4 * dt; if (f.y > H - 8) { f.y = 8; f.x = 8 + Math.random() * (W - 16); } ctx.globalAlpha = 0.25 + 0.25 * (f.s - 1) + 0.15 * Math.sin(T_NOW * 2 + f.ph); rect(Math.floor(f.x), Math.floor(f.y), f.s, f.s, '#eaf6ff'); }
  ctx.globalAlpha = 1;
}
function panelStore(st) {
  // frame
  ctx.globalAlpha = 0.78; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  gbox(6, 6, W - 12, H - 12, '#120c2e', '#05040f', '#5a4a9a');
  storeSnow(1 / 60);
  gbox(7, 7, W - 14, 19, '#2a1a5a', '#160d36'); rect(7, 26, W - 14, 1, '#5a4a9a');
  miniCrate(13, 10, 4); textO('STORE', 30, 11, '#ffffff', '#000', FB);
  // stardust balance
  const sd = STORE.p ? fmt(stardust()) : '-', sw = textW(sd, FB) + 34, sx = W - 72 - sw;
  gbox(sx, 9, sw, 15, '#3a2470', '#1e1240', '#9f7fef'); drawStardustIcon(sx + 5, 13); text(sd, sx + 15, 13, '#f0e0ff', FB);
  if (button(sx + sw - 13, 10, 12, 13, '+', { font: FS, kind: 'primary', tip: 'GET MORE STARDUST' })) st.tab = 3;
  if (button(W - 66, 8, 58, 16, 'CLOSE', { font: FS, kind: 'cream', tip: 'OR PRESS ESC' }) || (kp('Escape') && !STORE.confirm)) { HUB.panel = null; SND.play('click'); return; }
  if (kp('Escape')) STORE.confirm = null;
  // tabs
  st.tab = st.tab || 0; const tw = 86, tx0 = 12;
  STORE_TABS.forEach(([n, ic, c], i) => {
    const x = tx0 + i * (tw + 4), y = 30, sel = st.tab === i, hov = inBox(x, y, tw, 15);
    gbox(x, y, tw, 15, sel ? '#3a2a6e' : hov ? '#241a4a' : '#160f30', sel ? '#221548' : '#0e0a20', sel ? c : '#3a2f66');
    if (sel) rect(x + 2, y + 13, tw - 4, 1, c);
    storeTabIcon(ic, x + 7, y + 4, sel ? c : '#8a80b8'); text(n, x + 18, y + 5, sel ? '#ffffff' : '#a59cd0', FS);
    if (i === 0 && storeClaimable() + missionsReady() > 0 && Math.floor(T_NOW * 3) % 2) { rect(x + tw - 9, y - 2, 7, 7, COL.coral); text('!', x + tw - 6, y - 1, '#fff', FS, 1); }
    if (hov) { IN.cursor = 'pointer'; if (IN.pr) { st.tab = i; SND.play('click'); STORE.confirm = null; IN.pr = false; } }
  });
  if (NET.st !== 'on') {
    gbox(W / 2 - 150, 70, 300, 90, '#1e1448', '#0e0a24', '#9f7fef');
    textO('SIGN IN TO USE THE STORE', W / 2, 84, '#e6d6ff', '#000', FB, 1, 2);
    text('STARDUST, THE PASS AND EVERYTHING YOU BUY', W / 2, 108, COL.dim, FS, 1); text('IS SAVED ON YOUR ACCOUNT, SO IT IS NEVER LOST', W / 2, 116, COL.dim, FS, 1);
    if (button(W / 2 - 60, 132, 120, 20, 'SIGN IN', { kind: 'primary' })) openStation('social');
    return;
  }
  storeRefresh(false);
  if (!STORE.p) { text(STORE.missing ? 'THE STORE IS NOT SET UP ON THE SERVER YET' : 'LOADING THE STORE...', W / 2, 130, COL.dim, FB, 1); return; }
  if (st.tab === 0) storePass(st);
  else if (st.tab === 1) storeArmory(st);
  else if (st.tab === 2) storeShop(st);
  else if (st.tab === 3) storeDust(st);
  else storeSupporter(st);
  // footer
  text('SECURE PAYMENTS BY STRIPE. UNDER 18? ASK A PARENT FIRST.', 12, H - 15, '#6a6290', FS);
  if (button(W - 80, H - 18, 34, 11, 'TERMS', { font: FS })) openLegal('terms');
  if (button(W - 44, H - 18, 34, 11, 'HELP', { font: FS, tip: 'SOMETHING WRONG WITH A PURCHASE? TELL US' })) openBugReport();
  if (STORE.flash > 0) { STORE.flash -= 1 / 60; ctx.globalAlpha = STORE.flash * 0.4; rect(0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; }
}

// ---------- PASS ----------
function storePass(st) {
  const now = Date.now(), live = now < PASS.ends, p = passState(), tier = passTier(), into = tier >= PASS.tiers ? p.xp - PASS.tiers * PASS.xp : p.xp - tier * PASS.xp, owns = ownsPass();
  // hero: the season and its big prize
  const hx = 12, hy = 49, hw = 138, hh = 196;
  gbox(hx, hy, hw, hh, '#123a66', '#081428', '#9fe7ff');
  for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.08; rect(hx + 1, hy + 40 + i * 20, hw - 2, 8, '#bff6ff'); } ctx.globalAlpha = 1;
  textO(PASS.name, hx + hw / 2, hy + 6, '#dff8ff', '#0a2a50', FB, 1, 2);
  text(PASS.sub, hx + hw / 2, hy + 24, '#9fe7ff', FS, 1);
  const chip = live ? `ENDS IN ${timeLeft(PASS.ends - now)}` : 'SEASON OVER'; const cw = textW(chip, FS) + 10;
  panel(hx + hw / 2 - cw / 2, hy + 32, cw, 10, { bg: '#4a0f1c', bd: '#ff6a7a', flat: true }); text(chip, hx + hw / 2, hy + 34, '#ffb0b8', FS, 1);
  rays(hx + hw / 2, hy + 74, 60, '#fff2a0', 0.14);
  const big = 'w|launcher|6017'; drawItemIn(big, hx + 8, hy + 52, hw - 16, 44, { maxSc: 3 });
  if (inBox(hx + 8, hy + 52, hw - 16, 44)) TIP.set({ item: big });
  text('TIER 30 PRIZE', hx + hw / 2, hy + 100, '#ffd166', FS, 1);
  textO('THE SLEIGHBREAKER', hx + hw / 2, hy + 108, '#ffffff', '#000', FS, 1);
  text('COSMIC LAUNCHER', hx + hw / 2, hy + 117, rcolOf(6), FS, 1);
  wrap('FIRES PRESENTS THAT BURST INTO FREEZING CANDY CANES', hw - 14, FS).slice(0, 2).forEach((l, i) => text(l, hx + hw / 2, hy + 127 + i * 8, '#bfd8f0', FS, 1));
  // tier badge with an XP ring
  const bx = hx + 30, by = hy + 166; circ(bx, by, 16, '#081428'); ctx.strokeStyle = '#1f4a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx + 0.5, by + 0.5, 14, 0, TAU); ctx.stroke();
  ctx.strokeStyle = tier >= PASS.tiers ? '#c9a6ff' : '#9fe7ff'; ctx.beginPath(); ctx.arc(bx + 0.5, by + 0.5, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(into / (tier >= PASS.tiers ? PASS.bonusXp : PASS.xp), 0, 1)); ctx.stroke(); ctx.lineWidth = 1;
  textO(tier + '', bx, by - 5, '#ffffff', '#000', FB, 1); text('TIER', bx, by + 6, '#9fe7ff', FS, 1);
  if (tier >= PASS.tiers) { text('BONUS STARS', bx + 22, by - 10, '#c9a6ff', FS); text(`${passBonus()} / ${PASS.bonusMax}`, bx + 22, by - 1, '#ffffff', FS); text(`${fmt(into % PASS.bonusXp)}/${fmt(PASS.bonusXp)} XP`, bx + 22, by + 8, '#8aa8c8', FS); }
  else { text('NEXT TIER', bx + 22, by - 10, '#9fe7ff', FS); text(`${fmt(into)} / ${fmt(PASS.xp)}`, bx + 22, by - 1, '#ffffff', FS); text('PLAY TO EARN XP', bx + 22, by + 8, '#8aa8c8', FS); }
  // the track
  const tx = 156, ty = 49, tw = W - 12 - tx, cw2 = 38, gap = 4, cols = PASS.tiers + 1;
  const maxS = Math.max(0, cols * (cw2 + gap) - tw + 26);
  if (st.pScroll === undefined) st.pScroll = clamp((Math.max(1, tier) - 3) * (cw2 + gap), 0, maxS);
  if (inBox(tx, ty, tw, 96)) st.pScroll = clamp(st.pScroll + IN.wheel * 45, 0, maxS);
  if (IN.down && inBox(tx, ty, tw, 96)) st.pScroll = clamp(st.pScroll - (IN.mx - (st.plmx ?? IN.mx)), 0, maxS); st.plmx = IN.down ? IN.mx : undefined;
  gbox(tx, ty, tw, 96, '#0e0b26', '#0a0819', '#3a2f66');
  // row labels
  const rl = (y, t, c, lock) => { gbox(tx + 1, y, 22, 34, '#1a1440', '#100c28'); ctx.save(); ctx.translate(tx + 12, y + 17); ctx.rotate(-Math.PI / 2); text(t, 0, -2, c, FS, 1); ctx.restore(); if (lock) { rect(tx + 9, y + 26, 7, 5, '#8a80b8'); ring(tx + 12, y + 25, 2, '#8a80b8'); } };
  rl(ty + 18, 'FREE', '#dfe4f5'); rl(ty + 57, 'PASS', '#ffd166', !owns);
  const f = claimedSet('f'), pp = claimedSet('p'), bb = claimedSet('b'), x0 = tx + 26;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, ty + 1, tw - 27, 94); ctx.clip();
  // progress ribbon under the tier numbers
  const prog = Math.min(cols, tier + (tier < PASS.tiers ? into / PASS.xp : 0)), rx0 = x0 + 4 - st.pScroll;
  rect(rx0, ty + 12, cols * (cw2 + gap) - gap, 3, '#1f1a44'); rect(rx0, ty + 12, Math.round(prog * (cw2 + gap)), 3, '#9fe7ff'); rect(rx0, ty + 12, Math.round(prog * (cw2 + gap)), 1, '#ffffff');
  let hover = null;
  for (let i = 0; i < cols; i++) {
    const n = i + 1, x = rx0 + i * (cw2 + gap); if (x < x0 - cw2 || x > tx + tw) continue;
    if (n > PASS.tiers) { // bonus stars after tier 30
      const got = bb.size, ready = passBonus() - got;
      gbox(x, ty + 18, cw2 + 20, 73, '#2a1a5a', '#140c30', '#c9a6ff'); text('BONUS', x + (cw2 + 20) / 2, ty + 4, '#c9a6ff', FS, 1);
      drawStardustIcon(x + (cw2 + 20) / 2 - 7, ty + 28, 2); text(`+${PASS.bonusSd} EACH`, x + (cw2 + 20) / 2, ty + 47, '#e6d6ff', FS, 1);
      text(`EVERY ${fmt(PASS.bonusXp)} XP`, x + (cw2 + 20) / 2, ty + 56, '#8a80b8', FS, 1); text(`${passBonus()}/${PASS.bonusMax}`, x + (cw2 + 20) / 2, ty + 68, '#ffffff', FB, 1);
      if (ready > 0) text(`${ready} READY`, x + (cw2 + 20) / 2, ty + 80, COL.gold, FS, 1);
      if (inBox(x, ty + 18, cw2 + 20, 73)) hover = { bonus: true };
      continue;
    }
    const reached = n <= tier, mile = n % 5 === 0;
    text(n + '', x + cw2 / 2, ty + 4, reached ? '#ffffff' : mile ? '#ffd166' : '#6a6290', FS, 1);
    for (const [row, track, list, set] of [[0, 'f', PASS.free, f], [1, 'p', PASS.prem, pp]]) {
      const y = ty + 18 + row * 39, rw = list[i], got = set.has(n), locked = track === 'p' && !owns, ready = reached && !got && !locked;
      const r = rw.it ? getDef(rw.it).r : -1, wpn = rw.it && 'wgp'.includes(rw.it[0]);
      if (ready) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(T_NOW * 6); rect(x - 2, y - 2, cw2 + 4, 38, COL.gold); ctx.globalAlpha = 1; }
      const top = got ? '#14301f' : wpn ? '#3a1a2a' : track === 'p' ? '#1d2a50' : '#1a1838', bot = got ? '#0a1a10' : wpn ? '#1a0a14' : track === 'p' ? '#0e1430' : '#0f0e24';
      gbox(x, y, cw2, 34, top, bot, ready ? COL.gold : got ? '#7dffb0' : r >= 0 ? rcolOf(r) : track === 'p' ? '#3a4f8a' : '#34305a');
      if (wpn && !got) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T_NOW * 3 + i); rect(x + 1, y + 1, cw2 - 2, 32, rcolOf(r)); ctx.globalAlpha = 1; }
      drawReward(rw, x, y, cw2, 34, (!reached && !got) || locked);
      if (got) { rect(x + cw2 - 10, y + 24, 9, 9, '#0a1a10'); line(x + cw2 - 8, y + 28, x + cw2 - 6, y + 30, '#7dffb0'); line(x + cw2 - 6, y + 30, x + cw2 - 2, y + 25, '#7dffb0'); }
      else if (locked) { rect(x + cw2 - 9, y + 26, 7, 5, '#8a80b8'); ring(x + cw2 - 6, y + 25, 2, '#8a80b8'); }
      if (inBox(x, y, cw2, 34) && inBox(x0, ty, tw - 27, 96)) { hover = { rw, n, track, got, locked, reached, ready }; if (ready) { IN.cursor = 'pointer'; if (IN.rl && Math.abs(IN.dragX) < 5 && !NET.act) passClaim(n, track); } }
    }
  }
  ctx.restore();
  if (maxS > 0) { rect(x0, ty + 93, tw - 30, 1, '#241e4a'); rect(x0 + (tw - 70) * (st.pScroll / maxS), ty + 93, 40, 1, '#9fe7ff'); }
  // details of whatever you point at
  const dy = ty + 100; gbox(tx, dy, tw, 44, '#161236', '#0c0a20', '#3a2f66');
  if (hover && hover.bonus) { drawStardustIcon(tx + 10, dy + 15, 2); text('BONUS STARS', tx + 34, dy + 7, '#c9a6ff', FB); text(`AFTER TIER 30, EVERY ${fmt(PASS.bonusXp)} XP GIVES ${PASS.bonusSd} STARDUST. UP TO ${PASS.bonusMax}`, tx + 34, dy + 19, '#bfb6e6', FS); text('ON BOTH THE FREE AND PAID PASS', tx + 34, dy + 28, '#8a80b8', FS); }
  else if (hover) {
    const rw = hover.rw, d = rw.it ? getDef(rw.it) : null;
    if (d) { drawItemIn(rw.it, tx + 4, dy + 4, 54, 36, { maxSc: 3 }); TIP.v = null; } else drawReward(rw, tx + 8, dy + 4, 44, 36);
    text(`TIER ${hover.n} ${hover.track === 'p' ? 'PASS' : 'FREE'}`, tx + 64, dy + 5, hover.track === 'p' ? '#ffd166' : '#dfe4f5', FS);
    textO(rewardText(rw), tx + 64, dy + 14, d ? rcolOf(d.r) : '#ffffff', '#000', FB);
    const sub = d ? `${RAR[d.r].n} ${rewardKind(rw)}${d.cat === 'w' ? '. ' + (d.lore || '') : ''}` : rewardKind(rw);
    wrap(sub, tw - 70, FS).slice(0, 2).forEach((l, k) => text(l, tx + 64, dy + 26 + k * 8, '#bfb6e6', FS));
    const s2 = hover.got ? 'CLAIMED' : hover.locked ? 'NEEDS THE PASS' : hover.ready ? 'CLICK TO CLAIM!' : `REACH TIER ${hover.n}`;
    text(s2, tx + tw - 6, dy + 5, hover.got ? '#7dffb0' : hover.ready ? COL.gold : '#8a80b8', FS, 2);
  } else if (passLive()) {
    const ms = passMissions(), left = PASS.starts + (passWeek() + 1) * 7 * 864e5 - Date.now();
    text('THIS WEEK\'S MISSIONS', tx + 6, dy + 4, '#9fe7ff', FS); text(`NEW ONES IN ${timeLeft(left)}`, tx + tw - 6, dy + 4, '#6a8ab0', FS, 2);
    ms.forEach((m, i) => {
      const y = dy + 13 + i * 10, bw = 70, bx = tx + tw - 132;
      text(m.t, tx + 6, y + 1, m.done ? '#5a7a6a' : '#dfe4f5', FS);
      bar(bx, y + 2, bw, 3, m.cur / m.need, m.ok ? '#7dffb0' : '#9fe7ff', '#1a1838'); text(`${fmt(m.cur)}/${fmt(m.need)}`, bx + bw + 4, y + 1, '#8a80b8', FS);
      if (m.done) text('DONE', tx + tw - 6, y + 1, '#7dffb0', FS, 2);
      else if (m.ok) { if (button(tx + tw - 36, y - 1, 32, 9, 'CLAIM', { font: FS, kind: 'primary' })) missionClaim(m); }
      else text(`+${fmtShort(m.xp)}`, tx + tw - 6, y + 1, '#ffd166', FS, 2);
    });
  } else text('THE SEASON IS OVER. CLAIM ANYTHING LEFT WITHIN A WEEK', tx + tw / 2, dy + 18, '#8a80b8', FS, 1);
  // buy, or claim
  const cy = dy + 48;
  if (!owns) {
    const pulse = 0.5 + 0.5 * Math.sin(T_NOW * 3);
    ctx.globalAlpha = 0.25 + 0.2 * pulse; rect(tx - 1, cy - 1, tw + 2, 46, '#ffd166'); ctx.globalAlpha = 1;
    gbox(tx, cy, tw, 44, '#4a2a08', '#241404', '#ffd166');
    textO('UNLOCK THE PAID PASS', tx + 8, cy + 6, '#ffe9a8', '#000', FB);
    text('TIERS YOU ALREADY REACHED UNLOCK RIGHT AWAY', tx + 8, cy + 19, '#e8c890', FS);
    text('4 XMAS WEAPONS, RUDOLPH, SNOW GLOBE, 12 COSMETICS', tx + 8, cy + 29, '#ffffff', FS);
    const k1 = 'pass$', k2 = 'passsd';
    if (pricePill(tx + tw - 96, cy + 6, 88, confirming(k1) ? 'CLICK AGAIN' : 'BUY ' + PASS.usd, live && !NET.act, false) && live) { if (confirmBuy(k1)) checkout('pass_' + PASS.id); }
    if (pricePill(tx + tw - 96, cy + 25, 88, confirming(k2) ? 'SURE?' : '' + PASS.sd, live && stardust() >= PASS.sd && !NET.act, true) && live) { if (stardust() < PASS.sd) { toast('NOT ENOUGH STARDUST', COL.coral); st.tab = 3; } else if (confirmBuy(k2)) storeSpend('pass', PASS.id, 'PASS UNLOCKED! CLAIM YOUR TIERS'); }
  } else {
    const n = storeClaimable();
    gbox(tx, cy, tw, 44, n ? '#3a2a08' : '#0f2a1a', n ? '#1e1404' : '#081a10', n ? '#ffd166' : '#7dffb0');
    textO(n ? `${n} REWARD${n > 1 ? 'S' : ''} READY!` : 'PASS OWNED. EVERYTHING YOU EARN IS YOURS', tx + 8, cy + 7, n ? '#ffe9a8' : '#bfffd8', '#000', FB);
    text(n ? 'CLAIM THEM ONE AT A TIME, OR ALL AT ONCE' : 'KEEP PLAYING: AFTER TIER 30 YOU EARN BONUS STARDUST', tx + 8, cy + 20, n ? '#e8c890' : '#8ad8a8', FS);
    if (n && button(tx + tw - 108, cy + 12, 100, 20, 'CLAIM ALL', { kind: 'primary', disabled: NET.act })) claimAll();
  }
}

// ---------- ARMORY ----------
function weaponDps(id, g, mul) { const d = getDef(id); const s = wStats(d, effL(id, 1, g)); return (d.sub === 'beam' ? s.dmg : s.dmg * s.rate * (s.pellets || 1) * (d.sub === 'drone' ? 1 + Math.floor(d.r / 2) : 1)) * mul; }
function storeArmory(st) {
  const P = STORE.p, list = P.armory || ARMORY, owned = new Set(P.owned || []);
  textO('THE ARMORY', 12, 50, '#ffb08a', '#000', FB); text('TOP-SHELF WEAPONS WITH ONE-OF-A-KIND TRICKS. ALWAYS IN STOCK. COME AT NEBULA GRADE', 12, 61, '#c8a8a0', FS);
  const myW = S.eq.weapon; text(myW ? `% VS YOUR ${getDef(myW).name}` : 'EQUIP A WEAPON TO COMPARE', W - 12, 51, '#8a7a90', FS, 2);
  const mul = loadout().dmgMul, myId = S.eq.weapon, myDps = myId ? weaponDps(myId, gradeOf(myId), mul) : 1;
  const cw = 108, ch = 86, gap = 8;
  let hov = null;
  list.forEach(([id, price], i) => {
    const x = 12 + (i % 4) * (cw + gap), y = 70 + Math.floor(i / 4) * (ch + 6), d = getDef(id), own = owned.has(id) || !!S.inv[id], rc = rcolOf(d.r), h = inBox(x, y, cw, ch);
    if (h) { hov = id; ctx.globalAlpha = 0.3; rect(x - 2, y - 2, cw + 4, ch + 4, rc); ctx.globalAlpha = 1; }
    gbox(x, y, cw, ch, d.r === 6 ? '#2a1238' : '#2a1414', '#0c0610', rc);
    rays(x + cw / 2, y + 22, 34, rc, h ? 0.16 : 0.08);
    drawItemIn(id, x + 6, y + 6, cw - 12, 30, { maxSc: 3 });
    textO(d.name, x + cw / 2, y + 39, rc, '#000', FS, 1);
    text(`${RAR[d.r].n} ${CLS[d.sub].n}`, x + cw / 2, y + 48, '#a89090', FS, 1);
    const dps = weaponDps(id, 4, mul), pct = Math.round((dps / Math.max(1, myDps) - 1) * 100);
    text(`DPS ${fmtShort(Math.round(dps))}`, x + 6, y + 58, '#ffe0c8', FS); text(pct >= 0 ? `+${pct}%` : `${pct}%`, x + cw - 6, y + 58, pct >= 0 ? '#7dffb0' : COL.coral, FS, 2);
    if (own) { gbox(x + 6, y + ch - 18, cw - 12, 13, '#14301f', '#0a1a10', '#7dffb0'); text('OWNED', x + cw / 2, y + ch - 14, '#7dffb0', FS, 1); }
    else if (pricePill(x + 6, y + ch - 18, cw - 12, confirming(id) ? 'BUY? CLICK AGAIN' : fmt(price), stardust() >= price && !NET.act, !confirming(id))) {
      if (stardust() < price) { toast(`YOU NEED ${fmt(price - stardust())} MORE STARDUST`, COL.coral); st.tab = 3; }
      else if (confirmBuy(id)) storeSpend('weapon', id, `${d.name} IS YOURS! CHECK YOUR MAILBOX`);
    }
    if (h) TIP.set({ item: id });
  });
}

// ---------- SHOP ----------
function storeShop(st) {
  const P = STORE.p, list = P.shop || [], now = Date.now(), ends = P.shop_ends ? Date.parse(P.shop_ends) : now, owned = new Set(P.owned || []);
  // try it on
  const px0 = 12, py0 = 49, pw = 100, ph = 150;
  gbox(px0, py0, pw, ph, '#1a1440', '#0a0819', '#3a2f66');
  ctx.globalAlpha = 0.25; for (let gx = px0 + 6; gx < px0 + pw; gx += 10) rect(gx, py0 + 14, 1, ph - 34, '#3a2f66'); ctx.globalAlpha = 1;
  text('TRY IT ON', px0 + pw / 2, py0 + 5, '#ffd166', FS, 1);
  const tryId = st.tryId && P.shop.some(s => s[0] === st.tryId) ? st.tryId : null, eq = Object.assign({}, S.eq);
  if (tryId) { const d = getDef(tryId); if (d.cat === 'c') eq[d.sub] = tryId; else if (d.cat === 'k' && d.sub === 'armor') eq.skin_armor = tryId; else if (d.cat === 'k' && d.sub === 'weapon') eq.skin_weapon = tryId; }
  shadow(px0 + pw / 2, py0 + 118, 22, 5, 0.5); ctx.drawImage(astroSprite(eq, [0, 3, 1, 2][Math.floor(T_NOW / 1.2) % 4], 0), px0 + pw / 2 - 30, py0 + 22, 60, 96);
  if (tryId) { const d = getDef(tryId); wrap(d.name, pw - 8, FS).slice(0, 2).forEach((l, k) => text(l, px0 + pw / 2, py0 + 124 + k * 8, rcolOf(d.r), FS, 1)); if (d.cat === 'b' || d.sub === 'ship' || d.sub === 'trail' || d.sub === 'killfx') text('SHOWS IN PLAY', px0 + pw / 2, py0 + 140, '#8a80b8', FS, 1); }
  else text('POINT AT AN ITEM', px0 + pw / 2, py0 + 128, '#8a80b8', FS, 1);
  // featured
  const fx = 118, fw = W - 12 - fx;
  textO("TODAY'S FEATURED", fx, 50, '#ffd166', '#000', FB);
  const tchip = `NEW ITEMS IN ${timeLeft(ends - now)}`, tcw = textW(tchip, FS) + 10; panel(fx + fw - tcw, 49, tcw, 10, { bg: '#2a1a08', bd: '#ffd166', flat: true }); text(tchip, fx + fw - tcw / 2, 51, '#ffe9a8', FS, 1);
  const cw = Math.floor((fw - 14) / 3), ch = 74; st.tryHover = null;
  list.forEach(([id, price], i) => {
    const x = fx + (i % 3) * (cw + 7), y = 62 + Math.floor(i / 3) * (ch + 6), d = getDef(id), own = owned.has(id) || !!S.inv[id], rc = rcolOf(d.r), h = inBox(x, y, cw, ch);
    if (h) { st.tryId = id; ctx.globalAlpha = 0.3; rect(x - 2, y - 2, cw + 4, ch + 4, rc); ctx.globalAlpha = 1; }
    gbox(x, y, cw, ch, '#1a1438', '#0a0818', rc);
    ctx.globalAlpha = 0.18; gbox(x + 1, y + 1, cw - 2, 38, rc, '#0a0818'); ctx.globalAlpha = 1;
    rays(x + cw / 2, y + 20, 28, rc, h ? 0.14 : 0.06);
    drawItemIn(id, x + 6, y + 4, cw - 12, 32, { maxSc: d.cat === 'b' ? 2 : 3 });
    textO(d.name, x + cw / 2, y + 40, rc, '#000', FS, 1);
    text(`${RAR[d.r].n} ${(SUB_LABEL_FULL[d.sub] || '').replace('KILL EFFECT', 'KILL FX')}`, x + cw / 2, y + 49, '#9a90c0', FS, 1);
    if (own) { gbox(x + 6, y + ch - 16, cw - 12, 13, '#14301f', '#0a1a10', '#7dffb0'); text('OWNED', x + cw / 2, y + ch - 12, '#7dffb0', FS, 1); }
    else if (pricePill(x + 6, y + ch - 16, cw - 12, confirming(id) ? 'BUY? CLICK AGAIN' : fmt(price), stardust() >= price && !NET.act, !confirming(id))) {
      if (stardust() < price) { toast(`YOU NEED ${fmt(price - stardust())} MORE STARDUST`, COL.coral); st.tab = 3; }
      else if (confirmBuy(id)) storeSpend('item', id, `${d.name} IS YOURS! CHECK YOUR MAILBOX`);
    }
    if (h) TIP.set({ item: id });
  });
  // coin packs
  const cy = 62 + 2 * (ch + 6) + 2;
  textO('COIN PACKS', 12, cy + 1, '#ffd166', '#000', FB);
  const pw2 = Math.floor((W - 24 - 80 - 14) / 3);
  (P.packs || []).forEach(([id, cost, base], i) => {
    const x = 92 + i * (pw2 + 7), y = cy - 3, coins = Math.round(base * (P.k || 1) / 50) * 50;
    gbox(x, y, pw2, 20, '#2a1c08', '#120c04', '#a8761a');
    for (let k = 0; k < 2 + i * 2; k++) drawCoinIcon(x + 5 + (k % 3) * 4, y + 11 - Math.floor(k / 3) * 4 - (k % 2) * 2);
    text(fmt(coins), x + 26, y + 7, '#ffd166', FB);
    if (pricePill(x + pw2 - 48, y + 4, 44, confirming(id) ? 'SURE?' : '' + cost, stardust() >= cost && !NET.act, !confirming(id))) {
      if (stardust() < cost) { toast('NOT ENOUGH STARDUST', COL.coral); st.tab = 3; } else if (confirmBuy(id)) storeSpend('coins', id, `+${fmt(coins)} COINS. THEY ARE IN YOUR MAILBOX`);
    }
  });
}

// ---------- STARDUST ----------
function storeDust(st) {
  textO('GET STARDUST', 12, 50, '#e6d6ff', '#000', FB); text('THE STORE CURRENCY. IT NEVER EXPIRES AND STAYS ON YOUR ACCOUNT', 12, 61, '#a59cd0', FS);
  const cw = 108, gap = 8, ch = 134;
  PRODUCTS.forEach((p, i) => {
    const x = 12 + i * (cw + gap), y = 72, h = inBox(x, y, cw, ch), best = p.tag === 'BEST VALUE';
    if (p.tag || h) { ctx.globalAlpha = (h ? 0.35 : 0.18) + 0.12 * Math.sin(T_NOW * 3 + i); rect(x - 2, y - 2, cw + 4, ch + 4, best ? '#ffd166' : '#c9a6ff'); ctx.globalAlpha = 1; }
    gbox(x, y, cw, ch, best ? '#3a2470' : '#24164e', '#0c0820', best ? '#ffd166' : p.tag ? '#c9a6ff' : '#4a3a86');
    if (p.tag) { gbox(x + 1, y + 1, cw - 2, 11, best ? '#ffd166' : '#9f7fef', best ? '#f0a020' : '#7d5ce0'); text(p.tag, x + cw / 2, y + 4, best ? '#2a1400' : '#ffffff', FS, 1); }
    // a pile of crystals that grows with the pack
    rays(x + cw / 2, y + 42, 40, '#c9a6ff', 0.1);
    const n = [1, 3, 6, 10][i], R = RNG(i * 77 + 3);
    for (let k = 0; k < n; k++) { const ox = (R() - 0.5) * (8 + n * 4), oy = (R() - 0.5) * (4 + n * 1.5), s = k === 0 ? 3 : 2; drawStardustIcon(x + cw / 2 - 3.5 * s + ox, y + 40 - 3.5 * s + oy + Math.sin(T_NOW * 2 + k) * 1.2, s); }
    textO(fmt(p.sd), x + cw / 2, y + 70, '#ffffff', '#2a1a5a', FB, 1, 2);
    text('STARDUST', x + cw / 2, y + 88, '#c9a6ff', FS, 1);
    if (p.bonus) text(`${p.bonus} EXTRA`, x + cw / 2, y + 97, '#7dffb0', FS, 1);
    if (pricePill(x + 8, y + ch - 22, cw - 16, confirming(p.id) ? 'CLICK AGAIN' : p.usd, !NET.act, false)) { if (confirmBuy(p.id)) checkout(p.id); }
  });
  const y2 = 214;
  gbox(12, y2, W - 24, 30, '#161236', '#0c0a20', '#3a2f66');
  text('WHAT IT BUYS:', 18, y2 + 5, '#ffd166', FS);
  text(`THE PASS ${PASS.sd}   ARMORY WEAPONS 1,400+   SHOP COSMETICS 300+   COINS 100+`, 76, y2 + 5, '#dfe4f5', FS);
  text('FREE STARDUST: DAILY REWARD DAYS 3, 5 AND 7, PASS TIERS AND BONUS STARS', 18, y2 + 17, '#a59cd0', FS);
}

// ---------- SUPPORTER ----------
function storeSupporter(st) {
  textO('SUPPORTER NAMEPLATE', 12, 50, '#ffd166', '#000', FB); text('A ONE-TIME THANK YOU THAT KEEPS THE SERVERS RUNNING AND NEW PLANETS COMING', 12, 61, '#c8b890', FS);
  const x = 12, y = 72, w = 228, h = 150;
  gbox(x, y, w, h, '#3a2a10', '#120c04', '#ffd166'); ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip(); rays(x + 50, y + 70, 70, '#ffd166', 0.12); ctx.restore();
  shadow(x + 50, y + 116, 22, 5, 0.5); ctx.drawImage(astroSprite(S.eq, 0, 0), x + 20, y + 20, 60, 96);
  textO(S.name || 'YOU', x + 96, y + 26, '#ffffff', '#000', FB, 0, 2); drawSupporterPlate(x + 96, y + 46);
  text('IN THE ARENA:', x + 96, y + 70, '#c8b890', FS);
  const nm = S.name || 'YOU', tw = textW(nm, FS) + 4; panel(x + 96, y + 80, tw + 2, 9, { bg: '#3a2a10', bd: COL.gold, flat: true }); text(nm, x + 97 + tw / 2, y + 82, COL.gold, FS, 1);
  text('ON LEADERBOARDS:', x + 96, y + 98, '#c8b890', FS); text('1. ' + nm, x + 96, y + 108, '#ffffff', FS); drawSupporterBadge(x + 100 + textW('1. ' + nm, FS), y + 107);
  const rx = 252;
  gbox(rx, y, W - 12 - rx, h, '#1a1438', '#0a0818', '#3a2f66');
  ['A GOLD SUPPORTER PLATE ON YOUR PROFILE', 'A GOLD FRAME ON YOUR NAME IN ARENAS', 'A STAR NEXT TO YOUR NAME ON LEADERBOARDS', 'JUST FOR LOOKS. NO EXTRA POWER'].forEach((l, i) => { drawSupporterBadge(rx + 10, y + 12 + i * 14); text(l, rx + 21, y + 13 + i * 14, i === 3 ? '#8a80b8' : '#ffffff', FS); });
  if (hasSupporter()) { textO('YOU ARE A SUPPORTER.', rx + 10, y + 82, '#ffd166', '#000', FB); textO('THANK YOU!', rx + 10, y + 96, '#ffd166', '#000', FB); }
  else {
    if (pricePill(rx + 10, y + 82, 92, confirming('sup$') ? 'CLICK AGAIN' : '$4.99', !NET.act, false)) { if (confirmBuy('sup$')) checkout('supporter'); }
    text('OR', rx + 109, y + 85, '#8a80b8', FS);
    if (pricePill(rx + 124, y + 82, 70, confirming('supsd') ? 'SURE?' : '500', stardust() >= 500 && !NET.act, true)) { if (stardust() < 500) { toast('NOT ENOUGH STARDUST', COL.coral); st.tab = 3; } else if (confirmBuy('supsd')) storeSpend('supporter', '', 'YOU ARE A SUPPORTER. THANK YOU!'); }
  }
}
