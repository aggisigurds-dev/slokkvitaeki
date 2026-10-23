// Samstillir leiðréttingar úr Teikningu / TurboPaint (teikning_bord.haedir[].markers) inn í Búnaðargreininguna (bunadargreining.tki + tillogur)
// og endurgerir yfirlagsmyndir Gáttar og prófílspjalds (gatt-yfirlag: gogn.cjs → gera.py → hladaupp.cjs).  Agnar 22.10.2026: „Vistað þarf að gera eitthvað annað".
//
//   node bgr_samstilla.cjs                 þurrkeyrsla: sýnir hvað yrði breytt, ekkert skrifað
//   node bgr_samstilla.cjs --skrifa        framkvæmir (Scheduled Task á 10 mín fresti)
//   --cid=1621,198    aðeins þessi félög          --afl   hunsa vistað ástand (athuga allt)          --an-mynda   sleppa endurgerð mynda
//
// REGLUR (hver er óhagganleg):
//  · Aðeins hæðir þar sem haed.id = blað-id greiningarinnar (sama blað og borðið) — eða hæðir með merki n:…:g<4><blað>_<auðkenni> (samraemaGolf, t.d. Álfaborg 661) og aðeins flokkarnir ÚT-stimpill, „Nýtt"-merki (reyk-/hitaskynjari,
//    slökkvitæki, slanga) og tillögur Arnolds (unitId n:…:gt…). Skráð tæki (unitId = uttaeki) og aðrir stimplar eru ekki greiningin.
//  · Vörn: tómt merkjasett á hæð sem hefur færslur → hæðin er SKILIN EFTIR (t.d. „Hreinsa" ýtt fyrir slysni); eyðing > 50 % af ≥ 4 færslum → skilin eftir
//    og skráð til yfirferðar. Færsla sem varð skráð tæki (merki í ≤ 90 px) telst ekki eydd.
//  · Á undan hverri breytingu er afrit af gömlu röðinni vistað í %LOCALAPPDATA%\slokkvitaeki-bgrfrit\ — engu er eytt án afrits.
//  · Skrifum Claude (updated_by „Greining (Claude)" / „Veggjavél (Claude)") er sleppt nema --afl.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const SKRIFA = process.argv.includes('--skrifa'), AFL = process.argv.includes('--afl'), AN_MYNDA = process.argv.includes('--an-mynda');
const CID_ARG = (process.argv.find((a) => a.startsWith('--cid=')) || '').slice(6).split(',').map(Number).filter(Boolean);
const REPO = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const cfg = fs.readFileSync(path.join(REPO, 'js', 'config.js'), 'utf8');
const U = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/) || [])[1], K = (cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/) || [])[1];
const H = { apikey: K, Authorization: 'Bearer ' + K };
const GAGN = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'slokkvitaeki-bgr');
fs.mkdirSync(GAGN, { recursive: true });
const STADA_SKRA = path.join(GAGN, 'stada.json'), LOGG = path.join(GAGN, 'log.txt');
const stada = (() => { try { return JSON.parse(fs.readFileSync(STADA_SKRA, 'utf8')); } catch (_) { return {}; } })();
const logga = (t) => { const l = new Date().toISOString().slice(0, 19) + ' ' + t; console.log(l); try { fs.appendFileSync(LOGG, l + '\n'); } catch (_) {} };
const get = async (q) => { const r = await fetch(`${U}/rest/v1/${q}`, { headers: H }); if (!r.ok) throw new Error(q.slice(0, 60) + ' ' + r.status); return r.json(); };

