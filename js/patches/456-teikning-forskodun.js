/* 456 — TEIKNINGAR Á PRÓFÍLNUM: forskoðun hverrar hæðar (Agnar 11.10.2026)
 *
 * „collapsaða teikningasýnin á company profile virkar alls ekki, punktar haldast ekki.. og þegar maður scrollar á
 * síðunni þá festist maður alltaf í scrollinu á mappinu … spurning frekar bara að sýna preview af teikningu af hverri
 * hæð, og 3d af hæðinni þegar hún er saveuð".
 *
 * Gamli rammi borðans (#coFpVp í #co-fp-section — newfeatures.js `_coFpInject`, skreyttur af 109 / floorplanfix)
 * var gagnvirkt kort: skrunhjólið var gripið (preventDefault) svo síðan festist, og merkin röðuðust ekki rétt. Hér
 * víkur hann (og aðdráttartakkarnir) fyrir spjöldum, einu á hverja hæð úr teikning_bord:
 *   · TEIKNING: frummynd hæðarinnar skorin eins og í Teikningu (skurdur í frumdílum), tækin sem punktar
 *     (haedir[].markers, frumdílar — hlutfallsmerki ≤ 1 eldri útgáfu líka);
 *   · 3D: föst vinnumynd hæðarinnar (445, „Festa" í 3D) þegar hún er til — sjálfgefin sýn þá.
 * Smellur á mynd opnar Teikningu félagsins á þeirri hæð. Ekkert gagnvirkt á prófílnum, ekkert grípur skrunið.
 *
 * Uppröðun (Agnar 11.10.2026, síðar): „5 kort sem fyllast upp í fullscreen breidd, síðan ef meira þá bara takki til
 * að sjá meira" — fimm jafnbreiðir dálkar (3 / 2 í mjórri gámi), umframhæðir faldar á bak við heilbreiðan takka.
 *
 * Borðinn sjálfur (haus, „Fella" 362, Brunastál-sýnileiki 405) er óbreyttur — spjöldin búa INNI í honum og falla
 * með honum saman. Myndirnar sóttar aðeins þegar spjaldið sést (IntersectionObserver). Aðeins lestur.
 */
