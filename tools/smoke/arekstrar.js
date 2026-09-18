/**
 * ÁREKSTRAR — hvaða pappar slást um sömu hnappana?
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Agnar (vandamál V7): „Takkar virka ekki eða gefa error — mjög random."
 *
 * „Random" er nánast alltaf merki um árekstur, ekki tilviljun. 380 pappaskrár
 * hlaðast í röð og hrófla allar við SAMA DOM-inu. Þrennt gerist þá:
 *
 *   1. TVEIR HLUSTARAR á sama hnapp. Báðir keyra. Annar vistar, hinn teiknar
 *      upp á nýtt og slítur þann fyrri í miðju kafi. Hvor vinnur ræðst af því
 *      hvor pappinn hlóðst á undan — sem breytist við hverja byggingu.
 *   2. SAMI HLUSTARI TVISVAR (pappi keyrður aftur, eða `render()` sem hengir
 *      án þess að fjarlægja). Eitt smell verður að tveimur vistunum.
 *   3. TVEIR PAPPAR SKRIFA SAMA HNÚTINN til skiptis — hnappurinn „hoppar" eða
 *      texti sem var settur hverfur andartaki síðar.
 *
 * Ekkert tól til í heiminum mælir þetta fyrir þetta kerfi — það var leitað
 * 17.09.2026 (knip/madge/ts-prune byggja einingarit; hér eru 334 einangraðar
 * IIFE-skrár með NÚLL import/export, svo þau sjá ekkert). Þess vegna er þetta
 * skrifað hér: `new Error().stack` inni í addEventListener nefnir pappann sem
 * hengdi hlustarann, og það er nákvæmlega sú rekjanleiki sem vantaði.
 *
 * NOTKUN — verður að hlaðast ÁÐUR en pappar keyra til að sjá allt:
 *     <script src="/tools/smoke/arekstrar.js"></script>   (efst, í prófun)
 * eða eftir á, sem nær þá aðeins því sem hengt er eftir hleðslu:
 *     Arekstrar.byrja(); … Arekstrar.skyrsla()
 *
 * Þetta er PRÓFUNARTÓL. Það á aldrei að fara í index.html í framleiðslu.
 */
