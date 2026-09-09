/* 364-sara-yfirferd.js — „SARA · VINNUBLÖÐ" spjaldið á Þjónustuborðinu.
 *
 * Agnar 09.09.2026: „Geturðu búið til einhvernskonar nýjan Dálk inn á
 * þjónustuborðinu ... í svona hálfgerðu töfluformi frekar, hvað þér fynnst
 * vinnublöðin segja... hvað kerfið segir núna.. heildartala fyrir hvern lið..
 * síðan textann sem kemur, og check mark sem ég get sett sem þú mátt þá klára
 * að gera skýrsluna og invoicið.. ég síðan sendi hana af stað í kröfuyfirlit"
 * + „yfirfara hvað er búið að gera og hvað senda. og sýna bara það sem er eftir"
 * + „hafa þetta smá myndrænt fyrir mig að geta bara hakað í og breytt tölunum".
 *
 * Ástæðan: Cowork hefur sett tugi „Úttektarskýrsla — X" mála á borðið og
 * lesturinn af blöðunum liggur á víð og dreif í lýsingatextum. Hér er hann á
 * einum stað, í töflu, með tölum sem má breyta og einu haki sem er grænt ljós.
 *
 * ⚠ SAMSTILLT MILLI VÉLA: ekkert af þessu má lifa í localStorage. Allt (línur,
 * fjöldi, verð, texti, staða, athugasemd) skrifast í Supabase-töfluna
 * `sara_yfirferd` og lesist þaðan — fjórar vélar vinna í sömu gögnum.
 * Aðeins samanbrot/„sýna kláruð" er útlitsval eins vafra.
 *
 * Sara klárar ALDREI reikning sjálf. Hakið er leyfi Agnars, ekki aðgerð.
 */
