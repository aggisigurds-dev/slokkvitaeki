/**
 * Þjónustuver AI-flokkun (triage) — batch classify email-mál into the board's
 * own vocabulary so incoming póstur lands on the Þjónustuborð already sorted.
 *
 *   POST /api/postur-triage
 *   Body: { items: [{ id, title, notes, customer_nafn }] }   (batch, cheap — Haiku)
 *   → { results: { "<id>": {
 *         flokkur, tags[], important, summary, urgency, action, customer_hint
 *       } } }
 *
 * Server-side so ANTHROPIC_API_KEY stays off the client. The model NEVER writes
 * to the database — it only returns suggestions. The client caches them in
 * `postur_ai_flokkun` and applies to `thjonustubeidni` only when Agnar accepts.
 *
 * Vocabulary is fixed to what the board (patch 231) already understands; anything
 * the model invents is dropped here so a hallucinated tag can never reach the DB.
 */

// ── The board's real vocabulary (must match js/patches/231-verkbord.js) ────────
const FLOKKAR = ['tilbod', 'thjonusta', 'brunakerfi', 'rukkun', 'samskipti'];
const TAGS = [
  'gera_tilbod', 'thjonustusamningur', 'bokhald', 'kvortun', 'hringja',
  'brunakerfi', 'eftir_ad_rukka', 'thjonusta', 'senda_tolvupost',
  'senda_skyrslur', 'uppsetning',
];
const URGENCY = ['lagur', 'venjulegur', 'har'];
const MODEL = 'claude-haiku-4-5-20251001';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { error: 'POST only' });

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const GATE = (process.env.EDGE_SHARED_KEY || '').trim();
  if (GATE) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== GATE) return j(401, { error: 'unauthorized' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'ANTHROPIC_API_KEY_MISSING' });

  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }
  const items = Array.isArray(body.items) ? body.items.slice(0, 15) : [];
  if (!items.length) return j(400, { error: 'no items' });

  const list = items.map((it, i) => {
    const notes = String(it.notes || '').replace(/\s+/g, ' ').slice(0, 700);
    return `#${i + 1} (id ${it.id})\n` +
      `Frá/kúnni: ${(it.customer_nafn || '—')}\n` +
      `Efni: ${String(it.title || '').slice(0, 200)}\n` +
      `Texti: ${notes || '(enginn texti)'}`;
  }).join('\n\n');

  const prompt =
    'Þú ert aðstoð fyrir þjónustuver Slökkvitækis ehf (íslenskt fyrirtæki sem selur og ' +
    'þjónustar slökkvitæki og brunakerfi). Þú flokkar innkomna tölvupósta sem eru orðnir að ' +
    '„málum" á þjónustuborðinu. Fyrir HVERT mál hér að neðan skila fjórum flokkunum:\n\n' +
    'FLOKKUR (veldu NÁKVÆMLEGA einn lykil, eða null ef algjörlega óljóst):\n' +
    '- tilbod = beiðni um verð/tilboð, verðfyrirspurn, „hvað kostar".\n' +
    '- thjonusta = pöntun á þjónustu/skoðun/áfyllingu/uppsetningu, almenn þjónustubeiðni.\n' +
    '- brunakerfi = snýst um brunakerfi/brunaviðvörun/reykskynjara-kerfi (ekki stök tæki).\n' +
    '- rukkun = reikningur, greiðsla, innheimta, bókhald, afrit af reikningi.\n' +
    '- samskipti = fyrirspurn/svar/almenn samskipti sem kalla helst á símtal eða póst.\n\n' +
    'MERKI (tags — veldu 0–3 lykla sem eiga við, sem fylki):\n' +
    '- gera_tilbod, thjonustusamningur, bokhald, kvortun, hringja, brunakerfi, ' +
    'eftir_ad_rukka, thjonusta, senda_tolvupost, senda_skyrslur, uppsetning.\n' +
    '  (kvortun = óánægja/kvörtun; hringja = á að hringja; senda_skyrslur = beðið um úttektarskýrslu; ' +
    'senda_tolvupost = á að svara pósti; eftir_ad_rukka = á eftir að rukka; uppsetning = uppsetningarverk.)\n\n' +
    'IMPORTANT (true/false): er þetta áríðandi? (kvörtun, gjaldfallið, „strax", öryggismál) → true, annars false.\n' +
    'URGENCY: einn af lagur|venjulegur|har.\n' +
    'SUMMARY: EIN stutt íslensk setning (hámark 14 orð) — hvað sendandinn vill / hvað þarf að gera.\n' +
    'ACTION: EIN stutt íslensk setning — næsta skref (t.d. „Senda tilboð í brunaslöngur").\n' +
    'CUSTOMER_HINT: nafn fyrirtækis/kúnna EF það kemur skýrt fram í textanum, annars "".\n\n' +
    'Svaraðu EINGÖNGU sem hreint JSON fylki, í sömu röð og málin, einn hlutur per mál, ekkert annað:\n' +
    '[{"flokkur":"thjonusta","tags":["thjonusta","hringja"],"important":false,' +
    '"urgency":"venjulegur","summary":"…","action":"…","customer_hint":""}, …]\n\n' +
    'MÁLIN:\n' + list;

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
    });
    data = await r.json();
    if (!r.ok) return j(r.status, { error: (data && data.error && data.error.message) || 'anthropic error' });
  } catch (e) { return j(502, { error: String((e && e.message) || e) }); }

  const text = (data && data.content && data.content[0] && data.content[0].text) || '[]';
  let arr = [];
  try { const m = text.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : []; } catch (_) { arr = []; }

  const results = {};
  items.forEach((it, i) => {
    const o = arr[i] && typeof arr[i] === 'object' ? arr[i] : {};
    const flokkur = FLOKKAR.includes(o.flokkur) ? o.flokkur : null;
    const tags = Array.isArray(o.tags) ? [...new Set(o.tags.filter((t) => TAGS.includes(t)))].slice(0, 4) : [];
    results[String(it.id)] = {
      flokkur,
      tags,
      important: o.important === true,
      urgency: URGENCY.includes(o.urgency) ? o.urgency : 'venjulegur',
      summary: o.summary ? String(o.summary).slice(0, 220) : '',
      action: o.action ? String(o.action).slice(0, 220) : '',
      customer_hint: o.customer_hint ? String(o.customer_hint).slice(0, 120) : '',
      model: MODEL,
    };
  });
  return j(200, { results, model: MODEL });
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/postur-triage' };
