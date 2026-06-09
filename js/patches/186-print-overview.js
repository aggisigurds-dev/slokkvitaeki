/* === PRINT OVERVIEW (skýrsla) v1 ===
 * window.SlokkPrint(title, boxEl) — opens a clean, letterhead-style print
 * window with the company logo, a title + date, the totals summary and the
 * full status table from an overview box. Used by the Rekstrarfélög and
 * Fyrirtæki í Þjónustu "yfirlit" views so they can be handed to the boss.
 * Self-contained.
 */
(() => {
  if (window.SlokkPrint) return;

  const CSS = `
    @page { margin: 12mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#0f172a; margin:20px; }
    .hd { display:flex; align-items:center; gap:14px; border-bottom:3px solid #b91c1c; padding-bottom:12px; margin-bottom:14px; }
    .hd img { height:54px; width:auto; }
    .hd .t { font-size:21px; font-weight:800; line-height:1.1; }
    .hd .s { font-size:13px; color:#475569; margin-top:3px; }
    .meta { font-size:12px; color:#64748b; margin-bottom:10px; }
    .tot { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; font-size:12px; }
    .tot > div { border:1px solid #e2e8f0; border-radius:8px; padding:5px 10px; }
    table { width:100%; border-collapse:collapse; font-size:10.5px; }
    th,td { border:1px solid #e2e8f0; padding:3px 6px; text-align:left; }
    thead { display:table-header-group; }
    tr { page-break-inside:avoid; }
    a { color:#15803d; text-decoration:none; }
    .ft { margin-top:14px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:6px; }
    @media print { .noprint { display:none; } }
  `;

  function pad(n){ return ('0'+n).slice(-2); }

  window.SlokkPrint = function(title, boxEl){
    if (!boxEl) return;
    const table  = boxEl.querySelector('table');
    const totals = boxEl.querySelector('._ovr-totals');
    let logo = '';
    const img = document.querySelector('img[src*="logo" i]') || document.querySelector('.brand-logo, .sb-logo img, header img');
    if (img && img.src) logo = img.src; else logo = location.origin + '/img/logo.jpg';
    const d = new Date();
    const ds = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    const rows = table ? table.querySelectorAll('tbody tr').length : 0;

    const w = window.open('', '_blank', 'width=1120,height=820');
    if (!w) { alert('Leyfðu sprettiglugga (popup) til að prenta skýrsluna.'); return; }
    w.document.write(
      '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' +
        '<div class="hd">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') +
          '<div><div class="t">Slökkvitæki ehf</div><div class="s">' + esc(title) + '</div></div></div>' +
        '<div class="meta">Skýrsla útbúin ' + ds + ' · ' + rows + ' línur</div>' +
        (totals ? '<div class="tot">' + totals.innerHTML + '</div>' : '') +
        (table ? table.outerHTML : '<p>Engin gögn.</p>') +
        '<div class="ft">Sjálfvirk skýrsla úr þjónustukerfi Slökkvitækis ehf.</div>' +
      '</body></html>'
    );
    w.document.close();
    // give the logo a moment to load, then print
    setTimeout(function(){ try { w.focus(); w.print(); } catch(e){} }, 700);
  };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();
