// ===== DATA: rarities, crates, classes, verbs, planets, sets, names =====
const RAR = [
  { n: 'COMMON', c: '#d6d3e3', h: 250, s: 0.2 },
  { n: 'UNCOMMON', c: '#8fd6ff', h: 200, s: 0.9 },
  { n: 'RARE', c: '#7d74ff', h: 245, s: 0.95 },
  { n: 'EPIC', c: '#c77dff', h: 278, s: 0.9 },
  { n: 'LEGENDARY', c: '#fca311', h: 38, s: 1 },
  { n: 'MYTHIC', c: '#ff5c9a', h: 335, s: 1 },
  { n: 'COSMIC', c: 'RAINBOW', h: 0, s: 1 },
];
const rcol = (r, off = 0) => r === 6 ? rainbow(T_NOW * 1.4, off) : RAR[r].c;
const rrgb = r => r === 6 ? hsl(T_NOW * 168 % 360, 0.9, 0.62) : hexRgb(RAR[r].c);
const RAR_POWER = [10, 13, 17, 22, 29, 38, 50];
const RAR_WDMG = [1, 1.15, 1.32, 1.52, 1.75, 2.0, 2.3]; // rarity mostly buys behaviors, not raw damage
const RAR_DIST = [30, 22, 18, 13, 9, 5, 3];
const RAR_BOSS_DIST = [0, 0, 26, 30, 25, 12, 7];

const TIERS = [
  { n: 'ASTEROID', cost: 1, odds: [72, 20, 6, 1.6, 0.35, 0.045, 0.005], unlock: 1, h: 28, s: 0.35 },
  { n: 'COMET', cost: 2, odds: [62, 25, 9, 3, 0.8, 0.17, 0.03], unlock: 2, h: 195, s: 0.6 },
  { n: 'METEOR', cost: 4, odds: [50, 29, 14, 5, 1.6, 0.34, 0.06], unlock: 4, h: 18, s: 0.9 },
  { n: 'NEBULA', cost: 8, odds: [38, 31, 19, 8.5, 2.8, 0.6, 0.1], unlock: 7, h: 300, s: 0.7 },
  { n: 'PULSAR', cost: 16, odds: [26, 31, 24, 13, 4.8, 1, 0.2], unlock: 10, h: 185, s: 0.9 },
  { n: 'QUASAR', cost: 32, odds: [14, 27, 29, 19, 8, 2.4, 0.6], unlock: 13, h: 48, s: 0.95 },
  { n: 'BLACK HOLE', cost: 64, odds: [5, 18, 30, 27, 13.5, 5, 1.5], unlock: 16, h: 270, s: 0.8 },
  { n: 'SINGULARITY', cost: 128, odds: [0, 8, 24, 33, 21, 10, 4], unlock: 'nova', h: 0, s: 1 },
];
const CRATE_COIN = 100; // coins per tier cost unit (rewards are still counted in this)
const ENEMY_COIN = 1.5; // aliens drop this many times their old coins
// the combo still counts up to X10, but coins grow slower: X4 pays X2, X10 pays X4 (a long fight used to out-earn a full cargo hold several times over)
const comboPay = m => 1 + (m - 1) / 3;
const CRATE_PRICE = 2; // crates cost this many times the unit, so coins buy fewer of them
const UPG_CHANCE = [0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0]; // crate upgrader: chance to bump tier t to t+1
const SELL_VAL = [20, 45, 110, 280, 750, 2200, 7000];
// double or nothing: the rarer the item, the harder it is to double (common 45% ... mythic 1%). Doubling makes it rarer, so stacking gets harder on its own
const DON_BY_R = [45, 30, 18, 9, 4, 1];
// luck makes it up to 50% more likely (it used to add a flat +10%, which made mythic doubles 11x likelier)
function donChance(r = 0) { const v = (DON_BY_R[clamp(r, 0, 5)] || 0) * (1 + S.skills.luck * 0.05); return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10; }

