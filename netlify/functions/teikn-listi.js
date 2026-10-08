// teikn-listi — same-origin proxy fyrir teikningaskrá.
//
// Vafrinn má EKKI kalla Kjarna-APIð beint: það sendir enga CORS-hausa, svo
// bein fetch frá slokkvitaeki.netlify.app félli. Hér er kallað þjónsmegin og
// svarinu skilað ÓBREYTTU af sömu rót. Tvö þrep, sama og /api/turbopaint/teikningar:
//   ?heimilisfang=Aðalstræti 4   → { results:[{landnr,label,postnr,heimild,ytriSlod,…}] }
//   ?landnr=100591               → { fjoldi,gildandi,results:[{infoUrl,thumb,lysing,haed,stig,grunnmynd,urelt,dags,…}] }
// Sama mynstur og netlify/functions/landnr.js.
//
// 08.10.2026 — LÓÐARTEIKNINGAR (Berjavellir 6A/6B, Hafnarfirði): kortasjáin (map.is) skráir sumar teikningar á LÓÐINA
// (heitinúmer 0), ekki á staðfangið. Landeignaskrá gefur aðeins staðföngin (6A = 1164670, 6B = 1164671) og fyrir þau
// skilar queryTeiknigrunn „Engar niðurstöður" — en heitinumer=0 á sama landnúmeri skilar 91 teikningu (grunnmyndir allra
// hæða, útlit, snið). Kjarni hafnar heitinr 0, svo þegar Kjarni skilar engu er spurt hér beint, á lóðina, með sömu setu
// og kortasjáin sjálf (sjá kjarni apps/slokkvitaeki/app/api/turbopaint/mapis.ts). Svarið fær `lod: true`.

const KJARNI = process.env.KJARNI_TEIKNINGAR_API || 'https://slokkvitaeki.vercel.app/api/turbopaint/teikningar';
const MAPIS = 'https://www.map.is';
const MAPIS_SVF = { 1000: { slug: 'kopavogur', nafn: 'Kópavogur' }, 1300: { slug: 'gardabaer', nafn: 'Garðabær' }, 1400: { slug: 'hafnarfjordur', nafn: 'Hafnarfjörður' } };
const MAPIS_HOSTS = ['teikningar.hafnarfjordur.is', 'teikningar.gardabaer.is', 'gagnasja.kopavogur.is'];

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

