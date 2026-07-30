/**
 * OCR-skönnun — les EINN reit af mynd úr myndavélinni (Scan Mode, js/scanmode.js).
 *
 *   POST /api/ocr-scan
 *   Body: { image: "<base64 jpeg, án data: forskeytis>", type: "<step.key>" }
 *   → { value: "<lesinn texti>" }   á árangri
 *   → { error: 'API_KEY_MISSING' }  (400) þegar lykil vantar — framendinn treystir á þennan streng
 *   → { error: 'NO_IMAGE' }         (400) þegar mynd vantar
 *   → { error: 'OCR_FAILED', message } þegar Anthropic svarar villu
 *
 * Server-side svo ANTHROPIC_API_KEY haldist utan vafrans. Haiku (ódýrt, ein mynd,
 * einn stuttur reitur). Framendinn (scanmode.js ~line 215) sendir { image, type }
 * og les { value } — sjá contract í hausnum hér að ofan.
 */

// Hvað á að lesa fyrir hvern step.key (úr js/scanmode.js CONTEXTS.*.steps):
//   geymsla:   serial · customer · phone · storage
//   lanstaeki: serial · customer · phone
const FIELD_PROMPTS = {
  serial:
    'Lestu RAÐNÚMER slökkvitækis af myndinni — það er stimplað/prentað raðnúmer ' +
    '(bland af tölustöfum og bókstöfum). Skilaðu AÐEINS raðnúmerinu, engu öðru.',
  customer:
    'Lestu NAFN viðskiptavinar af myndinni — oft handskrifað nafn einstaklings eða ' +
    'fyrirtækis. Skilaðu AÐEINS nafninu eins og það stendur, engu öðru.',
  phone:
    'Lestu SÍMANÚMER af myndinni — íslenskt símanúmer, yfirleitt 7 tölustafir. ' +
    'Skilaðu AÐEINS tölustöfunum (engin bil eða bandstrik), engu öðru.',
  storage:
    'Lestu GEYMSLURÝMIS-merkið af myndinni — kóði á borð við G1–G20. ' +
    'Skilaðu AÐEINS merkinu (t.d. „G7"), engu öðru.',
};
const DEFAULT_PROMPT =
  'Lestu aðaltextann eða -töluna af myndinni. Skilaðu AÐEINS þeim texta, engu öðru.';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { error: 'POST only' });

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== KEY) return j(401, { error: 'unauthorized' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'API_KEY_MISSING' });

  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }

  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const type = String(body.type || '').trim();
  if (!image) return j(400, { error: 'NO_IMAGE' });

  // Strip a data: prefix defensively (framendinn sendir án þess, en verjum okkur).
  const b64 = image.replace(/^data:image\/[a-z]+;base64,/i, '');

  const fieldInstruction = FIELD_PROMPTS[type] || DEFAULT_PROMPT;
  const instruction =
    'Þú ert nákvæmur OCR-lesari fyrir slökkvitækja-skráningu. ' +
    fieldInstruction +
    '\nEf ekkert læsilegt er á myndinni, skilaðu tómum streng. ' +
    'Engar skýringar, engin gæsalöpp, aðeins gildið sjálft.';

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
            { type: 'text', text: instruction },
          ],
        }],
      }),
    });
    data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || ('OCR villa (' + r.status + ')');
      return j(200, { error: 'OCR_FAILED', message: String(msg).slice(0, 200) });
    }
  } catch (e) {
    return j(200, { error: 'OCR_FAILED', message: String((e && e.message) || e).slice(0, 200) });
  }

  let text = (data && data.content && data.content[0] && data.content[0].text) || '';
  text = String(text).trim().replace(/^["'«»„“”]+|["'«»„“”]+$/g, '').trim();

  // Módel skilar stundum „ekkert læsilegt"-orðalagi þegar það finnur ekkert → tómt.
  if (/^(ekkert|engin|n\/a|tómt|unreadable|nothing)\b/i.test(text)) text = '';

  return j(200, { value: text.slice(0, 200) });
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key' };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/ocr-scan' };
