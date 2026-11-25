/* === ÞJÓNUSTUBORÐ · SNERTIFLETIR Á SÍMA (25.11.2026) =========================================
 *
 * Agnar 25.11.2026: „Ju matt profa þad" — eftir símayfirferðina, þar sem borðið mældist með flesta
 * of litla snertifleti af öllum síðum.
 *
 * MÆLT LIFANDI (tools/simasopur.cjs + eigin talning í skuggarótinni, 390 px, viewmode=mobile):
 * 332 smellanlegir hlutir undir 36 px í 66 hópum. Þeir verstu: `.fela` 13 px, `.chkbox`/`.chkx`
 * 15 px, `.fela.adg` 18 px, `.btn.iv.sm` 22 px.
 *
 * REIKNINGURINN SEM RÆÐUR AÐFERÐINNI. Borðið er teiknað gegnum vistaðan síðuzoom 0,70 (patch 333).
 * Hver tala í CSS birtist því margfölduð með 0,7: takki þarf að vera 51 px í CSS til að verða
 * 36 px á skjánum. Það er hærra en heil röð á borðinu og myndi eyðileggja þéttleikann sem Agnar
 * valdi sér. Þess vegna er EKKI hróflað við stærðum hlutanna hér — í staðinn fær hver takki
 * ÓSÝNILEGT snertisvæði (::after) sem teygir sig 9 px upp og niður fyrir hann. Útlitið er stafrétt
 * það sama; aðeins svæðið sem tekur við fingrinum stækkar.
 *
 * ÞAÐ SEM ER VILJANDI UNDANSKILIÐ: `.chkx` (✕ eyðir gátlistalínu), `.eyda` (🗑 Eyða) og allt með
 * data-t5 sem inniheldur „eyd". Stærra snertisvæði á eyðitakka er ekki umbót heldur ný hætta —
 * nágrannasvæðin mega skarast, en ekki ofan í aðgerð sem eyðir gögnum.
 *
 * Virkar aðeins í símaham (data-viewmode="mobile" → data-t5snerti á #view-bord). Tölvuútlitið er
 * ósnert, og án merkisins er borðið nákvæmlega eins og áður.
 * ============================================================================================ */
(() => {
  if (window.__t5SnertiSimi) return;
  window.__t5SnertiSimi = true;

  const STIL_ID = 't5-snerti-simi';
  const MERKI = 'data-t5snerti';

  // Takkar og tenglar sem mega fá stækkað snertisvæði. Enginn þeirra eyðir gögnum.
  const TAKKAR = [
    '.fela', '.btn', '.flipi', '.dlink', '.dplus', '.lpick', '.clink', '.vs-tog', '.vs-t',
    '.ph-r', '.ph-h', '.yr-lnk', '.mk-m', '.chkstj', '.chkbox', '.ovcompany', '.lk', '.yr-lk',
    '.yr-go', '.yr-fm', '.yf-keyra', '.job', '.ek-lk', '.yr-rf', '.yr-cseg', '.yr-ach'
  ].join(',');
  // Þrjár varnir á sama stað: eyðitakkar, ✕ og allt sem dispatcherinn kallar „eyd…".
  const VORN = ':not(.eyda):not(.chkx):not([data-t5*="eyd"]):not([title*="Eyð"])';
  const VAL = ':is(' + TAKKAR + ')' + VORN;
  const H = ':host([' + MERKI + '="simi"]) ';

  const CSS = [
    H + VAL + '{position:relative}',
    // Ósýnilegt snertisvæði: +9 px upp og niður, +4 px til hliðanna, aldrei undir 38 px i CSS
    // (= 26,6 px á skjá við zoom 0,70). Pointer-events erfast, svo smellurinn lendir á takkanum.
    H + VAL + '::after{content:"";position:absolute;left:-4px;right:-4px;top:50%;' +
      'transform:translateY(-50%);height:calc(100% + 18px);min-height:38px;border-radius:8px}',
    // Reitir fá raunverulega hæð — þeir hafa pláss í línunni og engan nágranna að skarast við.
    H + 'input.chkt,' + H + 'input.chktitill{min-height:34px}',
    // Gátreitur sem er 11 px: hann MÁ stækka, það er ekkert annað á þeim stað.
    H + 'input.ovcheck{width:20px;height:20px}'
  ].join('\n');

  function host() { return document.getElementById('view-bord'); }
  function rot() { const v = host(); return v && v.shadowRoot ? v.shadowRoot : null; }

  function stillStil(sr) {
    if (!sr || sr.getElementById(STIL_ID)) return;
    const st = document.createElement('style');
    st.id = STIL_ID;
    st.textContent = CSS;
    sr.appendChild(st);
  }

  function erSimi() {
    try { return document.documentElement.getAttribute('data-viewmode') === 'mobile'; } catch (_) { return false; }
  }

  // Snertir DOM AÐEINS þegar gildið er raunverulega annað (sjá regluna um tvo pappa í CLAUDE.md).
  function umferd() {
    const v = host(); if (!v) return;
    stillStil(v.shadowRoot);
    const vill = erSimi() ? 'simi' : null;
    if (vill && v.getAttribute(MERKI) !== vill) v.setAttribute(MERKI, vill);
    else if (!vill && v.hasAttribute(MERKI)) v.removeAttribute(MERKI);
  }

  function raesa() {
    const v = host();
    if (!v || !v.shadowRoot) return false;
    umferd();
    // 368 endurteiknar skuggarótina; stíllinn fer með og er settur aftur.
    new MutationObserver(() => umferd()).observe(v.shadowRoot, { childList: true });
    document.addEventListener('slokk-viewmode', umferd);
    new MutationObserver(umferd).observe(document.documentElement, { attributes: true, attributeFilter: ['data-viewmode'] });
    return true;
  }

  if (!raesa()) {
    let reynt = 0;
    const tif = setInterval(() => { if (raesa() || ++reynt > 120) clearInterval(tif); }, 500);
  }
  console.log('[patch-530] Snertifletir borðsins á síma');
})();
