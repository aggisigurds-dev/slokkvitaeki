/* 212-langbtn-dock.js
   Tidy the bottom-left of the sidebar.

   The EN/IS language toggle (#_slokk_langbtn, from v9.js) is position:fixed at
   left:91px + translateX(-50%) + z-index:9999, so it floats ON TOP of the 🌙
   dark-mode toggle (#dark-toggle, from 66-dark-mode.js) at the bottom of the
   sidebar — only a sliver of the moon shows, and it also floated over modals.

   This docks them side-by-side as two clean buttons: theme on the left, EN on
   the right, no overlap, with a sane z-index. Desktop only (>768px) — on phones
   v9.js already pins EN to the bottom-right, so we leave that alone. */
(function () {
  if (window.__langbtnDockInstalled) return;
  window.__langbtnDockInstalled = true;

  var BP = 768; // matches v9.js mobile breakpoint

  function setImp(el, styles) {
    for (var k in styles) el.style.setProperty(k, styles[k], 'important');
  }
  function clearProps(el, props) {
    for (var i = 0; i < props.length; i++) el.style.removeProperty(props[i]);
  }

  var THEME_PROPS = ['width', 'margin', 'box-sizing', 'border-radius'];
  var LANG_PROPS  = ['transform', 'left', 'bottom', 'width', 'height',
                     'padding', 'border-radius', 'z-index', 'box-shadow'];

  function apply() {
    var theme = document.getElementById('dark-toggle');
    var lang  = document.getElementById('_slokk_langbtn');
    if (!theme || !lang) return false;

    if (window.innerWidth > BP) {
      // theme = left button, EN = right button — sidebar is 220px wide
      setImp(theme, {
        'width': '150px',
        'margin': '0 0 0 8px',
        'box-sizing': 'border-box',
        'border-radius': '8px'
      });
      setImp(lang, {
        'transform': 'none',
        'left': '166px',
        'bottom': '0px',
        'width': '46px',
        'height': '40px',
        'padding': '0px',
        'border-radius': '8px',
        'z-index': '200',
        'box-shadow': 'none'
      });
    } else {
      // phone: hand styling back to v9.js / base CSS
      clearProps(theme, THEME_PROPS);
      clearProps(lang, LANG_PROPS);
    }
    return true;
  }

  function boot() {
    if (apply()) return;
    // v9.js builds the language button after this patch parses — wait for it
    var obs = new MutationObserver(function () { if (apply()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', apply);
  window.addEventListener('resize', apply);
})();
