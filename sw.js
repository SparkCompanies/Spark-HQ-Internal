/* Spark HQ service worker (PWA_v1): network-first, no offline caching of app pages, so people always get the live site.
   Icons are cached so the installed app opens cleanly. */
const ICON_CACHE = 'hq-icons-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(ICON_CACHE).then((c) => c.addAll(['/icons/hq-192.png', '/icons/hq-512.png']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
