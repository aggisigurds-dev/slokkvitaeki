// _skyrsla-solu.cjs — EIN HEIMILD: hvaða úttektarskýrsla fylgir sölu, og stemmir hún við söluna (17.11.2026).
//
// Agnar 17.11.2026: „Mátt reyna laga þetta svo það sé ekki alltaf vesen.“ Tveir reikningar endurgerðir á nýja kennitölu
// fóru (eða áttu að fara) með gömlu skýrslunni — gamalt nafn, gömul kt. Áður réð FYRSTA skýrsla ársins, eða slóð sem
// vafrinn hafði geymt þegar sendiglugginn opnaðist. Nú ræður SALAN á sendistund: kennitala, nafn, staður, ár og tæki.
//
// Hverjir nota þetta (allir sama fallið, engin sérlausn):
//   • netlify/functions/payday-push.cjs — velur skýrsluna sem fylgir kröfunni og stöðvar sendingu sem stemmir ekki
//     (líka `skyrsla_athugun` — sendiskjárinn og breytingaleiðirnar spyrja þar, ekkert fer til Payday);
//   • tools/audit-skyrsla-solu.cjs — gagnavörður öryggisnetsins: ósend sala með skýrslu sem stemmir ekki → RAUTT;
//   • js/patches/516-skyrsla-solu.js — vafrinn spyr payday-push (athugun) eftir hverja breytingu á sölu.
//
// Hrein föll (engin netköll) svo prófin geti keyrt þau beint. Gögnin sækir kallandinn.

'use strict';

const ktTolur = (x) => String(x || '').replace(/\D/g, '');
const ktBil = (d) => { d = ktTolur(d); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; };
// Brunakerfis-/slökkvikerfisskýrsla er aldrei slökkvitækjaskýrsla úttektarreiknings, hvað sem kind segir (05.10.2026).
const annadKerfi = (a) => /brunakerfi|brunavi[ðd]v[öo]run|sl[öo]kkvikerfi/i.test(String((a && a.name) || ''));

// Skráarnafn 168: „Nafn - Heimilisfang - 000000-0000 - Ár - mánuður - úttektarskýrsla - #<staður>.pdf"
// Eldra snið: „Nafn - 000000-0000 - Ár - úttektarskýrsla.pdf". Handhlaðin skjöl bera stundum hvorugt (þá „óvíst").
function lysa(nafn) {
  const n = String(nafn || '').replace(/\.pdf$/i, '');
  const kt = /(\d{6})-(\d{4})/.exec(n);
  const st = /#(\d+)\s*$/.exec(n);
  const ar = /\b(20[2-3]\d)\b/.exec(n);
  const hlutar = n.split(' - ');
  // Nafnið er aðeins lesið úr skipulögðu nafni (með kt) — „1784…_Heimaleiga_-_Hamraborg…" er ekki nafn fyrirtækis.
  const fNafn = kt && hlutar.length >= 3 ? hlutar[0].trim() : '';
  return { kt: kt ? kt[1] + kt[2] : '', stadur: st ? +st[1] : null, ar: ar ? ar[1] : '', nafn: fNafn };
}

