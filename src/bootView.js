/* KiezQuiz — sync view before paint (SEO hub vs. resume city). No save writes. */
(function () {
  var router = window.kiezViewRouter;
  if (!router) return;

  function applyView() {
    var hub = document.getElementById('hub-view');
    var city = document.getElementById('city-view');
    if (!hub || !city) return;

    var route = router.resolveInitialView({
      searchParams: new URLSearchParams(window.location.search)
    });

    if (route.view === 'city') {
      hub.hidden = true;
      city.hidden = false;
      city.dataset.city = route.cityId;
      var shell = document.querySelector('.app-shell');
      if (shell) {
        shell.classList.add('view-city');
        shell.classList.remove('view-hub');
      }
    } else {
      hub.hidden = false;
      city.hidden = true;
      if (window.kiezHubShell) {
        window.kiezHubShell.inject(hub);
      }
    }
  }

  if (document.getElementById('hub-view')) {
    applyView();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyView);
  } else {
    applyView();
  }
})();
