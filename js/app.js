// ============================================================
//  APP.JS — Démarrage d'OLYN-WANE
// ============================================================
import { HUB } from './config.js';
import * as store from './store.js';
import { loadPrefs, getPrefs, onPrefsChange } from './prefs.js';
import { loadIconCache } from './icon-loader.js';
import { initTabs, restoreSession, updateTabsCounter } from './tabs.js';
import { initHome, renderHome } from './home.js';
import { initManage, renderManage } from './manage.js';
import { openSettings } from './settings.js';
import { toast, icons } from './ui.js';

const $ = id => document.getElementById(id);
let view = 'apps';          // 'apps' | 'manage'
let lastRefresh = 0;
let sessionRestored = false;

async function init() {
  document.title = HUB.name;
  $('hub-title').textContent = HUB.name;
  $('hub-subtitle').replaceChildren(
    HUB.subtitle,
    document.createElement('br'),
    Object.assign(document.createElement('span'), { id: 'hub-version', textContent: `Version ${HUB.version} — ${HUB.author}` }),
  );
  $('btn-refresh').innerHTML = icons.refresh;

  await loadPrefs();
  await loadIconCache();
  store.setToken(getPrefs().token);

  initTabs();
  initHome();
  initManage();

  store.subscribe(state => {
    renderHome(state);
    if (view === 'manage') renderManage(state);
    $('status-line').hidden = state.source !== 'cache';
    if (!sessionRestored && state.data.apps.length) {
      sessionRestored = true;
      restoreSession(state.data.apps);
    }
  });

  onPrefsChange(key => {
    if (key === 'token') updateViewSwitch();
    if (key === 'maxTabs') updateTabsCounter();
  });

  $('btn-settings').addEventListener('click', openSettings);
  $('btn-refresh').addEventListener('click', () => refresh(true));
  document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  updateViewSwitch();

  // Affiche tout de suite la dernière version connue, puis va chercher la plus récente
  const hadCache = await store.loadCached();
  if (!hadCache) $('apps-grid').replaceChildren(Object.assign(document.createElement('p'), { className: 'grid-empty', textContent: 'Chargement des applications…' }));
  await refresh(false);

  // Resynchronise quand on revient sur OLYN-WANE (la liste a pu changer ailleurs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 60e3) refresh(false);
  });
  window.addEventListener('online', () => refresh(false));
}

async function refresh(manual) {
  lastRefresh = Date.now();
  const btn = $('btn-refresh');
  btn.classList.add('spinning');
  try {
    const source = await store.refresh();
    if (store.getState().source === 'none') renderHome(store.getState());
    if (manual) {
      if (source === 'github' || source === 'pages') toast('Liste des applications à jour', { type: 'success', duration: 1800 });
      else toast('Hors ligne : affichage de la dernière version connue.', { duration: 4000 });
    }
  } catch (err) {
    toast(err.message, { type: 'error', duration: 8000 });
  } finally {
    btn.classList.remove('spinning');
  }
}

// ---- Applications / Gérer ---------------------------------------------
function updateViewSwitch() {
  const hasToken = !!getPrefs().token;
  $('view-switch').hidden = !hasToken;
  if (!hasToken && view === 'manage') switchView('apps');
}

function switchView(name) {
  view = name;
  document.querySelectorAll('.view-btn').forEach(b => {
    const on = b.dataset.view === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('categories-nav').hidden = name !== 'apps';
  $('apps-grid').hidden = name !== 'apps';
  $('manage-view').hidden = name !== 'manage';
  if (name === 'manage') {
    renderManage(store.getState());
    $('manage-view').scrollTop = 0;
  }
}

// ---- Service worker : démarrage rapide et hors ligne ------------------
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .catch(e => console.warn('[sw] enregistrement impossible', e));
}

init()
  .catch(err => {
    console.error(err);
    $('apps-grid').replaceChildren(Object.assign(document.createElement('p'), {
      className: 'grid-empty',
      textContent: `OLYN-WANE n'a pas pu démarrer : ${err.message || err}`,
    }));
  })
  .finally(registerSW);