const CLASSES = ['blaster', 'rifle', 'shotgun', 'sniper', 'railgun', 'launcher', 'beam', 'blade', 'throwing', 'mine', 'drone'];
const CLS = {
  blaster: { n: 'BLASTER', dmg: 10, rate: 4, spd: 230, rng: 175, plays: 'FAST, SHORT RANGE ALL-ROUNDER', base: 'RAPID ENERGY SHOTS', bases: ['BLASTER', 'ZAPPER', 'PISTOL', 'POPPER', 'SIDEARM', 'RAYGUN'] },
  rifle: { n: 'RIFLE', dmg: 6.5, rate: 9, spd: 270, rng: 200, spread: 0.08, plays: 'STEADY AUTOMATIC FIRE', base: 'STEADY AUTOMATIC FIRE', bases: ['RIFLE', 'CARBINE', 'AUTORIFLE', 'REPEATER', 'BURSTER'] },
  shotgun: { n: 'SHOTGUN', dmg: 6, rate: 1.5, spd: 250, rng: 115, pellets: 6, spread: 0.55, plays: 'HUGE DAMAGE UP CLOSE', base: 'WIDE BLAST OF PELLETS', bases: ['SHOTGUN', 'SCATTERGUN', 'BLUNDERBUSS', 'SPREADER', 'BOOMSTICK'] },
  sniper: { n: 'SNIPER', dmg: 40, rate: 0.9, spd: 640, rng: 400, pierce: 2, plays: 'SLOW SHOTS THAT PIERCE', base: 'LONG PIERCING SHOT. HOLD RIGHT CLICK TO AIM FAR', bases: ['SNIPER', 'LONGSHOT', 'MARKSMAN', 'DEADEYE', 'FARSIGHT'] },
  railgun: { n: 'RAILGUN', dmg: 60, rate: 0.75, rng: 320, plays: 'CHARGE, THEN HIT A WHOLE LINE', base: 'HOLD TO CHARGE, RELEASE TO RAIL A LINE', bases: ['RAILGUN', 'GAUSS', 'COILGUN', 'DRIVER', 'LANCER'] },
  launcher: { n: 'LAUNCHER', dmg: 30, rate: 0.85, spd: 150, rng: 230, aoe: 28, plays: 'SLOW ROCKETS WITH SPLASH', base: 'EXPLOSIVE ROCKETS', bases: ['LAUNCHER', 'BAZOOKA', 'ROCKETEER', 'MORTAR', 'HOWLER'] },
  beam: { n: 'BEAM', dmg: 26, rate: 12, rng: 118, plays: 'LASER THAT HEATS UP AS YOU HOLD', base: 'CONTINUOUS LASER THAT HEATS UP', bases: ['BEAM', 'LASER', 'RAY', 'EMITTER', 'PROJECTOR'] },
  blade: { n: 'BLADE', dmg: 24, rate: 2.3, rng: 28, plays: 'MELEE SWINGS, HIGH DAMAGE', base: 'SWEEPING MELEE SLASH', bases: ['BLADE', 'SABER', 'CUTLASS', 'KATANA', 'CLEAVER', 'MACHETE'] },
  throwing: { n: 'THROWING', dmg: 15, rate: 2.2, spd: 215, rng: 160, plays: 'HURL STARS, DISCS AND BOOMERANGS', base: 'SPINNING THROWN DISC', bases: ['DISC', 'STAR', 'CHAKRAM', 'BOOMERANG', 'KUNAI'] },
  mine: { n: 'MINE DEPLOYER', dmg: 42, rate: 1.3, rng: 105, aoe: 30, plays: 'MINES THAT ARM AND WAIT', base: 'TOSSES MINES THAT WAIT FOR ALIENS', bases: ['MINELAYER', 'TRAPPER', 'SEEDER', 'DEPLOYER'] },
  drone: { n: 'DRONE CONTROLLER', dmg: 5.5, rate: 2.4, rng: 150, plays: 'DRONES ORBIT AND FIRE ON THEIR OWN', base: 'DRONES ORBIT YOU AND FIRE ON THEIR OWN', bases: ['DRONE RIG', 'SWARM BOX', 'HIVE', 'COMMANDER'] },
};
const VERBS = ['bounce', 'split', 'pierce', 'return', 'home', 'spiral', 'orbit', 'burrow', 'stick', 'detonate', 'chain', 'pull'];
const VERB_LOW = ['bounce', 'split', 'pierce', 'return', 'home', 'spiral'];
const VERB_INFO = {
  bounce: { n: 'BOUNCE', pre: ['RICOCHET', 'BOUNCING', 'REBOUND'], txt: l => `BOUNCES TO ${l} MORE ALIEN${l > 1 ? 'S' : ''}`, page: 'BOUNCERS' },
  split: { n: 'SPLIT', pre: ['SPLITTER', 'SHARD', 'FORKED'], txt: l => `SPLITS INTO ${l + 1} SHARDS ON IMPACT`, page: 'SPLITTERS' },
  pierce: { n: 'PIERCE', pre: ['PIERCING', 'LANCE', 'NEEDLE'], txt: l => `PIERCES THROUGH ${l + 1} ALIENS`, page: 'PIERCERS' },
  return: { n: 'RETURN', pre: ['BOOMERANG', 'HOMEWARD', 'RECALL'], txt: l => l > 1 ? 'FLIES OUT AND COMES BACK, HITTING TWICE' : 'COMES BACK TO YOU', page: 'BOOMERANGS' },
  home: { n: 'HOME', pre: ['SEEKER', 'HUNTER', 'TRACKER'], txt: l => l > 2 ? 'SHOTS HUNT DOWN THE NEAREST ALIEN' : 'SHOTS DRIFT TOWARD ALIENS', page: 'SEEKERS' },
  spiral: { n: 'SPIRAL', pre: ['SPIRAL', 'CORKSCREW', 'TWISTER'], txt: l => 'SHOTS SPIRAL OUTWARD', page: 'SPIRALS' },
  orbit: { n: 'ORBIT', pre: ['ORBITAL', 'HALO', 'SATELLITE'], txt: l => 'SHOTS ORBIT YOU BEFORE LAUNCHING', page: 'ORBITERS' },
  burrow: { n: 'BURROW', pre: ['BURROWING', 'TUNNEL', 'MOLE'], txt: l => 'SHOTS BURROW UNDERGROUND, THEN ERUPT', page: 'BURROWERS' },
  stick: { n: 'STICK', pre: ['STICKY', 'LIMPET', 'LEECH'], txt: l => 'STICKS TO ALIENS, THEN BLOWS UP', page: 'STICKERS' },
  detonate: { n: 'DETONATE', pre: ['VOLATILE', 'BLAST', 'BOOM'], txt: l => l > 2 ? 'BIG EXPLOSION ON IMPACT' : 'EXPLODES ON IMPACT', page: 'DETONATORS' },
  chain: { n: 'CHAIN', pre: ['CHAIN', 'ARC', 'TESLA'], txt: l => `LIGHTNING JUMPS TO ${l + 1} ALIENS`, page: 'CHAINERS' },
  pull: { n: 'PULL', pre: ['GRAVITY', 'MAGNET', 'VORTEX'], txt: l => 'PULLS ALIENS INTO THE IMPACT', page: 'GRAVITY WELLS' },
};
const ELEMS = ['plasma', 'cryo', 'arc', 'void', 'toxin', 'prism'];
const ELEM_INFO = {
  plasma: { n: 'PLASMA', c: '#ff7a2e', h: 22, txt: 'SETS ALIENS ON FIRE', suf: 'OF EMBERS' },
  cryo: { n: 'CRYO', c: '#7fe9ff', h: 190, txt: 'SLOWS, THEN FREEZES ALIENS', suf: 'OF FROST' },
  arc: { n: 'ARC', c: '#fff25a', h: 56, txt: 'ZAPS NEARBY ALIENS', suf: 'OF STORMS' },
  void: { n: 'VOID', c: '#b45cff', h: 275, txt: 'DRAGS ALIENS INWARD', suf: 'OF THE VOID' },
  toxin: { n: 'TOXIN', c: '#8cff3a', h: 95, txt: 'POISON SPREADS WHEN THEY DIE', suf: 'OF BLIGHT' },
  prism: { n: 'PRISM', c: 'RAINBOW', h: 300, txt: 'HITS SPLIT INTO RAINBOW BEAMS', suf: 'OF PRISMS' },
};

