/* === AUTO COMPANY DISCOUNT v1 ===
 *
 * „Sjálfvirkur afsláttur" per fyrirtæki (t.d. Vélrás 20% af öllu). Tvennt:
 *
 * 1) SALA-tenging — þegar viðskiptavinur með `afslattur_pct` er valinn í Sala,
 *    fyllist afslátturinn SJÁLFKRAFA inn í körfuna (state.discount_pct), án þess
 *    að þurfa að smella á „↺ Sækja afslátt". Keyrir á fyrirtækja-SKIPTUM (þegar
 *    kt breytist), svo það treður ekki yfir handvirkan afslátt sem afgreiðslu-
 *    maður slær sjálfur inn fyrir sama kúnna. Notar POS.getState()/rerenderDynamic
 *    (afhjúpað í pos.js) — óháð innri lookup-leiðinni sem stundum náði ekki að
 *    setja afsláttinn.
 *
 * 2) RITANLEGUR reitur á fyrirtækisspjaldi — „🎯 Sjálfvirkur afsláttur (%)" rétt
 *    fyrir ofan „💰 Tilboðsverð" (patch 113). Les/skrifar `fyrirtaeki.afslattur_pct`
 *    beint í Supabase. Þarna stillir maður Vélrás á 20%.
 *
 * NB rekstrarfélög með margar staðsettningar deila kt; lookupKt velur HÆSTA
 * afsláttinn af röðunum með sama kt (sjá pos.js), svo „hæstur vinnur".
 */
