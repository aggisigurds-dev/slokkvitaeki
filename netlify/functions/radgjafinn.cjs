// radgjafinn.cjs — RÁÐGJAFINN, lestur (15.11.2026). Kjarninn og skýringin: _radgjafinn.cjs.
//
//   GET /api/radgjafinn            → { nyjast, saga, sidasta_villa } — það sem glugginn á Þjónustuborði Agnars sýnir
//   GET /api/radgjafinn?prufa=1    → prufuskrifin (sjást ekki á borðinu)
//
// Skrifin sjálf: radgjafinn-background.cjs (↻ á borðinu) og radgjafinn-morgun-background.cjs (kl. 06:45 á hverjum degi).
// Bak við starfsmanna-hliðið: innihaldið er póstur og reikningsstaða viðskiptavina.

const P = require('./_portal.cjs');
const R = require('./_radgjafinn.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET only' });
  const g = P.requireStaff(event); if (g) return g;
  if (!P.dbReady()) return P.json(503, { error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY vantar' });
  const q = event.queryStringParameters || {};
  try {
    return P.json(200, await R.lesa({ prufa: q.prufa === '1' }), { 'cache-control': 'no-store' });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
