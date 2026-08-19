// payday-push.js — push krafnir til Payday API
//
// Twin af brunaholf/payday-pull.js auth-pattern (OAuth2 client_credentials),
// en hér í slokkvitaeki repo með SLOKKVITAEKI Payday-account creds.
//
// Modes:
//   GET  /api/payday-push?probe=1
//     → auth-test eingöngu. Engin gögn send. Notið ÞETTA fyrst.
//
//   POST /api/payday-push                    (body: { sale_id, dry?, sendEmail? })
//     → byggir payload úr `solur` + `fyrirtaeki` og sendir til Payday.
//     → dry:true  → skilar payload, sendir EKKI.
//     → sendEmail: true | false (default false; ef true og netfang er til,
//       biður Payday um að senda kúnna PDF reikninginn í pósti).
//
// Env vars (settu í slokkvitaeki Netlify, ekki commit):
//   PAYDAY_CLIENT_ID
//   PAYDAY_CLIENT_SECRET
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Optional:
//   PAYDAY_API_BASE     — default 'https://api.payday.is'
//   PAYDAY_TOKEN_PATH   — default '/auth/token'
//   PAYDAY_INVOICES_PATH — default '/invoices'
//   PAYDAY_API_VERSION  — default 'alpha'

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_ID = process.env.PAYDAY_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYDAY_CLIENT_SECRET;
const API_BASE = (process.env.PAYDAY_API_BASE || 'https://api.payday.is').replace(/\/+$/, '');
const TOKEN_PATH = process.env.PAYDAY_TOKEN_PATH || '/auth/token';
const INVOICES_PATH = process.env.PAYDAY_INVOICES_PATH || '/invoices';
const API_VERSION = process.env.PAYDAY_API_VERSION || 'alpha';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String((event.headers && event.headers['x-eldklar-key']) || '').trim();
    if (got !== KEY) return json(401, { error: 'unauthorized' });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json(500, { error: 'PAYDAY_CLIENT_ID / PAYDAY_CLIENT_SECRET vantar í Netlify env vars.' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return json(500, { error: 'Supabase env vantar.' });
  }

  // GET = probe-only path
  if (event.httpMethod === 'GET') {
    const p = event.queryStringParameters || {};
    if (p.probe === '1' || p.probe === 'true') {
      try {
        const token = await getAccessToken();
        return json(200, {
          ok: true, probe: true, token_obtained: true,
          token_base: API_BASE, token_path: TOKEN_PATH,
          invoices_path: INVOICES_PATH, api_version: API_VERSION,
          note: 'Auth virkar. Næst: POST /api/payday-push body {sale_id, dry:true}.',
        });
      } catch (e) {
        return json(502, { error: 'Auth-bilun: ' + String(e.message || e) });
      }
    }
    return json(400, { error: 'GET með ?probe=1 fyrir auth-test, POST fyrir push.' });
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'POST eða GET only' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Ógilt JSON' }); }

  // Cancel-mode: cancels the claim + invoice in Payday (PUT). Accepts either an
  // explicit payday_invoice_id or a sale_id (whose dk_invoice_id is looked up).
  // On success the sale's idempotency markers are cleared so it can be re-sent.
  if (body.action === 'cancel') {
    try {
      let paydayId = body.payday_invoice_id || null;
      if (!paydayId && body.sale_id) {
        const saleRow = await fetchSale(body.sale_id);
        paydayId = saleRow && saleRow.dk_invoice_id;
        if (!paydayId) return json(409, { error: 'Salan er ekki með Payday-reikning (dk_invoice_id) — ekkert að afturkalla.' });
      }
      if (!paydayId) return json(400, { error: 'payday_invoice_id eða sale_id vantar' });
      const token = await getAccessToken();
      const result = await cancelInvoice(token, paydayId);
      if (body.sale_id) await clearSaleInvoiced(body.sale_id).catch(() => {});
      return json(200, { ok: true, cancelled: paydayId, result });
    } catch (e) { return json(500, { error: String(e.message || e) }); }
  }

  const saleId = body.sale_id;
  const dry = !!body.dry;
  const mode = body.mode === 'draft' ? 'draft' : 'send'; // 'draft' = aðeins drög í Payday (engin sjálfvirk afhending)
  if (!saleId) return json(400, { error: 'sale_id vantar' });

  try {
    const sale = await fetchSale(saleId);
    if (!sale) return json(404, { error: 'Sala fannst ekki: ' + saleId });
    if (sale.dk_invoice_id || sale.invoiced_at) {
      return json(409, { error: 'Sala þegar í reikningi (' + (sale.dk_invoice_id || sale.invoiced_at) + ')' });
    }

    // ═══ RUKKUNAR-GÁTTIR (2026-08-13 — sjá docs/RUKKUNARKEDJAN.md) ═══════════
    // Allar sendingarleiðir (stök sending, bulk, endursending — patch 166 öll
    // þrjú köllin) fara um ÞETTA eina fall, svo gáttirnar hér gilda alls staðar.
    // UI má yfirskrifa hverja gátt með skýru force-flaggi — meðvituð ákvörðun,
    // aldrei sjálfgefin. Vistun sölu er ALDREI stöðvuð (ALLTAF LEYFA VISTUN);
    // gáttirnar gilda aðeins um að senda kröfu í banka.
    // 1) void = afturkölluð sala. Hún má aldrei rukkast — engin yfirskrift.
    if (String(sale.status || '') === 'void') {
      return json(409, { gate: 'void', error: 'Salan er void (afturkölluð) — void sala fer aldrei í kröfu. Endurvektu hana fyrst („gild") ef þetta er rangt.' });
    }
    // 2) Krafa án customer_base_id er órekjanleg á kúnna (15 slíkar fundust 13.08).
    if (!sale.customer_base_id && !body.force_no_base) {
      return json(422, { gate: 'base_id', error: 'Söluna vantar customer_base_id — krafan yrði órekjanleg á kúnna. Tengdu söluna við kúnna fyrst, eða sendu aftur með force_no_base:true ef þetta er meðvitað.' });
    }
    // 3) Tvítakavörn (Vélrás-mynstrið R-000259/276): önnur sala á sömu kennitölu
    //    með nákvæmlega sömu línur og sömu upphæð sem er ÞEGAR komin í kröfu.
    //    Gamla „vörnin" var handvirk yfirferð (patch 197 flaggar tvítök eftir á)
    //    — hún greip Véltindar af því einhver yfirfór, en ekkert stöðvaði
    //    sendinguna sjálfa. Þessi gátt gerir það, á einum stað.
    if (!body.force_duplicate && !sale.is_credit) {
      const twin = await findBilledTwin(sale);
      if (twin) {
        return json(409, {
          gate: 'duplicate',
          error: 'Möguleg tvírukkun: ' + (twin.num || twin.id) + ' (send ' + String(twin.krafa_sent_at || '').slice(0, 10) + ') er á sömu kennitölu með nákvæmlega sömu línur og sömu upphæð. Ef þetta eru raunverulega tvö aðskilin verk: sendu aftur með force_duplicate:true.',
          twin: { id: twin.id, num: twin.num, samtals: twin.samtals, krafa_sent_at: twin.krafa_sent_at },
        });
      }
    }
    // Customer enrichment — try in order: customer_base_id → customer_id (fyrirtaeki).
    // sale.customer_kt + sale.customer_nafn are authoritative if present (POS writes them).
    let customer = null;
    if (sale.customer_base_id) customer = await fetchCustomerBase(sale.customer_base_id);
    if (!customer && sale.customer_id) customer = await fetchFyrirtaeki(sale.customer_id);
    // Staður (starfsstöð) fyrir „Vegna:" á kröfunni — customer_id bendir á fyrirtaeki-staðinn.
    let site = null;
    if (sale.customer_id) { try { site = await fetchFyrirtaeki(sale.customer_id); } catch (_) {} }

    const payload = buildPayload(sale, customer, { mode, site });
    if (body.email_override) payload.customer.email = String(body.email_override).trim();

    // ── Bókunarupplýsingar → Payday accountingCost (2026-08-14) ────────────
    // Kostnaðarstöð kúnnans — ferðast í rafræna XML-inu, ólíkt „Vegna:"
    // frítextanum. fyrirtaeki.bokunarnumer þegar fyllt; annars SJÁLFGEFIÐ
    // fyrir kt með fleiri en einn lifandi stað: „<nafn staðar> – <gata>".
    // stadur_nr EITT dugar ekki (aðeins einkvæmt innan rekstrarfélags —
    // Plaza er nr. 2 hjá Center OG Máni nr. 2 hjá Heimaleigu). Staðurinn er
    // AÐEINS notaður þegar kennitala hans passar við söluna (sama PK-skörunar-
    // vörn og „Vegna:"/netfangs-fallbackið í buildPayload).
    const _d10 = x => String(x || '').replace(/\D/g, '');
    const _siteTrusted = !!(site && _d10(site.kennitala) && _d10(site.kennitala) === _d10(sale.customer_kt || (customer && customer.kennitala)));
    let accountingCost = (_siteTrusted && site.bokunarnumer && String(site.bokunarnumer).trim()) || '';
    if (!accountingCost && _siteTrusted && sale.customer_base_id) {
      try {
        const sr = await fetch(`${SUPABASE_URL}/rest/v1/fyrirtaeki?customer_base_id=eq.${encodeURIComponent(sale.customer_base_id)}&deleted_at=is.null&select=id&limit=3`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        const siteRows = await sr.json().catch(() => []);
        if (Array.isArray(siteRows) && siteRows.length > 1) {
          const street = String(site.heimilisfang || '').split(',')[0].trim();
          accountingCost = [String(site.nafn || '').trim(), street].filter(Boolean).join(' – ');
        }
      } catch (_) { /* sjálfgefna gildið er best-effort — fellir aldrei sendingu */ }
    }
    if (accountingCost) payload.accountingCost = accountingCost.slice(0, 100);

    // ── Úttektarskýrsla fylgiskjal — ONLY for inspection invoices ──────────
    // HARD SAFETY GATE: attach the report ONLY when the sale really is an
    // úttekt (source==='uttekt'). A regular POS sale (source 'pos'/'sott'/null)
    // can NEVER carry the report, even if the client asks for it.
    const attachReport = body.attach_report !== false; // default on
    let attachment = null, attachSkipReason = null;
    if (attachReport) {
      if (sale.source !== 'uttekt') {
        attachSkipReason = 'sale.source er ekki uttekt (' + (sale.source || 'null') + ') — engin skýrsla fest';
      } else if (site && site.skyrsla_med_krofu === false) {
        // Per-fyrirtæki hak í prófílnum (patch 14): sum félög vilja EKKI
        // skýrsluna með reikningnum.
        attachSkipReason = 'fyrirtækið er stillt á að fá EKKI úttektarskýrslu með kröfu';
      } else {
        try {
          attachment = await findReportPdf(sale, body.report_storage_path);
          if (!attachment) attachSkipReason = 'engin úttektarskýrsla fannst fyrir þennan reikning/ár';
        } catch (e) { attachSkipReason = 'skýrslu-sókn brást: ' + String(e.message || e); }
      }
    } else {
      attachSkipReason = 'attach_report=false';
    }

    // ── Delivery method ────────────────────────────────────────────────────
    // Priority: explicit body.delivery (tests) > the customer's saved preference
    // (fyrirtaeki.payday_delivery: 'electronic' | 'email' | 'both') > buildPayload's
    // auto default: rafrænt (real kt) OG póstafrit þegar netfang er til — „both"
    // í reynd. Úttektarskýrslan þvingar EKKI lengur póst-leið (breytt 13.08.2026,
    // Agnar): hún er viðhengi á reikningnum sjálfum í Payday og fylgir því
    // sendingunni — rafrænni jafnt sem pósti. Whichever electronic path runs
    // still falls back to e-mail if the customer rejects e-invoices (retry below).
    const custPref = (customer && customer.payday_delivery) || (site && site.payday_delivery) || null;
    // 2026-08-18 (ákvörðun Agnars, tvö skref): „á alltaf að fara í rafrænt" —
    // RAFRÆNA KRAFAN FER ALLTAF (með úttektarskýrsluna sem viðhengi á
    // reikningnum, sjá attachReport að ofan). Eina valið per kúnna er hvort
    // TÖLVUPÓSTAFRIT (reikningur+skýrsla) fylgi að auki: sjálfgefið JÁ þegar
    // netfang er skráð; payday_delivery='electronic' slekkur á póstinum
    // (rofinn á fyrirtækjaprófílnum, patch 199). Gamla 422-afhendingargáttin
    // er úrelt — rafræn krafa á kennitöluna berst alltaf; hafni kúnni rafrænu
    // grípur retry-fallbackið að neðan póstleiðina.
    const delivery = body.delivery || custPref || 'both';
    const hasEmail = !!(payload.customer.email && /@/.test(payload.customer.email));
    payload.createElectronicInvoice = true;
    payload.sendEmail = hasEmail && delivery !== 'electronic';

    const custEmail = payload.customer.email || (customer && customer.netfang) || '';
    const deliveryLabel = () => payload.createElectronicInvoice
      ? (payload.sendEmail ? 'both' : 'electronic')
      : (payload.sendEmail ? 'email' : 'none');
    if (dry) return json(200, {
      ok: true, dry: true, mode, payload, sale, customer,
      attachment: attachment ? { name: attachment.name, bytes: attachment.bytes.length, path: attachment.path } : null,
      would_attach: !!attachment,
      attach_skip_reason: attachSkipReason,
      delivery: deliveryLabel(),
      delivery_source: body.delivery ? 'explicit' : (custPref ? 'customer-pref:' + custPref : 'auto'),
    });

    const token = await getAccessToken();
    // Payday requires customer to exist first — find by ssn or create.
    const custResult = await findOrCreateCustomer(token, payload.customer);
    const customerId = custResult.customerId;
    // Payday wants customer object with guid id (docs verified 2026-06-30).
    payload.customer = { id: customerId };
    let created, fellBackToNonElectronic = false;
    try {
      created = await createInvoice(token, payload, attachment);
    } catch (invErr) {
      const msg = String(invErr.message || invErr);
      // Kúnni tekur EKKI við rafrænum reikningum (Payday 400) → reyna aftur án
      // rafræns svo reikningurinn lendi samt í Payday (senda frekar í tölvupósti
      // ef netfang er til). Þetta lagar „Customer does not accept electronic invoices".
      if (payload.createElectronicInvoice && /electronic invoice/i.test(msg)) {
        payload.createElectronicInvoice = false;
        payload.sendEmail = !!custEmail;
        fellBackToNonElectronic = true;
        try {
          created = await createInvoice(token, payload, attachment);
        } catch (invErr2) {
          return json(502, { error: String(invErr2.message || invErr2), retriedWithoutElectronic: true, customerId, payload });
        }
      } else {
        return json(502, {
          error: msg,
          customer_lookup: custResult.lookup,
          customer_created: custResult.created,
          customerId,
          payload,
        });
      }
    }

    // Writeback: merkja söluna sem invoiced
    await markSaleInvoiced(sale.id, created);

    return json(200, {
      ok: true, mode, fellBackToNonElectronic, payload, created, customerId,
      // Hvað var raunverulega afhent + á hvaða netfang — svo UI og log sýni það.
      delivery: deliveryLabel(),
      email_used: payload.sendEmail ? (custEmail || null) : null,
      email_synced: custResult.email_synced || null,
      attached_report: attachment ? { name: attachment.name, bytes: attachment.bytes.length } : null,
      attach_skip_reason: attachment ? null : attachSkipReason,
    });
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};

// ---- payload builder --------------------------------------------------------

function buildPayload(sale, customer, opts) {
  const mode = (opts && opts.mode) || 'send'; // 'send' = SENT+afhent · 'draft' = aðeins drög í Payday
  const linur = Array.isArray(sale.linur) ? sale.linur : tryParseJson(sale.linur) || [];
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  // Gjalddagi 7 dagar frá útgáfu; eindagi 3 dögum eftir gjalddaga (Agnar 2026-07-03).
  const due = new Date(today); due.setDate(due.getDate() + 7);
  const final = new Date(due); final.setDate(final.getDate() + 3);

  // sale.customer_kt / customer_nafn first (POS writes them); fall back to enriched customer row.
  const ktRaw = sale.customer_kt || (customer && customer.kennitala) || '';
  const name = sale.customer_nafn || (customer && customer.nafn) || '';
  const address = (customer && customer.heimilisfang) || '';
  const phone = (customer && customer.simi) || '';
  // „Vegna: <fyrirtæki – heimilisfang>" — staðurinn (starfsstöð) les-læsilega á
  // kröfunni svo kúnninn (og kerfið) sjái HVAÐA staður rekstrarfélags. Tenging á
  // réttan stað fer gegnum R-númer → sölu → fyrirtaeki_id (ekkert #id á kröfunni).
  const _site = (opts && opts.site) || null;
  // ÖRYGGI: sale.customer_id getur bent á vidskiptavinir-röð (ekki fyrirtaeki) og
  // PK-arnir skarast → fetchFyrirtaeki gæti skilað ÓTENGDU fyrirtæki. Notum staðinn
  // AÐEINS ef kennitala hans passar við kt sölunnar; annars nafn af sölunni.
  const _ktDigits = x => String(x || '').replace(/\D/g, '');
  const _siteOk = !!(_site && _ktDigits(_site.kennitala) && _ktDigits(_site.kennitala) === _ktDigits(ktRaw));
  // Netfang getur verið margar tölvupóstföng aðskilin með kommu/semíkommu
  // (t.d. "reikningar@x.is, bokhald@x.is") — Payday hafnar því á kúnna-stofnun.
  // Bókhaldslegt netfang (reikning-/bokhald-/billing-) tekur forgang fram yfir
  // fyrsta netfangið. Vanti grunnfélagið netfang er netfang STAÐARINS notað —
  // en AÐEINS ef kennitala staðarins passar við söluna (_siteOk, sama vörn og
  // „Vegna:" hér að neðan — PK-skörun getur bent á ótengt fyrirtæki).
  const email = pickBillingEmail((customer && customer.netfang) || '')
             || (_siteOk ? pickBillingEmail(_site.netfang || '') : '');
  const _vegnaLabel = _siteOk ? [_site.nafn, _site.heimilisfang].filter(Boolean).join(' – ')
                              : (sale.customer_nafn || '');
  const _vegna = _vegnaLabel ? ('Vegna: ' + _vegnaLabel) : '';
  const _notes = (sale.athugasemdir || '').trim();
  // Afhending (sjálfgefið, 2026-08-13 — Center Hótel-lexían): rafræn krafa OG
  // póstafrit þegar hvort tveggja er hægt. Áður drap rafrænt póstafritið
  // (emailSend = !electronic && email) — rafræni reikningurinn „fór" en enginn
  // maður sá hann ef móttakandinn les ekki skeytamiðlarann sinn. Manneskja á
  // ALLTAF að fá PDF þegar netfang er til. Í 'draft' ham → ekkert afhent.
  // Rafrænt getur klikkað (kúnni tekur ekki við rafrænum) → handler reynir
  // aftur með pósti eingöngu svo reikningurinn lendi samt í Payday.
  const ssnDigits = digits(ktRaw);
  const realKt = ssnDigits.length === 10 && ssnDigits !== '9999999999';
  const electronic = mode === 'send' && realKt;
  const emailSend = mode === 'send' && !!email;
  return {
    invoiceDate: isoToday,
    dueDate: due.toISOString().slice(0, 10),
    finalDueDate: final.toISOString().slice(0, 10),
    customer: {
      ssn: digits(ktRaw),
      name,
      email,
      address,
      phone,
    },
    lines: (() => {
      const mapLine = (l, discPct) => ({
        description: l.desc || l.nafn || l.lysing || l.text || l.description || 'Vara',
        quantity: num(l.qty || l.fjoldi || l.quantity || 1),
        unitPriceExcludingVat: num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0),
        vatPercentage: num(l.vsk_pct || l.vsk_prosenta || l.vat || l.vatRate || 24),
        discountPercentage: discPct,
      });
      // 2026-08-19 (Slice 3): when the sale carries PER-LINE discounts
      // (linur[].discount_pct — the editor's Afsl.% column), bill each line at its
      // OWN %, so „15% á tækjalínunum, 0% á byrjunargjaldi" berst í bankakröfuna
      // NÁKVÆMLEGA eins og prentað er — í stað þess að jafna út í eina prósentu.
      const anyLinePct = linur.some(l => num(l.discount_pct) > 0);
      if (anyLinePct) {
        // Öryggisvörn: treystum per-line % AÐEINS ef það endurskapar geymt
        // upphaed_an_vsk. Ver gegn eldri „double-encoded" röðum þar sem verðið er
        // ÞEGAR lækkað OG discount_pct enn sett (t.d. R-000461) — þar myndi per-line
        // tvöfalda afsláttinn. Passar ekki → föllum í uniform-afleiðsluna að neðan.
        const perLineNet = linur.reduce((s, l) => s + num(l.qty || l.fjoldi || l.quantity || 1)
          * num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0)
          * (1 - Math.max(0, Math.min(100, num(l.discount_pct))) / 100), 0);
        const target = num(sale.upphaed_an_vsk);
        // 2026-08-19: treystum per-line % AÐEINS ef það endurskapar geymt upphaed_an_vsk.
        // Áður stytti `!(target > 0)` framhjá vörninni þegar target var 0/null/neikvætt —
        // en það er EINMITT þar sem tvíkóðun tvöfaldar afsláttinn: kreditnóta ber
        // neikvætt target og double-encoded eldri raðir bera 0/null. 100% afsláttur
        // stenst enn (perLineNet 0 === target 0). Passar ekki → uniform-afleiðslan að neðan.
        if (Math.abs(perLineNet - target) <= 2) {
          return linur.map(l => mapLine(l, Math.max(0, Math.min(100, num(l.discount_pct)))));
        }
      }
      // Enginn per-line afsláttur → afleiðum EINA prósentu úr line-verðum ex-VAT vs
      // solur.upphaed_an_vsk (final ex-VAT eftir afslátt). Handlar alla vistunar-
      // hætti: afslattur=0, ex-VAT afslattur, m.vsk afslattur (bakað í line-verð).
      // Baked per-line afslættir (verð þegar lækkað, discount_pct=0) lenda hér með
      // lineDiscountPct=0 og rukkast eins og prentað (afslátturinn er í verðinu).
      const lineTotalEx = linur.reduce((s, l) => s + num(l.qty || l.fjoldi || l.quantity || 1) * num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0), 0);
      const targetExVat = num(sale.upphaed_an_vsk);
      let lineDiscountPct = 0;
      if (lineTotalEx > 0 && targetExVat > 0 && targetExVat < lineTotalEx - 0.5) {
        lineDiscountPct = Math.max(0, Math.min(100, (1 - targetExVat / lineTotalEx) * 100));
      }
      return linur.map(l => mapLine(l, lineDiscountPct));
    })(),
    currencyCode: 'ISK',
    // 'send' → SENT (Payday klárar + afhendir strax); 'draft' → DRAFT (aðeins drög
    // í Payday, þú sendir handvirkt þaðan).
    status: mode === 'draft' ? 'DRAFT' : 'SENT',
    reference: sale.num ? String(sale.num) : null,
    // Sölunótan (m.a. „Beiðni nr: …" sem beiðni-gate 264 skrifar fyrir Colas o.fl.)
    // fylgir á Payday-kröfuna svo kúnninn sjái sitt pöntunar-/beiðninúmer á
    // reikningnum eins og á kvittuninni (2026-07-13). Tómt → sleppt.
    description: [_vegna, _notes].filter(Boolean).join(' · ') || null,
    sendEmail: emailSend,
    createClaim: true,
    createElectronicInvoice: electronic,
  };
}

