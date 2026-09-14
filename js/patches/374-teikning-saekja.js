/* 374 — Sækja teikningu beint inn á Teikning-borðið úr skjalasafni.
 *
 * Skreytir FloorPlan (js/scanner.js) — eins og newfeatures.js gerir — og bætir
 * „📐 Sækja teikningu" hnappi í hausinn. Hann flettir upp húsinu (heimilisfang
 * → landnúmer → FotoWeb-teikningar Reykjavíkur), lætur þig velja hæð, og setur
 * myndina á canvasinn. Myndin fer gegnum SAMA-rótar proxy
 * (/.netlify/functions/teikn-mynd) svo Vista (toDataURL) haldi áfram að virka.
 *
 * Reykjavík: raunteikningar. Kópavogur/Garðabær/Hafnarfjörður: hlekkur á map.is
 * (engin rafræn teikning til að sækja) → notandi hleður upp handvirkt.
 *
 * VISTUN er ÓBREYTT (localStorage per vafra) — færsla yfir á þjón er næsta skref.
 */
(function () {
  if (window.__teiknSaekjaSett) return;
  window.__teiknSaekjaSett = true;

  var LISTI = '/.netlify/functions/teikn-listi';
  var MYND = '/.netlify/functions/teikn-mynd';

  function esc(s) {
    if (window.U && U.e) return U.e(s);
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }

  function heimilisfangFyrir(coId) {
    try {
      var c = ((window.Companies && Companies.list) || []).find(function (x) { return +x.id === +coId; });
      return c ? String(c.heimilisfang || '').trim() : '';
    } catch (_) { return ''; }
  }

  /* ── yfirlagið (spinner / villa / listi) ─────────────────────────────────── */
  function overlay() {
    var bd = document.querySelector('#modal-floorplan .modal-bd');
    if (!bd) return null;
    var o = document.getElementById('fp-teikn-yfir');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fp-teikn-yfir';
      o.style.cssText = 'position:absolute;inset:0;z-index:20;background:rgba(20,18,14,.975);display:flex;flex-direction:column;color:#eee';
      bd.appendChild(o);
    }
    o.style.display = 'flex';
    return o;
  }
  function lokaYfir() { var o = document.getElementById('fp-teikn-yfir'); if (o) o.style.display = 'none'; }

  function spinna(txt) {
    var o = overlay(); if (!o) return;
    o.innerHTML = '<div style="margin:auto;text-align:center;color:rgba(255,255,255,.7)">' +
      '<div style="font-size:26px;margin-bottom:10px">⏳</div><div>' + esc(txt || 'Sæki teikningar…') + '</div></div>';
  }

  function synaVillu(txtHtml, aukahlekkurHtml) {
    var o = overlay(); if (!o) return;
    o.innerHTML = '<div style="margin:auto;text-align:center;max-width:440px;color:rgba(255,255,255,.82);padding:24px">' +
      '<div style="font-size:26px;margin-bottom:10px">📐</div>' +
      '<div style="margin-bottom:14px;line-height:1.5">' + txtHtml + '</div>' +
      (aukahlekkurHtml || '') +
      '<div style="margin-top:16px"><button class="fp-teikn-loka btn btn-outline btn-sm" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)">Loka</button></div>' +
      '</div>';
    var b = o.querySelector('.fp-teikn-loka'); if (b) b.onclick = lokaYfir;
  }

  function synaLista(dr, allarSyndar) {
    var o = overlay(); if (!o) return;
    var syna = allarSyndar ? dr : dr.filter(function (d) { return d.grunnmynd && !d.urelt; });
    if (!syna.length && !allarSyndar) syna = dr.filter(function (d) { return !d.urelt; });
    if (!syna.length) syna = dr;
    var faldar = dr.length - syna.length;

    var kort = syna.map(function (d) {
      var titill = d.lysing || d.tegund || d.filename || 'Teikning';
      var undir = [d.tegund, d.dags].filter(Boolean).join(' · ');
      var thumbCss = d.thumb
        ? 'background:#000 url(\'' + esc(d.thumb) + '\') center/contain no-repeat'
        : 'display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);font-size:30px';
      return '<div class="fp-teikn-kort" data-url="' + esc(d.infoUrl) + '" data-label="' + esc(titill) + '" ' +
        'style="cursor:pointer;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.04);display:flex;flex-direction:column">' +
        '<div style="height:120px;' + thumbCss + '">' + (d.thumb ? '' : '📄') + '</div>' +
        '<div style="padding:8px 10px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:2px;color:#fff">' + esc(titill) +
        (d.urelt ? ' <span style="color:#e0a05f;font-size:10px;font-weight:400">(úrelt)</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.45)">' + esc(undir) + '</div>' +
        '</div></div>';
    }).join('');

    o.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)">' +
      '<div style="font-weight:700;color:#fff">Veldu teikningu</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,.4)">' + syna.length + ' blöð</div>' +
      '<div style="flex:1"></div>' +
      ((faldar > 0 || allarSyndar)
        ? '<button class="fp-teikn-allar btn btn-ghost btn-sm" style="color:rgba(255,255,255,.55)">' +
          (allarSyndar ? 'Sýna bara gildandi grunnmyndir' : ('Sýna allar (' + faldar + ' fleiri)')) + '</button>'
        : '') +
      '<button class="fp-teikn-loka btn btn-outline btn-sm" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)">✕</button>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;align-content:start">' + kort + '</div>';

    o.querySelector('.fp-teikn-loka').onclick = lokaYfir;
    var allar = o.querySelector('.fp-teikn-allar');
    if (allar) allar.onclick = function () { synaLista(dr, !allarSyndar); };
    o.querySelectorAll('.fp-teikn-kort').forEach(function (k) {
      k.onclick = function () { hladaMynd(k.getAttribute('data-url'), k.getAttribute('data-label')); };
    });
  }

  /* ── mynd á canvas (eigin hleðsla með villu/tímaþaki svo spinner frjósi ekki) */
  function hladaMynd(infoUrl, label) {
    if (!infoUrl) { toast('Þessa teikningu er ekki hægt að sækja'); return; }
    spinna('Sæki teikningu' + (label ? (' – ' + label) : '') + '…');
    var url = MYND + '?url=' + encodeURIComponent(infoUrl);
    var img = new Image();
    var klarad = false;
    var thak = setTimeout(function () {
      if (klarad) return; klarad = true;
      synaVillu('Teikningin er lengi að hlaðast — prófaðu aðra eða „Hlaða upp".');
    }, 45000);
    img.onload = function () {
      if (klarad) return; klarad = true; clearTimeout(thak);
      FloorPlan.bgImage = img;
      if (!FloorPlan.plans[FloorPlan.companyId]) FloorPlan.plans[FloorPlan.companyId] = { markers: [], imageUrl: url };
      else FloorPlan.plans[FloorPlan.companyId].imageUrl = url;
      var c = document.getElementById('fp-canvas'); if (c) c.style.display = 'block';
      var dm = document.getElementById('fp-drop-msg'); if (dm) dm.style.display = 'none';
      try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
      lokaYfir();
      toast('Teikning komin – merktu tækin ✓');
    };
    img.onerror = function () {
      if (klarad) return; klarad = true; clearTimeout(thak);
      synaVillu('Náði ekki í myndina. Prófaðu aðra teikningu eða „Hlaða upp" handvirkt.');
    };
    img.src = url;
  }

  /* ── uppfletting: heimilisfang → landnúmer → teikningalisti ───────────────── */
  async function saekja(coId) {
    var addr = heimilisfangFyrir(coId);
    if (!addr) {
      synaVillu('Ekkert heimilisfang skráð á þennan viðskiptavin — notaðu „Hlaða upp".');
      return;
    }
    spinna('Leita að húsinu…');
    try {
      var d1 = await (await fetch(LISTI + '?heimilisfang=' + encodeURIComponent(addr), { signal: AbortSignal.timeout(28000) })).json();
      var results = (d1 && d1.results) || [];
      var eign = results.find(function (x) { return x.heimild === 'reykjavik'; });
      if (!eign) {
        var mapis = results.find(function (x) { return x.heimild === 'map.is' && x.ytriSlod; });
        if (mapis) {
          var hlekkur = '<a href="' + esc(mapis.ytriSlod) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="color:#ffd27a;border-color:rgba(255,210,122,.4)">Opna ' + esc(mapis.heimildNafn || 'kort') + ' →</a>';
          synaVillu(esc(mapis.heimildNafn || 'Þetta sveitarfélag') + ' er ekki með teikningar í rafrænu safni. Opnaðu kortið, sæktu teikninguna þar og notaðu „Hlaða upp".', hlekkur);
          return;
        }
        var fyrsta = results[0];
        synaVillu(fyrsta
          ? '„' + esc(fyrsta.label || addr) + '" er ekki í skjalasafni Reykjavíkur — engar rafrænar teikningar. Notaðu „Hlaða upp".'
          : 'Fann ekki húsið í fasteignaskrá fyrir „' + esc(addr) + '".');
        return;
      }

      spinna('Sæki teikningar hússins…');
      var d2 = await (await fetch(LISTI + '?landnr=' + encodeURIComponent(eign.landnr), { signal: AbortSignal.timeout(28000) })).json();
      var dr = (d2 && d2.results) || [];
      if (!dr.length) {
        synaVillu('Engar teikningar fundust fyrir ' + esc(eign.label || addr) + '.');
        return;
      }
      synaLista(dr, false);
    } catch (_) {
      synaVillu('Villa við að sækja teikningar. Reyndu aftur eða notaðu „Hlaða upp".');
    }
  }

  /* ── skreyta FloorPlan.open: bæta hnappi í hausinn ────────────────────────── */
  function baetaHnappi() {
    var hd = document.querySelector('#modal-floorplan .modal-hd');
    if (!hd) return;
    var grp = hd.lastElementChild;
    if (!grp || grp.querySelector('.fp-saekja-btn')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm fp-saekja-btn';
    b.style.cssText = 'cursor:pointer';
    b.innerHTML = '📐 Sækja teikningu';
    b.onclick = function () { saekja(FloorPlan.companyId); };
    grp.insertBefore(b, grp.firstChild);
  }

  function skreyta() {
    if (!window.FloorPlan) return false;
    if (FloorPlan.__saekjaSkreytt) return true;
    var uppruni = FloorPlan.open;
    if (typeof uppruni !== 'function') return false;
    FloorPlan.open = function () {
      var r = uppruni.apply(this, arguments);
      try { baetaHnappi(); } catch (_) {}
      return r;
    };
    FloorPlan.__saekjaSkreytt = true;
    return true;
  }

  if (!skreyta()) {
    var reyn = 0;
    var i = setInterval(function () { if (skreyta() || ++reyn > 40) clearInterval(i); }, 150);
  }
})();
