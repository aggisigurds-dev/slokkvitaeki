#!/usr/bin/env node
/*
 * reikningur-lokaathugun.cjs — LOKAATHUGUN reiknings áður en nokkuð er sagt tilbúið.  17.11.2026
 *
 * Agnar 17.11.2026: „geturðu sett gott verkferli upp í agentinn sem býr til reikninga úr Claude". Tilefnið: 16.11 var
 * reikningur kreditfærður og endurgerður á nýrri kennitölu. Salan varð rétt, en úttektarskýrslan og reiknings-PDF-ið sem
 * fylgdu voru áfram þau gömlu (gömul kt, gamalt nafn). Enginn bar afleiddu skjölin saman við söluna áður en verkið var
 * sagt búið; Agnar fann það sjálfur, tvisvar. Þetta tól ber þau saman svo lokaathugunin ráðist ekki af minni agentsins.
 *
 * Verkferlið sem notar það: .claude/agents/sala-reikningar.md → „Verkferli reikninga". Ekkert verk þar er búið fyrr en
 * þetta tól skilar 0 og taflan sem það prentar er í skilunum til Agnars.
 *
 * DÓMARNIR eru ekki skrifaðir hér (ein regla, mörg not):
 *   • úttektarskýrslan  — netlify/functions/_skyrsla-solu.cjs (velja + bera), sama og payday-push og sendiglugginn;
 *   • reiknings-PDF-ið  — netlify/functions/_reikningur-solu.cjs (517: velja + bera + kreditMap), sama og appið.
 * Hér bætist aðeins við: innihald PDF-skjalanna sjálfra (pdftotext, ef til er), samtala og verðlisti, vartala kennitölu,
 * parið á fyrirtækjaspjaldinu (document_pairs), eldri skjöl og forskoðun sendigluggans (v_krofu_forskodun).
 *
 * Keyrsla:  node tools/reikningur-lokaathugun.cjs R-001307          tafla + niðurstaða
 *           node tools/reikningur-lokaathugun.cjs R-001307 --json   sama sem JSON (fyrir agenta)
 *           node tools/reikningur-lokaathugun.cjs R-001307 --send   reikningurinn er þegar sendur (athugun eftir sendingu)
 * Útgangskóði: 0 = stemmir · 1 = stemmir ekki (verkið er EKKI búið) · 2 = ódæmt (gögn lásust ekki eða regla vantar).
 *
 * AÐEINS LESTUR: REST-lestur með publishable-lyklinum (sami og audit-skyrsla-solu), niðurhal PDF úr opinberu geymslunni og
 * GET á forsíðu appsins (er 517 í loftinu?). Ekkert skrifað, ekkert sent. Úttakið sýnir kt og nöfn — það er tilgangurinn —
 * og á því aldrei heima í CI-loggi, commit-skilaboðum eða skrám í repóinu.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROT = path.join(__dirname, '..');
const SS = require(path.join(ROT, 'netlify', 'functions', '_skyrsla-solu.cjs'));
function lesaRS() {
  for (const f of [path.join(ROT, 'netlify', 'functions', '_reikningur-solu.cjs'), path.join(ROT, 'js', 'patches', '517-reikningur-solu.js')]) {
    if (fs.existsSync(f)) { try { const m = require(f); if (m && m.velja && m.bera && m.kreditMap) return m; } catch (_) {} }
  }
  return null;
}

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const APP = 'https://slokkvitaeki.netlify.app';
const SELJANDI_KT = '6005080400';           // kt. seljandans sjálfs (haus reiknings og skýrslu) — ekki kúnni
const SVD_KODI = { akstur: 3600, skyrslugerd: 4600 };  // sama sjálfgildi og _gatt-serkjor.cjs / 165 / 410

// ── hrein föll ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ktT = (k) => String(k == null ? '' : k).replace(/\D/g, '');
const ktB = (k) => { const t = ktT(k); return t.length === 10 ? t.slice(0, 6) + '-' + t.slice(6) : String(k || '—'); };
const kr = (n) => (n == null || n === '' || !Number.isFinite(Number(n))) ? '—' : Math.round(Number(n)).toLocaleString('de-DE') + ' kr';

// Vartala kennitölu (sama vægi og 17/142/369 í vafranum).
function ktGild(k) {
  const t = ktT(k);
  if (t.length !== 10) return false;
  const v = [3, 2, 7, 6, 5, 4, 3, 2];
  const s = v.reduce((a, w, i) => a + w * Number(t[i]), 0);
  let c = 11 - (s % 11);
  if (c === 11) c = 0;
  if (c === 10) return false;
  return c === Number(t[8]);
}

// Samtala sölu reiknuð úr línum: nettó lína = qty·unit·(1−disc/100); afsláttur sölunnar (solur.afslattur) er MEÐ vsk.
// Mælt 17.11.2026 á 359 sölum frá 01.09: upphaed_an_vsk = Σnettó − afsláttur/1,24 og samtals = round(Σnettó·(1+vsk)) − afsláttur (±2 kr).
function samtala(sale) {
  const L = Array.isArray(sale && sale.linur) ? sale.linur : [];
  let net = 0, brutto = 0;
  for (const l of L) {
    const n = Number(l.qty || 0) * Number(l.unit_price_ex_vat || 0) * (1 - Number(l.discount_pct || 0) / 100);
    net += n; brutto += n * (1 + Number(l.vsk_pct == null ? 24 : l.vsk_pct) / 100);
  }
  const af = Number((sale && sale.afslattur) || 0);
  return { net, an_vsk: net - af / 1.24, samtals: Math.round(brutto) - af };
}

// Verðlisti: Akstur og Skýrslugerð úr app_settings.slokk_visit_defaults (ofan á kóðasjálfgildi), annað úr vorur eftir nafni.
function listaverd(l, svd, vorurByNafn) {
  const desc = String((l && l.desc) || '').trim();
  const heiti = desc.includes(' · ') ? desc.split(' · ').slice(1).join(' · ').trim() : desc;
  const s = svd || {};
  if (/^akstur$/i.test(heiti)) return { heiti, verd: s.akstur != null ? Number(s.akstur) : SVD_KODI.akstur, uppruni: 'verðskrá (Akstur)' };
  if (/^skýrslugerð$/i.test(heiti)) return { heiti, verd: s.skyrslugerd != null ? Number(s.skyrslugerd) : SVD_KODI.skyrslugerd, uppruni: 'verðskrá (Skýrslugerð)' };
  const v = vorurByNafn && vorurByNafn.get(heiti.toLowerCase());
  return v ? { heiti, verd: Math.round(Number(v.verd_an_vsk)), uppruni: 'vorur #' + v.id } : { heiti, verd: null, uppruni: null };
}

// Reiknings-PDF (texti úr pdftotext -raw): R-númer, kennitala kúnna (ekki seljandans), „Til greiðslu".
function lesaReikningsTexta(t) {
  if (!t) return null;
  const rnum = (t.match(/Reikningur\s+(R-\d{6})/) || [])[1] || '';
  const kts = [...t.matchAll(/\bkt\.?:?\s*(\d{6}-?\d{4})/gi)].map((m) => ktT(m[1])).filter((k) => k !== SELJANDI_KT);
  const tg = t.match(/Til greiðslu\s*:?\s*(-?[\d.]+)\s*kr/i);
  return { rnum, kts: [...new Set(kts)], til_greidslu: tg ? Number(tg[1].replace(/\./g, '')) : null, texti: t };
}
// Úttektarskýrsla: kt kúnna, tækjafjöldi (Σ „Fjöldi: N"), handskrifaði hlutinn (Annað + Athugasemdir) og undirritun.
function lesaSkyrsluTexta(t) {
  if (!t) return null;
  const kts = [...t.matchAll(/\bkt\.?:?\s*(\d{6}-?\d{4})/gi)].map((m) => ktT(m[1])).filter((k) => k !== SELJANDI_KT);
  const taeki = [...t.matchAll(/Fjöldi:\s*(\d+)/g)].reduce((a, m) => a + Number(m[1]), 0);
  const hand = (t.split(/\n\s*Annað:\s*\n/)[1] || '').split(/\n\s*Fyrir hönd\b/)[0];
  const undir = (t.split(/\n\s*Fyrir hönd[^\n]*\n/)[1] || '').trim();
  return { kts: [...new Set(kts)], taeki, hand: hand.trim(), undirritun: undir, texti: t };
}
const linur = (s) => String(s || '').split(/\n+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x && !/^Athugasemdir:?$/i.test(x));
const innihelt = (texti, nafn) => { const a = SS.nafnNorm(texti), b = SS.nafnNorm(nafn); return !!b && a.includes(b); };

// DÓMURINN. g = öll gögn (sjá saekja). Skilar { rodur, villur, vidvaranir, odaemt, stemmir }.
function daema(g) {
  const V = [], W = [], O = [];
  const s = g.sale;
  const villa = (hlutur, t) => V.push(hlutur + ': ' + t), vid = (hlutur, t) => W.push(hlutur + ': ' + t), odaemt = (hlutur, t) => O.push(hlutur + ': ' + t);
  const erUttekt = /^(uttekt|vinnublad)$/.test(String(s.source || ''));
  const rodur = [];

  // 1. GREIÐANDI — kt + nafn úr fyrirtækjaskrá, vartala, rekstrarfélag/staður.
  const b = g.base, site = g.site;
  if (!ktGild(s.customer_kt)) villa('Greiðandi', 'kennitala sölunnar ' + ktB(s.customer_kt) + ' stenst ekki vartölu');
  if (!b) villa('Greiðandi', 'customer_base_id vantar eða finnst ekki — payday-push stöðvar (422) og netfang/heimilisfang yrði ágiskun');
  else {
    if (ktT(b.kennitala) !== ktT(s.customer_kt)) villa('Greiðandi', 'kt sölunnar ' + ktB(s.customer_kt) + ' ≠ kt greiðandans í skránni ' + ktB(b.kennitala) + ' (customer_base_id ' + b.id + ') — Payday tæki netfang og heimilisfang annars greiðanda');
    if (b.nafn && s.customer_nafn && !SS.nafnStemmir(b.nafn, s.customer_nafn)) {
      // Nafn sölunnar = nafn STAÐARINS en kt greiðandans (rekstrarnafn / staður á kt annars félags, mælt 17.11.2026 á R-001286): viðvörun.
      if (site && site.nafn && SS.nafnStemmir(site.nafn, s.customer_nafn)) vid('Greiðandi', 'salan ber nafn staðarins „' + s.customer_nafn + '" en kt greiðandans „' + b.nafn + '" — staðfestu hvaða nafn á að standa á reikningnum');
      else villa('Greiðandi', 'nafn sölunnar „' + s.customer_nafn + '" ≠ nafn greiðandans „' + b.nafn + '"');
    }
  }
  if (site && ktT(site.kennitala) && ktT(site.kennitala) !== ktT(s.customer_kt)) {
    vid('Greiðandi', 'staðurinn #' + site.id + ' ber kt ' + ktB(site.kennitala) + ' en salan ' + ktB(s.customer_kt) + ' — annar greiðandi en staðurinn' + (b && b.rekstrarfelag ? ' (rekstrarfélag)' : '') + '; staðfestu greiðanda per stað í kúnnaminni');
  }
  if (g.kunni && g.kunni.length) vid('Greiðandi', g.kunni.length + ' færsla/ur í kúnnaminni á þessa kt (charlize_knowledge ' + g.kunni.slice(0, 6).map((k) => '#' + k.id).join(', ') + ') — lestu þær áður en sagt er tilbúið');

  // 2. SALAN — staða, línur, verð úr verðlista, afsláttur á einn veg, samtala.
  if (s.is_credit) odaemt('Sala', 'þetta er kreditnóta — keyrðu lokaathugunina á gildandi reikningnum (endurgerða)');
  if (s.status !== 'final') villa('Sala', 'staðan er „' + s.status + '", ekki final (drög eru ekki reikningur)');
  if (g.kredit && g.kredit[s.num]) villa('Sala', s.num + ' er kreditfærður með ' + g.kredit[s.num] + ' — hann er EKKI gildandi reikningur');
  const L = Array.isArray(s.linur) ? s.linur : [];
  if (!L.length) villa('Sala', 'engar línur');
  const linuAfsl = L.some((l) => Number(l.discount_pct || 0) > 0), afsl = Number(s.afslattur || 0) > 0;
  if (linuAfsl && afsl) villa('Sala', 'afsláttur á TVO vegu (línu-% og afslattur ' + kr(s.afslattur) + ') — aðeins einn má gilda');
  const st = samtala(s);
  if (Math.abs(st.an_vsk - Number(s.upphaed_an_vsk)) > 2) villa('Sala', 'upphæð án vsk ' + kr(s.upphaed_an_vsk) + ' ≠ línurnar ' + kr(st.an_vsk));
  if (Math.abs(st.samtals - Number(s.samtals)) > 2) villa('Sala', 'samtala ' + kr(s.samtals) + ' ≠ línurnar ' + kr(st.samtals));
  if (Math.abs(Number(s.upphaed_an_vsk) + Number(s.vsk_upphaed) - Number(s.samtals)) > 1) villa('Sala', 'án vsk + vsk ≠ samtala');
  const verdvillur = [];
  for (const l of L) {
    const lv = listaverd(l, g.svd, g.vorurByNafn);
    if (lv.verd == null) { vid('Sala', 'línan „' + lv.heiti + '" finnst ekki í verðlista (vorur) — verð ' + kr(l.unit_price_ex_vat) + ' óstaðfest'); continue; }
    if (Math.abs(Number(l.unit_price_ex_vat) - lv.verd) > 1) verdvillur.push('„' + lv.heiti + '" ' + kr(l.unit_price_ex_vat) + ' en ' + lv.uppruni + ' ' + kr(lv.verd));
  }
  if (verdvillur.length) villa('Sala', 'verð ekki úr verðlista: ' + verdvillur.join('; ') + ' — nema samið hafi verið um annað (þá: skráðu heimildina í skilin)');
  rodur.push({ hlutur: 'Sala ' + s.num, kt: ktB(s.customer_kt), nafn: s.customer_nafn || '—', upphaed: kr(s.samtals), hlid: 'Sala' });

  // 3. REIKNINGS-PDF — það sem opnast á sölunni (517) + innihald skjalsins + parið á fyrirtækjaspjaldinu.
  const RS = g.rs;
  let pdfRod = { hlutur: 'Reiknings-PDF', kt: '—', nafn: '—', upphaed: '—', hlid: 'Reiknings-PDF' };
  if (!RS) odaemt('Reiknings-PDF', 'reglan um reiknings-PDF (_reikningur-solu.cjs / 517) er ekki á þessari grein — ekki hægt að dæma');
  else {
    const pdf = RS.velja(s, g.vidhengi || [], g.skjolReikn || []);
    const dom = RS.bera(s, pdf, { kredit: (g.kredit || {})[s.num] || null, skjal: pdf && pdf.skjal });
    if (!pdf) (erUttekt ? villa : vid)('Reiknings-PDF', 'ekkert PDF-afrit af ' + s.num + ' er vistað' + (erUttekt ? ' (úttektarsala á alltaf að eiga afrit, 233)' : ''));
    else {
      pdfRod = Object.assign(pdfRod, { hlutur: 'Reiknings-PDF ' + (dom.lysing && dom.lysing.rnum || s.num), kt: ktB(dom.lysing && dom.lysing.kt), nafn: (dom.lysing && dom.lysing.nafn) || '—',
        upphaed: kr(pdf.skjal && pdf.skjal.amount) });
      for (const m of dom.misraemi) (m.stodvar ? villa : vid)('Reiknings-PDF', m.texti);
      const P = g.pdfTexti ? lesaReikningsTexta(g.pdfTexti) : null;
      if (!P) vid('Reiknings-PDF', 'innihald PDF-sins ólesið (' + (g.pdfLesturVilla || 'pdftotext vantar') + ') — dæmt eftir skráarnafni og skjalaröð');
      else {
        if (P.rnum !== s.num) villa('Reiknings-PDF', 'PDF-ið segir „Reikningur ' + (P.rnum || '?') + '", ekki ' + s.num);
        if (!(P.kts.length === 1 && P.kts[0] === ktT(s.customer_kt))) villa('Reiknings-PDF', 'kennitala í PDF-inu ' + (P.kts.map(ktB).join(', ') || '(engin)') + ' ≠ sölunnar ' + ktB(s.customer_kt));
        if (s.customer_nafn && !innihelt(P.texti, s.customer_nafn)) villa('Reiknings-PDF', 'nafn sölunnar „' + s.customer_nafn + '" stendur ekki í PDF-inu');
        if (P.til_greidslu == null || Math.abs(P.til_greidslu - Number(s.samtals)) > 2) villa('Reiknings-PDF', '„Til greiðslu" í PDF-inu ' + kr(P.til_greidslu) + ' ≠ sölunnar ' + kr(s.samtals));
        pdfRod = Object.assign(pdfRod, { kt: P.kts.map(ktB).join(', ') || '—', nafn: innihelt(P.texti, s.customer_nafn) ? s.customer_nafn : pdfRod.nafn, upphaed: kr(P.til_greidslu) });
      }
    }
    // Parið ársins á fyrirtækjaspjaldinu (199, document_pairs): bendi það á KREDITFÆRÐAN reikning opnast hann sem „reikningur ársins".
    const par = g.par, parNum = par && par.invoice_number;
    if (parNum && parNum !== s.num) {
      const kf = (g.kredit || {})[parNum];
      if (kf && g.live517 === true) vid('Reiknings-PDF', 'parið ársins (document_pairs #' + par.id + ') bendir enn á ' + parNum + ' (kreditfærður með ' + kf + ') — appið (517) sýnir hann yfirstrikaðan og hann víkur úr valinu');
      else if (kf) villa('Reiknings-PDF', 'á fyrirtækjaspjaldinu opnast ' + parNum + ' (kreditfærður með ' + kf + ') sem reikningur ársins (document_pairs #' + par.id + ')' + (g.live517 === false ? ' — reglan 517 er ekki í loftinu' : ' — óvíst hvort 517 er í loftinu'));
      else vid('Reiknings-PDF', 'parið ársins bendir á ' + parNum + ' (annar reikningur ársins, t.d. aðalreikningur á undan viðbót) — staðfestu');
    }
  }
  rodur.push(pdfRod);

  // 4. ÚTTEKTARSKÝRSLAN — sama val og dómur og payday-push (_skyrsla-solu.cjs) + innihald + handskrifaður texti.
  let skRod = null;
  const vilEkki = site && site.skyrsla_med_krofu === false;
  if (erUttekt && !vilEkki && s.customer_id) {
    const sk = SS.velja(s, g.vidhengi || [], site, g.skjalSkyrsla || null);
    const r = SS.bera(s, sk, { site, base: b, facts: g.facts, vidbot: !!g.vidbot });
    skRod = { hlutur: 'Úttektarskýrsla', kt: (r.lysing && r.lysing.kt) || '—', nafn: (r.lysing && r.lysing.fyrirtaeki) || '—', upphaed: '—', hlid: 'Úttektarskýrsla' };
    if (!sk) villa('Úttektarskýrsla', 'engin úttektarskýrsla finnst á staðnum fyrir árið — krafan færi án skýrslu');
    for (const m of r.misraemi) {
      if (m.svid === 'engin') continue;
      const t = m.texti || (m.svid === 'taeki' ? 'salan er með ' + m.sala + ' tæki en skýrslan ' + m.skyrsla : m.svid);
      (m.stodvar || m.svid === 'taeki' ? villa : vid)('Úttektarskýrsla', t);
    }
    const ts = SS.taekiISolu(s.linur);
    const Q = g.skTexti ? lesaSkyrsluTexta(g.skTexti) : null;
    if (sk && !Q) vid('Úttektarskýrsla', 'innihald skýrslunnar ólesið (' + (g.skLesturVilla || 'pdftotext vantar') + ') — dæmt eftir skráarnafni');
    if (Q) {
      if (!(Q.kts.length === 1 && Q.kts[0] === ktT(s.customer_kt)) && !(site && Q.kts.length === 1 && Q.kts[0] === ktT(site.kennitala))) villa('Úttektarskýrsla', 'kennitala í skýrslunni ' + (Q.kts.map(ktB).join(', ') || '(engin)') + ' er hvorki sölunnar né staðarins');
      const nafnOk = innihelt(Q.texti, s.customer_nafn) || (site && innihelt(Q.texti, site.nafn));
      if (!nafnOk) villa('Úttektarskýrsla', 'hvorki nafn sölunnar né staðarins stendur í skýrslunni');
      if (ts != null && Q.taeki !== ts) villa('Úttektarskýrsla', 'skýrslan telur ' + Q.taeki + ' tæki en salan ' + ts);
      skRod = Object.assign(skRod, { kt: Q.kts.map(ktB).join(', ') || '—', nafn: nafnOk ? (innihelt(Q.texti, s.customer_nafn) ? s.customer_nafn : site.nafn) : skRod.nafn, upphaed: Q.taeki + ' tæki' });
      // Handskrifaður texti óskertur: textinn á viðhenginu (702ffbad) er í PDF-inu, og ekkert úr eldri skýrslunni tapaðist.
      const tx = sk && sk.texti;
      if (tx) for (const ln of linur(tx.annad).concat(linur(tx.athugasemdir))) if (!Q.texti.replace(/\s+/g, ' ').includes(ln)) villa('Úttektarskýrsla', 'textinn „' + ln.slice(0, 60) + '" er á viðhenginu en ekki í PDF-inu');
      const E = g.eldriSkTexti ? lesaSkyrsluTexta(g.eldriSkTexti) : null;
      if (E) {
        const tapad = linur(E.hand).filter((ln) => !Q.hand.replace(/\s+/g, ' ').includes(ln));
        if (tapad.length) villa('Úttektarskýrsla', 'handskrifaður texti úr eldri skýrslunni tapaðist: ' + tapad.map((x) => '„' + x.slice(0, 50) + '"').join(', '));
        if (E.undirritun && Q.undirritun && E.undirritun.replace(/\s+/g, ' ') !== Q.undirritun.replace(/\s+/g, ' ')) vid('Úttektarskýrsla', 'undirritun/skoðunaraðili breyttist frá eldri skýrslu („' + E.undirritun.replace(/\s+/g, ' ').slice(0, 40) + '" → „' + Q.undirritun.replace(/\s+/g, ' ').slice(0, 40) + '")');
      } else if (g.eldriSk) vid('Úttektarskýrsla', 'eldri skýrsla (leyst af hólmi) er til en texti hennar ólesinn — handskrifaði textinn er ósannreyndur');
    }
    rodur.push(skRod);
  } else if (erUttekt && vilEkki) vid('Úttektarskýrsla', 'staðurinn vill ekki skýrslu með kröfu (skyrsla_med_krofu=false) — ekki dæmd');

  // 5. ELDRI SKJÖL — kreditfærður reikningur og gömul skýrsla merkt og opnast ekki sem gildandi.
  if (RS && g.kredit) {
    const eldriReikn = (g.vidhengi || []).filter((a) => a && (a.kind === 'reikningur' || /R-\d{6}/.test(String(a.name || ''))) && !a.leyst_af)
      .map((a) => (String(a.name || '').match(/R-\d{6}/) || [])[0]).filter((n) => n && n !== s.num && g.kredit[n]);
    for (const n of [...new Set(eldriReikn)]) {
      if (g.live517 === true) continue;  // appið leiðir kreditstöðuna af solur og sýnir PDF-ið yfirstrikað
      villa('Eldri skjöl', 'PDF ' + n + ' (kreditfærður með ' + g.kredit[n] + ') stendur ómerkt á staðnum' + (g.live517 === false ? ' — 517 ekki í loftinu, appið merkir hann ekki' : ' — óvíst hvort 517 er í loftinu'));
    }
  }
  if (erUttekt && s.customer_id) {
    const ar = String(new Date(s.created_at).getFullYear());
    const valin = SS.velja(s, g.vidhengi || [], site, g.skjalSkyrsla || null);
    const aðrar = (g.vidhengi || []).filter((a) => a && a.kind === 'skyrsla' && !a.leyst_af && String(a.year || '') === ar && (!valin || a.id !== valin.id));
    for (const a of aðrar) {
      const r = SS.bera(s, a, { site, base: b, facts: null, vidbot: false });
      (r.stodvar ? villa : vid)('Eldri skjöl', 'önnur skýrsla ársins „' + String(a.name || a.id).slice(0, 70) + '" er ekki merkt leyst af hólmi' + (r.stodvar ? ' og er um annað auðkenni' : ''));
    }
  }

  // 6. SENDIGLUGGINN í Kröfuyfirliti — engin rauð viðvörun, krafan ÓSEND (nema --send).
  const sent = !!(s.dk_invoice_id || s.krafa_sent_at || s.invoiced_at);
  if (sent && !g.send) villa('Sendigluggi', 'krafan er þegar SEND (' + [s.dk_invoice_id && 'Payday', s.krafa_sent_at && 'krafa', s.invoiced_at && 'reikningur'].filter(Boolean).join(', ') + ') — lokaathugunin á að koma á undan sendingu');
  if (!sent && g.send) vid('Sendigluggi', 'beðið var um athugun eftir sendingu en krafan er ÓSEND');
  if (s.greitt_med !== 'reikningur') villa('Sendigluggi', 'greitt_med er „' + (s.greitt_med || '∅') + '" — salan sést ekki í Kröfuyfirliti');
  if (s.paid_at) vid('Sendigluggi', 'salan er merkt greidd');
  if (!sent) {
    const f = g.forsk;
    if (!f) villa('Sendigluggi', 'salan finnst ekki í forskoðun Kröfuyfirlits (v_krofu_forskodun)');
    else {
      for (const x of (f.rautt || [])) villa('Sendigluggi', '⛔ ' + x);
      for (const x of (f.gult || [])) vid('Sendigluggi', '⚠ ' + x);
    }
  }

  const stemmir = !V.length && !O.length;
  for (const rd of rodur) rd.stemmir = !V.some((v) => v.startsWith(rd.hlid + ':')) && !O.some((v) => v.startsWith(rd.hlid + ':'));
  return { num: s.num, sala_id: s.id, stadur: s.customer_id, rodur, villur: V, vidvaranir: W, odaemt: O, stemmir, sent };
}

function prenta(res) {
  const L = [];
  const pad = (x, n) => { x = String(x == null ? '' : x); return x.length > n ? x.slice(0, n - 1) + '…' : x + ' '.repeat(n - x.length); };
  L.push('Lokaathugun ' + res.num + ' (sala ' + res.sala_id + ', staður #' + (res.stadur || '—') + ') · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
  L.push('');
  L.push('| ' + pad('Skjal', 26) + ' | ' + pad('kt', 12) + ' | ' + pad('nafn', 34) + ' | ' + pad('upphæð / tæki', 14) + ' | niðurstaða');
  L.push('|' + '-'.repeat(28) + '|' + '-'.repeat(14) + '|' + '-'.repeat(36) + '|' + '-'.repeat(16) + '|------------');
  for (const r of res.rodur) L.push('| ' + pad(r.hlutur, 26) + ' | ' + pad(r.kt, 12) + ' | ' + pad(r.nafn, 34) + ' | ' + pad(r.upphaed, 14) + ' | ' + (r.stemmir ? 'stemmir' : 'STEMMIR EKKI'));
  L.push('');
  for (const v of res.villur) L.push('  ✖ ' + v);
  for (const v of res.odaemt) L.push('  ? ' + v);
  for (const v of res.vidvaranir) L.push('  ⚠ ' + v);
  L.push('');
  L.push(res.stemmir ? 'NIÐURSTAÐA: STEMMIR — sala, reiknings-PDF og skýrsla segja það sama' + (res.sent ? '.' : '; krafan stendur ÓSEND.') + (res.vidvaranir.length ? ' Lestu ⚠-línurnar.' : '')
    : 'NIÐURSTAÐA: ' + (res.odaemt.length && !res.villur.length ? 'ÓDÆMT' : 'STEMMIR EKKI') + ' (' + res.villur.length + ' villa/ur' + (res.odaemt.length ? ', ' + res.odaemt.length + ' ódæmt' : '') + ') — verkið er EKKI búið.');
  return L.join('\n');
}

// ── gagnaöflun (aðeins lestur) ─────────────────────────────────────────────────────────────────────────────────────────
async function get(slod) {
  const r = await fetch(SUPA + '/rest/v1/' + slod, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
  return r.json();
}
function pdftexti(slod) {
  if (!slod) return { villa: 'engin slóð' };
  const p = String(slod).replace(/^samningar\//, '');
  const tmp = path.join(os.tmpdir(), 'lokaath-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.pdf');
  return fetch(SUPA + '/storage/v1/object/public/samningar/' + p.split('/').map(encodeURIComponent).join('/')).then(async (r) => {
    if (!r.ok) return { villa: 'niðurhal HTTP ' + r.status };
    fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    const x = cp.spawnSync('pdftotext', ['-raw', '-enc', 'UTF-8', tmp, '-'], { encoding: 'utf8', timeout: 20000 });
    try { fs.unlinkSync(tmp); } catch (_) {}
    if (x.error) return { villa: x.error.code === 'ENOENT' ? 'pdftotext vantar' : String(x.error.message).slice(0, 60) };
    if (x.status !== 0) return { villa: 'pdftotext skilaði ' + x.status };
    return { texti: x.stdout };
  }).catch((e) => ({ villa: String((e && e.message) || e).slice(0, 60) }));
}
async function erAppMed517() {
  try {
    const h = await (await fetch(APP + '/')).text();
    if (/517-reikningur-solu/.test(h)) return true;
    const b = [...h.matchAll(/\/js\/_bundle-[\w.]+\.js/g)].map((m) => m[0]);
    if (!b.length) return null;
    for (const u of [...new Set(b)]) { const t = await (await fetch(APP + u)).text(); if (/ReikningurSolu/.test(t)) return true; }
    return false;
  } catch (_) { return null; }
}

async function saekja(num, opt) {
  const sr = await get('solur?select=*&num=eq.' + encodeURIComponent(num));
  if (!sr.length) throw new Error('engin sala með númerið ' + num);
  const sale = sr.find((x) => !x.is_credit) || sr[0];
  const coId = sale.customer_id, ar = new Date(sale.created_at).getFullYear();
  const kts = [ktT(sale.customer_kt)].filter((k) => k.length === 10);
  const [base, site, st, vorur, kn, forsk, skjol, facts, par, live517] = await Promise.all([
    sale.customer_base_id != null ? get('customers_base?select=id,nafn,kennitala,rekstrarfelag&id=eq.' + sale.customer_base_id).then((x) => x[0] || null) : null,
    coId != null ? get('fyrirtaeki?select=id,nafn,kennitala,heimilisfang,customer_base_id,skyrsla_med_krofu&id=eq.' + coId).then((x) => x[0] || null) : null,
    // Tölulykill verður að vera í gæsalöppum (->"1339"), annars les PostgREST hann sem fylkisvísi og skilar null.
    get('app_settings?id=eq.1&select=att:settings->company_attachments->%22' + (coId != null ? String(coId) : 'x') + '%22,svd:settings->slokk_visit_defaults,vb:settings->vidbot_uttekt->%22' + (coId != null ? String(coId) : 'x') + '%22'),
    get('vorur?select=id,nafn,verd_an_vsk&virkt=is.true'),
    // kreditnótur sem vísa á sölur staðarins (eða á þessa sölu): credit_of / kredit_a
    coId != null ? get('solur?select=id,num,credit_of,kredit_a,status,is_credit,customer_id&customer_id=eq.' + coId) : get('solur?select=id,num,credit_of,kredit_a,status,is_credit&or=(id.eq.' + sale.id + ',credit_of.eq.' + sale.id + ',kredit_a.eq.' + num + ')'),
    get('v_krofu_forskodun?select=id,litur,rautt,gult&id=eq.' + sale.id).then((x) => x[0] || null),
    coId != null ? get('customer_documents?select=id,doc_type,invoice_number,amount,year,doc_date,notes,file_name,storage_path,drive_file_id,is_duplicate,created_at&fyrirtaeki_id=eq.' + coId + '&order=created_at.desc')
      : get('customer_documents?select=id,doc_type,invoice_number,amount,year,doc_date,notes,file_name,storage_path,drive_file_id,is_duplicate,created_at&invoice_number=eq.' + encodeURIComponent(num)),
    coId != null ? get('arsskodun_report_facts?select=fyrirtaeki_id,total_devices,report_year,parsed_at&fyrirtaeki_id=eq.' + coId + '&report_year=eq.' + ar) : [],
    coId != null ? get('document_pairs?select=id,year,service_type,invoice_doc_id,report_doc_id&fyrirtaeki_id=eq.' + coId + '&year=eq.' + ar + '&service_type=eq.uttekt') : [],
    erAppMed517(),
  ]);
  if (site && ktT(site.kennitala).length === 10) kts.push(ktT(site.kennitala));
  const kunni = kts.length ? await get('charlize_knowledge?select=id,topic&scope=eq.kunni&kennitala=in.(' + [...new Set(kts)].map(ktB).concat([...new Set(kts)]).join(',') + ')').catch(() => []) : [];
  const RS = lesaRS();
  const solurStadar = kn.filter((x) => !x.is_credit);
  const kredit = RS ? RS.kreditMap(kn.filter((x) => x.is_credit), solurStadar.concat([sale])) : {};
  const vidhengi = (st && st[0] && st[0].att) || [];
  const vb = (st && st[0] && st[0].vb) || null;
  const vidbot = /^Viðbótarúttekt við /.test(String(sale.krafa_note || '')) || !!(vb && Array.isArray(vb.sala_nums) && vb.sala_nums.map(String).includes(String(sale.num)));
  const skjolReikn = skjol.filter((d) => d.doc_type === 'reikningur');
  const ds = skjol.find((d) => /^uttektarsk/.test(String(d.doc_type)) && String(d.year) === String(ar) && d.storage_path);
  const skjalSkyrsla = ds ? { name: ds.notes || ds.file_name || '', storage_path: ds.storage_path, year: String(ds.year), doc_date: ds.doc_date, uppruni: 'skjal' } : null;
  const parRod = par && par[0];
  const parDoc = parRod && parRod.invoice_doc_id != null ? (skjol.find((d) => d.id === parRod.invoice_doc_id) || (await get('customer_documents?select=id,invoice_number&id=eq.' + parRod.invoice_doc_id))[0] || null) : null;
  const vorurByNafn = new Map(vorur.map((v) => [String(v.nafn || '').toLowerCase(), v]));
  const g = { sale, base, site, svd: (st && st[0] && st[0].svd) || null, vorurByNafn, kredit, rs: RS, vidhengi, skjolReikn, skjalSkyrsla,
    facts: (facts && facts[0]) || null, vidbot, forsk, kunni, live517, send: !!opt.send,
    par: parRod ? { id: parRod.id, invoice_number: parDoc && parDoc.invoice_number } : null };
  // Innihald PDF-skjalanna (ef pdftotext er til). Reikningur: það sem 517 velur. Skýrsla: það sem _skyrsla-solu velur + nýjasta eldri.
  if (RS) {
    const pdf = RS.velja(sale, vidhengi, skjolReikn);
    if (pdf) { const t = await pdftexti(pdf.path || pdf.storage_path); g.pdfTexti = t.texti || null; g.pdfLesturVilla = t.villa; }
  }
  if (/^(uttekt|vinnublad)$/.test(String(sale.source || '')) && coId != null) {
    const sk = SS.velja(sale, vidhengi, site, skjalSkyrsla);
    if (sk) { const t = await pdftexti(sk.path || sk.storage_path); g.skTexti = t.texti || null; g.skLesturVilla = t.villa; }
    const eldri = vidhengi.filter((a) => a && a.kind === 'skyrsla' && a.leyst_af && String(a.year || '') === String(ar) && a.path)
      .sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))[0];
    if (eldri) { g.eldriSk = eldri; const t = await pdftexti(eldri.path); g.eldriSkTexti = t.texti || null; }
  }
  return g;
}

module.exports = { daema, prenta, saekja, ktGild, samtala, listaverd, lesaReikningsTexta, lesaSkyrsluTexta };

if (require.main === module) {
  const a = process.argv.slice(2);
  const num = a.find((x) => /^R-\d{6}$/.test(x));
  if (!num) { console.log('Notkun: node tools/reikningur-lokaathugun.cjs R-000000 [--json] [--send]'); process.exit(2); }
  saekja(num, { send: a.includes('--send') }).then((g) => {
    const res = daema(g);
    console.log(a.includes('--json') ? JSON.stringify(res, null, 2) : prenta(res));
    process.exit(res.stemmir ? 0 : (res.villur.length ? 1 : 2));
  }).catch((e) => { console.log('ÓDÆMT: ' + String((e && e.message) || e).slice(0, 160)); process.exit(2); });
}
