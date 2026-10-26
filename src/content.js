// ===== CONTENT: dream weapons, quirks, techniques, set abilities, reactions, planet events, contracts =====

// ---------- dream weapons: handcrafted, named, each with a signature trick ----------
const DREAMS = [
  { n: 'SPUD GUN', cls: 'launcher', r: 0, el: null, verbs: [['bounce', 2]], sig: 'spud', h: 38, txt: 'LOBS POTATOES. THEY BOUNCE. THEY HURT' },
  { n: 'OLD RELIABLE', cls: 'blaster', r: 1, el: null, verbs: [], sig: 'reliable', h: 30, txt: 'EVERY 6TH SHOT IS A GUARANTEED CRIT' },
  { n: 'PARTY POPPER', cls: 'shotgun', r: 2, el: null, verbs: [['split', 1]], sig: 'confetti', h: 330, txt: 'PELLETS BURST INTO CONFETTI SHRAPNEL' },
  { n: 'PINBALL WIZARD', cls: 'blaster', r: 3, el: null, verbs: [['bounce', 6]], sig: 'pinball', h: 320, txt: 'SHOTS BOUNCE 6 TIMES AND GET FASTER AND HARDER EVERY BOUNCE' },
  { n: 'BOOMERANG BUFFET', cls: 'throwing', r: 3, el: null, verbs: [['return', 2]], sig: 'multiply', h: 160, txt: 'DISCS COME BACK AS THREE' },
  { n: 'THE LAST WORD', cls: 'sniper', r: 4, el: null, verbs: [['pierce', 1]], sig: 'lastword', h: 0, txt: 'EVERY KILL SENDS THE BULLET TO THE NEXT ALIEN, HARDER EACH TIME' },
  { n: 'HIVE QUEEN', cls: 'drone', r: 4, el: 'toxin', verbs: [['home', 2]], sig: 'hive', h: 95, txt: 'SIX DRONES. KILLS HATCH EXTRA DRONES FOR A WHILE' },
  { n: 'COMET TAIL', cls: 'blade', r: 4, el: 'plasma', verbs: [['pierce', 2]], sig: 'firetrail', h: 15, txt: 'SWINGS LEAVE BURNING GROUND BEHIND' },
  { n: 'GRAVITY CHOIR', cls: 'mine', r: 4, el: 'void', verbs: [['pull', 3], ['detonate', 2]], sig: 'choir', h: 260, txt: 'MINES SING ALIENS TOGETHER, THEN ALL BLOW AT ONCE' },
  { n: 'DRAGONS BREATH', cls: 'shotgun', r: 4, el: 'plasma', verbs: [], sig: 'dragon', h: 8, txt: 'PELLETS SET THE GROUND ON FIRE' },
  { n: 'FROSTBITE', cls: 'rifle', r: 4, el: 'cryo', verbs: [['pierce', 1]], sig: 'shatter', h: 195, txt: 'FROZEN ALIENS SHATTER INTO ICE SHARDS WHEN THEY DIE' },
  { n: 'VOID LANCE', cls: 'railgun', r: 4, el: 'void', verbs: [['pull', 2]], sig: 'rift', h: 280, txt: 'RAILS TEAR A RIFT THAT KEEPS HURTING' },
  { n: 'STARFALL', cls: 'railgun', r: 5, el: 'plasma', verbs: [['pierce', 3]], sig: 'meteors', h: 30, txt: 'EVERY RAIL CALLS DOWN A LINE OF METEORS' },
  { n: 'ZEUS RIFLE', cls: 'rifle', r: 5, el: 'arc', verbs: [['pierce', 1]], sig: 'zeus', h: 56, txt: 'EVERY 5TH BULLET IS A LIGHTNING STRIKE THAT CHAINS 8 TIMES' },
  { n: 'PRISMATIC CANNON', cls: 'beam', r: 5, el: 'prism', verbs: [['pierce', 2]], sig: 'prism3', h: 300, txt: 'THE BEAM SPLITS INTO THREE RAINBOW BEAMS' },
  { n: 'SHURIKEN STORM', cls: 'throwing', r: 5, el: 'arc', verbs: [['home', 2]], sig: 'fan', h: 200, txt: 'THROWS FIVE HOMING STARS AT ONCE' },
  { n: 'BLACK HOLE IN A BOTTLE', cls: 'launcher', r: 6, el: 'void', verbs: [['pull', 3]], sig: 'blackhole', h: 275, txt: 'ROCKETS COLLAPSE INTO A BLACK HOLE, THEN IMPLODE' },
  { n: 'THE BIG BANG', cls: 'blaster', r: 6, el: 'prism', verbs: [['pierce', 2]], sig: 'grow', h: 45, txt: 'SHOTS GROW AS THEY FLY. KILLS GO SUPERNOVA' },
];
const isDream = id => id.startsWith('u|');
function buildDream(id, k) {
  const D = DREAMS[k]; const r = D.r;
  return { id, cat: 'w', sub: D.cls, n: 6000 + k, r, o: { t: 'dream' }, q: 1.05, verbs: D.verbs.map(v => v.slice()), el: D.el ? [D.el, [0.5, 0.5, 0.6, 0.8, 1, 1.2, 1.5][r]] : null, name: D.n, lore: D.txt,
    ph: D.h, ps: 0.85, pl: 0.55, h2: D.h + 180, metal: r >= 6 ? 'pearl' : r === 5 ? 'chrome' : r === 4 ? 'gold' : 'steel', gh: D.el ? ELEM_INFO[D.el].h : D.h + 40, seed: hashStr(id + 'dream7'), w: 32, h: 16, pname: 'DREAM', sig: D.sig, dream: k };
}

