/* === VERTÍÐ — fjöl-fyrirtækja móttöku-vinnuborð (seasonal bulk intake) v2 ===
 *
 * Vandamálið (Agnar, vertíðin): rútu-/ferðafyrirtæki (Hagvagnar þjónusta o.fl.)
 * koma með hundruð slökkvitækja í einu — 15 fyrirtæki, 300+ tæki á einni viku,
 * stundum 10 í einu og sótt 7 til baka, bara skrifað á blað. Sölu-karfan og
 * fyrirtækjaspjaldið ráða ekki við þetta: það þarf MÖRG fyrirtæki opin í einu,
 * hvert með sinn vaxandi tækjalista, sem helst opið dögum saman á meðan hringt
 * er/yfirfarið — og í lokin EINN reikningur (krafa í banka) á hvert fyrirtæki.
 *
 * Sérstök síða sem tengir saman það sem þegar er til:
 *   • customers_base  → fyrirtækin (Hagvagnar þjónusta er þar nú þegar)
 *   • seasonal_job    → ein opin "vertíð" (drög) per fyrirtæki  (úr patch 179)
 *   • uttaeki         → tækin, hengd á vertíðina (seasonal_job_id), með
 *                       service_choice + received_at/picked_up_at (DB-vistað)
 *   • QR-prentun      → Print.showQR / Print.showJob  (patch 139)
 *   • verðvél         → sömu föll og patch 129 + CompanyPricing tilboðsverð
 *   • reikningur      → solur greitt_med='reikningur' + SalaInvoice (patch 165)
 *
 * v2 bætir við:
 *   • Innskráning / útskráning (móttöku-dags + "Sækja" útskráning per tæki).
 *   • Tilboðsverð fyrirtækis (patch 113) sjálfvirkt + breytanleg verð + afsláttur
 *     (kr eða %) í reikningsglugga áður en vistað er.
 *   • Fyrri reikningar fyrirtækis — opna aftur og prenta sem PDF hvenær sem er.
 */