// ---- Supabase reads/writes --------------------------------------------------

async function fetchSale(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/solur?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error('Supabase solur fetch ' + r.status);
  const rows = await r.json();
  return rows[0] || null;
}

// Tvítakavörn: finna aðra sölu á sömu kennitölu, með sömu samtölu og nákvæmlega
// sömu línur (jsonb er kanónískt raðað svo JSON.stringify ber saman byte-eins),
// sem er ÞEGAR farin í kröfu. Gengur fram hjá göngukúnna-kt (9999...) og
// kreditfærslum. Skilar fyrstu samsvörun eða null.
async function findBilledTwin(sale) {
  const kt = String(sale.customer_kt || '').trim();
  const ktDigits = kt.replace(/\D/g, '');
  if (!ktDigits || ktDigits === '9999999999') return null;
  const samtals = Number(sale.samtals);
  if (!Number.isFinite(samtals) || samtals === 0) return null;
  const url = `${SUPABASE_URL}/rest/v1/solur`
    + `?customer_kt=eq.${encodeURIComponent(kt)}`
    + `&samtals=eq.${encodeURIComponent(samtals)}`
    + `&id=neq.${encodeURIComponent(sale.id)}`
    + `&krafa_sent_at=not.is.null`
    + `&select=id,num,samtals,linur,krafa_sent_at,is_credit,status&limit=10`;
  try {
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) return null;   // vörnin má aldrei fella löglega sendingu á netvillu
    const rows = await r.json();
    const mine = JSON.stringify(sale.linur || null);
    return rows.find(x => !x.is_credit && String(x.status || '') !== 'void' && JSON.stringify(x.linur || null) === mine) || null;
  } catch (_) { return null; }
}
async function fetchFyrirtaeki(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/fyrirtaeki?id=eq.${encodeURIComponent(id)}&select=id,nafn,kennitala,netfang,heimilisfang,payday_delivery,skyrsla_med_krofu,bokunarnumer`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}
async function fetchCustomerBase(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/customers_base?id=eq.${encodeURIComponent(id)}&select=id,nafn,kennitala,netfang,heimilisfang,simi`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}
async function markSaleInvoiced(saleId, created) {
  const payloadId = created && (created.id || created.invoiceId || created.number) || null;
  const now = new Date().toISOString();
  // 2026-08-13 (Agnar): kröfusending LYFTIR stöðunni í 'final'. Áður sat salan
  // áfram sem 'drog' þótt hún væri rukkuð og greidd (6 slíkar, 264.302 kr) og
  // tekjuskýrslur sem sía á status='final' undirtöldu um þá upphæð. Sending er
  // frágangur — verkið er klárað um leið og krafan fer í banka.
  const body = { invoiced_at: now, krafa_sent_at: now, status: 'final' };
  if (payloadId) body.dk_invoice_id = String(payloadId);
  return fetch(`${SUPABASE_URL}/rest/v1/solur?id=eq.${encodeURIComponent(saleId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function clearSaleInvoiced(saleId) {
  // Reverse markSaleInvoiced so a cancelled krafa can be re-created.
  return fetch(`${SUPABASE_URL}/rest/v1/solur?id=eq.${encodeURIComponent(saleId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({ invoiced_at: null, krafa_sent_at: null, dk_invoice_id: null }),
  });
}

// ---- Payday auth + create --------------------------------------------------

async function getAccessToken() {
  const cached = await readCachedToken();
  if (cached && cached.access_token && cached.exp_ts && cached.exp_ts > Date.now() + 30_000) {
    return cached.access_token;
  }
  const tokenUrl = API_BASE + TOKEN_PATH;
  const r = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      'Api-Version': API_VERSION,
    },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  if (!r.ok) {
    const txt = (await r.text()).slice(0, 300);
    throw new Error(`Payday token ${r.status}: ${txt}`);
  }
  const tok = await r.json();
  const access = tok.accessToken || tok.access_token || tok.token;
  if (!access) throw new Error('Payday token vantar í svar');
  const expSec = Number(tok.expiresIn || tok.expires_in || 86400);
  const exp_ts = Date.now() + (expSec * 1000) - 60_000;
  await writeCachedToken({ access_token: access, exp_ts }).catch(()=>{});
  return access;
}

