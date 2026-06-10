/**
 * Datenschutzhinweis zu lokaler Speicherung — keine Tracking-Cookies, kein CMP nötig.
 * „Cookie-Einstellungen“ im Footer zeigt den Hinweis erneut (Widerruf der Bestätigung).
 */
(function () {
  var STORAGE_KEY = 'kiezquiz_legal_notice_v1';
  var BANNER_VERSION = '3';
  var TERMS_DISMISS_PREFIX = 'kiezquiz_terms_notice_';
  var lastFocusedBeforeBanner = null;

  var COPY = {
    de: {
      aria: 'Datenschutzhinweis',
      body: 'Diese Website verwendet localStorage, um Ihren Spielstand lokal in Ihrem Browser zu speichern – ohne Account, ohne Server. Wenn Sie sich registrieren, setzt Supabase technisch notwendige Session-Cookies für die Authentifizierung. Wir nutzen kein Tracking und keine Werbe-Cookies. Weitere Informationen in unserer ',
      privacy: 'Datenschutzerklärung',
      imprint: 'Impressum',
      accept: 'Verstanden'
    },
    en: {
      aria: 'Privacy notice',
      body: 'This website uses localStorage to save your game progress locally in your browser – no account, no server. If you register, Supabase sets technically necessary session cookies for authentication. We use no tracking and no advertising cookies. See our ',
      privacy: 'Privacy Policy',
      imprint: 'Imprint',
      accept: 'Got it'
    }
  };

  var TERMS_COPY = {
    de: {
      aria: 'Hinweis zu geänderten Nutzungsbedingungen',
      body: 'Wir haben unsere Nutzungsbedingungen aktualisiert. Sie treten am {date} in Kraft.',
      link: 'Nutzungsbedingungen lesen',
      dismiss: 'Verstanden'
    },
    en: {
      aria: 'Updated terms of use notice',
      body: 'We have updated our terms of use. They take effect on {date}.',
      link: 'Read terms of use',
      dismiss: 'Got it'
    }
  };

  function assetUrl(path) {
    if (typeof window.kiezAssetUrl === 'function') return window.kiezAssetUrl(path);
    return path;
  }

  function termsDismissKey(version) {
    return TERMS_DISMISS_PREFIX + (version || 'unknown');
  }

  function isTermsDismissed(version) {
    try {
      return localStorage.getItem(termsDismissKey(version)) === '1';
    } catch (e) {
      return false;
    }
  }

  function dismissTerms(banner, version) {
    try { localStorage.setItem(termsDismissKey(version), '1'); } catch (e) { /* ignore */ }
    if (banner) banner.remove();
  }

  function removeTermsBanner() {
    var existing = document.querySelector('.kq-terms-notice');
    if (existing) existing.remove();
  }

  function renderTermsBanner(notice) {
    if (!notice || !notice.active || !notice.version) return;
    if (isTermsDismissed(notice.version)) return;

    removeTermsBanner();
    var lang = detectLang();
    var copy = TERMS_COPY[lang] || TERMS_COPY.de;
    var dateLabel = notice.effectiveDate || '—';
    var banner = document.createElement('aside');
    banner.className = 'kq-terms-notice';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-label', copy.aria);
    banner.innerHTML =
      '<p class="kq-terms-notice__text">' +
        copy.body.replace('{date}', dateLabel) +
        ' <a href="/nutzungsbedingungen/">' + copy.link + '</a>.' +
      '</p>' +
      '<button type="button" class="kq-terms-notice__btn" data-terms-dismiss>' +
        copy.dismiss +
      '</button>';

    document.body.insertBefore(banner, document.body.firstChild);
    banner.querySelector('[data-terms-dismiss]')?.addEventListener('click', function () {
      dismissTerms(banner, notice.version);
    });
  }

  function loadTermsNotice() {
    var url = assetUrl('/src/data/termsNotice.json');
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { renderTermsBanner(data); })
      .catch(function () { /* ignore */ });
  }

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
    if (lastFocusedBeforeBanner && typeof lastFocusedBeforeBanner.focus === 'function') {
      try { lastFocusedBeforeBanner.focus(); } catch (e) { /* ignore */ }
    }
    lastFocusedBeforeBanner = null;
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
    lastFocusedBeforeBanner = document.activeElement;
    var acceptBtn = banner.querySelector('[data-cookie-accept]');
    acceptBtn?.addEventListener('click', function () {
      dismiss(banner);
    });
    if (acceptBtn) {
      requestAnimationFrame(function () { acceptBtn.focus(); });
    }
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
    function boot() {
      loadTermsNotice();
      renderBanner();
    }
    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
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
