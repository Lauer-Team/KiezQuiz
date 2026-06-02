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

  function syncThemeButtonIcon() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    const icon = btn.querySelector('.theme-toggle-icon');
    const label = getTheme() === 'light' ? '☾' : '☀';
    if (icon) icon.textContent = label;
    else btn.textContent = label;
    btn.setAttribute('aria-pressed', getTheme() === 'light' ? 'true' : 'false');
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
    syncThemeButtonIcon();
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

  function bindThemeButton() {
    const btn = document.getElementById('btn-theme');
    if (!btn || btn.dataset.kqThemeBound === 'true') return;
    btn.dataset.kqThemeBound = 'true';
    if (!btn.querySelector('.theme-toggle-icon')) {
      const span = document.createElement('span');
      span.className = 'theme-toggle-icon';
      span.setAttribute('aria-hidden', 'true');
      btn.textContent = '';
      btn.appendChild(span);
    }
    syncThemeButtonIcon();
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }

  window.kiezTheme = { getTheme, setTheme, toggleTheme, applyTheme, syncThemeButtonIcon };

  applyTheme(getTheme());
  bindThemeButton();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(getTheme());
      bindThemeButton();
    });
  }
})();
