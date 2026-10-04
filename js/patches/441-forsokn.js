/* === FORSÓKN (441, HT-3.10, 04.10.2026) — köll prófílsins send SAMTÍMIS um leið og smellt er ========================
 *
 * Agnar 03.10.2026: „við þurfum að fara svo mikið fram og til baka inn á prófíla." / „Já byrja á nr 1."
 *
 * MÆLT á lifandi síðu (fyrsta opnun á #company/261 úr Fyrirtæki í þjónustu, 37 netköll):
 *     köllin fara út í BYLGJUM frá 352 ms til 2.458 ms eftir smell. Síðustu níu eru KEÐJA — hvert bíður eftir svari þess
 *     næsta á undan (fyrirtaeki → solur → solur → document_pairs → customer_documents → slokkvikerfi →
 *     customer_documents → doc_factcheck → solur), ~100–350 ms hvert — og Skjöl-spjaldið (287 hnútar, það sem unnið er
 *     með í skýrslugerðinni) teiknast ekki fyrr en keðjan klárast, 2.500 ms eftir smell.
 * Netið er ekki hægt — röðin er það. 33 af 37 slóðum eru fall af fjórum gildum sem liggja í minni ÁÐUR en smellt er:
 * auðkenni fyrirtækis, customer_base_id, kennitala og tækjaauðkenni. Þær má senda allar í einu.
 *
 * HVERNIG
 *   1. LÆRA. Fyrstu 6 sek eftir að prófíll opnast er hver GET-slóð á /rest/v1/ skráð sem SNIÐ: gildi fyrirtækisins
 *      skipt út fyrir {fid} {base} {kt} {ktd} {adr} {u:…}. Snið sem sést hjá TVEIMUR ólíkum fyrirtækjum er staðfest
 *      (og geymt í localStorage — tækjabundið skyndiminni yfir slóðamynstur, engin gögn).
 *   2. FORSÆKJA. Þegar prófíll er opnaður (músarhnappur niður á röð, _openCompanySafe, Companies.openDetail) eru öll
 *      staðfest snið fyllt með gildum ÞESS fyrirtækis og send strax, samtímis. Við RÆSINGU á #company/<id> fara þau
 *      snið sem þurfa aðeins auðkennið strax þegar þessi skrá hleðst; hin þegar röð fyrirtækisins er komin í minni.
 *   3. SVARA. Þegar pappi biður svo um NÁKVÆMLEGA sömu slóð (sama aðferð, sömu Range/Prefer/Accept-hausar) fær hann
 *      afrit af því svari. Allt annað fer á netið eins og áður.
 *
 * AF HVERJU ÞETTA GETUR EKKI SÝNT RÖNG GÖGN — sama regla og 378 og rest-samnyting byggja á: PostgREST setur ALLA
 * fyrirspurnina í slóðina, svo sama slóð ER sama fyrirspurn. Hér er engin sía endurútfærð og engu svari breytt. Röng
 * ágiskun á slóð þýðir aðeins eitt ónotað kall, aldrei rangt svar.
 *
 * FERSKLEIKI — fimm varnir:
 *   • Forsótt svar lifir mest 5 sek (9 sek í ræsingu, þar sem pappar prófílsins bíða eftir DB.online), og 2 sek eftir
 *     fyrstu notkun (sama gluggi og rest-samnyting).
 *   • HVERT skrif (allt nema GET/HEAD á Supabase, og á /api/ · /.netlify/functions/) tæmir forsóknina áður en það fer
 *     OG aftur þegar það klárast; meðan skrif er á leiðinni er ekkert forsótt. Undanskilin eru aðeins skrif á
 *     app_settings (aldrei geymt hér) og húsmyndar-uppflettingin /api/husmynd.
 *   • FYRSTA SNERTING notanda eftir opnun (músarhnappur eða lykill) tæmir hana. Forsóknin þjónar því aðeins sjálfvirkum
 *     lestri við opnun — lestur sem notandi setur af stað (vistun, „lesa ferskt fyrir vistun"-varnir) er alltaf ferskur.
 *   • `app_settings`, rpc/, beiðnir með AbortSignal eða cache:'no-store' fara aldrei hér í gegn.
 *   • Aðeins svör með 2xx eru notuð; annars fer kallið á netið.
 * Snið sem er forsótt þrisvar í röð án þess að nokkur noti svarið er fellt út (sjálfhreinsun).
 *
 * SLÖKKVA: localStorage.setItem('forsokn_off','1') og endurhlaða.   TÖLUR: window.Forsokn.tolur()
 * ================================================================================================================== */
