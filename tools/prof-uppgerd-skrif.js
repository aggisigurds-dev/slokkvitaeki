/* PRÓF ÁN SKRIFA — uppgerð skrif fyrir dev-þjóninn (10.11.2026)
 *
 * Dev-þjónninn (preview_start slokkvitaeki-dev, :5599) talar við LIFANDI Supabase. Hver smellur á „Vista", „ÁFRAM" eða verðreit
 * skrifar því í raungögn — og Claude er (réttilega) neitað um slík skrif í prófi. Þessi skrá lokar skrifunum Í VAFRANUM svo hægt sé
 * að smella í gegnum raunverulegt viðmót og LESA hvað hefði verið skrifað. Hún var endurskrifuð fimm sinnum í einni lotu áður en
 * hún lenti hér; notaðu hana í staðinn fyrir að smíða nýja.
 *
 * NOTKUN: hladdu skránni í vafrann á dev-þjóninum (javascript_tool eða console) — þjónninn ber hana fram sjálfur:
 *
 *   (0, eval)(await fetch('/tools/prof-uppgerd-skrif.js').then(r => r.text()));
 *
 * svo:
 *
 *   Uppgerd.sala()                 // ALLAR töflur uppgerðar (lestur skilar tómu, insert á solur skilar röð). Fyrir kassann:
 *                                  //   smella ÁFRAM → greiðslumáti → Uppgerd.skrif() sýnir insert/update í röð.
 *   Uppgerd.stillingar({lykill})   // AÐEINS app_settings uppgert, með minni: app_settings_merge sameinar í afrit í vafranum og
 *                                  //   AppSettings.load() les það til baka. Aðrar töflur lesa raungögn. Fyrir verðlista o.þ.h.
 *                                  //   Sáðu gögnum: Uppgerd.stillingar({ verdlistar: { sprinkler: {...} } })
 *   Uppgerd.skrif()                // ['solur :: insert({...})', 'solur :: update({...})', 'rpc:app_settings_merge', …]
 *   Uppgerd.hreinsa()              // tæmir skráninguna milli prófa
 *   Uppgerd.opnad                  // HTML sem fór í window.open (prentgluggar) — window.open er uppgert líka
 *
 * Skrifvörnin fellur við endurhleðslu síðunnar — límdu aftur eftir hverja navigate/reload.
 *
 * GILDRUR SEM KOSTUÐU TÍMA (mældar 10.11.2026):
 *   • Tvítöku-vörn kassans: sama kt + sama upphæð innan 2 mín → Confirm.show bíður eftir smelli. Breyttu upphæð milli prófa.
 *   • QR-miðaglugginn (#_qrlc_modal) opnast eftir sölu og hylur ÁFRAM — lokaðu honum áður en næsta próf hefst.
 *   • 255 (sjálfvirkur fyrirtækjaafsláttur) núllstillir state.discount_pct sem sett er beint í state; settu afslátt um viðmótið.
 *   • Falinn vafragluggi: requestAnimationFrame keyrir ekki og skjáskot geta verið einni aðgerð á eftir — lestu DOM, ekki myndina.
 *   • find() þekkir hnapp á `title` ef hann er til (ekki á sýnilega textanum).
 *   • Þetta sannar HVAÐ kóðinn sendir, ekki að þjónninn taki við því. Sameiningu app_settings má sannreyna með hreinni lesfyrirspurn:
 *       select public.jsonb_deep_merge('<núverandi>'::jsonb, '<plástur>'::jsonb);   -- djúp sameining, FYLKI yfirskrifast heil
 */
