/* KiezQuiz — “Was ist neu?” changelog modal */
(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatEntryDate(dateStr) {
    if (typeof formatDate === 'function') {
      return formatDate(dateStr, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return dateStr;
  }

  function renderChangelogHtml() {
    const entries = window.kiezChangelogData?.getEntriesNewestFirst?.() || [];
    const blocks = entries.map((entry) => {
      const items = entry.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      return `
        <article class="changelog-entry">
          <header class="changelog-entry-head">
            <span class="changelog-version">v${escapeHtml(entry.version)}</span>
            <time class="changelog-date" datetime="${escapeHtml(entry.date)}">${escapeHtml(formatEntryDate(entry.date))}</time>
          </header>
          <h3 class="changelog-entry-title">${escapeHtml(entry.title)}</h3>
          <ul class="changelog-items">${items}</ul>
        </article>`;
    }).join('');

    return `
      <div class="modal-content changelog-modal-content">
        <button type="button" class="modal-x" id="btn-changelog-x" aria-label="${escapeHtml(t('changelog.close'))}">✕</button>
        <h2>${t('changelog.title')}</h2>
        <p class="changelog-intro">${t('changelog.intro')}</p>
        <div class="changelog-scroll">${blocks}</div>
        <button type="button" class="primary-btn" id="btn-changelog-close">${t('changelog.close')}</button>
      </div>`;
  }

  async function ensureModalDeps() {
    if (typeof openOverlayModal === 'function') return;
    if (typeof window.loadGameCore === 'function') {
      await window.loadGameCore();
    }
    if (typeof openOverlayModal !== 'function' && typeof window.loadGameBundle === 'function') {
      await window.loadGameBundle();
    }
    if (typeof openOverlayModal !== 'function') return false;
    return true;
  }

  let changelogOpening = false;

  async function showChangelogModal() {
    if (changelogOpening) return;
    changelogOpening = true;
    try {
      await ensureModalDeps();
      if (typeof openOverlayModal !== 'function') return;

      const modal = openOverlayModal(renderChangelogHtml(), { closeOnBackdrop: true });
      modal.querySelector('#btn-changelog-x')?.addEventListener('click', () => closeOverlayModal(modal));
      modal.querySelector('#btn-changelog-close')?.addEventListener('click', () => closeOverlayModal(modal));
    } finally {
      changelogOpening = false;
    }
  }

  function bindChangelogTriggers(root) {
    (root || document).querySelectorAll('[data-changelog-trigger]').forEach((el) => {
      if (el.dataset.changelogBound === 'true') return;
      el.dataset.changelogBound = 'true';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        void showChangelogModal();
      });
    });
  }

  window.kiezChangelog = {
    show: showChangelogModal,
    bindTriggers: bindChangelogTriggers
  };
})();
