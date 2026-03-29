/**
 * sw.js – Service Worker Inguru
 * Cache-first pour les assets locaux uniquement.
 * Les ressources CDN externes (Leaflet) ne sont PAS pré-cachées
 * pour éviter que leur lenteur bloque l'installation du SW.
 */

const CACHE_NAME = 'inguru-v4';

// Uniquement les fichiers locaux — pas de CDN externe
const SHELL = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/js/utils.js',
  '/assets/js/time.js',
  '/assets/js/i18n.js',
  '/assets/js/events.js',
  '/assets/js/map.js',
  '/assets/js/app.js',
  '/data/index.json',
];

// ─── Install : ne bloque PAS sur les erreurs de cache ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .catch(err => console.warn('[SW] pre-cache partiel :', err))
  );
  self.skipWaiting();
});

// ─── Activate : purge les anciens caches ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes CDN externes
  if (url.origin !== self.location.origin) return;

  // Données : network-first
  if (url.pathname.startsWith('/data/03_gold/') || url.pathname === '/data/index.json') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locaux : cache-first avec mise à jour en arrière-plan
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
      return cached ?? networkFetch;
    })
  );
});
