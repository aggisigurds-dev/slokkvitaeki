/* === SIDEBAR COUNT BADGES v1 === */
/* Adds a small numeric badge next to high-signal nav items:
 *   - Þjónustutæki: overdue inspections (red) | due-this-month (orange)
 *   - Afgreiðsla:   active jobs not yet collected
 *   - Verkstæði:    jobs in workshop (received/inprogress)
 *   - Sala:         items in the cart
 *   - Geymsla:      items waiting to be returned
 *   - Lánstæki:     loaned-out (status not 'available')
 * Counts re-evaluate every 4s and on Supabase realtime events.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sidebarCountsInstalled) return;
  window.__sidebarCountsInstalled = true;

  const STYLE_ID = 'sb-counts-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .vnav-btn { position: relative; }
      .sb-badge {
        display: inline-block;
        margin-left: auto;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: #64748b;
        color: #fff;
        font-size: 10.5px;
        font-weight: 700;
        line-height: 18px;
        text-align: center;
        vertical-align: middle;
      }
      .sb-badge.red { background: #dc2626; }
      .sb-badge.orange { background: #ea580c; }
      .sb-badge.green { background: #16a34a; }
      .sb-badge.blue { background: #2563eb; }
      .sb-badge.gray { background: #94a3b8; }
      .sb-badge.zero { display: none; }
    `;
    document.head.appendChild(s);
  }

  function setBadge(viewName, count, color) {
    const btn = document.querySelector(`.vnav-btn[data-view="${viewName}"]`);
    if (!btn) return;
    let badge = btn.querySelector('.sb-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sb-badge';
      btn.appendChild(badge);
    }
    badge.textContent = count > 0 ? String(count) : '';
    badge.classList.remove('red', 'orange', 'green', 'blue', 'gray', 'zero');
    badge.classList.add(count > 0 ? (color || 'gray') : 'zero');
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function in30ISO() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); }

  let _refreshing = false;
  async function refresh() {
    if (!window.DB || !window.DB.sb) return;
    // 2026-05-19: guard against parallel refreshes. DB.loadAll hook fires
    // refresh() once per DB.loadAll completion, and multiple patches call
    // loadAll on boot — without this guard we get 6 simultaneous HEAD
    // count requests × N concurrent refreshes = Supabase 503s. The badge
    // count just needs to be roughly current; skipping overlapping calls
    // is fine.
    if (_refreshing) return;
    _refreshing = true;
    const sb = window.DB.sb;
    try {
      // Þjónustutæki: overdue (next_insp < today) — show red, fall back to "due this month" orange.
      const today = todayISO();
      const d30 = in30ISO();
      const ov = await sb.from('uttaeki').select('id', { count: 'exact', head: true })
        .eq('status', 'active').lt('next_insp', today);
      const ovCount = ov.count || 0;
      if (ovCount > 0) {
        setBadge('field', ovCount, 'red');
      } else {
        const due = await sb.from('uttaeki').select('id', { count: 'exact', head: true })
          .eq('status', 'active').gte('next_insp', today).lte('next_insp', d30);
        setBadge('field', due.count || 0, 'orange');
      }

      // Afgreiðsla: active jobs not yet collected
      const af = await sb.from('verkbeidnir').select('id', { count: 'exact', head: true })
        .neq('status', 'collected');
      setBadge('counter', af.count || 0, 'blue');

      // Verkstæði: jobs in workshop
      const ws = await sb.from('verkbeidnir').select('id', { count: 'exact', head: true })
        .in('status', ['received', 'inprogress']);
      setBadge('workshop', ws.count || 0, 'orange');

      // Lánstæki: loaned-out
      const ln = await sb.from('lanstaeki').select('id', { count: 'exact', head: true })
        .neq('status', 'available').neq('status', 'Laust');
      setBadge('lanstaeki', ln.count || 0, 'gray');

      // Geymsla: items in storage (no archived flag, count all)
      const gy = await sb.from('lanstaeki').select('id', { count: 'exact', head: true })
        .ilike('status', '%geym%');
      setBadge('geymsla', gy.count || 0, 'gray');
    } catch (e) {
      console.warn('[sb-counts] refresh failed', e);
    } finally {
      _refreshing = false;
    }
  }

  function refreshCart() {
    // Read live cart count from POS state
    if (window.POS && typeof POS.getState === 'function') {
      const st = POS.getState();
      const n = (st && Array.isArray(st.lines))
        ? st.lines.reduce((s, l) => s + (+l.qty || 0), 0)
        : 0;
      setBadge('sala', n, 'green');
    }
  }

  // Hook DB.loadAll if present, so counts re-fetch when realtime fires
  function hookRealtime() {
    if (!window.DB) return;
    const orig = DB.loadAll;
    if (orig && !DB.loadAll.__sbBadgeHook) {
      DB.loadAll = async function () {
        const r = await orig.apply(this, arguments);
        refresh();
        return r;
      };
      DB.loadAll.__sbBadgeHook = true;
    }
  }

  function start() {
    refresh();
    refreshCart();
    setInterval(refreshCart, 1500);
    setInterval(refresh, 30000);
    hookRealtime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1500));
  } else {
    setTimeout(start, 1500);
  }
  console.log('[sb-counts] installed');
})();
/* === END SIDEBAR COUNT BADGES === */
