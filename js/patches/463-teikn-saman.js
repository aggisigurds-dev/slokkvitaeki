/* 463 — TEIKNINGAGLUGGINN: EIN PDF-SÓKN, OG HÚN BYRJAR STRAX (13.10.2026)
 *
 * Agnar 13.10.2026: „Geturðu aukið hraðann eitthvað á teikningar — glugginn inn í company profiles".
 *
 * Mælt á lifandi síðu (Center Hótel 1750, kjallari, .pdf.info úr skjalasafni Reykjavíkur):
 *   0,18 s  glugginn opinn
 *   5,7 s   JPEG-ið komið (teikn-mynd → Kjarni → skjalasafnið)            ← lagað í föllunum (durable CDN)
 *   7,3 s   teikningin máluð
 *   8,0 s   pdf.js hlaðið, SÍÐAN fyrst sótt vigur-PDF — TVISVAR, sama skjal (436 skýrari mynd + 438 skarpt yfirlag),
 *   12 / 16 s  hvort í sínum pdf.js-vinnuþræði; seinni sóknin beið eftir þeirri fyrri og sótti svo aftur.
 *
 * Hér:
 *  1. teikn-pdf GET (án ?nidurhal) fer um EINA sókn: samtíma kallarar deila henni og bætin lifa í 10 mín (2 skjöl),
 *     svo 436, 438, 383 og 435 fá hvert sitt eintak (nýtt Response) án nýrrar netferðar. Merki (AbortSignal) hvers
 *     kallara gildir áfram fyrir hann einan.
 *  2. Þegar glugginn opnast er PDF-ið (aðeins vigur: .pdf / .pdf.info — TIF fer um vinnuþráð 438) og pdf.js sótt
 *     STRAX, samhliða JPEG-inu, í stað þess að bíða þar til myndin er máluð. 438 sækir það alltaf fyrir slíkar
 *     teikningar, svo þetta er sama sóknin fyrr — ekki aukasókn.
 */
