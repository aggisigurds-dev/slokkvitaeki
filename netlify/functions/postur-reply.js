/**
 * Reikninga-póstur — AI-drafted reply for an incoming invoice email.
 *
 *   POST /api/postur-reply
 *   Body: {
 *     email:    { sender_name, sender_email, subject, body },
 *     customer: { name, kt } | null,
 *     invoices: [{ num, date, samtals, paid }],   // recent, optional
 *     instruction: "…"                             // optional steering from Agnar
 *   }
 *   → { subject, body }   (Icelandic reply draft — NOT sent, just drafted)
 *
 * Server-side so ANTHROPIC_API_KEY stays off the client. Haiku (cheap, plenty
 * for short Icelandic service replies). The office ALWAYS reviews before send.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'ANTHROPIC_API_KEY_MISSING' });

  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }

  const em = body.email || {};
  const cust = body.customer || null;
  const invoices = Array.isArray(body.invoices) ? body.invoices.slice(0, 12) : [];
  const instruction = String(body.instruction || '').slice(0, 400);

  const fmtKr = (n) => (Math.round(Number(n) || 0)).toLocaleString('is-IS') + ' kr';
  const invLines = invoices.map(v =>
    `  • ${v.num || '—'}${v.date ? ' (' + v.date + ')' : ''} — ${fmtKr(v.samtals)}${v.paid ? ' · GREITT' : ' · ógreitt'}`
  ).join('\n');

  const ctx =
    (cust ? `Viðskiptavinur: ${cust.name || '—'}${cust.kt ? ' (kt ' + cust.kt + ')' : ''}\n` : 'Viðskiptavinur: óþekktur (fannst ekki í kerfinu)\n') +
    (invLines ? `Nýlegir reikningar þessa viðskiptavinar:\n${invLines}\n` : '') +
    `\nPÓSTUR SEM Á AÐ SVARA:\n` +
    `Frá: ${em.sender_name || ''} <${em.sender_email || ''}>\n` +
    `Efni: ${em.subject || ''}\n` +
    `Texti:\n${String(em.body || '').replace(/\s+\n/g, '\n').slice(0, 2500)}\n` +
    (instruction ? `\nLEIÐBEINING FRÁ SKRIFSTOFU (hafðu þetta að leiðarljósi): ${instruction}\n` : '');

  const prompt =
    'Þú ert kurteis þjónustufulltrúi hjá Slökkvitæki ehf (íslenskt fyrirtæki sem selur og ' +
    'þjónustar slökkvitæki og brunakerfi). Netfang okkar er eldklar@eldklar.is, kt 600508-0400. ' +
    'Semdu STUTT, hlýlegt og fagmannlegt SVAR á íslensku við póstinum hér að neðan. ' +
    'Reglur:\n' +
    '- Ávarpaðu viðtakanda eðlilega (t.d. „Sæl/l" eða nafn ef við á).\n' +
    '- Svaraðu beint því sem spurt er um. Ef beðið er um reikning/afrit, staðfestu að við sendum hann.\n' +
    '- EKKI finna upp upphæðir, reikningsnúmer eða dagsetningar — notaðu aðeins það sem kemur fram í samhenginu. Ef upplýsingar vantar, biddu kurteislega um þær.\n' +
    '- Ekki lofa neinu sem þú veist ekki (t.d. nákvæmri dagsetningu leiðréttingar).\n' +
    '- Undirskrift: „Kveðja,\\nSlökkvitæki ehf\\neldklar@eldklar.is".\n' +
    '- Haltu því undir ~120 orðum.\n' +
    'Svaraðu EINGÖNGU sem hreint JSON: {"subject":"…","body":"…"} — ekkert annað, engir bakgrunnstextar. ' +
    'Efnislínan má vera „Re: <upprunalegt efni>".\n\n' +
    ctx;

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    data = await r.json();
    if (!r.ok) return j(r.status, { error: (data && data.error && data.error.message) || 'anthropic error' });
  } catch (e) { return j(502, { error: String((e && e.message) || e) }); }

  const text = (data && data.content && data.content[0] && data.content[0].text) || '';
  let out = null;
  try { const m = text.match(/\{[\s\S]*\}/); if (m) out = JSON.parse(m[0]); } catch (_) { out = null; }
  if (!out || !out.body) {
    // fall back to raw text as the body so the office still gets something usable
    out = { subject: 'Re: ' + (em.subject || ''), body: text.trim() || 'Ekki tókst að semja svar — reyndu aftur.' };
  }
  return j(200, {
    subject: String(out.subject || ('Re: ' + (em.subject || ''))).slice(0, 200),
    body: String(out.body || '').slice(0, 4000),
  });
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/postur-reply' };
