// ============================================================
//  HOME.JS — L'accueil : filtres par secteur + cartes des
//  applications
// ============================================================
import { el } from './ui.js';
import { renderIcon } from './icon-loader.js';
import { getPrefs } from './prefs.js';
import * as tabs from './tabs.js';

let currentFilter = 'all';
let lastState = null;

export function initHome() {
  // Badge « OUVERT » à jour quand on ouvre ou ferme un onglet
  document.addEventListener('ow:tabs', () => { if (lastState) renderGrid(); });
}

export function renderHome(state) {
  lastState = state;
  renderCategories();
  renderGrid();
}

// ---- Secteurs (filtres) ------------------------------------------
function renderCategories() {
  const nav = document.getElementById('categories-nav');
  const { categories, apps } = lastState.data;
  const used = categories.filter(c => apps.some(a => a.categories.includes(c.id)));
  if (currentFilter !== 'all' && !used.some(c => c.id === currentFilter)) currentFilter = 'all';

  nav.replaceChildren(
    catButton('all', '🧩', 'Toutes'),
    ...used.map(c => catButton(c.id, c.icon, c.label)),
  );
}

function catButton(id, icon, label) {
  return el(`button.cat-btn${currentFilter === id ? '.active' : ''}`, {
    type: 'button',
    dataset: { cat: id },
    onclick: e => {
      currentFilter = id;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === id));
      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      renderGrid();
    },
  }, [el('span', {}, icon), ` ${label}`]);
}

// ---- Grille des applications ---------------------------------------
function renderGrid() {
  const grid = document.getElementById('apps-grid');
  const { categories, apps } = lastState.data;

  if (!apps.length) {
    grid.replaceChildren(el('p.grid-empty', {}, lastState.source === 'none'
      ? 'Impossible de charger la liste des applications. Vérifie la connexion internet.'
      : getPrefs().token
        ? 'Aucune application pour l\'instant. Ajoute la première depuis l\'onglet « Gérer ».'
        : 'Aucune application pour l\'instant.'));
    return;
  }

  const filtered = currentFilter === 'all' ? apps : apps.filter(a => a.categories.includes(currentFilter));
  if (!filtered.length) {
    grid.replaceChildren(el('p.grid-empty', {}, 'Aucune application dans cette catégorie.'));
    return;
  }
  grid.replaceChildren(...filtered.map(app => createAppCard(app, categories)));
}

export function createAppCard(app, categories, { preview = false } = {}) {
  const isOpen = !preview && tabs.isOpen(app.id);
  const iconBox = el('div.app-card-icon');
  renderIcon(iconBox, app);

  const tags = app.categories.map(id => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return null;
    return el('span.app-tag', {
      style: { background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` },
    }, `${cat.icon} ${cat.label}`);
  });

  const card = el(`div.app-card${isOpen ? '.already-open' : ''}${preview ? '.preview' : ''}`, {
    dataset: { appId: app.id },
    role: preview ? undefined : 'button',
    tabindex: preview ? undefined : '0',
    title: app.openMode === 'outside' ? 'S\'ouvre à part, dans un nouvel onglet du navigateur' : undefined,
  }, [
    isOpen ? el('span.app-card-badge', {}, 'OUVERT') : null,
    app.openMode === 'outside' ? el('span.app-card-ext', { 'aria-label': 'S\'ouvre à part' }, '↗') : null,
    iconBox,
    el('div.app-card-name', {}, app.name),
    el('div.app-card-desc', {}, app.description),
    el('div.app-card-tags', {}, tags),
  ]);
  card.style.setProperty('--card-color', app.color || 'var(--accent)');

  if (!preview) {
    card.addEventListener('click', () => tabs.launch(app));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tabs.launch(app); }
    });
  }
  return card;
}
