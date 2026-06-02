/* KiezQuiz — floating “zurück auf Anfang” on landing scroll */
(function () {
  let btn = null;
  let bound = false;

  function ensureButton() {
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'hub-scroll-top';
    btn.className = 'hub-scroll-top';
    btn.hidden = true;
    btn.setAttribute('aria-label', 'Zurück auf Anfang');
    document.body.appendChild(btn);
    return btn;
  }

  function label() {
    return typeof t === 'function' ? t('hub.scrollToTop') : 'Zurück auf Anfang';
  }

  function arrowIcon() {
    return window.kiezIcons?.Ico?.arrowUp
      || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6-6 6 6"/></svg>';
  }

  function renderButton() {
    if (!btn) return;
    btn.innerHTML = `<span class="hub-scroll-top__icon">${arrowIcon()}</span><span class="hub-scroll-top__label">${label()}</span>`;
  }

  function syncVisibility() {
    if (!btn) return;
    const game = window.kiezQuizGame || window.hamburgGame;
    const onHub = !game || game.view === 'hub';
    const onAbout = /\/about\/?$/.test(window.location.pathname);
    const scrolled = window.scrollY > 72;
    btn.hidden = !((onHub || onAbout) && scrolled);
  }

  function bind() {
    if (bound) return;
    bound = true;
    ensureButton();
    renderButton();

    window.addEventListener('scroll', syncVisibility, { passive: true });
    window.addEventListener('resize', syncVisibility, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (typeof onLocaleChange === 'function') {
      onLocaleChange(() => renderButton());
    }
  }

  window.kiezHubScrollTop = { bind, syncVisibility };
})();
