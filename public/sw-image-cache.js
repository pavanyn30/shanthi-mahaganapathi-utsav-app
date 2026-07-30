/**
 * Service Worker for High-Performance Image Caching.
 * Intercepts image requests and serves them from CacheStorage instantly.
 */

const IMAGE_CACHE_NAME = 'app-image-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== IMAGE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept image requests (or images from trusted domains/paths)
  const isImage =
    request.destination === 'image' ||
    url.pathname.match(/\.(webp|avif|jpg|jpeg|png|gif|svg)$/i) ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('supabase.co');

  if (isImage && request.method === 'GET') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Stale-While-Revalidate: Return cached response immediately while updating in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
    );
  }
});
