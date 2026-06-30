const CACHE_MATCH = /mintzakats|workbox|vite-pwa/i

/** Auth/API traffic must never be cached or intercepted by a future handler. */
function shouldAlwaysUseNetwork(request) {
  const url = new URL(request.url)
  if (url.hostname.endsWith('.supabase.co')) return true
  if (url.pathname.startsWith('/auth/v1/')) return true
  if (url.pathname.startsWith('/rest/v1/')) return true
  if (url.pathname.startsWith('/functions/v1/')) return true
  if (request.method !== 'GET') return true
  if (request.headers.get('Authorization')) return true
  return false
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()

      await Promise.all(
        cacheKeys
          .filter((key) => CACHE_MATCH.test(key))
          .map((key) => caches.delete(key)),
      )

      await self.clients.claim()

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      await self.registration.unregister()

      await Promise.all(
        clients.map((client) => client.navigate(client.url)),
      )
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  // Always pass through; shouldAlwaysUseNetwork documents routes that must stay network-only.
  void shouldAlwaysUseNetwork(event.request)
  event.respondWith(fetch(event.request))
})
