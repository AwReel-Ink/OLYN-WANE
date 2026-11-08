// ============================================================
//  STORE.JS — La liste partagée : secteurs + applications
//  Elle vit dans data/apps.json sur GitHub.
//
//  Lecture :
//   - sans jeton (appareils de travail) : depuis la page publiée,
//     sans limite du nombre de demandes ;
//   - avec jeton : directement depuis GitHub (toujours la toute
//     dernière version, nécessaire pour modifier).
//  Hors ligne : dernière version connue sur l'appareil.
// ============================================================
import { DATA_PATH } from './config.js';
import * as gh from './github.js';
import * as db from './db.js';

const state = {
  data: { categories: [], apps: [] },
  sha: null,          // empreinte du fichier sur GitHub (nécessaire pour écrire)
  source: 'none',     // 'github' | 'pages' | 'cache' | 'none'
  token: null,
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

export function getState() { return state; }
export function setToken(token) { state.token = token || null; }

const HEX = /^#[0-9a-f]{6}$/i;

// --- Normalisation : garantit une structure propre quoi qu'il arrive
export function normalize(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const rawCats = Array.isArray(data.categories) ? data.categories : [];
  const rawApps = Array.isArray(data.apps) ? data.apps : [];

  const seenCats = new Set();
  const categories = rawCats
    .filter(c => c && c.id && !seenCats.has(String(c.id)) && seenCats.add(String(c.id)))
    .map(c => ({
      id: String(c.id),
      label: String(c.label || c.id),
      icon: c.icon ? String(c.icon) : '📁',
      color: HEX.test(c.color) ? c.color : '#6c757d',
    }));
  const known = new Set(categories.map(c => c.id));

  const seenApps = new Set();
  const apps = rawApps
    .filter(a => a && a.id && a.url && !seenApps.has(String(a.id)) && seenApps.add(String(a.id)))
    .map(a => ({
      id: String(a.id),
      name: String(a.name || a.id),
      description: String(a.description || ''),
      url: String(a.url),
      repo: a.repo ? String(a.repo) : '',
      icon: a.icon ? String(a.icon) : '',
      iconFallback: a.iconFallback ? String(a.iconFallback) : '🔧',
      color: HEX.test(a.color) ? a.color : '',
      categories: [...new Set((Array.isArray(a.categories) ? a.categories : []).map(String))].filter(id => known.has(id)),
      openMode: a.openMode === 'outside' ? 'outside' : 'inside',
    }));

  return { schema: 1, updatedAt: data.updatedAt || null, categories, apps };
}

function apply(data, sha, source) {
  state.data = normalize(data);
  state.sha = sha;
  state.source = source;
  db.set('gallery', { data: state.data, sha, savedAt: Date.now() });
  emit();
}

// --- Lecture -----------------------------------------------------
export async function loadCached() {
  const cached = await db.get('gallery');
  if (cached && cached.data) {
    state.data = normalize(cached.data);
    state.sha = cached.sha || null;
    state.source = 'cache';
    emit();
    return true;
  }
  return false;
}

/** Recharge la liste. Renvoie 'github', 'pages' ou 'cache'. */
export async function refresh() {
  if (!state.token) return refreshFromPages();
  try {
    const { data, sha } = await gh.getJsonFile(DATA_PATH, state.token);
    apply(data, sha, 'github');
    return 'github';
  } catch (err) {
    console.warn('[store] lecture GitHub impossible, essai de la page publiée', err);
    const source = await refreshFromPages();
    if (err.kind === 'auth') throw err; // jeton refusé : on le signale
    return source;
  }
}

async function refreshFromPages() {
  try {
    const res = await fetch(`./${DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    // Hors ligne, le service worker répond avec la copie gardée sur l'appareil
    const source = navigator.onLine ? 'pages' : 'cache';
    apply(await res.json(), null, source);
    return source;
  } catch (e) {
    console.warn('[store] page publiée injoignable, on garde la version locale', e);
    if (state.source === 'none') await loadCached();
    return 'cache';
  }
}

// --- Écriture ----------------------------------------------------
let queue = Promise.resolve();

/**
 * Applique une modification et l'enregistre sur GitHub (un commit).
 * `change(data)` modifie l'objet reçu. Si la liste a été modifiée
 * entre-temps depuis un autre appareil, on relit la dernière version
 * et on ré-applique la modification dessus : rien n'est perdu.
 * Renvoie { merged } : true si des changements d'un autre appareil
 * ont été intégrés.
 */
export function mutate(change, message) {
  const run = async () => {
    if (!state.token) throw new gh.GitHubError('Enregistre le jeton GitHub dans les Paramètres pour modifier la liste.', 0, 'auth');

    let merged = false;
    if (!state.sha || state.source !== 'github') {
      const latest = await gh.getJsonFile(DATA_PATH, state.token);
      apply(latest.data, latest.sha, 'github');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const draft = structuredClone(state.data);
      change(draft);                         // peut lever une erreur de validation
      draft.updatedAt = new Date().toISOString();
      const clean = normalize(draft);
      try {
        const sha = await gh.putJsonFile(DATA_PATH, clean, state.sha, message, state.token);
        apply(clean, sha, 'github');
        return { merged };
      } catch (err) {
        if (err.kind !== 'conflict') throw err;
        merged = true;
        const latest = await gh.getJsonFile(DATA_PATH, state.token);
        apply(latest.data, latest.sha, 'github');
      }
    }
    throw new gh.GitHubError('La liste change trop souvent depuis un autre appareil. Réessaie dans un instant.', 409, 'conflict');
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

// --- Petits outils -----------------------------------------------
export function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'element';
}

export function uniqueId(base, existing) {
  const ids = new Set(existing);
  let id = slugify(base), n = 2;
  while (ids.has(id)) id = `${slugify(base)}-${n++}`;
  return id;
}

export function categoryOf(id) {
  return state.data.categories.find(c => c.id === id) || null;
}
