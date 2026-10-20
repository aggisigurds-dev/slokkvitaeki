#!/usr/bin/env node
// bgr_verk.cjs — VERKHRINGRÁS ARNOLDS: Búnaðargreining gerð af kerfinu sjálfu (21.10.2026).
// Allt ferlið sem var gert í höndunum (Laugavegur 18, Síðumúli 1, Suðurhella 5 …) sem skipanir sem hvaða Claude-lota sem er
// (tímasett verk „arnold-vaktin“, Agnar sjálfur eða bridge-vél) keyrir í röð. Biðröðin er taflan bunadargreining_verk
// (sql/bunadargreining_verk.sql); Turbo-takkinn í Búnaðargreiningu (474) setur þar röð. Lýsing: ../../../references/verkhringras.md
//
//   node bgr_verk.cjs bida <cid> [beidandi]        setja verk í biðröð (eitt opið á félag)
//   node bgr_verk.cjs naest [vel] [cid]            taka næsta (bida → i_vinnslu, atómískt; með cid aðeins verk þess félags); prentar verkið sem JSON; tómt = ekkert að gera
//   node bgr_verk.cjs stada [id|cid]               staða verks (eða síðustu verka)
//   node bgr_verk.cjs undirbua <id>                gögn félags, borð, blöðin sótt, vigur/skönnun flokkað, gridded nærmyndir → vinnumappa
//   node bgr_verk.cjs bord <id> <bord.json>        BÚA TIL teikning_bord þegar félag á ekkert (hæðir + skurðir valdir af þér), aldrei yfirskrifa
//   node bgr_verk.cjs vigur <id>                   tákn úr textalagi vigur-blaða → vigur_tokn.json (+ yfirlagsmyndir) — frambjóðendur, ekki lokaniðurstaða
//   node bgr_verk.cjs yfirlag <id>                 yfirlagsmyndir úr lestur.json til sannreynslu (sann_*.png)
//   node bgr_verk.cjs vista <id>                   lestur.json → bunadargreining-röð (UTF-8, auðkenni, texti, teikningar); skiptir virkri röð út (saga helst)
//   node bgr_verk.cjs skyrsla <id>                 PDF „ein síða“ + „hver hæð á sér blaði“ → Viðhengi félagsins
//   node bgr_verk.cjs stig <id> <stig> "<texti>"   framvinda (sést á Turbo-takkanum)
//   node bgr_verk.cjs loka <id> ["<texti>"]        verk lokið · node bgr_verk.cjs villa <id> "<texti>" · node bgr_verk.cjs afturkalla <id>
//
// Vinnumappa: %USERPROFILE%\bgr-verk\<id>\ (BGR_VINNA yfirskrifar). Öll skrif á framleiðslu: bunadargreining(_verk), teikning_bord (aðeins `bord`,
// aldrei yfirskrift) og Viðhengi (111). ALDREI breyta merkjum (markers) á Teikningu nema `lestur.nytt === true` og tækjaskrá er tóm.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const cfg = fs.readFileSync(path.join(REPO, 'js', 'config.js'), 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const VEFUR = process.env.BGR_VEFUR || 'https://slokkvitaeki.netlify.app';
const VINNA = process.env.BGR_VINNA || path.join(os.homedir(), 'bgr-verk');
const PY = process.env.BGR_PY || 'python';
const PYENV = Object.assign({}, process.env, { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' });
const HER = __dirname;
const LUNA = process.env.LUNA_BRIDGE || 'C:/Users/Slokkvitaeki/luna-bridge';

const sg = async (q) => { const r = await fetch(U + '/rest/v1/' + q, { headers: H }); const j = await r.json(); if (!r.ok) throw new Error('GET ' + q.slice(0, 60) + ' ' + r.status + ' ' + JSON.stringify(j).slice(0, 200)); return j; };
const sp = async (q, method, body) => { const r = await fetch(U + '/rest/v1/' + q, { method, headers: H, body: JSON.stringify(body) }); const j = await r.json().catch(() => null); return { ok: r.ok, status: r.status, j }; };
const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dir = (id) => path.join(VINNA, String(id));
const lesaJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const skrifaJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1), 'utf8');   // alltaf UTF-8 (cp1252-gildran 20.10.2026)
const log = (...a) => console.log(...a);
const FL = { sl: 'sl', bs: 'bs', ut: 'ut', r: 'brunakerfi', hiti: 'brunakerfi', hb: 'brunakerfi', st: 'brunakerfi' };
const BUN = { sl: 'Handslökkvitæki', bs: 'Brunaslanga / slöngukefli', ut: 'Útgangur (ÚT-merki)', r: 'Reykskynjari', hiti: 'Hitaskynjari', hb: 'Handboði', st: 'Stjórnstöð / útstöð („!“)' };
const FORSKEYTI = { sl: 'S', bs: 'BS', ut: 'ÚT', r: 'R', hiti: 'H', hb: 'HB', st: 'ST' };

