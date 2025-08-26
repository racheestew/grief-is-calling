// Grief is Calling – audio-file playback (one at a time) with image keys
(function(){
  const player = document.getElementById('player');
  const keypad = document.getElementById('keypad');

  // Keep "original" behavior: optional background.jpg detection
  fetch('background.jpg', { method: 'HEAD' })
    .then(r => { if (r.ok) document.body.classList.add('with-bg'); })
    .catch(() => {});

  function playSound(name){
    const src = `audio/${name}.m4a`;
    if (player.src.endsWith(src)) {
      // restart same track
      try { player.pause(); } catch {}
      player.currentTime = 0;
      player.play().catch(()=>{});
      return;
    }
    // switch to new track (stops current, ensures single-voice)
    try { player.pause(); } catch {}
    player.currentTime = 0;
    player.src = src;
    player.load();
    player.play().catch(()=>{});
  }

  // Use pointer events to avoid click+touch double fires
  let pressed = null;
  keypad.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    pressed = btn;
    btn.setAttribute('aria-pressed', 'true');
    const name = btn.getAttribute('data-sound');
    if (name) playSound(name);
    if (navigator.vibrate) navigator.vibrate(8);
  });
  keypad.addEventListener('pointerup', () => {
    if (pressed) pressed.removeAttribute('aria-pressed');
    pressed = null;
  });
  keypad.addEventListener('pointercancel', () => {
    if (pressed) pressed.removeAttribute('aria-pressed');
    pressed = null;
  });

  // Optional: pause when leaving page
  window.addEventListener('pagehide', () => { try { player.pause(); } catch {} });
})();
