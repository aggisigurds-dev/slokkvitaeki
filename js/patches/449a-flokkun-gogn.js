/* === FLOKKUN VIÐSKIPTAVINA — GÖGN (449a) — 09.10.2026 ==========================================================
 *
 * Agnar 08.10.2026: „mismuninn eftir tegund fasteignar og rekstrar, svo það sé síðar hægt að flokka alla okkar
 * viðskiptavini … setja síðan filter kerfi á þarna svo við getum séð hvaða eignir/fasteignir falla undir hvaða flokk
 * … hvort þau séu með slíkt kerfi eða hvort það vanti. spotta ný tækifæri … finna út sirka verðin sem þeir eru að
 * greiða og við þá gefið þeim betra tilboð".
 *
 * EINN STAÐUR fyrir lestur og skrif flokkunarinnar. Tveir notendur:
 *   449b — „Flokkun viðskiptavina"-flipinn á Reglur-síðunni (sía yfir alla staði)
 *   450  — spjaldið „Kerfi og þjónusta" á fyrirtækjaprófílnum
 *
 * LESTUR: aðeins sýnirnar v_stadur_flokkun og v_stadur_kerfi (+ flokkar_krofur fyrir tegundalistann og kröfur kerfa
 * sem eiga enga röð). Sýnirnar reikna tegund = coalesce(handval, sjálfvirkt), skylt og tækifæri — viðmótið endurreiknar
 * ekkert af því.
 *
 * SKRIF — aðeins handvalsreitir, aldrei sjálfvirku dálkarnir (tools/audit-flokkun.cjs vaktar):
 *   stadur_flokkun  → tegund_handval, handval_af, handval_at       (update; engin innsetning úr vafra — RLS leyfir hana ekki)
 *   stadur_kerfi    → til_stadar, thjonustuadili, verd_ar, samningur_til, athugasemd, skrad_af
 *                     (upsert á (fyrirtaeki_id, kerfi): röð sem vantar verður til. `uppruni` er ALDREI sent — þjónninn
 *                      setur 'handvirkt' sjálfgefið við innsetningu og trigger stadur_kerfi_snert við breytingu.)
 * Hver skrift les `.error` OG fjölda raða sem komu til baka: uppfærsla sem snertir 0 raðir skilar ekki villu í
 * PostgREST („tómt svar er ekki staðreynd").
 *
 * VISTUN VIÐ LOKUN: kallarinn skráir óvistaða breytingu með biðVistun(); 365 kallar skolaVidLokun() á pagehide og
 * hún sendir beint á PostgREST með keepalive (venjulegt supabase-js fetch deyr með síðunni — mælt 09.09). Biðfærslan
 * stendur þar til venjulega leiðin staðfestir hana (lexía 361).
 * ================================================================================================================ */
