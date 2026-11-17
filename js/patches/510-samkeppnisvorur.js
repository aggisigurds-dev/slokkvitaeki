/* === SAMKEPPNISAÐILAR – VÖRUR (510, 16.11.2026) — flipi í Birgðum ================================================================
 *
 * Agnar 16.11.2026: „annan flipa þarna sem heitir samkeppnisaðilar-Vörur, fara yfir vörurnar okkar, og fara yfir helstu samkeppnisaðila
 * á íslandi og setja inn hvað þeirra söluverð er, og líka á svipuðum vörum, viljum líka vita hvar við getum keypt vörur ef við verðum
 * alveg tómir … helst með myndum og link á síðuna hjá þeim" + „reyna bara finna allt sem við hefðum áhuga á að kaupa líka, kaupa ódýrara
 * en það sem við erum með núna" + „kíkja yfir reikningana hjá okkur frá þessum aðilum, á hvaða verðum við höfum verið að kaupa".
 *
 * Fjórir undirflipar:
 *   1. Ódýrara innkaup  — markaðsverð án VSK sem er LÆGRA en kostnaðarverðið sem við borgum í dag (vorur.kostnadarverd), og vörur utan skrár.
 *   2. Verðsamanburður  — söluverðið okkar á móti verði samkeppnisaðila (m. VSK).
 *   3. Hvar kaupa       — birgjar innanlands og erlendis ef við verðum tómir (B2B, sendir til Íslands, sýnishorn af verði).
 *   4. Okkar innkaup    — verðin sem við höfum borgað á birgjareikningum (afsláttur birgja, nettó á stykki).
 *   5. Útboð            — opinber útboð á eftirliti með slökkvitækjum (Reykjavík o.fl.): hverjir buðu og hvað, hver vann, gildistími, næsta útboð,
 *                         hvar var leitað og hvar má fylgjast með (Agnar 17.11.2026). Gögn: utbod, utbod_leit, utbod_vefir í JSON-skránni.
 *
 * Gögn: /js/data/samkeppnisvorur.json (opinberar heimildir, hver lína ber slóð + dagsetningu — ómælt er „—", aldrei 0) og
 * `vorur` úr gagnagrunni (okkar verð). Aðeins LESTUR: flipinn breytir engu verði og skrifar ekkert.
 * Verðbreyting hjá okkur er ákvörðun Agnars (sala-reikningar á verðlistana).
 * ================================================================================================================================ */
