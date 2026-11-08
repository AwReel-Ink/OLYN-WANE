// ============================================================
//  CONFIG.JS — Réglages fixes d'OLYN-WANE
//
//  La liste des applications et des secteurs n'est plus ici :
//  elle est dans data/apps.json, modifié par l'onglet « Gérer ».
//
//  Si tu modifies le code (HTML, CSS, JS), change seulement
//  le numéro de version ci-dessous pour t'y retrouver.
//  Les appareils récupèrent la nouvelle version tout seuls.
// ============================================================

export const HUB = {
  name: 'OLYN-WANE',
  subtitle: 'Accès rapide à vos applications',
  version: '1.1.0',
  author: '©2026 LEROY Aurélien — Tous Droits Réservés',
};

export const OWNER = 'awreel-ink';           // le compte GitHub
export const REPO = 'olyn-wane';             // le dépôt d'OLYN-WANE
export const BRANCH = 'main';                // la branche publiée
export const DATA_PATH = 'data/apps.json';   // le fichier des applis et secteurs
export const PAGES_BASE = `https://${OWNER}.github.io/`;

// Dépôts jamais proposés dans « Ajouter une application »
export const HIDDEN_REPOS = ['olyn-wane', 'meszapply'];

// Applications ouvertes en même temps (réglable par appareil)
export const TABS_DEFAULT = 5;
export const TABS_MIN = 1;
export const TABS_MAX = 15;
