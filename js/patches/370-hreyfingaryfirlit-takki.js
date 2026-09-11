/* 370 — 📄 HREYFINGARYFIRLIT-TAKKI Á FYRIRTÆKJAPRÓFÍL (11.09.2026)
 *
 * Einn takki í aðgerðaröð prófílsins (features.js teiknar hana sem div[data-co-id]
 * í #companies-main) sem opnar /hreyfingaryfirlit.html?kt=<kennitala> í nýjum flipa.
 *
 * Yfirlitið er KENNITÖLUBUNDIÐ (Agnar 11.09.2026: „Hafa þær bara kennitölubundnar,
 * ekki niðurnjörfað á locations heimilisföng") — allir staðir sömu kennitölu fá sama
 * yfirlit. Kennitalan er lesin úr Companies.list við SMELL, ekki við innsetningu, svo
 * nýleg leiðrétting á kennitölu gildir strax.
 *
 * Kostnaður (Netlify): takkinn sækir EKKERT. Síðan kallar /api/hreyfingaryfirlit einu
 * sinni við opnun og aftur aðeins við „Sækja". Vöktunin hlustar aðeins á BEINA afkomendur
 * #companies-main (childList, ekki subtree) og skrifar ekkert ef takkinn er þegar kominn
 * — engin endurteikni-lykkja (sbr. 295 og frontend-profiler).
 */
(() => {
  if (window.__hreyfingaryfirlitTakki) return;
  window.__hreyfingaryfirlitTakki = true;

  const KLASI = '_hy-takki';
  const ktHreint = v => String(v == null ? '' : v).replace(/\D/g, '');

  function fyrirtaeki(coId) {
    const L = (window.Companies && Array.isArray(window.Companies.list)) ? window.Companies.list : [];
    return L.find(c => String(c.id) === String(coId)) || null;
  }

  function opna(coId) {
    const co = fyrirtaeki(coId);
    const kt = co ? ktHreint(co.kennitala) : '';
    if (kt.length !== 10 || kt === '9999999999') {
      if (window.Toast && Toast.show) Toast.show('⚠ Kennitala vantar á prófílinn — ekkert hreyfingaryfirlit');
      return;
    }
    window.open('/hreyfingaryfirlit.html?kt=' + kt.slice(0, 6) + '-' + kt.slice(6), '_blank', 'noopener');
  }

  function setja() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const rod = main.querySelector('div[data-co-id]:not(._cat-section)');
    if (!rod) return;
    const coId = rod.getAttribute('data-co-id');
    if (!/^\d+$/.test(String(coId || ''))) return;
    const til = rod.querySelector('.' + KLASI);
    if (til && til.dataset.co === coId) return;            // þegar komið — engin DOM-breyting
    if (til) til.remove();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm ' + KLASI;
    b.dataset.co = coId;
    b.textContent = '📄 Hreyfingaryfirlit';
    b.title = 'Viðskiptahreyfingar kennitölunnar (allir staðir) — opnast í nýjum flipa';
    b.addEventListener('click', () => opna(coId));
    rod.appendChild(b);
  }

  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) return false;
    new MutationObserver(setja).observe(main, { childList: true });
    setja();
    return true;
  }
  if (!vakta()) document.addEventListener('DOMContentLoaded', vakta, { once: true });
  // Vörður (sama og 113/199, 11.09.2026): #companies-main-hnútnum er skipt út eftir ræsingu, svo
  // MutationObserver-inn hér að ofan heyrir þá ekki neitt og takkinn birtist aldrei. Tifarinn kostar
  // eitt querySelector og setja() skrifar ekkert þegar takkinn er þegar á réttu félagi.
  setInterval(() => {
    const v = document.getElementById('view-companies');
    if (v && !v.classList.contains('active')) return;
    setja();
  }, 1200);

  window.HreyfingaryfirlitTakki = { opna, setja };
})();
