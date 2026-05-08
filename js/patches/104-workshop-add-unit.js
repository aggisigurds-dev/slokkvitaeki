/* === WORKSHOP ADD UNIT v1 ===
 *
 * Vandamál: Notandi skráir verkbeiðnir í gegnum Sala (POS) sem oft tengja
 * ekki sjálfvirkt tæki við verkbeiðnina. Þá birtist verkbeiðnin á
 * Verkstæði með "0 slökkvitæki" og engin tæki til að breyta eða setja
 * athugasemdir á.
 *
 * Lausn: bæta við "+ Bæta við tæki"-takka inn í Verkstæði-modal sem opnar
 * dialog til að skrá tæki sem fylgir verkbeiðninni:
 *   • Raðnúmer (handsmíðað eða skanna)
 *   • Týpa (ABC Duft / CO2 / Vatn / Slönguhjól / …)
 *   • Stærð (kg eða ltr)
 *   • Staða (Hlaðning / Skoðun / Viðgerð / …)
 *   • Athugasemd
 *
 * Vistun: bætist við í verkbeidnir.units JSONB array, og eftir vistun
 * endurræsir Workshop.renderDetail svo nýji línan birtist með
 * Edit/Athugasemd-takkunum (frá patch 103).
 */
(() => {
  if (window.__workshopAddUnitInstalled) return;
  window.__workshopAddUnitInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  function currentJob() {
    if (!window.Workshop || !Workshop.sel) return null;
    if (window.DB && DB.getJob) {
      try { return DB.getJob(Workshop.sel); } catch (_) {}
    }
    return null;
  }

  // ── Inject "+ Bæta við tæki" button into the workshop modal header ───────
  function decorateModal() {
    const modal = document.getElementById('workshop-detail-modal');
    if (!modal || modal.style.display === 'none') return;
    if (modal.querySelector('._wau-add-btn')) return;
    // Find a place to anchor the button — near the title or scroll area
    const sub = modal.querySelector('.ws-sub');
    const scroll = modal.querySelector('.ws-scroll');
    const anchor = sub || scroll || modal.firstElementChild;
    if (!anchor) return;

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary _wau-add-btn';
    btn.type = 'button';
    btn.style.cssText = 'margin:8px 14px 4px;padding:8px 14px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:5px';
    btn.innerHTML = '+ Bæta við tæki';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const job = currentJob();
      if (!job) { alert('Verkbeiðni fannst ekki'); return; }
      openAddUnitDialog(job);
    });
    // Insert AFTER the .ws-sub line if present (just below customer/job info)
    if (sub && sub.parentElement) {
      sub.parentElement.insertBefore(btn, sub.nextSibling);
    } else {
      anchor.appendChild(btn);
    }
  }

  // ── Add unit dialog ──────────────────────────────────────────────────────
  function openAddUnitDialog(job) {
    let dlg = document.getElementById('_wau-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_wau-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:16px';

    const today = new Date();
    const monthYY = String(today.getFullYear()).slice(-2) + String(today.getMonth() + 1).padStart(2, '0');
    const suggestedSerial = 'SÆ-' + today.getFullYear() + '-' + ((job.units || []).length + 1).toString().padStart(3, '0');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(520px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">+ Bæta við tæki</h3>' +
            '<div style="font-size:11px;color:#bbf7d0;margin-top:2px">' + esc(job.customer || '') + ' · ' + esc(job.num || '') + '</div>' +
          '</div>' +
          '<button id="_wau-x" type="button" style="background:transparent;border:1px solid #22c55e;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px">' +
          '<div style="margin-bottom:12px">' +
            '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Raðnúmer</label>' +
            '<div style="display:flex;gap:6px">' +
              '<input id="_wau-serial" type="text" value="' + esc(suggestedSerial) + '" placeholder="t.d. SK-2153 eða SÆ-' + today.getFullYear() + '-001" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;font-family:\'Courier New\',monospace;font-weight:700;letter-spacing:0.04em;box-sizing:border-box">' +
              '<button id="_wau-scan" type="button" title="Skanna" style="padding:9px 12px;background:#2563eb;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">📷</button>' +
            '</div>' +
            '<div style="margin-top:5px;font-size:11px;color:#64748b">Sláðu inn handsmíðað eða skannaðu QR / strikamerki á tækinu sem viðskiptavinur kom með.</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
            '<div>' +
              '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Týpa</label>' +
              '<select id="_wau-type" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;background:#fff;box-sizing:border-box">' +
                '<option value="ABC Duft">ABC Duft</option>' +
                '<option value="CO2">CO₂</option>' +
                '<option value="Vatn">Vatn / Léttvatn</option>' +
                '<option value="Froðuefni">Froðuefni</option>' +
                '<option value="Slönguhjól">Slönguhjól / Brunaslanga</option>' +
                '<option value="Reykskynjari">Reykskynjari</option>' +
                '<option value="Annað">Annað</option>' +
              '</select>' +
            '</div>' +
            '<div>' +
              '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Stærð</label>' +
              '<input id="_wau-size" type="text" placeholder="t.d. 6 kg eða 9 ltr" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box">' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:12px">' +
            '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Verkefni / Þjónusta</label>' +
            '<select id="_wau-svc" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;background:#fff;box-sizing:border-box">' +
              '<option value="Hleðsla">Hleðsla / endurhleðsla</option>' +
              '<option value="Skoðun">Skoðun</option>' +
              '<option value="Viðgerð">Viðgerð</option>' +
              '<option value="Þrýstingsprófun">Þrýstingsprófun</option>' +
              '<option value="Yfirferð">Yfirferð</option>' +
              '<option value="Annað">Annað</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Athugasemd</label>' +
            '<textarea id="_wau-note" rows="3" placeholder="t.d. Þrýstingur lítill, athuga ventilinn" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box"></textarea>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_wau-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_wau-save" type="button" style="padding:9px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_wau-x').addEventListener('click', close);
    dlg.querySelector('#_wau-cancel').addEventListener('click', close);

    setTimeout(() => dlg.querySelector('#_wau-serial').select(), 50);

    dlg.querySelector('#_wau-scan').addEventListener('click', () => {
      if (window.BarcodeMgr && window.BarcodeMgr.scan) {
        window.BarcodeMgr.scan(text => {
          if (text) {
            const inp = dlg.querySelector('#_wau-serial');
            inp.value = String(text).trim();
            inp.focus();
          }
        });
      } else {
        alert('Skannarvirkni ekki hlaðin (vantar patch 95).');
      }
    });

    dlg.querySelector('#_wau-save').addEventListener('click', async () => {
      const serial = dlg.querySelector('#_wau-serial').value.trim();
      if (!serial) { alert('Sláðu inn raðnúmer.'); return; }
      const type = dlg.querySelector('#_wau-type').value;
      const size = dlg.querySelector('#_wau-size').value.trim();
      const svc  = dlg.querySelector('#_wau-svc').value;
      const note = dlg.querySelector('#_wau-note').value.trim();

      const newLine = {
        serial,
        name: type + (size ? ' · ' + size : ''),
        type,
        size,
        service: svc,
        notes: note,
        added_at: new Date().toISOString()
      };

      const SB = getSB();
      if (!SB) { alert('Engin gagnabankatenging'); return; }

      const SaveBtn = dlg.querySelector('#_wau-save');
      SaveBtn.disabled = true; SaveBtn.textContent = 'Vistar...';

      try {
        // Read latest job state
        const r = await SB.from('verkbeidnir').select('units').eq('id', job.id).single();
        if (r.error) { throw r.error; }
        const units = Array.isArray(r.data && r.data.units) ? r.data.units.slice() : [];
        units.push(newLine);
        const u = await SB.from('verkbeidnir').update({ units }).eq('id', job.id);
        if (u.error) { throw u.error; }
        // Update local cache
        if (window.DB && window.DB.cache && Array.isArray(window.DB.cache.jobs)) {
          const idx = window.DB.cache.jobs.findIndex(j => j.id === job.id);
          if (idx >= 0) window.DB.cache.jobs[idx].units = units;
        }
        if (window.Toast && Toast.show) Toast.show('✓ Tæki bætt við verkbeiðni');
        close();
        // Re-render the workshop modal so the new unit appears with action buttons
        try {
          if (window.Workshop && Workshop.renderDetail && Workshop.sel) {
            const fresh = (window.DB && DB.getJob && DB.getJob(Workshop.sel)) || job;
            fresh.units = units;
            Workshop.renderDetail(fresh);
          }
        } catch (_) {}
      } catch (e) {
        SaveBtn.disabled = false; SaveBtn.textContent = '✓ Bæta við';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Watch the modal for re-renders ───────────────────────────────────────
  function attach() {
    const modal = document.getElementById('workshop-detail-modal');
    if (!modal) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateModal, 80);
    }).observe(modal, { childList: true, subtree: true });
  }
  attach();
  setTimeout(decorateModal, 1200);
  setInterval(() => {
    const modal = document.getElementById('workshop-detail-modal');
    if (modal && modal.style.display !== 'none' && !modal.querySelector('._wau-add-btn')) {
      decorateModal();
    }
  }, 1500);

  console.log('[workshop-add-unit] installed — + Bæta við tæki á Verkstæði-modali');
})();
/* === END WORKSHOP ADD UNIT v1 === */