(function () {
  'use strict';
  if (window.__teiknSaman463) return;
  window.__teiknSaman463 = true;

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var LIFTIMI = 10 * 60 * 1000, FJOLDI = 2;
  var minni = new Map();   // lykill → { p: Promise<{ok, buf|txt, st, ct}>, t }

  function slodAf(inn) {
    try { return new URL(typeof inn === 'string' ? inn : (inn && inn.url) || '', location.href); } catch (_) { return null; }
  }
  function erPdf(u) { return !!u && u.origin === location.origin && u.pathname === '/.netlify/functions/teikn-pdf' && !u.searchParams.has('nidurhal'); }

  function saekja(oF, lykill) {
    var f = minni.get(lykill);
    if (f && Date.now() - f.t < LIFTIMI) return f.p;
    var p = oF(lykill, { signal: AbortSignal.timeout(90000) }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok) { minni.delete(lykill); return r.text().then(function (txt) { return { ok: false, txt: txt, st: r.status, ct: ct }; }); }
      return r.arrayBuffer().then(function (buf) { return { ok: true, buf: buf, st: r.status, ct: ct || 'application/pdf' }; });
    }, function (e) { minni.delete(lykill); throw e; });
    minni.set(lykill, { p: p, t: Date.now() });
    while (minni.size > FJOLDI) minni.delete(minni.keys().next().value);
    return p;
  }
  // Hver kallari fær sitt eigið Response — bætin eru afrituð við smíði, svo pdf.js má taka sitt eintak yfir í vinnuþráð.
  function svar(g) { return new Response(g.ok ? g.buf : g.txt, { status: g.st, headers: { 'Content-Type': g.ct } }); }
  function medMerki(p, merki) {
    if (!merki) return p;
    return new Promise(function (res, rej) {
      var hafna = function () { rej(merki.reason || new DOMException('Hætt við', 'AbortError')); };
      if (merki.aborted) return hafna();
      merki.addEventListener('abort', hafna, { once: true });
      p.then(function (v) { merki.removeEventListener('abort', hafna); res(v); }, function (e) { merki.removeEventListener('abort', hafna); rej(e); });
    });
  }

  function vefja() {
    var oF = window.fetch;
    if (typeof oF !== 'function' || oF.__teikn463) return;
    var w = function (inn, opt) {
      try {
        var m = String((opt && opt.method) || (inn && typeof inn !== 'string' && inn.method) || 'GET').toUpperCase();
        var u = m === 'GET' ? slodAf(inn) : null;
        if (erPdf(u)) return medMerki(saekja(oF, u.pathname + u.search), opt && opt.signal).then(svar);
      } catch (_) {}
      return oF.apply(this, arguments);
    };
    for (var k in oF) { try { w[k] = oF[k]; } catch (_) {} }   // merki fyrri vafninga (t.d. __ub431) fylgja, svo þær vefji ekki aftur
    w.__teikn463 = true;
    window.fetch = w;
  }
  vefja();

  // ── Forsókn við opnun gluggans ─────────────────────────────────────────────────────────────────────────────
  // sama regla og 438 pdfSlod / 435 pdfSlodUrMynd: image_url = teikn-mynd?url=<permalink>; .pdf / .pdf.info → teikn-pdf
  function pdfSlodUr(myndSlod) {
    try {
      var u = new URL(String(myndSlod).replace(/^pdf:/, ''), location.href);
      if (!/teikn-mynd/.test(u.pathname)) return '';
      var inn = u.searchParams.get('url') || '';
      return inn && /\.pdf(\.info)?$/i.test(new URL(inn).pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
    } catch (_) { return ''; }
  }
  function virkMynd() {
    try {
      var hs = window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir();
      var h = hs && hs[TeiknBord.virk ? TeiknBord.virk() : 0];
      if (h && h.image_url) return h.image_url;
    } catch (_) {}
    var F = window.FloorPlan, b = F && F.bgImage;
    if (b) return b._sja || b._gaedi || b.src || '';
    var pl = F && F.plans && F.companyId != null && F.plans[F.companyId];
    return (pl && pl.imageUrl) || '';
  }
  var pdfjsForhladid = false;
  function forhladaPdfJs() {
    if (pdfjsForhladid || window.pdfjsLib) return;
    pdfjsForhladid = true;
    // preload — ekki <script>: 436/438 setja sjálf inn script-merkið þegar þau þurfa og fá það þá úr skyndiminni (ekki tvíkeyrt)
    var l = document.createElement('link'); l.rel = 'preload'; l.as = 'script'; l.href = PDFJS + 'pdf.min.js';
    document.head.appendChild(l);
  }
  var leitT = 0;
  function forsaekja() {
    clearInterval(leitT);
    var t0 = Date.now();
    leitT = setInterval(function () {
      var m = document.getElementById('modal-floorplan');
      if (!m || Date.now() - t0 > 5000) { clearInterval(leitT); return; }
      var slod = pdfSlodUr(virkMynd());
      if (!slod) return;
      clearInterval(leitT);
      forhladaPdfJs();
      window.fetch(slod).catch(function () {});   // bætin fara í minnið hér að ofan; 436/438 sækja þau þaðan
    }, 60);
  }

  function vefjaOpnun() {
    var F = window.FloorPlan;
    if (!F || typeof F.open !== 'function') return false;
    if (F.open.__teikn463) return true;
    var o = F.open;
    var w = function () { var r = o.apply(this, arguments); try { forsaekja(); } catch (_) {} return r; };
    for (var k in o) { try { w[k] = o[k]; } catch (_) {} }
    w.__teikn463 = true;
    F.open = w;
    return true;
  }
  // Aðrir pappar (374, 451, newfeatures) vefja FloorPlan.open við ræsingu — athugað aftur svo okkar vafningur haldist ystur.
  var reyn = 0;
  (function reyna() { vefjaOpnun(); if (++reyn < 20) setTimeout(reyna, 500); })();

  // ── Afkóðun utan aðalþráðarins (13.10.2026, „bæta teikninga-bygginguna") ───────────────────────────────────
  // Mælt á lifandi síðu: JPEG skjalasafnsins er 6006×4339 (26 MP). Fyrsta _renderCanvas (floorplanfix) stillti canvas á
  // fulla stærð og málaði ALLT blaðið — afkóðun + málun á aðalþræðinum, 0,7–1,15 s frosinn gluggi — og 383 skar svo að
  // hæðinni (1351×1349) í næsta tifi; sama aftur þegar 436 skipti inn skýrari mynd. Notandinn sá allt blaðið fyrst og
  // svo stökk inn í hæðina, tvisvar.
  // Nú: stór mynd sem er ekki afkóðuð er afkóðuð með img.decode() (utan aðalþráðarins), ekkert málað á meðan, og svo
  // beðið 383 (TeiknBord.nyMynd) að taka við — það sker strax að hæðinni þegar skurðurinn er þekktur, svo 26 MP blaðið
  // er aldrei málað. 383 bíður líka (afkodar) svo tifið þess afkóði ekki samstillt í kapphlaupi.
  var STOR = 6e6;
  var stada = new WeakMap();   // img → { src, tilbuin } — 436 setur NÝJA slóð á sama <img>, svo slóðin er hluti lykilsins
  function skurdurThekktur() {
    try { var TB = window.TeiknBord, hs = TB && TB.haedir && TB.haedir(), h = hs && hs[TB.virk ? TB.virk() : 0]; return !!(h && h.skurdur && h.skurdur.w > 8); }
    catch (_) { return false; }
  }
  function svarKomid() { var F = window.FloorPlan; return !!(F && F.companyId != null && F.__soknLokid === F.companyId); }   // 375: röð þjónsins (eða engin)
  function merki(syna) {
    var main = document.getElementById('fp-main'), e = document.getElementById('fp-afk');
    if (!syna || !main) { if (e) e.remove(); return; }
    if (e && e.parentNode === main) return;
    if (e) e.remove();
    e = document.createElement('div'); e.id = 'fp-afk';
    e.style.cssText = 'position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.78);font:600 14px system-ui,sans-serif;pointer-events:none';
    e.textContent = 'Teikna…';
    main.appendChild(e);
  }
  function afkodar(img) {
    if (!img || img.tagName !== 'IMG' || !img.complete || !img.naturalWidth) return false;
    if (img.naturalWidth * img.naturalHeight < STOR || typeof img.decode !== 'function') return false;
    var src = img.currentSrc || img.src || '', s = stada.get(img);
    if (s && s.src === src) return !s.tilbuin;
    s = { src: src, tilbuin: false }; stada.set(img, s);
    merki(true);
    var t0 = performance.now();
    img.decode().catch(function () {}).then(function () {
      try { performance.measure('teikn-afkodun', { start: t0 }); } catch (_) {}
      var n = 0;
      (function bida() {
        if (stada.get(img) !== s) return;                       // ný slóð á sama hnút — sú umferð tekur við
        var F = window.FloorPlan;
        if (!F || F.bgImage !== img) { s.tilbuin = true; merki(false); return; }
        // Skurður hæðarinnar óþekktur og röð þjónsins ókomin: beðið (≤ 2 s) — annars málaðist allt blaðið fyrst (754 ms).
        if (!skurdurThekktur() && !svarKomid() && ++n < 25) { setTimeout(bida, 80); return; }
        s.tilbuin = true; merki(false);
        try { if (window.TeiknBord && TeiknBord.nyMynd) { TeiknBord.nyMynd(); return; } } catch (_) {}
        try { F._renderCanvas(); } catch (_) {}
      })();
    });
    return true;
  }
  function vefjaTeiknun() {
    var F = window.FloorPlan;
    if (!F || typeof F._renderCanvas !== 'function' || F._renderCanvas.__teikn463) return;
    var o = F._renderCanvas;
    var w = function () { if (afkodar(this && this.bgImage)) return; return o.apply(this, arguments); };
    for (var k in o) { try { w[k] = o[k]; } catch (_) {} }
    w.__teikn463 = true;
    F._renderCanvas = w;
  }
  // 434/floorplanfix/newfeatures vefja _renderCanvas við ræsingu — okkar vafningur þarf að vera ystur.
  var reynT = 0;
  (function reynaT() { vefjaTeiknun(); if (++reynT < 20) setTimeout(reynaT, 500); })();

  window.TeiknSaman = { minni: function () { return Array.from(minni.keys()); }, forsaekja: forsaekja, afkodar: afkodar };
})();