const flokkurMerkis = (m) => {
  const id = typeof m.unitId === 'string' ? m.unitId : '';
  if (m.kind === 'sign' || id.indexOf('s:') === 0) return String(m.sign) === 'ut' ? 'ut' : null;
  if (m.nytt === true || id.indexOf('n:') === 0) {
    const gt = /^n:[a-z]+:gt/.test(id), t = String(m.tegund || '').toLowerCase();
    if (/slang|slong/.test(t)) return gt ? 'till_bs' : 'bs';
    if (/vatn|duft|co2|slökk|slokk/.test(t)) return gt ? 'till_sl' : 'sl';
    if (gt) return 'till_sl';
    if (/reyk/.test(t)) return 'r';
    if (/hita/.test(t)) return 'hiti';
  }
  return null;
};
const flokkurFærslu = (t) => {
  const f = String(t.flokkur || ''), n = String(t.bunadur || '');
  if (f === 'flotti' || /^Útgangur/.test(n)) return 'ut';
  if (f === 'brunakerfi') return /eykskynjari/.test(n) ? 'r' : /hita/i.test(n) ? 'hiti' : null;
  if (f === 'slokkvibunadur' || !f) return /lang|efli/i.test(n) ? 'bs' : 'sl';
  return null;
};
const NY = {
  ut: { flokkur: 'flotti', bunadur: 'Útgangur (ÚT-merki)' }, r: { flokkur: 'brunakerfi', bunadur: 'Reykskynjari' }, hiti: { flokkur: 'brunakerfi', bunadur: 'Hitaskynjari' },
  sl: { flokkur: 'slokkvibunadur', bunadur: 'Handslökkvitæki' }, bs: { flokkur: 'slokkvibunadur', bunadur: 'Brunaslanga / slöngukefli' },
};
const stytta = (id) => String(id || '').split(':').pop();   // g<4 stafir blaðs><audkenni>  |  g<audkenni>  |  gt<…>

// Merki borðsins → [{ k, id, x, y }] á hæð
const merkiBords = (h) => (h.markers || []).map((m) => ({ k: flokkurMerkis(m), id: m.unitId, x: Math.round(+m.x), y: Math.round(+m.y), m })).filter((o) => o.k && isFinite(o.x) && isFinite(o.y));
const skraðTæki = (h) => (h.markers || []).filter((m) => m && !(m.kind === 'sign') && !(m.nytt === true) && !String(m.unitId || '').match(/^[sn]:/)).map((m) => [+m.x, +m.y]);

