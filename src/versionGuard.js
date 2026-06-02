/**
 * Stellt sicher, dass nach einem Deploy alle /src/-Assets frisch geladen werden.
 * Spielstand in localStorage bleibt erhalten.
 */
(function () {
  'use strict';
  var STORAGE_KEY = 'kiezquiz_build_id';
  var DESIGN_KEY = 'kiezquiz_design_rev';
  var RELOAD_FLAG = 'kiezquiz_build_reload';
  var build = null;
  var designRev = 0;

  function readInlineMeta() {
    var buildEl = document.querySelector('meta[name="kiezquiz-build"]');
    var designEl = document.querySelector('meta[name="kiezquiz-design"]');
    return {
      build: buildEl && buildEl.content ? String(buildEl.content) : null,
      design: designEl && designEl.content ? parseInt(designEl.content, 10) || 0 : 0
    };
  }

  function getVersionFromNetwork() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/version.json?_=' + Date.now(), false);
      xhr.setRequestHeader('Cache-Control', 'no-cache');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) { /* ignore — iOS kann sync XHR blockieren */ }
    return null;
  }

  function assetUrl(path) {
    if (!path || !build) return path;
    if (/[?&]v=/.test(path)) return path;
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'v=' + encodeURIComponent(build);
  }

  function bustFetchUrl(url) {
    if (!url || !build) return url;
    if (/^https?:\/\//i.test(url)) {
      try {
        var parsed = new URL(url);
        if (parsed.origin !== location.origin || parsed.pathname.indexOf('/src/') === -1) {
          return url;
        }
        if (/[?&]v=/.test(parsed.search)) return url;
        parsed.search += (parsed.search ? '&' : '') + 'v=' + encodeURIComponent(build);
        return parsed.pathname + parsed.search + parsed.hash;
      } catch (e) {
        return url;
      }
    }
    if (url.indexOf('/src/') !== -1 || url.indexOf('src/') === 0) {
      return assetUrl(url);
    }
    return url;
  }

  function stampDomAssets() {
    if (!build) return;
    document.querySelectorAll('link[rel="stylesheet"][href], script[src]').forEach(function (el) {
      var attr = el.tagName === 'LINK' ? 'href' : 'src';
      var href = el.getAttribute(attr);
      if (!href || (href.indexOf('/src/') === -1 && href.indexOf('src/') !== 0)) return;
      var next = assetUrl(href);
      if (next !== href) el.setAttribute(attr, next);
    });
  }

  function refreshStylesheetsIfNeeded() {
    if (!build) return;
    document.querySelectorAll('link[rel="stylesheet"][href*="src/"]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('v=' + build) !== -1) return;
      var next = assetUrl(href.replace(/([?&])v=[^&]+/, '').replace(/\?$/, ''));
      var fresh = link.cloneNode(true);
      fresh.setAttribute('href', next);
      link.parentNode.insertBefore(fresh, link.nextSibling);
      link.remove();
    });
  }

  function cleanReloadQuery() {
    try {
      if (!location.search || location.search.indexOf('_kq=') === -1) return;
      var u = new URL(location.href);
      u.searchParams.delete('_kq');
      u.searchParams.delete('_cb');
      var next = u.pathname + u.search + u.hash;
      history.replaceState(null, '', next || u.pathname);
    } catch (e) { /* ignore */ }
  }

  function persistVersion() {
    try {
      if (build) localStorage.setItem(STORAGE_KEY, build);
      if (designRev) localStorage.setItem(DESIGN_KEY, String(designRev));
    } catch (e) { /* ignore */ }
  }

  function needsFreshAssets(prevBuild, prevDesign) {
    if (!build) return false;
    if (!prevBuild) return true;
    if (prevBuild !== build) return true;
    if (designRev > prevDesign) return true;
    return false;
  }

  function triggerReload() {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    var url = new URL(location.href);
    url.searchParams.set('_kq', build);
    url.searchParams.set('_cb', String(Date.now()));
    location.replace(url.toString());
  }

  var inline = readInlineMeta();
  var net = getVersionFromNetwork();
  if (net && net.build) build = String(net.build);
  else if (inline.build) build = inline.build;
  if (net && net.design != null) designRev = parseInt(net.design, 10) || 0;
  else if (inline.design) designRev = inline.design;

  window.kiezAssetUrl = assetUrl;
  window.KIEZQUIZ_BUILD = build || '';

  if (typeof window.fetch === 'function') {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var raw = typeof input === 'string' ? input : (input && input.url);
      var busted = bustFetchUrl(raw);
      if (busted !== raw) {
        input = typeof input === 'string' ? busted : new Request(busted, input);
      }
      return nativeFetch(input, init);
    };
  }

  function finishBoot() {
    stampDomAssets();
    refreshStylesheetsIfNeeded();
    cleanReloadQuery();
  }

  if (!build) {
    document.addEventListener('DOMContentLoaded', finishBoot);
    return;
  }

  try {
    var prevBuild = localStorage.getItem(STORAGE_KEY);
    var prevDesign = parseInt(localStorage.getItem(DESIGN_KEY) || '0', 10) || 0;

    if (sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.removeItem(RELOAD_FLAG);
      persistVersion();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', finishBoot);
      } else {
        finishBoot();
      }
      return;
    }

    if (needsFreshAssets(prevBuild, prevDesign)) {
      triggerReload();
      return;
    }

    persistVersion();
  } catch (e) { /* ignore */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finishBoot);
  } else {
    finishBoot();
  }
})();
