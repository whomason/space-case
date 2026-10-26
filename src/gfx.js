// ===== GFX: astronaut, ship, planet spheres, decorations, ores, aliens, bosses, wrecks =====
function layerCanvas(w, h, layers) {
  const c = mkCanvas(w, h);
  for (const [g, pal, pat] of layers) { g.fin(); c.x.drawImage(renderSpr(g, pal, pat), 0, 0); }
  return c;
}
function palOfItem(id, skinId) {
  if (!id) return makePal(220, 0.15, 0.7, { gh: 190 });
  const d = getDef(id);
  if (skinId) { const k = getDef(skinId); return makePal(k.ph, k.ps, k.pl, { h2: k.h2, gh: d.gh, A: METALS[k.metal](), dh: k.ph }); }
  return makePal(d.ph, d.ps, d.pl, { h2: d.h2, gh: d.gh, A: METALS[d.metal](), dh: d.ph });
}
function patOfSkin(skinId) { if (!skinId) return null; const k = getDef(skinId); return patternFn(k.pat, k.seed, 0); }

// ---------- astronaut ----------
const ASTRO = new Map();
function astroLook(eq) { return [eq.helmet, eq.chest, eq.boots, eq.jetpack, eq.skin_armor, eq.eyewear, eq.headgear, eq.back].join(','); }
// cosmetics animate: a 4-step loop shared by everything on screen
const cosAF = eq => (eq.back || eq.headgear || eq.eyewear) ? Math.floor(T_NOW * 5) % 4 : 0;
function astroSprite(eq, dir, fr) {
  const af = cosAF(eq);
  const key = astroLook(eq) + '|' + dir + '|' + fr + '|' + af;
  let c = ASTRO.get(key); if (c) return c;
  const mirror = dir === 3; if (mirror) dir = 2;
  const sk = eq.skin_armor;
  const ph = palOfItem(eq.helmet), pc = palOfItem(eq.chest), pb = palOfItem(eq.boots), pj = palOfItem(eq.jetpack);
  // body palette mixes pieces: P=suit(chest) S=helmet shell A=jetpack G=visor D=boots
  let body = { P: pc.P, S: ph.P, A: pj.P, G: ph.G, D: pb.P, Wr: WHITE_RAMP, O: pc.O };
  if (sk) { const k = getDef(sk); body = { P: ramp(k.ph, k.ps, k.pl), S: ramp(k.h2, k.ps * 0.9, clamp(k.pl * 0.85 + 0.08, 0.2, 0.85)), A: METALS[k.metal === 'gold' ? 'gold' : 'chrome'](), G: ph.G, D: ramp(k.ph, 0.3, 0.22), Wr: WHITE_RAMP, O: pc.O }; }
  const ox = 2, oy = 6, bob = (fr === 1 || fr === 3) ? 1 : 0;
  const L = [];
  // back item behind
  if (eq.back && dir !== 0) { const g = new Spr(20, 26); drawBackOnChar(g, getDef(eq.back).style, dir, ox, oy + bob, fr, af); L.push([g, palOfItem(eq.back)]); }
  else if (eq.back && dir === 0) { const g = new Spr(20, 26); drawBackOnChar(g, getDef(eq.back).style, 0, ox, oy + bob, fr, af); L.push([g, palOfItem(eq.back)]); }
  const g = new Spr(20, 26);
  const legA = fr === 1 ? -1 : fr === 3 ? 1 : 0;
  const by = oy + bob;
  if (dir === 0 || dir === 1) {
    if (dir === 1) { g.rect(ox + 3, by + 9, 10, 7, M.A); g.rect(ox + 3, by + 15, 3, 2, M.A, -1); g.rect(ox + 10, by + 15, 3, 2, M.A, -1); g.rect(ox + 7, by + 10, 2, 5, M.S); }
    g.rect(ox + 4, by + 10, 8, 5, M.P);
    g.rect(ox + 2, by + 10, 2, 4, M.P); g.rect(ox + 12, by + 10, 2, 4, M.P); g.set(ox + 2, by + 14, M.W); g.set(ox + 13, by + 14, M.W);
    g.rect(ox + 4, by + 14, 8, 1, M.A);
    g.rect(ox + 5, oy + 15 + Math.min(0, legA), 2, 3, M.P); g.rect(ox + 9, oy + 15 + Math.min(0, -legA), 2, 3, M.P);
    g.rect(ox + 4, oy + 17 + Math.min(0, legA), 3, 2, M.D); g.rect(ox + 9, oy + 17 + Math.min(0, -legA), 3, 2, M.D);
    g.ell(ox + 8, by + 5.5, 5, 4.6, M.S);
    if (dir === 0) { g.ell(ox + 8, by + 6, 3.4, 2.4, M.G); g.set(ox + 6, by + 5, M.W); g.set(ox + 7, by + 5, M.W); g.set(ox + 8, by + 11, M.G); g.rect(ox + 1, by + 10, 1, 3, M.A); g.rect(ox + 14, by + 10, 1, 3, M.A); }
    else { g.rect(ox + 6, by + 3, 4, 1, M.S, 1); }
  } else { // left-facing; right-facing is mirrored below
    g.rect(ox + 9, by + 9, 4, 6, M.A); g.rect(ox + 9, by + 15, 3, 1, M.A, -1);
    g.rect(ox + 4, by + 10, 7, 5, M.P);
    g.rect(ox + 5 + legA, oy + 15, 2, 3, M.P); g.rect(ox + 8 - legA, oy + 15, 2, 3, M.P);
    g.rect(ox + 4 + legA, oy + 17, 3, 2, M.D); g.rect(ox + 7 - legA, oy + 17, 3, 2, M.D);
    g.rect(ox + 4, by + 14, 7, 1, M.A);
    g.ell(ox + 7.5, by + 5.5, 4.6, 4.6, M.S);
    g.ell(ox + 5, by + 6, 2, 2.4, M.G); g.set(ox + 4, by + 5, M.W);
    g.rect(ox + 6, by + 11, 2, 4, M.P, 1); g.set(ox + 6, by + 14, M.W);
  }
  L.push([g, body, patOfSkin(sk)]);
  if (eq.headgear) { const h = new Spr(20, 26); drawHeadOnChar(h, getDef(eq.headgear).style, dir, ox, by, af); L.push([h, palOfItem(eq.headgear)]); }
  if (eq.eyewear && dir !== 1) { const e = new Spr(20, 26); drawEyesOnChar(e, getDef(eq.eyewear).style, dir, ox, by, af); L.push([e, palOfItem(eq.eyewear)]); }
  c = layerCanvas(20, 26, L);
  if (mirror) { const m = mkCanvas(20, 26); m.x.translate(20, 0); m.x.scale(-1, 1); m.x.drawImage(c, 0, 0); c = m; }
  ASTRO.set(key, c); if (ASTRO.size > 700) ASTRO.delete(ASTRO.keys().next().value);
  return c;
}
function drawEyesOnChar(g, st, dir, ox, by, af = 0) {
  const y = by + 5;
  if (dir === 0) {
    switch (st) {
      case 'PIXEL SHADES': g.rect(ox + 4, y, 8, 1, M.D); g.rect(ox + 4, y + 1, 3, 1, M.D); g.rect(ox + 9, y + 1, 3, 1, M.D); g.set(ox + 5 + (af % 2) * 4, y + 1, M.W); break;
      case 'MONOCLE': g.ring(ox + 10, y + 1, 1, 1.6, M.A); if (af === 1) g.set(ox + 10, y, M.W); g.set(ox + 11, y + 3 + (af % 2), M.A); break;
      case 'GOGGLES': g.rect(ox + 3, y, 10, 1, M.P); g.rect(ox + 5, y, 2, 2, M.G); g.rect(ox + 9, y, 2, 2, M.G); g.set([ox + 5, ox + 6, ox + 9, ox + 10][af], y, M.W); break;
      case 'VISOR SHADES': case 'SPORT SHADES': g.rect(ox + 4, y, 8, 2, M.G); g.set(ox + 4 + af * 2, y, M.W); break;
      case 'LASER EYES': { const n = 1 + af; g.set(ox + 6, y + 1, M.G); g.set(ox + 10, y + 1, M.G); g.rect(ox + 6, y + 2, 1, n, M.G); g.rect(ox + 10, y + 2, 1, n, M.G); if (af === 3) { g.set(ox + 5, y + 2 + n, M.W); g.set(ox + 11, y + 2 + n, M.W); } break; }
      case '3D GLASSES': g.rect(ox + 5, y, 2, 2, af % 2 ? M.G : M.P); g.rect(ox + 9, y, 2, 2, af % 2 ? M.P : M.G); g.rect(ox + 7, y, 2, 1, M.W); break;
      case 'HEART SHADES': case 'STAR SHADES': { const p = af === 1 ? 1 : 0; g.rect(ox + 5 - p, y - p, 2 + p, 2 + p, M.G); g.rect(ox + 9, y - p, 2 + p, 2 + p, M.G); g.rect(ox + 7, y, 2, 1, M.A); if (af === 2) g.set(ox + 5, y, M.W); break; }
      default: g.rect(ox + 5, y, 2, 2, M.G); g.rect(ox + 9, y, 2, 2, M.G); g.rect(ox + 7, y, 2, 1, M.A); g.set([ox + 5, ox + 6, ox + 9, ox + 10][af], y, M.W);
    }
  } else { const x = dir === 2 ? ox + 3 : ox + 11; g.rect(x, y, 2, 2, st === 'PIXEL SHADES' ? M.D : M.G); g.rect(dir === 2 ? x + 2 : x - 3, y, 3, 1, M.A); if (af % 2) g.set(x + (af === 1 ? 0 : 1), y, M.W); if (st === 'LASER EYES') g.rect(dir === 2 ? x - 1 - af : x + 2, y + 1, 1 + af, 1, M.G); }
}
function drawHeadOnChar(g, st, dir, ox, by, af = 0) {
  const cx = ox + (dir === 2 ? 7 : dir === 3 ? 8 : 8), top = by + 1;
  const tw = [0, 1, 0, -1][af];
  switch (st) {
    case 'CAP': g.ell(cx, top + 1, 4, 2, M.P); g.rect(cx - 4, top + 2, 9, 1, M.P); if (dir === 0) g.rect(cx - 3, top + 3, 7, 1, M.S); else if (dir >= 2) g.rect(dir === 2 ? cx - 6 : cx + 3, top + 2, 3, 1, M.S); g.set(cx - 3 + af * 2, top, M.W); break;
    case 'CROWN': g.rect(cx - 3, top, 7, 2, M.A); g.set(cx - 3, top - 1, M.A); g.set(cx, top - 2, M.A); g.set(cx, top - 1, M.A); g.set(cx + 3, top - 1, M.A); g.set(cx, top, af === 0 ? M.W : M.G); if (af === 2) { g.set(cx + 4, top - 3, M.W); g.set(cx + 4, top - 4, M.G); } if (af === 3) g.set(cx - 4, top - 2, M.W); break;
    case 'ANTENNA': { const sw = tw; g.line(cx + 2, top, cx + 3 + sw, top - 4, M.D); g.ell(cx + 3 + sw, top - 5, 1, 1, af % 2 ? M.W : M.G); if (af === 1) { g.set(cx + 1 + sw, top - 7, M.G); g.set(cx + 5 + sw, top - 7, M.G); } break; }
    case 'HALO': { const hy = top - 4 - (af === 1 || af === 2 ? 1 : 0); g.rect(cx - 4, hy, 9, 1, M.G); g.rect(cx - 3, hy - 1, 7, 1, M.G); g.rect(cx - 2, hy, 5, 1, 0); if (af === 2) g.set(cx + 3, hy - 1, M.W); if (af === 0) g.set(cx - 3, hy - 1, M.W); break; }
    case 'HORNS': g.line(cx - 4, top + 2, cx - 6, top - 2, M.P, 0, 2); g.line(cx + 4, top + 2, cx + 6, top - 2, M.P, 0, 2); if (af % 2) { g.set(cx - 6, top - 2, M.G); g.set(cx + 6, top - 2, M.G); } break;
    case 'MOHAWK': for (let i = -2; i <= 2; i++) { const h = 3 - Math.abs(i) + ((i + 2 + af) % 4 === 0 ? 1 : 0); g.rect(cx + i, top + 1 - h, 1, h, i % 2 ? M.P : M.S); } break;
    case 'TOP HAT': g.rect(cx - 4, top + 1, 9, 1, M.D); g.rect(cx - 2, top - 5, 5, 6, M.D); g.rect(cx - 2, top - 1, 5, 1, M.P); g.set(cx - 2 + af, top - 1, M.W); if (af === 3) g.set(cx + 1, top - 5, M.W); break;
    case 'PROPELLER CAP': g.ell(cx, top + 1, 3.5, 1.6, M.P); g.set(cx, top - 1, M.A); if (af % 2) g.rect(cx - 3, top - 2, 7, 1, M.G); else { g.rect(cx - 1, top - 2, 3, 1, M.G); g.set(cx - 2, top - 3, M.G); g.set(cx + 2, top - 1, M.G); } break;
    case 'BUNNY EARS': { const d = af === 2 ? 2 : 0; g.rect(cx - 3, top - 6, 2, 7, M.P); g.rect(cx + 2, top - 6 + d, 2, 7 - d, M.P); g.rect(cx - 3, top - 5, 1, 4, M.S); g.rect(cx + 2, top - 5 + d, 1, 4 - d, M.S); if (d) g.set(cx + 4, top - 4, M.P); break; }
    case 'CAT EARS': { const tw2 = af === 3 ? 1 : 0; g.poly([[cx - 5, top + 1], [cx - 4, top - 3], [cx - 1, top]], M.P); g.poly([[cx + 1, top], [cx + 4 + tw2, top - 3 - tw2], [cx + 5, top + 1]], M.P); break; }
    case 'PARTY HAT': g.poly([[cx - 3, top + 1], [cx, top - 6], [cx + 3, top + 1]], M.P); g.set(cx, top - 6, af % 2 ? M.W : M.G); g.set(cx - 1, top - 2 + (af === 2 ? 1 : 0), M.S); g.set(cx + 1, top - 1 - (af === 2 ? 1 : 0), M.S); if (af === 1) { g.set(cx - 2, top - 7, M.G); g.set(cx + 2, top - 8, M.S); } break;
    case 'WIZARD HAT': g.rect(cx - 5, top + 1, 11, 1, M.P); g.poly([[cx - 3, top + 1], [cx - 1, top - 5], [cx + 3 + tw, top - 7], [cx + 3, top + 1]], M.P); g.set(cx, top - 2, af % 2 ? M.W : M.G); if (af === 2) { g.set(cx + 5, top - 6, M.G); g.set(cx - 4, top - 3, M.W); } break;
    case 'FLOWER': g.ell(cx + 4 + tw, top + 1, 2, 2, M.P); g.set(cx + 4 + tw, top + 1, af === 0 ? M.W : M.G); break;
    case 'BANDANA': g.rect(cx - 4, top + 1, 9, 2, M.P); g.set(cx - 2, top + 1, M.W); g.set(cx + 1, top + 1, M.W); if (dir !== 0) { const fx = dir === 2 ? cx + 4 : cx - 6; g.rect(fx, top + 2, 2, 2, M.P); g.set(dir === 2 ? fx + 2 : fx - 1, top + 2 + (af % 2), M.P); } break;
    case 'BEANIE': { const b = af === 1 ? 1 : 0; g.ell(cx, top + 1, 4.5, 2.5, M.P); g.rect(cx - 4, top + 2, 9, 1, M.S); g.set(cx, top - 2 - b, M.G); g.set(cx, top - 1 - b, M.G); break; }
    default: { const b = af === 2 ? 1 : 0; g.ell(cx, top - 2 - b, 4, 3, M.W); g.rect(cx - 3, top, 7, 2, M.W); if (af === 1) g.set(cx + 2, top - 4, M.S); }
  }
}
function drawBackOnChar(g, st, dir, ox, by, fr, af = 0) {
  const cx = ox + 8, y = by + 9, sw = (fr === 1 || fr === 3 ? 1 : 0), fl = [0, 1, 2, 1][af], wv = [0, 1, 0, -1][af];
  if (dir === 0) { // peeking out from behind
    if (st === 'WINGS' || st === 'MECH WINGS' || st === 'BAT WINGS' || st === 'FAIRY WINGS' || st === 'SOLAR PANELS') { const m = st === 'FAIRY WINGS' ? M.G : M.P; g.poly([[cx - 6, y + 1], [cx - 9 - (fl > 1 ? 1 : 0), y - 4 - sw - fl], [cx - 8, y + 4]], m); g.poly([[cx + 6, y + 1], [cx + 9 + (fl > 1 ? 1 : 0), y - 4 - sw - fl], [cx + 8, y + 4]], m); if (st === 'FAIRY WINGS' && af === 1) { g.set(cx - 10, y - 6, M.W); g.set(cx + 10, y - 6, M.W); } }
    else if (st === 'CAPE') { g.rect(cx - 6 - (af === 2 ? 1 : 0), y + 2, 2, 7, M.P); g.rect(cx + 5 + (af === 2 ? 1 : 0), y + 2, 2, 7, M.P); }
    else if (st === 'BANNER' || st === 'GUITAR') { g.line(cx + 6, y + 6, cx + 8, y - 7, M.A); if (st === 'BANNER') g.rect(cx + 8, y - 7 + wv, 3, 3, M.P); }
    else if (st === 'ROCKET FINS' && af % 2) { g.set(cx - 5, y + 9, M.G); g.set(cx + 5, y + 9, M.G); }
    return;
  }
  switch (st) {
    case 'CAPE': { const f2 = sw + fl; if (dir === 1) g.poly([[cx - 5, y], [cx + 5, y], [cx + 6 + f2, y + 10 - (af === 2 ? 1 : 0)], [cx - 6 - f2, y + 10 - (af === 0 ? 1 : 0)]], M.P); else { const s = dir === 2 ? 1 : -1; g.poly([[cx + s * 1, y], [cx + s * 4, y], [cx + s * (8 + f2 * 2), y + 9 - fl], [cx + s * 3, y + 10]], M.P); } break; }
    case 'WINGS': case 'BAT WINGS': case 'FAIRY WINGS': case 'MECH WINGS': {
      const m = st === 'FAIRY WINGS' ? M.G : st === 'MECH WINGS' ? M.A : M.P; const up = sw + fl * 2;
      if (dir === 1) { g.poly([[cx - 2, y + 1], [cx - 10, y - 4 - up], [cx - 9, y + 4 - fl], [cx - 3, y + 5]], m); g.poly([[cx + 2, y + 1], [cx + 10, y - 4 - up], [cx + 9, y + 4 - fl], [cx + 3, y + 5]], m); if (st === 'BAT WINGS') { g.set(cx - 7, y + 3 - fl, 0); g.set(cx + 7, y + 3 - fl, 0); } }
      else { const s = dir === 2 ? 1 : -1; g.poly([[cx + s * 2, y + 1], [cx + s * 9, y - 5 - up], [cx + s * 9, y + 4 - fl], [cx + s * 3, y + 6]], m); }
      if (st === 'MECH WINGS') g.set(cx + (dir === 3 ? -6 : 6), y - 2 - fl, af % 2 ? M.W : M.G);
      if (st === 'FAIRY WINGS' && af === 1) { g.set(cx - 8, y - 7, M.W); g.set(cx + 8, y - 7, M.W); }
      break;
    }
    case 'BANNER': { const x = dir === 3 ? cx - 4 : cx + 3, s2 = dir === 3 ? -1 : 1; g.line(x, y + 6, x, y - 9, M.A); g.poly([[x, y - 9], [x + s2 * 4, y - 8 + wv], [x + s2 * 7, y - 7 + sw - wv], [x, y - 4]], M.P); break; }
    case 'BACKPACK': g.rect(dir === 1 ? cx - 4 : dir === 2 ? cx + 2 : cx - 6, y, dir === 1 ? 8 : 4, 6, M.P); if (af < 2) g.set(dir === 1 ? cx + 2 : dir === 2 ? cx + 4 : cx - 5, y + 1, M.G); break;
    case 'SOLAR PANELS': g.rect(cx - 10, y - 3 - (af === 1 ? 1 : 0), 6, 5, M.G); g.rect(cx + 5, y - 3 - (af === 1 ? 1 : 0), 6, 5, M.G); g.rect(cx - 4, y - 1, 9, 1, M.A); g.set(cx - 10 + af * 2, y - 3, M.W); g.set(cx + 5 + af * 2, y - 3, M.W); break;
    case 'ROCKET FINS': g.poly([[cx - 3, y], [cx - 7, y + 8], [cx - 3, y + 6]], M.P); g.poly([[cx + 3, y], [cx + 7, y + 8], [cx + 3, y + 6]], M.P); g.rect(cx - 6, y + 9, 2, 1 + (af % 2), M.G); g.rect(cx + 5, y + 9, 2, 1 + ((af + 1) % 2), M.G); break;
    default: g.ell(dir === 3 ? cx - 4 : cx + 4, y + 3, 3, 3, M.P); g.line(cx, y + 2, dir === 3 ? cx + 4 : cx - 4, y - 7, M.D); if (af === 1) g.set(dir === 3 ? cx - 4 : cx + 4, y + 3, M.W);
  }
}

