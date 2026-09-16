# Grief Is Calling

A single-page, static web app that recreates a phone keypad, meant to run
locally on an Amazon Fire Tablet. Each numbered key plays a pre-recorded
audio message instead of a DTMF tone — tapping through the pad "calls"
through a sequence of recordings. Below the keypad, a Record/Replay pair
lets the person using the tablet record their own short voice messages and
play a random one back later. No backend, no build step: just HTML, CSS,
vanilla JS, and audio/image assets — everything (including recordings)
lives on the device.

## What's here

- [index.html](index.html) — page markup. Renders a title, a 3x4 keypad
  (`1`–`9`, `*`, `0`, `#`), and a hidden `<audio>` element used for playback.
- [script.js](script.js) — all behavior:
  - Maps each keypress (`data-sound` attribute) to `audio/<name>.m4a` and
    plays it through the shared `<audio>` element.
  - Only one clip plays at a time: pressing a new key stops whatever is
    currently playing and starts the new clip; pressing the *same* key
    again restarts that clip from 0.
  - Uses pointer events (not click) so touch and mouse don't double-fire.
  - Vibrates the device 8ms per keypress if supported.
  - Does an optional `HEAD` request for `background.jpg` at load time and
    adds a `with-bg` class to `<body>` if it exists (no CSS currently
    defines `.with-bg`, and no `background.jpg` is present in the repo —
    this hook is a no-op today).
  - Pauses playback on `pagehide`.
- [style.css](style.css) — dark theme, centered layout, keypad grid. Each
  key's artwork is set via an inline `--img` CSS variable and drawn with
  `::before` so the button itself stays a plain hit target.
- [assets/keys/](assets/keys/) — PNG artwork for each key (`0`–`9`, `star`,
  `pound`), referenced by `index.html`.
- [audio/](audio/) — the `.m4a` voice recordings played per key: `0`–`9`,
  `star`, `pound`.
- [keypad.jpg](keypad.jpg) — a reference/mockup image, not loaded by the
  app itself (nothing in the code references it).

### Record / Replay

Below the keypad is a second control row: a red record button on the
left, a status/timer line in the middle, and a green play button on the
right (drawn with CSS, matching the keypad's rounded, shadowed button
style — no new image assets needed).

- **Record** (red circle) — starts capturing from the device microphone
  via `MediaRecorder`. The icon swaps to a red stop square while active,
  and the status line shows a live elapsed timer (`0:07 / 1:00`).
  Recording auto-stops at the configured max length, or immediately when
  the stop icon is tapped. Either way, the clip is saved and then plays
  back automatically.
- **Replay** (green triangle) — picks one saved recording at random and
  plays it, showing a live progress timer plus which recording out of
  the total was picked, e.g. `Playing (5/100)… 0:12 / 0:47`. Numbering
  is chronological — the oldest surviving recording is `#1`, counting up
  to the newest — and matches the numbers shown in the admin panel, so
  you can cross-reference which one played. Disabled until at least one
  recording exists, and while a recording or playback is in progress.
- Recordings are stored on-device in **IndexedDB** (not `localStorage`,
  which is too small for audio blobs) — nothing leaves the tablet.
- Once the configured max recording count is reached, saving a new one
  automatically deletes the oldest to make room (a ring buffer).
- Tapping a numbered key while a recording plays back interrupts it, same
  single-voice behavior as the rest of the keypad. Numbered keys are
  ignored while actively recording, so keypad audio can't bleed into the
  mic.
- Config lives at the top of `script.js` in `RECORD_CONFIG`:
  - `MAX_RECORDING_SECONDS` (default `60`) — per-recording length cap.
  - `MAX_RECORDINGS` (default `100`) — how many clips are kept before the
    oldest is overwritten. At the configured 64kbps encode bitrate, a
    60s clip is roughly 470KB, so: 100 clips ≈ 47MB, 300 ≈ 140MB, 500 ≈
    235MB. Fire tablets typically have several GB free and Chromium/Silk's
    IndexedDB quota is generous, but treat **~500 as a practical upper
    bound** without first checking `navigator.storage.estimate()` on the
    actual device.
  - `AUDIO_BITS_PER_SECOND` (default `64000`) — encode bitrate; lower
    shrinks file size (and quality) further.

### Admin panel

There's a hidden panel for seeing and clearing what's been recorded —
useful for resetting between gallery sessions or checking there's
nothing you need to hear before wiping. It's intentionally not linked
from the visible UI, so gallery visitors won't stumble into it.

- **Open it:** press and hold the "Grief Is Calling" title for about 5
  seconds.
