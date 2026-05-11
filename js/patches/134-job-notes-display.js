/* Shared editable athugasemd-box á Verkstæði og Afgreiðslu detail.
 *
 * EINN gluggi per verkbeiðni sem afgreiðsla, verkstæði og sala geta öll
 * skrifað í og breytt. Geymist í verkbeidnir.notes í gagnagrunni — engin
 * týnsla milli aðila.
 *
 * Birtingarmáti:
 *   • Tómur:  grár dashed kassi "+ 📝 Bæta við athugasemd"
 *   • Útfylt: gulur sticky-note með textanum og "✏ Breyta" takka
 *
 * Smellur → opnar lítinn textarea editor → vista. Textinn er sá
 * sami fyrir alla og uppfærist í rauntíma þegar einhver vistar.
 *
 * Sýnir EKKI fyrstu línuna ef hún er bara þjónustulýsingin sem pos.js
 * setur sjálfvirkt (t.d. "2 kg. CO₂ hleðsla") — bara raunverulegar
 * athugasemdir.
 */
(() => {
  if (window.__jobNotesDisplayInstalled) return;
  window.__jobNotesDisplayInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Heuristic: is the first line just a service description (auto-added by
  // pos.js)? If so, hide it from the editable note — only show what came
  // after, which is the real customer/workshop note.
  // 2026-05-11: Original regex had un-anchored alternations — keywords
  // like "vatn", "hleðsla", "yfirferð" matched anywhere in the line,
  // eating legitimate user notes starting with those words (e.g. "Vatn
  // í tankinum", "Hleðsla bilaði"). Now we ONLY treat as auto-prefix
  // if the line starts with a number + unit (the structured pos.js
  // output like "6 kg. Duft ABC hleðsla"). Pure-text user notes are
  // preserved.
  function isServiceDescLine(line) {
    const l = String(line || '').trim();
    if (!l) return false;
    return /^\d+[\d.,]*\s*(kg|kr|l|stk|stykki|m|mm|cm)\b/i.test(l);
  }

  // Split raw verkbeidnir.notes into { servicePrefix, userNote }.
  // pos.js writes: "<service desc>\n— <state.notes>"
  function splitNotes(rawNotes) {
    const raw = String(rawNotes || '');
    if (!raw.trim()) return { prefix: '', userNote: '' };
    const lines = raw.split('\n');
    // If first line looks like service desc, peel it off.
    if (lines.length > 1 && isServiceDescLine(lines[0])) {
      const rest = lines.slice(1).join('\n').replace(/^—\s*/gm, '').trim();
      return { prefix: lines[0].trim(), userNote: rest };
    }
    return { prefix: '', userNote: raw.trim() };
  }

  // Rebuild full notes string for the DB save — preserve the auto prefix.
  function joinNotes(prefix, userNote) {
    const p = (prefix || '').trim();
    const u = (userNote || '').trim();
    if (p && u) return p + '\n— ' + u;
    if (u) return u;
    return p;
  }

  async function saveJobNotes(jobId, newNotes) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return false;
    const { error } = await sb.from('verkbeidnir').update({ notes: newNotes }).eq('id', jobId);
    if (error) { console.warn('[job-notes] save failed:', error.message); return false; }
    // Update local cache so all views reflect immediately.
    const cache = (window.DB && DB.cache && DB.cache.jobs) || [];
    const job = cache.find(j => j.id === jobId);
    if (job) job.notes = newNotes;
    return true;
  }

  // ── Editor popover ─────────────────────────────────────────────────────────
  function openEditor(jobId, currentUserNote, prefix, onSaved) {
    const existing = document.getElementById('_jnd-editor');
    if (existing) existing.remove();
    const ed = document.createElement('div');
    ed.id = '_jnd-editor';
    ed.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:11000;display:flex;align-items:center;justify-content:center;padding:20px';
    ed.innerHTML =
      '<div style="background:#fff;border-radius:12px;width:min(480px,calc(100vw - 32px));overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.4)">' +
        '<div style="background:#fef3c7;padding:13px 18px;border-bottom:1px solid #fde68a">' +
          '<div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">📝 Athugasemd á verki</div>' +
          '<div style="font-size:11px;color:#a16207;margin-top:2px">Sýnileg fyrir Sölu, Afgreiðslu og Verkstæði.</div>' +
        '</div>' +
        '<div style="padding:16px 20px">' +
          '<textarea id="_jnd-ta" rows="5" placeholder="t.d. Þrýstingur lítill, viðskiptavinur vill sækja á mánudag, allir skápar fest…" ' +
            'style="width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;resize:vertical;box-sizing:border-box;line-height:1.5">' +
            esc(currentUserNote) +
          '</textarea>' +
          '<div style="font-size:11px;color:#94a3b8;margin-top:6px">⌘/Ctrl + Enter = vista · Esc = hætta við</div>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">' +
          (currentUserNote ? '<button id="_jnd-clear" type="button" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-right:auto">🗑 Hreinsa</button>' : '') +
          '<button id="_jnd-cancel" type="button" style="background:#f3f4f6;color:#475569;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px">Hætta við</button>' +
          '<button id="_jnd-save" type="button" style="background:#16a34a;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">✓ Vista</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ed);
    const ta = ed.querySelector('#_jnd-ta');
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);

    function close() { ed.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    }
    document.addEventListener('keydown', onKey);
    ed.addEventListener('click', e => { if (e.target === ed) close(); });
    ed.querySelector('#_jnd-cancel').onclick = close;
    async function save() {
      const v = ta.value.trim();
      const full = joinNotes(prefix, v);
      const ok = await saveJobNotes(jobId, full);
      if (ok) {
        close();
        if (onSaved) onSaved(v);
      }
    }
    ed.querySelector('#_jnd-save').onclick = save;
    const clr = ed.querySelector('#_jnd-clear');
    if (clr) clr.onclick = async () => { ta.value = ''; await save(); };
  }

  function buildStickyHtml(jobId, userNote, prefix) {
    if (userNote && userNote.trim()) {
      return '<div data-job-id="' + jobId + '" data-prefix="' + esc(prefix) + '" ' +
        'style="margin:0 0 12px;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;font-size:13px;line-height:1.45;color:#78350f;white-space:pre-wrap;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;position:relative" ' +
        'class="_jnd-sticky" title="Smelltu til að breyta">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#92400e">📌 Athugasemd</div>' +
            '<div style="font-size:11px;color:#a16207;font-weight:600">✏ Breyta</div>' +
          '</div>' +
          esc(userNote) +
      '</div>';
    }
    // Empty state — small, unobtrusive invitation. 2026-05-11: was a
    // big dashed box on every order with no note — looked like real
    // content and added visual clutter when scanning the list. Now a
    // single small link in the corner that still lets user add a note.
    return '<div data-job-id="' + jobId + '" data-prefix="' + esc(prefix) + '" ' +
      'style="margin:0 0 8px;padding:5px 0;font-size:11px;color:#94a3b8;cursor:pointer;text-align:right;font-weight:500" ' +
      'class="_jnd-sticky" title="Smelltu til að bæta við athugasemd">' +
        '<span style="opacity:0.7">📝 Bæta við athugasemd</span>' +
    '</div>';
  }

  function attachClickHandler(stickyEl) {
    if (!stickyEl || stickyEl.dataset._jndWired === '1') return;
    stickyEl.dataset._jndWired = '1';
    stickyEl.addEventListener('click', () => {
      const jobId = +stickyEl.dataset.jobId;
      const prefix = stickyEl.dataset.prefix || '';
      const cache = (window.DB && DB.cache && DB.cache.jobs) || [];
      const job = cache.find(j => j.id === jobId);
      const { userNote } = splitNotes(job ? job.notes : '');
      openEditor(jobId, userNote, prefix, () => {
        // Re-inject so the sticky reflects the new value.
        const container = stickyEl.parentNode;
        const newCache = (window.DB && DB.cache && DB.cache.jobs) || [];
        const updated = newCache.find(j => j.id === jobId);
        const split = splitNotes(updated ? updated.notes : '');
        const wrap = document.createElement('div');
        wrap.className = '_jnd-wrap';
        wrap.innerHTML = buildStickyHtml(jobId, split.userNote, split.prefix);
        stickyEl.parentNode.replaceChild(wrap, stickyEl);
        attachClickHandler(wrap.querySelector('._jnd-sticky'));
      });
    });
  }

  function injectIntoCounter() {
    const main = document.getElementById('counter-main');
    if (!main) return;
    const job = (window.Counter && window.Counter.sel != null && window.DB && DB.getJob)
      ? DB.getJob(window.Counter.sel) : null;
    if (!job) return;
    if (main.querySelector('._jnd-wrap')) return;
    const split = splitNotes(job.notes);
    let anchor = null;
    const divs = main.querySelectorAll('div');
    for (const d of divs) {
      const txt = (d.textContent || '').trim();
      if (txt.startsWith('Slökkvitæki í verki') || txt.includes('Slökkvitæki í verki')) {
        anchor = d.closest('div');
        if (anchor && anchor.children.length >= 2) break;
      }
    }
    const wrap = document.createElement('div');
    wrap.className = '_jnd-wrap';
    wrap.innerHTML = buildStickyHtml(job.id, split.userNote, split.prefix);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor);
    else main.appendChild(wrap);
    attachClickHandler(wrap.querySelector('._jnd-sticky'));
  }

  function injectIntoWorkshop() {
    const detail = document.getElementById('workshop-detail');
    if (!detail) return;
    const sel = (window.Workshop && Workshop.sel);
    if (!sel) return;
    const job = (window.DB && DB.getJob) ? DB.getJob(sel) : null;
    if (!job) return;
    if (detail.querySelector('._jnd-wrap')) return;
    const split = splitNotes(job.notes);
    const sub = detail.querySelector('.ws-sub');
    const wrap = document.createElement('div');
    wrap.className = '_jnd-wrap';
    wrap.style.margin = '12px 16px 0';
    wrap.innerHTML = buildStickyHtml(job.id, split.userNote, split.prefix);
    if (sub && sub.parentNode) sub.parentNode.insertBefore(wrap, sub.nextSibling);
    else detail.insertBefore(wrap, detail.firstChild);
    attachClickHandler(wrap.querySelector('._jnd-sticky'));
  }

  function injectAll() {
    try { injectIntoCounter(); } catch (_) {}
    try { injectIntoWorkshop(); } catch (_) {}
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

  console.log('[job-notes-display] v2 installed — editable shared sticky-note (verkbeidnir.notes)');
})();
