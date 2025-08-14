// Single shared audio
const audio = new Audio();
audio.preload = 'auto';
audio.autoplay = false;

let currentKey = null;
let isSwitching = false;

// Align frame aspect ratio to the image's intrinsic ratio (prevents mismatch on iPhone)
const img = document.getElementById('bg');
const frame = document.getElementById('frame');
function setAspect(){
  if (img.naturalWidth && img.naturalHeight) {
    frame.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
  }
}
if (img.complete) setAspect(); else img.addEventListener('load', setAspect);

const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
function setHUD(t){ if(hud) hud.textContent = t; }

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
    setHUD('Playing ' + key);
  }catch(e){
    setHUD('Audio blocked — tap again');
  }finally{
    isSwitching = false;
  }
}

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

audio.addEventListener('ended', ()=>{
  setHUD('');
  currentKey = null;
});
