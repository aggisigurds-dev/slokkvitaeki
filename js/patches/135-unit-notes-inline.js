/* Per-unit note box í Verkstæði og Afgreiðslu detail.
 *
 * Bætir lítilli „📝 Athugasemd" pill við hverja unit-röð. Smellur opnar
 * lítinn editor — notandi getur skrifað athugasemd sem fer beint á
 * verklidur.notes í gagnagrunninum. Pillinn breytir lit (gulur) þegar
 * note er til staðar og sýnir styttingu á textanum.
 *
 * Þannig:
 *   • „þetta tæki er beygjingur"
 *   • „viðskiptavinur vill bjölluhring"
 *   • „þrýstingur 8 bar — ekki 10"
 * eru sýnilegar fyrir verkstæðismanninn beint, ekki gleymdar í solur.notes.
 *
 * Krefst: verklidur.notes column (sjá sql/verklidur_notes_and_credit.sql)
 */
(() => {
  if (window.__unitNotesInlineInstalled) return;
  window.__unitNotesInlineInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  // ── Cache + read helpers ──────────────────────────────────────────────────
  function unitNote(unitId) {
    const cache = (window.DB && DB.cache && DB.cache.jobs) || [];
    for (const j of cache) {
      const u = (j.units || []).find(x => x.id === unitId);
      if (u) return u.notes || '';
    }
    return '';
  }

  async function saveUnitNote(unitId, notes) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return false;
    const { error } = await sb.from('verklidur').update({ notes: notes }).eq('id', unitId);
    if (error) {
      // verklidur.notes column probably missing.
      if (/column .* does not exist/i.test(error.message)) {
        alert('Athugasemdir á tækjum eru ekki ennþá settar upp í gagnagrunninn.\n\n' +
              'Keyrðu þennan SQL í Supabase:\n\n' +
              'ALTER TABLE verklidur ADD COLUMN notes text DEFAULT \'\';\n\n' +
              '(Eða farðu í sql/verklidur_notes_and_credit.sql og afritaðu allt.)');
        return false;
      }
      console.warn('[unit-notes-inline] save failed:', error.message);
      return false;
    }
    // Update local cache so UI reflects immediately.
    const cache = (window.DB && DB.cache && DB.cache.jobs) || [];
    for (const j of cache) {
      const u = (j.units || []).find(x => x.id === unitId);
      if (u) { u.notes = notes; break; }
    }
    return true;
  }

  // ── Editor popover ────────────────────────────────────────────────────────
  function openEditor(unitId, anchor, onSaved) {
    const existing = document.getElementById('_uni-editor');
    if (existing) existing.remove();
    const ed = document.createElement('div');
    ed.id = '_uni-editor';
    ed.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:11000;display:flex;align-items:center;justify-content:center;padding:20px';
    const current = unitNote(unitId);
    ed.innerHTML =
      '<div style="background:#fff;border-radius:12px;width:min(440px,calc(100vw - 32px));overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.4)">' +
        '<div style="background:#fef3c7;padding:13px 18px;border-bottom:1px solid #fde68a">' +
          '<div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">📝 Athugasemd á tæki</div>' +
        '</div>' +
        '<div style="padding:16px 20px">' +
          '<textarea id="_uni-ta" rows="4" placeholder="t.d. Þrýstingur 8 bar, viðskiptavinur vill sækja á mánudag…" ' +
            'style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;resize:vertical;box-sizing:border-box;line-height:1.4">' +
            esc(current) +
          '</textarea>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">' +
          (current ? '<button id="_uni-clear" type="button" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-right:auto">🗑 Hreinsa</button>' : '') +
          '<button id="_uni-cancel" type="button" style="background:#f3f4f6;color:#475569;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px">Hætta við</button>' +
          '<button id="_uni-save" type="button" style="background:#16a34a;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">✓ Vista</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ed);
    const ta = ed.querySelector('#_uni-ta');
    setTimeout(() => ta.focus(), 50);

    function close() { ed.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    }
    document.addEventListener('keydown', onKey);
    ed.addEventListener('click', e => { if (e.target === ed) close(); });
    ed.querySelector('#_uni-cancel').onclick = close;
    async function save() {
      const v = ta.value.trim();
      const ok = await saveUnitNote(unitId, v);
      if (ok) {
        close();
        if (onSaved) onSaved(v);
      }
    }
    ed.querySelector('#_uni-save').onclick = save;
    const clr = ed.querySelector('#_uni-clear');
    if (clr) clr.onclick = async () => { ta.value = ''; await save(); };
  }

  // ── Injection ────────────────────────────────────────────────────────────
  function pillHtml(note) {
    if (note && note.trim()) {
      return '<button class="_uni-pill _uni-on" type="button" title="' + esc(note) + '" ' +
        'style="background:#fef3c7;border:1px solid #fbbf24;color:#78350f;font-size:11px;padding:3px 10px;border-radius:99px;cursor:pointer;font-weight:600;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;gap:4px">' +
        '📝 ' + esc(truncate(note, 32)) +
      '</button>';
    }
    return '<button class="_uni-pill" type="button" title="Bæta við athugasemd" ' +
      'style="background:#f8fafc;border:1px dashed #cbd5e1;color:#94a3b8;font-size:11px;padding:3px 10px;border-radius:99px;cursor:pointer;font-weight:500;white-space:nowrap">+ 📝 Athugasemd</button>';
  }

  function injectIntoWorkshop() {
    const detail = document.getElementById('workshop-detail');
    if (!detail) return;
    const sel = (window.Workshop && Workshop.sel);
    if (!sel) return;
    const job = (window.DB && DB.getJob) ? DB.getJob(sel) : null;
    if (!job) return;
    // Walk each .ws-row and inject pill into .ws-info
    detail.querySelectorAll('.ws-row').forEach(row => {
      if (row.dataset._uniDone === '1') return;
      const serEl = row.querySelector('.ws-ser');
      if (!serEl) return;
      const serial = serEl.textContent.trim();
      const unit = (job.units || []).find(u => u.serial === serial);
      if (!unit) return;
      row.dataset._uniDone = '1';
      const info = row.querySelector('.ws-info');
      if (!info) return;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:6px';
      wrap.innerHTML = pillHtml(unit.notes || '');
      info.appendChild(wrap);
      wrap.querySelector('._uni-pill').addEventListener('click', e => {
        e.stopPropagation();
        openEditor(unit.id, e.currentTarget, newNote => {
          wrap.innerHTML = pillHtml(newNote);
          wrap.querySelector('._uni-pill').addEventListener('click', ev => {
            ev.stopPropagation();
            openEditor(unit.id, ev.currentTarget, n => { wrap.innerHTML = pillHtml(n); injectIntoWorkshop(); });
          });
        });
      });
    });
  }

  function injectIntoCounter() {
    const main = document.getElementById('counter-main');
    if (!main) return;
    const job = (window.Counter && window.Counter.sel != null && window.DB && DB.getJob)
      ? DB.getJob(window.Counter.sel) : null;
    if (!job) return;
    const table = main.querySelector('table.dtbl');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      if (row.dataset._uniDone === '1') return;
      const serSpan = row.querySelector('.ser');
      if (!serSpan) return;
      const serial = serSpan.textContent.trim();
      const unit = (job.units || []).find(u => u.serial === serial);
      if (!unit) return;
      row.dataset._uniDone = '1';
      // Insert pill in the first td (under serial)
      const firstTd = row.children[0];
      if (!firstTd) return;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:4px';
      wrap.innerHTML = pillHtml(unit.notes || '');
      firstTd.appendChild(wrap);
      wrap.querySelector('._uni-pill').addEventListener('click', e => {
        e.stopPropagation();
        openEditor(unit.id, e.currentTarget, newNote => {
          wrap.innerHTML = pillHtml(newNote);
          wrap.querySelector('._uni-pill').addEventListener('click', ev => {
            ev.stopPropagation();
            openEditor(unit.id, ev.currentTarget, n => { wrap.innerHTML = pillHtml(n); injectIntoCounter(); });
          });
        });
      });
    });
  }

  function injectAll() {
    try { injectIntoWorkshop(); } catch (_) {}
    try { injectIntoCounter(); } catch (_) {}
  }

  let _t = 0;
  function attach() {
    const targets = [
      document.getElementById('counter-main'),
      document.getElementById('workshop-detail'),
      document.getElementById('view-counter'),
      document.getElementById('view-workshop')
    ].filter(Boolean);
    if (!targets.length) { setTimeout(attach, 800); return; }
    const obs = new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectAll, 150);
    });
    targets.forEach(t => obs.observe(t, { childList: true, subtree: true }));
    injectAll();
  }
  attach();

  console.log('[unit-notes-inline] installed — 📝 pill per tæki + verklidur.notes write');
})();
