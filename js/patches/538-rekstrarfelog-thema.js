/* === REKSTRARFÉLÖG · BRUNAHÓLF V2 OG V4 ÚTLIT v1 (28.11.2026) ===
 *
 * Agnar 28.11.2026: „setja sama þema í rekstrarfélag, brunahólf v2 premium design system" · „geturðu sett þetta í bæði brunahólf
 * v2 og v4" · mockup „kanski sirka svona" (navy haus + flipar með appelsínugulri undirlínu, ljós flötur, hvít tölulína og
 * síustika, tafla með navy haus, appelsínugulur aðgerðatakki).
 *
 * UMFANG: aðeins Rekstrarfélög-síðan (#view-rekstrarfelog, 175). Boss-útlitið er ósnert: allt hér gildir aðeins undir
 * #view-rekstrarfelog[data-rf-thema="bh2"|"v4"], svo án merkisins sést nákvæmlega sama síða og áður.
 *
 * VAL: sama og á Þjónustuborðinu (507) — thjonustubord5.by_staff.<nafn>.thema = 'bh2' | 'v4' | 'boss', eins á öllum vélum.
 * Rofinn [Boss | V2 | V4] stendur í hnappalínunni undir fyrirsögninni og skrifar á nafn þess sem er við tölvuna (507.skipta).
 * Tókenar: Brunahólf V2 (507: navy #0b2d5f/#02193c, appelsínugult #ff6702, grunnur #e9f0fa, Poppins) og Brunahólf V4 (535:
 * djúpur navy #07152f, glerspjöld, ljósblek, appelsínugult gler).
 */
