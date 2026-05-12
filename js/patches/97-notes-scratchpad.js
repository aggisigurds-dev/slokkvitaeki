/* === PUNKTAR OG VERÐ (NOTES SCRATCHPAD) v1 ===
 *
 * Bætir við textareiti efst í Samningar-sýninni þar sem notandi getur skráð
 * niður:
 *   • Punkta og minnispunkta sem hann vill muna
 *   • Verðlistar / verð á þjónustu
 *   • Algenga texta og athugasemdir
 *
 * Eiginleikar:
 *   • Sjálfvirk vistun (debounce 800ms eftir innslátt)
 *   • Samstilling milli tækja í gegnum AppSettings
 *   • Stærðanlegt (resize:vertical)
 *   • Letur fast breidd (monospace) fyrir verðlista í dálkum
 *   • Prenta með smelli (A4, einföld layout)
 *   • Hreinsa allt með staðfestingu
 *
 * Geymsla: AppSettings.samningar_notes (texti)
 */
(() => {
  if (window.__notesScratchpadInstalled) return;
  window.__notesScratchpadInstalled = true;

  const STORAGE_KEY = 'samningar_notes';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getNotes() {
    if (!window.AppSettings || !window.AppSettings.path) return '';
    const v = window.AppSettings.path(STORAGE_KEY);
    return typeof v === 'string' ? v : '';
  }

  async function saveNotes(text) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    return await window.AppSettings.save({ [STORAGE_KEY]: text });
  }

  function injectSection() {
    const main = document.querySelector('#view-samningar #ct-main');
    if (!main) return;
    if (main.querySelector('._np-section')) return;

    const section = document.createElement('div');
    section.className = '_np-section';
    section.style.cssText = 'max-width:1180px;margin:0 auto 18px;padding-bottom:18px;border-bottom:1px dashed #e2e8f0';
    section.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h2 style="margin:0;font-size:18px;color:#0f172a">📝 Punktar og verð</h2>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">Frjáls texti — sjálfkrafa vistaður og samstilltur milli tækja.</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<span class="_np-status" style="font-size:11px;color:#94a3b8;font-weight:500;margin-right:6px;min-width:60px;text-align:right"></span>' +
          '<button class="_np-print btn btn-outline btn-sm" type="button" title="Prenta minnispunkta">🖨 Prenta</button>' +
          '<button class="_np-clear btn btn-outline btn-sm" type="button" title="Hreinsa allt" style="color:#dc2626;border-color:#fecaca">✕ Hreinsa</button>' +
        '</div>' +
      '</div>' +
      '<textarea class="_np-textarea" placeholder="Skrifaðu punkta, verðlistar, minnispunkta hér...\n\nDæmi:\n  Slökkvitæki 6kg ABC — 8.410 kr\n  Skoðun 5 ára — 4.200 kr\n  Hringja í Jón hjá Eimskip um skoðun 12. maí"' +
        ' style="width:100%;min-height:160px;padding:14px 16px;border:1px solid #cbd5e1;border-radius:10px;font-family:Consolas,Monaco,\'Courier New\',monospace;font-size:13px;line-height:1.55;resize:vertical;box-sizing:border-box;background:#fffef9;box-shadow:inset 0 1px 2px rgba(0,0,0,0.03)">' +
      '</textarea>';

    // Insert at TOP of #ct-main (above other sections)
    if (main.firstChild) main.insertBefore(section, main.firstChild);
    else main.appendChild(section);

    wireSection(section);
  }

  function wireSection(section) {
    const ta = section.querySelector('._np-textarea');
    const status = section.querySelector('._np-status');
    const printBtn = section.querySelector('._np-print');
    const clearBtn = section.querySelector('._np-clear');

    // Initial value from settings
    ta.value = getNotes();

    let saveTimer = null;
    let lastSaved = ta.value;

    function setStatus(text, color) {
      status.textContent = text;
      status.style.color = color || '#94a3b8';
    }

    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      setStatus('…');
      saveTimer = setTimeout(async () => {
        if (ta.value === lastSaved) { setStatus(''); return; }
        const ok = await saveNotes(ta.value);
        if (ok) {
          lastSaved = ta.value;
          setStatus('✓ vistað', '#16a34a');
          setTimeout(() => { if (status.textContent === '✓ vistað') setStatus(''); }, 1800);
        } else {
          setStatus('✗ ekki vistað', '#dc2626');
        }
      }, 800);
    }

    ta.addEventListener('input', scheduleSave);

    // Save immediately on blur (in case user closes the page)
    ta.addEventListener('blur', () => {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (ta.value !== lastSaved) {
        saveNotes(ta.value).then(ok => {
          if (ok) lastSaved = ta.value;
        });
      }
    });

    printBtn.addEventListener('click', () => {
      const text = ta.value;
      if (!text.trim()) { alert('Engir punktar til að prenta.'); return; }
      const win = window.open('', 'notes-print', 'width=900,height=1100');
      if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
      const today = new Date();
      const dateStr = String(today.getDate()).padStart(2,'0') + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
      win.document.write(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Punktar og verð</title>' +
        '<style>' +
          '@media print{@page{size:A4;margin:18mm}}' +
          'body{margin:0;padding:18mm;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#fff}' +
          '@media print{body{padding:0}}' +
          'h1{margin:0 0 4px;font-size:20px}' +
          '.meta{font-size:12px;color:#64748b;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
          'pre{white-space:pre-wrap;word-wrap:break-word;font-family:Consolas,Monaco,\'Courier New\',monospace;font-size:13px;line-height:1.6;margin:0;color:#0f172a}' +
        '</style></head><body>' +
          '<h1>📝 Punktar og verð</h1>' +
          '<div class="meta">Slökkvitæki ehf · prentað ' + esc(dateStr) + '</div>' +
          '<pre>' + esc(text) + '</pre>' +
          '<scr' + 'ipt>setTimeout(function(){window.print();},250);</scr' + 'ipt>' +
        '</body></html>'
      );
      win.document.close();
    });

    clearBtn.addEventListener('click', async () => {
      if (!ta.value.trim()) return;
      if (!await Confirm.show('Hreinsa alla punkta og verð? Þetta er ekki afturkræft.')) return;
      ta.value = '';
      lastSaved = '';
      const ok = await saveNotes('');
      setStatus(ok ? '✓ hreinsað' : '✗ ekki hreinsað', ok ? '#16a34a' : '#dc2626');
      setTimeout(() => setStatus(''), 1800);
      ta.focus();
    });
  }

  // ── Mount when Samningar view opens ────────────────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'samningar') {
      setTimeout(injectSection, 250);
      setTimeout(injectSection, 900);
    }
  });
  setInterval(() => {
    const view = document.getElementById('view-samningar');
    if (view && view.classList.contains('active') && !view.querySelector('._np-section')) {
      injectSection();
    }
  }, 1500);

  // Refresh from AppSettings on remote change (cross-device)
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      const view = document.getElementById('view-samningar');
      if (!view || !view.classList.contains('active')) return;
      const section = view.querySelector('._np-section');
      if (!section) return;
      const ta = section.querySelector('._np-textarea');
      if (!ta) return;
      // Only update if user is not currently typing (avoid clobbering)
      if (document.activeElement === ta) return;
      const remote = getNotes();
      if (ta.value !== remote) {
        ta.value = remote;
      }
    });
  }

  console.log('[notes-scratchpad] installed — punktar og verð í Samningum');
})();
/* === END PUNKTAR OG VERÐ v1 === */
