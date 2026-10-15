let currentLang = 'en';
let strings = {};
let listeners = [];

export async function initI18n() {
  try { currentLang = localStorage.getItem('barca-lang') || 'en'; } catch (e) {}
  await loadStrings(currentLang);
}

async function loadStrings(lang) {
  const resp = await fetch(`./i18n/${lang}.json`);
  strings = await resp.json();
}

export function t(key) {
  const parts = key.split('.');
  let val = strings;
  for (const p of parts) val = val?.[p];
  return val || key;
}

export function localized(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[currentLang] || obj.en || '';
}

export function getLang() { return currentLang; }

export async function setLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('barca-lang', lang); } catch (e) {}
  await loadStrings(lang);
  listeners.forEach(fn => fn(lang));
}

export function onLangChange(fn) { listeners.push(fn); }
