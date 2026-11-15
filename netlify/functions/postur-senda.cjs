// postur-senda.cjs — öll póstsending Slökkvitæki-appsins fer hér um (15.11.2026).
//
// HVERS VEGNA: póstþjónninn er brunaholf /api/gmail-send (sendir gegnum tengda Gmail-pósthólfið). Hann svaraði
// ÖLLUM án innskráningar, svo hver sem er gat sent póst sem eldklar@/bokhald@ og látið senda sér skrár úr Drive-inu.
// Agnar 15.11.2026: „Já, smíða" við „Ég loka fyrst póstsendingunni (gmail-send) svo aðeins innskráðir geti sent".
// gmail-send hleypir nú aðeins inn innskráðum á Brunahólfi eða þjóni með tíma-tóka. Vafrinn hér getur ekki sent
// Brunahólfs-kökuna (annar vefur), svo hann kallar á ÞETTA fall á sama vef:
//   1. innskráning appsins er krafin (_starfshlid.cjs — sama hlið og gatt-admin o.fl.; 401 án hennar);
//   2. beiðnin fer ÓBREYTT til gmail-send með tókanum x-postur-toki
//      (HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY, 'postur-senda|<mínúta>'), gildir 10 mín — sjá brunaholf/_postur-toki.js);
//   3. svar gmail-send skilast óbreytt (staða + JSON), svo 254-receipt-sender.js og allir AppMail-kallendur
//      sjá sömu villuboð og áður (422 ATTACHMENTS_FAILED, NOT_CONNECTED, SCOPE_MISSING …).
//
//   GET  /api/postur-senda?status=1  → hvaða pósthólf geta sent (gmail-send GET)
//   POST /api/postur-senda           → sama meginmál og gmail-send POST; { prufa:true } sendir EKKERT (prófar leiðina)
//
// Innfelldar Brunahólfs-síður í appinu (iframe) senda líka hingað um postMessage-brú í 254-receipt-sender.js.

const crypto = require('crypto');
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');   // starfsmannahliðið (15.11.2026)

const MARK = 'https://brunaholf.netlify.app/api/gmail-send';
const HAUS = 'x-postur-toki';

function posturToki(ms = Date.now()) {
  const m = Math.floor(ms / 60000);
  return m + '.' + crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('postur-senda|' + m).digest('hex');
}

// Netlify drepur fallið eftir ~10 s og vafrinn fengi þá 502 án JSON — meðan gmail-send gæti enn verið að senda.
// Við hættum því sjálf að bíða 9 s frá upphafi og segjum hreint út að pósturinn GÆTI hafa farið (netvörður 15.11.2026).
const FRESTUR_MS = 9000;

exports.handler = async (event) => {
  const t0 = Date.now();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });

  const g = await H.krefjastStarfsmanns(event);
  if (g) return g;

  const hausar = { [HAUS]: posturToki(), 'user-agent': 'slokkvitaeki-postur-senda' };
  // Venjulegur (ref'd) teljari, ekki AbortSignal.timeout: sá er unref'd og heldur ekki ferlinu á lífi.
  const ac = new AbortController();
  const teljari = setTimeout(() => ac.abort(), Math.max(2000, FRESTUR_MS - (Date.now() - t0)));
  let r, texti;
  try {
    if (event.httpMethod === 'GET') {
      r = await fetch(MARK + '?status=1', { headers: hausar, signal: ac.signal });
    } else {
      const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '{}');
      r = await fetch(MARK, { method: 'POST', headers: { ...hausar, 'content-type': 'application/json' }, body, signal: ac.signal });
    }
    texti = await r.text();
  } catch (e) {
    if (ac.signal.aborted) {
      return P.json(504, { error: 'POSTUR_TIMEOUT', message: 'Póstþjónninn svaraði ekki í tæka tíð. Pósturinn GÆTI hafa farið — athugaðu Sent-möppuna áður en þú sendir aftur.' });
    }
    // Beiðnin gæti hafa náð alla leið þótt svarið týndist — segjum það, svo enginn sendi kúnna tvisvar.
    return P.json(502, { error: 'POSTUR_OFFLINE', message: 'Náði ekki sambandi við póstþjóninn (' + String((e && e.message) || e).slice(0, 120) + '). Athugaðu Sent-möppuna áður en þú sendir aftur.' });
  } finally {
    clearTimeout(teljari);
  }
  let svar = texti;
  try { JSON.parse(texti); } catch (_) { svar = JSON.stringify({ error: 'POSTUR_BAD_RESPONSE', message: 'Póstþjónninn svaraði HTTP ' + r.status + ' án JSON.' }); }
  return { statusCode: r.status, headers: P.secHeaders(), body: svar };
};

module.exports.posturToki = posturToki;
