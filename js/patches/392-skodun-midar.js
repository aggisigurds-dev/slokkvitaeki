/* === SKOÐANASÍÐURNAR Í MIÐAKERFINU (392) — 22.09.2026 ===
 *
 * Agnar: „mátt kanski bara gera báðar hinar skoðana tegundirnar í sama stíl" → Slökkvikerfis
 * skoðun (#slokkvikerfi) og Brunakerfis skoðun (#brunaskra) fá sama útlit og Afgreiðsla (389),
 * Verkstæði (390), Kröfu yfirlit (166) og hliðarstikan (391): ferkantaðir gluggar, Playfair á
 * tölum, mono á merkingum og MÁLMPLÖTUR á stöðum — engir pastellitir.
 * Hönnunin: https://claude.ai/artifact/KbvQMth5FzXN5vQHdj86k1 · kerfið: Stöðuplata í
 * https://claude.ai/artifact/MfY6rBkwqEkKaSrJd6TKKj
 *
 * AÐEINS útlit. Báðar síður eru teiknaðar af EINUM íhlut — `Thjonustuskra.buaTil(FLOKKUR)` í
 * 385 — og 388 fóðrar hann brunakerfisgögnum; hvorug skrá er snert hér. Stílblað 385 býr INNI
 * í sýninni (`#view-<key> ._sk-…`, 1 auðkenni + 1 klasi), svo hér er `html body #view-… .klasi`
 * (1 auðkenni + 2 element) og málið dautt án !important-stríðs.
 *
 * Stöðurnar sex (sama regla og í Stöðuplötu-íhlutnum):
 *   done grænn málmur · work blár · plan stál (seinna) · skip gull (bíður núna) · late rauður ·
 *   off silfur. Díóðan fremst kemur úr ::before, svo markupið er ósnert.
 */
