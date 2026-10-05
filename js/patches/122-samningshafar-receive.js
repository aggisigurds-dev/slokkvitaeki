/* === SAMNINGSHAFAR RECEIVE v1 ===
 *
 * Adds a "📥 Sækja inn úr fyrirtæki" button at the top of the Samningshafar
 * column in Verkstæði. Click → modal that lets you:
 *   1. Search for a service-contract company (or any fyrirtæki)
 *   2. See all of that company's active uttaeki (field equipment)
 *   3. Tick which units the driver brought in (default: all checked)
 *   4. Pick a service type per row (Hleðsla / Skoðun / Viðgerð)
 *   5. Click "Stofna verk" → creates ONE verkbeiðni with a verklidur for
 *      each selected uttaeki. Each verklidur stores `uttaeki_id` so when
 *      the work is finished (patch 121 pickup checkout) we can auto-update
 *      uttaeki.next_insp +12 months and last_insp = today.
 *
 * The verkbeiðni then flows through the normal workshop pipeline (mark
 * done/broken, Sótt ✓, pickup checkout, invoice, kreditreikningur).
 *
 * Requires SQL: sql/verklidur_uttaeki_link.sql (adds uttaeki_id column).
 * Without it, INSERT fails and we fall back to no link (12-mo update
 * skipped at pickup, but flow still works).
 */
