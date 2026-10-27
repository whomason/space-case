// ===== ITEMS: catalog, definitions, stats, sprites, drawing, collections =====
const AR = [1, 1.35, 1.8, 2.5, 3.5, 5, 7.2];
const ALLOWED_VERBS = {
  beam: ['bounce', 'split', 'chain', 'pull', 'detonate', 'pierce'], railgun: ['split', 'chain', 'detonate', 'pull', 'stick', 'bounce'],
  mine: ['split', 'chain', 'pull', 'home', 'detonate', 'burrow'], drone: ['bounce', 'split', 'pierce', 'home', 'spiral', 'burrow', 'stick', 'detonate', 'chain', 'pull'],
};
const PERKS = {
  helmet: ['crit', 'scan'], chest: ['thorns', 'regen'], boots: ['sprint', 'sparks'], jetpack: ['blastoff', 'double'], o2: ['overflow', 'reserve'], tool: ['magnet', 'tdouble', 'tchain'],
};
const PERK_TXT = {
  crit: '+8% CRITICAL HIT CHANCE', scan: 'SHOWS ALL ORE ON THE MINIMAP', thorns: 'ALIENS THAT TOUCH YOU TAKE DAMAGE', regen: 'SLOWLY HEALS YOU', sprint: 'SPEED BURST AFTER EACH KILL',
  sparks: 'YOUR STEPS ZAP NEARBY ALIENS', blastoff: 'BOOSTING THROUGH ALIENS HURTS THEM', double: 'TWO BOOST CHARGES', overflow: 'ORE PICKUPS REFILL A LITTLE O2', reserve: 'ONCE PER LANDING, REFILLS 30% O2 WHEN EMPTY',
  magnet: 'PULLS ORE FROM FAR AWAY', tdouble: '20% CHANCE OF DOUBLE ORE', tchain: 'EXTRACTING ALSO HITS NEARBY DEPOSITS',
};
function catSize(cat, sub) { const c = CATS[cat]; return typeof c.size === 'object' ? c.size[sub] : c.size; }
function catPP(cat, sub) { const c = CATS[cat]; return typeof c.pp === 'object' ? c.pp[sub] : c.pp; }
function parseId(id) {
  if (id.startsWith('e|')) return { evo: true, base: id.slice(2) };
  if (id.startsWith('x|')) return { art: true, k: +id.slice(2) };
  if (id.startsWith('u|')) return { dream: true, k: +id.slice(2) };
  const [cat, sub, n] = id.split('|'); return { cat, sub, n: +n };
}
function originOf(cat, sub, n) {
  if (n >= 6000 && n < 7000 && 'ckbwgp'.includes(cat) && PREM[n]) return { t: 'prem', k: n };
  if (n >= 3000) return { t: 'nova', p: n - 3000 };
  if (n >= 2000) return { t: 'mastery', p: n - 2000 };
  if (cat === 't' && sub === 'tool' && n >= 4000) return { t: 'boss', p: Math.floor((n - 4000) / 10) };
  if (n >= 1000 && !(cat === 't' && sub === 'tool' && n < 1200)) return { t: 'boss', p: Math.floor((n - 1000) / 10) };
  if (cat === 'a' && n >= 280 && n < 292) return { t: 'set', s: n - 280 };
  if (cat === 's' && n >= 180 && n < 192) return { t: 'set', s: n - 180 };
  const size = catSize(cat, sub), pp = catPP(cat, sub);
  if (pp && n >= size - 20 * pp) return { t: 'planet', p: Math.floor((n - (size - 20 * pp)) / pp) + 1 };
  return { t: 'gen' };
}
function wpickR(seed, dist) { let s = 0; for (const d of dist) s += d; let v = (seed % 100000) / 100000 * s; for (let i = 0; i < dist.length; i++) { v -= dist[i]; if (v < 0) return i; } return dist.length - 1; }
function rarityOf(cat, sub, n) {
  const o = originOf(cat, sub, n);
  if (o.t === 'set') return SET_RAR[o.s];
  if (o.t === 'mastery') return 4; if (o.t === 'nova') return 5; if (o.t === 'prem') return PREM[n] ? PREM[n][7] : 4;
  const h = hashStr('r' + cat + sub + n);
  return wpickR(h, o.t === 'boss' ? RAR_BOSS_DIST : RAR_DIST);
}

