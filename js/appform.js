// ============================================================
//  APPFORM.JS — Formulaire « Ajouter / Modifier une application »
// ============================================================
import { el, openSheet, toast, emojiField, icons } from './ui.js';
import * as store from './store.js';
import * as gh from './github.js';
import { HIDDEN_REPOS } from './config.js';
import { normalizeUrl, repoFromUrl, repoToUrl, checkLink, fetchAppMeta } from './icon-loader.js';
import { save } from './actions.js';
import { createAppCard } from './home.js';

let repoCache = null; // dépôts GitHub (gardés le temps de la session)

async function loadRepos() {
  if (repoCache) return repoCache;
  repoCache = await gh.listRepos(store.getState().token);
  return repoCache;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Ouvre le formulaire. Sans `app` : ajout. Avec `app` : modification. */
export function openAppForm(app = null) {
  const editing = !!app;
  const { data } = store.getState();
  const values = app ? structuredClone(app) : {
    id: '', name: '', description: '', url: '', repo: '', icon: '', iconFallback: '🔧',
    color: '', categories: [], openMode: 'inside',
  };
  const dirty = new Set();   // champs modifiés à la main : la lecture auto ne les écrase plus
  let linkOk = editing;      // en modification, le lien a déjà été vérifié
  let checkToken = 0;

  // ---- Champs ------------------------------------------------------
  const urlInput = el('input.input', { type: 'url', placeholder: 'https://awreel-ink.github.io/MonAppli/', value: values.url, autocomplete: 'off', spellcheck: 'false' });
  const nameInput = el('input.input', { type: 'text', value: values.name, maxlength: '50', placeholder: 'Nom affiché' });
  const descInput = el('textarea.input', { rows: '3', maxlength: '300', placeholder: 'Une phrase pour dire à quoi sert l\'application' }, values.description);
  const emoji = emojiField(values.iconFallback || '🔧', { label: 'Émoji de secours', onChange: () => refreshPreview() });
  const iconInput = el('input.input', { type: 'url', value: values.icon, placeholder: 'Vide = trouvée automatiquement', spellcheck: 'false' });
  const colorInput = el('input.color-input', { type: 'color', value: HEX.test(values.color) ? values.color : '#e94560', 'aria-label': 'Couleur de la carte' });
  const modeInside = el('input', { type: 'radio', name: 'openMode', value: 'inside', checked: values.openMode !== 'outside' });
  const modeOutside = el('input', { type: 'radio', name: 'openMode', value: 'outside', checked: values.openMode === 'outside' });

  // Secteurs : cases à cocher (une appli peut être dans plusieurs secteurs)
  const catChecks = data.categories.map(c => el('input', { type: 'checkbox', value: c.id, checked: values.categories.includes(c.id), onchange: () => refreshPreview() }));
  const catBox = el('div.cat-checks', {}, data.categories.map((c, i) => {
    const label = el('label.cat-check', {}, [catChecks[i], el('span', {}, `${c.icon} ${c.label}`)]);
    label.style.setProperty('--c', c.color);
    return label;
  }));
  const setAll = on => { catChecks.forEach(cb => { cb.checked = on; }); refreshPreview(); };
  const catTools = data.categories.length > 1 ? el('div.cat-tools', {}, [
    el('button.btn.btn-ghost.btn-small', { type: 'button', onclick: () => setAll(true) }, 'Tout cocher'),
    el('button.btn.btn-ghost.btn-small', { type: 'button', onclick: () => setAll(false) }, 'Tout décocher'),
  ]) : null;
  const selectedCats = () => catChecks.filter(cb => cb.checked).map(cb => cb.value);

  const linkStatus = el('p.link-status', { 'aria-live': 'polite' });
  const previewBox = el('div.preview-box');

  [nameInput, descInput, iconInput].forEach(inp => inp.addEventListener('input', () => { dirty.add(inp); refreshPreview(); }));
  colorInput.addEventListener('input', () => { dirty.add(colorInput); refreshPreview(); });

  function current() {
    return {
      ...values,
      name: nameInput.value.trim() || 'Nom de l\'application',
      description: descInput.value.trim() || 'Description',
      url: linkOk ? normalizeUrl(urlInput.value) : (values.url || ''),
      icon: iconInput.value.trim(),
      iconFallback: emoji.input.value || '🔧',
      color: colorInput.value,
      categories: selectedCats(),
      openMode: modeOutside.checked ? 'outside' : 'inside',
    };
  }
  function refreshPreview() {
    previewBox.replaceChildren(createAppCard(current(), store.getState().data.categories, { preview: true }));
  }
  [modeInside, modeOutside].forEach(r => r.addEventListener('change', refreshPreview));

  function setField(input, value) {
    if (!value) return;
    if (dirty.has(input) && input.value.trim()) return; // ne jamais écraser une saisie
    input.value = value;
  }
  // En modification, les valeurs existantes sont considérées comme choisies
  if (editing) [nameInput, descInput, iconInput, colorInput].forEach(i => dirty.add(i));

  // ---- Lecture automatique à partir du lien ---------------------------
  async function readFromLink({ force = false, repoInfo = null } = {}) {
    const url = normalizeUrl(urlInput.value);
    if (!url) { linkOk = false; setStatus('error', 'Colle l\'adresse de l\'application (ou du dépôt GitHub).'); return; }
    urlInput.value = url;
    const my = ++checkToken;
    linkOk = false;
    setStatus('wait', 'Vérification du lien…');
    if (force === 'all') dirty.clear();
    if (force === 'visual') { dirty.delete(iconInput); dirty.delete(colorInput); }

    const [check, meta] = await Promise.all([checkLink(url), fetchAppMeta(url).catch(() => ({}))]);
    if (my !== checkToken) return; // une autre vérification a pris le relais

    if (!check.ok) { setStatus('error', check.message); return; }
    linkOk = true;
    setStatus('ok', check.unverified ? 'Le site répond (contenu non lisible : remplis les champs à la main).' : 'La page répond. Infos récupérées depuis l\'application.');

    const repoName = repoInfo?.name || repoFromUrl(url);
    let repoDesc = repoInfo?.description || '';
    if (!repoDesc && repoName && repoCache) repoDesc = repoCache.find(r => r.name.toLowerCase() === repoName.toLowerCase())?.description || '';

    setField(nameInput, meta.name || repoName);
    setField(descInput, repoDesc || meta.description);
    setField(iconInput, meta.icon);
    if (meta.color && HEX.test(meta.color)) setField(colorInput, meta.color.toLowerCase());
    values.repo = repoName;
    refreshPreview();
  }

  function setStatus(kind, text) {
    linkStatus.className = `link-status is-${kind}`;
    linkStatus.textContent = text;
    forceBtn.hidden = kind !== 'error' || !normalizeUrl(urlInput.value);
  }

  urlInput.addEventListener('change', () => readFromLink());
  urlInput.addEventListener('paste', () => setTimeout(() => readFromLink(), 30));
  urlInput.addEventListener('input', () => { linkOk = false; });

  // ---- Dépôts publiés pas encore dans OLYN-WANE (ajout uniquement) ------
  const repoBox = el('div.repo-box');
  if (!editing) {
    repoBox.append(el('p.muted', {}, 'Recherche de tes applications publiées sur GitHub…'));
    loadRepos().then(repos => {
      const apps = store.getState().data.apps;
      const inHub = new Set(apps.map(a => (a.repo || repoFromUrl(a.url)).toLowerCase()));
      const urls = new Set(apps.map(a => a.url.toLowerCase()));
      const hiddenRepos = new Set(HIDDEN_REPOS.map(r => r.toLowerCase()));
      const candidates = repos.filter(r => r.has_pages
        && !hiddenRepos.has(r.name.toLowerCase())
        && !inHub.has(r.name.toLowerCase())
        && !urls.has(repoToUrl(r.name).toLowerCase()));
      repoBox.replaceChildren();
      if (!candidates.length) {
        repoBox.append(el('p.muted', {}, 'Toutes tes applications publiées sont déjà dans OLYN-WANE. Tu peux quand même coller un lien ci-dessous.'));
        return;
      }
      repoBox.append(el('p.field-label', {}, 'Tes applications publiées pas encore dans OLYN-WANE'));
      const list = el('div.repo-list');
      candidates.forEach(r => {
        const chip = el('button.repo-chip', { type: 'button' },
          [el('strong', {}, r.name), r.description ? el('span', {}, r.description) : null]);
        chip.addEventListener('click', () => {
          list.querySelectorAll('.repo-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          urlInput.value = repoToUrl(r.name);
          readFromLink({ force: 'all', repoInfo: r });
        });
        list.append(chip);
      });
      repoBox.append(list);
    }).catch(err => {
      repoBox.replaceChildren(el('p.muted', {}, `Liste des dépôts indisponible (${err.message}). Colle simplement le lien ci-dessous.`));
    });
  }

  // ---- Boutons ----------------------------------------------------------
  const submitBtn = el('button.btn.btn-primary', { type: 'submit' }, editing ? 'Enregistrer' : 'Ajouter à OLYN-WANE');
  const forceBtn = el('button.btn.btn-ghost.btn-small', { type: 'button', hidden: true, onclick: () => submit(true) }, 'Enregistrer quand même');
  const rereadBtn = el('button.btn.btn-ghost.btn-small', { type: 'button', title: 'Relire l\'icône et la couleur depuis l\'application', onclick: () => readFromLink({ force: 'visual' }) }, [el('span.ico', { html: icons.refresh }), 'Relire']);

  const form = el('form.app-form', {
    onsubmit: e => { e.preventDefault(); submit(false); },
  }, [
    editing ? null : repoBox,
    field('Lien de l\'application', el('div.input-row', {}, [urlInput, rereadBtn]), 'Adresse de la page publiée, ou lien du dépôt GitHub : les deux fonctionnent.'),
    el('div.link-line', {}, [linkStatus, forceBtn]),
    el('p.field-label', {}, 'Aperçu'),
    previewBox,
    field('Nom', nameInput),
    field('Description', descInput),
    el('fieldset.field', {}, [
      el('legend.field-label', {}, 'Secteurs'),
      data.categories.length ? catBox : el('p.muted.small', {}, 'Aucun secteur : crées-en dans « Gérer ». L\'application sera visible dans « Toutes ».'),
      catTools,
    ]),
    el('div.three-cols', {}, [
      field('Émoji de secours', emoji.wrap),
      field('Icône (adresse)', iconInput),
      field('Couleur', colorInput),
    ]),
    el('fieldset.field', {}, [
      el('legend.field-label', {}, 'Ouverture'),
      el('label.radio', {}, [modeInside, el('span', {}, 'Dans OLYN-WANE (dans un onglet)')]),
      el('label.radio', {}, [modeOutside, el('span', {}, 'À part, dans un nouvel onglet du navigateur (caméra, plein écran…)')]),
    ]),
    el('div.row-actions.sticky-actions', {}, [
      el('button.btn.btn-ghost', { type: 'button', onclick: () => sheet.close() }, 'Annuler'),
      submitBtn,
    ]),
  ]);

  const sheet = openSheet({ title: editing ? `Modifier ${app.name}` : 'Ajouter une application', content: form, wide: true });
  refreshPreview();
  if (editing) setStatus('ok', 'Lien déjà vérifié. Modifie-le pour le vérifier à nouveau.');

  async function submit(force) {
    const url = normalizeUrl(urlInput.value);
    const name = nameInput.value.trim();
    if (!url) { setStatus('error', 'Le lien est obligatoire.'); urlInput.focus(); return; }
    if (!name) { toast('Donne un nom à l\'application.', { type: 'error' }); nameInput.focus(); return; }
    const duplicate = store.getState().data.apps.find(a => a.url.toLowerCase() === url.toLowerCase() && a.id !== values.id);
    if (duplicate) { setStatus('error', `Ce lien est déjà utilisé par « ${duplicate.name} ».`); return; }

    if (!linkOk && !force) {
      await readFromLink();
      if (!linkOk) return;
    }

    const entry = {
      id: values.id,
      name,
      description: descInput.value.trim(),
      url,
      repo: values.repo || repoFromUrl(url),
      icon: iconInput.value.trim(),
      iconFallback: emoji.input.value || '🔧',
      color: colorInput.value,
      categories: selectedCats(),
      openMode: modeOutside.checked ? 'outside' : 'inside',
    };

    submitBtn.disabled = true;
    const ok = await save(d => {
      if (editing) {
        const i = d.apps.findIndex(a => a.id === entry.id);
        if (i < 0) throw new Error('Cette application a été supprimée depuis un autre appareil.');
        d.apps[i] = entry;
      } else {
        entry.id = store.uniqueId(entry.repo || entry.name, d.apps.map(a => a.id));
        d.apps.push(entry);
      }
    }, editing ? `Modification de l'application ${name}` : `Ajout de l'application ${name}`,
    editing ? `${name} enregistrée` : `${name} ajoutée à OLYN-WANE`);
    submitBtn.disabled = false;
    if (ok) sheet.close();
  }
}

function field(label, control, help) {
  return el('label.field', {}, [
    el('span.field-label', {}, label),
    control,
    help ? el('span.field-help', {}, help) : null,
  ]);
}
