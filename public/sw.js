/* Mintzakats service worker — static assets only. Never cache API/Auth/Supabase. */
const CACHE_VERSION = '__SW_CACHE_VERSION__';
const CACHE_NAME = `mintzakats-static-${CACHE_VERSION}`;

const PRECACHE_URLS = ['/manifest.json', '/favicon.svg', '/icon-512.png'];

function shouldBypassServiceWorker(request) {
  if (request.method !== 'GET') {
    return true;
  }

  if (request.headers.get('authorization')) {
    return true;
  }

  const url = new URL(request.url);

  if (url.hostname.endsWith('.supabase.co')) {
    return true;
  }

  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/realtime/v1/')
  ) {
    return true;
  }

  return false;
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') {
    return true;
  }

  const accept = request.headers.get('accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html');
}

function isVersionedAsset(url) {
  return (
    url.pathname.startsWith('/assets/') &&
    /\.[a-zA-Z0-9_-]{6,}\.(js|css|woff2?|png|svg|webp)$/i.test(url.pathname)
  );
}

function isPrecacheStatic(url) {
  return url.origin === self.location.origin && PRECACHE_URLS.includes(url.pathname);
}

function isCacheableStatic(url, request) {
  if (url.origin !== self.location.origin) {
    return false;
  }
  return isVersionedAsset(url) || isPrecacheStatic(url);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((error) => {
        console.warn('[PWA] Precache failed', error);
      }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (shouldBypassServiceWorker(request)) {
    return;
  }

  const url = new URL(request.url);

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableStatic(url, request)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  event.respondWith(networkOnly(request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/index.html', response.clone());
    }
    return response;
  } catch (error) {
    const cached =
      (await caches.match('/index.html')) ?? (await caches.match('/')) ?? (await caches.match(request));
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkOnly(request) {
  return fetch(request);
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
