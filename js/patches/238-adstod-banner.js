/* === AÐSTOÐAR-SPJALD — 🤖 í banner-i + watchlist v1 (238) ====================
 *
 * Fasi 1B af „Aðstoðarmaður"-vísíón (Agnar 2026-06-29).
 *
 * Lítill 🤖 takki birtist í Brunastál-bannernum rétt fyrir klukkuna. Smella
 * opnar lítið spjald með:
 *   1. Toggle „Sýna dots [👁]" — felur/sýnir customer-brief dotana (patch 237)
 *   2. „🔔 Mín watchlist" — listi af punktum sem Agnar hefur skráð
 *   3. „➕ Bæta við punkti" — form með 4 flokk-chip-um:
 *      🔔 Áminning · 🎯 Mynstur · ⚖️ Regla · 🐛 Bug
 *      + titill (alltaf) + valkv. lýsing + valkv. target (kt/sendandi)
 *   4. Hver lista-röð: kafla-merki + titill + 🗑 eyða
 *
 * Geymsla: localStorage `adstod_watchlist_v1` (array af items með id+created_at).
 * Síðar (Fasi 3): sync í Supabase `adstod_rules`/`adstod_tips` + AI les þá í
 * daglegri yfirferð.
 *
 * Insertion: leitar að `.bb-clockbox` í banner og setur 🤖 takkann sem
 * systkini RIGHT BEFORE clockboxinu. Mutation observer endurtekur insertion
 * þegar banner er endurbyggt (brunastal toggle, view-skipti).
 *
 * Engin AI-call ennþá — bara safnar gögnum. Public API:
 *   window.AdstodHub = { open(), close(), addWatch(item), listWatch(),
 *                        removeWatch(id), exportJSON() }
 * ========================================================================== */
