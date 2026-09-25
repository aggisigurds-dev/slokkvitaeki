/* === SAMRÆMING SÍÐNA Í BRUNASTÁLI (409) — 24.09.2026 ==========================================
 *
 * Agnar 24.09 00:10: „rennt yfir öll öpp síðurnar og ath misræmi í útliti. Og betrumbætt". Farið var yfir
 * 49 sýnir með Playwright (1920 px) og mælt: titill (litur, letur, emoji, staðsetning), bláir takkar, yfirflæði.
 * Misræmið sem fannst og er lagað hér — CSS eitt + tvær litlar textahnúta-aðgerðir, engir hlustarar snertir:
 *
 *   1. SÍÐUTITLAR: 14 sýnir báru dökkan titil (#11141c) ofan á dökka bandinu efst (Öpp, Tilboð, Verkdagbók,
 *      Aldursgreining, Bókhalds yfirlit, Hreyfingarlisti, Bakendi, Staðan, Mælaborð, Aðstoðarmiðstöð, Sameining,
 *      Þjónustuverk, Bókhald · yfirferð …) og 6 höfðu engan h1 heldur feitletraðan div (Viðskiptavinir,
 *      ÞjónustuVerkstæði, Móttaka, Vertíð, Aksturslisti, Brunakerfi yfirlit). Ársskoðun, Kröfu yfirlit, Verkröð og
 *      skoðanasíðurnar eru fyrirmyndin: hvítur Playfair-titill með skugga. Regla: FYRSTA feitletraða ≥ 19 px textastakið
 *      í efstu 320 px sýnarinnar sem stendur ekki á ljósum fleti verður síðutitill (klasi _s409-titill) — hvítt, Playfair,
 *      emoji strípað úr textahnútum (📝 📄 📊 🛠 …), undirlínan næst á eftir ljósgrá.
 *   2. BLÁIR TAKKAR utan litakerfisins (#2563eb · #1d4ed8 · #0d6efd · #3b82f6 · #2a78d6, inline og í klösum) á
 *      Drög, Yfirferð greiðslna, Tilboð, Punktar og verð, Móttaka, Vertíð, Beiðnir, Verkdagbók, Aldursgreining,
 *      Fyrirtækjaþjónusta, Stillingar → málmtakkinn (sama og Afgreiðsla/Verkstæði). Grænir og rauðir standa.
 *   3. Appelsínugula bandið á Drög og ljósbláa á Yfirferð greiðslna → málmhaus með hnoðum eins og aðrar síður.
 *   4. YFIRFLÆÐI: Verkdagbók víkkaði skjalið um 534 px — falinn ISO-dagsetningarreitur 149 (.dd-date-iso, absolute)
 *      án position:relative á umbúðunum; Tengiliðir (.tgl-wrap) 50 px út fyrir sýnina (padding + 100%).
 * ============================================================================================ */
