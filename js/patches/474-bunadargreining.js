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
  var st = document.createElement('style');
  st.id = 'bunadargreining-474';
  st.textContent = [
    '#' + ID + '{margin:0 12px 12px;background:#fff;border:1px solid #e3e1dc;border-radius:10px;font:500 12.5px/1.45 system-ui,sans-serif;color:#2b2a27}',
    'html[data-teikning="fellt"] #co-fp-section #' + ID + '{display:none!important}',
    '#' + ID + ' .bgr-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid #efede8}',
    '#' + ID + ' .bgr-h strong{font:700 13px system-ui,sans-serif;letter-spacing:.02em}',
    '#' + ID + ' .bgr-h small{color:#7a766d}',
    '#' + ID + ' .bgr-h em{font-style:normal;font:700 10px/18px system-ui,sans-serif;padding:0 7px;border-radius:9px;background:#fff3e0;color:#9a4a00;border:1px solid #f3c99a}',
    '#' + ID + ' .bgr-h em.bgr-ok{background:#e8f5e9;color:#2e6b34;border-color:#a5d6a7}',
    '#' + ID + ' .bgr-h i{flex:1}',
    '#' + ID + ' .bgr-t{height:28px;padding:0 11px;border:1px solid #d6d3cc!important;border-radius:6px!important;background:#fff!important;color:#2b2a27!important;font:600 12px system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important;text-shadow:none!important}',
    '#' + ID + ' .bgr-t:hover{border-color:#2b2a27}',
    '#' + ID + ' .bgr-t.bgr-adal{background:#2b2a27!important;border-color:#2b2a27;color:#fff!important}',
    '#' + ID + ' .bgr-t[disabled]{opacity:.55;cursor:default}',
    '#' + ID + ' .bgr-b{padding:10px 12px 12px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 18px}',
    '@container (max-width:700px){#' + ID + ' .bgr-b{grid-template-columns:minmax(0,1fr)}}',
    '#' + ID + ' .bgr-s{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}',
    '#' + ID + ' .bgr-s b{display:inline-flex;align-items:baseline;gap:5px;padding:5px 10px;border:1px solid #e3e1dc;border-radius:8px;background:#faf9f6;font-weight:500}',
    '#' + ID + ' .bgr-s b strong{font:700 17px/1 Georgia,serif}',
    '#' + ID + ' h5{margin:0 0 4px;font:700 10.5px system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#7a766d}',
    '#' + ID + ' ul{margin:0;padding-left:17px}',
    '#' + ID + ' li{margin:0 0 3px}',
    '#' + ID + ' .bgr-hf li.bgr-urelt{color:#8a857b;text-decoration:line-through;text-decoration-color:#c9c4ba}',
    '#' + ID + ' .bgr-hf li small{display:block;color:#7a766d;text-decoration:none}',
    '#' + ID + ' .bgr-tx{grid-column:1/-1;border-top:1px solid #efede8;padding-top:8px}',
    '#' + ID + ' .bgr-tx[hidden]{display:none}',
    '#' + ID + ' .bgr-tx section{margin:0 0 10px}',
    '#' + ID + ' .bgr-tx h6{margin:8px 0 1px;font:700 12px system-ui,sans-serif;color:#7f0000}',
    '#' + ID + ' .bgr-tx p{margin:0 0 3px;white-space:pre-line}',
    '#' + ID + ' .bgr-tx p.bgr-lyk{background:#fff3e0;border-left:3px solid #e65100;padding:3px 7px}',
    '#' + ID + ' .bgr-tx small{color:#7a766d}',
    '#' + ID + ' .bgr-ut{grid-column:1/-1}',
    '#' + ID + ' .bgr-ut ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:3px 18px}',
    '#' + ID + ' .bgr-ut li{display:flex;gap:7px;align-items:baseline;min-width:0;margin:0}',
    '#' + ID + ' .bgr-ut strong{flex:none;min-width:34px;padding:0 4px;border-radius:4px;background:#fff;border:1.5px solid #c93c1d;color:#c93c1d;font:700 10px/15px system-ui,sans-serif;text-align:center}',
    '#' + ID + ' .bgr-ut strong.bgr-bs{border-color:#1f5fbf;color:#1f5fbf}',
    '#' + ID + ' .bgr-ut small{font:inherit;min-width:0}',
    '#' + ID + ' .bgr-ut em{font-style:normal;color:#7a766d}',
    // Teikning greiningarinnar („sér teikning", Agnar 19.10.2026): blöðin sem greiningin las, merkt — aðskilið Teikningu
    '#' + ID + ' .bgr-bl{grid-column:1/-1}',
    '#' + ID + ' .bgr-bl-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '@container (max-width:700px){#' + ID + ' .bgr-bl-g{grid-template-columns:minmax(0,1fr)}}',
    '#' + ID + ' .bgr-k{border:1px solid #e3e1dc;border-radius:9px;overflow:hidden;background:#fff;cursor:pointer;min-width:0}',
    '#' + ID + ' .bgr-k:hover{border-color:#2b2a27}',
    '#' + ID + ' .bgr-kh{display:flex;justify-content:space-between;gap:6px;padding:6px 9px;border-bottom:1px solid #efede8;font:600 11.5px system-ui,sans-serif}',
    '#' + ID + ' .bgr-kh small{font-weight:500;color:#7a766d;white-space:nowrap}',
    '#' + ID + ' .bgr-km{position:relative;aspect-ratio:4/3;background:#f1f0ec}',
    '#' + ID + ' .bgr-km canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}',
    '#' + ID + ' .bgr-km .cfh-t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 11.5px system-ui,sans-serif;color:#8a857b}',
    '#' + ID + ' .bgr-m{padding:10px 12px;color:#4a4740}',
    '#' + ID + ' .bgr-m.bgr-villa{color:#a3261a}'
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
    return '<div class="bgr-s"><b><strong>' + sl + '</strong> handslökkvitæki</b><b><strong>' + bs + '</strong> slöngukefli</b>' +
      (utan ? '<b><strong>' + utan + '</strong> utan teikningar — staðsetja á staðnum</b>' : '') + hus + '</div>';
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
        '<div class="bgr-m">Les búnaðinn af hæðum Teikningar (SLT / S / BS / BRSL úr TurboPaint-lestri eða dregin inn), gefur hverju tæki auðkenni og stað, og vistar með brunavörnum úr byggingarlýsingu — fast á staðnum.</div>';
      return;
    }
    var ok = r.stada === 'yfirfarin';
    el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><em' + (ok ? ' class="bgr-ok"' : '') + '>' + (ok ? 'Yfirfarin' : 'Tillaga') + '</em>' +
      '<small>' + esc(dags(r.created_at)) + ' · ' + esc(r.af || '') + '</small><i></i>' +
      (r.skyrsla && r.skyrsla.path ? '<button type="button" class="bgr-t" data-a="skyrsla">Skýrsla (PDF)</button>' : '') +
      ((r.texti || []).length ? '<button type="button" class="bgr-t" data-a="texti">Brunavarnatexti</button>' : '') +
      '<button type="button" class="bgr-t" data-a="prenta">Prenta</button>' +
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
  function blodin(r) {
    return (r.teikningar || []).filter(function (b) { return b && b.mynd; }).map(function (b) {
      return {
        id: b.id, nafn: b.nafn, heimild: b.heimild, image_url: b.mynd, frum: b.frum, skurdur: b.skurdur,
        tki: (r.tki || []).filter(function (t) { return t.blad === b.id && isFinite(+t.bx) && t.bx !== null; }),
        markers: (r.tki || []).filter(function (t) { return t.blad === b.id && t.bx != null && isFinite(+t.bx); }).map(function (t) {
          return { x: +t.bx, y: +t.by, audkenni: t.audkenni, tegund: t.bunadur,
            litur: t.upplysingar ? '#8e24aa' : /slang|kefli/i.test(t.bunadur || '') ? '#1f5fbf' : '#c93c1d' };
        })
      };
    });
  }
  function blodHtml(r) {
    var bl = blodin(r);
    if (!bl.length) return '';
    return '<div class="bgr-bl"><h5>Teikning greiningarinnar — það sem gögnin segja</h5><div class="bgr-bl-g">' + bl.map(function (b, i) {
      return '<div class="bgr-k" data-bl="' + i + '" title="Stækka"><div class="bgr-kh"><b>' + esc(b.nafn) + '</b><small>' + b.tki.length + ' staðir</small></div>' +
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
    return '<ul class="cfh-l">' + b.tki.map(function (t) {
      return '<li><strong' + (/slang|kefli/i.test(t.bunadur || '') ? ' class="cfh-bs"' : '') + (t.upplysingar ? ' style="background:#8e24aa"' : '') + '>' + esc(t.audkenni || '•') + '</strong><small>' +
        esc(t.stadur || '') + ' <em>' + esc(t.tegund || t.bunadur || '') + (t.unitId ? ' · á Teikningu' : '') + '</em></small></li>';
    }).join('') + '</ul>';
  }
  // stór sýn — sama umgjörð og stóra sýn hæðaspjaldanna (456 #cfh-stort; Esc lokar þar)
  function stortBlad(b) {
    var gamalt = document.getElementById('cfh-stort'); if (gamalt) gamalt.remove();
    var o = document.createElement('div');
    o.id = 'cfh-stort';
    o.innerHTML = '<div class="cfh-s-k" role="dialog" aria-modal="true" aria-label="' + esc(b.nafn) + '"><div class="cfh-s-h"><strong>' + esc(b.nafn) + '</strong><small>' + esc(b.heimild || '') + ' · teikning greiningarinnar</small>' +
      '<span style="flex:1"></span><button type="button" class="cfh-s-x" aria-label="Loka" title="Loka (Esc)">✕</button></div>' +
      '<div class="cfh-s-b"><div class="cfh-s-m"><div class="cfh-t">…</div></div><div class="cfh-s-l"><h4>Búnaður skv. gögnum (' + b.tki.length + ')</h4>' + listiBlads(b) + '</div></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o) o.remove(); });
    o.querySelector('.cfh-s-x').addEventListener('click', function () { o.remove(); });
    var m = o.querySelector('.cfh-s-m'), c = document.createElement('canvas');
    if (window.TeiknForskodun) TeiknForskodun.teikna(b, c, 2600).then(function () { if (m.isConnected) { m.innerHTML = ''; m.appendChild(c); } },
      function () { if (m.isConnected) m.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; });
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

  /* ── PRENTA: sama efni og vistaða skýrslan — tafla, hæðirnar með auðkennum, textinn ──────────────────────────── */
  function prenta(cid, r) {
    var w = window.open('', '_blank');
    if (!w) { alert('Vafrinn lokaði glugganum — leyfðu sprettiglugga fyrir síðuna.'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Búnaðargreining</title><p style="font:14px system-ui;padding:20px">Teikna hæðirnar…</p>');
    // blöð greiningarinnar sjálfrar ef til (sér teikning), annars hæðir Teikningar
    var bl = blodin(r);
    (bl.length ? Promise.resolve({ data: [{ haedir: bl }] }) : SB().from('teikning_bord').select('haedir').eq('company_id', cid).limit(1)).then(function (q) {
      var hs = (q && q.data && q.data[0] && q.data[0].haedir) || [];
      var tf = window.TeiknForskodun;
      return Promise.all(hs.map(function (h) {
        if (!tf || !h.image_url) return null;
        var c = document.createElement('canvas');
        return tf.teikna(h, c, 2400).then(function () { return { nafn: h.nafn, src: c.toDataURL('image/png') }; }, function () { return null; });
      }));
    }).then(function (myndir) {
      var tki = (r.tki || []);
      var rod = tki.map(function (t) {
        return '<tr' + (t.upplysingar ? ' style="color:#888;font-style:italic"' : '') + '><td><b>' + esc(t.audkenni || '') + '</b></td><td>' + esc(t.bunadur || '') + '</td><td>' + esc(t.haed || '') + '</td><td>' + esc(t.stadur || '') + '</td><td>' + esc(t.tegund || '') + '</td><td style="text-align:center">' + (t.upplysingar ? '' : '☐') + '</td></tr>';
      }).join('');
      var html = '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Búnaðargreining — ' + esc(r.heimilisfang || '') + '</title><style>' +
        '@page{size:A4;margin:14mm}body{font:10pt/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#1a1a1a;margin:0}h1{font:700 18pt Georgia,serif;margin:0}' +
        '.y{color:#b71c1c;font:600 8.5pt system-ui;letter-spacing:.08em;text-transform:uppercase}.haus{border-bottom:2.5px solid #b71c1c;padding-bottom:6px;margin-bottom:10px}' +
        'table{width:100%;border-collapse:collapse;font-size:9pt}th{background:#263238;color:#fff;text-align:left;padding:4px}td{border-bottom:1px solid #ddd;padding:3px 4px;vertical-align:top}' +
        'h2{font:700 13pt Georgia,serif;margin:14px 0 6px}h3{font-size:10pt;color:#7f0000;margin:8px 0 2px}p{margin:0 0 4px}.lyk{background:#fff3e0;border-left:3px solid #e65100;padding:3px 6px}' +
        '.mynd{break-inside:avoid;margin:10px 0}.mynd img{width:100%;border:1px solid #ccc}small{color:#666}.dalkar{column-count:2;column-gap:7mm}' +
        '</style></head><body><div class="haus"><div class="y">Búnaðargreining · brunavarnir og staðsetning búnaðar</div><h1>' + esc(r.heimilisfang || '') + '</h1><small>' +
        esc(dags(r.created_at)) + ' · ' + esc(r.af || '') + ' · ' + (r.stada === 'yfirfarin' ? 'Yfirfarin' : 'Tillaga') + '</small></div>' +
        samantektHtml(r).replace(/<\/?b>/g, ' ').replace(/class="bgr-s"/, 'style="margin:6px 0 10px"') +
        '<table><thead><tr><th>Merki</th><th>Búnaður</th><th>Hæð</th><th>Staðsetning</th><th>Tegund</th><th>Uppsett</th></tr></thead><tbody>' + rod + '</tbody></table>' +
        ((r.athugasemdir || []).length ? '<h2>Athugasemdir</h2><ul>' + r.athugasemdir.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
        (myndir || []).filter(Boolean).map(function (m) { return '<div class="mynd"><h2>' + esc(m.nafn) + '</h2><img src="' + m.src + '"></div>'; }).join('') +
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

  function greina(el, cid, gamla, faerNy) {
    var takki = el.querySelector('[data-a="greina"]');
    if (takki) { takki.disabled = true; takki.textContent = 'Greini…'; }
    var bord, taeki = {};
    var erSlanga = function (m) { var u = taeki[String(m.unitId)]; return erSlanga0(m) || !!(u && /slang|kefli/i.test(u.type || '')); };
    var erSkynjari = function (m) { var u = taeki[String(m.unitId)]; return erSkynjari0(m) || !!(u && /skynjar/i.test(u.type || '')); };
    var forskeyti = function (m) { return erSlanga(m) ? 'BS' : erSkynjari(m) ? 'R' : 'S'; };
    SB().from('teikning_bord').select('haedir,markers,updated_at').eq('company_id', cid).limit(1).then(function (q) {
      if (q.error) throw q.error;
      bord = q.data && q.data[0];
      var hs = (bord && bord.haedir) || [];
      var allt = [];
      hs.forEach(function (h, i) { (h.markers || []).forEach(function (m) { if (m && m.kind !== 'sign' && isFinite(+m.x)) allt.push({ m: m, h: h, i: i }); }); });
      if (!allt.length) {
        // Lesturinn sjálfur býr í TurboPaint („Búnaður af teikningu": SLT / HSL / BRSL + spírall slöngukeflis, OCR) —
        // hann vistar ekkert fyrr en „Vista í úttekt". Sjálfvirkt-verkferlið endurgerir líka veggi, svo það er ekki notað hér.
        var e = new Error('Engin tæki eru á hæðum Teikningar enn. Lestu búnaðinn af teikningunni í TurboPaint („Búnaður af teikningu" → „Vista í úttekt") eða dragðu tækin inn í Teikningu, og ýttu svo aftur á Greina búnað.');
        e.notanda = true;
        e.tenglar = hs.filter(function (h) { return h && h.id && h.image_url && !/^(blob|data):/.test(h.image_url); }).map(function (h) {
          var q = ['uttekt=' + encodeURIComponent(cid), 'haed=' + encodeURIComponent(h.id)];
          if (h.frum && h.frum.b) q.push('b=' + h.frum.b, 'h=' + h.frum.h);
          return { nafn: h.nafn || 'Hæð', slod: TURBOPAINT + '?' + q.join('&') };
        });
        throw e;
      }
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
      var fyrst = gamla ? SB().from('bunadargreining').update({ fjarlaegt_at: new Date().toISOString(), fjarlaegt_af: 'Greina aftur' }).eq('id', gamla.id) : Promise.resolve({});
      return fyrst.then(function (f) { if (f && f.error) throw f.error; return SB().from('bunadargreining').insert(rod).select('*'); })
        .then(function (i) { if (i.error) throw i.error; return i.data[0]; });
    }).then(function (ny) {
      if (faerNy) faerNy(ny);
      teikna(el, cid, ny);
      try { if (window.TeiknForskodun && TeiknForskodun.endurnyja) TeiknForskodun.endurnyja(); } catch (_) {}   // spjöldin 456 með auðkennum
    }).catch(function (e) {
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
    });
  }

  function smida(sec, cid) {
    var el = document.createElement('div');
    el.id = ID;
    el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><small>sæki…</small></div>';
    var g = sec.querySelector('#co-fp-hdir');
    if (g && g.parentNode === sec) sec.insertBefore(el, g.nextSibling); else sec.appendChild(el);
    var rod = null;
    el.addEventListener('click', function (e) {
      var kort = e.target.closest && e.target.closest('.bgr-k[data-bl]');
      if (kort && el.contains(kort) && rod) { var bl = blodin(rod)[+kort.getAttribute('data-bl')]; if (bl) stortBlad(bl); return; }
      var b = e.target.closest && e.target.closest('[data-a]');
      if (!b || !el.contains(b)) return;
      var a = b.getAttribute('data-a');
      if (a === 'texti') { var t = el.querySelector('.bgr-tx'); if (t) { t.hidden = !t.hidden; b.setAttribute('aria-pressed', String(!t.hidden)); } }
      else if (a === 'skyrsla' && rod && rod.skyrsla && window.CompanyAttachments) CompanyAttachments.openPreview(Object.assign({ content_type: 'application/pdf' }, rod.skyrsla));
      else if (a === 'prenta' && rod) prenta(cid, rod);
      else if (a === 'greina') greina(el, cid, rod, function (ny) { rod = ny; });
    });
    saekja(cid).then(function (r) {
      if (String(window._currentCompanyId) !== String(cid) || !el.isConnected) return;
      rod = r; teikna(el, cid, r);
    }, function () { el.innerHTML = '<div class="bgr-h"><strong>Búnaðargreining</strong><small>náðist ekki að sækja</small></div>'; });
  }

  // Spjaldið fer undir hæðaspjöldin (456) — bíður þess að þau séu komin; endursmíðað með borðanum
  function athuga() {
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