// ── map.is beint (aðeins lóðarteikningar, heitinumer=0) ──────────────────────────────────────────────────────────────
let seta = null;                        // { cookie, token, sott } — lifir meðan fallið er heitt
async function mapisSeta(slug, endurnyja) {
  if (!endurnyja && seta && Date.now() - seta.sott < 20 * 60 * 1000) return seta;
  const r = await fetch(MAPIS + '/' + slug + '/', { headers: { 'User-Agent': 'Mozilla/5.0 Slokkvitaeki-Teikning/1.0', Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error('map.is ' + r.status);
  const token = ((await r.text()).match(/config\.t\s*=\s*"([a-z0-9]{20,})"/) || [])[1];
  const kokur = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''];
  const cookie = kokur.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  if (!token || !/PHPSESSID=/.test(cookie)) throw new Error('map.is gaf enga setu');
  seta = { cookie, token, sott: Date.now() };
  return seta;
}
// Sama hæðaþáttun og Kjarni (haedir.ts): „Grunnm. 2-4 hæð", „Grunnmynd kjallara", „Ris" …
function haedir(lysing, gerd) {
  const t = ((lysing || '') + ' ' + (gerd || '')).toLowerCase(), haed = [];
  for (const m of t.matchAll(/(\d+)\.\s*h[æa][eð]?ð/g)) { const n = Number(m[1]); if (n && !haed.includes(n)) haed.push(n); }
  // „2Á4 hæð" = 2–4: Hafnarfjarðarskráin skilar bandstriki milli talna sem „Á" (lágstafað hér)
  for (const m of t.matchAll(/(\d+)\.?\s*[-–á]\s*(\d+)\.?\s*h[æa][eð]?ð/g)) { const a = Number(m[1]), b = Number(m[2]); if (a && b && b >= a && b - a <= 30) for (let n = a; n <= b; n++) if (!haed.includes(n)) haed.push(n); }
  const kjallari = /kjallar/.test(t), ris = /\bris\b|ris\.|rish[æa]ð/.test(t), stig = [];
  if (kjallari) stig.push('Kjallari');
  if (/milligólf|milligolf/.test(t)) stig.push('Milligólf');
  if (/jarðh[æa]ð|jardh/.test(t)) stig.push('Jarðhæð');
  if (ris) stig.push('Ris');
  return { haed: haed.sort((a, b) => a - b), stig, kjallari, ris, grunnmynd: /grunnm/.test(t) || haed.length > 0 || stig.length > 0 };
}
const texti = v => { if (v == null) return null; const s = String(v).replace(/\s+/g, ' ').trim(); return s && s.toLowerCase() !== 'null' ? s : null; };
const urelt = s => s === 'Ó' || s === 'ó' || s === 'F' || s === 'f';
function teikning(row) {
  const slod = texti(row.online_path);
  if (!slod || !/^https:\/\//i.test(slod)) return null;
  let u; try { u = new URL(slod); } catch (_) { return null; }
  if (!MAPIS_HOSTS.includes(u.hostname)) return null;
  const stada = texti(row.status), lysing = texti(row.lysing), gerd = texti(row.gerd);
  return Object.assign({
    filename: decodeURIComponent(u.pathname.split('/').pop() || 'teikning.pdf'), infoUrl: slod, thumb: null,
    stada: stada === null ? null : urelt(stada) ? (stada.toUpperCase() === 'F' ? 'Fellt úr gildi' : 'Ógilt') : stada,
    dags: texti(row.dagsetning), tegund: texti(row.tegund), gerd, hofundur: texti(row.hofundur_nafn), lysing,
    bnnr: texti(row.teikninganumer), gata: null, urelt: urelt(stada),
  }, haedir(lysing, gerd));
}
async function lodarTeikningar(landnr, svf) {
  const sv = MAPIS_SVF[svf]; if (!sv) return null;
  const spyrja = s => fetch(MAPIS + '/webservice/queryTeiknigrunn.php?landnumer=' + landnr + '&svfnr=' + svf + '&heitinumer=0&t=' + s.token, {
    headers: { Cookie: s.cookie, Referer: MAPIS + '/' + sv.slug + '/', 'User-Agent': 'Mozilla/5.0 Slokkvitaeki-Teikning/1.0', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/plain, */*' },
    signal: AbortSignal.timeout(15000),
  });
  let r = await spyrja(await mapisSeta(sv.slug));
  if (r.status === 403) r = await spyrja(await mapisSeta(sv.slug, true));
  if (!r.ok) return null;
  const t = (await r.text()).trim();
  if (!t.startsWith('[')) return [];
  let rows; try { rows = JSON.parse(t); } catch (_) { return null; }
  return rows.map(teikning).filter(Boolean).sort((a, b) => (a.urelt !== b.urelt ? (a.urelt ? 1 : -1) : (b.dags || '').localeCompare(a.dags || '')));
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
    // map.is-staðfang án teikninga (eða heitinr vantar) → lóðarteikningarnar sjálfar
    if (landnr && svf && MAPIS_SVF[svf]) {
      let d = null; try { d = JSON.parse(txt); } catch (_) {}
      const tomt = !r.ok || !d || !Array.isArray(d.results) || d.results.length === 0;
      if (tomt) {
        try {
          const lod = await lodarTeikningar(Number(landnr), Number(svf));
          if (lod && lod.length) {
            return json({
              utgafa: (d && d.utgafa) || null, heimild: 'map.is', heimildNafn: MAPIS_SVF[svf].nafn, landnr: Number(landnr),
              heitinr: Number(heitinr) || 0, svf: Number(svf), lod: true, fjoldi: lod.length,
              gildandi: lod.filter(x => !x.urelt).length, hrar: lod.length, results: lod,
            });
          }
        } catch (_) { /* svar Kjarna stendur */ }
      }
    }
    return new Response(txt, {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (_) {
    return json({ error: 'Náði ekki í teikningaskrá.' }, 502);
  }
};
