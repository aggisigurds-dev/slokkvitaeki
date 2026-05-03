/* === FIELD COMPANY DEEPLINK v1 === */
/* In Þjónustutæki (view-field), the alert/schedule/history cards show a
 * customer/company name as text. Without this patch, that name was inert.
 * This makes those names clickable: a click switches to Fyrirtæki and opens
 * the matching company's detail page. Falls back to the Fyrirtæki overview
 * (and shows a toast) if no matching company is found.
 *
 * Mechanism: a single document-level click delegate. Survives Field.render()
 * re-renders without re-binding per element. Only fires when the click target
 * is one of the labelled name nodes, never on buttons inside the card.
 */
(() => {
  if (window.__fieldCoDeeplinkInstalled) return;
  window.__fieldCoDeeplinkInstalled = true;

  const NAME_SELECTOR = '.ac-name, .sched-client, .hist-name, .ub-name';

  function findCompanyByName(name) {
    if (!name) return null;
    const list = (window.Companies && window.Companies.list) || [];
    if (!list.length) return null;
    const norm = s => String(s || '').trim().toLowerCase();
    const target = norm(name);
    return list.find(c => norm(c.nafn) === target)
        || list.find(c => norm(c.nafn).startsWith(target))
        || list.find(c => norm(c.nafn).includes(target))
        || null;
  }

  function tagNamesAsClickable(root) {
    (root || document).querySelectorAll(NAME_SELECTOR).forEach(el => {
      if (el.dataset.coDeeplink) return;
      el.dataset.coDeeplink = '1';
      el.style.cursor = 'pointer';
      el.title = 'Opna fyrirtæki';
      el.style.textDecoration = 'underline';
      el.style.textDecorationStyle = 'dotted';
      el.style.textDecorationColor = 'rgba(100,116,139,.5)';
    });
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest(NAME_SELECTOR);
    if (!el) return;
    if (e.target.closest('button, a')) return;
    const name = (el.textContent || '').trim();
    if (!name) return;
    const co = findCompanyByName(name);
    if (window.App && App.switchView) App.switchView('companies');
    if (co && window.Companies && Companies.openDetail) {
      setTimeout(() => Companies.openDetail(co.id), 180);
    } else if (window.Toast && Toast.show) {
      Toast.show('Fyrirtækið "' + name + '" fannst ekki í skránni');
    }
  }, true);

  const fieldView = document.getElementById('view-field');
  if (fieldView) {
    new MutationObserver(() => tagNamesAsClickable(fieldView))
      .observe(fieldView, { childList: true, subtree: true });
    tagNamesAsClickable(fieldView);
  }

  console.log('[field-co-deeplink] installed');
})();
/* === END FIELD COMPANY DEEPLINK v1 === */
