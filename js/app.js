'use strict';

const CAPTION = 'A WILD MEMORY APPEARED!';
const COUNTDOWN_SECONDS = 3; // 1–5
// The download is the photo + frame only, 3:4 for the polaroid printer.
// The white polaroid card around it is on-screen styling, never baked in.
const OUT_WIDTH = 1200;
const OUT_HEIGHT = 1600;
const FLASH_HOLD_MS = 350; // stay at full white after the grab, then fade
const FLASH_RAMP_MS = 250; // full-white beat BEFORE the grab so the screen lights the face
const RECENTER_MS = 500; // menu-close glide before the countdown starts
const ATTRACT_MS = 1800; // GO screen: how long each frame shows in the rolling preview
const MENU_HINT_MS = 8000; // how long the one-time "pick a pokémon" tutorial lingers
const MENU_HINT_DELAY_MS = 500; // menu slide-in finishes before the spotlight appears

// The artist's logo — shown above the top bar (bottom of the screen on
// phones). Site UI only; it is never drawn into the saved photo.
const BRAND_LOGO_SRC = 'branding/logo.png';

const els = {
  app: document.getElementById('app'),
  video: document.getElementById('video'),
  brandLogo: document.getElementById('brand-logo'),
  overlay: document.getElementById('overlay'),
  cameraError: document.getElementById('camera-error'),
  retryCamera: document.getElementById('retry-camera'),
  countdown: document.getElementById('countdown'),
  countdownNum: document.getElementById('countdown-num'),
  camArrow: document.getElementById('cam-arrow'),
  screenFlash: document.getElementById('screen-flash'),
  caption: document.getElementById('caption'),
  dateStr: document.getElementById('date-str'),
  statusFrame: document.getElementById('status-frame'),
  statusFilter: document.getElementById('status-filter'),
  promptText: document.getElementById('prompt-text'),
  menuHint: document.getElementById('menu-hint'),
  hintBackdrop: document.getElementById('hint-backdrop'),
  panelFrames: document.getElementById('panel-frames'),
  panelFilters: document.getElementById('panel-filters'),
  goSnap: document.getElementById('go-snap'),
  goSnapLabel: document.getElementById('go-snap-label'),
 
  result: document.getElementById('result'),
  resultPhoto: document.getElementById('result-photo'),
  resultCaption: document.getElementById('result-caption'),
  resultDate: document.getElementById('result-date'),
  share: document.getElementById('share'),
  saveLink: document.getElementById('save-link'),
  retake: document.getElementById('retake'),
  goHome: document.getElementById('go-home'),
};

let stream = null;
let camOn = false;
let opened = false; // has GO been pressed?
let frameIdx = 1; // GENGAR by default
let filterIdx = 0;
let counting = false;
let countdownTimer = null;
let photoUrl = null;
let lastPhotoBlob = null;
let attractTimer = null;
let attractIdx = 0;
let overlayToken = 0; // stale async frame loads check this before painting
const frameImageCache = new Map();
const filterThumbs = [];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    '.' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '.' +
    String(d.getDate()).padStart(2, '0')
  );
}

function setPrompt(text) {
  els.promptText.textContent = text;
}

function renderStatus() {
  els.statusFrame.textContent = 'FRAME:' + FRAME_NAMES[frameIdx];
  els.statusFilter.textContent = 'FILTER:' + FILTERS[filterIdx].name;
  els.video.style.filter = FILTERS[filterIdx].css;
}

// ---------- Camera ----------

function stopStream() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  camOn = false;
}

async function startCamera() {
  els.cameraError.hidden = true;
  stopStream();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError(new Error('Camera needs HTTPS or localhost'));
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
    camOn = true;
    if (opened) refreshFilterThumbs();
  } catch (error) {
    showCameraError(error);
  }
}

function showCameraError(error) {
  console.error('Camera failed to start:', error);
  camOn = false;
  els.cameraError.hidden = false;
}

function restartCameraIfDead() {
  const track = stream && stream.getVideoTracks()[0];
  if (!track || track.readyState === 'ended') {
    startCamera();
  }
}

// ---------- Frames (code-drawn or image files) ----------

