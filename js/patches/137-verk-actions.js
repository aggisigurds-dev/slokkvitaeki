/* === VERKBEIÐNI ACTIONS v1 ===
 *
 * Vandinn: Þegar verkbeiðni hangir (t.d. „Móttekið" en viðskiptavinur kemur
 * ekki að sækja, eða það var skráð vitlaust) — notandi hefur ENGA stjórn:
 *   • Get ekki breytt línum (svaraskifta / aukið magn)
 *   • Get ekki eytt eða aflýst
 *   • Get ekki kreditfært beint úr verkbeiðninni — verður að fara í
 *     Bókhaldsyfirlit og leita uppi sölu
 *
 * Niðurstaða: hangandi verkbeiðnir safnast upp; user neyðist til að búa
 * til nýjar í staðinn og hin gömlu sitja eftir í kerfinu.
 *
 * Þessi patch bætir við 3 takka á verkbeiðnis-detail síðu (counter-main):
 *
 *   ✏ Breyta línum   — Opnar Sala-síðu með línum verkbeiðninnar í körfu
 *                       svo notandi getur breytt og pósta nýjan reikning.
 *                       Gömul verkbeiðni er merkt 'cancelled' með sjálfvirkri
 *                       athugasemd.
 *
 *   🗑 Eyða verkbeiðni — Aflýsa verkbeiðninni (status='cancelled', notes
 *                       fyllt með ástæðu). EKKI eyðir frá DB — eingöngu
 *                       breytir status svo hún hverfur úr daglegu yfirliti.
 *
 *   ↩ Kreditfæra      — Opnar Kreditfærsla-glugga sem þegar er til (patch
 *                       26 / 92) með R-num sölunnar forhleðt.
 */
