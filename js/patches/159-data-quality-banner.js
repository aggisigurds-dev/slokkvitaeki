/* === DATA QUALITY BANNER v2 ===
 *
 * v2 (2026-05-18 mid-morning): expanded to also flag suspicious
 * addresses (typos, multi-city, generic placeholders, etc.) — these
 * have a heimilisfang field filled in but Nominatim can't geocode
 * them, so the customer never gets a map pin. User is collecting
 * data quality issues so this surfaces them all in one list.
 *
 * Surfaces contract customers (ársskoðun OR brunakerfi) in two
 * categories on Fyrirtæki í Þjónustu and Allir Viðskiptavinir:
 *
 *   1. NO ADDRESS — heimilisfang is empty/whitespace
 *   2. SUSPICIOUS ADDRESS — heimilisfang exists but fails one of
 *      our heuristics (likely to fail geocoding)
 *
 * Banner shows total count. Click "Skoða lista →" → modal with two
 * sections, each customer has "Opna" button to jump to their detail.
 *
 * Dismissable per-day (localStorage flag scoped to today's date).
 */
(() => {
  if (window.__dataQualityBannerInstalled) return;
  window.__dataQualityBannerInstalled = true;

  const DISMISS_KEY = '_dq_banner_dismissed_today';

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function isDismissedToday() {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const today = new Date().toISOString().slice(0,10);
    return v === today;
  }
  function dismissForToday() {
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem(DISMISS_KEY, today);
  }

  // ── Heuristics: when is an Icelandic address likely to fail geocoding? ──
  // These are derived from inspecting the actual data — common patterns
  // observed where Nominatim returns "not-found" reliably.
  function diagnoseAddress(addrRaw) {
    const addr = String(addrRaw || '').trim();
    if (!addr) return null; // empty handled by separate path
    const a = addr.toLowerCase();
    const reasons = [];

    // 1. Two postal codes / two cities ("110 Reykjavík, 222 Hafnarfirði")
    const postalMatches = a.match(/\b\d{3}\b/g);
    if (postalMatches && postalMatches.length > 1) {
      reasons.push('Tvö póstnúmer í einu heimilisfangi');
    }

    // 2. Common typos for known city names
    if (/reykk?javík/.test(a) && !/reykjavík/.test(a)) reasons.push('Stafsetningarvilla í borgarnafni (Reykjavík)');
    if (/hafnafjörð(ur|i|inn)?/.test(a) && !/hafnarfjörð/.test(a)) reasons.push('Stafsetningarvilla (Hafnarfjörður)');
    if (/garðabær/.test(a) === false && /garðabæ/.test(a)) {/* probably fine */}

    // 3. Starts with a number / number-range without a street name
    //    e.g. "98-100 220 Hafnarfirði" or "5 Garðabær"
    if (/^[\d\-\s]+(?=\s)/.test(addr) && !/^\d+\s+[a-záðéíóúýþæö]/i.test(addr)) {
      reasons.push('Engin gata fyrir númer');
    }

    // 4. Generic / non-specific placeholders
    if (/^\s*húsfélag\b/i.test(addr) && !/\d/.test(addr.replace(/^\s*húsfélag\s*/i, ''))) {
      reasons.push('"húsfélag" án númeraðs götuheitis');
    }
    if (/^\s*(atvinnuhúsnæði|skrifstofa|geymsla|íbúð)\b/i.test(addr) && !/\d+\s+[a-záðéíóúýþæö]/i.test(addr)) {
      reasons.push('Almennt orð án götuheitis');
    }

    // 5. City-only abbreviations (no full city name)
    //    e.g. "Suðurhrauni 12c 210 Grb, 210 Garðabær"
    if (/\b(grb|hfj|hafn|rvk|reyk|gbr|kop|kopv)\b/.test(a) && !/(reykjavík|hafnarfjörð|garðabær|kópavog)/.test(a)) {
      reasons.push('Skammstöfun fyrir borg (Grb/Hfj/Rvk osfrv.)');
    }

    // 6. Too short to be a real address
    if (addr.length < 8) reasons.push('Of stutt heimilisfang');

    // 7. No digits at all (no street number)
    if (!/\d/.test(addr)) reasons.push('Engin húsanúmer');

    // 8. Looks like just a postal code + city, no street
    //    e.g. "104 Reykjavík" alone, "220 Hafnarfirði"
    if (/^\s*\d{3}\s+[a-záðéíóúýþæö]+\s*$/i.test(addr)) {
      reasons.push('Aðeins póstnúmer + borg, engin gata');
    }

    return reasons.length ? reasons : null;
  }

  function getContractsInScope() {
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    return cos.filter(c => {
      const ars = arsMap[String(c.id)];
      const bru = bruMap[String(c.id)];
      return (ars && ars.equipment) || !!bru;
    });
  }

  function getMissingAddr() {
    return getContractsInScope().filter(c => !c.heimilisfang || !c.heimilisfang.trim());
  }
  function getSuspiciousAddr() {
    // Also exclude customers that are ALREADY geocoded successfully —
    // if Nominatim resolved it, the address is fine even if it looks
    // weird to our heuristics.
    const gc = (() => { try { return JSON.parse(localStorage.getItem('_slokk_gc') || '{}'); } catch (_) { return {}; } })();
    return getContractsInScope().map(c => {
      const addr = (c.heimilisfang || '').trim();
      if (!addr) return null; // empty handled separately
      // If geocoded, skip
      if (gc[addr] || gc[c.nafn]) return null;
      const reasons = diagnoseAddress(addr);
      if (!reasons) return null;
      return { co: c, reasons };
    }).filter(Boolean);
  }

  function injectBannerInto(parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return false;
    if (parent.querySelector('._dq-banner')) return true;
    if (isDismissedToday()) return true;
    const missing = getMissingAddr();
    const suspicious = getSuspiciousAddr();
    const total = missing.length + suspicious.length;
    if (!total) return true;
    const banner = document.createElement('div');
    banner.className = '_dq-banner';
    banner.style.cssText = 'background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap';
    banner.innerHTML =
      '<div style="font-size:12.5px;color:#92400e">' +
      '⚠️ <strong>' + total + ' samningshafar</strong> koma ekki fram á korti — ' +
      missing.length + ' án heimilisfangs, ' + suspicious.length + ' með gallað heimilisfang. ' +
      '<button class="_dq-show" type="button" style="background:none;border:none;color:#b45309;text-decoration:underline;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;padding:0;margin-left:4px">Skoða lista →</button>' +
      '</div>' +
      '<button class="_dq-dismiss" type="button" title="Loka fyrir daginn" style="background:#fff;border:1px solid #fde68a;color:#92400e;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">✕ Í dag</button>';
    parent.insertBefore(banner, parent.firstChild);
    banner.querySelector('._dq-show').addEventListener('click', openModal);
    banner.querySelector('._dq-dismiss').addEventListener('click', () => {
      dismissForToday();
      banner.remove();
    });
    return true;
  }

  function renderCustomerRow(c, extraNote) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <div style="min-width:0;flex:1">
          <div style="font-weight:700;color:#0f172a;font-size:13px">${esc(c.nafn)}</div>
          <div style="font-size:10.5px;color:#94a3b8;font-family:monospace">kt. ${esc(c.kennitala || '—')}</div>
          ${c.heimilisfang ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;font-style:italic">"${esc(c.heimilisfang)}"</div>` : ''}
          ${extraNote ? `<div style="font-size:10.5px;color:#b45309;margin-top:3px">${esc(extraNote)}</div>` : ''}
        </div>
        <button class="_dq-open" data-co-id="${c.id}" type="button" style="padding:5px 11px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna →</button>
      </div>
    `;
  }

  function openModal() {
    const missing = getMissingAddr();
    const suspicious = getSuspiciousAddr();
    const total = missing.length + suspicious.length;
    if (!total) return;
    const back = document.createElement('div');
    back.id = '_dq-modal-back';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    back.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:780px;width:100%;max-height:85vh;overflow:auto;padding:18px 22px;box-shadow:0 20px 50px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px">
          <h2 style="margin:0;font-size:17px;color:#0f172a;display:flex;align-items:center;gap:8px">
            ⚠️ Heimilisfangagallar
            <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid #fde68a">${total}</span>
          </h2>
          <button class="_dq-close" type="button" style="background:none;border:none;cursor:pointer;font-size:22px;color:#64748b;line-height:1">×</button>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:14px">
          Þessir samningshafar koma ekki fram á kortinu. Smelltu "Opna" til að laga heimilisfangið — það birtist svo sjálfkrafa á korti.
        </div>

        ${missing.length ? `
          <div style="margin-bottom:8px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.04em;padding-top:6px">📭 Án heimilisfangs (${missing.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
            ${missing.map(c => renderCustomerRow(c, null)).join('')}
          </div>
        ` : ''}

        ${suspicious.length ? `
          <div style="margin-bottom:8px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.04em;padding-top:6px">🔍 Heimilisfang gæti þurft að laga (${suspicious.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${suspicious.map(s => renderCustomerRow(s.co, s.reasons.join(' · '))).join('')}
          </div>
        ` : ''}
      </div>
    `;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('._dq-close').addEventListener('click', () => back.remove());
    back.querySelectorAll('._dq-open').forEach(b => b.addEventListener('click', () => {
      const id = +b.dataset.coId;
      back.remove();
      if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
        window.VidskDetail.show(id);
      } else if (window._openCompanySafe) {
        window._openCompanySafe(id);
      }
    }));
  }

  function tryInject() {
    const active = document.querySelector('.view.active');
    if (!active) return;
    if (active.id === 'view-arsskodun') {
      const main = document.getElementById('ars-main');
      if (main) {
        const firstChild = main.querySelector(':scope > div');
        if (firstChild) injectBannerInto('#ars-main > div');
      }
    } else if (active.id === 'view-allir-vidsk') {
      const main = document.getElementById('_av-main');
      if (main) {
        const firstChild = main.querySelector(':scope > div');
        if (firstChild) injectBannerInto('#_av-main > div');
      }
    }
  }

  setInterval(tryInject, 1000);

  // Expose for debugging
  window.DataQuality = {
    missing: getMissingAddr,
    suspicious: getSuspiciousAddr,
    diagnose: diagnoseAddress,
    version: 'v2'
  };

  console.log('[data-quality-banner v2] installed');
})();
/* === END DATA QUALITY BANNER === */
