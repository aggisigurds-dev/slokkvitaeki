/* === ÁRSSKOÐUN SKJÁR: MÁN / TÆKI-SÚLA Í BEINNI LÍNU (342) =================
 *
 * Agnar 2026-08-30 (Skjár, Center Hótel-raðir): navy/rauðu kassarnir í
 * MÁN · Tæki (SLT/BSL/RS) dálknum voru skakktir — 38, 83+44+301, 28+10, 3
 * o.s.frv. sátu ekki í beinni lóðréttri línu.
 *
 * ORSÖK: 153 `_devs` er `display:flex; justify-content:flex-end` með
 * `padding:0 10px` á hverju barni. Fjögur stök (SLT·BSL·RS·ÁÆTL) ruðast
 * út úr 158px dálknum. Flex-end jafnar HÆGRI brúnina, svo VINSTRI brún
 * (navy SLT-kassinn) hliðrast eftir breidd talnanna. Árs-reitir `._yr`
 * (52px í 64px dálki) sátu réttir — tækjatölurnar máluðust ofan á þá.
 *
 * LAUSN: CSS-aðeins, Skjár/Tafla. Fastir reitir, sama padding, nowrap,
 * miðjað, vertical-align. SLT/BSL/RS/ÁÆTL fá jafna grid-braut svo navy
 * og rauðu kassarnir deila x-hniti niður dálkinn. `._yr` og `._mo`
 * miðjaðir í sínum dálkum. Sími-listinn (`._arsm-*`) er ÓSNERTUR.
 *
 * 153/187-reikningur ÓSNERT. Brunahólf ÓSNERT. Banner/Kröfu ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__arsManColAlign342) return;
  window.__arsManColAlign342 = true;

  const STYLE_ID = 'ars-man-col-align-342';
  const P = ':not(#_p342a):not(#_p342b):not(#_p342c):not(#_p342d)';

  function css() {
    const D = 'html[data-viewmode="desktop"] ';
    const T = 'html[data-viewmode="table"] ';
    const W = 'html.ars-wide-table ';
    const V = '#view-arsskodun#view-arsskodun';
    const out = [];
    function both(suffix, decl) {
      out.push(D + V + suffix + P + decl);
      out.push(T + V + suffix + P + decl);
      out.push(W + V + suffix + P + decl);
    }

    /* Tæki-dálkur: nógu breiður fyrir 4×36px brautir, ekki ruðning. */
    both(' col:nth-child(10)', '{width:168px!important;min-width:168px!important}');
    both(' td:has(> ._devs)',
      '{text-align:center!important;vertical-align:middle!important;'
      + 'padding-left:6px!important;padding-right:6px!important;'
      + 'overflow:hidden!important;white-space:nowrap!important}');

    /* Fastir reitir — SLT, BSL, RS, ÁÆTL í sömu x-súlum á hverri röð.
       justify-content:flex-end VAR vandamálið (hægri-jöfnun + breytileg
       talnabreidd = skakkt vinstri-hnit). Grid-brautir hrynja ekki. */
    both(' ._devs',
      '{display:grid!important;grid-template-columns:36px 36px 36px minmax(44px,1fr)!important;'
      + 'justify-content:center!important;justify-items:center!important;'
      + 'align-items:center!important;width:100%!important;max-width:100%!important;'
      + 'gap:0!important;overflow:hidden!important;box-sizing:border-box!important}');
    both(' ._devs>div',
      '{padding:0 2px!important;text-align:center!important;border-left:0!important;'
      + 'min-width:0!important;width:100%!important;box-sizing:border-box!important;'
      + 'white-space:nowrap!important;overflow:hidden!important}');
    both(' ._devs>div.off',
      '{visibility:visible!important;display:block!important}');
    both(' ._devs b',
      '{font-variant-numeric:tabular-nums!important;text-align:center!important;'
      + 'display:block!important;width:100%!important}');
    both(' ._devs i',
      '{display:block!important;text-align:center!important;width:100%!important}');
    both(' ._devs ._estcell',
      '{text-align:right!important;justify-self:stretch!important}');
    both(' ._devs ._estcell b',
      '{text-align:right!important}');
    both(' ._devs ._estcell i',
      '{text-align:right!important}');

    /* Árs-reitir: ein 52px pilla, miðjuð, ekkert auka-skjal hliðrar. */
    both(' td[data-yrcell]',
      '{text-align:center!important;vertical-align:middle!important;'
      + 'padding-left:2px!important;padding-right:2px!important;'
      + 'overflow:hidden!important}');
    both(' ._dd',
      '{display:flex!important;flex-direction:column!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'width:100%!important;margin:0 auto!important;gap:3px!important}');
    both(' a._yr',
      '{width:52px!important;min-width:52px!important;max-width:52px!important;'
      + 'margin:0 auto!important;box-sizing:border-box!important;'
      + 'flex:none!important}');
    both(' span._yr',
      '{width:52px!important;min-width:52px!important;max-width:52px!important;'
      + 'margin:0 auto!important;box-sizing:border-box!important;'
      + 'flex:none!important}');

    /* Mánuður: einn miðjaður reitur, nowrap. */
    both(' tbody td:has(> ._mo)',
      '{text-align:center!important;vertical-align:middle!important;'
      + 'padding-left:4px!important;padding-right:4px!important;'
      + 'white-space:nowrap!important}');
    both(' ._mo',
      '{display:inline-block!important;text-align:center!important;'
      + 'white-space:nowrap!important;min-width:2.6em}');

    return out.join('\n');
  }

  function mount() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  mount();
  document.addEventListener('slokk-viewmode', mount);
  document.addEventListener('DOMContentLoaded', mount);
  [400, 1200].forEach(ms => setTimeout(mount, ms));

  window.ArsManColAlign = { mount, version: '342' };
  console.log('[patch-342] arsskodun skjar man/taeki column align');
})();
/* === END ÁRSSKOÐUN SKJÁR MÁN/TÆKI ALIGN === */