// ---------- ship composite (48x32, facing right) ----------
const SHIPS = new Map();
function shipSprite(eq) {
  const key = SLOTS_SHIP.map(s => eq[s]).join(',') + eq.skin_ship;
  let c = SHIPS.get(key); if (c) return c;
  const sk = eq.skin_ship;
  const ph = palOfItem(eq.hull, sk), pe = palOfItem(eq.engine), pc = palOfItem(eq.cargo, sk), ps = palOfItem(eq.scanner), psh = palOfItem(eq.shield);
  const rh = RNG(eq.hull ? getDef(eq.hull).seed : 1), re = RNG(eq.engine ? getDef(eq.engine).seed : 2), rc = RNG(eq.cargo ? getDef(eq.cargo).seed : 3), rs = RNG(eq.scanner ? getDef(eq.scanner).seed : 4);
  const hr = eq.hull ? getDef(eq.hull).r : 0, er = eq.engine ? getDef(eq.engine).r : 0, cr = eq.cargo ? getDef(eq.cargo).r : 0;
  const L = [];
  // engine
  const ge = new Spr(48, 32); const ne = 1 + Math.min(2, Math.floor(er / 2) + re.int(2)); const eh = 4 + Math.floor(er / 2);
  ge.rect(5, 16 - eh - 1, 6, eh * 2 + 2, M.P);
  const ys = ne === 1 ? [16] : ne === 2 ? [12.5, 19.5] : [10.5, 16, 21.5];
  for (const y of ys) { ge.poly([[6, y - 2], [1, y - 3.5], [1, y + 3.5], [6, y + 2]], M.A); ge.set(2, Math.round(y), M.G); }
  if (er >= 3) { ge.rect(6, 16 - eh - 3, 3, 2, M.S); ge.rect(6, 16 + eh + 1, 3, 2, M.S); }
  L.push([ge, pe]);
  // cargo
  const gc = new Spr(48, 32); const cl = 10 + cr * 2 + rc.int(4);
  if (rc.chance(0.5)) { gc.rect(13, 21, cl, 6, M.P); for (let x = 16; x < 13 + cl; x += 4) gc.rect(x, 21, 1, 6, M.S); gc.set(13 + cl - 2, 23, M.G); }
  else { gc.rect(14, 4, cl - 2, 5, M.P); gc.rect(14, 23, cl - 2, 5, M.P); gc.set(15, 6, M.G); gc.set(15, 25, M.G); }
  L.push([gc, pc, patOfSkin(sk)]);
  // hull
  const gh = new Spr(48, 32); const nose = 38 + Math.min(8, hr + rh.int(3)), bh = 5 + rh.int(2) + Math.floor(hr / 3);
  gh.poly([[9, 16 - bh], [30, 16 - bh - 1], [nose, 15], [nose, 17], [30, 16 + bh + 1], [9, 16 + bh]], M.P);
  const wt = rh.int(3);
  if (wt === 0) { gh.poly([[14, 16 - bh], [24, 16 - bh], [16, 2], [11, 2]], M.S); gh.poly([[14, 16 + bh], [24, 16 + bh], [16, 30], [11, 30]], M.S); }
  else if (wt === 1) { gh.poly([[18, 16 - bh], [28, 16 - bh], [26, 4], [20, 6]], M.S); gh.poly([[18, 16 + bh], [28, 16 + bh], [26, 28], [20, 26]], M.S); }
  else { gh.rect(12, 16 - bh - 5, 10, 5, M.S); gh.rect(12, 16 + bh + 1, 10, 5, M.S); }
  gh.ell(31, 15, 4.5, 2.4, M.G); gh.set(29, 14, M.W); gh.set(30, 14, M.W);
  gh.rect(12, 16, 16, 1, M.S, -1);
  if (hr >= 4) { gh.rect(nose - 6, 15, 5, 1, M.A); }
  L.push([gh, ph, patOfSkin(sk)]);
  // scanner
  const gs = new Spr(48, 32); const sx = 24 + rs.int(4);
  gs.line(sx, 16 - bh - 1, sx, 16 - bh - 5, M.A); for (let x = -3; x <= 3; x++) gs.set(sx + x, 16 - bh - 6 + Math.round(x * x * 0.25), M.P); gs.set(sx, 16 - bh - 6, M.G);
  L.push([gs, ps]);
  // shield nodes
  const gsh = new Spr(48, 32); gsh.set(nose - 1, 12, M.G); gsh.set(13, 7, M.G); gsh.set(13, 25, M.G);
  L.push([gsh, psh]);
  c = layerCanvas(48, 32, L);
  c.shieldCol = hex(psh.G[3]); c.flameCol = [hex(pe.G[4]), hex(pe.G[3]), hex(pe.G[2])]; c.ys = ys; c.nose = nose;
  SHIPS.set(key, c); if (SHIPS.size > 30) SHIPS.delete(SHIPS.keys().next().value);
  return c;
}
function drawShip(eq, x, y, sc = 1, t = 0, o = {}) {
  const c = shipSprite(eq);
  // flames
  for (const yy of c.ys) {
    const L = (4 + Math.sin(t * 30 + yy) * 1.5 + (o.thrust || 0) * 10) * sc;
    for (let i = 0; i < 3; i++) { const k = i / 3; rect(x + (1 - (L / sc) * (1 - k)) * sc - L * k, y + (yy - 1.5 + k) * sc, L * (1 - k) + sc, (3 - k * 2) * sc, c.flameCol[i]); }
  }
  ctx.drawImage(c, Math.floor(x), Math.floor(y), 48 * sc, 32 * sc);
  if (o.shield) { ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 3); ctx.strokeStyle = c.shieldCol; ctx.lineWidth = sc; ctx.beginPath(); ctx.ellipse(x + 26 * sc, y + 16 * sc, 26 * sc, 16 * sc, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}

// ---------- planet spheres ----------
const PTEX = new Map();
function planetTex(p) {
  const key = p.i; let t = PTEX.get(key); if (t) return t;
  const TW = 128, TH = 64, R = RNG(p.i * 977 + 3), nz = makeNoise(p.i * 131 + 7);
  const d = new Uint8ClampedArray(TW * TH * 3);
  const g1 = p.g, g2 = p.g2, oc = p.ore[2] < 0 ? [300, .7, .7] : [p.ore[2], p.ore[3], p.ore[4]];
  const L = p.liq ? [p.liq[1], p.liq[2], p.liq[3]] : null;
  const C = (h, s, l) => hsl(h, s, l);
  const craters = []; for (let i = 0; i < 26; i++) craters.push([R() * TW, R() * TH, R.range(2, 7)]);
  const cells = []; for (let i = 0; i < 40; i++) cells.push([R() * TW, R() * TH, R()]);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const u = x / TW * 8, v = y / TH * 4;
    const n = nz.fbm(u, v, 5, 8), n2 = nz.fbm(u * 2 + 9, v * 2 + 3, 3, 16);
    let c = n > 0.5 ? C(g1[0], g1[1], g1[2]) : C(g2[0], g2[1], g2[2]);
    const lat = Math.abs(y / TH - 0.5) * 2;
    switch (p.sph) {
      case 'moon': { c = C(g1[0], g1[1], lerp(g2[2], g1[2] + 0.1, n)); for (const [cx, cy, r] of craters) { let dx = Math.abs(x - cx); dx = Math.min(dx, TW - dx); const dd = Math.hypot(dx, (y - cy) * 1.4); if (dd < r) c = C(g2[0], g2[1], g2[2] * (dd > r - 1.2 ? 1.35 : 0.8)); } break; }
      case 'jungle': c = n > 0.55 ? C(115, .5, .25) : n > 0.42 ? C(g1[0], g1[1], g1[2]) : L ? C(L[0], L[1], L[2] + .1) : c; if (n2 > 0.68) c = C(355, .7, .5); break;
      case 'ice': c = C(205, .3, lerp(.68, .92, n)); if (Math.abs(n2 - 0.5) < 0.02) c = C(212, .5, .45); if (lat > 0.75) c = C(200, .2, .95); break;
      case 'lava': c = C(262, .12, lerp(.08, .22, n)); if (Math.abs(n - 0.5) < 0.035) c = C(20, 1, .55); else if (Math.abs(n - 0.5) < 0.06) c = C(8, .9, .35); break;
      case 'salt': c = C(345, .35, lerp(.72, .9, n)); if (n2 > 0.66) c = C(176, .55, .5); if ((x + y * 2) % 11 === 0 && n > 0.5) c = C(340, .2, .95); break;
      case 'gas': { const b = Math.sin(y * 0.35 + nz.fbm(u, v * 0.5, 3, 8) * 5); c = b > 0.3 ? C(260, .45, .8) : b > -0.3 ? C(200, .5, .72) : C(320, .4, .78); break; }
      case 'desert': c = C(40, .35, lerp(.55, .75, n)); if (n2 > 0.72) c = C(45, .2, .92); break;
      case 'dark': c = C(252, .35, lerp(.04, .14, n)); if (n2 > 0.74) c = n2 > 0.8 ? C(185, 1, .6) : C(310, 1, .6); break;
      case 'reef': c = C(20, .5, lerp(.5, .66, n)); if (n2 > 0.64) c = C(320, .75, .6); else if (n2 < 0.32) c = C(178, .7, .5); break;
      case 'metal': c = C(220, .12, lerp(.25, .45, n)); if (x % 16 === 0 || y % 10 === 0) c = C(220, .15, .18); if (n2 > 0.72) c = C(262, .3, .1); break;
      case 'fungal': c = C(285, .35, lerp(.18, .34, n)); if (n2 > 0.7) c = C(88, .9, .55); break;
      case 'rust': c = C(14, .55, lerp(.28, .46, n)); if (Math.abs(n2 - 0.5) < 0.03) c = C(10, .5, .16); break;
      case 'tundra': c = n > 0.52 ? C(200, .2, .86) : C(160, .25, .45); if (lat > 0.7) c = C(195, .2, .95); break;
      case 'desert2': c = C(42, .7, .5 + Math.sin(x * 0.2 + n * 8) * 0.08 + 0.05); break;
      case 'storm': { const s = nz.fbm(u + Math.sin(v) * 2, v, 4, 8); c = C(250, .3, lerp(.12, .35, s)); if (n2 > 0.75) c = C(56, 1, .65); break; }
      case 'crystal': { let best = 1e9, bi = 0; for (let i = 0; i < cells.length; i++) { let dx = Math.abs(x - cells[i][0]); dx = Math.min(dx, TW - dx); const dd = dx * dx + (y - cells[i][1]) ** 2; if (dd < best) { best = dd; bi = i; } } c = C(cells[bi][2] * 360, .45, .82); break; }
      case 'ocean': c = C(205, .55, lerp(.06, .2, n)); if (n2 > 0.76) c = C(185, 1, .6); break;
      case 'ash': c = C(20, .06, lerp(.2, .38, n)); if (Math.abs(n2 - 0.5) < 0.02) c = C(22, 1, .55); break;
      case 'clock': { const rr = Math.hypot(x % 32 - 16, y - 32); c = C(40, .4, lerp(.35, .55, n)); if (Math.abs(rr % 8 - 4) < 0.6) c = C(42, .7, .62); if (n2 > 0.72) c = C(170, .65, .5); break; }
      case 'gold': c = C(48, .5, lerp(.62, .82, n)); if ((x % 12 === 0 && y % 4 !== 0) || (y % 9 === 0 && x % 3 !== 0)) c = n2 > 0.5 ? C(185, 1, .65) : C(45, .7, .5); break;
    }
    if (L && p.sph !== 'gas' && p.sph !== 'jungle' && n < 0.36 && p.sph !== 'crystal') c = C(L[0], L[1], L[2]);
    const o = (y * TW + x) * 3; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
  }
  t = { d, TW, TH }; PTEX.set(key, t); return t;
}
function renderSphere(p, R, rot, opt = {}) {
  const tx = planetTex(p), size = R * 2 + 1 + (opt.atmo !== false && p.atmo ? 4 : 0) * 2;
  const pad = (size - (R * 2 + 1)) >> 1;
  const c = opt.canvas && opt.canvas.width === size ? opt.canvas : mkCanvas(size, size);
  const id = c.x.createImageData(size, size), d = id.data;
  const lx = -0.55, ly = -0.45, lz = 0.7; const atm = p.atmo ? hsl(p.atmo[0], p.atmo[1], p.atmo[2]) : null;
  const dim = opt.dim ? 0.6 : 1;
  for (let y = -R - pad; y <= R + pad; y++) for (let x = -R - pad; x <= R + pad; x++) {
    const nx = x / R, ny = y / R, rr = nx * nx + ny * ny;
    const o = ((y + R + pad) * size + (x + R + pad)) * 4;
    if (rr > 1) {
      if (atm && rr < Math.pow(1 + pad / R, 2)) { const k = 1 - (Math.sqrt(rr) - 1) / (pad / R); if (dith(x + 64, y + 64, k * 0.8)) { d[o] = atm[0] * dim; d[o + 1] = atm[1] * dim; d[o + 2] = atm[2] * dim; d[o + 3] = 200; } }
      continue;
    }
    const nz = Math.sqrt(1 - rr);
    let lon = Math.atan2(nx, nz) + rot, lat = Math.asin(ny);
    let u = ((lon / TAU) % 1 + 1) % 1, v = lat / Math.PI + 0.5;
    const ti = (Math.min(tx.TH - 1, Math.floor(v * tx.TH)) * tx.TW + Math.floor(u * tx.TW)) * 3;
    let l = nx * lx + ny * ly + nz * lz; l = Math.max(0, l);
    let k = 0.18 + 0.82 * l; const q = k * 4; k = (Math.floor(q) + (dith(x + 64, y + 64, q - Math.floor(q)) ? 1 : 0)) / 4;
    k = Math.max(0.12, Math.min(1.1, k + 0.05));
    let r = tx.d[ti] * k, g = tx.d[ti + 1] * k, b = tx.d[ti + 2] * (k * 0.9 + 0.1);
    if (atm && rr > 0.82) { const a = (rr - 0.82) / 0.18 * 0.5; r = lerp(r, atm[0], a); g = lerp(g, atm[1], a); b = lerp(b, atm[2], a); }
    if (opt.dim) { const gy = (r + g + b) / 3; r = lerp(r, gy, 0.5); g = lerp(g, gy, 0.5); b = lerp(b, gy, 0.4); }
    d[o] = r * dim; d[o + 1] = g * dim; d[o + 2] = b * dim; d[o + 3] = 255;
  }
  c.x.putImageData(id, 0, 0); c.pad = pad; return c;
}
function drawRings(p, cx, cy, R, front, dim = 1) {
  if (!p.rings) return;
  const col = p.atmo ? hsl(p.atmo[0], p.atmo[1] * 0.6, Math.min(0.85, p.atmo[2] + 0.1)) : [200, 200, 220];
  const col2 = mix(col, [20, 20, 40], 0.4);
  for (let a = 0; a < TAU; a += 0.012) {
    const s = Math.sin(a); if ((s > 0) !== front) continue;
    for (const [rr, cc] of [[1.55, col], [1.75, col2], [1.95, col]]) {
      const x = cx + Math.cos(a) * R * rr, y = cy + s * R * rr * 0.28;
      if (!front && Math.hypot(x - cx, y - cy) < R) continue;
      ctx.fillStyle = rgba(cc.map(v => v * dim), 0.9); ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
  }
}

// ---------- decorations ----------
function decoSprite(kind, prm, seed, P) {
  const R = RNG(seed); let g, w, h, rr = 0, solid = true;
  const pal = (c, o = {}) => makePal(c[0], c[1], c[2], Object.assign({ h2: c[0] + 15, gh: o.gh !== undefined ? o.gh : c[0] }, o));
  let palette;
  switch (kind) {
    case 'rock': {
      const sz = prm.sz || 1; w = Math.round(R.ir(12, 22) * sz) + 2; h = Math.round(w * 0.78) + 2; g = new Spr(w, h);
      g.ell(w / 2, h / 2 + 1, w / 2 - 1.5, h / 2 - 1.5, M.P);
      for (let i = 0; i < 6; i++) { const a = R() * TAU; g.ell(w / 2 + Math.cos(a) * w * 0.25, h / 2 + Math.sin(a) * h * 0.2, w * 0.18, h * 0.16, M.P); }
      for (let i = 0; i < 3; i++) { const x = R.ir(3, w - 4), y = R.ir(3, h - 3); g.line(x, y, x + R.ir(-3, 3), y + R.ir(1, 3), prm.glow ? M.G : M.D); }
      if (prm.snow) for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (g.get(x, y) === M.P && g.get(x, y - 1) === 0 && y < h * 0.6) { g.set(x, y, M.W); g.set(x, y + 1, M.W); }
      rr = w * 0.36; palette = pal(prm.c, { gh: prm.glow ? prm.glow[0] : prm.c[0], A: METALS.steel() }); if (prm.glow) palette.G = ramp(prm.glow[0], prm.glow[1], prm.glow[2]);
      break;
    }
    case 'mushroom': case 'fungaltree': {
      const big = kind === 'fungaltree'; w = R.ir(big ? 20 : 14, big ? 30 : 26); h = R.ir(big ? 34 : 18, big ? 46 : 32); g = new Spr(w, h);
      const sw = Math.max(3, Math.round(w * 0.18)); g.rect(Math.floor(w / 2 - sw / 2), Math.floor(h * 0.35), sw, h - Math.floor(h * 0.35) - 1, M.S);
      const cw = w / 2 - 1, chh = h * (big ? 0.22 : 0.26); g.ell(w / 2, chh + 1, cw, chh, prm.glow || big ? M.G : M.P); g.rect(1, Math.floor(chh + 1), w - 2, Math.ceil(chh), 0);
      g.ell(w / 2, chh + 1, cw, chh * 0.55, prm.glow || big ? M.G : M.P);
      for (let i = 0; i < 4; i++) g.set(R.ir(3, w - 4), R.ir(2, Math.floor(chh)), M.W);
      if (big) for (let i = 0; i < 3; i++) { const x = R.ir(3, w - 4); g.rect(x, Math.floor(chh + 1), 1, R.ir(2, 5), M.G); }
      rr = sw + 2;
      const cap = prm.caps ? R.pick(prm.caps) : (prm.glow || prm.c);
      palette = makePal(cap[0], cap[1], cap[2], { gh: cap[0], gl: Math.min(0.7, cap[2] + 0.1) }); const st = prm.stem || prm.c; palette.S = ramp(st[0], st[1], st[2]);
      break;
    }
    case 'bush': { w = R.ir(14, 22); h = R.ir(12, 18); g = new Spr(w, h); for (let i = 0; i < 6; i++) g.ell(R.range(w * 0.3, w * 0.7), R.range(h * 0.35, h * 0.65), R.range(3, 6), R.range(3, 5), i % 2 ? M.P : M.S); rr = w * 0.35; palette = pal(prm.c, { h2: prm.c[0] + 20 }); break; }
    case 'fern': case 'pebble': {
      solid = false;
      if (kind === 'pebble') { w = R.ir(3, 6); h = w - 1; g = new Spr(w + 2, h + 2); g.ell((w + 2) / 2, (h + 2) / 2, w / 2 - 0.5, h / 2 - 0.5, M.P); w += 2; h += 2; }
      else { w = 11; h = 10; g = new Spr(w, h); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; g.line(5, 9, 5 + Math.cos(a) * 5, 9 + Math.sin(a) * 7, i % 2 ? M.P : M.S); } }
      palette = pal(prm.c); break;
    }
    case 'crystal': case 'shard': {
      w = R.ir(14, 22); h = R.ir(20, 36); g = new Spr(w, h); const n = R.ir(3, 5);
      for (let i = 0; i < n; i++) {
        const cx = R.range(w * 0.25, w * 0.75), ht = R.range(h * 0.4, h - 1) * (i === 0 ? 1 : 0.75), bw = R.range(2, kind === 'shard' ? 3 : 4), lean = R.range(-3, 3);
        g.poly([[cx - bw, h - 1], [cx - bw + lean * 0.5, h - ht + 3], [cx + lean, h - ht], [cx + bw + lean * 0.5, h - ht + 3], [cx + bw, h - 1]], i % 2 ? M.S : M.P);
        g.line(cx + lean * 0.5, h - ht + 2, cx, h - 2, M.W);
      }
      rr = w * 0.3; palette = pal(prm.c, { h2: prm.c[0] + 25, l2: Math.min(0.9, prm.c[2] + 0.05) }); break;
    }
    case 'prism': {
      w = R.ir(18, 26); h = R.ir(36, 50); g = new Spr(w, h);
      g.poly([[2, h - 1], [w / 2, 1], [w - 2, h - 1]], M.P); for (let y = 4; y < h; y += 5) g.line(4, y + 3, w - 4, y, [M.S, M.G, M.A, M.W][(y / 5) % 4 | 0]);
      g.line(w / 2, 2, w / 2, h - 2, M.W); rr = w * 0.3; palette = { P: ramp(300, .5, .82), S: ramp(190, .6, .78), G: ramp(55, .8, .8), A: ramp(130, .5, .78), D: ramp(260, .3, .3), Wr: WHITE_RAMP, O: hsl(270, .5, .2) }; break;
    }
    case 'cube': {
      w = R.ir(14, 20); h = R.ir(14, 22); g = new Spr(w, h); const n = R.ir(2, 4);
      for (let i = 0; i < n; i++) { const s = R.ir(4, 7), x = R.ir(1, w - s - 2), y = R.ir(Math.max(1, h - s * 2 - 6), h - s - 2); g.rect(x, y + 2, s, s, M.S); g.poly([[x, y + 2], [x + 2, y], [x + s + 2, y], [x + s, y + 2]], M.W); g.rect(x + s, y, 2, s + 1, M.P, -1); }
      rr = w * 0.3; palette = pal(prm.c); break;
    }
    case 'ribs': {
      w = R.ir(26, 34); h = R.ir(20, 28); g = new Spr(w, h); g.rect(2, h - 4, w - 4, 2, M.P);
      for (let x = 4; x < w - 3; x += 4) { const ht = h - 4 - Math.abs(x - w / 2) * 0.6; for (let y = 0; y < ht; y++) g.set(x + Math.round(Math.sin(y / ht * 2.4) * 2), h - 4 - y, M.P); }
      rr = w * 0.3; palette = pal(prm.c); break;
    }
    case 'skull': { w = 20; h = 16; g = new Spr(w, h); g.ell(10, 7, 8, 6, M.P); g.rect(5, 11, 10, 4, M.P); g.ell(6.5, 7, 2, 2, M.D); g.ell(13.5, 7, 2, 2, M.D); g.set(10, 10, M.D); for (let x = 6; x < 15; x += 2) g.set(x, 13, M.D); rr = 7; palette = pal(prm.c); break; }
    case 'deadtree': case 'pine': case 'kelp': {
      w = R.ir(16, 24); h = R.ir(24, 38); g = new Spr(w, h); const cx = Math.floor(w / 2);
      if (kind === 'pine') { g.rect(cx - 1, h - 6, 3, 6, M.D); for (let i = 0; i < 4; i++) { const y = h - 6 - i * (h / 5.5), hw = (4 - i) * (w / 9) + 2; g.poly([[cx - hw, y], [cx, y - h / 4], [cx + hw, y]], M.P); g.line(cx - hw + 1, y - 1, cx, y - h / 4 + 1, M.W); } palette = pal(prm.c, { dh: 25 }); palette.D = ramp(25, .4, .25); rr = 4; }
      else if (kind === 'kelp') { for (let s = 0; s < 3; s++) { const bx = cx + (s - 1) * 4; for (let y = h - 1; y > R.ir(2, 10); y--) { const x = bx + Math.round(Math.sin(y * 0.35 + s) * 2); g.set(x, y, M.S); if (y % 4 === 0) g.set(x + 1, y, M.P); if (y % 7 === 0) g.set(x - 1, y, M.G); } } palette = pal(prm.c, { gh: prm.glow[0] }); palette.G = ramp(prm.glow[0], 1, .6); rr = 4; }
      else { g.rect(cx - 1, Math.floor(h * 0.3), 3, h - Math.floor(h * 0.3), M.P); const br = (x, y, a, l, d) => { if (d > 3 || l < 2) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.line(x, y, x2, y2, M.P); br(x2, y2, a - 0.5, l * 0.7, d + 1); br(x2, y2, a + 0.45, l * 0.65, d + 1); }; br(cx, h * 0.35, -Math.PI / 2 - 0.4, h * 0.25, 0); br(cx, h * 0.45, -Math.PI / 2 + 0.5, h * 0.22, 0); palette = pal(prm.c); rr = 3; }
      break;
    }
    case 'glowplant': case 'anemone': {
      w = R.ir(14, 20); h = R.ir(16, 28); g = new Spr(w, h); const n = kind === 'anemone' ? 7 : R.ir(2, 4); const gc = prm.glows ? R.pick(prm.glows) : prm.c;
      if (kind === 'anemone') g.ell(w / 2, h - 3, w / 3, 3, M.P);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * (kind === 'anemone' ? 0.3 : 0.5), L = R.range(h * 0.5, h - 3); const x2 = w / 2 + Math.cos(a) * L * 0.6, y2 = h - 2 + Math.sin(a) * L; g.line(w / 2, h - 2, x2, y2, M.S); g.ell(x2, y2, kind === 'anemone' ? 1 : 2, kind === 'anemone' ? 1 : 2, M.G); }
      palette = pal(prm.c, { gh: gc[0] }); palette.G = ramp(gc[0], gc[1], gc[2]); rr = 4; break;
    }
    case 'coral': {
      w = R.ir(16, 26); h = R.ir(18, 30); g = new Spr(w, h); const c = R.pick(prm.cs);
      const br = (x, y, a, l, d) => { if (d > 4 || l < 2) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.line(x, y, x2, y2, M.P, 0, 2); if (d >= 3) g.set(x2, y2, M.W); br(x2, y2, a - R.range(0.3, 0.7), l * 0.72, d + 1); br(x2, y2, a + R.range(0.3, 0.7), l * 0.72, d + 1); };
      br(w / 2, h - 1, -Math.PI / 2, h * 0.32, 0); palette = makePal(c[0], c[1], c[2]); rr = 4; break;
    }
    case 'scrap': case 'machine': case 'girder': {
      w = R.ir(18, 28); h = R.ir(16, 26); g = new Spr(w, h);
      if (kind === 'machine') { g.rect(3, 5, w - 6, h - 7, M.P); g.rect(5, 7, w - 10, 3, M.D); g.set(6, 8, M.G); g.set(w - 7, 8, M.G); g.rect(4, h - 3, 4, 2, M.S); g.rect(w - 8, h - 3, 4, 2, M.S); g.line(w - 4, 5, w - 2, 1, M.A); g.rect(6, 12, w - 12, 1, M.S); }
      else if (kind === 'girder') { const y0 = R.ir(4, 8); g.rect(1, y0, w - 2, 2, M.P); g.rect(1, y0 + 6, w - 2, 2, M.P); g.rect(1, y0, 2, 8, M.P); for (let x = 4; x < w - 2; x += 4) g.line(x, y0 + 2, x + 2, y0 + 5, M.S); for (let x = 3; x < w - 2; x += 5) g.set(x, y0, M.A); }
      else for (let i = 0; i < 5; i++) { const x = R.ir(1, w - 9), y = R.ir(2, h - 7), ww = R.ir(5, 10), hh = R.ir(3, 6); g.poly([[x, y + R.ir(0, 2)], [x + ww, y], [x + ww + R.ir(-1, 2), y + hh], [x, y + hh]], i % 2 ? M.P : M.S); g.set(x + 1, y + 1, M.A); }
      palette = pal(prm.c, { h2: prm.a ? prm.a[0] : prm.c[0] + 10, gh: prm.a ? prm.a[0] : 175 }); if (prm.a) palette.S = ramp(prm.a[0], prm.a[1] * 0.6, prm.a[2] * 0.8); rr = w * 0.3; break;
    }
    case 'rod': { w = 12; h = R.ir(28, 40); g = new Spr(w, h); g.rect(5, 6, 2, h - 8, M.A); for (let y = 10; y < h - 6; y += 6) g.rect(3, y, 6, 2, M.P); g.rect(3, h - 3, 6, 2, M.S); g.ell(6, 4, 2, 2, M.G); rr = 3; palette = pal(prm.c, { gh: prm.glow[0] }); palette.G = ramp(prm.glow[0], 1, .62); break; }
    case 'gear': { w = 24; h = 16; g = new Spr(w, h); g.ell(12, 8, 10, 6, M.P); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.rect(12 + Math.cos(a) * 10.5 - 1, 8 + Math.sin(a) * 6.6 - 1, 2, 2, M.P); } g.ell(12, 8, 4, 2.5, M.S); g.ell(12, 8, 1.5, 1, M.D); rr = 9; palette = pal(prm.c); break; }
    case 'clock': case 'column': case 'obelisk': {
      w = kind === 'obelisk' ? 14 : 16; h = R.ir(28, 44); g = new Spr(w, h);
      if (kind === 'obelisk') { g.poly([[2, h - 1], [4, 4], [7, 0], [10, 4], [12, h - 1]], M.P); for (let y = 8; y < h - 4; y += 5) g.rect(6, y, 2, 2, M.G); }
      else { const top = kind === 'column' ? R.ir(4, 10) : 2; g.rect(3, top, w - 6, h - top - 2, M.P); g.rect(1, h - 4, w - 2, 3, M.S); g.rect(2, top, w - 4, 2, M.S); for (let x = 5; x < w - 4; x += 2) g.rect(x, top + 3, 1, h - top - 8, M.S, -1); if (kind === 'clock') { g.ring(w / 2, 10, 3, 4, M.A); g.line(w / 2, 10, w / 2, 7, M.G); g.line(w / 2, 10, w / 2 + 2, 11, M.G); } if (kind === 'column') { g.set(4, top, 0); g.set(w - 5, top + 1, 0); } }
      rr = 5; palette = pal(prm.c, { gh: prm.glow ? prm.glow[0] : prm.a ? prm.a[0] : 185 }); if (prm.glow) palette.G = ramp(prm.glow[0], 1, .62); if (prm.a) { palette.A = ramp(prm.a[0], prm.a[1], prm.a[2]); palette.G = ramp(prm.a[0], 1, .62); }
      break;
    }
    default: { w = 10; h = 10; g = new Spr(w, h); g.ell(5, 5, 4, 4, M.P); palette = pal(prm.c || [0, 0, .5]); rr = 4; }
  }
  g.fin();
  const c = renderSpr(g, palette);
  // glow mask (only glow pixels) for darkness planets
  let glow = null;
  if (g.m.some(v => v === M.G)) { glow = mkCanvas(g.w, g.h); const id = c.x.getImageData(0, 0, g.w, g.h); const gd = glow.x.createImageData(g.w, g.h); for (let i = 0; i < g.m.length; i++) if (g.m[i] === M.G) { for (let k = 0; k < 4; k++) gd.data[i * 4 + k] = id.data[i * 4 + k]; } glow.x.putImageData(gd, 0, 0); }
  return { c, w: g.w, h: g.h, r: rr, solid, glow };
}
function decalDraw(g, kind, x, y, R, P) {
  if (kind === 'crater') {
    const r = R.ir(6, 14); const c1 = hex(hsl(P.g2[0], P.g2[1], P.g2[2] * 0.85)), c2 = hex(hsl(P.g[0], P.g[1], Math.min(0.95, P.g[2] * 1.18)));
    g.fillStyle = c1; for (let yy = -r; yy <= r; yy++) { const ww = Math.floor(Math.sqrt(r * r - yy * yy) * 1.3); g.fillRect(x - ww, y + Math.floor(yy * 0.6), ww * 2, 1); }
    g.fillStyle = c2; for (let a = 0.3; a < Math.PI - 0.3; a += 0.05) g.fillRect(Math.floor(x + Math.cos(a) * r * 1.3), Math.floor(y + Math.sin(a) * r * 0.62), 1, 1);
  }
}

