/* === SALA VÖRULISTI (BETA) v1 — patch 297, 2026-08-05 =======================
 *
 * Önnur útgáfa af vöru-svæðinu í Sölu (ósk Agnars, mockup 2026-08-05):
 * leitarreitur efst sem grípur lyklaborðið strax + hreinn listi í fellilistum
 * eftir vöruflokki, í staðinn fyrir flísaveggina tvo.
 *
 *   • Ein leit yfir ALLT — þjónustu og vörur í einu, með gulmerktum
 *     stafasamsvörunum. Flokkar opnast sjálfkrafa á meðan leitað er.
 *   • Hver lína sýnir verð m/VSK stórt og án VSK undir, lagerstöðu á vörum
 *     og „Þjónustuliður" á þjónustu.
 *   • „Velja" leggur línuna í körfuna nákvæmlega eins og flísarnar gera.
 *
 * SLÖKKT SJÁLFGEFIÐ. Rofinn „🔲 Flísar / 📋 Listi" situr efst á vörusvæðinu
 * og valið geymist í localStorage (`pos_vorulisti_beta`) — engin breyting á
 * daglegri notkun nema kveikt sé á honum.
 *
 * Snertir hvorki pos.js né körfuna: les `POS.getState()` og setur línur með
 * sömu reitum og pos.js gerir (`type/desc/qty/unit_price_ex_vat/vsk_pct/
 * product_id/ref`), svo tilboðsverð (113), sjálfvirkur afsláttur (255) og
 * afsláttarhópar (296) virka óbreytt ofan á.
 * ========================================================================== */
