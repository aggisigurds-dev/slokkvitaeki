// Brunaáætlun — ritill: reitir, merkingar á uppdrætti hverrar hæðar, kaflatextar og útgáfa skjalanna.
// Gögn: fyrirtaeki + teikning_bord + uttaeki + brunakerfi_skyrslur (aðeins lesin) og brunaaaetlun (ein röð á fyrirtæki,
// efni jsonb). Vistun er skilyrt á updated_at svo tvær vélar skrifi ekki hvor yfir aðra.
(function () {
  'use strict';
  var T = window.BaTakn, S = window.BaSnid, esc = T.esc;
  var app = document.getElementById('ba-app');
  var cid = Number(new URLSearchParams(location.search).get('fyrirtaeki'));
  var sb = null;
  try { sb = window.supabase.createClient(window.SUPABASE_URL || SUPABASE_URL, window.SUPABASE_KEY || SUPABASE_KEY); } catch (_) {}
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
  var PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  var JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

  var st = {
    fyr: null, haedir: [], tb: {}, frum: {}, myndir: {}, sjalf: {}, uppfaert: null,
    efni: { reitir: {}, textar: {}, aukakaflar: {}, haedir: {}, uppkast: true },
    flipi: 'uppl', haed: null, tol: 'velja', val: -1, leidNy: null, zoom: 1, saga: [], skjal: 'ryming', forsyn: {},
  };
  st.haedarEfni = function (id) { var h = st.efni.haedir[id] || (st.efni.haedir[id] = {}); if (!Array.isArray(h.merki)) h.merki = []; return h; };
  st.rammi = function (id) {
    var e = st.efni.haedir[id]; if (e && e.skurdur && e.skurdur.w) return e.skurdur;
    var h = st.tb[id]; if (h && h.skurdur && h.skurdur.w) return h.skurdur;
    var f = st.frum[id] || { b: 1600, h: 1100 }; return { x: 0, y: 0, w: f.b, h: f.h };
  };

  function hladaSkrift(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Gat ekki sótt ' + src)); }; document.head.appendChild(s); });
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function villa(txt) { app.innerHTML = '<div class="ba-villa">' + txt + '</div>'; }

  // ───────────────────────── gögn ─────────────────────────
  async function hlada() {
    if (!cid) return villa('Engið fyrirtæki valið. Opnaðu Brunaáætlun úr prófíl fyrirtækis í appinu (slóðin endar á <code>?fyrirtaeki=NÚMER</code>).');
    if (!sb) return villa('Engin tenging við gagnagrunn.');
    var r = await Promise.all([
      sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer,simi,netfang').eq('id', cid).maybeSingle(),
      sb.from('teikning_bord').select('haedir,image_url,markers,updated_at').eq('company_id', cid).maybeSingle(),
      sb.from('uttaeki').select('type,size,status,last_insp,next_insp,location').eq('fyrirtaeki_id', cid),
      sb.from('brunakerfi_skyrslur').select('data,created_at,status').eq('fyrirtaeki_id', cid).order('created_at', { ascending: false }).limit(1),
      sb.from('brunaaaetlun').select('efni,updated_at').eq('company_id', cid).maybeSingle(),
    ]);
    if (r[0].error || !r[0].data) return villa('Fann ekki fyrirtæki nr. ' + esc(cid) + '.' + (r[0].error ? ' (' + esc(r[0].error.message) + ')' : ''));
    if (r[4].error) return villa('Tafla brunaáætlana svarar ekki: ' + esc(r[4].error.message));
    st.fyr = r[0].data;
    var tb = r[1].data || {};
    var h = Array.isArray(tb.haedir) && tb.haedir.length ? tb.haedir : (tb.image_url ? [{ id: 'h1', nafn: '1. hæð', image_url: tb.image_url, markers: tb.markers || [] }] : []);
    st.haedir = h.filter(function (x) { return x && x.image_url; }).map(function (x, i) { return { id: String(x.id || 'h' + (i + 1)), nafn: x.nafn || (i + 1) + '. hæð' }; });
    h.forEach(function (x, i) { st.tb[String(x.id || 'h' + (i + 1))] = x; });
    st.taeki = r[2].data || [];
    st.sjalf = S.sjalfgefid({ fyr: st.fyr, taeki: st.taeki, skyrsla: (r[3].data || [])[0] });
    if (r[4].data) { st.efni = Object.assign(st.efni, r[4].data.efni || {}); st.uppfaert = r[4].data.updated_at; }
    ['reitir', 'textar', 'aukakaflar', 'haedir'].forEach(function (k) { if (!st.efni[k] || typeof st.efni[k] !== 'object') st.efni[k] = {}; });
    st.haed = st.haedir.length ? st.haedir[0].id : null;
    document.title = 'Brunaáætlun – ' + st.fyr.nafn;
    teiknaAllt();
    for (var i = 0; i < st.haedir.length; i++) { try { await hladaMynd(st.haedir[i].id); } catch (e) { console.warn('mynd', e); } if (st.flipi === 'uppd' && st.haedir[i].id === st.haed) teiknaKort(true); }
  }

  // Grunnmynd hæðar: PDF (pdf.js) eða mynd, skorin í rammann, sem JPEG-dataURL
  var _pdfjs = null;
  async function pdfjs() {
    if (_pdfjs) return _pdfjs;
    await hladaSkrift(PDFJS + 'pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    return (_pdfjs = window.pdfjsLib);
  }
  var _upprunar = {};
  async function upprunaMynd(id) {
    if (_upprunar[id]) return _upprunar[id];
    var h = st.tb[id], url = h.image_url;
    var res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Teikning svaraði ' + res.status);
    var buf = await res.arrayBuffer(), haus = new Uint8Array(buf.slice(0, 5));
    if (String.fromCharCode.apply(null, haus) === '%PDF-') {
      var lib = await pdfjs(), doc = await lib.getDocument({ data: buf }).promise, page = await doc.getPage(1), vp = page.getViewport({ scale: 1 });
      var frum = h.frum && h.frum.b ? { b: h.frum.b, h: h.frum.h || Math.round(h.frum.b * vp.height / vp.width) } : (function () { var k = 6000 / Math.max(vp.width, vp.height); return { b: Math.round(vp.width * k), h: Math.round(vp.height * k) }; })();
      return (_upprunar[id] = { pdf: page, kv: frum.b / vp.width, frum: frum });
    }
    var blob = new Blob([buf]), src = URL.createObjectURL(blob);
    var img = await new Promise(function (ok, nei) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = nei; i.src = src; });
    var fr = h.frum && h.frum.b ? h.frum : { b: img.naturalWidth, h: img.naturalHeight };
    return (_upprunar[id] = { img: img, sx: img.naturalWidth / fr.b, frum: fr });
  }
  async function hladaMynd(id) {
    var u = await upprunaMynd(id);
    st.frum[id] = u.frum;
    var r = st.rammi(id), k = Math.min(1.2, 3000 / r.w), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(r.w * k)); c.height = Math.max(1, Math.round(r.h * k));
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    if (u.pdf) {
      var vp = u.pdf.getViewport({ scale: u.kv * k });
      await u.pdf.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -r.x * k, -r.y * k], background: 'rgba(255,255,255,0)' }).promise;
    } else {
      ctx.drawImage(u.img, r.x * u.sx, r.y * u.sx, r.w * u.sx, r.h * u.sx, 0, 0, c.width, c.height);
    }
    st.myndir[id] = c.toDataURL('image/jpeg', 0.86);
  }

  // ───────────────────────── vistun ─────────────────────────
  var _vistTimi = null, _vistar = false, _aftur = false, _breytt = false;
  function breytt() { _breytt = true; stada('Óvistað', 'y'); clearTimeout(_vistTimi); _vistTimi = setTimeout(vista, 1200); }
  async function vista() {
    if (_vistar) { _aftur = true; return; }
    _vistar = true; _breytt = false; stada('Vistar…', 'y');
    var nu = new Date().toISOString(), r;
    try {
      if (!st.uppfaert) r = await sb.from('brunaaaetlun').insert({ company_id: cid, efni: st.efni, updated_at: nu, updated_by: 'brunaaaetlun' }).select('updated_at');
      else r = await sb.from('brunaaaetlun').update({ efni: st.efni, updated_at: nu, updated_by: 'brunaaaetlun' }).eq('company_id', cid).eq('updated_at', st.uppfaert).select('updated_at');
      if (r.error) {
        if (/duplicate|23505/i.test(r.error.message + r.error.code)) stada('Breytt á annarri vél', 'r', true);
        else { stada('Vistaðist ekki', 'r'); console.warn(r.error); _breytt = true; }
      } else if (!r.data || !r.data.length) stada('Breytt á annarri vél', 'r', true);
      else { st.uppfaert = r.data[0].updated_at; var d = new Date(); stada('Vistað ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2), 'g'); }
    } catch (e) { stada('Vistaðist ekki', 'r'); _breytt = true; }
    _vistar = false;
    if (_aftur) { _aftur = false; vista(); }
  }
  function stada(txt, lit, arekstur) {
    var p = document.getElementById('ba-stada');
    if (p) p.innerHTML = '<span class="ba-p ' + (lit || '') + '"><i></i>' + esc(txt) + '</span>' + (arekstur ? ' <button class="ba-btn s" data-a="saekja">Sækja nýjustu</button>' : '');
  }
  window.addEventListener('beforeunload', function (e) { if (_breytt || _vistar) { e.preventDefault(); e.returnValue = ''; } });

  // ───────────────────────── síðan ─────────────────────────
  var FLIPAR = [['uppl', 'Upplýsingar'], ['uppd', 'Uppdrættir'], ['textar', 'Textar'], ['skjol', 'Skjöl']];
  function teiknaAllt() {
    var vant = S.vantar(st).length;
    app.innerHTML =
      '<header class="ba-haus"><div><h1>Brunaáætlun</h1><div class="ba-undir">' + esc(st.fyr.nafn) + (st.fyr.heimilisfang ? ' · ' + esc(st.fyr.heimilisfang) : '') + '</div></div><div class="ba-bil"></div>' +
      '<div class="ba-takkar"><span id="ba-stada"></span><label class="ba-p" style="cursor:pointer"><input type="checkbox" data-a="uppkast"' + (st.efni.uppkast !== false ? ' checked' : '') + ' style="margin:0"> Uppkast</label>' +
      '<a class="ba-btn m" href="/#company/' + cid + '">Prófíll</a><button class="ba-btn r" data-a="flipi" data-f="skjol">Prenta skjöl</button></div></header>' +
      '<nav class="ba-flipar" role="tablist">' + FLIPAR.map(function (f) { return '<button class="ba-flipi" role="tab" data-a="flipi" data-f="' + f[0] + '" aria-selected="' + (st.flipi === f[0]) + '">' + f[1] + (f[0] === 'uppl' && vant ? ' <span class="ba-tala" id="ba-vant">' + vant + '</span>' : '') + '</button>'; }).join('') + '</nav>' +
      '<main class="ba-svid" id="ba-svid"></main>';
    stada(st.uppfaert ? 'Vistað' : 'Ný áætlun', st.uppfaert ? 'g' : '');
    teiknaFlipa();
  }
  function uppfaeraVantar() {
    var n = S.vantar(st).length, t = document.getElementById('ba-vant'), f = document.querySelector('.ba-flipi[data-f="uppl"]');
    if (t) { if (n) t.textContent = n; else t.remove(); } else if (n && f) f.insertAdjacentHTML('beforeend', ' <span class="ba-tala" id="ba-vant">' + n + '</span>');
  }
  function teiknaFlipa() {
    document.querySelectorAll('.ba-flipi').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.f === st.flipi)); });
    var s = document.getElementById('ba-svid');
    if (st.flipi === 'uppl') s.innerHTML = upplHtml();
    else if (st.flipi === 'uppd') { s.innerHTML = uppdHtml(); teiknaKort(true); teiknaEiginleika(); }
    else if (st.flipi === 'textar') s.innerHTML = textarHtml();
    else s.innerHTML = skjolHtml();
  }

  // ── Upplýsingar ──
  function upplHtml() {
    return '<div class="ba-plata">' + S.REITIR.map(function (g) {
      return '<section class="ba-spjald"><div class="ba-shaus"><h2>' + esc(g.h) + '</h2></div><div class="ba-sinn"><div class="ba-reitir">' + g.reitir.map(function (r) {
        var k = r[0], v = S.gildi(st, k), sj = st.sjalf[k], yfir = st.efni.reitir[k] != null;
        var merki = '<label for="r-' + k + '">' + esc(r[1]) + (sj && !yfir ? '<small>sjálfgefið úr kerfinu</small>' : '') + (yfir && sj != null && sj !== '' ? ' <small><a href="#" data-a="endurstilla-reit" data-k="' + k + '">endurstilla</a></small>' : '') + '</label>';
        var inn = r[2] ? '<textarea id="r-' + k + '" data-r="' + k + '" rows="' + Math.min(8, Math.max(3, v.split('\n').length + 1)) + '">' + esc(v) + '</textarea>' : '<input id="r-' + k + '" data-r="' + k + '" value="' + esc(v) + '">';
        return '<div class="ba-reitur' + (r[2] ? ' breidd' : '') + (v ? '' : ' tomt') + '">' + merki + inn + '</div>';
      }).join('') + '</div></div></section>';
    }).join('') + '</div>';
  }

  // ── Uppdrættir ──
  function uppdHtml() {
    if (!st.haedir.length) return '<div class="ba-plata"><section class="ba-spjald"><div class="ba-shaus"><h2>Engin teikning</h2></div><div class="ba-sinn ba-tom">Þetta fyrirtæki hefur enga teikningu enn. Opnaðu <b>Teikning</b> á prófílnum, sæktu aðaluppdrætti hverrar hæðar og vistaðu — þá birtast hæðirnar hér.</div></section></div>';
    return '<div class="ba-ritill">' +
      '<div class="ba-plata"><div class="ba-merki">Hæð</div><div class="ba-haedir">' + st.haedir.map(function (h) { return '<button class="ba-btn s" data-a="haed" data-h="' + esc(h.id) + '" aria-pressed="' + (h.id === st.haed) + '">' + esc(h.nafn) + '</button>'; }).join('') + '</div>' +
      '<div class="ba-merki">Setja á uppdrátt</div><div class="ba-palletta">' +
      '<button class="ba-btn breidd" data-a="tol" data-t="velja" aria-pressed="' + (st.tol === 'velja') + '">Velja og færa</button>' +
      T.ROD.map(function (t) { return '<button class="ba-btn" data-a="tol" data-t="' + t + '" aria-pressed="' + (st.tol === t) + '" title="' + esc(T.TEG[t].heiti) + '">' + T.tak(t, t === 'leid' || t === 'ut' ? 14 : 20) + '<span>' + esc(T.TEG[t].heiti) + '</span></button>'; }).join('') +
      '</div><p class="ba-hjalp" id="ba-hjalp"></p></div>' +
      '<section class="ba-spjald"><div class="ba-kortstika">' +
      '<button class="ba-btn s" data-a="zoom" data-z="-1">−</button><button class="ba-btn s" data-a="zoom" data-z="0">Passa</button><button class="ba-btn s" data-a="zoom" data-z="1">+</button>' +
      '<span class="ba-bil"></span><span class="ba-merki" style="margin:0">Rammi</span><button class="ba-btn s" data-a="rammi" data-r="1">Víkka</button><button class="ba-btn s" data-a="rammi" data-r="-1">Þrengja</button><button class="ba-btn s" data-a="rammi" data-r="0">Endurstilla</button>' +
      '<button class="ba-btn s" data-a="afturkalla" title="Ctrl+Z">Afturkalla</button></div>' +
      '<div class="ba-kortgluggi" id="ba-gluggi"><div class="ba-hledur" style="color:#5b6472">Teikni hæðina…</div></div></section>' +
      '<div class="ba-plata ba-eiginleikar" id="ba-eig"></div></div>';
  }
  var HJALP = {
    velja: 'Smelltu á tákn til að velja það og dragðu til að færa. Delete eyðir völdu tákni. Á flóttaleið má draga hornpunktana.',
    leid: 'Smelltu punkt fyrir punkt frá herbergjagangi að útgangi. Tvísmelltu eða ýttu á Enter til að ljúka; örin vísar að síðasta punkti. Esc hættir við.',
    herb: 'Smelltu við dyr hvers herbergis. Hvert herbergi fær sína flóttaáætlun með „Þú ert hér“ á þeim stað. Númerið hækkar sjálfkrafa.',
    ter: 'Settu punktinn þar sem uppdrátturinn hangir á veggnum (t.d. við móttöku eða á gangi).',
  };
  function hjalp() { var p = document.getElementById('ba-hjalp'); if (p) p.textContent = HJALP[st.tol] || 'Smelltu á uppdráttinn til að setja ' + T.TEG[st.tol].heiti.toLowerCase() + '. Tólið helst virkt svo þú getir sett mörg — veldu „Velja og færa“ til að hætta.'; }

  var _svg = null, _lag = null, _rit = null;
  function teiknaKort(heilt) {
    var g = document.getElementById('ba-gluggi');
    if (!g || !st.haed) return;
    var id = st.haed, r = st.rammi(id), e = st.haedarEfni(id);
    if (heilt || !_svg || _svg.dataset.h !== id) {
      if (!st.myndir[id]) { g.innerHTML = '<div class="ba-hledur" style="color:#5b6472">Sæki teikningu hæðarinnar…</div>'; return; }
      g.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-h="' + esc(id) + '" viewBox="' + [r.x, r.y, r.w, r.h].join(' ') + '">' + T.defs() +
        '<image href="' + st.myndir[id] + '" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" preserveAspectRatio="none"/><g id="ba-lag"></g><g id="ba-rit"></g></svg>';
      _svg = g.querySelector('svg'); _lag = _svg.querySelector('#ba-lag'); _rit = _svg.querySelector('#ba-rit');
      stillaZoom();
      _svg.addEventListener('pointerdown', nidur);
      _svg.addEventListener('dblclick', function (ev) { if (st.tol === 'leid') { ev.preventDefault(); ljukaLeid(); } });
    }
    g.classList.toggle('baeta', st.tol !== 'velja');
    _lag.innerHTML = T.lag(r, e.merki, { ham: 'ritill' });
    teiknaVal();
    hjalp();
  }
  function stillaZoom() {
    var g = document.getElementById('ba-gluggi'); if (!g || !_svg) return;
    var r = st.rammi(st.haed), b = g.clientWidth - 2, passa = Math.min(b, (g.clientHeight - 2) * r.w / r.h);
    _svg.style.width = Math.round(passa * st.zoom) + 'px'; _svg.style.height = Math.round(passa * st.zoom * r.h / r.w) + 'px';
  }
  function teiknaVal() {
    if (!_rit) return;
    var e = st.haedarEfni(st.haed), u = st.rammi(st.haed).w / 1600, o = '';
    var m = e.merki[st.val];
    if (m) {
      if (m.t === 'leid') o += (m.p || []).map(function (q, j) { return '<circle data-v="' + j + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + 11 * u + '" fill="#fff" stroke="#1565c0" stroke-width="' + 4 * u + '" style="cursor:grab"/>'; }).join('');
      else { var gg = _lag.querySelector('g[data-i="' + st.val + '"]'); if (gg) { try { var bb = gg.getBBox(), sk = u; o += '<rect x="' + (m.x + bb.x * sk - 6 * u) + '" y="' + (m.y + bb.y * sk - 6 * u) + '" width="' + (bb.width * sk + 12 * u) + '" height="' + (bb.height * sk + 12 * u) + '" fill="none" stroke="#1565c0" stroke-width="' + 3 * u + '" stroke-dasharray="' + 10 * u + ' ' + 6 * u + '"/>'; } catch (_) {} } }
    }
    if (st.leidNy && st.leidNy.length) o += '<polyline points="' + st.leidNy.map(function (q) { return q.join(','); }).join(' ') + '" fill="none" stroke="#1565c0" stroke-width="' + 6 * u + '" stroke-dasharray="' + 14 * u + ' ' + 8 * u + '"/>' + st.leidNy.map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + 8 * u + '" fill="#1565c0"/>'; }).join('');
    _rit.innerHTML = o;
  }
  function svgPunktur(ev) { var p = _svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; var q = p.matrixTransform(_svg.getScreenCTM().inverse()); return [Math.round(q.x), Math.round(q.y)]; }
  function vistaSogu() { st.saga.push({ h: st.haed, m: JSON.stringify(st.haedarEfni(st.haed).merki) }); if (st.saga.length > 60) st.saga.shift(); }
  function naestaNumer(t) {
    var allt = []; st.haedir.forEach(function (h) { allt = allt.concat(st.haedarEfni(h.id).merki); });
    if (t === 'slt') return 'S' + (allt.filter(function (m) { return m.t === 'slt'; }).length + 1);
    if (t === 'herb') { var a = st.haedarEfni(st.haed).merki.filter(function (m) { return m.t === 'herb'; }).map(function (m) { return parseInt(m.nr, 10); }).filter(function (n) { return !isNaN(n); }); if (a.length) return String(Math.max.apply(null, a) + 1); var hn = (st.haedir.findIndex(function (h) { return h.id === st.haed; }) + 1); return String(hn * 100 + 1); }
    return '';
  }
  function nyttMerki(t, p) {
    var m = { t: t, x: p[0], y: p[1] };
    if (t === 'ut') { var n = st.haedarEfni(st.haed).merki.filter(function (x) { return x.t === 'ut'; }).length + 1; m.texti = 'ÚT ' + n; m.texti2 = 'EXIT ' + n; }
    if (t === 'slt') m.n = naestaNumer('slt');
    if (t === 'herb') m.nr = naestaNumer('herb');
    if (t === 'texti') m.texti = 'Texti';
    return m;
  }

  var _drag = null;
  function nidur(ev) {
    if (ev.button !== 0) return;
    var p = svgPunktur(ev), e = st.haedarEfni(st.haed);
    if (st.tol === 'leid') { st.leidNy = (st.leidNy || []).concat([p]); teiknaVal(); return; }
    if (st.tol !== 'velja') { vistaSogu(); e.merki.push(nyttMerki(st.tol, p)); st.val = e.merki.length - 1; teiknaKort(); teiknaEiginleika(); breytt(); return; }
    var v = ev.target.closest && ev.target.closest('[data-v]');
    if (v && e.merki[st.val] && e.merki[st.val].t === 'leid') { vistaSogu(); _drag = { hnutur: +v.dataset.v, byrja: p }; _svg.setPointerCapture(ev.pointerId); return; }
    var g = ev.target.closest && ev.target.closest('g[data-i]');
    if (g) {
      var i = +g.dataset.i; if (st.val !== i) { st.val = i; teiknaEiginleika(); }
      vistaSogu(); _drag = { byrja: p, upph: JSON.parse(JSON.stringify(e.merki[i])), hreyft: false }; _svg.setPointerCapture(ev.pointerId); teiknaVal(); return;
    }
    if (st.val !== -1) { st.val = -1; teiknaVal(); teiknaEiginleika(); }
  }
  document.addEventListener('pointermove', function (ev) {
    if (!_drag || !_svg) return;
    var p = svgPunktur(ev), e = st.haedarEfni(st.haed), m = e.merki[st.val]; if (!m) return;
    if (_drag.hnutur != null) { m.p[_drag.hnutur] = p; }
    else { var dx = p[0] - _drag.byrja[0], dy = p[1] - _drag.byrja[1]; _drag.hreyft = _drag.hreyft || Math.abs(dx) + Math.abs(dy) > 3;
      if (m.t === 'leid') m.p = _drag.upph.p.map(function (q) { return [q[0] + dx, q[1] + dy]; }); else { m.x = _drag.upph.x + dx; m.y = _drag.upph.y + dy; } }
    _lag.innerHTML = T.lag(st.rammi(st.haed), e.merki, { ham: 'ritill' }); teiknaVal();
  });
  document.addEventListener('pointerup', function () {
    if (!_drag) return;
    var hreyft = _drag.hnutur != null || _drag.hreyft; _drag = null;
    if (hreyft) breytt(); else st.saga.pop();
  });
  function ljukaLeid() {
    var p = st.leidNy || []; st.leidNy = null;
    if (p.length >= 2) { vistaSogu(); var e = st.haedarEfni(st.haed); e.merki.push({ t: 'leid', p: p }); st.val = e.merki.length - 1; breytt(); }
    teiknaKort(); teiknaEiginleika();
  }
  document.addEventListener('keydown', function (ev) {
    if (st.flipi !== 'uppd') return;
    var iReit = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (ev.key === 'Escape') { st.leidNy = null; if (st.tol !== 'velja') velja('velja'); teiknaVal(); return; }
    if (iReit) return;
    if (ev.key === 'Enter' && st.tol === 'leid') { ev.preventDefault(); ljukaLeid(); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && st.val !== -1) { ev.preventDefault(); eyda(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); afturkalla(); }
  });
  function eyda() { var e = st.haedarEfni(st.haed); if (!e.merki[st.val]) return; vistaSogu(); e.merki.splice(st.val, 1); st.val = -1; teiknaKort(); teiknaEiginleika(); breytt(); }
  function afturkalla() {
    for (var i = st.saga.length - 1; i >= 0; i--) if (st.saga[i].h === st.haed) { st.haedarEfni(st.haed).merki = JSON.parse(st.saga.splice(i, 1)[0].m); st.val = -1; teiknaKort(); teiknaEiginleika(); breytt(); return; }
  }
  function velja(t) {
    if (st.tol === 'leid' && t !== 'leid' && st.leidNy && st.leidNy.length >= 2) ljukaLeid();
    st.tol = t; st.leidNy = null;
    document.querySelectorAll('[data-a="tol"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === t)); });
    var g = document.getElementById('ba-gluggi'); if (g) g.classList.toggle('baeta', t !== 'velja');
    hjalp(); teiknaVal();
  }

  // eiginleikar valins tákns (teiknast aðeins þegar valið breytist — ekki á meðan skrifað er)
  function teiknaEiginleika() {
    var d = document.getElementById('ba-eig'); if (!d) return;
    var e = st.haedarEfni(st.haed), m = e.merki[st.val];
    var fj = {}; e.merki.forEach(function (x) { fj[x.t] = (fj[x.t] || 0) + 1; });
    var yfirlit = '<div class="ba-merki" style="margin-top:14px">Á þessari hæð</div><div class="ba-tom">' + (e.merki.length ? T.ROD.filter(function (t) { return fj[t]; }).map(function (t) { return fj[t] + ' × ' + esc(T.TEG[t].heiti.toLowerCase()); }).join('<br>') : 'Ekkert enn.') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-top:12px"><button class="ba-btn s" data-a="saekja-taeki">Sækja slökkvitæki af teikningu</button><button class="ba-btn s" data-a="hreinsa">Hreinsa hæð</button></div>';
    if (!m) { d.innerHTML = '<div class="ba-merki">Valið tákn</div><div class="ba-tom">Ekkert valið.</div>' + yfirlit; return; }
    var reitir = [];
    if (m.t === 'ut') reitir.push(['texti', 'Texti (íslenska)'], ['texti2', 'Texti (enska)'], ['undir', 'Skýring undir (valfrjálst)']);
    if (/^(slt|f002|f005|f016|e003|bv|rafm)$/.test(m.t)) reitir.push(['n', 'Merki á rýmingaruppdrætti (t.d. S1)']);
    if (m.t === 'herb') reitir.push(['nr', 'Herbergisnúmer']);
    if (m.t === 'texti') reitir.push(['texti', 'Texti']);
    var h = '<div class="ba-merki">Valið: ' + esc(T.TEG[m.t].heiti) + '</div>' +
      reitir.map(function (r) { return '<div class="ba-reitur"><label>' + esc(r[1]) + '</label><input data-e="' + r[0] + '" value="' + esc(m[r[0]] == null ? '' : m[r[0]]) + '"></div>'; }).join('');
    if (m.t === 'ter' || m.t === 'herb') h += '<div class="ba-reitur"><label>Textinn „Þú ert hér“</label><select class="ba-inn" data-e="lbl"><option value="">Hægra megin</option><option value="n"' + (m.lbl === 'n' ? ' selected' : '') + '>Undir punktinum</option></select></div>';
    if (m.t === 'slt') h += '<label class="ba-tom" style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" data-e="v"' + (m.v ? ' checked' : '') + '> Merkið vinstra megin</label>';
    if (m.t === 'e007') h += '<label class="ba-tom" style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" data-e="litid"' + (m.litid ? ' checked' : '') + '> Aðeins táknið (án texta)</label>';
    if (m.t === 'leid') h += '<p class="ba-tom">' + (m.p || []).length + ' punktar. Örin vísar að síðasta punkti.</p><button class="ba-btn s" data-a="snua">Snúa stefnu við</button> ';
    h += '<button class="ba-btn s" data-a="eyda" style="margin-top:6px">Eyða</button>';
    d.innerHTML = h + yfirlit;
  }

  // ── Textar ──
  function textarHtml() {
    var sk = st.skjal;
    return '<div class="ba-plata"><div class="ba-haedir">' + Object.keys(S.SKJOL).map(function (k) { return '<button class="ba-btn s" data-a="skjal" data-s="' + k + '" aria-pressed="' + (k === sk) + '">' + esc(S.SKJOL[k]) + '</button>'; }).join('') + '</div>' +
      '<p class="ba-hjalp" style="margin:0 0 10px">Létt snið: auð lína = ný málsgrein · „- “ punktur · „1. “ tölusett · „| a | b |“ tafla · „> “ rammi · **feitt** · {{reitur}} sækir gildi úr Upplýsingum (tómt verður gult).</p>' +
      S.kaflar(st, sk).map(function (k) {
        return '<div class="ba-kafli" data-k="' + esc(k.id) + '"><div class="ba-kafli-h"><input class="ba-inn" data-kt="titill" value="' + esc(k.titill) + '">' +
          (k.breytt ? '<button class="ba-btn s" data-a="endurstilla-kafla">Endurstilla</button>' : '') + (k.auka ? '<button class="ba-btn s" data-a="eyda-kafla">Eyða</button>' : '') +
          '<button class="ba-btn s" data-a="forsyn" aria-pressed="' + !!st.forsyn[sk + k.id] + '">Forskoða</button></div>' +
          '<textarea class="ba-inn" data-kt="texti" rows="' + Math.min(18, Math.max(4, k.texti.split('\n').length + 1)) + '">' + esc(k.texti) + '</textarea>' +
          (st.forsyn[sk + k.id] ? '<div class="ba-forsyn">' + S.md(st, k.texti) + '</div>' : '') + '</div>';
      }).join('') + '<button class="ba-btn" data-a="nyr-kafli">+ Bæta við kafla</button></div>';
  }

  // ── Skjöl ──
  function skjolHtml() {
    var vant = S.vantar(st), herb = 0;
    st.haedir.forEach(function (h) { herb += st.haedarEfni(h.id).merki.filter(function (m) { return m.t === 'herb'; }).length; });
    var spj = function (titill, texti, takkar) { return '<section class="ba-spjald ba-skjal"><div class="ba-shaus"><h2>' + titill + '</h2></div><div class="ba-sinn"><p>' + texti + '</p><div class="ba-takkar">' + takkar + '</div></div></section>'; };
    var tvo = function (s) { return '<button class="ba-btn" data-a="forskoda" data-s="' + s + '">Forskoða</button><button class="ba-btn r" data-a="prenta" data-s="' + s + '">Prenta / vista PDF</button>'; };
    return '<div class="ba-plata">' +
      (vant.length ? '<section class="ba-spjald" style="margin-bottom:14px"><div class="ba-shaus"><h2>Vantar ' + vant.length + ' atriði</h2><span class="ba-p y"><i></i>Gult í skjölunum</span></div><div class="ba-sinn ba-vantar">' + vant.map(function (k) { return '<a data-a="i-reit" data-k="' + k + '">' + esc(S.MERKI[k] || k) + '</a>'; }).join('') + '</div></section>' : '') +
      '<div class="ba-skjalalisti">' +
      spj('Viðbragðs- og rýmingaráætlun', 'Kaflarnir níu, neyðarnúmer, rýmingaruppdráttur hverrar hæðar (með öllum táknum) og skráningarblað æfinga.', tvo('ryming')) +
      spj('Eigið eldvarnaeftirlit', 'Skrifleg lýsing eftir tíu meginþáttum Eldvarnabandalagsins, búnaðarskrá, eftirlitsáætlun, úrbótalisti og dagbók.', tvo('eftirlit')) +
      spj('Flóttaáætlun gesta (IS/EN)', herb ? herb + ' herbergi merkt — ein síða á hvert herbergi með „Þú ert hér“ við dyrnar.' : 'Ein síða á hverja hæð. Merktu herbergi á uppdráttinn til að fá eina síðu á hvert herbergi.', tvo('gestur')) +
      spj('Samningur um eigið eldvarnaeftirlit', 'Eyðublað slökkviliðs með efsta hlutanum útfylltum úr Upplýsingum.', '<button class="ba-btn r" data-a="samningur">Sækja PDF</button>') +
      spj('Gátlistar', 'Mánaðarlegur og árlegur gátlisti (eyðublöð Eldvarnabandalagsins) með haus útfylltum.', '<button class="ba-btn" data-a="gatlisti" data-g="m">Mánaðarlegur (xlsx)</button><button class="ba-btn" data-a="gatlisti" data-g="a">Árlegur (xlsx)</button>') +
      '</div><div class="ba-forskodun" id="ba-forskodun"></div></div>';
  }
  function skjalHtml(s) { var u = st.efni.uppkast !== false; return s === 'ryming' ? S.skjalRyming(st, u) : s === 'eftirlit' ? S.skjalEftirlit(st, u) : S.skjalGestir(st, u); }
  function forskoda(s) { var d = document.getElementById('ba-forskodun'); d.innerHTML = '<iframe title="Forskoðun"></iframe>'; d.firstChild.srcdoc = skjalHtml(s); d.scrollIntoView({ behavior: 'smooth' }); }
  function prenta(s) {
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    f.onload = function () { setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) {} setTimeout(function () { f.remove(); }, 60000); }, 400); };
    f.srcdoc = skjalHtml(s);
  }
  function hlada_nidur(bytes, nafn, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: mime })); a.download = nafn; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function skraarnafn(t) { return (t + '-' + (S.gildi(st, 'heiti') || st.fyr.nafn)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ðÐ]/g, 'd').replace(/[þÞ]/g, 'th').replace(/[æÆ]/g, 'ae').replace(/[öÖ]/g, 'o').replace(/[^\w-]+/g, '-').replace(/-+/g, '-'); }

  // Samningur: efsti hluti SHS-eyðublaðsins (staðsetningar í pt, mældar á eyðublaðinu)
  async function samningur() {
    await hladaSkrift(PDFLIB);
    var P = window.PDFLib, g = function (k) { return S.gildi(st, k); };
    var bytes = await (await fetch('eydublod/shs-samningur-eigid-eftirlit.pdf')).arrayBuffer();
    var pdf = await P.PDFDocument.load(bytes), pg = pdf.getPages()[0], f = await pdf.embedFont(P.StandardFonts.Helvetica);
    var heim = g('heimilisfang').split(','), uppk = st.efni.uppkast !== false;
    var R = [
      [126, 689.9, g('rekstur') || g('eigandi'), 160], [343, 689.9, g('rekstur_kt') || g('eigandi_kt'), 95], [473, 689.9, g('dags'), 75],
      [100, 672.5, (heim[0] || '').trim(), 225], [362, 672.5, (heim.slice(1).join(',') || '').trim(), 75], [470, 672.5, g('rekstur_simi'), 80],
      [152, 655.1, g('abyrgdarmadur'), 280], [470, 655.1, g('abyrgdarmadur_simi'), 80],
      [150, 637.7, g('eldvarnafulltrui'), 285], [470, 637.7, g('eldvarnafulltrui_simi'), 80],
      [70, 602.8, g('eigandi'), 220], [343, 602.8, g('eigandi_kt'), 95], [478, 602.8, g('eigandi_gsm'), 75],
      [100, 585.4, g('eigandi_heimili'), 225], [362, 585.4, g('eigandi_pnr'), 75], [492, 585.4, g('eigandi_vinnusimi'), 60],
    ];
    R.forEach(function (r) {
      if (!r[2] && uppk) pg.drawRectangle({ x: r[0] - 2, y: r[1] - 2.5, width: r[3], height: 11, color: P.rgb(1, 0.93, 0.55), opacity: 0.6 });
      if (r[2]) pg.drawText(String(r[2]).replace(/[^\u0000-ÿ–—·•’“”„]/g, ''), { x: r[0], y: r[1], size: 9, font: f, color: P.rgb(0.04, 0.24, 0.57) });
    });
    if (uppk) pg.drawText('UPPKAST – gulir reitir: eigandi / rekstraraðili fylla út', { x: 330, y: 820, size: 8, font: f, color: P.rgb(0.78, 0.06, 0.18) });
    hlada_nidur(await pdf.save(), skraarnafn('SHS-samningur') + '.pdf', 'application/pdf');
  }

  // Gátlistar: haus fylltur beint í sheet1.xml (inlineStr) svo merki og útlit eyðublaðsins haldist
  async function gatlisti(teg) {
    await hladaSkrift(JSZIP);
    var skra = teg === 'm' ? 'gatlisti-manadarlegur.xlsx' : 'gatlisti-arlegur.xlsx';
    var zip = await window.JSZip.loadAsync(await (await fetch('eydublod/' + skra)).arrayBuffer());
    var xml = await zip.file('xl/worksheets/sheet1.xml').async('string'), g = function (k) { return S.gildi(st, k); };
    var r0 = teg === 'm' ? 9 : 8, nu = new Date();
    var reitir = {};
    reitir['A' + r0] = '  Stofnun / fyrirtæki:   ' + (g('rekstur') || g('eigandi')) + (g('heiti') ? ' – ' + g('heiti') : '');
    reitir['E' + r0] = g('heimilisfang'); reitir['Q' + r0] = g('rekstur_simi') || g('eigandi_gsm');
    reitir['A' + (r0 + 1)] = '  Ábyrgðarmaður:   ' + [g('abyrgdarmadur'), g('abyrgdarmadur_simi')].filter(Boolean).join(', ');
    reitir['A' + (r0 + 2)] = '  Eldvarnafulltrúi:   ' + [g('eldvarnafulltrui'), g('eldvarnafulltrui_simi')].filter(Boolean).join(', ');
    if (teg === 'm') { reitir.N7 = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'][nu.getMonth()]; reitir.S7 = String(nu.getFullYear()); }
    Object.keys(reitir).forEach(function (ref) { xml = setjaReit(xml, ref, reitir[ref]); });
    zip.file('xl/worksheets/sheet1.xml', xml);
    hlada_nidur(await zip.generateAsync({ type: 'uint8array' }), skraarnafn(teg === 'm' ? 'Gatlisti-manadarlegur' : 'Gatlisti-arlegur') + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  function dalkur(ref) { var m = ref.match(/^([A-Z]+)(\d+)$/), n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return [n, +m[2]]; }
  function setjaReit(xml, ref, val) {
    var x = String(val || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var cell = function (s) { return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + x + '</t></is></c>'; };
    var re = new RegExp('<c r="' + ref + '"(?: s="(\\d+)")?(?: t="\\w+")?\\s*(?:/>|>[\\s\\S]*?</c>)');
    var m = xml.match(re);
    if (m) return xml.replace(re, cell(m[1] || '0'));
    var cr = dalkur(ref), rr = new RegExp('(<row [^>]*r="' + cr[1] + '"[^>]*>)([\\s\\S]*?)(</row>)'), rm = xml.match(rr);
    if (!rm) return xml;
    var body = rm[2], pos = body.length, cm, cre = new RegExp('<c r="([A-Z]+)' + cr[1] + '"', 'g');
    while ((cm = cre.exec(body))) { if (dalkur(cm[1] + cr[1])[0] > cr[0]) { pos = cm.index; break; } }
    return xml.replace(rr, rm[1] + body.slice(0, pos) + cell('0') + body.slice(pos) + rm[3]);
  }

  // Sækja slökkvitæki sem eru staðsett í teikningaglugganum (teikning_bord) sem tákn á þessa hæð
  function saekjaTaeki() {
    var h = st.tb[st.haed], e = st.haedarEfni(st.haed), u = st.rammi(st.haed).w / 1600, n = 0;
    vistaSogu();
    (h.markers || []).forEach(function (mk) {
      if (mk.kind === 'sign' || mk.x == null) return;
      var x = mk.x <= 1 && st.frum[st.haed] ? mk.x * st.frum[st.haed].b : mk.x, y = mk.y <= 1 && st.frum[st.haed] ? mk.y * st.frum[st.haed].h : mk.y;
      if (e.merki.some(function (m) { return m.t === 'slt' && Math.abs(m.x - x) + Math.abs(m.y - y) < 40 * u; })) return;
      e.merki.push({ t: 'slt', x: Math.round(x), y: Math.round(y), n: naestaNumer('slt') }); n++;
    });
    teiknaKort(); teiknaEiginleika(); if (n) breytt();
    alert(n ? n + ' slökkvitæki sótt af teikningunni. Athugaðu að staðsetningin sé rétt.' : 'Engin ný slökkvitæki fundust á teikningu þessarar hæðar.');
  }

  // ───────────────────────── atburðir ─────────────────────────
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return;
    var a = b.dataset.a;
    if (a === 'flipi') { st.flipi = b.dataset.f; teiknaFlipa(); return; }
    if (a === 'uppkast') { st.efni.uppkast = b.checked; breytt(); return; }
    if (a === 'saekja') { location.reload(); return; }
    if (a === 'haed') { st.haed = b.dataset.h; st.val = -1; st.leidNy = null; document.querySelectorAll('[data-a="haed"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); teiknaKort(true); teiknaEiginleika(); return; }
    if (a === 'tol') { velja(b.dataset.t); return; }
    if (a === 'zoom') { var z = +b.dataset.z; st.zoom = z === 0 ? 1 : Math.max(0.5, Math.min(5, st.zoom * (z > 0 ? 1.4 : 1 / 1.4))); stillaZoom(); return; }
    if (a === 'rammi') {
      var r = b.dataset.r, id = st.haed, eh = st.haedarEfni(id);
      if (r === '0') delete eh.skurdur;
      else { var k = st.rammi(id), d = Math.round(k.w * 0.08) * (+r); eh.skurdur = { x: k.x - d, y: k.y - d, w: Math.max(200, k.w + 2 * d), h: Math.max(200, k.h + 2 * d) }; }
      breytt(); hladaMynd(id).then(function () { teiknaKort(true); }); return;
    }
    if (a === 'afturkalla') { afturkalla(); return; }
    if (a === 'eyda') { eyda(); return; }
    if (a === 'snua') { var m = st.haedarEfni(st.haed).merki[st.val]; if (m && m.p) { vistaSogu(); m.p.reverse(); teiknaKort(); breytt(); } return; }
    if (a === 'saekja-taeki') { saekjaTaeki(); return; }
    if (a === 'hreinsa') { if (confirm('Eyða öllum merkingum á þessari hæð? (Afturkalla virkar áfram í þessari lotu.)')) { vistaSogu(); st.haedarEfni(st.haed).merki = []; st.val = -1; teiknaKort(); teiknaEiginleika(); breytt(); } return; }
    if (a === 'endurstilla-reit') { ev.preventDefault(); delete st.efni.reitir[b.dataset.k]; breytt(); teiknaFlipa(); uppfaeraVantar(); return; }
    if (a === 'skjal') { st.skjal = b.dataset.s; teiknaFlipa(); return; }
    if (a === 'forsyn' || a === 'endurstilla-kafla' || a === 'eyda-kafla') {
      var kid = b.closest('[data-k]').dataset.k, sk = st.skjal;
      if (a === 'forsyn') st.forsyn[sk + kid] = !st.forsyn[sk + kid];
      if (a === 'endurstilla-kafla' && st.efni.textar[sk]) delete st.efni.textar[sk][kid];
      if (a === 'eyda-kafla' && confirm('Eyða kaflanum?')) st.efni.aukakaflar[sk] = (st.efni.aukakaflar[sk] || []).filter(function (x) { return x.id !== kid; });
      if (a !== 'forsyn') breytt();
      teiknaFlipa(); return;
    }
    if (a === 'nyr-kafli') { var l = st.efni.aukakaflar[st.skjal] || (st.efni.aukakaflar[st.skjal] = []); l.push({ id: 'a' + Date.now(), titill: 'Nýr kafli', texti: '' }); breytt(); teiknaFlipa(); return; }
    if (a === 'forskoda') { forskoda(b.dataset.s); return; }
    if (a === 'prenta') { prenta(b.dataset.s); return; }
    if (a === 'samningur') { samningur().catch(function (e) { alert('Samningurinn tókst ekki: ' + e.message); }); return; }
    if (a === 'gatlisti') { gatlisti(b.dataset.g).catch(function (e) { alert('Gátlistinn tókst ekki: ' + e.message); }); return; }
    if (a === 'i-reit') { st.flipi = 'uppl'; teiknaFlipa(); var i = document.getElementById('r-' + b.dataset.k); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } return; }
  });
  app.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.dataset.r) {   // reitur í Upplýsingum
      var k = t.dataset.r, v = t.value;
      if (st.sjalf[k] != null && v === String(st.sjalf[k])) delete st.efni.reitir[k]; else st.efni.reitir[k] = v;
      t.parentElement.classList.toggle('tomt', !v.trim()); breytt(); uppfaeraVantar(); return;
    }
    if (t.dataset.kt) {  // kaflatexti
      var kd = t.closest('[data-k]').dataset.k, sk = st.skjal, auka = (st.efni.aukakaflar[sk] || []).find(function (x) { return x.id === kd; });
      if (auka) auka[t.dataset.kt] = t.value;
      else { var y = (st.efni.textar[sk] = st.efni.textar[sk] || {}); var o = (y[kd] = y[kd] || {}); o[t.dataset.kt] = t.value;
        var sj = S.KAFLAR[sk].find(function (x) { return x[0] === kd; }); if (sj && o.titill === sj[1]) delete o.titill; if (sj && o.texti === sj[2]) delete o.texti; if (!Object.keys(o).length) delete y[kd]; }
      var fs = t.closest('.ba-kafli').querySelector('.ba-forsyn'); if (fs) fs.innerHTML = S.md(st, t.closest('.ba-kafli').querySelector('textarea').value);
      breytt(); return;
    }
    if (t.dataset.e) {   // eiginleiki valins tákns
      var m = st.haedarEfni(st.haed).merki[st.val]; if (!m) return;
      var e = t.dataset.e; if (t.type === 'checkbox') { if (t.checked) m[e] = 1; else delete m[e]; } else m[e] = t.value;
      _lag.innerHTML = T.lag(st.rammi(st.haed), st.haedarEfni(st.haed).merki, { ham: 'ritill' }); teiknaVal(); breytt();
    }
  });
  app.addEventListener('change', function (ev) { if (ev.target.dataset.e === 'lbl') ev.target.dispatchEvent(new Event('input', { bubbles: true })); });
  window.addEventListener('resize', function () { if (st.flipi === 'uppd') stillaZoom(); });

  hlada().catch(function (e) { console.error(e); villa('Villa við að sækja gögn: ' + esc(e.message || e)); });
  window.__ba = st;   // til prófana
})();
