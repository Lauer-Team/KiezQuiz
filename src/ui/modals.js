/* KiezQuiz — Log (2 zones) + Wish modals */
(function () {
  function showTrophyDetail(trophy, earned) {
    const statusLabel = earned ? t('trophyDetail.earned') : t('trophyDetail.locked');
    const statusClass = earned ? 'trophy-detail--earned' : 'trophy-detail--locked';
    const modal = openOverlayModal(`
      <div class="modal-content trophy-detail-modal ${statusClass}">
        <button type="button" class="modal-x" id="btn-trophy-x">✕</button>
        <div class="trophy-detail-icon">${trophy.icon}</div>
        <h2 class="trophy-detail-name">${trophy.name}</h2>
        <span class="trophy-detail-status">${statusLabel}</span>
        <p class="trophy-detail-label">${t('trophyDetail.howToEarn')}</p>
        <p class="trophy-detail-desc">${trophy.desc}</p>
        <button type="button" class="primary-btn" id="btn-trophy-close">${t('trophyDetail.close')}</button>
      </div>
    `, { closeOnBackdrop: true });

    document.getElementById('btn-trophy-x')?.addEventListener('click', () => closeOverlayModal(modal));
    document.getElementById('btn-trophy-close')?.addEventListener('click', () => closeOverlayModal(modal));
  }

  function bindTrophyClicks(container, game) {
    if (!container || !game) return;
    container.querySelectorAll('[data-trophy-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.trophyId;
        const catalog = typeof getTrophyCatalog === 'function'
          ? getTrophyCatalog(game.activeCityId)
          : [];
        const trophy = catalog.find((tr) => tr.id === id);
        if (trophy) showTrophyDetail(trophy, game.trophies.has(id));
      });
    });
  }

  function showLogModal(game, { globalOnly = false, cityOnly = false } = {}) {
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId || 'hamburg'));
    const { currentRank, nextRank, percent } = cityOnly
      ? { currentRank: null, nextRank: null, percent: 0 }
      : game.getRankProgressInfo();
    const cityRankInfo = game.getCityRankProgressInfo();
    const trophyCatalog = typeof getTrophyCatalog === 'function' ? getTrophyCatalog(game.activeCityId) : [];
    const won = game.trophies.size;
    const total = trophyCatalog.length;

    const rankSteps = cityOnly ? '' : getRanks().map((rank) => {
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

    const progressNote = cityOnly ? '' : (nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached'));

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
        <button type="button" class="trophy-tile ${earned ? 'trophy-tile--earned' : 'trophy-tile--locked'}" data-trophy-id="${tr.id}" aria-label="${tr.name}">
          <span class="trophy-icon">${tr.icon}</span>
          <span class="trophy-name">${tr.name}</span>
        </button>`;
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

    const cityZoneHtml = globalOnly ? '' : `
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
          ${cityOnly ? '' : `<p class="log-city-note">${t('log.cityNote')}</p>`}
        </div>`;

    const historySectionHtml = (globalOnly || cityOnly) ? '' : `
        <div class="log-history-section">
          <h3 class="log-section-title">${t('log.historyTitle')}</h3>
          ${listHtml}
        </div>`;

    const introHtml = cityOnly
      ? `<p class="log-modal-intro">${t('log.introCityOnly', { city: city.name })}</p>`
      : globalOnly
        ? `<p class="log-modal-intro">${t('log.introGlobalOnly')}</p>`
        : `<p class="log-modal-intro">${t('log.intro')}</p>`;

    const modalTitle = cityOnly ? t('log.titleCity') : t('log.title');
    const modalModifier = globalOnly
      ? ' log-modal-content--global-only'
      : cityOnly
        ? ' log-modal-content--city-only'
        : '';

    const globalZoneHtml = cityOnly ? '' : `
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
        </div>`;

    const modal = openOverlayModal(`
      <div class="modal-content log-modal-content${modalModifier}">
        <button type="button" class="modal-x" id="btn-log-x">✕</button>
        <h2>${modalTitle}</h2>
        ${introHtml}
        ${globalZoneHtml}
        ${cityZoneHtml}
        ${historySectionHtml}
        <button type="button" class="primary-btn" id="btn-history-close">${t('log.close')}</button>
      </div>
    `, { closeOnBackdrop: true });

    document.getElementById('btn-log-x')?.addEventListener('click', () => closeOverlayModal(modal));
    document.getElementById('btn-history-close')?.addEventListener('click', () => closeOverlayModal(modal));
    if (!globalOnly) bindTrophyClicks(modal.querySelector('.trophy-gallery'), game);
  }

  async function showWishModal() {
    let votes = await window.cityWishes?.fetchTotals?.() || {};
    let cooldowns = await window.cityWishes?.fetchCooldowns?.() || {};

    function renderVoteList() {
      const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const max = Math.max(...Object.values(votes), 1);
      return sorted.map(([name, count]) => {
        const blocked = window.cityWishes?.isOnCooldown?.(cooldowns, name);
        const action = blocked ? t('hub.wishVoted') : t('hub.wishVote');
        const votedClass = blocked ? ' wish-vote-item--voted' : '';
        const cooldownAttr = blocked ? ' data-on-cooldown="true"' : '';
        return `
        <button type="button" class="wish-vote-item${votedClass}" data-vote="${name}"${cooldownAttr}>
          <div class="wvi-bar" style="width:${(count / max) * 100}%"></div>
          <span class="wvi-name">${name}</span>
          <span class="wvi-count">${count.toLocaleString(getLocale())}</span>
          <span class="wvi-action">${action}</span>
        </button>`;
      }).join('');
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
        <div class="wish-cooldown-msg" id="wish-cooldown-msg" hidden role="alert" aria-live="polite"></div>
      </div>
    `, { closeOnBackdrop: true });

    const listEl = modal.querySelector('#wish-vote-list');
    const cooldownMsg = modal.querySelector('#wish-cooldown-msg');
    const refresh = () => { listEl.innerHTML = renderVoteList(); };

    function formatWishCooldownRemaining(nextVoteAt) {
      const ms = Math.max(0, new Date(nextVoteAt).getTime() - Date.now());
      const hours = Math.floor(ms / 3600000);
      const mins = Math.max(1, Math.ceil((ms % 3600000) / 60000));
      if (hours > 0 && mins > 0 && mins < 60) {
        return t('hub.wishCooldownRemainingHM', { hours, mins });
      }
      if (hours > 0) return t('hub.wishCooldownRemainingH', { hours });
      return t('hub.wishCooldownRemainingM', { mins });
    }

    function showCooldownNotice(cityName) {
      if (!cooldownMsg) return;
      const entry = window.cityWishes?.getCooldownEntry?.(cooldowns, cityName);
      const nextVoteAt = entry?.nextVoteAt;
      const remaining = nextVoteAt ? formatWishCooldownRemaining(nextVoteAt) : t('hub.wishCooldownRemainingFallback');
      const nextTime = nextVoteAt
        ? `${formatDate(nextVoteAt, { day: 'numeric', month: 'short' })}, ${formatTime(nextVoteAt, { hour: '2-digit', minute: '2-digit' })}`
        : '';
      const msgKey = nextTime ? 'hub.wishCooldown' : 'hub.wishCooldownShort';
      cooldownMsg.textContent = t(msgKey, {
        city: entry?.cityName || cityName,
        remaining,
        nextTime
      });
      cooldownMsg.hidden = false;
      cooldownMsg.classList.add('wish-cooldown-msg--visible');
      clearTimeout(showCooldownNotice._hideTimer);
      showCooldownNotice._hideTimer = setTimeout(() => {
        cooldownMsg.hidden = true;
        cooldownMsg.classList.remove('wish-cooldown-msg--visible');
      }, 6000);
    }

    async function castVote(name, type = 'vote') {
      if (window.cityWishes?.isOnCooldown?.(cooldowns, name)) {
        showCooldownNotice(name);
        return;
      }
      const result = await window.cityWishes?.submitWish?.(name, type);
      if (!result?.ok) {
        if (result?.reason === 'cooldown') {
          cooldowns = result.cooldowns || cooldowns;
          if (result.cityName) {
            const key = window.cityWishes.normalizeCityKey(result.cityName);
            cooldowns[key] = { cityName: result.cityName, nextVoteAt: result.nextVoteAt };
          }
          refresh();
          showCooldownNotice(result.cityName || name);
        }
        return;
      }
      votes = result.votes || votes;
      cooldowns = result.cooldowns || cooldowns;
      refresh();
      const thanks = modal.querySelector('#wish-thanks');
      if (thanks) {
        thanks.hidden = false;
        setTimeout(() => { thanks.hidden = true; }, 2200);
      }
    }

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-vote]');
      if (!btn || !listEl.contains(btn)) return;
      castVote(btn.dataset.vote, 'vote');
    });

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

  window.kiezModals = { showLogModal, showWishModal, showWishAdminModal, showTrophyDetail, bindTrophyClicks };
})();
