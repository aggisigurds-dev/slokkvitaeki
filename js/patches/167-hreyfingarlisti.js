/* === HREYFINGARLISTI v1 ===
 *
 * Tímaröð yfir allar hreyfingar í `solur`: sölur + kreditfærslur, með
 * mánaðar-nav, samantekt og CSV útflutningi. Útvíkkar Bókhalds yfirlit
 * með einföldu ledger-flæði — eitt línur per færsla, raðað eftir tíma.
 *
 * Sidebar entry "📜 Hreyfingarlisti" rétt fyrir neðan Bókhalds yfirlit.
 */
(() => {
  if (window.__hreyfingarlistiInstalled) return;
  window.__hreyfingarlistiInstalled = true;

  const VIEW_ID = 'view-hreyfingarlisti';
  const NAV_KEY = 'hreyfingarlisti';

  // ── App-wide view-mode (📱 Sími / ▦ Tafla / 🖥 Skjár) ──────────────────────
  // The toggle itself lives in the Brunastál banner (patch 166); here we only
  // READ the current mode off html[data-viewmode] and re-render our own layout.
  const VM_MODES = ['mobile', 'table', 'desktop'];
  function getViewMode() {
    const m = document.documentElement.dataset.viewmode;
    return VM_MODES.indexOf(m) >= 0 ? m : 'desktop';
  }

  // ── Brunastál C (05.10.2026) ──────────────────────────────────────────────────
  // Agnar: „gera hreyfingarlistann meira professional og stylish" → mockup samþykkt („mátt byggja") með
  // skilyrðinu „passaðu að allar tengingar séu tengdar og ekkert breytist nema útlitið". Málmhaus með hnoðum,
  // lykiltölur á stálplötu, silfurplötur með ljósi fyrir stöðu, ⋯-valmynd fyrir sjaldgæfari aðgerðir. Allir
  // krókar (_hr-*, data-id, data-k, data-s) og föllin á bak við þá eru þau sömu og áður. Nýtt klasaforskeyti
  // `hl2-` svo eldri reglur annarra pappa (313/315/337 á .page-title, .stat-card, .filter-chip, .hl-mcard,
  // .abtn5) snerti ekki nýja útlitið. Takkar/reitir bera falska id-keðju + !important gegn appham-uppblæstri
  // (261 / simi-compact: 50 px takkar, 52 px reitir).
  (function injectSkin() {
    if (document.getElementById('hl-brunastal-skin')) return;
    if (!document.getElementById('hl-fonts')) {
      const l = document.createElement('link');
      l.id = 'hl-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const s = document.createElement('style');
    s.id = 'hl-brunastal-skin';
    const V = '#view-hreyfingarlisti ';
    const K = ':not(#_h167a):not(#_h167b):not(#_h167c):not(#_h167d)';
    const SANS = '"IBM Plex Sans",system-ui,sans-serif';
    const MONO = '"JetBrains Mono",ui-monospace,monospace';
    const DISP = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const MALM = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const REIT = 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    const TAKKI = 'margin:0!important;min-height:0!important;min-width:0!important;box-sizing:border-box!important;cursor:pointer;';
    s.textContent = [
      '#view-hreyfingarlisti{padding:0!important;max-width:none!important;background:transparent!important}',
      // 2026-07-30 (Verkefnalisti 7e68b092): app.css `.main-panel{max-width:1200px}` þrengdi #hr-main — ID-sértæknin slær það.
      '#view-hreyfingarlisti #hr-main.main-panel{max-width:none!important;width:100%!important;padding:0!important;box-sizing:border-box}',
      V + '.hl2{display:flex;flex-direction:column;gap:16px;font-family:' + SANS + ';color:#141822;container-type:inline-size;container-name:hl2}',
      V + '.hl2 *{box-sizing:border-box}',
      V + '.hl2 svg{flex:none}',
      V + '.hl2 button:focus-visible,' + V + '.hl2 input:focus-visible,' + V + '.hl2 a:focus-visible{outline:2px solid #c92a2a!important;outline-offset:2px}',
      // málmhausinn
      V + '.hl2-haus{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;padding:18px 24px 18px 30px;border-radius:14px;border:1px solid #000;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 18px 40px -16px rgba(0,0,0,.6)}',
      V + '.hl2-hnod{position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      V + '.hl2-hnod.a{top:9px;left:9px}' + V + '.hl2-hnod.b{top:9px;right:9px}' + V + '.hl2-hnod.c{bottom:9px;left:9px}' + V + '.hl2-hnod.d{bottom:9px;right:9px}',
      V + '.hl2-hnod.v{top:50%;left:9px;margin-top:-3.5px}' + V + '.hl2-hnod.h{top:50%;right:7px;margin-top:-3.5px}',
      V + '.hl2-titill{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:6px}',
      V + '.hl2-titill h1' + K + '{margin:0!important;font:800 30px/1.1 ' + DISP + '!important;letter-spacing:-.01em!important;color:#f4f6f8!important;text-shadow:none!important}',
      V + '.hl2-undir{font:700 11px/1.35 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#aab1bb}',
      V + '.hl2-undir.kt{font:500 13px/1.4 ' + SANS + ';letter-spacing:0;text-transform:none;color:#d5dbe6}',
      V + '.hl2-undir.kt b{font-weight:700;color:#fff}',
      V + '.hl2-tol{display:flex;flex-wrap:wrap;align-items:center;gap:10px}',
      V + '.hl2-seg{display:inline-flex;gap:2px;padding:3px;border-radius:11px;background:#0b0c0f;box-shadow:inset 0 2px 5px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.08)}',
      V + '.hl2-seg button' + K + '{' + TAKKI + 'height:36px!important;width:auto!important;padding:0 15px!important;border-radius:8px!important;border:1px solid transparent!important;background:transparent!important;color:#d5dbe6!important;font:600 13px/1 ' + SANS + '!important;box-shadow:none!important}',
      V + '.hl2-seg button.is-active' + K + '{background:' + SILVER + '!important;color:#11141c!important;border-color:rgba(20,24,34,.25)!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.4)!important}',
      V + '.hl2-skref' + K + '{' + TAKKI + 'width:38px!important;height:38px!important;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center;border-radius:9px!important;border:1px solid rgba(255,255,255,.14)!important;background:transparent!important;color:#d5dbe6!important;box-shadow:none!important}',
      V + '.hl2-man{min-width:118px;text-align:center;font:700 13px ' + MONO + ';color:#eef1f4;white-space:nowrap}',
      V + '.hl2-malm' + K + ',' + V + '.hl2-silfur' + K + '{' + TAKKI + 'height:40px!important;width:auto!important;display:inline-flex!important;align-items:center;gap:8px;padding:0 14px!important;border-radius:9px!important;font:600 13px/1 ' + SANS + '!important;white-space:nowrap;text-decoration:none}',
      V + '.hl2-malm' + K + '{border:1px solid #000!important;background:' + MALM + '!important;color:#eef1f4!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)!important}',
      V + '.hl2-silfur' + K + '{border:1px solid rgba(20,24,34,.18)!important;background:' + SILVER + '!important;color:#1f2530!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14)!important}',
      V + '.hl2-malm:hover,' + V + '.hl2-silfur:hover,' + V + '.hl2-ib:hover,' + V + '.hl2-ab:hover{filter:brightness(1.06)}',
      // reitir (innfelldir)
      V + '.hl2-reitur{display:flex;align-items:center;gap:8px;height:40px;margin:0;padding:0 12px;border-radius:9px;border:1px solid #000;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);color:#5b6472;min-width:0;cursor:text}',
      V + '.hl2-reitur input' + K + '{flex:1 1 auto!important;min-width:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;outline:none!important;font:13.5px/1.2 ' + SANS + '!important;color:#141822!important}',
      V + '.hl2-reitur input::placeholder{color:#6b7483!important;opacity:1}',
      V + '.hl2-haus .hl2-reitur{width:250px;max-width:100%}',
      // stálplatan + lykiltölur
      V + '.hl2-plata{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:14px;border:1px solid rgba(0,0,0,.55);background-color:#e2e6ec;background-image:' + STAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 18px 40px -18px rgba(0,0,0,.6)}',
      V + '.hl2-kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}',
      V + '.hl2-k{display:flex;flex-direction:column;gap:7px;min-width:0;padding:12px 14px 11px;border-radius:10px;background:#fff;box-shadow:' + REIT + '}',
      V + '.hl2-k.malm{border:1px solid #000;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 6px rgba(0,0,0,.35)}',
      V + '.hl2-merki{display:flex;align-items:center;gap:7px;font:700 10.5px/1.2 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250;white-space:nowrap}',
      V + '.hl2-k.malm .hl2-merki{color:#d5dbe6}',
      V + '.hl2-tala{display:block;font:700 22px/1.15 ' + MONO + ';letter-spacing:-.02em;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}',
      V + '.hl2-tala small{margin-left:5px;font-size:13px;font-weight:500;color:#5b6472}',
      V + '.hl2-tala.rautt{color:#b42318}',
      V + '.hl2-k.malm .hl2-tala{color:#f4f6f8}' + V + '.hl2-k.malm .hl2-tala small' + K + ',' + V + '.hl2-k.malm .hl2-skyr' + K + '{color:#aab1bb!important}',
      V + '.hl2-skyr{display:block;font-size:12px;line-height:1.3;color:#5b6472;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.hl2-led,.hl2-pop .hl2-led{display:inline-block;flex:none;width:7px;height:7px;border-radius:50%;background:#8a929e;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      V + '.hl2-led.graent{background:#2fbf6b;box-shadow:0 0 6px rgba(47,191,107,.85),0 0 0 1px rgba(0,0,0,.3)}',
      V + '.hl2-led.gull{background:#d9b762;box-shadow:0 0 6px rgba(217,183,98,.85),0 0 0 1px rgba(0,0,0,.3)}',
      V + '.hl2-led.rautt{background:#e0453c;box-shadow:0 0 6px rgba(224,69,60,.85),0 0 0 1px rgba(0,0,0,.3)}',
      V + '.hl2-innh{display:flex;flex-direction:column;gap:8px;padding:11px 14px 13px;border-radius:10px;background:#fff;box-shadow:' + REIT + '}',
      V + '.hl2-innh-l{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 14px;font-size:12.5px;color:#3a4250}',
      V + '.hl2-innh-l b{font:700 12.5px ' + MONO + '}' + V + '.hl2-innh-l b.g{color:#0b6b3a}' + V + '.hl2-innh-l b.o{color:#845400}',
      V + '.hl2-strik{display:flex;height:10px;border-radius:5px;overflow:hidden;background:#eceff4;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}',
      V + '.hl2-strik .g{background:linear-gradient(180deg,#8ee8b4 0%,#2fbf6b 40%,#16783f 62%,#1f8f4f 100%)}',
      V + '.hl2-strik .o{border-left:1px solid rgba(0,0,0,.35);background:linear-gradient(180deg,#f3df9f 0%,#d9b762 40%,#93700f 62%,#b08a2e 100%)}',
      // uppruni
      V + '.hl2-kafli{display:flex;align-items:center;gap:10px;min-height:30px;margin:2px 2px -2px;font:700 10.5px/1.2 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      V + '.hl2-kafli span{letter-spacing:0;text-transform:none;font-weight:500;color:#5b6472}',
      V + '.hl2-kafli i{flex:1;height:1px;background:rgba(20,24,34,.16)}',
      V + '.hl2-kafli .hl2-silfur' + K + '{height:30px!important;padding:0 10px!important;font-size:12px!important}',
      V + '.hl2-uppr{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}',
      V + '.hl2-up' + K + '{' + TAKKI + 'height:auto!important;width:100%!important;display:flex!important;flex-direction:column;align-items:stretch;gap:6px;padding:11px 13px 10px!important;border-radius:10px!important;border:0!important;background:#fff!important;box-shadow:' + REIT + '!important;text-align:left;font:inherit!important;color:inherit!important}',
      V + '.hl2-up:hover' + K + '{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.3),0 3px 8px rgba(10,14,22,.18)!important}',
      V + '.hl2-up.is-on' + K + '{box-shadow:inset 0 0 0 2px #11141c,0 3px 8px rgba(10,14,22,.2)!important}',
      V + '.hl2-up .hl2-tala{font-size:17px}',
      V + '.hl2-up.tomt .hl2-tala{color:#a1a9b6}',
      // listinn
      V + '.hl2-skel{border-radius:14px;border:1px solid rgba(0,0,0,.55);background:#fff;overflow:hidden;box-shadow:0 18px 40px -16px rgba(0,0,0,.6)}',
      V + '.hl2-skel-haus{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 16px 10px 24px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      V + '.hl2-skel-haus .hl2-reitur{margin-left:auto;flex:0 1 340px;min-width:200px}',
      V + '.hl2-sia{display:flex;flex-wrap:wrap;gap:6px}',
      V + '.hl2-sia button' + K + '{' + TAKKI + 'height:38px!important;width:auto!important;display:inline-flex!important;align-items:center;gap:8px;padding:0 11px 0 13px!important;border-radius:9px!important;border:1px solid rgba(255,255,255,.1)!important;background:transparent!important;color:#d5dbe6!important;font:600 13px/1 ' + SANS + '!important;box-shadow:none!important;white-space:nowrap}',
      // span-litirnir festir (K + !important): almenn regla um `.is-active span` sneri þeim við (hvítt á silfri).
      V + '.hl2-sia button span' + K + '{padding:2px 7px!important;border-radius:99px!important;background:rgba(255,255,255,.12)!important;color:#eef1f4!important;font:700 11px/1.2 ' + MONO + '!important}',
      V + '.hl2-sia button.is-active' + K + '{background:' + SILVER + '!important;border-color:rgba(20,24,34,.25)!important;color:#11141c!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.3)!important}',
      V + '.hl2-sia button.is-active span' + K + '{background:rgba(20,24,34,.1)!important;color:#2b313c!important}',
      V + '.hl2-sia button:not(.is-active):hover' + K + '{background:rgba(255,255,255,.07)!important}',
      // síðasta afgreiðsla á söluborði
      V + '.hl2-sidasta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:10px 20px;background:#f4f6f9;border-bottom:1px solid #e3e7ee}',
      V + '.hl2-sid-nafn{min-width:0;max-width:340px;font-size:14px;font-weight:600;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.hl2-sidasta .hl2-adg{margin-left:auto}',
      V + '.hl2-sidasta .hl2-silfur' + K + '{height:36px!important;padding:0 12px!important}',
      // taflan
      V + '.hl2-skrun{overflow-x:auto;-webkit-overflow-scrolling:touch}',
      V + '.hl2-tafla{width:100%;min-width:1060px;border-collapse:separate;border-spacing:0}',
      V + '.hl2-tafla th{height:40px;padding:0 12px;text-align:left;vertical-align:middle;background:#f4f6f9;border-bottom:1px solid #e3e7ee;font:700 10.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250;white-space:nowrap;user-select:none}',
      V + '.hl2-tafla th._hr-sort{cursor:pointer}',
      V + '.hl2-tafla th._hr-sort:hover{background:#eceff4;color:#11141c}',
      V + '.hl2-tafla th.is-sorted{color:#11141c}',
      V + '.hl2-or{display:inline-flex;vertical-align:middle;margin-left:6px;color:#a1a9b6}',
      V + '.hl2-tafla th.is-sorted .hl2-or{color:#c92a2a}',
      V + '.hl2-tafla .r{text-align:right}',
      V + '.hl2-tafla .c-d{width:112px}' + V + '.hl2-tafla .c-n{width:118px}' + V + '.hl2-tafla .c-u{width:120px}' + V + '.hl2-tafla .c-g{width:120px}' + V + '.hl2-tafla .c-m{width:150px}' + V + '.hl2-tafla .c-s{width:176px}' + V + '.hl2-tafla .c-k{width:132px}' + V + '.hl2-tafla .c-a{width:104px}' + V + '.hl2-tafla.thett .c-a{width:196px}',
      V + '.hl2-tafla td{padding:10px 12px;border-top:1px solid #edf0f4;vertical-align:middle;font-size:13px;color:#1f2530;background:#fff}',
      V + '.hl2-tafla tbody tr:first-child td{border-top:0}',
      V + '.hl2-tafla tbody tr:hover td{background:#f6f8fb}',
      V + '.hl2-tafla tbody tr.is-open td{background:#f1f4f8}',
      V + '.hl2-tafla.thett th{height:34px;padding:0 10px}',
      V + '.hl2-tafla.thett td{padding:6px 10px;font-size:12px}',
      V + '.hl2-tomt{padding:44px 20px!important;text-align:center;color:#5b6472!important;font-size:13.5px}',
      // sellur
      V + '.hl2-num{font:700 13.5px/1.2 ' + MONO + ';letter-spacing:-.02em;color:#11141c;white-space:nowrap}',
      V + '.hl2-num i{font-style:normal;color:#a1a9b6}',
      V + '.hl2-tag{display:block;margin-top:4px;font:700 9.5px/1.2 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#5b6472}',
      V + '.hl2-tag.rautt{color:#b42318}',
      V + '.hl2-nafn{display:block;font-size:14px;font-weight:600;line-height:1.3;color:#11141c;overflow-wrap:anywhere}',
      V + 'a.hl2-co{color:#11141c!important;text-decoration:none!important;cursor:pointer}',
      V + 'a.hl2-co:hover{text-decoration:underline!important;text-decoration-color:#a1a9b6!important;text-underline-offset:3px}',
      V + '.hl2-kt{display:block;margin-top:3px;font:400 11.5px/1.2 ' + MONO + ';color:#5b6472}',
      V + '.hl2-stadgr{display:inline-flex;align-items:center;height:20px;margin-top:4px;padding:0 7px;border-radius:4px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';font:700 9.5px/1 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#3a4250}',
      V + '.hl2-d{display:block;font:500 12.5px/1.25 ' + MONO + ';color:#1f2530;white-space:nowrap}',
      V + '.hl2-d.grn{color:#0b6b3a;font-weight:700}',
      V + '.hl2-t{display:block;margin-top:3px;font:400 11.5px/1.2 ' + MONO + ';color:#6b7483;white-space:nowrap}',
      V + '.hl2-d.inl,' + V + '.hl2-t.inl{display:inline;margin:0}',
      V + '.hl2-dauft{font-size:12px;font-weight:600;color:#6b7483}',
      V + '.hl2-upp{font-size:12.5px;font-weight:500;color:#3a4250;white-space:nowrap}',
      V + '.hl2-gm{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1f2530;white-space:nowrap}',
      V + '.hl2-gm i{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';box-shadow:inset 0 1px 0 #fff;color:#3a4250;font-style:normal}',
      V + '.hl2-tafla.thett .hl2-gm i{width:24px;height:24px}',
      V + '.hl2-stada{display:inline-flex;flex-wrap:wrap;gap:5px}',
      V + '.hl2-st{display:inline-flex;align-items:center;gap:7px;height:24px;padding:0 9px;border-radius:5px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:700 10.5px/1 ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      V + '.hl2-st.rautt{color:#b42318;border-color:rgba(180,35,24,.3);background:linear-gradient(180deg,#fff7f6 0%,#f6e1de 100%)}',
      V + '.hl2-kr{font:700 14.5px/1.2 ' + MONO + ';letter-spacing:-.01em;color:#11141c;white-space:nowrap}',
      V + '.hl2-kr small{margin-left:4px;font-size:11.5px;font-weight:500;color:#5b6472}',
      V + '.hl2-kr.rautt{color:#b42318}',
      V + '.hl2-adg{display:inline-flex;gap:6px;justify-content:flex-end;align-items:center}',
      V + '.hl2-ib' + K + '{' + TAKKI + 'flex:none;width:40px!important;height:40px!important;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center;border-radius:9px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;color:#3a4250!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important}',
      V + '.hl2-ib.haetta' + K + '{color:#b42318!important}',
      V + '.hl2-ib[aria-expanded="true"]' + K + '{background:' + MALM + '!important;border-color:#000!important;color:#fff!important}',
      V + '.hl2-tafla.thett .hl2-ib' + K + '{width:32px!important;height:32px!important;border-radius:8px!important}',
      V + '.hl2-fot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;padding:11px 20px;background:#f4f6f9;border-top:1px solid #e3e7ee;font:500 11.5px/1.3 ' + MONO + ';color:#3a4250}',
      // 📱 Sími — spjöld á stálplötu
      V + '.hl2-mlist{display:flex;flex-direction:column;gap:10px;padding:12px;background-color:#e2e6ec;background-image:' + STAL + '}',
      V + '.hl2-mcard{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 1px rgba(10,14,22,.18),0 4px 10px rgba(10,14,22,.1)}',
      V + '.hl2-mtop{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;padding:12px 14px 4px}',
      V + '.hl2-mtop .hl2-kr{margin-left:auto;font-size:16px}',
      V + '.hl2-mnafn{padding:2px 14px 0;font-size:15px;font-weight:600;line-height:1.3;color:#11141c;overflow-wrap:anywhere}',
      V + '.hl2-mkt{padding:0 14px}',
      V + '.hl2-mtags{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:9px 14px 12px}',
      V + '.hl2-mtags .hl2-tag{display:inline;margin:0}',
      V + '.hl2-macts{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #edf0f4;overflow-x:auto;-webkit-overflow-scrolling:touch}',
      V + '.hl2-ab' + K + '{' + TAKKI + 'flex:0 0 auto;height:40px!important;width:auto!important;display:inline-flex!important;align-items:center;gap:7px;padding:0 12px!important;border-radius:9px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;color:#1f2530!important;font:600 12.5px/1 ' + SANS + '!important;white-space:nowrap}',
      V + '.hl2-ab.haetta' + K + '{color:#b42318!important}',
      // þröngt (S26 skjáborðshamur er ~980 px — því container queries, ekki @media)
      '@container hl2 (max-width:1100px){' + V + '.hl2-kpi{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}' + V + '.hl2-uppr{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}',
      '@container hl2 (max-width:640px){' + V + '.hl2-haus{padding:16px 16px 16px 20px}' + V + '.hl2-titill h1' + K + '{font-size:24px!important}' + V + '.hl2-haus .hl2-reitur{width:100%}' + V + '.hl2-skel-haus .hl2-reitur{flex:1 1 100%;margin-left:0}' + V + '.hl2-tala{font-size:19px}' + V + '.hl2-sidasta .hl2-adg{margin-left:0}}',
      // ⋯-valmyndin — í <body>, utan sýnarinnar
      '.hl2-pop{position:fixed;z-index:7900;width:264px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);font-family:' + SANS + ';color:#1f2530;text-align:left}',
      'body.appmode .hl2-pop,html[data-viewmode="mobile"] .hl2-pop{zoom:var(--app-krom-zoom,1)}',
      '.hl2-pop-h{display:flex;align-items:center;gap:8px;padding:6px 8px 8px;font:700 10.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      '.hl2-pop-h span{margin-left:auto;letter-spacing:0;text-transform:none;font-weight:500;color:#6b7483}',
      '.hl2-pop button.hl2-mi' + K + '{' + TAKKI + 'width:100%!important;height:40px!important;display:flex!important;align-items:center;gap:10px;padding:0 10px!important;border:0!important;border-radius:8px!important;background:transparent!important;box-shadow:none!important;color:#1f2530!important;font:500 13.5px/1 ' + SANS + '!important;text-align:left;white-space:nowrap}',
      '.hl2-pop button.hl2-mi:hover' + K + ',.hl2-pop button.hl2-mi:focus-visible' + K + '{background:#f1f4f8!important;outline:none}',
      '.hl2-pop .hl2-mi svg{color:#5b6472}',
      '.hl2-pop button.hl2-mi.haetta' + K + '{color:#b42318!important;font-weight:600!important}',
      '.hl2-pop .hl2-mi.haetta svg{color:#b42318}',
      '.hl2-pop-sk{height:1px;margin:4px 6px;background:#eceff3}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0;
    return (neg ? '−' : '') + Math.abs(v).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  // Grænn „✓ greitt <dags>" undirmerki þegar salan var GREIDD annan dag en hún
  // var skráð — t.d. tæki úr hleðslu sótt+greitt löngu eftir móttöku.
  function paidNote(s) {
    if (!s.paid_at) return '';
    if (fmtDate(s.paid_at) === fmtDate(s.created_at)) return '';
    return '<div class="hl-mono" style="font-size:10px;color:#16a34a;font-weight:700;margin-top:1px">✓ greitt ' + esc(fmtDate(s.paid_at)) + '</div>';
  }
  // „Síðasta hreyfing" = nýjasti tímastimpill sölunnar: greitt / breytt / skráð.
  // ISO-strengir raðast rétt í stafrófsröð svo hæsta gildið = nýjast.
  function lastAct(s) {
    return [s.paid_at, s.updated_at, s.created_at].filter(Boolean).map(String).sort().pop() || '';
  }
  // „Greitt · síðast" dálkurinn: greiðsludagur (grænn) eða síðasta hreyfing; bakfært/drög sem orð.
  // (Sýnir GREIÐSLU-/síðustu-hreyfingar-dag svo tæki sem er sótt+greitt löngu eftir móttöku sjáist á réttum degi.)
  function greittCell(s) {
    if (s.paid_at) return '<span class="hl2-d grn">' + esc(fmtDate(s.paid_at)) + '</span><span class="hl2-t">' + esc(fmtTime(s.paid_at)) + '</span>';
    // 4-þrepa staðan (2026-08-14): void/drog mega aldrei líta út sem ógreitt.
    if (String(s.status || '') === 'void') return '<span class="hl2-dauft">Bakfært</span>';
    if (String(s.status || '') === 'drog') return '<span class="hl2-dauft">Drög</span>';
    const la = lastAct(s);
    if (la && new Date(la) > new Date(s.created_at) && fmtDate(la) !== fmtDate(s.created_at)) {
      return '<span class="hl2-d">' + esc(fmtDate(la)) + '</span><span class="hl2-t">' + esc(fmtTime(la)) + '</span>';
    }
    return '<span class="hl2-dauft">—</span>';
  }
  // 2026-08-19 (Agnar): kreditfærður upprunareikningur (credit_of vísar á id hans) fær merki við stöðuna.
  // 05.10.2026: rauð „Kreditfært"-plata í stað snúna borðans; „dot"-gerðin fellur niður (platan segir það einu sinni).
  function kMark(s, inner, kind) {
    if (s.is_credit || kind !== 'ribbon' || !kreditfaerdur(s)) return inner;
    return '<span class="hl2-stada">' + inner + plata('Kreditfært', 'rautt', 'rautt') + '</span>';
  }
  function plata(txt, led, cls) {
    return '<span class="hl2-st' + (cls ? ' ' + cls : '') + '"><span class="hl2-led' + (led ? ' ' + led : '') + '" aria-hidden="true"></span>' + esc(txt) + '</span>';
  }
  // R-númer eins og í Miðakerfinu: „R-00" dauft, „1076" skýrt.
  function numHtml(num) {
    const m = String(num || '').match(/^(R-0*)(\d.*)$/);
    return '<span class="hl2-num">' + (m ? '<i>' + esc(m[1]) + '</i>' + esc(m[2]) : esc(num || '—')) + '</span>';
  }
  function fmtTala(n) { return esc(fmtKr(n).replace(/ kr$/, '')) + '<small>kr</small>'; }
  // Beyging eftir tölu: tala sem endar á 1 (en ekki 11) tekur eintölu — „41 krafa", „11 kröfur".
  function ft(n, et, ft2) { return n + ' ' + ((n % 10 === 1 && n % 100 !== 11) ? et : ft2); }

  // ── Ógreitt (05.10.2026) ─────────────────────────────────────────────────────
  // Agnar: „ætti að vera bara það sem er í Kröfuyfirlit ógreitt … og síðan það sem er eftir í afgreiðslu, ekki búið
  // að sækja". Áður taldist ÖLL ógreidd sala með greitt_med reikningur/greitt_sidar — mælt 05.10.2026 á Allt:
  // 6.955.840 kr, þar af 3.429.975 kr kreditfærðir reikningar, 810.755 kr bakfærðar sölur og 806.073 kr drög (aðeins
  // 91.267 kr þeirra í afgreiðslu). Rétt sama dag: 2.256.882 (41 krafa = Kröfu yfirlit) + 91.267 (8 drög) = 2.348.149.
  function kreditfaerdur(s) { return _hlKredAllt.has(String(s.id)) || _hlCreditedIds.has(s.id); }
  function erOgreitt(s) {
    if (!s || s.is_credit || s.paid_at) return false;
    const st = String(s.status || '');
    if (st === 'void' || kreditfaerdur(s)) return false;
    if (s.greitt_med === 'reikningur') return true;                          // Kröfu yfirlit · útistandandi (166)
    if (s.greitt_med === 'greitt_sidar' && st === 'final') return true;      // „Til að rukka": klárað, ekki greitt
    return st === 'drog' && !s.hidden && _hlAfgrNum.has(String(s.num || ''));  // bíður í afgreiðslu, ekki sótt (143)
  }
  function erIAfgreidslu(s) { return erOgreitt(s) && String(s.status || '') === 'drog' && s.greitt_med !== 'reikningur'; }

  // ── Uppruni (05.10.2026) ─────────────────────────────────────────────────────
  // Agnar: „sjá hversu mikið er selt úr búð / söluborði og hversu mikið er í úttektum, sent úr ársskoðun, brunakerfis
  // skoðun og slökkvikerfi skoðun". solur.source: pos = Sala/söluborð, sott = afgreiðsla við afhendingu, uttekt =
  // ársskoðun/úttektarskýrsla (165, 418), brunakerfi = 273/291. Slökkvikerfis skoðun skráir enn engar sölur með eigin
  // uppruna — flísin stendur á 0 þar til hún gerir það. Kreditnóta fær uppruna reikningsins sem hún bakfærir.
  const UPPRUNI = [
    { k: 'budh',  heiti: 'Búð / söluborð',       stutt: 'Söluborð',     src: ['pos', 'sott'] },
    { k: 'ars',   heiti: 'Ársskoðun',            stutt: 'Ársskoðun',    src: ['uttekt'] },
    { k: 'bk',    heiti: 'Brunakerfis skoðun',   stutt: 'Brunakerfi',   src: ['brunakerfi'] },
    { k: 'sk',    heiti: 'Slökkvikerfis skoðun', stutt: 'Slökkvikerfi', src: ['slokkvikerfi'] },
    { k: 'annad', heiti: 'Annað',                stutt: 'Annað',        src: null }
  ];
  function uppruni(s) {
    let src = s.source;
    if (s.is_credit) {
      const o = s.credit_of != null ? String(s.credit_of) : '';
      src = !o ? null : _hlKredUppr.has(o) ? _hlKredUppr.get(o) : ((_hlById.get(o) || {}).source || null);
    }
    src = String(src || '');
    return UPPRUNI.find(u => u.src && u.src.indexOf(src) >= 0) || UPPRUNI[UPPRUNI.length - 1];
  }

  // ── Tákn (inline stroke-SVG, engin emoji) ────────────────────────────────────
  function _ik(d, w, sw) {
    return '<svg width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  const IKON = {
    send: _ik('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    pdf: _ik('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>'),
    edit: _ik('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    kredit: _ik('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    nyjan: _ik('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
    meira: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
    leit: _ik('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    csv: _ik('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    vinstri: _ik('<path d="m15 6-6 6 6 6"/>', 18, 2.5),
    haegri: _ik('<path d="m9 6 6 6-6 6"/>', 18, 2.5),
    tilbaka: _ik('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>', 16, 2.5),
    kort: _ik('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6 15h4"/>', 15),
    reikn: _ik('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/>', 15),
    sidar: _ik('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 15),
    reidufe: _ik('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', 15),
    sigma: _ik('<path d="M18 5H7l6 7-6 7h11"/>', 14, 2.4)
  };
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function methodLabel(m) {
    if (m === 'kort') return '💳 Kort';
    if (m === 'pening' || m === 'reidufe' || m === 'peningar') return '💵 Reiðufé';
    if (m === 'reikningur') return '📋 Reikningur';
    if (m === 'greitt_sidar') return '⏳ Greitt síðar';
    return esc(m || '—');
  }

  // ── Greiðslumáti: tákn í silfurflís + orð (Brunastál C — engir bláir/litaðir takkar) ────────
  function methodBtn(m) {
    const t = m === 'kort' ? ['kort', 'Kort'] : m === 'reikningur' ? ['reikn', 'Reikningur'] : m === 'greitt_sidar' ? ['sidar', 'Greitt síðar']
      : (m === 'pening' || m === 'reidufe' || m === 'peningar') ? ['reidufe', 'Reiðufé'] : null;
    if (!t) return m ? '<span class="hl2-gm">' + esc(String(m)) + '</span>' : '<span class="hl2-dauft">—</span>';
    return '<span class="hl2-gm"><i>' + IKON[t[0]] + '</i>' + t[1] + '</span>';
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const byBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Bókhalds yfirlit|Bokhalds yfirlit/.test(b.textContent || ''));
    const tpl = byBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📜</span>Hreyfingarlisti';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (byBtn && byBtn.parentNode) byBtn.parentNode.insertBefore(btn, byBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="hr-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._hrSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._hrSwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  // scope sjálfgefið 'all' (Allt) — ósk Agnars 2026-08-19: opnast á ÖLLUM
  // færslum, ekki bara mánuðinum. Notandinn getur enn valið Mán/Ár í seg-rofa.
  // 2026-09-07 (ósk Agnars): sjálfgefið er raðað eftir SÍÐUSTU hreyfingu
  // (lastAct = greitt/breytt/skráð, nýjast fyrst), ekki skráningardegi — salan sem
  // var greidd í morgun á að vera efst þótt hún hafi verið skráð í síðasta mánuði.
  // Röðunin er hvergi vistuð, svo án þessa þurfti að smella á dálkinn í hvert sinn.
  // 05.10.2026 (Agnar: „helst að sjá default alveg síðustu afgreiðslu frá söluborðinu, svo ég geti fundið strax ef þarf
  // að breyta afgreiðslunni"): sjálfgefið er nú SKRÁÐ, nýjast efst — greiðslur sem lesnar eru inn úr banka (paid_at
  // 00:00) ýttu áður nýjustu afgreiðslunni niður. Nýjasta afgreiðslan er líka fest efst (sidastaHtml). Smellur á
  // „Greitt · síðast" gefur gömlu röðina.
  let _state = { month: null, all: [], filter: 'all', search: '', sortKey: 'created_at', sortDir: 'desc', mode: 'month', ktInfo: null, scope: 'all', req: 0, uppr: null };
  let _hlCreditedIds = new Set();  // 2026-08-19: id upprunareikninga sem hafa verið kreditfærðir (fyllt í render())
  // 05.10.2026: samhengið sem „Ógreitt" og uppruni kreditnóta þurfa, sótt fyrir ALLT tímabilið svo Mán/Ár-sýnin fái
  // það líka (kreditnóta í október á reikning úr september). Aðeins lesið — engu skrifað.
  let _hlKredAllt = new Set();     // id upprunareikninga sem einhver kreditnóta vísar á
  let _hlKredUppr = new Map();     // id upprunareiknings → source hans (uppruni kreditnótunnar)
  let _hlAfgrNum = new Set();      // num draga sem bíða í afgreiðslu (verkbeiðni „ready", engin á verkstæði — 143)
  //   ALLAR verkbeiðnir, ekki bara „R-…-V1": sumar heita sama nafni og salan (R-001002) — 143 les þær líka.
  let _hlById = new Map();         // id → sala í gagnasafninu sem er teiknað
  async function saekjaOgreittSamhengi(SB) {
    try {
      const [kr, vb] = await Promise.all([
        DB.fetchAll((from, to) => SB.from('solur').select('id,credit_of').eq('is_credit', true).not('credit_of', 'is', null).order('id').range(from, to)),
        DB.fetchAll((from, to) => SB.from('verkbeidnir').select('id,num,status').in('status', ['received', 'inprogress', 'in_progress', 'ready']).order('id').range(from, to))
      ]);
      const upp = Array.from(new Set((kr || []).map(r => String(r.credit_of))));
      const uppr = new Map();
      for (let i = 0; i < upp.length; i += 200) {
        const r = await SB.from('solur').select('id,source').in('id', upp.slice(i, i + 200));
        (r.data || []).forEach(x => uppr.set(String(x.id), x.source || null));
      }
      const st = {};
      (vb || []).forEach(v => { const p = String(v.num || '').replace(/-V\d+$/, ''); if (p) (st[p] = st[p] || new Set()).add(v.status); });
      _hlKredAllt = new Set(upp);
      _hlKredUppr = uppr;
      _hlAfgrNum = new Set(Object.keys(st).filter(p => st[p].has('ready') && !st[p].has('received') && !st[p].has('inprogress') && !st[p].has('in_progress')));
    } catch (e) { console.warn('[167] ógreitt-samhengi:', e); }
  }
  let _leitTimer = 0;              // 23.09.2026: dregur saman teikningu meðan skrifað er í síureitinn

  // 2026-07-01: customer lookup by NAME or KENNITALA — pull a customer's WHOLE
  // sölu-/reikningasaga (all time, not month-bounded) so "sendu mér kvittun frá
  // í síðustu viku" is one search. Must accept the NAME too, not just kt: many
  // POS sales stored the name but lost the kt/customer_id (see Gjörvaverk), so a
  // kt-only lookup would miss exactly those receipts. kt is also stored
  // inconsistently (with/without dash), so match both forms.
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { return d && d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  // Kennitala cell: real kt → dashed mono; walk-in 999999-9999 → subtle badge;
  // empty (legacy, not yet backfilled) → dash.
  function ktCell(kt) {
    const d = ktDigits(kt);
    if (d === '9999999999') return '<span class="hl2-stadgr">Staðgr.</span>';
    if (d.length === 10) return '<span class="hl2-kt">' + esc(ktDashed(d)) + '</span>';
    return kt ? '<span class="hl2-kt">' + esc(kt) + '</span>' : '';
  }
  // Sanitise a value for embedding inside a PostgREST .or() list (commas /
  // parens / quotes are the delimiters there).
  function orSafe(s) { return String(s == null ? '' : s).replace(/["(),*]/g, ' ').trim(); }

  async function lookupCustomer(qRaw) {
    const main = document.getElementById('hr-main');
    if (!main) return;
    const q = String(qRaw == null ? '' : qRaw).trim();
    if (q.length < 2) { if (window.Toast && Toast.show) Toast.show('Sláðu inn nafn eða kennitölu'); return; }
    const SB = getSB();
    if (!SB) return;
    // 21.09.2026 (úttekt): ógilda load() sem er enn á leiðinni — annars gat
    // mánaðarlistinn málast yfir sögu kúnnans eftir að hún birtist.
    _state.req++;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Leita að sögu kúnna…</div>';
    const kt = ktDigits(q);
    const isKt = kt.length >= 7;                 // ≥7 digits → treat as kennitala
    const dashed = ktDashed(kt);

    // 1) Resolve the customer row(s) — by kt (exact, both forms) or by name (ilike).
    const custFilter = isKt
      ? 'kennitala.eq.' + kt + (dashed !== kt ? ',kennitala.eq.' + dashed : '')
      : 'nafn.ilike.*' + orSafe(q) + '*';
    const [fR, vR] = await Promise.all([
      SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').is('deleted_at', null).or(custFilter),
      SB.from('vidskiptavinir').select('id,nafn,kennitala,heimilisfang').or(custFilter),
    ]);
    const custRows = [...(fR.data || []), ...(vR.data || [])];
    const ids = custRows.map(r => r.id).filter(x => x != null);
    const names = [...new Set(custRows.map(r => r.nafn).filter(Boolean))];
    const kts = [...new Set(custRows.map(r => ktDigits(r.kennitala)).filter(x => x && x.length === 10))];
    if (isKt && kt.length === 10 && !kts.includes(kt)) kts.push(kt);

    // 2) Match sales: by id-set OR exact/loose name OR a kt stamped in the note
    //    (name-only recovery). Include the typed name too, so a walk-in sale that
    //    was never linked to a customer row is still found.
    const parts = [];
    if (ids.length) parts.push('customer_id.in.(' + ids.join(',') + ')');
    const nameSet = [...new Set([...names, ...(isKt ? [] : [q])])].map(orSafe).filter(Boolean);
    if (nameSet.length) parts.push('customer_nafn.in.(' + nameSet.map(n => '"' + n + '"').join(',') + ')');
    if (!isKt) parts.push('customer_nafn.ilike.*' + orSafe(q) + '*');
    // The customer_kt column is now the reliable link (POS writes it + backfill).
    // Match it directly, plus the legacy kt-in-note fallback.
    kts.forEach(k => {
      const d = ktDashed(k);
      parts.push('customer_kt.eq.' + k); if (d !== k) parts.push('customer_kt.eq.' + d);
      parts.push('athugasemdir.ilike.*' + k + '*'); if (d !== k) parts.push('athugasemdir.ilike.*' + d + '*');
    });
    if (!parts.length) { main.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Enginn kúnni fannst fyrir „' + esc(q) + '".</div>'; return; }

    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,updated_at,paid_at,is_credit,credit_of,starfsmadur,status,hidden,source')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(1000);
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    const nafn = (custRows[0] && custRows[0].nafn) || (r.data && r.data[0] && r.data[0].customer_nafn) || q;
    _state.mode = 'kt';
    _state.ktInfo = { query: q, nafn, ktFmt: kts[0] ? ktDashed(kts[0]) : (isKt ? dashed : ''), locs: custRows.length };
    _state.filter = 'all';
    _state.search = '';
    await saekjaOgreittSamhengi(SB);
    _state.all = r.data || [];
    render();
  }

  function exitKt() {
    _state.mode = 'month';
    _state.ktInfo = null;
    load(_state.month || new Date());
  }

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth, retry) {
    const main = document.getElementById('hr-main');
    if (!main) return;
    // 21.09.2026 (úttekt): „síðasta beiðni vinnur" — áður gat hægara eldra svar
    // (annar mánuður/umfang) yfirskrifað nýrri lista. Hver keyrsla fær númer og
    // svar sem er ekki lengur það nýjasta er hent.
    const rid = ++_state.req;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður hreyfingum…</div>';
    const SB = getSB();
    if (!SB) {
      // 21.09.2026 (úttekt): DB.sb er oft ekki tilbúinn við kalt start — áður birtist
      // „Engin gagnabankatenging" strax og sat þar. Sama mynstur og 166: reyna aftur
      // á 500 ms fresti, allt að 20×, og halda „Hleður…" á meðan.
      if ((retry || 0) < 20) { setTimeout(() => { if (rid === _state.req) load(filterMonth, (retry || 0) + 1); }, 500); return; }
      main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return;
    }

    const m = filterMonth || _state.month || new Date();
    _state.month = m;

    // 2026-07-01: scope — Mánuður · Ár (whole year) · Allt (all time, default).
    // 14.09.2026: .limit(5000) hnekkti ekki 1000-raða þaki PostgREST — allir hamir
    // blaðsíðufletta nú; `id` raðar sölum sem deila created_at.
    const scope = _state.scope;
    const samhengi = saekjaOgreittSamhengi(SB);   // 05.10.2026: Ógreitt + uppruni kreditnóta, samhliða aðalsókninni
    let rows;
    try {
      rows = await DB.fetchAll((from, to) => {
        let q = SB.from('solur')
          .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,updated_at,paid_at,is_credit,credit_of,starfsmadur,status,hidden,source')
          .order('created_at', { ascending: false }).order('id');
        if (scope === 'year') {
          const ys = new Date(m.getFullYear(), 0, 1), ye = new Date(m.getFullYear() + 1, 0, 1);
          q = q.gte('created_at', ys.toISOString()).lt('created_at', ye.toISOString());
        } else if (scope !== 'all') {
          const { start, end } = monthBounds(m);
          q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
        }
        return q.range(from, to);
      });
    } catch (e) { if (rid !== _state.req) return; main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc((e && e.message) || e) + '</div>'; return; }
    await samhengi;
    if (rid !== _state.req) return;
    _state.all = rows;

    render();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function applyFilter(rows) {
    // 05.10.2026: uppruna-flísarnar sía líka (smellur aftur = allt).
    if (_state.uppr) rows = rows.filter(r => uppruni(r).k === _state.uppr);
    if (_state.filter === 'paid')   return rows.filter(r => r.paid_at && !r.is_credit);
    if (_state.filter === 'unpaid') return rows.filter(erOgreitt);   // 05.10.2026: sama regla og talan (sjá erOgreitt)
    if (_state.filter === 'credit') return rows.filter(r => r.is_credit);
    return rows;
  }

  // 2026-06-23 (#4 smálagfæring): free-text search + clickable column sort.
  function searchMatch(s, q) {
    if (!q) return true;
    return [s.num, s.customer_nafn, s.greitt_med, s.starfsmadur, s.samtals]
      .map(x => String(x == null ? '' : x).toLowerCase()).join(' ').includes(q);
  }
  function sortRows(rows) {
    const k = _state.sortKey, dir = _state.sortDir === 'asc' ? 1 : -1;
    const val = s => {
      switch (k) {
        case 'num':            return String(s.num || '');
        case 'customer_nafn':  return String(s.customer_nafn || '').toLowerCase();
        case 'greitt_med':     return String(s.greitt_med || '');
        case 'tegund':         return s.is_credit ? 1 : 0;
        case 'stada':          return s.is_credit ? 2 : (s.paid_at ? 0 : 1);
        case 'samtals':        return s.is_credit ? -Math.abs(+s.samtals || 0) : (+s.samtals || 0);
        case 'greitt':         return lastAct(s);   // greitt/breytt/skráð — nýjast fyrst
        case 'uppruni':        return uppruni(s).heiti;
        default:               return String(s.created_at || '');
      }
    };
    return rows.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      // tiebreak: newest first (keeps "skjal most recent on top" intuitive)
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }
  function sortArrow(key) {
    const sv = d => '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    if (_state.sortKey !== key) return sv('<path d="m7 9 5-5 5 5"/><path d="m7 15 5 5 5-5"/>');
    return _state.sortDir === 'asc' ? sv('<path d="m6 15 6-6 6 6"/>') : sv('<path d="m6 9 6 6 6-6"/>');
  }
  function th(key, label, align) {
    return `<th class="_hr-sort" data-k="${key}" style="padding:12px 14px;text-align:${align || 'left'};font-size:10px;font-weight:700;color:#e8ecf4;text-transform:uppercase;letter-spacing:.11em;cursor:pointer;user-select:none;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.4)">${esc(label)} <span style="font-size:9px;font-weight:400;opacity:.75">${sortArrow(key)}</span></th>`;
  }
  function thPlain(label, align) {
    return `<th style="padding:12px 14px;text-align:${align || 'left'};font-size:10px;font-weight:700;color:#e8ecf4;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.4)">${esc(label)}</th>`;
  }

  function render() {
    const main = document.getElementById('hr-main');
    if (!main) return;
    lokaValmynd(false);   // ⋯-valmynd sem hangir á hnút sem er að hverfa

    const all = _state.all;
    // 2026-08-19 (Agnar): safn af id-um upprunareikninga sem einhver kreditnóta
    // vísar á (credit_of) → merkjum þá „kreditfært" í listanum.
    _hlCreditedIds = new Set(all.filter(r => r.is_credit && r.credit_of != null).map(r => r.credit_of));
    _hlById = new Map(all.map(r => [String(r.id), r]));
    const q = String(_state.search || '').trim().toLowerCase();
    const rows = sortRows(applyFilter(all).filter(r => searchMatch(r, q)));

    // Totals computed against the FULL month, not the filter — gives a stable
    // picture of the month while the chips slice the visible list.
    let sales = 0, credits = 0, paidIn = 0, unpaidOut = 0;
    let nSala = 0, nKredit = 0, nGreitt = 0, nKrafa = 0, nAfgr = 0;
    const upp = {};
    UPPRUNI.forEach(u => { upp[u.k] = { n: 0, sala: 0, kredit: 0 }; });
    all.forEach(s => {
      const total = +s.samtals || 0;
      const u = upp[uppruni(s).k];
      if (s.is_credit) { credits += Math.abs(total); nKredit++; u.kredit += Math.abs(total); }
      else {
        sales += total; nSala++; u.sala += total; u.n++;
        if (s.paid_at) { paidIn += total; nGreitt++; }
        else if (erOgreitt(s)) { unpaidOut += total; if (erIAfgreidslu(s)) nAfgr++; else nKrafa++; }
      }
    });
    const net = sales - credits;
    const innh = (paidIn + unpaidOut) > 0 ? Math.round(paidIn / (paidIn + unpaidOut) * 100) : 0;

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];
    const scopeLabel = _state.scope === 'all' ? 'Allar færslur'
      : _state.scope === 'year' ? String(_state.month.getFullYear())
      : monthLabel;

    const chipDef = [
      ['all',    'Allt',       all.length],
      ['paid',   'Greitt',     nGreitt],
      ['unpaid', 'Ógreitt',    nKrafa + nAfgr],
      ['credit', 'Kredit',     nKredit]
    ];

    const greittLabel = (_state.mode === 'kt' || _state.scope !== 'month') ? 'Greitt' : 'Greitt í mán.';
    // 05.10.2026 (Agnar: „helst að sjá default alveg síðustu afgreiðslu frá söluborðinu"): nýjasta kláraða sala af
    // söluborði (pos) eða úr afgreiðslu (sott), fest efst svo hún finnist strax ef þarf að breyta henni.
    const sidasta = _state.mode === 'kt' ? null : all.reduce((a, s) =>
      (!s.is_credit && String(s.status || '') === 'final' && (s.source === 'pos' || s.source === 'sott') &&
       (!a || String(s.created_at || '') > String(a.created_at || ''))) ? s : a, null);
    const kt = _state.mode === 'kt' && _state.ktInfo;
    const H4 = '<span class="hl2-hnod a" aria-hidden="true"></span><span class="hl2-hnod b" aria-hidden="true"></span><span class="hl2-hnod c" aria-hidden="true"></span><span class="hl2-hnod d" aria-hidden="true"></span>';
    // STÖÐUGT VIÐMÓT (CLAUDE.md, 23.09.2026): `main.innerHTML = …` hendir öllu sem hékk í gamla trénu — skrunstöðunni
    // (líka láréttu skruni töflunnar á síma), fókusnum og textavalinu. Hjálparinn í 388 gerir þetta allt í sama tifi.
    const _aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(main) : null;
    main.innerHTML = `
      <div class="thm"><div class="app-page"><main class="app-main"><div class="hl2">

        <header class="hl2-haus">${H4}
          <div class="hl2-titill">
            <h1>Hreyfingarlisti</h1>
            ${kt
              ? `<div class="hl2-undir kt"><b>${esc(kt.nafn)}</b>${kt.ktFmt ? ' · kt. ' + esc(kt.ktFmt) : ''} · ${esc(ft(_state.all.length, 'færsla', 'færslur'))}${kt.locs > 1 ? ' · ' + kt.locs + ' staðsetningar' : ''}</div>`
              : `<div class="hl2-undir">${esc(scopeLabel)} · ${esc(ft(all.length, 'færsla', 'færslur'))} · smelltu á dálk til að raða</div>`}
          </div>
          <div class="hl2-tol">
            ${kt
              ? `<button class="_hr-back hl2-malm" type="button">${IKON.tilbaka}Mánaðaryfirlit</button>`
              : `${_state.scope !== 'all' ? '<button class="_hr-prev hl2-skref" type="button" aria-label="Fyrra tímabil">' + IKON.vinstri + '</button><span class="hl2-man">' + esc(scopeLabel) + '</span><button class="_hr-next hl2-skref" type="button" aria-label="Næsta tímabil">' + IKON.haegri + '</button>' : ''}
                 <div class="hl2-seg" role="group" aria-label="Tímabil">${['month','year','all'].map(s => { const on = _state.scope === s; const lbl = { month: 'Mán', year: 'Ár', all: 'Allt' }[s];
                     return '<button class="_hr-scope' + (on ? ' is-active' : '') + '" data-s="' + s + '" type="button" aria-pressed="' + on + '">' + lbl + '</button>'; }).join('')}</div>`}
            <label class="hl2-reitur" title="Sláðu inn kennitölu eða nafn og ýttu á Enter til að sjá ALLAR sölur/reikninga kúnnans">${IKON.leit}<input class="_hr-ktlookup" type="text" placeholder="Kennitala eða nafn …" aria-label="Kennitala eða nafn — Enter sækir alla sögu kúnnans" value="${kt ? esc(kt.query) : ''}"></label>
            <button class="_hr-csv hl2-malm" type="button" title="Flytja listann út sem CSV">${IKON.csv}CSV</button>
          </div>
        </header>

        <section class="hl2-plata" aria-label="Yfirlit">
          <div class="hl2-kpi">
            ${kTile('Sölur', '', fmtTala(sales), ft(nSala, 'sala', 'sölur'))}
            ${kTile('Kreditfært', 'rautt', fmtTala(-credits), ft(nKredit, 'kreditfærsla', 'kreditfærslur'), 'rautt')}
            ${kTile(greittLabel, 'graent', fmtTala(paidIn), ft(nGreitt, 'færsla', 'færslur'))}
            ${kTile('Ógreitt', 'gull', fmtTala(unpaidOut), ft(nKrafa, 'krafa', 'kröfur') + ' · ' + nAfgr + ' í afgreiðslu', '', 'Kröfur í Kröfu yfirliti + drög sem bíða í afgreiðslu (ekki sótt)')}
            <div class="hl2-k malm"><div class="hl2-merki">${IKON.sigma}Nettó</div><div class="hl2-tala">${fmtTala(net)}</div><div class="hl2-skyr">Sölur − kreditfært</div></div>
          </div>
          ${(paidIn + unpaidOut) > 0 ? `<div class="hl2-innh">
            <div class="hl2-innh-l"><span class="hl2-merki">Innheimta</span><span><b class="g">${innh}%</b> greitt · <b class="o">${100 - innh}%</b> ógreitt · <b>${esc(fmtKr(unpaidOut))}</b> útistandandi</span></div>
            <div class="hl2-strik" role="img" aria-label="${innh}% greitt, ${100 - innh}% ógreitt"><span class="g" style="width:${innh}%"></span><span class="o" style="width:${100 - innh}%"></span></div>
          </div>` : ''}
          <div class="hl2-kafli">Eftir uppruna<span>nettó, að frádregnu kredit</span><i aria-hidden="true"></i>${_state.uppr ? '<button type="button" class="hl2-silfur hl2-up-af">Sýna allt</button>' : ''}</div>
          <div class="hl2-uppr">${UPPRUNI.filter(u => u.k !== 'annad' || upp.annad.n || upp.annad.kredit).map(u => uTile(u, upp[u.k])).join('')}</div>
        </section>

        <section class="hl2-skel" aria-label="Færslur">
          <div class="hl2-skel-haus"><span class="hl2-hnod v" aria-hidden="true"></span><span class="hl2-hnod h" aria-hidden="true"></span>
            <div class="hl2-sia" role="group" aria-label="Sía færslur">
              ${chipDef.map(([k, label, n]) => `<button class="_hr-chip${_state.filter === k ? ' is-active' : ''}" data-k="${k}" type="button" aria-pressed="${_state.filter === k}">${esc(label)}<span>${n}</span></button>`).join('')}
            </div>
            <label class="hl2-reitur">${IKON.leit}<input class="_hr-search" type="text" placeholder="Sía lista — nafn, R-númer, upphæð …" aria-label="Sía lista" value="${esc(_state.search)}"></label>
          </div>
          ${sidasta ? sidastaHtml(sidasta) : ''}
          ${listHtml(rows)}
          <div class="hl2-fot"><span>${esc(rows.length === all.length ? ft(all.length, 'færsla', 'færslur') : 'Sýni ' + rows.length + ' af ' + all.length + ' færslum')}</span>${_state.uppr ? '<span>Uppruni: ' + esc((UPPRUNI.find(u => u.k === _state.uppr) || {}).heiti || '') + '</span>' : ''}</div>
        </section>

      </div></main></div></div>`;
    if (_aftur) _aftur();   // skrun + fókus + textaval aftur á sinn stað, í SAMA tifi og teikningin

    // Prev/next step by month (Mán scope) or year (Ár scope). Hidden in Allt.
    const _step = dir => {
      const m = new Date(_state.month);
      if (_state.scope === 'year') m.setFullYear(m.getFullYear() + dir);
      else m.setMonth(m.getMonth() + dir);
      load(m);
    };
    main.querySelector('._hr-prev')?.addEventListener('click', () => _step(-1));
    main.querySelector('._hr-next')?.addEventListener('click', () => _step(1));
    main.querySelectorAll('._hr-scope').forEach(b => b.addEventListener('click', () => {
      if (_state.scope === b.dataset.s) return;
      _state.scope = b.dataset.s;
      load(_state.month || new Date());
    }));
    main.querySelector('._hr-csv')?.addEventListener('click', exportCSV);
    main.querySelectorAll('._hr-chip').forEach(c => {
      c.addEventListener('click', () => { _state.filter = c.dataset.k; render(); });
    });
    main.querySelectorAll('._hr-sort').forEach(h => {
      h.addEventListener('click', () => {
        const k = h.dataset.k;
        if (_state.sortKey === k) _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
        else { _state.sortKey = k; _state.sortDir = (k === 'created_at' || k === 'greitt' || k === 'samtals') ? 'desc' : 'asc'; }
        render();
      });
    });
    // 23.09.2026 (afköst): síureiturinn kallaði á render() við HVERN staf — og render() byggir alla töfluna upp á nýtt.
    // Mælt á lifandi síðu: sýnin er 28.203 hnútar, svo hver áslátt reif þá alla út og byggði aftur. Nú er teikningin
    // dregin saman í eina umferð 180 ms eftir síðasta staf; sá sem skrifar hratt fær EINA teikningu í stað tíu.
    // Talan er sú sama og 187 notar fyrir sína samandregnu endurbyggingu.
    const _si = main.querySelector('._hr-search');
    if (_si) _si.addEventListener('input', () => {
      _state.search = _si.value;
      clearTimeout(_leitTimer);
      _leitTimer = setTimeout(() => {
        render();
        const el = document.querySelector('._hr-search');
        if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (_) {} }
      }, 180);
    });
    main.querySelectorAll('._hr-view').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    main.querySelectorAll('._hr-send').forEach(b => {
      b.addEventListener('click', () => sendReceipt(b.dataset.id));
    });
    main.querySelectorAll('._hr-edit').forEach(b => {
      b.addEventListener('click', () => breytaSolu(b.dataset.id));
    });
    main.querySelectorAll('._hr-bakfaera-nyjan').forEach(b => {
      b.addEventListener('click', () => bakfaeraOgNytt(b.dataset.id));
    });
    main.querySelectorAll('._hr-bakfaera').forEach(b => {
      b.addEventListener('click', () => bakfaera(b.dataset.id));
    });
    // 05.10.2026: ⋯ opnar sömu aðgerðir í valmynd (opnaValmynd → keyra → sömu föll og takkarnir hér að ofan).
    main.querySelectorAll('.hl2-meira').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); opnaValmynd(b); });
    });
    // Uppruna-flísarnar sía listann (smellur aftur á sömu = allt).
    main.querySelectorAll('.hl2-up').forEach(b => {
      b.addEventListener('click', () => { _state.uppr = _state.uppr === b.dataset.u ? null : b.dataset.u; render(); });
    });
    main.querySelector('.hl2-up-af')?.addEventListener('click', () => { _state.uppr = null; render(); });
    // Kennitala/nafn lookup — Enter pulls the customer's whole history.
    const _kl = main.querySelector('._hr-ktlookup');
    if (_kl) _kl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(_kl.value); }
    });
    main.querySelector('._hr-back')?.addEventListener('click', exitKt);
    // Company name → fyrirtækjaspjald. solur.customer_id is a fyrirtaeki id (FK),
    // which is exactly what _openCompanySafe / Companies.openDetail expect. Use
    // the loading-safe opener (patch 164) when present.
    main.querySelectorAll('._hr-co').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const id = +a.dataset.id;
      try {
        if (typeof window._openCompanySafe === 'function') window._openCompanySafe(id);
        else if (window.Companies && typeof Companies.openDetail === 'function') Companies.openDetail(id);
        else location.hash = '#company/' + id;
      } catch (_) { location.hash = '#company/' + id; }
    }));
  }

  // ── Aðgerðirnar sjálfar — ÓBREYTTAR, aðeins færðar úr nafnlausum smellföllum í nefnd föll svo bæði takkarnir
  //    og ⋯-valmyndin kalli á nákvæmlega sama kóðann (05.10.2026). ─────────────────────────────────────────────
  function breytaSolu(id) {
    if (window.SaleEditor && SaleEditor.openById) SaleEditor.openById(id);
    else alert('Sölu-editor ekki tiltækur.');
  }
  async function bakfaeraOgNytt(id) {
    if (!window.CreditInvoice || !CreditInvoice.open) { alert('Kreditfærslueining ekki tiltæk.'); return; }
    if (typeof window.SalaNyjan !== 'function') { alert('Sala-eining ekki tiltæk.'); return; }
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
      .eq('id', id).single();
    if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
    const d = r.data;
    const lines = Array.isArray(d.linur) ? d.linur : [];
    CreditInvoice.open({
      id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
      total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
      lines, payment: d.greitt_med
    });
    // Once the credit modal closes (whether confirmed or cancelled), open a
    // fresh sale for the same customer with the original lines copied in —
    // that's the "og nýtt" half of this button (verkefnalisti d18b707d).
    setTimeout(() => {
      const modal = document.getElementById('ci-modal');
      if (!modal) { window.SalaNyjan(d.customer_kt, d.customer_nafn, lines); return; }
      const obs = new MutationObserver(() => {
        if (modal.style.display === 'none' || !document.body.contains(modal)) {
          obs.disconnect();
          load(_state.month || new Date());
          window.SalaNyjan(d.customer_kt, d.customer_nafn, lines);
        }
      });
      obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }, 300);
  }
  async function bakfaera(id) {
    if (!window.CreditInvoice || !CreditInvoice.open) { alert('Kreditfærslueining ekki tiltæk.'); return; }
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
      .eq('id', id).single();
    if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
    const d = r.data;
    CreditInvoice.open({
      id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
      total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
      lines: Array.isArray(d.linur) ? d.linur : [], payment: d.greitt_med
    });
    // Refresh the list once the credit modal closes.
    setTimeout(() => {
      const modal = document.getElementById('ci-modal');
      if (!modal) return;
      const obs = new MutationObserver(() => {
        if (modal.style.display === 'none' || !document.body.contains(modal)) { obs.disconnect(); load(_state.month || new Date()); }
      });
      obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }, 300);
  }
  function keyra(cls, id) {
    if (cls === '_hr-view') return openInvoice(id);
    if (cls === '_hr-send') return sendReceipt(id);
    if (cls === '_hr-edit') return breytaSolu(id);
    if (cls === '_hr-bakfaera') return bakfaera(id);
    if (cls === '_hr-bakfaera-nyjan') return bakfaeraOgNytt(id);
  }

  // ── Lykiltölur, uppruni, síðasta afgreiðsla ──────────────────────────────────
  function kTile(label, led, tala, skyr, cls, title) {
    return '<div class="hl2-k"' + (title ? ' title="' + esc(title) + '"' : '') + '><div class="hl2-merki"><span class="hl2-led' + (led ? ' ' + led : '') + '" aria-hidden="true"></span>' + esc(label) + '</div>' +
      '<div class="hl2-tala' + (cls ? ' ' + cls : '') + '">' + tala + '</div><div class="hl2-skyr">' + esc(skyr) + '</div></div>';
  }
  function uTile(u, d) {
    const on = _state.uppr === u.k, net = d.sala - d.kredit, tomt = !d.n && !d.kredit;
    return '<button type="button" class="hl2-up' + (on ? ' is-on' : '') + (tomt ? ' tomt' : '') + '" data-u="' + u.k + '" aria-pressed="' + on + '" title="Sía listann á ' + esc(u.heiti) + '">' +
      '<span class="hl2-merki">' + esc(u.heiti) + '</span>' +
      '<span class="hl2-tala">' + fmtTala(net) + '</span>' +
      '<span class="hl2-skyr">' + (tomt ? 'Engin sala skráð' : esc(ft(d.n, 'sala', 'sölur')) + (d.kredit ? ' · kredit ' + esc(fmtKr(-d.kredit)) : '')) + '</span></button>';
  }
  function sidastaHtml(s) {
    return '<div class="hl2-sidasta" role="group" aria-label="Síðasta afgreiðsla á söluborði">' +
      '<span class="hl2-merki"><span class="hl2-led graent" aria-hidden="true"></span>Síðasta afgreiðsla</span>' +
      numHtml(s.num) +
      '<span class="hl2-sid-nafn">' + custNameHtml(s) + '</span>' +
      '<span class="hl2-d inl">' + esc(fmtDate(s.created_at)) + ' · ' + esc(fmtTime(s.created_at)) + '</span>' +
      methodBtn(s.greitt_med) +
      amountHtml(s) +
      '<span class="hl2-adg">' +
        '<button class="_hr-edit hl2-silfur" data-id="' + s.id + '" type="button" title="Breyta sölu — óSENDA reikninga má breyta beint">' + IKON.edit + 'Breyta</button>' +
        '<button class="_hr-view hl2-silfur" data-id="' + s.id + '" type="button" title="Skoða / prenta / vista PDF">' + IKON.pdf + 'PDF</button>' +
      '</span></div>';
  }

  // ── Shared per-row bits (identical data + hooks across all three layouts) ───
  function custNameHtml(s) {
    return s.customer_id
      ? `<a class="_hr-co hl2-co" data-id="${s.customer_id}" href="#company/${s.customer_id}" title="Opna fyrirtækjaspjald">${esc(s.customer_nafn || '—')}</a>`
      : esc(s.customer_nafn || '—');
  }
  function typeBtnFor(s) { return s.is_credit ? '<span class="hl2-tag rautt">Kredit</span>' : '<span class="hl2-tag">Sala</span>'; }
  function statusBtnFor(s) {
    if (s.is_credit) return plata('Kredit', 'rautt');
    if (s.paid_at) return plata('Greitt', 'graent');
    if (erOgreitt(s)) return plata('Ógreitt', 'gull');
    const st = String(s.status || '');
    if (st === 'void') return plata('Bakfært', '');
    if (kreditfaerdur(s)) return '';                 // kMark bætir við „Kreditfært"-plötunni
    if (st === 'drog') return plata('Drög', '');
    return '<span class="hl2-dauft">—</span>';
  }
  function amountHtml(s) {
    const total = +s.samtals || 0;
    return s.is_credit
      ? '<span class="hl2-kr rautt">' + fmtTala(-Math.abs(total)) + '</span>'
      : '<span class="hl2-kr">' + fmtTala(total) + '</span>';
  }
  // Ordered action list — one source of truth: labelled (hl2-ab) on 📱, icon-only (hl2-ib) in ▦,
  // PDF + ⋯ on 🖥. Same hook classes + data-id everywhere.
  function actionDefs(s) {
    const defs = [];
    defs.push({ cls: '_hr-send', extra: 'data-id="' + s.id + '"', ik: 'send', label: 'Kvittun', valmynd: 'Senda kvittun í tölvupósti', title: 'Senda kvittun í tölvupósti' });
    defs.push({ cls: '_hr-view', extra: 'data-id="' + s.id + '"', ik: 'pdf', label: 'PDF', valmynd: 'Skoða / prenta PDF', title: 'Skoða / prenta / vista PDF' });
    if (!s.is_credit) {
      defs.push({ cls: '_hr-edit', extra: 'data-id="' + s.id + '"', ik: 'edit', label: 'Breyta', valmynd: 'Breyta', title: 'Breyta sölu — óSENDA reikninga má breyta beint' });
      defs.push({ cls: '_hr-bakfaera', extra: 'data-id="' + s.id + '"', ik: 'kredit', label: 'Kredit', valmynd: 'Kreditfæra', haetta: true, title: 'Bakfæra (kreditfæra) þennan reikning' });
    }
    if (!s.is_credit) {
      // 2026-08-05 (verkefnalisti d18b707d): renamed from "Nýr + kredit" — the
      // OLD button just opened a blank Sala for the customer with no credit and
      // no line items, despite its name. Now genuinely bakfærir the original
      // (same Kredit modal as the ↩ button above) and THEN opens a new sale
      // with the original's lines already in the cart, obviously labelled.
      defs.push({ cls: '_hr-bakfaera-nyjan', extra: 'data-id="' + s.id + '"', ik: 'nyjan', label: 'Bakfæra og nýtt', valmynd: 'Bakfæra og nýtt', title: 'Bakfæra þennan reikning OG opna nýja sölu með sömu línum til að breyta' });
    }
    return defs;
  }
  function abtn(d) {
    return '<button class="' + d.cls + ' hl2-ab' + (d.haetta ? ' haetta' : '') + '" ' + d.extra + ' type="button" title="' + esc(d.title) + '">' + IKON[d.ik] + '<span>' + esc(d.label) + '</span></button>';
  }
  function actsAbtn(s) { return actionDefs(s).map(abtn).join(''); }
  function iconBtn(d) {
    return '<button class="' + d.cls + ' hl2-ib' + (d.haetta ? ' haetta' : '') + '" ' + d.extra + ' type="button" title="' + esc(d.title) + '" aria-label="' + esc(d.label) + '">' + IKON[d.ik] + '</button>';
  }

  // Sort-header (reuses the ._hr-sort click hook + data-k).
  function thS(key, label, cls) {
    const on = _state.sortKey === key;
    return '<th class="_hr-sort' + (on ? ' is-sorted' : '') + (cls ? ' ' + cls : '') + '" data-k="' + key + '" aria-sort="' + (on ? (_state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none') + '" title="Raða eftir: ' + esc(label) + '">' + esc(label) + '<span class="hl2-or">' + sortArrow(key) + '</span></th>';
  }

  // ── List section — layout differs by view-mode; data/hooks identical ───────
  function listHtml(rows) {
    const mode = getViewMode();
    if (mode === 'mobile') return mobileCardsHtml(rows);
    return tafla(rows, mode === 'table');
  }

  // 🖥 Skjár (PDF + ⋯) og ▦ Tafla (þétt, allar aðgerðir sem tákn) — sama tafla, sömu raðanlegu dálkar.
  function tafla(rows, thett) {
    const head = '<thead><tr>' +
      thS('created_at', 'Skráð', 'c-d') + thS('num', 'Skjal', 'c-n') + thS('customer_nafn', 'Viðskiptavinur') +
      thS('uppruni', 'Uppruni', 'c-u') + thS('greitt', 'Greitt · síðast', 'c-g') + thS('greitt_med', 'Greiðslumáti', 'c-m') +
      thS('stada', 'Staða', 'c-s') + thS('samtals', 'Upphæð', 'r c-k') + '<th class="r c-a">Aðgerðir</th></tr></thead>';
    const body = rows.length ? rows.map(s => rodHtml(s, thett)).join('')
      : '<tr><td colspan="9" class="hl2-tomt">Engar hreyfingar</td></tr>';
    return '<div class="hl2-skrun"><table class="hl2-tafla' + (thett ? ' thett' : '') + '">' + head + '<tbody>' + body + '</tbody></table></div>';
  }
  function rodHtml(s, thett) {
    const adg = thett
      ? actionDefs(s).map(iconBtn).join('')
      : '<button class="_hr-view hl2-ib" data-id="' + s.id + '" type="button" title="Skoða / prenta / vista PDF" aria-label="PDF fyrir ' + esc(s.num || '') + '">' + IKON.pdf + '</button>' +
        '<button class="hl2-ib hl2-meira" data-id="' + s.id + '" type="button" title="Fleiri aðgerðir" aria-haspopup="menu" aria-expanded="false" aria-label="Aðgerðir fyrir ' + esc(s.num || '') + '">' + IKON.meira + '</button>';
    return '<tr>' +
      '<td><span class="hl2-d">' + esc(fmtDate(s.created_at)) + '</span><span class="hl2-t">' + esc(fmtTime(s.created_at)) + '</span></td>' +
      '<td>' + numHtml(s.num) + typeBtnFor(s) + '</td>' +
      '<td><span class="hl2-nafn">' + custNameHtml(s) + '</span>' + ktCell(s.customer_kt) + '</td>' +
      '<td><span class="hl2-upp">' + esc(uppruni(s).stutt) + '</span></td>' +
      '<td>' + greittCell(s) + '</td>' +
      '<td>' + methodBtn(s.greitt_med) + '</td>' +
      '<td>' + kMark(s, statusBtnFor(s), 'ribbon') + '</td>' +
      '<td class="r">' + amountHtml(s) + '</td>' +
      '<td class="r"><span class="hl2-adg">' + adg + '</span></td>' +
    '</tr>';
  }

  // 📱 Sími — spjöld á stálplötu, ≥40px takkar, allar aðgerðir sýnilegar (lárétt skrun).
  function mobileCardsHtml(rows) {
    if (!rows.length) return '<div class="hl2-tomt">Engar hreyfingar</div>';
    return '<div class="hl2-mlist">' + rows.map(cardMobileHtml).join('') + '</div>';
  }
  function cardMobileHtml(s) {
    const k = ktCell(s.customer_kt);
    const greittAnnan = s.paid_at && fmtDate(s.paid_at) !== fmtDate(s.created_at);
    return '<div class="hl2-mcard">' +
      '<div class="hl2-mtop">' + numHtml(s.num) + '<span class="hl2-t inl">' + esc(fmtDate(s.created_at)) + (fmtTime(s.created_at) ? ' · ' + esc(fmtTime(s.created_at)) : '') + '</span>' + amountHtml(s) + '</div>' +
      '<div class="hl2-mnafn">' + custNameHtml(s) + '</div>' +
      (k ? '<div class="hl2-mkt">' + k + '</div>' : '') +
      '<div class="hl2-mtags">' + typeBtnFor(s) + methodBtn(s.greitt_med) + kMark(s, statusBtnFor(s), 'ribbon') +
        '<span class="hl2-upp">' + esc(uppruni(s).stutt) + '</span>' +
        (greittAnnan ? '<span class="hl2-d grn inl">Greitt ' + esc(fmtDate(s.paid_at)) + '</span>' : '') + '</div>' +
      '<div class="hl2-macts">' + actsAbtn(s) + '</div>' +
    '</div>';
  }

  // ── ⋯-valmyndin (05.10.2026) ────────────────────────────────────────────────
  // Miðakerfið: ein aðgerð sýnileg (PDF), hinar í ⋯. Valmyndin fer í <body> (position:fixed) svo skrunhólf
  // töflunnar klippi hana ekki. Liðirnir bera SÖMU krókaklasa og data-id og takkarnir og kalla á SÖMU föllin (keyra).
  let _hlPop = null;
  function _utanVal(e) { if (_hlPop && !_hlPop.el.contains(e.target) && !_hlPop.btn.contains(e.target)) lokaValmynd(false); }
  function _skrunVal(e) { if (_hlPop && !(e.target instanceof Node && _hlPop.el.contains(e.target))) lokaValmynd(false); }
  function _lokaVal() { lokaValmynd(false); }
  function _lyklarVal(e) {
    if (!_hlPop) return;
    const items = Array.from(_hlPop.el.querySelectorAll('.hl2-mi'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); lokaValmynd(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') lokaValmynd(false);
  }
  function lokaValmynd(skilaFokus) {
    if (!_hlPop) return;
    const p = _hlPop; _hlPop = null;
    p.el.remove();
    document.removeEventListener('mousedown', _utanVal, true);
    document.removeEventListener('touchstart', _utanVal, true);
    window.removeEventListener('scroll', _skrunVal, true);
    window.removeEventListener('resize', _lokaVal);
    p.btn.setAttribute('aria-expanded', 'false');
    const tr = p.btn.closest('tr'); if (tr) tr.classList.remove('is-open');
    if (skilaFokus && document.contains(p.btn)) { try { p.btn.focus(); } catch (_) {} }
  }
  function opnaValmynd(btn) {
    if (_hlPop && _hlPop.btn === btn) { lokaValmynd(true); return; }
    lokaValmynd(false);
    const s = (_state.all || []).find(x => String(x.id) === String(btn.dataset.id));
    if (!s) return;
    const defs = actionDefs(s);
    const d = cls => defs.find(x => x.cls === cls);
    let html = '<div class="hl2-pop-h">Aðgerðir<span>' + esc(s.num || '') + '</span></div>';
    ['_hr-send', '_hr-edit', '|', '_hr-bakfaera-nyjan', '_hr-bakfaera'].forEach(c => {
      if (c === '|') { if (d('_hr-bakfaera')) html += '<div class="hl2-pop-sk" role="separator"></div>'; return; }
      const x = d(c); if (!x) return;
      html += '<button type="button" role="menuitem" class="hl2-mi ' + x.cls + (x.haetta ? ' haetta' : '') + '" ' + x.extra + ' title="' + esc(x.title) + '">' + IKON[x.ik] + '<span>' + esc(x.valmynd || x.label) + '</span></button>';
    });
    const el = document.createElement('div');
    el.className = 'hl2-pop';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Aðgerðir fyrir ' + (s.num || ''));
    el.innerHTML = html;
    el.querySelectorAll('.hl2-mi').forEach(b => b.addEventListener('click', () => {
      const cls = ['_hr-send', '_hr-edit', '_hr-bakfaera-nyjan', '_hr-bakfaera', '_hr-view'].find(c => b.classList.contains(c));
      lokaValmynd(false);
      keyra(cls, b.dataset.id);
    }));
    el.addEventListener('keydown', _lyklarVal);
    document.body.appendChild(el);
    // Undir ⋯, hægri brúnir saman; upp fyrir ef ekki er rúm. Í appham ber valmyndin krómzoom (--app-krom-zoom)
    // og þá eru left/top í hennar eigin kvarða — því deilt með zoominu.
    const z = parseFloat(getComputedStyle(el).zoom) || 1;
    const r = btn.getBoundingClientRect(), pr = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.right - pr.width), window.innerWidth - pr.width - 8);
    let top = r.bottom + 6;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
    el.style.left = (left / z) + 'px';
    el.style.top = (top / z) + 'px';
    _hlPop = { el, btn };
    btn.setAttribute('aria-expanded', 'true');
    const tr = btn.closest('tr'); if (tr) tr.classList.add('is-open');
    document.addEventListener('mousedown', _utanVal, true);
    document.addEventListener('touchstart', _utanVal, true);
    window.addEventListener('scroll', _skrunVal, true);
    window.addEventListener('resize', _lokaVal);
    const first = el.querySelector('.hl2-mi'); if (first) { try { first.focus({ preventScroll: true }); } catch (_) {} }
  }

  // ── View invoice (same pattern as Til að rukka / Kröfu yfirlit) ──────────
  async function openInvoice(saleId) {
    const SB = getSB();
    if (!SB) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      alert('Reikningsmótið er ekki tiltækt.'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      // fyrirtaeki + vidskiptavinir have independent bigserials → low ids
      // overlap. Pull both and disambiguate by matching sale.customer_nafn.
      const [fRes, vRes] = await Promise.all([
        SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        SB.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const f = fRes.data, v = vRes.data;
      const norm = s => String(s || '').trim().toLowerCase();
      const saleNafn = norm(sale.customer_nafn);
      if (saleNafn) {
        if (f && norm(f.nafn) === saleNafn) cust = f;
        else if (v && norm(v.nafn) === saleNafn) cust = v;
      }
      if (!cust) cust = f || v || null;
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── Send receipt/invoice by email ────────────────────────────────────────
  // The email sender (Gmail/Microsoft Graph) is being set up. When connected it
  // will expose window.ReceiptSender.send(saleId) — this button then sends the
  // PDF straight from the app. Until then it opens the invoice so the user can
  // print or save-as-PDF and attach it manually (nothing is blocked meanwhile).
  async function sendReceipt(saleId) {
    if (window.ReceiptSender && typeof window.ReceiptSender.send === 'function') {
      try { await window.ReceiptSender.send(saleId); return; } catch (_) { /* fall through to manual */ }
    }
    if (window.Toast && Toast.show) Toast.show('📧 Bein tölvupóstsending er ekki tengd enn — opna reikninginn til að prenta eða vista sem PDF.');
    openInvoice(saleId);
  }

  // ── CSV export ──────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = applyFilter(_state.all);
    const header = ['Dags','Tími','Skjal','Viðskiptavinur','Kennitala','Tegund','Greiðslumáti','Staða','Án VSK','VSK','Samtals','Starfsmaður','Athugasemdir'];
    const lines = [header];
    rows.forEach(s => {
      const isCredit = !!s.is_credit;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      const isPaid = !!s.paid_at;
      // 05.10.2026: sama regla og talan (erOgreitt) — kreditfært/bakfært/drög eru ekki „Ógreitt".
      const status = isCredit ? 'Kredit' : isPaid ? 'Greitt' : erOgreitt(s) ? 'Ógreitt'
        : !isInvoice ? '' : String(s.status || '') === 'void' ? 'Bakfært' : kreditfaerdur(s) ? 'Kreditfært' : String(s.status || '') === 'drog' ? 'Drög' : '';
      const total = +s.samtals || 0;
      lines.push([
        fmtDate(s.created_at),
        fmtTime(s.created_at),
        s.num || '',
        s.customer_nafn || '',
        s.customer_kt || '',
        isCredit ? 'Kreditfærsla' : 'Sala',
        s.greitt_med || '',
        status,
        Math.round(+s.upphaed_an_vsk || 0),
        Math.round(+s.vsk_upphaed || 0),
        isCredit ? -Math.abs(Math.round(total)) : Math.round(total),
        s.starfsmadur || '',
        s.athugasemdir || ''
      ]);
    });
    const csv = '﻿' + lines.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = _state.mode === 'kt' ? ('kunni_' + (_state.ktInfo && _state.ktInfo.ktFmt ? ktDigits(_state.ktInfo.ktFmt) : 'saga'))
      : _state.scope === 'all' ? 'allt'
      : _state.scope === 'year' ? String(_state.month.getFullYear())
      : _state.month.getFullYear() + '-' + String(_state.month.getMonth()+1).padStart(2,'0');
    a.href = url;
    a.download = 'Hreyfingarlisti_' + slug + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  function show() {
    ensureView();
    if (window.App && App.switchView) App.switchView(NAV_KEY);
    else load();
  }

  injectNav();
  setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();

  // ── Deep-link: #hreyfingarlisti/<kennitala-eða-nafn> ──────────────────────
  // Opens the view and runs the customer lookup — so a shareable link (or the
  // Sala „🧾 Fyrri" button in patch 253) lands straight on a customer's whole
  // sölu-/reikningasaga. Waits for the view + DB before running the lookup.
  function handleDeepLink() {
    const h = location.hash || '';
    const m = h.match(/^#(?:hreyfingarlisti|hreyfingar)\/(.+)$/i);
    if (!m) return;
    let q = '';
    try { q = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch (_) { q = m[1].trim(); }
    if (!q) return;
    try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {}
    ensureView();
    let tries = 0;
    (function run() {
      if (getSB() && document.getElementById('hr-main') && typeof lookupCustomer === 'function') { lookupCustomer(q); return; }
      if (tries++ < 50) setTimeout(run, 200);
    })();
  }
  window.addEventListener('hashchange', handleDeepLink);
  setTimeout(handleDeepLink, 1400);

  // App-wide view-mode toggle (patch 166, in the banner) → re-render THIS page
  // live when it is the active view, so flipping 📱/▦/🖥 switches the layout
  // instantly. Cheap no-op when the view is not active.
  document.addEventListener('slokk-viewmode', () => {
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) { try { render(); } catch (_) {} }
  });

  window.Hreyfingarlisti = { show, load, lookup: lookupCustomer };
  console.log('[patch-167] Hreyfingarlisti installed');
})();
/* === END HREYFINGARLISTI === */
