/* === VISIT WORKFLOW v1 ===
 *
 * "Klára heimsókn" / "End-of-visit" workflow on the company-detail page.
 *
 * After the technician has ticked Áætlað (Hleðsla/Yfirferð/Sleppa) on each
 * unit, this patch lets them finish the visit with one click:
 *
 *   1. Show a confirmation summary (totals, # serviced units, drive cost).
 *   2. On confirm:
 *      • Update each serviced unit's last_insp + next_insp (today + 12 mo).
 *      • Insert a sale row in `solur` capturing the line items.
 *      • Open the invoice for printing (SalaInvoice.renderFromSale).
 *      • Clear the local trip state so the next visit starts blank.
 *      • Reload the company detail to show fresh next-inspection dates.
 *
 * Reuses patch 129's pricing engine (window.recomputeCompanyTotalCost) and
 * patch 131's per-unit choices (window.UnitServicePicker).
 */
(() => {
  if (window.__visitWorkflowInstalled) return;
  window.__visitWorkflowInstalled = true;

  const CHOICE_KEY = 'slokk_trip_';

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // 2026-06: stable data-co-id first (see patch 129).
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') || main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }
  function getCompanyName() {
    // 1. Preferred: read from Companies.list (same source patch 129 uses)
    if (window.Companies && Array.isArray(Companies.list)) {
      const id = getCompanyId();
      const c = id ? Companies.list.find(x => x.id === id) : null;
      if (c && c.nafn) return c.nafn;
    }
    // 2. Fallback: DOM heading scan with broader selectors
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const heading = main.querySelector('h1, h2, .company-name, [style*="font-size:21px"], [style*="font-size: 21px"], [style*="font-size:22px"], [style*="font-size: 22px"]');
    if (heading) {
      const t = heading.textContent.trim();
      if (t) return t;
    }
    return null;
  }
  // DB fallback when we have an id but no name in memory.
  async function fetchCompanyName(coId) {
    if (!coId) return null;
    const sb = window.DB && window.DB.sb;
    if (!sb) return null;
    try {
      const r = await sb.from('fyrirtaeki').select('nafn').eq('id', coId).maybeSingle();
      return r && r.data ? r.data.nafn : null;
    } catch (_) { return null; }
  }
  function loadTrip(coId) {
    try { return JSON.parse(localStorage.getItem(CHOICE_KEY + coId) || '{}'); }
    catch (_) { return {}; }
  }
  // 2026-08-30: 165 hafði engan skrif-hjálpara — aðeins clearTrip skrifaði, og
  // hún skrifaði AÐEINS tóman búk. Frágangur heimsóknar þarf að geta MERKT
  // ferðina kláraða án þess að henda henni (sjá skref 3 í completeVisit).
  // 227 speglar hvert setItem í skýið, svo þetta berst milli véla af sjálfu sér.
  function saveTrip(coId, st) {
    try { localStorage.setItem(CHOICE_KEY + coId, JSON.stringify(st || {})); }
    catch (_) {}
  }
  // 2026-07-29 (Agnar: „finnst ársskoðunar svæðið mjög óöruggt"): frágangur
  // heimsóknar hreinsaði ALLT trip-state-ið — líka reitina sem starfsmaðurinn
  // hafði slegið inn (Skoðunaraðili, Framkvæmd, Dags., athugasemdir, texti á
  // reikning). Patch 227 breytti removeItem í ský-legstein, svo textinn hvarf
  // á ÖLLUM tækjum og varð ekki endurheimtur. Það er tapaður innsláttur, ekki
  // bara óþægindi.
  //
  // Nú er hreinsunin markviss: TÆKJAVALIÐ (units/afsláttarlínur/aukalínur) á að
  // núllast — heimsóknin er búin — en RITAÐIR REITIR lifa áfram. Þeir eru
  // hvort eð er réttir fyrir næstu heimsókn (sami skoðunaraðili, sami mánuður)
  // og starfsmaðurinn breytir þeim frekar en að slá þá inn upp á nýtt.
  const KEEP_FIELDS = ['skodunaradili', 'skodun_manudur', 'skodun_ym', 'skodun_dagsetning',
                       'athugasemdir_skyrsla', 'athugasemdir', 'invoice_text'];
  // 2026-08-17 (CRITICAL, staðfest í agent-villuleit): keep-skrifið eitt og sér
  // hreinsaði skýið ALDREI — deepMerge (85 + server) EYÐIR ekki lyklum, svo
  // units/extras/notes/lás/hök gömlu heimsóknarinnar sátu áfram í skýinu með
  // fersku _ts og gengu aftur á hinum vélunum (draugur 2026-07-08 endurvakinn:
  // næsta heimsókn rukkaði gömlu línurnar). Búk-lyklarnir fá því EXPLICIT null
  // (client-deepMerge skrifar null í gegn = eyðing í reynd) og lás/hök fá
  // false/[] svo applyCloud-speglunin (227) taki lásinn og hökin af öllum vélum.
  const CLEAR_BODY = {
    units: null, extras: null, notes: null, computed: null, discount_pct: null,
    drive: null, driveQty: null, skyrslugerd: null, line_disc: null, line_price: null,
    _locked: false, _doneIds: []
  };
  function clearTrip(coId) {
    try {
      let keep = {};
      try {
        const st = JSON.parse(localStorage.getItem(CHOICE_KEY + coId) || '{}') || {};
        KEEP_FIELDS.forEach(k => { if (st[k] !== undefined && st[k] !== null && st[k] !== '') keep[k] = st[k]; });
      } catch (_) { keep = {}; }
      // Alltaf setItem með keep + tæmdum búk — removeItem-legsteinninn dugði
      // ekki: keep-skrif á eftir honum (eða computed-skrif 129) af-legsteinaði
      // hann og skýja-mergið hélt gamla búknum. Tæming með null-um er
      // idempotent og virkar eins á allar vélar.
      localStorage.setItem(CHOICE_KEY + coId, JSON.stringify(Object.assign({}, CLEAR_BODY, keep)));
    } catch (_) {
      try { localStorage.removeItem(CHOICE_KEY + coId); } catch (__) {}
    }
  }
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  // YYYY-MM-DD → DD.MM.YYYY for the printed "Vegna heimsókn" reference line.
  function isoToDDMM(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso || '');
  }
  function addMonthsIso(iso, months) {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }
  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }
  // 2026-06-09: build the renderFromSale reference + date options from the
  // custom inspection date (patch 129's SlokkVisitDate). When a month is set
  // the left-side reference reads "Framkvæmd í Maí 2026" and the right-side
  // "Dagsetning:" uses the exact typed date; otherwise we keep the legacy
  // "Vegna heimsókn DD.MM.YYYY" line and today's date.
  function visitInvoiceOpts(vd, today) {
    const o = {
      // The "🧾 Texti á reikning" free-text line wins when set, else the
      // Framkvæmd-í-… phrase, else a default.
      vegnaRaw: (vd && vd.invoice_text) ? vd.invoice_text
        : (vd && vd.phrase) ? vd.phrase
        : 'Vegna heimsókn ' + isoToDDMM(today)
    };
    if (vd && vd.dags) o.dateStr = vd.dags;
    return o;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Canonical invoice totals computed straight from the line items — the SAME
  // math SalaInvoice uses to PRINT the bill (subEx = Σ qty·einingaverð,
  // vsk = Σ línu·vsk%, samtals = subEx + vsk). Storing these on the sale keeps
  // the saved totals identical to the printed/PDF invoice.
  //
  // Replaces the old DOM-scrape (readTotalsFromSection) that read patch 129's
  // summary block: in a since-replaced layout it captured the VSK figure as the
  // grand total, so heimsóknir were saved with vsk_upphaed=0 and
  // samtals = án-vsk × 0,24 (the VAT amount) instead of án-vsk + vsk.
  function totalsFromLinur(linur, discountPct) {
    let subEx = 0, vsk = 0;
    (linur || []).forEach(l => {
      const qty  = Number(l.qty) || 0;
      const unit = Number(l.unit_price_ex_vat) || 0;
      const pct  = (l.vsk_pct == null ? 24 : Number(l.vsk_pct)) || 0;
      const lineEx = qty * unit;
      subEx += lineEx;
      vsk   += lineEx * pct / 100;
    });
    // 2026-07-08 (afsláttar-úttekt): heildar-afslátturinn (%) úr patch-129
    // töflunni var áður HVERGI lesinn á reikningsleiðinni — taflan sýndi
    // afslegna samtölu en salan vistaðist á fullu verði með afslattur:0.
    // Sama stærðfræði og taflan (129: netto = brúttó × (1−g%)). Geymt í
    // `afslattur` (kr m. vsk af lokaverði, gross) + samtals = brúttó − afsl —
    // POS-venjan, sem SalaInvoice/PDF (case C) prenta rétt. VSK tekur
    // afgangs-aurinn svo upphaed_an_vsk + vsk_upphaed === samtals alltaf.
    const g = Math.max(0, Math.min(100, Number(discountPct) || 0));
    const gross = subEx + vsk;
    const afsl  = g > 0 ? Math.round(gross * g / 100) : 0;
    const total = Math.round(gross) - afsl;
    const ex    = Math.round(subEx * (1 - g / 100));
    return { subEx: ex, vsk: total - ex, total, afslattur: afsl };
  }

  // Pull all visible unit-rows + their Áætlað choice. Returns line summaries
  // by (type, size, kind) so we can build invoice lines + know which uttaeki
  // ids need next_insp bumped.
  async function collectVisit(coId, coNafn) {
    const sb = window.DB && window.DB.sb;
    if (!sb) throw new Error('Engin nettenging');
    const trip = loadTrip(coId);
    const choices = trip.units || {};
    // Fetch live unit list
    const { data: units, error } = await sb
      .from('uttaeki')
      .select('id,serial,type,size,client,status,last_insp,next_insp')
      .eq('client', coNafn);
    if (error) throw error;
    const servicedIds = [];
    const grouped = {}; // {type|size|kind: count}
    // 2026-08-05 (Agnar: refused to finish an invoice for a visit that was
    // 100% brand-new installs at Engjasel 3 — "engin tæki merkt"): patch 131's
    // "Nýtt" choice is stored as 'nyitt', but this only ever counted
    // 'hledsla'/'yfirferd' as serviced. A visit installing only new units has
    // neither, so servicedIds stayed empty and blocked "Klára heimsókn" even
    // though real billable work (the new units) was done.
    for (const u of units) {
      const ch = choices[u.id] || 'yfirferd'; // safe default
      if (ch !== 'hledsla' && ch !== 'yfirferd' && ch !== 'nyitt') continue;
      servicedIds.push(u.id);
      const k = (u.type || '—') + '|' + (u.size || '') + '|' + ch;
      grouped[k] = (grouped[k] || 0) + 1;
    }
    // 2026-08-18: sjálfgildin koma nú úr EINNI heimild (window.SlokkVisitDefaults,
    // sett í patch 129) svo reikningurinn og kostnaðartaflan geti ekki sagt
    // sitt hvað. Fallback-tölurnar hér eru aðeins öryggisnet ef 129 hefur ekki
    // hlaðist — collectVisit keyrir við notanda-smell, löngu eftir hleðslu, svo
    // í reynd ræður alltaf 129-heimildin.
    const _D = window.SlokkVisitDefaults || { akstur: 3600, driveQty: 1, skyrslugerd: 5600 };
    return {
      units,
      servicedIds,
      grouped,
      drive:       (trip.drive       != null) ? +trip.drive       : _D.akstur,
      driveQty:    (trip.driveQty    != null) ? Math.max(0, +trip.driveQty) : _D.driveQty,
      skyrslugerd: (trip.skyrslugerd != null) ? +trip.skyrslugerd : _D.skyrslugerd,
      skodunaradili: (trip.skodunaradili || '').trim(),
      // 2026-05-21: manual line items added via "+ Bæta við vöru eða þjónustu"
      extras:      Array.isArray(trip.extras) ? trip.extras : [],
      // 2026-07-08: heildar-afsláttur (%) úr patch-129 töflunni — var áður
      // aldrei lesinn hér, svo reikningurinn varð hærri en taflan lofaði.
      // 2026-08-17 (Vélrás — afsláttur týndist AFTUR): fyrirtækja-fallbackið
      // (fyrirtaeki.afslattur_pct sjálfgefið, sett í töfluna 2026-07-29) var
      // BARA í 129 en ekki hér — taflan sýndi −20%, reikningurinn 0%. Nú les
      // SAMA fall og taflan notar (window.CtcDiscount, skilgreint í 129);
      // gamla tjáningin stendur sem varaleið ef 129 er ekki hlaðið.
      discount_pct: (window.CtcDiscount && window.CtcDiscount.effectivePct)
        ? window.CtcDiscount.effectivePct(coId, trip)
        : Math.max(0, Math.min(100, Number(trip.discount_pct) || 0)),
      // Samtalan sem taflan SÝNDI notandanum (129 vistar computed.total á
      // hverjum render) — varðan í forskoðuninni ber reikninginn saman við hana.
      table_total: (trip.computed && isFinite(+trip.computed.total))
        ? Math.round(+trip.computed.total) : null
    };
  }

  // 2026-05-20: scrape priced rows from the green Heildarkostnaður table.
  // Uses the visible product name + per-stk price + vsk% so the previewed
  // invoice lines match the cost table EXACTLY (instead of zero-price stubs).
  function scrapeCostRows() {
    const section = document.getElementById('_ctc-section');
    if (!section) return [];
    const out = [];
    const trs = section.querySelectorAll('table tbody tr');
    trs.forEach(tr => {
      // Skip Skýrslugerð / Akstur rows (they have the inline inputs)
      if (tr.querySelector('#_ctc-skyrslu') || tr.querySelector('#_ctc-drive')) return;
      const tds = tr.querySelectorAll('td');
      if (tds.length < 6) return;
      // Skip the "Sleppt" greyed-out rows (they have colspan=3 in cells 3-5)
      if (/sleppt/i.test(tds[2] && tds[2].textContent || '')) return;
      const firstTd = tds[0];
      const sub = firstTd.querySelector('div');
      const productName = sub ? sub.textContent.trim() : '';
      const headLine = firstTd.firstChild && firstTd.firstChild.textContent
        ? firstTd.firstChild.textContent.trim()
        : firstTd.textContent.replace(productName, '').trim();
      const qty = parseInt((tds[1].textContent || '').trim().replace(/[^0-9]/g, ''), 10) || 0;
      if (qty === 0) return;
      const kindLabel = (tds[2].textContent || '').trim();
      // 2026-05-20: Strip every non-digit character. This is locale-agnostic —
      // "7.000 kr", "7,000 kr", "7 000 kr" all collapse to "7000". Previous
      // attempt used parseFloat after a dot-strip + comma-to-dot, which broke
      // on Chrome's "7,000" output (parseFloat treated . as decimal → 7).
      // 2026-07-31: PER STK er nú ritanlegur reitur (patch 129 line_price) —
      // lesa gildið úr ._ctc-line-price ef hann er til, annars gamla textinn.
      const priceInp = tds[3].querySelector('._ctc-line-price');
      const unitPrice = priceInp
        ? (parseInt(String(priceInp.value).replace(/[^0-9]/g, ''), 10) || 0)
        : (parseInt((tds[3].textContent || '').replace(/[^0-9]/g, ''), 10) || 0);
      const vskPct = parseInt((tds[4].textContent || '').replace(/[^0-9]/g, ''), 10) || 24;
      // 2026-07-08: afsláttur (%) á hvern lið — lesinn úr Afsl.-reitnum (patch 129).
      // Reikningslínan fær AFSLÁTTAÐ einingaverð (round(verð×(1−d%)) — sama
      // stærðfræði og taflan) og „ · −X% afsl." í lýsinguna svo hann sjáist.
      const discInp = tr.querySelector('._ctc-line-disc');
      const discPct = discInp ? Math.max(0, Math.min(100, parseFloat(String(discInp.value).replace(',', '.')) || 0)) : 0;
      const billedUnit = discPct > 0 ? Math.round(unitPrice * (1 - discPct / 100)) : unitPrice;
      const desc = (kindLabel ? kindLabel + ' · ' : '') + (productName || headLine) +
        (discPct > 0 ? ' · −' + discPct + '% afsl.' : '');
      out.push({ desc, qty, unit_price_ex_vat: billedUnit, vsk_pct: vskPct });
    });
    return out;
  }

  function buildLinur(visit, costRows) {
    // Prefer the scraped, priced rows. Fall back to the legacy 0-price rows
    // only if scraping somehow yielded nothing (e.g. _ctc-section missing).
    const linur = costRows.length ? costRows.slice() : (function () {
      const arr = [];
      Object.entries(visit.grouped).forEach(([k, n]) => {
        const [type, size, kind] = k.split('|');
        arr.push({
          desc: (kind === 'hledsla' ? 'Hleðsla' : 'Yfirferð') + ' · ' + type + ' ' + size,
          qty: n, unit_price_ex_vat: 0, vsk_pct: 24
        });
      });
      return arr;
    })();
    // 2026-05-21: Manual extras come BEFORE the Skýrslugerð/Akstur lines so
    // they sit with the equipment items on the printed invoice.
    if (Array.isArray(visit.extras)) {
      visit.extras.forEach(e => {
        const q = Math.max(0, Number(e.qty) || 0);
        if (q === 0) return;
        // 2026-07-08: afsláttur (%) á extra-línu (disc_pct úr patch 129) — sama
        // meðferð og þjónustulínur: afsláttað einingaverð + merking í lýsingu.
        const d = Math.max(0, Math.min(100, Number(e.disc_pct) || 0));
        const unit = Math.max(0, Number(e.unit_price_ex_vat) || 0);
        linur.push({
          desc: String(e.name || 'Vara') + (d > 0 ? ' · −' + d + '% afsl.' : ''),
          qty: q,
          unit_price_ex_vat: d > 0 ? Math.round(unit * (1 - d / 100)) : unit,
          vsk_pct: Number(e.vsk_pct) || 24
        });
      });
    }
    if (visit.skyrslugerd > 0) linur.push({ desc: 'Skýrslugerð', qty: 1, unit_price_ex_vat: visit.skyrslugerd, vsk_pct: 24 });
    // 2026-05-20: Akstur qty comes from the per-company driveQty input
    // (defaults to 1). Lets Agnar bill 2× Akstur etc. when extra trips needed.
    if (visit.drive > 0 && visit.driveQty > 0) {
      linur.push({ desc: 'Akstur', qty: visit.driveQty, unit_price_ex_vat: visit.drive, vsk_pct: 24 });
    }
    return linur;
  }

  async function runVisitWorkflow() {
    const coId = getCompanyId();
    let coNafn = getCompanyName();
    if (!coNafn && coId) coNafn = await fetchCompanyName(coId);
    if (!coId || !coNafn) {
      console.warn('[visit-workflow] coId=', coId, ' coNafn=', coNafn);
      alert('Fyrirtæki ekki fundið — opnaðu fyrirtæki að nýju og reyndu aftur.');
      return;
    }
    let visit;
    try { visit = await collectVisit(coId, coNafn); }
    catch (e) { alert('Villa: ' + (e.message || e)); return; }

    if (!visit.servicedIds.length) {
      alert('Engin tæki merkt í þessari heimsókn. Veldu Hleðsla eða Yfirferð á einhverju tæki fyrst.');
      return;
    }

    const today = todayIso();
    const next = addMonthsIso(today, 12);

    const sb = window.DB.sb;
    const costRows = scrapeCostRows();
    const linur = buildLinur(visit, costRows);
    // Totals come from the invoice lines themselves (not a DOM scrape) so the
    // saved sale always matches the printed reikningur. See totalsFromLinur.
    const tot = totalsFromLinur(linur, visit.discount_pct);

    // Fetch customer info so the preview invoice has kt + address.
    let custData = null;
    try {
      const c = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi').eq('id', coId).maybeSingle();
      if (c && c.data) custData = c.data;
    } catch (_) {}

    // Build a synthetic sale for the preview render.
    const subEx = tot.subEx;
    const vsk   = tot.vsk;
    const total = tot.total;
    // 2026-05-20: starfsmadur now comes from the Skoðunaraðili field on the
    // company page (e.g. "Elías"). Falls back to "Kassi" if not set.
    const starfsmadur = visit.skodunaradili || 'Kassi';
    const previewSale = {
      num: '(Forskoðun — óvistað)',
      customer_nafn: coNafn,
      customer_id: coId,
      starfsmadur,
      linur,
      upphaed_an_vsk: subEx,
      vsk_upphaed: vsk,
      samtals: total,
      afslattur: tot.afslattur,
      greitt_med: 'reikningur',
      // 2026-08-05 (Agnar): stop auto-writing "Heimsókn … tæki, næsta skoðun …"
      // onto the invoice — he doesn't want it there, and the device count it
      // quoted didn't match reality. Beiðni nr (if any) is still worth keeping.
      athugasemdir: (window.BeidniGate && BeidniGate.peek(coId)) ? `Beiðni nr: ${BeidniGate.peek(coId)}` : '',
      created_at: new Date().toISOString()
    };

    const vd = (window.SlokkVisitDate && window.SlokkVisitDate.get)
      ? window.SlokkVisitDate.get(coId) : null;

    showPreview(previewSale, custData, {
      coId, coNafn, visit, linur, today, next, sb, starfsmadur, vd
    });
  }

  // ── Preview modal — shows the bill as it will look + Aftur / Staðfesta ──
  function showPreview(previewSale, custData, ctx) {
    const existing = document.getElementById('_vw-preview');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_vw-preview';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);width:min(960px,calc(100vw - 32px));height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#fef3c7">' +
          '<div>' +
            '<div style="font-size:14px;font-weight:800;color:#92400e">📄 Forskoðun reiknings — ekki vistað enn</div>' +
            '<div style="font-size:11px;color:#78350f;margin-top:2px">Svona mun reikningurinn líta út. Smelltu „Aftur" til að breyta áfram — eða „Staðfesta" til að vista og prenta.</div>' +
          '</div>' +
          '<button id="_vw-close" type="button" style="background:transparent;border:none;font-size:22px;cursor:pointer;color:#78350f;line-height:1;padding:6px">✕</button>' +
        '</div>' +
        '<iframe id="_vw-frame" style="flex:1;border:none;background:#fff"></iframe>' +
        '<div style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<button id="_vw-back" type="button" style="padding:10px 18px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">← Aftur — breyta enn</button>' +
          '<button id="_vw-confirm" type="button" style="padding:10px 22px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:800;box-shadow:0 1px 3px rgba(22,101,52,.3)">✓ Staðfesta — búa til reikning</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    // ── VARÐA (2026-08-17, Agnar: „make precautions so it wont happen again"):
    // reikningurinn verður að segja SÖMU samtölu og kostnaðartaflan sýndi.
    // 129 vistar sýndu töluna í trip-state (computed.total → visit.table_total);
    // víki forskoðunin frá henni um meira en 2 kr — týndur afsláttur, línu-
    // skekkja, hvað sem er — birtist rauður borði og „Staðfesta" spyr sér-
    // staklega. Stöðvar ekkert alfarið (ALLTAF LEYFA VISTUN-andinn) en enginn
    // reikningur fer lengur ÓSÉÐUR út á annarri tölu en notandanum var sýnd.
    const _kr = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
    const _promised = ctx.visit ? ctx.visit.table_total : null;
    const _mismatch = (_promised != null) && Math.abs(_promised - (Number(previewSale.samtals) || 0)) > 2;
    if (_mismatch) {
      const fr0 = dlg.querySelector('#_vw-frame');
      const warn = document.createElement('div');
      warn.id = '_vw-mismatch';
      warn.style.cssText = 'padding:10px 18px;background:#fee2e2;border-bottom:2px solid #dc2626;color:#991b1b;font-size:13px;font-weight:700;line-height:1.45';
      warn.textContent = '⚠ MISRÆMI: Kostnaðartaflan sýndi ' + _kr(_promised) +
        ' en reikningurinn segir ' + _kr(previewSale.samtals) +
        '. Farðu „Aftur" og athugaðu afsláttinn/línurnar — staðfestu aðeins ef þú veist að reikningurinn er réttur.';
      fr0.parentNode.insertBefore(warn, fr0);
    }

    const frame = dlg.querySelector('#_vw-frame');
    frame.src = 'about:blank';
    // Defer until the iframe's blank document is ready, then render.
    setTimeout(() => {
      try {
        if (window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
          SalaInvoice.renderFromSale(frame.contentWindow, previewSale, custData,
            visitInvoiceOpts(ctx.vd, ctx.today));
        } else {
          const doc = frame.contentDocument || frame.contentWindow.document;
          doc.open();
          doc.write('<div style="padding:30px;font-family:Arial;color:#dc2626">Reikningsmótið er ekki tiltækt — get ekki sýnt forskoðun.</div>');
          doc.close();
        }
      } catch (e) {
        try {
          const doc = frame.contentDocument || frame.contentWindow.document;
          doc.open();
          doc.write('<div style="padding:30px;font-family:Arial;color:#dc2626">Villa: ' + esc(e.message || String(e)) + '</div>');
          doc.close();
        } catch (_) {}
      }
    }, 40);

    function close() { dlg.remove(); }
    dlg.querySelector('#_vw-close').addEventListener('click', close);
    dlg.querySelector('#_vw-back').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    const confirmBtn = dlg.querySelector('#_vw-confirm');
    confirmBtn.addEventListener('click', async () => {
      // Varðan að ofan: misræmi tafla ⇄ reikningur þarf sérstaka staðfestingu.
      if (_mismatch && !confirm(
        '⚠ Reikningurinn (' + _kr(previewSale.samtals) + ') stemmir EKKI við ' +
        'kostnaðartöfluna (' + _kr(_promised) + ').\n\nBúa hann til SAMT?')) {
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Vinn úr…';
      try {
        await finalizeVisit(ctx);
        close();
      } catch (e) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ Staðfesta — búa til reikning';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Actual save — runs only after the user confirms in the preview ─────
  async function finalizeVisit({ coId, coNafn, visit, linur, today, next, sb, starfsmadur, vd }) {
    // 0. TVÍTÖKUVÖRN (2026-08-01) — rótin að BGT/Rafha tvítökunum: „Klára heimsókn"
    //    var ýtt tvisvar (aðskildar forskoðanir, mínútum í sundur) og EKKERT stöðvaði
    //    annan reikning. Ef reikningur úr úttektarflæði (source=uttekt, final) er ÞEGAR
    //    til fyrir sama fyrirtæki SAMA DAG → spyrja áður en annar er búinn til.
    //    Fellur leitin (t.d. nettengingarvilla) → höldum áfram (ALLTAF LEYFA VISTUN).
    try {
      const _t2 = new Date(today + 'T00:00:00Z'); _t2.setUTCDate(_t2.getUTCDate() + 1);
      const _tomo = _t2.toISOString().slice(0, 10);
      const dup = await sb.from('solur').select('num')
        .eq('customer_nafn', coNafn).eq('source', 'uttekt').eq('status', 'final')
        .gte('created_at', today + 'T00:00:00').lt('created_at', _tomo + 'T00:00:00');
      const existing = (dup.data || []).map(s => s.num).filter(Boolean);
      if (existing.length && !confirm(
        '⚠️ Reikningur úr úttekt er ÞEGAR til fyrir „' + coNafn + '" í dag:\n' +
        existing.join(', ') + '\n\nBúa til ANNAN reikning samt?\n(Ýttu á „Hætta við" til að sleppa — kemur í veg fyrir tvítekningu.)')) {
        return;   // notandinn hætti við — engin tvítekning, ferðin helst óbreytt
      }
    } catch (_) { /* ALLTAF LEYFA VISTUN */ }

    // 1. Bump last_insp + next_insp on all serviced units.
    const updateRes = await sb.from('uttaeki')
      .update({ last_insp: today, next_insp: next })
      .in('id', visit.servicedIds);
    if (updateRes.error) throw updateRes.error;

    // 2. Insert sale row. Totals are derived from the line items (see
    //    totalsFromLinur) so vsk_upphaed/samtals always match the printed bill.
    const { subEx, vsk, total, afslattur } = totalsFromLinur(linur, visit.discount_pct);
    // 2026-08-05 (Agnar: "Húsfélagið Engjasel 31" reikningur R-000703 hvorki
    // paraður í Sölu 📦 Pör bandinu né sýnilegur í Kröfu yfirliti — tvö
    // aðskilin einkenni, EIN rót): þessi insert setti ENGA af customer_id/
    // customer_base_id/customer_kt á söluna. 📦 Pör-bandið og v_bundle_coverage
    // lykla á customer_kt; Kröfu yfirlit lyklar fyrst og fremst á customer_id/
    // customer_base_id (nafna-endurheimtin þar nær kt-inu en aldrei netfanginu).
    // Sama uppfletting og 233-uttekt-pdf-autosave.js notar nú þegar fyrir
    // reikningsins customer_documents-afrit — bara aldrei gerð fyrir solur-röðina.
    let visitKt = null, visitBaseId = null;
    try {
      const cr = await sb.from('fyrirtaeki').select('kennitala,customer_base_id').eq('id', coId).maybeSingle();
      if (cr.data) { visitKt = cr.data.kennitala || null; visitBaseId = cr.data.customer_base_id || null; }
    } catch (_) {}
    let saleId = null, saleNum = null;
    try {
      const ins = await sb.from('solur').insert({
        customer_nafn: coNafn,
        customer_kt: visitKt,
        customer_id: coId || null,
        customer_base_id: visitBaseId,
        starfsmadur: starfsmadur || 'Kassi',
        linur,
        upphaed_an_vsk: subEx,
        vsk_upphaed: vsk,
        samtals: total,
        afslattur: afslattur,
        greitt_med: 'reikningur',
        source: 'uttekt',   // reikningur úr ársskoðun/úttektarskýrslu-flæði
        // 2026-08-05 (Agnar): stop auto-writing "Heimsókn … tæki, næsta skoðun …"
        // onto the invoice (unwanted + the device count was wrong). Beiðni nr
        // (if any) is still worth keeping.
        athugasemdir: (() => { const _po = (window.BeidniGate && BeidniGate.take(coId)) || ''; return _po ? `Beiðni nr: ${_po}` : ''; })()
      }).select('num,id').single();
      if (ins.error) throw ins.error;
      saleId = ins.data && ins.data.id;
      saleNum = ins.data && ins.data.num;
    } catch (e) {
      alert('Sala vistuð ekki: ' + (e.message || e) + '\n\n(Tækin þó uppfærð með nýrri dagsetningu.)');
    }

    // 2b. Reikningur búinn til → „Reikningur sendur" grænt á ÞjónustuVerkstæði.
    //     Þegar öll 4 þrepin eru græn (skýrsla vistuð fyrst) færist það í „Lokið".
    if (saleId && window.ArsWorkflow) { try { await ArsWorkflow.markInvoice(coId); } catch (_) {} }
    // 2c. (2026-07-16) Reikningur + skýrsla bæði til → staðan á Fyrirtæki í
    //     þjónustu fer sjálfkrafa úr bláa ✓ í grænt „Skoðað <ár>" (patch 270).
    if (saleId && window.ReportFactsSync && ReportFactsSync.maybeComplete) {
      try { await ReportFactsSync.maybeComplete(coId, new Date().getFullYear(), { invoice: true }); } catch (_) {}
    }

    // 3. FERÐIN ER KLÁRUÐ — HÚN ER EKKI HREINSUÐ.
    //
    // 2026-08-30, yfirregla Agnars: „Þetta er bara ritað í stein nema ég breyti
    // sjálfur." Hér stóð áður clearTrip(coId) + removeItem('sk_ut_done_'+coId)
    // með skýringunni „svo næsta úttekt byrji með hreint borð". Það var rótin að
    // TVEIMUR göllum sem hann hefur kvartað yfir margsinnis:
    //
    //   • Grænu hökin hurfu um leið og reikningurinn varð til — og hökuðust svo
    //     fram og til baka milli véla þegar skýja-speglunin (227) rakst á
    //     hreinsunina.
    //   • Spjaldið (129) reiknar LIFANDI áætlun úr valinu. Þegar valið var
    //     núllstillt hér og skref 5 opnaði spjaldið aftur reiknaði það úr TÓMU
    //     vali og birti ranga tölu á sama stað og rétta talan stóð sekúndu áður.
    //     Mælt á Fornhaga 11-17: 170.346 varð að 129.853, mismunurinn nákvæmlega
    //     8 × (6.782 − 3.150) + 3.600 = 32.656. Engin tilviljun — þetta var
    //     hreinsunin.
    //
    // Ferðin er nú MERKT kláruð og geymd óbreytt. Hökin standa græn, valið
    // stendur, og _invoice segir hvaða reikningur varð til. Næsta ár á staðurinn
    // engan reikning þess árs og ritillinn opnast náttúrulega aftur (sama regla
    // og VisitYearLock, patch 271). Vilji Agnar byrja upp á nýtt er það gert
    // MEÐVITAÐ með Hreinsa-takkanum — aldrei sjálfkrafa.
    try {
      const _fin = loadTrip(coId) || {};
      _fin._locked = true;
      _fin._invoice = {
        num: saleNum || null,
        id: saleId || null,
        year: new Date().getFullYear(),
        at: new Date().toISOString(),
        samtals: total,
      };
      saveTrip(coId, _fin);
    } catch (_) {}

    // 4. Open the saved invoice for printing + vista reikninginn sem PDF.
    if (saleId) {
      try {
        const r = await sb.from('solur').select('*').eq('id', saleId).single();
        if (r.data) {
          // 2026-06-23: vista reikninginn sjálfkrafa sem ársmerkt PDF í skjala-
          // kassann (patch 233) — birtist í „Skjöl & viðhengi" reikningsdálki
          // ársins. Keyrir óháð því hvort SalaInvoice-prentgluggi opnast.
          if (window.UttektInvoicePdf && UttektInvoicePdf.saveForSale) {
            UttektInvoicePdf.saveForSale(coId, r.data).catch(function () {});
          }
          if (window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
            const w = window.open('', '_blank', 'width=900,height=1100');
            if (w) SalaInvoice.renderFromSale(w, r.data, null, visitInvoiceOpts(vd, today));
          }
        }
      } catch (_) {}
    }

    // 5. Refresh company detail.
    if (window.Companies && typeof Companies.openDetail === 'function') {
      setTimeout(() => Companies.openDetail(coId), 200);
    }
  }

  function injectButtons() {
    const section = document.getElementById('_ctc-section');
    if (!section) return;
    if (section.querySelector('._vw-bar')) return; // already injected
    const bar = document.createElement('div');
    bar.className = '_vw-bar';
    bar.style.cssText = 'display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:flex-end';
    bar.innerHTML =
      // Blár „Vista / í Vinnslu": setur fyrirtækið í vinnslu → birtist á
      // ÞjónustuVerkstæði (áminning: skýrsla ekki búin) + blátt á Fyrirtæki í
      // þjónustu. Speglar sömu stöðu og ✓-takkinn á listanum (arsskodun_customers).
      '<button id="_vw-invinnsla" type="button" style="padding:10px 18px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.15)">' +
      '💾 Vista / í Vinnslu</button>' +
      '<button id="_vw-finish" type="button" style="padding:10px 18px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.15)">' +
      '✓ Klára heimsókn — búa til reikning</button>';
    section.appendChild(bar);
    section.querySelector('#_vw-finish').addEventListener('click', runVisitWorkflow);
    section.querySelector('#_vw-invinnsla').addEventListener('click', (ev) => onInVinnsla(ev.currentTarget));
  }

  // Sameiginlegur smell-handler fyrir báða „í Vinnslu" takkana (kostnaðartafla + efst).
  async function onInVinnsla(b) {
    const coId = getCompanyId();
    if (!coId) { alert('Fyrirtæki ekki fundið — opnaðu fyrirtæki að nýju.'); return; }
    const orig = b.textContent;
    b.disabled = true; b.textContent = '⏳ Vista…';
    const ok = window.ArsWorkflow ? await ArsWorkflow.markInVinnsla(coId) : false;
    b.textContent = ok ? '✓ Í vinnslu' : orig; b.disabled = !ok;
    if (ok && window.Toast && Toast.show) Toast.show('🔵 Sett í vinnslu — komið á ÞjónustuVerkstæði');
  }

  // Efri takki: „Úttekt búin / í Vinnslu" strax undir fyrirtækja-hausnum
  // (.info-grid) svo hann sé aðgengilegur án þess að skruna í kostnaðartöfluna.
  // Sama aðgerð → setur „Úttekt búin" grænt á ÞjónustuVerkstæði + blátt á listanum.
  function injectTopButton() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const info = main.querySelector('.info-grid');
    if (!info) return;                              // aðeins detail-síðan (listinn hefur enga .info-grid)
    if (main.querySelector('._vw-topbtn')) return;  // þegar innsett
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;justify-content:flex-end;margin:8px 0 0';
    bar.innerHTML =
      '<button type="button" class="_vw-topbtn" style="padding:9px 16px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.15)">🔵 Úttekt búin / í Vinnslu</button>';
    info.parentNode.insertBefore(bar, info.nextSibling);
    bar.querySelector('._vw-topbtn').addEventListener('click', (ev) => onInVinnsla(ev.currentTarget));
  }

  function injectAll() { injectButtons(); injectTopButton(); }

  // 2026-08-17 („I cant check out"): observerinn var tengdur á companies-main
  // EINU SINNI við ræsingu — þegar viewið endursmíðar nóðuna hlustar hann á
  // aftengda nóðu og takkarnir koma aldrei aftur eftir að 129 endurbyggir
  // _ctc-section. Nú er nóðan endur-tengd um leið og hún skiptist út, plús
  // 2,5s öryggispúls (injectAll er ódýrt no-op þegar allt er á sínum stað).
  function attach() {
    let observed = null, _t = 0;
    const obs = new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectAll, 350);
    });
    function ensure() {
      const main = document.getElementById('companies-main');
      if (main && main !== observed) {
        try { obs.disconnect(); } catch (_) {}
        obs.observe(main, { childList: true, subtree: true });
        observed = main;
        injectAll();
      }
    }
    ensure();
    setInterval(() => {
      ensure();
      const v = document.getElementById('view-companies');
      if (v && v.classList.contains('active')) injectAll();
    }, 2500);
  }
  attach();

  console.log('[visit-workflow] installed');
})();
/* === END VISIT WORKFLOW v1 === */