(() => {
  if (window.Forsokn) return;
  let slokkt = false;
  try { slokkt = localStorage.getItem('forsokn_off') === '1'; } catch (_) {}
  if (typeof window.fetch !== 'function') return;

  const REST = '/rest/v1/';
  const GLUGGI_MS = 6000;          // lærdómsgluggi eftir opnun
  const LIFIR_MS = 5000;           // forsótt svar nothæft þetta lengi
  const LIFIR_RAESING_MS = 9000;   // … við RÆSINGU á #company/<id>: pappar prófílsins spyrja ekki fyrr en DB.online (2,8–7 s)
  const KYRR_SIDA_MS = 15000;      // síðan hefur verið uppi þetta lengi → opnun er „hrein“ (enginn ræsingarhávaði í glugganum)
  const EFTIR_NOTKUN_MS = 2000;    // … og þetta lengi eftir fyrstu notkun
  const SAMA_OPNUN_MS = 4000;      // sama fyrirtæki opnað aftur innan þessa = sama opnun
  const HAMARK_SNID = 90, HAMARK_FORSOKN = 60, MISS_HAMARK = 3;
  const LS = 'forsokn_snid_v2';

  const tolur = { forsott: 0, notad: 0, onotad: 0, laert: 0, taemt: 0, opnanir: 0 };
  const forsott = new Map();       // lykill → { t, til, p, snid, notad }
  let snid = [];                   // [{ m, u, r, p, a, ap, cos:Set, stadfest, hit, miss }]
  let snidEftirLykli = new Map();
  let gluggi = null;               // { id, tk, t0 }
  let sidastId = 0, sidastT = 0;
  let skrifIGangi = 0;
  let grunnHausar = null;          // hausar úr síðasta raunverulega REST-kalli (apikey, authorization …)

  const innra = window.fetch;      // allt sem var vafið á undan okkur (378, 431, rest-samnyting …)
  const grunnur = () => String(window.SUPABASE_URL || '').replace(/\/+$/, '');

  // ── hausar ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function haus(h, nafn) {
    if (!h) return '';
    try {
      if (typeof h.get === 'function') return h.get(nafn) || '';
      const k = Object.keys(h).find(x => x.toLowerCase() === nafn.toLowerCase());
      return k ? String(h[k]) : '';
    } catch (_) { return ''; }
  }
  function afrita(h) {
    const ut = {};
    try {
      if (typeof h.forEach === 'function') h.forEach((v, k) => { ut[String(k).toLowerCase()] = String(v); });
      else Object.keys(h).forEach(k => { ut[k.toLowerCase()] = String(h[k]); });
    } catch (_) {}
    return ut;
  }
  // Sami lykill og rest-samnyting notar: blaðsíður (Range), talning (Prefer) og stök röð (Accept) eru aðskilin svör.
  const lykillAf = (adferd, slod, r, p, a, ap) => adferd + ' ' + slod + '|' + r + '|' + p + '|' + a + '|' + ap;
  const snidLykill = s => s.m + ' ' + s.u + '|' + s.r + '|' + s.p + '|' + s.a + '|' + s.ap;

  function hausarFyrir(s) {
    const h = Object.assign({}, grunnHausar || {});
    delete h.range; delete h.prefer; delete h.accept; delete h['accept-profile'];
    if (!h.apikey && window.SUPABASE_KEY) { h.apikey = window.SUPABASE_KEY; h.authorization = 'Bearer ' + window.SUPABASE_KEY; }
    if (s.r) h.range = s.r;
    if (s.p) h.prefer = s.p;
    if (s.a) h.accept = s.a;
    if (s.ap) h['accept-profile'] = s.ap;
    return h;
  }

  // ── gildi fyrirtækisins ────────────────────────────────────────────────────────────────────────────────────────────
  const kodun = s => { try { return new URLSearchParams({ a: s }).toString().slice(2); } catch (_) { return ''; } };
  function finna(id) {
    try {
      const L = window.Companies && Companies.list;
      if (!L) return null;
      for (let i = 0; i < L.length; i++) if (+L[i].id === id) return L[i];
    } catch (_) {}
    return null;
  }
  function taeki(id) {
    try {
      const c = window.DB && DB.cache;
      if (!c) return [];
      const eftir = c.unitsByFid && c.unitsByFid[id];
      if (eftir && eftir.length) return eftir;
      return (c.units || []).filter(u => +u.fyrirtaeki_id === id);
    } catch (_) { return []; }
  }
  function takn(c) {
    const fid = String(c.id);
    const kt = String(c.kennitala || '').trim();
    const ktd = kt.replace(/\D/g, '');
    const adr = String(c.heimilisfang || c.heimilisFang || '').trim().toLowerCase();
    const u = taeki(+c.id);
    const virk = u.filter(x => String(x.status) !== 'urelt');
    const rod = a => a.map(x => +x.id).filter(Boolean);
    const upp = a => rod(a).slice().sort((x, y) => x - y);
    return {
      fid,
      base: c.customer_base_id != null && c.customer_base_id !== '' ? String(c.customer_base_id) : '',
      kt: kt.length >= 9 ? kt : '',
      ktd: ktd.length >= 9 && ktd !== kt ? ktd : '',
      adr: adr.length >= 5 ? kodun(adr) : '',
      // fjórar hugsanlegar raðir tækjaauðkenna — sú sem pappinn notar finnst við lærdóm
      u: { a: rod(u).join('%2C'), v: rod(virk).join('%2C'), as: upp(u).join('%2C'), vs: upp(virk).join('%2C') },
    };
  }
  const STADGENGILL = /\{(?:fid|base|kt|ktd|adr|u:(?:a|v|as|vs))\}/;
  const TALA = (t) => new RegExp('(^|[^0-9A-Za-z_])' + t + '(?![0-9A-Za-z_])', 'g');

  // slóð → snið (gildi fyrirtækisins út, staðgenglar inn). Lengstu gildin fyrst.
  function iSnid(hluti, tk) {
    let u = hluti;
    if (tk.adr) u = u.split(tk.adr).join('{adr}');
    for (const k of ['a', 'v', 'as', 'vs']) {
      const l = tk.u[k];
      if (l && l.length >= 3 && u.indexOf(l) > -1) { u = u.split(l).join('{u:' + k + '}'); break; }
    }
    if (tk.kt) u = u.split(tk.kt).join('{kt}');
    if (tk.ktd) u = u.split(tk.ktd).join('{ktd}');
    u = u.replace(TALA(tk.fid), '$1{fid}');
    if (tk.base && tk.base !== tk.fid) u = u.replace(TALA(tk.base), '$1{base}');
    return u;
  }
  // snið → slóð fyrir ÞETTA fyrirtæki; null ef gildi vantar
  function ur(u, tk) {
    let vantar = false;
    const ut = u.replace(/\{(fid|base|kt|ktd|adr|u:(?:a|v|as|vs))\}/g, (m, n) => {
      const g = n.indexOf('u:') === 0 ? tk.u[n.slice(2)] : tk[n];
      if (!g) { vantar = true; return ''; }
      return g;
    });
    return vantar ? null : ut;
  }

  // ── geymsla sniða ──────────────────────────────────────────────────────────────────────────────────────────────────
  function hlada() {
    try {
      const j = JSON.parse(localStorage.getItem(LS) || '[]');
      if (!Array.isArray(j)) return;
      j.slice(0, HAMARK_SNID * 2).forEach(x => {
        if (!x || typeof x.u !== 'string' || !x.m) return;
        const cos = new Set(Array.isArray(x.c) ? x.c.slice(0, 3).map(Number).filter(Boolean) : []);
        const s = { m: x.m, u: x.u, r: x.r || '', p: x.p || '', a: x.a || '', ap: x.ap || '', cos, stadfest: !x.c, hit: +x.hit || 0, miss: 0, sed: 0 };
        snid.push(s); snidEftirLykli.set(snidLykill(s), s);
      });
    } catch (_) {}
  }
  let vistaT = 0;
  function vista() {
    clearTimeout(vistaT);
    vistaT = setTimeout(() => {
      try {
        const stadf = snid.filter(s => s.stadfest).sort((x, y) => y.hit - x.hit).slice(0, HAMARK_SNID)
          .map(s => ({ m: s.m, u: s.u, r: s.r, p: s.p, a: s.a, ap: s.ap, hit: s.hit }));
        // í lærdómi: aðeins snið með staðgengli (auðkenni fyrirtækjanna sem sáu þau fylgja — `c`)
        const laerd = snid.filter(s => !s.stadfest && STADGENGILL.test(s.u)).slice(-HAMARK_SNID)
          .map(s => ({ m: s.m, u: s.u, r: s.r, p: s.p, a: s.a, ap: s.ap, c: Array.from(s.cos).slice(0, 3) }));
        localStorage.setItem(LS, JSON.stringify(stadf.concat(laerd)));
      } catch (_) {}
    }, 3000);
  }
  function fella(s) {
    const i = snid.indexOf(s);
    if (i > -1) snid.splice(i, 1);
    snidEftirLykli.delete(snidLykill(s));
    vista();
  }

  // ── tæming ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function taema() {
    if (!forsott.size) return;
    forsott.forEach(f => { f.ogilt = true; });
    forsott.clear();
    tolur.taemt++;
  }

  // ── lærdómur: hvert raunverulegt GET í glugganum ───────────────────────────────────────────────────────────────────
  function skra(adferd, slod, r, p, a, ap, nu) {
    if (!gluggi || nu - gluggi.t0 > GLUGGI_MS) return null;
    const g = grunnur();
    const u = iSnid(slod.slice(g.length + REST.length), gluggi.tk);
    // Gluggi sem opnast í RÆSINGU sér öll ræsingarköll appsins (~100, flest koma prófílnum ekkert við). Þar er aðeins
    // lært það sem ber gildi fyrirtækisins; almenn uppflettiköll (vorur, discount_tiers …) lærast við hreina opnun.
    if (!gluggi.hreinn && !STADGENGILL.test(u)) return null;
    const s0 = { m: adferd, u, r, p, a, ap };
    const k = snidLykill(s0);
    let s = snidEftirLykli.get(k);
    if (!s) {
      if (snid.length >= HAMARK_SNID * 2) {
        // Slóðir með tímastimpli o.þ.h. staðfestast aldrei — elstu óstaðfestu sniðin víkja, annars hætti lærdómurinn.
        snid.filter(x => !x.stadfest && nu - x.sed > 30000).forEach(x => { snid.splice(snid.indexOf(x), 1); snidEftirLykli.delete(snidLykill(x)); });
        if (snid.length >= HAMARK_SNID * 2) return null;
      }
      s = Object.assign(s0, { cos: new Set(), stadfest: false, hit: 0, miss: 0, sed: nu });
      snid.push(s); snidEftirLykli.set(k, s);
    }
    s.sed = nu;
    if (!s.stadfest) {
      s.cos.add(gluggi.id);
      const fyrir = s.cos.size;
      if (s.cos.size >= 2) { s.stadfest = true; tolur.laert++; vista(); }
      else if (s.cos.size !== fyrir || !s.vistad) { s.vistad = true; vista(); }
    }
    return s;
  }

  // ── forsókn ────────────────────────────────────────────────────────────────────────────────────────────────────────
  function forsaekja(id) {
    id = +id;
    if (!id) return;
    const nu = Date.now();
    if (sidastId === id && nu - sidastT < SAMA_OPNUN_MS) return;       // sama opnun (músarhnappur → smellur → openDetail)
    const c = finna(id);
    if (!c) return;
    sidastId = id; sidastT = nu;
    const tk = takn(c);
    gluggi = { id, tk, t0: nu, hreinn: performance.now() > KYRR_SIDA_MS };
    tolur.opnanir++;
    senda(tk, nu, LIFIR_MS);
  }
  // RÆSING á #company/<id>: röðin er ekki komin í minni, svo aðeins sniðin sem þurfa EKKERT nema auðkennið fara strax.
  // Hin fara þegar openDetail er kallað (röðin þekkt). Lengra líf: pappar prófílsins spyrja ekki fyrr en DB.online.
  function forsaekjaVidRaesingu(id) {
    id = +id;
    if (!id) return;
    senda({ fid: String(id), base: '', kt: '', ktd: '', adr: '', u: { a: '', v: '', as: '', vs: '' } }, Date.now(), LIFIR_RAESING_MS);
  }
  function senda(tk, nu, lifir) {
    if (slokkt || skrifIGangi > 0) return;                              // lært áfram, en ekkert sent
    const g = grunnur();
    if (!g) return;
    if (performance.now() < KYRR_SIDA_MS) lifir = Math.max(lifir, LIFIR_RAESING_MS);
    let n = 0;
    for (let i = 0; i < snid.length && n < HAMARK_FORSOKN; i++) {
      const s = snid[i];
      if (!s.stadfest) continue;
      const hluti = ur(s.u, tk);
      if (!hluti) continue;
      const slod = g + REST + hluti;
      const k = lykillAf(s.m, slod, s.r, s.p, s.a, s.ap);
      if (forsott.has(k)) continue;
      let p;
      try { p = innra.call(window, slod, { method: s.m, headers: hausarFyrir(s) }); } catch (_) { continue; }
      const f = { t: nu, til: nu + lifir, p, snid: s, notad: false, ogilt: false };
      forsott.set(k, f);
      n++; tolur.forsott++;
      const henda = () => { if (forsott.get(k) === f) forsott.delete(k); };
      Promise.resolve(p).then(r => { if (!r || !r.ok) { f.ogilt = true; henda(); } }, () => { f.ogilt = true; henda(); });
      setTimeout(() => {
        henda();
        if (f.notad || f.ogilt) return;
        tolur.onotad++;
        s.miss++;
        if (s.miss >= MISS_HAMARK) fella(s);
      }, lifir + 200);
    }
  }

  // ── fetch-lagið ────────────────────────────────────────────────────────────────────────────────────────────────────
  window.fetch = function (inn, valk) {
    try {
      const slod = typeof inn === 'string' ? inn : (inn && inn.url) || '';
      const g = grunnur();
      const adferd = String((valk && valk.method) || (inn && inn.method) || 'GET').toUpperCase();
      const okkar = !!g && slod.indexOf(g) === 0;
      if (adferd !== 'GET' && adferd !== 'HEAD') {
        const fall = !okkar && (slod.indexOf('/api/') === 0 || slod.indexOf('/.netlify/functions/') === 0 ||
          slod.indexOf(location.origin + '/api/') === 0 || slod.indexOf(location.origin + '/.netlify/functions/') === 0);
        // Hraðamælirinn (387) og villuskráin (309) skrifa sjálf í bakgrunni — það er ekki „notandinn vistaði".
        const sjalfvirkt = slod.indexOf('/rest/v1/hradamaelingar') > -1 || slod.indexOf('/rest/v1/app_problems') > -1;
        // Tvenn sjálfvirk skrif við opnun prófíls breyta engu sem hér er geymt og mega ekki fella forsóknina (mælt 04.10:
        // annars fékk hvert fyrirtæki án húsmyndar engan ávinning og tvöföld köll, 69 í stað 41):
        //   • app_settings / rpc app_settings_merge — app_settings er aldrei forsótt né svarað hér (sjá neðar);
        //   • /api/husmynd — uppfletting á húsmynd (367); niðurstaðan er vistuð í app_settings.
        const ohad = slod.indexOf('/rest/v1/app_settings') > -1 || slod.indexOf('/rest/v1/rpc/app_settings_merge') > -1 ||
          /\/(?:api|\.netlify\/functions)\/husmynd(?:[?#]|$)/.test(slod);
        if ((okkar || fall) && !sjalfvirkt && !ohad) {
          taema();
          skrifIGangi++;
          const lok = () => { skrifIGangi = Math.max(0, skrifIGangi - 1); taema(); };
          let svar;
          try { svar = innra.apply(this, arguments); } catch (e) { lok(); throw e; }
          Promise.resolve(svar).then(lok, lok);
          return svar;
        }
        return innra.apply(this, arguments);
      }
      if (!okkar || slod.indexOf(g + REST) !== 0 || slod.indexOf('/rest/v1/rpc/') > -1 || slod.indexOf('/rest/v1/app_settings') > -1 ||
          (valk && (valk.signal || valk.cache === 'no-store'))) {
        return innra.apply(this, arguments);
      }
      const h = (valk && valk.headers) || (inn && inn.headers) || null;
      const r = haus(h, 'Range'), p = haus(h, 'Prefer'), a = haus(h, 'Accept'), ap = haus(h, 'Accept-Profile');
      if (h && !grunnHausar) { const afr = afrita(h); if (afr.apikey) grunnHausar = afr; }
      const nu = Date.now();
      skra(adferd, slod, r, p, a, ap, nu);
      const k = lykillAf(adferd, slod, r, p, a, ap);
      const f = forsott.get(k);
      if (f && !f.ogilt && nu < f.til) {
        if (!f.notad) { f.notad = true; f.til = Math.min(f.til, nu + EFTIR_NOTKUN_MS); f.snid.miss = 0; f.snid.hit++; }
        tolur.notad++;
        const th = this, rok = arguments;
        return Promise.resolve(f.p).then(
          sv => (sv && sv.ok) ? sv.clone() : innra.apply(th, rok),
          () => innra.apply(th, rok));
      }
      return innra.apply(this, arguments);
    } catch (_) {
      return innra.apply(this, arguments);
    }
  };

  // ── hvenær opnast prófíll ──────────────────────────────────────────────────────────────────────────────────────────
  // Snerting notanda: tæmir fyrri forsókn (lestur sem notandi setur af stað er alltaf ferskur) — og sé hún á röð í
  // Fyrirtæki í þjónustu með MÚS hefst forsóknin strax, ~100 ms á undan smellinum. Snertiskjár bíður smellsins:
  // þar byrjar hvert skrun á röð og forsóknin væri oftast til einskis.
  const EKKI_OPNA = 'button, a, input, select, textarea, ._ars-ovr-month, ._ars-ovr-eq, ._ars-ovr-year, ._ars-ovr-pop';
  document.addEventListener('pointerdown', (e) => {
    taema();
    try {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const t = e.target;
      if (!t || !t.closest || t.closest(EKKI_OPNA)) return;
      const rod = t.closest('#view-arsskodun tr._ars-row[data-co-id], #view-arsskodun ._ars-card[data-co-id]');
      if (rod) forsaekja(rod.getAttribute('data-co-id'));
    } catch (_) {}
  }, true);
  document.addEventListener('keydown', taema, true);

  // _openCompanySafe og Companies.openDetail — gegnsær Proxy svo flögg annarra pappa (_fpfixHooked, _vbuHooked …)
  // lesist og skrifist áfram á upprunalega fallið; annars vefðu þeir sig aftur.
  // Vafið EINU SINNI hvort: pappar sem vefja á eftir kalla áfram í þetta, svo endurvafning myndi aðeins stafla lögum.
  let vafidO = false, vafidC = false;
  function vefja() {
    try {
      const o = window._openCompanySafe;
      if (!vafidO && typeof o === 'function') {
        vafidO = true;
        window._openCompanySafe = new Proxy(o, { apply(t, th, rok) { try { forsaekja(rok[0]); } catch (_) {} return Reflect.apply(t, th, rok); } });
      }
      const C = window.Companies;
      if (!vafidC && C && typeof C.openDetail === 'function') {
        vafidC = true;
        C.openDetail = new Proxy(C.openDetail, { apply(t, th, rok) { try { forsaekja(rok[0]); } catch (_) {} return Reflect.apply(t, th, rok); } });
      }
    } catch (_) {}
  }
  hlada();
  vefja();
  try {
    const mm = /^#(?:company|companies|fyrirtaeki)\/(\d+)\b/.exec(location.hash || '');
    if (mm) forsaekjaVidRaesingu(mm[1]);
  } catch (_) {}
  document.addEventListener('DOMContentLoaded', vefja);
  [300, 1200, 3000].forEach(ms => setTimeout(vefja, ms));

  window.Forsokn = {
    tolur: () => Object.assign({ snid: snid.filter(s => s.stadfest).length, i_laerdomi: snid.filter(s => !s.stadfest).length, i_geymslu: forsott.size, slokkt }, tolur),
    snid: () => snid.filter(s => s.stadfest).map(s => s.m + ' ' + s.u),
    taema,
    gleyma: () => { snid = []; snidEftirLykli = new Map(); try { localStorage.removeItem(LS); } catch (_) {} },
  };
  console.log('[patch-441] forsókn — köll prófílsins send samtímis við opnun' + (slokkt ? ' (SLÖKKT)' : ''));
})();
/* === END FORSÓKN === */
