/* === PRIORITY CYCLE (175) ============================================
 *
 * 4-state priority indicator that can be toggled from Fyrirtæki í þjónustu
 * and Leiðsögn. Used for "damage control" — operator marks which forgotten
 * customers to chase first.
 *
 * States: 0 = none (grey, initial), 1 = green (low), 2 = yellow (med), 3 = red (high)
 * Clicking loops through all four states in a circle
 * (grey → green → yellow → red → grey …) so the dot CAN be cleared back to grey
 * by cycling one more time past red.
 *
 * Stored on AppSettings.arsskodun_customers[<co_id>].priority.
 *
 * OPTIMISTIC + DEBOUNCED (2026-06): clicking recolours the dot INSTANTLY and
 * the Supabase write is deferred ~1s. Previously every click awaited
 * AppSettings.save (a network round-trip) before recolouring, so rotating the
 * dot felt sluggish. Now the colour rotates immediately; the latest state is
 * flushed to Supabase once the user stops clicking (rapid clicks = one save).
 * `get()` returns the pending (optimistic) value while a save is in flight so
 * any consuming view that re-renders on `priority-changed` shows the new colour
 * too. On save failure we retry; on tab hide/unload we flush immediately.
 *
 * Exposes window.Priority:
 *   - get(coId)          → 0..3 (optimistic-aware)
 *   - btnHtml(coId, sz?) → inline-button HTML string with cycling click handler
 *   - cycle(coId, cb?)   → advance to next state (loops 0→1→2→3→0), optimistic,
 *                          debounced save, optional callback(next)
 *   - colorOf(p)         → CSS color for the dot
 *   - classOf(p)         → class for filtering
 *
 * Click handlers attached via event delegation (single document-level listener).
 * Each consuming view re-renders itself on change via its own listener on the
 * 'priority-changed' CustomEvent.
 * =============================================================== */
(() => {
  if (window.Priority && window.Priority._installed) return;

  const STORAGE_KEY = 'arsskodun_customers';
  const COLORS = ['#cbd5e1', '#16a34a', '#eab308', '#dc2626']; // grey, green, yellow, red
  const LABELS = ['Enginn forgangur', 'Lágur', 'Miðlungs', 'HÁR — leysa strax'];
  const BG     = ['#f8fafc', '#dcfce7', '#fef3c7', '#fee2e2'];

  const SAVE_DELAY = 1000; // ms — debounce window so rapid clicks save once

  // Optimistic state not yet confirmed saved to Supabase. While a coId has a
  // pending value, get() returns it so the UI is instantly consistent.
  const _pending = {};     // { [coId]: priority 0..3 }
  let _saveTimer = null;

  function _getMap() {
    try {
      return (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    } catch (_) { return {}; }
  }
  function get(coId) {
    const k = String(coId);
    if (Object.prototype.hasOwnProperty.call(_pending, k)) return +_pending[k] || 0;
    const m = _getMap();
    return +(((m[k] || {}).priority) || 0);
  }
  function colorOf(p) { return COLORS[p|0] || COLORS[0]; }
  function labelOf(p) { return LABELS[p|0] || LABELS[0]; }
  function bgOf(p)    { return BG[p|0] || BG[0]; }

  /** Returns HTML for an inline cycle button.
   *  Default sz = 18 (small badge-style). Sz = 22 = bigger for popups. */
  function btnHtml(coId, sz) {
    sz = +sz || 18;
    const p = get(coId);
    const ico = p === 0 ? 'i' : '!';
    const color = colorOf(p);
    const bg = bgOf(p);
    const opacity = p === 0 ? '.45' : '1';
    return (
      '<button class="_pri-btn" data-co-id="' + coId + '" data-pri="' + p + '" type="button" ' +
      'title="Forgangur: ' + labelOf(p) + ' (smelltu til að breyta)" ' +
      'style="display:inline-flex;align-items:center;justify-content:center;' +
        'width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;border:1.5px solid ' + color + ';' +
        'background:' + bg + ';color:' + color + ';' +
        'font:700 ' + Math.max(10, sz - 6) + 'px/' + sz + 'px serif;' +
        'cursor:pointer;padding:0;flex-shrink:0;opacity:' + opacity +
        ';transition:background-color .15s ease-out,border-color .15s ease-out,color .15s ease-out,transform .12s ease-out"' +
      ' onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'"' +
      '>' + ico + '</button>'
    );
  }

  // Repaint every on-screen dot for a coId (card + list + popup may all show one).
  function _paint(coId) {
    const p = get(coId);
    const color = colorOf(p), bg = bgOf(p), ico = p === 0 ? 'i' : '!';
    document.querySelectorAll('._pri-btn[data-co-id="' + (window.CSS && CSS.escape ? CSS.escape(String(coId)) : coId) + '"]').forEach(b => {
      b.dataset.pri = p;
      b.style.borderColor = color;
      b.style.color = color;
      b.style.background = bg;
      b.style.opacity = p === 0 ? '.45' : '1';
      b.textContent = ico;
      b.title = 'Forgangur: ' + labelOf(p) + ' (smelltu til að breyta)';
    });
  }

  function _scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flush, SAVE_DELAY);
  }

  // Push all pending priorities to Supabase in one write.
  async function _flush() {
    _saveTimer = null;
    const snapshot = Object.assign({}, _pending);
    const keys = Object.keys(snapshot);
    if (!keys.length) return;
    if (!(window.AppSettings && window.AppSettings.save)) { _scheduleSave(); return; }

    const map = _getMap();
    const merged = Object.assign({}, map);
    keys.forEach(k => { merged[k] = Object.assign({}, map[k] || {}, { priority: snapshot[k] }); });

    let ok = false;
    try { ok = await window.AppSettings.save({ [STORAGE_KEY]: merged }); }
    catch (_) { ok = false; }

    if (ok) {
      // Clear only keys whose value is unchanged since we snapshotted — a click
      // during the await stays pending and triggers another save.
      keys.forEach(k => { if (_pending[k] === snapshot[k]) delete _pending[k]; });
    } else {
      alert('Forgangsröðun: vista mistókst — reyni aftur eftir andartak.');
      _scheduleSave(); // retry; pending kept
    }
  }

  // Advance one step, paint instantly, debounce the save. Returns the new state.
  function cycle(coId, opts) {
    opts = opts || {};
    const k = String(coId);
    const cur = get(k);
    const next = (cur + 1) % 4;     // grey → green → yellow → red → grey …
    _pending[k] = next;
    _paint(k);
    document.dispatchEvent(new CustomEvent('priority-changed', {
      detail: { coId: k, oldPri: cur, newPri: next, pending: true }
    }));
    if (typeof opts.callback === 'function') opts.callback(next);
    _scheduleSave();
    return next;
  }

  // Single document-level delegate so the button works in ANY view —
  // Fyrirtæki í þjónustu cards/table, Leiðsögn popup/list, future views.
  document.addEventListener('click', e => {
    const b = e.target && (e.target.closest && e.target.closest('._pri-btn'));
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const coId = b.dataset.coId;
    if (!coId) return;
    cycle(coId); // instant recolour + debounced save
  }, true);

  // Don't lose a debounced save if the tab is hidden or closed mid-window.
  // (Fire-and-forget — can't await during unload, but kicks off the request.)
  function _flushNow() { if (_saveTimer) { clearTimeout(_saveTimer); _flush(); } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') _flushNow(); });
  window.addEventListener('pagehide', _flushNow);

  window.Priority = {
    _installed: true,
    get, cycle, btnHtml, colorOf, labelOf, bgOf,
    COLORS, LABELS
  };
})();
