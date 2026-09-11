// hreyfingaryfirlit.js — Viðskiptahreyfingar per kennitölu (greiðanda), aldrei per stað.
//
//   GET /api/hreyfingaryfirlit?kt=540319-1540&fra=2025-01-01&til=2026-09-11&stolpi=opid
//     → { haus, linur, samantekt, arslok[], osent[], athugasemdir[] }
//
//   stolpi=opid           (sjálfgefið) Stólpa-reikningar eins og skráð var
//   stolpi=fyrri_eigandi  „Uppgjör við fyrri eigendur" 07.05.2026 lokar opinni Stólpa-stöðu
//
// Allar reglur og útreikningur búa í _hreyfingaryfirlit-kjarni.cjs (hreinn, prófaður með
// `node tools/_test-hreyfingaryfirlit.cjs`). Þetta fall sér aðeins um hlið, færibreytur og
// PostgREST-sókn með Range-síðuskiptingu. stolpi_* töflurnar eru með RLS sem aðeins
// þjónustulykillinn les — þess vegna server-megin.
//
// Varið með sama starfsmanna-hliði og gatt-admin (P.requireStaff): opið þar til
// HUB_STAFF_PASSWORD er sett í Netlify, þá 401 { need_login } án hub_session.
// Kostnaður: eitt kall per hleðslu síðu / smell á „Sækja" — engin vöktun.

const P = require('./_portal');
const K = require('./_hreyfingaryfirlit-kjarni.cjs');

async function sbGet(slod, fra, til) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, {
    headers: {
      apikey: P.SUPABASE_KEY,
      Authorization: `Bearer ${P.SUPABASE_KEY}`,
      'Range-Unit': 'items',
      Range: `${fra}-${til}`,
    },
  });
  if (r.status === 416) return [];                     // síða handan enda
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const _g = P.requireStaff(event); if (_g) return _g;

  const q = event.queryStringParameters || {};
  const kt10 = K.ktHreint(q.kt);
  if (kt10.length !== 10) return P.json(400, { error: 'Ógild kennitala — 10 tölustafir, t.d. 540319-1540' });
  if (kt10 === K.WALKIN) return P.json(400, { error: '999999-9999 er staðgreiðslu-kennitala — ekkert viðskiptayfirlit' });

  const idag = new Date().toISOString().slice(0, 10);   // Ísland = UTC allt árið
  if (q.til && !K.gildDags(q.til)) return P.json(400, { error: 'Ógild lokadagsetning (til) — snið yyyy-mm-dd' });
  if (q.fra && !K.gildDags(q.fra)) return P.json(400, { error: 'Ógild upphafsdagsetning (fra) — snið yyyy-mm-dd' });
  const til = K.gildDags(q.til) || idag;
  const fra = K.gildDags(q.fra) || `${Number(til.slice(0, 4)) - 1}-01-01`;
  if (fra > til) return P.json(400, { error: 'Upphafsdagur er á eftir lokadegi' });
  const stolpi = q.stolpi === 'fyrri_eigandi' ? 'fyrri_eigandi' : 'opid';

  try {
    const gogn = await K.saekja(kt10, sbGet);
    return P.json(200, K.reikna(gogn, { fra, til, stolpi, idag }));
  } catch (e) {
    console.error('[hreyfingaryfirlit]', e);
    return P.json(502, { error: 'Náði ekki í gögn: ' + (e && e.message ? e.message : String(e)) });
  }
};
