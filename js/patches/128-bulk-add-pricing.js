/* Verðútlit í "+ Mörg tæki" glugganum (Fyrirtækjaþjónusta).
 *
 * Þegar notandi velur Tegund + Stærð + Magn fyrir tæki sem á að bæta við
 * fyrirtæki, sýnir kerfið núna verðútlit næstu þjónustu (hleðslu):
 *   • Per-stk verð úr vörulista (Þjónusta-flokkur)
 *   • Tilboðsverð sérstaklega ef fyrirtækið hefur slíkt á sér
 *   • Akstur (1× á ferð)
 *   • Samtals m. VSK
 *
 * Þannig sér söluafgreiðsla strax hvað ferðin mun kosta þegar þessi
 * tæki koma inn í áfyllingu / yfirferð, og getur sent reikning beint
 * eftir afhendingu.
 *
 * Patch tengist mútatíu á #_bulkadd_modal — virkar saman við patch 73.
 */
(() => {
  if (window.__bulkAddPricingInstalled) return;
  window.__bulkAddPricingInstalled = true;

  const SERVICE_KW = /hleðsla|yfirferð/i;
  let _services = null;        // cached vörur (services only)
  let _servicesPromise = null;

  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  async function loadServices() {
    if (_services) return _services;
    if (_servicesPromise) return _servicesPromise;
    _servicesPromise = (async () => {
      const sb = window.DB && window.DB.sb;
      if (!sb) return [];
      const { data } = await sb.from('vorur')
        .select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta')
        .eq('virkt', true);
      _services = (data || []).filter(p => p.flokkur === 'Þjónusta');
      return _services;
    })();
    return _servicesPromise;
  }

  // Normalise a string for matching — lowercase, strip diacritics-ish vowels
  // that vary (é/e, æ/ae, ð/d), collapse whitespace, drop punctuation.
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ð/g, 'd').replace(/þ/g, 'th')
      .replace(/æ/g, 'ae').replace(/[áàâ]/g, 'a').replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i').replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u')
      .replace(/[ýỳ]/g, 'y').replace(/ö/g, 'o')
      .replace(/[._,()]/g, ' ')
      .replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Stem match: tolerates Icelandic inflection (brunaslöngur ≈ brunaslanga).
  function tokenMatches(qTok, nTok) {
    if (qTok === nTok) return true;
    if (qTok.length < 4 || nTok.length < 4) return false;
    const stemLen = Math.min(qTok.length, nTok.length, 5);
    if (qTok.slice(0, stemLen) === nTok.slice(0, stemLen)) return true;
    if (qTok.includes(nTok) || nTok.includes(qTok)) return true;
    return false;
  }

  // Map type+size+kind ('hledsla'|'yfirferd') to the best matching service.
  // Sizeless service families have a single "Yfirferð X" entry with no size;
  // including the size ("30 m") would dilute the match below threshold.
  const SIZELESS_SVC = /brunaslang|brunaslöng|brunaslong|hose|reykskynj|hitaskynj|smoke|teppi|blanket/i;
  // 2026-07-31 (Agnar): reykskynjari-afbrigði (stærð = batterís/langlífis/
  // samtengjanlegir) → BEINT á Sölu-vöru (Reykskynjari / Reykskynjari 2 /
  // Reykskynjari 3). Sama regla og patch 129 svo forskoðun og reikningur stemmi.
  function reykVariantProduct(type, size, services) {
    if (!/reykskynj|smoke/.test(norm(type))) return null;
    const s = norm(size);
    let want = null;
    if (/batter/.test(s)) want = 'reykskynjari';
    else if (/langl[íi]f|langlif|langl/.test(s)) want = 'reykskynjari 2';
    else if (/samteng|samtengd/.test(s)) want = 'reykskynjari 3';
    if (!want) return null;
    return (services || []).find(p => norm(p.nafn) === want) || null;
  }

  function pickService(type, size, services, kind) {
    kind = kind || 'hledsla';
    const reyk = reykVariantProduct(type, size, services);
    if (reyk) return reyk;
    const effSize = SIZELESS_SVC.test(type) ? '' : size;
    const queryTokens = norm(type + ' ' + effSize).split(' ').filter(Boolean);
    let best = null;
    for (const p of services) {
      const nameTokens = norm(p.nafn).split(' ').filter(Boolean);
      const isHledsla = nameTokens.includes('hledsla');
      const isYfirferd = nameTokens.includes('yfirferd');
      if (!isHledsla && !isYfirferd) continue;
      if (kind === 'hledsla' && !isHledsla) continue;
      if (kind === 'yfirferd' && !isYfirferd) continue;
      let matched = 0;
      let strongMatches = 0;
      for (const q of queryTokens) {
        if (nameTokens.some(nt => tokenMatches(q, nt))) {
          matched++;
          if (q.length >= 4) strongMatches++;
        }
      }
      if (strongMatches === 0) continue;
      const score = matched / Math.max(1, queryTokens.length);
      if (!best || score > best.score) best = { product: p, score, matched };
    }
    if ((!best || best.score < 0.3) && kind === 'yfirferd') {
      return pickService(type, size, services, 'hledsla');
    }
    return best && best.score >= 0.3 ? best.product : null;
  }

  // Find tilboðsverð override for this service name on the given company.
  function findOverride(coId, productName) {
    if (!coId || !productName) return null;
    if (!window.CompanyPricing || !window.CompanyPricing.list) return null;
    const list = window.CompanyPricing.list(coId);
    if (!list || !list.length) return null;
    const n = String(productName).toLowerCase().trim();
    let best = null;
    for (const o of list) {
      const oName = String(o.name || '').toLowerCase().trim();
      if (!oName) continue;
      if (n.indexOf(oName) >= 0 || oName.indexOf(n) >= 0) {
        if (!best || oName.length > String(best.name).length) best = o;
      }
    }
    return best;
  }

  function findAkstur(coId) {
    if (!coId || !window.CompanyPricing || !window.CompanyPricing.list) return null;
    const list = window.CompanyPricing.list(coId);
    for (const o of list) {
      if (/akstur/i.test(o.name || '')) return o;
    }
    return null;
  }

  function lookupCoIdByName(nafn) {
    if (!nafn || !window.Companies || !Companies.list) return null;
    const found = (Companies.list || []).find(c => c.nafn === nafn);
    return found ? found.id : null;
  }

  function buildSection() {
    const sec = document.createElement('div');
    sec.id = '_bap-section';
    sec.style.cssText =
      'margin-top:14px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;';
    sec.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em">📋 Verðútlit næstu þjónustu</div>' +
        '<div id="_bap-badge" style="font-size:11px;color:#1e40af"></div>' +
      '</div>' +
      '<div id="_bap-body" style="font-size:13px;color:#1e3a8a">' +
        '<div style="color:#94a3b8;font-style:italic">Veldu Tegund og Stærð til að sjá verð…</div>' +
      '</div>';
    return sec;
  }

  async function recompute(modal, nafn) {
    const body = modal.querySelector('#_bap-body');
    const badge = modal.querySelector('#_bap-badge');
    if (!body) return;
    const type = modal.querySelector('#_ba_type').value;
    const size = modal.querySelector('#_ba_size').value.trim();
    const qty = parseInt(modal.querySelector('#_ba_qty').value, 10) || 0;
    const choice = modal.querySelector('#_bap-choice')?.value || 'hledsla';
    if (!type || !size || !qty) {
      body.innerHTML = '<div style="color:#94a3b8;font-style:italic">Veldu Tegund og Stærð til að sjá verð…</div>';
      badge.textContent = '';
      return;
    }
    if (choice === 'none') {
      body.innerHTML = '<div style="color:#64748b;font-style:italic">Sleppt — tækin verða ekki tekin inn í þessari ferð. Kostnaður 0 kr.</div>';
      badge.textContent = '';
      return;
    }
    const services = await loadServices();
    const product = pickService(type, size, services, choice);
    if (!product) {
      body.innerHTML = '<div style="color:#dc2626">⚠ Fann ekki matchandi þjónustu í vörulista fyrir „' +
        type + ' / ' + size + '". Bæta við í Vörur og þjónusta?</div>';
      badge.textContent = '';
      return;
    }
    const coId = lookupCoIdByName(nafn);
    const override = findOverride(coId, product.nafn);
    const akstur = findAkstur(coId);

    const unitPrice = override ? +override.price_ex_vat : +product.verd_an_vsk;
    const vskPct = override ? (+override.vsk_pct || 24) : (+product.vsk_prosenta || 24);
    const subtotal = unitPrice * qty;
    const aksturEx = akstur ? +akstur.price_ex_vat : 0;
    const aksturVskPct = akstur ? (+akstur.vsk_pct || 24) : 24;
    const totalEx = subtotal + aksturEx;
    const vskKr = subtotal * (vskPct/100) + aksturEx * (aksturVskPct/100);
    const totalInc = totalEx + vskKr;

    badge.textContent = override
      ? '💰 Tilboðsverð fyrir ' + nafn
      : 'Almennt verðlistaverð';

    body.innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums">' +
        '<tr><td style="padding:3px 0;color:#475569">Þjónusta:</td>' +
          '<td style="padding:3px 0;text-align:right;font-weight:600">' + product.nafn + '</td></tr>' +
        '<tr><td style="padding:3px 0;color:#475569">Per stk:</td>' +
          '<td style="padding:3px 0;text-align:right;font-weight:600">' + fmtKr(unitPrice) +
          (override ? ' <span title="' + (override.notes || '') + '" style="margin-left:6px;padding:1px 6px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;font-size:10px;font-weight:700">💰 Tilboð</span>' : '') +
          '</td></tr>' +
        '<tr><td style="padding:3px 0;color:#475569">' + qty + ' × ' + fmtKr(unitPrice) + ':</td>' +
          '<td style="padding:3px 0;text-align:right;font-weight:600">' + fmtKr(subtotal) + '</td></tr>' +
        (akstur ? '<tr><td style="padding:3px 0;color:#475569">+ Akstur:</td>' +
          '<td style="padding:3px 0;text-align:right;font-weight:600">' + fmtKr(aksturEx) + '</td></tr>' : '') +
        '<tr style="border-top:1px dashed #93c5fd"><td style="padding:6px 0 3px;color:#475569">Án vsk:</td>' +
          '<td style="padding:6px 0 3px;text-align:right;font-weight:700">' + fmtKr(totalEx) + '</td></tr>' +
        '<tr><td style="padding:3px 0;color:#475569">VSK ' + vskPct + '%:</td>' +
          '<td style="padding:3px 0;text-align:right;font-weight:600">' + fmtKr(vskKr) + '</td></tr>' +
        '<tr style="border-top:2px solid #1e40af"><td style="padding:6px 0 3px;color:#0f172a;font-weight:700">SAMTALS:</td>' +
          '<td style="padding:6px 0 3px;text-align:right;font-weight:800;color:#1e40af;font-size:16px">' + fmtKr(totalInc) + '</td></tr>' +
      '</table>';
  }

  function enhanceModal(modal) {
    if (modal.dataset._bapEnhanced === '1') return;
    modal.dataset._bapEnhanced = '1';

    const subtitle = modal.querySelector('div[style*="font-size:12px"][style*="color:#6b7280"]');
    const nafn = subtitle ? subtitle.textContent.trim() : '';

    const body = modal.querySelector('div[style*="padding:20px"][style*="overflow-y:auto"]');
    if (!body) return;

    // Inject Áætlað-picker before the price preview section.
    const choiceRow = document.createElement('div');
    choiceRow.style.cssText = 'margin-bottom:14px';
    choiceRow.innerHTML =
      '<label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Áætlað næsta þjónusta</label>' +
      '<select id="_bap-choice" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fff;font-weight:600">' +
        '<option value="hledsla">🟢 Hleðsla — full áfylling</option>' +
        '<option value="yfirferd">🔵 Yfirferð — bara skoðun</option>' +
        '<option value="none">⚪ Sleppa — fer ekki í þessari ferð</option>' +
      '</select>' +
      '<div style="font-size:11px;color:#94a3b8;margin-top:4px">Stillingin gildir fyrir öll tækin sem þú bætir núna. Þú getur breytt henni per tæki í tækjalistanum eftir á.</div>';
    body.appendChild(choiceRow);

    // Then the price preview section.
    const section = buildSection();
    body.appendChild(section);

    // Default the service to Yfirferð for families that never get a Hleðsla
    // (Brunaslanga, skynjarar, teppi) and for CO₂/Léttvatn/ABF — matches the
    // cost-calculator defaults so a slanga doesn't bill as Hleðsla/new.
    function syncChoiceDefault() {
      const sel = modal.querySelector('#_bap-choice');
      const t = (modal.querySelector('#_ba_type') || {}).value || '';
      if (!sel) return;
      const yfirferdDefault = SIZELESS_SVC.test(t) || /co2|co₂|kolsýr|kolsyr|léttv|lettv|abf|vatn|froð|frod/i.test(t);
      sel.value = yfirferdDefault ? 'yfirferd' : 'hledsla';
    }
    const typeEl = modal.querySelector('#_ba_type');
    if (typeEl) typeEl.addEventListener('change', () => { syncChoiceDefault(); recompute(modal, nafn); });
    syncChoiceDefault();

    // Wire input changes (recompute on every change).
    const onChange = () => recompute(modal, nafn);
    ['_ba_type', '_ba_size', '_ba_qty', '_bap-choice'].forEach(id => {
      const el = modal.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('input', onChange);
      el.addEventListener('change', onChange);
    });
    setTimeout(onChange, 100);

    // Hook the Save button — when modal closes after insert, write the
    // áætlað choice for each new unit into tripState.
    const saveBtn = modal.querySelector('#_ba_save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const choice = modal.querySelector('#_bap-choice')?.value || 'hledsla';
        const qty = parseInt(modal.querySelector('#_ba_qty').value, 10) || 0;
        const coId = lookupCoIdByName(nafn);
        if (!coId || !qty) return;
        // hleðsla is the default in patch 129 anyway → no need to persist.
        if (choice === 'hledsla') return;
        // Watch for modal removal — then apply.
        const startTs = Date.now();
        const obs = new MutationObserver(() => {
          if (!document.body.contains(modal)) {
            obs.disconnect();
            applyChoiceToRecent(coId, nafn, qty, choice, startTs);
          }
        });
        obs.observe(document.body, { childList: true });
        // Safety timeout — if modal doesn't disappear within 8s, stop watching.
        setTimeout(() => obs.disconnect(), 8000);
      }, true);
    }
  }

  async function applyChoiceToRecent(coId, nafn, qty, choice, sinceTs) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return;
    // Query the most recently inserted units for this client.
    const { data } = await sb.from('uttaeki')
      .select('id,created_at')
      .eq('client', nafn)
      .order('created_at', { ascending: false })
      .limit(qty);
    if (!data || !data.length) return;
    const key = 'slokk_trip_' + coId;
    let st = {};
    try { st = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
    st.units = st.units || {};
    data.forEach(u => { st.units[u.id] = choice; });
    localStorage.setItem(key, JSON.stringify(st));
    if (typeof window.recomputeCompanyTotalCost === 'function') {
      window.recomputeCompanyTotalCost();
    }
  }

  // Watch the body for the bulk-add modal appearing.
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.id === '_bulkadd_modal') enhanceModal(n);
        else if (n.querySelector) {
          const inner = n.querySelector('#_bulkadd_modal');
          if (inner) enhanceModal(inner);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Catch the case where the modal is already in the DOM at install time.
  const existing = document.getElementById('_bulkadd_modal');
  if (existing) enhanceModal(existing);

  // Pre-warm the services cache.
  loadServices().catch(() => {});

  console.log('[bulk-add-pricing] installed');
})();
