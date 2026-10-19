/**
 * SMS send proxy — server-side wrapper around Twilio (19.10.2026).
 *
 * Hvers vegna:
 *   33-sms-reminder.js sendi áður BEINT á api.twilio.com úr vafranum með Account SID
 *   og Auth Token lesnum úr localStorage hverrar vélar. Leyndarmál eiga ekki heima í
 *   vafra (regla Agnars 15.10.2026: engar per-tækis stillingar — og lyklar mega EKKI
 *   fara í app_settings, anon-lykillinn les töfluna). Þau búa hér, í Netlify env:
 *
 *     TWILIO_SID    — Account SID (ACxxxxxxxx)
 *     TWILIO_TOKEN  — Auth Token
 *     TWILIO_FROM   — sendandanúmer á E.164-sniði (+354…)
 *
 * Endapunktar:
 *   GET  /api/sms-send              → { stillt: bool, sid: bool, token: bool, from: bool }
 *                                     (aðeins HVORT breyturnar séu til — aldrei gildin)
 *   POST /api/sms-send              Body: { to, body, tegund?, nafn?, jobId?, uppruni? }
 *                                   → { ok, sid, status, to } eða { error, message }
 *                                   Hver tilraun (líka misheppnuð) er skráð í töfluna sms_saga.
 *
 * Gátt: sama default-open EDGE_SHARED_KEY-gáttin og email-send.js — þvinguð AÐEINS
 * þegar EDGE_SHARED_KEY er sett (290-api-key-header.js setur hausinn sjálfkrafa).
 */
const JSON_H = { 'Content-Type': 'application/json' };

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}

function svar(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...JSON_H, ...cors() } });
}

// Sama regla og normalizePhone í 33: íslenskt 7 stafa númer → +354, 00354 → +354.
function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[\s\-().]/g, '');
  if (p.startsWith('00354')) return '+' + p.slice(2);
  if (!p.startsWith('+')) {
    if (p.length === 7) return '+354' + p;
    if (p.length === 10 && p.startsWith('354')) return '+' + p;
    return '+354' + p;
  }
  return p;
}

// Saga: ein röð per tilraun í sms_saga. Skrifað með service-lykli þjónsins (taflan er aðeins lesanleg
// úr appinu). Kastar ALDREI — sagan má ekki breyta niðurstöðu sendingarinnar.
async function skraSogu(r) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  try {
    const x = await fetch(`${url}/rest/v1/sms_saga`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(r),
      signal: AbortSignal.timeout(4000),
    });
    return x.ok;
  } catch (_) { return false; }
}

// VÖRN GEGN MISNOTKUN (19.10.2026). Endapunkturinn sendir SMS á hvaða númer sem er á reikning Agnars, og
// EDGE_SHARED_KEY-gáttin er ekki virk í framleiðslu (enginn lykill í Netlify env), svo hver sem er gat kallað á hann.
//   · Upprunaathugun: POST verður að koma úr appinu (Origin/Referer = slokkvitaeki.netlify.app) — stöðvar vefsíður
//     annarra; stöðvar EKKI skriftu sem falsar haus, þess vegna líka:
//   · Þak: mest 10 SMS á mínútu og 150 á sólarhring (talið í sms_saga). Fail-closed ef talning mistekst.
const LEYFDUR_UPPRUNI = /^https:\/\/slokkvitaeki\.netlify\.app(\/|$)|^http:\/\/localhost(:\d+)?(\/|$)/;
async function utanThaks() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 'ekki hægt að telja sendingar (Supabase stillt vantar)';
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const fra = (ms) => new Date(Date.now() - ms).toISOString();
  try {
    const q = async (ms, n) => {
      const r = await fetch(`${url}/rest/v1/sms_saga?select=id&status=in.(sent,pending)&created_at=gte.${encodeURIComponent(fra(ms))}&limit=${n}`, { headers: h, signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).length;
    };
    if (await q(60 * 1000, 10) >= 10) return 'of mörg SMS á stuttum tíma (mest 10 á mínútu)';
    if (await q(24 * 3600 * 1000, 150) >= 150) return 'sólarhringsþaki náð (150 SMS)';
    return null;
  } catch (e) { return 'ekki hægt að telja sendingar: ' + String((e && e.message) || e); }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });

  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== KEY) return svar({ error: 'unauthorized' }, 401);
  }

  const sid   = (process.env.TWILIO_SID   || '').trim();
  const token = (process.env.TWILIO_TOKEN || '').trim();
  const from  = (process.env.TWILIO_FROM  || '').trim();
  const stillt = !!(sid && token && from);

  if (req.method === 'GET') {
    // Staða aðeins — Stillingar-síðan sýnir „stillt á þjóni: já/nei".
    return svar({ stillt, sid: !!sid, token: !!token, from: !!from });
  }
  if (req.method !== 'POST') return svar({ error: 'GET or POST only' }, 405);

  if (!stillt) {
    return svar({ error: 'TWILIO_NOT_CONFIGURED', message: 'Twilio ekki stillt á þjóni (TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM vantar í Netlify env)' }, 400);
  }

  const uppruni_ = String(req.headers.get('origin') || req.headers.get('referer') || '');
  if (!LEYFDUR_UPPRUNI.test(uppruni_)) return svar({ error: 'FORBIDDEN_ORIGIN', message: 'SMS má aðeins senda úr appinu' }, 403);
  const thak = await utanThaks();
  if (thak) return svar({ error: 'RATE_LIMITED', message: 'SMS stöðvað: ' + thak }, 429);

  let body;
  try { body = await req.json(); } catch (_) { return svar({ error: 'Invalid JSON body' }, 400); }

  const to = normalizePhone(body && body.to);
  const texti = String((body && body.body) || '').trim();
  if (!/^\+\d{7,15}$/.test(to)) return svar({ error: 'Missing/invalid to', message: 'Ógilt símanúmer' }, 400);
  if (!texti) return svar({ error: 'Missing body', message: 'Tóm skilaboð' }, 400);
  if (texti.length > 1600) return svar({ error: 'Body too long', message: 'Skilaboð of löng (>1600 stafir)' }, 400);

  const tegund = String((body && body.tegund) || '').slice(0, 40) || null;
  const nafn = String((body && body.nafn) || '').slice(0, 120) || null;
  const uppruni = String((body && body.uppruni) || '').slice(0, 40) || null;
  const jobId = Number.isFinite(Number(body && body.jobId)) && body.jobId !== '' && body.jobId != null ? Number(body.jobId) : null;
  const grunnur = { tegund, til: to, nafn, texti, job_id: jobId, uppruni };

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: texti }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (j && j.message) || ('Twilio villa ' + r.status);
      await skraSogu({ ...grunnur, status: 'failed', villa: String(msg).slice(0, 300) });
      return svar({ error: 'TWILIO_' + r.status, message: msg }, r.status >= 500 ? 502 : r.status);
    }
    const sagaOk = await skraSogu({ ...grunnur, status: 'sent', twilio_sid: j.sid || null });
    // Aldrei skila auðkennum til baka — aðeins það sem vafrinn þarf.
    return svar({ ok: true, sid: j.sid || null, status: j.status || null, to: j.to || to, saga: sagaOk });
  } catch (e) {
    await skraSogu({ ...grunnur, status: 'failed', villa: String((e && e.message) || e).slice(0, 300) });
    return svar({ error: 'NETWORK', message: String((e && e.message) || e) }, 502);
  }
};

export const config = { path: '/api/sms-send' };
