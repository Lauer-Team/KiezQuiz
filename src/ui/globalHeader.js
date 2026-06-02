/* KiezQuiz — shared app header (#app-header): hub vs. city chrome */
(function () {
  let xpPopoverEl = null;
  let xpBound = false;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeXpPopover() {
    if (!xpPopoverEl) return;
    xpPopoverEl.remove();
    xpPopoverEl = null;
    document.getElementById('btn-xp-pill')?.setAttribute('aria-expanded', 'false');
  }

  function buildGlobalProgressHtml(game) {
    if (typeof game.renderRankLadderHtml === 'function') {
      return game.renderRankLadderHtml();
    }
    const { currentRank, nextRank, percent } = game.getRankProgressInfo();
    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');
    return `
      <p class="log-rank-current"><strong>${escapeHtml(currentRank.name)}</strong> · ${game.xp} XP</p>
      <div class="rank-xp-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
      <p class="log-rank-progress-note">${escapeHtml(progressNote)}</p>`;
  }

  function showXpPopover(game, anchor) {
    closeXpPopover();
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'xp-global-popover';
    pop.id = 'xp-global-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('header.globalRankLabel'));
    pop.innerHTML = `
      <button type="button" class="xp-global-popover-x" aria-label="${escapeHtml(t('log.close'))}">✕</button>
      <div class="xp-global-popover-head">
        <span class="log-zone-tag global">${escapeHtml(t('log.zoneGlobal'))}</span>
        <span class="log-zone-note">${escapeHtml(t('log.zoneGlobalNote'))}</span>
      </div>
      ${buildGlobalProgressHtml(game)}
      <a href="/profile/" class="xp-global-popover-profile">${escapeHtml(t('header.profileLink'))} →</a>`;

    document.body.appendChild(pop);
    xpPopoverEl = pop;

    const popRect = pop.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - popRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - popRect.width - 12));
    const top = rect.bottom + 10;
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.min(top, window.innerHeight - popRect.height - 12)}px`;

    anchor.setAttribute('aria-expanded', 'true');
    pop.querySelector('.xp-global-popover-x')?.addEventListener('click', closeXpPopover);
  }

  function bindXpPill(game) {
    const xpPill = document.getElementById('btn-xp-pill');
    if (!xpPill || xpBound) return;
    xpBound = true;

    xpPill.addEventListener('click', (e) => {
      if (game.view !== 'hub') return;
      e.preventDefault();
      if (xpPopoverEl) {
        closeXpPopover();
        return;
      }
      showXpPopover(game, xpPill);
    });
  }

  function sync(game) {
    if (!game) return;

    const historyBtn = document.getElementById('btn-history');
    if (historyBtn) {
      const onHub = game.view === 'hub';
      historyBtn.hidden = onHub;
      historyBtn.setAttribute('aria-hidden', onHub ? 'true' : 'false');
    }

    const xpPill = document.getElementById('btn-xp-pill');
    if (xpPill) {
      const onHub = game.view === 'hub';
      xpPill.classList.toggle('xp-pill--hub', onHub);
      if (onHub) {
        xpPill.setAttribute('href', '#');
        xpPill.setAttribute('role', 'button');
        xpPill.setAttribute('aria-haspopup', 'dialog');
        xpPill.dataset.i18nTitle = 'header.xpTitle';
        xpPill.title = t('header.xpTitle');
      } else {
        closeXpPopover();
        xpPill.setAttribute('href', '/profile/');
        xpPill.removeAttribute('role');
        xpPill.removeAttribute('aria-haspopup');
        xpPill.removeAttribute('aria-expanded');
        xpPill.dataset.i18nTitle = 'header.profileTitle';
        xpPill.title = t('header.profileTitle');
      }
    }

    bindXpPill(game);
  }

  if (!document.documentElement.dataset.kqXpPopoverBound) {
    document.documentElement.dataset.kqXpPopoverBound = 'true';
    document.addEventListener('click', (e) => {
      if (!xpPopoverEl) return;
      if (e.target.closest('#btn-xp-pill') || e.target.closest('#xp-global-popover')) return;
      closeXpPopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && xpPopoverEl) closeXpPopover();
    });
  }

  window.kiezGlobalHeader = {
    renderHubHeader: function () {
      return '';
    },
    sync,
    closeXpPopover
  };
})();