(() => {
  if (window.__samraeming409) return;
  window.__samraeming409 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  const TS = 'text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)';
  const P = ':not(#_p409a):not(#_p409b):not(#_p409c)';   // þrjú gervi-auðkenni: vinna inline-!important-lausar reglur pappanna

  const BLUE = ['#2563eb', '#1d4ed8', '#0d6efd', '#3b82f6', '#2a78d6'];
  const blueSel = BLUE.map(c => 'html body .view button[style*="background:' + c + '"], html body .view button[style*="background: ' + c + '"], html body .view a[style*="background:' + c + '"]').join(',')
    + ',html body .view .vd-actions button.primary,html body .view .vd-tbl .act button.primary,html body .view .ar-btn.primary,html body .view .tb-new-btn,html body .view ._mt-next,html body .view ._bd-report,html body .view ._dt-filled-open,html body .view ._vw-topbtn[style*="1d4ed8"],html body .view #vd-save-btn,html body .view .bky-dk-btn';

  const css = [
    // 1) síðutitill + undirlína
    'html body .view ._s409-titill' + P + '{font-family:' + DISPLAY + '!important;font-weight:800!important;color:#fff!important;' + TS + '!important;letter-spacing:-.01em!important;background:transparent!important;-webkit-text-fill-color:#fff!important}',
    'html body .view ._s409-titill' + P + '{font-size:max(26px,1em)!important;line-height:1.1!important}',
    'html body .view ._s409-undir' + P + '{color:#c9d0da!important;-webkit-text-fill-color:#c9d0da!important;font-family:' + MONO + '!important;font-size:12px!important;letter-spacing:.04em!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
    // 2) bláir takkar → málmur (grænir/rauðir ósnertir)
    blueSel + '{background:' + METAL_BTN + '!important;border:1px solid #000!important;color:#eef1f4!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important;font-family:' + SANS + '!important;font-weight:600!important}',
    blueSel.split(',').map(s => s + ':hover').join(',') + '{filter:brightness(1.18)}',
    // 3) bönd: Drög (appelsínugult) og Yfirferð greiðslna (ljósblátt) → málmhaus með hnoðum
    'html body #view-drog div[style*="f59e0b"]' + P + ',html body #view-payrev div[style*="0ea5e9"]' + P + '{position:relative;background:' + METAL + '!important;border:1px solid #000!important;border-radius:12px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 14px 28px -16px rgba(0,0,0,.75)!important;margin:0 0 12px!important}',
    'html body #view-drog div[style*="f59e0b"]::before,html body #view-payrev div[style*="0ea5e9"]::before{content:"";position:absolute;left:8px;top:8px;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none}',
    'html body #view-drog div[style*="f59e0b"]::after,html body #view-payrev div[style*="0ea5e9"]::after{content:"";position:absolute;right:8px;top:8px;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none}',
    'html body #view-payrev div[style*="0ea5e9"] + div[style*="2563eb"],html body #view-payrev div[style*="0ea5e9"] + div{background:transparent!important}',
    // 4) yfirflæði
    'html body .dd-date-wrap{position:relative}',
    'html body .dd-date-wrap input.dd-date-iso' + P + '{position:absolute!important;left:0!important;top:0!important;width:1px!important;height:1px!important;min-width:0!important;max-width:1px!important;opacity:0!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important}',
    'html body #view-tengilidir .tgl-wrap' + P + '{max-width:100%!important;box-sizing:border-box!important}'
  ].join('\n');
  const st = document.createElement('style'); st.id = 'samraeming-409'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // ── titlar: finna, merkja, strípa emoji ────────────────────────────────────────────────────────────
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
  function lum(c) { const m = String(c).match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return 1; if (m.length > 3 && +m[3] === 0) return 1; return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; }
  function onLightSurface(el, view) {
    let e = el.parentElement;
    while (e && e !== view) { const bg = getComputedStyle(e).backgroundColor; if (lum(bg) > .8 && !/rgba\(0, 0, 0, 0\)/.test(bg)) return true; e = e.parentElement; }
    return false;
  }
  function stripEmoji(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const tn = []; let n;
    while ((n = w.nextNode())) tn.push(n);
    tn.forEach(x => { const v = x.nodeValue; const y = v.replace(EMOJI, '').replace(/^[\s·]+/, ''); if (y !== v) x.nodeValue = y; });
    // stakt emoji-span framan við (t.d. <span>📝</span>Drög) verður tómt — fela það
    Array.from(el.children).forEach(c => { if (c.tagName === 'SPAN' && !c.textContent.trim() && !c.querySelector('svg,img')) c.style.display = 'none'; });
  }
  function finnaTitil(view) {
    const vr = view.getBoundingClientRect();
    const cands = Array.from(view.querySelectorAll('h1,h2')).concat(Array.from(view.querySelectorAll('h3,div,span,b,strong')));
    for (let i = 0; i < cands.length; i++) {
      const el = cands[i];
      // 25.09.2026 (afköst): ódýru skilyrðin fyrst (sömu skilyrði, sama niðurstaða) — áður var closest() með 13
      // veljurum og getBoundingClientRect keyrt á ÖLLUM div/span sýnarinnar (þúsundir) í hverju tifi.
      if (el.children.length > 3) continue;
      // beinn textahnútur þarf að vera í stakinu sjálfu (ekki bara í börnum)
      if (!Array.from(el.childNodes).some(n => n.nodeType === 3 && n.nodeValue.trim().length > 1)) continue;
      const t = (el.textContent || '').replace(EMOJI, '').trim(); if (t.length < 3 || t.length > 60) continue;
      const r = el.getBoundingClientRect(); if (!r.height) continue;
      let sy = 0, pe = el.parentElement; while (pe && pe !== view.parentElement) { sy += pe.scrollTop || 0; pe = pe.parentElement; }   // staða í ÓSKRUNUÐU efni
      const y = r.top - vr.top + sy; if (y > 320 || y < -10) continue;
      if (el.closest('button,a,input,select,table,.leaflet-container,#_pe-panel,.card,.sk-card,._skel,.tcard,[data-s409-skip]')) continue;
      const cs = getComputedStyle(el); const minFs = /^H[12]$/.test(el.tagName) ? 17 : 19; if (parseFloat(cs.fontSize) < minFs || +cs.fontWeight < 600) continue;
      if (onLightSurface(el, view)) continue;
      return el;
    }
    return null;
  }
  const done = new WeakSet();
  function tick() {
    const view = document.querySelector('.view.active'); if (!view) return;
    // Endurmetið í hverju tifi: síður teikna efri hlutann ASYNC — fyrsta tifið gat merkt neðri kaflafyrirsögn sem þá var
    // ein í efstu 320 px (mælt 24.09: Punktar og verð). Komi betri frambjóðandi færist merkið.
    const cand = finnaTitil(view); const cur = view.querySelector('._s409-titill');
    let t = cur;
    if (cand && cand !== cur) {
      if (cur) { cur.classList.remove('_s409-titill'); const cu = cur.nextElementSibling; if (cu) cu.classList.remove('_s409-undir'); }
      t = cand; t.classList.add('_s409-titill');
    }
    if (!t) return;
    if (!done.has(t)) {
      done.add(t); stripEmoji(t);
      if (t.hasAttribute('data-cc313')) { t.style.removeProperty('color'); t.removeAttribute('data-cc313'); }   // 313 taldi flötinn ljósan
      const u = t.nextElementSibling;
      if (u && !u.matches('button,a,[onclick],[role=button],input,select') && !u.querySelector('button,input,select,a') && (u.textContent || '').trim().length < 160 && parseFloat(getComputedStyle(u).fontSize) <= 15 && lum(getComputedStyle(u).color) < .6 && !onLightSurface(u, view)) u.classList.add('_s409-undir');
    }
  }
  // 25.09.2026 (hopp): 120 ms debounce lét titilinn fá Playfair-stærðina EFTIR málun — sama 14 px hopp og var lagað
  // á Ársskoðun 24.09, nú mælt á Brunakerfi (CLS 0,21 við hverja opnun). Vaktin (252) skilar sér í rAF, fyrir málun:
  // tick keyrir þar í sama ramma, mest einu sinni per ramma. finnaTitil er ódýr síðan ódýru skilyrðin fóru fyrst.
  let inni = false;
  const schedule = () => { if (inni) return; inni = true; try { tick(); } catch (_) {} finally { inni = false; } };
  window.addEventListener('hashchange', () => { setTimeout(tick, 200); setTimeout(tick, 1200); setTimeout(tick, 3000); });
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  setInterval(tick, 2500);
  // 24.09.2026 (hopp): titillinn á Ársskoðun stóð 43 px (60 px hár) í allt að 3,5 s eftir fyrstu teikningu og hrökk svo í
  // Playfair 26 px (47 px) þegar fyrsta tifið kom — 14 px hopp á allri síðunni. Merkja í SAMA tifi og 153 teiknar
  // (ars:render) og strax við hleðslu, ekki bíða vaktar/tímamælis.
  document.addEventListener('ars:render', () => { try { tick(); } catch (_) {} });
  try { tick(); } catch (_) {}
  schedule();
  console.log('[patch-409] samræming síðna (titlar · takkar · bönd · yfirflæði)');
})();
