/* === BULK ADD UNITS v1 === */
/* Adds a "+ Mörg tæki" button next to the existing "+ Bæta við tæki" on the
 * company detail page (Fyrirtækjaþjónusta) AND on the customer (Viðskiptavinir)
 * detail page (which patch 03-vidsk-revamp.js builds). Lets the user register
 * many tæki at once when a new contract is signed or a customer drops off
 * a batch. Each gets a placeholder TMP-XXXXXX serial that the technician
 * replaces on first service.
 */
(() => {
  if (window.__bulkAddUnitsInstalled) return;
  window.__bulkAddUnitsInstalled = true;

  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/1/I/O ambiguity
  function tmpSerial() {
    let s = '';
    for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    return 'TMP-' + s;
  }
  function escHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function openBulkModal(nafn, refreshFn) {
    const existing = document.getElementById('_bulkadd_modal');
    if (existing) existing.remove();
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = (parseInt(today.slice(0, 4)) + 1) + today.slice(4);
    const m = document.createElement('div');
    m.id = '_bulkadd_modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML =
      '<div style="background:#fff;border-radius:14px;width:520px;max-width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3)">' +
        '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">' +
          '<div><h2 style="margin:0;font-size:17px">Bæta við mörgum tækjum</h2>' +
          '<div style="font-size:12px;color:#6b7280;margin-top:2px">' + escHtml(nafn) + '</div></div>' +
          '<button id="_ba_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button>' +
        '</div>' +
        '<div style="padding:20px;overflow-y:auto;flex:1">' +
          '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:12px;color:#78350f">' +
            'Hvert tæki fær tímabundinn QR-kóða (TMP-XXXXXX). Skiptu honum út fyrir raunverulega serial-númerið þegar tækið er fyrst í skoðun.' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
            '<div><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Tegund</label>' +
              '<select id="_ba_type" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box">' +
                '<option>ABC Duft</option><option>CO₂</option><option>Vatn</option><option>Léttvatn</option><option>Froðu</option><option>Blautt efni</option><option>Halon</option><option>Brunaslanga</option><option>Slönguskápur</option><option>Reykskynjari</option><option>Hitaskynjari</option>' +
              '</select></div>' +
            '<div><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Stærð</label>' +
              '<select id="_ba_size" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box">' +
                // 2026-06-10: must match patch 132 SIZE_OPTIONS + the tæki
                // dashboard dropdown so the saved size matches the verðlista
                // lookup. Was "6kg/9kg/3kg/9L" (no space) → never matched.
                '<option>2 kg</option><option>5 kg</option><option>6 kg</option><option>9 kg</option><option>12 kg</option><option>6 L</option><option>30 m</option>' +
              '</select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
            '<div><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Magn</label>' +
              '<input id="_ba_qty" type="number" min="1" max="200" value="20" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box"></div>' +
            '<div><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Næsta skoðun</label>' +
              '<input id="_ba_next" type="date" value="' + nextYear + '" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box"></div>' +
          '</div>' +
          '<div><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Staðsetning (sameiginleg, valfrjáls)</label>' +
            '<input id="_ba_loc" placeholder="t.d. 1. hæð / Skrifstofa" style="width:100%;padding:9px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box"></div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-top:6px">Þú getur breytt staðsetningu hvers tækis síðar í lista.</div>' +
        '</div>' +
        '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end">' +
          '<button id="_ba_cancel" style="background:#f3f4f6;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px;color:#374151">Hætta við</button>' +
          '<button id="_ba_save" style="background:#1a7f4b;color:#fff;border:none;padding:10px 22px;border-radius:9px;cursor:pointer;font-weight:700;font-size:14px">Skrá tæki</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    document.getElementById('_ba_x').onclick = close;
    document.getElementById('_ba_cancel').onclick = close;
    m.onclick = (e) => { if (e.target === m) close(); };
    document.getElementById('_ba_save').onclick = () => submitBulk(nafn, refreshFn);
  }

  async function submitBulk(nafn, refreshFn) {
    const qty = parseInt(document.getElementById('_ba_qty').value, 10);
    if (!qty || qty < 1 || qty > 200) { alert('Magn verður að vera milli 1 og 200'); return; }
    const type = document.getElementById('_ba_type').value;
    const size = document.getElementById('_ba_size').value.trim() || null;
    const loc  = document.getElementById('_ba_loc').value.trim() || null;
    const nextInsp = document.getElementById('_ba_next').value || null;
    const today = new Date().toISOString().slice(0, 10);
    const btn = document.getElementById('_ba_save');
    btn.disabled = true; btn.textContent = 'Skrái ' + qty + ' tæki…';

    const rows = [], used = {};
    while (rows.length < qty) {
      const s = tmpSerial();
      if (used[s]) continue;
      used[s] = 1;
      rows.push({
        serial: s, type, size, client: nafn, location: loc,
        last_insp: today, next_insp: nextInsp,
        status: 'active', pressure: 14
      });
    }

    try {
      const sb = (window.DB && window.DB.sb) || window.sb;
      if (!sb) throw new Error('Engin tenging við gagnagrunn');
      const r = await sb.from('uttaeki').insert(rows).select();
      if (r.error) throw r.error;
      // Update local cache so UI re-renders with the new units
      if (window.DB && DB.cache && DB.cache.units && r.data) {
        for (const row of r.data) DB.cache.units.push(row);
      }
      const modal = document.getElementById('_bulkadd_modal');
      if (modal) modal.remove();
      if (typeof refreshFn === 'function') {
        try { refreshFn(); } catch (_) {}
      }
      if (window.Toast && Toast.show) Toast.show('✓ ' + r.data.length + ' tæki skráð fyrir ' + nafn);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Skrá tæki';
      alert('Villa: ' + (e.message || e));
    }
  }

  // -- Inject button into a container that has the existing "+ Bæta við tæki" button --
  function findAddButton(scope) {
    const buttons = (scope || document).querySelectorAll('button');
    for (const b of buttons) {
      const t = (b.textContent || '').trim();
      if (/^\+\s*Bæta við tæki\b/i.test(t)) return b;
    }
    return null;
  }

  function inject(scope) {
    const addBtn = findAddButton(scope);
    if (!addBtn) return;
    if (addBtn.parentNode.querySelector('._bulkadd_btn')) return;

    // Determine if button is on vidsk-main or companies-main, then look up
    // the customer/company name from the right place. Two channels:
    //   (a) Companies — onclick has  ".addUnit(NUM, 'NAME')"  → parse out
    //   (b) Vidskiptavinir — button has id="vk-add-tæki" and the customer
    //       name is rendered in the .company-name div on the same page
    const onclickStr = addBtn.getAttribute('onclick') || '';
    const isVidsk = addBtn.id === 'vk-add-tæki' ||
                    !!addBtn.closest('#vidsk-main, #view-vidskiptavinir');
    let nafn = '';
    let custId = null;

    // (a) Companies: parse onclick — the name is typically the last quoted arg
    const nameMatch = onclickStr.match(/['"]([^'"]+)['"]\s*\)/);
    const idMatch = onclickStr.match(/\.addUnit\((\d+)/);
    if (nameMatch) nafn = nameMatch[1].replace(/\\'/g, "'");
    if (idMatch) custId = parseInt(idMatch[1], 10);

    // (b) Vidskiptavinir: read from .company-name (vidsk-revamp's heading
    // for the customer's display name). Falls back to h2 only — NEVER h3,
    // which matches unrelated section headings like patch 116's "💎 Sérkjör".
    if (!nafn) {
      const root = addBtn.closest('#vidsk-main, [id$="-main"], .modal-box, body') || document.body;
      const titleEl = root.querySelector('.company-name, h2, [style*="font-size:21px"], [style*="font-size:19px"]');
      nafn = (titleEl && titleEl.textContent.trim()) || '';
    }
    if (!nafn) return;

    const btn = document.createElement('button');
    btn.className = '_bulkadd_btn btn btn-outline btn-sm';
    btn.style.cssText = 'margin-right:6px';
    btn.textContent = '+ Mörg tæki';
    btn.onclick = (e) => {
      e.stopPropagation();
      // Pick the right refresh callback for the surface we're on
      let refreshFn = null;
      if (isVidsk) {
        refreshFn = () => {
          // Re-open the vidsk detail to pick up the new units
          if (window.Vidskiptavinir && typeof Vidskiptavinir.refresh === 'function') {
            try { Vidskiptavinir.refresh(); } catch (_) {}
          }
        };
      } else if (window.Companies && Companies.openDetail && custId) {
        refreshFn = () => Companies.openDetail(custId);
      }
      openBulkModal(nafn, refreshFn);
    };
    addBtn.parentNode.insertBefore(btn, addBtn);
  }

  // Watch the whole document for the "+ Bæta við tæki" button to appear (on company/customer detail open)
  new MutationObserver(() => inject(document)).observe(document.body, { childList: true, subtree: true });
  inject(document);

  console.log('[bulk-add-units] installed');
})();
/* === END BULK ADD UNITS v1 === */