// named hue palettes for items
const PALS = [
  ['RUST', 18, .5, .42, 0], ['STEEL', 215, .12, .55, 0], ['OLIVE', 75, .32, .42, 0], ['SAND', 38, .35, .6, 0], ['SLATE', 228, .16, .42, 0],
  ['COPPER', 22, .6, .5, 0], ['IVORY', 45, .28, .8, 0], ['ONYX', 250, .14, .24, 0], ['MOSS', 105, .3, .4, 0], ['BRICK', 8, .45, .4, 0],
  ['CRIMSON', 355, .72, .48, 1], ['COBALT', 222, .72, .5, 1], ['JADE', 152, .55, .45, 1], ['AMBER', 36, .85, .55, 1], ['VIOLET', 270, .55, .52, 1],
  ['TEAL', 180, .6, .44, 1], ['ROSE', 335, .65, .62, 1], ['LIME', 85, .7, .5, 1], ['ARCTIC', 195, .55, .7, 1], ['SKY', 205, .75, .6, 1],
  ['MINT', 160, .55, .66, 1], ['PLUM', 292, .42, .38, 1], ['NEON', 305, .95, .6, 2], ['SOLAR', 48, .95, .55, 2], ['TOXIC', 98, .9, .5, 2],
  ['MIDNIGHT', 238, .55, .3, 2], ['BLOOD', 0, .8, .36, 2], ['GOLD', 45, .85, .55, 2], ['PEARL', 260, .18, .86, 2], ['ORCHID', 285, .62, .65, 2],
  ['LAVA', 12, .92, .5, 2], ['GLACIER', 190, .4, .8, 2], ['EMERALD', 140, .72, .4, 2], ['SAPPHIRE', 225, .82, .45, 2], ['PLASMA', 320, .9, .55, 2],
];
const PREFIX_LOW = ['RUSTY', 'DENTED', 'STANDARD', 'TRUSTY', 'SCRAP', 'BASIC', 'SURPLUS', 'PATCHED', 'WORN', 'CADET'];
const PREFIX_MID = ['POLISHED', 'CHROME', 'NEON', 'CARBON', 'TUNED', 'PRIMED', 'SLEEK', 'HOT', 'SHARP', 'BRIGHT', 'RAPID', 'HEAVY'];
const PREFIX_HIGH = ['NOVA', 'QUANTUM', 'PHASE', 'ION', 'STELLAR', 'ASTRAL', 'NEBULAR', 'HYPER', 'OMNI', 'ZERO-G', 'GALACTIC', 'COSMIC'];
const SUFFIX_HIGH = ['MK II', 'X-9', 'PRIME', 'OMEGA', 'ZERO', 'OF DAWN', 'OF DUSK', 'MK IV', 'APEX', 'ULTRA'];

const SLOT_NAMES = {
  helmet: ['HELM', 'DOME', 'VISOR', 'HOOD', 'SKULLCAP'], chest: ['PLATE', 'VEST', 'CUIRASS', 'CARAPACE', 'HARNESS'],
  boots: ['BOOTS', 'TREADS', 'STRIDERS', 'KICKS', 'STOMPERS'], jetpack: ['JETPACK', 'THRUSTER', 'ROCKETPACK', 'BOOSTER', 'WINGPACK'],
  o2: ['O2 TANK', 'AIR CELL', 'LUNG', 'BREATHER', 'CANISTER'],
  engine: ['ENGINE', 'DRIVE', 'THRUSTER', 'REACTOR', 'BURNER'], hull: ['HULL', 'FRAME', 'CHASSIS', 'SHELL', 'KEEL'],
  cargo: ['CARGO HOLD', 'HAULER', 'VAULT', 'BAY', 'POD'], scanner: ['SCANNER', 'RADAR', 'DISH', 'SENSOR', 'EYE'],
  shield: ['SHIELD', 'BARRIER', 'AEGIS', 'WARD', 'DEFLECTOR'],
  tool: ['DRILL', 'PICK', 'EXTRACTOR', 'CUTTER', 'BORER', 'HAMMER', 'SIPHON'], miner: ['AUTO-MINER', 'DIGBOT', 'MINE DRONE', 'EXCAVATOR'],
};
const SKIN_PATTERNS = ['SOLID', 'STRIPE', 'CAMO', 'CIRCUIT', 'CHECKER', 'TIGER', 'FLAME', 'DOTS', 'CARBON', 'SCALES', 'GALAXY', 'HOLO', 'GILDED', 'ZEBRA', 'FADE', 'PIXEL'];
const COS_STYLES = {
  eyewear: ['AVIATORS', 'ROUND SHADES', 'STAR SHADES', 'PIXEL SHADES', 'MONOCLE', 'GOGGLES', 'HEART SHADES', 'VISOR SHADES', '3D GLASSES', 'CAT EYES', 'SPORT SHADES', 'LASER EYES'],
  headgear: ['CAP', 'CROWN', 'ANTENNA', 'HALO', 'HORNS', 'MOHAWK', 'TOP HAT', 'PROPELLER CAP', 'BUNNY EARS', 'CAT EARS', 'PARTY HAT', 'WIZARD HAT', 'FLOWER', 'BANDANA', 'BEANIE', 'CHEF HAT'],
  back: ['CAPE', 'WINGS', 'MECH WINGS', 'BANNER', 'BACKPACK', 'BAT WINGS', 'FAIRY WINGS', 'SOLAR PANELS', 'ROCKET FINS', 'GUITAR'],
  trail: ['SPARKLES', 'FLAMES', 'BUBBLES', 'HEARTS', 'PIXELS', 'STARDUST', 'NOTES', 'BOLTS', 'LEAVES', 'SNOW', 'RAINBOW', 'SMOKE'],
  killfx: ['CONFETTI', 'PIXEL POP', 'GHOSTS', 'COIN BURST', 'SKULLS', 'FLOWERS', 'BLACK HOLE', 'FIREWORKS', 'SHOCKWAVE', 'GLITCH', 'HEARTS', 'STARS'],
};

