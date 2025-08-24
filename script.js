// On-device calibrator for Fire 7 (portrait) — also works elsewhere.
// 1) Overlay matches rendered image box.
// 2) Paddings/gaps computed in PX using image width/height.
// 3) Sliders control ratios (%), saved to localStorage.

const stage   = document.getElementById('stage');
const img     = document.getElementById('bg');
const overlay = document.getElementById('overlay');
const hud     = document.getElementById('hud');

// Default design ratios (tweak via sliders)
const defaults = {
  padX: 7.5,  // % of image width
  padY: 6.3,  // % of image height
  gapX: 6.9,  // % of image width
  gapY: 6.2,  // % of image height
  hitW: 83.5, // % of cell
  hitH: 87.0, // % of cell
  shiftY: 2.2 // % of hitH (upward)
};

const storeKey = 'grief-fire7-calibration';
let cfg = { ...defaults, ...(JSON.parse(localStorage.getItem(storeKey) || '{}')) };

function applyCSSVars(){
  document.documentElement.style.setProperty('--hit-w', cfg.hitW + '%');
  document.documentElement.style.setProperty('--hit-h', cfg.hitH + '%');
  document.documentElement.style.setProperty('--shift-y', cfg.shiftY + '%');
}

function syncOverlayToImage(){
  const ir = img.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();

  overlay.style.left   = Math.round(ir.left - sr.left) + 'px';
  overlay.style.top    = Math.round(ir.top  - sr.top)  + 'px';
  overlay.style.width  = Math.round(ir.width)  + 'px';
  overlay.style.height = Math.round(ir.height) + 'px';

  // px from % (width for X axes, height for Y axes)
  overlay.style.paddingLeft  = overlay.style.paddingRight  = ((cfg.padX/100) * ir.width)  + 'px';
  overlay.style.paddingTop   = overlay.style.paddingBottom = ((cfg.padY/100) * ir.height) + 'px';
  overlay.style.columnGap    = ((cfg.gapX/100) * ir.width)  + 'px';
  overlay.style.rowGap       = ((cfg.gapY/100) * ir.height) + 'px';

  if (hud) hud.textContent = `img ${Math.round(ir.width)}×${Math.round(ir.height)} | padX ${cfg.padX}% padY ${cfg.padY}% gapX ${cfg.gapX}% gapY ${cfg.gapY}%`;
}

function scheduleSync(){
  syncOverlayToImage();
  setTimeout(syncOverlayToImage, 50);
  setTimeout(syncOverlayToImage, 250);
  setTimeout(syncOverlayToImage, 500);
}

if (img.complete) scheduleSync(); else img.addEventListener('load', scheduleSync);
window.addEventListener('resize', scheduleSync);
if (window.visualViewport){
  visualViewport.addEventListener('resize', scheduleSync);
  visualViewport.addEventListener('scroll', scheduleSync);
}
window.addEventListener('orientationchange', ()=> setTimeout(scheduleSync, 100));

// ====== Calibrator UI ======
const $ = (id)=>document.getElementById(id);
const fields = ['padX','padY','gapX','gapY','hitW','hitH','shiftY'];
function initPanel(){
  $('togglePanel').onclick = ()=>{ const p=$('panel'); p.hidden=!p.hidden; };

  for(const k of fields){
    const input = $(k);
    const val   = $(k+'v');
    input.value = cfg[k];
    val.textContent = cfg[k] + '%';
    input.addEventListener('input', ()=>{
      cfg[k] = parseFloat(input.value);
      val.textContent = cfg[k] + '%';
      localStorage.setItem(storeKey, JSON.stringify(cfg));
      applyCSSVars();
      scheduleSync();
    });
  }

  $('reset').onclick = ()=>{
    cfg = { ...defaults };
    localStorage.setItem(storeKey, JSON.stringify(cfg));
    for(const k of fields){ $(k).value = cfg[k]; $(k+'v').textContent = cfg[k] + '%'; }
    applyCSSVars(); scheduleSync();
  };

  $('copy').onclick = ()=>{
    const out = JSON.stringify(cfg, null, 2);
    navigator.clipboard?.writeText(out);
    alert('Copied calibration to clipboard:\n' + out);
  };

  $('hide').onclick = ()=>{ $('panel').hidden = true; };
}
document.addEventListener('DOMContentLoaded', ()=>{ applyCSSVars(); initPanel(); });

// ====== Audio: one at a time ======
const audio = new Audio(); audio.preload = 'auto';
let currentKey = null; let switching = false;
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
    if (!same){
      const src = files[k];
      const abs = new URL(src, location.href).href;
      if (audio.src !== abs) audio.src = src;
    }
    audio.currentTime = 0;
    await audio.play();
    currentKey = k;
  }catch(e){
    // tap again if needed (gesture)
  }finally{ switching = false; }
}

// Touch-first; quick visual feedback
function onDown(e){
  const btn = e.target.closest('.key'); if (!btn || switching) return;
  btn.classList.add('pressed');
  playKey(btn.dataset.key);
  if (navigator.vibrate) navigator.vibrate(8);
  if (e.cancelable) e.preventDefault();
}
function onUp(e){
  const btn = e.target.closest('.key'); if (!btn) return;
  btn.classList.remove('pressed');
}

overlay.addEventListener('pointerdown', onDown, { passive: false });
overlay.addEventListener('pointerup', onUp, { passive: true });
overlay.addEventListener('pointercancel', onUp, { passive: true });
overlay.addEventListener('touchstart', onDown, { passive: false });
overlay.addEventListener('touchend', onUp, { passive: true });
overlay.addEventListener('touchcancel', onUp, { passive: true });
overlay.addEventListener('mousedown', onDown);
overlay.addEventListener('mouseup', onUp);
overlay.addEventListener('mouseleave', onUp);
