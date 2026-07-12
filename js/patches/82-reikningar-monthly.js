/* === REIKNINGAR MONTHLY OVERSIGHT v1 ===
 *
 * Adds an end-of-month batch view to the Reikningar modal so the user can:
 *   • See all unpaid "Setja í reikning" + "Greitt síðar" sales grouped by
 *     customer + month
 *   • See total amount per customer per month
 *   • Mark a whole batch as "invoice sent in heimabanka" with a manual
 *     amount + invoice number → flips paid_at on each row
 *
 * Why: at end of month the user collects every "Setja í reikning" transaction
 * for company X, sums them, sends ONE bill via heimabanka, and needs to mark
 * all those transactions as invoiced. The default Reikningar list shows every
 * row separately and doesn't aggregate.
 *
 * Wire-up: adds a "📊 Mánaðar yfirlit" button at the top of the Reikningar
 * modal. Click swaps the body to the grouped view.
 */
(() => {
  if (window.__reikMonthlyInstalled) return;
  window.__reikMonthlyInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n){ const v=Math.round(Number(n)||0); return v.toLocaleString('is-IS') + ' kr'; }
  function fmtMonth(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const mo = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
    return mo[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtDate(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function monthKey(iso){
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  // Watch the existing Reikningar modal — when it opens, inject a tab toggle
  function ensureToggle() {
    const modal = document.getElementById('reik-master-modal');
    if (!modal) return;
    const header = modal.querySelector('h2');
    if (!header || header.parentElement.querySelector('._reik_monthly_btn')) return;
    const wrap = header.parentElement;
    const tabBtn = document.createElement('button');
    tabBtn.className = '_reik_monthly_btn';
    tabBtn.type = 'button';
    tabBtn.textContent = '📊 Mánaðar yfirlit';
    tabBtn.style.cssText = 'margin-left:14px;padding:7px 12px;border:1px solid #475569;border-radius:8px;background:#1e293b;color:#cbd5e1;cursor:pointer;font-size:13px;font-weight:600';
    tabBtn.addEventListener('click', () => openMonthly(modal));
    header.insertAdjacentElement('afterend', tabBtn);
  }
  new MutationObserver(ensureToggle).observe(document.body, { childList: true, subtree: true });

  async function openMonthly(modal) {
    const holder = modal.querySelector('#_reik_table');
    if (!holder) return;
    holder.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður mánaðaryfirliti…</div>';

    const SB = getSB();
    if (!SB) { holder.innerHTML = '<div style="color:#dc2626;padding:20px">Gagnagrunnur ekki tengdur</div>'; return; }

    // Pull all unpaid Reikningur + Greitt síðar sales (last 12 months for sanity).
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    // Monthly batch billing only applies to "Setja í reikning" (krafa í heimabanka).
    // "Greitt síðar" gets paid directly at pickup — not a monthly invoice.
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,paid_at,paid_method,created_at')
      .eq('greitt_med', 'reikningur')
      .is('paid_at', null)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (r.error) {
      holder.innerHTML = '<div style="color:#dc2626;padding:20px">Villa: ' + esc(r.error.message) + '</div>';
      return;
    }
    const rows = r.data || [];
    if (!rows.length) {
      holder.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">🎉 Engir ógreiddir reikningar</div>';
      return;
    }

    // Group: customer → month → [rows]
    const byCust = new Map();
    rows.forEach(s => {
      const k = (s.customer_nafn || '— ').trim();
      if (!byCust.has(k)) byCust.set(k, new Map());
      const months = byCust.get(k);
      const mk = monthKey(s.created_at);
      if (!months.has(mk)) months.set(mk, []);
      months.get(mk).push(s);
    });

    // Sort customer alphabetically, months descending
    const customers = Array.from(byCust.keys()).sort((a, b) => a.localeCompare(b, 'is'));

    let html = '<div style="margin-bottom:14px;color:#94a3b8;font-size:13px">' +
      'Ógreiddir <b>Setja í reikning</b> reikningar, flokkaðir eftir viðskiptavin og mánuði. ' +
      'Smelltu á <b>📤 Senda reikning</b> til að merkja heilan mánuð sem sendan í heimabanka. ' +
      '<i style="color:#fbbf24">Greitt síðar</i> færslur eru ekki hér — þær greiðast við afhendingu (sjá Reikningar lista).' +
      '</div>';

    customers.forEach(cust => {
      const months = byCust.get(cust);
      const mkeys = Array.from(months.keys()).sort().reverse();
      const custTotal = mkeys.reduce((s, mk) => s + months.get(mk).reduce((ss, r2) => ss + (Number(r2.samtals) || 0), 0), 0);
      html += '<div style="background:#1e293b;border-radius:10px;padding:14px 18px;margin-bottom:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:16px;font-weight:700;color:#fff">🏢 ' + esc(cust) + '</div>' +
          '<div style="font-size:14px;color:#fbbf24;font-weight:700">' + fmtKr(custTotal) + '</div>' +
        '</div>';
      mkeys.forEach(mk => {
        const monthRows = months.get(mk);
        const mTotal = monthRows.reduce((s, r2) => s + (Number(r2.samtals) || 0), 0);
        const ids = monthRows.map(r2 => r2.id).join(',');
        html += '<div style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;margin-top:8px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<div style="font-weight:600;color:#cbd5e1">📅 ' + esc(fmtMonth(monthRows[0].created_at)) + ' · ' + monthRows.length + ' færslur</div>' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<div style="font-weight:600;color:#fff">' + fmtKr(mTotal) + '</div>' +
              '<button type="button" class="_reik_send_month" data-ids="' + ids + '" data-cust="' + esc(cust) + '" data-month="' + esc(fmtMonth(monthRows[0].created_at)) + '" data-total="' + Math.round(mTotal) + '" ' +
                'style="background:#16a34a;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px">📤 Senda reikning</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:12px;color:#94a3b8;font-family:monospace;line-height:1.7">' +
            monthRows.map(r2 => esc(r2.num || '#'+r2.id) + ' · ' + fmtDate(r2.created_at) + ' · ' + fmtKr(r2.samtals || 0) + ' · ' + esc(labelFor(r2.greitt_med))).join('<br>') +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    });

    holder.innerHTML = html;
    holder.querySelectorAll('._reik_send_month').forEach(btn => {
      btn.addEventListener('click', () => sendMonthInvoice(btn));
    });
  }

  function labelFor(method) {
    if (method === 'reikningur') return 'Setja í reikning';
    if (method === 'greitt_sidar') return 'Greitt síðar';
    return method || '';
  }

  async function sendMonthInvoice(btn) {
    const ids = btn.getAttribute('data-ids').split(',').map(s => parseInt(s, 10)).filter(Boolean);
    const cust = btn.getAttribute('data-cust');
    const month = btn.getAttribute('data-month');
    const totalGuess = btn.getAttribute('data-total');
    if (!ids.length) return;
    const amtStr = prompt('Senda reikning í heimabanka\n\nViðskiptavinur: ' + cust + '\nMánuður: ' + month + '\nFærslur: ' + ids.length + '\n\nUpphæð (kr) sem var send:', totalGuess);
    if (amtStr === null) return;
    const amt = parseFloat(String(amtStr).replace(/[^0-9.]/g, ''));
    if (isNaN(amt) || amt <= 0) { alert('Ógild upphæð'); return; }
    const invNum = prompt('Reikningsnúmer (valfrjálst, t.d. úr heimabanka):', '');
    const SB = getSB();
    if (!SB) { alert('Gagnagrunnur ekki tengdur'); return; }
    const note = '[Heimabanki] kr ' + Math.round(amt).toLocaleString('is-IS') + (invNum ? ' · #' + invNum : '');
    btn.disabled = true; btn.textContent = '⏳ Vista…';
    try {
      // 2026-07-12: BÆTA nótunni við í stað þess að YFIRSKRIFA hana — gamla
      // útgáfan þurrkaði út deild-/pöntunarnótur (t.d. „Devision 10") þegar
      // mánaðarbunki var merktur sendur. Lesum núverandi athugasemdir per röð
      // og skeytum [Heimabanki]-línunni aftan á (idempotent — sleppum ef hún er
      // þegar til). Uppfærslan verður per-röð svo hver nóta haldist.
      const paidAt = new Date().toISOString();
      const { data: rows, error: readErr } = await SB.from('solur')
        .select('id, athugasemdir')
        .in('id', ids);
      if (readErr) throw readErr;
      for (const row of (rows || [])) {
        const existing = String(row.athugasemdir || '').trim();
        const athugasemdir = existing.indexOf(note) >= 0
          ? existing
          : (existing ? existing + '\n' + note : note);
        const { error } = await SB.from('solur')
          .update({ paid_at: paidAt, paid_method: 'heimabanki', athugasemdir })
          .eq('id', row.id);
        if (error) throw error;
      }
      const modal = document.getElementById('reik-master-modal');
      if (modal) await openMonthly(modal); // re-render
      if (window.Toast && Toast.show) Toast.show('✓ ' + ids.length + ' færslur merktar sem sendar — ' + Math.round(amt).toLocaleString('is-IS') + ' kr');
    } catch (e) {
      btn.disabled = false; btn.textContent = '📤 Senda reikning';
      alert('Villa: ' + (e.message || e));
    }
  }

  console.log('[reikningar-monthly] installed');
})();
/* === END REIKNINGAR MONTHLY OVERSIGHT v1 === */