(() => {
  if (window.Samkeppni) return;

  const GOGN = '/js/data/samkeppnisvorur.json';
  const INNKAUP_API = '/api/samkeppni-innkaup';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slod = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
  const thus = (n) => { const s = String(Math.abs(Math.round(n))); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const kr = (n) => (n == null || !Number.isFinite(Number(n)) ? '—' : thus(Number(n)) + ' kr');
  const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1).replace('.', ',') + ' %');
  const dags = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : '—'; };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/æ/g, 'ae').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/ö/g, 'o');

  const TEGUNDIR = { samkeppnisadili: 'Samkeppnisaðili', byggingavoruverslun: 'Byggingavöruverslun', heildsali: 'Heildsali', skiltagerd: 'Skiltagerð', framleidandi: 'Framleiðandi', vefverslun: 'Vefverslun', innflytjandi: 'Innflytjandi', annad: 'Annað' };
  const tegundHeiti = (t) => TEGUNDIR[t] || (t ? String(t) : '');

  // ── Ástand ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let _g = null;           // gögnin úr JSON
  let _okkar = null;       // { [id]: vara }
  let _villa = null;
  let _innkaupVilla = null;
  let _loadP = null;
  let _rot = null;
  let _flipi = 'odyrara';
  let _q = '', _flokkur = '', _seljandi = '', _land = '';
  const _sort = {};            // röðun með smelli á dálkahaus: { [töfluId]: { k, d } } (gildir aðeins um þá töflu)
  let _rod = null;             // röðun úr felliglugganum: { k, d } — gildir um allar töflur í sýninni sem hafa dálk með þessu k
  let _utLeitOpid = false;     // „Hvar var leitað" opið á Útboð-flipanum (vistast með valinu, samstillt milli véla)
  let _opinSia = true;         // síuspjaldið opið
  let _snert = false;          // notandinn hefur snert síu/röðun — þá ræður hans val, ekki vistaða staðan
  // Síur sem eru sértækar fyrir sýn. Gildi sem jafngildir upphafsgildinu telst „engin sía".
  const SIUR_FRUM = {
    tegund: '', verdMin: '', verdMax: '', mynd: false, para: '', odyrVid: false, odyrKostn: false, bre: '', tilbod: false, felaUppsel: false, pakki: '', stadall: false, samMunur: '',
    thjKind: '', thjTegund: '', thjSamb: false, thjMunur: '',
    bTegund: '', bSendir: '', bNuv: false, bVerd: false, bKomid: false,
    ikAfsl: '', ikTimabil: '', ikPara: false,
    utTegund: '', utStada: '', utTilbod: false, utNaest: false
  };
  const F = Object.assign({}, SIUR_FRUM);
  const SIUR_FLIPI = {
    odyrara: ['tegund', 'verdMin', 'verdMax', 'para', 'bre', 'pakki', 'mynd', 'odyrVid', 'odyrKostn', 'tilbod', 'felaUppsel', 'stadall'],
    samanb: ['tegund', 'verdMin', 'verdMax', 'samMunur', 'bre', 'pakki', 'mynd', 'odyrVid', 'odyrKostn', 'tilbod', 'felaUppsel', 'stadall'],
    thjonusta: ['thjKind', 'thjTegund', 'verdMin', 'verdMax', 'thjSamb', 'thjMunur'],
    birgjar: ['bTegund', 'bSendir', 'bNuv', 'bVerd', 'bKomid'],
    innkaup: ['ikAfsl', 'ikTimabil', 'ikPara'],
    utbod: ['utTegund', 'utStada', 'utTilbod', 'utNaest']
  };
  // Röðunarvalkostir per sýn: [heiti, dálkalykill, átt]. Valkostur gildir um hverja töflu í sýninni sem hefur dálk með þessum lykli.
  const RODUN = {
    odyrara: [['Sjálfgefið (flokkur, svo lægsta verð)', null, 1], ['Verð án VSK — lægst fyrst', 'net', 1], ['Verð án VSK — hæst fyrst', 'net', -1], ['Mesti sparnaður (kr)', 'spar', -1], ['Nafn A–Ö', 'vara', 1], ['Seljandi A–Ö', 'selj', 1], ['Flokkur A–Ö', 'flokk', 1], ['Mest lækkað síðan síðast', 'bre', 1], ['Mest hækkað síðan síðast', 'bre', -1], ['Nýjast sótt', 'dags', -1]],
    samanb: [['Sjálfgefið', null, 1], ['Okkar vara A–Ö', 'vara', 1], ['Við dýrari en markaðurinn fyrst', 'mun', -1], ['Við ódýrari en markaðurinn fyrst', 'mun', 1], ['Okkar verð — hæst fyrst', 'ok', -1], ['Okkar verð — lægst fyrst', 'ok', 1], ['Lægsta verð á markaði — lægst fyrst', 'lag', 1], ['Flest verð á markaði', 'fj', -1]],
    thjonusta: [['Sjálfgefið', null, 1], ['Aðili A–Ö', 'ad', 1], ['Þjónusta A–Ö', 'thj', 1], ['Verð — lægst fyrst', 'verd', 1], ['Verð — hæst fyrst', 'verd', -1], ['Við dýrari en þeir fyrst', 'mun', -1], ['Við ódýrari en þeir fyrst', 'mun', 1], ['Nýjast sótt', 'dags', -1]],
    birgjar: [['Sjálfgefið (innanlands fyrst)', null, 1], ['Nafn A–Ö', 'nafn', 1], ['Land A–Ö', 'land', 1], ['Flest sýnishorn af verði', 'syn', -1], ['Ódýrast komið til okkar', 'komid', 1], ['Sendir til Íslands fyrst', 'sendir', 1]],
    innkaup: [['Sjálfgefið', null, 1], ['Birgir A–Ö', 'selj', 1], ['Vara A–Ö', 'vara', 1], ['Síðast keypt — nýjast fyrst', 'dags', -1], ['Mesti afsláttur', 'afsl', -1], ['Verð sem við borguðum — hæst fyrst', 'net', -1], ['Verð sem við borguðum — lægst fyrst', 'net', 1], ['Oftast keypt', 'fj', -1], ['Mest ódýrara á markaði', 'mark', 1]],
    utbod: [['Sjálfgefið (nýjasta opnun fyrst)', null, 1], ['Kaupandi A–Ö', 'kaup', 1], ['Opnun tilboða — nýjast fyrst', 'opn', -1], ['Opnun tilboða — elst fyrst', 'opn', 1], ['Lægsta tilboð — lægst fyrst', 'lag', 1], ['Flest tilboð', 'fj', -1], ['Rennur út — næst fyrst', 'rennur', 1], ['Bjóðandi A–Ö (tilboðatafla)', 'bj', 1], ['Verð — lægst fyrst (tilboðatafla)', 'verd', 1]]
  };

  // ── Vistun á vali (samstillt milli véla — AppSettings, aldrei localStorage; reglan 15.10.2026) ──────────────────────
  // Skrifað aðeins við raunverulegt val notandans (smell/innsláttur), aldrei úr lykkju eða vakt. Ein JSON-strengur í einum lykli
  // (strengur yfirskrifar í stað þess að fléttast), nýjasta valið ræður.
  const VAL_LYKILL = 'samkeppni_val';
  let _vistaT = null, _afturFengid = false, _bidurVal = false;
  let _birgjarListi = null;    // listinn sem „Hvar kaupa" sýndi síðast (með síum) — CSV-útflutningur les hann
  // 17.11.2026 (audit-vistun-timarar): biðin (500 ms) var ekki tæmd við lokun/flipaskipti — síðasta valið gat tapast.
  // vistaNuna() er sama skrif; pagehide/visibilitychange keyra það strax ef bið er í gangi.
  function vistaNuna() {
    if (!_vistaT) return;
    clearTimeout(_vistaT); _vistaT = null;
    _vistaSkrif();
  }
  window.addEventListener('pagehide', vistaNuna);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') vistaNuna(); });
  function vista() {
    _snert = true;
    clearTimeout(_vistaT);
    _vistaT = setTimeout(() => { _vistaT = null; _vistaSkrif(); }, 500);
  }
  function _vistaSkrif() {
      try {
        if (window.AppSettings && AppSettings.save) AppSettings.save({ [VAL_LYKILL]: JSON.stringify({ f: _flipi, q: _q, fl: _flokkur, se: _seljandi, la: _land, F, rod: _rod, sort: _sort, opin: _opinSia, ul: _utLeitOpid }) });
      } catch (_) { /* vistast ekki — valið gildir samt í þessum glugga */ }
  }
  function saekjaVal() {
    if (_afturFengid || _snert) return false;
    try {
      const AS = window.AppSettings;
      if (!AS || !AS.path || !(AS.isLoaded && AS.isLoaded())) return false;
      _afturFengid = true;
      const raw = AS.path(VAL_LYKILL);
      if (!raw) return false;
      const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (o.f && Object.prototype.hasOwnProperty.call(RODUN, o.f)) _flipi = o.f;
      _q = String(o.q || ''); _flokkur = String(o.fl || ''); _seljandi = String(o.se || ''); _land = String(o.la || '');
      Object.keys(SIUR_FRUM).forEach((k) => { if (o.F && k in o.F && typeof o.F[k] === typeof SIUR_FRUM[k]) F[k] = o.F[k]; });
      _rod = o.rod && typeof o.rod.k === 'string' ? { k: o.rod.k, d: o.rod.d === -1 ? -1 : 1 } : null;
      Object.keys(_sort).forEach((k) => delete _sort[k]);
      if (o.sort && typeof o.sort === 'object') Object.keys(o.sort).forEach((k) => { const s = o.sort[k]; if (s && typeof s.k === 'string') _sort[k] = { k: s.k, d: s.d === -1 ? -1 : 1 }; });
      if (typeof o.opin === 'boolean') _opinSia = o.opin;
      if (typeof o.ul === 'boolean') _utLeitOpid = o.ul;
      return true;
    } catch (_) { return false; }
  }

  async function hlada() {
    if (_loadP) return _loadP;
    _loadP = (async () => {
      try {
        const r = await fetch(GOGN + '?v=' + Date.now(), { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        _g = await r.json();
      } catch (e) { _villa = 'Náði ekki í samkeppnisgögnin: ' + (e && e.message ? e.message : e); }
      // Innkaupaverðin koma úr starfsmannafalli (ekki úr JSON-skrá): repóið er opið og kostnaðarverð/afslættir eru ekki fyrir alla.
      try {
        const r = await fetch(INNKAUP_API, { credentials: 'same-origin' });
        if (r.status === 401) _innkaupVilla = 'Innskráning starfsmanns vantar til að sjá innkaupaverð.';
        else if (!r.ok) _innkaupVilla = 'Náði ekki í innkaupaverð (' + r.status + ').';
        else { const d = await r.json(); if (_g) _g.innkaup = d.innkaup || null; if (!d.innkaup) _innkaupVilla = 'Innkaupaverð hafa ekki verið skráð enn.'; }
      } catch (e) { _innkaupVilla = 'Náði ekki í innkaupaverð: ' + (e && e.message ? e.message : e); }
      try {
        const sb = window.DB && window.DB.sb;
        if (sb) {
          // 17.11.2026 (audit-pagination): .limit(2000) gaf í mesta lagi 1000 raðir þegjandi — flett í staðinn.
          const data = await window.DB.fetchAll((from, to) => sb.from('vorur').select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,kostnadarverd,listaverd,birgi,virkt').order('id').range(from, to));
          _okkar = {};
          (data || []).forEach((v) => { _okkar[v.id] = v; });
        }
      } catch (_) { /* samanburður við okkar verð fellur þá niður, gögnin sjást samt */ }
    })();
    return _loadP;
  }

  // ── Útreikningar ─────────────────────────────────────────────────────────────────────────────────────────────────
  const okkarSala = (v) => (v && v.verd_an_vsk != null ? Number(v.verd_an_vsk) * (1 + (v.vsk_prosenta == null ? 24 : Number(v.vsk_prosenta)) / 100) : null);
  const okkarKostn = (v) => (v && v.kostnadarverd != null && Number(v.kostnadarverd) > 0 ? Number(v.kostnadarverd) : null);
  const perStk = (r) => {
    if (r.verd_per_stk_an_vsk != null && Number.isFinite(Number(r.verd_per_stk_an_vsk))) return Number(r.verd_per_stk_an_vsk);
    if (r.verd_isk_m_vsk == null || !Number.isFinite(Number(r.verd_isk_m_vsk))) return null;
    return Number(r.verd_isk_m_vsk) / (Number(r.eining_fjoldi) > 1 ? Number(r.eining_fjoldi) : 1) / 1.24;
  };
  const perStkMVsk = (r) => { const n = perStk(r); return n == null ? null : n * 1.24; };
  const markadur = () => (_g && Array.isArray(_g.vorur) ? _g.vorur.filter((r) => perStk(r) != null) : []);
  const medal = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  // ── CSS ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('_samk-css')) return;
    const s = document.createElement('style');
    s.id = '_samk-css';
    s.textContent = `
      .samk-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
      .samk-sub{display:inline-flex;gap:4px;background:var(--bg2);border:1px solid var(--brd);border-radius:10px;padding:3px;flex-wrap:wrap}
      .samk-sub button{border:0;background:transparent;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink2);padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap}
      .samk-sub button:hover{background:var(--bg1)}
      .samk-sub button.on{background:#0f172a;color:#fff}
      .samk-in,.samk-sel{padding:8px 10px;border:1px solid var(--brd);border-radius:8px;font:inherit;font-size:13px;background:var(--bg1);color:var(--ink1)}
      .samk-sel{max-width:min(100%,300px);text-overflow:ellipsis}
      .samk-in{flex:1;min-width:200px}
      .samk-note{font-size:12.5px;color:var(--ink3);margin:0 0 12px;line-height:1.5}
      .samk-tafla{width:100%;border-collapse:collapse;font-size:13px;background:var(--bg1);border:1px solid var(--brd);border-radius:10px;overflow:hidden}
      .samk-tafla th{background:#0f172a;color:#fff;text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;padding:9px 10px;white-space:nowrap}
      .samk-tafla th.srt{cursor:pointer;user-select:none}
      .samk-tafla th.srt:hover{background:#1e293b}
      .samk-tafla td{padding:8px 10px;border-top:1px solid var(--brd);vertical-align:middle}
      .samk-tafla tr:hover td{background:var(--bg2)}
      .samk-tafla .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      .samk-mynd{width:44px;height:44px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid var(--brd);display:block}
      .samk-mynd-t{width:44px;height:44px;border-radius:6px;background:var(--bg2);border:1px solid var(--brd)}
      .samk-nafn{font-weight:600;color:var(--ink1)}
      .samk-sm{font-size:11.5px;color:var(--ink3)}
      .samk-gott{color:#15803d;font-weight:700}
      .samk-slaemt{color:#b91c1c;font-weight:700}
      .samk-pill{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--bg2);color:var(--ink2);border:1px solid var(--brd);white-space:nowrap}
      .samk-pill.gr{background:#dcfce7;color:#166534;border-color:#86efac}
      .samk-pill.gu{background:#fef3c7;color:#92400e;border-color:#fcd34d}
      .samk-tengill{color:#1d4ed8;text-decoration:none;font-weight:600;white-space:nowrap}
      .samk-tengill:hover{text-decoration:underline}
      .samk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:12px}
      .samk-kort{background:var(--bg1);border:1px solid var(--brd);border-radius:12px;padding:14px;min-width:0}
      .samk-kort h4{margin:0 0 4px;font-size:14.5px;color:var(--ink1)}
      .samk-kort .l{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
      .samk-kort ul{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px}
      .samk-kort li{display:flex;gap:8px;align-items:center;font-size:12.5px}
      .samk-h{font-size:14px;font-weight:700;margin:18px 0 8px;color:var(--ink1)}
      .samk-tomt{padding:28px;text-align:center;color:var(--ink3);background:var(--bg2);border-radius:10px;font-size:13px}
      .samk-afsl{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
      .samk-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 14px}
      .samk-kpi>div{background:var(--bg1);border:1px solid var(--brd);border-radius:10px;padding:10px 12px;min-width:0}
      .samk-kpi b{display:block;font-size:22px;line-height:1.15;color:var(--ink1);font-variant-numeric:tabular-nums}
      .samk-kpi span{font-size:11.5px;color:var(--ink3)}
      .samk-kpi .g b{color:#15803d}.samk-kpi .r b{color:#b91c1c}
      .samk-bil{position:relative;height:8px;border-radius:99px;background:var(--bg2);border:1px solid var(--brd);min-width:140px}
      .samk-bil .b{position:absolute;top:0;bottom:0;border-radius:99px;background:#94a3b8}
      .samk-bil .m{position:absolute;top:-4px;width:3px;height:14px;border-radius:2px;background:#b91c1c}
      .samk-csv{margin-left:10px;border:1px solid var(--brd);background:var(--bg1);color:var(--ink1);border-radius:8px;padding:4px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;vertical-align:middle}
      .samk-csv:hover{background:var(--bg2)}
      .samk-sia{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;background:var(--bg2);border:1px solid var(--brd);border-radius:10px;padding:10px 12px;margin:0 0 10px}
      .samk-f{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--ink3);min-width:130px}
      .samk-f .samk-in{min-width:0;width:120px;flex:none}
      .samk-rofi{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2);background:var(--bg1);border:1px solid var(--brd);border-radius:8px;padding:7px 10px;cursor:pointer;white-space:nowrap}
      .samk-rofi:hover{background:var(--bg2)}
      .samk-rofi input{margin:0;width:16px;height:16px}
      .samk-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px;min-height:30px;align-content:flex-start}
      .samk-chip{border:1px solid #cbd5e1;background:var(--bg1);color:var(--ink1);border-radius:99px;padding:4px 11px;font:inherit;font-size:12px;cursor:pointer}
      .samk-chip:hover{background:#fee2e2;border-color:#fecaca}
      .samk-tk{border:1px solid var(--brd);background:var(--bg1);color:var(--ink1);border-radius:8px;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
      .samk-tk:hover{background:var(--bg2)}
      .samk-tk.on{background:#0f172a;color:#fff;border-color:#0f172a}
      .samk-scroll{overflow-x:auto;max-width:100%;border-radius:10px}
      .samk-tilb{margin:0;padding:0;list-style:none;display:grid;gap:2px;min-width:240px}
      .samk-vef{white-space:normal;max-width:300px;min-width:180px;line-height:1.4}
      .samk-tl{list-style:none;margin:0 0 14px;padding:0 0 0 20px;border-left:3px solid #cbd5e1;display:grid;gap:10px}
      .samk-tl-i,.samk-tl-nu{position:relative}
      .samk-tl-i{background:var(--bg1);border:1px solid var(--brd);border-radius:10px;padding:9px 12px;display:grid;gap:3px}
      .samk-tl-i::before,.samk-tl-nu::before{content:'';position:absolute;left:-30px;top:13px;width:12px;height:12px;border-radius:50%;background:#94a3b8;border:2px solid var(--bg1);box-shadow:0 0 0 1px #94a3b8}
      .samk-tl-i.utbod::before{background:#16a34a;box-shadow:0 0 0 1px #16a34a}
      .samk-tl-i.urslit::before{background:#2563eb;box-shadow:0 0 0 1px #2563eb}
      .samk-tl-i.lok::before{background:#dc2626;box-shadow:0 0 0 1px #dc2626}
      .samk-tl-nu{font-size:12px;font-weight:700;color:#b91c1c;padding:2px 0}
      .samk-tl-nu::before{background:#b91c1c;box-shadow:0 0 0 3px #fecaca;top:5px}
      .samk-tl-d{font-weight:700;font-size:13.5px;color:var(--ink1)}
      .samk-vef2{white-space:normal;line-height:1.45;max-width:760px}
      .samk-vef3{white-space:normal;line-height:1.4;font-size:12.5px;min-width:240px;max-width:460px}
      .samk-det{background:var(--bg1);border:1px solid var(--brd);border-radius:10px;padding:10px 12px;margin:0 0 14px}
      .samk-det summary{cursor:pointer;font-weight:700;font-size:13px;color:var(--ink1)}
      @media(max-width:900px){.samk-tafla{display:block;overflow-x:auto;white-space:nowrap}}
    `;
    document.head.appendChild(s);
  }

  // ── Smáhlutir í birtingu ─────────────────────────────────────────────────────────────────────────────────────────
  const mynd = (u, alt) => (slod(u) ? `<img class="samk-mynd" loading="lazy" referrerpolicy="no-referrer" src="${esc(slod(u))}" alt="${esc(alt)}" onerror="this.style.visibility='hidden'">` : '<div class="samk-mynd-t"></div>');
  const tengill = (u, texti) => (slod(u) ? `<a class="samk-tengill" href="${esc(slod(u))}" target="_blank" rel="noopener noreferrer">${esc(texti || 'Opna')} ↗</a>` : '<span class="samk-sm">án tengils</span>');

  // Gild röðun töflu: smellt á dálkahaus gengur fyrir, annars röðunin úr felliglugganum (ef taflan hefur dálk með þeim lykli)
  const flokkurAf = (x) => (x.r ? x.r.flokkur : x.v ? x.v.flokkur : '') || '';
  function virkRod(id, cols) {
    if (_sort[id]) return _sort[id];
    if (_rod) {
      if (_rod.k === 'flokk' && !cols.some((c) => c.k === 'flokk')) return _rod;
      if (cols.some((c) => c.k === _rod.k && c.v)) return _rod;
    }
    return null;
  }
  function rada(id, rows, cols) {
    const s = virkRod(id, cols);
    if (!s) return rows;
    const c = cols.find((x) => x.k === s.k);
    const val = c && c.v ? c.v : (s.k === 'flokk' ? flokkurAf : null);
    if (!val) return rows;
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y, 'is') : x - y) * s.d;
    });
  }
  const textiAf = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const _tof = {};   // töflurnar sem voru teiknaðar (id → {cols, rows}) — CSV-útflutningur les þær í sömu röð og á skjánum
  const csvTakki = (id) => `<button type="button" class="samk-csv" onclick="window.Samkeppni._csv('${id}')" title="Sækja þessa töflu sem CSV (Excel, semíkomma)">Sækja CSV</button>`;
  function sækjaCsv(nafn, haus, linur) {
    const reit = (v) => { const s = String(v == null ? '' : v).replace(/\r?\n/g, ' '); return /[";]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const txt = '﻿' + [haus, ...linur].map((l) => l.map(reit).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = `${nafn}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const kpi = (l) => `<div class="samk-kpi">${l.map(([tala, texti, lit]) => `<div class="${lit || ''}"><b>${esc(tala)}</b><span>${esc(texti)}</span></div>`).join('')}</div>`;
  function tafla(id, cols, rows) {
    if (!rows.length) { delete _tof[id]; return '<div class="samk-tomt">Ekkert fannst með þessum síum.</div>'; }
    _tof[id] = { cols, rows };
    const s = virkRod(id, cols);
    const syn = cols.filter((c) => !c.fela);   // fela: dálkurinn fer aðeins í CSV, ekki á skjáinn
    const haus = syn.map((c) => `<th class="${c.v ? 'srt' : ''}${c.r ? ' r' : ''}"${c.v ? ` onclick="window.Samkeppni._rada('${id}','${c.k}')"` : ''}>${esc(c.t)}${s && s.k === c.k ? (s.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const lik = rada(id, rows, cols).map((r) => `<tr>${syn.map((c) => `<td class="${c.r ? 'r' : ''}">${c.h(r)}</td>`).join('')}</tr>`).join('');
    return `<div class="samk-scroll"><table class="samk-tafla"><thead><tr>${haus}</tr></thead><tbody>${lik}</tbody></table></div>`;
  }

  const UPPSEL = /ekki til á lager|uppselt|ekki á lager|útselt|outofstock/i;
  const TILBOD = /tilbo(ð|d)|afslátt|útsala|útsölu|\bsale\b/i;
  const STADALL = /\bEN ?\d|\bISO ?\d|\bCE\b|UKCA|\bDIN ?\d/i;
  const tolu = (s) => { if (s === '' || s == null) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
  // Síur sem eiga við markaðsraðir (vörur hjá seljendum): verðbil, tegund seljanda, pörun, breyting, tilboð …
  function markadsSia(r) {
    const pm = perStkMVsk(r);
    if (F.tegund && r.tegund_seljanda !== F.tegund) return false;
    const lo = tolu(F.verdMin), hi = tolu(F.verdMax);
    if (lo != null && (pm == null || pm < lo)) return false;
    if (hi != null && (pm == null || pm > hi)) return false;
    if (F.mynd && !slod(r.mynd_url)) return false;
    if (F.para === 'ja' && r.okkar_id == null) return false;
    if (F.para === 'nei' && r.okkar_id != null) return false;
    const v = r.okkar_id != null && _okkar ? _okkar[r.okkar_id] : null;
    if (F.odyrVid) { const ok = okkarSala(v); if (ok == null || pm == null || !(pm < ok)) return false; }
    if (F.odyrKostn) { let k = okkarKostn(v); if (k == null && r.samb_kostn != null) k = Number(r.samb_kostn); const n = perStk(r); if (k == null || n == null || !(n < k)) return false; }
    if (F.bre) {
      const b = breyting(r);
      if (F.bre === 'haekkad' && !(b != null && b > 1)) return false;
      if (F.bre === 'laekkad' && !(b != null && b < -1)) return false;
      if (F.bre === 'breytt' && !(b != null && Math.abs(b) > 1)) return false;
      if (F.bre === 'obreytt' && !(b != null && Math.abs(b) <= 1)) return false;
      if (F.bre === 'ny' && b != null) return false;
    }
    if (F.tilbod && !TILBOD.test(r.athugasemd || '')) return false;
    if (F.felaUppsel && UPPSEL.test(r.athugasemd || '')) return false;
    if (F.pakki === 'stakt' && Number(r.eining_fjoldi) > 1) return false;
    if (F.pakki === 'pakki' && !(Number(r.eining_fjoldi) > 1)) return false;
    if (F.stadall && !STADALL.test([r.nafn, r.staerd, r.athugasemd].join(' '))) return false;
    return true;
  }
  function passar(r) {
    if (_flokkur && (r.flokkur || '') !== _flokkur) return false;
    if (_seljandi && (r.seljandi || '') !== _seljandi) return false;
    if (_q) {
      const hey = norm([r.nafn, r.lysing, r.staerd, r.seljandi, r.flokkur, r.athugasemd, r.vara, r.vorur].join(' '));
      if (!_q.split(/\s+/).every((t) => hey.includes(norm(t)))) return false;
    }
    if (r && r.verd_isk_m_vsk !== undefined && !markadsSia(r)) return false;   // markaðsröð (ekki innkaupalína eða þjónustuverð)
    return true;
  }

  // Breyting á verði frá síðustu mælingu (r.fyrra_verd_m_vsk / r.fyrra_dags koma úr competitor_prices þegar sama slóð var mæld áður)
  const breyting = (r) => (r.fyrra_verd_m_vsk && perStkMVsk(r) != null ? ((perStkMVsk(r) - Number(r.fyrra_verd_m_vsk)) / Number(r.fyrra_verd_m_vsk)) * 100 : null);
  const breytingHtml = (r) => { const b = breyting(r); return b == null ? '<span class="samk-sm">—</span>' : `<span class="${b > 1 ? 'samk-slaemt' : b < -1 ? 'samk-gott' : ''}">${pct(b)}</span><div class="samk-sm">${esc(dags(r.fyrra_dags))}</div>`; };

  // ── 1. Ódýrara innkaup ───────────────────────────────────────────────────────────────────────────────────────────
  function odyrara() {
    const m = markadur().filter(passar);
    const samanb = m.map((r) => {
      const v = r.okkar_id != null && _okkar ? _okkar[r.okkar_id] : null;
      const k = okkarKostn(v);
      const n = perStk(r);
      return { r, v, k, n, sparnadur: k != null && n != null ? k - n : null };
    });
    const odyrari = samanb.filter((x) => x.sparnadur != null && x.sparnadur > 0.5).sort((a, b) => (b.sparnadur / b.k) - (a.sparnadur / a.k));
    // Möguleikar: raðir sem voru bornar við kostnaðarverðið okkar (samb_kostn) án þess að pörunin sé sönnuð — „staðfestu að varan sé sambærileg"
    const mogul = samanb.filter((x) => !(x.sparnadur != null && x.sparnadur > 0.5) && x.r.samb_kostn != null && x.n != null && x.n < Number(x.r.samb_kostn))
      .map((x) => ({ ...x, k2: Number(x.r.samb_kostn), spar2: Number(x.r.samb_kostn) - x.n }))
      .sort((a, b) => (b.spar2 / b.k2) - (a.spar2 / a.k2));
    const moguleg = new Set(mogul.map((x) => x.r));
    const utan = samanb.filter((x) => x.r.okkar_id == null && !moguleg.has(x.r)).sort((a, b) => String(a.r.flokkur).localeCompare(String(b.r.flokkur), 'is') || a.n - b.n);
    const dyrara = samanb.filter((x) => x.k != null && x.sparnadur != null && x.sparnadur <= 0.5);
    const vantar = samanb.filter((x) => x.r.okkar_id != null && x.k == null).length;

    const cols = [
      { k: 'mynd', t: '', h: (x) => mynd(x.r.mynd_url, x.r.nafn) },
      { k: 'vara', t: 'Vara hjá seljanda', v: (x) => x.r.nafn, h: (x) => `<div class="samk-nafn">${esc(x.r.nafn)}</div><div class="samk-sm">${esc([x.r.staerd, x.r.flokkur].filter(Boolean).join(' · '))}${x.r.eining_fjoldi > 1 ? ` · verð fyrir ${esc(x.r.eining_fjoldi)} stk` : ''}</div>` },
      { k: 'okkar', t: 'Okkar vara', v: (x) => (x.v ? x.v.nafn : null), h: (x) => (x.v ? esc(x.v.nafn) : '<span class="samk-sm">—</span>') },
      { k: 'selj', t: 'Seljandi', v: (x) => x.r.seljandi, h: (x) => `${esc(x.r.seljandi)}<div class="samk-sm">${esc(tegundHeiti(x.r.tegund_seljanda))}</div>` },
      { k: 'kostn', t: 'Við kaupum á', r: 1, v: (x) => x.k, h: (x) => kr(x.k) },
      { k: 'net', t: 'Þeirra án VSK', r: 1, v: (x) => x.n, h: (x) => kr(x.n) },
      { k: 'spar', t: 'Sparnaður', r: 1, v: (x) => x.sparnadur, h: (x) => `<span class="samk-gott">${kr(x.sparnadur)}</span><div class="samk-sm">${pct(-(x.sparnadur / x.k) * 100)}</div>` },
      { k: 'bre', t: 'Frá síðustu mælingu', r: 1, v: (x) => breyting(x.r), h: (x) => breytingHtml(x.r) },
      { k: 'dags', t: 'Sótt', v: (x) => x.r.dags || _g.sott, h: (x) => esc(dags(x.r.dags || _g.sott)) },
      { k: 'url', t: 'Síða', c: (x) => x.r.url || '', h: (x) => tengill(x.r.url, 'Opna') }
    ];
    const colsMogul = [
      { k: 'mynd', t: '', h: (x) => mynd(x.r.mynd_url, x.r.nafn) },
      { k: 'vara', t: 'Vara hjá seljanda', v: (x) => x.r.nafn, h: (x) => `<div class="samk-nafn">${esc(x.r.nafn)}</div><div class="samk-sm">${esc([x.r.staerd, x.r.flokkur].filter(Boolean).join(' · '))}${x.r.eining_fjoldi > 1 ? ` · verð fyrir ${esc(x.r.eining_fjoldi)} stk` : ''}</div>` },
      { k: 'okkar', t: 'Okkar vara', v: (x) => x.r.samb_vara, h: (x) => esc(x.r.samb_vara || '') },
      { k: 'selj', t: 'Seljandi', v: (x) => x.r.seljandi, h: (x) => `${esc(x.r.seljandi)}<div class="samk-sm">${esc(tegundHeiti(x.r.tegund_seljanda))}</div>` },
      { k: 'kostn', t: 'Við kaupum á', r: 1, v: (x) => x.k2, h: (x) => kr(x.k2) },
      { k: 'net', t: 'Þeirra án VSK', r: 1, v: (x) => x.n, h: (x) => kr(x.n) },
      { k: 'spar', t: 'Sparnaður', r: 1, v: (x) => x.spar2, h: (x) => `<span class="samk-gott">${kr(x.spar2)}</span><div class="samk-sm">${pct(-(x.spar2 / x.k2) * 100)}</div>` },
      { k: 'ath', t: 'Athugasemd', h: (x) => `<span class="samk-sm">${esc(x.r.athugasemd || '')}</span>` },
      { k: 'url', t: 'Síða', c: (x) => x.r.url || '', h: (x) => tengill(x.r.url, 'Opna') }
    ];
    const colsUtan = [
      { k: 'mynd', t: '', h: (x) => mynd(x.r.mynd_url, x.r.nafn) },
      { k: 'vara', t: 'Vara', v: (x) => x.r.nafn, h: (x) => `<div class="samk-nafn">${esc(x.r.nafn)}</div><div class="samk-sm">${esc([x.r.staerd, x.r.flokkur].filter(Boolean).join(' · '))}</div>` },
      { k: 'selj', t: 'Seljandi', v: (x) => x.r.seljandi, h: (x) => `${esc(x.r.seljandi)}<div class="samk-sm">${esc(tegundHeiti(x.r.tegund_seljanda))}</div>` },
      { k: 'm', t: 'Verð m. VSK', r: 1, v: (x) => perStkMVsk(x.r), h: (x) => kr(perStkMVsk(x.r)) },
      { k: 'net', t: 'Án VSK', r: 1, v: (x) => x.n, h: (x) => kr(x.n) },
      { k: 'bre', t: 'Frá síðustu mælingu', r: 1, v: (x) => breyting(x.r), h: (x) => breytingHtml(x.r) },
      { k: 'ath', t: 'Athugasemd', h: (x) => `<span class="samk-sm">${esc(x.r.athugasemd || '')}</span>` },
      { k: 'url', t: 'Síða', c: (x) => x.r.url || '', h: (x) => tengill(x.r.url, 'Opna') }
    ];
    const medalSpar = odyrari.length ? odyrari.reduce((a, x) => a + x.sparnadur / x.k, 0) / odyrari.length * 100 : null;
    const kpiHtml = kpi([
      [odyrari.length, 'vörur ódýrari en við kaupum á í dag', odyrari.length ? 'g' : ''],
      [medalSpar == null ? '—' : medalSpar.toFixed(0) + ' %', 'meðalsparnaður á þeim'],
      [mogul.length, 'möguleikar til að staðfesta (sambærileg vara?)', mogul.length ? 'g' : ''],
      [utan.length, 'vörur utan skrár okkar'],
      [new Set(m.map((r) => r.seljandi)).size, 'seljendur í niðurstöðum'],
      [dyrara.length, 'pöruð verð ≥ okkar kostnaðarverði']
    ]);
    return `${kpiHtml}
      <p class="samk-note">Hér sjást aðeins vörur þar sem <b>verð án VSK</b> hjá seljanda er lægra en <b>kostnaðarverðið sem við borgum í dag</b> (kostnaðarverð í Birgðum, eftir afslátt birgja). Verð úr verslunum er deilt með 1,24. Hafðu í huga: verð í vefverslun er smásöluverð og flutningur, magnskilmálar og tollar bætast við hjá erlendum birgjum — staðfestu verðið hjá seljanda áður en pantað er.
      ${vantar ? `<br><b>${vantar}</b> vörur eiga pörun við okkar vöru en vantar kostnaðarverð hjá okkur, svo þær komast ekki í samanburðinn.` : ''}</p>
      <div class="samk-h">Ódýrara en við kaupum á í dag (${odyrari.length})${odyrari.length ? csvTakki('odyrara') : ''}</div>
      ${odyrari.length ? tafla('odyrara', cols, odyrari) : `<div class="samk-tomt">Ekkert fannst ódýrara en núverandi kostnaðarverð með þessum síum.${dyrara.length ? ` Næst kemst þetta: ${dyrara.length} pöruð verð eru jafn há eða hærri en við borgum nú.` : ''}</div>`}
      <div class="samk-h">Möguleikar til að skoða — staðfestu að varan sé sambærileg (${mogul.length})${mogul.length ? csvTakki('mogul') : ''}</div>
      <p class="samk-note">Ódýrari en kostnaðarverðið okkar, en pörunin (tegund, stærð, vottun) er ekki sönnuð — t.d. önnur gerð af rafhlöðu eða stút. Athugaðu athugasemdina og vöruna sjálfa áður en nokkuð er keypt.</p>
      ${mogul.length ? tafla('mogul', colsMogul, mogul) : '<div class="samk-tomt">Engir möguleikar fundust.</div>'}
      <div class="samk-h">Vörur utan skrár okkar — gætu verið áhugaverðar (${utan.length})${utan.length ? csvTakki('utan') : ''}</div>
      <p class="samk-note">Vörur sem við seljum ekki enn eða hafa ekki pörun við vöru í Vörum og þjónustu. Röðun: flokkur, svo lægsta verð fyrst.</p>
      ${tafla('utan', colsUtan, utan)}`;
  }

  // Verðbil á markaði: grá súla frá lægsta til hæsta verði, rautt strik = okkar verð m. VSK
  function bilSula(x) {
    const v = x.l.map(perStkMVsk).filter((n) => n != null);
    if (!v.length) return '';
    const lo = Math.min(...v, x.ok == null ? Infinity : x.ok), hi = Math.max(...v, x.ok == null ? -Infinity : x.ok);
    const sk = (n) => (hi === lo ? 50 : ((n - lo) / (hi - lo)) * 100);
    const a = sk(Math.min(...v)), b = sk(Math.max(...v));
    return `<div class="samk-bil" title="Markaður ${thus(Math.min(...v))}–${thus(Math.max(...v))} kr${x.ok != null ? ' · við ' + thus(x.ok) + ' kr' : ''}"><span class="b" style="left:${a}%;width:${Math.max(b - a, 2)}%"></span>${x.ok != null ? `<span class="m" style="left:calc(${sk(x.ok)}% - 1px)"></span>` : ''}</div><div class="samk-sm">${thus(Math.min(...v))}–${thus(Math.max(...v))}</div>`;
  }

  // ── 2. Verðsamanburður (sala) ────────────────────────────────────────────────────────────────────────────────────
  function samanburdur() {
    const m = markadur().filter(passar).filter((r) => r.okkar_id != null && _okkar && _okkar[r.okkar_id]);
    const hopar = {};
    m.forEach((r) => { (hopar[r.okkar_id] = hopar[r.okkar_id] || []).push(r); });
    let rows = Object.keys(hopar).map((id) => {
      const v = _okkar[id];
      const l = hopar[id];
      const verd = l.map(perStkMVsk).filter((x) => x != null);
      const lagst = l.reduce((a, b) => (perStkMVsk(b) < perStkMVsk(a) ? b : a), l[0]);
      const ok = okkarSala(v);
      const med = medal(verd);
      return { v, l, ok, lagst, lagstVerd: perStkMVsk(lagst), med, munur: ok != null && med != null ? ((ok - med) / med) * 100 : null };
    });
    if (F.samMunur) rows = rows.filter((x) => x.munur != null && (F.samMunur === 'dyrari' ? x.munur > 3 : F.samMunur === 'odyrari' ? x.munur < -3 : Math.abs(x.munur) <= 3));
    const cols = [
      { k: 'vara', t: 'Okkar vara', v: (x) => x.v.nafn, h: (x) => `<div class="samk-nafn">${esc(x.v.nafn)}</div><div class="samk-sm">${esc(x.v.flokkur || '')}</div>` },
      { k: 'ok', t: 'Okkar verð m. VSK', r: 1, v: (x) => x.ok, h: (x) => kr(x.ok) },
      { k: 'lag', t: 'Lægst hjá', r: 1, v: (x) => x.lagstVerd, h: (x) => `${kr(x.lagstVerd)}<div class="samk-sm">${esc(x.lagst.seljandi)}</div>` },
      { k: 'med', t: 'Miðgildi', r: 1, v: (x) => x.med, h: (x) => kr(x.med) },
      { k: 'mun', t: 'Við vs miðgildi', r: 1, v: (x) => x.munur, h: (x) => `<span class="${x.munur > 3 ? 'samk-slaemt' : x.munur < -3 ? 'samk-gott' : ''}">${pct(x.munur)}</span>` },
      { k: 'bil', t: 'Verðbil á markaði', h: (x) => bilSula(x) },
      { k: 'fj', t: 'Verð', r: 1, v: (x) => x.l.length, h: (x) => `${x.l.length}` },
      { k: 'ja', t: 'Leita', c: (x) => '', h: (x) => tengill('https://ja.is/vorur/?q=' + encodeURIComponent(String(x.v.nafn).replace(/\.\s*(Slökkvitæki|AB|ABC)\b.*$/i, '').slice(0, 60)), 'ja.is') },
      { k: 'tilb', t: 'Hjá', h: (x) => x.l.slice().sort((a, b) => perStkMVsk(a) - perStkMVsk(b)).slice(0, 5).map((r) => `<div>${slod(r.url) ? tengill(r.url, r.seljandi) : esc(r.seljandi)} <span class="samk-sm">${kr(perStkMVsk(r))}</span></div>`).join('') }
    ];
    const odyrariVid = rows.filter((x) => x.munur != null && x.munur < -3).length, dyrariVid = rows.filter((x) => x.munur != null && x.munur > 3).length;
    const kpiHtml = kpi([
      [rows.length, 'vörur með samanburð'],
      [odyrariVid, 'við ódýrari en miðgildið', odyrariVid ? 'g' : ''],
      [dyrariVid, 'við dýrari en miðgildið', dyrariVid ? 'r' : ''],
      [rows.length - odyrariVid - dyrariVid, 'á svipuðu verði (±3 %)']
    ]);
    return `${kpiHtml}<p class="samk-note">Söluverðið okkar (m. VSK, úr Vörum og þjónustu) á móti verði samkeppnisaðila. Neikvæð prósenta = við erum ódýrari en miðgildið. Aðeins vörur með nákvæma pörun (sama tegund og stærð) eru taldar — annað er „ómælt". ${rows.length ? csvTakki('samanb') : ''}</p>${tafla('samanb', cols, rows)}`;
  }

  // ── 3. Hvar kaupa ────────────────────────────────────────────────────────────────────────────────────────────────
  function birgjar() {
    let l = _g && Array.isArray(_g.birgjar) ? _g.birgjar : [];
    if (_land === 'is') l = l.filter((b) => b.land === 'Ísland');
    else if (_land === 'erl') l = l.filter((b) => b.land !== 'Ísland');
    if (_q) l = l.filter((b) => { const hey = norm([b.nafn, b.land, b.tegund, b.vorur, b.athugasemd].join(' ')); return _q.split(/\s+/).every((t) => hey.includes(norm(t))); });
    if (F.bTegund) l = l.filter((b) => b.tegund === F.bTegund);
    if (F.bSendir) l = l.filter((b) => (b.sendir_til_islands || 'óvíst') === F.bSendir);
    if (F.bNuv) l = l.filter((b) => b.nuverandi_birgir);
    if (F.bVerd) l = l.filter((b) => (b.synishorn || []).some((s) => s && s.verd_erl != null));
    if (F.bKomid) l = l.filter((b) => (b.synishorn || []).some((s) => s && s.komid_an_vsk != null));
    const lagstKomid = (b) => { const k = (b.synishorn || []).map((s) => s && s.komid_an_vsk).filter((n) => n != null); return k.length ? Math.min(...k) : null; };
    const rodBirgja = {
      nafn: (a, b) => String(a.nafn).localeCompare(String(b.nafn), 'is'),
      land: (a, b) => String(a.land || '').localeCompare(String(b.land || ''), 'is') || String(a.nafn).localeCompare(String(b.nafn), 'is'),
      syn: (a, b) => (b.synishorn || []).length - (a.synishorn || []).length,
      komid: (a, b) => { const x = lagstKomid(a), y = lagstKomid(b); return x == null && y == null ? 0 : x == null ? 1 : y == null ? -1 : x - y; },
      sendir: (a, b) => { const o = { 'já': 0, 'óvíst': 1, 'nei': 2 }; return (o[a.sendir_til_islands] ?? 3) - (o[b.sendir_til_islands] ?? 3); }
    };
    if (_rod && rodBirgja[_rod.k]) l = [...l].sort(rodBirgja[_rod.k]);   // átt er innbyggð í hvern samanburð (sbr. RODUN.birgjar)
    _birgjarListi = l;
    if (!l.length) return '<div class="samk-tomt">Engir birgjar með þessum síum.</div>';
    const kort = (b) => {
      const synKomid = (s) => {
        if (s.komid_an_vsk == null) return '';
        const v = s.okkar_id != null && _okkar ? _okkar[s.okkar_id] : null;
        const k = okkarKostn(v);
        const st = k != null ? ` <span class="${s.komid_an_vsk < k ? 'samk-gott' : 'samk-slaemt'}">(við kaupum á ${kr(k)}${s.komid_an_vsk < k ? ' — ' + pct(-((k - s.komid_an_vsk) / k) * 100) : ''})</span>` : '';
        return `<br><span class="samk-sm" title="${esc(s.forsendur || '')}">Komið til okkar ≈ <b>${kr(s.komid_an_vsk)}</b> án VSK${s.eining_fjoldi > 1 ? ' á stk' : ''}${st}${s.stadall ? ' · ' + esc(s.stadall) : ''}</span>`;
      };
      const sy = (b.synishorn || []).filter((s) => s && s.vara).slice(0, 6).map((s) => `<li>${mynd(s.mynd_url, s.vara)}<span>${slod(s.url) ? tengill(s.url, s.vara) : esc(s.vara)}<br><span class="samk-sm">${s.verd_erl != null ? esc(s.verd_erl) + ' ' + esc(s.mynt || '') + (s.vsk ? ' · ' + esc(s.vsk) + ' VSK' : '') : 'verð ekki birt'}</span>${synKomid(s)}</span></li>`).join('');
      return `<div class="samk-kort">
        <h4>${esc(b.nafn)}</h4>
        <div class="samk-sm">${esc(b.land || '')} · ${esc(tegundHeiti(b.tegund))}</div>
        <div class="l">
          ${b.nuverandi_birgir ? '<span class="samk-pill gr">Núverandi birgir</span>' : ''}
          ${b.b2b ? `<span class="samk-pill">${esc(b.b2b)}</span>` : ''}
          ${b.sendir_til_islands ? `<span class="samk-pill ${b.sendir_til_islands === 'já' ? 'gr' : 'gu'}">Sendir til Íslands: ${esc(b.sendir_til_islands)}</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--ink2)">${esc(b.vorur || '')}</div>
        ${b.magn_lagmark ? `<div class="samk-sm" style="margin-top:4px">Lágmarkspöntun: ${esc(b.magn_lagmark)}</div>` : ''}
        ${b.ath_fluttning ? `<div class="samk-sm" style="margin-top:4px">Flutningur/tollar: ${esc(b.ath_fluttning)}</div>` : ''}
        ${b.athugasemd ? `<div class="samk-sm" style="margin-top:4px">${esc(b.athugasemd)}</div>` : ''}
        <div style="margin-top:8px">${tengill(b.vefur, 'Heimasíða')}</div>
        ${sy ? `<ul>${sy}</ul>` : ''}
      </div>`;
    };
    const is = l.filter((b) => b.land === 'Ísland'), erl = l.filter((b) => b.land !== 'Ísland');
    const kpiHtml = kpi([[l.length, 'birgjar í niðurstöðum'], [is.length, 'innanlands'], [erl.length, 'erlendis'], [l.filter((b) => b.nuverandi_birgir).length, 'núverandi birgjar'], [l.filter((b) => b.sendir_til_islands === 'já').length, 'senda til Íslands (staðfest)', 'g']]);
    return `${kpiHtml}<p class="samk-note">${csvTakki('birgjar')} Hvar við getum keypt ef við verðum tómir. Aðeins opinberar upplýsingar af vefsíðum birgja — engin samskipti hafa átt sér stað. „Sendir til Íslands" er skráð eftir því sem birgirinn birtir sjálfur; óvíst þýðir að það þarf að spyrja.</p>
      ${is.length ? `<div class="samk-h">Innanlands (${is.length})</div><div class="samk-grid">${is.map(kort).join('')}</div>` : ''}
      ${erl.length ? `<div class="samk-h">Erlendis (${erl.length})</div><div class="samk-grid">${erl.map(kort).join('')}</div>` : ''}`;
  }

  // ── 4. Okkar innkaup (birgjareikningar) ──────────────────────────────────────────────────────────────────────────
  function innkaup() {
    const ik = _g && _g.innkaup && Array.isArray(_g.innkaup.linur) ? _g.innkaup.linur : [];
    const ekkiLesid = _g && _g.innkaup && Array.isArray(_g.innkaup.ekki_lesid) ? _g.innkaup.ekki_lesid : [];
    if (!ik.length) return `<div class="samk-tomt">${esc(_innkaupVilla || 'Innkaupalínur hafa ekki verið lesnar inn enn.')}</div>`;
    const fraDagsF = F.ikTimabil ? new Date(Date.now() - Number(F.ikTimabil) * 30.5 * 864e5).toISOString().slice(0, 10) : '';
    const l = ik.filter((r) => passar({ nafn: r.lysing, seljandi: r.seljandi, athugasemd: r.vorunr, flokkur: '' }) && (!_seljandi || r.seljandi === _seljandi)
      && (!F.ikAfsl || (r.afslattur_pct != null && Number(r.afslattur_pct) >= Number(F.ikAfsl)))
      && (!fraDagsF || String(r.dags) >= fraDagsF)
      && (!F.ikPara || r.okkar_id != null));
    // Afsláttaryfirlit per birgi (reiknað af línunum, ekki af samantekt)
    const yfir = {};
    const fra = new Date(Date.now() - 548 * 864e5).toISOString().slice(0, 10);   // síðustu 18 mánuðir — gamlir reikningar skekkja yfirlitið
    l.filter((r) => String(r.dags) >= fra).forEach((r) => { const k = r.seljandi; yfir[k] = yfir[k] || {}; const a = r.afslattur_pct == null ? 'óþekktur' : Number(r.afslattur_pct); yfir[k][a] = (yfir[k][a] || 0) + 1; });
    const afslChips = Object.keys(yfir).map((s) => `<div class="samk-kort" style="padding:10px 12px"><b>${esc(s)}</b><div class="l">${Object.keys(yfir[s]).sort((a, b) => yfir[s][b] - yfir[s][a]).map((a) => `<span class="samk-pill ${Number(a) > 0 ? 'gr' : ''}">${a === 'óþekktur' ? 'afsláttur óþekktur' : Number(a) > 0 ? esc(String(a).replace('.', ',')) + ' % afsláttur' : 'enginn afsláttur'} · ${yfir[s][a]} ${yfir[s][a] === 1 ? 'lína' : 'línur'}</span>`).join('')}</div></div>`).join('');
    // Ein röð per vara og birgi: nýjasta verð + saga
    const hopar = {};
    l.forEach((r) => { const k = r.seljandi + '|' + (r.vorunr || r.lysing); (hopar[k] = hopar[k] || []).push(r); });
    const rows = Object.values(hopar).map((a) => {
      a.sort((x, y) => String(y.dags).localeCompare(String(x.dags)));
      const n = a[0];
      const nets = a.map((x) => Number(x.netto_eining_an_vsk)).filter((x) => Number.isFinite(x));
      const mark = n.okkar_id != null ? markadur().filter((r) => r.okkar_id === n.okkar_id).map((r) => ({ r, n: perStk(r) })).sort((x, y) => x.n - y.n)[0] : null;
      return { n, a, lagst: nets.length ? Math.min(...nets) : null, haest: nets.length ? Math.max(...nets) : null, mark };
    });
    const cols = [
      { k: 'selj', t: 'Birgir', v: (x) => x.n.seljandi, h: (x) => esc(x.n.seljandi) },
      { k: 'vara', t: 'Vara', v: (x) => x.n.lysing, h: (x) => `<div class="samk-nafn">${esc(x.n.lysing)}</div><div class="samk-sm">${esc(x.n.vorunr || '')}</div>` },
      { k: 'dags', t: 'Síðast keypt', v: (x) => x.n.dags, h: (x) => `${esc(dags(x.n.dags))}<div class="samk-sm">${esc(x.n.reikningur || '')}</div>` },
      { k: 'lista', t: 'Listaverð án VSK', r: 1, v: (x) => (x.n.lista_an_vsk == null ? null : Number(x.n.lista_an_vsk)), h: (x) => kr(x.n.lista_an_vsk) },
      { k: 'afsl', t: 'Afsláttur', r: 1, v: (x) => (x.n.afslattur_pct == null ? 0 : Number(x.n.afslattur_pct)), h: (x) => (Number(x.n.afslattur_pct) > 0 ? `${esc(String(x.n.afslattur_pct).replace('.', ','))} %` : '—') },
      { k: 'net', t: 'Við borguðum án VSK', r: 1, v: (x) => (x.n.netto_eining_an_vsk == null ? null : Number(x.n.netto_eining_an_vsk)), h: (x) => `<b>${kr(x.n.netto_eining_an_vsk)}</b>` },
      { k: 'fj', t: 'Kaup', r: 1, v: (x) => x.a.length, h: (x) => `${x.a.length}${x.lagst != null && x.haest != null && Math.round(x.lagst) !== Math.round(x.haest) ? `<div class="samk-sm">${thus(x.lagst)}–${thus(x.haest)}</div>` : ''}` },
      { k: 'mark', t: 'Lægst á markaði (án VSK)', r: 1, v: (x) => (x.mark ? x.mark.n : null), h: (x) => (x.mark ? `<span class="${x.n.netto_eining_an_vsk != null && x.mark.n < x.n.netto_eining_an_vsk ? 'samk-gott' : ''}">${kr(x.mark.n)}</span><div class="samk-sm">${esc(x.mark.r.seljandi)}</div>` : '<span class="samk-sm">—</span>') },
      { k: 'pdf', t: 'Reikningur', h: (x) => (x.n.drive_id ? tengill('https://drive.google.com/file/d/' + encodeURIComponent(x.n.drive_id) + '/view', 'PDF') : '') }
    ];
    const dagar = ik.map((r) => r.dags).filter(Boolean).sort();
    const kpiHtml = kpi([[new Set(ik.map((r) => r.reikningur)).size, 'reikningar lesnir'], [ik.length, 'vörulínur'], [new Set(ik.map((r) => r.seljandi)).size, 'birgjar'], [dagar.length ? dags(dagar[dagar.length - 1]) : '—', 'síðasti reikningur']]);
    return `${kpiHtml}<p class="samk-note">Verðin sem við höfum borgað birgjum, lesin af reikningum í Drive. Afslátturinn er sá sem stendur á hverri reikningslínu — hann er ekki alltaf sá sami (Oger gefur t.d. mest 35 % en lægri afslátt á sumum vörum). „Lægst á markaði" er lægsta verð án VSK sem fannst hjá öðrum seljanda fyrir sömu vöru.</p>
      <div class="samk-sm" style="margin:0 0 6px">Afslættir á reikningum síðustu 18 mánuði (taflan sýnir alla sögu):</div>
      <div class="samk-afsl">${afslChips || '<span class="samk-sm">Engir reikningar á tímabilinu.</span>'}</div><div class="samk-h" style="margin-top:0">Allar vörur og verðin sem við höfum borgað${csvTakki('innkaup')}</div>${tafla('innkaup', cols, rows)}
      ${ekkiLesid.length ? `<div class="samk-h">Vantar enn</div><ul class="samk-note" style="padding-left:18px">${ekkiLesid.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
  }

  // ── 5. Þjónustuverð keppinauta (hleðsla, yfirferð, akstur …) ─────────────────────────────────────────────────────
  // Okkar þjónustuvörur eru flokkaðar eftir heiti (tegund + þjónusta + stærð) — sama þjónusta og sama stærðarbil telst sambærileg.
  const gerdTaekis = (s) => (/duft/i.test(s) ? 'duft' : /co₂|co2|kolsýr/i.test(s) ? 'co2' : /vatn|froð/i.test(s) ? 'vatn' : /slang/i.test(s) ? 'brunaslanga' : '');
  const gerdThjonustu = (s) => (/yfirfer|skoðun/i.test(s) ? 'yfirferð' : /hleðsl|helðsl|áfylling/i.test(s) ? 'hleðsla' : '');
  const stadirUr = (s) => { const t = String(s || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g); if (!t) return null; const n = t.map(Number); return n.length > 1 ? [Math.min(...n), Math.max(...n)] : [n[0], n[0]]; };
  let _okkarThj = null;
  function okkarThjonusta() {
    if (_okkarThj || !_okkar) return _okkarThj || [];
    _okkarThj = Object.values(_okkar).filter((v) => v && v.nafn && v.flokkur === 'Þjónusta').map((v) => {
      const st = stadirUr(String(v.nafn).replace(/CO₂/g, 'CO'));
      return { v, tegund: gerdTaekis(v.nafn), thj: gerdThjonustu(v.nafn), st: st ? st[0] : null, verd: okkarSala(v) };
    }).filter((x) => x.tegund && x.thj && x.verd != null);
    return _okkarThj;
  }
  const FASTAR = { 'akstur': 136, 'tímagjald': 134, 'förgun': 151 };
  // Önnur eining en „á tæki": kílómetragjald, tímagjald á slöngu, áfylling á gasflösku/kút … — ekki sambærilegt við okkar föstu verð
  const OSAMBAERILEG_EINING = /km|klst|flösk|kút|bör|á tæki|hylki/i;
  function okkarSamsvarandi(t) {
    const lbl = String(t.size_label || '');
    if (FASTAR[t.service_kind] && _okkar && _okkar[FASTAR[t.service_kind]]) {
      if (t.service_kind === 'akstur' && /km/i.test(lbl)) return null;
      const v = _okkar[FASTAR[t.service_kind]]; return { l: [okkarSala(v)], nofn: [v.nafn] };
    }
    const tg = gerdTaekis(t.product_type || ''), th = gerdThjonustu(t.service_kind || '');
    if (OSAMBAERILEG_EINING.test(lbl)) return null;
    if (!tg || !th || tg === 'brunaslanga') {
      if (tg === 'brunaslanga' && th === 'yfirferð' && _okkar && _okkar[32]) return { l: [okkarSala(_okkar[32])], nofn: [_okkar[32].nafn] };
      return null;
    }
    const rng = stadirUr(t.size_label);
    const l = okkarThjonusta().filter((x) => x.tegund === tg && x.thj === th && (!rng || (x.st != null && x.st >= rng[0] - 0.01 && x.st <= rng[1] + 0.01)));
    return l.length ? { l: l.map((x) => x.verd), nofn: l.map((x) => x.v.nafn) } : null;
  }
  function thjonusta() {
    const allt = _g && Array.isArray(_g.thjonusta) ? _g.thjonusta : [];
    const lo = tolu(F.verdMin), hi = tolu(F.verdMax);
    const rows = allt.map((t) => ({ seljandi: t.vendor, nafn: [t.service_kind, t.product_type].filter(Boolean).join(' '), staerd: t.size_label, flokkur: '', athugasemd: t.notes, t }))
      .filter(passar).map((x) => {
        const o = okkarSamsvarandi(x.t);
        const okMed = o ? o.l.slice().sort((a, b) => a - b)[Math.floor((o.l.length - 1) / 2)] : null;
        return { ...x, o, okMed, munur: okMed != null ? ((okMed - x.t.price_incl_vat) / x.t.price_incl_vat) * 100 : null };
      }).filter((x) => (!F.thjKind || x.t.service_kind === F.thjKind) && (!F.thjTegund || (x.t.product_type || '') === F.thjTegund)
        && (lo == null || x.t.price_incl_vat >= lo) && (hi == null || x.t.price_incl_vat <= hi)
        && (!F.thjSamb || x.munur != null)
        && (F.thjMunur !== 'dyrari' || (x.munur != null && x.munur > 3)) && (F.thjMunur !== 'odyrari' || (x.munur != null && x.munur < -3)));
    if (!allt.length) return '<div class="samk-tomt">Engin þjónustuverð hafa verið skráð enn.</div>';
    const pr = rows.filter((x) => x.munur != null);
    const odyr = pr.filter((x) => x.munur < -3).length, dyr = pr.filter((x) => x.munur > 3).length;
    const kpiHtml = kpi([[rows.length, 'þjónustuverð'], [new Set(rows.map((x) => x.t.vendor)).size, 'aðilar'], [pr.length, 'með sambærilegri þjónustu hjá okkur'], [odyr, 'við ódýrari', odyr ? 'g' : ''], [dyr, 'við dýrari', dyr ? 'r' : '']]);
    const cols = [
      { k: 'ad', t: 'Aðili', v: (x) => x.t.vendor, h: (x) => esc(x.t.vendor) },
      { k: 'thj', t: 'Þjónusta', v: (x) => x.t.service_kind, h: (x) => `${esc(x.t.service_kind)}<div class="samk-sm">${esc([x.t.product_type === 'co2' ? 'CO₂' : x.t.product_type, x.t.size_label && x.t.size_label !== '—' ? x.t.size_label : ''].filter(Boolean).join(' · '))}</div>` },
      { k: 'verd', t: 'Verð m. VSK', r: 1, v: (x) => x.t.price_incl_vat, h: (x) => kr(x.t.price_incl_vat) },
      { k: 'ok', t: 'Okkar verð m. VSK', r: 1, v: (x) => x.okMed, h: (x) => (x.o ? `${kr(x.okMed)}${x.o.l.length > 1 ? `<div class="samk-sm" title="${esc(x.o.nofn.join(' · '))}">${Math.min(...x.o.l) === Math.max(...x.o.l) ? x.o.l.length + ' stærðir, sama verð' : thus(Math.min(...x.o.l)) + '–' + thus(Math.max(...x.o.l)) + ' kr (' + x.o.l.length + ' stærðir)'}</div>` : `<div class="samk-sm">${esc(x.o.nofn[0])}</div>`}` : '<span class="samk-sm">—</span>') },
      { k: 'mun', t: 'Við vs þeir', r: 1, v: (x) => x.munur, h: (x) => (x.munur == null ? '<span class="samk-sm">—</span>' : `<span class="${x.munur > 3 ? 'samk-slaemt' : x.munur < -3 ? 'samk-gott' : ''}">${pct(x.munur)}</span>`) },
      { k: 'ath', t: 'Athugasemd', h: (x) => `<span class="samk-sm">${esc(x.t.notes || '')}</span>` },
      { k: 'dags', t: 'Sótt', v: (x) => x.t.dags || _g.sott, h: (x) => esc(dags(x.t.dags || _g.sott)) },
      { k: 'url', t: 'Síða', c: (x) => x.t.source_url || '', h: (x) => tengill(x.t.source_url, 'Opna') }
    ];
    return `${kpiHtml}
      <p class="samk-note">Opinber verð á hleðslu, yfirferð og annarri þjónustu hjá öðrum (gjaldskrár sveitarfélaga og slökkviliða, auglýst verð fyrirtækja). <b>Jákvæð prósenta = við erum dýrari</b> en þeir, neikvæð = við ódýrari (okkar söluverð m. VSK úr Vörum og þjónustu, miðgildi þeirra stærða sem falla í sama stærðarbil). Slökkvilið taka gjald fyrir sitt sveitarfélag og eru ekki endilega í beinni samkeppni við okkur. Verð Securitas og Öryggismiðstöðvarinnar fyrir þjónustu eru ekki birt opinberlega. ${rows.length ? csvTakki('thjonusta') : ''}</p>
      ${tafla('thjonusta', cols, rows)}`;
  }

  // ── 6. Útboð — opinber útboð á eftirliti með slökkvitækjum (Agnar 17.11.2026) ──────────────────────────────────────
  // Gögn: _g.utbod (útboð með tilboðum), _g.utbod_leit (hvar var leitað), _g.utbod_vefir (hvar má fylgjast með). Aðeins lestur.
  const UTB_TEGUND = { sveitarfelag: 'Sveitarfélag', rikid: 'Ríkið', spitali: 'Spítali / heilbrigðisstofnun', stofnun: 'Stofnun', opinbert_fyrirtaeki: 'Opinbert fyrirtæki', erlent: 'Erlent viðmið' };
  const UTB_STADA = { opid: 'Opið núna', bid_urslita: 'Beðið úrslita', i_gildi: 'Samningur í gildi', lokid: 'Lokið', runnid_ut: 'Runnið út', othekkt: 'Óþekkt' };
  const UTB_STADA_LIT = { opid: 'gu', bid_urslita: 'gu', i_gildi: 'gr' };
  const UTB_LEIT = { fannst: 'Útboð fannst', ekkert: 'Ekkert fannst', ekki_adgengilegt: 'Ekki aðgengilegt' };
  const UTB_FLOKKUR_TEGUND = { sveitarfelag: 'Sveitarfélög', rikid: 'Ríkið' };
  const tilbodMedVerd = (t) => (t.tilbod || []).filter((b) => b.verd != null);
  const lagstaTilbod = (t) => { const v = tilbodMedVerd(t).map((b) => b.verd); return v.length ? Math.min(...v) : null; };
  const einStutt = (t) => (/vegi/i.test(t.eining_verds || '') ? 'vegið einingaverð án VSK' : /heildar(ver|tilbo)/i.test(t.eining_verds || '') ? 'heildarverð samnings (sjá VSK í texta)' : 'eining: sjá útboð');
  const heimildirHtml = (l) => (l || []).map((h) => tengill(h.slod, h.texti)).join('<br>');
  const dagsRennur = (t) => (t.rennur_ut ? dags(t.rennur_ut) + (t.rennur_ut_vissa === 'alyktad' ? ' (ályktað)' : t.rennur_ut_vissa === 'auglysing' ? ' (skv. útboðsauglýsingu)' : '') : '');
  const manudirTil = (iso) => { const d = new Date(iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? null : Math.round((d.getTime() - Date.now()) / (30.44 * 864e5)); };
  // Tímatafla: atburðir (t.atburdir, annars samningslok úr t.rennur_ut) í tímaröð. Dagsnið: YYYY-MM-DD, YYYY-MM eða YYYY-Qn.
  const MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  function evDags(s) {
    const x = String(s || '');
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x);
    if (m) { const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); return { t, fra: t, til: t + 864e5 - 1, label: `${+m[3]}. ${MANUDIR[+m[2] - 1]} ${m[1]}` }; }
    m = /^(\d{4})-(\d{2})$/.exec(x);
    if (m) { const fra = Date.UTC(+m[1], +m[2] - 1, 1), til = Date.UTC(+m[1], +m[2], 1) - 1; return { t: Math.round((fra + til) / 2), fra, til, label: `${MANUDIR[+m[2] - 1]} ${m[1]}` }; }
    m = /^(\d{4})-Q([1-4])$/.exec(x);
    if (m) { const fra = Date.UTC(+m[1], (+m[2] - 1) * 3, 1), til = Date.UTC(+m[1], +m[2] * 3, 1) - 1; return { t: Math.round((fra + til) / 2), fra, til, label: `${m[2]}. ársfjórðungur ${m[1]}` }; }
    return null;
  }
  const TL_TEGUND = { utbod: ['Útboð', 'gr'], urslit: ['Úrslit væntanleg', ''], lok: ['Samningur rennur út', 'gu'] };
  const TL_VISSA = { stadfest: ['staðfest', 'gr'], alyktad: ['ályktað', 'gu'], auglysing: ['skv. auglýsingu', 'gr'] };
  function timataflaHtml(rows) {
    const nu = Date.now();
    const ev = [];
    rows.filter((x) => x.t.tegund_kaupanda !== 'erlent').forEach((x) => {
      const t = x.t;
      const l = Array.isArray(t.atburdir) && t.atburdir.length ? t.atburdir
        : (t.rennur_ut && t.stada !== 'runnid_ut' && t.stada !== 'lokid' ? [{ dags: t.rennur_ut, tegund: 'lok', texti: 'Samningur rennur út.', vissa: t.rennur_ut_vissa }] : []);
      l.forEach((e) => { const d = evDags(e.dags); if (d && d.til >= nu) ev.push({ e, d, t }); });
    });
    if (!ev.length) return '';
    ev.sort((a, b) => a.d.t - b.d.t || a.t.kaupandi.localeCompare(b.t.kaupandi, 'is'));
    const rel = (d) => {
      if (d.fra <= nu && d.til >= nu && d.til - d.fra > 864e5) return 'yfirstandandi tímabil';
      const m = Math.round((d.t - nu) / (30.44 * 864e5));
      return m < 1 ? 'innan mánaðar' : 'eftir ' + m + ' mán.';
    };
    const idag = new Date();
    const li = ev.map(({ e, d, t }) => {
      const [tt, tc] = TL_TEGUND[e.tegund] || TL_TEGUND.utbod;
      const v = TL_VISSA[e.vissa];
      return `<li class="samk-tl-i ${esc(e.tegund)}"><div class="samk-tl-d">${esc(d.label)} <span class="samk-sm">· ${esc(rel(d))}</span></div>
        <div><span class="samk-pill ${tc}">${esc(tt)}</span> <b>${esc(t.kaupandi)}</b>${t.nr ? ' <span class="samk-sm">nr. ' + esc(t.nr) + '</span>' : ''}${v ? ` <span class="samk-pill ${v[1]}">${esc(v[0])}</span>` : ''}</div>
        <div class="samk-sm samk-vef2">${esc(e.texti)}</div></li>`;
    }).join('');
    return `<div class="samk-h" style="margin-top:0">Tímatafla: næstu úrslit, útboð og samningslok</div>
      <ol class="samk-tl"><li class="samk-tl-nu">Í dag · ${idag.getDate()}. ${MANUDIR[idag.getMonth()]} ${idag.getFullYear()}</li>${li}</ol>
      <p class="samk-note" style="margin-top:-6px">Græn merking „staðfest“ eða „skv. auglýsingu“ kemur úr gögnum kaupanda. Gul merking „ályktað“ er mín ályktun af gildistíma og fyrri umferðum, ekki tilkynning frá kaupanda.</p>`;
  }
  const tilbodHtml = (x) => {
    const l = [...(x.t.tilbod || [])].sort((a, b) => (a.verd == null ? 1 : b.verd == null ? -1 : a.verd - b.verd));
    if (!l.length) return '<span class="samk-sm">Tilboð ekki birt</span>';
    return `<ul class="samk-tilb">${l.map((b) => `<li class="${b.sigurvegari ? 'samk-gott' : ''}">${esc(b.bjodandi)} — ${b.verd != null ? thus(b.verd) + ' kr' : 'verð ekki birt'}${b.stig != null ? ' · ' + esc(b.stig) + ' stig' : ''}${b.sigurvegari ? ' ✓ samið við' : ''}</li>`).join('')}</ul>${x.t.eining_verds ? `<div class="samk-sm samk-vef">${esc(x.t.eining_verds)}</div>` : ''}`;
  };
  function utbod() {
    const allt = _g && Array.isArray(_g.utbod) ? _g.utbod : [];
    if (!allt.length) return '<div class="samk-tomt">Engin útboð hafa verið skráð enn.</div>';
    const leitAllt = Array.isArray(_g.utbod_leit) ? _g.utbod_leit : [];
    const vefirAllt = Array.isArray(_g.utbod_vefir) ? _g.utbod_vefir : [];
    const radirAllar = allt.map((t) => ({ seljandi: t.kaupandi, nafn: t.titill, athugasemd: [t.nr, t.tegund, t.athugasemd, t.gildistimi, t.naesta_utbod, (t.tilbod || []).map((b) => b.bjodandi).join(' ')].join(' '), t }))
      .filter(passar).filter((x) => { const t = x.t; return (!F.utTegund || t.tegund_kaupanda === F.utTegund) && (!F.utStada || t.stada === F.utStada) && (!F.utTilbod || tilbodMedVerd(t).length > 0) && (!F.utNaest || t.rennur_ut || t.naesta_utbod || (t.atburdir && t.atburdir.length)); });
    // Íslensk útboð í aðaltöflunum og tímatöflunni; erlend (Norðurlönd) sér, aðeins sem verðviðmið
    const erGreidsla = (t) => /án útboðs/i.test(t.tegund || '');   // greiddir reikningar ríkisstofnana til seljanda (ekki útboð)
    const rows = radirAllar.filter((x) => x.t.tegund_kaupanda !== 'erlent' && !erGreidsla(x.t));
    const erl = radirAllar.filter((x) => x.t.tegund_kaupanda === 'erlent');
    const greidslur = radirAllar.filter((x) => erGreidsla(x.t));
    const tilRows = [];
    rows.forEach((x) => (x.t.tilbod || []).forEach((b) => tilRows.push({ t: x.t, b })));
    const opin = rows.filter((x) => x.t.stada === 'opid').length;
    const kpiHtml = kpi([[rows.length, 'útboð skráð'], [new Set(rows.map((x) => x.t.kaupandi)).size, 'kaupendur með útboð'], [tilRows.filter((r) => r.b.verd != null).length, 'tilboð með birtu verði'], [opin, 'opin útboð núna', opin ? 'g' : ''], [(_g.utbod_leit || []).length, 'staðir sem leitað var á']]);

    // Næstu útboð: samningar sem renna út, næsti fyrst
    const naest = rows.filter((x) => x.t.rennur_ut && x.t.stada !== 'runnid_ut' && x.t.stada !== 'lokid').map((x) => x.t).sort((a, b) => a.rennur_ut.localeCompare(b.rennur_ut));
    const kortNaest = (t) => {
      const m = manudirTil(t.rennur_ut);
      return `<div class="samk-kort">
        <h4>${esc(t.kaupandi)} · nr. ${esc(t.nr)}</h4>
        <div class="samk-sm">${esc(t.titill)}</div>
        <div class="l"><span class="samk-pill gu" style="white-space:normal">${t.stada === 'bid_urslita' ? 'Samningstími á að ljúka' : 'Samningur rennur út'} ≈ ${esc(dagsRennur(t))}${m != null && m > 0 ? ' · eftir ' + m + ' mán.' : ''}</span></div>
        ${t.naesta_utbod ? `<div style="font-size:13px;color:var(--ink2)">${esc(t.naesta_utbod)}</div>` : ''}
        ${t.gildistimi ? `<div class="samk-sm" style="margin-top:4px">Gildistími: ${esc(t.gildistimi)}</div>` : ''}
        <div style="margin-top:8px">${heimildirHtml(t.heimildir)}</div>
      </div>`;
    };
    const naestHtml = naest.length ? `<div class="samk-h">Nánar um samningana sem renna út</div><div class="samk-grid">${naest.map(kortNaest).join('')}</div>` : '';
    const tlHtml = timataflaHtml(rows);

    // Verðþróun milli umferða: aðeins þegar karfan er sú sama (sama kaupandi, sama körfuheiti) — annars er ekki hægt að bera tölurnar saman
    const prof = {};
    allt.filter((t) => t.karfa).forEach((t) => tilbodMedVerd(t).forEach((b) => {
      const k = t.kaupandi + ' · ' + t.karfa;
      prof[k] = prof[k] || {};
      (prof[k][b.bjodandi] = prof[k][b.bjodandi] || []).push({ opn: t.opnun || '', verd: b.verd });
    }));
    const throun = [];
    Object.keys(prof).forEach((k) => Object.keys(prof[k]).forEach((bj) => {
      const l = prof[k][bj].sort((a, b) => String(a.opn).localeCompare(String(b.opn)));
      if (l.length < 2) return;
      const fyrst = l[0], sidast = l[l.length - 1];
      throun.push({ k, bj, l, mun: ((sidast.verd - fyrst.verd) / fyrst.verd) * 100 });
    }));
    const throunHtml = throun.length ? `<div class="samk-h">Verðþróun milli umferða (sama karfa)</div><div class="samk-afsl">${throun.map((x) => `<div class="samk-kort" style="padding:10px 12px"><b>${esc(x.bj)}</b><div class="samk-sm">${esc(x.k)}</div><div class="l">${x.l.map((p) => `<span class="samk-pill">${esc(String(p.opn).slice(0, 4))}: ${thus(p.verd)} kr</span>`).join('<span class="samk-sm">→</span>')}<span class="samk-pill ${x.mun < -1 ? 'gr' : x.mun > 1 ? 'gu' : ''}">${pct(x.mun)}</span></div></div>`).join('')}</div>` : '';

    const cols = [
      { k: 'kaup', t: 'Kaupandi', v: (x) => x.t.kaupandi, h: (x) => `<div class="samk-nafn">${esc(x.t.kaupandi)}</div><div class="samk-sm">${esc(UTB_TEGUND[x.t.tegund_kaupanda] || '')}</div>` },
      { k: 'utb', t: 'Útboð', v: (x) => x.t.titill, h: (x) => `<div class="samk-nafn">${x.t.nr ? 'Nr. ' + esc(x.t.nr) : ''}${x.t.tegund ? (x.t.nr ? ' · ' : '') + esc(x.t.tegund) : ''}</div><div class="samk-vef">${esc(x.t.titill)}</div>${x.t.athugasemd ? `<div class="samk-sm samk-vef" style="margin-top:4px" title="${esc(x.t.athugasemd)}">${esc(x.t.athugasemd.length > 170 ? x.t.athugasemd.slice(0, 167) + '…' : x.t.athugasemd)}</div>` : ''}` },
      { k: 'opn', t: 'Opnun tilboða', v: (x) => x.t.opnun || null, h: (x) => (x.t.opnun ? esc(dags(x.t.opnun)) : '<span class="samk-sm">—</span>') },
      // ATH: dálkahaus má ekki innihalda „staða"/„stada" (líka „Niðurstaða") — 00-legacy.js (l. 2899) breytir þá hverri töflu í tækjastöðu-fellilista sem skrifar í uttaeki
      { k: 'stada', t: 'Ástand', v: (x) => UTB_STADA[x.t.stada] || '', h: (x) => `<span class="samk-pill ${UTB_STADA_LIT[x.t.stada] || ''}">${esc(UTB_STADA[x.t.stada] || '—')}</span>` },
      { k: 'tilb', t: 'Tilboð (eining verðs undir)', h: tilbodHtml },
      { k: 'lag', t: 'Lægsta tilboð', r: 1, v: (x) => lagstaTilbod(x.t), h: (x) => kr(lagstaTilbod(x.t)) },
      { k: 'fj', t: 'Fjöldi tilboða', r: 1, v: (x) => (x.t.tilbod || []).length, h: (x) => String((x.t.tilbod || []).length) },
      { k: 'staerd', t: 'Áætluð stærð', c: (x) => x.t.staerd || '', h: (x) => (x.t.staerd ? `<div class="samk-sm samk-vef">${esc(x.t.staerd)}</div>` : '<span class="samk-sm">ekki birt</span>') },
      { k: 'gild', t: 'Gildistími og lok', v: (x) => x.t.rennur_ut || null, c: (x) => [x.t.gildistimi, x.t.rennur_ut ? 'Rennur út ≈ ' + dagsRennur(x.t) : ''].filter(Boolean).join(' · '), h: (x) => `${x.t.rennur_ut ? `<b>≈ ${esc(dagsRennur(x.t))}</b>` : ''}${x.t.gildistimi ? `<div class="samk-sm samk-vef">${esc(x.t.gildistimi)}</div>` : '<span class="samk-sm">—</span>'}` },
      { k: 'naest', t: 'Næsta útboð', c: (x) => x.t.naesta_utbod || '', h: (x) => (x.t.naesta_utbod ? `<div class="samk-vef">${esc(x.t.naesta_utbod)}</div>` : '<span class="samk-sm">—</span>') },
      { k: 'ath', t: 'Athugasemd', fela: true, c: (x) => x.t.athugasemd || '', h: () => '' },
      { k: 'heim', t: 'Heimildir', c: (x) => (x.t.heimildir || []).map((h) => h.slod).join(' '), h: (x) => heimildirHtml(x.t.heimildir) }
    ];
    const yfirLagsta = (r) => { const l = lagstaTilbod(r.t); return r.b.verd != null && l ? ((r.b.verd - l) / l) * 100 : null; };
    const adrirValdir = (r) => (r.t.tilbod || []).some((b) => b.sigurvegari);
    const cols2 = [
      { k: 'bj', t: 'Bjóðandi', v: (x) => x.b.bjodandi, h: (x) => `<span class="${x.b.sigurvegari ? 'samk-gott' : ''}">${esc(x.b.bjodandi)}</span>` },
      { k: 'kaup', t: 'Kaupandi', v: (x) => x.t.kaupandi, h: (x) => esc(x.t.kaupandi) },
      { k: 'opn', t: 'Útboð', v: (x) => x.t.opnun || null, h: (x) => `${x.t.nr ? 'Nr. ' + esc(x.t.nr) : ''}<div class="samk-sm">${esc(dags(x.t.opnun))}</div>` },
      { k: 'verd', t: 'Verð', r: 1, v: (x) => x.b.verd, h: (x) => (x.b.verd != null ? `<b>${kr(x.b.verd)}</b><div class="samk-sm">${esc(einStutt(x.t))}</div>` : '<span class="samk-sm">ekki birt</span>') },
      { k: 'yfir', t: 'Yfir lægsta', r: 1, v: yfirLagsta, h: (x) => { const y = yfirLagsta(x); return y == null ? '<span class="samk-sm">—</span>' : Math.abs(y) < 0.05 ? '<span class="samk-gott">lægst</span>' : pct(y); } },
      { k: 'stig', t: 'Stig', r: 1, v: (x) => x.b.stig, h: (x) => (x.b.stig != null ? esc(x.b.stig) : '<span class="samk-sm">—</span>') },
      { k: 'nid', t: 'Úrslit', h: (x) => (x.b.sigurvegari ? '<span class="samk-pill gr">Samið við</span>' : adrirValdir(x) ? '<span class="samk-sm">Ekki valið</span>' : '<span class="samk-sm">ekki skráð</span>') }
    ];

    // Hvar var leitað (líka þar sem ekkert fannst — það sparar næstu leit)
    const hey = (l) => norm([l.kaupandi, l.hvar_leitad, l.athugasemd, l.nidurstada].join(' '));
    const leitRows = leitAllt.filter((l) => (!_seljandi || l.kaupandi === _seljandi) && (!F.utTegund || l.tegund_kaupanda === F.utTegund) && (!_q || _q.split(/\s+/).every((t) => hey(l).includes(norm(t)))));
    const cols3 = [
      { k: 'kaup', t: 'Kaupandi', v: (x) => x.kaupandi, h: (x) => `<div class="samk-nafn">${esc(x.kaupandi)}</div><div class="samk-sm">${esc(UTB_TEGUND[x.tegund_kaupanda] || '')}</div>` },
      { k: 'nid', t: 'Útkoma', v: (x) => UTB_LEIT[x.nidurstada] || '', h: (x) => `<span class="samk-pill ${x.nidurstada === 'fannst' ? 'gr' : x.nidurstada === 'ekki_adgengilegt' ? 'gu' : ''}">${esc(UTB_LEIT[x.nidurstada] || '')}</span>` },
      { k: 'hvar', t: 'Hvar leitað', h: (x) => `<div class="samk-vef">${esc(x.hvar_leitad || '')}</div>` },
      { k: 'ath', t: 'Athugasemd', h: (x) => `<div class="samk-sm samk-vef">${esc(x.athugasemd || '')}</div>` },
      { k: 'url', t: 'Síða', c: (x) => x.slod || '', h: (x) => tengill(x.slod, 'Opna') }
    ];
    const nF = leitRows.filter((l) => l.nidurstada === 'fannst').length;
    const leitHtml = leitRows.length ? `<div class="samk-h">Hvar var leitað</div>
      <details class="samk-det"${_utLeitOpid ? ' open' : ''}><summary onclick="event.preventDefault();window.Samkeppni._leitToggle()">${leitRows.length} ${leitRows.length === 1 ? 'staður' : 'staðir'} (kaupendur og útboðsgáttir) · ${nF} þar sem útboð fannst · ${leitRows.length - nF} þar sem ekkert fannst eða síða ekki aðgengileg (smelltu til að ${_utLeitOpid ? 'fela' : 'sýna'})</summary>
      <p class="samk-note" style="margin-top:8px">${csvTakki('utbod_leit')} Þar sem ekkert fannst er það skráð líka. „Ekki aðgengilegt“ þýðir að síðan svarar ekki sjálfvirkum fyrirspurnum og þarf að skoða í vafra.</p>
      ${tafla('utbod_leit', cols3, leitRows)}</details>` : '';

    // Hvar má fylgjast með útboðum — tenglar á útboðsvefi og innkaupasíður
    const vefir = vefirAllt.filter((v) => (!F.utTegund || v.flokkur === 'Útboðsgáttir' || v.flokkur === UTB_FLOKKUR_TEGUND[F.utTegund])
      && (!_q || _q.split(/\s+/).every((t) => norm([v.nafn, v.lysing, v.flokkur].join(' ')).includes(norm(t)))));
    const flokkar = [...new Set(vefir.map((v) => v.flokkur))];
    const vefirHtml = vefir.length ? `<div class="samk-h">Hvar má fylgjast með útboðum</div>${flokkar.map((f) => `<div class="samk-sm" style="margin:10px 0 6px;font-weight:700">${esc(f)}</div><div class="samk-grid">${vefir.filter((v) => v.flokkur === f).map((v) => `<div class="samk-kort"><h4>${esc(v.nafn)}</h4><div style="font-size:13px;color:var(--ink2)">${esc(v.lysing)}</div><div style="margin-top:8px">${tengill(v.slod, 'Opna')}</div></div>`).join('')}</div>`).join('')}` : '';

    const colsE = [
      { k: 'kaup', t: 'Kaupandi', v: (x) => x.t.kaupandi, h: (x) => `<div class="samk-nafn">${esc(x.t.kaupandi)}</div><div class="samk-sm">${esc(x.t.nr)}</div>` },
      { k: 'opn', t: 'Opnun', v: (x) => x.t.opnun || null, h: (x) => (x.t.opnun ? esc(dags(x.t.opnun)) : '<span class="samk-sm">—</span>') },
      { k: 'stada', t: 'Ástand', v: (x) => UTB_STADA[x.t.stada] || '', h: (x) => `<span class="samk-pill ${UTB_STADA_LIT[x.t.stada] || ''}">${esc(UTB_STADA[x.t.stada] || '—')}</span>` },
      { k: 'staerd', t: 'Verðmæti og reiknað verð (ISK-viðmið)', c: (x) => x.t.staerd || '', h: (x) => `<div class="samk-vef3">${esc(x.t.staerd || '')}</div>` },
      { k: 'gild', t: 'Gildistími', v: (x) => x.t.rennur_ut || null, c: (x) => x.t.gildistimi || '', h: (x) => `<div class="samk-sm samk-vef">${esc(x.t.gildistimi || '')}</div>` },
      { k: 'ath', t: 'Athugasemd', c: (x) => x.t.athugasemd || '', h: (x) => `<div class="samk-sm samk-vef3">${esc(x.t.athugasemd || '')}</div>` },
      { k: 'heim', t: 'Heimildir', c: (x) => (x.t.heimildir || []).map((h) => h.slod).join(' '), h: (x) => heimildirHtml(x.t.heimildir) }
    ];
    const colsG = [
      { k: 'kaup', t: 'Seljandi og kaupendur', v: (x) => x.t.kaupandi, h: (x) => `<div class="samk-vef3"><b>${esc(x.t.kaupandi)}</b></div>` },
      { k: 'staerd', t: 'Greitt alls og á ári', c: (x) => x.t.staerd || '', h: (x) => `<div class="samk-vef3">${esc(x.t.staerd || '')}</div>` },
      { k: 'ath', t: 'Hverjir kaupa og í hvað', c: (x) => x.t.athugasemd || '', h: (x) => `<div class="samk-sm samk-vef3">${esc(x.t.athugasemd || '')}</div>` },
      { k: 'heim', t: 'Heimildir', c: (x) => (x.t.heimildir || []).map((h) => h.slod).join(' '), h: (x) => heimildirHtml(x.t.heimildir) }
    ];
    const greidslurHtml = greidslur.length ? `<div class="samk-h">Hvað ríkisstofnanir greiða slökkvitækjaseljendum án útboðs${csvTakki('utbod_greidslur')}</div>
      <p class="samk-note">${esc(_g.utbod_greidslur_ath || '')}</p>${tafla('utbod_greidslur', colsG, greidslur)}` : '';
    const erlHtml = erl.length ? `<div class="samk-h">Viðmið frá Norðurlöndum — til samanburðar, ekki keppinautar${csvTakki('utbod_erlent')}</div>
      <p class="samk-note">${esc(_g.utbod_erlent_ath || '')}</p>${tafla('utbod_erlent', colsE, erl)}` : '';

    return `${kpiHtml}
      <p class="samk-note">Opinber útboð á eftirliti með slökkvitækjum og öðrum eldvarnarbúnaði: hverjir buðu og hvað, hver fékk samninginn, gildistími og hvenær næsta útboð ætti að koma. Hjá Reykjavík eru verðin „samtals vegið einingaverð án VSK“ yfir verðkörfu með 32 liðum. Það er viðmið til að raða tilboðum, <b>ekki verð á einu tæki</b>, og vogtölurnar eru ekki birtar, svo ekki er hægt að bera töluna beint saman við okkar verð. Eining hvers verðs stendur undir því. Stærð útboðs er aðeins til þar sem kaupandi birti áætlun. Lokadagsetning er merkt „ályktað“ þar sem hún er ekki staðfest í gögnum kaupanda. ${esc(_g.utbod_leitad || '')}</p>
      ${tlHtml}${naestHtml}${throunHtml}
      <div class="samk-h">Útboð${csvTakki('utbod')}</div>${tafla('utbod', cols, rows)}
      <div class="samk-h">Tilboð bjóðenda${csvTakki('utbod_tilbod')}</div>${tafla('utbod_tilbod', cols2, tilRows)}
      ${greidslurHtml}${erlHtml}${leitHtml}${vefirHtml}`;
  }

  // ── Skel og teikning ─────────────────────────────────────────────────────────────────────────────────────────────
  const FLIPAR = [['odyrara', 'Ódýrara innkaup'], ['samanb', 'Verðsamanburður'], ['thjonusta', 'Þjónustuverð'], ['utbod', 'Útboð'], ['birgjar', 'Hvar kaupa'], ['innkaup', 'Okkar innkaup']];

  function valmyndir() {
    const m = _g && Array.isArray(_g.vorur) ? _g.vorur : [];
    const flokkar = [...new Set(m.map((r) => r.flokkur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'is'));
    const ik = _g && _g.innkaup && Array.isArray(_g.innkaup.linur) ? _g.innkaup.linur : [];
    const selj = [...new Set((_flipi === 'innkaup' ? ik : m).map((r) => r.seljandi).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'is'));
    const sel = (id, v, fyrst, lista, fall) => `<select class="samk-sel" id="${id}" onchange="window.Samkeppni.${fall}(this.value)"><option value="">${fyrst}</option>${lista.map((x) => `<option value="${esc(x)}"${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    if (_flipi === 'thjonusta') {
      const ad = [...new Set(((_g && _g.thjonusta) || []).map((t) => t.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'is'));
      return sel('samk-selj', _seljandi, 'Allir aðilar', ad, '_selj');
    }
    if (_flipi === 'utbod') {
      const kaup = uniq([...((_g && _g.utbod) || []).filter((t) => t.tegund_kaupanda !== 'erlent' && !/án útboðs/i.test(t.tegund || '')).map((t) => t.kaupandi), ...((_g && _g.utbod_leit) || []).filter((l) => l.tegund_kaupanda !== 'erlent' && String(l.kaupandi).length <= 50).map((l) => l.kaupandi)]);
      return sel('samk-selj', _seljandi, 'Allir kaupendur', kaup, '_selj');
    }
    if (_flipi === 'birgjar') return `<select class="samk-sel" onchange="window.Samkeppni._land(this.value)"><option value="">Öll lönd</option><option value="is"${_land === 'is' ? ' selected' : ''}>Innanlands</option><option value="erl"${_land === 'erl' ? ' selected' : ''}>Erlendis</option></select>`;
    return (_flipi === 'innkaup' ? '' : sel('samk-flokkur', _flokkur, 'Allir flokkar', flokkar, '_flokk')) + sel('samk-selj', _seljandi, 'Allir seljendur', selj, '_selj');
  }

  function efni() {
    if (_villa) return `<div class="samk-tomt">${esc(_villa)}</div>`;
    if (!_g) return '<div class="loading-state">Hleður samkeppnisgögn…</div>';
    try {
      if (_flipi === 'samanb') return samanburdur();
      if (_flipi === 'thjonusta') return thjonusta();
      if (_flipi === 'utbod') return utbod();
      if (_flipi === 'birgjar') return birgjar();
      if (_flipi === 'innkaup') return innkaup();
      return odyrara();
    } catch (e) { return `<div class="samk-tomt">Villa í birtingu: ${esc(e && e.message ? e.message : e)}</div>`; }
  }

  // ── Síur og röðun: spjald, valmerki, röðunarval ──────────────────────────────────────────────────────────────────
  const TOFLUR_FLIPA = { odyrara: ['odyrara', 'mogul', 'utan'], samanb: ['samanb'], thjonusta: ['thjonusta'], innkaup: ['innkaup'], birgjar: [], utbod: ['utbod', 'utbod_tilbod', 'utbod_greidslur', 'utbod_erlent', 'utbod_leit'] };
  const SIU_HEITI = { tegund: 'Tegund seljanda', para: 'Pörun við okkar vörur', bre: 'Frá síðustu mælingu', pakki: 'Pakkning', samMunur: 'Staða okkar', thjKind: 'Þjónusta', thjTegund: 'Tegund tækis', thjMunur: 'Staða okkar', bTegund: 'Tegund birgis', bSendir: 'Sendir til Íslands', ikAfsl: 'Afsláttur', ikTimabil: 'Tímabil', utTegund: 'Tegund kaupanda', utStada: 'Staða útboðs' };
  const SIU_ROFI = { mynd: 'Aðeins með mynd', odyrVid: 'Ódýrara en við seljum á (m. VSK)', odyrKostn: 'Ódýrara en við kaupum á (án VSK)', tilbod: 'Aðeins tilboð', felaUppsel: 'Fela uppseldar', stadall: 'Staðall tilgreindur (EN/ISO/CE)', thjSamb: 'Aðeins sambærilegt við okkar þjónustu', bNuv: 'Núverandi birgjar', bVerd: 'Með verði á vörum', bKomid: 'Með áætluðu komuverði', ikPara: 'Aðeins pöruð við vöru á markaði', utTilbod: 'Aðeins þar sem tilboð eru birt', utNaest: 'Aðeins með næsta útboð eða lokadagsetningu' };
  const uniq = (a) => [...new Set(a.filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y), 'is'));
  function valkostirSiu(k) {
    const m = _g && Array.isArray(_g.vorur) ? _g.vorur : [];
    const th = _g && Array.isArray(_g.thjonusta) ? _g.thjonusta : [];
    switch (k) {
      case 'tegund': return uniq(m.map((r) => r.tegund_seljanda)).map((t) => [t, tegundHeiti(t)]);
      case 'para': return [['ja', 'Paraðar við okkar vöru'], ['nei', 'Utan skrár okkar']];
      case 'bre': return [['haekkad', 'Hækkað síðan síðast'], ['laekkad', 'Lækkað síðan síðast'], ['breytt', 'Breytt (hækkað eða lækkað)'], ['obreytt', 'Óbreytt'], ['ny', 'Ný (ekki mælt áður)']];
      case 'pakki': return [['stakt', 'Stakar vörur'], ['pakki', 'Pakkningar (verð á stk reiknað)']];
      case 'samMunur': return [['dyrari', 'Við dýrari en miðgildið'], ['odyrari', 'Við ódýrari en miðgildið'], ['svipad', 'Svipað (±3 %)']];
      case 'thjKind': return uniq(th.map((t) => t.service_kind)).map((t) => [t, t]);
      case 'thjTegund': return uniq(th.map((t) => t.product_type)).map((t) => [t, t === 'co2' ? 'CO₂' : t]);
      case 'thjMunur': return [['dyrari', 'Við dýrari en þeir'], ['odyrari', 'Við ódýrari en þeir']];
      case 'bTegund': return uniq(((_g && _g.birgjar) || []).map((b) => b.tegund)).map((t) => [t, tegundHeiti(t)]);
      case 'bSendir': return [['já', 'Já (staðfest)'], ['nei', 'Nei'], ['óvíst', 'Óvíst']];
      case 'ikAfsl': return [['10', '10 % eða meira'], ['20', '20 % eða meira'], ['25', '25 % eða meira'], ['30', '30 % eða meira'], ['35', '35 % eða meira']];
      case 'utTegund': return uniq([...((_g && _g.utbod) || []).map((t) => t.tegund_kaupanda), ...((_g && _g.utbod_leit) || []).map((l) => l.tegund_kaupanda)]).map((t) => [t, UTB_TEGUND[t] || t]);
      case 'utStada': return uniq(((_g && _g.utbod) || []).map((t) => t.stada)).map((s) => [s, UTB_STADA[s] || s]);
      case 'ikTimabil': return [['6', 'Síðustu 6 mánuðir'], ['12', 'Síðustu 12 mánuðir'], ['18', 'Síðustu 18 mánuðir'], ['24', 'Síðustu 24 mánuðir'], ['36', 'Síðustu 36 mánuðir']];
      default: return [];
    }
  }
  const virkarSiur = () => SIUR_FLIPI[_flipi] || [];
  const erVirk = (k) => (typeof SIUR_FRUM[k] === 'boolean' ? !!F[k] : String(F[k]) !== String(SIUR_FRUM[k]));
  function siuHtml() {
    return virkarSiur().map((k) => {
      if (k === 'verdMin' || k === 'verdMax') {
        return `<label class="samk-f"><span>${k === 'verdMin' ? 'Verð frá' : 'Verð til'} (kr m. VSK)</span><input class="samk-in samk-tala" type="text" inputmode="numeric" autocomplete="off" placeholder="${k === 'verdMin' ? '0' : 'ótakmarkað'}" value="${esc(F[k])}" oninput="this.value=this.value.replace(/[^0-9]/g,'');window.Samkeppni._sia('${k}',this.value)"></label>`;
      }
      if (SIU_ROFI[k]) return `<label class="samk-rofi"><input type="checkbox"${F[k] ? ' checked' : ''} onchange="window.Samkeppni._sia('${k}',this.checked)"> ${esc(SIU_ROFI[k])}</label>`;
      return `<label class="samk-f"><span>${esc(SIU_HEITI[k] || k)}</span><select class="samk-sel" onchange="window.Samkeppni._sia('${k}',this.value)"><option value="">Allt</option>${valkostirSiu(k).map(([v, t]) => `<option value="${esc(v)}"${String(F[k]) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    }).join('');
  }
  function chipTexti(k) {
    if (k === 'verdMin') return 'Verð frá ' + thus(Number(F.verdMin)) + ' kr';
    if (k === 'verdMax') return 'Verð til ' + thus(Number(F.verdMax)) + ' kr';
    if (SIU_ROFI[k]) return SIU_ROFI[k];
    const o = valkostirSiu(k).find(([v]) => String(v) === String(F[k]));
    return (SIU_HEITI[k] || k) + ': ' + (o ? o[1] : F[k]);
  }
  function chipsHtml() {
    const l = [];
    if (_q) l.push(['Leit: ' + _q, 'q']);
    if (_flokkur && _flipi !== 'birgjar' && _flipi !== 'thjonusta' && _flipi !== 'innkaup' && _flipi !== 'utbod') l.push(['Flokkur: ' + _flokkur, 'flokkur']);
    if (_seljandi) l.push([(_flipi === 'thjonusta' ? 'Aðili: ' : _flipi === 'innkaup' ? 'Birgir: ' : _flipi === 'utbod' ? 'Kaupandi: ' : 'Seljandi: ') + _seljandi, 'seljandi']);
    if (_land && _flipi === 'birgjar') l.push([_land === 'is' ? 'Innanlands' : 'Erlendis', 'land']);
    virkarSiur().filter(erVirk).forEach((k) => l.push([chipTexti(k), k]));
    return l.map(([t, k]) => `<button type="button" class="samk-chip" onclick="window.Samkeppni._hreinsa('${k}')" title="Taka þessa síu af">${esc(t)} ×</button>`).join('');
  }
  function rodHtml() {
    const v = RODUN[_flipi] || [];
    const eigin = (TOFLUR_FLIPA[_flipi] || []).some((id) => _sort[id]);
    let idx = 0;
    if (_rod) { const i = v.findIndex((o) => o[1] === _rod.k && o[2] === _rod.d); idx = i < 0 ? 0 : i; }
    return `<select class="samk-sel" id="samk-rod" title="Röðun" onchange="window.Samkeppni._rodun(this.value)">${eigin ? '<option value="" selected>Röðun: eigin (smellt á dálkahaus)</option>' : ''}${v.map((o, i) => `<option value="${i}"${!eigin && i === idx ? ' selected' : ''}>Röðun: ${esc(o[0])}</option>`).join('')}</select>`;
  }
  function takkarHtml() {
    const n = virkarSiur().filter(erVirk).length;
    const samtals = n + (_q ? 1 : 0) + (_flokkur && ['odyrara', 'samanb'].includes(_flipi) ? 1 : 0) + (_seljandi ? 1 : 0) + (_land && _flipi === 'birgjar' ? 1 : 0);
    return `<button type="button" class="samk-tk${n ? ' on' : ''}" onclick="window.Samkeppni._siaToggle()" title="Sýna eða fela síuspjaldið">Síur${n ? ' (' + n + ')' : ''} ${_opinSia ? '▴' : '▾'}</button>${samtals ? '<button type="button" class="samk-tk" onclick="window.Samkeppni._hreinsaAllt()" title="Taka allar síur og leit af og núllstilla röðun">Hreinsa allt</button>' : ''}`;
  }

  // Léttari uppfærsla: aðeins efnið, valmerkin, röðunarvalið og síutakkana — síuspjaldið (og reiturinn sem verið er að skrifa í) er ekki endurteiknað
  function uppfaeraEfni() {
    if (!_rot) return;
    const e = _rot.querySelector('#samk-efni');
    if (e) {
      const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(e) : null;   // skrunstaða lifir endurteikninguna (STÖÐUGT VIÐMÓT)
      e.innerHTML = efni();
      if (aftur) aftur();
    }
    const c = _rot.querySelector('#samk-chips');
    if (c) c.innerHTML = chipsHtml();
    const r = _rot.querySelector('#samk-rodsp');
    if (r) r.innerHTML = rodHtml();
    const t = _rot.querySelector('#samk-takkar');
    if (t) t.innerHTML = takkarHtml();
  }

  function uppfaera() {
    if (!_rot) return;
    const v = _rot.querySelector('#samk-val');
    if (v) v.innerHTML = valmyndir();
    const p = _rot.querySelector('#samk-siur');
    if (p) { p.innerHTML = siuHtml(); p.style.display = _opinSia && virkarSiur().length ? '' : 'none'; }
    const li = _rot.querySelector('#samk-leit');
    if (li && document.activeElement !== li && li.value !== _q) li.value = _q;
    uppfaeraEfni();
    _rot.querySelectorAll('.samk-sub button').forEach((b) => b.classList.toggle('on', b.dataset.f === _flipi));
    const st = _rot.querySelector('#samk-stada');
    if (st && _g) {
      const n = (_g.vorur || []).length, s = new Set((_g.vorur || []).map((r) => r.seljandi)).size;
      st.textContent = `Verð sótt ${dags(_g.sott)} af opinberum vefsíðum · ${n} vörur frá ${s} seljendum · ${(_g.birgjar || []).length} birgjar${(_g.thjonusta || []).length ? ' · ' + _g.thjonusta.length + ' þjónustuverð' : ''}${(_g.utbod || []).length ? ' · ' + _g.utbod.length + ' útboð' : ''}`;
    }
  }

  function teikna(rot) {
    if (!rot) return;
    stilar();
    _rot = rot;
    if (rot.dataset.samk !== '1') {
      rot.dataset.samk = '1';
      rot.innerHTML = `<div class="samk-bar">
          <div class="samk-sub">${FLIPAR.map(([k, l]) => `<button type="button" data-f="${k}" onclick="window.Samkeppni._flipi('${k}')">${esc(l)}</button>`).join('')}</div>
          <input class="samk-in" id="samk-leit" type="text" placeholder="Leita að vöru, seljanda eða flokki…" value="${esc(_q)}" oninput="window.Samkeppni._leit(this.value)">
          <span id="samk-val" style="display:contents"></span>
          <span id="samk-rodsp" style="display:contents"></span>
          <span id="samk-takkar" style="display:contents"></span>
          <a class="samk-tengill" href="https://ja.is/vorur/" target="_blank" rel="noopener noreferrer" title="Já leyfir ekki afritun gagna úr Vöruleit, svo flipinn notar hana ekki — flettu upp handvirkt">Leita á ja.is Vöruleit ↗</a>
        </div>
        <div class="samk-sia" id="samk-siur"></div>
        <div class="samk-chips" id="samk-chips"></div>
        <div class="samk-sm" id="samk-stada" style="margin:-4px 0 10px"></div>
        <div id="samk-efni"></div>`;
    }
    // Vistað val (síur, röðun, sýn) kemur af þjóni — sama á öllum vélum. Ef stillingarnar eru ekki komnar enn bíðum við eftir fyrstu uppfærslu þeirra.
    saekjaVal();
    if (!_afturFengid && !_bidurVal && window.AppSettings && AppSettings.onChange) {
      _bidurVal = true;
      AppSettings.onChange(() => { if (!_afturFengid && !_snert && saekjaVal()) uppfaera(); });
    }
    uppfaera();
    hlada().then(uppfaera);
  }

  window.Samkeppni = {
    teikna,
    fjoldi: () => (_g && Array.isArray(_g.vorur) ? _g.vorur.length : null),
    _flipi(k) { _flipi = k; _seljandi = ''; _flokkur = ''; _rod = null; uppfaera(); vista(); },
    _leit(v) { _q = String(v || '').trim(); uppfaeraEfni(); vista(); },
    _flokk(v) { _flokkur = v; uppfaeraEfni(); vista(); },
    _selj(v) { _seljandi = v; uppfaeraEfni(); vista(); },
    _land(v) { _land = v; uppfaeraEfni(); vista(); },
    // Ein sía úr síuspjaldinu (select, hak eða talnareitur) — spjaldið sjálft er ekki endurteiknað svo reiturinn missir ekki fókus
    _sia(k, v) {
      if (!(k in SIUR_FRUM)) return;
      F[k] = typeof SIUR_FRUM[k] === 'boolean' ? !!v : String(v == null ? '' : v);
      uppfaeraEfni(); vista();
    },
    _hreinsa(k) {
      if (k === 'q') _q = '';
      else if (k === 'flokkur') _flokkur = '';
      else if (k === 'seljandi') _seljandi = '';
      else if (k === 'land') _land = '';
      else if (k in SIUR_FRUM) F[k] = SIUR_FRUM[k];
      else return;
      uppfaera(); vista();
    },
    _hreinsaAllt() {
      _q = ''; _flokkur = ''; _seljandi = ''; _land = ''; _rod = null;
      Object.assign(F, SIUR_FRUM);
      Object.keys(_sort).forEach((k) => delete _sort[k]);
      uppfaera(); vista();
    },
    _siaToggle() { _opinSia = !_opinSia; uppfaera(); vista(); },
    _leitToggle() { _utLeitOpid = !_utLeitOpid; uppfaeraEfni(); vista(); },
    _rodun(i) {
      if (i === '' || i == null) return;
      const o = (RODUN[_flipi] || [])[Number(i)];
      if (!o) return;
      _rod = o[1] ? { k: o[1], d: o[2] } : null;
      (TOFLUR_FLIPA[_flipi] || []).forEach((id) => { delete _sort[id]; });
      uppfaeraEfni(); vista();
    },
    _csv(id) {
      if (id === 'birgjar') {
        const l = _birgjarListi || (_g && _g.birgjar) || [];
        return sækjaCsv('birgjar', ['Birgir', 'Land', 'Tegund', 'Núverandi birgir', 'B2B', 'Sendir til Íslands', 'Lágmarkspöntun', 'Flutningur/tollar', 'Vörur', 'Vefur'],
          l.map((b) => [b.nafn, b.land, tegundHeiti(b.tegund), b.nuverandi_birgir ? 'já' : '', b.b2b, b.sendir_til_islands, b.magn_lagmark, b.ath_fluttning, b.vorur, b.vefur]));
      }
      const t = _tof[id];
      if (!t) return;
      const cols = t.cols.filter((c) => c.t);
      sækjaCsv('samkeppni-' + id, cols.map((c) => c.t), rada(id, t.rows, t.cols).map((r) => cols.map((c) => (c.c ? c.c(r) : textiAf(c.h(r))))));
    },
    _rada(id, k) { const s = _sort[id]; _sort[id] = s && s.k === k ? { k, d: -s.d } : { k, d: 1 }; uppfaeraEfni(); vista(); }
  };
})();
