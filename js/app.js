// ============================================================
//  APP.JS — Logique principale de OLYN-WANE
// ============================================================

'use strict';

// ---- État de l'application --------------------------------
const state = {
  openTabs: [],        // [{ id, name, icon, url, iframeEl, tabEl }]
  activeTabId: null,   // id de l'onglet actif
  currentFilter: 'all' // filtre catégorie actif
};

// ---- Références DOM ---------------------------------------
const DOM = {
  homeScreen:      () => document.getElementById('home-screen'),
  workspace:       () => document.getElementById('workspace'),
  appsGrid:        () => document.getElementById('apps-grid'),
  categoriesNav:   () => document.getElementById('categories-nav'),
  tabsList:        () => document.getElementById('tabs-list'),
  tabsCount:       () => document.getElementById('tabs-count'),
  iframesContainer:() => document.getElementById('iframes-container'),
  modalOverlay:    () => document.getElementById('modal-overlay'),
  tabHomeBtn:      () => document.getElementById('tab-home-btn'),
  modalClose:      () => document.getElementById('modal-close'),
};

// ===========================================================
//  INITIALISATION
// ===========================================================
async function init() {
  document.getElementById('hub-title').textContent    = HUB_CONFIG.name;
  document.getElementById('hub-subtitle').innerHTML    = HUB_CONFIG.subtitle + '<br><span id="hub-version">Version 1.0.6 — ©2026 LEROY Aurélien — Tous Droits Réservés</span>';
  document.getElementById('tabs-max').textContent     = HUB_CONFIG.maxTabs;

  buildCategories();
  buildAppsGrid('all');
  bindEvents();

  // Préchargement silencieux de toutes les icônes en arrière-plan
  // (non bloquant → l'interface s'affiche immédiatement)
  preloadAllIcons();

  // Restaurer les onglets de la session précédente
  restoreSession();
}

// ===========================================================
//  CONSTRUCTION DES CATÉGORIES
// ===========================================================
function buildCategories() {
  const nav = DOM.categoriesNav();
  nav.innerHTML = ''; // reset

  // Bouton "Toutes" en premier
  const btnAll = document.createElement('button');
  btnAll.className = 'cat-btn active';
  btnAll.dataset.cat = 'all';
  btnAll.innerHTML = '🧩 Toutes';
  btnAll.addEventListener('click', () => filterByCategory('all', btnAll));
  nav.appendChild(btnAll);

  // Reste des catégories
  CATEGORIES.forEach(cat => {
    const hasApps = APPS.some(app => app.categories.includes(cat.id));
    if (!hasApps) return;

    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = cat.id;
    btn.innerHTML = `<span>${cat.icon}</span> ${cat.label}`;
    btn.addEventListener('click', () => filterByCategory(cat.id, btn));
    nav.appendChild(btn);
  });
}

// ===========================================================
//  FILTRAGE PAR CATÉGORIE
// ===========================================================
function filterByCategory(catId, clickedBtn) {
  state.currentFilter = catId;

  // Mise à jour des boutons actifs
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');

  buildAppsGrid(catId);
}

