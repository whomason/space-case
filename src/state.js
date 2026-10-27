// ===== STATE: save data, inventory, loadout, economy, crate rolls, goals =====
const SAVE_KEY = 'spacecase.save.v1' + TEST_NS;
let S = null, DIRTY = false;
const SLOTS_GEAR = ['weapon', 'tool', 'helmet', 'chest', 'boots', 'jetpack', 'o2'];
const SLOTS_SHIP = ['engine', 'hull', 'cargo', 'scanner', 'shield'];
const SLOTS_COS = ['eyewear', 'headgear', 'back', 'trail', 'killfx'];
const SLOTS_SKIN = ['skin_weapon', 'skin_armor', 'skin_ship', 'skin_tool'];
const RES_VAL = [1, 2, 4, 8, 16, 32, 64];
const MAST_STEPS = [40, 150, 450, 1200, 3000, 7000];
const EVO_NEED = [120, 200, 320];

function firstOf(cat, sub, test) { const size = catSize(cat, sub); for (let n = 0; n < size; n++) { if (rarityOf(cat, sub, n) === 0 && originOf(cat, sub, n).t === 'gen' && (!test || test(n))) return `${cat}|${sub}|${n}`; } return `${cat}|${sub}|0`; }
function newState() {
  const st = {
    v: 2, coins: 1250, research: 0, xp: 0, lvl: 1, sp: 0,
    skills: { combat: 0, mining: 0, explorer: 0, luck: 0 },
    inv: {}, eq: {}, seen: {}, pages: {}, mast: {}, ikills: {}, tokens: [0, 0, 0, 0], clues: {}, forged: {},
    planet: { reached: 1, cur: 1, visited: {}, bosses: {}, bossCd: {}, stars: {}, landings: 0, ev: {} },
    titles: { earned: {}, eq: null }, stats: { crates: 0, wrecks: 0, kills: 0, ore: 0, coinsEarned: 0, bestCombo: 0, donWins: 0, legendaries: 0, mythics: 0, cosmics: 0, maxHaul: 0, carriers: 0, equips: 0, sold: 0, goals: 0, staggers: 0, perfects: 0, reactions: 0, weakhits: 0, events: 0, caches: 0, podkills: 0, kills2: 0, parries: 0, elites: 0, clsKills: {} },
    miners: { slots: {}, acc: {}, last: Date.now() }, nova: { count: 0, stars: 0, perks: { coin: 0, luck: 0, o2: 0 } },
    firstOpen: true, choiceQueue: [], haulCrates: [], goal: null, reactions: {}, contracts: null, track: null, fresh: {}, name: '', nameAsked: false, unlocked: {}, unlockNew: {}, unlockInit: true, settings: { mute: false, music: false, mv2: true }, tutorial: { crate: false, land: false }, created: Date.now(),
  };
  const kit = [firstOf('w', 'blaster'), firstOf('t', 'tool', n => n % 2 === 0), firstOf('a', 'helmet'), firstOf('a', 'chest'), firstOf('a', 'boots'), firstOf('a', 'jetpack'), firstOf('a', 'o2'),
  firstOf('s', 'engine'), firstOf('s', 'hull'), firstOf('s', 'cargo'), firstOf('s', 'scanner'), firstOf('s', 'shield'), firstOf('g', 'blackhole'), firstOf('p', 'bot')];
  st.gift2 = 1;
  for (const id of kit) { st.inv[id] = { l: 1, p: 0, t: Date.now() }; st.eq[slotOf(getDef(id))] = id; }
  for (const id of kit) markSeen(st, getDef(id));
  return st;
}
function markSeen(st, d) { if (d.cat !== 'w') return; for (const k of interactionKeys(d)) st.seen[k] = 1; }
function interactionKeys(d) { const k = d.verbs.map(v => d.sub + ':' + v[0]); if (d.el) { k.push(d.sub + ':' + d.el[0]); d.verbs.forEach(v => k.push(v[0] + '+' + d.el[0])); } return k; }
// turn saved JSON (from this device or the cloud) into a full game state, filling in anything newer versions added
function normalizeSave(o) {
  const def = newState(); const st = Object.assign(newState(), o);
  for (const k of ['skills', 'planet', 'titles', 'stats', 'miners', 'nova', 'settings', 'tutorial']) st[k] = Object.assign({}, def[k] || {}, o[k] || {});
  for (const k in def.stats) if (typeof def.stats[k] === 'number' && !(typeof st.stats[k] === 'number' && isFinite(st.stats[k]))) st.stats[k] = def.stats[k];
  for (const k of ['coins', 'research', 'xp', 'lvl', 'sp']) if (!(typeof st[k] === 'number' && isFinite(st[k]))) st[k] = def[k];
  if (!st.inv || typeof st.inv !== 'object') st.inv = def.inv; if (!st.eq || typeof st.eq !== 'object') st.eq = {}; if (!st.fresh || typeof st.fresh !== 'object') st.fresh = {};
  if (st.keys) { st.coins += st.keys * CRATE_COIN; } delete st.keys; if (!Array.isArray(st.haulCrates)) st.haulCrates = []; if (!Array.isArray(st.choiceQueue)) st.choiceQueue = []; if (!st.reactions) st.reactions = {}; if (!st.planet.ev) st.planet.ev = {}; if (!st.stats.clsKills) st.stats.clsKills = {};
  if (!(o.settings && o.settings.mv2)) { st.settings.music = false; st.settings.mv2 = true; }
  delete st._pub;
  if (o.unlockInit === undefined) st.unlockInit = false;
  if (st.eq.weapon2) delete st.eq.weapon2; // the 2nd weapon slot became the gadget slot
  if (!st.gift2) { st.gift2 = 1; for (const id of [firstOf('g', 'blackhole'), firstOf('p', 'bot')]) { if (!st.inv[id]) { st.inv[id] = { l: 1, p: 0, t: Date.now(), g: 0 }; st.fresh[id] = 1; } const sl = slotOf(getDef(id)); if (sl && !st.eq[sl]) st.eq[sl] = id; } st.giftNote = 1; }
  return st;
}
// the save on this device carries a seal. Editing the file by hand breaks the seal, and the game remembers it
// (the cloud's fair-play check then pauses trading until a moderator looks)
function saveSeal(s) { let h1 = 0xdeadbeef ^ 77, h2 = 0x41c6ce57 ^ 77; const t = s + '|sc-orbit-7f3'; for (let i = 0; i < t.length; i++) { const ch = t.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36); }
function readSave(raw) {
  if (!raw) return null; const i = raw.lastIndexOf('\n#'); const json = i >= 0 ? raw.slice(0, i) : raw, seal = i >= 0 ? raw.slice(i + 2) : null;
  const o = JSON.parse(json); if (o && o.sgn && seal !== saveSeal(json)) o.tamper = 1; return o;
}
function load() {
  try {
    const o = readSave(localStorage.getItem(SAVE_KEY));
    if (o) { S = normalizeSave(o); return true; }
  } catch (e) { }
  S = newState(); return false;
}
function save() { try { S.sgn = 1; const json = JSON.stringify(S); localStorage.setItem(SAVE_KEY, json + '\n#' + saveSeal(json)); } catch (e) { } DIRTY = false; }
function dirty() { DIRTY = true; }
setInterval(() => { if (DIRTY && S) save(); }, 3000);

