/* === BULK INSPECTION REMINDERS v1 === */
/* Sends inspection reminder emails or opens SMS app for all customers
 * whose equipment is due within a configurable date range.
 *
 * Accessible from:
 *   - Þjónustuáætlun (inspection forecast) view — "📧 Senda áminningar" button
 *   - Þjónustutæki view toolbar — same button
 *
 * Flow:
 *   1. Load all þjonustutaeki rows where next_insp falls in the range
 *   2. Group by company / customer
 *   3. Show a checklist modal — user can deselect individual customers
 *   4. "Senda" → opens email or SMS for each selected customer
 *   5. Marks sent date so duplicates are visible — 21.09.2026 (úttekt): on the
 *      server (AppSettings key `bulk_aminningar_log`); localStorage is only a cache
 *
 * Uses window.EmailInvoice.sendMailto if available, else builds mailto: links.
 */
(() => {
  if (window.__bulkRemindersInstalled) return;
  window.__bulkRemindersInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '. ' + ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'][d.getMonth()] + ' ' + d.getFullYear();
  }
  function addDays(n) {
    const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
  }
  function todayISO() {
    const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  const LOG_KEY = 'bulk_reminder_log'; // { "CompanyName": isoTimestamp }
  // 21.09.2026 (úttekt): sagan bjó AÐEINS í localStorage, svo önnur vél sá ekki
  // að áminning fór og sendi aftur. Nú er þjónninn sannleikurinn — AppSettings-
  // lykill `bulk_aminningar_log` { [fyrirtækjanafn]: iso } (sér-lykill: hér er
  // lykillinn fyrirtæki, í papp 33 verk-id). localStorage er skyndiminni/varaleið.
  // Smiðjan býr í papp 33 (hleðst á undan); vanti hana er fallið á gömlu leiðina.
  const THJONS_LYKILL = 'bulk_aminningar_log';
  const ENDURSENDING_DAGAR = 30;   // eldri sending annarrar vélar telst fyrri umferð
  let _saga = null;
  function saga() {
    if (!_saga && window.__AminningaSaga && typeof window.__AminningaSaga.buaTil === 'function') {
      _saga = window.__AminningaSaga.buaTil(LOG_KEY, THJONS_LYKILL, 'bulk-reminders');
    }
    return _saga;
  }
  function getLocalLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY)||'{}'); } catch { return {}; } }
  // Sameining þjóns og localStorage (nýrri tími vinnur per fyrirtæki).
  function getLog() { const s = saga(); return s ? s.lesa() : getLocalLog(); }
  function markSent(companies) {
    const s = saga();
    if (s) { try { s.skra(companies); } catch (e) { console.warn('[bulk-reminders] markSent:', e); } return; }
    console.warn('[bulk-reminders] __AminningaSaga vantar — sagan fór AÐEINS í localStorage');
    try { if (typeof window.logProblem === 'function') window.logProblem('sms_log_save_failed', THJONS_LYKILL + ': smiðju vantar (papp 33)'); } catch (_) {}
    const log = getLocalLog();
    const now = new Date().toISOString();
    companies.forEach(c => { log[c] = now; });
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }
  function dagsTimi(iso) {
    if (window.__AminningaSaga && window.__AminningaSaga.dagsTimi) return window.__AminningaSaga.dagsTimi(iso);
    return new Date(iso).toLocaleDateString('is-IS');
  }
  // Rétt fyrir sendingu: fersk saga af þjóni; þeim sem ÖNNUR vél sendi á síðustu
  // ENDURSENDING_DAGAR daga er sleppt. Náist ekki í þjóninn (null) er engum sleppt —
  // sagan má aldrei stöðva sendinguna. Tímamörk undir 5 s: vafrinn leyfir
  // window.open aðeins stutta stund eftir smellinn.
  async function skiptaEftirSogu(sel) {
    const ut = { senda: sel, sleppt: [] };
    const s = saga();
    if (!s) return ut;
    let thjonn = null;
    try { thjonn = await s.saekjaFerskt(4000); } catch (_) {}
    if (!thjonn) { console.warn('[bulk-reminders] náði ekki í ferska sögu — sendi án tvítékks'); return ut; }
    const mork = Date.now() - ENDURSENDING_DAGAR * 86400000;
    ut.senda = [];
    sel.forEach(g => {
      const annar = s.annarVel(g.name, thjonn);
      if (annar && Date.parse(annar) >= mork) ut.sleppt.push({ name: g.name, hvenaer: annar });
      else ut.senda.push(g);
    });
    return ut;
  }
  function segjaFraSlepptum(sleppt) {
    if (!sleppt.length) return '';
    const nofn = sleppt.slice(0, 3).map(x => x.name + ' (' + dagsTimi(x.hvenaer) + ')').join(', ');
    return ' · ' + sleppt.length + ' sleppt — áminning var þegar send af annarri vél: ' + nofn + (sleppt.length > 3 ? ' o.fl.' : '');
  }
  setTimeout(() => { const s = saga(); if (s) s.flytjaUpp(0); }, 7000);

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('bulk-reminder-style')) {
    const s = document.createElement('style');
    s.id = 'bulk-reminder-style';
    s.textContent = `
      .brem-modal-wrap {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.45); padding: 16px;
      }
      .brem-modal {
        background: #fff; border-radius: 14px; padding: 24px;
        max-width: 560px; width: 100%; max-height: 85vh;
        display: flex; flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,.25); font-family: inherit;
      }
      .brem-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      .brem-title { font-size: 15px; font-weight: 700; color: #1e293b; }
      .brem-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b; }
      .brem-controls { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
      .brem-list { flex: 1; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
      .brem-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      .brem-row:last-child { border-bottom: none; }
      .brem-row input[type=checkbox] { margin-top: 2px; width: 15px; height: 15px; flex-shrink: 0; }
      .brem-row-info { flex: 1; }
      .brem-company { font-weight: 600; color: #1e293b; }
      .brem-units { font-size: 11px; color: #64748b; margin-top: 2px; }
      .brem-contact { font-size: 11px; color: #3b82f6; }
      .brem-sent-chip { font-size: 10px; background: #dcfce7; color: #16a34a; border-radius: 4px; padding: 1px 6px; font-weight: 600; }
      .brem-ft { display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end; flex-wrap: wrap; }
    `;
    document.head.appendChild(s);
  }

  // ── Load due units ────────────────────────────────────────────────────────
  async function loadDue(fromISO, toISO) {
    const SB = getSB();
    if (!SB) return [];
    // uttaeki schema: id, serial, type, size, client, location, last_insp, next_insp, status, pressure, phone, notes.
    // No netfang on uttaeki itself — fetch from fyrirtaeki via client name lookup later.
    const { data } = await SB.from('uttaeki')
      .select('id,serial,type,size,client,next_insp,phone')
      .gte('next_insp', fromISO)
      .lte('next_insp', toISO)
      .order('next_insp');
    return data || [];
  }

  // ── Group by company ──────────────────────────────────────────────────────
  async function groupByCompany(units) {
    const map = {};
    units.forEach(u => {
      const key = u.client || 'Óþekkt';
      if (!map[key]) map[key] = { name: key, units: [], email: '', phone: u.phone||'' };
      map[key].units.push(u);
      if (!map[key].phone && u.phone) map[key].phone = u.phone;
    });
    // Backfill emails from fyrirtaeki by company name
    const SB = getSB();
    if (SB) {
      const names = Object.keys(map);
      if (names.length) {
        try {
          const { data } = await SB.from('fyrirtaeki').select('nafn,netfang,simi').in('nafn', names);
          (data||[]).forEach(c => {
            if (map[c.nafn]) {
              if (!map[c.nafn].email && c.netfang) map[c.nafn].email = c.netfang;
              if (!map[c.nafn].phone && c.simi) map[c.nafn].phone = c.simi;
            }
          });
        } catch (_) {}
      }
    }
    return Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
  }

  // ── Build email body ──────────────────────────────────────────────────────
  function buildEmailBody(group) {
    const unitList = group.units.map(u =>
      `  • ${u.serial||'?'} — ${u.type||u.tegund||''} — skoðun: ${fmtDate(u.next_insp)}`
    ).join('\n');
    return `Góðan dag,\n\nSlökkvitæki ehf hér með áminningu um að eftirfarandi slökkvitæki eru á gjalddaga skoðunar:\n\n${unitList}\n\nVinsamlegast hafðu samband við okkur til að bóka tíma.\n\nSlökkvitæki ehf\n${localStorage.getItem('sms_company_phone')||''}`;
  }

  function buildEmailSubject(group) {
    return `Áminning — skoðun slökkvitækja hjá ${group.name}`;
  }

  // ── Open / close modal ────────────────────────────────────────────────────
  function closeModal() {
    const w = document.getElementById('brem-modal-wrap');
    if (w) w.remove();
  }

  async function openModal(presetDays) {
    const days = presetDays || 30;
    const fromISO = todayISO();
    const toISO   = addDays(days);

    // Build and show modal immediately with a loading state
    let wrap = document.getElementById('brem-modal-wrap');
    if (wrap) wrap.remove();
    wrap = document.createElement('div');
    wrap.id = 'brem-modal-wrap';
    wrap.className = 'brem-modal-wrap';
    wrap.onclick = e => { if (e.target === wrap) closeModal(); };
    wrap.innerHTML = `
      <div class="brem-modal">
        <div class="brem-hd">
          <div class="brem-title">📧 Senda skoðunaráminningar</div>
          <button class="brem-close" onclick="BulkReminders.close()">✕</button>
        </div>
        <div id="brem-loading" style="text-align:center;padding:32px;color:var(--ink3)">Hleður tæki…</div>
      </div>`;
    document.body.appendChild(wrap);

    const units = await loadDue(fromISO, toISO);
    const groups = await groupByCompany(units);
    // 21.09.2026 (úttekt): fersk saga af þjóni svo „Sent"-merkið sýni líka
    // sendingar annarra véla. Bregðist sóknin gildir skyndiminnið.
    try { const s = saga(); if (s) await s.saekjaFerskt(4000); } catch (_) {}
    const log = getLog();

    if (!groups.length) {
      document.getElementById('brem-loading').innerHTML = '<div style="font-size:13px;color:var(--ink3)">Engin tæki á gjalddaga í þessum tíma.</div>';
      return;
    }

    const modal = wrap.querySelector('.brem-modal');
    const rows = groups.map((g,i) => {
      const sent = log[g.name];
      const unitTxt = g.units.map(u=>`${u.serial||'?'} (${fmtDate(u.next_insp)})`).join(', ');
      const contactTxt = [g.email, g.phone].filter(Boolean).join(' · ');
      return `
        <div class="brem-row">
          <input type="checkbox" id="brem-chk-${i}" checked>
          <div class="brem-row-info">
            <div class="brem-company">${esc(g.name)}
              ${sent ? `<span class="brem-sent-chip">Sent ${new Date(sent).toLocaleDateString('is-IS')}</span>` : ''}
            </div>
            <div class="brem-units">${esc(unitTxt)}</div>
            ${contactTxt ? `<div class="brem-contact">${esc(contactTxt)}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    // Range selector
    const rangeOpts = [
      {v:14,l:'Næstu 2 vikur'},{v:30,l:'Næsti mánuður'},{v:60,l:'Næstu 2 mánuðir'},{v:90,l:'Næstu 3 mánuðir'}
    ].map(o=>`<option value="${o.v}" ${days===o.v?'selected':''}>${o.l}</option>`).join('');

    modal.innerHTML = `
      <div class="brem-hd">
        <div class="brem-title">📧 Senda skoðunaráminningar</div>
        <button class="brem-close" onclick="BulkReminders.close()">✕</button>
      </div>
      <div class="brem-controls">
        <select id="brem-range" onchange="BulkReminders.open(parseInt(this.value))"
          style="padding:7px 10px;border:1px solid var(--brd);border-radius:8px;font:inherit;font-size:13px;background:var(--bg1);color:var(--ink1)">
          ${rangeOpts}
        </select>
        <span style="font-size:13px;color:var(--ink3)">${groups.length} fyrirtæki · ${units.length} tæki</span>
        <label style="font-size:12px;color:var(--ink3);margin-left:auto;cursor:pointer">
          <input type="checkbox" id="brem-all" checked onchange="BulkReminders._toggleAll(this.checked)"> Velja öll
        </label>
      </div>
      <div class="brem-list">${rows}</div>
      <div class="brem-ft">
        <button class="btn btn-outline" onclick="BulkReminders.close()">Hætta við</button>
        <button class="btn btn-outline" onclick="BulkReminders._sendSms(${JSON.stringify(groups).replace(/"/g,'&quot;')})">
          📱 Senda SMS
        </button>
        <button class="btn btn-primary" onclick="BulkReminders._sendEmail(${JSON.stringify(groups).replace(/"/g,'&quot;')})">
          📧 Senda tölvupóst
        </button>
      </div>`;
  }

  function _toggleAll(checked) {
    document.querySelectorAll('#brem-modal-wrap .brem-row input[type=checkbox]').forEach(cb => cb.checked = checked);
  }

  function _getSelected(groups) {
    return groups.filter((_,i) => {
      const cb = document.getElementById(`brem-chk-${i}`);
      return cb && cb.checked;
    });
  }

  // 21.09.2026 (úttekt): bæði sendiföllin tvítékka söguna á þjóni rétt fyrir
  // sendingu (skiptaEftirSogu). Sendingin sjálf (mailto:/sms: + window.open) er óbreytt.
  let _iGangi = false;   // vörn gegn tvísmelli á meðan sagan er sótt
  async function _sendEmail(groups) {
    const valid = _getSelected(groups);
    if (!valid.length) { if(window.Toast)Toast.show('Veldu að minnsta kosti eitt fyrirtæki'); return; }
    if (_iGangi) return;
    _iGangi = true;
    let skipt;
    try { skipt = await skiptaEftirSogu(valid); } finally { _iGangi = false; }
    const sel = skipt.senda;
    if (!sel.length) {
      if(window.Toast) Toast.show('Ekkert sent' + segjaFraSlepptum(skipt.sleppt));
      closeModal();
      return;
    }
    sel.forEach(g => {
      const to = g.email || '';
      const subject = encodeURIComponent(buildEmailSubject(g));
      const body = encodeURIComponent(buildEmailBody(g));
      const href = to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
      window.open(href, '_blank');
    });
    markSent(sel.map(g=>g.name));
    if(window.Toast) Toast.show(`✓ ${sel.length} tölvupóst opnaðir` + segjaFraSlepptum(skipt.sleppt));
    closeModal();
  }

  async function _sendSms(groups) {
    const valid = _getSelected(groups);
    if (!valid.length) { if(window.Toast)Toast.show('Veldu að minnsta kosti eitt fyrirtæki'); return; }
    if (_iGangi) return;
    _iGangi = true;
    let skipt;
    try { skipt = await skiptaEftirSogu(valid); } finally { _iGangi = false; }
    // Sagan er nú sameiginleg öllum vélum: fyrirtæki án símanúmers fær ekkert SMS
    // og má því ekki merkjast „sent" (áður merkt með — þá myndu hinar vélarnar sleppa því).
    const sel = skipt.senda.filter(g => g.phone);
    const simalaus = skipt.senda.length - sel.length;
    if (!sel.length) {
      if(window.Toast) Toast.show('Ekkert sent' + (simalaus ? ` · ${simalaus} án símanúmers` : '') + segjaFraSlepptum(skipt.sleppt));
      closeModal();
      return;
    }
    sel.forEach(g => {
      const msg = `Slökkvitæki ehf: ${g.units.length} tæki hjá ${g.name} eru á gjalddaga skoðunar (${g.units.map(u=>fmtDate(u.next_insp)).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}). Hafðu samband til að bóka tíma. ${localStorage.getItem('sms_company_phone')||''}`;
      window.open('sms:' + g.phone + '?body=' + encodeURIComponent(msg), '_blank');
    });
    markSent(sel.map(g=>g.name));
    if(window.Toast) Toast.show(`✓ ${sel.length} SMS opnuð` + (simalaus ? ` · ${simalaus} án símanúmers` : '') + segjaFraSlepptum(skipt.sleppt));
    closeModal();
  }

  // ── Inject button into toolbar areas ─────────────────────────────────────
  function injectButtons() {
    // Into Þjónustuáætlun / inspection forecast toolbar if it exists
    const ifToolbar = document.querySelector('#view-inspforecast .if-toolbar, #view-inspforecast .toolbar');
    if (ifToolbar && !ifToolbar.querySelector('.brem-trigger')) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline btn-sm brem-trigger';
      btn.innerHTML = '📧 Senda áminningar';
      btn.onclick = () => BulkReminders.open(30);
      ifToolbar.appendChild(btn);
    }
    // Into Þjónustutæki field toolbar
    const fieldToolbar = document.querySelector('.field-toolbar');
    if (fieldToolbar && !fieldToolbar.querySelector('.brem-trigger')) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline btn-sm brem-trigger';
      btn.innerHTML = '📧 Áminningar';
      btn.onclick = () => BulkReminders.open(30);
      fieldToolbar.appendChild(btn);
    }
  }

  const obs = new MutationObserver(injectButtons);
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectButtons, 1500);

  window.BulkReminders = {
    open: openModal,
    close: closeModal,
    _toggleAll,
    _sendEmail,
    _sendSms
  };
  console.log('[bulk-reminders] installed');
})();
/* === END BULK REMINDERS === */
