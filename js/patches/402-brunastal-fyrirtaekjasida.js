/* === 402 · Brunastál á fyrirtækjasíðunni (23.09.2026) ===
 *
 * Fyrirtækjasíðan (#company/<id>) í sömu þungu málmáferð og Afgreiðsla (389):
 * málmhausar með hnoðum, burstuð stálplata undir efninu, hvítar innfelldar
 * línur, silfur- og málmtakkar, Playfair-tölur. Hönnun samþykkt af Agnari
 * 23.09.2026 á Design-striga (útgáfa B + síða C).
 *
 * REGLAN: CSS EITT. Ekkert DOM er snert, engum takka bætt við eða fjarlægður,
 * engin hlustun á atburði — hver einasta tenging síðunnar (199, 224, 129, 286,
 * 359, 363, 367, 91, 370, 113, 296, 311, 265, 111, 00-legacy) stendur eins.
 * Aðeins útlitið breytist. Takkar sem eiga að hverfa í ⋯-valmynd koma síðar
 * sem sérstakur patch sem SMELLIR á upprunalegu hnappana, felur þá aldrei.
 *
 * Gildissvið: aðeins Brunastál (frosið þema), aðeins fyrirtækjaspjaldið
 * (#companies-main:has(.co-banner)), aðeins tölvuútlit — sími og app-hamur
 * (338/356) eru ósnert.
 *
 * Hvað er stílað (allt afkomendur #companies-main):
 *   .co-banner                → málmhaus fyrirtækisins (223 átti bláa hallann)
 *   ._samskipti-card (286)    → skel + málmhaus (._skx-head) + stálplata
 *   .ut-list (224)            → skel, .ut-bulk = málmhaus, raðir hvítar á plötu
 *   #_ctc-notes / #_ctc-section (129, inline-stílar → !important hér)
 *   ._dyg-section.sk-card (199) → málmhaus .sk-h, ársbönd, þjónustuspjöld með
 *                                málmhaus (.sk-svc-hd), skjalalínur hvítar
 *   ._afsl-box (113/296/307)  → skel + málmhaus
 *   .info-grid, ._co-mail-box → hvít spjöld í sömu skel
 *
 * Sérhæfni: html[attr]:not(...) body:not(.appmode) #companies-main:has(.co-banner)
 * slær 199/224/223/129 út án !important nema þar sem 129 setur inline-stíl.
 */