(() => {
  if (window.__skodunMidarInstalled) return;
  window.__skodunMidarInstalled = true;

  const VIEWS = ['view-slokkvikerfi', 'view-brunaskra'];
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const GRAPHITE = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const GREEN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const GOLD = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  const BLUE = 'linear-gradient(145deg,#040d18 0%,#0b2440 20%,#154a7d 43%,#2f7fc9 53%,#0d2b4c 74%,#040d18 100%)';
  const GREENP = 'linear-gradient(145deg,#02100a 0%,#07301c 30%,#0d5130 55%,#062719 80%,#010c07 100%)';
  const REDP = 'linear-gradient(145deg,#100203 0%,#330607 30%,#6b1114 55%,#2a0506 80%,#0c0102 100%)';
  const GOLDP = 'linear-gradient(145deg,#120c02 0%,#2f2105 30%,#7a5a0e 55%,#2a1e05 80%,#0f0a01 100%)';

  function css() {
    // Eitt regluspjald fyrir báðar sýnirnar: hver regla er skrifuð fyrir bæði auðkennin.
    const R = (sel, body) => VIEWS.map(id => 'html body #' + id + ' ' + sel).join(',') + '{' + body + '}';
    const SELF = (body) => VIEWS.map(id => 'html body #' + id).join(',') + '{' + body + '}';
    return [
      // Flöturinn: sami halli og aðrir skjáir (385 setur inline #eef1f5 á sýnina)
      SELF('background-color:#9ba1ad!important;background-image:' + STRIPE + 'linear-gradient(180deg,#0b0c0e 0px,#1c1e22 120px,#8f96a1 360px,#9ba1ad 100%)!important'),
      R('._sk-root', 'max-width:1600px;padding:24px 24px 64px;-webkit-font-smoothing:antialiased'),

      // Haus: Playfair-titill á dökka bandinu, mono-ártal
      R('._sk-hd', 'align-items:flex-end;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.12)'),
      R('._sk-hd h1', 'font-family:' + DISPLAY + '!important;font-size:34px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em!important;color:#fff!important;background:transparent!important;padding:0!important;border-radius:0!important;text-shadow:0 2px 8px rgba(0,0,0,.45)!important'),
      R('._sk-hd h1 small', 'font-family:' + MONO + '!important;font-size:12px!important;font-weight:700!important;letter-spacing:.16em;color:#d3ab4e!important;margin-left:8px'),
      R('._sk-hd ._sk-lbl,' + '._sk-hd label', 'color:#d5dbe6!important'),

      // Takkar í haus: silfur og málmur
      R('._sk-btn', 'height:36px;padding:0 13px;border:1px solid rgba(20,24,34,.16)!important;border-radius:3px!important;background:' + SILVER + '!important;color:#3a4250!important;font:600 12.5px ' + SANS + '!important;box-shadow:0 6px 16px -12px rgba(0,0,0,.5)!important'),
      R('._sk-btn.on', 'border-color:#000!important;background:' + METAL + '!important;color:#fff!important'),
      R('._sk-btn.pri,' + '._sk-pri', 'border:1px solid rgba(190,32,28,.55)!important;background:' + RED + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),

      // Lykiltölur: sömu málmspjöld og í Ársskoðunar-hönnuninni — hetja, grænt, rautt, gull
      R('._sk-kpis', 'grid-template-columns:repeat(auto-fit,minmax(190px,1fr))!important;gap:12px;margin-bottom:14px'),
      R('._sk-kpi', 'background-image:' + STRIPE + METAL + '!important;background-color:#101114!important;border:0!important;border-top:3px solid #f0584c!important;border-radius:2px!important;padding:16px 18px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 30px -14px rgba(0,0,0,.7)!important'),
      R('._sk-kpi small', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.14em!important;color:#f0584c!important'),
      R('._sk-kpi b', 'display:block;margin-top:8px;font-family:' + DISPLAY + '!important;font-size:38px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em;font-variant-numeric:lining-nums tabular-nums;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6)'),
      R('._sk-kpi.warn b', 'color:#fff!important'),
      // 2 Skoðað = grænn málmur · 3 Á gjalddaga = rauður · 4 Órukkað = gull · 5 Verð vantar = gull
      R('._sk-kpi:nth-child(2)', 'background-image:' + STRIPE + GREENP + '!important;border-top-color:#16783f!important'),
      R('._sk-kpi:nth-child(2) small', 'color:#7fe0a8!important'),
      R('._sk-kpi:nth-child(3)', 'background-image:' + STRIPE + REDP + '!important;border-top-color:#971515!important'),
      R('._sk-kpi:nth-child(3) small', 'color:#ffb3ab!important'),
      R('._sk-kpi:nth-child(4)', 'background-image:' + STRIPE + GOLDP + '!important;border-top-color:#b8912f!important'),
      R('._sk-kpi:nth-child(4) small', 'color:#ffd27a!important'),
      R('._sk-kpi:nth-child(5)', 'background-image:' + STRIPE + GOLDP + '!important;border-top-color:#b8912f!important'),
      R('._sk-kpi:nth-child(5) small', 'color:#ffd27a!important'),

      // Síuflísar: ferkantaðar stálflísar, valin flís í málmi
      R('._sk-sia', 'gap:6px;margin-bottom:10px'),
      R('._sk-chip', 'height:32px;padding:0 12px;border:1px solid rgba(20,24,34,.18)!important;border-radius:3px!important;background:' + SILVER + '!important;color:#3a4250!important;font:600 12.5px ' + SANS + '!important;display:inline-flex;align-items:center;gap:7px'),
      R('._sk-chip b', 'font-family:' + MONO + '!important;font-size:11px;font-weight:700;opacity:1!important;color:#6b7483!important;margin-left:0!important'),
      R('._sk-chip.on', 'border-color:#000!important;background:' + METAL + '!important;color:#fff!important'),
      R('._sk-chip.on b', 'color:#d5dbe6!important'),
      R('._sk-chip.tom', 'opacity:.45!important'),

      // Leit og val
      R('._sk-inp', 'height:36px;border:1px solid rgba(20,24,34,.18)!important;border-radius:3px!important;background:#eef1f6!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.14)!important;font:400 13px ' + SANS + '!important;color:#11141c!important'),
      R('._sk-lbl', 'font:500 12.5px ' + SANS + '!important;color:#1f2530!important'),

      // Taflan: ferkantaður rammi, málmhaus, mono-dálkaheiti
      R('._sk-tblwrap', 'border:0!important;border-top:3px solid #c92a2a!important;border-radius:2px!important;background:#fff!important;box-shadow:0 1px 1px rgba(15,20,30,.2),0 10px 22px -14px rgba(15,20,30,.45)!important'),
      R('table._sk-tbl thead tr', 'background:' + METAL + '!important'),
      R('table._sk-tbl th', 'font-family:' + MONO + '!important;font-size:10px!important;letter-spacing:.12em!important;color:#aeb6c4!important;padding:10px 12px!important'),
      R('table._sk-tbl tbody td', 'border-top:1px solid #f1f3f7!important;font-family:' + SANS + '!important'),
      R('table._sk-tbl tbody tr._sk-row:hover', 'background:#fbfcfe!important'),
      // Agnar 22.09: „texta nótusvæðið er óþarflega stórt" — nótan fær fast þak (280px)
      // og plássið sem losnar fer í nafnadálkinn, sem var að brjóta sig í þrjár línur.
      // 23.09 (skjámynd Agnars af síma, 980 px Tölvusíðu-hamur): nafndálkurinn er auto en taflan hélt 1170 px lágmarki 385 —
      // föstu dálkarnir (50+280+150+52+214+110+86+186 = 1128) skildu 41 px eftir handa nafninu, sem braut sig orð fyrir orð.
      // Lágmarkið rúmar nú nafnið (≥ 200 px); umbúðirnar ._sk-tblwrap skruna lárétt á mjórri skjá.
      // 23.09 (hönnun D, „smá overlap"): Skoðun-dálkurinn (52px) lét röðunarörina skarast við Ár; Reikningur (86px) braut upphæðir.
      R('table._sk-tbl', 'min-width:1382px!important'),
      R('table._sk-tbl colgroup col:nth-child(5)', 'width:86px!important'),
      R('table._sk-tbl colgroup col:nth-child(8)', 'width:104px!important'),
      R('table._sk-tbl colgroup col:nth-child(2)', 'width:auto!important'),
      R('table._sk-tbl colgroup col:nth-child(3)', 'width:280px!important'),
      // Stöðudálkurinn er 158px í 385 en platan er 150px + fylling — hann fær 186px
      // svo hún klippist ekki við hægri kant.
      R('table._sk-tbl colgroup col:nth-child(9)', 'width:186px!important'),
      R('table._sk-tbl td textarea._sk-nota', 'max-width:280px'),

      // Ár-flísarnar: sama form og fyrr (46px, díóða) — málmur í stað pastel
      R('._sk-yr', 'border-radius:5px!important;font-family:' + MONO + '!important;background:' + SILVER + '!important;border:1px solid #d7dbe2!important;color:#8a93a3!important'),
      R('._sk-yr.on', 'background:' + SILVER + '!important;border-color:#cfd5de!important;color:#3a4250!important'),
      R('._sk-yr.both', 'background:' + GREEN + '!important;border-color:rgba(52,168,98,.45)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
      R('._sk-yr.now', 'background:' + RED + '!important;border-color:rgba(190,32,28,.55)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
      R('._sk-yr.penda', 'background:' + GOLD + '!important;border-color:rgba(190,150,60,.5)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
      R('._sk-yr.both::before', 'background:#7fe0a8!important;box-shadow:none!important'),
      R('._sk-yr.now::before', 'background:#ff9d95!important'),
      R('._sk-yr.penda::before', 'background:#f7e6a8!important'),
      R('._sk-yr.lit::before', 'background:#23a35a!important;box-shadow:none!important'),

      // Skrefin: ferkantaðar mono-flísar
      R('._sk-skref i', 'border-radius:3px!important;font-family:' + MONO + '!important;background:' + SILVER + '!important;border:1px solid #d7dbe2!important;color:#8a93a3!important'),
      R('._sk-skref i.on', 'background:' + GREEN + '!important;border-color:rgba(52,168,98,.45)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),

      // Stöðuplöturnar sex — jafnstórar, díóða fremst
      R('._sk-st', 'position:relative;justify-content:flex-start!important;gap:7px;min-width:150px;height:26px;min-height:26px!important;padding:0 10px!important;border-radius:3px!important;font-family:' + SANS + '!important;font-size:11.5px!important;font-weight:700!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
      R('._sk-st::before', 'content:"";flex:none;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.75)'),
      R('._sk-st--done', 'background:' + GREEN + '!important;border:1px solid rgba(52,168,98,.45)!important'),
      R('._sk-st--done::before', 'background:#7fe0a8'),
      R('._sk-st--work', 'background:' + BLUE + '!important;border:1px solid rgba(60,120,200,.45)!important'),
      R('._sk-st--work::before', 'background:#9fd0ff'),
      R('._sk-st--plan', 'background:' + GRAPHITE + '!important;border:1px solid #000!important;color:#eef1f4!important'),
      R('._sk-st--plan::before', 'background:#8f98a8'),
      R('._sk-st--skip', 'background:' + GOLD + '!important;border:1px solid rgba(190,150,60,.5)!important;color:#fff!important'),
      R('._sk-st--skip::before', 'background:#f7e6a8'),
      R('._sk-st--late', 'background:' + RED + '!important;border:1px solid rgba(190,32,28,.55)!important'),
      R('._sk-st--late::before', 'background:#ff9d95'),
      R('._sk-st--off', 'background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;color:#5b6472!important;text-shadow:none!important'),
      R('._sk-st--off::before', 'background:#aeb6c4'),

      // ── hönnun D (Agnar 23.09 21:20, strigi UcyMFZNi1sVNPGiHdYSWCZ): síðan sem EITT stálspjald — málmhaus með hnoðum,
      //    stálplata undir KPI, síum og töflu; síuraðirnar þrjár mynda eitt hvítt spjald með merkjum (Staða · Mánuður · Leit);
      //    talningin „N af N" sem plata; fótur með litaskýringu. CSS eitt — 385 teiknar sama markup, hver takki heldur sér. ──
      R('._sk-root', 'background:#e2e6ec!important;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)!important;border:1px solid #000;border-radius:14px;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);padding:0 0 16px!important;overflow:hidden;margin:24px auto 64px'),
      R('._sk-hd', 'position:relative;background:' + METAL + ';border-bottom:1px solid #000!important;padding:18px 24px 16px!important;margin:0 0 14px!important;align-items:center!important;gap:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
      R('._sk-hd::before,' + '._sk-hd::after', 'content:"";position:absolute;top:8px;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none'),
      R('._sk-hd::before', 'left:8px'),
      R('._sk-hd::after', 'right:8px'),
      R('._sk-hd ._sk-btn', 'height:40px!important;padding:0 14px!important;border-radius:9px!important'),
      R('._sk-hd ._sk-utlit ._sk-btn', 'border-radius:0!important'),
      R('._sk-hd ._sk-utlit ._sk-btn:first-child', 'border-radius:9px 0 0 9px!important'),
      R('._sk-hd ._sk-utlit ._sk-btn:last-child', 'border-radius:0 9px 9px 0!important'),
      R('._sk-villa,' + '._sk-kpis,' + '._sk-tblwrap,' + '._sk-cards', 'margin-left:12px!important;margin-right:12px!important'),
      R('._sk-kpi', 'border-radius:10px!important;border:1px solid #000!important;border-top-width:3px!important'),
      // síuraðirnar þrjár = eitt hvítt spjald; merki fremst í hverri röð (Staða · Mánuður · Leit)
      R('._sk-sia', 'margin:0 12px!important;padding:8px 12px 8px 12px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);gap:6px!important'),
      R('._sk-sia::before', 'content:"";flex:none;width:84px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#525b6b'),
      R('._sk-kpis + ._sk-sia', 'border-radius:8px 8px 0 0;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)'),
      R('._sk-kpis + ._sk-sia::before', 'content:"Staða"'),
      R('._sk-sia + ._sk-sia', 'box-shadow:inset 1px 0 0 rgba(20,24,34,.12),inset -1px 0 0 rgba(20,24,34,.12)'),
      R('._sk-sia + ._sk-sia::before', 'content:"Mánuður"'),
      R('._sk-sia:has(._sk-inp)', 'border-radius:0 0 8px 8px;margin-bottom:12px!important;box-shadow:inset 0 -1px 0 rgba(20,24,34,.12),inset 1px 0 0 rgba(20,24,34,.12),inset -1px 0 0 rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)'),
      R('._sk-sia:has(._sk-inp)::before', 'content:"Leit"'),
      R('._sk-chip', 'border-radius:7px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
      R('._sk-chip b', 'height:18px;min-width:18px;padding:0 5px;border-radius:5px;background:#eceff4!important;color:#1f2530!important;display:inline-flex;align-items:center;justify-content:center;margin-left:2px!important'),
      R('._sk-chip.on b', 'background:rgba(255,255,255,.16)!important;color:#fff!important'),
      R('._sk-chip[data-st="fram"]:not(.on) b', 'background:#fde3e0!important;color:#b42318!important'),
      R('._sk-chip[data-st="orukkad"]:not(.on) b', 'background:#fbeac6!important;color:#7a4f06!important'),
      R('._sk-inp', 'border-radius:8px!important'),
      R('._sk-sia ._sk-sp + ._sk-lbl', 'height:24px;padding:0 9px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);font:700 10.5px ' + MONO + '!important;letter-spacing:.06em;text-transform:uppercase;color:#11141c!important'),
      R('._sk-tblwrap', 'border-top:0!important;border-radius:8px!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)!important'),
      R('table._sk-tbl th', 'height:38px;color:#eef1f4!important;letter-spacing:.14em!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)'),
      R('._sk-co', 'font-size:13.5px!important'),
      R('._sk-post', 'color:#5b6472!important'),
      // fótur: litaskýring (eina viðbótin sem er ekki í markupi 385 — texti einn)
      R('._sk-tblwrap::after', 'content:none'),
      R('._sk-root::after', 'content:"Grænt = skýrsla ársins til · Gull = skoðað en órukkað · Rautt = skoðun vantar / fram yfir · Blátt = þennan mánuð — Skref: Sk skoðað · Sk skýrsla · Re reikningur — smellur á röð opnar síðu fyrirtækisins";display:block;margin:10px 16px 0;font-family:' + MONO + ';font-size:11.5px;color:#525b6b'),
      VIEWS.map(id => 'html body #' + id + '._sk-spjold ._sk-root::after').join(',') + '{content:none}',
      // Spjaldahamur (mjór gluggi / sími): sömu ferköntuðu gluggar
      R('._sk-card', 'border:0!important;border-top:3px solid #8f98a8!important;border-radius:2px!important;box-shadow:0 1px 1px rgba(15,20,30,.2),0 10px 22px -14px rgba(15,20,30,.45)!important'),
      R('._sk-cardnafn', 'font-family:' + SANS + '!important;font-weight:600!important'),
      R('._sk-mono,' + '._sk-kt,' + '._sk-post,' + '._sk-sidast,' + '._sk-cardsidast', 'font-family:' + MONO + '!important;font-variant-numeric:tabular-nums lining-nums'),
    ].join('\n');
  }

  // Agnar 22.09: „mátt held ég bara nota þennan gráa bakgrunn allstaðar á síðunni."
  // Sami halli og appið notar nú þegar (224) — EINA viðbótin er burstaða glansröndin.
  // 224 telur nokkrar sýnir upp með auðkenni; þær eru endurteknar hér (sama sérhæfni,
  // seinna í blaðinu = vinnur). Sýnir sem Agnar hefur sjálfur málað í Stílstjóranum
  // (#view-hreyfingarlisti mynd · #view-arsskodun blátt · #view-tilbodhub mynstur) eru
  // ÓSNERTAR — auðkennis-reglur hans standa ofar almennu reglunni hér.
  const APP_BG = STRIPE + 'linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%)';
  const MED_AUDKENNI = ['view-thjonustu-verkstaedi', 'view-bokhalds-yfirlit', 'view-thjonustuverk', 'view-beidnir',
    'view-verkbord', 'view-bakendi', 'view-utlit', 'view-tilbod', 'view-vertid', 'view-vsk-report',
    'view-bokhald-yfirferd', 'view-kerfi', 'view-vidsk-detail', 'view-krofu-yfirlit', 'view-allir-vidsk',
    'view-vorur', 'view-income'];
  function flotur() {
    const body = 'background-color:#9ba1ad!important;background-image:' + APP_BG + '!important';
    return 'html body div.view[id^="view-"][id]{' + body + '}\n'
      + MED_AUDKENNI.map(id => 'html body #' + id + '.view').join(',') + '{' + body + '}';
  }

  function inject() {
    if (document.getElementById('_skm-css')) return;
    if (!document.getElementById('_skm-font')) {
      const lf = document.createElement('link');
      lf.id = '_skm-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(lf);
    }
    const st = document.createElement('style');
    st.id = '_skm-css';
    st.textContent = flotur() + '\n@media (min-width: 901px){\n' + css() + '\n}';
    (document.head || document.documentElement).appendChild(st);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  console.log('[392] skoðanasíður í Miðakerfinu');
})();
/* === END SKOÐANASÍÐUR Í MIÐAKERFINU === */
