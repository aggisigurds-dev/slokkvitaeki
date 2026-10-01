/* === HÚSMYND AÐ UTAN (432) ====================================================
 * Agnar: loftmynd af heimilisfangi er gagnslaus. Hann hefur verið að skjámynda
 * húsið sjálft úr Google Maps / Já. Forsíðumyndin nægir, sótt einu sinni og
 * geymd. Prófíll opinn kallar hvorki Google né /api/husmynd.
 *
 * Takkar: „Sækja mynd að utan“ á opnum prófíl, „Sækja myndir sem vantar“ þar
 * og á Uppfærsluborði (#view-uppferslubord) þegar það er til. Hoppið er hægt
 * (~1 sókn/sek), sýnir framvindu og stöðvast. Það sleppir félagi sem á þegar
 * mynd eða á ekkert heimilisfang. Hlaða (407) snertir þetta ekki.
 *
 * Geymsla: sama og 367. Skrá í verkbord-files/bygging/<id>/hus-utan.jpg og
 * vísun í AppSettings co_bygging_mynd. Handvirkar myndir (uppspretta handvirkt
 * eða engin uppspretta) eru aldrei yfirskrifaðar. borgarvefsja-2018 telst mynd
 * sem er þegar til og er sleppt nema „Uppfæra eftir heimilisfangi“ sé ýtt.
 *
 * Lykill: Netlify env GOOGLE_MAPS_API_KEY, lesinn í /api/husmynd. Vanti hann
 * segir takkinn „Vantar lykil“ og ekkert er vistað.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.HusmyndUtan) return;

  var TAG = '[husmynd]';
  var LYKILL = 'co_bygging_mynd';
  var BUCKET = 'verkbord-files';
  var BILL_MS = 1100;
  var _iGangi = new Set();
  var _hopp = false;
  var _stodva = false;
  var _lina = '';
  var _kall = 0;
  var _hnitTafla = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bida(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sbKlient() { return window.DB && DB.sb; }
  function coIdNu() {
    var m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    if (m) return +m[1];
    var el = document.querySelector('#companies-main [data-co-id]');
    var v = el && +el.getAttribute('data-co-id');
    return v || null;
  }
  function fletta(s) {
    return String(s || '').toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o')
      .replace(/ú/g, 'u').replace(/ý/g, 'y').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/þ/g, 'th').replace(/ð/g, 'd');
  }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }

  function stilar() {
    if (document.getElementById('husmynd-css')) return;
    var s = document.createElement('style');
    s.id = 'husmynd-css';
    s.textContent = [
      '#_husmynd-lina{font-size:12px;line-height:1.3;color:var(--ink2,#475569);max-width:240px}',
      '.co-husmynd-att{margin-top:4px;font:600 10px/1.3 system-ui,sans-serif;color:rgba(255,255,255,.75);text-align:right}',
      '.co-husmynd-engin{font:600 12px/1.35 system-ui,sans-serif;color:rgba(255,255,255,.86);text-align:center;padding:10px 8px}',
      '#_husmynd-framvinda{position:fixed;left:16px;right:16px;bottom:16px;z-index:99990;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 12px;background:#1c1915;color:#f5f0e6;border:1px solid #000;border-radius:8px;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}',
      '#_husmynd-framvinda button{font:700 12px/1 system-ui,sans-serif;padding:7px 10px;border-radius:6px;border:1px solid #000;background:#efe8dc;color:#1c1915;cursor:pointer}',
      '#_husmynd-bordbox{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}',
      '#_husmynd-bordbox button{font:700 13px/1 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:1px solid #000;background:#1c1915;color:#f5f0e6;cursor:pointer}'
    ].join('');
    document.head.appendChild(s);
  }

  function erHandvirk(f) {
    if (!f || !f.url) return false;
    var u = f.uppspretta || '';
    return u === 'handvirkt' || u === '';
  }
  function samiAdr(a, b) {
    return String(a || '').trim() === String(b || '').trim();
  }
  // null = má sækja. Annars ástæða til að sleppa.
  function aAdSleppa(f, adr, force) {
    if (!adr || !/\d/.test(adr)) return 'ekkert-heimilisfang';
    if (erHandvirk(f)) return 'handvirkt';
    if (!force && f && f.url) return 'mynd-til';
    if (!force && f && f.engin && samiAdr(f.heimilisfang, adr)) return 'engin-thad';
    return null;
  }
  function textiFyrir(kodi) {
    if (kodi === 'handvirkt') return 'Handvirk mynd er skilin eftir';
    if (kodi === 'mynd-til') return 'Mynd er þegar til';
    if (kodi === 'engin-thad') return 'Engin mynd af húsi að utan';
    if (kodi === 'ekkert-heimilisfang') return 'Vantar heimilisfang';
    return '';
  }

  async function tryggjaStillingar() {
    if (!window.AppSettings || !AppSettings.load) throw new Error('Stillingar ekki tiltækar');
    if (typeof AppSettings.isLoaded === 'function' && AppSettings.isLoaded()) return;
    await AppSettings.load();
  }
  function lesa(coId) {
    try {
      var m = (window.AppSettings && AppSettings.path && AppSettings.path(LYKILL)) || {};
      return m[String(coId)] || null;
    } catch (_) { return null; }
  }
  function felag(id) {
    var list = (window.Companies && Companies.list) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && +list[i].id === +id) return list[i];
    return null;
  }
  function heimilisfang(id) {
    var c = felag(id);
    if (c && String(c.heimilisfang || '').trim()) return String(c.heimilisfang).trim();
    if (+coIdNu() === +id) {
      var b = document.querySelector('#companies-main .co-banner .co-banner-facts b')
        || document.querySelector('.co-banner .co-banner-facts b');
      if (b) return String(b.textContent || '').trim();
    }
    return c ? String(c.heimilisfang || '').trim() : '';
  }

  function hnitUrMinni(adr) {
    try {
      var gc = JSON.parse(localStorage.getItem('_slokk_gc') || '{}');
      var p = gc[adr];
      var lon = p && (typeof p.lon === 'number' ? p.lon : p.lng);
      if (p && typeof p.lat === 'number' && typeof lon === 'number') return { lat: p.lat, lng: lon };
    } catch (_) {}
    if (_hnitTafla && _hnitTafla.has(adr)) return _hnitTafla.get(adr);
    return null;
  }
  function vistaHnit(adr, lat, lng) {
    try {
      var gc = JSON.parse(localStorage.getItem('_slokk_gc') || '{}');
      gc[adr] = { lat: lat, lng: lng };
      localStorage.setItem('_slokk_gc', JSON.stringify(gc));
    } catch (_) {}
  }
  async function hnitUrGrunni(adr) {
    var s = sbKlient();
    if (!s) return null;
    var r = await s.from('geocode_cache').select('lat,lng').eq('query', adr).limit(1);
    if (r.error || !r.data || !r.data.length) return null;
    var row = r.data[0];
    if (typeof row.lat !== 'number' || typeof row.lng !== 'number') return null;
    return { lat: row.lat, lng: row.lng };
  }
  async function hnitFyrir(adr, maGeocode) {
    var minni = hnitUrMinni(adr);
    if (minni) return { hnit: minni, geocode: false };
    var grunn = await hnitUrGrunni(adr);
    if (grunn) {
      vistaHnit(adr, grunn.lat, grunn.lng);
      return { hnit: grunn, geocode: false };
    }
    if (!maGeocode) return { hnit: null, geocode: false };
    _kall++;
    var resp = await fetch('/api/geocode?q=' + encodeURIComponent(adr));
    if (!resp.ok) return { hnit: null, geocode: true };
    var g = await resp.json();
    if (!g || typeof g.lat !== 'number') return { hnit: null, geocode: true };
    var lon = typeof g.lon === 'number' ? g.lon : g.lng;
    if (typeof lon !== 'number') return { hnit: null, geocode: true };
    vistaHnit(adr, +g.lat, +lon);
    return { hnit: { lat: +g.lat, lng: +lon }, geocode: true };
  }

  function synaLinu(texti) {
    _lina = texti || '';
    var el = document.getElementById('_husmynd-lina');
    if (el) el.textContent = _lina;
  }
  function merkjaTakka() {
    var id = coIdNu();
    var einn = document.getElementById('_husmynd-einn');
    if (einn) {
      var i = id && _iGangi.has(id);
      einn.textContent = i ? 'Sæki…' : 'Sækja mynd að utan';
      einn.disabled = !!i;
    }
    var lin = document.getElementById('_husmynd-lina');
    if (lin && !lin.textContent) lin.textContent = _lina;
    document.querySelectorAll('[data-husmynd-hopp]').forEach(function (b) {
      b.textContent = _hopp ? 'Stöðva' : 'Sækja myndir sem vantar';
    });
  }
  function framvinda(texti, lokid) {
    var el = document.getElementById('_husmynd-framvinda');
    if (!el) {
      el = document.createElement('div');
      el.id = '_husmynd-framvinda';
      el.innerHTML = '<span id="_husmynd-fram-texti"></span><button type="button" id="_husmynd-fram-stopp">Stöðva</button>';
      document.body.appendChild(el);
      el.querySelector('#_husmynd-fram-stopp').addEventListener('click', function () {
        if (_hopp) _stodva = true;
        else { var n = document.getElementById('_husmynd-framvinda'); if (n) n.remove(); }
      });
    }
    var t = document.getElementById('_husmynd-fram-texti');
    if (t) t.textContent = texti;
    var b = document.getElementById('_husmynd-fram-stopp');
    if (b) b.textContent = lokid ? 'Loka' : 'Stöðva';
  }

  function minnka(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var i = new Image();
      i.onload = function () {
        try {
          var w = i.naturalWidth, h = i.naturalHeight;
          var k = Math.min(1, 1600 / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * k));
          c.height = Math.max(1, Math.round(h * k));
          c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { resolve(b || blob); }, 'image/jpeg', 0.85);
        } catch (_) { URL.revokeObjectURL(url); resolve(blob); }
      };
      i.onerror = function () { URL.revokeObjectURL(url); resolve(blob); };
      i.src = url;
    });
  }
  function b64Blob(b64, tegund) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: tegund || 'image/jpeg' });
  }

  async function vistaMynd(coId, adr, svar) {
    var s = sbKlient();
    if (!s) throw new Error('Engin gagnagrunnstenging');
    var blob = await minnka(b64Blob(svar.image, svar.contentType));
    var slod = 'bygging/' + coId + '/hus-utan.jpg';
    var up = await s.storage.from(BUCKET).upload(slod, blob, { contentType: 'image/jpeg', upsert: true });
    if (up.error) throw up.error;
    var pub = s.storage.from(BUCKET).getPublicUrl(slod);
    var url = pub && pub.data && pub.data.publicUrl;
    if (!url) throw new Error('fékk enga slóð');
    var ts = Date.now();
    var gildi = {
      url: url + '?v=' + ts,
      slod: BUCKET + '/' + slod,
      ts: new Date(ts).toISOString(),
      uppspretta: 'google',
      heimild: svar.heimild || 'places',
      attribution: svar.attribution || '© Google',
      heimilisfang: adr,
      engin: false
    };
    var p = {}; p[String(coId)] = gildi;
    var ok = await AppSettings.save({ co_bygging_mynd: p });
    if (ok === false) throw new Error('vistun mistókst');
    if (window.ByggingMynd && ByggingMynd.endurteikna) ByggingMynd.endurteikna(true);
    merkjaAttribution();
    return gildi;
  }
  async function vistaEngin(coId, adr) {
    var gildi = {
      engin: true,
      ts: new Date().toISOString(),
      uppspretta: 'google',
      heimild: 'engin',
      heimilisfang: adr,
      skilabod: 'Engin mynd af húsi að utan'
    };
    var p = {}; p[String(coId)] = gildi;
    var ok = await AppSettings.save({ co_bygging_mynd: p });
    if (ok === false) throw new Error('vistun mistókst');
    if (window.ByggingMynd && ByggingMynd.endurteikna) ByggingMynd.endurteikna(true);
    felaLoft();
    return gildi;
  }

  function merkjaAttribution() {
    var id = coIdNu();
    if (!id) return;
    var m = lesa(id);
    var box = document.querySelector('#companies-main .co-mynd') || document.querySelector('.co-mynd');
    if (!box) return;
    var el = box.querySelector('.co-husmynd-att');
    if (!m || !m.url || m.uppspretta !== 'google') {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'co-husmynd-att';
      box.appendChild(el);
    }
    el.textContent = m.attribution || '© Google';
  }
  function felaLoft() {
    var id = coIdNu();
    if (!id) return;
    var m = lesa(id);
    if (!m || !m.engin || m.url) return;
    var flis = document.querySelector('#companies-main .co-mynd .co-mynd-flis') || document.querySelector('.co-mynd .co-mynd-flis');
    if (!flis) return;
    var loft = flis.querySelector('.co-mynd-loft');
    if (loft) loft.remove();
    if (!flis.querySelector('.co-husmynd-engin')) {
      var p = document.createElement('div');
      p.className = 'co-husmynd-engin';
      p.textContent = 'Engin mynd af húsi að utan';
      flis.appendChild(p);
    }
  }

  async function saekjaEitt(coId, force, opts) {
    opts = opts || {};
    coId = +coId;
    if (!coId || _iGangi.has(coId)) return { sleppt: 'i-gangi' };
    _iGangi.add(coId);
    merkjaTakka();
    var net = false;
    try {
      await tryggjaStillingar();
      var adr = heimilisfang(coId);
      var f = lesa(coId);
      var sleppt = aAdSleppa(f, adr, !!force);
      if (sleppt) {
        if (!opts.hljodlaust) synaLinu(textiFyrir(sleppt));
        return { sleppt: sleppt, net: false };
      }
      if (!opts.hljodlaust) synaLinu('Sæki…');
      var h = await hnitFyrir(adr, true);
      if (h.geocode) net = true;
      if (!h.hnit) {
        if (!opts.hljodlaust) synaLinu('Fann ekki hnit fyrir heimilisfangið');
        return { villa: 'vantar-hnit', net: net };
      }
      _kall++;
      net = true;
      var resp = await fetch('/api/husmynd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: h.hnit.lat, lng: h.hnit.lng, address: adr })
      });
      var data = {};
      try { data = await resp.json(); } catch (_) { data = {}; }
      if (data && data.ok && data.image) {
        await vistaMynd(coId, adr, data);
        if (!opts.hljodlaust) synaLinu(data.attribution || '© Google');
        return { ok: true, net: true, heimild: data.heimild };
      }
      var kodi = data && data.error;
      if (kodi === 'engin-mynd') {
        if (!(f && f.url)) await vistaEngin(coId, adr);
        if (!opts.hljodlaust) synaLinu('Engin mynd af húsi að utan');
        return { engin: true, net: true };
      }
      var skil = (data && data.message) || 'Tókst ekki að sækja mynd';
      if (!opts.hljodlaust) synaLinu(skil);
      return { villa: kodi || 'villa', message: skil, net: true };
    } catch (err) {
      var msg = (err && err.message) || 'Tókst ekki';
      if (!opts.hljodlaust) synaLinu(msg);
      try { if (window.logProblem) window.logProblem('husmynd_utan', 'co ' + coId + ' — ' + msg); } catch (_) {}
      console.warn(TAG, msg);
      return { villa: 'villa', message: msg, net: net };
    } finally {
      _iGangi.delete(coId);
      merkjaTakka();
    }
  }

  async function lesaHnitToflu() {
    if (_hnitTafla) return _hnitTafla;
    var map = new Map();
    var s = sbKlient();
    if (!s) { _hnitTafla = map; return map; }
    var from = 0;
    while (from < 5000) {
      var r = await s.from('geocode_cache').select('query,lat,lng').order('query').range(from, from + 999);
      if (r.error) break;
      var rows = r.data || [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row && typeof row.lat === 'number' && typeof row.lng === 'number') {
          map.set(row.query, { lat: row.lat, lng: row.lng });
        }
      }
      if (rows.length < 1000) break;
      from += 1000;
    }
    _hnitTafla = map;
    return map;
  }

  async function keyraHopp() {
    if (_hopp) return;
    _hopp = true;
    _stodva = false;
    merkjaTakka();
    var t = { sokn: 0, sleppt: 0, engin: 0, villa: 0, heimild: 0 };
    try {
      await tryggjaStillingar();
      if (!window.Companies || !Companies.list || !Companies.list.length) {
        if (window.Companies && Companies.load) await Companies.load();
      }
      await lesaHnitToflu();
      var listi = ((window.Companies && Companies.list) || []).filter(function (c) { return c && c.id; });
      var vantar = 0;
      for (var i = 0; i < listi.length; i++) {
        if (!aAdSleppa(lesa(listi[i].id), String(listi[i].heimilisfang || '').trim(), false)) vantar++;
      }
      framvinda('Vantar mynd hjá ' + vantar + ' af ' + listi.length, false);
      for (var n = 0; n < listi.length; n++) {
        if (_stodva) break;
        var c = listi[n];
        var adr = String(c.heimilisfang || '').trim();
        var af = aAdSleppa(lesa(c.id), adr, false);
        if (af) { t.sleppt++; if (n % 40 === 0) { framvinda(framTexti(n, listi.length, c, t), false); await bida(0); } continue; }
        framvinda(framTexti(n, listi.length, c, t), false);
        var ut = await saekjaEitt(c.id, false, { hljodlaust: +coIdNu() !== +c.id });
        if (ut && ut.ok) t.sokn++;
        else if (ut && ut.engin) t.engin++;
        else if (ut && ut.sleppt) t.sleppt++;
        else t.villa++;
        if (ut && ut.net) await bida(BILL_MS);
      }
      var lok = (_stodva ? 'Stöðvað' : 'Búið') + ' · ' + t.sokn + ' sóttar · ' + t.sleppt + ' sleppt · ' + t.engin + ' engin mynd · ' + t.villa + ' villa';
      framvinda(lok, true);
      toast(lok);
    } catch (err) {
      framvinda('Hopp stöðvaðist — ' + ((err && err.message) || ''), true);
    } finally {
      _hopp = false;
      _stodva = false;
      merkjaTakka();
    }
  }
  function framTexti(n, samtals, c, t) {
    var nafn = (c && c.nafn) || '';
    return (n + 1) + '/' + samtals + ' · ' + nafn + ' · sóttar ' + t.sokn + ' · sleppt ' + t.sleppt;
  }

  function smidaEinn() {
    if (document.getElementById('_husmynd-einn')) return;
    var endur = document.getElementById('_co-endurnyja');
    if (!endur || !endur.parentElement) return;
    var b = document.createElement('button');
    b.id = '_husmynd-einn';
    b.type = 'button';
    b.className = endur.className || 'btn btn-outline btn-sm';
    b.style.cssText = 'padding:4px 10px;font-size:12px';
    b.textContent = 'Sækja mynd að utan';
    var lin = document.createElement('span');
    lin.id = '_husmynd-lina';
    lin.textContent = _lina;
    var hopp = document.createElement('button');
    hopp.type = 'button';
    hopp.setAttribute('data-husmynd-hopp', '1');
    hopp.id = '_husmynd-hopp';
    hopp.className = b.className;
    hopp.style.cssText = b.style.cssText;
    hopp.textContent = _hopp ? 'Stöðva' : 'Sækja myndir sem vantar';
    endur.insertAdjacentElement('afterend', lin);
    endur.insertAdjacentElement('afterend', hopp);
    endur.insertAdjacentElement('afterend', b);
    merkjaTakka();
  }
  function smidaBord() {
    var view = document.getElementById('view-uppferslubord');
    if (!view || view.querySelector('#_husmynd-bordbox')) return;
    var box = document.createElement('div');
    box.id = '_husmynd-bordbox';
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-husmynd-hopp', '1');
    b.textContent = _hopp ? 'Stöðva' : 'Sækja myndir sem vantar';
    var s = document.createElement('span');
    s.textContent = 'Forsíðumynd af húsi að utan. Sleppir þeim sem eiga þegar mynd.';
    s.style.cssText = 'font-size:12px;color:var(--ink3,#5c6570)';
    box.appendChild(b);
    box.appendChild(s);
    view.insertBefore(box, view.firstChild);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#_husmynd-einn')) {
      e.preventDefault();
      var id = coIdNu();
      if (id) saekjaEitt(id, false);
      return;
    }
    if (t.closest('[data-husmynd-hopp]')) {
      e.preventDefault();
      if (_hopp) { _stodva = true; return; }
      keyraHopp();
      return;
    }
    var btn = t.closest('button');
    if (!btn) return;
    if (fletta(btn.textContent).indexOf('uppfaera eftir heimilisfangi') >= 0) {
      var id2 = coIdNu() || +(btn.getAttribute('data-co-id') || 0);
      if (id2) saekjaEitt(id2, true);
    }
  }, true);

  function tick() {
    stilar();
    smidaEinn();
    smidaBord();
    merkjaAttribution();
    felaLoft();
  }
  setInterval(tick, 1200);
  if (document.readyState !== 'loading') tick();
  else document.addEventListener('DOMContentLoaded', tick);

  window.HusmyndUtan = {
    saekja: function (id) { return saekjaEitt(id, false); },
    eftirHeimilisfangi: function (id) { return saekjaEitt(id || coIdNu(), true); },
    hopp: keyraHopp,
    stodva: function () { _stodva = true; },
    aAdSleppa: aAdSleppa,
    kall: function () { return _kall; }
  };
  console.log(TAG, 'virkt — sækja mynd að utan, ekki við opnun');
})();