function loadFrameImage(src) {
  if (frameImageCache.has(src)) return frameImageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      frameImageCache.delete(src);
      reject(new Error('Frame image failed to load: ' + src));
    };
    img.src = src;
  });
  frameImageCache.set(src, promise);
  return promise;
}

function paintOverlay(frame) {
  const canvas = els.overlay;
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, FRAME_W, FRAME_H);
  overlayToken += 1;
  const token = overlayToken;
  if (frame.draw) {
    frame.draw(ctx);
  } else if (frame.src) {
    loadFrameImage(frame.src)
      .then((img) => {
        if (overlayToken === token) ctx.drawImage(img, 0, 0, FRAME_W, FRAME_H);
      })
      .catch((error) => {
        console.error(error);
        setPrompt('That frame image is missing!');
      });
  }
}

function drawOverlay() {
  paintOverlay(FRAMES[frameIdx]);
}

// ---------- GO-screen attract mode: roll through the frames ----------

const ATTRACT_FRAMES = FRAMES.filter((frame) => frame.draw || frame.src);

function startAttract() {
  if (attractTimer || ATTRACT_FRAMES.length === 0) return;
  // Preload every frame image so the roll never flashes empty.
  ATTRACT_FRAMES.forEach((frame) => {
    if (frame.src) loadFrameImage(frame.src).catch(() => {});
  });
  paintOverlay(ATTRACT_FRAMES[attractIdx]);
  attractTimer = setInterval(() => {
    attractIdx = (attractIdx + 1) % ATTRACT_FRAMES.length;
    paintOverlay(ATTRACT_FRAMES[attractIdx]);
  }, ATTRACT_MS);
}

function stopAttract() {
  if (!attractTimer) return;
  clearInterval(attractTimer);
  attractTimer = null;
}

// ---------- Pokémon-style menus ----------

function updateMenuSelection(panel, selectedIdx) {
  panel.querySelectorAll('.menu-item').forEach((item, index) => {
    item.classList.toggle('selected', index === selectedIdx);
  });
}

const POKEBALL_SRC = 'sprites/pokeball.png';

function buildFrameMenu() {
  FRAMES.forEach((frame, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    // Pokéball chip with the pokémon's sprite popping out over it;
    // NONE is just an empty ball.
    const icon = document.createElement('span');
    icon.className = 'ball-icon' + (frame.sprite ? '' : ' empty');
    const ball = document.createElement('img');
    ball.className = 'ball-img';
    ball.src = POKEBALL_SRC;
    ball.alt = '';
    icon.appendChild(ball);
    if (frame.sprite) {
      const sprite = document.createElement('img');
      sprite.className = 'ball-sprite';
      sprite.src = frame.sprite;
      sprite.alt = '';
      icon.appendChild(sprite);
    }
    item.appendChild(icon);
    const label = document.createElement('span');
    label.className = 'menu-label';
    label.textContent = frame.name;
    item.appendChild(label);
    item.addEventListener('click', () => {
      frameIdx = index;
      drawOverlay();
      updateMenuSelection(els.panelFrames, frameIdx);
      renderStatus();
    });
    els.panelFrames.appendChild(item);
  });
  updateMenuSelection(els.panelFrames, frameIdx);
}

function buildFilterMenu() {
  FILTERS.forEach((filter, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    const thumb = document.createElement('span');
    thumb.className = 'menu-thumb';
    thumb.style.filter = filter.css;
    filterThumbs.push(thumb);
    const label = document.createElement('span');
    label.className = 'menu-label';
    label.textContent = filter.name;
    item.appendChild(thumb);
    item.appendChild(label);
    item.addEventListener('click', () => {
      filterIdx = index;
      updateMenuSelection(els.panelFilters, filterIdx);
      renderStatus();
    });
    els.panelFilters.appendChild(item);
  });
  updateMenuSelection(els.panelFilters, filterIdx);
}

// Snapshot the camera into every filter thumb so each shows a live
// "you, with this filter" preview. Falls back to a gradient when no camera.
function refreshFilterThumbs() {
  const video = els.video;
  if (!camOn || !video.videoWidth) return;
  const W = 90;
  const H = 120;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = W / H;
  let sw = vw;
  let sh = vh;
  if (vw / vh > targetRatio) sw = vh * targetRatio;
  else sh = vw / targetRatio;
  ctx.translate(W, 0);
  ctx.scale(-1, 1); // mirror to match the preview
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
  const url = canvas.toDataURL('image/jpeg', 0.7);
  filterThumbs.forEach((thumb) => {
    thumb.style.backgroundImage = 'url(' + url + ')';
  });
}