// ===========================================================
//  CONSTRUCTION DE LA GRILLE D'APPS
// ===========================================================
function buildAppsGrid(catId) {
  const grid = DOM.appsGrid();
  grid.innerHTML = '';

  const filtered = catId === 'all'
    ? APPS
    : APPS.filter(app => app.categories.includes(catId));

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;padding:40px;">
      Aucune application dans cette catégorie.
    </p>`;
    return;
  }

  filtered.forEach(app => {
    const card = createAppCard(app);
    grid.appendChild(card);
  });
}

// ===========================================================
//  CRÉATION D'UNE CARTE APPLICATION
// ===========================================================
function createAppCard(app) {
  const isOpen = state.openTabs.some(t => t.id === app.id);

  const card = document.createElement('div');
  card.className = `app-card${isOpen ? ' already-open' : ''}`;
  card.dataset.appId = app.id;
  card.style.setProperty('--card-color', app.color || 'var(--accent)');

  // Tags catégories
  const tagsHtml = app.categories.map(catId => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return '';
    return `<span class="app-tag" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">
      ${cat.icon} ${cat.label}
    </span>`;
  }).join('');

  card.innerHTML = `
    ${isOpen ? '<span class="app-card-badge">OUVERT</span>' : ''}
    <div class="app-card-icon" data-icon-for="${app.id}">
      <span class="app-icon-emoji">${app.iconFallback || '🔧'}</span>
    </div>
    <div class="app-card-name">${app.name}</div>
    <div class="app-card-desc">${app.description}</div>
    <div class="app-card-tags">${tagsHtml}</div>
  `;

  // Chargement asynchrone de l'icône sans bloquer le rendu de la carte
  const iconContainer = card.querySelector(`[data-icon-for="${app.id}"]`);
  applyIconToElement(app, iconContainer);

  card.addEventListener('click', () => {
    if (isOpen) {
      switchToExistingTab(app.id);
    } else {
      openApp(app);
    }
  });

  return card;
}

// ===========================================================
//  OUVRIR UNE APPLICATION (créer onglet + iframe)
// ===========================================================
function openApp(app) {
  // Vérification max onglets
  if (state.openTabs.length >= HUB_CONFIG.maxTabs) {
    showModal();
    return;
  }

  // Création de l'iframe
  const iframeWrapper = document.createElement('div');
  iframeWrapper.style.cssText = 'position:absolute;inset:0;';
  iframeWrapper.dataset.iframeFor = app.id;

  // Loader pendant le chargement
  const loader = document.createElement('div');
  loader.className = 'iframe-loader';
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <p class="loader-text">Chargement de ${app.name}…</p>
  `;
  iframeWrapper.appendChild(loader);

  const iframe = document.createElement('iframe');
  iframe.className = 'app-iframe hidden-frame';
  iframe.src = app.url;
  iframe.title = app.name;
  iframe.setAttribute('allow', 'camera; microphone; geolocation');
  iframe.setAttribute('loading', 'lazy');

  // Retirer le loader quand l'iframe est chargée
  iframe.addEventListener('load', () => {
    loader.remove();
    iframe.classList.remove('hidden-frame');
  });

  iframeWrapper.appendChild(iframe);
  DOM.iframesContainer().appendChild(iframeWrapper);

  // Création de l'onglet
  const tabEl = createTabElement(app);
  DOM.tabsList().appendChild(tabEl);

  // Ajout à l'état
  const tabData = {
    id: app.id,
    name: app.name,
    icon: app.icon,
    url: app.url,
    iframeWrapper,
    iframe,
    tabEl
  };
  state.openTabs.push(tabData);

  // Mettre à jour le compteur
  updateTabsCounter();

  // Basculer vers ce nouvel onglet
  switchToTab(app.id);

  // Afficher le workspace
  showWorkspace();

  // Mettre à jour la grille (badge "OUVERT")
  buildAppsGrid(state.currentFilter);

  // Sauvegarder la session
  saveSession();
}

// ===========================================================
//  CRÉATION D'UN ÉLÉMENT ONGLET
// ===========================================================
function createTabElement(app) {
  const tab = document.createElement('div');
  tab.className = 'tab-item loading';
  tab.dataset.tabId = app.id;

  tab.innerHTML = `
    <span class="tab-icon" data-tab-icon-for="${app.id}">
      <span class="app-icon-emoji" style="font-size:1rem">${app.iconFallback || '🔧'}</span>
    </span>
    <span class="tab-name">${app.name}</span>
    <button class="tab-close" title="Fermer ${app.name}">✕</button>
  `;

  // Chargement asynchrone de l'icône dans l'onglet
  const tabIconContainer = tab.querySelector(`[data-tab-icon-for="${app.id}"]`);
  applyIconToElement(app, tabIconContainer, true); // true = mode "onglet" (taille réduite)

  // Clic sur l'onglet = basculer
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      switchToTab(app.id);
    }
  });

  // Bouton fermer
  tab.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(app.id);
  });

  return tab;
}

