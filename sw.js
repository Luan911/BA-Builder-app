// Service worker: makes updates show up immediately and lets the app open offline.
//
// - App files (same site): "network first". Every request asks the server whether the
//   file changed (cache: 'no-cache' revalidates, so unchanged files cost a tiny 304).
//   This bypasses GitHub Pages' 10-minute browser cache, so a new version is never
//   mixed with old files. If the network is down, the last copy is used instead.
// - Pinned CDN libraries (Mermaid, jsPDF, JSZip): "cache first" — their URLs contain an
//   exact version, so they never change; caching them makes diagrams and exports
//   work offline after first use.

const APP_CACHE = 'autospec-app-v1';
const LIB_CACHE = 'autospec-libs-v1';
const PINNED_LIB = /^https:\/\/cdn\.jsdelivr\.net\/npm\/[^/]+@\d+\.\d+\.\d+\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([APP_CACHE, LIB_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  } else if (PINNED_LIB.test(req.url)) {
    event.respondWith(cacheFirst(req));
  }
  // Anything else (e.g. web fonts) is left to the browser.
});

async function networkFirst(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const fresh = await fetch(req, { cache: 'no-cache' });
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const shell = await cache.match(new URL('./', self.location).href) || await cache.match(new URL('./index.html', self.location).href);
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(LIB_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
