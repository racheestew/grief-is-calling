// Grief is Calling – audio-file playback (one at a time) with image keys,
// plus on-device Record/Replay of voice messages.
(function(){
  const player = document.getElementById('player');
  const keypad = document.getElementById('keypad');

  // ---------------------------------------------------------------------
  // Record/Replay configuration — tune these two numbers freely.
  // ---------------------------------------------------------------------
  const RECORD_CONFIG = {
    // Hard cap on a single recording's length. Recording auto-stops here.
    MAX_RECORDING_SECONDS: 60,

    // How many recordings to keep before the oldest gets overwritten.
    // Sizing guide: at AUDIO_BITS_PER_SECOND below (64kbps, mono voice),
    // one 60s recording is ~470KB. So MAX_RECORDINGS * 470KB is roughly
    // the on-device storage this feature will use:
    //   100 recordings  ~ 47MB
    //   300 recordings  ~ 140MB
    //   500 recordings  ~ 235MB
    // Fire tablets generally have several GB free and Chromium/Silk's
    // IndexedDB quota is generous, but treat ~500 as a practical upper
    // limit without first checking navigator.storage.estimate() on the
    // actual device.
    MAX_RECORDINGS: 100,

    // Bitrate used when encoding recordings. Lower = smaller files.
    AUDIO_BITS_PER_SECOND: 64000,
  };

  const DB_NAME = 'grief-is-calling';
  const DB_VERSION = 1;
  const STORE_NAME = 'recordings';

  // Ask the browser not to evict this site's storage under pressure.
  // Best-effort only; safe to ignore if unsupported or denied.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  // ---------------------------------------------------------------------
  // Keypad playback (unchanged behavior, plus voice-recorder awareness)
  // ---------------------------------------------------------------------

  // Keep "original" behavior: optional background.jpg detection
  fetch('background.jpg', { method: 'HEAD' })
    .then(r => { if (r.ok) document.body.classList.add('with-bg'); })
    .catch(() => {});

  let playerMode = 'idle'; // 'idle' | 'keypad' | 'voice'
  let voiceObjectUrl = null;
  let voiceProgressInterval = null;
  let activePlayback = null; // { onStop } for whoever started the current voice playback

  function stopPlayer(){
    try { player.pause(); } catch {}
    if (voiceProgressInterval) {
      clearInterval(voiceProgressInterval);
      voiceProgressInterval = null;
    }
    if (voiceObjectUrl) {
      URL.revokeObjectURL(voiceObjectUrl);
      voiceObjectUrl = null;
    }
    if (playerMode === 'voice') {
      isPlayingVoice = false;
      updateButtonStates();
      showIdleStatus();
      if (activePlayback && activePlayback.onStop) activePlayback.onStop();
    }
    activePlayback = null;
    playerMode = 'idle';
  }

  function playSound(name){
    if (isRecording) return; // don't let keypad tones bleed into a recording
    const src = `audio/${name}.m4a`;
    if (playerMode === 'keypad' && player.src.endsWith(src)) {
      // restart same track
      try { player.pause(); } catch {}
      player.currentTime = 0;
      player.play().catch(()=>{});
      return;
    }
    // switch to new track (stops current, ensures single-voice)
    stopPlayer();
    playerMode = 'keypad';
    player.src = src;
    player.load();
    player.play().catch(()=>{});
  }

  // Use pointer events to avoid click+touch double fires
  let pressed = null;
  keypad.addEventListener('pointerdown', (e) => {
    if (isRecording) return;
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

  // ---------------------------------------------------------------------
  // IndexedDB storage for recordings
  // ---------------------------------------------------------------------

  function openDb(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function countRecordings(db){
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function deleteOldestRecording(db){
    return new Promise((resolve, reject) => {
      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      // Default cursor order is ascending by key; since id is auto-increment,
      // the first result is always the oldest surviving recording.
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) cursor.delete();
        resolve();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  async function saveRecording(blob, mimeType){
    const db = await openDb();
    let count = await countRecordings(db);
    while (count >= RECORD_CONFIG.MAX_RECORDINGS) {
      await deleteOldestRecording(db);
      count--;
    }
    return new Promise((resolve, reject) => {
      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const record = { blob, mimeType, timestamp: Date.now() };
      const req = store.add(record);
      req.onsuccess = () => resolve(Object.assign({ id: req.result }, record));
      req.onerror = () => reject(req.error);
    });
  }

  async function getRecordingCount(){
    const db = await openDb();
    return countRecordings(db);
  }

  // Returns recordings oldest-first, so array position i corresponds to
  // chronological index i+1 (the oldest surviving recording is #1).
  async function getAllRecordingsSorted(){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
      req.onerror = () => reject(req.error);
    });
  }

  async function clearAllRecordings(){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteRecordingById(id){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ---------------------------------------------------------------------
  // Record / Replay UI + MediaRecorder
  // ---------------------------------------------------------------------

  const recordBtn = document.getElementById('recordBtn');
  const playBtn = document.getElementById('playBtn');
  const voiceStatus = document.getElementById('voiceStatus');

  let isRecording = false;
  let isPlayingVoice = false;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordStartTime = 0;
  let recordTimerInterval = null;

  function formatTime(seconds){
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  // Blank until something is actually happening (recording/playing),
  // rather than showing default instructional text at rest.
  function showIdleStatus(){
    if (isRecording || isPlayingVoice) return;
    voiceStatus.textContent = '';
  }

  function updateButtonStates(){
    recordBtn.classList.toggle('is-recording', isRecording);
    recordBtn.setAttribute('aria-pressed', String(isRecording));
    recordBtn.setAttribute('aria-label', isRecording ? 'Stop recording' : 'Record a message');
    recordBtn.disabled = isPlayingVoice;
    playBtn.disabled = isRecording || isPlayingVoice || recordingCountCache === 0;
  }

  let recordingCountCache = 0;
  async function refreshRecordingCount(){
    try {
      recordingCountCache = await getRecordingCount();
    } catch {
      recordingCountCache = 0;
    }
    updateButtonStates();
  }

  function pickMimeType(){
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    if (!window.MediaRecorder) return '';
    return candidates.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  }

  async function startRecording(){
    if (isRecording || isPlayingVoice) return;
    stopPlayer();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      voiceStatus.textContent = 'Recording is not supported in this browser';
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      voiceStatus.textContent = 'Microphone permission is needed to record';
      return;
    }

    const mimeType = pickMimeType();
    try {
      mediaRecorder = new MediaRecorder(mediaStream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORD_CONFIG.AUDIO_BITS_PER_SECOND,
      });
    } catch (err) {
      mediaRecorder = new MediaRecorder(mediaStream);
    }

    recordedChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = onRecordingStopped;
    mediaRecorder.start();

    isRecording = true;
    recordStartTime = performance.now();
    updateButtonStates();
    updateRecordTimer();
    recordTimerInterval = setInterval(updateRecordTimer, 200);
  }

  function updateRecordTimer(){
    const elapsed = (performance.now() - recordStartTime) / 1000;
    voiceStatus.textContent = `Recording… ${formatTime(elapsed)} / ${formatTime(RECORD_CONFIG.MAX_RECORDING_SECONDS)}`;
    if (elapsed >= RECORD_CONFIG.MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }

  function stopRecording(){
    if (!isRecording) return;
    isRecording = false;
    if (recordTimerInterval) {
      clearInterval(recordTimerInterval);
      recordTimerInterval = null;
    }
    updateButtonStates();
    try { mediaRecorder.stop(); } catch {}
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }

  async function onRecordingStopped(){
    const mimeType = (mediaRecorder && mediaRecorder.mimeType) || recordedChunks[0]?.type || 'audio/webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    recordedChunks = [];

    if (blob.size === 0) {
      voiceStatus.textContent = 'Recording was empty — nothing saved';
      await refreshRecordingCount();
      return;
    }

    voiceStatus.textContent = 'Saved — playing it back…';
    try {
      await saveRecording(blob, mimeType);
    } catch (err) {
      voiceStatus.textContent = 'Could not save recording';
      await refreshRecordingCount();
      return;
    }
    await refreshRecordingCount();
    playBlob(blob);
  }

  // options:
  //   indexLabel — optional "(5/100)" string shown alongside the default
  //                timer text (ignored if onTick is provided)
  //   onTick(currentTime, duration) — called ~5x/sec while playing;
  //                overrides the default voiceStatus timer text so a
  //                caller (e.g. an admin row) can render progress itself
  //   onStop()   — called once playback ends, whether naturally or by
  //                interruption (a new sound starting, panel closing, etc.)
  function playBlob(blob, { indexLabel, onTick, onStop } = {}){
    stopPlayer();
    playerMode = 'voice';
    isPlayingVoice = true;
    activePlayback = { onStop };
    updateButtonStates();

    voiceObjectUrl = URL.createObjectURL(blob);
    player.src = voiceObjectUrl;
    player.load();

    const onEnded = () => {
      player.removeEventListener('ended', onEnded);
      stopPlayer();
    };
    player.addEventListener('ended', onEnded);

    voiceProgressInterval = setInterval(() => {
      if (!isPlayingVoice) return;
      const duration = isFinite(player.duration) ? player.duration : 0;
      const current = player.currentTime;
      if (onTick) {
        onTick(current, duration);
      } else {
        const prefix = indexLabel ? `Playing ${indexLabel}… ` : 'Playing… ';
        voiceStatus.textContent = `${prefix}${formatTime(current)} / ${formatTime(duration)}`;
      }
    }, 200);

    player.play().catch(() => {
      onEnded();
    });
  }

  async function playRandom(){
    if (isRecording || isPlayingVoice) return;
    const recs = await getAllRecordingsSorted();
    if (!recs.length) {
      voiceStatus.textContent = 'No recordings yet';
      return;
    }
    const idx = Math.floor(Math.random() * recs.length);
    playBlob(recs[idx].blob, { indexLabel: `(${idx + 1}/${recs.length})` });
  }

  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  playBtn.addEventListener('click', playRandom);

  // ---------------------------------------------------------------------
  // Admin panel — long-press the title to view/clear all recordings.
  // Not linked from the visible UI on purpose; gallery visitors shouldn't
  // stumble into it.
  // ---------------------------------------------------------------------

  const ADMIN_LONG_PRESS_MS = 5000;
  const appTitle = document.getElementById('appTitle');
  const adminOverlay = document.getElementById('adminOverlay');
  const adminCloseBtn = document.getElementById('adminCloseBtn');
  const adminClearBtn = document.getElementById('adminClearBtn');
  const adminList = document.getElementById('adminList');
  const adminSummary = document.getElementById('adminSummary');

  let longPressTimer = null;

  appTitle.addEventListener('pointerdown', () => {
    longPressTimer = setTimeout(openAdminPanel, ADMIN_LONG_PRESS_MS);
  });
  // Listen on window (not the title) so small hand movement during the
  // hold — normal with a mouse or a finger — doesn't cancel the press by
  // drifting outside the title's bounds. Only an actual release does.
  ['pointerup', 'pointercancel'].forEach((evt) => {
    window.addEventListener(evt, () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
  });

  async function openAdminPanel(){
    stopPlayer(); // don't let a keypad/voice clip keep playing behind the panel
    resetClearConfirm();
    adminOverlay.classList.add('open');
    await refreshAdminList();
  }

  function closeAdminPanel(){
    stopPlayer(); // don't leave a preview clip playing after closing
    adminOverlay.classList.remove('open');
  }

  async function refreshAdminList(){
    const recs = await getAllRecordingsSorted();
    adminSummary.textContent = `${recs.length} / ${RECORD_CONFIG.MAX_RECORDINGS} recordings stored`;
    adminList.innerHTML = '';

    if (!recs.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'No recordings yet.';
      adminList.appendChild(empty);
      return;
    }

    // recs is oldest-first (see getAllRecordingsSorted). The list itself
    // still displays newest-first (most relevant at top without
    // scrolling), but each row's number reflects chronological order —
    // the oldest surviving recording is #1 — so we walk recs backwards.
    const total = recs.length;
    for (let displayPos = 0; displayPos < total; displayPos++) {
      const rec = recs[total - 1 - displayPos];
      const chronoIndex = total - displayPos;

      const row = document.createElement('div');
      row.className = 'admin-row';

      const label = document.createElement('span');
      label.className = 'admin-row-label';
      label.textContent = `${chronoIndex}. ${new Date(rec.timestamp).toLocaleString()}`;

      const progress = document.createElement('span');
      progress.className = 'admin-row-progress';

      const actions = document.createElement('div');
      actions.className = 'admin-row-actions';

      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'admin-row-play';
      previewBtn.setAttribute('aria-label', `Preview recording ${chronoIndex}`);
      previewBtn.textContent = '▶';
      previewBtn.addEventListener('click', () => {
        if (previewBtn.classList.contains('is-playing')) {
          stopPlayer(); // this button doubles as stop while its clip plays
          return;
        }
        previewBtn.classList.add('is-playing');
        previewBtn.textContent = '■';
        previewBtn.setAttribute('aria-label', `Stop preview of recording ${chronoIndex}`);
        progress.textContent = '0:00 / 0:00';
        playBlob(rec.blob, {
          onTick: (current, duration) => {
            progress.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
          },
          onStop: () => {
            previewBtn.classList.remove('is-playing');
            previewBtn.textContent = '▶';
            previewBtn.setAttribute('aria-label', `Preview recording ${chronoIndex}`);
            progress.textContent = '';
          },
        });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'admin-row-delete';
      deleteBtn.setAttribute('aria-label', `Delete recording ${chronoIndex}`);
      deleteBtn.textContent = '\u{1F5D1}';
      let deleteConfirmPending = false;
      let deleteConfirmTimeout = null;
      const resetDeleteConfirm = () => {
        deleteConfirmPending = false;
        deleteBtn.classList.remove('confirm');
        deleteBtn.textContent = '\u{1F5D1}';
        deleteBtn.setAttribute('aria-label', `Delete recording ${chronoIndex}`);
      };
      deleteBtn.addEventListener('click', async () => {
        if (!deleteConfirmPending) {
          deleteConfirmPending = true;
          deleteBtn.classList.add('confirm');
          deleteBtn.textContent = '✓';
          deleteBtn.setAttribute('aria-label', `Confirm delete recording ${chronoIndex}`);
          deleteConfirmTimeout = setTimeout(resetDeleteConfirm, 3000);
          return;
        }
        clearTimeout(deleteConfirmTimeout);
        await deleteRecordingById(rec.id);
        await refreshAdminList();
        await refreshRecordingCount();
      });

      actions.appendChild(previewBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(label);
      row.appendChild(progress);
      row.appendChild(actions);
      adminList.appendChild(row);
    }
  }

  let clearConfirmPending = false;
  let clearConfirmTimeout = null;

  function resetClearConfirm(){
    clearConfirmPending = false;
    if (clearConfirmTimeout) {
      clearTimeout(clearConfirmTimeout);
      clearConfirmTimeout = null;
    }
    adminClearBtn.textContent = 'Clear All Recordings';
    adminClearBtn.classList.remove('confirm');
  }

  adminClearBtn.addEventListener('click', async () => {
    if (!clearConfirmPending) {
      clearConfirmPending = true;
      adminClearBtn.textContent = 'Tap again to confirm — this cannot be undone';
      adminClearBtn.classList.add('confirm');
      clearConfirmTimeout = setTimeout(resetClearConfirm, 4000);
      return;
    }
    resetClearConfirm();
    await clearAllRecordings();
    await refreshAdminList();
    await refreshRecordingCount();
  });

  adminCloseBtn.addEventListener('click', closeAdminPanel);

  refreshRecordingCount();
  showIdleStatus();
})();
