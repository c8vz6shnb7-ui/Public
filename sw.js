/* ============================================================
   Arcade service worker
   - Pages/games: NETWORK-FIRST. Kids see your latest push when
     online; fall back to cache only when offline.
   - Static assets (fonts, icons): cache, but refresh in background.

   >>> WHEN AN UPDATE WON'T SHOW UP: bump CACHE_VERSION below by 1
       and re-push. That wipes the old cache on next load. <<<
   ============================================================ */
const CACHE_VERSION = 3;
const CACHE = `arcade-v${CACHE_VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // Network-first so game updates appear immediately when online.
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) ||
               (await caches.match('index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // Static assets: serve cached, update in the background.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
