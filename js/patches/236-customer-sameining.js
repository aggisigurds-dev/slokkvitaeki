/* === SAMEINING — customer-DB sameiningar-tól v1 (236) ======================
 *
 * Verkfæri til að ljúka *grunnskrá* (`customers_base`) sameiningu sem byrjaði
 * 2026-06-04. Þrjú meginvandamál sem þetta tækir á:
 *
 *  1. ~325 raðir í `fyrirtaeki` með `customer_base_id IS NULL`
 *  2. ~23 raðir í `vidskiptavinir` með `customer_base_id IS NULL`
 *  3. ~93 raðir í `solur` með gamla `customer_id` FK í `fyrirtaeki` en án
 *     `customer_base_id` — verður auto-lagað um leið og foreldrið er tengt.
 *
 * Hugmynd:
 *   - Sækja alla *ótengdu* + alla `customers_base` í einu höggi.
 *   - Fyrir hverja ótengda röð, mæla TILLÖGU að base-pari:
 *       🟢 high   = nákvæmt kt-match (digits-only)
 *       🟡 med    = nákvæmt nafn-match (case-fold)
 *       🟠 low    = fuzzy nafn (Levenshtein ≤ 2 OG lengd ≥ 4)
 *       🔴 none   = enginn match → þú stofnar nýja base
 *   - Per-röð: 🔗 Tengja (uppfærir customer_base_id) · 🆕 Ný base · 🗑 Eyða
 *   - „🚀 Tengja allt augljóst" sópar high+med í einum batch eftir staðfestingu.
 *
 * NB Útitæki-númerin eru placeholder per Agnar — ekki vandi þótt þau riðlist.
 *
 * Víravirkjun eins og 232: nýr view-sameining div, knappur klónaður neðst
 * í hliðarstikuna, App.switchView gripinn fyrir 'sameining', patch 218 ALIAS
 * lengt í gegnum window.__sameiningAlias svo deep-link #sameining virki.
 * ========================================================================== */
