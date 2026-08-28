'use strict';

// Bump the version whenever you change any file so devices pick up the new
// copy on their next online visit.
const CACHE_NAME = 'snap-studio-v31';

const CORE_ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/filters.js',
  'js/frames.js',
  'js/app.js',
  'manifest.webmanifest',
  'frames/gengar.png',
  'frames/sprigatito.png',
  'frames/oshawott.png',
  'sprites/pokeball.png',
  'sprites/gengar.png',
  'sprites/sprigatito.png',
  'sprites/oshawott.png',
  'branding/logo.png',
  'icons/icon-180.png',
  'icons/icon-512.png',
];

// Same-origin files plus the Google Fonts CSS + font files (Press Start 2P,
// VT323) get cached so the booth still looks right with no wifi.
const CACHEABLE_ORIGINS = [
  self.location.origin,
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: after one online visit everything works offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!CACHEABLE_ORIGINS.includes(new URL(request.url).origin)) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            // Opaque responses cover the no-cors Google Fonts stylesheet.
            if (response.ok || response.type === 'opaque') {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => (request.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
