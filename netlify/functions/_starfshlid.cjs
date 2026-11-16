// _starfshlid.cjs — starfsmannahliðið fyrir innri föll (15.11.2026, Agnar: „Já, lokaðu þeim").
//
//   const H = require('./_starfshlid.cjs');
//   … FREMST í handler (á eftir OPTIONS):  const g = await H.krefjastStarfsmanns(event); if (g) return g;
//
// LOKAÐ SJÁLFGEFIÐ. Inn kemst:
//   1. gilt hub_session (sameiginlega lykilorðið) — aðeins ef HUB_STAFF_PASSWORD er sett í Netlify;
//   2. annars innskráning appsins: virkur notandi í notendaskránni (hub-adgangar, cookie hub_user), hvaða rola sem er
//      (Admin / Starfsmaður / Afgreiðsla). Spurt er FALL hliðsins sjálft, eins og _radgjafinn-hlid.cjs gerir — ekki
//      afrit af undirrituninni, svo breytist sniðið í brunaholf/hub-adgangar.js fylgir hliðið með.
//   3. annars 401 { need_login, login: '/innskraning.html' } (síðurnar vísa þangað með ?next=);
//      svari notendaskráin ekki: 503 — lokað, aldrei opið.
//
// HVERS VEGNA SÉR SKRÁ: _portal.cjs má ekki krefjast hub-adgangar.cjs (sú krefst _portal.cjs). Hringtengingin gaf
// föllunum _portal og hub-adgangar sama skráamengi → sama digest á Netlify → hub-adgangar keyrði búnt _portal og
// svaraði 500 á öllu (deploy-preview #982). Hér er engin hringtenging: þessi skrá krefst beggja, hvorug krefst hennar.
// Vörður: tools/audit-fall-mengi.cjs.
//
// ASYNC: gleymist `await` er loforðið skilað sem svari — það brotnar (engin gögn), opnast aldrei.

const P = require('./_portal.cjs');
const HUB = require('./hub-adgangar.cjs');

// Sama hlið, en skilar líka hver er inni: { villa: svar|null, nafn }. Föll sem SKRÁ hver gerði hvað (t.d. færsla
// innflutnings á birgðir, 16.11.2026) nota þetta; hin nota krefjastStarfsmanns sem byggir á því.
async function starfsmadur(event) {
  if (P.hubConfigured() && P.staffFromEvent(event)) return { villa: null, nafn: 'Starfsmaður' };
  let s = null;
  try {
    const h = (event && event.headers) || {};
    const r = await HUB.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: { host: h.host || h.Host || '', cookie: h.cookie || h.Cookie || '' } });
    if (r && r.statusCode === 200) s = JSON.parse(r.body);
  } catch (_) { s = null; }
  if (!s || typeof s.authed !== 'boolean') return { villa: P.json(503, { error: 'Náði ekki að staðfesta innskráningu — reyndu aftur eftir smá stund' }), nafn: null };
  if (s.authed && s.user) return { villa: null, nafn: s.user.nafn || s.user.nn || 'Starfsmaður' };
  return { villa: P.json(401, { error: 'Innskráning starfsmanns vantar', need_login: true, login: '/innskraning.html' }), nafn: null };
}

async function krefjastStarfsmanns(event) {
  return (await starfsmadur(event)).villa;
}

module.exports = { krefjastStarfsmanns, starfsmadur };
