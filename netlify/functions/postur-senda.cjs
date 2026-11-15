// postur-senda.cjs — öll póstsending Slökkvitæki-appsins fer hér um (15.11.2026).
//
// HVERS VEGNA: póstþjónninn er brunaholf /api/gmail-send (sendir gegnum tengda Gmail-pósthólfið). Hann svaraði
// ÖLLUM án innskráningar, svo hver sem er gat sent póst sem eldklar@/bokhald@ og látið senda sér skrár úr Drive-inu.
// Agnar 15.11.2026: „Já, smíða" við „Ég loka fyrst póstsendingunni (gmail-send) svo aðeins innskráðir geti sent".
// gmail-send hleypir nú aðeins inn innskráðum á Brunahólfi eða þjóni með tíma-tóka. Vafrinn hér getur ekki sent
// Brunahólfs-kökuna (annar vefur), svo hann kallar á ÞETTA fall á sama vef:
//   1. innskráning appsins er krafin (_starfshlid.cjs — sama hlið og gatt-admin o.fl.; 401 án hennar);
//   2. beiðnin fer ÓBREYTT til gmail-send með tókanum x-postur-toki (HUB.posturToki(): HMAC-SHA256 af session_secret
//      úr hub_adgangar_stilling, sameiginlegum báðum vefjum; gildir 10 mín). 16.11.2026: fyrsta útgáfan notaði
//      SUPABASE_SERVICE_ROLE_KEY, en hann er ólíkur á vefjunum — tókanum var hafnað í loftinu og lokunin afturkölluð;
//   3. svar gmail-send skilast óbreytt (staða + JSON), svo 254-receipt-sender.js og allir AppMail-kallendur
//      sjá sömu villuboð og áður (422 ATTACHMENTS_FAILED, NOT_CONNECTED, SCOPE_MISSING …).
//
//   GET  /api/postur-senda?status=1  → hvaða pósthólf geta sent (gmail-send GET)
//   POST /api/postur-senda           → sama meginmál og gmail-send POST; { prufa:true } sendir EKKERT (prófar leiðina)
//        og svarar líka toki_gildur_hja_brunaholf (brunaholf /api/hub-adgangar?postur_prufa=1) — heilsupróf milli vefja.
//
// Innfelldar Brunahólfs-síður í appinu (iframe) senda líka hingað um postMessage-brú í 254-receipt-sender.js.

const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');   // starfsmannahliðið (15.11.2026)
const HUB = require('./hub-adgangar.cjs'); // póst-tókinn (sameiginlegur lykill beggja vefja)

const MARK = 'https://brunaholf.netlify.app/api/gmail-send';
const PRUFA_MARK = 'https://brunaholf.netlify.app/api/hub-adgangar?postur_prufa=1';
const HAUS = HUB.POSTUR_HAUS;

// Netlify drepur fallið eftir ~10 s og vafrinn fengi þá 502 án JSON — meðan gmail-send gæti enn verið að senda.
// Við hættum því sjálf að bíða 9 s frá upphafi og segjum hreint út að pósturinn GÆTI hafa farið (netvörður 15.11.2026).
const FRESTUR_MS = 9000;

exports.handler = async (event) => {
  const t0 = Date.now();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });

  const g = await H.krefjastStarfsmanns(event);
  if (g) return g;

  const toki = await HUB.posturToki();
  if (!toki) return P.json(503, { error: 'POSTUR_TOKI', message: 'Náði ekki í póstlykilinn — reyndu aftur eftir smá stund. Pósturinn var EKKI sendur.' });
  const hausar = { [HAUS]: toki, 'user-agent': 'slokkvitaeki-postur-senda' };
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
  // Heilsupróf: tekur brunaholf við tóka héðan? (sendir ekkert; svarið sést þótt gmail-send sé enn opið)
  if (event.httpMethod === 'POST' && /"prufa"\s*:\s*true/.test(String(event.body || ''))) {
    try {
      const pr = await fetch(PRUFA_MARK, { headers: hausar, signal: AbortSignal.timeout(4000) });
      const pj = await pr.json();
      svar = JSON.stringify({ ...JSON.parse(svar), toki_gildur_hja_brunaholf: pj.postur_toki === true });
    } catch (_) { /* heilsuprófið má aldrei fella svarið */ }
  }
  return { statusCode: r.status, headers: P.secHeaders(), body: svar };
};
