document.addEventListener('click', function (event) {
  const button = event.target.closest('[data-premium-go]');
  if (!button) return;
  const tab = document.querySelector('#portal nav a.tab[data-view="' + button.dataset.premiumGo + '"]:not(.hidden)');
  if (tab) tab.click();
});
