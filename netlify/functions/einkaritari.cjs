// einkaritari.cjs — EINKARITARINN, lestur (16.11.2026). Kjarninn: einkaritari-background.cjs.
//
//   GET /api/einkaritari            → { nyjast, saga, sidasta_villa }
//   GET /api/einkaritari?prufa=1    → prufuskrifin
//
// Skrifin sjálf: einkaritari-background.cjs (↻ á borðinu) — ræst kl. 06:45 af einkaritari-cron.cjs.

const P = require('./_portal.cjs');
const E = require('./einkaritari-background.cjs');
const H = require('./_radgjafinn-hlid.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET only' });
  if (!P.dbReady()) return P.json(503, { error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY vantar' });
  const g = await H.hlid(event); if (g) return g;
  const q = event.queryStringParameters || {};
  try {
    return P.json(200, await E.lesa({ prufa: q.prufa === '1' }), { 'cache-control': 'no-store' });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
