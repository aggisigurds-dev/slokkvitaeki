/* === SALE EDITOR v1 ===
   Universal modal for editing a sale (solur row) at any stage until it's
   finalized. Designed for the "draft until finished" workflow:

     drög  →  edit anything (customer / kt / sími / heimilisfang / lines /
              qty / prices / line-level discounts / notes)
       ↓
     ✅ Klára sölu  →  status='final'  →  appears in Bókhald

   API:
     window.SaleEditor.openById(saleId)
     window.SaleEditor.openByNum('R-000123')
     window.SaleEditor.isDraft(sale)  // helper

   Locks: when sale.status === 'final' or sale.is_credit is true, all inputs
   are disabled and only the "Kreditfærsla" / "Loka" actions are available.

   Cascade: when customer (nafn / kt) is changed on a draft, the linked
   verkbeidnir rows (R-NNN-V*) are updated too so workshop sees the new name. */
(() => {
  if (window.__saleEditorInstalled) return;
  window.__saleEditorInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    var v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ── State per open editor ─────────────────────────────────────────────────
  let _sale = null;       // canonical solur row (with mutations)
  let _afslKr = 0;        // sale-level kr discount (gross, m. vsk) — editable
  let _origCustomer = null; // {nafn, kt} snapshot for cascade
  let _dlg = null;

  function isDraft(sale) {
    if (!sale) return false;
    if (sale.is_credit) return false;
    if (sale.status === 'final') return false;
    if (sale.paid_at) return false;
    return sale.status === 'drog' || !sale.status; // allow rows where status NULL = drög too
  }
  // A reikningur that is FINAL but has NOT been sent yet (no Payday/krafa/dk push,
  // not paid, not a credit note) is safe to edit IN PLACE — nothing has left the
  // building. Lets Agnar fix a forgotten discount without a credit note.
  function isUnsentFinal(sale) {
    if (!sale) return false;
    return sale.status === 'final' && !sale.is_credit && !sale.paid_at
      && !sale.invoiced_at && !sale.krafa_sent_at && !sale.dk_invoice_id;
  }
  function isLocked(sale) { return !isDraft(sale) && !isUnsentFinal(sale); }

  // ── Open ──────────────────────────────────────────────────────────────────
  async function openById(id) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const { data, error } = await SB.from('solur').select('*').eq('id', id).single();
    if (error || !data) { alert('Salan fannst ekki: ' + (error?.message || '—')); return; }
    return openWith(data);
  }
  async function openByNum(num) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const norm = String(num || '').trim();
    if (!norm) return;
    const { data, error } = await SB.from('solur').select('*').eq('num', norm).maybeSingle();
    if (error || !data) { alert('Salan fannst ekki: ' + norm); return; }
    return openWith(data);
  }
  async function openFromJob(jobNum) {
    // Strip -Vn suffix to find parent sale num
    const parent = String(jobNum || '').replace(/-V\d+$/, '');
    return openByNum(parent);
  }

  function openWith(sale) {
    _sale = JSON.parse(JSON.stringify(sale)); // deep clone
    _sale.linur = Array.isArray(_sale.linur) ? _sale.linur : [];
    // 2026-07-08 (afsláttar-úttekt): carry the sale-level kr discount into the
    // editor. Before, recomputeTotals ignored `afslattur` and the save omitted
    // it — opening a discounted sale and pressing Vista rewrote samtals at
    // FULL price while the stale afslattur stayed on the row (print ≠ bókhald).
    // Initialize with the discount that ACTUALLY reduces this sale — the gap
    // between the line total and the stored samtals. That covers both gross
    // and legacy ex-VAT afslattur semantics, and lands on 0 for rows that are
    // already inconsistent (so saving them heals them instead of perpetuating
    // the mismatch).
    _afslKr = 0;
    if ((+_sale.afslattur || 0) > 0) {
      let t0 = 0;
      _sale.linur.forEach(l => {
        const q = +l.qty || 0, u = +l.unit_price_ex_vat || 0;
        const d = Math.max(0, Math.min(100, +l.discount_pct || 0));
        const v = (l.vsk_pct == null ? 24 : +l.vsk_pct) || 0;
        t0 += q * u * (1 - d / 100) * (1 + v / 100);
      });
      const gap = Math.round(t0 - (+_sale.samtals || 0));
      _afslKr = Math.max(0, Math.min(Math.round(t0), gap));
    }
    _origCustomer = {
      nafn: _sale.customer_nafn || '',
      kt: ''  // we'll fill from customer lookup if needed
    };
    buildDialog();
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  function buildDialog() {
    document.getElementById('_se-dlg')?.remove();
    _dlg = document.createElement('div');
    _dlg.id = '_se-dlg';
    _dlg.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    _dlg.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.35);width:min(1080px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700;display:flex;align-items:center;gap:10px">
              ✏️ Breyta sölu · ${esc(_sale.num || '(nýtt)')}
              ${stateBadge()}
            </h2>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px">Stofnað ${esc(formatDate(_sale.created_at))}${_sale.paid_at ? ' · Greitt ' + esc(formatDate(_sale.paid_at)) : ''}</div>
          </div>
          <button id="_se-x" type="button" style="background:transparent;border:1px solid #475569;color:#fff;font-size:18px;width:34px;height:34px;border-radius:7px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div id="_se-body" style="flex:1;overflow-y:auto;padding:18px 22px;background:#f8fafc"></div>
        <div id="_se-foot" style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"></div>
      </div>`;
    document.body.appendChild(_dlg);
    _dlg.querySelector('#_se-x').addEventListener('click', close);
    document.addEventListener('keydown', escHandler);
    renderBody();
    renderFooter();
  }

  function escHandler(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  function close() {
    document.removeEventListener('keydown', escHandler);
    _dlg?.remove();
    _dlg = null;
    _sale = null;
  }

  function stateBadge() {
    if (_sale.is_credit) return '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:3px 9px;border-radius:99px;text-transform:uppercase">Kreditfærsla</span>';
    if (isDraft(_sale))  return '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:3px 9px;border-radius:99px;text-transform:uppercase">📝 Drög</span>';
    return '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:3px 9px;border-radius:99px;text-transform:uppercase">✅ Lokað</span>';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear() +
           ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // ── Customer block ────────────────────────────────────────────────────────
  function renderBody() {
    const body = _dlg.querySelector('#_se-body');
    const locked = isLocked(_sale);
    const lockedAttr = locked ? 'disabled' : '';
    const inputStyle = 'width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;background:' + (locked ? '#f8fafc' : '#fff') + ';color:#0f172a;box-sizing:border-box;outline:none';

    const lockNote = locked
      ? '<div style="margin-bottom:14px;padding:10px 13px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:12.5px;color:#78350f">🔒 Þessi sala er lokuð (' + (_sale.is_credit ? 'kreditfærsla' : 'kláruð') + '). Notaðu kreditfærslu til að breyta.</div>'
      : (isUnsentFinal(_sale)
        ? '<div style="margin-bottom:14px;padding:10px 13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12.5px;color:#1e40af">✏️ Þessi reikningur er <b>tilbúinn en óSENDUR</b> — óhætt að breyta beint (t.d. bæta við afslætti). Engin kreditfærsla þörf fyrr en hann hefur verið sendur.</div>'
        : '');

    body.innerHTML = `
      ${lockNote}

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">👤 Viðskiptavinur</div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px">Nafn</label>
            <input id="_se-nafn" type="text" value="${esc(_sale.customer_nafn || '')}" ${lockedAttr} style="${inputStyle}">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px">Kennitala</label>
            <input id="_se-kt" type="text" placeholder="000000-0000" value="" ${lockedAttr} style="${inputStyle};font-family:monospace">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center">
              <span>Tengja við</span>
              ${!locked ? '<button id="_se-cust-search" type="button" style="font-size:10px;padding:2px 8px;border:1px solid #cbd5e1;background:#fff;border-radius:5px;cursor:pointer;color:#475569">🔎 Leita</button>' : ''}
            </label>
            <input id="_se-cust-info" type="text" readonly value="${_sale.customer_id ? 'ID ' + _sale.customer_id : '— ekki tengt —'}" style="${inputStyle};background:#f1f5f9;color:#64748b">
          </div>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">🛒 Línur</div>
          ${!locked ? '<button id="_se-add-line" type="button" style="font-size:11px;padding:5px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">+ Bæta við línu</button>' : ''}
        </div>
        <div id="_se-lines"></div>
        <div id="_se-totals" style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0"></div>
      </div>

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">📝 Athugasemdir</div>
        <div id="_se-notes-log" style="max-height:140px;overflow:auto;background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:2px 10px;margin-bottom:8px;display:none"></div>
        ${!locked ? `
        <div style="display:flex;gap:6px">
          <input id="_se-note-new" type="text" placeholder="+ Bæta við athugasemd…" style="flex:1;padding:7px 10px;border:1px solid #fcd34d;border-radius:6px;font:inherit;font-size:12.5px;background:#fff">
          <button id="_se-note-add" type="button" style="padding:7px 13px;background:#f59e0b;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">Bæta við</button>
        </div>` : ''}
      </div>
    `;

    renderLines();
    renderNotesLog();
    wireBody();
    loadKtIfMissing();
  }

  // Try to look up the kennitala for this sale's customer. Multiple sources,
  // in order of reliability:
  //   1. `customer_kt` column on the solur row (only present if SQL migration
  //      added the column — graceful fallback if not).
  //   2. `customer_id` lookup against vidskiptavinir / fyrirtaeki.
  //   3. `customer_nafn` lookup as a last resort — handles drafts where kt
  //      was typed but no customer was auto-linked.
  async function loadKtIfMissing() {
    const inp = _dlg && _dlg.querySelector('#_se-kt');
    if (!inp) return;

    // 1) Direct column on solur (may not exist yet)
    if (_sale.customer_kt && !inp.value) {
      const raw = String(_sale.customer_kt).replace(/[^0-9]/g, '');
      inp.value = raw.length === 10 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
      _origCustomer.kt = raw;
      return;
    }

    const SB = getSB();
    if (!SB) return;

    // 2) Resolve via customer_id — but disambiguate. fyrirtaeki and
    // vidskiptavinir have independent bigserials, so low ids overlap.
    // Pull both rows and pick the one whose nafn matches sale.customer_nafn.
    if (_sale.customer_id) {
      try {
        const [vRes, fRes] = await Promise.all([
          SB.from('vidskiptavinir').select('nafn,kennitala').eq('id', _sale.customer_id).maybeSingle(),
          SB.from('fyrirtaeki').select('nafn,kennitala').eq('id', _sale.customer_id).maybeSingle(),
        ]);
        const v = vRes.data, f = fRes.data;
        const norm = s => String(s || '').trim().toLowerCase();
        const saleNafn = norm(_sale.customer_nafn);
        let kt = '';
        if (saleNafn) {
          if (f && norm(f.nafn) === saleNafn) kt = f.kennitala || '';
          else if (v && norm(v.nafn) === saleNafn) kt = v.kennitala || '';
        }
        // Last-resort: prefer fyrirtaeki (sales-to-fyrirtaeki dominate; the
        // vidskiptavinir branch is mostly walk-ins).
        if (!kt) kt = (f && f.kennitala) || (v && v.kennitala) || '';
        if (kt) {
          if (!inp.value) {
            const raw = String(kt).replace(/[^0-9]/g, '');
            inp.value = raw.length === 10 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
          }
          _origCustomer.kt = kt;
          return;
        }
      } catch (_) {}
    }

    // 3) Last-resort: lookup by exact name (SAFÍR byggingar ehf. case)
    if (_sale.customer_nafn) {
      try {
        const nafn = _sale.customer_nafn;
        let r = await SB.from('fyrirtaeki').select('id,kennitala').eq('nafn', nafn).maybeSingle();
        let hit = r.data;
        let hitSrc = hit ? 'fyrirtaeki' : null;
        if (!hit) {
          r = await SB.from('vidskiptavinir').select('id,kennitala').eq('nafn', nafn).maybeSingle();
          hit = r.data;
          hitSrc = hit ? 'vidskiptavinir' : null;
        }
        if (hit && hit.kennitala) {
          if (!inp.value) {
            const raw = String(hit.kennitala).replace(/[^0-9]/g, '');
            inp.value = raw.length === 10 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
          }
          _origCustomer.kt = hit.kennitala;
          // 2026-05-19: ONLY auto-link customer_id if the hit is from
          // fyrirtaeki. solur.customer_id_fkey points to fyrirtaeki(id)
          // so setting it to a vidskiptavinir.id (e.g. Stefán's walk-in
          // row id=27) breaks the FK on the next save. For vidskiptavinir
          // matches we keep customer_id=null and rely on customer_kt /
          // customer_nafn for linkage.
          if (!_sale.customer_id && hitSrc === 'fyrirtaeki') {
            _sale.customer_id = hit.id;
          }
        }
      } catch (_) {}
    }
  }

  // ── Lines table ───────────────────────────────────────────────────────────
  function renderLines() {
    const el = _dlg.querySelector('#_se-lines');
    const locked = isLocked(_sale);
    const rows = _sale.linur.map((l, i) => {
      const qty = +l.qty || 0;
      const unit = +l.unit_price_ex_vat || 0;
      const vat = +l.vsk_pct || 24;
      const disc = +l.discount_pct || 0;
      const effUnit = unit * (1 - disc / 100);
      const lineEx = qty * effUnit;
      const lineInc = lineEx * (1 + vat / 100);
      const lockedAttr = locked ? 'disabled' : '';
      return `
        <tr data-i="${i}">
          <td style="padding:6px 8px;font-size:12px"><input data-f="desc" type="text" value="${esc(l.desc || '')}" ${lockedAttr} style="width:100%;padding:5px 7px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;background:${locked?'#f8fafc':'#fff'}"></td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;width:64px"><input data-f="qty" type="number" min="0" step="1" value="${qty}" ${lockedAttr} style="width:100%;padding:5px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:${locked?'#f8fafc':'#fff'}"></td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;width:90px"><input data-f="unit_price_ex_vat" type="number" min="0" step="0.01" value="${unit}" ${lockedAttr} style="width:100%;padding:5px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:${locked?'#f8fafc':'#fff'}"></td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;width:64px"><input data-f="discount_pct" type="number" min="0" max="100" step="1" value="${disc}" ${lockedAttr} title="Afsláttur % á þessa línu" style="width:100%;padding:5px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:${locked?'#f8fafc':'#fff'}"></td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;width:54px"><input data-f="vsk_pct" type="number" min="0" max="50" step="1" value="${vat}" ${lockedAttr} style="width:100%;padding:5px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:${locked?'#f8fafc':'#fff'}"></td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;width:100px;font-weight:700;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums">${fmtKr(lineInc)}</td>
          <td style="padding:6px 4px;width:32px;text-align:center">${locked ? '' : '<button data-action="rm" type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:2px 6px" title="Fjarlægja">✕</button>'}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b">
            <th style="padding:6px 8px;text-align:left">Lýsing</th>
            <th style="padding:6px 8px;text-align:right">Magn</th>
            <th style="padding:6px 8px;text-align:right">Ein. verð</th>
            <th style="padding:6px 8px;text-align:right">Afsl %</th>
            <th style="padding:6px 8px;text-align:right">VSK %</th>
            <th style="padding:6px 8px;text-align:right">Samtals m/VSK</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" style="padding:18px;text-align:center;color:#94a3b8;font-style:italic;font-size:12.5px">Engar línur — bættu við vörum með hnappinum hér að ofan</td></tr>'}</tbody>
      </table>`;

    renderTotals();
    wireLineInputs();
  }

  function recomputeTotals() {
    let ex = 0, vsk = 0;
    _sale.linur.forEach(l => {
      const qty = +l.qty || 0;
      const unit = +l.unit_price_ex_vat || 0;
      const disc = +l.discount_pct || 0;
      const vat = +l.vsk_pct || 24;
      const effUnit = unit * (1 - disc / 100);
      const lineEx = qty * effUnit;
      ex += lineEx;
      vsk += lineEx * (vat / 100);
    });
    // 2026-07-08: apply the sale-level kr discount (gross — off the final
    // price m. vsk, the POS convention) proportionally on ex and vsk, so the
    // saved totals keep matching what SalaInvoice prints (case C). VSK takes
    // the rounding remainder so ex + vsk === total exactly.
    const t0 = ex + vsk;
    const a = Math.max(0, Math.min(Math.round(t0), Math.round(+_afslKr || 0)));
    const total = Math.round(t0) - a;
    const exR = Math.round(ex * (t0 > 0 ? total / t0 : 1));
    return { ex: exR, vsk: total - exR, total, afsl: a, gross: Math.round(t0) };
  }
  function renderTotals() {
    const t = recomputeTotals();
    const el = _dlg.querySelector('#_se-totals');
    const locked = isLocked(_sale);
    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;font-size:13px;color:#b45309">
        <span>Afsláttur (kr m. vsk):</span>
        <input id="_se-afsl" type="number" min="0" step="1" value="${t.afsl > 0 ? t.afsl : ''}" placeholder="0" ${locked ? 'disabled' : ''}
          style="width:96px;padding:4px 7px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:right;background:#fff">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:24px;font-size:13px;color:#475569;margin-top:6px">
        <span>Án VSK: <strong id="_se-t-ex">${fmtKr(t.ex)}</strong></span>
        <span>VSK: <strong id="_se-t-vsk">${fmtKr(t.vsk)}</strong></span>
      </div>
      <div style="display:flex;justify-content:flex-end;font-size:17px;font-weight:800;color:#0f172a;margin-top:6px">Samtals:&nbsp;<span id="_se-t-total">${fmtKr(t.total)}</span></div>`;
    // Update the summary spans in place on input — a full re-render here
    // would rebuild the input mid-typing and drop focus.
    const inp = el.querySelector('#_se-afsl');
    if (inp && !locked) inp.addEventListener('input', () => {
      _afslKr = Math.max(0, Math.round(+inp.value || 0));
      const t2 = recomputeTotals();
      el.querySelector('#_se-t-ex').textContent = fmtKr(t2.ex);
      el.querySelector('#_se-t-vsk').textContent = fmtKr(t2.vsk);
      el.querySelector('#_se-t-total').textContent = fmtKr(t2.total);
    });
  }

  // ── Wire events ───────────────────────────────────────────────────────────
  function wireLineInputs() {
    if (isLocked(_sale)) return;
    _dlg.querySelectorAll('#_se-lines tbody tr').forEach(tr => {
      const i = +tr.dataset.i;
      tr.querySelectorAll('input[data-f]').forEach(inp => {
        inp.addEventListener('input', () => {
          const f = inp.dataset.f;
          const v = inp.type === 'number' ? (+inp.value || 0) : inp.value;
          _sale.linur[i][f] = v;
          renderTotals();
          // re-render the row's line-total cell only
          const row = recomputeRow(i);
          const cell = tr.querySelector('td:nth-child(6)');
          if (cell) cell.textContent = fmtKr(row);
        });
      });
      const rm = tr.querySelector('button[data-action="rm"]');
      if (rm) rm.addEventListener('click', async () => {
        const msg = 'Fjarlægja "' + (_sale.linur[i].desc || 'línuna') + '"?';
        const ok = (window.Confirm && Confirm.show) ? await Confirm.show(msg) : window.confirm(msg);
        if (!ok) return;
        _sale.linur.splice(i, 1);
        renderLines();
      });
    });
  }
  function recomputeRow(i) {
    const l = _sale.linur[i];
    const qty = +l.qty || 0;
    const unit = +l.unit_price_ex_vat || 0;
    const disc = +l.discount_pct || 0;
    const vat = +l.vsk_pct || 24;
    const effUnit = unit * (1 - disc / 100);
    return qty * effUnit * (1 + vat / 100);
  }

  function wireBody() {
    const addBtn = _dlg.querySelector('#_se-add-line');
    if (addBtn) addBtn.addEventListener('click', addLine);

    const noteBtn = _dlg.querySelector('#_se-note-add');
    if (noteBtn) noteBtn.addEventListener('click', addNote);
    const noteInp = _dlg.querySelector('#_se-note-new');
    if (noteInp) noteInp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addNote(); }
    });

    const searchBtn = _dlg.querySelector('#_se-cust-search');
    if (searchBtn) searchBtn.addEventListener('click', openCustomerLookup);
  }

  async function addLine() {
    if (window.VorurPicker && typeof window.VorurPicker.open === 'function') {
      window.VorurPicker.open(p => {
        if (!p) return;
        _sale.linur.push({
          desc: p.nafn || 'Ný vara',
          qty: 1,
          unit_price_ex_vat: +p.verd_an_vsk || 0,
          vsk_pct: +p.vsk_prosenta || 24,
          discount_pct: 0,
          // 2026-08-19 (Agnar #12): flokkur er geymt „Þjónusta" (stór Þ); gamla
          // === 'þjónusta' (lítið þ) merkti CO₂-þjónustu ranglega sem 'product' og
          // sleppti krefst_verkbeidni, svo ritillinn bjó ekki til verkbeiðni fyrir
          // nýtt tæki. Nú case-insensitive + krefst_verkbeidni sett.
          type: /þjónusta/i.test(p.flokkur || '') ? 'service' : 'product',
          product_id: p.id,
          krefst_verkbeidni: /þjónusta/i.test(p.flokkur || '')
        });
        renderLines();
      });
      return;
    }
    // Fallback: plain blank line
    _sale.linur.push({ desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24, discount_pct: 0, type: 'product' });
    renderLines();
  }

  function addNote() {
    const inp = _dlg.querySelector('#_se-note-new');
    if (!inp) return;
    const txt = (inp.value || '').trim();
    if (!txt) { inp.focus(); return; }
    const now = new Date();
    const stamp = now.getFullYear() + '-' +
                  String(now.getMonth()+1).padStart(2,'0') + '-' +
                  String(now.getDate()).padStart(2,'0') + ' ' +
                  String(now.getHours()).padStart(2,'0') + ':' +
                  String(now.getMinutes()).padStart(2,'0');
    const entry = '[' + stamp + '] ' + txt;
    _sale.athugasemdir = _sale.athugasemdir ? (_sale.athugasemdir + '\n' + entry) : entry;
    inp.value = '';
    renderNotesLog();
  }

  // Each saved athugasemd is one newline-separated line in _sale.athugasemdir
  // (there's no separate comments table/array — see addNote above). Splitting
  // it back out lets us render + delete individual entries while keeping the
  // storage format unchanged.
  function noteLines() {
    return String(_sale.athugasemdir || '').split('\n').filter(l => l.trim() !== '');
  }

  function renderNotesLog() {
    const log = _dlg && _dlg.querySelector('#_se-notes-log');
    if (!log) return;
    const locked = isLocked(_sale);
    const lines = noteLines();
    if (!lines.length) { log.style.display = 'none'; log.innerHTML = ''; return; }
    log.style.display = 'block';
    log.innerHTML = lines.map((line, i) => `
      <div class="_se-note-row" data-i="${i}" style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;${i < lines.length - 1 ? 'border-bottom:1px solid #fde68a' : ''}">
        <div style="flex:1;font-size:12.5px;color:#334155;line-height:1.45;white-space:pre-wrap">${esc(line)}</div>
        ${!locked ? `<button type="button" data-action="rm-note" data-i="${i}" title="Eyða athugasemd" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px;font-weight:700;padding:2px 6px;flex-shrink:0;line-height:1">✕</button>` : ''}
      </div>`).join('');
    if (!locked) {
      log.querySelectorAll('button[data-action="rm-note"]').forEach(btn => {
        btn.addEventListener('click', () => removeNote(+btn.dataset.i));
      });
    }
  }

  async function removeNote(idx) {
    const lines = noteLines();
    const msg = 'Eyða athugasemd?\n\n' + (lines[idx] || '');
    const ok = (window.Confirm && Confirm.show) ? await Confirm.show(msg) : window.confirm(msg);
    if (!ok) return;
    const log = _dlg && _dlg.querySelector('#_se-notes-log');
    const row = log && log.querySelector('._se-note-row[data-i="' + idx + '"]');
    const commitRemoval = () => {
      const cur = noteLines();
      cur.splice(idx, 1);
      _sale.athugasemdir = cur.join('\n');
      renderNotesLog();
      if (window.Toast && Toast.show) Toast.show('✓ Athugasemd fjarlægð');
    };
    if (row) {
      row.style.transition = 'opacity .15s ease, transform .15s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(8px)';
      setTimeout(commitRemoval, 150);
    } else {
      commitRemoval();
    }
  }

  // ── Customer lookup ───────────────────────────────────────────────────────
  // 2026-06-16: replaced the two stacked native prompt()s (search term + "type
  // the number 1-N" picker) with a themed search-and-click modal — the numbered
  // prompt was near-unusable on the phone (S26) and easy to mis-type.
  function openCustomerLookup() {
    const SB = getSB();
    if (!SB) return;
    const ov = document.createElement('div');
    ov.id = '_se-cl-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100060;display:flex;align-items:flex-start;justify-content:center;padding:40px 12px;backdrop-filter:blur(2px)';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:16px;width:480px;max-width:96vw;max-height:84vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.3);overflow:hidden">'+
        '<div style="padding:16px 18px;border-bottom:1px solid #eef2f7;display:flex;gap:8px;align-items:center">'+
          '<input id="_se-cl-q" type="text" placeholder="Leita: nafn eða kennitala…" '+
            'style="flex:1;min-width:0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;font-size:14px">'+
          '<button id="_se-cl-go" type="button" style="padding:10px 16px;background:#2563eb;color:#fff;border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;flex-shrink:0">Leita</button>'+
          '<button id="_se-cl-x" type="button" style="padding:10px 12px;background:#f1f5f9;color:#475569;border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:13px;flex-shrink:0">✕</button>'+
        '</div>'+
        '<div id="_se-cl-res" style="overflow-y:auto;padding:8px;flex:1"><div style="color:#94a3b8;font-size:13px;padding:18px;text-align:center">Sláðu inn leitarorð…</div></div>'+
      '</div>';
    document.body.appendChild(ov);
    const qEl = ov.querySelector('#_se-cl-q');
    const resEl = ov.querySelector('#_se-cl-res');
    function closeOv(){ ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e){ if (e.key === 'Escape') closeOv(); }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', e => { if (e.target === ov) closeOv(); });
    ov.querySelector('#_se-cl-x').addEventListener('click', closeOv);
    setTimeout(() => { try { qEl.focus(); } catch(_){} }, 30);

    function runSearch(){
      const term = qEl.value.trim();
      if (!term) { resEl.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:18px;text-align:center">Sláðu inn leitarorð…</div>'; return; }
      resEl.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:18px;text-align:center">Leita…</div>';
      const digits = String(term).replace(/[^0-9]/g, '');
      const isKt = digits.length >= 6;
      Promise.all([
        isKt ? SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang,afslattur_pct').or(`kennitala.ilike.${digits}%`).limit(8)
             : SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang,afslattur_pct').ilike('nafn', '%'+term+'%').limit(8),
        isKt ? SB.from('vidskiptavinir').select('id,nafn,kennitala,simi,heimilisfang,afslattur_pct').or(`kennitala.ilike.${digits}%`).limit(8)
             : SB.from('vidskiptavinir').select('id,nafn,kennitala,simi,heimilisfang,afslattur_pct').ilike('nafn','%'+term+'%').limit(8)
      ]).then(([fy, vk]) => {
        // 2026-05-19: tag each row with its source table. solur.customer_id_fkey
        // points to fyrirtaeki only, so a vidskiptavinir.id (like Stefán's
        // walk-in row id=27) would violate the FK if assigned. We mark the
        // source on the picker row and use it to decide whether to set
        // customer_id at commit time.
        const fyRows = (fy.data || []).map(r => ({ ...r, _src: 'fyrirtaeki' }));
        const vkRows = (vk.data || []).map(r => ({ ...r, _src: 'vidskiptavinir' }));
        const all = [].concat(fyRows, vkRows);
        if (!all.length) { resEl.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:18px;text-align:center">Engin samsvörun.</div>'; return; }
        resEl.innerHTML = all.map((c, i) =>
          '<button type="button" class="_se-cl-pick" data-i="'+i+'" style="display:block;width:100%;text-align:left;padding:11px 12px;margin:4px 0;border:1px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font:inherit">'+
            '<div style="font-weight:700;font-size:14px;color:#0f172a">'+esc(c.nafn||'')+(c._src==='vidskiptavinir'?' <span style="font-weight:600;font-size:11px;color:#7c3aed">· einstaklingur</span>':'')+'</div>'+
            '<div style="font-size:12px;color:#64748b;margin-top:2px">'+(c.kennitala?('kt '+esc(c.kennitala)):'')+(c.afslattur_pct?(' · '+c.afslattur_pct+'% afsl.'):'')+(c.heimilisfang?(' · '+esc(c.heimilisfang)):'')+'</div>'+
          '</button>'
        ).join('');
        resEl.querySelectorAll('._se-cl-pick').forEach(btn => {
          btn.addEventListener('click', async () => {
            const picked = all[parseInt(btn.getAttribute('data-i'),10)];
            if (!picked) return;
            _sale.customer_nafn = picked.nafn || '';
            // Only set customer_id when picked row is from fyrirtaeki — the FK
            // constraint on solur.customer_id only allows fyrirtaeki ids. For
            // vidskiptavinir picks (einstaklingar), leave the FK null but keep
            // the name + kt linked via the kt column.
            _sale.customer_id = (picked._src === 'fyrirtaeki') ? picked.id : null;
            _dlg.querySelector('#_se-nafn').value = picked.nafn || '';
            _dlg.querySelector('#_se-kt').value = picked.kennitala || '';
            const idLabel = (picked._src === 'fyrirtaeki') ? ('Fyrirtæki ID ' + picked.id) : ('Einstaklingur ID ' + picked.id);
            _dlg.querySelector('#_se-cust-info').value = idLabel + (picked.afslattur_pct ? ' · ' + picked.afslattur_pct + '% afsl.' : '');
            closeOv();
            // Offer to apply discount automatically
            if (picked.afslattur_pct && _sale.linur.length) {
              if (await Confirm.show(picked.nafn + ' hefur ' + picked.afslattur_pct + '% afslátt. Beita á öllum línum?')) {
                _sale.linur.forEach(l => { l.discount_pct = picked.afslattur_pct; });
                renderLines();
              }
            }
          });
        });
      }).catch(() => {
        resEl.innerHTML = '<div style="color:#dc2626;font-size:13px;padding:18px;text-align:center">Villa við leit.</div>';
      });
    }
    ov.querySelector('#_se-cl-go').addEventListener('click', runSearch);
    qEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
  }

  // ── Footer + actions ──────────────────────────────────────────────────────
  function renderFooter() {
    const f = _dlg.querySelector('#_se-foot');
    const locked = isLocked(_sale);
    let html = '<button id="_se-close" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>';
    if (isDraft(_sale)) {
      html += '<button id="_se-save" type="button" style="padding:9px 18px;background:#f59e0b;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista sem drög</button>';
      html += '<button id="_se-finalize" type="button" style="padding:9px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✅ Klára sölu</button>';
    } else if (isUnsentFinal(_sale)) {
      // Unsent reikningur → save the changes straight onto it (keeps status final).
      html += '<button id="_se-save" type="button" title="Vista breytingar á þessum óSENDA reikningi (t.d. afsláttur)" style="padding:9px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista breytingar</button>';
    } else if (!_sale.is_credit) {
      html += '<button id="_se-credit" type="button" style="padding:9px 18px;background:#c2410c;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">↩ Kreditfæra</button>';
    }
    f.innerHTML = html;
    f.querySelector('#_se-close').addEventListener('click', close);
    const s = f.querySelector('#_se-save'); if (s) s.addEventListener('click', () => commit({ finalize: false }));
    const fin = f.querySelector('#_se-finalize'); if (fin) fin.addEventListener('click', () => commit({ finalize: true }));
    const cr = f.querySelector('#_se-credit'); if (cr) cr.addEventListener('click', () => {
      close();
      if (window.kreditFaera) window.kreditFaera(_sale.num);
      else if (window.openKreditLookup) window.openKreditLookup();
    });
  }

  async function commit({ finalize }) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    // Sync form fields back to _sale
    const nafn = _dlg.querySelector('#_se-nafn').value.trim();
    const kt = _dlg.querySelector('#_se-kt').value.trim();
    const ktClean = kt.replace(/[^0-9]/g, '');
    // 2026-07-08: SalaInvoice's renderFromSale (case B) ignores BOTH discounts
    // when lines carry discount_pct AND afslattur > 0. If that combo is about
    // to be saved, bake the line discounts into the unit prices (same
    // convention as patch 165's per-line afsláttur) so only the kr discount
    // remains at sale level — prints then go through case C correctly.
    if (Math.round(+_afslKr || 0) > 0 && _sale.linur.some(l => (+l.discount_pct || 0) > 0)) {
      _sale.linur = _sale.linur.map(l => {
        const d = Math.max(0, Math.min(100, +l.discount_pct || 0));
        if (!d) return l;
        const nl = { ...l };
        nl.unit_price_ex_vat = Math.round((+l.unit_price_ex_vat || 0) * (1 - d / 100));
        nl.desc = String(l.desc || '') + ' · −' + d + '% afsl.';
        delete nl.discount_pct;
        return nl;
      });
    }
    const t = recomputeTotals();
    const customerChanged = nafn !== (_origCustomer.nafn || '');

    if (finalize) {
      // 2026-05-14: use the non-blocking Confirm.show instead of native
      // confirm() — native confirm freezes the renderer + blocks any
      // browser automation / popups.
      const msg = 'Klára sölu og senda krafa?\n\n' + (nafn || '—') + ' · ' + fmtKr(t.total);
      let ok;
      if (window.Confirm && typeof Confirm.show === 'function') {
        ok = await Confirm.show(msg, { okText: '✅ Klára', cancelText: 'Hætta við' });
      } else {
        ok = window.confirm(msg);
      }
      if (!ok) return;
    }

    // Auto-resolve customer_id from kt if we have one but no link yet.
    // ONLY fyrirtaeki ids are valid here — solur.customer_id_fkey enforces
    // fyrirtaeki(id). vidskiptavinir matches keep customer_id=null and rely
    // on customer_kt / customer_nafn for linkage.
    if (ktClean.length === 10 && !_sale.customer_id) {
      try {
        const r = await SB.from('fyrirtaeki').select('id').eq('kennitala', ktClean).maybeSingle();
        if (r.data && r.data.id) _sale.customer_id = r.data.id;
      } catch (_) {}
    }

    _sale.customer_nafn = nafn;
    const update = {
      customer_nafn: nafn,
      customer_id: _sale.customer_id || null,
      linur: _sale.linur,
      upphaed_an_vsk: t.ex,
      vsk_upphaed: t.vsk,
      samtals: t.total,
      // 2026-07-08: keep the sale-level discount on the row (was omitted —
      // stale afslattur + full-price samtals made print ≠ bókhald).
      afslattur: t.afsl,
      athugasemdir: _sale.athugasemdir || ''
    };
    if (finalize) {
      update.status = 'final';
      // For greitt_sidar drafts, leave paid_at null (still owed); for cash/card finalize sets paid_at
      if (_sale.greitt_med && _sale.greitt_med !== 'greitt_sidar' && _sale.greitt_med !== 'reikningur') {
        update.paid_at = new Date().toISOString();
      }
    }

    // Save sale — try with customer_kt first; if the column doesn't exist on
    // this database yet (no SQL migration), retry without it.
    let r = await SB.from('solur').update({ ...update, customer_kt: ktClean || null }).eq('id', _sale.id);
    if (r.error && /customer_kt/i.test(r.error.message || '')) {
      // Column missing — fall back. customer_id resolution above still keeps
      // the kt linked via the relation.
      r = await SB.from('solur').update(update).eq('id', _sale.id);
    }
    if (r.error) { alert('Villa: ' + r.error.message); return; }

    // Cascade customer change to linked verkbeidnir (R-NNN-V*)
    if (customerChanged && _sale.num) {
      try {
        await SB.from('verkbeidnir').update({ customer: nafn }).like('num', _sale.num + '-V%');
      } catch (e) { console.warn('[sale-editor] verkbeidnir cascade:', e); }
    }

    // 2026-08-19 (Agnar #12): Sölu-ritillinn bjó áður ALDREI til verkbeiðnir — hann
    // skrifaði bara solur.linur. Tæki sem bætt var við í ritlinum EFTIR afgreiðslu
    // skilaði sér því aldrei á Verkstæði. Speglum pos.js: hver tæki-lína fær sína
    // verkbeiðni (num+'-V<n>') + verklidur (gram-based → 1 stk, með qty í service;
    // annars qty stk). Aðeins VIÐBÓT umfram núverandi -V<n>, talið upp frá hæsta
    // svo endurvistun tvítekur ekki. byrjunargjald (Fylgihlutir) verður aldrei tæki.
    if (_sale.num) {
      try {
        const isTaeki = l => (l.type === 'service' || l.krefst_verkbeidni === true)
          && !/byrjunargjald/i.test(l.desc || '');
        const taeki = (_sale.linur || []).filter(isTaeki);
        const ex = await SB.from('verkbeidnir').select('num').like('num', _sale.num + '-V%');
        const existing = ex.data || [];
        let maxIdx = 0;
        existing.forEach(row => { const m = /-V(\d+)$/.exec(row.num || ''); if (m) maxIdx = Math.max(maxIdx, +m[1]); });
        const tmpSerial = () => { const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let z = 0; z < 6; z++) s += A[Math.floor(Math.random() * A.length)]; return 'TMP-' + s; };
        for (let k = existing.length; k < taeki.length; k++) {
          const sl = taeki[k];
          const gram = /\b\d+\s*(gr?\.?|gramm|ml|litr?)\b/i.test(sl.desc || '');
          const qty = parseInt(sl.qty, 10) || 1;
          const vat = (sl.vsk_pct != null ? +sl.vsk_pct : 24);
          const verd = Math.round((+sl.unit_price_ex_vat || 0) * (gram ? qty : 1) * (1 + vat / 100));
          const job = await SB.from('verkbeidnir').insert({
            num: _sale.num + '-V' + (++maxIdx),
            status: 'received',
            customer: nafn,
            dropoff: new Date().toISOString().slice(0, 10),
            notes: sl.desc,
            verd: verd
          }).select('id').single();
          if (job.error || !job.data) { console.warn('[sale-editor] verkbeidni insert:', job.error); continue; }
          const count = gram ? 1 : qty;
          const rows = [];
          for (let u = 0; u < count; u++) rows.push({
            job_id: job.data.id, serial: tmpSerial(), type: '—', size: '', status: 'received',
            service: gram ? (sl.desc + ' × ' + qty + ' (samtals)') : sl.desc
          });
          if (rows.length) { try { await SB.from('verklidur').insert(rows); } catch (e) { console.warn('[sale-editor] verklidur insert:', e); } }
        }
      } catch (e) { console.warn('[sale-editor] verkbeidnir reconcile:', e); }
    }

    if (window.Toast && Toast.show) Toast.show(finalize ? '✓ Sala kláruð · birtist í Bókhaldi' : '✓ Drög vistuð');
    close();
    // Refresh open views
    try { window.App && App.refreshAll && App.refreshAll(); } catch (_) {}
    try { window.DB && DB.loadAll && DB.loadAll(); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('sale-edited', { detail: { id: _sale && _sale.id, finalize } })); } catch (_) {}
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.SaleEditor = {
    openById, openByNum, openFromJob, isDraft, isLocked
  };
  console.log('[patch-142] sale-editor installed — window.SaleEditor.{openById,openByNum,openFromJob}');
})();
/* === END SALE EDITOR === */
