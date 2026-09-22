/* === FYRIRTÆKI Í ÞJÓNUSTU Í MIÐAKERFINU (393) — 22.09.2026 ===
 *
 * Agnar: „þú gleymdir fyrirtæki í þjónustu" → Ársskoðunin (#arsskodun) fær sama útlit og
 * Afgreiðsla (389), Verkstæði (390), Kröfu yfirlit (166), hliðarstikan (391) og hinar tvær
 * skoðanasíðurnar (392). Hönnunin sem hann samþykkti:
 * https://claude.ai/artifact/KbvQMth5FzXN5vQHdj86k1 · íhluturinn: Stöðuplata í
 * https://claude.ai/artifact/MfY6rBkwqEkKaSrJd6TKKj
 *
 * AÐEINS útlit — 153 er VÖRÐUÐ LÍNA (docs/ORYGGISNET.md: readiness 153/187) og er ekki
 * snert hér. Ekkert markup, engin gögn, engin rökfræði: stílblað sem liggur ofan á.
 *
 * Tvennt sem er VILJANDI látið í friði:
 *   • Lykiltölu-spjöldin (._kpi.thm-stat, .bstal-hero) — Agnar litaði þau sjálfur í
 *     Stílstjóranum (_pe-overrides). Hér eru þau aðeins ferkönstuð og talan sett í Playfair.
 *   • Blái bakgrunnur sýnarinnar — líka hans regla. 392 málar allar aðrar sýnir gráar;
 *     þessi heldur bláa fletinum þar til hann biður um annað.
 *
 * Stöðurnar (span._st): done grænn málmur · work blár · plan stál · skip gull · late rauður.
 * Ártalsflísarnar (a._yr) halda forminu sínu — flís + punktar undir — og fá málm í stað pastel.
 */
