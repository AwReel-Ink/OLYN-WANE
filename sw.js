// ============================================================
//  SW.JS — Service Worker de OLYN-WANE
//  Cache uniquement les fichiers du hub lui-même
//  Les apps externes gèrent leur propre cache
// ============================================================

const CACHE_NAME = 'OLYN-WANE-V1.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.json'
];

// --- Installation : mise en cache des assets du hub --------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW Hub] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// --- Activation : nettoyage des anciens caches -------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW Hub] Suppression ancien cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// --- Fetch : cache-first pour les assets du hub ------------
//     Les requêtes vers les apps externes passent en réseau
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les iframes / apps externes
  if (!url.origin.includes(self.location.origin.replace('https://', ''))) {
    return; // laisse le navigateur gérer normalement
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources du hub
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
