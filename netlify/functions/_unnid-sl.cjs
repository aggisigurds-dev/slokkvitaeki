// _unnid-sl.cjs — SLÖKKVITÆKI „Unnið“: hvenær tekjur telja eftir reglum Agnars 21.–22.11.2026. Hrein föll, ekkert net.
// Notað af tekjur-beint.cjs (flísarnar á Tekjum). Gamla reglan (söludagur, _tekjur.cjs) stendur áfram við hlið þessarar.
//
// REGLURNAR (orð Agnars):
//   • SKOÐANIR (ársþjónusta slökkvitækja, brunakerfi, slökkvikerfi): tekjur telja í MÁNUÐI SKOÐUNARINNAR skv. skýrslunni, þótt
//     ógreiddar og þótt skýrslan sé gerð mánuðinum á eftir. Sala og skýrsla tengjast á kúnna + nálægð í tíma.
//       ársþjónusta  vidskiptategund 'uttekt'       ↔ customer_documents 'uttektarskyrsla'  (gluggi: skýrsla −45/+3 d frá sölu)
//       brunakerfi   'brunakerfi'                   ↔ 'brunakerfi'                           (−150/+3 d)
//       slökkvikerfi 'slokkvikerfi'                 ↔ 'slokkvikerfi'                         (−150/+3 d)
//     Skoðunarmánuður: staðlaði dálkurinn skodun_ar_man ('YYYY-MM') ef hann er til, annars úr skráarnafni appskýrslunnar
//     („… - 2026 - nóvember - úttektarskýrsla - #1486.pdf“), annars dagsetning skýrslunnar. Árið er leiðrétt ef það er
//     óraunhæft (2027-08 á skýrslu frá 2026 verður 2026-08). Margar skýrslur: sami mánuður á þeim öllum → öruggt, annars
//     nærtækasta skýrslan og talan merkt „óviss“. Engin skýrsla: mánuður sölunnar, merkt „án skýrslu“.
//   • VERKSTÆÐI: V-hluti sölu (verkbeidnir R-xxxxxx-Vn, verd m. VSK ÷ 1,24, kvarðaður með afslætti sölunnar) telst þegar
//     tækið er merkt done og sent í afgreiðslu = verkbeidnir.klart_at. Er klart_at tómt (eldri raðir, stimpillinn kom 21.11):
//     söludagur, merkt „áætlað“. Verkbeiðni sem er ekki komin í ready/collected telst ekki enn („í vinnslu“). Salan sjálf telur
//     AFGANGINN (án V-hlutans) á sínum degi — svo ekkert telst tvisvar. Stemmi V-hlutinn ekki við sölulínurnar (V > sala,
//     mælt ~13 % sölu með verkbeiðni) helst salan öll á söludegi og er talin „óstemmd“.
//   • FJÖLDI TÆKJA: skoðanir: línur sölunnar „Yfirferð · …“, „Hleðsla · …“, „Nýtt · …“ (qty) í skoðunarmánuðinum; verkstæði:
//     verkliðir verkbeiðninnar (texti eins og „CO₂ 100 gr. × 26 (samtals)“ → 26 hleðslur) í mánuði klart_at. Samtals úr báðum.
//   • Kreditnóta fylgir upprunasölunni (sama mánuði og flokki, hlutfallslega); finnist hún ekki: eigin dagur og flokkur.
//     Bakfært (void), drög og kreditnóta á bakfærða sölu telst aldrei (eins og slokkvitaekiGildar í _tekjur.cjs).
// Samtölur allra mánaða = samtölur gömlu reglunnar (sala er aðeins færð til, ekki bætt við). Aldrei 0 þegar gögn vantar:
// kallandinn skilar ómælt með ástæðu (tekjur-beint.cjs).
// ATH: JSON-svarið má ekki innihalda orð með „kt“ (prófið bannar það) — flokkar heita því arsthjonusta/skodanir, ekki „úttekt“.
'use strict';

const T = require('./_tekjur.cjs');