(function () {
  if (window.__bfs402) return;
  window.__bfs402 = true;
  if (document.getElementById('bfs-402')) return;

  var S = 'html[data-thm-preset="brunastal"]:not([data-viewmode="mobile"]) body:not(.appmode) #companies-main:has(.co-banner) ';
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var TABLE_HEAD = 'linear-gradient(180deg,#2b2f37,#15171c)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var PLATE = '#e2e6ec';
  var PLATE_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var INNER_PLATE = '#eef1f6';
  var INNER_IMG = 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var BSTAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  var GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  var RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';

  var SHELL = 'background:#fff;border:1px solid #000;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3)';
  var HEAD = 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)';
  var RIVETS_BEFORE = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);left:7px;top:50%;margin-top:-3px;pointer-events:none';
  var RIVETS_AFTER = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);right:7px;top:50%;margin-top:-3px;pointer-events:none';
  var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  var SILVER_BTN = 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);text-shadow:none';
  var METAL_BTN_CSS = 'background:' + METAL_BTN + ';border:1px solid #000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)';
  var GREEN_BTN = 'background:' + SAEKJA + ';border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55)';
  var RED_BTN = 'background:' + BSTAL + ';border:1px solid rgba(190,32,28,.55);color:#fff;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);text-shadow:0 1px 1px rgba(0,0,0,.55)';
  var PLATE_CHIP = 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;text-shadow:none';
  var MERKI = 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250';

  function r(sel, css) { return sel.split(',').map(function (s) { return S + s.trim(); }).join(',') + '{' + css + '}'; }

  var css = [
    /* ── grunnur ── */
    r('.co-banner,._samskipti-card,.ut-list,._afsl-box,._dyg-section,._ufs-section,.info-grid .ic,._co-mail-box', 'font-family:' + SANS),

    /* ── fyrirtækjahausinn (223 átti bláa hallann; jafn-sérhæfð regla síðar í röð vinnur, þessi er sérhæfðari) ── */
    r('.co-banner', 'background:' + METAL + ';border:1px solid #000;border-radius:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);padding:18px 22px 16px'),
    r('.co-banner::before', 'content:"";position:absolute;left:8px;top:8px;right:auto;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)'),
    r('.co-banner::after', 'content:"";position:absolute;right:8px;top:8px;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none'),
    r('.co-banner-mono', 'width:56px;height:56px;border-radius:10px;background:' + BSTAL + ';border:1px solid rgba(190,32,28,.55);box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);font-family:' + DISPLAY + ';font-size:24px;font-weight:800;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
    r('.co-banner-name', 'font-family:' + DISPLAY + ';font-size:30px;font-weight:800;letter-spacing:-.01em;line-height:1.05;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r('.co-banner-kt', 'font-family:' + MONO + ';font-size:12.5px;color:#d5dbe6;margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap'),
    r('.co-banner-kt a', PLATE_CHIP + ';text-decoration:none;color:#11141c!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.12)!important;padding:0 8px!important;font-size:10.5px!important'),
    r('.co-banner-facts', 'font-family:' + SANS + ';font-size:12.5px;color:#d5dbe6;margin-top:8px'),
    r('.co-banner-facts a', 'color:#fff'),
    r('.co-banner-facts a[href*="tel"],.co-banner-facts span:nth-child(2)', 'font-family:' + MONO),
    r('.co-banner-skra', 'color:#aeb6c4;font-size:12px'),
    r('.co-banner-skyrsla', 'color:#d5dbe6'),
    r('.co-banner-skyrsla > span', PLATE_CHIP + ';color:#0b6b3a!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.12)!important'),
    r('.co-banner-badge', 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.12);color:#11141c;font-family:' + MONO + ';font-size:11px;font-weight:700;border-radius:3px;text-transform:uppercase;letter-spacing:.06em;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)'),
    r('.co-banner-note', 'background:#eef1f6!important;color:#141822!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:8px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font-family:' + SANS + '!important'),
    /* 363: upplýsingareitirnir inni í hausnum */
    r('.co-bupp ._bupp-lina', 'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)'),
    r('.co-bupp ._bupp-merki', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#aeb6c4'),
    r('.co-bupp .co-bupp-reitur', 'background:rgba(0,0,0,.35)!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:5px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.45)!important;font-family:' + SANS + '!important'),
    r('.co-bupp ._bupp-vixl', SILVER_BTN + ';border-radius:7px;font-size:12px;font-weight:600;padding:5px 10px;font-family:' + SANS),
    /* 367: loftmyndin */
    r('.co-mynd-flis', 'border:1px solid rgba(255,255,255,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.35)'),
    r('.co-mynd-hlekkir a,.co-mynd-upp', PLATE_CHIP + ';text-decoration:none'),

    /* ── skeljar ── */
    r('._samskipti-card,.ut-list,._afsl-box,._dyg-section.sk-card,._ufs-section.sk-card,._co-mail-box', SHELL + ';padding:0'),
    r('#_ctc-notes', SHELL.replace('border-radius:14px', 'border-radius:14px 14px 0 0') + '!important;border-bottom:0!important;background:' + PLATE + '!important;background-image:' + PLATE_IMG + '!important;margin:0!important;padding:14px 12px 10px!important;box-shadow:none!important'),
    r('#_ctc-section', SHELL.replace('border-radius:14px', 'border-radius:0 0 14px 14px') + '!important;border-top:1px dashed rgba(20,24,34,.24)!important;background:' + PLATE + '!important;background-image:' + PLATE_IMG + '!important;padding:12px 12px 16px!important'),
    r('.uttekt-col-r', 'filter:drop-shadow(0 30px 40px rgba(0,0,0,.28))'),

    /* ── málmhausar ── */
    r('.sk-h,._skx-head,._afsl-head,.ut-bulk,.ut-bulk.show', HEAD + ';padding:12px 20px;gap:10px;align-items:center;margin:0;border-radius:0'),
    r('.sk-h::before,._skx-head::before,._afsl-head::before,.ut-bulk::before', RIVETS_BEFORE),
    r('.sk-h::after,._skx-head::after,._afsl-head::after,.ut-bulk::after', RIVETS_AFTER),
    r('.sk-h h3,._skx-title,._afsl-title', 'font-family:' + MONO + ';font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r('._afsl-head > span:nth-child(2)', 'font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6'),
    r('._afsl-step', PLATE_CHIP),
    r('._afsl-arrow', 'color:#8e97a6'),

    /* ── stálplötur undir efni ── */
    r('._samskipti-card,._afsl-box,.ut-list,._dyg-section.sk-card,._ufs-section.sk-card', 'background:' + PLATE + ';background-image:' + PLATE_IMG),
    r('._samskipti-card > *:not(._skx-head)', 'margin-left:12px;margin-right:12px'),
    r('._samskipti-card > ._skx-tiles', 'margin-top:12px'),
    r('._samskipti-card > *:last-child', 'margin-bottom:14px'),

    /* ── hvítar línur og flísar ── */
    r('._skx-tile,._ssk-mail._skx-nyjast,._ssk-note,._skx-beidni,._ssk-mail._skx-rod,.info-grid .ic', LINE + ';border:0'),
    r('._skx-tile b', MERKI + ';font-size:10.5px;color:#525b6b;letter-spacing:.12em'),
    r('._skx-tile > span', 'font-family:' + SANS + ';font-size:15px;font-weight:600;color:#11141c'),
    r('._skx-tile > small', 'color:#5b6472'),
    r('._skx-lbl', MERKI),
    r('._skx-chip', PLATE_CHIP),
    r('._skx-meta', 'font-family:' + MONO + ';font-size:11.5px;color:#5b6472'),
    r('._skx-subj', 'font-weight:600;color:#11141c'),
    r('._ssk-note-head', 'font-weight:500;color:#1f2530'),
    r('._smx-strip', 'padding:8px 0 0'),
    r('.info-grid .ic-lbl', MERKI + ';font-size:10.5px;color:#525b6b;letter-spacing:.12em'),
    r('.info-grid .ic-val', 'font-size:14px;font-weight:600;color:#11141c'),

    /* ── takkar á hausum og plötum ── */
    r('._skx-btn,._smx-imp,._smx-mute,._ssk-toggle,._cmb-hist,.sk-mailpref', SILVER_BTN + ';border-radius:9px;font-family:' + SANS + ';font-size:13px;font-weight:600;padding:0 12px;height:36px;display:inline-flex;align-items:center;gap:6px'),
    r('._skx-svara', GREEN_BTN + ';border-radius:9px;font-weight:700'),
    r('.sk-add-btn', RED_BTN + ';border-radius:10px;font-family:' + SANS + ';font-size:13px;font-weight:700;padding:0 14px;height:36px'),

    /* ── tækjalistinn (224) ── */
    r('.uttekt-col-l > div:first-child span', 'font-family:' + DISPLAY + ';font-size:22px;font-weight:800;color:#11141c'),
    r('.ut-bulk', 'padding:10px 20px'),
    r('.ut-bulk-cnt', 'font-family:' + MONO + ';font-size:12px;font-weight:700;color:#fff'),
    r('.ut-selall,.ut-bulk-act,.ut-bulk-size,.ut-bulk-dateset,.ut-bulk-lastset,.ut-bulk-qr', SILVER_BTN + ';border-radius:7px;font-size:12px;font-weight:600;padding:0 10px;height:32px;display:inline-flex;align-items:center;font-family:' + SANS),
    r('.ut-bulk-del', SILVER_BTN + ';color:#b42318;border-radius:7px;font-size:12px;font-weight:600;padding:0 10px;height:32px;font-family:' + SANS),
    r('.ut-bulk-date,.ut-bulk-lastdate', 'background:#eef1f6!important;color:#141822!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:6px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font-family:' + MONO + '!important;font-size:12px!important;height:30px;padding:0 8px'),
    r('.ut-bulk-clear', 'color:#d5dbe6'),
    r('.ut-bulk ._pm_quick_inspect_month', 'background:#eef1f6!important;color:#141822!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:6px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font-family:' + MONO + '!important'),
    r('.ut-bulk ._pm_quick_inspect', METAL_BTN_CSS + '!important;border-radius:9px!important;font-weight:600!important;height:36px'),
    // Dálkahausinn „Frá síðustu skýrslur / Þessi skoðun" fylgdi föstum dálkabreiddum (190/252px) sem kremja
    // tækjaheitið í 2px þegar hægri dálkurinn (780px, 224) tekur sitt. Hér gefa dálkarnir eftir og hausinn fer,
    // svo heitið fái plássið (hönnun C, 23.09) — engin regla 224 er snert, aðeins yfirskrifuð.
    r('.ut-head', 'display:none'),
    r('.ut-main', 'min-width:140px'),
    r('.ut-t', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
    r('.ut-lastcol', 'width:auto;margin-right:8px'),
    r('.ut-far', 'width:auto;margin-left:6px'),
    r('.ut-grp-h', 'background:transparent;border-top:0;padding:8px 12px 6px 14px;font-family:' + SANS),
    r('.ut-grp-h::before', 'content:"";width:4px;height:20px;border-radius:2px;background:#8a93a3;flex:none;margin-right:2px'),
    r('.ut-grp-h:has(.ut-ico.duft)::before', 'background:#2563eb'),
    r('.ut-grp-h:has(.ut-ico.lettv)::before', 'background:#38bdf8'),
    r('.ut-grp-h:has(.ut-ico.co2)::before', 'background:#dc2626'),
    r('.ut-grp-h:has(.ut-ico.slanga)::before', 'background:#14b8a6'),
    r('.ut-grp-h .ut-ico', 'display:none'),
    r('.ut-grp-nm', 'font-size:13px;font-weight:600;color:#1f2530'),
    r('.ut-grp-cnt', 'font-family:' + MONO + ';font-size:11px;font-weight:700;color:#5b6472'),
    r('.ut-grp-body', 'padding:0 10px 8px;display:flex;flex-direction:column;gap:6px'),
    r('.ut-row', LINE + ';border-top:0;padding:6px 8px 6px 0;min-height:44px;overflow:hidden;gap:10px'),
    r('.ut-row::before', 'content:"";width:4px;align-self:stretch;flex:none;background:#8a93a3;border-radius:6px 0 0 6px;margin:-6px 6px -6px 0'),
    r('.ut-row:has(.ut-ico.duft)::before', 'background:#2563eb'),
    r('.ut-row:has(.ut-ico.lettv)::before', 'background:#38bdf8'),
    r('.ut-row:has(.ut-ico.co2)::before', 'background:#dc2626'),
    r('.ut-row:has(.ut-ico.slanga)::before', 'background:#14b8a6'),
    r('.ut-row .ut-ico', 'display:none'),
    r('.ut-row.sel', 'background:#fff8f7;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(201,42,42,.45),0 2px 4px rgba(10,14,22,.14)'),
    r('.ut-chk', 'width:18px;height:18px;border-radius:4px;accent-color:#0a4a26'),
    r('.ut-t', 'font-size:13px;font-weight:600;color:#11141c'),
    r('.ut-sub', 'font-family:' + MONO + ';font-size:11.5px;color:#5b6472'),
    r('.ut-last', 'height:22px;padding:0 7px;border-radius:5px;' + SILVER_BTN + ';font-family:' + SANS + ';font-size:11px;font-weight:600;color:#3a4250;display:inline-flex;align-items:center'),
    r('.ut-last.h', 'color:#845400'),
    r('.ut-last.old', 'color:#b42318'),
    r('.ut-last.none', 'background:transparent;border-style:dashed;color:#6b7483'),
    r('.ut-now', 'border-left:0;margin-left:8px;padding-left:0;width:auto;justify-content:flex-end'),
    r('.ut-check', 'width:32px;height:32px;border-radius:7px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';color:#3a4250;font-size:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
    r('.ut-check.on', 'background:linear-gradient(180deg,#1f9d57,#0a4a26);border-color:#0a4a26;color:#fff'),
    r('.ut-svcseg', 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);border-radius:7px;padding:0;gap:0;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);height:30px'),
    r('.ut-svc', 'font-size:12px;font-weight:600;color:#3a4250;padding:0 10px;border-radius:0;height:30px;font-family:' + SANS),
    r('.ut-svc + .ut-svc', 'border-left:1px solid rgba(20,24,34,.12)'),
    r('.ut-svc.on', 'background:' + METAL_BTN + '!important;color:#fff!important;border:0!important;border-left:1px solid #000!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);text-shadow:0 1px 1px rgba(0,0,0,.4);border-radius:0'),
    r('.ut-svc.on:first-child', 'border-left:0!important'),
    r('.ut-onytt,.ut-act', SILVER_BTN + ';border-radius:7px;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:13px'),
    r('.ut-onytt.on', 'color:#b42318;box-shadow:inset 0 0 0 1px rgba(201,42,42,.45)'),
    r('.ut-listlock', GREEN_BTN + ';border-radius:10px;font-family:' + SANS + ';font-size:14px;font-weight:700;margin:6px 10px 12px;width:calc(100% - 20px);padding:12px'),
    r('.ut-listlock.on', METAL_BTN_CSS + ';color:#7fe0a8'),

    /* ── skýrsluvinnan (129) ── */
    r('#_ctc-notes > div:first-child > div,#_ctc-notes > div:nth-of-type(2)', MERKI + '!important;font-size:10.5px!important;letter-spacing:.12em!important;color:#3a4250!important'),
    r('#_ctc-notes > div:nth-of-type(2) span', 'font-family:' + SANS + '!important;font-weight:400!important;letter-spacing:0!important;text-transform:none!important;color:#6b7483!important'),
    r('#_ctc-notes textarea,#_ctc-section input,#_ctc-section textarea', 'background:#eef1f6!important;color:#141822!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:8px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font-family:' + SANS + '!important'),
    r('#_va-opna', SILVER_BTN + ';border-radius:7px;font-size:12px;font-weight:600;height:32px;padding:0 10px;font-family:' + SANS),
    r('#_ctc-section > div:first-child', 'border:1px solid #000!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6)!important;border-radius:8px!important'),
    r('#_ctc-section > div:first-child > div:first-child', 'font-family:' + MONO + '!important;font-size:12px!important;letter-spacing:.2em!important;text-transform:uppercase'),
    r('#_ctc-section > div:first-child > div:last-child', 'font-family:' + MONO + '!important;font-size:11.5px!important;color:#d5dbe6!important;opacity:1!important'),
    r('#_ctc-section label > span,#_ctc-section label', 'font-family:' + SANS),
    r('#_ctc-section button', 'font-family:' + SANS),
    r('#_ctc-skyrsla', METAL_BTN_CSS + '!important;border-radius:9px!important;font-weight:600!important'),
    r('#_ctc-vista,#_ctc-endurreikna,#_ctc-add-extra', SILVER_BTN + '!important;border-radius:9px!important;font-weight:600!important'),
    r('#_ctc-section table', 'background:#fff;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);border-collapse:separate;border-spacing:0'),
    r('#_ctc-section table th', 'background:' + TABLE_HEAD + '!important;color:#eef1f4!important;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #000!important;height:34px'),
    r('#_ctc-section table td', 'border-bottom:1px solid #edf0f4;background:#fff;color:#1f2530'),
    r('#_ctc-section table td input', 'font-family:' + MONO + '!important;text-align:right'),
    r('#_ctc-section div:has(> #_ctc-sum-total)', 'background:' + METAL + '!important;color:#fff!important;border:1px solid #000!important;border-radius:8px!important;padding:10px 18px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important;margin-top:8px!important'),
    r('#_ctc-section div:has(> #_ctc-sum-total) > span:first-child', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d5dbe6'),
    r('#_ctc-sum-total', 'font-family:' + DISPLAY + '!important;font-size:28px!important;font-weight:800!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r('#_ctc-sum-subex,#_ctc-sum-vsk', 'font-family:' + MONO),
    r('#_vw-invinnsla', METAL_BTN_CSS + '!important;border-radius:9px!important;font-weight:600!important'),
    r('#_vw-finish', GREEN_BTN + '!important;border-radius:10px!important;font-weight:700!important'),

    /* ── Skjöl & viðhengi (199) ── */
    r('.sk-strip', 'border-top:0;padding:12px 12px 0'),
    r('.sk-strip-l', MERKI + ';min-width:0'),
    r('.sk-pill', PLATE_CHIP + ';height:26px;padding:0 10px;font-size:12px;letter-spacing:0;cursor:pointer'),
    r('.sk-pill::before', 'content:"";width:5px;height:5px;border-radius:50%;background:#8f98a8;display:inline-block'),
    r('.sk-pill.ok::before', 'background:#7fe0a8'),
    r('.sk-pill.gap::before', 'background:#ffe0a0'),
    r('.sk-pill.claude::before', 'background:#9fd0ff'),
    r('.sk-pill.now', 'background:' + GULL + ';border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.14)'),
    r('.sk-pill.now::before', 'background:#f7e6a8'),
    r('.sk-month-pill', PLATE_CHIP + ';height:26px;padding:0 10px;font-size:12px;letter-spacing:0;cursor:pointer'),
    r('.sk-samn-grid', 'padding:12px 12px 0;gap:10px'),
    r('.sk-samn-card', 'background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 12px 30px -16px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.9);padding:8px 12px'),
    r('.sk-samn-card > b', 'font-size:13px;font-weight:600;color:#1f2530'),
    r('.sk-samn-pill', PLATE_CHIP),
    r('.sk-samn-pill.vantar', 'color:#b42318'),
    r('.sk-samn-pill.vantar::before,.sk-svc-st::before', 'content:"";width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;margin-right:4px'),
    r('.sk-yrwrap', 'padding:10px 12px 14px'),
    r('.sk-yrblock', 'border-top:0;padding:6px 0 10px'),
    r('.sk-yr-label', 'display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;position:relative;background:' + METAL + ';border:1px solid #000;border-radius:6px;min-height:40px;padding:0 16px 0 20px;margin-bottom:10px;font-family:' + DISPLAY + ';font-size:18px;font-weight:800;letter-spacing:-.01em;color:#eef1f4!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6)'),
    r('.sk-yr-label::before', RIVETS_BEFORE),
    r('.sk-yr-label::after', RIVETS_AFTER),
    r('.sk-yr-label.sk-yr-ok', 'color:#7fe0a8!important'),
    r('.sk-yr-label.sk-yr-claude', 'color:#9fd0ff!important'),
    r('.sk-yr-label.sk-yr-gap', 'color:#ffe0a0!important'),
    r('.sk-yr-label.sk-yr-now', 'color:#f7e6a8!important'),
    r('.sk-svc-grid', 'gap:10px'),
    r('.sk-svc-card', 'padding:0;overflow:hidden;background:' + INNER_PLATE + ';background-image:' + INNER_IMG + ';border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);display:flex;flex-direction:column'),
    r('.sk-svc-card.sk-svc-empty', 'opacity:1;background:rgba(255,255,255,.35);border:1.5px dashed rgba(20,24,34,.24);box-shadow:inset 0 2px 5px rgba(0,0,0,.06)'),
    r('.sk-svc-hd', 'position:relative;background:' + METAL + ';color:#fff;min-height:46px;padding:5px 16px 5px 20px;margin:0;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-size:15px'),
    r('.sk-svc-hd::before', RIVETS_BEFORE),
    r('.sk-svc-hd::after', RIVETS_AFTER),
    r('.sk-svc-card.sk-svc-empty .sk-svc-hd', 'background:transparent;border-bottom:0;box-shadow:none;color:#525b6b'),
    r('.sk-svc-card.sk-svc-empty .sk-svc-hd::before,.sk-svc-card.sk-svc-empty .sk-svc-hd::after', 'display:none'),
    r('.sk-svc-card.sk-svc-empty .sk-svc-hd b', 'color:#525b6b;text-shadow:none'),
    r('.sk-svc-hd b', 'font-weight:600;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
    r('.sk-svc-st', 'background:transparent;border:0;padding:0;font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;display:inline-flex;align-items:center;margin-left:auto'),
    r('.sk-svc-st.ok', 'color:#7fe0a8'),
    r('.sk-svc-st.part', 'color:#ff9d95'),
    r('.sk-svc-st.prog', 'color:#9fd0ff'),
    r('.sk-svc-send', GREEN_BTN + ';border-radius:9px;height:34px;padding:0 12px;font-family:' + SANS + ';font-size:13px;font-weight:700;display:inline-flex;align-items:center;margin-left:8px'),
    r('.sk-svc-ws', METAL_BTN_CSS + ';border-radius:9px;height:34px;padding:0 12px;font-family:' + SANS + ';font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;margin-left:8px'),
    r('.sk-svc-card > .sk-svc-row', LINE + ';margin:6px 8px 0;padding:4px 8px;min-height:36px;flex-wrap:wrap'),
    r('.sk-svc-card > .sk-svc-row:last-child', 'margin-bottom:8px'),
    r('.sk-svc-card.sk-svc-empty > *', 'margin-left:12px;margin-right:12px'),
    r('.sk-dot', 'display:none'),
    // Merkið „skýrsla"/„reikningur" er SÍÐASTA barn línunnar í 199 — verður stöðuplata lengst til hægri.
    r('.sk-svc-tag', PLATE_CHIP + ';margin-left:auto;flex:none;color:#3a4250'),
    r('.sk-svc-tag.inv', 'color:#3a4250;background:' + SILVER),
    r('.sk-svc-body', 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;flex:1;min-width:0'),
    r('.sk-doc', 'font-family:' + SANS + ';font-size:12px;font-weight:600;padding:0 9px;height:26px;border-radius:6px;margin:0 4px 0 0;display:inline-flex;align-items:center'),
    r('.sk-doc.rep,.sk-doc.pd', SILVER_BTN + ';color:#1f2530'),
    r('.sk-doc.inv', SILVER_BTN + ';color:#1f2530;font-family:' + MONO + ';font-size:11.5px;font-weight:700'),
    r('.sk-doc.stolpi', 'height:18px;padding:0 6px;border-radius:5px;border:0;background:#eceff4;color:#1f2530;font-family:' + MONO + ';font-size:10.5px;font-weight:700'),
    r('.sk-doc.prog', 'background:transparent;border:0;color:#16306f;font-weight:600;padding:0;height:auto'),
    r('.sk-doc.prog::before', 'content:"";width:5px;height:5px;border-radius:50%;background:#4f74dc;display:inline-block'),
    r('.sk-doc.add', 'background:rgba(255,255,255,.35);border:1.5px dashed rgba(20,24,34,.24);color:#525b6b;box-shadow:inset 0 2px 5px rgba(0,0,0,.06);font-weight:600'),
    r('.sk-doc.add:hover', 'color:#b42318;border-color:rgba(201,42,42,.45)'),
    r('.sk-att-wrap', 'margin:0 4px 0 0'),
    r('.sk-att-x', 'height:26px;border:1px solid rgba(20,24,34,.14);border-left:0;background:' + SILVER + ';color:#5b6472;border-radius:0 6px 6px 0;padding:0 7px;display:inline-flex;align-items:center'),
    r('.sk-att-x:hover', 'color:#b42318'),
    r('.sk-dfc', 'width:18px;height:18px;border-radius:4px;border:1px solid rgba(20,24,34,.32);background:#fff;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff'),
    r('.sk-strip[style],._dyg-section > .sk-strip:not(:nth-of-type(1))', 'padding:0 12px 10px'),
    r('._dyg-section > .sk-strip .sk-strip-l', 'padding-top:2px'),

    /* ── pör-bandið (311) ── */
    r('._dpb-company', SHELL + ';background:' + PLATE + ';background-image:' + PLATE_IMG + ';margin:14px 0'),
    r('._dpb-company > div:first-child', HEAD + ';padding:12px 20px;font-family:' + MONO + ';font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r('._dpb-company > div:first-child::before', RIVETS_BEFORE),
    r('._dpb-company > div:first-child::after', RIVETS_AFTER),
    r('._dpb-company > div:first-child span', 'font-family:' + MONO + ';font-size:11.5px;letter-spacing:0;text-transform:none;color:#d5dbe6;margin-left:8px'),
    r('._dpb-company > div:nth-child(2)', 'padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px'),
    r('._dpb-company > div:nth-child(2) > div', LINE + ';padding:6px 10px;min-height:44px;display:flex;align-items:center;gap:8px;border:0'),
    r('._dpb-rep,._dpb-inv-doc,._dpb-inv', SILVER_BTN + ';border-radius:9px;height:34px;padding:0 12px;font-family:' + SANS + ';font-size:12.5px;font-weight:600;display:inline-flex;align-items:center'),
    r('._dpb-send', GREEN_BTN + ';border-radius:9px;height:34px;padding:0 12px;font-family:' + SANS + ';font-size:13px;font-weight:700;display:inline-flex;align-items:center'),

    /* ── afslættir (113/296/307) ── */
    r('._afsl-grid,._afsl-wide', 'padding:12px'),
    r('._afsl-grid > div,._cpr-section,._ahop-section,._cad-section', 'background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 12px 30px -16px rgba(0,0,0,.55)'),
    r('._afsl-grid > div > div,._afsl-wide > div', 'border:0!important;box-shadow:none!important'),
    r('._cpr-toggle', 'font-family:' + SANS + ';font-weight:600'),

    /* ── efsta röðin ── */
    r('._co-mail-box', 'background:' + PLATE + ';background-image:' + PLATE_IMG + ';padding:10px 12px'),
    r('._co-mail-box > div', LINE + ';padding:6px 10px;margin-bottom:6px'),
    r('.info-grid', 'gap:8px'),
    r('.info-grid .ic', 'padding:10px 12px')
  ].join('\n');

  var st = document.createElement('style');
  st.id = 'bfs-402';
  st.textContent = css;
  document.head.appendChild(st);

  // Þyngdirnar 700/800 sem hausarnir og tölurnar nota; appið sjálft hleður aðeins 400–600 (389 skýrir loðna letrið).
  if (!document.getElementById('_bfs-font')) {
    var l = document.createElement('link');
    l.id = '_bfs-font';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
    document.head.appendChild(l);
  }
})();
