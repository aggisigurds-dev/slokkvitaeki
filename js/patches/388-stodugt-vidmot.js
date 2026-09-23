/* === STÖÐUGT VIÐMÓT (388, 23.09.2026) — skrun og fókus lifa endurteikningu ==========================================
 *
 * Agnar 23.09.2026: „hindra hopp þegar maður er að ýta á eitthvað eða stimpla inn … eins steady og hægt er."
 *
 * Listarnir í appinu eru teiknaðir með `main.innerHTML = …`. Það er einfalt og hratt, en allt sem hékk í gamla trénu
 * hverfur með því: skrunstaðan (líka lárétta skrunið í töflum á síma), fókusinn í reitnum sem verið var að skrifa í og
 * textavalið. Hver smellur sem kallar á endurteikningu skaut notandanum því aftur á topp listans. Hver síða hafði (í
 * mesta lagi) bjargað SÍNUM leitarreit — 153, 157 og 224 hver með sinni útgáfu af sama plástri.
 *
 * Hér er EINN hjálpari sem allar síður mega nota:
 *
 *     const aftur = Stodugt.vernda(main);   // rétt á undan main.innerHTML = …
 *     main.innerHTML = …;
 *     aftur();                              // strax á eftir, í SAMA tifi — enginn millistaða sést
 *
 * Hann geymir (1) skrunstöðu allra skrun-hýsla FYRIR OFAN rótina — þeir lifa endurteikninguna og fá stöðuna beint til
 * baka; (2) skrunstöðu skrunara INNAN rótarinnar — þeir eru endurnýjaðir, svo þeir eru fundnir aftur eftir
 * auðkenni/klasa og sæti; (3) fókus og textaval, fundið aftur eftir sömu reglu.
 *
 * Meginregla: hjálparinn LES stöðu og setur hana aftur. Hann snertir hvorki gögn né teikningu og má aldrei kasta villu
 * upp í kallarann — mistakist endurheimt er útkoman nákvæmlega sú sem var áður (hopp), aldrei verri.
 * ================================================================================================================== */
(() => {
  if (window.Stodugt) return;

  const esc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  const skrunandi = el => {
    try {
      const st = getComputedStyle(el);
      return /(auto|scroll)/.test(st.overflowY + ' ' + st.overflowX);
    } catch (_) { return false; }
  };
  // Stöðugt kennimark hnúts innan rótarinnar: auðkenni ef til, annars fyrsti klasi + sæti meðal jafningja.
  function kenni(rot, el) {
    try {
      if (el.id) return { sel: '#' + esc(el.id), i: 0 };
      const kl = String(el.className || '').split(/\s+/).filter(Boolean)[0];
      if (!kl) return null;
      const sel = '.' + esc(kl);
      const allir = Array.prototype.slice.call(rot.querySelectorAll(sel));
      const i = allir.indexOf(el);
      return i < 0 ? null : { sel, i };
    } catch (_) { return null; }
  }
  function finna(rot, k) {
    try {
      if (!k) return null;
      const allir = rot.querySelectorAll(k.sel);
      return allir[k.i] || allir[0] || null;
    } catch (_) { return null; }
  }

  function vernda(rot) {
    const ytri = [];      // [hnútur, top, left] — lifa endurteikninguna
    const innri = [];     // [kenni, top, left]  — endurnýjaðir
    let fokus = null;
    try {
      if (!rot || !rot.parentElement) return () => {};
      let n = rot;
      while (n && n !== document.body) {
        if (skrunandi(n) && (n.scrollTop || n.scrollLeft)) ytri.push([n, n.scrollTop, n.scrollLeft]);
        n = n.parentElement;
      }
      const rotSkrun = document.scrollingElement || document.documentElement;
      if (rotSkrun && (rotSkrun.scrollTop || rotSkrun.scrollLeft)) ytri.push([rotSkrun, rotSkrun.scrollTop, rotSkrun.scrollLeft]);
      rot.querySelectorAll('*').forEach(el => {
        if ((el.scrollTop || el.scrollLeft) && skrunandi(el)) {
          const k = kenni(rot, el);
          if (k) innri.push([k, el.scrollTop, el.scrollLeft]);
        }
      });
      const a = document.activeElement;
      if (a && rot.contains(a) && a !== rot) {
        const k = kenni(rot, a);
        if (k) {
          fokus = { k, s: null, e: null };
          try { fokus.s = a.selectionStart; fokus.e = a.selectionEnd; } catch (_) {}
        }
      }
    } catch (_) {}

    // Efni sem fyllist EFTIR Á (kort sem sækja sitt innihald, myndir, töflur) gerir síðuna hærri sekúndubroti síðar.
    // Sé skrunstaðan sett á meðan síðan er enn stutt klippist hún niður og notandinn situr eftir á röngum stað. Þess vegna
    // er hún sett aftur í nokkur skipti á meðan hæðin er enn að koma — EN aðeins ef notandinn hefur ekki sjálfur snert
    // skrunið á meðan (hjól, snerting, lyklaborð). Hans hreyfing gildir alltaf.
    let snert = false;
    const merkja = () => { snert = true; };
    const hlusta = (a) => [wheel,touchstart,keydown,mousedown].forEach(e => a ? addEventListener(e, merkja, { passive: true, capture: true }) : removeEventListener(e, merkja, { capture: true }));

    return function aftur() {
      try {
        ytri.forEach(([el, t, l]) => { if (el && el.isConnected) { if (t) el.scrollTop = t; if (l) el.scrollLeft = l; } });
        innri.forEach(([k, t, l]) => { const el = finna(rot, k); if (el) { if (t) el.scrollTop = t; if (l) el.scrollLeft = l; } });
        if (fokus) {
          const el = finna(rot, fokus.k);
          if (el && el.focus) {
            el.focus({ preventScroll: true });
            if (fokus.s != null && el.setSelectionRange) { try { el.setSelectionRange(fokus.s, fokus.e); } catch (_) {} }
          }
        }
      } catch (_) {}
      // Fylgja hæðinni eftir: sömu tölur settar aftur þegar innihaldið hefur sest, nema notandinn hafi tekið völdin.
      try {
        const aftur_i_sama = () => {
          if (snert) { hlusta(false); return; }
          ytri.forEach(([el, t, l]) => { if (el && el.isConnected && t && el.scrollTop < t) el.scrollTop = t; });
          innri.forEach(([k, t, l]) => { const el = finna(rot, k); if (el && t && el.scrollTop < t) el.scrollTop = t; });
        };
        hlusta(true);
        requestAnimationFrame(aftur_i_sama);
        setTimeout(aftur_i_sama, 220);
        setTimeout(() => { aftur_i_sama(); hlusta(false); }, 650);
      } catch (_) {}
    };
  }

  window.Stodugt = { vernda };
})();