const DEFS = new Map();
function getDef(id) {
  let d = DEFS.get(id); if (d) return d;
  d = buildDef(id); if (d.quirk === undefined) d.quirk = quirkOf(d); DEFS.set(id, d); return d;
}
function pickPal(R, r) {
  const cand = PALS.filter(p => r <= 1 ? p[4] <= 1 : r >= 4 ? p[4] >= 1 : true);
  const lowFirst = r <= 1 && R.chance(0.6) ? PALS.filter(p => p[4] === 0) : cand;
  return R.pick(lowFirst);
}
function buildDef(id) {
  const pi = parseId(id);
  if (pi.evo) return buildEvo(id, pi.base);
  if (pi.art) return buildArtifact(id, pi.k);
  if (pi.dream) return buildDream(id, pi.k);
  const { cat, sub, n } = pi;
  const R = RNG(hashStr(id));
  const r = rarityOf(cat, sub, n), o = originOf(cat, sub, n);
  const d = { id, cat, sub, n, r, o, q: R.range(0.93, 1.07), verbs: [], el: null, perk: null, seed: hashStr(id + 'spr') };
  // palette
  let pal = pickPal(R, r), ph = pal[1], ps = pal[2], pl = pal[3], pname = pal[0];
  if (o.t === 'planet' || o.t === 'mastery') { const P = planetDef(o.p); const useOre = R.chance(0.5) && P.ore[2] >= 0; const c = useOre ? [P.ore[2], P.ore[3], P.ore[4]] : P.g; ph = c[0] + R.ir(-10, 10); ps = clamp(c[1] + 0.15, 0.25, 0.95); pl = clamp(c[2], 0.3, 0.72); pname = P.name; }
  if (o.t === 'boss') { const P = planetDef(o.p); const c = P.boss[2]; ph = c[0] + R.ir(-8, 8); ps = clamp(c[1], 0.3, 0.95); pl = clamp(c[2], 0.3, 0.65); pname = P.boss[0]; }
  if (o.t === 'set') { ph = SET_HUE[o.s] < 0 ? 0 : SET_HUE[o.s]; ps = 0.7; pl = 0.5; pname = SET_NAMES[o.s]; d.set = o.s; }
  if (o.t === 'nova') { ph = 280 + o.p * 37; ps = 0.9; pl = 0.55; pname = 'SUPERNOVA'; }
  d.ph = ph; d.ps = ps; d.pl = pl; d.pname = pname;
  d.h2 = ph + R.pick([25, 35, 160, 180, 200, -30]);
  d.metal = r === 4 ? 'gold' : r === 5 ? R.pick(['chrome', 'black', 'gold']) : r === 6 ? 'pearl' : R.pick(['steel', 'steel', 'bronze', 'chrome']);
  d.gh = r >= 2 && R.chance(0.5) ? RAR[r].h : ph + R.pick([0, 180, 140, -140]);
  if (cat === 'w') {
    const allowed = ALLOWED_VERBS[sub] || VERBS;
    const vch = [0.55, 0.8, 1, 1, 1, 1, 1][r];
    if (R() < vch || o.t === 'boss') {
      const nV = r <= 2 ? 1 : r === 3 ? (R.chance(0.25) ? 2 : 1) : r === 4 ? R.ir(1, 2) : r === 5 ? 2 : R.ir(2, 3);
      let pool = (r === 0 && R.chance(0.75) ? VERB_LOW : VERBS).filter(v => allowed.includes(v)); if (!pool.length) pool = allowed;
      const lv = () => [1, 1, R.ir(1, 2), 2, R.ir(2, 3), 3, R.ir(3, 4)][r];
      const used = new Set();
      if (o.t === 'boss') { const pats = planetDef(o.p).boss[1]; const gear = PATTERN_GEAR[pats[(n % 10) % pats.length]]; const v = (gear.find(g => g[0] === sub) || gear[0])[1]; if (allowed.includes(v)) { d.verbs.push([v, lv()]); used.add(v); } }
      while (d.verbs.length < nV) { const v = R.pick(pool); if (!used.has(v)) { used.add(v); d.verbs.push([v, lv()]); } if (used.size >= pool.length) break; }
    }
    const ech = [0, 0, 0, 0.35, 0.7, 1, 1][r];
    if (R() < ech) { const e = R.pick(ELEMS); d.el = [e, [0, 0, 0, 0.4, 0.7, 1, 1.4][r]]; d.gh = ELEM_INFO[e].h; }
    const C = CLS[sub];
    let pre;
    if (o.t === 'planet' || o.t === 'boss' || o.t === 'set') pre = pname;
    else if (d.verbs.length && R.chance(0.65)) pre = R.pick(VERB_INFO[d.verbs[0][0]].pre);
    else pre = r <= 1 ? R.pick(PREFIX_LOW.concat([pname])) : r <= 3 ? R.pick(PREFIX_MID.concat([pname])) : R.pick(PREFIX_HIGH.concat([pname]));
    let nm = pre + ' ' + R.pick(C.bases);
    if (r >= 3 && (d.el || R.chance(0.5))) nm += ' ' + (d.el ? ELEM_INFO[d.el[0]].suf : R.pick(SUFFIX_HIGH));
    d.name = nm; d.w = 32; d.h = 16;
  } else if (cat === 'a' || cat === 's' || cat === 't') {
    const pk = PERKS[sub];
    if (pk) { const ch = [0, 0.1, 0.25, 0.6, 1, 1, 1][r]; if (R() < ch) d.perk = R.pick(pk); }
    const nm = SLOT_NAMES[sub];
    const pre = (o.t === 'gen') ? (r <= 1 ? R.pick(PREFIX_LOW.concat([pname, pname])) : r <= 3 ? R.pick(PREFIX_MID.concat([pname, pname])) : R.pick(PREFIX_HIGH.concat([pname]))) : pname;
    d.name = pre + ' ' + R.pick(nm) + (r >= 4 && o.t === 'gen' && R.chance(0.4) ? ' ' + R.pick(SUFFIX_HIGH) : '');
    if (o.t === 'set') d.name = pname + ' ' + nm[0];
    if (sub === 'tool') d.tier = clamp([1, 3, 5, 7, 9, 11, 12][r] + (n % 2 && r < 6 ? 1 : 0), 1, 12);
    d.w = 16; d.h = 16;
  } else if (cat === 'k') {
    const pat = r <= 1 ? R.pick(['SOLID', 'STRIPE', 'CHECKER', 'DOTS', 'CAMO', 'FADE']) : r <= 3 ? R.pick(['CAMO', 'TIGER', 'SCALES', 'CARBON', 'ZEBRA', 'STRIPE', 'CIRCUIT', 'FADE', 'PIXEL']) : R.pick(['GALAXY', 'HOLO', 'GILDED', 'FLAME', 'CIRCUIT', 'PIXEL', 'TIGER']);
    d.pat = pat; d.name = pname + ' ' + pat; d.w = SKIN_REF[sub][2]; d.h = SKIN_REF[sub][3];
    if (r >= 4) d.metal = 'gold';
  } else if (cat === 'c') {
    const styles = COS_STYLES[sub]; d.style = styles[(n * 7 + (hashStr(sub) % 5)) % styles.length];
    if (o.t === 'mastery' || o.t === 'nova' || o.t === 'boss') d.style = styles[R.int(styles.length)];
    d.name = pname + ' ' + d.style; d.w = 16; d.h = 16;
  } else if (cat === 'g') {
    d.name = (r <= 1 ? R.pick(PREFIX_LOW.concat([pname])) : r <= 3 ? R.pick(PREFIX_MID.concat([pname])) : R.pick(PREFIX_HIGH.concat([pname]))) + ' ' + GADGETS[sub].n + (r >= 4 && R.chance(0.5) ? ' ' + R.pick(SUFFIX_HIGH) : '');
    d.w = 16; d.h = 16;
  } else if (cat === 'p') {
    d.name = pname + ' ' + PETS[sub].n; d.w = 16; d.h = 16;
  } else if (cat === 'b') {
    const WOW = ['GALAXY', 'BLACK HOLE', 'STARGATE', 'AURORA', 'RINGED GIANT'];
    d.style = r >= 4 ? R.pick(WOW) : BD_STYLES[(n * 5 + Math.floor(n / 12)) % BD_STYLES.length];
    d.name = pname + ' ' + d.style; d.w = 24; d.h = 14;
  }
  if (o.t === 'prem') premDef(d, n);
  return d;
}
function buildEvo(id, base) {
  const b = getDef(base); const d = Object.assign({}, b);
  d.id = id; d.base = base; d.r = Math.min(5, b.r + 2); d.o = { t: 'evo' };
  const R = RNG(hashStr(id)); const allowed = (ALLOWED_VERBS[b.sub] || VERBS).filter(v => !b.verbs.some(x => x[0] === v));
  d.verbs = b.verbs.map(v => [v[0], v[1] + 1]); if (allowed.length) d.verbs.push([R.pick(allowed), 2]);
  if (!d.el) d.el = [R.pick(ELEMS), 0.6];
  d.name = 'EVOLVED ' + b.name.split(' ').slice(-1)[0] + ' ' + R.pick(['ASCENDANT', 'PRIME', 'OVERDRIVE', 'APEX', 'REBORN']);
  d.metal = 'gold'; d.gh = ELEM_INFO[d.el[0]].h; d.seed = b.seed; d.evo = true;
  return d;
}
function buildArtifact(id, k) {
  const A = ARTIFACTS[k];
  return { id, cat: 'w', sub: A.cls, n: 5000 + k, r: 6, o: { t: 'art' }, q: 1.1, verbs: A.verbs.map(v => v.slice()), el: [A.el, 1.6], name: A.n, lore: A.txt, ph: ELEM_INFO[A.el].h, ps: 0.9, pl: 0.5, h2: ELEM_INFO[A.el].h + 180, metal: 'pearl', gh: ELEM_INFO[A.el].h, seed: hashStr(id + 'art'), w: 32, h: 16, pname: 'ARTIFACT' };
}