// ---------- inventory ----------
const owned = id => !!(S.inv[id]);
const lvl = id => S.inv[id] ? S.inv[id].l : 0;
function slotOf(d) {
  if (d.cat === 'w') return 'weapon';
  if (d.cat === 'a' || d.cat === 's') return d.sub;
  if (d.cat === 't') return d.sub === 'tool' ? 'tool' : null;
  if (d.cat === 'k') return 'skin_' + d.sub;
  if (d.cat === 'c') return d.sub;
  if (d.cat === 'b') return 'backdrop';
  if (d.cat === 'g') return 'gadget';
  if (d.cat === 'p') return 'pet';
  return null;
}
// ---------- grades: an item remembers the best crate tier it came out of. higher grade = stronger ----------
const GRADEABLE = { w: 0.8, a: 0.8, t: 0.8, g: 0.8, p: 0.8, s: 0.5 };
function gradeOf(id) { const v = S.inv[id]; return v && v.g ? v.g : 0; }
function effL(id, L, g) { const d = getDef(id); const k = GRADEABLE[d.cat] || 0; return (L || lvl(id) || 1) + k * (g === undefined || g === null ? gradeOf(id) : g); }
const gradeName = g => TIERS[clamp(g || 0, 0, 7)].n + ' GRADE';
function addItem(id, g = 0) {
  const d = getDef(id); const inv = S.inv[id]; g = clamp(Math.floor(g || 0), 0, 7);
  const res = { id, isNew: !inv, levelUp: false, from: inv ? inv.l : 0, to: 1, research: 0, gradeUp: false };
  if (inv && GRADEABLE[d.cat] && g > (inv.g || 0)) { inv.g = g; res.gradeUp = true; }
  if (!inv) { S.inv[id] = { l: 1, p: 0, t: Date.now(), g }; markSeen(S, d); if (slotOf(d)) S.fresh[id] = 1; }
  else if (inv.l >= 10) { res.research = RES_VAL[d.r]; S.research += res.research; res.to = 10; }
  else { inv.p++; if (inv.p >= inv.l) { inv.p -= inv.l; inv.l++; res.levelUp = true; } res.to = inv.l; }
  if (d.r === 4) S.stats.legendaries++; if (d.r === 5) S.stats.mythics++; if (d.r === 6) S.stats.cosmics++;
  // auto-equip into empty slots
  const sl = slotOf(d); if (sl && !S.eq[sl]) S.eq[sl] = id;
  dirty(); return res;
}
function pullLabels(id, tier = 0) {
  const d = getDef(id), inv = S.inv[id], L = [];
  if (!inv) L.push('NEW');
  else if (inv.l >= 10) L.push('RESEARCH MATERIAL');
  else if (inv.p + 1 >= inv.l) L.push('LEVEL UP');
  if (inv && GRADEABLE[d.cat] && tier > (inv.g || 0)) L.push('GRADE UP');
  const sl = slotOf(d);
  if (sl && (d.cat === 'w' || d.cat === 'a' || d.cat === 's' || (d.cat === 't' && d.sub === 'tool'))) {
    const cur = S.eq[sl]; const nl = inv ? (inv.p + 1 >= inv.l ? inv.l + 1 : inv.l) : 1;
    if (cur !== id && (!cur || power(d, effL(id, nl, Math.max(tier, inv ? inv.g || 0 : 0))) > power(getDef(cur), effL(cur)))) L.push('UPGRADE');
  }
  if (!inv) for (const pg of (PAGE_OF[id] || [])) if (!S.pages[pg.id] && pg.ids.every(x => x === id || owned(x))) { L.push('SET COMPLETE'); break; }
  if (d.cat === 'w' && interactionKeys(d).some(k => !S.seen[k])) L.push('NEW INTERACTION');
  return L;
}
const LABEL_COL = { 'NEW': COL.mint, 'LEVEL UP': COL.cyan, 'GRADE UP': '#7dffb0', 'UPGRADE': COL.gold, 'SET COMPLETE': COL.magenta, 'NEW INTERACTION': COL.orange, 'RESEARCH MATERIAL': COL.dim };
const PAGE_OF = {};
function indexPages() { for (const pg of PAGES) for (const id of pg.ids) (PAGE_OF[id] = PAGE_OF[id] || []).push(pg); }
const pageOwned = pg => pg.ids.filter(owned).length;
const pageDone = pg => pageOwned(pg) === pg.ids.length;
const finisherOk = pg => { const o = pageOwned(pg); return o < pg.ids.length && o >= Math.ceil(pg.ids.length * 0.6); };

