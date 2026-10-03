/* === SKÝRSLA OG REIKNINGUR — samantektin í útliti C (412) — 24.09.2026 ===
 *
 * Agnar 24.09 (skjámynd af spjaldi C á Design-striganum): „Mátt síðan breyta útlitinu hjá skýrslu-samantektinni í
 * svona frekar." Hægri dálkurinn á fyrirtækjasíðunni (úttekt) verður EITT spjald í röðinni sem strigi C sýnir:
 *
 *   dökkur haus  ·  Skýrsla og reikningur <ár> · SAMTALS m. vsk stórt · stöðuplötur (skýrsla/reikningur) · „N af N tæki í
 *                   ferð" · takkarnir (Búa til úttektarskýrslu · Vista óklárað · Endurreikna)
 *   stálflötur   ·  Skoðunaraðili · Framkvæmd · Dags.  →  Upplýsingar um úttekt · Athugasemdir · Vettvangsathuganir
 *                   →  Texti á reikning  →  Línur reiknings (Verðlisti · Vara eða þjónusta)  →  taflan  →  samtölur  →
 *                   Vista / Klára
 *
 * AÐFERÐ: engir hnútar færðir. 129 (#_ctc-section) og 224 (#_ctc-notes) skrifa sín hólf sjálf upp á nýtt; væru hnútar
 * færðir milli þeirra týndust þeir við næstu teikningu. Í staðinn: #_ctc-slot er flex-dálkur, #_ctc-section er
 * display:contents (börnin hans verða flex-atriði dálksins) og `order` raðar #_ctc-notes inn á milli þeirra. Það eina
 * sem JS gerir er að spegla samtöluna (#_ctc-sum-total) og árið upp í hausinn (tveir litlir hnútar sem eru endurgerðir
 * þegar 129 teiknar hausinn upp á nýtt). Aðeins tölva í Brunastáli (sama gildissvið og 402/404/411).
 */
