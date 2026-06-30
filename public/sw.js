const CACHE_MATCH = /mintzakats|workbox|vite-pwa/i

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
  event.respondWith(fetch(event.request))
})
