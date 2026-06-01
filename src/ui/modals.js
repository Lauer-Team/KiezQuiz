/* KiezQuiz — Log (2 zones) + Wish modals */
(function () {
  function showLogModal(game) {
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId || 'hamburg'));
    const { currentRank, nextRank, percent } = game.getRankProgressInfo();
    const cityRankInfo = game.getCityRankProgressInfo();
    const trophyCatalog = typeof getTrophyCatalog === 'function' ? getTrophyCatalog() : [];
    const won = game.trophies.size;
    const total = trophyCatalog.length;

    const rankSteps = getRanks().map((rank) => {
      let state = 'upcoming';
      if (rank.level < game.level) state = 'passed';
      else if (rank.level === game.level) state = 'current';
      const xpHint = rank.maxXp !== Infinity ? `${rank.minXp} XP` : t('log.xpPlus', { xp: rank.minXp });
      return `
        <div class="rank-ladder-step rank-ladder-step--${state}">
          <span class="rank-ladder-dot"></span>
          <span class="rank-ladder-label">
            <span class="rank-ladder-name">${rank.name}</span>
            <span class="rank-ladder-xp">${xpHint}</span>
          </span>
        </div>`;
    }).join('');

    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');

    const cityRankKey = typeof getCityRankLocaleKey === 'function'
      ? getCityRankLocaleKey(game.activeCityId)
      : 'cityRanks';
    const cityRankSteps = getCityRanks(game.activeCityId).map((rank) => {
      let state = 'upcoming';
      if (rank.level < cityRankInfo.cityLevel) state = 'passed';
      else if (rank.level === cityRankInfo.cityLevel) state = 'current';
      const isMax = rank.level === getCityRanks(game.activeCityId).length;
      const reqDistricts = isMax ? cityRankInfo.totals.totalDistricts : Math.min(rank.minDistricts, cityRankInfo.totals.totalDistricts);
      const reqTrophies = isMax ? cityRankInfo.totals.totalTrophies : Math.min(rank.minTrophies, cityRankInfo.totals.totalTrophies);
      const reqHint = t(`${cityRankKey}.progressHint`, {
        districts: reqDistricts,
        totalDistricts: cityRankInfo.totals.totalDistricts,
        trophies: reqTrophies,
        totalTrophies: cityRankInfo.totals.totalTrophies
      });
      return `
        <div class="rank-ladder-step rank-ladder-step--${state}">
          <span class="rank-ladder-dot"></span>
          <span class="rank-ladder-label">
            <span class="rank-ladder-name">${rank.name}</span>
            <span class="rank-ladder-xp">${reqHint}</span>
          </span>
        </div>`;
    }).join('');

    const cityProgressNote = cityRankInfo.nextRank
      ? t(`${cityRankKey}.progressTo`, { percent: Math.round(cityRankInfo.percent), name: cityRankInfo.nextRank.name })
      : t(`${cityRankKey}.maxReached`);

    const trophyTiles = trophyCatalog.map((tr) => {
      const earned = game.trophies.has(tr.id);
      return `
        <div class="trophy-tile ${earned ? 'trophy-tile--earned' : 'trophy-tile--locked'}" title="${tr.desc}">
          <span class="trophy-icon">${tr.icon}</span>
          <span class="trophy-name">${tr.name}</span>
        </div>`;
    }).join('');

    const history = game.loadGameHistory();
    let listHtml;
    if (history.length === 0) {
      listHtml = `<p class="log-empty-hint">${t('log.emptyHistory')}</p>`;
    } else {
      listHtml = `<div class="game-history-list">${history.map((item) => {
        const date = new Date(item.date);
        const dateStr = formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = formatTime(date, { hour: '2-digit', minute: '2-digit' });
        const scoreColor = item.percent >= 75 ? 'var(--color-correct)' : 'var(--color-incorrect)';
        const districts = item.districts?.length ? item.districts.join(', ') : '—';
        const durationHtml = item.durationSec != null
          ? `<div class="gh-duration">⏱ ${game.formatDuration(item.durationSec)}</div>` : '';
        return `
          <div class="game-history-item">
            <div class="gh-date">${dateStr} · ${timeStr}</div>
            <div class="gh-mode">${game.getModeDisplayName(item.mode, item.segment)}${item.segment === 'BEZIRKE' ? t('log.bezirkeSegment') : ''}</div>
            <div class="gh-districts">${districts}</div>
            <div class="gh-score" style="color:${scoreColor}">${item.correct} / ${item.total} (${item.percent}%)</div>
            ${durationHtml}
          </div>`;
      }).join('')}</div>`;
    }

    const accentStyle = Object.entries(window.cityRegistry.accentVars(city.hue))
      .map(([k, v]) => `${k}:${v}`).join(';');

    const modal = openOverlayModal(`
      <div class="modal-content log-modal-content">
        <button type="button" class="modal-x" id="btn-log-x">✕</button>
        <h2>${t('log.title')}</h2>
        <p class="log-modal-intro">${t('log.intro')}</p>

        <div class="log-zone log-zone-global">
          <div class="log-zone-head">
            <span class="log-zone-tag global">${t('log.zoneGlobal')}</span>
            <span class="log-zone-note">${t('log.zoneGlobalNote')}</span>
          </div>
          <p class="log-rank-current">${t('log.yourGlobalRank')}: <strong style="color:var(--color-xp)">${currentRank.name}</strong> · ${game.xp} XP</p>
          <div class="rank-ladder">${rankSteps}</div>
          <div class="rank-xp-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
          <p class="log-rank-progress-note">${progressNote}</p>
          <div class="log-xp-hints">
            <p class="log-xp-hint">${t('log.xpHint1')}</p>
            <p class="log-xp-hint">${t('log.xpHint2')}</p>
          </div>
        </div>

        <div class="log-zone log-zone-city" style="${accentStyle}">
          <div class="log-zone-head">
            <span class="log-zone-tag city">${city.name}</span>
            <span class="log-zone-note">${t('log.zoneCityNote', { won, total })}</span>
          </div>
          <p class="log-rank-current">${t(`${cityRankKey}.yourRank`)}: <strong style="color:var(--acc-bright)">${cityRankInfo.currentRank.name}</strong></p>
          <div class="rank-ladder rank-ladder-city">${cityRankSteps}</div>
          <div class="rank-xp-bar rank-city-bar"><div class="rank-xp-bar-fill" style="width:${cityRankInfo.percent}%"></div></div>
          <p class="log-rank-progress-note">${cityProgressNote}</p>
          <div class="trophy-gallery">${trophyTiles}</div>
          <p class="log-city-note">${t('log.cityNote')}</p>
        </div>

        <div class="log-history-section">
          <h3 class="log-section-title">${t('log.historyTitle')}</h3>
          ${listHtml}
        </div>
        <button type="button" class="primary-btn" id="btn-history-close">${t('log.close')}</button>
      </div>
    `, { closeOnBackdrop: true });

    document.getElementById('btn-log-x')?.addEventListener('click', () => closeOverlayModal(modal));
    document.getElementById('btn-history-close')?.addEventListener('click', () => closeOverlayModal(modal));
  }

  async function showWishModal() {
    let votes = await window.cityWishes?.fetchTotals?.() || {};

    function renderVoteList() {
      const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const max = Math.max(...Object.values(votes), 1);
      return sorted.map(([name, count]) => `
        <button type="button" class="wish-vote-item" data-vote="${name}">
          <div class="wvi-bar" style="width:${(count / max) * 100}%"></div>
          <span class="wvi-name">${name}</span>
          <span class="wvi-count">${count.toLocaleString(getLocale())}</span>
          <span class="wvi-action">${t('hub.wishVote')}</span>
        </button>`).join('');
    }

    const modal = openOverlayModal(`
      <div class="modal-content">
        <button type="button" class="modal-x" id="btn-wish-x">✕</button>
        <h2>${t('hub.wishModalTitle')}</h2>
        <p>${t('hub.wishModalBody')}</p>
        <div class="wish-vote-list" id="wish-vote-list">${renderVoteList()}</div>
        <div class="wish-propose">
          <input class="text-input-field" id="wish-proposal-input" placeholder="${t('hub.wishPlaceholder')}" />
          <button type="button" class="primary-btn wish-submit-btn" id="btn-wish-propose">${t('hub.wishSubmit')}</button>
        </div>
        <div class="wish-thanks" id="wish-thanks" hidden>${t('hub.wishThanks')}</div>
      </div>
    `, { closeOnBackdrop: true });

    const listEl = modal.querySelector('#wish-vote-list');
    const refresh = () => { listEl.innerHTML = renderVoteList(); bindVotes(); };

    async function castVote(name, type = 'vote') {
      const result = await window.cityWishes?.submitWish?.(name, type);
      if (!result?.ok) return;
      votes = result.votes || votes;
      refresh();
      const thanks = modal.querySelector('#wish-thanks');
      if (thanks) {
        thanks.hidden = false;
        setTimeout(() => { thanks.hidden = true; }, 2200);
      }
    }

    function bindVotes() {
      listEl.querySelectorAll('[data-vote]').forEach((btn) => {
        btn.addEventListener('click', () => castVote(btn.dataset.vote, 'vote'));
      });
    }
    bindVotes();

    modal.querySelector('#btn-wish-x')?.addEventListener('click', () => closeOverlayModal(modal));
    modal.querySelector('#btn-wish-propose')?.addEventListener('click', () => {
      const input = modal.querySelector('#wish-proposal-input');
      const n = input?.value?.trim();
      if (!n) return;
      castVote(n, 'proposal').then(() => { if (input) input.value = ''; });
    });
    modal.querySelector('#wish-proposal-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modal.querySelector('#btn-wish-propose')?.click();
    });
  }

  async function showWishAdminModal() {
    window.location.assign('/admin/');
  }

  window.kiezModals = { showLogModal, showWishModal, showWishAdminModal };
})();
