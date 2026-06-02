/* KiezQuiz — CI mode & UI icons (inline SVG, currentColor) */
(function () {
  const ModeIcon = {
    EXPLORER: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7l2 5-2 5-2-5z" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    LOCATE: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6"/><line x1="15" y1="15" x2="20" y2="20"/><circle cx="10.5" cy="10.5" r="1.6"/></g></svg>',
    QUIZ: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></g></svg>',
    TYPE_NAME: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="11" rx="2"/><line x1="6" y1="11" x2="6.1" y2="11"/><line x1="10" y1="11" x2="10.1" y2="11"/><line x1="14" y1="11" x2="14.1" y2="11"/><line x1="18" y1="11" x2="18.1" y2="11"/><line x1="8" y1="14.5" x2="16" y2="14.5"/></g></svg>',
    NAME_ALL: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="7"/><line x1="12" y1="14" x2="12" y2="9.5"/><line x1="10" y1="3" x2="14" y2="3"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="18.5" y1="8.5" x2="20" y2="7"/></g></svg>'
  };

  const Ico = {
    flame: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.7-2.4C8 9 8 11 9 11c0-2 1.5-3 1.5-5C10.5 4.5 11.3 3 12 2z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M10 14h4M9 20h6M12 14v6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 2.6V2.5a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.4 1.4 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l11-7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6-6 6 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>'
  };

  const QPIN_SVG = '<svg viewBox="0 0 100 124" class="pin" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M50 4 C25.7 4 6 23.7 6 48 C6 80 50 120 50 120 C50 120 94 80 94 48 C94 23.7 74.3 4 50 4 Z M50 30 C40 30 31.9 38.1 31.9 48.1 C31.9 58.1 40 66.2 50 66.2 C60 66.2 68.1 58.1 68.1 48.1 C68.1 38.1 60 30 50 30 Z"/><line x1="54" y1="50" x2="73" y2="69" stroke="currentColor" stroke-width="13.5" stroke-linecap="round"/></svg>';

  function wordmarkHtml(size) {
    const style = size ? ` style="font-size:${size}px"` : '';
    return `<span class="kq-wm"${style} aria-label="KiezQuiz"><span>Kiez</span>${QPIN_SVG}<span>uiz</span></span>`;
  }

  window.kiezIcons = { ModeIcon, Ico, wordmarkHtml, QPIN_SVG };
})();
