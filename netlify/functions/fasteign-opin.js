/**
 * fasteign-opin — opin gögn um eign sem kosta ekkert og þurfa engan lykil („Greining fasteignar", 451). LES AÐEINS.
 *
 * Kannað 09.10.2026 (könnun í lotu 451; sjá js/data/greining-heimildir.json):
 *   • Staðfangaskrá HMS (WFS VSTADF_ALLT) — hnit staðfangsins (WGS84), póstnúmer, sveitarfélag.
 *   • Landeignaskrá HMS (WFS public:Landeignaskra) — skráð/mæld lóðarstærð.
 *   • Borgarvefsjá Leit/3 (aðeins Reykjavík) — eignarhlutar (fastanúmer) og hæðakóðar á húsnúmerinu. Ekki tæmandi
 *     (nýbyggingar vantar — Fiskislóð 41 skilaði 0).
 *   • OpenStreetMap Overpass — rekstur sem er skráður á staðnum (nafn, tegund, vefur, opnunartími). ODbL: „©
 *     OpenStreetMap-framlagsaðilar". Ein kurteis fyrirspurn per uppflettingu. overpass-api.de hafnar User-Agent sem
 *     inniheldur „netlify.app" (406) — því hreinn UA hér. Ekki tæmandi.
 *   • ?vefur=<https-slóð> — EIN sókn á forsíðu fyrirtækis: <title> og meta description (300 KB þak, 6 s).
 *
 *   GET /.netlify/functions/fasteign-opin?heitinr=1016254           (hraðast — síðan hefur heitinr úr bygging-uppl)
 *   GET /.netlify/functions/fasteign-opin?heimilisfang=Skútuvogur 2, 104 Reykjavík
 *   → { eign:{landnr,heitinr,lat,lon,postnr,svfnr,label}, lod:{skrad_m2,maeld_m2}|null, einingar:{fjoldi,haedir,mhl}|null,
 *       rekstur:{listi:[{nafn,tegund,gata,nr,vefur,opid,simi,osm}],heimild}|null, villur:{…} }
 *   GET /.netlify/functions/fasteign-opin?vefur=https://benni.is   → { titill, lysing, slod }
 *
 * Hver hluti hefur sinn tímafrest (allSettled) svo ein hæg heimild tefji ekki hinar; heildin er innan 10 s þaksins.
 * Persónuupplýsingar: OSM-tög eru það sem rekstraraðilinn sjálfur birtir (nafn, sími, vefur). Engum einstaklingum safnað.
 */
