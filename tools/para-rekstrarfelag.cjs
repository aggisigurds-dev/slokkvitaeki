#!/usr/bin/env node
/* PÖRUN EFTIR MAGNI — rekstrarfélag með marga staði (frumgerð, 06.10.2026)
 *
 * Agnar: „Þarf eiginlega að útbúa auka tól … þar sem lesið yrði yfir svona rekstrarfélög og skráð niður úr skýrslu
 * og invoicum tækjafjölda eftir tegundum, hve mörg ný, hlaðin og yfirfarin. Para þau síðan saman burtséð frá
 * heitum/heimilisföngum."
 *
 * Dæmið sem kenndi þetta: Steypustöðin á 11 staði á einni kennitölu, öll skýrslublöð bera „Malarhöfða 38"
 * (aðalskrifstofa) og innlestur á kennitölu setti febrúar Malarhöfða á Borgarnes. Talan ljúga ekki: 17 léttvatn,
 * 20 duft, 1 CO₂, 2 slöngur eru Borgarnes hvað sem blaðið heitir.
 *
 * Þrjár heimildir, ein eining = tæki eftir tegund:
 *   STAÐUR    uttaeki (virk tæki á fyrirtaeki_id)
 *   SKÝRSLA   arsskodun_report_facts (nýjasta) + arsskodun_customers[fid].history (ár fyrir ár) — talning per tegund
 *   REIKNINGUR reikningslinur: Yfirferð + Hleðsla = tæki sem voru skoðuð, „Slökkvitæki …" = ný seld
 * Reykskynjarar eru taldir í skýrslu en aldrei rukkaðir (FACT-CHECK-YFIRFERD.md) — þeir eru utan samanburðar.
 *
 * Fyrir hverja skýrslu: (1) besti reikningur innan ±4 mánaða eftir fjarlægð talnanna, (2) besti staður eftir
 * tækjaskránni. Segir hvort núverandi pörun (document_pairs) og núverandi staður (fyrirtaeki_id) séu sammála.
 * ÞETTA SKRIFAR EKKERT. Les og telur.
 *
 *   node tools/para-rekstrarfelag.cjs --kt 660707-0420
 *   node tools/para-rekstrarfelag.cjs --kt 450905-1430 --allt    (líka pör sem stemma)
 */
const U = 'https://osfdzskyvisifcwyjkuk.supabase.co', K = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const args = process.argv.slice(2);
const kt = (args[args.indexOf('--kt') + 1] || '').trim();
const allt = args.includes('--allt');
if (!kt || !/^[0-9]{6}-?[0-9]{4}$/.test(kt)) { console.error('Notkun: node tools/para-rekstrarfelag.cjs --kt 660707-0420 [--allt]'); process.exit(2); }
const H = { apikey: K, Authorization: 'Bearer ' + K };
const get = async (q) => { const r = await fetch(U + '/rest/v1/' + q, { headers: H }); if (!r.ok) throw new Error(q.slice(0, 60) + ' → ' + r.status + ' ' + (await r.text()).slice(0, 120)); return r.json(); };
const TEG = ['lettvatn', 'duft6', 'duft2', 'co2_2', 'co2_5', 'slanga', 'teppi'];   // reyk vísvitandi utan
const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
const tom = () => { const o = {}; TEG.forEach(t => { o[t] = 0; }); return o; };
const sum = v => TEG.reduce((s, t) => s + (v[t] || 0), 0);
const fjarl = (a, b) => TEG.reduce((s, t) => s + Math.abs((a[t] || 0) - (b[t] || 0)), 0);
const vstr = v => TEG.filter(t => v[t]).map(t => v[t] + ' ' + t).join(', ') || '—';
const manTala = s => { const m = String(s || '').toLowerCase(); const i = MAN.findIndex(x => m.indexOf(x) >= 0); return i >= 0 ? i + 1 : (m.indexOf('oktober') >= 0 ? 10 : 0); };
const manIdx = (ar, man) => (+ar) * 12 + (+man || 6) - 1;

