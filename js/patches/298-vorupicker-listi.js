/* === VÖRUTÍNINGUR — LISTA-ÚTGÁFA (BETA) v1 — patch 298, 2026-08-05 ==========
 *
 * Önnur útgáfa af „🔍 Velja vöru / þjónustu" glugganum (patch 117), eftir
 * mockup-i Agnars 2026-08-05.
 *
 * Vandinn með núverandi útgáfu: glertíglarnir (21 flokkur) fylla nánast allan
 * gluggann, svo vörulistinn sjálfur byrjar neðan við sjónarrönd og maður þarf
 * að skruna til að sjá nokkra einustu vöru.
 *
 * Þessi útgáfa er LEITAR-FYRST:
 *   • Leitarreiturinn efst grípur lyklaborðið strax — skrifaðu og listinn síast.
 *   • Flokkarnir eru samanbrotnir fellilistar með talningu, ekki tíglaveggur.
 *     Þeir opnast sjálfkrafa á meðan leitað er.
 *   • Hver lína: nafn (samsvörun gulmerkt) + lýsing, verð m/VSK stórt, án VSK
 *     undir, og „Velja" hnappur. Öll línan er líka smellanleg.
 *   • ★ Mest notað helst óbreytt efst (sama `vp_recent_v1` og patch 117).
 *   • Enter velur efstu niðurstöðu, Esc lokar — eins og áður.
 *
 * A/B: rofinn „📋 Listi / 🔲 Tíglar" er í hausnum á BÁÐUM útgáfum og valið
 * geymist í localStorage (`vp_listi_beta`). Sjálfgefið er GAMLA útgáfan, svo
 * ekkert breytist fyrr en smellt er á „📋 Listi".
 *
 * Kallara-samningurinn er ÓBREYTTUR: VorurPicker.open(cb) → cb({id, nafn,
 * flokkur, verd_an_vsk, vsk_prosenta, lysing}). Allir 10 kallararnir (113,
 * 116, 121, 129, 142, 158, 172, 294 …) virka eins.
 * ========================================================================== */