// ---------- stats ----------
const lvMul = (L, k = 0.08) => 1 + k * (L - 1);
function power(d, L = 1) { return Math.round(RAR_POWER[d.r] * d.q * lvMul(L) * 10); }
function wStats(d, L = 1) {
  const C = CLS[d.sub]; const m = RAR_WDMG[d.r] * d.q * lvMul(L, 0.12);
  const v = {}; for (const [k, l] of d.verbs) v[k] = l;
  return { cls: d.sub, dmg: C.dmg * m, rate: C.rate * (1 + 0.04 * d.r), spd: C.spd || 0, rng: (C.rng || 0) * (1 + 0.03 * d.r), spread: C.spread || 0, pellets: C.pellets || 1, pierce: C.pierce || 0, aoe: C.aoe || 0, v, el: d.el, r: d.r, sig: d.sig || null, quirk: d.quirk || null };
}
function aStats(d, L = 1) {
  const a = AR[d.r] * d.q, lv = lvMul(L, 0.1);
  switch (d.sub) {
    case 'helmet': return { hp: 20 * a * lv, light: 62 + 13 * d.r + 2 * L };
    case 'chest': return { hp: 40 * a * lv, armor: Math.min(0.55, 0.04 * d.r + 0.008 * L) };
    case 'boots': return { spd: 1 + 0.045 * d.r * d.q + 0.008 * L };
    case 'jetpack': return { cd: Math.max(0.55, 2.3 - 0.22 * d.r - 0.03 * L), boost: 1 + 0.08 * d.r };
    case 'o2': return { o2: (110 + 25 * d.r * d.q) * lvMul(L, 0.05) };
    case 'engine': return { rating: power(d, L) * 2 };
    case 'hull': return { hp: 0.05 * d.r + 0.01 * L, rating: power(d, L) };
    case 'cargo': return { cargo: Math.round(30 + 18 * d.r * d.q + 4 * (L - 1)), rating: power(d, L) };
    case 'scanner': return { scan: 120 + 40 * d.r + 8 * L, rating: power(d, L) };
    case 'shield': return { shield: Math.min(0.8, 0.1 * d.r + 0.02 * L), rating: power(d, L) };
    case 'tool': return { tier: d.tier, speed: (1 + 0.18 * d.r) * d.q * lvMul(L, 0.1) };
    case 'miner': return { rate: 18 * a * lvMul(L, 0.1) };
  }
  return {};
}
// headline + stat lines for cards
function itemHeadline(d) {
  if (d.cat === 'w') {
    if (d.sig) return d.lore;
    if (d.verbs.length) return VERB_INFO[d.verbs[0][0]].txt(d.verbs[0][1]);
    if (d.el) return (d.el[1] < 0.6 ? 'FAINT ' : '') + ELEM_INFO[d.el[0]].txt;
    return CLS[d.sub].base;
  }
  if (d.perk) return PERK_TXT[d.perk];
  if (d.cat === 'k') return `${d.pat} PATTERN FOR YOUR ${d.sub === 'tool' ? 'MINING TOOL' : d.sub.toUpperCase()}`;
  if (d.cat === 'b') return 'A NEW BACKGROUND FOR YOUR STATION MENUS';
  if (d.cat === 'g') return GADGETS[d.sub].txt + '. PRESS F OR 2';
  if (d.cat === 'p') return PETS[d.sub].txt;
  if (d.cat === 'c') return { eyewear: 'WEAR IT OVER YOUR VISOR', headgear: 'SITS ON TOP OF YOUR HELMET', back: 'WORN ON YOUR BACK', trail: 'LEAVES A TRAIL AS YOU MOVE', killfx: 'PLAYS WHEN ALIENS DIE' }[d.sub];
  const s = aStats(d, 1);
  switch (d.sub) {
    case 'tool': return `BREAKS ORE UP TO TIER ${d.tier}`; case 'miner': return 'MINES COINS WHILE YOU ARE AWAY';
    case 'cargo': return `CARRIES ${s.cargo} ORE PER LANDING`; case 'engine': return 'COUNTS DOUBLE TOWARD SHIP RATING';
    case 'o2': return `${Math.round(s.o2)} SECONDS OF OXYGEN`; case 'jetpack': return 'BOOSTS YOU FORWARD';
    case 'scanner': return 'SHOWS ORE AND WRECKS ON YOUR MINIMAP'; case 'shield': return 'CUTS PLANET HAZARDS';
    case 'hull': return 'TOUGHER SUIT ON PLANETS'; case 'helmet': return 'MORE HEALTH AND A BRIGHTER LIGHT';
    case 'chest': return 'HEALTH AND DAMAGE RESISTANCE'; case 'boots': return 'MOVE FASTER';
  }
  return '';
}
function itemExtraLines(d) {
  const out = [];
  if (d.cat === 'w') { (d.sig ? d.verbs : d.verbs.slice(1)).forEach(v => out.push(VERB_INFO[v[0]].txt(v[1]))); if (d.el && (d.verbs.length || d.sig)) out.push((d.el[1] < 0.6 ? 'FAINT ' : '') + ELEM_INFO[d.el[0]].txt); if (d.quirk) out.push(`QUIRK ${QUIRKS[d.quirk].n}: ${QUIRKS[d.quirk].txt}`); if (TECH[d.sub]) out.push('TECHNIQUE: ' + TECH[d.sub]); }
  else if (d.perk && d.cat !== 'k') { const h = itemHeadline(Object.assign({}, d, { perk: null })); if (h) out.push(h); }
  if (d.set !== undefined && d.cat === 'a') out.push(`SET ABILITY ${SET_ABIL[d.set].n}: ${SET_ABIL[d.set].txt}`);
  if (d.lore && !d.sig) out.push(d.lore);
  return out;
}
function statLines(d, L = 1) {
  if (d.cat === 'w') {
    const s = wStats(d, L); const dps = d.sub === 'beam' ? s.dmg : s.dmg * s.rate * (s.pellets || 1) * (d.sub === 'drone' ? 1 + Math.floor(d.r / 2) : 1);
    return [['DAMAGE', fmt(s.dmg * (d.sub === 'shotgun' ? s.pellets : 1))], ['FIRE RATE', d.sub === 'beam' ? 'HOLD' : s.rate.toFixed(1) + '/S'], ['DPS', fmt(dps)], ['RANGE', Math.round(s.rng)]];
  }
  if (d.cat === 'k') return [['PATTERN', d.pat], ['FOR', d.sub === 'tool' ? 'MINING TOOL' : d.sub.toUpperCase()]];
  if (d.cat === 'c') return [['STYLE', d.style], ['LEVEL FX', L >= 10 ? 'ANIMATED' : L >= 6 ? 'PARTICLES' : L >= 3 ? 'GLOW' : 'LV 3']];
  if (d.cat === 'g') return gadgetStatLines(d, L);
  if (d.cat === 'p') return petStatLines(d, L);
  if (d.cat === 'b') return [['SCENE', d.style], ['MOTION', ['STILL', 'STILL', 'STILL', 'TWINKLES', 'SHOOTING STARS', 'PULSING GLOW', 'PRISM SHIMMER'][d.r]]];
  const s = aStats(d, L);
  switch (d.sub) {
    case 'helmet': return [['HEALTH', '+' + fmt(s.hp)], ['LIGHT', Math.round(s.light)]];
    case 'chest': return [['HEALTH', '+' + fmt(s.hp)], ['RESIST', Math.round(s.armor * 100) + '%']];
    case 'boots': return [['SPEED', 'X' + s.spd.toFixed(2)]];
    case 'jetpack': return [['RECHARGE', s.cd.toFixed(1) + 'S'], ['BOOST', 'X' + s.boost.toFixed(1)]];
    case 'o2': return [['OXYGEN', Math.round(s.o2) + 'S']];
    case 'engine': return [['RATING', '+' + s.rating]];
    case 'hull': return [['RATING', '+' + s.rating], ['SUIT HP', '+' + Math.round(s.hp * 100) + '%']];
    case 'cargo': return [['RATING', '+' + s.rating], ['CARGO', s.cargo]];
    case 'scanner': return [['RATING', '+' + s.rating], ['RANGE', s.scan]];
    case 'shield': return [['RATING', '+' + s.rating], ['HAZARD', '-' + Math.round(s.shield * 100) + '%']];
    case 'tool': return [['ORE TIER', s.tier], ['SPEED', 'X' + s.speed.toFixed(2)]];
    case 'miner': { const p = typeof S !== 'undefined' && S && S.planet ? Math.max(1, S.planet.reached) : 1; return [['COINS', Math.max(1, Math.round(s.rate * MINER_PAY * orePrice(planetDef(p).ore[1]) / 5)) + '/MIN ON ' + planetDef(p).name]]; }
  }
  return [['POWER', power(d, L)]];
}

