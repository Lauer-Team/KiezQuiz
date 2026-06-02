/* KiezQuiz — red admin strip in app header when logged in as admin */
(function () {
  const STRIP_CLASS = 'admin-header-strip';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getAdminHosts() {
    return [
      document.getElementById('app-header'),
      document.querySelector('.profile-topbar')
    ].filter(Boolean);
  }

  function renderStripMarkup(wishCount) {
    const countBadge = wishCount > 0
      ? `<span class="admin-header-badge">${wishCount}</span>`
      : '';

    return `
      <span class="admin-header-label">${escapeHtml(t('header.adminLoggedIn'))}</span>
      <div class="admin-header-actions">
        <a href="/admin/" class="admin-header-btn">
          ${escapeHtml(t('header.adminCityWishes'))}${countBadge}
        </a>
        <a href="/profile/" class="admin-header-btn admin-header-btn--ghost">${escapeHtml(t('header.profileLink'))}</a>
        <button type="button" class="admin-header-btn admin-header-btn--ghost" data-admin-action="changelog">
          ${escapeHtml(t('header.adminChangelog'))}
        </button>
        <button type="button" class="admin-header-btn admin-header-btn--ghost" data-admin-action="settings">
          ${escapeHtml(t('header.settingsTitle'))}
        </button>
      </div>`;
  }

  function bindStripActions(strip) {
    strip.querySelector('[data-admin-action="changelog"]')?.addEventListener('click', () => {
      window.kiezChangelog?.show?.();
    });

    strip.querySelector('[data-admin-action="settings"]')?.addEventListener('click', () => {
      const game = window.kiezQuizGame || window.hamburgGame;
      if (game?.showSettings) {
        game.showSettings();
        return;
      }
      if (typeof window.loadGameCore === 'function') {
        void window.loadGameCore().then(() => {
          (window.kiezQuizGame || window.hamburgGame)?.showSettings?.();
        });
      }
    });
  }

  async function fetchWishCount() {
    try {
      const result = await window.cityWishes?.fetchAdminList?.();
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      return rows.length;
    } catch (_) {
      return 0;
    }
  }

  async function renderAdminBar() {
    const hosts = getAdminHosts();
    if (!hosts.length) return;

    const isAdmin = await window.cityWishes?.isAdmin?.();
    document.querySelectorAll(`.${STRIP_CLASS}`).forEach((strip) => strip.remove());

    if (!isAdmin) return;

    const wishCount = await fetchWishCount();
    const markup = renderStripMarkup(wishCount);

    hosts.forEach((host) => {
      const strip = document.createElement('div');
      strip.className = STRIP_CLASS;
      strip.innerHTML = markup;
      bindStripActions(strip);
      host.appendChild(strip);
    });
  }

  function scheduleRender() {
    void renderAdminBar();
  }

  window.kiezAdminBar = { render: renderAdminBar, scheduleRender };

  document.addEventListener('DOMContentLoaded', scheduleRender);
})();
