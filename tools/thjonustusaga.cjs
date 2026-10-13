#!/usr/bin/env node
/* ÞJÓNUSTUSAGA — hve mörg tæki voru yfirfarin, hlaðin og ný, per staður · ár · tegund (13.10.2026)
 *
 * Agnar: „go over fyrirtækis invoices or reports and register how many tæki was yfirfarin, hlaðin, ný í duft
 * og léttvatn og kolsýru per year so we can determine when and how many we need to hlaða each visit..
 * but hlaða is every 5 years" — „especially those with the status eftir 2026", „skip the ones that are not
 * in continuous service (last time only 2023 or 2024)", „minimum 10 tæki", „the big companies".
 *
 * Heimildir (sömu og tools/para-rekstrarfelag.cjs):
 *   SALA        solur (R-000xxx frá júní 2026, línur í JSON)        → yfirferð / hleðsla / nýtt
 *   REIKNINGUR  reikningslestur + reikningslinur (PDF-lesnir reikningar 2020–2026)
 *   SKÝRSLUTEXTI arsskodun_customers[fid].history[].annad („17 slökkvitæki endurhlaðin", „Öll … endurhlaðin")
 *   SKÝRSLA     arsskodun_report_facts.equipment + history[].equipment → yfirfarin (talning tækja á skýrslu)
 * Reikningur/sala ræður; skýrslutexti aðeins þar sem enginn reikningur sýnir hleðslu það ár; skýrslutalning
 * aðeins þar sem enginn reikningur er til það ár. Reykskynjarar, slöngur og teppi eru utan (ekki hlaðin).
 *
 * Staður reiknings: document_pairs (invoice_doc_id/solur_id) → reikningslestur.fyrirtaeki_id / solur.customer_id.
 * Reikningur sem engin leið er að staðsetja er sleppt og talinn í „óstaðsettir".
 *
 * Sjálfgefið ÞURRKEYRSLA (les og prentar). --skrifa tæmir thjonustusaga og skrifar allt aftur (afleidd tafla).
 * --skyrsla prentar hleðsluspána (v_hledsluspa) fyrir félög í samfelldri þjónustu með ≥ 10 tæki og skrifar
 * docs/HLEDSLUSPA-<ár>.md. --fid 123 sýnir eina sögu í smáatriðum.
 *
 *   node tools/thjonustusaga.cjs                 þurrkeyrsla, samantekt
 *   node tools/thjonustusaga.cjs --skrifa        skrifar töfluna
 *   node tools/thjonustusaga.cjs --skyrsla       hleðsluspá (les viewið)
 *   node tools/thjonustusaga.cjs --fid 193       ein saga
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const U = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const K = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const args = process.argv.slice(2);
const SKRIFA = args.includes('--skrifa'), SKYRSLA = args.includes('--skyrsla');
const FID = args.includes('--fid') ? +args[args.indexOf('--fid') + 1] : 0;
const MIN_TAEKI = args.includes('--min') ? +args[args.indexOf('--min') + 1] : 10;
const AR = new Date().getFullYear();

const get = async (q) => { const r = await fetch(U + '/rest/v1/' + q, { headers: H }); if (!r.ok) throw new Error(q.slice(0, 80) + ' → ' + r.status + ' ' + (await r.text()).slice(0, 200)); return r.json(); };
const getAll = async (q) => { const out = []; for (let off = 0; ; off += 1000) { const b = await get(q + (q.includes('?') ? '&' : '?') + 'limit=1000&offset=' + off); out.push(...b); if (b.length < 1000) break; } return out; };

const TEG = ['lettvatn', 'duft', 'co2'];
const tom = () => ({ lettvatn: 0, duft: 0, co2: 0, oskilgreint: 0 });
// fín tegund (duft6/duft2/co2_2/co2_5) úr reikningslínu-tegund eða texta
function finTeg(tegund, d) {
  if (tegund && /^(lettvatn|duft6|duft2|co2_2|co2_5)$/.test(tegund)) return tegund;
  d = String(d || '').toLowerCase();
  if (/léttvatn|lettvatn/.test(d)) return 'lettvatn';
  if (/duft/.test(d)) return /(^|[^0-9])[12] ?kg/.test(d) ? 'duft2' : 'duft6';
  if (/co2|co₂|kolsýr/.test(d)) return /5 ?kg/.test(d) ? 'co2_5' : 'co2_2';
  return null;
}
const grof = ft => ft ? (ft.startsWith('duft') ? 'duft' : ft.startsWith('co2') ? 'co2' : 'lettvatn') : null;
// aukahlutir sem nefna „slökkvitæki"/„kolsýrutæki" en eru ekki tæki
const AUKAHLUTUR = /slanga fyrir|festing|skilti|skápur|skapur|hengi|merki|hlíf|o-hringur|slöngu fyrir|þrýstimælir|handfang|stútur/i;

// ein reikningslína → { adgerd: yf|hl|ny, fin: duft6…, magn }
function lesaLinu(lysing, magn, tegund) {
  const d = String(lysing || ''); const m = +magn || 0; if (!m) return null;
  if (AUKAHLUTUR.test(d)) return null;
  if (tegund === 'co2_kg') return null;                                   // kg af CO₂, ekki tæki
  if (/byrjunargjald/i.test(d) && /co2|co₂|kolsýr/i.test(d)) return { adgerd: 'hl', fin: 'co2_5', magn: m, osk: true };   // byrjunargjald = 1 per tæki (stærð óþekkt)
  if (tegund === 'reyk' || tegund === 'slanga' || tegund === 'abf' || /reykskynj|brunaslang|teppi|nitro/i.test(d)) return null;
  const fin = finTeg(tegund, d); if (!fin) return null;
  if (/^yfirferð|yfirferð$|yfirferd$|· yfirferð|yfirferð ·/i.test(d.trim())) return { adgerd: 'yf', fin, magn: m };
  if (/hleðsla|hledsla/i.test(d)) return { adgerd: 'hl', fin, magn: m };
  if (/slökkvitæki|^nýtt ·/i.test(d)) return { adgerd: 'ny', fin, magn: m };
  if (/yfirferð/i.test(d)) return { adgerd: 'yf', fin, magn: m };
  return null;
}

// skýrslutexti → [{ adgerd: hl|ny, grof: lettvatn|duft|co2|oskilgreint, magn, setning }]
const ORD = { einu: 1, eitt: 1, einn: 1, ein: 1, tvö: 2, tveimur: 2, tvo: 2, tvær: 2, þrjú: 3, þremur: 3, þrjá: 3, þrjár: 3, fjögur: 4, fjórum: 4, fjóra: 4, fjórar: 4, fimm: 5, sex: 6, sjö: 7, átta: 8, níu: 9, tíu: 10, ellefu: 11, tólf: 12, þrettán: 13, fjórtán: 14, fimmtán: 15, sextán: 16, sautján: 17, átján: 18, nítján: 19, tuttugu: 20 };
function lesaTexta(annad, oll) {
  const ut = []; const t = String(annad || '').replace(/\s+/g, ' ').trim(); if (!t) return ut;
  const setningar = t.split(/(?<=[.!])\s+|(?<=\))\s+(?=[A-ZÁÉÍÓÚÝÞÆÖ])/);
  setningar.forEach(s => {
    const l = s.toLowerCase();
    const hl = /endurhlað|endurhlod|hlaðin|hlaðið|hladin|skipt um innihald|endurfyllt/.test(l) && !/ekki (endur)?hlað|óhlað/.test(l);
    const ny = /nýj\w* (slökkvi)?tæk|nýtt (slökkvi)?tæki|nýtt sett|skipt út fyrir nýtt|bætt við|ný tæki|nýtt í stað/.test(l) && !/engin ný|ekkert nýtt/.test(l);
    if (!hl && !ny) return;
    const g = /léttvatn|lettvatn/.test(l) ? 'lettvatn' : /duft/.test(l) ? 'duft' : /co2|co₂|kolsýr/.test(l) ? 'co2' : 'oskilgreint';
    // fjöldi: „öll", „nr 1913, 1903, 4159", „17 slökkvitæki", „átta 6 kg dufttæki", „sex léttvatnstæki"
    const tala = (seg) => {
      if (/\böll\b|\ballar\b|\böllum\b/.test(seg) && /tæki|tækj/.test(seg)) return 'oll';
      const nr = seg.match(/\bnr\.?\s*:?\s*([\d\s,og]+)/i); if (nr) { const n = (nr[1].match(/\d{2,}/g) || []).length; if (n) return n; }
      const m = seg.match(/(\d+|[a-záéíóúýþæö]+)\s+(?:stk\.?\s+)?(?:\d+\s*(?:kg|l|ltr)\.?\s*)?(?:léttvatns|duft|kolsýru|co2|co₂)?(?:slökkvi)?tæk/i);
      if (m) { const w = m[1].toLowerCase(); if (/^\d+$/.test(w)) return +w; if (ORD[w] != null) return ORD[w]; }
      const m2 = seg.match(/(\d+)\s*(?:stk|tæki)/i); if (m2) return +m2[1];
      return null;
    };
    if (hl) { const n = tala(l); if (n === 'oll') { TEG.forEach(tg => { if (oll[tg]) ut.push({ adgerd: 'hl', grof: tg, magn: oll[tg], setning: s }); }); } else if (n) ut.push({ adgerd: 'hl', grof: g, magn: n, setning: s }); }
    if (ny) { const n = tala(l); if (n === 'oll') return; ut.push({ adgerd: 'ny', grof: g, magn: n || 1, setning: s }); }
  });
  return ut;
}

(async () => {
  if (SKYRSLA) return skyrsla();
  const [fyrirt, lestur, linur, por, solur, facts, st] = await Promise.all([
    getAll('fyrirtaeki?deleted_at=is.null&select=id,nafn,kennitala,er_i_thjonustu'),
    getAll('reikningslestur?kredit=is.false&select=reikningur_nr,fyrirtaeki_id,kennitala,dags,ar,doc_id'),
    getAll('reikningslinur?magn=gt.0&select=reikningur_nr,lysing,magn,tegund'),
    getAll('document_pairs?select=fyrirtaeki_id,year,invoice_doc_id,solur_id'),
    getAll('solur?is_credit=is.false&status=not.in.(void,cancelled)&select=id,num,customer_id,customer_kt,created_at,linur'),
    getAll('arsskodun_report_facts?select=fyrirtaeki_id,report_year,equipment,source_doc_id'),
    get('app_settings?id=eq.1&select=a:settings->arsskodun_customers').then(r => (r[0] && r[0].a) || {})
  ]);
  const nafn = {}; fyrirt.forEach(f => { nafn[f.id] = f.nafn; });
  const fidAfDoc = {}, fidAfSolu = {}; por.forEach(p => { if (p.invoice_doc_id && p.fyrirtaeki_id) fidAfDoc[p.invoice_doc_id] = p.fyrirtaeki_id; if (p.solur_id && p.fyrirtaeki_id) fidAfSolu[p.solur_id] = p.fyrirtaeki_id; });
  const linurEftirNr = {}; linur.forEach(l => { (linurEftirNr[l.reikningur_nr] = linurEftirNr[l.reikningur_nr] || []).push(l); });

  // safn: lykill fid|ar|tegund|heimild → röð
  const rows = new Map();
  const bæta = (fid, ar, tegund, heimild, adgerd, magn, tilv, fin, texti) => {
    if (!fid || !ar || !magn) return;
    const k = [fid, ar, tegund, heimild].join('|');
    const r = rows.get(k) || { fyrirtaeki_id: fid, ar, tegund, heimild, yfirfarin: 0, hladin: 0, ny: 0, _tilv: new Set(), _fin: {}, _texti: new Set() };
    r[adgerd === 'yf' ? 'yfirfarin' : adgerd === 'hl' ? 'hladin' : 'ny'] += magn;
    if (tilv) r._tilv.add(String(tilv)); if (fin) { const fk = adgerd + ':' + fin; r._fin[fk] = (r._fin[fk] || 0) + magn; } if (texti) r._texti.add(texti.slice(0, 200));
    rows.set(k, r);
  };
  const ostadsettir = [];

  // REIKNINGAR (PDF-lesnir)
  let nReikn = 0;
  lestur.forEach(l => {
    const fid = (l.doc_id && fidAfDoc[l.doc_id]) || l.fyrirtaeki_id; const ar = l.dags ? +l.dags.slice(0, 4) : +l.ar;
    const ln = linurEftirNr[l.reikningur_nr] || []; const lesnar = ln.map(x => lesaLinu(x.lysing, x.magn, x.tegund)).filter(Boolean);
    if (!lesnar.length) return;
    if (!fid) { ostadsettir.push({ heimild: 'reikningur', nr: l.reikningur_nr, kt: l.kennitala, ar }); return; }
    nReikn++;
    lesnar.forEach(x => bæta(fid, ar, grof(x.fin), 'reikningur', x.adgerd, x.magn, l.reikningur_nr, x.fin));
  });
  // SÖLUR (nýju reikningarnir) — sami reikningur í reikningslestri líka? salan ræður (nýrri heimild): fjarlægjum reikningsröðina
  let nSolur = 0; const soluNr = new Set(solur.map(s => s.num));
  for (const k of Array.from(rows.keys())) { const r = rows.get(k); if (r.heimild === 'reikningur' && Array.from(r._tilv).every(n => soluNr.has(n))) rows.delete(k); }
  solur.forEach(s => {
    const fid = fidAfSolu[s.id] || s.customer_id; const ar = +String(s.created_at).slice(0, 4);
    const ln = Array.isArray(s.linur) ? s.linur : []; const lesnar = ln.map(x => lesaLinu(x.desc || x.lysing, x.qty || x.magn, null)).filter(Boolean);
    if (!lesnar.length) return;
    if (!fid) { ostadsettir.push({ heimild: 'sala', nr: s.num, kt: s.customer_kt, ar }); return; }
    nSolur++;
    lesnar.forEach(x => bæta(fid, ar, grof(x.fin), 'sala', x.adgerd, x.magn, s.num, x.fin));
  });
  // hvaða (fid, ár) eiga reikning / reikning með hleðslu?
  const medReikn = new Set(), medHledslu = new Set();
  rows.forEach(r => { if (r.heimild === 'reikningur' || r.heimild === 'sala') { medReikn.add(r.fyrirtaeki_id + '|' + r.ar); if (r.hladin > 0) medHledslu.add(r.fyrirtaeki_id + '|' + r.ar); } });

  // SKÝRSLUR: facts + history → ein talning per (fid, ár), facts ræður
  const skyrslur = new Map();
  const urEq = e => { e = e || {}; return { lettvatn: +e.lettvatn || 0, duft: (+e.duft6_12 || 0) + (+e.duft2 || 0), co2: (+e.co2_2 || 0) + (+e.co2_5 || 0) }; };
  facts.forEach(f => { if (f.fyrirtaeki_id && f.report_year) skyrslur.set(f.fyrirtaeki_id + '|' + f.report_year, { fid: f.fyrirtaeki_id, ar: +f.report_year, v: urEq(f.equipment), annad: (f.equipment || {}).annad || '', tilv: f.source_doc_id ? 'doc ' + f.source_doc_id : 'facts' }); });
  Object.keys(st).forEach(fidS => { const fid = +fidS; (((st[fidS] || {}).history) || []).forEach(h => { const ar = +h.year; if (!ar) return; const k = fid + '|' + ar; const cur = skyrslur.get(k); if (!cur) skyrslur.set(k, { fid, ar, v: urEq(h.equipment), annad: h.annad || '', tilv: h.doc_id ? 'doc ' + h.doc_id : (h.skra || 'history') }); else if (!cur.annad && h.annad) cur.annad = h.annad; }); });
  let nSkyrslur = 0, nTextar = 0;
  skyrslur.forEach(s => {
    const k = s.fid + '|' + s.ar;
    if (!medReikn.has(k)) { nSkyrslur++; TEG.forEach(tg => bæta(s.fid, s.ar, tg, 'skyrsla', 'yf', s.v[tg], s.tilv)); }
    const lesid = lesaTexta(s.annad, s.v);
    if (lesid.length) {
      const hlOk = !medHledslu.has(k);
      lesid.forEach(x => { if (x.adgerd === 'hl' && !hlOk) return; if (x.adgerd === 'ny' && medReikn.has(k)) return; nTextar++; bæta(s.fid, s.ar, x.grof, 'skyrslutexti', x.adgerd, x.magn, s.tilv, null, x.setning); });
    }
  });

  const ut = Array.from(rows.values()).map(r => ({ fyrirtaeki_id: r.fyrirtaeki_id, ar: r.ar, tegund: r.tegund, yfirfarin: r.yfirfarin, hladin: r.hladin, ny: r.ny, heimild: r.heimild, tilvisun: Array.from(r._tilv).sort().join(', ').slice(0, 300) || null, sundurlidun: Object.keys(r._fin).length ? r._fin : null, texti: r._texti.size ? Array.from(r._texti).join(' | ').slice(0, 600) : null }))
    .sort((a, b) => a.fyrirtaeki_id - b.fyrirtaeki_id || a.ar - b.ar || a.tegund.localeCompare(b.tegund));

  const tala = (h, f) => ut.filter(r => r.heimild === h).reduce((s, r) => s + r[f], 0);
  console.log('ÞJÓNUSTUSAGA — ' + ut.length + ' raðir (staður·ár·tegund·heimild), ' + new Set(ut.map(r => r.fyrirtaeki_id)).size + ' staðir');
  console.log('  reikningar með tækjalínum: ' + nReikn + ' · sölur: ' + nSolur + ' · skýrslutalningar án reiknings: ' + nSkyrslur + ' · skýrslutexta-tölur: ' + nTextar + ' · óstaðsettir: ' + ostadsettir.length);
  ['sala', 'reikningur', 'skyrslutexti', 'skyrsla'].forEach(h => console.log('  ' + h.padEnd(13) + ' yfirfarin ' + String(tala(h, 'yfirfarin')).padStart(5) + '  hlaðin ' + String(tala(h, 'hladin')).padStart(5) + '  ný ' + String(tala(h, 'ny')).padStart(5)));
  const perAr = {}; ut.forEach(r => { const a = perAr[r.ar] = perAr[r.ar] || { yf: 0, hl: 0, ny: 0 }; a.yf += r.yfirfarin; a.hl += r.hladin; a.ny += r.ny; });
  console.log('  per ár: ' + Object.keys(perAr).sort().map(a => a + ' yf ' + perAr[a].yf + '/hl ' + perAr[a].hl + '/ný ' + perAr[a].ny).join(' · '));
  if (ostadsettir.length) console.log('  óstaðsettir (án fyrirtaeki_id og án pars): ' + ostadsettir.slice(0, 12).map(o => o.heimild + ' ' + o.nr + ' kt ' + (o.kt || '?') + ' ' + o.ar).join(' | ') + (ostadsettir.length > 12 ? ' …' : ''));

  if (FID) { console.log('\n' + FID + ' ' + (nafn[FID] || '')); ut.filter(r => r.fyrirtaeki_id === FID).forEach(r => console.log('  ' + r.ar + ' ' + r.tegund.padEnd(12) + ' yf ' + String(r.yfirfarin).padStart(3) + ' hl ' + String(r.hladin).padStart(3) + ' ný ' + String(r.ny).padStart(3) + '  ' + r.heimild.padEnd(12) + ' ' + (r.tilvisun || '') + (r.sundurlidun ? '  ' + JSON.stringify(r.sundurlidun) : '') + (r.texti ? '\n        „' + r.texti.slice(0, 160) + '“' : ''))); }

  if (!SKRIFA) { console.log('\nÞURRKEYRSLA — ekkert skrifað. --skrifa skrifar töfluna.'); return; }
  const del = await fetch(U + '/rest/v1/thjonustusaga?id=gt.0', { method: 'DELETE', headers: H }); if (!del.ok) throw new Error('DELETE ' + del.status + ' ' + (await del.text()).slice(0, 200));
  for (let i = 0; i < ut.length; i += 500) { const r = await fetch(U + '/rest/v1/thjonustusaga', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(ut.slice(i, i + 500)) }); if (!r.ok) throw new Error('POST ' + r.status + ' ' + (await r.text()).slice(0, 300)); }
  console.log('SKRIFAÐ: ' + ut.length + ' raðir í thjonustusaga.');
})().catch(e => { console.error('VILLA:', e.message); process.exit(1); });

// HLEÐSLUSPÁ — les viewið, síar: í þjónustu, síðast skoðað í fyrra eða í ár, ≥ MIN_TAEKI tæki. Eftir-félögin fyrst.
async function skyrsla() {
  const all = await getAll('v_hledsluspa?er_i_thjonustu=is.true&last_year=gte.' + (AR - 1) + '&taeki=gte.' + MIN_TAEKI + '&select=*');
  const eftir = all.filter(r => r.last_year < AR).sort((a, b) => b.til_hledslu - a.til_hledslu || b.taeki - a.taeki);
  const buid = all.filter(r => r.last_year >= AR).sort((a, b) => b.til_hledslu - a.til_hledslu || b.taeki - a.taeki);
  const lina = r => '| ' + r.fyrirtaeki_id + ' | ' + String(r.nafn).replace(/\|/g, '/') + ' | ' + (r.inspect_month || '') + ' | ' + r.taeki + ' | ' + r.taeki_lettvatn + '/' + r.taeki_duft + '/' + r.taeki_co2 + ' | ' + r.nyleg_lettvatn + '/' + r.nyleg_duft + '/' + r.nyleg_co2 + (r.nyleg_oskilgreint ? ' (+' + r.nyleg_oskilgreint + ' ót.)' : '') + ' | **' + r.til_hledslu + '** | ' + r.til_hledslu_lettvatn + '/' + r.til_hledslu_duft + '/' + r.til_hledslu_co2 + ' | ' + (r.sidasta_hledsla || '—') + ' | ' + (r.elsta_heimild || '—') + ' | ' + r.ath + ' |';
  const haus = '| id | Staður | Mán | Tæki | L/D/CO₂ | Hlaðin/ný síðustu 5 ár L/D/CO₂ | Til hleðslu | L/D/CO₂ | Síðast hlaðið | Saga frá | Ath |\n|---|---|---|---|---|---|---|---|---|---|---|';
  const sum = arr => arr.reduce((s, r) => s + r.til_hledslu, 0);
  let md = '# Hleðsluspá ' + AR + ' — félög í samfelldri þjónustu með ≥ ' + MIN_TAEKI + ' tæki\n\n';
  md += '*Reiknað ' + new Date().toISOString().slice(0, 10) + ' úr `thjonustusaga` (tools/thjonustusaga.cjs) og `v_hledsluspa`. Regla: tæki er hlaðið á 5 ára fresti — tæki sem var hlaðið eða selt nýtt árið Y kemur í hleðslu árið Y+5. „Til hleðslu" = virk tæki (léttvatn + duft + kolsýra) mínus þau sem voru hlaðin/ný innan síðustu 5 ára fyrir næstu heimsókn. Nái sagan ekki 5 ár aftur er talan EFRI MÖRK (tæki gæti hafa verið hlaðið áður en reikningar voru lesnir). Félög sem voru síðast skoðuð 2023/2024 eru ekki með (ekki í samfelldri þjónustu). Reykskynjarar, slöngur og teppi eru utan. Dálkarnir L/D/CO₂ telja aðeins tegundargreindar hleðslur — „ót." = tölur úr skýrslutexta án tegundar („17 slökkvitæki endurhlaðin"), þær dragast aðeins frá heildartölunni, svo heildin getur verið lægri en summa dálkanna.*\n\n';
  md += '## Eftir ' + AR + ' (síðast skoðað ' + (AR - 1) + ') — ' + eftir.length + ' félög, ' + sum(eftir) + ' tæki til hleðslu við heimsóknina ' + AR + '\n\n' + haus + '\n' + eftir.map(lina).join('\n') + '\n\n';
  md += '## Búið ' + AR + ' — ' + buid.length + ' félög, ' + sum(buid) + ' tæki til hleðslu við heimsóknina ' + (AR + 1) + '\n\n' + haus + '\n' + buid.map(lina).join('\n') + '\n';
  const skra = path.join(rot, 'docs', 'HLEDSLUSPA-' + AR + '.md'); fs.writeFileSync(skra, md); console.log('Skrifað ' + skra);
  console.log('\nEFTIR ' + AR + ' (' + eftir.length + ' félög, ' + sum(eftir) + ' tæki til hleðslu):');
  eftir.forEach(r => console.log('  ' + String(r.fyrirtaeki_id).padStart(5) + '  ' + String(r.nafn).padEnd(40).slice(0, 40) + ' mán ' + String(r.inspect_month || '-').padStart(2) + '  tæki ' + String(r.taeki).padStart(3) + '  til hleðslu ' + String(r.til_hledslu).padStart(3) + ' (L ' + r.til_hledslu_lettvatn + ' D ' + r.til_hledslu_duft + ' CO₂ ' + r.til_hledslu_co2 + ')  síðast hlaðið ' + (r.sidasta_hledsla || '—') + '  ' + r.ath));
  console.log('\nBÚIÐ ' + AR + ' (' + buid.length + ' félög, ' + sum(buid) + ' tæki til hleðslu ' + (AR + 1) + ') — 15 stærstu:');
  buid.slice(0, 15).forEach(r => console.log('  ' + String(r.fyrirtaeki_id).padStart(5) + '  ' + String(r.nafn).padEnd(40).slice(0, 40) + '  tæki ' + String(r.taeki).padStart(3) + '  til hleðslu ' + String(r.til_hledslu).padStart(3) + ' (L ' + r.til_hledslu_lettvatn + ' D ' + r.til_hledslu_duft + ' CO₂ ' + r.til_hledslu_co2 + ')  síðast hlaðið ' + (r.sidasta_hledsla || '—') + '  ' + r.ath));
}