// ---------- sprites for items ----------
const SPR = new Map();
function itemPal(d, frame = 0) {
  let h = d.ph, gh = d.gh, h2 = d.h2;
  if (d.r === 6 && !d.noCycle) { h += frame * 45; gh += frame * 45; h2 += frame * 45; }
  return makePal(h, d.ps * rarityTone(d), d.pl, { h2, gh, A: METALS[d.metal](), dh: h });
}
function buildItemGrid(d, f = 0) {
  const R = RNG(d.seed); const PA = premArt(d);
  if (PA && PA.grid) { const g = new Spr(d.w, d.h); PA.grid(g, f); return g.fin(); }
  if (d.cat === 'w') { const g = new Spr(32, 16); const b = WGEN[d.sub](g, d.r, R); rarityParts(g, d.sub, d.r, R, b, f); return g.fin(); }
  if (d.cat === 'a' || d.cat === 's' || d.cat === 't') { const g = new Spr(16, 16); AGEN[d.sub](g, d.r, R); armorParts(g, d.sub, d.r, f); return g.fin(); }
  if (d.cat === 'k') { const ref = SKIN_REF[d.sub]; const g = new Spr(ref[2], ref[3]); const RR = RNG(7); if (ref[0] === 'w') WGEN.blaster(g, 2, RR); else AGEN[ref[1]](g, 2, RR); return g.fin(); }
  if (d.cat === 'c') { const g = new Spr(16, 16); CGEN[d.sub](g, d.style, R); return g.fin(); }
  if (d.cat === 'g') { const g = new Spr(16, 16); GGEN[d.sub](g, d.r, R); return g.fin(); }
  if (d.cat === 'p') { const g = new Spr(16, 16); petBody(g, d.sub, 0); return g.fin(); }
}
function sprFrames(d) { const PA = premArt(d); if (PA && PA.frames) return PA.frames; return (d.r === 6 || d.pat === 'HOLO' || d.pat === 'FLAME' || ('wastc'.includes(d.cat) && d.r >= 4) || (d.pat && PC_PAT[d.pat] && PC_PAT[d.pat].anim)) ? 8 : 1; }
function getItemSpr(id) {
  let s = SPR.get(id); if (s) return s;
  const d0 = getDef(id); if (d0.cat === 'b') { s = backdropSpr(d0); SPR.set(id, s); return s; }
  const d = d0; const g = buildItemGrid(d); const nf = sprFrames(d); const geo = gridAnimated(d);
  const frames = [];
  for (let f = 0; f < nf; f++) {
    const pal = itemPal(d, f);
    const pat = d.cat === 'k' ? patternFn(d.pat, d.seed, f / 8) : itemPat(d, f);
    frames.push(renderSpr(geo && f ? buildItemGrid(d, f) : g, pal, pat));
  }
  s = { frames, w: g.w, h: g.h, halo: haloOf(frames[0]), sil: null, edge: null, grid: g };
  s.sil = maskOf(frames[0], '#1e2749');
  s.white = maskOf(frames[0], '#ffffff');
  const pts = []; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.m[y * g.w + x] > 1 && (g.get(x, y - 1) <= 1 || g.get(x + 1, y) <= 1)) pts.push([x, y]);
  s.edge = pts;
  SPR.set(id, s); if (SPR.size > 1800) SPR.delete(SPR.keys().next().value);
  return s;
}
function frameOf(s) { return s.frames.length > 1 ? s.frames[Math.floor(T_NOW * 8) % s.frames.length] : s.frames[0]; }
// skinned rendering of an equipped item (weapon/armor/ship/tool) with a skin item applied
function getSkinnedSpr(id, skinId) {
  if (!skinId) return getItemSpr(id);
  const key = id + '#' + skinId; let s = SPR.get(key); if (s) return s;
  const d = getDef(id), k = getDef(skinId), g = buildItemGrid(d), geo = gridAnimated(d);
  const frames = [];
  const nf = Math.max(sprFrames(d), sprFrames(k));
  for (let f = 0; f < nf; f++) {
    const pal = makePal(k.ph + (k.r === 6 ? f * 45 : 0), k.ps, k.pl, { h2: k.h2, gh: d.gh, A: METALS[k.metal](), dh: k.ph });
    frames.push(renderSpr(geo && f ? buildItemGrid(d, f) : g, pal, patternFn(k.pat, k.seed, f / 8)));
  }
  s = { frames, w: g.w, h: g.h, halo: haloOf(frames[0]), edge: getItemSpr(id).edge, white: maskOf(frames[0], '#fff'), sil: maskOf(frames[0], '#1e2749') };
  SPR.set(key, s); return s;
}

