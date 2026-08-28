/**
 * Landnúmer lookup — server-side proxy (2026-08-28, ósk Agnars).
 *
 * Tvívirka leitin: HEIMILISFANG → LANDNÚMER → TEIKNINGAR.
 * Skref 1 er hér. HMS/Fasteignaskrá (geo.fasteignaskra.is) skilar hreinu JSON
 * en sendir ENGIN CORS-haus (staðfest 28.08: svarið hefur ekkert
 * `access-control-allow-origin`), svo vafrinn getur ekki kallað beint. Sama
 * ástæða og kt-lookup er til fyrir — og sama lausn.
 *
 * Endapunktur:
 *   GET /.netlify/functions/landnr?leit=Skútuvogur%204
 *   →  { results: [ { landnr, label, heinum, x, y } ] }
 *
 * Upprunasvarið lítur svona út:
 *   [{"Heinum":1016256,"X":361362.5,"Y":407183.5,
 *     "Vef_Birting":"Skútuvogur 4  (104) - L 105166","Landnr":105166}]
 *
 * Skref 2 þarf ENGA þjónustu — landnúmerið fer beint í slóð:
 *   https://skjalasafn.reykjavik.is/fotoweb/archives/5000-Aðaluppdrættir/?q=<landnr>
 *   https://geo.fasteignaskra.is/landeignaskra/<landnr>
 */
const SRC = 'https://geo.fasteignaskra.is/landeignaskra/search';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });

  const url = new URL(req.url);
  const leit = (url.searchParams.get('leit') || url.searchParams.get('term') || '').trim();
  if (leit.length < 2) {
    return json({ results: [], error: 'Sláðu inn a.m.k. tvo stafi.' }, 400);
  }

  try {
    const r = await fetch(SRC + '?term=' + encodeURIComponent(leit), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Slokkvitaeki/1.0; +https://slokkvitaeki.netlify.app)',
        'Accept': 'application/json, text/javascript, */*',
      },
    });
    if (!r.ok) return json({ results: [], error: 'Landeignaskrá svaraði ' + r.status }, 502);

    // Content-Type er 'application/javascript' þótt innihaldið sé JSON — því
    // er textinn lesinn og þáttaður sjálf, ekki r.json().
    const txt = await r.text();
    let raw;
    try { raw = JSON.parse(txt); } catch (_) {
      return json({ results: [], error: 'Óskiljanlegt svar frá Landeignaskrá' }, 502);
    }
    if (!Array.isArray(raw)) raw = [];

    const results = raw.map(x => ({
      landnr: x.Landnr != null ? Number(x.Landnr) : null,
      // „Skútuvogur 4  (104) - L 105166" — tvöfalt bil í upprunanum, hreinsað.
      label: String(x.Vef_Birting || '').replace(/\s+/g, ' ').trim(),
      heinum: x.Heinum != null ? Number(x.Heinum) : null,
      x: x.X != null ? Number(x.X) : null,
      y: x.Y != null ? Number(x.Y) : null,
    })).filter(x => x.landnr);

    return json({ results });
  } catch (e) {
    return json({ results: [], error: String((e && e.message) || e) }, 502);
  }
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors),
  });
}
