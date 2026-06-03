/* KiezQuiz — Light/Dark theme (Papier/Tinte). Separate from save data. */
(function () {
  const KEY_AUTO = 'kiezquiz_theme_auto';
  const KEY_MANUAL = 'kiezquiz_theme';
  const KEY_ROLLOUT_AUTO = 'kiezquiz_theme_rollout_auto';
  const LIGHT_HOUR_START = 7;
  const LIGHT_HOUR_END = 19;

  let autoRefreshTimer = null;
  let migrated = false;

  function themeFromLocalTime(date = new Date()) {
    const h = date.getHours();
    return h >= LIGHT_HOUR_START && h < LIGHT_HOUR_END ? 'light' : 'dark';
  }

  /** One-time: enable time-based theme for every existing visitor (opt-out in profile settings). */
  function migrateThemeStorage() {
    if (migrated) return;
    migrated = true;
    try {
      if (localStorage.getItem(KEY_ROLLOUT_AUTO) === '1') return;
      localStorage.setItem(KEY_AUTO, '1');
      const legacy = localStorage.getItem(KEY_MANUAL);
      if (legacy === 'auto') localStorage.removeItem(KEY_MANUAL);
      localStorage.setItem(KEY_ROLLOUT_AUTO, '1');
    } catch (_) { /* ignore */ }
  }

  function isThemeAuto() {
    migrateThemeStorage();
    try {
      return localStorage.getItem(KEY_AUTO) !== '0';
    } catch (_) {
      return true;
    }
  }

  function getManualTheme() {
    migrateThemeStorage();
    try {
      return localStorage.getItem(KEY_MANUAL) === 'light' ? 'light' : 'dark';
    } catch (_) {
      return 'dark';
    }
  }

  function resolveTheme() {
    return isThemeAuto() ? themeFromLocalTime() : getManualTheme();
  }

  /** Resolved appearance: 'light' | 'dark'. */
  function getTheme() {
    return resolveTheme();
  }

  function applyTheme(resolved) {
    const t = resolved === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
    if (document.body) document.body.dataset.theme = t;
    document.querySelectorAll('.app-shell, .about-shell, .profile-app-shell').forEach((el) => {
      el.dataset.theme = t;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'light' ? '#F1ECE0' : '#0F1118';
    window.kiezGlobalHeader?.syncBrandTheme?.();
  }

  function msUntilNextScheduleBoundary() {
    const now = new Date();
    const next = new Date(now);
    const h = now.getHours();
    if (h >= LIGHT_HOUR_START && h < LIGHT_HOUR_END) {
      next.setHours(LIGHT_HOUR_END, 0, 0, 0);
    } else if (h < LIGHT_HOUR_START) {
      next.setHours(LIGHT_HOUR_START, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(LIGHT_HOUR_START, 0, 0, 0);
    }
    return Math.max(0, next.getTime() - now.getTime());
  }

  function scheduleAutoRefresh() {
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (!isThemeAuto()) return;
    autoRefreshTimer = setTimeout(() => {
      autoRefreshTimer = null;
      applyTheme(resolveTheme());
      scheduleAutoRefresh();
    }, msUntilNextScheduleBoundary() + 50);
  }

  function emitThemeChange() {
    const resolved = resolveTheme();
    window.dispatchEvent(new CustomEvent('kiezthemechange', {
      detail: { theme: resolved, auto: isThemeAuto(), manual: getManualTheme() },
    }));
    return resolved;
  }

  function setThemeAuto(enabled) {
    migrateThemeStorage();
    try {
      if (enabled) {
        localStorage.setItem(KEY_AUTO, '1');
      } else {
        const freeze = resolveTheme();
        localStorage.setItem(KEY_AUTO, '0');
        localStorage.setItem(KEY_MANUAL, freeze);
      }
    } catch (_) { /* ignore */ }
    applyTheme(resolveTheme());
    scheduleAutoRefresh();
    return emitThemeChange();
  }

  function setManualTheme(theme) {
    if (isThemeAuto()) return getTheme();
    const t = theme === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(KEY_MANUAL, t); } catch (_) { /* ignore */ }
    applyTheme(t);
    return emitThemeChange();
  }

  window.kiezTheme = {
    getTheme,
    isThemeAuto,
    getManualTheme,
    resolveTheme,
    themeFromLocalTime,
    setThemeAuto,
    setManualTheme,
    applyTheme,
  };

  applyTheme(resolveTheme());
  scheduleAutoRefresh();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !isThemeAuto()) return;
    applyTheme(resolveTheme());
    scheduleAutoRefresh();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme(resolveTheme()));
  }
})();
