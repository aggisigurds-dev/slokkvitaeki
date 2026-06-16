/* === VERTÍÐ — fjöl-fyrirtækja móttöku-vinnuborð (seasonal bulk intake) v1 ===
 *
 * Vandamálið (Agnar, vertíðin): rútu-/ferðafyrirtæki (Hagvagnar þjónusta o.fl.)
 * koma með hundruð slökkvitækja í einu — 15 fyrirtæki, 300+ tæki á einni viku,
 * bara skrifað á blað. Sölu-karfan og fyrirtækjaspjaldið ráða ekki við þetta:
 * ég þarf MÖRG fyrirtæki opin í einu, hvert með sinn vaxandi tækjalista, sem
 * helst opið dögum saman á meðan ég hringi/yfirfer — og í lokin EINN reikningur
 * (krafa í banka) á hvert fyrirtæki.
 *
 * Þetta er sérstök síða sem tengir saman það sem þegar er til:
 *   • customers_base  → fyrirtækin (Hagvagnar þjónusta er þar nú þegar)
 *   • seasonal_job    → ein opin "vertíð" (drög) per fyrirtæki  (úr patch 179)
 *   • uttaeki         → tækin, hengd á vertíðina (seasonal_job_id), með
 *                       service_choice (DB-vistað, samstillt milli tækja/síma)
 *   • QR-prentun      → Print.showQR / Print.showJob  (patch 139)
 *   • verðvél         → sömu föll og patch 129 (hleðsla/yfirferð/nýtt verð)
 *   • reikningur      → solur-færsla greitt_med='reikningur' + SalaInvoice
 *                       (sama leið og patch 165 "Klára heimsókn")
 *
 * service_choice gildi:  'hledsla' | 'yfirferd' | 'nyitt' | 'onytt' | 'none'.
 * Allt DB-vistað → opnast í símanum úti og á tölvunum inni, lifir endurhleðslu.
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

  // Type-filter chips (mirror patch 131).
  function typeBucket(typeText) {
    const t = (typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'duft';
    if (/co2|co₂|co_?2|kolsýr|kolsyr/.test(t)) return 'co2';
    if (/léttv|lettv|abf|vatn|water|froð/.test(t)) return 'lettvatn';
    if (/brunaslang|brunaslöng|brunaslong|hose/.test(t)) return 'slangur';
    if (/reykskynj|smoke/.test(t)) return 'reyk';
    return 'annad';
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

  // ── pricing engine — copied verbatim from patch 129 so the reikningur is
  //    priced EXACTLY like the company-card calculator. ───────────────────────
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
    let best = null;
    for (const p of services) {
      const n = norm(p.nafn);
      if (/hledsla|yfirferd/.test(n)) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0, strong = 0;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) { matched++; if (q.length >= 3) strong++; }
      }
      if (strong === 0) continue;
      const score = matched / Math.max(1, qTokens.length);
      if (score >= 0.5 && (!best || score > best.score)) best = { product: p, score };
    }
    return best ? best.product : null;
  }

  // Price one unit given its current choice. Returns a billable line spec or a
  // non-billable marker (onytt/sleppa, or unmatched in the price list).
  function priceForUnit(u) {
    const ch = choiceOf(u);
    const services = state.services || [];
    if (ch === 'hledsla' || ch === 'yfirferd') {
      const prod = pickByKind(findMatchingServices(u.type, u.size, services), ch);
      if (prod) return { billable: true, productName: prod.nafn, unit_price_ex_vat: +prod.verd_an_vsk || 0, vsk_pct: +prod.vsk_prosenta || 24 };
      return { billable: false, unmatched: true };
    }
    if (ch === 'nyitt') {
      const prod = findReplacementProduct(u.type, u.size, services);
      if (prod) return { billable: true, productName: prod.nafn, unit_price_ex_vat: +prod.verd_an_vsk || 0, vsk_pct: +prod.vsk_prosenta || 24 };
      return { billable: false, unmatched: true };
    }
    return { billable: false }; // onytt / none
  }

  // Aggregate a job's units into invoice lines + totals.
  function billFor(units) {
    const groups = {};
    let billed = 0, unmatched = 0;
    units.forEach(u => {
      const ch = choiceOf(u);
      if (ch === 'onytt' || ch === 'none') return;
      const p = priceForUnit(u);
      if (!p.billable) { if (p.unmatched) unmatched++; return; }
      billed++;
      const key = p.productName + '|' + p.unit_price_ex_vat + '|' + p.vsk_pct;
      if (!groups[key]) groups[key] = { desc: p.productName, qty: 0, unit_price_ex_vat: p.unit_price_ex_vat, vsk_pct: p.vsk_pct };
      groups[key].qty++;
    });
    const linur = Object.values(groups).sort((a, b) => b.qty - a.qty);
    let subEx = 0, vsk = 0;
    linur.forEach(l => { const s = l.qty * l.unit_price_ex_vat; subEx += s; vsk += s * (l.vsk_pct / 100); });
    return { linur, subEx, vsk, total: subEx + vsk, billed, unmatched };
  }

  // ── state ────────────────────────────────────────────────────────────────
  const state = {
    jobs: [], bases: [], baseById: {}, services: null,
    selectedJobId: null, loading: false, filter: 'all',
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
        .select('id,serial,type,size,client,service_choice,custody_status,customer_base_id,seasonal_job_id')
        .in('seasonal_job_id', ids);
      units = data || [];
    }
    const byJob = {};
    ids.forEach(id => { byJob[id] = []; });
    units.forEach(u => { if (byJob[u.seasonal_job_id]) byJob[u.seasonal_job_id].push(u); });
    state.jobs.forEach(j => {
      j.units = (byJob[j.id] || []).sort((a, b) => String(a.serial || '').localeCompare(String(b.serial || '')));
      j.base = state.baseById[j.customer_base_id] || null;
      j.bill = billFor(j.units);
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
    if (!confirm('Loka vertíð fyrir „' + (job.base ? job.base.nafn : '') + '“? Tækin haldast skráð, en fyrirtækið dettur af borðinu.')) return;
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
      if (q) {
        list = state.bases.filter(b =>
          fold(b.nafn).includes(q) || (qd && String(b.kennitala || '').replace(/\D/g, '').includes(qd)));
      }
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
            '<input id="_vt-size" placeholder="6 kg" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box"></div>' +
          '<div style="width:84px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Fjöldi</label>' +
            '<input id="_vt-qty" type="number" min="1" step="1" value="1" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;text-align:center;font-weight:700"></div>' +
        '</div>' +
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
    m.querySelector('#_vt-add-ok').addEventListener('click', async () => {
      const type = (m.querySelector('#_vt-type').value || '').trim();
      const size = (m.querySelector('#_vt-size').value || '').trim();
      const qty = Math.max(1, parseInt(m.querySelector('#_vt-qty').value, 10) || 1);
      const doPrint = m.querySelector('#_vt-print').checked;
      if (!type) { toast('Tegund vantar'); return; }
      close();
      await addUnits(job, { type, size, qty, doPrint });
    });
    setTimeout(() => m.querySelector('#_vt-type').focus(), 40);
  }

  async function addUnits(job, { type, size, qty, doPrint }) {
    const SB = getSB(); if (!SB) return;
    const serials = await genUniqueSerials(qty);
    if (!serials.length) { toast('Gat ekki búið til raðnúmer'); return; }
    const base = job.base;
    const rows = serials.map(serial => ({
      serial, type: type || null, size: size || null,
      client: base ? base.nafn : null, customer_base_id: job.customer_base_id || null,
      seasonal_job_id: job.id, custody_status: 'móttekið', status: 'active',
      service_choice: defaultForType(type),
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
    let unit = null;
    try { const { data } = await SB.from('uttaeki').select('*').ilike('serial', serial).limit(1); unit = data && data[0]; } catch (_) {}
    if (unit) {
      if (String(unit.seasonal_job_id) === String(job.id)) { toast('„' + serial + '“ er þegar í þessari vertíð'); return; }
      const base = job.base;
      await SB.from('uttaeki').update({
        seasonal_job_id: job.id, customer_base_id: job.customer_base_id || unit.customer_base_id,
        client: base ? base.nafn : unit.client, custody_status: 'móttekið',
        service_choice: unit.service_choice || defaultForType(unit.type),
      }).eq('id', unit.id);
      unit.seasonal_job_id = job.id;
      await logEvent(unit, 'arrival', 'móttekið');
      toast('📥 ' + serial + ' bætt við');
      await loadAll();
    } else {
      // Unknown serial → register it on this job (keep the scanned serial).
      const base = job.base;
      try {
        const { data, error } = await SB.from('uttaeki').insert({
          serial: serial.toUpperCase(), client: base ? base.nafn : null,
          customer_base_id: job.customer_base_id || null, seasonal_job_id: job.id,
          custody_status: 'móttekið', status: 'active',
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
    job.bill = billFor(job.units);
    renderDetailSubtotal(job);
    try { await SB.from('uttaeki').update({ service_choice: value }).eq('id', unitId); }
    catch (e) { toast('Villa við vistun: ' + (e.message || e)); }
  }

  async function removeUnit(unitId) {
    const SB = getSB(); if (!SB) return;
    if (!confirm('Taka tækið af þessari vertíð? (Raðnúmerið helst í kerfinu.)')) return;
    await SB.from('uttaeki').update({ seasonal_job_id: null, custody_status: null }).eq('id', unitId);
    await loadAll();
  }

  function printUnit(unitId) {
    const job = selectedJob(); if (!job) return;
    const u = job.units.find(x => String(x.id) === String(unitId));
    if (u && window.Print && Print.showQR) { try { Print.showQR(u); } catch (_) {} }
  }

  // ── invoice (one reikningur per company → solur greitt_med='reikningur') ────
  async function makeInvoice(job) {
    const bill = billFor(job.units);
    if (!bill.linur.length) { alert('Engin rukkanleg tæki — veldu Hleðsla / Yfirferð / Nýtt á einhverju tæki fyrst.'); return; }
    const base = job.base || {};
    const warn = bill.unmatched ? '\n⚠ ' + bill.unmatched + ' tæki fundu ekki verð í verðlista og eru ekki á reikningnum.' : '';
    const summary = bill.linur.map(l => '  • ' + l.qty + '× ' + l.desc + ' — ' + fmtKr(l.qty * l.unit_price_ex_vat)).join('\n');
    if (!confirm('Búa til reikning (krafa í banka) fyrir „' + (base.nafn || '') + '“?\n\n' + summary +
      '\n\nSamtals m. VSK: ' + fmtKr(bill.total) + warn)) return;

    const SB = getSB();
    const today = todayIso();
    const next = addMonthsIso(today, 12);
    // Bump inspection dates on the serviced (hleðsla/yfirferð/nýtt) units.
    const servicedIds = job.units.filter(u => { const c = choiceOf(u); return c === 'hledsla' || c === 'yfirferd' || c === 'nyitt'; }).map(u => u.id);
    if (servicedIds.length) {
      try { await SB.from('uttaeki').update({ last_insp: today, next_insp: next }).in('id', servicedIds); } catch (_) {}
    }
    // customer_id → originating fyrirtæki id so it joins in Kúnnareikningur/Bókhald.
    const custId = base.source_f_id || null;
    let saleId = null;
    try {
      const ins = await SB.from('solur').insert({
        customer_nafn: base.nafn || null,
        customer_id: custId,
        starfsmadur: getTech() || 'Kassi',
        linur: bill.linur,
        upphaed_an_vsk: Math.round(bill.subEx),
        vsk_upphaed: Math.round(bill.vsk),
        samtals: Math.round(bill.total),
        afslattur: 0,
        greitt_med: 'reikningur',
        athugasemdir: 'Vertíð ' + today + ' — ' + bill.billed + ' tæki',
      }).select('id,num').single();
      if (ins.error) throw ins.error;
      saleId = ins.data && ins.data.id;
      toast('🧾 Reikningur ' + (ins.data && ins.data.num ? ins.data.num : '') + ' búinn til');
    } catch (e) { alert('Reikningur vistaðist ekki: ' + (e.message || e)); return; }

    // Open the saved invoice for printing (same path as patch 165).
    if (saleId && window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
      try {
        const r = await SB.from('solur').select('*').eq('id', saleId).single();
        if (r.data) {
          const custData = { id: custId, nafn: base.nafn, kennitala: base.kennitala, heimilisfang: base.heimilisfang, simi: base.simi };
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) SalaInvoice.renderFromSale(w, r.data, custData, {});
        }
      } catch (_) {}
    }
    // Offer to close the vertíð for this company now that it's invoiced.
    setTimeout(() => closeJob(job), 300);
  }

  // ── render: board (all companies) ──────────────────────────────────────────
  function jobCard(j) {
    const b = j.base; const n = (j.units || []).length;
    const counts = { hledsla: 0, yfirferd: 0, nyitt: 0, onytt: 0 };
    (j.units || []).forEach(u => { const c = choiceOf(u); if (counts[c] != null) counts[c]++; });
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
        '<div style="font-size:11px;color:#64748b">Áætlaður reikningur</div>' +
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
    main.querySelectorAll('._vt-card').forEach(c => c.addEventListener('click', () => {
      state.selectedJobId = c.dataset.id; render();
    }));
  }

  // ── render: company detail ─────────────────────────────────────────────────
  function unitRow(u) {
    const cur = choiceOf(u);
    const cd = CHOICES.find(c => c.v === cur) || CHOICES[0];
    const opts = CHOICES.map(c => '<option value="' + c.v + '"' + (c.v === cur ? ' selected' : '') + '>' + c.label + '</option>').join('');
    return '<tr data-bucket="' + typeBucket(u.type) + '" style="border-top:1px solid #f1f5f9">' +
      '<td style="padding:6px 10px;font-family:monospace;font-size:12.5px;font-weight:700;color:#0f172a">' + esc(u.serial || '—') + '</td>' +
      '<td style="padding:6px 10px;font-size:13px;color:#334155">' + esc(u.type || '') + '</td>' +
      '<td style="padding:6px 10px;font-size:13px;color:#64748b">' + esc(u.size || '') + '</td>' +
      '<td style="padding:6px 10px">' +
        '<select class="_vt-choice" data-id="' + u.id + '" style="padding:3px 7px;border:1px solid ' + cd.bg + ';background:' + cd.bg + ';color:' + cd.color + ';border-radius:6px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' + opts + '</select>' +
      '</td>' +
      '<td style="padding:6px 10px;text-align:right;white-space:nowrap">' +
        '<button class="_vt-qr" data-id="' + u.id + '" title="Prenta QR" style="background:none;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px">🖨</button>' +
        '<button class="_vt-rm" data-id="' + u.id + '" title="Taka af vertíð" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:16px;margin-left:4px">×</button>' +
      '</td>' +
    '</tr>';
  }

  function renderDetailSubtotal(job) {
    const el = document.getElementById('_vt-subtotal');
    if (!el) return;
    const b = job.bill || billFor(job.units);
    el.innerHTML = b.billed + ' tæki rukkuð' + (b.unmatched ? ' · <span style="color:#b45309">⚠ ' + b.unmatched + ' án verðs</span>' : '') +
      ' · <b style="color:#166534;font-size:16px">' + fmtKr(b.total) + '</b> <span style="color:#94a3b8">m. VSK</span>';
  }

  function renderDetail(main) {
    const job = selectedJob();
    if (!job) { state.selectedJobId = null; renderBoard(main); return; }
    const b = job.base || {};
    const units = (job.units || []);
    const counts = {};
    units.forEach(u => { const k = typeBucket(u.type); counts[k] = (counts[k] || 0) + 1; });
    const chips = BUCKETS.map(bk => {
      const nn = bk.v === 'all' ? units.length : (counts[bk.v] || 0);
      if (bk.v !== 'all' && nn === 0) return '';
      const on = bk.v === state.filter;
      return '<button class="_vt-chip" data-b="' + bk.v + '" style="padding:5px 11px;border:1px solid ' + (on ? '#0f172a' : '#cbd5e1') + ';background:' + (on ? '#0f172a' : '#fff') + ';color:' + (on ? '#fff' : '#475569') + ';border-radius:99px;font:inherit;font-size:12px;font-weight:600;cursor:pointer">' + bk.label + ' <span style="opacity:.65">' + nn + '</span></button>';
    }).join('');

    main.innerHTML = '<div style="max-width:1000px;margin:0 auto;padding:16px 20px 70px">' +
      '<button id="_vt-back" style="background:none;border:none;color:#0d6efd;font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:4px 0;margin-bottom:8px">← Til baka á vinnuborðið</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
        '<div>' +
          '<div style="font-size:21px;font-weight:800;color:#0f172a">' + esc(b.nafn || 'Óþekkt') + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + (b.kennitala ? 'kt. ' + esc(b.kennitala) : '') + (b.simi ? ' · 📞 ' + esc(b.simi) : '') + ' · ' + units.length + ' tæki</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button id="_vt-scan" style="padding:9px 14px;background:#0d6efd;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#fff">📷 Skanna</button>' +
          '<button id="_vt-add" style="padding:9px 14px;background:#fff;border:1px solid #16a34a;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#16a34a">➕ Bæta tækjum</button>' +
          '<button id="_vt-close" style="padding:9px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#64748b">Loka vertíð</button>' +
        '</div>' +
      '</div>' +
      (units.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 8px">' + chips + '</div>' : '') +
      (units.length ?
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-top:4px">' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead style="background:#f8fafc"><tr>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Raðnúmer</th>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Tegund</th>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Stærð</th>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Þjónusta</th>' +
              '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">QR</th>' +
            '</tr></thead>' +
            '<tbody id="_vt-rows">' + units.map(unitRow).join('') + '</tbody>' +
          '</table>' +
        '</div>' :
        '<div style="text-align:center;padding:44px 20px;color:#94a3b8;margin-top:14px"><div style="font-size:36px">🧯</div><div style="margin-top:8px">Engin tæki enn — skannaðu eða „Bæta tækjum".</div></div>') +
      // sticky footer: subtotal + invoice button
      '<div style="position:sticky;bottom:0;margin-top:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 -2px 8px rgba(0,0,0,.04)">' +
        '<div id="_vt-subtotal" style="font-size:13px;color:#166534"></div>' +
        '<button id="_vt-invoice" style="padding:11px 20px;background:#166534;color:#fff;border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:14px;font-weight:800;box-shadow:0 1px 3px rgba(22,101,52,.3)">🧾 Búa til reikning</button>' +
      '</div>' +
    '</div>';

    renderDetailSubtotal(job);
    applyFilter();

    main.querySelector('#_vt-back')?.addEventListener('click', () => { state.selectedJobId = null; state.filter = 'all'; render(); });
    main.querySelector('#_vt-scan')?.addEventListener('click', startScan);
    main.querySelector('#_vt-add')?.addEventListener('click', openAddModal);
    main.querySelector('#_vt-close')?.addEventListener('click', () => closeJob(job));
    main.querySelector('#_vt-invoice')?.addEventListener('click', () => makeInvoice(job));
    main.querySelectorAll('._vt-chip').forEach(c => c.addEventListener('click', () => { state.filter = c.dataset.b; render(); }));
    main.querySelectorAll('._vt-choice').forEach(s => s.addEventListener('change', e => {
      const sel = e.target; const cd = CHOICES.find(c => c.v === sel.value) || CHOICES[0];
      sel.style.background = cd.bg; sel.style.color = cd.color; sel.style.borderColor = cd.bg;
      setChoice(sel.dataset.id, sel.value);
    }));
    main.querySelectorAll('._vt-qr').forEach(b2 => b2.addEventListener('click', () => printUnit(b2.dataset.id)));
    main.querySelectorAll('._vt-rm').forEach(b2 => b2.addEventListener('click', () => removeUnit(b2.dataset.id)));
  }

  function applyFilter() {
    document.querySelectorAll('#_vt-rows tr').forEach(tr => {
      tr.style.display = (state.filter === 'all' || tr.dataset.bucket === state.filter) ? '' : 'none';
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
  console.log('[patch-210] Vertíð (seasonal bulk intake) installed');
})();
/* === END VERTÍÐ === */
