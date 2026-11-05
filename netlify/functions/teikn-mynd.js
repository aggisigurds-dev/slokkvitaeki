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

  const sp = new URL(req.url).searchParams;
  const raw = sp.get('url') || '';
  const staerd = Math.min(4000, Number((sp.get('staerd') || '').replace(/[^0-9]/g, '')) || 0);
  let target;
  try { target = new URL(raw); } catch { return villa(400, 'Ógild slóð'); }
  // Aðeins leyfðir skjalasafns-hýslar — ekki opinn myndaproxy.
  if (target.protocol !== 'https:' || !LEYFDIR.has(target.hostname)) {
    return villa(403, 'Hýsillinn er ekki leyfður');
  }

  /* ?staerd=N — FORSKOÐUN Í STAÐ FULLRAR MYNDAR (Agnar 05.11.2026: „fotoWeb-skyndiminnið er útrunnið … hvað gerum við í því").
   *
   * Séruppdráttalistinn geymdi `previews[].href` BEINT úr FotoWeb í 30 daga. Þær slóðir bera lykil sem FotoWeb skiptir um:
   * MÆLT þennan dag á BN057064-1174-0015.pdf — geymt hjá okkur `…pdf.jCee3qaHMslX…` (HTTP 404, HTML-villusíða), ferskt úr
   * safninu `…pdf.jCee6_WHMslX…` (HTTP 200, 572 kB). Smámyndir séruppdrátta voru því tómar á hverju húsi þar sem listinn
   * var eldri en lyklaskiptin, og það sást ekki sem villa — bara auður rammi.
   *
   * Lagfæringin er að geyma ENGA FotoWeb-slóð. Kallarinn geymir `infoUrl` (sem er varanlegur permalink) og biður hér um
   * stærð; forskoðunin er flett upp í hvert sinn. Svarið sjálft má geyma lengi eins og áður — myndin breytist ekki þótt
   * slóðin að henni geri það, og beiðnislóðin hér (`?url=…&staerd=…`) er stöðug.
   *
   * Bregðist uppflettingin er fallið aftur á fulla myndina fyrir neðan — betra en auður rammi. */
  let myndSlod = null;
  if (staerd) {
    try {
      const r0 = await fetch(raw, {
        headers: { Accept: 'application/vnd.fotoware.asset+json', 'User-Agent': 'Slokkvitaeki/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (r0.ok) {
        const a = await r0.json();
        const pv = (Array.isArray(a && a.previews) ? a.previews : [])
          .filter((x) => x && x.href)
          .sort((x, y) => (x.size || 0) - (y.size || 0));
        const val = pv.find((x) => (x.size || 0) >= staerd) || pv[pv.length - 1];
        if (val) myndSlod = new URL(val.href, target.origin).href;
      }
    } catch (_) { /* fellur á fullu myndina */ }
  }

  try {
    if (myndSlod) {
      const rp = await fetch(myndSlod, { headers: { 'User-Agent': 'Slokkvitaeki/1.0' }, signal: AbortSignal.timeout(30000) });
      if (rp.ok && rp.body) {
        const h = new Headers(cors);
        h.set('Content-Type', rp.headers.get('content-type') || 'image/jpeg');
        const l = rp.headers.get('content-length');
        if (l) h.set('Content-Length', l);
        h.set('Cache-Control', 'public, max-age=604800');
        h.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=31536000, stale-while-revalidate=604800');
        h.set('Netlify-Cache-ID', 'teikn-mynd');
        return new Response(rp.body, { status: 200, headers: h });
      }
      // forskoðunin brást (lykillinn getur hafa skipst MILLI uppflettingar og sóknar) — full mynd fyrir neðan
    }
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
    // 13.10.2026 (Agnar: „auka hraðann á teikningaglugganum"): fyrsta sókn fer gegnum Kjarna til skjalasafnsins og tók
    // 3,4–5,7 s; endurtekin af CDN-hnút 0,45 s. Hnúturinn geymdi aðeins í klst og hver hnútur sér. Skjalasafns-slóðirnar
    // eru dagsettar og breytast ekki — svarið fer því í VARANLEGA skyndiminnið (durable, sameiginlegt öllum hnútum) í ár,
    // og vafrinn geymir það í viku. Villusvör (villa()) bera enga slíka hausa og geymast ekki.
    headers.set('Cache-Control', 'public, max-age=604800');
    headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=31536000, stale-while-revalidate=604800');
    // Ný birting tæmir skyndiminnið sjálfgefið (og hér er birt nánast daglega) — merkið heldur myndunum yfir birtingar.
    // Breytist ÚTTAK fallsins þarf að hreinsa merkið (Netlify purge, cache_tags: ["teikn-mynd"]).
    headers.set('Netlify-Cache-ID', 'teikn-mynd');
    return new Response(r.body, { status: 200, headers });
  } catch (_) {
    return villa(502, 'Náði ekki í mynd');
  }
};
