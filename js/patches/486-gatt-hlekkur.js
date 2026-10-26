/* === FYRIRTÆKJASÍÐA: „Þjónustugátt ↗“ — beint inn á gáttina á þessa eign (486) ====================================
 * 26.10.2026 (Agnar, skjáskot af Bríetartúni: „mætti bæta við litlum glugga þarna sem maður kemst beint inn á
 * þjónustugátt — opinn aðgang þaðan inn á tiltekna eign og félag").
 *
 * Lítill hlekkur í nafnaröð borðans (.co-banner-id, hægra megin). /api/gatt-slug?site=<id> segir hvort félagið (eða
 * höfuðfélag rekstrarfélagsins) á OPNA gátt; þá opnast /gatt/?c=<slug>&eign=<id> í nýjum flipa og gáttin opnar
 * eignasíðuna (portal.js les ?eign=). Engin gátt → ekkert sýnt. Svarið er geymt per félag í minni lotunnar.
 * Teiknast í sama tifi og borðinn (vakt á #companies-main) — snertir ekki aðra hnúta (regla 4 í CLAUDE.md).
 */
(function () {
  'use strict';
  if (window.__gattHlekkur486) return; window.__gattHlekkur486 = true;
  var cache = {}, inflight = {};

  function coId() {
    var m = String(location.hash || '').match(/#(?:company|companies|fyrirtaeki)\/(\d+)/);
    if (m) return m[1];
    var main = document.getElementById('companies-main');
    var el = main && main.querySelector('[data-co-id]:not(._cat-section)');
    return el ? el.getAttribute('data-co-id') : null;
  }
  function saekja(id) {
    if (cache[id] !== undefined) return Promise.resolve(cache[id]);
    if (inflight[id]) return inflight[id];
    inflight[id] = fetch('/api/gatt-slug?site=' + encodeURIComponent(id), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { slug: null }; })
      .catch(function () { return { slug: null }; })
      .then(function (j) { cache[id] = j && j.slug ? j : null; delete inflight[id]; return cache[id]; });
    return inflight[id];
  }
  function teikna() {
    var main = document.getElementById('companies-main'); if (!main) return;
    var row = main.querySelector('.co-banner .co-banner-id'); if (!row) return;
    var id = coId(); if (!id) return;
    var a = row.querySelector('.b486-gatt');
    if (a && a.getAttribute('data-co') === String(id)) return;   // þegar rétt
    if (a) a.remove();
    saekja(id).then(function (j) {
      if (!j || coId() !== String(id)) return;
      var r2 = main.querySelector('.co-banner .co-banner-id'); if (!r2 || r2.querySelector('.b486-gatt')) return;
      var el = document.createElement('a');
      el.className = 'b486-gatt'; el.setAttribute('data-co', String(id)); el.target = '_blank'; el.rel = 'noopener';
      el.href = '/gatt/?c=' + encodeURIComponent(j.slug) + '&eign=' + encodeURIComponent(id);
      el.title = 'Opna þjónustugátt ' + (j.nafn || j.slug) + ' á þessa eign (opinn aðgangur, nýr flipi)';
      el.innerHTML = '<span class="b486-k">Þjónustugátt</span><span class="b486-n">' + String(j.nafn || j.slug).replace(/[<>&]/g, '') + ' ↗</span>';
      r2.appendChild(el);
    });
  }
  var css = '.co-banner-id .b486-gatt{margin-left:auto;align-self:center;display:inline-flex;flex-direction:column;align-items:flex-end;gap:1px;' +
    'padding:7px 12px;border:1px solid #6b5a2e;border-radius:9px;background:linear-gradient(180deg,#2a2622,#17140f);color:#e9dcb6;text-decoration:none;' +
    'box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.6);white-space:nowrap;flex:0 0 auto}' +
    '.co-banner-id .b486-gatt:hover{border-color:#c9a94a;color:#fff}' +
    '.co-banner-id .b486-gatt .b486-k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#b9a26a}' +
    '.co-banner-id .b486-gatt .b486-n{font-size:12.5px;font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis}' +
    '@media (max-width:760px){.co-banner-id .b486-gatt{margin-left:0;flex-basis:100%;align-items:flex-start}}';
  var st = document.createElement('style'); st.id = 'gatt-hlekkur-486'; st.textContent = css; document.head.appendChild(st);

  var t = null;
  function kveikja() { if (t) return; t = setTimeout(function () { t = null; try { teikna(); } catch (_) {} }, 120); }
  function vakta() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(vakta, 1500); return; }
    new MutationObserver(kveikja).observe(main, { childList: true, subtree: true });
    window.addEventListener('hashchange', kveikja);
    kveikja();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();
})();
