/* KiezQuiz — sequential dynamic script loader */
(function () {
  var loaded = Object.create(null);
  var loading = Object.create(null);

  function loadScript(src) {
    if (loaded[src]) return Promise.resolve();
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () {
        loaded[src] = true;
        resolve();
      };
      s.onerror = function () {
        delete loading[src];
        reject(new Error('Failed to load script: ' + src));
      };
      document.body.appendChild(s);
    });
    return loading[src];
  }

  function loadScripts(urls) {
    return urls.reduce(function (chain, url) {
      return chain.then(function () { return loadScript(url); });
    }, Promise.resolve());
  }

  window.kiezLoadScript = { loadScript: loadScript, loadScripts: loadScripts };
})();
