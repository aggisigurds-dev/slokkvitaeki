/* === VÖRUR OG ÞJÓNUSTA Í MIÐAKERFINU (398) — 22.09.2026 ===
 *
 * Agnar: „vörur og þjónusta, má skipuleggja eitthvað betur" og síðar „And can
 * you upgrade the layout a bit for vorur og þjonusta".
 *
 * Síðan er LJÓS áfram og vöru-myndirnar eru ÓBREYTTAR — það var skilyrðið
 * („vill halda vöru iconunum eins og þau eru"). Það sem breytist er umgjörðin:
 *
 *   • Flísar verða ferkantaðar (2 px) með stálbrún í stað ávalra skugga-korta.
 *     Litaði vinstri kanturinn á myndinni (tegundarliturinn úr js/vorur.js)
 *     stendur óhreyfður — hann er merkingin, ekki skrautið.
 *   • Verðið í Playfair og „án vsk" í einbreiðu letri, eins og alls staðar annars
 *     staðar; nafnið í IBM Plex 600.
 *   • Merkin (Þjónusta · aðrar vörur · ÓVIRKT) verða ferkantaðar smáflísar í
 *     einbreiðu letri; ÓVIRKT fær rauðan málm því það er upplýsing sem má ekki
 *     hverfa í bleikan pastel.
 *   • Flipar og flokkar: silfur, ferkantað, valið í málmi.
 *   • Flokkahausinn („ÞJÓNUSTA 21") var svartur bjöllu-hnappur; verður Playfair
 *     fyrirsögn með hárlínu og fjöldanum í einbreiðu letri.
 *
 * js/vorur.js er EKKI snert — allt hér er stílblað ofan á. Kortin bera inline
 * stíla (og setja borderColor við hover), svo reglurnar þurfa !important.
 */
