/* === 500 · FYRIRTÆKJAPRÓFÍLL — HÖNNUN I (09.11.2026) ===
 *
 * Agnar 09.11.2026: nýtt útlit á fyrirtækjaprófílnum (Design-striginn, Fyrirtaeki-I): einn þéttur upplýsingagluggi, þrískipt
 * Samskiptabox og sjö flipar neðst. FRAMSETNINGARBREYTING EINGÖNGU. Á bak við rofa: ?prof=2 í slóðinni (?prof=1 slekkur).
 *
 * REGLUR (Agnar): engin gögn, tafla, dálkur, join eða skrif breytast.
 *   - Enginn nýr lestur úr gagnagrunni og ENGIN skrif hér. Hver reitur í glugganum er lesinn úr sama DOM-i og gamli
 *     prófíllinn teiknar (banner 363/402/405, Úttekt 404, Skjöl 403, Samskipti 286) — sama tala, sama dagsetning.
 *   - Allir takkar eru UMBOÐ: smellur hér keyrir `click()` á upprunalega takkann, sem er áfram í DOM-inu (falinn með CSS).
 *     Þar með er skrifleiðin, Confirm-glugginn og samstillingin nákvæmlega þau sömu og áður.
 *   - Engum hnút er FLUTT til (reglan um tvo pabba á sama hnút, CLAUDE.md „Stöðugt viðmót" 4). Flipar eru CSS-sýnileiki á
 *     núverandi köflum; nýju hnútarnir eru okkar eigin (#p2-*) og enginn annar patch snertir þá.
 *   - Reitur án heimildar í kóðanum er FALINN (ekki tómur, ekki skáldaður): Fyrirtækjaskrá (heimilisfang/starfsemi),
 *     Rekstrarfélag og fjöldi brunaslangna/reykskynjara/eininga ef þær tegundir eru ekki í tækjalistanum.
 *   - Allt úr gamla prófílnum er áfram aðgengilegt: „Breyta upplýsingum" opnar gamla bannerinn (inline-reitir, mynd,
 *     athugasemd, Fleiri upplýsingar, Brunaáætlun, Rýmingaráætlun …) og ⋯-valmyndin geymir hina aðgerðatakkana.
 *
 * Gildissvið: tölva OG sími (gámafyrirspurn @container p2c + @media ≤ 900 px; síminn er 980 px breiður, sjá slokkvitaeki-layout §9).
 */