async function verk(id) { const [v] = await sg('bunadargreining_verk?id=eq.' + id + '&select=*'); if (!v) throw new Error('verk ' + id + ' fannst ekki'); return v; }
async function skrifaStig(id, stig, texti, extra) {
  const v = await verk(id);
  const fram = (v.framvinda || []).concat([{ at: new Date().toISOString(), stig, texti: String(texti || '').slice(0, 300) }]).slice(-40);
  const r = await sp('bunadargreining_verk?id=eq.' + id, 'PATCH', Object.assign({ stig, skilabod: String(texti || '').slice(0, 300), framvinda: fram, updated_at: new Date().toISOString() }, extra || {}));
  if (!r.ok) throw new Error('stig: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200));
}

/* ── biðröð ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
async function bida(cid, beidandi) {
  const r = await sp('bunadargreining_verk', 'POST', { company_id: +cid, status: 'bida', stig: 'bida', beidandi: beidandi || 'skipanalína', framvinda: [{ at: new Date().toISOString(), stig: 'bida', texti: 'Sett í biðröð' }] });
  if (!r.ok) { log('VILLA', r.status, JSON.stringify(r.j).slice(0, 200)); process.exit(1); }
  log(JSON.stringify({ id: r.j[0].id, company_id: r.j[0].company_id }));
}
async function naest(vel, cid) {
  vel = vel || (os.hostname() + ' · ' + (process.env.CLAUDE_SESSION || 'claude'));
  // verk sem lota skildi eftir í i_vinnslu (hrunin lota) og hefur ekki hreyfst í 3 klst fer aftur í biðröðina
  const gamalt = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const fost = await sg('bunadargreining_verk?status=eq.i_vinnslu&updated_at=lt.' + encodeURIComponent(gamalt) + '&select=id,framvinda');
  for (const f of fost) await sp('bunadargreining_verk?id=eq.' + f.id + '&status=eq.i_vinnslu', 'PATCH', { status: 'bida', stig: 'bida', skilabod: 'Fast í vinnslu > 3 klst — aftur í biðröð', updated_at: new Date().toISOString(), framvinda: (f.framvinda || []).concat([{ at: new Date().toISOString(), stig: 'bida', texti: 'Fast í vinnslu > 3 klst — aftur í biðröð' }]) });
  for (let i = 0; i < 4; i++) {
    const [n] = await sg('bunadargreining_verk?status=eq.bida' + (cid ? '&company_id=eq.' + (+cid) : '') + '&order=created_at.asc&limit=1&select=*');
    if (!n) { log('{}'); return; }
    const r = await sp('bunadargreining_verk?id=eq.' + n.id + '&status=eq.bida', 'PATCH', { status: 'i_vinnslu', stig: 'undirbuningur', vel, tekid_at: new Date().toISOString(), updated_at: new Date().toISOString(), skilabod: 'Tekið til vinnslu',
      framvinda: (n.framvinda || []).concat([{ at: new Date().toISOString(), stig: 'undirbuningur', texti: 'Tekið til vinnslu — ' + vel }]) });
    if (r.ok && r.j && r.j.length) { log(JSON.stringify(r.j[0])); return; }
    await sl(300 + Math.random() * 500);   // önnur vél var á undan — reyna aftur
  }
  log('{}');
}
async function stada(x) {
  const q = x ? (+x > 100000 || String(x).length > 4 ? 'bunadargreining_verk?id=eq.' + x : 'bunadargreining_verk?or=(id.eq.' + x + ',company_id.eq.' + x + ')') : 'bunadargreining_verk';
  const L = await sg(q + (q.includes('?') ? '&' : '?') + 'select=id,company_id,status,stig,skilabod,vel,created_at,updated_at&order=id.desc&limit=15');
  L.forEach((v) => log(v.id, '| fél.', v.company_id, '|', v.status, '/', v.stig, '|', (v.skilabod || '').slice(0, 90), '|', v.updated_at));
}

/* ── undirbúningur: gögn, borð, blöð, flokkun, nærmyndir ──────────────────────────────────────────────────────────── */
async function sotta(slod, ut) {
  if (fs.existsSync(ut) && fs.statSync(ut).size > 1000) return;
  const r = await fetch(slod.startsWith('http') ? slod : VEFUR + slod);
  if (!r.ok) throw new Error('sækja ' + slod.slice(0, 90) + ' → ' + r.status);
  fs.writeFileSync(ut, Buffer.from(await r.arrayBuffer()));
}
function innri(slod) { try { return new URL(slod, VEFUR).searchParams.get('url') || ''; } catch (_) { return ''; } }
async function undirbua(id) {
  const v = await verk(id), D = dir(id); fs.mkdirSync(D, { recursive: true });
  const [fel] = await sg('fyrirtaeki?id=eq.' + v.company_id + '&select=id,nafn,heimilisfang,kennitala,athugasemdir,customer_base_id,er_i_thjonustu');
  if (!fel) throw new Error('félag ' + v.company_id + ' fannst ekki');
  const tak = await sg('uttaeki?fyrirtaeki_id=eq.' + v.company_id + '&select=id,type,size,location&limit=1000');
  const [bord] = await sg('teikning_bord?company_id=eq.' + v.company_id + '&select=*');
  const virk = await sg('bunadargreining?company_id=eq.' + v.company_id + '&fjarlaegt_at=is.null&select=id,stada,af,created_at');
  const man = { verk: id, company_id: v.company_id, nafn: fel.nafn, heimilisfang: fel.heimilisfang, skrad_taeki: tak.length, virk_greining: virk[0] || null, haedir: [], bord: !!(bord && (bord.haedir || []).length), blod: {} };
  if (!man.bord) { man.athugasemd = 'Félagið á enga teikning_bord-röð. Finndu aðaluppdrætti (teikn-listi), veldu hæðir + skurði, skrifaðu bord.json og keyrðu `bord`.'; skrifaJson(path.join(D, 'manifest.json'), man); await skrifaStig(id, 'undirbuningur', 'Vantar teikningaborð — velja hæðir og skurði'); log(JSON.stringify(man, null, 1)); return; }
  for (const h of bord.haedir) {
    if (!h.image_url) continue;
    const inn = innri(h.image_url), erPdf = /\.pdf(\.info)?$/i.test(new URL(inn || 'http://x/y.pdf').pathname), nafnBlad = createId(inn);
    const skra = path.join(D, nafnBlad + (erPdf ? '.pdf' : '.jpg'));
    if (!man.blod[nafnBlad]) {
      await sotta(erPdf ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : h.image_url, skra);
      man.blod[nafnBlad] = { skra: path.basename(skra), pdf: erPdf, inn };
    }
    man.haedir.push({ id: h.id, nafn: h.nafn, blad: nafnBlad, frum: h.frum, skurdur: h.skurdur, merki_a_bordi: (h.markers || []).length });
  }
  skrifaJson(path.join(D, 'manifest.json'), man);
  // flokkun (vigur með textalagi eða skönnun) + nærmyndir
  const p = spawnSync(PY, [path.join(HER, 'crops.py'), D], { encoding: 'utf8', env: PYENV });
  if (p.status !== 0) throw new Error('crops.py: ' + (p.stderr || p.stdout).slice(-400));
  log(p.stdout.trim());
  await skrifaStig(id, 'lestur', 'Blöð sótt og nærmyndir tilbúnar (' + man.haedir.length + ' hæðir) — lesa tákn');
  log('UNDIRBÚIÐ →', D, '· næst: lestu nærmyndirnar (h*_*.png) og skrifaðu lestur.json (snið í verkhringras.md); vigur-blöð: `vigur ' + id + '`');
}
function createId(inn) { return String(inn || 'blad').split('/').pop().replace(/\.(info|pdf|tif|tiff|jpg)+$/ig, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'blad'; }

/* ── teikning_bord fyrir félag sem á ekkert ──────────────────────────────────────────────────────────────────────── */
async function bord(id, skra) {
  const v = await verk(id), b = lesaJson(skra);
  const [til] = await sg('teikning_bord?company_id=eq.' + v.company_id + '&select=company_id,haedir');
  if (til && (til.haedir || []).length) throw new Error('félagið á þegar teikningaborð — yfirskrifa aldrei (breyta í appinu)');
  const haedir = b.haedir.map((x, i) => {
    if (!x.nafn || !x.url || !x.frum || !x.skurdur) throw new Error('hæð ' + i + ' vantar nafn/url/frum/skurdur');
    return { id: 'hc' + v.company_id + 'x' + i + rid().slice(0, 4), nafn: x.nafn, image_url: '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(x.url), markers: [], veggir: [], pdfVeggir: [], frum: x.frum, skurdur: x.skurdur, sjalf: false, thett: true, syn: { a: false, fest: true } };
  });
  const row = { company_id: v.company_id, haedir, image_url: haedir[0].image_url, markers: [], updated_by: 'Claude (Búnaðargreining · verkhringrás)', updated_at: new Date().toISOString() };
  const r = til ? await sp('teikning_bord?company_id=eq.' + v.company_id, 'PATCH', row) : await sp('teikning_bord', 'POST', row);
  if (!r.ok) throw new Error('teikning_bord: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 300));
  await skrifaStig(id, 'undirbuningur', 'Teikningaborð búið til (' + haedir.length + ' hæðir)');
  log('borð búið til —', haedir.length, 'hæðir; keyrðu nú `undirbua ' + id + '`');
}

/* ── vigur: tákn úr textalagi ────────────────────────────────────────────────────────────────────────────────────── */
function vigur(id) {
  const p = spawnSync(PY, [path.join(HER, 'vigur.py'), dir(id)], { encoding: 'utf8', env: PYENV });
  log((p.stdout || '').trim()); if (p.status !== 0) throw new Error('vigur.py: ' + (p.stderr || '').slice(-400));
}
function yfirlag(id) {
  const p = spawnSync(PY, [path.join(HER, 'yfirlag.py'), dir(id)], { encoding: 'utf8', env: PYENV });
  log((p.stdout || '').trim()); if (p.status !== 0) throw new Error('yfirlag.py: ' + (p.stderr || '').slice(-400));
}

/* ── vistun: lestur.json → bunadargreining ───────────────────────────────────────────────────────────────────────── */
async function vista(id) {
  const v = await verk(id), D = dir(id), L = lesaJson(path.join(D, 'lestur.json')), M = lesaJson(path.join(D, 'manifest.json'));
  const cid = v.company_id;
  const [bd] = await sg('teikning_bord?company_id=eq.' + cid + '&select=*'); if (!bd) throw new Error('ekkert teikningaborð');
  const hb = {}; bd.haedir.forEach((h) => { hb[h.nafn] = h; hb[h.id] = h; });
  if (!Array.isArray(L.items) || !L.items.length) throw new Error('lestur.json hefur engin atriði (items)');
  const bannad = L.items.filter((i) => !FL[i.kind] || !hb[i.haed] || !isFinite(+i.x) || !isFinite(+i.y));
  if (bannad.length) throw new Error('ógild atriði (kind/haed/x/y): ' + JSON.stringify(bannad.slice(0, 3)));
  const rod = L.items.slice().sort((a, b) => bd.haedir.indexOf(hb[a.haed]) - bd.haedir.indexOf(hb[b.haed]) || a.y - b.y || a.x - b.x);
  const tel = {}; rod.forEach((i) => { tel[i.kind] = (tel[i.kind] || 0) + 1; i.audkenni = FORSKEYTI[i.kind] + tel[i.kind]; });
  const nytt = L.nytt === true && M.skrad_taeki === 0;
  const tki = rod.map((i) => {
    const h = hb[i.haed], e = { audkenni: i.audkenni, bunadur: i.bunadur || BUN[i.kind], tegund: i.tegund || (i.kind === 'ut' ? 'Útljós og neyðarlýsing' : ''), stadur: i.stadur || '', mhl: i.mhl || '', haed: h.nafn, haed_id: h.id,
      unitId: null, x: Math.round(i.x), y: Math.round(i.y), bx: Math.round(i.x), by: Math.round(i.y), blad: h.id, heimild: i.heimild || L.heimild_stutt || '' };
    if (FL[i.kind] !== 'sl' && FL[i.kind] !== 'bs') { e.upplysingar = true; e.flokkur = i.kind === 'ut' ? 'flotti' : 'brunakerfi'; }
    if (nytt && (i.kind === 'sl' || i.kind === 'bs')) { e.unitId = 'n:' + (i.kind === 'bs' ? 'slanga' : 'lettvatn') + ':' + rid(); }
    return e;
  });
  const telTki = (f) => tki.filter(f).length;
  const samantekt = { slokkvitaeki: telTki((t) => t.bunadur === BUN.sl), slongur: telTki((t) => t.bunadur === BUN.bs), utgangar: telTki((t) => t.flokkur === 'flotti'), flottaleidir: 0,
    reykskynjarar: telTki((t) => t.bunadur === BUN.r), hitaskynjarar: telTki((t) => t.bunadur === BUN.hiti), handbodar: telTki((t) => t.bunadur === BUN.hb), stjornstodvar: telTki((t) => t.bunadur === BUN.st), mhl: L.mhl || [] };
  const notad = {}; tki.forEach((t) => { notad[t.haed_id] = true; });
  const teikningar = bd.haedir.filter((h) => notad[h.id]).map((h) => ({ id: h.id, nafn: h.nafn + ' — ' + (L.blad_heiti && L.blad_heiti[h.nafn] || 'aðaluppdráttur'), mynd: h.image_url, frum: h.frum, skurdur: h.skurdur, heimild: L.heimild_stutt || '' }));
  const grein = { company_id: cid, landnr: L.landnr || null, heimilisfang: L.heimilisfang || M.heimilisfang, stada: L.stada || 'tillaga', af: L.af || 'Claude (Arnold) — verkhringrás: tákn lesin af nærmyndum, staðfest með yfirlagi',
    tki, texti: L.texti || [], heimildir: L.heimildir || [], athugasemdir: L.athugasemdir || [], samantekt, teikningar, skyrsla: null };
  // sama félag, virk röð til → fjarlægð (saga helst), aldrei eytt
  const virk = await sg('bunadargreining?company_id=eq.' + cid + '&fjarlaegt_at=is.null&select=id');
  for (const g of virk) { const r = await sp('bunadargreining?id=eq.' + g.id, 'PATCH', { fjarlaegt_at: new Date().toISOString(), fjarlaegt_af: 'bgr_verk #' + id }); if (!r.ok) throw new Error('fjarlægja gamla: ' + r.status); }
  const r = await sp('bunadargreining', 'POST', grein);
  if (!r.ok) throw new Error('bunadargreining: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 300));
  const skemmd = (JSON.stringify(r.j[0]).match(/\ufffd/g) || []).length;
  if (skemmd) throw new Error('SKEMMDIR STAFIR (' + skemmd + ') í vistaðri röð — lestur.json var ekki UTF-8');
  if (nytt) {
    const hs = bd.haedir.map((h) => { const m = (h.markers || []).slice(); tki.filter((t) => t.haed_id === h.id && t.unitId).forEach((t) => m.push({ unitId: t.unitId, x: t.bx, y: t.by, nytt: true, tegund: t.bunadur === BUN.bs ? 'Brunaslanga' : 'Léttvatn', stada: 'bid', audkenni: t.audkenni, stadur: t.stadur })); return Object.assign({}, h, { markers: m, stimpilStaerd: h.stimpilStaerd || 26 }); });
    const r2 = await sp('teikning_bord?company_id=eq.' + cid + '&updated_at=eq.' + encodeURIComponent(bd.updated_at), 'PATCH', { haedir: hs, markers: hs[0].markers, updated_by: 'Claude (Búnaðargreining)', updated_at: new Date().toISOString() });
    if (!r2.ok || !r2.j.length) throw new Error('teikning_bord (Nýtt-merki): röðinni var breytt á meðan');
  }
  await skrifaStig(id, 'vistun', 'Greining vistuð (id ' + r.j[0].id + ', ' + tki.length + ' atriði)', { nidurstada: { greining_id: r.j[0].id, tki: tki.length, samantekt } });
  log(JSON.stringify({ greining_id: r.j[0].id, tki: tki.length, samantekt }));
}

/* ── skýrsla: tvær PDF → Viðhengi ────────────────────────────────────────────────────────────────────────────────── */
async function skyrsla(id) {
  const v = await verk(id), D = dir(id), M = lesaJson(path.join(D, 'manifest.json'));
  const stutt = String(M.heimilisfang || M.nafn).split(',')[0].replace(/\s+\(.*\)\s*$/, '').trim();
  const nofn = [['prenta', 'ein síða'], ['prenta-haedir', 'hver hæð á sér blaði']];
  const pdf = path.join(HER, '..', 'almennt', 'pdf_ur_appinu.cjs'), vid = path.join(HER, '..', 'almennt', 'vista_vidhengi.cjs');
  const ut = [];
  for (const [ham, heiti] of nofn) {
    const hrá = path.join(D, 'pdf_' + ham + '.pdf'), lit = path.join(D, 'pdf_' + ham + '_lit.pdf');
    execFileSync('node', [pdf, String(v.company_id), hrá, VEFUR, ham], { stdio: 'inherit', timeout: 600000 });
    const py = spawnSync(PY, ['-c', 'import pymupdf,sys; d=pymupdf.open(sys.argv[1]); d.rewrite_images(quality=80); d.save(sys.argv[2], garbage=4, deflate=True)', hrá, lit], { encoding: 'utf8', env: PYENV });
    const skra = py.status === 0 ? lit : hrá;
    const nafn = stutt + ' - búnaðargreining (' + heiti + ').pdf';
    fs.writeFileSync(path.join(D, 'nafn_' + ham + '.txt'), nafn, 'utf8');
    // nafnið í UTF-8 skrá → umbúðir (íslenskir stafir í skipanalínu eru áhættusamir á Windows)
    const umb = path.join(D, 'vidhengi_' + ham + '.cjs');
    fs.writeFileSync(umb, "const fs=require('fs');process.argv[4]=fs.readFileSync(" + JSON.stringify(path.join(D, 'nafn_' + ham + '.txt')) + ",'utf8').trim();require(" + JSON.stringify(vid) + ");\n", 'utf8');
    execFileSync('node', [umb, String(v.company_id), skra, 'x'], { stdio: 'inherit', timeout: 300000 });
    ut.push(nafn + ' (' + Math.round(fs.statSync(skra).size / 1024) + ' KB)');
  }
  await skrifaStig(id, 'skyrsla', 'PDF í Viðhengi: ' + ut.join(' · '), { nidurstada: Object.assign({}, v.nidurstada || {}, { pdf: ut }) });
  log('Viðhengi:', ut.join(' | '));
}

async function loka(id, texti) { const v = await verk(id); await skrifaStig(id, 'lokid', texti || 'Lokið', { status: 'lokid', lokid_at: new Date().toISOString() }); log('lokið', id, v.company_id); }
async function villa(id, texti) { await skrifaStig(id, 'villa', texti, { status: 'villa', lokid_at: new Date().toISOString() }); log('villa skráð', id); }
async function afturkalla(id) { await skrifaStig(id, 'bida', 'Afturkallað', { status: 'afturkallad', lokid_at: new Date().toISOString() }); log('afturkallað', id); }

(async () => {
  const [cmd, a, b, c] = process.argv.slice(2);
  const falla = { bida: () => bida(a, b), naest: () => naest(a, b), stada: () => stada(a), undirbua: () => undirbua(a), bord: () => bord(a, b), vigur: () => vigur(a), yfirlag: () => yfirlag(a), vista: () => vista(a), skyrsla: () => skyrsla(a),
    stig: () => skrifaStig(a, b, c), loka: () => loka(a, b), villa: () => villa(a, b), afturkalla: () => afturkalla(a) };
  if (!falla[cmd]) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 22).join('\n')); process.exit(2); }
  await falla[cmd]();
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
