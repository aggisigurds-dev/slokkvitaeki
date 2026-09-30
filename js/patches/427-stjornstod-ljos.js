/* === STJÓRNSTÖÐ — LJÓST · GULL · SVART (427) — 30.09.2026 ==========================================
 *
 * Agnar 30.09 (docs/BEIDNIR.md B37): „auka breiddina á main content í stjórnstöð og mér finnst þessi fjólublái litur
 * skelfilegur … breyta þemainu þarna frekar í the big boss theme, ljóst, gull og svart."
 *
 * 420 málar alla Stjórnstöðina (#stjornstod) DÖKKA með dokktThema() — svart stál, rjómi, gull — og 61 á fjólublátt í
 * súluritinu (Úttektir #8b5cf6) og á „Verk í dag"-spjaldinu. Hér er LJÓSA útgáfan af sama Boss-þema: rjómaplata í
 * stað svarts brunns, svart letur, gull á merkjum og völdum tökkum, málmhausar 420 standa. Fjólublátt → gull,
 * bleikt (Lág-birgðir) → dökkrautt. Þakið 1280 px á meginhlutanum fer — síðan fyllir breiddina.
 *
 * CSS EITT, hleðst á eftir 420 og ber sömu selectora með !important svo síðari reglan vinni. Ekkert snert í 61/420.
 * ============================================================================================ */