// Samræmir eina hæð. Skilar { tki, till, breytt, lysing[], skipt } — skipt = hæðin skilin eftir (vörn).
function samraemaHaed(bg, blad, h) {
  const hid = blad.id, lysing = [];
  // aðeins hæðir sem fengu greiningarmerkin úr innflutningi (unitId s:ut:g… / n:…:g… / n:…:gt…) — annars er borðið ekki afrit greiningarinnar og ekkert er eytt
  if (!(h.markers || []).some((m) => /^(s|n):[a-z]+:gt?[A-Za-z0-9]/.test(String(m.unitId || '')))) return { skipt: true, lysing };
  const eldri = (bg.tki || []).filter((t) => (t.blad || t.haed_id) === hid && flokkurFærslu(t));
  const eldriTill = ((bg.tillogur && bg.tillogur.tki) || []).filter((t) => t.blad === hid);
  const bord = merkiBords(h), tkiB = bord.filter((o) => !o.k.startsWith('till_')), tillB = bord.filter((o) => o.k.startsWith('till_'));
  const skrad = skraðTæki(h);
  const nær = (o, e) => Math.hypot(o.x - +(e.bx != null ? e.bx : e.x), o.y - +(e.by != null ? e.by : e.y));
  // PÖRUN: fyrst á auðkenni úr unitId (innflutningur setti g<…><audkenni>), svo á nálægð í sama flokki (≤ 25 px) fyrir það sem eftir er
  const pora = (nyjar, gamlar, lykillFn, flokkFn) => {
    const notad = new Set(), par = [];
    nyjar.forEach((o) => {
      const sfx = stytta(o.id); let hit = null;
      gamlar.forEach((e, i) => { if (!hit && !notad.has(i) && lykillFn(e, i).some((l) => l === sfx)) hit = i; });
      if (hit != null) { notad.add(hit); par.push([o, gamlar[hit]]); } else par.push([o, null]);
    });
    par.forEach((p) => {
      if (p[1]) return;
      let bi = -1, bd = 25;
      gamlar.forEach((e, i) => { if (!notad.has(i) && flokkFn(e) === p[0].k && nær(p[0], e) < bd) { bd = nær(p[0], e); bi = i; } });
      if (bi >= 0) { notad.add(bi); p[1] = gamlar[bi]; }
    });
    return { par, eydd: gamlar.filter((e, i) => !notad.has(i)) };
  };
  // auðkenni sem innflutningur skrifaði í unitId: g<4 síðustu stafir blaðs><audkenni||i> (nýtt snið) eða g<audkenni||i> (Skjaldbreið, fyrsta snið)
  const lykTki = (e, i) => { const a = String(e.audkenni || i); return ['g' + hid.slice(-4) + a, 'g' + a]; };
  const rT = pora(tkiB, eldri, lykTki, flokkurFærslu);
  const lykTill = (e, i) => ['gt' + hid.slice(-4) + i, 'gt' + i + hid.slice(-3)];
  const rP = pora(tillB, eldriTill, lykTill, (e) => (e.flokkur === 'bs' ? 'till_bs' : 'till_sl'));
  // VÖRN
  const eydd = rT.eydd.filter((e) => !skrad.some((p) => Math.hypot(p[0] - +(e.bx != null ? e.bx : e.x), p[1] - +(e.by != null ? e.by : e.y)) <= 90));
  const eyddTill = rP.eydd;
  const stadFaerslur = eldri.length + eldriTill.length;
  if (!bord.length && stadFaerslur) { lysing.push(`${blad.nafn.split(' — ')[0]}: borðið hefur engin greiningarmerki en greiningin ${stadFaerslur} — SKILIÐ EFTIR`); return { skipt: true, lysing }; }
  if (stadFaerslur >= 4 && (eydd.length + eyddTill.length) > 0.5 * stadFaerslur) { lysing.push(`${blad.nafn.split(' — ')[0]}: ${eydd.length + eyddTill.length} af ${stadFaerslur} færslum myndu eyðast — SKILIÐ EFTIR (yfirfara)`); return { skipt: true, lysing }; }
  // UPPBYGGING
  const nyttTki = [], nyttTill = [];
  let breytt = false;
  rT.par.forEach(([o, e]) => {
    if (e) {
      const fært = nær(o, e) > 2;
      if (fært) { breytt = true; nyttTki.push(Object.assign({}, e, { x: o.x, y: o.y, bx: o.x, by: o.y })); } else nyttTki.push(e);
    } else {
      breytt = true; const n = NY[o.k];
      nyttTki.push({ x: o.x, y: o.y, bx: o.x, by: o.y, mhl: '', blad: hid, haed: h.nafn, stadur: 'Bætt við í Teikningu', tegund: '', unitId: null, bunadur: n.bunadur, flokkur: n.flokkur, haed_id: hid, heimild: 'Teikning (leiðrétt af starfsmanni)', audkenni: 'T' + String(o.id).slice(-5), upplysingar: false });
    }
  });
  if (eydd.length) breytt = true;
  rP.par.forEach(([o, e]) => {
    if (e) { if (nær(o, e) > 2) { breytt = true; nyttTill.push(Object.assign({}, e, { bx: o.x, by: o.y })); } else nyttTill.push(e); }
    else { breytt = true; nyttTill.push({ bx: o.x, by: o.y, blad: hid, haed: h.nafn, flokkur: o.k === 'till_bs' ? 'bs' : 'sl', tegund: o.k === 'till_bs' ? 'Brunaslanga' : 'Léttvatn', stadur: 'Bætt við í Teikningu', rok: 'staðsett af starfsmanni' }); }
  });
  if (eyddTill.length) breytt = true;
  if (breytt) lysing.push(`${blad.nafn.split(' — ')[0]}: ${rT.par.filter((p) => !p[1]).length} ný, ${rT.par.filter((p) => p[1] && nær(p[0], p[1]) > 2).length} færð, ${eydd.length} eydd; tillögur ${rP.par.filter((p) => !p[1]).length} nýjar / ${rP.par.filter((p) => p[1] && nær(p[0], p[1]) > 2).length} færðar / ${eyddTill.length} eyddar`);
  return { breytt, tki: nyttTki, till: nyttTill, eldriIds: new Set(eldri), eldriTillIds: new Set(eldriTill), lysing };
}

