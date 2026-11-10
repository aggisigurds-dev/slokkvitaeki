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
    G + ' > #p2-haus,' + G + ' > #p2-glugg,' + G + ' > #p2-athug,' + G + ' > #p2-samsk,' + G + ' > #p2-teikn,' + G + ' > #p2-adrar{overflow:visible!important}' +
    G + ' > #p2-haus{order:1}' + G + ' > #p2-glugg{order:2}' + G + ' > #p2-athug{order:3}' + G + ' > .co-banner{order:4}' +
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
    '#companies-main .p2-glugg{display:grid;grid-template-columns:1fr .85fr .9fr 400px;gap:0;padding:14px 0;background:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0,#dce1e8);border-radius:0 0 14px 14px;color:#11141c;box-shadow:0 22px 40px -22px rgba(0,0,0,.75),0 0 0 1px rgba(20,24,34,.35)}' +
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
    '#companies-main .p2-mynd{display:flex;flex-direction:column;gap:8px;padding:0 14px}' +
    '#companies-main .p2-mynd .ram{flex:1;min-height:200px;border-radius:10px;background:#c3cad5 center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 10px 20px -12px rgba(0,0,0,.6)}' +
    '#companies-main .p2-mynd .tak{display:flex;gap:6px}' +
    '#companies-main .p2-mynd .tak .p2-til{flex:1;justify-content:center}' +
    '#companies-main .p2-bæta{grid-column:1/-1;padding:10px 18px 0;font-size:12.5px;color:#525b6b}' +
    '#companies-main .p2-bæta button{border:0;background:none;cursor:pointer;font:600 12.5px "IBM Plex Sans",system-ui,sans-serif;color:#3a4250;text-decoration:underline}' +
    '#companies-main .p2-athug{display:flex;align-items:center;gap:8px;padding:8px 18px;background:#f4f6f9;border-top:1px solid #c3cad5;border-radius:0 0 14px 14px;box-shadow:0 22px 40px -22px rgba(0,0,0,.75),0 0 0 1px rgba(20,24,34,.35)}' +
    '#companies-main .p2-athug textarea{flex:1;min-width:0;height:30px;min-height:30px;max-height:120px;resize:none;line-height:20px;padding-top:5px!important;padding-bottom:5px!important;overflow-y:auto;border:0;border-radius:8px;background:#eef1f6;box-shadow:inset 0 2px 4px rgba(0,0,0,.18);padding:0 10px;font:13.5px "IBM Plex Sans",system-ui,sans-serif;color:#141822}' +
    '#companies-main .p2-athug textarea::placeholder{color:#525b6b}' +
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
    '#companies-main .p2-glugg{grid-template-columns:1fr;padding:10px 0}' +
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
    '#companies-main .p2-til{min-height:44px}';

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
      var tl = allt(sc, '._skx-tile'); var tv = function (i, q) { return tl[i] ? txt(sel(tl[i], q)) : ''; };
      var ny = sel(sc, '._skx-nyjast'); var meta = ny ? allt(ny, '._skx-meta > span') : [];
      d.sam = {
        tala: txt(sel(sc, '.b405-talning .tala')),
        opin: { a: tv(2, 'span'), b: tv(2, 'small') },
        tengi: { a: tv(3, 'span'), b: tv(3, 'small'), tel: tl[3] && sel(tl[3], 'a') ? sel(tl[3], 'a').getAttribute('href') : '' },
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
      skod + '<button type="button" class="p2-til" data-p2="breyta">Breyta</button><button type="button" class="p2-til" data-p2="meira" aria-label="Fleiri aðgerðir" aria-haspopup="menu">⋯</button>';
    return lh;
  }

  function gluggi(d) {
    var h = d.hus || {};
    var dalkur1 = '<div class="p2-sec">Staður og samband</div>' +
      kv('Heimilisfang', esc(d.heimilisfang)) + kv('Sími', esc(d.simi), ' n') +
      kv('Netfang', esc(d.netfang) + (d.fleiri ? ' <button type="button" class="p2-meira" data-p2="fleiri">' + esc(d.fleiri) + '</button>' : '')) +
      kv('Tengiliður', esc(d.tengilidur));
    var hus = kv('Hæðir', h['hæðir'] ? esc(h['hæðir']) : '', ' n') + kv('Íbúðir', h['íb.'] ? esc(h['íb.']) : '', ' n') +
      kv('Herbergi', h['herb.'] ? esc(h['herb.']) : '', ' n') + kv('Stigagangar', h['stigag.'] ? esc(h['stigag.']) : '', ' n') +
      kv('Flatarmál', h['m²'] ? esc(tugir(h['m²'])) + ' m²' : '', ' n') + kv('Byggt', h['byggt'] ? esc(h['byggt']) : '', ' n');
    var kjor = 
      (d.rf ? kv('Rekstrarfélag', '<a href="#rekstrarfelog" data-p2="rf">' + esc(d.rf) + '</a>') : '') +
      kv('Afsláttur', (d.afslattur && d.afslattur !== '—') ? esc(d.afslattur) : '', ' n');
    var dalkur2 = (hus ? '<div class="p2-sec">Húsið</div>' + hus : '') +
      (kjor ? '<div class="p2-sec' + (hus ? ' p2-næsta' : '') + '">Þjónusta og kjör</div>' + kjor : '');
    var bun = '';
    /* tækjatölur eftir TEGUND (regla Agnars): slökkvitæki = summa slökkvitækjaflokka; slöngur og reykskynjarar sér */
    var teg = [], nTeg = 0, slong = 0, reyk = 0;
    d.flokkar.forEach(function (f) {
      var n = /(\d+)\s*tæki/.exec(f); if (!n) return;
      var nm = f.replace(/\s*\d+\s*tæki.*/, '').replace(/^[^A-Za-zÁ-ÿ]+/, '').trim(); var k = parseInt(n[1], 10);
      if (/slang|slöng|kefli/i.test(nm)) slong += k;
      else if (/reykskynj/i.test(nm)) reyk += k;
      else if (nm) { teg.push(esc(nm) + ' ' + k); nTeg += k; }
    });
    var nS = teg.length ? nTeg : (slong || reyk ? 0 : d.nSlt);
    if (nS) bun += '<div class="p2-kv">' + HAK + '<span class="v">Slökkvitæki' + (teg.length > 1 ? '<br><small style="font-weight:500;color:#525b6b">' + teg.join(' · ') + '</small>' : '') + '</span><span class="n">' + nS + '</span></div>';
    if (slong) bun += '<div class="p2-kv">' + HAK + '<span class="v">Brunaslöngur</span><span class="n">' + slong + '</span></div>';
    if (reyk) bun += '<div class="p2-kv">' + HAK + '<span class="v">Reykskynjarar</span><span class="n">' + reyk + '</span></div>';
    if (d.bk) bun += '<div class="p2-kv">' + HAK + '<span class="v">Brunakerfi' + (d.bk.undir ? '<br><small style="font-weight:500;color:#525b6b">' + esc(d.bk.undir) + '</small>' : '') + '</span>' + (d.bk.ein ? '<span class="n">' + esc(d.bk.ein) + ' ein.</span>' : '') + '</div>';
    var skodRaðir = kv('Síðasta', esc(d.sidast), ' n') +
      kv('Næsta', d.naest ? '<span style="color:' + (d.utrunnin ? '#a01818' : '#845400') + '">' + esc(d.naest) + '</span>' : '', ' n') +
      kv('Mánuður', esc(d.skodMan)) + (d.utrunnin ? kv('Útrunnin tæki', String(d.utrunnin), ' n') : '');
    var skod = (skodRaðir ? '<div class="p2-sec">Skoðun</div>' + skodRaðir : '') +
      (bun ? '<div class="p2-sec' + (skodRaðir ? ' p2-næsta' : '') + '">Búnaður í þjónustu</div>' + bun : '');
    var mynd = '<div class="p2-mynd"><div class="ram" ' + (d.mynd ? 'style="background-image:url(\'' + esc(d.mynd) + '\')"' : '') + '></div>' +
      '<div class="tak"><button type="button" class="p2-til p2-gr" data-p2="bgr">Búnaðargreining</button><button type="button" class="p2-til p2-silf" data-p2="hrey">Hreyfingar</button></div></div>';
    return '<div class="p2-dalk">' + dalkur1 + '</div><div class="p2-dalk">' + dalkur2 + '</div><div class="p2-dalk">' + skod + '</div>' + mynd +
      '<div class="p2-bæta">Vantar eitthvað? <button type="button" data-p2="opna-gamalt">Breyta / bæta við upplýsingum</button></div>';
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
    var sima = (x.tengi.b || '').replace(/^[^\d+]+/, '');
    var yf = function (k, v, tengill) { return v ? '<div class="r"><span>' + esc(k) + '</span><b>' + (tengill || esc(v)) + '</b></div>' : ''; };
    return '<div class="hd">SAMSKIPTI</div><div class="gr">' +
      '<div class="c1"><div class="kass">' +
        (x.opin.a ? '<div><span>Opin mál</span><b>' + esc(x.opin.a) + '</b></div>' : '') +
        (x.opin.b ? '<div><span>Beiðnir</span><b>' + esc(x.opin.b.replace(/\s*opnar beiðnir/, '')) + '</b></div>' : '') +
        (x.tala ? '<div><span>Færslur síðustu 12 mán.</span><b>' + esc(x.tala) + '</b></div>' : '') + '</div>' +
        '<button type="button" class="p2-til p2-gr" data-p2="sam-nyr">+ Nýr póstur</button>' +
        '<button type="button" class="p2-til" data-p2="sam-saga">Póstsaga</button>' +
        '<button type="button" class="p2-til" data-p2="sam-afgr">Merkja afgreitt</button>' +
        (x.imp ? '<button type="button" class="p2-til" data-p2="sam-imp">' + esc(x.imp) + '</button>' : '') +
        '<button type="button" class="p2-til" data-p2="sam-meira">Meira</button></div>' +
      '<div class="c2"><div class="flip" role="tablist"><button type="button" role="tab" data-p2="sam-tab-samtal" aria-selected="true">Samtal</button>' +
        '<button type="button" role="tab" data-p2="sam-tab-allt" aria-selected="false">Allar færslur</button>' +
        '<button type="button" role="tab" data-p2="sam-tab-vinna" aria-selected="false">Vinnusaga</button></div>' +
        (x.subj || x.txt ? '<div class="msg"><span class="av' + (fraKunna ? '' : ' ok') + '">' + esc(ini) + '</span><div class="tx"><b>' + esc(nafnFra) + '</b> <span class="m">' + esc(x.fra[1] || '') + '</span>' +
          (x.subj ? '<div class="l"><b>' + esc(x.subj) + '</b></div>' : '') + (x.txt ? '<div class="l">' + esc(x.txt) + '</div>' : '') + '</div>' +
          (bidur ? '<span class="p2-pl am">Svar bíður</span>' : '<span class="p2-pl">' + (fraKunna ? 'Svarað' : 'Frá okkur') + '</span>') + '</div>' : '<div class="msg"><div class="tx">Engin samskipti skráð</div></div>') +
        '<div class="svar"><button type="button" class="inn" data-p2="sam-svara">Skrifa svar til ' + esc(d.nafn) + '…</button><button type="button" class="p2-til p2-gr" data-p2="sam-svara">Svara</button></div></div>' +
      '<div class="c3"><div class="yf"><div class="t">YFIRLIT SAMSKIPTA</div>' + yf('Aðili', d.nafn) + yf('Tengiliður', d.tengilidur) +
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
      ['p2-haus', 'p2-glugg', 'p2-athug', 'p2-samsk', 'p2-flipar', 'p2-teikn', 'p2-adrar'].forEach(function (id) { var o = document.getElementById(id); if (o && o.parentNode) o.parentNode.removeChild(o); });
      h = document.createElement('div'); h.id = 'p2-haus'; h.className = 'p2-haus p2-nytt';
      var g = document.createElement('div'); g.id = 'p2-glugg'; g.className = 'p2-glugg p2-nytt';
      banner.insertAdjacentElement('beforebegin', h); h.insertAdjacentElement('afterend', g);
      var at = document.createElement('div'); at.id = 'p2-athug'; at.className = 'p2-athug p2-nytt';
      at.innerHTML = '<span aria-hidden="true">✎</span><textarea rows="1" aria-label="Athugasemd" placeholder="Athugasemd… (vistast sjálfkrafa)"></textarea>';
      g.insertAdjacentElement('afterend', at);
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
      if (e.id === 'p2-haus' || e.id === 'p2-glugg' || e.id === 'p2-athug' || e.id === 'p2-samsk' || e.id === 'p2-flipar' || e.id === 'p2-teikn' || e.id === 'p2-adrar') return;
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
    g.innerHTML = gluggi(d);
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
  function haed(t) { t.style.height = '30px'; var h = Math.min(120, t.scrollHeight); if (h > 30) t.style.height = h + 'px'; }
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
      ['Póstafrit', '.sk-mailpref'],
      ['Eyða', '._co-delete']
    ];
    var v = document.createElement('div'); v.className = 'p2-valm'; v.setAttribute('role', 'menu');
    var html = '';
    atridi.forEach(function (a, i) {
      var el = sel(m, a[1]); if (!el) return;
      var t = txt(el).replace(/^[^\wÁ-ÿ]+/, '') || a[0];
      if (i === 0) t = 'Þjónustusamningur';
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
      var a = atridi[+b.getAttribute('data-i')]; var el = sel(m, a[1]); loka(); if (el) el.click();
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
      var bn = sel(m, '.co-banner'); if (bn) { bn.classList.toggle('p2-open'); b.textContent = bn.classList.contains('p2-open') ? 'Fela gömlu reitina' : 'Breyta / bæta við upplýsingum'; }
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