(() => {
  if (window.__verkActionsInstalled) return;
  window.__verkActionsInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function parentSaleNum(verkNum) { return String(verkNum || '').replace(/-V\d+$/, ''); }

  function getCurrentJob() {
    const sel = (window.Counter && Counter.sel);
    if (!sel) return null;
    return (window.DB && DB.getJob) ? DB.getJob(sel) : null;
  }

  // ── Action: cancel ─────────────────────────────────────────────────────
  async function cancelJob(job) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    let reason = '';
    if (window.Confirm && typeof Confirm.show === 'function') {
      const ok = await Confirm.show(
        'Aflýsa verkbeiðni ' + (job.num || job.id) + '?\n\n' +
        'Verkbeiðnin verður merkt sem aflýst og hverfur úr daglegu yfirliti.\n' +
        'Hún er ekki eytt — þú getur skoðað hana í gegnum bókhaldssögu.',
        { danger: true, okText: 'Já, aflýsa' }
      );
      if (!ok) return;
      reason = prompt('Ástæða (valkvætt):', '') || '';
    } else {
      if (!confirm('Aflýsa verkbeiðni ' + (job.num || job.id) + '?')) return;
      reason = prompt('Ástæða (valkvætt):', '') || '';
    }
    const note = '[' + todayISO() + ' · AFLÝST]' + (reason ? ' ' + reason : '');
    const newNotes = (job.notes || '') + '\n\n' + note;
    try {
      const r = await SB.from('verkbeidnir')
        .update({ status: 'cancelled', notes: newNotes })
        .eq('id', job.id);
      if (r.error) throw r.error;
      if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
        const j = DB.cache.jobs.find(x => x.id === job.id);
        if (j) { j.status = 'cancelled'; j.notes = newNotes; }
      }
      if (window.Toast && Toast.show) Toast.show('✓ Verkbeiðni aflýst');
      // Close the detail modal if open
      if (window.Counter && typeof Counter.closeJobModal === 'function') {
        try { Counter.closeJobModal(); } catch(_){}
      }
      Counter.sel = null;
      if (typeof App.refreshAll === 'function') App.refreshAll();
    } catch (e) {
      alert('Villa: ' + (e.message || e));
    }
  }

  // ── Action: credit invoice ─────────────────────────────────────────────
  async function creditJob(job) {
    const parentNum = parentSaleNum(job.num);
    if (!parentNum) {
      alert('Engin sala fundin fyrir þessa verkbeiðni.');
      return;
    }
    // Try patch 92 first
    if (window.CreditByNum && typeof CreditByNum.openLookupForNum === 'function') {
      CreditByNum.openLookupForNum(parentNum);
      return;
    }
    // Try fallback: open lookup dialog via global helper that 92 also exposes
    if (typeof window.kreditFaera === 'function') {
      window.kreditFaera(parentNum);
      return;
    }
    // Fall back: open patch 26's flow by finding the sale
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const r = await SB.from('solur').select('*').eq('num', parentNum).maybeSingle();
    if (r.data && window.CreditInvoice && typeof CreditInvoice.openCreditDialog === 'function') {
      CreditInvoice.openCreditDialog(r.data);
      return;
    }
    alert('Get ekki opnað kreditfærslu sjálfkrafa.\nFarðu í Bókhald → finndu sölu ' + parentNum + ' → smelltu „Kreditfæra".');
  }

  // ── Action: edit lines ─────────────────────────────────────────────────
  async function editJobLines(job) {
    const parentNum = parentSaleNum(job.num);
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const r = await SB.from('solur').select('*').eq('num', parentNum).maybeSingle();
    const sale = r.data;
    if (!sale || !Array.isArray(sale.linur) || !sale.linur.length) {
      alert('Get ekki sótt upphaflega línur sölunnar.');
      return;
    }
    let ok = true;
    if (window.Confirm && typeof Confirm.show === 'function') {
      ok = await Confirm.show(
        'Breyta línum á þessa verkbeiðni?\n\n' +
        'Núverandi verkbeiðni (' + (job.num || job.id) + ') verður aflýst og þú færð opna Sala-síðu með upphaflegum vörum í körfu. ' +
        'Þú getur þá breytt magni / lína og lagt aftur fram.',
        { okText: 'Halda áfram' }
      );
    }
    if (!ok) return;
    // Cancel the verkbeidni
    const note = '[' + todayISO() + ' · ENDURGERÐ] Notandi opnaði aftur í Sölu til að breyta línum.';
    const newNotes = (job.notes || '') + '\n\n' + note;
    try {
      await SB.from('verkbeidnir').update({ status: 'cancelled', notes: newNotes }).eq('id', job.id);
    } catch (e) { console.warn('[verk-actions] cancel failed:', e); }
    // Push lines back into POS state
    if (!window.POS && !window.Sala) {
      alert('Sala mátinn ekki tilbúinn.');
      return;
    }
    // Try to populate state.lines via known mechanism. pos.js doesn't expose
    // setLines, but we can dispatch click events on product tiles or just
    // mutate window state where pos.js can pick it up.
    try {
      // Switch view first
      if (window.App && typeof App.switchView === 'function') App.switchView('sala');
      setTimeout(() => {
        // Re-populate via direct state injection if possible
        if (window.POS && POS.state && Array.isArray(POS.state.lines)) {
          POS.state.lines = sale.linur.slice();
          if (typeof POS.rerenderDynamic === 'function') POS.rerenderDynamic();
        }
        if (window.Toast && Toast.show) Toast.show('✓ Línur opnaðar í Sala — breyttu og pósta aftur');
      }, 250);
    } catch (e) {
      alert('Villa: ' + (e.message || e));
    }
  }

  // ── Inject buttons into counter-main ────────────────────────────────────
  function injectButtons() {
    const main = document.getElementById('counter-main');
    if (!main) return;
    if (main.querySelector('._va-toolbar')) return;
    const job = getCurrentJob();
    if (!job) return;

    // Find anchor — typically the header area in counter-main
    const header = main.querySelector('.jd-header, .jd-title, h1, h2, header');
    if (!header) return;

    const toolbar = document.createElement('div');
    toolbar.className = '_va-toolbar';
    toolbar.style.cssText = 'display:flex;gap:6px;align-items:center;margin:8px 16px 0;flex-wrap:wrap';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-outline btn-sm _va-edit';
    editBtn.style.cssText = 'padding:6px 12px;border:1px solid #cbd5e1;background:#fff;color:#0369a1;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600';
    editBtn.innerHTML = '✏ Breyta línum';
    editBtn.title = 'Aflýsa þessa verkbeiðni og opna línurnar í Sala til endurútgáfu';
    editBtn.addEventListener('click', e => { e.stopPropagation(); editJobLines(getCurrentJob() || job); });
    toolbar.appendChild(editBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-outline btn-sm _va-cancel';
    cancelBtn.style.cssText = 'padding:6px 12px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600';
    cancelBtn.innerHTML = '🗑 Aflýsa';
    cancelBtn.title = 'Aflýsa þessa verkbeiðni — hún verður merkt cancelled (ekki eytt)';
    cancelBtn.addEventListener('click', e => { e.stopPropagation(); cancelJob(getCurrentJob() || job); });
    toolbar.appendChild(cancelBtn);

    const creditBtn = document.createElement('button');
    creditBtn.type = 'button';
    creditBtn.className = 'btn btn-outline btn-sm _va-credit';
    creditBtn.style.cssText = 'padding:6px 12px;border:1px solid #fcd34d;background:#fff;color:#92400e;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600';
    creditBtn.innerHTML = '↩ Kreditfæra';
    creditBtn.title = 'Opna kreditfærslu á upphaflegu sölunni';
    creditBtn.addEventListener('click', e => { e.stopPropagation(); creditJob(getCurrentJob() || job); });
    toolbar.appendChild(creditBtn);

    // Insert AFTER the header
    if (header.parentNode) {
      header.parentNode.insertBefore(toolbar, header.nextSibling);
    } else {
      main.insertBefore(toolbar, main.firstChild);
    }
  }

  // Watch for counter-main changes
  function attach() {
    const main = document.getElementById('counter-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectButtons, 150);
    }).observe(main, { childList: true, subtree: true });
    injectButtons();
  }
  attach();

  // Public API
  window.VerkActions = { cancel: cancelJob, credit: creditJob, editLines: editJobLines };

  console.log('[verk-actions] installed — ✏ Breyta / 🗑 Aflýsa / ↩ Kreditfæra á verkbeiðnis-detail');
})();
/* === END VERKBEIÐNI ACTIONS v1 === */
