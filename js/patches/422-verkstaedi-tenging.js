/* === VERKSTÆÐI ↔ FYRIRTÆKJAPRÓFÍLL (422) — 29.09.2026 ===
 *
 * Agnar: „betri tengingu milli þess sem fer á verkstæði í hleðslu og síðan afhent á staðinn aftur … sjá
 * einhverja merkingu að tækin séu á verkstæði í fyrirtækjaprófíl … og uppfærast eftir því hvað er gert, skráð
 * ónýtt, og skilað, svo hakið verði grænt og staðfest."
 *
 * Ákvarðanir Agnars sama dag:
 *   • Tæki sem koma inn með „Sækja inn úr fyrirtæki" (122) eru unnin AÐEINS í verkbeiðninni (Verkröð).
 *   • Þau eru rukkuð AÐEINS á verkbeiðninni — ársskoðunarlistinn (129) telur þau ekki aftur.
 *
 * EIN HEIMILD: verkbeiðnarlínan. 122 skrifar `verklidur.uttaeki_id`, svo hver lína veit úr hvaða prófílröð tækið
 * kom; línan fer received → done/broken og verkbeiðnin received → ready → collected (121 Sótt ✓). Þessi pappi les
 * nýjustu línu hvers tækis og segir hinum hvað hún þýðir — hann skrifar EKKERT:
 *   224 (prófíllinn)  — merki á röðinni, hakið grænt og læst þegar verkinu er lokið
 *   129 (kostnaður)   — tæki sem rukkast á verkbeiðni falla úr ársskoðuninni, ein grá skýringarlína
 *   269 (Komið úr þjónustu) — tæki í opinni verkbeiðni eru sýnd án takka („í verki R-…")
 *
 * Staða (stada(uid).kind):
 *   verkstaedi    opin verkbeiðni, línan ómerkt            „Á verkstæði · R-…"
 *   tilbuid       opin verkbeiðni, línan tilbúin (done)     „Tilbúið · R-…"
 *   onytt         opin verkbeiðni, línan ónýt (broken)      „Ónýtt · R-…"
 *   skilad        afgreidd (collected) innan GLUGGI daga    „Skilað dd/mm · Hlaðið"   → hak grænt + staðfest
 *   onytt_skilad  afgreidd, línan ónýt                      „Ónýtt · staðfest"          → hak grænt + staðfest
 *   null          engin lína, eða afgreidd fyrir meira en GLUGGI dögum (þá gildir venjuleg ársskoðun)
 *
 * Uppfærist: (1) strax þegar þessi vafri skrifar í verklidur/verkbeidnir/uttaeki (`gogn-skrifud`, rest-samnyting),
 * (2) á 20 s fresti á meðan fyrirtækjaprófíll er opinn og sýnilegur — breyting á verkstæðinu kemur oft frá ANNARRI
 * vél. Aðeins raðirnar sem breyttust eru teiknaðar aftur (UttektTaeki.uppfaeraRadir) — ekkert hopp.
 */
