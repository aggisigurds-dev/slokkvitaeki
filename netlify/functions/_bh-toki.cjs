// _bh-toki.cjs — þjónn-í-þjón köll héðan á föll Brunahólfs fá tókann sjálfkrafa (Powerplan lota 13, 17.11.2026).
//
//   require('./_bh-toki.cjs');   // efst í falli (eða: import './_bh-toki.cjs'; í ESM)
//
// Föll Brunahólfs krefjast innskráningar EÐA tóka (brunaholf/netlify/functions/_vord.js). Þessi skrá vefur global fetch
// EINU SINNI: kall á https://brunaholf.netlify.app/api/… eða /.netlify/functions/… fær hausinn x-hub-toki (myntaður í
// hub-adgangar.cjs með session_secret — ALDREI SUPABASE_SERVICE_ROLE_KEY, hann er ólíkur á vefjunum). Öll önnur köll
// (Supabase, Payday, Google …) eru óbreytt. Tókinn er geymdur í 5 mín (gildir 10).
const HUB = require('./hub-adgangar.cjs');

const BH = 'brunaholf.netlify.app';
let _t = '', _tT = 0;
async function toki() {
  if (_t && Date.now() - _tT < 300000) return _t;
  const t = await HUB.hubApiToki().catch(() => '');
  if (t) { _t = t; _tT = Date.now(); }
  return t;
}
function erBhFall(url) {
  try { const u = new URL(String(url)); return u.host === BH && /^\/(api|\.netlify\/functions)\//.test(u.pathname); } catch (_) { return false; }
}
if (typeof globalThis.fetch === 'function' && !globalThis.__bhTokiFetch) {
  const upph = globalThis.fetch;
  globalThis.__bhTokiFetch = true;
  globalThis.fetch = async function (input, init) {
    try {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : (input && input.url);
      if (erBhFall(url)) {
        const t = await toki();
        if (t) {
          const h = new Headers((init && init.headers) || (input && typeof input === 'object' && input.headers) || {});
          if (!h.has(HUB.HUB_TOKI_HAUS)) h.set(HUB.HUB_TOKI_HAUS, t);
          return upph(input, { ...(init || {}), headers: h });
        }
      }
    } catch (_) { /* fellur á venjulegt kall */ }
    return upph(input, init);
  };
}
module.exports = { erBhFall, toki, _endurstilla() { _t = ''; _tT = 0; } };
