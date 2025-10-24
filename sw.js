self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('taxa-cache-v1').then((c) => c.addAll(['/'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open('taxa-cache-v1').then((c) => c.put(event.request, copy)).catch(() => {});
        return resp;
      }).catch(() => cached)
    )
  );
});