// ---------- ore deposit sprites ----------
const ORESPR = new Map();
function oreColor(p) { return p.ore[2] < 0 ? null : [p.ore[2], p.ore[3], p.ore[4]]; }
function oreSprite(pi, size, frame = 0) {
  const key = pi + '|' + size + '|' + frame; let s = ORESPR.get(key); if (s) return s;
  const p = planetDef(pi), R = RNG(pi * 17 + size * 3);
  const w = [12, 15, 19][size], h = [11, 14, 17][size]; const g = new Spr(w, h);
  g.ell(w / 2, h - 3.5, w / 2 - 1, 2.6, M.D);
  const n = 2 + size * 2;
  for (let i = 0; i < n; i++) { const cx = R.range(w * 0.25, w * 0.75), ht = R.range(h * 0.4, h - 2), bw = R.range(1.5, 2.6); g.poly([[cx - bw, h - 3], [cx - bw * 0.8, h - ht + 2], [cx, h - ht], [cx + bw * 0.8, h - ht + 2], [cx + bw, h - 3]], i % 2 ? M.G : M.P); g.set(cx - 0.5, h - ht + 1.5, M.W); }
  g.fin();
  const oc = oreColor(p); const hh = oc ? oc[0] : (frame * 45) % 360;
  const pal = makePal(hh, oc ? oc[1] : 0.8, oc ? oc[2] : 0.65, { h2: hh, gh: hh, gl: Math.min(0.75, (oc ? oc[2] : 0.65) + 0.1) });
  pal.D = ramp(p.g2[0], p.g2[1], Math.max(0.12, p.g2[2] * 0.8));
  s = renderSpr(g, pal); ORESPR.set(key, s); return s;
}
// ore item icon (for tallies)
function oreIcon(pi, x, y) { const s = oreSprite(pi, 0, Math.floor(T_NOW * 8) % 8); ctx.drawImage(s, Math.floor(x), Math.floor(y)); }

