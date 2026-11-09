// Service worker: makes the game load instantly and work offline.
// Bump VERSION whenever a file of the game changes, so players get the update.
const VERSION = 'smash-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './js/config.js',
  './js/main.js',
  './js/game.js',
  './js/art.js',
  './js/characters.js',
  './js/audio.js',
  './js/leaderboard.js',
  './img/macron.webp',
  './img/macron-hit.webp',
  './img/obama.webp',
  './img/obama-hit.webp',
  './fonts/LilitaOne-Regular-latin.woff2',
  './fonts/Nunito-latin.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Same-origin files: stale-while-revalidate (instant from cache, refreshed in
// the background). Everything else (the leaderboard database) goes straight
// to the network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const network = fetch(req)
    .then(async (res) => {
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(VERSION);
        await cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);
  event.waitUntil(network);

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
