/* 471-bord-vinnusvaedi.js — 15.10.2026

   Agnar á Þjónustuborðinu (Master + „Á þínu borði"):
     „það er fáranlega lítið pláss til þess að skrifa og svara póstunum þarna
      … geturðu síðan leyft mér að draga hliðarborðann til svo ég fái meira
      pláss þarna þegar ég þarf"
     „og geturðu haft svæðin þar sem ég skrifa inni með hvítum bakgrunn og
      svartir stafir"

   MÆLT 15.10.2026 á 1600 px í skuggarót #view-bord:
     · Útlitið er `.layout` og verður GRIND fyrst við `@container t5 1600px`.
       Með valið mál og enga vinstri súlu gildir
       `.layout.nol.selh{grid-template-columns:minmax(0,1fr) minmax(380px,560px)}`
       (368, lína 1445) — hægri súlan er því FÖST í mesta lagi 560 px og
       meginsúlan fær afganginn. Engin leið var til að hliðra því.
     · Þrjú skrifsvæði eru dökk:
         .nt.dark textarea            → „Þín athugasemd" (#0b0b0a / #efe9da)
         .bm input, .bm textarea      → „Skýring til Claude" o.fl. (#1c1b18)
       (`.setja select` og `.bm select` eru VALREITIR, ekki skrifsvæði, og
        standa óbreyttir — þeir eru hluti af dökku stýringarlínunni.)

   HVERNIG BREIDDIN ER SETT: beint á `style.gridTemplateColumns` á `.layout`.
   Fjórar reglur í 368 skilgreina þessa grind (1600/2600 × með og án súlna);
   að keppa við þær allar með sérvirkni væri brothætt, en innlínustíll vinnur
   þær allar og hverfur um leið og breiddin er núllstillt.

   GEYMSLA: localStorage. Þetta er útlitsval EINS vafra (eins og sía, röðun og
   samanbrot) — ekki vinnustaða — svo samstillingarreglan á ekki við. 461
   (geymsluvörður) ver setItem fyrir fullum kvóta.
*/
(function () {
  'use strict';
  if (window.__bordVinnusvaedi471) return;
  window.__bordVinnusvaedi471 = true;

  var LYKILL = 'tb_rail_w';
  var MIN_SUL = 320;      // hægri súlan má ekki verða ólæsileg
  var MIN_MEGIN = 460;    // meginsúlan heldur alltaf lestrarbreidd
  var VINSTRI = 'minmax(280px,320px)';

  function lesBreidd() {
    try { var v = parseInt(localStorage.getItem(LYKILL), 10); return v > 0 ? v : 0; }
    catch (_) { return 0; }
  }
  function skrifaBreidd(v) {
    try { if (v) localStorage.setItem(LYKILL, String(v)); else localStorage.removeItem(LYKILL); }
    catch (_) { /* fullur kvóti — 461 reynir að rýma; breiddin lifir samt í lotunni */ }
  }

  var CSS = [
    /* ── Skrifsvæðin: hvítur grunnur, svartir stafir ───────────────────── */
    '.nt.dark textarea,.bm textarea,.bm input{background:#fff;color:#14120f;' +
      'border:1px solid #b9b1a0;box-shadow:inset 0 1px 2px rgba(0,0,0,.14)}',
    '.nt.dark textarea::placeholder,.bm textarea::placeholder,.bm input::placeholder{color:#6f685c}',
    /* Fókus heldur gullinu sem þemað notar annars staðar. */
    '.nt.dark textarea:focus,.bm textarea:focus,.bm input:focus{outline:none;' +
      'border-color:#c9a54a;box-shadow:inset 0 1px 2px rgba(0,0,0,.14),0 0 0 2px rgba(201,165,74,.35)}',

    /* ── Dragstikan ────────────────────────────────────────────────────── */
    '.rail.right{position:relative}',
    '.tb-grip{position:absolute;left:-13px;top:0;width:13px;height:100%;cursor:col-resize;' +
      'display:none;align-items:center;justify-content:center;z-index:6;' +
      'touch-action:none;-webkit-user-select:none;user-select:none}',
    '.tb-grip::before{content:"";width:3px;height:46px;border-radius:2px;' +
      'background:#b9b1a0;opacity:.45;transition:opacity .12s,background .12s}',
    '.tb-grip:hover::before,.tb-grip.dregur::before{opacity:1;background:#c9a54a;height:76px}',
    /* Birtist aðeins þegar útlitið er raunverulega grind — í dálka-ham er
       ekkert til að draga og stikan væri bara aðskotahlutur. */
    '.layout.grind .tb-grip{display:flex}',
    '.layout.dregur{cursor:col-resize}',
    '.layout.dregur *{-webkit-user-select:none;user-select:none}'
  ].join('');

  function rot() {
    var v = document.getElementById('view-bord');
    return v && v.shadowRoot ? v.shadowRoot : null;
  }

  function stillStil(sr) {
    if (sr.getElementById('tb-vinnusvaedi-css')) return;
    var st = document.createElement('style');
    st.id = 'tb-vinnusvaedi-css';
    st.textContent = CSS;
    sr.appendChild(st);
  }

  /* Setur grindina eftir geymdri breidd. Snertir DOM AÐEINS þegar gildið er
     raunverulega annað — annars vekur hver umferð næstu vakt (sjá regluna um
     tvo pappa um sama hnútinn í CLAUDE.md). */
  function stillGrind(layout, breidd) {
    var erGrind = getComputedStyle(layout).display === 'grid';
    if (layout.classList.contains('grind') !== erGrind) layout.classList.toggle('grind', erGrind);
    var vill = '';
    if (erGrind && breidd) {
      var hefurVinstri = !layout.classList.contains('nol');
      vill = (hefurVinstri ? VINSTRI + ' ' : '') + 'minmax(0,1fr) ' + breidd + 'px';
    }
    if (layout.style.gridTemplateColumns !== vill) layout.style.gridTemplateColumns = vill;
  }

  function tengjaGrip(layout, rail) {
    var grip = rail.querySelector(':scope > .tb-grip');
    if (!grip) {
      grip = document.createElement('div');
      grip.className = 'tb-grip';
      grip.setAttribute('role', 'separator');
      grip.setAttribute('aria-orientation', 'vertical');
      grip.title = 'Dragðu til að breyta breidd — tvísmelltu til að núllstilla';
      rail.insertBefore(grip, rail.firstChild);
    }
    if (grip.__tengt) return;
    grip.__tengt = true;

    var virkur = null;

    grip.addEventListener('pointerdown', function (e) {
      if (getComputedStyle(layout).display !== 'grid') return;
      e.preventDefault();
      virkur = e.pointerId;
      grip.setPointerCapture(e.pointerId);
      grip.classList.add('dregur');
      layout.classList.add('dregur');
    });

    grip.addEventListener('pointermove', function (e) {
      if (virkur !== e.pointerId) return;
      var r = layout.getBoundingClientRect();
      var haemst = Math.max(MIN_SUL, r.width - MIN_MEGIN);
      var b = Math.round(Math.min(haemst, Math.max(MIN_SUL, r.right - e.clientX)));
      stillGrind(layout, b);
    });

    function sleppa(e) {
      if (virkur !== e.pointerId) return;
      virkur = null;
      grip.classList.remove('dregur');
      layout.classList.remove('dregur');
      var rr = rail.getBoundingClientRect();
      skrifaBreidd(Math.round(rr.width));
    }
    grip.addEventListener('pointerup', sleppa);
    grip.addEventListener('pointercancel', sleppa);

    /* Tvísmellur skilar sjálfgefnu breiddinni úr 368. */
    grip.addEventListener('dblclick', function (e) {
      e.preventDefault();
      skrifaBreidd(0);
      stillGrind(layout, 0);
    });
  }

  function umferd() {
    var sr = rot();
    if (!sr) return;
    stillStil(sr);
    var layout = sr.querySelector('.layout');
    if (!layout) return;
    var rail = layout.querySelector(':scope > .rail.right');
    if (!rail) { stillGrind(layout, 0); return; }
    tengjaGrip(layout, rail);
    stillGrind(layout, lesBreidd());
  }

  /* Borðið endurteiknar `.layout` í heilu lagi, svo stikan og innlínugrindin
     hverfa með. Vaktin nær því aftur; umferd() er ódýr í kyrrstöðu (hún
     snertir ekkert þegar allt er þegar rétt), svo hún má keyra oft. */
  var bid = 0;
  function vekja() {
    if (bid) return;
    bid = requestAnimationFrame(function () { bid = 0; umferd(); });
  }

  function raesa() {
    var v = document.getElementById('view-bord');
    if (!v || !v.shadowRoot) return false;
    umferd();
    new MutationObserver(vekja).observe(v.shadowRoot, { childList: true, subtree: true });
    addEventListener('resize', vekja);
    return true;
  }

  if (!raesa()) {
    /* Skuggarótin verður til þegar borðið er fyrst teiknað. Púlsinn hættir
       um leið og hann nær henni — engin eilíf lykkja. */
    var reynt = 0;
    var tif = setInterval(function () {
      if (raesa() || ++reynt > 120) clearInterval(tif);
    }, 500);
  }
})();