- It lists every saved recording with its timestamp, displayed newest at
  the top, but numbered chronologically — the oldest surviving recording
  is `#1`, counting up to the newest — plus a count (`N / MAX_RECORDINGS`)
  and two per-row controls:
  - **▶ Preview** — plays that specific recording; the button becomes a
    ■ stop icon while it plays (tap it again to stop early), and a live
    `0:07 / 0:42` progress timer appears next to it. Starting a preview
    on one row automatically stops any other playback (main Replay
    included), same single-voice rule as the rest of the app.
  - **🗑 Delete** — removes just that recording. Like Clear All, it
    needs two taps: the first turns it into a ✓ "confirm" state for 3
    seconds, the second actually deletes. Un-arms itself automatically
    if you don't follow through.
- **Clear All Recordings** wipes everything at once, also two taps — the
  first arms it ("tap again to confirm"), and it un-arms itself after 4
  seconds if you don't follow through.
- Close with the ✕ in the corner. Closing (or opening) the panel stops
  any audio that happens to be playing, keypad or otherwise.

## What's working

- Full keypad renders and is styled (dark theme, per-key artwork, press
  states, focus ring).
- Every key (`0`–`9`, `*`, `#`) has a matching audio file and plays it on
  tap/click, verified locally (see below) — all assets return `200`.
- Playback correctly interrupts itself: switching keys cuts off the
  previous clip; re-tapping the same key restarts it.
- Basic mobile affordances: viewport meta tags, Apple "web app capable"
  meta tags, haptic feedback via `navigator.vibrate`.
- Record/Replay end-to-end: record → auto-stop at cap or manual stop →
  save to IndexedDB → auto-playback; Replay picks a random saved clip and
  shows playback progress; oldest recordings are overwritten once the
  configured max is hit. (Verified by code review and a static asset
  check in this environment — mic/`MediaRecorder` access needs a real
  browser with mic hardware to fully exercise; see Testing locally.)

## Known rough edges

- `audio/2..m4a` (double dot) exists alongside the correctly named
  `audio/2.m4a`. It isn't referenced anywhere in the code — looks like a
  leftover/duplicate upload rather than an intentional asset.
- The `with-bg` / `background.jpg` hook in `script.js` has no
  corresponding CSS rule and no image in the repo, so it currently does
  nothing.
- No license or `.gitignore` in the repo yet.
- Git history (`Add files via upload` commits) suggests assets have been
  swapped/replaced repeatedly via the GitHub web UI rather than a normal
  local workflow.
- Recordings live in IndexedDB scoped to the browser + origin serving the
  page. Clearing site data/browser storage on the tablet, or switching
  which app/server hosts the page, wipes them. There's currently no
  export/backup path for recordings off the device.

## Testing locally

This is a static site with no dependencies or build step, but open it via
a local HTTP server rather than double-clicking `index.html`. This
matters more now than before: `getUserMedia` (needed for recording) is
only available in a browser "secure context," and `file://` doesn't
qualify — `http://localhost` or `http://127.0.0.1` do, via the browser's
localhost exception. (Browsers also restrict `fetch()`, used for the
`background.jpg` check, under `file://`.)

From the project root, pick one:

```bash
# Python (already available in this environment)
python -m http.server 8000

# Node, if you have it
npx serve .
```

Then open `http://127.0.0.1:8000` (or whatever port/URL your tool prints)
in a browser:

- Tap number/`*`/`#` keys — each should play its matching recording, with
  tapping a new key cutting off the previous one.
- Tap the red **record** button — grant the mic permission prompt if
  asked. The icon becomes a stop square and the status line counts up.
  Stop it manually, or let it hit the configured max — either way it
  should save and immediately play itself back with a progress timer.
- Tap the green **play** button — it should pick a saved recording at
  random and play it with a progress timer. It stays disabled until at
  least one recording exists.
- Record more than `MAX_RECORDINGS` clips to confirm the oldest ones get
  replaced (e.g. temporarily set `MAX_RECORDINGS` to something small like
  `2` in `script.js` to test this quickly).

To sanity-check assets are all reachable without opening a browser:

```bash
for f in index.html style.css script.js assets/keys/1.png audio/1.m4a audio/star.m4a; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://127.0.0.1:8000/$f"
done
```

All lines should print `200`.

### On the actual Fire Tablet

Fire OS ships the Silk browser (Chromium-based), which supports
`MediaRecorder` and `IndexedDB`. To test on-device:

1. Run a local server as above on the machine that will serve the app
   (or copy the files onto the tablet and serve them from there — Silk
   needs `http://localhost`/`127.0.0.1`, not a `file://` path, for mic
   access to work).
2. Open that URL in Silk and grant the microphone permission when
   prompted.
3. Repeat the record/replay checks above using the tablet's mic and
   speaker.
