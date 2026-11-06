(function () {
  function sync() {
    document.querySelectorAll('.premium-topnav [data-premium-go]').forEach(function (button) {
      var view = button.getAttribute('data-premium-go');
      var tab = document.querySelector('#portal header nav a.tab[data-view="' + view + '"]');
      button.classList.toggle('hidden', !tab || tab.classList.contains('hidden'));
      button.classList.toggle('on', !!tab && tab.classList.contains('on'));
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-premium-go]');
    if (!button) return;
    var tab = document.querySelector('#portal header nav a.tab[data-view="' + button.getAttribute('data-premium-go') + '"]:not(.hidden)');
    if (tab && button !== tab) tab.click();
    setTimeout(sync, 0);
  });

  window.PremiumShell = { sync: sync };
  document.addEventListener('DOMContentLoaded', sync);
}());