(() => {
  if (window.__arsMidarInstalled) return;
  window.__arsMidarInstalled = true;

  const V = 'html body #view-arsskodun ';
  // Tvöfaldað auðkenni: 153 og Stílstjórinn skrifa báðir reglur á þessa sýn sem
  // slá út `html body #view-arsskodun …` (sjá 394 og docs). Notað þar sem liturinn
  // sjálfur þarf að koma úr borðinu.
  const W = 'html body #view-arsskodun#view-arsskodun ';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const GRAPHITE = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const GREEN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const GOLD = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  const BLUE = 'linear-gradient(145deg,#040d18 0%,#0b2440 20%,#154a7d 43%,#2f7fc9 53%,#0d2b4c 74%,#040d18 100%)';

  function css() {
    return [
      // Titill í Playfair (stærð og litur eru reglur Agnars — þeim er ekki breytt)
      V + '#ars-main h1{font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.02em!important}',

      // ── Lykiltölu-spjöldin fjögur (Agnar 22.09: „þessum fjórum gluggum geggjað flott") ──
      // Eins og á borðinu: Virðið er breiða spjaldið fremst, málmáferð ofan á LITUM HANS
      // (þeir koma úr Stílstjóranum og er ekki breytt — rendurnar liggja í ::before svo
      // bakgrunnurinn hans stendur óhaggaður undir), málmband efst, merkimiði í einbreiðu
      // letri og talan í Playfair í þeirri stærð sem hönnunin sýnir.
      V + '._ars-statgrid{grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr))!important;gap:12px!important}',
      // Litirnir af borðinu sjálfu (Agnar 22.09: „reyndu að replikata gamla"):
      // hetjuspjaldið er nærri svartur málmur með rauðri rönd, hin þrjú djúpgræn,
      // djúprauð og grafít — ekki flatir fletir.
      W + '.bstal-hero{background-image:' + STRIPE + METAL + '!important;background-color:#0a0a0c!important;border:1px solid #23262c!important;border-top:3px solid #f0584c!important}',
      W + '._kpi--graent{background-image:' + STRIPE + 'linear-gradient(145deg,#02100a 0%,#07301c 30%,#0d5130 55%,#062719 80%,#010c07 100%)!important;border:1px solid #14512f!important;border-top:3px solid #16783f!important;color:#e8f3ec!important}',
      W + '._kpi--rautt{background-image:' + STRIPE + 'linear-gradient(145deg,#100203 0%,#330607 30%,#6b1114 55%,#2a0506 80%,#0c0102 100%)!important;border:1px solid #58100f!important;border-top:3px solid #971515!important;color:#f6e6e4!important}',
      W + '._kpi--hlut{background-image:' + STRIPE + METAL + '!important;border:1px solid #23262c!important;color:#e7eaf0!important}',
      W + '._kpi--graent ._kpi-h{color:#7fe0a8!important}',
      W + '._kpi--rautt ._kpi-h{color:#ffb3ab!important}',
      W + '._kpi--hlut ._kpi-h{color:#aeb6c4!important}',
      W + '._kpi-n{color:#fff!important}',
      V + '._ars-statgrid>*{border-radius:2px!important;position:relative!important;overflow:hidden!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 30px -14px rgba(0,0,0,.7)!important}',
      V + '._ars-statgrid>*::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:' + STRIPE + 'none}',
      V + '._ars-statgrid>*>*{position:relative;z-index:1}',
      V + '.bstal-hero{grid-column:1!important;order:-1!important;padding:18px 22px!important;border-top:3px solid #2f7fc9!important;display:flex!important;flex-direction:column!important;gap:10px!important;justify-content:center!important}',
      // Röðin á borðinu: Virði (breitt) · Búið · Eftir · Fjöldi — Fjöldinn aftast.
      V + '._kpi--hlut{border-top:3px solid #8f98a8!important;order:3!important}',
      V + '._kpi--graent{border-top:3px solid #16783f!important}',
      V + '._kpi--rautt{border-top:3px solid #971515!important}',
      V + '._kpi-h,' + V + '.bstal-hero>div:first-child>div:first-child{font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important}',
      V + '._kpi .thm-statnum,' + V + '._kpi>div:nth-child(2),' + V + '.bstal-hero ._hero-num,' + V + '.bstal-hero>div:nth-child(2){font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.02em!important;font-variant-numeric:lining-nums tabular-nums!important}',
      V + '._kpi .thm-statnum,' + V + '._kpi>div:nth-child(2){font-size:32px!important;line-height:1!important}',
      V + '.bstal-hero>div:nth-child(2){font-size:44px!important;line-height:1!important}',
      V + '._kpi-s,' + V + '.bstal-hero>div:nth-child(3){font-size:11.5px!important;line-height:1.45!important}',
      // Röðin innan spjalds á borðinu: merkimiði · tala · stika · skýring.
      // (Í 153 kemur stikan síðust, svo skýringin flaut milli tölu og stiku.)
      V + '._kpi{display:flex!important;flex-direction:column!important;gap:7px!important;justify-content:center!important}',
      V + '._kpi ._kpi-h{order:0!important}',
      V + '._kpi ._kpi-n{order:1!important}',
      V + '._kpi .thm-track{order:2!important}',
      V + '._kpi ._kpi-s{order:3!important}',
      V + '._ars-statgrid .thm-track{height:6px!important;border-radius:1px!important;overflow:hidden!important;background:rgba(255,255,255,.12)!important}',
      // Hausinn: stærri Playfair og einbreiður undirtexti eins og á borðinu.
      V + '#ars-main h1{font-size:40px!important;line-height:1!important;text-shadow:0 2px 8px rgba(0,0,0,.45)!important}',
      V + '._ars-sub{font-family:' + MONO + '!important;font-size:12.5px!important;color:#d5dbe6!important}',
      V + '._ars-sub b{color:#fff!important}',
      V + '._ars-sort{height:40px!important;border-radius:3px!important;background:' + SILVER + '!important;color:#3a4250!important;border:1px solid rgba(20,24,34,.16)!important;font:600 12.5px ' + SANS + '!important}',

      // Síuflísar og mánuðir: ferkantað stál, valið í málmi
      V + '._ars-statusrow{border-radius:3px!important;border-color:rgba(20,24,34,.18)!important;gap:0!important}',
      V + '._ars-st{border-radius:0!important;background:' + SILVER + '!important;color:#3a4250!important;font:600 12.5px ' + SANS + '!important;padding:8px 13px!important}',
      V + '._ars-st+._ars-st{border-left:1px solid rgba(20,24,34,.14)!important}',
      // VALDA sían: 153 merkir hana með inline `background:var(--brand)` (ekkert aria-pressed).
      // Fyrsta útgáfan af þessum stíl málaði hana silfraða eins og hinar — þá sást ekki hvað var valið.
      V + '._ars-st[style*="--brand"],' + V + '._ars-st[aria-pressed="true"],' + V + '._ars-st.is-on{background:' + RED + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',
      V + '._ars-st[style*="--brand"] span,' + V + '._ars-st[aria-pressed="true"] span{color:#ffd8d4!important;opacity:1!important}',
      V + '._ars-mo{border-radius:3px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.18)!important;color:#3a4250!important;font:600 12px ' + SANS + '!important}',
      V + '._ars-mo[aria-pressed="true"]{background:' + METAL + '!important;border-color:#000!important;color:#fff!important}',
      // Talan í mánaðarflísinni var á 60% ógagnsæi — hún er upplýsing, ekki skraut.
      V + '._ars-mo span{opacity:1!important;font-family:' + MONO + '!important;font-weight:700!important;color:#6b7483!important;margin-left:5px}',
      V + '._ars-mo[aria-pressed="true"] span{color:#d5dbe6!important}',
      // Mánuðurinn sem stendur yfir fær gullbrún (sama regla og í hönnuninni: gull = núna).
      V + '._ars-mo[data-nu="1"]{border-color:#b8912f!important;box-shadow:inset 0 0 0 1px rgba(184,145,47,.45)!important}',
      V + '._ars-mo[data-nu="1"]:not([aria-pressed="true"]){color:#845400!important}',
      V + '._ars-mo[data-nu="1"]:not([aria-pressed="true"]) span{color:#a07a2a!important}',
      V + '#_ars-skiphide,' + V + '.by-preset{border-radius:3px!important}',

      // Leit og val
      V + '._ars-search,' + V + 'input._ars-search{border-radius:3px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.18)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.14)!important;font:400 13px ' + SANS + '!important}',

      // Taflan: ferkantaður rammi, málmhaus, mono-dálkaheiti
      V + '.data-table-wrap,' + V + '._ars-tblscroll{border-radius:2px!important}',
      V + 'table.data-table thead th{background:' + METAL + '!important;color:#aeb6c4!important;font-family:' + MONO + '!important;font-size:10px!important;letter-spacing:.12em!important;text-transform:uppercase!important;border:0!important}',
      V + 'table.data-table tbody td{border-top:1px solid #f1f3f7!important}',
      V + '._ars-namecell ._co{font-family:' + SANS + '!important;font-weight:600!important}',
      V + '._ars-namecell ._kt,' + V + '._ars-addrcell ._post,' + V + '._ars-addrcell ._addr,' + V + '._mo,' + V + '._devs{font-family:' + MONO + '!important;font-variant-numeric:tabular-nums lining-nums}',

      // Ferðanótan: gullrönd þegar spurning bíður (sjá Stöðuplötu-íhlutinn)
      V + 'input._ars-plannote{border-radius:0!important;border:0!important;border-bottom:1px dashed #cfd5de!important;background:transparent!important;font:400 12.5px ' + SANS + '!important;color:#2b313c!important}',
      V + 'input._ars-plannote:focus{border-bottom:1px solid #c92a2a!important;background:#fbfcfe!important;outline:none!important}',
      V + 'input._ars-plannote:not([value=""]){box-shadow:inset 3px 0 0 #b8912f!important;padding-left:8px!important}',

      // Ártalsflísarnar: sama form (flís + punktar undir), málmur í stað pastel
      V + 'a._yr,' + V + 'span._yr{border-radius:5px!important;font-family:' + MONO + '!important;font-weight:700!important;background:' + SILVER + '!important;border:1px solid #d7dbe2!important;color:#8a93a3!important;text-decoration:none!important}',
      V + 'a._yr.on,' + V + 'span._yr.on{background:' + SILVER + '!important;border-color:#cfd5de!important;color:#3a4250!important}',
      V + 'a._yr.both,' + V + 'span._yr.both{background:' + GREEN + '!important;border-color:rgba(52,168,98,.45)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      V + 'a._yr.now,' + V + 'span._yr.now{background:' + RED + '!important;border-color:rgba(190,32,28,.55)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      V + 'a._yr.now.both,' + V + 'span._yr.now.both{background:' + GREEN + '!important;border-color:rgba(52,168,98,.45)!important}',
      V + 'a._yr.penda,' + V + 'span._yr.penda{background:' + GOLD + '!important;border-color:rgba(190,150,60,.5)!important;color:#fff!important}',

      // Stöðuplöturnar: jafnstórar, díóða fremst
      V + 'span._st{position:relative;display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;min-width:120px!important;width:auto!important;max-width:none!important;overflow:visible!important;height:26px;padding:0 10px!important;border-radius:3px!important;font-family:' + SANS + '!important;font-size:11.5px!important;font-weight:700!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5);white-space:nowrap}',
      V + 'span._st::before{content:"";flex:none;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.8)}',
      V + 'span._st--done{background:' + GREEN + '!important;border:1px solid rgba(52,168,98,.45)!important}',
      V + 'span._st--done::before{background:#7fe0a8}',
      V + 'span._st--work{background:' + BLUE + '!important;border:1px solid rgba(60,120,200,.45)!important}',
      V + 'span._st--work::before{background:#9fd0ff}',
      V + 'span._st--plan{background:' + GRAPHITE + '!important;border:1px solid #000!important;color:#eef1f4!important}',
      V + 'span._st--plan::before{background:#8f98a8}',
      V + 'span._st--skip{background:' + GOLD + '!important;border:1px solid rgba(190,150,60,.5)!important}',
      V + 'span._st--skip::before{background:#f7e6a8}',
      V + 'span._st--late{background:' + RED + '!important;border:1px solid rgba(190,32,28,.55)!important}',
      V + 'span._st--late::before{background:#ff9d95}',
      V + 'span._st--off,' + V + 'span._st--none{background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;color:#5b6472!important;text-shadow:none!important}',
      V + 'span._st--off::before,' + V + 'span._st--none::before{background:#aeb6c4}',

      // Kortið og spjöldin: ferkantað eins og annars staðar
      V + '._ars-card,' + V + '#_arsmap-wrap,' + V + '.leaflet-container{border-radius:2px!important}',
    ].join('\n');
  }

  function inject() {
    if (document.getElementById('_arsm-css')) return;
    if (!document.getElementById('_arsm-font')) {
      const lf = document.createElement('link');
      lf.id = '_arsm-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(lf);
    }
    const st = document.createElement('style');
    st.id = '_arsm-css';
    st.textContent = '@media (min-width: 901px){\n' + css() + '\n}';
    (document.head || document.documentElement).appendChild(st);
  }

  // Merkja mánuðinn sem stendur yfir (gullbrúnin). 153 á flísarnar; hér er aðeins
  // sett data-nu="1" á þá sem passar — ekkert annað snert.
  const MON = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  function merkjaManud() {
    const nu = MON[new Date().getMonth()];
    document.querySelectorAll('#view-arsskodun ._ars-mo').forEach(b => {
      const heiti = String(b.textContent || '').trim().toLowerCase().slice(0, 3);
      const passar = heiti === nu.slice(0, 3);
      if (passar && b.dataset.nu !== '1') b.dataset.nu = '1';
      else if (!passar && b.dataset.nu) delete b.dataset.nu;
    });
  }
  let t = null;
  function schedule() { if (t) return; t = setTimeout(() => { t = null; try { merkjaManud(); } catch (_) {} }, 250); }
  function fylgjast() {
    const v = document.getElementById('view-arsskodun');
    if (!v) { setTimeout(fylgjast, 1000); return; }
    schedule();
    new MutationObserver(schedule).observe(v, { childList: true, subtree: true });
  }
  setTimeout(fylgjast, 1200);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  console.log('[393] Fyrirtæki í Þjónustu í Miðakerfinu');
})();
/* === END FYRIRTÆKI Í ÞJÓNUSTU Í MIÐAKERFINU === */
