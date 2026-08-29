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
    // 2026-08-28: 🌙-takkinn (66-dark-mode) var fjarlægður með þemuskiptunum.
    // Áður krafðist þetta fall BEGGJA takkanna og skilaði annars false — sem
    // hefði þýtt að EN-takkinn fengi ALDREI staðsetningu og dytti aftur í
    // v9.js-flotið (position:fixed, z-index:9999) sem flaut yfir modal-glugga.
    // Það er nákvæmlega bilunin sem þessi patch var skrifaður til að laga, svo
    // hún hefði endurvakist þegjandi. EN-takkinn er nú dokkaður EINN.
    // LEIÐRÉTTING 2026-08-29: í commit a7e19d9 fullyrti ég að þessi patch væri
    // "dauður allan tímann" af því app.css:3551 setur #_slokk_langbtn með
    // !important. ÞAÐ VAR RANGT. Mæling á ástandinu FYRIR breytinguna (f049379)
    // sýnir left:166px og z-index:200 — gildi ÞESSA patch, ekki app.css. Inline
    // !important vinnur stílblað-!important eins og staðallinn segir. Fyrri
    // mæling mín var gerð eftir handvirka endurkeyrslu í flipa þar sem staðan
    // var þegar brengluð.
    var theme = document.getElementById('dark-toggle');   // má vera null
    var lang  = document.getElementById('_slokk_langbtn');
    if (!lang) return false;

    if (window.innerWidth > BP) {
      // Sé þema-takkinn til (eldri lotur) situr hann vinstra megin og EN hægra
      // megin; annars fær EN vinstra sætið sjálft.
      if (theme) {
        setImp(theme, {
          'width': '150px',
          'margin': '0 0 0 8px',
          'box-sizing': 'border-box',
          'border-radius': '8px'
        });
      }
      setImp(lang, {
        'transform': 'none',
        'left': theme ? '166px' : '8px',
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
      if (theme) clearProps(theme, THEME_PROPS);
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
