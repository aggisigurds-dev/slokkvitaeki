/* === ⛔ STOPPMERKI Á LISTUM — GJALDÞROTA / AFSKRÁÐ FÉLAG (380, 2026-09-18) ===
 *
 * Agnar 18.09.2026 (K Apartments ehf, úrskurðað gjaldþrota 29.05.2024, afskráð 25.02.2025 — stóð
 * samt á Ársskoðunar-listanum án nokkurs merkis): „ef það sést á prófílnum að fyrirtæki er
 * gjaldþrota/lokað þá máttu setja Stop merkið þarna".
 *
 * Prófíl-bannerinn sýnir stöðuna úr fyrirtækjaskrá (/api/kt-lookup) en hún bjó aðeins í vafranum.
 * Nú geymir `luna-bridge/skra-stada.js` hana per kennitölu í töflunni `fyrirtaekjaskra_stada`
 * (opinberar upplýsingar, anon má lesa). Þessi skrá les töfluna EINU SINNI per lotu og setur ⛔
 * fremst í nafnið á röðum Ársskoðunar (borð- og símasýn) og í Fyrirtæki · yfirferð.
 *
 * HÖNNUN: snertir EKKI 153 (varin leið) — merkir raðirnar eftir á. Hver röð er merkt einu sinni
 * (data-skra-stop); vaktin er rAF-þrottluð og gerir ekkert þegar engin ómerkt röð er til, svo hún
 * bætir engu við DOM-hreyfingu á kyrrstæðri síðu. Aðeins birting: engu er breytt í gögnum og
 * fyrirtækið er hvorki falið né tekið úr þjónustu — það er ákvörðun Agnars.
 */
(() => {
  if (window.__skraStopInstalled) return;
  window.__skraStopInstalled = true;

  const tolur = (s) => String(s || '').replace(/\D/g, '');
  let STADA = null;          // Map kt → { stada:[…], nafn }
  let saekir = null;

  async function saekja() {
    if (STADA) return STADA;
    if (saekir) return saekir;
    saekir = (async () => {
      const sb = window.DB && DB.sb;
      if (!sb) { saekir = null; return null; }
      try {
        const r = await sb.from('fyrirtaekjaskra_stada').select('kennitala,nafn,stada').neq('stada', '{}').limit(1000);
        if (r.error) throw r.error;
        STADA = new Map((r.data || []).filter((x) => Array.isArray(x.stada) && x.stada.length).map((x) => [tolur(x.kennitala), x]));
      } catch (e) { console.warn('[380] fyrirtaekjaskra_stada náðist ekki:', e && e.message || e); STADA = new Map(); }
      return STADA;
    })();
    return saekir;
  }

  function ktFyrir(coId) {
    const l = (window.Companies && Companies.list) || [];
    const c = l.find((x) => String(x.id) === String(coId));
    return c ? tolur(c.kennitala) : '';
  }

  function merki(x) {
    const s = document.createElement('span');
    s.className = '_skra-stop';
    s.textContent = '⛔';
    s.title = 'Fyrirtækjaskrá: ' + x.stada.join(' · ') + '\nFélagið á ekki að fá reikning — skoðaðu prófílinn.';
    s.style.cssText = 'margin-right:5px;cursor:help;font-size:1.05em';
    return s;
  }

  function merkja() {
    if (!STADA || !STADA.size) return;
    const rot = document.querySelectorAll('#view-arsskodun [data-co-id]:not([data-skra-stop]), #view-fyrirtaeki-yfirferd a.fyr-prof:not([data-skra-stop])');
    if (!rot.length) return;
    rot.forEach((el) => {
      el.setAttribute('data-skra-stop', '0');
      let coId = el.getAttribute('data-co-id');
      let nafnEl = null;
      if (el.matches('a.fyr-prof')) { coId = (el.getAttribute('href') || '').replace(/^#company\//, ''); nafnEl = el; }
      else nafnEl = el.querySelector('._arsm-nm, ._ars-namecell ._co');
      if (!coId || !nafnEl) return;                       // t.d. _ars-mailcol ber líka data-co-id — sleppt
      const x = STADA.get(ktFyrir(coId));
      if (!x) return;
      if (nafnEl.querySelector('._skra-stop')) return;
      nafnEl.insertBefore(merki(x), nafnEl.firstChild);
      el.setAttribute('data-skra-stop', '1');
    });
  }

  let bidur = false;
  function tif() {
    if (bidur) return; bidur = true;
    const keyra = () => { bidur = false; saekja().then(merkja); };
    // falinn flipi keyrir ekki rAF — þá dugar tímamælir (sjá minnisnótu um 252-mo-throttle)
    if (document.visibilityState === 'visible' && window.requestAnimationFrame) requestAnimationFrame(keyra); else setTimeout(keyra, 250);
  }

  function byrja() {
    ['view-arsskodun', 'view-fyrirtaeki-yfirferd'].forEach((id) => {
      const v = document.getElementById(id);
      if (v && !v.__skraStopMO) { v.__skraStopMO = new MutationObserver(tif); v.__skraStopMO.observe(v, { childList: true, subtree: true }); }
    });
    tif();
  }
  // sýnirnar verða til seint — reynum nokkrum sinnum, svo þegar skipt er um sýn
  let tilraunir = 0;
  const t = setInterval(() => { byrja(); if (++tilraunir > 40) clearInterval(t); }, 1500);
  window.addEventListener('hashchange', () => setTimeout(byrja, 400));

  window.SkraStop = { saekja, merkja, stada: () => STADA };
  console.log('[patch-380] ⛔ stoppmerki fyrir gjaldþrota/afskráð félög installed');
})();
/* === END STOPPMERKI === */
