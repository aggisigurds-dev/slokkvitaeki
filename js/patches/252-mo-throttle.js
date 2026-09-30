/* === 252-mo-throttle.js — global MutationObserver throttle ==================
 *
 * The slokkvitæki app has accumulated ~40+ MutationObservers across patches +
 * legacy `newfeatures.js`, most of them watching `document.body` with
 * `subtree:true`. Every DOM mutation (POS cart add, sidebar paint, sale-line
 * tweak) fires ALL of them. On POS Sala specifically this manifests as a
 * sluggish UI — typing or clicking adds layout work and observer callbacks.
 *
 * This patch monkey-patches `MutationObserver` so every callback is coalesced
 * to AT MOST one call per animation frame. The DOM still records every
 * mutation (callbacks receive the union of pending mutation records on each
 * frame), so logic stays correct — but instead of N callbacks per click we
 * get ≤ N/16 on a 60Hz display when activity is bursty.
 *
 * Idempotent: only wraps once, and falls back to passthrough if the runtime
 * doesn't support requestAnimationFrame for any reason.
 * ========================================================================= */
(() => {
  if (window.__moThrottle252) return;
  window.__moThrottle252 = true;

  const RealMO = window.MutationObserver;
  if (!RealMO || typeof requestAnimationFrame !== 'function') return;
  // 25.09.2026: óinngjafaða útgáfan aðgengileg fyrir þá fáu sem VERÐA að bregðast við í sama verki (fyrir málun),
  // t.d. hnút sem endurteikning annars pappa þurrkar út og á að setja aftur án þess að rammi sjáist án hans (20).
  window.__NativeMutationObserver = RealMO;

  // 30.09.2026 — ÞRJÁR BILANIR LAGAÐAR. Þetta er hnútur sem allar 247 vaktir
  // appsins hanga á, svo hver þeirra var dýr:
  //
  // 1. rAF HLEYPUR ALDREI Í FÖLDUM FLIPA. `scheduled` stóð þá í true út alla
  //    földu stundina: hver einasta vakt í appinu ÞAGNAÐI, færslur hlóðust upp,
  //    og við endurkomu barst allt í einni synkrónri hrinu á fyrsta rammanum.
  //    Þetta er ástæðan fyrir því að sautján pappar bættu við sér `setInterval`
  //    til vara — og þeir púlsar tvíteikna svo allt þegar flipinn SÉST.
  //    Tvær skjalfestar bilanir raktar hingað: 300-stillingasaga (spjaldið
  //    hvarf og kom aldrei aftur) og 265-utfyllt-skjol.
  //    Nú fylgir `setTimeout`-bakvörður hverri áætlun. Í sýnilegum flipa hleypur
  //    rAF löngu á undan og bakvörðurinn er núll-aðgerð (`bunid`-vörnin).
  //
  // 2. `pending.push(...mutations)` — útbreiðsla á fylki kastar RangeError
  //    þegar hrinan fer yfir ~65k færslur. Lykkja í staðinn.
  //
  // 3. `pending` var ÓTAKMARKAÐ. Löng falin stund á virkri síðu át minni.
  //    Nú er þak: fari það yfir, er tæmt STRAX í stað þess að henda færslum —
  //    vakt sem missir færslu tekur rangar ákvarðanir, hún má hiksta en ekki ljúga.
  const BAKVORDUR_MS = 250;     // lengra en rammi, svo rAF vinni alltaf þegar hann hleypur
  const THAK = 50000;

  function ThrottledMO(originalCb) {
    let pending = [];
    let scheduled = false;
    let observerRef = null;

    function aaetla() {
      if (scheduled) return;
      scheduled = true;
      let bunid = false;
      const keyra = () => {
        if (bunid) return;
        bunid = true;
        scheduled = false;
        const flush = pending;
        pending = [];
        try { originalCb(flush, observerRef); }
        catch (e) { /* never let one bad observer poison the others */ console.error('[mo-throttle252] callback threw', e); }
      };
      requestAnimationFrame(keyra);
      setTimeout(keyra, BAKVORDUR_MS);
    }

    const wrapped = function (mutations, observer) {
      observerRef = observer;
      if (mutations && mutations.length) {
        for (let i = 0; i < mutations.length; i++) pending.push(mutations[i]);
      }
      if (pending.length >= THAK) {            // tæma strax fremur en að safna endalaust
        scheduled = false;
        const flush = pending;
        pending = [];
        try { originalCb(flush, observerRef); }
        catch (e) { console.error('[mo-throttle252] callback threw', e); }
        return;
      }
      aaetla();
    };

    return new RealMO(wrapped);
  }
  // Mirror prototype + statics so `instanceof MutationObserver` still works
  // for anything that introspects.
  ThrottledMO.prototype = RealMO.prototype;
  Object.setPrototypeOf(ThrottledMO, RealMO);

  // Replace the global. Existing observers created before this loads keep
  // their original (un-throttled) behavior, but every patch after this gets
  // the throttled version automatically.
  window.MutationObserver = function (cb) { return ThrottledMO(cb); };
  window.MutationObserver.prototype = RealMO.prototype;

  console.log('[mo-throttle252] MutationObservers now throttled to ≤ 1 callback / animation frame');
})();
/* === END MO THROTTLE === */
