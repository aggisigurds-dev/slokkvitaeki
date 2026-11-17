/* === 517 REIKNINGS-PDF FYLGIR SÖLU — ein regla (17.11.2026) ===
 *
 * Agnar 17.11.2026 (skjámynd): „það er ennþá vitlaus kennitala á bölv reikningnum“. Það sem opnaðist var PDF-afrit
 * GAMLA reikningsins (kreditfærður, gömul kt). Nýja salan átti sitt eigið, rétta PDF — en ekkert í appinu sagði að gamla
 * PDF-ið gilti ekki lengur: það stóð ómerkt við hlið þess nýja á fyrirtækjaspjaldinu og Afgreiðslan tengdi á það sem
 * „Reikningur R-… (PDF)“. Mælt 17.11: 32 kreditfærðir reikningar 2026 áttu ómerkt PDF-afrit.
 *
 * Sama regla og úttektarskýrslan (_skyrsla-solu.cjs / 516): reiknings-PDF ræðst af SÖLUNNI —
 *   velja(sale, vidhengi, skjol)  → PDF-afrit ÞESSARAR sölu: nákvæmlega sama R-númer (aldrei „fyrsta skjal ársins“,
 *                                   aldrei hlutstrengur), ekki leyst af hólmi; nýjast vinnur.
 *   bera(sale, pdf, { kredit, skjal }) → stemmir PDF-ið við söluna? R-númer og kt (stöðva), upphæð og nafn (vara),
 *                                   kreditfærð sala (stöðvar: PDF-ið er ekki gildandi reikningur).
 *   kreditMap(kreditnotur, solur) → { 'R-…': 'R-kredit' } — kreditfærsla er staðreynd í solur (credit_of / kredit_a),
 *                                   ekki merki sem þarf að muna að setja: gildir því líka aftur í tímann.
 * Engu eytt: eldra PDF fær `leyst_af` (111 supersede) þegar nýtt kemur í staðinn og kreditfært PDF er merkt, ekki falið
 * á spjaldi starfsfólks.
 *
 * Notendur: 233 (vistun — nýtt PDF þegar það gamla stemmir ekki), 254 (PDF í pósti — aldrei úrelt né kreditfært),
 * 199 (fyrirtækjaspjaldið + parið), 166 (sendiglugginn), 311/253 (pörin), afgreidsla.cjs + gatt.cjs (þjónn),
 * tools/audit-reikningur-solu.cjs (gagnavörður), tools/endurspilun-reikningur-pdf.cjs. Handbók: sala-reikningar.md.
 * UMD: sama skrá í vafranum (window.ReikningurSolu) og í node. ÞJÓNSAFRITIÐ netlify/functions/_reikningur-solu.cjs er
 * nákvæmlega þessi skrá (package.json er "type": "module", svo node les .js sem ESM; .cjs-afritið er það sem föllin og
 * tólin require-a). Eftir breytingu: cp js/patches/517-reikningur-solu.js netlify/functions/_reikningur-solu.cjs —
 * test/reikningur-pdf-fylgir-solu.test.cjs fellur annars.
 */
