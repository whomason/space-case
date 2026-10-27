// ===== MAIN: scenes and loop =====
let SCENE = 'title';
function setScene(s) { SCENE = s; IN.used = true; IN.pr = false; }
function goHub() { RUN = null; OPEN = null; setScene('hub'); SND.playSong('hub'); }
let LAST = performance.now();
function frame(now) {
  let dt = Math.min(0.05, Math.max(0.001, (now - LAST) / 1000)); LAST = now;
  T_NOW += dt; IN.cursor = 'default';
  let gdt = dt; if (FX.hitstop > 0) { FX.hitstop -= dt; gdt = dt * 0.05; } else if (FX.slowmo > 0) { FX.slowmo -= dt; gdt = dt * 0.35; }
  FX.shake = Math.max(0, FX.shake - dt * 18);
  try { netTick(dt); duelTick(dt); liveTick(dt); } catch (e) { console.error(e); }
  const popGrab = liveGrab();
  const other = NAMEUI.open || !!NET.choice || !!NET.viewProf || BUG.open || !!COOP.ui;
  const modal = other || COACH.on;
  let held = null; if (modal) { held = { pr: IN.pr, kp: new Set(IN.kp), mx: IN.mx, my: IN.my, wheel: IN.wheel, down: IN.down }; IN.pr = false; IN.kp.clear(); IN.wheel = 0; IN.mx = -999; IN.my = -999; IN.down = false; }
  IN.block = overlayUp();
  ctx.save();
  if (SCENE !== 'planet' && FX.shake > 0) ctx.translate(Math.round((R0() - 0.5) * FX.shake), Math.round((R0() - 0.5) * FX.shake));
  try {
    switch (SCENE) {
      case 'title': drawTitle(dt); break;
      case 'hub': updateHub(dt); drawHub(dt); break;
      case 'crates': drawCrateBay(dt); break;
      case 'open': updateOpen(gdt); if (OPEN) drawOpen(dt); break;
      case 'planet': if (RUN) { updateRun(gdt); if (RUN && SCENE === 'planet') drawRun(); } break;
      case 'results': drawResults(dt); break;
      case 'map': drawMap(dt); break;
      case 'warp': drawWarp(dt); break;
      case 'range': updateRange(gdt); if (RANGE) drawRange(dt); break;
      case 'arena': arUpdate(dt); if (AM) arDraw(dt); break;
    }
  } catch (e) { console.error(e); if (!ERR || ERR.message !== e.message) ERR_T = 0; ERR = e; logCrash(e); }
  IN.block = false;
  ctx.restore();
  if (held) { IN.pr = held.pr; IN.kp = held.kp; IN.mx = held.mx; IN.my = held.my; IN.wheel = held.wheel; IN.down = held.down; IN.used = false; IN.cursor = 'default'; TIP.v = null; try { if (NET.choice) drawNetChoice(dt); else if (NET.viewProf) drawProfilePopup(); else if (BUG.open) drawBugReport(); else if (COOP.ui) coopOverlay(); else if (NAMEUI.open) drawNameUI(dt); } catch (e) { console.error(e); ERR = e; ERR_T = 0; } }
  if (!other && !NAMEUI.open && SCENE !== 'title') { try { drawCoach(dt); } catch (e) { console.error(e); COACH.on = false; } } else { COACH.req = null; COACH.on = false; }
  try { liveOverlay(popGrab); } catch (e) { console.error(e); }
  endFields(modal && !BUG.open);
  if (FX.flash > 0) { ctx.globalAlpha = Math.min(1, FX.flash); rect(0, 0, W, H, FX.flashCol); ctx.globalAlpha = 1; FX.flash -= dt * 2.8; }
  if (SCENE !== 'title') { GOAL_T -= dt; if (GOAL_T <= 0) { GOAL_T = 0.4; try { checkGoal(); checkContracts(); } catch (e) { console.error(e); } } }
  if (!COACH.on) drawToasts(dt);   // toasts wait while a tip is up
  drawTip();
  if (ERR) { ERR_T += 1 / 60; if (ERR_T > 5) { ERR = null; } else if (SCENE !== 'title') text('ERROR: ' + String(ERR.message || ERR).slice(0, 70), 4, H - 8, '#f55', FS); }
  cvs.style.cursor = ((SCENE === 'planet' && RUN && !RUN.paused && !RUN.choice) || (SCENE === 'range' && IN.my > 24 && IN.my < H - 26) || (SCENE === 'arena' && AM && !AM.menu && !AM.ended)) ? 'none' : IN.cursor;
  endInput();
  requestAnimationFrame(frame);
}
let ERR = null, ERR_T = 0, GOAL_T = 1;
function boot() {
  buildCatalog(); buildPages(); indexPages();
  load(); netBoot(); SND.muted = !!S.settings.mute; SND.musicOn = S.settings.music !== false;
  tickMiners(); SND.playSong('title');
  addEventListener('beforeunload', () => { try { if (OPEN && !OPEN.collected && OPEN.results && OPEN.st !== 'burned') collectOpen(); } catch (e) { } if (S) save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) save(); });
  requestAnimationFrame(frame);
}
boot();