(function () {
  'use strict';
  if (window.__samantekt412) return;
  window.__samantekt412 = true;

  // HT-3.10 (03.10.2026, afköst): var '#companies-main:has(.co-banner)'. :has() gerði #companies-main að akkeri sem hver
  // DOM-breyting inni í prófílnum ógilti, og þá var stíll ALLS prófílsins endurreiknaður í hvert sinn. 440-kyrrd setur
  // klasann co-opid á #companies-main um leið og .co-banner er þar (sama skilyrði, sama sértækni 1,1,0).
  var S = 'html[data-thm-preset="brunastal"]:not([data-viewmode="mobile"]):not(.slokk-phone-dev) body:not(.appmode) #companies-main.co-opid ';
  var F = ':not(#_p412a):not(#_p412b):not(#_p412c):not(#_p412d):not(#_p412e):not(#_p412f)';
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var STAL = '#e2e6ec';
  var STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 1px 2px rgba(0,0,0,.08)';
  var SILVER_BTN = 'background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530';
  var METAL_BTN = 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4';
  var SEC = '#_ctc-section > ';
  // 1 haus · 2 #_uv-strip · 3 reitir · 4 takkar · 5 texti · 6 verðlisti · 7 tafla · 8 samtölur · 9 ._vw-bar
  // 02.10.2026: hlutarnir þekktir af INNIHALDI, ekki stöðu. nth-of-type(n) gerði ráð fyrir að #_uv-strip væri alltaf
  // til; þar sem hann vantar færðust allir hlutar um einn — reitirnir (Skoðunaraðili/Framkvæmd/Dags.) fengu enga röð og
  // lentu OFAN við hausinn, texti og takkar víxluðust (skjámynd Agnars 02.10, fyrirtæki án úttektarstrimils).
  var HLUTI = {
    1: 'div:first-of-type',
    3: 'div:has(#_ctc-skodun)',
    4: 'div:has(#_ctc-skyrsla)',
    5: 'div:has(#_ctc-invtext)',
    6: 'div:has(#_ctc-add-extra)',
    7: 'div:has(table)',
    8: 'div:has(#_ctc-sum-subex)'
  };
  var D = function (n) { return SEC + HLUTI[n]; };

  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + css + '}'; }
  function imp(css) { return css.split(';').filter(Boolean).map(function (d) { return /!important/.test(d) ? d : d + '!important'; }).join(';'); }   // !important á HVERJA eigind (129 skrifar inline)
  var css = [
    // skelin: dálkurinn sjálfur er spjaldið, hólfin tvö gegnsæ
    r('#_ctc-slot', 'display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:0!important;position:relative!important;background:#fff!important;border:1px solid #000!important;border-radius:14px!important;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3)!important;overflow:hidden!important;padding:0!important'),
    r('#_ctc-section', 'display:contents!important'),
    // 02.10.2026 (Agnar: „the upper part is better in brunakerfi"): hausinn eins og 274 — titill og tala vinstra megin,
    // plöturnar staflaðar uppi í hægra horninu, takkarnir neðst til hægri. #_ctc-slot er grid: hausinn fyllir línu 1,
    // #_uv-strip (328) leggst ofan á hægri endann á sömu línu, takkarnir línu 2; allt annað fullbreitt þar fyrir neðan.
    r('#_ctc-slot > *,#_ctc-section > *', 'grid-column:1 / -1'),
    r('#_ctc-slot::before,#_ctc-slot::after', 'content:"";position:absolute;top:8px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);z-index:2;pointer-events:none'),
    r('#_ctc-slot::before', 'left:8px'), r('#_ctc-slot::after', 'right:8px'),
    r('#_ctc-notes', 'order:5!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0 12px 4px!important;margin:0!important;display:flex!important;flex-direction:column!important;gap:6px!important'),
    // röðin
    r(D(1), 'order:1!important;grid-column:1 / -1!important;grid-row:1!important'), r('#_uv-strip', 'order:2!important;grid-column:2!important;grid-row:1!important'), r(D(4), 'order:3!important;grid-column:1 / -1!important;grid-row:2!important'), r(D(3), 'order:4!important'),
    r(D(5), 'order:6!important'), r(D(6), 'order:7!important'), r(D(7), 'order:8!important'), r(D(8), 'order:9!important'), r(SEC + '._vw-bar', 'order:10!important'),
    // ── dökki hausinn (1) + plötur (2) + takkar (4): einn málmflötur ──
    r(D(1), 'margin:0!important;padding:14px 18px 8px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:' + METAL + '!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 14px!important;position:relative;justify-content:flex-start!important'),   // 129 skrifar space-between inline — vísirinn lenti undir plötunum
    r(D(1) + ' > div:first-child', 'display:none!important'),                                    // „🧾 REIKNINGUR" — titillinn kemur úr .b412-titill (nth-of-type: .b412-hnútarnir okkar eru síðastir)
    r(D(1) + ' > div:nth-of-type(2)', 'font-family:' + MONO + '!important;font-size:11.5px!important;color:#8e97a6!important;order:3;flex:1 1 100%!important;margin:0!important'),
    r(D(1) + ' .b412-titill', 'order:0;flex:1 1 100%;font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d9dee6;display:flex;align-items:center;gap:9px'),
    r(D(1) + ' .b412-titill i', 'width:8px;height:8px;border-radius:50%;background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.85);display:inline-block'),
    r(D(1) + ' .b412-tala,' + D(1) + ' .b412-tala > span', 'font-family:' + DISPLAY + '!important;font-size:38px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em!important;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),   // !important: 402 setur div:last-child í hausnum 11,5 px
    r(D(1) + ' .b412-tala', 'order:1!important;flex:none!important;display:flex!important;align-items:baseline!important;gap:8px!important;margin:0!important;opacity:1!important'),
    r(D(1) + ' .b412-tala small', 'font-family:' + DISPLAY + '!important;font-size:16px!important;font-weight:700!important;color:#d9dee6!important;letter-spacing:-.005em!important'),
    // plöturnar (328): staflaðar uppi í hægra horninu OFAN Á hausnum (gegnsætt — málmur hausins skín í gegn), hvítar
    // silfurplötur með lituðum punkti eins og .b274-plata; táknið (._uv-tk) falið, data-tone ræður punktinum.
    r('#_uv-strip', 'margin:0!important;padding:16px 20px 8px 8px!important;background:transparent!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;justify-content:flex-start!important;gap:6px!important;flex-wrap:nowrap!important;align-self:start!important;position:relative!important;z-index:1!important'),
    r('#_uv-strip > span', 'height:22px!important;padding:0 8px!important;border-radius:3px!important;border:1px solid rgba(20,24,34,.12)!important;background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)!important;color:#1f2530!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;display:inline-flex!important;align-items:center!important;gap:6px!important;white-space:nowrap'),
    r('#_uv-strip > span::before', 'content:"";width:5px;height:5px;border-radius:50%;flex:none;background:#8f98a8'),
    r('#_uv-strip > span[data-tone="graent"]::before', 'background:#1f9d57'),
    r('#_uv-strip > span[data-tone="hlutlaust"],#_uv-strip > span[data-tone="raudt"]', 'color:#b42318!important'),
    r('#_uv-strip > span[data-tone="hlutlaust"]::before,#_uv-strip > span[data-tone="raudt"]::before', 'background:#e25555'),
    r('#_uv-strip > span[data-tone="gult"]', 'color:#7a4f06!important'),
    r('#_uv-strip > span[data-tone="gult"]::before', 'background:#b8912f'),
    r('#_uv-strip ._uv-tk', 'display:none!important'),
    r(D(4), 'margin:0!important;padding:4px 18px 14px!important;background:' + METAL + '!important;border-bottom:1px solid #000!important;display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-end!important'),
    r(D(4) + ' button', 'height:36px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-weight:600!important;font-size:12.5px!important;padding:0 14px!important'),
    // flex:0 0 auto (02.10): 129 gefur takkanum inline `flex:1;min-width:180px` — breiddin kom úr afgangsplássinu, ekki
    // innihaldinu, og í 50/50-dálkinum (402) flæddi „✓ 2026"-merkið út fyrir hann. Nú ræður innihaldið og hann fer í
    // næstu línu þegar plássið þrýtur.
    r('#_ctc-skyrsla', imp(METAL_BTN) + ';margin-left:0!important;order:3;flex:0 0 auto!important'),
    // 24.09 (Agnar): „Þegar búið er að ýta á búa til úttektarskýrslu þá á allur takkinn að verða svona
    // grænn" — sami grænn og „Staðfesta lista" (404 SAEKJA). 328 setur klasann ._uv-til þegar skýrslan
    // er til og litla merkið segir „✓ 2026" í hvítu.
    r('#_ctc-skyrsla._uv-til', imp('background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)')),
    r('#_ctc-skyrsla._uv-til ._uv-rb', imp('background:rgba(255,255,255,.14);color:#fff;font-size:10px;letter-spacing:.04em')),
    r('#_ctc-vista,#_ctc-endurreikna', imp(SILVER_BTN)),
    // ── stálflöturinn ──
    r(D(3) + ',' + D(5) + ',' + D(6) + ',' + D(7) + ',' + D(8) + ',' + SEC + '._vw-bar', 'margin:0!important;background:' + STAL + '!important;background-image:' + STAL_IMG + '!important;padding:6px 12px!important'),
    r(D(3), 'padding-top:12px!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important'),
    r(D(3) + ' > label', 'display:flex!important;flex-direction:column!important;gap:4px!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important'),
    r(D(3) + ' > label input,' + D(3) + ' > label select', LINE + '!important;height:38px!important;border:0!important;padding:0 10px!important;font-family:' + SANS + '!important;font-size:13px!important;color:#141822!important'),
    r('#_ctc-notes > div:first-child > div,#_ctc-notes > div:nth-of-type(2)', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important'),
    // Agnar 14:30 („make the message space bigger and more stylish"): skilaboðareitirnir stærri, hvítir með innri skugga og málm-fókus
    r('#_ctc-notes', 'padding:10px 12px 6px!important;gap:8px!important'),
    r('#_ctc-notes textarea', imp(LINE) + ';border:0!important;border-radius:8px!important;padding:11px 13px!important;font-family:' + SANS + '!important;font-size:13.5px!important;line-height:1.45!important;color:#141822!important;resize:vertical!important;box-shadow:inset 0 2px 5px rgba(20,24,34,.10),inset 0 0 0 1px rgba(20,24,34,.14)!important;transition:box-shadow .12s'),
    r('#_ctc-notes textarea:focus', 'outline:0!important;box-shadow:inset 0 2px 5px rgba(20,24,34,.10),inset 0 0 0 1px rgba(20,24,34,.14),0 0 0 3px rgba(58,58,65,.28)!important'),
    // B45 (Agnar 01.10: „lower the height a bit on those boxes“): 132/96 → 76/52 px; enn hægt að draga þá stærri
    r('#_ctc-notes #_ctc-notes-ta', 'min-height:76px!important;height:76px'),
    r('#_ctc-notes #_ctc-athskyrsla', 'min-height:52px!important;height:52px'),
    r('#_ctc-notes textarea::placeholder', 'color:#8e97a6!important;font-style:normal!important'),
    r('#_ctc-notes > div:first-child', 'display:flex!important;align-items:center!important;gap:8px!important;margin:0!important'),
    r('#_ctc-notes > div:nth-of-type(2)', 'margin:4px 0 0!important'),
    r(D(5) + ' input', imp(LINE) + ';border:0!important;height:42px!important;padding:0 13px!important;font-family:' + SANS + '!important;font-size:13.5px!important;color:#141822!important;box-shadow:inset 0 2px 5px rgba(20,24,34,.10),inset 0 0 0 1px rgba(20,24,34,.14)!important'),
    r('#_ctc-notes .ut-txtgen', imp(SILVER_BTN) + ';height:26px!important;border-radius:7px!important;font-family:' + SANS + '!important;font-size:12px!important;font-weight:600!important;padding:0 10px!important'),
    r(D(5) + ' > label', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important'),
    r(D(5) + ' input', LINE + '!important;border:0!important;height:38px!important;padding:0 10px!important;font-family:' + SANS + '!important;font-size:13px!important;color:#141822!important'),
    r(D(5) + ' > div:last-child', 'font-family:' + SANS + '!important;font-size:11px!important;color:#6b7483!important'),
    // B45 („make the text more visible“): merkið „Texti á reikning“ bar innlínulit (var(--ink2), ljóst) á spanninu og hvarf á stálinu;
    // bundið við reitinn sjálfan (:has) svo röð hólfanna skipti ekki máli.
    r('#_ctc-section label:has(#_ctc-invtext)', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important;gap:10px!important'),
    r('#_ctc-section label:has(#_ctc-invtext) > span', 'color:#3a4250!important;font-weight:700!important'),
    r('#_ctc-section label:has(#_ctc-invtext) + div', 'font-family:' + SANS + '!important;font-size:11.5px!important;color:#3a4250!important;margin-top:4px!important'),
    r('#_ctc-section div:has(> label > #_ctc-invtext)', 'background:' + STAL + '!important;background-image:' + STAL_IMG + '!important'),
    // B46 („black text on black“): samtölubandið er málmur — letrið ljóst, talan í Playfair
    r('#_ctc-section div:has(> #_ctc-sum-total)', 'background:' + METAL + '!important;border:1px solid #000!important;border-radius:8px!important;color:#eef1f4!important'),
    r('#_ctc-section div:has(> #_ctc-sum-total) *', 'color:#eef1f4!important'),
    r('#_ctc-section div:has(> #_ctc-sum-total) > :first-child', 'font-family:' + MONO + '!important;font-size:11px!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:#d9dee6!important'),
    r('#_ctc-section #_ctc-sum-total', 'font-family:' + DISPLAY + '!important;font-size:24px!important;font-weight:800!important;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)!important'),
    // B44 → 02.10.2026 (Agnar: „í vinnsla button is quite ugly … doesn't need to be big, just some blue light indicator"):
    // lítil dökk plata við hlið samtölunnar með ljósdíóðu — slökkt grá, logar blá þegar verkið er í vinnslu (165 ræður .on).
    // Sama útlit og .b274-vinnsla á brunakerfis-flipanum.
    r(D(1) + ' ._vw-topbtn', 'order:2!important;align-self:center!important;margin:0 0 0 6px!important;display:inline-flex!important;align-items:center!important;gap:7px!important;height:26px!important;padding:0 11px 0 9px!important;border-radius:13px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(0,0,0,.35)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)!important;color:#aeb6c4!important;font:700 10.5px/1 ' + MONO + '!important;letter-spacing:.1em!important;text-transform:uppercase!important;text-shadow:none!important;white-space:nowrap!important;cursor:pointer'),
    r(D(1) + ' ._vw-topbtn:hover', 'color:#fff!important;border-color:rgba(255,255,255,.3)!important'),
    r(D(1) + ' ._vw-topbtn ._vw-led', 'width:8px;height:8px;border-radius:50%;flex:none;background:#4a4f59;box-shadow:inset 0 1px 1px rgba(0,0,0,.5)'),
    r(D(1) + ' ._vw-topbtn.on', 'color:#cfe0ff!important;border-color:rgba(127,180,255,.45)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.5),0 0 14px -2px rgba(80,140,255,.55)!important'),
    r(D(1) + ' ._vw-topbtn.on ._vw-led', 'background:radial-gradient(circle at 40% 35%,#ffffff 0%,#bcd9ff 35%,#5b9bff 100%);box-shadow:0 0 0 3px rgba(127,180,255,.25),0 0 10px 2px rgba(127,180,255,.9)'),
    r(D(6), 'display:flex!important;align-items:center!important;gap:8px!important;padding-top:8px!important'),
    r(D(6) + '::before', 'content:"Línur reiknings";font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin-right:auto'),
    r(D(6) + ' a', 'font-family:' + SANS + '!important;font-size:12px!important;font-weight:500!important;color:#b42318!important'),
    r('#_ctc-add-extra', imp(SILVER_BTN) + ';height:32px!important;border-radius:7px!important;font-family:' + SANS + '!important;font-size:12px!important;font-weight:600!important;padding:0 10px!important'),
    r(D(7), 'padding-top:4px!important'),
    r(D(7) + ' > div', 'border:0!important;background:transparent!important'),
    r(D(8) + ' > div:not(:has(> #_ctc-sum-total))', 'border:0!important;background:transparent!important'),
    r(D(8) + ' > div > div', 'min-height:36px!important;padding:4px 10px!important;font-family:' + SANS + '!important;font-size:13px!important;color:#1f2530!important;border-top:1px solid rgba(20,24,34,.1)!important'),
    r(SEC + '._vw-bar', 'padding:8px 12px 14px!important;display:flex!important;gap:8px!important;flex-wrap:wrap!important;justify-content:flex-end!important;align-items:center!important'),
    r('#_vw-invinnsla', imp(METAL_BTN) + ';border-radius:9px!important;font-family:' + SANS + '!important;font-weight:600!important;flex:0 1 auto!important'),
    // ── taflan (7) í útliti C: hvítt spjald, málmhaus, feitt heiti + dauf undirlína, YFIRFERÐ sem dökk plata, reitir sem ljósir kassar ──
    r(D(7) + ' table', 'width:100%!important;border-collapse:separate!important;border-spacing:0!important;background:#fff!important;border-radius:8px!important;overflow:hidden!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)!important'),
    r(D(7) + ' table th', 'background:' + METAL + '!important;color:#eef1f4!important;font-family:' + MONO + '!important;font-size:10px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;padding:9px 5px!important;white-space:nowrap!important;text-align:left!important'),
    r(D(7) + ' table th:nth-child(n+4),' + D(7) + ' table th:nth-child(2)', 'text-align:right!important'),
    r(D(7) + ' table td', 'padding:6px 5px!important;border-bottom:1px solid #edf0f4!important;background:#fff!important;color:#1f2530!important;font-family:' + SANS + '!important;font-size:12.5px!important;vertical-align:middle!important'),
    r(D(7) + ' table td:first-child', 'font-weight:700!important;font-size:13px!important;white-space:normal!important'),
    r(D(7) + ' table td:first-child > div', 'font-weight:400!important;font-size:11px!important;color:#6b7483!important;white-space:normal!important'),
    r(D(7) + ' table td:nth-child(2),' + D(7) + ' table td:nth-child(n+4)', 'text-align:right!important;font-family:' + MONO + '!important;font-size:12px!important'),
    r(D(7) + ' table td:last-child', 'font-weight:700!important;white-space:nowrap!important'),
    r(D(7) + ' table td:nth-child(3) > span', imp(METAL_BTN) + ';display:inline-flex!important;align-items:center!important;height:22px!important;padding:0 8px!important;border-radius:3px!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;white-space:nowrap!important'),
    r(D(7) + ' table td input', imp(LINE) + ';border:0!important;height:30px!important;padding:0 6px!important;font-family:' + MONO + '!important;font-size:12px!important;text-align:center!important;color:#141822!important;width:56px!important;max-width:56px!important'),
    r(D(7) + ' table td input._ctc-line-disc', 'width:40px!important;max-width:40px!important'),
    r(D(7) + ' table td input + span', 'display:none!important'),
    // Línur reiknings-röðin (6): merki vinstra megin, Verðlisti sem tengill, takkinn silfur
    r(D(6) + '::before', 'content:"Línur reiknings";font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin-right:auto'),
    r(D(6), 'justify-content:flex-start!important'),
    // samtölur (8): Skýrslugerð/Akstur sem hvítar línur, Án vsk · Afsláttur · Vsk þétt mono, SAMTALS-bandið heldur málminum (402)
    r(D(8), 'display:flex!important;flex-direction:column!important;gap:4px!important'),
    r(D(8) + ' > div:not(:has(> #_ctc-sum-total))', 'min-height:32px!important;padding:2px 10px!important;border:0!important;font-family:' + SANS + '!important;font-size:12.5px!important;color:#1f2530!important;display:flex!important;align-items:center!important;gap:8px!important'),
    r(D(8) + ' > div:has(input)', imp(LINE) + ';min-height:36px!important;justify-content:space-between!important'),
    r(D(8) + ' > div:not(:has(input)):not(:has(> #_ctc-sum-total))', 'background:transparent!important;box-shadow:none!important;min-height:26px!important;justify-content:flex-end!important;font-family:' + MONO + '!important;font-size:12px!important;color:#525b6b!important'),
    r(D(8) + ' > div:not(:has(input)):not(:has(> #_ctc-sum-total)) > span:last-child', 'font-weight:700!important;color:#1f2530!important'),
    r(D(8) + ' input', imp(LINE) + ';border:0!important;height:30px!important;padding:0 6px!important;font-family:' + MONO + '!important;font-size:12.5px!important;text-align:center!important;color:#141822!important;width:64px!important;max-width:64px!important'),
    r(D(8) + ' > div:has(> #_ctc-sum-total)', 'margin-top:4px!important;border-radius:8px!important'),
    // Agnar 14:45 („mátt setja skýrslugerðina og akstur inn á hvíta svæðið"): raðirnar tvær sitja í framhaldi töflunnar, sama hvíta spjald;
    // Án vsk · Afsláttur · Vsk verða EIN mono-lína hægra megin undir, Samtals-bandið svo.
    r(D(7), 'padding-bottom:0!important'),
    r(D(7) + ' table', 'border-radius:8px 8px 0 0!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)!important'),
    r(D(7) + ' table', 'min-width:0!important;display:table!important'),   /* display:block kom úr annarri reglu: raðirnar (534 px) fylltu þá ekki töfluna (623 px) */   // 24.09 (Agnar: „taflan passar ekki innaní"): 129 setur min-width:740px inline — taflan var 740 px í 649 px hólfi og klipptist hægra megin (Samtals-dálkurinn hálfur); dálkarnir hér eru þéttir svo hún kemst fyrir
    r(D(7) + ' table tbody tr:last-child td', 'border-bottom:1px solid #edf0f4!important'),
    r(D(8), 'display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:0 14px!important;padding-top:0!important;align-items:center!important'),
    r(D(8) + ' > div:has(input):not(:has(> #_ctc-sum-total))', 'flex:1 1 100%!important;order:0;min-height:44px!important;margin:0!important;border-radius:0!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)!important;border-top:0!important;padding:4px 10px 4px 12px!important;font-weight:700!important;font-size:13px!important;background:#fff!important'),
    r(D(8) + ' > div:has(input):not(:has(> #_ctc-sum-total)):nth-of-type(2)', 'border-radius:0 0 8px 8px!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)!important'),
    r(D(8) + ' > div:has(input) > span:first-child', 'flex:1 1 auto!important'),
    r(D(8) + ' > div:not(:has(input)):not(:has(> #_ctc-sum-total))', 'flex:0 0 auto!important;order:2;min-height:30px!important;margin:6px 0 0!important;padding:0!important;gap:6px!important;font-size:12px!important'),
    r(D(8) + ' > div:not(:has(input)):not(:has(> #_ctc-sum-total)):nth-of-type(3)', 'margin-left:auto!important'),   // sama sérhæfni (:has(#id)) og línan á undan, annars tapar margin-left   // Án vsk: fyrsta samtölulínan ýtir hinum til hægri
    r(D(8) + ' > div:has(> #_ctc-sum-total)', 'flex:1 1 100%!important;order:3;margin-top:6px!important'),
    // Afsláttar-röðin (input + %) er samtölulína, ekki tafla — í sömu mono-línuna
    r(D(8) + ' > div:has(input):not(:has(> #_ctc-sum-total)):nth-of-type(n+3)', 'flex:0 0 auto!important;order:2;min-height:30px!important;margin:6px 0 0!important;padding:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;font-family:' + MONO + '!important;font-size:12px!important;font-weight:400!important;color:#525b6b!important;gap:6px!important'),
    r(D(8) + ' > div:has(input):nth-of-type(n+3) input', 'width:44px!important;max-width:44px!important;height:24px!important;padding:0 4px!important;font-size:11.5px!important'),
    // neðsta röðin: „Drög þar til heimsókn er kláruð." · Vista (málmur) · Klára (grænn, full breidd)
    r(SEC + '._vw-bar::before', 'content:"Drög þar til heimsókn er kláruð.";font-family:' + MONO + ';font-size:11.5px;color:#525b6b;margin-right:auto;align-self:center'),
    r('#_vw-invinnsla', 'height:36px!important;padding:0 14px!important;font-size:12.5px!important;flex:none!important;max-width:100%!important;white-space:nowrap!important'),
    r('#_vw-finish', 'flex:1 1 100%!important;height:44px!important;font-size:13.5px!important'),
    r('#_vw-finish', 'background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)!important;border:1px solid rgba(52,168,98,.55)!important;border-radius:10px!important;color:#fff!important;font-family:' + SANS + '!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45)!important;flex:1 1 auto!important')
  ].join('\n');
  var st = document.createElement('style'); st.id = 'samantekt-412'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function scope() {
    var h = document.documentElement;
    return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !(document.body && document.body.classList.contains('appmode'));
  }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }

  // Speglun: titill með ári og samtala í hausinn — hnútarnir eru okkar, endurgerðir þegar 129 teiknar hausinn upp á nýtt.
  function haus() {
    var sec = document.getElementById('_ctc-section'); if (!sec) return;
    var hd = sec.querySelector(':scope > div:nth-of-type(1)'); if (!hd) return;
    var ar = (txt(document.getElementById('_uv-strip')).match(/\b(20\d\d)\b/) || [])[1] || String(new Date().getFullYear());
    var t = hd.querySelector('.b412-titill');
    if (!t) { t = document.createElement('div'); t.className = 'b412-titill'; t.innerHTML = '<i aria-hidden="true"></i><span></span>'; hd.appendChild(t); }
    var ts = 'Skýrsla og reikningur ' + ar; var tsp = t.querySelector('span'); if (tsp && tsp.textContent !== ts) tsp.textContent = ts;
    var sum = document.getElementById('_ctc-sum-total');
    var tala = hd.querySelector('.b412-tala');
    if (!tala) { tala = document.createElement('div'); tala.className = 'b412-tala'; tala.innerHTML = '<span></span><small>kr með vsk</small>'; hd.appendChild(tala); }
    var v = sum ? txt(sum).replace(/\s*kr\.?$/i, '') : '—';
    var vs = tala.querySelector('span'); if (vs && vs.textContent !== v) vs.textContent = v;
  }
  var timer = null;
  function tick() { if (document.hidden || !scope()) return; try { haus(); } catch (e) { console.error('[412]', e); } }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }   // 24.09.2026: vaktin (252) skilar sér í rAF, FYRIR málun — setTimeout héðan lenti EFTIR málun og hrái ramminn sást sem hopp (mælt: 224-listinn 601 → 741 px, valstikan 205 → 154 px). Sama tif, engin millistaða.
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(function (ms) {
      if (document.hidden) return;
      for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('.b412-titill,.b412-tala')) continue; schedule(); return; }
    }).observe(main, { childList: true, subtree: true, characterData: true });
    tick();
  })();
  setInterval(function () { if (!document.hidden) tick(); }, 1500);
})();
