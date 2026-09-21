# Deploying to the Gallery Tablet

This is a one-time setup, done once on the physical Fire tablet before it
goes on display. The goal: after this is done, nobody needs to touch a
browser, a terminal, or a server ever again — the tablet just needs to be
powered on and it runs the app by itself.

We use [Fully Kiosk Browser](https://www.fully-kiosk.com/en/) for this. It
solves two problems at once: it can serve this project's files itself
over `http://localhost` (which — as covered elsewhere in this repo — is
required for the microphone and recording storage to work), and it can
lock the tablet into fullscreen kiosk mode so gallery visitors can't back
out to the Fire OS home screen.

Note: Fully Kiosk Browser is free for basic use, but "Local Web Server /
Localhost File Access" is a **Plus** feature (a small one-time paid
unlock, roughly $8-10 as of writing — check current pricing on their
site). Budget for that before you start.

## What you'll need

- The Fire tablet
- A USB cable and a computer to transfer files, or another way to get
  files onto the tablet (email attachment, cloud drive if you have one
  set up on the tablet, etc.)
- A few minutes with the tablet unlocked and in front of you

## Step 1 — Copy the project onto the tablet

Connect the tablet to a computer via USB. It should show up as a drive in
File Explorer. Copy this whole project folder onto the tablet's internal
storage — for example into a new folder at:

```
Internal Storage/GriefIsCalling/
```

Keep the folder structure intact (`index.html`, `script.js`, `style.css`,
`audio/`, `assets/` all need to stay siblings, same as in this repo).

## Step 2 — Allow installing apps outside the Amazon Appstore

Fully Kiosk Browser isn't in the Amazon Appstore, so you need to sideload
it:

1. On the tablet: **Settings → Security & Privacy**
2. Turn on **Apps from Unknown Sources** (exact wording/location varies
   slightly by Fire OS version)

## Step 3 — Install Fully Kiosk Browser

1. Open Silk browser on the tablet and go to
   [fully-kiosk.com](https://www.fully-kiosk.com/en/)
2. Download the APK from their site and open it to install
   (you'll get a security warning since it's outside the Appstore — this
   is expected; allow the install)
3. Open the app once installed and grant any permissions it asks for

## Step 4 — Point it at the local project files

Inside Fully Kiosk Browser's settings (tap the screen with several
fingers, or use the on-screen menu — Fully Kiosk has a settings gear):

1. **Web Content → Local Web Server** — turn this on and set the root
   folder to the `GriefIsCalling` folder you copied over in Step 1
   (this is the Plus feature mentioned above)
2. **Web Content → Start URL** — set this to
   `http://localhost:2323/index.html` (Fully Kiosk's default local
   server port is `2323`; the settings screen will show you the exact
   address it's serving on if it differs)
3. Tap the Start URL / reload so the app loads, and confirm the keypad
   appears

## Step 5 — Grant the microphone permission once

Tap the red record button. Android will show a permission prompt — grant
it. This only needs to happen once; the app remembers the permission
after that (tied to Fully Kiosk Browser as the app, same as any other
Android app permission).

Test the full flow here on the tablet itself: record a few seconds,
confirm it stops/saves/plays back automatically, and confirm the green
Replay button picks a saved recording. See the main [README](README.md)
for the full test checklist.

While you're here, also try the admin panel: press and hold the title
text for ~5 seconds. It lists every recording and has a "Clear All
Recordings" button (two taps required — see [README](README.md) for
details). This isn't shown anywhere in the visible UI on purpose, so
gallery visitors won't find it — whoever is running the show is the one
who should know the press-and-hold, for clearing test recordings before
opening and resetting between sessions if needed.

## Step 6 — Turn on kiosk lockdown

Still in Fully Kiosk Browser's settings:

1. **Kiosk Mode → Enable Kiosk Mode** — locks the tablet to this one app,
   hides navigation/status bars, blocks the notification shade
2. **Other Settings → Start on Boot** — turns on so the app relaunches
   automatically any time the tablet is powered on or restarts
3. **Administrator Settings → set a PIN/password** for Fully Kiosk's own
   settings screen, so a gallery visitor fumbling around can't exit
   kiosk mode or change anything

Write the PIN down somewhere you (not the gallery) can find it later.

## Step 7 — Full reboot test

Power the tablet all the way off, then back on, without touching
anything else. It should boot straight into the keypad, fullscreen, with
no prompts. If it does, the setup is done.

Leave the tablet plugged into power for the run of the show — continuous
operation, no battery management needed.

---

## For gallery staff: day-to-day operation

*(This section is written for whoever is minding the installation day to
day — no technical background assumed.)*

The tablet is already set up to run "Grief Is Calling" on its own.

- **To start the day:** make sure the tablet is plugged in and powered
  on. That's it — the app opens by itself.
- **If the screen looks frozen or wrong:** hold the power button down
  for about 10 seconds until the tablet turns off, then press it once
  to turn it back on. It will reopen the app automatically.
- **Please don't:** install updates, change settings, or try to exit the
  app — it's intentionally locked to prevent this.
- **If a restart doesn't fix it:** contact [technical contact] rather
  than troubleshooting further.
