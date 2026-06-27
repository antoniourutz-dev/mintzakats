const CACHE_NAME = 'mintzakats-v1';
const ASSETS = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Network Only for root and index.html to avoid version mismatches
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First strategy for other assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        // Only cache valid responses from our own origin
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch((error) => {
        // If fetch fails (e.g. offline or 404 for a missing chunk), 
        // we return a proper error instead of letting the SW crash
        console.error('Fetch failed for:', event.request.url, error);
        return new Response('Network error occurred', { status: 408, statusText: 'Network Error' });
      });
    })
  );
});