(() => {
  if (window.__vertidInstalled) return;
  window.__vertidInstalled = true;

  const VIEW_ID = 'view-vertid';
  const NAV_KEY = 'vertid';

  // ── tiny utils ───────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[vertid]', m); }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function getTech() { try { return localStorage.getItem('mt_tech') || ''; } catch (_) { return ''; } }
  function setTech(v) { try { localStorage.setItem('mt_tech', v || ''); } catch (_) {} }
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function addMonthsIso(iso, m) { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); }
  function ddmm(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '.' + m[2] : ''; }

  // ── per-unit service choices (mirror patch 131) ──────────────────────────
  const CHOICES = [
    { v: 'hledsla',  label: 'Hleðsla',  color: '#166534', bg: '#dcfce7' },
    { v: 'yfirferd', label: 'Yfirferð', color: '#1e40af', bg: '#dbeafe' },
    { v: 'nyitt',    label: 'Nýtt',     color: '#6b21a8', bg: '#f3e8ff' },
    { v: 'onytt',    label: 'Ónýtt',    color: '#991b1b', bg: '#fecaca' },
    { v: 'none',     label: 'Sleppa',   color: '#64748b', bg: '#f1f5f9' },
  ];
  function defaultForType(typeText) {
    const t = (typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'hledsla';
    if (/co2|co₂|co_?2|kolsýr|kolsyr/.test(t)) return 'yfirferd';
    if (/léttv|lettv|abf|vatn|water/.test(t)) return 'yfirferd';
    return 'yfirferd';
  }
  function choiceOf(u) { return u.service_choice || defaultForType(u.type); }

  function typeBucket(typeText) {
    const t = (typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'duft';
    if (/co2|co₂|co_?2|kolsýr|kolsyr/.test(t)) return 'co2';
    if (/léttv|lettv|abf|vatn|water|froð/.test(t)) return 'lettvatn';
    if (/brunaslang|brunaslöng|brunaslong|hose/.test(t)) return 'slangur';
    if (/reykskynj|smoke/.test(t)) return 'reyk';
    return 'annad';
  }
  // Common sizes per type — fed into the "Bæta tækjum" size datalist so sizes
  // "come in" as suggestions instead of having to be typed blind.
  function sizesForType(typeText) {
    // Eldvarnateppi/reykskynjari have no kg/ltr size — don't suggest kg for them.
    if (/teppi|blanket/.test(String(typeText || '').toLowerCase())) return ['1 m', '1,2 m', '1,8 m'];
    const b = typeBucket(typeText);
    if (b === 'duft')     return ['1 kg', '2 kg', '4 kg', '6 kg', '9 kg', '12 kg', '25 kg', '50 kg'];
    if (b === 'co2')      return ['2 kg', '5 kg', '10 kg'];
    if (b === 'lettvatn') return ['6 ltr', '9 ltr', '25 ltr', '50 ltr'];
    if (b === 'slangur')  return ['19 mm', '25 mm', '3/4"', '1"'];
    if (b === 'reyk')     return [];
    return ['2 kg', '6 kg', '9 ltr', '6 ltr'];
  }
  const BUCKETS = [
    { v: 'all',      label: '🔘 Allt' },
    { v: 'duft',     label: '🧯 Duft' },
    { v: 'lettvatn', label: '💧 Léttvatn' },
    { v: 'co2',      label: '🌫 CO₂' },
    { v: 'slangur',  label: '🚒 Slöngur' },
    { v: 'reyk',     label: '🚨 Reyk' },
    { v: 'annad',    label: '⚙ Annað' },
  ];

  // ── pricing engine — copied from patch 129 so reikningurinn verðleggst eins.
  function normalizeTypeFamily(t) {
    const s = String(t || '').toLowerCase();
    if (!s.trim()) return '—';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(s)) return 'Duft';
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(s)) return 'CO₂';
    if (/léttv|lettv|abf|froð|frod/.test(s)) return 'Léttvatn';
    if (/brunaslang|brunaslöng|brunaslong|hose/.test(s)) return 'Brunaslanga';
    if (/reykskynj|smoke/.test(s)) return 'Reykskynjari';
    if (/teppi|blanket/.test(s)) return 'Eldvarnateppi';
    return t || '—';
  }
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae')
      .replace(/[áàâ]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
      .replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u').replace(/[ýỳ]/g, 'y').replace(/ö/g, 'o')
      .replace(/[₀-₉]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 0x30))
      .replace(/[⁰¹²³⁴-⁹]/g, ch => {
        const map = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9' };
        return map[ch] || ch;
      })
      .replace(/[._,()]/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  }
  function tokenMatches(qTok, nTok) {
    if (qTok === nTok) return true;
    if (qTok.length < 4 || nTok.length < 4) return false;
    const stemLen = Math.min(qTok.length, nTok.length, 5);
    if (qTok.slice(0, stemLen) === nTok.slice(0, stemLen)) return true;
    if (qTok.includes(nTok) || nTok.includes(qTok)) return true;
    return false;
  }
  function findMatchingServices(type, size, services) {
    const qTokens = norm(type + ' ' + size).split(' ').filter(Boolean);
    const candidates = [];
    for (const p of services) {
      const n = norm(p.nafn);
      const isHledsla = /hledsla/.test(n);
      const isYfirferd = /yfirferd/.test(n);
      if (!isHledsla && !isYfirferd) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0, strong = 0;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) { matched++; if (q.length >= 3) strong++; }
      }
      if (strong === 0) continue;
      const score = matched / Math.max(1, qTokens.length);
      if (score >= 0.5) candidates.push({ product: p, score, kind: isHledsla ? 'hledsla' : 'yfirferd' });
    }
    candidates.sort((a, b) => a.kind !== b.kind ? (a.kind === 'hledsla' ? -1 : 1) : b.score - a.score);
    return candidates.map(c => c.product);
  }
  function pickByKind(matching, kind) {
    for (const p of matching) {
      const n = norm(p.nafn);
      if (kind === 'hledsla' && /hledsla/.test(n)) return p;
      if (kind === 'yfirferd' && /yfirferd/.test(n)) return p;
    }
    return matching[0] || null;
  }
  function findReplacementProduct(type, size, services) {
    const qTokens = norm(type + ' ' + size).split(' ').filter(Boolean);
    // 2026-06-16: size-conflict guard (kept in sync with patch 129). A size
    // token starts with a digit ("6","9","19") — not "co2"/"kg". If query and
    // candidate both carry size tokens and none agree, skip so we don't bill
    // the wrong size's price; the line surfaces as unmatched instead.
    const isSize = t => /^\d/.test(t);
    const qHasSize = qTokens.some(isSize);
    let best = null;
    for (const p of services) {
      const n = norm(p.nafn);
      if (/hledsla|yfirferd/.test(n)) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0, strong = 0, sizeAgrees = false;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) { matched++; if (q.length >= 3) strong++; if (isSize(q)) sizeAgrees = true; }
      }
      if (strong === 0) continue;
      const pHasSize = nTokens.some(isSize);
      if (qHasSize && pHasSize && !sizeAgrees) continue; // size conflict → don't mis-bill
      const score = matched / Math.max(1, qTokens.length);
      if (score >= 0.5 && (!best || score > best.score)) best = { product: p, score };
    }
    return best ? best.product : null;
  }
  // Per-company Tilboðsverð override (patch 113) — coId = originating fyrirtæki id.
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

  // Price one unit by its choice. coId = base.source_f_id (for tilboðsverð).
  function priceForUnit(u, coId) {
    const ch = choiceOf(u);
    const services = state.services || [];
    let prod = null;
    if (ch === 'hledsla' || ch === 'yfirferd') prod = pickByKind(findMatchingServices(u.type, u.size, services), ch);
    else if (ch === 'nyitt') prod = findReplacementProduct(u.type, u.size, services);
    else return { billable: false }; // onytt / none
    if (!prod) return { billable: false, unmatched: true };
    const ov = findOverride(coId, prod.nafn);
    return {
      billable: true, productName: prod.nafn,
      unit_price_ex_vat: ov ? +ov.price_ex_vat || 0 : +prod.verd_an_vsk || 0,
      vsk_pct: ov ? (+ov.vsk_pct || 24) : (+prod.vsk_prosenta || 24),
      deal: !!ov,
    };
  }

  // Aggregate a job's units into invoice lines + totals.
  function billFor(units, coId) {
    const groups = {};
    let billed = 0, unmatched = 0, deal = false;
    units.forEach(u => {
      const ch = choiceOf(u);
      if (ch === 'onytt' || ch === 'none') return;
      const p = priceForUnit(u, coId);
      if (!p.billable) { if (p.unmatched) unmatched++; return; }
      billed++; if (p.deal) deal = true;
      const key = p.productName + '|' + p.unit_price_ex_vat + '|' + p.vsk_pct;
      if (!groups[key]) groups[key] = { desc: p.productName, qty: 0, unit_price_ex_vat: p.unit_price_ex_vat, vsk_pct: p.vsk_pct, deal: p.deal };
      groups[key].qty++;
    });
    const linur = Object.values(groups).sort((a, b) => b.qty - a.qty);
    let subEx = 0, vsk = 0;
    linur.forEach(l => { const s = l.qty * l.unit_price_ex_vat; subEx += s; vsk += s * (l.vsk_pct / 100); });
    return { linur, subEx, vsk, total: subEx + vsk, billed, unmatched, deal };
  }

  // Totals for an (optionally edited) line set + a discount spec.
  // discount = { mode:'kr'|'pct', value:number }. kr is taken off the FINAL m. VSK.
  function computeTotals(linur, discount) {
    let rawEx = 0, rawVsk = 0;
    linur.forEach(l => { const s = (+l.qty || 0) * (+l.unit_price_ex_vat || 0); rawEx += s; rawVsk += s * ((+l.vsk_pct || 24) / 100); });
    const rawGross = rawEx + rawVsk;
    let factor = 1, pct = 0, kr = 0;
    if (discount && discount.mode === 'pct') {
      pct = Math.max(0, Math.min(100, +discount.value || 0));
      factor = 1 - pct / 100;
    } else if (discount && discount.mode === 'kr') {
      kr = Math.max(0, Math.min(rawGross, +discount.value || 0));
      factor = rawGross > 0 ? (rawGross - kr) / rawGross : 1;
    }
    const subEx = rawEx * factor, vsk = rawVsk * factor;
    return { rawEx, rawVsk, rawGross, subEx, vsk, total: subEx + vsk, pct, kr };
  }

  // ── state ────────────────────────────────────────────────────────────────
  const state = {
    jobs: [], bases: [], baseById: {}, services: null,
    selectedJobId: null, loading: false, filter: 'all', custodyFilter: 'all',
  };

  async function loadServices() {
    if (state.services) return state.services;
    const SB = getSB(); if (!SB) return [];
    const { data } = await SB.from('vorur').select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,virkt').eq('virkt', true);
    state.services = data || [];
    return state.services;
  }
  async function loadBases() {
    const SB = getSB(); if (!SB) return;
    const { data } = await SB.from('customers_base')
      .select('id,nafn,kennitala,simi,netfang,heimilisfang,source_f_id').order('nafn');
    state.bases = data || [];
    state.baseById = {};
    state.bases.forEach(b => { state.baseById[b.id] = b; });
  }
  async function loadJobs() {
    const SB = getSB(); if (!SB) return;
    const { data: jobs } = await SB.from('seasonal_job')
      .select('id,customer_base_id,title,status,notes,opened_at')
      .eq('status', 'open').order('opened_at', { ascending: false });
    state.jobs = jobs || [];
    const ids = state.jobs.map(j => j.id);
    let units = [];
    if (ids.length) {
      const { data } = await SB.from('uttaeki')
        .select('id,serial,type,size,client,service_choice,custody_status,received_at,picked_up_at,customer_base_id,seasonal_job_id')
        .in('seasonal_job_id', ids);
      units = data || [];
    }
    const byJob = {};
    ids.forEach(id => { byJob[id] = []; });
    units.forEach(u => { if (byJob[u.seasonal_job_id]) byJob[u.seasonal_job_id].push(u); });
    state.jobs.forEach(j => {
      j.units = (byJob[j.id] || []).sort((a, b) => String(a.serial || '').localeCompare(String(b.serial || '')));
      j.base = state.baseById[j.customer_base_id] || null;
      j.coId = j.base ? j.base.source_f_id : null;
      j.bill = billFor(j.units, j.coId);
    });
  }
  async function loadAll() {
    const SB = getSB(); if (!SB) { toast('Engin nettenging'); return; }
    state.loading = true; render();
    await loadServices();
    await Promise.all([loadBases(), loadJobs()]);
    state.loading = false; render();
  }

  function selectedJob() { return state.jobs.find(j => String(j.id) === String(state.selectedJobId)) || null; }

  // ── job lifecycle ──────────────────────────────────────────────────────────
  async function findOrCreateJob(baseId) {
    const SB = getSB(); if (!SB || !baseId) return null;
    const { data: open } = await SB.from('seasonal_job')
      .select('id').eq('customer_base_id', baseId).eq('status', 'open')
      .order('opened_at', { ascending: false }).limit(1);
    if (open && open[0]) return open[0].id;
    const base = state.baseById[baseId];
    const title = (base ? base.nafn : 'Vertíð') + ' — ' +
      new Date().toLocaleDateString('is-IS', { month: 'long', year: 'numeric' });
    const { data: created, error } = await SB.from('seasonal_job')
      .insert({ customer_base_id: baseId, title, status: 'open' }).select('id').single();
    if (error) { toast('Villa: ' + (error.message || error)); return null; }
    return created ? created.id : null;
  }
  async function closeJob(job) {
    const SB = getSB(); if (!SB) return;
    if (!await Confirm.show('Loka vertíð fyrir „' + (job.base ? job.base.nafn : '') + '“? Tækin haldast skráð, en fyrirtækið dettur af borðinu.')) return;
    await SB.from('seasonal_job').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', job.id);
    state.selectedJobId = null;
    toast('Vertíð lokað');
    await loadAll();
  }

  async function logEvent(unit, eventType, custody) {
    const SB = getSB(); if (!SB) return;
    try {
      await SB.from('taeki_events').insert({
        unit_id: unit.id || null, serial: unit.serial || null,
        seasonal_job_id: unit.seasonal_job_id || null, event: eventType,
        custody_status: custody || null, tech: getTech() || null,
      });
    } catch (_) {}
  }

  // ── add company picker ─────────────────────────────────────────────────────
  function openCompanyPicker() {
    document.getElementById('_vt-pick')?.remove();
    const m = document.createElement('div');
    m.id = '_vt-pick';
    m.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px';
    m.innerHTML =
      '<div style="background:#fff;border-radius:14px;width:min(520px,100%);box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden">' +
        '<div style="padding:14px 18px;background:linear-gradient(135deg,#0d6efd,#0a58ca);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div style="font-size:16px;font-weight:700">➕ Bæta fyrirtæki í vertíð</div>' +
          '<button id="_vt-pick-x" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;width:30px;height:30px;border-radius:7px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div style="padding:16px 18px">' +
          '<input id="_vt-pick-q" placeholder="🔍 Leita að fyrirtæki eða kennitölu…" autocomplete="off" ' +
            'style="width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box">' +
          '<div id="_vt-pick-res" style="margin-top:10px;max-height:50vh;overflow:auto"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_vt-pick-x').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    const inp = m.querySelector('#_vt-pick-q');
    const res = m.querySelector('#_vt-pick-res');
    const openJobBaseIds = new Set(state.jobs.map(j => j.customer_base_id));
    const run = () => {
      const q = fold(inp.value);
      const qd = inp.value.replace(/\D/g, '');
      let list = state.bases;
      if (q) list = state.bases.filter(b => fold(b.nafn).includes(q) || (qd && String(b.kennitala || '').replace(/\D/g, '').includes(qd)));
      list = list.slice(0, 40);
      if (!list.length) { res.innerHTML = '<div style="padding:14px;color:#94a3b8;font-style:italic;text-align:center">Engin samsvörun</div>'; return; }
      res.innerHTML = list.map(b => {
        const onBoard = openJobBaseIds.has(b.id);
        return '<div class="_vt-pick-row" data-id="' + b.id + '" style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;cursor:pointer;background:' + (onBoard ? '#f0fdf4' : '#fff') + '">' +
          '<div style="font-weight:700;color:#0f172a;font-size:13.5px">' + esc(b.nafn || '—') +
            (onBoard ? ' <span style="font-size:9px;background:#dcfce7;color:#166534;padding:2px 7px;border-radius:99px;font-weight:700">á borðinu</span>' : '') + '</div>' +
          (b.kennitala ? '<div style="font-size:11px;color:#64748b;font-family:monospace;margin-top:2px">kt. ' + esc(b.kennitala) + (b.simi ? ' · 📞 ' + esc(b.simi) : '') + '</div>' : '') +
        '</div>';
      }).join('');
      res.querySelectorAll('._vt-pick-row').forEach(r => r.addEventListener('click', async () => {
        const baseId = +r.dataset.id;
        close();
        const jobId = await findOrCreateJob(baseId);
        if (jobId) { state.selectedJobId = jobId; await loadAll(); }
      }));
    };
    inp.addEventListener('input', run);
    setTimeout(() => inp.focus(), 40);
    run();
  }

  // ── add / scan tæki into the selected job ───────────────────────────────────
  function genSerial() { return 'SÆ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000); }
  async function genUniqueSerials(count) {
    const SB = getSB();
    const out = new Set(); let guard = 0;
    while (out.size < count && guard < 60) {
      guard++;
      const need = count - out.size;
      const cand = [];
      for (let i = 0; i < need; i++) { let s; do { s = genSerial(); } while (cand.includes(s) || out.has(s)); cand.push(s); }
      const existing = new Set();
      if (SB && cand.length) {
        try { const { data } = await SB.from('uttaeki').select('serial').in('serial', cand);
          (data || []).forEach(r => existing.add(String(r.serial || '').toUpperCase())); } catch (_) {}
      }
      cand.forEach(s => { if (!existing.has(s.toUpperCase())) out.add(s); });
    }
    return Array.from(out).slice(0, count);
  }

  function openAddModal() {
    const job = selectedJob(); if (!job) return;
    document.getElementById('_vt-add')?.remove();
    const m = document.createElement('div');
    m.id = '_vt-add';
    m.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)">' +
        '<h2 style="margin:0 0 4px;font-size:18px;color:#0f172a">➕ Bæta tækjum við</h2>' +
        '<div style="font-size:12.5px;color:#64748b;margin-bottom:16px">' + esc(job.base ? job.base.nafn : '') + ' · ný raðnúmer + QR-miðar búnir til sjálfkrafa</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:14px">' +
          '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Tegund</label>' +
            '<input id="_vt-type" list="_vt-types" placeholder="Duft / CO₂ / Léttvatn…" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box">' +
            '<datalist id="_vt-types"><option value="Duft"><option value="CO₂"><option value="Léttvatn"><option value="ABF"><option value="Brunaslanga"><option value="Eldvarnateppi"></datalist></div>' +
          '<div style="width:96px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Stærð</label>' +
            '<input id="_vt-size" list="_vt-sizes" placeholder="6 kg" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box"><datalist id="_vt-sizes"></datalist></div>' +
          '<div style="width:84px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Fjöldi</label>' +
            '<input id="_vt-qty" type="number" min="1" step="1" value="1" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;text-align:center;font-weight:700"></div>' +
        '</div>' +
        '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Þjónusta</label>' +
          '<select id="_vt-choice" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;background:#fff">' +
            '<option value="">Sjálfvirkt eftir tegund</option>' + CHOICES.map(c => '<option value="' + c.v + '">' + c.label + '</option>').join('') +
          '</select></div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155;margin-bottom:16px;cursor:pointer"><input type="checkbox" id="_vt-print" checked> 🖨 Prenta QR-miða</label>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_vt-add-x" style="padding:9px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#334155;cursor:pointer">Hætta við</button>' +
          '<button id="_vt-add-ok" style="padding:9px 18px;border-radius:8px;border:1px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_vt-add-x').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    // Type-aware size suggestions — sizes "come in" as a dropdown as you pick a type.
    const typeEl = m.querySelector('#_vt-type');
    const sizeDl = m.querySelector('#_vt-sizes');
    const fillSizes = () => { sizeDl.innerHTML = sizesForType(typeEl.value).map(s => '<option value="' + esc(s) + '">').join(''); };
    typeEl.addEventListener('input', fillSizes); fillSizes();
    m.querySelector('#_vt-add-ok').addEventListener('click', async () => {
      const type = (typeEl.value || '').trim();
      const size = (m.querySelector('#_vt-size').value || '').trim();
      const qty = Math.max(1, parseInt(m.querySelector('#_vt-qty').value, 10) || 1);
      const choice = m.querySelector('#_vt-choice').value || '';   // '' = sjálfvirkt eftir tegund
      const doPrint = m.querySelector('#_vt-print').checked;
      if (!type) { toast('Tegund vantar'); return; }
      close();
      await addUnits(job, { type, size, qty, doPrint, choice });
    });
    setTimeout(() => typeEl.focus(), 40);
  }

  async function addUnits(job, { type, size, qty, doPrint, choice }) {
    const SB = getSB(); if (!SB) return;
    const serials = await genUniqueSerials(qty);
    if (!serials.length) { toast('Gat ekki búið til raðnúmer'); return; }
    const base = job.base; const today = todayIso();
    const rows = serials.map(serial => ({
      serial, type: type || null, size: size || null,
      client: base ? base.nafn : null, customer_base_id: job.customer_base_id || null,
      seasonal_job_id: job.id, custody_status: 'móttekið', status: 'active',
      service_choice: choice || defaultForType(type), received_at: today,
    }));
    let saved = [];
    try {
      const { data, error } = await SB.from('uttaeki').insert(rows).select();
      if (error) throw error;
      saved = data || [];
      for (const u of saved) await logEvent(u, 'arrival', 'móttekið');
      toast('➕ ' + saved.length + ' tæki skráð');
    } catch (e) { toast('Villa: ' + (e.message || e)); return; }
    if (doPrint && saved.length && window.Print && Print.showJob) {
      try { Print.showJob({ customer: base ? base.nafn : '—', phone: base ? (base.simi || '') : '',
        units: saved.map(u => ({ serial: u.serial, type: u.type, size: u.size })) }); } catch (_) {}
    }
    await loadAll();
  }

  function startScan() {
    const job = selectedJob(); if (!job) return;
    if (!window.openQRScanner) { toast('Skanni ekki hlaðinn'); return; }
    window.openQRScanner(serial => handleScan(job, String(serial || '').trim()));
  }
  async function handleScan(job, serial) {
    const SB = getSB(); if (!SB || !serial) return;
    const today = todayIso();
    let unit = null;
    try { const { data } = await SB.from('uttaeki').select('*').ilike('serial', serial).limit(1); unit = data && data[0]; } catch (_) {}
    if (unit) {
      if (String(unit.seasonal_job_id) === String(job.id)) { toast('„' + serial + '“ er þegar í þessari vertíð'); return; }
      const base = job.base;
      await SB.from('uttaeki').update({
        seasonal_job_id: job.id, customer_base_id: job.customer_base_id || unit.customer_base_id,
        client: base ? base.nafn : unit.client, custody_status: 'móttekið',
        service_choice: unit.service_choice || defaultForType(unit.type),
        received_at: today, picked_up_at: null,
      }).eq('id', unit.id);
      unit.seasonal_job_id = job.id;
      await logEvent(unit, 'arrival', 'móttekið');
      toast('📥 ' + serial + ' bætt við');
      await loadAll();
    } else {
      const base = job.base;
      try {
        const { data, error } = await SB.from('uttaeki').insert({
          serial: serial.toUpperCase(), client: base ? base.nafn : null,
          customer_base_id: job.customer_base_id || null, seasonal_job_id: job.id,
          custody_status: 'móttekið', status: 'active', received_at: today,
        }).select().single();
        if (error) throw error;
        await logEvent(data, 'arrival', 'móttekið');
        toast('➕ Nýtt tæki skráð: ' + serial);
        await loadAll();
      } catch (e) { toast('Villa: ' + (e.message || e)); }
    }
  }

  async function setChoice(unitId, value) {
    const SB = getSB(); if (!SB) return;
    const job = selectedJob(); if (!job) return;
    const u = job.units.find(x => String(x.id) === String(unitId));
    if (u) u.service_choice = value;       // optimistic
    job.bill = billFor(job.units, job.coId);
    renderDetailSubtotal(job);
    try { await SB.from('uttaeki').update({ service_choice: value }).eq('id', unitId); }
    catch (e) { toast('Villa við vistun: ' + (e.message || e)); }
  }

  // Check-out / check-in toggle for a single tæki.
  async function togglePickup(unitId) {
    const SB = getSB(); if (!SB) return;
    const job = selectedJob(); if (!job) return;
    const u = job.units.find(x => String(x.id) === String(unitId)); if (!u) return;
    if (u.picked_up_at) {
      await SB.from('uttaeki').update({ picked_up_at: null, custody_status: 'móttekið' }).eq('id', unitId);
      u.picked_up_at = null; u.custody_status = 'móttekið';
      await logEvent(u, 'custody', 'móttekið');
    } else {
      const today = todayIso();
      await SB.from('uttaeki').update({ picked_up_at: today, custody_status: 'afhent' }).eq('id', unitId);
      u.picked_up_at = today; u.custody_status = 'afhent';
      await logEvent(u, 'pickup', 'afhent');
      toast('📦 Sótt: ' + (u.serial || ''));
    }
    render();
  }

  async function removeUnit(unitId) {
    const SB = getSB(); if (!SB) return;
    if (!await Confirm.show('Taka tækið af þessari vertíð? (Raðnúmerið helst í kerfinu.)')) return;
    await SB.from('uttaeki').update({ seasonal_job_id: null, custody_status: null }).eq('id', unitId);
    await loadAll();
  }

  function printUnit(unitId) {
    const job = selectedJob(); if (!job) return;
    const u = job.units.find(x => String(x.id) === String(unitId));
    if (u && window.Print && Print.showQR) { try { Print.showQR(u); } catch (_) {} }
  }

  // ── invoice — editable lines + discount, then save reikningur ───────────────
  function openInvoiceModal(job) {
    const base = job.base || {};
    const b0 = billFor(job.units, job.coId);
    if (!b0.linur.length) { alert('Engin rukkanleg tæki — veldu Hleðsla / Yfirferð / Nýtt á einhverju tæki fyrst.'); return; }
    // Editable working copy of the lines.
    const lines = b0.linur.map(l => ({ desc: l.desc, qty: l.qty, unit_price_ex_vat: l.unit_price_ex_vat, vsk_pct: l.vsk_pct, deal: l.deal }));
    let discount = { mode: 'kr', value: 0 };

    document.getElementById('_vt-inv')?.remove();
    const m = document.createElement('div');
    m.id = '_vt-inv';
    m.style.cssText = 'position:fixed;inset:0;z-index:10070;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML =
      '<div style="background:#fff;border-radius:14px;width:min(720px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.4);overflow:hidden">' +
        '<div style="padding:14px 20px;background:#166534;color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:16px;font-weight:800">🧾 Reikningur — ' + esc(base.nafn || '') + '</div>' +
          '<div style="font-size:11.5px;color:#bbf7d0;margin-top:2px">Breyttu verðum og settu afslátt áður en þú vistar. Krafa í banka.</div></div>' +
          '<button id="_vt-inv-x" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;width:30px;height:30px;border-radius:7px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div style="padding:14px 18px;overflow:auto" id="_vt-inv-body"></div>' +
        '<div style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">' +
          '<button id="_vt-inv-cancel" style="padding:10px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_vt-inv-ok" style="padding:11px 22px;background:#166534;color:#fff;border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:14px;font-weight:800">✓ Vista & opna reikning</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_vt-inv-x').addEventListener('click', close);
    m.querySelector('#_vt-inv-cancel').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });

    const body = m.querySelector('#_vt-inv-body');
    function paint() {
      const t = computeTotals(lines, discount);
      body.innerHTML =
        (b0.unmatched ? '<div style="margin-bottom:10px;padding:8px 10px;background:#fef3c7;border:1px solid #fde68a;border-radius:7px;font-size:12px;color:#78350f">⚠ ' + b0.unmatched + ' tæki fundu ekki verð í verðlista og eru ekki á reikningnum.</div>' : '') +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="text-align:left;color:#64748b;font-size:10px;text-transform:uppercase">' +
            '<th style="padding:6px 6px">Lýsing</th><th style="padding:6px 6px;text-align:center;width:50px">Fjöldi</th>' +
            '<th style="padding:6px 6px;text-align:right;width:120px">Einingaverð án VSK</th><th style="padding:6px 6px;text-align:right;width:60px">VSK</th>' +
            '<th style="padding:6px 6px;text-align:right;width:100px">Upphæð</th></tr></thead>' +
          '<tbody>' + lines.map((l, i) =>
            '<tr style="border-top:1px solid #f1f5f9">' +
              '<td style="padding:6px 6px">' + esc(l.desc) + (l.deal ? ' <span style="font-size:9px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;padding:1px 5px;font-weight:700">💰 tilboð</span>' : '') + '</td>' +
              '<td style="padding:6px 6px;text-align:center"><input class="_vt-l-qty" data-i="' + i + '" type="number" min="0" step="1" value="' + l.qty + '" style="width:46px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:center"></td>' +
              '<td style="padding:6px 6px;text-align:right"><input class="_vt-l-price" data-i="' + i + '" type="number" min="0" step="1" value="' + Math.round(l.unit_price_ex_vat) + '" style="width:100px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right"></td>' +
              '<td style="padding:6px 6px;text-align:right;color:#64748b">' + l.vsk_pct + '%</td>' +
              '<td class="_vt-l-amt" data-i="' + i + '" style="padding:6px 6px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(l.qty * l.unit_price_ex_vat) + '</td>' +
            '</tr>').join('') + '</tbody>' +
        '</table>' +
        '<div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap">' +
          '<span style="font-size:13px;color:#475569;font-weight:600">Afsláttur:</span>' +
          '<input id="_vt-disc-val" type="number" min="0" step="1" value="' + (discount.value || 0) + '" style="width:110px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;text-align:right">' +
          '<select id="_vt-disc-mode" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px">' +
            '<option value="kr"' + (discount.mode === 'kr' ? ' selected' : '') + '>kr (m. VSK)</option>' +
            '<option value="pct"' + (discount.mode === 'pct' ? ' selected' : '') + '>%</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-top:12px;border-top:2px solid #166534;padding-top:10px;display:flex;flex-direction:column;gap:3px;align-items:flex-end;font-variant-numeric:tabular-nums">' +
          '<div style="font-size:12.5px;color:#475569">Án VSK: <b>' + fmtKr(t.subEx) + '</b></div>' +
          '<div style="font-size:12.5px;color:#475569">VSK: <b>' + fmtKr(t.vsk) + '</b></div>' +
          ((t.pct > 0 || t.kr > 0) ? '<div style="font-size:12.5px;color:#b91c1c">Afsláttur: −' + fmtKr(t.rawGross - t.total) + '</div>' : '') +
          '<div style="font-size:18px;font-weight:800;color:#166534;margin-top:2px">Til greiðslu: ' + fmtKr(t.total) + '</div>' +
        '</div>';
      // Update the line's amount cell + totals foot in place (no full paint() —
      // rebuilding the inputs on each keystroke stole focus / dropped digits).
      const repriceLine = i => { const a = body.querySelector('._vt-l-amt[data-i="' + i + '"]'); if (a) a.textContent = fmtKr(lines[i].qty * lines[i].unit_price_ex_vat); recalcOnly(); };
      body.querySelectorAll('._vt-l-qty').forEach(inp => inp.addEventListener('input', () => { const i = +inp.dataset.i; lines[i].qty = Math.max(0, parseInt(inp.value, 10) || 0); repriceLine(i); }));
      body.querySelectorAll('._vt-l-price').forEach(inp => inp.addEventListener('input', () => { const i = +inp.dataset.i; lines[i].unit_price_ex_vat = Math.max(0, parseFloat(inp.value) || 0); repriceLine(i); }));
      body.querySelector('#_vt-disc-val').addEventListener('input', e => { discount.value = Math.max(0, parseFloat(e.target.value) || 0); recalcOnly(); });
      body.querySelector('#_vt-disc-mode').addEventListener('change', e => { discount.mode = e.target.value; paint(); });
    }
    // Light recompute of just the totals block without rebuilding inputs (keeps focus).
    function recalcOnly() {
      const t = computeTotals(lines, discount);
      const foot = body.lastElementChild;
      if (!foot) return;
      foot.innerHTML =
        '<div style="font-size:12.5px;color:#475569">Án VSK: <b>' + fmtKr(t.subEx) + '</b></div>' +
        '<div style="font-size:12.5px;color:#475569">VSK: <b>' + fmtKr(t.vsk) + '</b></div>' +
        ((t.pct > 0 || t.kr > 0) ? '<div style="font-size:12.5px;color:#b91c1c">Afsláttur: −' + fmtKr(t.rawGross - t.total) + '</div>' : '') +
        '<div style="font-size:18px;font-weight:800;color:#166534;margin-top:2px">Til greiðslu: ' + fmtKr(t.total) + '</div>';
    }
    paint();

    m.querySelector('#_vt-inv-ok').addEventListener('click', async () => {
      const okBtn = m.querySelector('#_vt-inv-ok');
      const finalLines = lines.filter(l => l.qty > 0);
      if (!finalLines.length) { toast('Engar línur með fjölda > 0'); return; }
      okBtn.disabled = true; okBtn.textContent = 'Vista…';
      try {
        await saveInvoice(job, finalLines, discount);
        close();
      } catch (e) { okBtn.disabled = false; okBtn.textContent = '✓ Vista & opna reikning'; alert('Villa: ' + (e.message || e)); }
    });
  }

  async function saveInvoice(job, lines, discount) {
    const SB = getSB(); const base = job.base || {};
    const t = computeTotals(lines, discount);
    const today = todayIso();
    const next = addMonthsIso(today, 12);
    // Bump inspection dates on serviced units.
    const servicedIds = job.units.filter(u => { const c = choiceOf(u); return c === 'hledsla' || c === 'yfirferd' || c === 'nyitt'; }).map(u => u.id);
    if (servicedIds.length) { try { await SB.from('uttaeki').update({ last_insp: today, next_insp: next }).in('id', servicedIds); } catch (_) {} }

    // linur shape matches SalaInvoice.renderFromSale: per-line discount_pct for %,
    // or sale-level afslattur (kr off gross) — auto-detected on re-print.
    const pct = t.pct;
    const linur = lines.map(l => ({ desc: l.desc, qty: l.qty, unit_price_ex_vat: l.unit_price_ex_vat, vsk_pct: l.vsk_pct, discount_pct: pct > 0 ? pct : 0 }));
    const custId = base.source_f_id || null;
    let saleId = null, saleNum = '';
    const ins = await SB.from('solur').insert({
      customer_nafn: base.nafn || null, customer_id: custId,
      starfsmadur: getTech() || 'Kassi', linur,
      upphaed_an_vsk: Math.round(t.subEx), vsk_upphaed: Math.round(t.vsk), samtals: Math.round(t.total),
      afslattur: pct > 0 ? 0 : Math.round(t.kr),
      greitt_med: 'reikningur',
      athugasemdir: 'Vertíð ' + new Date().getFullYear() + ' — ' + lines.reduce((s, l) => s + l.qty, 0) + ' tæki',
    }).select('id,num').single();
    if (ins.error) throw ins.error;
    saleId = ins.data && ins.data.id; saleNum = ins.data && ins.data.num;
    toast('🧾 Reikningur ' + (saleNum || '') + ' búinn til');

    // Open for printing (→ Save as PDF).
    if (saleId && window.SalaInvoice && SalaInvoice.renderFromSale) {
      try {
        const r = await SB.from('solur').select('*').eq('id', saleId).single();
        if (r.data) {
          const custData = { id: custId, nafn: base.nafn, kennitala: base.kennitala, heimilisfang: base.heimilisfang, simi: base.simi };
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) SalaInvoice.renderFromSale(w, r.data, custData, {});
        }
      } catch (_) {}
    }
    await loadAll();
    setTimeout(() => { const j = state.jobs.find(x => String(x.id) === String(job.id)); if (j) closeJob(j); }, 300);
  }

  // Re-open a previously saved reikningur (from the company's past invoices).
  async function reopenInvoice(saleId, base) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('solur').select('*').eq('id', saleId).single();
      if (r.data && window.SalaInvoice && SalaInvoice.renderFromSale) {
        const custData = base ? { id: base.source_f_id, nafn: base.nafn, kennitala: base.kennitala, heimilisfang: base.heimilisfang, simi: base.simi } : null;
        const w = window.open('', '_blank', 'width=900,height=1100');
        if (w) SalaInvoice.renderFromSale(w, r.data, custData, {});
      }
    } catch (e) { toast('Villa: ' + (e.message || e)); }
  }
  async function loadPastInvoices(job) {
    const SB = getSB(); if (!SB) return [];
    const base = job.base || {};
    const seen = new Map();
    try {
      if (base.source_f_id) {
        const a = await SB.from('solur').select('id,num,created_at,samtals,greitt_med,paid_at').eq('customer_id', base.source_f_id).order('created_at', { ascending: false }).limit(40);
        (a.data || []).forEach(r => seen.set(r.id, r));
      }
      if (base.nafn) {
        const b = await SB.from('solur').select('id,num,created_at,samtals,greitt_med,paid_at').eq('customer_nafn', base.nafn).order('created_at', { ascending: false }).limit(40);
        (b.data || []).forEach(r => seen.set(r.id, r));
      }
    } catch (_) {}
    return Array.from(seen.values()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  // ── render: board (all companies) ──────────────────────────────────────────
  function jobCard(j) {
    const b = j.base; const units = j.units || []; const n = units.length;
    const inHouse = units.filter(u => !u.picked_up_at).length;
    const counts = { hledsla: 0, yfirferd: 0, nyitt: 0, onytt: 0 };
    units.forEach(u => { const c = choiceOf(u); if (counts[c] != null) counts[c]++; });
    const chip = (lbl, v, bg, fg) => v ? '<span style="background:' + bg + ';color:' + fg + ';font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px">' + lbl + ' ' + v + '</span>' : '';
    return '<div class="_vt-card" data-id="' + j.id + '" style="border:1px solid #e2e8f0;border-radius:13px;padding:15px 16px;background:#fff;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:box-shadow .12s" onmouseover="this.style.boxShadow=\'0 4px 14px rgba(0,0,0,.10)\'" onmouseout="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.04)\'">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">' +
        '<div style="font-size:15.5px;font-weight:800;color:#0f172a">' + esc(b ? b.nafn : 'Óþekkt') + '</div>' +
        '<div style="font-size:12px;color:#64748b;white-space:nowrap">' + n + ' tæki</div>' +
      '</div>' +
      (b && b.kennitala ? '<div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ' + esc(b.kennitala) + '</div>' : '') +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
        chip('Hleðsla', counts.hledsla, '#dcfce7', '#166534') + chip('Yfirferð', counts.yfirferd, '#dbeafe', '#1e40af') +
        chip('Nýtt', counts.nyitt, '#f3e8ff', '#6b21a8') + chip('Ónýtt', counts.onytt, '#fecaca', '#991b1b') +
        (n === 0 ? '<span style="font-size:11px;color:#cbd5e1;font-style:italic">engin tæki enn</span>' : '') +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:10px;border-top:1px dashed #e2e8f0">' +
        '<div style="font-size:11px;color:#64748b">' + inHouse + ' í húsi · áætl. reikn.</div>' +
        '<div style="font-size:17px;font-weight:800;color:#166534;font-variant-numeric:tabular-nums">' + fmtKr(j.bill ? j.bill.total : 0) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderBoard(main) {
    const total = state.jobs.reduce((s, j) => s + (j.bill ? j.bill.total : 0), 0);
    const tcount = state.jobs.reduce((s, j) => s + (j.units || []).length, 0);
    main.innerHTML = '<div style="max-width:1100px;margin:0 auto;padding:18px 20px 60px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px">' +
        '<div style="font-size:21px;font-weight:800;color:#0f172a">📅 Vertíð <span style="font-size:13px;font-weight:500;color:#94a3b8">— móttöku-vinnuborð</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<input id="_vt-tech" placeholder="Starfsmaður" value="' + esc(getTech()) + '" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12.5px;width:130px">' +
          '<button id="_vt-refresh" style="padding:9px 13px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">↻ Sækja</button>' +
          '<button id="_vt-addco" style="padding:9px 16px;background:#0d6efd;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#fff">➕ Bæta fyrirtæki</button>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:#64748b;margin-bottom:16px">' + state.jobs.length + ' fyrirtæki opin · ' + tcount + ' tæki · áætlaðir reikningar samtals <b style="color:#166534">' + fmtKr(total) + '</b></div>' +
      (state.loading ? '<div style="opacity:.6;padding:24px">Hleður…</div>' :
        (state.jobs.length ?
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">' + state.jobs.map(jobCard).join('') + '</div>' :
          '<div style="text-align:center;padding:50px 20px;color:#94a3b8"><div style="font-size:40px">📭</div><div style="margin-top:8px;font-size:14px">Engin vertíð opin. Smelltu „➕ Bæta fyrirtæki" til að byrja.</div></div>')) +
    '</div>';
    main.querySelector('#_vt-refresh')?.addEventListener('click', loadAll);
    main.querySelector('#_vt-addco')?.addEventListener('click', openCompanyPicker);
    const techEl = main.querySelector('#_vt-tech');
    techEl?.addEventListener('change', () => setTech(techEl.value.trim()));
    main.querySelectorAll('._vt-card').forEach(c => c.addEventListener('click', () => { state.selectedJobId = c.dataset.id; render(); }));
  }

  // ── render: company detail ─────────────────────────────────────────────────
  function unitRow(u) {
    const cur = choiceOf(u);
    const cd = CHOICES.find(c => c.v === cur) || CHOICES[0];
    const opts = CHOICES.map(c => '<option value="' + c.v + '"' + (c.v === cur ? ' selected' : '') + '>' + c.label + '</option>').join('');
    const picked = !!u.picked_up_at;
    const pickCell = picked
      ? '<button class="_vt-pick-toggle" data-id="' + u.id + '" title="Afturkalla sókn" style="background:#dcfce7;border:1px solid #86efac;color:#166534;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✓ Sótt ' + esc(ddmm(u.picked_up_at)) + '</button>'
      : '<button class="_vt-pick-toggle" data-id="' + u.id + '" title="Skrá sótt" style="background:#fff;border:1px solid #cbd5e1;color:#475569;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Sækja</button>';
    return '<tr data-bucket="' + typeBucket(u.type) + '" data-picked="' + (picked ? '1' : '0') + '" style="border-top:1px solid #f1f5f9' + (picked ? ';opacity:.6' : '') + '">' +
      '<td style="padding:6px 10px;font-family:monospace;font-size:12.5px;font-weight:700;color:#0f172a">' + esc(u.serial || '—') + '</td>' +
      '<td style="padding:6px 10px;font-size:13px;color:#334155">' + esc(u.type || '') + '</td>' +
      '<td style="padding:6px 10px;font-size:13px;color:#64748b">' + esc(u.size || '') + '</td>' +
      '<td style="padding:6px 10px;font-size:11.5px;color:#94a3b8;white-space:nowrap">' + esc(ddmm(u.received_at)) + '</td>' +
      '<td style="padding:6px 10px">' +
        '<select class="_vt-choice" data-id="' + u.id + '" style="padding:3px 7px;border:1px solid ' + cd.bg + ';background:' + cd.bg + ';color:' + cd.color + ';border-radius:6px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' + opts + '</select>' +
      '</td>' +
      '<td style="padding:6px 10px;text-align:center">' + pickCell + '</td>' +
      '<td style="padding:6px 10px;text-align:right;white-space:nowrap">' +
        '<button class="_vt-qr" data-id="' + u.id + '" title="Prenta QR" style="background:none;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px">🖨</button>' +
        '<button class="_vt-rm" data-id="' + u.id + '" title="Taka af vertíð" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:16px;margin-left:4px">×</button>' +
      '</td>' +
    '</tr>';
  }

  function renderDetailSubtotal(job) {
    const el = document.getElementById('_vt-subtotal');
    if (!el) return;
    const b = job.bill || billFor(job.units, job.coId);
    el.innerHTML = b.billed + ' tæki rukkuð' + (b.deal ? ' · 💰 tilboðsverð' : '') + (b.unmatched ? ' · <span style="color:#b45309">⚠ ' + b.unmatched + ' án verðs</span>' : '') +
      ' · <b style="color:#166534;font-size:16px">' + fmtKr(b.total) + '</b> <span style="color:#94a3b8">m. VSK</span>';
  }

  async function renderDetail(main) {
    const job = selectedJob();
    if (!job) { state.selectedJobId = null; renderBoard(main); return; }
    const b = job.base || {};
    const units = (job.units || []);
    const inHouse = units.filter(u => !u.picked_up_at).length;
    const counts = {};
    units.forEach(u => { const k = typeBucket(u.type); counts[k] = (counts[k] || 0) + 1; });
    const chips = BUCKETS.map(bk => {
      const nn = bk.v === 'all' ? units.length : (counts[bk.v] || 0);
      if (bk.v !== 'all' && nn === 0) return '';
      const on = bk.v === state.filter;
      return '<button class="_vt-chip" data-b="' + bk.v + '" style="padding:5px 11px;border:1px solid ' + (on ? '#0f172a' : '#cbd5e1') + ';background:' + (on ? '#0f172a' : '#fff') + ';color:' + (on ? '#fff' : '#475569') + ';border-radius:99px;font:inherit;font-size:12px;font-weight:600;cursor:pointer">' + bk.label + ' <span style="opacity:.65">' + nn + '</span></button>';
    }).join('');
    const custChips = [['all', 'Allt'], ['inhouse', 'Í húsi ' + inHouse], ['picked', 'Sótt ' + (units.length - inHouse)]].map(([v, lbl]) => {
      const on = v === state.custodyFilter;
      return '<button class="_vt-cust" data-c="' + v + '" style="padding:5px 11px;border:1px solid ' + (on ? '#0d6efd' : '#cbd5e1') + ';background:' + (on ? '#0d6efd' : '#fff') + ';color:' + (on ? '#fff' : '#475569') + ';border-radius:99px;font:inherit;font-size:12px;font-weight:600;cursor:pointer">' + lbl + '</button>';
    }).join('');

    main.innerHTML = '<div style="max-width:1000px;margin:0 auto;padding:16px 20px 70px">' +
      '<button id="_vt-back" style="background:none;border:none;color:#0d6efd;font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:4px 0;margin-bottom:8px">← Til baka á vinnuborðið</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
        '<div>' +
          '<div style="font-size:21px;font-weight:800;color:#0f172a">' + esc(b.nafn || 'Óþekkt') + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + (b.kennitala ? 'kt. ' + esc(b.kennitala) : '') + (b.simi ? ' · 📞 ' + esc(b.simi) : '') + ' · ' + units.length + ' tæki · ' + inHouse + ' í húsi</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button id="_vt-scan" style="padding:9px 14px;background:#0d6efd;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#fff">📷 Skanna</button>' +
          '<button id="_vt-add" style="padding:9px 14px;background:#fff;border:1px solid #16a34a;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#16a34a">➕ Bæta tækjum</button>' +
          '<button id="_vt-close" style="padding:9px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#64748b">Loka vertíð</button>' +
        '</div>' +
      '</div>' +
      (units.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px;align-items:center">' + chips + '<span style="width:1px;height:18px;background:#e2e8f0;margin:0 4px"></span>' + custChips + '</div>' : '') +
      (units.length ?
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-top:6px">' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead style="background:#f8fafc"><tr>' +
              ['Raðnúmer', 'Tegund', 'Stærð', 'Móttekið', 'Þjónusta', 'Sókn', ''].map((h, i) =>
                '<th style="padding:8px 10px;text-align:' + (i === 6 ? 'right' : (i === 5 ? 'center' : 'left')) + ';font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">' + h + '</th>').join('') +
            '</tr></thead>' +
            '<tbody id="_vt-rows">' + units.map(unitRow).join('') + '</tbody>' +
          '</table>' +
        '</div>' :
        '<div style="text-align:center;padding:44px 20px;color:#94a3b8;margin-top:14px"><div style="font-size:36px">🧯</div><div style="margin-top:8px">Engin tæki enn — skannaðu eða „Bæta tækjum".</div></div>') +
      '<div id="_vt-past" style="margin-top:18px"></div>' +
      '<div style="position:sticky;bottom:0;margin-top:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 -2px 8px rgba(0,0,0,.04)">' +
        '<div id="_vt-subtotal" style="font-size:13px;color:#166534"></div>' +
        '<button id="_vt-invoice" style="padding:11px 20px;background:#166534;color:#fff;border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:14px;font-weight:800;box-shadow:0 1px 3px rgba(22,101,52,.3)">🧾 Búa til reikning</button>' +
      '</div>' +
    '</div>';

    renderDetailSubtotal(job);
    applyFilter();

    main.querySelector('#_vt-back')?.addEventListener('click', () => { state.selectedJobId = null; state.filter = 'all'; state.custodyFilter = 'all'; render(); });
    main.querySelector('#_vt-scan')?.addEventListener('click', startScan);
    main.querySelector('#_vt-add')?.addEventListener('click', openAddModal);
    main.querySelector('#_vt-close')?.addEventListener('click', () => closeJob(job));
    main.querySelector('#_vt-invoice')?.addEventListener('click', () => openInvoiceModal(job));
    main.querySelectorAll('._vt-chip').forEach(c => c.addEventListener('click', () => { state.filter = c.dataset.b; render(); }));
    main.querySelectorAll('._vt-cust').forEach(c => c.addEventListener('click', () => { state.custodyFilter = c.dataset.c; render(); }));
    main.querySelectorAll('._vt-choice').forEach(s => s.addEventListener('change', e => {
      const sel = e.target; const cd = CHOICES.find(c => c.v === sel.value) || CHOICES[0];
      sel.style.background = cd.bg; sel.style.color = cd.color; sel.style.borderColor = cd.bg;
      setChoice(sel.dataset.id, sel.value);
    }));
    main.querySelectorAll('._vt-pick-toggle').forEach(b2 => b2.addEventListener('click', () => togglePickup(b2.dataset.id)));
    main.querySelectorAll('._vt-qr').forEach(b2 => b2.addEventListener('click', () => printUnit(b2.dataset.id)));
    main.querySelectorAll('._vt-rm').forEach(b2 => b2.addEventListener('click', () => removeUnit(b2.dataset.id)));

    // Past invoices (re-openable to print as PDF).
    const pastEl = main.querySelector('#_vt-past');
    const past = await loadPastInvoices(job);
    if (pastEl && past.length) {
      pastEl.innerHTML = '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">🧾 Fyrri reikningar</div>' +
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
          past.slice(0, 12).map(r => {
            const paid = !!r.paid_at;
            return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid #f1f5f9">' +
              '<div style="font-family:monospace;font-size:12.5px;font-weight:700;color:#0f172a">' + esc(r.num || '') + ' <span style="font-family:inherit;font-weight:400;color:#94a3b8">' + esc(ddmm(r.created_at)) + '.' + new Date(r.created_at).getFullYear() + '</span></div>' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:' + (paid ? '#dcfce7' : '#fef3c7') + ';color:' + (paid ? '#166534' : '#92400e') + '">' + (paid ? '✓ Greitt' : 'Ógreitt') + '</span>' +
                '<span style="font-variant-numeric:tabular-nums;font-weight:600;font-size:13px">' + fmtKr(r.samtals) + '</span>' +
                '<button class="_vt-reopen" data-id="' + r.id + '" style="padding:4px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#0d6efd">Opna / prenta</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      pastEl.querySelectorAll('._vt-reopen').forEach(btn => btn.addEventListener('click', () => reopenInvoice(+btn.dataset.id, job.base)));
    }
  }

  function applyFilter() {
    document.querySelectorAll('#_vt-rows tr').forEach(tr => {
      const typeOk = state.filter === 'all' || tr.dataset.bucket === state.filter;
      const custOk = state.custodyFilter === 'all' ||
        (state.custodyFilter === 'inhouse' && tr.dataset.picked === '0') ||
        (state.custodyFilter === 'picked' && tr.dataset.picked === '1');
      tr.style.display = (typeOk && custOk) ? '' : 'none';
    });
  }

  function render() {
    const main = document.getElementById('_vt-main');
    if (!main) return;
    if (state.selectedJobId && selectedJob()) renderDetail(main);
    else renderBoard(main);
  }

  // ── view + sidebar wiring (mirrors patch 179) ──────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-mottaka') || document.getElementById('view-workshop') ||
                   document.getElementById('view-counter') || document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_vt-main" class="main-panel" style="height:100%;overflow-y:auto"></main>';
    sample.parentElement.appendChild(v);
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    render();
    if (!state.jobs.length && !state.loading) loadAll();
  }
  function patchSwitchView() {
    if (!window.App || window.App._vertidPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._vertidPatched = true;
  }
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const ref = allBtns.find(b => b.getAttribute('data-view') === 'mottaka') ||
                allBtns.find(b => b.getAttribute('data-view') === 'workshop') || allBtns[0];
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
      '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' +
      '<span>Vertíð</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling); else nav.appendChild(btn);
  }
  function boot() {
    injectSidebar(); ensureView(); patchSwitchView();
    [600, 1500, 3000].forEach(t => setTimeout(injectSidebar, t));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Vertid = { open: show, reload: loadAll };
  console.log('[patch-210] Vertíð v2 (seasonal bulk intake) installed');
})();
/* === END VERTÍÐ === */