(function (root) {
  'use strict';

  var RNUM = /R-\d{6}/;
  var ktTolur = function (k) { return String(k == null ? '' : k).replace(/\D/g, ''); };
  var nafnNorm = function (s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFC')
      .replace(/\b(ehf|hf|sf|slf|ses|ohf|bs|svf)\b\.?/g, ' ').replace(/[^0-9a-záðéíóúýþæö]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Nákvæmt R-númer sem sjálfstætt tákn í texta (R-001307 ≠ R-0013070, ≠ „…R-001307" inni í lengri tölu).
  function rnumSama(texti, num) {
    var n = String(num || '').trim();
    if (!RNUM.test(n)) return false;
    var esc = n.replace(/[-]/g, '\\-');
    return new RegExp('(^|[^0-9A-Za-z])' + esc + '([^0-9]|$)').test(String(texti || ''));
  }

  // „Nafn - kt - ár - R-xxxxxx - #id.pdf" (233 docName). Skilar því sem þekkist; óþekkt snið → tómir reitir.
  function lysa(nafn) {
    var s = String(nafn || '').replace(/\.pdf$/i, '');
    var hlutar = s.split(/\s+-\s+/);
    var ut = { nafn: '', kt: '', ar: '', rnum: '', stadur: '' };
    var m = RNUM.exec(s); if (m) ut.rnum = m[0];
    hlutar.forEach(function (h, i) {
      var t = h.trim();
      if (/^#\d+$/.test(t)) ut.stadur = t.slice(1);
      else if (/^\d{6}-?\d{4}$/.test(t)) { if (!ut.kt) { ut.kt = ktTolur(t); if (i > 0 && !ut.nafn) ut.nafn = hlutar.slice(0, i).join(' - ').trim(); } }
      else if (/^20\d\d$/.test(t) && !ut.ar) ut.ar = t;
    });
    return ut;
  }

  var erReikningsVidhengi = function (a) {
    return !!(a && (a.kind === 'reikningur' || (!a.kind && /reikn|R-\d{6}/i.test(String(a.name || '')))));
  };
  var nyjast = function (a, b) {
    return String((b && (b.uploaded_at || b.created_at)) || '').localeCompare(String((a && (a.uploaded_at || a.created_at)) || ''));
  };

  // PDF-afrit ÞESSARAR sölu. vidhengi = company_attachments staðarins; skjol = customer_documents (doc_type reikningur).
  // Skilar { name, path|storage_path, uppruni:'vidhengi'|'skjal', skjal } eða null. ALDREI annað R-númer.
  function velja(sale, vidhengi, skjol) {
    var num = String((sale && sale.num) || '');
    if (!RNUM.test(num)) return null;
    var dlist = (Array.isArray(skjol) ? skjol : []).filter(function (d) {
      return d && (d.doc_type == null || d.doc_type === 'reikningur') && String(d.invoice_number || '') === num && !d.is_duplicate;
    });
    var skjalFyrir = function (slod) {
      var p = String(slod || '').replace(/^samningar\//, '');
      return dlist.find(function (d) { return String(d.storage_path || '').replace(/^samningar\//, '') === p; }) || null;
    };
    var alist = (Array.isArray(vidhengi) ? vidhengi : []).filter(function (a) {
      return erReikningsVidhengi(a) && !a.leyst_af && (a.path || a.storage_path) && rnumSama(a.name, num);
    }).sort(nyjast);
    if (alist[0]) return Object.assign({}, alist[0], { uppruni: 'vidhengi', skjal: skjalFyrir(alist[0].path || alist[0].storage_path) || dlist[0] || null });
    var d = dlist.filter(function (x) { return x.storage_path || x.drive_file_id; }).sort(function (a, b) { return Number(b.id || 0) - Number(a.id || 0); })[0];
    if (d) return { name: d.file_name || d.notes || ('Reikningur ' + num + '.pdf'), storage_path: d.storage_path || null, drive_file_id: d.drive_file_id || null, uppruni: 'skjal', skjal: d };
    return null;
  }

  // kreditnotur: solur-raðir með is_credit (credit_of, kredit_a, num, status). solur: [{id,num}] reikninganna sem spurt er um.
  // Óháð rýni 17.11.2026 (2): HLUTAKREDIT er ekki kreditfærsla. Reikningur telst kreditfærður AÐEINS þegar kreditnótur
  // hans ná yfir alla upphæðina (±2 kr). Mælt: af 57 kreditnótum voru 5 að hluta — t.d. R-000911 (8.432 kr, kreditað 1.426)
  // og R-001025 (29.047, kreditað 16.820) hurfu af kúnnavefnum og töldust 0 kr á árspjaldinu. Hlutakreditaður reikningur
  // gildir og er sýndur með athugasemd um kreditið.
  // kreditStada(kreditnotur, solur) → { 'R-…': { notur:['R-k',…], kreditad: kr, upphaed: kr|null, full: bool } }
  //   solur: reikningarnir sem spurt er um ({id, num, samtals}); kreditnotur: {num, credit_of, kredit_a, status, is_credit, samtals}.
  //   Vanti upphæð reikningsins (samtals) telst kreditið fullt — gamla hegðunin; allir kallarar sækja samtals (prófað).
  function kreditStada(kreditnotur, solur) {
    var numById = {}, upphById = {};
    (Array.isArray(solur) ? solur : []).forEach(function (s) {
      if (!s || !s.num) return;
      if (s.id != null) numById[String(s.id)] = String(s.num);
      upphById[String(s.num)] = (s.samtals == null || s.samtals === '') ? null : Number(s.samtals);
    });
    var ut = {}, sed = {};
    (Array.isArray(kreditnotur) ? kreditnotur : []).forEach(function (k) {
      if (!k || k.status === 'void' || (k.is_credit === false)) return;
      var knr = String(k.num || 'kreditreikningur');
      var a = (k.credit_of != null && numById[String(k.credit_of)]) || String(k.kredit_a || '');
      if (!RNUM.test(a) || sed[a + '|' + knr]) return;
      sed[a + '|' + knr] = 1;
      var e = ut[a] || (ut[a] = { notur: [], kreditad: 0, upphaed: (a in upphById) ? upphById[a] : null, full: false, upphaedOthekkt: false });
      e.notur.push(knr);
      if (k.samtals == null || k.samtals === '') e.upphaedOthekkt = true; else e.kreditad += Math.abs(Number(k.samtals) || 0);
    });
    Object.keys(ut).forEach(function (a) {
      var e = ut[a];
      e.full = (e.upphaed == null || e.upphaedOthekkt) ? true : (e.upphaed <= 0 || e.kreditad >= e.upphaed - 2);
      delete e.upphaedOthekkt;
    });
    return ut;
  }
  // Aðeins FULLT kreditfærðir reikningar: { 'R-…': 'R-k[, R-k2]' }.
  function kreditMap(kreditnotur, solur) {
    var st = kreditStada(kreditnotur, solur), ut = {};
    Object.keys(st).forEach(function (a) { if (st[a].full) ut[a] = st[a].notur.join(', '); });
    return ut;
  }

  // Dómurinn. opts.kredit = R-númer kreditreikningsins (eða null). Skilar { stemmir, lysing, misraemi:[{svid,stodvar,texti}] }.
  function bera(sale, pdf, opts) {
    opts = opts || {};
    var num = String((sale && sale.num) || '');
    var mis = [];
    if (opts.kredit) {
      mis.push({ svid: 'kredit', stodvar: true, texti: 'Reikningurinn ' + num + ' var kreditfærður með ' + opts.kredit + ' — PDF-ið er EKKI gildandi reikningur.' });
    }
    if (!pdf) {
      return { stemmir: !opts.kredit, vantar: true, lysing: null, misraemi: mis.concat([{ svid: 'vantar', stodvar: false, texti: 'Ekkert PDF-afrit af ' + num + ' er vistað.' }]) };
    }
    var l = lysa(pdf.name || pdf.file_name || '');
    if (l.rnum && l.rnum !== num) mis.push({ svid: 'rnum', stodvar: true, texti: 'PDF-ið er reikningur ' + l.rnum + ', ekki ' + num + '.' });
    var sk = ktTolur(sale && sale.customer_kt);
    if (l.kt && sk.length === 10 && l.kt !== sk) {
      mis.push({ svid: 'kt', stodvar: true, texti: 'PDF-ið er á kt. ' + l.kt.slice(0, 6) + '-' + l.kt.slice(6) + ' en salan á kt. ' + sk.slice(0, 6) + '-' + sk.slice(6) + '.' });
    }
    var sn = nafnNorm(sale && sale.customer_nafn), pn = nafnNorm(l.nafn);
    if (sn && pn && sn.indexOf(pn) < 0 && pn.indexOf(sn) < 0) {
      mis.push({ svid: 'nafn', stodvar: false, texti: 'Nafnið á PDF-inu („' + l.nafn + '") er annað en á sölunni („' + String(sale.customer_nafn || '') + '").' });
    }
    var sj = opts.skjal || pdf.skjal || null;
    if (sj && sj.amount != null && sale && sale.samtals != null && Math.abs(Number(sj.amount) - Number(sale.samtals)) > 2) {
      mis.push({ svid: 'upphaed', stodvar: false, texti: 'Upphæð PDF-afritsins (' + Math.round(Number(sj.amount)) + ' kr) er önnur en sölunnar (' + Math.round(Number(sale.samtals)) + ' kr).' });
    }
    return { stemmir: !mis.some(function (m) { return m.stodvar; }), lysing: l, misraemi: mis };
  }

  // Þarf að gera nýtt PDF? (233/516): PDF-ið er til en kt eða R-númer stemmir ekki, eða upphæðin hefur breyst.
  function urelt(dom) {
    return !!(dom && !dom.vantar && dom.misraemi.some(function (m) { return m.svid === 'kt' || m.svid === 'rnum' || m.svid === 'upphaed'; }));
  }

  // Vafri: sækir kreditstöðu reikninganna nums (Supabase-biðlari sb). Skilar { 'R-…': 'R-kredit' }. Villa → {} (ekkert merkt).
  // opts.stada: skila kreditStada (full + hluti) í stað kreditMap (aðeins fullt).
  async function saekjaKredit(sb, nums, opts) {
    var n = (Array.isArray(nums) ? nums : []).map(String).filter(function (x) { return RNUM.test(x); });
    n = n.filter(function (x, i) { return n.indexOf(x) === i; });
    if (!sb || !n.length) return {};
    try {
      var s = await sb.from('solur').select('id,num,samtals').in('num', n);
      var solur = (s && s.data) || [];
      var ids = solur.map(function (x) { return x.id; });
      var qs = [sb.from('solur').select('num,credit_of,kredit_a,status,is_credit,samtals').eq('is_credit', true).in('kredit_a', n)];
      if (ids.length) qs.push(sb.from('solur').select('num,credit_of,kredit_a,status,is_credit,samtals').eq('is_credit', true).in('credit_of', ids));
      var rr = await Promise.all(qs);
      var kn = [];
      rr.forEach(function (r) { ((r && r.data) || []).forEach(function (x) { kn.push(x); }); });
      return (opts && opts.stada) ? kreditStada(kn, solur) : kreditMap(kn, solur);
    } catch (_) { return {}; }
  }

  // Vafri: eftir hverja breytingu á sölu (142 'sale-edited', aðrar leiðir 'sala-breytt') er PDF-afritið borið við söluna;
  // stemmi það ekki (kt leiðrétt, línur/afsláttur breyttust) gerir 233 nýtt og merkir það gamla „leyst af hólmi". Aðeins þar
  // sem afrit var til (adeinsEfTil) og aðeins á ósendri sölu (233 sleppir sendum). Enginn handskrifaður texti er í reikningi,
  // svo endurgerðin er sjálfvirk — öfugt við úttektarskýrsluna (516), sem spyr.
  var _iGangi = {};
  async function eftirBreytingu(saleId) {
    var w = root;
    if (!w || !saleId || _iGangi[saleId]) return null;
    var sb = w.DB && w.DB.sb;
    if (!sb || !(w.UttektInvoicePdf && w.UttektInvoicePdf.saveForSale)) return null;
    _iGangi[saleId] = 1;
    try {
      var r = await sb.from('solur').select('*').eq('id', saleId).maybeSingle();
      var s = r && r.data;
      if (!s || s.status !== 'final' || s.is_credit || !s.customer_id || s.krafa_sent_at || s.invoiced_at) return null;
      return await w.UttektInvoicePdf.saveForSale(s.customer_id, s, { adeinsEfTil: true });
    } catch (e) {
      try { if (w.logProblem) w.logProblem('reikningur_pdf_endurnyjun', String(saleId) + ': ' + String((e && e.message) || e).slice(0, 160)); } catch (_) {}
      return null;
    } finally { setTimeout(function () { delete _iGangi[saleId]; }, 3000); }
  }

  var api = { lysa: lysa, rnumSama: rnumSama, velja: velja, bera: bera, urelt: urelt, kreditMap: kreditMap, kreditStada: kreditStada, saekjaKredit: saekjaKredit, ktTolur: ktTolur, nafnNorm: nafnNorm, eftirBreytingu: eftirBreytingu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && !root.ReikningurSolu) {
    root.ReikningurSolu = api;
    if (root.document && root.document.addEventListener) {
      root.document.addEventListener('sale-edited', function (e) { var d = e && e.detail; if (d && d.id) eftirBreytingu(d.id); });
      root.document.addEventListener('sala-breytt', function (e) { var d = e && e.detail; if (d && d.id) eftirBreytingu(d.id); });
    }
  }
})(typeof window !== 'undefined' ? window : null);
