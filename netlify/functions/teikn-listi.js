// teikn-listi — same-origin proxy fyrir teikningaskrá.
//
// Vafrinn má EKKI kalla Kjarna-APIð beint: það sendir enga CORS-hausa, svo
// bein fetch frá slokkvitaeki.netlify.app félli. Hér er kallað þjónsmegin og
// svarinu skilað ÓBREYTTU af sömu rót. Tvö þrep, sama og /api/turbopaint/teikningar:
//   ?heimilisfang=Aðalstræti 4   → { results:[{landnr,label,postnr,heimild,ytriSlod,…}] }
//   ?landnr=100591               → { fjoldi,gildandi,results:[{infoUrl,thumb,lysing,haed,stig,grunnmynd,urelt,dags,…}] }
// Sama mynstur og netlify/functions/landnr.js.

const KJARNI = process.env.KJARNI_TEIKNINGAR_API || 'https://slokkvitaeki.vercel.app/api/turbopaint/teikningar';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const sp = new URL(req.url).searchParams;
  const heimilisfang = (sp.get('heimilisfang') || '').normalize('NFC').trim();
  const landnr = (sp.get('landnr') || '').replace(/[^0-9]/g, '');
  if (!landnr && heimilisfang.length < 2) {
    return json({ error: 'Sláðu inn heimilisfang (2+ stafi) eða landnúmer.' }, 400);
  }
  // 21.09.2026: Kópavogur / Garðabær / Hafnarfjörður (map.is) eru lykluð á landnr + heitinr + svf — mælt: aðeins
  // landnr skilaði 0 af 49 teikningum á Langamýri 22. Tölustafir eingöngu, svo ekkert annað slæðist í slóðina.
  const heitinr = (sp.get('heitinr') || '').replace(/[^0-9]/g, '');
  const svf = (sp.get('svf') || '').replace(/[^0-9]/g, '');
  const qs = landnr
    ? 'landnr=' + encodeURIComponent(landnr) + (svf ? '&heitinr=' + (heitinr || '0') + '&svf=' + svf : '')
    : 'heimilisfang=' + encodeURIComponent(heimilisfang);

  try {
    const r = await fetch(KJARNI + '?' + qs, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(28000),
    });
    // Skila svari Kjarna-APIsins óbreyttu (sama JSON-snið) af SÖMU rót.
    const txt = await r.text();
    return new Response(txt, {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (_) {
    return json({ error: 'Náði ekki í teikningaskrá.' }, 502);
  }
};
