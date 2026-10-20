/* 474 — BÚNAÐARGREINING Á PRÓFÍLNUM (Agnar 19.10.2026, Álfhella 9)
 *
 * „Þetta er í raun alveg nýr feature — Búnaðargreining … reyna að stilla automatic greiningartakka fyrir þetta inn í
 * company profile" og „vista þessar niðurstöður á Álfhellu 9, svo þetta sé fast og þurfi ekki að leita aftur".
 *
 * Búnaður lesinn af samþykktum aðaluppdráttum (SLT/S/BS/BRSL …) + brunavarnatexti hönnuðar, VISTAÐ FAST í töflunni
 * `bunadargreining` (ein virk röð á fyrirtæki, sql/bunadargreining.sql). Spjaldið situr undir hæðaspjöldum Teikningar
 * (456, #co-fp-hdir) og sýnir: samantekt, athugasemdir, heimildir (gildandi / eldri útgáfa), brunavarnatextann orðrétt,
 * Skýrslu (PDF í Viðhengi, 111) og Prenta. Listinn yfir búnað hverrar hæðar er í 456 (merkin bera audkenni + stadur).
 *
 * TAKKI Í TAKKARÖÐINNI (20.10.2026): „Búnaðargreining" fyrir framan Teikning (Þjónustusamningur fór í ⋯-valmyndina, 405) — opnar greininguna í
 * glugga (prentun, skýrsla) eða setur hana af stað sé hún ekki til; grænt hak þegar hún er tilbúin. Greina búnað les táknin (SL/BS/R/ÚT/BO)
 * úr textalagi aðaluppdráttar hæðanna þegar engin merki eru komin (lesaUrTeikningu).
 *
 * „Greina búnað" (ekkert vistað) / „Greina aftur": tekur merkin sem eru á hæðum Teikningar (Nýtt-tillögur úr
 * SLT/BRSL-lestri TurboPaint, skráð tæki), gefur þeim auðkenni (S1…, BS1…) og stað (næsta rýmisheiti úr textalagi
 * vigur-PDF), dregur brunavarnir úr byggingarlýsingu (fasteign_greining, 468) og vistar nýja röð — sú gamla fær
 * fjarlaegt_at (saga helst, ekkert harðeytt). Merki sem bera audkenni/stadur halda þeim (handlesið vinnur).
 */
