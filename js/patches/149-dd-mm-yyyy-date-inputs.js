/* === DD/MM/YYYY DATE INPUTS v1 ===
 *
 * Forces every `<input type="date">` on the page to *display* DD/MM/YYYY
 * regardless of browser/OS locale.
 *
 * Why this exists:
 *   Chrome (and other browsers) render native date inputs using the user's
 *   Chrome language preference, not the page's `lang` attribute or the OS
 *   locale. On Windows boxes where Chrome is set to en-US, every native
 *   date field shows MM/DD/YYYY. There's no way to override this from CSS
 *   or HTML alone.
 *
 * How it works:
 *   - Finds every `<input type="date">` on the page (now and via
 *     MutationObserver for inputs added later).
 *   - For each, builds a wrapper containing:
 *       1. A visible `<input type="text">` that displays DD/MM/YYYY,
 *          auto-formats as you type, parses on blur/Enter.
 *       2. A small calendar button (📅) that opens the native picker via
 *          `showPicker()` on the original (now hidden) date input.
 *       3. The original date input — kept in the DOM with its original
 *          `id`, `name`, `value` (always ISO YYYY-MM-DD) so existing code
 *          like `readForm()` (which calls `.value`) keeps working without
 *          any changes.
 *   - When the user types in the text input → parses DD/MM/YYYY and writes
 *     ISO back to the original date input.
 *   - When the user picks via the calendar → original date input's `change`
 *     event fires, we format ISO → DD/MM/YYYY into the visible text input.
 */
(() => {
  if (window.__ddmmyyyyDateInputsInstalled) return;
  window.__ddmmyyyyDateInputsInstalled = true;

  // ── Inject styles once ──────────────────────────────────────────────────
  if (!document.getElementById('dd-date-style')) {
    const s = document.createElement('style');
    s.id = 'dd-date-style';
    s.textContent = `
      .dd-date-wrap {
        display: inline-flex;
        align-items: stretch;
        gap: 0;
        vertical-align: middle;
        max-width: 100%;
      }
      .dd-date-wrap input.dd-date-text {
        flex: 1 1 auto;
        min-width: 0;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-right: none;
        border-radius: 6px 0 0 6px;
        font: inherit;
        font-size: 13px;
        background: #fff;
        color: #0f172a;
        outline: none;
        box-sizing: border-box;
        font-variant-numeric: tabular-nums;
      }
      .dd-date-wrap input.dd-date-text:focus {
        border-color: #2563eb;
        z-index: 1;
      }
      .dd-date-wrap input.dd-date-text.invalid {
        border-color: #dc2626;
        background: #fef2f2;
      }
      .dd-date-wrap button.dd-date-btn {
        flex: 0 0 auto;
        padding: 0 9px;
        border: 1px solid #d1d5db;
        border-radius: 0 6px 6px 0;
        background: #f9fafb;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        color: #374151;
        outline: none;
      }
      .dd-date-wrap button.dd-date-btn:hover { background: #f3f4f6; }
      .dd-date-wrap button.dd-date-btn:focus { border-color: #2563eb; z-index: 1; }
      .dd-date-wrap input.dd-date-iso {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        margin: 0;
        padding: 0;
        border: 0;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function isoToDDMMYYYY(iso) {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return m[3] + '/' + m[2] + '/' + m[1];
  }
  function ddmmyyyyToISO(text) {
    if (!text) return '';
    const s = String(text).trim();
    // Accept DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, with single or double digits
    const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
    if (!m) return '';
    let dd = parseInt(m[1], 10);
    let mm = parseInt(m[2], 10);
    let yy = parseInt(m[3], 10);
    if (m[3].length === 2) yy = 2000 + yy; // 26 → 2026
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    if (yy < 1900 || yy > 2200) return '';
    // Verify it's a real calendar date
    const d = new Date(yy, mm - 1, dd);
    if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return '';
    return String(yy) + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  }

  // ── Wrap a single date input ────────────────────────────────────────────
  function wrap(input) {
    if (!input || input.dataset._ddWrapped === '1') return;
    if (input.type !== 'date') return;
    input.dataset._ddWrapped = '1';

    const wrap = document.createElement('span');
    wrap.className = 'dd-date-wrap';

    // Visible text input — gets all UI styling
    const text = document.createElement('input');
    text.type = 'text';
    text.className = 'dd-date-text';
    text.placeholder = 'DD/MM/ÁÁÁÁ';
    text.maxLength = 10;
    text.inputMode = 'numeric';
    text.value = isoToDDMMYYYY(input.value);
    text.autocomplete = 'off';

    // Calendar button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-date-btn';
    btn.tabIndex = -1;
    btn.title = 'Veldu dagsetningu';
    btn.textContent = '📅';

    // Move the original input into the wrap and hide it visually. We keep
    // the original element (and its id/name) so any code that reads its
    // `.value` keeps working unchanged — and `change` events still bubble.
    const parent = input.parentNode;
    parent.insertBefore(wrap, input);
    input.classList.add('dd-date-iso');
    wrap.appendChild(text);
    wrap.appendChild(btn);
    wrap.appendChild(input);

    // ── Sync: text → iso ──────────────────────────────────────────────────
    function commitText() {
      const v = text.value.trim();
      if (!v) {
        input.value = '';
        text.classList.remove('invalid');
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      const iso = ddmmyyyyToISO(v);
      if (iso) {
        text.classList.remove('invalid');
        text.value = isoToDDMMYYYY(iso); // canonical formatting
        if (input.value !== iso) {
          input.value = iso;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        text.classList.add('invalid');
      }
    }
    text.addEventListener('blur', commitText);
    text.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commitText(); }
    });
    // Auto-insert slashes as the user types digits
    text.addEventListener('input', () => {
      let raw = text.value.replace(/[^0-9]/g, '').slice(0, 8);
      let out = raw;
      if (raw.length > 4) out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
      else if (raw.length > 2) out = raw.slice(0, 2) + '/' + raw.slice(2);
      text.value = out;
      // Don't validate until user pauses — only clear the invalid flag
      // optimistically so they aren't shown red mid-typing.
      text.classList.remove('invalid');
    });

    // ── Sync: iso → text ──────────────────────────────────────────────────
    input.addEventListener('change', () => {
      text.value = isoToDDMMYYYY(input.value);
      text.classList.remove('invalid');
    });

    // ── Calendar button → open native picker ──────────────────────────────
    btn.addEventListener('click', () => {
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.focus();
      } catch (_) { input.focus(); }
    });
  }

  // ── Run now + watch for new inputs ──────────────────────────────────────
  function scan(root) {
    (root || document).querySelectorAll('input[type="date"]').forEach(wrap);
  }
  function init() {
    scan(document);
    // Many of our patches inject date inputs after DOMContentLoaded (modals,
    // form rows in dynamic tables). Observe the body for new inputs.
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('input[type="date"]')) wrap(n);
          if (n.querySelectorAll) {
            n.querySelectorAll('input[type="date"]').forEach(wrap);
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for any patch that wants to wrap an input it just created
  window.DDDateInput = { wrap, scan, isoToDDMMYYYY, ddmmyyyyToISO };
  console.log('[patch-149] dd/mm/yyyy date-input overlay installed');
})();
/* === END DD/MM/YYYY DATE INPUTS === */
