/* Deprecated entry — use src/bootstrap.js + src/game/* (see index.html). */
(function () {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('src/app.js is deprecated; the app loads via bootstrap.js and lazy game bundles.');
  }
})();
