// ============================================================
//  MANAGE.JS — Onglet « Gérer » (visible avec un jeton GitHub)
//  Applications : ajout, modification, ordre, suppression
//  Secteurs     : création, modification, ordre, suppression
//  Chaque action = un enregistrement dans data/apps.json sur GitHub
// ============================================================
import { el, icons, confirmDialog, emojiField, toast } from './ui.js';
import * as store from './store.js';
import { save } from './actions.js';
import { openAppForm } from './appform.js';
import { makeSortable } from './sortable.js';
import { renderIcon } from './icon-loader.js';

let root;

export function initManage() {
  root = document.getElementById('manage-view');
}

export function renderManage(state) {
  if (!root) return;
  const { categories, apps } = state.data;
  const scroll = root.scrollTop;
  root.replaceChildren();

  root.append(el('div.manage-actions', {}, [
    el('button.btn.btn-primary', { type: 'button', onclick: () => openAppForm() }, '➕ Ajouter une application'),
  ]));

  // ---- Applications --------------------------------------------------
  const appsBlock = el('section.manage-block', {}, [
    el('h2.block-title', {}, `Applications · ${apps.length}`),
    el('p.muted.small', {}, 'Glisse les poignées ⠿ pour changer l\'ordre : c\'est l\'ordre de l\'accueil, dans « Toutes » comme dans chaque secteur.'),
  ]);
  const ul = el('ul.manage-list');
  apps.forEach(app => ul.append(appRow(app, categories)));
  if (!apps.length) ul.append(el('li.manage-empty', {}, 'Aucune application pour l\'instant.'));
  appsBlock.append(ul);
  if (apps.length > 1) makeSortable(ul, { onDrop: reorderApps });
  root.append(appsBlock);

  // ---- Secteurs ----------------------------------------------------------
  root.append(categoriesBlock(categories, apps));
  root.scrollTop = scroll;
}

function appRow(app, categories) {
  const icon = el('span.row-icon');
  renderIcon(icon, app);
  const sectors = app.categories.map(id => categories.find(c => c.id === id)).filter(Boolean);
  return el('li.manage-row', { dataset: { id: app.id } }, [
    el('button.grip', { type: 'button', 'aria-label': `Déplacer ${app.name}`, html: icons.grip }),
    icon,
    el('div.row-text', {}, [
      el('span.row-name', {}, [app.name, app.openMode === 'outside' ? el('span.tag', {}, '↗ à part') : null]),
      el('span.row-desc', {}, sectors.length
        ? sectors.map(c => `${c.icon} ${c.label}`).join(' · ')
        : 'Aucun secteur (visible dans « Toutes »)'),
    ]),
    el('div.row-buttons', {}, [
      el('button.icon-btn', { type: 'button', 'aria-label': `Modifier ${app.name}`, title: 'Modifier', html: icons.edit, onclick: () => openAppForm(app) }),
      el('button.icon-btn.danger', { type: 'button', 'aria-label': `Supprimer ${app.name}`, title: 'Supprimer', html: icons.trash, onclick: () => removeApp(app) }),
    ]),
  ]);
}

async function removeApp(app) {
  const ok = await confirmDialog({
    title: 'Supprimer cette application ?',
    message: `« ${app.name} » sera retirée d'OLYN-WANE sur tous les appareils. L'application elle-même et son dépôt GitHub ne sont pas touchés : tu pourras la rajouter.`,
    okLabel: 'Supprimer',
    danger: true,
  });
  if (!ok) return;
  save(d => { d.apps = d.apps.filter(a => a.id !== app.id); },
    `Suppression de l'application ${app.name}`, `${app.name} retirée d'OLYN-WANE`);
}

function reorderApps(ids) {
  save(d => {
    const ordered = ids.map(id => d.apps.find(a => a.id === id)).filter(Boolean);
    d.apps.forEach(a => { if (!ordered.includes(a)) ordered.push(a); }); // ajoutée ailleurs entre-temps
    d.apps = ordered;
  }, 'Nouvel ordre des applications', 'Ordre enregistré');
}

