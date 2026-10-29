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
  const bw = st.w || 210, txt = typeof st.t === 'function' ? st.t() : st.t, lines = wrap(txt, bw - 14, FS), bh = 34 + lines.length * 8;
  let bx, by;
  if (!r) { bx = W / 2 - bw / 2; by = H / 2 - bh / 2; }
  else {
    const [x, y, w, h] = r, side = st.side || (y + h + bh + 8 < H ? 'below' : y - bh - 8 > 0 ? 'above' : x + w + bw + 8 < W ? 'right' : 'left');
    if (side === 'below') { bx = x + w / 2 - bw / 2; by = y + h + 7; } else if (side === 'above') { bx = x + w / 2 - bw / 2; by = y - bh - 7; }
    else if (side === 'right') { bx = x + w + 8; by = y + h / 2 - bh / 2; } else { bx = x - bw - 8; by = y + h / 2 - bh / 2; }
  }
  bx = Math.round(clamp(bx, 4, W - bw - 4)); by = Math.round(clamp(by + (1 - k) * 6, 4, H - bh - 4));
  panel(bx, by, bw, bh, { bg: '#0e1630', bd: COL.gold, notch: true, notchCol: COL.pink });
  // BOLT's face: a tiny robot head that blinks and talks while the text types
  { const fx = bx + 6, fy = by + 3, talk = COACH.typing && Math.floor(T_NOW * 12) % 2, blink = Math.floor(T_NOW * 1.3) % 6 === 0;
    rect(fx, fy + 1, 10, 8, '#05020c'); rect(fx + 1, fy + 2, 8, 6, '#7fe9ff'); rect(fx + 4, fy - 1, 2, 2, COL.gold);
    if (!blink) { rect(fx + 2, fy + 3, 2, 2, '#05020c'); rect(fx + 6, fy + 3, 2, 2, '#05020c'); } else { rect(fx + 2, fy + 4, 2, 1, '#05020c'); rect(fx + 6, fy + 4, 2, 1, '#05020c'); }
    rect(fx + 3, fy + 6, 4, talk ? 2 : 1, '#05020c'); }
  text('BOLT', bx + 20, by + 5, COL.cyan, FS); textO(st.title, bx + 20 + textW('BOLT', FS) + 6, by + 4, COL.gold, '#000', FS);
  if (q.steps.length > 1) text(`${i + 1}/${q.steps.length}`, bx + bw - 7, by + 5, COL.mute, FS, 2);
  // typewriter: ~110 letters a second, a soft blip every few letters; NEXT while typing just finishes the line
  const full = lines.join(' ').length, shown = Math.floor(COACH.t * 110); COACH.typing = shown < full;
  if (COACH.typing && Math.floor(COACH.t * 110 / 4) !== COACH.blip) { COACH.blip = Math.floor(COACH.t * 110 / 4); SND.play('tick', 1400 + (COACH.blip % 3) * 180); }
  { let left = shown; lines.forEach((l, j) => { if (left <= 0) return; text(l.slice(0, left), bx + 7, by + 15 + j * 8, COL.ink, FS); left -= l.length + 1; }); }
  const last = i === q.steps.length - 1, nb = st.btn || (last ? 'GOT IT' : 'NEXT'), nw = Math.max(48, textW(nb, FS) + 14);
  const next = () => { if (COACH.typing) { COACH.t = 9; return; } C.done[q.group] = i + 1; if (C.done[q.group] >= q.steps.length) delete C.replay[q.group]; dirty(); SND.play('click'); IN.kp.clear(); IN.pr = false; if (st.go) { COACH.on = false; st.go(); } };
  if (st.go && Math.floor(T_NOW * 3) % 2) { ctx.globalAlpha = 0.35; rect(bx + bw - nw - 8, by + bh - 19, nw + 4, 17, COL.gold); ctx.globalAlpha = 1; }
  if (button(bx + bw - nw - 6, by + bh - 17, nw, 13, nb, { kind: 'primary', font: FS }) || (COACH.t > 0.3 && (kp('Enter') || kp('Space')))) next();
  if (!last && button(bx + 7, by + bh - 17, 56, 13, 'SKIP TIPS', { font: FS })) { C.done[q.group] = q.steps.length; delete C.replay[q.group]; dirty(); SND.play('click'); }
  IN.used = true;   // nothing underneath reacts to this frame's click
}
// ---------- the tours ----------
function coachHub(LX, LY) {
  // first visit: one line, then straight into the first crate. The station tour waits until later.
  if ((S.stats.crates || 0) === 0) return coach('hubstart', [
    { title: 'INCOMING!', r: [318, 28, 156, 50], t: `${S.name ? S.name + '! ' : ''}A CRATE JUST CRASH-LANDED IN OUR BAY. COULD BE JUNK. COULD BE LEGENDARY. ONLY ONE WAY TO FIND OUT...`, btn: 'CRACK IT OPEN', go: () => openStation('crates') },
  ]);
  if (S.planet.landings === 0) return;   // the station tour only after their first landing
  coach('hub', [
    { title: 'HOME BASE', r: [6, 26, 170, 104], t: 'LAUNCH = PLANETS, ORE, ALIENS, COINS. CRATES = SPEND THE COINS. LOCKER = SUIT UP. THE BOX TOP RIGHT ALWAYS SAYS WHAT TO DO NEXT.' },
  ]);
}
function coachBay(kind, tier) {
  if ((S.stats.crates || 0) === 0 && kind) return coach('baystart', [
    { title: 'DO IT', r: [128, 184, 46, 28], side: 'above', t: 'FIRST ONE IS ON ME, AND IT IS ALWAYS RARE OR BETTER. HIT IT.', btn: 'OPEN!', go: () => { if (S.coins >= crateCost(kind, tier)) startOpen(kind, tier, 1); } },
  ]);
  if (S.planet.landings === 0) return;
  coach('bay', [
    { title: 'SHOPPING', r: [4, 24, 120, 120], side: 'right', t: 'WEAPONS HIT, ARMOR SAVES YOU, SHIP PARTS UNLOCK NEW PLANETS, MINING TOOLS CRACK RICHER ORE. THE SILHOUETTES ARE THE JACKPOTS.' },
    { title: 'BIGGER CRATES', r: [322, 24, 154, 134], side: 'left', t: 'BETTER TIERS COST MORE AND ROLL RARER, STRONGER LOOT. EACH NEW PLANET UNLOCKS THE NEXT TIER.' },
  ]);
}
function coachReveal(single) {
  const O = OPEN, r = O && O.results[O.sel >= 0 ? O.sel : 0], d = r ? getDef(r.id) : null;
  // the very first item: hype it, wear it, and fly. No reading about buttons.
  if (single && d && S.planet.landings === 0 && (S.stats.crates || 0) <= 1) {
    const C = coachState(); C.done.reveal = Math.max(C.done.reveal || 0, 2);
    const nm = RAR[d.r].n;
    return coach('revealstart', [
      { title: d.r >= 4 ? 'NO WAY!' : d.r >= 2 ? 'OOOH, ' + nm + '!' : 'NOT BAD!', r: [6, 20, 284, 120], side: 'below', t: `A ${nm} ${d.name}! THE RARER THE GLOW, THE HARDER IT HITS. ENOUGH STARING. LET'S GO BLAST SOMETHING WITH IT.`, btn: slotOf(d) ? 'EQUIP + LAUNCH' : 'LAUNCH',
        go: () => { const id = r.id, sl = slotOf(d); collectOpen(); if (sl && S.inv[id]) { equipped(id); S.eq[sl] = id; S.stats.equips++; dirty(); SND.play('pickup'); } OPEN = null; if (!S.planet.visited[1]) startWarp(1); else startRun(1); } },   // straight to Dustmoor, no menus
    ]);
  }
  if (S.planet.landings === 0) return;
  coach('reveal', [
    { title: 'KEEP, SELL OR GAMBLE', r: [296, 150, 176, 44], side: 'left', t: 'KEEP IT, SELL IT FOR COINS, OR DOUBLE OR NOTHING: WIN AND IT JUMPS A RARITY, LOSE AND IT IS GONE. COMMONS WIN 45%. RARER ITEMS, WORSE ODDS.' },
  ]);
}
function coachLocker() {
  coach('locker', [
    { title: 'SUIT UP', r: [198, 30, W - 212, H - 46], side: 'left', w: 180, t: 'CLICK GEAR TO WEAR IT. GREEN ARROW = UPGRADE. SPARE JUNK? SELL IT. 5 OF A RARITY? FUSE THEM INTO 1 RARER.' },
  ]);
}
function coachMap() {
  coach('map', [
    { title: 'THE GALAXY', r: [4, 30, W - 8, 150], side: 'below', t: '20 PLANETS. EACH ONE: NEW ORE, NEW ALIENS, ONE NASTY BOSS. BEAT THE BOSS AND GET YOUR SHIP RATING UP TO UNLOCK THE NEXT.' },
  ]);
}
function coachResults(haul) {
  coach('results', [
    { title: 'PAYDAY!', t: haul ? 'ORE SOLD, BOUNTIES PAID, AND YOU FOUND CRATES! THOSE OPEN FREE. THEN SPEND THE COINS ON MORE. THAT IS THE LOOP. REPEAT UNTIL LEGENDARY.' : 'ORE SOLD, BOUNTIES PAID. SPEND THE COINS ON CRATES, GET STRONGER, LAND ON TOUGHER PLANETS. THAT IS THE LOOP. REPEAT UNTIL LEGENDARY.' },
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
