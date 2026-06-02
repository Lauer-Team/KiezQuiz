/* KiezQuiz — Light/Dark theme (Papier/Tinte). Separate from save data. */
(function () {
  const KEY = 'kiezquiz_theme';
  const DEFAULT = 'dark';

  function getTheme() {
    try {
      return localStorage.getItem(KEY) || DEFAULT;
    } catch (_) {
      return DEFAULT;
    }
  }

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
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

  function setTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, t); } catch (_) { /* ignore */ }
    applyTheme(t);
    window.dispatchEvent(new CustomEvent('kiezthemechange', { detail: { theme: t } }));
    return t;
  }

  function toggleTheme() {
    return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  window.kiezTheme = { getTheme, setTheme, toggleTheme, applyTheme };

  applyTheme(getTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme(getTheme()));
  }
})();
