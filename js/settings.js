// ============================================================
//  SETTINGS.JS — Paramètres : nombre d'onglets, jeton GitHub,
//  informations
// ============================================================
import { el, openSheet, toast, confirmDialog } from './ui.js';
import { getPrefs, setMaxTabs, setToken, clampTabs } from './prefs.js';
import { HUB, OWNER, REPO, TABS_MIN, TABS_MAX } from './config.js';
import * as gh from './github.js';
import * as store from './store.js';

let current = null;

export function openSettings() {
  if (current) return;
  const body = el('div.settings');
  current = openSheet({ title: 'Paramètres', content: body, onClose: () => { current = null; } });
  draw(body);
}

function draw(body) {
  const prefs = getPrefs();
  body.replaceChildren(limitBlock(prefs), tokenBlock(prefs, body), aboutBlock());
}

// ---- Nombre d'applications ouvertes en même temps ---------------
function limitBlock(prefs) {
  const value = el('output.stepper-value', {}, String(prefs.maxTabs));
  const change = async delta => {
    const n = clampTabs(Number(value.textContent) + delta);
    value.textContent = String(n);
    minus.disabled = n <= TABS_MIN;
    plus.disabled = n >= TABS_MAX;
    await setMaxTabs(n);
  };
  const minus = el('button.icon-btn.stepper-btn', { type: 'button', 'aria-label': 'Diminuer', onclick: () => change(-1), disabled: prefs.maxTabs <= TABS_MIN }, '−');
  const plus = el('button.icon-btn.stepper-btn', { type: 'button', 'aria-label': 'Augmenter', onclick: () => change(1), disabled: prefs.maxTabs >= TABS_MAX }, '+');
  return el('section.set-block', {}, [
    el('h3', {}, 'Applications ouvertes en même temps'),
    el('div.stepper', {}, [minus, value, plus]),
    el('p.muted.small', {}, `Entre ${TABS_MIN} et ${TABS_MAX}, réglé pour cet appareil uniquement. Sur un appareil peu puissant, garde un petit nombre.`),
  ]);
}

// ---- Jeton GitHub --------------------------------------------------
function tokenBlock(prefs, body) {
  const block = el('section.set-block', {}, [el('h3', {}, 'Compte GitHub')]);

  if (prefs.token) {
    block.append(
      el('p.token-ok', {}, `Jeton enregistré sur cet appareil · compte ${prefs.login || OWNER}`),
      el('p.muted.small', {}, 'L\'onglet « Gérer » est disponible sur cet appareil.'),
      el('div.row-actions.left', {}, [
        el('button.btn.btn-ghost', {
          type: 'button',
          onclick: async e => {
            const btn = e.currentTarget;
            btn.disabled = true;
            try {
              const login = await gh.getUser(prefs.token);
              toast(`Jeton valide (compte ${login})`, { type: 'success' });
            } catch (err) {
              toast(err.message, { type: 'error', duration: 7000 });
            }
            btn.disabled = false;
          },
        }, 'Tester le jeton'),
        el('button.btn.btn-danger', {
          type: 'button',
          onclick: async () => {
            const ok = await confirmDialog({
              title: 'Retirer le jeton ?',
              message: 'Le jeton sera effacé de cet appareil et l\'onglet « Gérer » disparaîtra. Les autres appareils ne sont pas concernés.',
              okLabel: 'Retirer',
              danger: true,
            });
            if (!ok) return;
            await setToken('');
            store.setToken(null);
            toast('Jeton retiré de cet appareil');
            draw(body);
          },
        }, 'Retirer le jeton'),
      ]),
    );
    return block;
  }

  const input = el('input.input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Jeton GitHub' });
  const show = el('button.btn.btn-ghost.btn-small', {
    type: 'button',
    onclick: () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      show.textContent = input.type === 'password' ? 'Afficher' : 'Cacher';
    },
  }, 'Afficher');
  const saveBtn = el('button.btn.btn-primary', { type: 'submit' }, 'Enregistrer');

  const form = el('form.token-form', {
    onsubmit: async e => {
      e.preventDefault();
      const token = input.value.trim();
      if (!token) { input.focus(); return; }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Vérification…';
      try {
        const login = await gh.getUser(token);
        if (login.toLowerCase() !== OWNER.toLowerCase()) {
          throw new Error(`Ce jeton appartient au compte « ${login} », pas à « ${OWNER} ».`);
        }
        await setToken(token, login);
        store.setToken(token);
        toast('Jeton enregistré : l\'onglet « Gérer » est disponible', { type: 'success' });
        store.refresh().catch(() => {});
        draw(body);
      } catch (err) {
        toast(err.message, { type: 'error', duration: 7000 });
        saveBtn.disabled = false;
        saveBtn.textContent = 'Enregistrer';
      }
    },
  }, [el('div.input-row', {}, [input, show]), saveBtn]);

  block.append(
    el('p.muted.small', {}, 'Sans jeton, OLYN-WANE s\'utilise normalement mais la liste ne peut pas être modifiée. Le jeton reste uniquement sur cet appareil : ne l\'enregistre que sur tes propres appareils.'),
    form,
    tokenHelp(),
  );
  return block;
}

function tokenHelp() {
  const steps = [
    'Sur github.com, clique sur ta photo de profil en haut à droite, puis Settings.',
    'Tout en bas du menu de gauche : Developer settings, puis Personal access tokens, puis Fine-grained tokens.',
    'Clique sur Generate new token.',
    'Token name : « OLYN-WANE ». Expiration : 1 an par exemple.',
    `Repository access : choisis Only select repositories, puis uniquement ${REPO}.`,
    'Permissions : dans les permissions du dépôt, trouve Contents et choisis Read and write. Ne touche à rien d\'autre.',
    'Clique sur Generate token, puis copie tout de suite le jeton (il commence par github_pat_). GitHub ne l\'affiche qu\'une seule fois.',
    'Colle-le ici et enregistre. Garde-le dans un endroit sûr pour tes autres appareils.',
  ];
  return el('details.help', {}, [
    el('summary', {}, 'Comment créer un jeton GitHub ?'),
    el('ol', {}, steps.map(s => el('li', {}, s))),
  ]);
}

// ---- À propos ----------------------------------------------------------
function aboutBlock() {
  return el('section.set-block.about', {}, [
    el('img.about-logo', { src: 'assets/icons/icon-192.png', alt: '' }),
    el('div', {}, [
      el('p.about-name', {}, HUB.name),
      el('p.muted.small', {}, `Version ${HUB.version}`),
      el('p.small', {}, HUB.author),
    ]),
  ]);
}
