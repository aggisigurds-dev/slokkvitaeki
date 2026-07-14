/* === ARSSKODUN AKSTURSLISTAR v2 ===
 *
 * Aksturslistar (driving-lists) on the office "Fyrirtæki í Þjónustu"
 * (Ársskoðun) board. The assignment lives in `arsskodun_customers[id].akstur`
 * (0=enginn / 1 / 2 / 3) via AppSettings and syncs with Bílstjóri (patch 219).
 *
 * v2 (2026-07-14, ósk Agnars — „squeeze the aksturslisti into the main board"):
 *   The separate floating panel + 4-button rows are GONE. Instead each company
 *   row/card gets ONE small clickable cycling chip inline (in the status cell,
 *   next to ✓ / status pill):
 *       grey 🚗 (0 = enginn) → 🚗1 → 🚗2 → 🚗3 → back to grey
 *   Grey when unassigned; BRIGHT LIGHT BLUE with the list number when 1/2/3.
 *   Tap rotates + saves (AppSettings deep-merge). No panel, no toggle button.
 *
 * Data: writes `arsskodun_customers[id].akstur` via AppSettings.save
 *   (deep-merge — never deletes other keys; 0 = removed from all lists).
 *
 * Exposed: window.ArsAkstur = { set, cycle, version }
 */
(() => {
  if (window.__arsAksturInstalled) return;
  window.__arsAksturInstalled = true;

  // Grey (0) → bright light blue (1/2/3). One colour for all assigned lists;
  // the NUMBER identifies which akstursleið the company is on.
  const BLUE = { bg: '#38bdf8', bd: '#0ea5e9', fg: '#ffffff' };  // sky
  const GREY = { bg: '#eef2f7', bd: '#cbd5e1', fg: '#94a3b8' };
  let _decorating = false;

  const arsAll = () => (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
  function aksturOf(id) {
    const a = arsAll()[String(id)];
    const v = +((a || {}).akstur) || 0;
    return (v >= 1 && v <= 3) ? v : 0;
  }
  async function saveAkstur(coId, v) {
    if (!window.AppSettings || !AppSettings.save) return false;
    try {
      const ok = await AppSettings.save({ arsskodun_customers: { [String(coId)]: { akstur: v } } });
      const c = window.Arsskodun && window.Arsskodun._cache && window.Arsskodun._cache.byId && window.Arsskodun._cache.byId[coId];
      if (c) { c._ars = c._ars || {}; c._ars.akstur = v; }
      return ok !== false;
    } catch (_) { return false; }
  }

  function toast(msg) {
    if (window.Toast && Toast.show) return Toast.show(msg);
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:9px 16px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99999;max-width:340px;text-align:center';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ── The inline cycling chip ─────────────────────────────────────────────
  function styleChip(chip, v) {
    const c = v ? BLUE : GREY;
    chip.dataset.ak = String(v);
    chip.textContent = v ? ('🚗' + v) : '🚗';
    chip.title = v ? ('Akstur ' + v + ' — smelltu til að breyta') : 'Enginn aksturslisti — smelltu til að setja á lista';
    chip.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;gap:1px;flex:none;' +
      'min-width:' + (v ? '34px' : '30px') + ';height:26px;padding:0 7px;border-radius:99px;cursor:pointer;' +
      'font:inherit;font-size:11.5px;font-weight:800;line-height:1;user-select:none;' +
      'border:1px solid ' + c.bd + ';background:' + c.bg + ';color:' + c.fg + ';' +
      (v ? 'box-shadow:0 1px 4px -1px rgba(14,165,233,.6);' : 'opacity:.85;') +
      'transition:transform .12s,background .12s';
  }
  function makeChip(coId) {
    const chip = document.createElement('span');
    chip.className = '_arsak-chip';
    styleChip(chip, aksturOf(coId));
    chip.addEventListener('click', async (e) => {
      e.stopPropagation(); e.preventDefault();
      const cur = +chip.dataset.ak || 0;
      const next = (cur + 1) % 4;            // 0→1→2→3→0
      styleChip(chip, next);                 // optimistic
      chip.style.transform = 'scale(1.18)';
      setTimeout(() => { chip.style.transform = 'scale(1)'; }, 130);
      const ok = await saveAkstur(coId, next);
      if (!ok) { styleChip(chip, cur); toast('⚠ Villa við vistun'); return; }
      toast(next ? ('🚗 Akstur ' + next) : '↩︎ Tekinn af aksturslista');
    });
    return chip;
  }

  // ── Decorate rows/cards with the chip ────────────────────────────────────
  function decorate(force) {
    if (_decorating) return;
    const main = document.getElementById('ars-main');
    if (!main) return;
    _decorating = true;
    try {
      main.querySelectorAll('[data-co-id]').forEach(el => {
        const id = parseInt(el.dataset.coId, 10);
        if (!id) return;
        const isCard = el.matches('._ars-card');
        // desktop table row → drop the chip into the right-aligned status flex
        // (the last <td>'s flex div, next to ✓ + status pill). Card → header row.
        let host = null;
        if (el.tagName === 'TR') {
          const lastTd = el.querySelector('td:last-child');
          host = (lastTd && lastTd.querySelector('div')) || lastTd;
        } else if (isCard) {
          host = el.querySelector('div') || el;
        }
        if (!host) return;
        let chip = host.querySelector(':scope > ._arsak-chip') || el.querySelector('._arsak-chip');
        if (!chip) {
          chip = makeChip(id);
          // sit FIRST in the status flex (left of ✓) on rows; append on cards
          if (el.tagName === 'TR' && host.firstChild) host.insertBefore(chip, host.firstChild);
          else host.appendChild(chip);
        } else if (force) {
          styleChip(chip, aksturOf(id));
        }
      });
    } finally { _decorating = false; }
  }

  // ── Watch ars-main: keep chips alive across re-renders ───────────────────
  function watch() {
    const main = document.getElementById('ars-main');
    if (!main) { setTimeout(watch, 500); return; }
    decorate(true);
    let t = null;
    new MutationObserver(() => {
      if (_decorating) return;
      clearTimeout(t);
      t = setTimeout(() => decorate(false), 120);
    }).observe(main, { childList: true, subtree: true });
    if (window.AppSettings && AppSettings.onChange) {
      AppSettings.onChange(() => decorate(true));
    }
  }

  function boot() {
    const t = () => {
      if (document.getElementById('ars-main')) { watch(); return; }
      setTimeout(t, 500);
    };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ArsAkstur = {
    set: saveAkstur,
    cycle: async (id) => { const n = (aksturOf(id) + 1) % 4; await saveAkstur(id, n); decorate(true); return n; },
    version: 'v2'
  };
  console.log('[ars-aksturslistar] v2 (inline chip) installed');
})();
/* === END ARSSKODUN AKSTURSLISTAR === */
