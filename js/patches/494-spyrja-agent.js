/* 494-spyrja-agent.js — „Spyrja sérfræðing“ á hverri sýn appsins (Agentakerfið 2.0, fasi 6 G, 04.11.2026)
 *
 * Lítill takki neðst til vinstri sem opnar brunaholf.netlify.app/spyrja.html í NÝJUM flipa með vefur=slokkvitaeki,
 * view=<hash-sýnin>, kt=<kennitalan sem sést á skjánum>. Síðukortið (brunaholf/data/sidukort.json) velur eigandann þar
 * og /api/spyrja-agent svarar með agent-skránni + kúnnaminninu. Nýr flipi, ekki rammi: starfsmanna-kaka Brunahólfs
 * er SameSite og fylgir ekki í iframe úr öðrum uppruna (sjá minni 01.11.2026). Engin skrif héðan, engin keyrsla
 * fyrr en smellt er. Felur sig á gátt/prent-sýnum (body.print, #view-gatt) og þegar sala-POS er í fullum skjá.
 */
(function () {
  'use strict';
  if (window.__spyrjaAgent494) return; window.__spyrjaAgent494 = true;
  var HUB = 'https://brunaholf.netlify.app/spyrja.html';
  var st = document.createElement('style');
  st.textContent = '.sa494{position:fixed;left:12px;bottom:12px;z-index:9990;font:11px/1 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;padding:8px 11px;border:1px solid rgba(212,165,58,.6);background:rgba(10,14,20,.9);color:#f0c35c;border-radius:4px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4)}.sa494:hover{background:#141b26;border-color:#f0c35c}@media print{.sa494{display:none}}';
  document.head.appendChild(st);
  function view() { return (location.hash || '').replace(/^#/, '').split(/[?/&]/)[0]; }
  function kt() {
    try {
      var el = document.querySelector('.co-banner') || document.querySelector('[data-kt]') || document.body;
      var dk = el.getAttribute && el.getAttribute('data-kt'); if (dk && /^\d{6}-?\d{4}$/.test(dk)) return dk;
      var m = /\b(\d{6})-(\d{4})\b/.exec(el.innerText.slice(0, 20000)); return m ? m[1] + '-' + m[2] : '';
    } catch (_) { return ''; }
  }
  function opna() {
    var q = 'vefur=slokkvitaeki&view=' + encodeURIComponent(view() || 'home') + '&path=' + encodeURIComponent(location.pathname);
    var k = kt(); if (k) q += '&kt=' + k;
    var t = document.title ? document.title.replace(/\s*[—|-]\s*Sl[öo]kkvit[æa]ki.*$/i, '') : ''; if (t) q += '&titill=' + encodeURIComponent(t.slice(0, 60));
    window.open(HUB + '?' + q, '_blank', 'noopener');
  }
  function init() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sa494'; b.textContent = 'Spyrja sérfræðing'; b.title = 'Opnar sérfræðing síðunnar í Jarvis (nýr flipi)';
    b.addEventListener('click', opna); document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
