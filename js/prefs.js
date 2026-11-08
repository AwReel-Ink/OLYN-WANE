// ============================================================
//  PREFS.JS — Préférences propres à cet appareil
// ============================================================
import * as db from './db.js';
import { TABS_DEFAULT, TABS_MIN, TABS_MAX } from './config.js';

const prefs = {
  token: '',
  login: '',
  maxTabs: TABS_DEFAULT,
};

const listeners = new Set();
export function onPrefsChange(fn) { listeners.add(fn); }
function emit(key) { listeners.forEach(fn => fn(key, prefs)); }

export async function loadPrefs() {
  prefs.token = await db.get('token', '');
  prefs.login = await db.get('login', '');
  prefs.maxTabs = clampTabs(await db.get('maxTabs', TABS_DEFAULT));
  return prefs;
}

export function getPrefs() { return prefs; }

export function clampTabs(n) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) return TABS_DEFAULT;
  return Math.min(TABS_MAX, Math.max(TABS_MIN, n));
}

export async function setMaxTabs(n) {
  prefs.maxTabs = clampTabs(n);
  await db.set('maxTabs', prefs.maxTabs);
  emit('maxTabs');
}

export async function setToken(token, login) {
  prefs.token = token || '';
  prefs.login = login || '';
  if (prefs.token) {
    await db.set('token', prefs.token);
    await db.set('login', prefs.login);
  } else {
    await db.del('token');
    await db.del('login');
  }
  emit('token');
}
