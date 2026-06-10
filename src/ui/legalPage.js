/* KiezQuiz — Impressum, Datenschutz, Nutzungsbedingungen, Lizenzen */
(function () {
  var PAGE_KEY = document.body.dataset.legalPage || '';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderOperatorAddress() {
    var cfg = window.KIEZ_LEGAL && window.KIEZ_LEGAL.operator ? window.KIEZ_LEGAL.operator : {};
    var name = cfg.name || '';
    var email = cfg.email ? '<a href="mailto:' + escapeHtml(cfg.email) + '">' + escapeHtml(cfg.email) + '</a>' : '';
    var phone = cfg.phone
      ? '<br><a href="tel:' + escapeHtml(cfg.phone.replace(/\s/g, '')) + '">' + escapeHtml(cfg.phone) + '</a>'
      : '';
    var hasAddress = !!(cfg.street && cfg.postalCode && cfg.city);
    var addressLines = hasAddress
      ? escapeHtml(cfg.street) + '<br>' + escapeHtml(cfg.postalCode) + ' ' + escapeHtml(cfg.city) + '<br>' + escapeHtml(cfg.country || '')
      : '';
    var missing = hasAddress
      ? ''
      : '<span class="legal-missing-address">' + escapeHtml(t('legalPages.addressMissing')) + '</span>';
    return '<p class="legal-operator-block"><strong>' + escapeHtml(name) + '</strong><br>' +
      (addressLines ? addressLines + '<br>' : '') +
      email + phone + missing + '</p>';
  }

  function renderLicenseTable(items, labelPurpose, labelLicense) {
    if (!items || !items.length) return '';
    var rows = items.map(function (item) {
      var purpose = t('legalPages.licenses.components.' + item.id);
      var licenseLink = item.licenseUrl
        ? '<a href="' + escapeHtml(item.licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.license) + '</a>'
        : escapeHtml(item.license);
      var projectLink = item.projectUrl
        ? '<a href="' + escapeHtml(item.projectUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.name) + '</a>'
        : escapeHtml(item.name);
      var version = item.version ? ' <span class="legal-license-version">(' + escapeHtml(item.version) + ')</span>' : '';
      return '<tr>' +
        '<td>' + projectLink + version + '</td>' +
        '<td>' + purpose + '</td>' +
        '<td>' + licenseLink + '</td>' +
        '<td>' + escapeHtml(item.delivery || '') + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="legal-license-table-wrap"><table class="legal-license-table">' +
      '<thead><tr>' +
      '<th scope="col">' + escapeHtml(t('legalPages.licenses.tableComponent')) + '</th>' +
      '<th scope="col">' + escapeHtml(labelPurpose) + '</th>' +
      '<th scope="col">' + escapeHtml(labelLicense) + '</th>' +
      '<th scope="col">' + escapeHtml(t('legalPages.licenses.tableDelivery')) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderLicensesPage() {
    var data = window.KIEZ_OSS_LICENSES || {};
    var intro = t('legalPages.licenses.intro');
    var introHtml = Array.isArray(intro)
      ? intro.map(function (p) { return '<p>' + p + '</p>'; }).join('')
      : '';

    var runtime = renderLicenseTable(
      data.runtime,
      t('legalPages.licenses.tablePurpose'),
      t('legalPages.licenses.tableLicense')
    );
    var fonts = renderLicenseTable(
      data.fonts,
      t('legalPages.licenses.tablePurpose'),
      t('legalPages.licenses.tableLicense')
    );
    var dev = renderLicenseTable(
      data.development,
      t('legalPages.licenses.tablePurpose'),
      t('legalPages.licenses.tableLicense')
    );

    var sections = t('legalPages.licenses.sections');
    var extra = '';
    if (Array.isArray(sections)) {
      extra = sections.map(function (section) {
        var title = section && section.title ? '<h2>' + escapeHtml(section.title) + '</h2>' : '';
        var body = '';
        if (section && Array.isArray(section.paragraphs)) {
          body = section.paragraphs.map(function (para) {
            return '<p>' + para + '</p>';
          }).join('');
        }
        if (section && Array.isArray(section.list)) {
          body += '<ul>' + section.list.map(function (item) {
            return '<li>' + item + '</li>';
          }).join('') + '</ul>';
        }
        return '<section class="legal-section kq-card">' + title + body + '</section>';
      }).join('');
    }

    return '<section class="legal-section kq-card">' + introHtml + '</section>' +
      '<section class="legal-section kq-card"><h2>' + escapeHtml(t('legalPages.licenses.runtimeTitle')) + '</h2>' + runtime + '</section>' +
      '<section class="legal-section kq-card"><h2>' + escapeHtml(t('legalPages.licenses.fontsTitle')) + '</h2>' + fonts + '</section>' +
      '<section class="legal-section kq-card"><h2>' + escapeHtml(t('legalPages.licenses.devTitle')) + '</h2>' + dev + '</section>' +
      extra;
  }

  function renderSections(pageKey) {
    var rootKey = 'legalPages.' + pageKey + '.sections';
    var sections = t(rootKey);
    if (!Array.isArray(sections)) return '';

    return sections.map(function (section) {
      var title = section && section.title ? '<h2>' + escapeHtml(section.title) + '</h2>' : '';
      var body = '';
      if (section && Array.isArray(section.paragraphs)) {
        body = section.paragraphs.map(function (para) {
          if (typeof para !== 'string') return '';
          if (para === '{{operator}}') return renderOperatorAddress();
          return '<p>' + para + '</p>';
        }).join('');
      }
      if (section && Array.isArray(section.list)) {
        body += '<ul>' + section.list.map(function (item) {
          return '<li>' + item + '</li>';
        }).join('') + '</ul>';
      }
      if (section && Array.isArray(section.afterList)) {
        body += section.afterList.map(function (para) {
          return '<p>' + para + '</p>';
        }).join('');
      }
      return '<section class="legal-section kq-card">' + title + body + '</section>';
    }).join('');
  }

  function renderFooterNav() {
    return '<nav class="legal-footer-nav" aria-label="' + escapeHtml(t('legalPages.navLabel')) + '">' +
      '<a href="/datenschutz/">' + escapeHtml(t('footer.privacyLink')) + '</a>' +
      '<a href="/impressum/">' + escapeHtml(t('footer.imprintLink')) + '</a>' +
      '<a href="/nutzungsbedingungen/">' + escapeHtml(t('footer.termsLink')) + '</a>' +
      '<a href="/lizenzen/">' + escapeHtml(t('footer.licensesLink')) + '</a>' +
      '<a href="/barrierefreiheit/">' + escapeHtml(t('footer.accessibilityLink')) + '</a>' +
      '<button type="button" class="footer-legal-btn" data-cookie-settings>' + escapeHtml(t('footer.cookieSettings')) + '</button>' +
      '<a href="/about/">' + escapeHtml(t('footer.about')) + '</a>' +
      '</nav>';
  }

  function renderContent() {
    var mount = document.getElementById('legal-content');
    if (!mount || !PAGE_KEY) return;
    var body = PAGE_KEY === 'licenses' ? renderLicensesPage() : renderSections(PAGE_KEY);
    mount.innerHTML = body + renderFooterNav() +
      '<a href="/" class="legal-back-link">' + escapeHtml(t('legalPages.backHome')) + '</a>';
  }

  function syncUpdated() {
    var el = document.getElementById('legal-updated');
    if (!el) return;
    var cfg = window.KIEZ_LEGAL || {};
    var lang = (typeof getLocale === 'function' ? getLocale() : 'de');
    var date = (lang === 'en' && cfg.lastUpdatedEn) ? cfg.lastUpdatedEn : (cfg.lastUpdated || '');
    el.textContent = t('legalPages.updated', { date: date });
  }

  function refreshPage() {
    applyPageMeta('legalPages.' + PAGE_KEY);
    applyToDom();
    syncUpdated();
    renderContent();
  }

  async function boot() {
    await initI18n();
    refreshPage();

    window.addEventListener('kiezthemechange', function () {
      document.querySelectorAll('.legal-app-shell, .legal-shell.kq').forEach(function (el) {
        el.dataset.theme = window.kiezTheme?.getTheme?.() || 'dark';
      });
    });

    onLocaleChange(function () {
      refreshPage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