(function () {
  'use strict';
  if (window.__stjLjos427) return;
  window.__stjLjos427 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var INK = '#141822', INK2 = '#3a3325', MUTE = '#7a6f5a', GULL = '#8a6410', GULL2 = '#a67f22', LINA = '#e2d8bf';
  var PLATA = 'linear-gradient(180deg,rgba(255,255,255,.75),rgba(120,90,30,.07)),repeating-linear-gradient(108deg,rgba(255,255,255,.55) 0 1px,transparent 1px 4px)';
  var PLATA_BG = '#f3ecdc';
  var PLATA_SK = 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(201,160,74,.35),0 18px 40px -12px rgba(10,14,22,.35),0 2px 6px rgba(10,14,22,.12)';
  var HVITT = '#fff';
  var HVITT_SK = 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.12)';
  var GULLFLOTUR = 'linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.5) 45%,rgba(255,255,255,0) 52%),linear-gradient(180deg,#f3dc95 0%,#d9b25a 14%,#b8892e 46%,#8f6a1c 52%,#a87b1f 74%,#cfa54a 92%,#e8cb7a 100%)';
  var DRAUGUR = 'background:#fff!important;border:1px solid rgba(160,120,40,.5)!important;color:#5a3f07!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.1)!important;text-shadow:none!important';
  var DRAUGUR_HOVER = 'background:#fbf5e6!important;box-shadow:0 0 12px -2px rgba(201,160,74,.45)!important';
  var GULLTAKKI = 'background:' + GULLFLOTUR + '!important;border:1px solid #5a4410!important;border-top-color:#f7e6b8!important;border-bottom-color:#2e2004!important;color:#161513!important;font-weight:800!important;text-shadow:0 1px 0 rgba(255,255,255,.45)!important';
  var MERKI = 'font:700 10.5px ' + MONO + '!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:' + GULL + '!important';
  var GRAENT = '#1f7a45', RAUTT = '#b42318';

  var S = '#view-stjornstod ', C = S + '#cc-main ', P = S + '._sam420 ', K = S + '._vik420 ';
  var rules = [
    // ── breiddin: þakið 1280 px fer, síðan fyllir meginhlutann ──
    C + '> div[style*="max-width:1280px"]{max-width:none!important}',
    C + '{max-width:none!important}',
    S + '.main-panel{max-width:none!important}',

    // ── 420-spjöldin (Dagurinn, Samstilling): rjómaplata, svart letur ──
    S + '._sam420{background-color:' + PLATA_BG + '!important;background-image:' + PLATA + '!important;border-color:#000!important;color:' + INK + '!important;box-shadow:' + PLATA_SK + '!important}',
    S + '._sam420 .sam-merki{color:' + GULL + '!important}',
    P + '.dag-flis{background:' + HVITT + '!important;box-shadow:' + HVITT_SK + '!important;color:' + INK + '!important}',
    P + '.dag-flis:hover{filter:none!important;box-shadow:inset 0 0 0 1px rgba(160,120,40,.55),0 0 18px -6px rgba(201,160,74,.5)!important}',
    P + '.dag-merki{color:' + GULL + '!important}' + P + '.dag-tala{color:' + INK + '!important}' + P + '.dag-undir{color:' + MUTE + '!important}',
    P + '.sam-lina{background:' + HVITT + '!important;box-shadow:' + HVITT_SK + '!important}',
    P + '.sam-txt b,' + P + '.sam-heiti{color:' + INK + '!important}' + P + '.sam-txt span{color:' + MUTE + '!important}' + P + '.sam-txt .sam-stada{color:' + INK2 + '!important}',
    P + '.sam-btn{' + DRAUGUR + '}',
    P + '.sam-btn:hover{' + DRAUGUR_HOVER + '}',
    P + '.sam-btn.malm{' + GULLTAKKI + '}',
    P + '.sam-btn[disabled]{opacity:.45!important}',
    P + '.dag-hreinsun{background:' + HVITT + '!important;box-shadow:' + HVITT_SK + '!important}',
    P + '.dag-hreinsun li{background:#f7f2e6!important}' + P + '.dag-hreinsun li b{color:' + GULL + '!important}',
    P + '.hr-titill{color:' + INK + '!important}' + P + '.hr-ast{color:' + GRAENT + '!important}' + P + '.dag-hreinsun li.aftur .hr-ast{color:' + MUTE + '!important}' + P + '.hr-skil{color:' + INK + '!important}' + P + '.hr-villa{color:' + RAUTT + '!important}',
    // stöðuplötur í hausnum standa (silfur á málmi) — óbreytt

    // ── Vikan: sama ljósa plata, dagarnir hvítir, í dag með gullramma ──
    S + '._vik420{background-color:' + PLATA_BG + '!important;background-image:' + PLATA + '!important;color:' + INK + '!important;box-shadow:' + PLATA_SK + '!important}',
    K + '.vk-dagur{border-color:' + LINA + '!important;background:' + HVITT + '!important;box-shadow:' + HVITT_SK + '!important}',
    K + '.vk-dagur.helgi{background:#f9f6ee!important}',
    K + '.vk-dagur.idag{border-color:rgba(160,120,40,.7)!important;background:linear-gradient(180deg,#fff9e8 0%,#fff 60%)!important;box-shadow:' + HVITT_SK + ',0 0 18px -4px rgba(201,160,74,.55)!important}',
    K + '.vk-dn{color:' + GULL + '!important}' + K + '.vk-dagur.helgi .vk-dn{color:' + MUTE + '!important}',
    K + '.vk-dd{color:' + INK + '!important}',
    K + '.vk-plus{border-color:rgba(160,120,40,.5)!important;background:#fff!important;color:' + GULL + '!important}',
    K + '.vk-plus:hover{background:#fbf5e6!important;box-shadow:0 0 10px rgba(201,160,74,.4)!important}',
    K + '.vk-verk{border-color:' + LINA + '!important;background:#faf6ec!important}',
    K + '.vk-verk:hover{border-color:rgba(160,120,40,.5)!important;background:#fff3d6!important}',
    K + '.vk-timi{color:' + GULL2 + '!important}' + K + '.vk-timi i{color:' + MUTE + '!important}',
    K + '.vk-nafn{color:' + INK + '!important}' + K + '.vk-ath{color:' + MUTE + '!important}' + K + '.vk-autt{color:#9a8f78!important}',
    K + '.vk-nota{border-color:rgba(160,120,40,.45)!important;color:' + INK2 + '!important;background:#fffdf7!important}',
    K + '.vk-skyring{color:' + MUTE + '!important}',
    K + '.vk-gull{' + GULLTAKKI + '}',

    // ── 61 lykiltölur: hvít spjöld, gullmerki, svört Playfair-tala; fjólublátt → gull, bleikt → dökkrautt ──
    C + 'div[style*="minmax(220px"]>div{background:' + HVITT + '!important;box-shadow:' + HVITT_SK + '!important;border-left-width:4px!important}',
    C + 'div[style*="minmax(220px"]>div[style*="#8b5cf6"]{border-left-color:#c9a54a!important}',
    C + 'div[style*="minmax(220px"]>div[style*="#ec4899"]{border-left-color:#8a2020!important}',
    C + 'div[style*="minmax(220px"]>div>div:first-child>div:last-child{' + MERKI + '}',
    C + 'div[style*="minmax(220px"]>div>div:nth-child(2){color:' + INK + '!important}',
    C + 'div[style*="minmax(220px"]>div>div:nth-child(3){color:' + MUTE + '!important}',

    // ── 61 hlutar (línurit, sundurliðun, listar) ──
    S + '.cc-section{background-color:' + PLATA_BG + '!important;background-image:' + PLATA + '!important;color:' + INK + '!important;box-shadow:' + PLATA_SK + '!important}',
    S + '.cc-section h3{color:' + GULL + '!important}',
    S + '.cc-row{border-bottom-color:' + LINA + '!important}' + S + '.cc-row strong{color:' + INK + '!important}',
    S + '.cc-empty{color:' + MUTE + '!important}',
    S + '.cc-section .btn{' + DRAUGUR + '}' + S + '.cc-section .btn:hover{' + DRAUGUR_HOVER + '}',
    C + '[style*="color:#64748b"],' + C + '[style*="color:#94a3b8"],' + C + '[style*="color:#475569"]{color:' + MUTE + '!important}',
    C + '[style*="color:#dc2626"]{color:' + RAUTT + '!important}',
    C + '[style*="color:#ec4899"]{color:#8a2020!important}',
    // línurit: fjólubláu súlurnar og skýringin → gull
    S + '.cc-stack>div[style*="#8b5cf6"],' + S + '.cc-leg i[style*="#8b5cf6"],' + S + '.cc-detail-h i[style*="#8b5cf6"],' + S + '.cc-dd-row i[style*="#8b5cf6"]{background:#c9a54a!important}',
    S + '.cc-chart-col:hover{background:rgba(201,160,74,.12)!important}' + S + '.cc-chart-col.cc-col-sel{background:rgba(201,160,74,.22)!important}',
    S + '.cc-stack .cc-zero{background:' + LINA + '!important}',
    S + '.cc-stack.cc-today{box-shadow:0 0 0 2px rgba(160,120,40,.6),0 0 12px rgba(201,160,74,.45)!important}',
    S + '.cc-chart-val,' + S + '.cc-chart-day,' + S + '.cc-chart-date{color:' + INK2 + '!important}',
    S + '.cc-legend{border-top-color:' + LINA + '!important}',
    S + '.cc-leg{' + DRAUGUR + '}' + S + '.cc-leg.on{' + GULLTAKKI + '}',
    // í dag-ræma, sundurliðun
    S + '.cc-today-strip{background:rgba(255,255,255,.55)!important;border-color:' + LINA + '!important}',
    S + '.cc-today-lbl{' + MERKI + '}',
    S + '.cc-today-cell{background:' + HVITT + '!important;border-color:' + LINA + '!important;box-shadow:' + HVITT_SK + '!important}',
    S + '.cc-today-cell span{color:' + MUTE + '!important}' + S + '.cc-today-cell b{color:' + INK + '!important}',
    S + '.cc-today-cell.cc-tc-sum{background:#eef8f1!important;border-color:rgba(31,122,69,.4)!important}' + S + '.cc-today-cell.cc-tc-sum b{color:' + GRAENT + '!important}',
    S + '.cc-today-cell.cc-tc-muted b{color:' + GULL + '!important}',
    S + '.cc-detail{background:' + HVITT + '!important;border-color:' + LINA + '!important}' + S + '.cc-detail-hint{background:transparent!important;color:' + MUTE + '!important}',
    S + '.cc-detail-h{color:' + INK2 + '!important}' + S + '.cc-detail-big{color:' + GRAENT + '!important}' + S + '.cc-detail-sub{color:' + MUTE + '!important}',
    S + '.cc-dd-row span{color:' + INK2 + '!important}' + S + '.cc-dd-tot{border-top-color:' + LINA + '!important}' + S + '.cc-dd-tot b{color:' + GRAENT + '!important}',
    S + '.cc-bd-grp{color:' + GULL + '!important}' + S + '.cc-bd-grp span{color:' + MUTE + '!important}',
    S + '.cc-per-btn{' + DRAUGUR + '}' + S + '.cc-per-btn.on{' + GULLTAKKI + '}',
    S + '.cc-bd-row.sub{color:' + MUTE + '!important}' + S + '.cc-bd-row.sub b{color:' + INK2 + '!important}' + S + '.cc-bd-row.strong.big b{color:' + GRAENT + '!important}',
    S + '.cc-bd-row.strong{color:' + INK + '!important}' + S + '.cc-bd{color:' + INK + '!important}',
    S + '.cc-bd-div{background:' + LINA + '!important}',
    S + '.cc-bd-note{background:#fff8e6!important;border-color:rgba(160,120,40,.45)!important;color:#5a3f07!important}',
    // kveðjan efst: undirlínan (dagsetning) er ljósgrá 61 — svört á ljósum bakgrunni síðunnar
    C + '> div > div:first-child > div{color:#d5dbe6!important;font-family:' + MONO + '!important;font-size:12px!important}'
  ];
  var st = document.createElement('style');
  st.id = 'bstal-427';
  st.textContent = rules.join('\n');
  document.head.appendChild(st);
})();
/* === END 427 === */
