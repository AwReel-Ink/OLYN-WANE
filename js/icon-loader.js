// ============================================================
//  ICON-LOADER.JS — Récupération automatique des icônes d'apps
//  Stratégie : manifest PWA → favicon → fallback emoji
// ============================================================

'use strict';

// Cache en mémoire pour éviter de refetcher à chaque rendu
const iconCache = {};

// ============================================================
//  FONCTION PRINCIPALE
//  Retourne une promesse qui résout vers une URL d'image
//  ou null si aucune icône trouvée (→ affichage fallback emoji)
// ============================================================
async function resolveAppIcon(app) {

  // 1. Déjà en cache mémoire ?
  if (iconCache[app.id] !== undefined) {
    return iconCache[app.id];
  }

  // 2. Une icône est explicitement définie dans config ?
  if (app.icon && !app.icon.includes('://') === false) {
    // C'est une URL directe
    iconCache[app.id] = app.icon;
    return app.icon;
  }

  const baseUrl = app.url.endsWith('/') ? app.url : app.url + '/';

  // 3. Tentative via le manifest.json de l'app
  try {
    const manifestUrl = baseUrl + 'manifest.json';
    const res = await fetch(manifestUrl, { mode: 'cors' });

    if (res.ok) {
      const manifest = await res.json();

      // Cherche la meilleure icône (préférence 192px ou la plus grande)
      if (manifest.icons && manifest.icons.length > 0) {
        const sorted = [...manifest.icons].sort((a, b) => {
          const sizeA = parseInt(a.sizes?.split('x')[0] || '0');
          const sizeB = parseInt(b.sizes?.split('x')[0] || '0');
          return sizeB - sizeA; // plus grande en premier
        });

        // Prendre la première icône dont la taille est >= 96px
        const best = sorted.find(ico => {
          const s = parseInt(ico.sizes?.split('x')[0] || '0');
          return s >= 96;
        }) || sorted[0];

        if (best?.src) {
            let iconUrl;

            if (best.src.startsWith('http')) {
                iconUrl = best.src;
            } else if (best.src.startsWith('/')) {
                const origin = new URL(baseUrl).origin;
                iconUrl = origin + best.src;
            } else {
                iconUrl = baseUrl + best.src.replace(/^\.?\//, '');
            }

            iconCache[app.id] = iconUrl;
            return iconUrl;
            }
      }
    }
  } catch (e) {
    // CORS bloqué ou manifest absent → on continue
    console.info(`[IconLoader] Manifest non accessible pour ${app.name}, tentative favicon`);
  }

  // 4. Fallback : favicon.ico
  try {
    const faviconUrl = baseUrl + 'favicon.ico';
    const res = await fetch(faviconUrl, { mode: 'cors' });

    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      iconCache[app.id] = faviconUrl;
      return faviconUrl;
    }
  } catch (e) {
    console.info(`[IconLoader] Favicon non accessible pour ${app.name}`);
  }

  // 5. Aucune icône trouvée → retourne null (affichage emoji fallback)
  iconCache[app.id] = null;
  return null;
}

// ============================================================
//  APPLIQUE L'ICÔNE SUR UN ÉLÉMENT DOM
//  Gère l'affichage image OU emoji selon le résultat
// ============================================================
async function applyIconToElement(app, container, isTab = false) {
  const iconUrl = await resolveAppIcon(app);

  // Si aucune icône trouvée, l'emoji fallback reste affiché → on ne touche à rien
  if (!iconUrl) return;

  // Remplace le contenu du conteneur par une vraie image
  const img = document.createElement('img');
  img.src = iconUrl;
  img.alt = app.name;
  img.className = isTab ? 'tab-icon-img' : 'app-card-icon-img';

  // Si l'image échoue à charger → on remet l'emoji silencieusement
  img.onerror = () => {
    iconCache[app.id] = null; // invalide le cache pour cette app
    container.innerHTML = `<span class="app-icon-emoji" style="${isTab ? 'font-size:1rem' : ''}">${app.iconFallback || '🔧'}</span>`;
  };

  // Remplacement propre
  container.innerHTML = '';
  container.appendChild(img);
}

// ============================================================
//  PRÉCHARGEMENT AU DÉMARRAGE
//  Charge toutes les icônes en parallèle dès l'init
// ============================================================
async function preloadAllIcons() {
  await Promise.allSettled(
    APPS.map(app => resolveAppIcon(app))
  );
  console.log('[IconLoader] Icônes préchargées');
}
