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
// Spyr fall notendaskrárinnar (hub-adgangar GET) hver er inni: { authed, user } eða null ef það svarar ekki.
async function innskraning(event) {
  try {
    const h = (event && event.headers) || {};
    const r = await HUB.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: { host: h.host || h.Host || '', cookie: h.cookie || h.Cookie || '' } });
    if (r && r.statusCode === 200) { const s = JSON.parse(r.body); if (s && typeof s.authed === 'boolean') return s; }
  } catch (_) { /* fellur í 503 hjá kallanda */ }
  return null;
}
const OSTADFEST = () => P.json(503, { error: 'Náði ekki að staðfesta innskráningu — reyndu aftur eftir smá stund' });
const VANTAR = () => P.json(401, { error: 'Innskráning starfsmanns vantar', need_login: true, login: '/innskraning.html' });

async function starfsmadur(event) {
  if (P.hubConfigured() && P.staffFromEvent(event)) return { villa: null, nafn: 'Starfsmaður' };
  const s = await innskraning(event);
  if (!s) return { villa: OSTADFEST(), nafn: null };
  if (s.authed && s.user) return { villa: null, nafn: s.user.nafn || s.user.nn || 'Starfsmaður' };
  return { villa: VANTAR(), nafn: null };
}

// Aðeins STJÓRNANDI (rola 'Admin' í notendaskránni) — sama regla og _radgjafinn-hlid.cjs, en skilar líka nafni.
// Fyrir föll með fjármál og forsendur Agnars (tekjur-beint, lota 4 17.11.2026: kóðarýni — „hvaða rola sem er“ las tekjur
// og gat yfirskrifað launaforsendur). Sameiginlega lykilorðið (hub_session) dugar EKKI: það segir ekki hver er inni.
// Óinnskráður → 401, önnur rola → 403, notendaskráin svarar ekki → 503 (lokað, aldrei opið).
async function stjornandi(event) {
  const s = await innskraning(event);
  if (!s) return { villa: OSTADFEST(), nafn: null };
  if (!s.authed || !s.user) return { villa: VANTAR(), nafn: null };
  if (s.user.rola !== 'Admin') return { villa: P.json(403, { error: 'Aðeins fyrir stjórnanda' }), nafn: null };
  return { villa: null, nafn: s.user.nafn || s.user.nn || 'Stjórnandi' };
}

async function krefjastStarfsmanns(event) {
  return (await starfsmadur(event)).villa;
}

// SENDIFÖLL (lota 13, 17.11.2026): innskráður starfsmaður EÐA gildur innri tóki (x-sl-toki, HUB.innriToki()) frá þjóni á
// sama vef — áætluð föll (gatt-vikupostur, payday-sync-cron) og gatt-admin kalla án köku. Tókinn gefur sömu réttindi og
// starfsmaður, ekki meira. Rangur eða útrunninn tóki fellur í kökuathugunina (401 án hennar), aldrei opið.
async function krefjastStarfsmannsEdaInnri(event) {
  let ok = false;
  try { ok = await HUB.erInnriToki(event); } catch (_) { ok = false; }
  if (ok) return null;
  return await krefjastStarfsmanns(event);
}

// ESM-föll (Netlify v2: Request → Response) nota sama hlið. Skilar Response (401/503) eða null.
//   import H from './_starfshlid.cjs';  const g = await H.vefHlid(req, { innri: true }); if (g) return g;
function atburdurUr(req) {
  const h = (req && req.headers) || { get: () => '' };
  const g = (n) => String((typeof h.get === 'function' ? h.get(n) : h[n]) || '');
  return { headers: { cookie: g('cookie'), host: g('host'), [HUB.INNRI_HAUS]: g(HUB.INNRI_HAUS) } };
}
async function vefHlid(req, opts) {
  const e = atburdurUr(req);
  const r = (opts && opts.innri) ? await krefjastStarfsmannsEdaInnri(e) : await krefjastStarfsmanns(e);
  if (!r) return null;
  const extra = (opts && opts.hausar) || {};
  return new Response(r.body, { status: r.statusCode, headers: Object.assign({}, r.headers || {}, extra) });
}

module.exports = { krefjastStarfsmanns, krefjastStarfsmannsEdaInnri, starfsmadur, stjornandi, vefHlid, _atburdurUr: atburdurUr };
