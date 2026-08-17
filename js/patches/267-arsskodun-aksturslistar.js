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

  // ── Debounced save (2026-07-15, ósk Agnars) ──────────────────────────────
  // Áður vistaðist á HVERJUM smelli (0→1→2→3) og hvert vistun endur-teiknaði →
  // chip-inn „stökk" og erfitt að ná lista 2/3. Nú uppfærir smellurinn bara
  // chip-inn strax; sjálf AppSettings.save keyrir EINU SINNI, 2 sek eftir
  // síðasta smell. `_pending` heldur valda gildinu sýnilegu þótt endur-teiknað
  // sé á meðan.
  const SAVE_DELAY = 2000;
  const _pending = Object.create(null);   // coId → valið akstur-gildi (óvistað)
  const _timers  = Object.create(null);   // coId → vistunar-teljari
  function effectiveAkstur(id) {
    const p = _pending[String(id)];
    return (p != null) ? p : aksturOf(id);
  }
  function scheduleSave(coId) {
    coId = String(coId);
    clearTimeout(_timers[coId]);
    _timers[coId] = setTimeout(async () => {
      delete _timers[coId];
      const v = _pending[coId];
      if (v == null) return;
      const ok = await saveAkstur(coId, v);
      if (ok) delete _pending[coId];        // vistað → aksturOf er nú rétt heimild
      else toast('⚠ Villa við vistun aksturslista');
    }, SAVE_DELAY);
  }

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
  // 2026-08-17 (Agnar: „make akstur red label dark metal.... but add the
  // number 1-2-3"): design v3-vörubíllinn (Lucide-SVG, ekkert emoji skv.
  // handoff-README) — dökkrauður málmur + leiðarnúmer þegar á lista,
  // hvít útlínu-flís (._icbtn-stíllinn) þegar enginn.
  const TRUCK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M3 17h1a2 2 0 0 0 4 0h8a2 2 0 0 0 4 0h1v-5l-3-4h-3V7H3z"/></svg>';
  function styleChip(chip, v) {
    chip.dataset.ak = String(v);
    chip.innerHTML = TRUCK_SVG + (v ? '<b style="font-family:\'Space Mono\',ui-monospace,monospace;font-size:11px;font-weight:700;line-height:1">' + v + '</b>' : '');
    chip.title = v ? ('Akstur ' + v + ' — smelltu til að breyta') : 'Enginn aksturslisti — smelltu til að setja á lista';
    chip.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;gap:3px;flex:none;' +
      'width:44px;box-sizing:border-box;height:24px;padding:0;border-radius:8px;cursor:pointer;' +   // föst breidd → dálkar raðast
      'font:inherit;line-height:1;user-select:none;transition:transform .12s,background .12s;' +
      (v
        ? 'border:1px solid #4d0a08;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.25),inset 0 -2px 4px rgba(0,0,0,.26);'
        : 'border:1px solid #e2e6ed;background:#fff;color:#6b7482;opacity:.9;');
  }
  function makeChip(coId) {
    const chip = document.createElement('span');
    chip.className = '_arsak-chip';
    styleChip(chip, effectiveAkstur(coId));
    chip.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      const cur = +chip.dataset.ak || 0;
      const next = (cur + 1) % 4;            // 0→1→2→3→0
      styleChip(chip, next);                 // strax — engin bið, engin vistun hér
      chip.style.transform = 'scale(1.18)';
      setTimeout(() => { chip.style.transform = 'scale(1)'; }, 130);
      _pending[String(coId)] = next;         // muna valið
      scheduleSave(coId);                    // vista EINU SINNI, 2s eftir síðasta smell
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
          // dedicated akstur column (patch 153, sortable) if present; else fall
          // back to the old status-flex layout so nothing breaks pre-migration.
          host = el.querySelector('td._arsak-cell');
          if (!host) { const lastTd = el.querySelector('td:last-child'); host = (lastTd && lastTd.querySelector('div')) || lastTd; }
        } else if (isCard) {
          host = el.querySelector('div') || el;
        }
        if (!host) return;
        let chip = host.querySelector(':scope > ._arsak-chip') || el.querySelector('._arsak-chip');
        if (!chip) {
          chip = makeChip(id);
          // sit FIRST in the status flex (left of ✓) on rows; append on cards / cell
          if (el.tagName === 'TR' && host.firstChild) host.insertBefore(chip, host.firstChild);
          else host.appendChild(chip);
        } else if (force) {
          styleChip(chip, effectiveAkstur(id));
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
    of: (id) => effectiveAkstur(id),        // núverandi akstur-gildi (m/óvistuðu vali) — fyrir röðun/prentun í patch 153
    cycle: async (id) => { const n = (aksturOf(id) + 1) % 4; await saveAkstur(id, n); decorate(true); return n; },
    version: 'v3'
  };
  console.log('[ars-aksturslistar] v2 (inline chip) installed');
})();
/* === END ARSSKODUN AKSTURSLISTAR === */
