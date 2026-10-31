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
// 19.10.2026 — BEIN KORTASJÁ (Seltjarnarnes 1100, Mosfellsbær 1604): Kjarni þekkir ekki þessi sveitarfélagsnúmer
// („Óþekkt sveitarfélagsnúmer", 400) og merkir staðföngin þar heimild 'óþekkt' án svf. Hér er því (a) staðfangalistinn
// auðgaður eftir póstnúmeri (170 → 1100, 270/271 → 1604) svo 374 TeiknSaekja sjái map.is-eign með svf + heitinr, og (b)
// listinn sóttur BEINT af map.is með heitinr HÚSSINS — heitinumer=0 skilar „Engar niðurstöður" þar (Sunnukriki 3: 515
// raðir á heitinr 1119092, 0 á lóðinni). Sama mynstur og hus-upplysingar hefur haft fyrir Seltjarnarnes síðan 02.10.
const MAPIS_SVF = {
  1000: { slug: 'kopavogur', nafn: 'Kópavogur' },
  1300: { slug: 'gardabaer', nafn: 'Garðabær' },
  1400: { slug: 'hafnarfjordur', nafn: 'Hafnarfjörður' },
  1100: { slug: 'seltjarnarnes', nafn: 'Seltjarnarnes', kort: 'Kortasjá Seltjarnarness', postnr: [170], bein: true },
  1604: { slug: 'moso', nafn: 'Mosfellsbær', kort: 'Kortasjá Mosfellsbæjar', postnr: [270, 271], bein: true },
  // 19.10.2026 (Agnar: „Keilisbraut 745, 262 … tengja við kortakerfið í Keflavík líka"): Reykjanesbær (SVFNR 2000,
  // map.is/reykjanesbaer). PDF-in á teikningar.rnb.is; húsateikningar á heitinr hússins (Keilisbraut 745: 7, lóðin: 0).
  /* 23.10.2026 (Agnar, Steypustöðin Borgarnesi): Borgarbyggð — SVFNR 3609, map.is/borgarbyggd.
   * Póstnúmerin þrjú eru Borgarnes (310), dreifbýlið og Hvanneyri/Bifröst/Varmaland (311) og
   * Reykholtsdalur (320). Skrárnar liggja á snorri.borgarbyggd.is.
   *
   * MÆLT þennan dag áður en þetta var skrifað: Kveldúlfsgata 30 (L237596) skilar NÍU teikningum,
   * þar af aðaluppdráttum frá 21.01.2025 og 22.12.2025. Lóðirnar fjórar við Engjaás — þar sem
   * Steypustöðin stendur — skila hins vegar „Engar niðurstöður". Það er ekki bilun í þessari
   * tengingu heldur gat í skjalasafninu: verksmiðjan er frá 1998 og safnið á netinu geymir
   * aðallega nýrra efni. Tengingin stendur samt, því hún þjónar öllum Borgarnes-kúnnum og
   * safnið fyllist. */
  2000: { slug: 'reykjanesbaer', nafn: 'Reykjanesbær', kort: 'Kortasjá Reykjanesbæjar', postnr: [230, 232, 233, 260, 262], bein: true },
  3609: { slug: 'borgarbyggd', nafn: 'Borgarbyggð', kort: 'Kortasjá Borgarbyggðar', postnr: [310, 311, 320], bein: true },
  /* 30.10.2026 (Agnar, Hótel Örk): Hveragerði — SVFNR 8716. Ekki map.is heldur kort.is (Gagnaland): opið JSON-API
   * kort.is/api/blueprints/property/<landnr>/?public=true skilar öllu safni eignarinnar (Hótel Örk, Breiðamörk 1C,
   * landnr 171132: 314 skjöl, 127 aðaluppdrættir, allt skannað) og PDF-in liggja á skrar.gagnaland.is. Safnið er lykilað á
   * LANDNR eingöngu og staðfangaleit Kjarna þekkir ekki Hveragerði, svo kalla þarf með landnr + svf=8716. */
  8716: { slug: 'hveragerdi', nafn: 'Hveragerði', kort: 'Kortasjá Hveragerðis', postnr: [810], bein: true, kortis: true },
};
const MAPIS_HOSTS = ['teikningar.hafnarfjordur.is', 'teikningar.gardabaer.is', 'gagnasja.kopavogur.is', 'luks.seltjarnarnes.is', 'luks.mos.is', 'teikningar.rnb.is', 'snorri.borgarbyggd.is', 'skrar.gagnaland.is'];
const beinSvf = svf => !!(MAPIS_SVF[svf] && MAPIS_SVF[svf].bein);
const svfFyrirPostnr = pn => Object.keys(MAPIS_SVF).find(k => (MAPIS_SVF[k].postnr || []).includes(Number(pn))) || null;

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
  // „Grunnmynd 2. og 3. hæð" (Reykjanesbær, Keilisbraut 745) — báðar hæðirnar, ekki aðeins sú síðari
  for (const m of t.matchAll(/(\d+)\.?\s*og\s*(\d+)\.\s*h[æa][eð]?ð/g)) for (const n of [Number(m[1]), Number(m[2])]) if (n && n <= 60 && !haed.includes(n)) haed.push(n);
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
// heitinr = 0 → teikningar LÓÐARINNAR; heitinr hússins → teikningar hússins (bein kortasjá). null = bilun, [] = tómt.
async function mapisTeikningar(landnr, svf, heitinr) {
  const sv = MAPIS_SVF[svf]; if (!sv) return null;
  if (sv.kortis) return kortisTeikningar(landnr);   // safnið er lykilað á landnr eingöngu
  const spyrja = s => fetch(MAPIS + '/webservice/queryTeiknigrunn.php?landnumer=' + landnr + '&svfnr=' + svf + '&heitinumer=' + (Number(heitinr) || 0) + '&t=' + s.token, {
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
// kort.is (Hveragerði): sama úttak og mapisTeikningar. Dagsetningin er oftast tóm („1899-12-31") — þá null, ekki skáldað ártal.
function kortisTeikning(row) {
  const slod = texti(row && row.file_url); if (!slod || !/^https:\/\//i.test(slod)) return null;
  let u; try { u = new URL(slod); } catch (_) { return null; }
  if (!MAPIS_HOSTS.includes(u.hostname)) return null;
  const dags = texti(row.samth_dags), ar = dags ? Number(dags.slice(0, 4)) : 0;
  const lysing = texti(row.lysing), gerd = texti(row.gerd);
  const tegund = { ADALUPPDRATTUR: 'Aðaluppdrættir', RAFMAGNSTEIKNINGAR: 'Raflagnateikningar', BURDARVIRKI: 'Burðarvirki', LAGNATEIKNINGAR: 'Lagnateikningar', LJOSMYNDIR: 'Ljósmyndir', MERKJALYSINGAR: 'Merkjalýsingar', ANNAD: 'Annað' }[row.tegund] || texti(row.tegund);
  return Object.assign({
    filename: decodeURIComponent(u.pathname.split('/').pop() || 'teikning.pdf'), infoUrl: u.href, thumb: null,
    stada: null, dags: ar > 1950 ? dags.slice(0, 10) : null, tegund, gerd, hofundur: texti(row.hofundur_name), lysing,
    bnnr: texti(row.teikning_nr), gata: null, urelt: false,
  }, haedir(gerd, lysing && !/\.pdf$/i.test(lysing) ? lysing : ''));
}
async function kortisTeikningar(landnr) {
  const r = await fetch('https://kort.is/api/blueprints/property/' + Number(landnr) + '/?public=true', { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 Slokkvitaeki-Teikning/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) return null;
  let rows; try { rows = await r.json(); } catch (_) { return null; }
  if (!Array.isArray(rows)) return [];
  const sed = new Set();   // sama skrá oft tvískráð í safninu
  return rows.map(kortisTeikning).filter(x => x && !sed.has(x.infoUrl) && sed.add(x.infoUrl))
    .sort((a, b) => (b.dags || '').localeCompare(a.dags || ''));
}
const lodarTeikningar = (landnr, svf) => (MAPIS_SVF[svf] && MAPIS_SVF[svf].kortis ? kortisTeikningar(landnr) : mapisTeikningar(landnr, svf, 0));
function mapisSvar(d, landnr, heitinr, svf, dr, lod) {
  return {
    utgafa: (d && d.utgafa) || null, heimild: MAPIS_SVF[svf].kortis ? 'kort.is' : 'map.is', heimildNafn: MAPIS_SVF[svf].nafn, landnr: Number(landnr),
    heitinr: Number(heitinr) || 0, svf: Number(svf), ...(lod && !MAPIS_SVF[svf].kortis ? { lod: true } : {}), fjoldi: dr.length,
    gildandi: dr.filter(x => !x.urelt).length, hrar: dr.length, results: dr,
  };
}
// Staðföng Kjarna í beinni kortasjá: 'óþekkt' → map.is með svf, nafni kortasjár og djúptengli (sama snið og Kjarni gefur
// Kópavogi/Garðabæ/Hafnarfirði). Skilar null þegar engu var breytt, svo texti Kjarna fari óbreyttur áfram.
function audgaStadfong(d) {
  if (!d || !Array.isArray(d.results)) return null;
  let breytt = false;
  for (const x of d.results) {
    if (!x || (x.svf && x.heimild === 'map.is')) continue;
    const svf = svfFyrirPostnr(x.postnr); if (!svf || !beinSvf(svf)) continue;
    const sv = MAPIS_SVF[svf];
    Object.assign(x, { heimild: 'map.is', heimildNafn: sv.kort || sv.nafn, svf: Number(svf), ytriSlod: x.ytriSlod || (MAPIS + '/' + sv.slug + '/') });
    breytt = true;
  }
  return breytt ? d : null;
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

  // Bein kortasjá (Seltjarnarnes, Mosfellsbær): Kjarni er ekki spurður — hann svarar 400 á svf. Húsið fyrst, lóðin til vara.
  if (landnr && svf && beinSvf(svf)) {
    try {
      let dr = Number(heitinr) ? await mapisTeikningar(Number(landnr), Number(svf), Number(heitinr)) : null;
      let lod = false;
      if (!dr || !dr.length) { const l = await lodarTeikningar(Number(landnr), Number(svf)); if (l && l.length) { dr = l; lod = true; } }
      if (dr === null) return json({ error: 'Kortasjáin svaraði ekki.' }, 502);
      const headers = { ...cors, 'Content-Type': 'application/json; charset=utf-8' };
      if (dr.length) { headers['Cache-Control'] = 'public, max-age=3600'; headers['Netlify-CDN-Cache-Control'] = 'public, durable, s-maxage=604800, stale-while-revalidate=2592000'; headers['Netlify-Cache-ID'] = 'teikn-listi'; }
      return new Response(JSON.stringify(mapisSvar(null, landnr, heitinr, svf, dr, lod)), { status: 200, headers });
    } catch (_) { return json({ error: 'Náði ekki í kortasjána.' }, 502); }
  }

  try {
    const r = await fetch(KJARNI + '?' + qs, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(28000),
    });
    // Skila svari Kjarna-APIsins óbreyttu (sama JSON-snið) af SÖMU rót.
    let txt = await r.text();
    // Staðfangaleit: staðföng í beinni kortasjá fá svf + heimild hér (Kjarni segir 'óþekkt').
    if (!landnr && r.ok) {
      let d = null; try { d = JSON.parse(txt); } catch (_) {}
      const a = audgaStadfong(d);
      if (a) txt = JSON.stringify(a);
    }
    // map.is-staðfang án teikninga (eða heitinr vantar) → lóðarteikningarnar sjálfar
    if (landnr && svf && MAPIS_SVF[svf]) {
      let d = null; try { d = JSON.parse(txt); } catch (_) {}
      const tomt = !r.ok || !d || !Array.isArray(d.results) || d.results.length === 0;
      if (tomt) {
        try {
          const lod = await lodarTeikningar(Number(landnr), Number(svf));
          if (lod && lod.length) return json(mapisSvar(d, landnr, heitinr, svf, lod, true));
        } catch (_) { /* svar Kjarna stendur */ }
      }
    }
    // 13.10.2026 (hraði teikningagluggans): þrjár raðbundnar sóknir (heimilisfang → landnr) tóku 1,7 + 0,6 + 0,8 s í
    // hvert sinn sem gluggi opnaðist á félagi án vistaðrar teikningar. Svar MEÐ niðurstöðum fer í varanlega skyndiminnið
    // (öllum CDN-hnútum sameiginlegt) í viku og er endurnýjað í bakgrunni eftir það — nýjar teikningar skjalasafnsins
    // birtast því innan viku. Villur og tóm svör geymast ekki.
    const headers = { ...cors, 'Content-Type': 'application/json; charset=utf-8' };
    if (r.ok) {
      let d = null; try { d = JSON.parse(txt); } catch (_) {}
      // 19.10.2026 (Reykjanesbær): staðfang með heimild 'óþekkt' (sveitarfélag sem leitin þekkir ekki enn) fór í vikulangt
      // varanlegt skyndiminni og hélt „óþekkt" eftir að sveitarfélaginu var bætt við. Slíkt svar geymist nú aðeins klst.
      const othekkt = d && Array.isArray(d.results) && d.results.some((x) => x && x.heimild === 'óþekkt');
      if (othekkt) {
        headers['Cache-Control'] = 'public, max-age=600';
        headers['Netlify-CDN-Cache-Control'] = 'public, s-maxage=3600';
      } else if (d && !d.error && Array.isArray(d.results) && d.results.length) {
        headers['Cache-Control'] = 'public, max-age=3600';
        headers['Netlify-CDN-Cache-Control'] = 'public, durable, s-maxage=604800, stale-while-revalidate=2592000';
        headers['Netlify-Cache-ID'] = 'teikn-listi';   // lifir birtingar; hreinsað með merkinu ef úttakið breytist
      } else if (d && !d.error && Array.isArray(d.results)) {
        // Tómt svar ræðst af sniði heimilisfangsins (fullt „…, 112 Reykjavík" finnst ekki; glugginn reynir svo styttra) —
        // geymt í sólarhring, án bakgrunns-endurnýjunar, svo raunveruleg breyting skili sér daginn eftir.
        headers['Netlify-CDN-Cache-Control'] = 'public, durable, s-maxage=86400';
      }
    }
    return new Response(txt, { status: r.status, headers });
  } catch (_) {
    return json({ error: 'Náði ekki í teikningaskrá.' }, 502);
  }
};
