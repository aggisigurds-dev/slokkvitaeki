// teikn-mynd — same-origin proxy fyrir gólfplan-myndina.
//
// Tekur FotoWeb .info-permalink (úr teikn-listi), sækir myndina gegnum
// Kjarna-fetch-plan (sem kann rendition-flæði FotoWeb og velur JPEG á undan
// risa-TIF) og skilar bætunum af SÖMU rót. Það er lykilatriði: teiknum myndina
// á <canvas> og Vista (toDataURL) verður að virka — cross-origin mynd myndi
// „menga“ canvas og brjóta vistun. Streymt (ekki buffrað) svo 6 MB Netlify-
// þakið stoppi ekki stærri teikningar.

const FETCH_PLAN = process.env.KJARNI_FETCH_PLAN || 'https://slokkvitaeki.vercel.app/api/turbopaint/fetch-plan';
const LEYFDIR = new Set(['skjalasafn.reykjavik.is', 'teikningar.hafnarfjordur.is']);

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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const raw = new URL(req.url).searchParams.get('url') || '';
  let target;
  try { target = new URL(raw); } catch { return villa(400, 'Ógild slóð'); }
  // Aðeins leyfðir skjalasafns-hýslar — ekki opinn myndaproxy.
  if (target.protocol !== 'https:' || !LEYFDIR.has(target.hostname)) {
    return villa(403, 'Hýsillinn er ekki leyfður');
  }

  try {
    // prefer=image: fetch-plan skilar bráðum upprunalegu VIGUR-PDF fyrir .pdf-permalinka (kjarni#124, fyrir TurboPaint).
    // Hér fer myndin í <img> og á <canvas> — PDF myndi brjóta „Sækja teikningu". Vigurinn sækir teikn-pdf sér.
    const r = await fetch(FETCH_PLAN + '?prefer=image&url=' + encodeURIComponent(raw), {
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok || !r.body) return villa(r.status || 502, 'Myndin fékkst ekki (' + r.status + ')');
    const headers = new Headers(cors);
    headers.set('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    const len = r.headers.get('content-length');
    if (len) headers.set('Content-Length', len);
    headers.set('Cache-Control', 'public, max-age=3600');
    return new Response(r.body, { status: 200, headers });
  } catch (_) {
    return villa(502, 'Náði ekki í mynd');
  }
};