(() => {
  if (window.__vorurMidar398) return;
  window.__vorurMidar398 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const GREEN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  const GOLD = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';

  function css() {
    // Tvöfaldað auðkenni: þemað skrifar `html[data-thm-preset="brunastal"] #view-vorur
    // .vorur-card{border-radius:14px!important}` og sló einfalda selectorinn út (mælt 16 px).
    const V = 'html body #view-vorur#view-vorur ';
    const K = V + '.vorur-card';
    return [
      // ── Flísin ───────────────────────────────────────────────────────────
      K + '{border-radius:2px!important;border:1px solid rgba(20,24,34,.14)!important;padding:10px!important;box-shadow:0 1px 1px rgba(15,20,30,.05)!important}',
      K + ':hover{border-color:rgba(20,24,34,.30)!important;box-shadow:0 10px 22px -16px rgba(15,20,30,.55)!important}',
      // Myndin sjálf óbreytt — aðeins hornin ferkantuð svo hún falli að flísinni.
      K + '>img,' + K + '>div[style*="height:72px"]{border-radius:2px!important}',

      // Merkin: ferkantaðar smáflísar í einbreiðu letri.
      K + ' span[style*="border-radius:12px"]{border-radius:2px!important;font-family:' + MONO + '!important;font-size:9.5px!important;letter-spacing:.06em!important;text-transform:uppercase!important;padding:3px 6px!important}',
      // ÓVIRKT: rauður málmur — þetta er ástæða þess að varan birtist ekki í Sölu.
      K + ' span[style*="#fee2e2"]{background-image:' + RED + '!important;background-color:#2a0506!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',

      // Nafn · lýsing · verð.
      K + '>div>div:nth-child(2){font-family:' + SANS + '!important;font-size:13px!important;font-weight:600!important;color:#1f2530!important}',
      K + '>div>div:nth-child(3){color:#8a93a3!important;font-size:11px!important}',
      K + '>div>div:last-child>div>div:first-child{font-family:' + DISPLAY + '!important;font-weight:800!important;font-size:18px!important;letter-spacing:-.02em!important;font-variant-numeric:lining-nums tabular-nums!important;color:#11141c!important}',
      K + '>div>div:last-child>div>div:last-child{font-family:' + MONO + '!important;font-size:10px!important;color:#8a93a3!important}',
      K + '>div>div:last-child>div:last-child{font-family:' + MONO + '!important;font-size:10.5px!important;color:#6b7483!important}',

      // Stjarnan: ferköntuð, gull þegar varan er á söluforsíðunni.
      V + '.vorur-star{border-radius:2px!important;width:24px!important;height:24px!important;line-height:22px!important;border:1px solid rgba(20,24,34,.16)!important;box-shadow:none!important}',
      // „Á söluforsíðu": gullin stjarna og gullbrún — ekki gylltur kubbur.
      // (Fyrsta útgáfan fyllti takkann með málmi og hann las sem borði á myndinni.)
      V + '.vorur-star[title*="taka af"]{background:#fffdf5!important;border-color:#b8912f!important;color:#8a6410!important;box-shadow:inset 0 0 0 1px rgba(184,145,47,.35)!important}',

      // ── Flipar (Allt · Vörur · Þjónusta) ────────────────────────────────
      V + '.vorur-tab{border-radius:2px!important;border:1px solid rgba(20,24,34,.18)!important;background:' + SILVER + '!important;color:#3a4250!important;font:600 12.5px ' + SANS + '!important;padding:8px 14px!important}',
      V + '.vorur-tab.is-active{background-image:' + STRIPE + METAL + '!important;border-color:#000!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',

      // ── Flokkar ─────────────────────────────────────────────────────────
      V + '.vorur-cat{border-radius:2px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;color:#3a4250!important;font:600 12px ' + SANS + '!important}',
      V + '.vorur-cat span,' + V + '.vorur-cat b{font-family:' + MONO + '!important;font-weight:700!important;font-size:10.5px!important;color:#6b7483!important}',
      V + '.vorur-cat.is-active,' + V + '.vorur-cat[aria-pressed="true"]{background-image:' + STRIPE + METAL + '!important;border-color:#000!important;color:#fff!important}',
      V + '.vorur-cat.is-active span,' + V + '.vorur-cat[aria-pressed="true"] span{color:rgba(255,255,255,.8)!important}',

      // ── Flokkahaus („ÞJÓNUSTA 21") ──────────────────────────────────────
      // Svarti hnappurinn verður fyrirsögn: Playfair + hárlína þvert yfir.
      // Hausinn er dökkur hnappur í 170. línu js/vorur.js; hér verður hann
      // fyrirsögn á síðunni sjálfri: gagnsær flötur, Playfair-texti og hárlína.
      V + 'div:has(>span[style*="text-transform:uppercase"][style*="font-weight:800"]){background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;box-shadow:none!important;border-bottom:1px solid rgba(20,24,34,.16)!important;margin:6px 0 10px!important;display:flex!important;align-items:baseline!important;gap:10px!important;padding-bottom:7px!important}',
      V + 'span[style*="text-transform:uppercase"][style*="font-weight:800"]{font-family:' + DISPLAY + '!important;font-weight:800!important;font-size:19px!important;letter-spacing:-.01em!important;text-transform:none!important;color:#11141c!important;text-shadow:none!important}',
      V + 'div:has(>span[style*="text-transform:uppercase"][style*="font-weight:800"])>span:not([style*="text-transform:uppercase"]){font-family:' + MONO + '!important;font-size:11px!important;font-weight:700!important;color:#6b7483!important;background:transparent!important;border:0!important;padding:0!important}',

      // ── Hausinn og „+ Ný vara/þjónusta" ────────────────────────────────
      V + '.page-title h1{font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.02em!important}',
      V + '.page-title p{font-family:' + MONO + '!important;font-size:12px!important}',
      V + '.page-title__tools button:first-child{background-image:' + STRIPE + GREEN + '!important;border:1px solid rgba(52,168,98,.45)!important;border-radius:3px!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important;font-family:' + SANS + '!important;font-weight:700!important}',
    ].join('\n');
  }

  function inject() {
    let st = document.getElementById('_vorurmidar-css');
    if (!st) {
      st = document.createElement('style');
      st.id = '_vorurmidar-css';
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = css();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  console.log('[398] Vörur og þjónusta í Miðakerfinu');
})();
/* === END VÖRUR OG ÞJÓNUSTA === */
