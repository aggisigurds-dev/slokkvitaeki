/* === 521 — GÁTT: opna hvaða færslu sem er BEINT, ofan á síðunni sem er opin (Agnar 18.11.2026) ===
 *
 * Orð Agnars um Afgreiðsluna: „Þetta er bara alls ekki vinnuborð“ · „Þetta á að vera portal, sendir mig þá þangað sem ég
 * get gert eitthvað beint“ · „Ég vil helst geta gert allt beint þaðan af borðinu, að ég þurfi ekki að ýta á
 * hliðarstikuna og leita“.
 *
 * Appið á þegar föll sem opna hverja færslu — þau voru bara hvert á sínum stað og engin leið að kalla á þau utan frá:
 *
 *   Gatt.opna('mal', id)         → Bord368.opnaMal(id)                 málið á Þjónustuborðinu (368)
 *   Gatt.opna('felag', id)       → _openCompanySafe(id) / #company/id  prófíll félagsins (mapfix, 235, 357)
 *   Gatt.opna('sala', solurId)   → OpnaSolu.opna(solurId)              sölu-ritillinn/sölu-sýnin OFAN Á síðunni (371 → 142)
 *   Gatt.opna('krafa', solurId)  → KrofuVinnugluggi.opnaSolu(solurId)  kröfu-vinnuglugginn (369)
 *   Gatt.opna('gleymt', fId)     → KrofuVinnugluggi.opnaGleymt(fId)    „Gleymst að rukka?“ fyrir félagið (369)
 *   Gatt.opna('arsskodun', fId)  → Arsskodun.openDetail(fId)           ársskoðunargluggi félagsins (153)
 *   Gatt.opna('verkbeidni', id)  → Verkspjald.opna(id)                 verkspjaldið (430)
 *
 * TVÆR LEIÐIR INN:
 *   1. Í appinu (Þjónustuborðið 511, símasíðan 515): takkinn kallar á Gatt.opna(teg, id) — engin flakk, engin hliðarstika;
 *      glugginn opnast ofan á borðinu og borðið er undir þegar honum er lokað.
 *   2. Úr /afgreidsla.html (sér síða): slóðin /?opna=<teg>:<id>#bord. Lesin hér við ræsingu, beðið eftir að appið og
 *      viðkomandi fall sé komið (mest 10 s), færslan opnuð og ?opna= tekið úr slóðinni. /?mal=N#bord (492e) og
 *      #company/N (235/357) virka áfram óbreytt.
 *
 * ÖRYGGI: opnun SKRIFAR EKKERT — þetta kallar aðeins á opnunarföll sem til eru. Tegundin verður að vera á listanum og
 * auðkennið jákvæð heiltala; allt annað er hunsað þegjandi. Finnist fallið ekki innan tímamarka: Toast, ekkert kast. */
