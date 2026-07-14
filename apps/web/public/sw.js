/**
 * OpenStage service worker — network-first with a cache fallback, so the
 * editor still opens without a connection after the first visit (documents
 * live in localStorage/IndexedDB anyway; only the app shell needs caching).
 * ponytail: no precache manifest — the first online visit fills the cache.
 */
const CACHE = 'openstage-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Live endpoints must never be served stale.
  if (url.pathname.startsWith('/collab') || url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, {
          ignoreSearch: event.request.mode === 'navigate',
        });
        if (cached !== undefined) return cached;
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/', { ignoreSearch: true });
          if (shell !== undefined) return shell;
        }
        return Response.error();
      }),
  );
});