(() => {
  if (window.__autoDiscountInstalled) return;
  window.__autoDiscountInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  function digits(s) { return String(s || '').replace(/[^0-9]/g, ''); }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }

  // ── 1) Auto-apply the selected customer's default discount in the cart ─────
  let _lastKt = null;
  function syncCartDiscount() {
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    if (!window.POS || typeof POS.getState !== 'function') return;
    const st = POS.getState();
    if (!st || !st.customer) return;
    const kt = digits(st.customer.kt);
    // Only act when the CUSTOMER changed — never fight a manual discount the
    // operator typed for the customer already on screen.
    if (kt === _lastKt) return;
    _lastKt = kt;
    const pct = Math.max(0, Math.min(100, +st.customer.afslattur_pct || 0));
    // Switching customer resets the cart discount to the new customer's default
    // (0 for walk-ins / no-discount customers — clears a leftover from before).
    if ((+st.discount_pct || 0) === pct) return;
    st.discount_pct = pct;
    try { if (typeof POS.rerenderDynamic === 'function') POS.rerenderDynamic(); } catch (_) {}
  }

  function attachCart() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attachCart, 800); return; }
    let t = 0;
    new MutationObserver(() => {
      if (!view.classList.contains('active')) return;
      clearTimeout(t);
      t = setTimeout(syncCartDiscount, 120);
    }).observe(view, { childList: true, subtree: true });
    setTimeout(syncCartDiscount, 400);
  }
  attachCart();

  // ── 2) Editable „Sjálfvirkur afsláttur %" on the company card ──────────────
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button[onclick*="openEdit"]');
    if (editBtn) { const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/); if (m) return +m[1]; }
    return null;
  }

  function render(sec, coId, pct, saving) {
    const val = (pct == null || pct === '') ? '' : String(pct);
    sec.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span style="font-size:13px;font-weight:700;color:#166534">🎯 Sjálfvirkur afsláttur</span>' +
        '<span style="font-size:10.5px;color:var(--ink3)">gildir sjálfkrafa á allt í Sölu</span>' +
        '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">' +
          '<input class="_cad-inp" type="number" min="0" max="100" step="1" value="' + val + '" placeholder="0" ' +
            'style="width:64px;padding:6px 8px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;text-align:right;font-variant-numeric:tabular-nums">' +
          '<span style="font-size:13px;color:var(--ink2);font-weight:700">%</span>' +
          '<button class="_cad-save" type="button" ' + (saving ? 'disabled' : '') + ' ' +
            'style="padding:7px 14px;background:' + (saving ? '#94a3b8' : 'var(--brand)') + ';color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700">' +
            (saving ? 'Vista…' : 'Vista') + '</button>' +
        '</span>' +
      '</div>';
  }

  async function loadPct(coId) {
    const sb = SB(); if (!sb) return 0;
    try {
      const r = await sb.from('fyrirtaeki').select('afslattur_pct').eq('id', coId).single();
      return r && r.data ? (+r.data.afslattur_pct || 0) : 0;
    } catch (_) { return 0; }
  }

  function inject() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    if (main.querySelector('._cad-section')) return;

    const sec = document.createElement('div');
    sec.className = '_cad-section';
    sec.dataset.coId = coId;
    sec.style.cssText = 'margin:14px 0 10px;padding:10px 14px;border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    render(sec, coId, null, false);

    // Sit right ABOVE the Tilboðsverð section (patch 113 „._cpr-section"), else
    // before the attachments block, else append.
    const cpr = main.querySelector('._cpr-section');
    const cat = main.querySelector('._cat-section');
    if (cpr) cpr.parentNode.insertBefore(sec, cpr);
    else if (cat) cat.parentNode.insertBefore(sec, cat);
    else main.appendChild(sec);

    loadPct(coId).then(p => {
      // Only fill if the user hasn't started typing in the meantime.
      const inp = sec.querySelector('._cad-inp');
      if (inp && document.activeElement !== inp) inp.value = p ? String(p) : '';
    });

    sec.addEventListener('click', async e => {
      const btn = e.target.closest('._cad-save');
      if (!btn) return;
      const inp = sec.querySelector('._cad-inp');
      let v = parseFloat(inp.value);
      v = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
      const sb = SB();
      if (!sb) { toast('Engin gagnabankatenging.'); return; }
      render(sec, coId, v, true);
      try {
        const r = await sb.from('fyrirtaeki').update({ afslattur_pct: v }).eq('id', coId);
        if (r.error) throw r.error;
        // 2026-07-08 (afsláttar-úttekt): POS lookupKt takes the HIGHEST
        // afslattur_pct across ALL rows sharing the kt (fyrirtaeki OG
        // vidskiptavinir) — so lowering/clearing here only took effect if
        // every same-kt row was updated too. Propagate to them all.
        try {
          const co = await sb.from('fyrirtaeki').select('kennitala').eq('id', coId).single();
          const ktd = String((co.data && co.data.kennitala) || '').replace(/[^0-9]/g, '');
          if (ktd.length === 10 && ktd !== '9999999999') {
            const pats = [ktd, ktd.slice(0, 6) + '-' + ktd.slice(6)];
            await sb.from('fyrirtaeki').update({ afslattur_pct: v }).in('kennitala', pats);
            await sb.from('vidskiptavinir').update({ afslattur_pct: v }).in('kennitala', pats);
          }
        } catch (_) {}
        render(sec, coId, v, false);
        toast(v > 0 ? ('🎯 Sjálfvirkur afsláttur vistaður: ' + v + '%') : 'Afsláttur núllstilltur.');
        // If this customer is the one open in Sala, refresh the live discount.
        _lastKt = null; syncCartDiscount();
      } catch (err) {
        render(sec, coId, v, false);
        toast('Villa við vistun: ' + (err.message || err));
      }
    });
  }

  function attachCard() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attachCard, 800); return; }
    const view = document.getElementById('view-companies');
    let t = 0;
    new MutationObserver(() => {
      if (view && !view.classList.contains('active')) return;
      clearTimeout(t);
      t = setTimeout(inject, 260);
    }).observe(main, { childList: true, subtree: true });
    setTimeout(inject, 1500);
  }
  attachCard();

  window.AutoDiscount = { sync: syncCartDiscount };
  console.log('[patch-255] 🎯 Sjálfvirkur fyrirtækjaafsláttur — auto-apply í Sölu + ritanlegur reitur á fyrirtækisspjaldi');
})();
/* === END AUTO COMPANY DISCOUNT === */
