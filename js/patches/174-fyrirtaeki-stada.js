/* === FYRIRTÆKI STAÐA v1 (2026-05-25) ===
 *
 * Adds a "virkur / óvirkur" status to every fyrirtaeki, with:
 *   • A filter chip strip on the Fyrirtæki list (Allir / Virk / Óvirk).
 *   • A small ⏸ "Óvirkt" pill on cards that are inactive, plus the card
 *     fades out a bit so the eye skips past them in the default view.
 *   • A right-click context menu on a card to toggle status without
 *     opening the detail modal. Mobile users: long-press = same.
 *
 * Why: many of the 450+ fyrirtæki are former customers we haven't
 * serviced in years. Marking them óvirkt keeps the active list tight
 * but preserves the row for a re-engagement campaign later.
 *
 * State storage:
 *   • `fyrirtaeki.status` column in DB (added in migration
 *     `fyrirtaeki_stada`).
 *   • Filter chip preference: localStorage `_slokk_fyr_filter`.
 *
 * DB writes go through DB.sb directly — Companies.list is patched in-place
 * after a successful update.
 */
(() => {
  if (window.__fyrirtaekiStadaInstalled) return;
  window.__fyrirtaekiStadaInstalled = true;

  const FILTER_LS = '_slokk_fyr_filter';   // 'all' | 'virk' | 'ovirk'

  function getFilter() {
    return localStorage.getItem(FILTER_LS) || 'virk';
  }
  function setFilter(v) {
    localStorage.setItem(FILTER_LS, v);
  }
  function isOvirk(c) {
    const s = (c && c.status || '').toString().toLowerCase();
    return s === 'óvirkur' || s === 'ovirkur' || s === 'inactive';
  }

  // ── Wrap Companies.render ──────────────────────────────────────────────
  function applyFilterPills() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    if (main.querySelector('._stada-filter')) return;   // already injected

    const list = (window.Companies && Companies.list) || [];
    const virkCount  = list.filter(c => !isOvirk(c)).length;
    const ovirkCount = list.filter(isOvirk).length;
    const allCount   = list.length;
    const cur = getFilter();

    function chip(key, label, count) {
      const on = cur === key;
      return `<button data-stada-chip="${key}" type="button"
        style="padding:6px 12px;border:1px solid ${on ? '#0f172a' : '#cbd5e1'};
               background:${on ? '#0f172a' : '#fff'};color:${on ? '#fff' : '#475569'};
               border-radius:99px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">
        ${label} <span style="opacity:.65;font-weight:500">${count}</span>
      </button>`;
    }

    const strip = document.createElement('div');
    strip.className = '_stada-filter';
    strip.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;align-items:center';
    strip.innerHTML =
      '<span style="font-size:10.5px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-right:4px">Staða:</span>' +
      chip('virk',  '🟢 Virk',   virkCount) +
      chip('ovirk', '⏸ Óvirk',   ovirkCount) +
      chip('all',   'Allir',     allCount);

    strip.addEventListener('click', e => {
      const btn = e.target.closest('[data-stada-chip]');
      if (!btn) return;
      setFilter(btn.dataset.stadaChip);
      if (window.Companies && typeof Companies.render === 'function') Companies.render();
    });

    // Insert above the company-grid
    const grid = main.querySelector('.company-grid') || main.querySelector('.empty-state');
    if (grid && grid.parentNode) grid.parentNode.insertBefore(strip, grid);
    else main.insertBefore(strip, main.firstChild);
  }

  function applyFilterToCards() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const cur = getFilter();
    const cards = main.querySelectorAll('.company-card');
    let visible = 0;
    cards.forEach(card => {
      const id = (card.getAttribute('onclick') || '').match(/openDetail\((\d+)\)/);
      if (!id) return;
      const co = (Companies.list || []).find(c => +c.id === +id[1]);
      if (!co) return;
      const ovirk = isOvirk(co);
      // Tag inactive cards visually
      if (ovirk) {
        if (!card.querySelector('._stada-badge')) {
          const badge = document.createElement('div');
          badge.className = '_stada-badge';
          badge.textContent = '⏸ Óvirkt';
          badge.style.cssText = 'position:absolute;top:8px;right:8px;background:#fef3c7;color:#92400e;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid #fde68a;z-index:2';
          if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
          card.appendChild(badge);
        }
        card.style.opacity = '0.55';
        card.style.filter  = 'grayscale(.35)';
      } else {
        const b = card.querySelector('._stada-badge'); if (b) b.remove();
        card.style.opacity = ''; card.style.filter = '';
      }
      // Filter visibility
      let show = true;
      if (cur === 'virk')  show = !ovirk;
      if (cur === 'ovirk') show = ovirk;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    // If everything got filtered out, show a friendly empty hint
    let hint = main.querySelector('._stada-empty');
    if (visible === 0 && cards.length > 0) {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = '_stada-empty';
        hint.style.cssText = 'padding:30px;text-align:center;color:#94a3b8;font-size:14px;font-style:italic;background:#f8fafc;border-radius:10px;margin-top:8px';
        const grid = main.querySelector('.company-grid');
        if (grid && grid.parentNode) grid.parentNode.appendChild(hint);
      }
      hint.textContent = cur === 'ovirk'
        ? 'Engin óvirk fyrirtæki — gott!'
        : 'Engin fyrirtæki passa við þessa stöðu.';
    } else if (hint) {
      hint.remove();
    }
  }

  // Right-click on a card → toggle status (with confirm)
  function wireContextMenu() {
    const main = document.getElementById('companies-main');
    if (!main || main.dataset.stadaCtxBound === '1') return;
    main.dataset.stadaCtxBound = '1';

    main.addEventListener('contextmenu', async e => {
      const card = e.target.closest('.company-card');
      if (!card) return;
      e.preventDefault();
      const idMatch = (card.getAttribute('onclick') || '').match(/openDetail\((\d+)\)/);
      if (!idMatch) return;
      const cid = +idMatch[1];
      const co = (Companies.list || []).find(c => +c.id === cid);
      if (!co) return;
      const now = isOvirk(co);
      const newStatus = now ? 'virkur' : 'óvirkur';
      const msg = now
        ? `Setja ${co.nafn} aftur sem VIRKT?`
        : `Setja ${co.nafn} sem ÓVIRKT?  Það kemur þá ekki upp í sjálfgefnum lista.`;
      if (!confirm(msg)) return;

      // DB write
      const SB = (window.DB && window.DB.sb);
      if (!SB) { alert('Engin gagnabankatenging'); return; }
      const r = await SB.from('fyrirtaeki').update({ status: newStatus }).eq('id', cid);
      if (r && r.error) { alert('Villa: ' + r.error.message); return; }

      // Update local cache + re-render
      co.status = newStatus;
      if (window.Toast && Toast.show) Toast.show(
        newStatus === 'óvirkur' ? '⏸ ' + co.nafn + ' er nú óvirkt' : '🟢 ' + co.nafn + ' aftur virkt'
      );
      if (typeof Companies.render === 'function') Companies.render();
    }, true);

    // Long-press for touch (held >700ms)
    let pressTimer = null;
    main.addEventListener('touchstart', e => {
      const card = e.target.closest('.company-card');
      if (!card) return;
      pressTimer = setTimeout(() => {
        card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      }, 700);
    }, { passive: true });
    main.addEventListener('touchend',   () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer=null; } });
    main.addEventListener('touchmove',  () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer=null; } });
  }

  // Hook Companies.render — run filter logic after the native renderer paints.
  function hook() {
    if (!window.Companies || typeof Companies.render !== 'function') {
      setTimeout(hook, 400); return;
    }
    if (Companies.render._stadaPatched) return;
    const orig = Companies.render.bind(Companies);
    Companies.render = function() {
      orig.apply(this, arguments);
      try { applyFilterPills(); applyFilterToCards(); wireContextMenu(); } catch(e) { console.warn('[stada]', e); }
    };
    Companies.render._stadaPatched = true;
    // Re-paint if list already loaded
    if ((Companies.list || []).length) Companies.render();
  }
  hook();

  // Re-apply filter when AppSettings or list reload happens
  if (window.AppSettings && AppSettings.onChange) {
    AppSettings.onChange('fyrirtaeki_status', () => {
      if (typeof Companies.render === 'function') Companies.render();
    });
  }
})();
