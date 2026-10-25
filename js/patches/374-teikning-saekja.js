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
 *
 * Agnar 02.10.2026: tómt borð var hvítt og Sækja fannst ekki. Drop-skilaboðin
 * opna nú listann, og glugginn sækir teikningar hússins sjálfkrafa ef engin
 * vistuð mynd er á borðinu.
 */
(function () {
  if (window.__teiknSaekjaSett) return;
  window.__teiknSaekjaSett = true;

  var LISTI = '/.netlify/functions/teikn-listi';
  // 19.10.2026: útgáfa staðfangaleitar í slóðinni — svör frá því áður en sveitarfélagi var bætt við (Reykjanesbær 2000)
  // lágu í varanlegu skyndiminni Netlify sem „óþekkt" í allt að viku; ný útgáfa = ný slóð = fersk svör.
  var STADF_V = '&sv=20261019';
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

  /* ── merki blaðs (08.10.2026, Agnar: „Held kerfið lesi þær ekki inn. Bara hæðir og kjallara") ──
   * Blað sem nær yfir margar hæðir fær merki („2.–7. hæð", „1., 2., 3. hæð", „Allt húsið"), snið og útlit eru merkt
   * sem slík og verða ALDREI hæð (smellur sýnir blaðið). Sama flokkun og „Finna allt húsið" (383) notar. */
  function flokkaBlad(d) {
    var t = String(d.lysing || d.tegund || d.filename || '').replace(/\s+/g, ' ');
    var tl = t.toLowerCase();
    var haed = (Array.isArray(d.haed) ? d.haed : []).map(Number).filter(function (n) { return isFinite(n); });
    // „2Á4 hæð": Hafnarfjarðarskráin skilar bandstriki milli talna sem „Á" (Berjavellir 6, 08.10.2026) — lágstafað hér
    var bilM = tl.match(/(\d+)\.?\s*[-–á]\s*(\d+)\.?\s*h(æ|ae)ð/);
    // úr titlinum ef APIið gaf engar hæðir: „2.-7. hæð", „1. hæð, 2. hæð, 3. hæð"
    if (!haed.length) {
      if (bilM) { for (var k = +bilM[1]; k <= +bilM[2] && k - +bilM[1] < 30; k++) haed.push(k); }
      else { var r = /(\d+)\.\s*h(æ|ae)ð/g, q; while ((q = r.exec(tl))) haed.push(+q[1]); }
    }
    var kj = !!d.kjallari || /kjallar/.test(tl), ris = !!d.ris || /(^|[^a-zþæöðáéíóúý])ris(i|h(æ|ae)ð)?([^a-zþæöðáéíóúý]|$)/.test(tl);
    var grunn = !!d.grunnmynd || /grunnmynd/.test(tl);
    var snid = /(^|[^a-zþæöðáéíóúý])(snið|sneiðing)/.test(tl), utlit = /útlit|utlit/.test(tl);   // „Sneiðing A og B" (Hafnarfj.)
    var hlutar = haed.length + (kj ? 1 : 0) + (ris ? 1 : 0);
    var merki = '';
    if (grunn) {
      if (bilM && haed.length > 1) merki = haed[0] + '.–' + haed[haed.length - 1] + '. hæð' + (kj ? ' + kjallari' : '');
      else if (hlutar > 1) merki = [kj ? 'Kjallari' : ''].concat(haed.length ? [haed.map(function (n) { return n + '.'; }).join(', ') + ' hæð'] : []).concat(ris ? ['ris'] : []).filter(Boolean).join(', ');
      else if (!hlutar && /grunnmyndir|allt h(ú|u)s/.test(tl)) merki = 'Allt húsið';
    }
    return { grunn: grunn, snid: snid, utlit: utlit, haed: haed, bil: !!bilM, kjallari: kj, ris: ris, merki: merki, adeinsSnidUtlit: !grunn && (snid || utlit) };
  }
  function merkiHtml(d) {
    var f = flokkaBlad(d), m = [];
    if (f.merki) m.push(f.merki);
    if (f.snid) m.push('Snið');
    if (f.utlit) m.push('Útlit');
    return m.map(function (x) { return '<span style="display:inline-block;margin:0 4px 3px 0;padding:1px 7px;border-radius:7px;background:rgba(217,180,90,.18);border:1px solid rgba(217,180,90,.5);color:#f0d48a;font-size:10.5px;font-weight:700">' + esc(x) + '</span>'; }).join('');
  }
  function synaSkodun(url, label) {
    var o = overlay(); if (!o) return;
    o.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)">' +
      '<div style="font-weight:700;color:#fff">' + esc(label || 'Teikning') + '</div><div style="font-size:12px;color:rgba(255,255,255,.45)">Snið og útlit eru viðmið — þau verða ekki hæð</div><div style="flex:1"></div>' +
      '<button class="fp-teikn-aftur btn btn-outline btn-sm" style="color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2)">Til baka</button></div>' +
      '<div style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:12px"><img alt="" style="max-width:100%;max-height:100%;background:#fff"></div>';
    var img = o.querySelector('img'), u = MYND + '?url=' + encodeURIComponent(url);
    if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(img, u); else img.src = u;
    o.querySelector('.fp-teikn-aftur').onclick = function () { var L = window.__teiknSidastiListi; if (L) synaLista(L.dr, L.allar); else lokaYfir(); };
  }

  /* ── smámyndir á kortunum + forskoðun áður en blað er valið (20.10.2026) ─────────────────────────────────────────────
   * Agnar (ProLan Suðurhella 5): „ég þarf að geta séð hvað ég er að velja. eins og ef ég vel bara hæð". Kort beinna PDF-blaða
   * (Hafnarfjörður/Kópavogur/Garðabær) höfðu enga smámynd (📄) og smellur sótti blaðið strax — og þá alltaf FYRSTU síðu, þótt
   * settið (t.d. „Grunnmyndir 1. og 2. hæð, snið, útlit") sé margar síður. Nú: smámynd á hverju korti (sama pdf.js-vél og 384),
   * og smellur opnar forskoðun með stórri mynd, síðuröndinni til hliðar og „✓ Nota þessa" — valin síða fer á borðið. */
  function erBeintPdf(d) { var F = window.TeikningaForskodun; return !!(F && F.beintPdf && F.beintPdf(d)); }
  function fyllaKortThumbs(o, syna) {
    var F = window.TeikningaForskodun; if (!F || !F.thumbAf) return;
    var kedja = Promise.resolve();
    o.querySelectorAll('.fp-teikn-th[data-url]').forEach(function (el) {
      var d = syna.find(function (x) { return x.infoUrl === el.getAttribute('data-url'); });
      if (!d || d.thumb || !(F.beintPdf(d) || F.beintTif(d))) return;
      kedja = kedja.then(function () { return F.thumbAf(d); }).then(function (src) {
        if (!src || !el.isConnected) return;
        el.style.cssText = 'height:120px;background:#fff url(\'' + src + '\') center/contain no-repeat';
        el.textContent = '';
      }).catch(function () {});
    });
  }
  function forskodun(d, titill) {
    var o = overlay(); if (!o) return;
    var F = window.TeikningaForskodun, pdf = erBeintPdf(d), val = { sida: 1, fjoldi: 1, doc: null }, bid = 0;
    o.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)">' +
        '<button class="fp-fs-aftur btn btn-outline btn-sm" style="color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.25)">‹ Til baka</button>' +
        '<div style="min-width:0"><div style="font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(titill || 'Teikning') + '</div><div>' + merkiHtml(d) + '</div></div>' +
        '<div style="flex:1"></div><div class="fp-fs-val" style="font-size:12.5px;color:#f0d48a;white-space:nowrap"></div>' +
        '<button class="fp-fs-nota btn btn-sm" style="background:#c9a54a;color:#1c1608;border:1px solid #8a6218;font-weight:700;cursor:pointer" disabled>✓ Nota þessa</button></div>' +
      '<div style="flex:1;display:flex;min-height:0">' +
        '<div class="fp-fs-sidur" style="display:none;width:150px;flex:none;overflow-y:auto;padding:10px;border-right:1px solid rgba(255,255,255,.1)"></div>' +
        '<div class="fp-fs-stor" style="flex:1;min-width:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:12px;color:rgba(255,255,255,.6)">Sæki teikningu…</div></div>';
    var stor = o.querySelector('.fp-fs-stor'), valEl = o.querySelector('.fp-fs-val'), nota = o.querySelector('.fp-fs-nota'), rond = o.querySelector('.fp-fs-sidur');
    o.querySelector('.fp-fs-aftur').onclick = function () { var L = window.__teiknSidastiListi; if (L) synaLista(L.dr, L.allar); else lokaYfir(); };
    nota.onclick = function () { hladaMynd(d.infoUrl, titill, val.sida); };
    function setjaVal() { valEl.textContent = val.fjoldi > 1 ? 'Valin: síða ' + val.sida + ' af ' + val.fjoldi : ''; }
    async function teiknaSidu(n, px) {
      var p = await val.doc.getPage(n), v0 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: px / Math.max(v0.width, v0.height, 1) });
      var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(vp.width)); cv.height = Math.max(1, Math.round(vp.height));
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await p.render({ canvasContext: cx, viewport: vp, intent: 'print' }).promise;
      return cv.toDataURL('image/jpeg', px > 600 ? 0.85 : 0.7);
    }
    async function teiknaStor() {
      var mitt = ++bid;
      stor.textContent = 'Sæki teikningu…';
      var im = new Image(); im.alt = titill || ''; im.style.cssText = 'max-width:100%;max-height:100%;background:#fff;object-fit:contain';
      if (pdf) { var src = await teiknaSidu(val.sida, 1800); if (mitt !== bid) return; im.src = src; }
      else if (F && F.beintTif && F.beintTif(d)) { var u = await F.myndSlod(d); if (mitt !== bid) return; im.src = u; }
      else { var u2 = MYND + '?url=' + encodeURIComponent(d.infoUrl); if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(im, u2); else im.src = u2; }
      im.onerror = function () { if (mitt === bid) stor.textContent = '⚠ Náði ekki í myndina — prófaðu „Nota þessa" samt eða aðra teikningu.'; };
      stor.textContent = ''; stor.appendChild(im);
    }
    function byggjaRond() {
      rond.style.display = 'block'; rond.innerHTML = '';
      var kedja = Promise.resolve();
      for (var i = 1; i <= val.fjoldi; i++) (function (n) {
        var b = document.createElement('button'); b.type = 'button'; b.dataset.n = String(n);
        b.style.cssText = 'display:block;width:100%;margin:0 0 10px;padding:4px;border-radius:8px;background:rgba(255,255,255,.05);border:2px solid transparent;color:rgba(255,255,255,.75);font:600 11px system-ui,sans-serif;cursor:pointer;text-align:center';
        b.innerHTML = '<div class="fp-fs-th" style="height:84px;display:flex;align-items:center;justify-content:center;background:#fff1;border-radius:4px;color:rgba(255,255,255,.3)">📄</div>Síða ' + n;
        b.onclick = function () { val.sida = n; merkja(); setjaVal(); teiknaStor().catch(function (e) { stor.textContent = '⚠ ' + ((e && e.message) || e); }); };
        rond.appendChild(b);
        kedja = kedja.then(function () { return teiknaSidu(n, 260); }).then(function (src) {
          var th = b.querySelector('.fp-fs-th'); if (!th || !b.isConnected) return;
          th.style.cssText = 'height:84px;background:#fff url(\'' + src + '\') center/contain no-repeat'; th.textContent = '';
        }).catch(function () {});
      })(i);
      merkja();
    }
    function merkja() { rond.querySelectorAll('button[data-n]').forEach(function (b) { b.style.borderColor = (+b.dataset.n === val.sida) ? '#c9a54a' : 'transparent'; }); }
    (async function () {
      try {
        if (pdf) {
          await F.hladaPdfJs();
          var gogn = await F.pdfGogn(d);
          val.doc = await window.pdfjsLib.getDocument({ data: gogn.slice() }).promise;
          val.fjoldi = val.doc.numPages;
          if (val.fjoldi > 1) byggjaRond();
        }
        setjaVal();
        await teiknaStor();
      } catch (e) { stor.textContent = '⚠ Náði ekki í teikninguna: ' + ((e && e.message) || e); }
      nota.disabled = false;
    })();
  }

  // Smámynd sem er enn að hlaðast: hreyfður rammi með „Hleð forskoðun…“ (áður svartur reitur — leit út eins og engin forskoðun; Agnar 25.10.2026)
  function skeletonStill() {
    if (document.getElementById('_t374-skel')) return;
    var st = document.createElement('style'); st.id = '_t374-skel';
    st.textContent = '.fp-th-hladar{background:linear-gradient(110deg,#26231f 30%,#37332d 50%,#26231f 70%)!important;background-size:200% 100%;animation:fpThSkel 1.2s linear infinite}' +
      '.fp-th-hladar::after{content:"Hleð forskoðun…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 11px system-ui,sans-serif;color:rgba(255,255,255,.5)}' +
      '.fp-teikn-th:empty{display:flex;align-items:center;justify-content:center}@keyframes fpThSkel{to{background-position:-200% 0}}';
    (document.head || document.documentElement).appendChild(st);
  }
  function synaLista(dr, allarSyndar) {
    skeletonStill();
    var o = overlay(); if (!o) return;
    window.__teiknSidastiListi = { dr: dr, allar: !!allarSyndar };
    // 04.10.2026: aðaluppdrættir fyrst (Reykjavík „Aðaluppdrættir", Hafnarfjörður „Bygginganefndarteikning") — á
    // Norðurhellu 17 voru 33 „grunnmyndir" og aðeins 3 þeirra aðaluppdrættir; hinar burðarvirki, raflagnir og lagnir.
    var adal = function (d) { return /aðalupp|bygginga?nefnd/i.test(String(d.tegund || '')); };
    dr = dr.slice().sort(function (a, b) {
      return (adal(b) - adal(a)) || String(b.dags || '').localeCompare(String(a.dags || ''));
    });
    // 08.10.2026: gildandi snið og útlit aðaluppdrátta sjást líka (merkt) — viðmið, ekki hæðir
    var syna = allarSyndar ? dr : dr.filter(function (d) { var f = flokkaBlad(d); return (d.grunnmynd || f.snid || f.utlit) && !d.urelt && adal(d); });
    if (!syna.length && !allarSyndar) syna = dr.filter(function (d) { return d.grunnmynd && !d.urelt; });
    if (!syna.length && !allarSyndar) syna = dr.filter(function (d) { return !d.urelt; });
    if (!syna.length) syna = dr;
    var faldar = dr.length - syna.length;

    var kort = syna.map(function (d) {
      var titill = d.lysing || d.tegund || d.filename || 'Teikning';
      var undir = [d.tegund, d.dags].filter(Boolean).join(' · ');
      var thumbCss = d.thumb
        ? 'background:#26231f;position:relative;overflow:hidden'
        : 'display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);font-size:30px';
      return '<div class="fp-teikn-kort" data-url="' + esc(d.infoUrl) + '" data-label="' + esc(titill) + '" ' +
        'style="cursor:pointer;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.04);display:flex;flex-direction:column">' +
        '<div class="fp-teikn-th' + (d.thumb ? ' fp-th-hladar' : '') + '" data-url="' + esc(d.infoUrl) + '" style="height:120px;' + thumbCss + '">' +
        (d.thumb ? '<img src="' + esc(d.thumb) + '" alt="" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;opacity:0;transition:opacity .3s" onload="this.style.opacity=1;this.parentNode.classList.remove(\'fp-th-hladar\')" onerror="this.remove();this.parentNode.classList.remove(\'fp-th-hladar\');this.parentNode.textContent=\'📄\'">' : '📄') + '</div>' +
        '<div style="padding:8px 10px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:2px;color:#fff">' + esc(titill) +
        (d.urelt ? ' <span style="color:#e0a05f;font-size:10px;font-weight:400">(úrelt)</span>' : '') + '</div>' +
        merkiHtml(d) +
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
      k.onclick = function () {
        var d = syna.find(function (x) { return x.infoUrl === k.getAttribute('data-url'); });
        // snið / útlit (engin grunnmynd á blaðinu) verða ekki hæð — aðeins skoðuð
        if (d && flokkaBlad(d).adeinsSnidUtlit) { synaSkodun(k.getAttribute('data-url'), k.getAttribute('data-label')); return; }
        // 20.10.2026: forskoðun fyrst — sjá hvað er valið (og velja síðu í settum) áður en blaðið fer á borðið
        if (d) { forskodun(d, k.getAttribute('data-label')); return; }
        hladaMynd(k.getAttribute('data-url'), k.getAttribute('data-label'));
      };
    });
    fyllaKortThumbs(o, syna);
  }

  /* ── mynd á canvas (eigin hleðsla með villu/tímaþaki svo spinner frjósi ekki) */
  function hladaMynd(infoUrl, label, sidaNr) {
    if (!infoUrl) { toast('Þessa teikningu er ekki hægt að sækja'); return; }
    spinna('Sæki teikningu' + (label ? (' – ' + label) : '') + (sidaNr > 1 ? ' (síða ' + sidaNr + ')' : '') + '…');
    // &sida=N: valin síða í PDF-setti (435 les hana); síða 1 er óbreytt slóð svo vistaðar hæðir passi enn
    var url = MYND + '?url=' + encodeURIComponent(infoUrl) + (sidaNr > 1 ? '&sida=' + (sidaNr | 0) : '');
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
    if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(img, url);
    else if (window.TeiknSja && TeiknSja.bindSrc) TeiknSja.bindSrc(img, url);
    else img.src = url;
  }

  /* ── uppfletting: heimilisfang → landnúmer → teikningalisti ───────────────── */
  var spinnaYfir = spinna, villaYfir = synaVillu;    // yfirlagið (var-skygging inni í saekja nær ekki hingað)
  // ui = { spinna, villa(html, hlekkur), listi(dr, eign) } — sjálfgefið yfirlagið hér; 383 „Finna allt húsið" fær listann
  // beint (TeiknSaekja.finna) án þess að listinn birtist.
  async function saekja(coId, ui) {
    ui = ui || { spinna: spinnaYfir, villa: villaYfir, listi: function (dr) { synaLista(dr, false); } };
    var spinna = ui.spinna, synaVillu = ui.villa;      // skyggja yfir föllin — allt hér fer um ui
    var addr = heimilisfangFyrir(coId);
    if (!addr) {
      synaVillu('Ekkert heimilisfang skráð á þennan viðskiptavin — notaðu „Hlaða upp".');
      return;
    }
    spinna('Leita að húsinu…');
    try {
      var d1 = await (await fetch(LISTI + '?heimilisfang=' + encodeURIComponent(addr) + STADF_V, { signal: AbortSignal.timeout(28000) })).json();
      var results = (d1 && d1.results) || [];
      // 03.10.2026: heimilisfang félags er oft í ÞÁGUFALLI („Hátúni 10c, 105 Reykjavík") og Landeignaskrá finnur
      // aðeins nefnifall („Hátún 10C") — glugginn sagði „Fann ekki húsið" meðan prófíllinn (363) fann teikningarnar
      // með hus-upplysingar, sem kann bæði föllin. Finnist ekkert er leitað aftur á nefnifallinu þaðan; öll venjuleg
      // rökvísi (4 vs 4A, kortasjá utan Reykjavíkur) gildir þá áfram.
      if (!results.length) {
        try {
          var hu = await (await fetch('/.netlify/functions/hus-upplysingar?heimilisfang=' + encodeURIComponent(addr), { signal: AbortSignal.timeout(20000) })).json();
          var nefnifall = hu && hu.eign && hu.eign.label;
          if (nefnifall) {
            addr = nefnifall + (hu.eign.postnr ? ', ' + hu.eign.postnr : '');
            var d1b = await (await fetch(LISTI + '?heimilisfang=' + encodeURIComponent(nefnifall) + STADF_V, { signal: AbortSignal.timeout(28000) })).json();
            results = (d1b && d1b.results) || [];
          }
        } catch (_) {}
      }
      // 20.09.2026: tók FYRSTU Reykjavíkur-eignina. Fyrir „Skútuvogur 4, 104 Reykjavík" skilar skráin 4A á undan 4,
      // svo glugginn sótti spennistöðina á 4A (1 blað) í stað hússins (66 teikningar). Nákvæm samsvörun á
      // götu + húsnúmeri ræður nú; fyrsta eignin er aðeins varaleið.
      var nrm = function (t) { return String(t || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); };
      var gata = nrm(addr.split(',')[0]);
      var rvk = results.filter(function (x) { return x.heimild === 'reykjavik'; });
      var eign = rvk.find(function (x) { return nrm(String(x.label || '').split('(')[0]) === gata; }) || rvk[0];
      // 04.10.2026: Hafnarfjörður / Kópavogur / Garðabær (map.is) eru með rafrænt teikningasafn — teikn-listi sækir það
      // á landnr + heitinr + svf og 435 teiknar PDF-ið í mynd. Áður stoppaði glugginn hér með „ekki rafrænt safn".
      var mapisEign = !eign && (results.find(function (x) { return x.heimild === 'map.is' && x.svf && x.heitinr && nrm(String(x.label || '').split('(')[0]) === gata; })
        || results.find(function (x) { return x.heimild === 'map.is' && x.svf && x.heitinr; }));
      if (mapisEign) {
        spinna('Sæki teikningar hússins (' + esc(mapisEign.heimildNafn || 'sveitarfélag') + ')…');
        var dm2 = await (await fetch(LISTI + '?landnr=' + encodeURIComponent(mapisEign.landnr) + '&heitinr=' + encodeURIComponent(mapisEign.heitinr) +
          '&svf=' + encodeURIComponent(mapisEign.svf), { signal: AbortSignal.timeout(28000) })).json();
        var drm = ((dm2 && dm2.results) || []).filter(function (d) { return d && d.infoUrl; });
        if (drm.length) { ui.listi(drm, mapisEign); return; }
      }
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
      ui.listi(dr, eign);
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

  function undirbuaDrop() {
    var dm = document.getElementById('fp-drop-msg');
    if (!dm || dm.dataset.saekja === '1') return;
    dm.dataset.saekja = '1';
    dm.style.pointerEvents = 'auto';
    dm.style.cursor = 'pointer';
    if (!dm.querySelector('.fp-drop-cta')) {
      var cta = document.createElement('div');
      cta.className = 'fp-drop-cta';
      cta.textContent = 'Sækja teikningu hússins';
      dm.appendChild(cta);
    }
    dm.addEventListener('click', function () { saekja(FloorPlan.companyId); });
  }

  function saekjaEfTomt(cid) {
    var byrjun = Date.now();
    if (FloorPlan.__soknLokid === cid) FloorPlan.__soknLokid = 0;   // ný opnun — bíða eftir NÝRRI sókn
    (function athuga() {
      if (FloorPlan.companyId !== cid) return;
      if (FloorPlan.bgImage) return;
      var plan = FloorPlan.plans[cid];
      if (plan && (plan.imageUrl || (plan.haedir || []).some(function (h) { return h && h.image_url; }))) return;
      if (!document.getElementById('modal-floorplan') || !document.getElementById('modal-floorplan').classList.contains('open')) return;
      // Röð þjónsins enn á leiðinni (375 setur __soknLokid): bíða, í mesta lagi 10 s.
      if (FloorPlan.__soknLokid !== cid && Date.now() - byrjun < 10000) { setTimeout(athuga, 300); return; }
      saekja(cid);
    })();
  }

  function skreyta() {
    if (!window.FloorPlan) return false;
    if (FloorPlan.__saekjaSkreytt) return true;
    var uppruni = FloorPlan.open;
    if (typeof uppruni !== 'function') return false;
    FloorPlan.open = function () {
      var r = uppruni.apply(this, arguments);
      try { baetaHnappi(); } catch (_) {}
      try { undirbuaDrop(); } catch (_) {}
      try { saekjaEfTomt(this.companyId); } catch (_) {}
      return r;
    };
    FloorPlan.__saekjaSkreytt = true;
    return true;
  }

  // „Finna allt húsið" (383): listinn án yfirlags — { dr, eign } eða { villa }
  window.TeiknSaekja = {
    flokka: flokkaBlad,
    listi: function (dr, allar) { synaLista(dr || [], !!allar); },   // sýnir valglugga með gefnum blöðum (próf / 383)
    finna: function (coId) {
      return new Promise(function (res) {
        var buid = false, lok = function (v) { if (!buid) { buid = true; res(v); } };
        saekja(coId, {
          spinna: function () {},
          villa: function (h) { lok({ villa: String(h || '').replace(/<[^>]+>/g, '') }); },
          listi: function (dr, eign) { lok({ dr: dr, eign: eign || null }); }
        }).then(function () { lok({ villa: 'Engin svör frá teikningaskránni' }); }, function () { lok({ villa: 'Villa við að sækja teikningar' }); });
      });
    }
  };

  if (!skreyta()) {
    var reyn = 0;
    var i = setInterval(function () { if (skreyta() || ++reyn > 40) clearInterval(i); }, 150);
  }
})();
