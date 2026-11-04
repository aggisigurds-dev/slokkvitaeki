/* === AGENTANETIÐ — TENGILL AF ÞJÓNUSTUBORÐINU (493) — 04.11.2026 ===================================
 *
 * Agnar 04.11.2026: „setja link inn á þetta frá þjónustuborð hjá Agnari líka". Ein lína efst á Þjónustuborðinu,
 * aðeins hjá Agnari (sama regla og 489 Vinnusamantekt), með hlekk á Agentanetið í Jarvis
 * (brunaholf.netlify.app/jarvis.html#agentanet), Charlize-biðstofuna (#bidstofa) og Jarvis sjálfan.
 * Opnast í nýjum flipa — Jarvis liggur á öðrum uppruna (Brunahólf). Ekkert nýtt borð, engin PAGES-færsla,
 * ekkert skrifað. 368 teiknar línuna: (window.AgentanetTengill ? AgentanetTengill.html(n) : '') við hlið 489.
 * Takkarnir nota .btn.iv.sm úr 368 svo útlitið fylgi borðinu. Engin emoji — tákn er inline stroke-SVG.
 * ================================================================================================ */
(() => {
  if (window.AgentanetTengill) return;
  const URL = 'https://brunaholf.netlify.app/jarvis.html';
  const NET = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-2px;margin-right:5px"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="3" r="1.5"/><circle cx="20" cy="17" r="1.5"/><circle cx="4" cy="17" r="1.5"/><path d="M12 9V4.5M14.3 13.6l4.4 2.6M9.7 13.6l-4.4 2.6"/></svg>';
  function css() {
    if (document.getElementById('_t5-agentanet-css')) return;
    const st = document.createElement('style'); st.id = '_t5-agentanet-css';
    st.textContent = '.t5-agentanet{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 10px;padding:8px 12px;border:1px solid rgba(79,216,255,.35);background:linear-gradient(180deg,rgba(4,16,26,.55),rgba(0,2,5,.35))}' +
      '.t5-agentanet .l{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#4fd8ff;margin-right:4px;white-space:nowrap}' +
      '.t5-agentanet a.btn{text-decoration:none;display:inline-flex;align-items:center;min-height:32px}';
    document.head.appendChild(st);
  }
  window.AgentanetTengill = {
    html(n) {
      if (n !== 'Agnar') return '';
      css();
      return '<div class="t5-agentanet" role="navigation" aria-label="Agentanetið í Jarvis">' +
        '<span class="l">J.A.R.V.I.S. · Agentanetið</span>' +
        '<a class="btn iv sm" href="' + URL + '#agentanet" target="_blank" rel="noopener">' + NET + 'Agentanetið — stjóri → sérfræðingar → síður</a>' +
        '<a class="btn iv sm" href="' + URL + '#bidstofa" target="_blank" rel="noopener">Charlize-biðstofan</a>' +
        '<a class="btn iv sm" href="' + URL + '" target="_blank" rel="noopener">Jarvis</a>' +
        '</div>';
    }
  };
})();
