// Minimal service worker — enables PWA install + offline app shell.
// IMPORTANT: it must NEVER cache /api responses (data + auth always hit the network).
const CACHE = 'hisab-v1'
const SHELL = ['/']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only touch same-origin GETs; leave the API, auth, and health check alone.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname === '/healthz'
  ) {
    return
  }

  // Navigations: network-first (always get the latest app), fall back to cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  // Hashed static assets: cache-first (filenames change on every build, so this is safe).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
            return res
          })
          .catch(() => cached),
    ),
  )
})