// half-size weapon for the astronaut's hand
const HELD = new Map();
function getHeldSpr(id, skinId) {
  const key = id + '#' + (skinId || ''); let s = HELD.get(key); if (s) return s;
  const d = getDef(id); if (d.cat !== 'w') return skinId ? getSkinnedSpr(id, skinId) : getItemSpr(id);
  const geo = gridAnimated(d); const g = heldGrid(d, 0); const frames = []; const k = skinId ? getDef(skinId) : null;
  const nf = Math.max(sprFrames(d), k ? sprFrames(k) : 1);
  for (let f = 0; f < nf; f++) {
    const pal = k ? makePal(k.ph + (k.r === 6 ? f * 45 : 0), k.ps, k.pl, { h2: k.h2, gh: d.gh, A: METALS[k.metal](), dh: k.ph }) : itemPal(d, f);
    frames.push(renderSpr(geo && f ? heldGrid(d, f) : g, pal, k ? patternFn(k.pat, k.seed, f / 8) : itemPat(d, f)));
  }
  s = { frames, w: g.w, h: g.h }; HELD.set(key, s); if (HELD.size > 200) HELD.delete(HELD.keys().next().value); return s;
}
// draw an item icon with rarity effects. (x,y) top-left
function drawItem(id, x, y, sc = 1, o = {}) {
  const d = getDef(id); const s = o.skin ? getSkinnedSpr(id, o.skin) : getItemSpr(id);
  x = Math.floor(x); y = Math.floor(y);
  if (o.sil) { ctx.drawImage(s.sil, x, y, s.w * sc, s.h * sc); return; }
  const r = d.r;
  if (!o.noFx && r >= 2) {
    const pulse = 0.55 + 0.35 * Math.sin(T_NOW * 3 + x * 0.1);
    ctx.globalAlpha = r >= 4 ? 0.95 : pulse;
    ctx.drawImage(tinted(s.halo, rcol(r)), x - sc, y - sc, s.halo.width * sc, s.halo.height * sc);
    if (r >= 5) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T_NOW * 5); ctx.drawImage(tinted(s.halo, rcol(r)), x - sc * 2, y - sc * 2, (s.halo.width + 2) * sc, (s.halo.height + 2) * sc); }
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(frameOf(s), x, y, s.w * sc, s.h * sc);
  if (o.noFx) return;
  if (r >= 4) { // shine sweep
    const per = 2.6, t = ((T_NOW + (x + y) * 0.003) % per) / per;
    if (t < 0.35) {
      const bx = x + (t / 0.35) * (s.w + s.h) * sc - s.h * sc;
      ctx.save(); ctx.beginPath(); ctx.moveTo(bx, y + s.h * sc); ctx.lineTo(bx + 3 * sc, y + s.h * sc); ctx.lineTo(bx + 3 * sc + s.h * sc, y); ctx.lineTo(bx + s.h * sc, y); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.75; ctx.drawImage(s.white, x, y, s.w * sc, s.h * sc); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  if (r >= 3 && s.edge.length) { // twinkles
    const n = r - 2;
    for (let i = 0; i < n; i++) {
      const ph = (T_NOW * 1.3 + i * 0.37 + (x * 0.013)) % 1; const k = Math.floor((T_NOW * 1.3 + i * 0.37 + x * 0.013)) * 7 + i * 13;
      const p = s.edge[Math.abs(k) % s.edge.length]; const a = Math.sin(ph * Math.PI);
      if (a > 0.2) { const c = r === 6 ? rainbow(T_NOW, i * 90) : '#fff'; const px0 = x + p[0] * sc + (sc >> 1), py0 = y + p[1] * sc + (sc >> 1); ctx.globalAlpha = a; rect(px0, py0 - sc, Math.max(1, sc >> 1), sc * 2 + 1, c); rect(px0 - sc, py0, sc * 2 + 1, Math.max(1, sc >> 1), c); ctx.globalAlpha = 1; }
    }
  }
}
// centered in a box
function drawItemIn(id, bx, by, bw, bh, o = {}) {
  const d = getDef(id); let sc = o.sc || Math.max(1, Math.floor(Math.min((bw - 2) / d.w, (bh - 2) / d.h)));
  if (o.maxSc) sc = Math.min(sc, o.maxSc);
  drawItem(id, bx + (bw - d.w * sc) / 2, by + (bh - d.h * sc) / 2, sc, o);
}

// ---------- catalog & pools ----------
const POOLS = {};
const ALL_BASE = { w: [], a: [], s: [], t: [], k: [], c: [], b: [], g: [], p: [] };
function poolAdd(key, id, r) { (POOLS[key] = POOLS[key] || [[], [], [], [], [], [], []])[r].push(id); }
function buildCatalog() {
  for (const cat in CATS) {
    for (const sub of CATS[cat].subs) {
      const size = catSize(cat, sub);
      for (let n = 0; n < size; n++) {
        const id = `${cat}|${sub}|${n}`; const r = rarityOf(cat, sub, n), o = originOf(cat, sub, n);
        ALL_BASE[cat].push(id);
        poolAdd(cat, id, r); poolAdd('galaxy', id, r);
        if (cat === 'w') poolAdd('class:' + sub, id, r);
        if (o.t === 'planet') poolAdd('salvage:' + o.p, id, r);
      }
    }
  }
  for (let b = 1; b <= 20; b++) for (const id of bossItems(b)) { const d = getDef(id); poolAdd('boss:' + b, id, d.r); ALL_BASE[id[0]].push(id); }
  for (const p of PLANETS) if (p.mastery) { const id = masteryItem(p.i); ALL_BASE.c.push(id); }
  for (let k = 0; k < ARTIFACTS.length; k++) ALL_BASE.w.push('x|' + k);
  for (let k = 0; k < DREAMS.length; k++) { const id = 'u|' + k, D = DREAMS[k]; ALL_BASE.w.push(id); poolAdd('w', id, D.r); poolAdd('galaxy', id, D.r); poolAdd('class:' + D.cls, id, D.r); }
}
function masteryItem(p) { return `c|${['headgear', 'back', 'eyewear', 'trail', 'killfx'][p % 5]}|${2000 + p}`; }
function novaItem(n) { return `c|back|${3000 + n}`; }
function ensureBossPool(b) { if (!POOLS['boss:' + b]) for (const id of bossItems(b)) poolAdd('boss:' + b, id, getDef(id).r); }
function ensureSalvagePool(p) {
  if (POOLS['salvage:' + p]) return;
  const base = ((p - 1) % 20) + 1; // deep planets reuse lines
  POOLS['salvage:' + p] = POOLS['salvage:' + base];
}

// ---------- collection pages ----------
const PAGES = [];
const REWARD_CYCLE = [{ t: 'coins', v: 500 }, { t: 'o2', v: 0.04 }, { t: 'choice', v: 2 }, { t: 'ore', v: 0.04 }, { t: 'combo', v: 0.3 }, { t: 'dmg', v: 0.04 }, { t: 'cargo', v: 0.05 }, { t: 'luck', v: 1 }, { t: 'coins', v: 1200 }, { t: 'choice', v: 4 }];
function REWARD_TXT(rw) {
  switch (rw.t) {
    case 'keys': case 'coins': return `+${fmt(rw.t === 'keys' ? rw.v * 100 : rw.v)} COINS`; case 'o2': return `+${Math.round(rw.v * 100)}% O2 FOREVER`; case 'choice': return `FREE ${TIERS[rw.v].n} CHOICE CRATE`;
    case 'ore': return `+${Math.round(rw.v * 100)}% ORE VALUE FOREVER`; case 'combo': return `+${rw.v}S COMBO TIME FOREVER`; case 'dmg': return `+${Math.round(rw.v * 100)}% DAMAGE FOREVER`;
    case 'cargo': return `+${Math.round(rw.v * 100)}% CARGO FOREVER`; case 'luck': return `+${rw.v} CRATE LUCK FOREVER`;
  }
  return '';
}
function buildPages() {
  let ri = 0; const rw = () => REWARD_CYCLE[ri++ % REWARD_CYCLE.length];
  const weapons = ALL_BASE.w.filter(id => id[0] === 'w' && originOf('w', id.split('|')[1], +id.split('|')[2]).t === 'gen');
  for (const v of VERBS) {
    const ids = []; for (const id of weapons) { const d = getDef(id); if (d.verbs.length && d.verbs[0][0] === v && d.r <= 2) { ids.push(id); if (ids.length >= 5) break; } }
    for (const id of weapons) { const d = getDef(id); if (d.r === 3 && d.verbs.some(x => x[0] === v)) { ids.push(id); break; } }
    if (ids.length >= 4) PAGES.push({ id: 'v:' + v, n: VERB_INFO[v].page, kind: 'VERB', ids, rw: rw(), hint: `WEAPONS THAT ${VERB_INFO[v].n}` });
  }
  for (const c of CLASSES) { const ids = []; for (let n = 0; n < 200 && ids.length < 6; n++) { const id = `w|${c}|${n}`; if (rarityOf('w', c, n) <= 1) ids.push(id); } PAGES.push({ id: 'c:' + c, n: CLS[c].n + ' STARTER', kind: 'CLASS', ids, rw: rw(), hint: `COMMON AND UNCOMMON ${CLS[c].n}S` }); }
  for (let s = 0; s < 12; s++) PAGES.push({ id: 'as:' + s, n: SET_NAMES[s] + ' SUIT', kind: 'ARMOR SET', ids: ['helmet', 'chest', 'boots', 'jetpack', 'o2'].map(p => `a|${p}|${280 + s}`), rw: rw(), set: ['a', s], hint: 'EQUIP 3 OR 5 FOR A SET BONUS' });
  for (let s = 0; s < 12; s++) PAGES.push({ id: 'ss:' + s, n: SET_NAMES[s] + ' FLEET', kind: 'SHIP SET', ids: ['engine', 'hull', 'cargo', 'scanner', 'shield'].map(p => `s|${p}|${180 + s}`), rw: rw(), set: ['s', s], hint: 'EQUIP 3 OR 5 FOR A SET BONUS' });
  for (let p = 1; p <= 20; p++) {
    const pool = POOLS['salvage:' + p]; const flat = [].concat(...pool.slice(0, 4)); const R = RNG(p * 31); R.shuffle(flat);
    const ids = []; const cats = new Set(); for (const id of flat) { if (!cats.has(id[0]) || ids.length > 4) { ids.push(id); cats.add(id[0]); } if (ids.length >= 8) break; }
    PAGES.push({ id: 'p:' + p, n: PLANETS[p - 1].name + ' SALVAGE', kind: 'PLANET', ids, rw: rw(), planet: p, hint: `FROM ${PLANETS[p - 1].name} SALVAGE CRATES` });
  }
  for (const e of ELEMS) { const ids = []; for (const id of weapons) { const d = getDef(id); if (d.el && d.el[0] === e && d.r <= 4) { ids.push(id); if (ids.length >= 6) break; } } PAGES.push({ id: 'e:' + e, n: ELEM_INFO[e].n + ' ARSENAL', kind: 'ELEMENT', ids, rw: rw(), hint: `WEAPONS WITH ${ELEM_INFO[e].n}` }); }
  const cosP = [['eyewear', 'SHADES CLUB'], ['headgear', 'HAT TRICK'], ['back', 'BACK IN STYLE'], ['trail', 'TRAILBLAZER'], ['killfx', 'GRAND FINALE']];
  for (const [sub, nm] of cosP) { const ids = []; for (let n = 0; n < 300 && ids.length < 6; n++) { if (rarityOf('c', sub, n) <= 2) ids.push(`c|${sub}|${n}`); } PAGES.push({ id: 'cs:' + sub, n: nm, kind: 'COSMETIC', ids, rw: rw(), hint: 'FROM COSMETIC CRATES' }); }
  const skinP = [['weapon', 'PAINT SHOP'], ['armor', 'SUIT UP'], ['ship', 'HOT ROD'], ['tool', 'SHINY TOOLS']];
  for (const [sub, nm] of skinP) { const ids = []; for (let n = 0; n < 300 && ids.length < 6; n++) { if (rarityOf('k', sub, n) <= 2) ids.push(`k|${sub}|${n}`); } PAGES.push({ id: 'ks:' + sub, n: nm, kind: 'SKIN', ids, rw: rw(), hint: 'FROM SKIN CRATES' }); }
  { const ids = []; for (let n = 0; n < 400 && ids.length < 6; n++) if (rarityOf('t', 'tool', n) <= 2) ids.push(`t|tool|${n}`); PAGES.push({ id: 'tl', n: 'PROSPECTOR', kind: 'MINING', ids, rw: rw(), hint: 'FROM MINING CRATES' }); }
  for (let b = 1; b <= 20; b++) PAGES.push({ id: 'b:' + b, n: PLANETS[b - 1].boss[0] + ' ARSENAL', kind: 'BOSS', ids: bossItems(b), rw: { t: 'choice', v: Math.min(6, 1 + Math.floor(b / 3)) }, boss: b, hint: `BEAT ${PLANETS[b - 1].boss[0]}, THEN OPEN ITS ARSENAL CRATE` });
  { const ids = GADGET_KEYS.slice(0, 6).map(k => { for (let n = 0; n < 40; n++) if (rarityOf('g', k, n) <= 1) return `g|${k}|${n}`; return `g|${k}|0`; }); PAGES.push({ id: 'gd:starter', n: 'GADGET KIT', kind: 'GADGET', ids, rw: rw(), hint: 'FROM GADGET CRATES' }); }
  { const ids = PET_KEYS.slice(0, 6).map(k => { for (let n = 0; n < 40; n++) if (rarityOf('p', k, n) <= 1) return `p|${k}|${n}`; return `p|${k}|0`; }); PAGES.push({ id: 'pt:pals', n: 'PET PALS', kind: 'PET', ids, rw: rw(), hint: 'FROM PET CRATES' }); }
  const bdP = [['bd:space', 'DEEP SPACE VIEWS', ['NEBULA', 'GALAXY', 'METEOR STORM', 'STARGATE', 'BLACK HOLE', 'RINGED GIANT']], ['bd:world', 'POSTCARDS', ['AURORA', 'SYNTHWAVE', 'TWIN SUNS', 'CRYSTAL FIELD', 'DEEP SEA', 'PIXEL CITY']]];
  for (const [pid, nm, styles] of bdP) { const ids = []; for (const sty of styles) for (let n = 0; n < 300; n++) { const id = `b|backdrop|${n}`; const d = getDef(id); if (d.style === sty && d.r <= 2) { ids.push(id); break; } } PAGES.push({ id: pid, n: nm, kind: 'BACKDROP', ids, rw: rw(), hint: 'FROM BACKDROP CRATES' }); }
}
function whereToFind(id) {
  const d = getDef(id); const o = d.o;
  if (o.t === 'planet') return planetDef(o.p).name + ' SALVAGE CRATE';
  if (o.t === 'boss') return planetDef(o.p).boss[0] + ' ARSENAL CRATE';
  if (o.t === 'mastery') return planetDef(o.p).name + ' MASTERY STARS';
  if (o.t === 'nova') return 'GO SUPERNOVA';
  if (o.t === 'art') return 'FORGE IT IN THE WORKSHOP';
  if (o.t === 'dream') return 'WEAPON OR GALAXY CRATE';
  if (o.t === 'evo') return 'EVOLVE ITS BASE WEAPON';
  if (o.t === 'prem') return PREM_FROM[d.prem] || 'THE STORE';
  const k = { w: 'WEAPON CRATE', a: 'ARMOR CRATE', s: 'SHIP CRATE', t: 'MINING CRATE', k: 'SKIN CRATE', c: 'COSMETIC CRATE', b: 'BACKDROP OR GALAXY CRATE', g: 'GADGET OR GALAXY CRATE', p: 'PET OR GALAXY CRATE' }[d.cat];
  return (o.t === 'set' ? 'SET FINISHER OR ' : '') + k;
}
function roleHint(id) {
  const d = getDef(id);
  let s = SUB_LABEL[d.sub];
  if (d.cat === 'w' && d.verbs.length) s += ', ' + VERB_INFO[d.verbs[0][0]].n;
  if (d.cat === 'w' && d.el) s += ', ' + ELEM_INFO[d.el[0]].n;
  return s;
}