// catalog shape: per category the subtypes and sizes. planet lines live at the top of each range.
const CATS = {
  w: { n: 'WEAPONS', subs: CLASSES, size: 400, pp: 10 },
  a: { n: 'ARMOR', subs: ['helmet', 'chest', 'boots', 'jetpack', 'o2'], size: 500, pp: 10 },
  s: { n: 'SHIP PARTS', subs: ['engine', 'hull', 'cargo', 'scanner', 'shield'], size: 400, pp: 10 },
  t: { n: 'MINING', subs: ['tool', 'miner'], size: { tool: 1200, miner: 200 }, pp: { tool: 20, miner: 0 } },
  k: { n: 'SKINS', subs: ['weapon', 'armor', 'ship', 'tool'], size: 750, pp: 10 },
  c: { n: 'COSMETICS', subs: ['eyewear', 'headgear', 'back', 'trail', 'killfx'], size: { eyewear: 400, headgear: 500, back: 400, trail: 350, killfx: 350 }, pp: 5 },
  b: { n: 'BACKDROPS', subs: ['backdrop'], size: 300, pp: 0 },
};
const SUB_LABEL = {
  blaster: 'BLASTER', rifle: 'RIFLE', shotgun: 'SHOTGUN', sniper: 'SNIPER', railgun: 'RAILGUN', launcher: 'LAUNCHER', beam: 'BEAM', blade: 'BLADE', throwing: 'THROWING', mine: 'MINE DEPLOYER', drone: 'DRONE CTRL',
  helmet: 'HELMET', chest: 'CHEST', boots: 'BOOTS', jetpack: 'JETPACK', o2: 'O2 TANK', engine: 'ENGINE', hull: 'HULL', cargo: 'CARGO', scanner: 'SCANNER', shield: 'SHIELD',
  tool: 'MINING TOOL', miner: 'AUTO-MINER', weapon: 'WEAPON SKIN', armor: 'ARMOR SKIN', ship: 'SHIP SKIN', eyewear: 'EYEWEAR', headgear: 'HEADGEAR', back: 'BACK ITEM', trail: 'TRAIL', killfx: 'KILL EFFECT', backdrop: 'BACKDROP',
};
const SUB_LABEL_FULL = Object.assign({}, SUB_LABEL, { tool: 'MINING TOOL', weapon: 'WEAPON SKIN', armor: 'ARMOR SKIN', ship: 'SHIP SKIN' });

