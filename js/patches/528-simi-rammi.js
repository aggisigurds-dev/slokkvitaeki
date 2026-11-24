/* === 528 — SÍMI: RAMMI, STIKA, ZOOM OG UPPSETNING ============================
 *
 * Agnar 24.11.2026 (S26, skjámyndir):
 *   1. Öpp á að setjast upp sem sitt eigið app, ekki flýtileið inni í aðalappinu.
 *      Uppsetningarflæðið sjálft er í 261 (intent í Chrome). Hér er ramminn.
 *   2. Botnstikuna má færa (neðst / efst / vinstri / hægri) og raða flipum.
 *      Geymt á TÆKINU (localStorage) — ekki sameiginlegt milli síma.
 *   3. Rammi símans er svartur (theme-color er í manifestinu). Appelsínugula
 *      röndin undir borðanum hverfur á síma. − / + í hausnum stillir stærð.
 *      Spjall-bólan má ekki liggja ofan á flipum eða upphæðum.
 *   4. Við smækkun (Stærð 30–50 %) á rammi og Kröfuyfirlit að fylla breiddina
 *      án þess að upphæðin klippist.
 *
 * 153/187 ósnert. Engin skrif í reikninga.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__simiRammi528) return;
  window.__simiRammi528 = true;

  var LS = 'slokk_stika_v1';
  var STADIR = ['botn', 'efst', 'vinstri', 'haegri'];

  function lesa() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { return {}; }
  }
  function vista(o) {
    try { localStorage.setItem(LS, JSON.stringify(o)); } catch (_) {}
  }
  function stadur() {
    var s = lesa().stadur || 'botn';
    return STADIR.indexOf(s) >= 0 ? s : 'botn';
  }
  function appKey() {
    return (document.body && document.body.getAttribute('data-app')) || '';
  }

  function setjaStad(s) {
    if (STADIR.indexOf(s) < 0) return;
    var o = lesa();
    o.stadur = s;
    vista(o);
    beita();
    try { if (window.OppStyribord && OppStyribord.render) OppStyribord.render(); } catch (_) {}
    teiknaStiku();
  }
  function rodLista() {
    var key = appKey();
    var o = lesa();
    var rod = (o.rod && o.rod[key]) || [];
    return Array.isArray(rod) ? rod.slice() : [];
  }
  function vistaRod(listi) {
    var key = appKey();
    if (!key) return;
    var o = lesa();
    o.rod = o.rod || {};
    o.rod[key] = listi;
    vista(o);
  }
  function faeraFlipa(k, dir) {
    var nav = document.getElementById('_app-nav');
    if (!nav) return;
    var takkar = Array.prototype.slice.call(nav.querySelectorAll('._app-tab'));
    var lykklar = takkar.map(function (b) { return b.getAttribute('data-k'); });
    var i = lykklar.indexOf(k);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= lykklar.length) return;
    var tmp = lykklar[i];
    lykklar[i] = lykklar[j];
    lykklar[j] = tmp;
    vistaRod(lykklar);
    beita();
    teiknaStiku();
  }

  var CSS = [
    /* Appelsínugul rönd / glóð undir borðanum — ramminn á síma er svartur.
       background-image vinnur á móti background-shorthand, svo bæði eru núllstillt. */
    '@media (pointer: coarse), (max-width: 900px){',
    'html #bstal-banner .bb-face::before,html #bstal-banner .bb-face::after{',
    'background:#000!important;background-image:none!important;box-shadow:none!important;}',
    '}',

    /* − / + stærð í hausnum */
    '#_sz-step{display:none;align-items:center;gap:4px;z-index:2147483000}',
    'html[data-viewmode="mobile"] #_sz-step,body.appmode #_sz-step,#_sz-step.syn{display:flex}',
    'html.app-krom-zoomed body:not(.appmode) #_sz-step{zoom:var(--app-krom-zoom,1)!important}',
    'body:not(.appmode) #_sz-step{position:fixed;top:10px;right:96px}',
    'body.appmode #_sz-step{position:static;margin-left:2px}',
    '#_sz-step button{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;max-width:30px!important;padding:0!important;border-radius:7px;',
    'border:1px solid #000;background:#1c1e23;color:#f4efe2;font:700 16px/1 system-ui,sans-serif;cursor:pointer}',
    '#_sz-step .sz-pct{width:auto!important;max-width:none!important;min-width:0!important;padding:0 2px!important;background:transparent!important;border:0!important;color:#f4efe2;font:700 11px/1 system-ui,sans-serif}',

    /* Botnstika — staður */
    'body[data-stika="efst"] #_app-nav{top:var(--stika-haus,52px)!important;bottom:auto!important;',
    'left:0!important;right:0!important;border-top:0!important;border-bottom:1px solid #000!important;',
    'box-shadow:0 3px 14px rgba(0,0,0,.35)!important}',
    'body[data-stika="vinstri"] #_app-nav,body[data-stika="haegri"] #_app-nav{',
    'top:var(--stika-haus,52px)!important;bottom:0!important;width:86px!important;',
    'flex-direction:column!important;overflow-x:hidden!important;overflow-y:auto!important;',
    'border-top:0!important}',
    'body[data-stika="vinstri"] #_app-nav{left:0!important;right:auto!important;border-right:1px solid #000!important}',
    'body[data-stika="haegri"] #_app-nav{right:0!important;left:auto!important;border-left:1px solid #000!important}',
    'body[data-stika="vinstri"] #_app-nav button,body[data-stika="haegri"] #_app-nav button{',
    'flex:0 0 auto!important;width:100%!important;min-width:0!important;min-height:68px!important}',

    /* Kröfuyfirlit: upphæðin má ekki klippast þegar röðin er mjórri en innihaldið. */
    'body.appmode #view-krofu-yfirlit .ky-card-rows,html[data-viewmode="mobile"] #view-krofu-yfirlit .ky-card-rows{container-type:inline-size}',
    '@container (max-width:1400px){',
    'body.appmode #view-krofu-yfirlit .ky-card-rows>.ky-row,',
    'html[data-viewmode="mobile"] #view-krofu-yfirlit .ky-card-rows>.ky-row{',
    'flex-wrap:wrap!important;width:100%!important;min-width:0!important;row-gap:8px!important}',
    'body.appmode #view-krofu-yfirlit .ky-row-end,',
    'html[data-viewmode="mobile"] #view-krofu-yfirlit .ky-row-end{',
    'flex:1 1 100%!important;margin-left:0!important;justify-content:space-between!important;flex-wrap:wrap!important}',
    '}',
    'html[data-viewmode] body #view-krofu-yfirlit#view-krofu-yfirlit:not(#_kyx1):not(#_kyx2):not(#_kyx3):not(#_kyx4):not(#_kyx5):not(#_p528) .ky-row-end>.ky-num{',
    'width:auto!important;min-width:6.5em!important;max-width:none!important;overflow:visible!important;flex:0 0 auto!important;text-align:right!important}',
    'html[data-viewmode] body #view-krofu-yfirlit#view-krofu-yfirlit:not(#_kyx1):not(#_kyx2):not(#_kyx3):not(#_kyx4):not(#_kyx5):not(#_p528) div:has(>.ky-card-rows){',
    'overflow:visible!important}',

    /* Stika-stilling inni í Stærð-blaðinu */
    '#_sz-stika{margin:10px 0 0;padding-top:8px;border-top:1px solid rgba(255,255,255,.09)}',
    '#_sz-stika .sz-lbl{display:block;margin-bottom:6px}',
    '#_sz-stika .st-seg{display:flex;gap:4px;flex-wrap:wrap}',
    '#_sz-stika .st-seg button,#_sz-stika .rod button{height:32px;border-radius:8px;border:1px solid #000;',
    'background:rgba(255,255,255,.07);color:#e7e9ee;font:700 12px system-ui,sans-serif}',
    '#_sz-stika .st-seg button.on{background:#fbfcfd;color:#1f2530}',
    '#_sz-stika .rod{display:flex;flex-direction:column;gap:4px;margin-top:8px}',
    '#_sz-stika .rod div{display:flex;align-items:center;gap:6px}',
    '#_sz-stika .rod span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
    '#_sz-stika .rod button{width:32px;flex:none}'
  ].join('');

  var st = document.createElement('style');
  st.id = '_simi-rammi-528';
  st.textContent = CSS;
  document.head.appendChild(st);

  function skref(delta) {
    try {
      if (!window.AppPageZoom || !AppPageZoom.getS || !AppPageZoom.setS) return;
      var s = Math.round((AppPageZoom.getS() + delta) * 20) / 20;
      AppPageZoom.setS(s);
      synaPct();
    } catch (_) {}
  }
  function synaPct() {
    var el = document.querySelector('#_sz-step .sz-pct');
    if (!el || !window.AppPageZoom || !AppPageZoom.getS) return;
    el.textContent = Math.round(AppPageZoom.getS() * 100) + '%';
  }
  function tryggtSkref() {
    var box = document.getElementById('_sz-step');
    if (!box) {
      box = document.createElement('div');
      box.id = '_sz-step';
      box.innerHTML = '<button type="button" data-sz-step="-1" aria-label="Minnka">−</button>'
        + '<button type="button" class="sz-pct" data-sz-step="0" aria-label="Stærð">100%</button>'
        + '<button type="button" data-sz-step="1" aria-label="Stækka">+</button>';
      document.body.appendChild(box);
    }
    var hdr = document.getElementById('_app-hdr');
    var style = hdr && document.getElementById('_app-style');
    if (hdr && document.body.classList.contains('appmode')) {
      if (box.parentNode !== hdr) {
        if (style) hdr.insertBefore(box, style);
        else hdr.appendChild(box);
      }
    } else if (box.parentNode !== document.body) {
      document.body.appendChild(box);
    }
    var simi = document.body.classList.contains('appmode')
      || document.documentElement.getAttribute('data-viewmode') === 'mobile'
      || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    box.classList.toggle('syn', !!simi);
    synaPct();
  }

  function radaNav() {
    var nav = document.getElementById('_app-nav');
    if (!nav) return;
    var takkar = Array.prototype.slice.call(nav.querySelectorAll('._app-tab'));
    if (takkar.length < 2) return;
    var rod = rodLista();
    if (!rod.length) return;
    var map = {};
    takkar.forEach(function (b) { map[b.getAttribute('data-k')] = b; });
    var seen = {};
    rod.forEach(function (k) {
      if (map[k]) { nav.appendChild(map[k]); seen[k] = 1; }
    });
    takkar.forEach(function (b) {
      var k = b.getAttribute('data-k');
      if (!seen[k]) nav.appendChild(b);
    });
  }

  function zoomAf(el) {
    try { var z = parseFloat(getComputedStyle(el).zoom); if (z > 0) return z; } catch (_) {}
    return 1;
  }

  function fylliRamman() {
    var f = document.getElementById('_app-frame');
    if (!f || !f.isConnected) return;
    var cs = getComputedStyle(f);
    if (cs.display === 'none') return;
    var z = zoomAf(f);
    var s = stadur();
    if (!(z > 0) || Math.abs(z - 1) < 0.02 || (s !== 'botn' && s !== 'efst')) {
      if (f.dataset.fyllt && (s === 'botn' || s === 'efst')) {
        ['width', 'max-width', 'right'].forEach(function (p) { f.style.removeProperty(p); });
        delete f.dataset.fyllt;
      }
      return;
    }
    f.dataset.fyllt = '1';
    f.style.setProperty('left', '0px', 'important');
    f.style.setProperty('right', 'auto', 'important');
    f.style.setProperty('width', 'calc(100vw / ' + z + ')', 'important');
    f.style.setProperty('max-width', 'none', 'important');
  }

  function fylliSyn() {
    if (!document.body || !document.body.classList.contains('appmode')) return;
    var v = document.querySelector('.view.active');
    if (!v) return;
    var z = zoomAf(v);
    if (!(z > 0) || z >= 0.98) return;
    v.style.setProperty('width', 'calc(100vw / ' + z + ')', 'important');
    v.style.setProperty('max-width', 'none', 'important');
    v.style.setProperty('box-sizing', 'border-box', 'important');
  }

  function fyllingHliðar() {
    var s = stadur();
    if (!document.body.classList.contains('appmode') || s === 'botn') return;
    var nav = document.getElementById('_app-nav');
    var hdr = document.getElementById('_app-hdr');
    if (!nav) return;
    var nr = nav.getBoundingClientRect();
    var haus = hdr ? Math.round(hdr.getBoundingClientRect().bottom) : 52;
    document.documentElement.style.setProperty('--stika-haus', haus + 'px');
    var views = document.querySelectorAll('.view');
    views.forEach(function (v) {
      var z = zoomAf(v) || 1;
      if (s === 'efst') {
        v.style.setProperty('padding-top', Math.round((nr.bottom + 8) / z) + 'px', 'important');
        v.style.setProperty('padding-bottom', '12px', 'important');
        v.style.removeProperty('padding-left');
        v.style.removeProperty('padding-right');
      } else if (s === 'vinstri') {
        v.style.setProperty('padding-left', Math.round((nr.width + 8) / z) + 'px', 'important');
        v.style.setProperty('padding-bottom', '12px', 'important');
        v.style.removeProperty('padding-right');
      } else if (s === 'haegri') {
        v.style.setProperty('padding-right', Math.round((nr.width + 8) / z) + 'px', 'important');
        v.style.setProperty('padding-bottom', '12px', 'important');
        v.style.removeProperty('padding-left');
      }
    });
    var f = document.getElementById('_app-frame');
    if (!f) return;
    var fz = zoomAf(f);
    if (s === 'efst') {
      f.style.setProperty('top', Math.round(nr.bottom / fz) + 'px', 'important');
      f.style.setProperty('bottom', '0px', 'important');
      f.style.setProperty('left', '0px', 'important');
    } else if (s === 'vinstri') {
      f.style.setProperty('left', Math.round(nr.width / fz) + 'px', 'important');
      f.style.setProperty('right', '0px', 'important');
      f.style.setProperty('width', 'auto', 'important');
      f.style.setProperty('bottom', '0px', 'important');
      delete f.dataset.fyllt;
    } else if (s === 'haegri') {
      f.style.setProperty('right', Math.round(nr.width / fz) + 'px', 'important');
      f.style.setProperty('left', '0px', 'important');
      f.style.setProperty('width', 'auto', 'important');
      f.style.setProperty('bottom', '0px', 'important');
      delete f.dataset.fyllt;
    }
  }

  function lyftaBolu() {
    if (!document.body || !document.body.classList.contains('appmode')) return;
    var nav = document.getElementById('_app-nav');
    var s = stadur();
    var nr = null;
    if (nav && getComputedStyle(nav).display !== 'none' && nav.querySelector('._app-tab')) nr = nav.getBoundingClientRect();
    var grunn = 14;
    if (nr && s === 'botn') grunn = Math.max(14, Math.round(window.innerHeight - nr.top) + 12);
    if (nr && s === 'efst') grunn = 14;
    var vinstri = 12;
    if (nr && s === 'vinstri') vinstri = Math.round(nr.right) + 12;
    var haegriFra = 12;
    if (nr && s === 'haegri') haegriFra = Math.round(window.innerWidth - nr.left) + 12;

    // Spjallið fer til vinstri svo það liggi ekki á upphæðum og hægri flipum.
    function setja(el, prop, val) {
      if (el.style.getPropertyValue(prop) !== val) el.style.setProperty(prop, val, 'important');
    }
    var spjall = document.getElementById('_ad-fab');
    var sa = document.querySelector('.sa494');
    var yfir = grunn;
    if (sa && getComputedStyle(sa).display !== 'none') yfir += (sa.offsetHeight || 36) + 10;
    if (spjall && getComputedStyle(spjall).display !== 'none') {
      setja(spjall, 'position', 'fixed');
      setja(spjall, 'left', vinstri + 'px');
      setja(spjall, 'right', 'auto');
      setja(spjall, 'top', 'auto');
      setja(spjall, 'bottom', yfir + 'px');
    }
    var qr = document.getElementById('qr-fab');
    if (qr && getComputedStyle(qr).display !== 'none') {
      setja(qr, 'position', 'fixed');
      setja(qr, 'right', haegriFra + 'px');
      setja(qr, 'left', 'auto');
      setja(qr, 'top', 'auto');
      setja(qr, 'bottom', grunn + 'px');
    }
  }

  function beita() {
    if (!document.body) return;
    var s = document.body.classList.contains('appmode') ? stadur() : 'botn';
    if (document.body.getAttribute('data-stika') !== s) document.body.setAttribute('data-stika', s);
    radaNav();
    tryggtSkref();
    fyllingHliðar();
    fylliRamman();
    fylliSyn();
    lyftaBolu();
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function teiknaStiku() {
    var host = document.getElementById('_sz-stika');
    if (!host) return;
    var s = stadur();
    var nav = document.getElementById('_app-nav');
    var takkar = nav ? Array.prototype.slice.call(nav.querySelectorAll('._app-tab')) : [];
    var heiti = { botn: 'Neðst', efst: 'Efst', vinstri: 'Vinstri', haegri: 'Hægri' };
    var seg = STADIR.map(function (k) {
      return '<button type="button" data-stika="' + k + '"' + (k === s ? ' class="on"' : '') + '>' + heiti[k] + '</button>';
    }).join('');
    var rod = takkar.map(function (b) {
      var k = b.getAttribute('data-k');
      var nafn = (b.textContent || k || '').replace(/\s+/g, ' ').trim();
      return '<div><button type="button" data-rod="-1" data-k="' + esc(k) + '" aria-label="Upp">↑</button>'
        + '<button type="button" data-rod="1" data-k="' + esc(k) + '" aria-label="Niður">↓</button>'
        + '<span>' + esc(nafn) + '</span></div>';
    }).join('');
    var html = '<span class="sz-lbl">BOTNSTIKA · ÞETTA TÆKI</span><div class="st-seg">' + seg + '</div>'
      + (rod ? '<div class="rod">' + rod + '</div>' : '');
    if (host._h !== html) { host.innerHTML = html; host._h = html; }
  }

  document.addEventListener('click', function (e) {
    var step = e.target && e.target.closest && e.target.closest('[data-sz-step]');
    if (step) {
      e.preventDefault();
      var n = +step.getAttribute('data-sz-step');
      if (n === 0) { try { if (window.AppPageZoom && AppPageZoom.opna) AppPageZoom.opna(); } catch (_) {} return; }
      skref(n > 0 ? 0.05 : -0.05);
      return;
    }
    var stBtn = e.target && e.target.closest && e.target.closest('[data-stika]');
    if (stBtn && stBtn.getAttribute('data-stika')) {
      setjaStad(stBtn.getAttribute('data-stika'));
      return;
    }
    var rodBtn = e.target && e.target.closest && e.target.closest('[data-rod]');
    if (rodBtn) {
      e.preventDefault();
      faeraFlipa(rodBtn.getAttribute('data-k'), +rodBtn.getAttribute('data-rod'));
    }
  });

  function vefja() {
    try {
      if (window.AppKrom && AppKrom.measure && !AppKrom.measure.__528) {
        var orig = AppKrom.measure;
        AppKrom.measure = function () {
          var r = orig.apply(this, arguments);
          try { beita(); } catch (_) {}
          return r;
        };
        AppKrom.measure.__528 = true;
      }
    } catch (_) {}
    try {
      if (window.AppPageZoom && AppPageZoom.opna && !AppPageZoom.opna.__528) {
        var op = AppPageZoom.opna;
        AppPageZoom.opna = function () {
          var r = op.apply(this, arguments);
          setTimeout(teiknaStiku, 0);
          setTimeout(synaPct, 0);
          return r;
        };
        AppPageZoom.opna.__528 = true;
      }
      if (window.AppPageZoom && AppPageZoom.setS && !AppPageZoom.setS.__528) {
        var ss = AppPageZoom.setS;
        AppPageZoom.setS = function () {
          var r = ss.apply(this, arguments);
          synaPct();
          setTimeout(beita, 40);
          return r;
        };
        AppPageZoom.setS.__528 = true;
      }
    } catch (_) {}
  }

  window.SlokkStika = { stadur: stadur, setja: setjaStad, faera: faeraFlipa, beita: beita, version: '528' };

  function boot() { vefja(); beita(); teiknaStiku(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(function (ms) { setTimeout(boot, ms); });
  window.addEventListener('resize', function () { setTimeout(beita, 80); });
  document.addEventListener('view-shown', function () { setTimeout(beita, 40); });
  setInterval(function () { try { vefja(); beita(); } catch (_) {} }, 1500);
})();
