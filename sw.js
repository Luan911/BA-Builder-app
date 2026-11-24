// Offline support. On install it saves every file the app needs (listed in offline-files.json,
// written by tools/offline-list.mjs) into a cache named after the version. Pages are then served from
// that cache, so BA Builder opens and works without internet. A new version waits until the user
// chooses to reload (the app shows "Update ready"), so old and new files never mix.
const VERSION = 'bdf5b5c63538';
const CACHE = `bab-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const list = await (await fetch('offline-files.json', { cache: 'reload' })).json();
    const cache = await caches.open(CACHE);
    // one by one, so a single missing file does not stop the rest from being saved
    await Promise.all(list.files.map(async (f) => {
      try {
        const res = await fetch(f, { cache: 'reload' });
        if (res.ok) await cache.put(f, res);
      } catch { /* left out; fetched from the network when online */ }
    }));
    await cache.put('./', await cache.match('index.html') || await fetch('./', { cache: 'reload' }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE && key.startsWith('bab-')) await caches.delete(key);
    // old caches from the previous version of this site
    for (const key of await caches.keys()) if (!key.startsWith('bab-')) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'update') self.skipWaiting();
  if (event.data === 'status') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const n = (await cache.keys()).length;
      event.source?.postMessage({ type: 'status', version: VERSION, files: n });
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/tests/')) return; // the test pages always use the network
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      // the page itself: network first (quick check for a newer page), the saved copy when offline
      try {
        const res = await fetch(req);
        if (res.ok) return res;
      } catch { /* offline */ }
      return (await cache.match('index.html')) || (await cache.match('./')) || new Response('BA Builder is offline and has not been saved on this device yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return fetch(req);
  })());
});