// Nafnasamanburður: hástafir, greinarmerki og félagaform (ehf., hf., sf., húsfélag …) skipta ekki máli.
const FORM = /\b(ehf|hf|sf|slf|ses|ohf|bs|svf|húsfélag|husfelag|félag)\b/g;
function nafnNorm(x) {
  return String(x || '').toLowerCase().replace(/[.,;:()\-–—_/"„“'´`]/g, ' ').replace(FORM, ' ').replace(/\s+/g, ' ').trim();
}
function nafnStemmir(a, b) {
  const x = nafnNorm(a), y = nafnNorm(b);
  if (!x || !y) return null;                       // óvíst
  if (x === y) return true;
  const st = x.length <= y.length ? x : y, la = st === x ? y : x;
  return st.length >= 4 && la.indexOf(st) >= 0;    // „galtarlind" ⊂ „galtarlind 13 15"
}

// Tæki á sölu: línur sem eru þjónusta við tæki („Yfirferð · …", „Hleðsla · …", „Nýtt · …", eða gamla sniðið
// „Léttvatnstæki 6L. yfirferð"). Akstur, Skýrslugerð, merki og skilti eru ekki tæki. null = ekki hægt að telja.
const TAEKI_FORSKEYTI = /^(Yfirferð|Hleðsla|Nýtt|Óyfirfarið|Ónýtt)\s*·/i;
// (Engin \b við íslenska stafi: „ð" er ekki \w í JS-reglusegðum, svo \b á eftir „yfirferð" brást.)
const TAEKI_GAMALT = /(tæki|slanga|kútur|kútar|co2|co₂|duft|léttvatn|froðu|vatns)[^·]*(yfirferð|yfirferd|hleðsla)/i;
function taekiISolu(linur) {
  if (!Array.isArray(linur)) return null;
  let n = 0, fannst = false;
  for (const l of linur) {
    const d = String((l && (l.desc || l.nafn)) || '');
    if (TAEKI_FORSKEYTI.test(d) || TAEKI_GAMALT.test(d)) { n += Math.max(0, parseInt(l.qty != null ? l.qty : l.magn, 10) || 0); fannst = true; }
  }
  return fannst ? n : null;
}

const nyjast = (a, b) => String((b && b.uploaded_at) || '').localeCompare(String((a && a.uploaded_at) || ''));
const arSolu = (sale) => String(new Date((sale && sale.created_at) || Date.now()).getFullYear());

// Hvaða viðhengi fylgir? Skýrsla sem ber kt SÖLUNNAR (eða staðarins) gengur fyrir, svo nýjasta; skýrsla merkt
// „leyst af hólmi" (leyst_af, 168/111) fylgir aldrei. Ár sölunnar fyrst; annars nýjasta skýrsla yfirleitt (bera() flaggar árið).
function velja(sale, vidhengi, site) {
  const list = (Array.isArray(vidhengi) ? vidhengi : []).filter((a) => a && a.kind === 'skyrsla' && !annadKerfi(a) && !a.leyst_af);
  const ar = arSolu(sale);
  const ktir = [ktTolur(sale && sale.customer_kt), ktTolur(site && site.kennitala)].filter((k) => k.length === 10);
  const rettKt = (a) => ktir.indexOf(lysa(a.name).kt) >= 0;
  const rod = list.slice().sort(nyjast);
  const iAr = rod.filter((a) => String(a.year || lysa(a.name).ar || '') === ar);
  return iAr.find(rettKt) || iAr[0] || rod.find(rettKt) || rod[0] || null;
}

// Ber skýrsluna saman við söluna. Skilar { stemmir, stodvar, misraemi[], lysing }.
//   stodvar  — kt, nafn eða staður stemma ekki: krafan má ekki fara með þessa skýrslu (payday-push 409).
//   viðvörun — ár, tæki eða viðbót (skýrslan eldri en viðbótarsalan): sýnt á sendiskjá og í verði.
// ctx: { site (fyrirtaeki-staðurinn), base (customers_base greiðandinn), facts (arsskodun_report_facts ársins), vidbot (bool) }
function bera(sale, sk, ctx) {
  ctx = ctx || {};
  const site = ctx.site || null, base = ctx.base || null, facts = ctx.facts || null;
  const L = lysa(sk && (sk.name || sk.notes));
  const lysing = {
    nafn: (sk && (sk.name || sk.notes)) || '', kt: L.kt ? ktBil(L.kt) : '', fyrirtaeki: L.nafn, stadur: L.stadur,
    ar: String((sk && sk.year) || L.ar || ''), dags: String((sk && (sk.uploaded_at || sk.doc_date)) || '').slice(0, 10),
    taeki: null, uppruni: (sk && sk.uppruni) || (sk && sk.storage_path && !sk.path ? 'skjal' : 'vidhengi'),
  };
  const mis = [];
  if (!sk) return { stemmir: false, stodvar: false, misraemi: [{ svid: 'engin', stodvar: false, texti: 'Engin úttektarskýrsla fannst fyrir söluna.' }], lysing: null };
  // 1) Kennitala: kt skýrslunnar verður að vera kt sölunnar — eða kt staðarins þegar annar greiðir (rekstrarfélag/eigandi).
  const ktS = ktTolur(sale && sale.customer_kt), ktSt = ktTolur(site && site.kennitala);
  if (L.kt && (ktS.length === 10 || ktSt.length === 10) && L.kt !== ktS && L.kt !== ktSt) {
    mis.push({ svid: 'kt', stodvar: true, skyrsla: ktBil(L.kt), sala: ktBil(ktS || ktSt),
      texti: 'Skýrslan er á kennitölu ' + ktBil(L.kt) + ', en salan er á ' + ktBil(ktS || ktSt) + '.' });
  }
  // 2) Nafn: nafnið á skýrslunni verður að vera nafn sölunnar, staðarins eða greiðandans (aðeins dæmt þegar það sést).
  if (L.nafn) {
    const v = [sale && sale.customer_nafn, site && site.nafn, base && base.nafn].map((n) => nafnStemmir(L.nafn, n));
    if (v.some((x) => x === false) && !v.some((x) => x === true)) {
      mis.push({ svid: 'nafn', stodvar: true, skyrsla: L.nafn, sala: (sale && sale.customer_nafn) || (site && site.nafn) || '',
        texti: 'Skýrslan er á nafninu „' + L.nafn + '", en salan er á „' + ((sale && sale.customer_nafn) || (site && site.nafn) || '') + '".' });
    }
  }
  // 3) Staður: #<staður> í nafni skýrslunnar verður að vera staður sölunnar.
  if (L.stadur != null && sale && sale.customer_id != null && +L.stadur !== +sale.customer_id) {
    mis.push({ svid: 'stadur', stodvar: true, skyrsla: '#' + L.stadur, sala: '#' + sale.customer_id,
      texti: 'Skýrslan er um stað #' + L.stadur + ', en salan um stað #' + sale.customer_id + '.' });
  }
  // 4) Ár: skýrsla annars árs en sölunnar.
  if (lysing.ar && lysing.ar !== arSolu(sale)) {
    mis.push({ svid: 'ar', stodvar: false, skyrsla: lysing.ar, sala: arSolu(sale),
      texti: 'Skýrslan er frá ' + lysing.ar + ', en salan frá ' + arSolu(sale) + '.' });
  }
  // 5) Viðbót (488): viðbótarsala fer aðeins með skýrslu sem varð til EFTIR söluna (tímastimpill slóðarinnar).
  if (ctx.vidbot) {
    const ts = /\/(\d{10,13})_[^/]*$/.exec(String((sk && (sk.path || sk.storage_path)) || ''));
    if (!ts || +ts[1] < Date.parse(sale.created_at) - 120000) {
      mis.push({ svid: 'vidbot', stodvar: false, texti: 'Viðbótarreikningur: skýrslan er eldri en viðbótin — ný skýrsla með öllum tækjum þarf að vera vistuð.' });
    }
  }
  // 6) Tæki: aðeins dæmt þegar tölur skýrslunnar (facts) eru úr ÞESSARI skýrslu (lesnar eftir að hún var vistuð).
  const tS = taekiISolu(sale && sale.linur);
  if (facts && facts.total_devices != null && String(facts.report_year || '') === lysing.ar) {
    const ferskt = !lysing.dags || !facts.parsed_at || Date.parse(facts.parsed_at) >= Date.parse((sk && sk.uploaded_at) || 0) - 600000;
    if (ferskt) {
      lysing.taeki = +facts.total_devices;
      if (tS != null && tS > +facts.total_devices) {
        mis.push({ svid: 'taeki', stodvar: false, skyrsla: +facts.total_devices, sala: tS,
          texti: 'Salan er með ' + tS + ' tæki en skýrslan ' + facts.total_devices + ' — tækjum var bætt við eftir að skýrslan var gerð.' });
      }
    }
  }
  return { stemmir: mis.length === 0, stodvar: mis.some((m) => m.stodvar), misraemi: mis, lysing };
}

// Skilaboð til þess sem sendir — eitt snið fyrir payday-push, sendiskjá og vörð.
function skilabod(r) {
  if (!r || r.stemmir) return '';
  return r.misraemi.map((m) => m.texti).join(' ') +
    (r.stodvar ? ' Búðu til nýja úttektarskýrslu á staðnum („Búa til úttektarskýrslu") — hún fær nafn og kennitölu sölunnar og fylgir þá kröfunni sjálfkrafa. Eða sendu kröfuna án skýrslu.' : '');
}

module.exports = { lysa, velja, bera, skilabod, taekiISolu, nafnStemmir, nafnNorm, ktTolur, ktBil, annadKerfi };
