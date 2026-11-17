// bh-toki.cjs — tími-tóki fyrir föll Brunahólfs, aðeins handa innskráðum starfsmanni (Powerplan lota 13, 17.11.2026).
//
// HVERS VEGNA: föll Brunahólfs svöruðu ÓINNSKRÁÐUM (m.a. /api/krofu-yfirlit-bru með skuldunautalista) því P.requireStaff
// þar hleypir öllu í gegn þegar HUB_STAFF_PASSWORD er ekki sett. Nú krefjast þau innskráningar á Brunahólfi (kakan
// hub_user) EÐA tóka (brunaholf/netlify/functions/_vord.js). Vafrinn hér á ekki Brunahólfs-kökuna (annar vefur), svo:
//   1. innskráning appsins er krafin (_starfshlid.cjs — sama hlið og postur-senda; 401 án hennar);
//   2. tókinn er myntaður í hub-adgangar.cjs (HMAC af session_secret, sameiginlegu leyndarmáli beggja vefja), gildir 10 mín;
//   3. js/patches/512-bh-bru.js setur hann á köll appsins til brunaholf.netlify.app/api/… og réttir hann innfelldum
//      Brunahólfs-síðum (iframe) sem biðja um hann með postMessage.
//
//   GET /api/bh-toki → 200 { toki, gildir_ms }  ·  401 án innskráningar  ·  503 ef leyndarmálið næst ekki
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const HUB = require('./hub-adgangar.cjs');

const GILDIR_MS = 9 * 60000; // tókinn gildir 10 mín frá myntunarmínútu; vafrinn sækir nýjan áður

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET' });
  const g = await H.krefjastStarfsmanns(event);
  if (g) return g;
  const toki = await HUB.hubApiToki().catch(() => '');
  if (!toki) return P.json(503, { error: 'HUB_TOKI', message: 'Náði ekki í lykilinn að Brunahólfi — reyndu aftur eftir smá stund.' });
  return P.json(200, { toki, gildir_ms: GILDIR_MS });
};