(function () {
  'use strict';
  if (window.__teiknForskodun456) return;
  window.__teiknForskodun456 = true;

  var ID = 'co-fp-hdir';
  var st = document.createElement('style');
  st.id = 'teikn-forskodun-456';
  st.textContent = [
    '#co-fp-section.cfh-virkt #coFpVp{display:none!important}',
    '#co-fp-section.cfh-virkt #coFpZo,#co-fp-section.cfh-virkt #coFpZi,#co-fp-section.cfh-virkt #coFpLbl,#co-fp-section.cfh-virkt #coFpRst{display:none!important}',
    'html[data-teikning="fellt"] #co-fp-section #' + ID + '{display:none!important}',
    '#' + ID + '{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;padding:12px;background:#f6f5f2}',
    '#' + ID + ' .cfh-k{background:#fff;border:1px solid #e3e1dc;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-width:0}',
    '#' + ID + ' .cfh-h{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 10px;border-bottom:1px solid #efede8;font:600 12px system-ui,sans-serif;color:#2b2a27}',
    '#' + ID + ' .cfh-h small{font-weight:500;color:#7a766d;margin-left:6px}',
    '#' + ID + ' .cfh-m{position:relative;aspect-ratio:4/3;background:#f1f0ec;cursor:pointer;overflow:hidden}',
    '#' + ID + ' .cfh-m img,#' + ID + ' .cfh-m canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}',
    '#' + ID + ' .cfh-m .cfh-t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 11.5px system-ui,sans-serif;color:#8a857b;text-align:center;padding:0 12px}',
    '#' + ID + ' .cfh-f{display:inline-flex;gap:3px;flex:none}',
    '#' + ID + ' .cfh-f button{height:22px;padding:0 8px;border:1px solid #d6d3cc;border-radius:5px;background:#fff;font:600 11px system-ui,sans-serif;color:#4a4740;cursor:pointer}',
    '#' + ID + ' .cfh-f button[aria-pressed="true"]{background:#2b2a27;border-color:#2b2a27;color:#fff}',
    // Fimm jafnbreiðir dálkar sem fylla breiddina — auto-fill bjó til tóma dálka og spjöldin urðu mjó
    '#co-fp-section{container-type:inline-size}',
    '#' + ID + '{grid-template-columns:repeat(5,minmax(0,1fr))!important}',
    '@container (max-width:900px){#' + ID + '{grid-template-columns:repeat(3,minmax(0,1fr))!important}}',
    '@container (max-width:560px){#' + ID + '{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
    '#' + ID + ':not(.cfh-allar) .cfh-k.cfh-umfram{display:none}',
    '#' + ID + ' .cfh-fleiri{grid-column:1/-1;justify-self:center;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 18px;border:1px solid #d6d3cc;border-radius:8px;background:#fff;font:600 12.5px system-ui,sans-serif;color:#2b2a27;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06)}',
    '#' + ID + ' .cfh-fleiri:hover{border-color:#2b2a27}',
    '#' + ID + ' .cfh-fleiri i{font-style:normal;display:inline-block;transition:transform .2s}',
    '#' + ID + '.cfh-allar .cfh-fleiri i{transform:rotate(180deg)}',
    '#cfh-stort{position:fixed;inset:0;z-index:9000;background:rgba(20,18,15,.72);display:flex;align-items:center;justify-content:center;padding:16px}',
    '#cfh-stort .cfh-s-k{background:#fff;border-radius:12px;width:min(1500px,100%);height:min(94vh,1100px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35)}',
    '#cfh-stort .cfh-s-h{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #e3e1dc;font:600 13px system-ui,sans-serif;color:#2b2a27;flex-wrap:wrap}',
    '#cfh-stort .cfh-s-h small{font-weight:500;color:#7a766d}',
    '#cfh-stort .cfh-s-m{position:relative;flex:1;background:#f1f0ec;min-height:0}',
    '#cfh-stort .cfh-s-m img,#cfh-stort .cfh-s-m canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}',
    '#cfh-stort .cfh-s-m .cfh-t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 12.5px system-ui,sans-serif;color:#8a857b}',
    '#cfh-stort .cfh-f{display:inline-flex;gap:3px}',
    '#cfh-stort .cfh-f button{height:26px;padding:0 10px;border:1px solid #d6d3cc;border-radius:6px;background:#fff;font:600 12px system-ui,sans-serif;color:#4a4740;cursor:pointer}',
    '#cfh-stort .cfh-f button[aria-pressed="true"]{background:#2b2a27;border-color:#2b2a27;color:#fff}',
    '#cfh-stort .cfh-s-opna{height:32px;padding:0 14px;border-radius:8px;border:1px solid #2b2a27;background:#2b2a27;color:#fff;font:700 12.5px system-ui,sans-serif;cursor:pointer}',
    '#cfh-stort .cfh-s-x{height:32px;width:34px;border-radius:8px;border:1px solid #d6d3cc;background:#fff;color:#2b2a27;font:600 14px system-ui,sans-serif;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(st);

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Myndir sóttar einu sinni á lotu (sama frummynd á oft margar hæðir, t.d. 2.–4. hæð á sama blaði). Hreint PDF
  // (Hafnarfjörður: teikn-mynd skilar PDF-inu sjálfu, sem <img> sýnir ekki) er teiknað með pdf.js eins og í Teikningu
  // (435 TeiknGaedi.rasterPdf) — minni stærð dugar í forskoðun; kvarðinn reiknast af breiddinni (frum.b).
  var myndir = new Map();
  function pdfSlod(url) { try { return window.TeiknGaedi && TeiknGaedi.pdfSlodUrMynd ? TeiknGaedi.pdfSlodUrMynd(url) : ''; } catch (_) { return ''; } }
  function hreintPdf(url) {
    try { var u = new URL(url, location.href), inn = u.searchParams.get('url') || ''; return /teikn-mynd/.test(u.pathname) && !!inn && /\.pdf$/i.test(new URL(inn).pathname); } catch (_) { return false; }
  }
  function hladaMynd(url) {
    if (!myndir.has(url)) {
      var p;
      if (hreintPdf(url) && window.TeiknGaedi && TeiknGaedi.rasterPdf && pdfSlod(url)) p = TeiknGaedi.rasterPdf(pdfSlod(url), 2200);
      else p = new Promise(function (res, rej) {
        var i = new Image();
        i.onload = function () { res(i); };
        i.onerror = function () { rej(new Error('mynd fannst ekki')); };
        i.src = url;
      });
      myndir.set(url, p.catch(function (e) { myndir.delete(url); throw e; }));
    }
    return myndir.get(url);
  }

  // Teikning hæðarinnar á striga: skurður (frumdílar → dílar myndarinnar) og tækin sem punktar
  function teiknaTeikningu(h, c, hamark) {
    return hladaMynd(h.image_url).then(function (img) {
      var nb = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
      var f = h.frum && h.frum.b > 0 ? nb / h.frum.b : 1;
      var sk = h.skurdur && h.skurdur.w > 8 && h.skurdur.h > 8 ? h.skurdur : { x: 0, y: 0, w: nb / f, h: nh / f };
      var sx = Math.max(0, Math.min(nb - 2, sk.x * f)), sy = Math.max(0, Math.min(nh - 2, sk.y * f));
      var sw = Math.max(1, Math.min(nb - sx, sk.w * f)), sh = Math.max(1, Math.min(nh - sy, sk.h * f));
      var k = Math.min(1, (hamark || 1100) / Math.max(sw, sh));
      c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      var r = Math.max(3.5, c.width / 140);
      (h.markers || []).forEach(function (m) {
        var mx = +m.x, my = +m.y;
        if (!isFinite(mx) || !isFinite(my)) return;
        if (mx <= 1 && my <= 1) { mx = mx * nb / f; my = my * nh / f; }   // eldri hlutfallsmerki
        var px = (mx - sk.x) * f * k, py = (my - sk.y) * f * k;
        if (px < -r || py < -r || px > c.width + r || py > c.height + r) return;
        x.beginPath(); x.arc(px, py, r, 0, 2 * Math.PI);
        x.fillStyle = '#c93c1d'; x.fill(); x.lineWidth = Math.max(1, r * 0.35); x.strokeStyle = '#fff'; x.stroke();
      });
    });
  }

  function opnaHaed(cid, i) {
    if (!window.Companies || typeof Companies.opnaTeikningu !== 'function') return;
    Companies.opnaTeikningu(cid);
    if (!i) return;
    var n = 0;
    var t = setInterval(function () {
      var b = document.querySelector('#fp-haedir [data-h="' + i + '"]');
      if (b) { clearInterval(t); if (b.getAttribute('aria-pressed') !== 'true') b.click(); }
      else if (++n > 80) clearInterval(t);
    }, 150);
  }

  function syna(kort, h, ham, hamark) {
    var m = kort.querySelector('.cfh-m, .cfh-s-m');
    kort.querySelectorAll('.cfh-f button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ham === ham ? 'true' : 'false'); });
    if (ham === '3d' && h.vinnumynd && h.vinnumynd.url) {
      m.innerHTML = '<img alt="3D · ' + esc(h.nafn) + '" src="' + esc(h.vinnumynd.url) + '">';
      m.firstChild.onerror = function () { m.innerHTML = '<div class="cfh-t">3D-myndin fannst ekki</div>'; };
      return;
    }
    if (!h.image_url) { m.innerHTML = '<div class="cfh-t">Engin teikning á hæðinni</div>'; return; }
    m.innerHTML = '<div class="cfh-t">Sæki teikningu…</div>';
    var c = document.createElement('canvas');
    teiknaTeikningu(h, c, hamark).then(function () {
      if (!m.isConnected) return;
      m.innerHTML = ''; m.appendChild(c);
    }, function () { if (m.isConnected) m.innerHTML = '<div class="cfh-t">Teikningin náðist ekki</div>'; });
  }

  // STÓR SÝN (Agnar 11.10.2026: „geta ýtt á hverja af þeim til að stækka og skoða, síðan link í horninu inn í Teikningu
  // þar sem maður getur sett inn tækin"): smellur á spjald opnar hæðina stóra; „Opna í Teikningu" í horninu.
  function opnaStort(cid, i, h, ham) {
    lokaStort();
    var vm = !!(h.vinnumynd && h.vinnumynd.url), n = (h.markers || []).length;
    var o = document.createElement('div');
    o.id = 'cfh-stort';
    o.innerHTML = '<div class="cfh-s-k" role="dialog" aria-label="' + esc(h.nafn || 'Hæð') + '"><div class="cfh-s-h"><strong>' + esc(h.nafn || (i + 1) + '. hæð') + '</strong><small>' + n + ' tæki</small>' +
      (vm && h.image_url ? '<span class="cfh-f"><button type="button" data-ham="teikning">Teikning</button><button type="button" data-ham="3d">3D</button></span>' : '') +
      '<span style="flex:1"></span><button type="button" class="cfh-s-opna">Opna í Teikningu</button><button type="button" class="cfh-s-x" aria-label="Loka" title="Loka (Esc)">✕</button></div>' +
      '<div class="cfh-s-m"><div class="cfh-t">…</div></div></div>';
    document.body.appendChild(o);
    var k = o.querySelector('.cfh-s-k');
    o.addEventListener('click', function (e) { if (e.target === o) lokaStort(); });
    o.querySelector('.cfh-s-x').addEventListener('click', lokaStort);
    o.querySelector('.cfh-s-opna').addEventListener('click', function () { lokaStort(); opnaHaed(cid, i); });
    k.querySelectorAll('.cfh-f button').forEach(function (b) { b.addEventListener('click', function () { syna(k, h, b.dataset.ham, 2600); }); });
    syna(k, h, ham, 2600);
  }
  function lokaStort() { var o = document.getElementById('cfh-stort'); if (o) o.remove(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('cfh-stort')) lokaStort(); });

  var syn = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (faerslur) {
    faerslur.forEach(function (f) {
      if (!f.isIntersecting) return;
      syn.unobserve(f.target);
      var k = f.target;
      if (k._cfh) syna(k, k._cfh.h, k._cfh.ham);
    });
  }, { rootMargin: '200px' }) : null;

  function smida(sec, cid, row) {
    if (!sec.isConnected || sec.querySelector('#' + ID)) return;
    var hs = Array.isArray(row.haedir) && row.haedir.length ? row.haedir : [{ nafn: 'Teikning', image_url: row.image_url, markers: row.markers || [] }];
    var synd = hs.map(function (h, i) { return { h: h, i: i }; }).filter(function (x) { return x.h && (x.h.image_url || (x.h.vinnumynd && x.h.vinnumynd.url)); });
    if (!synd.length) return;
    var g = document.createElement('div');
    g.id = ID;
    var SYNILEG = 5;
    synd.forEach(function (x, j) {
      var h = x.h, vm = !!(h.vinnumynd && h.vinnumynd.url), n = (h.markers || []).length;
      var k = document.createElement('div');
      k.className = 'cfh-k' + (j >= SYNILEG ? ' cfh-umfram' : '');
      k.innerHTML = '<div class="cfh-h"><span>' + esc(h.nafn || (x.i + 1) + '. hæð') + '<small>' + n + ' ' + (n === 1 ? 'tæki' : 'tæki') + '</small></span>' +
        (vm && h.image_url ? '<span class="cfh-f"><button type="button" data-ham="teikning">Teikning</button><button type="button" data-ham="3d">3D</button></span>' : '') +
        '</div><div class="cfh-m" title="Stækka ' + esc(h.nafn || 'hæðina') + '"><div class="cfh-t">…</div></div>';
      k._cfh = { h: h, ham: vm ? '3d' : 'teikning' };
      k.querySelector('.cfh-m').addEventListener('click', function () { opnaStort(cid, x.i, h, k._cfh.ham); });
      k.querySelectorAll('.cfh-f button').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); k._cfh.ham = b.dataset.ham; syna(k, h, b.dataset.ham); });
      });
      g.appendChild(k);
      if (syn) syn.observe(k); else syna(k, h, k._cfh.ham);
    });
    // Fimm sýnilegar í einni röð; restin á bak við heilbreiðan takka (Agnar 11.10.2026)
    if (synd.length > SYNILEG) {
      var fl = document.createElement('button'); fl.type = 'button'; fl.className = 'cfh-fleiri';
      var umfram = synd.length - SYNILEG;
      var lokad = 'Sjá fleiri hæðir (' + umfram + ')';
      fl.innerHTML = '<span>' + lokad + '</span><i><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></i>';
      fl.addEventListener('click', function () { var a = g.classList.toggle('cfh-allar'); fl.firstChild.textContent = a ? 'Sýna færri' : lokad; });
      g.appendChild(fl);
    }
    var vp = sec.querySelector('#coFpVp');
    if (vp && vp.parentNode === sec) sec.insertBefore(g, vp); else sec.appendChild(g);
    sec.classList.add('cfh-virkt');
  }

  var unnid = new WeakSet();
  function athuga() {
    var sec = document.getElementById('co-fp-section');
    if (!sec || unnid.has(sec)) return;
    var cid = window._currentCompanyId;
    if (!cid || !window.DB || !DB.sb) return;
    unnid.add(sec);
    DB.sb.from('teikning_bord').select('haedir,image_url,markers').eq('company_id', cid).limit(1).then(function (r) {
      var row = r && !r.error && r.data && r.data[0];
      if (row && String(window._currentCompanyId) === String(cid)) smida(sec, cid, row);
    }, function () {});
  }

  // Borðinn er endursmíðaður við hverja opnun prófíls (newfeatures prev.remove()) — inngjöf (≤ 100 ms) + varðhundur,
  // eins og 362 (síðan er aldrei róleg, svo debounce dugar ekki).
  var bidur = null;
  new MutationObserver(function () { if (!bidur) bidur = setTimeout(function () { bidur = null; athuga(); }, 100); })
    .observe(document.documentElement, { childList: true, subtree: true });
  setInterval(athuga, 1500);
  athuga();
})();