// ---------- bonuses & loadout ----------
function setCounts() {
  const a = {}, s = {};
  for (const sl of ['helmet', 'chest', 'boots', 'jetpack', 'o2']) { const d = S.eq[sl] && getDef(S.eq[sl]); if (d && d.set !== undefined) a[d.set] = (a[d.set] || 0) + 1; }
  for (const sl of SLOTS_SHIP) { const d = S.eq[sl] && getDef(S.eq[sl]); if (d && d.set !== undefined) s[d.set] = (s[d.set] || 0) + 1; }
  return { a, s };
}
function bonuses() {
  const B = { ore: 0, dmg: 0, hp: 0, spd: 0, o2: 0, boost: 0, crit: 0, extract: 0, combo: 0, cargo: 0, rating: 0, scan: 0, shield: 0, luck: 0 };
  const add = o => { for (const k in o) B[k] = (B[k] || 0) + o[k]; };
  const sc = setCounts();
  for (const s in sc.a) { if (sc.a[s] >= 5) add(ARMOR_SET_BONUS[s][1]); else if (sc.a[s] >= 3) add(ARMOR_SET_BONUS[s][0]); }
  for (const s in sc.s) { if (sc.s[s] >= 5) add(SHIP_SET_BONUS[s][1]); else if (sc.s[s] >= 3) add(SHIP_SET_BONUS[s][0]); }
  for (const pid in S.pages) { const pg = PAGES.find(p => p.id === pid); if (pg && ['o2', 'ore', 'combo', 'dmg', 'cargo', 'luck'].includes(pg.rw.t)) B[pg.rw.t] += pg.rw.v; }
  return B;
}
function shipRating() {
  let r = 0; for (const sl of SLOTS_SHIP) { const id = S.eq[sl]; if (id) r += aStats(getDef(id), effL(id)).rating || 0; }
  return Math.round(r * (1 + bonuses().rating));
}
function frontierMul() { return Math.pow(1.15, Math.max(0, S.planet.reached - 1)); } // every planet you reach makes all your weapons stronger
function luckPct() { return S.skills.luck * 3 + S.nova.perks.luck * 2 + bonuses().luck; }
function loadout() {
  const B = bonuses(), e = S.eq, st = id => id ? aStats(getDef(id), effL(id)) : {};
  const helm = st(e.helmet), chest = st(e.chest), boots = st(e.boots), jet = st(e.jetpack), o2 = st(e.o2), hull = st(e.hull), cargo = st(e.cargo), scan = st(e.scanner), shield = st(e.shield), tool = st(e.tool);
  const perks = {}; for (const sl of ['helmet', 'chest', 'boots', 'jetpack', 'o2', 'tool']) { const id = e[sl]; if (id && getDef(id).perk) perks[getDef(id).perk] = 1; }
  const L = {
    hp: (100 + (helm.hp || 0) + (chest.hp || 0)) * (1 + (hull.hp || 0) + B.hp), armor: chest.armor || 0,
    speed: 66 * (boots.spd || 1) * (1 + B.spd + S.skills.explorer * 0.03), o2: (o2.o2 || 110) * (1 + B.o2 + S.skills.explorer * 0.06 + S.nova.perks.o2 * 0.08),
    light: helm.light || 60, boostCd: (jet.cd || 2.3) * (1 - Math.min(0.6, B.boost)), boostPow: jet.boost || 1, cargo: Math.round((cargo.cargo || 30) * (1 + B.cargo)),
    scan: (scan.scan || 120) * (1 + B.scan), shield: Math.min(0.9, (shield.shield || 0) + B.shield), dmgMul: 1 + S.skills.combat * 0.06 + B.dmg,
    crit: 0.06 + (perks.crit ? 0.08 : 0) + B.crit, oreMul: 1 + S.skills.mining * 0.03 + B.ore + S.nova.perks.coin * 0.15 + S.nova.count * 0.5,
    extract: (tool.speed || 1) * (1 + S.skills.mining * 0.08 + B.extract), toolTier: tool.tier || 1, combo: 3 + B.combo, perks,
  };
  L.frontier = frontierMul(); L.dmgMul *= L.frontier; L.hp *= Math.pow(1.1, Math.max(0, S.planet.reached - 1));
  const wid = e.weapon; L.weapon = wid ? Object.assign(wStats(getDef(wid), effL(wid)), { id: wid }) : null;
  if (L.weapon) L.weapon.dmg *= L.dmgMul;
  L.weapon2 = null;
  const gid = e.gadget && S.inv[e.gadget] ? e.gadget : null; L.gadget = gid ? Object.assign(gStats(getDef(gid), effL(gid)), { id: gid }) : null; if (L.gadget) L.gadget.dmg *= L.dmgMul;
  const pid = e.pet && S.inv[e.pet] ? e.pet : null; L.pet = pid ? Object.assign(pStats(getDef(pid), effL(pid)), { id: pid }) : null; L.coinMul = 1; L.petMagnet = false;
  if (L.pet) { L.pet.dmg *= L.dmgMul; const k = L.pet.k; if (k === 'ufo') { L.oreMul += L.pet.ore; L.petMagnet = true; } if (k === 'fox') L.coinMul += L.pet.coin; if (k === 'owl') { L.crit += L.pet.crit; L.perks.scan = true; } }
  L.setAb = {}; const sc = setCounts(); for (const k in sc.a) if (sc.a[k] >= 3) L.setAb[k] = sc.a[k] >= 5 ? 2 : 1;
  return L;
}

