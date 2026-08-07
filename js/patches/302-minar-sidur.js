/* === MÍNAR SÍÐUR — síðusmiður + tenglasafn (302, 2026-08-05) ================
 *
 * Ósk Agnars: „það að geta búið til nýtt page yrði frábært og ýmsa möguleika
 * að setja á hana og vinna. vantar t.d. betra tenglaskjal. bakendi síðan á
 * brunaholf er algjört chaos að finna hluti þar."
 *
 * Þess vegna: í stað þess að laga kaos sem einhver annar raðaði upp, býrðu til
 * ÞÍNAR eigin síður og raðar á þær því sem þú notar raunverulega.
 *
 *   Hliðarstika → „Mínar síður"
 *     • margar síður, hver með sínu nafni (flipar efst)
 *     • ✎ Breyta → bæta við kubbum, færa þá til, eyða
 *
 * Kubbarnir (v1):
 *   🔗 Tenglasafn   — hlekkir í hópum, með lýsingu; opnast í nýjum flipa
 *   📝 Minnispunktar — frjáls texti sem vistast sjálfkrafa
 *   ➡️ Flýtileiðir   — beint í síður appsins (velur úr hliðarstikunni)
 *   🔤 Fyrirsögn     — til að skipta síðunni upp
 *
 * Geymt í `app_settings.min_sidur` og vistað með atómísku vistuninni
 * (sql/2026-08-05_app_settings_atomisk_vistun.sql), svo síðurnar birtast á
 * öllum tækjunum og tvær vélar geta unnið samtímis án þess að skrifa hvor
 * yfir aðra.
 * ========================================================================== */
