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
  var LS_HAMUR = 'sara_yf_vinnuhamur'; // vinnuhamur — útlitsval eins vafra
  var LS_ROD = 'sara_yf_rodun';        // röðunarval — útlitsval eins vafra
  var LS_FELLT = 'sara_yf_fellt';      // spjaldið fellt saman — útlitsval eins vafra
  var MANUDIR = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  var BUCKET = 'verkbord-files';       // sama geymsla og Þjónustuborðið notar

  function sb() { return window.DB && DB.sb; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Ekki toLocaleString('is-IS') — Chromium í fjarlotum skilar KOMMU sem
  // þúsundaskilju þegar ICU-gögnin vantar („43,228 kr"). Sami handvirki
  // grúppari og js/pos.js og js/tekjur.js nota: 1.234 kr.
  function kr(n) {
    var v = Math.round(Number(n) || 0), neik = v < 0;
    var t = String(Math.abs(v)), p = [];
    while (t.length > 3) { p.unshift(t.slice(-3)); t = t.slice(0, -3); }
    p.unshift(t);
    return (neik ? '-' : '') + p.join('.') + ' kr';
  }
  function hver() {
    try {
      return (window.AppSettings && AppSettings.path && AppSettings.path('vb_me')) ||
        localStorage.getItem('vb_me') || localStorage.getItem('sk_me') || 'Agnar';
    } catch (_) { return 'Agnar'; }
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }

  var state = { rows: [], vorur: [], sott: false, villa: '', opin: lsGet(LS_OPIN, []),
    synaKlarad: lsGet(LS_KLARAD, false), storMynd: [],
    // Sjálfgefið Á. Agnar 09.09.2026, eftir að hafa beðið tvisvar um plássið:
    // „helvítis ruslið er ennþá fyrir". Takkinn var í haus spjaldsins sem var
    // skrunaður upp fyrir skjáinn — og #vb-controls er position:sticky, svo
    // síuraðirnar svifu OFAN Á töflunni á meðan hann vann í henni. Hamurinn
    // slekkur á öllu því; hann man valið eftir að honum er slökkt handvirkt.
    vinnuhamur: lsGet(LS_HAMUR, null) === null ? true : lsGet(LS_HAMUR, true),
    rodun: lsGet(LS_ROD, { f: 'rod', d: 1 }),
    // 2026-09-10 (Agnar: „put a collapse button on the Sara vinnublöð — so I can
    // use the rest of the Þjónustuborð"). Fellt = aðeins hausinn með tölunum.
    fellt: lsGet(LS_FELLT, false) };

  // ── Reikningur per mál ───────────────────────────────────────────────────
  // NÁKVÆMLEGA sama reikniaðferð og reiknivélin á fyrirtækjasíðunni (patch 129):
  // einingaverð eru ÁN VSK, VSK leggst ofan á, akstur og skýrslugerð sömuleiðis.
  // Borðið sagði áður 43.228 kr þar sem appið sagði 48.136 — af því það notaði
  // m/vsk-verð og gömlu sjálfgildin 3.000/3.500 úr verd.md. Sjálfgildin eru nú
  // lesin úr window.SlokkVisitDefaults, sem 129 lýsir sem EINU heimildinni.
  function sjalfgildi() {
    var d = window.SlokkVisitDefaults || {};
    return { akstur: Number(d.akstur) || 3600, skyrslugerd: Number(d.skyrslugerd) || 5600 };
  }
  function linur(r) { return Array.isArray(r.linur) ? r.linur : []; }
  function linaEx(l) { return (Number(l.n) || 0) * (Number(l.v) || 0); }
  function linaVsk(l) { return linaEx(l) * ((Number(l.vsk) == null ? 24 : Number(l.vsk)) / 100); }
  function reikna(r) {
    var ex = 0, vsk = 0;
    linur(r).forEach(function (l) { ex += linaEx(l); vsk += linaVsk(l); });
    var akEx = (Number(r.akstur) || 0) * (Number(r.akstur_verd) || 0);
    var skEx = Number(r.skyrslugerd) || 0;
    ex += akEx + skEx;
    vsk += (akEx + skEx) * 0.24;
    return { ex: ex, vsk: vsk, total: ex + vsk };
  }
  function samtals(r) { return reikna(r).total; }
  // Mánuður raðast eftir MÁNAÐARNÚMERI, ekki stafrófi („Ágúst" á ekki að lenda
  // á undan „Febrúar"). Tómt fer alltaf aftast, í hvora áttina sem raðað er.
  function manIx(v) {
    var t = String(v == null ? '' : v).trim().toLowerCase();
    if (!t) return 99;
    for (var i = 0; i < MANUDIR.length; i++) if (t.indexOf(MANUDIR[i].toLowerCase()) === 0) return i;
    return 98;
  }
  function bladNr(v) {
    var m = /\d+/.exec(String(v == null ? '' : v));
    return m ? +m[0] : 9999;
  }
  function radlykill(r, f) {
    if (f === 'manudur') return manIx(r.manudur);
    if (f === 'blad') return bladNr(r.blad_nr);
    if (f === 'upphaed') return samtals(r);
    if (f === 'nafn') return String(r.fyrirtaeki || '');
    if (f === 'stada') return r.stada === 'samthykkt' ? 0 : r.stada === 'bidur' ? 1 : 2;
    return Number(r.rod) || 0;
  }
  // Tómur reitur er ekki gildi — hann er óútfyllt. Hann fer því ALLTAF aftast,
  // í hvora áttina sem raðað er. (Fyrsta útgáfan gaf tómu lykilinn 99 og þá
  // stukku fjörutíu auðir mánuðir fremst um leið og snúið var við.)
  function tomt(r, f) {
    if (f === 'manudur') return !String(r.manudur || '').trim();
    if (f === 'blad') return !String(r.blad_nr || '').trim();
    if (f === 'nafn') return !String(r.fyrirtaeki || '').trim();
    return false;
  }
  function synilegar() {
    var listi = state.rows.filter(function (r) {
      return state.synaKlarad ? true : (r.stada === 'bidur' || r.stada === 'samthykkt');
    });
    var f = (state.rodun && state.rodun.f) || 'rod';
    var d = (state.rodun && state.rodun.d) || 1;
    function bera(a, b) {
      var x = radlykill(a, f), y = radlykill(b, f), c;
      if (typeof x === 'string') c = x.localeCompare(y, 'is');
      else c = x - y;
      if (c) return c * d;
      return (Number(a.rod) || 0) - (Number(b.rod) || 0);   // fast band svo röðin flökti ekki
    }
    var med = [], an = [];
    listi.forEach(function (r) { (tomt(r, f) ? an : med).push(r); });
    med.sort(bera);
    an.sort(function (a, b) { return (Number(a.rod) || 0) - (Number(b.rod) || 0); });
    return med.concat(an);
  }

  // ── Gögn ────────────────────────────────────────────────────────────────
  async function saekja() {
    var s = sb(); if (!s) { setTimeout(saekja, 900); return; }
    try {
      var r = await s.from(TAFLA).select('*').order('rod', { ascending: true });
      if (r.error) throw r.error;
      state.rows = r.data || [];
      state.villa = '';
      // Vörulistinn í Liður-dálkinn (ósk Agnars 10.09.2026: „dropdown val af
      // tækjum i lidur"). Sömu heiti og verð og fara á reikninginn — sótt úr
      // `vorur`, ekki afrituð, svo þau geti ekki rekið í sundur við verðskrána.
      //
      // ENGIN FLOKKASÍA. Fyrsta útgáfan hleypti aðeins fimm flokkum í gegn og
      // faldi þar með „Léttvatn 2L slökkvitæki" sem Agnar bjó til sama kvöld —
      // hún er í flokknum Slökkvitæki. Sía sem þegir um það sem hún fjarlægir
      // er verri en enginn listi; virkar vörur eru aðeins 113 og komast allar
      // fyrir. Óvirkar vörur (virkt = false) eru það eina sem er sleppt.
      try {
        var v = await s.from('vorur').select('nafn,verd_an_vsk,vsk_prosenta,flokkur')
          .not('nafn', 'is', null).neq('virkt', false).order('nafn');
        if (!v.error) state.vorur = v.data || [];
      } catch (_) {}
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
      // Vinnuhamur (ósk Agnars 09.09.2026: „gefa þessu meira pláss, taka burtu
      // óþarfa hluti þegar ég er að vinna í þessu"). Klasinn situr á #vb-main
      // sem 231 endurteiknar EKKI — aðeins innihaldið — svo hamurinn lifir af
      // hverja endurteikningu borðsins.
      '#vb-main.syf-hamur #vb-dagskra,#vb-main.syf-hamur #vb-skipulag,#vb-main.syf-hamur #vb-ai-slot,',
      '#vb-main.syf-hamur #vb-composer,#vb-main.syf-hamur #vb-controls,#vb-main.syf-hamur #vb-toprow,',
      '#vb-main.syf-hamur #vb-list,#vb-main.syf-hamur #vb-sel{display:none !important}',
      '#vb-main.syf-hamur .vb-split{grid-template-columns:minmax(0,1fr) !important}',
      '#vb-main.syf-hamur .syf-tvo{grid-template-columns:1fr 1fr}',
      '#vb-main.syf-hamur .syf-body{padding:16px;gap:14px}',
      '#vb-main.syf-hamur .syf-tafla{font-size:13.5px}',
      '#vb-main.syf-hamur .syf-box pre{font-size:13px}',
      // Hausinn loðir við toppinn — annars skrunast ⛶-takkinn (og heildartalan)
      // upp fyrir skjáinn um leið og maður byrjar að vinna í fyrsta málinu.
      '.syf-haus{position:sticky;top:0;z-index:40}',
      // Kerfis-talan: læst, daufari, aðeins minni — sést en keppir ekki við
      // reitinn sem verið er að vinna í. Rauð þegar hún stangast á við blaðið.
      '.syf-man{flex:none;width:96px;font-size:12px;padding:3px 7px}',
      '.syf-blad{flex:none;width:56px;font-size:12px;padding:3px 7px;text-align:center}',
      '.syf-man:placeholder-shown,.syf-blad:placeholder-shown{background:#f8fafc;color:#94a3b8;border-color:#e2e8f0}',
      '@media(max-width:820px){.syf-man,.syf-blad{display:none}}',
      // Myndaröndin: fleiri bútar af sama blaði hlið við hlið. Þétt sjálfgefið
      // svo þeir steli ekki plássinu, ⤢ Stækka gefur þeim fulla breidd.
      '.syf-myndir{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}',
      '.syf-myndir.stor{grid-template-columns:1fr}',
      '.syf-mynd{margin:0;position:relative;border:1px solid #e5e9f0;border-radius:8px;overflow:hidden;background:#f8fafc}',
      '.syf-mynd img{display:block;width:100%;height:150px;object-fit:cover;object-position:top;cursor:zoom-in}',
      '.syf-myndir.stor .syf-mynd img{height:auto;max-height:1200px;object-fit:contain;cursor:zoom-out}',
      '.syf-pdf{display:flex;align-items:center;justify-content:center;height:150px;font-weight:800;color:#334155;text-decoration:none}',
      '.syf-mynd figcaption{position:absolute;top:5px;right:5px;display:flex;align-items:center;gap:4px}',
      '.syf-mynd figcaption a,.syf-mynd figcaption button,.syf-mynd figcaption span{',
      'display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;',
      'border-radius:5px;border:1px solid rgba(15,23,42,.15);background:rgba(255,255,255,.92);color:#334155;',
      'font:inherit;font-size:11px;font-weight:800;line-height:1;cursor:pointer;text-decoration:none}',
      '.syf-mynd figcaption span{cursor:default;color:#64748b}',
      '.syf-mynd figcaption button:hover{background:#fee2e2;color:#991b1b;border-color:#fecaca}',
      '.syf-par{display:inline-flex;align-items:center;gap:6px;justify-content:flex-end}',
      '.syf-kerfi{font-size:11.5px;font-weight:700;color:#94a3b8;font-variant-numeric:tabular-nums;',
      'background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:2px 6px;white-space:nowrap;cursor:default;user-select:none}',
      '.syf-kerfi.oliku{color:#b91c1c;background:#fef2f2;border-color:#fecaca}',
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
        // Mánuður og blaðnúmer beint í línunni — breytanlegt án þess að opna
        // málið, og raðanlegt úr hausnum. data-act="reit" gerir tvennt: vistar
        // innsláttinn OG stöðvar opnunar-smellinn (closest finnur reitinn, ekki
        // hausinn), svo það þarf enga sér-stopPropagation.
        '<input class="syf-inp syf-man" data-act="reit" data-id="' + r.id + '" data-f="manudur" ' +
          'list="syf-man-dl" placeholder="Mánuður" title="Mánuðurinn sem skoðunin fór fram" value="' + esc(r.manudur || '') + '">' +
        '<input class="syf-inp syf-blad" data-act="reit" data-id="' + r.id + '" data-f="blad_nr" ' +
          'placeholder="Blað" title="Númer vinnublaðsins" value="' + esc(r.blad_nr || '') + '">' +
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

    // Skannaða vinnublaðið — svo hægt sé að staðfesta lesturinn með eigin augum.
    // Agnar 09.09.2026: „svona bara svo eg get verið 100% að sé rétt lesið" og
    // 10.09: „bætt við fleirri screenshots af partinum úr vinnubladinu". Þess
    // vegna FYLKI af myndum, ekki ein — eitt blað er oft margir bútar (framhlið,
    // bakhlið, aðdráttur á einn dálk) og einn reitur neyddi mann til að velja.
    var myndir = Array.isArray(r.myndir) ? r.myndir : [];
    var stor = state.storMynd.indexOf(r.id) !== -1;
    h += '<div class="syf-box" style="background:#fff">' +
      '<h5 style="display:flex;align-items:center;gap:8px">📎 Vinnublaðið' +
        (myndir.length ? '<span style="font-weight:700;color:#475569">' + myndir.length + '</span>' +
          '<button class="syf-btn" style="padding:1px 8px;font-size:10.5px" data-act="stor-mynd" data-id="' + r.id + '">' +
          (stor ? '⤡ Minnka' : '⤢ Stækka') + '</button>' : '') +
        '<span style="flex:1"></span>' +
        '<label class="syf-btn" style="padding:1px 8px;font-size:10.5px;cursor:pointer;font-weight:700">' +
          (myndir.length ? '＋ Bæta við mynd' : '＋ Setja inn skann') +
          '<input type="file" accept="image/*,application/pdf" multiple style="display:none" data-act="mynd-inn" data-id="' + r.id + '">' +
        '</label>' +
      '</h5>' +
      (myndir.length
        ? '<div class="syf-myndir' + (stor ? ' stor' : '') + '">' + myndir.map(function (m, i) {
            var u = esc(m && m.url ? m.url : m);
            var pdf = /\.pdf(\?|$)/i.test(u);
            return '<figure class="syf-mynd">' +
              (pdf
                ? '<a href="' + u + '" target="_blank" rel="noopener" class="syf-pdf">📄 PDF</a>'
                : '<img src="' + u + '" alt="Vinnublað ' + (i + 1) + ' — ' + esc(r.fyrirtaeki) + '" loading="lazy" ' +
                  'data-act="stor-mynd" data-id="' + r.id + '">') +
              '<figcaption>' +
                '<a href="' + u + '" target="_blank" rel="noopener" title="Opna í nýjum flipa">↗</a>' +
                '<span>' + (i + 1) + '</span>' +
                '<button data-act="eyda-mynd" data-id="' + r.id + '" data-i="' + i + '" title="Fjarlægja þessa mynd">✕</button>' +
              '</figcaption>' +
            '</figure>';
          }).join('') + '</div>'
        : '<div style="padding:10px;color:#94a3b8;font-size:12px">Enginn skann tengdur. Settu inn myndir af blaðinu — þú mátt velja margar í einu, t.d. framhlið, bakhlið og aðdrátt á einstaka dálk.</div>') +
      '</div>';

    // Línurnar — fjöldi og verð breytanleg, samtals reiknast.
    var t = reikna(r);
    // Kerfis-tölurnar (Agnar 09.09.2026: „sýna líka tölurnar sem voru á
    // tækjaspjaldinu fyrir, bara aðeins öðruvísi á litinn og ekki breytanlegt").
    // Þetta er tækjalisti kerfisins eins og hann stóð — daufar, læstar tölur við
    // hliðina á þeim breytanlegu, og rautt þar sem blaðið og kerfið stangast á.
    var kl = Array.isArray(r.kerfi_linur) ? r.kerfi_linur : [];
    function kerfiReitur(k, mitt, sufix) {
      if (k == null || k === '') return '<span class="syf-kerfi">—</span>';
      var oliku = Number(k) !== Number(mitt);
      return '<span class="syf-kerfi' + (oliku ? ' oliku' : '') + '" title="' +
        (oliku ? 'Kerfið segir ' + k + ' — blaðið segir ' + mitt : 'Sama og í kerfinu') + '">' +
        (oliku ? '≠ ' : '') + k + (sufix || '') + '</span>';
    }
    h += '<div style="overflow-x:auto"><table class="syf-tafla"><thead><tr>' +
      '<th>Liður</th>' +
      '<th style="width:120px;text-align:right">Fjöldi <span style="font-weight:600;color:#94a3b8">· kerfi</span></th>' +
      '<th style="width:158px;text-align:right">Per stk án vsk <span style="font-weight:600;color:#94a3b8">· kerfi</span></th>' +
      '<th style="width:52px;text-align:center">VSK</th>' +
      '<th style="width:104px;text-align:right">Samtals án vsk</th>' +
      '<th style="width:26px"></th></tr></thead><tbody>';
    ls.forEach(function (l, i) {
      var k = kl[i] || {};
      h += '<tr>' +
        '<td><input class="syf-inp" list="syf-vorur-dl" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="l" ' +
          'placeholder="Veldu tæki eða skrifaðu" value="' + esc(l.l) + '"></td>' +
        '<td class="n"><span class="syf-par">' +
          '<input class="syf-inp n" style="width:52px" type="number" min="0" step="1" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="n" value="' + (Number(l.n) || 0) + '">' +
          kerfiReitur(k.n, l.n) + '</span></td>' +
        '<td class="n"><span class="syf-par">' +
          '<input class="syf-inp n" style="width:76px" type="number" min="0" step="1" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="v" value="' + (Number(l.v) || 0) + '">' +
          kerfiReitur(k.v, l.v) + '</span></td>' +
        '<td style="text-align:center"><input class="syf-inp n" style="width:44px;padding:4px 3px;text-align:center" type="number" min="0" max="100" step="1" data-act="lina" data-id="' + r.id + '" data-i="' + i + '" data-f="vsk" value="' + (l.vsk == null ? 24 : Number(l.vsk)) + '"></td>' +
        '<td class="n" style="font-weight:700">' + kr(linaEx(l)) + '</td>' +
        '<td><button class="syf-btn" style="padding:2px 6px" data-act="eyda-lina" data-id="' + r.id + '" data-i="' + i + '" title="Eyða línu">✕</button></td>' +
      '</tr>';
    });
    h += '<tr>' +
        '<td style="color:#475569">🚗 Akstur</td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="akstur" value="' + (Number(r.akstur) || 0) + '"></td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="akstur_verd" value="' + (Number(r.akstur_verd) || 0) + '"></td>' +
        '<td style="text-align:center;color:#94a3b8;font-size:11px">24%</td>' +
        '<td class="n" style="font-weight:700">' + kr((Number(r.akstur) || 0) * (Number(r.akstur_verd) || 0)) + '</td><td></td>' +
      '</tr>' +
      '<tr>' +
        '<td style="color:#475569">📋 Skýrslugerð</td><td class="n" style="color:#94a3b8">1</td>' +
        '<td><input class="syf-inp n" type="number" min="0" step="1" data-act="reit" data-id="' + r.id + '" data-f="skyrslugerd" value="' + (Number(r.skyrslugerd) || 0) + '"></td>' +
        '<td style="text-align:center;color:#94a3b8;font-size:11px">24%</td>' +
        '<td class="n" style="font-weight:700">' + kr(r.skyrslugerd) + '</td><td></td>' +
      '</tr>' +
      '</tbody><tfoot>' +
        '<tr><td colspan="4" style="text-align:right;color:#475569;padding-top:7px">Án vsk</td>' +
          '<td class="n syf-ex" style="font-weight:700;padding-top:7px">' + kr(t.ex) + '</td><td></td></tr>' +
        '<tr><td colspan="4" style="text-align:right;color:#475569">VSK</td>' +
          '<td class="n syf-vsk" style="font-weight:700">' + kr(t.vsk) + '</td><td></td></tr>' +
        '<tr><td colspan="4" style="text-align:right;font-weight:800">SAMTALS m. vsk</td>' +
          '<td class="n syf-tot" style="font-weight:900;font-size:14px">' + kr(t.total) + '</td><td></td></tr>' +
      '</tfoot></table></div>' +
      '<div><button class="syf-btn" data-act="ny-lina" data-id="' + r.id + '">+ Bæta við línu</button></div>';

    // Skýrslutextinn
    h += '<div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
        '<span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase">📝 Texti í skýrsluna („Annað")</span>' +
      '</div>' +
      '<textarea class="syf-ta" rows="3" data-act="reit" data-id="' + r.id + '" data-f="texti" ' +
        'placeholder="Öll slökkvitæki yfirfarin og vottuð í lagi.">' + esc(r.texti || '') + '</textarea>' +
      '</div>';

    // Athugasemd Agnars — þetta er reiturinn sem Sara LÆRIR af. Hann er lesinn
    // þegar hakið kemur og fer inn í Charlize/skillinn ef hann segir reglu.
    h += '<div>' +
      '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:4px">' +
        '✍ Til Söru — leiðréttingar og það sem hún á að læra</div>' +
      '<textarea class="syf-ta" rows="2" data-act="reit" data-id="' + r.id + '" data-f="athugasemd" ' +
        'placeholder="t.d. „bara eitt verð á slönguyfirferð" · „slepptu akstri" · „þetta er ekki búið"">' + esc(r.athugasemd || '') + '</textarea>' +
      '</div>';

    // Neðsta röð: skoðunarmaður · mánuður · dagsetning + tenglar
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input class="syf-inp" style="width:110px" data-act="reit" data-id="' + r.id + '" data-f="skodunarmadur" placeholder="Skoðunarmaður" value="' + esc(r.skodunarmadur || '') + '">' +
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
      '<div class="syf-haus" style="' + HEAD + '">' +
        // Titillinn fellir líka — stærsti smellflöturinn í hausnum.
        '<span data-act="fella" title="' + (state.fellt ? 'Opna vinnublöðin' : 'Fella vinnublöðin saman') + '" style="color:#f8fafc;font-weight:900;font-size:15px;letter-spacing:.3px;cursor:pointer">📋 SARA · VINNUBLÖÐ</span>' +
        (state.fellt ? '' : '<span style="color:#94a3b8;font-size:11.5px">blað ↔ kerfi · hakaðu við og Sara klárar</span>') +
        '<span style="flex:1"></span>' +
        // Takkinn situr þar sem Agnar merkti — vinstra megin við tölurnar.
        '<button class="syf-btn" data-act="fella" title="' + (state.fellt ? 'Opna vinnublöðin' : 'Fella saman og nota restina af Þjónustuborðinu') + '" ' +
          'style="background:#1f2937;color:#e5e7eb;border-color:#374151;min-width:78px">' + (state.fellt ? '▸ Opna' : '▾ Fella') + '</button>' +
        (bidurN ? '<span class="syf-merki" style="background:#fef3c7;color:#854d0e">' + bidurN + ' bíða</span>' : '') +
        (samthN ? '<span class="syf-merki" style="background:#dbeafe;color:#1e40af">' + samthN + ' samþykkt</span>' : '') +
        '<span style="color:#e2e8f0;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums">' + kr(heild) + '</span>' +
        (state.fellt ? '' : '<select class="syf-btn" data-act="rodun" title="Raða listanum" style="background:#1f2937;color:#e5e7eb;border-color:#374151;padding:5px 8px">' +
          [['rod', '↕ Röð'], ['manudur', '📅 Mánuður'], ['blad', '📄 Blað nr.'], ['nafn', '🔤 Fyrirtæki'],
           ['upphaed', '💰 Upphæð'], ['stada', '🚦 Staða']].map(function (o) {
            return '<option value="' + o[0] + '"' + (state.rodun.f === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') +
        '</select>' +
        '<button class="syf-btn" data-act="snua" title="Snúa röðinni við" ' +
          'style="background:#1f2937;color:#e5e7eb;border-color:#374151">' + (state.rodun.d < 0 ? '↓' : '↑') + '</button>' +
        '<button class="syf-btn" data-act="vinnuhamur" title="Fela síur, flokka og VALIÐ MÁL — borðið fær alla breiddina" ' +
          'style="background:' + (state.vinnuhamur ? '#16a34a' : '#1f2937') + ';color:#e5e7eb;border-color:' + (state.vinnuhamur ? '#15803d' : '#374151') + '">' +
          (state.vinnuhamur ? '⛶ Vinnuhamur á' : '⛶ Vinnuhamur') + '</button>' +
        '<button class="syf-btn" data-act="endurhlada" style="background:#1f2937;color:#e5e7eb;border-color:#374151">↻</button>') +
      '</div>';

    // Fellt: hausinn einn. Engin lína, engir listar, ekkert pláss tekið.
    if (state.fellt) { host.innerHTML = h + '</div>'; return; }

    h += '<div style="padding:12px;display:flex;flex-direction:column;gap:9px">';

    if (!state.sott) h += '<div style="padding:14px;color:#64748b;font-size:12.5px">Sæki vinnublöðin…</div>';
    else if (state.villa) h += '<div style="padding:12px;color:#991b1b;font-size:12.5px">⚠ ' + esc(state.villa) + '</div>';
    else if (!syn.length) h += '<div style="padding:14px;color:#16a34a;font-size:13px;font-weight:700">✅ Ekkert eftir — öll vinnublöð afgreidd.</div>';
    else h += syn.map(malHtml).join('');

    h += '<div style="display:flex;align-items:center;gap:8px;padding-top:3px">' +
      '<button class="syf-btn" data-act="toggle-klarad">' + (state.synaKlarad ? '🙈 Fela kláruð' : '👁 Sýna kláruð (' + kladN + ')') + '</button>' +
      '<span style="font-size:11px;color:#94a3b8">Hakið er grænt ljós — Sara býr ekki til reikning fyrr en það er komið.</span>' +
      // Datalistinn aftast — sem fyrsta barn listans braut hann `.syf-mal:first-child`.
      '<datalist id="syf-man-dl">' + MANUDIR.map(function (m) { return '<option value="' + m + '">'; }).join('') + '</datalist>' +
      '<datalist id="syf-vorur-dl">' + state.vorur.map(function (v) {
        return '<option value="' + esc(v.nafn) + '">' + Math.round(v.verd_an_vsk || 0) + ' kr án vsk' +
          (v.flokkur ? ' · ' + esc(v.flokkur) : '') + '</option>';
      }).join('') + '</datalist>' +
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

    if (act === 'fella') {
      state.fellt = !state.fellt; lsSet(LS_FELLT, state.fellt);
      // Vinnuhamurinn felur síur, flokka og valið mál. Sé honum haldið á
      // meðan spjaldið er fellt stendur eftir mjó lína yfir borði sem er
      // enn falið — nákvæmlega það sem Agnar vildi losna við.
      settaHam(); teikna();
      return;
    }
    if (act === 'endurhlada') { state.sott = false; teikna(); saekja(); return; }
    if (act === 'vinnuhamur') {
      state.vinnuhamur = !state.vinnuhamur; lsSet(LS_HAMUR, state.vinnuhamur);
      settaHam(); teikna();
      if (state.vinnuhamur) { var hst = document.getElementById(HOST_ID); if (hst) hst.scrollIntoView({ block: 'start' }); }
      return;
    }
    if (act === 'snua') {
      state.rodun = { f: state.rodun.f, d: (state.rodun.d || 1) * -1 };
      lsSet(LS_ROD, state.rodun); teikna(); return;
    }
    if (act === 'eyda-mynd') {
      if (!row) return;
      var ms = (Array.isArray(row.myndir) ? row.myndir : []).slice();
      ms.splice(+b.dataset.i, 1);
      // mynd_url helst í takt við fyrstu myndina (eldri lesarar horfa á hana)
      vista(id, { myndir: ms, mynd_url: ms.length ? (ms[0].url || ms[0]) : null }, true);
      teikna(); return;
    }
    if (act === 'stor-mynd') {
      var mx = state.storMynd.indexOf(id);
      if (mx === -1) state.storMynd.push(id); else state.storMynd.splice(mx, 1);
      teikna(); return;
    }
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
      var ls = linur(row).slice(); ls.push({ l: '', n: 1, v: 0, vsk: 24 });
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

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !el.dataset || el.dataset.act !== 'rodun') return;
    var host = document.getElementById(HOST_ID);
    if (!host || !host.contains(el)) return;
    state.rodun = { f: el.value, d: state.rodun.d || 1 };
    lsSet(LS_ROD, state.rodun); teikna();
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
      // Val úr vörulistanum fyllir VERÐ og VSK líka. Nafn eitt og sér er
      // gagnslaust ef maður þarf svo að fletta verðinu upp handvirkt — og það
      // er einmitt leiðin til að fá skakkar tölur á reikninginn.
      if (f === 'l') {
        var vara = state.vorur.find(function (v) { return v.nafn === el.value; });
        if (vara) {
          ls[i].v = Math.round(Number(vara.verd_an_vsk) || 0);
          ls[i].vsk = Number(vara.vsk_prosenta) || 24;
          var verdReitur = el.closest('tr') && el.closest('tr').querySelector('input[data-f="v"]');
          var vskReitur = el.closest('tr') && el.closest('tr').querySelector('input[data-f="vsk"]');
          if (verdReitur) verdReitur.value = ls[i].v;
          if (vskReitur) vskReitur.value = ls[i].vsk;
        }
      }
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
      var c = tds[i].querySelectorAll('td')[4];
      if (c) c.textContent = kr(linaEx(ls[i]));
    }
    var akstRow = tds[ls.length], skyrRow = tds[ls.length + 1];
    if (akstRow) { var ac = akstRow.querySelectorAll('td')[4]; if (ac) ac.textContent = kr((Number(row.akstur) || 0) * (Number(row.akstur_verd) || 0)); }
    if (skyrRow) { var sc = skyrRow.querySelectorAll('td')[4]; if (sc) sc.textContent = kr(row.skyrslugerd); }
    var t = reikna(row);
    var ex = mal.querySelector('.syf-ex'); if (ex) ex.textContent = kr(t.ex);
    var vs = mal.querySelector('.syf-vsk'); if (vs) vs.textContent = kr(t.vsk);
    var to = mal.querySelector('.syf-tot'); if (to) to.textContent = kr(t.total);
    var hd = mal.querySelector('.syf-tala'); if (hd) hd.textContent = kr(t.total);
  }

  // Vinnuhamurinn er klasi á #vb-main. 231 skrifar yfir innihaldið en ekki
  // elementið sjálft, svo hann helst — en festa() setur hann samt aftur til
  // öryggis ef borðið er byggt upp á nýtt frá grunni.
  function settaHam() {
    var main = document.getElementById('vb-main');
    if (main) main.classList.toggle('syf-hamur', !!state.vinnuhamur && !state.fellt);
  }

  // ── Skann af vinnublaðinu ───────────────────────────────────────────────
  // Fer í sömu geymslu og viðhengi Þjónustuborðsins (verkbord-files) og
  // slóðin geymist á málinu, svo hún sést á öllum vélum.
  document.addEventListener('change', async function (e) {
    var el = e.target;
    if (!el || !el.dataset || el.dataset.act !== 'mynd-inn') return;
    var host = document.getElementById(HOST_ID);
    if (!host || !host.contains(el)) return;
    var skrar = el.files ? [].slice.call(el.files) : [];
    if (!skrar.length) return;
    var id = +el.dataset.id;
    var s = sb(); if (!s) return;
    var row = state.rows.find(function (x) { return x.id === id; });
    var merki = el.parentNode;
    var gamallTexti = merki && merki.firstChild ? merki.firstChild.textContent : '';
    try {
      var nyjar = [];
      for (var i = 0; i < skrar.length; i++) {
        var f = skrar[i];
        if (merki && merki.firstChild) merki.firstChild.textContent = '⏳ ' + (i + 1) + '/' + skrar.length + '…';
        var hreint = String(f.name || 'skann').replace(/[^\w.\-]+/g, '_');
        var slod = 'sara/' + id + '/' + Date.now() + '_' + i + '_' + hreint;
        var up = await s.storage.from(BUCKET).upload(slod, f, { contentType: f.type || 'application/octet-stream', upsert: false });
        if (up.error) throw up.error;
        var pub = s.storage.from(BUCKET).getPublicUrl(slod);
        var url = pub && pub.data && pub.data.publicUrl;
        if (!url) throw new Error('Fékk enga slóð á ' + hreint);
        nyjar.push({ url: url, nafn: f.name || 'skann' });
      }
      var allar = (row && Array.isArray(row.myndir) ? row.myndir : []).concat(nyjar);
      vista(id, { myndir: allar, mynd_url: allar[0].url || allar[0] }, true);
      el.value = '';
      teikna();
      if (window.Toast && Toast.show) Toast.show('📎 ' + nyjar.length + (nyjar.length === 1 ? ' mynd tengd' : ' myndir tengdar') + ' við málið');
    } catch (err) {
      if (merki && merki.firstChild) merki.firstChild.textContent = gamallTexti;
      alert('Upphleðsla brást: ' + ((err && err.message) || err));
    }
  }, false);

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
    settaHam();
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