(() => {
  if (window.__adstodBannerInstalled) return;
  window.__adstodBannerInstalled = true;

  const WATCH_KEY = 'adstod_watchlist_v1';
  const PANEL_ID = '_ad-panel';
  const BTN_ID = '_ad-aibtn';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function newId() { return 'w_' + Math.random().toString(36).slice(2, 9); }
  function nowISO() { return new Date().toISOString(); }
  function loadWatch() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]') || []; }
    catch (_) { return []; }
  }
  function saveWatch(list) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)); } catch (_) {}
  }

  const CATEGORIES = [
    { k: 'remind', ico: '🔔', label: 'Áminning', desc: 'Eitt skipti todo' },
    { k: 'pattern', ico: '🎯', label: 'Mynstur',  desc: 'Endurtekið vandamál sem AI á að vakta' },
    { k: 'rule',    ico: '⚖️', label: 'Regla',    desc: 'Sleppa/breyta hegðun (suppress)' },
    { k: 'bug',     ico: '🐛', label: 'Bug',      desc: 'Kerfisvilla' },
  ];

  function styles() {
    if (document.getElementById('_ad-styles')) return;
    const css = `
.ad-aibtn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(145deg,#1e2740,#0b1226);color:#7ab8ff;font-size:17px;line-height:1;cursor:pointer;margin:0 8px 0 4px;padding:0;box-shadow:0 0 0 1px rgba(122,184,255,.15) inset, 0 1px 3px rgba(0,0,0,.4);transition:transform .12s,background .12s;flex-shrink:0;position:relative}
.ad-aibtn:hover{transform:scale(1.06);background:linear-gradient(145deg,#283456,#0e1834)}
.ad-aibtn.open{background:linear-gradient(145deg,#7ab8ff,#3b82f6);color:#0b1226}
.ad-aibtn .ad-count{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#dc2626;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid #1e2740;line-height:1}
.ad-aibtn .ad-count:empty{display:none}
.ad-panel{position:fixed;z-index:100060;background:var(--surface,#fff);color:var(--ink1,#0f172a);border:1px solid var(--brd,#e6eaf0);border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.25);width:min(360px,calc(100vw - 24px));max-height:min(80vh,560px);display:flex;flex-direction:column;overflow:hidden;animation:adp-in .14s ease-out}
@keyframes adp-in{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}
.ad-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 14px;background:var(--surface2,#f8fafc);border-bottom:1px solid var(--brd,#e6eaf0)}
.ad-hd h4{margin:0;font-size:14px;font-weight:800;letter-spacing:-.01em}
.ad-x{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink3,#94a3b8);line-height:1;padding:2px 6px}
.ad-bd{flex:1;overflow-y:auto;padding:10px 14px 14px}
.ad-sec{margin-bottom:14px}
.ad-sec-h{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#94a3b8);font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
.ad-tog{display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:9px;cursor:pointer;user-select:none}
.ad-tog input{margin:0;cursor:pointer}
.ad-tog .lbl{flex:1;font-size:13px;font-weight:600;color:var(--ink1,#0f172a)}
.ad-tog .sub{font-size:11.5px;color:var(--ink3,#94a3b8);margin-top:1px}
.ad-list{display:flex;flex-direction:column;gap:5px}
.ad-row{display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border:1px solid var(--brd,#eef1f5);border-radius:9px;background:var(--surface,#fff)}
.ad-row .ad-cat{flex-shrink:0;font-size:15px;line-height:1.2}
.ad-row .ad-body{flex:1;min-width:0}
.ad-row .ad-title{font-size:13px;font-weight:600;color:var(--ink1,#0f172a);line-height:1.3;word-break:break-word}
.ad-row .ad-meta{font-size:11px;color:var(--ink3,#94a3b8);margin-top:2px}
.ad-row .ad-del{flex-shrink:0;background:none;border:none;color:var(--ink3,#94a3b8);font-size:14px;cursor:pointer;padding:2px 4px;border-radius:5px;line-height:1}
.ad-row .ad-del:hover{color:#dc2626;background:#fef2f2}
.ad-empty{padding:14px;text-align:center;color:var(--ink3,#94a3b8);font-size:12.5px;font-style:italic}
.ad-add{margin-top:8px;width:100%;padding:9px 12px;background:var(--brand,#0d6efd);color:#fff;border:none;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
.ad-add:hover{filter:brightness(1.07)}
.ad-form{margin-top:8px;padding:10px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:10px;display:flex;flex-direction:column;gap:8px}
.ad-chips{display:flex;gap:5px;flex-wrap:wrap}
.ad-chip{padding:5px 10px;border-radius:99px;border:1px solid var(--brd,#cbd5e1);background:var(--surface,#fff);color:var(--ink2,#475569);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.ad-chip.on{background:var(--brand,#0d6efd);color:#fff;border-color:var(--brand,#0d6efd)}
.ad-in{border:1px solid var(--brd,#cbd5e1);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;background:var(--surface,#fff);color:var(--ink1,#0f172a);outline:none;box-sizing:border-box;width:100%}
.ad-in:focus{border-color:var(--brand,#0d6efd);box-shadow:0 0 0 3px rgba(13,110,253,.15)}
.ad-row2{display:flex;gap:6px}
.ad-row2 .ad-in{flex:1}
.ad-actions{display:flex;justify-content:flex-end;gap:6px}
.ad-btn{padding:7px 13px;border:none;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.ad-btn.go{background:#16a34a;color:#fff}
.ad-btn.alt{background:var(--surface,#fff);border:1px solid var(--brd,#cbd5e1);color:var(--ink2,#475569)}
.ad-foot{font-size:11px;color:var(--ink3,#94a3b8);padding:8px 14px;border-top:1px solid var(--brd,#eef1f5);background:var(--surface2,#f8fafc);text-align:center}
.ad-foot code{font-size:10.5px;background:rgba(0,0,0,.05);padding:1px 5px;border-radius:4px}
`;
    const tag = document.createElement('style');
    tag.id = '_ad-styles'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── public storage API ───────────────────────────────────────────────────
  function addWatch(partial) {
    const item = Object.assign({
      id: newId(), created_at: nowISO(), status: 'open',
      category: 'pattern', severity: 'info', title: '', body: '',
      target_kind: null, target_value: null,
    }, partial || {});
    if (!item.title) throw new Error('title required');
    const list = loadWatch();
    list.unshift(item);
    saveWatch(list);
    updateBadge();
    if (document.getElementById(PANEL_ID)) renderPanel();
    return item;
  }
  function removeWatch(id) {
    const list = loadWatch().filter(x => x.id !== id);
    saveWatch(list);
    updateBadge();
    if (document.getElementById(PANEL_ID)) renderPanel();
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(loadWatch(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'adstod-watchlist.json';
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100);
  }

  function updateBadge() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const count = loadWatch().filter(x => x.status === 'open').length;
    const badge = btn.querySelector('.ad-count');
    if (badge) badge.textContent = count > 0 ? String(count) : '';
  }

  // ── panel render ─────────────────────────────────────────────────────────
  function closePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) p.remove();
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.classList.remove('open');
    document.removeEventListener('click', _outsideClick, true);
    document.removeEventListener('keydown', _esc, true);
  }
  function _outsideClick(e) {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    if (p.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#' + BTN_ID)) return;
    closePanel();
  }
  function _esc(e) { if (e.key === 'Escape') closePanel(); }

  let _formOpen = false;
  let _formCategory = 'pattern';

  function renderPanel() {
    styles();
    let p = document.getElementById(PANEL_ID);
    if (!p) {
      p = document.createElement('div');
      p.id = PANEL_ID;
      p.className = 'ad-panel';
      document.body.appendChild(p);
      placePanel();
      window.addEventListener('resize', placePanel);
    }
    const list = loadWatch();
    const dotsHidden = window.CustomerBrief && CustomerBrief.getDotsHidden && CustomerBrief.getDotsHidden();

    const chips = CATEGORIES.map(c =>
      '<button class="ad-chip' + (c.k === _formCategory ? ' on' : '') + '" data-cat="' + c.k + '" title="' + esc(c.desc) + '">' + c.ico + ' ' + esc(c.label) + '</button>'
    ).join('');
    const formHTML = _formOpen ? (
      '<div class="ad-form">' +
        '<div class="ad-chips">' + chips + '</div>' +
        '<input class="ad-in" id="_ad-title" placeholder="t.d. Skýrslur á röngum stöðum" maxlength="120" autocomplete="off">' +
        '<div class="ad-row2">' +
          '<input class="ad-in" id="_ad-target" placeholder="(valkv.) kennitala / sendandi" maxlength="80" autocomplete="off">' +
        '</div>' +
        '<textarea class="ad-in" id="_ad-body" placeholder="(valkv.) lýsing / dæmi" rows="2" style="resize:vertical;min-height:50px"></textarea>' +
        '<div class="ad-actions">' +
          '<button class="ad-btn alt" type="button" id="_ad-cancel">Hætta við</button>' +
          '<button class="ad-btn go" type="button" id="_ad-save">💾 Bæta við</button>' +
        '</div>' +
      '</div>'
    ) : '<button class="ad-add" type="button" id="_ad-open-form">➕ Bæta við punkti</button>';

    const listHTML = list.length === 0
      ? '<div class="ad-empty">Engir punktar ennþá. Bættu við þínum fyrsta.</div>'
      : '<div class="ad-list">' + list.map(it => {
          const cat = CATEGORIES.find(c => c.k === it.category) || CATEGORIES[1];
          const meta = [
            cat.label,
            it.target_value ? esc(it.target_value) : null,
            it.body ? esc(it.body).slice(0, 80) + (it.body.length > 80 ? '…' : '') : null,
          ].filter(Boolean).join(' · ');
          return '<div class="ad-row">' +
            '<div class="ad-cat" title="' + esc(cat.label) + '">' + cat.ico + '</div>' +
            '<div class="ad-body"><div class="ad-title">' + esc(it.title) + '</div>' +
              '<div class="ad-meta">' + meta + '</div></div>' +
            '<button class="ad-del" type="button" data-del="' + esc(it.id) + '" title="Eyða">×</button>' +
          '</div>';
        }).join('') + '</div>';

    p.innerHTML =
      '<div class="ad-hd"><h4>🤖 Aðstoðarmaður</h4><button class="ad-x" type="button" id="_ad-x" aria-label="Loka">✕</button></div>' +
      '<div class="ad-bd">' +
        '<div class="ad-sec">' +
          '<label class="ad-tog">' +
            '<input type="checkbox" id="_ad-dots"' + (dotsHidden ? '' : ' checked') + '>' +
            '<div class="lbl">Sýna dots á kúnnum<div class="sub">👁 lítill rauður/amber dot á þeim sem þurfa athygli</div></div>' +
          '</label>' +
        '</div>' +
        '<div class="ad-sec">' +
          '<div class="ad-sec-h"><span>🔔 Mín watchlist (' + list.length + ')</span>' +
            (list.length > 0 ? '<button class="ad-btn alt" type="button" id="_ad-export" style="padding:2px 8px;font-size:10.5px;font-weight:600">⤓ Flytja út</button>' : '') +
          '</div>' +
          listHTML +
          formHTML +
        '</div>' +
      '</div>' +
      '<div class="ad-foot">Vistað staðbundið. AI mun lesa í næstu yfirferð (Fasi 2).</div>';

    // Wire events
    p.querySelector('#_ad-x').addEventListener('click', closePanel);
    const dotsCb = p.querySelector('#_ad-dots');
    if (dotsCb) dotsCb.addEventListener('change', () => {
      if (window.CustomerBrief && CustomerBrief.setDotsHidden) CustomerBrief.setDotsHidden(!dotsCb.checked);
    });
    p.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => removeWatch(b.dataset.del)));
    const ex = p.querySelector('#_ad-export'); if (ex) ex.addEventListener('click', exportJSON);

    if (_formOpen) {
      p.querySelectorAll('[data-cat]').forEach(c => c.addEventListener('click', () => {
        _formCategory = c.dataset.cat; renderPanel();
        setTimeout(() => { const t = document.getElementById('_ad-title'); if (t) t.focus(); }, 20);
      }));
      p.querySelector('#_ad-cancel').addEventListener('click', () => { _formOpen = false; renderPanel(); });
      const submit = () => {
        const t = p.querySelector('#_ad-title').value.trim();
        if (!t) { p.querySelector('#_ad-title').focus(); return; }
        try {
          addWatch({
            category: _formCategory,
            title: t,
            target_value: p.querySelector('#_ad-target').value.trim() || null,
            body: p.querySelector('#_ad-body').value.trim() || null,
          });
          _formOpen = false; renderPanel();
        } catch (e) { console.warn('addWatch', e); }
      };
      p.querySelector('#_ad-save').addEventListener('click', submit);
      p.querySelector('#_ad-title').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); });
      setTimeout(() => { try { p.querySelector('#_ad-title').focus(); } catch (_) {} }, 30);
    } else {
      p.querySelector('#_ad-open-form').addEventListener('click', () => { _formOpen = true; renderPanel(); });
    }
  }

  function placePanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    const btn = document.getElementById(BTN_ID);
    const margin = 10;
    const pr = p.getBoundingClientRect();
    let top, left;
    if (btn) {
      const br = btn.getBoundingClientRect();
      top = br.bottom + 8;
      left = Math.min(window.innerWidth - pr.width - margin, br.right - pr.width);
      if (left < margin) left = margin;
    } else {
      top = 60; left = window.innerWidth - pr.width - margin;
    }
    if (top + pr.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - pr.height - margin);
    p.style.top = top + 'px';
    p.style.left = left + 'px';
  }

  function togglePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) { closePanel(); return; }
    _formOpen = false;
    renderPanel();
    const btn = document.getElementById(BTN_ID); if (btn) btn.classList.add('open');
    setTimeout(() => {
      document.addEventListener('click', _outsideClick, true);
      document.addEventListener('keydown', _esc, true);
    }, 50);
  }

  // ── insertion: stick the 🤖 button beside the banner clock ────────────────
  function ensureBtn() {
    if (document.getElementById(BTN_ID)) return;
    // Brunastál banner: insert as sibling RIGHT BEFORE .bb-clockbox
    const clockbox = document.querySelector('.bb-clockbox');
    if (clockbox && clockbox.parentNode) {
      styles();
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.className = 'ad-aibtn';
      btn.title = 'Aðstoðarmaður — watchlist og dot-stillingar';
      btn.setAttribute('aria-label', 'Aðstoðarmaður');
      btn.innerHTML = '🤖<span class="ad-count"></span>';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
      clockbox.parentNode.insertBefore(btn, clockbox);
      updateBadge();
      return;
    }
    // Brunastál is off — append next to floating 🔥 restore button
    const restore = document.getElementById('bstal-restore');
    if (restore && restore.style.display !== 'none') {
      styles();
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.className = 'ad-aibtn';
      btn.title = 'Aðstoðarmaður';
      btn.innerHTML = '🤖<span class="ad-count"></span>';
      btn.style.cssText += ';position:fixed;right:64px;top:14px;z-index:9998;width:40px;height:40px;border-radius:11px;margin:0';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
      document.body.appendChild(btn);
      updateBadge();
    }
  }

  function bootObserver() {
    ensureBtn();
    const obs = new MutationObserver(() => {
      // Banner gets re-built on theme change / view switch — re-attach if needed.
      if (!document.getElementById(BTN_ID)) ensureBtn();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Re-attempt a few times in case banner is built late
    [400, 1200, 3000].forEach(ms => setTimeout(ensureBtn, ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootObserver);
  else bootObserver();

  // public API
  window.AdstodHub = {
    open: () => { if (!document.getElementById(PANEL_ID)) togglePanel(); },
    close: closePanel,
    toggle: togglePanel,
    addWatch, removeWatch, listWatch: loadWatch, exportJSON,
  };
})();
