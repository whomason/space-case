// ===== COACH: one-time spotlight tips that walk a new player through each screen =====
// A screen asks for its tips with coach(group, steps) while it draws. If the player hasn't seen them, the screen
// freezes (main.js treats an active tip like any modal) and the tip is drawn on top: the rest dims, the thing being
// explained is outlined, and a box says what it does. NEXT / GOT IT moves on, SKIP TIPS ends that screen's tour.
// Players who already had a save before tips existed don't get them, but every screen's ? button replays them.
const COACH = { on: false, req: null, t: 0 };
function coachState() {
  if (!S.coach || typeof S.coach !== 'object') S.coach = { vet: (S.stats.crates || 0) > 0 || (S.planet.landings || 0) > 0, done: {}, replay: {} };
  S.coach.done = S.coach.done || {}; S.coach.replay = S.coach.replay || {};
  return S.coach;
}
function coachLeft(group, n) { const C = coachState(); if (C.vet && !C.replay[group]) return false; return (C.done[group] || 0) < n; }
// screens call this every frame while they draw; the first unseen request in a frame wins
function coach(group, steps) {
  if (COACH.req || SCENE === 'title' || !S || !steps.length) return;
  steps = steps.filter(Boolean); if (coachLeft(group, steps.length)) COACH.req = { group, steps };
}
function coachReplay(group) { const C = coachState(); C.done[group] = 0; C.replay[group] = true; dirty(); SND.play('click'); }
// a small round ? that replays a screen's tips
function helpButton(x, y, group) {
  const hov = inBox(x, y, 11, 11); panel(x, y, 11, 11, { bg: hov ? COL.blue : COL.void2, bd: hov ? '#c9c0ff' : COL.steel, flat: true }); text('?', x + 6, y + 3, COL.ink, FS, 1);
  if (hov) { IN.cursor = 'pointer'; TIP.set('SHOW THE TIPS FOR THIS SCREEN AGAIN'); }
  if (clickIn(x, y, 11, 11)) coachReplay(group);
}
// called from main.js after the scene has drawn, with the real input back
function drawCoach(dt) {
  const q = COACH.req; COACH.req = null;
  if (!q) { COACH.on = false; COACH.t = 0; return; }
  const C = coachState(), i = C.done[q.group] || 0, st = q.steps[i]; if (!st) { COACH.on = false; return; }
  if (!COACH.on || COACH.key !== q.group + i) { COACH.key = q.group + i; COACH.t = 0; SND.play('hover'); }
  COACH.on = true; COACH.t += dt;
  const k = Math.min(1, COACH.t / 0.2);
  // dim everything except the spotlight
  const r = st.r; ctx.globalAlpha = 0.72 * k;
  if (r) { const [x, y, w, h] = r; rect(0, 0, W, y - 2, '#000'); rect(0, y + h + 2, W, H - y - h - 2, '#000'); rect(0, y - 2, x - 2, h + 4, '#000'); rect(x + w + 2, y - 2, W - x - w - 2, h + 4, '#000'); }
  else rect(0, 0, W, H, '#000');
  ctx.globalAlpha = 1;
  if (r) { const [x, y, w, h] = r, p = Math.floor(T_NOW * 4) % 2; ctx.strokeStyle = p ? COL.gold : '#fff2c2'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3); for (const [cx, cy, sx, sy] of [[x - 2, y - 2, 1, 1], [x + w + 1, y - 2, -1, 1], [x - 2, y + h + 1, 1, -1], [x + w + 1, y + h + 1, -1, -1]]) { rect(Math.min(cx, cx + sx * 5), cy, 6, 1, COL.gold); rect(cx, Math.min(cy, cy + sy * 5), 1, 6, COL.gold); } }
  // the tip box goes on whichever side of the spotlight has room
  const bw = st.w || 210, lines = wrap(st.t, bw - 14, FS), bh = 34 + lines.length * 8;
  let bx, by;
  if (!r) { bx = W / 2 - bw / 2; by = H / 2 - bh / 2; }
  else {
    const [x, y, w, h] = r, side = st.side || (y + h + bh + 8 < H ? 'below' : y - bh - 8 > 0 ? 'above' : x + w + bw + 8 < W ? 'right' : 'left');
    if (side === 'below') { bx = x + w / 2 - bw / 2; by = y + h + 7; } else if (side === 'above') { bx = x + w / 2 - bw / 2; by = y - bh - 7; }
    else if (side === 'right') { bx = x + w + 8; by = y + h / 2 - bh / 2; } else { bx = x - bw - 8; by = y + h / 2 - bh / 2; }
  }
  bx = Math.round(clamp(bx, 4, W - bw - 4)); by = Math.round(clamp(by + (1 - k) * 6, 4, H - bh - 4));
  panel(bx, by, bw, bh, { bg: '#0e1630', bd: COL.gold, notch: true, notchCol: COL.pink });
  text(`TIP ${i + 1}/${q.steps.length}`, bx + 7, by + 5, COL.pink, FS); textO(st.title, bx + 7 + textW(`TIP ${i + 1}/${q.steps.length}`, FS) + 6, by + 4, COL.gold, '#000', FS);
  lines.forEach((l, j) => text(l, bx + 7, by + 15 + j * 8, COL.ink, FS));
  const last = i === q.steps.length - 1, nb = last ? 'GOT IT' : 'NEXT';
  const next = () => { C.done[q.group] = i + 1; if (C.done[q.group] >= q.steps.length) delete C.replay[q.group]; dirty(); SND.play('click'); IN.kp.clear(); IN.pr = false; };
  if (button(bx + bw - 54, by + bh - 17, 48, 13, nb, { kind: 'primary', font: FS }) || (COACH.t > 0.3 && (kp('Enter') || kp('Space')))) next();
  if (!last && button(bx + 7, by + bh - 17, 56, 13, 'SKIP TIPS', { font: FS })) { C.done[q.group] = q.steps.length; delete C.replay[q.group]; dirty(); SND.play('click'); }
  IN.used = true;   // nothing underneath reacts to this frame's click
}
// ---------- the tours ----------
function coachHub(LX, LY) {
  coach('hub', [
    { title: 'WELCOME, PILOT', t: 'OPEN CRATES FOR GEAR, LAND ON PLANETS TO MINE ORE AND FIGHT ALIENS, THEN SPEND THE COINS ON BETTER CRATES. THAT IS THE WHOLE LOOP.' },
    { title: 'YOUR NEXT STEP', r: [318, 28, 156, 50], t: 'THIS BOX ALWAYS SAYS WHAT TO DO NEXT, AND PAYS COINS WHEN YOU DO IT. CLICK GO TO JUMP STRAIGHT THERE.' },
    { title: 'THE STATION', r: [6, 26, 170, 104], t: 'LAUNCH FLIES TO A PLANET. CRATES IS WHERE YOU SPEND COINS. LOCKER IS WHERE YOU EQUIP WHAT YOU FIND. MORE ROOMS OPEN AS YOU PLAY.' },
  ]);
}
function coachBay() {
  coach('bay', [
    { title: 'THE CRATE BAY', r: [128, 26, 190, 150], t: 'SPEND COINS HERE ON CRATES. EVERY CRATE HOLDS ONE ITEM. THE SILHOUETTES ARE THE BEST THINGS INSIDE THIS ONE.' },
    { title: 'CRATE TYPES', r: [4, 24, 120, 120], side: 'right', t: 'EACH TYPE DROPS DIFFERENT GEAR. WEAPONS FIGHT, ARMOR KEEPS YOU ALIVE, SHIP PARTS RAISE YOUR SHIP RATING SO YOU CAN REACH NEW PLANETS, MINING TOOLS BREAK BETTER ORE.' },
    { title: 'TIERS', r: [322, 24, 154, 134], side: 'left', t: 'BETTER TIERS COST MORE BUT ROLL RARER ITEMS, AND THE ITEM GETS A HIGHER GRADE: STRONGER STATS. NEW TIERS UNLOCK AS YOU REACH NEW PLANETS.' },
    { title: 'RARITY ODDS', r: [322, 157, 154, 70], side: 'left', t: 'YOUR CHANCE OF EACH RARITY, FROM COMMON (GREY) UP TO COSMIC (RAINBOW). RARER GEAR IS STRONGER AND LOOKS COOLER.' },
    { title: 'OPEN', r: [128, 184, 190, 28], side: 'above', t: (S.stats.crates || 0) === 0 ? 'OPEN ONE NOW. YOUR FIRST CRATE IS ALWAYS RARE OR BETTER. EARN MORE COINS ON PLANETS: MINE ORE AND DEFEAT ALIENS.' : 'OPEN ONE OR SEVERAL AT ONCE. EARN MORE COINS ON PLANETS: MINE ORE AND DEFEAT ALIENS.' },
    { title: 'UPGRADER (OPTIONAL)', r: [130, 218, 186, 20], side: 'above', t: 'A GAMBLE: TICK IT AND YOUR CRATE MIGHT JUMP UP A TIER. IF IT MISSES, THE CRATE BURNS AND THE COINS ARE GONE.' },
  ]);
}
function coachReveal(single) {
  coach('reveal', [
    { title: 'YOUR NEW ITEM', r: [6, 20, 284, 120], side: 'below', t: 'ITS NAME, RARITY AND STATS. THE TAG UNDER THE STATS TELLS YOU IF IT BEATS WHAT YOU HAVE EQUIPPED.' },
    { title: 'KEEP OR SELL', r: single ? [296, 150, 176, 20] : [296, 222, 176, 18], side: 'left', t: single ? 'COLLECT KEEPS IT. SELL TURNS IT INTO COINS RIGHT AWAY.' : 'SELL TURNS IT INTO COINS RIGHT AWAY. ANYTHING YOU DO NOT SELL IS KEPT.' },
    { title: 'DOUBLE OR NOTHING', r: [296, 174, 176, 20], side: 'left', t: 'A GAMBLE: WIN AND THE ITEM BECOMES THE NEXT RARITY UP. LOSE AND IT IS GONE. COMMONS ARE 45%, RARER ITEMS ARE HARDER.' },
  ]);
}
function coachLocker() {
  coach('locker', [
    { title: 'THE LOCKER', r: [198, 30, W - 212, H - 46], side: 'left', w: 180, t: 'CLICK AN ITEM TO EQUIP IT. A GREEN ARROW MEANS IT IS AN UPGRADE. HOVER ANYTHING TO SEE ITS STATS.' },
    { title: 'SLOTS', r: [97, 26, 92, 196], side: 'right', w: 180, t: 'GEAR CHANGES HOW YOU FIGHT AND SURVIVE. STYLE IS JUST FOR LOOKS. CLICK A SLOT TO SEE WHAT YOU OWN FOR IT.' },
    { title: 'SELL AND FUSE', r: [W - 128, 26, 116, 14], side: 'below', w: 190, t: 'SELL SPARE GEAR FOR COINS. FUSE TURNS 5 ITEMS OF ONE RARITY INTO 1 OF THE NEXT RARITY.' },
  ]);
}
function coachMap() {
  coach('map', [
    { title: 'THE STAR MAP', r: [4, 30, W - 8, 150], side: 'below', t: 'EACH PLANET HAS ITS OWN ORE, ALIENS, BOSS AND A TWIST. LOCKED ONES NEED A HIGHER SHIP RATING: GET BETTER SHIP PARTS FROM SHIP CRATES.' },
    { title: 'READY TO GO', r: [4, 184, W - 8, 82], side: 'above', t: 'CHECK THE PLANET HERE, ADD A BOOST IF YOU HAVE ONE, THEN WARP. BRING ORE BACK TO YOUR SHIP BEFORE YOUR O2 RUNS OUT.' },
  ]);
}
function coachResults(haul) {
  coach('results', [
    { title: 'PAYDAY', t: 'YOUR ORE IS SOLD AND YOUR ALIEN BOUNTIES ADDED UP. COINS GO STRAIGHT TO YOUR WALLET: SPEND THEM IN THE CRATE BAY.' },
    haul ? { title: 'HAUL CRATES', r: [W / 2 - 102, 222, 204, 26], side: 'above', t: 'CRATES YOU FOUND ON THE PLANET (CARRIERS, WRECKS, BOSSES). THEY ARE FREE TO OPEN.' } : null,
  ]);
}
// planet tips that don't stop the action: a short card at the top, once each
const PTIPS = {
  carrier: 'A CRATE CARRIER! CHASE IT DOWN BEFORE IT WARPS AWAY FOR A FREE CRATE',
  wreck: 'A WRECK! STAND NEXT TO IT AND PRESS E TO SEARCH IT FOR CRATES AND CLUES',
  cargo: 'CARGO FULL. FLY BACK TO YOUR SHIP AND PRESS E TO CASH IT IN',
  o2: 'O2 IS LOW. HEAD BACK TO THE SHIP AND PRESS E, OR YOU LOSE HALF YOUR ORE',
  windup: 'A ! MEANS IT IS WINDING UP AN ATTACK. HIT IT HARD NOW TO STAGGER IT',
  boss: 'BOSS LAIR AHEAD. IT DROPS ARSENAL CRATES. HIT ITS GLOWING CORE WHEN IT IS STAGGERED',
  combo: 'COMBO! KEEP KILLING FAST AND EVERY ALIEN PAYS MORE',
  ore: 'THIS ORE NEEDS A BETTER MINING TOOL. GET ONE FROM MINING CRATES',
};
function ptip(k) {
  if (!RUN || RUN.tut || !S) return; const C = coachState(); if (C.vet || (C.done['p_' + k])) return;
  C.done['p_' + k] = 1; dirty(); RUN.ptip = { t: PTIPS[k], life: 6 };
}
function drawPTip(R, dt) {
  const T = R.ptip; if (!T) return; T.life -= dt; if (T.life <= 0) { R.ptip = null; return; }
  const a = Math.min(1, T.life / 0.4, (6 - T.life) / 0.25), lines = wrap(T.t, 230, FS), w = 252, h = 12 + lines.length * 8, x = W / 2 - w / 2, y = 40;
  ctx.globalAlpha = a; panel(x, y, w, h, { bg: 'rgba(14,22,48,0.94)', bd: COL.gold }); text('TIP', x + 6, y + 4, COL.pink, FS); lines.forEach((l, i) => text(l, x + 22, y + 4 + i * 8, COL.ink, FS)); ctx.globalAlpha = 1;
}
// the controls card in the pause menu
const CONTROLS = [['WASD', 'MOVE'], ['MOUSE', 'AIM'], ['HOLD CLICK', 'SHOOT / MINE'], ['Q  1  3', 'GUN / MINING TOOL'], ['F OR 2', 'GADGET'], ['SPACE', 'BOOST / DODGE'], ['E', 'LAUNCH / SEARCH'], ['RIGHT CLICK', 'SNIPER SCOPE'], ['P OR ESC', 'PAUSE']];
const PLAY_TIPS = ['MINE GLOWING ORE, THEN PRESS E AT YOUR SHIP TO CASH IN', 'RUN OUT OF O2 AND YOU LOSE HALF YOUR ORE', 'HIT ALIENS WHILE ! FLASHES TO STAGGER THEM', 'CHASE GOLD CRATE CARRIERS FOR FREE CRATES', 'BOOST THROUGH AN ATTACK FOR A PERFECT DODGE'];
function drawControlsCard(x, y) {
  panel(x, y, 132, 16 + CONTROLS.length * 9, { bg: COL.void1, bd: COL.steel }); text('CONTROLS', x + 6, y + 4, COL.gold, FS);
  CONTROLS.forEach(([k, v], i) => { text(k, x + 6, y + 14 + i * 9, COL.cream, FS); text(v, x + 52, y + 14 + i * 9, COL.dim, FS); });
}
function drawPlayTips(x, y) {
  const lines = [].concat(...PLAY_TIPS.map(t => wrap(t, 118, FS).map((l, j) => [l, j === 0])));
  panel(x, y, 132, 16 + lines.length * 8, { bg: COL.void1, bd: COL.steel }); text('HOW TO PLAY', x + 6, y + 4, COL.gold, FS);
  lines.forEach(([l, first], i) => { if (first) rect(x + 6, y + 16 + i * 8, 2, 2, COL.pink); text(l, x + 11, y + 14 + i * 8, COL.ink, FS); });
}