async function findOrCreateCustomer(token, custObj) {
  if (!custObj || !custObj.ssn) throw new Error('Customer ssn vantar í payload — get ekki stofnað kúnna í Payday');
  const out = { lookup: null, created: null, customerId: null };
  const targetSsn = String(custObj.ssn).replace(/\D/g, '');
  // Try lookup by ssn first — NB Payday's ?ssn= filter virkar EKKI sem útilokari
  // (skilar öllum kúnnum); þess vegna FILTRUM við niðurstöðurnar handvirkt eftir.
  const lookupUrl = API_BASE + '/customers?ssn=' + encodeURIComponent(custObj.ssn);
  const lookup = await fetch(lookupUrl, {
    headers: {
      Authorization: `Bearer ${token}`, Accept: 'application/json',
      'Api-Version': API_VERSION,
    },
  });
  const lookupTxt = await lookup.text();
  try { out.lookup = JSON.parse(lookupTxt); } catch(_) { out.lookup = { raw: lookupTxt }; }
  if (lookup.ok) {
    const items = Array.isArray(out.lookup) ? out.lookup : (out.lookup.data || out.lookup.items || out.lookup.customers || []);
    // CRITICAL: filter items by actual ssn match (Payday hunsar ?ssn= filter)
    const matched = items.filter(it => {
      const iSsn = String(it.ssn || it.SSN || it.ssNumber || '').replace(/\D/g, '');
      return iSsn === targetSsn;
    });
    if (matched.length) {
      const it = matched[0];
      out.customerId = it.id || it.customerId || it.ID || it.uuid || null;
      if (out.customerId) {
        // Netfangið í OKKAR skrá er sannleikurinn: Payday notar netfangið á
        // SÍNUM kúnna fyrir sendEmail, svo ef það er gamalt/tómt fer PDF-inn
        // á rangan stað þótt skráin okkar sé rétt. Best-effort samstilling —
        // má aldrei fella sendinguna sjálfa.
        const ourEmail = String(custObj.email || '').trim();
        const theirEmail = String(it.email || '').trim();
        if (ourEmail && ourEmail.toLowerCase() !== theirEmail.toLowerCase()) {
          try {
            const up = await fetch(API_BASE + '/customers/' + encodeURIComponent(out.customerId), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json', Accept: 'application/json',
                Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
              },
              body: JSON.stringify({
                name: custObj.name || it.name,
                ssn: custObj.ssn,
                email: ourEmail,
                address: custObj.address || undefined,
                phone: custObj.phone || undefined,
              }),
            });
            out.email_synced = up.ok ? ((theirEmail || '(tómt)') + ' → ' + ourEmail) : ('mistókst (HTTP ' + up.status + ')');
          } catch (e) { out.email_synced = 'mistókst: ' + String(e.message || e); }
        }
        return out;
      }
    }
  }
  // Engin match í lookup → stofna nýjan
  const createR = await fetch(API_BASE + '/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
    },
    body: JSON.stringify({
      name: custObj.name,
      ssn: custObj.ssn,
      email: custObj.email || undefined,
      address: custObj.address || undefined,
      phone: custObj.phone || undefined,
    }),
  });
  const txt = await createR.text();
  try { out.created = JSON.parse(txt); } catch(_) { out.created = { raw: txt }; }
  if (!createR.ok) throw new Error(`Payday customer create ${createR.status}: ${txt.slice(0,500)}`);
  const d = out.created;
  out.customerId = d.id || d.customerId || d.ID || d.uuid || (d.customer && (d.customer.id || d.customer.customerId)) || (d.data && (d.data.id || d.data.customerId)) || null;
  if (!out.customerId) throw new Error('Payday customer id vantar í svar: ' + txt.slice(0, 300));
  // SAFETY: verify the created customer has the right ssn (catch bug-like Agnar-leak)
  const createdSsn = String(d.ssn || d.SSN || '').replace(/\D/g, '');
  if (createdSsn && createdSsn !== targetSsn) {
    throw new Error('Payday skilaði kúnna með RANGA kennitölu (' + createdSsn + ' vs ' + targetSsn + ')');
  }
  return out;
}

