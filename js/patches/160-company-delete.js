/* === COMPANY DELETE v1 ===
 *
 * Eyða-takki á fyrirtækisspjald (Companies.openDetail). Spyr fyrst:
 *   • Ef úttæki eru skráð á nafn fyrirtækisins, varar við og lætur
 *     notandann staðfesta áður en eytt er. Tækin sjálf eru EKKI snert —
 *     þau halda sér áfram í uttaeki-töflunni og halda nafninu.
 *   • Annars einföld já/nei staðfesting.
 *
 * Sett inn um MutationObserver á #companies-main, eins og patch 91
 * (important-companies) gerir með ⚠ Mikilvægt-takkann.
 */
(() => {
  if (window.__companyDeleteInstalled) return;
  window.__companyDeleteInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function countLinkedUnits(name) {
    if (!name || !window.DB || !DB.cache || !Array.isArray(DB.cache.units)) return 0;
    return DB.cache.units.filter(u => u.client === name).length;
  }

  async function deleteCompany(coId) {
    const co = (window.Companies && Companies.list || []).find(c => c.id === coId);
    if (!co) {
      if (window.Toast && Toast.show) Toast.show('Fyrirtæki fannst ekki');
      return;
    }
    const linkedUnits = countLinkedUnits(co.nafn);
    const warn = linkedUnits > 0
      ? '\n\n⚠ ' + linkedUnits + ' úttæki eru skráð á "' + co.nafn + '".'
        + '\nÞau halda sér í tækjalistanum — bara fyrirtækisspjaldið verður eytt.'
      : '';
    const delMsg = 'Eyða fyrirtækinu "' + co.nafn + '"?' + warn + '\n\nFærist í ruslið (mjúk eyðing) — hægt að endurheimta.';
    const ok = (window.Confirm && Confirm.show) ? await Confirm.show(delMsg) : window.confirm(delMsg);
    if (!ok) return;

    const sb = window.DB && DB.sb;
    if (!sb) {
      if (window.Toast && Toast.show) Toast.show('Engin nettenging');
      return;
    }

    try {
      // Soft-delete only (ákvörðun 2026-06-05): set deleted_at; the lists all
      // filter `deleted_at is null`, so it disappears immediately but is
      // recoverable. Permanent removal is a reviewed migration only.
      const r = await sb.from('fyrirtaeki').update({ deleted_at: new Date().toISOString() }).eq('id', coId);
      if (r.error) throw r.error;
      if (Array.isArray(Companies.list)) {
        Companies.list = Companies.list.filter(c => c.id !== coId);
      }
      if (window.Toast && Toast.show) Toast.show('🗑 ' + co.nafn + ' eytt');
      if (typeof Companies.render === 'function') Companies.render();
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (window.Toast && Toast.show) Toast.show('Villa: ' + msg);
      else alert('Villa: ' + msg);
    }
  }

  if (window.Companies) Companies.deleteFyrirtaeki = deleteCompany;
  else {
    const t = setInterval(() => {
      if (window.Companies) {
        Companies.deleteFyrirtaeki = deleteCompany;
        clearInterval(t);
      }
    }, 300);
  }

  function injectButton() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
    if (!editBtn) return;
    const actionsRow = editBtn.parentElement;
    if (!actionsRow || actionsRow.querySelector('._co-delete')) return;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-sm _co-delete';
    btn.type = 'button';
    btn.textContent = '🗑 Eyða';
    btn.title = 'Eyða fyrirtækinu (úttæki halda sér)';
    btn.style.cssText = 'color:#b91c1c;border-color:#fecaca;background:#fff;font-weight:600';
    btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      deleteCompany(coId);
    });
    actionsRow.appendChild(btn);
  }

  function watch() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(() => injectButton()).observe(main, { childList: true, subtree: true });
    injectButton();
  }
  watch();

  console.log('[company-delete] installed');
})();
/* === END COMPANY DELETE v1 === */
