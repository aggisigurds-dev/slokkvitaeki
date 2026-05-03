/* === SALA SUITE v3 (2026-04-30) === */

/* =============================================================
   SALA — Móttaka tækis frá viðskiptavin
   =============================================================
   Flow:
     1) Search vidskiptavinir + fyrirtaeki (autocomplete)
        -> "+ Nýr viðskiptavinur" if no match
     2) Intake form: add 1..N tæki
        -> on serial blur: lookup uttaeki, prefill if found
        -> mode toggle: one verkbeiðni for all  vs  one per tæki
     3) Submit:
        -> upsert uttaeki rows (status='Móttekið', location='Verkstæði')
        -> insert verkbeiðni(r) with auto-incremented num
        -> success modal with ticket number(s)

   Append to patch-master.js, or load as separate <script defer>.
   Self-contained: own styles, own modal infra, no external deps
   beyond window.sb (Supabase JS client).
   ============================================================= */
(() => {
  const TAG = '[sala-mottaka]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  /* ---------- Supabase access ---------- */
  const sb = () => window.sb || window.supabase || null;
  async function waitForSB(timeoutMs = 15000) {
    const t0 = Date.now();
    while (!sb() && Date.now() - t0 < timeoutMs) {
      await new Promise(r => setTimeout(r, 100));
    }
    return sb();
  }

  /* ---------- Styles ---------- */
  const STYLE_ID = 'sala-mottaka-style';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .sm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9000;
        display:flex; align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto; }
      .sm-modal { background:#fff; border-radius:12px; max-width:720px; width:100%;
        box-shadow:0 20px 60px rgba(0,0,0,.3); margin:24px auto; }
      .sm-head { padding:14px 18px; border-bottom:1px solid #e5e7eb;
        display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .sm-head h3 { margin:0; font-size:17px; }
      .sm-x { background:none; border:none; font-size:26px; line-height:1; cursor:pointer; color:#6b7280; padding:2px 8px; }
      .sm-body { padding:14px 18px; }
      .sm-foot { padding:12px 18px; border-top:1px solid #e5e7eb;
        display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
      .sm-input, .sm-select { width:100%; padding:10px 12px; border:1px solid #d1d5db;
        border-radius:8px; font-size:14px; box-sizing:border-box; background:#fff; }
      .sm-input:focus, .sm-select:focus { outline:none; border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.15); }
      .sm-row { display:flex; gap:8px; flex-wrap:wrap; }
      .sm-row > * { flex:1 1 140px; }
      .sm-label { display:block; font-size:12px; font-weight:600; color:#374151; margin:0 0 4px; }
      .sm-results { max-height:340px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; margin-top:8px; }
      .sm-result { padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;
        display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .sm-result:last-child { border-bottom:none; }
      .sm-result:hover, .sm-result.active { background:#f3f4f6; }
      .sm-result-main { flex:1; min-width:0; }
      .sm-result-name { font-weight:600; }
      .sm-result-meta { font-size:12px; color:#6b7280; margin-top:2px; }
      .sm-badge { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; }
      .sm-badge-cust  { background:#dbeafe; color:#1e40af; }
      .sm-badge-comp  { background:#fef3c7; color:#92400e; }
      .sm-badge-known { background:#d1fae5; color:#065f46; }
      .sm-badge-new   { background:#e0e7ff; color:#3730a3; }
      .sm-btn { padding:10px 14px; border-radius:8px; border:1px solid #d1d5db; background:#fff;
        cursor:pointer; font-size:14px; font-weight:500; }
      .sm-btn:hover { background:#f9fafb; }
      .sm-btn-pri { background:#2563eb; color:#fff; border-color:#2563eb; }
      .sm-btn-pri:hover { background:#1d4ed8; }
      .sm-btn-pri:disabled { background:#9ca3af; border-color:#9ca3af; cursor:not-allowed; }
      .sm-btn-danger { color:#b91c1c; border-color:#fecaca; }
      .sm-btn-danger:hover { background:#fef2f2; }
      .sm-toolbtn { padding:10px 14px; border-radius:8px; border:1px solid #2563eb;
        background:#2563eb; color:#fff; cursor:pointer; font-weight:600; font-size:14px; }
      .sm-tile { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:8px; }
      .sm-tile-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px; }
      .sm-tile-title { font-weight:600; }
      .sm-empty { text-align:center; color:#6b7280; padding:20px; font-size:13px; }
      .sm-customer-card { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;
        padding:12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .sm-radios { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .sm-radio { flex:1 1 200px; border:1px solid #d1d5db; border-radius:8px; padding:10px 12px;
        cursor:pointer; display:flex; gap:10px; align-items:center; background:#fff; }
      .sm-radio.active { background:#eff6ff; border-color:#2563eb; }
      .sm-radio input { margin:0; }
      .sm-success { background:#d1fae5; border:1px solid #10b981; border-radius:8px; padding:18px; text-align:center; }
      .sm-success-title { font-size:18px; font-weight:700; color:#065f46; margin-bottom:6px; }
      .sm-success-num { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:24px;
        color:#065f46; font-weight:700; letter-spacing:.5px; }
      .sm-err { background:#fee2e2; border:1px solid #fca5a5; color:#991b1b;
        padding:10px; border-radius:8px; margin:8px 0; font-size:13px; }
      .sm-spacer-sm { height:6px; }
      .sm-spacer-md { height:10px; }
      @media (max-width: 600px) {
        .sm-overlay { padding:0; }
        .sm-modal { margin:0 auto; border-radius:0; min-height:100vh; max-width:100%; }
        .sm-head, .sm-body, .sm-foot { padding-left:14px; padding-right:14px; }
        .sm-row > * { flex:1 1 100%; }
        .sm-foot { position:sticky; bottom:0; background:#fff; }
      }
    `;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Modal infra ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    // Esc to close
    const onKey = e => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
    return modal;
  }

  /* ---------- Helpers ---------- */
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  /* ---------- Data layer ---------- */
  async function searchCustomers(q) {
    const c = sb();
    if (!c) return { vidsk: [], fyrir: [] };
    const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
    const [vRes, fRes] = await Promise.all([
      c.from('vidskiptavinir')
        .select('id,nafn,kennitala,simi,netfang,heimilisfang')
        .or(`nafn.ilike.${like},kennitala.ilike.${like},simi.ilike.${like}`)
        .limit(8),
      c.from('fyrirtaeki')
        .select('*')
        .or(`nafn.ilike.${like},kennitala.ilike.${like}`)
        .limit(8)
        .then(r => r, () => ({ data: [] })),
    ]);
    return {
      vidsk: vRes && vRes.data ? vRes.data : [],
      fyrir: fRes && fRes.data ? fRes.data : [],
    };
  }

  async function lookupTaeki(serial) {
    const c = sb();
    if (!c || !serial) return null;
    const { data } = await c.from('uttaeki')
      .select('*')
      .eq('serial', serial.trim())
      .limit(1);
    return data && data[0] ? data[0] : null;
  }

  async function nextVerkNum() {
    const c = sb();
    if (!c) return Date.now();
    const { data } = await c.from('verkbeidnir')
      .select('num')
      .order('num', { ascending: false })
      .limit(1);
    const top = data && data[0] && Number(data[0].num);
    return Number.isFinite(top) ? top + 1 : 1001;
  }

  async function createIntake({ customer, items, mode }) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');

    const customerName  = customer.nafn || customer.name || '—';
    const customerPhone = customer.simi || '';
    const dropoff = todayISO();
    const startNum = await nextVerkNum();

    // 1) Upsert tæki
    const taekiResults = [];
    for (const it of items) {
      const payload = {
        serial:   it.serial.trim(),
        type:     it.type   || null,
        size:     it.size   || null,
        client:   customerName,
        phone:    customerPhone || null,
        location: 'Verkstæði',
        status:   'Móttekið',
        notes:    it.notes  || null,
      };
      if (it.existingId) {
        const { error } = await c.from('uttaeki').update(payload).eq('id', it.existingId);
        if (error) throw error;
        taekiResults.push({ ...it, id: it.existingId });
      } else {
        const { data, error } = await c.from('uttaeki').insert(payload).select().single();
        if (error) throw error;
        taekiResults.push({ ...it, id: data.id });
      }
    }

    // 2) Verkbeiðni rows
    const fmt = t => `${t.serial}${t.type ? ' / ' + t.type : ''}${t.size ? ' / ' + t.size : ''}${t.notes ? ' — ' + t.notes : ''}`;
    const verkRows = mode === 'one'
      ? [{
          num: startNum,
          status: 'Í vinnslu',
          customer: customerName,
          phone: customerPhone || null,
          dropoff,
          notes: taekiResults.map(fmt).join('\n'),
        }]
      : taekiResults.map((t, i) => ({
          num: startNum + i,
          status: 'Í vinnslu',
          customer: customerName,
          phone: customerPhone || null,
          dropoff,
          notes: fmt(t),
        }));

    const { data: verkData, error: verkErr } = await c.from('verkbeidnir').insert(verkRows).select();
    if (verkErr) throw verkErr;
    return { verk: verkData || verkRows, taeki: taekiResults };
  }

  async function createCustomer(p) {
    const c = sb();
    const { data, error } = await c.from('vidskiptavinir').insert({
      nafn:      (p.nafn || '').trim(),
      kennitala: (p.kennitala || '').trim() || null,
      simi:      (p.simi || '').trim() || null,
      netfang:   (p.netfang || '').trim() || null,
    }).select().single();
    if (error) throw error;
    return data;
  }

  /* ---------- UI: customer search ---------- */
  function openSearch() {
    injectStyles();
    const body = el('div');
    const input = el('input', {
      class: 'sm-input',
      type: 'search',
      placeholder: 'Nafn, kennitala eða sími…',
      autocomplete: 'off',
      inputMode: 'search',
    });
    const results = el('div', { class: 'sm-results' });
    results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn til að leita' }));

    body.append(
      el('label', { class: 'sm-label', text: 'Leita að viðskiptavini eða fyrirtæki' }),
      input,
      results,
    );

    function renderResults(rows) {
      results.innerHTML = '';
      if (!rows.length) {
        results.appendChild(el('div', { class: 'sm-empty', text: 'Engar niðurstöður — prófaðu „+ Nýr viðskiptavinur"' }));
        return;
      }
      rows.forEach(r => {
        const node = el('div', {
          class: 'sm-result',
          on: { click: () => {
            closeModal();
            if (typeof window.salaOnCustomerPicked === 'function') window.salaOnCustomerPicked(r);
            else openIntake(r);
          } },
        }, [
          el('div', { class: 'sm-result-main' }, [
            el('div', { class: 'sm-result-name', text: r.nafn || r.name || '—' }),
            el('div', { class: 'sm-result-meta',
              text: [r.kennitala, r.simi].filter(Boolean).join(' · ') }),
          ]),
          el('span', {
            class: 'sm-badge ' + (r._kind === 'fyrir' ? 'sm-badge-comp' : 'sm-badge-cust'),
            text: r._kind === 'fyrir' ? 'Fyrirtæki' : 'Viðskiptavinur',
          }),
        ]);
        results.appendChild(node);
      });
    }

    const doSearch = debounce(async (q) => {
      q = (q || '').trim();
      if (q.length < 2) {
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn að minnsta kosti 2 stafi' }));
        return;
      }
      results.innerHTML = '';
      results.appendChild(el('div', { class: 'sm-empty', text: 'Leita…' }));
      try {
        const { vidsk, fyrir } = await searchCustomers(q);
        const all = [
          ...vidsk.map(v => ({ ...v, _kind: 'vidsk' })),
          ...fyrir.map(f => ({ ...f, _kind: 'fyrir' })),
        ];
        renderResults(all);
      } catch (e) {
        warn('search err', e);
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
      }
    }, 220);

    input.addEventListener('input', () => doSearch(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.sm-result');
        if (first) first.click();
      }
    });

    const newBtn = el('button', {
      class: 'sm-btn',
      text: '+ Nýr viðskiptavinur',
      on: { click: () => { closeModal(); openNewCustomer(input.value.trim()); } },
    });
    const cancelBtn = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal } });

    openModal('Móttaka tækis — leita', body, [newBtn, cancelBtn]);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- UI: new customer ---------- */
  function openNewCustomer(prefillName = '') {
    const body = el('div');
    const f = {
      nafn:      el('input', { class: 'sm-input', placeholder: 'Fullt nafn', value: prefillName, required: true }),
      kennitala: el('input', { class: 'sm-input', placeholder: '000000-0000', inputMode: 'numeric' }),
      simi:      el('input', { class: 'sm-input', placeholder: '+354 …', type: 'tel' }),
      netfang:   el('input', { class: 'sm-input', placeholder: 'tölvupóstur', type: 'email' }),
    };
    body.append(
      el('label', { class: 'sm-label', text: 'Nafn *' }), f.nafn, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Kennitala' }), f.kennitala, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Sími' }), f.simi, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Netfang' }), f.netfang,
    );
    const errBox = el('div'); body.appendChild(errBox);

    const back = el('button', {
      class: 'sm-btn',
      text: '← Til baka',
      on: { click: () => { closeModal(); openSearch(); } },
    });
    const save = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Vista og halda áfram',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!f.nafn.value.trim()) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Nafn er nauðsynlegt' }));
          return;
        }
        save.disabled = true;
        try {
          const c = await createCustomer({
            nafn: f.nafn.value, kennitala: f.kennitala.value,
            simi: f.simi.value, netfang: f.netfang.value,
          });
          closeModal();
          if (typeof window.salaOnCustomerPicked === 'function') {
            window.salaOnCustomerPicked({ ...c, _kind: 'vidsk' });
          } else {
            openIntake({ ...c, _kind: 'vidsk' });
          }
        } catch (e) {
          save.disabled = false;
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });
    openModal('Nýr viðskiptavinur', body, [back, save]);
    setTimeout(() => f.nafn.focus(), 50);
  }

  /* ---------- UI: intake ---------- */
  function openIntake(customer) {
    const body = el('div');
    const items = [];

    /* Customer card */
    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: customer.nafn || customer.name || '—' }),
        el('div', { style: 'font-size:12px;color:#374151',
          text: [customer.kennitala, customer.simi].filter(Boolean).join(' · ') }),
      ]),
      el('button', {
        class: 'sm-btn',
        text: 'Breyta',
        on: { click: () => { closeModal(); openSearch(); } },
      }),
    ]));

    /* Mode toggle */
    let mode = 'one';
    const radios = el('div', { class: 'sm-radios' });
    const rOne = el('div', { class: 'sm-radio active' }, [
      el('input', { type: 'radio', name: 'sm-mode', checked: true }),
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: 'Eitt verk fyrir allt' }),
        el('div', { style: 'font-size:12px;color:#6b7280', text: 'Ein verkbeiðni nær yfir öll tæki' }),
      ]),
    ]);
    const rEach = el('div', { class: 'sm-radio' }, [
      el('input', { type: 'radio', name: 'sm-mode' }),
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: 'Eitt verk per tæki' }),
        el('div', { style: 'font-size:12px;color:#6b7280', text: 'Sjálfstætt verkbeiðni-númer á hvert tæki' }),
      ]),
    ]);
    function setMode(m) {
      mode = m;
      rOne.classList.toggle('active', m === 'one');
      rEach.classList.toggle('active', m === 'each');
      rOne.querySelector('input').checked = (m === 'one');
      rEach.querySelector('input').checked = (m === 'each');
    }
    rOne.addEventListener('click', () => setMode('one'));
    rEach.addEventListener('click', () => setMode('each'));
    radios.append(rOne, rEach);
    body.appendChild(radios);

    /* Tæki list */
    const list = el('div'); body.appendChild(list);

    function renderItems() {
      list.innerHTML = '';
      if (!items.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin tæki — bættu við hér að neðan.' }));
        return;
      }
      items.forEach((it, idx) => {
        const tile = el('div', { class: 'sm-tile' });

        const badges = [];
        if (it.existingId) badges.push(el('span', { class: 'sm-badge sm-badge-known', text: 'Þekkt' }));
        else if (it.serial && it._lookedUp) badges.push(el('span', { class: 'sm-badge sm-badge-new', text: 'Nýtt' }));

        tile.appendChild(el('div', { class: 'sm-tile-head' }, [
          el('div', { class: 'sm-tile-title', text: 'Tæki ' + (idx + 1) }),
          el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
            ...badges,
            el('button', {
              class: 'sm-btn sm-btn-danger',
              text: '×',
              title: 'Fjarlægja',
              on: { click: () => { items.splice(idx, 1); renderItems(); } },
            }),
          ]),
        ]));

        const serialIn = el('input', { class: 'sm-input', placeholder: 'Raðnúmer / serial', value: it.serial || '' });
        const typeIn   = el('input', { class: 'sm-input', placeholder: 'Tegund (CO2, ABC, vatns…)', value: it.type || '' });
        const sizeIn   = el('input', { class: 'sm-input', placeholder: 'Stærð (kg/L)', value: it.size || '' });
        const notesIn  = el('input', { class: 'sm-input', placeholder: 'Athugasemd', value: it.notes || '' });

        serialIn.addEventListener('input', () => { it.serial = serialIn.value; });
        typeIn  .addEventListener('input', () => { it.type   = typeIn.value;   });
        sizeIn  .addEventListener('input', () => { it.size   = sizeIn.value;   });
        notesIn .addEventListener('input', () => { it.notes  = notesIn.value;  });

        // Lookup on blur or Enter
        const doLookup = async () => {
          const v = (serialIn.value || '').trim();
          if (!v) return;
          try {
            const found = await lookupTaeki(v);
            it._lookedUp = true;
            if (found) {
              it.existingId = found.id;
              if (!it.type) { it.type = found.type || ''; typeIn.value = it.type; }
              if (!it.size) { it.size = found.size || ''; sizeIn.value = it.size; }
            } else {
              it.existingId = null;
            }
            renderItems();
          } catch (e) { warn('lookup err', e); }
        };
        serialIn.addEventListener('blur', doLookup);
        serialIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLookup(); }});

        tile.append(
          el('label', { class: 'sm-label', text: 'Raðnúmer' }), serialIn,
          el('div', { class: 'sm-spacer-sm' }),
          el('div', { class: 'sm-row' }, [
            el('div', {}, [el('label', { class: 'sm-label', text: 'Tegund' }), typeIn]),
            el('div', {}, [el('label', { class: 'sm-label', text: 'Stærð'  }), sizeIn]),
          ]),
          el('div', { class: 'sm-spacer-sm' }),
          el('label', { class: 'sm-label', text: 'Athugasemd' }), notesIn,
        );
        list.appendChild(tile);
      });
    }

    body.appendChild(el('button', {
      class: 'sm-btn',
      style: 'width:100%;margin-top:8px',
      text: '+ Bæta við tæki',
      on: { click: () => { items.push({ serial: '', type: '', size: '', notes: '', existingId: null }); renderItems(); } },
    }));

    const errBox = el('div'); body.appendChild(errBox);

    // Start with one row
    items.push({ serial: '', type: '', size: '', notes: '', existingId: null });
    renderItems();

    const cancel = el('button', { class: 'sm-btn', text: 'Hætta við', on: { click: closeModal } });
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Stofna verkbeiðni',
      on: { click: async () => {
        errBox.innerHTML = '';
        const valid = items.filter(it => (it.serial || '').trim());
        if (!valid.length) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Bættu við að minnsta kosti einu tæki með raðnúmeri' }));
          return;
        }
        submit.disabled = true;
        submit.textContent = 'Vistar…';
        try {
          const result = await createIntake({ customer, items: valid, mode });
          showSuccess(result, customer);
        } catch (e) {
          submit.disabled = false;
          submit.textContent = 'Stofna verkbeiðni';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Móttaka tækis', body, [cancel, submit]);
  }

  /* ---------- UI: success ---------- */
  function showSuccess(result, customer) {
    const nums = (result.verk || []).map(v => v.num).join(', ');
    const body = el('div');
    body.appendChild(el('div', { class: 'sm-success' }, [
      el('div', { class: 'sm-success-title', text: 'Verkbeiðni stofnuð' }),
      el('div', { class: 'sm-success-num', text: '#' + nums }),
      el('div', { style: 'margin-top:8px', text: customer.nafn || customer.name || '' }),
      el('div', { style: 'font-size:13px;color:#065f46',
        text: result.taeki.length + ' tæki móttekin · ' + todayISO() }),
    ]));

    const newOne = el('button', {
      class: 'sm-btn',
      text: 'Ný móttaka',
      on: { click: () => { closeModal(); openSearch(); } },
    });
    const done = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Loka',
      on: { click: () => {
        closeModal();
        document.dispatchEvent(new CustomEvent('mottaka:done', { detail: { ...result, customer } }));
        if (typeof window.salaOnIntakeDone === 'function') {
          try { window.salaOnIntakeDone(customer, result); } catch (e) {}
        }
      }},
    });
    openModal('Tilbúið', body, [newOne, done]);
  }

  /* ---------- Entry button ---------- */
  function ensureButton() {
    if (document.getElementById('sm-mottaka-btn')) return;

    const candidates = [
      '#sala', '#sala-section', '[data-section="sala"]',
      '.sala', '.sala-page', '#salaTab', '[data-tab="sala"]',
    ];
    let host = null;
    for (const sel of candidates) {
      const n = document.querySelector(sel);
      if (n && n.offsetParent !== null) { host = n; break; }
    }

    const btn = el('button', {
      id: 'sm-mottaka-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '📥 Móttaka tækis',
      on: { click: openSearch },
    });

    if (host) {
      btn.style.margin = '8px 0 12px';
      host.insertBefore(btn, host.firstChild);
    } else {
      // FAB fallback
      btn.style.position = 'fixed';
      btn.style.right = '16px';
      btn.style.bottom = '16px';
      btn.style.zIndex = '8000';
      btn.style.boxShadow = '0 6px 20px rgba(37,99,235,.35)';
      document.body.appendChild(btn);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    injectStyles();
    await waitForSB(15000);
    ensureButton();
    // Re-attach if SPA re-renders the Sala area
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaMottaka = {
    open: openSearch,
    openCustomer: openIntake,
    openNewCustomer,
    version: '1.0.0',
  };
})();
/* =============================================================
   SALA DASHBOARD — extends sala-mottaka.js
   =============================================================
   Adds two buttons next to "📥 Móttaka tækis":
     - 📋 Móttekið í dag  → list today's verkbeiðnir, drill in
     - 📦 Afgreiðsla       → search any verk and complete pickup

   Verk detail modal supports two state actions:
     - ✓ Tilbúið          → status='Tilbúið'
     - 📦 Skrá afhendingu → status='Afhent', pickup=today,
                            linked uttaeki status='Sótt'

   Auto-refreshes today list when sala-mottaka fires
   `mottaka:done`. Reuses .sm-* styles from sala-mottaka.js.
   ============================================================= */
(() => {
  const TAG = '[sala-dashboard]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  const todayISO = () => new Date().toISOString().slice(0, 10);

  async function waitFor(check, timeoutMs = 20000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check();
      if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }

  /* ---------- Modal infra (independent so this file works alone) ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  /* ---------- Data ---------- */
  async function fetchTodayVerk() {
    const c = sb();
    if (!c) return [];
    const { data, error } = await c.from('verkbeidnir')
      .select('*')
      .eq('dropoff', todayISO())
      .order('num', { ascending: false });
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function fetchVerkBySearch(q) {
    const c = sb();
    if (!c) return [];
    const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
    const filters = [];
    if (!isNaN(Number(q)) && q.trim() !== '') filters.push(`num.eq.${Number(q)}`);
    filters.push(`customer.ilike.${like}`);
    filters.push(`phone.ilike.${like}`);
    const { data, error } = await c.from('verkbeidnir')
      .select('*')
      .or(filters.join(','))
      .order('num', { ascending: false })
      .limit(50);
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function updateVerkStatus(id, patch) {
    const c = sb();
    const { error } = await c.from('verkbeidnir').update(patch).eq('id', id);
    if (error) throw error;
  }

  async function updateTaekiStatus(serial, status) {
    const c = sb();
    const { error } = await c.from('uttaeki').update({ status }).eq('serial', serial);
    if (error) throw error;
  }

  function parseSerialsFromNotes(notes) {
    return (notes || '').split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return null;
        // Format from sala-mottaka: "SERIAL / type / size — note"
        const m = t.match(/^([^\s/—]+)/);
        return m ? m[1] : null;
      })
      .filter(s => s);
  }

  /* ---------- UI helpers ---------- */
  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('afh') || s.includes('sótt')) return 'sm-badge-comp';
    if (s.includes('tilb')) return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  function verkRow(v, onClick) {
    return el('div', {
      class: 'sm-result',
      on: { click: () => onClick(v) },
    }, [
      el('div', { class: 'sm-result-main' }, [
        el('div', { class: 'sm-result-name', text: '#' + (v.num ?? '—') + '  ·  ' + (v.customer || '—') }),
        el('div', { class: 'sm-result-meta',
          text: [v.phone, v.dropoff].filter(Boolean).join(' · ') }),
      ]),
      el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
    ]);
  }

  /* ---------- UI: today list ---------- */
  let todayRefreshHandler = null;
  function openTodayList() {
    const body = el('div');
    const list = el('div', { class: 'sm-results' });
    body.appendChild(list);

    const refresh = async () => {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'sm-empty', text: 'Sæki…' }));
      const rows = await fetchTodayVerk();
      list.innerHTML = '';
      if (!rows.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engar verkbeiðnir í dag' }));
        return;
      }
      rows.forEach(v => list.appendChild(verkRow(v, x => { closeModal(); openVerkDetail(x, openTodayList); })));
    };

    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    const closeBtn   = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    openModal('Móttekið í dag', body, [refreshBtn, closeBtn]);
    refresh();

    // Hook mottaka:done (cleanup on overlay removal)
    if (todayRefreshHandler) document.removeEventListener('mottaka:done', todayRefreshHandler);
    todayRefreshHandler = () => refresh();
    document.addEventListener('mottaka:done', todayRefreshHandler);
    const cleanup = () => {
      if (todayRefreshHandler) {
        document.removeEventListener('mottaka:done', todayRefreshHandler);
        todayRefreshHandler = null;
      }
    };
    const obs = new MutationObserver(() => {
      if (!activeOverlay || !document.body.contains(activeOverlay)) {
        cleanup();
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  }

  /* ---------- UI: verk detail ---------- */
  function openVerkDetail(v, onBack) {
    const body = el('div');

    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', { style: 'min-width:0' }, [
        el('div', { style: 'font-weight:700;font-size:18px', text: '#' + (v.num ?? '—') }),
        el('div', { style: 'font-weight:600;margin-top:2px', text: v.customer || '—' }),
        el('div', { style: 'font-size:12px;color:#374151;margin-top:2px',
          text: [v.phone, v.dropoff && ('Móttekið ' + v.dropoff), v.pickup && ('Sótt ' + v.pickup)].filter(Boolean).join(' · ') }),
      ]),
      el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
    ]));

    if (v.notes) {
      body.appendChild(el('div', { class: 'sm-tile' }, [
        el('div', { class: 'sm-tile-title', style: 'margin-bottom:6px', text: 'Tæki / athugasemd' }),
        el('div', { style: 'white-space:pre-wrap;font-size:13px;color:#374151', text: v.notes }),
      ]));
    }

    if (v.verd != null && v.verd !== '') {
      body.appendChild(el('div', {
        style: 'font-size:13px;color:#374151;margin:8px 0',
        text: 'Verð: ' + v.verd + ' kr',
      }));
    }

    const errBox = el('div'); body.appendChild(errBox);
    const status = (v.status || '').toLowerCase();
    const isAfhent = status.includes('afh') || status.includes('sótt');
    const isTilbuid = status.includes('tilb');

    const back = el('button', {
      class: 'sm-btn',
      text: '← Til baka',
      on: { click: () => { closeModal(); if (onBack) onBack(); } },
    });

    const ready = el('button', {
      class: 'sm-btn',
      text: '✓ Tilbúið',
      on: { click: async () => {
        errBox.innerHTML = '';
        ready.disabled = true;
        try {
          await updateVerkStatus(v.id, { status: 'Tilbúið' });
          closeModal();
          if (onBack) onBack();
        } catch (e) {
          ready.disabled = false;
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    const handover = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: '📦 Skrá afhendingu',
      on: { click: async () => {
        errBox.innerHTML = '';
        handover.disabled = true;
        handover.textContent = 'Vistar…';
        try {
          await updateVerkStatus(v.id, { status: 'Afhent', pickup: todayISO() });
          // Best-effort: update linked uttaeki by serial parsed from notes
          const serials = parseSerialsFromNotes(v.notes);
          for (const s of serials) {
            try { await updateTaekiStatus(s, 'Sótt'); }
            catch (e) { warn('taeki status update failed for', s, e); }
          }
          closeModal();
          if (onBack) onBack();
        } catch (e) {
          handover.disabled = false;
          handover.textContent = '📦 Skrá afhendingu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    const buttons = [back];
    if (!isTilbuid && !isAfhent) buttons.push(ready);
    if (!isAfhent) buttons.push(handover);

    openModal('Verkbeiðni #' + (v.num ?? '—'), body, buttons);
  }

  /* ---------- UI: Afgreiðsla search ---------- */
  function openHandover() {
    const body = el('div');
    const input = el('input', {
      class: 'sm-input',
      type: 'search',
      placeholder: 'Verk #, nafn eða sími…',
      autocomplete: 'off',
      inputMode: 'search',
    });
    const results = el('div', { class: 'sm-results' });
    results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn til að leita' }));
    body.append(
      el('label', { class: 'sm-label', text: 'Finna verkbeiðni til afhendingar' }),
      input,
      results,
    );

    let timer;
    const doSearch = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim();
        if (q.length < 2) {
          results.innerHTML = '';
          results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn að minnsta kosti 2 stafi' }));
          return;
        }
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-empty', text: 'Leita…' }));
        try {
          const rows = await fetchVerkBySearch(q);
          results.innerHTML = '';
          if (!rows.length) {
            results.appendChild(el('div', { class: 'sm-empty', text: 'Engar verkbeiðnir' }));
            return;
          }
          rows.forEach(v => results.appendChild(verkRow(v, x => {
            closeModal();
            openVerkDetail(x, openHandover);
          })));
        } catch (e) {
          warn('search err', e);
          results.innerHTML = '';
          results.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }, 220);
    };
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.sm-result');
        if (first) first.click();
      }
    });

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    openModal('Afgreiðsla — finna verkbeiðni', body, [close]);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- Buttons attachment ---------- */
  function ensureButtons() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;

    const isFab = moBtn.style.position === 'fixed';

    // 📋 Móttekið í dag
    if (!document.getElementById('sm-today-btn')) {
      const btn = el('button', {
        id: 'sm-today-btn',
        class: 'sm-toolbtn',
        type: 'button',
        text: '📋 Móttekið í dag',
        style: isFab
          ? 'position:fixed;right:16px;bottom:72px;z-index:8000;background:#059669;border-color:#059669;box-shadow:0 6px 20px rgba(5,150,105,.35)'
          : 'margin-left:8px;background:#059669;border-color:#059669',
        on: { click: openTodayList },
      });
      if (isFab) document.body.appendChild(btn);
      else moBtn.parentNode.insertBefore(btn, moBtn.nextSibling);
    }

    // 📦 Afgreiðsla
    if (!document.getElementById('sm-handover-btn')) {
      const btn = el('button', {
        id: 'sm-handover-btn',
        class: 'sm-toolbtn',
        type: 'button',
        text: '📦 Afgreiðsla',
        style: isFab
          ? 'position:fixed;right:16px;bottom:128px;z-index:8000;background:#7c3aed;border-color:#7c3aed;box-shadow:0 6px 20px rgba(124,58,237,.35)'
          : 'margin-left:8px;background:#7c3aed;border-color:#7c3aed',
        on: { click: openHandover },
      });
      if (isFab) document.body.appendChild(btn);
      else {
        const todayBtn = document.getElementById('sm-today-btn');
        const ref = todayBtn || moBtn;
        ref.parentNode.insertBefore(btn, ref.nextSibling);
      }
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 25000);
    ensureButtons();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureButtons(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaDashboard = {
    today: openTodayList,
    handover: openHandover,
    detail: openVerkDetail,
    version: '1.0.0',
  };
})();
/* =============================================================
   SALA CUSTOMER 360 — central per-customer view
   =============================================================
   Hooks into sala-mottaka.js: when a customer is picked from
   search, this opens a unified status view with all actions.

   Status semantics used here (uses verkbeidnir.status as the
   single source of truth — no schema change required):
     'Móttekið' / 'Í vinnslu'  → tæki at workshop, work pending
     'Tilbúið'                 → ready for pickup
     'Afhent'                  → picked up but not billed
     'Selt'                    → direct sale (skipped workshop)
     'Greitt'                  → invoiced/billed (terminal)

   Same conventions for uttaeki.status with 'Sótt' as the
   picked-up terminal state.
   ============================================================= */
(() => {
  const TAG = '[sala-c360]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtKr = n => {
    if (n == null || n === '') return '—';
    const num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('is-IS').format(num) + ' kr';
  };

  async function waitFor(check, timeoutMs = 25000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check(); if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }

  /* ---------- Modal infra (shares .sm-* styles with sala-mottaka) ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  /* ---------- C360-specific styles ---------- */
  const C360_STYLE_ID = 'sala-c360-style';
  function injectC360Styles() {
    if (document.getElementById(C360_STYLE_ID)) return;
    const css = `
      .c360-actions { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin:0 0 14px;
        position:sticky; top:0; background:#fff; padding:8px 0 10px; z-index:5; border-bottom:1px solid #e5e7eb; }
      .c360-act { padding:12px; border-radius:10px; border:1px solid #d1d5db; background:#fff;
        cursor:pointer; font-weight:600; font-size:14px; display:flex; align-items:center; justify-content:center; gap:6px; }
      .c360-act:hover { background:#f9fafb; }
      .c360-act-pri { background:#2563eb; color:#fff; border-color:#2563eb; }
      .c360-act-pri:hover { background:#1d4ed8; }
      .c360-act-warn { background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
      .c360-act-warn:hover { background:#ffedd5; }
      .c360-act-bill { background:#10b981; color:#fff; border-color:#10b981; }
      .c360-act-bill:hover { background:#059669; }
      .c360-act:disabled { opacity:.5; cursor:not-allowed; }
      .c360-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .c360-stat { flex:1 1 100px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
        padding:10px 12px; font-size:13px; text-align:center; }
      .c360-stat-num { font-size:20px; font-weight:700; color:#111827; display:block; }
      .c360-stat-bill { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      .c360-stat-bill .c360-stat-num { color:#065f46; }
      .c360-section { margin-bottom:14px; }
      .c360-section-h { display:flex; justify-content:space-between; align-items:center;
        font-size:12px; font-weight:700; color:#374151; text-transform:uppercase;
        letter-spacing:.5px; padding:6px 0; border-bottom:1px solid #e5e7eb; margin-bottom:6px; }
      .c360-item { display:flex; justify-content:space-between; align-items:center;
        padding:8px 4px; border-bottom:1px solid #f3f4f6; gap:8px; }
      .c360-item:last-child { border-bottom:none; }
      .c360-item-main { flex:1; min-width:0; }
      .c360-item-title { font-weight:600; font-size:14px; }
      .c360-item-meta { font-size:11px; color:#6b7280; margin-top:2px; line-height:1.3; }
      .c360-item-right { text-align:right; flex-shrink:0; }
      .c360-bill-row { background:#fffbeb; border:1px solid #fde68a; border-radius:8px;
        padding:10px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; }
      .c360-bill-row strong { color:#92400e; }
      .c360-pickline { display:flex; align-items:center; gap:10px; padding:10px;
        border:1px solid #e5e7eb; border-radius:8px; margin-bottom:6px; cursor:pointer; }
      .c360-pickline.checked { background:#eff6ff; border-color:#2563eb; }
      .c360-pickline input[type="checkbox"] { width:18px; height:18px; flex-shrink:0; }
      .c360-saleline { display:grid; grid-template-columns:1fr 60px 90px 30px; gap:6px; align-items:center; margin-bottom:6px; }
      .c360-saleline .sm-input { padding:8px; font-size:13px; }
      .c360-invoice { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;
        background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;
        white-space:pre-wrap; max-height:300px; overflow-y:auto; }
      @media (max-width: 600px) {
        .c360-actions { grid-template-columns:repeat(2, 1fr); }
        .c360-saleline { grid-template-columns:1fr 50px 80px 28px; }
      }
    `;
    const s = document.createElement('style');
    s.id = C360_STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('greitt'))  return 'sm-badge-comp';
    if (s.includes('afh') || s.includes('sótt')) return 'sm-badge-known';
    if (s.includes('selt'))    return 'sm-badge-comp';
    if (s.includes('tilb'))    return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  /* ---------- Data layer ---------- */
  async function fetchC360(customer) {
    const c = sb();
    if (!c) return { taeki: [], openVerks: [], billable: [], paid: [] };
    const name = customer.nafn || customer.name || '';
    if (!name) return { taeki: [], openVerks: [], billable: [], paid: [] };

    const [taekiRes, openRes, billRes, paidRes] = await Promise.all([
      c.from('uttaeki').select('*').eq('client', name)
        .in('status', ['Móttekið', 'Í vinnslu', 'Tilbúið'])
        .order('created_at', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .in('status', ['Í vinnslu', 'Móttekið', 'Tilbúið'])
        .order('num', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .in('status', ['Afhent', 'Selt'])
        .order('num', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .eq('status', 'Greitt')
        .order('num', { ascending: false })
        .limit(20),
    ]);

    return {
      taeki:     taekiRes?.data || [],
      openVerks: openRes?.data  || [],
      billable:  billRes?.data  || [],
      paid:      paidRes?.data  || [],
    };
  }

  async function createSale({ customer, lines, total }) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    // Get next num
    const { data: maxData } = await c.from('verkbeidnir')
      .select('num').order('num', { ascending: false }).limit(1);
    const nextNum = (maxData && maxData[0] && Number(maxData[0].num)) ?
      Number(maxData[0].num) + 1 : 1001;

    const notes = lines
      .map(l => `${l.qty} × ${l.desc} @ ${fmtKr(l.unit)} = ${fmtKr(l.qty * l.unit)}`)
      .join('\n');

    const { data, error } = await c.from('verkbeidnir').insert({
      num:      nextNum,
      status:   'Selt',
      customer: customer.nafn || customer.name,
      phone:    customer.simi || null,
      dropoff:  todayISO(),
      pickup:   todayISO(),
      notes,
      verd:     total,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function pickupVerks(verkIds, serialsByVerk) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    const today = todayISO();

    // Update each verk to Afhent
    for (const id of verkIds) {
      const { error } = await c.from('verkbeidnir')
        .update({ status: 'Afhent', pickup: today })
        .eq('id', id);
      if (error) throw error;
    }
    // Update linked uttaeki
    const allSerials = Object.values(serialsByVerk).flat();
    for (const s of allSerials) {
      try {
        await c.from('uttaeki').update({ status: 'Sótt' }).eq('serial', s);
      } catch (e) { warn('taeki update fail', s, e); }
    }
  }

  async function markGreitt(verkIds, invoiceLabel) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    for (const id of verkIds) {
      // Read current notes to prepend invoice marker
      const { data: row } = await c.from('verkbeidnir').select('notes').eq('id', id).single();
      const newNotes = invoiceLabel
        ? `[${invoiceLabel}] ` + (row?.notes || '')
        : row?.notes || null;
      const { error } = await c.from('verkbeidnir')
        .update({ status: 'Greitt', notes: newNotes })
        .eq('id', id);
      if (error) throw error;
    }
  }

  function parseSerialsFromNotes(notes) {
    return (notes || '').split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return null;
        const m = t.match(/^([^\s/—]+)/);
        return m ? m[1] : null;
      })
      .filter(Boolean);
  }

  /* ---------- UI: Customer 360 ---------- */
  function openCustomer360(customer) {
    injectC360Styles();
    const body = el('div');

    // Header
    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', { style: 'min-width:0;flex:1' }, [
        el('div', { style: 'font-weight:700;font-size:17px',
          text: customer.nafn || customer.name || '—' }),
        el('div', { style: 'font-size:12px;color:#374151;margin-top:2px',
          text: [customer.kennitala, customer.simi, customer.netfang].filter(Boolean).join(' · ') }),
      ]),
      el('button', {
        class: 'sm-btn',
        text: 'Skipta',
        on: { click: () => { closeModal(); window.SalaMottaka?.open(); } },
      }),
    ]));

    // Action grid (sticky)
    const actGrid = el('div', { class: 'c360-actions' });
    const actAdd = el('button', {
      class: 'c360-act c360-act-pri', type: 'button',
      text: '📥 Bæta tæki',
      on: { click: () => {
        closeModal();
        window.SalaMottaka?.openCustomer?.(customer);
      }},
    });
    const actPickup = el('button', {
      class: 'c360-act', type: 'button',
      text: '📦 Afhenda',
      on: { click: () => openPickup(customer) },
    });
    const actSale = el('button', {
      class: 'c360-act', type: 'button',
      text: '🛒 Selja',
      on: { click: () => openSale(customer) },
    });
    const actInvoice = el('button', {
      class: 'c360-act c360-act-bill', type: 'button',
      text: '🧾 Reikningur',
      on: { click: () => openInvoice(customer) },
    });
    actGrid.append(actAdd, actPickup, actSale, actInvoice);
    body.appendChild(actGrid);

    // Bill summary
    const billRow = el('div'); body.appendChild(billRow);

    // Stats row
    const statsRow = el('div', { class: 'c360-stats' }); body.appendChild(statsRow);

    // Sections
    const taekiSec = el('div', { class: 'c360-section' });
    const openSec  = el('div', { class: 'c360-section' });
    const billSec  = el('div', { class: 'c360-section' });
    body.append(billSec, taekiSec, openSec);

    let lastData = null;
    const refresh = async () => {
      statsRow.innerHTML = '';
      statsRow.appendChild(el('div', { class: 'c360-stat',
        html: '<span class="c360-stat-num">…</span>Sæki gögn' }));
      const data = await fetchC360(customer);
      lastData = data;

      const billTotal = data.billable.reduce((s, v) => s + (Number(v.verd) || 0), 0);
      const hasBill = data.billable.length > 0;

      // Toggle action enable states
      actPickup.disabled = data.openVerks.length === 0 && !data.openVerks.some(v => (v.status || '').toLowerCase().includes('tilb'));
      actInvoice.disabled = !hasBill;

      // Bill row
      billRow.innerHTML = '';
      if (hasBill) {
        billRow.appendChild(el('div', { class: 'c360-bill-row' }, [
          el('div', {}, [
            el('div', { style: 'font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#92400e;font-weight:600',
              text: 'Til reiknings' }),
            el('div', { style: 'font-size:12px;color:#92400e;margin-top:2px',
              text: data.billable.length + ' verk · ekki á reikning' }),
          ]),
          el('strong', { style: 'font-size:20px', text: fmtKr(billTotal) }),
        ]));
      }

      // Stats
      statsRow.innerHTML = '';
      statsRow.append(
        el('div', { class: 'c360-stat',
          html: `<span class="c360-stat-num">${data.taeki.length}</span>Á verkstæði` }),
        el('div', { class: 'c360-stat',
          html: `<span class="c360-stat-num">${data.openVerks.length}</span>Verk í gangi` }),
        el('div', { class: 'c360-stat c360-stat-bill',
          html: `<span class="c360-stat-num">${data.billable.length}</span>Til reiknings` }),
      );

      // Billable section
      billSec.innerHTML = '';
      if (hasBill) {
        billSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Til reiknings' }),
          el('span', { style: 'font-weight:700;color:#065f46', text: fmtKr(billTotal) }),
        ]));
        data.billable.forEach(v => {
          const firstLine = (v.notes || '').split('\n')[0] || '';
          billSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: '#' + v.num + ' · ' + (v.status || '') }),
              el('div', { class: 'c360-item-meta', text: firstLine.slice(0, 80) || '—' }),
              el('div', { class: 'c360-item-meta',
                text: 'Móttekið ' + (v.dropoff || '—') + (v.pickup ? ' · Sótt ' + v.pickup : '') }),
            ]),
            el('div', { class: 'c360-item-right' }, [
              el('div', { style: 'font-weight:700', text: fmtKr(v.verd) }),
            ]),
          ]));
        });
      }

      // Workshop tæki
      taekiSec.innerHTML = '';
      if (data.taeki.length) {
        taekiSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Á verkstæði' }),
          el('span', { text: data.taeki.length + ' tæki' }),
        ]));
        data.taeki.forEach(t => {
          taekiSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: t.serial }),
              el('div', { class: 'c360-item-meta',
                text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
            ]),
            el('span', { class: 'sm-badge ' + statusBadgeClass(t.status), text: t.status || '—' }),
          ]));
        });
      }

      // Open verks
      openSec.innerHTML = '';
      if (data.openVerks.length) {
        openSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Virk verk' }),
          el('span', { text: data.openVerks.length + ' verk' }),
        ]));
        data.openVerks.forEach(v => {
          const firstLine = (v.notes || '').split('\n')[0] || '';
          openSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: '#' + v.num }),
              el('div', { class: 'c360-item-meta', text: firstLine.slice(0, 80) || '—' }),
              el('div', { class: 'c360-item-meta', text: 'Móttekið ' + (v.dropoff || '—') }),
            ]),
            el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
          ]));
        });
      }

      if (!hasBill && !data.taeki.length && !data.openVerks.length) {
        openSec.appendChild(el('div', { class: 'sm-empty', text: 'Engin virk gögn — bættu við tækjum eða skráðu sölu' }));
      }
    };
    refresh();

    // Re-route hooks so re-entries land back here
    window.salaOnIntakeDone   = (cust) => setTimeout(() => openCustomer360(cust), 100);
    window.salaOnCustomerPicked = openCustomer360;

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻', title: 'Endurnýja',
      on: { click: refresh }});

    openModal('Staða viðskiptavinar', body, [refreshBtn, close]);
  }

  /* ---------- UI: Pickup ---------- */
  function openPickup(customer) {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label', text: 'Veldu verk sem á að afhenda' }));

    const list = el('div'); body.appendChild(list);
    const errBox = el('div'); body.appendChild(errBox);
    const checked = new Set();
    let verks = [];

    const renderTotal = () => {
      const sum = verks.filter(v => checked.has(v.id))
        .reduce((s, v) => s + (Number(v.verd) || 0), 0);
      footerTotal.textContent = 'Valið: ' + checked.size + ' · ' + fmtKr(sum);
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const c = sb();
      const { data } = await c.from('verkbeidnir')
        .select('*').eq('customer', customer.nafn || customer.name || '')
        .in('status', ['Í vinnslu', 'Móttekið', 'Tilbúið'])
        .order('num', { ascending: false });
      verks = data || [];
      list.innerHTML = '';
      if (!verks.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin verk til afhendingar' }));
        return;
      }
      verks.forEach(v => {
        const isReady = (v.status || '').toLowerCase().includes('tilb');
        const row = el('div', {
          class: 'c360-pickline' + (isReady ? ' checked' : ''),
        }, [
          el('input', { type: 'checkbox', checked: isReady }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-weight:600',
              text: '#' + v.num + ' · ' + (v.status || '') }),
            el('div', { style: 'font-size:12px;color:#6b7280',
              text: ((v.notes || '').split('\n')[0] || '').slice(0, 60) }),
          ]),
          el('div', { style: 'font-weight:600', text: fmtKr(v.verd) }),
        ]);
        if (isReady) checked.add(v.id);
        const cb = row.querySelector('input');
        const toggle = () => {
          if (cb.checked) { checked.add(v.id); row.classList.add('checked'); }
          else            { checked.delete(v.id); row.classList.remove('checked'); }
          renderTotal();
        };
        row.addEventListener('click', e => {
          if (e.target !== cb) cb.checked = !cb.checked;
          toggle();
        });
        cb.addEventListener('change', toggle);
        list.appendChild(row);
      });
      renderTotal();
    };

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});
    const footerTotal = el('div', { style: 'flex:1;font-size:13px;color:#374151;align-self:center', text: '' });
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Skrá afhendingu',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!checked.size) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Veldu að minnsta kosti eitt verk' }));
          return;
        }
        submit.disabled = true; submit.textContent = 'Vistar…';
        try {
          const ids = Array.from(checked);
          const serialMap = {};
          verks.filter(v => checked.has(v.id)).forEach(v => {
            serialMap[v.id] = parseSerialsFromNotes(v.notes);
          });
          await pickupVerks(ids, serialMap);
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          submit.disabled = false; submit.textContent = 'Skrá afhendingu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Afhending — ' + (customer.nafn || customer.name || ''), body,
      [footerTotal, back, submit]);
    refresh();
  }

  /* ---------- UI: Sale ---------- */
  function openSale(customer) {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label',
      text: 'Skráðu vörur sem viðskiptavinurinn er að kaupa (færist á reikning)' }));

    const lines = [];
    const list = el('div'); body.appendChild(list);
    const totalRow = el('div', {
      style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-top:2px solid #e5e7eb;margin-top:8px;font-weight:700;font-size:16px',
    }, [
      el('span', { text: 'Samtals' }),
      el('span', { id: 'sm-sale-total', text: fmtKr(0) }),
    ]);
    body.appendChild(totalRow);

    const calcTotal = () => lines.reduce((s, l) =>
      s + ((Number(l.qty) || 0) * (Number(l.unit) || 0)), 0);

    const renderLines = () => {
      list.innerHTML = '';
      if (!lines.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engar línur — bættu við hér að neðan' }));
      }
      lines.forEach((l, idx) => {
        const desc = el('input', { class: 'sm-input', placeholder: 'Lýsing (t.d. CO2 6kg)', value: l.desc });
        const qty  = el('input', { class: 'sm-input', type: 'number', step: '1', min: '1', value: l.qty || 1, inputMode: 'numeric' });
        const unit = el('input', { class: 'sm-input', type: 'number', step: '1', placeholder: 'kr', value: l.unit, inputMode: 'numeric' });
        desc.addEventListener('input', () => { l.desc = desc.value; });
        qty .addEventListener('input', () => { l.qty  = Number(qty.value)  || 0; updateTotal(); });
        unit.addEventListener('input', () => { l.unit = Number(unit.value) || 0; updateTotal(); });
        const rm = el('button', {
          class: 'sm-btn sm-btn-danger', type: 'button', text: '×',
          on: { click: () => { lines.splice(idx, 1); renderLines(); updateTotal(); }},
        });
        list.appendChild(el('div', { class: 'c360-saleline' }, [desc, qty, unit, rm]));
      });
    };
    const updateTotal = () => {
      totalRow.querySelector('#sm-sale-total').textContent = fmtKr(calcTotal());
    };

    const addBtn = el('button', {
      class: 'sm-btn', type: 'button',
      style: 'width:100%;margin-top:8px',
      text: '+ Bæta við línu',
      on: { click: () => { lines.push({ desc: '', qty: 1, unit: 0 }); renderLines(); updateTotal(); }},
    });
    body.appendChild(addBtn);
    lines.push({ desc: '', qty: 1, unit: 0 });
    renderLines();

    const errBox = el('div'); body.appendChild(errBox);

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Skrá sölu',
      on: { click: async () => {
        errBox.innerHTML = '';
        const valid = lines.filter(l => (l.desc || '').trim() && Number(l.unit) > 0);
        if (!valid.length) {
          errBox.appendChild(el('div', { class: 'sm-err',
            text: 'Bættu við að minnsta kosti einni línu með lýsingu og verði' }));
          return;
        }
        submit.disabled = true; submit.textContent = 'Vistar…';
        try {
          const total = calcTotal();
          await createSale({ customer, lines: valid, total });
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          submit.disabled = false; submit.textContent = 'Skrá sölu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Sala — ' + (customer.nafn || customer.name || ''), body, [back, submit]);
    setTimeout(() => list.querySelector('input')?.focus(), 50);
  }

  /* ---------- UI: Invoice ---------- */
  function openInvoice(customer) {
    const body = el('div');
    const list = el('div'); body.appendChild(list);
    const summary = el('div'); body.appendChild(summary);
    const errBox = el('div'); body.appendChild(errBox);

    let billable = [];
    let invoiceText = '';
    const checked = new Set();

    const buildInvoiceText = () => {
      const sel = billable.filter(v => checked.has(v.id));
      const total = sel.reduce((s, v) => s + (Number(v.verd) || 0), 0);
      const today = todayISO();
      const lines = [];
      lines.push('REIKNINGUR — Slökkvitæki ehf');
      lines.push('Dagsetning: ' + today);
      lines.push('');
      lines.push('Viðskiptavinur:');
      lines.push('  ' + (customer.nafn || customer.name || ''));
      if (customer.kennitala) lines.push('  Kt. ' + customer.kennitala);
      if (customer.heimilisfang) lines.push('  ' + customer.heimilisfang);
      if (customer.simi) lines.push('  Sími ' + customer.simi);
      if (customer.netfang) lines.push('  ' + customer.netfang);
      lines.push('');
      lines.push('─'.repeat(48));
      sel.forEach(v => {
        const dateStr = v.dropoff || v.pickup || '';
        lines.push(`#${v.num}  ${dateStr}  ${v.status}`);
        const noteLines = (v.notes || '').split('\n').filter(Boolean);
        noteLines.forEach(nl => lines.push('  ' + nl));
        lines.push('  '.repeat(20) + ' ' + fmtKr(v.verd).padStart(12));
        lines.push('');
      });
      lines.push('─'.repeat(48));
      lines.push('SAMTALS:'.padEnd(36) + fmtKr(total).padStart(12));
      lines.push('');
      lines.push('Greiðsluskilmálar: 14 dagar');
      return { text: lines.join('\n'), total, count: sel.length };
    };

    const renderSummary = () => {
      const r = buildInvoiceText();
      invoiceText = r.text;
      summary.innerHTML = '';
      summary.appendChild(el('div', { class: 'c360-bill-row' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:600', text: r.count + ' verk valið' }),
          el('div', { style: 'font-size:12px;color:#92400e',
            text: 'Verður merkt sem Greitt eftir staðfestingu' }),
        ]),
        el('strong', { style: 'font-size:22px', text: fmtKr(r.total) }),
      ]));
      summary.appendChild(el('details', {}, [
        el('summary', { style: 'cursor:pointer;font-size:13px;color:#2563eb;padding:4px 0',
          text: 'Forskoða reiknings­texta' }),
        el('div', { class: 'c360-invoice', text: r.text }),
      ]));
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const c = sb();
      const { data } = await c.from('verkbeidnir')
        .select('*').eq('customer', customer.nafn || customer.name || '')
        .in('status', ['Afhent', 'Selt'])
        .order('num', { ascending: true });
      billable = data || [];
      list.innerHTML = '';
      if (!billable.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Ekkert til reiknings' }));
        summary.innerHTML = ''; return;
      }
      list.appendChild(el('label', { class: 'sm-label', text: 'Veldu hvað á að setja á reikning' }));
      billable.forEach(v => {
        checked.add(v.id);
        const firstLine = (v.notes || '').split('\n')[0] || '';
        const row = el('div', { class: 'c360-pickline checked' }, [
          el('input', { type: 'checkbox', checked: true }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-weight:600',
              text: '#' + v.num + ' · ' + (v.status || '') + ' · ' + (v.dropoff || '') }),
            el('div', { style: 'font-size:12px;color:#6b7280',
              text: firstLine.slice(0, 70) }),
          ]),
          el('div', { style: 'font-weight:700', text: fmtKr(v.verd) }),
        ]);
        const cb = row.querySelector('input');
        const toggle = () => {
          if (cb.checked) { checked.add(v.id); row.classList.add('checked'); }
          else            { checked.delete(v.id); row.classList.remove('checked'); }
          renderSummary();
        };
        row.addEventListener('click', e => {
          if (e.target !== cb) cb.checked = !cb.checked;
          toggle();
        });
        cb.addEventListener('change', toggle);
        list.appendChild(row);
      });
      renderSummary();
    };

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});

    const copy = el('button', {
      class: 'sm-btn', text: '📋 Afrita',
      on: { click: async () => {
        try {
          await navigator.clipboard.writeText(invoiceText);
          copy.textContent = '✓ Afritað';
          setTimeout(() => copy.textContent = '📋 Afrita', 1500);
        } catch {
          // Fallback
          const ta = el('textarea', { value: invoiceText, style: 'position:fixed;left:-9999px' });
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch {}
          ta.remove();
          copy.textContent = '✓ Afritað';
          setTimeout(() => copy.textContent = '📋 Afrita', 1500);
        }
      }},
    });

    const printBtn = el('button', {
      class: 'sm-btn', text: '🖨 Prenta',
      on: { click: () => {
        const w = window.open('', '_blank', 'width=720,height=900');
        if (!w) return;
        w.document.write('<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;padding:24px">' +
          invoiceText.replace(/[<>&]/g, ch => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[ch])) + '</pre>');
        w.document.close();
        setTimeout(() => w.print(), 300);
      }},
    });

    const finalize = el('button', {
      class: 'sm-btn sm-btn-pri c360-act-bill', text: '✓ Skrá reikning',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!checked.size) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Ekkert valið' }));
          return;
        }
        if (!confirm('Skrá ' + checked.size + ' verk sem Greitt? Þetta er ekki auðveldlega afturkallað.')) return;
        finalize.disabled = true; finalize.textContent = 'Vistar…';
        try {
          const label = 'REIKN-' + todayISO().replace(/-/g, '').slice(2);
          await markGreitt(Array.from(checked), label);
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          finalize.disabled = false; finalize.textContent = '✓ Skrá reikning';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Reikningur — ' + (customer.nafn || customer.name || ''),
      body, [back, copy, printBtn, finalize]);
    refresh();
  }

  /* ---------- Monthly billing dashboard ---------- */
  async function fetchMonthlyBillable() {
    const c = sb();
    if (!c) return [];
    const { data } = await c.from('verkbeidnir')
      .select('*')
      .in('status', ['Afhent', 'Selt'])
      .order('customer', { ascending: true });
    if (!data) return [];
    // Group by customer
    const byCust = new Map();
    data.forEach(v => {
      const k = v.customer || '—';
      if (!byCust.has(k)) byCust.set(k, { customer: k, phone: v.phone, items: [], total: 0 });
      const e = byCust.get(k);
      e.items.push(v);
      e.total += Number(v.verd) || 0;
    });
    return Array.from(byCust.values()).sort((a, b) => b.total - a.total);
  }

  function openMonthly() {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label',
      text: 'Viðskiptavinir með ógreidd verk' }));
    const list = el('div'); body.appendChild(list);
    const totalRow = el('div', {
      style: 'display:flex;justify-content:space-between;padding:12px 4px;border-top:2px solid #e5e7eb;margin-top:8px;font-weight:700',
    }, [
      el('span', { text: 'Samtals (allt)' }),
      el('span', { id: 'sm-month-total', text: '—' }),
    ]);
    body.appendChild(totalRow);

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const groups = await fetchMonthlyBillable();
      list.innerHTML = '';
      if (!groups.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin ógreidd verk' }));
        totalRow.querySelector('#sm-month-total').textContent = fmtKr(0);
        return;
      }
      groups.forEach(g => {
        list.appendChild(el('div', {
          class: 'sm-result',
          on: { click: () => {
            closeModal();
            openCustomer360({ nafn: g.customer, simi: g.phone });
          }},
        }, [
          el('div', { class: 'sm-result-main' }, [
            el('div', { class: 'sm-result-name', text: g.customer }),
            el('div', { class: 'sm-result-meta', text: g.items.length + ' verk' }),
          ]),
          el('div', { style: 'font-weight:700;color:#065f46', text: fmtKr(g.total) }),
        ]));
      });
      const grand = groups.reduce((s, g) => s + g.total, 0);
      totalRow.querySelector('#sm-month-total').textContent = fmtKr(grand);
    };

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    openModal('Til reiknings (allir viðskiptavinir)', body, [refreshBtn, close]);
    refresh();
  }

  /* ---------- Buttons ---------- */
  function ensureMonthlyButton() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;
    if (document.getElementById('sm-monthly-btn')) return;

    const isFab = moBtn.style.position === 'fixed';
    const btn = el('button', {
      id: 'sm-monthly-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '🧾 Til reiknings',
      style: isFab
        ? 'position:fixed;right:16px;bottom:184px;z-index:8000;background:#10b981;border-color:#10b981;box-shadow:0 6px 20px rgba(16,185,129,.35)'
        : 'margin-left:8px;background:#10b981;border-color:#10b981',
      on: { click: openMonthly },
    });
    if (isFab) document.body.appendChild(btn);
    else {
      const last = document.getElementById('sm-handover-btn')
        || document.getElementById('sm-today-btn') || moBtn;
      last.parentNode.insertBefore(btn, last.nextSibling);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 25000);
    injectC360Styles();
    ensureMonthlyButton();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureMonthlyButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Hook into sala-mottaka routing
    window.salaOnCustomerPicked = openCustomer360;
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaCustomer360 = {
    open:     openCustomer360,
    pickup:   openPickup,
    sale:     openSale,
    invoice:  openInvoice,
    monthly:  openMonthly,
    version:  '1.0.0',
  };
})();
/* =============================================================
   SALA STALE — gömul tæki á verkstæði
   =============================================================
   Lists uttaeki rows still in workshop status (Móttekið /
   Í vinnslu / Tilbúið) older than a chosen threshold. Click any
   row to jump into that customer's Staða viðskiptavinar to
   resolve it.

   Threshold chips: 7 / 14 / 30 / 60 / 90 dagar. Default 30.
   ============================================================= */
(() => {
  const TAG = '[sala-stale]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  async function waitFor(check, timeoutMs = 30000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check(); if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }
  const daysSince = iso => {
    if (!iso) return 0;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  /* Modal (shares .sm-* and .c360-* styles already injected by other modules) */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('tilb')) return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  /* ---------- Data ---------- */
  async function fetchStale(minDays) {
    const c = sb();
    if (!c) return [];
    const cutoff = new Date(Date.now() - minDays * 86400000).toISOString();
    const { data, error } = await c.from('uttaeki')
      .select('*')
      .in('status', ['Móttekið', 'Í vinnslu', 'Tilbúið'])
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true });
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function findCustomerByName(name) {
    const c = sb();
    if (!c || !name) return null;
    try {
      const { data: v } = await c.from('vidskiptavinir')
        .select('*').eq('nafn', name).limit(1);
      if (v && v[0]) return { ...v[0], _kind: 'vidsk' };
    } catch (e) { warn(e); }
    try {
      const { data: f } = await c.from('fyrirtaeki')
        .select('*').eq('nafn', name).limit(1);
      if (f && f[0]) return { ...f[0], _kind: 'fyrir' };
    } catch (e) { warn(e); }
    return null;
  }

  /* ---------- UI ---------- */
  function openStale() {
    let minDays = 30;
    const body = el('div');

    /* Threshold chips */
    const chipBar = el('div', {
      style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px',
    });
    const dayOptions = [7, 14, 30, 60, 90];
    const chips = {};
    const activeStyle = 'background:#fee2e2;border-color:#dc2626;color:#991b1b;font-weight:700';
    const idleStyle = '';
    dayOptions.forEach(d => {
      const c = el('button', {
        class: 'sm-btn',
        type: 'button',
        text: '> ' + d + ' d',
        on: { click: () => {
          minDays = d;
          dayOptions.forEach(x => chips[x].setAttribute('style', x === minDays ? activeStyle : idleStyle));
          refresh();
        }},
      });
      if (d === minDays) c.setAttribute('style', activeStyle);
      chips[d] = c;
      chipBar.appendChild(c);
    });
    body.appendChild(chipBar);

    /* Summary */
    const summary = el('div', { class: 'c360-bill-row',
      style: 'background:#fef2f2;border-color:#fecaca;display:none' });
    body.appendChild(summary);

    /* List */
    const list = el('div', { class: 'sm-results' });
    body.appendChild(list);

    /* Group toggle */
    let grouped = false;
    const groupToggle = el('label', {
      style: 'display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;margin:8px 0 4px;cursor:pointer',
    }, [
      el('input', { type: 'checkbox',
        on: { change: e => { grouped = e.target.checked; render(lastRows); }}}),
      el('span', { text: 'Hópa eftir viðskiptavin' }),
    ]);
    body.insertBefore(groupToggle, list);

    let lastRows = [];

    const groupByClient = rows => {
      const byClient = new Map();
      rows.forEach(t => {
        const k = t.client || '—';
        if (!byClient.has(k)) byClient.set(k, []);
        byClient.get(k).push(t);
      });
      return Array.from(byClient.entries())
        .map(([client, items]) => ({
          client,
          items,
          oldest: Math.max(...items.map(t => daysSince(t.created_at))),
          phone: items[0]?.phone,
        }))
        .sort((a, b) => b.oldest - a.oldest);
    };

    const goToCustomer = async (clientName, phone) => {
      closeModal();
      const c = await findCustomerByName(clientName);
      const cust = c || { nafn: clientName, simi: phone };
      if (window.SalaCustomer360 && typeof window.SalaCustomer360.open === 'function') {
        window.SalaCustomer360.open(cust);
      } else if (typeof window.salaOnCustomerPicked === 'function') {
        window.salaOnCustomerPicked(cust);
      } else {
        warn('No C360 available — cannot navigate');
      }
    };

    const render = rows => {
      list.innerHTML = '';
      summary.style.display = rows.length ? '' : 'none';
      summary.innerHTML = '';

      if (rows.length) {
        const uniqueClients = new Set(rows.map(t => t.client || '—')).size;
        summary.appendChild(el('div', {}, [
          el('div', { style: 'font-weight:700;font-size:16px;color:#991b1b',
            text: rows.length + ' tæki á verkstæði' }),
          el('div', { style: 'font-size:12px;color:#7f1d1d;margin-top:2px',
            text: 'Eldri en ' + minDays + ' dagar · ' + uniqueClients + ' viðskiptavinir' }),
        ]));
      }

      if (!rows.length) {
        list.appendChild(el('div', { class: 'sm-empty',
          text: 'Engin gömul tæki á þessu þrepi — fínt!' }));
        return;
      }

      if (grouped) {
        const groups = groupByClient(rows);
        groups.forEach(g => {
          const header = el('div', {
            class: 'sm-result',
            style: 'background:#fafafa;font-weight:700',
            on: { click: () => goToCustomer(g.client, g.phone) },
          }, [
            el('div', { class: 'sm-result-main' }, [
              el('div', { class: 'sm-result-name', text: g.client }),
              el('div', { class: 'sm-result-meta',
                text: g.items.length + ' tæki · elsta ' + g.oldest + ' dagar' }),
            ]),
            el('span', {
              class: 'sm-badge ' + (g.oldest >= 90 ? 'sm-badge-comp' : 'sm-badge-cust'),
              style: g.oldest >= 90 ? 'background:#fee2e2;color:#991b1b' : '',
              text: g.oldest + ' d',
            }),
          ]);
          list.appendChild(header);
          // Items as sub-rows
          g.items.forEach(t => {
            const d = daysSince(t.created_at);
            const sub = el('div', {
              class: 'sm-result',
              style: 'padding-left:24px;background:#fff',
            }, [
              el('div', { class: 'sm-result-main' }, [
                el('div', { style: 'font-weight:600;font-size:13px',
                  text: t.serial }),
                el('div', { class: 'sm-result-meta',
                  text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
              ]),
              el('div', { style: 'text-align:right;flex-shrink:0' }, [
                el('div', { style: 'font-size:12px;font-weight:600;color:' + (d >= 90 ? '#991b1b' : '#9a3412'),
                  text: d + ' d' }),
                el('span', { class: 'sm-badge ' + statusBadgeClass(t.status),
                  style: 'font-size:10px',
                  text: t.status || '—' }),
              ]),
            ]);
            list.appendChild(sub);
          });
        });
      } else {
        rows.forEach(t => {
          const d = daysSince(t.created_at);
          const node = el('div', {
            class: 'sm-result',
            on: { click: () => goToCustomer(t.client, t.phone) },
          }, [
            el('div', { class: 'sm-result-main' }, [
              el('div', { class: 'sm-result-name',
                text: t.serial + ' · ' + (t.client || '—') }),
              el('div', { class: 'sm-result-meta',
                text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
            ]),
            el('div', { style: 'text-align:right;flex-shrink:0;display:flex;flex-direction:column;gap:2px;align-items:flex-end' }, [
              el('div', {
                style: 'font-weight:700;font-size:14px;color:' + (d >= 90 ? '#991b1b' : '#9a3412'),
                text: d + ' dagar',
              }),
              el('span', { class: 'sm-badge ' + statusBadgeClass(t.status),
                text: t.status || '—' }),
            ]),
          ]);
          list.appendChild(node);
        });
      }
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      summary.style.display = 'none';
      lastRows = await fetchStale(minDays);
      render(lastRows);
    };

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    openModal('Gömul tæki á verkstæði', body, [refreshBtn, close]);
    refresh();
  }

  /* ---------- Button ---------- */
  function ensureStaleButton() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;
    if (document.getElementById('sm-stale-btn')) return;

    const isFab = moBtn.style.position === 'fixed';
    const btn = el('button', {
      id: 'sm-stale-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '🕰 Gömul tæki',
      style: isFab
        ? 'position:fixed;right:16px;bottom:240px;z-index:8000;background:#dc2626;border-color:#dc2626;box-shadow:0 6px 20px rgba(220,38,38,.35)'
        : 'margin-left:8px;background:#dc2626;border-color:#dc2626',
      on: { click: openStale },
    });

    if (isFab) {
      document.body.appendChild(btn);
    } else {
      const last = document.getElementById('sm-monthly-btn')
        || document.getElementById('sm-handover-btn')
        || document.getElementById('sm-today-btn')
        || moBtn;
      last.parentNode.insertBefore(btn, last.nextSibling);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 30000);
    ensureStaleButton();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureStaleButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaStale = {
    open: openStale,
    fetch: fetchStale,
    version: '1.0.0',
  };
})();


/* === END SALA SUITE === */