async function cancelInvoice(token, invoiceId) {
  // Payday cancels a SENT invoice via PUT /invoices/:id (verified against the
  // official API collection), NOT DELETE/PATCH. Two steps:
  //   1. Cancel the bank claim:  { status:'SENT', claimCancelledDate }
  //   2. Cancel the invoice:     { status:'CANCELLED', cancelledDate }
  // Step 1 is best-effort (an invoice with no claim still cancels in step 2).
  const today = new Date().toISOString().slice(0, 10);
  const put = async (bodyObj) => {
    const r = await fetch(API_BASE + '/invoices/' + encodeURIComponent(invoiceId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
      },
      body: JSON.stringify(bodyObj),
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch (_) { data = { raw: txt }; }
    return { ok: r.ok, status: r.status, data, txt };
  };
  const steps = [];
  // 1. Cancel the claim in the customer's bank (keeps the invoice SENT).
  const claim = await put({ status: 'SENT', claimCancelledDate: today });
  steps.push({ step: 'cancel-claim', status: claim.status, ok: claim.ok });
  // 2. Cancel the invoice itself.
  const inv = await put({ status: 'CANCELLED', cancelledDate: today });
  steps.push({ step: 'cancel-invoice', status: inv.status, ok: inv.ok });
  if (!inv.ok) {
    throw new Error('Payday cancel-invoice mistókst (' + inv.status + '): ' +
      inv.txt.slice(0, 300) + ' — skref: ' + JSON.stringify(steps));
  }
  return { method: 'PUT', steps, data: inv.data };
}

async function createInvoice(token, payload, attachment) {
  let r;
  if (attachment && attachment.bytes) {
    // Multipart: Payday "Create invoice with attachment" — field `data` holds
    // the invoice JSON, `attachment1` the PDF. fetch sets the multipart
    // Content-Type + boundary itself (do NOT set it manually).
    const fd = new FormData();
    fd.append('data', JSON.stringify(payload));
    fd.append('attachment1', new Blob([attachment.bytes], { type: 'application/pdf' }), attachment.name || 'skyrsla.pdf');
    r = await fetch(API_BASE + INVOICES_PATH, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION },
      body: fd,
    });
  } else {
    r = await fetch(API_BASE + INVOICES_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
      },
      body: JSON.stringify(payload),
    });
  }
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch(_) { data = { raw: txt }; }
  if (!r.ok) throw new Error(`Payday invoice ${r.status}: ${txt.slice(0,500)}`);
  return data;
}

