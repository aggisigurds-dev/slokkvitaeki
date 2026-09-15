#!/usr/bin/env node
/* Vörður — Payday-höfnun á rafrænum reikningi (XML) er aldrei þögul (2026-09-14, hert 15.09.).
 *
 * Það sem gerðist: payday-push.js reynir alltaf rafrænan reikning (XML). Hafni
 * Payday honum með villu sem nefnir „electronic invoice" býr varaleiðin reikninginn
 * til aftur ÁN XML og sendir hann í pósti. Það er rétt — ekkert tapast — en
 * höfnunin fór AÐEINS í svar vafrans (smá-toast) og gleymdist. Plaza R-000852 og
 * Austurberg 20 R-000769 fóru þannig 31.08. í Payday án XML; enginn vissi fyrr en
 * 14.09. Agnar 14.09.: sendingin heldur áfram, en höfnunin skal (a) skráð í
 * app_problems, (b) stofna mál á Þjónustuborðinu og (c) spretta strax upp á skjánum.
 *
 * 15.09.: XML-höfnunarmál þurfa ALLTAF svar eða handtak frá Agnari (netfang sem vantar,
 * XML handvirkt úr Payday eða ákvörðun um að loka). payday-push stofnaði þau án merkisins
 * spurning og án samantektar, svo #1057 (R-000929 Berjarimi 14) lenti undir „Tilbúið —
 * bara samþykkja" í Samþykkja-hamnum (368aa). Netvörður fann 14.09. líka fimm göt sem
 * aðeins harnessið sá. Því keyrir vörðurinn nú skraXmlHofnun á gervineti og synaXmlHofnun
 * í gervi-DOM, í stað þess að lesa aðeins textann. Netvörður fann 15.09. 17 stökkbreytingar
 * til viðbótar sem sluppu (m.a. tvítekið fall: vörðurinn prófaði fyrstu skilgreininguna en
 * sú síðasta keyrir) — þær eru nú allar RAUÐAR.
 *
 * Ekkert net. RED ef:
 *   1) varaleiðin (/electronic invoice/i) eða markSaleInvoiced-kallið er horfið, eða
 *      markSaleInvoiced er ekki óskilyrt skipun,
 *   2) mistekin endurtilraun án XML (invErr2) skilar 502 án skráningar eða án bord_mal_id,
 *      eða skráir ekki með created: null,
 *   3) reikningur búinn til án XML skráist ekki, skráist ÁÐUR en salan er merkt send,
 *      200-svarið ber ekki xml_villa + bord_mal_id, eða kallið segir ekki hvort pósturinn
 *      fór (postur: !!payload.sendEmail) og hvort þetta voru drög (drog: mode === 'draft'),
 *   4) skraXmlHofnun skrifar ekki kind 'payday_xml_hafnad' í app_problems, stofnar ekki
 *      mál á Þjónustuborðinu (eitt per sölu, á Agnar, samthykki + spurning), gleypir ekki
 *      villur, eða hefur ekki raunverulegt tímaþak (setTimeout → ctl.abort + signal),
 *   5) kt getur ratað í skráninguna/málið,
 *   6) 166 sýnir ekki gluggann (synaXmlHofnun) í bæði stakri sendingu og fjöldasendingu,
 *      bæði við fellBackToNonElectronic og retriedWithoutElectronic — eða glugginn er
 *      aðeins toast (verður að vera fastur alertdialog sem notandinn lokar),
 *   7) keyrt á gervineti: málið ber ekki merkin samthykki + spurning + payday-xml-sala:<id>,
 *      sést ekki á borði Agnars (lokað, eytt), titillinn segir rangt til um hvort reikningur
 *      varð til, eða samantektin er ekki „Þarf frá þér: …" sem passar við það sem gerðist
 *      (pósturinn fór / vantar netfang / drög / enginn reikningur),
 *   8) keyrt á gervineti: leitin skilar ekki id fyrra máls (tvítekin mál) eða síar ekki eydd
 *      mál, merkið ber ekki sölu-id, leit eða stofnun máls hangir fram yfir þakið (signal
 *      vantar, eða kall fer af stað eftir að þakið er fallið), þakið er utan 1–3 s, eða
 *      app_problems-skrifin eru aldrei kölluð eða bera ranga severity/fingerprint,
 *   9) keyrt í gervi-DOM: breytilegur texti í glugganum í 166 fer óhreinsaður (án esc)
 *      í innerHTML,
 *  10) skraXmlHofnun, synaXmlHofnun eða esc er skilgreint oftar en einu sinni — vörðurinn
 *      prófar þá fyrstu, en í JavaScript keyrir sú síðasta.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/payday-push.js'), 'utf8').replace(/\r\n/g, '\n');
const ky = fs.readFileSync(path.join(__dirname, '..', 'js/patches/166-krofu-yfirlit.js'), 'utf8').replace(/\r\n/g, '\n');
const brot = [];
const KALL = /(?:[\w$]+\s*=\s*)?await\s+skraXmlHofnun\s*\(/;
const KALL_G = /await\s+skraXmlHofnun\s*\(/g;

// ── payday-push: varaleiðin ────────────────────────────────────────────────
const iGrein = src.indexOf('/electronic invoice/i.test(msg)');
const iMerkt = src.indexOf('await markSaleInvoiced(sale.id, created);');
if (iGrein < 0) brot.push('fann ekki XML-varaleiðina (/electronic invoice/i.test(msg)) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');
if (iMerkt < 0) brot.push('fann ekki await markSaleInvoiced(sale.id, created) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');

if (iMerkt > -1) {
  // markSaleInvoiced verður að vera sjálfstæð, óskilyrt skipun: á undan henni kemur ; { eða } (athugasemdir hunsaðar).
  const undan = src.slice(0, iMerkt).replace(/[ \t]*\/\/[^\n]*\n/g, '\n').replace(/\s+$/, '');
  if (!/[;{}]$/.test(undan)) brot.push('markSaleInvoiced er ekki óskilyrt skipun (…' + undan.slice(-40).replace(/\s+/g, ' ').trim() + ') — salan gæti sleppt merkingu í varaleiðinni');
}
if (iGrein > -1 && iMerkt > iGrein) {
  const iElse = src.indexOf('} else {', iGrein);
  const grein = src.slice(iGrein, iElse > iGrein && iElse < iMerkt ? iElse : iMerkt);
  if (!/fellBackToNonElectronic\s*=\s*true/.test(grein)) brot.push('varaleiðin merkir ekki fellBackToNonElectronic = true');
  if (!/xmlVilla\s*=\s*msg\b/.test(grein)) brot.push('varaleiðin geymir ekki Payday-villuna (xmlVilla = msg)');

  const iCatch = grein.indexOf('catch (invErr2)');
  const iRetur = grein.indexOf('retriedWithoutElectronic');
  const misheppnud = iCatch > -1 && iRetur > iCatch ? grein.slice(iCatch, iRetur) : '';
  if (!KALL.test(misheppnud)) brot.push('mistekin endurtilraun (invErr2) skilar 502 án þess að skrá höfnunina');
  else if (!/await\s+skraXmlHofnun\s*\([\s\S]*?\{\s*created:\s*null\s*,/.test(misheppnud)) brot.push('502-kallið (invErr2) sendir ekki created: null — samantektin gæti sagt „krafa í banka" þótt enginn reikningur yrði til');
  const retur502 = iRetur > -1 ? grein.slice(iRetur, grein.indexOf('}', iRetur) + 1) : '';
  if (!/bord_mal_id/.test(retur502)) brot.push('502-svarið (retriedWithoutElectronic) ber ekki bord_mal_id — 166 getur ekki vísað á málið');

  const kallFyrir = (src.slice(iGrein, iMerkt).match(KALL_G) || []).length;
  if (kallFyrir !== 1) brot.push(`${kallFyrir} skráningarköll á milli varaleiðar og markSaleInvoiced — aðeins 502-greinin (invErr2) má skrá þar`);

  const eftir = src.slice(iMerkt, iMerkt + 1400);
  if (!/if\s*\(\s*fellBackToNonElectronic\s*\)\s*\{\s*(?:[\w$]+\s*=\s*)?await\s+skraXmlHofnun\s*\(\s*event\s*,\s*sale\s*,\s*xmlVilla\b/.test(eftir)) {
    brot.push('reikningur búinn til án XML skráist ekki á eftir markSaleInvoiced (if (fellBackToNonElectronic) { … await skraXmlHofnun(event, sale, xmlVilla, …) })');
  }
  // 15.09.: samantektin segir Agnari hvað vantar — til þess þarf fallið að vita hvort pósturinn fór og hvort þetta voru drög.
  // Gildin eru fest við endann (, eða }) svo „!!payload.sendEmail && …" sleppi ekki í gegn.
  const iKall = eftir.search(/await\s+skraXmlHofnun\s*\(\s*event\s*,\s*sale\s*,\s*xmlVilla\b/);
  const kallid = iKall > -1 ? eftir.slice(iKall, eftir.indexOf('});', iKall) + 3) : '';
  if (!/postur:\s*!!\s*payload\.sendEmail\s*[,}]/.test(kallid)) brot.push('kallið á eftir markSaleInvoiced segir ekki hvort pósturinn fór (postur: !!payload.sendEmail) — samantektin gæti sagt „Vantar netfang" þótt pósturinn hafi farið');
  if (!/drog:\s*mode\s*===\s*'draft'\s*[,}]/.test(kallid)) brot.push("kallið á eftir markSaleInvoiced segir ekki hvort þetta voru drög (drog: mode === 'draft')");
  const i200 = eftir.indexOf('return json(200, {');
  const svar200 = i200 > -1 ? eftir.slice(i200, eftir.indexOf('delivery:', i200)) : '';
  if (!/xml_villa\s*:/.test(svar200) || !/bord_mal_id/.test(svar200)) brot.push('200-svarið ber ekki xml_villa + bord_mal_id — glugginn í 166 fær ekki villuna/málið');
}

// ── Ein skilgreining á hverju falli ────────────────────────────────────────
// Vörðurinn tekur fyrstu skilgreininguna úr skránni, en í JavaScript keyrir sú síðasta (netvörður 15.09.:
// gamla skraXmlHofnun aftan við þá nýju eða tvítekið esc í 166 sluppu í gegn).
const fjoldiFalla = (src.match(/function\s+skraXmlHofnun\s*\(/g) || []).length;
if (fjoldiFalla !== 1) brot.push(fjoldiFalla + ' skilgreiningar á skraXmlHofnun í payday-push.js — vörðurinn prófar þá fyrstu en sú síðasta keyrir');
const tvitekid166 = ['synaXmlHofnun', 'esc'].map(n => [n, (ky.match(new RegExp('function\\s+' + n + '\\s*\\(', 'g')) || []).length]).filter(x => x[1] !== 1);
if (tvitekid166.length) brot.push('166 ber ' + tvitekid166.map(x => x[1] + '× ' + x[0]).join(', ') + ' — vörðurinn prófar fyrstu skilgreininguna en sú síðasta keyrir');

// ── payday-push: skraXmlHofnun (textinn) ───────────────────────────────────
const fallTexti = (src.match(/async function skraXmlHofnun\([^)]*\)\s*\{[\s\S]*?\n\}/) || [])[0] || '';
const fall = fallTexti.replace(/^async function skraXmlHofnun\([^)]*\)\s*\{/, '').replace(/\}$/, '');
if (!fall) {
  brot.push('fallið skraXmlHofnun vantar í payday-push.js');
} else {
  if (!/\/rest\/v1\/app_problems/.test(fall)) brot.push('skraXmlHofnun skrifar ekki í app_problems');
  if (!/kind:\s*'payday_xml_hafnad'/.test(fall)) brot.push("skraXmlHofnun skráir ekki kind 'payday_xml_hafnad'");
  if (!/\/rest\/v1\/thjonustubeidni\?[^`]*tags=cs\./.test(fall) || !/payday-xml-sala:/.test(fall)) brot.push('skraXmlHofnun flettir ekki upp fyrra máli sölunnar (tags=cs.["payday-xml-sala:<id>"]) — tvítekin mál');
  if (!/\/rest\/v1\/thjonustubeidni`/.test(fall) || !/return=representation/.test(fall)) brot.push('skraXmlHofnun stofnar ekki mál á Þjónustuborðinu (POST thjonustubeidni, return=representation)');
  const taggar = (fall.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || '';
  if (!/assigned_to:\s*'Agnar'/.test(fall) || !/'samthykki'/.test(taggar) || !/'payday-xml'/.test(taggar)) brot.push("málið er ekki á Agnar með töggunum 'samthykki' + 'payday-xml'");
  if (!/'spurning'/.test(taggar)) brot.push("málið ber ekki merkið 'spurning' — XML-höfnun þarf alltaf svar frá Agnari, annars lendir hún undir „Tilbúið — bara samþykkja\" (#1057)");
  if (!/\bmerki\b/.test(taggar)) brot.push('merkið payday-xml-sala:<id> (merki) er ekki á málinu — leitin finnur það aldrei og málin tvítakast');
  if (!/Promise\.allSettled\(/.test(fall)) brot.push('skráning og mál eru ekki óháð (Promise.allSettled) — bilun í öðru má ekki fella hitt');
  if (!/\bcatch\s*\(/.test(fall)) brot.push('skraXmlHofnun gleypir ekki villur — skráning gæti fellt kröfusendingu');
  if (!/setTimeout\(\s*\(\)\s*=>\s*ctl\.abort\(\)/.test(fall) || !/signal:\s*ctl\.signal/.test(fall)) {
    brot.push('skraXmlHofnun hefur ekkert raunverulegt tímaþak (setTimeout(() => ctl.abort(), …) + signal: ctl.signal)');
  }
  if (/customer_kt|kennitala|\.ssn\b/.test(fall)) brot.push('skraXmlHofnun les kennitölu — kt má aldrei rata í app_problems/borðið');
  if (!/detail:\s*fela_kt\(/.test(fall)) brot.push('detail fer ekki gegnum fela_kt');
  if (!/title:\s*fela_kt\(/.test(fall) || !/summary:\s*fela_kt\(/.test(fall) || !/notes:\s*fela_kt\(/.test(fall)) brot.push('title/summary/notes málsins fara ekki öll gegnum fela_kt');
  if (!fall.includes('(?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)')) {
    brot.push('fela_kt notar ekki kt-mynstrið úr gmail-send ((?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)) — \\b-mynstrið lak 01.09.');
  }
}

// ── 166: glugginn strax (textinn) ──────────────────────────────────────────
const synaTexti = (ky.match(/function synaXmlHofnun\([^)]*\)\s*\{[\s\S]*?\n  \}/) || [])[0] || '';
const synaFall = synaTexti.replace(/^function synaXmlHofnun\([^)]*\)\s*\{/, '');
if (!synaFall) {
  brot.push('166 vantar function synaXmlHofnun — XML-höfnun sprettur ekki upp á skjánum');
} else {
  if (!/position:fixed/.test(synaFall) || !/alertdialog/.test(synaFall)) brot.push('166 synaXmlHofnun er ekki fastur alertdialog (position:fixed + role=alertdialog)');
  if (/Toast\.show/.test(synaFall)) brot.push('166 synaXmlHofnun notar Toast — toast hverfur og gleymist (Plaza 31.08.)');
  if (!/bord_mal_id/.test(synaFall)) brot.push('166 synaXmlHofnun vísar ekki á málið á Þjónustuborðinu (bord_mal_id)');
}
const fallbackKoll = (ky.match(/if\s*\(\s*j\.fellBackToNonElectronic\s*\)\s*synaXmlHofnun\(\s*sale\s*,\s*j\s*\)/g) || []).length;
if (fallbackKoll < 2) brot.push(`166 sýnir gluggann við fellBackToNonElectronic á ${fallbackKoll} stað(stöðum) — á að vera bæði stök sending og fjöldasending`);
const retriedKoll = (ky.match(/j\.retriedWithoutElectronic\s*\)\s*\{?\s*synaXmlHofnun\(\s*sale\s*,\s*j\s*\)/g) || []).length;
if (retriedKoll < 2) brot.push(`166 sýnir gluggann við retriedWithoutElectronic á ${retriedKoll} stað(stöðum) — á að vera bæði stök sending og fjöldasending`);

// ── Hegðun: skraXmlHofnun keyrt á gervineti ────────────────────────────────
// Textagreining sér ekki hvort leitin skilar id fyrra máls, hvort merkið ber sölu-id, hvort signal er á
// hverju kalli eða hvort app_problems-skrifin eru yfirhöfuð kölluð (netvörður 14.09.). Fallið er tekið úr
// skránni og keyrt með gervineti. Í „hangir"-tilvikum skellur þakið (gervi-setTimeout) á eftir 20 ms svo
// vörðurinn bíði ekki í 3 s; tafarlengdin sem kóðinn biður um er borin saman við 1000–3000.
const HANGIR = Symbol('hangir');
const KT = '010203-4059';
const VILLA = 'Customer does not accept electronic invoices (' + KT + ')';
const REIKN = { id: 'inv-vordur-1', number: 999 };
const SALA = (id, nafn) => ({ id, num: 'R-' + String(id).padStart(6, '0'), customer_nafn: nafn, customer_base_id: 146, samtals: 11780 });
const THOGULL = { error() {}, warn() {}, log() {} };

let skraSmidur = null;
if (fallTexti) {
  try {
    skraSmidur = new Function('fetch', 'SUPABASE_URL', 'SUPABASE_KEY', 'setTimeout', 'clearTimeout', 'console', fallTexti + '\nreturn skraXmlHofnun;');
  } catch (e) { brot.push('skraXmlHofnun þýðist ekki utan skrárinnar (' + e.message + ') — vörðurinn þarf að uppfærast með kóðanum'); }
}

async function keyraSkra(t) {
  const koll = [], timar = [];
  const svar = (status, gogn) => ({ ok: status >= 200 && status < 300, status, json: async () => gogn });
  const net = (url, opts = {}) => {
    url = String(url);
    const k = { url: decodeURIComponent(url), adferd: String(opts.method || 'GET').toUpperCase(), signal: opts.signal, body: null };
    try { k.body = opts.body ? JSON.parse(opts.body) : null; } catch (_) { k.body = String(opts.body); }
    k.hvar = /\/rest\/v1\/app_problems\b/.test(url) ? 'app_problems' : /\/rest\/v1\/thjonustubeidni\b/.test(url) ? (k.adferd === 'GET' ? 'leit' : 'mal') : 'annad';
    koll.push(k);
    if (t.kastar || k.hvar === 'annad') return Promise.reject(new Error('gervinet: ' + k.hvar));
    // Eins og raunverulegt net: kall sem fer af stað eftir að þakið er fallið hafnar strax (raðkeyrsla á eftir hangandi kalli).
    if (opts.signal && opts.signal.aborted) return Promise.reject(new Error('gervinet: signal þegar aborted'));
    if (t.hangir === k.hvar) return new Promise((_, hafna) => { if (opts.signal) opts.signal.addEventListener('abort', () => hafna(new Error('aborted'))); });
    if (k.hvar === 'app_problems') return Promise.resolve(svar(201, null));
    if (k.hvar === 'leit') return Promise.resolve(svar(200, t.leitSkilar || []));
    return Promise.resolve(svar(201, [{ id: 5001 }]));
  };
  const gSet = (cb, ms) => { timar.push(ms); const h = setTimeout(cb, t.hangir ? 20 : 60000); if (h.unref) h.unref(); return h; };
  const gClear = h => clearTimeout(h);
  const fn = skraSmidur(net, 'https://sb.vordur', 'vordur-lykill', gSet, gClear, THOGULL);
  let vaktTimi;
  const vakt = new Promise(r => { vaktTimi = setTimeout(() => r(HANGIR), 1500); });
  let skilad, kastad = null;
  try { skilad = await Promise.race([fn({ headers: { 'user-agent': 'vordur/1.0' } }, t.sala, t.villa || VILLA, 'prófun', t.auka), vakt]); }
  catch (e) { kastad = e; }
  clearTimeout(vaktTimi);
  return { skilad, kastad, koll, timar,
    app: koll.filter(k => k.hvar === 'app_problems'), leit: koll.filter(k => k.hvar === 'leit'), mal: koll.filter(k => k.hvar === 'mal') };
}

async function hegdunSkra() {
  if (!skraSmidur) return;
  // 7 + 8(b, c, d): hvert það sem gerst getur → rétt spurning, merki með sölu-id, signal á öllu, app_problems kallað
  const TILVIK = [
    { heiti: 'reikningur án XML, pósturinn fór', sala: SALA(958, 'Berjarimi 12, húsfélag ' + KT), auka: { created: REIKN, fyrirtaeki_id: 193, postur: true, drog: false },
      samantekt: /^Þarf frá þér: .*pósturinn fór/, bannad: /Vantar netfang|drög|mistókst/ },
    { heiti: 'reikningur án XML, ekkert netfang', sala: SALA(959, 'Berjarimi 14, húsfélag ' + KT), auka: { created: REIKN, fyrirtaeki_id: null, postur: false, drog: false },
      samantekt: /^Þarf frá þér: Vantar netfang á Berjarimi 14, húsfélag \[kt\] — .*krafa í banka/, bannad: /pósturinn fór|drög|mistókst/ },
    { heiti: 'drög án XML', sala: SALA(960, 'Berjarimi 16 ' + KT), auka: { created: REIKN, fyrirtaeki_id: null, postur: true, drog: true },
      samantekt: /^Þarf frá þér: .*drög/, bannad: /pósturinn fór|Vantar netfang|mistókst/ },
    { heiti: 'enginn reikningur — endurtilraun án XML mistókst', sala: SALA(961, 'Berjarimi 1-7 ' + KT), auka: { created: null, fyrirtaeki_id: null },
      samantekt: /^Þarf frá þér: .*ekki merkt send/, bannad: /pósturinn fór|Vantar netfang|krafa í banka/ },
  ];
  for (const t of TILVIK) {
    const r = await keyraSkra(t);
    const nafn = 'skraXmlHofnun (' + t.heiti + ')';
    if (r.skilad === HANGIR) { brot.push(nafn + ' kláraðist ekki á 1,5 s þótt ekkert kall hangi'); continue; }
    if (r.kastad) { brot.push(nafn + ' kastaði: ' + r.kastad.message + ' — skráningin má aldrei fella kröfusendinguna'); continue; }
    if (r.app.length !== 1 || !r.app[0].body || r.app[0].body.kind !== 'payday_xml_hafnad') {
      brot.push(nafn + `: ${r.app.length} skrif í app_problems (á að vera 1 með kind payday_xml_hafnad) — skráningin er ekki kölluð`);
    } else if (r.app[0].body.severity !== 'warn' || r.app[0].body.fingerprint !== 'payday_xml_hafnad|' + t.sala.id) {
      brot.push(nafn + ': app_problems ber ekki severity warn („does not accept") og fingerprint payday_xml_hafnad|<sölu-id> — fékk ' + JSON.stringify([r.app[0].body.severity, r.app[0].body.fingerprint]));
    }
    const merkid = 'payday-xml-sala:' + t.sala.id;
    if (r.leit.length !== 1 || !r.leit[0].url.includes('tags=cs.' + JSON.stringify([merkid]))) {
      brot.push(nafn + ': leitin að fyrra máli ber ekki merkið ' + merkid + ' — ' + (r.leit[0] ? r.leit[0].url.replace(/^https:\/\/[^/]+/, '') : 'engin leit'));
    } else if (!r.leit[0].url.includes('deleted_at=is.null')) {
      brot.push(nafn + ': leitin að fyrra máli síar ekki eydd mál (deleted_at=is.null) — eytt mál gæti gleypt nýja höfnun');
    }
    const ansignal = r.koll.filter(k => !(k.signal instanceof AbortSignal));
    if (ansignal.length) brot.push(nafn + ': ' + ansignal.map(k => k.hvar + ' (' + k.adferd + ')').join(', ') + ' án signal — tímaþakið nær ekki til þess kalls');
    if (r.timar.length !== 1 || !(r.timar[0] >= 1000 && r.timar[0] <= 3000)) brot.push(nafn + ': tímaþakið er ' + JSON.stringify(r.timar) + ' ms (á að vera eitt þak, 1000–3000 ms: styttra fellir málsstofnunina, lengra tefur kröfusendinguna)');
    // Frjáls texti (detail/title/summary/notes) er hreinsaður — customer_nafn er gagnadálkur afritaður af sölunni.
    const textar = r.app.map(k => k.body && k.body.detail).concat(...r.mal.map(k => k.body ? [k.body.title, k.body.summary, k.body.notes] : []));
    if (textar.join('\n').includes('010203')) brot.push(nafn + ': kennitala rataði í texta skráningarinnar eða málsins (detail/title/summary/notes)');
    const mal = r.mal[0] && r.mal[0].body;
    if (r.mal.length !== 1 || !mal || typeof mal !== 'object') { brot.push(nafn + `: ${r.mal.length} mál stofnuð (á að vera 1)`); continue; }
    const taggar = Array.isArray(mal.tags) ? mal.tags : [];
    const vantar = ['samthykki', 'spurning', 'payday-xml', merkid].filter(x => !taggar.includes(x));
    if (vantar.length) brot.push(nafn + ': málið vantar merkin ' + vantar.join(', ') + (vantar.includes('spurning') ? ' — lendir undir „Tilbúið — bara samþykkja" (#1057)' : ''));
    if (mal.assigned_to !== 'Agnar' || mal.status === 'lokad' || mal.deleted_at != null || mal.archived_at != null) {
      brot.push(nafn + ': málið sést ekki á borði Agnars — assigned_to=' + JSON.stringify(mal.assigned_to) + ', status=' + JSON.stringify(mal.status)
        + (mal.deleted_at != null ? ', deleted_at' : '') + (mal.archived_at != null ? ', archived_at' : '') + ' (368 hleður aðeins óeydd mál með status≠lokad)');
    }
    if (typeof mal.title !== 'string' || (t.auka.created ? /enginn reikningur/.test(mal.title) : !/enginn reikningur/.test(mal.title))) {
      brot.push(nafn + ': titillinn segir rangt til um hvort reikningur varð til — ' + JSON.stringify(mal.title));
    }
    if (typeof mal.summary !== 'string' || !t.samantekt.test(mal.summary) || t.bannad.test(mal.summary)) {
      brot.push(nafn + ': samantektin segir ekki hvað vantar frá Agnari — fékk ' + JSON.stringify(mal.summary === undefined ? null : mal.summary));
    }
    if (r.skilad !== 5001) brot.push(nafn + ': skilaði ' + String(r.skilad) + ' í stað id nýja málsins (5001)');
  }

  // 4: óvænt XML-villa (ekki „does not accept") → severity error
  {
    const r = await keyraSkra({ sala: SALA(965, 'Óvænt villa'), auka: { created: REIKN, postur: true, drog: false }, villa: 'Electronic invoice rejected: AccountingCost invalid' });
    const s = r.app[0] && r.app[0].body ? r.app[0].body.severity : null;
    if (s !== 'error') brot.push('óvænt XML-villa (ekki „does not accept") skráist með severity ' + JSON.stringify(s === undefined ? null : s) + ' — á að vera error (warn er aðeins fyrir vænta „does not accept"-höfnun)');
  }

  // 8(a): mál til fyrir söluna → id þess, ekkert nýtt mál
  {
    const r = await keyraSkra({ sala: SALA(962, 'Til fyrir'), auka: { created: REIKN, postur: true, drog: false }, leitSkilar: [{ id: 777 }] });
    if (r.skilad !== 777) brot.push('skraXmlHofnun skilar ' + String(r.skilad) + ' þegar mál er til fyrir söluna — á að skila id þess (777): leitin skilar ekki til[0].id');
    if (r.mal.length) brot.push(`skraXmlHofnun stofnaði ${r.mal.length} nýtt mál þótt mál sé til fyrir söluna — tvítekin mál (eitt per sölu)`);
    if (r.app.length !== 1) brot.push('skraXmlHofnun skráði ekki í app_problems þegar mál var til fyrir söluna');
  }

  // 8(c): hvert kall sem hangir fellur á þakinu — signal á leit OG stofnun, ekki bara app_problems
  for (const [hvar, vaent, lysing] of [['leit', null, 'leitin að fyrra máli'], ['mal', null, 'stofnun málsins'], ['app_problems', 5001, 'skráningin í app_problems']]) {
    const r = await keyraSkra({ sala: SALA(963, 'Hangir'), auka: { created: REIKN, postur: true, drog: false }, hangir: hvar });
    if (r.skilad === HANGIR) brot.push('skraXmlHofnun hangir þegar ' + lysing + ' svarar ekki — tímaþakið (ctl.abort) nær ekki til þess kalls; signal vantar');
    else if (r.kastad) brot.push('skraXmlHofnun kastaði þegar ' + lysing + ' hékk: ' + r.kastad.message);
    else if (r.skilad !== vaent) brot.push('skraXmlHofnun skilaði ' + String(r.skilad) + ' þegar ' + lysing + ' hékk (vænt ' + vaent + ')');
  }

  // 4: Supabase niðri → null, ekkert kast
  {
    const r = await keyraSkra({ sala: SALA(964, 'Niðri'), auka: { created: REIKN, postur: true, drog: false }, kastar: true });
    if (r.kastad || r.skilad !== null) brot.push('skraXmlHofnun gleypir ekki villur þegar Supabase er niðri — ' + (r.kastad ? 'kastaði ' + r.kastad.message : 'skilaði ' + String(r.skilad)));
  }
}

// ── Hegðun: synaXmlHofnun (166) keyrt í gervi-DOM ──────────────────────────
// 9: allur breytilegur texti fer gegnum esc. encodeURIComponent er gert að auðkennisfalli svo esc eitt
// verji Payday-slóðina líka.
function gerviDom() {
  const oll = [];
  const nytt = tag => {
    const el = {
      tag, id: '', className: '', innerHTML: '', style: {}, attrs: {}, born: [], _q: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      appendChild(c) { this.born.push(c); return c; },
      addEventListener() {}, focus() {}, remove() { this.fjarlaegt = true; },
      querySelector(sel) { return this._q[sel] || (this._q[sel] = nytt(sel)); },
    };
    oll.push(el);
    return el;
  };
  const body = nytt('body');
  return { oll, document: { body, createElement: nytt, getElementById: id => body.born.find(c => c.id === id && !c.fjarlaegt) || null } };
}

function hegdun166() {
  if (!synaTexti) return;
  const escTexti = (ky.match(/function esc\(s\)\s*\{[\s\S]*?\n  \}/) || [])[0] || '';
  if (!escTexti) { brot.push('fann ekki function esc(s) í 166 — vörðurinn þarf að uppfærast með kóðanum'); return; }
  let esc166, synaSmidur;
  try {
    esc166 = new Function(escTexti + '\nreturn esc;')();
    synaSmidur = new Function('document', 'esc', 'encodeURIComponent', synaTexti + '\nreturn synaXmlHofnun;');
  } catch (e) { brot.push('synaXmlHofnun/esc í 166 þýðast ekki utan skrárinnar (' + e.message + ') — vörðurinn þarf að uppfærast með kóðanum'); return; }
  const X = n => '<x-' + n + ' a="1">';
  const TILVIK = [
    ['reikningur án XML, póstur', { num: X('num'), customer_nafn: X('nafn') },
      { fellBackToNonElectronic: true, mode: 'send', created: { id: X('slod'), number: X('nr') }, email_used: X('epost'), xml_villa: X('villa'), bord_mal_id: X('mal') }],
    ['enginn reikningur', { num: X('num2'), customer_nafn: X('nafn2') },
      { retriedWithoutElectronic: true, error: X('villa2'), bord_mal_id: X('mal2') }],
    ['drög', { num: X('num3') },
      { fellBackToNonElectronic: true, mode: 'draft', created: { id: X('slod3'), number: X('nr3') }, xml_villa: X('villa3') }],
  ];
  for (const [heiti, sala, j] of TILVIK) {
    const dom = gerviDom();
    try { synaSmidur(dom.document, esc166, s => String(s))(sala, j); }
    catch (e) { brot.push('166 synaXmlHofnun kastaði í gervi-DOM (' + heiti + '): ' + e.message + ' — vörðurinn þarf að uppfærast með kóðanum'); continue; }
    const radir = dom.oll.filter(el => el.className === '_ky-xml-rad');
    if (radir.length !== 1) { brot.push(`166 synaXmlHofnun (${heiti}) bætti ${radir.length} röðum í gluggann (á að vera 1) — vörðurinn þarf að uppfærast með kóðanum`); continue; }
    const html = String(radir[0].innerHTML);
    const oesc = html.match(/<x-[a-z0-9]+/g) || [];
    if (oesc.length) brot.push('166 synaXmlHofnun (' + heiti + ') setur óhreinsaðan texta í innerHTML: ' + oesc.map(x => x.slice(3)).join(', ') + ' — vantar esc(...)');
    if (!/&lt;x-/.test(html)) brot.push('166 synaXmlHofnun (' + heiti + ') sýnir engan breytilegan texta í gervi-DOM — vörðurinn þarf að uppfærast með kóðanum');
  }
}

(async () => {
  await hegdunSkra();
  hegdun166();
  if (brot.length) {
    brot.forEach(b => console.log('  ✗ ' + b));
    console.log(`RED: ${brot.length} brot — XML-höfnun í Payday getur aftur orðið þögul eða lent rangt á borðinu. Sjá payday-push.js (skraXmlHofnun) og 166 (synaXmlHofnun).`);
    process.exit(1);
  }
  console.log('✅ GRÆNT payday-xml-skráning: app_problems + mál á borði (eitt per sölu, spurning + „Þarf frá þér") + gluggi í 166 (stök/fjölda, esc), á eftir markSaleInvoiced, 3 s þak á öllum köllum, engin kt.');
  process.exit(0);
})().catch(e => {
  console.log('RED: vörðurinn sjálfur brást (' + (e && e.message) + ') — vörðurinn þarf að uppfærast með kóðanum.');
  process.exit(1);
});
