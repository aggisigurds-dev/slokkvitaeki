/* === API-LYKILL Í HAUS — x-eldklar-key á /api/ köll (2026-07-29) ===
 *
 * Safe-rollout hluti af EDGE_SHARED_KEY-gáttinni á Netlify-functions
 * (sjá BACKLOG.md „Endpoint-auth"). Functions hleypa öllu í gegn þar til
 * EDGE_SHARED_KEY env-varinn er settur — þá krefjast þær haussins
 * 'x-eldklar-key'. Þessi patch vefur window.fetch og setur hausinn á öll
 * same-origin köll á '/api/' eða '/.netlify/functions/' EF lykill finnst.
 *
 * Lykil-uppgötvun (einu sinni per setu):
 *   1. localStorage 'edge_shared_key'
 *   2. annars app_kv-taflan (key='edge_shared_key', dálkar key/value) gegnum
 *      DB.sb þegar hann verður til — niðurstaðan geymd í localStorage.
 * Finnist enginn lykill er EKKERT gert (enginn haus) — í lagi á meðan
 * gáttin er óvirk. Allt í try/catch: fetch má ALDREI brotna út af þessu.
 */
(() => {
  if (window.__apiKeyHeaderInstalled) return;
  window.__apiKeyHeaderInstalled = true;

  let key = '';
  try { key = String(localStorage.getItem('edge_shared_key') || '').trim(); } catch (_) {}

  let tried = false; // aðeins ein DB-uppfletting per setu
  function discover() {
    if (key || tried) return;
    const sb = window.DB && window.DB.sb;
    if (!sb) return;
    tried = true;
    try {
      Promise.resolve(sb.from('app_kv').select('value').eq('key', 'edge_shared_key').limit(1))
        .then((r) => {
          const v = r && r.data && r.data[0] && r.data[0].value;
          if (v == null) return;
          const s = String(typeof v === 'object' ? (v.key || v.value || '') : v).trim();
          if (!s) return;
          key = s;
          try { localStorage.setItem('edge_shared_key', s); } catch (_) {}
        })
        .catch(() => {});
    } catch (_) {}
  }

  // Reyna strax og DB.sb er til (patchar hlaðast á eftir db.js, en verjum okkur).
  if (!key) {
    let tries = 0;
    const t = setInterval(() => {
      if (key || tried || ++tries > 30) { clearInterval(t); return; }
      discover();
      if (tried) clearInterval(t);
    }, 1000);
    discover();
  }

  function wants(input) {
    try {
      const raw = typeof input === 'string' ? input
        : (input && typeof input.url === 'string' ? input.url : String(input || ''));
      const u = new URL(raw, location.href);
      if (u.origin !== location.origin) return false;
      return u.pathname.includes('/api/') || u.pathname.includes('/.netlify/functions/');
    } catch (_) { return false; }
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      if (wants(input)) {
        if (!key) {
          discover(); // næsta kall fær hausinn; þetta fer ómerkt í gegn
        } else if (input instanceof Request && init === undefined) {
          const req = new Request(input);
          req.headers.set('x-eldklar-key', key);
          return origFetch.call(this, req);
        } else {
          const opts = Object.assign({}, init);
          const h = new Headers(
            (init && init.headers) || (input instanceof Request ? input.headers : undefined)
          );
          h.set('x-eldklar-key', key);
          opts.headers = h;
          return origFetch.call(this, input, opts);
        }
      }
    } catch (_) { /* falla í gegn á upprunalega fetch */ }
    return origFetch.call(this, input, init);
  };

  console.log('[patch-290] api key header wrapper installed');
})();
/* === END API-LYKILL Í HAUS === */
