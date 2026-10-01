/**
 * Séruppdrættir Reykjavíkur — FotoWeb-safn 5004, einu sinni á landnúmer.
 *
 * Aðaluppdrættir (safn 5000) koma áfram úr hus-upplysingar / teikn-listi.
 * Þetta fall snertir aðeins 5004-Séruppdrættir og aðeins þegar beðið er um
 * eitt landnúmer. Það gengur ekki yfir fyrirtæki.
 *
 *   GET /.netlify/functions/seruppdrattir?landnr=105165
 *   GET /.netlify/functions/seruppdrattir?heimilisfang=Skútuvogi%202,%20104%20Reykjavík
 *   &endurnyja=1  sækir aftur og skrifar yfir skyndiminnið
 *
 * Svar (tómir flokkar falla út):
 *   { landnr, label, flokkar: [{ id, merki, fjoldi, slod }], cache }
 *
 * Flokkar safnsins (reitur 205), staðfest á landnúmeri 105165:
 *   Raflagnir, Lagnir, Burður, Sérteikningar.
 * Pípur, hiti og loft eru allt merkt „Lagnir". Ekkert heitir Pípulagnir
 * eða Loftræsting. Kópavogur, Garðabær og Hafnarfjörður fá ekkert kall.
 *
 * Skyndiminni: hus_upplysingar_cache, lykill serupp:<landnr> og
 * seradr:<heimilisfang>, útgáfa serupp-1. Önnur útgáfa en húsflettingin
 * (2026-09-14) svo röðin blandast ekki við aðaluppdrættina.
 */
const FOTOWEB = 'https://skjalasafn.reykjavik.is';
const ARCH = '/fotoweb/archives/5004-S%C3%A9ruppdr%C3%A6ttir/';
const OPID = 'https://skjalasafn.reykjavik.is/fotoweb/archives/5004-Séruppdrættir/';
const WFS = 'https://geo.fasteignaskra.is/ws/geoserver/wfs';

const SB_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SB_KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SB_HAUS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const UTGAFA = 'serupp-1';
const HUS_UTGAFA = '2026-09-14';

const RVK = new Set([101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 116, 121, 123, 124, 125, 127, 128, 129, 130, 132, 155, 161, 162]);
const MAPIS = new Set([200, 201, 202, 203, 210, 211, 212, 225, 220, 221]);

