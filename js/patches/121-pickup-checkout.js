/* === PICKUP CHECKOUT FLOW v1 ===
 *
 * NÝ HUGMYND (2026-05-08): Sala er ekki kláruð fyrr en viðskiptavinurinn
 * SÆKIR — þá fyrst ákveðum við hvað var raunverulega afhent og rukkum
 * fyrir það. Bókhaldslega 1 hreinn reikningur — engar kreditfærslur.
 *
 * Þessi patch grípur „Sótt ✓" smell í Verkstæði/Afgreiðsla og opnar
 * í staðinn nýjan „Sókn (greiðsla)" glugga sem:
 *   1. Sýnir lista af tækjum frá verkbeiðninni (verklidur)
 *   2. Lítill ✓ haki á hverri línu — sjálfgefið TICKED. Notandi tekur af
 *      þeim sem viðskiptavinur tekur EKKI með (ónýt sem eru eftir)
 *   3. Leyfir að bæta við „nýtt slökkvitæki" í söluna sem viðskiptavinur
 *      kaupir í staðinn fyrir ónýtt
 *   4. Sýnir núverandi sölu-línur úr `solur.linur` og uppfærða upphæð
 *   5. Notandi velur greiðsluaðferð (Reiðufé / Kort / Reikningur)
 *   6. Á smell „✓ Klára sölu":
 *      • solur.linur uppfært (ónýt línur fjarlægðar / minnkaðar, nýjar
 *        bættar við)
 *      • solur.samtals / upphaed / vsk endurreiknað
 *      • solur.greitt_med + paid_at settu
 *      • verkbeidnir.status = 'collected', verklidur uppfærð til 'done'
 *      • Kvittun prentuð
 *
 * Þetta þarf að gerast EFTIR að patch 119 (↩ Verkstæði) hefur grafið
 * verkbeiðnirnar inn í Móttekin-dálkinn í 2-skiptingu, svo að Sótt ✓
 * fer ennþá í gegnum þennan kód.
 */