// ── HÆÐIR SEM ERU EKKI 1:1 VIÐ BLAÐ (Álfaborg 661: borðið er 2022-teikningin, greiningin notar aðaluppdrætti 2025 + brunakerfisblöð með varpa) ──────────────
// Flutt inn með import661.cjs: merki n:<tegund>:g<4 síðustu stafir hæðar><blað>_<auðkenni> / s:ut:… — tki tengjast hæð um haed_id (eða hæðarheiti) og bera x,y í ramma
// borðsins; bx,by (blaðhnit) eru reiknuð til baka með varpa blaðsins. Skráð tæki (unitId ≠ null) eru ekki hluti af þessu; handboðar/stjórnstöðvar ekki heldur.
const GOLF_MERKI = /^(s|n):[a-z0-9]+:g[A-Za-z0-9]{4}[A-Za-z0-9]+_/;
const tilBord = (blad, bx, by) => { const vp = blad && blad.varpa; return vp && vp.fx && vp.fy ? [vp.fx.k * +bx + vp.fx.c, vp.fy.k * +by + vp.fy.c] : [+bx, +by]; };
const fraBord = (blad, x, y) => { const vp = blad && blad.varpa; return vp && vp.fx && vp.fy && vp.fx.k && vp.fy.k ? [Math.round((x - vp.fx.c) / vp.fx.k), Math.round((y - vp.fy.c) / vp.fy.k)] : [x, y]; };
function samraemaGolf(bg, h) {
  const lysing = [], nafn = String(h.nafn || h.id);
  if (!(h.markers || []).some((m) => GOLF_MERKI.test(String(m.unitId || '')))) return { skipt: true, lysing };
  const blod = {}; (bg.teikningar || []).forEach((b) => { if (b && b.id) blod[b.id] = b; });
  const eigin = (bg.tki || []).filter((x) => (x.haed_id ? x.haed_id === h.id : x.haed === h.nafn));
  const lyk = (e, i) => 'g' + h.id.slice(-4) + (e.blad || 'b') + '_' + String(e.audkenni || i).replace(/[^A-Za-z0-9]/g, '');
  const eldri = []; eigin.forEach((e, i) => { if (e.unitId == null && flokkurFærslu(e)) eldri.push({ e, k: lyk(e, i) }); });
  const bord = merkiBords(h), skrad = skraðTæki(h);
  // staða færslu í ramma borðsins: x,y ef til, annars blaðhnit (bx,by) varpað með varpa blaðsins (ÚT og brunakerfi hafa aðeins þau)
  const stada = (e) => (isFinite(+e.x) && e.x != null && isFinite(+e.y) && e.y != null) ? [+e.x, +e.y] : (e.bx != null && e.by != null ? tilBord(blod[e.blad], e.bx, e.by) : [NaN, NaN]);
  const nær = (o, e) => { const q = stada(e); return Math.hypot(o.x - q[0], o.y - q[1]); };
  // PÖRUN: á lykli úr unitId (sfx = það sem er á eftir síðasta „:“), svo á nálægð í sama flokki (≤ 25 px)
  const notad = new Set(), par = [];
  bord.forEach((o) => { const sfx = String(o.id).split(':').pop(); const i = eldri.findIndex((q, j) => !notad.has(j) && q.k === sfx); if (i >= 0) { notad.add(i); par.push([o, eldri[i].e]); } else par.push([o, null]); });
  par.forEach((pr) => {
    if (pr[1]) return;
    let bi = -1, bd = 25;
    eldri.forEach((q, j) => { if (!notad.has(j) && flokkurFærslu(q.e) === pr[0].k && nær(pr[0], q.e) < bd) { bd = nær(pr[0], q.e); bi = j; } });
    if (bi >= 0) { notad.add(bi); pr[1] = eldri[bi].e; }
  });
  const eydd = eldri.filter((q, j) => !notad.has(j)).map((q) => q.e).filter((e) => !skrad.some((pt) => { const q = stada(e); return Math.hypot(pt[0] - q[0], pt[1] - q[1]) <= 90; }));
  if (!bord.length && eldri.length) { lysing.push(nafn + ': borðið hefur engin greiningarmerki en greiningin ' + eldri.length + ' — SKILIÐ EFTIR'); return { skipt: true, lysing }; }
  if (eldri.length >= 4 && eydd.length > 0.5 * eldri.length) { lysing.push(nafn + ': ' + eydd.length + ' af ' + eldri.length + ' færslum myndu eyðast — SKILIÐ EFTIR (yfirfara)'); return { skipt: true, lysing }; }
  const adalBlad = (k) => { const hit = eldri.find((q) => flokkurFærslu(q.e) === k || (k === 'hiti' && flokkurFærslu(q.e) === 'r')); return hit ? hit.e.blad : ((eigin[0] && eigin[0].blad) || ''); };
  const nyttTki = []; let nytt = 0, faert = 0;
  par.forEach(([o, e]) => {
    const [bx, by] = fraBord(e ? blod[e.blad] : blod[adalBlad(o.k)], o.x, o.y);
    if (e) {
      const f = !(nær(o, e) <= 2);
      if (f) { faert++; nyttTki.push(Object.assign({}, e, { x: o.x, y: o.y, bx, by })); } else nyttTki.push(e);
    } else {
      nytt++; const n = NY[o.k], b = adalBlad(o.k);
      nyttTki.push({ x: o.x, y: o.y, bx, by, mhl: '', blad: b, haed: h.nafn, stadur: 'Bætt við í Teikningu', tegund: '', unitId: null, bunadur: n.bunadur, flokkur: n.flokkur, haed_id: h.id, heimild: 'Teikning (leiðrétt af starfsmanni)', audkenni: 'T' + String(o.id).slice(-5), upplysingar: false });
    }
  });
  const breytt = nytt > 0 || faert > 0 || eydd.length > 0;
  if (breytt) lysing.push(nafn + ': ' + nytt + ' ný, ' + faert + ' færð, ' + eydd.length + ' eydd (hæð án blaðs-id)');
  return { breytt, tki: nyttTki, eldriIds: new Set(eldri.map((q) => q.e)), lysing };
}

