/* === BORÐINN: HNAPPARNIR AÐ KLUKKUNNI (405, 23.09.2026) ===================
 *
 * Agnar 23.09.2026 (skjáskot með þremur rauðum krossum): „gætir kanski tekið
 * burtu þessa 3 og fært sími, tafla, skjár, og málningarspjaldið að klukkunni".
 *
 * Borðinn (230) á sjálfur aðeins merkið og klukkuna. Fimm hnappar frá fimm
 * skrám höfðu safnast í hann, hver úr sinni átt:
 *   · #_ky-vm-toggle  (166) — 📱 Sími · ▦ Tafla · 🖥 Skjár
 *   · #_pe-btn        (262) — 🎨 Stílstjóri
 *   · #_ad-aibtn      (238) — 🤖 Aðstoðarmaður
 *   · #_dst-btn       (320) — 📐 Tækjarammi
 *   · #pat-launch     (308) — 📮 Póst-röðun
 * Þrír þeir síðustu sátu klemmdir milli eldsins og klukkunnar; þeir eru nú
 * FALDIR Í BORÐANUM. Ekkert er fjarlægt og engri virkni breytt — skrárnar
 * fimm eru ósnertar og hnapparnir lifa annars staðar (t.d. situr 📐 í
 * símastikunni). Vilji Agnar einn þeirra aftur er nóg að taka auðkennið út
 * úr reglunni hér að neðan.
 *
 * AÐEINS CSS — ENGIN FÆRSLA Á HNÚTUM. Fyrsta útgáfa flutti tvo hnappana inn
 * í `.bb-rightwrap` og það var TVÖFALT rangt:
 *   (1) 166:451 og 262:2141 segja BÁÐAR berum orðum að hnapparnir eigi að
 *       sitja í `.bb-face` en EKKI í `.bb-rightwrap` — 314 og mobile.css fela
 *       þá umgjörð í Síma-ham, svo allt sem fer þangað inn hverfur á síma;
 *   (2) eigendurnir setja hnappana sína jafnóðum á sinn stað aftur, svo
 *       færslan varð að slag: MÆLT 156 DOM-breytingar á 4 sekúndum í
 *       borðanum (≈39/s) á móti 0 þegar leiðrétt var (sbr. 388/394).
 * Þess í stað er bilið tekið burt: `.bb-rightwrap` hafði `margin-left:auto`
 * og ýtti klukkunni út á kant, svo sýn-rofinn og spjaldið sátu ein úti á
 * miðju. Nú ber SÝN-ROFINN sjálfvirka bilið og hóparnir þrír standa saman
 * hægra megin: Sími/Tafla/Skjár · 🎨 · klukkan.
 */
(() => {
  if (window.__bordiHnapparInstalled) return;
  window.__bordiHnapparInstalled = true;

  const B = '#bstal-banner';
  const css = [
    /* 1 · þrír hnappar teknir úr borðanum (lifa áfram annars staðar) */
    B + ' #_ad-aibtn,' + B + ' #_dst-btn,' + B + ' #pat-launch{display:none!important}',
    /* 2 · sýn-rofinn tekur við sjálfvirka bilinu … */
    B + ' .bb-face>#_ky-vm-toggle{margin-left:auto!important}',
    /* … og klukku-umgjörðin sleppir því, svo hóparnir standi saman. Sé rofinn
       ekki til (sumar sýnir), heldur gamla röðunin sér óbreytt. */
    B + ' .bb-face:has(>#_ky-vm-toggle)>.bb-rightwrap{margin-left:0!important}',
    B + ' .bb-face:not(:has(>#_ky-vm-toggle)):has(>#_pe-btn)>.bb-rightwrap{margin-left:0!important}',
    B + ' .bb-face:not(:has(>#_ky-vm-toggle))>#_pe-btn{margin-left:auto!important}',
    /* 3 · loft milli spjaldsins og klukkunnar (bb-face gap er 4px) */
    B + ' .bb-face>#_pe-btn{margin-right:10px}'
  ].join('\n');

  function setja() {
    let st = document.getElementById('bordi-hnappar-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'bordi-hnappar-css';
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    }
  }
  setja();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setja);

  console.log('[patch-405] 🔩 Borðinn: þrír hnappar faldir, sýn + stílstjóri að klukkunni');
})();
/* === END BORÐI HNAPPAR === */
