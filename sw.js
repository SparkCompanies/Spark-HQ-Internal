/* Spark HQ service worker (PWA_v1 + PUSH_v1): network-first, no page caching (people always get the live site); icons cached; push + click handling. */
const ICON_CACHE = 'hq-icons-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(ICON_CACHE).then((c) => c.addAll(['/icons/hq-192.png', '/icons/hq-512.png']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.startsWith('/icons/')) e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Spark HQ', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Spark HQ', { body: d.body || '', icon: '/icons/hq-192.png', badge: '/icons/hq-192.png', tag: d.tag || 'hq', renotify: !!d.tag, data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const c of list) { if (c.url.startsWith(self.location.origin)) { c.focus(); if ('navigate' in c && c.url !== url) c.navigate(url); return; } } return self.clients.openWindow(url); }));
});