(function () {
  'use strict';
  if (window.__bunadargreining474) return;
  window.__bunadargreining474 = true;

  var ID = 'co-bgr';
  var ROT = '.bgr-rot';     // sama útlit á spjaldinu undir hæðunum (#co-bgr) og í glugganum (#bgr-glugga)
  var st = document.createElement('style');
  st.id = 'bunadargreining-474';
  st.textContent = [
    ROT + '{margin:0 12px 12px;background:#fff;border:1px solid #e3e1dc;border-radius:10px;font:500 12.5px/1.45 system-ui,sans-serif;color:#2b2a27}',
    'html[data-teikning="fellt"] #co-fp-section #' + ID + '{display:none!important}',
    ROT + ' .bgr-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid #efede8}',
    ROT + ' .bgr-h strong{font:700 13px system-ui,sans-serif;letter-spacing:.02em}',
    ROT + ' .bgr-h small{color:#7a766d}',
    ROT + ' .bgr-h em{font-style:normal;font:700 10px/18px system-ui,sans-serif;padding:0 7px;border-radius:9px;background:#fff3e0;color:#9a4a00;border:1px solid #f3c99a}',
    ROT + ' .bgr-h em.bgr-ok{background:#e8f5e9;color:#2e6b34;border-color:#a5d6a7}',
    ROT + ' .bgr-h i{flex:1}',
    ROT + ' .bgr-t{height:28px;padding:0 11px;border:1px solid #d6d3cc!important;border-radius:6px!important;background:#fff!important;color:#2b2a27!important;font:600 12px system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important;text-shadow:none!important}',
    ROT + ' .bgr-t:hover{border-color:#2b2a27}',
    ROT + ' .bgr-t.bgr-adal{background:#2b2a27!important;border-color:#2b2a27;color:#fff!important}',
    ROT + ' .bgr-t[disabled]{opacity:.55;cursor:default}',
    ROT + ' .bgr-b{padding:10px 12px 12px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 18px}',
    '@container (max-width:700px){' + ROT + ' .bgr-b{grid-template-columns:minmax(0,1fr)}}',
    ROT + ' .bgr-s{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}',
    ROT + ' .bgr-s b{display:inline-flex;align-items:baseline;gap:5px;padding:5px 10px;border:1px solid #e3e1dc;border-radius:8px;background:#faf9f6;font-weight:500}',
    ROT + ' .bgr-s b strong{font:700 17px/1 Georgia,serif}',
    ROT + ' h5{margin:0 0 4px;font:700 10.5px system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#7a766d}',
    ROT + ' ul{margin:0;padding-left:17px}',
    ROT + ' li{margin:0 0 3px}',
    ROT + ' .bgr-hf li.bgr-urelt{color:#8a857b;text-decoration:line-through;text-decoration-color:#c9c4ba}',
    ROT + ' .bgr-hf li small{display:block;color:#7a766d;text-decoration:none}',
    ROT + ' .bgr-tx{grid-column:1/-1;border-top:1px solid #efede8;padding-top:8px}',
    ROT + ' .bgr-tx[hidden]{display:none}',
    ROT + ' .bgr-tx section{margin:0 0 10px}',
    ROT + ' .bgr-tx h6{margin:8px 0 1px;font:700 12px system-ui,sans-serif;color:#7f0000}',
    ROT + ' .bgr-tx p{margin:0 0 3px;white-space:pre-line}',
    ROT + ' .bgr-tx p.bgr-lyk{background:#fff3e0;border-left:3px solid #e65100;padding:3px 7px}',
    ROT + ' .bgr-tx small{color:#7a766d}',
    ROT + ' .bgr-ut{grid-column:1/-1}',
    ROT + ' .bgr-ut ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:3px 18px}',
    ROT + ' .bgr-ut li{display:flex;gap:7px;align-items:baseline;min-width:0;margin:0}',
    ROT + ' .bgr-ut strong{flex:none;min-width:34px;padding:0 4px;border-radius:4px;background:#fff;border:1.5px solid #c93c1d;color:#c93c1d;font:700 10px/15px system-ui,sans-serif;text-align:center}',
    ROT + ' .bgr-ut strong.bgr-bs{border-color:#1f5fbf;color:#1f5fbf}',
    ROT + ' .bgr-ut small{font:inherit;min-width:0}',
    ROT + ' .bgr-ut em{font-style:normal;color:#7a766d}',
    // Teikning greiningarinnar („sér teikning", Agnar 19.10.2026): blöðin sem greiningin las, merkt — aðskilið Teikningu
    ROT + ' .bgr-bl{grid-column:1/-1}',
    ROT + ' .bgr-bl-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '@container (max-width:700px){' + ROT + ' .bgr-bl-g{grid-template-columns:minmax(0,1fr)}}',
    ROT + ' .bgr-k{border:1px solid #e3e1dc;border-radius:9px;overflow:hidden;background:#fff;cursor:pointer;min-width:0}',
    ROT + ' .bgr-k:hover{border-color:#2b2a27}',
    ROT + ' .bgr-kh{display:flex;justify-content:space-between;gap:6px;padding:6px 9px;border-bottom:1px solid #efede8;font:600 11.5px system-ui,sans-serif}',
    ROT + ' .bgr-kh small{font-weight:500;color:#7a766d;white-space:nowrap}',
    ROT + ' .bgr-km{position:relative;aspect-ratio:4/3;background:#f1f0ec}',
    ROT + ' .bgr-km canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}',
    ROT + ' .bgr-km .cfh-t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 11.5px system-ui,sans-serif;color:#8a857b}',
    ROT + ' .bgr-s b.bgr-fl{border-color:#a5d6a7;background:#f1f8f1}',
    ROT + ' .bgr-s b.bgr-bk{border-color:#ce93d8;background:#f8f1fa}',
    '#cfh-stort .cfh-s-l h4.bgr-fh{padding-top:14px}',
    ROT + ' .bgr-m{padding:10px 12px;color:#4a4740}',
    ROT + ' .bgr-m.bgr-villa{color:#a3261a}'
  ].join('\n');
  document.head.appendChild(st);

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var dags = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  var dagsTexti = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); };
  var SB = function () { return window.DB && DB.sb; };
  var TURBOPAINT = 'https://kjarni.vercel.app/kjarni/turbopaint';   // sama og 383 turboPaintSlod

  function saekja(cid) {
    return SB().from('bunadargreining').select('*').eq('company_id', cid).is('fjarlaegt_at', null).order('id', { ascending: false }).limit(1)
      .then(function (r) { if (r.error) throw r.error; return (r.data && r.data[0]) || null; });
  }

  function samantektHtml(r) {
    var s = r.samantekt || {}, tki = (r.tki || []).filter(function (t) { return !t.upplysingar; });
    var sl = s.slokkvitaeki != null ? s.slokkvitaeki : tki.filter(function (t) { return !/slang|kefli/i.test(t.bunadur || ''); }).length;
    var bs = s.slongur != null ? s.slongur : tki.filter(function (t) { return /slang|kefli/i.test(t.bunadur || ''); }).length;
    var utan = tki.filter(function (t) { return t.x == null; }).length;
    var m2 = function (v) {   // 3381.7 → 3.381,7 (íslenskt snið, án toLocaleString-gildrunnar)
      var n = Number(v); if (!isFinite(n)) return esc(v);
      var p = (Math.round(n * 10) / 10).toFixed(n % 1 ? 1 : 0).split('.');
      return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : '');
    };
    var hus = (s.mhl || []).map(function (m) { return '<b>Mhl ' + esc(m.mhl) + ' <strong>' + m2(m.m2) + '</strong> m² · ' + esc(m.haedir || '') + '</b>'; }).join('');
    // útgangar (ÚT) og brunaviðvörunarkerfi (Agnar 19.10.2026: „merkja inn neyðarútganga … brunakerfisteikningar/upplýsingar")
    var fl = s.utgangar != null ? '<b class="bgr-fl"><strong>' + s.utgangar + '</strong> útidyr' + (s.flottaleidir ? ' · ' + s.flottaleidir + ' flóttaleiðir innanhúss' : '') + '</b>' : '';
    var bk = [[s.reykskynjarar, 'reykskynjarar'], [s.hitaskynjarar, 'hitaskynjarar'], [s.handbodar, 'handboðar']].filter(function (x) { return x[0]; })
      .map(function (x) { return '<b class="bgr-bk"><strong>' + x[0] + '</strong> ' + x[1] + '</b>'; }).join('');
    return '<div class="bgr-s"><b><strong>' + sl + '</strong> handslökkvitæki</b><b><strong>' + bs + '</strong> slöngukefli</b>' + fl + bk +
      (utan ? '<b><strong>' + utan + '</strong> utan teikningar — staðsetja á staðnum</b>' : '') + hus + '</div>';
  }

  // flokkar staða: slökkvibúnaður (sjálfgefið), flotti (ÚT-merki), brunakerfi (skynjarar, handboðar, stjórnstöð)
  var FLOKKAR = [['slokkvibunadur', 'Slökkvibúnaður'], ['flotti', 'Útgangar (ÚT)'], ['brunakerfi', 'Brunaviðvörunarkerfi']];
  function flokkur(t) { return t.flokkur || 'slokkvibunadur'; }
  function litur(t) {
    var f = flokkur(t);
    return f === 'flotti' ? '#2e7d32' : f === 'brunakerfi' ? (/hita/i.test(t.bunadur || '') ? '#e65100' : '#8e24aa') : /slang|kefli/i.test(t.bunadur || '') ? '#1f5fbf' : '#c93c1d';
  }

  function textiHtml(r) {
    return (r.texti || []).map(function (t) {
      return '<section><h5>' + esc(t.titill || ('Mhl ' + t.mhl)) + '</h5>' + (t.kaflar || []).map(function (k) {
        return (k.fyrirsogn ? '<h6>' + esc(k.fyrirsogn) + '</h6>' : '') + String(k.texti || '').split('\n').map(function (p) {
          return '<p' + (k.lykill ? ' class="bgr-lyk"' : '') + '>' + esc(p) + '</p>';
        }).join('');
      }).join('') + '<small>' + esc(t.heimild || '') + '</small></section>';
    }).join('');
  }

  function teikna(el, cid, r) {
    if (!r) {
      el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><small>engin vistuð greining</small><i></i>' +
        '<button type="button" class="bgr-t bgr-adal" data-a="greina">Greina búnað</button></div>' +
        '<div class="bgr-m">Les búnaðinn sjálfvirkt úr textalagi samþykkts aðaluppdráttar hæða Teikningar (SL / SLT / HSL / HST, BS / BRSL, R, ÚT — skýringarnar á blaðinu ráða merkingunni) eða úr merkjum sem eru þegar á hæðunum. Gefur hverju tæki auðkenni og stað og vistar með brunavörnum úr byggingarlýsingu — fast á staðnum.</div>';
      return;
    }
    var ok = r.stada === 'yfirfarin';
    el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><em' + (ok ? ' class="bgr-ok"' : '') + '>' + (ok ? 'Yfirfarin' : 'Tillaga') + '</em>' +
      '<small>' + esc(dags(r.created_at)) + ' · ' + esc(r.af || '') + '</small><i></i>' +
      (r.skyrsla && r.skyrsla.path ? '<button type="button" class="bgr-t" data-a="skyrsla">Skýrsla (PDF)</button>' : '') +
      ((r.texti || []).length ? '<button type="button" class="bgr-t" data-a="texti">Brunavarnatexti</button>' : '') +
      '<button type="button" class="bgr-t" data-a="prenta" title="Samantekt, húsmynd og allar hæðir á einni síðu">Prenta · ein síða</button>' +
      '<button type="button" class="bgr-t" data-a="prenta-haedir" title="Samantekt á fyrstu síðu, svo hver hæð á sér blaði (stór hús)">Prenta · hver hæð sér</button>' +
      '<button type="button" class="bgr-t" data-a="greina" title="Ný greining úr merkjum Teikningar — sú vistaða geymist í sögunni">Greina aftur</button></div>' +
      '<div class="bgr-b">' + samantektHtml(r) + blodHtml(r) +
      ((r.athugasemdir || []).length ? '<div><h5>Athugasemdir</h5><ul>' + r.athugasemdir.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '') +
      ((r.heimildir || []).length ? '<div class="bgr-hf"><h5>Heimildir</h5><ul>' + r.heimildir.map(function (h) {
        return '<li' + (h.gildir === false ? ' class="bgr-urelt"' : '') + '>' + (h.slod ? '<a href="' + esc(h.slod) + '" target="_blank" rel="noopener">' + esc(h.titill) + '</a>' : esc(h.titill)) +
          (h.dags ? ' · ' + esc(dagsTexti(h.dags)) : '') + (h.athugasemd ? '<small>' + esc(h.athugasemd) + '</small>' : '') + '</li>';
      }).join('') + '</ul></div>' : '') +
      utanHtml(r) +
      '<div class="bgr-tx" hidden>' + textiHtml(r) + '</div></div>';
    teiknaBlod(el, r);
  }

  /* ── TEIKNING GREININGARINNAR — sér teikning (Agnar 19.10.2026: „að það merkist líka inn á sér teikningu" og „að svona
   * búnaðargreining sé svoldið sér, úr því sem stendur í gögnum/teikningum"). Blöðin sem greiningin las (r.teikningar:
   * {id, nafn, mynd, frum, skurdur}) með ÖLLUM stöðum hennar (tki[].blad + bx/by) — óháð því hvað er á Teikningu staðarins.
   * Teiknað með sama falli og hæðaspjöldin (456 TeiknForskodun.teikna). */
  // merkimidar: auðkenni brunakerfis (R1, HB3 …) teiknuð — aðeins í stóru sýninni (tugir skynjara kaffæra lítið spjald)
  function blodin(r, merkimidar) {
    return (r.teikningar || []).filter(function (b) { return b && b.mynd; }).map(function (b) {
      var tki = (r.tki || []).filter(function (t) { return t.blad === b.id && t.bx != null && isFinite(+t.bx); });
      return {
        id: b.id, nafn: b.nafn, heimild: b.heimild, image_url: b.mynd, frum: b.frum, skurdur: b.skurdur, tki: tki,
        markers: tki.map(function (t) {
          return { x: +t.bx, y: +t.by, audkenni: flokkur(t) === 'brunakerfi' && !merkimidar ? null : t.audkenni, tegund: t.bunadur, litur: litur(t) };
        })
      };
    });
  }
  function fjoldiTexti(tki) {
    var n = {}; tki.forEach(function (t) { n[flokkur(t)] = (n[flokkur(t)] || 0) + 1; });
    return [[n.slokkvibunadur, 'tæki'], [n.flotti, 'ÚT'], [n.brunakerfi, 'brunakerfi']].filter(function (x) { return x[0]; }).map(function (x) { return x[0] + ' ' + x[1]; }).join(' · ');
  }
  function blodHtml(r) {
    var bl = blodin(r);
    if (!bl.length) return '';
    return '<div class="bgr-bl"><h5>Teikning greiningarinnar — það sem gögnin segja</h5><div class="bgr-bl-g">' + bl.map(function (b, i) {
      return '<div class="bgr-k" data-bl="' + i + '" title="Stækka"><div class="bgr-kh"><b>' + esc(b.nafn) + '</b><small>' + fjoldiTexti(b.tki) + '</small></div>' +
        '<div class="bgr-km"><div class="cfh-t">…</div></div></div>';
    }).join('') + '</div></div>';
  }
  function teiknaBlod(el, r) {
    var tf = window.TeiknForskodun, bl = blodin(r);
    el.querySelectorAll('.bgr-k').forEach(function (k) {
      var b = bl[+k.getAttribute('data-bl')], m = k.querySelector('.bgr-km');
      if (!b || !m) return;
      if (!tf) { m.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; return; }
      var c = document.createElement('canvas');
      tf.teikna(b, c, 1100).then(function () { if (m.isConnected) { m.innerHTML = ''; m.appendChild(c); } },
        function () { if (m.isConnected) m.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; });
    });
  }
  function listiBlads(b) {
    return FLOKKAR.map(function (f, i) {
      var tki = b.tki.filter(function (t) { return flokkur(t) === f[0]; });
      if (!tki.length) return '';
      return (i ? '<h4 class="bgr-fh">' + esc(f[1]) + ' (' + tki.length + ')</h4>' : '') + '<ul class="cfh-l">' + tki.map(function (t) {
        return '<li><strong style="background:' + litur(t) + '">' + esc(t.audkenni || '•') + '</strong><small>' +
          (t.stadur ? esc(t.stadur) + ' <em>' + esc(t.tegund || t.bunadur || '') + (t.unitId ? ' · á Teikningu' : '') + '</em>' : esc(t.bunadur || t.tegund || '')) + '</small></li>';
      }).join('') + '</ul>';
    }).join('');
  }
  // stór sýn — sama umgjörð og stóra sýn hæðaspjaldanna (456 #cfh-stort; Esc lokar þar).
  // 20.10.2026 (Agnar: „enable zoom á scroll á músinni … filter til að slökkva á útgöngum merkingunum, default kveikt á öllum"):
  // músarhjól þysjar að bendlinum, dráttur færir (einnig tveir fingur á snertiskjá), tvísmellur núllstillir; sía á hvern flokk
  // (Slökkvibúnaður · ÚT · Brunakerfi) — sýnin er tímabundin (ekkert vistað), allt kveikt í hvert sinn sem glugginn opnast.
  function stortBlad(b) {
    var gamalt = document.getElementById('cfh-stort'); if (gamalt) gamalt.remove();
    var o = document.createElement('div');
    o.id = 'cfh-stort';
    var SIA = FLOKKAR.filter(function (f) { return b.tki.some(function (t) { return flokkur(t) === f[0]; }); });
    var kveikt = {}; SIA.forEach(function (f) { kveikt[f[0]] = true; });
    var sjaTki = function () { return b.tki.filter(function (t) { return kveikt[flokkur(t)] !== false; }); };
    var sjaB = function () {
      return Object.assign({}, b, { tki: sjaTki(), markers: b.markers.filter(function (m, i) { return kveikt[flokkur(b.tki[i])] !== false; }) });
    };
    var siuHtml = SIA.length > 1 ? '<span class="bgr-sia" role="group" aria-label="Sía">' + SIA.map(function (f) {
      return '<label><input type="checkbox" data-sia="' + f[0] + '" checked><i style="background:' + litur({ flokkur: f[0] }) + '"></i>' + esc(f[0] === 'slokkvibunadur' ? 'Slökkvibúnaður' : f[0] === 'flotti' ? 'ÚT' : 'Brunakerfi') + '</label>';
    }).join('') + '</span>' : '';
    o.innerHTML = '<div class="cfh-s-k" role="dialog" aria-modal="true" aria-label="' + esc(b.nafn) + '"><div class="cfh-s-h"><strong>' + esc(b.nafn) + '</strong><small>' + esc(b.heimild || '') + ' · teikning greiningarinnar</small>' +
      siuHtml + '<span style="flex:1"></span><span class="bgr-zk" aria-label="Aðdráttur"><button type="button" data-z="-" title="Minnka (músarhjól niður)">−</button><button type="button" data-z="0" title="Núllstilla (tvísmella)">100%</button><button type="button" data-z="+" title="Stækka (músarhjól upp)">+</button></span>' +
      '<button type="button" class="cfh-s-x" aria-label="Loka" title="Loka (Esc)">✕</button></div>' +
      '<div class="cfh-s-b"><div class="cfh-s-m bgr-zm"><div class="bgr-zl"><div class="cfh-t">…</div></div></div><div class="cfh-s-l"></div></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o) o.remove(); });
    o.querySelector('.cfh-s-x').addEventListener('click', function () { o.remove(); });
    var m = o.querySelector('.cfh-s-m'), zl = o.querySelector('.bgr-zl'), lis = o.querySelector('.cfh-s-l');
    var Z = { s: 1, x: 0, y: 0 };
    var beita = function () {
      var r = m.getBoundingClientRect();
      Z.x = Math.min(0, Math.max(r.width - r.width * Z.s, Z.x)); Z.y = Math.min(0, Math.max(r.height - r.height * Z.s, Z.y));
      if (Z.s <= 1.0001) { Z.s = 1; Z.x = 0; Z.y = 0; }
      zl.style.transform = 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')';
      var nu = o.querySelector('[data-z="0"]'); if (nu) nu.textContent = Math.round(Z.s * 100) + '%';
    };
    var thysja = function (f, px, py) {   // þysja um f að punkti (px, py) í m
      var ns = Math.min(12, Math.max(1, Z.s * f)); if (ns === Z.s) return;
      Z.x = px - (px - Z.x) * (ns / Z.s); Z.y = py - (py - Z.y) * (ns / Z.s); Z.s = ns; beita();
    };
    m.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = m.getBoundingClientRect();
      thysja(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    m.addEventListener('dblclick', function () { Z.s = 1; Z.x = 0; Z.y = 0; beita(); });
    o.querySelector('.bgr-zk').addEventListener('click', function (e) {
      var b2 = e.target.closest && e.target.closest('[data-z]'); if (!b2) return;
      var r = m.getBoundingClientRect(), z = b2.getAttribute('data-z');
      if (z === '0') { Z.s = 1; Z.x = 0; Z.y = 0; beita(); } else thysja(z === '+' ? 1.4 : 1 / 1.4, r.width / 2, r.height / 2);
    });
    // dráttur (ein hönd) + klípa (tveir fingur)
    var bendlar = {}, fyrriDist = 0;
    m.addEventListener('pointerdown', function (e) { bendlar[e.pointerId] = { x: e.clientX, y: e.clientY }; try { m.setPointerCapture(e.pointerId); } catch (_) {} fyrriDist = 0; m.classList.add('bgr-dregur'); });
    m.addEventListener('pointermove', function (e) {
      var p = bendlar[e.pointerId]; if (!p) return;
      var ids = Object.keys(bendlar);
      if (ids.length >= 2) {
        var a = bendlar[ids[0]], c = bendlar[ids[1]];
        if (e.pointerId == ids[0]) a = { x: e.clientX, y: e.clientY }; else if (e.pointerId == ids[1]) c = { x: e.clientX, y: e.clientY };
        var d = Math.hypot(a.x - c.x, a.y - c.y), r = m.getBoundingClientRect();
        if (fyrriDist) thysja(d / fyrriDist, (a.x + c.x) / 2 - r.left, (a.y + c.y) / 2 - r.top);
        fyrriDist = d;
      } else if (Z.s > 1) { Z.x += e.clientX - p.x; Z.y += e.clientY - p.y; beita(); }
      bendlar[e.pointerId] = { x: e.clientX, y: e.clientY };
    });
    var sleppa = function (e) { delete bendlar[e.pointerId]; fyrriDist = 0; if (!Object.keys(bendlar).length) m.classList.remove('bgr-dregur'); };
    m.addEventListener('pointerup', sleppa); m.addEventListener('pointercancel', sleppa);
    // teikning + listi (endurteiknað við síubreytingu; þysjunin helst)
    var seinast = 0;
    var teiknaAftur = function () {
      var bb = sjaB(), stefna = ++seinast;
      o.querySelector('.cfh-s-h strong').nextElementSibling.textContent = (b.heimild || '') + ' · teikning greiningarinnar';
      lis.innerHTML = '<h4>Skv. gögnum — ' + esc(fjoldiTexti(bb.tki)) + '</h4>' + listiBlads(bb);
      if (!window.TeiknForskodun) { zl.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; return; }
      var c = document.createElement('canvas');
      TeiknForskodun.teikna(bb, c, 2600).then(function () { if (stefna === seinast && zl.isConnected) { zl.innerHTML = ''; zl.appendChild(c); } },
        function () { if (stefna === seinast && zl.isConnected) zl.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; });
    };
    o.addEventListener('change', function (e) {
      var k = e.target && e.target.getAttribute && e.target.getAttribute('data-sia'); if (!k) return;
      kveikt[k] = !!e.target.checked; teiknaAftur();
    });
    teiknaAftur();
  }

  // Búnaður greiningarinnar sem er EKKI á Teikningu (enginn unitId): hönnunarstaðir án tækis, eða tæki sem textinn nefnir
  // en teikningin sýnir ekki. Það sem er á Teikningu sést í listanum við hverja hæð (456).
  function utanHtml(r) {
    var ut = (r.tki || []).filter(function (t) { return !t.unitId && !t.upplysingar; });
    if (!ut.length) return '';
    var allt = (r.tki || []).filter(function (t) { return !t.upplysingar; }).length;
    return '<div class="bgr-ut"><h5>Ekki á Teikningu — ' + ut.length + ' af ' + allt + (ut.length === allt ? ' (enginn búnaður kominn á teikninguna)' : '') + '</h5><ol>' + ut.map(function (t) {
      return '<li><strong' + (/slang|kefli/i.test(t.bunadur || '') ? ' class="bgr-bs"' : '') + '>' + esc(t.audkenni || '•') + '</strong><small>' +
        esc(t.stadur || '') + ' <em>' + esc([t.haed, t.tegund].filter(Boolean).join(' · ')) + '</em></small></li>';
    }).join('') + '</ol></div>';
  }

  /* ── FJÖLDI Á HÆÐ OG Í HEILD (forsíða skýrslunnar) ─────────────────────────────────────────────────────────── */
  function fjoldaTafla(r) {
    var tki = r.tki || [], haedir = [];
    tki.forEach(function (t) { if (t.haed && haedir.indexOf(t.haed) < 0) haedir.push(t.haed); });
    if (!haedir.length) haedir = [''];
    var FL = [
      ['Handslökkvitæki', '#c93c1d', function (t) { return !t.upplysingar && !/slang|kefli/i.test(t.bunadur || ''); }],
      ['Brunaslöngur / slöngukefli', '#1f5fbf', function (t) { return !t.upplysingar && /slang|kefli/i.test(t.bunadur || ''); }],
      ['Útgangar (ÚT)', '#2e7d32', function (t) { return flokkur(t) === 'flotti'; }],
      ['Reykskynjarar', '#8e24aa', function (t) { return /reykskynjari/i.test(t.bunadur || ''); }],
      ['Hitaskynjarar', '#e65100', function (t) { return /hitaskynjari/i.test(t.bunadur || ''); }],
      ['Handboðar', '#6a1b9a', function (t) { return /handboði/i.test(t.bunadur || ''); }],
      ['Stjórnstöð / útstöð („!“)', '#6a1b9a', function (t) { return flokkur(t) === 'brunakerfi' && /stjórnstöð|útstöð|„!“/i.test(t.bunadur || ''); }]
    ];
    var rod = FL.map(function (f) {
      var tal = haedir.map(function (h) { return tki.filter(function (t) { return (t.haed || '') === h && f[2](t); }).length; });
      return { nafn: f[0], litur: f[1], tal: tal, sam: tal.reduce(function (a, b) { return a + b; }, 0) };
    }).filter(function (x) { return x.sam > 0; });
    var sl = function (i) { return (rod[0] && rod[0].nafn === 'Handslökkvitæki' ? rod[0].tal[i] : 0) + ((rod[1] && /Brunaslöngur/.test(rod[1].nafn)) ? rod[1].tal[i] : 0); };
    return { haedir: haedir, rod: rod, sl: haedir.map(function (h, i) { return sl(i); }) };
  }
  function forsidaHtml(r, myndir, hus, ham) {
    var ft = fjoldaTafla(r), gild = (r.heimildir || []).filter(function (h) { return h.gildir !== false; })[0];
    var th = ft.haedir.length > 1 ? ft.haedir.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') : '';
    var slSam = ft.sl.reduce(function (a, b) { return a + b; }, 0);
    var tafla = '<table class="sam"><thead><tr><th>Búnaður</th>' + th + '<th>Samtals</th></tr></thead><tbody>' + ft.rod.map(function (x) {
      return '<tr><td><i style="background:' + x.litur + '"></i>' + esc(x.nafn) + '</td>' + (ft.haedir.length > 1 ? x.tal.map(function (n) { return '<td>' + (n || '–') + '</td>'; }).join('') : '') + '<td><b>' + x.sam + '</b></td></tr>';
    }).join('') + '<tr class="sl"><td>Slökkvibúnaður (tæki + slöngur)</td>' + (ft.haedir.length > 1 ? ft.sl.map(function (n) { return '<td>' + n + '</td>'; }).join('') : '') + '<td>' + slSam + '</td></tr></tbody></table>';
    // brunakerfið er oft af öðru blaði en aðaluppdrættinum (séruppdráttur rafhönnuðar, jafnvel eldri) — heimildin stendur þá á forsíðunni
    var bkH = (r.tki || []).filter(function (t) { return flokkur(t) === 'brunakerfi' && t.heimild && !/aðaluppdr/i.test(t.heimild); })[0];
    var bkLina = bkH ? '<p class="ath">Skynjarar og handboðar: ' + esc(String(bkH.heimild).replace(/.$/, '')) + '.</p>' : '';
    var till = (r.tki || []).filter(function (t) { return !t.upplysingar && /^Tillaga/i.test(t.heimild || ''); }).length;
    var tillLina = till ? '<p class="ath" style="color:#b71c1c"><b>' + till + ' handslökkvitæki eru TILLAGA</b> — ekki teiknuð á gildandi teikningu; staðfesta á staðnum.</p>' : '';
    var ath = (r.athugasemdir || []).filter(function (a) { return String(a).length <= 170; }).slice(0, 2).map(function (a) { return esc(a); }).join(' ');
    var adal = (myndir || []).filter(function (m) { return m && !m.bk; });
    var mynd1 = function (m) { return '<div class="fl"><img src="' + m.src + '" alt="' + esc(m.nafn) + '"></div>'; };
    var radir = [], k = 0;
    while (k < adal.length) {   // tvö há blöð (hlutfall > 0,7) hlið við hlið, breið blöð hvert undir öðru
      if (adal[k].ar > 0.7 && adal[k + 1] && adal[k + 1].ar > 0.7) { radir.push('<div class="fl-g" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + mynd1(adal[k]) + mynd1(adal[k + 1]) + '</div>'); k += 2; }
      else { radir.push(mynd1(adal[k])); k++; }
    }
    var fl = ham === 'haedir' ? '' : radir.join('');
    return '<section class="fors"><div class="fors-h"><div class="fors-t"><h1>' + esc(r.heimilisfang || '') + ' — búnaður</h1>' +
      '<div class="und">Samantekt' + (gild && gild.dags ? ' úr gildandi teikningu (' + esc(dagsTexti(gild.dags)) + ')' : '') + ' — lesið úr skjalinu sjálfu · ' + esc(dags(r.created_at)) + '</div>' + tafla +
      tillLina + (ath ? '<p class="ath">' + ath + '</p>' : '') + bkLina + '</div>' + (hus ? '<div class="fors-m"><img src="' + esc(hus) + '" alt="Húsið"></div>' : '') + '</div>' + fl + '</section>' +
      (ham === 'haedir' ? adal.map(function (m) {
        return '<section class="hae"><h2>' + esc(r.heimilisfang || '') + ' — ' + esc(m.nafn) + (m.fj ? ' <small>' + esc(m.fj) + '</small>' : '') + '</h2><img src="' + m.src + '" alt="' + esc(m.nafn) + '"></section>';
      }).join('') : '');
  }

  /* ── PRENTA: sama efni og vistaða skýrslan — tafla, hæðirnar með auðkennum, textinn ──────────────────────────── */
  function prenta(cid, r, ham) {
    var w = window.open('', '_blank');
    if (!w) { alert('Vafrinn lokaði glugganum — leyfðu sprettiglugga fyrir síðuna.'); return; }
    var husEl = document.querySelector('#companies-main .co-banner img'), hus = husEl ? (husEl.currentSrc || husEl.src || '') : '', husData = hus;
    // húsmyndin sem gagnaslóð — prentglugginn (about:blank) hleður ekki alltaf mynd af öðru léni áður en prentað er
    var husP = hus ? fetch(hus).then(function (x) { return x.ok ? x.blob() : Promise.reject(); }).then(function (bl) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(hus); }; fr.readAsDataURL(bl); });
    }).then(function (d) { husData = d; }, function () {}) : Promise.resolve();
    w.document.write('<!doctype html><meta charset="utf-8"><title>Búnaðargreining</title><p style="font:14px system-ui;padding:20px">Teikna hæðirnar…</p>');
    // blöð greiningarinnar sjálfrar ef til (sér teikning), annars hæðir Teikningar
    var bl = blodin(r, true);
    (bl.length ? Promise.resolve({ data: [{ haedir: bl }] }) : SB().from('teikning_bord').select('haedir').eq('company_id', cid).limit(1)).then(function (q) {
      var hs = (q && q.data && q.data[0] && q.data[0].haedir) || [];
      var tf = window.TeiknForskodun;
      return Promise.all(hs.map(function (h) {
        if (!tf || !h.image_url) return null;
        var c = document.createElement('canvas');
        return tf.teikna(h, c, 2400).then(function () { return { nafn: h.nafn, src: c.toDataURL('image/png'), ar: c.height / (c.width || 1), bk: /brunakerfi/i.test(h.nafn || ''), fj: h.tki ? fjoldiTexti(h.tki) : '' }; }, function () { return null; });
      })).then(function (m) { return husP.then(function () { return m; }); });
    }).then(function (myndir) {
      var tki = (r.tki || []);
      var linur = function (L) {
        return L.map(function (t) {
          return '<tr' + (t.upplysingar && flokkur(t) === 'slokkvibunadur' ? ' style="color:#888;font-style:italic"' : '') + '><td><b style="color:' + litur(t) + '">' + esc(t.audkenni || '') + '</b></td><td>' + esc(t.bunadur || '') + '</td><td>' + esc(t.haed || '') + '</td><td>' + esc(t.stadur || '') + '</td><td>' + esc(t.tegund || '') + '</td><td style="text-align:center">' + (t.upplysingar ? '' : '☐') + '</td></tr>';
        }).join('');
      };
      var haus = '<table><thead><tr><th>Merki</th><th>Búnaður</th><th>Hæð</th><th>Staðsetning</th><th>Tegund</th><th>Uppsett</th></tr></thead><tbody>';
      var rod = linur(tki.filter(function (t) { return flokkur(t) === 'slokkvibunadur'; }));
      var ut = tki.filter(function (t) { return flokkur(t) === 'flotti'; });
      var bk = tki.filter(function (t) { return flokkur(t) === 'brunakerfi'; });
      var SKYNJ = /^(Reykskynjari|Hitaskynjari|Brunahandboði)$/;
      // brunakerfið: stakir hlutir (stjórnstöð, útstöð …) í línum, skynjarar/handboðar talin eftir hæð — ekki 70 línur
      var bkTal = {}; bk.filter(function (t) { return SKYNJ.test(t.bunadur || ''); }).forEach(function (t) { var k = t.haed + '|' + t.bunadur; bkTal[k] = (bkTal[k] || 0) + 1; });
      var bkHtml = bk.length ? '<h2>Brunaviðvörunarkerfi</h2>' + (bk.some(function (t) { return !SKYNJ.test(t.bunadur || ''); }) ? haus + linur(bk.filter(function (t) { return !SKYNJ.test(t.bunadur || ''); })) + '</tbody></table>' : '') +
        (Object.keys(bkTal).length ? '<table style="margin-top:6px"><thead><tr><th>Hæð</th><th>Búnaður</th><th>Fjöldi á teikningu</th></tr></thead><tbody>' + Object.keys(bkTal).sort().map(function (k) {
          return '<tr><td>' + esc(k.split('|')[0]) + '</td><td>' + esc(k.split('|')[1]) + '</td><td>' + bkTal[k] + '</td></tr>';
        }).join('') + '</tbody></table><small>' + esc((bk.find(function (t) { return SKYNJ.test(t.bunadur || ''); }) || {}).heimild || '') + '</small>' : '') : '';
      var html = '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Búnaðargreining — ' + esc(r.heimilisfang || '') + '</title><style>' +
        '@page{size:A4;margin:14mm}body{font:10pt/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#1a1a1a;margin:0}h1{font:700 18pt Georgia,serif;margin:0}' +
        '.y{color:#b71c1c;font:600 8.5pt system-ui;letter-spacing:.08em;text-transform:uppercase}.haus{border-bottom:2.5px solid #b71c1c;padding-bottom:6px;margin-bottom:10px}' +
        'table{width:100%;border-collapse:collapse;font-size:9pt}th{background:#263238;color:#fff;text-align:left;padding:4px}td{border-bottom:1px solid #ddd;padding:3px 4px;vertical-align:top}' +
        'h2{font:700 13pt Georgia,serif;margin:14px 0 6px}h3{font-size:10pt;color:#7f0000;margin:8px 0 2px}p{margin:0 0 4px}.lyk{background:#fff3e0;border-left:3px solid #e65100;padding:3px 6px}' +
        '.mynd{break-inside:avoid;margin:10px 0;text-align:center}.mynd h2{text-align:left}.mynd img{max-width:100%;max-height:230mm;width:auto;height:auto;border:1px solid #ccc}small{color:#666}.dalkar{column-count:2;column-gap:7mm}' +
        '.fors{break-after:page}.fors-h{display:flex;gap:7mm;align-items:flex-start}.fors-t{flex:1 1 0;min-width:0}.fors-m{flex:0 0 35%}.fors-m img{width:100%;border:1px solid #888;display:block}' +
        '.fors h1{font:800 17pt system-ui,Segoe UI,Arial,sans-serif;margin:0 0 1mm}.fors .und{color:#666;font-size:8.5pt;margin-bottom:3mm}.sam{font-size:10pt;width:100%}.sam th{background:none;color:#111;border-bottom:2px solid #888;font-size:10pt;white-space:nowrap}.sam td{border:0;padding:2px 4px}.sam td:first-child{white-space:nowrap}.sam td i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:50%;margin-right:2.2mm;vertical-align:-0.5mm}.sam tr.sl td{border-top:2px solid #888;font-weight:700;color:#b71c1c;font-size:10.5pt;padding-top:3px;white-space:nowrap}.sam td b{font-size:10.5pt}.fors .ath{font-size:8pt;color:#555;margin:2mm 0 0}.fl{break-inside:avoid;margin-top:3mm}.hae{break-before:page;break-after:page}.hae h2{font:800 13pt system-ui,Segoe UI,Arial,sans-serif;margin:0 0 3mm}.hae h2 small{font:500 9pt system-ui;color:#666;margin-left:6px}.hae img{display:block;max-width:100%;max-height:238mm;width:auto;height:auto;margin:0 auto;border:1px solid #bbb}.fl-g{display:grid;gap:3mm;margin-top:3mm}.fl-g .fl{margin-top:0}.fl img{width:100%;border:1px solid #bbb;display:block}' +
        '</style></head><body>' + forsidaHtml(r, myndir, husData, ham) + '<div class="haus"><div class="y">Búnaðargreining · brunavarnir og staðsetning búnaðar</div><h1>' + esc(r.heimilisfang || '') + '</h1><small>' +
        esc(dags(r.created_at)) + ' · ' + esc(r.af || '') + ' · ' + (r.stada === 'yfirfarin' ? 'Yfirfarin' : 'Tillaga') + '</small></div>' +
        haus + rod + '</tbody></table>' +
        (ut.length ? '<h2>Útgangar (ÚT-merki)</h2>' + haus + linur(ut) + '</tbody></table>' : '') + bkHtml +
        ((r.athugasemdir || []).length ? '<h2>Athugasemdir</h2><ul>' + r.athugasemdir.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
        (myndir || []).filter(function (m) { return m && m.bk; }).map(function (m) { return '<div class="mynd"><h2>' + esc(m.nafn) + '</h2><img src="' + m.src + '"></div>'; }).join('') +
        (r.texti || []).map(function (t) {
          return '<h2>' + esc(t.titill || '') + '</h2><div class="dalkar">' + (t.kaflar || []).map(function (k) {
            return (k.fyrirsogn ? '<h3>' + esc(k.fyrirsogn) + '</h3>' : '') + String(k.texti || '').split('\n').map(function (p) { return '<p' + (k.lykill ? ' class="lyk"' : '') + '>' + esc(p) + '</p>'; }).join('');
          }).join('') + '</div><small>' + esc(t.heimild || '') + '</small>';
        }).join('') +
        '<p style="margin-top:14px"><small>Staðsetningar lesnar af samþykktum aðaluppdráttum og eru leiðbeinandi; endanlegt samþykki brunavarna er hjá hönnuði og slökkviliði.</small></p>' +
        '</body></html>';
      w.document.open(); w.document.write(html); w.document.close();
      setTimeout(function () { try { w.focus(); w.print(); } catch (_) {} }, 600);
    }).catch(function (e) { try { w.document.body.textContent = 'Villa: ' + ((e && e.message) || e); } catch (_) {} });
  }

  /* ── GREINA: merki Teikningar → auðkenni + staður → ný vistuð röð ────────────────────────────────────────────── */
  function erSlanga0(m) { return /slang|kefli/i.test(String(m.tegund || '')) || /^n:slanga:/.test(String(m.unitId || '')); }
  function erSkynjari0(m) { return /skynjar/i.test(String(m.tegund || '')) || /^n:(reyk|hita)/.test(String(m.unitId || '')); }

  // Rýmisheiti úr textalagi vigur-PDF (blaðið um teikn-pdf, 435 pdfSlodUrMynd); skönnun skilar engum orðum. Hnitin í
  // frumdílum hæðarinnar (frum.b á breidd síðunnar — 6000 px langhlið í PDF-teikningu, 6006 px JPEG Reykjavíkur).
  function rymisheiti(h) {
    try {
      var slod = window.TeiknGaedi && TeiknGaedi.pdfSlodUrMynd ? TeiknGaedi.pdfSlodUrMynd(h.image_url) : '';
      if (!slod || !window.pdfjsLib) return Promise.resolve([]);
      return pdfjsLib.getDocument(slod).promise.then(function (pdf) { return pdf.getPage(1); }).then(function (p) {
        var vp = p.getViewport({ scale: 1 }), k = h.frum && h.frum.b > 0 ? h.frum.b / vp.width : 6000 / Math.max(vp.width, vp.height);
        return p.getTextContent().then(function (tc) {
          return tc.items.map(function (it) {
            var t = String(it.str || '').trim(), x = it.transform[4], y = vp.height - it.transform[5];
            return { t: t, x: (x + (it.width || 0) / 2) * k, y: y * k };
          // rýmisheiti eru stutt („smiðja", „LAGER / GEYMSLA", „Lyfta") — setningar og athugasemdir („olíutunnar standa
          // á", „opið upp") og blaðtextar falla út
          }).filter(function (o) {
            return /[A-Za-zÁÉÍÓÚÝÞÆÖÐáéíóúýþæöð]{4,}/.test(o.t) && o.t.length <= 28 && o.t.split(/\s+/).length <= 3 &&
              !/^(slt|brsl|hsl|grunnmynd|teikning|mkv|dags|snið|útlit|afstöðumynd)/i.test(o.t) && !/opið|standa|grafin|skal |verður|sjá /i.test(o.t);
          });
        });
      }).catch(function () { return []; });
    } catch (_) { return Promise.resolve([]); }
  }

  /* ── LESA ÚR TEIKNINGUNNI (Agnar 20.10.2026, Suðurhella 5: „geturðu sett takka á profile sem gerir búnaðargreininguna") ──
   * Þegar engin tæki eru á hæðum Teikningar les takkinn táknin sjálf úr TEXTALAGI vigur-PDF aðaluppdráttarins (pdf.js):
   * SL/SLT/HSL/HST = handslökkvitæki, BS/BRSL = brunaslanga, R = reykskynjari, ÚT. Tákn sem skýringarnar
   * (legend) skilgreina ekki — SL, BS, R — eru aðeins lesin ef skýringin stendur á sama blaði („Handslökkvitæki",
   * „Brunaslanga" …), því sami stafur þýðir sitthvað eftir hönnuði (S = segulloki á sumum blöðum). Skýringarlínur sjálfar
   * (tákn með lýsingu hægra megin) eru ekki taldar. Skönnun án textalags skilar engu → tenglar á TurboPaint eins og áður.
   * Hæð án PDF-slóðar í image_url (hrein JPEG) fær h.pdf = {url, sida} svo textinn finnist. */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  function saekjaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise(function (res, rej) {
      var sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = function () { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = function () { rej(new Error('pdf.js hlóðst ekki')); };
      document.head.appendChild(sk);
    });
  }
  function pdfHeimild(h) {
    var slod = '', sida = 1;
    try {
      if (h.pdf && h.pdf.url) { slod = '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(h.pdf.url); sida = +h.pdf.sida || 1; }
      else if (h.image_url && window.TeiknGaedi && TeiknGaedi.pdfSlodUrMynd) {
        slod = TeiknGaedi.pdfSlodUrMynd(h.image_url);
        sida = parseInt(new URL(h.image_url, location.href).searchParams.get('sida'), 10) || 1;
      }
    } catch (_) {}
    return slod ? { slod: slod, sida: sida } : null;
  }
  // orð síðunnar með hnit í RAMMA hæðarinnar (frum.b á breidd síðunnar), snúningur síðunnar meðtalinn
  function ordSidu(src, frumB) {
    return saekjaPdfJs().then(function () { return pdfjsLib.getDocument(src.slod).promise; }).then(function (pdf) {
      return pdf.getPage(Math.min(pdf.numPages, Math.max(1, src.sida)));
    }).then(function (p) {
      var vp = p.getViewport({ scale: 1 }), k = frumB > 0 ? frumB / vp.width : 6000 / Math.max(vp.width, vp.height);
      return p.getTextContent().then(function (tc) {
        var ord = [];
        tc.items.forEach(function (it) {
          var s = String(it.str || ''), heil = s.trim(); if (!heil) return;
          var tx = pdfjsLib.Util.transform(vp.transform, it.transform), len = Math.hypot(tx[0], tx[1]) || 1, ux = tx[0] / len, uy = tx[1] / len;
          var w = (it.width || 0) * (vp.scale || 1), pos = 0;
          s.split(/(\s+)/).forEach(function (d) {
            if (d && d.trim()) { var f = ((pos + d.length / 2) / (s.length || 1)) * w; ord.push({ t: d.trim(), heil: heil, x: (tx[4] + ux * f) * k, y: (tx[5] + uy * f) * k }); }
            pos += d.length;
          });
        });
        return ord;
      });
    });
  }
  var KODI = /^(SLT|HSL|HST|SL|BRSL|BS|R|ÚT)$/;   // BO (björgunarop) ekki lesið — Agnar 20.10.2026: „þarf ekki að vera þarna“
  var RYMI_NAFN = /^(geymsla|lager|verkst|skrifst|smiðja|eldhús|kaffi|verslun|sýning|vörumót|þvotta|tækni|anddyri|gangur|salerni|snyrting|búnings|mötuneyti|fundar|móttaka|stigahús|bílageymsla|ræsting|smávörulager|vinnu)/i;
  function taknUrOrdum(ord) {
    var txt = ord.map(function (o) { return o.t; }).join(' ');
    var leg = { sl: /slökkvitæki/i.test(txt), slanga: /brunaslang|slöngukefli/i.test(txt), r: /reykskynjar/i.test(txt) };
    var lysing = ord.filter(function (o) { return /^(handslökkvitæki|slökkvitæki|brunaslanga|björgunarop|reykskynjari|merktur|útgangur)$/i.test(o.t); });
    var iSkyringu = function (o) { return lysing.some(function (l) { return Math.abs(l.y - o.y) < 22 && l.x > o.x && l.x - o.x < 600; }); };
    var rym = ord.filter(function (o) { return /^0\d{3}$/.test(o.t) || /^\d\d[.\-]\d\d$/.test(o.t); });
    var nofn = ord.filter(function (o) { return RYMI_NAFN.test(o.t) && o.t.length <= 28; });
    var stadurFyrir = function (o) {
      var r = null, bd = 1e9, n = null, nd = 1e9, p = [];
      rym.forEach(function (q) { var d = Math.abs(q.x - o.x) * 1.5 + Math.abs(q.y - o.y) * 0.5; if (d < bd) { bd = d; r = q; } });
      nofn.forEach(function (q) { var d = Math.hypot(q.x - o.x, q.y - o.y); if (d < nd) { nd = d; n = q; } });
      if (r && bd < 1800) p.push('rými ' + r.t);
      if (n && nd < 700) p.push(n.t.charAt(0).toUpperCase() + n.t.slice(1).toLowerCase());
      return p.length ? 'Nálægt: ' + p.join(' · ') : '';
    };
    var ut = [];
    ord.forEach(function (o) {
      if (!KODI.test(o.t) || !o.heil.split(/\s+/).every(function (w) { return KODI.test(w); }) || iSkyringu(o)) return;
      var f = /^(SLT|HSL|HST)$/.test(o.t) ? 'sl' : o.t === 'SL' ? (leg.sl ? 'sl' : null) : o.t === 'BRSL' ? 'slanga' : o.t === 'BS' ? (leg.slanga ? 'slanga' : null)
        : o.t === 'R' ? (leg.r ? 'r' : null) : 'ut';
      if (!f || ut.some(function (q) { return q.f === f && Math.hypot(q.x - o.x, q.y - o.y) < 12; })) return;
      ut.push({ f: f, kodi: o.t, x: o.x, y: o.y, stadur: stadurFyrir(o) });
    });
    // Rými: bilin eru jafnbreið og rýmisnúmerin standa í EINNI láréttri röð — taktu þá röð (≥ 3 númer) sem er næst miðgildi táknanna
    // og veldu númerið sem er næst í x. (Nálægasta númer í tvívídd valdi tæknirými í horni fyrir slöngu í öðru bili.)
    var rader = [];
    rym.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (q) {
      var r = rader[rader.length - 1];
      if (r && Math.abs(r.y - q.y) < 130) { r.l.push(q); r.y = (r.y * (r.l.length - 1) + q.y) / r.l.length; } else rader.push({ y: q.y, l: [q] });
    });
    var yMed = ut.length ? ut.map(function (t) { return t.y; }).sort(function (a, b) { return a - b; })[Math.floor(ut.length / 2)] : 0;
    var rod = null;
    rader.filter(function (r) { return r.l.length >= 3; }).forEach(function (r) { if (!rod || Math.abs(r.y - yMed) < Math.abs(rod.y - yMed)) rod = r; });
    if (rod) ut.forEach(function (t) {
      var q = null, bd = 1e9, n = null, nd = 1e9, p = [];
      rod.l.forEach(function (c) { var d = Math.abs(c.x - t.x); if (d < bd) { bd = d; q = c; } });
      nofn.forEach(function (c) { var d = Math.hypot(c.x - q.x, c.y - q.y); if (d < nd) { nd = d; n = c; } });
      p.push('rými ' + q.t);
      if (n && nd < 250) p.push(n.t.charAt(0).toUpperCase() + n.t.slice(1).toLowerCase());
      t.stadur = 'Nálægt: ' + p.join(' · ');
    });
    return { takn: ut, idnadur: /geymsl|lager|verkstæð|iðnað/i.test(txt) };
  }
  // tákn per hæð; sama síða á fleiri hæðum (t.d. tvær hæðir með ólíkan skurð) → táknið tilheyrir fyrstu hæð sem skurðurinn nær yfir
  function lesaUrTeikningu(hs) {
    var tekid = {};
    return hs.reduce(function (p, h, i) {
      return p.then(function (ut) {
        var src = pdfHeimild(h);
        if (!src) return ut.concat([{ i: i, takn: [], idnadur: false, utanPdf: true }]);
        return ordSidu(src, h.frum && h.frum.b).then(function (ord) {
          var r = taknUrOrdum(ord), s = h.skurdur, m = 60, key = src.slod + '#' + src.sida;
          r.takn = r.takn.filter(function (t) {
            if (s && (t.x < s.x - m || t.x > s.x + s.w + m || t.y < s.y - m || t.y > s.y + s.h + m)) return false;
            var id = key + '|' + t.f + '|' + Math.round(t.x) + '|' + Math.round(t.y); if (tekid[id]) return false; tekid[id] = 1; return true;
          });
          return ut.concat([{ i: i, takn: r.takn, idnadur: r.idnadur }]);
        }, function () { return ut.concat([{ i: i, takn: [], idnadur: false, villa: true }]); });
      });
    }, Promise.resolve([]));
  }

  function greinaUrTeikningu(el, cid, gamla, faerNy, bord, hs, villa) {
    var lesid;
    return lesaUrTeikningu(hs).then(function (rs) {
      lesid = rs;
      var fj = rs.reduce(function (n, r) { return n + r.takn.length; }, 0);
      if (!fj) {
        var e = new Error('Fann engin tákn (SL, BS, R, ÚT …) í textalagi teikningarinnar — hún er líklega skönnun. Lestu búnaðinn af henni í TurboPaint („Búnaður af teikningu" → „Vista í úttekt") eða dragðu tækin inn í Teikningu, og ýttu svo aftur á Greina búnað.');
        e.notanda = true;
        e.tenglar = hs.filter(function (h) { return h && h.id && h.image_url && !/^(blob|data):/.test(h.image_url); }).map(function (h) {
          var q = ['uttekt=' + encodeURIComponent(cid), 'haed=' + encodeURIComponent(h.id)];
          if (h.frum && h.frum.b) q.push('b=' + h.frum.b, 'h=' + h.frum.h);
          return { nafn: h.nafn || 'Hæð', slod: TURBOPAINT + '?' + q.join('&') };
        });
        throw e;
      }
      // skráð tæki á staðnum → ekki Nýtt-merki (annars tvítalning); hönnunarstaðir fara þá aðeins í greininguna („Ekki á Teikningu")
      return SB().from('uttaeki').select('id', { count: 'exact', head: true }).eq('fyrirtaeki_id', cid).then(function (q) { return (q && q.count) || 0; }, function () { return 0; });
    }).then(function (skrad) {
      var raun = [], rid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
      lesid.forEach(function (r) {
        var h = hs[r.i];
        r.takn.forEach(function (t) { raun.push({ i: r.i, h: h, t: t, idnadur: r.idnadur }); });
      });
      if (!skrad) {
        raun.forEach(function (o) {
          if (o.t.f !== 'sl' && o.t.f !== 'slanga') return;
          var teg = o.t.f === 'slanga' ? ['slanga', 'Brunaslanga'] : o.idnadur ? ['duft', 'Duft'] : ['lettvatn', 'Léttvatn'];
          o.m = { unitId: 'n:' + teg[0] + ':' + rid(), x: Math.round(o.t.x), y: Math.round(o.t.y), nytt: true, tegund: teg[1], stada: 'bid', stadur: o.t.stadur };
          (o.h.markers = o.h.markers || []).push(o.m);
        });
      }
      // auðkenni: S / BS í röð hæða og ofan frá; ÚT, R sér
      var tel = { sl: 0, slanga: 0, ut: 0, r: 0, bo: 0 }, FORSK = { sl: 'S', slanga: 'BS', ut: 'ÚT', r: 'R', bo: 'BO' };
      raun.slice().sort(function (a, b) { return a.i - b.i || a.t.y - b.t.y || a.t.x - b.t.x; }).forEach(function (o) { tel[o.t.f]++; o.audkenni = FORSK[o.t.f] + tel[o.t.f]; if (o.m) o.m.audkenni = o.audkenni; });
      var vistaBord = skrad ? Promise.resolve() : SB().from('teikning_bord').update({ haedir: hs, markers: (hs[0] && hs[0].markers) || [], updated_at: new Date().toISOString(), updated_by: 'Búnaðargreining' })
        .eq('company_id', cid).eq('updated_at', bord.updated_at).select('company_id').then(function (u) {
          if (u.error) throw u.error;
          if (!u.data || !u.data.length) throw Object.assign(new Error('Teikningunni var breytt á meðan — reyndu aftur.'), { notanda: true });
        });
      return vistaBord.then(function () { return { raun: raun, skrad: skrad, tel: tel }; });
    }).then(function (x) {
      return SB().from('fyrirtaeki').select('heimilisfang').eq('id', cid).maybeSingle().then(function (f) {
        var adr = (f && f.data && f.data.heimilisfang) || '';
        return SB().from('fasteign_greining').select('landnr,gogn').eq('tegund', 'eign').eq('gogn->>adr', adr).order('updated_at', { ascending: false }).limit(1)
          .then(function (g) { x.adr = adr; x.eign = (g && g.data && g.data[0]) || null; return x; }, function () { x.adr = adr; x.eign = null; return x; });
      });
    }).then(function (x) {
      var NAFN = { sl: 'Handslökkvitæki', slanga: 'Slöngukefli', ut: 'Útgangur (ÚT-merki)', r: 'Reykskynjari', bo: 'Björgunarop' };
      var tki = x.raun.map(function (o) {
        var e = { audkenni: o.audkenni, bunadur: NAFN[o.t.f], tegund: '', stadur: o.t.stadur || '', haed: o.h.nafn || '', haed_id: o.h.id || null, unitId: o.m ? o.m.unitId : null,
          x: Math.round(o.t.x), y: Math.round(o.t.y), bx: Math.round(o.t.x), by: Math.round(o.t.y), blad: o.h.id,
          heimild: 'Aðaluppdráttur (' + (o.h.nafn || 'hæð') + '), textalag PDF — „' + o.t.kodi + '"' };
        if (o.t.f === 'sl') e.tegund = (o.idnadur ? 'Duft 6 kg' : '6 L léttvatn') + ' (tillaga — teikningin tilgreinir ekki tegund)';
        else if (o.t.f === 'slanga') e.tegund = 'Slöngukefli (ÍST EN 671-1)';
        else { e.upplysingar = true; e.tegund = NAFN[o.t.f]; e.flokkur = o.t.f === 'r' ? 'brunakerfi' : 'flotti'; }
        return e;
      });
      var bv = x.eign && x.eign.gogn && x.eign.gogn.bygg && x.eign.gogn.bygg.brunavarnir, kaflar = [];
      if (bv && bv.efni) Object.keys(bv.efni).forEach(function (k) {
        var d = ((bv.efni[k] && bv.efni[k].daemi) || []).map(function (s) { return s && (s.setning || s); }).filter(function (s) { return typeof s === 'string' && s; });
        if (d.length) kaflar.push({ fyrirsogn: k.charAt(0).toUpperCase() + k.slice(1), texti: d.join('\n'), lykill: /slokkvi|slong/i.test(k) });
      });
      var med = x.raun.reduce(function (a, o) { a[o.i] = 1; return a; }, {});
      var rod = {
        company_id: cid, landnr: (x.eign && x.eign.landnr) || null, heimilisfang: x.adr, stada: 'tillaga', af: 'Búnaðargreining (sjálfvirk) — lesið úr textalagi aðaluppdráttar', tki: tki,
        texti: kaflar.length ? [{ mhl: '', titill: 'Brunavarnir úr byggingarlýsingu', heimild: 'Lesið sjálfvirkt — ' + (bv.heimild === 'textalag' ? 'textalag PDF' : 'OCR af skönnun, getur verið rangt lesið') + (bv.dags ? ', ' + dagsTexti(bv.dags) : ''), kaflar: kaflar }] : [],
        heimildir: bv && bv.slod ? [{ titill: 'Byggingarlýsing', dags: bv.dags || null, slod: bv.slod, gildir: true, athugasemd: 'Brunavarnatextinn' }] : [],
        athugasemdir: ['Táknin lesin sjálfvirkt úr textalagi teikningarinnar — yfirfara á teikningunni. Teikningin tilgreinir ekki tegund handslökkvitækja; tegundin er tillaga.']
          .concat(x.skrad ? ['Tæki eru skráð á staðinn (' + x.skrad + ') — hönnunarstaðirnir eru því ekki settir sem Nýtt-merki á Teikningu (tvítalning) heldur í greininguna („Ekki á Teikningu").'] : []),
        samantekt: { slokkvitaeki: x.tel.sl, slongur: x.tel.slanga, utgangar: x.tel.ut, reykskynjarar: x.tel.r, mhl: [] },
        teikningar: hs.filter(function (h, i) { return med[i] && h.image_url; }).map(function (h) {
          return { id: h.id, nafn: (h.nafn || 'Hæð') + ' — aðaluppdráttur', mynd: h.image_url, frum: h.frum, skurdur: h.skurdur, heimild: 'Textalag PDF' };
        })
      };
      var fyrst = gamla ? SB().from('bunadargreining').update({ fjarlaegt_at: new Date().toISOString(), fjarlaegt_af: 'Greina búnað (úr teikningu)' }).eq('id', gamla.id) : Promise.resolve({});
      return fyrst.then(function (f) { if (f && f.error) throw f.error; return SB().from('bunadargreining').insert(rod).select('*'); })
        .then(function (i) { if (i.error) throw i.error; return i.data[0]; });
    }).then(function (ny) {
      if (faerNy) faerNy(ny);
      teikna(el, cid, ny);
      try { if (window.TeiknForskodun && TeiknForskodun.endurnyja) TeiknForskodun.endurnyja(); } catch (_) {}
    }).catch(villa);
  }

  function greina(el, cid, gamla, faerNy) {
    var takki = el.querySelector('[data-a="greina"]');
    if (takki) { takki.disabled = true; takki.textContent = 'Greini…'; }
    var bord, taeki = {};
    var erSlanga = function (m) { var u = taeki[String(m.unitId)]; return erSlanga0(m) || !!(u && /slang|kefli/i.test(u.type || '')); };
    var erSkynjari = function (m) { var u = taeki[String(m.unitId)]; return erSkynjari0(m) || !!(u && /skynjar/i.test(u.type || '')); };
    var forskeyti = function (m) { return erSlanga(m) ? 'BS' : erSkynjari(m) ? 'R' : 'S'; };
    var villa = function (e) {
      if (takki) { takki.disabled = false; takki.textContent = gamla ? 'Greina aftur' : 'Greina búnað'; }
      var m = el.querySelector('.bgr-m') || el.appendChild(document.createElement('div'));
      m.className = 'bgr-m' + (e && e.notanda ? '' : ' bgr-villa'); m.textContent = (e && e.notanda ? '' : 'Villa: ') + ((e && e.message) || e);
      if (e && e.tenglar && e.tenglar.length) {
        var t = document.createElement('div'); t.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px';
        e.tenglar.forEach(function (x) {
          var a = document.createElement('a'); a.className = 'bgr-t'; a.href = x.slod; a.target = '_blank'; a.rel = 'noopener';
          a.style.cssText = 'display:inline-flex;align-items:center;text-decoration:none'; a.textContent = 'Lesa búnað í TurboPaint · ' + x.nafn;
          t.appendChild(a);
        });
        m.appendChild(t);
      }
    };
    SB().from('teikning_bord').select('haedir,markers,updated_at').eq('company_id', cid).limit(1).then(function (q) {
      if (q.error) throw q.error;
      bord = q.data && q.data[0];
      var hs = (bord && bord.haedir) || [];
      var allt = [];
      hs.forEach(function (h, i) { (h.markers || []).forEach(function (m) { if (m && m.kind !== 'sign' && isFinite(+m.x)) allt.push({ m: m, h: h, i: i }); }); });
      if (!allt.length) throw { lesa: true, hs: hs };   // engin merki enn → lesa táknin úr textalagi teikningarinnar (greinaUrTeikningu); finnist ekkert → tenglar á TurboPaint
      // skráð tæki: tegund + stærð + raðnúmer úr uttaeki — FYRIR auðkennin (skráð brunaslanga er BS, ekki S)
      var ids = allt.map(function (o) { return o.m.unitId; }).filter(function (u) { return /^\d+$/.test(String(u)); });
      return (ids.length ? SB().from('uttaeki').select('id,type,size,serial').in('id', ids).then(function (q) {
        ((q && q.data) || []).forEach(function (u) { taeki[String(u.id)] = u; });
      }, function () {}) : Promise.resolve()).then(function () { return { hs: hs, allt: allt }; });
    }).then(function (y) {
      var hs = y.hs, allt = y.allt;
      // auðkenni: haldið þar sem til, annars næsta laust númer per forskeyti, í röð hæða og svo ofan frá
      var naest = {};
      allt.forEach(function (o) { var mm = /^([A-Z]+)(\d+)$/.exec(String(o.m.audkenni || '')); if (mm) naest[mm[1]] = Math.max(naest[mm[1]] || 0, +mm[2]); });
      allt.slice().sort(function (a, b) { return a.i - b.i || a.m.y - b.m.y || a.m.x - b.m.x; }).forEach(function (o) {
        if (o.m.audkenni) return;
        var f = forskeyti(o.m); naest[f] = (naest[f] || 0) + 1; o.m.audkenni = f + naest[f];
      });
      return Promise.all(hs.map(function (h) {
        return (h.markers || []).some(function (m) { return m && m.kind !== 'sign' && !m.stadur; }) ? rymisheiti(h) : Promise.resolve([]);
      })).then(function (ordHaeda) {
        allt.forEach(function (o) {
          if (o.m.stadur) return;
          var bestur = null, bd = 1e9;
          (ordHaeda[o.i] || []).forEach(function (w) { var d = Math.hypot(w.x - o.m.x, w.y - o.m.y); if (d < bd) { bd = d; bestur = w; } });
          if (bestur && bd < 900) o.m.stadur = 'Nálægt: ' + bestur.t;
        });
        return allt;
      });
    }).then(function (allt) {
      // merkin fá auðkenni/stað — aðeins ef röðin er óbreytt síðan hún var lesin (ekkert yfirskrifað)
      var upd = { haedir: bord.haedir, markers: (bord.haedir[0] && bord.haedir[0].markers) || bord.markers || [], updated_at: new Date().toISOString(), updated_by: 'Búnaðargreining' };
      return SB().from('teikning_bord').update(upd).eq('company_id', cid).eq('updated_at', bord.updated_at).select('company_id').then(function (u) {
        if (u.error) throw u.error;
        if (!u.data || !u.data.length) throw Object.assign(new Error('Teikningunni var breytt á meðan — reyndu aftur.'), { notanda: true });
        return allt;
      });
    }).then(function (allt) {
      return SB().from('fyrirtaeki').select('heimilisfang').eq('id', cid).maybeSingle().then(function (f) {
        var adr = (f && f.data && f.data.heimilisfang) || '';
        return SB().from('fasteign_greining').select('landnr,gogn').eq('tegund', 'eign').eq('gogn->>adr', adr).order('updated_at', { ascending: false }).limit(1)
          .then(function (g) { return { adr: adr, eign: (g && g.data && g.data[0]) || null, allt: allt }; }, function () { return { adr: adr, eign: null, allt: allt }; });
      });
    }).then(function (x) {
      var lysa = function (m) {
        var u = taeki[String(m.unitId)];
        if (m.nytt) return (m.tegund || 'Nýtt') + ' · í bið';
        return u ? [u.type, u.size].filter(Boolean).join(' ') + (u.serial ? ' · #' + u.serial : '') : 'Skráð tæki';
      };
      var tki = x.allt.map(function (o) {
        return { audkenni: o.m.audkenni, bunadur: erSlanga(o.m) ? 'Slöngukefli' : erSkynjari(o.m) ? 'Reykskynjari' : 'Handslökkvitæki', tegund: lysa(o.m),
          stadur: o.m.stadur || '', haed: o.h.nafn || '', haed_id: o.h.id || null, unitId: o.m.unitId, x: Math.round(o.m.x), y: Math.round(o.m.y), heimild: 'Teikning (' + (o.h.nafn || 'hæð') + ')' };
      });
      // brunavarnir úr byggingarlýsingu (468: fasteign_greining 'eign' → gogn.bygg.brunavarnir.efni[k].daemi[].setning)
      var bv = x.eign && x.eign.gogn && x.eign.gogn.bygg && x.eign.gogn.bygg.brunavarnir;
      var kaflar = [];
      if (bv && bv.efni) Object.keys(bv.efni).forEach(function (k) {
        var d = ((bv.efni[k] && bv.efni[k].daemi) || []).map(function (s) { return s && (s.setning || s); }).filter(function (s) { return typeof s === 'string' && s; });
        if (d.length) kaflar.push({ fyrirsogn: k.charAt(0).toUpperCase() + k.slice(1), texti: d.join('\n'), lykill: /slokkvi|slong/i.test(k) });
      });
      var rod = {
        company_id: cid, landnr: (x.eign && x.eign.landnr) || null, heimilisfang: x.adr, stada: 'tillaga', af: 'Búnaðargreining (sjálfvirk)', tki: tki,
        texti: kaflar.length ? [{ mhl: '', titill: 'Brunavarnir úr byggingarlýsingu', heimild: 'Lesið sjálfvirkt — ' + (bv.heimild === 'textalag' ? 'textalag PDF' : 'OCR af skönnun, getur verið rangt lesið') + (bv.dags ? ', ' + dagsTexti(bv.dags) : ''), kaflar: kaflar }] : [],
        heimildir: bv && bv.slod ? [{ titill: 'Byggingarlýsing', dags: bv.dags || null, slod: bv.slod, gildir: true, athugasemd: 'Brunavarnatextinn' }] : [],
        athugasemdir: tki.some(function (t) { return !t.stadur; }) ? ['Sum tæki hafa engan stað — teikningin er skönnun án textalags; staðurinn sést á myndinni.'] : [],
        samantekt: { slokkvitaeki: tki.filter(function (t) { return t.bunadur === 'Handslökkvitæki'; }).length, slongur: tki.filter(function (t) { return t.bunadur === 'Slöngukefli'; }).length, mhl: [] }
      };
      if (gamla) {   // „Greina aftur" heldur því sem merki Teikningar bera ekki: ÚT/brunakerfi, hönnunarstaði utan Teikningar, texta, heimildir, blöð og skýrslu
        var nyAud = {}; rod.tki.forEach(function (t) { nyAud[t.audkenni] = 1; });
        rod.tki = rod.tki.concat((gamla.tki || []).filter(function (t) { return (t.upplysingar || !t.unitId) && !(t.audkenni && nyAud[t.audkenni]); }));
        if (!rod.texti.length) rod.texti = gamla.texti || [];
        if (!rod.heimildir.length) rod.heimildir = gamla.heimildir || [];
        if (!rod.athugasemdir.length) rod.athugasemdir = gamla.athugasemdir || [];
        rod.teikningar = gamla.teikningar || null; rod.skyrsla = gamla.skyrsla || null;
        rod.samantekt = Object.assign({}, gamla.samantekt || {}, rod.samantekt);
        var utanUppl = rod.tki.filter(function (t) { return !t.upplysingar; });
        rod.samantekt.slokkvitaeki = utanUppl.filter(function (t) { return !/slang|kefli/i.test(t.bunadur || ''); }).length;
        rod.samantekt.slongur = utanUppl.filter(function (t) { return /slang|kefli/i.test(t.bunadur || ''); }).length;
      }
      var fyrst = gamla ? SB().from('bunadargreining').update({ fjarlaegt_at: new Date().toISOString(), fjarlaegt_af: 'Greina aftur' }).eq('id', gamla.id) : Promise.resolve({});
      return fyrst.then(function (f) { if (f && f.error) throw f.error; return SB().from('bunadargreining').insert(rod).select('*'); })
        .then(function (i) { if (i.error) throw i.error; return i.data[0]; });
    }).then(function (ny) {
      if (faerNy) faerNy(ny);
      teikna(el, cid, ny);
      try { if (window.TeiknForskodun && TeiknForskodun.endurnyja) TeiknForskodun.endurnyja(); } catch (_) {}   // spjöldin 456 með auðkennum
    }).catch(function (e) {
      if (e && e.lesa) return greinaUrTeikningu(el, cid, gamla, faerNy, bord, e.hs, villa);
      villa(e);
    });
  }

  /* ── SAMEIGINLEG TENGING spjalds og glugga ─────────────────────────────────────────────────────────────────── */
  function tengja(el, cid, S) {   // S.rod = núverandi vistuð greining (eða null)
    el.addEventListener('click', function (e) {
      var kort = e.target.closest && e.target.closest('.bgr-k[data-bl]');
      if (kort && el.contains(kort) && S.rod) { var bl = blodin(S.rod, true)[+kort.getAttribute('data-bl')]; if (bl) stortBlad(bl); return; }
      var b = e.target.closest && e.target.closest('[data-a]');
      if (!b || !el.contains(b)) return;
      var a = b.getAttribute('data-a');
      if (a === 'texti') { var t = el.querySelector('.bgr-tx'); if (t) { t.hidden = !t.hidden; b.setAttribute('aria-pressed', String(!t.hidden)); } }
      else if (a === 'skyrsla' && S.rod && S.rod.skyrsla && window.CompanyAttachments) CompanyAttachments.openPreview(Object.assign({ content_type: 'application/pdf' }, S.rod.skyrsla));
      else if (a === 'prenta' && S.rod) prenta(cid, S.rod, 'ein');
      else if (a === 'prenta-haedir' && S.rod) prenta(cid, S.rod, 'haedir');
      else if (a === 'greina') greina(el, cid, S.rod, function (ny) { S.rod = ny; uppfaert(cid, ny, el); });
    });
  }
  // greining varð til/breyttist (úr spjaldinu eða glugganum) → hitt og takkinn fylgja með
  function uppfaert(cid, ny, fra) {
    var inl = document.getElementById(ID);
    if (inl && inl !== fra && inl._cid === String(cid) && inl._S) { inl._S.rod = ny; teikna(inl, cid, ny); }
    merkjaTakka(cid, ny);
  }

  function smida(sec, cid) {
    var el = document.createElement('div');
    el.id = ID; el.className = 'bgr-rot';
    el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><small>sæki…</small></div>';
    var g = sec.querySelector('#co-fp-hdir');
    if (g && g.parentNode === sec) sec.insertBefore(el, g.nextSibling); else sec.appendChild(el);
    var S = { rod: null }; el._S = S;
    tengja(el, cid, S);
    saekja(cid).then(function (r) {
      if (String(window._currentCompanyId) !== String(cid) || !el.isConnected) return;
      S.rod = r; teikna(el, cid, r); merkjaTakka(cid, r);
    }, function () { el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><small>náðist ekki að sækja</small></div>'; });
  }

  /* ── TAKKI Í TAKKARÖÐ PRÓFÍLSINS + GLUGGI (Agnar 20.10.2026: „setja búnaðargreininguna í staðinn" fyrir Þjónustusamning,
   * „annaðhvort setur þá kerfið greininguna af stað eða opnar hana ef hún er til, grænt checkmark ef hún er tilbúin, síðan
   * opnast glugginn með þessu og maður getur prentað út"). Takkinn situr fyrir framan Teikning-takkann; Þjónustusamningur
   * er kominn í ⋯-valmyndina (405). Glugginn hýsir sama spjald og undir hæðunum (Skýrsla · Brunavarnatexti · Prenta · Greina aftur). */
  var TAKKI = 'bgr-takki', GLUGGI = 'bgr-glugga';
  var vitad = {};   // cid → true/false: er virk greining til (fyllist þegar spjaldið eða takkinn hefur spurt)
  function merkjaTakka(cid, r) {
    vitad[String(cid)] = !!r;
    var b = document.getElementById(TAKKI);
    if (b && b._cid === String(cid)) stillaTakka(b);
  }
  function stillaTakka(b) {
    var til = vitad[b._cid];
    var hak = b.querySelector('.bgr-hak'); if (hak) hak.hidden = !til;
    b.title = til ? 'Búnaðargreining tilbúin — opna (skoða, prenta)' : 'Búnaðargreining — lesa búnaðinn úr teikningunni og vista';
    b.setAttribute('data-til', til ? '1' : '0');
  }
  function ensureTakki() {
    var cid = window._currentCompanyId, main = document.getElementById('companies-main');
    if (!main || !cid || !window.DB || !DB.sb) return;
    var gamall = document.getElementById(TAKKI);
    if (gamall && gamall._cid === String(cid) && gamall.isConnected) return;
    if (gamall) gamall.remove();
    var teikn = Array.prototype.slice.call(main.querySelectorAll('button[onclick]')).filter(function (b) {
      var on = b.getAttribute('onclick') || '';
      return /FloorPlan\.open|opnaTeikningu/.test(on) && /^\s*\S*\s*Teikning\s*$/.test((b.textContent || '').replace(/\s+/g, ' ').trim());
    })[0];
    if (!teikn || !teikn.parentNode) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = TAKKI; b._cid = String(cid);
    b.className = teikn.className.replace(/\bb405-orig\b/, '').trim();
    var stil = teikn.getAttribute('style'); if (stil) b.setAttribute('style', stil);
    b.innerHTML = '<span class="bgr-tk-t">Búnaðargreining</span><i class="bgr-hak" hidden aria-label="tilbúin"></i>';
    b.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); glugga(b._cid); });
    teikn.parentNode.insertBefore(b, teikn);
    stillaTakka(b);
    if (vitad[b._cid] === undefined) {
      SB().from('bunadargreining').select('id').eq('company_id', cid).is('fjarlaegt_at', null).limit(1).then(function (q) {
        if (!q.error) merkjaTakka(cid, (q.data && q.data[0]) || null);
      });
    }
  }

  function glugga(cid) {
    var gamalt = document.getElementById(GLUGGI); if (gamalt) gamalt.remove();
    var o = document.createElement('div'); o.id = GLUGGI;
    o.innerHTML = '<div class="bgr-g-k" role="dialog" aria-modal="true" aria-label="Búnaðargreining"><div class="bgr-g-h"><strong>Búnaðargreining</strong><span style="flex:1"></span>' +
      '<button type="button" class="bgr-g-x" aria-label="Loka" title="Loka (Esc)">Loka</button></div><div class="bgr-g-b"><div class="bgr-rot bgr-g-m"><div class="bgr-m">Sæki…</div></div></div></div>';
    document.body.appendChild(o);
    var loka = function () { o.remove(); document.removeEventListener('keydown', esc, true); };
    var esc = function (e) { if (e.key === 'Escape' && !document.getElementById('cfh-stort')) { e.stopPropagation(); loka(); } };
    document.addEventListener('keydown', esc, true);
    o.addEventListener('click', function (e) { if (e.target === o) loka(); });
    o.querySelector('.bgr-g-x').addEventListener('click', loka);
    var m = o.querySelector('.bgr-g-m'), S = { rod: null };
    tengja(m, cid, S);
    saekja(cid).then(function (r) {
      if (!o.isConnected) return;
      S.rod = r; merkjaTakka(cid, r);
      teikna(m, cid, r);
      // engin greining enn → kerfið setur hana af stað strax (lesið úr teikningunni), glugginn sýnir svo útkomuna
      if (!r) { var t = m.querySelector('[data-a="greina"]'); if (t) t.click(); }
    }, function () { m.innerHTML = '<div class="bgr-m bgr-villa">Náðist ekki að sækja greininguna.</div>'; });
  }

  // CSS: takki + gluggi
  (function () {
    var s2 = document.createElement('style'); s2.id = 'bunadargreining-474-glugga';
    s2.textContent = [
      '#' + TAKKI + ' .bgr-hak{display:inline-block;width:14px;height:14px;border-radius:50%;background:#2e9d4f;margin-left:7px;position:relative;vertical-align:-2px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}',
      '#' + TAKKI + ' .bgr-hak[hidden]{display:none}',
      '#' + TAKKI + ' .bgr-hak::after{content:"";position:absolute;left:4.5px;top:2px;width:3px;height:6px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}',
      '#' + GLUGGI + '{position:fixed;inset:0;z-index:9000;background:rgba(20,18,15,.72);display:flex;align-items:center;justify-content:center;padding:16px}',
      '#' + GLUGGI + ' .bgr-g-k{background:#fff;border-radius:12px;width:min(1180px,100%);max-height:min(94vh,1100px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35)}',
      '#' + GLUGGI + ' .bgr-g-h{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #e3e1dc;font:700 14px system-ui,sans-serif;color:#2b2a27}',
      '#' + GLUGGI + ' .bgr-g-x{height:28px;padding:0 12px;border:1px solid #d6d3cc!important;border-radius:6px!important;background:#fff!important;color:#2b2a27!important;font:600 12px system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important}',
      '#' + GLUGGI + ' .bgr-g-b{overflow:auto;container-type:inline-size;padding:12px}',
      '#' + GLUGGI + ' .bgr-g-m{margin:0!important;border:0!important;border-radius:0!important}',
      // stór sýn teikningar greiningarinnar: þysjun, dráttur, sía
      '#cfh-stort .cfh-s-m.bgr-zm{overflow:hidden;cursor:grab;touch-action:none;user-select:none}',
      '#cfh-stort .cfh-s-m.bgr-dregur{cursor:grabbing}',
      '#cfh-stort .bgr-zl{position:absolute;inset:0;transform-origin:0 0;will-change:transform}',
      '#cfh-stort .bgr-sia{display:inline-flex;gap:12px;margin-left:12px;flex-wrap:wrap}',
      '#cfh-stort .bgr-sia label{display:inline-flex;align-items:center;gap:5px;font:600 12px system-ui,sans-serif;cursor:pointer;color:#2b2a27}',
      '#cfh-stort .bgr-sia i{width:10px;height:10px;border-radius:50%;display:inline-block}',
      '#cfh-stort .bgr-zk{display:inline-flex;gap:4px}',
      '#cfh-stort .bgr-zk button{min-width:30px;height:26px;padding:0 8px;border:1px solid #d6d3cc!important;border-radius:6px!important;background:#fff!important;color:#2b2a27!important;font:600 12px system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important}'
    ].join('\n');
    document.head.appendChild(s2);
  })();

  // Spjaldið fer undir hæðaspjöldin (456) — bíður þess að þau séu komin; endursmíðað með borðanum
  function athuga() {
    try { ensureTakki(); } catch (e) { console.error('[474 takki]', e); }
    var sec = document.getElementById('co-fp-section');
    var cid = window._currentCompanyId;
    var g = sec && sec.querySelector('#co-fp-hdir');
    if (!sec || !cid || !window.DB || !DB.sb || !g) return;
    var til = sec.querySelector('#' + ID);
    if (til && til._cid === String(cid)) {
      // 456 endursmíðaði spjöldin (eftir greiningu) — spjaldið okkar á að vera beint á eftir þeim; aðeins okkar hnútur færist
      if (til.previousElementSibling !== g && g.parentNode === sec) sec.insertBefore(til, g.nextSibling);
      return;
    }
    if (til) til.remove();
    smida(sec, cid);
    var ny = sec.querySelector('#' + ID); if (ny) ny._cid = String(cid);
  }
  var bidur = null;
  new MutationObserver(function () { if (!bidur) bidur = setTimeout(function () { bidur = null; athuga(); }, 120); })
    .observe(document.documentElement, { childList: true, subtree: true });
  setInterval(athuga, 1500);
  athuga();
})();