(() => {
  if (window.__vpListiBeta) return;
  window.__vpListiBeta = true;

  const KEY = 'vp_listi_beta';
  const useList = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const setList = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {} };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('is-IS');
  const norm = s => String(s || '').toLowerCase();
  const SB = () => (window.DB && DB.sb) || null;

  // Tákn koma úr js/ui-icons.js (stroke-SVG) — engin emoji.
  const ic = (name, size) => (window.UIIcons ? UIIcons.svg(name, { size: size || 15 }) : '');
  const icf = (flokkur, size) => (window.UIIcons ? UIIcons.flokkurSvg(flokkur, { size: size || 15 }) : '');

  const RECENT_KEY = 'vp_recent_v1';
  const getRecents = () => { try { const a = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  function pushRecent(nafn) {
    if (!nafn) return;
    try {
      let a = getRecents().filter(n => n !== nafn);
      a.unshift(nafn);
      localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 12)));
    } catch (_) {}
  }

  // ── Stílar ────────────────────────────────────────────────────────────────
  function css() {
    if (document.getElementById('_vp2-css')) return;
    const s = document.createElement('style');
    s.id = '_vp2-css';
    s.textContent = `
._vp2-ov{position:fixed;inset:0;z-index:100080;background:rgba(2,6,23,.62);display:flex;align-items:flex-start;justify-content:center;padding:min(6vh,60px) 16px 16px}
._vp2{width:min(680px,calc(100vw - 24px));max-height:calc(100vh - 90px);display:flex;flex-direction:column;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 28px 70px rgba(2,6,23,.6);font-family:inherit}
._vp2-hd{display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid #1e293b;background:rgba(2,6,23,.55)}
._vp2-ttl{font-size:14.5px;font-weight:800;color:#f1f5f9;display:flex;align-items:center;gap:7px}
._vp2-sub{font-size:11px;color:#64748b;margin-top:1px}
._vp2-sw{margin-left:auto;display:flex;gap:5px}
._vp2-sw button{display:inline-flex;align-items:center;gap:5px;background:rgba(30,41,59,.7);border:1px solid #334155;color:#94a3b8;border-radius:8px;padding:6px 10px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
._vp2-sw button[data-active="1"]{background:#2563eb;border-color:#3b82f6;color:#fff}
._vp2-x{background:rgba(30,41,59,.7);border:1px solid #334155;color:#cbd5e1;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1}
._vp2-top{padding:13px 15px;border-bottom:1px solid #1e293b;background:rgba(2,6,23,.35)}
._vp2-sbox{position:relative}
._vp2-sbox input{width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:12px;padding:12px 34px;font:inherit;font-size:14px;font-weight:500;outline:none}
._vp2-sbox input::placeholder{color:#64748b}
._vp2-sbox input:focus{border-color:#3b82f6!important;box-shadow:0 0 0 1px #3b82f6!important;outline:none!important}
._vp2-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#64748b;font-size:13px;pointer-events:none}
._vp2-clr{position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:14px;padding:4px 6px;line-height:1}
._vp2-clr:hover{color:#cbd5e1}
._vp2-rec{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
._vp2-rec b{display:flex;align-items:center;gap:4px;width:100%;font-size:9.5px;font-weight:800;color:#475569;letter-spacing:.07em;text-transform:uppercase;margin-bottom:1px}
._vp2-chip{background:rgba(37,99,235,.1);border:1px solid rgba(59,130,246,.3);color:#93c5fd;border-radius:99px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer}
._vp2-chip:hover{background:#2563eb;color:#fff}
._vp2-list{flex:1;min-height:140px;overflow-y:auto}
._vp2-grp{border-top:1px solid #1e293b}
._vp2-grp:first-child{border-top:none}
._vp2-gh{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 15px;background:rgba(15,23,42,.5);border:none;cursor:pointer;color:#cbd5e1;font:inherit;font-size:13px;font-weight:700;text-align:left}
._vp2-gh:hover{background:rgba(30,41,59,.65);color:#fff}
._vp2-cnt{color:#64748b;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
._vp2-arr{color:#64748b;font-size:10px;transition:transform .18s}
._vp2-grp[data-open="1"] ._vp2-arr{transform:rotate(180deg)}
._vp2-grp:not([data-open="1"]) ._vp2-body{display:none}
._vp2-body{background:rgba(2,6,23,.45)}
._vp2-row{display:flex;align-items:center;gap:11px;padding:10px 15px 10px 28px;border-top:1px solid rgba(30,41,59,.65);cursor:pointer}
._vp2-row:hover,._vp2-row[data-sel="1"]{background:rgba(30,41,59,.45)}
._vp2-nm{font-size:12.5px;font-weight:600;color:#e2e8f0;line-height:1.3}
._vp2-row:hover ._vp2-nm{color:#60a5fa}
._vp2-ly{font-size:10.5px;color:#64748b;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
._vp2-pr{text-align:right;flex:none;font-variant-numeric:tabular-nums}
._vp2-pr b{display:block;font-size:13px;color:#e2e8f0;font-weight:800}
._vp2-pr span{display:block;font-size:10px;color:#64748b}
._vp2-pick{flex:none;background:rgba(37,99,235,.12);border:1px solid rgba(59,130,246,.35);color:#60a5fa;padding:7px 12px;border-radius:9px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer}
._vp2-pick:hover{background:#2563eb;border-color:#3b82f6;color:#fff}
._vp2-mk{background:rgba(16,185,129,.22);color:#34d399;border-radius:3px;padding:0 2px;font-weight:800}
._vp2-ft{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 15px;border-top:1px solid #1e293b;background:rgba(2,6,23,.5)}
._vp2-ft small{font-size:11px;color:#64748b;font-variant-numeric:tabular-nums}
._vp2-ft button{background:rgba(30,41,59,.7);border:1px solid #334155;color:#cbd5e1;border-radius:9px;padding:8px 15px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
._vp2-empty{padding:34px;text-align:center;color:#64748b;font-size:13px;font-style:italic}
`;
    document.head.appendChild(s);
  }

  // ── Gögn (sama fyrirspurn og patch 117) ───────────────────────────────────
  let _cache = null, _inflight = null;
  function load() {
    const fromOld = (window.VorurPicker && VorurPicker.list && VorurPicker.list()) || [];
    if (fromOld.length) return Promise.resolve(fromOld);
    if (_cache) return Promise.resolve(_cache);
    if (_inflight) return _inflight;
    const sb = SB();
    if (!sb) return Promise.resolve([]);
    _inflight = sb.from('vorur').select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,lysing,virkt')
      .eq('virkt', true).order('flokkur').order('nafn')
      .then(r => { _cache = r.data || []; _inflight = null; return _cache; })
      .catch(() => { _inflight = null; return []; });
    return _inflight;
  }

  function hi(text, q) {
    const t = esc(text || '');
    if (!q) return t;
    const i = norm(t).indexOf(q);
    return i < 0 ? t : t.slice(0, i) + '<mark class="_vp2-mk">' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length);
  }

  // ── Nýi glugginn ──────────────────────────────────────────────────────────
  function openList(onPick) {
    css();
    const old = document.getElementById('_vp2-ov');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = '_vp2-ov';
    ov.className = '_vp2-ov';
    ov.innerHTML =
      '<div class="_vp2">' +
        '<div class="_vp2-hd">' +
          '<div><div class="_vp2-ttl">' + ic('search', 15) + '<span>Velja vöru / þjónustu</span></div>' +
          '<div class="_vp2-sub">Skrifaðu til að leita — Enter velur efstu línu</div></div>' +
          '<div class="_vp2-sw">' +
            '<button type="button" data-mode="list" data-active="1">' + ic('list',13) + 'Listi</button>' +
            '<button type="button" data-mode="tiles">' + ic('grid',13) + 'Tíglar</button>' +
          '</div>' +
          '<button class="_vp2-x" type="button" title="Loka">✕</button>' +
        '</div>' +
        '<div class="_vp2-top">' +
          '<div class="_vp2-sbox"><span class="_vp2-ico">' + ic('search',14) + '</span>' +
            '<input id="_vp2-q" type="text" autocomplete="off" placeholder="Leita að vöru, flokki eða lýsingu…">' +
            '<button class="_vp2-clr" type="button" style="display:none">✕</button>' +
          '</div>' +
          '<div class="_vp2-rec" id="_vp2-rec"></div>' +
        '</div>' +
        '<div class="_vp2-list" id="_vp2-list"><div class="_vp2-empty">Hleð inn vörum…</div></div>' +
        '<div class="_vp2-ft"><small id="_vp2-cnt"></small><button type="button" id="_vp2-cancel">Hætta við</button></div>' +
      '</div>';
    document.body.appendChild(ov);

    const input = ov.querySelector('#_vp2-q');
    const clr = ov.querySelector('._vp2-clr');
    const listEl = ov.querySelector('#_vp2-list');
    const recEl = ov.querySelector('#_vp2-rec');
    const cntEl = ov.querySelector('#_vp2-cnt');

    let items = [], term = '';
    const openGroups = new Set(['Þjónusta']);   // þjónustan opin sjálfgefið
    const close = () => ov.remove();

    function pick(p) {
      if (p && typeof onPick === 'function') {
        onPick({
          id: p.id, nafn: p.nafn || '', flokkur: p.flokkur || '',
          verd_an_vsk: +p.verd_an_vsk || 0, vsk_prosenta: +p.vsk_prosenta || 24,
          lysing: p.lysing || ''
        });
      }
      pushRecent(p && p.nafn);
      close();
    }

    function grouped() {
      const q = norm(term).trim();
      const toks = q ? q.split(/\s+/).filter(Boolean) : [];
      const by = new Map();
      items.forEach(p => {
        if (toks.length) {
          const hay = norm((p.nafn || '') + ' ' + (p.flokkur || '') + ' ' + (p.lysing || ''));
          if (!toks.every(t => hay.includes(t))) return;
        }
        const k = (p.flokkur || 'Ýmsar vörur').trim() || 'Ýmsar vörur';
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(p);
      });
      return [...by.entries()]
        .sort((a, b) => (b[0] === 'Þjónusta') - (a[0] === 'Þjónusta') || b[1].length - a[1].length);
    }

    function renderRecents() {
      if (term) { recEl.style.display = 'none'; return; }
      const byName = {};
      items.forEach(p => { if (!(p.nafn in byName)) byName[p.nafn] = p; });
      const top = getRecents().filter(n => byName[n]).slice(0, 5);
      if (!top.length) { recEl.style.display = 'none'; return; }
      recEl.style.display = '';
      recEl.innerHTML = '<b>' + ic('star',11) + ' Mest notað</b>' + top.map(n => {
        const p = byName[n];
        const inc = (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100);
        const lbl = n.length > 30 ? n.slice(0, 29) + '…' : n;
        return '<button class="_vp2-chip" type="button" data-name="' + esc(n) + '">' + esc(lbl) + ' · ' + fmt(inc) + ' kr</button>';
      }).join('');
    }

    function render() {
      const q = norm(term).trim();
      const gs = grouped();
      const total = gs.reduce((s, g) => s + g[1].length, 0);
      cntEl.textContent = total + ' / ' + items.length + ' vörur';
      renderRecents();
      if (!gs.length) {
        listEl.innerHTML = '<div class="_vp2-empty">Engin vara fannst — prófaðu annað leitarorð</div>';
        return;
      }
      const firstTok = q ? q.split(/\s+/)[0] : '';
      listEl.innerHTML = gs.map(([nafn, rows]) => {
        const open = q ? true : openGroups.has(nafn);
        return '<div class="_vp2-grp" data-grp="' + esc(nafn) + '" data-open="' + (open ? '1' : '0') + '">' +
          '<button class="_vp2-gh" type="button"><span style="display:inline-flex;align-items:center;gap:7px">' + icf(nafn,15) + hi(nafn, firstTok) +
            ' <span class="_vp2-cnt">[' + rows.length + ']</span></span><span class="_vp2-arr">▼</span></button>' +
          '<div class="_vp2-body">' + rows.map(p => {
            const ex = +p.verd_an_vsk || 0, vsk = p.vsk_prosenta == null ? 24 : +p.vsk_prosenta;
            return '<div class="_vp2-row" data-id="' + esc(p.id) + '">' +
              '<div style="flex:1;min-width:0"><div class="_vp2-nm">' + hi(p.nafn, firstTok) + '</div>' +
                (p.lysing ? '<div class="_vp2-ly">' + esc(p.lysing) + '</div>' : '') + '</div>' +
              '<div class="_vp2-pr"><b>' + fmt(ex * (1 + vsk / 100)) + ' kr</b>' +
                '<span>' + fmt(ex) + ' án vsk · ' + vsk + '%</span></div>' +
              '<button class="_vp2-pick" type="button">Velja</button>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>';
      }).join('');
    }

    let t = 0;
    input.addEventListener('input', e => {
      term = e.target.value;
      clr.style.display = term ? '' : 'none';
      clearTimeout(t); t = setTimeout(render, 130);
    });
    clr.addEventListener('click', () => { term = ''; input.value = ''; clr.style.display = 'none'; render(); input.focus(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = listEl.querySelector('._vp2-row');
        if (first) first.click();
      }
    });

    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('._vp2-x') || e.target.closest('#_vp2-cancel')) { close(); return; }
      const mode = e.target.closest('button[data-mode]');
      if (mode) {
        if (mode.dataset.mode === 'tiles') { setList(false); close(); origOpen(onPick); }
        return;
      }
      const chip = e.target.closest('._vp2-chip');
      if (chip) { const p = items.find(x => x.nafn === chip.dataset.name); if (p) pick(p); return; }
      const gh = e.target.closest('._vp2-gh');
      if (gh) {
        const g = gh.closest('._vp2-grp'), key = g.dataset.grp;
        const now = g.dataset.open !== '1';
        g.dataset.open = now ? '1' : '0';
        if (now) openGroups.add(key); else openGroups.delete(key);
        return;
      }
      const row = e.target.closest('._vp2-row');
      if (row) { const p = items.find(x => String(x.id) === String(row.dataset.id)); if (p) pick(p); }
    });

    setTimeout(() => input.focus(), 60);
    load().then(p => { items = p; render(); });
  }

  // ── Tenging við patch 117 ─────────────────────────────────────────────────
  let origOpen = null;

  function hook() {
    if (!window.VorurPicker || typeof VorurPicker.open !== 'function') { setTimeout(hook, 600); return; }
    if (origOpen) return;
    origOpen = VorurPicker.open.bind(window.VorurPicker);

    VorurPicker.open = function (cb) {
      if (useList()) return openList(cb);
      origOpen(cb);
      // Rofi inn í GÖMLU útgáfuna svo hægt sé að skipta beint yfir.
      setTimeout(() => {
        const dlg = document.getElementById('_vp-dialog');
        if (!dlg || dlg.querySelector('._vp2-tog')) return;
        const x = dlg.querySelector('#_vp-x');
        if (!x || !x.parentElement) return;
        const b = document.createElement('button');
        b.className = '_vp2-tog';
        b.type = 'button';
        b.innerHTML = (window.UIIcons ? UIIcons.svg('list',13) : '') + '<span>Listi</span>';
        b.title = 'Prófa lista-útgáfuna (beta)';
        b.style.cssText = 'margin-right:8px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer';
        b.addEventListener('click', ev => {
          ev.stopPropagation();
          setList(true);
          dlg.remove();
          openList(cb);
        });
        x.parentElement.insertBefore(b, x);
      }, 60);
    };
    console.log('[patch-298] 📋 Vörutíningur — lista-útgáfa tengd (rofi í haus, sjálfgefið gamla útgáfan)');
  }
  hook();

  window.VorurPickerListi = { open: openList, use: useList, setUse: setList };
})();
/* === END VÖRUTÍNINGUR LISTI === */
