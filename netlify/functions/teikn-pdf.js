// teikn-pdf — upprunalega PDF-skjalið á bak við FotoWeb-permalink, af SÖMU rót.
//
// 20.09.2026 (383): teikn-mynd skilar 6006 px JPEG af blaðinu. CAD-uppdrættir eru hins vegar VIGUR-PDF (Fiskislóð 41,
// 1. hæð: 0,4 MB, ~22.000 línuslóðir) og þar eru veggirnir sér línuflokkur (0,48 pt) — sjálfvirk veggjagreining á
// myndinni fann 0,3%, úr vigrinum fæst allt veggjanetið. Biðlarinn les slóðirnar með pdf.js; hér er aðeins skjalið sótt.
//
// FotoWeb afhendir ORIGINAL aðeins um „rendition request": POST /fotoweb/services/renditions → 202 + Location á
// bakgrunnsverk sem skilar skránni þegar hún er tilbúin (mælt: 1,5–3,5 sek). Sama flæði og fetch-plan í Kjarna notar.
// Skannaðir uppdrættir eru líka .pdf (Skútuvogur 4: 10 MB, ein mynd) — þeir eru sendir áfram óbreyttir og biðlarinn
// sér að þar er enginn vigur. Streymt, svo 6 MB svarþak Netlify stoppi þá ekki.

const LEYFDIR = new Set(['skjalasafn.reykjavik.is']);
const HAMARK = 40 * 1024 * 1024;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function villa(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const bida = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const raw = new URL(req.url).searchParams.get('url') || '';
  let target;
  try { target = new URL(raw); } catch { return villa(400, 'Ógild slóð'); }
  if (target.protocol !== 'https:' || !LEYFDIR.has(target.hostname)) return villa(403, 'Hýsillinn er ekki leyfður');
  if (!/\.pdf\.info$/i.test(target.pathname)) return villa(415, 'Teikningin er ekki PDF — enginn vigur til að lesa.');

  const base = target.protocol + '//' + target.host;
  try {
    const bidja = await fetch(base + '/fotoweb/services/renditions', {
      method: 'POST',
      headers: {
        'content-type': 'application/vnd.fotoware.rendition-request+json',
        accept: 'application/vnd.fotoware.rendition-response+json',
      },
      body: JSON.stringify({ href: target.pathname + '/__renditions/ORIGINAL' }),
      signal: AbortSignal.timeout(8000),
    });
    if (bidja.status !== 202 && bidja.status !== 200) return villa(502, 'Skjalasafnið hafnaði beiðninni (' + bidja.status + ')');
    let stadur = bidja.headers.get('location');
    if (!stadur) { const b = await bidja.json().catch(() => null); stadur = b && b.href; }
    if (!stadur) return villa(502, 'Skjalasafnið gaf enga slóð á skjalið');
    const slod = stadur.startsWith('http') ? stadur : base + stadur;

    for (let i = 0; i < 9; i++) {
      if (i) await bida(800);
      const r = await fetch(slod, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (r.status === 200) {
        const tegund = r.headers.get('content-type') || '';
        if (/text\/html|json/i.test(tegund)) continue;               // enn í vinnslu
        const lengd = Number(r.headers.get('content-length') || 0);
        if (lengd > HAMARK) return villa(413, 'Skjalið er stærra en 40 MB');
        const headers = new Headers(cors);
        headers.set('Content-Type', 'application/pdf');
        // ?nidurhal=1 (384, „Sækja í fullum gæðum"): vista sem skrá með nafni skjalsins í stað þess að opna í flipa.
        if (new URL(req.url).searchParams.get('nidurhal')) {
          const nafn = decodeURIComponent(target.pathname.split('/').pop() || 'teikning.pdf.info').replace(/\.info$/i, '').replace(/[^\w.\-]+/g, '_');
          headers.set('Content-Disposition', 'attachment; filename="' + nafn + '"');
        }
        if (lengd) headers.set('Content-Length', String(lengd));
        headers.set('Cache-Control', 'public, max-age=86400');
        return new Response(r.body, { status: 200, headers });
      }
      if (r.status >= 400 && r.status !== 404) return villa(502, 'Skjalasafnið svaraði ' + r.status);
    }
    return villa(504, 'Skjalið var ekki tilbúið í tæka tíð — reyndu aftur.');
  } catch (_) {
    return villa(502, 'Náði ekki í PDF-skjalið');
  }
};