const FLOKKAR = ['arsthjonusta', 'brunakerfi', 'slokkvikerfi', 'verkstaedi', 'verslun'];
const SKODUN = { uttekt: 'arsthjonusta', brunakerfi: 'brunakerfi', slokkvikerfi: 'slokkvikerfi' };   // vidskiptategund → flokkur
const SKYRSLA_TEGUND = { uttekt: 'uttektarskyrsla', brunakerfi: 'brunakerfi', slokkvikerfi: 'slokkvikerfi' };
const GLUGGI = { uttekt: [45, 3], brunakerfi: [150, 3], slokkvikerfi: [150, 3] };   // daga fyrir / eftir söludag
const V_KLAR = new Set(['ready', 'collected']);          // tæki merkt done og sent í afgreiðslu
const V_OKLAR = new Set(['received', 'inprogress']);     // í vinnslu: telst ekki enn
const VSK = 1.24;

const dagTala = (iso) => { const t = Date.parse(String(iso || '').slice(0, 10)); return Number.isFinite(t) ? Math.round(t / 86400000) : null; };
const manTala = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
const manUrTolu = (n) => String(Math.floor(n / 12)).padStart(4, '0') + '-' + String((n % 12) + 1).padStart(2, '0');

// Íslenskt mánaðarheiti (með eða án broddstafa, styttingar leyfðar) → 1..12 eða null.
const MAN_STOFN = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
function manudNumer(txt) {
  const s = String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  if (s.length < 3) return null;
  const i = MAN_STOFN.indexOf(s.slice(0, 3));
  return i >= 0 ? i + 1 : null;
}

// Skoðunarmánuður einnar skýrslu → { man:'YYYY-MM', heimild, leidrett }. skodun_ar_man (staðlað) gengur fyrir, svo skráarnafnið
// í notes (aðeins úttektarskýrslur appsins bera mánuðinn), svo dagsetning skýrslunnar (brunakerfi/slökkvikerfi: doc_date ER skoðunardagur).
function skodunarManudur(skjal, tegund) {
  const dd = String(skjal.doc_date || '').slice(0, 10);
  const skyrslaMan = /^\d{4}-\d{2}/.test(dd) ? dd.slice(0, 7) : null;
  if (!skyrslaMan) return null;
  const rm = manTala(skyrslaMan);
  let y = null, m = null, heimild = 'skjaladags';
  const st = /^(20\d{2})-(\d{2})$/.exec(String(skjal.skodun_ar_man || '').trim());
  if (st && Number(st[2]) >= 1 && Number(st[2]) <= 12) { y = Number(st[1]); m = Number(st[2]); heimild = 'skodun_ar_man'; }
  else if (tegund === 'uttekt') {
    const f = / - (20\d{2}) - ([^ -]+) - [uú]ttektarsk[ýy]rsla/i.exec(String(skjal.notes || ''));
    const n = f ? manudNumer(f[2]) : null;
    if (f && n) { y = Number(f[1]); m = n; heimild = 'skjalanafn'; }
  }
  if (m == null) return { man: skyrslaMan, heimild: 'skjaladags', leidrett: false };
  // Raunhæft bil: skoðun er aldrei eftir skýrsludag og sjaldan eldri en ár. Annars ár skýrslunnar (eða árið á undan); gangi það
  // ekki heldur: dagsetning skýrslunnar (merkt leiðrétt), ekki giskað á fjarlægt ár.
  const iBili = (n) => n <= rm && n >= rm - 11;
  if (iBili(y * 12 + m - 1)) return { man: manUrTolu(y * 12 + m - 1), heimild, leidrett: false };
  const ry = Math.floor(rm / 12);
  if (iBili(ry * 12 + m - 1)) return { man: manUrTolu(ry * 12 + m - 1), heimild, leidrett: true };           // 2027-08 á skýrslu frá 2026 → 2026-08
  const fyrra = (ry - 1) * 12 + m - 1;                                                                        // áramót: skýrsla í jan, „desember“
  if (fyrra <= rm && fyrra >= rm - 6) return { man: manUrTolu(fyrra), heimild, leidrett: true };
  return { man: skyrslaMan, heimild: 'skjaladags', leidrett: true };
}