(() => {
  if (window.Uppgerd) return 'Uppgerd er þegar virk';
  const sb = window.DB && DB.sb;
  if (!sb) return 'DB.sb vantar — bíddu þar til appið er hlaðið';
  const raun = { from: sb.from.bind(sb), rpc: sb.rpc.bind(sb), fetch: window.fetch, open: window.open };
  const U = { koll: [], blokkad: [], opnad: [], srv: null, hamur: '' };
  const stutt = o => { try { return JSON.stringify(o, (k, v) => (k === 'linur' || k === 'karfa') ? '[' + k + ']' : v).slice(0, 320); } catch (_) { return '?'; } };
  const djup = (a, b) => {
    if (a == null) return b; if (b == null) return a;
    if (typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return b;
    const o = Object.assign({}, a);
    Object.keys(b).forEach(k => { o[k] = (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? djup(a[k], b[k]) : b[k]; });
    return o;
  };
  // keðjanlegur staðgengill fyrir sb.from(tafla): skráir aðgerðirnar og svarar eins og þjónninn myndi (án þess að tala við hann)
  const tafla = heiti => {
    const rec = { table: heiti, ops: [] };
    const chain = new Proxy(function () {}, { get(_, prop) {
      if (prop === 'then') return (res, rej) => {
        U.koll.push(rec);
        const ins = rec.ops.find(o => o.m === 'insert' || o.m === 'upsert');
        const einn = rec.ops.some(o => o.m === 'single' || o.m === 'maybeSingle');
        let out;
        if (ins && heiti === 'solur') out = { data: Object.assign({ id: 987654, num: 'R-PROF' }, ins.a[0]), error: null };
        else if (ins) out = { data: einn ? { id: 555001 } : [{ id: 555001 }], error: null };
        else out = { data: einn ? null : [], error: null };
        return Promise.resolve(out).then(res, rej);
      };
      return (...a) => { rec.ops.push({ m: prop, a }); return chain; };
    } });
    return chain;
  };
  function skrifvorn() {   // sameiginlegt báðum hömum: fetch-skrif, storage og prentgluggar
    window.fetch = function (u, o) {
      const m = ((o && o.method) || 'GET').toUpperCase();
      if (m !== 'GET' && m !== 'HEAD') { U.blokkad.push(m + ' ' + String(u).slice(0, 90)); return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })); }
      return raun.fetch.apply(this, arguments);
    };
    try { Object.defineProperty(sb, 'storage', { configurable: true, value: { from: () => ({
      upload: async () => ({ data: {}, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }), createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
      list: async () => ({ data: [], error: null }), remove: async () => ({ data: [], error: null }), download: async () => ({ data: null, error: null }) }) } }); } catch (_) {}
    window.open = () => ({ closed: false, focus() {}, print() {}, close() {}, document: { open() {}, close() {}, write(h) { U.opnad.push(h); } } });
  }
  U.sala = function () {
    skrifvorn(); U.hamur = 'sala';
    sb.from = tafla;
    sb.rpc = async (n, a) => { U.koll.push({ table: 'rpc:' + n, ops: [{ m: 'rpc', a: [a] }] }); return { data: n === 'next_reikningur_num' ? 'R-PROF9' : null, error: null }; };
    return 'Uppgerð skrif virk (sala): allar töflur uppgerðar';
  };
  U.stillingar = function (sad) {
    skrifvorn(); U.hamur = 'stillingar';
    U.srv = djup(JSON.parse(JSON.stringify(window.AppSettings ? AppSettings.get() : {})), sad || {});
    sb.rpc = async (n, a) => {
      if (n === 'app_settings_merge') { U.srv = djup(U.srv, a.p_patch); U.koll.push({ table: 'rpc:app_settings_merge', ops: [{ m: 'update', a: [a.p_patch] }] }); return { data: { ok: true }, error: null }; }
      return raun.rpc(n, a);
    };
    sb.from = t => t === 'app_settings'
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { settings: U.srv }, error: null }) }) }) }
      : raun.from(t);
    return (window.AppSettings && AppSettings.load) ? AppSettings.load().then(() => 'Uppgerð skrif virk (stillingar): app_settings í minni') : 'Uppgerð skrif virk (stillingar)';
  };
  U.skrif = () => U.koll.filter(c => c.ops.some(o => ['insert', 'update', 'upsert', 'delete', 'rpc'].includes(o.m)))
    .map(c => c.table + ' :: ' + c.ops.filter(o => ['insert', 'update', 'upsert', 'delete', 'rpc'].includes(o.m)).map(o => o.m + '(' + stutt(o.a[0]) + ')').join('.'));
  U.lestur = () => U.koll.filter(c => !c.ops.some(o => ['insert', 'update', 'upsert', 'delete', 'rpc'].includes(o.m))).map(c => c.table);
  U.hreinsa = () => { U.koll.length = 0; U.blokkad.length = 0; U.opnad.length = 0; };
  window.Uppgerd = U;
  return 'Uppgerd tilbúin — kallaðu Uppgerd.sala() eða Uppgerd.stillingar({...})';
})();
