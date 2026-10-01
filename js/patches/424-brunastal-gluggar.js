/* === BRUNASTÁL Í GLUGGUNUM FJÓRUM (424) — 30.09.2026 ==========================================
 *
 * Agnar 30.09 (docs/BEIDNIR.md B31 · B32 · B38 · B41): fjórir sprettigluggar stóðu utan þemans —
 *   B31  Vöruvalslistinn „Velja vöru / þjónustu" (117, #_vp-dialog): blár haus, ávalar pillur, „heiftarlega ljótur".
 *   B32  Verðtengingar-glugginn (410, #p410-gluggi): hvítur, bláir hausar — ekki í þema síðunnar.
 *   B38  Sótt-glugginn (121, #_pkc-dialog): grænn Tailwind-haus, gult Lokastillingar-box sem týndist neðst.
 *   B41  Fyrri viðskipti (253, #_sch-modal): pastellitir (dcfce7/fef3c7/ddd6fe …).
 *
 * Allir fjórir teikna með innlínustílum (style="…") — þess vegna er hér CSS EITT með !important undir
 * ídentum glugganna (#_vp-dialog, #_pkc-dialog, #_sch-modal). 410 á eigin <style>-blokk sem var lituð
 * beint í pappanum. Engir hlustarar snertir; ídenti og klasar sem aðrir pappar leita að (264 #_pkc-finalize,
 * 127 #_pkc-dialog, ._sch-*, ._vp-row …) standa óbreyttir.
 *
 * Sama Brunastál C og 402–405: METAL-haus með hnoðum, Playfair-titill, MONO-merki, SILVER-takkar 4 px,
 * plötur (INNER_PLATE), grænn = SAEKJA-dökkmálmsgrænn (Agnar B38: „færa græna litinn í dark metal grænan").
 * ============================================================================================ */
