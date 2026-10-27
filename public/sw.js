/*
 * Self-destructing service worker.
 *
 * A previous theme may have registered /sw.js and precached index.html. After switching
 * themes that HTML still points at hashed assets which no longer exist, and the page
 * goes blank. Browsers check /sw.js on navigation, so shipping this file lets the stale
 * worker be replaced by one that clears every cache, unregisters itself and reloads.
 *
 * zool-theme registers no service worker of its own.
 */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        /* storage may be unavailable */
      }
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })(),
  )
})

// Always go to the network; never serve a cached response.
self.addEventListener('fetch', () => {})
