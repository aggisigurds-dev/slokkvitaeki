/* === POS FIXES v4 === */
/* (1) Hide Gæðakerfi/Staðfesta block on Afgreiðsla view.
   (2) Auto-search on the Sala kennitala (#pos-kt) and name (#pos-nafn) inputs.
   (3) Custom sort for Áfylling cards in Sala #pos-services list:
       2kg ABC → 6kg ABC → 12kg ABC → 2kg CO₂ → 5kg CO₂ → Léttvatnstækis 6kg
       (other Áfylling and non-Áfylling services keep their original order).
   (4) Remove the 5 floating .sm-toolbtn buttons.
   (5) Hide the old .company-grid card layout at the bottom of Viðskiptavinir (Gömul tæki, Til reiknings,
       Afgreiðsla, Móttekið í dag, Móttaka tækis) entirely. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__posFixesInstalled) return;
  window.__posFixesInstalled = true;

  // ---------- Styles ----------
  const STYLE_ID = 'pos-fixes-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* (1) hide Gæðakerfi/Staðfesta zone + old Viðskiptavinir card grid */
      ._gk_sig_zone { display: none !important; }
      #view-vidskiptavinir .company-grid { display: none !important; }
      /* (4) remove the 5 floating tool buttons */
      .sm-toolbtn { display: none !important; }
      body.has-mobnav { padding-bottom: 0 !important; }

      #pos-kt-suggestions {
        position: absolute; z-index: 9999;
        background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(15,23,42,0.12);
        max-height: 320px; overflow-y: auto;
        min-width: 280px; max-width: 420px;
        font-size: 13px; padding: 4px 0;
      }
      #pos-kt-suggestions .pos-sug-item {
        padding: 8px 12px; cursor: pointer;
        border-bottom: 1px solid #f1f5f9;
        transition: background .1s;
      }
      #pos-kt-suggestions .pos-sug-item:last-child { border-bottom: none; }
      #pos-kt-suggestions .pos-sug-item:hover,
      #pos-kt-suggestions .pos-sug-item.active { background: #eff6ff; }
      #pos-kt-suggestions .pos-sug-name {
        font-weight: 600; color: #0f172a; line-height: 1.3;
      }
      #pos-kt-suggestions .pos-sug-meta {
        color: #64748b; font-size: 12px; margin-top: 2px;
      }
      #pos-kt-suggestions .pos-sug-empty {
        padding: 12px; color: #94a3b8; font-style: italic; text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  // ---------- (4) Active removal of .sm-toolbtn nodes ----------
  function removeToolButtons() {
    const btns = document.querySelectorAll('.sm-toolbtn');
    let n = 0;
    for (const b of btns) {
      try { b.parentNode?.removeChild(b); n++; } catch (e) {}
    }
    return n;
  }

  // ---------- (2) Auto-search ----------
  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__posFixesSB) {
      window.__posFixesSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__posFixesSB;
  }
  function removeBox() { document.getElementById('pos-kt-suggestions')?.remove(); }
  function fillFromMatch(m) {
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    const simiInput = document.getElementById('pos-simi');
    if (ktInput && m.kennitala) ktInput.value = m.kennitala;
    if (nafnInput && m.nafn) nafnInput.value = m.nafn;
    if (simiInput && m.simi) simiInput.value = m.simi;
    [ktInput, nafnInput, simiInput].forEach(el => {
      if (!el) return;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    removeBox();
  }
  function showBox(matches, anchorEl) {
    removeBox();
    if (!anchorEl) return;
    const box = document.createElement('div');
    box.id = 'pos-kt-suggestions';
    if (matches.length === 0) {
      const e = document.createElement('div');
      e.className = 'pos-sug-empty';
      e.textContent = 'Engin samsvörun';
      box.appendChild(e);
    } else {
      for (const m of matches) {
        const item = document.createElement('div');
        item.className = 'pos-sug-item';
        const name = document.createElement('div');
        name.className = 'pos-sug-name';
        name.textContent = m.nafn || '(ónefnt)';
        const meta = document.createElement('div');
        meta.className = 'pos-sug-meta';
        const parts = [];
        if (m.kennitala) parts.push(m.kennitala);
        if (m.simi) parts.push('📞 ' + m.simi);
        meta.textContent = parts.join(' · ');
        item.appendChild(name);
        item.appendChild(meta);
        item.addEventListener('mousedown', (e) => { e.preventDefault(); fillFromMatch(m); });
        box.appendChild(item);
      }
    }
    const r = anchorEl.getBoundingClientRect();
    box.style.left = (r.left + window.scrollX) + 'px';
    box.style.top = (r.bottom + window.scrollY + 4) + 'px';
    box.style.minWidth = Math.max(280, r.width) + 'px';
    document.body.appendChild(box);
  }
  let timer = null;
  let activeRequest = 0;
  function debouncedSearch(field, value, anchorEl) {
    clearTimeout(timer);
    const v = (value || '').trim();
    if (v.length < 2) { removeBox(); return; }
    timer = setTimeout(async () => {
      const SB = getSB();
      if (!SB) return;
      const reqId = ++activeRequest;
      try {
        let q;
        if (field === 'kt') {
          const digits = v.replace(/\D/g, '');
          if (digits.length < 2) { removeBox(); return; }
          q = SB.from('vidskiptavinir')
            .select('kennitala, nafn, simi')
            .or('kennitala.ilike.' + digits + '%,kennitala.ilike.' + digits.slice(0,6) + '-' + digits.slice(6) + '%')
            .limit(8);
        } else {
          q = SB.from('vidskiptavinir')
            .select('kennitala, nafn, simi')
            .ilike('nafn', '%' + v + '%')
            .limit(8);
        }
        const { data, error } = await q;
        if (reqId !== activeRequest) return;
        if (error) return;
        showBox(data || [], anchorEl);
      } catch (e) {}
    }, 180);
  }
  const BOUND = '__posFixesBound';
  function bindInputs() {
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    if (ktInput && !ktInput[BOUND]) {
      ktInput[BOUND] = true;
      ktInput.setAttribute('autocomplete', 'off');
      ktInput.addEventListener('input', () => debouncedSearch('kt', ktInput.value, ktInput));
      ktInput.addEventListener('focus', () => {
        if (ktInput.value.trim().length >= 2) debouncedSearch('kt', ktInput.value, ktInput);
      });
      ktInput.addEventListener('blur', () => setTimeout(removeBox, 180));
      ktInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') removeBox(); });
    }
    if (nafnInput && !nafnInput[BOUND]) {
      nafnInput[BOUND] = true;
      nafnInput.setAttribute('autocomplete', 'off');
      nafnInput.addEventListener('input', () => debouncedSearch('nafn', nafnInput.value, nafnInput));
      nafnInput.addEventListener('focus', () => {
        if (nafnInput.value.trim().length >= 2) debouncedSearch('nafn', nafnInput.value, nafnInput);
      });
      nafnInput.addEventListener('blur', () => setTimeout(removeBox, 180));
      nafnInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') removeBox(); });
    }
  }

  // ---------- (3) Custom sort for Áfylling cards ----------
  function rankOf(text) {
    const t = (text || '').replace(/\s+/g, ' ');
    if (/Áfylling\s*2\s*kg\s*ABC/i.test(t)) return 1;
    if (/Áfylling\s*6\s*kg\s*ABC/i.test(t)) return 2;
    if (/Áfylling\s*12\s*kg\s*ABC/i.test(t)) return 3;
    if (/Áfylling\s*2\s*kg\s*CO/i.test(t)) return 4;
    if (/Áfylling\s*5\s*kg\s*CO/i.test(t)) return 5;
    if (/Áfylling\s*Léttvatns/i.test(t)) return 6;
    return null;
  }
  let isReordering = false;
  function reorderServices() {
    if (isReordering) return;
    const container = document.getElementById('pos-services');
    if (!container) return;
    const kids = Array.from(container.children);
    if (kids.length < 2) return;
    const decorated = kids.map((el, i) => {
      const r = rankOf(el.textContent);
      return { el, rank: r != null ? r : (100 + i), orig: i };
    });
    const target = decorated.slice().sort((a, b) => a.rank - b.rank || a.orig - b.orig);
    let already = true;
    for (let i = 0; i < target.length; i++) {
      if (target[i].el !== kids[i]) { already = false; break; }
    }
    if (already) return;
    isReordering = true;
    try {
      const frag = document.createDocumentFragment();
      for (const d of target) frag.appendChild(d.el);
      container.appendChild(frag);
    } finally {
      setTimeout(() => { isReordering = false; }, 0);
    }
  }

  // ---------- Init + watchers ----------
  function tick() {
    removeToolButtons();
    bindInputs();
    reorderServices();
  }
  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 1000);
  setTimeout(tick, 2500);

  // Watch for late-rendered nodes
  const obs = new MutationObserver((muts) => {
    let needRemove = false;
    let touchedServices = false;
    for (const m of muts) {
      if (m.type === 'childList') {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.classList?.contains('sm-toolbtn')) { needRemove = true; }
          if (n.querySelector?.('.sm-toolbtn')) { needRemove = true; }
          if (n.id === 'pos-services' || n.querySelector?.('#pos-services')) { touchedServices = true; }
        }
      }
      if (m.target.id === 'pos-services' || m.target.closest?.('#pos-services')) { touchedServices = true; }
    }
    if (needRemove) removeToolButtons();
    bindInputs();
    if (touchedServices) reorderServices();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'pos-kt' || e.target.id === 'pos-nafn') return;
    if (e.target.closest('#pos-kt-suggestions')) return;
    removeBox();
  });

  window.PosFixes = {
    rebind: bindInputs,
    reorder: reorderServices,
    removeButtons: removeToolButtons,
    version: 'v4'
  };
})();
/* === END POS FIXES === */
