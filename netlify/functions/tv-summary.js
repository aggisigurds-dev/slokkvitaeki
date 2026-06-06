/**
 * Þjónustuver AI summary — one short Icelandic "next action" line per request.
 *
 *   POST /api/tv-summary
 *   Body: { items: [{ id, customer_nafn, type, title, notes }] }   (batch — cheap)
 *   → { summaries: { "<id>": "stutt staða…" } }
 *
 * Server-side so ANTHROPIC_API_KEY stays off the client. Uses Haiku (cheap).
 */
export default async (req) => {
  if (req.method !== 'POST') return j(405, { error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'ANTHROPIC_API_KEY_MISSING' });
  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }
  const items = Array.isArray(body.items) ? body.items.slice(0, 25) : [];
  if (!items.length) return j(400, { error: 'no items' });

  const list = items.map((it, i) =>
    `${i + 1}. [${it.type || 'annad'}] ${(it.customer_nafn || '—')}: ${(it.title || '').slice(0, 140)}` +
    (it.notes ? ` — ${String(it.notes).replace(/\s+/g, ' ').slice(0, 300)}` : '')
  ).join('\n');

  const prompt =
    'Þú ert aðstoð fyrir þjónustuver slökkvitækjafyrirtækis (Slökkvitæki ehf). ' +
    'Fyrir hverja beiðni hér að neðan, skrifaðu EINA mjög stutta íslenska setningu (hámark 12 orð) ' +
    'sem segir hver staðan er / hvað þarf að gera næst (t.d. "Vantar: senda reikning fyrir Laugaveg"). ' +
    'Svaraðu EINGÖNGU sem JSON fylki af strengjum, í sömu röð og beiðnirnar, ekkert annað.\n\n' +
    'Beiðnir:\n' + list;

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    data = await r.json();
    if (!r.ok) return j(r.status, { error: (data && data.error && data.error.message) || 'anthropic error' });
  } catch (e) { return j(502, { error: String((e && e.message) || e) }); }

  const text = (data && data.content && data.content[0] && data.content[0].text) || '[]';
  let arr = [];
  try { const m = text.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : []; } catch (_) { arr = []; }
  const summaries = {};
  items.forEach((it, i) => { if (arr[i]) summaries[String(it.id)] = String(arr[i]).slice(0, 200); });
  return j(200, { summaries });
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/tv-summary' };