// Hvaða skýrsla á þessa sölu? → { man, mat:'skyrsla'|'oviss'|'an_skyrslu', leidrett } (mat „oviss“: skýrslurnar nefna ólíka mánuði).
function skodunarManudSolu(sala, skjol, nuMan) {
  const tegund = sala.vidskiptategund;
  const solud = dagTala(sala.created_at);
  const gl = GLUGGI[tegund] || GLUGGI.uttekt;
  const solMan = T.manudur(sala.created_at);
  const fraM = [];
  for (const s of skjol[SKYRSLA_TEGUND[tegund]] || []) {
    const d = dagTala(s.doc_date);
    if (d == null || solud == null || d < solud - gl[0] || d > solud + gl[1]) continue;
    // Sami kúnni: bæði með fyrirtaeki_id/customer_id → þau ráða (útibú með eigin skýrslu), annars customer_base_id.
    const sama = s.fyrirtaeki_id != null && sala.customer_id != null ? String(s.fyrirtaeki_id) === String(sala.customer_id)
      : s.customer_base_id != null && sala.customer_base_id != null && String(s.customer_base_id) === String(sala.customer_base_id);
    if (!sama) continue;
    const sm = skodunarManudur(s, tegund);
    if (sm) fraM.push({ ...sm, bil: Math.abs(d - solud), d });
  }
  if (!fraM.length) return { man: solMan, mat: 'an_skyrslu', leidrett: false };
  const ymsar = new Set(fraM.map((x) => x.man));
  const naest = fraM.slice().sort((a, b) => a.bil - b.bil || b.d - a.d)[0];
  const man = naest.man > nuMan ? nuMan : naest.man;
  return { man, mat: ymsar.size > 1 ? 'oviss' : 'skyrsla', leidrett: fraM.some((x) => x.leidrett) };
}

