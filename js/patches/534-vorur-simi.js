/* 534 — Vörur og þjónusta á síma: flokkahausinn læsilegur, ritilglugginn fullbreiður,
 * vörukortin stærri.  (Agnar 27.11.2026, með þremur skjáskotum: „Nokkur atriði sem
 * mætti laga, færa ofar og raða betur, stækka vöru skjainn".)
 *
 * Þrennt var mælt á lifandi síðu 27.11.2026 (390 px, símahamur, vistuð stærð 0,80):
 *
 * 1. FLOKKAHAUSINN („ÞJÓNUSTA 37") er skrifaður í vorur.js sem solid dökk pilla með
 *    hvítum texta.  Á síðunni mældist hann: bakgrunnur horfinn, `padding` 0 (svo
 *    textinn byrjaði við skjábrúnina — það sem Agnar hringaði), letur 19 px Playfair
 *    og liturinn rgb(17,20,28) — næstum svartur ofan á dökku.  Orsökin er ÞRJÁR
 *    vistaðar Stílstjóra-reglur (262, `page_editor_v1_json`, 35 KB af vali Agnars)
 *    sem grípa hausinn á `[style*="text-transform:uppercase"]` og `:has(> span[...])`
 *    og setja `background:transparent!important`.  Þeim er EKKI eytt — þær eru hans
 *    og gilda áfram á tölvu.  Hér er aðeins símalagið sett ofar með hærri sérvirkni
 *    (klasarnir komu í vorur.js í sömu umferð, svo reglan hangir ekki á nth-of-type).
 *
 * 2. RITILGLUGGINN er `max-width:600px` á `document.body` — utan zoomsins.  Í
 *    hermi (390 px) fyllir hann 90 % og lítur vel út, en á símanum hans mældist
 *    hann 61 % af breiddinni: þakið bítur af því að hans tæki teiknar síðuna
 *    breiðari en hermirinn (sama og minnið segir um tölvuútgáfuna á S26).  Þakið er
 *    því tekið af í símaham — þá fyllir glugginn það sem hann hefur, hver sem
 *    breiddin reynist.
 *
 * 3. VÖRUKORTIN eru 178×170 px með 72 px mynd.  Myndin fer í 104 px og textinn
 *    stækkar með; dálkarnir haldast tveir (minmax hækkað í 150 px svo tvídálkurinn
 *    standi líka þegar breiddin er önnur en hermirinn mælir).
 *
 * Auða bilið efst (224 px af engu yfir „Vörur og þjónusta") var EKKI héðan — það var
 * `flex:1 1 280px` á `.page-title__lead` sem varð að hæð þegar 314 snýr hausnum í
 * dálk.  Lagað í 314 sjálfu, svo það gildir á öllum síðum, ekki bara þessari.
 */
(() => {
  'use strict';
  const ID = 't5-vorur-simi';
  if (document.getElementById(ID)) return;

  const M = 'html[data-viewmode="mobile"] ';
  const A = 'body.appmode ';
  // Tvöfaldað id: nógu há sérvirkni til að bera vistuðu Stílstjóra-reglurnar
  // (þær eru `html body #view-vorur#view-vorur …` með !important).
  const V = '#view-vorur#view-vorur ';
  const g = (...bitar) => bitar.map(s => M + V + s + ',' + A + V + s).join(',');

  const css = [
    // ── 1. Flokkahausinn: breiður, dökkur borði með hvítum texta ───────────
    g('#vorur-grid .vorur-flokkahaus') + '{' +
      'display:flex!important;width:100%!important;box-sizing:border-box!important;' +
      'align-items:center!important;gap:10px!important;' +
      'padding:9px 14px!important;margin:0 0 10px!important;' +
      'background:#14171d!important;border:1px solid rgba(255,255,255,.22)!important;' +
      'border-radius:12px!important;box-shadow:0 2px 8px -2px rgba(0,0,0,.4)!important}',
    g('#vorur-grid .vorur-flokkahaus .vorur-flokkanafn') + '{' +
      'font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif!important;' +
      'font-size:14px!important;font-weight:800!important;line-height:1.2!important;' +
      'letter-spacing:.05em!important;text-transform:uppercase!important;' +
      'color:#ffffff!important}',
    g('#vorur-grid .vorur-flokkahaus .vorur-flokkatala') + '{' +
      'font-size:12px!important;font-weight:700!important;color:#ffffff!important;' +
      'background:rgba(255,255,255,.24)!important;padding:2px 9px!important;' +
      'border-radius:10px!important;flex:none!important}',

    // ── 2. Vörukortin stærri ───────────────────────────────────────────────
    g('#vorur-grid .vorur-grid-flokkur') + '{' +
      'grid-template-columns:repeat(auto-fill,minmax(150px,1fr))!important;gap:11px!important}',
    g('#vorur-grid .vorur-kort-mynd') + '{height:104px!important;font-size:30px!important}',
    g('#vorur-grid .vorur-card') + '{padding:11px!important;border-radius:12px!important}',
    g('#vorur-grid .vorur-card .vorur-star') + '{width:30px!important;height:30px!important;line-height:28px!important;font-size:15px!important}'
  ];

  // ── 3. Ritilglugginn: hann situr á <body>, utan #view-vorur ──────────────
  const gluggi = [
    'html[data-viewmode="mobile"] #vorur-modal,body.appmode #vorur-modal' +
      '{padding:8px!important;align-items:flex-start!important}',
    'html[data-viewmode="mobile"] #vorur-modal .vorur-modal-kassi,' +
    'body.appmode #vorur-modal .vorur-modal-kassi' +
      '{max-width:none!important;width:100%!important;' +
      'max-height:calc(100vh - 16px)!important;padding:16px!important;' +
      'border-radius:14px!important;box-sizing:border-box!important}'
  ];

  const st = document.createElement('style');
  st.id = ID;
  st.textContent = css.concat(gluggi).join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
