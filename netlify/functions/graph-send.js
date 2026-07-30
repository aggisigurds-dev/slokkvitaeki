// graph-send.js — send email as slokkvitaeki@brunaholf.is via Microsoft Graph
//
// App-only (client credentials) flow: the Azure app authenticates itself (no
// user sign-in) and sends on behalf of the MS_SEND_FROM mailbox. This is how
// the 📧 "Senda" buttons deliver reikningar/kvittanir + úttektarskýrslur.
//
// Endpoint:
//   GET  /api/graph-send?status=1   → { configured, from }  (no send)
//   POST /api/graph-send            → { ok:true }
//     body: { to: string|string[], subject, html,
//             attachments?: [{ filename, contentBytes(base64), contentType? }],
//             replyTo?, cc? }
//
// Env vars (set in the slokkvitaeki Netlify site — never commit):
//   MS_TENANT_ID       — brunaholf.is Entra tenant id (GUID)
//   MS_CLIENT_ID       — Azure app registration (client) id
//   MS_CLIENT_SECRET   — client secret value
//   MS_SEND_FROM       — mailbox to send as (default slokkvitaeki@brunaholf.is)
//
// Azure app needs Microsoft Graph Application permission "Mail.Send" with admin
// consent. Recommended: scope it to just this mailbox with an Exchange
// Application Access Policy so the app can only send as slokkvitaeki@brunaholf.is.

const TENANT = process.env.MS_TENANT_ID;
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const SEND_FROM = process.env.MS_SEND_FROM || 'slokkvitaeki@brunaholf.is';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}
function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors() }, body: JSON.stringify(obj) };
}

async function getToken() {
  const url = 'https://login.microsoftonline.com/' + encodeURIComponent(TENANT) + '/oauth2/v2.0/token';
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Token-villa: ' + (j.error_description || j.error || ('HTTP ' + r.status)));
  return j.access_token;
}

function toRecipientList(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split(/[;,]/);
  return arr.map(s => String(s || '').trim()).filter(Boolean).map(a => ({ emailAddress: { address: a } }));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String((event.headers && event.headers['x-eldklar-key']) || '').trim();
    if (got !== KEY) return json(401, { error: 'unauthorized' });
  }

  const configured = !!(TENANT && CLIENT_ID && CLIENT_SECRET);

  if (event.httpMethod === 'GET') {
    const p = event.queryStringParameters || {};
    if (p.status === '1' || p.status === 'true') return json(200, { configured, from: SEND_FROM });
    return json(400, { error: 'GET með ?status=1 fyrir stöðu, POST fyrir sendingu.' });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (!configured) return json(500, { error: 'CONFIG_MISSING', message: 'MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET vantar í Netlify env.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Ógilt JSON' }); }
  const to = toRecipientList(body.to);
  if (!to.length) return json(400, { error: 'Vantar viðtakanda (to).' });
  if (!body.subject) return json(400, { error: 'Vantar efni (subject).' });

  const attachments = (Array.isArray(body.attachments) ? body.attachments : [])
    .filter(a => a && a.contentBytes)
    .map(a => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.filename || 'skjal.pdf',
      contentType: a.contentType || 'application/pdf',
      contentBytes: a.contentBytes,
    }));

  const message = {
    subject: String(body.subject),
    body: { contentType: 'HTML', content: String(body.html || '') },
    toRecipients: to,
  };
  if (body.cc) message.ccRecipients = toRecipientList(body.cc);
  if (body.replyTo) message.replyTo = toRecipientList(body.replyTo);
  if (attachments.length) message.attachments = attachments;

  try {
    const token = await getToken();
    const url = 'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(SEND_FROM) + '/sendMail';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (r.status === 202 || r.status === 200) return json(200, { ok: true, from: SEND_FROM });
    const txt = await r.text().catch(() => '');
    return json(502, { error: 'GRAPH_SEND_FAILED', status: r.status, detail: txt.slice(0, 500) });
  } catch (e) {
    return json(500, { error: String((e && e.message) || e) });
  }
};

exports.config = { path: '/api/graph-send' };