(() => {
  if (window.__samningshafarReceiveInstalled) return;
  window.__samningshafarReceiveInstalled = true;

  const SERVICE_TYPES = ['Hleðsla', 'Skoðun', 'Viðgerð', 'Hleðsla + Skoðun'];

  function getSB() { return (window.DB && window.DB.sb) || null; }

  // ── Price lookup ────────────────────────────────────────────────────────
  // For a given (service, type, size) combo, return a list of `vorur` rows
  // whose nafn matches all parts. Service is split on "+" so "Hleðsla + Skoðun"
  // resolves to two separate vorur entries (Hleðsla + Yfirferð).
  let _vorurCache = null;
  async function loadVorur() {
    if (_vorurCache) return _vorurCache;
    const SB = getSB();
    if (!SB) return [];
    const r = await SB.from('vorur').select('id,nafn,verd_an_vsk,vsk_prosenta').eq('virkt', true);
    _vorurCache = r.data || [];
    return _vorurCache;
  }
  function typeKeyword(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('duft')) return 'duft';
    if (t.includes('co')) return 'co';   // matches "CO₂", "co2"
    if (t.includes('léttvatn') || t.includes('vatn')) return 'vatn';
    if (t.includes('fro')) return 'fro';
    if (t.includes('blautt') || t.includes('abf')) return 'abf';
    return '';
  }
  function sizeKeyword(size) {
    // "6 kg" → "6", "100 gr" → "100", "6 L" → "6"
    const m = String(size || '').match(/(\d+)/);
    return m ? m[1] : '';
  }
  function serviceKeywords(service) {
    // Split combined services on "+" or "&"; map to canonical search terms.
    return String(service || '').split(/[+&]/).map(s => {
      const v = s.trim().toLowerCase();
      if (v.startsWith('hleðsla')) return 'hleðsla';
      if (v.startsWith('skoðun') || v.startsWith('yfirferð')) return 'yfirferð';
      if (v.startsWith('viðgerð')) return 'viðgerð';
      return v;
    }).filter(Boolean);
  }
  // Find one vorur row best matching all keyword filters. Returns null if no match.
  function bestMatch(vorur, svcKey, typeKey, sizeKey) {
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ');
    const candidates = vorur.filter(v => {
      const n = norm(v.nafn);
      if (svcKey && !n.includes(svcKey)) return false;
      if (typeKey && !n.includes(typeKey)) return false;
      if (sizeKey && !n.includes(sizeKey)) return false;
      return true;
    });
    return candidates[0] || null;
  }
  // Look up company-specific price override (patch 113 — Tilboðsverð on
  // company profile). Returns the override row {name, price_ex_vat, vsk_pct}
  // or null if none matches.
  function findCompanyPriceOverride(coId, productName) {
    if (!coId || !window.CompanyPricing || typeof CompanyPricing.list !== 'function') return null;
    const overrides = CompanyPricing.list(coId) || [];
    if (!overrides.length) return null;
    const d = String(productName || '').toLowerCase();
    let best = null;
    overrides.forEach(o => {
      const n = String(o.name || '').toLowerCase().trim();
      if (!n) return;
      if (d.indexOf(n) >= 0 || n.indexOf(d) >= 0) {
        if (!best || n.length > String(best.name).length) best = o;
      }
    });
    return best;
  }

  // Build aggregated solur.linur from picked unitState. Each verklidur becomes
  // 1+ solur lines (one per atomic service in its service string). Lines
  // with the same product are merged by qty. Company-specific Tilboðsverð
  // (patch 113) is applied automatically when a company has an override
  // matching the catalog product name (e.g. Hagvagnar with custom hleðsla
  // price gets that price instead of the standard catalog price).
  async function buildLinurFromPicked(picked, companyId) {
    const vorur = await loadVorur();
    const byProduct = new Map(); // key = vorur.id, value = { id, desc, qty, unit_price_ex_vat, vsk_pct, ... }
    const unmatched = [];
    let overrideCount = 0;
    for (const s of picked) {
      const u = s.u;
      const tKey = typeKeyword(u.type);
      const zKey = sizeKeyword(u.size);
      const services = serviceKeywords(s.service);
      for (const svcKey of services) {
        const v = bestMatch(vorur, svcKey, tKey, zKey);
        if (!v) { unmatched.push({ unit: u.serial, service: s.service }); continue; }
        const k = v.id;
        if (!byProduct.has(k)) {
          // Check for company-specific Tilboðsverð override on this product
          const override = findCompanyPriceOverride(companyId, v.nafn);
          if (override) overrideCount++;
          byProduct.set(k, {
            product_id: v.id,
            desc: v.nafn,
            qty: 0,
            unit_price_ex_vat: override ? (+override.price_ex_vat || 0) : (+v.verd_an_vsk || 0),
            vsk_pct: override && override.vsk_pct != null ? +override.vsk_pct : (+v.vsk_prosenta || 24),
            type: 'service',
            isOverride: !!override                  // flag so UI can show 💰 badge
          });
        }
        byProduct.get(k).qty += 1;
      }
    }
    return { linur: Array.from(byProduct.values()), unmatched, overrideCount };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ── Inject "Sækja inn" button into Samningshafar column header ───────────
  function injectButton() {
    const view = document.getElementById('view-workshop');
    if (!view || !view.classList.contains('active')) return;
    // Find the Samningshafar column by its title text
    const titles = view.querySelectorAll('div[style*="text-transform:uppercase"]');
    let header = null;
    titles.forEach(t => {
      if ((t.textContent || '').trim() === 'Samningshafar') header = t;
    });
    if (!header) return;
    const colHd = header.parentElement;
    if (!colHd || colHd.querySelector('._sr-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = '_sr-btn';
    btn.textContent = '📥 Sækja inn úr fyrirtæki';
    btn.style.cssText =
      'margin-top:8px;padding:6px 12px;background:#0d6efd;color:#fff;border:none;' +
      'border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;width:100%';
    // 05.10.2026 (Agnar, skjámynd af R-001080 bæði í Verkröð og „Komið úr þjónustu": „ég vil ekki hafa þetta báðum
    // megin, bara hægra megin og ekki verkbeiðni … bara fram og til baka hægra megin"): takkinn opnar MERKJA-haminn —
    // tækin fá aðeins uttaeki.status='loaned' (eins og „+ Merkja tæki" í 269 og Á verkstæði-takkinn í 224). Engin
    // verkbeiðni og engin drög verða til; útreikningurinn kemur í lokin eins og venjulega (ársskoðunin, 129).
    // Áður: openReceiveModal(event) → venjulegur hamur → submitReceive stofnaði verkbeiðni + drög.
    btn.addEventListener('click', () => openReceiveModal(true));
    colHd.appendChild(btn);
  }

  // Watch the workshop view for the column being rendered (patch 78
  // re-renders on every Workshop.render call).
  function attach() {
    const view = document.getElementById('view-workshop');
    if (!view) { setTimeout(attach, 800); return; }
    new MutationObserver(() => {
      // Only act when active to avoid background CPU
      if (view.classList.contains('active')) injectButton();
    }).observe(view, { childList: true, subtree: true });
    // Also try on view-shown
    document.addEventListener('view-shown', e => {
      if (e && e.detail && e.detail.name === 'workshop') setTimeout(injectButton, 200);
    });
    setTimeout(injectButton, 1500);
  }
  attach();

  // ── Modal state ──────────────────────────────────────────────────────────
  let _companies = [];
  let _selectedCompany = null;
  let _units = [];        // [{u: uttaekiRow, checked: bool, service: 'Hleðsla'}]
  let _searchQuery = '';

  // ── Open ─────────────────────────────────────────────────────────────────
  // 04.10.2026 (Agnar: „velja fyrirtæki og t.d. 10 tæki … virka úr báðum áttum … bara merki fram og til baka, ekki láta
  // búa til reikning … allur útreikningur er síðan í lokin eins og venjulega"): MERKJA-hamur. Sama fyrirtækja- og
  // tækjaval, en engin verkbeiðni, ekkert verð. Tæki sem eru þegar á verkstæði (status='loaned') eru forhökuð; Vista
  // skrifar AÐEINS mismuninn — hakað → á verkstæði (sama og „Á verkstæði"-takkinn á prófílnum, 224, og bílstjórinn,
  // 219), afhakað → til baka ('active'). Tækin birtast í „Komið úr þjónustu" (269) og á prófílnum.
  let _merkja = false;
  async function openReceiveModal(merkja) {
    _merkja = merkja === true;
    _selectedCompany = null;
    _units = [];
    _searchQuery = '';
    await loadCompanies();
    renderModal();
  }

  async function loadCompanies() {
    const SB = getSB();
    if (!SB) { _companies = []; return; }
    // Pull all companies — search lives client-side. Service-contract holders
    // are highlighted but the user can pick any company. fyrirtaeki has the
    // same shape as vidskiptavinir for our purposes here.
    // 2026-06-10: page through fyrirtaeki — there are >1000 rows and Supabase
    // caps a single select at 1000, so without paging the alphabetically-late
    // companies (e.g. "Test fyrirtæki") were silently missing from the picker.
    async function fetchAllCompanies() {
      const out = [];
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        const r = await SB.from('fyrirtaeki')
          .select('id,nafn,kennitala,simi,heimilisfang,deleted_at')
          .order('nafn').range(from, from + PAGE - 1);
        if (r.error || !r.data || !r.data.length) break;
        out.push(...r.data);
        if (r.data.length < PAGE) break;
      }
      return out.filter(c => !c.deleted_at);
    }
    const [coAll, contractRes] = await Promise.all([
      fetchAllCompanies(),
      SB.from('thjonustusamningar').select('company_nafn').eq('status', 'virkur')
    ]);
    const contractSet = new Set(
      (contractRes && contractRes.data ? contractRes.data : [])
        .map(c => (c.company_nafn || '').trim().toLowerCase()).filter(Boolean)
    );
    _companies = coAll.map(c => ({
      ...c,
      isContract: contractSet.has((c.nafn || '').trim().toLowerCase())
    }));
  }

  async function loadUnitsForCompany(companyName) {
    const SB = getSB();
    if (!SB) { _units = []; return; }
    // Active units only — broken/scrapped units shouldn't be re-serviced.
    // Match by client name (uttaeki.client). Status null is treated as active.
    const r = await SB.from('uttaeki')
      .select('id,serial,type,size,client,location,next_insp,last_insp,status')
      .eq('client', companyName)
      .order('next_insp', { ascending: true });
    if (r.error) { _units = []; return; }
    _units = (r.data || [])
      .filter(u => u.status !== 'urelt' && u.status !== 'disposed' && u.status !== 'scrapped' && u.status !== 'geymsla' && u.status !== 'broken')
      .map(u => ({
        u,
        // Merkja-hamur: hakið sýnir NÚVERANDI stöðu (á verkstæði eða ekki); annars: bílstjórinn kom með allt
        checked: _merkja ? u.status === 'loaned' : true,
        var: u.status === 'loaned',
        service: defaultServiceFor(u)
      }));
  }
  function defaultServiceFor(u) {
    // If next_insp is in the past or within 30 days, default to "Hleðsla + Skoðun".
    // Otherwise plain "Hleðsla". User can override per row.
    if (!u.next_insp) return 'Hleðsla + Skoðun';
    const ni = new Date(u.next_insp);
    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today.getTime() + 30 * 86400000);
    return (ni <= in30) ? 'Hleðsla + Skoðun' : 'Hleðsla';
  }

  // ── Render ───────────────────────────────────────────────────────────────
  // 01.10.2026 (B49, Agnar: „uppfæra útlitið í þessu bæta inn fyrirtæki á verkstæði“): glugginn var
  // blár innlínustíll; nú Brunastál C — málmhaus með hnoðum, stálplata, silfurtakkar, rauður aðaltakki,
  // engin emoji. Allt útlit býr í einu stílblaði (#_sr-dlg-css); id-in og data-* eru óbreytt svo smellir og
  // submitReceive halda. Klasarnir bera forskeytið b49- (228 á _sr-box/_sr-in/... og má ekki rekast á).
  var B49_MONO = '"JetBrains Mono",ui-monospace,monospace';
  var B49_SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var B49_DISPLAY = '"Playfair Display",Georgia,serif';
  var B49_METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var B49_METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var B49_SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var B49_PLATE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var B49_RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var B49_RAUTT = 'linear-gradient(180deg,#c22f26 0%,#951818 50%,#650c0d 100%)';
  var B49_IC = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    leit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    or: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    til: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    inn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>'
  };
  function b49Css() {
    if (document.getElementById('_sr-dlg-css')) return;
    var D = '#_sr-dialog';
    var BTN = 'height:36px!important;padding:0 16px!important;border-radius:7px!important;font-family:' + B49_SANS + '!important;font-size:13px!important;font-weight:600!important;display:inline-flex!important;align-items:center!important;gap:7px!important;cursor:pointer;line-height:1!important;transition:box-shadow .15s,filter .15s,transform .05s';
    var SILFUR = 'background:' + B49_SILVER + '!important;border:1px solid rgba(20,24,34,.28)!important;color:#1c2028!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.12)!important;text-shadow:none!important';
    var css = [
      D + '{position:fixed;inset:0;z-index:100020;background:rgba(6,8,12,.62);display:flex;align-items:center;justify-content:center;padding:16px;font-family:' + B49_SANS + '}',
      D + ' .b49-kassi{background:' + B49_PLATE + ';border:1px solid #0b0c0f;border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.7);width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden}',
      D + ' .b49-haus{position:relative;padding:14px 18px 14px 34px;background:' + B49_METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);display:flex;justify-content:space-between;align-items:center;gap:14px}',
      D + ' .b49-haus::before,' + D + ' .b49-haus::after{content:"";position:absolute;left:13px;width:8px;height:8px;border-radius:50%;background:' + B49_RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.6)}',
      D + ' .b49-haus::before{top:12px}',
      D + ' .b49-haus::after{bottom:12px}',
      D + ' .b49-merki{font-family:' + B49_MONO + ';font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aab1bb;display:flex;align-items:center;gap:7px}',
      D + ' .b49-merki svg{width:13px;height:13px;color:#e0605a}',
      D + ' .b49-haus h3{margin:3px 0 0;font-family:' + B49_DISPLAY + ';font-size:22px;font-weight:800;color:#fff;letter-spacing:.005em;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.35)}',
      D + ' .b49-undir{font-family:' + B49_SANS + ';font-size:12px;color:#c9ced6;margin-top:2px}',
      D + ' button#_sr-x{flex:none;width:36px!important;height:36px!important;padding:0!important;border-radius:7px!important;background:' + B49_METAL_BTN + '!important;border:1px solid #000!important;color:#e3e7ee!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.5)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer}',
      D + ' button#_sr-x:hover{color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(224,96,90,.55)!important}',
      D + ' button#_sr-x svg{width:15px;height:15px}',
      D + ' #_sr-body{flex:1;overflow:auto;padding:18px 22px}',
      D + ' .b49-fotur{padding:12px 22px;border-top:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#e6e9ee,#d6dbe3);box-shadow:inset 0 1px 0 rgba(255,255,255,.7);display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}',
      D + ' #_sr-summary{font-family:' + B49_MONO + ';font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3a4250}',
      D + ' .b49-takkar{display:flex;gap:8px;margin-left:auto}',
      D + ' button#_sr-cancel,' + D + ' button#_sr-back{' + BTN + ';' + SILFUR + '}',
      D + ' button#_sr-cancel:hover,' + D + ' button#_sr-back:hover{box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(179,38,30,.35),0 2px 6px rgba(0,0,0,.14)!important}',
      D + ' button#_sr-back{height:30px!important;padding:0 12px 0 8px!important;font-size:12px!important;gap:4px!important}',
      D + ' button#_sr-back svg{width:15px;height:15px;color:#525b6b}',
      D + ' button#_sr-create{' + BTN + ';padding:0 20px!important;background:' + B49_RAUTT + '!important;border:1px solid #2a0303!important;color:#fff!important;font-weight:700!important;text-shadow:0 1px 1px rgba(0,0,0,.55)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(0,0,0,.35),0 2px 4px rgba(0,0,0,.28)!important}',
      D + ' button#_sr-create:hover:not(:disabled){filter:brightness(1.1)}',
      D + ' button#_sr-create:disabled{filter:grayscale(.75);opacity:.45;cursor:not-allowed}',
      D + ' button:active:not(:disabled){transform:translateY(1px)}',
      // Leitin + fyrirtækjalistinn
      D + ' .b49-leit{position:relative;margin-bottom:12px}',
      D + ' .b49-leit svg{position:absolute;left:12px;top:50%;width:16px;height:16px;transform:translateY(-50%);color:#6b7381;pointer-events:none}',
      D + ' input#_sr-search{width:100%;height:42px;padding:0 14px 0 38px;border:1px solid rgba(20,24,34,.28);border-radius:7px;background:linear-gradient(180deg,#fff,#f4f6f9);box-shadow:inset 0 1px 2px rgba(0,0,0,.08);font-family:' + B49_SANS + ';font-size:14px;color:#11141c;box-sizing:border-box;outline:none}',
      D + ' input#_sr-search:focus{border-color:#b3261e;box-shadow:inset 0 1px 2px rgba(0,0,0,.08),0 0 0 3px rgba(179,38,30,.16)}',
      D + ' #_sr-co-list,' + D + ' .b49-taeki{border:1px solid rgba(20,24,34,.22);border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)}',
      D + ' ._sr-co-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(20,24,34,.08);cursor:pointer;transition:background .12s,box-shadow .12s}',
      D + ' ._sr-co-row:last-child,' + D + ' .b49-rod:last-child{border-bottom:none}',
      D + ' ._sr-co-row:hover{background:#eef1f5;box-shadow:inset 3px 0 0 #b3261e}',
      D + ' .b49-nafn{font-family:' + B49_SANS + ';font-size:13.5px;font-weight:600;color:#11141c}',
      D + ' .b49-sh{display:inline-block;vertical-align:1px;margin-left:7px;padding:2px 7px;border-radius:3px;background:' + B49_SILVER + ';border:1px solid rgba(179,38,30,.45);color:#8a1414!important;font-family:' + B49_MONO + ';font-size:9px!important;font-weight:700;letter-spacing:.12em;text-transform:uppercase;line-height:1.4}',
      D + ' .b49-und{font-family:' + B49_MONO + ';font-size:11px;color:#5a6372;margin-top:3px}',
      D + ' .b49-or{flex:none;display:inline-flex;width:16px;height:16px;color:#8a93a1;font-style:normal}', D + ' .b49-or svg{width:16px;height:16px}',
      D + ' ._sr-co-row:hover .b49-or{color:#b3261e}',
      D + ' .b49-tomt{padding:26px 18px;text-align:center;color:#5a6372;font-size:13px}',
      D + ' .b49-tomt small{display:block;margin-top:6px;font-size:11.5px;color:#6b7381}',
      D + ' .b49-tomt.b49-strik{border:1px dashed rgba(20,24,34,.32);border-radius:8px;background:rgba(255,255,255,.55)}',
      // Tækjavalið
      D + ' .b49-co{margin:10px 0 14px;padding:12px 16px;background:' + B49_METAL + ';border:1px solid #000;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 2px 6px rgba(0,0,0,.2)}',
      D + ' .b49-co-nafn{font-family:' + B49_DISPLAY + ';font-size:19px;font-weight:800;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      D + ' .b49-co-und{font-family:' + B49_MONO + ';font-size:11px;color:#aab1bb;margin-top:3px}',
      D + ' .b49-stika{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(180deg,#eef1f5,#e1e5ec);border-bottom:1px solid rgba(20,24,34,.15)}',
      D + ' .b49-stika label{display:flex;align-items:center;gap:7px;cursor:pointer;font-family:' + B49_MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      D + ' .b49-stika small{font-family:' + B49_MONO + ';font-size:10.5px;color:#5a6372}',
      D + ' input[type=checkbox]{width:16px;height:16px;margin:0;cursor:pointer;accent-color:#b3261e}',
      D + ' .b49-rod{display:grid;grid-template-columns:24px 1fr 172px;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(20,24,34,.07);transition:background .12s}',
      D + ' .b49-rod:hover{background:#f5f6f8}',
      D + ' .b49-tl{font-family:' + B49_SANS + ';font-size:13px;font-weight:600;color:#11141c;min-width:0}',
      D + ' .b49-sn{font-family:' + B49_MONO + ';font-size:12.5px;font-weight:700;color:#11141c}',
      // 05.10.2026 (Agnar: „gera textann hvítan í Útrunnið, sést ekki“): almenna reglan `small{color:#3a4250!important}`
      // (bstal-polish) vann hvíta litinn — hann þarf !important. Sama á við Á verkstæði-merkið (.b49-averk) neðar.
      D + ' .b49-utr{display:inline-block;vertical-align:1px;margin-left:7px;padding:2px 6px;border-radius:3px;background:' + B49_RAUTT + ';color:#fff!important;font-family:' + B49_MONO + ';font-size:9px!important;font-weight:700;letter-spacing:.1em;text-transform:uppercase;line-height:1.4;text-shadow:0 1px 0 rgba(0,0,0,.4)}',
      D + ' .b49-stadur{font-size:11.5px;color:#5a6372;margin-top:2px}',
      D + ' .b49-stadur b{font-family:' + B49_MONO + ';font-weight:600;color:#3a4250}',
      D + ' select._sr-unit-svc{height:30px;padding:0 8px;border:1px solid rgba(20,24,34,.28);border-radius:6px;background:' + B49_SILVER + ';box-shadow:inset 0 1px 0 #fff;font-family:' + B49_SANS + ';font-size:12px;color:#1c2028;cursor:pointer;width:100%}',
      D + ' select._sr-unit-svc:focus{outline:none;border-color:#b3261e;box-shadow:0 0 0 3px rgba(179,38,30,.16)}',
      '@media (max-width:600px){' + D + ' .b49-rod{grid-template-columns:24px 1fr}' + D + ' select._sr-unit-svc{grid-column:2}' + D + ' #_sr-body{padding:14px}' + D + ' .b49-fotur{padding:10px 14px}' + D + ' .b49-haus h3{font-size:19px}}'
    ].join('\n');
    css += '\n' + [
      '#_sr-dialog._sr-merkja select._sr-unit-svc{display:none!important}',
      '#_sr-dialog button#_sr-prenta{height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(20,24,34,.22);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 13px ' + B49_SANS + ';cursor:pointer;white-space:nowrap}',
      '#_sr-dialog button#_sr-prenta:disabled{opacity:.4;cursor:not-allowed}',
      '#_sr-dialog._sr-merkja .b49-rod{grid-template-columns:24px 1fr!important}',
      '#_sr-dialog .b49-averk{display:inline-block;vertical-align:1px;margin-left:7px;padding:2px 7px;border-radius:3px;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#f6e7b8!important;font-family:' + B49_MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = '_sr-dlg-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function renderModal() {
    b49Css();
    let dlg = document.getElementById('_sr-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_sr-dialog';
    dlg.innerHTML =
      '<div class="b49-kassi" role="dialog" aria-modal="true" aria-labelledby="_sr-titill">' +
        '<div class="b49-haus">' +
          '<div>' +
            '<div class="b49-merki">' + B49_IC.inn + 'Verkstæði · móttaka</div>' +
            '<h3 id="_sr-titill">' + (_merkja ? 'Merkja tæki á verkstæði' : 'Sækja inn úr fyrirtæki') + '</h3>' +
            '<div class="b49-undir">' + (_merkja ? 'Bara merki — hakað = á verkstæði, afhakað = farið aftur. Enginn reikningur.' : 'Veldu fyrirtæki og hvaða tæki komu inn') + '</div>' +
          '</div>' +
          '<button id="_sr-x" type="button" aria-label="Loka">' + B49_IC.x + '</button>' +
        '</div>' +
        '<div id="_sr-body"></div>' +
        '<div class="b49-fotur">' +
          '<div id="_sr-summary"></div>' +
          '<div class="b49-takkar">' +
            '<button id="_sr-cancel" type="button">Hætta við</button>' +
            // 04.10.2026 (Agnar: „velja þau 10 og prenta strikamerkin fyrir þau öll í einu — fyrirtækjanafn, tækjanúmer og
            // QR — sami prentari og kerfi og í Sölu"): Print.showJob (139 → QrLabelCustomer 08, Brother PT-P750W).
            (_merkja ? '<button id="_sr-prenta" type="button" disabled>Prenta miða</button>' : '') +
            '<button id="_sr-create" type="button" disabled>' + (_merkja ? 'Vista merkingar' : 'Stofna verk') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (_merkja) dlg.classList.add('_sr-merkja');
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_sr-x').addEventListener('click', close);
    dlg.querySelector('#_sr-cancel').addEventListener('click', close);
    dlg.querySelector('#_sr-create').addEventListener('click', () => (_merkja ? submitMerkja() : submitReceive()));
    const prentaBtn = dlg.querySelector('#_sr-prenta');
    if (prentaBtn) prentaBtn.addEventListener('click', () => {
      const picked = _units.filter(s => s.checked);
      if (!picked.length || !_selectedCompany) return;
      if (!(window.Print && typeof Print.showJob === 'function')) { alert('Miðaprentunin er ekki hlaðin.'); return; }
      Print.showJob({
        customer: _selectedCompany.nafn || '',
        phone: _selectedCompany.simi || '',
        units: picked.map(s => ({ serial: s.u.serial || '', type: s.u.type || '', size: s.u.size || '' }))
      });
    });

    renderBody();
  }

  function renderBody() {
    const body = document.getElementById('_sr-body');
    if (!body) return;
    if (!_selectedCompany) {
      body.innerHTML = renderCompanyPicker();
      // Wire search + row clicks
      const search = body.querySelector('#_sr-search');
      if (search) {
        search.addEventListener('input', e => {
          _searchQuery = e.target.value;
          // Re-render just the list portion
          const list = body.querySelector('#_sr-co-list');
          if (list) list.innerHTML = renderCompanyList();
          wireCompanyRows(body);
        });
        setTimeout(() => search.focus(), 50);
      }
      wireCompanyRows(body);
    } else {
      body.innerHTML = renderUnitPicker();
      wireUnitRows(body);
    }
    updateSummary();
  }

  function renderCompanyPicker() {
    return '' +
      '<div class="b49-leit">' + B49_IC.leit +
        '<input id="_sr-search" type="search" placeholder="Leita að fyrirtæki eða kennitölu…" autocomplete="off" value="' + esc(_searchQuery || '') + '">' +
      '</div>' +
      '<div id="_sr-co-list">' +
        renderCompanyList() +
      '</div>';
  }

  function renderCompanyList() {
    const q = (_searchQuery || '').trim().toLowerCase();
    let list = _companies;
    if (q) {
      list = list.filter(c =>
        ((c.nafn || '').toLowerCase().includes(q)) ||
        ((c.kennitala || '').toLowerCase().includes(q))
      );
    }
    // Contract holders bubble to top
    list = list.slice().sort((a, b) => {
      if (a.isContract !== b.isContract) return a.isContract ? -1 : 1;
      return (a.nafn || '').localeCompare(b.nafn || '', 'is');
    });
    if (!list.length) {
      return '<div class="b49-tomt">Ekkert fyrirtæki fannst</div>';
    }
    return list.slice(0, 200).map(c =>
      '<div class="_sr-co-row" data-co-id="' + esc(c.id) + '" data-co-nafn="' + esc(c.nafn || '') + '">' +
        '<div style="min-width:0">' +
          '<div class="b49-nafn">' + esc(c.nafn || '') +
            (c.isContract ? '<small class="b49-sh">Samningshafi</small>' : '') +
          '</div>' +
          '<div class="b49-und">' +
            (c.kennitala ? esc(c.kennitala) : '') +
            (c.heimilisfang ? (c.kennitala ? ' · ' : '') + esc(c.heimilisfang) : '') +
          '</div>' +
        '</div>' +
        '<i class="b49-or">' + B49_IC.or + '</i>' +
      '</div>'
    ).join('');
  }

  function wireCompanyRows(body) {
    body.querySelectorAll('._sr-co-row').forEach(row => {
      row.addEventListener('click', async () => {
        const id = +row.dataset.coId;
        const nafn = row.dataset.coNafn;
        _selectedCompany = _companies.find(c => c.id === id) || { id, nafn };
        // Loading state
        const inner = document.getElementById('_sr-body');
        if (inner) inner.innerHTML = '<div class="b49-tomt">Hleður tækjum frá ' + esc(nafn) + '…</div>';
        await loadUnitsForCompany(nafn);
        renderBody();
      });
    });
  }

  function renderUnitPicker() {
    const c = _selectedCompany;
    const und = [c.kennitala ? 'kt. ' + esc(c.kennitala) : '', c.simi ? esc(c.simi) : '', c.heimilisfang ? esc(c.heimilisfang) : '']
      .filter(Boolean).join(' · ');
    const head = '' +
      '<button id="_sr-back" type="button">' + B49_IC.til + 'Velja annað fyrirtæki</button>' +
      '<div class="b49-co">' +
        '<div class="b49-co-nafn">' + esc(c.nafn || '') + '</div>' +
        (und ? '<div class="b49-co-und">' + und + '</div>' : '') +
      '</div>';

    if (!_units.length) {
      return head +
        '<div class="b49-tomt b49-strik">' +
          'Engin virk tæki skráð á þetta fyrirtæki í field-service skránni.' +
          '<small>Þú getur samt stofnað verkbeiðni handvirkt í gegnum venjulega Counter flæðið.</small>' +
        '</div>';
    }

    const rows = _units.map((s, i) => {
      const u = s.u;
      const ni = u.next_insp || '';
      const isOverdue = ni && new Date(ni) < new Date();
      const overdueChip = isOverdue ? '<small class="b49-utr">Útrunnið</small>' : '';
      return '<div class="b49-rod">' +
        '<input type="checkbox" class="_sr-unit-chk" data-i="' + i + '" ' + (s.checked ? 'checked' : '') + '>' +
        '<div class="b49-tl">' +
          '<div>' +
            '<strong class="b49-sn">' + esc(u.serial || '—') + '</strong>' +
            ' · ' + esc(u.type || '—') + (u.size ? ' ' + esc(u.size) : '') +
            overdueChip +
            (_merkja && s.var ? '<small class="b49-averk">Á verkstæði</small>' : '') +
          '</div>' +
          '<div class="b49-stadur">' +
            (u.location ? esc(u.location) + ' · ' : '') +
            'Næsta skoðun: <b>' + (ni ? esc(ni) : '—') + '</b>' +
          '</div>' +
        '</div>' +
        '<select class="_sr-unit-svc" data-i="' + i + '">' +
          SERVICE_TYPES.map(svc => '<option' + (s.service === svc ? ' selected' : '') + '>' + esc(svc) + '</option>').join('') +
        '</select>' +
      '</div>';
    }).join('');

    const allChecked = _units.every(s => s.checked);
    const toolbar =
      '<div class="b49-stika">' +
        '<label><input type="checkbox" id="_sr-toggle-all"' + (allChecked ? ' checked' : '') + '> Velja öll</label>' +
        '<small>' + _units.length + ' tæki frá field-service</small>' +
      '</div>';

    return head + '<div class="b49-taeki">' + toolbar + rows + '</div>';
  }

  function wireUnitRows(body) {
    const back = body.querySelector('#_sr-back');
    if (back) back.addEventListener('click', () => {
      _selectedCompany = null;
      _units = [];
      renderBody();
    });
    body.querySelectorAll('._sr-unit-chk').forEach(cb => {
      cb.addEventListener('change', e => {
        const i = +cb.dataset.i;
        if (_units[i]) _units[i].checked = cb.checked;
        updateSummary();
        // Update "select all" toggle state
        const all = body.querySelector('#_sr-toggle-all');
        if (all) all.checked = _units.every(s => s.checked);
      });
    });
    body.querySelectorAll('._sr-unit-svc').forEach(sel => {
      sel.addEventListener('change', () => {
        const i = +sel.dataset.i;
        if (_units[i]) _units[i].service = sel.value;
      });
    });
    const toggleAll = body.querySelector('#_sr-toggle-all');
    if (toggleAll) toggleAll.addEventListener('change', () => {
      const c = toggleAll.checked;
      _units.forEach(s => { s.checked = c; });
      body.querySelectorAll('._sr-unit-chk').forEach(cb => { cb.checked = c; });
      updateSummary();
    });
  }

  function updateSummary() {
    const sum = document.getElementById('_sr-summary');
    const create = document.getElementById('_sr-create');
    if (!sum || !create) return;
    if (!_selectedCompany) {
      sum.textContent = '';
      create.disabled = true;
      return;
    }
    const picked = _units.filter(s => s.checked);
    if (_merkja) {
      const pr = document.getElementById('_sr-prenta');
      if (pr) { pr.disabled = !picked.length; pr.textContent = picked.length ? 'Prenta miða (' + picked.length + ')' : 'Prenta miða'; }
      const til = _units.filter(s => s.checked && !s.var).length, af = _units.filter(s => !s.checked && s.var).length;
      sum.textContent = picked.length + ' af ' + _units.length + ' á verkstæði' + (til || af ? ' · ' + (til ? '+' + til : '') + (til && af ? ' / ' : '') + (af ? '−' + af : '') : '');
      create.disabled = !(til || af);
      return;
    }
    sum.textContent = picked.length + ' af ' + _units.length + ' tækjum valin';
    create.disabled = picked.length === 0;
  }

  // Merkja-hamur: aðeins mismunurinn skrifast; engin verkbeiðni, engin verð.
  async function submitMerkja() {
    const SB = getSB();
    if (!SB || !_selectedCompany) return;
    const til = _units.filter(s => s.checked && !s.var).map(s => s.u.id);
    const af = _units.filter(s => !s.checked && s.var).map(s => s.u.id);
    if (!til.length && !af.length) return;
    const create = document.getElementById('_sr-create');
    if (create) { create.disabled = true; create.textContent = 'Vista…'; }
    let villa = null;
    try {
      if (til.length) { const r = await SB.from('uttaeki').update({ status: 'loaned', custody_status: null }).in('id', til); if (r.error) villa = r.error; }
      if (!villa && af.length) { const r = await SB.from('uttaeki').update({ status: 'active', custody_status: null }).in('id', af); if (r.error) villa = r.error; }
    } catch (e) { villa = e; }
    if (villa) {
      if (create) { create.disabled = false; create.textContent = 'Vista merkingar'; }
      try { if (window.Toast && Toast.show) Toast.show('Vistaðist ekki — reyndu aftur'); } catch (_) {}
      return;
    }
    // staðbundið skyndiminni (prófíllinn les DB.cache.units)
    try {
      ((window.DB && DB.cache && DB.cache.units) || []).forEach(u => {
        if (til.indexOf(u.id) >= 0) { u.status = 'loaned'; u.custody_status = null; }
        if (af.indexOf(u.id) >= 0) { u.status = 'active'; u.custody_status = null; }
      });
    } catch (_) {}
    const dlg = document.getElementById('_sr-dialog'); if (dlg) dlg.remove();
    try { if (window.VkLoaned && typeof VkLoaned.inject === 'function') VkLoaned.inject(); } catch (_) {}
    try { if (window.Toast && Toast.show) Toast.show((til.length ? til.length + ' sett á verkstæði' : '') + (til.length && af.length ? ' · ' : '') + (af.length ? af.length + ' farin aftur' : '')); } catch (_) {}
  }

  // ── Submit: create verkbeiðni + verklidur ────────────────────────────────
  async function submitReceive() {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    if (!_selectedCompany) return;
    const picked = _units.filter(s => s.checked);
    if (!picked.length) return;

    const create = document.getElementById('_sr-create');
    if (create) { create.disabled = true; create.textContent = 'Vista…'; }

    try {
      const today = todayISO();
      const pickupOffset = (() => {
        try {
          const v = window.AppSettings && window.AppSettings.path('almennt.default_pickup_offset_days');
          return Number.isFinite(+v) && +v > 0 ? +v : 7;
        } catch (_) { return 7; }
      })();
      const pickupDate = new Date(); pickupDate.setDate(pickupDate.getDate() + pickupOffset);
      const pickupISO = pickupDate.toISOString().slice(0, 10);

      // Compute draft pricing from `vorur` lookup so pickup-checkout shows
      // real numbers. Company Tilboðsverð (patch 113) applied automatically.
      const { linur, unmatched, overrideCount } = await buildLinurFromPicked(picked, _selectedCompany.id);
      const draftEx = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
      const draftVsk = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 0) / 100), 0);
      const draftTotal = Math.round(draftEx + draftVsk);

      // Verk 5 (2026-08-14): „greitt síðar" krefst GILDS símanúmers — annars
      // er enginn til að hringja í við afhendingu. Plássfyllingar („0000",
      // „000", „0000000", endurteknir stafir) hafnað; 7 stafir skilyrði.
      const _validPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 7 && !/^(\d)\1{6}$/.test(d); };
      let _phoneToUse = _selectedCompany.simi || '';
      if (!_validPhone(_phoneToUse)) {
        const _inp = prompt('Gilt símanúmer vantar (7 stafir) — hver sækir/borgar?\n\nSímanúmer:', '');
        if (!_validPhone(_inp)) {
          if (window.Toast && Toast.show) Toast.show('❌ Gilt símanúmer vantar — móttaka ekki kláruð');
          return;
        }
        _phoneToUse = String(_inp).replace(/\D/g, '');
      }

      // 05.10.2026 (Agnar: „ekkert að vera gera drög af því sem tengist sækja inn úr fyrirtækjum"): Sækja inn býr
      // EKKI lengur til sölu-drög. Drögin lágu í Drög-listanum þar til afhent var, og þegar verkinu var eytt stóð
      // salan eftir (R-001077, Álfaborg, 05.10). Verkbeiðnin fær R-númer úr SÖMU röð og sölurnar
      // (next_reikningur_num → reikningur_seq) og salan verður til VIÐ AFHENDINGU í 121 með því númeri; línurnar
      // reiknast þá úr afhentu tækjunum með samningsverði fyrirtækisins (window.SamningshafarVerd hér að neðan).
      // draftTotal er aðeins áætlun á verkbeiðninni (verd).
      const numSvar = await SB.rpc('next_reikningur_num');
      const num = numSvar && !numSvar.error && numSvar.data ? String(numSvar.data) : '';
      if (!/^R-\d+$/.test(num)) {
        console.error('[samningshafar-receive] next_reikningur_num', numSvar && numSvar.error);
        const villa = '❌ Verkið fékk ekki R-númer — ekkert stofnað' + (numSvar && numSvar.error ? ': ' + numSvar.error.message : '');
        if (window.Toast && Toast.show) Toast.show(villa); else alert(villa);
        if (create) { create.disabled = false; create.textContent = 'Stofna verk'; }
        return;
      }

      // Verkbeiðnin ber R-númerið; salan fær sama númer við afhendingu (121 parentSaleNum).
      const jobIns = await SB.from('verkbeidnir').insert({
        num,
        status: 'received',
        customer: _selectedCompany.nafn || '',
        phone: _phoneToUse,
        dropoff: today,
        pickup: pickupISO,
        notes: 'Sótt úr field-service — ' + picked.length + ' tæki',
        verd: draftTotal
      }).select().single();
      if (jobIns.error) throw jobIns.error;
      const jobId = jobIns.data.id;

      // Insert verklidur for each picked unit. Try with uttaeki_id first;
      // if column doesn't exist, retry without.
      const linesWithLink = picked.map(s => ({
        job_id: jobId,
        serial: s.u.serial || '',
        type: s.u.type || '',
        size: s.u.size || '',
        service: s.service,
        status: 'received',
        uttaeki_id: s.u.id
      }));
      let liRes = await SB.from('verklidur').insert(linesWithLink);
      if (liRes.error && /uttaeki_id/i.test(liRes.error.message || '')) {
        const linesNoLink = linesWithLink.map(({ uttaeki_id, ...rest }) => rest);
        liRes = await SB.from('verklidur').insert(linesNoLink);
        if (!liRes.error && window.Toast && Toast.show) {
          Toast.show('Verkbeiðni stofnuð, en uttaeki-tenging vantar — keyrðu sql/verklidur_uttaeki_link.sql');
        }
      }
      if (liRes.error) throw liRes.error;

      // 3b. Wire the picked units into the á-verkstæði lífsferill + flag the
      //     company workflow (2026-07-25). Each picked tæki → uttaeki.status
      //     'loaned' (custody null = „Nýkomið") so it appears in the right-half
      //     verkstæði lifecycle (patch 269), Bílstjóri (219) + Aksturslisti
      //     (268) — this is the „nuverandi tenging" where status='á verkstæði'
      //     auto-opens in the workshop. And the COMPANY is flagged „Í vinnslu"
      //     + steps „Farið á verkstað"/„Á verkstæði" so it shows the ✓ on the
      //     main board (153) and pops into Þjónustuverkstæði (190). Best-effort:
      //     a failure here never rolls back the verkbeiðni that already saved.
      // 17.09.2026: „best-effort" stendur — hér er EKKI bakkað út úr verkbeiðninni
      // sem er þegar vistuð. En það var líka ÞÖGULT: .update() kastar ekki, svo
      // catch-ið keyrði aldrei, og varaleiðin (án custody_status) var að auki
      // óskoðuð. Mistókst þetta stóðu tækin ekki sem 'loaned' og birtust hvergi
      // í verkstæðis-lífsferlinum, Bílstjóra né Aksturslista — á meðan sagði
      // toastið „✓ Stofnað … með N tækjum". Nú er það sagt í lokaskilaboðunum.
      let taekiVilla = '';
      try {
        const ids = picked.map(s => s.u && s.u.id).filter(Boolean);
        if (ids.length) {
          let up = await SB.from('uttaeki').update({ status: 'loaned', custody_status: null }).in('id', ids);
          if (up.error && /custody_status/i.test(up.error.message || '')) {
            up = await SB.from('uttaeki').update({ status: 'loaned' }).in('id', ids);
          }
          if (up && up.error) throw up.error;
        }
      } catch (e) {
        console.warn('[samningshafar-receive] uttaeki loaned', e);
        taekiVilla = String((e && e.message) || e);
        try { if (window.logProblem) window.logProblem('samningshafar_loaned_failed', num + ': ' + taekiVilla.slice(0, 160)); } catch (_) {}
      }
      // Þögnin hér er rétt (17.09.2026): AppSettings.save ER saveVordud (patch 85)
      // — misheppnað skrif fer í biðröð, er reynt aftur á 20 sek fresti og
      // notandinn fær aðvörun þaðan. Tvítekin skilaboð hér bættu engu við.
      try {
        if (window.AppSettings && AppSettings.save && _selectedCompany.id) {
          const curYear = new Date().getFullYear();
          await AppSettings.save({ arsskodun_customers: { [String(_selectedCompany.id)]: {
            field_inspected_year: curYear,
            ['steps_' + curYear]: { farid: true, averkstaedi: true }
          } } });
        }
      } catch (_) {}

      // 4. Refresh local cache + workshop view
      if (window.DB && typeof DB.loadAll === 'function') {
        await DB.loadAll();
      }
      if (window.Workshop && typeof Workshop.render === 'function') {
        try { Workshop.render(); } catch (_) {}
      }
      // Nudge the á-verkstæði lífsferill (patch 269) to re-read the new loaned
      // tæki right away instead of waiting for its 3s poll.
      if (window.VkLoaned && typeof VkLoaned.inject === 'function') {
        try { VkLoaned.inject(); } catch (_) {}
      }

      // 5. Close + toast
      const dlg = document.getElementById('_sr-dialog');
      if (dlg) dlg.remove();
      if (window.Toast && Toast.show) {
        const msg = '✓ Stofnað ' + num + ' með ' + picked.length + ' tækjum' +
          (draftTotal ? ' · ' + Math.round(draftTotal).toLocaleString('is-IS') + ' kr' : '') +
          (overrideCount ? ' · 💰 ' + overrideCount + ' Tilboðsverð notuð' : '') +
          (unmatched.length ? ' (verð vantar fyrir ' + unmatched.length + ' tæki)' : '');
        Toast.show(msg);
      }
      // Verkbeiðnin stendur — en tækin komust ekki í verkstæðis-flæðið. Sér
      // skilaboð svo þetta hverfi ekki undir ✓-toastinu hér að ofan.
      if (taekiVilla) {
        alert('Verkið ' + num + ' var stofnað, EN tækin ' + picked.length + ' merktust ekki „á verkstæði".\n'
            + 'Þau birtast því ekki í verkstæðis-lífsferlinum, hjá Bílstjóra né á Aksturslista.\n'
            + 'Merktu þau handvirkt á Verkstæði.\n\n' + taekiVilla);
      }
    } catch (e) {
      alert('Villa: ' + (e.message || e));
      if (create) { create.disabled = false; create.textContent = 'Stofna verk'; }
    }
  }

  // Public API
  window.SamningshafarReceive = { open: openReceiveModal };
  // 05.10.2026: 121 (Sókn) reiknar línur sölunnar við afhendingu með SÖMU verðreglu og stóð áður á drögunum
  // (vörulisti + Tilboðsverð fyrirtækisins). picked = [{ u: { serial, type, size }, service }].
  window.SamningshafarVerd = { linur: buildLinurFromPicked };

  console.log('[samningshafar-receive] installed');
})();
/* === END SAMNINGSHAFAR RECEIVE === */
