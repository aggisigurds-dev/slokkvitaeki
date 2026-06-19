/* 223-uttekt-design.js — design-system layer for the redesigned tæki-úttekt /
 * company page (the v6 "eldþema" mockup, mockups/taekjauttekt-eldthema-v6.html).
 *
 * Stage 1: the company BANNER (dark gradient + monogram), theme-aware via the
 * data-thm-preset attribute that patch 220 stamps on <html>. Later stages add
 * the tæki-row, cost-band and skjöl component classes here too.
 *
 * Pure CSS injection — additive, reversible (delete file + its <script> tag).
 * The banner markup itself is rendered by Companies.openDetail (js/features.js).
 */
(function () {
  if (document.getElementById('uttekt-design-css')) return;
  var css = [
    /* ---- company banner ---- */
    '.co-banner{position:relative;overflow:hidden;color:#fff;border-radius:16px;padding:18px 22px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;box-shadow:0 1px 2px rgba(0,0,0,.05),0 18px 42px -26px rgba(0,0,0,.55);' +
      'background:linear-gradient(116deg,#04070c 0%,#0a1322 26%,#16365c 62%,#2563eb 100%)}', /* default = Klassískt */
    '[data-thm-preset="eldur"] .co-banner{background:linear-gradient(116deg,#080605 0%,#1c0706 22%,#7a0a12 52%,#b81620 74%,#e85d1c 100%)}',
    '[data-thm-preset="hlutlaust"] .co-banner{background:linear-gradient(116deg,#0a0f0e 0%,#16241f 30%,#14433a 64%,#0f766e 100%)}',
    '[data-thm-preset="dokkt"] .co-banner{background:linear-gradient(116deg,#000 0%,#16181d 45%,#2a2f3a 100%)}',
    '.co-banner::before{content:"";position:absolute;right:-70px;top:-90px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 64%);pointer-events:none}',
    '.co-banner>*{position:relative;z-index:1}',
    '.co-banner-id{display:flex;align-items:center;gap:14px;min-width:0}',
    '.co-banner-mono{width:48px;height:48px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28)}',
    '.co-banner-name{font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1.15}',
    '.co-banner-kt{font-size:12px;color:rgba(255,255,255,.62);font-family:ui-monospace,Menlo,monospace;margin-top:2px}',
    '.co-banner-facts{display:flex;flex-wrap:wrap;gap:15px;margin-top:9px;font-size:12.5px;color:rgba(255,255,255,.82)}',
    '.co-banner-facts b{color:#fff;font-weight:600}',
    '.co-banner-facts a{color:#fff;text-decoration:none}',
    '.co-banner-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.co-banner-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-weight:700;font-size:12px;padding:6px 12px;border-radius:99px}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'uttekt-design-css';
  st.textContent = css;
  document.head.appendChild(st);
  console.log('[patch-223] tæki-úttekt design layer (banner) installed');
})();
