/* 213-theme-inspection.js  —  "Inspection panel" visual refresh, pass 1.

   A reversible theme layer (approved 2026-06-17). Injects web fonts + an
   override stylesheet and adds data-driven gauge bars to the Ársskoðun stat
   cards. PURELY VISUAL — no behaviour, data, links or controls are changed.
   The sales banner + logo are intentionally left untouched.

   To fully revert: delete this file and its <script> tag in index.html. */
(function () {
  if (window.__themeInspectionInstalled) return;
  window.__themeInspectionInstalled = true;

  /* 1. Web fonts ------------------------------------------------------- */
  if (!document.getElementById('thm-fonts')) {
    var l = document.createElement('link');
    l.id = 'thm-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Public+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(l);
  }

  /* 2. Override stylesheet --------------------------------------------- */
  if (!document.getElementById('thm-style')) {
    var st = document.createElement('style');
    st.id = 'thm-style';
    st.textContent = [
      ":root{--thm-red:#DA2A1E;--thm-line:#E6E3DA;--thm-line2:#EFEDE6;}",
      "body,.view,.main-panel,button,input,select,textarea,th,td{font-family:'IBM Plex Sans',-apple-system,'Segoe UI',system-ui,sans-serif !important;}",
      "body.has-mobnav,.main-panel{background:#F5F4EF !important;}",
      "h1,h2,h3{font-family:'Playfair Display',Georgia,serif !important;letter-spacing:-.02em !important;}",
      ".topbar{background:#16181D !important;}",
      ".vnav-btn{position:relative !important;font-weight:500 !important;}",
      ".vnav-btn:hover{background:rgba(255,255,255,.05) !important;}",
      ".vnav-btn.active{background:#242832 !important;color:#fff !important;}",
      ".vnav-btn.active::before{content:'';position:absolute;left:0;top:5px;bottom:5px;width:3px;background:var(--thm-red);border-radius:0 3px 3px 0;}",
      "#_ars-new{background:var(--thm-red) !important;border-radius:9px !important;font-weight:600 !important;}",
      "._ars-vm,#_ars-sort{border-color:var(--thm-line) !important;border-radius:9px !important;}",
      ".by-preset{border-color:var(--thm-line) !important;border-radius:8px !important;}",
      "._ars-mo{border-color:var(--thm-line) !important;}",
      "th._ars-sort{font-family:'JetBrains Mono',ui-monospace,monospace !important;font-size:10.5px !important;letter-spacing:.05em !important;text-transform:uppercase !important;color:#9A9CA2 !important;}",
      "tr._ars-row td{border-bottom:1px solid var(--thm-line2) !important;}",
      "tr._ars-row:hover{background:#FBFAF6 !important;}",
      ".thm-stat{border:1px solid var(--thm-line) !important;border-radius:13px !important;box-shadow:0 1px 2px rgba(20,20,25,.05) !important;}",
      ".thm-statnum{font-family:'IBM Plex Sans',-apple-system,'Segoe UI',sans-serif !important;letter-spacing:-.02em !important;}",
      ".thm-track{height:4px;border-radius:3px;margin-top:11px;overflow:hidden;}",
      ".thm-fill{height:100%;border-radius:3px;}"
    ].join('\n');
    document.head.appendChild(st);
  }

  /* 3. Data-driven gauge bars on the Ársskoðun stat cards -------------- */
  var _cards = null;
  function cardAncestor(e) {
    var el = e;
    for (var i = 0; i < 6 && el; i++) { el = el.parentElement; if (el && getComputedStyle(el).borderRadius !== '0px') return el; }
    return null;
  }
  function getCards() {
    var out = {}, leaves = document.querySelectorAll('#view-arsskodun div, #view-arsskodun span');
    for (var i = 0; i < leaves.length; i++) {
      var e = leaves[i]; if (e.children.length) continue;
      var t = e.textContent.trim().toUpperCase(), k = null;
      if (t.indexOf('FJÖLDI') === 0) k = 'FJOLDI';
      else if (t.indexOf('BÚIÐ') === 0) k = 'BUID';
      else if (t.indexOf('EFTIR') === 0) k = 'EFTIR';
      else if (t.indexOf('ÁÆTL') === 0 || t.indexOf('TEKJUR') >= 0) k = 'TEKJUR';
      if (k && !out[k]) { var c = cardAncestor(e); if (c) out[k] = c; }
    }
    return out;
  }
  function ensureCards() {
    if (_cards && _cards.FJOLDI && document.body.contains(_cards.FJOLDI)) return _cards;
    _cards = getCards(); return _cards;
  }
  function ints(card) {
    var m = card.textContent.match(/[\d.]+/g) || [], out = [];
    for (var i = 0; i < m.length; i++) { var n = parseInt(m[i].replace(/\./g, ''), 10); if (!isNaN(n) && n > 0 && !(n >= 2000 && n <= 2099)) out.push(n); }
    return out;
  }
  function pctIn(card) { var m = card.textContent.match(/(\d+)\s*%/); return m ? parseInt(m[1], 10) / 100 : null; }
  function bar(card, frac, color, dark) {
    if (frac == null || !isFinite(frac)) return;
    frac = Math.max(0.02, Math.min(1, frac));
    card.classList.add('thm-stat');
    var old = card.querySelector(':scope > .thm-track'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'thm-track'; t.style.background = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)';
    var f = document.createElement('div'); f.className = 'thm-fill'; f.style.width = Math.round(frac * 100) + '%'; f.style.background = color;
    t.appendChild(f); card.appendChild(t);
    var nodes = card.querySelectorAll('div,span');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]; if (n.children.length) continue;
      var s = n.textContent.trim();
      if (/^[\d.]+( ?kr)?$/.test(s) && s.replace(/\D/g, '').length >= 2) n.classList.add('thm-statnum');
    }
  }
  function decorate() {
    var C = ensureCards(); if (!C.FJOLDI && !C.BUID) return;
    var arsTotal = null;
    if (C.FJOLDI) { var n = ints(C.FJOLDI).sort(function (a, b) { return b - a; }); arsTotal = n[1]; if (n.length >= 2) bar(C.FJOLDI, n[1] / n[0], '#2A2F39', false); }
    if (C.BUID) { var p = pctIn(C.BUID); if (p == null && arsTotal) { var b = ints(C.BUID); if (b.length) p = Math.min.apply(null, b) / arsTotal; } bar(C.BUID, p, '#1C8F60', false); }
    if (C.EFTIR && arsTotal) { var e = ints(C.EFTIR).sort(function (a, b) { return b - a; }); if (e.length) bar(C.EFTIR, e[0] / arsTotal, '#D99206', false); }
    if (C.TEKJUR) { var k = ints(C.TEKJUR).sort(function (a, b) { return b - a; }); if (k.length >= 2) bar(C.TEKJUR, k[1] / k[0], '#B08A4F', true); }
  }

  var target, obs, timer, last = 0;
  function runOnce() { if (obs) obs.disconnect(); try { decorate(); } catch (e) {} if (obs && target) obs.observe(target, { childList: true, subtree: true }); }
  function schedule() {
    var now = Date.now(), gap = now - last;        // leading-edge throttle: decorate the
    if (gap >= 150) { last = now; runOnce(); }      // stat cards as soon as they appear,
    else { clearTimeout(timer); timer = setTimeout(  // don't wait for the whole table to render
      function () { last = Date.now(); runOnce(); }, 150 - gap); }
  }
  function boot() {
    runOnce();
    target = document.getElementById('view-arsskodun') || document.body;
    obs = new MutationObserver(schedule);
    obs.observe(target, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
  else setTimeout(boot, 400);
})();
