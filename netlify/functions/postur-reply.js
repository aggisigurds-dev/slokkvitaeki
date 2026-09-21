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

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== KEY) return j(401, { error: 'unauthorized' });
  }

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
    'Auk svarsins skaltu greina póstinn:\n' +
    '- "summary": EIN stutt íslensk setning (hámark 16 orð) sem segir hvað sendandinn vill.\n' +
    '- "requested": hlutur sem lýsir hvaða SKJAL (ef eitthvað) er beðið um: ' +
    '{"kind":"reikningur"|"skyrsla"|"annad"|"ekkert","invoice_ref": "R-000123" eða null, "note":"stutt"}. ' +
    'Ef beðið er um afrit/reikning → kind "reikningur". Ef beðið er um úttektarskýrslu → "skyrsla". Ef ekkert skjal → "ekkert".\n' +
    // 21.09.2026: AFMARKAÐ SNIÐ, EKKI JSON. Svarið á að bera gæsalappir, og
    // ein óescape-uð gæsalöpp inni í JSON-streng felldi parse-ið — sjá haus
    // skriftunnar. Hér er meginmálið einfaldlega allt á eftir ---SVAR---, svo
    // engin escape-un er til staðar sem getur brotnað.
    'SNIÐ SVARSINS — nákvæmlega þetta, engir bakgrunnstextar og engin kóðagirðing:\n' +
    'EFNI: Re: <upprunalegt efni>\n' +
    'YFIRLIT: <ein setning, hámark 16 orð>\n' +
    'BEÐIÐ: reikningur|skyrsla|annad|ekkert\n' +
    'TILVISUN: <R-000123 eða ->\n' +
    'ATHUGASEMD: <stutt eða ->\n' +
    '---SVAR---\n' +
    '<sjálft svarið, venjulegur texti með línubilum>\n\n' +
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
  let out = lesaAfmarkad(text) || lesaJson(text);
  // ALDREI hrátt módelsvar í meginmálið. Það er einum smelli frá kúnna, og
  // kóðagirðing með JSON lítur út eins og tilbúið svar. Tómur reitur og skýr
  // villa er alltaf skárra — viðmótið skilur reitinn eftir ósnertan.
  if (!out || !String(out.body || '').trim()) {
    return j(502, { error: 'Svarið kom á sniði sem ekki tókst að lesa. Reyndu aftur.' });
  }
  const reqDoc = (out && out.requested) || {};
  return j(200, {
    subject: String(out.subject || ('Re: ' + (em.subject || ''))).slice(0, 200),
    body: String(out.body || '').slice(0, 4000),
    summary: out.summary ? String(out.summary).slice(0, 240) : '',
    requested: {
      kind: String(reqDoc.kind || 'ekkert').slice(0, 20),
      invoice_ref: reqDoc.invoice_ref ? String(reqDoc.invoice_ref).slice(0, 20) : null,
      note: reqDoc.note ? String(reqDoc.note).slice(0, 160) : '',
    },
  });
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key' };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/postur-reply' };

// ── Lestur svarsins ────────────────────────────────────────────────────────
// Afmarkaða sniðið: hausalínur og svo allt á eftir ---SVAR--- sem meginmál.
// Engin escape-un, svo gæsalappir og línubil geta ekki brotið neitt.
function lesaAfmarkad(text) {
  const hlutar = String(text || '').split(/^\s*-{2,}\s*SVAR\s*-{2,}\s*$/mi);
  if (hlutar.length < 2) return null;
  const haus = hlutar[0];
  const body = hlutar.slice(1).join('\n').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  if (!body) return null;
  const reitur = (nafn) => {
    const m = haus.match(new RegExp('^\\s*' + nafn + '\\s*:\\s*(.+)$', 'mi'));
    const v = m ? m[1].trim() : '';
    return (v === '-' || v === '—') ? '' : v;
  };
  return {
    subject: reitur('EFNI'),
    body: body,
    summary: reitur('YFIRLIT'),
    requested: { kind: reitur('BEÐIÐ') || reitur('BEDID'), invoice_ref: reitur('TILVISUN') || null, note: reitur('ATHUGASEMD') },
  };
}

// Varaleið fyrir eldri/óvænt svör: JSON, með kóðagirðingu strokinni fyrst.
// Girðingin var einmitt það sem sást í reitnum hjá Agnari 21.09.
function lesaJson(text) {
  const hreint = String(text || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  const m = hreint.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const o = JSON.parse(m[0]); return (o && o.body) ? o : null; } catch (_) { return null; }
}
