/* === SALA LINE UNITS v1 ===
 *
 * Tengir tækjaskráningu beint inni í Sala-körfu. Á hverri línu í körfunni
 * (áfylling, skoðun, ný tæki, …) bætist við lítill „🏷 Skrá" hnappur sem
 * opnar glugga til að skrá raðnúmer + athugasemdir fyrir þessa línu.
 *
 * Þegar notandi smellir á GREIÐA / Setja í reikning, er verkbeiðni búin
 * til af pos.js (ein per service-line). Þessi patch hooks inserti
 * verkbeidnir og bætir við „units" JSONB array með skráðu raðnúmerunum
 * og athugasemdunum.
 *
 * Þannig:
 *   1. Notandi setur „Hleðsla CO₂ 5kg × 3" í körfu
 *   2. Smellur á 🏷 → slær inn 3 raðnúmer (eða skannar) + athugasemd
 *   3. Smellur á GREIÐA
 *   4. Verkbeiðni er búin til með units = [{serial,...}, {serial,...}, ...]
 *   5. Á Verkstæði/Þjónustutækjum birtast tækin með Edit + Athugasemd hnöppum
 *
 * Geymsla:
 *   • Á cart-line: line._sluUnits (array of {serial, notes, scanned_at})
 *   • Wrapper á sb.from('verkbeidnir').insert sem matchar með line.desc
 *     og bætir units við row.
 */
