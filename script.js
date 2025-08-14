// Build the 3x4 grid of hit rects directly in the SVG coordinate system (300x400)
const svg = document.getElementById('pad');
const keysGroup = document.getElementById('keys');

// Calibration values (SVG units, in the same 300x400 viewBox)
// These match the margins/gaps/size we tuned in CSS before, but now in one space.
const GRID = {
  left: 22,   // left margin from image edge
  top: 26,    // top margin
  right: 22,  // right margin
  bottom: 30, // bottom margin
  cols: 3, rows: 4,
  gapX: 13,   // space between columns
  gapY: 12,   // space between rows
};

// Compute cell size from the box
const boxWidth  = 300 - GRID.left - GRID.right;
const boxHeight = 400 - GRID.top - GRID.bottom;
const cellW = (boxWidth - GRID.gapX * (GRID.cols - 1)) / GRID.cols;
const cellH = (boxHeight - GRID.gapY * (GRID.rows - 1)) / GRID.rows;

// Rounded-rect hitbox size (slightly smaller than cell to match raised caps)
const hitW = cellW * 0.835;
const hitH = cellH * 0.870;
const rx = Math.min(hitW, hitH) * 0.16;

// Map for labels in row-major order
const labels = ['1','2','3','4','5','6','7','8','9','star','0','pound'];

function createKey(x, y, label){
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-key', label);

  const cx = x + cellW/2;
  const cy = y + cellH/2 - (cellH * 0.022); // small upward nudge like before

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', cx - hitW/2);
  rect.setAttribute('y', cy - hitH/2);
  rect.setAttribute('width', hitW);
  rect.setAttribute('height', hitH);
  rect.setAttribute('rx', rx);
  rect.setAttribute('ry', rx);
  rect.setAttribute('class', 'hit');

  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  outline.setAttribute('x', cx - hitW/2);
  outline.setAttribute('y', cy - hitH/2);
  outline.setAttribute('width', hitW);
  outline.setAttribute('height', hitH);
  outline.setAttribute('rx', rx);
  outline.setAttribute('ry', rx);
  outline.setAttribute('class', 'outline');
  outline.setAttribute('stroke', 'rgba(255,255,255,0.18)');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke-width', '0.9');

  g.appendChild(rect);
  g.appendChild(outline);
  keysGroup.appendChild(g);
}

let idx = 0;
for (let r = 0; r < GRID.rows; r++) {
  for (let c = 0; c < GRID.cols; c++) {
    const x = GRID.left + c * (cellW + GRID.gapX);
    const y = GRID.top + r * (cellH + GRID.gapY);
    createKey(x, y, labels[idx++]);
  }
}

// Interaction + audio
const audio = new Audio();
audio.preload = 'auto';
audio.autoplay = false;
let currentKey = null;
let isSwitching = false;

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
  }catch(e){ } finally { isSwitching = false; }
}

// Delegate pointer events to hits
keysGroup.addEventListener('pointerdown', e=>{
  const g = e.target.closest('g[data-key]'); if(!g) return;
  g.querySelector('.hit').classList.add('pressed');
},{passive:true});
keysGroup.addEventListener('pointerup', e=>{
  const g = e.target.closest('g[data-key]'); if(!g) return;
  g.querySelector('.hit').classList.remove('pressed');
},{passive:true});
keysGroup.addEventListener('pointercancel', e=>{
  const g = e.target.closest('g[data-key]'); if(!g) return;
  g.querySelector('.hit').classList.remove('pressed');
},{passive:true});

keysGroup.addEventListener('click', e=>{
  const g = e.target.closest('g[data-key]'); if(!g || isSwitching) return;
  const key = g.getAttribute('data-key');
  playKey(key);
  if(navigator.vibrate) navigator.vibrate(12);
});