// ---------- crates ----------
const KIND_INFO = {
  weapon: { n: 'WEAPON', mul: 1, em: 'weapon' }, armor: { n: 'ARMOR', mul: 1, em: 'armor' }, ship: { n: 'SHIP', mul: 3, em: 'ship' }, mining: { n: 'MINING', mul: 1, em: 'mining' },
  skin: { n: 'SKIN', mul: 1, em: 'skin' }, cosmetic: { n: 'COSMETIC', mul: 1, em: 'cosmetic' }, backdrop: { n: 'BACKDROP', mul: 1, em: 'backdrop' }, gadget: { n: 'GADGET', mul: 1.2, em: 'gadget' }, pet: { n: 'PET', mul: 1.2, em: 'pet' }, galaxy: { n: 'GALAXY', mul: 2, em: 'galaxy' },
};
function kindInfo(kind) {
  if (KIND_INFO[kind]) return KIND_INFO[kind];
  const [t, a] = kind.split(':');
  if (t === 'class') return { n: CLS[a].n, mul: 1.5, em: 'class' };
  if (t === 'salvage') return { n: planetDef(+a).name + ' SALVAGE', mul: 1.25, em: 'salvage' };
  if (t === 'boss') return { n: planetDef(+a).boss[0] + ' ARSENAL', mul: 2, em: 'boss' };
  if (t === 'finisher') { const pg = PAGES.find(p => p.id === kind.slice(9)); return { n: (pg ? pg.n : 'SET') + ' FINISHER', mul: 2, em: 'finisher' }; }
  return { n: kind.toUpperCase(), mul: 1, em: 'weapon' };
}
function crateCost(kind, tier) { return Math.max(1, Math.ceil(TIERS[tier].cost * kindInfo(kind).mul)) * CRATE_COIN * CRATE_PRICE; }
function poolFor(kind) {
  const map = { weapon: 'w', armor: 'a', ship: 's', mining: 't', skin: 'k', cosmetic: 'c', backdrop: 'b', gadget: 'g', pet: 'p', galaxy: 'galaxy' };
  if (map[kind]) return POOLS[map[kind]];
  if (kind.startsWith('class:')) return POOLS[kind];
  if (kind.startsWith('salvage:')) { ensureSalvagePool(+kind.split(':')[1]); return POOLS[kind]; }
  if (kind.startsWith('boss:')) { ensureBossPool(+kind.split(':')[1]); return POOLS[kind]; }
  if (kind.startsWith('finisher:')) { const pg = PAGES.find(p => p.id === kind.slice(9)); const pool = [[], [], [], [], [], [], []]; if (pg) for (const id of pg.ids) if (!owned(id)) pool[getDef(id).r].push(id); return pool; }
  return POOLS.galaxy;
}
function tierUnlocked(t) { const u = TIERS[t].unlock; return u === 'nova' ? S.nova.count > 0 : S.planet.reached >= u; }
function oddsFor(kind, tier, extraLuck = 0) {
  const pool = poolFor(kind); let o = TIERS[tier].odds.slice();
  if (kind.startsWith('finisher:')) { return pool.map(p => p.length ? 100 * p.length / pool.reduce((a, b) => a + b.length, 0) : 0); }
  const f = (luckPct() + extraLuck) / 100;
  if (f > 0) { const n = o.slice(); for (let k = 0; k < 7; k++) n[k] = o[k] * (k < 6 ? 1 - f : 1) + (k > 0 ? o[k - 1] * f : 0); o = n; }
  for (let k = 0; k < 7; k++) if (!pool[k].length) o[k] = 0;
  const s = o.reduce((a, b) => a + b, 0) || 1; return o.map(v => v / s * 100);
}
function rollRarity(odds) { let v = R0() * 100; for (let k = 0; k < 7; k++) { v -= odds[k]; if (v <= 0 && odds[k] > 0) return k; } for (let k = 6; k >= 0; k--) if (odds[k] > 0) return k; return 0; }
function rollCrate(kind, tier, opt = {}) {
  const pool = poolFor(kind); const odds = oddsFor(kind, tier);
  let r = rollRarity(odds);
  if (S.firstOpen && !opt.noFirst) { if (r < 2) { r = pool[2].length ? 2 : r; } S.firstOpen = false; }
  if (opt.minR !== undefined && r < opt.minR && pool[opt.minR] && pool[opt.minR].length) r = opt.minR;
  const arr = pool[r]; const dr = dreamsIn(arr); if (dr.length && R0() < 0.12) return dr[R0.int(dr.length)];
  return arr[R0.int(arr.length)];
}
const DREAM_CACHE = new WeakMap();
function dreamsIn(arr) { let d = DREAM_CACHE.get(arr); if (!d) { d = arr.filter(isDream); DREAM_CACHE.set(arr, d); } return d; }
// double or nothing: a higher rarity of the SAME kind of thing (a rifle stays a rifle, a helmet stays a helmet)
const subOfId = id => id.startsWith('u|') ? DREAMS[+id.slice(2)].cls : id.startsWith('x|') ? ARTIFACTS[+id.slice(2)].cls : id.startsWith('e|') ? id.split('|')[2] : id.split('|')[1];
function rollUpSame(id, r) {
  const d = getDef(id); const pool = POOLS[d.cat]; if (!pool) return null;
  for (let k = r + 1; k < 7; k++) { const cand = pool[k].filter(x => subOfId(x) === d.sub); if (cand.length) return cand[R0.int(cand.length)]; }
  return null;
}
function rollUp(kind, r) { // double or nothing: one rarity higher in same pool
  const pool = poolFor(kind === 'finisher' ? 'galaxy' : kind);
  for (let k = r + 1; k < 7; k++) if (pool[k].length) return pool[k][R0.int(pool[k].length)];
  return null;
}
function poolSize(kind) { return poolFor(kind).reduce((a, b) => a + b.length, 0); }
function poolOwned(kind) { return poolFor(kind).reduce((a, b) => a + b.filter(owned).length, 0); }
function crateKinds() {
  const k = ['weapon', 'gadget', 'pet', 'armor', 'ship', 'mining', 'skin', 'cosmetic', 'backdrop', 'galaxy'];
  for (const p in S.planet.visited) k.push('salvage:' + p);
  for (const b in S.planet.bosses) k.push('boss:' + b);
  for (const pg of PAGES) if (finisherOk(pg)) k.push('finisher:' + pg.id);
  return k;
}

