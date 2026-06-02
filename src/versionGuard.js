/**
 * Stellt sicher, dass nach einem Deploy alle /src/-Assets frisch geladen werden.
 * Spielstand (localStorage) bleibt erhalten.
 */
(function () {
  'use strict';
  var STORAGE_KEY = 'kiezquiz_build_id';
  var DESIGN_KEY = 'kiezquiz_design_rev';
  var RELOAD_FLAG = 'kiezquiz_build_reload';
  var build = null;
  var designRev = 0;

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
    } catch (e) { /* ignore */ }
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
    var sel = 'link[rel="stylesheet"][href*="src/"], script[src*="src/"]';
    document.querySelectorAll(sel).forEach(function (el) {
      var attr = el.tagName === 'LINK' ? 'href' : 'src';
      var href = el.getAttribute(attr);
      if (!href) return;
      var next = assetUrl(href);
      if (next !== href) el.setAttribute(attr, next);
    });
  }

  function cleanReloadQuery() {
    try {
      if (!location.search || location.search.indexOf('_kq=') === -1) return;
      var u = new URL(location.href);
      u.searchParams.delete('_kq');
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
    location.replace(url.toString());
  }

  var meta = getVersionFromNetwork();
  if (meta && meta.build) build = String(meta.build);
  if (meta && meta.design != null) designRev = parseInt(meta.design, 10) || 0;

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

  if (!build) return;

  try {
    var prevBuild = localStorage.getItem(STORAGE_KEY);
    var prevDesign = parseInt(localStorage.getItem(DESIGN_KEY) || '0', 10) || 0;

    if (sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.removeItem(RELOAD_FLAG);
      persistVersion();
      stampDomAssets();
      cleanReloadQuery();
      return;
    }

    if (needsFreshAssets(prevBuild, prevDesign)) {
      triggerReload();
      return;
    }

    persistVersion();
  } catch (e) { /* ignore */ }

  stampDomAssets();
  cleanReloadQuery();
})();
