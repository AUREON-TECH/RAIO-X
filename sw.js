// RAIO X • shell operacional Outubro/2026.
const CACHE = 'raiox-v80-mobile-dashboard';
const CORE = ['./index.html','./styles.css','./entry-v2.css','./arena-x.css','./ops-dashboard.css','./diagnostic.css','./fx.css','./layout-premium.css','./mobile-compact.css','./mobile-entry-fix.css','./mobile-executive.css','./area-data.js','./fx-data.js','./app.js','./fx-engine.js','./sales-count-fix.js','./month-live.js','./gestao-rafael.js','./auth-config.js','./install.js','./xia-performance.js','./auth.css','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SENSITIVE_PARAMS = /(^|_)(token|access_token|refresh_token|password|senha|secret|session|auth|authorization|code|credential|credentials|api_key|apikey)(_|$)/i;
const PRIVATE_PATHS = /\/(api|auth|login|logout|session|sessions|account|profile|admin)(\/|$)/i;
const ALWAYS_NETWORK_FIRST = /\/(?:auth|ceo|pending|xia-performance|month-live)\.(?:js|css|html)$/i;

function requestIsPrivate(request) {
  if (request.method !== 'GET') return true;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (/supabase/i.test(url.hostname) || PRIVATE_PATHS.test(url.pathname)) return true;
  for (const key of url.searchParams.keys()) if (SENSITIVE_PARAMS.test(key)) return true;
  const headers = request.headers;
  return Boolean(headers.get('authorization') || headers.get('cookie') || headers.get('range') || headers.get('if-range'));
}

function responseIsCacheable(response) {
  if (!response || !response.ok || response.status === 206 || response.type === 'opaque' || response.redirected) return false;
  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  if (response.headers.get('set-cookie') || response.headers.get('content-range')) return false;
  const vary = (response.headers.get('vary') || '')
    .toLowerCase()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (vary.includes('*') || vary.includes('authorization') || vary.includes('cookie') || vary.includes('range') || vary.includes('if-range')) return false;
  return true;
}

function isPublicShellRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return false;
  if (requestIsPrivate(request)) return false;
  const shellPaths = new Set(CORE.map((asset) => new URL(asset, self.registration.scope).pathname));
  return shellPaths.has(url.pathname);
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(CORE.map(async (asset) => {
    try {
      const response = await fetch(asset, { cache: 'no-store', credentials: 'omit', redirect: 'error' });
      if (responseIsCacheable(response)) await cache.put(asset, response.clone());
    } catch (error) {
      console.warn('RAIO X precache skipped:', asset, error);
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => (key.startsWith('setembrox-') || key.startsWith('raiox-')) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (requestIsPrivate(request)) return;
  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate' || url.pathname.endsWith('/index.html');

  if (url.origin === self.location.origin && ALWAYS_NETWORK_FIRST.test(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-store', credentials: 'same-origin', redirect: 'follow' })
        .then(async (response) => {
          if (responseIsCacheable(response)) {
            const cache = await caches.open(CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );
    return;
  }

  if (isNavigation) {
    event.respondWith(
      fetch(request, { cache: 'no-store', credentials: 'same-origin', redirect: 'follow' })
        .catch(async () => (await caches.match('./index.html')) || Response.error())
    );
    return;
  }

  if (!isPublicShellRequest(request, url)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    const response = await fetch(request, { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (responseIsCacheable(response)) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});