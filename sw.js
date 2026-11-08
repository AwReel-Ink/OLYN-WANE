// ============================================================
//  SW.JS — Service Worker d'OLYN-WANE
//
//  Fichiers d'OLYN-WANE : toujours la version en ligne d'abord
//  (les mises à jour arrivent toutes seules), la copie gardée
//  sur l'appareil sert si le réseau est absent ou trop lent.
//  → Plus besoin de changer un numéro ici après une modification.
//
//  Toutes les applis partagent l'adresse awreel-ink.github.io,
//  donc le même espace de cache : ce service worker ne touche
//  QUE ses propres caches (ceux qui commencent par « olyn-wane- »).
// ============================================================

const SHELL_CACHE = 'olyn-wane-shell';
const DATA_CACHE = 'olyn-wane-data';
const ICON_CACHE = 'olyn-wane-icons';
const NETWORK_TIMEOUT = 3500; // au-delà, on affiche la copie gardée

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/db.js',
  './js/prefs.js',
  './js/github.js',
  './js/store.js',
  './js/actions.js',
  './js/ui.js',
  './js/sortable.js',
  './js/icon-loader.js',
  './js/tabs.js',
  './js/home.js',
  './js/appform.js',
  './js/manage.js',
  './js/settings.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

const scopePath = new URL(self.registration.scope).pathname;
const DATA_KEY = `${scopePath}data/apps.json`;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    try {
      const res = await fetch('./data/apps.json', { cache: 'no-store' });
      if (res.ok) await (await caches.open(DATA_CACHE)).put(DATA_KEY, res);
    } catch { /* hors ligne : la liste sera gardée au prochain passage */ }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Anciennes versions d'OLYN-WANE (« OLYN-WANE-V1.0.x ») uniquement
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^OLYN-WANE-V/i.test(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API GitHub, etc. : réseau direct

  // Fichiers d'OLYN-WANE
  if (url.pathname.startsWith(scopePath)) {
    if (url.pathname === DATA_KEY) {
      event.respondWith(networkFirst(req, DATA_CACHE, DATA_KEY, 0));
      return;
    }
    const key = req.mode === 'navigate'
      ? (url.pathname === scopePath ? `${scopePath}index.html` : url.pathname)
      : url.pathname;
    event.respondWith(networkFirst(req, SHELL_CACHE, key, NETWORK_TIMEOUT));
    return;
  }

  // Icônes des applications affichées sur l'accueil : gardées pour le hors ligne
  if (req.destination === 'image') {
    event.respondWith(staleWhileRevalidate(req, ICON_CACHE));
  }
  // Le reste (pages et manifests des autres applis) passe par le réseau
});

/**
 * Réseau d'abord ; copie gardée si le réseau échoue
 * ou dépasse `timeout` ms (0 = attendre le réseau).
 */
async function networkFirst(req, cacheName, key, timeout) {
  const cache = await caches.open(cacheName);
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(key, res.clone()).catch(() => {});
    return res;
  });
  network.catch(() => {}); // évite une erreur non gérée si la copie a déjà servi

  if (timeout > 0) {
    const timer = new Promise(resolve => setTimeout(resolve, timeout, null));
    const first = await Promise.race([network.catch(() => null), timer]);
    if (first) return first;
    const hit = await cache.match(key);
    if (hit) return hit;
    return network; // pas de copie : on attend le réseau
  }

  try {
    return await network;
  } catch (e) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => hit);
  return hit || network;
}