// ===========================================================
//  BASCULER VERS UN ONGLET
// ===========================================================
function switchToTab(tabId) {
  state.activeTabId = tabId;

  state.openTabs.forEach(tab => {
    const isActive = tab.id === tabId;

    // Afficher/masquer les iframes
    tab.iframeWrapper.style.display = isActive ? 'block' : 'none';

    // Activer/désactiver les onglets
    tab.tabEl.classList.toggle('active', isActive);

    // Retirer le "loading" si on bascule dessus
    if (isActive) {
      tab.tabEl.classList.remove('loading');
      // Scroll pour rendre l'onglet visible
      tab.tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

// ===========================================================
//  BASCULER VERS UN ONGLET DÉJÀ OUVERT (depuis l'accueil)
// ===========================================================
function switchToExistingTab(tabId) {
  showWorkspace();
  switchToTab(tabId);
}

// ===========================================================
//  FERMER UN ONGLET
// ===========================================================
function closeTab(tabId) {
  const idx = state.openTabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  const tab = state.openTabs[idx];

  // Supprimer l'iframe et l'onglet du DOM
  tab.iframeWrapper.remove();
  tab.tabEl.remove();

  // Retirer de l'état
  state.openTabs.splice(idx, 1);

  updateTabsCounter();

  // Si c'était l'onglet actif, basculer vers un autre ou revenir à l'accueil
  if (state.activeTabId === tabId) {
    if (state.openTabs.length > 0) {
      const newIdx = Math.min(idx, state.openTabs.length - 1);
      switchToTab(state.openTabs[newIdx].id);
    } else {
      showHome();
    }
  }

  // Mettre à jour la grille
  buildAppsGrid(state.currentFilter);
  saveSession();
}

// ===========================================================
//  AFFICHER WORKSPACE / ACCUEIL
// ===========================================================
function showWorkspace() {
  DOM.homeScreen().classList.add('hidden');
  DOM.workspace().classList.remove('hidden');
}

function showHome() {
  state.activeTabId = null;
  DOM.workspace().classList.add('hidden');
  DOM.homeScreen().classList.remove('hidden');
  buildAppsGrid(state.currentFilter);
}

// ===========================================================
//  COMPTEUR D'ONGLETS
// ===========================================================
function updateTabsCounter() {
  DOM.tabsCount().textContent = state.openTabs.length;
  const counter = DOM.tabsCount();
  counter.style.color = state.openTabs.length >= HUB_CONFIG.maxTabs
    ? '#e94560'
    : 'var(--accent)';
}

// ===========================================================
//  MODAL MAX ONGLETS
// ===========================================================
function showModal() {
  DOM.modalOverlay().classList.remove('hidden');
}
function hideModal() {
  DOM.modalOverlay().classList.add('hidden');
}

// ===========================================================
//  SAUVEGARDE / RESTAURATION DE SESSION
//  (quels onglets étaient ouverts — pas les données des apps)
// ===========================================================
function saveSession() {
  const sessionData = state.openTabs.map(t => ({
    id: t.id,
    activeTabId: state.activeTabId
  }));
  localStorage.setItem('hub_session', JSON.stringify(sessionData));
}

function restoreSession() {
  try {
    const raw = localStorage.getItem('hub_session');
    if (!raw) return;
    const sessionData = JSON.parse(raw);
    if (!Array.isArray(sessionData) || sessionData.length === 0) return;

    let lastActiveId = null;

    sessionData.forEach(entry => {
      const app = APPS.find(a => a.id === entry.id);
      if (app) {
        openApp(app);
        lastActiveId = entry.activeTabId;
      }
    });

    // Réactiver le bon onglet
    if (lastActiveId && state.openTabs.some(t => t.id === lastActiveId)) {
      setTimeout(() => switchToTab(lastActiveId), 100);
    }
  } catch (e) {
    console.warn('Impossible de restaurer la session:', e);
    localStorage.removeItem('hub_session');
  }
}

// ===========================================================
//  ÉVÉNEMENTS GLOBAUX
// ===========================================================
function bindEvents() {
  // Bouton 🏠 dans la barre d'onglets
  DOM.tabHomeBtn().addEventListener('click', showHome);

  // Fermer la modal
  DOM.modalClose().addEventListener('click', hideModal);
  DOM.modalOverlay().addEventListener('click', (e) => {
    if (e.target === DOM.modalOverlay()) hideModal();
  });

  // Bouton accueil dans le header (si workspace visible)
  document.getElementById('btn-home').addEventListener('click', showHome);

  // Bouton "Toutes" statique → lui attacher son listener
const btnAll = document.querySelector('.cat-btn[data-cat="all"]');
btnAll.addEventListener('click', () => filterByCategory('all', btnAll));

}

// ===========================================================
//  DÉMARRAGE
// ===========================================================
document.addEventListener('DOMContentLoaded', init);
