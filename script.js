const audio = new Audio();
let currentKey = null;
let isSwitching = false;
const hud = document.getElementById('hud');
const fileMap = {
  '1': 'audio/1.m4a','2': 'audio/2.m4a','3': 'audio/3.m4a','4': 'audio/4.m4a','5': 'audio/5.m4a','6': 'audio/6.m4a','7': 'audio/7.m4a','8': 'audio/8.m4a','9': 'audio/9.m4a','0': 'audio/0.m4a','star': 'audio/star.m4a','pound': 'audio/pound.m4a'
};
function setHUD(txt) { hud.textContent = txt; }
async function playKey(key) {
  if (!fileMap[key]) return;
  const wasSame = key === currentKey;
  try {
    isSwitching = true;
    audio.pause();
    if (!wasSame) audio.src = fileMap[key];
    audio.currentTime = 0;
    await audio.play();
    currentKey = key;
    setHUD(`Playing ${key}`);
  } catch {
    setHUD('Audio blocked — tap again');
  } finally {
    isSwitching = false;
  }
}
document.getElementById('overlay').addEventListener('click', e => {
  const btn = e.target.closest('.key');
  if (!btn || isSwitching) return;
  playKey(btn.dataset.key);
  if (navigator.vibrate) navigator.vibrate(12);
});
audio.addEventListener('ended', () => { setHUD('Ready'); currentKey = null; });