(function () {
  'use strict';
  if (window.Arekstrar) return;

  const skra = [];                 // { el, tegund, undirskrift, uppruni }
  const skrifari = [];             // { el, eiginleiki, uppruni, gildi }
  let virkt = false;
  let raunAdd = null;

  /** Nafn pappans sem kallaði — úr staflanum, hreinsað. */
  function upprunaSkra() {
    try {
      const s = new Error().stack || '';
      const linur = s.split('\n').slice(2);
      for (const l of linur) {
        const m = /\/(js\/[^\s:)]+\.js)[^)]*?:(\d+):(\d+)/.exec(l);
        if (!m) continue;
        if (/arekstrar\.js|lygaprof\.js/.test(m[1])) continue;
        return m[1] + ':' + m[2];
      }
      // Þjappaður búntur: nefna hann og stöðuna — varpa-villu.cjs klárar verkið.
      for (const l of linur) {
        const m = /(_bundle-\d+\.[0-9a-f]+\.js:\d+:\d+)/.exec(l);
        if (m) return m[1];
      }
    } catch (_) {}
    return '?';
  }

  /** Stuttur, stöðugur lykill á hnút — svo sami hnútur þekkist milli kalla. */
  function hnutLykill(el) {
    if (el === document) return 'document';
    if (el === window) return 'window';
    if (!el || !el.tagName) return String(el);
    const bitar = [el.tagName.toLowerCase()];
    if (el.id) bitar.push('#' + el.id);
    if (el.dataset && el.dataset.act) bitar.push('[act=' + el.dataset.act + ']');
    if (el.dataset && el.dataset.t5) bitar.push('[t5=' + el.dataset.t5 + ']');
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (txt) bitar.push('„' + txt + '"');
    return bitar.join('');
  }

  function byrja() {
    if (virkt) return;
    virkt = true;

    raunAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (tegund, hlustari, valk) {
      try {
        if (/^(click|submit|change|input|keydown)$/.test(tegund)) {
          skra.push({
            el: this,
            lykill: hnutLykill(this),
            tegund,
            // Undirskrift fallsins greinir „sami hlustari tvisvar" frá
            // „tveir ólíkir hlustarar" — sem er allt annað vandamál.
            undirskrift: String(hlustari && hlustari.toString ? hlustari.toString() : hlustari).slice(0, 220),
            uppruni: upprunaSkra(),
          });
        }
      } catch (_) {}
      return raunAdd.call(this, tegund, hlustari, valk);
    };

    // Hnútar sem tveir aðilar skrifa til skiptis.
    try {
      const obs = new MutationObserver((ms) => {
        for (const m of ms) {
          if (m.type !== 'attributes' && m.type !== 'characterData') continue;
          const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (!el) continue;
          skrifari.push({ lykill: hnutLykill(el), eiginleiki: m.attributeName || 'texti', uppruni: upprunaSkra() });
        }
      });
      obs.observe(document.documentElement, {
        attributes: true, characterData: true, subtree: true,
        attributeFilter: ['style', 'class', 'disabled', 'hidden'],
      });
      window.__arekstrarObs = obs;
    } catch (_) {}

    console.log('[árekstrar] vakta — Arekstrar.skyrsla() þegar síðan er hlaðin');
  }

  function haetta() {
    if (raunAdd) EventTarget.prototype.addEventListener = raunAdd;
    try { window.__arekstrarObs && window.__arekstrarObs.disconnect(); } catch (_) {}
    virkt = false;
  }

  function skyrsla(valk) {
    valk = valk || {};
    const hopar = new Map();
    for (const h of skra) {
      const k = h.lykill + ' ⟨' + h.tegund + '⟩';
      if (!hopar.has(k)) hopar.set(k, []);
      hopar.get(k).push(h);
    }

    const tvitekid = [];          // sami hlustari hengdur oftar en einu sinni
    const margir = [];            // ólíkir hlustarar á sama hnút

    for (const [k, l] of hopar) {
      if (l.length < 2) continue;
      const eftirUndirskrift = new Map();
      l.forEach((h) => {
        if (!eftirUndirskrift.has(h.undirskrift)) eftirUndirskrift.set(h.undirskrift, []);
        eftirUndirskrift.get(h.undirskrift).push(h.uppruni);
      });
      for (const [, upprunar] of eftirUndirskrift) {
        if (upprunar.length > 1) tvitekid.push({ hnutur: k, sinnum: upprunar.length, uppruni: upprunar[0] });
      }
      if (eftirUndirskrift.size > 1) {
        margir.push({ hnutur: k, fjoldi: eftirUndirskrift.size, upprunar: [...new Set(l.map((h) => h.uppruni))] });
      }
    }

    // Hnútar sem fleiri en einn staður skrifar í.
    const skrifHopar = new Map();
    for (const s of skrifari) {
      const k = s.lykill;
      if (!skrifHopar.has(k)) skrifHopar.set(k, new Set());
      skrifHopar.get(k).add(s.uppruni);
    }
    const togstreita = [...skrifHopar.entries()]
      .filter(([, u]) => u.size > 1 && !u.has('?'))
      .map(([k, u]) => ({ hnutur: k, upprunar: [...u] }))
      .sort((a, b) => b.upprunar.length - a.upprunar.length);

    console.log('\n═══ ÁREKSTRAR ═══');
    console.log('hlustarar skráðir: ' + skra.length + ' · ólíkir hnútar: ' + hopar.size);

    console.log('\n■ SAMI hlustari hengdur oftar en einu sinni  (' + tvitekid.length + ')');
    console.log('  Eitt smell verður að tveimur vistunum.');
    tvitekid.slice(0, valk.hamark || 12).forEach((x) =>
      console.log('   ' + x.sinnum + '×  ' + x.hnutur + '   ' + x.uppruni));

    console.log('\n■ ÓLÍKIR hlustarar á sama hnút  (' + margir.length + ')');
    console.log('  Báðir keyra. Röðin ræðst af hleðsluröð og breytist við byggingu.');
    margir.slice(0, valk.hamark || 12).forEach((x) =>
      console.log('   ' + x.fjoldi + '  ' + x.hnutur + '\n        ' + x.upprunar.join('  ·  ')));

    console.log('\n■ Hnútar sem fleiri en einn staður skrifar  (' + togstreita.length + ')');
    togstreita.slice(0, valk.hamark || 10).forEach((x) =>
      console.log('   ' + x.hnutur + '\n        ' + x.upprunar.slice(0, 5).join('  ·  ')));

    return { tvitekid, margir, togstreita };
  }

  window.Arekstrar = { byrja, haetta, skyrsla, get skra() { return skra; } };
  byrja();                                   // vakta strax við hleðslu
})();
