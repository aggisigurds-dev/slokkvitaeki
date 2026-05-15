/* === BRUNAKERFI PRICELIST FORM v1 ===
 *
 * Fillable inspection-invoice form built from the Brunaviðvörunarkerfi
 * pricelist. Each line has:
 *   • Magn (quantity, integer input)
 *   • Verð án VSK (unit price, editable so the user can adjust per job)
 *   • Samtals án VSK (auto-calculated = magn × verð)
 *
 * Footer summary like a receipt:
 *   Samtals án VSK · VSK 24% · Samtals m/VSK
 *
 * Header: Slökkvitæki ehf logo + company info.
 * Customer block (verkkaupi): name, kt, address, phone, email, contact —
 * pre-filled when opened from a brunakerfi company card.
 *
 * Storage: filled forms are saved to AppSettings.skjalasnidmat_filled with
 * template_id='brunakerfi_pricelist' so they appear in the company's
 * "📁 Vistuð skjöl" list just like other templates.
 *
 * Public API:
 *   window.BrunakerfiPriceForm.open({co?, filledId?})
 *     - co       : { id, nafn, kennitala, simi, heimilisfang, netfang, tengiliður }
 *     - filledId : reopen a previously-saved form by id
 */
(() => {
  if (window.__brunakerfiPriceFormInstalled) return;
  window.__brunakerfiPriceFormInstalled = true;

  const FILLED_KEY = 'skjalasnidmat_filled';
  const TEMPLATE_ID = 'brunakerfi_pricelist';
  const VAT_PCT = 24;

  // ── Pricelist (from brunavidvorunarkerfi pricelist.jpg, 2026-05-15) ────────
  // Two sections. Prices are ex-VAT in ISK (decimals preserved for some
  // line items where the source had non-round figures).
  const PRICELIST = [
    {
      group: 'Brunaviðvörunarkerfi — Skoðun',
      items: [
        { name: 'Samantekt og gerð skoðunarskýrslu', price: 16670 },
        { name: 'Skoðun á aðalafli og varaafli', price: 1210 },
        { name: 'Skoðun á aðalstöð brunaviðvörunarkerfis', price: 10080 },
        { name: 'Skoðun á bjöllum / sírenum', price: 1210 },
        { name: 'Skoðun á boðbúnaði / úthringibúnaði', price: 4040 },
        { name: 'Skoðun á gaumljósi', price: 1210 },
        { name: 'Skoðun á geislaskynjara', price: 15190 },
        { name: 'Skoðun á handboðum', price: 1210 },
        { name: 'Skoðun á hitaskynjunarstreng', price: 9810 },
        { name: 'Skoðun á inngangsstýringu fyrir úðakerfi', price: 2020 },
        { name: 'Skoðun á logaskynjurum', price: 1750 },
        { name: 'Skoðun á NH3 (ammóníak) skynjara', price: 15190 },
        { name: 'Skoðun á prentarabúnaði', price: 950 },
        { name: 'Skoðun á rakapéttum handboðum', price: 1480 },
        { name: 'Skoðun á reyk-/hitaskynjurum 6-9m hæð', price: 2020 },
        { name: 'Skoðun á reyk-/hitaskynjurum að 6m hæð', price: 1210 },
        { name: 'Skoðun á reyk-/hitaskynjurum yfir 9m hæð', price: 4040 },
        { name: 'Skoðun á reyklosunarstöð', price: 10080 },
        { name: 'Skoðun á reyksogsop / reyksogskerfi', price: 4040 },
        { name: 'Skoðun á reyksogsstöð', price: 10080 },
        { name: 'Skoðun á segullæsingu', price: 1210 },
        { name: 'Skoðun á skynjara ofan lofts', price: 4040 },
        { name: 'Skoðun á stjórnstöð slökkvikerfis', price: 10080 },
        { name: 'Skoðun á stokkaskynjara', price: 8740 },
        { name: 'Skoðun á stýrieiningum fyrir inn- og útgang', price: 2020 },
        { name: 'Skoðun á útgangsstýringu fyrir glugga', price: 2020 },
        { name: 'Skoðun á útgangsstýringu fyrir hurðaflæsi', price: 2020 },
        { name: 'Skoðun á útgangsstýringu fyrir loftræsingu', price: 2020 },
        { name: 'Skoðun á útgangsstýringu fyrir reyklúgur', price: 2020 },
        { name: 'Skoðun á útgangsstýringu fyrir reyksog', price: 2020 },
        { name: 'Skoðun á útstöð brunaviðvörunakerfis', price: 2420 },
        { name: 'Skoðun á viðvörunarsökkli með sírenu', price: 680 },
        { name: 'Skoðun á yfirlitsmynd og þjónustubók', price: 1750 }
      ]
    }
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtKrPlain(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.');
  }
  function todayDDMMYYYY() {
    const d = new Date();
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }

  // ── Filled-form storage (shared with patch 94) ───────────────────────────
  function getFilledList() {
    const v = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(FILLED_KEY)) || [];
    return Array.isArray(v) ? v : [];
  }
  async function saveFilled(rec) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið — get ekki vistað.');
      return false;
    }
    const list = getFilledList();
    const idx = list.findIndex(x => x && x.id === rec.id);
    if (idx >= 0) list[idx] = rec;
    else list.unshift(rec);
    return await window.AppSettings.save({ [FILLED_KEY]: list });
  }
  async function deleteFilled(id) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const list = getFilledList().filter(x => x && x.id !== id);
    return await window.AppSettings.save({ [FILLED_KEY]: list });
  }

  // ── Open the form ───────────────────────────────────────────────────────
  function open(opts) {
    opts = opts || {};
    const co = opts.co || {};
    let existing = null;
    if (opts.filledId) {
      existing = getFilledList().find(x => x && x.id === opts.filledId) || null;
    }

    // Seed the line items (preserve any saved magn/price)
    const savedByName = {};
    if (existing && existing.values && Array.isArray(existing.values.items)) {
      for (const it of existing.values.items) savedByName[it.name] = it;
    }
    const lineRows = [];
    for (const grp of PRICELIST) {
      for (const it of grp.items) {
        const saved = savedByName[it.name];
        lineRows.push({
          group: grp.group,
          name: it.name,
          basePrice: it.price,
          qty: saved ? Number(saved.qty) || 0 : 0,
          price: saved ? Number(saved.price) || it.price : it.price
        });
      }
    }

    // Customer values
    const v = (existing && existing.values) || {};
    const customer = {
      nafn: v.customer_nafn != null ? v.customer_nafn : (co.nafn || ''),
      kt: v.customer_kt != null ? v.customer_kt : (co.kennitala || ''),
      simi: v.customer_simi != null ? v.customer_simi : (co.simi || ''),
      heimilisfang: v.customer_heimilisfang != null ? v.customer_heimilisfang : (co.heimilisfang || ''),
      netfang: v.customer_netfang != null ? v.customer_netfang : (co.netfang || ''),
      tengilidur: v.customer_tengilidur != null ? v.customer_tengilidur : (co['tengiliður'] || co.tengilidur || '')
    };
    const headerInfo = {
      dagsetning: v.dagsetning || todayDDMMYYYY(),
      verknr: v.verknr || '',
      title: v.title || 'Reikningur — Brunaviðvörunarkerfi',
      athugasemd: v.athugasemd || ''
    };

    document.getElementById('_bk-pf-dlg')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-pf-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100075;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#f8fafc;border-radius:14px;box-shadow:0 30px 70px rgba(0,0,0,0.4);width:min(1080px,calc(100vw - 24px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:#dc2626;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:800">🧾 Skoðunarreikningur — Brunaviðvörunarkerfi</h2>
            <div style="font-size:11px;color:#fecaca;margin-top:2px">Veldu liði, breyttu magni og verði — samtölur reiknast sjálfkrafa</div>
          </div>
          <button id="_bk-pf-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
        </div>

        <div id="_bk-pf-body" style="flex:1;overflow-y:auto;padding:18px 22px">

          <!-- Header: Slökkvitæki + customer -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:42px;max-width:120px" onerror="this.style.display='none'">
                <div>
                  <div style="font-size:14px;font-weight:800;color:#0f172a">Slökkvitæki ehf</div>
                  <div style="font-size:10.5px;color:#64748b;line-height:1.4">Helluhraun 10, 220 Hafnarfirði<br>kt. 600508-0400 · vsknr. 98107<br>Sími 565-4080 · eldklar@eldklar.is</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 10px;font-size:12px;margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9">
                <label style="color:#64748b;font-weight:600;align-self:center">Dagsetning</label>
                <input id="_bk-pf-dags" type="text" value="${esc(headerInfo.dagsetning)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;width:100%;box-sizing:border-box">
                <label style="color:#64748b;font-weight:600;align-self:center">Verk nr.</label>
                <input id="_bk-pf-verknr" type="text" value="${esc(headerInfo.verknr)}" placeholder="t.d. BK-2026-0001" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;width:100%;box-sizing:border-box">
                <label style="color:#64748b;font-weight:600;align-self:center">Heiti skjals</label>
                <input id="_bk-pf-title" type="text" value="${esc(headerInfo.title)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;width:100%;box-sizing:border-box">
              </div>
            </div>

            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px">
              <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Verkkaupi</div>
              <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Nafn fyrirtækis</div><input id="_bk-pf-c-nafn" type="text" value="${esc(customer.nafn)}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                  <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Kennitala</div><input id="_bk-pf-c-kt" type="text" value="${esc(customer.kt)}" placeholder="000000-0000" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box;font-family:monospace"></div>
                  <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Sími</div><input id="_bk-pf-c-simi" type="tel" value="${esc(customer.simi)}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box"></div>
                </div>
                <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Heimilisfang</div><input id="_bk-pf-c-addr" type="text" value="${esc(customer.heimilisfang)}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                  <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Netfang</div><input id="_bk-pf-c-email" type="email" value="${esc(customer.netfang)}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box"></div>
                  <div><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:2px">Tengiliður</div><input id="_bk-pf-c-tengl" type="text" value="${esc(customer.tengilidur)}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;width:100%;box-sizing:border-box"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items table -->
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px">
            <div style="padding:10px 14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <div style="font-size:12px;font-weight:700;color:#0f172a">📋 Skoðunarliðir · breyttu magni og verði eftir þörfum</div>
              <label style="font-size:11.5px;color:#475569;display:flex;align-items:center;gap:6px;cursor:pointer">
                <input id="_bk-pf-hide-zero" type="checkbox" checked style="margin:0"> Fela liði með magn = 0
              </label>
            </div>
            <table id="_bk-pf-tbl" style="width:100%;border-collapse:collapse;font-size:12.5px">
              <thead style="background:#f8fafc">
                <tr>
                  <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#475569;font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em">Lýsing</th>
                  <th style="text-align:center;padding:8px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#475569;font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em;width:80px">Magn</th>
                  <th style="text-align:right;padding:8px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#475569;font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em;width:120px">Verð án VSK</th>
                  <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#475569;font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em;width:130px">Samtals án VSK</th>
                </tr>
              </thead>
              <tbody id="_bk-pf-tbody"></tbody>
            </table>
          </div>

          <!-- Comments + totals -->
          <div style="display:grid;grid-template-columns:1fr 320px;gap:14px;margin-bottom:14px">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Athugasemd</div>
              <textarea id="_bk-pf-ath" rows="3" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12.5px;box-sizing:border-box;resize:vertical">${esc(headerInfo.athugasemd)}</textarea>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Samantekt</div>
              <div style="display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:13px">
                <div style="color:#475569">Samtals án VSK</div>
                <div id="_bk-pf-sum-ex" style="text-align:right;color:#0f172a;font-weight:600;font-variant-numeric:tabular-nums">0 kr</div>
                <div style="color:#475569">VSK (${VAT_PCT}%)</div>
                <div id="_bk-pf-sum-vat" style="text-align:right;color:#0f172a;font-weight:600;font-variant-numeric:tabular-nums">0 kr</div>
                <div style="grid-column:1 / -1;border-top:1px solid #e2e8f0;margin:4px 0"></div>
                <div style="color:#0f172a;font-weight:800;font-size:14px">Samtals m/VSK</div>
                <div id="_bk-pf-sum-total" style="text-align:right;color:#dc2626;font-weight:800;font-size:15px;font-variant-numeric:tabular-nums">0 kr</div>
              </div>
            </div>
          </div>

        </div>

        <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">
          <div style="display:flex;gap:6px">
            ${existing ? `<button id="_bk-pf-del" type="button" style="padding:8px 14px;background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">🗑 Eyða</button>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button id="_bk-pf-cancel" type="button" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px;color:#475569">Loka</button>
            <button id="_bk-pf-save" type="button" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">💾 Vista</button>
            <button id="_bk-pf-print" type="button" style="padding:8px 18px;background:#dc2626;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:800">🖨 Prenta</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    const tbody = dlg.querySelector('#_bk-pf-tbody');
    const hideZeroCb = dlg.querySelector('#_bk-pf-hide-zero');
    function renderRows() {
      const hideZero = hideZeroCb.checked;
      let lastGroup = null;
      tbody.innerHTML = '';
      lineRows.forEach((row, i) => {
        const isHidden = hideZero && (!row.qty || row.qty <= 0);
        if (isHidden) return;
        if (row.group !== lastGroup) {
          lastGroup = row.group;
          const gr = document.createElement('tr');
          gr.innerHTML = `<td colspan="4" style="padding:8px 12px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #fee2e2">${esc(row.group)}</td>`;
          tbody.appendChild(gr);
        }
        const tr = document.createElement('tr');
        tr.dataset.idx = i;
        tr.style.borderBottom = '1px solid #f1f5f9';
        const subtotal = (Number(row.qty) || 0) * (Number(row.price) || 0);
        tr.innerHTML = `
          <td style="padding:6px 12px;color:#0f172a">${esc(row.name)}</td>
          <td style="padding:6px 8px;text-align:center"><input data-f="qty" type="number" min="0" step="1" value="${row.qty || 0}" style="width:64px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;text-align:center;box-sizing:border-box;font-variant-numeric:tabular-nums"></td>
          <td style="padding:6px 8px;text-align:right"><input data-f="price" type="number" min="0" step="0.01" value="${row.price}" style="width:100px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12.5px;text-align:right;box-sizing:border-box;font-variant-numeric:tabular-nums"></td>
          <td data-c="sub" style="padding:6px 12px;text-align:right;color:#0f172a;font-weight:600;font-variant-numeric:tabular-nums">${fmtKrPlain(subtotal)} kr</td>
        `;
        tbody.appendChild(tr);
      });
    }
    function recalcTotals() {
      let ex = 0;
      lineRows.forEach(r => { ex += (Number(r.qty) || 0) * (Number(r.price) || 0); });
      const vat = ex * VAT_PCT / 100;
      const total = ex + vat;
      dlg.querySelector('#_bk-pf-sum-ex').textContent = fmtKr(ex);
      dlg.querySelector('#_bk-pf-sum-vat').textContent = fmtKr(vat);
      dlg.querySelector('#_bk-pf-sum-total').textContent = fmtKr(total);
    }
    function refreshSubtotalCell(tr) {
      const idx = +tr.dataset.idx;
      const row = lineRows[idx];
      const sub = (Number(row.qty) || 0) * (Number(row.price) || 0);
      const cell = tr.querySelector('[data-c="sub"]');
      if (cell) cell.textContent = fmtKrPlain(sub) + ' kr';
    }
    renderRows();
    recalcTotals();

    // Live input handling — delegate to tbody so re-renders don't lose handlers
    tbody.addEventListener('input', e => {
      const inp = e.target.closest('input[data-f]');
      if (!inp) return;
      const tr = inp.closest('tr[data-idx]');
      if (!tr) return;
      const idx = +tr.dataset.idx;
      const row = lineRows[idx];
      if (!row) return;
      const f = inp.dataset.f;
      const val = inp.value === '' ? 0 : Number(inp.value);
      if (Number.isFinite(val)) row[f] = val;
      refreshSubtotalCell(tr);
      recalcTotals();
    });
    hideZeroCb.addEventListener('change', () => { renderRows(); });

    function close() { dlg.remove(); }
    dlg.querySelector('#_bk-pf-x').addEventListener('click', close);
    dlg.querySelector('#_bk-pf-cancel').addEventListener('click', close);

    function gather() {
      return {
        items: lineRows.filter(r => (Number(r.qty) || 0) > 0).map(r => ({
          group: r.group, name: r.name, qty: Number(r.qty) || 0, price: Number(r.price) || 0
        })),
        customer_nafn: dlg.querySelector('#_bk-pf-c-nafn').value.trim(),
        customer_kt: dlg.querySelector('#_bk-pf-c-kt').value.trim(),
        customer_simi: dlg.querySelector('#_bk-pf-c-simi').value.trim(),
        customer_heimilisfang: dlg.querySelector('#_bk-pf-c-addr').value.trim(),
        customer_netfang: dlg.querySelector('#_bk-pf-c-email').value.trim(),
        customer_tengilidur: dlg.querySelector('#_bk-pf-c-tengl').value.trim(),
        dagsetning: dlg.querySelector('#_bk-pf-dags').value.trim(),
        verknr: dlg.querySelector('#_bk-pf-verknr').value.trim(),
        title: dlg.querySelector('#_bk-pf-title').value.trim() || 'Reikningur — Brunaviðvörunarkerfi',
        athugasemd: dlg.querySelector('#_bk-pf-ath').value
      };
    }

    function totalsFor(items) {
      let ex = 0;
      (items || []).forEach(r => { ex += (Number(r.qty) || 0) * (Number(r.price) || 0); });
      const vat = ex * VAT_PCT / 100;
      return { ex, vat, total: ex + vat };
    }

    function buildPrintHTML(values) {
      const { ex, vat, total } = totalsFor(values.items);
      // Group lines for the printed table
      const grouped = {};
      values.items.forEach(it => {
        (grouped[it.group] = grouped[it.group] || []).push(it);
      });
      const rowsHtml = Object.keys(grouped).map(g => `
        <tr><td colspan="4" style="padding:9px 10px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${esc(g)}</td></tr>
        ${grouped[g].map(it => `
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:8px 10px;color:#0f172a">${esc(it.name)}</td>
            <td style="padding:8px 10px;text-align:center;font-variant-numeric:tabular-nums">${it.qty}</td>
            <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums">${fmtKrPlain(it.price)} kr</td>
            <td style="padding:8px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${fmtKrPlain(it.qty * it.price)} kr</td>
          </tr>`).join('')}
      `).join('');

      return `<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><title>${esc(values.title || 'Reikningur')} — ${esc(values.customer_nafn || '')}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#0f172a; margin:0; padding:0; font-size:12.5px; line-height:1.45 }
  .wrap { max-width:780px; margin:0 auto; padding:18px 24px; background:#fff }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; padding-bottom:14px; border-bottom:2px solid #0f172a }
  .head .logo { display:flex; gap:12px; align-items:center }
  .head .logo img { max-height:54px }
  .head .co-info { font-size:11px; color:#475569; line-height:1.45 }
  .head .co-info b { color:#0f172a; font-size:14px }
  .doc-title { text-align:right }
  .doc-title h1 { margin:0; font-size:22px; letter-spacing:0.5px }
  .doc-title .sub { color:#dc2626; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; margin-top:2px }
  .doc-title .meta { font-size:11px; color:#475569; margin-top:8px }
  .verkkaupi { margin:18px 0; display:grid; grid-template-columns:auto 1fr auto 1fr; gap:4px 16px; font-size:12px }
  .verkkaupi .lbl { color:#64748b; font-weight:700; text-transform:uppercase; font-size:10px; letter-spacing:0.05em }
  .verkkaupi .val { color:#0f172a; border-bottom:1px solid #cbd5e1; padding-bottom:2px; min-height:16px }
  table.items { width:100%; border-collapse:collapse; margin-top:8px; font-size:11.5px }
  table.items th { background:#f1f5f9; color:#475569; text-transform:uppercase; font-size:10px; letter-spacing:0.04em; padding:8px 10px; text-align:left; border-bottom:2px solid #e2e8f0 }
  table.items th.c { text-align:center } table.items th.r { text-align:right }
  table.items td { vertical-align:top }
  .totals { margin-top:16px; display:flex; justify-content:flex-end }
  .totals table { font-size:13px; min-width:280px }
  .totals td { padding:5px 12px; font-variant-numeric:tabular-nums }
  .totals .lbl { text-align:left; color:#475569; font-weight:600 }
  .totals .val { text-align:right; font-weight:700; color:#0f172a }
  .totals .grand .lbl { font-size:14px; color:#0f172a; font-weight:800 }
  .totals .grand .val { font-size:15px; color:#dc2626; font-weight:800 }
  .totals .grand td { border-top:1.5px solid #0f172a; padding-top:7px }
  .notes { margin-top:18px; padding:10px 12px; border:1px solid #e2e8f0; background:#f8fafc; border-radius:6px; font-size:11.5px; min-height:36px; white-space:pre-wrap }
  .sig { margin-top:36px; display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; color:#475569 }
  .sig .line { border-top:1px solid #0f172a; padding-top:4px }
  .foot { margin-top:30px; padding-top:10px; border-top:1px solid #e2e8f0; text-align:center; font-size:10.5px; color:#64748b }
  @media print { body { background:#fff } .no-print { display:none } }
</style></head><body><div class="wrap">

  <div class="head">
    <div class="logo">
      <img src="${window.location.origin}/img/logo.png" alt="Slökkvitæki ehf" onerror="this.style.display='none'">
      <div class="co-info"><b>Slökkvitæki ehf</b><br>Helluhraun 10, 220 Hafnarfirði<br>kt. 600508-0400 · vsknr. 98107<br>Sími 565-4080 · eldklar@eldklar.is</div>
    </div>
    <div class="doc-title">
      <h1>${esc(values.title || 'Reikningur')}</h1>
      <div class="sub">Slökkvitæki ehf · Brunaviðvörunarkerfi</div>
      <div class="meta">
        Dags: <strong>${esc(values.dagsetning || '')}</strong>${values.verknr ? '<br>Verk nr.: <strong>' + esc(values.verknr) + '</strong>' : ''}
      </div>
    </div>
  </div>

  <div class="verkkaupi">
    <div class="lbl">Verkkaupi</div><div class="val">${esc(values.customer_nafn || '—')}</div>
    <div class="lbl">Kennitala</div><div class="val">${esc(values.customer_kt || '—')}</div>
    <div class="lbl">Heimilisfang</div><div class="val">${esc(values.customer_heimilisfang || '—')}</div>
    <div class="lbl">Sími</div><div class="val">${esc(values.customer_simi || '—')}</div>
    <div class="lbl">Netfang</div><div class="val">${esc(values.customer_netfang || '—')}</div>
    <div class="lbl">Tengiliður</div><div class="val">${esc(values.customer_tengilidur || '—')}</div>
  </div>

  <table class="items">
    <thead>
      <tr><th>Lýsing</th><th class="c" style="width:60px">Magn</th><th class="r" style="width:110px">Verð án VSK</th><th class="r" style="width:120px">Samtals án VSK</th></tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="4" style="padding:14px;color:#94a3b8;font-style:italic;text-align:center">Engir liðir valdir</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="lbl">Samtals án VSK</td><td class="val">${fmtKr(ex)}</td></tr>
      <tr><td class="lbl">VSK (${VAT_PCT}%)</td><td class="val">${fmtKr(vat)}</td></tr>
      <tr class="grand"><td class="lbl">Samtals m/VSK</td><td class="val">${fmtKr(total)}</td></tr>
    </table>
  </div>

  ${values.athugasemd ? `<div class="notes">${esc(values.athugasemd)}</div>` : ''}

  <div class="sig">
    <div class="line">F.h. Slökkvitæki ehf</div>
    <div class="line">F.h. verkkaupa</div>
  </div>

  <div class="foot">Slökkvitæki ehf · Helluhraun 10, 220 Hafnarfirði · kt. 600508-0400 · Sími 565-4080</div>

</div><script>setTimeout(function(){window.print()}, 350)<\/script></body></html>`;
    }

    dlg.querySelector('#_bk-pf-print').addEventListener('click', () => {
      const values = gather();
      const w = window.open('', '_blank');
      if (!w) { alert('Vafrinn blokkaði nýjan glugga. Leyfðu pop-ups fyrir þessa síðu.'); return; }
      w.document.write(buildPrintHTML(values));
      w.document.close();
    });

    dlg.querySelector('#_bk-pf-save').addEventListener('click', async () => {
      const values = gather();
      if (!values.customer_nafn) { alert('Sláðu inn nafn verkkaupa áður en þú vistar.'); return; }
      const t = totalsFor(values.items);
      const id = (existing && existing.id) || 'bkpf_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      const rec = {
        id,
        template_id: TEMPLATE_ID,
        template_name: 'Skoðunarreikningur — Brunaviðvörunarkerfi',
        name: values.title + ' · ' + values.customer_nafn,
        customer: values.customer_nafn,
        co_id: co.id || (existing && existing.co_id) || null,
        values,
        totals: t,
        created_at: (existing && existing.created_at) || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const ok = await saveFilled(rec);
      if (!ok) return;
      if (window.Toast && Toast.show) Toast.show('✓ Reikningur vistaður');
      else alert('Vistað');
      // Replace `existing` ref so subsequent saves overwrite the same id
      existing = rec;
      // Refresh the brunakerfi view's filled-docs cache + re-render any open doc list
      try { if (window.Brunakerfi && Brunakerfi.show) Brunakerfi.show(); } catch (_) {}
    });

    if (existing) {
      dlg.querySelector('#_bk-pf-del')?.addEventListener('click', async () => {
        if (!confirm('Eyða þessum reikningi?')) return;
        await deleteFilled(existing.id);
        if (window.Toast && Toast.show) Toast.show('✓ Eytt');
        try { if (window.Brunakerfi && Brunakerfi.show) Brunakerfi.show(); } catch (_) {}
        close();
      });
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  window.BrunakerfiPriceForm = {
    open,
    PRICELIST   // exposed so other code can inspect / extend
  };
  console.log('[patch-150] brunakerfi pricelist form installed — window.BrunakerfiPriceForm.open({co})');
})();
/* === END BRUNAKERFI PRICELIST FORM === */
