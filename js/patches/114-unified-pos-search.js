/* === UNIFIED POS SEARCH v1 ===
 *
 * Sameinaður leitareitur á Sala-síðu — leitar samtímis af kennitölum,
 * nöfnum og símanúmerum. Birtir live niðurstöður undir reitnum.
 *
 * Eiginleikar:
 *   • Einn leitareitur „Leita að kennitölu, nafni eða síma…"
 *   • Live dropdown með matchandi viðskiptavinum + fyrirtækjum
 *   • Smellur á niðurstöðu fyllir út kt + nafn + sími sjálfvirkt
 *   • Quick „⚡ Staðgreitt" takki: notar kt 999999-9999 — engin skráning
 *   • Notandi getur slegið inn nafn + síma fyrir staðgreidda sem fer ekki
 *     í gagnagrunninn (engin tvírit í Viðskiptavinir)
 *
 * Niðurstöður koma úr:
 *   • Companies.list (fyrirtaeki)
 *   • Vidskiptavinir.list eða DB.cache.vidsk (vidskiptavinir)
 *
 * Breytingar á flæði:
 *   • Þegar leitarniðurstaða er valin → setur state.customer eins og
 *     gamla kennitala-flæðið (svo öll önnur virkni heldur áfram)
 *   • Þegar „Staðgreitt" er ýtt → tilboðsverð, kvittun, allt eins —
 *     bara með kt 999999-9999 og nafn úr handvirkum reit
 */
