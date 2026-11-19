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

  /* ---------- rofi: ?prof=2 í slóðinni (engin vafra-geymsla; slóðin heldur honum meðan flett er í appinu) ---------- */
  function erKveikt() {
    try { return new URLSearchParams(location.search).get('prof') === '2'; } catch (e) { return false; }
  }
  var KVEIKT = erKveikt();
  window.Prof2 = { kveikt: function () { return KVEIKT; } };
  if (!KVEIKT) return;

  var F = ':not(#_p2a):not(#_p2b):not(#_p2c)';
  var M = 'html body #companies-main.p2' + F;
  var FX = ':not(#_p2d):not(#_p2e):not(#_p2f):not(#_p2g):not(#_p2h):not(#_p2i):not(#_p2j)';
  var G = M + FX;
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var GRAENN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SERIF = '"Playfair Display",Georgia,serif';

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
    ['#_bgm477', 'teikn'],
    ['._afsl-box', 'kjor']
  ];

  var css =
    M + '{display:flex!important;flex-direction:column}' +
    G + ' > *{flex:none!important;min-height:0}' +
    G + ' > #p2-haus,' + G + ' > #p2-msimi,' + G + ' > #p2-kpi,' + G + ' > #p2-glugg,' + G + ' > #p2-samsk,' + G + ' > #p2-teikn,' + G + ' > #p2-adrar{overflow:visible!important}' +
    G + ' > #p2-haus,' + G + ' > #p2-msimi{order:1}' + G + ' > #p2-kpi{order:2}' + G + ' > #p2-glugg{order:3}' + G + ' > .co-banner{order:4}' +
    G + ' > #p2-samsk,' + G + ' > ._samskipti-host{order:5}' + G + ' > #p2-flipar{order:6}' + G + ' > #p2-teikn{order:7}' + G + ' > #p2-adrar{order:8}' +
    G + ' > [data-p2t]:not(#p2-teikn):not(#p2-adrar){order:9}' + G + ' > *:not([id^="p2-"]):not(.co-banner):not(._samskipti-host):not([data-p2t]){order:10}' +
    G + ' > div:first-child{display:none!important}' +
    G + ' > .co-banner:not(.p2-open){display:none!important}' +
    G + ' > .p2-gomul{display:none!important}' +
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
    '#companies-main .p2-plata{font:700 11px ' + MONO + ';letter-spacing:.1em;border-radius:5px;padding:1px 7px;color:#fff;background:linear-gradient(145deg,#06331a,#16783f);text-transform:uppercase}' +
    '#companies-main .p2-plata[data-st="ut"],#companies-main .p2-plata[data-st="af"]{background:linear-gradient(145deg,#5b1010,#a01818)}' +
    '#companies-main .p2-skod{display:flex;align-items:center;gap:10px;border-radius:10px;padding:6px 12px;color:#fff;background:' + GRAENN + '}' +
    '#companies-main .p2-skod[data-s="am"]{background:linear-gradient(150deg,#5a3f08,#9a6a14)}' +
    '#companies-main .p2-skod[data-s="rd"]{background:linear-gradient(150deg,#5b1010,#a01818)}' +
    '#companies-main .p2-skod b{font:800 18px/1 ' + SERIF + ';display:block}' +
    '#companies-main .p2-skod small{font:11.5px ' + MONO + ';color:#d9dee6;margin-top:2px;display:block}' +
    '#companies-main .p2-glugg{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1.1fr) 520px;grid-template-rows:auto auto;gap:0;padding:14px 0 0;background:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0,#dce1e8);border-radius:0 0 14px 14px;color:#11141c;box-shadow:0 22px 40px -22px rgba(0,0,0,.75),0 0 0 1px rgba(20,24,34,.35)}' +
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
    '#companies-main .p2-kpi{display:grid;gap:12px;padding:16px;background:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0,#d6dbe3);border-top:1px solid #000;color:#11141c}' +
    '#companies-main .p2-kp{position:relative;background:linear-gradient(180deg,#fff,#f3f5f8);border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px rgba(20,24,34,.16),0 10px 22px -14px rgba(0,0,0,.55);display:flex;flex-direction:column;min-width:0}' +
    '#companies-main .p2-kp.ramm-g{box-shadow:0 0 0 2px #16783f,0 10px 22px -14px rgba(0,0,0,.55)}' +
    '#companies-main .p2-kp.ramm-a{box-shadow:0 0 0 2px #c48a1f,0 10px 22px -14px rgba(0,0,0,.55)}' +
    '#companies-main .p2-kp .cap{height:5px}' +
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
    s.textContent = css + '#companies-main.p2{container:p2c/inline-size}@container p2c (max-width:760px){' + NARROW + '}@media (max-width:900px){' + NARROW + '}';
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
    var bkT = sel(m, '#_sks-tabs ._sks-tab[data-flipi="bru"] ._sks-tu');
    if (bkT) { var bt = txt(bkT); var be = /(\d+)\s*eining/.exec(bt); d.bk = { undir: bt, ein: be ? be[1] : '' }; } else d.bk = null;
    /* tæki eftir tegund OG stærð: hver lína tækjalistans (404 .ut-t, t.d. „Léttvatn 6 L") */
    d.gerdir = {};
    allt(m, '.ut-row .ut-t').forEach(function (e) { var k = txt(e); if (k) d.gerdir[k] = (d.gerdir[k] || 0) + 1; });
    /* skjöl og hreyfingar (403): talning í haus + reikningalínur */
    var sk = sel(m, '._dyg-section .b403-skyring');
    if (sk) { var sb = allt(sk, 'b').map(txt); var ad = /(\d+)\s*skjöl/.exec(txt(sel(sk, '.dauf'))); d.skjol = { komin: +(sb[0] || 0), vinnsla: +(sb[1] || 0), vantar: +(sb[2] || 0), alls: ad ? +ad[1] : 0 }; } else d.skjol = null;
    d.hreyf = allt(m, '._dyg-section .b403-hreyf .b403-skjal-lina.hreyf').map(function (r) {
      var u = txt(sel(r, '.upph')).replace(/[^\d]/g, '');
      return { teg: txt(sel(r, '.teg')), dags: txt(sel(r, '.dags')), nr: txt(sel(r, 'a.sk-doc.inv')), upph: u ? parseInt(u, 10) : 0, greitt: !!sel(r, '.s-greitt') || /greitt/i.test(txt(r)) };
    });
    d.hreyfAlls = ''; allt(m, '._dyg-section .b403-kafli .b403-hint').forEach(function (e) { var t = txt(e); if (!d.hreyfAlls && /^[\d.]+\s*kr$/.test(t)) d.hreyfAlls = t; });
    if (!d.hreyf.length) {
      /* síminn: 403 teiknar ársblokkir (.sk-yrblock) í stað hreyfingalistans */
      allt(m, '._dyg-section .sk-yrblock').forEach(function (bl) {
        var ar = (sel(bl, '.sk-yr') || {}).getAttribute ? sel(bl, '.sk-yr').getAttribute('data-yr') : '';
        allt(bl, '.sk-svc-card').forEach(function (c) {
          var nr = sel(c, 'a.sk-doc.inv'); if (!nr) return;
          var u = txt(sel(c, '.sk-svc-amt')).replace(/[^\d]/g, '');
          d.hreyf.push({ teg: /brunakerfi/i.test(txt(sel(c, '.sk-svc-hd'))) ? 'Brunakerfi' : 'Úttekt', dags: ar || '', nr: txt(nr).replace(/[^\w-]/g, ''), upph: u ? parseInt(u, 10) : 0, greitt: !!sel(c, '.s-greitt') });
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

  /* brunakerfi: síðasta skoðun úr þjónustuflipa 274 („… · skoðað DD/MM/YYYY"); árleg skoðun ⇒ dagar fram yfir = í dag − (síðast + 1 ár) */
  function bkStada(d) {
    if (!d.bk) return null;
    var x = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d.bk.undir || ''); if (!x) return { kerfi: (d.bk.undir || '').split(' · ')[0], dagar: null, sidast: '' };
    var nst = new Date(+x[3] + 1, +x[2] - 1, +x[1]); var idag = new Date(); idag.setHours(0, 0, 0, 0);
    return { kerfi: (d.bk.undir || '').split(' · ')[0], sidast: x[0], dagar: Math.round((idag - nst) / 864e5) };
  }
  function bkMerki(d) {
    var b = bkStada(d); if (!b) return '';
    var yfir = b.dagar != null && b.dagar > 0;
    return '<div class="p2-merkid' + (yfir ? ' rd' : '') + '"><div><div class="t">BRUNAKERFI</div><b>' + (yfir ? (new Date().getFullYear()) + ' óskoðað' : 'Í lagi') + '</b>' + (b.sidast ? '<small>síðast ' + esc(b.sidast) + '</small>' : '') + '</div></div>';
  }
  function kr(n) { return tugir(n) + ' kr'; }

  function kpi(d) {
    var k = [];
    var teg = Object.keys(d.gerdir).filter(function (g) { return !/slang|slöng|kefli|reykskynj/i.test(g); }).sort(function (a, b) { return d.gerdir[b] - d.gerdir[a]; });
    var nT = teg.reduce(function (s, g) { return s + d.gerdir[g]; }, 0);
    var LIT = ['#0ea5e9', '#b91c1c', '#6b0b0b', '#2563eb', '#16783f', '#845400'];
    if (nT) k.push('<div class="p2-kp" style="flex:1.4"><div class="cap g"></div><div class="in"><span class="lb">Slökkvitæki</span><div><span class="big">' + nT + '</span> <span class="bigl">tæki · ' + teg.length + (teg.length === 1 ? ' gerð' : ' gerðir') + '</span></div>' +
      '<div class="bar" role="img" aria-label="Tæki eftir tegund">' + teg.map(function (g, i) { return '<i style="width:' + (100 * d.gerdir[g] / nT).toFixed(1) + '%;background:' + LIT[i % LIT.length] + '"></i>'; }).join('') + '</div>' +
      '<div class="leg">' + teg.slice(0, 4).map(function (g, i) { return '<i class="sw" style="background:' + LIT[i % LIT.length] + '"></i><span>' + esc(g) + '</span><b class="p2-n">×' + d.gerdir[g] + '</b>'; }).join('') + '</div>' +
      (teg.length > 4 ? '<span class="ft">+' + (teg.length - 4) + ' gerðir í viðbót</span>' : '') + '</div></div>');
    var slong = 0, reyk = 0;
    Object.keys(d.gerdir).forEach(function (g) { if (/slang|slöng|kefli/i.test(g)) slong += d.gerdir[g]; else if (/reykskynj/i.test(g)) reyk += d.gerdir[g]; });
    var kefli = d.thj.filter(function (x) { return /slöngukefli/i.test(x.heiti); })[0];
    var reykK = d.thj.filter(function (x) { return /^reykskynjarar/i.test(x.heiti); })[0];
    var sr = '<div><span class="big" style="font-size:24px">' + slong + '</span> <span class="bigl">brunaslöngur</span></div>' + (!slong && kefli ? '<span class="sm" style="color:#845400">kefli: ' + esc((kefli.hver + ' — ' + kefli.stada).toLowerCase()) + '</span>' : '') +
      '<div><span class="big" style="font-size:24px">' + (reyk || d.reykTeikn || 0) + '</span> <span class="bigl">reykskynjarar' + (!reyk && d.reykTeikn ? ' á teikn.' : '') + '</span></div>' + (!reyk && reykK ? '<span class="sm" style="color:#845400">' + esc((reykK.hver + ' — ' + reykK.stada).toLowerCase()) + '</span>' : '');
    k.push('<div class="p2-kp"><div class="cap ' + (slong || reyk ? 'g' : 'y') + '"></div><div class="in"><span class="lb">Slöngur / reyk</span>' + sr + '</div></div>');
    var b = bkStada(d);
    if (b) { var yf = b.dagar != null && b.dagar > 0;
      k.push('<div class="p2-kp"><div class="cap ' + (yf ? 'r' : 'g') + '"></div><div class="in"><span class="lb">Brunakerfi</span>' +
        (yf ? '<div><span class="big" style="color:#a01818">+' + b.dagar + '</span> <span class="bigl">dagar yfir</span></div>' : '<div><span class="big" style="font-size:24px">Í lagi</span></div>') +
        '<span class="sm">' + esc(b.kerfi) + (b.sidast ? ' · síðast <b class="p2-n">' + esc(b.sidast) + '</b>' : '') + '</span>' +
        '<span class="p2-pl ' + (yf ? 'rd' : '') + '">' + (yf ? new Date().getFullYear() + ' óskoðað' : 'skoðað á tíma') + '</span></div></div>'); }
    var su = d.hreyf.filter(function (r) { return /úttekt/i.test(r.teg) && r.upph; })[0] || d.hreyf.filter(function (r) { return r.upph; })[0];
    if (su) k.push('<div class="p2-kp"><div class="cap g"></div><div class="in"><span class="lb">Síðasta úttekt</span><div><span class="big" style="font-size:26px">' + tugir(su.upph) + '</span> <span class="bigl">kr</span></div>' +
      '<span class="sm p2-n">' + esc(su.nr) + (su.dags ? ' · ' + esc(su.dags) : '') + '</span>' + (su.greitt ? '<span class="p2-pl">Greitt</span>' : '') + '</div></div>');
    var ar = new Date().getFullYear() - 1, slt = 0, bkr = 0;
    d.hreyf.forEach(function (r) { var y = /(\d{4})\s*$/.exec(r.dags); if (!y || +y[1] !== ar) return; if (/brunakerfi/i.test(r.teg)) bkr += r.upph; else slt += r.upph; });
    if (slt + bkr) k.push('<div class="p2-kp"><div class="cap s"></div><div class="in"><span class="lb">Viðskipti ' + ar + '</span><div><span class="big" style="font-size:26px">' + tugir(slt + bkr) + '</span> <span class="bigl">kr</span></div>' +
      (slt && bkr ? '<div class="bar" role="img" aria-label="Slökkvitæki og brunakerfi"><i style="width:' + (100 * slt / (slt + bkr)).toFixed(1) + '%;background:#16783f"></i><i style="width:' + (100 * bkr / (slt + bkr)).toFixed(1) + '%;background:#a01818"></i></div><span class="sm">Slt ' + tugir(slt) + ' · Bk ' + tugir(bkr) + '</span>' : '') +
      (d.hreyfAlls ? '<span class="ft">alls ' + esc(d.hreyfAlls) + '</span>' : '') + '</div></div>');
    if (d.skjol && d.skjol.alls) { var S = d.skjol;
      k.push('<div class="p2-kp"><div class="cap ' + (S.vantar ? 'y' : 'g') + '"></div><div class="in"><span class="lb">Skjöl</span><div><span class="big">' + S.komin + '</span> <span class="bigl">af ' + S.alls + '</span></div>' +
        '<div class="bar" role="img" aria-label="Komin, í vinnslu, vantar"><i style="width:' + (100 * S.komin / S.alls).toFixed(1) + '%;background:#16783f"></i><i style="width:' + (100 * S.vinnsla / S.alls).toFixed(1) + '%;background:#c48a1f"></i><i style="width:' + (100 * S.vantar / S.alls).toFixed(1) + '%;background:#a01818"></i></div>' +
        '<span class="ft">' + S.vantar + ' vantar' + (S.vinnsla ? ' · ' + S.vinnsla + ' í vinnslu' : '') + '</span></div></div>'); }
    if (d.sam) { var o = d.sam.opin.a || ''; var ok = !o || /ekkert|^0\b/i.test(o);
      k.push('<div class="p2-kp ' + (ok ? 'ramm-g' : 'ramm-a') + '"><div class="cap ' + (ok ? 'g' : 'y') + '"></div><div class="in"><span class="lb">Samskipti</span><div><span class="big" style="font-size:24px;color:' + (ok ? '#0b6b3a' : '#845400') + '">' + (ok ? 'Í lagi' : 'Svar bíður') + '</span></div>' +
        '<span class="sm">' + esc(o || 'ekkert ósvarað') + (d.sam.opin.b ? ' · ' + esc(d.sam.opin.b) : '') + '</span>' + (d.sam.tala ? '<span class="ft">' + esc(d.sam.tala) + ' færslur / 12 mán.</span>' : '') + '</div></div>'); }
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
  function byggja(m) {
    var banner = sel(m, '.co-banner');
    var h = document.getElementById('p2-haus');
    if (!h || h.parentNode !== m) {
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
      if (e.id === 'p2-haus' || e.id === 'p2-msimi' || e.id === 'p2-kpi' || e.id === 'p2-glugg' || e.id === 'p2-athug' || e.id === 'p2-samsk' || e.id === 'p2-flipar' || e.id === 'p2-teikn' || e.id === 'p2-adrar') return;
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
    if (kp) { var kk = kpi(d); kp.style.gridTemplateColumns = kk.map(function (x, i) { return i === 0 && /Slökkvitæki/.test(x) ? 'minmax(0,1.4fr)' : 'minmax(0,1fr)'; }).join(' '); kp.innerHTML = kk.join(''); }
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
      ['Gamla útlitið', '#companies-main']
    ];
    var v = document.createElement('div'); v.className = 'p2-valm'; v.setAttribute('role', 'menu');
    var html = '';
    atridi.forEach(function (a, i) {
      if (a[0] === 'Gamla útlitið') { html += '<hr><button type="button" role="menuitem" data-i="' + i + '">Skipta yfir í gamla útlitið</button>'; return; }
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
      if (a[0] === 'Gamla útlitið') { var u = new URL(location.href); u.searchParams.delete('prof'); location.href = u.toString(); return; }
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
      var bn = sel(m, '.co-banner'); if (bn) { bn.classList.toggle('p2-open'); b.textContent = bn.classList.contains('p2-open') ? 'Fela reitina' : 'Allir reitir'; }
    }
  }

  function tikk() {
    if (document.hidden) return;
    var m = document.getElementById('companies-main');
    if (!m || !sel(m, ':scope > .co-banner') || !sel(m, '.co-banner-name')) return;
    stilar();
    if (!m.classList.contains('p2')) m.classList.add('p2');
    byggja(m); merkja(m); samskiptaBox(m); athugasemd(m); endurteikna(m);
  }

  setInterval(tikk, 600);
  window.Prof2.tikk = tikk;
})();