(() => {
  if (window.__sameiningInstalled) return;
  window.__sameiningInstalled = true;

  const VIEW_ID = 'view-sameining';
  const NAV_KEY = 'sameining';

  // ── helpers (mirror Bakendi 232 style) ────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || window.__vdaSB || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString('is-IS'); }
  function ktDigits(s) { return String(s || '').replace(/\D/g, ''); }
  function nameKey(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/\s+/g, ' ').trim();
  }
  function levenshtein(a, b) {
    a = a || ''; b = b || '';
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
    return dp[a.length][b.length];
  }

  const state = {
    tab: 'fyrirtaeki',
    loading: false, loaded: false, err: null,
    bases: [],              // [{id, kennitala, nafn}]
    fyrirtaeki: [],         // [{id, nafn, kennitala, customer_base_id}]
    vidskiptavinir: [],     // [{id, nafn, kennitala, customer_base_id}]
    solur: [],              // [{id, customer_id, customer_nafn, customer_kt, customer_base_id}]
    busy: false,
    filterConf: 'all',
    q: '',
  };

  const TABS = [
    { k: 'fyrirtaeki',     label: '🏢 Fyrirtæki' },
    { k: 'vidskiptavinir', label: '👤 Viðskiptavinir' },
    { k: 'solur',          label: '💳 Sölur' },
  ];

  // ── data load ─────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) { state.err = 'Enginn gagnagrunnur tengdur (DB.sb vantar).'; state.loaded = true; render(); return; }
    state.loading = true; state.err = null; render();
    try {
      const [bs, fy, vi, so] = await Promise.all([
        SB.from('customers_base').select('id,kennitala,nafn').limit(5000),
        SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,customer_base_id,deleted_at').is('customer_base_id', null).is('deleted_at', null).limit(2000),
        SB.from('vidskiptavinir').select('id,nafn,kennitala,customer_base_id').is('customer_base_id', null).limit(2000),
        SB.from('solur').select('id,num,customer_id,customer_nafn,customer_kt,customer_base_id,created_at').is('customer_base_id', null).order('created_at', { ascending: false }).limit(500),
      ]);
      if (bs.error) throw bs.error;
      state.bases = bs.data || [];
      state.fyrirtaeki = fy.data || [];
      state.vidskiptavinir = vi.data || [];
      state.solur = so.data || [];

      // Index bases for fast lookup
      _idxByKt = new Map();
      _idxByName = new Map();
      for (const b of state.bases) {
        const k = ktDigits(b.kennitala);
        if (k.length >= 6) _idxByKt.set(k, b);
        const n = nameKey(b.nafn);
        if (n) {
          if (!_idxByName.has(n)) _idxByName.set(n, []);
          _idxByName.get(n).push(b);
        }
      }
    } catch (e) {
      state.err = (e && e.message) || String(e);
    }
    state.loading = false; state.loaded = true; render();
  }

  let _idxByKt = new Map();
  let _idxByName = new Map();

  // Walk-in canonical kt — anonymous POS customers go to ONE base row.
  // Kennitala-format í gagnagrunni: "999999-9999" (með striki). Matching gerum
  // við á digits-only formi (ktDigits strippar non-digits) svo sniðlausu raðir
  // matcha líka.
  const WALKIN_KT_FORMATTED = '999999-9999';
  const WALKIN_KT_DIGITS = '9999999999';
  function isWalkin(row) {
    const kt = ktDigits(row.kennitala || row.customer_kt);
    if (kt === WALKIN_KT_DIGITS) return true;
    // No kt at all + has a name → almost certainly walk-in (per Agnar 2026-06-29)
    if (!kt && (row.nafn || row.customer_nafn)) return true;
    return false;
  }
  function getOrPlanWalkinBase() {
    // returns existing customers_base row with kt 9999999999, or null (then we create on demand)
    return _idxByKt.get(WALKIN_KT_DIGITS) || null;
  }

  // ── suggestion engine ────────────────────────────────────────────────────
  function suggest(row) {
    // Returns {base|null, conf:'high'|'med'|'low'|'none', why}
    // Walk-ins go to the canonical anonymous base
    if (isWalkin(row)) {
      const wb = getOrPlanWalkinBase();
      if (wb) return { base: wb, conf: 'high', why: '🚶 walk-in' };
      return { base: null, conf: 'med', why: '🚶 walk-in (stofna 999999-9999)' };
    }
    const kt = ktDigits(row.kennitala || row.customer_kt);
    if (kt.length >= 6 && _idxByKt.has(kt)) {
      return { base: _idxByKt.get(kt), conf: 'high', why: 'kt-match' };
    }
    const name = nameKey(row.nafn || row.customer_nafn);
    if (name) {
      const exact = _idxByName.get(name);
      if (exact && exact.length === 1) return { base: exact[0], conf: 'med', why: 'nafn-match' };
      if (exact && exact.length > 1) return { base: exact[0], conf: 'med', why: name + ' (' + exact.length + ' möguleikar)' };
      // Fuzzy — only if name length >= 4 and best distance <= 2
      if (name.length >= 4) {
        let best = null, bestD = 99;
        for (const b of state.bases) {
          const n = nameKey(b.nafn);
          if (!n || Math.abs(n.length - name.length) > 2) continue;
          const d = levenshtein(name, n);
          if (d < bestD) { bestD = d; best = b; if (d === 0) break; }
        }
        if (best && bestD <= 2) return { base: best, conf: 'low', why: 'fuzzy d=' + bestD };
      }
    }
    return { base: null, conf: 'none', why: 'ekkert' };
  }

  // ── render ────────────────────────────────────────────────────────────────
  function styles() {
    const id = '_sam-styles';
    if (document.getElementById(id)) return;
    const css = `
.sam-wrap{padding:14px 16px 60px;max-width:1180px;margin:0 auto;color:var(--ink1,#0f172a)}
.sam-h{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.sam-h h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em}
.sam-h .sub{font-size:13px;color:var(--ink3,#94a3b8);margin-top:2px}
.sam-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--brd,#e6eaf0);padding-bottom:8px}
.sam-tab{padding:7px 14px;border-radius:99px;border:1px solid var(--brd,#e6eaf0);background:var(--surface,#fff);color:var(--ink2,#475569);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.sam-tab.on{background:var(--brand,#0d6efd);color:#fff;border-color:var(--brand,#0d6efd)}
.sam-stat{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.sam-stat .pill{padding:6px 12px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:99px;font-size:12.5px;color:var(--ink2,#475569);font-weight:600}
.sam-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.sam-search{flex:1;min-width:200px;border:1px solid var(--brd,#cbd5e1);border-radius:10px;padding:9px 13px;font:inherit;font-size:14px;background:var(--surface,#fff);color:var(--ink1,#0f172a);box-sizing:border-box;outline:none}
.sam-search:focus{border-color:var(--brand,#0d6efd);box-shadow:0 0 0 3px rgba(13,110,253,.15)}
.sam-chip{padding:5px 11px;border-radius:99px;border:1px solid var(--brd,#e6eaf0);background:var(--surface,#fff);color:var(--ink2,#475569);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.sam-chip.on{background:var(--brand,#0d6efd);color:#fff;border-color:var(--brand,#0d6efd)}
.sam-bulk{background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.sam-bulk:hover{background:#15803d}
.sam-bulk[disabled]{opacity:.5;cursor:not-allowed}
.sam-table{width:100%;border-collapse:collapse;background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:10px;overflow:hidden}
.sam-table th{text-align:left;padding:10px 12px;background:var(--surface2,#f8fafc);border-bottom:1px solid var(--brd,#e6eaf0);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3,#94a3b8);font-weight:700}
.sam-table td{padding:10px 12px;border-bottom:1px solid var(--brd,#eef1f5);font-size:13px;vertical-align:top}
.sam-table tr:last-child td{border-bottom:0}
.sam-conf{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px;letter-spacing:.04em}
.sam-conf.high{background:#dcfce7;color:#15803d}
.sam-conf.med{background:#fef3c7;color:#92400e}
.sam-conf.low{background:#fed7aa;color:#9a3412}
.sam-conf.none{background:#fee2e2;color:#991b1b}
.sam-row-act{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.sam-btn{padding:5px 11px;border:none;border-radius:7px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
.sam-btn.go{background:#16a34a;color:#fff}
.sam-btn.go:hover{background:#15803d}
.sam-btn.alt{background:var(--surface2,#eef1f5);color:var(--ink2,#475569)}
.sam-btn.alt:hover{background:var(--brd,#e6eaf0)}
.sam-btn.del{background:#dc2626;color:#fff}
.sam-btn.del:hover{background:#991b1b}
.sam-empty{padding:30px;text-align:center;color:var(--ink3,#94a3b8);font-size:14px}
.sam-err{padding:14px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:9px;font-size:13px;margin-bottom:14px}
.sam-spin{display:inline-block;width:12px;height:12px;border:2px solid #cbd5e1;border-top-color:var(--brand,#0d6efd);border-radius:50%;animation:sam-rot .7s linear infinite;vertical-align:middle}
@keyframes sam-rot{to{transform:rotate(360deg)}}
.sam-base{font-size:11.5px;color:var(--ink3,#94a3b8);margin-top:2px}
.sam-base b{color:var(--ink1,#0f172a);font-weight:600}
`;
    const tag = document.createElement('style');
    tag.id = id; tag.textContent = css;
    document.head.appendChild(tag);
  }

  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    v.style.display = 'none';
    document.body.appendChild(v); // sit alongside other views
    return v;
  }

  function render() {
    styles();
    const v = viewEl();
    const tabsHTML = TABS.map(t => '<button class="sam-tab' + (state.tab === t.k ? ' on' : '') + '" data-tab="' + t.k + '">' + t.label + '</button>').join('');
    const counts = '<div class="sam-stat">' +
      '<span class="pill">🏢 Fyrirtæki ótengd: <b>' + fmtNum(state.fyrirtaeki.length) + '</b></span>' +
      '<span class="pill">👤 Viðskiptavinir ótengdir: <b>' + fmtNum(state.vidskiptavinir.length) + '</b></span>' +
      '<span class="pill">💳 Sölur ótengdar: <b>' + fmtNum(state.solur.length) + '</b></span>' +
      '<span class="pill">🏛 Grunnskrár til: <b>' + fmtNum(state.bases.length) + '</b></span>' +
      '</div>';

    let body = '';
    if (state.loading && !state.loaded) {
      body = '<div class="sam-empty"><span class="sam-spin"></span> Sæki gögn…</div>';
    } else if (state.err) {
      body = '<div class="sam-err">⚠️ ' + esc(state.err) + '</div>';
    } else if (state.tab === 'fyrirtaeki') body = renderListTab('fyrirtaeki');
    else if (state.tab === 'vidskiptavinir') body = renderListTab('vidskiptavinir');
    else if (state.tab === 'solur') body = renderListTab('solur');

    const safetyNote =
      '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:10px 14px;font-size:12.5px;color:#1e40af;margin-bottom:14px;line-height:1.5">' +
        '<b>📍 Rekstrarfélög með margar staðsettningar:</b> staðsettningar haldast SJÁLFSTÆÐAR (eigin nafn, heimilisfang, úttæki). Þetta tól tengir bara <code>customer_base_id</code> FK — sameinar ekki, eyðir ekki. Margar fyrirtæki-raðir með sömu kt → allar fá sama base parent + halda sínu nafni.' +
      '</div>';

    v.innerHTML =
      '<div class="sam-wrap">' +
        '<div class="sam-h">' +
          '<div><h1>🔗 Sameining</h1><div class="sub">Tengja ótengdar raðir við grunnskrá (customers_base). Markmið: 0 ótengd alls.</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="sam-btn alt" href="/docs/CLAUDE-LEIDBEININGAR.md" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px">📖 Leiðbeiningar</a>' +
            '<button class="sam-btn alt" id="_sam-reload">↻ Endurhlaða</button>' +
          '</div>' +
        '</div>' +
        '<div class="sam-tabs">' + tabsHTML + '</div>' +
        safetyNote +
        counts +
        body +
      '</div>';

    v.querySelectorAll('.sam-tab').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; state.q = ''; state.filterConf = 'all'; render(); }));
    const reload = v.querySelector('#_sam-reload'); if (reload) reload.addEventListener('click', load);

    wireListEvents(v);
  }

  function renderListTab(kind) {
    const rows = (kind === 'fyrirtaeki' ? state.fyrirtaeki
                : kind === 'vidskiptavinir' ? state.vidskiptavinir
                : state.solur).slice();
    // Count occurrences of each kt within this list — flags rekstrarfélög with
    // multiple locations sharing one kt. Per Agnar: those rows MUST stay
    // independent (each location is its own fyrirtaeki/site), only the
    // customer_base_id FK gets shared. We never merge them.
    const ktCount = new Map();
    for (const r of rows) {
      const k = ktDigits(r.kennitala || r.customer_kt);
      if (k.length >= 6) ktCount.set(k, (ktCount.get(k) || 0) + 1);
    }
    // Build suggestions
    const augmented = rows.map(r => ({ r, s: suggest({
      nafn: r.nafn || r.customer_nafn,
      kennitala: r.kennitala || r.customer_kt,
    }) }));
    // Filter
    const q = (state.q || '').toLowerCase();
    let filt = augmented;
    if (q) filt = filt.filter(({r}) => {
      const blob = ((r.nafn || r.customer_nafn || '') + ' ' + (r.kennitala || r.customer_kt || '')).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    if (state.filterConf !== 'all') filt = filt.filter(({s}) => s.conf === state.filterConf);
    // Sort: high → med → low → none, then by name
    const ORD = { high: 0, med: 1, low: 2, none: 3 };
    filt.sort((a, b) => ORD[a.s.conf] - ORD[b.s.conf] || String(a.r.nafn || a.r.customer_nafn || '').localeCompare(String(b.r.nafn || b.r.customer_nafn || ''), 'is'));

    // Conf chips
    const confs = ['all', 'high', 'med', 'low', 'none'];
    const labelOf = { all: 'Allt', high: '🟢 kt-match', med: '🟡 nafn-match', low: '🟠 fuzzy', none: '🔴 ekkert' };
    const counts = { all: augmented.length, high: 0, med: 0, low: 0, none: 0 };
    for (const a of augmented) counts[a.s.conf]++;
    const chips = confs.map(c => '<button class="sam-chip' + (state.filterConf === c ? ' on' : '') + '" data-conf="' + c + '">' + labelOf[c] + ' (' + counts[c] + ')</button>').join('');

    const bulkEligible = augmented.filter(a => a.s.conf === 'high' || a.s.conf === 'med').length;
    const walkinCount = augmented.filter(a => isWalkin(a.r)).length;
    const bulkBtn = '<button class="sam-bulk" id="_sam-bulk" data-kind="' + kind + '"' + (bulkEligible && !state.busy ? '' : ' disabled') + '>🚀 Tengja allt augljóst (' + bulkEligible + ')</button>';
    const walkinBtn = walkinCount > 0
      ? '<button class="sam-bulk" id="_sam-walkin" data-kind="' + kind + '"' + (state.busy ? ' disabled' : '') + ' style="background:#7c3aed">🚶 Sameina alla walk-ins (' + walkinCount + ')</button>'
      : '';

    const toolbar = '<div class="sam-toolbar">' +
      '<input class="sam-search" id="_sam-q" placeholder="🔎 Leita nafn/kennitala…" value="' + esc(state.q) + '">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + chips + '</div>' +
      walkinBtn + bulkBtn +
      '</div>';

    if (!filt.length) return toolbar + '<div class="sam-empty">🎉 Engin ótengd röð á þessum flokki.</div>';

    const cap = 250;
    const shown = filt.slice(0, cap);
    const rowsHTML = shown.map(({ r, s }) => {
      const id = r.id;
      const showName = r.nafn || r.customer_nafn || '(án nafns)';
      const showKt = r.kennitala || r.customer_kt || '';
      const addr = r.heimilisfang || '';
      const kdig = ktDigits(showKt);
      const peers = kdig.length >= 6 ? (ktCount.get(kdig) || 1) : 1;
      const siteBadge = peers > 1
        ? ' <span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;background:#dbeafe;color:#1d4ed8;margin-left:4px" title="Sama kt á ' + peers + ' röðum — staðsettningar af sama rekstrarfélagi. Halda áfram að vera sjálfstæðar.">📍 ' + peers + ' staðsettningar</span>'
        : '';
      const baseInfo = s.base
        ? '<div class="sam-base">→ <b>' + esc(s.base.nafn || '(?)') + '</b> · ' + esc(s.base.kennitala || 'engin kt') + ' <span style="color:var(--ink3,#94a3b8)">· ' + esc(s.why) + '</span></div>'
        : '<div class="sam-base">— engin tillaga</div>';
      const addrInfo = addr
        ? '<div style="font-size:11.5px;color:var(--ink3,#94a3b8);margin-top:1px">📍 ' + esc(addr) + '</div>'
        : '';
      const acts = s.base
        ? '<button class="sam-btn go" data-act="link" data-kind="' + kind + '" data-id="' + id + '" data-base="' + s.base.id + '">🔗 Tengja</button>' +
          '<button class="sam-btn alt" data-act="pick" data-kind="' + kind + '" data-id="' + id + '">Annað</button>'
        : '<button class="sam-btn alt" data-act="pick" data-kind="' + kind + '" data-id="' + id + '">🔍 Leita</button>' +
          '<button class="sam-btn alt" data-act="create" data-kind="' + kind + '" data-id="' + id + '">🆕 Ný base</button>';
      const skip = '<button class="sam-btn del" data-act="skip" data-kind="' + kind + '" data-id="' + id + '" title="Sleppa þessari röð núna (uppfærir bara local state, fjarlægir ekkert úr db)">×</button>';
      return '<tr>' +
        '<td><div style="font-weight:600">' + esc(showName) + siteBadge + '</div>' +
            '<div style="font-size:11.5px;color:var(--ink3,#94a3b8);font-variant-numeric:tabular-nums">' + esc(showKt) + (r.num ? ' · R-' + esc(r.num) : '') + '</div>' +
            addrInfo +
            baseInfo + '</td>' +
        '<td><span class="sam-conf ' + s.conf + '">' + labelOf[s.conf].replace(/^[^ ]+ /, '') + '</span></td>' +
        '<td><div class="sam-row-act">' + acts + skip + '</div></td>' +
      '</tr>';
    }).join('');

    const tail = filt.length > cap ? '<p style="color:var(--ink3,#94a3b8);text-align:center;font-size:12px;margin-top:8px">Sýni ' + cap + ' af ' + fmtNum(filt.length) + ' röðum.</p>' : '';

    return toolbar +
      '<table class="sam-table"><thead><tr><th>Röð (ótengd)</th><th>Tillaga</th><th style="text-align:right">Aðgerð</th></tr></thead>' +
      '<tbody>' + rowsHTML + '</tbody></table>' + tail;
  }

  function wireListEvents(v) {
    const q = v.querySelector('#_sam-q');
    if (q) {
      let t = 0;
      q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value; render(); }, 220); });
    }
    v.querySelectorAll('[data-conf]').forEach(b => b.addEventListener('click', () => { state.filterConf = b.dataset.conf; render(); }));
    v.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act, k = b.dataset.kind, id = b.dataset.id, base = b.dataset.base;
      if (a === 'link') doLink(k, id, base);
      else if (a === 'pick') openBasePicker(k, id);
      else if (a === 'create') createBaseFromRow(k, id);
      else if (a === 'skip') skipRow(k, id);
    }));
    const bulk = v.querySelector('#_sam-bulk');
    if (bulk) bulk.addEventListener('click', () => bulkLink(bulk.dataset.kind));
    const walkin = v.querySelector('#_sam-walkin');
    if (walkin) walkin.addEventListener('click', () => bulkWalkins(walkin.dataset.kind));
  }

  // ── actions ───────────────────────────────────────────────────────────────
  function tableFor(kind) {
    return kind === 'fyrirtaeki' ? 'fyrirtaeki'
         : kind === 'vidskiptavinir' ? 'vidskiptavinir'
         : 'solur';
  }
  function listFor(kind) {
    return kind === 'fyrirtaeki' ? state.fyrirtaeki
         : kind === 'vidskiptavinir' ? state.vidskiptavinir
         : state.solur;
  }

  async function doLink(kind, id, baseId) {
    const SB = getSB(); if (!SB || !baseId) return;
    const tbl = tableFor(kind);
    try {
      const r = await SB.from(tbl).update({ customer_base_id: baseId }).eq('id', id);
      if (r.error) throw r.error;
      // Remove from local state
      const arr = listFor(kind);
      const idx = arr.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) arr.splice(idx, 1);
      toast('🔗 Tengt');
      render();
    } catch (e) { toast('⚠️ Villa: ' + ((e && e.message) || e), true); }
  }

  function skipRow(kind, id) {
    const arr = listFor(kind);
    const idx = arr.findIndex(x => String(x.id) === String(id));
    if (idx >= 0) arr.splice(idx, 1);
    render();
  }

  async function bulkLink(kind) {
    const rows = listFor(kind);
    const augmented = rows.map(r => ({ r, s: suggest({ nafn: r.nafn || r.customer_nafn, kennitala: r.kennitala || r.customer_kt }) }))
                          .filter(a => (a.s.conf === 'high' || a.s.conf === 'med') && a.s.base);
    if (!augmented.length) { toast('Engin augljós tillaga.', true); return; }
    if (!confirm(`Tengja ${augmented.length} raðir í einu? (high+med confidence)`)) return;
    state.busy = true; render();
    const SB = getSB(); const tbl = tableFor(kind);
    let ok = 0, fail = 0;
    for (const { r, s } of augmented) {
      try {
        const res = await SB.from(tbl).update({ customer_base_id: s.base.id }).eq('id', r.id);
        if (res.error) { fail++; continue; }
        ok++;
        const idx = rows.findIndex(x => String(x.id) === String(r.id));
        if (idx >= 0) rows.splice(idx, 1);
      } catch (_) { fail++; }
    }
    state.busy = false;
    toast(`🚀 Tengdi ${ok}${fail ? ' · ' + fail + ' féllu' : ''}`);
    render();
  }

  async function ensureWalkinBase() {
    const existing = getOrPlanWalkinBase();
    if (existing) return existing;
    const SB = getSB(); if (!SB) return null;
    // Race-safe: try insert with .upsert on kt
    try {
      const r = await SB.from('customers_base').upsert(
        { kennitala: WALKIN_KT_FORMATTED, nafn: 'Walk-in / nafnlaus sala' },
        { onConflict: 'kennitala' }
      ).select('id,nafn,kennitala').single();
      if (r.error) throw r.error;
      state.bases.push(r.data);
      _idxByKt.set(WALKIN_KT_DIGITS, r.data);
      return r.data;
    } catch (e) {
      // Fallback: search by digits-only (works regardless of how the row was stored)
      const all = await SB.from('customers_base').select('id,nafn,kennitala');
      const hit = (all.data || []).find(b => ktDigits(b.kennitala) === WALKIN_KT_DIGITS);
      if (hit) { _idxByKt.set(WALKIN_KT_DIGITS, hit); state.bases.push(hit); return hit; }
      toast('⚠️ Gat ekki stofnað walk-in grunnskrá: ' + ((e && e.message) || e), true);
      return null;
    }
  }

  async function bulkWalkins(kind) {
    const rows = listFor(kind).filter(r => isWalkin(r));
    if (!rows.length) { toast('Engir walk-ins fundust.', true); return; }
    if (!confirm(`Sameina ${rows.length} walk-in raðir undir 999999-9999?`)) return;
    state.busy = true; render();
    const wb = await ensureWalkinBase();
    if (!wb) { state.busy = false; render(); return; }
    const SB = getSB(); const tbl = tableFor(kind);
    let ok = 0, fail = 0;
    for (const r of rows) {
      try {
        const res = await SB.from(tbl).update({ customer_base_id: wb.id }).eq('id', r.id);
        if (res.error) { fail++; continue; }
        ok++;
        const idx = listFor(kind).findIndex(x => String(x.id) === String(r.id));
        if (idx >= 0) listFor(kind).splice(idx, 1);
      } catch (_) { fail++; }
    }
    state.busy = false;
    toast(`🚶 Sameindi ${ok} walk-ins${fail ? ' · ' + fail + ' féllu' : ''}`);
    render();
  }

  function openBasePicker(kind, id) {
    const row = listFor(kind).find(x => String(x.id) === String(id));
    if (!row) return;
    const old = document.getElementById('_sam-picker'); if (old) old.remove();
    const seed = String(row.nafn || row.customer_nafn || row.kennitala || row.customer_kt || '');
    const dlg = document.createElement('div');
    dlg.id = '_sam-picker';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px';
    dlg.innerHTML =
      '<div style="background:var(--surface,#fff);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.35);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 80px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 18px;border-bottom:1px solid var(--brd,#e6eaf0);display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
          '<div><div style="font-size:14px;font-weight:800">🔗 Leita í grunnskrá</div>' +
            '<div style="font-size:11px;color:var(--ink3,#94a3b8);margin-top:2px">Veldu grunnskrá-röð til að tengja við „' + esc(seed) + '".</div></div>' +
          '<button id="_sam-x" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--ink3,#94a3b8);line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:14px 18px 8px"><input id="_sam-pq" placeholder="🔎 Nafn eða kennitala…" style="width:100%;border:1px solid var(--brd,#cbd5e1);border-radius:10px;padding:10px 13px;font:inherit;font-size:14px;box-sizing:border-box;outline:none"></div>' +
        '<div id="_sam-pr" style="flex:1;overflow-y:auto;padding:4px 12px 14px"></div>' +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_sam-x').addEventListener('click', close);
    const q = dlg.querySelector('#_sam-pq');
    const res = dlg.querySelector('#_sam-pr');
    let t = 0;
    function paint() {
      const term = q.value.trim().toLowerCase();
      let list = state.bases.slice();
      if (term) list = list.filter(b => (String(b.nafn || '').toLowerCase().indexOf(term) >= 0) || (ktDigits(b.kennitala).indexOf(ktDigits(term)) >= 0 && ktDigits(term).length >= 3));
      list = list.slice(0, 30);
      res.innerHTML = list.length
        ? list.map(c =>
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--brd,#eef1f5);border-radius:9px;margin-bottom:6px">' +
              '<div style="min-width:0"><div style="font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.nafn || '(?)') + '</div>' +
                '<div style="font-size:11.5px;color:var(--ink3,#94a3b8);font-variant-numeric:tabular-nums">' + esc(c.kennitala || 'engin kt') + '</div></div>' +
              '<button class="_sam-pick" data-bid="' + esc(String(c.id)) + '" style="flex-shrink:0;padding:6px 13px;background:#16a34a;color:#fff;border:none;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Velja</button>' +
            '</div>')
          .join('')
        : '<div style="padding:16px;color:var(--ink3,#94a3b8);font-size:13px;text-align:center">Ekkert fannst.</div>';
      res.querySelectorAll('._sam-pick').forEach(b => b.addEventListener('click', () => { close(); doLink(kind, id, b.getAttribute('data-bid')); }));
    }
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(paint, 200); });
    q.value = seed;
    paint();
    setTimeout(() => { try { q.focus(); q.select(); } catch (_) {} }, 30);
  }

  async function createBaseFromRow(kind, id) {
    const row = listFor(kind).find(x => String(x.id) === String(id));
    if (!row) return;
    const nafn = row.nafn || row.customer_nafn || '';
    const kt = row.kennitala || row.customer_kt || '';
    if (!nafn && !kt) { toast('Vantar nafn eða kennitölu.', true); return; }
    if (!confirm(`Búa til nýja base-röð fyrir "${nafn}" (${kt || 'engin kt'})?`)) return;
    const SB = getSB();
    try {
      const ins = await SB.from('customers_base').insert({
        nafn: nafn || null,
        kennitala: kt || null,
        [kind === 'fyrirtaeki' ? 'source_f_id' : kind === 'vidskiptavinir' ? 'source_v_id' : 'source_s_id']: row.id,
      }).select('id,nafn,kennitala').single();
      if (ins.error) throw ins.error;
      state.bases.push(ins.data);
      const k = ktDigits(ins.data.kennitala);
      if (k) _idxByKt.set(k, ins.data);
      const n = nameKey(ins.data.nafn);
      if (n) { if (!_idxByName.has(n)) _idxByName.set(n, []); _idxByName.get(n).push(ins.data); }
      await doLink(kind, id, ins.data.id);
    } catch (e) { toast('⚠️ Villa við stofnun: ' + ((e && e.message) || e), true); }
  }

  function toast(msg, bad) {
    if (window.Toast && Toast.show) return Toast.show(msg);
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (bad ? '#dc2626' : '#0f172a') + ';color:#fff;padding:10px 18px;border-radius:99px;font:inherit;font-size:13px;font-weight:600;z-index:100100;box-shadow:0 6px 24px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  function ensureSidebarButton() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const sib = document.querySelector('[data-view="bakendi"]') || document.querySelector('[data-view="companies"]');
    if (!sib) return;
    const btn = sib.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    btn.innerHTML = btn.innerHTML.replace(/[^<]*$/, ' Sameining');
    // try to replace text node
    const txt = btn.querySelector('span') || btn.lastChild;
    if (txt && txt.nodeType === 1) txt.textContent = '🔗 Sameining';
    else if (txt && txt.nodeType === 3) txt.nodeValue = ' 🔗 Sameining';
    btn.addEventListener('click', e => { e.preventDefault(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(btn, sib.nextSibling);
  }

  function hookSwitch() {
    if (!window.App || !App.switchView || App.__samPatched) return;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        const v = viewEl();
        v.style.display = '';
        render();
        if (!state.loaded && !state.loading) load();
        try { location.hash = '#' + NAV_KEY; } catch (_) {}
        return;
      }
      return orig(k);
    };
    App.__samPatched = true;
  }

  function init() {
    viewEl();
    hookSwitch();
    ensureSidebarButton();
    // boot deep-link
    if (location.hash === '#' + NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // public API
  window.Sameining = {
    open: () => { if (window.App && App.switchView) App.switchView(NAV_KEY); },
    reload: load,
  };
})();