(function () {
  if (window.__bstal424) return;
  window.__bstal424 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var TABLE_HEAD = 'linear-gradient(180deg,#2b2f37,#15171c)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var PLATE_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var INNER_PLATE = '#eef1f6';
  var INNER_IMG = 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  var RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var TS = 'text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)';

  var SHELL = 'background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);font-family:' + SANS;
  var HEAD = 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);padding:12px 26px';
  var HEAD_GREEN = 'position:relative;background:' + SAEKJA + ';color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);padding:12px 26px';
  var RIVET_L = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);left:9px;top:50%;margin-top:-3px;pointer-events:none';
  var RIVET_R = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);right:9px;top:50%;margin-top:-3px;pointer-events:none';
  var TITLE = 'font-family:' + DISPLAY + ';font-weight:800;font-size:19px;letter-spacing:-.01em;color:#fff;' + TS;
  var SUB = 'font-family:' + MONO + ';font-size:11px;font-weight:500;letter-spacing:.04em;color:#d5dbe6;opacity:1;text-shadow:none';
  var MERKI = 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250';
  var PLATE_BG = 'background:' + INNER_PLATE + ';background-image:' + INNER_IMG;
  var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);border:0';
  var SILVER_BTN = 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);text-shadow:none;border-radius:4px;font-family:' + SANS + ';font-weight:600;cursor:pointer';
  var METAL_BTN_CSS = 'background:' + METAL_BTN + ';border:1px solid #000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);border-radius:4px;font-family:' + SANS + ';font-weight:600;cursor:pointer';
  var GREEN_BTN = 'background:' + SAEKJA + ';border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55);border-radius:4px;font-family:' + SANS + ';font-weight:700;cursor:pointer';
  var X_BTN = 'width:32px;height:32px;border-radius:4px;border:1px solid #000;background:' + METAL_BTN + ';color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:1';
  var INP = 'background:#eef1f6;color:#141822;border:1px solid rgba(20,24,34,.14);border-radius:4px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font-family:' + SANS;
  var CHIP = 'display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-shadow:none';
  var CHIP_GREEN = 'background:' + SAEKJA + ';border-color:rgba(52,168,98,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)';
  var CHIP_GOLD = 'background:' + GULL + ';border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)';
  var CHIP_DARK = 'background:' + METAL_BTN + ';border-color:#000;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)';
  var CHIP_RED = 'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);border-color:rgba(190,32,28,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)';

  function imp(css) { return css.split(';').map(function (d) { d = d.trim(); if (!d) return ''; return /!important$/.test(d) ? d : d + '!important'; }).filter(Boolean).join(';'); }
  var out = [];
  function r(sel, css) { out.push(sel + '{' + imp(css) + '}'); }
  function rs(sel, css) { out.push(sel + '{' + css + '}'); }   // án !important (gervi-stök o.þ.h.)

  /* ══════════════ B31 · Vöruvalslistinn (117) ══════════════ */
  var VP = 'html body #_vp-dialog';
  r(VP, 'background:rgba(8,10,14,.66)');
  r(VP + ' > div', SHELL + ';width:min(680px,calc(100vw - 24px))');
  r(VP + ' > div > div:first-child', HEAD);
  rs(VP + ' > div > div:first-child::before', RIVET_L); rs(VP + ' > div > div:first-child::after', RIVET_R);
  r(VP + ' > div > div:first-child > div:first-child > div:first-child', TITLE + ';gap:9px');
  r(VP + ' > div > div:first-child > div:first-child > div:last-child', SUB);
  r(VP + ' #_vp-x', X_BTN);
  // leitarbandið: stálplata, innfelldur reitur
  r(VP + ' > div > div:nth-child(2)', PLATE_BG + ';border-bottom:1px solid rgba(20,24,34,.12);padding:12px 16px 10px');
  r(VP + ' #_vp-search', INP + ';border-radius:6px;font-weight:600;font-size:15px;padding:11px 36px 11px 34px');
  r(VP + ' #_vp-search:focus', 'outline:2px solid rgba(20,24,34,.5);outline-offset:-1px;background:#fff');
  // flokkastikan (nýtt í 117): plötur í röð, smellur skrunar að flokknum
  r(VP + ' #_vp-cats', 'display:flex;flex-wrap:wrap;gap:4px;padding:8px 16px 6px;' + PLATE_BG + ';border-bottom:1px solid rgba(20,24,34,.12)');
  r(VP + ' #_vp-cats:empty', 'display:none');
  r(VP + ' ._vp-cat', CHIP + ';cursor:pointer;height:22px;padding:0 8px;letter-spacing:.04em');
  r(VP + ' ._vp-cat b', 'font-weight:500;color:#6b7483;margin-left:2px');
  r(VP + ' ._vp-cat:hover', 'background:#fff');
  r(VP + ' ._vp-cat.on', CHIP_DARK);
  // uppáhald + mest notað: plötur í stað pilla
  r(VP + ' #_vp-fav-wrap > div:first-child,' + VP + ' #_vp-recent-wrap > div:first-child', MERKI + ';margin-bottom:6px');
  r(VP + ' ._vp-fav-chip', CHIP + ';height:28px;text-transform:none;letter-spacing:0;font-family:' + SANS + ';font-size:12px;font-weight:600;padding:0 6px 0 10px;' + CHIP_GOLD);
  r(VP + ' ._vp-fav-chip b', 'font-family:' + MONO + ';font-weight:700');
  r(VP + ' ._vp-fav-x', 'opacity:.75;color:#fff');
  r(VP + ' #_vp-recent > div', CHIP + ';height:28px;text-transform:none;letter-spacing:0;font-family:' + SANS + ';font-size:12px;font-weight:600;padding:0 10px;cursor:pointer');
  r(VP + ' #_vp-recent > div b', 'font-family:' + MONO + ';font-weight:700');
  // listinn: flokkahausar = málmræma með MONO-heiti og talningarplötu; raðir hvítar, þéttar
  r(VP + ' #_vp-list', 'background:#f4f6f9;padding:0 0 10px');
  r(VP + ' ._vp-cat-header', 'background:' + TABLE_HEAD + ';color:#eef1f4;border-bottom:1px solid #000;border-top:1px solid rgba(255,255,255,.08);padding:0 14px;height:34px;gap:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)');
  r(VP + ' ._vp-cat-header > span:first-child', 'color:#aab1bb;font-size:10px');
  r(VP + ' ._vp-cat-header > span:nth-child(2)', 'color:#d5dbe6');
  r(VP + ' ._vp-cat-header > span:nth-child(3)', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#eef1f4');
  r(VP + ' ._vp-cat-header > span:last-child', CHIP + ';height:18px;padding:0 6px;font-size:10px');
  r(VP + ' ._vp-row', 'padding:6px 14px 6px 30px;border-bottom:1px solid rgba(20,24,34,.08);background:#fff;gap:10px;min-height:38px');
  r(VP + ' ._vp-row:hover', 'background:#eef1f6');
  r(VP + ' ._vp-row > div:first-child > div:first-child', 'font-size:13px;font-weight:600;color:#141822');
  r(VP + ' ._vp-row > div:first-child > div:last-child:not(:first-child)', 'font-size:11px;color:#6b7483');
  r(VP + ' ._vp-row > div:nth-child(2) > div:first-child', 'font-family:' + MONO + ';font-size:13px;font-weight:700;color:#141822');
  r(VP + ' ._vp-row > div:nth-child(2) > div:last-child', 'font-family:' + MONO + ';font-size:10.5px;color:#6b7483');
  r(VP + ' ._vp-row mark', 'background:rgba(211,171,78,.35);color:#141822;border-radius:2px');
  r(VP + ' ._vp-star', 'font-size:17px');
  // fótur
  r(VP + ' > div > div:last-child', PLATE_BG + ';border-top:1px solid rgba(20,24,34,.12);padding:10px 16px');
  r(VP + ' #_vp-count', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.06em;color:#3a4250');
  r(VP + ' #_vp-cancel', SILVER_BTN + ';height:34px;padding:0 14px;display:inline-flex;align-items:center;font-size:12.5px;color:#1f2530;border-radius:4px');

  /* ══════════════ B38 · Sótt-glugginn (121) ══════════════ */
  var PK = 'html body #_pkc-dialog';
  r(PK, 'background:rgba(8,10,14,.66)');
  r(PK + ' > div', SHELL);
  r(PK + ' > div > div:first-child', HEAD_GREEN);
  rs(PK + ' > div > div:first-child::before', RIVET_L); rs(PK + ' > div > div:first-child::after', RIVET_R);
  r(PK + ' > div > div:first-child h3', TITLE);
  r(PK + ' > div > div:first-child h3 + div', SUB + ';color:#c9f0d6');
  r(PK + ' #_pkc-x', X_BTN + ';width:36px;height:36px;font-size:17px');
  r(PK + ' #_pkc-body', 'background:#f4f6f9;padding:16px 22px');
  // kaflamerkin (UPPLÝSINGAR Á REIKNING · TÆKI FRÁ VIÐGERÐ …)
  r(PK + ' #_pkc-body div[style*="text-transform:uppercase"],' + PK + ' #_pkc-body label > span[style*="text-transform:uppercase"],' + PK + ' #_pkc-loka div[style*="text-transform:uppercase"]', MERKI);
  // kassarnir: upplýsingar á reikning = stálplata; listarnir = hvítar línur
  r(PK + ' #_pkc-body > div[style*="background:#f8fafc"]', PLATE_BG + ';border:1px solid rgba(20,24,34,.12);border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)');
  r(PK + ' #_pkc-body div[style*="border:1px solid #e2e8f0"]', LINE + ';overflow:hidden');
  r(PK + ' #_pkc-body div[style*="border:1px solid #e2e8f0"] > *', 'border-bottom:1px solid rgba(20,24,34,.08)');
  r(PK + ' #_pkc-body div[style*="border:1px solid #e2e8f0"] > *:last-child', 'border-bottom:0');
  r(PK + ' #_pkc-body div[style*="border:1px dashed"]', 'border:1px dashed rgba(20,24,34,.22);border-radius:6px;background:transparent;color:#6b7483');
  r(PK + ' #_pkc-body label[style*="#fef2f2"]', 'background:#fbeeee');
  r(PK + ' #_pkc-body input[type="text"],' + PK + ' #_pkc-body input[type="tel"],' + PK + ' #_pkc-body input[type="number"],' + PK + ' #_pkc-body textarea,' + PK + ' #_pkc-loka input,' + PK + ' #_pkc-loka textarea', INP);
  r(PK + ' #_pkc-body input[type="number"],' + PK + ' #_pkc-loka input[type="number"],' + PK + ' #_pkc-cust-kt', 'font-family:' + MONO + ';font-weight:700');
  r(PK + ' #_pkc-body input:focus,' + PK + ' #_pkc-body textarea:focus,' + PK + ' #_pkc-loka input:focus,' + PK + ' #_pkc-loka textarea:focus', 'outline:2px solid rgba(20,24,34,.5);outline-offset:-1px;background:#fff');
  r(PK + ' #_pkc-body label[style*="font-size:10px"]', MERKI + ';font-size:9.5px;letter-spacing:.1em;color:#6b7483');
  r(PK + ' #_pkc-body input[type="checkbox"]', 'accent-color:#0e5a2e');
  r(PK + ' #_pkc-body span[style*="background:#dc2626"]', 'background:linear-gradient(180deg,#c92a2a,#7a1111);border-radius:3px;font-family:' + MONO + ';letter-spacing:.06em');
  r(PK + ' #_pkc-body span[style*="background:#fee2e2"]', CHIP + ';height:18px;' + CHIP_RED + ';font-size:9.5px');
  r(PK + ' #_pkc-add-extra,' + PK + ' #_pkc-body button[id$="-ktlookup"],' + PK + ' #_pkc-body button.kt-lookup-btn,' + PK + ' #_pkc-body button[title*="Fletta"]', SILVER_BTN + ';height:30px;padding:0 12px;font-size:12px;color:#1f2530');
  r(PK + ' ._pkc-rm-extra', 'color:#8f98a8');
  r(PK + ' ._pkc-rm-extra:hover', 'color:#b42318');
  r(PK + ' ._pkc-line-tot,' + PK + ' #_pkc-body div[style*="min-width:80px"]', 'font-family:' + MONO);
  // FÓTURINN: Lokastilling (afsláttur + athugasemd) VINSTRA MEGIN, samtölurnar HÆGRA MEGIN — á sömu opnu, án gula litarins
  r(PK + ' #_pkc-foot', PLATE_BG + ';border-top:1px solid rgba(20,24,34,.16);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:0');
  r(PK + ' #_pkc-loka', 'padding:12px 18px 12px 22px;border-right:1px solid rgba(20,24,34,.12)');
  r(PK + ' #_pkc-loka-box', 'background:transparent;border:0;padding:0;margin:0;border-radius:0');
  r(PK + ' #_pkc-loka-box > div:first-child', MERKI + ';margin-bottom:8px');
  r(PK + ' #_pkc-loka-box label', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3a4250');
  r(PK + ' #_pkc-loka-box span', 'color:#3a4250;font-family:' + MONO + ';font-size:11px;font-style:normal');
  r(PK + ' #_pkc-disc,' + PK + ' #_pkc-disc-kr', 'text-align:right;height:28px;padding:0 6px;color:#b42318');
  r(PK + ' #_pkc-disc-hint', 'font-family:' + MONO + ';font-size:10.5px;color:#b42318;font-style:normal');
  r(PK + ' #_pkc-note', 'font-family:' + SANS + ';font-size:12.5px;border-radius:4px');
  r(PK + ' #_pkc-totals', 'padding:12px 22px 12px 18px;background:transparent;border:0');
  r(PK + ' #_pkc-totals > div', 'font-family:' + MONO + ';font-size:12px');
  r(PK + ' #_pkc-totals > div > div', 'color:#3a4250');
  r(PK + ' #_pkc-totals > div > div[style*="font-size:15px"]', 'font-family:' + DISPLAY + ';font-size:22px;font-weight:800;color:#141822;border-top:1px solid rgba(20,24,34,.2);padding-top:6px;margin-top:4px;letter-spacing:-.01em');
  r(PK + ' #_pkc-totals > div > div[style*="font-size:15px"]:first-of-type', 'font-family:' + MONO + ';font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;align-self:end;color:#3a4250');
  r(PK + ' #_pkc-totals > div > div[style*="color:#b45309"]', 'color:#b42318');
  r(PK + ' #_pkc-totals > div > div[style*="color:#16a34a"]', 'color:#0e5a2e');
  r(PK + ' #_pkc-totals > div > div[style*="color:#dc2626"]', 'color:#b42318');
  // takkaröðin neðst
  r(PK + ' > div > div:last-child:not(#_pkc-foot):not(#_pkc-body)', 'background:#fff;border-top:1px solid rgba(20,24,34,.16);padding:12px 22px');
  r(PK + ' #_pkc-cancel', SILVER_BTN + ';height:38px;padding:0 16px;font-size:13px;color:#1f2530');
  r(PK + ' #_pkc-pay', SILVER_BTN + ';height:38px;padding:0 12px;font-size:13px;color:#1f2530;appearance:auto');
  r(PK + ' #_pkc-finalize', GREEN_BTN + ';height:38px;padding:0 18px;font-size:13.5px');
  // sími (netvörður 30.09): fóturinn í eina dálkröð undir 700 px svo hann flæði ekki út fyrir 351 px glugga
  out.push('@media (max-width:700px){html body #_pkc-dialog #_pkc-foot{grid-template-columns:1fr!important}html body #_pkc-dialog #_pkc-loka{border-right:0!important;border-bottom:1px solid rgba(20,24,34,.12)!important}}');
  // fyrirframgreitt-borðinn (GREITT): dökkmálmsgrænn í stað #16a34a
  r(PK + ' > div > div[style*="background:#16a34a"]', 'background:' + SAEKJA + ';border-top:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)');
  r(PK + ' > div > div[style*="background:#16a34a"] > div:first-child > div:last-child > div:first-child', 'font-family:' + MONO + ';letter-spacing:.2em');
  r(PK + ' > div > div[style*="background:#16a34a"] #_pkc-finalize', 'background:' + SILVER + ';color:#0e5a2e;border:1px solid rgba(20,24,34,.14);text-shadow:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)');
  r(PK + ' > div > div[style*="background:#16a34a"] #_pkc-cancel', 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)');
  // aukavöru-glugginn og prent-spurningin úr sama pappa
  r('html body #_pkc-qty-dialog > div,html body #_pkc-print-prompt > div', SHELL);
  r('html body #_pkc-qty-dialog > div > div:first-child,html body #_pkc-print-prompt > div > div:first-child', HEAD);
  r('html body #_pkc-qty-dialog > div > div:first-child *,html body #_pkc-print-prompt > div > div:first-child *', 'color:#fff');

  /* ══════════════ B41 · Fyrri viðskipti (253) ══════════════ */
  var SC = 'html body #_sch-modal';
  r(SC, 'background:rgba(8,10,14,.66)');
  r(SC + ' > div', SHELL + ';width:min(860px,calc(100vw - 24px))');
  r(SC + ' > div > div:first-child', HEAD);
  rs(SC + ' > div > div:first-child::before', RIVET_L); rs(SC + ' > div > div:first-child::after', RIVET_R);
  r(SC + ' > div > div:first-child > div:first-child > div:first-child', TITLE);
  r(SC + ' > div > div:first-child > div:first-child > div:last-child', SUB);
  r(SC + ' #_sch-opentab,' + SC + ' #_sch-copy', METAL_BTN_CSS + ';height:30px;padding:0 10px;font-size:11.5px;display:inline-flex;align-items:center;gap:5px');
  r(SC + ' #_sch-x', X_BTN);
  r(SC + ' #_sch-body', 'background:#f4f6f9;padding:14px 18px 18px');
  r(SC + ' #_sch-body > div:first-child', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.06em;color:#3a4250;margin-bottom:8px');
  r(SC + ' #_sch-body > div:first-child span', 'color:#3a4250;font-weight:700');
  // tegundasían: samfelld silfurræma (sama og 418), virki liðurinn málmur
  r(SC + ' #_sch-teg', 'gap:0;display:inline-flex;border-radius:4px;overflow:hidden;border:1px solid rgba(20,24,34,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);margin-bottom:10px');
  r(SC + ' #_sch-teg button', 'border:0;border-radius:0;background:' + SILVER + ';color:#1f2530;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;height:30px;padding:0 12px');
  r(SC + ' #_sch-teg button + button', 'border-left:1px solid rgba(20,24,34,.12)');
  r(SC + ' #_sch-teg button[style*="#0f172a"]', 'background:' + METAL_BTN + ';color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)');
  // taflan
  r(SC + ' #_sch-body div[style*="border:1px solid #e2e8f0"],' + SC + ' #_sch-body div[style*="border:1px dashed #e2e8f0"]', LINE + ';overflow:hidden');
  r(SC + ' #_sch-body thead tr', 'background:' + TABLE_HEAD + ';border-bottom:1px solid #000');
  r(SC + ' #_sch-body th', 'font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#eef1f4;padding:8px 10px;text-shadow:0 1px 1px rgba(0,0,0,.5)');
  r(SC + ' #_sch-body td', 'color:#1f2530;border-bottom:1px solid rgba(20,24,34,.08)');
  r(SC + ' #_sch-body td[style*="monospace"]', 'font-family:' + MONO + ';color:#141822');
  r(SC + ' #_sch-body tr[style*="#fafbfc"] td', 'background:#f7f8fb');
  r(SC + ' #_sch-body tr[style*="#fdfcff"] td', 'background:#f6f5fb');
  // stöðupillur → plötur
  r(SC + ' #_sch-body span[style*="border-radius:99px"]', CHIP + ';height:20px;padding:0 7px;font-size:9.5px;color:#11141c');
  r(SC + ' #_sch-body span[style*="background:#dcfce7"]', CHIP_GREEN);
  r(SC + ' #_sch-body span[style*="background:#fef3c7"]', CHIP_RED);   // Agnar 30.09: Ógreitt í dökkrauðum málmi
  r(SC + ' #_sch-body span[style*="background:#e0e7ff"]', CHIP_DARK);
  // Agnar 30.09: Payday-platan (PD nnn / Payday) í dökkbláum málmi með hvítu letri
  r(SC + ' #_sch-body span[style*="background:#f5f3ff"]', 'background:linear-gradient(145deg,#02060f 0%,#0a1d45 20%,#16306f 43%,#2451a8 53%,#0d2350 74%,#02060f 100%);border-color:rgba(60,110,220,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)');
  r(SC + ' #_sch-body span[style*="background:#f1f5f9"]', 'color:#3a4250');
  r(SC + ' #_sch-body td span[style*="#6d28d9"]:not([style*="background:#f5f3ff"]),' + SC + ' #_sch-body td[style*="#6d28d9"]', 'color:#3a4250');   // PD-platan heldur ljósa letrinu
  r(SC + ' #_sch-body span[style*="color:#991b1b"]', 'color:#b42318;font-family:' + MONO + ';font-size:10.5px;font-weight:700');
  // takkar í töflunni og skjalalistanum
  r(SC + ' ._sch-send,' + SC + ' ._sch-view,' + SC + ' ._sch-mail,' + SC + ' ._sch-open,' + SC + ' ._sch-att,' + SC + ' ._sch-fill,' + SC + ' ._sch-fillmail,' + SC + ' ._scb-rep,' + SC + ' ._scb-inv,' + SC + ' ._scb-inv-doc', SILVER_BTN + ';height:28px;padding:0 9px;font-size:11px;color:#1f2530;display:inline-flex;align-items:center');
  r(SC + ' ._scb-send', GREEN_BTN + ';height:28px;padding:0 10px;font-size:11px;display:inline-flex;align-items:center');
  r(SC + ' #_sch-yrs', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#3a4250;text-decoration:none;border-bottom:1px solid rgba(20,24,34,.35)');
  r(SC + ' #_sch-docs > div[style*="font-weight:700"],' + SC + ' #_sch-docs div[style*="margin:16px 0 8px"] > div:first-child', MERKI + ';margin:16px 0 8px');
  r(SC + ' #_sch-docs div[style*="margin:16px 0 8px"] > div:first-child', 'margin:0');
  r(SC + ' #_sch-docs span[style*="font-weight:500;color:#94a3b8"]', 'font-family:' + MONO + ';text-transform:none;letter-spacing:0;color:#6b7483;font-size:10.5px');
  r(SC + ' #_sch-body div[style*="font-size:12.5px;font-weight:700;color:#0f172a"],' + SC + ' #_sch-body div[style*="font-size:12.5px;font-weight:600;color:#0f172a"]', 'color:#141822');
  r(SC + ' #_sch-body div[style*="font-size:10.5px;color:#94a3b8"]', 'font-family:' + MONO + ';color:#6b7483');
  // 01.10.2026 (Agnar: „laga græna takkann og setja hvítann texta"): „✓ Greitt"-flísin ber BÆÐI #dcfce7 og #166534
  // í inline-stílnum. Þessi regla kom á eftir CHIP_GREEN og málaði letrið dökkgrænt á græna málminn — ólæsilegt.
  r(SC + ' #_sch-body span[style*="color:#166534"]:not([style*="background:#dcfce7"])', 'color:#0e5a2e');
  r(SC + ' #_sch-body span[style*="color:#b91c1c"]', 'color:#b42318');
  r(SC + ' #_sch-body span[style*="color:#b45309"]', 'color:#8a6100');

  var st = document.createElement('style');
  st.id = 'bstal-424';
  st.textContent = out.join('\n');
  document.head.appendChild(st);
})();
/* === END 424 === */
