// ===== FOES: more alien types, variants and per-planet rosters =====
const FOES = {
  bomber: { hp: 14, spd: 60, dmg: 22, r: 5, coin: 3, xp: 3, sz: [12, 12], draw(g, w, h, cx, leg) { g.ell(cx, 7, 4.5, 4.5, M.P); g.ell(cx, 6, 2.5, 2, M.S); g.rect(cx - 1, 1, 2, 2, M.D); g.set(cx, 0, M.G); g.set(cx - 2, 7, M.G); g.set(cx + 2, 7, M.G); g.rect(cx - 3, 11, 2, 1 + leg, M.D); g.rect(cx + 1, 11, 2, 2 - leg, M.D); } },
  sniper: { hp: 20, spd: 24, dmg: 18, r: 6, coin: 5, xp: 5, sz: [18, 16], draw(g, w, h, cx, leg) { g.ell(cx - 2, 7, 4, 4, M.P); g.rect(cx, 5, 9, 2, M.D); g.set(cx + 8, 5, M.G); g.ell(cx - 3, 6, 1.5, 1.5, M.G); g.line(cx - 4, 10, cx - 7, 15, M.D); g.line(cx - 2, 10, cx - 2 + leg, 15, M.D); g.line(cx, 10, cx + 3, 15, M.D); } },
  shield: { hp: 44, spd: 22, dmg: 10, r: 7, coin: 5, xp: 5, sz: [18, 15], armored: true, draw(g, w, h, cx, leg) { g.ell(cx - 1, 8, 6, 5, M.P); g.poly([[cx + 3, 1], [cx + 8, 3], [cx + 8, 12], [cx + 3, 14]], M.A); g.rect(cx + 5, 4, 1, 7, M.S); g.set(cx - 3, 7, M.G); g.set(cx, 7, M.G); for (let i = 0; i < 3; i++) g.line(cx - 4 + i * 3, 12, cx - 5 + i * 3 + (i % 2 ? leg : -leg), 15, M.D); } },
  splitter: { hp: 30, spd: 30, dmg: 8, r: 7, coin: 4, xp: 4, sz: [16, 14], draw(g, w, h, cx, leg) { g.ell(cx, 8, 7, 5, M.P); g.line(cx, 3, cx, 13, M.D); g.ell(cx - 3, 6, 1.5, 1.5, M.G); g.ell(cx + 3, 6, 1.5, 1.5, M.G); g.set(cx - 5, 13, M.D); g.set(cx + 5, 13 - leg, M.D); g.set(cx - 2, 4, M.S); } },
  healer: { hp: 22, spd: 26, dmg: 4, r: 6, coin: 6, xp: 6, sz: [14, 16], draw(g, w, h, cx, leg) { g.ell(cx, 6, 5, 5, M.P); g.rect(cx - 1, 3, 2, 6, M.G); g.rect(cx - 3, 5, 6, 2, M.G); for (let i = 0; i < 3; i++) g.line(cx - 3 + i * 3, 10, cx - 3 + i * 3 + (i === 1 ? 0 : leg ? 1 : -1), 15, M.S); } },
  blinker: { hp: 18, spd: 30, dmg: 14, r: 6, coin: 5, xp: 5, sz: [14, 16], draw(g, w, h, cx, leg) { g.poly([[cx, 0], [cx + 5, 7], [cx + 2, 15], [cx - 2, 15], [cx - 5, 7]], M.P); g.ell(cx, 6, 2, 2, M.W); g.set(cx, 6, M.G); g.line(cx - 5, 7, cx - 7, 11 + leg, M.D); g.line(cx + 5, 7, cx + 7, 11 - leg, M.D); } },
  leaper: { hp: 26, spd: 28, dmg: 14, r: 6, coin: 4, xp: 4, sz: [16, 14], draw(g, w, h, cx, leg) { g.ell(cx, 8, 6, 4, M.P); g.ell(cx - 3, 4, 2, 2, M.P); g.ell(cx + 3, 4, 2, 2, M.P); g.set(cx - 3, 4, M.G); g.set(cx + 3, 4, M.G); g.poly([[cx - 6, 10], [cx - 8, 13 - leg], [cx - 3, 12]], M.S); g.poly([[cx + 6, 10], [cx + 8, 13 + leg - 1], [cx + 3, 12]], M.S); } },
  turret: { hp: 60, spd: 0, dmg: 8, r: 8, coin: 7, xp: 7, sz: [16, 16], draw(g, w, h, cx) { g.rect(cx - 6, 10, 12, 5, M.A); g.rect(cx - 7, 14, 14, 2, M.D); g.ell(cx, 8, 4, 4, M.P); g.rect(cx + 2, 6, 6, 3, M.D); g.set(cx + 7, 7, M.G); g.set(cx - 1, 7, M.G); } },
  orbiter: { hp: 16, spd: 40, dmg: 7, r: 5, coin: 4, xp: 4, sz: [12, 12], draw(g, w, h, cx, leg) { g.ring(cx, 6, 3, 5, M.A); g.ell(cx, 6, 2, 2, M.G); g.set(cx, 6, M.W); g.set(cx - 5, 6 + leg, M.P); g.set(cx + 5, 6 - leg, M.P); } },
  burrower: { hp: 28, spd: 36, dmg: 14, r: 6, coin: 5, xp: 5, sz: [16, 13], draw(g, w, h, cx, leg) { g.ell(cx, 7, 6, 5, M.P); for (let i = -1; i <= 1; i++) g.poly([[cx + i * 3 - 1, 3], [cx + i * 3, 0 + leg], [cx + i * 3 + 1, 3]], M.A); g.rect(cx - 3, 8, 6, 2, M.D); g.set(cx - 2, 6, M.G); g.set(cx + 2, 6, M.G); g.rect(cx - 6, 11, 12, 2, M.S); } },
};
for (const k in FOES) ARCH[k] = FOES[k];
const ROSTER_EXTRA = { 1: ['bomber', 'splitter'], 2: ['leaper', 'bomber'], 3: ['shield', 'sniper'], 4: ['bomber', 'burrower'], 5: ['leaper', 'orbiter'], 6: ['orbiter', 'healer'], 7: ['splitter', 'shield'], 8: ['blinker', 'burrower'], 9: ['shield', 'healer'], 10: ['shield', 'turret'], 11: ['splitter', 'healer', 'turret'], 12: ['turret', 'orbiter', 'sniper'], 13: ['sniper', 'blinker', 'shield'], 14: ['burrower', 'blinker', 'orbiter'], 15: ['orbiter', 'bomber', 'sniper'], 16: ['splitter', 'healer', 'sniper'], 17: ['blinker', 'burrower', 'healer'], 18: ['bomber', 'shield', 'leaper'], 19: ['turret', 'sniper', 'blinker'], 20: ['blinker', 'healer', 'sniper', 'turret'] };
function planetRoster(pi) { const p = planetDef(pi); const b = ((pi - 1) % 20) + 1; return p.alien[2].concat(ROSTER_EXTRA[b] || []); }
// some aliens roll a twist so no two fights feel the same
function foeVariant(e, t) {
  if (e.nest || e.boss || e.arch === 'turret') return;
  const r = R0(), lateK = Math.min(1, t / 120);
  if (r < 0.1 + lateK * 0.06) { e.swift = true; e.spd *= 1.45; }
  else if (r < 0.17 + lateK * 0.08) { e.big = true; e.hp = e.maxHp = e.hp * 2.3; e.r = Math.round(e.r * 1.3); e.dmg *= 1.4; e.coin *= 2; e.xp *= 2; }
  else if (r < 0.22 + lateK * 0.08) { e.volatile = true; }
}
function foeAI(w, e, dt, c) {
  const { d, a, dx, dy, da, pl } = c; let mx = 0, my = 0;
  switch (e.arch) {
    case 'bomber':
      if (e.st === 'fuse') { e.st_t -= dt; e.windup = true; if (e.st_t <= 0) { e.dead = true; w.tele.push({ x: e.x, y: e.y, r: 30, t: 0, max: 0.05, dmg: e.dmg, col: '#ff9a3d' }); explode(w, e.x, e.y, 30, 0, PLASMA_COL); } }
      else { mx = dx / d; my = dy / d; if (da < 24) { e.st = 'fuse'; e.st_t = 0.55; wsnd(w, 'click'); } }
      break;
    case 'sniper':
      if (e.st === 'aim') {
        e.st_t -= dt; if (e.st_t > 0.35) e.aimA = Math.atan2(pl.y - 6 - e.y, pl.x - e.x);
        if (e.st_t <= 0) { e.st = 'move'; e.cd = 3.2 + R0(); w.eshots.push({ x: e.x, y: e.y - 6, vx: Math.cos(e.aimA) * 320, vy: Math.sin(e.aimA) * 320, r: 3, dmg: e.dmg, life: 1.4, col: '#fff25a', big: true }); wsnd(w, 'rifle'); }
      } else {
        if (d > 210) { mx = dx / d; my = dy / d; } else if (d < 150) { mx = -dx / d; my = -dy / d; } else { mx = -dy / d * 0.4; my = dx / d * 0.4; }
        e.cd -= dt; if (e.cd <= 0 && da < 280) { e.st = 'aim'; e.st_t = 1.05; e.aimA = a; wsnd(w, 'click'); }
      }
      break;
    case 'shield': mx = dx / d * 0.9; my = dy / d * 0.9; break;
    case 'splitter': mx = dx / d; my = dy / d; break;
    case 'healer': {
      const ally = w.ents.find(o => !o.dead && o !== e && !o.boss && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) < 160);
      const tx = ally ? ally.x : e.x - dx, ty = ally ? ally.y : e.y - dy; const ad = Math.hypot(tx - e.x, ty - e.y) || 1;
      if (d < 100) { mx = -dx / d; my = -dy / d; } else if (ally && ad > 40) { mx = (tx - e.x) / ad; my = (ty - e.y) / ad; }
      e.cd -= dt; if (e.cd <= 0) { e.cd = 3; let n = 0; for (const o of (w.ents || NO_ENTS)) if (!o.dead && !o.boss && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 80 && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.25); n++; w.fx.text(o.x, o.y - o.r - 8, '+', '#7dffb0', { f: FB, life: 0.5 }); } if (n) { w.fx.add({ x: e.x, y: e.y - 6, life: 0.5, c: '#7dffb0', s: 80, t: 'ring' }); } }
      break;
    }
    case 'blinker':
      if (e.st === 'blink') { e.st_t -= dt; if (e.st_t <= 0) { w.fx.burst(e.x, e.y - 6, 8, { c: [e.col, '#fff'], sp: 50 }); e.x = e.bx; e.y = e.by; w.fx.burst(e.x, e.y - 6, 8, { c: [e.col, '#fff'], sp: 50 }); e.st = 'slash'; e.st_t = 0.4; e.windDmg = 0; } }
      else if (e.st === 'slash') { e.st_t -= dt; e.windup = true; if (e.st_t <= 0) { e.st = 'move'; e.cd = 3 + R0(); w.tele.push({ x: e.x, y: e.y, r: 24, t: 0, max: 0.05, dmg: e.dmg, col: e.col }); } }
      else { mx = dx / d * 0.7; my = dy / d * 0.7; e.cd -= dt; if (e.cd <= 0 && da < 190) { const ba = pl.aim + Math.PI + (R0() - 0.5) * 0.8; e.bx = pl.x + Math.cos(ba) * 26; e.by = pl.y + Math.sin(ba) * 20; if (!w.solid(e.bx, e.by)) { e.st = 'blink'; e.st_t = 0.5; w.tele.push({ x: e.bx, y: e.by, r: 8, t: 0, max: 0.5, dmg: 0, col: e.col }); } else e.cd = 0.5; } }
      break;
    case 'leaper':
      if (e.st === 'crouch') { e.st_t -= dt; e.windup = true; if (e.st_t <= 0) { e.st = 'air'; e.st_t = 0; e.lx0 = e.x; e.ly0 = e.y; w.tele.push({ x: e.lx, y: e.ly, r: 26, t: 0, max: 0.6, dmg: e.dmg, col: e.col }); } }
      else if (e.st === 'air') { e.st_t += dt; const k = Math.min(1, e.st_t / 0.6); e.x = lerp(e.lx0, e.lx, k); e.y = lerp(e.ly0, e.ly, k); e.hop = Math.sin(k * Math.PI) * 18; if (k >= 1) { e.st = 'move'; e.cd = 2.6 + R0(); e.hop = 0; w.fx.burst(e.x, e.y, 10, { c: [e.col, '#fff'], sp: 70 }); } }
      else { mx = dx / d * 0.6; my = dy / d * 0.6; e.cd -= dt; if (e.cd <= 0 && da < 170) { e.st = 'crouch'; e.st_t = 0.5; e.lx = pl.x; e.ly = pl.y; e.windDmg = 0; } }
      break;
    case 'turret':
      e.cd -= dt; if (e.cd <= 0 && da < 230) { e.cd = 2.6; e.burst = 3; e.bt = 0; }
      if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.15; e.burst--; const aa = Math.atan2(pl.y - 6 - e.y, pl.x - e.x); w.eshots.push({ x: e.x, y: e.y - 8, vx: Math.cos(aa) * 120, vy: Math.sin(aa) * 120, r: 2, dmg: e.dmg, life: 2.4, col: e.col2 }); wsnd(w, 'pew'); } }
      e.face = pl.x < e.x ? -1 : 1; break;
    case 'orbiter': {
      e.oa = (e.oa === undefined ? Math.atan2(e.y - pl.y, e.x - pl.x) : e.oa) + dt * 1.1;
      const ox = pl.x + Math.cos(e.oa) * 95, oy = pl.y + Math.sin(e.oa) * 70, od = Math.hypot(ox - e.x, oy - e.y) || 1;
      mx = (ox - e.x) / od; my = (oy - e.y) / od;
      e.cd -= dt; if (e.cd <= 0 && da < 200) { e.cd = 1.8; w.eshots.push({ x: e.x, y: e.y - 4, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, r: 3, dmg: e.dmg, life: 3, col: e.col2 }); }
      break;
    }
    case 'burrower':
      if (e.st === 'move' && !e.surfaced) { e.under = true; }
      if (e.under) {
        mx = dx / d * 1.6; my = dy / d * 1.6; if (R0() < 0.5) w.fx.add({ x: e.x + (R0() - 0.5) * 8, y: e.y, vx: (R0() - 0.5) * 30, vy: -R0() * 30, life: 0.3, c: '#7a6450', s: 1, g: 120 });
        if (da < 14 && e.st !== 'rise') { e.st = 'rise'; e.st_t = 0.6; w.tele.push({ x: e.x, y: e.y, r: 20, t: 0, max: 0.6, dmg: e.dmg, col: '#c89a6a' }); }
        if (e.st === 'rise') { mx = my = 0; e.st_t -= dt; if (e.st_t <= 0) { e.under = false; e.surfaced = 2.4; e.st = 'up'; w.fx.burst(e.x, e.y, 12, { c: ['#7a6450', '#c89a6a', e.col], sp: 80, g: 200 }); } }
      } else { mx = dx / d * 0.4; my = dy / d * 0.4; e.surfaced -= dt; if (e.surfaced <= 0) { e.surfaced = 0; e.st = 'move'; } }
      break;
  }
  return [mx, my];
}
function drawFoeExtra(w, e, x, y, sh) {
  if (e.arch === 'sniper' && e.st === 'aim') { const k = e.st_t; ctx.globalAlpha = k > 0.35 ? 0.35 : (Math.floor(T_NOW * 20) % 2 ? 0.9 : 0.4); line(x, y - 8, x + Math.cos(e.aimA) * 300, y - 8 + Math.sin(e.aimA) * 300, '#fff25a'); ctx.globalAlpha = 1; }
  if (e.arch === 'bomber' && e.st === 'fuse' && Math.floor(T_NOW * 16) % 2) { ctx.globalAlpha = 0.6; circ(x, y - 6, 7, '#ff5a1e'); ctx.globalAlpha = 1; }
  if (e.swift && R0() < 0.3) px(x - e.face * 6, y - 4 + (R0() - 0.5) * 6, '#ffffff');
  if (e.volatile) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(T_NOW * 10); px(x, y - sh - 2, '#ff9a3d'); px(x - 1, y - sh - 1, '#ff9a3d'); px(x + 1, y - sh - 1, '#ff9a3d'); ctx.globalAlpha = 1; }
}
function drawBurrowMound(e, x, y) { ellipse(x, y, 7, 3, '#5a4636'); ellipse(x, y - 1, 5, 2, '#7a6450'); if (Math.floor(T_NOW * 8) % 2) px(x + (R0() - 0.5) * 8, y - 3, '#c89a6a'); }
