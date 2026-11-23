const CACHE_NAME = 'github-post-v8';
const urlsToCache = [
  '/github-post-pwa/',
  '/github-post-pwa/index.html',
  '/github-post-pwa/share.html',
  '/github-post-pwa/note.html',
  '/github-post-pwa/styles.css',
  '/github-post-pwa/app.js',
  '/github-post-pwa/issue-core.js',
  '/github-post-pwa/drafts.js',
  '/github-post-pwa/note.js',
  '/github-post-pwa/share.js',
  '/github-post-pwa/response.js',
  '/github-post-pwa/follow-core.js',
  '/github-post-pwa/follow.js',
  '/github-post-pwa/manifest.json',
  '/github-post-pwa/shortcut-note.png',
  '/github-post-pwa/shortcut-link.png',
  '/github-post-pwa/icon.webp',
  '/github-post-pwa/icon-192.webp',
  '/github-post-pwa/icon-512.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Network first, so a new release never mixes a fresh page with stale cached scripts
// ('no-cache' makes the browser check with the server instead of trusting its own copy).
// The cache is only the offline fallback; the query string is ignored so a shared page
// (share.html?title=...&url=...) still finds its cached copy.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});