(() => {
  if (window.__salaLineUnitsInstalled) return;
  window.__salaLineUnitsInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Pending units to inject into verkbeiðnir on insert ────────────────────
  // Keyed by line description. When a verkbeidni is inserted whose notes
  // contains the line desc, we attach the corresponding units.
  const PENDING_BY_DESC = new Map();
  // Also keyed by description+ref to be more specific
  function pendingKey(desc, ref) {
    return (desc || '').trim() + '||' + (ref || '').trim();
  }

  // ── Inject 🏷 button into each cart line ──────────────────────────────────
  function decorateLines() {
    const cartContainer = document.querySelector('#pos-lines, [class*="pos-lines"], .pos-lines');
    // Try to find cart line items by structure — they're divs with .pos-qty-up button inside
    document.querySelectorAll('button.pos-qty-up').forEach(qBtn => {
      const line = qBtn.closest('div[style*="border-bottom"]') || qBtn.parentElement?.parentElement;
      if (!line || line.dataset._sluDone === '1') return;
      // Find the description and qty
      const descEl = line.querySelector('div[style*="font-weight:600"]');
      const desc = descEl ? descEl.textContent.trim() : '';
      if (!desc) return;
      const idx = qBtn.dataset.idx;
      if (idx == null) return;
      line.dataset._sluDone = '1';
      line.dataset._sluIdx = idx;

      // Insert 🏷 button before the × delete button at the end
      const delBtn = line.querySelector('button.pos-line-del');
      const tagBtn = document.createElement('button');
      tagBtn.className = '_slu-tag-btn';
      tagBtn.type = 'button';
      tagBtn.title = 'Skrá tæki / raðnúmer / athugasemd fyrir þessa línu';
      tagBtn.style.cssText = 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:6px;width:28px;height:24px;cursor:pointer;font-size:12px;margin-left:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;position:relative';
      tagBtn.innerHTML = '🏷';
      tagBtn.addEventListener('click', e => {
        e.stopPropagation();
        openLineUnitsDialog(line, +idx);
      });
      // Insert before × button (or just append if not found).
      // 2026-05-12: pos.js cart line is now a 2-row layout — × button is
      // inside the first row, not a direct child of `line`. Insert into
      // delBtn's actual parent so insertBefore doesn't throw.
      if (delBtn && delBtn.parentNode) {
        delBtn.parentNode.insertBefore(tagBtn, delBtn);
      } else {
        line.appendChild(tagBtn);
      }
      // Add count badge if any units already registered
      refreshTagBadge(line);
    });
  }

  function getStateLines() {
    // pos.js exposes state via closure but we need to read. Try multiple approaches:
    // 1. Read via the cart input data-idx and our own dataset cache
    // We'll keep our own Map keyed by line.dataset._sluIdx + desc
    return null; // not directly accessible; we use DOM-based approach
  }

  function refreshTagBadge(line) {
    if (!line) return;
    const tagBtn = line.querySelector('._slu-tag-btn');
    if (!tagBtn) return;
    const idx = line.dataset._sluIdx;
    const data = idx != null ? UNIT_DATA_BY_IDX.get(+idx) : null;
    if (data && data.units && data.units.length) {
      tagBtn.style.background = '#16a34a';
      tagBtn.style.color = '#fff';
      tagBtn.style.borderColor = '#15803d';
      tagBtn.innerHTML = '🏷 ' + data.units.length;
      tagBtn.style.width = 'auto';
      tagBtn.style.padding = '0 6px';
    } else {
      tagBtn.style.background = '#fef3c7';
      tagBtn.style.color = '#92400e';
      tagBtn.style.borderColor = '#fde68a';
      tagBtn.innerHTML = '🏷';
      tagBtn.style.width = '28px';
      tagBtn.style.padding = '';
    }
  }

  // Map from cart line index → { desc, ref, units: [{serial, notes}], lineNote }
  // We re-key per render, but keep across renders via desc+qty matching.
  const UNIT_DATA_BY_IDX = new Map();

  // ── Dialog: register units for a single cart line ────────────────────────
  function openLineUnitsDialog(lineEl, idx) {
    const descEl = lineEl.querySelector('div[style*="font-weight:600"]');
    const desc = descEl ? descEl.textContent.trim() : '';
    // Get qty from the line's qty span (between - and + buttons)
    const qtyEl = lineEl.querySelector('span[style*="font-weight:600"][style*="text-align:center"]');
    let qty = 1;
    if (qtyEl) {
      const m = (qtyEl.textContent || '').match(/(\d+)/);
      if (m) qty = +m[1];
    }

    let existing = UNIT_DATA_BY_IDX.get(idx) || { desc, units: [], lineNote: '' };
    // Ensure units array has `qty` entries
    while (existing.units.length < qty) {
      existing.units.push({ serial: '', notes: '' });
    }
    if (existing.units.length > qty) {
      existing.units = existing.units.slice(0, qty);
    }
    existing.desc = desc;

    let dlg = document.getElementById('_slu-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_slu-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:16px';

    const unitRows = existing.units.map((u, i) =>
      '<div style="display:grid;grid-template-columns:30px 1fr 38px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9">' +
        '<div style="font-size:12px;color:#64748b;font-weight:700;text-align:center">' + (i + 1) + '.</div>' +
        '<input data-row="' + i + '" data-field="serial" type="text" value="' + esc(u.serial || '') + '" placeholder="Raðnúmer" autocomplete="off" style="padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;font-family:\'Courier New\',monospace;font-weight:700;letter-spacing:0.04em;box-sizing:border-box">' +
        '<button data-row="' + i + '" class="_slu-scan-row" type="button" title="Skanna" style="padding:7px 8px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">📷</button>' +
      '</div>'
    ).join('');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(540px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#b45309,#92400e);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">🏷 Skrá tæki á línu</h3>' +
            '<div style="font-size:11px;color:#fef3c7;margin-top:2px">' + esc(desc) + ' × ' + qty + '</div>' +
          '</div>' +
          '<button id="_slu-x" type="button" style="background:transparent;border:1px solid #c2410c;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px;overflow:auto;flex:1">' +
          '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Raðnúmer á tækjum</div>' +
          unitRows +
          '<div style="margin-top:14px">' +
            '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Athugasemd fyrir línuna</label>' +
            '<textarea id="_slu-note" rows="3" placeholder="Athugasemd, t.d. ástand, viðgerðir, ósk viðskiptavinar...">' + esc(existing.lineNote || '') + '</textarea>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap">' +
          '<button id="_slu-clear" type="button" style="padding:9px 14px;border:1px solid #fecaca;color:#dc2626;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:600">Hreinsa allt</button>' +
          '<button id="_slu-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>' +
          '<button id="_slu-save" type="button" style="padding:9px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Vista</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    // CSS for textarea
    const ta = dlg.querySelector('#_slu-note');
    ta.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box';

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_slu-x').addEventListener('click', close);
    dlg.querySelector('#_slu-cancel').addEventListener('click', close);

    // Wire scan buttons
    dlg.querySelectorAll('._slu-scan-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = +btn.dataset.row;
        if (window.BarcodeMgr && window.BarcodeMgr.scan) {
          window.BarcodeMgr.scan(text => {
            if (text) {
              const inp = dlg.querySelector('input[data-row="' + row + '"][data-field="serial"]');
              if (inp) inp.value = String(text).trim();
            }
          });
        } else {
          alert('Skannarvirkni ekki hlaðin');
        }
      });
    });

    // Auto-tab between serial inputs after scan / Enter
    dlg.querySelectorAll('input[data-field="serial"]').forEach((inp, i, arr) => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = arr[i + 1];
          if (next) next.focus();
          else dlg.querySelector('#_slu-save').focus();
        }
      });
    });

    dlg.querySelector('#_slu-clear').addEventListener('click', async () => {
      // 2026-05-10 (B5+): Confirm.show í stað native confirm
      if (!(await Confirm.show('Hreinsa öll raðnúmer og athugasemd á þessari línu?', {danger:true, okText:'Hreinsa'}))) return;
      UNIT_DATA_BY_IDX.delete(idx);
      close();
      refreshTagBadge(lineEl);
    });

    dlg.querySelector('#_slu-save').addEventListener('click', () => {
      const newUnits = [];
      dlg.querySelectorAll('input[data-field="serial"]').forEach((inp, i) => {
        const v = inp.value.trim();
        newUnits.push({ serial: v, notes: '' });
      });
      const lineNote = ta.value.trim();
      const data = {
        desc,
        units: newUnits,
        lineNote
      };
      // Also stash in global PENDING_BY_DESC so the insert wrapper can find it
      UNIT_DATA_BY_IDX.set(idx, data);
      close();
      refreshTagBadge(lineEl);
      if (window.Toast && Toast.show) Toast.show('✓ Tæki skráð á línu (' + newUnits.filter(u => u.serial).length + ' raðnúmer)');
    });
  }

  // ── Hook supabase verkbeidnir.insert to inject units & line notes ────────
  function installSbHook() {
    if (!window.DB || !window.DB.sb || window.DB.sb.__sluHooked) {
      setTimeout(installSbHook, 600);
      return;
    }
    const sb = window.DB.sb;
    sb.__sluHooked = true;
    const origFrom = sb.from.bind(sb);
    sb.from = function(table) {
      const builder = origFrom(table);
      if (table !== 'verkbeidnir') return builder;
      const origInsert = builder.insert.bind(builder);
      builder.insert = function(rows, opts) {
        // rows can be a single object or array
        const arr = Array.isArray(rows) ? rows : [rows];
        const enriched = arr.map(row => enrichRow(row));
        return origInsert(Array.isArray(rows) ? enriched : enriched[0], opts);
      };
      return builder;
    };
    console.log('[sala-line-units] sb.from(verkbeidnir).insert hooked');
  }

  function enrichRow(row) {
    if (!row || !row.notes) return row;
    // Find a cart-line entry whose desc is contained in row.notes
    let bestKey = null;
    let best = null;
    UNIT_DATA_BY_IDX.forEach((data, idx) => {
      if (!data || !data.desc) return;
      if (row.notes.indexOf(data.desc) >= 0) {
        if (!best) { best = data; bestKey = idx; }
      }
    });
    if (!best) return row;
    const result = { ...row };
    // 2026-05-14: DO NOT add `units` to the verkbeidnir row — that column
    // does not exist on the table (PGRST204 "Could not find the 'units'
    // column"). The serials are written to the verklidur table by pos.js,
    // which is the canonical place. Trying to write them here as well
    // caused EVERY verkbeidnir insert with serials to fail silently, with
    // pos.js still claiming "1 verkbeiðni búin til".
    if (best.lineNote) {
      result.notes = (row.notes || '') + '\n— ' + best.lineNote;
    }
    UNIT_DATA_BY_IDX.delete(bestKey);
    return result;
  }

  // Watch the cart for changes and re-decorate
  function attach() {
    const cart = document.getElementById('pos-lines') || document.querySelector('[class*="pos-cart-lines"]') || document.body;
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateLines, 80);
    }).observe(document.body, { childList: true, subtree: true });
  }
  attach();
  setTimeout(decorateLines, 1500);
  setInterval(decorateLines, 1500);

  installSbHook();

  window.SalaLineUnits = {
    setForLine: (idx, data) => UNIT_DATA_BY_IDX.set(idx, data),
    get: () => Array.from(UNIT_DATA_BY_IDX.entries()),
    clear: () => UNIT_DATA_BY_IDX.clear()
  };

  console.log('[sala-line-units] installed — 🏷 Skrá hnappur á cart-línum + auto verkbeidnir.units');
})();
/* === END SALA LINE UNITS v1 === */