// ----- planets -----
// g/g2: ground hsl, liq: liquid, decos: [kind, weight, params], sph: sphere style
const PLANETS = [
  { name: 'DUSTMOOR', look: 'CRATERED GRAY MOON', trait: null, ore: ['FERRITE', 1, 14, .6, .5], boss: ['BURROW QUEEN', ['summon', 'charge', 'radial'], [35, .45, .5]], alien: ['SKITTER', [70, .55, .6], ['crawler', 'swarm', 'spitter']], mastery: null,
    g: [225, .08, .4], g2: [230, .1, .3], detail: 'dust', liq: null, decos: [['rock', 6, { c: [222, .07, .48] }], ['rock', 3, { c: [228, .1, .36], sz: 0.6 }], ['crater', 5, {}], ['pebble', 5, { c: [225, .06, .55] }]], sph: 'moon', atmo: null, amb: 'dust' },
  { name: 'VERDANCE', look: 'JUNGLE OF GIANT MUSHROOMS', trait: null, ore: ['VERDITE', 2, 128, .85, .55], boss: ['BLOOM MAW', ['radial', 'summon', 'slam'], [330, .6, .55]], alien: ['SPORE HOPPER', [285, .5, .58], ['dasher', 'swarm', 'spitter']], mastery: [['kills', 40], ['haul', 40], ['noHitBoss']],
    g: [105, .42, .32], g2: [125, .5, .24], detail: 'grass', liq: ['swamp', 165, .45, .28], decos: [['mushroom', 6, { stem: [40, .3, .78], caps: [[355, .7, .52], [180, .65, .5], [28, .85, .55]] }], ['bush', 3, { c: [118, .5, .34] }], ['fern', 6, { c: [100, .6, .42] }]], sph: 'jungle', atmo: [120, .6, .6], amb: 'spores' },
  { name: 'GLACIS', look: 'ICE FIELDS AND CRYSTAL SPIRES', trait: null, ore: ['CRYOLITE', 3, 186, .85, .6], boss: ['RIME COLOSSUS', ['slam', 'radial', 'rain'], [200, .5, .7]], alien: ['FROST CRAWLER', [225, .4, .38], ['crawler', 'brute', 'spitter']], mastery: null,
    g: [205, .28, .84], g2: [208, .35, .72], detail: 'snow', liq: ['ice', 210, .55, .38], decos: [['crystal', 6, { c: [192, .6, .78] }], ['rock', 3, { c: [215, .12, .55], snow: true }], ['pebble', 4, { c: [210, .3, .9] }]], sph: 'ice', atmo: [195, .6, .85], amb: 'snow' },
  { name: 'PYRRHOS', look: 'BLACK ROCK SPLIT BY LAVA', trait: 'HEAT', ore: ['EMBERITE', 4, 16, .95, .55], boss: ['CINDER WYRM', ['spiral', 'charge', 'rain'], [12, .85, .5]], alien: ['MAGMA SLUG', [20, .85, .5], ['brute', 'spitter', 'crawler']], mastery: [['haul', 60], ['combo', 6], ['noHitBoss']],
    g: [262, .14, .16], g2: [10, .22, .13], detail: 'basalt', liq: ['lava', 18, .95, .5], decos: [['rock', 6, { c: [260, .1, .2], glow: [25, 1, .55] }], ['crystal', 3, { c: [270, .35, .25] }], ['pebble', 4, { c: [260, .1, .25] }]], sph: 'lava', atmo: [20, .9, .5], amb: 'embers' },
  { name: 'SALTMERE', look: 'PINK SALT FLATS AND BRINE POOLS', trait: null, ore: ['ROSALITE', 4, 330, .75, .64], boss: ['BRINE LEVIATHAN', ['summon', 'radial', 'charge'], [175, .6, .45]], alien: ['BRINE SKIMMER', [172, .55, .46], ['dasher', 'swarm', 'spitter']], mastery: null,
    g: [345, .35, .82], g2: [335, .3, .72], detail: 'salt', liq: ['brine', 176, .55, .5], decos: [['cube', 6, { c: [340, .42, .9] }], ['rock', 2, { c: [345, .22, .66] }], ['pebble', 4, { c: [340, .3, .92] }]], sph: 'salt', atmo: [320, .5, .8], amb: 'glint' },
  { name: 'NIMBUS', look: 'FLOATING ISLANDS ABOVE CLOUDS', trait: 'LOW GRAVITY', ore: ['SKYGLASS', 5, 200, .8, .74], boss: ['STORM MATRIARCH', ['radial', 'rain', 'summon'], [300, .6, .7]], alien: ['DRIFT JELLY', [300, .6, .72], ['swarm', 'spitter', 'dasher']], mastery: [['wrecks', 2], ['kills', 60], ['noHitBoss']],
    g: [100, .42, .5], g2: [150, .36, .42], detail: 'turf', liq: ['cloud', 250, .4, .86], decos: [['bush', 4, { c: [120, .45, .4] }], ['rock', 3, { c: [230, .15, .62] }], ['crystal', 2, { c: [200, .7, .76] }], ['fern', 4, { c: [90, .5, .55] }]], sph: 'gas', atmo: [210, .7, .85], rings: true, amb: 'cloudshadow' },
  { name: 'OSSUARY', look: 'BONE DESERT WITH GIANT RIBCAGES', trait: null, ore: ['MARROWITE', 5, 0, .55, .72], boss: ['THE OSSIFIER', ['rain', 'radial', 'summon'], [40, .2, .85]], alien: ['BONE MITE', [40, .2, .86], ['swarm', 'crawler', 'brute']], mastery: null,
    g: [40, .36, .68], g2: [34, .3, .58], detail: 'sand', liq: null, decos: [['ribs', 4, { c: [45, .25, .88] }], ['skull', 2, { c: [45, .2, .9] }], ['rock', 3, { c: [30, .35, .55] }], ['deadtree', 2, { c: [28, .2, .3] }], ['pebble', 3, { c: [40, .3, .8] }]], sph: 'desert', atmo: [40, .5, .7], amb: 'sand' },
  { name: 'UMBRA', look: 'PITCH DARK WITH GLOWING PLANTS', trait: 'DARKNESS', ore: ['UMBRALITE', 6, 278, .85, .62], boss: ['THE HOLLOW', ['spiral', 'summon', 'slam'], [265, .5, .2]], alien: ['SHADE STALKER', [260, .4, .14], ['dasher', 'crawler', 'spitter']], mastery: [['haul', 80], ['wrecks', 2], ['combo', 8]],
    g: [252, .35, .11], g2: [245, .3, .07], detail: 'dark', liq: ['darkwater', 240, .5, .08], decos: [['glowplant', 6, { c: [250, .4, .22], glows: [[185, 1, .6], [310, 1, .65], [140, 1, .55]] }], ['rock', 3, { c: [250, .2, .16] }], ['mushroom', 2, { stem: [250, .2, .3], caps: [[185, .9, .55], [300, .9, .6]], glow: true }]], sph: 'dark', atmo: [270, .6, .4], amb: 'motes', dark: true },
  { name: 'CORALIS', look: 'DRIED MAGENTA CORAL REEF', trait: null, ore: ['REEFSTONE', 6, 176, .78, .55], boss: ['TIDECALLER', ['radial', 'summon', 'charge'], [178, .7, .5]], alien: ['REEF CRAB', [12, .8, .56], ['brute', 'crawler', 'spitter']], mastery: null,
    g: [20, .5, .62], g2: [14, .45, .52], detail: 'reef', liq: ['tide', 178, .7, .5], decos: [['coral', 6, { cs: [[320, .75, .6], [25, .85, .6], [270, .6, .62]] }], ['rock', 2, { c: [40, .5, .72] }], ['pebble', 4, { c: [30, .6, .85] }]], sph: 'reef', atmo: [180, .6, .7], amb: 'glint' },
  { name: 'GRAVOS', look: 'CRUSHED METAL WORLD', trait: 'HEAVY GRAVITY', ore: ['DENSIUM', 7, 222, .55, .46], boss: ['ANVIL TITAN', ['slam', 'charge', 'radial'], [210, .2, .5]], alien: ['IRON BEETLE', [205, .22, .46], ['brute', 'crawler', 'dasher']], mastery: null,
    g: [220, .12, .38], g2: [215, .1, .28], detail: 'metal', liq: ['oil', 262, .3, .08], decos: [['scrap', 5, { c: [210, .1, .48], a: [15, .45, .42] }], ['girder', 3, { c: [15, .45, .42] }], ['pebble', 3, { c: [215, .1, .55] }]], sph: 'metal', atmo: [210, .2, .6], amb: 'dust' },
  { name: 'FUNGARA', look: 'PURPLE FUNGAL FOREST', trait: 'SPORE CLOUDS', ore: ['SPORITE', 7, 86, .9, .55], boss: ['MYCELORD', ['spiral', 'summon', 'slam'], [290, .55, .6]], alien: ['MYCO CRAWLER', [262, .4, .76], ['swarm', 'spitter', 'brute']], mastery: [['kills', 90], ['haul', 90], ['noHitBoss']],
    g: [285, .35, .28], g2: [275, .3, .2], detail: 'moss', liq: ['slime', 90, .8, .45], decos: [['fungaltree', 5, { c: [290, .5, .32], glow: [300, .9, .72] }], ['mushroom', 3, { stem: [280, .3, .7], caps: [[270, .45, .62], [90, .8, .6]] }], ['fern', 4, { c: [300, .5, .45] }]], sph: 'fungal', atmo: [285, .6, .6], amb: 'spores2' },
  { name: 'FERROX', look: 'RUST CANYONS FULL OF OLD MACHINES', trait: null, ore: ['RUSTGOLD', 8, 40, .92, .55], boss: ['SCRAP HYDRA', ['spiral', 'summon', 'radial'], [25, .55, .45]], alien: ['SCRAP DRONE', [25, .5, .46], ['dasher', 'spitter', 'swarm']], mastery: null,
    g: [12, .55, .38], g2: [20, .5, .3], detail: 'rust', liq: ['sludge', 30, .7, .3], decos: [['machine', 4, { c: [18, .5, .4], a: [175, .8, .55] }], ['rock', 3, { c: [10, .45, .32] }], ['scrap', 2, { c: [20, .4, .4], a: [175, .8, .55] }], ['pebble', 3, { c: [15, .5, .45] }]], sph: 'rust', atmo: [25, .6, .5], amb: 'dust' },
  { name: 'AURORAE', look: 'TUNDRA UNDER GREEN AURORAS', trait: null, ore: ['AURORALITE', 8, 156, .88, .6], boss: ['POLAR SERAPH', ['radial', 'spiral', 'rain'], [160, .6, .8]], alien: ['TUNDRA STALKER', [182, .3, .86], ['dasher', 'crawler', 'spitter']], mastery: null,
    g: [195, .2, .8], g2: [160, .22, .52], detail: 'tundra', liq: ['water', 200, .6, .36], decos: [['pine', 6, { c: [160, .35, .3] }], ['rock', 3, { c: [210, .1, .6], snow: true }], ['pebble', 3, { c: [200, .2, .9] }]], sph: 'tundra', atmo: [150, .9, .6], amb: 'aurora' },
  { name: 'MIRAGE', look: 'GOLD GLASS DESERT', trait: null, ore: ['MIRRORITE', 9, 210, .15, .86], boss: ['SANDWRAITH', ['charge', 'radial', 'summon'], [45, .6, .7]], alien: ['SAND WRAITH', [45, .6, .7], ['dasher', 'swarm', 'spitter']], mastery: [['haul', 120], ['combo', 10], ['noHitBoss']],
    g: [42, .7, .6], g2: [35, .65, .5], detail: 'dunes', liq: ['glass', 30, .95, .6], decos: [['shard', 5, { c: [45, .8, .72] }], ['shard', 3, { c: [28, .85, .56] }], ['rock', 2, { c: [38, .5, .55] }]], sph: 'desert2', atmo: [45, .9, .7], amb: 'sand' },
  { name: 'VOLTARA', look: 'STORM PLAINS', trait: 'LIGHTNING', ore: ['VOLTITE', 9, 56, 1, .6], boss: ['THUNDER RAM', ['charge', 'rain', 'radial'], [55, .9, .6]], alien: ['ARC BEAST', [52, .85, .56], ['dasher', 'spitter', 'crawler']], mastery: null,
    g: [250, .25, .25], g2: [235, .3, .18], detail: 'storm', liq: ['puddle', 230, .4, .3], decos: [['rod', 3, { c: [220, .2, .45], glow: [55, 1, .6] }], ['crystal', 3, { c: [55, .9, .62] }], ['rock', 3, { c: [245, .15, .3] }], ['fern', 4, { c: [240, .3, .35] }]], sph: 'storm', atmo: [55, .9, .6], amb: 'storm' },
  { name: 'CRYSTALLOS', look: 'FOREST OF GIANT PRISMS', trait: null, ore: ['PRISMITE', 10, -1, 1, .7], boss: ['SHARDMOTHER', ['radial', 'summon', 'spiral'], [280, .6, .8]], alien: ['SHARD MITE', [200, .6, .82], ['swarm', 'spitter', 'brute']], mastery: null,
    g: [240, .2, .88], g2: [280, .25, .8], detail: 'crystal', liq: ['light', 300, .6, .82], decos: [['prism', 5, {}], ['crystal', 3, { c: [280, .5, .85] }], ['crystal', 2, { c: [190, .5, .85] }]], sph: 'crystal', atmo: [280, .6, .85], rings: true, amb: 'glint' },
  { name: 'ABYSSIA', look: 'DARK OCEAN FLOOR WITH GLOWING LIFE', trait: 'DARKNESS', ore: ['ABYSSITE', 10, 222, .95, .6], boss: ['DEPTH WARDEN', ['spiral', 'summon', 'radial'], [200, .6, .3]], alien: ['LANTERN FISH', [210, .5, .2], ['swarm', 'dasher', 'spitter']], mastery: [['kills', 120], ['wrecks', 3], ['noHitBoss']],
    g: [196, .45, .14], g2: [205, .5, .1], detail: 'seabed', liq: ['trench', 220, .6, .04], decos: [['kelp', 4, { c: [150, .5, .3], glow: [170, 1, .6] }], ['anemone', 4, { c: [320, .9, .6] }], ['rock', 2, { c: [200, .2, .18] }]], sph: 'ocean', atmo: [190, .8, .4], amb: 'bubbles', dark: true },
  { name: 'CINDERFALL', look: 'ASH WORLD WITH FALLING EMBERS', trait: 'METEORS', ore: ['CINDERSTEEL', 11, 6, .72, .46], boss: ['METEOR KING', ['rain', 'slam', 'radial'], [15, .8, .5]], alien: ['ASH GOLEM', [15, .1, .36], ['brute', 'crawler', 'spitter']], mastery: null,
    g: [20, .06, .3], g2: [15, .05, .2], detail: 'ash', liq: ['magma', 12, .95, .46], decos: [['deadtree', 4, { c: [20, .1, .14] }], ['rock', 4, { c: [15, .08, .3], glow: [20, 1, .55] }], ['pebble', 3, { c: [20, .05, .4] }]], sph: 'ash', atmo: [15, .7, .4], amb: 'emberfall' },
  { name: 'CHRONOS', look: 'CLOCKWORK RUINS', trait: null, ore: ['CHRONITE', 11, 170, .68, .56], boss: ['THE TIMEKEEPER', ['spiral', 'radial', 'summon'], [42, .7, .55]], alien: ['COG SENTRY', [42, .7, .56], ['spitter', 'crawler', 'dasher']], mastery: null,
    g: [40, .35, .45], g2: [35, .3, .35], detail: 'tiles', liq: ['void', 262, .5, .05], decos: [['gear', 3, { c: [42, .65, .52] }], ['clock', 3, { c: [35, .25, .62], a: [170, .7, .55] }], ['column', 2, { c: [40, .2, .62] }]], sph: 'clock', atmo: [45, .7, .6], rings: true, amb: 'motes' },
  { name: 'XENITH', look: "GOLDEN RUINS AT THE GALAXY'S CORE", trait: null, ore: ['STARCORE', 12, 50, 1, .86], boss: ['THE WARDEN', ['spiral', 'rain', 'slam', 'summon', 'radial', 'charge'], [48, .8, .7]], alien: ['SENTINEL', [48, .7, .76], ['spitter', 'dasher', 'brute']], mastery: [['haul', 150], ['combo', 10], ['noHitBoss']],
    g: [48, .45, .78], g2: [45, .4, .66], detail: 'gold', liq: ['starlight', 190, .8, .8], decos: [['obelisk', 4, { c: [48, .5, .76], glow: [185, 1, .65] }], ['column', 3, { c: [45, .3, .82] }], ['crystal', 2, { c: [190, .6, .86] }]], sph: 'gold', atmo: [50, 1, .7], rings: true, amb: 'motes2' },
];
PLANETS.forEach((p, i) => { p.i = i + 1; });
// ship rating to reach each planet. Each band asks for about one full rarity step of ship parts at that stage's crate grade:
// uncommon by 3, rare by 6, epic by 8-10, legendary by 11-13, mythic by 14-16, then levelled mythic/cosmic parts.
// (The old curve wanted legendary by 8 and mythic by 11, which took roughly 30 landings on one planet to reach.)
const PLANET_REQ_T = [0, 0, 700, 800, 900, 1000, 1100, 1200, 1350, 1450, 1550, 1750, 1900, 2000, 2250, 2400, 2550, 2650, 2800, 2950, 3100];
const PLANET_REQ = n => n <= 1 ? 0 : n < PLANET_REQ_T.length ? PLANET_REQ_T[n] : 3100 + 150 * (n - 20);
const ORE_VALUE = tier => Math.round(5 * Math.pow(1.42, tier - 1));   // base scale (alien coins use it too)
const ORE_PAY = 5;                                                     // ore sells for this many times the base
const orePrice = tier => ORE_VALUE(tier) * ORE_PAY;
const LIQ_SOLID = { swamp: 1, ice: 1, lava: 1, brine: 1, cloud: 1, darkwater: 1, tide: 1, oil: 1, slime: 1, sludge: 1, water: 1, glass: 1, puddle: 1, light: 1, trench: 1, magma: 1, void: 1, starlight: 1 };

