/**
 * Datenschutzhinweis zu lokaler Speicherung — keine Tracking-Cookies, kein CMP nötig.
 * „Cookie-Einstellungen“ im Footer zeigt den Hinweis erneut (Widerruf der Bestätigung).
 */
(function () {
  var STORAGE_KEY = 'kiezquiz_legal_notice_v1';
  var BANNER_VERSION = '2';

  var COPY = {
    de: {
      aria: 'Datenschutzhinweis',
      body: 'Wir speichern Spielstand und Einstellungen nur lokal in deinem Browser (localStorage). Keine Werbe- oder Analyse-Cookies. Mit optionalem Account werden Daten verschlüsselt bei Supabase (EU) gespeichert. ',
      privacy: 'Datenschutz',
      imprint: 'Impressum',
      accept: 'Verstanden'
    },
    en: {
      aria: 'Privacy notice',
      body: 'We store progress and settings locally in your browser (localStorage) only. No advertising or analytics cookies. With an optional account, data is encrypted and stored with Supabase (EU). ',
      privacy: 'Privacy policy',
      imprint: 'Imprint',
      accept: 'Got it'
    }
  };

  function detectLang() {
    try {
      if (typeof getLocale === 'function') return getLocale();
      var stored = localStorage.getItem('kiezquiz_locale');
      if (stored === 'en' || stored === 'de') return stored;
    } catch (e) { /* ignore */ }
    return (navigator.language || 'de').toLowerCase().startsWith('en') ? 'en' : 'de';
  }

  function isDismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === BANNER_VERSION;
    } catch (e) {
      return false;
    }
  }

  function dismiss(banner) {
    try { localStorage.setItem(STORAGE_KEY, BANNER_VERSION); } catch (e) { /* ignore */ }
    if (banner) banner.hidden = true;
  }

  function removeBanner() {
    var existing = document.querySelector('.kq-cookie-banner');
    if (existing) existing.remove();
  }

  function renderBanner() {
    if (typeof document === 'undefined') return;
    if (isDismissed()) return;

    removeBanner();
    var lang = detectLang();
    var copy = COPY[lang] || COPY.de;
    var banner = document.createElement('aside');
    banner.className = 'kq-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-label', copy.aria);
    banner.innerHTML =
      '<p class="kq-cookie-banner__text">' +
        copy.body +
        '<a href="/datenschutz/">' + copy.privacy + '</a> · ' +
        '<a href="/impressum/">' + copy.imprint + '</a>.' +
      '</p>' +
      '<div class="kq-cookie-banner__actions">' +
        '<button type="button" class="kq-cookie-banner__btn kq-cookie-banner__btn--primary" data-cookie-accept>' +
          copy.accept +
        '</button>' +
      '</div>';

    document.body.appendChild(banner);
    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', function () {
      dismiss(banner);
    });
  }

  function reopenSettings() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    removeBanner();
    renderBanner();
    var banner = document.querySelector('.kq-cookie-banner');
    if (banner) {
      banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      var btn = banner.querySelector('[data-cookie-accept]');
      if (btn) btn.focus();
    }
  }

  function bindFooterTriggers() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-cookie-settings]');
      if (!trigger) return;
      e.preventDefault();
      reopenSettings();
    });
  }

  function init() {
    bindFooterTriggers();
    if (document.body) renderBanner();
    else document.addEventListener('DOMContentLoaded', renderBanner);
  }

  window.kiezCookieConsent = {
    init: init,
    dismiss: dismiss,
    reopenSettings: reopenSettings,
    storageKey: STORAGE_KEY,
    bannerVersion: BANNER_VERSION
  };
  init();
})();