// ---------- GO → menus → SNAP flow ----------

// One-time tutorial: darken everything except the frame/filter menu and
// float a speech bubble over it. Dismissed by the first tap anywhere
// (picking something counts) or after a few seconds.
let hintShown = false;

function showMenuHint() {
  if (hintShown) return;
  hintShown = true;
  els.hintBackdrop.hidden = false;
  els.menuHint.hidden = false;
  els.app.classList.add('hint-spot');
  const dismiss = () => {
    els.hintBackdrop.hidden = true;
    els.menuHint.hidden = true;
    els.app.classList.remove('hint-spot');
    document.removeEventListener('pointerdown', dismiss);
  };
  document.addEventListener('pointerdown', dismiss);
  setTimeout(dismiss, MENU_HINT_MS);
}

function openBooth() {
  opened = true;
  stopAttract();
  drawOverlay(); // lock the overlay back to the selected frame
  els.app.classList.add('open');
  els.goSnapLabel.textContent = 'SNAP!';
  setPrompt('What will YOU do?');
  refreshFilterThumbs();
  // Wait for the menu slide-in to finish — mid-animation the panel's
  // transform would keep the spotlight from rising above the backdrop.
  setTimeout(showMenuHint, MENU_HINT_DELAY_MS);
}

function onGoSnap() {
  if (!opened) {
    openBooth();
    return;
  }
  snap();
}

async function snap() {
  if (counting) return;
  if (!camOn || !els.video.videoWidth) {
    setPrompt('Start the camera first!');
    return;
  }
  counting = true;
  els.goSnap.disabled = true;

  // Close the menus so the preview glides back to center — all eyes forward!
  els.app.classList.remove('open');
  setPrompt('Look at the camera!');
  await wait(RECENTER_MS);

  let n = Math.max(1, Math.round(COUNTDOWN_SECONDS));
  els.countdownNum.textContent = n;
  els.countdown.hidden = false; // number + FLASH INCOMING warning
  els.camArrow.hidden = false; // bouncing arrow pointing at the camera
  countdownTimer = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(countdownTimer);
      els.countdown.hidden = true;
      els.camArrow.hidden = true;
      capture();
    } else {
      els.countdownNum.textContent = n;
    }
  }, 1000);
}

// ---------- Capture ----------

async function buildPhotoCanvas() {
  const video = els.video;
  const frame = FRAMES[frameIdx];
  const frameImg = frame.src ? await loadFrameImage(frame.src) : null;
  const canvas = document.createElement('canvas');
  canvas.width = OUT_WIDTH;
  canvas.height = OUT_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c2430';
  ctx.fillRect(0, 0, OUT_WIDTH, OUT_HEIGHT);

  if (video.videoWidth) {
    // Cover-crop the camera to 3:4, centered.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = OUT_WIDTH / OUT_HEIGHT;
    let sw = vw;
    let sh = vh;
    if (vw / vh > targetRatio) sw = vh * targetRatio;
    else sh = vw / targetRatio;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.save();
    if (typeof ctx.filter === 'string') {
      ctx.filter = FILTERS[filterIdx].css;
    }
    ctx.translate(OUT_WIDTH, 0);
    ctx.scale(-1, 1); // mirror, so the photo matches the preview
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, OUT_WIDTH, OUT_HEIGHT);
    ctx.restore();
  }

  ctx.save();
  ctx.scale(OUT_WIDTH / FRAME_W, OUT_HEIGHT / FRAME_H);
  if (frame.draw) frame.draw(ctx);
  else if (frameImg) ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);
  ctx.restore();

  return canvas;
}

function snapFailed(message) {
  counting = false;
  els.goSnap.disabled = false;
  els.app.classList.add('open'); // bring the menus back
  setPrompt(message);
}

