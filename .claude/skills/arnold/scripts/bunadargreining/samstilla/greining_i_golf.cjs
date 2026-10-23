// Greiningarmerkin (t.d. Álfaborg 661) (bunadargreining.tki sem eru EKKI skráð tæki) inn á hæðir Teikningar — sama snið og greining_merki_inn.cjs,
// en hæðirnar hafa þegar skráð tæki (aldrei snert) og tki tengjast hæð um haed_id (eða hæðarheiti), ekki blað-id.
// node greining_i_golf.cjs --cid=661 [--skrifa]    Án --skrifa: þurrkeyrsla. Afrit af borðinu í %LOCALAPPDATA%slokkvitaeki-bgrafrit. Samstilling til baka: bgr_samstilla.cjs (samraemaGolf).
// Auðkenni: n:<tegund>:g<4 síðustu stafir hæðar><blað>_<auðkenni>  |  s:ut:g…  — blað í lyklinum því hæð hefur fleiri en eitt blað (aðaluppdr. + brunakerfi).
const fs = require('fs'), path = require('path'), os = require('os');
const cfg = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'js', 'config.js'), 'utf8');
const U = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/) || [])[1], K = (cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/) || [])[1];
const H = { apikey: K, Authorization: 'Bearer ' + K };
const SKRIFA = process.argv.includes('--skrifa'), CID = +((process.argv.find((a) => a.startsWith('--cid=')) || '--cid=661').slice(6));
const flokkur = (t) => {
  const f = String(t.flokkur || ''), n = String(t.bunadur || '');
  if (f === 'flotti' || /^Útgangur/.test(n)) return 'ut';
  if (f === 'brunakerfi') return /eykskynjari/.test(n) ? 'r' : /hita/i.test(n) ? 'hiti' : /andbo/.test(n) ? 'hb' : 'st';
  return /lang|efli/i.test(n) ? 'bs' : 'sl';
};
const slTegund = (t) => /co2|co₂/i.test(t) ? ['co2', 'CO2'] : /duft|abc/i.test(t) ? ['duft', 'ABC Duft'] : ['lettvatn', 'Léttvatn'];
const hnit = (t, frum, blod) => {
  let x = isFinite(+t.x) && t.x != null ? +t.x : NaN, y = isFinite(+t.y) && t.y != null ? +t.y : NaN;
  if (!isFinite(x) || !isFinite(y)) {                                  // ÚT og brunakerfi hafa aðeins blaðhnit (bx,by) — varpað á ramma borðsins eins og 445 grAtridi
    const sh = (blod || {})[t.blad], vp = sh && sh.varpa;
    if (vp && vp.fx && vp.fy && t.bx != null && t.by != null && isFinite(+t.bx) && isFinite(+t.by)) { x = vp.fx.k * +t.bx + vp.fx.c; y = vp.fy.k * +t.by + vp.fy.c; }
  }
  if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || (frum && (x > frum.b + 5 || y > frum.h + 5))) return null;
  return [Math.round(x), Math.round(y)];
};
(async () => {
  const bg = (await (await fetch(`${U}/rest/v1/bunadargreining?company_id=eq.${CID}&fjarlaegt_at=is.null&select=*`, { headers: H })).json())[0];
  const row = (await (await fetch(`${U}/rest/v1/teikning_bord?company_id=eq.${CID}&select=*`, { headers: H })).json())[0];
  if (!bg || !row) throw new Error('vantar gögn');
  const nyHaedir = JSON.parse(JSON.stringify(row.haedir)), tal = {}, utanSkj = [], blod = {}; (bg.teikningar || []).forEach((b) => { if (b && b.id) blod[b.id] = b; });
  let heild = 0;
  for (const h of nyHaedir) {
    const eigin = (bg.tki || []).filter((x) => (x.haed_id ? x.haed_id === h.id : x.haed === h.nafn));
    const fyrir = new Set((h.markers || []).map((m) => String(m.unitId)));
    const mk = []; const t = { ut: 0, r: 0, hiti: 0, sl: 0, bs: 0, hb: 0, st: 0, skrad: 0, utan: 0, tvit: 0 };
    eigin.forEach((x, i) => {
      if (x.unitId != null) { t.skrad++; return; }                       // skráð tæki — er (eða á að vera) á borðinu sem tæki
      const k = flokkur(x), p = hnit(x, h.frum, blod);
      if (!p) { t.utan++; utanSkj.push([h.nafn, x.blad, x.audkenni]); return; }
      if (k === 'hb' || k === 'st') { t[k]++; return; }                  // handboðar / stjórnstöðvar: enginn stimpill — ekki fluttir
      const lyk = `g${h.id.slice(-4)}${x.blad || 'b'}_${String(x.audkenni || i).replace(/[^A-Za-z0-9]/g, '')}`;
      let m;
      if (k === 'ut') m = { unitId: `s:ut:${lyk}`, kind: 'sign', sign: 'ut', x: p[0], y: p[1], color: '#15803d', rot: 0 };
      else {
        const n = k === 'r' ? ['reykskynjari', 'Reykskynjari'] : k === 'hiti' ? ['hitaskynjari', 'Hitaskynjari'] : k === 'bs' ? ['slanga', 'Brunaslanga'] : slTegund(x.tegund || '');
        m = { unitId: `n:${n[0]}:${lyk}`, x: p[0], y: p[1], nytt: true, stada: 'bid', tegund: n[1] };
      }
      if (fyrir.has(m.unitId) || mk.some((q) => q.unitId === m.unitId)) { t.tvit++; return; }
      mk.push(m); t[k]++;
    });
    const till = bg.tillogur && Array.isArray(bg.tillogur.tki) ? bg.tillogur.tki.filter((x) => x.blad === h.id || x.haed === h.nafn) : [];
    tal[h.nafn] = Object.assign({ tillogur: till.length, nuverandiMerki: (h.markers || []).length, baett: mk.length }, t);
    if (!mk.length) continue;
    h.markers = (h.markers || []).concat(mk); heild += mk.length;
  }
  console.log(JSON.stringify(tal, null, 1));
  if (utanSkj.length) console.log('utan ramma:', JSON.stringify(utanSkj));
  console.log('heild bætt við:', heild, SKRIFA ? '(skrifa)' : '(þurrkeyrsla)');
  if (!SKRIFA || !heild) return;
  const AFRIT = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'slokkvitaeki-bgr', 'afrit'); fs.mkdirSync(AFRIT, { recursive: true });
  const afrit = path.join(AFRIT, `bord_${CID}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(afrit, JSON.stringify(row)); console.log('afrit:', afrit);
  const q = await fetch(`${U}/rest/v1/teikning_bord?company_id=eq.${CID}&updated_at=eq.${encodeURIComponent(row.updated_at)}`, {
    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, H),
    body: JSON.stringify({ haedir: nyHaedir, markers: (nyHaedir[0] && nyHaedir[0].markers) || [], updated_at: new Date().toISOString(), updated_by: 'Greining (Claude)' }),
  });
  const j = await q.json().catch(() => null);
  console.log('PATCH', q.status, Array.isArray(j) ? j.length + ' röð' : JSON.stringify(j).slice(0, 200));
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