// skýrslu-búnaður (lyklar innlesarans) → sameiginlegar tegundir
function urSkyrslu(e) { e = e || {}; const v = tom(); v.lettvatn = +e.lettvatn || 0; v.duft6 = +e.duft6_12 || 0; v.duft2 = +e.duft2 || 0; v.co2_2 = +e.co2_2 || 0; v.co2_5 = +e.co2_5 || 0; v.slanga = +e.brunaslongur || 0; v.teppi = +e.eldvarnarteppi || 0; return v; }
// tækjaskráin → tegundir (stærðin ræður dufti og CO₂)
function urTaeki(rows) { const v = tom(); rows.forEach(r => { const t = String(r.type || ''), s = String(r.size || ''); if (/léttvatn/i.test(t)) v.lettvatn++; else if (/duft/i.test(t)) { if (/(^|[^0-9])2([^0-9]|$)/.test(s)) v.duft2++; else v.duft6++; } else if (/co2|co₂/i.test(t)) { if (/5/.test(s)) v.co2_5++; else v.co2_2++; } else if (/slang|slöngu/i.test(t)) v.slanga++; else if (/teppi/i.test(t)) v.teppi++; }); return v; }
// reikningslínur → yfirferð / hleðsla / ný
function urLinum(linur) { const yf = tom(), hl = tom(), ny = tom(); linur.forEach(l => { const t = l.tegund === 'co2_kg' ? null : l.tegund; if (!t || !TEG.includes(t)) return; const m = +l.magn || 0, d = String(l.lysing || ''); if (/^Yfirferð/i.test(d)) yf[t] += m; else if (/^Hleðsla/i.test(d)) hl[t] += m; else if (/^Slökkvitæki/i.test(d)) ny[t] += m; }); const sk = tom(); TEG.forEach(t => { sk[t] = yf[t] + hl[t]; }); return { yf, hl, ny, skodud: sk }; }