// ---------- aliens ----------
const ALIENS = new Map();
function alienSprite(pi, arch, frame, flash) {
  const key = pi + arch + frame + (flash ? 'f' : ''); let c = ALIENS.get(key); if (c) return c;
  const p = planetDef(pi), R = RNG(hashStr(p.name + arch));
  const F = FOES[arch]; const sz = F ? F.sz : ({ crawler: [16, 13], swarm: [10, 9], dasher: [16, 15], spitter: [16, 15], brute: [24, 20] }[arch] || [16, 13]);
  const [w, h] = sz; const g = new Spr(w, h); const cx = w / 2;
  const leg = frame ? 1 : 0;
  if (F) F.draw(g, w, h, cx, leg);
  else if (arch === 'crawler') { g.ell(cx, h / 2, w / 2 - 3, h / 2 - 3, M.P); for (let i = -1; i <= 1; i++) { g.line(cx - 4, h / 2 + i * 2, 1, h / 2 + i * 3 + (i === 0 ? leg : -leg) * 2, M.D); g.line(cx + 4, h / 2 + i * 2, w - 2, h / 2 + i * 3 - (i === 0 ? leg : -leg) * 2, M.D); } g.rect(cx - 3, h / 2 - 1, 2, 2, M.G); g.rect(cx + 1, h / 2 - 1, 2, 2, M.G); g.rect(cx - 2, 2, 4, 1, M.S); }
  else if (arch === 'swarm') { g.ell(cx, h / 2 + 1, 3, 2.5, M.P); g.ell(cx - 3, 2 + leg, 2, 1.5, M.S); g.ell(cx + 3, 2 + leg, 2, 1.5, M.S); g.set(cx - 1, h / 2, M.G); g.set(cx + 1, h / 2, M.G); }
  else if (arch === 'dasher') { g.poly([[cx, 1], [w - 3, h - 4], [cx, h - 2], [3, h - 4]], M.P); g.poly([[cx - 1, 1], [cx, -2], [cx + 1, 1]], M.A); g.rect(cx - 3, h / 2, 2, 2, M.G); g.rect(cx + 1, h / 2, 2, 2, M.G); g.line(3, h - 4, 1, h - 1 - leg, M.D); g.line(w - 3, h - 4, w - 1, h - 1 - leg, M.D); g.line(cx, 3, cx, h - 4, M.S); }
  else if (arch === 'spitter') { g.ell(cx, h / 2 + 1, w / 2 - 2, h / 2 - 2, M.P); g.ell(cx, h / 2 + 2 + leg * 0.5, 3, 2, M.D); g.ell(cx, h / 2 + 2, 1.5, 1, M.G); g.rect(cx - 4, 3, 2, 2, M.G); g.rect(cx + 2, 3, 2, 2, M.G); for (let i = 0; i < 4; i++) g.set(2 + i * 4, h - 2 - (i % 2) * leg, M.S); }
  else { g.ell(cx, h / 2 + 1, w / 2 - 2, h / 2 - 3, M.P); g.rect(3, h / 2 - 4, w - 6, 3, M.S); g.rect(cx - 4, h / 2 + 1, 2, 2, M.G); g.rect(cx + 2, h / 2 + 1, 2, 2, M.G); g.rect(1, h / 2 + leg, 3, 5, M.P); g.rect(w - 4, h / 2 - leg, 3, 5, M.P); g.rect(cx - 3, h - 3, 2, 2, M.D); g.rect(cx + 1, h - 3, 2, 2, M.D); g.poly([[cx - 6, 3], [cx - 7, 0], [cx - 4, 3]], M.A); g.poly([[cx + 4, 3], [cx + 7, 0], [cx + 6, 3]], M.A); }
  g.fin();
  const ac = p.alien[1]; const pal = makePal(ac[0], ac[1], ac[2], { h2: ac[0] + 30, gh: ac[0] + 180, A: METALS.steel() });
  if (flash) { pal.P = pal.S = pal.D = pal.A = WHITE_RAMP.map(() => [255, 255, 255]); pal.O = [255, 255, 255]; }
  c = renderSpr(g, pal); ALIENS.set(key, c); return c;
}
function bossSprite(pi, frame, flash) {
  const key = 'B' + pi + frame + (flash ? 'f' : ''); let c = ALIENS.get(key); if (c) return c;
  const p = planetDef(pi), R = RNG(hashStr(p.boss[0]));
  const w = 48, h = 42, g = new Spr(w, h), cx = 24;
  const bw = R.ir(13, 17), bh = R.ir(11, 14);
  g.ell(cx, 22, bw, bh, M.P);
  g.ell(cx, 18, bw - 4, bh - 5, M.S);
  const arms = R.int(3);
  for (const s of [-1, 1]) {
    if (arms === 0) { g.line(cx + s * bw * 0.8, 24, cx + s * (bw + 6), 34 + frame * s, M.D, 0, 2); g.poly([[cx + s * (bw + 4), 33], [cx + s * (bw + 9), 30], [cx + s * (bw + 7), 38]], M.A); }
    else if (arms === 1) { g.ell(cx + s * (bw + 2), 28 + frame, 4, 5, M.P); g.rect(cx + s * (bw + 2) - 2, 32 + frame, 4, 3, M.A); }
    else for (let k = 0; k < 3; k++) g.line(cx + s * bw * 0.7, 26 + k * 3, cx + s * (bw + 7), 30 + k * 4 + (k % 2 ? frame : -frame), M.D);
  }
  const crown = R.int(3);
  if (crown === 0) for (let i = -2; i <= 2; i++) g.poly([[cx + i * 5 - 2, 12], [cx + i * 5, 3 - Math.abs(i)], [cx + i * 5 + 2, 12]], M.A);
  else if (crown === 1) { g.poly([[cx - 10, 14], [cx - 17, 2], [cx - 7, 11]], M.A); g.poly([[cx + 10, 14], [cx + 17, 2], [cx + 7, 11]], M.A); }
  else { g.ell(cx, 9, 7, 4, M.S); g.ell(cx, 8, 3, 2, M.G); }
  const ne = R.ir(2, 5); for (let i = 0; i < ne; i++) { const ex = cx + (i - (ne - 1) / 2) * 5, ey = 18 + (i % 2) * 2; g.ell(ex, ey, 1.6, 1.6, M.G); g.set(ex, ey, M.W); }
  g.rect(cx - 5, 27, 10, 2, M.D); for (let x = cx - 4; x <= cx + 4; x += 2) g.set(x, 29, M.W);
  g.ell(cx, 33, 3, 2, M.G);
  for (let i = 0; i < 4; i++) g.rect(cx - 12 + i * 7, 33 + (i % 2 ? frame : -frame) + 1, 3, 5, M.D);
  g.fin();
  const bc = p.boss[2]; const pal = makePal(bc[0], bc[1], bc[2], { h2: bc[0] + 25, gh: bc[0] + 160, A: METALS.gold() });
  if (flash) { pal.P = pal.S = pal.D = pal.A = WHITE_RAMP.map(() => [255, 255, 255]); }
  c = renderSpr(g, pal); ALIENS.set(key, c); return c;
}
function wreckSprite(pi) {
  const key = 'W' + pi; let c = ALIENS.get(key); if (c) return c;
  const R = RNG(pi * 71), g = new Spr(40, 26);
  g.poly([[3, 14], [16, 8], [30, 10], [36, 15], [28, 20], [10, 21]], M.P);
  g.poly([[12, 10], [18, 2], [22, 3], [19, 10]], M.S); g.poly([[20, 19], [26, 25], [30, 24], [26, 18]], M.S);
  for (let i = 0; i < 5; i++) { const x = R.ir(6, 30), y = R.ir(10, 18); g.set(x, y, 0); g.set(x + 1, y, M.D); }
  g.ell(27, 13, 3, 1.6, M.G); g.line(8, 15, 14, 12, M.D); g.rect(31, 14, 5, 1, M.A);
  g.fin();
  c = renderSpr(g, makePal(215, 0.12, 0.42, { h2: 18, s2: 0.45, gh: 185, A: METALS.chrome() })); ALIENS.set(key, c); return c;
}
