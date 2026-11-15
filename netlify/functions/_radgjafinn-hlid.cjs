// _radgjafinn-hlid.cjs — hliðið að Ráðgjafanum (15.11.2026): hver má lesa gluggann og biðja um ný skrif.
//
// HVERS VEGNA SÉR HLIÐ: glugginn ber samantekt úr pósti viðskiptavina, nöfn tengiliða og upphæðir. Mælt 15.11.2026 í
// framleiðslu: P.requireStaff er opið (HUB_STAFF_PASSWORD er ekki sett — gatt-admin svaraði 200 án innskráningar), en
// innskráning appsins er kveikt (GET /api/hub-adgangar → gate: true). Án þessa hliðs gæti hver sem er á netinu lesið
// /api/radgjafinn þótt appið sjálft krefjist innskráningar.
//
// REGLAN: fallið er nákvæmlega jafn lokað og appið.
//   1. P.requireStaff — gildir þegar HUB_STAFF_PASSWORD verður sett (sama og önnur föll).
//   2. Innskráning appsins (hub-adgangar, cookie hub_user): sé hliðið kveikt þarf gilda innskráningu. Spurt er FALL
//      hliðsins sjálft (sami kóði og innskráningarsíðan), ekki afrit af dulrituninni. Svari það ekki → 503 (lokað).
//      Sé slökkt á hliðinu er appið opið og fallið líka — þá er það ákvörðun Agnars, ekki þessa falls.
//   Önnur föll breytast ekki: að tengja ÞAU við innskráninguna er sér-ákvörðun Agnars (sjá haus hub-adgangar.cjs).
//
// MORGUNKALLIÐ: radgjafinn-morgun.cjs (áætlun, 30 s þak) ræsir radgjafinn-background.cjs (15 mín) yfir HTTP og hefur
// enga innskráningu. Það sendir tíma-tóka undirritaðan með þjónustulyklinum (HMAC-SHA256 af „radgjafinn-morgun|<mínúta>"),
// sem aðeins föllin sjálf þekkja. Tókinn gildir í 10 mín. og veitir aðeins rétt til morgunskrifanna.

const crypto = require('crypto');
const P = require('./_portal.cjs');
const HUB = require('./hub-adgangar.cjs');

const MORGUN_HAUS = 'x-radgjafinn-morgun';
const MORGUN_GILDIR_MIN = 10;
const lykill = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const undirrita = (m) => crypto.createHmac('sha256', lykill()).update('radgjafinn-morgun|' + m).digest('hex');

function morgunToki(ms = Date.now()) {
  const m = Math.floor(ms / 60000);
  return m + '.' + undirrita(m);
}

function erMorgunKall(event, ms = Date.now()) {
  if (!lykill()) return false;
  const h = (event && event.headers) || {};
  const [mStr, sig] = String(h[MORGUN_HAUS] || '').split('.');
  const m = Number(mStr), nu = Math.floor(ms / 60000);
  if (!Number.isInteger(m) || m < nu - MORGUN_GILDIR_MIN || m > nu + 1 || !/^[0-9a-f]{64}$/.test(sig || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(undirrita(m), 'hex'));
}

// Skilar null ef beiðnin má halda áfram, annars svarinu sem á að senda (401 / 503).
async function hlid(event) {
  const g = P.requireStaff(event); if (g) return g;
  let s = null;
  try {
    const h = (event && event.headers) || {};
    const r = await HUB.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: { host: 'slokkvitaeki.netlify.app', cookie: h.cookie || h.Cookie || '' } });
    if (r && r.statusCode === 200) s = JSON.parse(r.body);
  } catch (_) { s = null; }
  if (!s || typeof s.gate !== 'boolean') return P.json(503, { error: 'Náði ekki að staðfesta innskráningu — reyndu aftur eftir smá stund' });
  if (s.gate && !s.authed) return P.json(401, { error: 'Innskráning vantar', need_login: true });
  return null;
}

module.exports = { hlid, morgunToki, erMorgunKall, MORGUN_HAUS, MORGUN_GILDIR_MIN };