(() => {
  if (window.__pickupCheckoutInstalled) return;
  window.__pickupCheckoutInstalled = true;

  const SAFE_GUARD_KEY = '_pickupBypass';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ── Find the parent solur row from a verkbeiðni number ────────────────
  // Verkbeiðni nums are like 'R-000044-V1'. The sale num is 'R-000044'.
  function parentSaleNum(verkNum) {
    return String(verkNum || '').replace(/-V\d+$/, '');
  }

  async function fetchSaleByNum(num) {
    const SB = getSB();
    if (!SB || !num) return null;
    const r = await SB.from('solur').select('*').eq('num', num).maybeSingle();
    return r.error ? null : (r.data || null);
  }

  // Get all units for a verkbeiðni group sharing the same sale num.
  // I.e. all jobs whose num starts with parent num + -V
  function jobsForSaleNum(saleNum) {
    if (!window.DB || !DB.cache || !Array.isArray(DB.cache.jobs)) return [];
    const re = new RegExp('^' + saleNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(-V\\d+)?$');
    return DB.cache.jobs.filter(j => re.test(j.num || ''));
  }

  // ── Modal ──────────────────────────────────────────────────────────────
  let _pkcOpening = false; // re-entrancy guard (covers the async fetch gap)
  function openPickupModal(jobId) {
    // 2026-07-14: guard against „afgreiðslan poppar upp aftur" — a double-tap on
    // „Sótt ✓" (or a stray click on a re-rendered card) used to open the pickup
    // window twice because openPickupModal is async. Block re-entry while one is
    // opening OR already on screen.
    if (_pkcOpening || document.getElementById('_pkc-dialog')) return;
    _pkcOpening = true;
    const job = (window.DB && DB.getJob) ? DB.getJob(jobId) : null;
    if (!job) { _pkcOpening = false; alert('Verk fannst ekki'); return; }
    const saleNum = parentSaleNum(job.num);
    const allJobs = jobsForSaleNum(saleNum);
    // Collect all units across all jobs of this sale
    const allUnits = [];
    // 03.11.2026: eydd tæki (status 'eytt', 78 deleteUnit) eru ekki afhent — áður birtust þau sem
    // „Tilbúið til afhendingar" (R-001248: 7 tæki í stað 6), deildu einingaverðinu, og hak tekið af
    // þeim dró sölulínu út. Varahlutir á þeim rukkuðust líka.
    allJobs.forEach(j => {
      (j.units || []).forEach(u => { if (u && u.status !== 'eytt') allUnits.push({ jobId: j.id, jobNum: j.num, unit: u }); });
    });

    // 2026-06-20: Pre-load spare parts the Verkstæði added to each tæki
    // (verklidur.parts) as billable extras, so they land on the reikningur at
    // Sókn. Reset first so re-opening the modal never double-adds. The operator
    // still confirms/edits them before the draft flips to final ("sótt").
    pickupExtras.length = 0;
    allUnits.forEach(({ unit }) => {
      const parts = Array.isArray(unit.parts) ? unit.parts : [];
      parts.forEach(p => {
        pickupExtras.push({
          name: p.nafn,
          qty: +p.qty || 1,
          unit_price_ex_vat: +p.verd_an_vsk || 0,
          vsk_pct: +p.vsk_prosenta || 24,
          _fromWorkshop: true,
          _unitId: unit.id,
          _thj: erThjTaekis(p, unit)   // 17.11.2026: þjónusta tækisins sjálfs (78 saveNewUnitOnSale), ekki varahlutur
        });
      });
    });

    // Async: fetch the original sale row
    fetchSaleByNum(saleNum).then(sale => {
      // 2026-06-23: seed the editable "Athugasemd á reikning" from the sale's
      // own note (print ON by default). Done here (once per open) so re-renders
      // don't clobber the operator's edits.
      pickupSaleNote = extractSaleNote(sale && sale.athugasemdir);
      pickupPrintNote = true;
      // renderPickupModal synchronously creates #_pkc-dialog; clearing the flag
      // right before it means the DOM-presence check takes over as the guard,
      // and no second open can slip in during the gap.
      _pkcOpening = false;
      renderPickupModal(job, sale, allUnits);
    }).catch(() => { _pkcOpening = false; });
  }

  // Items added during pickup (replacements customer wants to buy)
  const pickupExtras = []; // [{name, qty, unit_price_ex_vat, vsk_pct}]
  // 2026-05-24: Final-adjustments state — applied on top of the sale right
  // before the draft flips to final. Both reset to defaults on modal close.
  let pickupDiscountPct = 0;   // 0–100 (%), scales every line's unit_price
  // 2026-08-10 (ósk Agnars): manual FIXED kr discount, alongside the % one —
  // stacks on top of it (same convention as pos.js's own #pos-discount +
  // #pos-discount-kr pair in the main Sala cart), clamped in calcTotals/
  // finalizePickup so the two together can never exceed what's left to
  // discount.
  let pickupDiscountKr = 0;
  // 26.10.2026 (ósk Agnars): afslátturinn sem settur var í SÖLUNNI (solur.afslattur)
  // birtist nú í %/kr-reitunum sjálfum („þar sem hann var settur fyrst“) í stað
  // þess að standa sem sér lína sem ekki mátti hreyfa. Á meðan reitirnir eru
  // ósnertir gildir upprunalega kr-talan ÓBREYTT (engin endurröndun um 1 kr);
  // um leið og reit er breytt (pickupDiscReplace=true) KEMUR nýi afslátturinn
  // Í STAÐ sölu-afsláttarins — leggst ekki ofan á hann eins og áður.
  let pickupDiscReplace = false;
  // 03.11.2026: sölu-afslátturinn á það sem breytist í afhendingu. Sé hann heil prósenta
  // (afsláttur félagsins — sami lestur og origPctClean í renderPickupModal) gildir sama % á það
  // sem bætist við eða dettur út: varahluti og tæki af verkstæðinu (verklidur.parts), „+ Bæta við"
  // línur og ónýt tæki sem ekki eru afhent. Áður stóð kr-talan föst, svo viðbót fór á fullu verði
  // (R-001248, 20 %: yfirferð 4.200 í stað 3.360) og ónýtt tæki dró afsláttinn ekki niður.
  // Óbreytt upphæð → upprunalega kr-talan nákvæmlega (engin endurröndun, 26.10). Föst kr-tala
  // (ekki heil %) helst eins og áður. Notað í calcTotals OG finalizePickup svo forskoðun = vistun.
  function afslSolu(sale, gross) {
    const a0 = Math.max(0, Math.round(+(sale && sale.afslattur) || 0));
    const g = Math.max(0, Math.round(+gross || 0));
    if (!a0) return 0;
    const g0 = Math.round(+(sale && sale.samtals) || 0) + a0;
    const pr = g0 > 0 ? 100 * a0 / g0 : 0;
    const pct = pr && Math.abs(pr - Math.round(pr)) < 0.06 ? Math.round(pr) : 0;
    return Math.max(0, Math.min(g, pct ? a0 + Math.round((g - g0) * pct / 100) : a0));
  }
  /* ── ÞJÓNUSTA TÆKIS VIÐ AFHENDINGU (17.11.2026) ────────────────────────────────────────────────────────────────
   * Agnar: „þegar fólk er að sækja tækin í sótt, þá verð ég að geta svissað á milli hvort það hafi verið hlaðið eða
   * yfirfarið eða ónýtt, settu bara svipað og í ársskoðun". Hvert tæki ber því Yfirferð | Hleðsla | Ónýtt.
   *   • Yfirferð ⇄ Hleðsla færir það sem rukkar fyrir tækið: sölulínuna (sale.linur í minni — calcTotals og
   *     finalizePickup lesa hana þaðan) eða viðbótina, hafi tækinu verið bætt við á verkstæðinu (78 → verklidur.parts).
   *     Pörunin tæki ↔ vara ↔ lína er í 518 (ThjSkipti). Ekkert vistast fyrr en „Klára sölu og afhenda".
   *   • Ónýtt = hakið af: tækið fer ekki út og er ekki rukkað (sama staða og áður, nú sýnileg).
   *   • Sala sem er komin í Payday: þjónustan skráist á tækið, reikningurinn breytist ekki (SEND SALA neðar).
   * Tækið sem fer ekki út dregur nú SÍNA línu frá. Áður var dregið af magnmestu línunni, sama hvert tækið var:
   * ónýt yfirferð (4.200) gat tekið hleðslu (8.410) af reikningnum, eða stykki af seldri vöru. Finnist línan ekki
   * (eða 518 er ekki hlaðið) gildir gamla reglan óbreytt. */
  const TS = () => window.ThjSkipti || null;
  const nafnTaekis = s => (s && s.nafn != null) ? s.nafn : ((s && s.unit && s.unit.service) || '');
  const lysTaekis = s => { const t = TS(); return (t && s && s.unit) ? t.lysaTaeki(s.unit, s.nafn != null ? s.nafn : undefined) : null; };
  // Varahlutur á tæki sem er í raun ÞJÓNUSTA tækisins sjálfs: sama heiti, eða sama tegund + stærð + þjónusta.
  const erThjTaekis = (p, unit) => {
    const t = TS(); if (!t || !p || !unit) return false;
    const k = t.lykill(p.nafn); if (!k) return false;
    const d = t.lysa(p.nafn);
    return k === t.lykill(unit.service) || (!!d.teg && t.sama(d, t.lysaTaeki(unit)));
  };
  // Verð tækisins býr í viðbótinni, ekki á sölulínu.
  const iVidbot = (s, extras) => (extras || []).some(ex => ex && ex._thj && s.unit && ex._unitId === s.unit.id);
  // Viðbótin sem er rukkuð: þjónusta tækis sem fer ekki út dettur af.
  const vidbotAfhent = (extras, unitState) => (extras || []).filter(ex =>
    !(ex && ex._thj && (unitState || []).some(s => s.unit && s.unit.id === ex._unitId && !s.checked)));
  // Sölulínurnar að frádregnum tækjum sem fara ekki út. Notað í calcTotals OG finalizePickup (forskoðun = vistun).
  function linurAnOafhentra(linur, unitState, extras) {
    const w = (linur || []).map(l => ({ ...l, qty: +l.qty || 0 }));
    const us = unitState || [], t = TS();
    let toRemove = 0;
    us.forEach(s => {
      if (s.checked || iVidbot(s, extras)) return;
      const i = t ? t.finnaLinu(w, nafnTaekis(s), lysTaekis(s)) : -1;
      if (i >= 0) w[i].qty -= 1; else toRemove++;
    });
    if (toRemove > 0) {
      // Gamla reglan (2026-05-15): af magnmestu línunni fyrst; gangi það ekki upp, hlutfallslega.
      const order = w.map((l, i) => ({ i, qty: l.qty })).sort((a, b) => b.qty - a.qty);
      for (const e of order) { if (toRemove <= 0) break; const take = Math.min(toRemove, w[e.i].qty); w[e.i].qty -= take; toRemove -= take; }
      if (toRemove > 0 && us.length > 0) { const ratio = us.filter(s => s.checked).length / us.length; w.forEach(l => { l.qty = Math.max(0, Math.round(l.qty * ratio)); }); }
    }
    return w;
  }
  // Útlit rofans (Brunastál: silfurbakki, valið = málmsvart, Ónýtt valið = rautt á ljósu — sama og í Ársskoðun 224).
  // Þemað málar <button> með !important, því gervi-auðkenni + !important.
  function thjStill() {
    if (document.getElementById('_pkc-thj-css')) return;
    const st = document.createElement('style');
    st.id = '_pkc-thj-css';
    const K = '#_pkc-dialog:not(#_pk1):not(#_pk2):not(#_pk3) ';
    st.textContent =
      K + '._pkc-seg{display:inline-flex;flex:none;gap:2px;padding:3px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:#eef1f5;box-shadow:inset 0 1px 2px rgba(0,0,0,.08)}' +
      K + '._pkc-thj{height:30px!important;min-height:0!important;min-width:0!important;margin:0!important;padding:0 11px!important;border-radius:7px!important;border:1px solid transparent!important;' +
        'background:transparent!important;box-shadow:none!important;color:#1f2530!important;font:600 12.5px/1 "IBM Plex Sans",system-ui,sans-serif!important;text-shadow:none!important;cursor:pointer;white-space:nowrap}' +
      K + '._pkc-thj.on{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border-color:#000!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.3)!important}' +
      K + '._pkc-thj._pkc-onytt.on{background:#fff0ed!important;border-color:#fca5a5!important;color:#c0341d!important;box-shadow:none!important}' +
      K + '._pkc-thj:disabled{opacity:.38!important;pointer-events:none}' +
      K + '._pkc-line-disc.virk{border-color:#f59e0b!important;background:#fffbeb!important;color:#92400e!important}' +
      K + '._pkc-line-tot.afsl{color:#b45309!important}';
    document.head.appendChild(st);
  }
  // Samtala einnar sölulínu m. vsk, að frádregnum línuafslætti (17.11.2026). Sama regla og calcTotals/finalizePickup.
  const linuTot = l => (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 - Math.max(0, Math.min(100, +l.discount_pct || 0)) / 100) * (1 + ((l.vsk_pct == null ? 24 : +l.vsk_pct)) / 100);
  let pickupNote = '';         // free-text athugasemd appended to audit trail
  // 2026-06-23: the sale's OWN athugasemd (typed in KARFA, e.g. "Beiðnisnúmer
  // nr 9847265"). Surfaced in the Sótt window so the operator can edit it and
  // tick whether it prints on the reikningur (left side, under the customer).
  let pickupSaleNote = '';
  let pickupPrintNote = true;  // checkbox default ON

  // Pull the ORIGINAL operator note out of a sale's athugasemd, dropping any
  // pickup-audit tokens appended on a previous Sótt (Kt:/[Sótt …]/Greiðsla: …).
  function extractSaleNote(raw) {
    const s = String(raw == null ? '' : raw).replace(/\r/g, '');
    const i = s.search(/\n\s*Kt:|\[Sótt|\nGreiðsla:|\nViðbót:|\nAfsláttur:|\nEkki afhent:|\n?\[20\d\d-\d\d-\d\d/);
    return (i >= 0 ? s.slice(0, i) : s).trim();
  }

  function renderPickupModal(job, sale, unitsCtx) {
    let dlg = document.getElementById('_pkc-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_pkc-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const customer = (sale && sale.customer_nafn) || job.customer || 'Viðskiptavinur';
    const saleNum = (sale && sale.num) || parentSaleNum(job.num);

    // 2026-05-19: Detect upfront payment. If sale was already paid at
    // drop-off (paid_at set + greitt_med is kort/reidufe), the pickup
    // modal must NOT show payment options — that's confusing. Show a
    // big GREEN "GREITT" banner instead so the operator can see at a
    // glance that no payment is needed.
    // 2026-08-20: paid_at er stimplað við raun-greiðslu (kort/reiðufé/pening/posi/
    // millifærsla — sjá modal.js:71) EN líka SÍÐAR þegar bankagreiðsla reiknings
    // syncast inn. 2026-08-21: að treysta !!paid_at eitt (breytingin í gær) flaggaði
    // 187 reikningssölur ranglega sem „greitt fyrirfram" → Sótt sýndi GREITT-borðann
    // og tæki fóru út óuppgerð. RÉTT: GREITT AÐEINS fyrir raun-fyrirframgreiðslu —
    // undanskilja reikning + „greitt síðar". Denylist (ekki allowlist) svo ÖLL afbrigði
    // kort/reiðufé/pening/posi/millifærslu haldi borðanum — það lagar líka gamla
    // allowlist-regexið sem faldi „Reiðufé"/„posi" (raun-tvírukkunar-vörnin). Aðeins
    // BIRTING — uppgjörsrökin (prepaid, lína ~820) eru ÓBREYTT svo engin greidd sala
    // raskast (netvordur SAFE 2026-08-21).
    const _gm = String((sale && sale.greitt_med) || '').trim().toLowerCase();
    const _settledUpfront = _gm !== '' && _gm !== 'reikningur' && !/^greitt[_\s]?s[ií][dð]ar$/.test(_gm);
    const isAlreadyPaid = !!(sale && sale.paid_at && _settledUpfront);
    const paidMethodLabel = (sale && sale.greitt_med) === 'kort'    ? '💳 Kort' :
                            (sale && sale.greitt_med) === 'reidufe' ? '💵 Reiðufé' :
                            (sale && sale.greitt_med) ? esc(sale.greitt_med) : '';
    const paidWhen = sale && sale.paid_at ? new Date(sale.paid_at).toLocaleDateString('is-IS') : '';

    // Build initial state for unit checkboxes (default: all checked = customer takes)
    // Broken units default UNCHECKED — they're staying.
    const unitState = unitsCtx.map((ctx, i) => ({
      idx: i,
      jobId: ctx.jobId,
      unit: ctx.unit,
      checked: ctx.unit.status !== 'broken',
      nafn: null,      // 17.11.2026: þjónustuheiti valið í glugganum (null = óbreytt, unit.service)
      upph: null       // það sem rukkaði fyrir tækið fyrir fyrstu skiptingu — skilað nákvæmlega sé skipt til baka
    }));

    // Lines from existing sale, if any
    const saleLinur = (sale && Array.isArray(sale.linur)) ? sale.linur : [];

    // 26.10.2026 (ósk Agnars): sölu-afslátturinn sýnist í reitunum sjálfum. solur
    // geymir aðeins kr-töluna (afslattur, m. vsk) og samtals = brúttó − afslattur,
    // svo %-ið er reiknað til baka: afsl / (samtals + afsl). Sé það heil tala (±0,06,
    // t.d. 1.173 / 5.332 = 22,0 %) var slegin inn prósenta í kassanum → %-reiturinn;
    // annars var það föst kr-tala → kr-reiturinn. Reitirnir eru aðeins forfylltir
    // þegar þeir eru tómir (ekki yfir það sem starfsmaður sló inn fyrr í sömu opnun).
    pickupDiscReplace = false;
    const origAfslKr = Math.max(0, Math.round(+(sale && sale.afslattur) || 0));
    const origGross = Math.round(+(sale && sale.samtals) || 0) + origAfslKr;
    const origPctRaw = (origAfslKr && origGross > 0) ? 100 * origAfslKr / origGross : 0;
    const origPctClean = origPctRaw && Math.abs(origPctRaw - Math.round(origPctRaw)) < 0.06 ? Math.round(origPctRaw) : 0;
    if (origAfslKr && !pickupDiscountPct && !pickupDiscountKr) {
      if (origPctClean) pickupDiscountPct = origPctClean;
      else pickupDiscountKr = origAfslKr;
    }

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(920px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">📦 Sókn — ' + esc(customer) + '</h3>' +
            '<div style="font-size:11px;color:#a7f3d0;margin-top:2px">Sala ' + esc(saleNum) + ' · ' + unitsCtx.length + ' tæki í verki</div>' +
          '</div>' +
          '<button id="_pkc-x" type="button" style="background:transparent;border:1px solid #34d399;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_pkc-body" style="flex:1;overflow:auto;padding:18px 22px"></div>' +
        // B38 (Agnar 30.09: „ná afslættinum inn á sömu opnu — hann gæti týnst þarna“): Lokastillingin (afsláttur + athugasemd)
        // situr nú í fætinum VIÐ HLIÐ samtalnanna, alltaf sýnileg, í stað þess að standa neðst í skrunanlegu meginmáli.
        '<div id="_pkc-foot" style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<div id="_pkc-loka" style="padding:11px 22px;border-right:1px solid #e2e8f0"></div>' +
          '<div id="_pkc-totals" style="padding:11px 22px"></div>' +
        '</div>' +
        (isAlreadyPaid
          // PAID UPFRONT — green banner, no payment selector. Just deliver.
          ? '<div style="padding:0;border-top:1px solid #166534;background:#16a34a;color:#fff;display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap">' +
              '<div style="padding:14px 22px;display:flex;align-items:center;gap:12px">' +
                '<div style="font-size:28px">✓</div>' +
                '<div>' +
                  '<div style="font-size:15px;font-weight:800;letter-spacing:.04em">GREITT</div>' +
                  '<div style="font-size:11px;color:#dcfce7">Greitt fyrirfram með ' + paidMethodLabel + (paidWhen ? ' · ' + paidWhen : '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="padding:11px 22px;display:flex;gap:8px;flex-wrap:wrap">' +
                '<button id="_pkc-cancel" type="button" style="padding:9px 18px;border:1px solid rgba(255,255,255,0.4);border-radius:8px;background:transparent;color:#fff;cursor:pointer;font:inherit;font-size:13px">Hætta við</button>' +
                '<button id="_pkc-finalize" type="button" style="padding:9px 18px;background:#fff;color:#166534;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:800">📦 Afhenda tæki</button>' +
              '</div>' +
            '</div>'
          : '<div style="padding:13px 22px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
              '<button id="_pkc-cancel" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
              '<select id="_pkc-pay" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff">' +
                // 2026-05-12: Default to Kort (card) — that's how the vast majority
                // of pickups are paid in 2026. Reiðufé moved to second.
                '<option value="kort" selected>💳 Kort</option>' +
                '<option value="reidufe">💵 Reiðufé</option>' +
                '<option value="reikningur">📋 Setja í reikning</option>' +
                // 2026-08-14 (líkanið): „Greitt síðar" er EKKI uppgjör heldur
                // óútkljáð staða við MÓTTÖKU — við afhendingu VERÐUR hún að
                // leysast í kort/reikning/reiðufé. Valkosturinn er því farinn.
              '</select>' +
              '<button id="_pkc-finalize" type="button" style="padding:9px 18px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Klára sölu og afhenda</button>' +
            '</div>'
        ) +
      '</div>';
    document.body.appendChild(dlg);

    function close() {
      dlg.remove();
      // 2026-05-10 (F3 fix): clear extras on close so a re-open starts fresh.
      pickupExtras.length = 0;
      // 2026-05-24: same reset for the new final-adjustments fields so the
      // next pickup starts with a clean slate (no leaked discount/note).
      pickupDiscountPct = 0;
      pickupDiscountKr = 0;
      pickupDiscReplace = false;
      pickupNote = '';
      pickupSaleNote = '';
      pickupPrintNote = true;
      try { delete window._pkcRefresh; } catch(_){}
    }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_pkc-x').addEventListener('click', close);
    dlg.querySelector('#_pkc-cancel').addEventListener('click', close);

    // ── 17.11.2026: Yfirferð | Hleðsla | Ónýtt á hverju tæki (sjá ÞJÓNUSTA TÆKIS VIÐ AFHENDINGU efst) ──────────────
    thjStill();
    // Teiknar meginmálið aftur án þess að skrun eða fókus hoppi (388), og samtölurnar með.
    function endurteikna() {
      const body = dlg.querySelector('#_pkc-body');
      const aftur = (window.Stodugt && Stodugt.vernda && body) ? Stodugt.vernda(body) : null;
      renderBody();
      if (aftur) aftur();
      renderTotals();
    }
    let _thjVinnur = false;
    async function veljaThj(s, t) {
      if (_thjVinnur) return;
      if (t === 'onytt') { s.checked = false; endurteikna(); return; }
      const T = TS();
      if (!T) { s.checked = true; endurteikna(); return; }
      _thjVinnur = true;
      try {
        await T.saekja();
        const d = lysTaekis(s);
        if (d.teg !== t) {
          const ny = T.vara(d, t);
          if (!ny) { alert('Engin ' + t + ' er til í vörulistanum fyrir þetta tæki (' + (nafnTaekis(s) || s.unit.type || 'tæki') + '). Ekkert breyttist.'); return; }
          const gamla = nafnTaekis(s), nyNafn = String(ny.nafn).trim();
          const vsk = ny.vsk_prosenta == null ? 24 : +ny.vsk_prosenta;
          const tilBaka = !!(s.upph && s.upph.teg === t);   // aftur á upphaflegu þjónustuna → nákvæmlega fyrri lína/verð
          const ex = pickupExtras.find(x => x._thj && x._unitId === s.unit.id);
          if (ex) {
            if (!s.upph) s.upph = { teg: d.teg, ex: { name: ex.name, unit_price_ex_vat: ex.unit_price_ex_vat, vsk_pct: ex.vsk_pct, _varaId: ex._varaId != null ? ex._varaId : null } };
            if (tilBaka && s.upph.ex) Object.assign(ex, s.upph.ex);
            else Object.assign(ex, { name: nyNafn, unit_price_ex_vat: +ny.verd_an_vsk || 0, vsk_pct: vsk, _varaId: ny.id });
            s.ath = 'verðið fylgir valinu';
          } else if (erSendSala(sale) === true) {
            if (!s.upph) s.upph = { teg: d.teg };
            s.ath = 'salan er komin í Payday, reikningurinn breytist ekki';
          } else if (sale && Array.isArray(sale.linur) && sale.linur.length) {
            const i = T.finnaLinu(sale.linur, gamla, d);
            if (i < 0) {
              if (!s.upph) s.upph = { teg: d.teg };
              s.ath = 'fann ekki línuna á sölunni, verðið er óbreytt — lagaðu það undir „Verð á seldum tækjum“';
            } else {
              const L = sale.linur[i];
              if (!s.upph) s.upph = { teg: d.teg, lina: { desc: L.desc, product_id: L.product_id, unit_price_ex_vat: L.unit_price_ex_vat, vsk_pct: L.vsk_pct } };
              const j = T.skiptaLinu(sale.linur, i, ny);
              if (tilBaka && s.upph.lina) Object.assign(sale.linur[j], s.upph.lina);
              s.ath = 'verðið fylgir valinu';
            }
          } else {
            if (!s.upph) s.upph = { teg: d.teg };
            s.ath = '';   // engin sala enn: línurnar verða til úr tækjunum við afhendingu (linurUrVerklidum)
          }
          // Aftur á upphaflegu þjónustuna: tækið ber þá sitt upphaflega heiti (ekkert skrifast á það).
          s.nafn = tilBaka ? null : nyNafn;
        }
        s.checked = true;
      } catch (e) {
        alert('Náði ekki í vörulistann, svo ekki er hægt að skipta um þjónustu núna. Reyndu aftur. (' + ((e && e.message) || e) + ')');
      } finally {
        _thjVinnur = false;
        endurteikna();
      }
    }

    // Render body and totals
    function renderBody() {
      const body = dlg.querySelector('#_pkc-body');
      let html = '';

      // ── Section 0: Customer info (editable until paid) ──────────────────
      // Walk-ins (kt 999999-9999) often want to add their real kt at pickup
      // for their receipt. Allow editing here so user can update without
      // having to cancel + recreate the sale.
      // 17.11.2026: það sem þegar var slegið inn heldur sér við endurteikningu (rofi á tæki, „+ Bæta við") —
      // áður fór nafn/kt/sími aftur í gildi sölunnar og innslátturinn hvarf.
      const fyrri = id => { const e = body && body.querySelector('#' + id); return e ? e.value : null; };
      const fN = fyrri('_pkc-cust-nafn'), fK = fyrri('_pkc-cust-kt'), fS = fyrri('_pkc-cust-simi');
      const curNafn = fN != null ? fN : ((sale && sale.customer_nafn) || job.customer || '');
      const curKt = fK != null ? fK : ((sale && (sale.customer_kt || (sale.linur && sale.linur[0] && sale.linur[0].customer_kt))) || '');
      const curSimi = fS != null ? fS : (job.phone || '');
      html += '<div style="margin-bottom:14px;padding:11px 13px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px">' +
        '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Upplýsingar á reikning</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Nafn</label>' +
            '<input id="_pkc-cust-nafn" type="text" value="' + esc(curNafn) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Kennitala (valkvætt)</label>' +
            '<input id="_pkc-cust-kt" type="text" placeholder="000000-0000" value="' + esc(curKt) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;font-family:monospace">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Sími</label>' +
            '<input id="_pkc-cust-simi" type="tel" value="' + esc(curSimi) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '</div>' +
          '<div style="display:flex;align-items:end">' +
            '<div style="font-size:10px;color:#94a3b8;line-height:1.35">Þú getur breytt nafni og bætt við kennitölu áður en kvittunin er prentuð.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

      // ── Section 1: Tæki sem viðskiptavinur tekur ────────────────────────
      html += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Tæki frá viðgerð</div>';
      if (unitState.length) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">';
        // 17.11.2026: hak · Yfirferð | Hleðsla | Ónýtt á hverju tæki (eins og í Ársskoðun). Röðin er ekki lengur <label>
        // utan um allt — smellur á rofann má ekki snúa hakinu. Ónýtt ≡ hakið af (sama staða og vistast: 'broken').
        const T = TS(), listi = T && T.listi();
        unitState.forEach(s => {
          const u = s.unit;
          const broken = !s.checked;
          const d = lysTaekis(s);
          const breytt = s.nafn != null && T && T.lysaTaeki(u).teg !== (d && d.teg);
          const seg = ['yfirferð', 'hleðsla'].map(t => {
            const a = !broken && !!d && d.teg === t;
            // Óvirkur aðeins þegar listinn er kominn og engin slík vara er til fyrir tækið (t.d. CO₂ 100 gr.).
            const til = !listi || !d || d.teg === t || !!T.vara(d, t);
            return '<button type="button" class="_pkc-thj' + (a ? ' on' : '') + '" data-idx="' + s.idx + '" data-t="' + t + '" aria-pressed="' + a + '"' +
              (til ? '' : ' disabled title="Engin ' + t + ' er til í vörulistanum fyrir þetta tæki"') + '>' + (t === 'hleðsla' ? 'Hleðsla' : 'Yfirferð') + '</button>';
          }).join('') +
            '<button type="button" class="_pkc-thj _pkc-onytt' + (broken ? ' on' : '') + '" data-idx="' + s.idx + '" data-t="onytt" aria-pressed="' + broken + '">Ónýtt</button>';
          html += '<div class="_pkc-urow" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;padding:9px 12px;border-bottom:1px solid #f1f5f9;background:' + (broken ? '#fef2f2' : '#fff') + '">' +
            '<label style="display:flex;align-items:center;gap:10px;flex:1 1 220px;min-width:0;cursor:pointer">' +
            '<input type="checkbox" data-idx="' + s.idx + '" ' + (s.checked ? 'checked' : '') + ' class="_pkc-unit-chk" style="width:18px;height:18px;cursor:pointer;flex:none">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:' + (broken ? '#7f1d1d' : '#0f172a') + '">' +
                esc(u.serial || '—') + ' · ' + esc(nafnTaekis(s) || u.type || '—') +
                (broken ? ' <span style="background:#dc2626;color:#fff;padding:1px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px">ÓNÝTT</span>' : '') +
              '</div>' +
              (broken
                ? '<div style="font-size:11px;color:#7f1d1d;margin-top:2px">' + (u.status === 'broken' ? 'Verkstæði fann ónýtt — ' : '') + 'Fer ekki út og er ekki rukkað</div>'
                : '<div style="font-size:11px;color:#64748b;margin-top:2px">' + (breytt ? 'Var skráð „' + esc(u.service || '') + '“' + (s.ath ? ' — ' + esc(s.ath) : '') : 'Tilbúið til afhendingar') + '</div>'
              ) +
            '</div>' +
            '</label>' +
            '<div class="_pkc-seg" role="group" aria-label="Þjónusta á ' + esc(u.serial || 'tæki') + '">' + seg + '</div>' +
          '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;border:1px dashed #cbd5e1;border-radius:8px">Engin tæki á þessari verkbeiðni</div>';
      }
      html += '</div>';

      // ── Section 1b: Verð á seldum tækjum (2026-07-01) ───────────────────
      // The original sale lines are the actual charge. Expose each line's unit
      // price as an editable field so the operator can adjust a price at Sótt
      // (not just apply a blanket % afsláttur). saleLinur === sale.linur by
      // reference, and both calcTotals() and finalizePickup() read sale.linur
      // live — so an in-place edit here flows straight into the totals and the
      // finalised sale with no extra plumbing.
      if (saleLinur.length) {
        html += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Verð á seldum tækjum</div>' +
          '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">';
        saleLinur.forEach((l, li) => {
          const q = +l.qty || 0;
          const price = +l.unit_price_ex_vat || 0;
          const vsk = (l.vsk_pct == null ? 24 : +l.vsk_pct);
          const disc = Math.max(0, Math.min(100, +l.discount_pct || 0));
          const lineTot = linuTot(l);
          html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(l.desc || l.name || 'Lína') + '</div>' +
              '<div style="font-size:11px;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:5px">' +
                '<input class="_pkc-line-price" data-li="' + li + '" type="number" min="0" step="1" value="' + Math.round(price * (1 + vsk / 100)) + '" style="width:84px;padding:3px 7px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right;font-variant-numeric:tabular-nums">' +
                '<span>kr m. vsk (' + vsk + '%)</span>' +
              '</div>' +
            '</div>' +
            // 17.11.2026 (Agnar: „það vantar líka Línu afslátt, að geta gefið á einstaka hluti"): afsláttur á EINA línu.
            // Hann býr í line.discount_pct — reiturinn sem Sölu-ritillinn (142) notar — svo calcTotals og finalizePickup
            // lásu hann þegar (finalize bakar hann í verðið og bætir „· −N% afsl." aftan við heitið, 165-venjan).
            // Afslátturinn neðst (% / kr) reiknast áfram ofan á, á heildina.
            '<div style="display:flex;align-items:center;gap:4px">' +
              '<input data-li="' + li + '" type="number" min="0" max="100" step="1" value="' + (disc || '') + '" placeholder="0" title="Afsláttur á þessa línu" aria-label="Afsláttur á ' + esc(l.desc || 'línu') + '" class="_pkc-line-disc' + (disc ? ' virk' : '') + '" style="width:52px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:center;font-variant-numeric:tabular-nums">' +
              '<span style="color:#94a3b8;font-size:12px">%</span>' +
            '</div>' +
            // 2026-08-19 (ósk Agnars): qty is now inline-editable so the operator
            // can bill the ACTUAL amount delivered — e.g. a 100gr CO₂ line entered
            // as ×26 but only 20 were really filled. Mirrors the extras-qty input.
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<input class="_pkc-line-qty" data-li="' + li + '" type="number" min="1" step="1" value="' + q + '" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:center;font-variant-numeric:tabular-nums">' +
              '<span style="color:#94a3b8;font-size:12px">×</span>' +
            '</div>' +
            '<div class="_pkc-line-tot' + (disc ? ' afsl' : '') + '" style="font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;min-width:80px;text-align:right">' + esc(fmtKr(lineTot)) + '</div>' +
          '</div>';
        });
        html += '</div>' +
          '<div style="font-size:10px;color:#94a3b8;margin-top:3px">Breyttu einingaverði m. vsk (fullt verð sem viðskiptavinur greiðir) eða gefðu afslátt á stöku línu (%) — uppfærist strax í samtölunni. Afsláttur neðst reiknast ofan á þetta, á heildina.</div>' +
        '</div>';
      }

      // 2026-06-23: sale note → prints on the reikningur (left, under customer).
      // The athugasemd typed in KARFA; editable here, the checkbox decides if it
      // prints (handed to SalaInvoice as vegnaRaw at print time).
      html += '<div style="margin-bottom:14px">' +
        '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer">' +
          '<input type="checkbox" id="_pkc-printnote"' + (pickupPrintNote ? ' checked' : '') + ' style="width:17px;height:17px;cursor:pointer;flex-shrink:0">' +
          '<span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Athugasemd á reikning</span>' +
        '</label>' +
        '<textarea id="_pkc-salenote" rows="2" placeholder="t.d. Beiðnisnúmer nr 9847265" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">' + esc(pickupSaleNote) + '</textarea>' +
        '<div style="font-size:10px;color:#94a3b8;margin-top:3px">Hakað → prentast vinstra megin á reikningnum, undir viðskiptavininn.</div>' +
      '</div>';

      // ── Section 2: Replacement / extra products to add ──────────────────
      html += '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
        '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Ný tæki / aukalega</div>' +
        '<button id="_pkc-add-extra" type="button" style="padding:5px 11px;background:#dbeafe;border:1px solid #bfdbfe;color:#1e40af;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">+ Bæta við</button>' +
      '</div>';
      if (pickupExtras.length) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">';
        pickupExtras.forEach((ex, i) => {
          const lineTotal = (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
          // F1 fix: qty is now an inline editable input.
          // 17.11.2026: þjónusta tækis sem fer ekki út (Ónýtt / hak af) er ekki rukkuð — línan stendur dauf.
          const sleppt = !!(ex._thj && unitState.some(s => s.unit && s.unit.id === ex._unitId && !s.checked));
          const wsTag = (ex._fromWorkshop
            ? ' <span style="font-size:9px;background:#fee2e2;color:#991b1b;padding:1px 7px;border-radius:99px;font-weight:700;vertical-align:middle">🔧 frá verkstæði</span>'
            : '') + (sleppt ? ' <span style="font-size:9px;background:#e2e8f0;color:#475569;padding:1px 7px;border-radius:99px;font-weight:700;vertical-align:middle">ekki rukkað — tækið fer ekki út</span>' : '');
          html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9' + (sleppt ? ';opacity:.55' : '') + '">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:#0f172a">' + esc(ex.name) + wsTag + '</div>' +
              // 2026-07-01: unit price is now inline-editable so the operator can
              // adjust what a replacement/extra costs at Sótt (before this only qty
              // could change; price was locked to the vörulisti). Blank/invalid is
              // ignored on input — the last valid value stays.
              '<div style="font-size:11px;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:5px">' +
                '<input class="_pkc-extra-price" data-i="' + i + '" type="number" min="0" step="1" value="' + Math.round((ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100)) + '" style="width:84px;padding:3px 7px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right;font-variant-numeric:tabular-nums">' +
                '<span>kr m. vsk (' + (ex.vsk_pct || 24) + '%)</span>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<input class="_pkc-extra-qty" data-i="' + i + '" type="number" min="1" step="1" value="' + (ex.qty || 1) + '" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:center;font-variant-numeric:tabular-nums">' +
              '<span style="color:#94a3b8;font-size:12px">×</span>' +
            '</div>' +
            '<div style="font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;min-width:80px;text-align:right">' + esc(fmtKr(lineTotal)) + '</div>' +
            '<button class="_pkc-rm-extra" data-i="' + i + '" type="button" title="Eyða línu" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;padding:2px 6px">×</button>' +
          '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:12px;border:1px dashed #cbd5e1;border-radius:8px;font-style:italic">Engin viðbót — smelltu „+ Bæta við" til að bjóða nýtt</div>';
      }
      html += '</div>';

      // ── Section 3: Final adjustments — discount + free-text note ────────
      // 2026-05-24: Lets the operator apply a percent discount and jot a
      // short note before the draft sale is finalised. Discount scales every
      // line's unit_price_ex_vat (mixed-VSK safe) and is also recorded in
      // the `afslattur` column for reporting. Note is appended to audit.
      // B38: blokkin teiknast í #_pkc-loka (fóturinn), ekki í meginmálið
      let loka = '<div id="_pkc-loka-box" style="padding:0">' +
        '<div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Lokastilling fyrir kvittun</div>' +
        '<div style="display:grid;grid-template-columns:auto auto 1fr;gap:8px 10px;align-items:center">' +
          '<label style="font-size:12px;font-weight:600;color:#78350f">Afsláttur:</label>' +
          // 2026-08-10 (ósk Agnars): fastur kr-afsláttur til viðbótar við %-ið —
          // sama mynstur og #pos-discount/#pos-discount-kr parið í aðal-Sölu-
          // körfunni (pos.js). Bæði mega vera notuð saman; reiknað í calcTotals.
          '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">' +
            '<input id="_pkc-disc" type="number" min="0" max="100" step="1" value="' + (pickupDiscountPct || 0) + '" ' +
              'style="width:52px;padding:5px 7px;border:1px solid #fde68a;border-radius:5px;font:inherit;font-size:13px;text-align:center;background:#fff">' +
            '<span style="font-size:12px;color:#78350f;font-weight:600">%</span>' +
            '<span style="font-size:11px;color:#b45309;padding:0 1px">eða</span>' +
            '<input id="_pkc-disc-kr" type="number" min="0" step="1" value="' + (pickupDiscountKr || 0) + '" ' +
              'style="width:74px;padding:5px 7px;border:1px solid #fde68a;border-radius:5px;font:inherit;font-size:13px;text-align:right;background:#fff">' +
            '<span style="font-size:12px;color:#78350f;font-weight:600">kr</span>' +
          '</div>' +
          '<div id="_pkc-disc-hint" style="font-size:11.5px;color:#92400e;font-style:italic">' +
            ((pickupDiscountPct || pickupDiscountKr) ? (pickupDiscReplace ? '' : 'úr sölunni · breyttu ef þarf') : 'má nota % og/eða fasta kr-upphæð saman') +
          '</div>' +
          '<label style="font-size:12px;font-weight:600;color:#78350f;align-self:start;padding-top:5px">Athugasemd:</label>' +
          '<textarea id="_pkc-note" rows="2" placeholder="t.d. afsláttur — fastur kúnni · kennitala send eftir á · annað" ' +
            'style="grid-column:2 / span 2;width:100%;padding:6px 9px;border:1px solid #fde68a;border-radius:5px;font:inherit;font-size:12.5px;line-height:1.4;resize:vertical;box-sizing:border-box;background:#fff">' + esc(pickupNote || '') + '</textarea>' +
        '</div>' +
      '</div>';

      body.innerHTML = html;
      const lokaEl = dlg.querySelector('#_pkc-loka'); if (lokaEl) lokaEl.innerHTML = loka;   // B38

      // Wire checkboxes
      body.querySelectorAll('._pkc-unit-chk').forEach(cb => {
        cb.addEventListener('change', e => {
          const idx = +cb.dataset.idx;
          const s = unitState.find(x => x.idx === idx);
          if (s) s.checked = cb.checked;
          endurteikna();   // 17.11.2026: röðin, rofinn og viðbótin fylgja hakinu (áður aðeins samtölurnar)
        });
      });
      // 17.11.2026: Yfirferð | Hleðsla | Ónýtt
      body.querySelectorAll('._pkc-thj').forEach(b => {
        b.addEventListener('click', () => { const s = unitState.find(x => x.idx === +b.dataset.idx); if (s) veljaThj(s, b.dataset.t); });
      });
      // Wire add-extra
      body.querySelector('#_pkc-add-extra').addEventListener('click', () => openExtraDialog());
      // Wire qty edit on extras
      body.querySelectorAll('._pkc-extra-qty').forEach(inp => {
        inp.addEventListener('input', () => {
          const i = +inp.dataset.i;
          const v = parseInt(inp.value, 10);
          if (!Number.isFinite(v) || v < 1) return;
          if (pickupExtras[i]) {
            pickupExtras[i].qty = v;
            renderTotals();
            // Update the line-total cell next to this input without full re-render
            const cell = inp.closest('div[style*="padding:9px"]');
            if (cell) {
              const totalEl = cell.querySelector('div[style*="min-width:80px"]');
              if (totalEl) {
                const ex = pickupExtras[i];
                const lt = (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
                totalEl.textContent = fmtKr(lt);
              }
            }
          }
        });
      });
      // Wire unit-price edit on extras (2026-07-01). Mirrors the qty wiring —
      // updates the stored line price, recomputes the totals band + the discount
      // hint, and refreshes just this line's total cell so the caret is kept.
      body.querySelectorAll('._pkc-extra-price').forEach(inp => {
        inp.addEventListener('input', () => {
          const i = +inp.dataset.i;
          const v = parseFloat(inp.value);
          if (!Number.isFinite(v) || v < 0) return;
          if (pickupExtras[i]) {
            // 2026-08-10: input is now m. vsk (what the customer actually pays
            // per unit) — convert back to the ex-VAT price this app stores
            // internally, same convention as pos.js's own .pos-price-edit.
            const vskPct = pickupExtras[i].vsk_pct || 24;
            pickupExtras[i].unit_price_ex_vat = v / (1 + vskPct / 100);
            renderTotals();
            const cell = inp.closest('div[style*="padding:9px"]');
            if (cell) {
              const totalEl = cell.querySelector('div[style*="min-width:80px"]');
              if (totalEl) {
                const ex = pickupExtras[i];
                const lt = (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
                totalEl.textContent = fmtKr(lt);
              }
            }
          }
        });
      });
      // Wire unit-price edit on the original sale lines (2026-07-01). Mutates
      // sale.linur in place (saleLinur === sale.linur), which calcTotals() and
      // finalizePickup() both read live, then refreshes the totals band + this
      // line's own total cell without a full re-render (keeps the caret).
      body.querySelectorAll('._pkc-line-price').forEach(inp => {
        inp.addEventListener('input', () => {
          const li = +inp.dataset.li;
          const v = parseFloat(inp.value);
          if (!Number.isFinite(v) || v < 0) return;
          if (saleLinur[li]) {
            // 2026-08-10: input is now m. vsk — convert back to the ex-VAT
            // price this app stores internally (same as the extras field
            // above and pos.js's own .pos-price-edit in the main Sala cart).
            const vskPct = saleLinur[li].vsk_pct == null ? 24 : +saleLinur[li].vsk_pct;
            saleLinur[li].unit_price_ex_vat = v / (1 + vskPct / 100);
            renderTotals();
            const cell = inp.closest('div[style*="padding:9px"]');
            const totEl = cell && cell.querySelector('._pkc-line-tot');
            if (totEl) totEl.textContent = fmtKr(linuTot(saleLinur[li]));
          }
        });
      });
      // 17.11.2026: afsláttur á stöku línu. Skrifar í line.discount_pct (sama reit og 142) — calcTotals og
      // finalizePickup lesa hann þaðan, svo forskoðun og vistun fylgja sjálfkrafa. Tómur reitur = enginn afsláttur.
      body.querySelectorAll('._pkc-line-disc').forEach(inp => {
        inp.addEventListener('input', () => {
          const li = +inp.dataset.li, l = saleLinur[li];
          if (!l) return;
          const v = parseFloat(String(inp.value).replace(',', '.'));
          l.discount_pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
          const lit = l.discount_pct > 0;
          inp.classList.toggle('virk', lit);
          renderTotals();
          const cell = inp.closest('div[style*="padding:9px"]');
          const totEl = cell && cell.querySelector('._pkc-line-tot');
          if (totEl) { totEl.textContent = fmtKr(linuTot(l)); totEl.classList.toggle('afsl', lit); }
        });
      });
      // Wire qty edit on the original sale lines (2026-08-19, ósk Agnars).
      // Mirrors the line-price wiring — mutates sale.linur in place
      // (saleLinur === sale.linur), which calcTotals() and finalizePickup()
      // both read live, then refreshes the totals band + this line's own total
      // cell. Lets the operator bill the actual delivered qty (e.g. a 100gr CO₂
      // line that came in as ×26 but only 20 were filled). In the normal pickup
      // (all units checked) the peeling logic is a no-op, so the edited qty is
      // charged verbatim; when units are unchecked, peeling still applies on top.
      body.querySelectorAll('._pkc-line-qty').forEach(inp => {
        inp.addEventListener('input', () => {
          const li = +inp.dataset.li;
          const v = parseInt(inp.value, 10);
          if (!Number.isFinite(v) || v < 1) return;
          if (saleLinur[li]) {
            saleLinur[li].qty = v;
            renderTotals();
            const cell = inp.closest('div[style*="padding:9px"]');
            const totEl = cell && cell.querySelector('._pkc-line-tot');
            if (totEl) totEl.textContent = fmtKr(linuTot(saleLinur[li]));
          }
        });
      });
      // Wire remove-extra
      body.querySelectorAll('._pkc-rm-extra').forEach(b => {
        b.addEventListener('click', () => {
          pickupExtras.splice(+b.dataset.i, 1);
          renderBody();
          renderTotals();
        });
      });
      // 2026-05-24: Normalise kennitala field on input/blur so the user sees
      // the canonical XXXXXX-XXXX format appear as they type. DB trigger also
      // normalises on write — this is the UI-feedback half of the same fix.
      if (window.U && typeof U.bindKtInput === 'function') {
        const ktInp = dlg.querySelector('#_pkc-cust-kt');
        if (ktInp) U.bindKtInput(ktInp);
      }
      // 2026-05-24: Wire discount + note inputs. Discount triggers a totals
      // recompute without re-rendering the whole body (keeps caret position
      // in the textarea). Note is just stashed; written out at finalize.
      const discInp = dlg.querySelector('#_pkc-disc');   // B38: í fætinum
      if (discInp) {
        discInp.addEventListener('input', () => {
          const v = parseFloat(discInp.value);
          pickupDiscountPct = Number.isFinite(v) && v >= 0 ? Math.min(100, v) : 0;
          pickupDiscReplace = true;   // 26.10: nýr afsláttur kemur Í STAÐ sölu-afsláttarins
          renderTotals();
        });
      }
      const discKrInp = dlg.querySelector('#_pkc-disc-kr');
      if (discKrInp) {
        discKrInp.addEventListener('input', () => {
          const v = parseFloat(discKrInp.value);
          pickupDiscountKr = Number.isFinite(v) && v >= 0 ? v : 0;
          pickupDiscReplace = true;
          renderTotals();
        });
      }
      const noteInp = dlg.querySelector('#_pkc-note');
      if (noteInp) {
        noteInp.addEventListener('input', () => { pickupNote = noteInp.value; });
      }
      // 2026-06-23: editable sale-note + "prentast á reikning" checkbox.
      const saleNoteInp = body.querySelector('#_pkc-salenote');
      if (saleNoteInp) saleNoteInp.addEventListener('input', () => { pickupSaleNote = saleNoteInp.value; });
      const printChk = body.querySelector('#_pkc-printnote');
      if (printChk) printChk.addEventListener('change', () => { pickupPrintNote = printChk.checked; });
    }

    function calcTotals() {
      const allUnits = unitState;
      const totalUnits = allUnits.length;
      const takenCount = allUnits.filter(s => s.checked).length;
      // Mirror finalizePickup so the preview matches what is actually charged:
      // peel the UNCHECKED units off the largest-qty lines (the old
      // samtals/totalUnits estimate diverged on sales mixing units + products).
      let unitsTotal = 0;
      // 17.11.2026: tækið sem fer ekki út dregur SÍNA línu frá (linurAnOafhentra) — sama fall og finalizePickup.
      const oldLinur = linurAnOafhentra((sale && Array.isArray(sale.linur)) ? sale.linur : [], unitState, pickupExtras);
      if (oldLinur.length) {
        // (1 − discount_pct) mirrors finalizePickup's line-discount baking.
        unitsTotal = oldLinur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 - Math.max(0, Math.min(100, +l.discount_pct || 0)) / 100) * (1 + (+l.vsk_pct || 24) / 100), 0);
      } else if (job.verd && (job.units || []).filter(u => u && u.status !== 'eytt').length > 0) {
        unitsTotal = (+job.verd / (job.units || []).filter(u => u && u.status !== 'eytt').length) * takenCount;
      }
      const perUnit = takenCount > 0 ? unitsTotal / takenCount : 0;
      const extrasTotal = vidbotAfhent(pickupExtras, unitState).reduce((s, ex) => {
        return s + (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
      }, 0);
      const subTotal = unitsTotal + extrasTotal;
      // 2026-07-08: carry the draft's existing POS discount (gross kr) so the
      // preview matches finalizePickup — before, a "greitt síðar" draft with a
      // kassa-afslátt was silently previewed AND charged at full price.
      // 26.10.2026: sé reitunum BREYTT (pickupDiscReplace) fellur sölu-afslátturinn
      // niður og nýi afslátturinn reiknast af öllu; ósnertir reitir = sölu-afslátturinn (afslSolu:
      // sama % á viðbót/frádrátt sé hann heil prósenta, annars kr-talan óbreytt).
      const origDisc = pickupDiscReplace ? 0 : afslSolu(sale, subTotal);
      // 2026-05-24: Apply optional pickup-time discount (0–100 %) on the rest.
      const remainder = subTotal - origDisc;
      const discPct = pickupDiscReplace ? Math.max(0, Math.min(100, +pickupDiscountPct || 0)) : 0;
      const pctDiscountKr = remainder * discPct / 100;
      // 2026-08-10 (ósk Agnars): manual fixed-kr discount, stacks on top of
      // the % one — clamped so the two together never exceed the remainder.
      const manualDiscKr = pickupDiscReplace ? Math.max(0, Math.min(remainder - pctDiscountKr, +pickupDiscountKr || 0)) : 0;
      const discountKr = pctDiscountKr + manualDiscKr;
      const grand = subTotal - origDisc - discountKr;
      return {
        totalUnits, takenCount, perUnit,
        unitsTotal: Math.round(unitsTotal),
        extrasTotal: Math.round(extrasTotal),
        subTotal: Math.round(subTotal),
        origDisc: Math.round(origDisc),
        discountPct: discPct,
        discountKrManual: Math.round(manualDiscKr),
        discountKr: Math.round(discountKr),
        grand: Math.round(grand)
      };
    }

    function renderTotals() {
      const t = calcTotals();
      const totals = dlg.querySelector('#_pkc-totals');
      const original = sale && sale.samtals ? +sale.samtals : 0;
      const diff = t.grand - original;
      // 17.11.2026 (60d00882): sala komin í Payday — upphæð hennar breytist ekki við afhendingu; aðeins viðbótin er rukkuð
      // hér (á nýja sölu). Án þessa sýndi glugginn heildina og kortið gat verið rukkað fyrir reikning sem er þegar í banka.
      const sendS = erSendSala(sale) === true;
      const rukkaNu = sendS ? vidbotarSala(vidbotAfhent(pickupExtras, unitState).map(ex => ({ ...ex, qty: ex.qty || 1 })), pickupDiscReplace ? (+pickupDiscountPct || 0) : 0, pickupDiscReplace ? (+pickupDiscountKr || 0) : 0).samtals : 0;
      const sendBordi = !sendS ? '' :
        '<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;font-size:12.5px;line-height:1.4">' +
          '<b>⚠ ' + esc(sale.num || 'Salan') + ' er þegar komin í Payday.</b> Upphæð hennar breytist ekki hér' +
          (t.takenCount < t.totalUnits ? ' (tæki sem fara ekki út: kredit er ákvörðun Agnars)' : '') + '. ' +
          (pickupExtras.length ? 'Viðbótin fer á nýja sölu — <b>rukkaðu aðeins ' + esc(fmtKr(rukkaNu)) + ' núna</b>.' : 'Ekkert á að rukka hér.') +
        '</div>';
      totals.innerHTML = sendBordi +
        '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-size:13px;font-variant-numeric:tabular-nums">' +
          (original ? '<div style="color:#64748b">Upphafleg upphæð:</div><div style="color:#64748b;text-align:right">' + esc(fmtKr(original)) + '</div>' : '') +
          '<div style="color:#475569">' + t.takenCount + ' tæki á ' + esc(fmtKr(t.perUnit)) + ' = </div>' +
          '<div style="color:#475569;text-align:right">' + esc(fmtKr(t.unitsTotal)) + '</div>' +
          (t.extrasTotal ? '<div style="color:#475569">+ Aukalega:</div><div style="color:#475569;text-align:right">' + esc(fmtKr(t.extrasTotal)) + '</div>' : '') +
          (t.origDisc
            ? '<div style="color:#b45309">− Afsláttur úr sölu' + (origPctClean ? ' (' + origPctClean + '%)' : '') + ':</div>' +
              '<div style="color:#b45309;text-align:right">−' + esc(fmtKr(t.origDisc)) + '</div>'
            : ''
          ) +
          (t.discountKr
            ? '<div style="color:#b45309;font-weight:600">− Afsláttur' + (t.discountPct ? ' (' + t.discountPct + '%)' : '') + ':</div>' +
              '<div style="color:#b45309;font-weight:600;text-align:right">−' + esc(fmtKr(t.discountKr)) + '</div>'
            : ''
          ) +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">SAMTALS:</div>' +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;text-align:right;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">' + esc(fmtKr(t.grand)) + '</div>' +
          (original && diff !== 0
            ? '<div style="color:' + (diff < 0 ? '#16a34a' : '#dc2626') + ';font-size:12px;font-weight:600">' +
                (diff < 0 ? '↓ Lægra um ' : '↑ Hærra um ') + esc(fmtKr(Math.abs(diff))) +
              '</div><div></div>'
            : ''
          ) +
        '</div>';
      // Live-update the small combined-discount hint next to the % / kr inputs
      const hintEl = dlg.querySelector('#_pkc-disc-hint');
      if (hintEl) {
        hintEl.textContent = t.discountKr
          ? '(samtals −' + fmtKr(t.discountKr) + ' afsláttur)'
          : (t.origDisc && !pickupDiscReplace ? 'úr sölunni · breyttu ef þarf' : '');
      }
    }

    // Expose a refresh function so openExtraDialog can re-render after
    // adding a new line. Cleaned up when modal closes.
    window._pkcRefresh = () => { renderBody(); renderTotals(); };

    renderBody();
    renderTotals();
    // 17.11.2026: vörulisti þjónustu (518) sóttur einu sinni svo rofinn viti hvaða þjónusta er til fyrir hvert tæki.
    try { const T = TS(); if (T && !T.listi()) T.saekja().then(() => { if (document.body.contains(dlg)) endurteikna(); }, () => {}); } catch (_) {}

    // Wire finalize
    dlg.querySelector('#_pkc-finalize').addEventListener('click', async () => {
      const t = calcTotals();
      // If sale was paid upfront, the payment selector isn't rendered —
      // reuse the existing greitt_med from the sale row instead.
      const paySelect = dlg.querySelector('#_pkc-pay');
      const payMethod = paySelect
        ? paySelect.value
        : ((sale && sale.greitt_med) || 'kort');
      // 2026-05-11: Capture edited customer info — user may have added kt
      // or changed name/phone since drop-off
      const customerInfo = {
        nafn: (dlg.querySelector('#_pkc-cust-nafn')?.value || '').trim(),
        kt: (dlg.querySelector('#_pkc-cust-kt')?.value || '').trim(),
        simi: (dlg.querySelector('#_pkc-cust-simi')?.value || '').trim()
      };
      const finalBtn = dlg.querySelector('#_pkc-finalize');
      finalBtn.disabled = true;
      finalBtn.textContent = 'Vista…';
      try {
        // 2026-05-24: Pass the pickup-time discount % and free-text note
        // captured in the modal. finalizePickup keeps line prices FULL and
        // stores draft-discount + pickup-discount combined in `afslattur`
        // (samtals = gross − afslattur); note is appended to the audit trail.
        // 26.10: ósnertir reitir spegla bara sölu-afsláttinn → senda 0 svo hann
        // leggist ekki ofan á sjálfan sig; breyttir reitir koma í hans stað.
        await finalizePickup(job, sale, unitState, pickupExtras, payMethod, t, customerInfo,
          pickupDiscReplace ? pickupDiscountPct : 0, pickupDiscReplace ? pickupDiscountKr : 0, pickupNote, pickupDiscReplace);
        // Reset extras + final-adjustments state for next pickup
        pickupExtras.length = 0;
        pickupDiscountPct = 0;
        pickupDiscountKr = 0;
        pickupDiscReplace = false;
        pickupNote = '';
        const saleNumForPrint = parentSaleNum(job.num);
        // 2026-06-23: capture the printable sale-note + checkbox BEFORE close()
        // resets the modal state; '' means "don't print a vegna line".
        const printVegna = pickupPrintNote ? String(pickupSaleNote || '').trim() : '';
        close();
        if (window.Toast && Toast.show) Toast.show('✓ Sótt og selt — ' + fmtKr(t.grand));
        // 2026-05-12 (#9): After pickup, offer to print the receipt. The sale
        // was just updated with final linur + paid_at, so we re-fetch and
        // hand it to SalaInvoice.renderFromSale (same template as Sala).
        setTimeout(() => offerReceiptPrint(saleNumForPrint, printVegna), 400);
      } catch (e) {
        finalBtn.disabled = false;
        finalBtn.textContent = '✓ Klára sölu og afhenda';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Add an extra (replacement) line to the pickup ──────────────────────
  // 2026-05-10 (B5 fix): Replaced native `prompt()` with a custom qty modal.
  // The native prompt blocked the entire browser thread (including the MCP /
  // automation tooling), and looked out of place against the rest of the app.
  function openExtraDialog() {
    if (!window.VorurPicker || typeof VorurPicker.open !== 'function') {
      alert('Vörulisti ekki tilbúinn — endurhladdu síðunni og prófaðu aftur.');
      return;
    }
    VorurPicker.open(p => askQty(p, qty => {
      if (!Number.isFinite(qty) || qty < 1) return;
      pickupExtras.push({
        name: p.nafn,
        qty,
        unit_price_ex_vat: +p.verd_an_vsk || 0,
        vsk_pct: +p.vsk_prosenta || 24
      });
      if (typeof window._pkcRefresh === 'function') window._pkcRefresh();
    }));
  }

  // Custom qty prompt — non-blocking, themed, keyboard-friendly.
  function askQty(product, onPicked) {
    const existing = document.getElementById('_pkc-qty-dialog');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_pkc-qty-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(420px,calc(100vw - 32px));overflow:hidden">' +
        '<div style="padding:13px 18px;background:linear-gradient(135deg,#0d6efd,#0a58ca);color:#fff">' +
          '<div style="font-size:11px;color:#bfdbfe;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Magn</div>' +
          '<div style="font-size:15px;font-weight:700;margin-top:2px">' + esc(product.nafn) + '</div>' +
        '</div>' +
        '<div style="padding:18px">' +
          '<input id="_pkc-qty-input" type="number" min="1" step="1" value="1" autofocus style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:18px;text-align:center;font-variant-numeric:tabular-nums;box-sizing:border-box">' +
          '<div style="font-size:11px;color:#64748b;margin-top:6px;text-align:center">Sláðu inn fjölda · Enter = staðfesta · Esc = hætta við</div>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_pkc-qty-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_pkc-qty-ok" type="button" style="padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#_pkc-qty-input');
    function close() { dlg.remove(); }
    function submit() {
      const v = parseInt(inp.value, 10);
      close();
      onPicked(v);
    }
    dlg.querySelector('#_pkc-qty-cancel').addEventListener('click', close);
    dlg.querySelector('#_pkc-qty-ok').addEventListener('click', submit);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }

  // Línur úr verkliðum (verk 2): parað við vorur á þjónustu + stærð/tegund.
  // Besta samsvörun þarf a.m.k. þjónustuorðið + eitt einkenni; annars 0-kr
  // lína með „⚠ verð vantar" — sýnileg, aldrei þögul.
  async function linurUrVerklidum(units) {
    const SB = getSB(); if (!SB || !units.length) return [];
    let vorur = [];
    try { const r = await SB.from('vorur').select('id,nafn,verd_an_vsk,vsk_prosenta').eq('virkt', true); vorur = r.data || []; } catch (_) {}
    const fold = s => String(s || '').toLowerCase();
    return units.map(s => {
      const u = s.unit || {};
      const service = fold(u.service);
      const tokens = fold((u.type || '') + ' ' + (u.size || '')).split(/[\s.]+/).filter(w => w.length > 1);
      let best = null, bestScore = 0;
      vorur.forEach(v => {
        const n = fold(v.nafn);
        let sc = 0;
        if (service && n.indexOf(service) !== -1) sc += 2;
        tokens.forEach(w => { if (n.indexOf(w) !== -1) sc++; });
        if (sc > bestScore) { bestScore = sc; best = v; }
      });
      if (best && bestScore >= 3) {
        return { desc: best.nafn, qty: 1, unit_price_ex_vat: +best.verd_an_vsk || 0, vsk_pct: +best.vsk_prosenta || 24, type: 'service', product_id: best.id };
      }
      return { desc: ((u.type || 'Tæki') + ' ' + (u.size || '') + ' — ' + (u.service || 'þjónusta')).replace(/\s+/g, ' ').trim() + ' ⚠ verð vantar', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24, type: 'service' };
    });
  }

  // ── Finalize: update solur, mark verkbeidnir collected, mark units done ─
  /* ── SEND SALA (17.11.2026, Verkefnalisti 60d00882 · Óðinn #33) ───────────────────────────────────────────────
   * Sala sem er KOMIN Í PAYDAY/DK (SaleEditor.erIPayday í 142 — ein heimild) er LÆST. Leið A hér að neðan breytti
   * línum og upphæðum hennar við afhendingu (viðbót eða tæki tekin af) en Payday-reikningurinn stóð óbreyttur — viðbótin
   * rukkaðist aldrei (R-000476/603/647/690, mælt 13.09). Reikningur er aldrei leiðréttur né kreditfærður sjálfkrafa:
   *   • línur, upphæðir, afsláttur, greiðsla og kúnni sendu sölunnar standa — aðeins athugasemd bætist við;
   *   • viðbót fer á NÝJA sölu (ekkert num → set_reikningur_num gefur nýtt R-númer), ósenda → Kröfuyfirlit, Agnar sendir;
   *   • tæki sem ekki fóru út eru skráð í athugasemd — kredit er ákvörðun Agnars (Kröfu-vinnugluggi), aldrei hér.
   * Sama regla og læsingin í 142-sale-editor (isLocked). Prófað í test/sott-send-sala.test.cjs. */
  // Heimildin er 142 (SaleEditor.erIPayday) — ekki endurreiknuð hér. null = óvíst (142 ekki hlaðinn): finalizePickup
  // stöðvar þá frekar en að breyta sölu sem gæti verið send; glugginn sýnir enga viðvörun.
  function erSendSala(sale) {
    if (!(sale && sale.id)) return false;
    const SE = window.SaleEditor;
    return SE && typeof SE.erIPayday === 'function' ? SE.erIPayday(sale) : null;
  }
  // Viðbótarlínur einar og sér: fullt verð á línu, afsláttur afhendingar (% + föst kr) á viðbótina eina — EKKI afsláttur
  // upprunasölunnar (hann tilheyrir sendum reikningi). Sama reikniregla og finalizePickup (vsk tekur afrúnunina).
  function vidbotarSala(extras, discountPct, discountKrManual) {
    const linur = (extras || []).map(ex => ({ desc: ex.name, qty: ex.qty, unit_price_ex_vat: ex.unit_price_ex_vat, vsk_pct: ex.vsk_pct, type: 'product' }));
    const ex = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
    const vsk = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 24) / 100), 0);
    const brutto = Math.round(ex + vsk);
    const pctKr = Math.round(brutto * Math.max(0, Math.min(100, +discountPct || 0)) / 100);
    const fastKr = Math.max(0, Math.min(brutto - pctKr, Math.round(+discountKrManual || 0)));
    const afslattur = pctKr + fastKr;
    const samtals = Math.max(0, brutto - afslattur);
    const factor = (ex + vsk) > 0 ? samtals / (ex + vsk) : 1;
    const anVsk = Math.round(ex * factor);
    return { linur, upphaed_an_vsk: anVsk, vsk_upphaed: samtals - anVsk, afslattur, samtals };
  }
  // Skrifar afhendingu á senda sölu: athugasemd á hana + (ef viðbót) ný sala. Skilar { vidbot: nýja salan | null }.
  async function vistaSendaSolu(SB, sale, o) {
    const sentNote = '\n⚠ Salan var þegar komin í Payday — línum og upphæð EKKI breytt við afhendingu' +
      (o.ekkiAfhent > 0 ? '; ' + o.ekkiAfhent + ' tæki fóru ekki út — kredit er ákvörðun Agnars (Kröfu-vinnugluggi)' : '') +
      ((o.extras || []).length ? '; viðbótin fór á nýja sölu' : '');
    const r = await SB.from('solur').update({ athugasemdir: (sale.athugasemdir || '') + (o.ktAuditNote || '') + o.auditNote + sentNote }).eq('id', sale.id);
    if (r && r.error) throw r.error;
    if (!(o.extras || []).length) return { vidbot: null };
    const v = vidbotarSala(o.extras, o.discountPct, o.discountKrManual);
    const greittNu = ['kort', 'reidufe', 'pening'].includes(String(o.payMethod || ''));
    const nySala = {
      starfsmadur: 'Verkstæði',
      source: 'sott',
      customer_nafn: sale.customer_nafn || '',
      customer_id: sale.customer_id || null,
      linur: v.linur,
      upphaed_an_vsk: v.upphaed_an_vsk,
      vsk_upphaed: v.vsk_upphaed,
      afslattur: v.afslattur,
      samtals: v.samtals,
      greitt_med: greittNu ? o.payMethod : 'reikningur',
      paid_at: greittNu ? new Date().toISOString() : null,
      athugasemdir: 'Viðbót við afhendingu á ' + (sale.num || 'sölu ' + sale.id) + ' (sú sala var þegar komin í Payday)' + o.auditNote,
      status: 'final'
    };
    if (sale.customer_kt || o.customerKt) nySala.customer_kt = sale.customer_kt || o.customerKt;
    if (sale.customer_base_id) nySala.customer_base_id = sale.customer_base_id;
    let ri = await SB.from('solur').insert(nySala).select().single();
    if (ri && ri.error && /status/i.test(ri.error.message || '')) {
      const { status, ...rest } = nySala;
      ri = await SB.from('solur').insert(rest).select().single();
    }
    if (ri && ri.error) throw ri.error;
    return { vidbot: (ri && ri.data) || null };
  }
  /* ── /SEND SALA ── */

  async function finalizePickup(job, sale, unitState, extras, payMethod, totals, customerInfo, discountPct, discountKrManual, userNote, replaceOrigDisc) {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging');
    // 2026-08-20: prepaid = greitt fyrirfram (í lockstep við isAlreadyPaid, línu 156).
    // paid_at sett ⟺ greitt (kort/reiðufé/pening/posi/millifærsla); reikningur/greitt_sidar
    // eru null → falla í gegn og krefjast uppgjörs eins og áður. Sala sem er ÞEGAR greidd
    // þarf ENGIN uppgjör við afhendingu — peningurinn er inn. Áður kastaði vörnin því
    // payMethod kom þá úr sale.greitt_med ('Kort', hástafað) og féll á lágstafa-hvítlistanum.
    const prepaid = !!(sale && sale.paid_at);
    // Gátt á VERKLOK (2026-08-14, ekki á vistun): tæki fer ekki út með
    // óútkljáð uppgjör — „greitt síðar" leysist hér í kort/reikning/reiðufé. Prepaid sleppur.
    if (!prepaid && (payMethod === 'greitt_sidar' || !['kort', 'reidufe', 'pening', 'reikningur'].includes(String(payMethod || '')))) {
      throw new Error('Uppgjör vantar: veldu Kort, Reikning eða Reiðufé — „greitt síðar" er ekki uppgjör við afhendingu.');
    }

    // Phase B (2026-05-09): Replace linur to reflect what was ACTUALLY
    // delivered. Original linur are scaled proportionally by takenCount /
    // totalUnits (handles the common case of "12 hleðslur kom inn, 4 ónýt,
    // 8 afhent → qty 12 → 8"). Lines whose qty rounds to 0 are dropped.
    // Extras added at pickup are appended as new lines. Totals are
    // recomputed from the new linur (not proportional from old samtals).
    // Status flips drög → final.

    // Build the final linur (the actual delivered lines).
    //
    // Two paths:
    //   A) sale exists (POS sold upfront, or patch 122 created a draft solur)
    //      → scale existing linur proportionally by takenCount / totalUnits,
    //        append extras, recompute totals, UPDATE the row.
    //   B) sale missing (no upfront sale, no draft → "Sækja inn" before this
    //      fix shipped, or solur insert failed for any reason)
    //      → INSERT a new solur row with extras only as the line items, since
    //        we have no source price data. Totals come from extras.
    const totalUnits = unitState.length;
    const takenCount = unitState.filter(s => s.checked).length;
    const unchecked = totalUnits - takenCount;

    // 2026-05-15: FIXED — was scaling each line by (taken/total) ratio,
    // which silently rounds back to the original when each cart line has
    // qty=1 (5 lines × 0.8 ratio → round(0.8)=1 → no reduction). For KAT
    // this meant the printed receipt still showed 50.000 kr after the user
    // unchecked a broken unit. Now we directly subtract `unchecked` items
    // from the line pool, starting with the largest-qty line so single-qty
    // lines drop out cleanly when broken.
    const oldLinur = (sale && Array.isArray(sale.linur)) ? sale.linur : [];
    // 17.11.2026: tækið sem fer ekki út dregur SÍNA línu frá, og þjónusta þess í viðbótinni (verklidur.parts) dettur af.
    // Sama fall og calcTotals notar (forskoðun = vistun); gamla reglan (magnmesta línan fyrst) er varaleiðin í fallinu.
    const allarVidbaetur = extras || [];
    extras = vidbotAfhent(allarVidbaetur, unitState);
    const newLinur = linurAnOafhentra(oldLinur, unitState, allarVidbaetur).filter(l => l.qty > 0);

    // Verk 2 (2026-08-14): ENGIN sala og engar upprunalínur → línurnar koma
    // ÚR VERKLIÐUNUM — tæki fer aldrei út án sölu. Verðið finnst í vorur
    // (þjónusta + stærð/tegund); finnist það ekki fer línan inn með 0 kr og
    // „⚠ verð vantar" svo hún sé sýnileg og leiðréttanleg í Sale editor —
    // aldrei ósýnileg afhending.
    if ((!sale || !sale.id) && newLinur.length === 0 && takenCount > 0) {
      const seeded = await linurUrVerklidum(unitState.filter(s => s.checked).map(s => s.nafn != null ? { ...s, unit: { ...s.unit, service: s.nafn } } : s));
      seeded.forEach(l => newLinur.push(l));
    }

    extras.forEach(ex => {
      newLinur.push({
        desc: ex.name,
        qty: ex.qty,
        unit_price_ex_vat: ex.unit_price_ex_vat,
        vsk_pct: ex.vsk_pct,
        type: 'product'
      });
    });

    // 2026-07-08 (afsláttar-úttekt): honour per-line discount_pct (the Sale-
    // Editor convention — FULL prices + pct on the line) by baking it into
    // the price, 165-style. Before, pickup recomputed at FULL price while the
    // receipt printed the discount → charged ≠ receipt (R-000461: card was
    // charged 13.610 kr, receipt said 11.569 kr).
    newLinur.forEach(l => {
      const d = Math.max(0, Math.min(100, +l.discount_pct || 0));
      if (!d) return;
      l.unit_price_ex_vat = Math.round((+l.unit_price_ex_vat || 0) * (1 - d / 100));
      l.desc = String(l.desc || '') + ' · −' + d + '% afsl.';
      delete l.discount_pct;
    });

    // 2026-07-08 (afsláttar-úttekt): discounts are NOT baked into the line
    // prices anymore. Lines keep FULL unit prices (the POS convention) and the
    // whole discount lives in `afslattur` (kr m. vsk) with samtals = gross −
    // afslattur — exactly how pos.js saves sales, and what SalaInvoice / the
    // 233 PDF (case C) expect. The old code scaled the lines AND stored
    // afslattur, so every re-print subtracted the discount a SECOND time.
    // Two components:
    //   • origAfsl — the draft's existing POS discount (previously silently
    //     dropped, so "greitt síðar" drafts lost their discount at pickup)
    //   • pickup % — entered in this modal, applied on the remainder
    const discPct = Math.max(0, Math.min(100, +discountPct || 0));
    const preEx = newLinur.reduce(
      (a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
    const preVsk = newLinur.reduce(
      (a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 24) / 100), 0);
    const preSamtals = preEx + preVsk;
    // 26.10.2026: replaceOrigDisc = starfsmaður breytti afsláttarreitunum í glugganum →
    // sölu-afslátturinn fellur niður og nýi kemur í hans stað (sama og calcTotals).
    const saleAfsl = afslSolu(sale, preSamtals);
    const origAfsl = replaceOrigDisc ? 0 : saleAfsl;
    const remainderAfterOrig = Math.round(preSamtals) - origAfsl;
    const pctKr = Math.round(remainderAfterOrig * discPct / 100);
    // 2026-08-10 (ósk Agnars): manual fixed-kr discount, stacks on top of the
    // % one — clamped so the two together never exceed what's left to
    // discount (mirrors calcTotals' preview so charged === previewed).
    const manualKr = Math.max(0, Math.min(remainderAfterOrig - pctKr, Math.round(+discountKrManual || 0)));
    const pickupKr = pctKr + manualKr;
    const afslatturKr = origAfsl + pickupKr;
    const newSamtals = Math.max(0, Math.round(preSamtals) - afslatturKr);
    // ex/vsk scaled proportionally (same as pos.js totals()); vsk takes the
    // rounding remainder so upphaed_an_vsk + vsk_upphaed === samtals exactly.
    const factor = preSamtals > 0 ? newSamtals / preSamtals : 1;
    const newEx = Math.round(preEx * factor);
    const newVsk = newSamtals - newEx;

    const brokenList = unitState.filter(s => !s.checked).map(s => s.unit.serial).filter(Boolean);
    const extraList = extras.map(ex => ex.qty + '× ' + ex.name);
    const thjBreytt = unitState.filter(s => s.checked && s.nafn != null).map(s => (s.unit.serial || 'tæki') + ': ' + (s.unit.service || '—') + ' → ' + s.nafn);
    const trimmedNote = (userNote || '').trim();
    // 2026-08-10: describe whichever of %/fast kr (or both) actually applied.
    const pickupDiscParts = [];
    if (discPct) pickupDiscParts.push(discPct + '%');
    if (manualKr) pickupDiscParts.push(fmtKr(manualKr) + ' fast');
    const auditNote = '\n\n[Sótt ' + todayISO() + ']' +
      (brokenList.length ? '\nEkki afhent: ' + brokenList.join(', ') : '') +
      (extraList.length ? '\nViðbót: ' + extraList.join(', ') : '') +
      (thjBreytt.length ? '\nÞjónustu breytt við afhendingu: ' + thjBreytt.join(', ') : '') +
      (origAfsl ? '\nAfsláttur úr sölu: −' + origAfsl + ' kr' : '') +
      (pickupKr ? '\nAfsláttur við afhendingu: ' + pickupDiscParts.join(' + ') + ' (−' + pickupKr + ' kr)' : '') +
      (replaceOrigDisc && saleAfsl && !pickupKr ? '\nAfsláttur úr sölu felldur niður (var −' + saleAfsl + ' kr)' : '') +
      (replaceOrigDisc && saleAfsl && pickupKr ? ' — kom í stað −' + saleAfsl + ' kr úr sölu' : '') +
      (trimmedNote ? '\nAthugasemd: ' + trimmedNote : '') +
      '\nGreiðsla: ' + payMethod;

    // 2026-05-11: Customer info captured from the pickup modal — may have
    // been edited (e.g. walk-in adds kt at pickup, name corrected). Look up
    // by kt to link customer_id if present, otherwise just store the nafn.
    let customerIdToSave = sale && sale.customer_id;
    let customerNafnToSave = sale ? sale.customer_nafn : (job.customer || '');
    let customerKtToSave = null;   // 2026-08-20: raunveruleg kt sem á að VISTA í dálkinn
    if (customerInfo && customerInfo.nafn) customerNafnToSave = customerInfo.nafn;
    if (customerInfo && customerInfo.kt) {
      const cleanKt = customerInfo.kt.replace(/[^0-9]/g, '');
      if (cleanKt.length === 10 && cleanKt !== '9999999999') {
        // 2026-08-20 (Agnar — „kennitala … it prints 999999-9999"): innslegin kt var
        // AÐEINS notuð til að fletta upp customer_id + sem „Kt:"-nótu — aldrei vistuð
        // í customer_kt-dálkinn, svo walk-in 999999-9999 stóð eftir á reikningnum.
        // Vista hana núna á bandstriks-formi (öll niðurstreymis-lög lesa customer_kt).
        customerKtToSave = cleanKt.replace(/(\d{6})(\d{4})/, '$1-$2');
        try {
          const fy = await SB.from('fyrirtaeki').select('id,nafn').eq('kennitala', cleanKt).maybeSingle();
          if (fy.data) { customerIdToSave = fy.data.id; if (!customerInfo.nafn) customerNafnToSave = fy.data.nafn; }
          else {
            const vk = await SB.from('vidskiptavinir').select('id,nafn').eq('kennitala', cleanKt).maybeSingle();
            if (vk.data) { customerIdToSave = vk.data.id; if (!customerInfo.nafn) customerNafnToSave = vk.data.nafn; }
          }
        } catch (_) {}
      }
    }
    const ktAuditNote = (customerInfo && customerInfo.kt && customerInfo.kt.replace(/[^0-9]/g,'') !== '9999999999')
      ? '\nKt: ' + customerInfo.kt
      : '';
    const sendSala = erSendSala(sale);
    if (sendSala === null) throw new Error('Söluritillinn er ekki hlaðinn, svo ekki sést hvort salan er komin í Payday — endurhlaðið síðuna og reynið aftur.');
    if (sendSala) {
      // Send sala (17.11.2026): línur og upphæðir standa; viðbót á nýja sölu — sjá SEND SALA ofar.
      await vistaSendaSolu(SB, sale, { extras, payMethod, discountPct: discPct, discountKrManual, auditNote, ktAuditNote, ekkiAfhent: unchecked, customerKt: customerKtToSave });
    } else if (sale && sale.id) {
      // Path A: update the existing draft sale → final.
      const updates = {
        status: 'final',
        linur: newLinur,
        upphaed_an_vsk: Math.round(newEx),
        vsk_upphaed: Math.round(newVsk),
        // 2026-05-24: Record pickup-time discount kr; 0 if none was set.
        afslattur: afslatturKr,
        samtals: Math.round(newSamtals),
        greitt_med: prepaid ? sale.greitt_med : payMethod,
        paid_at: prepaid ? sale.paid_at : (payMethod === 'reikningur' ? null : new Date().toISOString()),   // prepaid: haltu upprunalegu greiðslu; annars kort/reiðufé stimpla ALLTAF paid_at (verk 3)
        customer_nafn: customerNafnToSave,
        customer_id: customerIdToSave,
        athugasemdir: (sale.athugasemdir || '') + ktAuditNote + auditNote
      };
      if (customerKtToSave) updates.customer_kt = customerKtToSave;   // 2026-08-20: vista innslegna kt
      let r = await SB.from('solur').update(updates).eq('id', sale.id);
      if (r.error && /status/i.test(r.error.message || '')) {
        // status column missing — retry without status
        const { status, ...rest } = updates;
        r = await SB.from('solur').update(rest).eq('id', sale.id);
      }
      if (r.error) throw r.error;
    } else if (newLinur.length === 0) {
      // 2026-07-13: Path B með ENGAR línur → stofna ALDREI tóma 0-sölu.
      // Rót R-000528-villunnar: pickup fann ekki þegar-existandi (final) sölu
      // → fór í Path B, og með engar upprunalínur + engar extras bjó það til
      // NÝJA sölu með sama R-númeri, engum línum og 0 kr → „reikningur fór í 0".
      // Ekkert afhent + engin uppspretta = engin sala. (Verkbeiðni-staða +
      // tækja-uppfærslur halda áfram fyrir neðan.)
      console.warn('[Sótt] Slepp tómri sölu-stofnun (engar línur, engin uppspretta) — job', job && job.num);
    } else {
      // 2026-05-10 (B1 fix) Path B: no sale exists yet. INSERT a new solur
      // row right now so the transaction has accounting visibility. Common
      // case: "Sækja inn úr fyrirtæki" verkbeiðnir from before patch 122
      // started creating draft solur, OR if that draft insert failed.
      const newSale = {
        num: parentSaleNum(job.num),
        starfsmadur: 'Verkstæði',
        source: 'sott',   // reikningur úr Sótt/afhendingu (verkstæðis-þjónusta)
        customer_nafn: job.customer || '',
        customer_id: null,
        linur: newLinur,
        upphaed_an_vsk: Math.round(newEx),
        vsk_upphaed: Math.round(newVsk),
        afslattur: afslatturKr,
        samtals: Math.round(newSamtals),
        greitt_med: payMethod,
        paid_at: payMethod === 'reikningur' ? null : new Date().toISOString(),   // kort/reiðufé stimpla ALLTAF paid_at (verk 3)
        athugasemdir: 'Stofnað við Sótt ✓ úr verkstæðis-afhendingu' + auditNote,
        status: 'final'
      };
      if (customerKtToSave) newSale.customer_kt = customerKtToSave;   // 2026-08-20: vista innslegna kt
      let r = await SB.from('solur').insert(newSale).select().single();
      if (r.error && /status/i.test(r.error.message || '')) {
        const { status, ...rest } = newSale;
        r = await SB.from('solur').insert(rest).select().single();
      }
      if (r.error) throw r.error;
    }

    // 2. Mark all jobs in the sale as collected, and units as done/broken
    // 2026-09-17: catch-in hér að neðan voru tóm OG .error aldrei lesið (supabase-js
    // kastar ekki). Verkbeiðni gat því setið áfram á 'received' og tæki á 'á verkstæði'
    // þótt kúnninn væri farinn með tækið og salan rukkuð — staðbundna skyndiminnið í
    // skrefi 3 faldi ósannindin þar til næst var hlaðið. Salan sjálf er þegar vistuð
    // (kastað ofar), svo hér er EKKI kastað: hvert misheppnað skrif er talið, skráð og
    // sagt hreint frá í lokin.
    const _ekkiUppfaert = [];
    const _mistokstJob = new Set();
    const _skraVillu = (lykill, hvad, villa) => {
      _ekkiUppfaert.push(hvad);
      try { if (window.logProblem) window.logProblem(lykill, hvad + ': ' + ((villa && villa.message) || villa)); } catch (_) {}
      console.warn('[Sótt] ' + hvad, villa);
    };
    const allJobs = jobsForSaleNum(parentSaleNum(job.num));
    for (const j of allJobs) {
      try {
        const rj = await SB.from('verkbeidnir').update({ status: 'collected', pickup: todayISO() }).eq('id', j.id);
        if (rj && rj.error) throw rj.error;
      } catch (e) {
        _mistokstJob.add(j.id);
        _skraVillu('sott-verkbeidni', 'verkbeiðni ' + (j.num || j.id) + ' var EKKI merkt sótt', e);
      }
    }
    // 2026-05-11 fix: If user UNCHECKED a unit in the pickup modal it means
    // "not delivered" — so its verklidur should be marked 'broken'. Previously
    // we only set 'broken' if DB ALREADY had it as 'broken', which meant
    // unchecking in the modal had ZERO effect on stored status (samtals didn't
    // reduce either because price-scaling relies on this state).
    for (const s of unitState) {
      const newStatus = s.checked ? 'done' : 'broken';
      // 17.11.2026: þjónustan sem valin var í afhendingunni fylgir tækinu — og verð hennar í parts, hafi það búið þar.
      const upd = { status: newStatus };
      if (s.checked && s.nafn != null) {
        upd.service = s.nafn;
        const ex = allarVidbaetur.find(x => x && x._thj && x._unitId === s.unit.id);
        const pi = (ex && Array.isArray(s.unit.parts)) ? s.unit.parts.findIndex(p => erThjTaekis(p, s.unit)) : -1;
        if (pi >= 0) {
          upd.parts = s.unit.parts.slice();
          upd.parts[pi] = { ...upd.parts[pi], nafn: ex.name, verd_an_vsk: ex.unit_price_ex_vat, vsk_prosenta: ex.vsk_pct, vara_id: ex._varaId != null ? ex._varaId : upd.parts[pi].vara_id };
        }
      }
      try {
        const rv = await SB.from('verklidur').update(upd).eq('id', s.unit.id);
        if (rv && rv.error) throw rv.error;
        if (upd.service) { s.unit.service = upd.service; if (upd.parts) s.unit.parts = upd.parts; }   // tækjasagan (466) les þetta
      } catch (e) {
        _skraVillu('sott-verklidur', 'verkliður ' + (s.unit.serial || s.unit.id) + ' var EKKI merktur ' + newStatus, e);
      }
    }
    // 2026-10-14 (466): tækjasaga — ein röð per afhentan verklið í taeki_saga (skodad/hladid/thjonustad) svo Afköst
    // telji úr raunverulegum atburðum. Fire-and-forget: ekkert await, bilun stöðvar aldrei söluna (466 skráir sjálft).
    try { if (window.TaekiSaga && TaekiSaga.skraSott) TaekiSaga.skraSott(allJobs, unitState, { sala: parentSaleNum(job.num) }); } catch (_) {}

    // 2b. (2026-05-10) For verklidur with a uttaeki_id link (created by
    // patch 122's "Sækja inn" flow), auto-update the uttaeki row:
    //   • not broken + customer took it → next_insp = today + 12 mán,
    //     last_insp = today, status = 'active'
    //   • broken → uttaeki.status = 'broken' (replaced; stays out of
    //     normal scheduling until manually returned to service)
    // This eliminates the manual 12-month rescheduling step.
    const today = todayISO();
    const next12mo = (() => {
      const d = new Date(); d.setMonth(d.getMonth() + 12);
      return d.toISOString().slice(0, 10);
    })();
    for (const s of unitState) {
      const uid = s.unit && s.unit.uttaeki_id;
      if (!uid) continue;
      try {
        if (s.unit.status === 'broken') {
          const rb = await SB.from('uttaeki').update({ status: 'broken' }).eq('id', uid);
          if (rb && rb.error) throw rb.error;
        } else if (s.checked) {
          const ru = await SB.from('uttaeki').update({
            status: 'active',
            last_insp: today,
            next_insp: next12mo
          }).eq('id', uid);
          // 2026-09-17: mistækist þetta þegjandi datt tækið út úr 12-mánaða
          // endurskoðunarröðinni (next_insp óbreytt) — það hefði komið í ljós ári síðar.
          if (ru && ru.error) throw ru.error;
          // 11.09.2026 (Verkefnalisti e8caa730): afhending í Sótt tekur tækið
          // líka af afgreiðsluborðinu — sömu reitir og Móttaka (179) og
          // vertíðarlokun (210) skrifa. Aðeins tæki sem standa á borðinu eru
          // snert, og villa er skráð en stöðvar ekki afhendinguna.
          const af = await SB.from('uttaeki')
            .update({ custody_status: 'afhent', picked_up_at: today })
            .eq('id', uid)
            .in('custody_status', ['móttekið', 'á verkstæði', 'tilbúið']);
          if (af && af.error && window.logProblem) {
            window.logProblem('sott-afhent', 'uttaeki ' + uid + ': ' + (af.error.message || af.error));
          }
        }
        // s.checked === false (customer didn't take it back) → leave uttaeki
        // alone; the field-service record stays as-is.
      } catch (e) {
        _skraVillu('sott-uttaeki', 'tæki ' + uid + ' var EKKI uppfært (staða/síðasta+næsta skoðun)', e);
      }
    }

    // 2026-09-17: segja frá því sem vantaði. Salan er vistuð og rukkuð — en staðan á
    // borðinu/tækinu er röng þar til þetta er lagað, og áður sá starfsmaðurinn ekkert
    // nema „✓ Sótt og selt".
    if (_ekkiUppfaert.length) {
      alert('⚠ Salan vistaðist, EN ' + _ekkiUppfaert.length + ' staða uppfærðist ekki:\n\n• '
        + _ekkiUppfaert.join('\n• ')
        + '\n\nLagaðu stöðuna handvirkt á Verkstæði/borðinu. Ekki endurtaka „Sótt" — salan er þegar vistuð.');
    }

    // 3. Update local cache
    if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
      for (const j of allJobs) {
        // 2026-09-17: ekki merkja í skyndiminni það sem þjónninn hafnaði — annars sýndi
        // borðið „sótt" þangað til næsta hleðsla skilaði hinu rétta.
        if (_mistokstJob.has(j.id)) continue;
        const cached = DB.cache.jobs.find(x => x.id === j.id);
        if (cached) cached.status = 'collected';
      }
    }

    // 4. Trigger UI refresh
    if (window.App && typeof App.refreshAll === 'function') App.refreshAll();
    if (window.Counter && typeof Counter.render === 'function') Counter.render();
    if (window.DB && typeof DB.loadAll === 'function') DB.loadAll();
  }

  // ── 2026-05-12 (#9): Receipt print prompt after pickup ──────────────────
  // Shows a small dialog with "🖨 Prenta kvittun" + "Sleppa" so the user can
  // hand the customer a receipt right after the Sótt-flow completes.
  async function offerReceiptPrint(saleNum, vegnaText) {
    const SB = getSB();
    if (!SB || !saleNum) return;
    let sale = null;
    try {
      const r = await SB.from('solur').select('*').eq('num', saleNum).maybeSingle();
      sale = r.data;
    } catch (_) {}
    if (!sale) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') return;

    document.getElementById('_pkc-print-prompt')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_pkc-print-prompt';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:22px 26px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.3);">' +
        '<h2 style="margin:0 0 6px;font-size:17px;color:#0f172a;">✓ Sótt og selt</h2>' +
        '<div style="font-size:13px;color:#64748b;margin-bottom:16px;">Salnúmer ' + esc(saleNum) + ' · ' + fmtKr(sale.samtals || 0) + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_pkc-print-skip" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Sleppa</button>' +
          '<button id="_pkc-print-go" type="button" style="padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">🖨 Prenta kvittun</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    function closePrompt() { dlg.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closePrompt(); }
      if (e.key === 'Enter')  { e.preventDefault(); doPrint(); }
    }
    document.addEventListener('keydown', onKey);
    dlg.querySelector('#_pkc-print-skip').addEventListener('click', closePrompt);
    dlg.addEventListener('click', e => { if (e.target === dlg) closePrompt(); });
    async function doPrint() {
      const win = window.open('', '_blank', 'width=900,height=1100');
      if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta kvittun.'); return; }
      let cust = null;
      if (sale.customer_id) {
        try {
          const c = await SB.from('vidskiptavinir').select('*').eq('id', sale.customer_id).maybeSingle();
          if (c.data) cust = c.data;
          else {
            const f = await SB.from('fyrirtaeki').select('*').eq('id', sale.customer_id).maybeSingle();
            if (f.data) cust = f.data;
          }
        } catch (_) {}
      }
      // 2026-06-23: print the operator's sale-note (vegnaText) verbatim under
      // the customer block when "Athugasemd á reikning" was left checked. Clear
      // the sale's athugasemd for printing so audit tokens / the auto-vegna
      // don't also appear (vegnaText='' → no note line at all).
      const printSale = Object.assign({}, sale, { athugasemdir: '' });
      try { SalaInvoice.renderFromSale(win, printSale, cust, { vegnaRaw: vegnaText || '' }); }
      catch (e) { alert('Villa: ' + (e.message || e)); }
      closePrompt();
    }
    dlg.querySelector('#_pkc-print-go').addEventListener('click', doPrint);
    // Auto-focus the print button — Enter prints, Escape skips
    setTimeout(() => dlg.querySelector('#_pkc-print-go')?.focus(), 30);
  }

  // ── Hook Counter.markCollected ──────────────────────────────────────────
  function installHook() {
    if (!window.Counter || typeof Counter.markCollected !== 'function') {
      setTimeout(installHook, 500);
      return;
    }
    if (Counter.markCollected.__pkcHooked) return;
    const orig = Counter.markCollected.bind(Counter);
    Counter.markCollected = async function(id) {
      // Allow bypass for the rare case where someone wants the old flow
      if (Counter[SAFE_GUARD_KEY]) {
        Counter[SAFE_GUARD_KEY] = false;
        return orig(id);
      }
      openPickupModal(id);
    };
    Counter.markCollected.__pkcHooked = true;
    console.log('[pickup-checkout] Counter.markCollected wrapped');
  }
  installHook();

  // Public API
  window.PickupCheckout = {
    open: openPickupModal,
    _sendSala: { erSendSala, vidbotarSala, finalizePickup },   // fyrir próf/greiningu (17.11.2026)
    _thj: { linurAnOafhentra, vidbotAfhent, erThjTaekis }       // rofinn Yfirferð | Hleðsla | Ónýtt (17.11.2026)
  };

  console.log('[pickup-checkout] installed — Sótt ✓ opnar pickup modal');
})();
/* === END PICKUP CHECKOUT FLOW v1 === */
