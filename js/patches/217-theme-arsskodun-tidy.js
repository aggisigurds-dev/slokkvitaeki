/* 217-theme-arsskodun-tidy.js — redesign tidy for the Fyrirtæki í Þjónustu list.

   Hides the e-mail (Netfang) column so the row matches the mockup. The email
   still lives on each company's own page/detail — it's only dropped from this
   dense list view. CSS only, reversible.

   (The year columns '23–'26 are styled as inspection tags in patch 187.) */
(function () {
  if (window.__thmArsTidyInstalled) return;
  window.__thmArsTidyInstalled = true;
  if (document.getElementById('thm-ars-tidy')) return;
  var st = document.createElement('style');
  st.id = 'thm-ars-tidy';
  st.textContent = "#view-arsskodun thead tr th:nth-child(7),#view-arsskodun tr._ars-row > td:nth-child(7){display:none !important;}";
  document.head.appendChild(st);
})();