// ---------- xp / titles / miners ----------
const xpNeed = L => Math.floor(80 * Math.pow(1.22, L - 1));
function addXP(n) { S.xp += n; let up = 0; while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; S.sp++; up++; } if (up) { toast(`LEVEL ${S.lvl}! +${up} SKILL POINT${up > 1 ? 'S' : ''}`, COL.cyan); SND.play('levelup'); } return up; }
function checkTitles() { for (const t of TITLES) if (!S.titles.earned[t.id] && t.chk(S)) { S.titles.earned[t.id] = 1; toast('TITLE EARNED: ' + t.n, COL.gold); if (!S.titles.eq) S.titles.eq = t.id; dirty(); } }
function minerSlots() { return Object.keys(S.planet.bosses).map(Number).sort((a, b) => a - b).slice(0, 10); }
// idle income is a bonus for coming back, not the main way to earn: a night away pays about 3 to 5 landings' worth in total
const MINER_PAY = 0.06;
function minerRate(id, p) { return aStats(getDef(id), effL(id)).rate * orePrice(planetDef(p).ore[1]) / 5 * MINER_PAY; }
function tickMiners() {
  const now = Date.now(); const mins = Math.min(8 * 60, (now - S.miners.last) / 60000); S.miners.last = now;
  for (const p in S.miners.slots) { const id = S.miners.slots[p]; if (id && owned(id)) S.miners.acc[p] = Math.min((S.miners.acc[p] || 0) + minerRate(id, +p) * mins, minerRate(id, +p) * 480); }
}
function earn(c) { S.coins += c; S.stats.coinsEarned += c; dirty(); }

// ---------- toasts ----------
const TOASTS = [];
function toast(txt, col = COL.ink) { TOASTS.push({ txt, col, t: 0 }); if (TOASTS.length > 4) TOASTS.shift(); }
function drawToasts(dt) {
  if ((typeof HUB !== 'undefined' && HUB.choice && SCENE === 'hub') || (typeof RUN !== 'undefined' && RUN && RUN.choice && SCENE === 'planet')) return;
  let y = H - 50;
  for (let i = TOASTS.length - 1; i >= 0; i--) {
    const t = TOASTS[i]; t.t += dt;
    const a = t.t < 0.2 ? t.t / 0.2 : t.t > 3.2 ? Math.max(0, (3.6 - t.t) / 0.4) : 1;
    const w = textW(t.txt) + 14, x = W / 2 - w / 2 + (1 - Math.min(1, t.t / 0.2)) * 20;
    ctx.globalAlpha = a; panel(x, y, w, 13, { bg: COL.void0, bd: t.col }); text(t.txt, W / 2, y + 3, t.col, FB, 1); ctx.globalAlpha = 1;
    y -= 16;
  }
  for (let i = TOASTS.length - 1; i >= 0; i--) if (TOASTS[i].t > 3.6) TOASTS.splice(i, 1);
}

// ---------- goals (always something to chase) ----------
function goals() {
  const G = [];
  const next = S.planet.reached + 1; const rt = shipRating();
  if (next <= 99) { const req = PLANET_REQ(next); if (rt < req) G.push({ t: `SHIP RATING ${rt}/${req} TO REACH ${planetDef(next).name}`, f: rt / req, c: COL.cyan, go: 'hangar' }); else G.push({ t: `${planetDef(next).name} IS IN RANGE. WARP THERE`, f: 1, c: COL.mint, go: 'map' }); }
  const claim = PAGES.find(pg => pageDone(pg) && !S.pages[pg.id]); if (claim) G.push({ t: `CLAIM REWARD: ${claim.n}`, f: 1, c: COL.magenta, go: 'collection' });
  if (S.sp > 0) G.push({ t: `${S.sp} SKILL POINT${S.sp > 1 ? 'S' : ''} TO SPEND`, f: 1, c: COL.cyan, go: 'profile' });
  for (let p = 1; p <= Math.min(S.planet.reached, 99); p++) if (!S.planet.bosses[p]) { G.push({ t: `BEAT ${planetDef(p).boss[0]} ON ${planetDef(p).name}`, f: 0, c: COL.coral, go: 'map' }); break; }
  const fin = PAGES.find(pg => finisherOk(pg)); if (fin) G.push({ t: `${fin.n}: ${pageOwned(fin)}/${fin.ids.length}. FINISHER CRATE OPEN`, f: pageOwned(fin) / fin.ids.length, c: COL.gold, go: 'crates' });
  let best = null, bf = 0; for (const pg of PAGES) { const o = pageOwned(pg); if (o > 0 && o < pg.ids.length && o / pg.ids.length > bf) { bf = o / pg.ids.length; best = pg; } }
  if (best && best !== fin) G.push({ t: `${best.n} ${pageOwned(best)}/${best.ids.length}`, f: bf, c: COL.magenta, go: 'collection' });
  const w = S.eq.weapon && getDef(S.eq.weapon);
  if (w) { const m = S.mast[w.sub] || { k: 0, c: 0 }; const need = MAST_STEPS[Math.min(m.c, MAST_STEPS.length - 1)]; if (m.k >= need && m.c < MAST_STEPS.length) G.push({ t: `${CLS[w.sub].n} BLUEPRINT READY IN WORKSHOP`, f: 1, c: COL.orange, go: 'workshop' }); else G.push({ t: `${CLS[w.sub].n} MASTERY ${m.k}/${need} KILLS`, f: m.k / need, c: COL.orange, go: 'workshop' }); }
  if (w && w.r <= 2 && !w.evo && w.o.t !== 'art') { const k = S.ikills[w.id] || 0, need = EVO_NEED[w.r]; G.push({ t: k >= need ? 'EVOLVE YOUR WEAPON IN THE WORKSHOP' : `EVOLVE ${w.name}: ${k}/${need}`, f: k / need, c: COL.mint, go: 'workshop' }); }
  const aff = Math.floor(S.coins / crateCost('weapon', 0)); if (aff >= 1) G.push({ t: `YOU CAN AFFORD ${aff} CRATE${aff > 1 ? 'S' : ''}`, f: 1, c: COL.gold, go: 'crates' });
  const ms = minerSlots().filter(p => !S.miners.slots[p]); if (ms.length && Object.keys(S.inv).some(id => id.startsWith('t|miner'))) G.push({ t: 'PLACE AN AUTO-MINER IN THE MINING OFFICE', f: 0, c: COL.mint, go: 'mining' });
  return G;
}

