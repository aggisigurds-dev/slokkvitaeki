// payday-pull-slokk.js — spegla ALLA reikninga SLÖKKVITÆKI Payday-aðgangsins
// inn í `payday_invoices_slokk` (Supabase).
//
// Tilefni (Agnar 2026-07-10): Payday gefur reikningum sín eigin númer. Þegar
// viðskiptavinur hringir og nefnir Payday-númerið finnst ekkert í kerfinu —
// hluti reikninga er stofnaður beint í Payday (t.d. af bókara / mánaðar-
// uppgjör) og á enga solur-röð. Þessi spegill gerir þá leitanlega; patch 253
// birtir þá svo í „Fyrri viðskipti" á Sölu.
//
//   GET /api/payday-pull-slokk?probe=1
//     → auth-test + 3 hráir reikningar (engin skrif). Keyra fyrst.
//   GET /api/payday-pull-slokk[?dry=1][&since=YYYY-MM-DD|&all=1]
//     → ALLTAF dry-run. GET upsertar ALDREI (vörn 2026-08-25).
//   POST /api/payday-pull-slokk[?since=YYYY-MM-DD|&all=1]  (body: { dry?, since?, all? })
//     → sækir og upsertar í payday_invoices_slokk. dry:true → ekkert vistað.
//     → sjálfgefið ~180 dagar; ?all=1 / body.all sækir ALLT.
//
// Notar SÖMU Slökkvitæki-Payday creds og payday-push/payday-sync-paid
// (PAYDAY_CLIENT_ID/SECRET í slokkvitaeki Netlify env; token-cache
// app_kv['payday_oauth_slokk'] — deilt, endurnýtt hér).
// Upsert-lykill: payday_id (innra Payday id; fallback number) — endurkeyrsla
// er örugg og uppfærir stöðu (SENT→PAID o.s.frv.).

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
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}
function json(code, obj) {
  return { statusCode: code, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String((event.headers && event.headers['x-eldklar-key']) || '').trim();
    if (got !== KEY) return json(401, { error: 'unauthorized' });
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return json(405, { error: 'GET eða POST only' });
  if (!CLIENT_ID || !CLIENT_SECRET) return json(500, { error: 'PAYDAY_CLIENT_ID / PAYDAY_CLIENT_SECRET vantar í Netlify env vars.' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, { error: 'Supabase env vantar.' });

  const p = event.queryStringParameters || {};
  let body = {}; try { body = event.body ? JSON.parse(event.body) : {}; } catch (_) {}
  const askedDry = p.dry === '1' || p.dry === 'true' || !!body.dry;
  // GET never writes — even without ?dry=1. POST is the only commit path
  // (payday-sync-cron). audit-payday-get.cjs greps this assignment.
  const isDry = event.httpMethod !== 'POST' || askedDry;
  const all = p.all === '1' || p.all === 'true' || !!body.all;
  const since = all ? null : (body.since || p.since || defaultSince());

  try {
    const token = await getAccessToken();

    if (p.probe) {
      const first = await fetchInvoicesPage(token, 1, 3, since);
      return json(200, { ok: true, probe: true, count: Array.isArray(first) ? first.length : 0, sample: first });
    }

    // Sækja allt (blaðsíðað) og varpa.
    // NB Payday þakkar perpage við 100 (sannreynt live 2026-07-10: beðið um
    // 200, fengum 100) — biðjum því um 100 og höldum áfram á meðan síðan er
    // FULL, annars stoppar blaðsíðunin eftir fyrstu síðu.
    const PER = 100;
    let page = 1, fetched = 0, skipped = 0;
    const byKey = new Map();
    while (page <= 240) {
      const items = await fetchInvoicesPage(token, page, PER, since);
      if (!Array.isArray(items) || !items.length) break;
      fetched += items.length;
      for (const raw of items) {
        const row = mapInvoice(raw);
        if (!row) { skipped++; continue; }
        byKey.set(row.payday_id, row);   // dedupe innan lotu, síðasta vinnur
      }
      if (items.length < PER) break;
      page++;
    }
    const rows = Array.from(byKey.values());

    // Backfill kt for rows Payday returned WITHOUT a kennitala, by EXACT
    // case-folded name match against customers_base. Conservative: only fill
    // when EXACTLY ONE base carries that (folded) name — never guess on an
    // ambiguous name (e.g. two „Þemasnyrting" bases). This makes the kt-less
    // Payday krófur (housing associations etc.) link to their profile durably —
    // survives every re-sync, unlike a manual kt edit the upsert would overwrite.
    let backfilled = 0;
    const needName = rows.some(r => !r.kt && r.customer_name);
    if (needName) {
      const byName = await baseNameIndex();
      for (const r of rows) {
        if (r.kt || !r.customer_name) continue;
        const hit = byName.get(foldName(r.customer_name));
        if (hit && hit.length === 1) { r.kt = hit[0]; backfilled++; }
      }
    }

    if (isDry) {
      return json(200, { ok: true, dry: true, since: since || 'ALLT', fetched, mapped: rows.length, skipped, kt_backfilled: backfilled, sample: rows.slice(0, 8) });
    }

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const slice = rows.slice(i, i + 200);
      const u = await fetch(`${SUPABASE_URL}/rest/v1/payday_invoices_slokk?on_conflict=payday_id`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(slice),
      });
      if (!u.ok) throw new Error('Upsert ' + u.status + ': ' + (await u.text()).slice(0, 200));
      upserted += slice.length;
    }

    return json(200, { ok: true, since: since || 'ALLT', fetched, upserted, skipped, kt_backfilled: backfilled });
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};

// ---- vörpun ------------------------------------------------------------------

function mapInvoice(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pid = pickStr(raw, 'id', 'invoiceId', 'uuid') || pickStr(raw, 'number', 'invoiceNumber');
  if (!pid) return null;
  const customer = raw.customer || raw.client || raw.recipient || {};
  const kt = digits(pickStr(customer, 'kennitala', 'ssn', 'nationalId', 'idNumber')
          || pickStr(raw, 'kennitala', 'ssn', 'customerSsn'));
  const name = pickStr(customer, 'name', 'fullName', 'companyName')
            || pickStr(raw, 'customerName', 'clientName', 'customer_name', 'recipientName');
  return {
    payday_id: pid,
    number: pickStr(raw, 'number', 'invoiceNumber', 'invoice_number', 'no', 'nr') || null,
    kt: kt || null,
    customer_name: name || null,
    amount_ex: num(pick(raw, 'amountExcludingVat', 'amount', 'subtotal', 'amountExVat', 'netAmount')),
    amount_total: num(pick(raw, 'amountIncludingVat', 'amountWithTax', 'total', 'totalAmount', 'grossAmount')),
    created_date: isoDate(pick(raw, 'invoiceDate', 'createdDate', 'created', 'date')),
    due_date: isoDate(pick(raw, 'dueDate', 'due_date', 'gjalddagi')),
    final_due_date: isoDate(pick(raw, 'finalDueDate', 'final_due_date', 'eindagi', 'claimFinalDueDate')),
    paid_date: isoDate(pick(raw, 'paidDate', 'paidAt', 'paid_at', 'paymentDate', 'payment_date')),
    status: pickStr(raw, 'status', 'state', 'paymentStatus') || null,
    reference: pickStr(raw, 'reference', 'tilvisun') || null,
    description: (pickStr(raw, 'description', 'text', 'note') || '').slice(0, 500) || null,
    updated_at: new Date().toISOString(),
  };
}

// ---- Payday (sömu helpers og payday-sync-paid — sannreynt gegn þessum aðgangi)

async function fetchInvoicesPage(token, page, perpage, since) {
  const params = new URLSearchParams();
  params.set('perpage', String(perpage));
  params.set('page', String(page));
  if (since) params.set('dateFrom', since);
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

// ---- helpers -------------------------------------------------------------------

function pickStr(raw, ...keys) { for (const k of keys) { const v = raw && raw[k]; if (v != null && String(v).trim()) return String(v).trim(); } return ''; }
function pick(raw, ...keys) { for (const k of keys) { const v = raw && raw[k]; if (v != null && v !== '') return v; } return null; }
function num(v) { const n = parseFloat(v); return isFinite(n) ? Math.round(n) : null; }
function digits(s) { return String(s || '').replace(/\D/g, ''); }
function isoDate(v) {
  if (!v) return null;
  const s = String(v); const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}
function defaultSince() { const d = new Date(); d.setDate(d.getDate() - 180); return d.toISOString().slice(0, 10); }

// case-fold + NFD-strip diacritics + collapse ws → key for exact-name matching.
// Also strips a trailing Icelandic legal-form suffix (ehf/hf/slf/sf/ses/ohf/…) so
// „Þemasnyrting" og „Þemasnyrting ehf" varpast á sama lykil — the „exactly one
// match" guard still protects against two genuinely different bases colliding.
function foldName(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/[.,]/g, '')
    .replace(/\s+(ehf|ohf|hf|slf|sf|ses|hses)$/,'')
    .trim();
}
// folded-name → [kt-digits, …] index over customers_base (only kts of valid shape)
async function baseNameIndex() {
  const idx = new Map();
  try {
    for (let from = 0; ; from += 1000) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/customers_base?select=nafn,kennitala&kennitala=not.is.null`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Range: `${from}-${from + 999}` },
      });
      if (!r.ok) break;
      const rows = await r.json().catch(() => []);
      for (const b of rows) {
        const k = foldName(b.nafn); const d = digits(b.kennitala);
        if (!k || d.length !== 10) continue;
        const arr = idx.get(k) || []; if (!arr.includes(d)) arr.push(d); idx.set(k, arr);
      }
      if (rows.length < 1000) break;
    }
  } catch (_) {}
  return idx;
}
