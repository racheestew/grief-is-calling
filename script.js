// ===== Fire 7 (portrait) build =====
// Overlay is locked to the rendered <img> box. Spacing uses PX from the
// image width/height so vertical values don't skew on different viewports.

const stage   = document.getElementById('stage');
const img     = document.getElementById('bg');
const overlay = document.getElementById('overlay');

// Design ratios from your calibrated photo (adjust if you swap images)
const R = {
  padX: 0.075,  // left/right padding as % of image width
  padY: 0.063,  // top/bottom padding as % of image height
  gapX: 0.069,  // column gap as % of image width
  gapY: 0.062   // row gap as % of image height
};

// 1) Size & position overlay to EXACTLY match the photo box
function syncOverlayToImage(){
  const ir = img.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();

  overlay.style.left   = Math.round(ir.left - sr.left) + 'px';
  overlay.style.top    = Math.round(ir.top  - sr.top)  + 'px';
  overlay.style.width  = Math.round(ir.width)  + 'px';
  overlay.style.height = Math.round(ir.height) + 'px';

  // 2) Convert design ratios into PX on the correct axis
  overlay.style.paddingLeft  = overlay.style.paddingRight  = (R.padX * ir.width)  + 'px';
  overlay.style.paddingTop   = overlay.style.paddingBottom = (R.padY * ir.height) + 'px';
  overlay.style.columnGap    = (R.gapX * ir.width)  + 'px';
  overlay.style.rowGap       = (R.gapY * ir.height) + 'px';
}

// Run multiple times as the browser UI settles
function scheduleSync(){
  syncOverlayToImage();
  setTimeout(syncOverlayToImage, 50);
  setTimeout(syncOverlayToImage, 250);
  setTimeout(syncOverlayToImage, 500);
}

if (img.complete) scheduleSync();
else img.addEventListener('load', scheduleSync);

window.addEventListener('resize', scheduleSync);
if (window.visualViewport){
  visualViewport.addEventListener('resize', scheduleSync);
  visualViewport.addEventListener('scroll', scheduleSync);
}
window.addEventListener('orientationchange', () => setTimeout(scheduleSync, 100));

// ===== Audio: one track at a time, restart on repeat tap =====
const audio = new Audio();
audio.preload = 'auto';
let currentKey = null;
let switching  = false;

// Place your files in /audio with these names
const files = {
  '1':'audio/1.m4a','2':'audio/2.m4a','3':'audio/3.m4a',
  '4':'audio/4.m4a','5':'audio/5.m4a','6':'audio/6.m4a',
  '7':'audio/7.m4a','8':'audio/8.m4a','9':'audio/9.m4a',
  '0':'audio/0.m4a','star':'audio/star.m4a','pound':'audio/pound.m4a'
};

async function playKey(k){
  if (!files[k]) return;
  const same = (k === currentKey);
  try{
    switching = true;
    audio.pause();
    if (!same) {
      const src = files[k];
      if (src) {
        const abs = new URL(src, location.href).href;
        if (audio.src !== abs) audio.src = src;
      } else { return; }
    }
    audio.currentTime = 0;
    await audio.play();
    currentKey = k;
  }catch(e){
    // If playback is blocked, another tap will start it (user gesture)
  }finally{
    switching = false;
  }
}

// Touch-first (fast on mobile) with mouse fallback for desktop
function onDown(e){
  const btn = e.target.closest('.key'); if (!btn || switching) return;
  btn.classList.add('pressed');
  playKey(btn.dataset.key);
  if (navigator.vibrate) navigator.vibrate(10);
  if (e.cancelable) e.preventDefault();
}
function onUp(e){
  const btn = e.target.closest('.key'); if (!btn) return;
  btn.classList.remove('pressed');
}

overlay.addEventListener('pointerdown', onDown, { passive: false });
overlay.addEventListener('pointerup', onUp, { passive: true });
overlay.addEventListener('pointercancel', onUp, { passive: true });

// Extra safety: touch fallback if pointer events are disabled
overlay.addEventListener('touchstart', onDown, { passive: false });
overlay.addEventListener('touchend', onUp, { passive: true });
overlay.addEventListener('touchcancel', onUp, { passive: true });

// Desktop fallback
overlay.addEventListener('mousedown', onDown);
overlay.addEventListener('mouseup', onUp);
overlay.addEventListener('mouseleave', onUp);
