# ☰ SNAP-STUDIO! — retro battle photobooth

A photobooth website for an artist booth, styled like a retro handheld battle
screen (design source: the "Pokemon Battle Photobooth" Claude Design project).
Pick a frame and a filter, hit **SNAP!**, get a 3-2-1 countdown and a flash,
and save a polaroid-style PNG. Works offline after it has loaded once.

## How it works

- 3:4 live camera preview (front camera, mirrored) inside a polaroid card,
  with the selected frame drawn on top and the selected filter applied live.
- Battle-menu controls: **SNAP!**, **FRAME** (NONE / BATTLE / GRASS / STARS /
  CARD), **FILTER** — ten looks: the original six (HANDHELD is the Game Boy
  green one) plus four Instagram-style presets adapted from CSSgram (LOFI /
  REYES / WALDEN / NASHVILLE). The filter menu shows each look as a live
  camera thumbnail, so people pick by eye instead of by name.
- The artist's logo shows in the top bar when `branding/logo.png` exists
  (see [branding/](branding/)) — site UI only, never drawn into the photos.
  It's cached for offline automatically after one online visit.
- **SHARE** opens the iPad's native share sheet — AirDrop the photo straight
  to another device, or Save to Photos. (The button only appears on browsers
  that support sharing files; desktop browsers usually just show SAVE.)
- **SAVE** downloads a copy: a `1200 × 1600` PNG — the 3:4 photo with the
  frame baked in, ready for the polaroid printer. The white polaroid card,
  caption, and date you see on screen are preview styling only and are NOT in
  the file (the polaroid paper provides its own border when printed).

## Frames and filters

A frame is either **drawn in code** or an **image file** — both kinds live in
the `FRAMES` list in [js/frames.js](js/frames.js). The placeholder frames
(BATTLE / GRASS / STARS / CARD) are code-drawn; the real art replaces them as
image frames:

1. Export the drawing as a **transparent PNG in 3:4 portrait — 1200 × 1600 px**
   recommended (same shape as the photo; the middle must stay transparent).
2. Drop the file into the [frames/](frames/) folder.
3. Add `{ name: 'PIKA', src: 'frames/pika.png' }` to `FRAMES` in
   [js/frames.js](js/frames.js) — the name shows as a chip in the FRAME menu.
4. For offline use: add `'frames/pika.png'` to `CORE_ASSETS` in [sw.js](sw.js)
   and bump `CACHE_NAME`. Delete the code-drawn entries once the art is in.

Filters: [js/filters.js](js/filters.js) — each filter is one CSS `filter`
string. Caption text, countdown length, and output size are constants at the
top of [js/app.js](js/app.js).

## Putting it online (needed for the camera)

Browsers only allow camera access over **HTTPS** (or localhost):

- **Netlify Drop**: drag this folder onto <https://app.netlify.com/drop> —
  instant link.
- **GitHub Pages**: push to a repo, enable Pages.

Local preview:

```sh
cd "Aloy's polaroid printer"
python3 -m http.server 8000
# open http://localhost:8000
```

## Booth day checklist (weak wifi survival)

1. On good wifi, open the hosted link on the iPad in Safari.
2. **Share → Add to Home Screen**, then open it from the icon and allow the
   camera. Take a test shot with every frame + filter. The service worker
   caches everything, including the two Google Fonts.
3. At the booth it works with **no wifi**. Use SHARE to AirDrop each photo to
   the printer phone/laptop on the spot (AirDrop needs no wifi), or SAVE to
   keep a copy in Files → Downloads.
4. Keep the iPad plugged in — the screen is kept awake while the booth is open.

> Changed any file? Bump `CACHE_NAME` in [sw.js](sw.js) (e.g. `snap-studio-v3`)
> and reload once on wifi so devices pick up the new version.

## Manual test checklist

Camera hardware can't be covered by automated tests, so before booth day check:

- [ ] Preview appears (mirrored) with BATTLE frame on by default
- [ ] FRAME and FILTER panels open, chips select (dark = selected), BACK returns
- [ ] Filters change the live preview immediately
- [ ] SNAP! → 3-2-1 pixel countdown → flash → GOTCHA! polaroid appears
- [ ] Saved PNG is 1200×1600 (3:4) with frame and filter baked in — and NO white polaroid border or caption text in the file
- [ ] CAMERA NOT FOUND! screen shows when permission is denied; START CAMERA recovers
- [ ] Airplane mode + reopen from home screen icon → fonts, frames, everything still works
