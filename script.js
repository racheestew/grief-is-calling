// iOS-first interactions + overlay sync to rendered image box
const stage = document.getElementById('stage');
const img = document.getElementById('bg');
const overlay = document.getElementById('overlay');

// Sync overlay to the image's on-screen box (no matter toolbars/safe-area)
function syncOverlay(){
  const imgRect = img.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const left = Math.round(imgRect.left - stageRect.left);
  const top  = Math.round(imgRect.top - stageRect.top);
  overlay.style.left = left + 'px';
  overlay.style.top  = top  + 'px';
  overlay.style.width  = Math.round(imgRect.width) + 'px';
  overlay.style.height = Math.round(imgRect.height) + 'px';
}

// Run on image load, viewport changes, and small delays (iOS UI settles)
function scheduleSync(){
  syncOverlay();
  setTimeout(syncOverlay, 50);
  setTimeout(syncOverlay, 300);
}

if (img.complete) scheduleSync(); else img.addEventListener('load', scheduleSync);
window.addEventListener('resize', scheduleSync);
if (window.visualViewport) {
  visualViewport.addEventListener('resize', scheduleSync);
  visualViewport.addEventListener('scroll', scheduleSync);
}
window.addEventListener('orientationchange', ()=> setTimeout(scheduleSync, 100));

// Audio (single instance) – start on touchstart so iOS treats it as a gesture
const audio = new Audio();
audio.preload = 'auto';
let currentKey = null;
let switching = false;

const files = {
  '1':'audio/1.m4a','2':'audio/2.m4a','3':'audio/3.m4a',
  '4':'audio/4.m4a','5':'audio/5.m4a','6':'audio/6.m4a',
  '7':'audio/7.m4a','8':'audio/8.m4a','9':'audio/9.m4a',
  '0':'audio/0.m4a','star':'audio/star.m4a','pound':'audio/pound.m4a'
};

async function playKey(k){
  const wasSame = k === currentKey;
  try {
    switching = true;
    audio.pause();
    if (!wasSame) {
      const src = files[k];
      if (src) {
        const abs = new URL(src, location.href).href;
        if (audio.src !== abs) audio.src = src;
      } else { return; }
    }
    audio.currentTime = 0;
    await audio.play();
    currentKey = k;
  } catch (e) {
    // iOS may require a second tap if the first wasn't recognized as a gesture
  } finally {
    switching = false;
  }
}

// Touch-first handlers (with click fallback)
function onDown(e){
  const btn = e.target.closest('.key');
  if (!btn || switching) return;
  btn.classList.add('pressed');
  playKey(btn.dataset.key);
  if (navigator.vibrate) navigator.vibrate(10);
  // Prevent double-tap zoom
  if (e.cancelable) e.preventDefault();
}
function onUp(e){
  const btn = e.target.closest('.key');
  if (!btn) return;
  btn.classList.remove('pressed');
}

overlay.addEventListener('touchstart', onDown, { passive: false });
overlay.addEventListener('touchend', onUp, { passive: true });
overlay.addEventListener('touchcancel', onUp, { passive: true });

// Desktop/click fallback
overlay.addEventListener('mousedown', onDown);
overlay.addEventListener('mouseup', onUp);
overlay.addEventListener('mouseleave', onUp);
overlay.addEventListener('click', (e)=>{
  const btn = e.target.closest('.key'); if (!btn || switching) return;
  // Do nothing here; audio already started on down. Keep for accessibility.
});

// Ensure sync after fonts/assets settle
document.addEventListener('DOMContentLoaded', scheduleSync);
