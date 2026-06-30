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
  const sendEmail = !!body.sendEmail;
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

    const payload = buildPayload(sale, customer, sendEmail);
    if (dry) return json(200, { ok: true, dry: true, payload, sale, customer });

    const token = await getAccessToken();
    // Payday requires customer to exist first — find by ssn or create.
    const custResult = await findOrCreateCustomer(token, payload.customer);
    const customerId = custResult.customerId;
    // Payday wants customer object with guid id (docs verified 2026-06-30).
    payload.customer = { id: customerId };
    let created;
    try {
      created = await createInvoice(token, payload);
    } catch (invErr) {
      // Surface customer-create response so we can debug field names.
      return json(502, {
        error: String(invErr.message || invErr),
        customer_lookup: custResult.lookup,
        customer_created: custResult.created,
        customerId,
        payload,
      });
    }

    // Writeback: merkja söluna sem invoiced
    await markSaleInvoiced(sale.id, created);

    return json(200, { ok: true, payload, created, customerId });
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};

// ---- payload builder --------------------------------------------------------

function buildPayload(sale, customer, sendEmail) {
  const linur = Array.isArray(sale.linur) ? sale.linur : tryParseJson(sale.linur) || [];
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const due = new Date(today); due.setDate(due.getDate() + 14);
  const final = new Date(today); final.setDate(final.getDate() + 30);

  // sale.customer_kt / customer_nafn first (POS writes them); fall back to enriched customer row.
  const ktRaw = sale.customer_kt || (customer && customer.kennitala) || '';
  const name = sale.customer_nafn || (customer && customer.nafn) || '';
  const email = (customer && customer.netfang) || '';
  const address = (customer && customer.heimilisfang) || '';
  const phone = (customer && customer.simi) || '';
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
      // Auto-detect hvort POS hafi þegar bakað afslátt í line-verð eða ekki.
      // Sjá CLAUDE.md: SalaInvoice.renderFromSale gerir sama auto-detect.
      const lineTotalMvsk = linur.reduce((s, l) => {
        const lvat = num(l.vsk_pct || l.vsk_prosenta || l.vat || l.vatRate || 24);
        const lqty = num(l.qty || l.fjoldi || l.quantity || 1);
        const lpx = num(l.unit_price_ex_vat || l.verd_an_vsk || l.unit_price || l.price || 0);
        return s + lqty * lpx * (1 + lvat/100);
      }, 0);
      const samtals = num(sale.samtals);
      const afslattur = num(sale.afslattur);
      const matchAsIs = Math.abs(lineTotalMvsk - samtals) < 1;
      const matchDiscounted = Math.abs(lineTotalMvsk - afslattur - samtals) < 1;
      let lineDiscountPct = 0;
      if (!matchAsIs && matchDiscounted && lineTotalMvsk > 0) {
        lineDiscountPct = Math.min(100, (afslattur / lineTotalMvsk) * 100);
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
    status: 'DRAFT',
    reference: sale.num ? String(sale.num) : null,
    sendEmail: !!sendEmail && !!((customer && customer.netfang)),
    createClaim: true,
    createElectronicInvoice: false,
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

async function createInvoice(token, payload) {
  const r = await fetch(API_BASE + INVOICES_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION,
    },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch(_) { data = { raw: txt }; }
  if (!r.ok) throw new Error(`Payday invoice ${r.status}: ${txt.slice(0,500)}`);
  return data;
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
