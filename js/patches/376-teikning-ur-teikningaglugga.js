/* === ÚTTEKTARTEIKNING ÚR TEIKNINGAGLUGGANUM (376) =========================
 *
 * Agnar 16.09.2026: „Væri fínt ef þessi takki væri líka inn á teikningar-
 * glugganum svo maður gæti fært inn teikningar til að setja slökkvitækin á í
 * úttektum. Kannski eitthvað hybrid smíði við TurboPaint."
 *
 * STAÐAN SEM VAR: tvö aðskilin borð.
 *   • „📐 Teikningar" (342) er TurboPaint á kjarni.vercel.app — iframe, þar sem
 *     teikningar eru sóttar og unnar. Þar eru ENGIN slökkvitæki.
 *   • Úttektarteikningin er okkar eigin gluggi (FloorPlan í scanner.js): þar eru
 *     tækin í spjaldi til hliðar, „📐 Sækja teikningu" (374) nær í aðaluppdrátt
 *     sveitarfélagsins og merkingarnar vistast á þjóninn (375, teikning_bord).
 *   Eina leiðin þangað var í gegnum fyrirtækjaprófíl → „Teikning".
 *
 * ÞESSI PATCH setur stiku efst í Teikningar-gluggann: veldu stað og opnaðu
 * úttektarteikninguna hans beint. Þar með er „Sækja teikningu" komið inn í
 * teikningagluggann — sama flæði og Agnar bað um, án þess að tvítaka neitt.
 *
 * Ekkert er sótt eða vistað hér; þetta er aðeins leiðin á milli.
 * ========================================================================== */
(() => {
  if (window.__teiknBruSett) return;
  window.__teiknBruSett = true;

  const VIEW_ID = 'view-turbopaint';
  const BAR_ID = '_teikn-bru';

  function stilar() {
    if (document.getElementById('_teikn-bru-css')) return;
    const s = document.createElement('style');
    s.id = '_teikn-bru-css';
    s.textContent =
      '#' + BAR_ID + '{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;' +
        'background:#1a1d2e;border-bottom:1px solid rgba(255,255,255,.08);color:#e7e5e4;' +
        'font:12.5px/1.3 system-ui,sans-serif}' +
      '#' + BAR_ID + ' input{flex:1 1 260px;min-width:180px;max-width:420px;padding:6px 10px;border-radius:8px;' +
        'border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;font:inherit}' +
      '#' + BAR_ID + ' input::placeholder{color:rgba(255,255,255,.45)}' +
      '#' + BAR_ID + ' button{padding:6px 12px;border-radius:8px;border:1px solid rgba(253,186,116,.45);' +
        'background:rgba(253,186,116,.16);color:#fdba74;font:600 12.5px system-ui,sans-serif;cursor:pointer}' +
      '#' + BAR_ID + ' button:hover{background:rgba(253,186,116,.26);color:#fff}' +
      '#' + BAR_ID + ' .teikn-bru-skyring{color:rgba(255,255,255,.45)}';
    document.head.appendChild(s);
  }

  function finnaStad(texti) {
    const t = String(texti || '').trim().toLowerCase();
    if (!t || !window.Companies || !Array.isArray(Companies.list)) return null;
    // Nákvæmt nafn fyrst (listinn í datalist skilar því), svo byrjun, svo innihald.
    return Companies.list.find((c) => String(c.nafn || '').toLowerCase() === t)
      || Companies.list.find((c) => String(c.nafn || '').toLowerCase().indexOf(t) === 0)
      || Companies.list.find((c) => String(c.nafn || '').toLowerCase().indexOf(t) >= 0)
      || null;
  }

  function opna(inp) {
    const c = finnaStad(inp.value);
    if (!c) {
      if (window.Toast) Toast.show('Fann ekki stað — veldu úr listanum');
      inp.focus();
      return;
    }
    if (typeof FloorPlan === 'undefined' || !FloorPlan.open) {
      if (window.Toast) Toast.show('Teikniglugginn er ekki tilbúinn — reyndu aftur');
      return;
    }
    // Sama kall og „Teikning"-takkinn á fyrirtækjaprófílnum (js/features.js).
    const taeki = ((window.DB && DB.cache && DB.cache.units) || []).filter((u) => u.client === c.nafn);
    FloorPlan.open(c.id, c.nafn, taeki);
  }

  function setjaStiku() {
    const v = document.getElementById(VIEW_ID);
    if (!v || document.getElementById(BAR_ID)) return;
    const wrap = v.querySelector('.tp-frame-wrap');
    if (!wrap) return;
    stilar();
    const bar = document.createElement('div');
    bar.id = BAR_ID;
    const listiId = '_teikn-bru-listi';
    bar.innerHTML =
      '<span>📐 Úttektarteikning:</span>' +
      '<input list="' + listiId + '" placeholder="Veldu stað — t.d. Pitstop þjónustan" ' +
        'title="Opnar úttektarteikningu staðarins: tækin í spjaldinu, „Sækja teikningu" nær í aðaluppdráttinn">' +
      '<datalist id="' + listiId + '"></datalist>' +
      '<button type="button">Opna</button>' +
      '<span class="teikn-bru-skyring">— þar eru slökkvitækin og „📐 Sækja teikningu"</span>';
    wrap.insertBefore(bar, wrap.firstChild);

    const inp = bar.querySelector('input');
    const dl = bar.querySelector('datalist');
    const fylla = () => {
      const listi = (window.Companies && Companies.list) || [];
      if (!listi.length || dl.childElementCount) return;
      dl.innerHTML = listi.slice(0, 1200).map((c) =>
        '<option value="' + String(c.nafn || '').replace(/"/g, '&quot;') + '"></option>').join('');
    };
    fylla();
    inp.addEventListener('focus', fylla);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); opna(inp); } });
    bar.querySelector('button').addEventListener('click', () => opna(inp));
  }

  // Glugginn verður til við fyrstu heimsókn (342 býr hann til), svo við fylgjumst með.
  const obs = new MutationObserver(() => setjaStiku());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setjaStiku();
  window.addEventListener('hashchange', () => setTimeout(setjaStiku, 200));
})();
