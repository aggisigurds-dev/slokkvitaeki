/* === SÍÐUSTÆRÐ · ALLTAF SÝNILEG STIKA EFST + VISTA-TAKKI (25.11.2026) ======================
 *
 * Agnar 25.11.2026: „Ég vill allavega geta alltaf breytt efst uppi zoominu. Ýtt á vista svo það
 * haldist þannig næst líka."
 *
 * Stærðin sjálf (patch 333) er óbreytt — þetta er aðeins stjórntæki ofan á hana:
 *
 *   [ −  85 %  + ]  [ Vista ]
 *
 * efst til hægri, undir borðanum (eða app-hausnum), á HVERRI síðu í símaham. − og + sýna nýju
 * stærðina STRAX en vista hana ekki (AppPageZoom.prufa), svo hægt sé að máta. Vista-takkinn
 * lifnar við um leið og eitthvað er ómáta og skrifar þá stærðina á þjóninn (AppPageZoom.setS),
 * svo hún gildi næst þegar síðan er opnuð — í öllum vélum, eins og reglan segir (15.10.2026).
 *
 * Talan á stikunni opnar gamla blaðið („Stærð og útlit", 333) fyrir sleðann, forstillingarnar,
 * festinguna og listann yfir vistaðar síður. Ekkert af því er tvítekið hér.
 *
 * SAMANBROTIN í eina pillu þar til snert er á henni. Fyrsta útgáfan stóð alltaf opin og huldi þá
 * efsta takkann á síðunni undir (mælt á Sölu: „Skanna" hvarf undir Vista-takkann). Pillan sýnir
 * töluna, opnast við snertingu, og lokast aftur eftir 6 sekúndur — þó ALDREI á meðan óvistuð
 * breyting bíður, því þá þarf Vista-takkinn að vera innan seilingar. Aa-hnappur 333 er falinn á
 * meðan stikan er uppi: tvö tól fyrir sama hlutinn á sama stað eru verri en eitt.
 *
 * ÞRENNT SEM ER VARIÐ:
 *   1. Forskoðun er TÍMABUNDIN. Sé farið á aðra síðu án þess að vista er hún hreinsuð strax
 *      (prufa(null)) — annars erfði næsta síða stærð sem enginn bað um.
 *   2. „Vistað ✓" birtist EKKI fyrr en þjónninn hefur staðfest (AppPageZoom.uppruni() verður
 *      'vistad'). Stikan segir „Vista…" á meðan. Óstaðfest vistun er ekki vistun.
 *   3. Stikan býr á <body>, ALDREI inni í .view — allt þar inni er margfaldað með zoom-inu
 *      sem hún á að stjórna og hún myndi þá minnka með því sem hún er að laga.
 * ========================================================================================== */