const WFS = 'https://geo.fasteignaskra.is/ws/geoserver/wfs';
const BVS = 'https://borgarvefsja.reykjavik.is/arcgis/rest/services/Borgarvefsja/Leit/MapServer/3/query';
// 09.10.2026: aðalþjónninn svarar stundum 500/504/429 eða ekki innan tímans á álagstoppum (Agnar sá „Overpass svaraði ekki
// (The operation was aborted due to timeout)" og tegund/rekstur flökti milli uppflettinga). Því: (1) skyndiminni á þjóni —
// hus_upplysingar_cache, lykill osm:<heitinr>, 14 dagar: svarið er lesið þaðan og Overpass ekki kallað; (2) varaþjónn
// (overpass.kumi.systems) ef aðalþjónninn bregst; (3) bregðist báðir er eldra skyndiminni notað og merkt.
// Mælt 09.10 kl. 10:30: overpass-api.de svaraði á 8,9 s (504 á GET), kumi.systems 500 á allt, private.coffee 429 → Overpass
// fer í SÉR kall (?osm=1) með sitt eigið 10 s þak; aðalkallið les aðeins skyndiminnið og bíður aldrei eftir Overpass.
const OVERPASS = [['https://overpass-api.de/api/interpreter', 7600], ['https://overpass.kumi.systems/api/interpreter', 1600]];
const SB_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SB_KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SB_HAUS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const OSM_UTGAFA = 'osm-2', OSM_DAGAR = 14;   // osm-2: með breytingardags hverrar færslu (out meta)
async function osmLesa(heitinr) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/hus_upplysingar_cache?lykill=eq.${encodeURIComponent('osm:' + heitinr)}&utgafa=eq.${OSM_UTGAFA}&select=svar,uppfaert&limit=1`, { headers: SB_HAUS, signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    const rad = (await r.json())[0];
    return rad && rad.svar && Array.isArray(rad.svar.listi) ? { svar: rad.svar, aldur: Date.now() - Date.parse(rad.uppfaert || 0) } : null;
  } catch (_) { return null; }
}
async function osmSkrifa(heitinr, svar) {
  try {
    await fetch(`${SB_URL}/rest/v1/hus_upplysingar_cache?on_conflict=lykill`, { method: 'POST', headers: { ...SB_HAUS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ lykill: 'osm:' + heitinr, heimilisfang: String(heitinr), utgafa: OSM_UTGAFA, svar, uppfaert: new Date().toISOString() }), signal: AbortSignal.timeout(2000) });
  } catch (_) {}
}
const UA = 'Slokkvitaeki/1.0 (fasteignagreining; slokkvitaeki.is)';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200, geyma) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': geyma ? 'public, max-age=3600' : 'no-store' } });
const cql = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const minni = new Map();

async function wfs(typename, filter, ms, props) {
  const u = WFS + '?service=WFS&version=1.1.0&request=GetFeature&outputFormat=application/json&maxFeatures=20&typename=' + encodeURIComponent(typename) +
    '&CQL_FILTER=' + encodeURIComponent(filter) + (props ? '&propertyName=' + encodeURIComponent(props) : '');
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('WFS ' + r.status);
  const d = await r.json();
  return (d.features || []).map((f) => f.properties || {});
}

function thatta(raw) {
  const t = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const fyrsti = t.split(',')[0].trim();
  const m = /^(.+?)\s+(\d{1,4})\s*([a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ])?\b/.exec(fyrsti);
  if (!m) return null;
  const postnr = Number((/\b(\d{3})\b/.exec(t.slice(fyrsti.length)) || [])[1]) || null;
  return { gata: m[1].trim(), husnr: Number(m[2]), bokst: (m[3] || '').toUpperCase() || null, postnr };
}

async function finnaStadfang(p) {
  if (p.heitinr) {
    const r = await wfs('fasteignaskra:VSTADF_ALLT', 'HEINUM=' + Number(p.heitinr), 3500);
    if (r.length) return r[0];
  }
  const h = thatta(p.heimilisfang);
  if (!h) return null;
  const bitar = ['(HEITI_NF ILIKE ' + cql(h.gata) + ' OR HEITI_TGF ILIKE ' + cql(h.gata) + ')', 'HUSNR=' + h.husnr];
  const radir = await wfs('fasteignaskra:VSTADF_ALLT', bitar.join(' AND '), 3500);
  const passar = radir.filter((x) => (!h.postnr || Number(x.POSTNR) === h.postnr) && (!h.bokst || String(x.BOKST || '').toUpperCase() === h.bokst));
  return passar[0] || (h.postnr ? null : radir[0]) || null;
}

async function lod(landnr) {
  const r = await wfs('public:Landeignaskra', 'LANDEIGN_NR=' + Number(landnr), 3000, 'LANDEIGN_NR,LANDEIGN_GERD,LANDEIGN_SKRAD_STAERD,LANDEIGN_MAELD_STAERD');
  if (!r.length) return null;
  const x = r[0];
  return { skrad_m2: x.LANDEIGN_SKRAD_STAERD != null ? Number(x.LANDEIGN_SKRAD_STAERD) : null, maeld_m2: x.LANDEIGN_MAELD_STAERD != null ? Number(x.LANDEIGN_MAELD_STAERD) : null, gerd: x.LANDEIGN_GERD || null };
}

async function einingar(st) {
  if (String(st.SVFNR) !== '0000') return null;      // Borgarvefsjá er aðeins Reykjavík
  const u = BVS + '?where=' + encodeURIComponent('LANDNR=' + Number(st.LANDNR)) + '&outFields=HEITI,HNR,MHLNR,HAED,EIN,FASTANUMER&returnGeometry=false&f=json';
  const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(3500) });
  if (!r.ok) throw new Error('Borgarvefsjá ' + r.status);
  const d = await r.json();
  const allt = (d.features || []).map((f) => f.attributes || {});
  const her = allt.filter((x) => Number(x.HNR) === Number(st.HUSNR));
  const radir = her.length ? her : (allt.length && new Set(allt.map((x) => x.HNR)).size === 1 ? allt : []);
  if (!radir.length) return { fjoldi: 0, fastanumer: 0, haedir: [], mhl: [], lod_alls: allt.length };
  const fast = new Set(radir.map((x) => x.FASTANUMER).filter(Boolean));
  // rými = ólík (matshluti, hæð, eining); fastanúmer geta verið færri (Skútuvogur 2: 9 rými, 1 fastanúmer)
  const ein = new Set(radir.map((x) => [x.MHLNR, x.HAED, x.EIN].join('-')));
  return { fjoldi: ein.size, fastanumer: fast.size, haedir: [...new Set(radir.map((x) => String(x.HAED || '').trim()).filter(Boolean))].sort(), mhl: [...new Set(radir.map((x) => String(x.MHLNR || '').trim()).filter(Boolean))].sort(), lod_alls: allt.length };
}

const TEGUNDIR = { shop: 'verslun', amenity: 'þjónusta', office: 'skrifstofa', craft: 'iðn', tourism: 'ferðaþjónusta', leisure: 'afþreying', healthcare: 'heilbrigði' };
// Aðalkallið: rekstur úr skyndiminni (hvaða aldur sem er — merkt). Vanti það eða sé það eldra en 14 dagar sækir vafrinn
// ferskt með ?osm=1 (reksturFerskt) — sér kall, svo hæg Overpass-svör tefja aldrei eignina, lóðina eða rýmin.
async function reksturGeymdur(st) {
  const hnr = Number(st.HEINUM) || null;
  const geymt = hnr ? await osmLesa(hnr) : null;
  if (!geymt) return null;
  return Object.assign({}, geymt.svar, { ur_skyndiminni: true, aldur_dagar: Math.floor(geymt.aldur / 864e5), gamalt: geymt.aldur >= OSM_DAGAR * 864e5 });
}
async function reksturFerskt(st, frestur) {
  const lat = Number(st.N_HNIT_WGS84), lon = Number(st.E_HNIT_WGS84);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  const hnr = Number(st.HEINUM) || null;
  const geymt = hnr ? await osmLesa(hnr) : null;
  if (geymt && geymt.aldur < OSM_DAGAR * 864e5) return Object.assign({}, geymt.svar, { ur_skyndiminni: true });
  try {
    const nytt = await reksturOverpass(st, lat, lon, frestur || Date.now() + 9000);
    if (hnr) await osmSkrifa(hnr, Object.assign({}, nytt, { saott: new Date().toISOString() }));
    return nytt;
  } catch (e) {
    if (geymt) return Object.assign({}, geymt.svar, { ur_skyndiminni: true, gamalt: true, villa_nu: String((e && e.message) || e) });
    throw e;
  }
}
async function reksturOverpass(st, lat, lon, frestur) {
  const gata = String(st.HEITI_NF || '').replace(/"/g, '');
  const q = `[out:json][timeout:6];(nwr(around:45,${lat},${lon})[name][!highway][!route][!boundary][!place][!railway][!natural];nwr["addr:street"="${gata}"]["addr:housenumber"~"^${Number(st.HUSNR)}[A-Za-z]?$"](around:400,${lat},${lon}););out meta center 40;`;   // meta: síðasta breyting hverrar færslu (Agnar 09.10: OSM getur verið úrelt — Nesdekk vantaði)
  let sidast = null;
  for (const [ep, ms0] of OVERPASS) {
    const ms = Math.min(ms0, frestur - Date.now() - 300);   // allt innan 10 s þaks fallsins
    if (ms < 800) break;
    try {
      const r = await fetch(ep + '?data=' + encodeURIComponent(q), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(ms) });
      if (!r.ok) { sidast = new Error('Overpass ' + r.status); continue; }
      const d = await r.json();
      const listi = (d.elements || []).map((e) => {
        const t = e.tags || {};
        const teg = Object.keys(TEGUNDIR).filter((k) => t[k]).map((k) => TEGUNDIR[k] + ': ' + t[k]);
        const k0 = Object.keys(TEGUNDIR).find((k) => t[k]);
        return {
          nafn: t.name || null, tegund: teg.join(', ') || (t.building ? 'bygging: ' + t.building : null),
          osm_tag: k0 ? { k: k0, v: t[k0] } : (t.building ? { k: 'building', v: t.building } : null),
          gata: t['addr:street'] || null, nr: t['addr:housenumber'] || null,
          vefur: t.website || t['contact:website'] || null, opid: t.opening_hours || null, simi: t.phone || t['contact:phone'] || null,
          haedir: t['building:levels'] || null, osm: e.type + '/' + e.id,
          breytt: e.timestamp ? String(e.timestamp).slice(0, 10) : null,   // aðeins dagsetningin — engin notendanöfn OSM-framlagsaðila
        };
      }).filter((x) => x.tegund || x.haedir);
      return { listi: listi.slice(0, 30), heimild: '© OpenStreetMap-framlagsaðilar (ODbL) · ' + ep.split('/')[2] };
    } catch (e) { sidast = e; }
  }
  throw sidast || new Error('Overpass svaraði ekki');
}

function leyfdSlod(raw) {
  let u; try { u = new URL(raw); } catch (_) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || !h.includes('.')) return null;
  return u;
}
async function vefur(raw) {
  const u = leyfdSlod(raw);
  if (!u) return { villa: 'Ógild slóð' };
  const r = await fetch(u.href, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
  if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) return { villa: 'Svar ' + r.status, slod: r.url };
  const lesari = r.body.getReader();
  let txt = '', baeti = 0;
  const dec = new TextDecoder('utf-8');
  while (baeti < 300000) {
    const { done, value } = await lesari.read();
    if (done) break;
    baeti += value.length;
    txt += dec.decode(value, { stream: true });
    if (/<\/head>/i.test(txt)) break;
  }
  try { lesari.cancel(); } catch (_) {}
  const af = (s) => String(s || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().slice(0, 300);
  const titill = af((txt.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const lysing = af((txt.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || txt.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i) || txt.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
  return { titill: titill || null, lysing: lysing || null, slod: r.url };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const sp = new URL(req.url).searchParams;
  // ?staerdir=1&u=<pdf>&u=… — stærð PDF-blaða teikningasafna (HEAD) svo skemmd blöð sjáist án þess að sækja þau.
  // Mælt 09.10.2026: þrjár loftræsiteikningar Dalshrauns 10 hjá Hafnarfirði eru 742 bæti (tómar). Aðeins söfnin fjögur.
  if (sp.get('staerdir') === '1') {
    const HYSLAR = new Set(['teikningar.hafnarfjordur.is', 'teikningar.gardabaer.is', 'gagnasja.kopavogur.is', 'luks.seltjarnarnes.is']);
    const urls = [...new Set(sp.getAll('u'))].filter((x) => { try { const u = new URL(x); return u.protocol === 'https:' && HYSLAR.has(u.hostname); } catch (_) { return false; } }).slice(0, 120);
    const ut = {};
    await Promise.all(urls.map(async (x) => {
      try { const r = await fetch(x, { method: 'HEAD', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) }); const n = Number(r.headers.get('content-length')); ut[x] = r.ok && isFinite(n) ? n : null; }
      catch (_) { ut[x] = null; }
    }));
    return json({ staerdir: ut }, 200, true);
  }
  const vef = sp.get('vefur');
  if (vef) {
    try { const v = await vefur(vef); return json(v, v.villa ? 502 : 200, !v.villa); }
    catch (e) { return json({ villa: 'Náði ekki í vefsíðuna (' + ((e && e.message) || e) + ')' }, 502); }
  }
  const heitinr = (sp.get('heitinr') || '').replace(/[^0-9]/g, '');
  const heimilisfang = (sp.get('heimilisfang') || '').normalize('NFC').trim();
  if (!heitinr && heimilisfang.length < 4) return json({ error: 'heitinr eða heimilisfang vantar' }, 400);
  if (sp.get('osm') === '1') {
    const frestur = Date.now() + 9300;
    // ?osm=1&heitinr=N — aðeins reksturinn (Overpass), með eigið tímaþak; skrifar skyndiminnið
    let st0;
    try { st0 = await finnaStadfang({ heitinr, heimilisfang }); } catch (e) { return json({ villa: 'Staðfangaskrá svaraði ekki (' + ((e && e.message) || e) + ')' }); }
    if (!st0) return json({ villa: 'Staðfangið fannst ekki' });
    try { return json({ rekstur: await reksturFerskt(st0, frestur) }); }
    catch (e) { return json({ villa: String((e && e.message) || e) }); }   // 200: síðan sýnir „svaraði ekki", ekki rauða villu
  }
  const lyk = heitinr ? 'h' + heitinr : 'a' + heimilisfang.toLowerCase();
  const m = minni.get(lyk);
  if (m && Date.now() - m.t < 15 * 60000) return json(m.v);
  let st;
  try { st = await finnaStadfang({ heitinr, heimilisfang }); }
  catch (e) { return json({ error: 'Staðfangaskrá svaraði ekki (' + ((e && e.message) || e) + ')', reynaAftur: true }, 502); }
  if (!st) {
    // Húsnúmer sem er ekki til („Nónhæð 10" — gatan á aðeins 1, 2, 3, 4, 6): staðföngin sem ERU á götunni, sem tillögur
    let tillogur = [];
    try {
      const h = thatta(heimilisfang);
      if (h) {
        const radir = await wfs('fasteignaskra:VSTADF_ALLT', '(HEITI_NF ILIKE ' + cql(h.gata) + ' OR HEITI_TGF ILIKE ' + cql(h.gata) + ')' + (h.postnr ? ' AND POSTNR=' + h.postnr : ''), 3000, 'HEITI_NF,HUSNR,BOKST,POSTNR');
        tillogur = [...new Set(radir.filter((x) => x.HUSNR != null).sort((a, b) => (+a.HUSNR - +b.HUSNR) || String(a.BOKST || '').localeCompare(String(b.BOKST || '')))
          .map((x) => x.HEITI_NF + ' ' + x.HUSNR + (x.BOKST ? String(x.BOKST).toUpperCase() : '') + ', ' + x.POSTNR))].slice(0, 16);
      }
    } catch (_) {}
    // 200 en ekki 404: „fannst ekki" er svar, ekki bilun — 404 kemur sem rauð villa í vafraborðinu
    return json({ error: 'Fann ekki staðfangið í Staðfangaskrá HMS', tillogur, ekkertFannst: true }, 200);
  }
  const eign = { landnr: Number(st.LANDNR), heitinr: Number(st.HEINUM), lat: Number(st.N_HNIT_WGS84), lon: Number(st.E_HNIT_WGS84), postnr: Number(st.POSTNR) || null, svfnr: String(st.SVFNR || ''), label: String(st.VEF_BIRTING || '').replace(/\s*\(.*$/, '').trim() };
  const [a, b, c] = await Promise.allSettled([lod(st.LANDNR), einingar(st), reksturGeymdur(st)]);
  const villur = {};
  if (a.status === 'rejected') villur.lod = String((a.reason && a.reason.message) || a.reason);
  if (b.status === 'rejected') villur.einingar = String((b.reason && b.reason.message) || b.reason);
  if (c.status === 'rejected') villur.rekstur = String((c.reason && c.reason.message) || c.reason);
  const rek = c.status === 'fulfilled' ? c.value : null;
  const v = { eign, lod: a.status === 'fulfilled' ? a.value : null, einingar: b.status === 'fulfilled' ? b.value : null, rekstur: rek, reksturSaekja: !rek || !!rek.gamalt, villur, saott: new Date().toISOString() };
  if (!Object.keys(villur).length) minni.set(lyk, { t: Date.now(), v });
  return json(v);
};