// ---------- selling ----------
// NEW markers: set when an item first arrives, cleared the moment you equip it
const HANGAR_SLOTS = ['engine', 'hull', 'cargo', 'scanner', 'shield', 'skin_ship'];
function freshIn(slot) { const want = slot; let n = 0; for (const id in S.fresh) { if (!S.inv[id]) { delete S.fresh[id]; continue; } if (slotOf(getDef(id)) === want) n++; } return n; }
function freshCount(where) { let n = 0; for (const id in S.fresh) { if (!S.inv[id]) continue; const sl = slotOf(getDef(id)); if (!sl) continue; if ((where === 'hangar') === HANGAR_SLOTS.includes(sl)) n++; } return n; }
function equipped(id) { if (S.fresh[id]) { delete S.fresh[id]; dirty(); } }
function isEquipped(id) { for (const k in S.eq) if (S.eq[k] === id) return true; return false; }
function sellValue(id) { const d = getDef(id); const L = lvl(id) || 1; return Math.round(SELL_VAL[d.r] * (1 + 0.2 * (L - 1)) * (1 + 0.1 * gradeOf(id))); }
function sellItem(id) { if (!S.inv[id] || isEquipped(id)) return 0; const v = sellValue(id); delete S.inv[id]; delete S.fresh[id]; S.stats.sold++; earn(v); return v; }

// ---------- goal chain: one clear next step, a reward, then a slightly bigger one ----------
const bossOf = p => planetDef(p).boss[0], pName = p => planetDef(p).name;
const GOAL_CHAIN = [
  { t: () => 'OPEN YOUR FIRST CRATE', go: 'crates', f: () => [S.stats.crates, 1], rw: 150 },
  { t: () => 'EQUIP SOMETHING NEW IN THE LOCKER', go: 'locker', f: () => [S.stats.equips, 1], rw: 100 },
  { t: () => `LAND ON ${pName(1)}`, go: 'launch', f: () => [S.planet.landings, 1], rw: 150 },
  { t: () => 'MINE 15 ORE IN ONE TRIP', go: 'launch', f: () => [S.stats.maxHaul, 15], rw: 200 },
  { t: () => 'TAKE DOWN A CRATE CARRIER', go: 'launch', f: () => [S.stats.carriers, 1], rw: 'choice' },
  { t: () => 'OPEN 5 MORE CRATES', go: 'crates', rel: 'crates', n: 5, rw: 250 },
  { t: () => 'SEARCH A WRECK ON A PLANET', go: 'launch', f: () => [S.stats.wrecks, 1], rw: 250 },
  { t: () => `BEAT ${bossOf(1)} ON ${pName(1)}`, go: 'launch', f: () => [S.planet.bosses[1] ? 1 : 0, 1], rw: 400 },
  { t: () => 'STAGGER AN ALIEN WHILE A ! FLASHES OVER IT', go: 'launch', f: () => [S.stats.staggers, 1], rw: 250 },
  { t: () => 'PULL OFF A PERFECT DODGE: BOOST THROUGH AN ATTACK', go: 'launch', f: () => [S.stats.perfects, 1], rw: 250 },
  { t: () => 'USE YOUR GADGET 3 TIMES (F OR 2)', go: 'launch', f: () => [Math.min(3, S.stats.kills2 || 0), 3], rw: 200 },
  { t: () => 'COMPLETE A PLANET EVENT. CHECK THE STAR MAP', go: 'launch', f: () => [S.stats.events, 1], rw: 'choice' },
  { t: () => 'SELL AN ITEM YOU DO NOT NEED', go: 'locker', f: () => [S.stats.sold, 1], rw: 150 },
  { t: () => `RAISE YOUR SHIP RATING TO ${PLANET_REQ(2)}`, go: 'hangar', f: () => [shipRating(), PLANET_REQ(2)], rw: 300 },
  { t: () => `REACH ${pName(2)}`, go: 'launch', f: () => [S.planet.reached >= 2 ? 1 : 0, 1], rw: 400 },
  { t: () => 'WIN A DOUBLE OR NOTHING', go: 'crates', f: () => [S.stats.donWins, 1], rw: 300 },
  { t: () => 'GET A X5 COMBO', go: 'launch', f: () => [S.stats.bestCombo, 5], rw: 350 },
  { t: () => `BEAT ${bossOf(2)} ON ${pName(2)}`, go: 'launch', f: () => [S.planet.bosses[2] ? 1 : 0, 1], rw: 'choice' },
  { t: () => 'CLAIM A COLLECTION PAGE REWARD', go: 'collection', f: () => [Object.keys(S.pages).length, 1], rw: 500 },
  { t: () => 'DISCOVER AN ELEMENT REACTION', go: 'collection', f: () => [Object.keys(S.reactions).length, 1], rw: 400 },
  { t: () => 'FIND A DREAM WEAPON', go: 'crates', f: () => [Object.keys(S.inv).filter(isDream).length, 1], rw: 'choice' },
];
const GOAL_TPL = ['reach', 'boss', 'crates', 'ore', 'carriers', 'kills'];
function goalReward(i) { const t = haulTier(Math.max(1, S.planet.reached)); return (i - GOAL_CHAIN.length) % 3 === 2 ? 'choice' : 2 * CRATE_COIN * TIERS[t].cost; }
function startGoal(i) {
  const g = { i, base: 0, done: false };
  if (i < GOAL_CHAIN.length) { const d = GOAL_CHAIN[i]; if (d.rel) g.base = S.stats[d.rel]; }
  else {
    const k = i - GOAL_CHAIN.length, round = Math.floor(k / GOAL_TPL.length); g.tpl = GOAL_TPL[k % GOAL_TPL.length];
    if (g.tpl === 'reach') g.p = Math.min(99, S.planet.reached + 1);
    if (g.tpl === 'boss') { let p = 0; for (let q = 1; q <= S.planet.reached; q++) if (!S.planet.bosses[q]) { p = q; break; } g.p = p || Math.max(1, S.planet.reached); g.need = S.planet.bosses[g.p] ? (S.planet.bosses[g.p] + 1) : 1; }
    if (g.tpl === 'crates') { g.base = S.stats.crates; g.need = 6 + round * 4; }
    if (g.tpl === 'ore') { g.base = S.stats.ore; g.need = 50 + round * 25; }
    if (g.tpl === 'carriers') { g.base = S.stats.carriers; g.need = 2 + round; }
    if (g.tpl === 'kills') { g.base = S.stats.kills; g.need = 60 + round * 30; }
    g.rw = goalReward(i);
  }
  S.goal = g; dirty();
}
function goalInfo() {
  if (!S.goal || typeof S.goal.i !== 'number') startGoal(0);
  const g = S.goal;
  if (g.i < GOAL_CHAIN.length) { const d = GOAL_CHAIN[g.i]; const [cur, need] = d.rel ? [S.stats[d.rel] - g.base, d.n] : d.f(); return { t: d.t(), cur, need, go: d.go, rw: d.rw }; }
  switch (g.tpl) {
    case 'reach': { const req = PLANET_REQ(g.p); return { t: `REACH ${pName(g.p)}`, cur: S.planet.reached >= g.p ? 1 : 0, need: 1, go: shipRating() >= req ? 'launch' : 'hangar', rw: g.rw, sub: shipRating() >= req ? 'IT IS IN RANGE. WARP THERE' : `SHIP RATING ${shipRating()}/${req}. UPGRADE SHIP PARTS` }; }
    case 'boss': return { t: `BEAT ${bossOf(g.p)} ON ${pName(g.p)}${g.need > 1 ? ' AGAIN' : ''}`, cur: Math.min(1, (S.planet.bosses[g.p] || 0) >= g.need ? 1 : 0), need: 1, go: 'launch', rw: g.rw };
    case 'crates': return { t: `OPEN ${g.need} MORE CRATES`, cur: S.stats.crates - g.base, need: g.need, go: 'crates', rw: g.rw };
    case 'ore': return { t: `MINE ${g.need} ORE`, cur: S.stats.ore - g.base, need: g.need, go: 'launch', rw: g.rw };
    case 'carriers': return { t: `TAKE DOWN ${g.need} CRATE CARRIERS`, cur: S.stats.carriers - g.base, need: g.need, go: 'launch', rw: g.rw };
    case 'kills': return { t: `DEFEAT ${g.need} ALIENS`, cur: S.stats.kills - g.base, need: g.need, go: 'launch', rw: g.rw };
  }
  startGoal(g.i + 1); return goalInfo();
}
function checkGoal() {
  if (!S || !S.goal || S.goal.done) return; const G = goalInfo();
  if (G.cur >= G.need) { S.goal.done = true; dirty(); SND.play('fanfare'); toast('GOAL DONE: ' + G.t, COL.gold); if (typeof RUN !== 'undefined' && RUN && SCENE === 'planet') banner('GOAL DONE! CLAIM YOUR REWARD AT THE STATION', COL.gold); }
}
function claimGoal() {
  const G = goalInfo(); if (!S.goal.done) return;
  if (G.rw === 'choice') { S.choiceQueue.push({ tier: haulTier(Math.max(1, S.planet.reached)), title: 'GOAL REWARD' }); }
  else { earn(G.rw); SND.play('coin'); }
  SND.play('win'); S.stats.goals = (S.stats.goals || 0) + 1; HUB.flashT = 1.5; HUB.flashCol = COL.gold;
  startGoal(S.goal.i + 1); save();
}