(function () {
  'use strict';
  if (window.__profill500) return;
  window.__profill500 = true;

  /* ---------- rofi: SJÁLFGEFIÐ á fyrir alla síðan 19.11.2026 (Agnar: „keyra þessa breytingu á allt“); ?prof=1 sýnir gamla útlitið. Áður: ?prof=2 í slóðinni (engin vafra-geymsla; slóðin heldur honum meðan flett er í appinu) ---------- */
  function erKveikt() {
    try { return new URLSearchParams(location.search).get('prof') !== '1'; } catch (e) { return false; }
  }
  var KVEIKT = erKveikt();
  window.Prof2 = { kveikt: function () { return KVEIKT; } };
  if (!KVEIKT) return;

  /* Allir viðskiptavinir o.fl. opnuðu viðskiptavinasíðuna (158). Agnar 19.11.2026: „allir sem eru skráðir inn sem
     viðskiptavinur“ fá sama prófíl → VidskDetail.show beinist á fyrirtækjaprófílinn. Upprunalega fallið lifir í ⋯
     („Viðskiptavinasíða (eldri)“) því þar eru áskriftartakkarnir. Engu eytt. */
  var GAMLA_KUNNASIDA = null;
  function beinaKunnasidu() {
    var V = window.VidskDetail;
    if (!V || typeof V.show !== 'function' || V.show.__p2) return !!(V && V.show && V.show.__p2);
    GAMLA_KUNNASIDA = V.show;
    var nytt = function (coId) {
      if (coId && typeof window._openCompanySafe === 'function') return window._openCompanySafe(coId);
      return GAMLA_KUNNASIDA.apply(this, arguments);
    };
    nytt.__p2 = true;
    V.show = nytt;
    return true;
  }
  if (!beinaKunnasidu()) { var _bk = 0, _bt = setInterval(function () { if (beinaKunnasidu() || ++_bk > 60) clearInterval(_bt); }, 500); }

  var F = ':not(#_p2a):not(#_p2b):not(#_p2c)';
  var M = 'html body #companies-main.p2' + F;
  var FX = ':not(#_p2d):not(#_p2e):not(#_p2f):not(#_p2g):not(#_p2h):not(#_p2i):not(#_p2j)';
  var G = M + FX;
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var GRAENN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SERIF = '"Playfair Display",Georgia,serif';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  /* Brunastál C — gildi hetjuspjalda Ársskoðunar (414) */
  // 23.11.2026 (Agnar: „taka línurnar burtu úr öllum fyrirtækjaprofilum, bara sama bakgrunn og fyrir ofan, gráa"): skálínu-áferðin
  // (repeating-linear-gradient 108°) er farin úr hetjuspjöldunum — sami sléttur málmgrár halli og hausinn fyrir ofan (.p2-haus).
  var INNI_STAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var INNI_RAUTT = 'linear-gradient(145deg,#130506 0%,#331214 26%,#4a1a1d 50%,#240b0d 74%,#0e0405 100%)';
  var INNI_GRAENT = 'linear-gradient(145deg,#06120a 0%,#132a1c 26%,#1b3a26 50%,#0e2216 74%,#050b07 100%)';
  var R_STAL = 'linear-gradient(145deg,#0a0a0c 0%,#4a4e57 20%,#1d1f24 45%,#6a6f79 62%,#15161a 85%,#0a0a0c 100%)';
  var R_GULL = 'linear-gradient(145deg,#3d2b05 0%,#d3ab4e 20%,#ffe9b0 35%,#a67f22 52%,#ffe9b0 68%,#d3ab4e 82%,#3d2b05 100%)';
  var R_GRAENT = 'linear-gradient(145deg,#010d05 0%,#0e5a2e 25%,#16783f 50%,#0e5a2e 75%,#010f06 100%)';
  var R_RAUTT = 'linear-gradient(145deg,#0d0102 0%,#380506 18%,#6c0d10 38%,#971515 50%,#6c0d10 62%,#380506 82%,#0d0102 100%)';
  var HN_STAL = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var HN_GULL = 'radial-gradient(circle at 40% 35%,#fff3c4 0%,#f0a83c 45%,#7a4a08 100%)';
  var HN_GRAENT = 'radial-gradient(circle at 40% 35%,#d8ffe6 0%,#23a35a 45%,#073a1d 100%)';
  var HN_RAUTT = 'radial-gradient(circle at 40% 35%,#ffd6d0 0%,#e25555 45%,#5a0a0a 100%)';
  var GR = 'linear-gradient(180deg,#63b88c 0%,#1f6f42 35%,#0c3d22 60%,#1a5a35 100%)';
  var GU = 'linear-gradient(180deg,#e2c67a 0%,#9c7c2c 35%,#5c4412 60%,#8c6c24 100%)';
  var RA = 'linear-gradient(180deg,#d97878 0%,#8a2020 35%,#4a0d0d 60%,#7a1a1a 100%)';
  var HNODIN = '<span class="hn" style="top:9px;left:9px" aria-hidden="true"></span><span class="hn" style="top:9px;right:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;left:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;right:9px" aria-hidden="true"></span>';

  var TABS = [
    ['skjol', 'Skjöl og reikningar'],
    ['slt', 'Slökkvitækjaþjónusta'],
    ['bk', 'Brunakerfisþjónusta'],
    ['teikn', 'Teikningar'],
    ['bygg', 'Byggingarupplýsingar'],
    ['kjor', 'Sérkjör'],
    ['adrar', 'Aðrar þjónustur']
  ];
  /* hvaða núverandi kaflar tilheyra hvaða flipa (sami hnúturinn má vera í tveimur — CSS, ekki flutningur) */
  var KAFLAR = [
    ['._dyg-section', 'skjol'],
    ['.uttekt-cols', 'slt'],
    ['#_hsp-spjald', 'slt'],
    ['#vbu-section', 'slt'],
    ['#_sks-tabs', 'slt bk'],   /* þjónustuflipar 274 (Slökkvitæki / Brunakerfi …) — sýnilegir í báðum, samstilltir við okkar flipa */
    ['#_sks-host', 'bk'],
    ['#_sks-bru', 'bk'],
    ['#_kt450', 'bk adrar'],
    ['#_bs468', 'bygg'],
    ['#co-fp-section', 'teikn'],
    ['#_bgm477', 'bygg teikn'],
    ['._afsl-box', 'kjor']
  ];

  var css =
    M + '{display:flex!important;flex-direction:column}' +
    G + ' > *{flex:none!important;min-height:0}' +
    G + ' > #p2-haus,' + G + ' > #p2-msimi,' + G + ' > #p2-kpi,' + G + ' > #p2-glugg,' + G + ' > #p2-samsk,' + G + ' > #p2-teikn,' + G + ' > #p2-adrar{overflow:visible!important}' +
    G + ' > #p2-haus,' + G + ' > #p2-msimi{order:1}' + G + ' > #p2-kpi{order:2}' + G + ' > #p2-glugg{order:3}' + G + ' > .co-banner{order:4}' +
    G + ' > #p2-samsk,' + G + ' > ._samskipti-host{order:5}' + G + ' > #p2-flipar{order:6}' + G + ' > #p2-teikn{order:7}' + G + ' > #p2-adrar{order:8}' + G + ' > #p2-bygg{order:8}' +
    G + ' > [data-p2t]:not(#p2-teikn):not(#p2-adrar):not(#p2-bygg){order:9}' + G + ' > *:not([id^="p2-"]):not(.co-banner):not(._samskipti-host):not([data-p2t]){order:10}' +
    G + ' > div:first-child{display:none!important}' +
    G + ' > .co-banner:not(.p2-open){display:none!important}' +
    G + ' > .p2-gomul{display:none!important}' +
    /* 26.11.2026 (Agnar: „neðra fyrirtækjaboxið … færa upplýsingarnar upp … notað efra boxið"): „Allir reitir" sýndi gamla
       bannerinn sem STAKT box fyrir neðan. Nú er hann FÆRÐUR INN Í efra spjaldið (#p2-glugg) — settBannerStad() — og stílaður
       sem dökkt framhald neðst í SAMA boxi: eitt box, ekki tvö. Tvítekni hausinn falinn (nafn/kt eru í p2-haus), allt annað
       stendur eftir (tengiliðir, byggingartölur, götusýn m/upphleðslu, Hreyfingaryfirlit). Lokað → færður aftur sem beint barn
       (þá felur `.co-banner:not(.p2-open){display:none}` hann). */
    G + ' #p2-glugg > .co-banner.p2-open{grid-column:1 / -1!important;grid-row:auto!important;margin:12px -20px -36px!important;padding:14px 20px 28px!important;border:0!important;border-top:1px solid rgba(255,255,255,.16)!important;border-radius:0!important;box-shadow:none!important;background:' + METAL + '!important;color:#e8eaee!important;overflow:visible}' +
    G + ' #p2-glugg > .co-banner.p2-open > .co-banner-id{display:none!important}' +
    G + ' #p2-glugg > .co-banner.p2-open [class*="_bupp"],' + G + ' #p2-glugg > .co-banner.p2-open [class*="_fasteign"],' + G + ' #p2-glugg > .co-banner.p2-open .co-banner-right,' + G + ' #p2-glugg > .co-banner.p2-open .co-banner-right *,' + G + ' #p2-glugg > .co-banner.p2-open .b405-facts,' + G + ' #p2-glugg > .co-banner.p2-open .co-bupp,' + G + ' #p2-glugg > .co-banner.p2-open .co-mynd,' + G + ' #p2-glugg > .co-banner.p2-open label,' + G + ' #p2-glugg > .co-banner.p2-open small{color:#d6dce7!important}' +
    G + ' #p2-glugg > .co-banner.p2-open ._bupp-lina{background:rgba(255,255,255,.05)!important;border:1px solid rgba(255,255,255,.1)!important;box-shadow:none!important}' +
    G + ' #p2-glugg > .co-banner.p2-open .co-bupp-reitur,' + G + ' #p2-glugg > .co-banner.p2-open .co-banner-note,' + G + ' #p2-glugg > .co-banner.p2-open input,' + G + ' #p2-glugg > .co-banner.p2-open textarea{background:rgba(0,0,0,.28)!important;color:#e8eaee!important;border-color:rgba(255,255,255,.14)!important}' +
    G + ' #p2-glugg > .co-banner.p2-open .btn-outline,' + G + ' #p2-glugg > .co-banner.p2-open ._bupp-flis,' + G + ' #p2-glugg > .co-banner.p2-open ._anf-takki,' + G + ' #p2-glugg > .co-banner.p2-open ._bupp-vixl,' + G + ' #p2-glugg > .co-banner.p2-open .co-mynd-upp{background-image:none!important;background:rgba(255,255,255,.08)!important;color:#e8eaee!important;border-color:rgba(255,255,255,.24)!important}' +
    G + ' #p2-glugg > .co-banner.p2-open .b405-facts span{background:rgba(255,255,255,.08)!important;color:#eef1f5!important;border:1px solid rgba(255,255,255,.16)!important}' +
    G + ' #p2-glugg > .co-banner.p2-open .co-mynd-vefja,' + G + ' #p2-glugg > .co-banner.p2-open .co-mynd-flis{background:#0d0d10!important;border-color:rgba(255,255,255,.12)!important}' +
    G + ' > [data-p2t]{margin-top:10px!important}' +
    G + '[data-p2tab="skjol"] > [data-p2t]:not([data-p2t~="skjol"]),' +
    G + '[data-p2tab="slt"] > [data-p2t]:not([data-p2t~="slt"]),' +
    G + '[data-p2tab="bk"] > [data-p2t]:not([data-p2t~="bk"]),' +
    G + '[data-p2tab="teikn"] > [data-p2t]:not([data-p2t~="teikn"]),' +
    G + '[data-p2tab="bygg"] > [data-p2t]:not([data-p2t~="bygg"]),' +
    G + '[data-p2tab="kjor"] > [data-p2t]:not([data-p2t~="kjor"]),' +
    G + '[data-p2tab="adrar"] > [data-p2t]:not([data-p2t~="adrar"]){display:none!important}' +
    /* haus + gluggi */
    '#companies-main .p2-haus{display:flex;align-items:center;gap:14px;padding:12px 16px;color:#fff;border-radius:14px 14px 0 0;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}' +
    '#companies-main .p2-til{height:36px;border-radius:9px;border:0;cursor:pointer;font:600 13px "IBM Plex Sans",system-ui,sans-serif;padding:0 12px;color:#eef1f4;background:linear-gradient(180deg,#3d4048,#1c1e23);outline:1px solid #000;display:inline-flex;align-items:center;gap:6px}' +
    '#companies-main .p2-til.p2-silf{color:#11141c;background:linear-gradient(180deg,#fdfdfe,#e3e7ee);outline:1px solid rgba(20,24,34,.16)}' +
    '#companies-main .p2-til.p2-gr{color:#fff;background:' + GRAENN + ';outline:1px solid rgba(52,168,98,.55)}' +
    '#companies-main .p2-til:hover{filter:brightness(1.1)}' +
    '#companies-main .p2-mono{width:48px;height:48px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;font:800 20px ' + SERIF + ';background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)}' +
    '#companies-main .p2-nafn{margin:0;font:800 25px/1.1 ' + SERIF + ';letter-spacing:-.005em;overflow-wrap:anywhere}' +
    '#companies-main .p2-ktlina{display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap;font:12.5px ' + MONO + ';color:#d9dee6}' +
    '#companies-main .p2-merki{font:700 11.5px ' + MONO + ';background:#eceff4;color:#11141c;border-radius:5px;padding:1px 7px;text-decoration:none}' +
    /* 24.11.2026: Úr þjónustu (405 setur data-st="stal") var grænt því aðeins ut/af voru rautt — dark metal red eins og .p2-mono */
    '#companies-main .p2-plata{font:700 11px ' + MONO + ';letter-spacing:.1em;border-radius:5px;padding:1px 7px;color:#fff;background:linear-gradient(145deg,#06331a,#16783f);text-transform:uppercase}' +
    '#companies-main .p2-plata[data-st="ut"],#companies-main .p2-plata[data-st="af"],#companies-main .p2-plata[data-st="stal"]{background:' + R_RAUTT + '}' +
    '#companies-main .p2-skod{display:flex;align-items:center;gap:10px;border-radius:10px;padding:6px 12px;color:#fff;background:' + GRAENN + '}' +
    '#companies-main .p2-skod[data-s="am"]{background:linear-gradient(150deg,#5a3f08,#9a6a14)}' +
    '#companies-main .p2-skod[data-s="rd"]{background:linear-gradient(150deg,#5b1010,#a01818)}' +
    '#companies-main .p2-skod b{font:800 18px/1 ' + SERIF + ';display:block}' +
    /* hvítur texti á lituðu merki, líka þegar annað þema litar <b>/<small> (Agnar 19.11: „texti sést ekki") */
    G + ' .p2-skod b,' + G + ' .p2-merkid b{color:#fff!important}' + G + ' .p2-skod small,' + G + ' .p2-merkid small,' + G + ' .p2-merkid .t{color:#e6e9ee!important}' +
    '#companies-main .p2-skod small{font:11.5px ' + MONO + ';color:#d9dee6;margin-top:2px;display:block}' +
    '#companies-main .p2-glugg{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1.1fr) 520px;grid-template-rows:auto auto;gap:0;padding:14px 0 0;background:linear-gradient(180deg,#e8ebf0,#dce1e8);border-radius:0 0 14px 14px;color:#11141c;box-shadow:0 22px 40px -22px rgba(0,0,0,.75),0 0 0 1px rgba(20,24,34,.35)}' +
    '#companies-main .p2-dalk{padding:0 18px;border-right:1px solid #c3cad5;min-width:0}' +
    '#companies-main .p2-sec{font:500 10.5px ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:#3a4250;display:flex;align-items:center;gap:8px;padding:2px 0 7px;border-bottom:1px solid #c3cad5;margin-bottom:4px}' +
    '#companies-main .p2-sec:before{content:"";width:6px;height:6px;background:#c92a2a;transform:rotate(45deg);flex:none;box-shadow:0 0 6px rgba(201,42,42,.5)}' +
    '#companies-main .p2-sec.p2-næsta{margin-top:10px}' +
    '#companies-main .p2-kv{display:flex;align-items:baseline;gap:8px;font-size:14px;line-height:1.25;padding:5px 0;border-bottom:1px solid rgba(20,24,34,.06)}' +
    '#companies-main .p2-kv:last-child{border-bottom:0}' +
    '#companies-main .p2-kv .k{flex:none;width:104px;color:#4a5363;font-size:12.5px}' +
    '#companies-main .p2-kv .v{flex:1;min-width:0;font-weight:600;overflow-wrap:anywhere}' +
    '#companies-main .p2-kv .v a{color:inherit;text-decoration:none}' +
    '#companies-main .p2-kv .v a:hover{text-decoration:underline}' +
    '#companies-main .p2-kv .n,#companies-main .p2-n{font-family:' + MONO + ';font-weight:700;font-variant-numeric:tabular-nums}' +
    '#companies-main .p2-ck{width:16px;height:16px;border-radius:5px;background:linear-gradient(145deg,#06331a,#16783f);color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;align-self:center;box-shadow:0 0 0 2px rgba(22,120,63,.18)}' +
    '#companies-main .p2-meira{border:0;background:none;color:#525b6b;font-weight:600;cursor:pointer;padding:0 2px;font-size:12.5px}' +
    '#companies-main .p2-gl-a{display:contents}' +
    '#companies-main .p2-msimi{display:none}' +
    '#companies-main .p2-d1{grid-column:1;grid-row:1}#companies-main .p2-d2{grid-column:2;grid-row:1}#companies-main .p2-d3{grid-column:3;grid-row:1}' +
    '#companies-main .p2-mynd{grid-column:4;grid-row:1/span 2;display:flex;flex-direction:column;gap:10px;padding:0 14px 14px}' +
    '#companies-main .p2-mynd .ram{position:relative;flex:1;min-height:300px;border-radius:10px;background:#c3cad5 center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 10px 20px -12px rgba(0,0,0,.6)}' +
    '#companies-main .p2-mynd .tak{display:flex;gap:6px}' +
    '#companies-main .p2-mynd .tak .p2-til{flex:1;justify-content:center}' +
    '#companies-main .p2-bæta{grid-column:1/-1;padding:10px 18px 0;font-size:12.5px;color:#525b6b}' +
    '#companies-main .p2-bæta button{border:0;background:none;cursor:pointer;font:600 12.5px "IBM Plex Sans",system-ui,sans-serif;color:#3a4250;text-decoration:underline}' +
    '#companies-main .p2-athug{grid-column:1/span 3;grid-row:2;align-self:end;display:flex;align-items:flex-start;gap:8px;padding:10px 18px 14px;margin-top:10px;border-top:1px solid #c3cad5}' +
    '#companies-main .p2-athug .alt{border:0;background:none;cursor:pointer;font:600 12.5px "IBM Plex Sans",system-ui,sans-serif;color:#3a4250;text-decoration:underline;white-space:nowrap;margin-top:8px}' +
    '#companies-main .p2-athug textarea{flex:1;min-width:0;height:52px;min-height:52px;max-height:120px;resize:none;line-height:20px;padding-top:5px!important;padding-bottom:5px!important;overflow-y:auto;border:0;border-radius:8px;background:#eef1f6;box-shadow:inset 0 2px 4px rgba(0,0,0,.18);padding:0 10px;font:13.5px "IBM Plex Sans",system-ui,sans-serif;color:#141822}' +
    '#companies-main .p2-athug textarea::placeholder{color:#525b6b}' +
    /* lykiltölur (hönnun A, 19.11.2026): ein röð kassa með lituðum toppi */
    '#companies-main .p2-kpi{display:grid;gap:12px;padding:16px;background:linear-gradient(180deg,#e8ebf0,#d6dbe3);border-top:1px solid #000;color:#11141c}' +
    '#companies-main .p2-kp{position:relative;background:linear-gradient(180deg,#fff,#f3f5f8);border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px rgba(20,24,34,.16),0 10px 22px -14px rgba(0,0,0,.55);display:flex;flex-direction:column;min-width:0}' +
    '#companies-main .p2-kp.ramm-g{box-shadow:0 0 0 2px #16783f,0 10px 22px -14px rgba(0,0,0,.55)}' +
    '#companies-main .p2-kp.ramm-a{box-shadow:0 0 0 2px #c48a1f,0 10px 22px -14px rgba(0,0,0,.55)}' +
    '#companies-main .p2-kp .cap{height:5px}' +
    '#companies-main .p2-bygg{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:linear-gradient(180deg,#232833,#141822);color:#fff;border-radius:12px}' +
    '#companies-main .p2-bygg .t{font:700 11px ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#d9dee6}' +
    '#companies-main .p2-bygg .u{flex:1;min-width:0;font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;color:#fff}' +
    '#companies-main .p2-kp .man.st-g{background:linear-gradient(180deg,#22c06a,#0a4a26)}' +
    '#companies-main .p2-kp .man.st-y{background:linear-gradient(180deg,#f2c35a,#9a6a14);color:#1a1300}' +
    '#companies-main .p2-kp .man.st-r{background:linear-gradient(180deg,#f0584c,#6b0b0b)}' +
    '#companies-main .p2-kp .mbord{display:grid;grid-template-columns:repeat(12,1fr);gap:2px}' +
    '#companies-main .p2-kp .mbord i{height:7px;border-radius:2px;background:rgba(255,255,255,.14);box-shadow:inset 0 1px 1px rgba(0,0,0,.35)}' +
    '#companies-main .p2-kp .mbord i.nu{outline:1.5px solid #fff;outline-offset:1px}' +
    '#companies-main .p2-kp .mbord i.on.st-g{background:#22c06a}#companies-main .p2-kp .mbord i.on.st-y{background:#f2c35a}#companies-main .p2-kp .mbord i.on.st-r{background:#f0584c}' +
    '#companies-main .p2-kp .flis3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}' +
    '#companies-main .p2-kp .flis3 span{background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:4px 6px;min-width:0}' +
    '#companies-main .p2-kp .flis3 small{display:block;font:700 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#aab2bf}' +
    '#companies-main .p2-kp .flis3 b{display:block;font-size:11.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#companies-main .p2-kp .nota{font-size:11.5px;font-style:italic;color:#c3cad5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#companies-main .p2-merkid.am{background:linear-gradient(145deg,#2a1d02 0%,#5a3f08 30%,#9a6a14 55%,#3a2804 100%)}' +
    /* ── PLÖTURNAR: Brunastál C, sama útfærsla og hetjuspjöld Ársskoðunar (414 · .b414-k/.b414-i/.hn) ──
       Agnar 19.11.2026: „ekki rétta hönnunin … léleg útgáfa, lítill punktur, enginn dýpt“ → engin eftirlíking, heldur
       gildin úr 414: 2 px málmrammi (gull/grænt/rautt/stál), tvö skorin horn (18/16 px), burstuð innri plata, 3 px
       ljósrönd efst, fjögur hnoð með glóð, LED með geislabaug, Playfair 40–44 px með skugga, innfelldar málmsúlur. */
    '#companies-main .p2-kpi{background:linear-gradient(180deg,#e8ebf0,#d6dbe3)!important;padding:16px!important;gap:14px!important}' +
    G + ' .p2-kp{--fr:' + R_STAL + ';--in:' + INNI_STAL + ';--tl:linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46);--hn:' + HN_STAL + ';--hg:0 1px 1px rgba(0,0,0,.7);--led:#8f98a8;--ledg:none;' +
      'background:var(--fr)!important;background-color:#0a0a0c!important;padding:2px!important;border-radius:0!important;overflow:visible!important;box-shadow:none!important;' +
      'clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));filter:drop-shadow(0 14px 24px rgba(10,14,22,.45));color:#fff}' +
    G + ' .p2-kp:has(> .cap.g),' + G + ' .p2-kp.ramm-g{--led:#3cc47c;--ledg:0 0 0 3px rgba(60,196,124,.16),0 0 10px rgba(60,196,124,.8)}' +
    G + ' .p2-kp:has(> .cap.r){--led:#f0584c;--ledg:0 0 0 3px rgba(240,88,76,.18),0 0 10px rgba(240,88,76,.85)}' +
    G + ' .p2-kp:has(> .cap.y),' + G + ' .p2-kp.ramm-a{--led:#e0a93e;--ledg:0 0 0 3px rgba(246,181,69,.18),0 0 10px rgba(246,181,69,.85)}' +
    /* ── GLUGGINN SEM HLUTI AF HEILDINNI (Agnar 19.11.2026: „láta næsta hluta með myndinni og upplýsingunum svolítið vera
       part af hinu, meiri heild“) — sama beð og plöturnar, og glugginn sjálfur er stór stálplata í Brunastáli C: 2 px
       málmrammi og skorin horn (::before), burstuð innri plata með hnoðum (::after), ljós texti. Engin hnút færður. */
    G + ' .p2-glugg{position:relative;isolation:isolate;background:linear-gradient(180deg,#d6dbe3,#cdd3dc)!important;padding:22px 20px 36px!important;border:0!important;box-shadow:none!important;color:#fff}' +
    G + ' .p2-glugg::before{content:"";position:absolute;z-index:-2;left:16px;right:16px;top:0;bottom:16px;background:' + R_STAL + ';clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))}' +
    G + ' .p2-glugg::after{content:"";position:absolute;z-index:-1;left:18px;right:18px;top:2px;bottom:18px;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));' +
      'background:linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46) top/100% 3px no-repeat,radial-gradient(circle,#eef1f5 0 1.2px,#8a919c 1.6px,#2a2d33 2.6px,transparent 3px) left 7px top 8px/6px 6px no-repeat,radial-gradient(circle,#eef1f5 0 1.2px,#8a919c 1.6px,#2a2d33 2.6px,transparent 3px) right 24px top 8px/6px 6px no-repeat,radial-gradient(circle,#eef1f5 0 1.2px,#8a919c 1.6px,#2a2d33 2.6px,transparent 3px) left 24px bottom 7px/6px 6px no-repeat,radial-gradient(circle,#eef1f5 0 1.2px,#8a919c 1.6px,#2a2d33 2.6px,transparent 3px) right 7px bottom 7px/6px 6px no-repeat,' + INNI_STAL + '}' +
    G + ' .p2-sec{color:#d9dee6!important;font-weight:700!important;letter-spacing:.18em!important;border-bottom-color:rgba(255,255,255,.12)!important}' +
    G + ' .p2-kv{border-bottom-color:rgba(255,255,255,.07)!important}' +
    G + ' .p2-kv .k{color:#a9b1bf!important}' +
    G + ' .p2-kv .v{color:#fff!important}' +
    G + ' .p2-kv .v a{color:#f3d98a!important}' +
    G + ' .p2-kv .v [style*="#845400"]{color:#f3d98a!important}' + G + ' .p2-kv .v [style*="#a01818"]{color:#ff8a80!important}' +
    G + ' .p2-meira{color:#c9d0da!important}' +
    G + ' .p2-dalk{border-right-color:rgba(255,255,255,.1)!important}' +
    G + ' .p2-athug{border-top-color:rgba(255,255,255,.12)!important;color:#d9dee6}' +
    G + ' .p2-athug textarea{background:rgba(0,0,0,.38)!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 3px rgba(0,0,0,.7)!important}' +
    G + ' .p2-athug textarea::placeholder{color:#8e97a6!important}' +
    G + ' .p2-athug .alt{color:#d9dee6!important}' +
    G + ' .p2-mynd .ram{box-shadow:0 0 0 1px rgba(255,255,255,.2),0 12px 24px -10px rgba(0,0,0,.9)!important;border-radius:6px!important}' +
    G + ' .p2-kpi{padding-bottom:16px!important}' +
    G + ' .p2-kp > .in{position:relative;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));background-image:var(--in)!important;background-color:#0a0a0c;padding:12px 18px 12px!important;gap:7px!important;height:100%;box-sizing:border-box;color:#fff}' +
    G + ' .p2-kp > .in::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--tl);pointer-events:none}' +
    G + ' .p2-kp .hn{position:absolute;width:6px;height:6px;border-radius:50%;z-index:2;pointer-events:none;background:var(--hn);box-shadow:var(--hg)}' +
    G + ' .p2-kp .cap{display:none!important}' +
    G + ' .p2-kp .in > div:has(> .big){white-space:nowrap;display:flex;align-items:baseline;gap:2px}' +
    /* merki með LED */
    G + ' .p2-kp .lb{display:flex!important;align-items:center;gap:9px;white-space:nowrap;font:700 10.5px ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase;color:#d9dee6!important;min-width:0}' +
    G + ' .p2-kp .lb::before{content:"";width:7px;height:7px;border-radius:50%;flex:none;background:var(--led);box-shadow:var(--ledg)}' +
    /* talan */
    G + ' .p2-kp .big{font-family:' + SERIF + '!important;font-size:34px!important;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);white-space:nowrap}' +
    G + ' .p2-kp .bigl{font-family:' + SERIF + ';font-size:16px!important;font-weight:700;color:#d9dee6!important;margin-left:4px}' +
    /* línur og skýringar í letri plötunnar */
    G + ' .p2-kp .sm{font:400 12.5px ' + MONO + '!important;color:#d5dbe6!important;line-height:1.5}' +
    G + ' .p2-kp .sm b,' + G + ' .p2-kp .leg2 b{color:#fff!important;font-weight:700}' +
    G + ' .p2-kp .ft{font:400 11.5px ' + MONO + '!important;color:#c9d0da!important}' +
    G + ' .p2-kp .leg2{font:400 11.5px ' + MONO + '!important;color:#d5dbe6!important;gap:6px 16px!important}' +
    G + ' .p2-kp .leg2 .dot{width:9px!important;height:9px!important;border-radius:2px!important;border:1px solid rgba(0,0,0,.4)}' +
    G + ' .p2-kp .aths{font:400 11.5px ' + MONO + '!important;color:#f3d98a!important}' +
    G + ' .p2-kp .nota{font:italic 400 12px ' + SANS + '!important;color:#c9d0da!important}' +
    /* súlur: innfelldar, málmgradient ofan á lit hvers búts */
    G + ' .p2-kp .bar,' + G + ' .p2-kp .bar2{height:9px!important;border-radius:4px!important;background:#131316!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)!important;display:flex;gap:2px!important;overflow:hidden}' +
    G + ' .p2-kp .bar i,' + G + ' .p2-kp .bar2 i{border-radius:0!important;min-width:6px;background-image:linear-gradient(180deg,rgba(255,255,255,.38) 0%,rgba(255,255,255,.06) 38%,rgba(0,0,0,.28) 62%,rgba(255,255,255,.08) 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)!important}' +
    /* flísar (eins og .b414-f) */
    G + ' .p2-kp .flis3{gap:6px!important}' +
    G + ' .p2-kp .flis3 span{display:flex;flex-direction:column;justify-content:center;gap:1px;height:38px;box-sizing:border-box;padding:4px 8px!important;border-radius:6px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.1)!important}' +
    G + ' .p2-kp .flis3 small{font:700 9.5px ' + MONO + '!important;letter-spacing:.14em!important;color:#a9b1bf!important}' +
    G + ' .p2-kp .flis3 b{font:700 12px ' + MONO + '!important;color:#fff!important}' +
    /* mánaðarborðinn: 12 innfelld hólf, skoðunarmánuður í málmlit, líðandi mánuður rammaður */
    G + ' .p2-kp .mbord{gap:3px!important}' +
    G + ' .p2-kp .mbord i{height:7px!important;border-radius:2px!important;background:#131316!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)!important}' +
    G + ' .p2-kp .mbord i.on.st-g{background:' + GR + '!important}' + G + ' .p2-kp .mbord i.on.st-y{background:' + GU + '!important}' + G + ' .p2-kp .mbord i.on.st-r{background:' + RA + '!important}' +
    G + ' .p2-kp .mbord i.nu{outline:1.5px solid #f3d98a!important;outline-offset:1px}' +
    /* plötur (mánuður, Greitt, Í vinnslu …) eins og .b414-p */
    G + ' .p2-kp .man,' + G + ' .p2-kp .p2-pl{display:inline-flex!important;align-items:center;height:22px;padding:0 8px!important;border-radius:3px!important;border:1px solid #000;font:700 10.5px ' + MONO + '!important;letter-spacing:.08em;text-transform:uppercase;color:#fff!important;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.18);background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important}' +
    G + ' .p2-kp .khd{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}' +
    G + ' .p2-kp .khd .lb{white-space:normal!important;line-height:1.35}' +
    G + ' .p2-kp .man{position:static!important;flex:none;margin-top:-3px;margin-right:16px}' +
    G + ' .p2-kpi.tvaer > .p2-kp-taeki,' + G + ' .p2-kpi.tvaer > .p2-kp-bk{grid-row:span 2}' +
    G + ' .p2-kpi.tvaer.s3 > .p2-kp:last-child{grid-column:span 2}' +
    G + ' .p2-kp .big.ord{font-size:24px!important;letter-spacing:-.01em}' +
    G + ' .p2-kp .big.gul{color:#f3d98a!important}' +
    G + ' .p2-kp .sm,' + G + ' .p2-kp .ft{display:flex!important;flex-wrap:wrap;gap:2px 14px;align-items:center}' +
    G + ' .p2-kp .fx{white-space:nowrap}' +
    /* Joker 6: aðeins aðalplatan í gulli; viðvörun = stálrammi + gull-LED */
    G + ' .p2-kp:has(> .cap.y):not(.p2-kp-taeki),' + G + ' .p2-kp.ramm-a{--fr:' + R_STAL + ';--hn:' + HN_STAL + ';--hg:0 1px 1px rgba(0,0,0,.7);--tl:linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46)}' +
    G + ' .p2-kp .man.st-g,' + G + ' .p2-kp .p2-pl:not(.am):not(.rd){background:' + R_GRAENT + '!important;border-color:rgba(0,0,0,.6)}' +
    G + ' .p2-kp .man.st-y,' + G + ' .p2-kp .p2-pl.am{background:linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}' +
    G + ' .p2-kp .man.st-r,' + G + ' .p2-kp .p2-pl.rd{background:' + R_RAUTT + '!important}' +

    G + ' .p2-kp.p2-kp-kerfi{grid-column:1/-1}' +
    G + ' .p2-kp-kerfi .kh{display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
    G + ' .p2-kp-kerfi .kfl{font:700 11px "JetBrains Mono",monospace;letter-spacing:.08em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:4px;padding:2px 7px;color:#fff}' +
    G + ' .p2-kp-kerfi .ksum{display:flex;gap:16px;flex-wrap:wrap;margin-left:auto;font-size:13.5px;color:#e6e9ee}' +
    G + ' .p2-kp-kerfi .ksum span{display:inline-flex;align-items:center;gap:6px}' +
    G + ' .p2-kp-kerfi .ksum .dot{width:9px;height:9px;border-radius:50%;display:inline-block}' +
    G + ' .p2-kp-kerfi .ksum b{color:#fff;font-size:15px}' +
    G + ' .p2-kp-kerfi .kflis{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}' +
    G + ' .p2-kp-kerfi .kf{display:grid;grid-template-columns:10px minmax(0,1fr);column-gap:8px;align-items:center;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:6px 9px;min-width:0}' +
    G + ' .p2-kp-kerfi .kf i{grid-row:1/span 2;width:10px;height:10px;border-radius:50%;box-shadow:0 0 6px currentColor}' +
    G + ' .p2-kp-kerfi .kf b{font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    G + ' .p2-kp-kerfi .kf small{font-size:11.5px;color:#c9d0da;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    G + ' .p2-kp-kerfi .kf-va{border-color:rgba(240,88,76,.55);background:rgba(120,16,16,.35)}' +
    G + ' .p2-kp-kerfi .kf-ok{border-color:rgba(34,192,106,.45)}' +
    G + ' .p2-kp-kerfi .kf{background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.1)!important;height:46px;box-sizing:border-box}' +
    G + ' .p2-kp-kerfi .kf i{width:8px!important;height:8px!important}' +
    G + ' .p2-kp-kerfi .kf b{font:600 13px ' + SANS + '!important}' +
    G + ' .p2-kp-kerfi .kf small{font:400 10.5px ' + MONO + '!important;color:#a9b1bf!important;letter-spacing:.02em}' +
    G + ' .p2-kp-kerfi .kf-va{border-color:rgba(240,88,76,.6)!important;background:rgba(150,20,20,.28)!important}' +
    G + ' .p2-kp-kerfi .kf-ok{border-color:rgba(60,196,124,.45)!important}' +
    G + ' .p2-kp-kerfi .ksum{font:400 11.5px ' + MONO + '!important;color:#d5dbe6!important}' +
    G + ' .p2-kp-kerfi .ksum .dot{border-radius:2px!important}' +
    G + ' .p2-kp-kerfi .kfl{font:700 10.5px ' + MONO + '!important;height:22px;display:inline-flex;align-items:center;border-radius:3px!important;border:1px solid rgba(255,255,255,.3)!important;background:transparent!important}' +
    '#companies-main .p2-kp .man{position:absolute;top:14px;right:12px;font:700 10.5px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#fff;background:linear-gradient(180deg,#3a4250,#141822);border-radius:5px;padding:3px 8px}' +
    '#companies-main .p2-kp .cap.g{background:linear-gradient(90deg,#0a4a26,#22c06a,#0a4a26)}' +
    '#companies-main .p2-kp .cap.y{background:linear-gradient(90deg,#9a6a14,#f2c35a,#9a6a14)}' +
    '#companies-main .p2-kp .cap.r{background:linear-gradient(90deg,#6b0b0b,#f0584c,#6b0b0b)}' +
    '#companies-main .p2-kp .cap.s{background:linear-gradient(90deg,#26262c,#8a93a3,#26262c)}' +
    '#companies-main .p2-kp .in{padding:11px 13px 12px;display:flex;flex-direction:column;gap:7px;flex:1}' +
    '#companies-main .p2-kp .lb{font:700 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}' +
    '#companies-main .p2-kp .big{font:800 30px/1 ' + SERIF + ';white-space:nowrap}' +
    '#companies-main .p2-kp .bigl{font:700 13.5px ' + SERIF + ';color:#4a5363}' +
    '#companies-main .p2-kp .sm{font-size:12.5px;color:#3a4250;line-height:1.4}' +
    '#companies-main .p2-kp .ft{font:11px ' + MONO + ';color:#4a5363;margin-top:auto}' +
    '#companies-main .p2-kp .bar{display:flex;height:9px;border-radius:5px;overflow:hidden;background:#dfe3ea;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}' +
    '#companies-main .p2-kp .bar i{display:block;height:100%}' +
    /* tækjasúla eins og í tækjalistanum (Agnar 19.11.2026): aðskildir ávalir bútar + tegundir í einni línu */
    '#companies-main .p2-kp .bar2{display:flex;gap:4px;height:10px}' +
    '#companies-main .p2-kp .bar2 i{display:block;min-width:8px;border-radius:5px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.18)}' +
    '#companies-main .p2-kp .leg2{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:#3a4250}' +
    '#companies-main .p2-kp .leg2 span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}' +
    '#companies-main .p2-kp .leg2 .dot{width:8px;height:8px;border-radius:50%;display:inline-block}' +
    '#companies-main .p2-kp .leg2 b{color:#11141c}' +
    '#companies-main .p2-kp .aths{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:12px;color:#845400;margin-top:auto}' +
    '#companies-main .p2-kp .leg{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:3px 7px;align-items:center;font-size:12.5px}' +
    '#companies-main .p2-kp .sw{width:9px;height:9px;border-radius:2px;display:inline-block}' +
    '#companies-main .p2-kp .p2-pl{font-size:11.5px;font-weight:700;color:#fff;border-radius:99px;padding:2px 9px;align-self:flex-start;background:linear-gradient(150deg,#1f9d57,#0a4a26)}' +
    '#companies-main .p2-kp .p2-pl.am{background:linear-gradient(150deg,#e0a93e,#9a6a14)}' +
    '#companies-main .p2-kp .p2-pl.rd{background:linear-gradient(150deg,#e25555,#a01818)}' +
    '#companies-main .p2-merkid{display:flex;align-items:center;gap:10px;border-radius:10px;padding:6px 12px;color:#fff;background:' + GRAENN + '}' +
    '#companies-main .p2-merkid.rd{background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)}' +
    '#companies-main .p2-merkid .t{font:700 10px ' + MONO + ';letter-spacing:.14em;color:#d9dee6}' +
    '#companies-main .p2-merkid b{font:800 16px/1.1 ' + SERIF + ';display:block}' +
    '#companies-main .p2-merkid small{font:11px ' + MONO + ';color:#d9dee6;display:block}' +
    '#companies-main .p2-mynd .ram .lbl{position:absolute;left:8px;top:8px;font:10.5px ' + MONO + ';background:rgba(0,0,0,.62);color:#fff;border-radius:5px;padding:2px 7px}' +
    '#companies-main .p2-mynd .ram .chips{position:absolute;left:8px;bottom:8px;display:flex;gap:6px;flex-wrap:wrap}' +
    '#companies-main .p2-mynd .ram .chips span{font:700 10.5px ' + MONO + ';letter-spacing:.06em;background:rgba(0,0,0,.66);color:#fff;border-radius:4px;padding:3px 7px}' +
    '#companies-main .p2-til.p2-rd{color:#fff;background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);outline:1px solid #2a0304}' +
    '#companies-main .p2-glugg{border-radius:0!important;box-shadow:none!important}' +
      '#companies-main .p2-adrar{background:#fff;border-radius:0 0 14px 14px;padding:16px 18px;color:#11141c;box-shadow:inset 0 1px 0 rgba(20,24,34,.08)}' +
    '#companies-main .p2-adrar .hl2{display:flex;align-items:center;gap:12px;margin-bottom:12px}' +
    '#companies-main .p2-tbl{font-size:13.5px}' +
    '#companies-main .p2-tbl .rad{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:8px;padding:10px;border-bottom:1px solid #edf0f4;align-items:center}' +
    '#companies-main .p2-tbl .rad.hd{font:500 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#525b6b;background:#f4f6f9;border-bottom:1px solid #c3cad5}' +
    '#companies-main .p2-adrar .p2-pl{font-size:12px;font-weight:700;color:#fff;border-radius:99px;padding:2px 10px;background:linear-gradient(150deg,#1f9d57,#0a4a26)}' +
    '#companies-main .p2-adrar .p2-pl.am{background:linear-gradient(150deg,#e0a93e,#9a6a14)}' +
    '#companies-main .p2-adrar .p2-pl.rd{background:linear-gradient(150deg,#e25555,#a01818)}' +
    '#companies-main .p2-tomt{color:#525b6b;font-size:13.5px;padding:8px 0}' +
    /* flipar */
    '#companies-main .p2-flipar{display:flex;gap:6px;padding:10px 10px 0;flex-wrap:wrap;margin-top:10px;border-radius:14px 14px 0 0;background:' + METAL + '}' +
    '#companies-main .p2-flipar button{height:42px;padding:0 16px;border-radius:9px 9px 0 0;border:0;display:flex;align-items:center;gap:8px;font:600 14px "IBM Plex Sans",system-ui,sans-serif;color:#d5dbe6;cursor:pointer;background:rgba(255,255,255,.07)}' +
    '#companies-main .p2-flipar button:hover{color:#fff;background:rgba(255,255,255,.14)}' +
    '#companies-main .p2-flipar button[aria-selected="true"]{color:#11141c;background:#fff}' +
    '#companies-main .p2-flipar button:focus-visible{outline:2px solid #c92a2a;outline-offset:2px}' +
    '#companies-main .p2-flipar .c{font:11.5px ' + MONO + ';background:rgba(255,255,255,.14);border-radius:99px;padding:0 7px}' +
    '#companies-main .p2-flipar button[aria-selected="true"] .c{background:#eceff4;color:#11141c}' +
    M + '[data-p2tab] > .p2-flipar ~ [data-p2t]{border-radius:0 0 14px 14px}' +
    /* Teikningar-flipinn */
    '#companies-main .p2-teikn{background:#fff;border-radius:0 0 14px 14px;padding:16px 18px;color:#11141c;box-shadow:inset 0 1px 0 rgba(20,24,34,.08)}' +
    '#companies-main .p2-teikn .hl{display:flex;gap:12px;align-items:baseline;padding:8px 0;border-bottom:1px solid #edf0f4;font-size:14px}' +
    '#companies-main .p2-teikn .hl .k{flex:none;width:150px;font:500 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#525b6b}' +
    '#companies-main .p2-teikn .tk{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
    /* Samskipti, þrískipt: teljarar + takkar | samtal | yfirlit (okkar eigin hnútar; gamla kortið er falið en lifir) */
    G + ' > ._samskipti-host:not(.p2-sýna){display:none!important}' +
    G + '.p2-gam > ._samskipti-host{display:block!important}' +
    '#companies-main .p2-samsk{margin-top:10px;color:#fff;border-radius:14px;overflow:hidden;background:' + METAL + ';box-shadow:0 12px 30px -16px rgba(0,0,0,.55),0 0 0 1px rgba(20,24,34,.4)}' +
    '#companies-main .p2-samsk .hd{padding:10px 16px;font:500 11.5px ' + MONO + ';letter-spacing:.18em}' +
    '#companies-main .p2-samsk .gr{display:grid;grid-template-columns:230px minmax(0,1fr) 320px;gap:12px;padding:0 12px 12px}' +
    '#companies-main .p2-samsk .c1,#companies-main .p2-samsk .c3{display:flex;flex-direction:column;gap:8px;min-width:0}' +
    '#companies-main .p2-samsk .kass{background:rgba(255,255,255,.07);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:6px;font-size:13.5px}' +
    '#companies-main .p2-samsk .kass div{display:flex;justify-content:space-between;gap:8px}' +
    '#companies-main .p2-samsk .kass b{font-family:' + MONO + '}' +
    '#companies-main .p2-samsk .c1 .p2-til{justify-content:center;outline:1px solid rgba(255,255,255,.2)}' +
    '#companies-main .p2-samsk .c1 .p2-til.p2-gr{outline:1px solid rgba(52,168,98,.55)}' +
    '#companies-main .p2-samsk .c2{display:flex;flex-direction:column;gap:8px;min-width:0;background:linear-gradient(180deg,#f4f6f9,#e8ebf0);color:#11141c;border-radius:12px;padding:8px 12px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12)}' +
    '#companies-main .p2-samsk .flip{display:flex;gap:18px;border-bottom:1px solid #c3cad5}' +
    '#companies-main .p2-samsk .flip button{border:0;background:none;color:#525b6b;padding:6px 0;font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;border-bottom:3px solid transparent}' +
    '#companies-main .p2-samsk .flip button[aria-selected="true"]{color:#11141c;font-weight:700;border-bottom-color:#c92a2a}' +
    '#companies-main .p2-samsk .msg{display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1),0 1px 2px rgba(20,24,34,.08)}' +
    '#companies-main .p2-samsk .av{width:32px;height:32px;border-radius:50%;background:#971515;color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px "IBM Plex Sans",sans-serif;flex:none}' +
    '#companies-main .p2-samsk .av.ok{background:#3a3a41}' +
    '#companies-main .p2-samsk .tx{flex:1;min-width:0;font-size:13.5px}' +
    '#companies-main .p2-samsk .tx .m{color:#525b6b;font:12px ' + MONO + '}' +
    '#companies-main .p2-samsk .tx .l{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}' +
    '#companies-main .p2-samsk .p2-pl{font-size:12px;font-weight:700;color:#fff;border-radius:99px;padding:2px 10px;flex:none;background:linear-gradient(150deg,#1f9d57,#0a4a26)}' +
    '#companies-main .p2-samsk .p2-pl.am{background:linear-gradient(150deg,#e0a93e,#9a6a14)}' +
    '#companies-main .p2-samsk .svar{display:flex;gap:8px;margin-top:auto}' +
    '#companies-main .p2-samsk .svar .inn{flex:1;min-width:0;height:34px;border:0;border-radius:8px;background:#eef1f6;box-shadow:inset 0 2px 4px rgba(0,0,0,.18);padding:0 10px;font:13.5px "IBM Plex Sans",system-ui,sans-serif;color:#525b6b;text-align:left;cursor:pointer}' +
    '#companies-main .p2-samsk .yf{background:rgba(255,255,255,.07);border-radius:10px;padding:10px 14px}' +
    '#companies-main .p2-samsk .yf .t{font:10.5px ' + MONO + ';letter-spacing:.16em;color:#b9c1cf;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.15);margin-bottom:4px}' +
    '#companies-main .p2-samsk .yf .r{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:5px 0}' +
    '#companies-main .p2-samsk .yf .r span:first-child{color:#b9c1cf}' +
    '#companies-main .p2-samsk .yf .r b{text-align:right;overflow-wrap:anywhere}' +
    '#companies-main .p2-samsk .yf a{color:#fff;text-decoration:none}' +
    '#companies-main .p2-samsk .sig{font-size:12.5px;color:#d5dbe6;display:flex;flex-wrap:wrap;gap:6px}' +
    '#companies-main .p2-samsk .sig span{background:rgba(255,255,255,.14);border-radius:99px;padding:2px 10px;color:#fff!important}' +
    /* ⋯-valmynd */
    '.p2-valm{position:absolute;z-index:60;min-width:230px;background:#fff;color:#11141c;border-radius:10px;box-shadow:0 14px 34px -10px rgba(0,0,0,.6),0 0 0 1px rgba(20,24,34,.2);padding:6px;display:flex;flex-direction:column}' +
    '.p2-valm button{border:0;background:none;text-align:left;font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;padding:9px 12px;border-radius:7px;cursor:pointer;color:#11141c}' +
    '.p2-valm button:hover,.p2-valm button:focus-visible{background:#eef1f6;outline:none}' +
    '.p2-valm button.eyda{color:#a01818}' +
    '.p2-valm hr{border:0;border-top:1px solid #e4e6ea;margin:4px 0}';

  /* þröngt: sími (980 px sýnisgluggi í appinu ⇒ gámafyrirspurn á #companies-main) og þröngir vafragluggar (≤ 900 px) */
  var NARROW =
    '#companies-main .p2-haus{flex-wrap:wrap;gap:10px;padding:10px 12px}' +
    '#companies-main .p2-nafn{font-size:20px}' +
    '#companies-main .p2-nm{flex:1 1 55%!important}' +
    '#companies-main .p2-skod{order:5;flex:1 0 100%}' +
    '#companies-main .p2-glugg{grid-template-columns:1fr;grid-template-rows:none;padding:10px 0}' +
    '#companies-main .p2-mynd,#companies-main .p2-athug,#companies-main .p2-d1,#companies-main .p2-d2,#companies-main .p2-d3{grid-column:1!important;grid-row:auto!important}' +
    '#companies-main .p2-mynd{order:4}#companies-main .p2-athug{order:5;margin-top:0;padding:10px 14px 14px}' +
    '#companies-main .p2-kv .k{width:96px}' +
    '#companies-main .p2-kpi{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
    '#companies-main .p2-kp-taeki,#companies-main .p2-kp-bk{grid-column:1/-1;grid-row:auto!important}' +
    '#companies-main .p2-kpi{padding:10px 6px!important;gap:10px!important}' +
    G + ' .p2-glugg{padding:18px 12px 30px!important}' + G + ' .p2-glugg::before{left:6px;right:6px;bottom:10px}' + G + ' .p2-glugg::after{left:8px;right:8px;bottom:12px}' +
    G + ' .p2-dalk{border-bottom-color:rgba(255,255,255,.1)!important}' +
    '#companies-main .p2-kpi > .p2-kp:not(.p2-kp-kerfi):not(.p2-kp-taeki):not(.p2-kp-bk):nth-last-child(2):nth-child(odd){grid-column:1/-1}' +
    '#companies-main .p2-kp .lb{font-size:13px!important}' +
    G + ' .p2-kpi > .p2-kp:not(.p2-kp-taeki):not(.p2-kp-bk) .big:not(.ord){font-size:30px!important}' +
    G + ' .p2-kpi > .p2-kp .big.ord{font-size:24px!important}' +
    '#companies-main .p2-kp .sm,#companies-main .p2-kp .ft,#companies-main .p2-kp .leg2,#companies-main .p2-kp .aths{font-size:15px!important}' +
    '#companies-main .p2-kp .flis3 small{font-size:12px!important}' +
    '#companies-main .p2-kp .flis3 b{font-size:15px!important}' +
    '#companies-main .p2-kp .flis3 span{height:58px!important}' +
    '#companies-main .p2-kp .man{font-size:12.5px!important;height:26px!important}' +
    '#companies-main .p2-kp-kerfi .kf b{font-size:15px!important}#companies-main .p2-kp-kerfi .kf small{font-size:12.5px!important}#companies-main .p2-kp-kerfi .kf{height:56px!important}' +
    '#companies-main .p2-mono{display:none}' +
    '#companies-main .p2-dalk{border-right:0;border-bottom:1px solid #c3cad5;padding:0 14px 10px;margin-bottom:10px}' +
    '#companies-main .p2-mynd{padding:0 14px}' +
    '#companies-main .p2-mynd .ram{min-height:170px}' +
    '#companies-main .p2-samsk .gr{grid-template-columns:1fr}' +
    '#companies-main .p2-samsk .c1{flex-direction:row;flex-wrap:wrap}' +
    '#companies-main .p2-samsk .c1 .kass{flex:1 0 100%}' +
    '#companies-main .p2-samsk .c1 .p2-til{flex:1 1 140px}' +
    '#companies-main .p2-flipar{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}' +
    '#companies-main .p2-flipar button{flex:none;height:44px;white-space:nowrap}' +
    '#companies-main .p2-tbl .rad{grid-template-columns:1fr 1fr}' +
    '#companies-main .p2-tbl .rad.hd{display:none}' +
    '#companies-main .p2-teikn .hl{flex-direction:column;gap:2px}' +
    '#companies-main ._afsl-box ._ahop-sel{max-width:100%;min-width:0;box-sizing:border-box}' +
    '#companies-main .p2-til{min-height:44px}' +
    /* síminn: myndin efst, undir hausnum (Agnar 19.11.2026) */
    '#companies-main .p2-msimi{display:block;padding:12px 12px 4px;background:linear-gradient(180deg,#e8ebf0,#d6dbe3);border-top:1px solid #000}' +
    '#companies-main .p2-msimi .p2-mynd{padding:0}' +
    '#companies-main .p2-msimi .p2-mynd .ram{min-height:220px}' +
    '#companies-main .p2-glugg .p2-mynd{display:none}';

  function stilar() {
    if (document.getElementById('p2-css')) return;
    var s = document.createElement('style');
    s.id = 'p2-css';
    // 26.11.2026 (Agnar: heimilisfang „Völuteigur 29" braut einn staf á línu á síma): 4-dálka p2-glugg með föstum 520px
    // myndadálki sveltir textadálkana — mælt braut gildi staf-fyrir-staf undir ~1000px gáma (27 línur við 800), og
    // collapse-markið var aðeins 760px. Hækkað í 1100px svo þröng/símabreidd falli í hreina 1-dálks NARROW-útlitið.
    s.textContent = css + '#companies-main.p2{container:p2c/inline-size}@container p2c (max-width:1100px){' + NARROW + '}@media (max-width:900px){' + NARROW + '}';
    document.head.appendChild(s);
  }

  /* ---------- lestur úr gamla prófílnum (sami DOM, sömu tölur) ---------- */
  /* textContent, ekki innerText: innerText þvingar útlitsreikning (reflow) og lesa() keyrir í hverju tifi */
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function sel(m, s) { return m.querySelector(s); }
  function allt(m, s) { return Array.prototype.slice.call(m.querySelectorAll(s)); }
  function tugir(n) { var p = String(n).replace(',', '.').split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  var MAN = { 'janúar': 1, 'febrúar': 2, 'mars': 3, 'apríl': 4, 'maí': 5, 'júní': 6, 'júlí': 7, 'ágúst': 8, 'september': 9, 'október': 10, 'nóvember': 11, 'desember': 12 };
  function dd(n) { return (n < 10 ? '0' : '') + n; }

  function lesa(m) {
    var nE = sel(m, '.co-banner-name'); var nafn = '';
    if (nE) { for (var n = nE.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) nafn += n.textContent; nafn = nafn.replace(/\s+/g, ' ').trim() || txt(nE); }
    var rfE = nE ? sel(nE, '[data-rf-opna]') : null;
    var d = { nafn: nafn, mono: txt(sel(m, '.co-banner-mono')), rf: rfE ? txt(rfE).replace(/^[^A-Za-zÁ-ÿ0-9]+/, '') : '' };
    var ktE = sel(m, '.co-banner-kt');
    var km = ktE ? /\d{6}-\d{4}/.exec(ktE.textContent) : null;
    d.kt = km ? km[0] : '';
    d.tenglar = ktE ? allt(ktE, 'a').map(function (a) { return { t: txt(a), href: a.getAttribute('href'), title: a.getAttribute('title') || '' }; }) : [];
    var pl = sel(m, '.b405-plata');
    d.plata = pl ? { t: txt(pl), st: pl.getAttribute('data-st') || '' } : null;
    /* staðreyndalínan: heimilisfang · sími · netfang (+N) */
    d.heimilisfang = ''; d.simi = ''; d.netfang = ''; d.fleiri = '';
    allt(m, '.co-banner-facts > span').forEach(function (sp) {
      var a = sel(sp, 'a'); var t = txt(a || sp).replace(/^[^A-Za-zÁ-ÿ0-9+@]+/, '');
      if (/@/.test(t)) { d.netfang = t; var b = sel(sp, '._anf-takki'); d.fleiri = b ? txt(b) : ''; }
      else if (/^[+\d][\d\s\-+]{5,}$/.test(t)) d.simi = t;
      else if (t && !d.heimilisfang) d.heimilisfang = t;
    });
    /* húsið og einingar: reitirnir í 363 (inputs) */
    d.hus = {};
    allt(m, '.co-bupp ._bupp-talapar').forEach(function (tp) {
      var e = txt(sel(tp, '._bupp-eining')); var inp = sel(tp, 'input');
      if (e && inp && String(inp.value).trim() !== '') d.hus[e] = String(inp.value).trim();
    });
    d.tengilidur = ''; d.afslattur = '';
    allt(m, '.co-bupp ._bupp-lina').forEach(function (l) {
      var mk = txt(sel(l, '._bupp-merki')).toLowerCase();
      if (mk === 'tengiliður') { var i = sel(l, 'input'); if (i && i.value.trim()) d.tengilidur = i.value.trim(); }
      if (mk === 'afsláttur') d.afslattur = txt(sel(l, '._bupp-afsl'));
    });
    /* búnaður og skoðun: tækjalistinn (404) — sama lína og gamli prófíllinn sýnir */
    var ul = sel(m, '.uttekt-col-l'); var ult = ul ? txt(ul) : '';
    var mt = /(\d+)\s*slökkvitæki/i.exec(ult);
    d.nSlt = mt ? parseInt(mt[1], 10) : 0;
    d.flokkar = allt(m, '.ut-grp-h').map(txt);
    var naest = null, sidast = 0, utrunnin = 0, idag = new Date(); idag.setHours(0, 0, 0, 0);
    allt(m, '.ut-row').forEach(function (r) {
      var nb = sel(r, '.b404-naest'); var x = nb ? /(\d{2})\/(\d{2})\/(\d{4})/.exec(nb.textContent) : null;
      if (x) { var dt = new Date(+x[3], +x[2] - 1, +x[1]); if (!naest || dt < naest) naest = dt; if (dt < idag) utrunnin++; }
      var ls = sel(r, '.ut-last'); var y = ls ? /[’'](\d{2})/.exec(ls.textContent) : null;
      if (y) sidast = Math.max(sidast, 2000 + parseInt(y[1], 10));
    });
    d.naest = naest ? dd(naest.getDate()) + '/' + dd(naest.getMonth() + 1) + '/' + naest.getFullYear() : '';
    d.utrunnin = utrunnin;
    var pmE = sel(m, '.sk-month-pill'); var pm = /skoðun\s*(\S+)/i.exec(pmE ? (pmE.textContent || '') : '');
    var mn = pm ? MAN[pm[1].toLowerCase()] : 0;
    d.sidast = (sidast && mn) ? dd(mn) + '/' + sidast : (sidast ? String(sidast) : '');
    d.skodMan = (pm && MAN[pm[1].toLowerCase()]) ? pm[1].charAt(0).toUpperCase() + pm[1].slice(1).toLowerCase() : '';
    d.samn = [];
    var im = sel(m, '.co-mynd img'); d.mynd = im ? im.getAttribute('src') : '';
    var gE = sel(m, '.b486-gatt'); d.gatt = gE ? { href: gE.getAttribute('href'), t: txt(gE) || 'Þjónustugátt ↗' } : null;
    var sc = sel(m, '._samskipti-card');
    if (sc) {
      var tl = allt(sc, '._skx-tile');
      var flis = function (re) { for (var i = 0; i < tl.length; i++) if (re.test(txt(sel(tl[i], 'b')))) return tl[i]; return null; };
      var fOpin = flis(/^opin mál/i), fTeng = flis(/^tengili/i);
      var tSpan = fTeng ? txt(sel(fTeng, 'span')) : '', tSmall = fTeng ? txt(sel(fTeng, 'small')) : '';
      var allTeng = (tSpan + ' ' + tSmall);
      var netf = (allTeng.match(/[^\s,·]+@[^\s,·]+/) || [''])[0];
      var simi = ((tSmall.match(/\+?\d[\d\s-]{5,}\d/) || [''])[0]).trim();
      var telA = fTeng ? sel(fTeng, 'a[href^="tel:"]') : null;
      var ny = sel(sc, '._skx-nyjast'); var meta = ny ? allt(ny, '._skx-meta > span') : [];
      d.sam = {
        tala: txt(sel(sc, '.b405-talning .tala')),
        opin: { a: fOpin ? txt(sel(fOpin, 'span')) : '', b: fOpin ? txt(sel(fOpin, 'small')) : '' },
        tengi: { nafn: (tSpan && !/@/.test(tSpan)) ? tSpan : '', a: netf, b: simi, tel: telA ? telA.getAttribute('href') : '' },
        has: { svara: !!sel(sc, '._skx-svara'), nyr: !!sel(sc, '._skx-nyr'), mark: !!sel(sc, '._ssk-mark'), saga: !!sel(sc, '._ssk-toggle'), meira: !!sel(sc, '.b411-samsk-meira') },
        fra: meta.filter(function (x) { return x.className.indexOf('_skx-chip') < 0 && !/^·$/.test(txt(x)); }).slice(0, 2).map(txt),
        chips: meta.filter(function (x) { return /kunni|okkur|osvarad/.test(x.className); }).map(txt),
        subj: ny ? txt(sel(ny, '._skx-subj')).replace(/[▾▸]\s*$/, '').trim() : '',
        txt: ny ? txt(sel(ny, '._skx-txt')) : '',
        sigs: allt(sc, '._smx-sig').map(txt),
        imp: txt(sel(sc, '._smx-imp'))
      };
    } else d.sam = null;
    /* Aðrar þjónustur: kerfin úr „Kerfi og þjónusta" (450, title = „Heiti · Krafa · Hver — staða") án slökkvitækja og brunakerfis */
    d.thj = allt(m, '#_kt450 .kt-raema .kt-k').map(function (c) {
      var p = (c.getAttribute('title') || '').split(' · ');
      var rest = (p[2] || '').split(' — ');
      return { heiti: p[0] || txt(c), krafa: p[1] || '', hver: rest[0] || '', stada: rest[1] || '', led: /rautt/.test((sel(c, 'i') || {}).className || '') ? 'rd' : (/graent/.test((sel(c, 'i') || {}).className || '') ? 'ok' : 'am') };
    }).filter(function (x) { return x.heiti && !/^(Slökkvitæki|Brunaviðvörunarkerfi)$/i.test(x.heiti); });
    d.kerfi = allt(m, '#_kt450 .kt-raema .kt-k').map(function (c) {
      var p = (c.getAttribute('title') || '').split(' · '); var rest = (p[2] || '').split(' — ');
      return { heiti: p[0] || txt(c), stutt: txt(c), krafa: p[1] || '', hver: rest[0] || '', stada: rest[1] || '' };
    }).filter(function (x) { return x.heiti; });
    d.kerfiFl = txt(sel(m, '#_kt450 .kt-raema .ssp-plata[title="Notkunarflokkur"]'));
    var bkT = sel(m, '#_sks-tabs ._sks-tab[data-flipi="bru"] ._sks-tu');
    var _fid = window._currentCompanyId;
    var _bkAll = (window.AppSettings && AppSettings.path) ? (AppSettings.path('brunakerfi_customers') || {}) : {};
    d.bkc = (_fid && _bkAll[_fid] && typeof _bkAll[_fid] === 'object') ? _bkAll[_fid] : null;
    d.bkSk = _fid ? bkSkyrsla(_fid) : null;
    if (bkT) { var bt = txt(bkT); var be = /(\d+)\s*eining/.exec(bt); d.bk = { undir: bt, ein: be ? be[1] : '' }; } else d.bk = null;
    /* tæki eftir tegund OG stærð: hver lína tækjalistans (404 .ut-t, t.d. „Léttvatn 6 L") */
    d.gerdir = {};
    allt(m, '.ut-row .ut-t').forEach(function (e) { var k = txt(e); if (k) d.gerdir[k] = (d.gerdir[k] || 0) + 1; });
    /* skjöl og hreyfingar (403): talning í haus + reikningalínur */
    var sk = sel(m, '._dyg-section .b403-skyring');
    if (sk) { var sb = allt(sk, 'b').map(txt); var ad = /(\d+)\s*skjöl/.exec(txt(sel(sk, '.dauf'))); d.skjol = { komin: +(sb[0] || 0), vinnsla: +(sb[1] || 0), vantar: +(sb[2] || 0), alls: ad ? +ad[1] : 0 }; } else d.skjol = null;
    /* kreditað að hluta (199: „kreditað að hluta −N kr“): sama frádráttur og samtalan í 199 — annars teldi spjaldið kreditaða upphæðina enn með */
    var kreditHluti = function (el) { var n = 0; (el || []).forEach(function (e) { if (/hluta/i.test(txt(e))) { var v = parseInt(txt(e).replace(/[^\d]/g, ''), 10); if (v > 0) n += v; } }); return n; };
    d.hreyf = allt(m, '._dyg-section .b403-hreyf .b403-skjal-lina.hreyf').map(function (r) {
      var u = txt(sel(r, '.upph')).replace(/[^\d]/g, '');
      return { teg: txt(sel(r, '.teg')), dags: txt(sel(r, '.dags')), nr: txt(sel(r, 'a.sk-doc.inv')), upph: u ? parseInt(u, 10) : 0, greitt: !!sel(r, '.s-greitt') || /greitt/i.test(txt(r)), kredit: !!sel(r, '.kredit'), hluti: kreditHluti(allt(r, '.s-kredit')) };
    });
    d.hreyfAlls = ''; allt(m, '._dyg-section .b403-kafli .b403-hint').forEach(function (e) { var t = txt(e); if (!d.hreyfAlls && /^[\d.]+\s*kr$/.test(t)) d.hreyfAlls = t; });
    if (!d.hreyf.length) {
      /* síminn: 403 teiknar ársblokkir (.sk-yrblock) í stað hreyfingalistans */
      allt(m, '._dyg-section .sk-yrblock').forEach(function (bl) {
        var ar = (sel(bl, '.sk-yr') || {}).getAttribute ? sel(bl, '.sk-yr').getAttribute('data-yr') : '';
        allt(bl, '.sk-svc-card').forEach(function (c) {
          var nr = sel(c, 'a.sk-doc.inv'); if (!nr) return;
          var u = txt(sel(c, '.sk-svc-amt')).replace(/[^\d]/g, '');
          d.hreyf.push({ teg: /brunakerfi/i.test(txt(sel(c, '.sk-svc-hd'))) ? 'Brunakerfi' : 'Slökkvitæki', dags: ar || '', nr: txt(nr).replace(/[^\w-]/g, ''), upph: u ? parseInt(u, 10) : 0, greitt: !!sel(c, '.s-greitt'), kredit: !!sel(c, '.sk-doc.inv.kredit'), hluti: kreditHluti(allt(c, '.s-kredit')) });
        });
      });
    }
    d.bgm = txt(sel(m, '#_bgm477 [data-bgm="undir"]'));
    d.bs = {};
    var bsB = sel(m, '#_bs468 [data-bs="buk"]');
    if (bsB) { var hold = document.createElement('div'); hold.innerHTML = bsB.getAttribute('data-html') || bsB.innerHTML; allt(hold, '.ssp-lina').forEach(function (l) { var k = txt(sel(l, '.ssp-merki')), v = txt(sel(l, '.ssp-gildi')); if (k && v) d.bs[k.toLowerCase()] = v; }); }
    var srE = sel(m, '._serupp[data-sig]'); d.seruppN = 0;
    if (srE) { try { JSON.parse(srE.getAttribute('data-sig')).forEach(function (x) { d.seruppN += +x.fjoldi || 0; }); } catch (e) {} }
    d.teiknN = allt(m, '._bupp-teikn-inn ._bupp-teikn').length;
    d.fl = txt(sel(m, '#_kt450 .kt-raema .ssp-plata[title="Notkunarflokkur"]'));
    var ktTxt = txt(sel(m, '#_kt450')); var rk = /(\d+)\s*reykskynjarar/.exec(ktTxt); d.reykTeikn = rk ? +rk[1] : 0;
    d.teikn = txt(sel(m, '._bupp-teikn-inn'));
    d.serupp = txt(sel(m, '._serupp-inn'));
    return d;
  }

  /* ---------- umboð: smellur á upprunalega takkann ---------- */
  function umbod(m, sel1, textRe) {
    var els = allt(m, sel1);
    for (var i = 0; i < els.length; i++) { if (!textRe || textRe.test(txt(els[i]) || els[i].getAttribute('aria-label') || '')) { els[i].click(); return true; } }
    return false;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kv(k, v, bekkur) { return v ? '<div class="p2-kv"><span class="k">' + esc(k) + '</span><span class="v' + (bekkur || '') + '">' + v + '</span></div>' : ''; }
  var HAK = '<span class="p2-ck"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>';

  function haus(d) {
    var skS = d.naest ? (d.utrunnin ? 'rd' : 'ok') : '';
    var skTxt = d.utrunnin ? d.utrunnin + ' útrunnin' : 'Í lagi';
    var skod = (d.naest || d.sidast)
      ? '<div class="p2-skod" data-s="' + skS + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7fe0a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><div><b>' + esc(d.naest ? skTxt : 'Skoðun') + '</b><small>' + (d.sidast ? 'síðast ' + esc(d.sidast) : '') + (d.sidast && d.naest ? ', ' : '') + (d.naest ? 'næst ' + esc(d.naest) : '') + '</small></div></div>' : '';
    var lh = '<button type="button" class="p2-til" data-p2="til" aria-label="Til baka">‹ Til baka</button>' +
      '<div class="p2-mono">' + esc(d.mono || (d.nafn || '?').slice(0, 2).toUpperCase()) + '</div>' +
      '<div class="p2-nm" style="min-width:0;flex:1"><h1 class="p2-nafn">' + esc(d.nafn) + '</h1><div class="p2-ktlina">' +
      (d.kt ? '<span>kt. ' + esc(d.kt) + '</span>' : '') +
      d.tenglar.map(function (a) { return '<a class="p2-merki" href="' + esc(a.href) + '" target="_blank" rel="noopener" title="' + esc(a.title) + '">' + esc(a.t) + '</a>'; }).join('') +
      (d.gatt && d.gatt.href ? '<a class="p2-merki" href="' + esc(d.gatt.href) + '" target="_blank" rel="noopener" title="Opna gáttina á þessa eign">' + esc(d.gatt.t) + '</a>' : '') +
      (d.plata ? '<span class="p2-plata" data-st="' + esc(d.plata.st) + '">' + esc(d.plata.t) + '</span>' : '') + '</div></div>' +
      skod + bkMerki(d) + '<button type="button" class="p2-til" data-p2="breyta">Breyta</button><button type="button" class="p2-til" data-p2="meira" aria-label="Fleiri aðgerðir" aria-haspopup="menu">⋯</button>';
    return lh;
  }

  /* ── BRUNAKERFI (Agnar 19.11.2026: „vantar alveg upplýsingarnar um brunakerfin … hvenær skoðað, í hvaða mánuði,
     fjöldi eininga … mánuðinn grænan, gulan fyrir núverandi mánuð óskoðaðan og rauðan ef skoðun er komin fram yfir“).
     Heimildir, allar LESNAR: áskriftarkortið AppSettings.brunakerfi_customers[fid] (unit_count, inspect_month,
     last_inspected, in_progress_year, notes, revenue_ÁÁÁÁ), flísin í þjónustuflipa 274, og nýjasta röð
     brunakerfi_skyrslur (year, status draft/final). Ekkert skrifað. */
  var MAN_STUTT = ['Jan', 'Feb', 'Mar', 'Apr', 'Maí', 'Jún', 'Júl', 'Ágú', 'Sep', 'Okt', 'Nóv', 'Des'];
  var _bkSk = {};
  function bkSkyrsla(fid) {
    if (Object.prototype.hasOwnProperty.call(_bkSk, fid)) return _bkSk[fid];
    _bkSk[fid] = null;
    try {
      var sb = window.DB && DB.sb; if (!sb) return null;
      sb.from('brunakerfi_skyrslur').select('year,status,uttekt_nr,updated_at').eq('fyrirtaeki_id', +fid).order('year', { ascending: false }).limit(1)
        .then(function (r) { var x = r && r.data && r.data[0]; _bkSk[fid] = x ? { ar: x.year, status: x.status, nr: x.uttekt_nr || '' } : { ar: 0 }; }, function () {});
    } catch (e) {}
    return null;
  }
  function tv(n) { return (n < 10 ? '0' : '') + n; }
  function dmy(dt) { return tv(dt.getDate()) + '/' + tv(dt.getMonth() + 1) + '/' + dt.getFullYear(); }
  /* Mánaðarstaða: g = búið í ár eða ekki komið að, y = líðandi mánuður og óskoðað, r = mánuðurinn liðinn og óskoðað */
  function manStada(M, buid) {
    if (!M) return '';
    var cm = new Date().getMonth() + 1;
    if (buid) return 'g';
    if (cm === M) return 'y';
    return cm > M ? 'r' : 'g';
  }
  function bkStada(d) {
    var c = d.bkc;
    if (!d.bk && !c) return null;
    var Y = new Date().getFullYear(), cm = new Date().getMonth() + 1;
    var kerfi = d.bk ? (d.bk.undir || '').split(' · ')[0] : '';
    if (!kerfi || /eining/.test(kerfi)) kerfi = 'Brunaviðvörunarkerfi';
    var last = null;
    if (c && c.last_inspected) { var q = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.last_inspected); if (q) last = new Date(+q[1], +q[2] - 1, +q[3]); }
    if (!last && d.bk) { var x = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d.bk.undir || ''); if (x) last = new Date(+x[3], +x[2] - 1, +x[1]); }
    var M = (c && +c.inspect_month) || (last ? last.getMonth() + 1 : 0);
    var ein = (c && +c.unit_count) || (d.bk && +d.bk.ein) || 0;
    var sk = d.bkSk;
    var buid = !!(last && last.getFullYear() === Y) || !!(sk && sk.ar === Y && sk.status === 'final');
    var st = manStada(M, buid);
    if (!st) st = (last && (new Date() - new Date(last.getFullYear() + 1, last.getMonth(), last.getDate())) > 0) ? 'r' : 'g';
    var gjalddagi = M ? new Date(Y, M, 0) : (last ? new Date(last.getFullYear() + 1, last.getMonth(), last.getDate()) : null);
    var idag = new Date(); idag.setHours(0, 0, 0, 0);
    var dagar = (st === 'r' && gjalddagi) ? Math.max(1, Math.round((idag - gjalddagi) / 864e5)) : 0;
    var naestAr = (buid || (M && M < cm)) ? Y + 1 : Y;
    if (st === 'r' || st === 'y') naestAr = Y;
    var skAr = (!last && sk && sk.ar && sk.status === 'final') ? String(sk.ar) : '';
    return { kerfi: kerfi, ein: ein, M: M, last: last ? dmy(last) : '', lastS: last ? tv(last.getDate()) + '/' + tv(last.getMonth() + 1) + '/' + String(last.getFullYear()).slice(2) : skAr, buid: buid, st: st, dagar: dagar,
      naest: M ? MAN_STUTT[M - 1] + ' ' + naestAr : '', ivinnslu: !buid && !!(c && +c.in_progress_year === Y),
      notes: (c && c.notes) || '', velta: c ? +c['revenue_' + Y] || 0 : 0, veltaF: c ? +c['revenue_' + (Y - 1)] || 0 : 0, sk: sk, Y: Y };
  }
  function bkMerki(d) {
    var b = bkStada(d); if (!b) return '';
    var t = b.st === 'r' ? b.Y + ' óskoðað' : b.st === 'y' ? 'Á dagskrá núna' : b.buid ? 'Skoðað ' + b.Y : 'Í lagi';
    return '<div class="p2-merkid' + (b.st === 'r' ? ' rd' : b.st === 'y' ? ' am' : '') + '"><div><div class="t">BRUNAKERFI</div><b>' + esc(t) + '</b>' + (b.last ? '<small>síðast ' + esc(b.last) + '</small>' : '') + '</div></div>';
  }
  function manPilla(M, st, titill) {
    if (!M) return '';
    return '<span class="man st-' + (st || 'g') + '" title="' + esc(titill + ': ' + MAN_STUTT[M - 1] + (st === 'r' ? ' — komið fram yfir' : st === 'y' ? ' — líðandi mánuður, óskoðað' : '')) + '">' + MAN_STUTT[M - 1] + '</span>';
  }
  /* 12 hólfa mánaðarborði: skoðunarmánuður litaður eftir stöðu, líðandi mánuður með ramma */
  function manBordi(M, st) {
    var cm = new Date().getMonth() + 1, h = '';
    for (var i = 1; i <= 12; i++) h += '<i class="' + (i === M ? 'on st-' + st : '') + (i === cm ? ' nu' : '') + '" title="' + MAN_STUTT[i - 1] + '"></i>';
    return '<div class="mbord" role="img" aria-label="Skoðunarmánuður ' + (M ? MAN_STUTT[M - 1] : 'óþekktur') + ', líðandi mánuður ' + MAN_STUTT[cm - 1] + '">' + h + '</div>';
  }
  function fx(t) { return '<span class="fx">' + esc(t) + '</span>'; }
  function kr(n) { return tugir(n) + ' kr'; }

  function kpi(d) {
    var k = [];
    /* Agnar 19.11.2026: brunaslöngur og reykskynjarar teljast með í tækjatölunni, eins og í tækjalistanum; slökkvitæki fyrst, svo slöngur, svo skynjarar */
    var _hop = function (g) { return /slang|slöng|kefli/i.test(g) ? 1 : /reykskynj/i.test(g) ? 2 : 0; };
    var teg = Object.keys(d.gerdir).sort(function (a, b) { return (_hop(a) - _hop(b)) || (d.gerdir[b] - d.gerdir[a]); });
    var nT = teg.reduce(function (s, g) { return s + d.gerdir[g]; }, 0);
    var LIT = ['#0ea5e9', '#b91c1c', '#6b0b0b', '#2563eb', '#16783f', '#845400'];
    /* litur eftir TEGUND, eins og í tækjalistanum: léttvatn blátt, CO₂ rautt, duft gult, froða grænt; dekkri tónn fyrir næstu stærð */
    var _tegN = {};
    function litur(g, i) {
      var k = /slang|slöng|kefli/i.test(g) ? 's' : /reykskynj/i.test(g) ? 'r' : /létt|vatn/i.test(g) ? 'v' : /co/i.test(g) ? 'c' : /duft|abc/i.test(g) ? 'd' : /froð|foam/i.test(g) ? 'f' : /feit|f-?flokk|wet/i.test(g) ? 'w' : '';
      var T = { s: ['#14b8a6', '#0f766e'], r: ['#8a93a3', '#4a5363'], v: ['#0ea5e9', '#0369a1'], c: ['#dc2626', '#7f1d1d'], d: ['#e0a020', '#9a6a14'], f: ['#16a34a', '#14532d'], w: ['#7c3aed', '#4c1d95'] };
      if (!k) return LIT[i % LIT.length];
      if (_tegN[g] == null) { _tegN[g] = Object.keys(_tegN).filter(function (x) { return _tegN[x].k === k; }).length; _tegN[g] = { k: k, n: _tegN[g] }; }
      return T[k][Math.min(_tegN[g].n, 1)];
    }
    /* Agnar 19.11.2026: „breikka þann glugga og setja slöngur og reyksk inn í hann“ — einn kassi; staðan á því
       sem er ekki skráð (kefli óvituð, reykskynjarar á teikningu) stendur neðst í honum í stað sérkassa. */
    var slong = 0, reyk = 0;
    Object.keys(d.gerdir).forEach(function (g) { if (/slang|slöng|kefli/i.test(g)) slong += d.gerdir[g]; else if (/reykskynj/i.test(g)) reyk += d.gerdir[g]; });
    var kefli = d.thj.filter(function (x) { return /slöngukefli/i.test(x.heiti); })[0];
    var reykK = d.thj.filter(function (x) { return /^reykskynjarar/i.test(x.heiti); })[0];
    var aths = [];
    if (!slong && kefli) aths.push('Brunaslöngur: ' + (kefli.hver + ' — ' + kefli.stada).toLowerCase());
    if (!reyk && d.reykTeikn) aths.push(d.reykTeikn + ' reykskynjarar á teikningu, 0 skráðir');
    else if (!reyk && reykK) aths.push('Reykskynjarar: ' + (reykK.hver + ' — ' + reykK.stada).toLowerCase());
    /* Agnar 19.11.2026 (mynd: ör frá „Síðasta úttekt“ inn í tækjaplötuna): „brunakerfið fær aðeins of mikla athygli miðað
       við slökkvitæki … láta slökkvitæki vera svipað uppbyggt og brunakerfið“. Slökkvitækjaplatan ber nú sömu lög og
       brunakerfisplatan: staða, mánaðarborði, þrjár flísar, tækjasúla og síðasta úttekt. Sérplata úttektar fellur út. */
    var Ms = MAN[(d.skodMan || '').toLowerCase()] || 0, Ys = new Date().getFullYear();
    var buidS = /(\d{4})$/.test(d.sidast || '') && +/(\d{4})$/.exec(d.sidast)[1] === Ys;
    var stS = manStada(Ms, buidS) || (d.utrunnin ? 'r' : 'g');
    var dagS = 0; if (stS === 'r' && Ms) { var idS = new Date(); idS.setHours(0, 0, 0, 0); dagS = Math.max(1, Math.round((idS - new Date(Ys, Ms, 0)) / 864e5)); }
    var su = d.hreyf.filter(function (r) { return /úttekt|slökkvitæk/i.test(r.teg) && r.upph && !r.kredit; })[0] || d.hreyf.filter(function (r) { return r.upph && !r.kredit; })[0];
    if (nT) {
      var storS = stS === 'r' ? (dagS ? '<div><span class="big">+' + dagS + '</span> <span class="bigl">dagar yfir</span></div>' : '<div><span class="big">' + d.utrunnin + '</span> <span class="bigl">útrunnin</span></div>')
        : stS === 'y' ? '<div><span class="big ord">Á dagskrá</span></div>'
        : buidS ? '<div><span class="big ord">Skoðað ' + Ys + '</span></div>'
        : '<div><span class="big ord">Í lagi</span></div>';
      k.push('<div class="p2-kp p2-kp-taeki"><div class="cap ' + (stS === 'r' ? 'r' : stS === 'y' ? 'y' : 'g') + '"></div><div class="in"><div class="khd"><span class="lb">Slökkvitæki</span>' + manPilla(Ms, stS, 'Skoðunarmánuður slökkvitækja') + '</div>' +
        storS + manBordi(Ms, stS) +
        '<div class="flis3"><span><small>Tæki</small><b class="p2-n">' + nT + '</b></span><span><small>Síðast</small><b class="p2-n">' + esc(d.sidast || '—') + '</b></span><span><small>Næst</small><b class="p2-n">' + esc(d.naest || '—') + '</b></span></div>' +
        '<div class="bar2" role="img" aria-label="' + esc(teg.map(function (g) { return g + ' ' + d.gerdir[g]; }).join(', ')) + '">' + teg.map(function (g, i) { return '<i style="flex:' + d.gerdir[g] + ' 1 0;background:' + litur(g, i) + '"></i>'; }).join('') + '</div>' +
        '<div class="leg2">' + teg.slice(0, 8).map(function (g, i) { return '<span><i class="dot" style="background:' + litur(g, i) + '"></i>' + esc(g) + ' <b class="p2-n">' + d.gerdir[g] + '</b></span>'; }).join('') + '</div>' +
        (teg.length > 8 ? '<span class="ft">+' + (teg.length - 8) + ' gerðir í viðbót</span>' : '') +
        (su ? '<span class="sm"><span class="fx">Síðasta úttekt <b class="p2-n">' + tugir(su.upph) + ' kr</b></span>' + [su.nr, su.dags].filter(Boolean).map(fx).join('') + (su.greitt ? '<span class="p2-pl">Greitt</span>' : '') + '</span>' : '') +
        (d.utrunnin && stS !== 'r' ? '<span class="sm"><span class="p2-pl rd">' + d.utrunnin + ' útrunnin</span></span>' : '') +
        (aths.length ? '<div class="aths">' + aths.map(function (a) { return '<span>' + esc(a) + '</span>'; }).join('') + '</div>' : '') + '</div></div>');
    }
    var b = bkStada(d);
    if (b) {
      var stor = b.st === 'r' ? '<div><span class="big">+' + b.dagar + '</span> <span class="bigl">dagar yfir</span></div>'
        : b.st === 'y' ? '<div><span class="big ord">Á dagskrá</span></div>'
        : b.buid ? '<div><span class="big ord">Skoðað ' + b.Y + '</span></div>'
        : '<div><span class="big ord">Í lagi</span></div>';
      var skTxt = b.sk && b.sk.ar ? 'Skýrsla ' + b.sk.ar + ': ' + (b.sk.status === 'final' ? 'lokið' : 'drög') + (b.sk.nr ? ' · nr ' + b.sk.nr : '') : 'Engin skýrsla ' + b.Y + ' enn';
      k.push('<div class="p2-kp p2-kp-bk"><div class="cap ' + (b.st === 'r' ? 'r' : b.st === 'y' ? 'y' : 'g') + '"></div><div class="in"><div class="khd"><span class="lb">Brunakerfi</span>' + manPilla(b.M, b.st, 'Skoðunarmánuður brunakerfis') + '</div>' +
        stor + manBordi(b.M, b.st) +
        '<div class="flis3"><span><small>Einingar</small><b class="p2-n">' + (b.ein || '—') + '</b></span><span><small>Síðast</small><b class="p2-n" title="' + esc(b.last) + '">' + esc(b.lastS || '—') + '</b></span><span><small>Næst</small><b class="p2-n">' + esc(b.naest || '—') + '</b></span></div>' +
        '<span class="sm">' + fx(b.kerfi) + fx(skTxt) + (b.ivinnslu ? '<span class="p2-pl am">Í vinnslu ' + b.Y + '</span>' : '') + '</span>' +
        (b.velta || b.veltaF ? '<span class="sm"><span class="fx">Velta ' + b.Y + ' <b class="p2-n">' + tugir(b.velta) + ' kr</b></span>' + (b.veltaF ? fx((b.Y - 1) + ': ' + tugir(b.veltaF) + ' kr') : '') + '</span>' : '') +
        (b.notes ? '<span class="nota" title="' + esc(b.notes) + '">„' + esc(b.notes.length > 70 ? b.notes.slice(0, 68) + '…' : b.notes) + '“</span>' : '') +
        '</div></div>');
    }
    /* Agnar 19.11.2026: „afhverju 2025, en ekki 2026“ → líðandi ár; fyrra ár stendur undir til samanburðar */
    var ar = new Date().getFullYear(), slt = 0, bkr = 0, fyrra = 0;
    /* 23.11.2026: kreditfærður reikningur (.kredit, yfirstrikaður í 403/199) er EKKI velta — spjald sýndi 78.680 kr þegar R-001340 var kreditfærður og R-001341 kominn í staðinn (rétt: 39.340). Sama regla og „alls“ í 403 og Ársskoðun. */
    d.hreyf.forEach(function (r) { if (r.kredit) return; var u = Math.max(0, (r.upph || 0) - (r.hluti || 0)); var y = /(\d{4})\s*$/.exec(r.dags); if (!y) return; if (+y[1] === ar - 1) { fyrra += u; return; } if (+y[1] !== ar) return; if (/brunakerfi/i.test(r.teg)) bkr += u; else slt += u; });
    if (slt + bkr || fyrra) k.push('<div class="p2-kp"><div class="cap s"></div><div class="in"><span class="lb">Viðskipti ' + ar + '</span><div><span class="big">' + tugir(slt + bkr) + '</span> <span class="bigl">kr</span></div>' +
      (slt && bkr ? '<div class="bar" role="img" aria-label="Slökkvitæki og brunakerfi"><i style="width:' + (100 * slt / (slt + bkr)).toFixed(1) + '%;background:#16783f"></i><i style="width:' + (100 * bkr / (slt + bkr)).toFixed(1) + '%;background:#a01818"></i></div><span class="sm">' + fx('Slt ' + tugir(slt)) + fx('Bk ' + tugir(bkr)) + '</span>' : '') +
      (fyrra ? '<span class="sm"><span class="fx">' + (ar - 1) + ' <b class="p2-n">' + tugir(fyrra) + ' kr</b></span>' + (slt + bkr ? fx((slt + bkr >= fyrra ? '▲ ' : '▼ ') + Math.round(100 * (slt + bkr) / fyrra) + '% af ' + (ar - 1)) : '') + '</span>' : '') +
      (d.hreyfAlls ? '<span class="ft">alls ' + esc(d.hreyfAlls) + '</span>' : '') + '</div></div>');
    if (d.skjol && d.skjol.alls) { var S = d.skjol;
      k.push('<div class="p2-kp"><div class="cap ' + (S.vantar ? 'y' : 'g') + '"></div><div class="in"><span class="lb">Skjöl</span><div><span class="big">' + S.komin + '</span> <span class="bigl">af ' + S.alls + '</span></div>' +
        '<div class="bar" role="img" aria-label="Komin, í vinnslu, vantar"><i style="width:' + (100 * S.komin / S.alls).toFixed(1) + '%;background:#16783f"></i><i style="width:' + (100 * S.vinnsla / S.alls).toFixed(1) + '%;background:#c48a1f"></i><i style="width:' + (100 * S.vantar / S.alls).toFixed(1) + '%;background:#a01818"></i></div>' +
        '<span class="ft">' + fx(S.vantar + ' vantar') + (S.vinnsla ? fx(S.vinnsla + ' í vinnslu') : '') + '</span></div></div>'); }
    if (d.sam) { var o = d.sam.opin.a || ''; var ok = !o || /ekkert|^0\b/i.test(o);
      k.push('<div class="p2-kp ' + (ok ? 'ramm-g' : 'ramm-a') + '"><div class="cap ' + (ok ? 'g' : 'y') + '"></div><div class="in"><span class="lb">Samskipti</span><div><span class="big ord' + (ok ? '' : ' gul') + '">' + (ok ? 'Í lagi' : 'Svar bíður') + '</span></div>' +
        '<span class="sm">' + fx(o || 'ekkert ósvarað') + (d.sam.opin.b ? fx(d.sam.opin.b) : '') + '</span>' + (d.sam.tala ? '<span class="ft">' + fx(d.sam.tala + ' færslur / 12 mán.') + '</span>' : '') + '</div></div>'); }
    /* ── KERFI Á STAÐNUM (Agnar 19.11.2026: „vantar inn brunakerfin ofl“) — öll kerfi úr „Kerfi og þjónusta" (450)
       sem rönd undir kössunum: samantekt (okkar / hjá öðrum / vantar / óvitað), súla og ein flís á hvert kerfi
       með stöðu. Lesið úr title-texta plötunnar; ekkert skrifað. */
    if (false && d.kerfi && d.kerfi.length) {   /* Agnar 19.11.2026 strikaði yfir röndina — ekki teiknuð */
      var hop = function (x) { var h = (x.hver + ' ' + x.stada).toLowerCase(); return /okkar/.test(h) ? 'ok' : /vantar/.test(h) ? 'va' : /öðrum/.test(h) ? 'an' : 'ov'; };
      var HOP = { ok: ['Okkar', '#22c06a'], an: ['Hjá öðrum', '#5b8def'], va: ['Vantar', '#f0584c'], ov: ['Óvitað', '#f2c35a'] };
      var tal = { ok: 0, an: 0, va: 0, ov: 0 }; d.kerfi.forEach(function (x) { tal[hop(x)]++; });
      var rodun = ['ok', 'va', 'an', 'ov'];
      var nK = d.kerfi.length;
      k.push('<div class="p2-kp p2-kp-kerfi"><div class="cap s"></div><div class="in">' +
        '<div class="kh"><span class="lb">Kerfi á staðnum</span>' + (d.kerfiFl ? '<span class="kfl">' + esc(d.kerfiFl) + '</span>' : '') +
        '<span class="ksum">' + rodun.filter(function (h) { return tal[h]; }).map(function (h) { return '<span><i class="dot" style="background:' + HOP[h][1] + '"></i>' + HOP[h][0] + ' <b class="p2-n">' + tal[h] + '</b></span>'; }).join('') + '</span></div>' +
        '<div class="bar2" role="img" aria-label="' + rodun.map(function (h) { return HOP[h][0] + ' ' + tal[h]; }).join(', ') + '">' + rodun.filter(function (h) { return tal[h]; }).map(function (h) { return '<i style="flex:' + tal[h] + ' 1 0;background:' + HOP[h][1] + '"></i>'; }).join('') + '</div>' +
        '<div class="kflis">' + d.kerfi.slice().sort(function (a, b) { return rodun.indexOf(hop(a)) - rodun.indexOf(hop(b)); }).map(function (x) {
          var h = hop(x);
          return '<span class="kf kf-' + h + '" title="' + esc(x.heiti + ' · ' + x.krafa + ' · ' + x.hver + (x.stada ? ' — ' + x.stada : '')) + '"><i style="background:' + HOP[h][1] + '"></i><b>' + esc(x.heiti) + '</b><small>' + esc((x.hver + (x.stada ? ' · ' + x.stada : '')).replace(/^Skylt · /, '')) + (/skylt/i.test(x.krafa) ? ' · skylt' : '') + '</small></span>';
        }).join('') + '</div>' +
        '</div></div>');
    }
    return k;
  }

  function gluggi(d) {
    var h = d.hus || {};
    var bs = d.bs || {};
    var dalkur1 = '<div class="p2-sec">Staður og samband</div>' +
      kv('Heimilisfang', esc(d.heimilisfang)) + kv('Sími', esc(d.simi), ' n') +
      kv('Netfang', esc((d.netfang || '').split(/\s*,\s*/)[0]) + (d.fleiri ? ' <button type="button" class="p2-meira" data-p2="fleiri">' + esc(d.fleiri) + '</button>' : '')) +
      kv('Tengiliður', esc(d.tengilidur || (d.sam && d.sam.tengi.nafn) || '')) +
      (d.rf ? kv('Rekstrarfélag', '<a href="#rekstrarfelog" data-p2="rf">' + esc(d.rf) + '</a>') : '') +
      kv('Afsláttur', (d.afslattur && d.afslattur !== '—') ? esc(d.afslattur) : '', ' n');
    var hus = kv('Hæðir', h['hæðir'] ? esc(h['hæðir']) : esc(bs['hæðir'] || ''), h['hæðir'] ? ' n' : '') + kv('Íbúðir', h['íb.'] ? esc(h['íb.']) : '', ' n') +
      kv('Herbergi', h['herb.'] ? esc(h['herb.']) : '', ' n') + kv('Stigagangar', h['stigag.'] ? esc(h['stigag.']) : esc(bs['stigagangar'] || ''), ' n') +
      kv('Flatarmál', h['m²'] ? esc(tugir(h['m²'])) + ' m²' : esc(bs['brúttó'] || ''), ' n') + kv('Byggt', h['byggt'] ? esc(h['byggt']) : esc((bs['byggingarár'] || '').replace(/\s*\(.*\)\s*$/, '')), ' n') +
      kv('Notkun', esc(d.fl));
    var dalkur2 = '<div class="p2-sec">Húsið</div>' + (hus || '<div class="p2-kv"><span class="v" style="font-weight:500;color:#4a5363">Óskráð — sjá Breyta</span></div>');
    var stad = kv('Næsta skoðun', d.naest ? '<span style="color:' + (d.utrunnin ? '#a01818' : '#845400') + '">' + esc(d.naest) + '</span>' + (d.utrunnin ? ' · ' + d.utrunnin + ' útrunnin' : '') : '', ' n') +
      kv('Síðasta', esc(d.sidast) + (d.skodMan ? ' · ' + esc(d.skodMan.toLowerCase()) : ''), ' n') +
      kv('Teikningar', d.teiknN ? d.teiknN + (d.teiknN === 1 ? ' hæð' : ' hæðir') : '') +
      kv('Búnaðargr.', esc(d.bgm)) +
      kv('Brunakerfi', d.bk ? esc((d.bk.undir || '').split(' · ')[0]) : '') +
      kv('Séruppdr.', d.seruppN ? tugir(d.seruppN) + ' blöð' : '', ' n');
    var dalkur3 = '<div class="p2-sec">Á staðnum</div>' + stad;
    var chips = (d.teiknN ? '<span>' + d.teiknN + ' HÆÐIR</span>' : '') + (d.bgm ? '<span>' + esc(d.bgm.split(' · ').slice(1).join(' · ').toUpperCase()) + '</span>' : '');
    var mynd = '<div class="p2-mynd"><div class="ram" ' + (d.mynd ? 'style="background-image:url(\'' + esc(d.mynd) + '\')"' : '') + '><span class="lbl">' + esc(d.heimilisfang || 'Mynd') + '</span>' + (chips ? '<span class="chips">' + chips + '</span>' : '') + '</div>' +
      '<div class="tak"><button type="button" class="p2-til p2-gr" data-p2="bgr">Búnaðargreining</button><button type="button" class="p2-til p2-rd" data-p2="opna-teikn">Teikningar</button></div></div>';
    return '<div class="p2-dalk p2-d1">' + dalkur1 + '</div><div class="p2-dalk p2-d2">' + dalkur2 + '</div><div class="p2-dalk p2-d3">' + dalkur3 + '</div>' + mynd;
  }

  function adrar(d) {
    /* ATH: engin <table> — 00-legacy bætir við stöðuvali sem SKRIFAR í uttaeki á hverja töflu með „Staða"-dálk (lykill = fyrsti reitur) */
    var raedur = d.thj.map(function (x) {
      return '<div class="rad" role="row"><b role="cell">' + esc(x.heiti) + '</b><span role="cell">' + esc(x.krafa) + '</span><span role="cell">' + esc(x.hver) + '</span><span role="cell"><span class="p2-pl ' + x.led + '">' + esc(x.stada || '—') + '</span></span></div>';
    }).join('');
    return '<div class="hl2"><span class="mono" style="font:500 11px ' + MONO + ';letter-spacing:.16em;color:#3a4250">AÐRAR ÞJÓNUSTUR</span><span style="margin-left:auto;display:flex;gap:8px">' +
      '<button type="button" class="p2-til p2-gr" data-p2="adrar-baeta">+ Bæta við þjónustu...</button></span></div>' +
      (raedur ? '<div class="p2-tbl" role="table"><div class="rad hd" role="row"><span role="columnheader">Þjónusta</span><span role="columnheader">Krafa</span><span role="columnheader">Hver þjónar</span><span role="columnheader">Ástand</span></div>' + raedur + '</div>'
        : '<div class="p2-tomt">Engin kerfi skráð ennþá — „+ Bæta við þjónustu…" opnar Kerfi og þjónusta.</div>');
  }

  function teikn(d) {
    return '<div class="hl"><span class="k">Teikningar</span><span>' + esc(d.teikn || 'Engin teikning skráð') + '</span></div>' +
      (d.serupp ? '<div class="hl"><span class="k">Séruppdrættir</span><span>' + esc(d.serupp) + '</span></div>' : '') +
      '<div class="tk"><button type="button" class="p2-til p2-gr" data-p2="opna-teikn">Opna teikningu</button>' +
      '<button type="button" class="p2-til p2-silf" data-p2="bgr">Nánari greining</button>' +
      '<button type="button" class="p2-til p2-silf" data-p2="grein-fast">Greining fasteignar</button>' +
      '<button type="button" class="p2-til p2-silf" data-p2="rymingar">Rýmingaráætlun</button>' +
      '<button type="button" class="p2-til p2-silf" data-p2="brunaaaetlun">Brunaáætlun</button></div>';
  }

  function samskiptiMarkup(d) {
    var x = d.sam; if (!x) return '';
    var fraKunna = x.chips.some(function (c) { return /kúnna/i.test(c); });
    var bidur = x.chips.some(function (c) { return /ósvarað/i.test(c); });
    var nafnFra = x.fra[0] || d.nafn || '';
    var ini = nafnFra.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    var sima = x.tengi.b || '';
    var yf = function (k, v, tengill) { return v ? '<div class="r"><span>' + esc(k) + '</span><b>' + (tengill || esc(v)) + '</b></div>' : ''; };
    return '<div class="hd">SAMSKIPTI</div><div class="gr">' +
      '<div class="c1"><div class="kass">' +
        (x.opin.a ? '<div><span>Opin mál</span><b>' + esc(x.opin.a) + '</b></div>' : '') +
        (x.opin.b ? '<div><span>Beiðnir</span><b>' + esc(x.opin.b.replace(/\s*opnar beiðnir/, '')) + '</b></div>' : '') +
        (x.tala ? '<div><span>Færslur síðustu 12 mán.</span><b>' + esc(x.tala) + '</b></div>' : '') + '</div>' +
        (x.has.nyr ? '<button type="button" class="p2-til p2-gr" data-p2="sam-nyr">+ Nýr póstur</button>' : '') +
        (x.has.saga ? '<button type="button" class="p2-til" data-p2="sam-saga">Póstsaga</button>' : '') +
        (x.has.mark ? '<button type="button" class="p2-til" data-p2="sam-afgr">Merkja afgreitt</button>' : '') +
        (x.imp ? '<button type="button" class="p2-til" data-p2="sam-imp">' + esc(x.imp) + '</button>' : '') +
        (x.has.meira ? '<button type="button" class="p2-til" data-p2="sam-meira">Meira</button>' : '') + '</div>' +
      '<div class="c2"><div class="flip" role="tablist"><button type="button" role="tab" data-p2="sam-tab-samtal" aria-selected="true">Samtal</button>' +
        '<button type="button" role="tab" data-p2="sam-tab-allt" aria-selected="false">Allar færslur</button>' +
        '<button type="button" role="tab" data-p2="sam-tab-vinna" aria-selected="false">Vinnusaga</button></div>' +
        (x.subj || x.txt ? '<div class="msg"><span class="av' + (fraKunna ? '' : ' ok') + '">' + esc(ini) + '</span><div class="tx"><b>' + esc(nafnFra) + '</b> <span class="m">' + esc(x.fra[1] || '') + '</span>' +
          (x.subj ? '<div class="l"><b>' + esc(x.subj) + '</b></div>' : '') + (x.txt ? '<div class="l">' + esc(x.txt) + '</div>' : '') + '</div>' +
          (bidur ? '<span class="p2-pl am">Svar bíður</span>' : '<span class="p2-pl">' + (fraKunna ? 'Svarað' : 'Frá okkur') + '</span>') + '</div>' : '<div class="msg"><div class="tx">Engin samskipti skráð</div></div>') +
        (x.has.svara ? '<div class="svar"><button type="button" class="inn" data-p2="sam-svara">Skrifa svar til ' + esc(d.nafn) + '…</button><button type="button" class="p2-til p2-gr" data-p2="sam-svara">Svara</button></div>' : '') + '</div>' +
      '<div class="c3"><div class="yf"><div class="t">YFIRLIT SAMSKIPTA</div>' + yf('Aðili', d.nafn) + yf('Tengiliður', d.tengilidur || x.tengi.nafn) +
        yf('Netfang', x.tengi.a) + yf('Sími', sima, sima ? '<a href="' + esc(x.tengi.tel || 'tel:' + sima) + '" class="p2-n">' + esc(sima) + '</a>' : '') + '</div>' +
        (x.sigs.length ? '<div class="yf"><div class="t">MERKI Í PÓSTSÖGU</div><div class="sig">' + x.sigs.map(function (g) { return '<span>' + esc(g) + '</span>'; }).join('') + '</div></div>' : '') + '</div>' +
      '</div>';
  }

  /* ---------- samsetning ---------- */
  var sig = '';
  /* bannerinn er færður INN Í #p2-glugg þegar „Allir reitir" er á (p2-open) svo allt sé í EINU boxi, og AFTUR sem beint barn
     #companies-main þegar lokað (þá felur `.co-banner:not(.p2-open){display:none}` hann). Idempotent — snertir DOM aðeins ef
     staðsetningin er röng. Kallað í hverju tifi + strax við smell. */
  function settBannerStad(m) {
    var bn = sel(m, '.co-banner'); if (!bn) return;
    var g = document.getElementById('p2-glugg');
    if (bn.classList.contains('p2-open') && g) { if (bn.parentNode !== g) g.appendChild(bn); }
    else if (bn.parentNode !== m) m.appendChild(bn);
  }
  function byggja(m) {
    var banner = sel(m, '.co-banner');
    var h = document.getElementById('p2-haus');
    if (!h || h.parentNode !== m) {
      /* áður en p2-glugg er eytt: taktu bannerinn út úr honum (annars hyrfi hann með) og settu sem beint barn fyrir endurbygginguna */
      if (banner && banner.parentNode !== m) m.appendChild(banner);
      ['p2-haus', 'p2-msimi', 'p2-kpi', 'p2-glugg', 'p2-athug', 'p2-samsk', 'p2-flipar', 'p2-teikn', 'p2-adrar'].forEach(function (id) { var o = document.getElementById(id); if (o && o.parentNode) o.parentNode.removeChild(o); });
      h = document.createElement('div'); h.id = 'p2-haus'; h.className = 'p2-haus p2-nytt';
      var g = document.createElement('div'); g.id = 'p2-glugg'; g.className = 'p2-glugg p2-nytt';
      var kp = document.createElement('div'); kp.id = 'p2-kpi'; kp.className = 'p2-kpi p2-nytt';
      g.innerHTML = '<div class="p2-gl-a"></div>';
      banner.insertAdjacentElement('beforebegin', h); var ms = document.createElement('div'); ms.id = 'p2-msimi'; ms.className = 'p2-msimi p2-nytt'; h.insertAdjacentElement('afterend', ms); ms.insertAdjacentElement('afterend', kp); kp.insertAdjacentElement('afterend', g);
      var at = document.createElement('div'); at.id = 'p2-athug'; at.className = 'p2-athug p2-nytt';
      at.innerHTML = '<span aria-hidden="true" style="margin-top:8px">✎</span><textarea rows="2" aria-label="Athugasemd" placeholder="Athugasemd… (vistast sjálfkrafa)"></textarea><button type="button" class="alt" data-p2="opna-gamalt">Allir reitir</button>';
      g.appendChild(at);
      var host = sel(m, '._samskipti-host');
      var f = document.createElement('div'); f.id = 'p2-flipar'; f.className = 'p2-flipar p2-nytt'; f.setAttribute('role', 'tablist');
      f.innerHTML = TABS.map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="false"><span>' + t[1] + '</span><span class="c" hidden></span></button>'; }).join('');
      (host || g).insertAdjacentElement('afterend', f);
      var tp = document.createElement('div'); tp.id = 'p2-teikn'; tp.className = 'p2-teikn p2-nytt'; tp.setAttribute('data-p2t', 'teikn');
      f.insertAdjacentElement('afterend', tp);
      var ad = document.createElement('div'); ad.id = 'p2-adrar'; ad.className = 'p2-adrar p2-nytt'; ad.setAttribute('data-p2t', 'adrar');
      tp.insertAdjacentElement('afterend', ad);
      if (!m.__p2klikk) { m.__p2klikk = true; m.addEventListener('click', smellur); }
      sig = '';
      velja(m, window.__p2flipi || 'skjol');
    }
  }

  function velja(m, t) {
    m.setAttribute('data-p2tab', t);
    allt(m, '#p2-flipar button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t ? 'true' : 'false'); });
    window.__p2flipi = t;
    /* þjónustuflipar 274: Slökkvitækjaþjónusta ↔ „ars", Brunakerfisþjónusta ↔ „bru" (umboðssmellur, aðeins ef ekki þegar valinn) */
    var vil = t === 'slt' ? 'ars' : (t === 'bk' ? 'bru' : '');
    if (vil) { var fb = sel(m, '#_sks-tabs ._sks-tab[data-flipi="' + vil + '"]'); if (fb && !fb.classList.contains('on')) { m.__p2sks = true; fb.click(); m.__p2sks = false; } }
  }

  function merkja(m) {
    KAFLAR.forEach(function (k) { var e = sel(m, k[0]); if (e && e.parentNode === m && e.getAttribute('data-p2t') !== k[1]) e.setAttribute('data-p2t', k[1]); });
    /* allt annað sem var beint barn og er enn sýnilegt í gamla prófílnum án flipa → Aðrar þjónustur (Nýr staður, Bæta við tæki …) */
    allt(m, ':scope > div').forEach(function (e) {
      if (e.id === 'p2-haus' || e.id === 'p2-msimi' || e.id === 'p2-bygg' || e.id === 'p2-kpi' || e.id === 'p2-glugg' || e.id === 'p2-athug' || e.id === 'p2-samsk' || e.id === 'p2-flipar' || e.id === 'p2-teikn' || e.id === 'p2-adrar') return;
      if (e === m.firstElementChild || e.classList.contains('co-banner') || e.classList.contains('_samskipti-host') || e.hasAttribute('data-p2t')) return;
      if (e.classList.contains('info-grid') || e.id === 't485-top') return;
      if (/Nýr staður/.test(e.textContent)) e.setAttribute('data-p2t', 'adrar');
    });
  }

  /* Röðun með CSS `order` (flex-dálkur) — enginn hnútur fluttur (reglan um tvo pabba á sama hnút) */
  function samskiptaBox(m) {
    var host = sel(m, '._samskipti-host'); var b = document.getElementById('p2-samsk');
    if (!host) return;
    if (!b) { b = document.createElement('div'); b.id = 'p2-samsk'; b.className = 'p2-samsk p2-nytt'; sig = ''; host.insertAdjacentElement('beforebegin', b); }
  }

  function endurteikna(m) {
    var d = lesa(m);
    var s = JSON.stringify(d);
    var sbT = document.getElementById('p2-samsk');
    if (s === sig && !(sbT && !sbT.firstChild && d.sam)) return;
    sig = s;
    var h = document.getElementById('p2-haus'), g = document.getElementById('p2-glugg'), t = document.getElementById('p2-teikn');
    var afturH = window.Stodugt && Stodugt.vernda ? Stodugt.vernda(h) : null;
    h.innerHTML = haus(d); if (afturH) afturH();
    var ga = g.querySelector('.p2-gl-a'); if (ga) ga.innerHTML = gluggi(d);
    var ms = document.getElementById('p2-msimi'); var gm = ga && ga.querySelector('.p2-mynd'); if (ms && gm) ms.innerHTML = gm.outerHTML;
    var kp = document.getElementById('p2-kpi');
    if (kp) { var kk = kpi(d).map(function (x) { return x.replace(/^(<div class="p2-kp[^"]*">)/, '$1' + HNODIN); });
      var _st = kk.filter(function (x) { return /p2-kp-(taeki|bk)/.test(x); }), _sm = kk.filter(function (x) { return !/p2-kp-(taeki|bk|kerfi)/.test(x); });
      var _tv = _st.length && _sm.length > 2;
      kp.classList.toggle('tvaer', !!_tv); kp.classList.toggle('s3', _sm.length === 3);
      if (_tv) kp.style.gridTemplateColumns = _st.map(function (x) { return 'minmax(0,1.6fr)'; }).concat(['minmax(0,1fr)', 'minmax(0,1fr)']).join(' ');
      else kp.style.gridTemplateColumns = kk.filter(function (x) { return !/p2-kp-kerfi/.test(x); }).map(function (x, i) { return /p2-kp-taeki/.test(x) ? 'minmax(0,1.7fr)' : /p2-kp-bk/.test(x) ? 'minmax(0,1.75fr)' : 'minmax(0,1fr)'; }).join(' '); kp.innerHTML = kk.join(''); }
    t.innerHTML = teikn(d);
    var ar = document.getElementById('p2-adrar'); if (ar) ar.innerHTML = adrar(d);
    var sb = document.getElementById('p2-samsk'); if (sb) sb.innerHTML = samskiptiMarkup(d);
    if (sb && m.classList.contains('p2-gam')) { var tt = sb.querySelectorAll('.flip button'); if (tt[1]) { tt[0].setAttribute('aria-selected', 'false'); tt[1].setAttribute('aria-selected', 'true'); } }
    var c = sel(m, '#p2-flipar button[data-t="slt"] .c');
    if (c) { c.textContent = d.nSlt ? d.nSlt : ''; c.hidden = !d.nSlt; }
    var ca = sel(m, '#p2-flipar button[data-t="adrar"] .c');
    if (ca) { ca.textContent = d.thj.length || ''; ca.hidden = !d.thj.length; }
  }

  /* athugasemd: ein lína sem er umboð fyrir textareit gamla bannersins (features.js onBannerNoteInput → sama vistunarleið) */
  /* fjöllínu-athugasemd heldur línuskilum (textarea, ekki input); hæðin fylgir textanum upp í 5 línur — aðeins við breytingu */
  function haed(t) { t.style.height = '52px'; var h = Math.min(120, t.scrollHeight); if (h > 52) t.style.height = h + 'px'; }
  function athugasemd(m) {
    var inp = document.querySelector('#p2-athug textarea'), ta = sel(m, '.co-banner-note');
    if (!inp || !ta) return;
    if (!inp.__p2) {
      inp.__p2 = true;
      inp.addEventListener('input', function () {
        var t = sel(m, '.co-banner-note'); if (!t) return;
        t.value = inp.value; t.dispatchEvent(new Event('input', { bubbles: true })); haed(inp);
      });
      inp.addEventListener('blur', function () {
        var t = sel(m, '.co-banner-note'); if (t) t.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    if (document.activeElement !== inp && inp.value !== ta.value) { inp.value = ta.value; haed(inp); }
  }

  /* ---------- smellir: allt umboð fyrir upprunalegu takkana ---------- */
  function valmynd(m, hnappur) {
    var gamalt = document.querySelector('.p2-valm'); if (gamalt) { gamalt.parentNode.removeChild(gamalt); return; }
    var atridi = [
      ['Þjónustusamningur', '.b405-mi-samn .b405-orig, .b405-orig'],
      ['Nýtt', '._co-nytt-toggle'],
      ['Taka úr þjónustu / Setja í þjónustu', '._co-svc-toggle'],
      ['Merkja mikilvægt', '._imp-toggle'],
      ['Endurnýja', '#_co-endurnyja'],
      ['Hreyfingaryfirlit', '._hy-takki'],
      ['Póstafrit', '.sk-mailpref'],
      ['Eyða', '._co-delete'],
      ['Viðskiptavinasíða (eldri)', '#companies-main'],
      ['Gamla útlitið', '#companies-main']
    ];
    var v = document.createElement('div'); v.className = 'p2-valm'; v.setAttribute('role', 'menu');
    var html = '';
    atridi.forEach(function (a, i) {
      if (a[0] === 'Gamla útlitið') { html += '<hr><button type="button" role="menuitem" data-i="' + i + '">Skipta yfir í gamla útlitið</button>'; return; }
      if (a[0] === 'Viðskiptavinasíða (eldri)') { if (GAMLA_KUNNASIDA && window._currentCompanyId) html += '<button type="button" role="menuitem" data-i="' + i + '">Viðskiptavinasíða (eldri)</button>'; return; }
      var el = sel(m, a[1]); if (!el) return;
      var t = txt(el).replace(/^[^\wÁ-ÿ]+/, '') || a[0];
      if (i === 0) t = 'Þjónustusamningur';
      if (a[0] === 'Gamla útlitið') { html += '<hr><button type="button" role="menuitem" data-i="' + i + '">Skipta yfir í gamla útlitið</button>'; return; }
      html += (a[0] === 'Eyða' ? '<hr>' : '') + '<button type="button" role="menuitem" data-i="' + i + '"' + (a[0] === 'Eyða' ? ' class="eyda"' : '') + '>' + esc(t) + '</button>';
    });
    v.innerHTML = html;
    document.body.appendChild(v);
    var r = hnappur.getBoundingClientRect();
    v.style.top = (r.bottom + window.scrollY + 6) + 'px';
    v.style.left = Math.max(8, r.right + window.scrollX - v.offsetWidth) + 'px';
    function loka() { if (v.parentNode) v.parentNode.removeChild(v); document.removeEventListener('mousedown', ut, true); document.removeEventListener('keydown', lyk, true); }
    function ut(e) { if (!v.contains(e.target) && e.target !== hnappur) loka(); }
    function lyk(e) { if (e.key === 'Escape') { loka(); hnappur.focus(); } }
    document.addEventListener('mousedown', ut, true); document.addEventListener('keydown', lyk, true);
    v.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var a = atridi[+b.getAttribute('data-i')]; loka();
      if (a[0] === 'Gamla útlitið') { var u = new URL(location.href); u.searchParams.set('prof', '1'); location.href = u.toString(); return; }
      if (a[0] === 'Viðskiptavinasíða (eldri)') { if (GAMLA_KUNNASIDA) GAMLA_KUNNASIDA(window._currentCompanyId); return; }
      var el = sel(m, a[1]); if (el) el.click();
    });
    var fyrsti = v.querySelector('button'); if (fyrsti) fyrsti.focus();
  }

  function smellur(e) {
    var m = e.currentTarget;
    var sk = e.target.closest('#_sks-tabs ._sks-tab');
    if (sk && !m.__p2sks) { var want = sk.getAttribute('data-flipi') === 'ars' ? 'slt' : 'bk'; if (m.getAttribute('data-p2tab') !== want) { m.setAttribute('data-p2tab', want); allt(m, '#p2-flipar button').forEach(function (x) { x.setAttribute('aria-selected', x.getAttribute('data-t') === want ? 'true' : 'false'); }); window.__p2flipi = want; } return; }
    var f = e.target.closest('#p2-flipar button[data-t]');
    if (f) { velja(m, f.getAttribute('data-t')); return; }
    var b = e.target.closest('[data-p2]'); if (!b || !m.contains(b)) return;
    var a = b.getAttribute('data-p2');
    if (a === 'til') umbod(m, 'button.btn-ghost', /Til baka/);
    else if (a === 'breyta') umbod(m, '.b405-rod > button.btn-outline', /Breyta/);
    else if (a === 'meira') valmynd(m, b);
    else if (a === 'fleiri') umbod(m, '._anf-takki');
    else if (a === 'sam-svara') umbod(m, '._skx-svara');
    else if (a === 'sam-nyr') umbod(m, '._skx-nyr');
    else if (a === 'sam-afgr') umbod(m, '._ssk-mark');
    else if (a === 'sam-imp') umbod(m, '._smx-imp');
    else if (a === 'sam-saga') { m.classList.add('p2-gam'); umbod(m, '._ssk-toggle'); }
    else if (a === 'sam-meira') { m.classList.add('p2-gam'); umbod(m, '.b411-samsk-meira'); }
    else if (/^sam-tab-/.test(a)) {
      var tb = a.replace('sam-tab-', ''); m.classList.toggle('p2-gam', tb !== 'samtal');
      allt(m, '#p2-samsk .flip button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      if (tb === 'allt') { var tg = sel(m, '._ssk-toggle'); if (tg && !sel(m, '._ssk-full')) tg.click(); }
    }
    else if (a === 'adrar-baeta') { var op = sel(m, '#_kt450 [data-kt="opna"]'); if (op) { if (op.getAttribute('aria-expanded') !== 'true') op.click(); var k = sel(m, '#_kt450'); if (k) k.scrollIntoView({ block: 'start' }); } }
    else if (a === 'rf') { e.preventDefault(); umbod(m, '.co-banner-name [data-rf-opna]'); }
    else if (a === 'bgr') umbod(m, '#bgr-takki');
    else if (a === 'hrey') umbod(m, '._hy-takki');
    else if (a === 'opna-teikn') umbod(m, '.b405-knappar button', /Teikning/);
    else if (a === 'grein-fast') umbod(m, '._gr-profil-takki');
    else if (a === 'rymingar') umbod(m, '._ba-lina-takki');
    else if (a === 'brunaaaetlun') umbod(m, '._ba-takki');
    else if (a === 'opna-gamalt') {
      var bn = sel(m, '.co-banner'); if (bn) { bn.classList.toggle('p2-open'); b.textContent = bn.classList.contains('p2-open') ? 'Fela reitina' : 'Allir reitir'; settBannerStad(m); }
    }
  }

  /* Byggingarupplýsingar (Agnar 19.11.2026): „setja búnaðargreiningarhnappinn inn í byggingarupplýsingar og verður
     síðan allt opið þar þegar búið er að opna greininguna einu sinni“. Stika efst í flipanum með takkanum (umboð á
     #bgr-takki) og samantekt greiningarinnar. Myndaspjaldið 477 sýnir sig líka í flipanum, og allar hæðir eru opnaðar
     sjálfkrafa. Greiningin sjálf er vistuð í grunninum, svo hún stendur þar við hverja heimsókn. Engin skrif héðan. */
  function byggStika(m) {
    /* hnúturinn er settur einu sinni aftast og aldrei færður; CSS `order:8` setur hann efst í flipanum (á undan 9) */
    var st = document.getElementById('p2-bygg');
    if (!st) { st = document.createElement('div'); st.id = 'p2-bygg'; st.className = 'p2-bygg p2-nytt'; st.setAttribute('data-p2t', 'bygg'); }
    if (st.parentNode !== m) m.appendChild(st);
    var til = !!sel(m, '#bgr-takki');
    var und = txt(sel(m, '#_bgm477 [data-bgm="undir"]'));
    var html = '<span class="t">Búnaðargreining</span><span class="u">' + esc(und || (til ? 'Engin greining vistuð enn' : '')) + '</span>' +
      (til ? '<button type="button" class="p2-til p2-gr" data-p2="bgr">' + (und ? 'Opna greininguna' : 'Búnaðargreining') + '</button>' : '');
    if (st.__h !== html) { st.innerHTML = html; st.__h = html; }
    if (m.getAttribute('data-p2tab') === 'bygg') {
      var fl = sel(m, '#_bgm477 [data-bgm="fleiri"]');
      var fid = window._currentCompanyId;
      if (fl && !fl.hidden && fl.getAttribute('aria-expanded') !== 'true' && m.__p2bgmOpid !== fid) { m.__p2bgmOpid = fid; fl.click(); }
    }
  }

  /* Greining fasteignar (sýndarprófíll, patch 451) á gamla bannerinn með heimilisfangs-leitinni — nýi prófíllinn
     felur hann (`.co-banner:not(.p2-open){display:none}`) og þá dettur leitarreiturinn út (Agnar 25.11.2026). Taka
     yfirlagið til baka þegar `#companies-main` ber `gr-sydar`, svo 451 fái óbreytt sitt eigið útlit. Allt afturkræft. */
  function afturkalla(m) {
    if (!m.classList.contains('p2')) return;   // ekkert yfirlag uppi
    m.classList.remove('p2', 'p2-gam');
    m.removeAttribute('data-p2tab');
    var bn = sel(m, '.co-banner'); if (bn) { if (bn.parentNode !== m) m.appendChild(bn); bn.classList.remove('p2-open'); }   /* taktu bannerinn út úr p2-glugg áður en hann er eytt hér fyrir neðan */
    ['p2-haus', 'p2-msimi', 'p2-kpi', 'p2-glugg', 'p2-athug', 'p2-samsk', 'p2-flipar', 'p2-teikn', 'p2-adrar', 'p2-bygg']
      .forEach(function (id) { var o = document.getElementById(id); if (o && o.parentNode) o.parentNode.removeChild(o); });
    allt(m, '[data-p2t]').forEach(function (e) { e.removeAttribute('data-p2t'); });
  }

  function tikk() {
    if (document.hidden) return;
    var m = document.getElementById('companies-main');
    if (!m || !sel(m, '.co-banner') || !sel(m, '.co-banner-name')) return;
    if (m.classList.contains('gr-sydar')) { afturkalla(m); return; }
    stilar();
    if (!m.classList.contains('p2')) m.classList.add('p2');
    byggja(m); merkja(m); samskiptaBox(m); athugasemd(m); endurteikna(m); byggStika(m); settBannerStad(m);
  }

  setInterval(tikk, 600);
  window.Prof2.tikk = tikk;
})();
