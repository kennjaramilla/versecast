# VerseCast

An open-source Bible-verse presenter for live broadcasts. Show verses on screen
through **OBS**, in **King James Version** and **Ang Dating Biblia 1905** (Tagalog)
— with more translations easy to add — using **1–4 split panes**: independent verses
per pane, or the same reference linked across versions.

Runs **locally and offline**. The operator works in a control window; OBS pulls a
clean, transparent display page through a Browser Source. Free to use and adapt for
any church, ministry, or stream.

---

## How it works

VerseCast is two screens talking in real time over a small local server:

- **Control panel** — pick the book/chapter/verse, version, layout, build a queue,
  adjust the look, and hit **Show / Clear**.
- **Display output** — a transparent page at `http://localhost:4321/display` that you
  add to OBS as a **Browser Source**. It updates the instant you click.

Because OBS runs on the same Mac, nothing needs to be on the internet — all Bible
text is bundled in the app.

```
Control panel ──┐
                ├── local sync server (WebSocket) ── Display ── OBS Browser Source
Other device ───┘   (localhost + LAN, port 4321)
```

## Features

- **KJV + Ang Dating Biblia 1905**, perfectly aligned (same versification), so panes
  line up across versions. Architected to add more versions later (`scripts/normalize.mjs`).
- **1–4 split panes.** *Independent* mode = any verse/version per pane. *Linked* mode =
  one reference filled into every pane in its own version (e.g. KJV + ADB side by side).
- **Fast operation** — type `John 3:16` or `Juan 3:16`, dropdowns, clickable verse list,
  prev/next verse with chapter crossing.
- **Queue / playlist** — prepare verses ahead of a service, push live with one click.
- **Clean broadcast look** — full-screen verse panel with the reference on top, a
  relaxing blue gradient (or transparent for overlay), plus text size, font, colors,
  alignment, reference/version labels, and fade controls.
- **Global search** — ⌘K palette: typo-tolerant reference lookup (`jhn 3 16`) or
  full-text keyword search across every translation (`love the world`).
- **Two-device option** — run the control panel from a laptop/tablet on the same WiFi
  while OBS runs on the main Mac (use the LAN URL shown on launch).
- **Clear / blackout** — instantly hide the screen without losing the loaded verses.

## Quick start (development)

```bash
npm run install:all   # install server + client deps
npm run data          # download + normalize KJV and ADB (first run only; output is committed)
npm run dev           # control: http://localhost:5173   display: http://localhost:5173/display
```

The sync server runs on `:4321`; the Vite dev client on `:5173`.

## Run as one app (serves everything on :4321)

```bash
npm run build         # build the client
npm start             # control + display on http://localhost:4321
```

## Build the Mac app

```bash
npm run dist          # builds VerseCast.app / .dmg into release/ (via electron-builder)
```

Or launch the desktop app without packaging:

```bash
npm run app
```

> The app is unsigned. The first time you open it, right-click → **Open** (or allow it
> in System Settings → Privacy & Security).

## Setting it up in OBS

1. Start VerseCast (the app, or `npm start`).
2. In OBS, add a **Source → Browser**.
3. Set the URL to **`http://localhost:4321/display`**.
4. Set Width/Height to your canvas (e.g. **1920 × 1080**).
5. Leave the background transparent — VerseCast composites over your video.
6. Pick verses in the control window; they appear on the OBS layer instantly.

## Bible sources & licensing

Both versions are **public domain** and bundled from the
[getBible](https://getbible.net) v2 dataset:

- **King James Version** (`kjv`)
- **Ang Dating Biblia / Ang Biblia 1905** (`tagalog`) — a widely-used Tagalog translation

`npm run data` re-downloads the raw text and regenerates the normalized JSON in
`client/public/bible/`.

## Project layout

```
server/      Express + WebSocket sync server (live state, serves the built client)
client/      Vite + React + TypeScript
  src/control/   operator console (layout, panes, picker, queue, appearance)
  src/display/   OBS output page (transparent, 1–4 panes, fade)
  src/lib/       bible loading/parsing, sync hook, pane helpers
  public/bible/  normalized KJV + ADB JSON (+ book metadata)
electron/    desktop wrapper (starts the server, opens the control window)
scripts/     normalize.mjs — turns raw getBible JSON into the bundled schema
```

## Contributing & adding translations

Translations are bundled as JSON under `client/public/bible/`. To add one, extend
`scripts/normalize.mjs` with another public-domain source (the [getBible](https://getbible.net)
v2 dataset has many) and add it to `versions.json`. Pull requests welcome.

## License

[MIT](LICENSE) © Kenneth Jaramilla. The bundled KJV and Ang Dating Biblia 1905
texts are public domain.
