/* === REKSTRARFÉLAG TAG v1 ===
 * Shows a "🏢 Rekstrarfélag" badge on a customer's detail page when that
 * customer (matched by kennitala) is one of the buildings/húsfélög managed
 * by a rekstrarfélag. The badge names the managing firm and gives its
 * billing email(s) as one-tap mailto links — so staff instantly know where
 * to send the reikningur / who to communicate with.
 *
 * Data source: AppSettings.rekstrarfelog (same shared, server-backed store
 * the Rekstrarfélög page (patch 175) uses). No schema changes.
 *
 * Scope: ONLY the customer detail page (patch 158, #_vd-main). Deliberately
 * NOT shown on the Leiðsögn map — keep that page about driving only.
 * Self-contained: injects via a MutationObserver, touches no core file.
 */
(() => {
  if (window.__rekstrarfelagTagInstalled) return;
  window.__rekstrarfelagTagInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  // Build a kennitala → { firm, emails } index. 2026-07-12: nota SAMEIGINLEGA
  // hjálparfallið úr patch 175 (window.RekstrarfelagData) sem fléttar lifandi
  // customers_base+fyrirtaeki OFAN Á handvirku netföngin — svo nýtt rekstrarfélag
  // í gagnagrunni fái merkið samstundis (var áður fryst í AppSettings-listanum,
  // sama villa og 175). Fallback á gamla AppSettings-leiðina ef 175 er ekki komið.
  function buildIndex() {
    let data = null;
    try {
      if (window.RekstrarfelagData && typeof window.RekstrarfelagData.getMerged === 'function') {
        data = window.RekstrarfelagData.getMerged();
      } else if (window.AppSettings && typeof AppSettings.path === 'function') {
        data = AppSettings.path('rekstrarfelog');
      }
    } catch (_) {}
    const idx = {};
    if (data && typeof data === 'object') {
      for (const firm in data) {
        const rec = data[firm] || {};
        const emails = Array.isArray(rec.emails) ? rec.emails : [];
        (rec.buildings || []).forEach(b => {
          const k = digits(b && b.kt);
          if (k.length >= 10) idx[k] = { firm, emails, drive: rec.drive || '' };
        });
      }
    }
    return idx;
  }

  function badgeHtml(hit) {
    const mails = (hit.emails || []).map(e =>
      '<a href="mailto:' + esc(e) + '" style="color:#0369a1;text-decoration:none;font-weight:600">' + esc(e) + '</a>'
    ).join(' · ');
    return '<div class="rf-tag" style="margin-top:10px;padding:9px 12px;background:#eff6ff;border:1px solid #bfdbfe;' +
      'border-radius:10px;font-size:12.5px;color:#1e3a5f;display:flex;flex-wrap:wrap;align-items:center;gap:8px">' +
      '<span style="font-weight:700">🏢 Rekstrarfélag: ' + esc(hit.firm) + '</span>' +
      (mails ? '<span style="color:#64748b">·</span><span>' + mails + '</span>' : '') +
      '</div>';
  }

  // Find the kennitala shown in the detail customer-card and inject the badge
  // right under it (once).
  function maybeInject(main) {
    if (!main || main.querySelector('.rf-tag')) return;
    // The name <h1> in the customer card; the kt line (if any) is its sibling.
    const h1 = main.querySelector('h1');
    if (!h1) return;
    // kennitala line looks like "kt. 640789-1239"
    let ktEl = null;
    let sib = h1.nextElementSibling;
    while (sib) {
      if (/^kt\.\s*\d/.test((sib.textContent || '').trim())) { ktEl = sib; break; }
      sib = sib.nextElementSibling;
    }
    if (!ktEl) return;
    const kt = digits(ktEl.textContent);
    if (kt.length < 10) return;
    const idx = buildIndex();
    const hit = idx[kt];
    if (!hit) return;
    ktEl.insertAdjacentHTML('afterend', badgeHtml(hit));
  }

  function watch() {
    const main = document.getElementById('_vd-main');
    if (!main) { setTimeout(watch, 400); return; }
    maybeInject(main);
    const obs = new MutationObserver(() => maybeInject(main));
    obs.observe(main, { childList: true, subtree: true });
    // Sækja lifandi rekstrarfélaga-listann (gegnum 175) og endur-sprauta þegar
    // hann er kominn — annars gæti fyrsta málun misst af nýjum rekstrarfélögum.
    try {
      if (window.RekstrarfelagData && typeof window.RekstrarfelagData.ensureLive === 'function') {
        window.RekstrarfelagData.ensureLive().then(() => { try { maybeInject(main); } catch (_) {} });
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();