const TRAIT_TXT = { 'HEAT': 'O2 DRAINS FASTER. SHIELDS REDUCE IT', 'LOW GRAVITY': 'YOU MOVE FASTER BUT SLIDE', 'DARKNESS': 'YOU ONLY SEE AS FAR AS YOUR HELMET LIGHT', 'HEAVY GRAVITY': 'YOU MOVE SLOWER', 'SPORE CLOUDS': 'SPORE CLOUDS SLOW YOU DOWN', 'LIGHTNING': 'LIGHTNING STRIKES NEAR YOU', 'METEORS': 'METEORS RAIN DOWN' };
const MASTERY_TXT = c => ({ kills: `DEFEAT ${c[1]} ALIENS IN ONE LANDING`, haul: `HAUL ${c[1]} ORE IN ONE LANDING`, noHitBoss: 'BEAT THE BOSS WITHOUT GETTING HIT', combo: `REACH A X${c[1]} COMBO`, wrecks: `LOOT ${c[1]} WRECKS IN ONE LANDING` })[c[0]];

// endless planets beyond 20 remix the handmade ones
function planetDef(n) {
  if (n <= 20) return PLANETS[n - 1];
  const r = RNG(hashStr('deep' + n));
  const b = PLANETS[r.int(20)];
  const hs = r.ir(-60, 60);
  const sh = a => a ? [a[0] + hs, a[1], a[2]] : a;
  const names = ['VEX', 'KORA', 'ZYTH', 'ORRA', 'TALOS', 'NYX', 'HELIX', 'DRAX', 'SOLUM', 'IRIDE', 'QUELL', 'MORROW', 'AXIOM', 'LUMEN'];
  const nm = r.pick(names) + '-' + (n * 7 + 13);
  const p = Object.assign({}, b, {
    i: n, name: nm, look: 'DEEP SPACE ' + b.look.split(' ').slice(-2).join(' '), g: sh(b.g), g2: sh(b.g2), liq: b.liq ? [b.liq[0], b.liq[1] + hs, b.liq[2], b.liq[3]] : null,
    ore: [b.ore[0] + ' PRIME', 12, b.ore[2] < 0 ? -1 : b.ore[2] + hs, b.ore[3], b.ore[4]], boss: [nm + ' TYRANT', b.boss[1], sh(b.boss[2])], alien: [b.alien[0], sh(b.alien[1]), b.alien[2]], mastery: null, deep: true,
    decos: b.decos.map(d => [d[0], d[1], JSON.parse(JSON.stringify(d[2]), (k, v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' && v[1] <= 1) ? [v[0] + hs, v[1], v[2]] : v)]),
    atmo: sh(b.atmo),
  });
  return p;
}

// boss arsenal: classes inspired by attack patterns
const PATTERN_GEAR = { radial: [['shotgun', 'split'], ['blaster', 'split']], spiral: [['beam', 'spiral'], ['rifle', 'spiral']], charge: [['blade', 'pierce'], ['railgun', 'pierce']], summon: [['drone', 'home'], ['mine', 'stick']], slam: [['launcher', 'detonate'], ['mine', 'detonate']], rain: [['launcher', 'burrow'], ['throwing', 'home']] };
function bossItems(b) { // b = planet number (1-based), returns item ids
  const p = planetDef(b); const pats = p.boss[1]; const ids = [];
  const used = new Set();
  for (let j = 0; j < 4; j++) { const opts = PATTERN_GEAR[pats[j % pats.length]]; let cls = opts[Math.floor(j / pats.length) % 2][0]; if (used.has(cls)) cls = opts[(Math.floor(j / pats.length) + 1) % 2][0]; used.add(cls); ids.push(`w|${cls}|${1000 + b * 10 + j}`); }
  ids.push(`a|helmet|${1000 + b * 10 + 4}`, `a|chest|${1000 + b * 10 + 5}`, `a|jetpack|${1000 + b * 10 + 6}`, `t|tool|${4000 + b * 10 + 7}`, `c|headgear|${1000 + b * 10 + 8}`, `k|weapon|${1000 + b * 10 + 9}`);
  return ids;
}

// ----- sets -----
const SET_NAMES = ['NOVA', 'WRAITH', 'TITAN', 'PHANTOM', 'AURORA', 'VECTOR', 'EMBER', 'GLACIER', 'ONYX', 'SOLAR', 'NEON', 'ZENITH'];
const SET_HUE = [205, 270, 30, 300, 150, 56, 15, 190, 250, 45, 320, -1];
const SET_RAR = [2, 3, 2, 3, 4, 1, 4, 3, 5, 5, 1, 6];
const ARMOR_SET_BONUS = [
  [{ ore: .1 }, { ore: .25 }], [{ dmg: .15 }, { dmg: .35 }], [{ hp: .25 }, { hp: .6 }], [{ spd: .12 }, { spd: .25 }],
  [{ o2: .15 }, { o2: .35 }], [{ boost: .25 }, { boost: .5 }], [{ dmg: .1, ore: .05 }, { dmg: .25, ore: .12 }], [{ hp: .15, o2: .1 }, { hp: .3, o2: .2 }],
  [{ dmg: .2 }, { dmg: .45, crit: .1 }], [{ ore: .15 }, { ore: .35, extract: .25 }], [{ combo: .5 }, { combo: 1 }], [{ dmg: .1, hp: .1, ore: .1 }, { dmg: .25, hp: .25, ore: .25, o2: .2 }],
];
const SHIP_SET_BONUS = [
  [{ cargo: .15 }, { cargo: .35 }], [{ rating: .05 }, { rating: .12 }], [{ hp: .2 }, { hp: .45 }], [{ scan: .3 }, { scan: .7 }],
  [{ shield: .2 }, { shield: .5 }], [{ cargo: .1, ore: .05 }, { cargo: .25, ore: .1 }], [{ ore: .1 }, { ore: .25 }], [{ o2: .1 }, { o2: .25 }],
  [{ rating: .08 }, { rating: .18 }], [{ ore: .15 }, { ore: .3, cargo: .2 }], [{ scan: .2, cargo: .1 }, { scan: .5, cargo: .25 }], [{ rating: .1, cargo: .15 }, { rating: .2, cargo: .35, ore: .15 }],
];
const BONUS_TXT = { ore: 'ORE VALUE', dmg: 'DAMAGE', hp: 'HEALTH', spd: 'MOVE SPEED', o2: 'O2', boost: 'BOOST RECHARGE', crit: 'CRIT CHANCE', extract: 'EXTRACT SPEED', combo: 'S COMBO TIME', cargo: 'CARGO SPACE', rating: 'SHIP RATING', scan: 'SCANNER RANGE', shield: 'HAZARD SHIELD' };
const bonusLine = b => Object.entries(b).map(([k, v]) => k === 'combo' ? `+${v}${BONUS_TXT[k]}` : `+${Math.round(v * 100)}% ${BONUS_TXT[k]}`).join(', ');

// ----- titles -----
const TITLES = [
  { id: 'first', n: 'FIRST LIGHT', req: 'OPEN YOUR FIRST CRATE', chk: S => S.stats.crates >= 1 },
  { id: 'hoarder', n: 'HOARDER', req: 'OPEN 100 CRATES', chk: S => S.stats.crates >= 100 },
  { id: 'wreck', n: 'WRECK RAIDER', req: 'LOOT 25 WRECKS', chk: S => S.stats.wrecks >= 25 },
  { id: 'combo', n: 'COMBO KING', req: 'REACH A X10 COMBO', chk: S => S.stats.bestCombo >= 10 },
  { id: 'core', n: 'CORE DIVER', req: 'REACH PLANET 10', chk: S => S.planet.reached >= 10 },
  { id: 'boss5', n: 'BOSS BREAKER', req: 'BEAT 5 DIFFERENT BOSSES', chk: S => Object.keys(S.planet.bosses).length >= 5 },
  { id: 'pages', n: 'CURATOR', req: 'COMPLETE 10 COLLECTION PAGES', chk: S => Object.keys(S.pages).length >= 10 },
  { id: 'myth', n: 'MYTHMAKER', req: 'PULL A MYTHIC', chk: S => S.stats.mythics >= 1 },
  { id: 'cosmic', n: 'COSMIC', req: 'PULL A COSMIC', chk: S => S.stats.cosmics >= 1 },
  { id: 'gambler', n: 'HIGH ROLLER', req: 'WIN 10 DOUBLE OR NOTHINGS', chk: S => S.stats.donWins >= 10 },
  { id: 'hauler', n: 'DEEP HAULER', req: 'HAUL 200 ORE IN ONE LANDING', chk: S => S.stats.maxHaul >= 200 },
  { id: 'rich', n: 'TYCOON', req: 'EARN 1,000,000 COINS', chk: S => S.stats.coinsEarned >= 1e6 },
  { id: 'slayer', n: 'XENOSLAYER', req: 'DEFEAT 5,000 ALIENS', chk: S => S.stats.kills >= 5000 },
  { id: 'nova', n: 'SUPERNOVA', req: 'GO SUPERNOVA ONCE', chk: S => S.nova.count >= 1 },
  { id: 'xenith', n: 'WARDEN SLAYER', req: 'BEAT THE WARDEN ON XENITH', chk: S => !!S.planet.bosses[20] },
  { id: 'artifact', n: 'ARTIFICER', req: 'FORGE AN ARTIFACT', chk: S => Object.keys(S.forged).length >= 1 },
];

const SKILLS = [
  { id: 'combat', n: 'COMBAT', max: 15, txt: r => `+${r * 6}% DAMAGE` },
  { id: 'mining', n: 'MINING', max: 15, txt: r => `+${r * 8}% EXTRACT SPEED, +${r * 3}% ORE VALUE` },
  { id: 'explorer', n: 'EXPLORER', max: 15, txt: r => `+${r * 6}% O2, +${r * 3}% MOVE SPEED` },
  { id: 'luck', n: 'LUCK', max: 10, txt: r => `CRATE ODDS SHIFT UP ${r * 3}%, DOUBLE OR NOTHING ${r * 5}% LIKELIER` },
];
const NOVA_PERKS = [
  { id: 'coin', n: 'STELLAR COINS', max: 10, txt: r => `+${r * 15}% ORE VALUE` },
  { id: 'luck', n: 'STAR LUCK', max: 10, txt: r => `CRATE ODDS SHIFT UP ${r * 2}%` },
  { id: 'o2', n: 'DEEP LUNGS', max: 10, txt: r => `+${r * 8}% O2` },
];

// artifact recipes: 3 ingredient items each, revealed by clues in wrecks
const ARTIFACTS = [
  { n: 'THE SINGING STAR', cls: 'beam', verbs: [['chain', 4], ['spiral', 3], ['split', 3]], el: 'arc', txt: 'A STAR THAT HUMS. ITS LIGHT SINGS ACROSS EVERY ALIEN' },
  { n: 'ORRERY OF ASH', cls: 'drone', verbs: [['orbit', 3], ['detonate', 3], ['home', 3]], el: 'plasma', txt: 'BURNING MOONS CIRCLE YOU AND FALL ON YOUR ENEMIES' },
  { n: 'WORLDEATER CORE', cls: 'launcher', verbs: [['pull', 4], ['detonate', 4], ['burrow', 3]], el: 'void', txt: 'SWALLOWS THE GROUND, THEN EVERYTHING ON IT' },
  { n: 'PALE COMET', cls: 'throwing', verbs: [['return', 3], ['pierce', 4], ['bounce', 3]], el: 'cryo', txt: 'A COLD DISC THAT NEVER STOPS FLYING' },
  { n: 'GLASS HYDRA', cls: 'shotgun', verbs: [['split', 4], ['bounce', 3], ['home', 3]], el: 'prism', txt: 'EVERY PELLET GROWS NEW HEADS' },
  { n: 'CLOCKWORK HALO', cls: 'blade', verbs: [['orbit', 4], ['return', 3], ['stick', 3]], el: 'toxin', txt: 'BLADES TICK AROUND YOU LIKE A CLOCK' },
];
