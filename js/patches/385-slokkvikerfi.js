/* === SLÖKKVIKERFIS SKOÐUN — þriðji þjónustuflokkurinn, sér síða (2026-09-21) ===
 *
 * Ósk Agnars: „start slökkvikerfi as a page and base on the look of ársskoðun. We might later
 * combine them 3 and just the tab that switch."
 *
 * ÚTLITIÐ er Ársskoðunar (153): dökkt málmband í haus, ár-reitir með LED, punktalínu-nóta,
 * stöðupillur. GEYMSLAN er það ekki: 153 býr í jsonb-blobbi (arsskodun_customers) með
 * `steps_<ár>` sem lyklanöfn; hér er ein röð per kerfi í `slokkvikerfi` og ein röð per skoðun í
 * `slokkvikerfi_skodanir` með skrefin sem dálka (sql/2026-09-21_slokkvikerfi.sql). Síðan les
 * sýnina `v_slokkvikerfi_yfirlit` og skrifar AÐEINS í `slokkvikerfi` (nóta, mánuður, nýtt kerfi).
 *
 * Snertir hvorki 153/187 (vörðuð lína) né 272. Sameining flokkanna þriggja síðar: allt sem er
 * flokks-háð er í FLOKKUR-hlutnum efst, restin er almenn.
 *
 * Skoðun er ALLTAF einu sinni á ári → engin tíðni, enginn Tíðni-dálkur. Enginn Akstur-dálkur;
 * breið Nóta í staðinn. Verð lá ekki fyrir 21.09 → „⚠ vantar", aldrei gisk.
 *
 * View `view-slokkvikerfi`, slug `#slokkvikerfi`. Public: window.Slokkvikerfi = { open, reload }.
 */