(() => {
  if (window.__salaVorulistiBeta) return;
  window.__salaVorulistiBeta = true;

  const KEY = 'pos_vorulisti_beta';
  const on = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const setOn = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {} };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kr = n => Math.round(+n || 0).toLocaleString('is-IS') + ' kr';
  const norm = s => String(s || '').toLowerCase();

  let term = '';
  const openGroups = new Set();

  // ── Stílar (dökka spjaldið úr mockup-inu, í einangruðum klösum) ───────────
  function injectCSS() {
    if (document.getElementById('_vlb-css')) return;
    const s = document.createElement('style');
    s.id = '_vlb-css';
    s.textContent = `
._vlb{background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(2,6,23,.6);margin-bottom:14px}
._vlb-top{display:flex;gap:12px;align-items:center;padding:14px;border-bottom:1px solid #1e293b;background:rgba(2,6,23,.5)}
._vlb-search{position:relative;flex:1;min-width:0}
._vlb-search input{width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:12px;padding:12px 34px 12px 34px;font:inherit;font-size:14px;font-weight:500;outline:none;transition:border-color .15s,box-shadow .15s}
._vlb-search input::placeholder{color:#64748b}
._vlb-search input:focus{border-color:#3b82f6;box-shadow:0 0 0 1px #3b82f6}
._vlb-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#64748b;font-size:14px;pointer-events:none}
._vlb-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:15px;padding:4px 6px;line-height:1}
._vlb-clear:hover{color:#cbd5e1}
._vlb-vsk{text-align:right;font-size:11px;background:#0f172a;padding:7px 11px;border-radius:9px;border:1px solid #1e293b;white-space:nowrap}
._vlb-vsk b{color:#34d399;display:block;font-size:12px}
._vlb-vsk span{color:#94a3b8;font-family:'Space Mono',monospace}
._vlb-list{max-height:min(620px,60vh);overflow-y:auto}
._vlb-grp{border-top:1px solid #1e293b}
._vlb-grp:first-child{border-top:none}
._vlb-hd{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 15px;background:rgba(15,23,42,.4);border:none;cursor:pointer;color:#cbd5e1;font:inherit;font-size:13.5px;font-weight:700;text-align:left;transition:background .15s,color .15s}
._vlb-hd:hover{background:rgba(30,41,59,.6);color:#fff}
._vlb-cnt{color:#64748b;font-family:'Space Mono',monospace;font-size:11px;font-weight:400}
._vlb-arrow{color:#64748b;transition:transform .18s;font-size:11px}
._vlb-grp[data-open="1"] ._vlb-arrow{transform:rotate(180deg)}
._vlb-body{background:rgba(2,6,23,.45)}
._vlb-grp:not([data-open="1"]) ._vlb-body{display:none}
._vlb-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 15px 11px 30px;border-top:1px solid rgba(30,41,59,.7);transition:background .12s}
._vlb-row:hover{background:rgba(30,41,59,.35)}
._vlb-nm{font-size:12.5px;font-weight:600;color:#e2e8f0;line-height:1.3}
._vlb-row:hover ._vlb-nm{color:#60a5fa}
._vlb-sub{font-size:10px;color:#64748b;margin-top:2px}
._vlb-sub b{color:#94a3b8}
._vlb-svc{color:#f59e0b}
._vlb-pr{text-align:right;font-family:'Space Mono',monospace;white-space:nowrap}
._vlb-pr b{display:block;font-size:13px;color:#e2e8f0}
._vlb-pr span{display:block;font-size:10px;color:#64748b}
._vlb-add{background:rgba(37,99,235,.12);border:1px solid rgba(59,130,246,.35);color:#60a5fa;padding:8px 13px;border-radius:9px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;transition:all .15s}
._vlb-add:hover{background:#2563eb;border-color:#3b82f6;color:#fff}
._vlb-add:active{transform:scale(.95)}
._vlb-mark{background:rgba(16,185,129,.2);color:#34d399;border-radius:3px;padding:0 2px;font-weight:800}
._vlb-empty{padding:26px;text-align:center;color:#64748b;font-size:13px;font-style:italic}
._vlb-switch{display:flex;gap:6px;align-items:center;margin-bottom:10px}
._vlb-switch button{background:#fff;border:1px solid #e2e8f0;color:#64748b;padding:6px 12px;border-radius:9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
._vlb-switch button[data-active="1"]{background:#0f172a;border-color:#0f172a;color:#fff}
._vlb-switch .-beta{margin-left:auto;font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:.04em}
`;
    document.head.appendChild(s);
  }

  // ── Gögn ──────────────────────────────────────────────────────────────────
  function groups() {
    const st = (window.POS && POS.getState && POS.getState()) || {};
    const svc = (st.services || []).map(p => ({ ...p, _svc: true }));
    const prod = (st.products || []).map(p => ({ ...p, _svc: false }));
    const by = new Map();
    svc.concat(prod).forEach(p => {
      const k = (p.flokkur || 'Annað').trim() || 'Annað';
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(p);
    });
    // Þjónusta efst (mest notuð í afgreiðslu), svo stærstu flokkarnir.
    return [...by.entries()]
      .sort((a, b) => (b[0] === 'Þjónusta') - (a[0] === 'Þjónusta') || b[1].length - a[1].length)
      .map(([nafn, items]) => ({ nafn, items: items.sort((x, y) => String(x.nafn).localeCompare(String(y.nafn), 'is')) }));
  }

  function hi(text, q) {
    const t = esc(text);
    if (!q) return t;
    const i = norm(t).indexOf(q);
    if (i < 0) return t;
    return t.slice(0, i) + '<mark class="_vlb-mark">' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length);
  }

  function renderList(box) {
    const q = norm(term).trim();
    const gs = groups().map(g => ({
      nafn: g.nafn,
      items: q ? g.items.filter(p => norm(p.nafn).includes(q) || norm(g.nafn).includes(q)) : g.items
    })).filter(g => !q || g.items.length);

    if (!gs.length) {
      box.innerHTML = '<div class="_vlb-empty">Ekkert fannst fyrir „' + esc(term) + '"</div>';
      return;
    }
    box.innerHTML = gs.map(g => {
      const open = q ? true : openGroups.has(g.nafn);
      return '<div class="_vlb-grp" data-grp="' + esc(g.nafn) + '" data-open="' + (open ? '1' : '0') + '">' +
        '<button class="_vlb-hd" type="button">' +
          '<span><span class="_vlb-cnt">[' + g.items.length + ']</span> ' + hi(g.nafn, q) + '</span>' +
          '<span class="_vlb-arrow">▼</span>' +
        '</button>' +
        '<div class="_vlb-body">' + g.items.map(p => {
          const ex = +p.verd_an_vsk || 0;
          const vsk = p.vsk_prosenta == null ? 24 : +p.vsk_prosenta;
          const inc = ex * (1 + vsk / 100);
          const sub = p._svc
            ? '<div class="_vlb-sub _vlb-svc">Þjónustuliður</div>'
            : '<div class="_vlb-sub">Til á lager: <b>' + (p.birgdir == null ? '—' : p.birgdir) + ' stk.</b></div>';
          return '<div class="_vlb-row">' +
            '<div style="flex:1;min-width:0"><div class="_vlb-nm">' + hi(p.nafn, q) + '</div>' + sub + '</div>' +
            '<div class="_vlb-pr"><b>' + kr(inc) + '</b><span>' + kr(ex) + ' án vsk</span></div>' +
            '<button class="_vlb-add" type="button" data-id="' + p.id + '" data-svc="' + (p._svc ? 1 : 0) + '">Velja</button>' +
          '</div>';
        }).join('') + '</div>' +
      '</div>';
    }).join('');
  }

  // ── Karfa: sama leið og flísarnar (pos.js addProductLine / pos-svc) ───────
  function addLine(id, isSvc) {
    const st = POS.getState();
    const src = isSvc ? (st.services || []) : (st.products || []);
    const p = src.find(x => x.id === id);
    if (!p) return;
    if (!isSvc) {
      const ex = st.lines.find(l => l.type === 'product' && l.product_id === id);
      if (ex) { ex.qty++; POS.rerenderDynamic(); return; }
    }
    st.lines.push({
      type: isSvc ? 'service' : 'product',
      desc: p.nafn, qty: 1,
      unit_price_ex_vat: p.verd_an_vsk,
      vsk_pct: p.vsk_prosenta || 24,
      product_id: p.id, ref: ''
    });
    POS.rerenderDynamic();
  }

  // ── Uppsetning í Sölu ─────────────────────────────────────────────────────
  function tileCards() {
    const s = document.getElementById('pos-services');
    const p = document.getElementById('pos-products');
    return [s && s.parentElement, p && p.parentElement].filter(Boolean);
  }

  function applyMode() {
    const panel = document.getElementById('_vlb-panel');
    const cards = tileCards();
    const listOn = on();
    cards.forEach(c => { if (c.id !== '_vlb-wrap') c.style.display = listOn ? 'none' : ''; });
    if (panel) panel.style.display = listOn ? '' : 'none';
    document.querySelectorAll('._vlb-switch button[data-mode]').forEach(b => {
      b.dataset.active = ((b.dataset.mode === 'list') === listOn) ? '1' : '0';
    });
  }

  function mount() {
    const svc = document.getElementById('pos-services');
    if (!svc) return false;
    const card = svc.parentElement;
    if (!card || !card.parentElement) return false;
    if (document.getElementById('_vlb-wrap')) { applyMode(); return true; }
    injectCSS();

    const wrap = document.createElement('div');
    wrap.id = '_vlb-wrap';
    wrap.innerHTML =
      '<div class="_vlb-switch">' +
        '<button type="button" data-mode="tiles">🔲 Flísar</button>' +
        '<button type="button" data-mode="list">📋 Listi</button>' +
        '<span class="-beta">BETA — prufuútlit</span>' +
      '</div>' +
      '<div class="_vlb" id="_vlb-panel">' +
        '<div class="_vlb-top">' +
          '<div class="_vlb-search">' +
            '<span class="_vlb-ico">🔍</span>' +
            '<input id="_vlb-q" type="text" autocomplete="off" placeholder="Leita að vöru eða þjónustulið (t.d. hleðsla, yfirferð, skynjari)…">' +
            '<button class="_vlb-clear" type="button" style="display:none">✕</button>' +
          '</div>' +
          '<div class="_vlb-vsk"><span>VSK stilling</span><b>24% innifalið</b></div>' +
        '</div>' +
        '<div class="_vlb-list" id="_vlb-list"></div>' +
      '</div>';
    card.parentElement.insertBefore(wrap, card);

    const input = wrap.querySelector('#_vlb-q');
    const clear = wrap.querySelector('._vlb-clear');
    const list = wrap.querySelector('#_vlb-list');
    let t = 0;
    input.addEventListener('input', e => {
      term = e.target.value;
      clear.style.display = term ? '' : 'none';
      clearTimeout(t);
      t = setTimeout(() => renderList(list), 150);
    });
    clear.addEventListener('click', () => { term = ''; input.value = ''; clear.style.display = 'none'; renderList(list); input.focus(); });

    wrap.addEventListener('click', e => {
      const mode = e.target.closest('button[data-mode]');
      if (mode) {
        setOn(mode.dataset.mode === 'list');
        applyMode();
        if (on()) { renderList(list); setTimeout(() => input.focus(), 60); }
        return;
      }
      const hd = e.target.closest('._vlb-hd');
      if (hd) {
        const g = hd.closest('._vlb-grp');
        const key = g.dataset.grp;
        const nowOpen = g.dataset.open !== '1';
        g.dataset.open = nowOpen ? '1' : '0';
        if (nowOpen) openGroups.add(key); else openGroups.delete(key);
        return;
      }
      const add = e.target.closest('._vlb-add');
      if (add) addLine(+add.dataset.id, add.dataset.svc === '1');
    });

    renderList(list);
    applyMode();
    return true;
  }

  function attach() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attach, 800); return; }
    let t = 0;
    new MutationObserver(() => {
      if (!view.classList.contains('active')) return;
      clearTimeout(t);
      t = setTimeout(() => {
        if (!document.getElementById('pos-services')) return;
        const had = !!document.getElementById('_vlb-wrap');
        mount();
        // pos.js endurteiknar flísarnar (rerenderDynamic) — höldum listanum
        // í takt við nýjan vörulista þegar hann hleðst.
        if (had && on()) {
          const list = document.getElementById('_vlb-list');
          if (list && !list.dataset.busy) renderList(list);
        }
      }, 300);
    }).observe(view, { childList: true, subtree: true });
    setTimeout(mount, 1200);
  }
  attach();

  window.SalaVorulistiBeta = { on, setOn: v => { setOn(v); applyMode(); }, mount };
  console.log('[patch-297] 📋 Sala vörulisti (beta) — leit + fellilistar í stað flísa (slökkt sjálfgefið)');
})();
/* === END SALA VÖRULISTI BETA === */