(async () => {
  const stadir = await get('fyrirtaeki?kennitala=eq.' + encodeURIComponent(kt) + '&select=id,nafn,heimilisfang,er_i_thjonustu&order=id');
  if (!stadir.length) { console.log('Engir staðir á kt', kt); return; }
  const ids = stadir.map(s => s.id), inn = 'in.(' + ids.join(',') + ')';
  const [taeki, skjol, facts, lestur, por, st] = await Promise.all([
    get('uttaeki?fyrirtaeki_id=' + inn + '&status=eq.active&select=fyrirtaeki_id,type,size'),
    get('customer_documents?fyrirtaeki_id=' + inn + '&doc_type=eq.uttektarskyrsla&is_duplicate=is.false&select=id,fyrirtaeki_id,year,doc_date,file_name,drive_file_id&order=year.desc'),
    get('arsskodun_report_facts?fyrirtaeki_id=' + inn + '&select=fyrirtaeki_id,report_year,inspect_month,equipment,total_devices,source_doc_id'),
    get('reikningslestur?or=(fyrirtaeki_id.' + inn + ',kennitala.eq.' + encodeURIComponent(kt) + ')&select=reikningur_nr,fyrirtaeki_id,dags,ar,doc_id&order=dags.desc'),
    get('document_pairs?fyrirtaeki_id=' + inn + '&select=id,fyrirtaeki_id,year,service_type,report_doc_id,invoice_doc_id,solur_id,status,matched_by'),
    // PostgREST les `->285` sem fylkisvísi, ekki lykil — sækjum því allan arsskodun_customers-hlutann og veljum sjálf
    get('app_settings?id=eq.1&select=a:settings->arsskodun_customers').then(r => { const a = (r[0] && r[0].a) || {}; const o = {}; ids.forEach(i => { o['h' + i] = (a[String(i)] && a[String(i)].history) || []; }); return [o]; })
  ]);
  // reikningar eiga líka skjalaraðir (customer_documents.reikningur) — document_pairs vísar í þær
  const reiknSkjol = await get('customer_documents?fyrirtaeki_id=' + inn + '&doc_type=eq.reikningur&select=id,invoice_number');
  const docEftirNr = {}; reiknSkjol.forEach(d => { if (d.invoice_number) docEftirNr[d.invoice_number] = d.id; });
  const nrs = lestur.map(l => l.reikningur_nr);
  const linur = nrs.length ? await get('reikningslinur?reikningur_nr=in.(' + nrs.map(n => '"' + n + '"').join(',') + ')&magn=gt.0&select=reikningur_nr,lysing,magn,tegund') : [];
  const nafn = {}; stadir.forEach(s => { nafn[s.id] = s.nafn; });

  // STAÐIR
  const stadV = {}; stadir.forEach(s => { stadV[s.id] = urTaeki(taeki.filter(t => t.fyrirtaeki_id === s.id)); });
  console.log('\n' + kt + ' · ' + stadir.length + ' staðir');
  stadir.forEach(s => console.log('  ' + String(s.id).padStart(5) + '  ' + s.nafn.padEnd(44).slice(0, 44) + ' ' + String(sum(stadV[s.id])).padStart(3) + ' tæki  ' + vstr(stadV[s.id])));

  // SKÝRSLUR: ein færsla per (fid, ár) úr facts + history; skjöl án talningar merkt ólesin
  const sk = [];
  facts.forEach(f => sk.push({ fid: f.fyrirtaeki_id, ar: f.report_year, man: f.inspect_month, v: urSkyrslu(f.equipment), doc: f.source_doc_id, heimild: 'facts' }));
  const hist = st[0] || {};
  ids.forEach(i => (hist['h' + i] || []).forEach(h => { const ar = +h.year, man = manTala(h.skodun); if (!ar || sk.some(x => x.fid === i && x.ar === ar)) return; sk.push({ fid: i, ar, man, v: urSkyrslu(h.equipment), doc: null, heimild: 'history' + (h.skra ? ' · ' + h.skra : '') }); }));
  const olesin = skjol.filter(d => !sk.some(x => x.fid === d.fyrirtaeki_id && x.ar === d.year));
  // REIKNINGAR
  const rk = lestur.map(l => { const u = urLinum(linur.filter(x => x.reikningur_nr === l.reikningur_nr)); const d = l.dags ? new Date(l.dags) : null; return Object.assign({ nr: l.reikningur_nr, fid: l.fyrirtaeki_id, dags: l.dags, ar: d ? d.getFullYear() : +l.ar, man: d ? d.getMonth() + 1 : 0, doc: l.doc_id }, u); }).filter(r => sum(r.skodud) + sum(r.ny) > 0);
  // Nýju reikningarnir (R-000xxx, frá júní 2026) búa í `solur` með línum í JSON — þeir eru ekki í reikningslestri.
  // Agnar 06.10.2026: „ekki alltaf að marka eldri skjöl" — þetta eru nýjustu heimildirnar og verða að vera með.
  const solur = await get('solur?customer_kt=eq.' + encodeURIComponent(kt) + '&is_credit=is.false&select=id,num,customer_id,created_at,linur,vidskiptategund,status&order=created_at.desc');
  const tegUrTexta = d => { d = String(d || '').toLowerCase(); if (/léttvatn|lettvatn/.test(d)) return 'lettvatn'; if (/duft/.test(d)) return /(^|[^0-9])2 ?kg/.test(d) ? 'duft2' : 'duft6'; if (/co2|co₂|kolsýr/.test(d)) return /5 ?kg/.test(d) ? 'co2_5' : 'co2_2'; if (/brunaslang|slöngu/.test(d)) return 'slanga'; if (/teppi/.test(d)) return 'teppi'; return null; };
  solur.filter(s => s.status !== 'void' && s.status !== 'cancelled').forEach(s => {
    const linurS = (Array.isArray(s.linur) ? s.linur : []).map(l => ({ lysing: String(l.desc || l.lysing || ''), magn: +(l.qty || l.magn || 0), tegund: tegUrTexta(l.desc || l.lysing) }));
    const u = urLinum(linurS); if (sum(u.skodud) + sum(u.ny) === 0) return;
    const d = new Date(s.created_at);
    const fyrri = rk.findIndex(r => r.nr === s.num); if (fyrri >= 0) rk.splice(fyrri, 1);   // sami reikningur líka í reikningslestri → salan ræður (nýrri heimild)
    rk.push(Object.assign({ nr: s.num, fid: s.customer_id, dags: s.created_at.slice(0, 10), ar: d.getFullYear(), man: d.getMonth() + 1, doc: docEftirNr[s.num] || null, solurId: s.id }, u));
  });
  rk.forEach(r => { if (!r.doc && docEftirNr[r.nr]) r.doc = docEftirNr[r.nr]; });

  console.log('\nSKÝRSLUR (' + sk.length + ' með talningu, ' + olesin.length + ' ólesnar) → besti reikningur og besti staður eftir tölunum');
  const nidur = [];
  sk.sort((a, b) => b.ar - a.ar || a.fid - b.fid).forEach(s => {
    const mi = manIdx(s.ar, s.man);
    let best = null;
    rk.forEach(r => { const dm = manIdx(r.ar, r.man) - mi; if (dm < -1 || dm > 4) return; const medNy = tom(); TEG.forEach(t => { medNy[t] = r.skodud[t] + r.ny[t]; }); const d = Math.min(fjarl(s.v, r.skodud), fjarl(s.v, medNy)) + Math.abs(dm) * 0.5; if (!best || d < best.d) best = { r, d, dm }; });
    let bs = null; ids.forEach(i => { const d = fjarl(s.v, stadV[i]); if (!bs || d < bs.d) bs = { fid: i, d }; });
    // parið er fundið á (staður, ár) — source_doc_id í report_facts getur verið eldra en árið (mælt: 201 bar 2026-tölur með 2025-skjali)
    const par = por.find(p => p.fyrirtaeki_id === s.fid && +p.year === +s.ar && p.service_type === 'uttekt') || por.find(p => p.report_doc_id === s.doc), parInv = par && (par.invoice_doc_id || par.solur_id);
    const samiReikn = best && par && ((par.invoice_doc_id && par.invoice_doc_id === best.r.doc) || (par.solur_id && par.solur_id === best.r.solurId));
    const parSammala = best ? (parInv ? (samiReikn ? 'já' : 'NEI (parað við annað)') : 'vantar') : (parInv ? 'par án talningar' : '—');
    const stadSammala = bs ? (bs.fid === s.fid ? 'já' : 'NEI → ' + nafn[bs.fid] + ' (' + bs.d + ' frá)') : '—';
    const sv = sum(s.v), oruggt = best && best.d <= Math.max(2, sv * 0.1);
    const lina = { fid: s.fid, ar: s.ar, man: s.man, reikn: best ? best.r.nr + ' ' + best.r.dags + (oruggt ? '' : ' (?)') : 'enginn innan ±4 mán', stemmir: best ? best.d : null, par: parSammala, stadur: stadSammala };
    nidur.push(lina);
    if (!allt && oruggt && parSammala === 'já' && bs && bs.fid === s.fid) return;
    const gamalt = (new Date().getFullYear() - s.ar) >= 2 ? '  ⚠ eldri heimild' : '';
    console.log('  ' + s.ar + '-' + String(s.man || '?').padStart(2, '0') + '  ' + (nafn[s.fid] || s.fid).padEnd(34).slice(0, 34) + '  skýrsla: ' + vstr(s.v) + ' (' + sv + ')' + gamalt);
    if (best) console.log('           reikningur: ' + best.r.nr + ' ' + best.r.dags + '  skoðuð: ' + vstr(best.r.skodud) + '  ný: ' + vstr(best.r.ny) + '  · frávik ' + best.d + (oruggt ? ' ✓' : ' ?') + '  · document_pairs: ' + parSammala);
    else console.log('           reikningur: enginn innan ±4 mánaða' + (parInv ? '  · document_pairs á par (' + parInv + ')' : ''));
    console.log('           staður eftir tækjaskrá: ' + stadSammala + (s.heimild !== 'facts' ? '  · heimild: ' + s.heimild : ''));
  });
  if (olesin.length) { console.log('\nÓLESNAR SKÝRSLUR (engin talning — þarf að lesa PDF):'); olesin.forEach(d => console.log('  ' + (d.year || '????') + '  ' + (nafn[d.fyrirtaeki_id] || d.fyrirtaeki_id).padEnd(34).slice(0, 34) + '  doc ' + d.id + '  ' + String(d.file_name || '').slice(0, 70))); }
  // REIKNINGAR sem engin skýrsla tók: hvaða stað segja tölurnar?
  const teknir = new Set(nidur.map(n => (n.reikn || '').split(' ')[0]));
  const lausir = rk.filter(r => !teknir.has(r.nr));
  if (lausir.length) { console.log('\nREIKNINGAR ÁN SKÝRSLU (' + lausir.length + ') → besti staður eftir tölunum:'); lausir.forEach(r => { let bs = null; ids.forEach(i => { const d = fjarl(r.skodud, stadV[i]); if (!bs || d < bs.d) bs = { fid: i, d }; }); console.log('  ' + r.nr + ' ' + r.dags + '  skráður á: ' + (nafn[r.fid] || r.fid || '—').slice(0, 30).padEnd(30) + '  skoðuð: ' + vstr(r.skodud) + '  ný: ' + vstr(r.ny) + '  → ' + (bs ? nafn[bs.fid] + ' (' + bs.d + ' frá)' : '—')); }); }
  // HLEÐSLUSPÁ — Agnar 06.10.2026: „líka bara til að geta spáð fyrir hvað maður þarf að sækja mörg tæki til hleðslu á stöðum".
  // Hleðslulota eftir tegund (ár). Tæki sem var hlaðið (eða selt nýtt) árið Y kemur aftur í hleðslu árið Y + lota.
  // Heimildin er reikningslínurnar (Hleðsla … / Slökkvitæki …) — hún nær aðeins jafn langt aftur og lesnu reikningarnir.
  const LOTA = { lettvatn: 5, duft6: 5, duft2: 5, co2_2: 10, co2_5: 10, slanga: 0, teppi: 0 };
  const iAr = new Date().getFullYear();
  console.log('\nHLEÐSLUSPÁ (lota: léttvatn/duft 5 ár, CO₂ 10 ár — úr Hleðslu- og sölulínum lesinna reikninga):');
  // Agnar 06.10.2026: „ekki alltaf að marka eldri skjöl" — nýjasta skýrslan ræður; textinn hennar („átta 6 kg
  // dufttæki endurhlaðin") er prentaður með, og eldri heimildir (> 2 ár) eru merktar.
  const textar = {}; ids.forEach(i => { const h = (hist['h' + i] || []).slice().sort((a, b) => (+b.year) - (+a.year)); const n = h.find(x => x.annad); if (n) textar[i] = { ar: n.year, texti: String(n.annad).split(/(?<=[.!])\s+/).filter(x => /hlað|hlad|skipt um innihald|nýj|bætt/i.test(x)).join(' ').slice(0, 220) }; });
  stadir.forEach(st => {
    const minir = rk.filter(r => r.fid === st.id);
    const ar = {}; minir.forEach(r => { const y = r.ar; ar[y] = ar[y] || { hl: tom(), ny: tom() }; TEG.forEach(t => { ar[y].hl[t] += r.hl[t]; ar[y].ny[t] += r.ny[t]; }); });
    const arin = Object.keys(ar).map(Number).sort();
    if (!arin.length) { console.log('  ' + st.nafn.padEnd(44).slice(0, 44) + ' engir lesnir reikningar — engin spá'); return; }
    const spa = {}; [iAr, iAr + 1].forEach(y => { spa[y] = tom(); TEG.forEach(t => { if (!LOTA[t]) return; const fra = ar[y - LOTA[t]]; if (fra) spa[y][t] = fra.hl[t] + fra.ny[t]; }); });
    const saga = arin.map(y => y + ': hlaðin ' + (vstr(ar[y].hl)) + (sum(ar[y].ny) ? ' · ný ' + vstr(ar[y].ny) : '')).join(' | ');
    console.log('  ' + st.nafn.padEnd(44).slice(0, 44) + ' ' + iAr + ': ' + (sum(spa[iAr]) ? vstr(spa[iAr]) : 'ekkert í lotu skv. gögnum') + ' · ' + (iAr + 1) + ': ' + (sum(spa[iAr + 1]) ? vstr(spa[iAr + 1]) : 'ekkert'));
    console.log('       saga: ' + saga.slice(0, 200));
    if (textar[st.id]) console.log('       nýjasta skýrsla (' + textar[st.id].ar + ') segir: ' + (textar[st.id].texti || '(ekkert um hleðslu)'));
  });
  console.log('  ATH: lesnir reikningar ná aðeins til ' + Math.min(...rk.map(r => r.ar)) + ' — tæki sem voru hlaðin fyrr sjást ekki hér; skýrslutextinn („átta 6 kg dufttæki endurhlaðin") er næsta heimild.');
  const vafi = nidur.filter(n => n.par !== 'já' || !/^já/.test(n.stadur) || (n.stemmir != null && n.stemmir > 2));
  console.log('\nSamantekt: ' + nidur.length + ' skýrslur með talningu · ' + (nidur.length - vafi.length) + ' stemma við reikning OG stað · ' + vafi.length + ' þarf að skoða · ' + olesin.length + ' ólesnar.');
})().catch(e => { console.error('BILUN', e.message); process.exit(1); });
