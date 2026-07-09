const CACHE = 'milego-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/checkout.html',
  '/gracias.html',
  '/producto/organimax.html',
  '/css/main.css',
  '/js/app.js',
  '/data/reviews.js',
  '/data/locations.json',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/assets/img/favicon.png',
  '/assets/img/hero.webp',
  '/assets/img/before.webp',
  '/assets/img/after.webp',
  '/assets/img/client1.webp',
  '/assets/img/client2.webp',
  '/assets/img/client3.webp',
  '/admin/admin.html',
  '/admin/admin.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE).catch((err) => {
        console.warn('[SW] Precache falló para algunos recursos:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