/** Nafn í safninu → íslenskt merki á spjaldinu. Burður er burðarþolsteikningarnar. */
const FLOKKAR = [
  { id: 'raf', tegund: 'Raflagnir', merki: 'Raflagnir' },
  { id: 'lagnir', tegund: 'Lagnir', merki: 'Lagnir (pípur, hiti, loft)' },
  { id: 'burdur', tegund: 'Burður', merki: 'Burðarþol' },
  { id: 'ser', tegund: 'Sérteikningar', merki: 'Sérteikningar' },
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

function lykillHeimilisfangs(adr) {
  return 'seradr:' + String(adr || '').normalize('NFC').trim().toLowerCase();
}
function lykillLandnr(landnr) {
  return 'serupp:' + String(landnr);
}

async function lesa(lykill) {
  try {
    const u = `${SB_URL}/rest/v1/hus_upplysingar_cache?lykill=eq.${encodeURIComponent(lykill)}`
      + `&utgafa=eq.${encodeURIComponent(UTGAFA)}&select=svar&limit=1`;
    const r = await fetch(u, { headers: SB_HAUS, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const radir = await r.json();
    return (Array.isArray(radir) && radir[0] && radir[0].svar) ? radir[0].svar : null;
  } catch (_) { return null; }
}

async function skrifa(lykill, heimilisfang, svar) {
  try {
    await fetch(`${SB_URL}/rest/v1/hus_upplysingar_cache?on_conflict=lykill`, {
      method: 'POST',
      headers: { ...SB_HAUS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ lykill, heimilisfang: heimilisfang || '', utgafa: UTGAFA, svar, uppfaert: new Date().toISOString() }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (_) {}
}

async function lesaHus(adr) {
  try {
    const lykill = String(adr || '').normalize('NFC').trim().toLowerCase();
    const u = `${SB_URL}/rest/v1/hus_upplysingar_cache?lykill=eq.${encodeURIComponent(lykill)}`
      + `&utgafa=eq.${encodeURIComponent(HUS_UTGAFA)}&select=svar&limit=1`;
    const r = await fetch(u, { headers: SB_HAUS, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const radir = await r.json();
    return (Array.isArray(radir) && radir[0] && radir[0].svar) ? radir[0].svar : null;
  } catch (_) { return null; }
}

export function postnrAf(raw) {
  const t = String(raw || '');
  const eftir = t.split(',').slice(1).join(' ');
  const m = /\b(\d{3})\b/.exec(eftir) || /\b(\d{3})\b/.exec(t);
  const n = m ? Number(m[1]) : 0;
  return n >= 100 && n <= 999 ? n : 0;
}

/** Reykjavík má í safnið. Kópavogur, Garðabær og Hafnarfjörður ekki. */
export function erReykjavik(raw) {
  const pn = postnrAf(raw);
  if (MAPIS.has(pn)) return false;
  if (RVK.has(pn)) return true;
  return /reykjav[ií]k/i.test(String(raw || ''));
}

/** „Skútuvogi 2, 104 Reykjavík" → { gata, husnr, bokst, postnr } */
export function thatta(raw) {
  const t = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const fyrsti = t.split(',')[0].trim();
  const m = /^(.+?)\s+(\d{1,4})\s*([a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ])?/.exec(fyrsti);
  if (!m) return null;
  const postnr = postnrAf(t);
  return { gata: m[1].trim(), husnr: Number(m[2]), bokst: (m[3] || '').toUpperCase() || null, postnr: postnr || null };
}

async function wfsLandnr(h) {
  const cql = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const tilraunir = [
    [`(HEITI_NF ILIKE ${cql(h.gata)} OR HEITI_TGF ILIKE ${cql(h.gata)})`, `HUSNR=${h.husnr}`, h.bokst ? `BOKST ILIKE ${cql(h.bokst)}` : '', h.postnr ? `POSTNR=${h.postnr}` : ''],
    [`(HEITI_NF ILIKE ${cql(h.gata)} OR HEITI_TGF ILIKE ${cql(h.gata)})`, `HUSNR=${h.husnr}`, h.postnr ? `POSTNR=${h.postnr}` : ''],
    [`(HEITI_NF ILIKE ${cql(h.gata)} OR HEITI_TGF ILIKE ${cql(h.gata)})`, `HUSNR=${h.husnr}`],
  ];
  for (const bitar0 of tilraunir) {
    const bitar = bitar0.filter(Boolean);
    const url = `${WFS}?service=WFS&version=1.1.0&request=GetFeature&typename=fasteignaskra:VSTADF_ALLT&outputFormat=application/json&maxFeatures=8&CQL_FILTER=${encodeURIComponent(bitar.join(' AND '))}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Slokkvitaeki/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) continue;
    const d = await r.json();
    const rows = (Array.isArray(d.features) ? d.features : []).map((f) => f.properties || {}).filter((p) => p.LANDNR);
    const iSvaedi = rows.filter((p) => {
      const pn = Number(p.POSTNR) || 0;
      if (h.postnr && pn && pn !== h.postnr && !RVK.has(pn)) return false;
      const sv = p.SVFNR != null && String(p.SVFNR).trim() !== '' ? Number(p.SVFNR) : null;
      if (sv && sv !== 0) return false;
      return !pn || RVK.has(pn) || sv === 0;
    });
    if (iSvaedi.length) {
      iSvaedi.sort((a, b) => (a.BOKST ? 1 : 0) - (b.BOKST ? 1 : 0));
      return iSvaedi[0];
    }
  }
  return null;
}

async function landnrUrHeimilisfangi(adr) {
  if (!erReykjavik(adr)) return { utan: true };
  const hus = await lesaHus(adr);
  if (hus && hus.eign && hus.eign.landnr && !hus.eign.svf) {
    return { landnr: Number(hus.eign.landnr), label: hus.eign.label || '' };
  }
  if (hus && hus.eign && hus.eign.svf) return { utan: true };
  const h = thatta(adr);
  if (!h) return { error: 'Heimilisfangið er ekki á sniðinu „Gata 12"' };
  const st = await wfsLandnr(h);
  if (!st) return { error: 'Fann ekki landnúmer í Staðfangaskrá' };
  const label = `${st.HEITI_NF || h.gata} ${st.HUSNR || h.husnr}${st.BOKST ? String(st.BOKST).toUpperCase() : ''}`;
  return { landnr: Number(st.LANDNR), label };
}

function tegundAf(asset) {
  const md = (asset && asset.metadata) || {};
  const v = md['205'] && md['205'].value;
  if (v == null) return '';
  return String(Array.isArray(v) ? v[0] : v).trim();
}

async function fotoweb(path) {
  const url = String(path).startsWith('http') ? String(path) : FOTOWEB + path;
  const r = await fetch(url, {
    headers: {
      Accept: 'application/vnd.fotoware.assetlist+json',
      'User-Agent': 'Slokkvitaeki/1.0',
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) throw new Error('Skjalasafnið svaraði ' + r.status);
  return r.json();
}

/** Fjöldi blaða í einum flokki. Fyrsta síða + síðasta síða, ekki öll blöðin. */
async function telja(landnr, tegund, fyrsta) {
  const rows = Array.isArray(fyrsta.data) ? fyrsta.data : [];
  if (!rows.length) return 0;
  if (rows.some((a) => tegundAf(a) && tegundAf(a) !== tegund)) {
    throw new Error('Leit á „' + tegund + '“ skilaði öðrum flokki');
  }
  const last = fyrsta.paging && fyrsta.paging.last;
  const m = /(?:\?|&)p=(\d+)/.exec(String(last || ''));
  if (!m) return rows.length;
  const sida = Number(m[1]);
  if (!sida) return rows.length;
  const lastBody = await fotoweb(String(last));
  const nLast = Array.isArray(lastBody.data) ? lastBody.data.length : 0;
  if (!nLast) throw new Error('Síðasta síða „' + tegund + '“ var tóm');
  return sida * rows.length + nLast;
}

async function saekjaFlokka(landnr) {
  const fyrstu = await Promise.all(FLOKKAR.map((f) => {
    const q = landnr + ' ' + f.tegund;
    return fotoweb(ARCH + '?q=' + encodeURIComponent(q));
  }));
  const fjoldi = await Promise.all(FLOKKAR.map((f, i) => telja(landnr, f.tegund, fyrstu[i])));
  const flokkar = [];
  FLOKKAR.forEach((f, i) => {
    if (!fjoldi[i]) return;
    flokkar.push({
      id: f.id,
      merki: f.merki,
      fjoldi: fjoldi[i],
      slod: OPID + '?q=' + encodeURIComponent(landnr + ' ' + f.tegund),
    });
  });
  return flokkar;
}

function medCache(svar, cache) {
  return { ...svar, cache: !!cache, utgafa: UTGAFA };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const sp = new URL(req.url).searchParams;
  const endurnyja = sp.get('endurnyja') === '1';
  const landnrBeint = (sp.get('landnr') || '').replace(/[^0-9]/g, '');
  const heimilisfang = (sp.get('heimilisfang') || '').normalize('NFC').trim();
  if (!landnrBeint && heimilisfang.length < 4) return json({ error: 'landnr eða heimilisfang vantar' }, 400);

  if (heimilisfang && !erReykjavik(heimilisfang)) {
    const utan = { utan: true, flokkar: [] };
    if (!endurnyja) await skrifa(lykillHeimilisfangs(heimilisfang), heimilisfang, utan);
    return json(medCache(utan, false));
  }

  if (!endurnyja && heimilisfang) {
    const til = await lesa(lykillHeimilisfangs(heimilisfang));
    if (til && (til.flokkar || til.utan)) return json(medCache(til, true));
  }

  let landnr = landnrBeint ? Number(landnrBeint) : 0;
  let label = '';
  if (!landnr && heimilisfang) {
    try {
      const fund = await landnrUrHeimilisfangi(heimilisfang);
      if (fund.utan) {
        const utan = { utan: true, flokkar: [] };
        await skrifa(lykillHeimilisfangs(heimilisfang), heimilisfang, utan);
        return json(medCache(utan, false));
      }
      if (fund.error || !fund.landnr) return json({ error: fund.error || 'Ekkert landnúmer', flokkar: [] }, 404);
      landnr = fund.landnr;
      label = fund.label || '';
    } catch (e) {
      return json({ error: 'Landnúmer fannst ekki: ' + (e && e.message ? e.message : e), flokkar: [] }, 502);
    }
  }
  if (!landnr) return json({ error: 'landnr vantar' }, 400);

  if (!endurnyja) {
    const til = await lesa(lykillLandnr(landnr));
    if (til && Array.isArray(til.flokkar)) {
      if (heimilisfang) await skrifa(lykillHeimilisfangs(heimilisfang), heimilisfang, til);
      return json(medCache(til, true));
    }
  }

  let flokkar;
  try {
    flokkar = await saekjaFlokka(String(landnr));
  } catch (e) {
    return json({ error: 'Náði ekki í séruppdrætti: ' + (e && e.message ? e.message : e), landnr, flokkar: [] }, 502);
  }
  const svar = {
    landnr,
    label,
    heimild: 'Skjalasafn Reykjavíkur · 5004-Séruppdrættir',
    flokkar,
  };
  await skrifa(lykillLandnr(landnr), label || heimilisfang || String(landnr), svar);
  if (heimilisfang) await skrifa(lykillHeimilisfangs(heimilisfang), heimilisfang, svar);
  return json(medCache(svar, false));
};