(() => {
  if (window.__zoomStika531) return;
  window.__zoomStika531 = true;

  const ID = '_zs-stika';
  const STIL = '_zs-stil';
  const SKREF = 0.05, MIN = 0.3, MAX = 1.6;
  const GULL = '#d9b762';
  const MALMUR = 'linear-gradient(180deg,#2d3037 0%,#1b1d22 55%,#141519 100%)';
  const SILFUR = 'linear-gradient(180deg,#fbfcfd 0%,#e3e7ec 52%,#cdd3da 100%)';
  const SANS = "'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,sans-serif";
  const DISP = "'Playfair Display',Georgia,serif";

  let opin = false;         // pillan útflett (− % + Vista)
  let lokaTif = null;
  let forskodun = null;     // stærð sem er mátuð en óvistuð
  let sidasti = null;       // lykill síðunnar sem forskoðunin á við
  let stada = '';           // '' | 'vista' | 'vistad' | 'villa'
  let stadaTif = null;

  const Z = () => window.AppPageZoom || null;
  const klemma = s => Math.max(MIN, Math.min(MAX, Math.round(s * 100) / 100));

  function virkt() {
    try {
      if (document.body && document.body.classList.contains('appmode')) return true;
      return document.documentElement.getAttribute('data-viewmode') === 'mobile';
    } catch (_) { return false; }
  }
  function synilegt(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return !!(r.width && r.height) && getComputedStyle(el).visibility !== 'hidden';
  }

  function stil() {
    if (document.getElementById(STIL)) return;
    const s = document.createElement('style');
    s.id = STIL;
    s.textContent = [
      '#' + ID + '{position:fixed;right:8px;top:var(--zs-top,8px);z-index:2147483599;display:none;',
      'align-items:center;gap:6px;font-family:' + SANS + ';-webkit-tap-highlight-color:transparent}',
      '#' + ID + '.synt{display:flex}',
      '#' + ID + ' .zs-pilla{min-width:46px;height:30px;padding:0 10px;border-radius:8px;border:1px solid #000;',
      'background:' + MALMUR + ';color:#f6e7b8;font:800 13px/28px ' + DISP + ';',
      'font-variant-numeric:lining-nums tabular-nums;position:relative;',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px -6px rgba(0,0,0,.6)}',
      '#' + ID + ' .zs-pilla.omata::after{content:"";position:absolute;top:3px;right:3px;width:7px;height:7px;',
      'border-radius:50%;background:' + GULL + '}',
      '#' + ID + '.opin .zs-pilla{display:none}',
      '#' + ID + ':not(.opin) .zs-hop,#' + ID + ':not(.opin) .zs-v{display:none}',
      // (Aa-hnappur 333 er falinn i JS, ekki her: regla med haerri serhaefni og !important
      //  annars stadar i simapotchunum vann yfir '#_sz-aa{display:none!important}' - maelt 25.11.2026.)
      '#' + ID + ' .zs-hop{display:flex;align-items:center;border-radius:8px;border:1px solid #000;',
      'background:' + MALMUR + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px -6px rgba(0,0,0,.6);overflow:hidden}',
      '#' + ID + ' button{font-family:' + SANS + ';cursor:pointer;touch-action:manipulation;border:0;background:none}',
      '#' + ID + ' .zs-pm{width:34px;height:30px;color:' + GULL + ';font:700 18px/1 ' + SANS + '}',
      '#' + ID + ' .zs-pm:active{background:rgba(217,183,98,.18)}',
      '#' + ID + ' .zs-tala{min-width:46px;height:30px;color:#f6e7b8;font:800 13px/30px ' + DISP + ';',
      'font-variant-numeric:lining-nums tabular-nums;border-left:1px solid rgba(217,183,98,.3);',
      'border-right:1px solid rgba(217,183,98,.3)}',
      '#' + ID + ' .zs-v{height:30px;padding:0 11px;border-radius:8px;border:1px solid #000;',
      'background:rgba(255,255,255,.07);color:#9aa1ab;font:700 12px/28px ' + SANS + ';letter-spacing:.02em}',
      '#' + ID + ' .zs-v.omata{background:' + SILFUR + ';color:#1f2530;box-shadow:inset 0 1px 0 #fff,0 2px 4px -2px rgba(0,0,0,.6)}',
      '#' + ID + ' .zs-v.ok{background:#1f6b45;border-color:#0d3f27;color:#eafff3}',
      '#' + ID + ' .zs-v.villa{background:#7f1d1d;border-color:#450a0a;color:#ffe4e4}'
    ].join('');
    document.head.appendChild(s);
  }

  function nuS() {
    const z = Z();
    if (forskodun != null) return forskodun;
    try { return z && z.getS ? z.getS() : 1; } catch (_) { return 1; }
  }

  function breyta(att) {
    const z = Z(); if (!z) return;
    forskodun = klemma(nuS() + att * SKREF);
    sidasti = z.lykill ? z.lykill() : null;
    stada = '';
    try { z.prufa(forskodun); } catch (_) {}
    teikna();
  }

  function hreinsaForskodun() {
    if (forskodun == null) return;
    forskodun = null; sidasti = null;
    try { const z = Z(); if (z && z.prufa) z.prufa(null); } catch (_) {}
  }

  function vista() {
    const z = Z(); if (!z || forskodun == null) return;
    const s = forskodun;
    forskodun = null; sidasti = null;
    stada = 'vista';
    teikna();
    try { z.prufa(null); } catch (_) {}
    try { z.setS(s); } catch (_) { stada = 'villa'; teikna(); return; }
    // „Vistað" aðeins þegar þjónninn hefur staðfest — 333 skiptir uppruna í 'vistad' við svarið.
    clearInterval(stadaTif);
    let beid = 0;
    stadaTif = setInterval(() => {
      let u = '';
      try { u = z.uppruni ? z.uppruni() : ''; } catch (_) {}
      if (u === 'vistad') { clearInterval(stadaTif); stada = 'vistad'; teikna(); setTimeout(() => { if (stada === 'vistad') { stada = ''; opin = false; teikna(); } }, 2200); }
      else if (++beid > 24) { clearInterval(stadaTif); stada = 'villa'; teikna(); }
    }, 250);
  }

  // Lokast eftir 6 sek adgerdaleysi - en ALDREI medan ovistud breyting bidur.
  function fresta() {
    clearTimeout(lokaTif);
    lokaTif = setTimeout(() => {
      if (forskodun != null || stada === 'vista') { fresta(); return; }
      opin = false; teikna();
    }, 6000);
  }

  function byggja() {
    const el = document.createElement('div');
    el.id = ID;
    el.innerHTML =
      '<button type="button" class="zs-pilla" data-zs="opna" aria-label="Stærð síðunnar">100%</button>' +
      '<span class="zs-hop">' +
        '<button type="button" class="zs-pm" data-zs="-" aria-label="Minnka síðuna">−</button>' +
        '<button type="button" class="zs-tala" data-zs="blad" aria-label="Stærð og útlit">100%</button>' +
        '<button type="button" class="zs-pm" data-zs="+" aria-label="Stækka síðuna">+</button>' +
      '</span>' +
      '<button type="button" class="zs-v" data-zs="vista">Vista</button>';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-zs]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const a = b.getAttribute('data-zs');
      if (a === 'opna') { opin = true; teikna(); fresta(); return; }
      if (a === '-') breyta(-1);
      else if (a === '+') breyta(1);
      else if (a === 'vista') vista();
      else { const z = Z(); if (z && z.vixla) z.vixla(); }
      fresta();
    });
    document.body.appendChild(el);
    return el;
  }

  // Snertir DOM AÐEINS þegar gildið er raunverulega annað (reglan um tvo pappa, CLAUDE.md).
  function teikna() {
    if (!document.body) return;
    const syna = virkt() && !!Z();
    let el = document.getElementById(ID);
    if (!el) { if (!syna) return; stil(); el = byggja(); }
    if (el.classList.contains('synt') !== syna) el.classList.toggle('synt', syna);
    if (!syna) return;

    // Forskoðun fylgir EKKI yfir á aðra síðu.
    const z = Z();
    const lykill = z && z.lykill ? z.lykill() : null;
    if (forskodun != null && sidasti && lykill !== sidasti) { hreinsaForskodun(); stada = ''; }

    const tala = Math.round(nuS() * 100) + '%';
    const t = el.querySelector('.zs-tala');
    if (t && t.textContent !== tala) t.textContent = tala;
    const pilla = el.querySelector('.zs-pilla');
    if (pilla) {
      if (pilla.textContent !== tala) pilla.textContent = tala;
      pilla.classList.toggle('omata', forskodun != null);
    }
    if (el.classList.contains('opin') !== opin) el.classList.toggle('opin', opin);

    const v = el.querySelector('.zs-v');
    if (v) {
      const omata = forskodun != null;
      const texti = stada === 'vista' ? 'Vista…' : stada === 'vistad' ? '✓ Vistað' : stada === 'villa' ? 'Villa' : 'Vista';
      if (v.textContent !== texti) v.textContent = texti;
      v.classList.toggle('omata', omata && !stada);
      v.classList.toggle('ok', stada === 'vistad');
      v.classList.toggle('villa', stada === 'villa');
      const slokkt = !omata && !stada;
      if (v.disabled !== slokkt) v.disabled = slokkt;
    }

    // Eitt tol fyrir sama hlutinn: Aa-hnappur 333 vikur medan stikan er uppi (talan opnar sama blad).
    // Endurheimtur strax og stikan hverfur, svo bladid tapist aldrei.
    // ATH: venjulegur inline-still dugar EKKI - regla med !important i simapotchunum vinnur
    // lika yfir hann (maelt 25.11.2026). Inline MED forgangi er thad eina sem byrgir hana.
    const aaBtn = document.getElementById('_sz-aa');
    if (aaBtn) {
      const nuna = aaBtn.style.getPropertyValue('display');
      if (syna && nuna !== 'none') aaBtn.style.setProperty('display', 'none', 'important');
      else if (!syna && nuna) aaBtn.style.removeProperty('display');
    }

    // Sama stadsetningarregla og Aa-hnappur 333 notadi: i appham undir app-hausnum, annars
    // undir bordanum, annars 8 px fra toppi - thar sem hann sat adur og Agnar er vanur ad
    // leita ad honum. (Fyrri utgafa setti hana undir haus appsins lika i vafra og hun lenti
    // tha ofan a efstu rod sidunnar - "Skanna" a Solu.)
    // STADSETNING. Reiknud ut fra SAMANBROTNU pillunni (50 px) - hun er thad sem stendur
    // uppi allan timann; utflett stika ma skyggja a i þær 6 sekundur sem hun er opin.
    // Í appham: undir app-hausnum. Annars: undir litla samanbrots-takkanum ("▴") efst til
    // haegri, sem er eini fasti punkturinn thar uppi. Svo faerist hun til vinstri thangad til
    // hun skarast ekki vid neinn smellanlegan hlut (maelt, ekki agiskad: thrjar tilraunir).
    const erApp = !!(document.body && document.body.classList.contains('appmode'));
    const hdr = document.getElementById('_app-hdr');
    const mini = document.querySelector('.bb-mini');
    let top = 8;
    if (erApp && synilegt(hdr)) top = Math.round(hdr.getBoundingClientRect().bottom + 6);
    else if (synilegt(mini)) top = Math.max(8, Math.round(mini.getBoundingClientRect().bottom + 4));

    const BREIDD = 50, HAED = 32;
    let haegri = 8;
    for (let n = 0; n < 3; n++) {
      const kassi = { t: top, b: top + HAED, l: innerWidth - haegri - BREIDD, r: innerWidth - haegri };
      let min = null;
      document.querySelectorAll('button,a[href],input,select,[role="button"]').forEach(e => {
        if (el.contains(e)) return;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.right < kassi.l || r.left > kassi.r || r.bottom < kassi.t || r.top > kassi.b) return;
        if (min === null || r.left < min) min = r.left;
      });
      if (min === null) break;
      haegri = Math.round(innerWidth - min + 6);
      if (haegri > innerWidth - BREIDD - 8) { haegri = 8; break; }   // ekkert plass: aftur til haegri
    }

    const stilla = (n, v2) => { if (el.style.getPropertyValue(n) !== v2) el.style.setProperty(n, v2); };
    stilla('--zs-top', top + 'px');
    stilla('right', haegri + 'px');
  }

  function raesa() {
    teikna();
    addEventListener('hashchange', () => { hreinsaForskodun(); stada = ''; opin = false; setTimeout(teikna, 60); });
    document.addEventListener('slokk-viewmode', () => setTimeout(teikna, 60));
    new MutationObserver(() => teikna()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-viewmode'] });
    addEventListener('resize', () => teikna());
    // Ódýr púls: teikna() snertir ekkert nema gildi hafi breyst (stærð síðu, haus færst, önnur síða).
    setInterval(teikna, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', raesa);
  else raesa();
  console.log('[patch-531] Zoom-stika efst');
})();
