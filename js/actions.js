// ============================================================
//  ACTIONS.JS — Enregistrement d'une modification sur GitHub,
//  avec retour visuel (barre de progression + message)
// ============================================================
import * as store from './store.js';
import { toast } from './ui.js';

let busy = 0;
function setBusy(delta) {
  busy += delta;
  document.body.classList.toggle('ow-saving', busy > 0);
}

/**
 * Applique `change(data)` et l'enregistre sur GitHub.
 * `message` devient le message du commit, `done` s'affiche si c'est réussi.
 * Renvoie true si c'est enregistré.
 */
export async function save(change, message, done) {
  setBusy(1);
  try {
    const { merged } = await store.mutate(change, message);
    if (merged) toast('Des changements faits sur un autre appareil ont été récupérés et conservés.', { type: 'info', duration: 4500 });
    if (done) toast(done, { type: 'success', duration: 2200 });
    return true;
  } catch (err) {
    console.error(err);
    toast(err.message || 'Enregistrement impossible.', { type: 'error', duration: 7000 });
    return false;
  } finally {
    setBusy(-1);
  }
}