(function () {
  'use strict';
  if (window.__saraYfirferd) return;
  window.__saraYfirferd = true;

  var TAG = '[sara-yfirferd]';
  var TAFLA = 'sara_yfirferd';
  var HOST_ID = 'vb-sara';
  var LS_OPIN = 'sara_yf_opin';      // samanbrot — útlitsval, má vera staðbundið
  var LS_KLARAD = 'sara_yf_klarad';  // „sýna kláruð" — sama

  function sb() { return window.DB && DB.sb; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function kr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function hver() {
    try {
      return (window.AppSettings && AppSettings.path && AppSettings.path('vb_me')) ||
        localStorage.getItem('vb_me') || localStorage.getItem('sk_me') || 'Agnar';
    } catch (_) { return 'Agnar'; }
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }

  var state = { rows: [], sott: false, villa: '', opin: lsGet(LS_OPIN, []), synaKlarad: lsGet(LS_KLARAD, false) };

  // ── Reikningur per mál ───────────────────────────────────────────────────
  // Sömu tölur og reiknivélin á fyrirtækjasíðunni: línur + akstur × verð +
  // skýrslugerð. Allt m/vsk (verðin í verðskránni eru m/vsk).
  function linur(r) { return Array.isArray(r.linur) ? r.linur : []; }
  function linaSamtals(l) { return (Number(l.n) || 0) * (Number(l.v) || 0); }
  function samtals(r) {
    var s = linur(r).reduce(function (a, l) { return a + linaSamtals(l); }, 0);
    return s + (Number(r.akstur) || 0) * (Number(r.akstur_verd) || 0) + (Number(r.skyrslugerd) || 0);
  }
  function synilegar() {
    return state.rows.filter(function (r) {
      return state.synaKlarad ? true : (r.stada === 'bidur' || r.stada === 'samthykkt');
    });
  }

  // ── Gögn ────────────────────────────────────────────────────────────────
  async function saekja() {
    var s = sb(); if (!s) { setTimeout(saekja, 900); return; }
    try {
      var r = await s.from(TAFLA).select('*').order('rod', { ascending: true });
      if (r.error) throw r.error;
      state.rows = r.data || [];
      state.villa = '';
    } catch (e) {
      state.villa = (e && e.message) || String(e);
      console.warn(TAG, 'sótti ekki:', state.villa);
    }
    state.sott = true;
    teikna();
  }

  var bidur = {};   // id -> timer (debounce per máli)
  function vista(id, patch, strax) {
    var row = state.rows.find(function (x) { return x.id === id; });
    if (row) Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    clearTimeout(bidur[id]);
    bidur[id] = setTimeout(async function () {
      var s = sb(); if (!s) return;
      patch.updated_at = new Date().toISOString();
      try {
        var r = await s.from(TAFLA).update(patch).eq('id', id);
        if (r.error) throw r.error;
      } catch (e) {
        console.warn(TAG, 'vistun brást:', e && e.message);
        if (window.Toast && Toast.show) Toast.show('⚠ Vistun brást — ' + ((e && e.message) || 'óþekkt villa'));
      }
    }, strax ? 0 : 600);
  }

  // ── Útlit ───────────────────────────────────────────────────────────────
  var CARD = 'border-radius:16px;border:1px solid rgba(20,24,34,.1);' +
    'background:linear-gradient(180deg,#ffffff,#f5f7fb);' +
    'box-shadow:0 16px 38px -20px rgba(15,23,42,.36),inset 0 2px 0 rgba(255,255,255,.95)';
  var HEAD = 'display:flex;align-items:center;gap:9px;padding:10px 14px;' +
    'background:linear-gradient(180deg,#2e3037 0%,#17181c 55%,#0c0d10 100%);border-radius:16px 16px 0 0';

  function stilar() {
    if (document.getElementById('sara-yf-css')) return;
    var s = document.createElement('style');
    s.id = 'sara-yf-css';
    s.textContent = [
      '.syf-mal{border:1px solid #e2e6ee;border-radius:12px;background:#fff;overflow:hidden}',
      '.syf-mal.samth{border-color:#86efac;box-shadow:0 0 0 1px #86efac inset}',
      '.syf-hd{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;background:linear-gradient(180deg,#fbfcfe,#f2f5fa)}',
      '.syf-hd:hover{background:#eef2f8}',
      '.syf-nafn{font-weight:800;font-size:14px;color:#111827;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.syf-tala{font-weight:800;font-size:14px;color:#0f172a;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.syf-hak{width:26px;height:26px;border-radius:8px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;flex:none;color:#fff;font-weight:900}',
      '.syf-hak.on{background:#16a34a;border-color:#15803d}',
      '.syf-body{padding:12px;display:flex;flex-direction:column;gap:11px;border-top:1px solid #eef1f6}',
      '.syf-tvo{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '@media(max-width:760px){.syf-tvo{grid-template-columns:1fr}}',
      '.syf-box{border:1px solid #e5e9f0;border-radius:9px;padding:8px 10px;background:#fbfcfe;min-width:0}',
      '.syf-box h5{margin:0 0 5px;font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase}',
      '.syf-box pre{margin:0;font:inherit;font-size:12px;line-height:1.5;color:#1f2937;white-space:pre-wrap;word-break:break-word}',
      '.syf-tafla{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.syf-tafla th{padding:5px 7px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.05em;',
      'text-transform:uppercase;color:#64748b;border-bottom:1px solid #e5e9f0}',
      '.syf-tafla td{padding:4px 7px;border-bottom:1px solid #f1f4f9;vertical-align:middle}',
      '.syf-tafla td.n{text-align:right;font-variant-numeric:tabular-nums}',
      '.syf-inp{width:100%;box-sizing:border-box;padding:4px 7px;border:1px solid #cbd5e1;border-radius:6px;',
      'font:inherit;font-size:12.5px;background:#fff;color:#0f172a}',
      '.syf-inp.n{text-align:right;font-variant-numeric:tabular-nums}',
      '.syf-ta{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;',
      'font:inherit;font-size:12.5px;line-height:1.55;background:#fff;color:#0f172a;resize:vertical}',
      '.syf-sp{border:1px solid #fecaca;background:#fef2f2;border-radius:9px;padding:8px 10px;font-size:12px;color:#7f1d1d;line-height:1.5}',
      '.syf-btn{padding:5px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;',
      'font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}',
      '.syf-btn:hover{background:#f1f5f9}',
      '.syf-merki{font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 7px;border-radius:99px;white-space:nowrap;flex:none}',
    ].join('');
    document.head.appendChild(s);
  }

  function merki(r) {
    if (r.stada === 'klarad') return '<span class="syf-merki" style="background:#dcfce7;color:#166534">✅ KLÁRAÐ</span>';
    if (r.stada === 'samthykkt') return '<span class="syf-merki" style="background:#dbeafe;color:#1e40af">🟢 SAMÞYKKT — SARA MÁ KLÁRA</span>';
    if (r.spurning) return '<span class="syf-merki" style="background:#fee2e2;color:#991b1b">❓ SPURNING</span>';
    return '<span class="syf-merki" style="background:#fef3c7;color:#854d0e">🟡 BÍÐUR</span>';
  }

  function malHtml(r) {
    var opid = state.opin.indexOf(r.id) !== -1;
    var ls = linur(r);
    var samth = r.stada === 'samthykkt' || r.stada === 'klarad';
    var h = '<div class="syf-mal' + (samth ? ' samth' : '') + '" data-id="' + r.id + '">' +
      '<div class="syf-hd" data-act="opna" data-id="' + r.id + '">' +
        '<span style="flex:none;color:#94a3b8;font-size:11px;width:10px">' + (opid ? '▾' : '▸') + '</span>' +
        '<span class="syf-nafn">' + esc(r.fyrirtaeki) + '</span>' +
        merki(r) +
        '<span class="syf-tala">' + kr(samtals(r)) + '</span>' +
        '<button class="syf-hak' + (samth ? ' on' : '') + '" data-act="hak" data-id="' + r.id + '" ' +
          'title="Haka við = Sara má klára skýrsluna og reikninginn">' + (samth ? '✓' : '') + '</button>' +
      '</div>';
    if (!opid) return h + '</div>';

    h += '<div class="syf-body">';
    if (r.spurning) h += '<div class="syf-sp">❓ ' + esc(r.spurning) + '</div>';
    h += '<div class="syf-tvo">' +
        '<div class="syf-box"><h5>📄 Blaðið segir</h5><pre>' + esc(r.blad || '—') + '</pre></div>' +
        '<div class="syf-box"><h5>🗄 Kerfið segir núna</h5><pre>' + esc(r.kerfi || '—') + '</pre></div>' +
      '</div>';

    // Línurnar — fjöldi og verð breytanleg, samtals reiknast.
    h += '<div style="overflow-x:auto"><table class="syf-tafla"><thead><tr>' +
      '<th>Liður</th><th style="width:66px;text-align:right">Fjöldi</th>' +
      '<th style="width:96px;text-align:right">Verð</th><th style="width:96px;text-align:right">Samtals</th>' +
      '<th style="width:26px"></th></tr></thead><tbody>';
    ls.forEach(function (l, i) {
      h += '<tr>' +
        '<td><input class="syf-inp" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="l" value="' + esc(l.l) + '"></td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="n" value="' + (Number(l.n) || 0) + '"></td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="v" value="' + (Number(l.v) || 0) + '"></td>' +
        '<td class="n" style="font-weight:700">' + kr(linaSamtals(l)) + '</td>' +
        '<td><button class="syf-btn" style="padding:2px 6px" data-act="eyda-lina" data-id="' + r.id + '" data-i="' + i + '" title="Eyða línu">✕</button></td>' +
      '</tr>';
    });
    h += '<tr>' +
        '<td style="color:#475569">🚗 Akstur</td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="akstur" value="' + (Number(r.akstur) || 0) + '"></td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="akstur_verd" value="' + (Number(r.akstur_verd) || 0) + '"></td>' +
        '<td class="n" style="font-weight:700">' + kr((Number(r.akstur) || 0) * (Number(r.akstur_verd) || 0)) + '</td><td></td>' +
      '</tr>' +
      '<tr>' +
        '<td style="color:#475569">📋 Skýrslugerð</td><td class="n" style="color:#94a3b8">1</td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="skyrslugerd" value="' + (Number(r.skyrslugerd) || 0) + '"></td>' +
        '<td class="n" style="font-weight:700">' + kr(r.skyrslugerd) + '</td><td></td>' +
      '</tr>' +
      '</tbody><tfoot><tr>' +
        '<td colspan="3" style="text-align:right;font-weight:800;padding-top:7px">SAMTALS m/vsk</td>' +
        '<td class="n" style="font-weight:900;font-size:14px;padding-top:7px">' + kr(samtals(r)) + '</td><td></td>' +
      '</tr></tfoot></table></div>' +
      '<div><button class="syf-btn" data-act="ny-lina" data-id="' + r.id + '">+ Bæta við línu</button></div>';

    // Skýrslutextinn
    h += '<div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
        '<span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase">📝 Texti í skýrsluna („Annað")</span>' +
      '</div>' +
      '<textarea class="syf-ta" rows="3" data-act="reit" data-id="' + r.id + '" data-f="texti" ' +
        'placeholder="Öll slökkvitæki yfirfarin og vottuð í lagi.">' + esc(r.texti || '') + '</textarea>' +
      '</div>';

    // Athugasemd Agnars
    h += '<div>' +
      '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:4px">✍ Athugasemd til Söru</div>' +
      '<textarea class="syf-ta" rows="2" data-act="reit" data-id="' + r.id + '" data-f="athugasemd" ' +
        'placeholder="t.d. „slöngurnar eru 25 m" eða „slepptu akstri"">' + esc(r.athugasemd || '') + '</textarea>' +
      '</div>';

    // Neðsta röð: skoðunarmaður · mánuður · dagsetning + tenglar
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input class="syf-inp" style="width:110px" data-act="reit" data-id="' + r.id + '" data-f="skodunarmadur" placeholder="Skoðunarmaður" value="' + esc(r.skodunarmadur || '') + '">' +
      '<input class="syf-inp" style="width:100px" data-act="reit" data-id="' + r.id + '" data-f="manudur" placeholder="Framkvæmd" value="' + esc(r.manudur || '') + '">' +
      '<input class="syf-inp" style="width:110px" data-act="reit" data-id="' + r.id + '" data-f="dagsetning" placeholder="dd.mm.áááá" value="' + esc(r.dagsetning || '') + '">' +
      (r.fyrirtaeki_id ? '<a class="syf-btn" style="text-decoration:none" href="#company/' + r.fyrirtaeki_id + '">🏢 Opna fyrirtæki</a>' : '') +
      '<span style="flex:1"></span>' +
      (r.stada === 'klarad'
        ? '<button class="syf-btn" data-act="opna-aftur" data-id="' + r.id + '">↶ Opna aftur</button>'
        : '<button class="syf-btn" data-act="sleppa" data-id="' + r.id + '">Fela</button>') +
      '</div>';

    return h + '</div></div>';
  }

  function teikna() {
    var host = document.getElementById(HOST_ID); if (!host) return;
    stilar();
    var syn = synilegar();
    var bidurN = state.rows.filter(function (r) { return r.stada === 'bidur'; }).length;
    var samthN = state.rows.filter(function (r) { return r.stada === 'samthykkt'; }).length;
    var kladN = state.rows.filter(function (r) { return r.stada === 'klarad'; }).length;
    var heild = syn.reduce(function (a, r) { return a + samtals(r); }, 0);

    var h = '<div style="' + CARD + '">' +
      '<div style="' + HEAD + '">' +
        '<span style="color:#f8fafc;font-weight:900;font-size:15px;letter-spacing:.3px">📋 SARA · VINNUBLÖÐ</span>' +
        '<span style="color:#94a3b8;font-size:11.5px">blað ↔ kerfi · hakaðu við og Sara klárar</span>' +
        '<span style="flex:1"></span>' +
        (bidurN ? '<span class="syf-merki" style="background:#fef3c7;color:#854d0e">' + bidurN + ' bíða</span>' : '') +
        (samthN ? '<span class="syf-merki" style="background:#dbeafe;color:#1e40af">' + samthN + ' samþykkt</span>' : '') +
        '<span style="color:#e2e8f0;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums">' + kr(heild) + '</span>' +
        '<button class="syf-btn" data-act="endurhlada" style="background:#1f2937;color:#e5e7eb;border-color:#374151">↻</button>' +
      '</div>' +
      '<div style="padding:12px;display:flex;flex-direction:column;gap:9px">';

    if (!state.sott) h += '<div style="padding:14px;color:#64748b;font-size:12.5px">Sæki vinnublöðin…</div>';
    else if (state.villa) h += '<div style="padding:12px;color:#991b1b;font-size:12.5px">⚠ ' + esc(state.villa) + '</div>';
    else if (!syn.length) h += '<div style="padding:14px;color:#16a34a;font-size:13px;font-weight:700">✅ Ekkert eftir — öll vinnublöð afgreidd.</div>';
    else h += syn.map(malHtml).join('');

    h += '<div style="display:flex;align-items:center;gap:8px;padding-top:3px">' +
      '<button class="syf-btn" data-act="toggle-klarad">' + (state.synaKlarad ? '🙈 Fela kláruð' : '👁 Sýna kláruð (' + kladN + ')') + '</button>' +
      '<span style="font-size:11px;color:#94a3b8">Hakið er grænt ljós — Sara býr ekki til reikning fyrr en það er komið.</span>' +
      '</div>';

    h += '</div></div>';
    host.innerHTML = h;
  }

  // ── Atburðir ────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || !document.getElementById(HOST_ID) || !document.getElementById(HOST_ID).contains(b)) return;
    var act = b.dataset.act, id = +b.dataset.id;
    var row = state.rows.find(function (x) { return x.id === id; });

    if (act === 'endurhlada') { state.sott = false; teikna(); saekja(); return; }
    if (act === 'toggle-klarad') { state.synaKlarad = !state.synaKlarad; lsSet(LS_KLARAD, state.synaKlarad); teikna(); return; }
    if (act === 'opna') {
      var ix = state.opin.indexOf(id);
      if (ix === -1) state.opin.push(id); else state.opin.splice(ix, 1);
      lsSet(LS_OPIN, state.opin); teikna(); return;
    }
    if (act === 'hak') {
      e.stopPropagation();
      if (!row) return;
      var nyStada = (row.stada === 'samthykkt' || row.stada === 'klarad') ? 'bidur' : 'samthykkt';
      vista(id, {
        stada: nyStada,
        samthykkt_at: nyStada === 'samthykkt' ? new Date().toISOString() : null,
        samthykkt_by: nyStada === 'samthykkt' ? hver() : null,
      }, true);
      teikna();
      if (window.Toast && Toast.show) {
        Toast.show(nyStada === 'samthykkt'
          ? '🟢 ' + row.fyrirtaeki + ' samþykkt — Sara má klára skýrslu og reikning'
          : '🟡 ' + row.fyrirtaeki + ' aftur í bið');
      }
      return;
    }
    if (act === 'ny-lina') {
      if (!row) return;
      var ls = linur(row).slice(); ls.push({ l: '', n: 1, v: 0 });
      vista(id, { linur: ls }, true); teikna(); return;
    }
    if (act === 'eyda-lina') {
      if (!row) return;
      var l2 = linur(row).slice(); l2.splice(+b.dataset.i, 1);
      vista(id, { linur: l2 }, true); teikna(); return;
    }
    if (act === 'sleppa') { vista(id, { stada: 'klarad' }, true); teikna(); return; }
    if (act === 'opna-aftur') { vista(id, { stada: 'bidur', samthykkt_at: null, samthykkt_by: null }, true); teikna(); return; }
  }, false);

  // Innsláttur — vistar jafnóðum (debounce). ALLTAF LEYFA VISTUN: engin
  // staðfesting, engin skylduvalidation, ekkert sem stoppar innslátt.
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.dataset || !el.dataset.act) return;
    var host = document.getElementById(HOST_ID);
    if (!host || !host.contains(el)) return;
    var id = +el.dataset.id;
    var row = state.rows.find(function (x) { return x.id === id; });
    if (!row) return;

    if (el.dataset.act === 'lina') {
      var i = +el.dataset.i, f = el.dataset.f;
      var ls = linur(row).slice();
      if (!ls[i]) return;
      ls[i] = Object.assign({}, ls[i]);
      ls[i][f] = (f === 'l') ? el.value : (Number(el.value) || 0);
      row.linur = ls;
      vista(id, { linur: ls });
      uppfaeraTolur(id);
      return;
    }
    if (el.dataset.act === 'reit') {
      var fld = el.dataset.f;
      var v = (fld === 'akstur' || fld === 'akstur_verd' || fld === 'skyrslugerd') ? (Number(el.value) || 0) : el.value;
      row[fld] = v;
      var p = {}; p[fld] = v;
      vista(id, p);
      if (fld === 'akstur' || fld === 'akstur_verd' || fld === 'skyrslugerd') uppfaeraTolur(id);
    }
  }, false);

  // Uppfærir aðeins tölurnar — ekki endurteikna alla töfluna, því þá tapast
  // bendillinn í reitnum sem verið er að skrifa í (gildra sem beit í 129).
  function uppfaeraTolur(id) {
    var row = state.rows.find(function (x) { return x.id === id; });
    var mal = document.querySelector('.syf-mal[data-id="' + id + '"]');
    if (!row || !mal) return;
    var ls = linur(row);
    var tds = mal.querySelectorAll('tbody tr');
    for (var i = 0; i < ls.length && i < tds.length; i++) {
      var c = tds[i].querySelectorAll('td')[3];
      if (c) c.textContent = kr(linaSamtals(ls[i]));
    }
    var akstRow = tds[ls.length], skyrRow = tds[ls.length + 1];
    if (akstRow) { var ac = akstRow.querySelectorAll('td')[3]; if (ac) ac.textContent = kr((Number(row.akstur) || 0) * (Number(row.akstur_verd) || 0)); }
    if (skyrRow) { var sc = skyrRow.querySelectorAll('td')[3]; if (sc) sc.textContent = kr(row.skyrslugerd); }
    var foot = mal.querySelector('tfoot .n'); if (foot) foot.textContent = kr(samtals(row));
    var hd = mal.querySelector('.syf-tala'); if (hd) hd.textContent = kr(samtals(row));
  }

  // ── Festing á borðið ────────────────────────────────────────────────────
  // 231 skrifar yfir allt #vb-main við hverja renderAll, svo hýsingarreiturinn
  // er settur aftur inn við hverja breytingu (sama mynstur og 294 notar).
  function festa() {
    var toprow = document.getElementById('vb-toprow');
    if (!toprow || !toprow.parentNode) return;
    if (document.getElementById(HOST_ID)) return;
    var host = document.createElement('div');
    host.id = HOST_ID;
    toprow.parentNode.insertBefore(host, toprow);
    teikna();
    if (!state.sott) saekja();
  }

  (function fylgjast() {
    var main = document.getElementById('vb-main');
    if (!main) { setTimeout(fylgjast, 800); return; }
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(festa, 60); }).observe(main, { childList: true, subtree: true });
    festa();
  })();

  window.SaraYfirferd = { saekja: saekja, teikna: teikna, rows: function () { return state.rows; } };
  console.log(TAG, 'virkt');
})();
