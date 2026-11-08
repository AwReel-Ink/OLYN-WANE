// ============================================================
//  UI.JS — Petits outils d'interface partagés :
//  création d'éléments, messages, fenêtres, champ émoji
// ============================================================

/** Crée un élément : el('div.card', { onclick }, [enfants]) */
export function el(tag, attrs = {}, children = []) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const icons = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// --- Messages éphémères -----------------------------------------
export function toast(message, { type = 'info', action, actionLabel, duration = 3200 } = {}) {
  const root = document.getElementById('toasts');
  const node = el(`div.toast.toast-${type}`, { role: 'status' }, [el('span', {}, message)]);
  if (action) {
    node.append(el('button.toast-action', {
      type: 'button',
      onclick: () => { action(); dismiss(); },
    }, actionLabel || 'OK'));
  }
  root.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  const timer = duration > 0 ? setTimeout(dismiss, duration) : null;
  function dismiss() {
    clearTimeout(timer);
    node.classList.remove('show');
    setTimeout(() => node.remove(), 250);
  }
  return dismiss;
}

// --- Fenêtres (panneaux) -----------------------------------------
export function openSheet({ title, content, wide = false, onClose }) {
  const root = document.getElementById('modal-root');
  const panel = el(`div.sheet${wide ? '.sheet-wide' : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const backdrop = el('div.sheet-backdrop', { onclick: e => { if (e.target === backdrop) close(); } }, [panel]);
  const head = el('div.sheet-head', {}, [
    el('h2', {}, title),
    el('button.icon-btn', { type: 'button', 'aria-label': 'Fermer', onclick: () => close(), html: icons.close }),
  ]);
  const body = el('div.sheet-body', {}, [content]);
  panel.append(head, body);
  root.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 220);
    if (onClose) onClose();
  }
  return { close, body, panel };
}

export function confirmDialog({ title, message, okLabel = 'Confirmer', danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    const content = el('div.confirm', {}, [
      el('p', {}, message),
      el('div.row-actions', {}, [
        el('button.btn.btn-ghost', { type: 'button', onclick: () => finish(false) }, 'Annuler'),
        el(`button.btn${danger ? '.btn-danger' : '.btn-primary'}`, { type: 'button', onclick: () => finish(true) }, okLabel),
      ]),
    ]);
    const sheet = openSheet({ title, content, onClose: () => { if (!answered) resolve(false); } });
    function finish(value) { answered = true; sheet.close(); resolve(value); }
  });
}

// --- Champ émoji ---------------------------------------------------
const EMOJIS = [
  '🌐','🧩','📋','📝','📊','📈','🗂️','📁','📅','⏱️','⏰','🧾',
  '🌿','🌱','🌳','🍂','🌻','🌸','🥬','🐝','💧','☀️','🌦️','🚜',
  '🔧','🔨','🛠️','⚙️','🧰','🔩','📏','📐','✖️','🔢','🧮','💡',
  '📦','🚚','🏭','🏷️','🛒','🧺','🧹','🧴','🧽','🪣','♻️','🔋',
  '🍽️','🍳','🥗','🥖','☕','🧂','🔥','❄️','🧪','🩺','💊','🧤',
  '🚗','🚐','🛵','🚲','🗺️','📍','🧭','🏠','🏢','🏫','🏥','⛽',
  '👥','👷','🧑‍🔧','🧑‍🌾','🧑‍🍳','🙋','📞','✉️','💬','📷','🎨','📖',
  '💶','💼','🔒','🔑','⭐','✅','❗','❓','🎯','🏆','❤️','🙂',
];

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('fr', { granularity: 'grapheme' }) : null;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/** Ne garde que le dernier émoji saisi (lettres et chiffres ignorés). */
export function onlyEmoji(text) {
  const parts = segmenter ? [...segmenter.segment(text)].map(s => s.segment) : Array.from(text);
  const emojis = parts.filter(p => EMOJI_RE.test(p));
  return emojis.length ? emojis[emojis.length - 1] : '';
}

/** Champ réservé aux émojis + palette à cliquer. Renvoie { wrap, input }. */
export function emojiField(value = '', { onChange, label = 'Émoji' } = {}) {
  const input = el('input.input.emoji-input', {
    type: 'text', value, inputmode: 'text', autocomplete: 'off',
    'aria-label': label, placeholder: '🙂', maxlength: 16,
  });
  let last = value;
  input.addEventListener('input', () => {
    const e = onlyEmoji(input.value);
    input.value = e || (input.value === '' ? '' : last);
    last = input.value;
    if (onChange) onChange(input.value);
  });

  const palette = el('div.emoji-palette', { hidden: true });
  EMOJIS.forEach(em => palette.append(el('button.emoji-choice', {
    type: 'button',
    onclick: () => {
      input.value = em; last = em; palette.hidden = true;
      if (onChange) onChange(em);
    },
  }, em)));

  const toggle = el('button.icon-btn.emoji-toggle', {
    type: 'button', 'aria-label': 'Choisir un émoji',
    onclick: () => { palette.hidden = !palette.hidden; },
  }, '▾');

  const wrap = el('div.emoji-field', {}, [el('div.emoji-line', {}, [input, toggle]), palette]);
  return { wrap, input };
}