// ---------- daily contracts ----------
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function ownedWeaponIds() { return Object.keys(S.inv).filter(id => getDef(id).cat === 'w'); }
function ensureContracts() {
  const day = todayKey(); if (S.contracts && S.contracts.day === day) return S.contracts;
  const R = RNG(hashStr(day + ':' + S.created)); const pool = CONTRACT_TPL.slice(); const list = [];
  const eqCls = S.eq.weapon ? getDef(S.eq.weapon).sub : null;
  const ownedCls = [...new Set(ownedWeaponIds().map(id => getDef(id).sub))].filter(c => c !== eqCls);
  while (list.length < 3 && pool.length) {
    const t = pool.splice(R.int(pool.length), 1)[0];
    if (t.k === 'cls' && !ownedCls.length) continue;
    if (t.k === 'parries' && !ownedWeaponIds().some(id => getDef(id).sub === 'blade')) continue;
    if (t.k === 'kills2' && !S.eq.gadget) continue;
    if (t.k === 'elites' && S.planet.landings < 2) continue;
    const n = t.n[0] + R.int(t.n[1] - t.n[0] + 1); const c = { k: t.k, n, cls: t.k === 'cls' ? R.pick(ownedCls) : null, done: false, claimed: false };
    c.base = t.k === 'cls' ? (S.stats.clsKills[c.cls] || 0) : (S.stats[t.k] || 0);
    list.push(c);
  }
  S.contracts = { day, list }; dirty(); return S.contracts;
}
function contractInfo(c) { const t = CONTRACT_TPL.find(x => x.k === c.k); const cur = (c.k === 'cls' ? (S.stats.clsKills[c.cls] || 0) : (S.stats[c.k] || 0)) - c.base; return { t: t.t(c.n, c.cls), why: t.why, cur: Math.max(0, Math.min(cur, c.n)), need: c.n }; }
function contractReward(i) { return i === 2 ? 'choice' : 3 * CRATE_COIN * TIERS[haulTier(Math.max(1, S.planet.reached))].cost; }
function checkContracts() {
  if (!S.contracts) return;
  S.contracts.list.forEach(c => { if (c.done) return; const I = contractInfo(c); if (I.cur >= I.need) { c.done = true; dirty(); toast('CONTRACT DONE: ' + I.t, COL.lilac); SND.play('win'); if (typeof RUN !== 'undefined' && RUN && SCENE === 'planet') banner('CONTRACT DONE! CLAIM IT AT THE STATION', COL.lilac); } });
}
function claimContract(i) {
  const c = S.contracts && S.contracts.list[i]; if (!c || !c.done || c.claimed) return; c.claimed = true; const rw = contractReward(i);
  if (rw === 'choice') S.choiceQueue.push({ tier: Math.min(7, haulTier(Math.max(1, S.planet.reached)) + 1), title: 'CONTRACT REWARD' }); else { earn(rw); SND.play('coin'); }
  SND.play('win'); HUB.flashT = 1.2; HUB.flashCol = COL.lilac; save();
}