// Tæki úr sölulínu: „Yfirferð · …“, „Hleðsla · …“, „Nýtt · …“ (aðrar línur — akstur, skýrslugerð, varahlutir — eru ekki tæki).
const LINU_FLOKKUR = { 'yfirferd': 'yfirferd', 'hledsla': 'hledsla', 'nytt': 'nytt' };
function taekiUrLinu(l) {
  const d = String((l && l.desc) || '');
  const i = d.indexOf('·');
  if (i < 0) return null;
  const f = LINU_FLOKKUR[d.slice(0, i).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd')];
  if (!f) return null;
  const q = l.qty != null ? Number(l.qty) : 1;
  return Number.isFinite(q) && q !== 0 ? { f, n: q } : null;
}
// Tæki úr verklið verkstæðis: „Duft 2 kg. ABC hleðsla“ (1), „CO₂ 100 gr. × 26 (samtals)“ (26 hleðslur), „Duft 2 kg. ABC yfirferð“ (1).
function taekiUrVerklid(service) {
  const s = String(service || '');
  const m = /[×x]\s*(\d+)/.exec(s);
  const n = m ? Number(m[1]) : 1;
  if (!(n > 0)) return null;
  if (/hle[ðd]sl|[áa]fylling/i.test(s)) return { f: 'hledsla', n };
  if (/yfirfer/i.test(s)) return { f: 'yfirferd', n };
  if (/^\s*CO[₂2]\s*[\d,.]+\s*gr/i.test(s)) return { f: 'hledsla', n };       // CO₂-hylki: fyllt
  return null;
}

const tomMan = () => ({
  kr: { arsthjonusta: 0, brunakerfi: 0, slokkvikerfi: 0, verkstaedi: 0, verslun: 0 },
  taeki_skodanir: { yfirferd: 0, hledsla: 0, nytt: 0 },
  taeki_verkstaedi: { yfirferd: 0, hledsla: 0, nytt: 0 },
  mat: { an_skyrslu_kr: 0, an_skyrslu_fjoldi: 0, oviss_kr: 0, aaetlad_verk_kr: 0, aaetlad_taeki: 0, leidrett_fjoldi: 0, skyrslur_klaradar: 0, skyrslur_sidbuin: 0 },
});

// g = { solur, voidIds, skyrslur, verkbeidnir, verklidir } → { man:{'YYYY-MM': …}, annad:{ i_vinnslu_kr, fyrir_yfirtoku_kr, ostemmt_kr, ostemmt_fjoldi } }
function unnidManudir(g, nuIso) {
  const nuMan = T.manudur(nuIso);
  const gildar = T.slokkvitaekiGildar(g.solur, g.voidIds);
  const skjol = {};
  for (const s of g.skyrslur || []) {
    if (!s || s.is_duplicate === true) continue;
    (skjol[s.doc_type] = skjol[s.doc_type] || []).push(s);
  }
  // Skýrslur KLÁRAÐAR (Agnar: „skýrslur sendar“ telja eftir raunverulegum kláradegi í kerfinu, ekki skoðunarmánuði): fjöldi appskýrslna
  // eftir dagsetningu skýrslunnar; „síðbúnar“ = skoðunarmánuðurinn er á undan mánuðinum sem hún var kláruð í.
  const TEGUND_UR_SKJALI = { uttektarskyrsla: 'uttekt', brunakerfi: 'brunakerfi', slokkvikerfi: 'slokkvikerfi' };
  const klaradar = {};
  for (const tg of Object.keys(skjol)) {
    for (const sk of skjol[tg]) {
      const km = T.manudur(sk.doc_date);
      if (!km || km < T.SL_FRA || km > nuMan) continue;
      const k = (klaradar[km] = klaradar[km] || { n: 0, sidbuin: 0 });
      k.n++;
      const sm = skodunarManudur(sk, TEGUND_UR_SKJALI[tg]);
      if (sm && sm.man < km) k.sidbuin++;
    }
  }
  const vPerSolu = {}, taekiPerVerk = {};
  for (const v of g.verkbeidnir || []) {
    if (!v || v.eytt_at || !(V_KLAR.has(v.status) || V_OKLAR.has(v.status))) continue;      // 'eytt' og óþekkt staða teljast ekki
    const snum = String(v.num || '').replace(/-V\d+$/, '');
    (vPerSolu[snum] = vPerSolu[snum] || []).push(v);
  }
  // Verkliðir sem eru eyddir (status 'eytt' — eytt_at er sjaldan sett), ónýtir (status 'broken': kreditfært, ekki hlaðið) eða enn aðeins
  // mótteknir ('received') eru ekki unnin tæki. Rýni 22.11: án þessa taldist hleðsla verkstæðis ~15 % of há.
  const EKKI_UNNID = new Set(['eytt', 'broken', 'received']);
  for (const l of g.verklidir || []) {
    if (!l || l.eytt_at || EKKI_UNNID.has(String(l.status || '').toLowerCase())) continue;
    const t = taekiUrVerklid(l.service);
    if (t) (taekiPerVerk[l.job_id] = taekiPerVerk[l.job_id] || []).push(t);
  }

  const man = {};
  const annad = { i_vinnslu_kr: 0, fyrir_yfirtoku_kr: 0, ostemmt_kr: 0, ostemmt_fjoldi: 0 };
  const mm = (m) => (man[m] = man[m] || tomMan());
  const lagt = (m, fl, kr, mat) => {
    if (!kr) return;
    if (m < T.SL_FRA) { annad.fyrir_yfirtoku_kr += kr; return; }       // skoðun fyrir yfirtöku: utan mælingar, aldrei hent
    const x = mm(m);
    x.kr[fl] += kr;
    if (mat === 'an_skyrslu') { x.mat.an_skyrslu_kr += kr; }
    else if (mat === 'oviss') { x.mat.oviss_kr += kr; }
    else if (mat === 'aaetlad') { x.mat.aaetlad_verk_kr += kr; }
  };

  const frumsolur = {};           // id → { hlutar:[{man,fl,kr,mat}], skodMan, san }
  const reikna = (s) => {
    const san = Number(s.upphaed_an_vsk) || 0;
    const solMan = T.manudur(s.created_at);
    const skFl = SKODUN[s.vidskiptategund] || null;
    let sk = null;
    if (skFl) sk = skodunarManudSolu(s, skjol, nuMan);
    const grunnMan = sk ? sk.man : solMan, grunnFl = skFl || 'verslun', grunnMat = sk ? sk.mat : null;

    const vs = (vPerSolu[s.num] || []);
    const linuSumma = (Array.isArray(s.linur) ? s.linur : []).reduce((a, l) => a + (Number(l.qty != null ? l.qty : 1) || 0) * (Number(l.unit_price_ex_vat) || 0), 0);
    const kvardi = linuSumma > 0 ? Math.min(1, san / linuSumma) : 1;       // afsláttur sölunnar kvarðar V-hlutann
    const vHlutar = vs.map((v) => ({ v, kr: ((Number(v.verd) || 0) / VSK) * kvardi }));
    const vSumma = vHlutar.reduce((a, x) => a + x.kr, 0);
    const hlutar = [];
    let stemmir = vHlutar.length > 0 && vSumma <= san + 1 + 0.5 * vHlutar.length;
    if (vHlutar.length && !stemmir && san > 0) { annad.ostemmt_kr += san; annad.ostemmt_fjoldi += 1; }      // sala upp á 0 hefur ekkert til að stemma
    let afgangur = san;
    if (stemmir) {
      for (const x of vHlutar) {
        const kr = Math.min(x.kr, Math.max(afgangur, 0));
        afgangur -= kr;
        if (V_OKLAR.has(x.v.status)) { annad.i_vinnslu_kr += kr; hlutar.push({ man: null, fl: 'verkstaedi', kr, mat: 'i_vinnslu' }); continue; }
        const km = x.v.klart_at ? T.manudur(x.v.klart_at) : null;
        hlutar.push({ man: km || solMan, fl: 'verkstaedi', kr, mat: km ? 'unnid' : 'aaetlad' });
      }
    }
    hlutar.push({ man: grunnMan, fl: grunnFl, kr: afgangur, mat: grunnMat });
    return { hlutar, skodMan: sk ? sk.man : null, skFl, leidrett: !!(sk && sk.leidrett), san };
  };

  // 1) venjulegar sölur
  for (const s of gildar) {
    if (s.credit_of != null) continue;
    const r = frumsolur[s.id] = reikna(s);
    for (const h of r.hlutar) {
      if (h.mat === 'i_vinnslu') continue;
      const hm = h.man > nuMan ? nuMan : h.man;
      lagt(hm, h.fl, h.kr, h.mat);
      if (h.mat === 'an_skyrslu' && h.kr && hm >= T.SL_FRA) mm(hm).mat.an_skyrslu_fjoldi += 1;
    }
    if (r.leidrett && r.skodMan >= T.SL_FRA) mm(r.skodMan).mat.leidrett_fjoldi += 1;
    // tæki skoðana: línur sölunnar í skoðunarmánuðinum
    if (r.skFl && r.skodMan >= T.SL_FRA) {
      for (const l of Array.isArray(s.linur) ? s.linur : []) { const t = taekiUrLinu(l); if (t) mm(r.skodMan).taeki_skodanir[t.f] += t.n; }
    }
    // tæki verkstæðis: verkliðir kláraðra verkbeiðna í mánuði klart_at (annars söludagur, merkt áætlað)
    for (const v of vPerSolu[s.num] || []) {
      if (!V_KLAR.has(v.status)) continue;
      const km = v.klart_at ? T.manudur(v.klart_at) : T.manudur(s.created_at);
      if (km < T.SL_FRA) continue;
      for (const t of taekiPerVerk[v.id] || []) {
        mm(km > nuMan ? nuMan : km).taeki_verkstaedi[t.f] += t.n;
        if (!v.klart_at) mm(km > nuMan ? nuMan : km).mat.aaetlad_taeki += t.n;
      }
    }
  }
  // 2) kreditnótur: fylgja upprunasölunni (hlutfallslega), annars eigin degi
  const fjoldiOrg = (id) => (frumsolur[id] ? frumsolur[id] : null);
  for (const s of gildar) {
    if (s.credit_of == null) continue;
    const kr = Number(s.upphaed_an_vsk) || 0;
    const o = fjoldiOrg(s.credit_of);
    if (o && o.san) {
      const f = kr / o.san;
      for (const h of o.hlutar) { if (h.mat === 'i_vinnslu') { annad.i_vinnslu_kr += h.kr * f; continue; } lagt(h.man > nuMan ? nuMan : h.man, h.fl, h.kr * f, h.mat); }
      if (o.skFl && o.skodMan >= T.SL_FRA) {
        for (const l of Array.isArray(s.linur) ? s.linur : []) { const t = taekiUrLinu(l); if (t) mm(o.skodMan).taeki_skodanir[t.f] += t.n; }   // qty er neikvætt á kreditnótu
      }
    } else {
      lagt(T.manudur(s.created_at), SKODUN[s.vidskiptategund] || 'verslun', kr, null);
    }
  }
  for (const km of Object.keys(klaradar)) { mm(km).mat.skyrslur_klaradar = klaradar[km].n; mm(km).mat.skyrslur_sidbuin = klaradar[km].sidbuin; }
  return { man, annad };
}

// ── samantekt fyrir svarið: aðeins samtölur, engin nöfn ──────────────────────────────────────────────────────────────────
const afr = (n) => T.kr(n);
function manudSamantekt(x) {
  if (!x) x = tomMan();
  const sk = afr(x.kr.arsthjonusta) + afr(x.kr.brunakerfi) + afr(x.kr.slokkvikerfi);
  const t = (a, b) => ({ yfirferd: a.yfirferd + b.yfirferd, hledsla: a.hledsla + b.hledsla, nytt: a.nytt + b.nytt });
  return {
    skodanir: {
      kr: sk, arsthjonusta_kr: afr(x.kr.arsthjonusta), brunakerfi_kr: afr(x.kr.brunakerfi), slokkvikerfi_kr: afr(x.kr.slokkvikerfi),
      an_skyrslu_kr: afr(x.mat.an_skyrslu_kr), an_skyrslu_fjoldi: x.mat.an_skyrslu_fjoldi, oviss_kr: afr(x.mat.oviss_kr), leidrett_fjoldi: x.mat.leidrett_fjoldi,
      skyrslur_klaradar: x.mat.skyrslur_klaradar, skyrslur_sidbuin: x.mat.skyrslur_sidbuin,
      taeki: { ...x.taeki_skodanir },
    },
    verkstaedi: { kr: afr(x.kr.verkstaedi), aaetlad_kr: afr(x.mat.aaetlad_verk_kr), aaetlad_taeki: x.mat.aaetlad_taeki, taeki: { ...x.taeki_verkstaedi } },
    verslun: { kr: afr(x.kr.verslun) },
    samtals: { kr: sk + afr(x.kr.verkstaedi) + afr(x.kr.verslun), taeki: t(x.taeki_skodanir, x.taeki_verkstaedi) },
  };
}
// Mánuður til dags, síðasti mánuður og ár til dags (frá yfirtöku) — sömu mörk og T.tolur.
function unnidTolur(res, nuIso) {
  const m = T.manudur(nuIso), fm = T.fyrriMan(m), ar = m.slice(0, 4);
  const arFra = T.SL_FRA > ar + '-01' ? T.SL_FRA : ar + '-01';
  let arKr = 0;
  for (const k of Object.keys(res.man)) if (k >= arFra && k <= m) { const s = manudSamantekt(res.man[k]); arKr += s.samtals.kr; }
  return {
    manudur: m, fyrri_man: fm, ar_fra: arFra,
    manudur_til_dags: manudSamantekt(res.man[m]),
    fyrri_manudur: fm < T.SL_FRA ? null : manudSamantekt(res.man[fm]),
    ar_til_dags_kr: arKr,
    i_vinnslu_kr: afr(res.annad.i_vinnslu_kr), fyrir_yfirtoku_kr: afr(res.annad.fyrir_yfirtoku_kr),
    ostemmt_kr: afr(res.annad.ostemmt_kr), ostemmt_fjoldi: res.annad.ostemmt_fjoldi,
  };
}

module.exports = { FLOKKAR, SKODUN, GLUGGI, manudNumer, skodunarManudur, skodunarManudSolu, taekiUrLinu, taekiUrVerklid, unnidManudir, manudSamantekt, unnidTolur };