// ── Report (úttektarskýrsla) PDF lookup + download ───────────────────────────
// Resolves the inspection report PDF for a sale and returns its bytes. Caller
// MUST have already verified sale.source==='uttekt' (safety gate). Source order:
//   1. explicit storage_path (test / client-provided)
//   2. AppSettings.company_attachments[customer_id] — kind='skyrsla', matching year
//   3. customer_documents.storage_path (Drive-indexed rows that were mirrored)
// All live in the Supabase `samningar` storage bucket. Returns null if none.
async function findReportPdf(sale, explicitPath) {
  let path = explicitPath || null;
  const year = String(new Date(sale.created_at).getFullYear());
  const coId = sale.customer_id;
  if (!path && coId) {
    const settings = await fetchAppSettings();
    const list = settings && settings.company_attachments && settings.company_attachments[String(coId)];
    if (Array.isArray(list)) {
      const hit = list.find(a => a && a.kind === 'skyrsla' && String(a.year || '') === year)
               || list.find(a => a && a.kind === 'skyrsla'); // any skýrsla if the year doesn't line up
      if (hit && hit.path) path = hit.path;
    }
  }
  if (!path && coId) {
    const cd = await fetchReportDoc(coId, year);
    if (cd && cd.storage_path) path = cd.storage_path;
  }
  if (!path) return null;
  // Sumar vistaðar slóðir bera bucket-nafnið fremst („samningar/company_...")
  // — þá varð URL-ið samningar/samningar/... og storage svaraði 400, svo
  // skýrslan fylgdi aldrei hjá þeim félögum (fannst 13.08 á sölu R-000395).
  path = String(path).replace(/^\/?(?:samningar\/)+/, '');
  const objUrl = `${SUPABASE_URL}/storage/v1/object/samningar/` + path.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(objUrl, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!r.ok) throw new Error('storage download ' + r.status + ' fyrir ' + path);
  const buf = Buffer.from(await r.arrayBuffer());
  const name = (path.split('/').pop() || 'skyrsla.pdf').replace(/^\d+_/, '');
  return { bytes: buf, name, path };
}

