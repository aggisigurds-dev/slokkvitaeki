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

  // Cancel/delete-mode: tekur payday_invoice_id og eyðir drögum úr Payday.
  if (body.action === 'cancel' && body.payday_invoice_id) {
    try {
      const token = await getAccessToken();
      const result = await cancelInvoice(token, body.payday_invoice_id);
      return json(200, { ok: true, cancelled: body.payday_invoice_id, result });
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
    // Customer enrichment — try in order: customer_base_id → customer_id (fyrirtaeki).
    // sale.customer_kt + sale.customer_nafn are authoritative if present (POS writes them).
    let customer = null;
    if (sale.customer_base_id) customer = await fetchCustomerBase(sale.customer_base_id);
    if (!customer && sale.customer_id) customer = await fetchFyrirtaeki(sale.customer_id);
    // Staður (starfsstöð) fyrir „Vegna:" á kröfunni — customer_id bendir á fyrirtaeki-staðinn.
    let site = null;
    if (sale.customer_id) { try { site = await fetchFyrirtaeki(sale.customer_id); } catch (_) {} }

    const payload = buildPayload(sale, customer, { mode, site });

    // ── Delivery override (used by the test send + explicit email requests) ──
    // delivery:'email' forces the invoice to be e-mailed to the customer (no
    // electronic-invoice attempt); email_override sets the recipient address.
    if (body.email_override) payload.customer.email = String(body.email_override).trim();
    if (body.delivery === 'email') { payload.createElectronicInvoice = false; payload.sendEmail = true; }
    else if (body.delivery === 'electronic') { payload.createElectronicInvoice = true; payload.sendEmail = false; }

    // ── Úttektarskýrsla fylgiskjal — ONLY for inspection invoices ──────────
    // HARD SAFETY GATE: attach the report ONLY when the sale really is an
    // úttekt (source==='uttekt'). A regular POS sale (source 'pos'/'sott'/null)
    // can NEVER carry the report, even if the client asks for it.
    const attachReport = body.attach_report !== false; // default on
    let attachment = null, attachSkipReason = null;
    if (attachReport) {
      if (sale.source !== 'uttekt') {
        attachSkipReason = 'sale.source er ekki uttekt (' + (sale.source || 'null') + ') — engin skýrsla fest';
      } else {
        try {
          attachment = await findReportPdf(sale, body.report_storage_path);
          if (!attachment) attachSkipReason = 'engin úttektarskýrsla fannst fyrir þennan reikning/ár';
        } catch (e) { attachSkipReason = 'skýrslu-sókn brást: ' + String(e.message || e); }
      }
    } else {
      attachSkipReason = 'attach_report=false';
    }

    const custEmail = payload.customer.email || (customer && customer.netfang) || '';
    if (dry) return json(200, {
      ok: true, dry: true, mode, payload, sale, customer,
      attachment: attachment ? { name: attachment.name, bytes: attachment.bytes.length, path: attachment.path } : null,
      would_attach: !!attachment,
      attach_skip_reason: attachSkipReason,
      delivery: payload.createElectronicInvoice ? 'electronic' : (payload.sendEmail ? 'email' : 'none'),
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
  // Netfang getur verið margar tölvupóstföng aðskilin með kommu/semíkommu
  // (t.d. "reikningar@x.is, bokhald@x.is") — Payday hafnar því á kúnna-stofnun.
  // Notum FYRSTA gilda netfangið.
  const email = firstEmail((customer && customer.netfang) || '');
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
  const _vegnaLabel = _siteOk ? [_site.nafn, _site.heimilisfang].filter(Boolean).join(' – ')
                              : (sale.customer_nafn || '');
  const _vegna = _vegnaLabel ? ('Vegna: ' + _vegnaLabel) : '';
  const _notes = (sale.athugasemdir || '').trim();
  // Afhending: í 'send' ham → rafrænt fyrst ef raunveruleg kt, annars tölvupóstur.
  // Í 'draft' ham → ekkert afhent (aðeins drög í Payday sem sent er handvirkt).
  // Rafrænt getur klikkað (kúnni tekur ekki við rafrænum) → handler reynir aftur
  // án rafræns svo reikningurinn lendi samt í Payday.
  const ssnDigits = digits(ktRaw);
  const realKt = ssnDigits.length === 10 && ssnDigits !== '9999999999';
  const electronic = mode === 'send' && realKt;
  const emailSend = mode === 'send' && !electronic && !!email;
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
      // Reikna discount % út frá samtali line-verða ex-VAT vs solur.upphaed_an_vsk
      // (sem er final ex-VAT eftir afslátt). Þetta handlar alla 3 POS-vistunar-
      // hætti: (a) afslattur=0, (b) afslattur ex-VAT (pre-2026-06-12),
      // (c) afslattur m.vsk (post-2026-06-12, með ratio bakaðri í line-verð líka).
      const lineTotalEx = linur.reduce((s, l) => {
        const lqty = num(l.qty || l.fjoldi || l.quantity || 1);
        const lpx = num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0);
        return s + lqty * lpx;
      }, 0);
      const targetExVat = num(sale.upphaed_an_vsk);
      let lineDiscountPct = 0;
      if (lineTotalEx > 0 && targetExVat > 0 && targetExVat < lineTotalEx - 0.5) {
        lineDiscountPct = Math.max(0, Math.min(100, (1 - targetExVat / lineTotalEx) * 100));
      }
      return linur.map(l => ({
        description: l.desc || l.nafn || l.lysing || l.text || l.description || 'Vara',
        quantity: num(l.qty || l.fjoldi || l.quantity || 1),
        unitPriceExcludingVat: num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0),
        vatPercentage: num(l.vsk_pct || l.vsk_prosenta || l.vat || l.vatRate || 24),
        discountPercentage: lineDiscountPct,
      }));
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
async function fetchFyrirtaeki(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/fyrirtaeki?id=eq.${encodeURIComponent(id)}&select=id,nafn,kennitala,netfang,heimilisfang`, {
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
  const body = { invoiced_at: now, krafa_sent_at: now };
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
      if (out.customerId) return out;
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
  // Reyna fyrst DELETE /invoices/{id}; ef Payday styður ekki, falla á PATCH status='DELETED' eða 'CANCELLED'
  const tryReq = async (method, body) => {
    const opts = {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
        ...(body ? {'Content-Type':'application/json'} : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(API_BASE + '/invoices/' + encodeURIComponent(invoiceId), opts);
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch(_) { data = { raw: txt }; }
    return { ok: r.ok, status: r.status, data, txt };
  };
  const attempts = [];
  // DELETE
  let r = await tryReq('DELETE'); attempts.push({method:'DELETE', status:r.status});
  if (r.ok) return { method: 'DELETE', ...r.data };
  // PATCH status=DELETED
  r = await tryReq('PATCH', { status: 'DELETED' }); attempts.push({method:'PATCH-DELETED', status:r.status});
  if (r.ok) return { method: 'PATCH-DELETED', ...r.data };
  // PATCH status=CANCELLED
  r = await tryReq('PATCH', { status: 'CANCELLED' }); attempts.push({method:'PATCH-CANCELLED', status:r.status});
  if (r.ok) return { method: 'PATCH-CANCELLED', ...r.data };
  throw new Error('Payday cancel mistókst — reyndi DELETE + PATCH variants. Sjá log: ' + JSON.stringify(attempts));
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
// Fyrsta gilda netfangið úr streng sem gæti innihaldið mörg (komma/semíkomma/bil).
function firstEmail(s) {
  const parts = String(s || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
  const valid = parts.find(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  return valid || '';
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function tryParseJson(s) { try { return JSON.parse(s); } catch(_) { return null; } }
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
function json(code, obj) {
  return { statusCode: code, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
