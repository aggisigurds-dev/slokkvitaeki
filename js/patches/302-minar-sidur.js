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
    { g: 'tenglar',       nafn: 'Tenglasafn',    tákn: 'tag',       lysing: 'Hlekkir í hópum — dkPlus, Drive, bankinn, hvað sem er.' },
    { g: 'minnispunktar', nafn: 'Minnispunktar', tákn: 'clipboard', lysing: 'Frjáls texti sem vistast sjálfkrafa.' },
    { g: 'flytileidir',   nafn: 'Flýtileiðir',   tákn: 'grid',      lysing: 'Beint í síður appsins — Sala, Verkstæði, Reikningar…' },
    { g: 'fyrirsogn',     nafn: 'Fyrirsögn',     tákn: 'list',      lysing: 'Til að skipta síðunni upp í kafla.' }
  ];

  function nyrKubbur(g) {
    const grunn = { id: nyttId(), g, titill: (GERDIR.find(x => x.g === g) || {}).nafn || '' };
    if (g === 'tenglar') grunn.tenglar = [];
    if (g === 'minnispunktar') grunn.texti = '';
    if (g === 'flytileidir') grunn.sidur = [];
    return grunn;
  }

  // Síður appsins úr hliðarstikunni — svo flýtileiðirnar séu alltaf réttar.
  function appSidur() {
    return [...document.querySelectorAll('.vnav-btn[data-view]')]
      .map(b => ({ view: b.dataset.view, nafn: (b.textContent || '').trim().split('\n')[0].replace(/\s+\d+$/, '').trim() }))
      .filter(x => x.nafn);
  }

  // ── Teikning ──────────────────────────────────────────────────────────────
  const kortStill = 'border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(15,23,42,.05);overflow:hidden';
  const hnappur = 'display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink1);border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer';

  function kubburHTML(k, idx, alls) {
    const stjorn = _breyta
      ? '<div style="display:flex;gap:4px;margin-left:auto">' +
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

    return '<div class="_ms-kubbur" data-id="' + k.id + '" style="' + kortStill + '">' +
        '<div style="display:flex;align-items:center;gap:9px;padding:10px 13px;border-bottom:1px solid var(--brd);background:var(--surface2)">' +
          '<span style="color:var(--brand);display:flex">' + ic((GERDIR.find(x => x.g === k.g) || {}).tákn || 'dot', 15) + '</span>' +
          (_breyta
            ? '<input class="_ms-titill" data-id="' + k.id + '" value="' + esc(k.titill || '') + '" placeholder="Titill" style="flex:1;font-size:13px;font-weight:700;color:var(--ink1);border:1px dashed var(--brd2);border-radius:7px;padding:4px 8px;background:transparent">'
            : '<span style="font-size:13px;font-weight:700;color:var(--ink1)">' + esc(k.titill || '') + '</span>') +
          stjorn +
        '</div>' +
        '<div style="padding:12px 13px">' + innihald + '</div>' +
      '</div>';
  }

  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    lesa();
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
        '<div style="' + kortStill + ';padding:30px;text-align:center;max-width:560px">' +
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
        ? '<div style="' + kortStill + ';padding:12px 13px;margin-bottom:14px;background:var(--surface2)">' +
            '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Bæta við kubbi</div>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
              GERDIR.map(g => '<button class="_ms-baeta" data-g="' + g.g + '" type="button" title="' + esc(g.lysing) + '" style="' + hnappur + '">' +
                ic(g.tákn, 13) + g.nafn + '</button>').join('') +
            '</div>' +
          '</div>'
        : '') +
      (kubbar.length
        ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px;align-items:start">' +
            kubbar.map((k, i) => kubburHTML(k, i, kubbar.length)).join('') + '</div>'
        : '<div style="' + kortStill + ';padding:26px;text-align:center;color:var(--ink3);font-size:12.5px">' +
            'Síðan er tóm. Smelltu á <b>Breyta</b> og bættu við kubbi.</div>') +
      '</div>';
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
    const fb = e.target.closest('._ms-fbaeta');
    if (!fb || !fb.value) return;
    const s = sidan(); const k = s && s.kubbar.find(x => x.id === fb.dataset.id);
    if (!k) return;
    (k.sidur = k.sidur || []).push(fb.value);
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

  window.MinarSidur = { teikna, opna: () => { const b = document.querySelector('[data-view="minar-sidur"]'); if (b) b.click(); } };
  console.log('[patch-302] Mínar síður — síðusmiður + tenglasafn');
})();
/* === END MÍNAR SÍÐUR === */
