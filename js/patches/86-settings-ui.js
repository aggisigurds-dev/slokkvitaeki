/* === SETTINGS UI v1 ===
 *
 * Admin panel for editing window.AppSettings (patch 85). Adds a "⚙️ Stillingar"
 * nav button in the sidebar and a tabbed modal with sections:
 *   • Branding — banner text/subtitle, kennitala, sími, address, logo URL
 *   • Sala — sort order, hidden products
 *   • Þjónusta hraðtakkar — 4-6 quick-action buttons
 *   • Prentun — default print toggles, label size
 *   • Almennt — VSK %, due days, pickup offset
 *
 * Saves go through AppSettings.save({...}) which writes to Supabase.
 */
(() => {
  if (window.__settingsUIInstalled) return;
  window.__settingsUIInstalled = true;

  // Appið endurskrifar slóðina (í #sala) meðan það ræsir sig, svo #settings er
  // horfið þegar init() keyrir. Þess vegna er hún gripin hér — við keyrslu
  // skriftunnar, áður en nokkur router kemst að.
  const _slodVidRaesingu = String(location.hash || '');
  let _upphafKafli = ((_slodVidRaesingu.match(/^#settings\/([a-z0-9_-]+)/i) || [])[1]) || null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('su-style')) {
    const s = document.createElement('style'); s.id = 'su-style';
    s.textContent = `
      /* 2026-08-05 (ósk Agnars: „voða ræfillsleg popup — gera hana frekar
         bara full page með betri lýsingum"): sami skjár, en sem heil síða með
         hliðarrönd. Öll auðkenni (#su-modal/.su-card/.su-tabs/#su-body) haldast
         svo allir 13 kaflarnir og vistunin virki óbreytt. */
      #su-modal { position:relative; inset:auto; z-index:1; display:block; font-family:inherit; }
      #su-modal .su-back { display:none; }
      #su-modal .su-card { position:relative; background:var(--surface,#fff); border:1px solid var(--brd,#e2e8f0); border-radius:16px; box-shadow:0 1px 3px rgba(15,23,42,.06); width:100%; max-height:none; display:block; overflow:hidden; }
      #su-modal .su-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:20px 24px; border-bottom:1px solid var(--brd,#e2e8f0); background:linear-gradient(135deg, var(--app-primary, #C93C1D) 0%, #7f1d1d 100%); color:#fff; }
      #su-modal .su-hd h3 { margin:0; font-size:19px; font-weight:800; letter-spacing:-.01em; color:#fff !important; }  /* þemað setur h3 dökkgrátt globalt */
      #su-modal .su-hd .su-sub { color:#fff; margin-top:3px; font-size:12.5px; opacity:.8; max-width:70ch; }
      #su-modal .su-x { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:600; }
      #su-modal .su-main { display:grid; grid-template-columns:268px 1fr; align-items:start; }
      /* Hliðarröndin — hver kafli með nafni OG lýsingu, ekki bara flipa-orði. */
      #su-modal .su-tabs { display:flex; flex-direction:column; gap:2px; padding:12px; border-right:1px solid var(--brd,#e2e8f0); background:var(--surface2,#f8fafc); overflow:visible; }
      #su-modal .su-leit { padding:2px 2px 10px; }
      #su-modal .su-leit input { width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid var(--brd2,#cbd5e1); border-radius:9px; font:inherit; font-size:13px; background:var(--surface,#fff); color:var(--ink1,#0f172a); }
      #su-modal .su-leit input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 1px #2563eb; }
      #su-modal .su-hopur { margin-bottom:10px; }
      #su-modal .su-hopur-nafn { padding:4px 11px 6px; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3,#94a3b8); }
      #su-modal .su-ekkert { padding:14px 11px; font-size:12px; font-style:italic; color:var(--ink4,#94a3b8); }
      #su-modal .su-tab { display:block; width:100%; text-align:left; padding:9px 11px; font:inherit; font-size:13px; font-weight:600; color:var(--ink2,#475569); background:transparent; border:1px solid transparent; border-bottom:none; border-radius:9px; cursor:pointer; white-space:normal; line-height:1.25; }
      #su-modal .su-tab .su-tab-desc { display:block; margin-top:2px; font-size:10.5px; font-weight:500; color:var(--ink3,#94a3b8); }
      #su-modal .su-tab:hover { background:rgba(15,23,42,.04); color:var(--ink1,#0f172a); }
      #su-modal .su-tab.active { background:var(--surface,#fff); border-color:var(--brd,#e2e8f0); color:var(--ink1,#0f172a); box-shadow:0 1px 2px rgba(15,23,42,.06); }
      #su-modal .su-tab.active .su-tab-desc { color:var(--ink2,#64748b); }
      #su-modal .su-pane { min-width:0; }
      #su-modal .su-pane-hd { padding:18px 24px 0; }
      #su-modal .su-pane-hd h4 { margin:0; font-size:16px; font-weight:800; color:var(--ink1,#0f172a); }
      #su-modal .su-pane-hd p { margin:4px 0 0; font-size:12.5px; color:var(--ink3,#64748b); max-width:74ch; line-height:1.5; }
      #su-modal .su-body { padding:16px 24px 22px; overflow:visible; max-width:900px; }
      #su-modal .su-row { display:grid; grid-template-columns:160px 1fr; gap:10px; align-items:center; margin-bottom:11px; }
      #su-modal .su-row label { font-size:12px; font-weight:600; color:#475569; }
      #su-modal .su-row input[type="text"], #su-modal .su-row input[type="number"], #su-modal .su-row input[type="email"], #su-modal .su-row select, #su-modal .su-row textarea { width:100%; padding:8px 11px; border:1px solid #cbd5e1; border-radius:7px; font:inherit; font-size:13px; box-sizing:border-box; }
      #su-modal .su-row input[type="color"] { width:50px; height:34px; padding:2px; border:1px solid #cbd5e1; border-radius:7px; cursor:pointer; }
      #su-modal .su-row input:focus, #su-modal .su-row select:focus, #su-modal .su-row textarea:focus { outline:none; border-color:#2563eb; }
      #su-modal .su-row .su-inline { display:flex; gap:8px; align-items:center; }
      #su-modal .su-row .su-hint { font-size:11px; color:#94a3b8; margin-top:3px; }
      #su-modal .su-section-title { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin:14px 0 8px; padding-bottom:5px; border-bottom:1px solid #e2e8f0; }
      #su-modal .su-section-title:first-child { margin-top:0; }
      #su-modal .su-foot { display:flex; gap:8px; justify-content:space-between; align-items:center; padding:14px 24px; border-top:1px solid var(--brd,#e2e8f0); background:var(--surface2,#f8fafc); position:sticky; bottom:0; }
      #su-modal .su-cancel { padding:9px 18px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; cursor:pointer; font:inherit; font-size:13px; color:#475569; }
      #su-modal .su-save { padding:9px 18px; background: var(--app-primary, #C93C1D); color:#fff; border:none; border-radius:8px; cursor:pointer; font:inherit; font-size:13px; font-weight:600; }
      #su-modal .su-save:disabled { opacity:.5; cursor:not-allowed; }
      #su-modal .su-shortcut-row { display:grid; grid-template-columns:50px 1fr 110px 50px; gap:8px; align-items:center; margin-bottom:7px; }
      #su-modal .su-shortcut-row input { padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font:inherit; font-size:13px; box-sizing:border-box; }
      #su-modal .su-prod-list { max-height:240px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:4px; }
      #su-modal .su-prod-row { display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:5px; }
      #su-modal .su-prod-row:hover { background:#f8fafc; }
      #su-modal .su-prod-row input[type="checkbox"] { width:16px; height:16px; }
      #su-modal .su-prod-name { flex:1; font-size:13px; }
      #su-modal .su-prod-cat { font-size:11px; color:#94a3b8; }
      #su-modal .su-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#0f172a; color:#fff; padding:10px 18px; border-radius:8px; font-size:13px; z-index:100030; opacity:0; transition:opacity .25s; pointer-events:none; }
      #su-modal .su-toast.show { opacity:1; }
    `;
    document.head.appendChild(s);
  }

  let _draft = null;          // working copy of settings while modal is open
  // 2026-07-30 — AÐEINS þessir kaflar eru ritstýrðir hér. Áður var tekið afrit af
  // ÖLLUM 47 lyklum blobbsins þegar glugginn opnaðist og allir sendir til baka við
  // vistun — þar með `arsskodun_customers` (669 KB, 808 fyrirtæki),
  // `company_attachments` (475 KB), `job_shelves`, `inspection_trips` …
  // Fersk-lestur í `save()` bjargar ekki: gamla afritið INNIHELDUR alla lyklana,
  // svo deepMerge skrifar hvern og einn yfir með gamla gildinu. Fjórar vélar keyra
  // þetta samtímis, svo tvær mínútur með gluggann opinn þurrkuðu út allt sem hinir
  // gerðu á meðan — og VÖKTU UPP eyðingar (röð sem var sett á `null` server-megin
  // kom aftur sem gamli hluturinn úr afritinu).
  const SU_SECTIONS = ['branding','sala','shortcuts','prentun','almennt','starfsmenn',
                       'utlit','kvittun','tilkynningar','email','tenglar','backup'];
  let _orig = null;           // JSON af hverjum kafla eins og hann var við opnun
  let _activeTab = 'branding';
  let _allProducts = [];

  async function loadProducts(refresh) {
    if (!refresh && _allProducts.length) return _allProducts;
    if (!window.DB || !window.DB.sb) return [];
    try {
      const r = await window.DB.sb.from('vorur')
        .select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,birgdir,virkt')
        .order('flokkur', { ascending: true })
        .order('nafn', { ascending: true });
      if (r.data) _allProducts = r.data;
    } catch (e) { /* ignore */ }
    return _allProducts;
  }


  // Kaflar með MANNAMÁLS-lýsingu — nafnið eitt segir sjaldnast hvað er þarna inni.
  const SU_META = [
    ['branding',     'Merki og borði',    'Nafn, merki, borði og litir sem birtast efst í appinu og á kvittunum.', 'Vinnusvæði', 'logo banner litir nafn kennitala heimilisfang sími netfang'],
    ['sala',         'Sala — flísar',     'Hvaða vörur birtast sem flísar í Sölu og í hvaða röð.', 'Vinnusvæði', 'pos karfa flísar vörur röð'],
    ['shortcuts',    'Hraðtakkar',        'Flýtitakkar á Sölu-skjánum — algengustu verkin í einum smelli.', 'Vinnusvæði', 'flýtileiðir takkar'],
    ['vorur',        'Vörur og þjónusta', 'Hvaða vörur eru virkar og sjást í vörulistanum.', 'Vinnusvæði', 'verð vsk vörulisti þjónusta virkt'],
    ['starfsmenn',   'Starfsmenn',        'Hverjir skrá sig á verk og birtast í úttektarskýrslum.', 'Vinnusvæði', 'tæknimenn skoðunaraðili nöfn'],
    ['utlit',        'Hliðarstika',       'Hvaða síður sjást í hliðarstikunni og í hvaða röð.', 'Vinnusvæði', 'valmynd nav síður röð fela'],
    ['kvittun',      'Kvittun',           'Texti og útlit á kvittuninni sem viðskiptavinur fær.', 'Vinnusvæði', 'kvittun bon prentun texti'],
    ['prentun',      'Prentun',           'Pappírsstærð, spássíur og prentstillingar fyrir reikninga og miða.', 'Vinnusvæði', 'prentari a4 miðar spássía'],
    ['tilkynningar', 'Tilkynningar',      'Hvenær kerfið lætur vita — áminningar og viðvaranir.', 'Vinnusvæði', 'áminning viðvörun sms'],
    ['email',        'Tölvupóstur',       'Netföng sem sent er frá og hverjir fá afrit.', 'Vinnusvæði', 'email netfang afrit bcc sendandi gmail'],
    ['tenglar',      'Tenglar',           'Flýtileiðir í ytri kerfi — dkPlus, Payday, Drive og fleira.', 'Vinnusvæði', 'dkplus payday drive tenglar hlekkir'],
    ['almennt',      'Almennt',           'VSK, gjaldmiðill, dagsetningarsnið og önnur grunngildi.', 'Vinnusvæði', 'vsk gjaldmiðill dagsetning kr prósenta'],
    ['backup',       'Afritun',           'Afritun og útflutningur á gögnum.', 'Gögn', 'backup afrit útflutningur json']
  ];
  // Aðrir patchar mega bæta við kafla: SettingsUI.registerSection({id,nafn,lysing,render})
  const _extraSections = [];
  function registerSection(sec) {
    if (!sec || !sec.id || typeof sec.render !== 'function') return false;
    if (_extraSections.some(x => x.id === sec.id)) return false;
    _extraSections.push(sec);
    const m = document.getElementById('su-modal');
    if (m) { close(); open(); }
    return true;
  }
  function allarSectionir() {
    return SU_META.map(m => ({ id: m[0], nafn: m[1], lysing: m[2], hopur: m[3], ord: m[4] || '' }))
      .concat(_extraSections.map(x => ({
        id: x.id, nafn: x.nafn || x.id, lysing: x.lysing || '',
        hopur: x.hopur || 'Kerfi', ord: x.ord || ''
      })));
  }
  const HOPA_ROD = ['Vinnusvæði', 'Þetta tæki', 'Kerfi', 'Gögn'];
  function hopar() {
    const allt = allarSectionir();
    const nofn = HOPA_ROD.filter(h => allt.some(s2 => s2.hopur === h))
      .concat([...new Set(allt.map(s2 => s2.hopur))].filter(h => HOPA_ROD.indexOf(h) < 0));
    return nofn.map(h => ({ nafn: h, kaflar: allt.filter(s2 => s2.hopur === h) }));
  }
  function metaFyrir(id) { return allarSectionir().find(x => x.id === id) || { id, nafn: id, lysing: '' }; }

  function open() {
    if (document.getElementById('su-modal')) return;
    if (!window.AppSettings) { alert('Stillingakerfi ekki tilbúið.'); return; }
    const _all = window.AppSettings.get() || {};
    _draft = {}; _orig = {};
    SU_SECTIONS.forEach(k => {
      _draft[k] = JSON.parse(JSON.stringify(_all[k] === undefined ? null : _all[k]));
      _orig[k]  = JSON.stringify(_draft[k]);
    });
    const wrap = document.createElement('div');
    wrap.id = 'su-modal';
    wrap.innerHTML =
      '<div class="su-back"></div>' +
      '<div class="su-card">' +
        '<div class="su-hd">' +
          '<div><h3>Stillingar</h3>' +
            '<div class="su-sub">Allt sem stýrir því hvernig appið lítur út, hvað birtist hvar og hvernig reikningar og kvittanir eru unnin. Breytingar gilda á öllum tækjum um leið og þú vistar.</div>' +
          '</div>' +
          '<button class="su-x" type="button">Loka</button>' +
        '</div>' +
        '<div class="su-main">' +
          '<div class="su-tabs">' +
            '<div class="su-leit"><input id="su-leit" type="search" autocomplete="off" placeholder="Leita í stillingum…"></div>' +
            hopar().map(h =>
              '<div class="su-hopur" data-hopur="' + esc(h.nafn) + '">' +
                '<div class="su-hopur-nafn">' + esc(h.nafn) + '</div>' +
                h.kaflar.map(sec =>
                  '<button class="su-tab" data-tab="' + esc(sec.id) + '" data-leit="' +
                    esc((sec.nafn + ' ' + sec.lysing + ' ' + sec.ord).toLowerCase()) + '">' + esc(sec.nafn) +
                    (sec.lysing ? '<span class="su-tab-desc">' + esc(sec.lysing) + '</span>' : '') +
                  '</button>').join('') +
              '</div>').join('') +
            '<div class="su-ekkert" style="display:none">Ekkert fannst</div>' +
          '</div>' +
          '<div class="su-pane">' +
            '<div class="su-pane-hd" id="su-pane-hd"></div>' +
            '<div class="su-body" id="su-body"></div>' +
            '<div class="su-foot">' +
              '<button class="su-cancel" type="button">Hætta við breytingar</button>' +
              '<button class="su-save" type="button">Vista stillingar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="su-toast" id="su-toast"></div>';

    // Full síða: sest efst í Stillingar-sýnina, ekki sem yfirlag á allt appið.
    const view = document.getElementById('view-settings');
    const legacy = document.getElementById('settings-main');
    if (view) {
      view.insertBefore(wrap, view.firstChild);
      if (legacy && !document.getElementById('_su-legacy')) faldaEldri(view, legacy);
      try { if (typeof showMasterView === 'function') showMasterView('view-settings'); } catch (_) {}
      if (location.hash !== '#settings') { try { location.hash = '#settings'; } catch (_) {} }
    } else {
      document.body.appendChild(wrap);   // neyðarlending ef sýnin finnst ekki
    }

    wrap.querySelector('.su-x').addEventListener('click', () => {
      // Full síða: „Loka" fer til baka þangað sem notandinn var.
      if (!máYfirgefa('Loka og henda þeim?')) return;
      close();
      try { if (history.length > 1) history.back(); else if (typeof showMasterView === 'function') showMasterView('view-counter'); } catch (_) {}
    });
    // „Hætta við breytingar" hendir uppkastinu og teiknar síðuna upp á nýtt.
    wrap.querySelector('.su-cancel').addEventListener('click', () => { close(); open(); });
    wrap.querySelector('.su-save').addEventListener('click', save);
    wrap.querySelectorAll('.su-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    // Leit: síar kaflana beint, engin endurteikning.
    const leit = wrap.querySelector('#su-leit');
    if (leit) {
      leit.addEventListener('input', () => {
        const q = leit.value.trim().toLowerCase();
        let synilegir = 0;
        wrap.querySelectorAll('.su-tab').forEach(t => {
          const passar = !q || (t.dataset.leit || '').indexOf(q) >= 0;
          t.style.display = passar ? '' : 'none';
          if (passar) synilegir++;
        });
        wrap.querySelectorAll('.su-hopur').forEach(g => {
          const einhver = [...g.querySelectorAll('.su-tab')].some(t => t.style.display !== 'none');
          g.style.display = einhver ? '' : 'none';
        });
        const ekkert = wrap.querySelector('.su-ekkert');
        if (ekkert) ekkert.style.display = synilegir ? 'none' : '';
      });
      leit.addEventListener('keydown', e => {
        if (e.key === 'Escape') { leit.value = ''; leit.dispatchEvent(new Event('input')); }
        if (e.key === 'Enter') {
          const fyrsti = [...wrap.querySelectorAll('.su-tab')].find(t => t.style.display !== 'none');
          if (fyrsti) fyrsti.click();
        }
      });
    }

    // Djúptengill: #settings/email opnar þann kafla beint.
    const fráHash = _upphafKafli || (location.hash.match(/^#settings\/([a-z0-9_-]+)/i) || [])[1];
    _upphafKafli = null;
    const gildir = allarSectionir().some(x => x.id === fráHash);
    switchTab(gildir ? fráHash : _activeTab);
  }

  // ── Óvistaðar breytingar ─────────────────────────────────────────────────
  function óhreinirKaflar() {
    if (!_draft || !_orig) return [];
    return Object.keys(_draft).filter(k => JSON.stringify(_draft[k]) !== _orig[k]);
  }
  function máYfirgefa(hvað) {
    const ó = óhreinirKaflar();
    if (!ó.length) return true;
    const nöfn = ó.map(k => metaFyrir(k).nafn).join(', ');
    return confirm('Óvistaðar breytingar í: ' + nöfn + '\n\n' + (hvað || 'Halda áfram og henda þeim?'));
  }
  window.addEventListener('beforeunload', e => {
    if (!document.getElementById('su-modal')) return;
    if (!óhreinirKaflar().length) return;
    e.preventDefault(); e.returnValue = '';
  });

  // Eldri stillingasíðan (tækjategundir, innflutningur, hreinsun o.fl. sem aðrir
  // patchar setja í #settings-main) fer í samanbrotinn kassa fyrir neðan — hún
  // hverfur ekki, en ryður ekki nýja skjánum úr vegi.
  function faldaEldri(view, legacy) {
    const box = document.createElement('div');
    box.id = '_su-legacy';
    box.style.cssText = 'margin:16px 0 0;border:1px solid var(--brd,#e2e8f0);border-radius:12px;background:var(--surface,#fff);overflow:hidden';
    const hd = document.createElement('button');
    hd.type = 'button';
    hd.style.cssText = 'all:unset;box-sizing:border-box;display:flex;align-items:center;gap:9px;width:100%;padding:12px 16px;cursor:pointer;background:var(--surface2,#f8fafc)';
    hd.innerHTML = '<span style="font-size:13px;color:var(--ink3,#94a3b8)">▸</span>' +
      '<span style="font-size:13px;font-weight:700;color:var(--ink1,#0f172a)">Eldri stillingar</span>' +
      '<span style="font-size:11px;color:var(--ink3,#94a3b8)">tækjategundir, þjónustutegundir, innflutningur og hreinsun</span>';
    const holf = document.createElement('div');
    holf.style.display = 'none';
    hd.addEventListener('click', () => {
      const opid = holf.style.display !== 'none';
      holf.style.display = opid ? 'none' : 'block';
      hd.firstChild.style.transform = opid ? 'rotate(0deg)' : 'rotate(90deg)';
    });
    view.appendChild(box);
    box.appendChild(hd);
    box.appendChild(holf);
    holf.appendChild(legacy);
  }

  function close() {
    const m = document.getElementById('su-modal');
    if (m) m.remove();
    _orig = null;
    _draft = null;
  }

  function switchTab(name) {
    // Vörn: ekki henda óvistuðum breytingum þegjandi þegar skipt er um kafla.
    if (_activeTab && name !== _activeTab && !máYfirgefa('Skipta yfir í annan kafla og henda þeim?')) return;
    _activeTab = name;
    try { if (location.hash !== '#settings/' + name) history.replaceState(null, '', '#settings/' + name); } catch (_) {}
    const m = document.getElementById('su-modal');
    if (!m) return;
    m.querySelectorAll('.su-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    // Haus yfir kaflanum: nafn + sama lýsing og í hliðarröndinni, svo maður viti
    // alltaf hvað þessi skjár gerir án þess að giska út frá einu orði.
    const hd = m.querySelector('#su-pane-hd');
    if (hd) {
      const meta = metaFyrir(name);
      hd.innerHTML = '<h4>' + esc(meta.nafn) + '</h4>' + (meta.lysing ? '<p>' + esc(meta.lysing) + '</p>' : '');
    }
    const body = m.querySelector('#su-body');
    const auka = _extraSections.find(x => x.id === name);
    if (auka) {
      const fotur = m.querySelector('.su-foot');
      if (fotur) fotur.style.display = 'none';      // aukakaflar vista sjálfir
      Promise.resolve(auka.render(body)).catch(() => {});
      return;
    }
    { const fotur = m.querySelector('.su-foot'); if (fotur) fotur.style.display = ''; }
    if (name === 'branding')   { body.innerHTML = renderBranding();   wireBranding(body); return; }
    if (name === 'sala')       { body.innerHTML = '<div style="padding:20px;color:#94a3b8">Hleður vörum…</div>'; loadProducts().then(() => { body.innerHTML = renderSala(); wireSala(body); }); return; }
    if (name === 'shortcuts')  { body.innerHTML = renderShortcuts(); wireShortcuts(body); return; }
    if (name === 'vorur')      { body.innerHTML = '<div style="padding:20px;color:#94a3b8">Hleður vörum…</div>'; loadProducts(true).then(() => { body.innerHTML = renderVorur(); wireVorur(body); }); return; }
    if (name === 'starfsmenn') { body.innerHTML = renderStarfsmenn(); wireStarfsmenn(body); return; }
    if (name === 'utlit')      { body.innerHTML = renderUtlit();      wireUtlit(body);      return; }
    if (name === 'kvittun')    { body.innerHTML = renderKvittun();    wireKvittun(body);    return; }
    if (name === 'prentun')    { body.innerHTML = renderPrentun();   wirePrentun(body); return; }
    if (name === 'tilkynningar'){ body.innerHTML = renderTilkynningar(); wireTilkynningar(body); return; }
    if (name === 'email')      { body.innerHTML = renderEmail();     wireEmail(body); return; }
    if (name === 'tenglar')    { body.innerHTML = renderTenglar();   wireTenglar(body); return; }
    if (name === 'backup')     { body.innerHTML = renderBackup();    wireBackup(body); return; }
    if (name === 'almennt')    { body.innerHTML = renderAlmennt();   wireAlmennt(body); return; }
  }

  // ── Branding tab ──────────────────────────────────────────────────────────
  function renderBranding() {
    const b = _draft.branding;
    const f = (label, key, type, hint) => `
      <div class="su-row">
        <label>${esc(label)}</label>
        <div>
          <input type="${type || 'text'}" data-bk="${key}" value="${esc(b[key] || '')}">
          ${hint ? `<div class="su-hint">${esc(hint)}</div>` : ''}
        </div>
      </div>`;
    return `
      <div class="su-section-title">Banner & fyrirtæki</div>
      ${f('Banner texti', 'banner_text', 'text', 'Stór texti efst í navigation')}
      ${f('Undirtitill', 'banner_subtitle', 'text', 'Lítill texti undir banner')}
      <div class="su-row">
        <label>Banner stíll</label>
        <div>
          <select data-bk="banner_style">
            <option value="litrikt"  ${(b.banner_style||'litrikt')==='litrikt'  ? 'selected':''}>Litríkt — gradient + gul rönd (sjálfgefið)</option>
            <option value="hreint"   ${(b.banner_style||'litrikt')==='hreint'   ? 'selected':''}>Hreint — einfaldur gradient án rönda</option>
            <option value="ljos"     ${(b.banner_style||'litrikt')==='ljos'     ? 'selected':''}>Ljóst — hvítt með litaðri brún</option>
            <option value="minimalt" ${(b.banner_style||'litrikt')==='minimalt' ? 'selected':''}>Mínímalískt — solid litur, lægra</option>
            <option value="mynd"     ${(b.banner_style||'litrikt')==='mynd'     ? 'selected':''}>Eigin mynd — sérhönnuð PNG með klukku-overlay</option>
          </select>
          <div class="su-hint">Allir stílar eru kyrrir (engar hreyfingar). "Eigin mynd" notar PNG úr /img/ möppunni.</div>
        </div>
      </div>
      ${(b.banner_style==='mynd' ? `
        <div class="su-row">
          <label>Mynd (1x)</label>
          <div>
            <input type="text" data-bk="banner_image_url" value="${esc(b.banner_image_url || '/img/banner-1x.png')}">
            <div class="su-hint">Slóð á desktop banner — t.d. /img/banner-1x.png</div>
          </div>
        </div>
        <div class="su-row">
          <label>Mynd (2x retina)</label>
          <div>
            <input type="text" data-bk="banner_image_2x_url" value="${esc(b.banner_image_2x_url || '/img/banner-2x.png')}">
            <div class="su-hint">Há upplausn fyrir retina skjái</div>
          </div>
        </div>
        <div class="su-row">
          <label>Mynd (mobile)</label>
          <div>
            <input type="text" data-bk="banner_image_mobile_url" value="${esc(b.banner_image_mobile_url || '/img/banner-mobile.png')}">
            <div class="su-hint">Mjórri útgáfa fyrir síma</div>
          </div>
        </div>
      ` : '')}
      ${f('Fyrirtækjanafn', 'company_name', 'text')}
      ${f('Slagorð / tag', 'tagline', 'text', 'Birtist undir nafni á kvittun')}
      <div class="su-section-title">Tengiliðaupplýsingar</div>
      ${f('Kennitala', 'kennitala', 'text')}
      ${f('VSK númer', 'vsk_nr', 'text')}
      ${f('Heimilisfang 1', 'address1', 'text')}
      ${f('Heimilisfang 2', 'address2', 'text')}
      ${f('Sími', 'phone', 'text')}
      ${f('Netfang', 'email', 'email')}
      <div class="su-section-title">Útlit</div>
      ${f('Logo URL', 'logo_url', 'text', '/img/logo.png — afritaðu nýtt logo í /img/ möppuna fyrst')}
      <div class="su-row">
        <label>Höfuðlitur</label>
        <div class="su-inline">
          <input type="color" data-bk="primary_color" value="${esc(b.primary_color || '#C93C1D')}">
          <input type="text" data-bk="primary_color_text" value="${esc(b.primary_color || '#C93C1D')}" style="width:120px">
          <span class="su-hint" style="margin-top:0">Notað á hnappa, banner-gradient o.fl.</span>
        </div>
      </div>
    `;
  }
  function wireBranding(body) {
    body.querySelectorAll('input[data-bk]').forEach(inp => {
      inp.addEventListener('input', e => {
        const k = e.target.dataset.bk;
        if (k === 'primary_color_text') {
          _draft.branding.primary_color = e.target.value;
          const c = body.querySelector('input[type="color"][data-bk="primary_color"]');
          if (c) c.value = e.target.value;
        } else {
          _draft.branding[k] = e.target.value;
          if (k === 'primary_color') {
            const t = body.querySelector('input[data-bk="primary_color_text"]');
            if (t) t.value = e.target.value;
          }
        }
      });
    });
    body.querySelectorAll('select[data-bk]').forEach(sel => {
      sel.addEventListener('change', e => {
        _draft.branding[e.target.dataset.bk] = e.target.value;
        // Re-render Branding tab if banner_style changes so image-URL inputs
        // appear/disappear immediately.
        if (e.target.dataset.bk === 'banner_style') {
          body.innerHTML = renderBranding();
          wireBranding(body);
        }
      });
    });
  }

  // ── Sala tab ──────────────────────────────────────────────────────────────
  function renderSala() {
    const s = _draft.sala;
    const hidden = new Set((s.hidden_product_ids || []).map(Number));
    const pinned = new Set((s.pinned_product_ids || []).map(Number));
    const positions = s.position_orders || {};
    const byCat = {};
    _allProducts.forEach(p => {
      const c = p.flokkur || 'Annað';
      (byCat[c] = byCat[c] || []).push(p);
    });
    const cats = Object.keys(byCat).sort((a,b) => a.localeCompare(b, 'is'));
    let listHtml = '';
    cats.forEach(c => {
      listHtml += `<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;padding:8px 8px 4px;background:#f8fafc;margin-top:4px">${esc(c)}</div>`;
      byCat[c].forEach(p => {
        const pos = positions[p.id] || '';
        listHtml += `
          <div class="su-prod-row" style="display:grid;grid-template-columns:48px 25px 25px 1fr 90px;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid #f1f5f9">
            <input type="text" inputmode="numeric" pattern="[0-9]*" data-prod-pos="${p.id}" value="${esc(pos)}" maxlength="3" placeholder="—" title="Röðun á Sala síðu (1 = efst)" style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:13px;text-align:center;font-weight:700;box-sizing:border-box">
            <input type="checkbox" data-prod-pin="${p.id}" ${pinned.has(p.id) ? 'checked' : ''} title="Pinna efst (auðveldara — yfirskrifar #)" style="width:16px;height:16px">
            <input type="checkbox" data-prod-hide="${p.id}" ${hidden.has(p.id) ? 'checked' : ''} title="Fela" style="width:16px;height:16px">
            <span class="su-prod-name" style="font-size:13px">${esc(p.nafn)}</span>
            <span class="su-prod-cat" style="text-align:right;font-size:12px;color:#64748b">${Math.round(p.verd_an_vsk * 1.24).toLocaleString('is-IS')} kr</span>
          </div>`;
      });
    });
    return `
      <div class="su-section-title">Röðun á Sala síðu</div>
      <div class="su-row">
        <label>Sortunarröð</label>
        <select data-sk="sort_order">
          <option value="alphabetical" ${s.sort_order==='alphabetical'?'selected':''}>Stafrófsröð</option>
          <option value="popular" ${s.sort_order==='popular'?'selected':''}>Vinsælast</option>
          <option value="custom" ${s.sort_order==='custom'?'selected':''}>Eigin röð (# + pinned + stafrófsröð)</option>
        </select>
        <div class="su-hint" style="grid-column:2/-1;margin-top:4px">Til að "# röð" virki skaltu velja <b>Eigin röð</b> hér að ofan.</div>
      </div>
      <div class="su-row">
        <label>Aukavörur (📂 Aðrar Vörur)</label>
        <label class="su-inline" style="font-size:13px;font-weight:400;color:#475569"><input type="checkbox" data-sk="show_aux_categories" ${s.show_aux_categories?'checked':''} style="margin-right:6px;width:auto"> Sýna í aðalrúðu (annars eingöngu í collapsed valmynd)</label>
      </div>
      <div class="su-section-title">Röðun, pinning og felun</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:8px">
        <b>#</b> = töluröðun (1 = efst, lágmark fyrst) &nbsp;·&nbsp;
        📌 = pinna (sett efst, yfirskrifar töluröðun) &nbsp;·&nbsp;
        🚫 = fela (engin sjáanleg)
      </div>
      <div class="su-prod-list">
        <div style="display:grid;grid-template-columns:48px 25px 25px 1fr 90px;gap:8px;padding:6px 8px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e2e8f0;background:#f8fafc">
          <div style="text-align:center">#</div>
          <div style="text-align:center">📌</div>
          <div style="text-align:center">🚫</div>
          <div>Vara</div>
          <div style="text-align:right">Verð m/VSK</div>
        </div>
        ${listHtml || '<div style="padding:20px;color:#94a3b8;text-align:center">Engar vörur fundust</div>'}
      </div>
    `;
  }
  function wireSala(body) {
    body.querySelectorAll('select[data-sk], input[data-sk]').forEach(el => {
      el.addEventListener('change', e => {
        const k = e.target.dataset.sk;
        _draft.sala[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      });
    });
    body.querySelectorAll('input[data-prod-pin]').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = +e.target.dataset.prodPin;
        const set = new Set((_draft.sala.pinned_product_ids || []).map(Number));
        if (e.target.checked) set.add(id); else set.delete(id);
        _draft.sala.pinned_product_ids = Array.from(set);
      });
    });
    body.querySelectorAll('input[data-prod-hide]').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = +e.target.dataset.prodHide;
        const set = new Set((_draft.sala.hidden_product_ids || []).map(Number));
        if (e.target.checked) set.add(id); else set.delete(id);
        _draft.sala.hidden_product_ids = Array.from(set);
      });
    });
    body.querySelectorAll('input[data-prod-pos]').forEach(inp => {
      inp.addEventListener('input', e => {
        // Strip non-digits to keep input clean (since type="text" allows anything)
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        if (cleaned !== e.target.value) e.target.value = cleaned;
        const id = +e.target.dataset.prodPos;
        if (!_draft.sala.position_orders) _draft.sala.position_orders = {};
        if (cleaned === '' || +cleaned <= 0) {
          // deepMerge FJARLÆGIR ALDREI lykil — `delete` hér var þögult
          // núll-verk og gamla staðsetningin kom aftur við endurhleðslu.
          // null = ósett (lesarinn í 87 gerir `positions[id] != null && > 0`).
          // Sama venja og 140/147.
          _draft.sala.position_orders[id] = null;
        } else {
          _draft.sala.position_orders[id] = +cleaned;
        }
      });
    });
  }

  // ── Shortcuts tab ─────────────────────────────────────────────────────────
  function renderShortcuts() {
    const list = _draft.shortcuts || [];
    let rows = '';
    for (let i = 0; i < 6; i++) {
      const it = list[i] || { icon: '', label: '', price: '' };
      rows += `
        <div class="su-shortcut-row" data-idx="${i}">
          <input type="text" placeholder="🔥" maxlength="3" data-sf="icon" value="${esc(it.icon||'')}">
          <input type="text" placeholder="Heiti þjónustu" data-sf="label" value="${esc(it.label||'')}">
          <input type="number" placeholder="Verð m/VSK" data-sf="price" value="${esc(it.price||'')}">
          <button class="su-cancel" type="button" data-sf-clear="${i}" style="padding:5px 10px">✕</button>
        </div>`;
    }
    return `
      <div class="su-section-title">Hraðtakkar á Sala síðu</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Allt að 6 hnappar fyrir algengustu þjónustur. Smelltu á hnappinn til að bæta þjónustu beint í körfu án að fletta.</div>
      ${rows}
    `;
  }
  function wireShortcuts(body) {
    body.querySelectorAll('.su-shortcut-row').forEach(row => {
      const idx = +row.dataset.idx;
      row.querySelectorAll('input[data-sf]').forEach(inp => {
        inp.addEventListener('input', e => {
          if (!_draft.shortcuts[idx]) _draft.shortcuts[idx] = {};
          const f = e.target.dataset.sf;
          _draft.shortcuts[idx][f] = f === 'price' ? +e.target.value : e.target.value;
        });
      });
      row.querySelector('button[data-sf-clear]').addEventListener('click', e => {
        _draft.shortcuts[idx] = { icon: '', label: '', price: 0 };
        row.querySelectorAll('input').forEach(i => i.value = '');
      });
    });
  }

  // ── Prentun tab ───────────────────────────────────────────────────────────
  function renderPrentun() {
    const p = _draft.prentun;
    return `
      <div class="su-section-title">Sjálfgefin prentval í greiðsluglugga</div>
      <div class="su-row"><label>📄 Kvittun</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-pk="default_print_kvittun" ${p.default_print_kvittun?'checked':''} style="margin-right:6px;width:auto"> Kveikt sjálfgefið</label></div>
      <div class="su-row"><label>🏷 Strikamerki</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-pk="default_print_strikamerki" ${p.default_print_strikamerki?'checked':''} style="margin-right:6px;width:auto"> Kveikt þegar tæki er í körfu</label></div>
      <div class="su-row"><label>🟢 QR áfylling</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-pk="default_print_qr_label" ${p.default_print_qr_label?'checked':''} style="margin-right:6px;width:auto"> Kveikt sjálfgefið</label></div>
      <div class="su-row"><label>🛠 Skrá tæki popup</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-pk="skip_unit_prompt" ${p.skip_unit_prompt?'checked':''} style="margin-right:6px;width:auto"> Sleppa "Skrá tæki fyrir verkbeiðni" glugganum</label></div>
      <div class="su-section-title">Brother QL stillingar</div>
      <div class="su-row">
        <label>Label stærð</label>
        <select data-pk="label_size">
          <option value="54x17" ${p.label_size==='54x17'?'selected':''}>DK-1204 (54 × 17 mm)</option>
          <option value="62x17" ${p.label_size==='62x17'?'selected':''}>62 × 17 mm</option>
          <option value="62x100" ${p.label_size==='62x100'?'selected':''}>DK-1202 (62 × 100 mm)</option>
          <option value="38x90" ${p.label_size==='38x90'?'selected':''}>DK-1208 (38 × 90 mm)</option>
        </select>
      </div>
      <div class="su-row">
        <label>DPI shift comp.</label>
        <div class="su-inline">
          <input type="number" data-pk="dpi_compensation" value="${esc(p.dpi_compensation || 0)}" min="0" max="5" style="width:80px">
          <span class="su-hint" style="margin-top:0">mm til að bæta upp 300×600 DPI shift (oftast 2)</span>
        </div>
      </div>
    `;
  }
  function wirePrentun(body) {
    body.querySelectorAll('input[data-pk], select[data-pk]').forEach(el => {
      el.addEventListener('change', e => {
        const k = e.target.dataset.pk;
        _draft.prentun[k] = e.target.type === 'checkbox' ? e.target.checked
                          : e.target.type === 'number' ? +e.target.value
                          : e.target.value;
      });
    });
  }

  // ── Almennt tab ───────────────────────────────────────────────────────────
  function renderAlmennt() {
    const a = _draft.almennt || {};
    return `
      <div class="su-section-title">VSK & verð</div>
      <div class="su-row"><label>Sjálfgefið VSK %</label><div class="su-inline"><input type="number" data-ak="default_vsk_pct" value="${esc(a.default_vsk_pct)}" min="0" max="100" style="width:80px"><span class="su-hint" style="margin-top:0">24% (matur 11%, undanþegið 0%)</span></div></div>
      <div class="su-row"><label>Gjaldmiðill</label><div class="su-inline"><input type="text" data-ak-text="currency" value="${esc(a.currency || 'kr')}" maxlength="6" style="width:80px"><span class="su-hint" style="margin-top:0">Birtingarmáti — t.d. "kr", "ISK", "$"</span></div></div>
      <div class="su-section-title">Reikningar</div>
      <div class="su-row"><label>Krafa fjöldi daga</label><div class="su-inline"><input type="number" data-ak="default_due_days" value="${esc(a.default_due_days)}" min="1" max="60" style="width:80px"><span class="su-hint" style="margin-top:0">Dagar fyrir krafa í heimabanka</span></div></div>
      <div class="su-row"><label>Default sókn (dagar)</label><div class="su-inline"><input type="number" data-ak="default_pickup_offset_days" value="${esc(a.default_pickup_offset_days)}" min="1" max="30" style="width:80px"><span class="su-hint" style="margin-top:0">Sjálfgefið milli móttöku og afhendingar í verkbeiðnum</span></div></div>
      <div class="su-section-title">Tímasnið</div>
      <div class="su-row">
        <label>Dagsformat</label>
        <select data-ak-text="date_format">
          <option value="dd.mm.yyyy" ${(a.date_format||'dd.mm.yyyy')==='dd.mm.yyyy'?'selected':''}>06.05.2026 (íslenskt)</option>
          <option value="yyyy-mm-dd" ${a.date_format==='yyyy-mm-dd'?'selected':''}>2026-05-06 (ISO)</option>
          <option value="dd/mm/yyyy" ${a.date_format==='dd/mm/yyyy'?'selected':''}>06/05/2026</option>
        </select>
      </div>
      <div class="su-row">
        <label>Tímaformat</label>
        <select data-ak-text="time_format">
          <option value="24h" ${(a.time_format||'24h')==='24h'?'selected':''}>14:35 (24-tíma)</option>
          <option value="12h" ${a.time_format==='12h'?'selected':''}>2:35 PM (12-tíma)</option>
        </select>
      </div>
    `;
  }
  function wireAlmennt(body) {
    body.querySelectorAll('input[data-ak]').forEach(inp => {
      inp.addEventListener('input', e => {
        _draft.almennt[e.target.dataset.ak] = +e.target.value || 0;
      });
    });
    body.querySelectorAll('input[data-ak-text]').forEach(inp => {
      inp.addEventListener('input', e => {
        _draft.almennt[e.target.dataset.akText] = e.target.value;
      });
    });
    body.querySelectorAll('select[data-ak-text]').forEach(sel => {
      sel.addEventListener('change', e => {
        _draft.almennt[e.target.dataset.akText] = e.target.value;
      });
    });
  }

  // ── Vörur tab — bulk product editor ───────────────────────────────────────
  function renderVorur() {
    if (!_allProducts.length) {
      return '<div style="padding:20px;color:#94a3b8;text-align:center">Engar vörur fundust í gagnagrunninum</div>';
    }
    const byCat = {};
    _allProducts.forEach(p => { (byCat[p.flokkur || 'Annað'] = byCat[p.flokkur || 'Annað'] || []).push(p); });
    const cats = Object.keys(byCat).sort((a, b) => a.localeCompare(b, 'is'));
    let html = '<div class="su-section-title">Bulk vörubreyting (' + _allProducts.length + ' vörur)</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:8px">Breyttu nafni, verði eða VSK% beint inni í kassanum. Smelltu 💾 á hverri línu til að vista breytingar á einum hlut, eða Vista hnappinn neðst til að vista allar breytingar.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px 60px 35px 35px;gap:6px;padding:5px 8px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0">' +
        '<div>Vara</div><div style="text-align:right">Verð án VSK</div><div style="text-align:right">VSK%</div><div style="text-align:center">Virk</div><div></div>' +
      '</div>';
    cats.forEach(c => {
      html += '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;padding:10px 8px 4px;background:#f8fafc;margin-top:6px">' + esc(c) + '</div>';
      byCat[c].forEach(p => {
        html += '<div class="_su-prod-row" data-id="' + p.id + '" style="display:grid;grid-template-columns:1fr 80px 60px 35px 35px;gap:6px;padding:6px 8px;border-bottom:1px solid #f1f5f9;align-items:center">' +
          '<input type="text"   data-pf="nafn"         value="' + esc(p.nafn || '') + '" style="padding:6px 9px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px">' +
          '<input type="number" data-pf="verd_an_vsk"  value="' + (+p.verd_an_vsk || 0) + '" style="padding:6px 9px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right">' +
          '<input type="number" data-pf="vsk_prosenta" value="' + (+p.vsk_prosenta || 24) + '" min="0" max="100" style="padding:6px 9px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right">' +
          '<label style="display:flex;justify-content:center;align-items:center;cursor:pointer"><input type="checkbox" data-pf="virkt" ' + (p.virkt !== false ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer"></label>' +
          '<button type="button" data-pf-save="' + p.id + '" title="Vista þessa línu" style="padding:5px 7px;background:#2563eb;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:14px">💾</button>' +
        '</div>';
      });
    });
    html += '<div class="su-section-title" style="margin-top:18px">Bulk verðbreyting</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:8px">Hækka eða lækka öll verð um sömu prósentu. Skrifa neikvæða tölu til að lækka. Vistar STRAX í Supabase.</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="number" id="_su-bulk-pct" placeholder="t.d. 5 (= +5%)" style="width:130px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px">' +
        '<button type="button" id="_su-bulk-apply" style="padding:7px 14px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Beita á öll verð</button>' +
        '<span id="_su-bulk-status" style="font-size:11px;color:#64748b"></span>' +
      '</div>';
    return html;
  }
  function wireVorur(body) {
    body.querySelectorAll('button[data-pf-save]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = +btn.getAttribute('data-pf-save');
        const row = body.querySelector('._su-prod-row[data-id="' + id + '"]');
        if (!row) return;
        const payload = {
          nafn:         row.querySelector('input[data-pf="nafn"]').value,
          verd_an_vsk:  +row.querySelector('input[data-pf="verd_an_vsk"]').value || 0,
          vsk_prosenta: +row.querySelector('input[data-pf="vsk_prosenta"]').value || 24,
          virkt:        row.querySelector('input[data-pf="virkt"]').checked
        };
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = '…';
        try {
          const r = await window.DB.sb.from('vorur').update(payload).eq('id', id);
          btn.textContent = r.error ? '✗' : '✓';
          btn.style.background = r.error ? '#dc2626' : '#16a34a';
          if (!r.error) {
            // update local cache
            const p = _allProducts.find(x => x.id === id);
            if (p) Object.assign(p, payload);
          }
          setTimeout(() => { btn.textContent = orig; btn.style.background = '#2563eb'; btn.disabled = false; }, 1200);
        } catch (e) {
          btn.textContent = '✗'; btn.style.background = '#dc2626';
          setTimeout(() => { btn.textContent = orig; btn.style.background = '#2563eb'; btn.disabled = false; }, 1500);
        }
      });
    });
    const bulkBtn = body.querySelector('#_su-bulk-apply');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', async () => {
        const pctInput = body.querySelector('#_su-bulk-pct');
        const status = body.querySelector('#_su-bulk-status');
        const pct = parseFloat(pctInput.value);
        if (!Number.isFinite(pct) || pct === 0) { status.textContent = 'Sláðu inn prósentu'; return; }
        if (!await Confirm.show('Þetta breytir öllum ' + _allProducts.length + ' vöruverðum um ' + pct + '%. Halda áfram?')) return;
        bulkBtn.disabled = true; status.textContent = 'Vinn…';
        const factor = 1 + pct / 100;
        let done = 0, errs = 0;
        for (const p of _allProducts) {
          const newPrice = Math.round((+p.verd_an_vsk || 0) * factor);
          try {
            const r = await window.DB.sb.from('vorur').update({ verd_an_vsk: newPrice }).eq('id', p.id);
            if (r.error) errs++; else { p.verd_an_vsk = newPrice; done++; }
          } catch (e) { errs++; }
        }
        status.textContent = '✓ ' + done + ' vörur uppfærðar' + (errs ? ' · ' + errs + ' villur' : '');
        bulkBtn.disabled = false;
        // Refresh the displayed prices
        body.querySelectorAll('._su-prod-row').forEach(row => {
          const id = +row.getAttribute('data-id');
          const p = _allProducts.find(x => x.id === id);
          if (p) row.querySelector('input[data-pf="verd_an_vsk"]').value = p.verd_an_vsk;
        });
      });
    }
  }

  // ── Starfsmenn tab ────────────────────────────────────────────────────────
  function renderStarfsmenn() {
    const list = Array.isArray(_draft.starfsmenn) ? _draft.starfsmenn : [];
    let rows = '';
    for (let i = 0; i < Math.max(8, list.length + 2); i++) {
      const it = list[i] || { name: '', initials: '', color: '' };
      rows += '<div class="_su-staff-row" data-idx="' + i + '" style="display:grid;grid-template-columns:1fr 80px 60px 35px;gap:6px;padding:5px 0;align-items:center">' +
        '<input type="text" data-sk="name"     placeholder="Nafn (t.d. Haukur Valdimarsson)" value="' + esc(it.name||'') + '" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:13px">' +
        '<input type="text" data-sk="initials" placeholder="HV" maxlength="3" value="' + esc(it.initials||'') + '" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:13px;text-align:center">' +
        '<input type="color" data-sk="color"   value="' + esc(it.color || '#64748b') + '" style="width:100%;height:32px;padding:2px;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer">' +
        '<button type="button" data-sk-clear="' + i + '" style="padding:5px 7px;background:#fff;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer;color:#64748b">✕</button>' +
      '</div>';
    }
    return '<div class="su-section-title">Starfsmenn</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:10px">Þeir sem birtast sem "Starfsmaður" á kvittunum og verkbeiðnum. Ef listi er tómur er notað "Kassi" sem fallback.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px 60px 35px;gap:6px;padding:0 0 5px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0">' +
        '<div>Nafn</div><div style="text-align:center">Skammst.</div><div style="text-align:center">Litur</div><div></div>' +
      '</div>' +
      rows;
  }
  function wireStarfsmenn(body) {
    if (!Array.isArray(_draft.starfsmenn)) _draft.starfsmenn = [];
    body.querySelectorAll('._su-staff-row').forEach(row => {
      const idx = +row.dataset.idx;
      row.querySelectorAll('input[data-sk]').forEach(inp => {
        inp.addEventListener('input', e => {
          if (!_draft.starfsmenn[idx]) _draft.starfsmenn[idx] = {};
          _draft.starfsmenn[idx][e.target.dataset.sk] = e.target.value;
        });
      });
      row.querySelector('button[data-sk-clear]').addEventListener('click', () => {
        _draft.starfsmenn[idx] = { name: '', initials: '', color: '' };
        row.querySelectorAll('input').forEach(i => { if (i.type === 'color') i.value = '#64748b'; else i.value = ''; });
      });
    });
  }

  // ── Útlit tab ─────────────────────────────────────────────────────────────
  // Hard-coded fallback labels for known views — used when reading the sidebar
  // doesn't give a clean label. Other views get auto-discovered from the DOM.
  const VIEW_LABELS = {
    'sala':             'Sala',
    'counter':          'Verkbeiðnir',
    'workshop':         'Verkstæði',
    'field':            'Á ferðinni',
    'income':           'Tekjur',
    'yfirlit':          'Yfirlit',
    'companies':        'Viðskiptavinir',
    'vidskiptavinir':   'Einstaklingar',
    'vorur':            'Vörur og þjónusta',
    'bokhalds-yfirlit': 'Bókhalds yfirlit',
    'soluyfirlit':      'Söluyfirlit',
    'tilbod':           'Tilboð',
    'samningar':        'Samningar',
    'utgjaldalog':      'Útgjöld',
    'pantanir':         'Pantanir',
    'akstur':           'Akstur',
    'timabok':          'Tímabók',
    'lanstaeki':        'Lánstæki',
    'birgdir':          'Birgðir',
    'geymsla':          'Geymsla',
    'dagskratm':        'Dagskrá',
    'verkdagbok':       'Verkdagbók',
    'aging-report':     'Aldursgreining',
    'customer-ledger':  'Skuldastaða',
    'insp-forecast':    'Skoðunarspá',
    'inspform':         'Skoðun-form',
    'vsk-report':       'VSK skýrsla',
    'calendar':         'Dagatal',
    'route-optimizer':  'Leiðabesta',
    'settings':         'Stillingar'
  };
  function getNavViews() {
    // Read every nav button currently in the sidebar (including buttons added
    // by later-loaded patches), de-duplicated by view id. Order in DOM kept.
    const seen = new Map();
    document.querySelectorAll('.vnav-btn[data-view]').forEach(btn => {
      const id = btn.getAttribute('data-view');
      if (!id || seen.has(id)) return;
      // Use our nice label first, then the button's own text/aria-label
      const text = (btn.textContent || '').trim().replace(/\s+/g, ' ');
      seen.set(id, { id, label: VIEW_LABELS[id] || (text || id) });
    });
    // If sidebar isn't built yet, fall back to all known labels
    if (!seen.size) {
      Object.keys(VIEW_LABELS).forEach(id => seen.set(id, { id, label: VIEW_LABELS[id] }));
    }
    return Array.from(seen.values());
  }
  function renderUtlit() {
    if (!_draft.utlit) _draft.utlit = { hidden_nav_views: [], sidebar_default_collapsed: false, compact_mode: false };
    const u = _draft.utlit;
    const hidden = new Set(u.hidden_nav_views || []);
    const startView = (_draft.almennt && _draft.almennt.starting_view) || 'sala';
    const navViews = getNavViews();
    let viewOpts = '';
    navViews.forEach(v => {
      viewOpts += '<option value="' + esc(v.id) + '"' + (startView === v.id ? ' selected' : '') + '>' + esc(v.label) + '</option>';
    });
    let listHtml = '';
    navViews.forEach(v => {
      listHtml += '<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:5px;cursor:pointer">' +
        '<input type="checkbox" data-uk-nav="' + esc(v.id) + '" ' + (hidden.has(v.id) ? '' : 'checked') + ' style="width:16px;height:16px">' +
        '<span style="font-size:13px">' + esc(v.label) + '</span>' +
      '</label>';
    });
    return '<div class="su-section-title">Sjálfgefin upphafssíða</div>' +
      '<div class="su-row"><label>Síða þegar app opnast</label><select data-uk-start>' + viewOpts + '</select></div>' +
      '<div class="su-section-title">Hvaða nav-takkar birtast í sidebar</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:8px">Takmarka sidebar-hnappana sem birtast. Hakaðu af þá sem þú vilt sjá. Hakaðu úr þeim sem þú notar ekki.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:2px">' + listHtml + '</div>' +
      '<div class="su-section-title">Þéttleiki</div>' +
      '<div class="su-row"><label>Þéttur ham</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-uk="compact_mode" ' + (u.compact_mode?'checked':'') + ' style="margin-right:6px;width:auto"> Minni padding og letur (passar á smærri skjái)</label></div>' +
      '<div class="su-row"><label>Sidebar samanbrotinn</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-uk="sidebar_default_collapsed" ' + (u.sidebar_default_collapsed?'checked':'') + ' style="margin-right:6px;width:auto"> Sjálfgefið samanbrotinn (eingöngu icons)</label></div>';
  }
  function wireUtlit(body) {
    body.querySelector('select[data-uk-start]').addEventListener('change', e => {
      if (!_draft.almennt) _draft.almennt = {};
      _draft.almennt.starting_view = e.target.value;
    });
    body.querySelectorAll('input[data-uk-nav]').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = e.target.getAttribute('data-uk-nav');
        const set = new Set(_draft.utlit.hidden_nav_views || []);
        // Checked = visible (not hidden); unchecked = hide
        if (e.target.checked) set.delete(id); else set.add(id);
        _draft.utlit.hidden_nav_views = Array.from(set);
      });
    });
    body.querySelectorAll('input[data-uk]').forEach(cb => {
      cb.addEventListener('change', e => {
        _draft.utlit[e.target.dataset.uk] = e.target.checked;
      });
    });
  }

  // ── Kvittun tab ───────────────────────────────────────────────────────────
  function renderKvittun() {
    if (!_draft.kvittun) _draft.kvittun = { footer_text: '', reikningur_message: '', show_logo: true, show_qr_for_pay: false };
    const k = _draft.kvittun;
    return '<div class="su-section-title">Texti á kvittun</div>' +
      '<div class="su-row"><label>Fótsetning</label><div><textarea data-kk="footer_text" rows="2" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">' + esc(k.footer_text || '') + '</textarea><div class="su-hint">Lína neðst á öllum kvittunum (t.d. "Takk fyrir viðskiptin!")</div></div></div>' +
      '<div class="su-row"><label>Reikningur skilaboð</label><div><textarea data-kk="reikningur_message" rows="3" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">' + esc(k.reikningur_message || '') + '</textarea><div class="su-hint">Birtist eingöngu á reikningum (Setja í reikning og Greitt síðar) — t.d. greiðsluskilmálar.</div></div></div>' +
      '<div class="su-section-title">Útlit kvittunar</div>' +
      '<div class="su-row"><label>Logo</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-kk="show_logo" ' + (k.show_logo?'checked':'') + ' style="margin-right:6px;width:auto"> Birta logo efst í kvittun</label></div>';
  }
  function wireKvittun(body) {
    body.querySelectorAll('textarea[data-kk]').forEach(t => {
      t.addEventListener('input', e => { _draft.kvittun[e.target.dataset.kk] = e.target.value; });
    });
    body.querySelectorAll('input[data-kk]').forEach(cb => {
      cb.addEventListener('change', e => { _draft.kvittun[e.target.dataset.kk] = e.target.checked; });
    });
  }

  // ── Tilkynningar tab ──────────────────────────────────────────────────────
  function renderTilkynningar() {
    if (!_draft.tilkynningar) _draft.tilkynningar = {};
    const t = _draft.tilkynningar;
    return '<div class="su-section-title">Reikningar</div>' +
      '<div class="su-row"><label>Ógreitt eftir X daga</label><div class="su-inline"><input type="number" data-tk="ogreitt_after_days" value="' + esc(t.ogreitt_after_days || 14) + '" min="0" max="180" style="width:80px"><span class="su-hint" style="margin-top:0">Tilkynna þegar reikningur hefur verið ógreiddur svo lengi</span></div></div>' +
      '<div class="su-section-title">Tæki & skoðanir</div>' +
      '<div class="su-row"><label>Vara um næstu skoðun</label><div class="su-inline"><input type="number" data-tk="taeki_skodun_days_warn" value="' + esc(t.taeki_skodun_days_warn || 30) + '" min="0" max="180" style="width:80px"><span class="su-hint" style="margin-top:0">Dagar fyrir næstu skoðun til að birta varúð</span></div></div>' +
      '<div class="su-row"><label>Útrunnið strax</label><div class="su-inline"><input type="number" data-tk="taeki_skodun_days_overdue" value="' + esc(t.taeki_skodun_days_overdue || 0) + '" min="0" max="60" style="width:80px"><span class="su-hint" style="margin-top:0">Dagar eftir skoðunardag áður en það verður rautt</span></div></div>' +
      '<div class="su-section-title">Almennt</div>' +
      '<div class="su-row"><label>Sala-spjald lokið</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-tk="sala_card_lokid_warn" ' + (t.sala_card_lokid_warn?'checked':'') + ' style="margin-right:6px;width:auto"> Sýna staðfestingu þegar sölu er lokið</label></div>' +
      '<div class="su-row"><label>Hljóð</label><label class="su-inline" style="font-weight:400;font-size:13px;color:#475569"><input type="checkbox" data-tk="enable_sounds" ' + (t.enable_sounds?'checked':'') + ' style="margin-right:6px;width:auto"> Spila hljóð á tilkynningum</label></div>';
  }
  function wireTilkynningar(body) {
    body.querySelectorAll('input[data-tk]').forEach(inp => {
      inp.addEventListener('input', e => {
        const k = e.target.dataset.tk;
        _draft.tilkynningar[k] = e.target.type === 'checkbox' ? e.target.checked : (+e.target.value || 0);
      });
      inp.addEventListener('change', e => {
        const k = e.target.dataset.tk;
        _draft.tilkynningar[k] = e.target.type === 'checkbox' ? e.target.checked : (+e.target.value || 0);
      });
    });
  }

  // ── Email tab ─────────────────────────────────────────────────────────────
  function renderEmail() {
    if (!_draft.email) _draft.email = {};
    const m = _draft.email;
    const ta = (lbl, key, hint, rows) => `
      <div class="su-row" style="grid-template-columns:160px 1fr;align-items:start">
        <label style="padding-top:8px">${esc(lbl)}</label>
        <div>
          <textarea data-mk="${key}" rows="${rows||4}" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical;font-family:Consolas,Menlo,monospace">${esc(m[key]||'')}</textarea>
          ${hint ? `<div class="su-hint">${esc(hint)}</div>` : ''}
        </div>
      </div>`;
    const f = (lbl, key, type, hint) => `
      <div class="su-row">
        <label>${esc(lbl)}</label>
        <div>
          <input type="${type||'text'}" data-mk="${key}" value="${esc(m[key]||'')}">
          ${hint ? `<div class="su-hint">${esc(hint)}</div>` : ''}
        </div>
      </div>`;
    return '<div class="su-section-title">Sendandi</div>' +
      f('Frá nafn', 'from_name', 'text', 'Birtist sem sendandi í tölvupósti') +
      f('Frá netfang', 'from_email', 'email', 'Verður að vera staðfest hjá Resend') +
      f('Svar-til netfang', 'reply_to', 'email', 'Tómt = sama og Frá netfang') +
      '<div class="su-section-title">Reikningur — fyrsta sending</div>' +
      f('Yrkisefni', 'reikningur_subject', 'text', 'Tags: {invoiceNum}, {customerName}, {amount}, {companyName}') +
      ta('Texti', 'reikningur_body', 'Tags: {invoiceNum}, {customerName}, {amount}, {companyName}', 6) +
      '<div class="su-section-title">Áminning — endurtekin sending</div>' +
      f('Yrkisefni', 'reminder_subject', 'text', 'Sömu tags og að ofan') +
      ta('Texti', 'reminder_body', 'Sömu tags og að ofan', 6) +
      '<div class="su-section-title">Almennt</div>' +
      ta('Undirskrift', 'signature', 'Bætt aftast við hvern tölvupóst', 2);
  }
  function wireEmail(body) {
    body.querySelectorAll('input[data-mk], textarea[data-mk]').forEach(el => {
      el.addEventListener('input', e => {
        _draft.email[e.target.dataset.mk] = e.target.value;
      });
    });
  }

  // ── Tenglar tab ───────────────────────────────────────────────────────────
  function renderTenglar() {
    if (!_draft.tenglar) _draft.tenglar = { google_sheet_url: '', google_drive_url: '', custom_links: [] };
    const t = _draft.tenglar;
    const cust = Array.isArray(t.custom_links) ? t.custom_links : [];
    let custRows = '';
    for (let i = 0; i < Math.max(4, cust.length + 2); i++) {
      const it = cust[i] || { icon: '', label: '', url: '' };
      custRows += '<div class="_su-link-row" data-idx="' + i + '" style="display:grid;grid-template-columns:50px 1fr 2fr 35px;gap:6px;margin-bottom:6px;align-items:center">' +
        '<input type="text" data-tk="icon"  placeholder="🔗"        maxlength="3" value="' + esc(it.icon||'') + '" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:13px;text-align:center">' +
        '<input type="text" data-tk="label" placeholder="Heiti"               value="' + esc(it.label||'') + '" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:13px">' +
        '<input type="url"  data-tk="url"   placeholder="https://…"           value="' + esc(it.url||'') + '"   style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:13px">' +
        '<button type="button" data-tk-clear="' + i + '" style="padding:5px 7px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;color:#64748b">✕</button>' +
      '</div>';
    }
    return '<div class="su-section-title">Föst tengill (sýndir í sidebar)</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:10px">Þessar slóðir vistast í Supabase og virka á öllum tækjum — detta ekki út við cache-hreinsun.</div>' +
      '<div class="su-row">' +
        '<label>📊 Google Sheet</label>' +
        '<div>' +
          '<input type="url" data-tk-fixed="google_sheet_url" placeholder="https://docs.google.com/spreadsheets/d/…" value="' + esc(t.google_sheet_url || '') + '">' +
          '<div class="su-hint">Slóð á aðal-Google-Sheet þitt — opnast frá sidebar takkanum</div>' +
        '</div>' +
      '</div>' +
      '<div class="su-row">' +
        '<label>☁️ Google Drive</label>' +
        '<div>' +
          '<input type="url" data-tk-fixed="google_drive_url" placeholder="https://drive.google.com/drive/folders/…" value="' + esc(t.google_drive_url || '') + '">' +
          '<div class="su-hint">Slóð á aðal-Drive-möppu þitt</div>' +
        '</div>' +
      '</div>' +
      '<div class="su-section-title">Eigin tengill (allt að 4)</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:8px">Bæta við hvaða slóð sem er — t.d. inn-net, Þjóðskrá, Skatturinn, Brother iPrint vefviðmótið…</div>' +
      '<div style="display:grid;grid-template-columns:50px 1fr 2fr 35px;gap:6px;padding:0 0 5px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0">' +
        '<div style="text-align:center">Tákn</div><div>Heiti</div><div>Slóð</div><div></div>' +
      '</div>' +
      custRows;
  }
  function wireTenglar(body) {
    if (!_draft.tenglar) _draft.tenglar = { google_sheet_url: '', google_drive_url: '', custom_links: [] };
    body.querySelectorAll('input[data-tk-fixed]').forEach(inp => {
      inp.addEventListener('input', e => {
        _draft.tenglar[e.target.dataset.tkFixed] = e.target.value;
      });
    });
    body.querySelectorAll('._su-link-row').forEach(row => {
      const idx = +row.dataset.idx;
      row.querySelectorAll('input[data-tk]').forEach(inp => {
        inp.addEventListener('input', e => {
          if (!_draft.tenglar.custom_links[idx]) _draft.tenglar.custom_links[idx] = {};
          _draft.tenglar.custom_links[idx][e.target.dataset.tk] = e.target.value;
        });
      });
      row.querySelector('button[data-tk-clear]').addEventListener('click', () => {
        _draft.tenglar.custom_links[idx] = { icon: '', label: '', url: '' };
        row.querySelectorAll('input').forEach(i => i.value = '');
      });
    });
  }

  // ── Backup tab ────────────────────────────────────────────────────────────
  function renderBackup() {
    if (!_draft.backup) _draft.backup = {};
    const b = _draft.backup;
    return '<div class="su-section-title">Útflutningur</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:10px">Sækja afrit af öllum stillingum og völdum töflum úr gagnagrunni sem JSON skrá. Hægt að flytja inn aftur ef einhverju klúðrast.</div>' +
      '<div class="su-row"><label>Sækja stillingar</label><div><button type="button" id="_su-export-settings" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:13px">⬇ Sækja settings.json</button><div class="su-hint">Inniheldur allar Admin-stillingar</div></div></div>' +
      '<div class="su-row"><label>Sækja vörulisti</label><div><button type="button" id="_su-export-vorur" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:13px">⬇ Sækja vorur.json</button><div class="su-hint">Allar vörur í gagnagrunni</div></div></div>' +
      '<div class="su-row"><label>Sækja viðskiptavinir</label><div><button type="button" id="_su-export-fyrirtaeki" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:13px">⬇ Sækja fyrirtaeki.json</button><div class="su-hint">Allir viðskiptavinir</div></div></div>' +
      '<div class="su-row"><label>Sækja sölu-yfirlit</label><div><button type="button" id="_su-export-solur" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:13px">⬇ Sækja solur.json</button><div class="su-hint">Allar sölur (solur tafla)</div></div></div>' +
      '<div class="su-section-title">Innflutningur</div>' +
      '<div class="su-row"><label>Stillingar úr skrá</label><div><input type="file" id="_su-import-settings" accept=".json" style="font:inherit;font-size:13px"><div class="su-hint">Hleður settings.json til baka — yfirskrifar núverandi stillingar</div></div></div>' +
      '<div class="su-section-title">Síðasta afrit</div>' +
      '<div class="su-row"><label>Tími</label><div style="font-size:13px;color:#475569">' + (b.last_export_at ? new Date(b.last_export_at).toLocaleString('is-IS') : 'Aldrei') + '</div></div>';
  }
  function wireBackup(body) {
    function dl(name, payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    body.querySelector('#_su-export-settings').addEventListener('click', async () => {
      const data = (window.AppSettings && window.AppSettings.get()) || {};
      dl('settings-' + new Date().toISOString().slice(0,10) + '.json', data);
      _draft.backup = _draft.backup || {};
      _draft.backup.last_export_at = new Date().toISOString();
    });
    async function exportTable(table, fname) {
      if (!window.DB || !window.DB.sb) { alert('Engin DB tenging'); return; }
      const r = await window.DB.sb.from(table).select('*');
      if (r.error) { alert('Villa: ' + r.error.message); return; }
      dl(fname + '-' + new Date().toISOString().slice(0,10) + '.json', { table: table, exported_at: new Date().toISOString(), rows: r.data || [] });
    }
    body.querySelector('#_su-export-vorur').addEventListener('click', () => exportTable('vorur', 'vorur'));
    body.querySelector('#_su-export-fyrirtaeki').addEventListener('click', () => exportTable('fyrirtaeki', 'fyrirtaeki'));
    body.querySelector('#_su-export-solur').addEventListener('click', () => exportTable('solur', 'solur'));
    body.querySelector('#_su-import-settings').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      try {
        const txt = await file.text();
        const data = JSON.parse(txt);
        if (!await Confirm.show('Yfirskrifa allar stillingar úr ' + file.name + '?')) return;
        const ok = await window.AppSettings.save(data);
        alert(ok ? '✓ Stillingar fluttar inn' : '✗ Tókst ekki að vista');
      } catch (err) {
        alert('Ógild JSON skrá: ' + err.message);
      }
      e.target.value = '';
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    const m = document.getElementById('su-modal');
    if (!m) return;
    const btn = m.querySelector('.su-save');
    btn.disabled = true; btn.textContent = 'Vista…';
    // Senda AÐEINS þá kafla sem notandinn breytti í raun — sjá SU_SECTIONS.
    const patch = {};
    SU_SECTIONS.forEach(k => {
      const now = JSON.stringify(_draft[k] === undefined ? null : _draft[k]);
      if (now !== _orig[k]) patch[k] = _draft[k];
    });
    const ok = Object.keys(patch).length ? await window.AppSettings.save(patch) : true;
    btn.disabled = false; btn.textContent = '💾 Vista';
    const t = document.getElementById('su-toast');
    if (t) {
      t.textContent = ok ? '✓ Stillingar vistaðar' : '⚠ Tókst ekki að vista — keyrðu app_settings.sql í Supabase fyrst';
      t.style.background = ok ? '#16a34a' : '#dc2626';
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), ok ? 1800 : 4500);
    }
    if (ok) setTimeout(close, 700);
  }

  // ── Add nav button ────────────────────────────────────────────────────────
  function addNavButton() {
    // 2026-05-08: Don't add a duplicate button. The original Stillingar
    // nav-button (data-view="settings") is in index.html — hook it to open
    // OUR settings modal instead of the legacy "settings" view.
    const existing = document.querySelector('.vnav-btn[data-view="settings"]');
    if (existing && !existing.dataset._suHooked) {
      existing.dataset._suHooked = '1';
      existing.removeAttribute('onclick'); // strip the legacy switchView call
      existing.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        open();
      }, true); // capture to beat any other handlers
    }
    // Fallback: if for some reason the existing button is missing, add ours.
    if (!existing && !document.getElementById('_su_nav')) {
      const nav = document.querySelector('nav.view-nav');
      if (!nav) return;
      const btn = document.createElement('button');
      btn.id = '_su_nav';
      btn.className = 'vnav-btn';
      btn.type = 'button';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span>Stillingar</span>';
      btn.style.cssText = 'display:flex;align-items:center;gap:8px';
      btn.addEventListener('click', open);
      nav.appendChild(btn);
    }
  }

  // Slóðin á að duga ein og sér: #settings (eða #settings/email) opnar síðuna
  // beint — bókamerki, hlekkur í spjalli eða endurhlaðin síða lenda á réttum
  // stað í stað þess að þurfa að finna hnappinn í 57 hnappa hliðarstiku.
  function opnaAfSlod(fráRæsingu) {
    const slod = fráRæsingu ? _slodVidRaesingu : (location.hash || '');
    if (!/^#settings(\/|$)/i.test(slod)) return;
    if (document.getElementById('su-modal')) return;
    if (!window.AppSettings || !AppSettings.isLoaded || !AppSettings.isLoaded()) { setTimeout(() => opnaAfSlod(fráRæsingu), 600); return; }
    open();
  }
  window.addEventListener('hashchange', opnaAfSlod);

  function init() {
    setTimeout(() => opnaAfSlod(true), 900);
    // Clean up any leftover duplicate from earlier versions of this patch
    // that injected its own nav button alongside the index.html one.
    const dup = document.getElementById('_su_nav');
    const orig = document.querySelector('.vnav-btn[data-view="settings"]');
    if (dup && orig) dup.remove();
    addNavButton();
    new MutationObserver(() => {
      // Continuously remove duplicate if it sneaks back in
      const dup2 = document.getElementById('_su_nav');
      const orig2 = document.querySelector('.vnav-btn[data-view="settings"]');
      if (dup2 && orig2) dup2.remove();
      addNavButton();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SettingsUI = { open, close, registerSection, sections: allarSectionir, version: 'v2-fullpage' };
  console.log('[settings-ui] installed');
})();
/* === END SETTINGS UI v1 === */