(() => {
  if (window.__unifiedPosSearchInstalled) return;
  window.__unifiedPosSearchInstalled = true;

  const STAÐGREITT_KT = '999999-9999';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getCompanies() {
    return (window.Companies && Array.isArray(Companies.list)) ? Companies.list : [];
  }
  function getVidsk() {
    if (window.Vidskiptavinir && Array.isArray(Vidskiptavinir.list) && Vidskiptavinir.list.length) return Vidskiptavinir.list;
    if (window.DB && DB.cache && Array.isArray(DB.cache.vidsk) && DB.cache.vidsk.length) return DB.cache.vidsk;
    return _vidskFallback;
  }

  // Local fallback cache populated by direct Supabase query (in case neither
  // Companies nor Vidskiptavinir module has been loaded yet — search works
  // anyway).
  let _vidskFallback = [];

  // Prefetch both companies + viðskiptavinir directly from Supabase so search
  // works even before user visits those views.
  let _prefetchPromise = null;
  function prefetchCustomers() {
    if (_prefetchPromise) return _prefetchPromise;
    const SB = window.DB && window.DB.sb;
    if (!SB) {
      // DB not ready yet — DON'T cache an empty promise (would block forever).
      // Just retry shortly.
      setTimeout(prefetchCustomers, 500);
      return Promise.resolve();
    }
    _prefetchPromise = Promise.all([
      // Companies
      // 2026-05-08 FIX: removed `heimilisFang` (capital F) — column does
      // not exist in fyrirtaeki schema, the include caused PostgREST to
      // return error: "column fyrirtaeki.heimilisFang does not exist"
      // → entire companies prefetch returned 0 rows → company-search
      // produced no results, and Sjá → couldn't open companies.
      SB.from('fyrirtaeki')
        .select('id,nafn,simi,kennitala,heimilisfang,netfang,afslattur_pct,athugasemdir')
        .order('nafn'),
      // Vidskiptavinir
      SB.from('vidskiptavinir')
        .select('id,nafn,kennitala,simi,farsimi,heimilisfang,netfang,afslattur_pct,athugasemdir')
        .order('nafn')
    ]).then(results => {
      const fy = (results[0] && results[0].data) || [];
      const vk = (results[1] && results[1].data) || [];
      // Hydrate Companies.list if empty
      if (window.Companies && (!Companies.list || !Companies.list.length)) {
        Companies.list = fy;
      }
      // Hydrate Vidskiptavinir / DB.cache.vidsk
      if (window.Vidskiptavinir && (!Vidskiptavinir.list || !Vidskiptavinir.list.length)) {
        Vidskiptavinir.list = vk;
      }
      if (window.DB && window.DB.cache && (!DB.cache.vidsk || !DB.cache.vidsk.length)) {
        DB.cache.vidsk = vk;
      }
      _vidskFallback = vk;
      console.log('[unified-pos-search] prefetched', fy.length, 'companies +', vk.length, 'viðskiptavinir');
    }).catch(e => {
      console.warn('[unified-pos-search] prefetch failed:', e);
    });
    return _prefetchPromise;
  }

  // Search both companies + viðskiptavinir
  function searchCustomers(q) {
    if (!q || q.length < 2) return [];
    const qLow = q.toLowerCase().trim();
    const qDigits = q.replace(/[^0-9]/g, '');
    const looksLikeKt = qDigits.length >= 3;

    const all = [];
    getCompanies().forEach(c => {
      all.push({
        id: c.id,
        nafn: c.nafn || '',
        kennitala: c.kennitala || '',
        simi: c.simi || '',
        netfang: c.netfang || '',
        heimilisfang: c.heimilisfang || c.heimilisFang || '',
        afslattur_pct: c.afslattur_pct || 0,
        athugasemdir: c.athugasemdir || '',
        source: 'fyrirtaeki'
      });
    });
    getVidsk().forEach(v => {
      // Skip if we already have a fyrirtaeki entry with same kennitala
      if (v.kennitala && all.some(x => String(x.kennitala).replace(/[^0-9]/g, '') === String(v.kennitala).replace(/[^0-9]/g, ''))) return;
      all.push({
        id: v.id,
        nafn: v.nafn || '',
        kennitala: v.kennitala || '',
        simi: v.simi || '',
        farsimi: v.farsimi || '',
        netfang: v.netfang || '',
        heimilisfang: v.heimilisfang || '',
        afslattur_pct: v.afslattur_pct || 0,
        athugasemdir: v.athugasemdir || '',
        source: 'vidskiptavinir'
      });
    });

    const matches = all.filter(c => {
      const n = (c.nafn || '').toLowerCase();
      const ktDigits = String(c.kennitala || '').replace(/[^0-9]/g, '');
      const siDigits = String(c.simi || '').replace(/[^0-9]/g, '');
      const farDigits = String(c.farsimi || '').replace(/[^0-9]/g, '');
      if (n.includes(qLow)) return true;
      if (looksLikeKt) {
        if (ktDigits.includes(qDigits)) return true;
        if (siDigits.includes(qDigits)) return true;
        if (farDigits.includes(qDigits)) return true;
      }
      return false;
    });
    // Limit + prioritize: exact-prefix matches first, then substring
    matches.sort((a, b) => {
      const an = (a.nafn || '').toLowerCase();
      const bn = (b.nafn || '').toLowerCase();
      const ap = an.startsWith(qLow) ? 0 : 1;
      const bp = bn.startsWith(qLow) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return an.localeCompare(bn, 'is');
    });
    return matches.slice(0, 12);
  }

  // ── Inject unified search UI into the existing customer card ─────────────
  function injectUnifiedSearch() {
    const ktBox = document.getElementById('pos-kt-box');
    if (!ktBox) return;
    const card = ktBox.parentElement;
    if (!card) return;
    if (card.dataset._upsDone === '1') return;
    card.dataset._upsDone = '1';

    // Hide the mode toggle buttons (Kennitala / Nafn/Sími) — we replace it
    const modeButtons = card.querySelectorAll('.pos-mode-btn');
    modeButtons.forEach(b => { b.style.display = 'none'; });

    // Hide the manual box (we'll add our own walk-in UI)
    const manualBox = document.getElementById('pos-manual-box');
    if (manualBox) manualBox.style.display = 'none';

    // Build new unified UI inserted before pos-kt-box
    const wrap = document.createElement('div');
    wrap.id = '_ups-wrap';
    wrap.style.cssText = 'position:relative;margin-bottom:8px';
    wrap.innerHTML =
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
        '<input id="_ups-search" type="text" autocomplete="off" placeholder="🔍 Leita að kennitölu, nafni eða síma…" ' +
          'style="flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box">' +
        '<button id="_ups-walkin" type="button" title="Staðgreitt — kt: 999999-9999, engin skráning" ' +
          'style="padding:10px 14px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">⚡ Staðgreitt</button>' +
      '</div>' +
      '<div id="_ups-results" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:50;max-height:380px;overflow:auto;margin-top:2px"></div>' +
      // Selected customer card — sober grey/blue palette
      '<div id="_ups-selected" style="display:none;margin-top:8px;padding:11px 13px;background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #2563eb;border-radius:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">' +
              '<span style="font-size:11px;color:#64748b">Valinn viðskiptavinur</span>' +
              '<span id="_ups-sel-source" style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;letter-spacing:0.04em"></span>' +
            '</div>' +
            '<div id="_ups-sel-nafn" style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.2;word-break:break-word"></div>' +
            '<div id="_ups-sel-kt" style="font-size:12px;color:#475569;font-family:\'Courier New\',monospace;font-weight:600;margin-top:2px"></div>' +
            '<div id="_ups-sel-meta" style="font-size:11px;color:#64748b;margin-top:2px"></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">' +
            '<button id="_ups-sel-open" type="button" title="Opna viðskiptavin" style="background:#2563eb;border:1px solid #1d4ed8;color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;cursor:pointer;line-height:1.2;white-space:nowrap">Sjá →</button>' +
            '<button id="_ups-sel-clear" type="button" title="Hætta við" style="background:#fff;border:1px solid #cbd5e1;color:#64748b;font-size:13px;width:26px;height:24px;border-radius:5px;cursor:pointer;line-height:1">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="_ups-sel-disc" style="display:none;margin-top:5px;padding:3px 8px;background:#dbeafe;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:5px;font-size:11px;font-weight:600"></div>' +
        '<div id="_ups-sel-pricing" style="display:none;margin-top:5px;padding:4px 8px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:5px;font-size:11px"></div>' +
        '<div id="_ups-sel-notes" style="display:none;margin-top:6px;padding:7px 10px;background:#fff;border:1px solid #e2e8f0;border-left:3px solid #64748b;border-radius:5px">' +
          '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px">📝 Athugasemdir</div>' +
          '<div id="_ups-sel-notes-text" style="font-size:12px;color:#334155;white-space:pre-wrap;line-height:1.45"></div>' +
        '</div>' +
      '</div>' +
      // Walk-in form (hidden until user clicks Staðgreitt)
      '<div id="_ups-walkin-form" style="display:none;margin-top:8px;padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">⚡ Staðgreitt — kt: 999999-9999</div>' +
          '<button id="_ups-walkin-clear" type="button" style="background:transparent;border:none;color:#92400e;font-size:14px;cursor:pointer;padding:0 4px">✕</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
          '<input id="_ups-walkin-name" type="text" placeholder="Nafn (valkvætt)" style="padding:8px 10px;border:1px solid #fde68a;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '<input id="_ups-walkin-phone" type="tel" placeholder="Sími (valkvætt)" style="padding:8px 10px;border:1px solid #fde68a;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
        '</div>' +
        '<div style="margin-top:6px;font-size:11px;color:#92400e">Engin skráning í Viðskiptavinir — fer í kvittun og bókhald með kt 999999-9999.</div>' +
      '</div>';

    card.insertBefore(wrap, ktBox);

    // Hide the kt input row (still kept in DOM so existing pos.js logic works)
    ktBox.style.display = 'none';

    wireSearch();
  }

  function wireSearch() {
    const search = document.getElementById('_ups-search');
    const results = document.getElementById('_ups-results');
    const walkinBtn = document.getElementById('_ups-walkin');
    const walkinForm = document.getElementById('_ups-walkin-form');
    const walkinClear = document.getElementById('_ups-walkin-clear');
    const walkinName = document.getElementById('_ups-walkin-name');
    const walkinPhone = document.getElementById('_ups-walkin-phone');
    if (!search) return;

    search.addEventListener('input', () => {
      const q = search.value.trim();
      if (!q) { results.style.display = 'none'; results.innerHTML = ''; return; }
      // Ensure data is loaded
      prefetchCustomers().then(() => {
        runSearch();
      });
      runSearch();
    });
    search.addEventListener('focus', prefetchCustomers);
    // Enter → pick first visible result (or fall back to RSK lookup if 10 digits)
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstResult = results.querySelector('._ups-result');
        if (firstResult) {
          firstResult.click();
        } else {
          const rskRow = results.querySelector('._ups-rsk');
          if (rskRow) rskRow.click();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        results.style.display = 'none';
        search.value = '';
      }
    });

    function runSearch() {
      const q = search.value.trim();
      if (!q) return;
      // If user types a 10-digit kennitala, also support direct lookup
      const qDigits = q.replace(/[^0-9]/g, '');
      const matches = searchCustomers(q);
      if (!matches.length && qDigits.length === 10) {
        // No local match — show "Look up via RSK" option
        results.innerHTML =
          '<div class="_ups-rsk" data-kt="' + qDigits + '" style="padding:11px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e40af;font-weight:600;font-size:13px">' +
            '📋 Leita að ' + qDigits.slice(0,6) + '-' + qDigits.slice(6,10) + ' í þjóðskrá / RSK' +
          '</div>';
        results.style.display = 'block';
        results.querySelector('._ups-rsk').addEventListener('click', () => {
          // Trigger the existing kt lookup flow via the hidden #pos-kt input
          const ktInp = document.getElementById('pos-kt');
          if (ktInp) {
            ktInp.value = qDigits.slice(0,6) + '-' + qDigits.slice(6,10);
            ktInp.dispatchEvent(new Event('input', { bubbles: true }));
          }
          results.style.display = 'none';
        });
        return;
      }
      if (!matches.length) {
        results.innerHTML = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:13px">Engin niðurstaða — prófaðu „⚡ Staðgreitt" eða sláðu inn fulla kennitölu.</div>';
        results.style.display = 'block';
        return;
      }
      results.innerHTML = matches.map(m => {
        const ktDisp = m.kennitala ? esc(m.kennitala) : '';
        const sourceBadge = m.source === 'fyrirtaeki'
          ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">B2B</span>'
          : '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">Viðsk.</span>';
        const discBadge = m.afslattur_pct > 0
          ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:4px">' + m.afslattur_pct + '%</span>'
          : '';
        return '<div class="_ups-result" data-id="' + esc(m.id) + '" data-source="' + esc(m.source) + '" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px">' +
          '<div style="font-weight:700;color:#0f172a">' + esc(m.nafn) + sourceBadge + discBadge + '</div>' +
          (ktDisp ? '<div style="font-size:11px;color:#64748b;font-family:monospace">kt. ' + ktDisp + (m.simi ? ' · sími: ' + esc(m.simi) : '') + '</div>' : '') +
        '</div>';
      }).join('');
      results.style.display = 'block';
      results.querySelectorAll('._ups-result').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.dataset.id;
          const source = row.dataset.source;
          const list = source === 'fyrirtaeki' ? getCompanies() : getVidsk();
          const m = list.find(x => String(x.id) === String(id));
          if (m) selectCustomer(m, source);
          results.style.display = 'none';
        });
        row.addEventListener('mouseenter', () => { row.style.background = '#f8fafc'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
      });
    }

    // Hide results on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#_ups-wrap')) {
        results.style.display = 'none';
      }
    });

    // Walk-in flow
    // Also watch for kt input results from pos.js's own lookup flow — e.g.
    // when user types kt directly, or when the RSK lookup completes. We hook
    // into pos-kt-result mutations and convert to our prominent card.
    const posKtResult = document.getElementById('pos-kt-result');
    if (posKtResult && !posKtResult.dataset._upsWatched) {
      posKtResult.dataset._upsWatched = '1';
      new MutationObserver(() => {
        const txt = (posKtResult.textContent || '').trim();
        // Only show our card if the result indicates a found customer (not a "Leita…" or empty)
        if (!txt || /Leita\.\.\.|Leita…|Engin/.test(txt)) return;
        // If our card is already shown for a selected customer, skip
        const card = document.getElementById('_ups-selected');
        if (card && card.style.display !== 'none') return;
        // Try to parse kennitala from #pos-kt input
        const ktInp = document.getElementById('pos-kt');
        const kt = ktInp ? ktInp.value.replace(/[^0-9]/g, '') : '';
        if (kt.length !== 10) return;
        // Find customer in companies/vidsk by kt
        const fy = getCompanies().find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt);
        const vk = !fy && getVidsk().find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt);
        if (fy) showSelectedCard(fy, 'fyrirtaeki');
        else if (vk) showSelectedCard(vk, 'vidskiptavinir');
      }).observe(posKtResult, { childList: true, characterData: true, subtree: true });
    }

    walkinBtn.addEventListener('click', () => {
      walkinForm.style.display = '';
      // Set kt to 999999-9999 (drives existing pos.js auto-create logic)
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) {
        ktInp.value = STAÐGREITT_KT;
        ktInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Set state.customer fields (we use the manual mode hooks of pos.js)
      // Existing pos.js writes to state.customer.nafn / .simi when manual inputs change.
      const manualNafn = document.getElementById('pos-nafn');
      const manualSimi = document.getElementById('pos-simi');
      if (manualNafn) manualNafn.value = walkinName.value || 'Staðgreitt';
      if (manualSimi) manualSimi.value = walkinPhone.value || '';
      // Trigger events so pos.js state.customer updates
      [manualNafn, manualSimi].forEach(el => { if (el) el.dispatchEvent(new Event('input', { bubbles: true })); });
      // Clear search field
      search.value = '';
      results.style.display = 'none';
      // Display result text in the existing pos-kt-result element
      const r = document.getElementById('pos-kt-result');
      if (r) {
        r.innerHTML = '<span style="color:#92400e;font-weight:600">⚡ Staðgreitt' + (walkinName.value ? ' · ' + esc(walkinName.value) : '') + '</span>';
      }
    });

    // Walk-in name/phone live-update
    walkinName.addEventListener('input', () => {
      const manualNafn = document.getElementById('pos-nafn');
      if (manualNafn) {
        manualNafn.value = walkinName.value || 'Staðgreitt';
        manualNafn.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const r = document.getElementById('pos-kt-result');
      if (r) r.innerHTML = '<span style="color:#92400e;font-weight:600">⚡ Staðgreitt' + (walkinName.value ? ' · ' + esc(walkinName.value) : '') + '</span>';
    });
    walkinPhone.addEventListener('input', () => {
      const manualSimi = document.getElementById('pos-simi');
      if (manualSimi) {
        manualSimi.value = walkinPhone.value;
        manualSimi.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    walkinClear.addEventListener('click', () => {
      walkinForm.style.display = 'none';
      walkinName.value = '';
      walkinPhone.value = '';
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) { ktInp.value = ''; ktInp.dispatchEvent(new Event('input', { bubbles: true })); }
      const manualNafn = document.getElementById('pos-nafn');
      const manualSimi = document.getElementById('pos-simi');
      if (manualNafn) { manualNafn.value = ''; manualNafn.dispatchEvent(new Event('input', { bubbles: true })); }
      if (manualSimi) { manualSimi.value = ''; manualSimi.dispatchEvent(new Event('input', { bubbles: true })); }
      const r = document.getElementById('pos-kt-result');
      if (r) r.innerHTML = '';
    });
  }

  function selectCustomer(m, source) {
    // Drive the existing kt-lookup flow by populating #pos-kt and dispatching input
    const ktInp = document.getElementById('pos-kt');
    if (ktInp && m.kennitala) {
      ktInp.value = m.kennitala;
      ktInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Hide walk-in form if visible
    const walkinForm = document.getElementById('_ups-walkin-form');
    if (walkinForm) walkinForm.style.display = 'none';
    // Clear search bar so user can search again if needed
    const search = document.getElementById('_ups-search');
    if (search) search.value = '';
    // Hide the small pos-kt-result line — we use our own prominent card now
    const r = document.getElementById('pos-kt-result');
    if (r) r.innerHTML = '';

    // Show the prominent selected-customer card
    showSelectedCard(m, source);
  }

  function showSelectedCard(m, source) {
    const card = document.getElementById('_ups-selected');
    if (!card) return;
    const srcEl = document.getElementById('_ups-sel-source');
    const nafnEl = document.getElementById('_ups-sel-nafn');
    const ktEl = document.getElementById('_ups-sel-kt');
    const metaEl = document.getElementById('_ups-sel-meta');
    const discEl = document.getElementById('_ups-sel-disc');
    const pricingEl = document.getElementById('_ups-sel-pricing');
    const notesEl = document.getElementById('_ups-sel-notes');
    const notesTextEl = document.getElementById('_ups-sel-notes-text');

    if (srcEl) {
      if (source === 'fyrirtaeki') {
        srcEl.style.background = '#e0e7ff';
        srcEl.style.color = '#3730a3';
        srcEl.textContent = '🏢 B2B';
      } else if (source === 'walkin') {
        srcEl.style.background = '#f1f5f9';
        srcEl.style.color = '#475569';
        srcEl.textContent = '⚡ STAÐGREITT';
      } else {
        srcEl.style.background = '#dbeafe';
        srcEl.style.color = '#1e40af';
        srcEl.textContent = '👤 VIÐSK.';
      }
    }

    // Remember which customer this card refers to so the "Sjá" button can
    // route to the correct profile.
    card.dataset.id = m.id != null ? String(m.id) : '';
    card.dataset.source = source || '';
    card.dataset.kt = (m.kennitala || '').replace(/[^0-9]/g, '');

    // Hide "Sjá →" button for walk-ins (no profile to open)
    const openBtn = document.getElementById('_ups-sel-open');
    if (openBtn) {
      openBtn.style.display = (source === 'walkin' || !m.id) ? 'none' : '';
    }

    if (nafnEl) nafnEl.textContent = m.nafn || '—';
    if (ktEl) ktEl.textContent = m.kennitala ? 'kt. ' + m.kennitala : '';

    // Meta line: phone + heimilisfang
    const metaParts = [];
    if (m.simi) metaParts.push('📞 ' + m.simi);
    if (m.farsimi && m.farsimi !== m.simi) metaParts.push('📱 ' + m.farsimi);
    const heim = m.heimilisfang || m.heimilisFang;
    if (heim) metaParts.push('📍 ' + heim);
    if (metaEl) metaEl.innerHTML = metaParts.map(p => esc(p)).join(' &nbsp;·&nbsp; ');

    // Discount badge
    if (discEl) {
      const pct = +m.afslattur_pct || 0;
      if (pct > 0) {
        discEl.textContent = '🎯 Sjálfgefinn afsláttur: ' + pct + '%';
        discEl.style.display = '';
      } else {
        discEl.style.display = 'none';
      }
    }

    // Tilboðsverð / Sérkjör info — count entries from AppSettings
    // (company_pricing for B2B, vidsk_pricing for individual customers)
    if (pricingEl && m.id) {
      let pricingList = [];
      let label = '💰 tilboðsverð';
      let icon = '💰';
      try {
        const key = source === 'fyrirtaeki' ? 'company_pricing' : 'vidsk_pricing';
        if (source === 'vidskiptavinir') { label = '💎 sérkjör'; icon = '💎'; }
        const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(key)) || {};
        pricingList = (stored && stored[String(m.id)]) || [];
      } catch (_) {}
      if (pricingList.length) {
        const summary = pricingList.slice(0, 3).map(p => p.name).join(', ') + (pricingList.length > 3 ? ' +' + (pricingList.length - 3) + ' fleiri' : '');
        pricingEl.innerHTML = icon + ' <strong>' + pricingList.length + ' ' + label + '</strong> — beitt sjálfvirkt á körfu-línur. (' + esc(summary) + ')';
        pricingEl.style.display = '';
      } else {
        pricingEl.style.display = 'none';
      }
    }

    // Athugasemdir — always overwrite the text (so a stale value from a
    // previous customer doesn't linger in the DOM, even if hidden).
    if (notesEl && notesTextEl) {
      const notes = (m.athugasemdir || '').trim();
      notesTextEl.textContent = notes;
      notesEl.style.display = notes ? '' : 'none';
    }

    // Show the card
    card.style.display = '';

    // Wire clear-button (only once)
    const clearBtn = document.getElementById('_ups-sel-clear');
    if (clearBtn && !clearBtn.dataset._wired) {
      clearBtn.dataset._wired = '1';
      clearBtn.addEventListener('click', () => {
        clearSelectedCard();
      });
    }

    // Wire open-profile button (only once) — routes to the right view
    const openBtn2 = document.getElementById('_ups-sel-open');
    if (openBtn2 && !openBtn2.dataset._wired) {
      openBtn2.dataset._wired = '1';
      openBtn2.addEventListener('click', () => {
        const card2 = document.getElementById('_ups-selected');
        const id = card2 && card2.dataset.id;
        const src = card2 && card2.dataset.source;
        if (!id) return;
        openCustomerProfile(id, src);
      });
    }
  }

  // Open the customer profile in the right view based on source
  async function openCustomerProfile(id, source) {
    if (source === 'fyrirtaeki') {
      // Companies side — uses helper that handles view switch + open race
      if (typeof window._openCompanySafe === 'function') {
        window._openCompanySafe(id);
        return;
      }
      // Fallback: switch view + open detail manually
      if (window.App && typeof App.switchView === 'function') App.switchView('companies');
      setTimeout(() => {
        if (window.Companies && typeof Companies.openDetail === 'function') {
          Companies.openDetail(id);
        }
      }, 250);
      return;
    }

    // Vidskiptavinir — the revamp module keeps its customers array in
    // closure; Vidskiptavinir.list can be overwritten without populating
    // the closure. We must call .load() so openDetail can find the record.
    if (window.App && typeof App.switchView === 'function') App.switchView('vidskiptavinir');

    if (!window.Vidskiptavinir) {
      // Module not ready — wait briefly and retry
      setTimeout(() => openCustomerProfile(id, source), 300);
      return;
    }

    // Ensure customers list is loaded into the module's closure
    try {
      if (typeof Vidskiptavinir.load === 'function') {
        await Vidskiptavinir.load();
      }
    } catch (e) {
      console.warn('[unified-pos-search] Vidskiptavinir.load failed:', e);
    }

    // Now openDetail can find the customer in its closure array
    if (typeof Vidskiptavinir.openDetail === 'function') {
      const list = (Vidskiptavinir.list && Vidskiptavinir.list.length) ? Vidskiptavinir.list : getVidsk();
      const c = list.find(x => String(x.id) === String(id)) || { id };
      // Trigger render — switch the module's view to detail
      Vidskiptavinir.openDetail(c);
      // Force a refresh in case render didn't trigger
      setTimeout(() => {
        if (typeof Vidskiptavinir.refresh === 'function' && !document.querySelector('#vidsk-main #vk-back')) {
          // Detail didn't render — call again
          Vidskiptavinir.openDetail(c);
        }
      }, 200);
    }
  }

  function clearSelectedCard() {
    const card = document.getElementById('_ups-selected');
    if (card) card.style.display = 'none';
    const ktInp = document.getElementById('pos-kt');
    if (ktInp) {
      ktInp.value = '';
      ktInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const r = document.getElementById('pos-kt-result');
    if (r) r.innerHTML = '';
    const search = document.getElementById('_ups-search');
    if (search) { search.value = ''; search.focus(); }
  }

  // ── Watch for Sala view rendering ────────────────────────────────────────
  function watch() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(watch, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectUnifiedSearch, 200);
    }).observe(view, { childList: true, subtree: true });
  }
  watch();
  setTimeout(injectUnifiedSearch, 1500);
  setInterval(injectUnifiedSearch, 2000);
  // Pre-fetch customers as soon as the patch loads so the first search is instant
  setTimeout(prefetchCustomers, 800);

  console.log('[unified-pos-search] installed — single search bar + Staðgreitt walk-in flow');
})();
/* === END UNIFIED POS SEARCH v1 === */