(() => {
  if (window.__minarSidurInstalled) return;
  window.__minarSidurInstalled = true;

  const KEY = 'min_sidur';
  const VIEW_ID = 'view-minar-sidur';

  // Gagnagrunnstenging — var notuð í gagnakubbunum en aldrei skilgreind hér
  // (hjálparfallið kom úr patch 296/300/301). Afleiðing: „SB is not defined“
  // inni í ósóttu loforði → engin sýnileg villa, tölurnar sátu bara í „…“.
  const SB = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, sz) => (window.UIIcons ? UIIcons.svg(n, { size: sz || 14 }) : '');
  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };
  const nyttId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ── Gögn ──────────────────────────────────────────────────────────────────
  let _state = null;              // { sidur: [...] }
  let _virk = null;               // id á opinni síðu
  let _breyta = false;            // ritháttur á/af
  let _vistT = null;
  let _hashLest = false;          // djúptengils-auðkenni (#minar/<id>) aðeins lesið EINU SINNI á hleðslu

  // Djúptenging (t.d. Öpp-kubbur sem opnar EINA tiltekna síðu beint): #minar/<id>
  const idFraHash = () => { const m = (location.hash || '').match(/^#minar\/([a-z0-9]+)/i); return m ? m[1] : null; };

  // MIKILVÆGT: lesa AÐEINS af servernum þegar við höfum ekkert í höndunum eða
  // engin vistun er í bið. Annars strokaði endurteikningin út það sem notandinn
  // var að búa til, af því að vistunin er tafin (350 ms) og AppSettings.path()
  // skilaði enn gamla gildinu — nýstofnuð síða hvarf um leið og hún birtist.
  function lesa(force) {
    if (_state && !force) {
      if (!_virk && _state.sidur.length) _virk = _state.sidur[0].id;
      return _state;
    }
    const s = (window.AppSettings && AppSettings.path && AppSettings.path(KEY)) || null;
    _state = (s && Array.isArray(s.sidur)) ? JSON.parse(JSON.stringify(s)) : { sidur: [] };
    if (!_virk && _state.sidur.length) _virk = _state.sidur[0].id;
    return _state;
  }
  function vista() {
    if (_vistT) clearTimeout(_vistT);
    _vistT = setTimeout(async () => {
      if (!window.AppSettings || !AppSettings.save) return;
      const ok = await AppSettings.save({ [KEY]: _state });
      if (!ok) toast('Náði ekki að vista síðuna.');
    }, 350);
  }
  const sidan = () => (_state.sidur.find(s => s.id === _virk) || null);

  // ── Kubbar ────────────────────────────────────────────────────────────────
  const GERDIR = [
    { g: 'tolur',         nafn: 'Tala',          tákn: 'layers',    w: 3,  lysing: 'Ein lifandi tala úr kerfinu — fyrirtæki, sölur, tæki…' },
    { g: 'skyrsla',       nafn: 'Skýrsla',       tákn: 'sliders',   w: 3,  lysing: 'Vistuð tala/samantekt með föstu auðkenni (Re-01) — þú skrifar gildið sjálf(ur) og getur breytt hvenær sem er.' },
    { g: 'listi',         nafn: 'Listi',         tákn: 'list',      w: 6,  lysing: 'Nýjustu sölurnar eða nýjustu fyrirtækin, beint úr gagnagrunninum.' },
    { g: 'tenglar',       nafn: 'Tenglasafn',    tákn: 'tag',       w: 6,  lysing: 'Hlekkir í hópum — dkPlus, Drive, bankinn, hvað sem er.' },
    { g: 'minnispunktar', nafn: 'Minnispunktar', tákn: 'clipboard', w: 6,  lysing: 'Frjáls texti sem vistast sjálfkrafa.' },
    { g: 'flytileidir',   nafn: 'Flýtileiðir',   tákn: 'grid',      w: 6,  lysing: 'Beint í síður appsins — Sala, Verkstæði, Reikningar…' },
    { g: 'fyrirsogn',     nafn: 'Fyrirsögn',     tákn: 'list',      w: 12, lysing: 'Til að skipta síðunni upp í kafla.' }
  ];

  // Öruggar, fyrirfram skilgreindar mælingar — engin frjáls fyrirspurn, svo
  // ekkert getur sótt of mikið eða brotið neitt.
  const MAELINGAR = [
    { m: 'fyrirtaeki',  nafn: 'Fyrirtæki',            lysing: 'Öll fyrirtæki í skránni' },
    { m: 'vidskiptavinir', nafn: 'Viðskiptavinir',    lysing: 'Einstaklingar í viðskiptamannaskrá' },
    { m: 'uttaeki',     nafn: 'Tæki í skrá',          lysing: 'Öll skráð tæki' },
    { m: 'vorur',       nafn: 'Virkar vörur',         lysing: 'Vörur og þjónusta í sölu' },
    { m: 'solur_man',   nafn: 'Sölur í mánuðinum',    lysing: 'Fjöldi sala frá mánaðamótum' },
    { m: 'kr_man',      nafn: 'Velta í mánuðinum',    lysing: 'Samtala sala frá mánaðamótum' }
  ];
  const LISTAR = [
    { l: 'solur',      nafn: 'Nýjustu sölur' },
    { l: 'fyrirtaeki', nafn: 'Nýjustu fyrirtæki' }
  ];

  // Re-01, Re-02… — sequential, ALDREI endurnýtt (talan hækkar bara), sameiginlegur
  // teljari fyrir allar síður svo tvær skýrslur fái aldrei sama auðkenni.
  function naestaRe() {
    _state.reTeljari = (_state.reTeljari || 0) + 1;
    return 'Re-' + String(_state.reTeljari).padStart(2, '0');
  }

  function nyrKubbur(g) {
    const gerd = GERDIR.find(x => x.g === g) || {};
    const grunn = { id: nyttId(), g, titill: gerd.nafn || '', w: gerd.w || 6 };
    if (g === 'tenglar') grunn.tenglar = [];
    if (g === 'minnispunktar') grunn.texti = '';
    if (g === 'flytileidir') grunn.sidur = [];
    if (g === 'tolur') grunn.m = 'fyrirtaeki';
    if (g === 'listi') { grunn.l = 'solur'; grunn.fjoldi = 6; }
    if (g === 'skyrsla') { grunn.reNum = naestaRe(); grunn.gildi = ''; grunn.undirtexti = ''; }
    return grunn;
  }

  // ── Útlit síðunnar (aðeins ÞESSI síða — snertir ekkert annað í appinu) ────
  const THETT = { thett: { p: '8px 10px', bil: 8, let: 12 }, venjulegt: { p: '12px 13px', bil: 14, let: 12.5 }, loftgott: { p: '18px 18px', bil: 20, let: 13.5 } };
  const KORT = {
    rammi: 'border:1px solid var(--brd);box-shadow:none',
    skuggi: 'border:1px solid var(--brd);box-shadow:0 2px 10px rgba(15,23,42,.08)',
    flatt: 'border:1px solid transparent;background:var(--surface2);box-shadow:none'
  };
  const utlit = () => {
    const s = sidan() || {};
    return { thettleiki: s.thettleiki || 'venjulegt', kort: s.kort || 'skuggi' };
  };

  // Síður appsins úr hliðarstikunni — svo flýtileiðirnar séu alltaf réttar.
  function appSidur() {
    return [...document.querySelectorAll('.vnav-btn[data-view]')]
      .map(b => ({ view: b.dataset.view, nafn: (b.textContent || '').trim().split('\n')[0].replace(/\s+\d+$/, '').trim() }))
      .filter(x => x.nafn);
  }

  // ── Teikning ──────────────────────────────────────────────────────────────
  const kortStill = () => 'border-radius:12px;background:var(--surface);overflow:hidden;' + KORT[utlit().kort];
  const hnappur = 'display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink1);border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer';

  function kubburHTML(k, idx, alls) {
    const breiddir = _breyta
      ? '<span style="display:inline-flex;gap:2px;margin-left:auto">' +
          [[3, '¼'], [4, '⅓'], [6, '½'], [12, 'Heil']].map(([w, merki]) =>
            '<button class="_ms-breidd" data-id="' + k.id + '" data-w="' + w + '" type="button" title="Breidd" style="' + hnappur +
              ';padding:3px 7px;font-size:11px' + ((k.w || 6) === w ? ';background:#0f172a;border-color:#0f172a;color:#fff!important' : '') + '">' + merki + '</button>').join('') +
        '</span>'
      : '';
    const stjorn = _breyta
      ? '<div style="display:flex;gap:4px;margin-left:6px">' +
          '<button class="_ms-upp" data-id="' + k.id + '" type="button" title="Færa upp" ' + (idx === 0 ? 'disabled' : '') + ' style="' + hnappur + ';padding:4px 8px">↑</button>' +
          '<button class="_ms-nidur" data-id="' + k.id + '" type="button" title="Færa niður" ' + (idx === alls - 1 ? 'disabled' : '') + ' style="' + hnappur + ';padding:4px 8px">↓</button>' +
          '<button class="_ms-eyda-kubb" data-id="' + k.id + '" type="button" title="Eyða kubbi" style="' + hnappur + ';padding:4px 8px;border-color:#fecaca;color:#dc2626">✕</button>' +
        '</div>'
      : '';

    if (k.g === 'fyrirsogn') {
      return '<div class="_ms-kubbur" data-id="' + k.id + '" style="grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:6px 0 0">' +
        (_breyta
          ? '<input class="_ms-titill" data-id="' + k.id + '" value="' + esc(k.titill || '') + '" placeholder="Fyrirsögn" style="flex:1;font-size:15px;font-weight:800;color:var(--ink1);border:1px dashed var(--brd2);border-radius:8px;padding:6px 10px;background:transparent">'
          : '<div style="font-size:15px;font-weight:800;color:var(--ink1)">' + esc(k.titill || '') + '</div>') +
        stjorn + '</div>';
    }

    let innihald = '';
    if (k.g === 'tenglar') {
      const t = k.tenglar || [];
      innihald = (t.length
        ? '<div style="display:flex;flex-direction:column;gap:5px">' + t.map((l, i) =>
            '<div style="display:flex;align-items:center;gap:9px">' +
              (_breyta
                ? '<input class="_ms-lnafn" data-id="' + k.id + '" data-i="' + i + '" value="' + esc(l.nafn || '') + '" placeholder="Nafn" style="width:170px;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12.5px">' +
                  '<input class="_ms-lurl" data-id="' + k.id + '" data-i="' + i + '" value="' + esc(l.url || '') + '" placeholder="https://…" style="flex:1;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12.5px">' +
                  '<button class="_ms-leyda" data-id="' + k.id + '" data-i="' + i + '" type="button" style="' + hnappur + ';padding:4px 8px;border-color:#fecaca;color:#dc2626">✕</button>'
                : '<a href="' + esc(l.url || '#') + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:9px;flex:1;min-width:0;padding:8px 10px;border:1px solid var(--brd);border-radius:9px;text-decoration:none;background:var(--surface2)">' +
                    '<span style="color:var(--brand);display:flex">' + ic('tag', 14) + '</span>' +
                    '<span style="flex:1;min-width:0"><span style="display:block;font-size:12.5px;font-weight:700;color:var(--ink1)">' + esc(l.nafn || l.url) + '</span>' +
                    (l.lysing ? '<span style="display:block;font-size:10.5px;color:var(--ink3)">' + esc(l.lysing) + '</span>' : '') + '</span>' +
                    '<span style="color:var(--ink4);font-size:11px">↗</span>' +
                  '</a>') +
            '</div>').join('') + '</div>'
        : '<div style="color:var(--ink4);font-size:12px;font-style:italic">Enginn tengill enn.</div>') +
        (_breyta ? '<button class="_ms-lbaeta" data-id="' + k.id + '" type="button" style="' + hnappur + ';margin-top:8px">' + ic('plus', 12) + 'Bæta við tengli</button>' : '');
    }

    if (k.g === 'minnispunktar') {
      innihald = '<textarea class="_ms-texti" data-id="' + k.id + '" placeholder="Skrifaðu hér — vistast sjálfkrafa." ' +
        'style="width:100%;box-sizing:border-box;min-height:110px;padding:10px 12px;border:1px solid var(--brd2);border-radius:9px;font:inherit;font-size:12.5px;line-height:1.55;resize:vertical;background:var(--surface2);color:var(--ink1)">' +
        esc(k.texti || '') + '</textarea>';
    }

    if (k.g === 'tolur') {
      const m = MAELINGAR.find(x => x.m === k.m) || MAELINGAR[0];
      innihald =
        '<div class="_ms-tala" data-id="' + k.id + '" data-m="' + esc(k.m) + '" style="font-size:30px;font-weight:800;color:var(--ink1);font-variant-numeric:tabular-nums;line-height:1.1">…</div>' +
        '<div style="font-size:11.5px;color:var(--ink3);margin-top:3px">' + esc(m.lysing) + '</div>' +
        (_breyta
          ? '<select class="_ms-maeling" data-id="' + k.id + '" style="margin-top:9px;width:100%;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12px;background:var(--surface)">' +
              MAELINGAR.map(x => '<option value="' + x.m + '"' + (x.m === k.m ? ' selected' : '') + '>' + esc(x.nafn) + '</option>').join('') +
            '</select>'
          : '');
    }

    if (k.g === 'skyrsla') {
      innihald =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
          '<span style="font-size:10.5px;font-weight:800;letter-spacing:.04em;padding:2px 7px;border-radius:5px;background:var(--surface2);border:1px solid var(--brd2);color:var(--ink3)">' + esc(k.reNum || '') + '</span>' +
        '</div>' +
        (_breyta
          ? '<input class="_ms-gildi" data-id="' + k.id + '" value="' + esc(k.gildi || '') + '" placeholder="Gildi — t.d. 1.234.000 kr" style="width:100%;box-sizing:border-box;font-size:24px;font-weight:800;color:var(--ink1);border:1px dashed var(--brd2);border-radius:8px;padding:6px 9px;background:transparent;font-variant-numeric:tabular-nums">' +
            '<input class="_ms-undirtexti" data-id="' + k.id + '" value="' + esc(k.undirtexti || '') + '" placeholder="Undirtexti — t.d. staðan 06.08" style="width:100%;box-sizing:border-box;margin-top:6px;font-size:11.5px;color:var(--ink3);border:1px dashed var(--brd2);border-radius:8px;padding:5px 9px;background:transparent">'
          : '<div style="font-size:24px;font-weight:800;color:var(--ink1);font-variant-numeric:tabular-nums;line-height:1.1">' + (k.gildi ? esc(k.gildi) : '<span style="color:var(--ink4);font-weight:600;font-size:13px;font-style:italic">Ekkert gildi enn</span>') + '</div>' +
            (k.undirtexti ? '<div style="font-size:11.5px;color:var(--ink3);margin-top:4px">' + esc(k.undirtexti) + '</div>' : ''));
    }

    if (k.g === 'listi') {
      innihald = '<div class="_ms-listi" data-id="' + k.id + '" data-l="' + esc(k.l) + '" data-n="' + (k.fjoldi || 6) + '" style="font-size:12.5px;color:var(--ink3)">Sæki…</div>' +
        (_breyta
          ? '<div style="display:flex;gap:6px;margin-top:9px">' +
              '<select class="_ms-listaval" data-id="' + k.id + '" style="flex:1;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12px;background:var(--surface)">' +
                LISTAR.map(x => '<option value="' + x.l + '"' + (x.l === k.l ? ' selected' : '') + '>' + esc(x.nafn) + '</option>').join('') +
              '</select>' +
              '<input class="_ms-listafj" data-id="' + k.id + '" type="number" min="3" max="20" value="' + (k.fjoldi || 6) + '" title="Fjöldi lína" style="width:70px;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12px">' +
            '</div>'
          : '');
    }

    if (k.g === 'flytileidir') {
      const valdar = k.sidur || [];
      const allar = appSidur();
      innihald = (valdar.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + valdar.map((v, i) => {
            const nafn = (allar.find(a => a.view === v) || {}).nafn || v;
            return '<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid var(--brd);border-radius:9px;background:var(--surface2)">' +
              '<button class="_ms-fara" data-view="' + esc(v) + '" type="button" style="all:unset;cursor:pointer;font-size:12.5px;font-weight:700;color:var(--ink1)">' + esc(nafn) + '</button>' +
              (_breyta ? '<button class="_ms-feyda" data-id="' + k.id + '" data-i="' + i + '" type="button" style="all:unset;cursor:pointer;color:#dc2626;font-size:11px">✕</button>' : '') +
            '</span>';
          }).join('') + '</div>'
        : '<div style="color:var(--ink4);font-size:12px;font-style:italic">Engin flýtileið valin.</div>') +
        (_breyta
          ? '<select class="_ms-fbaeta" data-id="' + k.id + '" style="margin-top:8px;padding:7px 10px;border:1px solid var(--brd2);border-radius:8px;font:inherit;font-size:12.5px;background:var(--surface)">' +
              '<option value="">+ Bæta við síðu…</option>' +
              allar.map(a => '<option value="' + esc(a.view) + '">' + esc(a.nafn) + '</option>').join('') +
            '</select>'
          : '');
    }

    const u = utlit(), th = THETT[u.thettleiki];
    const breidd = Math.min(12, Math.max(3, +k.w || 6));
    const mjor = (typeof window !== 'undefined' && window.innerWidth < 900);
    return '<div class="_ms-kubbur" data-id="' + k.id + '"' + (_breyta ? ' draggable="true"' : '') +
      ' style="grid-column:span ' + (mjor ? 12 : breidd) + ';' + kortStill() + (_breyta ? ';cursor:grab' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:9px;padding:' + (u.thettleiki === 'loftgott' ? '13px 16px' : '10px 13px') + ';border-bottom:1px solid var(--brd);background:var(--surface2)">' +
          '<span style="color:var(--brand);display:flex">' + ic((GERDIR.find(x => x.g === k.g) || {}).tákn || 'dot', 15) + '</span>' +
          (_breyta
            ? '<input class="_ms-titill" data-id="' + k.id + '" value="' + esc(k.titill || '') + '" placeholder="Titill" style="flex:1;font-size:13px;font-weight:700;color:var(--ink1);border:1px dashed var(--brd2);border-radius:7px;padding:4px 8px;background:transparent">'
            : '<span style="font-size:13px;font-weight:700;color:var(--ink1)">' + esc(k.titill || '') + '</span>') +
          breiddir + stjorn +
        '</div>' +
        '<div style="padding:' + th.p + ';font-size:' + th.let + 'px">' + innihald + '</div>' +
      '</div>';
  }

  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    lesa();
    if (!_hashLest) {
      _hashLest = true;
      const vildi = idFraHash();
      if (vildi && _state.sidur.some(p => p.id === vildi)) _virk = vildi;
    }
    const s = sidan();

    const flipar = _state.sidur.map(p =>
      '<button class="_ms-flipi" data-id="' + p.id + '" type="button" style="' + hnappur +
        (p.id === _virk ? ';background:#0f172a;border-color:#0f172a;color:#fff!important' : '') + '">' + esc(p.nafn || 'Ónefnd síða') + '</button>').join('');

    const haus =
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:14px">' +
        '<div style="font-size:19px;font-weight:800;color:var(--ink1);margin-right:6px">Mínar síður</div>' +
        flipar +
        '<button class="_ms-ny" type="button" style="' + hnappur + '">' + ic('plus', 12) + 'Ný síða</button>' +
        '<div style="margin-left:auto;display:flex;gap:6px">' +
          (s ? '<button class="_ms-breyta" type="button" style="' + hnappur + (_breyta ? ';background:var(--brand);border-color:var(--brand);color:#fff!important' : '') + '">' +
                 ic('pencil', 12) + (_breyta ? 'Hætta að breyta' : 'Breyta') + '</button>' : '') +
          (s && _breyta ? '<button class="_ms-endurnefna" type="button" style="' + hnappur + '">Endurnefna</button>' +
                          '<button class="_ms-eyda-sidu" type="button" style="' + hnappur + ';border-color:#fecaca;color:#dc2626">Eyða síðu</button>' : '') +
        '</div>' +
      '</div>';

    if (!s) {
      v.innerHTML = '<div style="padding:22px">' + haus +
        '<div style="' + kortStill() + ';padding:30px;text-align:center;max-width:560px">' +
          '<div style="font-size:15px;font-weight:700;color:var(--ink1);margin-bottom:6px">Engin síða enn</div>' +
          '<div style="font-size:12.5px;color:var(--ink3);line-height:1.6;margin-bottom:14px">' +
            'Búðu til þína eigin síðu og raðaðu á hana því sem þú notar daglega — tenglasafni, minnispunktum og flýtileiðum í appið. Síðan birtist á öllum tækjunum þínum.' +
          '</div>' +
          '<button class="_ms-ny" type="button" style="' + hnappur + ';background:var(--brand);border-color:var(--brand);color:#fff!important">' + ic('plus', 13) + 'Búa til fyrstu síðuna</button>' +
        '</div></div>';
      return;
    }

    const kubbar = (s.kubbar || []);
    v.innerHTML = '<div style="padding:22px;max-width:1180px">' + haus +
      (_breyta
        ? '<div style="' + kortStill() + ';padding:12px 13px;margin-bottom:14px;background:var(--surface2)">' +
            '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Bæta við kubbi</div>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">' +
              GERDIR.map(g => '<button class="_ms-baeta" data-g="' + g.g + '" type="button" title="' + esc(g.lysing) + '" style="' + hnappur + '">' +
                ic(g.tákn, 13) + g.nafn + '</button>').join('') +
            '</div>' +
            '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Útlit þessarar síðu</div>' +
            '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
              '<span style="display:flex;gap:5px;align-items:center"><span style="font-size:11.5px;color:var(--ink3)">Þéttleiki</span>' +
                [['thett','Þétt'],['venjulegt','Venjulegt'],['loftgott','Loftgott']].map(([v,n]) =>
                  '<button class="_ms-thett" data-v="' + v + '" type="button" style="' + hnappur + ';padding:5px 10px;font-size:11.5px' +
                  (utlit().thettleiki === v ? ';background:#0f172a;border-color:#0f172a;color:#fff!important' : '') + '">' + n + '</button>').join('') + '</span>' +
              '<span style="display:flex;gap:5px;align-items:center"><span style="font-size:11.5px;color:var(--ink3)">Kort</span>' +
                [['rammi','Rammi'],['skuggi','Skuggi'],['flatt','Flatt']].map(([v,n]) =>
                  '<button class="_ms-kort" data-v="' + v + '" type="button" style="' + hnappur + ';padding:5px 10px;font-size:11.5px' +
                  (utlit().kort === v ? ';background:#0f172a;border-color:#0f172a;color:#fff!important' : '') + '">' + n + '</button>').join('') + '</span>' +
              '<span style="font-size:11px;color:var(--ink4)">Gildir aðeins um þessa síðu.</span>' +
            '</div>' +
          '</div>'
        : '') +
      (kubbar.length
        ? '<div id="_ms-grid" style="display:grid;grid-template-columns:repeat(12,1fr);gap:' + THETT[utlit().thettleiki].bil + 'px;align-items:start">' +
            kubbar.map((k, i) => kubburHTML(k, i, kubbar.length)).join('') + '</div>'
        : '<div style="' + kortStill() + ';padding:26px;text-align:center;color:var(--ink3);font-size:12.5px">' +
            'Síðan er tóm. Smelltu á <b>Breyta</b> og bættu við kubbi.</div>') +
      '</div>';
    fyllaGogn();
  }


  // ── Lifandi gögn í kubbana ────────────────────────────────────────────────
  const tala = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const manadamot = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); };

  async function maelingGildi(m) {
    const sb = SB(); if (!sb) return '—';
    const telja = async (tafla, sia) => {
      let q = sb.from(tafla).select('*', { count: 'exact', head: true });
      if (sia) q = sia(q);
      const r = await q;
      return r.error ? null : r.count;
    };
    try {
      if (m === 'fyrirtaeki')     return tala(await telja('fyrirtaeki'));
      if (m === 'vidskiptavinir') return tala(await telja('vidskiptavinir'));
      if (m === 'uttaeki')        return tala(await telja('uttaeki'));
      if (m === 'vorur')          return tala(await telja('vorur', q => q.eq('virkt', true)));
      if (m === 'solur_man')      return tala(await telja('solur', q => q.gte('created_at', manadamot())));
      if (m === 'kr_man') {
        const r = await sb.from('solur').select('samtals').gte('created_at', manadamot());
        if (r.error) return '—';
        return tala((r.data || []).reduce((a, x) => a + (+x.samtals || 0), 0)) + ' kr';
      }
    } catch (_) {}
    return '—';
  }

  async function listaHTML(l, n) {
    const sb = SB(); if (!sb) return 'Engin tenging.';
    const lina = (v, h) => '<div style="display:flex;gap:10px;align-items:baseline;padding:5px 0;border-top:1px solid var(--brd)">' +
      '<span style="flex:1;min-width:0;color:var(--ink1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v) + '</span>' +
      '<span style="color:var(--ink3);font-size:11.5px;white-space:nowrap">' + esc(h) + '</span></div>';
    try {
      if (l === 'solur') {
        const r = await sb.from('solur').select('created_at,customer_nafn,samtals').order('created_at', { ascending: false }).limit(n);
        if (r.error || !r.data) return 'Náði ekki í sölur.';
        return r.data.map(x => lina(x.customer_nafn || 'Staðgreitt',
          tala(x.samtals) + ' kr · ' + new Date(x.created_at).toLocaleDateString('is-IS', { day: 'numeric', month: 'short' }))).join('') || 'Engar sölur.';
      }
      if (l === 'fyrirtaeki') {
        const r = await sb.from('fyrirtaeki').select('nafn,kennitala,id').order('id', { ascending: false }).limit(n);
        if (r.error || !r.data) return 'Náði ekki í fyrirtæki.';
        return r.data.map(x => lina(x.nafn || '—', x.kennitala || '')).join('') || 'Engin fyrirtæki.';
      }
    } catch (_) {}
    return '—';
  }

  async function fyllaGogn() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    // Hver kubbur er sóttur í sínu try/catch og villan BIRTIST í kubbnum.
    // Áður féll allt á fyrsta hnökra og notandinn sá bara „…“ að eilífu.
    for (const el of v.querySelectorAll('._ms-tala')) {
      try { el.textContent = await maelingGildi(el.dataset.m); }
      catch (e) { el.textContent = '—'; el.title = String(e && e.message || e); console.warn('[minar-sidur] tala:', e); }
    }
    for (const el of v.querySelectorAll('._ms-listi')) {
      try { el.innerHTML = await listaHTML(el.dataset.l, Math.max(3, Math.min(20, +el.dataset.n || 6))); }
      catch (e) { el.textContent = 'Náði ekki í gögnin.'; console.warn('[minar-sidur] listi:', e); }
    }
  }

  // ── Atburðir ──────────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.contains(e.target)) return;

    const flipi = e.target.closest('._ms-flipi');
    if (flipi) { _virk = flipi.dataset.id; _breyta = false; teikna(); return; }

    if (e.target.closest('._ms-ny')) {
      const nafn = prompt('Nafn á nýrri síðu:', 'Mín síða ' + (_state.sidur.length + 1));
      if (!nafn) return;
      const p = { id: nyttId(), nafn: nafn.trim(), kubbar: [] };
      _state.sidur.push(p); _virk = p.id; _breyta = true;
      vista(); teikna(); return;
    }
    if (e.target.closest('._ms-breyta')) { _breyta = !_breyta; teikna(); return; }
    if (e.target.closest('._ms-endurnefna')) {
      const s = sidan(); if (!s) return;
      const nafn = prompt('Nýtt nafn:', s.nafn || '');
      if (nafn && nafn.trim()) { s.nafn = nafn.trim(); vista(); teikna(); }
      return;
    }
    if (e.target.closest('._ms-eyda-sidu')) {
      const s = sidan(); if (!s) return;
      if (!confirm('Eyða síðunni „' + (s.nafn || '') + '“ og öllu á henni?')) return;
      _state.sidur = _state.sidur.filter(x => x.id !== s.id);
      _virk = _state.sidur.length ? _state.sidur[0].id : null;
      _breyta = false; vista(); teikna(); return;
    }

    const breidd = e.target.closest('._ms-breidd');
    if (breidd) {
      const p2 = sidan(); if (!p2) return;
      const k = p2.kubbar.find(x => x.id === breidd.dataset.id);
      if (k) { k.w = +breidd.dataset.w; vista(); teikna(); }
      return;
    }
    const thett = e.target.closest('._ms-thett'), kort = e.target.closest('._ms-kort');
    if (thett || kort) {
      const p2 = sidan(); if (!p2) return;
      if (thett) p2.thettleiki = thett.dataset.v; else p2.kort = kort.dataset.v;
      vista(); teikna(); return;
    }

    const baeta = e.target.closest('._ms-baeta');
    if (baeta) { const s = sidan(); if (!s) return; (s.kubbar = s.kubbar || []).push(nyrKubbur(baeta.dataset.g)); vista(); teikna(); return; }

    const eyda = e.target.closest('._ms-eyda-kubb');
    if (eyda) {
      const s = sidan(); if (!s) return;
      s.kubbar = (s.kubbar || []).filter(k => k.id !== eyda.dataset.id);
      vista(); teikna(); return;
    }
    const upp = e.target.closest('._ms-upp'), nidur = e.target.closest('._ms-nidur');
    if (upp || nidur) {
      const s = sidan(); if (!s) return;
      const id = (upp || nidur).dataset.id;
      const i = s.kubbar.findIndex(k => k.id === id);
      const j = upp ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= s.kubbar.length) return;
      const t = s.kubbar[i]; s.kubbar[i] = s.kubbar[j]; s.kubbar[j] = t;
      vista(); teikna(); return;
    }

    const lbaeta = e.target.closest('._ms-lbaeta');
    if (lbaeta) {
      const s = sidan(); const k = s && s.kubbar.find(x => x.id === lbaeta.dataset.id);
      if (!k) return;
      (k.tenglar = k.tenglar || []).push({ nafn: '', url: '' });
      vista(); teikna(); return;
    }
    const leyda = e.target.closest('._ms-leyda');
    if (leyda) {
      const s = sidan(); const k = s && s.kubbar.find(x => x.id === leyda.dataset.id);
      if (!k) return;
      k.tenglar.splice(+leyda.dataset.i, 1); vista(); teikna(); return;
    }
    const feyda = e.target.closest('._ms-feyda');
    if (feyda) {
      const s = sidan(); const k = s && s.kubbar.find(x => x.id === feyda.dataset.id);
      if (!k) return;
      k.sidur.splice(+feyda.dataset.i, 1); vista(); teikna(); return;
    }
    const fara = e.target.closest('._ms-fara');
    if (fara) {
      const b = document.querySelector('.vnav-btn[data-view="' + fara.dataset.view + '"]');
      if (b) b.click(); else toast('Fann ekki síðuna.');
      return;
    }
  });

  document.addEventListener('input', e => {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.contains(e.target)) return;
    const s = sidan(); if (!s) return;

    const titill = e.target.closest('._ms-titill');
    if (titill) { const k = s.kubbar.find(x => x.id === titill.dataset.id); if (k) { k.titill = titill.value; vista(); } return; }

    const texti = e.target.closest('._ms-texti');
    if (texti) { const k = s.kubbar.find(x => x.id === texti.dataset.id); if (k) { k.texti = texti.value; vista(); } return; }

    const gildi = e.target.closest('._ms-gildi');
    if (gildi) { const k = s.kubbar.find(x => x.id === gildi.dataset.id); if (k) { k.gildi = gildi.value; vista(); } return; }

    const undirtexti = e.target.closest('._ms-undirtexti');
    if (undirtexti) { const k = s.kubbar.find(x => x.id === undirtexti.dataset.id); if (k) { k.undirtexti = undirtexti.value; vista(); } return; }

    const lnafn = e.target.closest('._ms-lnafn'), lurl = e.target.closest('._ms-lurl');
    if (lnafn || lurl) {
      const el = lnafn || lurl;
      const k = s.kubbar.find(x => x.id === el.dataset.id);
      if (!k) return;
      const l = k.tenglar[+el.dataset.i];
      if (!l) return;
      if (lnafn) l.nafn = el.value; else l.url = el.value.trim();
      vista();
    }
  });

  document.addEventListener('change', e => {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.contains(e.target)) return;
    const maeling = e.target.closest('._ms-maeling');
    if (maeling) {
      const p2 = sidan(); const k = p2 && p2.kubbar.find(x => x.id === maeling.dataset.id);
      if (k) { k.m = maeling.value; vista(); teikna(); }
      return;
    }
    const listaval = e.target.closest('._ms-listaval');
    if (listaval) {
      const p2 = sidan(); const k = p2 && p2.kubbar.find(x => x.id === listaval.dataset.id);
      if (k) { k.l = listaval.value; vista(); teikna(); }
      return;
    }
    const listafj = e.target.closest('._ms-listafj');
    if (listafj) {
      const p2 = sidan(); const k = p2 && p2.kubbar.find(x => x.id === listafj.dataset.id);
      if (k) { k.fjoldi = Math.max(3, Math.min(20, +listafj.value || 6)); vista(); teikna(); }
      return;
    }
    const fb = e.target.closest('._ms-fbaeta');
    if (!fb || !fb.value) return;
    const s = sidan(); const k = s && s.kubbar.find(x => x.id === fb.dataset.id);
    if (!k) return;
    (k.sidur = k.sidur || []).push(fb.value);
    vista(); teikna();
  });


  // ── Draga til að endurraða (aðeins í rithætti) ────────────────────────────
  let _dragId = null;
  document.addEventListener('dragstart', e => {
    const k = e.target.closest && e.target.closest('._ms-kubbur');
    if (!k || !_breyta) return;
    _dragId = k.dataset.id;
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', _dragId); } catch (_) {}
    k.style.opacity = '.5';
  });
  document.addEventListener('dragend', e => {
    const k = e.target.closest && e.target.closest('._ms-kubbur');
    if (k) k.style.opacity = '';
    _dragId = null;
  });
  document.addEventListener('dragover', e => {
    if (!_dragId) return;
    const yfir = e.target.closest && e.target.closest('._ms-kubbur');
    if (yfir) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    if (!_dragId) return;
    const yfir = e.target.closest && e.target.closest('._ms-kubbur');
    if (!yfir || yfir.dataset.id === _dragId) return;
    e.preventDefault();
    const p2 = sidan(); if (!p2) return;
    const fra = p2.kubbar.findIndex(x => x.id === _dragId);
    const til = p2.kubbar.findIndex(x => x.id === yfir.dataset.id);
    if (fra < 0 || til < 0) return;
    const [k] = p2.kubbar.splice(fra, 1);
    p2.kubbar.splice(til, 0, k);
    _dragId = null;
    vista(); teikna();
  });

  // ── Síðan sjálf + hnappur í hliðarstiku (sama aðferð og patch 175) ────────
  function viewEl() { return document.getElementById(VIEW_ID); }
  function synaOkkar(btn) {
    document.querySelectorAll('[id^=view-]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    let v = viewEl();
    if (!v) {
      v = document.createElement('div');
      v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:0';
      const ref = document.getElementById('view-settings') || document.getElementById('view-counter');
      if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
    }
    v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Sækja ferskt af servernum þegar síðan er opnuð — nema vistun sé í bið.
    if (!_vistT) lesa(true);
    teikna();
  }

  function setjaHnapp() {
    const btns = [...document.querySelectorAll('.vnav-btn')];
    const anchor = btns.find(b => b.dataset.view === 'settings') || btns[btns.length - 1];
    if (!anchor || !anchor.parentElement) return;
    if (document.querySelector('[data-view="minar-sidur"]')) return;

    const btn = anchor.cloneNode(true);
    btn.dataset.view = 'minar-sidur';
    btn.classList.remove('active');
    btn.removeAttribute('onclick');
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Mínar síður'; else btn.textContent = 'Mínar síður';
    const svg = btn.querySelector('svg');
    if (svg && window.UIIcons) svg.outerHTML = UIIcons.svg('layers', { size: 18 });
    btn.onclick = () => synaOkkar(btn);
    anchor.parentNode.insertBefore(btn, anchor);

    document.querySelectorAll('.vnav-btn').forEach(b => {
      if (b === btn) return;
      b.addEventListener('click', () => {
        const v = viewEl();
        if (v) { v.style.display = 'none'; v.classList.remove('active'); }
        btn.classList.remove('active');
      });
    });
  }
  setInterval(setjaHnapp, 1200);
  setTimeout(setjaHnapp, 700);

  window.MinarSidur = {
    teikna,
    opna: () => { const b = document.querySelector('[data-view="minar-sidur"]'); if (b) b.click(); },
    // Djúptenging á EINA tiltekna síðu (t.d. úr Öpp-þjónustuborði) — setur
    // _virk beint OG hash-ið svo endurhlaðin síða haldi sömu síðu.
    openPage: (id) => {
      _hashLest = true; _virk = id;
      try { location.hash = 'minar/' + id; } catch (_) {}
      const b = document.querySelector('[data-view="minar-sidur"]');
      if (b) b.click(); else teikna();
    }
  };
  console.log('[patch-302] Mínar síður — síðusmiður + tenglasafn');
})();
/* === END MÍNAR SÍÐUR === */