(() => {
  if (window.VerkTenging) return;

  const GLUGGI_DAGA = 45;        // afgreitt verk telst hluti af yfirstandandi ársskoðun í 45 daga
  const TTL_MS = 15000, PUSL_MS = 20000, BITI = 150;
  const DISP = { hledsla: 'Hlaðið', yfirferd: 'Yfirfarið', nytt: 'Nýtt', vidgerd: 'Viðgert' };

  const _lina = new Map();       // uid -> { lina, verk } | null
  const _sott = new Map();       // uid -> ms
  const _hlust = new Set();
  let _sig = new Map();          // uid -> undirskrift síðustu stöðu (til að finna breytingar)

  const sb = () => (window.DB && DB.sb) || null;
  const thjonusta = (s) => {
    const t = String(s || '').toLowerCase();
    if (/hle[ðd]/.test(t)) return 'hledsla';
    if (/n[ýy]tt|new/.test(t)) return 'nytt';
    if (/vi[ðd]ger/.test(t)) return 'vidgerd';
    return 'yfirferd';
  };

  async function saekja(ids) {
    const s = sb();
    if (!s || !ids.length) return;
    const linur = [];
    for (let i = 0; i < ids.length; i += BITI) {
      const r = await s.from('verklidur').select('id,job_id,uttaeki_id,service,status,created_at')
        .in('uttaeki_id', ids.slice(i, i + BITI)).neq('status', 'eytt');
      if (r.error) throw r.error;
      (r.data || []).forEach((l) => linur.push(l));
    }
    // Tækið sjálft líka: „Sótt ✓" (121) setur status/last_insp/next_insp — minnið (DB.cache.units) sem prófíllinn
    // teiknar úr veit ekki af því fyrr en síða er endurhlaðin. Lagfært hér á staðnum (aðeins lesið úr grunni).
    const ferskt = new Map();
    for (let i = 0; i < ids.length; i += BITI) {
      const r = await s.from('uttaeki').select('id,status,last_insp,next_insp,custody_status').in('id', ids.slice(i, i + BITI));
      if (!r.error) (r.data || []).forEach((u) => ferskt.set(+u.id, u));
    }
    try {
      const cache = (window.DB && DB.cache && Array.isArray(DB.cache.units)) ? DB.cache.units : [];
      cache.forEach((c) => { const f = c && ferskt.get(+c.id); if (f) { c.status = f.status; c.last_insp = f.last_insp; c.next_insp = f.next_insp; c.custody_status = f.custody_status; } });
    } catch (_) {}
    const jobIds = [...new Set(linur.map((l) => l.job_id).filter(Boolean))];
    const verk = new Map();
    for (let i = 0; i < jobIds.length; i += BITI) {
      const r = await s.from('verkbeidnir').select('id,num,status,dropoff,pickup,created_at')
        .in('id', jobIds.slice(i, i + BITI));
      if (r.error) throw r.error;
      (r.data || []).forEach((v) => verk.set(v.id, v));
    }
    const nu = Date.now();
    const best = new Map();
    linur.forEach((l) => {
      const v = verk.get(l.job_id);
      if (!v || v.status === 'eytt') return;
      const cur = best.get(l.uttaeki_id);
      const lykill = (x) => (Date.parse(x.verk.created_at) || 0) * 1e6 + (+x.lina.id || 0);
      const nyr = { lina: l, verk: v };
      if (!cur || lykill(nyr) > lykill(cur)) best.set(l.uttaeki_id, nyr);
    });
    ids.forEach((id) => { _lina.set(+id, best.get(+id) || null); _sott.set(+id, nu); });
  }

  // Sækir það sem vantar eða er orðið gamalt. Samtíma köll deila einni sókn.
  let _bid = null;
  async function ensure(ids, opts) {
    const force = !!(opts && opts.force);
    const nu = Date.now();
    const vantar = [...new Set((ids || []).map(Number).filter((x) => x > 0))]
      .filter((id) => force || !_sott.has(id) || nu - _sott.get(id) > TTL_MS);
    if (!vantar.length) return;
    const fyrri = _bid;
    const p = (async () => { try { if (fyrri) await fyrri; } catch (_) {} await saekja(vantar); })();
    _bid = p.catch(() => {});
    await p;
  }

  function stada(uid) {
    const x = _lina.get(+uid);
    if (!x) return null;
    const { lina, verk } = x;
    const svc = thjonusta(lina.service);
    const grunnur = { num: verk.num || '', jobId: verk.id, jobStatus: verk.status, lineStatus: lina.status, svc, svcLabel: DISP[svc] || '' };
    if (verk.status === 'collected') {
      const dags = Date.parse(verk.dropoff || verk.created_at) || 0;
      if (!dags || Date.now() - dags > GLUGGI_DAGA * 86400000) return null;
      return Object.assign(grunnur, { kind: lina.status === 'broken' ? 'onytt_skilad' : 'skilad', stadfest: true });
    }
    if (lina.status === 'broken') return Object.assign(grunnur, { kind: 'onytt', stadfest: false });
    if (lina.status === 'done') return Object.assign(grunnur, { kind: 'tilbuid', stadfest: false, tilAfhendingar: verk.status === 'ready' });
    return Object.assign(grunnur, { kind: 'verkstaedi', stadfest: false });
  }
  // Rukkast á verkbeiðninni → á ekki heima í ársskoðunarkostnaðinum (Agnar 29.09).
  const rukkadA = (uid) => !!stada(uid);
  const undirskrift = (uid) => {
    const s = stada(uid);
    if (!s) return '-';
    let u = null;
    try { u = ((window.DB && DB.cache && DB.cache.units) || []).find((x) => +x.id === +uid); } catch (_) {}
    return [s.kind, s.num, s.lineStatus, s.jobStatus, u && u.status, u && u.last_insp, u && u.next_insp].join('|');
  };

  function tilkynna(breytt) {
    if (!breytt.length) return;
    _hlust.forEach((fn) => { try { fn(breytt); } catch (_) {} });
  }
  function merkjaBreytingar(ids) {
    const breytt = [];
    ids.forEach((id) => {
      const s = undirskrift(id);
      // óséð tæki telst „engin staða" — svo tæki sem reynist vera á verkstæði við fyrstu sókn fær merkið strax
      if ((_sig.has(id) ? _sig.get(id) : '-') !== s) breytt.push(id);
      _sig.set(id, s);
    });
    return breytt;
  }

  // ── opinn prófíll ──────────────────────────────────────────────────────────
  const opidId = () => { const n = parseInt(window._currentCompanyId, 10); return isFinite(n) && n > 0 ? n : null; };
  const profillSynilegur = () => {
    const v = document.getElementById('view-companies'), main = document.getElementById('companies-main');
    return !!(v && main && v.classList.contains('active') && main.querySelector('.ut-list') && document.visibilityState === 'visible');
  };
  const taekiFelags = (coId) => {
    const all = (window.DB && DB.cache && Array.isArray(DB.cache.units)) ? DB.cache.units : [];
    return all.filter((u) => u && +u.fyrirtaeki_id === +coId).map((u) => +u.id);
  };

  // Sækja (TTL eða þvingað), finna raðir sem breyttust og teikna AÐEINS þær aftur.
  async function beita(coId, ids, force) {
    try { await ensure(ids, { force }); } catch (_) { return; }   // netvilla: engu breytt, reynt aftur í næsta púls
    const breytt = merkjaBreytingar(ids);
    if (!breytt.length || opidId() !== +coId) return;
    try { if (window.UttektTaeki && UttektTaeki.uppfaeraRadir) UttektTaeki.uppfaeraRadir(coId, breytt); } catch (_) {}
    try { if (typeof window.recomputeCompanyTotalCost === 'function') window.recomputeCompanyTotalCost(); } catch (_) {}
    tilkynna(breytt);
  }
  async function endurnyja(force) {
    const coId = opidId();
    if (!coId || !profillSynilegur()) return;
    const ids = taekiFelags(coId);
    if (ids.length) await beita(coId, ids, force);
  }

  // (1) skrift í þessum vafra → lesa strax aftur (dregið saman)
  let _t = null;
  document.addEventListener('gogn-skrifud', (e) => {
    const t = (e.detail && e.detail.tafla) || '';
    if (!/^(verklidur|verkbeidnir|uttaeki|solur)$/.test(t)) return;
    _sott.clear();
    clearTimeout(_t);
    _t = setTimeout(() => { endurnyja(true); tilkynna(['*']); }, 400);
  });
  // (2) púls á meðan prófíll er opinn og sýnilegur (önnur vél breytti á verkstæðinu)
  setInterval(() => { endurnyja(true); }, PUSL_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') endurnyja(true); });

  // Stílar — Brunastál C (402): sama plötumerki og .ut-last, litur segir stöðuna. `:not(#_p422)` lyftir
  // sértækninni yfir 402-reglurnar án !important.
  if (!document.getElementById('_p422-css')) {
    const S = '#companies-main .ut-list:not(#_p422) ';
    const css = [
      // punkturinn er ::before — 404 fletur merkið út í texta við uppröðun, svo innri <i> myndi hverfa
      S + '.ut-last.vt{color:#3a4250;gap:5px;font-variant-numeric:tabular-nums}',
      S + '.ut-last.vt::before{content:"";width:6px;height:6px;border-radius:50%;flex:none;background:#8a93a3;display:inline-block;margin-right:5px;vertical-align:middle}',
      S + '.ut-last.vt-verkstaedi{color:#845400}' + S + '.ut-last.vt-verkstaedi::before{background:#d39a1b}',
      S + '.ut-last.vt-tilbuid{color:#1d4ed8}' + S + '.ut-last.vt-tilbuid::before{background:#2563eb}',
      S + '.ut-last.vt-onytt,' + S + '.ut-last.vt-onytt_skilad{color:#b42318}' + S + '.ut-last.vt-onytt::before,' + S + '.ut-last.vt-onytt_skilad::before{background:#c92a2a}',
      S + '.ut-last.vt-skilad{color:#0b6b3a}' + S + '.ut-last.vt-skilad::before{background:#16783f}',
      // hakið: bíður = strikaður rammi; staðfest = grænt með innri hring (sést að það er læst)
      S + '.ut-check.vt-bid{border-style:dashed;color:#b8bfca;cursor:help}',
      S + '.ut-check.vt-stadfest{cursor:default;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 1px 2px rgba(0,0,0,.2)}',
      // þjónustuvalið er læst á meðan verkbeiðnin á tækið — plássið helst svo hökin standi í röð
      S + '.ut-svcseg.vt-laest{opacity:.45;pointer-events:none}',
      S + '.ut-onytt.vt-laest{visibility:hidden}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_p422-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  window.VerkTenging = {
    ensure, stada, rukkadA,
    onChange: (fn) => { _hlust.add(fn); return () => _hlust.delete(fn); },
    endurnyja: () => endurnyja(true),
    // 224 kallar á þetta við hverja teikningu listans; TTL ræður hvort sótt er (ódýrt að kalla oft).
    nyrListi: (coId, ids) => beita(coId, ids, false),
    GLUGGI_DAGA,
  };
  console.log('[422 verkstaedi-tenging] v1 — verkbeiðnarlínan ræður stöðu tækis í prófíl/kostnaði/verkstæði');
})();
/* === END VERKSTÆÐI ↔ FYRIRTÆKJAPRÓFÍLL === */
