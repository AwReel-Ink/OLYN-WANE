// ============================================================
//  TABS.JS — Les applications ouvertes : barre d'onglets
//  et cadres (iframes). Une seule visible à la fois, les
//  autres restent ouvertes en arrière-plan.
// ============================================================
import { el } from './ui.js';
import { renderIcon } from './icon-loader.js';
import { getPrefs } from './prefs.js';

const state = {
  openTabs: [],       // [{ id, name, url, iframeWrapper, iframe, tabEl }]
  activeTabId: null,  // id de l'onglet actif (null = accueil)
};

const $ = id => document.getElementById(id);
const SESSION_KEY = 'hub_session';

export function initTabs() {
  $('tab-home-btn').addEventListener('click', showHome);
  $('modal-close').addEventListener('click', hideModal);
  $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) hideModal(); });
  updateTabsCounter();
}

function emit() { document.dispatchEvent(new CustomEvent('ow:tabs')); }

export function isOpen(id) { return state.openTabs.some(t => t.id === id); }

/** Clic sur une carte : ouvre l'appli, ou revient sur son onglet si elle est déjà ouverte. */
export function launch(app) {
  if (app.openMode === 'outside') {
    window.open(app.url, '_blank', 'noopener');
    return;
  }
  if (isOpen(app.id)) {
    showWorkspace();
    switchToTab(app.id);
    saveSession();
    return;
  }
  if (state.openTabs.length >= getPrefs().maxTabs) {
    showModal();
    return;
  }
  openApp(app);
}

// ---- Ouvrir une application (onglet + iframe) ---------------
function openApp(app) {
  const iframeWrapper = el('div', { dataset: { iframeFor: app.id } });
  iframeWrapper.style.cssText = 'position:absolute;inset:0;';

  const loader = el('div.iframe-loader', {}, [
    el('div.loader-spinner'),
    el('p.loader-text', {}, `Chargement de ${app.name}…`),
  ]);

  const iframe = el('iframe.app-iframe.hidden-frame', {
    src: app.url,
    title: app.name,
    allow: 'camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write; autoplay; screen-wake-lock',
    loading: 'lazy',
  });
  iframe.addEventListener('load', () => {
    loader.remove();
    iframe.classList.remove('hidden-frame');
  });

  iframeWrapper.append(loader, iframe);
  $('iframes-container').append(iframeWrapper);

  const tabEl = createTabElement(app);
  $('tabs-list').append(tabEl);

  state.openTabs.push({ id: app.id, name: app.name, url: app.url, iframeWrapper, iframe, tabEl });
  updateTabsCounter();
  switchToTab(app.id);
  showWorkspace();
  saveSession();
  emit();
}

function createTabElement(app) {
  const iconBox = el('span.tab-icon');
  renderIcon(iconBox, app, { small: true });
  const closeBtn = el('button.tab-close', { type: 'button', title: `Fermer ${app.name}`, 'aria-label': `Fermer ${app.name}` }, '✕');
  const tab = el('div.tab-item.loading', { dataset: { tabId: app.id } }, [
    iconBox,
    el('span.tab-name', {}, app.name),
    closeBtn,
  ]);
  tab.addEventListener('click', e => {
    if (e.target !== closeBtn) { switchToTab(app.id); saveSession(); }
  });
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeTab(app.id);
  });
  return tab;
}

function switchToTab(tabId) {
  state.activeTabId = tabId;
  state.openTabs.forEach(tab => {
    const isActive = tab.id === tabId;
    tab.iframeWrapper.style.display = isActive ? 'block' : 'none';
    tab.tabEl.classList.toggle('active', isActive);
    if (isActive) {
      tab.tabEl.classList.remove('loading');
      tab.tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

function closeTab(tabId) {
  const idx = state.openTabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  const tab = state.openTabs[idx];
  tab.iframeWrapper.remove();
  tab.tabEl.remove();
  state.openTabs.splice(idx, 1);
  updateTabsCounter();

  if (state.activeTabId === tabId) {
    if (state.openTabs.length > 0) {
      switchToTab(state.openTabs[Math.min(idx, state.openTabs.length - 1)].id);
    } else {
      showHome();
    }
  }
  saveSession();
  emit();
}

// ---- Accueil / espace de travail ---------------------------------
function showWorkspace() {
  $('home-screen').classList.add('hidden');
  $('workspace').classList.remove('hidden');
}

export function showHome() {
  state.activeTabId = null;
  $('workspace').classList.add('hidden');
  $('home-screen').classList.remove('hidden');
  saveSession();
  emit();
}

// ---- Compteur et limite ------------------------------------------
export function updateTabsCounter() {
  const max = getPrefs().maxTabs;
  $('tabs-max').textContent = String(max);
  const count = $('tabs-count');
  count.textContent = String(state.openTabs.length);
  count.style.color = state.openTabs.length >= max ? '#e94560' : 'var(--accent)';
}

function showModal() {
  const max = getPrefs().maxTabs;
  $('modal-message').replaceChildren(
    `⚠️ Vous avez atteint le maximum de ${max} application${max > 1 ? 's' : ''} ouverte${max > 1 ? 's' : ''}.`,
    el('br'),
    'Fermez un onglet pour en ouvrir un nouveau.',
  );
  $('modal-overlay').classList.remove('hidden');
}
function hideModal() { $('modal-overlay').classList.add('hidden'); }

// ---- Session : quels onglets étaient ouverts ------------------------
function saveSession() {
  try {
    const data = state.openTabs.map(t => ({ id: t.id, activeTabId: state.activeTabId }));
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* stockage indisponible */ }
}

/** Rouvre les onglets de la dernière fois (à appeler une fois la liste chargée). */
export function restoreSession(apps) {
  let entries;
  try {
    entries = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  if (!Array.isArray(entries) || !entries.length) return;

  const lastActiveId = entries[0]?.activeTabId || null;
  for (const entry of entries) {
    const app = apps.find(a => a.id === entry.id);
    if (!app || app.openMode === 'outside' || isOpen(app.id)) continue;
    if (state.openTabs.length >= getPrefs().maxTabs) break;
    openApp(app);
  }
  if (!state.openTabs.length) return;
  if (lastActiveId && isOpen(lastActiveId)) {
    setTimeout(() => { switchToTab(lastActiveId); saveSession(); }, 100);
  } else if (!lastActiveId) {
    showHome(); // on était sur l'accueil : les onglets restent ouverts en arrière-plan
  }
}