(() => {
  if (window.RfThema) return;

  const ID = 'view-rekstrarfelog';
  const nafn = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const utgafa = () => { try { return window.ThbThemaBh2 ? ThbThemaBh2.utgafa(nafn()) : ''; } catch (_) { return ''; } };

  const R = '#' + ID + '[data-rf-thema="bh2"] ';
  const D = '#' + ID + '[data-rf-thema="v4"] ';

  // ── V2 tókenar (507) ──────────────────────────────────────────────────────────────────────────────────────────
  const SH = '0 1px 2px rgba(2,25,60,.06),0 8px 24px rgba(2,25,60,.08)';
  const RING = 'inset 0 0 0 1px #d8dee9';
  const APP = 'linear-gradient(180deg,#ff8a1f,#ff6702 55%,#ec5300)';
  const GLOD = '0 6px 16px rgba(255,103,2,.35)';
  const NAVY = 'linear-gradient(110deg,#02193c,#0b2d5f 62%,#12417f)';
  const BANNER = 'radial-gradient(50% 130% at 72% -10%,rgba(70,150,235,.30),transparent 62%),radial-gradient(40% 120% at 100% 100%,rgba(255,120,30,.14),transparent 60%),linear-gradient(rgba(1,16,44,.34),rgba(1,16,44,.34)),url(/img/rekstrarfelog-bakgrunnur.webp) center 38%/cover no-repeat';   // bláteikning af húsi á dökkum navy (banner frá Agnari 28.11.2026) + dýpri litur („aðeins dýpri litir“)
  const FONT = 'Poppins,system-ui,-apple-system,"Segoe UI",sans-serif';
  // ── V4 tókenar (535) ──────────────────────────────────────────────────────────────────────────────────────────
  const GLER = 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 36%),linear-gradient(180deg,#0f2b52,#081a36)';
  const SH4 = 'inset 0 1px 0 rgba(255,255,255,.22),inset 0 0 0 1px rgba(150,185,235,.26),inset 0 -2px 0 rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.7),0 18px 30px -16px rgba(0,0,0,.95)';
  const WELL4 = 'inset 0 2px 6px rgba(0,0,0,.8),inset 0 0 0 1px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.08)';
  const APP4 = 'linear-gradient(180deg,#ffa756 0%,#ff6702 48%,#e25000 52%,#f06a14 100%)';
  const GLOD4 = 'inset 0 1px 0 rgba(255,240,220,.8),inset 0 -2px 3px rgba(120,30,0,.45),0 0 0 1px rgba(130,40,0,.85),0 10px 20px -8px rgba(255,103,2,.95)';
  const LINE4 = 'rgba(150,185,235,.16)';

  // Byggingar-flipinn (28.11.2026): markupið (titill + „Bæta við“, tölulína, síustika, tafla) kemur úr 175 (e1570621) í réttri röð eftir
  // mockupinu — hér er aðeins útlitið: tölulínan verður EITT spjald með skilum milli reita. card = flötur hennar, line = skilin,
  // head = litur titils, mut = daufur texti (skýringar og tómt ástand).
  function flipi(X, card, line, head, mut, emptyBg) {
    return [
      X + '.rf-build-head{margin:0 0 14px}',
      X + '.rf-build-title{color:' + head + '!important;font-family:Poppins,system-ui,sans-serif!important;font-weight:700!important}',
      X + '.rf-stats{display:flex!important;gap:0!important;margin:0 0 14px!important;background:' + card + '!important;border-radius:12px!important;overflow:hidden}',
      X + '.rf-stat{flex:1 1 0;background:transparent!important;background-image:none!important;box-shadow:none!important;border:0!important;border-right:1px solid ' + line + '!important;border-radius:0!important;margin:0!important}',
      X + '.rf-stat:last-child{border-right:0!important}',
      X + '.rf-build-empty{background:' + emptyBg + '!important;color:' + mut + '!important}',
      X + '.rf-build-empty strong{color:' + head + '!important}',
      X + '.rf-build-empty svg{stroke:' + mut + '!important}',
      X + '.rf-build-key,' + X + '.rf-build-key summary{color:' + mut + '!important}',
    ];
  }

  // Ljómi úr mockupinu (28.11.2026, „settu líka glow effectin“): appelsínugul lína með ljóma undir hausnum, glóandi undirlína á virka
  // flipanum, ljómi á merki og á lóðrétta skiltinu milli dálka, og útlína á „Opna gátt“. Aðeins box-shadow/filter — engin hreyfing.
  function ljomi(X) {
    return [
      X + '._rf_profilhaus{box-shadow:inset 0 2px 0 #ff6702,inset 0 14px 22px -12px rgba(255,103,2,.65)!important}',
      X + '._rfh_logo{box-shadow:inset 0 0 0 1px rgba(255,255,255,.24),inset 0 0 16px -4px rgba(255,138,31,.35),0 0 22px -6px rgba(255,138,31,.6)!important}',
      X + '._rfh_logo svg{stroke:#ffb37a!important;filter:drop-shadow(0 0 6px rgba(255,138,31,.85))}',
      X + '._rfh_samningur{position:relative}',
      X + '._rfh_samningur::before{content:"";position:absolute;left:0;top:16%;bottom:16%;width:2px;border-radius:2px;background:linear-gradient(180deg,rgba(255,103,2,0),#ff6702 30%,#ff8a1f 70%,rgba(255,103,2,0));box-shadow:0 0 12px 1px rgba(255,103,2,.7);pointer-events:none}',
      X + '._rfh_gbtn{box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 0 16px -4px rgba(130,185,255,.55)!important}',
      X + '._rf_tabs{box-shadow:inset 0 -1px 0 rgba(255,103,2,.4)!important}',
      X + '._rf_tabs button.is-active{background:linear-gradient(180deg,rgba(255,103,2,0),rgba(255,103,2,.16))!important;box-shadow:inset 0 -3px 0 #ff6702,0 8px 16px -6px rgba(255,103,2,.85)!important}',
      X + '._rf_tabs button.is-active svg{stroke:#ff8a1f!important;color:#ff8a1f!important;filter:drop-shadow(0 0 6px rgba(255,138,31,.8))}',
    ];
  }

  function css() {
    return [
      // ════════════════════════════════ V2 (ljóst: navy + appelsínugult) ════════════════════════════════
      R + '{background:#e9f0fa!important;background-image:none!important}',
      R + '.rf-page,' + R + '.rf-page *:not(svg):not(path):not(circle):not(rect):not(i){font-family:' + FONT + '!important}',
      R + '.rf-ptitle{color:#101e43!important;font-weight:700!important;letter-spacing:-.01em!important;text-shadow:none!important}',
      R + '.rf-psub{color:#5a6882!important}',
      R + '.rf-btn{background:#fff!important;background-image:none!important;color:#101e43!important;border:0!important;border-radius:10px!important;box-shadow:' + RING + ',0 1px 2px rgba(2,25,60,.06)!important;text-shadow:none!important;font-weight:600!important}',
      R + '.rf-btn:hover{background:#f6f9fd!important}',
      R + '.rf-btn.is-on{background:#0b2d5f!important;color:#fff!important;box-shadow:none!important}',
      R + '#_rf_add{background:' + APP + '!important;color:#fff!important;box-shadow:' + GLOD + '!important}',
      R + '.rf-search{background:#fff!important;border-radius:10px!important;box-shadow:' + RING + '!important;border:0!important}',
      R + '.rf-search input{color:#101e43!important}',
      // Haus félagsins (spjaldið sem opnast): navy flötur, hvítt letur.
      R + '.rfa{border-radius:14px!important;box-shadow:' + SH + '!important;overflow:hidden}',
      R + '.rfa__head{background:linear-gradient(90deg,rgba(2,25,60,.55) 0%,rgba(2,25,60,.12) 60%,rgba(2,25,60,0) 100%),' + BANNER + ',#02193c!important;box-shadow:none!important}',
      R + '.rfa__logo{background:rgba(255,255,255,.08)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)!important;color:#fff!important}',
      R + '.rfa__name{color:#fff!important;font-weight:700!important}',
      R + '.rfa__sub{color:#c9d3e3!important}',
      R + '.rf-pill--ghost{background:rgba(255,255,255,.1)!important;color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)!important;text-shadow:none!important}',
      R + '.rf-pill--bru,' + R + '.rf-pill--overdue{background:#fee2de!important;background-image:none!important;color:#b91c1c!important;box-shadow:none!important;text-shadow:none!important;border:0!important}',
      R + '.rf-pill--pending{background:#feecd2!important;background-image:none!important;color:#9a3412!important;box-shadow:none!important;text-shadow:none!important;border:0!important}',
      R + '.rf-pill--done{background:#ddfada!important;background-image:none!important;color:#166534!important;box-shadow:none!important;text-shadow:none!important;border:0!important}',
      R + '.rfa__chev{background:rgba(255,255,255,.1)!important;color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)!important}',
      R + '._rf_profilhaus{background:linear-gradient(90deg,rgba(2,25,60,.55) 0%,rgba(2,25,60,.12) 60%,rgba(2,25,60,0) 100%),' + BANNER + ',#02193c!important;box-shadow:inset 0 2px 0 #ff6702!important}',
      R + '._rf_tabs{background:#02193c!important;background-image:none!important;box-shadow:none!important}',
      R + '._rf_tabs button{color:#c9d3e3!important;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;font-weight:600!important}',
      R + '._rf_tabs button.is-active{color:#fff!important;box-shadow:inset 0 -3px 0 #ff6702!important}',
      R + '._rf_tabs button:hover{color:#fff!important}',
      // Innihald: ljós flötur, hvít spjöld.
      R + '.rfa__body,' + R + '._rf_body{background:#f6f3ee!important}',
      R + '._rf_note{background:#fff!important;color:#101e43!important;box-shadow:' + RING + '!important;border:0!important;border-radius:10px!important}',
      R + '.rf-gold{background:#fff!important;background-image:none!important;color:#101e43!important;border:0!important;box-shadow:' + SH + '!important;text-shadow:none!important}',
      R + '.rf-gold__l{color:#c2410c!important}',
      R + '.rf-gold__v{color:#101e43!important}',
      R + '.rf-gold__s{color:#5a6882!important}',
      R + '.rf-svcbar{background:#fff!important;background-image:none!important;border:0!important;box-shadow:' + SH + '!important;border-radius:12px!important}',
      R + '.rf-svclab{color:#5a6882!important}',
      R + '.rf-svcbtn{background:#fff!important;background-image:none!important;color:#101e43!important;border:0!important;box-shadow:' + RING + '!important;text-shadow:none!important;border-radius:999px!important;font-weight:600!important}',
      R + '.rf-svcbtn.is-on{background:#0b2d5f!important;color:#fff!important;box-shadow:none!important}',
      R + '.rf-bsearch{background:#fff!important;box-shadow:' + RING + '!important;border:0!important;border-radius:10px!important}',
      R + '.rf-bsearch input{color:#101e43!important}',
      // Tölulínan: fjögur hvít spjöld með lituðum borða efst (í stað fjögurra málmspjalda).
      R + '.rf-stat{background:#fff!important;background-image:none!important;color:#101e43!important;border:0!important;box-shadow:' + SH + '!important;text-shadow:none!important;border-top:3px solid #0b2d5f!important}',
      R + '.rf-stat--sl{border-top-color:#2f6fe4!important}',
      R + '.rf-stat--br{border-top-color:#dc2626!important}',
      R + '.rf-stat--od{border-top-color:#ff6702!important}',
      R + '.rf-stat__l{color:#5a6882!important;text-shadow:none!important}',
      R + '.rf-stat__v{color:#101e43!important;text-shadow:none!important}',
      R + '.rf-stat__s{color:#5a6882!important}',
      // Taflan.
      R + '.rf-tblwrap{background:#fff!important;border:0!important;box-shadow:' + SH + '!important;border-radius:12px!important;overflow:hidden}',
      R + '.rf-tbl thead th{background:#0b2d5f!important;background-image:none!important;color:#fff!important;text-shadow:none!important;border-color:#0b2d5f!important}',
      R + '.rf-tbl tbody tr:nth-child(even) td{background:#fff!important}',
      R + '.rf-tbl tbody tr:hover td{background:#f6f9fd!important}',
      R + '.rf-tbl td{border-color:#e7ecf3!important}',
      R + '.rf-tblfoot{background:#f6f9fd!important;color:#5a6882!important;border-color:#e7ecf3!important}',
      R + '._rf_addb{background:#fff!important;background-image:none!important;color:#c2410c!important;border:0!important;box-shadow:inset 0 0 0 1px #ff6702!important;border-radius:10px!important;font-weight:600!important}',
      R + '._rf_addb:hover{background:#fff4ea!important}',
      // Rofinn [Boss | V2 | V4]
      '#' + ID + ' .rf-thema{display:inline-flex;border-radius:10px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(120,130,150,.5);vertical-align:middle;margin-right:8px}',
      '#' + ID + ' .rf-thema button{border:0;background:rgba(255,255,255,.9);color:#101e43;font:600 12px/1 Poppins,system-ui,sans-serif;padding:9px 12px;cursor:pointer}',
      '#' + ID + ' .rf-thema button+button{box-shadow:inset 1px 0 0 rgba(120,130,150,.35)}',
      '#' + ID + ' .rf-thema button[aria-pressed="true"]{background:#ff6702;color:#fff}',

      // ════════════════════════════════ V4 (dökkt: navy-gler + appelsínugult) ════════════════════════════════
      D + '{background:radial-gradient(90% 40% at 50% 0%,rgba(70,130,210,.28),transparent 70%),#07152f!important}',
      D + '.rf-page,' + D + '.rf-page *:not(svg):not(path):not(circle):not(rect):not(i){font-family:' + FONT + '!important}',
      D + '.rf-ptitle{color:#fff!important;font-weight:700!important;text-shadow:none!important}',
      D + '.rf-psub{color:#a9b8d0!important}',
      D + '.rf-btn{background:' + GLER + '!important;color:#dbe6f6!important;border:0!important;border-radius:10px!important;box-shadow:' + SH4 + '!important;text-shadow:0 1px 0 rgba(0,0,0,.5)!important;font-weight:600!important}',
      D + '.rf-btn:hover{color:#fff!important;filter:brightness(1.12)}',
      D + '.rf-btn.is-on{background:rgba(255,103,2,.18)!important;color:#ffb37a!important;box-shadow:inset 0 0 0 1px rgba(255,138,31,.6)!important}',
      D + '#_rf_add{background:' + APP4 + '!important;color:#fff!important;box-shadow:' + GLOD4 + '!important}',
      D + '.rf-search{background:rgba(0,8,22,.45)!important;border-radius:10px!important;box-shadow:' + WELL4 + '!important;border:0!important}',
      D + '.rf-search input,' + D + '.rf-bsearch input{color:#fff!important}',
      D + '.rfa{border-radius:14px!important;box-shadow:' + SH4 + '!important;overflow:hidden;background:#081a36!important}',
      D + '.rfa__head{background:linear-gradient(90deg,rgba(6,18,42,.6) 0%,rgba(6,18,42,.15) 60%,rgba(6,18,42,0) 100%),' + BANNER + ',#06122a!important;box-shadow:none!important}',
      D + '.rfa__logo{background:linear-gradient(180deg,#1d4479,#10305c)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(0,0,0,.65)!important;color:#fff!important}',
      D + '.rfa__name{color:#fff!important;font-weight:700!important}',
      D + '.rfa__sub{color:#a9b8d0!important}',
      D + '.rf-pill--ghost{background:rgba(47,111,228,.2)!important;color:#a9c5ff!important;box-shadow:inset 0 0 0 1px rgba(91,143,240,.6)!important;text-shadow:none!important}',
      D + '.rf-pill--bru,' + D + '.rf-pill--overdue{background:rgba(220,38,38,.18)!important;background-image:none!important;color:#ffaaa3!important;box-shadow:inset 0 0 0 1px rgba(248,113,113,.6)!important;text-shadow:none!important;border:0!important}',
      D + '.rf-pill--pending{background:rgba(242,193,78,.16)!important;background-image:none!important;color:#f8d98d!important;box-shadow:inset 0 0 0 1px rgba(242,193,78,.55)!important;text-shadow:none!important;border:0!important}',
      D + '.rf-pill--done{background:rgba(22,163,74,.18)!important;background-image:none!important;color:#86efac!important;box-shadow:inset 0 0 0 1px rgba(74,222,128,.5)!important;text-shadow:none!important;border:0!important}',
      D + '.rfa__chev{background:rgba(255,255,255,.08)!important;color:#dbe6f6!important;box-shadow:inset 0 0 0 1px rgba(150,185,235,.3)!important}',
      D + '._rf_profilhaus{background:linear-gradient(90deg,rgba(6,18,42,.6) 0%,rgba(6,18,42,.15) 60%,rgba(6,18,42,0) 100%),' + BANNER + ',#06122a!important;box-shadow:inset 0 2px 0 #ff6702!important}',
      D + '._rf_tabs{background:#06122a!important;background-image:none!important;box-shadow:inset 0 1px 0 rgba(0,0,0,.5)!important}',
      D + '._rf_tabs button{color:#a9b8d0!important;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;font-weight:600!important}',
      D + '._rf_tabs button.is-active{color:#fff!important;box-shadow:inset 0 -3px 0 #ff6702!important}',
      D + '._rf_tabs button:hover{color:#fff!important}',
      D + '.rfa__body,' + D + '._rf_body{background:#081a36!important}',
      D + '._rf_note{background:rgba(0,8,22,.45)!important;color:#dbe6f6!important;box-shadow:' + WELL4 + '!important;border:0!important;border-radius:10px!important}',
      D + '.rf-gold{background:' + GLER + '!important;color:#fff!important;border:0!important;box-shadow:' + SH4 + '!important;text-shadow:none!important}',
      D + '.rf-gold__l{color:#ffb37a!important}',
      D + '.rf-gold__v{color:#fff!important}',
      D + '.rf-gold__s{color:#a9b8d0!important}',
      D + '._rf_tab_bygg>div:first-child{color:#a9b8d0!important}',
      D + '.rf-svcbar{background:rgba(0,8,22,.4)!important;background-image:none!important;border:0!important;box-shadow:' + WELL4 + '!important;border-radius:12px!important}',
      D + '.rf-svclab,' + D + '.rf-leg{color:#a9b8d0!important}',
      D + '.rf-svcbtn{background:' + GLER + '!important;color:#dbe6f6!important;border:0!important;box-shadow:' + SH4 + '!important;text-shadow:0 1px 0 rgba(0,0,0,.5)!important;border-radius:999px!important;font-weight:600!important}',
      D + '.rf-svcbtn.is-on{background:rgba(255,103,2,.18)!important;color:#ffb37a!important;box-shadow:inset 0 0 0 1px rgba(255,138,31,.6)!important}',
      D + '.rf-bsearch{background:rgba(0,8,22,.45)!important;box-shadow:' + WELL4 + '!important;border:0!important;border-radius:10px!important}',
      D + '.rf-stat{background:' + GLER + '!important;color:#fff!important;border:0!important;box-shadow:' + SH4 + '!important;text-shadow:none!important;border-top:3px solid #5b8ff0!important}',
      D + '.rf-stat--sl{border-top-color:#5b8ff0!important}',
      D + '.rf-stat--br{border-top-color:#f87171!important}',
      D + '.rf-stat--od{border-top-color:#ff8a1f!important}',
      D + '.rf-stat__l{color:#a9b8d0!important;text-shadow:none!important}',
      D + '.rf-stat__v{color:#fff!important;text-shadow:none!important}',
      D + '.rf-stat__s{color:#a9b8d0!important}',
      D + '.rf-tblwrap{background:rgba(0,8,22,.35)!important;border:0!important;box-shadow:' + SH4 + '!important;border-radius:12px!important;overflow:hidden}',
      D + '.rf-tbl thead th{background:#0a2147!important;background-image:none!important;color:#dbe6f6!important;text-shadow:none!important;border-color:' + LINE4 + '!important}',
      D + '.rf-tbl td{background:transparent!important;color:#dbe6f6!important;border-color:' + LINE4 + '!important}',
      D + '.rf-tbl{background:transparent!important}',
      D + '.rf-tbl tbody tr{background:transparent!important}',
      D + '.rf-tbl tbody tr:nth-child(even){background:rgba(255,255,255,.03)!important}',
      D + '.rf-tbl tbody tr:hover{background:rgba(91,143,240,.12)!important}',
      D + '.rf-tbl td a{color:#ffb37a!important}',
      D + '.rf-tbl input,' + D + '.rf-tbl textarea{color:#dbe6f6!important;background:transparent!important}',
      D + '.rf-tblfoot{background:rgba(0,8,22,.4)!important;color:#a9b8d0!important;border-color:' + LINE4 + '!important}',
      D + '._rf_addb{background:rgba(255,103,2,.14)!important;background-image:none!important;color:#ffb37a!important;border:0!important;box-shadow:inset 0 0 0 1px rgba(255,138,31,.6)!important;border-radius:10px!important;font-weight:600!important}',
      // Ársreitirnir (175) í dökku: gler-kassar, ljós merki, daufir skjalapunktar.
      D + '.rf-yb{background:' + GLER + '!important;border-color:rgba(150,185,235,.3)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.6)!important}',
      D + '.rf-yb__y,' + D + '.rf-ybs__lab{color:#a9b8d0!important}',
      D + '.rf-ym{color:#86efac!important}',
      D + '.rf-ym--hist{color:#a9c5ff!important}',
      D + '.rf-ym--due{color:#ffb37a!important}',
      D + '.rf-ym--overdue{color:#ffaaa3!important}',
      D + '.rf-ym--none{color:rgba(169,184,208,.35)!important}',
      D + '.rf-ym>u>i{background:rgba(169,184,208,.28)!important}',
      D + '.rf-ym>u>i.rep{background:#4ade80!important}',
      D + '.rf-ym>u>i.inv{background:#5b8ff0!important}',
      D + '.rf-thema button{background:rgba(15,43,82,.9)!important;color:#dbe6f6!important}',
      D + '.rf-thema button[aria-pressed="true"]{background:#ff6702!important;color:#fff!important}',
      // Uppröðun Byggingar-flipans (eftir litina, svo hún vinni .rf-stat-reglurnar hér ofar).
      ...flipi(R, '#fff', '#e7ecf3', '#101e43', '#5a6882', '#fff'),
      R + '._rf_addb{background:' + APP + '!important;color:#fff!important;box-shadow:' + GLOD + '!important}',
      ...flipi(D, GLER, 'rgba(150,185,235,.16)', '#fff', '#a9b8d0', 'rgba(0,8,22,.35)'),
      ...ljomi(R),
      ...ljomi(D),
      D + '._rf_addb{background:' + APP4 + '!important;color:#fff!important;box-shadow:' + GLOD4 + '!important}',
    ].join('\n');
  }

  function letur() {
    if (document.getElementById('t5-bh2-letur')) return;
    const l = document.createElement('link');
    l.id = 't5-bh2-letur';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  function stilar() {
    if (document.getElementById('rf-thema-css')) return;
    const s = document.createElement('style');
    s.id = 'rf-thema-css';
    s.textContent = css();
    document.head.appendChild(s);
  }

  function rofiHtml(u) {
    const t = (v, a, titill, texti) => '<button type="button" data-rf-thema-val="' + v + '" aria-pressed="' + a + '" title="' + titill + '">' + texti + '</button>';
    return '<span class="rf-thema" role="group" aria-label="Útlit síðunnar">' +
      t('boss', !u, 'Boss-útlitið (svart stál)', 'Boss') +
      t('bh2', u === 'bh2', 'Brunahólf V2 (ljóst: navy og appelsínugult)', 'V2') +
      t('v4', u === 'v4', 'Brunahólf V4 (dökkt: navy-gler og appelsínugult)', 'V4') +
    '</span>';
  }

  // Kallað á ~1 sek. fresti og við smell: stillir merkið á síðunni, endurteiknar rofann eftir að 175 hefur byggt síðuna upp á nýtt.
  function stilla() {
    const v = document.getElementById(ID);
    if (!v) return;
    const u = utgafa();
    if (u) { stilar(); letur(); }
    if ((v.getAttribute('data-rf-thema') || '') !== u) { if (u) v.setAttribute('data-rf-thema', u); else v.removeAttribute('data-rf-thema'); }
    const bar = v.querySelector('#_rf_refresh');
    if (!bar || !bar.parentNode) return;
    let r = v.querySelector('.rf-thema');
    if (!window.ThbThemaBh2) { if (r) r.remove(); return; }
    stilar();
    const cur = (r && r.querySelector('button[aria-pressed="true"]')) ? r.querySelector('button[aria-pressed="true"]').dataset.rfThemaVal : null;
    const want = u || 'boss';
    if (r && cur === want) return;
    if (r) r.remove();
    bar.parentNode.insertAdjacentHTML('afterbegin', rofiHtml(u));
  }

  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('#' + ID + ' .rf-thema button');
    if (!b || !window.ThbThemaBh2) return;
    e.preventDefault();
    ThbThemaBh2.skipta(nafn(), b.dataset.rfThemaVal, stilla);
  });

  setInterval(stilla, 1000);
  window.RfThema = { stilla, css };
})();
