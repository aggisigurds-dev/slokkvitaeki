/* === HRAÐAMÆLIR (387) — raunverulegir tímar úr SÝNILEGUM flipa, skráðir sjálfkrafa =====================================
 *
 * Agnar 21.09.2026: „við erum svo mikið inn og út af þessum síðum þegar við erum að gera skýrslurnar svo þetta tefur mikið."
 * Claude getur aðeins mælt í FÖLDUM flipa — þar hægir vafrinn á öllum tímamælum niður í einn á sekúndu og skráir ekki löng
 * verk, svo tímamælingar þaðan eru rangar (talningar á netköllum eru réttar). Þessi mælir situr í alvöru flipanum á
 * vinnutölvunni og skráir, við HVER síðuskipti (hashchange), næstu 5 sekúndur:
 *     long_ms / long_n / lengsta_ms   löng verk (> 50 ms) sem frysta skjáinn — það sem FINNST sem hik
 *     rest_n / rest_sidast_ms         fjöldi REST-kalla og hvenær það síðasta lauk
 *     dom                             fjöldi hnúta á síðunni
 * Auðkenni eru strípuð úr sýnarheitinu (#company/532 → company/*). Engin persónugögn, enginn texti af síðunni.
 *
 * Kostnaður: einn PerformanceObserver og ein lítil skrift (keepalive) á ~10 síðuskipta fresti eða þegar flipinn lokast.
 * Skriftin fer á töfluna `hradamaelingar`, sem js/rest-samnyting.js telur EKKI sem „skrift notanda" (annars myndi mælirinn
 * sjálfur kveikja endursókn á Ársskoðun). Mælir ALDREI í földum flipa. Slökkva: localStorage.setItem('hradamaelir_off','1').
 * Lesa: window.Hradamaelir.sidustu() — eða taflan sjálf.
 * ===================================================================================================================== */
(() => {
  if (window.__hradamaelir387) return;
  window.__hradamaelir387 = true;
  try { if (localStorage.getItem('hradamaelir_off') === '1') return; } catch (_) {}
  if (!('PerformanceObserver' in window)) return;

  const GLUGGI_MS = 5000, SENDA_VID = 10, HAMARK_I_MINNI = 60;
  const long = [];                 // { t, d } — löng verk frá upphafi, klippt reglulega
  const bidur = [];                // mælingar sem á eftir að senda
  const allar = [];                // síðustu mælingar (til aflestrar í console)
  let utgafa = '';

  try { new PerformanceObserver(l => l.getEntries().forEach(e => { long.push({ t: e.startTime, d: e.duration }); if (long.length > 400) long.splice(0, 200); })).observe({ entryTypes: ['longtask'] }); }
  catch (_) { return; }            // vafrinn styður ekki longtask → mælirinn gerir ekkert

  try { fetch('/build.json', { cache: 'no-store' }).then(r => r.json()).then(j => { utgafa = String((j && j.commit) || ''); }).catch(() => {}); } catch (_) {}

  const synAf = h => String(h || '').replace(/^#/, '').replace(/\/[^/]+/g, '/*').slice(0, 40) || '(forsíða)';
  const taeki = () => { try { return (screen.width + 'x' + screen.height) + (/(Android|iPhone|Mobile)/i.test(navigator.userAgent) ? ' sími' : ' tölva'); } catch (_) { return ''; } };

  let sidastaSyn = synAf(location.hash), timari = null;
  function byrja() {
    const fra = sidastaSyn, til = synAf(location.hash);
    sidastaSyn = til;
    if (document.hidden) return;                       // falinn flipi mælir rangt — sleppa alveg
    const t0 = performance.now();
    clearTimeout(timari);                              // hratt flakk: aðeins síðasta lending er mæld
    timari = setTimeout(() => {
      if (document.hidden) return;                     // fór í bakgrunn á meðan → ómarktækt
      try {
        const l = long.filter(x => x.t >= t0 - 5 && x.t <= t0 + GLUGGI_MS);
        const rest = performance.getEntriesByType('resource').filter(x => x.startTime >= t0 && x.name.indexOf('/rest/v1/') > -1);
        const m = {
          syn: til, ur_syn: fra,
          long_ms: Math.round(l.reduce((s, x) => s + x.d, 0)), long_n: l.length,
          lengsta_ms: Math.round(l.reduce((mx, x) => Math.max(mx, x.d), 0)),
          rest_n: rest.length,
          rest_sidast_ms: rest.length ? Math.round(Math.max.apply(null, rest.map(x => x.responseEnd)) - t0) : 0,
          dom: document.getElementsByTagName('*').length,
          utgafa, taeki: taeki(),
        };
        allar.push(Object.assign({ kl: new Date().toTimeString().slice(0, 8) }, m)); if (allar.length > HAMARK_I_MINNI) allar.shift();
        bidur.push(m);
        if (bidur.length >= SENDA_VID) senda();
      } catch (_) {}
    }, GLUGGI_MS);
  }

  function senda() {
    if (!bidur.length || !window.SUPABASE_URL || !window.SUPABASE_KEY) return;
    const lota = bidur.splice(0, bidur.length);
    try {
      fetch(window.SUPABASE_URL + '/rest/v1/hradamaelingar', {
        method: 'POST', keepalive: true,
        headers: { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + window.SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(lota),
      }).catch(() => {});                              // mælingar mega tapast — þær eru ekki gögn notandans
    } catch (_) {}
  }

  window.addEventListener('hashchange', byrja);
  window.addEventListener('pagehide', senda);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') senda(); });

  window.Hradamaelir = { sidustu: () => allar.slice(), senda };
})();