// ---------- why a reward matters ----------
function impactLines(id) {
  const d = getDef(id), out = [], inv = S.inv[id];
  const L = inv ? (inv.p + 1 >= inv.l ? Math.min(10, inv.l + 1) : inv.l) : 1;
  const sl = slotOf(d);
  if (d.dream !== undefined) out.push([`DREAM WEAPON! ${owned(id) ? 'YOURS NOW' : 'ONE OF ' + DREAMS.length + ' HANDCRAFTED LEGENDS'}`, COL.gold]);
  if (d.cat === 's' && SLOTS_SHIP.includes(sl)) {
    const before = shipRating(), saved = S.eq[sl], fake = !S.inv[id]; S.eq[sl] = id; if (fake) S.inv[id] = { l: 1, p: 0 }; const after = shipRating(); S.eq[sl] = saved; if (fake) delete S.inv[id];
    const next = S.planet.reached + 1, req = PLANET_REQ(next);
    if (after > before) out.push(after >= req && before < req ? [`EQUIP IT: PUTS ${planetDef(next).name} IN RANGE!`, COL.gold] : [`+${after - before} SHIP RATING IF EQUIPPED (${after}/${req})`, COL.blueL]);
  }
  if ((d.cat === 'w' || d.cat === 'a' || (d.cat === 't' && d.sub === 'tool')) && sl && S.eq[sl] && S.eq[sl] !== id) {
    const cur = getDef(S.eq[sl]); const a = power(d, effL(id, L, Math.max(gradeOf(id), (typeof OPEN !== 'undefined' && OPEN && OPEN.tier) || 0))), b = power(cur, effL(S.eq[sl])); const pct = Math.round((a / b - 1) * 100);
    if (pct > 0) out.push([`${pct}% STRONGER THAN YOUR EQUIPPED ${SUB_LABEL[cur.sub] || ''}`, COL.mint]);
    else if (d.cat === 'w' && (d.sig || d.quirk || d.el || d.verbs.length)) out.push(['A NEW PLAYSTYLE. TRY IT IN THE TEST RANGE', COL.lilac]);
  }
  if (d.cat === 't' && d.sub === 'tool' && d.tier > loadout().toolTier) out.push([`TIER ${d.tier} TOOL: BETTER ORE AND TIER ${d.tier} CRYSTAL SEALS`, COL.gold]);
  if (d.cat === 's' && d.sub === 'scanner' && d.r >= 2) out.push([d.r >= 4 ? 'SHOWS BURIED CACHES ON THE GROUND' : 'SHOWS BURIED CACHES ON YOUR MINIMAP', COL.blueL]);
  if (d.set !== undefined) { const n = Object.keys(S.inv).filter(x => { const q = getDef(x); return q.set === d.set && q.cat === d.cat; }).length + (inv ? 0 : 1); const ab = d.cat === 'a' ? SET_ABIL[d.set].n : 'THE FLEET BONUS'; out.push([`${SET_NAMES[d.set]} SET ${Math.min(5, n)}/5: ${n >= 3 ? ab + ' READY WHEN WORN' : (3 - n) + ' MORE FOR ' + ab}`, COL.magenta]); }
  for (const pg of (PAGE_OF[id] || [])) { if (S.pages[pg.id]) continue; const o = pageOwned(pg) + (inv ? 0 : 1); out.push(o >= pg.ids.length ? [`COMPLETES ${pg.n}! CLAIM IT IN COLLECTION`, COL.gold] : [`${pg.n} ${o}/${pg.ids.length}`, COL.pink]); break; }
  if (d.cat === 'w' && d.r <= 2 && !d.evo && d.o.t !== 'art' && !d.sig && (S.ikills[id] || 0) >= EVO_NEED[d.r]) out.push(['THIS WEAPON CAN EVOLVE IN THE WORKSHOP', COL.mint]);
  ARTIFACTS.forEach((A, k) => { if (!S.forged[k] && artifactIngredients(k).includes(id)) out.push([`INGREDIENT FOR ${A.n}`, COL.gold]); });
  if (inv && inv.l < 10 && inv.p + 1 >= inv.l) out.push([`LEVEL ${inv.l + 1}: STRONGER`, COL.cyan]);
  return out.slice(0, 3);
}
// ---------- tracking a build ----------
function trackOptionsFor(id) {
  const d = getDef(id), o = [];
  if (d.dream !== undefined && !owned(id)) o.push({ k: 'dream', dk: d.dream, n: d.name });
  if (d.set !== undefined && d.cat === 'a') o.push({ k: 'set', s: d.set, n: SET_NAMES[d.set] + ' SUIT' });
  const pg = (PAGE_OF[id] || []).find(p => !S.pages[p.id]); if (pg) o.push({ k: 'page', pg: pg.id, n: pg.n });
  if (d.cat === 'w' && d.r <= 2 && !d.evo && !d.sig && d.o.t !== 'art' && !owned('e|' + id)) o.push({ k: 'evo', id, n: 'EVOLVE ' + CLS[d.sub].n });
  return o;
}
function trackInfo() {
  const T = S.track; if (!T) return null;
  if (T.k === 'page') { const pg = PAGES.find(p => p.id === T.pg); if (!pg || S.pages[pg.id]) return null; return { t: pg.n, cur: pageOwned(pg), need: pg.ids.length, go: 'collection' }; }
  if (T.k === 'set') { const n = ['helmet', 'chest', 'boots', 'jetpack', 'o2'].filter(p => owned(`a|${p}|${280 + T.s}`)).length; return { t: `${SET_NAMES[T.s]} SUIT: ${SET_ABIL[T.s].n}`, cur: n, need: 5, go: 'collection' }; }
  if (T.k === 'evo') { const d = getDef(T.id); if (owned('e|' + T.id)) return null; return { t: `EVOLVE ${d.name}`, cur: Math.min(S.ikills[T.id] || 0, EVO_NEED[d.r]), need: EVO_NEED[d.r], go: 'workshop' }; }
  if (T.k === 'dream') { if (owned('u|' + T.dk)) return null; return { t: `HUNT ${DREAMS[T.dk].n}`, cur: 0, need: 1, go: 'crates', sub: 'WEAPON OR GALAXY CRATES' }; }
  return null;
}
function setTrack(o) { S.track = o; dirty(); toast('TRACKING: ' + o.n, COL.pink); SND.play('click'); }