async function capture() {
  // White out the whole screen FIRST — the display is the flash, so it
  // needs a beat at full brightness to actually light the face up before
  // the video frame is grabbed.
  els.screenFlash.classList.add('on');
  await wait(FLASH_RAMP_MS);

  let canvas;
  try {
    canvas = await buildPhotoCanvas();
  } catch (error) {
    console.error('Capture failed:', error);
    els.screenFlash.classList.remove('on');
    snapFailed('SNAP failed — try again!');
    return;
  }
  canvas.toBlob((blob) => {
    if (!blob) {
      els.screenFlash.classList.remove('on');
      snapFailed('SNAP failed — try again!');
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    lastPhotoBlob = blob;
    setTimeout(() => {
      // Fading the flash out reveals the result screen underneath.
      els.resultDate.textContent = dateStr();
      els.resultPhoto.src = photoUrl;
      els.saveLink.href = photoUrl;
      els.result.hidden = false;
      els.screenFlash.classList.remove('on');
      counting = false;
      els.goSnap.disabled = false;
    }, FLASH_HOLD_MS);
  }, 'image/png');
}

function goHome() {
  // Hide the modal before reloading — iOS home-screen apps can restore the
  // page from a snapshot, which would bring the open GOTCHA screen back.
  els.result.hidden = true;
  location.reload();
}

function retake() {
  els.result.hidden = true;
  els.app.classList.add('open'); // reopen the menus for the next round
  setPrompt('What will YOU do?');
  refreshFilterThumbs();
}

// ---------- Share (AirDrop / Save to Photos via the native share sheet) ----------

function canShareFiles() {
  if (!navigator.canShare) return false;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', {
      type: 'image/png',
    });
    return navigator.canShare({ files: [probe] });
  } catch (error) {
    return false;
  }
}

async function sharePhoto() {
  if (!lastPhotoBlob) return;
  const file = new File([lastPhotoBlob], 'snap-studio.png', { type: 'image/png' });
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    if (error.name === 'AbortError') return; // user closed the share sheet
    console.error('Share failed:', error);
    setPrompt('Sharing failed — use SAVE instead!');
    els.result.hidden = true;
  }
}

// ---------- Keep-awake + offline ----------

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    await navigator.wakeLock.request('screen');
  } catch (error) {
    console.warn('Wake lock unavailable:', error);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal) {
    // No offline cache during local development — always serve fresh files.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    return;
  }
  if (location.protocol !== 'https:') return;
  navigator.serviceWorker.register('sw.js').catch((error) => {
    console.warn('Service worker registration failed:', error);
  });
}

// ---------- Init ----------

function init() {
  els.result.hidden = true; // never trust restored page state to keep it closed

  els.brandLogo.addEventListener('load', () => {
    els.brandLogo.hidden = false;
  });
  els.brandLogo.src = BRAND_LOGO_SRC; // stays hidden if the file is missing

  els.caption.textContent = CAPTION;
  els.dateStr.textContent = dateStr();
  els.resultCaption.textContent = CAPTION;
  els.resultDate.textContent = dateStr();

  buildFrameMenu();
  buildFilterMenu();
  renderStatus();

  startAttract(); // GO screen rolls through the frames until GO is pressed
  if (document.fonts) {
    // Code-drawn frames use pixel fonts; repaint once they arrive (image
    // frames don't care, and the attract roll repaints on its own anyway).
    document.fonts.load('16px "Press Start 2P"').then(() => {
      if (!attractTimer) drawOverlay();
    });
  }

  startCamera();
  registerServiceWorker();
  requestWakeLock();

  els.goSnap.addEventListener('click', onGoSnap);
  els.retryCamera.addEventListener('click', startCamera);
  els.retake.addEventListener('click', retake);
  // Installed PWAs have no browser chrome, so this is the only way to reload —
  // a full reload lands back on the GO screen and picks up new versions online.
  els.goHome.addEventListener('click', goHome);
  els.share.hidden = !canShareFiles();
  els.share.addEventListener('click', sharePhoto);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    requestWakeLock();
    restartCameraIfDead();
  });

  window.addEventListener('pageshow', (event) => {
    // A page restored from the back-forward cache keeps its old DOM (open
    // modal included) — reload it so the booth always starts clean.
    if (event.persisted) location.reload();
  });

  if (location.hash === '#open') openBooth(); // dev shortcut: skip the GO screen
}

init();