// ---------- quirks: why a common can still be exciting ----------
const QUIRKS = {
  giant: { n: 'GIANT', txt: '1 IN 8 SHOTS IS HUGE AND HITS TWICE AS HARD' },
  lucky: { n: 'LUCKY', txt: 'KILLS SOMETIMES DROP A PILE OF COINS' },
  vampire: { n: 'VAMPIRE', txt: 'KILLS HEAL YOU A LITTLE' },
  echo: { n: 'ECHO', txt: 'EVERY 4TH SHOT FIRES TWICE' },
  overclock: { n: 'OVERCLOCK', txt: 'KILLS SPEED UP YOUR FIRE RATE FOR 2S' },
  scavenger: { n: 'SCAVENGER', txt: 'KILLS SOMETIMES DROP ORE' },
  bully: { n: 'BULLY', txt: 'STAGGERS WINDING-UP ALIENS TWICE AS EASILY' },
  steady: { n: 'STEADY', txt: '+40% DAMAGE TO FAR AWAY ALIENS' },
  brawler: { n: 'BRAWLER', txt: '+40% DAMAGE UP CLOSE' },
  festive: { n: 'FESTIVE', txt: 'KILLS POP CONFETTI. THAT IS IT. IT IS GREAT' },
  hunter: { n: 'HUNTER', txt: '+50% DAMAGE TO CRATE CARRIERS, ELITES AND NESTS' },
  magnet: { n: 'MAGNETIC', txt: 'PULLS IN ORE AND COINS FROM FAR AWAY' },
};
const QUIRK_KEYS = Object.keys(QUIRKS);
function quirkOf(d) {
  if (d.cat !== 'w' || !['gen', 'planet', 'boss'].includes(d.o.t)) return null;
  const R = RNG(hashStr(d.id + '#quirk'));
  return R() < [0.8, 0.55, 0.3, 0.12, 0, 0, 0][d.r] ? R.pick(QUIRK_KEYS) : null;
}

// ---------- weapon techniques: skill that pays off ----------
const TECH = {
  blaster: 'SHOOT ALIENS IN THE BACK FOR WEAK POINT HITS', rifle: 'STAGGER ALIENS WHILE THEY WIND UP AN ATTACK',
  shotgun: 'POINT BLANK HITS DEAL +35%', sniper: 'HITS FROM FAR AWAY DEAL +50%', railgun: 'RELEASE THE MOMENT IT FLASHES FOR A PERFECT SHOT',
  launcher: 'ROCKETS SPEED UP. LEAD YOUR TARGETS', beam: 'HEAT BUILDS DAMAGE. KEEP IT ON TARGET', blade: 'SWING INTO ENEMY SHOTS TO PARRY THEM BACK',
  throwing: 'CATCH A RETURNING DISC TO THROW AGAIN INSTANTLY', mine: 'EXPLOSIONS SET OFF YOUR OTHER MINES', drone: 'HOLD CLICK TO FOCUS EVERY DRONE ON YOUR AIM',
};