(() => {
  if (window.Flokkun) return;

  const sb = () => (window.DB && window.DB.sb) || null;

  // Röðin hér er röðin í viðmótinu. stutt = merki á listanum (Flokkun) og í ræmu spjaldsins.
  const KERFI = [
    { k: 'slokkvitaeki', heiti: 'Slökkvitæki', stutt: 'Slt' },
    { k: 'slongukefli', heiti: 'Slöngukefli', stutt: 'Slöng' },
    { k: 'reykskynjarar', heiti: 'Reykskynjarar', stutt: 'Reyk' },
    { k: 'brunavidvorunarkerfi', heiti: 'Brunaviðvörunarkerfi', stutt: 'Bvk' },
    { k: 'vatnsudakerfi', heiti: 'Vatnsúðakerfi', stutt: 'Úði' },
    { k: 'neydarlysing', heiti: 'Neyðarlýsing', stutt: 'Neyð' },
    { k: 'utljos', heiti: 'Útljós / leiðamerkingar', stutt: 'Útljós' },
    { k: 'reyklosun', heiti: 'Reyklosun', stutt: 'Reykl' },
    { k: 'eldvarnarteppi', heiti: 'Eldvarnarteppi', stutt: 'Teppi' },
    { k: 'brunathettingar', heiti: 'Brunaþéttingar', stutt: 'Þétt' },
    { k: 'eldvarnaeftirlit', heiti: 'Eldvarnaeftirlit (árlegt)', stutt: 'Eftirl' },
    { k: 'slokkvikerfi_eldhus', heiti: 'Slökkvikerfi í eldhúsháfi', stutt: 'Eldhús' },
    { k: 'rymingaruppdrattur', heiti: 'Rýmingaruppdráttur', stutt: 'Rým' },
    { k: 'fjoldaskilti', heiti: 'Fjöldaskilti (hámarksfjöldi)', stutt: 'Fjöldi' },
  ];
  const KERFI_MAP = new Map(KERFI.map((x) => [x.k, x]));
  // Tækifæri — reiknað í v_stadur_kerfi. led = litur ljóssins (442 .ssp-led).
  const TAEKIFAERI = {
    a: { heiti: 'Skylt — vantar', stutt: 'Vantar', led: 'rautt' },
    b: { heiti: 'Hjá öðrum — tilboð', stutt: 'Hjá öðrum', led: 'gull' },
    c: { heiti: 'Óvitað — spyrja', stutt: 'Óvitað', led: '' },
    d: { heiti: 'Okkar — í lagi', stutt: 'Okkar', led: 'graent' },
  };
  const VISSA = { ha: 'Há', midlungs: 'Miðlungs', lag: 'Lág', handval: 'Handval' };
  const TIL_STADAR = { ja: 'Já', nei: 'Nei', ovitad: 'Óvitað' };
  const SKYLT = { ja: 'Skylt', skilyrt: 'Skilyrt', nei: 'Ekki skylt' };

  // Dálkar sem vafrinn má skrifa. Allt annað (tegund_sjalfvirk, vissa, m2_sjalfvirkt, skylt_sjalfvirkt, visbending,
  // smaatridi, heimild, uppruni …) á sjálfvirka keyrslan eða þjónninn.
  const KERFI_REITIR = ['til_stadar', 'thjonustuadili', 'verd_ar', 'samningur_til', 'athugasemd'];
  const FLOKKUN_REITIR = ['tegund_handval', 'handval_af', 'handval_at'];

  const DALKAR_FL = 'fyrirtaeki_id,nafn,heimilisfang,kennitala,tegund,tegund_heiti,notkunarflokkur,vissa,m2,haedir,folksfjoldi,tegund_sjalfvirk,tegund_handval,rokstudningur,heimild,flokkad_at';
  const DALKAR_FL_LISTI = 'fyrirtaeki_id,nafn,heimilisfang,kennitala,tegund,tegund_heiti,notkunarflokkur,vissa,tegund_handval';
  const DALKAR_KE = 'fyrirtaeki_id,kerfi,til_stadar,skylt,skilyrdi,krafa_heimild,krafa_url,thjonustuadili,verd_ar,samningur_til,heimild,visbending,smaatridi,athugasemd,uppruni,uppfaert,taekifaeri';
  const DALKAR_KE_LISTI = 'fyrirtaeki_id,kerfi,til_stadar,skylt,thjonustuadili,verd_ar,taekifaeri,uppruni';

  function notandi() {
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return String(p.nafn);
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return String(u.email).split('@')[0];
    } catch (_) {}
    return 'Slökkvitæki';
  }
  // DB.sb verður til á DOMContentLoaded (DB.init) — djúptengill á #reglur/flokkun kallar fyrr. Beðið, ekki gefist upp.
  async function tengdur() {
    for (let i = 0; i < 200; i++) {
      const c = sb();
      if (c && window.DB && typeof DB.fetchAll === 'function') return c;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Gagnagrunnurinn er ekki tengdur');
  }
  const villuTexti = (e) => String((e && (e.message || e.details || e.hint)) || e || 'óþekkt villa').slice(0, 200);
  function skraVandamal(hvar, e) { try { if (typeof window.logProblem === 'function') window.logProblem('flokkun_' + hvar, villuTexti(e)); } catch (_) {} }
  function bodaBreytingu(detail) { try { document.dispatchEvent(new CustomEvent('flokkun-breytt', { detail })); } catch (_) {} }

  /* ── KRÖFUR (flokkar_krofur) — sóttar einu sinni ─────────────────────────────────────────────────────────── */
  let _krofur = null, _krofurP = null;
  function krofur() {
    if (_krofur) return Promise.resolve(_krofur);
    if (_krofurP) return _krofurP;
    _krofurP = (async () => {
      const c = await tengdur();
      const radir = await DB.fetchAll((f, t) => c.from('flokkar_krofur').select('tegund,heiti,notkunarflokkur,kerfi,skylt,skilyrdi,heimild,url').order('tegund').order('kerfi').range(f, t));
      const tegundir = new Map();      // tegund → { tegund, heiti, notkunarflokkur, kerfi: Map(kerfi → röð) }
      radir.forEach((r) => {
        let t = tegundir.get(r.tegund);
        if (!t) { t = { tegund: r.tegund, heiti: r.heiti || r.tegund, notkunarflokkur: r.notkunarflokkur || '', kerfi: new Map() }; tegundir.set(r.tegund, t); }
        t.kerfi.set(r.kerfi, r);
      });
      const listi = [...tegundir.values()].sort((a, b) => (a.tegund === 'annad') - (b.tegund === 'annad') || a.heiti.localeCompare(b.heiti, 'is'));
      _krofur = { tegundir, listi };
      return _krofur;
    })();
    _krofurP.catch(() => { _krofurP = null; });
    return _krofurP;
  }

  /* ── ALLIR STAÐIR (Flokkun-flipinn) — ein sókn deilt milli kallara ───────────────────────────────────────── */
  let _allt = null, _alltP = null, _alltUrelt = false;
  function allt(ferskt) {
    if (_allt && !ferskt && !_alltUrelt) return Promise.resolve(_allt);
    if (_alltP) return _alltP;
    _alltP = (async () => {
      const c = await tengdur();
      // 3.682 kerfaraðir: PostgREST skilar mest 1000 í svari — blaðsíðuflett (minni „1000-raða þakið").
      const [stadir, kerfi, kr] = await Promise.all([
        DB.fetchAll((f, t) => c.from('v_stadur_flokkun').select(DALKAR_FL_LISTI).order('fyrirtaeki_id').range(f, t)),
        DB.fetchAll((f, t) => c.from('v_stadur_kerfi').select(DALKAR_KE_LISTI).order('fyrirtaeki_id').order('kerfi').range(f, t)),
        krofur(),
      ]);
      const perStad = new Map();
      kerfi.forEach((r) => { let a = perStad.get(r.fyrirtaeki_id); if (!a) perStad.set(r.fyrirtaeki_id, (a = [])); a.push(r); });
      _allt = { stadir, kerfi, perStad, krofur: kr, saott: Date.now() };
      _alltUrelt = false;
      return _allt;
    })();
    const p = _alltP;
    p.then(() => { if (_alltP === p) _alltP = null; }, () => { if (_alltP === p) _alltP = null; });
    return p;
  }

  /* ── EINN STAÐUR (prófílspjaldið) ─────────────────────────────────────────────────────────────────────────── */
  async function stadur(fid) {
    fid = parseInt(fid, 10);
    if (!(fid > 0)) throw new Error('Ógilt fyrirtækjanúmer');
    const c = await tengdur();
    const [f, k, kr] = await Promise.all([
      c.from('v_stadur_flokkun').select(DALKAR_FL).eq('fyrirtaeki_id', fid).maybeSingle(),
      c.from('v_stadur_kerfi').select(DALKAR_KE).eq('fyrirtaeki_id', fid),
      krofur(),
    ]);
    if (f.error) throw f.error;
    if (k.error) throw k.error;
    return { fid, flokkun: f.data || null, kerfi: k.data || [], krofur: kr, saott: Date.now() };
  }

  /* ── SKRIF: leiðrétta tegund ─────────────────────────────────────────────────────────────────────────────── */
  // tegund = nýja tegundin (úr flokkar_krofur) eða null til að fella handvalið niður (sjálfvirka tegundin gildir þá).
  async function leidrettaTegund(fid, tegund) {
    fid = parseInt(fid, 10);
    if (!(fid > 0)) throw new Error('Ógilt fyrirtækjanúmer');
    const kr = await krofur();
    if (tegund != null && !kr.tegundir.has(tegund)) throw new Error('Óþekkt tegund: ' + tegund);
    const c = await tengdur();
    const gogn = { tegund_handval: tegund == null ? null : tegund, handval_af: notandi(), handval_at: new Date().toISOString() };
    const r = await c.from('stadur_flokkun').update(gogn).eq('fyrirtaeki_id', fid).select('fyrirtaeki_id,tegund_handval');
    if (r.error) { skraVandamal('tegund', r.error); throw r.error; }
    if (!r.data || r.data.length !== 1) throw new Error('Staðurinn er ekki í flokkunartöflunni — ekkert vistað');
    _alltUrelt = true;
    bodaBreytingu({ fid, tegund: true });
    return r.data[0];
  }

  /* ── SKRIF: kerfi staðar ─────────────────────────────────────────────────────────────────────────────────── */
  function hreinsaKerfisGogn(breyting) {
    const gogn = {};
    KERFI_REITIR.forEach((k) => { if (breyting && Object.prototype.hasOwnProperty.call(breyting, k)) gogn[k] = breyting[k]; });
    if ('til_stadar' in gogn && !TIL_STADAR[gogn.til_stadar]) throw new Error('Ógilt gildi á „til staðar"');
    if ('verd_ar' in gogn && gogn.verd_ar != null && !(isFinite(gogn.verd_ar) && gogn.verd_ar >= 0)) throw new Error('Ógilt verð');
    if ('samningur_til' in gogn && gogn.samningur_til != null && !/^\d{4}-\d{2}-\d{2}$/.test(gogn.samningur_til)) throw new Error('Ógild dagsetning');
    ['thjonustuadili', 'athugasemd'].forEach((k) => { if (k in gogn) { const s = gogn[k] == null ? '' : String(gogn[k]).trim(); gogn[k] = s || null; } });
    return gogn;
  }
  async function vistaKerfi(fid, kerfi, breyting) {
    fid = parseInt(fid, 10);
    if (!(fid > 0)) throw new Error('Ógilt fyrirtækjanúmer');
    if (!KERFI_MAP.has(kerfi)) throw new Error('Óþekkt kerfi: ' + kerfi);
    const gogn = hreinsaKerfisGogn(breyting);
    if (!Object.keys(gogn).length) throw new Error('Engin breyting');
    const c = await tengdur();
    // Upsert á lykilinn: aðeins reitirnir hér fara í SET-listann við árekstur, svo sjálfvirku dálkarnir (smaatridi,
    // visbending, skylt_sjalfvirkt …) standa óhreyfðir. uppruni er ekki sendur (sjá haus).
    const rod = Object.assign({ fyrirtaeki_id: fid, kerfi }, gogn, { skrad_af: notandi() });
    const r = await c.from('stadur_kerfi').upsert(rod, { onConflict: 'fyrirtaeki_id,kerfi' }).select('fyrirtaeki_id,kerfi,uppruni,uppfaert');
    if (r.error) { skraVandamal('kerfi', r.error); throw r.error; }
    if (!r.data || r.data.length !== 1) throw new Error('Vistun skilaði engri röð — ekkert staðfest');
    const v = await c.from('v_stadur_kerfi').select(DALKAR_KE).eq('fyrirtaeki_id', fid).eq('kerfi', kerfi).maybeSingle();
    if (v.error) throw v.error;
    _alltUrelt = true;
    bodaBreytingu({ fid, kerfi });
    // Röðin sem sýnin reiknar (skylt, tækifæri). null ef staðurinn er ekki flokkaður — þá dugar skrifaða röðin.
    return v.data || Object.assign({}, r.data[0], gogn);
  }

  /* ── VISTUN VIÐ LOKUN ────────────────────────────────────────────────────────────────────────────────────── */
  const _bid = new Map();      // `${fid}|${kerfi}` → { fid, kerfi, gogn }
  function bidVistun(fid, kerfi, breyting) {
    const lykill = fid + '|' + kerfi;
    const fyrir = _bid.get(lykill);
    _bid.set(lykill, { fid, kerfi, gogn: Object.assign({}, fyrir ? fyrir.gogn : {}, breyting) });
  }
  function stadfestVistun(fid, kerfi, reitir) {
    const lykill = fid + '|' + kerfi;
    const b = _bid.get(lykill);
    if (!b) return;
    (reitir || Object.keys(b.gogn)).forEach((k) => { delete b.gogn[k]; });
    if (!Object.keys(b.gogn).length) _bid.delete(lykill);
  }
  function skolaVidLokun() {
    if (!_bid.size) return;
    const url = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    const key = window.SUPABASE_KEY;
    if (!url || !key) return;
    _bid.forEach((b) => {
      let gogn;
      try { gogn = hreinsaKerfisGogn(b.gogn); } catch (_) { return; }
      if (!Object.keys(gogn).length) return;
      try {
        fetch(url + '/rest/v1/stadur_kerfi?on_conflict=fyrirtaeki_id,kerfi', {
          method: 'POST', keepalive: true,
          headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(Object.assign({ fyrirtaeki_id: b.fid, kerfi: b.kerfi }, gogn, { skrad_af: notandi() })),
        }).catch(() => {});
      } catch (_) {}
    });
    // _bid stendur: lifi síðan af (pagehide kemur líka við flipaskipti/bfcache) staðfestir næsta vistun hana.
  }
  (function skraUtskolun() {
    if (window.VistunarSkol && typeof VistunarSkol.skra === 'function') { VistunarSkol.skra(skolaVidLokun); return; }
    // 365 hleðst á undan (stök skrifta); ef ekki, eigin hlustari — sama aðgerð.
    window.addEventListener('pagehide', skolaVidLokun);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') skolaVidLokun(); });
  })();

  /* ── HJÁLPARAR fyrir viðmótin ────────────────────────────────────────────────────────────────────────────── */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtKr = (n) => (n == null || n === '' || !isFinite(n)) ? '' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  // Geymt YYYY-MM-DD, birt DD/MM/YYYY (minni „Dagsetningar DD/MM/YYYY").
  const birtaDags = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  function lesaDags(s) {
    s = String(s || '').trim();
    if (!s) return null;
    let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
    if (!m) { const i = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (i) m = [s, i[3], i[2], i[1]]; }
    if (!m) return undefined;
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1990 || y > 2100) return undefined;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function lesaKr(s) {
    s = String(s == null ? '' : s).replace(/kr\.?/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return isFinite(n) && n >= 0 ? Math.round(n) : undefined;
  }
  const erOkkar = (adili) => /^okkar/i.test(String(adili || '').trim());

  window.Flokkun = {
    KERFI, KERFI_MAP, TAEKIFAERI, VISSA, TIL_STADAR, SKYLT, KERFI_REITIR, FLOKKUN_REITIR,
    krofur, allt, stadur, leidrettaTegund, vistaKerfi,
    bidVistun, stadfestVistun, skolaVidLokun,
    erUrelt: () => _alltUrelt,
    esc, fmtKr, birtaDags, lesaDags, lesaKr, erOkkar, villuTexti, notandi,
    version: '449a',
  };
})();
/* === END FLOKKUN GÖGN === */
