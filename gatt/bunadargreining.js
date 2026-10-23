/* bunadargreining.js — BÚNAÐARGREINING á eignasíðu Þjónustugáttarinnar (21.10.2026, Agnar: „láta það líta vel út í þjónustugátt").
 *
 * Gögnin koma úr netlify/functions/_gatt-bgr.cjs (b.bgr): hæðirnar sem greiningin las af samþykktum teikningum, merki á hverri
 * ([x, y, litur, auðkenni, flokkur, staður] í frumdílum blaðsins), fjöldi á hæð, brunavarnatexti úr byggingarlýsingu og heimildir.
 * Spjöldin teiknast með synaHaed í portal.js (sami skurður og kvarði og Teikningar-spjöldin), svo stækkun, niðurhal og
 * farsímaútlit eru þau sömu. Flokkasían (kúnninn slekkur á ÚT eða slöngum) er tímabundin staða á opnunni — ekkert geymt á tækinu.
 *
 *   GattBgr.eignHtml(b)  → HTML hlutans ('' ef eignin á enga greiningu eða tólið er slökkt)
 *   GattBgr.lifga(b)     → teiknar spjöldin og tengir síuna (kallað eftir að drawer-inn er settur inn)
 */
(function () {
  'use strict';
  var G = function () { return window.Gatt; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var FL = [['sl', 'Slökkvitæki', '#e11d2e'], ['bs', 'Brunaslöngur', '#2563eb'], ['ut', 'Útgangar (ÚT)', '#15803d'], ['r', 'Reykskynjarar', '#9333ea'], ['bk', 'Brunakerfi', '#6d28d9'], ['hiti', 'Hitaskynjarar', '#ea580c']];
  var AF = {};   // eign (b.id) → { flokkur: true } — flokkar sem kúnninn slökkti á; aðeins meðan drawer-inn er opinn
  var MAXSYN = 3;   // ein röð af þremur; „Sjá fleiri hæðir“ ef þær eru fleiri (Agnar 22.10.2026)
  // á símanum eru dálkarnir tveir (CSS ≤720 px) — ein röð þar eru tvær hæðir, svo engin stök mynd sitji ein í annarri röð
  function maxSyn() { return window.matchMedia && window.matchMedia('(max-width:720px)').matches ? 2 : MAXSYN; }

  function dags(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function tala(n, et, ft) { return n + ' ' + (n === 1 ? et : ft); }
  function totals(r) {
    var t = {}; FL.forEach(function (f) { t[f[0]] = 0; });
    (r.haedir || []).forEach(function (h) { FL.forEach(function (f) { t[f[0]] += (h.tel && h.tel[f[0]]) || 0; }); });
    return t;
  }
  var STUTT = { sl: ['slökkvitæki', 'slökkvitæki'], bs: ['slanga', 'slöngur'], ut: ['ÚT', 'ÚT'], r: ['reykskynjari', 'reykskynjarar'], bk: ['brunakerfi', 'brunakerfi'], hiti: ['hitaskynjari', 'hitaskynjarar'] };
  // „1 slanga · 2 ÚT" — fjöldi hvers flokks á einni hæð (undir fastri mynd hæðarinnar)
  function telTexti(h) {
    var o = FL.filter(function (f) { return h.tel && h.tel[f[0]] > 0; }).map(function (f) { var n = h.tel[f[0]], st = STUTT[f[0]] || [f[1], f[1]]; return n + ' ' + (n === 1 ? st[0] : st[1]); });
    ['sl', 'bs'].forEach(function (k) { var n = h.tel && h.tel['till_' + k]; if (n > 0) { var st = STUTT[k]; o.push(n + ' ' + (n === 1 ? st[0] : st[1]) + ' (tillaga)'); } });
    if (h.tel && h.tel.skrad > 0) o.push(h.tel.skrad + ' skráð á stað');
    return o.length ? o.join(' · ') : 'engin merki';
  }
  // TILLÖGUR ARNOLDS (b.bgr.haedir[].tel.till_sl / till_bs): áætluð þörf þar sem teikningin tilgreinir engin slökkvitæki/slöngur — talið sér
  function tillTotals(r) {
    var t = { sl: 0, bs: 0 };
    (r.haedir || []).forEach(function (h) { t.sl += (h.tel && h.tel.till_sl) || 0; t.bs += (h.tel && h.tel.till_bs) || 0; });
    return t;
  }
  function virkir(r) { var t = totals(r); return FL.filter(function (f) { return t[f[0]] > 0; }); }

  function textaHtml(r) {
    if (!(r.texti || []).length) return '';
    var inn = r.texti.map(function (t) {
      return '<div class="bgr-tx">' + (r.texti.length > 1 && t.titill ? '<h5>' + esc(t.titill) + '</h5>' : '') + t.kaflar.map(function (k) {
        return '<div class="bgr-kafli' + (k.lykill ? ' lyk' : '') + '">' + (k.fyrirsogn ? '<b>' + esc(k.fyrirsogn) + '</b>' : '') + '<p>' + esc(k.texti).replace(/\n/g, '<br>') + '</p></div>';
      }).join('') + (t.heimild ? '<small>' + esc(t.heimild) + '</small>' : '') + '</div>';
    }).join('');
    return '<details class="bgr-texti"><summary>Brunavarnir úr byggingarlýsingu hússins</summary>' + inn + '</details>';
  }

  function eignHtml(b) {
    var g = G(); if (!g || !g.synOf().bunadargreining) return '';
    var r = b && b.bgr; if (!r || !(r.haedir || []).length) return '';
    var vf = virkir(r); if (!vf.length) return '';
    var t = totals(r), st = AF[b.id] || {}, sam = vf.reduce(function (n, f) { return n + t[f[0]]; }, 0);
    var fastar = (r.haedir || []).every(function (h) { return !!h.yl; });   // allar hæðir með fasta mynd: flokkasían á ekki við (myndin er tilbúin með öllum merkjum)
    // HEILDARTÖLUR EFST: slökkvitæki, brunaslöngur, útgangar … á allri eigninni
    // slökkvitæki og slöngur: hvað er skráð í þjónustu við hliðina á því sem teikningin segir að eigi að vera (Agnar 22.10.2026: „hvað þau eru með mörg slökkvitæki og slöngur")
    var skrad = { sl: +b.sl || 0, bs: +b.slo || 0 }, till = tillTotals(r);
    var stad = (r.haedir || []).reduce(function (n, h) { return n + ((h.tel && h.tel.skrad) || 0); }, 0);   // raunstaðir tækja úr vinnublöðum (slökkvitæki)
    // HEILDARFJÖLDI tækja skráð í þjónustu (slökkvitæki + slöngur) fyrst — Agnar 22.10: „vantar heildarfjöldann"
    var heild = skrad.sl + skrad.bs;
    var heildReitur = heild > 0 ? '<div class="bt alls"><b>Tæki alls</b><strong>' + heild + '</strong><small>' + skrad.sl + ' slökkvitæki · ' + skrad.bs + (skrad.bs === 1 ? ' slanga' : ' slöngur') + ' skráð í þjónustu</small></div>' : '';
    var efst = '<div class="bgr-top">' + heildReitur + FL.filter(function (f) { return t[f[0]] > 0 || skrad[f[0]] > 0 || till[f[0]] > 0 || (f[0] === 'sl' && stad > 0); }).map(function (f) {
      var k = f[0], s = skrad[k] || 0, tl = till[k] || 0, st = k === 'sl' ? stad : 0, alls = t[k] + tl + st, subs = [];
      if (s > 0) subs.push(s + ' skráð í þjónustu' + (alls ? '' : ' · ekki merkt á teikningu'));
      if (st > 0) subs.push(st + ' skráð á stað (vinnublað)');
      if (tl > 0) subs.push(t[k] > 0 ? 'þar af ' + tl + ' í tillögu' : 'tillaga (áætluð þörf)');
      return '<div class="bt' + (tl > 0 && !t[k] ? ' till' : '') + '"><b><i class="gdot" style="background:' + f[2] + '"></i>' + esc(f[1]) + '</b><strong>' + (alls || '—') + '</strong>' + subs.map(function (x) { return '<small>' + x + '</small>'; }).join('') + '</div>';
    }).join('') + '</div>';
    var chips = vf.map(function (f) {
      return '<button type="button" class="gchip bgr-chip' + (st[f[0]] ? ' off' : '') + '" data-bgr-fl="' + f[0] + '" aria-pressed="' + (st[f[0]] ? 'false' : 'true') + '" title="Sýna / fela á teikningunum"><i class="gdot" style="background:' + f[2] + '"></i><b>' + t[f[0]] + '</b>' + esc(f[1]) + '</button>';
    }).join('');
    var tafla = '<div class="dpanel bgr-tafla"><table><thead><tr><th>Hæð</th>' + vf.map(function (f) { return '<th class="r">' + esc(f[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      r.haedir.map(function (h) {
        return '<tr><td style="font-weight:600;color:var(--ink)">' + esc(h.nafn) + '</td>' + vf.map(function (f) { var n = (h.tel && h.tel[f[0]]) || 0; return '<td class="num r">' + (n || '—') + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '<tr class="bgr-sam"><td>Samtals</td>' + vf.map(function (f) { return '<td class="num r">' + t[f[0]] + '</td>'; }).join('') + '</tr></tbody></table></div>';
    var leidbeining = fastar ? 'Hvar slökkvitæki, brunaslöngur, útgangar og brunakerfi eiga að vera í húsinu — lesið úr samþykktum aðaluppdráttum. Smelltu á mynd til að stækka.'
      : 'Hvar slökkvitæki, brunaslöngur, útgangar og brunakerfi eiga að vera í húsinu — lesið úr samþykktum aðaluppdráttum. Smelltu á hæð til að stækka; flokkana má kveikja og slökkva.';
    var heim = (r.heimildir || []).map(function (h) { return esc(h.titill) + (h.dags ? ' (' + esc(dags(h.dags)) + ')' : ''); }).join(' · ');
    var skradNota = r.skrad ? 'Svört merki á myndunum sýna hvar tæki voru skráð á vinnublaði skoðunar' + (r.skrad.heimild ? ' (' + esc(r.skrad.heimild) + ')' : '') + ' — raunstaðir, ekki hönnun. ' : '';
    var tillNota = skradNota + (r.till ? 'Tillögurnar' + (r.till.at ? ' (' + dags(r.till.at) + ')' : '') + ' eru áætlun út frá reglum um slökkvibúnað (byggingarreglugerð gr. 9.4.4–9.4.5, 165.BR1) — teikningin tilgreinir engin slökkvitæki eða slöngukefli á þessum hæðum. Þær eru ekki hönnun og eru staðfestar á staðnum við næstu skoðun. ' : '');
    var nota = tillNota + (heim ? 'Heimild: ' + heim + '. ' : '') + (r.yfirfarin ? 'Yfirfarið af Slökkvitækjum ehf. ' : 'Lesið úr samþykktum teikningum og staðfest á staðnum við næstu skoðun. ') +
      'Staðsetning er leiðbeinandi — endanleg staðfesting er hjá hönnuði og slökkviliði.' + (r.utan ? ' ' + tala(r.utan, 'atriði er', 'atriði eru') + ' án staðsetningar á teikningu.' : '');
    return '<section class="dsec" id="bgr-sec" data-bgr-fid="' + esc(b.id) + '"><h4>Búnaðargreining <span class="cnt">' + tala(r.haedir.length, 'hæð', 'hæðir') + ' · ' + tala(sam, 'atriði', 'atriði') + '</span></h4>' +
      '<p class="bgr-lead">' + leidbeining + '</p>' +
      efst + (fastar ? '' : '<div class="gsum bgr-chips">' + chips + '</div>' + tafla) +
      '<div class="tgrid bgr-grid" id="bgr-grid"></div>' + textaHtml(r) + '<div class="gnote">' + esc(nota) + '</div></section>';
  }

  // Merki hæðar eftir síunni — sama snið og Teikningar-spjöldin: [x, y, litur, auðkenni]
  function stilla(b, h) {
    var st = AF[b.id] || {};
    h._f = h._f || { nafn: h.nafn, mynd: h.mynd, frum: h.frum, skurdur: h.skurdur, _bgr: true };
    h._f.merki = (h.merki || []).filter(function (m) { return !st[m[4]]; });
    return h._f;
  }
  function kort(b, h, j, syn) {
    var f = stilla(b, h), n = (h.merki || []).length;
    var k = document.createElement('div'); k.className = 'fcard bgr-k' + (j >= maxSyn() ? ' umfram' : '');
    if (h.yl) {   // föst mynd hæðarinnar með greiningunni (bunadargreining.yfirlag) — hleðst strax, stækkar í sama glugga og hin spjöldin
      var f2 = { nafn: h.nafn + ' · búnaðargreining', threed: { url: h.yl, ending: ' (búnaðargreining).jpg' } };
      k.innerHTML = '<div class="fcard-h"><span>' + esc(h.nafn) + '<small>' + esc(telTexti(h)) + '</small></span></div>' +
        '<div class="fm" title="Stækka"><img loading="lazy" alt="' + esc(h.nafn) + '" src="' + esc(h.yl) + '"></div>' +
        (syn.nidurhal ? '<div class="fcard-f"><button type="button" class="dl">' + G().svgIc('pdf', 1.8) + 'Sækja</button></div>' : '');
      k._h = h; k._fast = true;
      k.querySelector('.fm').onclick = function () { G().opnaLb(b, f2, '3d'); };
      var dl2 = k.querySelector('.dl'); if (dl2) dl2.onclick = function () { G().saekja(b, f2, '3d'); };
      return k;
    }
    var sk = h.skurdur, ar = sk && sk.w > 0 && sk.h > 0 ? Math.max(0.42, Math.min(1.7, sk.w / sk.h)) : 1.33;
    k.innerHTML = '<div class="fcard-h"><span>' + esc(h.nafn) + '<small>' + (n ? tala(n, 'merki', 'merki') : 'engin merki') + '</small></span></div>' +
      '<div class="fm" title="Stækka" style="aspect-ratio:' + ar.toFixed(3) + '"><div class="ft">…</div></div>' +
      (syn.nidurhal ? '<div class="fcard-f"><button type="button" class="dl">' + G().svgIc('pdf', 1.8) + 'Sækja</button></div>' : '');
    k._h = h;
    k.querySelector('.fm').onclick = function () { G().opnaLb(b, stilla(b, h), 'teikning'); };
    var dl = k.querySelector('.dl'); if (dl) dl.onclick = function () { G().saekja(b, stilla(b, h), 'teikning'); };
    return k;
  }
  function teikna(k, b) { if (k._fast) return; var h = k._h; G().synaHaed(k.querySelector('.fm'), stilla(b, h), 'teikning'); }

  function lifga(b) {
    var g = G(), grid = document.getElementById('bgr-grid'); if (!g || !grid || !b || !b.bgr) return;
    var syn = g.synOf(), hs = b.bgr.haedir || [];
    var sjon = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; sjon.unobserve(e.target); teikna(e.target, b); });
    }, { rootMargin: '200px' }) : null;
    hs.forEach(function (h, j) { var k = kort(b, h, j, syn); grid.appendChild(k); if (sjon) sjon.observe(k); else teikna(k, b); });
    var lim = maxSyn();
    if (hs.length > lim) {
      var fl = document.createElement('button'); fl.type = 'button'; fl.className = 'kbtn';
      var lokad = 'Sjá fleiri hæðir (' + (hs.length - lim) + ')'; fl.textContent = lokad;
      fl.onclick = function () { var a = grid.classList.toggle('allar'); fl.textContent = a ? 'Sýna færri' : lokad; if (a) grid.querySelectorAll('.bgr-k').forEach(function (k) { if (!k.querySelector('canvas')) teikna(k, b); }); };
      grid.appendChild(fl);
    }
    document.querySelectorAll('#bgr-sec .bgr-chip').forEach(function (c) {
      c.onclick = function () {
        var fl2 = c.getAttribute('data-bgr-fl'), st = AF[b.id] = AF[b.id] || {};
        st[fl2] = !st[fl2]; c.classList.toggle('off', !!st[fl2]); c.setAttribute('aria-pressed', st[fl2] ? 'false' : 'true');
        grid.querySelectorAll('.bgr-k').forEach(function (k) {
          var sub = k.querySelector('.fcard-h small'); var n = (k._h.merki || []).filter(function (m) { return !st[m[4]]; }).length;
          if (sub) sub.textContent = n ? tala(n, 'merki', 'merki') : 'engin merki';
          if (k.querySelector('canvas')) teikna(k, b);
        });
      };
    });
  }

  window.GattBgr = { eignHtml: eignHtml, lifga: lifga };
})();