// ---------- set abilities: completing a set changes how you play ----------
const SET_ABIL = [
  { n: 'NOVA BURST', txt: 'BOOSTING RELEASES A DAMAGING NOVA' },
  { n: 'SHADOW STEP', txt: 'AFTER A BOOST, ALIENS LOSE TRACK OF YOU AND YOU CRIT MORE' },
  { n: 'SHOULDER CHARGE', txt: 'BOOSTING INTO ALIENS STUNS AND FLINGS THEM' },
  { n: 'DECOY', txt: 'PERFECT DODGES LEAVE A DECOY THAT ALIENS CHASE' },
  { n: 'LIFE BLOOM', txt: 'KILLS DROP HEALING ORBS' },
  { n: 'OVERDRIVE', txt: 'AN EXTRA BOOST CHARGE THAT REFILLS FASTER' },
  { n: 'FIRE WALK', txt: 'BOOSTING LEAVES A TRAIL OF FIRE' },
  { n: 'FROST SKIN', txt: 'ALIENS THAT TOUCH YOU FREEZE SOLID' },
  { n: 'LAST STAND', txt: 'BELOW 35% HEALTH: TAKE HALF DAMAGE, DEAL 50% MORE' },
  { n: 'SOLAR FLARE', txt: 'EVERY FEW SECONDS YOUR NEXT SHOT ERUPTS' },
  { n: 'NEON RUSH', txt: 'X5 COMBOS AND UP MAKE YOU FASTER AND STRONGER' },
  { n: 'HALO', txt: 'GLOWING ORBS CIRCLE YOU AND HIT ALIENS' },
];

// ---------- element reactions: combos to discover ----------
// a = status already on the alien, b = element that hits it
const REACTIONS = {
  shatter: { n: 'SHATTER', a: 'cryo', b: 'plasma', c: '#bff6ff', txt: 'HEAT A FROZEN ALIEN AND IT SHATTERS FOR TRIPLE DAMAGE' },
  steam: { n: 'STEAM', a: 'plasma', b: 'cryo', c: '#e5e5e5', txt: 'CHILL A BURNING ALIEN. THE STEAM CLOUD SOFTENS EVERYTHING INSIDE' },
  combust: { n: 'COMBUST', a: 'toxin', b: 'plasma', c: '#ff9a3d', txt: 'IGNITE A POISONED ALIEN AND IT EXPLODES' },
  overload: { n: 'OVERLOAD', a: 'cryo', b: 'arc', c: '#fff25a', txt: 'ZAP A CHILLED ALIEN. LIGHTNING JUMPS TO EVERY CHILLED ALIEN' },
  nerve: { n: 'NERVE SURGE', a: 'toxin', b: 'arc', c: '#c8ff8a', txt: 'ZAP A POISONED ALIEN. NEARBY POISONED ALIENS ARE STUNNED' },
  singular: { n: 'SINGULARITY', a: 'any', b: 'void', c: '#b45cff', txt: 'VOID ON AN ALIEN WITH A STATUS PULLS EVERYONE IN AND SPREADS IT' },
  lightshow: { n: 'LIGHT SHOW', a: 'arc', b: 'prism', c: '#ff88cc', txt: 'PRISM ON A SHOCKED ALIEN FIRES SIX BEAMS OF LIGHT' },
  corrode: { n: 'CORRODE', a: 'void', b: 'toxin', c: '#8cff3a', txt: 'POISON A VOID-MARKED ALIEN. ITS ARMOR MELTS. +50% DAMAGE TAKEN' },
  fireball: { n: 'FIREBALL', a: 'pod', b: 'plasma', c: '#ff7a2e', txt: 'SET OFF A POD WITH PLASMA FOR A HUGE FIREBALL' },
  icebomb: { n: 'ICE BOMB', a: 'pod', b: 'cryo', c: '#7fe9ff', txt: 'SET OFF A POD WITH CRYO TO FREEZE EVERYTHING NEARBY' },
  stormpod: { n: 'STORM POD', a: 'pod', b: 'arc', c: '#fff25a', txt: 'SET OFF A POD WITH ARC TO ZAP EVERYTHING NEARBY' },
  gaspod: { n: 'GAS CLOUD', a: 'pod', b: 'toxin', c: '#8cff3a', txt: 'SET OFF A POD WITH TOXIN TO POISON EVERYTHING NEARBY' },
};
const REACT_KEYS = Object.keys(REACTIONS);

