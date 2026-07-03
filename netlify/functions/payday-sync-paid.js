// payday-sync-paid.js — sækja greiðslustöðu úr Payday og merkja greiddar sölur.
//
// Modes:
//   GET  /api/payday-sync-paid?probe=1
//     → auth-test + sýnir 3 hráa reikninga svo hægt sé að staðfesta field-nöfn.
//   POST /api/payday-sync-paid            (body: { dry?, since? })
//     → finnur ógreiddar reikningur-sölur (paid_at null, dk_invoice_id sett),
//       spyr Payday um reikningana og setur solur.paid_at á þá sem eru greiddir.
//       Matchar á dk_invoice_id ↔ Payday id/number/reference (fallback: num).
//     → dry:true → skilar hverjir YRÐU merktir, skrifar EKKI.
//     → since: YYYY-MM-DD (sjálfgefið ~150 dagar aftur) til að takmarka lestur.
//
// Notar SÖMU SLOKKVITAEKI Payday-creds og payday-push (deilir token-cache
// 'payday_oauth_slokk'). Engin ný env.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_ID = process.env.PAYDAY_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYDAY_CLIENT_SECRET;
const API_BASE = (process.env.PAYDAY_API_BASE || 'https://api.payday.is').replace(/\/+$/, '');
const TOKEN_PATH = process.env.PAYDAY_TOKEN_PATH || '/auth/token';
const INVOICES_PATH = process.env.PAYDAY_INVOICES_PATH || '/invoices';
const API_VERSION = process.env.PAYDAY_API_VERSION || 'alpha';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}
function json(code, obj) {
  return { statusCode: code, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  const p = event.queryStringParameters || {};
  let body = {}; try { body = event.body ? JSON.parse(event.body) : {}; } catch (_) {}

  try {
    const token = await getAccessToken();

    if (p.probe) {
      const first = await fetchInvoicesPage(token, 1, 5);
      return json(200, { ok: true, probe: true, count: Array.isArray(first) ? first.length : 0, sample: Array.isArray(first) ? first.slice(0, 3) : first });
    }

    const dry = !!body.dry || !!p.dry;
    const since = body.since || p.since || defaultSince();

    // 1) Ógreiddar reikningur-sölur sem eiga Payday-auðkenni.
    const sales = await fetchUnpaidSales();
    if (!sales.length) {
      return json(200, { ok: true, dry, checked: 0, candidates: 0, marked: [], marked_count: 0, note: 'Engar ógreiddar kröfur með Payday-auðkenni til að athuga.' });
    }
    const byId = new Map(), byNum = new Map();
    for (const s of sales) {
      if (s.dk_invoice_id) byId.set(String(s.dk_invoice_id).trim(), s);
      if (s.num) byNum.set(String(s.num).trim(), s);
    }

    // 2) Sækja Payday-reikninga (blaðsíðað) og safna greiddum sem matcha.
    let page = 1, checked = 0, pagesFetched = 0;
    const hits = new Map(); // sale.id → { sale, paidDate }
    while (page <= 60) {
      const items = await fetchInvoicesPage(token, page, 200, since);
      if (!Array.isArray(items) || !items.length) break;
      checked += items.length; pagesFetched++;
      for (const raw of items) {
        const paidDate = pickPaidDate(raw);
        const status = String(pickStr(raw, 'status', 'state', 'paymentStatus') || '').toLowerCase();
        const isPaid = !!paidDate || /paid|greid|greitt/.test(status);
        if (!isPaid) continue;
        const keys = [raw.id, raw.invoiceId, raw.number, raw.invoiceNumber, raw.reference, raw.tilvisun]
          .map(x => (x == null ? '' : String(x).trim())).filter(Boolean);
        let sale = null;
        for (const k of keys) { if (byId.has(k)) { sale = byId.get(k); break; } }
        if (!sale) for (const k of keys) { if (byNum.has(k)) { sale = byNum.get(k); break; } }
        if (sale && !hits.has(sale.id)) hits.set(sale.id, { sale, paidDate: paidDate || todayIso() });
      }
      if (items.length < 200) break;
      page++;
    }

    // 3) Skrifa paid_at (nema dry).
    const marked = [];
    for (const { sale, paidDate } of hits.values()) {
      marked.push({ num: sale.num, customer: sale.customer_nafn, amount: Math.round(parseFloat(sale.samtals) || 0), paidDate });
      if (!dry) await markPaid(sale.id, paidDate);
    }
    marked.sort((a, b) => (b.paidDate || '').localeCompare(a.paidDate || ''));
    return json(200, { ok: true, dry, checked, pages: pagesFetched, since, candidates: sales.length, marked, marked_count: marked.length });
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};

// ---- Supabase ---------------------------------------------------------------

async function fetchUnpaidSales() {
  const url = `${SUPABASE_URL}/rest/v1/solur?select=id,num,customer_nafn,samtals,dk_invoice_id,paid_at&greitt_med=eq.reikningur&paid_at=is.null&dk_invoice_id=not.is.null&limit=3000`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!r.ok) throw new Error('Supabase solur ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function markPaid(saleId, paidDate) {
  const iso = /^\d{4}-\d{2}-\d{2}/.test(String(paidDate || '')) ? new Date(paidDate).toISOString() : new Date().toISOString();
  return fetch(`${SUPABASE_URL}/rest/v1/solur?id=eq.${encodeURIComponent(saleId)}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ paid_at: iso }),
  });
}

// ---- Payday -----------------------------------------------------------------

async function fetchInvoicesPage(token, page, perpage, since) {
  const params = new URLSearchParams();
  params.set('perpage', String(perpage));
  params.set('page', String(page));
  if (since) params.set('dateFrom', since); // best-effort; skaðlaust ef Payday hunsar
  const url = API_BASE + INVOICES_PATH + '?' + params.toString();
  const r = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Api-Version': API_VERSION },
  });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch (_) { data = null; }
  if (!r.ok) throw new Error(`Payday invoices ${r.status}: ${txt.slice(0, 300)}`);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.invoices)) return data.invoices;
  return [];
}

async function getAccessToken() {
  const cached = await readCachedToken();
  if (cached && cached.access_token && cached.exp_ts && cached.exp_ts > Date.now() + 30_000) {
    return cached.access_token;
  }
  const r = await fetch(API_BASE + TOKEN_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Api-Version': API_VERSION },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`Payday token ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const tok = await r.json();
  const access = tok.accessToken || tok.access_token || tok.token;
  if (!access) throw new Error('Payday token vantar í svar');
  const expSec = Number(tok.expiresIn || tok.expires_in || 86400);
  await writeCachedToken({ access_token: access, exp_ts: Date.now() + (expSec * 1000) - 60_000 }).catch(() => {});
  return access;
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

// ---- helpers ----------------------------------------------------------------

function pickStr(raw, ...keys) { for (const k of keys) { const v = raw && raw[k]; if (v != null && String(v).trim()) return String(v).trim(); } return ''; }
function pickPaidDate(raw) {
  const v = raw && (raw.paidDate || raw.paidAt || raw.paid_at || raw.paymentDate || raw.payment_date || raw.greidsla_date || raw.greidsla);
  if (!v) return '';
  const s = String(v); const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : (isNaN(Date.parse(s)) ? '' : new Date(s).toISOString().slice(0, 10));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function defaultSince() { const d = new Date(); d.setDate(d.getDate() - 150); return d.toISOString().slice(0, 10); }
