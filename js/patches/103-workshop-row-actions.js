/* === WORKSHOP ROW ACTIONS v1 ===
 *
 * Bætir við skýrum hnöppum á hverri tækjarúðu í Verkstæði (og Afgreiðslu):
 *   ✏️ Breyta      — opnar UnitDetail modal (allar upplýsingar, staða, saga…)
 *   📝 Athugasemd  — opnar lítinn glugga til að bæta við athugasemd hratt
 *                    (vistast í uttaeki.notes, viðheldur fyrri athugasemdum
 *                    með tímastimpli)
 *
 * Hnapparnir eru í síðasta dálki (eins og prenta-takkinn) og standast
 * við re-render á tækjatöflu.
 */
(() => {
  if (window.__workshopRowActionsInstalled) return;
  window.__workshopRowActionsInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  // ── Status label/colour extension (moved here from retired patch 176) ─────
  // Ensures unit statuses render with proper Icelandic labels + colours via
  // U.sl / U.sc (used by U.badge) instead of raw status strings.
  const STATUS_LABEL = {
    active:   'Virkt',
    scrap:    'Ónýtt',
    broken:   'Brotið',
    urelt:    'Úrelt',
    geymsla:  'Í geymslu',
    repair:   'Þarfnast viðgerðar',
    fail:     'Bilað',
  };
  const STATUS_CLASS = {
    active:   'st-ok',
    scrap:    'st-ov',
    broken:   'st-ov',
    urelt:    'st-ov',
    geymsla:  'st-col',
    repair:   'st-due',
    fail:     'st-ov',
  };
  if (window.U && !U.__statusLabelsExtended) {
    U.__statusLabelsExtended = true;
    const origSl = U.sl;
    const origSc = U.sc;
    U.sl = function(s) {
      if (STATUS_LABEL[s]) return STATUS_LABEL[s];
      try { return origSl.call(U, s); } catch (_) { return s; }
    };
    U.sc = function(s) {
      if (STATUS_CLASS[s]) return STATUS_CLASS[s];
      try { return origSc.call(U, s); } catch (_) { return ''; }
    };
  }

  function unitFromRow(row) {
    // Try classic table cell .ser, then .ws-ser (workshop modal redesign)
    let serialEl = row.querySelector('.ser') || row.querySelector('.ws-ser');
    let serial = serialEl ? serialEl.textContent.trim() : '';
    if (!serial) {
      // Last resort: first cell text
      const firstCell = row.querySelector('td');
      if (firstCell) serial = firstCell.textContent.trim();
    }
    if (!serial) return null;
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    return units.find(u => u.serial === serial) || null;
  }

  // ── Quick comment dialog ──────────────────────────────────────────────────
  function openCommentDialog(unit) {
    let dlg = document.getElementById('_wra-comment-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_wra-comment-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const existingNotes = unit.notes || '';
    const today = new Date();
    const dateStamp = String(today.getDate()).padStart(2,'0') + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
    const lastTech = localStorage.getItem('_vr_last_tech') || '';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(540px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#b45309,#92400e);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">📝 Athugasemd</h3>' +
            '<div style="font-size:11px;color:#fef3c7;margin-top:2px">' + esc(unit.serial || '—') + ' · ' + esc((unit.type || '') + (unit.size ? ' ' + unit.size : '')) + '</div>' +
          '</div>' +
          '<button id="_wrac-x" type="button" style="background:transparent;border:1px solid #c2410c;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px">' +
          (existingNotes ?
            '<div style="margin-bottom:12px">' +
              '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Fyrri athugasemdir</label>' +
              '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px;font-size:13px;line-height:1.5;max-height:140px;overflow:auto;white-space:pre-wrap">' + esc(existingNotes) + '</div>' +
            '</div>' : ''
          ) +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Ný athugasemd</label>' +
          '<textarea id="_wrac-new" rows="4" placeholder="Skrifaðu athugasemd hér… (t.d. „Þrýstingur lítill, athuga ventilinn")" autofocus style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;box-sizing:border-box"></textarea>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;cursor:pointer">' +
              '<input id="_wrac-stamp" type="checkbox" checked style="width:16px;height:16px;cursor:pointer">' +
              'Bæta við dagsetningu og nafni (' + esc(dateStamp + (lastTech ? ' · ' + lastTech : '')) + ')' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_wrac-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_wrac-replace" type="button" style="padding:9px 14px;background:#fff;border:1px solid #c2410c;color:#c2410c;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600" title="Skrifa yfir fyrri athugasemdir">Skrifa yfir</button>' +
          '<button id="_wrac-add" type="button" style="padding:9px 18px;background:#b45309;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_wrac-x').addEventListener('click', close);
    dlg.querySelector('#_wrac-cancel').addEventListener('click', close);

    const ta = dlg.querySelector('#_wrac-new');
    setTimeout(() => ta.focus(), 50);

    function buildNewText(replace) {
      const fresh = ta.value.trim();
      if (!fresh) return null;
      const stamp = dlg.querySelector('#_wrac-stamp').checked;
      const tag = stamp ? '[' + dateStamp + (lastTech ? ' · ' + lastTech : '') + '] ' : '';
      const newEntry = tag + fresh;
      if (replace || !existingNotes) return newEntry;
      return existingNotes + '\n\n' + newEntry;
    }

    async function save(replace) {
      const final = buildNewText(replace);
      if (final == null) { alert('Skrifaðu athugasemd áður en þú vistar.'); return; }
      const SB = getSB();
      if (!SB) { alert('Engin gagnabankatenging'); return; }
      const r = await SB.from('uttaeki').update({ notes: final }).eq('id', unit.id);
      if (r.error) { alert('Villa: ' + r.error.message); return; }
      // Update cache
      if (window.DB && window.DB.cache && Array.isArray(window.DB.cache.units)) {
        const idx = window.DB.cache.units.findIndex(u => u.id === unit.id);
        if (idx >= 0) window.DB.cache.units[idx].notes = final;
      }
      unit.notes = final;
      if (window.Toast && Toast.show) Toast.show('✓ Athugasemd vistuð');
      close();
    }

    dlg.querySelector('#_wrac-add').addEventListener('click', () => save(false));
    dlg.querySelector('#_wrac-replace').addEventListener('click', async () => {
      // 2026-05-10 (B5+): Confirm.show í stað native confirm
      if (existingNotes && !(await Confirm.show('Skrifa yfir fyrri athugasemdir? Þetta er ekki afturkræft.', {danger:true, okText:'Skrifa yfir'}))) return;
      save(true);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(false); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  // ── Toggle ónýtt status ───────────────────────────────────────────────────
  // 2026-05-29: read the CURRENT status from the DB before deciding direction
  // so reverting scrap→active works on the first click even if the cached
  // unit.status is stale (was the root cause of the brittle 176 workaround).
  async function toggleScrap(unit, btn) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    btn.disabled = true;
    btn.textContent = '...';
    try {
      // Truth from DB — not the (possibly stale) cached unit.
      let currentStatus = unit.status;
      try {
        const cur = await SB.from('uttaeki').select('status').eq('id', unit.id).single();
        if (!cur.error && cur.data && cur.data.status != null) currentStatus = cur.data.status;
      } catch (_) { /* fall back to cached status */ }
      const isScrapNow = currentStatus === 'scrap';
      const newStatus = isScrapNow ? 'active' : 'scrap';
      if (!isScrapNow) {
        // 2026-05-10 (B5+): Confirm.show í stað native confirm
        if (!(await Confirm.show('Merkja tæki ' + (unit.serial || unit.id) + ' sem ÓNÝTT?\n\nÞetta merkir tækið sem brotið/ónýtt — það mun birtast með rauðum status í kerfinu.', {danger:true, okText:'Merkja ónýtt'}))) {
          stylizeScrapBtn(btn, currentStatus);
          return;
        }
      }
      const r = await SB.from('uttaeki').update({ status: newStatus }).eq('id', unit.id);
      if (r.error) throw r.error;
      unit.status = newStatus;
      if (window.DB && window.DB.cache && Array.isArray(window.DB.cache.units)) {
        const idx = window.DB.cache.units.findIndex(u => u.id === unit.id);
        if (idx >= 0) window.DB.cache.units[idx].status = newStatus;
      }
      // Update button + the row's Staða cell immediately.
      stylizeScrapBtn(btn, newStatus);
      repaintStatusCell(btn, newStatus);
      if (window.Toast && Toast.show) Toast.show(newStatus === 'scrap' ? '🚫 Tæki merkt ónýtt' : '✓ Tæki merkt aftur í lagi');
    } catch (e) {
      alert('Villa: ' + (e.message || e));
      stylizeScrapBtn(btn, unit.status);
    } finally {
      btn.disabled = false;
    }
  }
  // Repaint the row's Staða <td> (and row tint) so the change is visible
  // immediately. Replaces the old 176 timed-repaint hack.
  function repaintStatusCell(btn, status) {
    const row = btn.closest && btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    cells.forEach(td => {
      const span = td.querySelector('span.st');
      if (span && window.U && U.badge) td.innerHTML = U.badge(status);
    });
    row.style.background = status === 'scrap' ? '#fef2f2' : '';
  }
  function stylizeScrapBtn(btn, status) {
    if (status === 'scrap') {
      btn.style.background = '#dc2626';
      btn.style.borderColor = '#991b1b';
      btn.style.color = '#fff';
      btn.innerHTML = '🚫 Ónýtt ✓';
      btn.title = 'Tækið er merkt ónýtt — smelltu til að taka af';
    } else {
      btn.style.background = '#fff';
      btn.style.borderColor = '#fecaca';
      btn.style.color = '#dc2626';
      btn.innerHTML = '🚫 Ónýtt';
      btn.title = 'Merkja sem ónýtt';
    }
  }

  // Build a small button group (Breyta + Athugasemd + Ónýtt) and append to target.
  function buildButtons(unit, refreshUnit) {
    const wrap = document.createElement('span');
    wrap.className = '_wra-buttons';
    wrap.style.cssText = 'display:inline-flex;gap:4px;align-items:center;margin-left:4px;flex-wrap:wrap';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm _wra-edit';
    editBtn.type = 'button';
    editBtn.title = 'Breyta tæki — opna fullt spjald';
    editBtn.style.cssText = 'padding:5px 10px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-weight:600;border-radius:6px;font-size:12px;cursor:pointer';
    editBtn.innerHTML = '✏️ Breyta';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (window.UnitDetail && window.UnitDetail.open) {
        window.UnitDetail.open(unit.id, 'uttaeki');
      } else if (typeof window._slokk_editUnit === 'function') {
        window._slokk_editUnit(unit.id);
      }
    });
    wrap.appendChild(editBtn);

    const noteBtn = document.createElement('button');
    noteBtn.className = 'btn btn-ghost btn-sm _wra-note';
    noteBtn.type = 'button';
    noteBtn.title = 'Bæta við athugasemd';
    noteBtn.style.cssText = 'padding:5px 10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-weight:600;border-radius:6px;font-size:12px;position:relative;cursor:pointer';
    const hasNotes = !!(unit.notes && unit.notes.trim());
    noteBtn.innerHTML = '📝 Athugasemd' + (hasNotes ? '<span style="position:absolute;top:-3px;right:-3px;width:8px;height:8px;background:#dc2626;border-radius:50%;border:1.5px solid #fff"></span>' : '');
    noteBtn.addEventListener('click', e => {
      e.stopPropagation();
      const fresh = (refreshUnit && refreshUnit()) || unit;
      openCommentDialog(fresh);
    });
    wrap.appendChild(noteBtn);

    // Ónýtt toggle
    const scrapBtn = document.createElement('button');
    scrapBtn.className = 'btn btn-ghost btn-sm _wra-scrap';
    scrapBtn.type = 'button';
    scrapBtn.style.cssText = 'padding:5px 10px;border:1px solid #fecaca;font-weight:600;border-radius:6px;font-size:12px;cursor:pointer';
    stylizeScrapBtn(scrapBtn, unit.status);
    scrapBtn.addEventListener('click', e => {
      e.stopPropagation();
      const fresh = (refreshUnit && refreshUnit()) || unit;
      toggleScrap(fresh, scrapBtn);
    });
    wrap.appendChild(scrapBtn);

    return wrap;
  }

  // ── Decorate row with Breyta + Athugasemd buttons (HTML <table> path) ─────
  function decorateTableRow(row) {
    if (row.dataset._wraDone === '1') return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return;
    const unit = unitFromRow(row);
    if (!unit) return;
    row.dataset._wraDone = '1';
    const actionCell = cells[cells.length - 1];
    actionCell.appendChild(buildButtons(unit, () => unitFromRow(row)));
  }

  // ── Decorate Workshop redesign row (.ws-row div structure) ───────────────
  // Workshop rows may NOT have a matching uttaeki record (they're job-line
  // items the customer dropped off). We still inject buttons; if no uttaeki
  // record is found, the buttons fall back to "ad-hoc" mode that saves
  // notes to the job context.
  function decorateWsRow(row) {
    if (row.dataset._wraDone === '1') return;
    row.dataset._wraDone = '1';
    const target = row.querySelector('.ws-acts') || row;
    const serialEl = row.querySelector('.ws-ser');
    const serial = serialEl ? serialEl.textContent.trim() : '';
    const nameEl = row.querySelector('.ws-name');
    const name = nameEl ? nameEl.textContent.trim() : '';

    const unit = unitFromRow(row);
    if (unit) {
      // Real uttaeki — full functionality
      target.appendChild(buildButtons(unit, () => unitFromRow(row)));
      return;
    }

    // No matching uttaeki record — inject buttons that operate on the
    // workshop job line directly (saved to localStorage keyed by serial).
    if (!serial) return;

    const wrap = document.createElement('span');
    wrap.className = '_wra-buttons';
    wrap.style.cssText = 'display:inline-flex;gap:4px;align-items:center;margin-left:4px;flex-wrap:wrap';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm _wra-edit';
    editBtn.type = 'button';
    editBtn.title = 'Skrá tækið í kerfið með fullt spjald';
    editBtn.style.cssText = 'padding:5px 10px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-weight:600;border-radius:6px;font-size:12px;cursor:pointer';
    editBtn.innerHTML = '✏️ Breyta';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      // Best-effort: open a stub editor for unregistered job-line tæki
      openLineEditor({ serial, name });
    });
    wrap.appendChild(editBtn);

    const noteBtn = document.createElement('button');
    noteBtn.className = 'btn btn-ghost btn-sm _wra-note';
    noteBtn.type = 'button';
    noteBtn.title = 'Bæta við athugasemd (vistast staðbundið á þessu tæki)';
    noteBtn.style.cssText = 'padding:5px 10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-weight:600;border-radius:6px;font-size:12px;position:relative;cursor:pointer';
    const lsKey = '_wra_line_note_' + serial;
    const existingLocal = (function(){ try { return localStorage.getItem(lsKey) || ''; } catch(_){ return ''; } })();
    noteBtn.innerHTML = '📝 Athugasemd' + (existingLocal ? '<span style="position:absolute;top:-3px;right:-3px;width:8px;height:8px;background:#dc2626;border-radius:50%;border:1.5px solid #fff"></span>' : '');
    noteBtn.addEventListener('click', e => {
      e.stopPropagation();
      openLineCommentDialog(serial, name);
    });
    wrap.appendChild(noteBtn);

    // 2026-05-12: Add 🚫 Ónýtt button on workshop rows (ws-row) too. Patch
    // 120 only targets `counter-main` table rows but the workshop redesign
    // modal uses div-based ws-row layout so 120's button never appeared
    // here. We toggle the verklidur status directly (the workshop rows
    // have a matching verklidur row even when no uttaeki exists).
    const scrapBtn = document.createElement('button');
    scrapBtn.className = 'btn btn-ghost btn-sm _wra-scrap-line';
    scrapBtn.type = 'button';
    scrapBtn.style.cssText = 'padding:5px 10px;background:#fff;border:1px solid #fecaca;color:#dc2626;font-weight:600;border-radius:6px;font-size:12px;cursor:pointer';
    scrapBtn.innerHTML = '🚫 Ónýtt';
    scrapBtn.title = 'Merkja sem ónýtt (verklidur.status=broken)';
    scrapBtn.addEventListener('click', async e => {
      e.stopPropagation();
      const SB = getSB();
      if (!SB) { alert('Engin gagnabankatenging'); return; }
      // Find the verklidur row by serial across all jobs
      let liveUnit = null;
      if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
        for (const job of DB.cache.jobs) {
          if (!Array.isArray(job.units)) continue;
          const u = job.units.find(x => x.serial === serial);
          if (u) { liveUnit = u; break; }
        }
      }
      if (!liveUnit) { alert('Tæki ekki fundið í kerfi'); return; }
      const isBroken = liveUnit.status === 'broken';
      const newStatus = isBroken ? 'received' : 'broken';
      if (!isBroken && !confirm('Merkja tæki ' + serial + ' sem ÓNÝTT?\n\nAfgreiðslufólk fær viðvörun við sókn.')) return;
      scrapBtn.disabled = true;
      scrapBtn.textContent = '…';
      try {
        const r = await SB.from('verklidur').update({ status: newStatus }).eq('id', liveUnit.id);
        if (r.error) throw r.error;
        liveUnit.status = newStatus;
        // Visual toggle
        if (newStatus === 'broken') {
          scrapBtn.style.background = '#dc2626';
          scrapBtn.style.borderColor = '#991b1b';
          scrapBtn.style.color = '#fff';
          scrapBtn.innerHTML = '🚫 Ónýtt ✓';
          row.style.background = '#fef2f2';
        } else {
          scrapBtn.style.background = '#fff';
          scrapBtn.style.borderColor = '#fecaca';
          scrapBtn.style.color = '#dc2626';
          scrapBtn.innerHTML = '🚫 Ónýtt';
          row.style.background = '';
        }
        if (window.Toast && Toast.show) {
          Toast.show(newStatus === 'broken' ? '🚫 Tæki merkt ónýtt' : '✓ Tæki aftur í lagi');
        }
      } catch (err) {
        alert('Villa: ' + (err.message || err));
      } finally {
        scrapBtn.disabled = false;
      }
    });
    // Apply initial visual state if already broken
    try {
      const liveUnit = (DB.cache.jobs || []).flatMap(j => j.units || []).find(u => u.serial === serial);
      if (liveUnit && liveUnit.status === 'broken') {
        scrapBtn.style.background = '#dc2626';
        scrapBtn.style.borderColor = '#991b1b';
        scrapBtn.style.color = '#fff';
        scrapBtn.innerHTML = '🚫 Ónýtt ✓';
        row.style.background = '#fef2f2';
      }
    } catch(_) {}
    wrap.appendChild(scrapBtn);

    target.appendChild(wrap);
  }

  // ── Stub editor for workshop job-line tæki (not in uttaeki) ──────────────
  function openLineEditor(line) {
    let dlg = document.getElementById('_wra-line-edit');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_wra-line-edit';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(500px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:16px;font-weight:700">✏️ ' + esc(line.serial) + '</h3>' +
          '<button id="_wral-x" type="button" style="background:transparent;border:1px solid #38bdf8;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px">' +
          '<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#92400e;line-height:1.5">' +
            '<strong>Verkbeiðnis-tæki:</strong> ' + esc(line.serial) + (line.name ? ' · ' + esc(line.name) : '') + '<br>' +
            'Þetta tæki er hluti af verkbeiðninni og er ekki sérstök færsla í <strong>uttaeki</strong>-töflu. ' +
            'Athugasemdir vistast staðbundið á þessu tæki (localStorage).' +
          '</div>' +
          '<p style="font-size:13px;color:#475569;line-height:1.5;margin:0">Til að skrá tækið með fullum upplýsingum (saga, mynd, eigandi, …) þarf að bæta því við sem nýjan <strong>þjónustutæki</strong> á viðeigandi fyrirtæki. Þú getur smellt á 📝 Athugasemd til að bæta við punkti — vistast strax.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_wral-close" type="button" style="padding:9px 18px;background:#0369a1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Loka</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_wral-x').addEventListener('click', close);
    dlg.querySelector('#_wral-close').addEventListener('click', close);
  }

  // ── Comment dialog for workshop job-line tæki (saves to localStorage) ────
  function openLineCommentDialog(serial, name) {
    const lsKey = '_wra_line_note_' + serial;
    let existing = '';
    try { existing = localStorage.getItem(lsKey) || ''; } catch(_) {}

    let dlg = document.getElementById('_wra-line-comment');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_wra-line-comment';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const today = new Date();
    const dateStamp = String(today.getDate()).padStart(2,'0') + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
    const lastTech = localStorage.getItem('_vr_last_tech') || '';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(540px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#b45309,#92400e);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">📝 Athugasemd</h3>' +
            '<div style="font-size:11px;color:#fef3c7;margin-top:2px">' + esc(serial) + (name ? ' · ' + esc(name) : '') + '</div>' +
          '</div>' +
          '<button id="_wral-x" type="button" style="background:transparent;border:1px solid #c2410c;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px">' +
          (existing ?
            '<div style="margin-bottom:12px">' +
              '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Fyrri athugasemdir (staðbundið)</label>' +
              '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px;font-size:13px;line-height:1.5;max-height:140px;overflow:auto;white-space:pre-wrap">' + esc(existing) + '</div>' +
            '</div>' : ''
          ) +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Ný athugasemd</label>' +
          '<textarea id="_wral-new" rows="4" placeholder="t.d. „Vantar að endurhlaða", „Þrýstingur í lagi", „Skipta um ventil"" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;box-sizing:border-box"></textarea>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;cursor:pointer">' +
              '<input id="_wral-stamp" type="checkbox" checked style="width:16px;height:16px;cursor:pointer">' +
              'Bæta við dagsetningu og nafni (' + esc(dateStamp + (lastTech ? ' · ' + lastTech : '')) + ')' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_wral-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_wral-replace" type="button" style="padding:9px 14px;background:#fff;border:1px solid #c2410c;color:#c2410c;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Skrifa yfir</button>' +
          '<button id="_wral-add" type="button" style="padding:9px 18px;background:#b45309;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">+ Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const ta = dlg.querySelector('#_wral-new');
    setTimeout(() => ta.focus(), 50);
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_wral-x').addEventListener('click', close);
    dlg.querySelector('#_wral-cancel').addEventListener('click', close);

    function save(replace) {
      const fresh = ta.value.trim();
      if (!fresh) { alert('Skrifaðu athugasemd áður en þú vistar.'); return; }
      const stamp = dlg.querySelector('#_wral-stamp').checked;
      const tag = stamp ? '[' + dateStamp + (lastTech ? ' · ' + lastTech : '') + '] ' : '';
      const newEntry = tag + fresh;
      const final = (replace || !existing) ? newEntry : (existing + '\n\n' + newEntry);
      try { localStorage.setItem(lsKey, final); } catch(_) {}
      if (window.Toast && Toast.show) Toast.show('✓ Athugasemd vistuð staðbundið');
      close();
    }
    dlg.querySelector('#_wral-add').addEventListener('click', () => save(false));
    dlg.querySelector('#_wral-replace').addEventListener('click', async () => {
      // 2026-05-10 (B5+): Confirm.show í stað native confirm
      if (existing && !(await Confirm.show('Skrifa yfir fyrri athugasemdir?', {danger:true, okText:'Skrifa yfir'}))) return;
      save(true);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(false); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  function decorateAllRows() {
    // Counter and Workshop main containers (HTML table layout)
    [
      document.getElementById('counter-main'),
      document.getElementById('workshop-main')
    ].forEach(c => {
      if (!c) return;
      c.querySelectorAll('table.dtbl tbody tr').forEach(decorateTableRow);
    });
    // Workshop redesign modal (div-based .ws-row layout)
    const wsModal = document.getElementById('workshop-detail-modal');
    if (wsModal) {
      wsModal.querySelectorAll('.ws-row').forEach(decorateWsRow);
    }
    // Counter redesign modal (if it exists with .cw-row pattern)
    document.querySelectorAll('.cw-row, .ws-row').forEach(row => {
      // Only decorate if not in a context already handled
      if (row.dataset._wraDone === '1') return;
      decorateWsRow(row);
    });
  }

  // Watch for re-renders
  function attach(id) {
    const el = document.getElementById(id);
    if (!el) { setTimeout(() => attach(id), 800); return; }
    new MutationObserver(() => {
      clearTimeout(attach._t);
      attach._t = setTimeout(decorateAllRows, 80);
    }).observe(el, { childList: true, subtree: true });
  }
  attach('counter-main');
  attach('workshop-main');
  attach('workshop-detail-modal');
  attach('counter-detail-modal');
  setTimeout(decorateAllRows, 1200);
  setTimeout(decorateAllRows, 3000);
  // Periodic light refresh in case modals open without firing observers we listen to
  setInterval(decorateAllRows, 1500);

  console.log('[workshop-row-actions] installed — ✏️ Breyta + 📝 Athugasemd hnappar á tækjarúðum');
})();
/* === END WORKSHOP ROW ACTIONS v1 === */