// ---------- planet events: every landing plays differently ----------
const EVENTS = {
  vault: { n: 'BURIED VAULT', txt: 'POWER UP 3 PYLONS TO OPEN A SEALED VAULT', tag: 'EXPLORE', c: '#fca311', rw: 2 },
  nests: { n: 'INFESTATION', txt: 'DESTROY 4 ALIEN NESTS BEFORE THEY OVERRUN YOU', tag: 'CROWDS', c: '#f25f7a', rw: 2 },
  drill: { n: 'DEFEND THE DRILL', txt: 'KEEP A MINING DRILL ALIVE FOR 40 SECONDS', tag: 'DEFENSE', c: '#957fef', rw: 2 },
  elite: { n: 'ELITE HUNT', txt: 'TAKE DOWN AN ARMORED ELITE. ITS BACK IS THE WEAK SPOT', tag: 'PRECISION', c: '#e0b1cb', rw: 2 },
  race: { n: 'SIGNAL RACE', txt: 'REACH 5 BEACONS BEFORE EACH TIMER RUNS OUT', tag: 'SPEED', c: '#dec0f1', rw: 2 },
  meteor: { n: 'METEOR SHOWER', txt: 'METEORS RAIN DOWN. MINE 5 METEOR DEPOSITS', tag: 'RISK', c: '#ff9a3d', rw: 1 },
};
const EVENT_KEYS = Object.keys(EVENTS);
const ELITE_NAMES = ['GOREJAW', 'THE WARDEN', 'BONEPLATE', 'OLD SCRATCH', 'IRONHIDE', 'MAWLER', 'THE TANK', 'CRAGBACK', 'GRIMSHELL', 'BIG MOMMA'];

// ---------- daily contracts: a purpose for every session ----------
const CONTRACT_TPL = [
  { k: 'staggers', t: n => `STAGGER ${n} ALIENS MID WIND-UP`, n: [4, 8], why: 'HIT ALIENS WHILE A ! FLASHES OVER THEM' },
  { k: 'perfects', t: n => `PULL OFF ${n} PERFECT DODGES`, n: [4, 8], why: 'BOOST THROUGH AN ATTACK RIGHT AS IT LANDS' },
  { k: 'reactions', t: n => `TRIGGER ${n} ELEMENT REACTIONS`, n: [3, 6], why: 'MIX TWO ELEMENTS ON ONE ALIEN' },
  { k: 'weakhits', t: n => `LAND ${n} WEAK POINT HITS`, n: [20, 40], why: 'SHOOT ALIENS IN THE BACK' },
  { k: 'events', t: n => `COMPLETE ${n} PLANET EVENT${n > 1 ? 'S' : ''}`, n: [1, 2], why: 'CHECK THE STAR MAP FOR EVENTS' },
  { k: 'caches', t: n => `DIG UP ${n} BURIED CACHE${n > 1 ? 'S' : ''}`, n: [1, 2], why: 'FOLLOW THE SIGNAL METER' },
  { k: 'podkills', t: n => `TAKE OUT ${n} ALIENS WITH EXPLOSIVE PODS`, n: [6, 12], why: 'SHOOT THE GLOWING PODS' },
  { k: 'kills2', t: n => `DEFEAT ${n} ALIENS WITH YOUR 2ND WEAPON`, n: [25, 40], why: 'EQUIP A 2ND WEAPON IN THE LOCKER' },
  { k: 'parries', t: n => `PARRY ${n} SHOTS WITH A BLADE`, n: [4, 8], why: 'SWING A BLADE INTO ENEMY SHOTS' },
  { k: 'cls', t: (n, c) => `DEFEAT ${n} ALIENS WITH A ${CLS[c].n}`, n: [30, 50], why: 'DUST OFF AN OLD WEAPON' },
  { k: 'carriers', t: n => `TAKE DOWN ${n} CRATE CARRIERS`, n: [2, 3], why: 'THEY SHOW UP EVERY MINUTE OR SO' },
  { k: 'elites', t: () => 'BEAT AN ELITE', n: [1, 1], why: 'FIND AN ELITE HUNT ON THE STAR MAP' },
];