async function vinnaFelag(bg, row) {
  const utkoma = { breytt: false, lysing: [] };
  let tkiNy = (bg.tki || []).slice(), tillNy = ((bg.tillogur && bg.tillogur.tki) || []).slice(), eitthvad = false;
  for (const blad of bg.teikningar || []) {
    if (!blad || !blad.id) continue;
    const h = (row.haedir || []).find((x) => x.id === blad.id); if (!h) continue;
    const r = samraemaHaed(bg, blad, h);
    utkoma.lysing.push(...r.lysing);
    if (r.skipt || !r.breytt) continue;
    eitthvad = true;
    tkiNy = tkiNy.filter((t) => !r.eldriIds.has(t)).concat(r.tki);
    tillNy = tillNy.filter((t) => !r.eldriTillIds.has(t)).concat(r.till);
  }
  for (const h of row.haedir || []) {
    if ((bg.teikningar || []).some((b) => b && b.id === h.id)) continue;       // blað-id = hæð: gamla leiðin hér að ofan
    const r = samraemaGolf(bg, h);
    utkoma.lysing.push(...r.lysing);
    if (r.skipt || !r.breytt) continue;
    eitthvad = true;
    tkiNy = tkiNy.filter((t) => !r.eldriIds.has(t)).concat(r.tki);
  }
  utkoma.breytt = eitthvad; utkoma.tki = tkiNy; utkoma.till = tillNy;
  return utkoma;
}