(() => {
  if (window.Gatt) return;
  const TIMI_MS = 10000;
  const heil = (x) => { const n = Number(x); return Number.isInteger(n) && n > 0 ? n : 0; };
  const bida = (skilyrdi, ms = TIMI_MS) => new Promise((res) => {
    const t0 = Date.now();
    const reyna = () => { let v = null; try { v = skilyrdi(); } catch (_) {} if (v) return res(v); if (Date.now() - t0 > ms) return res(null); setTimeout(reyna, 200); };
    reyna();
  });
  const segja = (texti) => { try { if (window.Toast && Toast.show) Toast.show(texti, 'warn'); else console.warn('[521] ' + texti); } catch (_) {} };
  const aBordi = () => { try { return !!(window.App && (App.currentView === 'bord' || /^#?bord$/.test(location.hash || ''))); } catch (_) { return false; } };

  const LEIDIR = {
    async mal(id) {
      const B = await bida(() => window.App && App.switchView && window.Bord368 && Bord368.opnaMal && Bord368);
      if (!B) return false;
      if (!aBordi()) { try { App.switchView('bord'); } catch (_) {} await new Promise((r) => setTimeout(r, 400)); }
      B.opnaMal(id);
      return true;
    },
    async felag(id) {
      const F = await bida(() => window._openCompanySafe || (window.App && App.switchView && true));
      if (!F) return false;
      if (window._openCompanySafe) window._openCompanySafe(id); else location.hash = '#company/' + id;
      return true;
    },
    async sala(id) {
      const O = await bida(() => window.OpnaSolu && OpnaSolu.opna && OpnaSolu);
      if (!O) return false;
      const r = await O.opna(id);   // kastar aldrei; segir sjálft frá í Toast ef salan finnst ekki
      return !!(r && r.ok !== false);
    },
    async krafa(id) {
      const K = await bida(() => window.KrofuVinnugluggi && KrofuVinnugluggi.opnaSolu && KrofuVinnugluggi);
      if (!K) return false;
      K.opnaSolu(id);
      return true;
    },
    async gleymt(id) {
      const K = await bida(() => window.KrofuVinnugluggi && KrofuVinnugluggi.opnaGleymt && KrofuVinnugluggi);
      if (!K) return false;
      K.opnaGleymt(id);
      return true;
    },
    async arsskodun(id) {
      const A = await bida(() => window.Arsskodun && Arsskodun.openDetail && Arsskodun);
      if (!A) return false;
      A.openDetail(id);
      return true;
    },
    async verkbeidni(id) {
      const V = await bida(() => window.Verkspjald && Verkspjald.opna && Verkspjald);
      if (!V) return false;
      V.opna(id);
      return true;
    },
  };
  const HEITI = { mal: 'málið', felag: 'félagið', sala: 'reikninginn', krafa: 'kröfuna', gleymt: 'yfirlitið', arsskodun: 'ársskoðunina', verkbeidni: 'verkbeiðnina' };

  async function opna(teg, id) {
    const t = String(teg || ''), n = heil(id);
    if (!Object.prototype.hasOwnProperty.call(LEIDIR, t) || !n) return false;
    let ok = false;
    try { ok = await LEIDIR[t](n); } catch (e) { console.warn('[521] opnun brást', t, n, e); ok = false; }
    if (!ok) segja('Náði ekki að opna ' + (HEITI[t] || 'færsluna') + ' — reyndu aftur eftir augnablik');
    return ok;
  }
  // Slóðin sem /afgreidsla.html og þjónninn (_afgreidsla-dyr.cjs, slodFyrir) nota — ein skilgreining á sniðinu.
  const slod = (teg, id) => (teg === 'mal' ? '/?mal=' + heil(id) + '#bord' : teg === 'felag' ? '/#company/' + heil(id) : '/?opna=' + teg + ':' + heil(id) + '#bord');

  // Takki eða tengill hvar sem er í appinu: data-gatt="<teg>:<id>" → opnast hér, án þess að síðan endurhlaðist.
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-gatt]') : null;
    if (!el) return;
    const m = /^([a-z]+):(\d+)$/.exec(el.getAttribute('data-gatt') || '');
    if (!m || !Object.prototype.hasOwnProperty.call(LEIDIR, m[1])) return;
    e.preventDefault(); e.stopPropagation();
    opna(m[1], m[2]);
  }, true);

  // Kaldræsing: /?opna=<teg>:<id>
  function urSlod() {
    let v = '';
    try { v = new URLSearchParams(location.search).get('opna') || ''; } catch (_) {}
    const m = /^([a-z]+):(\d+)$/.exec(v);
    if (!m) return;
    try { const u = new URL(location.href); u.searchParams.delete('opna'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (_) {}
    opna(m[1], m[2]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(urSlod, 300)); else setTimeout(urSlod, 300);

  window.Gatt = { opna, slod, tegundir: Object.keys(LEIDIR), version: '521a' };
  console.log('[521a] Gátt — opnar mál, félag, sölu, kröfu, ársskoðun og verkbeiðni beint');
})();
