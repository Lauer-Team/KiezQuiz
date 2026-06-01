/* KiezQuiz — static hub shell (instant paint before hub.js hydrates) */
(function () {
  function ringHtml(pct, size, stroke) {
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var off = c - (pct / 100) * c;
    var fontSize = size * 0.26;
    return (
      '<div class="progress-ring" style="position:relative;width:' + size + 'px;height:' + size + 'px;flex-shrink:0">' +
      '<svg width="' + size + '" height="' + size + '" style="transform:rotate(-90deg)" aria-hidden="true">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--acc)" stroke-width="' + stroke + '"' +
      ' stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" stroke-linecap="round"/>' +
      '</svg>' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:' + fontSize + 'px;color:#fff">' + pct + '%</div>' +
      '</div>'
    );
  }

  function levelBar(label, tier, pct) {
    return (
      '<div class="hub-level-bar">' +
      '<div class="hub-level-bar-head">' +
      '<span><span class="hub-level-tier">' + tier + '</span> · ' + label + '</span>' +
      '<span class="hub-level-pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="hub-level-track"><div class="hub-level-fill" style="width:' + pct + '%"></div></div>' +
      '</div>'
    );
  }

  function tile(opts) {
    var style = Object.keys(opts.vars).map(function (k) { return k + ':' + opts.vars[k]; }).join(';');
    return (
      '<button type="button" class="city-tile is-fresh" data-city-id="' + opts.id + '" data-playable="true" style="' + style + '">' +
      '<div class="city-tile-head">' +
      ringHtml(0, 62, 6) +
      '<div class="city-tile-id">' +
      '<div class="city-tile-name">' + opts.name + (opts.home ? ' <span class="home-dot" title="Heimatstadt">★</span>' : '') + '</div>' +
      '<div class="city-tile-greet">' + opts.greet + '</div>' +
      '<div class="city-tile-blurb">' + opts.blurb + '</div>' +
      '</div>' +
      '<div class="city-tile-trophies" title="Pokale dieser Stadt"><span class="ctt-icon">🏆</span><span class="ctt-count">0/' + opts.trophies + '</span></div>' +
      '</div>' +
      '<div class="city-tile-levels">' + opts.levels + '</div>' +
      '<div class="city-tile-cta"><span>Stadt starten</span><span class="cta-arrow">→</span></div>' +
      '</button>'
    );
  }

  var HUB_SHELL_HTML =
    '<div class="city-hub" data-hub-shell="static">' +
    '<div class="hub-intro">' +
    '<h2 data-i18n="hub.title">Welche Stadt erkundest du?</h2>' +
    '<p data-i18n-html="hub.subtitle">Dein <strong>globaler Rang &amp; XP gelten überall</strong> — Stadtrang, Pokale und Freischaltungen sammelst du pro Stadt.</p>' +
    '</div>' +
    '<div class="hub-tiles">' +
    tile({
      id: 'hamburg',
      name: 'Hamburg',
      home: true,
      greet: 'Moin Moin!',
      blurb: '7 Bezirke · 104 Stadtteile',
      trophies: 11,
      vars: { '--acc-h': '205', '--acc': 'hsl(205 100% 62%)', '--acc-bright': 'hsl(205 100% 70%)', '--acc-line': 'hsl(205 90% 60% / 0.42)', '--acc-fill': 'hsl(205 95% 58% / 0.14)', '--acc-fill-soft': 'hsl(205 95% 58% / 0.07)', '--acc-glow': 'hsl(205 100% 62% / 0.40)' },
      levels: levelBar('Bezirke', 'Überblick', 0) + levelBar('Stadtteile', 'Detail', 0)
    }) +
    tile({
      id: 'berlin',
      name: 'Berlin',
      greet: 'Hallo Berlin!',
      blurb: '12 Bezirke · 97 Ortsteile',
      trophies: 16,
      vars: { '--acc-h': '38', '--acc': 'hsl(38 100% 62%)', '--acc-bright': 'hsl(38 100% 70%)', '--acc-line': 'hsl(38 90% 60% / 0.42)', '--acc-fill': 'hsl(38 95% 58% / 0.14)', '--acc-fill-soft': 'hsl(38 95% 58% / 0.07)', '--acc-glow': 'hsl(38 100% 62% / 0.40)' },
      levels: levelBar('Bezirke', 'Überblick', 0) + levelBar('Ortsteile', 'Detail', 0)
    }) +
    tile({
      id: 'frankfurt',
      name: 'Frankfurt am Main',
      greet: 'Ei gude!',
      blurb: '16 Ortsbezirke · 46 Stadtteile',
      trophies: 19,
      vars: { '--acc-h': '352', '--acc': 'hsl(352 100% 62%)', '--acc-bright': 'hsl(352 100% 70%)', '--acc-line': 'hsl(352 90% 60% / 0.42)', '--acc-fill': 'hsl(352 95% 58% / 0.14)', '--acc-fill-soft': 'hsl(352 95% 58% / 0.07)', '--acc-glow': 'hsl(352 100% 62% / 0.40)' },
      levels: levelBar('Ortsbezirke', 'Überblick', 0) + levelBar('Stadtteile', 'Detail', 0)
    }) +
    tile({
      id: 'europe',
      name: 'Europa',
      greet: 'Willkommen in Europa!',
      blurb: '44 Länder · 44 Hauptstädte',
      trophies: 57,
      vars: { '--acc-h': '145', '--acc': 'hsl(145 100% 62%)', '--acc-bright': 'hsl(145 100% 70%)', '--acc-line': 'hsl(145 90% 60% / 0.42)', '--acc-fill': 'hsl(145 95% 58% / 0.14)', '--acc-fill-soft': 'hsl(145 95% 58% / 0.07)', '--acc-glow': 'hsl(145 100% 62% / 0.40)' },
      levels: levelBar('Länder', 'Überblick', 0) + levelBar('Hauptstädte', 'Detail', 0)
    }) +
    '<button type="button" class="city-tile wish-tile" id="hub-wish-tile">' +
    '<div class="wish-plus">＋</div>' +
    '<div class="wish-title" data-i18n="hub.wishTitle">Stadt wünschen</div>' +
    '<div class="wish-sub" data-i18n="hub.wishSub">Welche Stadt sollen wir als Nächstes bauen? Stimme ab oder schlage eine neue vor.</div>' +
    '</button>' +
    '</div></div>';

  function getGame() {
    return window.kiezQuizGame || window.hamburgGame || null;
  }

  function waitForDomReady() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(function (resolve) {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  function waitForLoadScript() {
    if (window.kiezLoadScript) return Promise.resolve();
    return waitForDomReady().then(function () {
      return new Promise(function (resolve) {
        var elapsed = 0;
        var timer = setInterval(function () {
          if (window.kiezLoadScript) {
            clearInterval(timer);
            resolve();
            return;
          }
          elapsed += 25;
          if (elapsed >= 10000) {
            clearInterval(timer);
            resolve();
          }
        }, 25);
      });
    });
  }

  var bootPromise = null;

  function ensureGameReady() {
    if (getGame()) return Promise.resolve(getGame());
    if (!bootPromise) {
      bootPromise = waitForLoadScript()
        .then(function () {
          if (typeof window.loadGameCore === 'function') {
            return window.loadGameCore();
          }
          if (typeof window.loadGameBundle === 'function') {
            return window.loadGameBundle();
          }
        })
        .then(function () {
          if (!getGame() && typeof window.startKiezQuizGame === 'function') {
            window.startKiezQuizGame();
          }
          return getGame();
        })
        .finally(function () {
          bootPromise = null;
        });
    }
    return bootPromise;
  }

  function bindHubInteractions(root) {
    if (!root || root.dataset.hubShellBound === 'true') return;
    root.dataset.hubShellBound = 'true';

    root.addEventListener('click', function (e) {
      if (!root.querySelector('[data-hub-shell="static"]')) return;

      var wishTile = e.target.closest('#hub-wish-tile');
      if (wishTile) {
        e.preventDefault();
        void ensureGameReady().then(function () {
          var open = function () {
            if (window.kiezModals && window.kiezModals.showWishModal) {
              window.kiezModals.showWishModal();
            }
          };
          if (typeof window.loadGameBundle === 'function') {
            void window.loadGameBundle().then(open);
          } else {
            open();
          }
        });
        return;
      }

      var tile = e.target.closest('.city-tile[data-city-id]');
      if (!tile) return;

      var cityId = tile.dataset.cityId;
      var playable = tile.dataset.playable === 'true';
      void ensureGameReady().then(function (game) {
        if (!game) return;
        if (!playable) {
          game.showComingSoonToast(cityId);
          return;
        }
        game.enterCity(cityId);
      });
    });
  }

  function inject(container) {
    if (!container) return;
    if (!container.querySelector('[data-hub-shell="static"]')) {
      container.insertAdjacentHTML('beforeend', HUB_SHELL_HTML);
    }
    bindHubInteractions(container);
  }

  window.kiezHubShell = { inject: inject, bindHubInteractions: bindHubInteractions };
})();