async function fetchAppSettings() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?id=eq.1&select=settings`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return (rows[0] && rows[0].settings) || null;
  } catch (_) { return null; }
}
async function fetchReportDoc(coId, year) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customer_documents?fyrirtaeki_id=eq.${encodeURIComponent(coId)}&doc_type=in.(uttektarskyrsla,uttektarsk%C3%BDrsla)&year=eq.${encodeURIComponent(year)}&storage_path=not.is.null&select=storage_path&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
  } catch (_) { return null; }
}

async function readCachedToken() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_kv?key=eq.payday_oauth_slokk&select=value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows.length) return null;
    return rows[0].value || null;
  } catch (_) { return null; }
}
async function writeCachedToken(value) {
  return fetch(`${SUPABASE_URL}/rest/v1/app_kv?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ key: 'payday_oauth_slokk', value, updated_at: new Date().toISOString() }),
  });
}

// ---- helpers ---------------------------------------------------------------

function digits(s) { return String(s || '').replace(/\D+/g, ''); }
// Netfang úr streng sem gæti innihaldið mörg (komma/semíkomma/bil):
// bókhaldslegt netfang (reikning-/bokhald-/billing-/invoice-) tekur forgang,
// annars fyrsta gilda netfangið.
function pickBillingEmail(s) {
  const parts = String(s || '').split(/[,;\s]+/).map(x => x.trim())
    .filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  return parts.find(x => /reikning|bokhald|bókhald|billing|invoice|account/i.test(x)) || parts[0] || '';
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function tryParseJson(s) { try { return JSON.parse(s); } catch(_) { return null; } }
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-eldklar-key',
  };
}
function json(code, obj) {
  return { statusCode: code, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
