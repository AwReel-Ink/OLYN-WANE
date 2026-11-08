// ============================================================
//  ICON-LOADER.JS — Lecture des autres applications :
//  vérification du lien, lecture du manifest (nom, icône,
//  couleur, description) et affichage des icônes.
//  Icône : celle enregistrée → manifest de l'appli → émoji
// ============================================================
import { OWNER, PAGES_BASE } from './config.js';
import * as db from './db.js';
import { el } from './ui.js';

/** Transforme ce que l'on colle en adresse d'application publiée. */
export function normalizeUrl(input) {
  let text = String(input || '').trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  let url;
  try { url = new URL(text); } catch { return ''; }

  // Lien vers le dépôt (github.com/compte/depot) → adresse de la page publiée
  if (url.hostname === 'github.com') {
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) return `https://${owner.toLowerCase()}.github.io/${repo.replace(/\.git$/, '')}/`;
  }
  url.protocol = 'https:';
  url.hash = '';
  // Ajoute le « / » final pour un dossier (…/MonAppli → …/MonAppli/)
  const last = url.pathname.split('/').pop();
  if (last && !last.includes('.')) url.pathname += '/';
  return url.href;
}

/** Devine le nom du dépôt à partir de l'adresse publiée. */
export function repoFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.toLowerCase() === `${OWNER}.github.io`) {
      return decodeURIComponent(u.pathname.split('/').filter(Boolean)[0] || '');
    }
  } catch { /* adresse invalide */ }
  return '';
}

export function repoToUrl(repoName) {
  if (repoName.toLowerCase() === `${OWNER}.github.io`) return PAGES_BASE;
  return `${PAGES_BASE}${repoName}/`;
}

/** Vérifie que la page existe et répond. */
export async function checkLink(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return { ok: true, status: res.status };
    if (res.status === 404) {
      return { ok: false, status: 404, message: 'Cette page n\'existe pas (erreur 404). Vérifie l\'adresse (majuscules comprises) et que GitHub Pages est activé sur ce dépôt.' };
    }
    return { ok: false, status: res.status, message: `La page répond avec une erreur (${res.status}).` };
  } catch {
    // Site d'un autre domaine qui interdit la lecture : on vérifie au moins qu'il répond.
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
      return { ok: true, status: 0, unverified: true };
    } catch {
      return { ok: false, status: 0, message: 'La page ne répond pas. Vérifie l\'adresse et la connexion internet.' };
    }
  }
}

function pickIcon(icons, base) {
  if (!Array.isArray(icons) || !icons.length) return '';
  const size = i => {
    if (String(i.sizes || '').includes('any')) return 512;
    return Math.max(0, ...String(i.sizes || '').split(/\s+/).map(x => parseInt(x, 10) || 0));
  };
  const usable = icons.filter(i => i && i.src && String(i.purpose || '').trim() !== 'maskable');
  const list = (usable.length ? usable : icons).slice().sort((a, b) => {
    const da = Math.abs(size(a) - 192) + (size(a) < 96 ? 1000 : 0);
    const dbb = Math.abs(size(b) - 192) + (size(b) < 96 ? 1000 : 0);
    return da - dbb;
  });
  try { return new URL(list[0].src, base).href; } catch { return ''; }
}

/**
 * Lit la page et le manifest d'une application.
 * Renvoie { name, description, icon, color } (vides si introuvables).
 */
export async function fetchAppMeta(url) {
  const out = { name: '', description: '', icon: '', color: '' };
  let doc = null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  } catch { /* on tentera le manifest directement */ }

  let manifestUrl = '';
  if (doc) {
    const link = doc.querySelector('link[rel~="manifest"]');
    if (link && link.getAttribute('href')) manifestUrl = new URL(link.getAttribute('href'), url).href;
    out.name = (doc.querySelector('title')?.textContent || '').trim();
    out.description = (doc.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim();
    out.color = (doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '').trim();
    const touch = doc.querySelector('link[rel~="apple-touch-icon"]') || doc.querySelector('link[rel~="icon"]');
    if (touch && touch.getAttribute('href')) out.icon = new URL(touch.getAttribute('href'), url).href;
  }

  const candidates = manifestUrl ? [manifestUrl] : [new URL('manifest.json', url).href, new URL('manifest.webmanifest', url).href];
  for (const m of candidates) {
    try {
      const res = await fetch(m, { cache: 'no-store' });
      if (!res.ok) continue;
      const man = await res.json();
      const name = man.name && man.name.length <= 32 ? man.name : (man.short_name || man.name);
      if (name) out.name = String(name).trim();
      if (man.description) out.description = String(man.description).trim();
      if (man.theme_color) out.color = man.theme_color;
      else if (!out.color && man.background_color) out.color = man.background_color;
      const icon = pickIcon(man.icons, m);
      if (icon) out.icon = icon;
      break;
    } catch { /* manifest suivant */ }
  }
  return out;
}

// --- Icônes retrouvées automatiquement (gardées sur l'appareil) ----
let iconCache = null;
const pending = new Map();
const WEEK = 7 * 24 * 3600 * 1000;

export async function loadIconCache() {
  if (!iconCache) iconCache = await db.get('iconCache', {});
}

/** Icône connue tout de suite : celle enregistrée, sinon celle retrouvée. */
export function displayIcon(app) {
  return app.icon || (iconCache && iconCache[app.url]?.icon) || '';
}

/** Retrouve l'icône d'une application à partir de son manifest. */
export async function resolveIcon(app) {
  if (app.icon) return app.icon;
  if (!iconCache) iconCache = await db.get('iconCache', {});
  const hit = iconCache[app.url];
  if (hit && Date.now() - hit.at < WEEK) return hit.icon;
  if (pending.has(app.url)) return pending.get(app.url);

  const p = (async () => {
    if (!navigator.onLine && hit) return hit.icon;
    const meta = await fetchAppMeta(app.url).catch(() => ({}));
    if (!meta.icon && hit) return hit.icon;
    iconCache[app.url] = { icon: meta.icon || '', at: Date.now() };
    db.set('iconCache', iconCache);
    return meta.icon || '';
  })().finally(() => pending.delete(app.url));
  pending.set(app.url, p);
  return p;
}

/**
 * Remplit `container` avec l'icône de l'application :
 * l'émoji de secours tout de suite, puis l'image dès qu'elle est trouvée.
 */
export function renderIcon(container, app, { small = false } = {}) {
  const emoji = () => el('span.app-icon-emoji', { style: small ? { fontSize: '1rem' } : undefined }, app.iconFallback || '🔧');
  const image = src => el(small ? 'img.tab-icon-img' : 'img.app-card-icon-img', {
    src, alt: '', draggable: 'false',
    onerror: () => {
      if (!app.icon && iconCache && iconCache[app.url]) delete iconCache[app.url];
      container.replaceChildren(emoji());
    },
  });

  const known = displayIcon(app);
  container.replaceChildren(known ? image(known) : emoji());
  if (known || !/^https?:\/\//i.test(app.url || '')) return;
  resolveIcon(app).then(src => {
    if (src && container.isConnected) container.replaceChildren(image(src));
  });
}
