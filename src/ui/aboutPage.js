/* KiezQuiz — /about/ page chrome (shared landing header) */
(function () {
  function calculateGlobalLevel(xp) {
    let level = 1;
    for (const rank of getRanks()) {
      if (xp >= rank.minXp) level = rank.level;
    }
    return level;
  }

  function updateHeaderStatsFromSave() {
    const save = window.saveManager?.loadSave?.();
    if (!save) return;
    const xp = parseInt(save.global?.xp, 10) || 0;
    const streak = parseInt(save.global?.streak, 10) || 0;
    const bestStreak = parseInt(save.global?.bestStreak, 10) || 0;
    const level = calculateGlobalLevel(xp);
    const currentRank = getRanks().find((r) => r.level === level) || getRanks()[0];
    const nextRank = getRanks().find((r) => r.level === level + 1);

    const xpVal = document.getElementById('stat-xp');
    const streakVal = document.getElementById('stat-streak');
    const bestStreakVal = document.getElementById('stat-best-streak');
    const rankName = document.getElementById('stat-rank');
    const progFill = document.getElementById('progress-fill');
    const xpPill = document.getElementById('btn-xp-pill');

    if (xpVal) xpVal.textContent = formatNumber(xp);
    if (streakVal) streakVal.textContent = `${streak}x`;
    if (bestStreakVal) bestStreakVal.textContent = t('header.streakBest', { count: bestStreak });
    if (rankName) rankName.textContent = currentRank.name;

    let pct = 100;
    if (nextRank && currentRank) {
      const span = nextRank.minXp - currentRank.minXp;
      pct = span > 0 ? Math.min(100, ((xp - currentRank.minXp) / span) * 100) : 0;
    }
    if (xpPill) {
      xpPill.style.setProperty('--xp-rank-pct', `${pct}%`);
      xpPill.title = nextRank
        ? t('ranks.progressTo', { percent: Math.round(pct), name: nextRank.name, xp: nextRank.minXp })
        : t('ranks.maxReached');
    }
    if (progFill) progFill.style.width = `${pct}%`;
  }

  function syncLangButton() {
    const btn = document.getElementById('btn-lang');
    if (!btn || typeof getLocale !== 'function') return;
    btn.textContent = getLocale() === 'de' ? '🇩🇪' : '🇬🇧';
    const titleKey = getLocale() === 'de' ? 'header.langSwitchToEn' : 'header.langSwitchToDe';
    btn.dataset.i18nTitle = titleKey;
    btn.title = t(titleKey);
  }

  function syncMuteButton() {
    const btn = document.getElementById('btn-mute');
    if (!btn) return;
    const muted = localStorage.getItem('hamburg_muted') === 'true';
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.classList.toggle('is-muted', muted);
    btn.title = t('header.soundTitle');
  }

  function openSettingsModal() {
    const chain = typeof window.loadGameCore === 'function'
      ? window.loadGameCore()
      : Promise.resolve();
    chain.then(() => {
      if (!window.kiezQuizGame && typeof KiezQuizGame === 'function') {
        window.kiezQuizGame = new KiezQuizGame();
        window.hamburgGame = window.kiezQuizGame;
      }
      window.kiezQuizGame?.showSettings?.();
    });
  }

  function bindHeaderControls() {
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn && !themeBtn.dataset.kqThemeBound) {
      themeBtn.dataset.kqThemeBound = 'true';
      themeBtn.addEventListener('click', () => window.kiezTheme?.toggleTheme?.());
    }

    const langBtn = document.getElementById('btn-lang');
    if (langBtn && langBtn.dataset.kqLangBound !== 'true') {
      langBtn.dataset.kqLangBound = 'true';
      langBtn.addEventListener('click', () => {
        if (typeof setLocale === 'function') {
          setLocale(getLocale() === 'de' ? 'en' : 'de');
        }
      });
    }

    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn && muteBtn.dataset.kqMuteBound !== 'true') {
      muteBtn.dataset.kqMuteBound = 'true';
      muteBtn.addEventListener('click', () => {
        const nextMuted = localStorage.getItem('hamburg_muted') !== 'true';
        localStorage.setItem('hamburg_muted', nextMuted ? 'true' : 'false');
        syncMuteButton();
      });
    }

    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn && !settingsBtn.dataset.kqSettingsBound) {
      settingsBtn.dataset.kqSettingsBound = 'true';
      settingsBtn.addEventListener('click', openSettingsModal);
    }
  }

  function syncTheme() {
    const theme = window.kiezTheme?.getTheme?.() || 'dark';
    document.querySelectorAll('.about-app-shell, .about-shell.kq').forEach((el) => {
      el.dataset.theme = theme;
    });
    window.kiezGlobalHeader?.syncBrandTheme?.();
  }

  function initAboutChrome() {
    window.kiezGlobalHeader?.renderStaticChrome?.();
    window.kiezGlobalHeader?.syncBrandTheme?.();
    window.kiezChangelog?.bindTriggers?.(document);
    window.kiezHubScrollTop?.bind?.();
    bindHeaderControls();
    syncLangButton();
    syncMuteButton();
    syncTheme();
    updateHeaderStatsFromSave();
  }

  async function boot() {
    window.loadGameCore = function () {
      if (window.KiezQuizGame) return Promise.resolve();
      const urls = [
        '../src/game/SoundManager.js',
        '../src/game/effects.js',
        '../src/game/MapNavigator.js',
        '../src/game/KiezQuizGame.js'
      ];
      return window.kiezLoadScript.loadScripts(urls);
    };

    await initI18n();
    applyPageMeta('aboutPage');
    applyToDom();
    initAboutChrome();

    window.authManager = new AuthManager(window.SUPABASE_CONFIG || {});
    const aboutGameStub = {
      view: 'hub',
      activeCityId: 'hamburg',
      reRenderCurrentView() {
        updateHeaderStatsFromSave();
        window.kiezGlobalHeader?.renderStaticChrome?.();
      }
    };
    Object.defineProperty(aboutGameStub, '_save', {
      get() { return window.saveManager.loadSave(); },
      set(v) { if (v) window.saveManager.persistSave(v); }
    });
    window.cloudSync = new CloudSync(window.authManager, aboutGameStub);

    window.authManager.onAuthChange(async (user) => {
      window.authManager.updateHeaderUI();
      window.kiezAdminBar?.scheduleRender?.();
      if (user) await window.cloudSync.handleLoginMerge();
      updateHeaderStatsFromSave();
      window.kiezGlobalHeader?.renderStaticChrome?.();
    });

    try {
      await window.authManager.init();
      window.authManager.initUI();
      window.kiezAdminBar?.scheduleRender?.();
    } catch (err) {
      console.warn('About auth startup failed:', err);
      window.authManager.initUI();
      window.kiezAdminBar?.scheduleRender?.();
    }

    updateHeaderStatsFromSave();
    window.kiezGlobalHeader?.renderStaticChrome?.();

    window.addEventListener('kiezthemechange', () => {
      syncTheme();
      window.kiezGlobalHeader?.renderStaticChrome?.();
    });

    onLocaleChange(() => {
      applyPageMeta('aboutPage');
      applyToDom();
      initAboutChrome();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
