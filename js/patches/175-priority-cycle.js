/* === PRIORITY CYCLE (175) ============================================
 *
 * 4-state priority indicator that can be toggled from Fyrirtæki í þjónustu
 * and Leiðsögn. Used for "damage control" — operator marks which forgotten
 * customers to chase first.
 *
 * States: 0 = none (grey, initial), 1 = green (low), 2 = yellow (med), 3 = red (high)
 * Clicking loops through the colours in a circle (green → yellow → red → green …)
 * and never returns to grey once activated — the dot won't erase at the end.
 *
 * Stored on AppSettings.arsskodun_customers[<co_id>].priority.
 *
 * Exposes window.Priority:
 *   - get(coId)          → 0..3
 *   - btnHtml(coId, sz?) → inline-button HTML string with cycling click handler
 *   - cycle(coId, cb?)   → advance to next colour (loops 1→2→3→1), save, optional callback
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

  function _getMap() {
    try {
      return (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    } catch (_) { return {}; }
  }
  function get(coId) {
    const m = _getMap();
    return +(((m[String(coId)] || {}).priority) || 0);
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
        ';transition:transform .12s ease-out"' +
      ' onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'"' +
      '>' + ico + '</button>'
    );
  }

  async function cycle(coId, opts) {
    opts = opts || {};
    const map = _getMap();
    const entry = Object.assign({}, map[String(coId)] || {});
    const cur = +entry.priority || 0;
    // Loop through the three colours in a circle (green → yellow → red → green …)
    // and never fall back to 0/"none" once set — so the dot keeps cycling through
    // colours instead of erasing itself at the end of the cycle. The first click
    // on an unset (grey) dot activates it at green.
    const next = cur === 0 ? 1 : (cur % 3) + 1;
    entry.priority = next;
    const ok = await window.AppSettings.save({
      [STORAGE_KEY]: Object.assign({}, map, { [String(coId)]: entry })
    });
    if (!ok) { alert('Vista mistókst'); return cur; }
    document.dispatchEvent(new CustomEvent('priority-changed', {
      detail: { coId, oldPri: cur, newPri: next }
    }));
    if (typeof opts.callback === 'function') opts.callback(next);
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
    cycle(coId).then(newP => {
      // Optimistically update the button in place so user gets instant feedback
      // even if the consuming view hasn't re-rendered yet.
      b.dataset.pri = newP;
      const color = colorOf(newP);
      const bg = bgOf(newP);
      const ico = newP === 0 ? 'i' : '!';
      b.style.borderColor = color;
      b.style.color = color;
      b.style.background = bg;
      b.style.opacity = newP === 0 ? '.45' : '1';
      b.textContent = ico;
      b.title = 'Forgangur: ' + labelOf(newP) + ' (smelltu til að breyta)';
    });
  }, true);

  window.Priority = {
    _installed: true,
    get, cycle, btnHtml, colorOf, labelOf, bgOf,
    COLORS, LABELS
  };
})();