(() => {
  if (window.__slokkvikerfiInstalled) return;
  window.__slokkvikerfiInstalled = true;

  const FLOKKUR = { key: 'slokkvikerfi', titill: 'Slökkvikerfis skoðun', takn: '🍳',
    syn: 'v_slokkvikerfi_yfirlit', tafla: 'slokkvikerfi' };
  const VIEW_ID = 'view-' + FLOKKUR.key;
  const NAV_KEY = FLOKKUR.key;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Maí', 'Jún', 'Júl', 'Ágú', 'Sep', 'Okt', 'Nóv', 'Des'];
  const MON_FULL = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const SKREF = [['skodad_at', 'Skoðað'], ['skyrsla_at', 'Skýrsla'], ['send_at', 'Send'], ['reikningur_at', 'Reikningur']];
  const LS = 'slokkvikerfi_sia_v1';   // AÐEINS sía/röðun þessa vafra — staða gagna býr á þjóninum

  const state = Object.assign({ stada: 'allt', man: 0, leit: '', postnr: '', felaUr: true, sort: 'man', dir: 1 }, lesaSiu());
  let _rows = null, _loading = false, _villa = '';

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[slokkvikerfi]', m); }
  function lesaSiu() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (_) { return {}; } }
  function vistaSiu() { try { localStorage.setItem(LS, JSON.stringify({ stada: state.stada, man: state.man, postnr: state.postnr, felaUr: state.felaUr, sort: state.sort, dir: state.dir })); } catch (_) {} }
  function dm(iso) { if (!iso) return '—'; const p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fmtKt(kt) { const t = String(kt || '').replace(/\D/g, ''); return t.length === 10 ? t.slice(0, 6) + '-' + t.slice(6) : String(kt || ''); }
  function kr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }

  // ── reglur (ein heimild hver) ────────────────────────────────────────────────
  // Síðasta skoðun: OKKAR lokaða skoðun ræður; annars skoðun fyrri þjónustuaðila.
  function sidast(r) { return r.sidast_okkar || r.fyrri_skodun || null; }
  // Næsta skoðun: 12 mánuðum eftir síðustu; hafi aldrei verið skoðað → skoðunarmánuður þessa árs.
  function naest(r) {
    const s = sidast(r);
    if (s) { const d = new Date(s); return new Date(d.getFullYear() + 1, d.getMonth(), 1); }
    return r.skodunarmanudur ? new Date(r.ar_nu, r.skodunarmanudur - 1, 1) : null;
  }
  function stada(r) {
    if (!r.i_thjonustu) return { k: 'ur', t: 'Úr þjónustu', c: 'off', o: 9 };
    const skodad = !!(r.skodad_at || r.skyrsla_at || r.skodun_status === 'final');
    if (skodad && !r.reikningur_at) return { k: 'orukkad', t: 'Órukkað', c: 'late', o: 0 };
    if (skodad && r.reikningur_at) return { k: 'buid', t: 'Búið ' + r.ar_nu, c: 'done', o: 5 };
    if (r.skodun_id) return { k: 'vinnsla', t: 'Í vinnslu', c: 'work', o: 2 };
    const n = naest(r), nu = new Date(), m0 = new Date(nu.getFullYear(), nu.getMonth(), 1);
    if (!n) return { k: 'oskrad', t: 'Mánuð vantar', c: 'skip', o: 1 };
    if (n < m0) return { k: 'fram', t: 'Fram yfir · ' + MON[n.getMonth()] + ' ' + n.getFullYear(), c: 'late', o: 1 };
    if (n.getTime() === m0.getTime()) return { k: 'nu', t: 'Þessi mánuður', c: 'skip', o: 3 };
    return { k: 'framundan', t: 'Framundan · ' + MON[n.getMonth()] + ' ' + n.getFullYear(), c: 'plan', o: 4 };
  }
  // Verð: samtala kostnaðarlína skoðunar ársins, annars samningsverð kerfisins. null = vantar.
  function verd(r) {
    // EIN formúla: 386 á útreikninginn (línur × afsl., skýrslugerð, akstur, heildarafsláttur). Án vsk.
    const S6 = window.SlokkvikerfiSkyrsla;
    if (S6 && S6.summa) { const su = S6.summa(r.kostnadur || {}); if (su != null) return su; }
    return r.verd_an_vsk != null ? +r.verd_an_vsk : null;
  }
  function arin(r) { const ut = []; for (let y = r.ar_nu - 3; y <= r.ar_nu; y++) ut.push(y); return ut; }

  // ── gögn ────────────────────────────────────────────────────────────────────
  async function load() {
    const sb = SB(); if (!sb) throw new Error('Engin tenging við gagnagrunn');
    // Blaðsíðað: PostgREST sker hljóðlaust við 1000 raðir (audit-pagination).
    const BLS = 1000; let ut = [];
    for (let fra = 0; ; fra += BLS) {
      const { data, error } = await sb.from(FLOKKUR.syn).select('*').order('kerfi_id').range(fra, fra + BLS - 1);
      if (error) throw new Error(error.message || String(error));
      ut = ut.concat(data || []);
      if (!data || data.length < BLS) break;
    }
    return ut;
  }
  async function reload() {
    if (_loading) return;
    _loading = true; _villa = ''; render();
    try { _rows = await load(); } catch (e) { _villa = (e && e.message) || String(e); _rows = _rows || []; console.warn('[slokkvikerfi] load', e); }
    _loading = false; render();
  }
  // Vistun les svarið áður en „✓" er sagt (skill heidarlegt-vidmot): uppfærslan skilar röðinni
  // og gildið er borið saman við það sem var sent. RLS sem þegir skilar tómu fylki → villa.
  async function vistaKerfi(kerfiId, patch) {
    const sb = SB(); if (!sb) return { ok: false, villa: 'Engin tenging' };
    const sendur = Object.assign({}, patch, { updated_by: (window.CurrentUser && CurrentUser.name) || 'app' });
    const { data, error } = await sb.from(FLOKKUR.tafla).update(sendur).eq('id', kerfiId).select('id,' + Object.keys(patch).join(','));
    if (error) return { ok: false, villa: error.message || String(error) };
    const rod = data && data[0];
    if (!rod) return { ok: false, villa: 'Þjónninn skilaði engri röð' };
    const stemmir = Object.keys(patch).every(k => String(rod[k] == null ? '' : rod[k]) === String(patch[k] == null ? '' : patch[k]));
    return stemmir ? { ok: true, rod } : { ok: false, villa: 'Gildið á þjóninum stemmir ekki við það sem var sent' };
  }

  // ── síun og röðun ───────────────────────────────────────────────────────────
  function filteredSorted() {
    const q = state.leit.trim().toLowerCase();
    const ut = (_rows || []).map(r => ({ r, s: stada(r) })).filter(x => {
      const r = x.r;
      if (state.felaUr && !r.i_thjonustu) return false;
      if (state.stada !== 'allt' && x.s.k !== state.stada) return false;
      if (state.man && r.skodunarmanudur !== state.man) return false;
      if (state.postnr && String(r.postnumer || '') !== state.postnr) return false;
      if (q && [r.nafn, r.heiti, r.tegund, r.nota, r.heimilisfang, r.kennitala].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const gildi = x => {
      const r = x.r;
      switch (state.sort) {
        case 'postnr': return String(r.postnumer || '');
        case 'nafn': return String(r.nafn || '').toLowerCase();
        case 'nota': return String(r.nota || '').toLowerCase();
        case 'heim': return String(r.heimilisfang || '').toLowerCase();
        case 'ar': return String(sidast(r) || '');
        case 'skref': return SKREF.filter(s => r[s[0]]).length;
        case 'verd': return verd(r) || 0;
        case 'stada': return x.s.o;
        default: return r.skodunarmanudur || 99;
      }
    };
    ut.sort((a, b) => { const p = gildi(a), q2 = gildi(b); return (p > q2 ? 1 : p < q2 ? -1 : String(a.r.nafn).localeCompare(String(b.r.nafn), 'is')) * state.dir; });
    return ut;
  }

  // ── teikning ────────────────────────────────────────────────────────────────
  function arHtml(r) {
    const med = (r.ar_med_skyrslu || []).map(Number);
    const fyrriAr = r.fyrri_skodun ? +String(r.fyrri_skodun).slice(0, 4) : 0;
    const nu = new Date();
    return '<span class="_sk-yrs">' + arin(r).map(y => {
      let cls = '', tt = 'Ekki í þjónustu þetta ár';
      if (med.indexOf(y) >= 0) { cls = (y === r.ar_nu && r.reikningur_at) ? ' lit both' : ' lit on'; tt = 'Skoðunarskýrsla ' + y + (cls.indexOf('both') > 0 ? ' · reikningur' : ''); }
      else if (y === fyrriAr) { cls = ' on'; tt = 'Skoðað ' + dm(r.fyrri_skodun) + ' af ' + (r.fyrri_adili || 'öðrum þjónustuaðila'); }
      else if (y === r.ar_nu && r.i_thjonustu) {
        const kominn = !r.skodunarmanudur || (nu.getMonth() + 1) >= r.skodunarmanudur;
        cls = kominn ? ' now' : ' penda'; tt = kominn ? 'Skoðun ' + y + ' vantar' : 'Skoðun ' + y + ' er í ' + MON_FULL[r.skodunarmanudur - 1];
      }
      return '<span class="_sk-yr' + cls + '" title="' + esc(tt) + '">' + String(y).slice(2) + '</span>';
    }).join('') + '</span>';
  }
  function skrefHtml(r) {
    return '<span class="_sk-skref">' + SKREF.map(s => '<i class="' + (r[s[0]] ? 'on' : '') + '" title="' + s[1] + (r[s[0]] ? ' ' + dm(r[s[0]]) : ' — ekki búið') + '">' + s[1].slice(0, 2) + '</i>').join('') + '</span>';
  }
  function verdHtml(r) { const v = verd(r); return v == null ? '<span class="_sk-vantar" title="Ekkert verð skráð — reikningsdrög verða til án upphæðar">⚠ vantar</span>' : '<span class="_sk-mono">' + kr(v) + '</span>'; }

  // ATH: <table> ber data-_pm-status-done="1" — 00-legacy.js (enhanceStatusCells) setur annars tækja-
  // fellilista (Active / Í geymslu / Ónýtt) ofan í hvern „Staða“-dálk og skrifar í uttaeki.status
  // á gildinu í dálki 0 (hér póstnúmer). Sama gildra og 272 og 153 lentu í.
  function render() {
    const root = document.getElementById('_sk-root'); if (!root) return;
    if (_rows == null) { root.innerHTML = '<div class="_sk-tomt">Sæki…</div>'; return; }
    const allt = (_rows || []).map(r => ({ r, s: stada(r) }));
    const virk = allt.filter(x => x.r.i_thjonustu);
    const tel = f => virk.filter(f).length;
    const arNu = (_rows[0] && _rows[0].ar_nu) || new Date().getFullYear();
    const th = (k, t, extra) => '<th data-sort="' + k + '"' + (extra || '') + '>' + t + (state.sort === k ? '<span class="_sk-sa">' + (state.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    const ST = [['allt', 'Allt'], ['fram', 'Fram yfir'], ['nu', 'Þessi mánuður'], ['vinnsla', 'Í vinnslu'], ['orukkad', 'Órukkað'], ['framundan', 'Framundan'], ['buid', 'Búið']];
    const pn = {}; (_rows || []).forEach(r => { if (r.postnumer) pn[r.postnumer] = 1; });
    const sia = filteredSorted();

    root.innerHTML =
      '<div class="_sk-hd"><h1>' + FLOKKUR.takn + ' ' + FLOKKUR.titill + ' <small>' + arNu + '</small></h1><span class="_sk-sp"></span>' +
        '<button class="_sk-btn" id="_sk-prenta">🖨 Prenta lista</button><button class="_sk-btn _sk-pri" id="_sk-nytt">＋ Nýtt kerfi</button></div>' +
      (_villa ? '<div class="_sk-villa">⚠ Náði ekki í gögnin: ' + esc(_villa) + ' <button class="_sk-btn" id="_sk-aftur">Reyna aftur</button></div>' : '') +
      '<div class="_sk-kpis">' +
        kpi('Kerfi í þjónustu', virk.length) + kpi('Skoðað ' + arNu, tel(x => x.r.skodad_at || x.r.skyrsla_at)) +
        kpi('Á gjalddaga / fram yfir', tel(x => x.s.k === 'nu' || x.s.k === 'fram'), true) +
        kpi('Skoðað en órukkað', tel(x => x.s.k === 'orukkad'), true) + kpi('Verð vantar', tel(x => verd(x.r) == null), true) +
      '</div>' +
      '<div class="_sk-sia">' + ST.map(s => { const n = s[0] === 'allt' ? virk.length : tel(x => x.s.k === s[0]); return '<button class="_sk-chip' + (state.stada === s[0] ? ' on' : '') + '" data-st="' + s[0] + '">' + s[1] + '<b>' + n + '</b></button>'; }).join('') + '</div>' +
      '<div class="_sk-sia"><button class="_sk-chip' + (state.man === 0 ? ' on' : '') + '" data-m="0">Allir mánuðir</button>' +
        MON.map((m, i) => { const n = tel(x => x.r.skodunarmanudur === i + 1); return '<button class="_sk-chip' + (state.man === i + 1 ? ' on' : '') + (n ? '' : ' tom') + '" data-m="' + (i + 1) + '">' + m + (n ? '<b>' + n + '</b>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="_sk-sia"><input id="_sk-leit" class="_sk-inp" placeholder="Leita að fyrirtæki, kerfi eða nótu" value="' + esc(state.leit) + '">' +
        '<select id="_sk-postnr" class="_sk-inp" style="max-width:150px"><option value="">Öll póstnúmer</option>' + Object.keys(pn).sort().map(p => '<option' + (state.postnr === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>' +
        '<label class="_sk-lbl"><input type="checkbox" id="_sk-fela"' + (state.felaUr ? ' checked' : '') + '> Fela þau sem eru úr þjónustu</label>' +
        '<span class="_sk-sp"></span><span class="_sk-lbl">' + sia.length + ' af ' + allt.length + '</span></div>' +
      '<div class="_sk-tblwrap"><table class="_sk-tbl" data-_pm-status-done="1"><colgroup><col style="width:58px"><col style="width:205px"><col><col style="width:165px"><col style="width:92px"><col style="width:230px"><col style="width:112px"><col style="width:90px"><col style="width:168px"></colgroup>' +
        '<thead><tr>' + th('postnr', 'Póstur') + th('nafn', 'Fyrirtæki · kerfi') + th('nota', 'Nóta') + th('heim', 'Heimilisfang') + th('man', 'Skoðun') + th('ar', 'Ár', ' style="text-align:center"') + th('skref', 'Skref ' + arNu) + th('verd', 'Verð') + th('stada', 'Staða') + '</tr></thead><tbody>' +
        (sia.map(x => { const r = x.r; return '<tr class="_sk-row' + (r.i_thjonustu ? '' : ' ur') + '" data-fid="' + r.fyrirtaeki_id + '" data-kid="' + r.kerfi_id + '">' +
          '<td><span class="_sk-post">' + esc(r.postnumer || '') + '</span></td>' +
          '<td><span class="_sk-co">' + esc(r.nafn) + (r.i_arsskodun ? ' <span class="_sk-svc" title="Líka í ársskoðun slökkvitækja">🧯</span>' : '') + '</span>' +
            (r.kennitala ? '<span class="_sk-kt">kt. ' + esc(fmtKt(r.kennitala)) + '</span>' : '') + '<span class="_sk-kerfi">' + esc(r.heiti) + (r.tegund ? ' · ' + esc(r.tegund) : '') + '</span></td>' +
          '<td class="_sk-notacell"><textarea class="_sk-nota" rows="2" data-kid="' + r.kerfi_id + '" placeholder="· · · · · · · · · ·">' + esc(r.nota || '') + '</textarea><span class="_sk-notast" data-st="' + r.kerfi_id + '"></span></td>' +
          '<td><span class="_sk-addr">' + esc(r.heimilisfang || '') + '</span></td>' +
          '<td><select class="_sk-man" data-kid="' + r.kerfi_id + '" title="Skoðunarmánuður"><option value="">—</option>' + MON_FULL.map((m, i) => '<option value="' + (i + 1) + '"' + (r.skodunarmanudur === i + 1 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></td>' +
          '<td style="text-align:center">' + arHtml(r) + '<span class="_sk-sidast">síðast ' + dm(sidast(r)) + '</span></td>' +
          '<td>' + skrefHtml(r) + '</td><td>' + verdHtml(r) + '</td>' +
          '<td><span class="_sk-st _sk-st--' + x.s.c + '">' + esc(x.s.t) + '</span></td></tr>'; }).join('') ||
          '<tr><td colspan="9" class="_sk-tomt">' + (allt.length ? 'Ekkert kerfi passar við síuna.' : 'Ekkert slökkvikerfi skráð enn — smelltu á „＋ Nýtt kerfi".') + '</td></tr>') +
        '</tbody></table></div>' +
      '<div class="_sk-cards">' + sia.map(x => { const r = x.r; return '<div class="_sk-card _sk-row' + (r.i_thjonustu ? '' : ' ur') + '" data-fid="' + r.fyrirtaeki_id + '"><div class="_sk-cardhd"><div><span class="_sk-co">' + esc(r.nafn) + (r.i_arsskodun ? ' 🧯' : '') + '</span><span class="_sk-kerfi">' + esc(r.postnumer || '') + ' · ' + esc(r.heiti) + ' · ' + (r.skodunarmanudur ? MON_FULL[r.skodunarmanudur - 1] : 'mánuð vantar') + '</span></div><span class="_sk-st _sk-st--' + x.s.c + '">' + esc(x.s.t) + '</span></div>' +
        (r.nota ? '<div class="_sk-cardnota">' + esc(r.nota) + '</div>' : '') + '<div class="_sk-cardft">' + arHtml(r) + skrefHtml(r) + '</div></div>'; }).join('') + '</div>';
  }
  function kpi(t, n, warn) { return '<div class="_sk-kpi' + (warn && n ? ' warn' : '') + '"><small>' + t + '</small><b>' + n + '</b></div>'; }

  // ── prentun á síaða listanum ────────────────────────────────────────────────
  function prenta() {
    const sia = filteredSorted();
    const win = window.open('', '_blank'); if (!win) { toast('Leyfðu sprettiglugga til að prenta.'); return; }
    win.document.write('<!doctype html><html lang="is"><head><meta charset="utf-8"><title>' + FLOKKUR.titill + '</title><style>body{font-family:system-ui,Arial,sans-serif;padding:18px;color:#0f172a}h1{font-size:18px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:5px 7px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}th{background:#f1f5f9;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em}</style></head><body>' +
      '<h1>' + FLOKKUR.titill + ' — ' + new Date().toLocaleDateString('is-IS') + ' (' + sia.length + ')</h1><table><thead><tr><th>Póstur</th><th>Fyrirtæki</th><th>Kerfi</th><th>Heimilisfang</th><th>Skoðun</th><th>Síðast</th><th>Staða</th><th>Nóta</th></tr></thead><tbody>' +
      sia.map(x => { const r = x.r; return '<tr><td>' + esc(r.postnumer || '') + '</td><td><b>' + esc(r.nafn) + '</b></td><td>' + esc(r.heiti) + (r.tegund ? ' · ' + esc(r.tegund) : '') + '</td><td>' + esc(r.heimilisfang || '') + '</td><td>' + (r.skodunarmanudur ? MON_FULL[r.skodunarmanudur - 1] : '') + '</td><td>' + dm(sidast(r)) + '</td><td>' + esc(x.s.t) + '</td><td>' + esc(r.nota || '') + '</td></tr>'; }).join('') +
      '</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>');
    win.document.close();
  }

  // ── ＋ Nýtt kerfi ───────────────────────────────────────────────────────────
  function nyttKerfi() {
    const bak = document.createElement('div'); bak.className = '_sk-bak';
    bak.innerHTML = '<div class="_sk-modal"><h2>' + FLOKKUR.takn + ' Nýtt slökkvikerfi</h2>' +
      '<label>Fyrirtæki (nafn eða kennitala)</label><input class="_sk-inp" id="_skn-leit" placeholder="Byrjaðu að skrifa…" autocomplete="off"><div id="_skn-nid" class="_skn-nid"></div>' +
      '<div id="_skn-valid" class="_skn-valid"></div>' +
      '<div class="_skn-2"><div><label>Heiti kerfis</label><input class="_sk-inp" id="_skn-heiti" value="Eldhús"></div><div><label>Tegund</label><input class="_sk-inp" id="_skn-teg" placeholder="t.d. Amerex vökvakerfi"></div></div>' +
      '<div class="_skn-2"><div><label>Skoðunarmánuður</label><select class="_sk-inp" id="_skn-man"><option value="">— veldu —</option>' + MON_FULL.map((m, i) => '<option value="' + (i + 1) + '">' + m + '</option>').join('') + '</select></div><div><label>Fyrri þjónustuaðili (ef einhver)</label><input class="_sk-inp" id="_skn-fyrri"></div></div>' +
      '<label>Nóta</label><textarea class="_sk-inp" id="_skn-nota" rows="2"></textarea>' +
      '<div class="_skn-err" id="_skn-err"></div><div class="_skn-ft"><button class="_sk-btn" id="_skn-haetta">Hætta við</button><button class="_sk-btn _sk-pri" id="_skn-vista">Skrá kerfi</button></div></div>';
    document.body.appendChild(bak);
    let valid = null, t = null;
    const $ = id => bak.querySelector('#' + id);
    const loka = () => bak.remove();
    bak.addEventListener('click', e => { if (e.target === bak) loka(); });
    $('_skn-haetta').onclick = loka;
    $('_skn-leit').addEventListener('input', () => {
      clearTimeout(t); const q = $('_skn-leit').value.trim(); if (q.length < 2) { $('_skn-nid').innerHTML = ''; return; }
      t = setTimeout(async () => {
        const sb = SB(); if (!sb) return;
        const hrein = q.replace(/[%,()]/g, ' ');
        const { data, error } = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').or('nafn.ilike.%' + hrein + '%,kennitala.ilike.%' + hrein.replace(/\s/g, '') + '%').limit(8);
        if (error) { $('_skn-nid').innerHTML = '<div class="_skn-err">' + esc(error.message) + '</div>'; return; }
        $('_skn-nid').innerHTML = (data || []).map(f => '<button class="_skn-f" data-id="' + f.id + '" data-nafn="' + esc(f.nafn) + '"><b>' + esc(f.nafn) + '</b><span>' + esc(fmtKt(f.kennitala)) + ' · ' + esc(f.heimilisfang || '') + '</span></button>').join('') || '<div class="_sk-lbl">Ekkert fyrirtæki fannst. Stofnaðu það fyrst í „Allir viðskiptavinir".</div>';
      }, 250);
    });
    $('_skn-nid').addEventListener('click', e => {
      const b = e.target.closest('._skn-f'); if (!b) return;
      valid = { id: +b.dataset.id, nafn: b.dataset.nafn };
      $('_skn-valid').innerHTML = '✓ ' + esc(valid.nafn); $('_skn-nid').innerHTML = ''; $('_skn-leit').value = valid.nafn;
    });
    $('_skn-vista').onclick = async () => {
      const err = $('_skn-err'); err.textContent = '';
      if (!valid) { err.textContent = 'Veldu fyrirtæki úr listanum.'; return; }
      if (!$('_skn-heiti').value.trim()) { err.textContent = 'Heiti kerfis vantar.'; return; }
      const sb = SB(); if (!sb) { err.textContent = 'Engin tenging.'; return; }
      $('_skn-vista').disabled = true;
      const rod = { fyrirtaeki_id: valid.id, heiti: $('_skn-heiti').value.trim(), tegund: $('_skn-teg').value.trim() || null,
        skodunarmanudur: +$('_skn-man').value || null, fyrri_adili: $('_skn-fyrri').value.trim() || null, nota: $('_skn-nota').value.trim() || null,
        thjonustuadili: 'Brunahólf slökkvitæki ehf', updated_by: (window.CurrentUser && CurrentUser.name) || 'app' };
      const { data, error } = await sb.from(FLOKKUR.tafla).insert(rod).select('id,fyrirtaeki_id,heiti');
      $('_skn-vista').disabled = false;
      if (error || !data || !data[0]) { err.textContent = 'Skráðist ekki: ' + ((error && error.message) || 'þjónninn skilaði engri röð'); return; }
      toast('✓ ' + valid.nafn + ' · ' + data[0].heiti + ' skráð í ' + FLOKKUR.titill);
      loka(); reload();
    };
    setTimeout(() => $('_skn-leit').focus(), 50);
  }

  // ── atburðir (ein hlustun á rótinni) ────────────────────────────────────────
  function wire(v) {
    v.addEventListener('click', e => {
      const t = e.target;
      const c = t.closest('[data-st]'); if (c && c.classList.contains('_sk-chip')) { state.stada = c.dataset.st; vistaSiu(); return render(); }
      const m = t.closest('[data-m]'); if (m) { state.man = +m.dataset.m; vistaSiu(); return render(); }
      const s = t.closest('th[data-sort]'); if (s) { if (state.sort === s.dataset.sort) state.dir = -state.dir; else { state.sort = s.dataset.sort; state.dir = 1; } vistaSiu(); return render(); }
      if (t.id === '_sk-nytt') return nyttKerfi();
      if (t.id === '_sk-prenta') return prenta();
      if (t.id === '_sk-aftur') return reload();
      if (t.closest('._sk-nota,._sk-man,a,button,select,textarea,input')) return;   // reitir í röðinni eiga sinn smell
      const row = t.closest('._sk-row'); if (!row) return;
      const fid = +row.dataset.fid;
      window.__slokkvikerfiOpna = { fid, kid: +row.dataset.kid || null, at: Date.now() };   // 386 les: opna 🍳-flipann á prófílnum
      if (window._openCompanySafe) window._openCompanySafe(fid);
      else if (window.App && App.switchView) App.switchView('companies');
    });
    v.addEventListener('input', e => { if (e.target.id === '_sk-leit') { state.leit = e.target.value; const pos = e.target.selectionStart; render(); const n = document.getElementById('_sk-leit'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } } });
    v.addEventListener('change', async e => {
      const t = e.target;
      if (t.id === '_sk-postnr') { state.postnr = t.value; vistaSiu(); return render(); }
      if (t.id === '_sk-fela') { state.felaUr = t.checked; vistaSiu(); return render(); }
      if (t.classList.contains('_sk-nota')) {
        const kid = +t.dataset.kid, st = v.querySelector('._sk-notast[data-st="' + kid + '"]'), gildi = t.value.trim() || null;
        if (st) { st.textContent = '…'; st.className = '_sk-notast'; }
        const sv = await vistaKerfi(kid, { nota: gildi });
        const r = (_rows || []).find(x => x.kerfi_id === kid);
        if (sv.ok) { if (r) r.nota = gildi; if (st) { st.textContent = '✓ vistað'; st.className = '_sk-notast ok'; setTimeout(() => { if (st.textContent === '✓ vistað') st.textContent = ''; }, 2500); } }
        else { if (st) { st.textContent = '⚠ vistaðist ekki'; st.className = '_sk-notast villa'; st.title = sv.villa; } toast('⚠ Nótan vistaðist ekki: ' + sv.villa); }
        return;
      }
      if (t.classList.contains('_sk-man')) {
        const kid = +t.dataset.kid, gildi = +t.value || null;
        const sv = await vistaKerfi(kid, { skodunarmanudur: gildi });
        if (sv.ok) { toast('✓ Skoðunarmánuður vistaður'); reload(); }
        else { toast('⚠ Mánuðurinn vistaðist ekki: ' + sv.villa); reload(); }
      }
    });
  }

  // ── view + tenging (sama mynstur og 272) ────────────────────────────────────
  function ensureView() {
    let v = document.getElementById(VIEW_ID); if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.style.cssText = 'min-height:100vh;background:#eef1f5';   // ENGIN inline display — sjá open()
    const V = '#' + VIEW_ID + ' ';
    v.innerHTML = '<style>' + [
      V + '#_sk-root{max-width:1500px;margin:0 auto;padding:18px 18px 60px;font-family:var(--ui,system-ui,sans-serif);color:var(--ink,#0f172a)}',
      V + '._sk-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
      V + '._sk-hd h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#0f172a!important;background:rgba(255,255,255,.92);border-radius:8px;padding:5px 12px}' + V + '._sk-hd small{font-weight:500;color:#64748b;font-size:13px}',
      V + '._sk-sp{flex:1}',
      V + '._sk-btn{border:1px solid #d8dde6;background:#fff;color:#0f172a;border-radius:8px;padding:8px 12px;font:600 12.5px var(--ui,system-ui);cursor:pointer}',
      V + '._sk-btn:hover{border-color:#9aa3b2}',
      V + '._sk-pri{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border-color:#4d0a08;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.25)}',
      V + '._sk-villa{background:#fff0ed;border:1px solid #fca5a5;color:#8a1d12;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:13px}',
      V + '._sk-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px}',
      V + '._sk-kpi{background:#fff;border:1px solid #e2e6ee;border-radius:10px;padding:10px 12px}',
      V + '._sk-kpi small{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#64748b}',
      V + '._sk-kpi b{font-family:var(--mono,ui-monospace,monospace);font-size:24px;font-weight:700}' + V + '._sk-kpi.warn b{color:#b0201b}',
      V + '._sk-sia{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:8px}',
      V + '._sk-chip{border:1px solid #d8dde6;background:#fff;border-radius:99px;padding:4px 10px;font:600 12px var(--ui,system-ui);color:#3a4250;cursor:pointer}',
      V + '._sk-chip b{font-family:var(--mono,monospace);font-weight:700;margin-left:5px;opacity:.65}',
      V + '._sk-chip.on{color:#fff;background:linear-gradient(180deg,#3a3d45 0%,#1b1d22 100%);border-color:#000}',
      V + '._sk-chip.tom{opacity:.4}',
      V + '._sk-inp{border:1px solid #d8dde6;border-radius:8px;padding:8px 10px;font:13px var(--ui,system-ui);background:#fff;color:#0f172a;max-width:280px;width:100%;box-sizing:border-box}',
      V + '._sk-lbl{font-size:12px;color:#64748b;display:inline-flex;gap:5px;align-items:center}',
      V + '._sk-tblwrap{overflow-x:auto;background:#fff;border:1px solid #e2e6ee;border-radius:10px}',
      // sama málmband og Ársskoðun; 245 málar `.view table th` ljósgrátt með !important
      V + 'table._sk-tbl{display:table!important;width:100%;min-width:1380px!important;border-collapse:collapse;table-layout:fixed}',
      V + 'table._sk-tbl thead{display:table-header-group!important}' + V + 'table._sk-tbl tbody{display:table-row-group!important}' + V + 'table._sk-tbl tr{display:table-row!important}',
      V + 'table._sk-tbl thead tr{background:linear-gradient(180deg,#3a3d45 0%,#2a2d33 45%,#1b1d22 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 #000!important}',
      V + 'table._sk-tbl th{background:transparent!important;color:#f0f2f5!important;text-shadow:0 1px 1px rgba(0,0,0,.4)!important;border:0!important;text-transform:uppercase!important;font-weight:700!important;padding:11px 12px;font-size:10.5px;letter-spacing:.15em;text-align:left;cursor:pointer;white-space:nowrap}',
      V + '._sk-sa{color:rgba(255,255,255,.5);margin-left:4px}',
      V + 'table._sk-tbl tbody td{padding:7px 12px;border-top:1px solid #eceff4;line-height:1.25;font-size:13px;vertical-align:middle}',
      V + 'table._sk-tbl tbody tr._sk-row{cursor:pointer}' + V + 'table._sk-tbl tbody tr._sk-row:hover{background:#f7f9fd}',
      V + '._sk-row.ur{opacity:.55}',
      V + '._sk-co{display:block;font-size:13px;font-weight:600}' + V + '._sk-svc{font-size:12px}',
      V + '._sk-kt{display:block;font-family:var(--mono,monospace);font-size:10px;color:#64748b;line-height:1.2}',
      V + '._sk-kerfi{display:block;font-size:11.5px;color:#64748b;margin-top:1px}',
      V + '._sk-post{font-family:var(--mono,monospace);font-size:11px;font-weight:700;color:#64748b}',
      V + '._sk-addr{display:block;font-size:12.5px;white-space:normal;overflow-wrap:break-word}',
      V + '._sk-mono{font-family:var(--mono,monospace);font-size:12px}',
      V + '._sk-notacell{position:relative}',
      // breið nóta: punktalína eins og ferðanótan í 153, en tvær línur
      V + 'table._sk-tbl td textarea._sk-nota{overflow:hidden;display:block;width:100%;min-height:36px;resize:vertical;border:0!important;border-bottom:1px dotted #c3c9d3!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#3a4250;font:12.5px/1.35 var(--ui,system-ui);padding:2px!important;box-sizing:border-box}',
      V + 'table._sk-tbl td textarea._sk-nota::placeholder{color:#c7ccd6;letter-spacing:.14em}',
      V + 'table._sk-tbl td textarea._sk-nota:focus{overflow:auto;outline:none;border-bottom:1px solid #2f5fe0!important;background:#fff!important;color:#0f172a}',
      V + '._sk-notast{position:absolute;right:12px;bottom:2px;font-size:10px;color:#64748b}' + V + '._sk-notast.ok{color:#1c7a45}' + V + '._sk-notast.villa{color:#b0201b;font-weight:700}',
      V + 'select._sk-man{border:0;background:transparent;font-family:var(--mono,monospace);font-size:12px;color:#3a4250;cursor:pointer;padding:2px 0;max-width:100%}',
      V + '._sk-yrs{display:inline-flex;gap:4px;justify-content:center}',
      V + '._sk-sidast{display:block;font-size:10px;color:#94a3b8;margin-top:3px;font-family:var(--mono,monospace)}',
      V + '._sk-yr{display:inline-flex;align-items:center;justify-content:center;gap:5px;width:50px;height:20px;border-radius:6px;font-family:var(--mono,monospace);font-size:11px;font-weight:700;color:#aab3c0;background:#f4f6f9;border:1px solid #e7eaf0}',
      V + '._sk-yr::before{content:"";width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.14);flex:none}',
      V + '._sk-yr.lit::before{background:#37c47e;box-shadow:0 0 5px rgba(55,196,126,.8)}',
      V + '._sk-yr.on{color:#3a4250;background:#e7ebf2;border-color:#d8dde6}',
      V + '._sk-yr.now{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border-color:#4d0a08;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.25)}',
      V + '._sk-yr.both{color:#fff;background:linear-gradient(145deg,#1c7a45 0%,#0f4f2b 42%,#062815 72%,#0c3f22 100%);border-color:#041c0e}' + V + '._sk-yr.both::before{background:#7df0b4}',
      V + '._sk-yr.penda{color:#fff8e6;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border-color:rgba(255,220,130,.45)}',
      V + '._sk-skref{display:inline-flex;gap:3px}',
      V + '._sk-skref i{font-style:normal;font:700 9.5px var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;width:24px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#aab3c0;background:#f4f6f9;border:1px solid #e7eaf0}',
      V + '._sk-skref i.on{color:#fff;background:linear-gradient(145deg,#1c7a45,#0c3f22);border-color:#041c0e}',
      V + '._sk-vantar{font-size:11.5px;font-weight:600;color:#8a5c04;background:#fbeac6;border:1px solid rgba(217,146,6,.5);border-radius:6px;padding:2px 7px;white-space:nowrap}',
      V + '._sk-st{display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:7px;white-space:nowrap;min-height:26px;box-sizing:border-box;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      V + '._sk-st--work{background:linear-gradient(145deg,#2a4c8f 0%,#183363 45%,#0a1a3a 75%,#122750 100%);border:1px solid #060f24}',
      V + '._sk-st--done{background:linear-gradient(145deg,#1c7a45 0%,#0f4f2b 42%,#062815 72%,#0c3f22 100%);border:1px solid #041c0e}',
      V + '._sk-st--plan{background:linear-gradient(145deg,#5a86e0 0%,#2f5fe0 42%,#1a3a8c 72%,#2d55c4 100%);border:1px solid #12296b}',
      V + '._sk-st--late{background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border:1px solid #4d0a08}',
      V + '._sk-st--skip{color:#fff8e6;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border:1px solid rgba(255,220,130,.45)}',
      V + '._sk-st--off{color:#64748b;background:#f4f6f9;border:1px solid #e7eaf0;text-shadow:none}',
      V + '._sk-tomt{text-align:center;color:#64748b;padding:26px!important;font-size:13px}',
      V + '._sk-cards{display:none}',
      V + '._sk-card{background:#fff;border:1px solid #e2e6ee;border-radius:10px;padding:11px 12px;cursor:pointer}',
      V + '._sk-cardhd{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}',
      V + '._sk-cardnota{font-size:12.5px;color:#3a4250;margin-top:6px;border-left:2px solid #d8dde6;padding-left:8px}',
      V + '._sk-cardft{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px}',
      '@media (max-width:900px){' + V + '._sk-tblwrap{display:none}' + V + '._sk-cards{display:grid;gap:8px}' + V + '#_sk-root{padding:12px 10px 60px}' + V + '._sk-inp{max-width:none}}',
      '._sk-bak{position:fixed;inset:0;background:rgba(10,14,22,.55);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:6vh 12px;overflow:auto}',
      '._sk-modal{background:#fff;border-radius:14px;padding:18px 20px;width:100%;max-width:560px;font-family:var(--ui,system-ui,sans-serif);color:#0f172a}',
      '._sk-modal h2{margin:0 0 12px;font-size:17px}._sk-modal label{display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:10px 0 3px}',
      '._sk-modal ._sk-inp{border:1px solid #d8dde6;border-radius:8px;padding:8px 10px;font:13px system-ui;width:100%;box-sizing:border-box;background:#fff;color:#0f172a}',
      '._sk-modal ._sk-btn{border:1px solid #d8dde6;background:#fff;border-radius:8px;padding:8px 14px;font:600 13px system-ui;cursor:pointer}',
      '._sk-modal ._sk-pri{color:#fff;background:#b0201b;border-color:#4d0a08}',
      '._skn-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}._skn-ft{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
      '._skn-f{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eceff4;background:#fff;padding:7px 4px;cursor:pointer;font:13px system-ui}._skn-f:hover{background:#f7f9fd}._skn-f span{display:block;font-size:11px;color:#64748b}',
      '._skn-valid{font-size:12.5px;color:#1c7a45;font-weight:600;margin-top:4px}._skn-err{color:#b0201b;font-size:12.5px;font-weight:600;margin-top:8px}'
    ].join('') + '</style><div id="_sk-root"></div>';
    document.body.appendChild(v);
    wire(v);
    return v;
  }
  function open() {
    ensureView();
    // Klasa-stýrt eins og kjarninn (.view{display:none} / .view.active{display:block}). 272-mynstrið setti
    // inline display:block á eigin sýn; _openCompanySafe (js/mapfix.js) fjarlægir AÐEINS .active, svo síðan
    // sat áfram sýnileg undir prófílnum eftir raðarsmell (mælt 21.09). Runtime-sýnir sem nota inline block
    // (153, 272) eru faldar á þeirra eigin máta.
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.classList.remove('active'); if (x.id !== VIEW_ID && x.style.display === 'block') x.style.display = 'none'; });
    const v = document.getElementById(VIEW_ID); v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    reload();
  }
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    // Klóna „Brunakerfi yfirlit"-hnappinn svo bygging/stílun sé eins og flokkarnir standi saman.
    const ref = nav.querySelector('[data-view="brunayfirlit"]') || nav.querySelector('[data-view="brunakerfi"]') || nav.querySelector('.vnav-btn[data-view]');
    if (!ref) { setTimeout(injectSidebar, 600); return; }
    const btn = ref.cloneNode(true);
    btn.setAttribute('data-view', NAV_KEY);
    btn.classList.remove('active');
    btn.removeAttribute('style');
    const tn = [...btn.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
    if (tn) tn.textContent = ' ' + FLOKKUR.titill;
    else { const s = [...btn.querySelectorAll('span')].reverse().find(x => x.textContent.trim()); if (s) s.textContent = FLOKKUR.titill; else btn.appendChild(document.createTextNode(' ' + FLOKKUR.titill)); }
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); });
    if (ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
  }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._slokkvikerfiPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      try { const v = document.getElementById(VIEW_ID); if (v) v.classList.remove('active'); } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._slokkvikerfiPatched = true;
  }
  function boot() {
    injectSidebar(); setTimeout(injectSidebar, 1800); patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.Slokkvikerfi = { open, reload, _stada: stada, _naest: naest };
  console.log('[patch-385] Slökkvikerfis skoðun installed');
})();
/* === END SLÖKKVIKERFIS SKOÐUN === */