// ---- Secteurs -------------------------------------------------------------
function categoriesBlock(categories, apps) {
  const block = el('section.manage-block', {}, [
    el('h2.block-title', {}, `Secteurs · ${categories.length}`),
    el('p.muted.small', {}, 'Les secteurs servent de filtres sur l\'accueil. Un secteur sans application n\'y apparaît pas.'),
  ]);

  // Création : nom + émoji + couleur
  const nameInput = el('input.input', { type: 'text', placeholder: 'Nom du secteur', maxlength: '30', 'aria-label': 'Nom du secteur' });
  const emoji = emojiField('', { label: 'Émoji du secteur' });
  const color = el('input.color-input', { type: 'color', value: '#6c757d', 'aria-label': 'Couleur du secteur' });
  const form = el('form.cat-form', {
    onsubmit: e => {
      e.preventDefault();
      const label = nameInput.value.trim();
      const icon = emoji.input.value;
      if (!label) { toast('Donne un nom au secteur.', { type: 'error' }); nameInput.focus(); return; }
      if (!icon) { toast('Choisis un émoji pour le secteur.', { type: 'error' }); emoji.input.focus(); return; }
      if (store.getState().data.categories.some(c => c.label.toLowerCase() === label.toLowerCase())) {
        toast('Ce secteur existe déjà.', { type: 'error' }); return;
      }
      save(d => {
        d.categories.push({ id: store.uniqueId(label, d.categories.map(c => c.id)), label, icon, color: color.value });
      }, `Création du secteur ${label}`, `Secteur « ${label} » créé`);
    },
  }, [nameInput, emoji.wrap, color, el('button.btn.btn-primary', { type: 'submit' }, 'Créer')]);
  block.append(form);

  const ul = el('ul.manage-list');
  categories.forEach(cat => ul.append(categoryRow(cat, apps.filter(a => a.categories.includes(cat.id)).length)));
  block.append(ul);
  if (categories.length > 1) {
    makeSortable(ul, {
      onDrop: ids => save(d => {
        const ordered = ids.map(id => d.categories.find(c => c.id === id)).filter(Boolean);
        d.categories.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
        d.categories = ordered;
      }, 'Nouvel ordre des secteurs', 'Ordre des secteurs enregistré'),
    });
  }
  return block;
}

function categoryRow(cat, count) {
  const li = el('li.manage-row.cat-row', { dataset: { id: cat.id } });

  const view = () => {
    const badge = el('span.cat-badge', {}, cat.label);
    badge.style.setProperty('--c', cat.color);
    li.replaceChildren(
      el('button.grip', { type: 'button', 'aria-label': `Déplacer ${cat.label}`, html: icons.grip }),
      el('span.cat-row-emoji', { 'aria-hidden': 'true' }, cat.icon),
      el('div.row-text', {}, [
        el('span.row-name', {}, [badge]),
        el('span.row-desc', {}, count ? `${count} application${count > 1 ? 's' : ''}` : 'vide'),
      ]),
      el('div.row-buttons', {}, [
        el('button.icon-btn', { type: 'button', 'aria-label': `Modifier ${cat.label}`, title: 'Modifier', html: icons.edit, onclick: edit }),
        el('button.icon-btn.danger', { type: 'button', 'aria-label': `Supprimer ${cat.label}`, title: 'Supprimer', html: icons.trash, onclick: remove }),
      ]),
    );
  };

  const edit = () => {
    const nameInput = el('input.input', { type: 'text', value: cat.label, maxlength: '30', 'aria-label': 'Nom du secteur' });
    const emoji = emojiField(cat.icon, { label: 'Émoji du secteur' });
    const color = el('input.color-input', { type: 'color', value: cat.color, 'aria-label': 'Couleur du secteur' });
    const form = el('form.cat-form.cat-edit', {
      onsubmit: e => {
        e.preventDefault();
        const label = nameInput.value.trim();
        if (!label) { nameInput.focus(); return; }
        save(d => {
          const c = d.categories.find(x => x.id === cat.id);
          if (!c) throw new Error('Ce secteur a été supprimé depuis un autre appareil.');
          c.label = label;
          c.icon = emoji.input.value || cat.icon;
          c.color = color.value;
        }, `Modification du secteur ${cat.label}`, 'Secteur enregistré');
      },
    }, [
      nameInput, emoji.wrap, color,
      el('div.cat-edit-actions', {}, [
        el('button.btn.btn-ghost.btn-small', { type: 'button', onclick: view }, 'Annuler'),
        el('button.btn.btn-primary.btn-small', { type: 'submit' }, 'Enregistrer'),
      ]),
    ]);
    li.replaceChildren(form);
    nameInput.focus();
  };

  const remove = async () => {
    const message = count
      ? `Le secteur « ${cat.label} » sera retiré de ${count} application${count > 1 ? 's' : ''}. Les applications elles-mêmes restent dans OLYN-WANE.`
      : `Le secteur « ${cat.label} » sera supprimé.`;
    const ok = await confirmDialog({ title: 'Supprimer ce secteur ?', message, okLabel: 'Supprimer', danger: true });
    if (!ok) return;
    save(d => {
      d.categories = d.categories.filter(c => c.id !== cat.id);
      d.apps.forEach(a => { a.categories = a.categories.filter(id => id !== cat.id); });
    }, `Suppression du secteur ${cat.label}`, `Secteur « ${cat.label} » supprimé`);
  };

  view();
  return li;
}
