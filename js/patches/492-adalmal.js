/* === AÐALMÁL — SÉR BORÐ FYRIR ÞAÐ SEM SKIPTIR MESTU (492) — 02.11.2026 ==========================
 *
 * Agnar 02.11.2026, nýkominn úr viku fríi: „taktu saman kannski 10 mikilvægustu atriðin sem er búið að gerast,
 * fundir/deadlines næstu daga, og hvað það er sem mikilvægast á eftir að gera … á einhvern áberandi stað". Fyrst fór
 * það sem mál #1376 efst á Þjónustuborði, en: „Svoo rosalega mikið af atriðum þarna inni … Gera kannski bara sér
 * borð/glugga fyrir þessi aðalmál."
 *
 * HVAÐ ÞETTA ER: ein róleg síða með þrjá hluta — Fundir og frestir · Það sem skiptir mestu · Hvað gerðist (samanbrotið
 * á síma) — og ekkert annað. ENGIN NÝ TAFLA: textinn er Þjónustuborðsmál með merkinu `adalmal` í thjonustubeidni.tags,
 * skrifað af Claude. Sniðið í notes: línur sem byrja á „A · ", „B · ", „C · " eru hlutar; „• " og „1. " línur eru
 * atriði; lína sem byrjar á „Spurningar" er spurningar til Agnars, aðskildar með „ · ".
 *   → Ný vika = Claude skrifar nýtt mál með sama merki (SQL). Síðan les sig sjálf; ekkert deploy.
 * ✓ á atriði = klárað. Geymt í thjonustubord_falid undir lyklinum adalmal:atridi:<mál>-<hluti>-<nr> — sama tafla og Fela á
 * borðinu (368/489), samstillt á allar vélar, aldrei eytt. Kláruð atriði fara neðst, strikuð, „N klárað · sýna".
 * „Á borðið" opnar málið á Þjónustuborðinu (Bord368.opnaMal) þar sem má svara, fela og breyta textanum.
 *
 * 492b (10.11.2026): viðbót aftan við yfirlitið sem byrjar á þankastriki („— Athugasemd 03.11.2026 (Claude): …",
 * „— Endurmælt …", „— Leiðrétt og lokað …") fer í eigin hluta „Leiðrétt eftir endurmælingu", nýjasti kaflinn efst. Áður
 * rann hún inn í Spurningar (mælt á #1376: 10 af 13 „spurningum" voru endurmælingar, borðið taldi 39 atriði í stað 29).
 * Borðið les aðeins OPIN mál; sé ekkert opið segir það hvaða yfirliti var lokað síðast og hvers vegna (lokid_at,
 * lokid_lysing) svo tómt borð lesist ekki sem bilun. Yfirlit sem er 7 daga eða eldra fær aldursmerki.
 *
 * 492c (11.11.2026): fyrirsögnin „SPURNINGAR TIL ÞÍN" án tvípunkts er aðeins haus. Áður varð hún sjálf að fyrstu
 * „spurningunni" með eigin ✓ (mælt á #1587: 6 spurningar í stað 5, 27 atriði í stað 26). Með tvípunkti gildir áfram
 * gamla sniðið: spurningar á sömu línu, aðskildar með „ · ".
 *
 * 492d (16.11.2026, Agnar: „geturðu líka gert þetta aðalatriða borðið þitt eitthvað interactive, ég get ekki gert rassgat
 * þarna eða látið þig vita svörin eða svarað póstum eða neitt, þetta er ekki multifunctional aðalborð"). Borðið GERIR nú:
 *   · Spurning → reitur „Senda svar til Claude": svarið fer til Charlize (topic akvardanir-agnars) og á Verkefnalistann
 *     sem verk („vinna úr svari Agnars"), lesið til baka og sýnt undir spurningunni.
 *   · Atriði (A/C) → „Ákveða": Já / Nei (ákvörðun til Charlize; Nei = ekki lagt til aftur) · Seinna (hverfur í 3 daga) ·
 *     Á Verkefnalistann (Claude vinnur verkið). Athugasemd má fylgja.
 *   · Tilbúið til afgreiðslu: forunnu verkin úr Afgreiðslu (póstsvar, krafa, símtal, verk) beint á borðinu — sama spjald,
 *     sömu athuganir, sami rauði takki (tvö tök) og afgreidsla.html.
 * 492f (16.11.2026, Agnar valdi „A fyrst, svo B"): „✦ Biddu Claude" á hverju atriði og spurningu — fyrirmæli (má sleppa),
 *   Opus les atriðið og gögnin sem það nefnir (_adalmal-claude.cjs, bakgrunnsfall) og skilar svari, staðreyndum með heimildum
 *   og MEST EINNI tillögu (verk eða póstsvar); einn takki samþykkir (verk → Verkefnalisti, póstsvar → Tilbúið til afgreiðslu,
 *   þaðan sendir Agnar sjálfur). Á spurningum: „Nota sem drög að svari þínu". Takkinn sést aðeins þegar rofinn er á
 *   (app_kv adalmal_claude). Borðið kannar röðina á 4 s fresti meðan Claude vinnur.
 * 492e (16.11.2026): R-númer í textanum og hver heimild á afgreiðsluspjaldi opnar skjalið sjálft (reikningur/skýrsla
 *   sem PDF, pósturinn í Gmail, Payday-PDF); athugasemd á hvert afgreiðsluverk og hvert atriði („Vista athugasemd").
 *   Allt fer um SÖMU vél: /api/afgreidsla (netlify/functions/afgreidsla.cjs) — aðeins innskráður stjórnandi, læst röð á
 *   hvert atriði, einkvæmur lykill adalmal:<mál>-<hluti>-<nr> (sama sæti og ✓-lykillinn). Enginn takki „merkir" bara:
 *   hver segir hvert hann skrifar.
 *
 * Mynstur: 491-vasinn.js (view-<key>, App.switchView-umbúðir, Brunastál). Skrifar aðeins við raunverulegan smell.
 * Skráð í Öpp (261 PAGES: 'adalmal') og sett á Boss- og Þjónustuborðs-appið á eftir Þjónustuborðinu (__adm1/__adm2).
 * ============================================================================================ */
