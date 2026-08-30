/**
 * Þjónustuborð AI-sync — tillögur um að búa til / loka / merkja mál.
 *
 *   POST /api/verkbord-sync
 *   Body: {
 *     notes?: string,
 *     items?: [{ id, title, type, tags, status, customer_nafn, notes }],
 *     facts?: [{ kind, fid, nafn, year }],
 *     sites?: [{ id, nafn, customer_base_id }]
 *   }
 *   → { actions: [...] }
 *
 * Haiku, server-side. The model NEVER writes the database. Vocabulary is
 * clamped to patch 231. Site matching refuses kennitala / group-name merges
 * (Center Hotel is 11 fyrirtaeki on one kt).
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const V = require('./_verkbord-sync.cjs');

const MODEL = 'claude-haiku-4-5-20251001';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { error: 'POST only' });

  const GATE = (process.env.EDGE_SHARED_KEY || '').trim();
  if (GATE) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== GATE) return j(401, { error: 'unauthorized' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'ANTHROPIC_API_KEY_MISSING' });

  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }

  const notes = String(body.notes || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
  const items = Array.isArray(body.items) ? body.items.slice(0, 80) : [];
  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 40) : [];
  const sites = Array.isArray(body.sites) ? body.sites.slice(0, 200) : [];
  if (!notes && !facts.length && !items.length) return j(400, { error: 'no input' });

  const itemLines = items.map((it) => {
    const tags = Array.isArray(it.tags) ? it.tags.join(',') : '';
    return `- id ${it.id} [${it.type || 'annad'}|${it.status || ''}|${tags}] ${(it.customer_nafn || '—')}: ${String(it.title || '').slice(0, 120)}`;
  }).join('\n');
  const factLines = facts.map((f) =>
    `- ${f.kind} ${f.year || ''} fid=${f.fid} ${f.nafn || ''}`
  ).join('\n');
  const siteLines = sites.slice(0, 80).map((s) =>
    `- fid ${s.id}: ${s.nafn}`
  ).join('\n');

  const prompt =
    'Þú ert aðstoð á Þjónustuborði Slökkvitækis ehf. Þú LEGGUR TIL aðgerðir. ' +
    'Þú skrifar ALDREI í gagnagrunn. Þú giskar ALDREI á hvaða hótel/staður á við.\n\n' +
    'REGLUR:\n' +
    '- Center Hótel er MÖRG fyrirtaeki (Plaza, Arnarhvoll, Grandi, …) á SÖMU kennitölu. ' +
    'customer_nafn verður að vera nákvæmt staðarnafn (t.d. "Center Hótel - Plaza"), aldrei bara "Center Hótel". ' +
    'Ef textinn nefnir ekki staðinn, slepptu customer_nafn.\n' +
    '- Rekstrarfélög og fjölstaða-kt: sami leikur — aldrei sameina staði.\n' +
    '- Loka (op=close) AÐEINS með raunverulegu id úr MÁLUM. Lokaðu EKKI úttekt/reikningi sem er "búið" í facts — sending skýrslu er óvituð. ' +
    'Sjálfgefið: ekki loka.\n' +
    '- Búa til (op=create) eitt mál per aðskilið verk úr minnisblaðinu. tags/flokkur/type úr ORÐAFORÐANUM.\n' +
    '- tags leyfileg: gera_tilbod, thjonustusamningur, bokhald, kvortun, hringja, brunakerfi, ' +
    'eftir_ad_rukka, thjonusta, senda_tolvupost, senda_skyrslur, uppsetning.\n' +
    '- flokkur: tilbod|thjonusta|brunakerfi|rukkun|samskipti.\n' +
    '- type: tilbod|email|skyrsla|heimsokn|hringja|samningur|annad.\n' +
    '- reason: ein stutt íslensk setning.\n' +
    '- Ekki búa til mál sem er þegar á listanum fyrir sama stað og sama verk.\n\n' +
    'Svaraðu EINGÖNGU sem JSON fylki, ekkert annað:\n' +
    '[{"op":"create","title":"…","type":"skyrsla","tags":["eftir_ad_rukka"],"flokkur":"rukkun",' +
    '"customer_nafn":"Center Hótel - Grandi","notes":"…","reason":"…","important":false}]\n\n' +
    (notes ? 'MINNISBLAÐ:\n' + notes + '\n\n' : '') +
    (factLines ? 'STAÐREYNDIR ÚR GÖGNUM (per fyrirtaeki_id, ekki kt):\n' + factLines + '\n\n' : '') +
    (itemLines ? 'OPIN MÁL Á BORÐI:\n' + itemLines + '\n\n' : '') +
    (siteLines ? 'STAÐIR (aðeins til að velja nákvæmt nafn):\n' + siteLines + '\n' : '');

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    data = await r.json();
    if (!r.ok) return j(r.status, { error: (data && data.error && data.error.message) || 'anthropic error' });
  } catch (e) {
    return j(502, { error: String((e && e.message) || e) });
  }

  const text = (data && data.content && data.content[0] && data.content[0].text) || '[]';
  const raw = V.parseJsonArray(text);
  const actions = V.validateActions(raw, { sites, openItems: items });
  return j(200, { actions, model: MODEL });
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

export const config = { path: '/api/verkbord-sync' };
