/* === FYRIRTAEKI DETAIL ENRICH v1 === */
/* features.js Companies.openDetail() only renders Sími + Netfang in its
 * info-grid. The DB has many more useful columns: kennitala, farsimi, vefsida,
 * tengilidur, greidsluskilmali, afslattur_pct, heimilisfang, athugasemdir.
 *
 * This patch wraps Companies.openDetail. After the original render runs we
 * find the .info-grid in #companies-main and replace its contents with a
 * fuller field set, plus add a yellow "Athugasemdir" card if the company has
 * notes (often price-instruction notes from the import).
 *
 * Also fixes a long-standing bug: the address line under the company name
 * read c.heimilisFang (capital F) but the DB column is heimilisfang.
 *
 * Sets a marker attribute that prevents patch-master.js's old "enhance company
 * info" polling from clobbering this enriched grid (legacy concern; harmless
 * if that code isn't around).
 */
(() => {
  if (window.__fyrEnrichInstalled) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function enhance(id) {
    const c = (window.Companies && Companies.list || []).find(x => x.id === id);
    if (!c) return;
    const main = document.getElementById('companies-main');
    if (!main) return;
    const grid = main.querySelector('.info-grid');
    if (!grid || grid.dataset._fyrEnriched) return;
    grid.dataset._fyrEnriched = '1';
    grid.setAttribute('data-_pm-info', 'job-detail'); // legacy hijack guard

    const addr = c.heimilisfang || c.heimilisFang || '';
    const contact = c['tengiliður'] || c.tengilidur || '';

    let html = '';
    if (c.kennitala)    html += `<div class="ic"><div class="ic-lbl">Kennitala</div><div class="ic-val">${esc(c.kennitala)}</div></div>`;
    if (c.simi)         html += `<div class="ic"><div class="ic-lbl">Sími</div><div class="ic-val"><a href="tel:${esc(c.simi)}" style="color:inherit;text-decoration:none">${esc(c.simi)}</a></div></div>`;
    if (c.farsimi)      html += `<div class="ic"><div class="ic-lbl">Farsími</div><div class="ic-val"><a href="tel:${esc(c.farsimi)}" style="color:inherit;text-decoration:none">${esc(c.farsimi)}</a></div></div>`;
    if (c.netfang)      html += `<div class="ic"><div class="ic-lbl">Netfang</div><div class="ic-val"><a href="mailto:${esc(c.netfang)}" style="color:inherit;text-decoration:none">${esc(c.netfang)}</a></div></div>`;
    if (c.vefsida)      html += `<div class="ic"><div class="ic-lbl">Vefsíða</div><div class="ic-val"><a href="${esc(c.vefsida)}" target="_blank" rel="noopener" style="color:inherit">${esc(c.vefsida)}</a></div></div>`;
    if (addr)           html += `<div class="ic"><div class="ic-lbl">Heimilisfang</div><div class="ic-val">${esc(addr)}</div></div>`;
    if (contact)        html += `<div class="ic"><div class="ic-lbl">Tengiliður</div><div class="ic-val">${esc(contact)}</div></div>`;
    if (c.greidsluskilmali) html += `<div class="ic"><div class="ic-lbl">Greiðsluskilmáli</div><div class="ic-val">${esc(c.greidsluskilmali)}</div></div>`;
    if (c.afslattur_pct)    html += `<div class="ic"><div class="ic-lbl">Afsláttur</div><div class="ic-val">${c.afslattur_pct}%</div></div>`;

    grid.innerHTML = html;

    // 2026-05-12: Yellow `_fyr_notes` block removed. Athugasemdir er nú þegar
    // sýnd á 2 öðrum stöðum (bláum _pm_notes_display og editable MINNÓ-textarea
    // sem er kanóníska geymslan). Hér í patch 75 var þetta þriðja birting sem
    // varð til þess að patch 107 keyrði 1.5s setInterval forever til að taka
    // þetta út aftur. Lausnin var einföld: ekki bæta því við yfir höfuð.

    // Fix the address line under the company name (was reading capital-F heimilisFang)
    if (addr) {
      // Find the empty/wrong-case sub-address div under the company name
      const subAddrCandidates = main.querySelectorAll('div[style*="font-size:13px"][style*="ink3"], div[style*="font-size:13px"][style*="color:var(--ink3)"]');
      subAddrCandidates.forEach(d => {
        if (!d.textContent.trim() || d.textContent.trim() === '—') d.textContent = addr;
      });
    }
  }

  function install() {
    if (!window.Companies || typeof Companies.openDetail !== 'function') {
      setTimeout(install, 300);
      return;
    }
    if (window.__fyrEnrichInstalled) return;
    window.__fyrEnrichInstalled = true;
    const orig = Companies.openDetail;
    Companies.openDetail = function(id) {
      orig.call(this, id);
      setTimeout(() => enhance(id), 50);
    };
    console.log('[fyrirtaeki-detail-enrich] installed');
  }
  install();
})();
/* === END FYRIRTAEKI DETAIL ENRICH v1 === */