(() => {
  if (window.__adalmal492) return;
  window.__adalmal492 = true;

  const VIEW_ID = 'view-adalmal', NAV_KEY = 'adalmal', ROOT_ID = '_adm-root', MERKI = 'adalmal', EINING = 'adalmal';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* 18.11.2026 — LESTUR Á FLATRI SETNINGU (Agnar: „hörmulegt að lesa svona. gersamlega bara flatur texti").
   * Línurnar í „Tilbúið til afgreiðslu" eru ein setning hver: aðili, staða, upphæð, aldur og aðgerð, allt á
   * sömu þyngd — t.d. „Hertz (Bílaleiga Flugleiða): R-001071 upp á 114.050 kr. hefur verið ógreiddur í 47 daga
   * — staðfesta að reikningurinn hafi borist". Augað hefur hvergi að grípa.
   * Textinn er ÓBREYTTUR; hann er aðeins brotinn upp eftir á:
   *   · aðilinn — allt fram að fyrsta tvípunkti innan 70 stafa — verður feitur,
   *   · upphæðir og dagafjöldi fá töflutölustafi svo tölur raðist undir tölur.
   * Unnið á ESCAPE-UÐUM streng, svo ekkert sem kemur úr gögnunum getur orðið að marki. */
  /* 18.11.2026 — SANNINDAMERKIÐ FREMST Í RÖKUM (Agnar: „Já, rökin líka").
   * Rökin undir „Af hverju þetta er rétt" byrja mörg á hástafaorði sem segir hversu traust þau eru:
   * ÓSTAÐFEST, STAÐFEST, MÆLT, MAT, ÁLYKTUN, ÓSANNREYNT, ÓVÍST, ÁÆTLUN, ATH. Mælt í afgreidsla.af_hverju
   * 18.11.2026: ÓSTAÐFEST 18, STAÐFEST 2, MAT 2, ÓSANNREYNT 2, ÁÆTLUN 2, ÓVÍST 1, ATH 1, MÆLT 1, ÁLYKTUN 1.
   * Merkið lá inni í málsgreininni og hvarf í henni. Það fer núna fremst sem pilla með lit eftir því hvort
   * rökin standa á mælingu eða ágiskun — sama regla og gildir annars staðar: mælt með heimild, eða ÓMÆLT. */
  const ROK_MERKI = { 'STAÐFEST': '_ok', 'MÆLT': '_ok', 'SANNREYNT': '_ok',
    'ÓSTAÐFEST': '_vidv', 'ÓSANNREYNT': '_vidv', 'ÓVÍST': '_vidv', 'ÓMÆLT': '_vidv',
    'MAT': '_mat', 'ÁLYKTUN': '_mat', 'ÁÆTLUN': '_aaet', 'ATH': '_ath', 'NIÐURSTAÐA': '_ath' };
  function rokTexti(txt) {
    const r = String(txt ?? '');
    const m = r.match(/^([A-ZÁÐÉÍÓÚÝÞÆÖ][A-ZÁÐÉÍÓÚÝÞÆÖ ]{1,22})([:,])\s*/);
    if (!m) return sundur(r);
    const heiti = m[1].trim();
    return '<span class="ad-rmerki ' + (ROK_MERKI[heiti] || '_ath') + '">' + esc(heiti) + '</span>' + sundur(r.slice(m[0].length));
  }

  function sundur(txt) {
    let t = esc(txt);
    const k = t.indexOf(': ');
    if (k > 0 && k < 70 && !/[.!?]/.test(t.slice(0, k))) t = '<b class="ad-adili">' + t.slice(0, k) + '</b>' + t.slice(k);
    t = t.replace(/\d[\d.]*(?:,\d+)? kr\.?/g, m => '<span class="ad-tala">' + m + '</span>');
    t = t.replace(/\b\d+(?:[–-]\d+)? (?:daga|dagar|dögum|mánuði|mánuðum)\b/g, m => '<span class="ad-ald">' + m + '</span>');
    return t;
  }
  const p2 = n => String(n).padStart(2, '0');
  const dags = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const kl = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const sb = () => (window.DB && DB.sb) || null;
  const nu = () => { try { return (window.Samthykkja && Samthykkja.nu()) || (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const mjor = () => window.innerWidth <= 760;
  const toast = (m, w) => { try { if (window.Bord368 && Bord368.toast) return Bord368.toast(m, w); } catch (_) {} try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {} try { if (window.App && App.toast) return App.toast(m); } catch (_) {} console[w ? 'warn' : 'log']('[492] ' + m); };

  // Hlutarnir: lykill í notes → heiti, röð á síðunni og hvort hann er opinn á síma. B (hvað gerðist) er samanbrotinn
  // á síma af því þar eru flestu atriðin og þau eru söguleg; A og C eru það sem þarf að GERA.
  const HLUTAR = {
    a:  { heiti: 'Fundir og frestir næstu daga', rod: 1, opinn: true,  takn: '🗓' },
    c:  { heiti: 'Það sem skiptir mestu að gera',  rod: 2, opinn: true,  takn: '➤' },
    // Leiðréttingar sem bætt var aftan við yfirlitið eftir að það var skrifað (endurmæling í grunni, lokun).
    ath: { heiti: 'Leiðrétt eftir endurmælingu',   rod: 2.5, opinn: false, takn: '↻' },
    b:  { heiti: 'Hvað gerðist',                   rod: 3, opinn: false, takn: '◦' },
    sp: { heiti: 'Spurningar til þín',             rod: 4, opinn: true,  takn: '?' }
  };

  const S = { loaded: false, loading: false, villa: null, mal: [], sidast: null, falid: {}, bid: {}, opin: {}, synaKlarad: {}, busy: {},
    // 492d — afgreiðsluvélin (/api/afgreidsla): leyfi null = óvíst (ekkert sýnt fyrr en þjónninn hefur svarað)
    af: { tilbuin: [], am: {}, tilv: {}, at: 0, loading: false, villa: null, leyfi: null, claudeVirkt: false },
    clOpid: null, clPoll: 0,
    opidAt: null, drog: {}, amBusy: {}, hlSkilabod: {}, svBreyta: {}, atKort: {},
    afOpid: null, afVopnad: null, afBusy: false, afSkilabod: null, afTexti: {}, afAthDrog: {}, afAthSk: {}, afAthBusy: false };
  const AF = '/api/afgreidsla';
  const AKVARDANLEG = { a: 1, c: 1, x: 1 };        // hlutar þar sem atriði fá Já/Nei/Seinna/Verkefnalista (B og leiðréttingar eru saga)
  const TEG = { tolvupostur: 'Póstur', krafa: 'Krafa', simtal: 'Símtal', verk: 'Verk' };
  const normT = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const idOf = s => String(s).replace(/[^a-z0-9_-]/gi, '_');
  const iDag = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  try { const d = JSON.parse(localStorage.getItem('adm_drog') || '{}'); if (d && typeof d === 'object') S.drog = d; } catch (_) {}
  const drogVista = () => { try { localStorage.setItem('adm_drog', JSON.stringify(S.drog)); } catch (_) {} };

  /* ── gögn ─────────────────────────────────────────────────────────────── */
  async function load() {
    const c = sb(); if (!c) { S.villa = 'Biðlarinn er ekki tilbúinn'; render(); return; }
    if (S.loading) return; S.loading = true; render();
    try {
      const [m, f, s] = await Promise.all([
        c.from('thjonustubeidni').select('id,title,summary,notes,status,due_at,created_at,updated_at,created_by,tags')
          .is('deleted_at', null).is('archived_at', null).or('status.is.null,status.neq.lokad')
          // tags er jsonb — strengur fer óbreyttur í cs.["adalmal"]; fylki yrði {adalmal} (Postgres-fylki) og grunnurinn
          // svarar „invalid input syntax for type json".
          .contains('tags', JSON.stringify([MERKI])).order('created_at', { ascending: false }).limit(5),
        c.from('thjonustubord_falid').select('lykill,falid').like('lykill', EINING + ':%').limit(1000),
        // Síðasta LOKAÐA yfirlit — aðeins til að skýra tómt borð (hvenær og hvers vegna því var lokað).
        c.from('thjonustubeidni').select('id,title,lokid_at,lokid_af,lokid_lysing').is('deleted_at', null).eq('status', 'lokad')
          .contains('tags', JSON.stringify([MERKI])).order('lokid_at', { ascending: false, nullsFirst: false }).limit(1)
      ]);
      if (m.error) throw m.error;
      if (f.error) throw f.error;
      S.sidast = (!s.error && s.data && s.data[0]) || null;      // skýring, ekki gögn borðsins — villa hér stoppar ekkert
      S.mal = m.data || [];
      const kort = {};
      (f.data || []).forEach(r => { kort[r.lykill] = !!r.falid; });
      S.falid = kort;
      S.loaded = true; S.villa = null;
    } catch (e) { S.villa = (e && e.message) || String(e); }
    S.loading = false; render();
    if (S.loaded && S.mal.length) loadAf();
  }

  /* ── 492d: afgreiðsluvélin — svör, ákvarðanir, tilbúin verk ──────────────── */
  async function afKall(body) {
    const r = await fetch(AF, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    j._status = r.status;
    return j;
  }
  async function loadAf() {
    if (S.af.loading) return;
    S.af.loading = true;
    try {
      const ids = S.mal.map(m => m.id).join(',');
      const r = await fetch(AF + '?adalmal=' + encodeURIComponent(ids), { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { S.af.leyfi = false; S.af.villa = 'Skráðu þig inn til að svara og afgreiða hér.'; }
      else if (r.status === 403) { S.af.leyfi = false; S.af.villa = 'Aðeins stjórnandi getur svarað og afgreitt á Aðalmálum.'; }
      else if (!r.ok) throw new Error(j.error || ('svar ' + r.status));
      else {
        S.af.leyfi = true; S.af.villa = null; S.af.tilbuin = j.tilbuin || [];
        const am = {}; (j.adalmal || []).forEach(x => { am[x.lykill] = x; }); S.af.am = am;
        S.af.tilv = j.tilvisanir || {};
        S.af.claudeVirkt = !!j.claude_virkt;
        if (S.afOpid != null && !S.af.tilbuin.some(v => v.id === S.afOpid)) S.afOpid = null;
      }
    } catch (e) { S.af.villa = 'Náði ekki í afgreiðsluna: ' + ((e && e.message) || e); }
    S.af.at = Date.now(); S.af.loading = false; render();
    kannaClaude();
  }
  // Meðan Claude vinnur á einhverju atriði er röðin könnuð á 4 s fresti (mest 5 mín. frá beiðni). Ein klukka í einu.
  function kannaClaude() {
    clearTimeout(S.clPoll); S.clPoll = 0;
    const bidur = Object.values(S.af.am).some(x => x && x.claude && x.claude.stada === 'i_vinnslu' && Date.now() - Date.parse(x.claude.at) < 5 * 60 * 1000);
    if (bidur && erVirk()) S.clPoll = setTimeout(() => { if (!S.af.loading) loadAf(); else kannaClaude(); }, 4000);
  }
  // Svar/ákvörðun á atriði — lesið til baka úr svari þjónsins (atridi) og teiknað þaðan, aldrei úr því sem var sent.
  async function amAdgerd(l, gerd, extra) {
    const at = S.atKort[l]; if (!at || S.amBusy[l]) return;
    S.amBusy[l] = true; render();
    const hk = at.mal_id + ':' + at.hluti;
    try {
      const j = await afKall(Object.assign({ adgerd: 'adalmal', mal_id: at.mal_id, hluti: at.hluti, nr: at.nr, texti: at.texti, gerd }, extra || {}));
      if (j._status === 200 && j.ok && j.atridi) {
        S.af.am[l] = j.atridi;
        S.hlSkilabod[hk] = { ok: true, texti: j.skilabod || 'Skráð.', at: Date.now(), atridi: at.texti };
        if (gerd === 'svar') { delete S.drog['sv:' + l]; S.svBreyta[l] = false; }
        delete S.drog['ath:' + l]; drogVista();
        if (gerd !== 'akvordun' || (extra && extra.akvordun !== 'ja')) S.opidAt = null;
        if (gerd === 'claude') { delete S.drog['cl:' + l]; drogVista(); S.clOpid = null; kannaClaude(); }
        if (gerd === 'claude_samthykkja') {
          const sa = j.atridi.claude && j.atridi.claude.samthykkt;
          if (sa && sa.afgreidsla_id) { S.afOpid = sa.afgreidsla_id; loadAf(); }
        }
      } else {
        S.hlSkilabod[hk] = { ok: false, texti: j.error || ('Villa ' + j._status), at: Date.now(), atridi: at.texti };
        if (j._status === 401 || j._status === 403) { S.af.leyfi = false; S.af.villa = j.error; }
      }
    } catch (e) { S.hlSkilabod[hk] = { ok: false, texti: 'Netvilla — ekkert var skráð: ' + ((e && e.message) || e), at: Date.now(), atridi: at.texti }; }
    delete S.amBusy[l]; render();
  }
  // Skráning sem á við atriðið eins og það stendur NÚNA (texti breyttur → gamla skráningin gildir ekki um nýja textann).
  const amRec = (l, texti) => { const x = S.af.am[l]; return x && normT(x.texti) === normT(texti) ? x : null; };
  const erSeinna = x => !!(x && x.akvordun === 'seinna' && x.seinna_til && x.seinna_til >= iDag());

  // Afgreiðsluverk (sama og afgreidsla.html: tvö tök á rauða takkann, textinn vistast þegar farið er úr reitnum).
  async function afFramkvaema(v) {
    if (S.afVopnad !== v.id) {
      S.afVopnad = v.id; S.afSkilabod = null; render();
      setTimeout(() => { if (S.afVopnad === v.id) { S.afVopnad = null; render(); } }, 6000);
      return;
    }
    S.afVopnad = null; S.afBusy = true; render();
    try {
      const j = await afKall({ id: v.id, adgerd: 'framkvaema', texti: v.tegund === 'tolvupostur' ? afTextiNu(v) : undefined });
      if (j._status === 200 && j.ok) {
        S.af.tilbuin = S.af.tilbuin.filter(x => x.id !== v.id); S.afOpid = null;
        S.afSkilabod = { ok: true, texti: 'Gert: ' + v.titill + '.' };
      } else {
        S.afSkilabod = { ok: false, texti: (j.error || 'Villa') + (j.urelt ? ' Verkið hefur verið tekið úr röðinni.' : '') };
        if (j.urelt) { S.af.tilbuin = S.af.tilbuin.filter(x => x.id !== v.id); S.afOpid = null; }
        else if (j.athuganir) v.athuganir = j.athuganir;
      }
    } catch (e) { S.afSkilabod = { ok: false, texti: 'Netvilla: ' + ((e && e.message) || e) }; }
    S.afBusy = false; render();
  }
  const afTextiNu = v => (v.id in S.afTexti ? S.afTexti[v.id] : (v.post || {}).texti);
  const erKlarad = l => (l in S.bid ? S.bid[l] : !!S.falid[l]);
  async function klara(l, lysing, gildi) {
    const c = sb(); if (!c) { toast('Biðlarinn er ekki tilbúinn', true); return; }
    S.bid[l] = gildi; render();
    try {
      const row = { lykill: l, eining: EINING, falid: gildi, lysing: String(lysing || '').slice(0, 200), falid_af: nu() };
      const r = await c.from('thjonustubord_falid').upsert(row, { onConflict: 'lykill' }).select('lykill,falid').single();
      if (r.error) throw r.error;
      S.falid[l] = !!(r.data && r.data.falid);
    } catch (e) { toast('Tókst ekki að vista: ' + ((e && e.message) || e), true); }
    delete S.bid[l]; render();
  }

  /* ── textinn í málinu → hlutar og atriði ───────────────────────────────── */
  // „FUNDIR OG FRESTIR NÆSTU DAGA" → „Fundir og frestir næstu daga" (hástafir í notes eru bara áhersla).
  const fegra = s => { s = String(s || '').trim(); return s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; };
  function greina(m) {
    const hl = {}, ordh = [];
    let h = null;
    const nyr = (k, heiti) => { if (!hl[k]) { hl[k] = { k, heiti, atridi: [], haus: {} }; ordh.push(k); } h = hl[k]; };
    String(m.notes || '').split(/\r?\n/).forEach(raw => {
      const l = raw.trim(); if (!l) return;
      let mm = l.match(/^([A-F])\s*[·•–-]\s*(.+)$/);
      if (mm) { const k = mm[1].toLowerCase(); nyr(k, (HLUTAR[k] && HLUTAR[k].heiti) || fegra(mm[2])); return; }
      if (/^spurningar/i.test(l)) {
        nyr('sp', HLUTAR.sp.heiti);
        // Fyrirsögn án tvípunkts („SPURNINGAR TIL ÞÍN") er aðeins haus; spurningarnar koma þá sem númeraðar línur á eftir.
        // Fyrir 492c varð fyrirsögnin sjálf að fyrstu „spurningunni" (mælt á #1587 11.11.2026: 6 í stað 5).
        const tv = l.indexOf(':');
        if (tv >= 0) l.slice(tv + 1).split(/\s·\s/).forEach(x => { x = x.trim(); if (x) h.atridi.push(x); });
        return;
      }
      // Viðbót aftan við yfirlitið (endurmæling, leiðrétting, lokun) byrjar á þankastriki: „— Athugasemd 03.11.2026 (Claude): …".
      // Hún fær eigin hluta og punktalínurnar á eftir fylgja henni. Án þessa rann hún inn í síðasta hluta (Spurningar).
      mm = l.match(/^—\s*(\S.*)$/);
      if (mm) { nyr('ath', HLUTAR.ath.heiti); h.haus[h.atridi.length] = true; h.atridi.push(mm[1].trim()); return; }
      mm = l.match(/^(?:•|-|–|\d{1,2}[.)])\s*(.+)$/);
      if (mm) { if (!h) nyr('x', 'Annað'); h.atridi.push(mm[1].trim()); return; }
      if (h && h.atridi.length) h.atridi[h.atridi.length - 1] += ' ' + l;      // framhaldslína
      else if (h) h.atridi.push(l);
      // inngangslínur (dagsetning, heimildir) eru ekki sýndar — hausinn ber dagsetninguna
    });
    return ordh.map(k => hl[k]).sort((x, y) => ((HLUTAR[x.k] || {}).rod || 9) - ((HLUTAR[y.k] || {}).rod || 9));
  }
  // Nýjasta dagsetningin í kaflahausum leiðréttinga („Endurmælt 07.11.2026 …") — updated_at málsins hreyfist ekki við viðbót.
  function sidastLeidrett(hlutar) {
    const a = hlutar.find(h => h.k === 'ath'); if (!a) return '';
    let best = 0, txt = '';
    a.atridi.forEach((t, i) => {
      if (!a.haus[i]) return;
      const d = String(t).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (!d) return;
      const n = +d[3] * 10000 + +d[2] * 100 + +d[1];
      if (n > best) { best = n; txt = p2(+d[1]) + '.' + p2(+d[2]) + '.' + d[3]; }
    });
    return txt;
  }
  // Leiðréttingar: kaflarnir í öfugri röð (nýjasti efst), línur innan kafla halda sinni röð. Lykill ✓ fylgir upphaflegu númeri.
  function nyjastEfst(radir) {
    const kaflar = [];
    radir.forEach(r => { if (r.haus || !kaflar.length) kaflar.push([]); kaflar[kaflar.length - 1].push(r); });
    return kaflar.reverse().reduce((a, k) => a.concat(k), []);
  }
  // Taflan skorðar lykilinn við ^[a-z_]+:[a-z_]+:[^\s]+$ (eining:undireining:afgangur) — talan má því ekki vera í 2. sæti.
  const lykill = (m, h, i) => EINING + ':atridi:' + m.id + '-' + h.k + '-' + i;
  const erOpinn = (m, h) => { const k = m.id + ':' + h.k; if (k in S.opin) return S.opin[k]; const d = HLUTAR[h.k]; return mjor() ? !!(d && d.opinn) : true; };

  /* ── útlit (Brunastál, sama grind og Vasinn) ────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding-bottom:96px}',
      V + '.active{display:block}',
      V + ' .ad-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .ad-haus>div{min-width:0;flex:1 1 auto}' + V + ' .ad-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .ad-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;line-height:1.4}',
      V + ' .ad-haus button{flex:none;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;font:700 12px ' + SANS + ';padding:0 10px}' + V + ' .ad-haus .uppf{width:40px;padding:0;font-size:17px}',
      V + ' .ad-mal{margin:12px}' + V + ' .ad-mal+.ad-mal{margin-top:26px;padding-top:14px;border-top:1px dashed rgba(20,24,34,.3)}',
      V + ' .ad-titill{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 2px 10px}' + V + ' .ad-titill b{font-family:' + DISP + ';font-size:17px;line-height:1.25}' + V + ' .ad-titill small{font-family:' + MONO + ';font-size:10.5px;color:#525b6b;letter-spacing:.04em}',
      V + ' .ad-grid{display:grid;grid-template-columns:1fr;gap:10px}',
      V + ' .ad-hl{border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden}',
      V + ' .ad-hl._a{border-top:4px solid #c4452f}' + V + ' .ad-hl._c{border-top:4px solid #1f6b3c}' + V + ' .ad-hl._b{border-top:4px solid #5b6577}' + V + ' .ad-hl._sp{border-top:4px solid #b8892e}' + V + ' .ad-hl._ath{border-top:4px solid #2f6fb3}',
      V + ' .ad-hl .haus{display:flex;align-items:center;gap:8px;width:100%;padding:11px 12px;border:0;background:none;text-align:left;cursor:pointer;color:#1f2530;font:700 13px ' + SANS + '}',
      V + ' .ad-hl .haus .tk{flex:none;width:24px;height:24px;border-radius:6px;background:#1f2530;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px}',
      V + ' .ad-hl .haus .n{margin-left:auto;font-family:' + MONO + ';font-size:10.5px;color:#525b6b;letter-spacing:.06em;white-space:nowrap}' + V + ' .ad-hl .haus .pil{font-size:11px;color:#525b6b}',
      V + ' .ad-hl ol{list-style:none;margin:0;padding:0 6px 8px}',
      V + ' .ad-at{display:flex;gap:10px;align-items:flex-start;padding:9px 6px;border-top:1px solid rgba(20,24,34,.08);font-size:15px;line-height:1.5;overflow-wrap:anywhere}',
      V + ' .ad-hl._b .ad-at,' + V + ' .ad-hl._ath .ad-at{font-size:13.5px}' + V + ' .ad-at._haus{border-top:2px solid rgba(20,24,34,.26);background:rgba(47,111,179,.07)}' + V + ' .ad-at._kl{opacity:.5}' + V + ' .ad-at._kl .tx{text-decoration:line-through}',
      V + ' .ad-at .nr{flex:none;min-width:22px;padding-top:2px;font-family:' + MONO + ';font-size:12px;color:#525b6b;text-align:right}',
      V + ' .ad-at .tx{flex:1;min-width:0}' + V + ' .ad-at .tx b{font-weight:700}',
      V + ' .ad-at>button{flex:none;width:34px;height:34px;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font-size:15px;cursor:pointer}' + V + ' .ad-at>button._on{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);border-color:#0b3519;color:#fff}' + V + ' .ad-at>button:disabled{opacity:.45}',
      V + ' .ad-klarad{display:flex;align-items:center;gap:8px;padding:8px 12px 10px;font:11px ' + MONO + ';color:#525b6b;letter-spacing:.06em;text-transform:uppercase;border-top:1px solid rgba(20,24,34,.08)}' + V + ' .ad-klarad button{margin-left:auto;background:none;border:0;font:600 11px ' + SANS + ';color:#2f6fb3;text-transform:none;letter-spacing:0;cursor:pointer;padding:4px 6px}',
      V + ' .ad-titill small._gamalt{color:#a3301e;font-weight:700}',
      V + ' .ad-sidast{margin:14px auto;max-width:520px;padding:10px 12px;border-radius:9px;background:#fff;border:1px solid rgba(20,24,34,.16);text-align:left;font-size:13px;line-height:1.5;color:#1f2530}' + V + ' .ad-sidast span{display:block;margin-top:4px;color:#525b6b}',
      V + ' .ad-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.6}' + V + ' .ad-villa{margin:12px;padding:12px;border-radius:9px;background:#f9e3e0;color:#7a1f14;font-size:13px}',
      V + ' .ad-hint{margin:0 12px;font:11px ' + MONO + ';color:#5b6577;line-height:1.5}',
      // 492d — aðgerðir á atriðum. Takkar: silfur (venjulegt), málmur (Nei), grænt (Já), rautt (framkvæmir út á við).
      V + ' .ad-at .tx>.txt{display:block}',
      V + ' .ad-chip{display:inline-flex;align-items:center;gap:5px;margin:5px 6px 0 0;padding:2px 8px;border-radius:4px;border:1px solid rgba(20,24,34,.2);background:#f1f3f6;font:600 11.5px/1.5 ' + SANS + ';color:#1f2530;text-decoration:none}',
      V + ' .ad-chip._ja{border-color:#1f6b3c;color:#1b4423;background:#e7f3ea}' + V + ' .ad-chip._nei{border-color:#7a1f14;color:#7a1f14;background:#fbe9e9}' + V + ' .ad-chip._s{border-style:dashed}',
      V + ' .ad-chip small{font:10.5px ' + MONO + ';color:#525b6b}',
      V + ' .ad-ak{margin:6px 0 0;min-height:30px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12px ' + SANS + ';cursor:pointer}',
      V + ' .ad-ak[aria-expanded="true"]{background:linear-gradient(180deg,#3d4048,#1c1e23);color:#eef1f4;border-color:#000}',
      V + ' .ad-rond{margin:8px 0 2px;padding:10px;border-radius:9px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);box-shadow:inset 0 1px 3px rgba(0,0,0,.08)}',
      V + ' .ad-rond input,' + V + ' .ad-rond textarea{width:100%;box-sizing:border-box;border:1px solid rgba(20,24,34,.2);border-radius:7px;background:#fff;padding:8px 10px;font:14px/1.45 ' + SANS + ';color:#1f2530}',
      V + ' .ad-rond textarea{min-height:76px;resize:vertical}',
      V + ' .ad-tk{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      V + ' .ad-tk button{min-height:38px;padding:0 13px;border-radius:8px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 13px ' + SANS + ';cursor:pointer}',
      V + ' .ad-tk button._ja{background:linear-gradient(180deg,#2f6b3a,#1b4423);border-color:#0f2a15;color:#fff}' + V + ' .ad-tk button._nei{background:linear-gradient(180deg,#3d4048,#1c1e23);border-color:#000;color:#eef1f4}',
      V + ' .ad-tk button._val{outline:2px solid #2f6fb3;outline-offset:1px}' + V + ' .ad-tk button._lt{background:none;border-color:transparent;color:#2f6fb3;font-weight:600}',
      V + ' .ad-tk button:disabled{opacity:.45;cursor:default}',
      V + ' .ad-skyr{margin-top:7px;font:11px/1.45 ' + MONO + ';color:#525b6b}',
      V + ' .ad-svar{margin:7px 0 0;padding:8px 10px;border-radius:8px;background:#f6f1e4;border:1px solid rgba(184,137,46,.45);font-size:14px;line-height:1.45}',
      V + ' .ad-svar b{font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#6b5320}' + V + ' .ad-svar p{margin:3px 0 0;white-space:pre-wrap}',
      V + ' .ad-sk{margin:6px 10px 2px;padding:8px 10px;border-radius:8px;font-size:13px;line-height:1.45;font-weight:600}' + V + ' .ad-sk._ok{background:#e7f3ea;border:1px solid #9cc9a6;color:#1b4423}' + V + ' .ad-sk._v{background:#fbe9e9;border:1px solid #e3a3a3;color:#7a0b0e}',
      V + ' .ad-sk span{display:block;font-weight:400;color:#3a4250;font-size:12px;margin-top:2px}',
      V + ' .ad-leyfi{margin:12px;padding:9px 12px;border-radius:9px;background:#fff;border:1px solid rgba(20,24,34,.16);font-size:13px;color:#3a4250}',
      // Tilbúið til afgreiðslu — sama spjald og afgreidsla.html, þjappað.
      V + ' .ad-af{margin:12px;border-radius:12px;background:#fff;border:1px solid #000;box-shadow:0 10px 26px -14px rgba(10,14,22,.5);overflow:hidden}',
      V + ' .ad-af-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;font:700 13px ' + SANS + '}',
      V + ' .ad-af-h small{font:10.5px ' + MONO + ';color:#aeb5bf;letter-spacing:.06em;text-transform:uppercase}' + V + ' .ad-af-h .grow{flex:1 1 auto}' + V + ' .ad-af-h a{color:#cfd5dd;font:600 12px ' + SANS + ';text-decoration:none}',
      V + ' .ad-af ol{list-style:none;margin:0;padding:0}',
      V + ' .ad-afr+.ad-afr{border-top:1px solid rgba(20,24,34,.1)}',
      V + ' .ad-afr>button.haus{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:8px 12px;border:0;background:none;text-align:left;cursor:pointer;color:#1f2530;font:600 14px/1.35 ' + SANS + '}',
      V + ' .ad-afr>button.haus .t{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}' + V + ' .ad-afr>button.haus .k{font:600 11.5px ' + MONO + ';color:#525b6b;white-space:nowrap}',
      // 18.11.2026 — stigveldi í flötu línunni: aðilinn fremst og feitur, smáatriðin léttari, tölur í
      // töflutölustöfum svo 114.050 og 134.446 raðist undir hvor aðra þegar augað rennur niður listann.
      V + ' .ad-afr>button.haus .t{font-weight:500;color:#3a4250}',
      V + ' .ad-afr>button.haus .t .ad-adili{font-weight:800;color:#11141c}',
      V + ' .ad-tala{font-variant-numeric:tabular-nums;font-weight:700;color:#1f2530}',
      V + ' .ad-ald{font-variant-numeric:tabular-nums;color:#6b7380}',
      V + ' .ad-rok li .ad-adili{font-weight:800;color:#11141c}',
      V + ' .ad-plata{flex:none;display:inline-flex;align-items:center;height:21px;padding:0 7px;border-radius:3px;border:1px solid rgba(20,24,34,.14);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font:700 10px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530}',
      V + ' .ad-afk{padding:4px 14px 12px}' + V + ' .ad-afk h4{margin:10px 0 5px;font:700 10.5px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      V + ' .ad-gerist{font:600 15px/1.4 ' + SANS + ';background:#f4f6f9;border:1px solid rgba(20,24,34,.14);border-left:4px solid #7a0b0e;border-radius:8px;padding:9px 11px}',
      // 18.11.2026 — rökin fá loft (4 px -> 8 px, línubil 1,55) svo málsgreinarnar renni ekki saman,
      // og sannindamerkið fremst verður pilla í stað hástafa inni í textanum.
      V + ' .ad-rok{margin:0;padding:0;list-style:none}' + V + ' .ad-rok li{padding:8px 0 8px 14px;position:relative;font-size:13.5px;line-height:1.55;border-top:1px dashed rgba(20,24,34,.14)}' + V + ' .ad-rok li:first-child{border-top:0}',
      V + ' .ad-rok li::before{top:15px}',
      V + ' .ad-rmerki{display:inline-block;margin:0 7px 0 0;padding:1px 7px;border-radius:3px;border:1px solid;font:700 9.5px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;vertical-align:1px;white-space:nowrap}',
      V + ' .ad-rmerki._ok{background:#e7f3ea;border-color:#9cc9a6;color:#14532d}',
      V + ' .ad-rmerki._vidv{background:#fdecd6;border-color:#e0b07a;color:#7c3a06}',
      V + ' .ad-rmerki._mat{background:#f3f0e6;border-color:#cbbf9c;color:#5a4a16}',
      V + ' .ad-rmerki._aaet{background:#eaf0fb;border-color:#a8bedf;color:#1d3b63}',
      V + ' .ad-rmerki._ath{background:#f1f3f6;border-color:#c5ccd6;color:#3a4250}',
      V + ' .ad-rok small{margin-top:3px}',
      /* 18.11.2026 — snertifletir á síma. Mælt með tools/simasopur.cjs í 390 px: „Á borðið" var 19 px hár
       * og hausar hlutanna 22 px. Fingur hittir ekki 19 px. Lágmarkið er 36 px í símaham; á tölvu stendur
       * þéttari hæðin óbreytt, því þar er bendill. */
      'html[data-viewmode="mobile"] ' + V + ' .ad-haus button{min-height:36px;padding:0 12px}',
      'html[data-viewmode="mobile"] ' + V + ' .ad-hl>button.haus{min-height:38px}',
      'html[data-viewmode="mobile"] ' + V + ' .ad-afr>button.haus{min-height:44px}',
      V + ' .ad-rok li::before{content:"";position:absolute;left:3px;top:11px;width:5px;height:5px;border-radius:50%;background:#3a4250}' + V + ' .ad-rok small{display:block;font:11px ' + MONO + ';color:#6b7380}',
      V + ' .ad-skeyti{background:#f7f8fa;border:1px solid rgba(20,24,34,.14);border-radius:8px;padding:9px 11px;font-size:13px}' + V + ' .ad-skeyti .m{font:11px ' + MONO + ';color:#6b7380}',
      V + ' .ad-skeyti pre{margin:4px 0 0;white-space:pre-wrap;font:13px/1.45 ' + SANS + ';color:#3a4250;max-height:180px;overflow:auto}',
      V + ' .ad-linur{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:2px 10px;font-size:13px;margin-bottom:6px}' + V + ' .ad-linur dt{font:700 10.5px/1.8 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#6b7380}' + V + ' .ad-linur dd{margin:0;overflow-wrap:anywhere}',
      V + ' .ad-akr{display:flex;flex-wrap:wrap;gap:6px}' + V + ' .ad-ak-cl{border-color:#2f4f7a;color:#1d3b63}' + V + ' .ad-ak-cl[aria-expanded="true"]{background:linear-gradient(180deg,#2f4f7a,#1d3b63);color:#fff}',
      V + ' .ad-cl{margin:8px 0 2px;padding:10px 12px;border-radius:9px;background:#eef3fa;border:1px solid rgba(47,79,122,.35);font-size:14px;line-height:1.45}',
      V + ' .ad-cl._bid{color:#1d3b63;font-weight:600}' + V + ' .ad-cl._v{background:#fbe9e9;border-color:#e3a3a3;color:#7a0b0e}' + V + ' .ad-cl small{font:500 11px ' + MONO + ';color:#525b6b;font-weight:400}',
      V + ' .ad-cl-h{font:700 11px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#1d3b63;margin-bottom:4px}' + V + ' .ad-cl-svar{margin:0 0 6px;font-weight:600}',
      V + ' .ad-cl-st{margin:0 0 6px;padding-left:16px}' + V + ' .ad-cl-st li{margin:3px 0}' + V + ' .ad-cl-hm{display:inline-block;font:500 10.5px ' + MONO + ';color:#525b6b;border:1px solid rgba(20,24,34,.18);border-radius:3px;padding:0 5px;margin-left:2px}',
      V + ' .ad-cl-om{font:500 11.5px ' + MONO + ';color:#6b5320;margin:4px 0}',
      V + ' .ad-cl-t{margin:6px 0;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid rgba(20,24,34,.16)}' + V + ' .ad-cl-t b{font-size:12.5px}' + V + ' .ad-cl-t .tt{font-weight:700;margin-top:3px}' + V + ' .ad-cl-t .tl{font-size:13px;color:#3a4250;white-space:pre-wrap;max-height:160px;overflow:auto}',
      V + ' .ad-cl-t pre{margin:6px 0 0;white-space:pre-wrap;font:13.5px/1.45 ' + SANS + ';color:#1f2530;max-height:240px;overflow:auto}',
      V + ' a.ad-opna{display:inline-block;margin-left:2px;font:600 12px ' + SANS + ';color:#1d4f91;text-decoration:none;border-bottom:1px solid rgba(29,79,145,.35)}',
      V + ' .ad-afk textarea.ad-afath{min-height:60px}',
      V + ' .ad-afk textarea{width:100%;box-sizing:border-box;min-height:150px;resize:vertical;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.15);padding:9px 11px;font:14px/1.5 ' + SANS + ';color:#141822}',
      V + ' .ad-ath{margin:0;padding:0;list-style:none}' + V + ' .ad-ath li{display:flex;gap:7px;align-items:flex-start;padding:3px 0;font-size:13px}' + V + ' .ad-ath svg{flex:0 0 16px;margin-top:2px}',
      V + ' .ad-aff{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}' + V + ' .ad-aff .grow{flex:1 1 auto}',
      V + ' .ad-aff button{min-height:40px;padding:0 14px;border-radius:8px;cursor:pointer;font:600 13px ' + SANS + ';border:1px solid rgba(20,24,34,.14);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530}',
      V + ' .ad-aff button._m{background:linear-gradient(180deg,#3d4048,#1c1e23);border-color:#000;color:#eef1f4}',
      V + ' .ad-aff button._r{min-height:46px;padding:0 18px;font-weight:700;font-size:14.5px;color:#fff;border-color:rgba(190,32,28,.55);background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)}',
      V + ' .ad-aff button._r._v{background:linear-gradient(180deg,#2f6b3a,#1b4423);border-color:#0f2a15}' + V + ' .ad-aff button:disabled{opacity:.38;cursor:default}',
      '@media (pointer:coarse){' + V + ' .ad-ak{min-height:44px}' + V + ' .ad-tk button{min-height:44px}' + V + ' .ad-aff button{min-height:44px}}',
      '@media (max-width:640px){' + V + ' .ad-aff button{flex:1 1 calc(50% - 4px)}' + V + ' .ad-aff button._r{flex:1 1 100%;order:-1}' + V + ' .ad-aff .grow{display:none}' + V + ' .ad-tk button{flex:1 1 calc(50% - 3px)}}',
      '@media (min-width:900px){' + V + ' #' + ROOT_ID + '{max-width:980px;margin:0 auto}' + V + ' .ad-grid{grid-template-columns:1fr 1fr}' + V + ' .ad-hl._b,' + V + ' .ad-hl._sp,' + V + ' .ad-hl._ath{grid-column:1/-1}}'
    ].join('\n');
  }
  function injectCss() { if (document.getElementById('_adm-css')) return; const st = document.createElement('style'); st.id = '_adm-css'; st.textContent = css(); document.head.appendChild(st); }
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="' + ROOT_ID + '"></div>';
    v.addEventListener('click', smellur);
    v.addEventListener('input', inntak);
    v.addEventListener('focusout', fokusUt);
    document.body.appendChild(v);
    return v;
  }
  // Fyrsta setningin feitletruð svo augað grípi hvað atriðið ER áður en það les hvers vegna.
  function atridiHtml(t) {
    const m = String(t).match(/^(.{8,90}?[.:—–])\s(.+)$/);
    return tengjaReikninga(m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(t));
  }
  // 492e (16.11.2026, Agnar: „ef þú ert að vísa í skýrslur eða reikninga, heimilaðu mér að geta opnað þá til að staðfesta"):
  // R-númer í textanum verður tengill á reikninginn sjálfan — AÐEINS ef þjónninn fann hann (S.af.tilv, /api/afgreidsla?adalmal).
  function tengjaReikninga(html) {
    const tv = S.af.tilv || {};
    return String(html).replace(/\bR-\d{3,6}\b/g, nr => {
      const sl = tv[nr];
      return sl && sl.url && /^https?:\/\//.test(sl.url) ? '<a class="ad-opna" href="' + esc(sl.url) + '" target="_blank" rel="noopener" title="' + esc(sl.texti || nr) + '">' + nr + ' ↗</a>' : nr;
    });
  }
  /* ── 492d: aðgerðir á atriðum ─────────────────────────────────────────────── */
  // Sami sæti og ✓-lykillinn (adalmal:atridi:<mál>-<hluti>-<nr>), en eigin lykill í afgreidsla-töflunni.
  const amLyk = (m, h, i) => EINING + ':' + m.id + '-' + h.k + '-' + i;
  const klTxt = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + ' kl. ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const dmTxt = ymd => String(ymd || '').slice(8, 10) + '.' + String(ymd || '').slice(5, 7);
  // Hvað hefur verið skráð á atriðið — lesið af þjóninum, aldrei úr því sem var sent.
  function chipHtml(x) {
    if (!x) return '';
    let c = '';
    if (x.akvordun === 'ja' || x.akvordun === 'nei') {
      c += '<span class="ad-chip _' + x.akvordun + '">' + (x.akvordun === 'ja' ? '✓ Já' : '✕ Nei') + ' <small>' + esc([x.akvordun_af, klTxt(x.akvordun_at)].filter(Boolean).join(' · ')) +
        (x.charlize_id ? ' · Charlize #' + esc(x.charlize_id) : '') + '</small></span>';
    }
    if (x.akvordun === 'seinna' && x.seinna_til) c += '<span class="ad-chip _s">⏸ ' + (erSeinna(x) ? 'Seinna — kemur aftur ' : 'Seinna rann út ') + esc(dmTxt(x.seinna_til)) + '</span>';
    if (x.verkefnalisti_id) c += '<span class="ad-chip">→ Verkefnalistinn <small>' + esc(klTxt(x.verkefnalisti_at)) + '</small></span>';
    if (x.athugasemd_agnars) c += '<span class="ad-chip"><small>💬 ' + esc(String(x.athugasemd_agnars).slice(0, 140)) + '</small></span>';
    return c ? '<div>' + c + '</div>' : '';
  }
  function rondHtml(l, x) {
    const busy = !!S.amBusy[l], dis = busy ? ' disabled' : '', v = x && x.akvordun, el = esc(l);
    const ath = S.drog['ath:' + l] != null ? S.drog['ath:' + l] : '';
    return '<div class="ad-rond">' +
      '<input type="text" id="_adm-ath-' + idOf(l) + '" data-drog="ath:' + el + '" maxlength="1000" placeholder="Athugasemd til Claude (má sleppa)" value="' + esc(ath) + '">' +
      '<div class="ad-tk">' +
        '<button type="button" class="_ja' + (v === 'ja' ? ' _val' : '') + '" data-adm="akv" data-v="ja" data-l="' + el + '"' + dis + ' title="Skráir JÁ hjá Charlize — agentarnir lesa það áður en þeir vinna">Já</button>' +
        '<button type="button" class="_nei' + (v === 'nei' ? ' _val' : '') + '" data-adm="akv" data-v="nei" data-l="' + el + '"' + dis + ' title="Skráir NEI hjá Charlize — atriðið er ekki lagt til aftur nema ný staðreynd komi fram">Nei</button>' +
        '<button type="button"' + (v === 'seinna' ? ' class="_val"' : '') + ' data-adm="akv" data-v="seinna" data-l="' + el + '"' + dis + ' title="Atriðið hverfur af borðinu í 3 daga og kemur svo aftur">Seinna · 3 dagar</button>' +
        '<button type="button" data-adm="vl" data-l="' + el + '"' + (busy || (x && x.verkefnalisti_id) ? ' disabled' : '') + ' title="Stofnar verk á Verkefnalistanum — Claude vinnur það">' + (x && x.verkefnalisti_id ? 'Á Verkefnalistanum ✓' : 'Á Verkefnalistann') + '</button>' +
        '<button type="button" class="_lt" data-adm="amath" data-l="' + el + '"' + dis + ' title="Vistar athugasemdina á atriðið án ákvörðunar">Vista athugasemd</button>' +
        (v ? '<button type="button" class="_lt" data-adm="akv" data-v="engin" data-l="' + el + '"' + dis + ' title="Fjarlægir ákvörðunina (Charlize-færslan víkur)">Taka ákvörðun til baka</button>' : '') +
      '</div>' +
      '<div class="ad-skyr">' + (busy ? 'Skrái…' : 'Já / Nei = ákvörðun þín, skráð hjá Charlize — agentarnir lesa hana og leggja Nei-atriði ekki til aftur. Verkefnalistinn = Claude vinnur verkið.') + '</div></div>';
  }
  function svarHtml(l, x) {
    const busy = !!S.amBusy[l], el = esc(l);
    if (x && x.svar && !S.svBreyta[l]) {
      return '<div class="ad-svar"><b>Svar þitt · ' + esc(klTxt(x.svar_at)) + (x.svar_af ? ' · ' + esc(x.svar_af) : '') + '</b><p>' + esc(x.svar) + '</p>' +
        '<div class="ad-tk" style="margin-top:6px"><span class="ad-chip">→ Charlize' + (x.charlize_id ? ' #' + esc(x.charlize_id) : '') + ' · Verkefnalistinn</span>' +
        '<button type="button" class="_lt" data-adm="svbreyta" data-l="' + el + '">Breyta svari</button></div></div>';
    }
    const t = S.drog['sv:' + l] != null ? S.drog['sv:' + l] : (x && x.svar) || '';
    return '<div class="ad-rond"><textarea id="_adm-sv-' + idOf(l) + '" data-drog="sv:' + el + '" maxlength="4000" placeholder="Svar þitt…">' + esc(t) + '</textarea>' +
      '<div class="ad-tk"><button type="button" class="_ja" data-adm="svara" data-l="' + el + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Sendi…' : 'Senda svar til Claude') + '</button>' +
      (x && x.svar ? '<button type="button" class="_lt" data-adm="svhaetta" data-l="' + el + '">Hætta við</button>' : '') + '</div>' +
      '<div class="ad-skyr">Svarið vistast hjá Charlize og fer á Verkefnalistann — Claude vinnur úr því.</div></div>';
  }
  /* ── 492f: „Biddu Claude" (Agnar valdi A 16.11.2026) ─────────────────────── */
  const sekAf = iso => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  function claudeSvarHtml(l, c, k) {
    const el = esc(l), t = c.tillaga || { tegund: 'ekkert' }, busy = !!S.amBusy[l], hm = c.heimildir || {};
    let h = '<div class="ad-cl"><div class="ad-cl-h">✦ Claude' + (c.fyrirmaeli ? ' · „' + esc(String(c.fyrirmaeli).slice(0, 90)) + '“' : '') + ' <small>' + esc(klTxt(c.lokid_at)) + '</small></div>';
    if (c.svar) h += '<p class="ad-cl-svar">' + esc(c.svar) + '</p>';
    if ((c.stadreyndir || []).length) h += '<ul class="ad-cl-st">' + c.stadreyndir.map(st => '<li>' + esc(st.texti) + ' ' + (st.heimildir || []).map(id => {
      const x = hm[id] || {};
      return x.slod ? opnaHtml({ url: x.slod.url, texti: x.lysing || x.slod.texti }) : '<span class="ad-cl-hm">' + esc(x.lysing || id) + '</span>';
    }).join(' ') + '</li>').join('') + '</ul>';
    if ((c.omaelt || []).length) h += '<div class="ad-cl-om">Ómælt: ' + c.omaelt.map(esc).join(' · ') + '</div>';
    if (t.tegund === 'verk') h += '<div class="ad-cl-t"><b>Tillaga — verk á Verkefnalistann</b><div class="tt">' + esc(t.titill) + '</div><div class="tl">' + esc(t.lysing) + '</div></div>';
    if (t.tegund === 'tolvupostur') { const po = t.post || {}; h += '<div class="ad-cl-t"><b>Tillaga — svar til ' + esc(po.fra) + '</b><small> „' + esc(po.efni) + '“ · ' + esc(po.dags) + ' · frá ' + esc(po.postholf) + '</small><pre>' + esc(t.texti) + '</pre></div>'; }
    h += '<div class="ad-tk">';
    if (c.samthykkt) h += '<span class="ad-chip _ja">✓ Samþykkt ' + esc(klTxt(c.samthykkt.at)) + (c.samthykkt.afgreidsla_id ? ' · í Afgreiðslu' : ' · á Verkefnalistanum') + '</span>';
    else if (t.tegund === 'verk') h += '<button type="button" class="_ja" data-adm="clsamth" data-l="' + el + '"' + (busy ? ' disabled' : '') + ' title="Stofnar verkið á Verkefnalistanum — Claude-lota vinnur það">Setja á Verkefnalistann</button>';
    else if (t.tegund === 'tolvupostur') h += '<button type="button" class="_ja" data-adm="clsamth" data-l="' + el + '"' + (busy ? ' disabled' : '') + ' title="Svarið fer í Tilbúið til afgreiðslu — ekkert er sent">Setja svarið í Afgreiðslu</button>';
    if (k === 'sp' && c.svar && !(S.af.am[l] && S.af.am[l].svar)) h += '<button type="button" data-adm="clnota" data-l="' + el + '">Nota sem drög að svari þínu</button>';
    h += '<button type="button" class="_lt" data-adm="clopna" data-l="' + el + '">Spyrja aftur</button></div>';
    if (t.tegund === 'tolvupostur' && !c.samthykkt) h += '<div class="ad-skyr">Svarið fer í „Tilbúið til afgreiðslu“. Þar lestu það, breytir og sendir sjálfur með rauða takkanum. Ekkert er sent héðan.</div>';
    return h + '</div>';
  }
  function claudeHtml(l, x, k) {
    const c = x && x.claude, el = esc(l), busy = !!S.amBusy[l];
    let h = '';
    if (c && c.stada === 'i_vinnslu') h += '<div class="ad-cl _bid" role="status">✦ Claude er að vinna… <small>' + sekAf(c.at) + ' s — svarið birtist hér</small></div>';
    else if (c && c.stada === 'villa') h += '<div class="ad-cl _v" role="status">✦ Claude kláraði ekki: ' + esc(c.villa || 'óþekkt villa') + '</div>';
    else if (c && c.stada === 'tilbuid') h += claudeSvarHtml(l, c, k);
    if (S.clOpid === l) {
      h += '<div class="ad-rond"><textarea id="_adm-cl-' + idOf(l) + '" data-drog="cl:' + el + '" maxlength="1500" placeholder="Hvað viltu að Claude geri? T.d. „skrifaðu svar við póstinum“ eða „hvað er staðan á R-364?“ (má sleppa — þá leggur hann til næsta skref)">' + esc(S.drog['cl:' + l] || '') + '</textarea>' +
        '<div class="ad-tk"><button type="button" class="_ja" data-adm="clbidja" data-l="' + el + '"' + (busy || (c && c.stada === 'i_vinnslu') ? ' disabled' : '') + '>✦ Biðja Claude</button></div>' +
        '<div class="ad-skyr">Claude (Opus) les atriðið og gögnin sem það nefnir — Payday, póst, drög, tíma, ákvarðanir í Charlize — og skilar einni tillögu með heimildum. Ekkert fer út; þú samþykkir eða ekki.</div></div>';
    }
    return h;
  }
  const claudeTakki = (l, x) => S.af.claudeVirkt ? '<button type="button" class="ad-ak ad-ak-cl" data-adm="clopna" data-l="' + esc(l) + '" aria-expanded="' + (S.clOpid === l) + '">✦ Biddu Claude</button>' : '';

  function hlutiHtml(m, h) {
    const d = HLUTAR[h.k] || { takn: '•' }, opinn = erOpinn(m, h), id = m.id + ':' + h.k;
    const leyfi = S.af.leyfi === true, akv = leyfi && (AKVARDANLEG[h.k] || h.k === 'sp');
    let radir = h.atridi.map((t, i) => {
      const r = { t, i, l: lykill(m, h, i), haus: !!(h.haus && h.haus[i]), amL: amLyk(m, h, i) };
      r.x = amRec(r.amL, t);
      S.atKort[r.amL] = { mal_id: m.id, hluti: h.k, nr: i, texti: t };
      return r;
    });
    if (h.k === 'ath') radir = nyjastEfst(radir);
    // Afgreitt = klárað (✓), Nei, komið á Verkefnalistann eða spurningu svarað. Já stendur opið (verkið er eftir).
    const afgreitt = r => erKlarad(r.l) || (akv && !!r.x && (r.x.akvordun === 'nei' || (h.k === 'sp' ? !!r.x.svar : !!r.x.verkefnalisti_id)));
    const iVinnslu = r => S.opidAt === r.amL || S.clOpid === r.amL || !!S.amBusy[r.amL] || !!S.svBreyta[r.amL] || !!(r.x && r.x.claude && r.x.claude.stada === 'i_vinnslu');
    const seinnaR = radir.filter(r => !afgreitt(r) && !iVinnslu(r) && akv && erSeinna(r.x));
    const klarad = radir.filter(r => afgreitt(r) && !iVinnslu(r));
    const opin = radir.filter(r => klarad.indexOf(r) < 0 && seinnaR.indexOf(r) < 0);
    const rod = r => {
      const l = r.amL, x = r.x, kl = erKlarad(r.l);
      let ins = '<span class="txt">' + atridiHtml(r.t) + '</span>';
      if (akv && h.k === 'sp') ins += svarHtml(l, x) + (S.af.claudeVirkt ? '<div class="ad-akr">' + claudeTakki(l, x) + '</div>' : '') + claudeHtml(l, x, h.k);
      else if (akv) {
        const opid = S.opidAt === l;
        ins += chipHtml(x) + '<div class="ad-akr"><button type="button" class="ad-ak" data-adm="atopna" data-l="' + esc(l) + '" aria-expanded="' + opid + '">' +
          (x && (x.akvordun || x.verkefnalisti_id || x.athugasemd_agnars) ? 'Breyta ▾' : 'Ákveða ▾') + '</button>' + claudeTakki(l, x) + '</div>';
        if (opid) ins += rondHtml(l, x);
        ins += claudeHtml(l, x, h.k);
      }
      return '<li class="ad-at' + (kl ? ' _kl' : '') + (r.haus ? ' _haus' : '') + '"><span class="nr">' + (h.k === 'c' || h.k === 'b' ? (r.i + 1) + '.' : '') + '</span><div class="tx">' + ins + '</div>' +
        '<button type="button" class="' + (kl ? '_on' : '') + '" data-adm="klara" data-l="' + esc(r.l) + '"' + (r.l in S.bid ? ' disabled' : '') + ' title="' + (kl ? 'Taka klárað-merkið af' : 'Merkja klárað') + '">' + (kl ? '✓' : '○') + '</button></li>';
    };
    let x = '<section class="ad-hl _' + esc(h.k) + '"><button type="button" class="haus" data-adm="opna" data-id="' + esc(id) + '" aria-expanded="' + opinn + '"><span class="tk">' + d.takn + '</span>' + esc(h.heiti) +
      '<span class="n">' + opin.length + (klarad.length ? ' · ' + klarad.length + ' ✓' : '') + (seinnaR.length ? ' · ' + seinnaR.length + ' ⏸' : '') + '</span><span class="pil">' + (opinn ? '▾' : '▸') + '</span></button>';
    if (opinn) {
      const sk = S.hlSkilabod[id];
      if (sk && Date.now() - sk.at < 60000) x += '<div class="ad-sk _' + (sk.ok ? 'ok' : 'v') + '" role="status">' + esc(sk.texti) + '<span>' + esc(String(sk.atridi || '').slice(0, 110)) + '</span></div>';
      x += '<ol>' + (opin.length ? opin.map(rod).join('') : '<li class="ad-at" style="color:#525b6b;font-style:italic">' + (h.k === 'sp' ? 'Öllu svarað.' : 'Allt afgreitt.') + '</li>') + '</ol>';
      if (seinnaR.length) {
        const sid = id + ':seinna';
        x += '<div class="ad-klarad">' + seinnaR.length + ' seinna<button type="button" data-adm="syna" data-id="' + esc(sid) + '">' + (S.synaKlarad[sid] ? 'fela' : 'sýna') + '</button></div>';
        if (S.synaKlarad[sid]) x += '<ol>' + seinnaR.map(rod).join('') + '</ol>';
      }
      if (klarad.length) {
        x += '<div class="ad-klarad">' + klarad.length + (akv ? (h.k === 'sp' ? ' svarað' : ' afgreitt') : ' klárað') + '<button type="button" data-adm="syna" data-id="' + esc(id) + '">' + (S.synaKlarad[id] ? 'fela' : 'sýna') + '</button></div>';
        if (S.synaKlarad[id]) x += '<ol>' + klarad.map(rod).join('') + '</ol>';
      }
    }
    return x + '</section>';
  }

  /* ── 492d: Tilbúið til afgreiðslu — sama spjald og afgreidsla.html ──────────── */
  const JA_SVG = '<svg width="16" height="16" viewBox="0 0 18 18" aria-label="Í lagi"><circle cx="9" cy="9" r="8" fill="#1b6b2d"/><path d="M5 9.3l2.6 2.6L13 6.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const NEI_SVG = '<svg width="16" height="16" viewBox="0 0 18 18" aria-label="Ekki í lagi"><circle cx="9" cy="9" r="8" fill="#a1161a"/><path d="M6 6l6 6M12 6l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
  // Slóð frá þjóninum (skjalið sjálft: PDF, Gmail, Payday) → tengill í nýjum flipa. Aðeins http(s) eða slóð á þessum vef.
  const opnaHtml = sl => (sl && sl.url && /^(https?:\/\/|\/)/.test(sl.url) ? '<a class="ad-opna" href="' + esc(sl.url) + '" target="_blank" rel="noopener">' + esc(sl.texti || 'Opna') + ' ↗</a>' : '');
  function afKortHtml(v) {
    let h = '<div class="ad-afk"><h4>Hvað gerist þegar þú ýtir</h4><div class="ad-gerist">' + esc(v.hvad_gerist) + '</div>';
    if ((v.af_hverju || []).length) h += '<h4>Af hverju þetta er rétt</h4><ul class="ad-rok">' + v.af_hverju.map(r => '<li>' + rokTexti(r.texti) + (r.heimild || r.slod ? '<small>' + esc(r.heimild || '') + (r.slod ? ' ' + opnaHtml(r.slod) : '') + '</small>' : '') + '</li>').join('') + '</ul>';
    if (v.tegund === 'tolvupostur') {
      if (v.svar_vid) h += '<h4>Skeytið sem þú svarar (það nýjasta í þræðinum)</h4><div class="ad-skeyti"><div class="m">' + esc(v.svar_vid.fra) + ' · ' + esc(v.svar_vid.dags) + (v.svar_vid.slod ? ' · ' + opnaHtml(v.svar_vid.slod) : '') + '</div><b>' + esc(v.svar_vid.efni) + '</b><pre>' + esc(v.svar_vid.texti) + '</pre></div>';
      const p = v.post || {};
      h += '<h4>Svarið — þú mátt breyta því</h4><dl class="ad-linur"><dt>Frá</dt><dd>' + esc(p.account) + '</dd><dt>Til</dt><dd>' + esc((p.to || []).join(', ')) + '</dd>' +
        ((p.cc || []).length ? '<dt>Afrit</dt><dd>' + esc(p.cc.join(', ')) + '</dd>' : '') + '<dt>Efni</dt><dd>' + esc(p.subject) + '</dd>' +
        ((p.vidhengi || []).length ? '<dt>Viðhengi</dt><dd>' + esc(p.vidhengi.join(', ')) + '</dd>' : '') + '</dl>' +
        '<textarea id="_adm-af-tx-' + v.id + '" data-af-tx="' + v.id + '" spellcheck="true">' + esc(afTextiNu(v)) + '</textarea>';
    } else if (v.tegund === 'simtal') {
      const s = v.simtal || {};
      h += '<h4>Símtalið</h4><dl class="ad-linur"><dt>Hverjum</dt><dd>' + esc(s.hverjum) + '</dd>' + (s.simi ? '<dt>Sími</dt><dd><a href="tel:' + esc(String(s.simi).replace(/\s/g, '')) + '">' + esc(s.simi) + '</a></dd>' : '') + '</dl>' +
        (s.handrit ? '<div class="ad-skeyti"><pre>' + esc(s.handrit) + '</pre></div>' : '');
    } else if (v.tegund === 'verk') {
      h += '<h4>Verkið</h4><div class="ad-skeyti"><pre>' + esc((v.verk || {}).lysing) + '</pre></div>';
    } else if (v.tegund === 'krafa' && v.krafa && v.krafa.r_numer) {
      h += '<h4>Krafan</h4><dl class="ad-linur"><dt>Reikningur</dt><dd>' + esc(v.krafa.r_numer) + (v.krafa.slod ? ' · ' + opnaHtml(v.krafa.slod) : '') + '</dd></dl>';
    }
    // Athugasemd Agnars á verkið (vistuð á afgreidsla-röðina; Tony og lotur lesa hana).
    const athT = v.id in S.afAthDrog ? S.afAthDrog[v.id] : (v.athugasemd || '');
    const athM = S.afAthSk[v.id] || (v.athugasemd ? 'Vistað ' + klTxt(v.athugasemd_at) + (v.athugasemd_af ? ' · ' + v.athugasemd_af : '') : '');
    h += '<h4>Athugasemd þín</h4><textarea class="ad-afath" id="_adm-af-ath-' + v.id + '" data-af-ath="' + v.id + '" maxlength="2000" placeholder="Til Tonys og Claude — vistast á verkið">' + esc(athT) + '</textarea>' +
      '<div class="ad-tk"><button type="button" data-adm="afath" data-id="' + v.id + '"' + (S.afAthBusy ? ' disabled' : '') + '>' + (S.afAthBusy ? 'Vista…' : 'Vista athugasemd') + '</button>' +
      (athM ? '<span class="ad-skyr" role="status" style="margin:0;align-self:center">' + esc(athM) + '</span>' : '') + '</div>';
    if ((v.athuganir || []).length) h += '<h4>Athuganir — keyrðar núna</h4><ul class="ad-ath">' + v.athuganir.map(a => '<li>' + (a.ok ? JA_SVG : NEI_SVG) + '<span>' + esc(a.texti) + '</span></li>').join('') + '</ul>';
    const vop = S.afVopnad === v.id, dis = S.afBusy ? ' disabled' : '';
    h += '<div class="ad-aff"><button type="button" data-adm="afseinna" data-id="' + v.id + '"' + dis + ' title="Aftast í röðina — ekki ákvörðun">Seinna</button>' +
      '<button type="button" class="_m" data-adm="afsleppa" data-id="' + v.id + '"' + dis + ' title="Ákvörðun: kemur aldrei aftur">Ekki þess virði</button><span class="grow"></span>' +
      '<button type="button" class="_r' + (vop ? ' _v' : '') + '" data-adm="affram" data-id="' + v.id + '"' + (!v.ok || S.afBusy ? ' disabled' : '') + ' title="' + esc(v.ok ? v.hvad_gerist : 'Athugun stóðst ekki — sjá að ofan') + '">' +
      esc(S.afBusy ? 'Augnablik…' : vop ? 'Ýttu aftur til að staðfesta' : v.takki) + '</button></div></div>';
    return h;
  }
  function afHtml() {
    if (S.af.leyfi === false) return S.af.villa ? '<div class="ad-leyfi">' + esc(S.af.villa) + '</div>' : '';
    if (S.af.leyfi !== true) return S.af.villa ? '<div class="ad-villa">' + esc(S.af.villa) + '</div>' : '';
    const t = S.af.tilbuin;
    let x = S.af.villa ? '<div class="ad-villa">' + esc(S.af.villa) + '</div>' : '';
    if (!t.length && !S.afSkilabod) return x;
    x += '<section class="ad-af" aria-label="Tilbúið til afgreiðslu"><div class="ad-af-h">⚡ Tilbúið til afgreiðslu · ' + t.length + '<small>takkinn framkvæmir það sem á honum stendur</small><span class="grow"></span><a href="/afgreidsla.html" title="Allt sem var gert, sleppt eða úrelt">Saga ›</a></div>';
    if (S.afSkilabod) x += '<div class="ad-sk _' + (S.afSkilabod.ok ? 'ok' : 'v') + '" role="status">' + esc(S.afSkilabod.texti) + '</div>';
    x += '<ol>' + t.map(v => {
      const opid = S.afOpid === v.id;
      return '<li class="ad-afr"><button type="button" class="haus" data-adm="afopna" data-id="' + v.id + '" aria-expanded="' + opid + '"><span class="ad-plata">' + esc(TEG[v.tegund] || v.tegund) + '</span><span class="t">' + sundur(v.titill) + '</span>' +
        (v.ok ? '' : '<span class="k" style="color:#a1161a">✗ athugun</span>') + '<span class="pil">' + (opid ? '▾' : '▸') + '</span></button>' + (opid ? afKortHtml(v) : '') + '</li>';
    }).join('') + '</ol></section>';
    return x;
  }
  function malHtml(m) {
    const hlutar = greina(m);
    const leidr = sidastLeidrett(hlutar), aldur = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 864e5);
    let x = '<div class="ad-mal"><div class="ad-titill"><b>' + esc(String(m.title || '').replace(/^📌\s*/, '')) + '</b><small>#' + m.id + ' · ' + esc(dags(m.updated_at || m.created_at)) + ' ' + esc(kl(m.updated_at || m.created_at)) + (m.due_at ? ' · frestur ' + esc(dags(m.due_at)) : '') + (leidr ? ' · leiðrétt ' + esc(leidr) : '') + '</small>' +
      (aldur >= 7 ? '<small class="_gamalt">' + aldur + ' daga gamalt · biddu Claude um nýtt yfirlit</small>' : '') + '</div>';
    x += hlutar.length ? '<div class="ad-grid">' + hlutar.map(h => hlutiHtml(m, h)).join('') + '</div>'
      : '<div class="ad-hl"><div class="ad-at" style="white-space:pre-wrap">' + esc(m.notes || m.summary || '') + '</div></div>';
    return x + '</div>';
  }
  // Tómt borð: segja hvaða yfirliti var lokað síðast og hvers vegna, svo tómt lesist ekki sem bilun.
  function sidastHtml() {
    const s = S.sidast; if (!s) return '';
    return '<div class="ad-sidast"><b>Síðasta yfirlit</b> (#' + esc(s.id) + ') var lokað' + (s.lokid_at ? ' ' + esc(dags(s.lokid_at)) : '') + (s.lokid_af ? ' af ' + esc(s.lokid_af) : '') + '.' +
      (s.lokid_lysing ? '<span>' + esc(String(s.lokid_lysing).slice(0, 300)) + '</span>' : '') + '</div>';
  }
  function html() {
    const n = S.mal.length;
    let fjoldi = 0, leidr = 0;      // leiðréttingar teljast sér (kaflar), ekki sem atriði yfirlitsins
    S.mal.forEach(m => { greina(m).forEach(h => { if (h.k === 'ath') leidr += Object.keys(h.haus).length; else fjoldi += h.atridi.length; }); });
    let st = 'sæki…';
    if (S.loaded) st = n ? n + ' yfirlit · ' + fjoldi + ' atriði' + (leidr ? ' · ' + leidr + (leidr === 1 ? ' leiðrétting' : ' leiðréttingar') : '') +
      (S.af.leyfi === true && S.af.tilbuin.length ? ' · ' + S.af.tilbuin.length + ' tilbúin til afgreiðslu' : '') : 'engin aðalmál skráð';
    else if (S.villa) st = '⚠️ ' + S.villa;
    let h = '<div class="ad-haus"><div><div class="tt">📌 Aðalmál</div><div class="st">' + esc(st) + '</div></div>' +
      (n ? '<button type="button" data-adm="bord" data-id="' + S.mal[0].id + '" title="Opna málið á Þjónustuborðinu">Á borðið</button>' : '') +
      '<button type="button" class="uppf" data-adm="uppf" title="Sækja aftur">↻</button></div>';
    if (S.villa) h += '<div class="ad-villa">' + esc(S.villa) + '</div>';
    if (S.loaded) {
      h += afHtml();
      h += n ? S.mal.map(malHtml).join('') : '<div class="ad-tomt">Engin aðalmál skráð.' + sidastHtml() + (S.sidast ? '' : '<br>') + 'Biddu Claude: „settu vikuyfirlit á Aðalmál".</div>';
      h += '<div class="ad-hint">○ = merkja klárað (geymt fyrir allar vélar) · Ákveða = já / nei / seinna / á Verkefnalistann — já og nei skráð hjá Charlize · ' +
        'svör við spurningum fara til Claude (Charlize + Verkefnalistinn) · textinn er mál á Þjónustuborðinu með merkinu „adalmal" — Claude skrifar nýtt fyrir nýja viku.</div>';
    } else if (!S.villa) h += '<div class="ad-tomt">Sæki aðalmálin…</div>';
    return h;
  }
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById(ROOT_ID); if (!root) return;
    const nytt = html();
    if (root._h === nytt) return;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    root.innerHTML = nytt; root._h = nytt;
    if (aftur) aftur();
  }

  /* ── smellir ─────────────────────────────────────────────────────────────── */
  function smellur(e) {
    const el = e.target && e.target.closest && e.target.closest('[data-adm]'); if (!el) return;
    const a = el.getAttribute('data-adm'), id = el.getAttribute('data-id');
    if (a === 'uppf') { S.afSkilabod = null; return load(); }
    if (a === 'opna') { S.opin[id] = !erOpinnId(id); render(); return; }
    if (a === 'syna') { S.synaKlarad[id] = !S.synaKlarad[id]; render(); return; }
    if (a === 'klara') {
      const l = el.getAttribute('data-l'); if (!l || l in S.bid) return;
      const tx = el.parentNode && el.parentNode.querySelector('.txt');
      return klara(l, tx ? tx.textContent : '', !erKlarad(l));
    }
    if (smellur492d(a, el)) return;
    if (a === 'bord') {
      const mid = +id;
      try { if (window.App && App.switchView) App.switchView('bord'); } catch (_) {}
      setTimeout(() => { try { if (window.Bord368 && Bord368.opnaMal) Bord368.opnaMal(mid); } catch (_) {} }, 400);
    }
  }
  // 492d — smellir á aðgerðir. Skilar true ef smellurinn var okkar.
  function smellur492d(a, el) {
    const l = el.getAttribute('data-l'), id = Number(el.getAttribute('data-id'));
    const domGildi = (pre) => { const x = document.getElementById(pre + idOf(l)); return x ? String(x.value || '').trim() : ''; };
    if (a === 'atopna') { S.opidAt = S.opidAt === l ? null : l; render(); if (S.opidAt) setTimeout(() => { const x = document.getElementById('_adm-ath-' + idOf(l)); if (x && !mjor()) x.focus({ preventScroll: true }); }, 0); return true; }
    if (a === 'akv') { amAdgerd(l, 'akvordun', { akvordun: el.getAttribute('data-v'), athugasemd: domGildi('_adm-ath-') }); return true; }
    if (a === 'vl') { amAdgerd(l, 'verkefnalisti', { athugasemd: domGildi('_adm-ath-') }); return true; }
    if (a === 'amath') { amAdgerd(l, 'athugasemd', { athugasemd: domGildi('_adm-ath-') }); return true; }
    if (a === 'clopna') { S.clOpid = S.clOpid === l ? null : l; render(); if (S.clOpid) setTimeout(() => { const x = document.getElementById('_adm-cl-' + idOf(l)); if (x && !mjor()) x.focus({ preventScroll: true }); }, 0); return true; }
    if (a === 'clbidja') { amAdgerd(l, 'claude', { fyrirmaeli: domGildi('_adm-cl-') }); return true; }
    if (a === 'clsamth') { amAdgerd(l, 'claude_samthykkja'); return true; }
    if (a === 'clnota') {
      const c = S.af.am[l] && S.af.am[l].claude; if (!c || !c.svar) return true;
      S.drog['sv:' + l] = c.svar; drogVista(); S.svBreyta[l] = true; render();
      setTimeout(() => { const x = document.getElementById('_adm-sv-' + idOf(l)); if (x) x.focus({ preventScroll: true }); }, 0);
      return true;
    }
    if (a === 'afath') {
      const v0 = S.af.tilbuin.find(x => x.id === id); if (!v0 || S.afAthBusy) return true;
      const ta = document.getElementById('_adm-af-ath-' + id), t = ta ? ta.value : '';
      S.afAthBusy = true; delete S.afAthSk[id]; render();
      afKall({ id, adgerd: 'athugasemd', texti: t }).then(j => {
        S.afAthBusy = false;
        if (j._status === 200 && j.ok) { v0.athugasemd = j.athugasemd; v0.athugasemd_af = j.athugasemd_af; v0.athugasemd_at = j.athugasemd_at; delete S.afAthDrog[id]; S.afAthSk[id] = j.athugasemd ? 'Vistað ' + klTxt(j.athugasemd_at) + (j.athugasemd_af ? ' · ' + j.athugasemd_af : '') : 'Athugasemdin var hreinsuð'; }
        else S.afAthSk[id] = 'Vistaðist ekki: ' + (j.error || ('villa ' + j._status)) + ' — textinn er enn í reitnum';
        render();
      }).catch(e => { S.afAthBusy = false; S.afAthSk[id] = 'Netvilla — vistaðist ekki: ' + ((e && e.message) || e); render(); });
      return true;
    }
    if (a === 'svara') {
      const t = domGildi('_adm-sv-'), at = S.atKort[l];
      if (!t) { if (at) S.hlSkilabod[at.mal_id + ':' + at.hluti] = { ok: false, texti: 'Skrifaðu svarið fyrst — ekkert var sent.', at: Date.now(), atridi: at.texti }; render(); return true; }
      amAdgerd(l, 'svar', { svar: t }); return true;
    }
    if (a === 'svbreyta') { S.svBreyta[l] = true; render(); setTimeout(() => { const x = document.getElementById('_adm-sv-' + idOf(l)); if (x) x.focus({ preventScroll: true }); }, 0); return true; }
    if (a === 'svhaetta') { S.svBreyta[l] = false; delete S.drog['sv:' + l]; drogVista(); render(); return true; }
    const v = S.af.tilbuin.find(x => x.id === id);
    if (a === 'afopna') { S.afOpid = S.afOpid === id ? null : id; S.afVopnad = null; S.afSkilabod = null; render(); return true; }
    if (!v || S.afBusy) return a.indexOf('af') === 0;
    if (a === 'affram') { afFramkvaema(v); return true; }
    if (a === 'afseinna') {
      S.afBusy = true; render();
      afKall({ id: v.id, adgerd: 'seinna' }).then(j => {
        S.afBusy = false;
        S.afSkilabod = j._status === 200 ? { ok: true, texti: 'Sett aftast í röðina: ' + v.titill + '.' } : { ok: false, texti: j.error || ('Villa ' + j._status) };
        S.afOpid = null; return loadAf();
      }).catch(e => { S.afBusy = false; S.afSkilabod = { ok: false, texti: 'Netvilla: ' + ((e && e.message) || e) }; render(); });
      return true;
    }
    if (a === 'afsleppa') {
      const astaeda = window.prompt('Ekki þess virði — kemur aldrei aftur. Ástæða (má sleppa):', '');
      if (astaeda === null) return true;
      S.afBusy = true; render();
      afKall({ id: v.id, adgerd: 'sleppa', varanlegt: true, astaeda: astaeda || 'Ekki þess virði' }).then(j => {
        S.afBusy = false;
        if (j._status === 200) { S.af.tilbuin = S.af.tilbuin.filter(x => x.id !== v.id); S.afOpid = null; S.afSkilabod = { ok: true, texti: 'Sleppt og kemur ekki aftur: ' + v.titill + '.' }; }
        else S.afSkilabod = { ok: false, texti: j.error || ('Villa ' + j._status) };
        render();
      }).catch(e => { S.afBusy = false; S.afSkilabod = { ok: false, texti: 'Netvilla: ' + ((e && e.message) || e) }; render(); });
      return true;
    }
    return false;
  }
  // Drög lifa endurteikningu (minni + localStorage); ekkert er teiknað meðan skrifað er.
  function inntak(e) {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.drog) { S.drog[t.dataset.drog] = t.value; drogVista(); return; }
    if (t.dataset.afTx) S.afTexti[Number(t.dataset.afTx)] = t.value;
    if (t.dataset.afAth) S.afAthDrog[Number(t.dataset.afAth)] = t.value;
  }
  // Breyttur póstur vistast þegar farið er úr reitnum (eins og afgreidsla.html) — athuganirnar keyra aftur á nýja textanum.
  function fokusUt(e) {
    const t = e.target; if (!t || !t.dataset || !t.dataset.afTx) return;
    const v = S.af.tilbuin.find(x => x.id === Number(t.dataset.afTx)); if (!v || !v.post) return;
    const tx = t.value; if (tx === v.post.texti) return;
    afKall({ id: v.id, adgerd: 'vista', texti: tx }).then(j => {
      if (j._status === 200 && j.verk) { v.post.texti = tx; delete S.afTexti[v.id]; v.athuganir = j.verk.athuganir; v.ok = j.verk.ok; render(); }
      else { S.afSkilabod = { ok: false, texti: 'Breytti textinn vistaðist ekki: ' + (j.error || ('villa ' + j._status)) + ' — hann er enn í reitnum.' }; render(); }
    }).catch(() => {});
  }
  const erOpinnId = id => { if (id in S.opin) return S.opin[id]; const k = String(id).split(':')[1]; const d = HLUTAR[k]; return mjor() ? !!(d && d.opinn) : true; };

  /* ── sýn / leiðsögn (sama og 491) ───────────────────────────────────────── */
  let _poll = 0;
  function open() {
    injectCss(); ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!S.loaded && !S.loading) load();
    clearInterval(_poll);
    _poll = setInterval(() => { if (!erVirk() || document.hidden) return; if (!S.loading) load(); }, 120000);
  }
  const erVirk = () => { const vv = document.getElementById(VIEW_ID); return !!(vv && vv.classList.contains('active')); };
  function hide() { try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {} clearInterval(_poll); _poll = 0; }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._adalmalPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._adalmalPatched = true;
  }
  function boot() {
    patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
    opnaMalUrSlod();
  }
  // 492e: tilvísun „Mál #N" (afgreidsla.cjs → /?mal=N#bord) opnar MÁLIÐ sjálft á Þjónustuborðinu, ekki bara borðið.
  // Reynt í allt að 8 s meðan appið ræsist (sama hugsun og 357); ?mal= er fjarlægt úr slóðinni þegar málið er opið.
  function opnaMalUrSlod() {
    let id = 0;
    try { id = Number(new URLSearchParams(location.search).get('mal')); } catch (_) {}
    if (!Number.isInteger(id) || id <= 0) return;
    const t0 = Date.now();
    const reyna = () => {
      if (window.App && App.switchView && window.Bord368 && Bord368.opnaMal) {
        try { App.switchView('bord'); } catch (_) {}
        setTimeout(() => { try { Bord368.opnaMal(id); } catch (_) {} }, 400);
        try { const u = new URL(location.href); u.searchParams.delete('mal'); history.replaceState(null, '', u.pathname + u.search + '#bord'); } catch (_) {}
        return;
      }
      if (Date.now() - t0 < 8000) setTimeout(reyna, 250);
    };
    setTimeout(reyna, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.Adalmal = { open, render, load, loadAf, greina, S, version: '492f' };
  console.log('[492f] Aðalmál — gagnvirkt borð, tenglar, athugasemdir og „Biddu Claude"');
})();
