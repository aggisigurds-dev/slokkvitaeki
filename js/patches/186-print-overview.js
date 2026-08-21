/* === PRINT OVERVIEW (skýrsla) v1 ===
 * window.SlokkPrint(title, boxEl) — opens a clean, letterhead-style print
 * window with the company logo, a title + date, the totals summary and the
 * full status table from an overview box. Used by the Rekstrarfélög and
 * Fyrirtæki í Þjónustu "yfirlit" views so they can be handed to the boss.
 * Self-contained.
 *
 * 2026-08-06 (ósk Agnars: "would want it in same look as it is" — printing
 * Rekstrarfélög's per-company table, sem er byggð úr rf-cnt/rf-ycell/rf-pill/
 * rf-gold CSS-klösum, kom út sem óstílaður, samanþjappaður texti því
 * print-glugginn átti EKKERT nema `CSS` að ofan — engin af þessum klösum var
 * skilgreind þar). Nú afritar SlokkPrint öll <style> á lifandi síðunni inn í
 * print-gluggann OG pakkar innihaldinu í `<div id="view-rekstrarfelog">` svo
 * `#view-rekstrarfelog .rf-xyz`-valararnir (allir forskeyttir þannig í
 * 175-rekstrarfelog.js) passi við eitthvað. Yfirlits-borðin (renderOverview/
 * 185-inservice-yfirlit) nota bara innline stíla á móti — óbreytt fyrir þau,
 * bara auka (skaðlaus) CSS sem ekkert í þeirra HTML passar við.
 */
(() => {
  if (window.SlokkPrint) return;

  const CSS = `
    @page { margin: 12mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#0f172a; margin:20px; background:#fff; }
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
    /* Rekstrarfélög's per-company table brings its own dark-metal look via
       copied page styles below (real classes, real colors) — undo just the
       full-bleed near-black PAGE background so print stays on white paper,
       and drop the generic td border above so its zebra-striped rows (no
       grid lines on screen) print the same way. */
    #view-rekstrarfelog { background:#fff !important; padding:0 !important; }
    #view-rekstrarfelog .rf-tbl th, #view-rekstrarfelog .rf-tbl td { border:0; }
  `;

  function pad(n){ return ('0'+n).slice(-2); }

  // Strip `@media print { … }` blocks out of copied page CSS. The popup IS the
  // print target and carries its own print rules (CSS above); the live page's
  // print rules assume the app's DOM and can BLANK the popup. Concretely,
  // 273-brunakerfi-skyrsla ships `@media print{body>*{display:none!important}}`
  // to isolate its own overlay — copied in, it hid the entire popup, so the
  // Rekstrarfélög print came out empty (empty preview + blank PDF). (2026-08-21)
  function stripPrintMedia(css){
    if (!css || css.indexOf('@media') < 0) return css || '';
    var re = /@media\s+print\b[^{]*\{/gi, m;
    while ((m = re.exec(css))) {
      var start = m.index, i = m.index + m[0].length, depth = 1;
      for (; i < css.length && depth > 0; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
      }
      css = css.slice(0, start) + css.slice(i);
      re.lastIndex = start;
    }
    return css;
  }

  // Live page's own <style> tags (theme.css-style per-view stylesheets like
  // 175-rekstrarfelog.js's #_rf-styles-v4) — carries the real component
  // colors (pills, status badges, table header) into the print window. We copy
  // the on-screen rules but DROP their @media print blocks (see stripPrintMedia).
  function pageStyles(){
    try { return Array.from(document.querySelectorAll('style')).map(s => stripPrintMedia(s.textContent || '')).join('\n'); }
    catch(e){ return ''; }
  }

  // 2026-08-06 fix: the #view-rekstrarfelog/.rf-page wrapper below exists so
  // 175-rekstrarfelog.js's own #_rf-styles-v4 rules (copied in via
  // pageStyles()) apply to ITS table. But SlokkPrint is also called by
  // 185-inservice-yfirlit.js for an unrelated print — if Rekstrarfélög had
  // been visited earlier in the same session (so its stylesheet is sitting
  // in document.head), that same wrapper div/class silently pulled in
  // Rekstrarfélög's font/padding rules onto 185's print too. `rfScoped` is
  // now explicit per caller instead of being applied unconditionally.
  window.SlokkPrint = function(title, boxEl, rfScoped){
    if (!boxEl) return;
    const table  = boxEl.querySelector('table');
    const totals = boxEl.querySelector('._ovr-totals');
    // Use the same logo the invoice / tilboð forms use (branding.logo_url).
    let logo = '';
    try {
      const b = (window.AppSettings && AppSettings.path) ? AppSettings.path('branding') : null;
      if (b) logo = b.logo_url || b.banner_image_2x_url || b.banner_image_url || '';
    } catch(e){}
    if (!logo) { const img = document.querySelector('img[src*="logo" i]'); if (img && img.src) logo = img.src; }
    if (!logo) logo = location.origin + '/img/logo.jpg';
    const d = new Date();
    const ds = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    const rows = table ? table.querySelectorAll('tbody tr').length : 0;

    const w = window.open('', '_blank', 'width=1120,height=820');
    if (!w) { alert('Leyfðu sprettiglugga (popup) til að prenta skýrsluna.'); return; }
    w.document.write(
      '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + pageStyles() + '\n' + CSS + '</style></head><body>' +
        '<div class="hd">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') +
          '<div><div class="t">Slökkvitæki ehf</div><div class="s">' + esc(title) + '</div></div></div>' +
        '<div class="meta">Skýrsla útbúin ' + ds + ' · ' + rows + ' línur</div>' +
        (rfScoped ? '<div id="view-rekstrarfelog"><div class="rf-page">' : '<div>') +
          (totals ? '<div class="tot">' + totals.innerHTML + '</div>' : '') +
          (table ? table.outerHTML : '<p>Engin gögn.</p>') +
        (rfScoped ? '</div></div>' : '</div>') +
        '<div class="ft">Sjálfvirk skýrsla úr þjónustukerfi Slökkvitækis ehf.</div>' +
      '</body></html>'
    );
    w.document.close();
    // give the logo a moment to load, then print
    setTimeout(function(){ try { w.focus(); w.print(); } catch(e){} }, 700);
  };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();
