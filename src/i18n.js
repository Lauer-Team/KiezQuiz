/**
 * Lightweight i18n for KiezQuiz (de / en).
 */
const LOCALE_STORAGE_KEY = 'kiezquiz_locale';

let _locale = 'de';
let _messages = {};
const _localeListeners = [];

function detectDefaultLocale() {
  const lang = (navigator.language || 'de').toLowerCase();
  return lang.startsWith('en') ? 'en' : 'de';
}

function getNested(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? vars[name] : `{${name}}`));
}

async function loadLocaleMessages(lang) {
  const base = (typeof window !== 'undefined' && window.KIEZ_SRC_BASE) || 'src/';
  const response = await fetch(`${base}locales/${lang}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load locale: ${lang}`);
  }
  return response.json();
}

function t(key, vars) {
  const value = getNested(_messages, key);
  if (typeof value === 'string') return interpolate(value, vars);
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? interpolate(item, vars) : item));
  return key;
}

function tMap(groupKey, itemKey) {
  const group = getNested(_messages, groupKey);
  const value = group?.[itemKey];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value;
  return undefined;
}

function getLocale() {
  return _locale;
}

function getFormatLocale() {
  return _locale === 'en' ? 'en-US' : 'de-DE';
}

function formatNumber(value) {
  return Number(value).toLocaleString(getFormatLocale());
}

function formatDate(date, options) {
  return new Date(date).toLocaleDateString(getFormatLocale(), options);
}

function formatTime(date, options) {
  return new Date(date).toLocaleTimeString(getFormatLocale(), options);
}

function applyToDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  document.documentElement.lang = _locale;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = t('meta.description');

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = t('meta.title');

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = t('meta.ogDescription');

  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.content = _locale === 'en' ? 'en_US' : 'de_DE';

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.content = t('meta.title');

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.content = t('meta.ogDescription');

  document.title = t('meta.title');
}

function notifyLocaleListeners() {
  _localeListeners.forEach((cb) => {
    try { cb(_locale); } catch (e) { console.warn('Locale listener error:', e); }
  });
}

async function setLocale(lang) {
  const next = lang === 'en' ? 'en' : 'de';
  if (next === _locale && Object.keys(_messages).length) {
    applyToDom();
    notifyLocaleListeners();
    return;
  }
  _messages = await loadLocaleMessages(next);
  _locale = next;
  localStorage.setItem(LOCALE_STORAGE_KEY, _locale);
  applyToDom();
  notifyLocaleListeners();
}

function onLocaleChange(callback) {
  _localeListeners.push(callback);
}

async function initI18n() {
  _locale = localStorage.getItem(LOCALE_STORAGE_KEY) || detectDefaultLocale();
  _messages = await loadLocaleMessages(_locale);
  applyToDom();
  return _locale;
}

window.t = t;
window.tMap = tMap;
window.getLocale = getLocale;
window.getFormatLocale = getFormatLocale;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.setLocale = setLocale;
window.applyToDom = applyToDom;
window.onLocaleChange = onLocaleChange;
window.initI18n = initI18n;
