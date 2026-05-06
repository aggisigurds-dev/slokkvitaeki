/* === SERVICE CERTIFICATE v1 === */
/* Generates a printable Þjónustuvottorð (service certificate) after a field
 * inspection or workshop job is completed.
 *
 * Injects a "🖨 Vottorð" button:
 *   - In Þjónustutæki unit detail panels (field service)
 *   - In Verkstæði job detail panel when status is done
 *
 * The certificate shows:
 *   Company header · Customer info · Equipment list · Service details
 *   Technician · Date · Next inspection · Signature line
 *
 * Uses window.print() with a @media print stylesheet for clean A4 output.
 */
(() => {
  if (window.__serviceCertInstalled) return;
  window.__serviceCertInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '. ' + ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'][d.getMonth()] + ' ' + d.getFullYear();
  }
  function todayISO() {
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  // ── Print stylesheet (injected once) ──────────────────────────────────────
  if (!document.getElementById('cert-print-style')) {
    const s = document.createElement('style');
    s.id = 'cert-print-style';
    s.textContent = `
      @media print {
        body > *:not(#cert-print-frame) { display: none !important; }
        #cert-print-frame { display: block !important; position: static !important; }
      }
      #cert-print-frame {
        display: none;
        position: fixed; inset: 0; z-index: 99999;
        background: #fff; overflow-y: auto;
      }
      .cert-page {
        width: 210mm; min-height: 280mm;
        margin: 0 auto; padding: 20mm 18mm;
        font-family: 'IBM Plex Sans', Arial, sans-serif;
        font-size: 10pt; color: #1e293b; box-sizing: border-box;
      }
      .cert-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C93C1D; padding-bottom: 10px; margin-bottom: 16px; }
      .cert-logo-area { display: flex; align-items: center; gap: 10px; }
      .cert-logo-svg { width: 40px; height: 40px; flex-shrink: 0; }
      .cert-company-name { font-size: 14pt; font-weight: 700; color: #C93C1D; }
      .cert-company-sub  { font-size: 8pt; color: #64748b; }
      .cert-title-area { text-align: right; }
      .cert-title { font-size: 16pt; font-weight: 700; color: #1e293b; }
      .cert-num   { font-size: 9pt; color: #64748b; margin-top: 2px; }
      .cert-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-bottom: 16px; }
      .cert-info-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
      .cert-info-block h3 { margin: 0 0 6px; font-size: 8pt; text-transform: uppercase; letter-spacing: .05em; color: #64748b; font-weight: 600; }
      .cert-info-row { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 3px; }
      .cert-info-label { color: #64748b; }
      .cert-info-val   { font-weight: 600; text-align: right; }
      .cert-units-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-bottom: 6px; }
      .cert-units-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 16px; }
      .cert-units-table th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; font-weight: 600; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .03em; color: #64748b; }
      .cert-units-table td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
      .cert-units-table tr:nth-child(even) td { background: #f8fafc; }
      .cert-result-ok   { color: #16a34a; font-weight: 600; }
      .cert-result-fail { color: #dc2626; font-weight: 600; }
      .cert-notes { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 9pt; margin-bottom: 16px; min-height: 40px; }
      .cert-notes h3 { margin: 0 0 6px; font-size: 8pt; text-transform: uppercase; letter-spacing: .05em; color: #64748b; font-weight: 600; }
      .cert-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
      .cert-sign-block { border-top: 1px solid #1e293b; padding-top: 4px; font-size: 8pt; color: #64748b; }
      .cert-footer { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
      .cert-stamp-box { width: 80px; height: 60px; border: 1px dashed #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #94a3b8; }
      .cert-print-actions { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 8px; z-index: 999999; }
      @media print { .cert-print-actions { display: none !important; } }
    `;
    document.head.appendChild(s);
  }

  // ── Build certificate HTML ────────────────────────────────────────────────
  function buildCert({ certNum, customer, address, units, technician, notes, serviceDate, nextInsp }) {
    const rows = (units||[]).map(u => `
      <tr>
        <td style="font-family:monospace">${esc(u.serial||'')}</td>
        <td>${esc(u.tegund||u.type||'')}</td>
        <td>${esc(u.sterd||u.size||'')}</td>
        <td>${u.pressure ? u.pressure+' bar' : '—'}</td>
        <td>${u.weight_ok===false ? '<span class="cert-result-fail">✗</span>' : '<span class="cert-result-ok">✓</span>'}</td>
        <td class="${(u.result||u.nidurstada||'ok').toLowerCase().includes('fail') || (u.result||'').toLowerCase().includes('fail') ? 'cert-result-fail':'cert-result-ok'}">${esc(u.result||u.nidurstada||'Í lagi')}</td>
        <td>${esc(u.next_insp ? fmtDate(u.next_insp) : (nextInsp ? fmtDate(nextInsp) : ''))}</td>
      </tr>`).join('');

    return `
      <div class="cert-page">
        <div class="cert-header">
          <div class="cert-logo-area">
            <svg class="cert-logo-svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="7" fill="#C93C1D"/><text x="20" y="27" font-family="Arial" font-size="22" font-weight="700" fill="white" text-anchor="middle">S</text></svg>
            <div>
              <div class="cert-company-name">Slökkvitæki ehf</div>
              <div class="cert-company-sub">Brunakerfi · Skoðun og þjónusta</div>
            </div>
          </div>
          <div class="cert-title-area">
            <div class="cert-title">Þjónustuvottorð</div>
            <div class="cert-num">Nr. ${esc(certNum||'—')}</div>
          </div>
        </div>

        <div class="cert-info-grid">
          <div class="cert-info-block">
            <h3>Viðskiptavinur</h3>
            <div class="cert-info-row"><span class="cert-info-label">Nafn</span><span class="cert-info-val">${esc(customer||'—')}</span></div>
            ${address ? `<div class="cert-info-row"><span class="cert-info-label">Heimilisfang</span><span class="cert-info-val">${esc(address)}</span></div>` : ''}
          </div>
          <div class="cert-info-block">
            <h3>Þjónusta</h3>
            <div class="cert-info-row"><span class="cert-info-label">Þjónustudagur</span><span class="cert-info-val">${fmtDate(serviceDate||todayISO())}</span></div>
            <div class="cert-info-row"><span class="cert-info-label">Tæknimaður</span><span class="cert-info-val">${esc(technician||'—')}</span></div>
            <div class="cert-info-row"><span class="cert-info-label">Tæki skoðuð</span><span class="cert-info-val">${(units||[]).length} stk.</span></div>
          </div>
        </div>

        <div class="cert-units-title">Tæki skoðuð</div>
        <table class="cert-units-table">
          <thead><tr>
            <th>Raðnúmer</th><th>Tegund</th><th>Stærð</th><th>Þrýstingur</th><th>Þyngd</th><th>Niðurstaða</th><th>Næsta skoðun</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">Engin tæki skráð</td></tr>'}</tbody>
        </table>

        ${notes ? `
        <div class="cert-notes">
          <h3>Athugasemdir</h3>
          ${esc(notes)}
        </div>` : ''}

        <div class="cert-sign">
          <div>
            <div class="cert-sign-block">Undirskrift tæknimanns</div>
          </div>
          <div style="display:flex;justify-content:flex-end">
            <div class="cert-stamp-box">Stimpill</div>
          </div>
        </div>

        <div class="cert-footer">
          <span>Slökkvitæki ehf · Útgefið ${fmtDate(todayISO())}</span>
          <span>Vottorð nr. ${esc(certNum||'—')}</span>
        </div>
      </div>`;
  }

  // ── Show / print certificate ───────────────────────────────────────────────
  function showCert(opts) {
    let frame = document.getElementById('cert-print-frame');
    if (!frame) {
      frame = document.createElement('div');
      frame.id = 'cert-print-frame';
      document.body.appendChild(frame);
    }

    const certNum = 'V-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
    frame.innerHTML = buildCert({ ...opts, certNum });
    frame.style.display = 'block';

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'cert-print-actions';
    actions.innerHTML = `
      <button onclick="window.print()" style="padding:10px 18px;background:#C93C1D;color:#fff;border:none;border-radius:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">🖨 Prenta / Vista PDF</button>
      <button onclick="document.getElementById('cert-print-frame').style.display='none'" style="padding:10px 18px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:13px;cursor:pointer">✕ Loka</button>`;
    frame.appendChild(actions);
  }

  // ── Load units for a company and open cert ────────────────────────────────
  async function openForCompany(companyNafn, companyAddress, technicianName) {
    const SB = getSB();
    if (!SB) { if(window.Toast)Toast.show('Gagngrunnur ekki tengdur'); return; }
    const { data: units } = await SB.from('þjonustutaeki')
      .select('serial,tegund,sterd,pressure,next_insp,last_insp,notes')
      .or(`company_nafn.eq.${companyNafn},client.eq.${companyNafn}`)
      .order('serial');
    showCert({ customer: companyNafn, address: companyAddress, units: units||[], technician: technicianName, notes: '' });
  }

  // ── Open cert from a single unit array ───────────────────────────────────
  function openForUnits(units, customer, address, tech, notes) {
    showCert({ units, customer, address, technician: tech, notes });
  }

  // ── Inject cert button into company detail panels ─────────────────────────
  const obs = new MutationObserver(() => {
    // Look for company detail panels that have a name + address visible
    document.querySelectorAll('.company-detail-panel, [data-company-id], [data-co-id]').forEach(panel => {
      if (panel.querySelector('.cert-inject-btn')) return;
      const name = panel.dataset.companyNafn || panel.dataset.nafn || panel.dataset.companyId;
      if (!name) return;
      const btn = document.createElement('button');
      btn.className = 'cert-inject-btn btn btn-outline btn-sm';
      btn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-top:8px;';
      btn.innerHTML = '🖨 Þjónustuvottorð';
      btn.onclick = () => openForCompany(name, panel.dataset.address||'', '');
      const actions = panel.querySelector('.panel-actions, .detail-actions, .btn-row');
      if (actions) actions.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });

  window.ServiceCert = { show: showCert, openForCompany, openForUnits };
  console.log('[service-certificate] installed');
})();
/* === END SERVICE CERTIFICATE === */