async function beita(bg, ut) {
  // 1) afrit af gömlu röðinni á disk (RLS leyfir ekki INSERT með opinbera lyklinum, svo sagan er skrá í stað línu í töflunni)
  const afritMappa = path.join(GAGN, 'afrit'); fs.mkdirSync(afritMappa, { recursive: true });
  fs.writeFileSync(path.join(afritMappa, `bgr_${bg.company_id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(bg));
  // 2) uppfæra virku röðina
  const tillogur = Object.assign({}, bg.tillogur || { at: new Date().toISOString().slice(0, 10), af: 'Arnold (tillaga)', krofur: {}, athugasemdir: [] }, { tki: ut.till });
  const p = await fetch(`${U}/rest/v1/bunadargreining?id=eq.${bg.id}&updated_at=eq.${encodeURIComponent(bg.updated_at)}`, {
    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, H),
    body: JSON.stringify({ tki: ut.tki, tillogur: ut.till.length || bg.tillogur ? tillogur : null, updated_at: new Date().toISOString() }),
  });
  const j = await p.json().catch(() => null);
  if (!p.ok || !Array.isArray(j) || j.length !== 1) throw new Error('PATCH mistókst eða röðin breyttist á meðan: ' + p.status);
}

function endurgeraMyndir(cid) {
  const D = path.join(GAGN, 'vinna', String(cid)); fs.rmSync(D, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true });
  const S = path.join(REPO, '.claude', 'skills', 'arnold', 'scripts', 'bunadargreining', 'gatt-yfirlag');
  const k = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: D, encoding: 'utf8', timeout: 20 * 60 * 1000, env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) }); if (r.status !== 0) throw new Error(path.basename(args[0]) + ' kóði ' + r.status + ' ' + String(r.stderr || r.stdout).slice(-200)); return r.stdout; };
  k('node', [path.join(S, 'gogn.cjs'), String(cid)]);
  const g = k('python', [path.join(S, 'gera.py')]);
  if (/BLAÐ VANTAR/.test(g)) logga(`  ${cid}: sum blöð vantar (mynd ekki endurgerð fyrir þau)`);
  k('node', [path.join(S, 'hladaupp.cjs')]);
}

(async () => {
  const tkiBgr = await get(`bunadargreining?fjarlaegt_at=is.null&select=*${CID_ARG.length ? '&company_id=in.(' + CID_ARG.join(',') + ')' : ''}`);
  const ids = tkiBgr.map((b) => b.company_id);
  if (!ids.length) { logga('engin greining'); return; }
  const raðir = await get(`teikning_bord?company_id=in.(${ids.join(',')})&select=company_id,haedir,updated_at,updated_by`);
  let breytt = 0, villur = 0;
  for (const bg of tkiBgr) {
    const row = raðir.find((r) => r.company_id === bg.company_id); if (!row) continue;
    if (!AFL && stada[bg.company_id] && stada[bg.company_id].bord === row.updated_at) continue;                    // borðið óbreytt síðan síðast
    if (!AFL && /\(Claude\)$/.test(String(row.updated_by || '')) && !stada[bg.company_id]) { stada[bg.company_id] = { bord: row.updated_at }; continue; }   // fyrsta keyrsla: skrif frá Claude eru grunnlínan
    try {
      const ut = await vinnaFelag(bg, row);
      if (ut.lysing.length) { logga(`${bg.company_id}:`); ut.lysing.forEach((l) => logga('  ' + l)); }
      if (ut.breytt && SKRIFA) {
        await beita(bg, ut);
        if (!AN_MYNDA) { try { endurgeraMyndir(bg.company_id); logga(`  ${bg.company_id}: greining uppfærð + myndir endurgerðar`); } catch (e) { logga(`  ${bg.company_id}: greining uppfærð en myndir EKKI endurgerðar — ${e.message}`); } }
        else logga(`  ${bg.company_id}: greining uppfærð (án mynda)`);
        breytt++;
      } else if (ut.breytt) logga(`  ${bg.company_id}: (þurrkeyrsla — ekkert skrifað)`);
      if (SKRIFA) stada[bg.company_id] = { bord: row.updated_at, kl: new Date().toISOString() };
    } catch (e) { villur++; logga(`${bg.company_id}: VILLA ${e.message}`); }
  }
  if (SKRIFA) fs.writeFileSync(STADA_SKRA, JSON.stringify(stada, null, 1));
  logga(`lokið: ${tkiBgr.length} félög athuguð, ${breytt} uppfærð, ${villur} villur${SKRIFA ? '' : ' (þurrkeyrsla)'}`);
})().catch((e) => { logga('VILLA ' + e.message); process.exit(1); });
