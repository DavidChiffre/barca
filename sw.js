const CACHE = 'barca-v2';
const TILES = 'barca-tiles-v1';
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/data.js',
  './js/i18n.js',
  './js/time.js',
  './js/now.js',
  './js/timeline.js',
  './js/map.js',
  './js/wallet.js',
  './js/edits.js',
  './i18n/en.json',
  './i18n/ro.json',
  './data/trip.json',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES).then(cache =>
        cache.match(e.request).then(hit =>
          hit || fetch(e.request).then(resp => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => new Response('', { status: 404 }))
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'prefetch-tiles') {
    const tiles = e.data.tiles;
    caches.open(TILES).then(async cache => {
      let done = 0;
      for (const url of tiles) {
        try {
          const hit = await cache.match(url);
          if (!hit) {
            const resp = await fetch(url);
            if (resp.ok) await cache.put(url, resp);
          }
        } catch (_) {}
        done++;
        if (done % 10 === 0 || done === tiles.length) {
          const clients = await self.clients.matchAll();
          for (const c of clients) c.postMessage({ type: 'tile-progress', done, total: tiles.length });
        }
      }
      const clients = await self.clients.matchAll();
      for (const c of clients) c.postMessage({ type: 'tiles-done' });
    });
  }
});
