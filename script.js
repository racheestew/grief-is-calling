// Single shared audio
const audio = new Audio();
audio.preload = 'auto'; audio.autoplay = false;

let currentKey = null;
let isSwitching = false;

const img = document.getElementById('bg');
const frame = document.getElementById('frame');
const overlay = document.getElementById('overlay');

function syncOverlayToImage(){
  // Compute the actual rendered image box within the frame for object-fit: contain
  const fw = frame.clientWidth, fh = frame.clientHeight;
  const ir = img.naturalWidth / img.naturalHeight;
  const fr = fw / fh;

  let w, h, left, top;
  if (fr > ir) {
    // frame is wider than image -> image height fills, left/right letterbox
    h = fh;
    w = h * ir;
    left = Math.round((fw - w) / 2);
    top = 0;
  } else {
    // frame is taller than image -> image width fills, top/bottom letterbox
    w = fw;
    h = Math.round(w / ir);
    left = 0;
    top = Math.round((fh - h) / 2);
  }
  overlay.style.left = left + 'px';
  overlay.style.top = top + 'px';
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';
}

function readyToSync(){
  return img.naturalWidth > 0 && img.naturalHeight > 0;
}

// Initial sync and re-sync on resize/orientation change
function ensureSync(){
  if (readyToSync()) syncOverlayToImage();
}
if (img.complete) ensureSync(); else img.addEventListener('load', ensureSync);
window.addEventListener('resize', ensureSync);
window.addEventListener('orientationchange', () => setTimeout(ensureSync, 50));

// Audio logic
const fileMap = {
  '1':'audio/1.m4a','2':'audio/2.m4a','3':'audio/3.m4a',
  '4':'audio/4.m4a','5':'audio/5.m4a','6':'audio/6.m4a',
  '7':'audio/7.m4a','8':'audio/8.m4a','9':'audio/9.m4a',
  '0':'audio/0.m4a','star':'audio/star.m4a','pound':'audio/pound.m4a'
};

async function playKey(key){
  if(!fileMap[key]) return;
  const wasSame = key === currentKey;
  try{
    isSwitching = true;
    audio.pause();
    if(!wasSame){
      const src = fileMap[key];
      if(audio.src !== new URL(src, location.href).href){
        audio.src = src;
      }
    }
    audio.currentTime = 0;
    await audio.play();
    currentKey = key;
  }catch(e){
    // ignore
  }finally{
    isSwitching = false;
  }
}

// Visual press
overlay.addEventListener('pointerdown', e=>{
  const btn = e.target.closest('.key'); if(!btn) return;
  btn.classList.add('pressed');
},{passive:true});
overlay.addEventListener('pointerup', e=>{
  const btn = e.target.closest('.key'); if(!btn) return;
  btn.classList.remove('pressed');
},{passive:true});
overlay.addEventListener('pointercancel', e=>{
  const btn = e.target.closest('.key'); if(!btn) return;
  btn.classList.remove('pressed');
},{passive:true});

overlay.addEventListener('click', e=>{
  const btn = e.target.closest('.key'); if(!btn || isSwitching) return;
  playKey(btn.dataset.key);
  if(navigator.vibrate) navigator.vibrate(12);
});
