/* === SALA · FLÍSAR: LEIT, STÆRRI MYNDIR, HRINGLAGA STÆKKUNARGLER (443) =======
 *
 * Agnar 04.10.2026 (S26, Brunakerfi-appið, Sala → Flísar): „geturðu stækkað
 * vörumyndirnar smá · lagað stækkunarglerið, eins og það sé teygt upp · og bætt
 * við leitarglugga fyrir allar vörur og þjónustu" (merkt í hausnum milli
 * „Þjónusta" og hakins „Sjá allar vörur og þjónustu").
 *
 *   1. MYNDIR — 28 px → 44 px í síma/appi (tölvan óbreytt).
 *   2. STÆKKUNARGLERIÐ (._pip-btn, 133) er <span role=button> 24 px breiður —
 *      261 `body.appmode .view [role=button]` gaf honum min-height 50 px og 12 px
 *      fyllingu: 24×50 sporöskja sem lá yfir upphafi nafnsins („uft" í stað „Duft").
 *      Hér 26 px hringur.
 *   3. LEIT — reitur í hausnum. Síar RAUNVERULEGU flísarnar eftir nafni (smellur
 *      bætir í körfuna eins og áður — engin ný körfuleið, pos.js ÓSNERT). Leitin á
 *      að ná í ALLAR vörur: meðan leitað er kveikir hún tímabundið á „Sjá allar
 *      vörur og þjónustu" og opnar „Sjá aðrar vörur", og skilar hvoru tveggja í
 *      fyrri stöðu þegar leitin er tæmd eða farið af síðunni. Íslenskir stafir
 *      jafngilda (þ=th, ð=d, æ=ae, á=a …), orðin mega standa í hvaða röð sem er.
 *
 * pos.js (vörðuð leið — kennitala) er ÓSNERT: CSS + hnútur í hausnum + síun á
 * flísum sem pos.js teiknar (vakt endurtekur síun þegar hún teiknar upp á nýtt).
 * Útlitsval eins vafra; engin gögn. 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__salaLeit443) return;
  window.__salaLeit443 = true;

  const ID = '_sl-leit';
  const TALA = '_sl-tala';
  const GRIDS = ['pos-services', 'pos-products', 'pos-adrar-grid'];
  const K = ':not(#_s443a):not(#_s443b):not(#_s443c):not(#_s443d)';
  const SIMI = ['body.appmode #view-sala', 'html[data-viewmode="mobile"] #view-sala'];
  const s = (sel, css) => SIMI.map(z => sel.split(',').map(x => z + ' ' + x.trim() + K).join(',')).join(',') + '{' + css + '}';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const GLER = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6573' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='M16 16l4.5 4.5'/%3E%3C/svg%3E\")";

  const CSS = [
    // 1. myndir
    s('.pos-svc > img,.pos-prod > img', 'width:44px!important;height:44px!important;object-fit:contain!important'),
    s('.pos-svc > .pos-tile-ic,.pos-prod > .pos-tile-ic', 'width:44px!important;height:44px!important'),
    // 2. stækkunarglerið
    s('._pip-btn', 'width:26px!important;height:26px!important;min-width:0!important;min-height:0!important;padding:0!important;line-height:1!important;top:5px!important;left:5px!important;border-radius:50%!important'),
    s('._pip-btn svg', 'width:13px!important;height:13px!important'),
    // 3. leitarreiturinn (alls staðar — ekkert breytist á tölvu nema reiturinn bætist við)
    '#' + ID + K + '{flex:1 1 160px!important;min-width:110px!important;max-width:360px!important;height:36px!important;min-height:0!important;margin:0 10px!important;padding:0 10px 0 32px!important;box-sizing:border-box!important;'
      + 'background:#eef1f6 ' + GLER + ' no-repeat 10px center / 15px 15px!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:8px!important;'
      + 'box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font:13.5px/1.2 ' + SANS + '!important;color:#141822!important;outline:none}',
    '#' + ID + K + ':focus{border-color:rgba(20,24,34,.38)!important}',
    '#' + TALA + K + '{flex:none!important;font:600 11px ' + MONO + '!important;color:#5b6573!important;white-space:nowrap!important;margin-right:8px!important}',
    '#' + TALA + ':empty{display:none!important}',
    '._sl-ekkert{grid-column:1 / -1;padding:10px 4px;font:500 12.5px ' + SANS + ';color:#6b7483}'
  ].join('\n');

  function mountCss() {
    let st = document.getElementById('_sl-css');
    if (!st) { st = document.createElement('style'); st.id = '_sl-css'; (document.head || document.documentElement).appendChild(st); }
    if (st.textContent !== CSS) st.textContent = CSS;
  }

  // ── leit ────────────────────────────────────────────────────────────────
  const norm = x => String(x == null ? '' : x).toLowerCase()
    .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');   // NFKD: CO₂ (lækkað ₂) = co2
  let q = '';
  let fyrriAllar = null;      // hakið „Sjá allar vörur og þjónustu" áður en leit hófst
  let opnadiAdrar = false;    // leitin opnaði „Sjá aðrar vörur"

  const synilegt = el => !!(el && el.getClientRects().length && getComputedStyle(el).display !== 'none');

  function hefja() {
    const cb = document.getElementById('pos-showall');
    if (fyrriAllar === null) {
      fyrriAllar = !!(cb && cb.checked);
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    const wrap = document.getElementById('pos-adrar-wrap'), btn = document.getElementById('pos-adrar-toggle');
    if (!opnadiAdrar && wrap && btn && !synilegt(wrap) && synilegt(btn)) { btn.click(); opnadiAdrar = true; }
  }
  function ljuka() {
    const cb = document.getElementById('pos-showall');
    if (fyrriAllar === false && cb && cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    fyrriAllar = null;
    if (opnadiAdrar) {
      const wrap = document.getElementById('pos-adrar-wrap'), btn = document.getElementById('pos-adrar-toggle');
      if (wrap && btn && synilegt(wrap)) btn.click();
      opnadiAdrar = false;
    }
  }

  // Vara má standa bæði á forsíðu og undir „Sjá aðrar vörur" (pos.js, Agnar 02.09) — í leit birtist hún einu sinni.
  const lykill = t => (t.classList.contains('pos-svc') ? 's' : 'p') + ':' + (t.getAttribute('data-id') || '');
  const erFlis = t => !!t.querySelector('.pos-tile-name');
  function fela(t, f) {
    if (f) { if (!t.hasAttribute('data-sl-falid')) { t.setAttribute('data-sl-falid', '1'); t.style.setProperty('display', 'none', 'important'); } }
    else if (t.hasAttribute('data-sl-falid')) { t.removeAttribute('data-sl-falid'); t.style.removeProperty('display'); }
  }
  function sia() {
    const ord = norm(q).trim().split(/\s+/).filter(Boolean);
    const sed = new Set();
    let fjoldi = 0;
    GRIDS.forEach(id => {
      const g = document.getElementById(id);
      if (!g) return;
      let iGrind = 0;
      let haus = null, hausSyn = false;
      const lokaHaus = () => { if (haus) fela(haus, ord.length && !hausSyn); };
      [...g.children].forEach(t => {
        if (t.classList.contains('_sl-ekkert')) return;
        if (!erFlis(t)) { lokaHaus(); haus = t; hausSyn = false; return; }   // flokkaheiti í „aðrar vörur"
        const k = lykill(t);
        const ok = !ord.length || (ord.every(o => norm(t.querySelector('.pos-tile-name').textContent).includes(o)) && !sed.has(k));
        if (ok) { iGrind++; hausSyn = true; if (ord.length) sed.add(k); }
        fela(t, !ok);
      });
      lokaHaus();
      fjoldi += iGrind;
      let tomt = g.querySelector(':scope > ._sl-ekkert');
      const vantar = ord.length && !iGrind && id !== 'pos-adrar-grid';
      if (vantar && !tomt) { tomt = document.createElement('div'); tomt.className = '_sl-ekkert'; g.appendChild(tomt); }
      if (tomt) {
        if (vantar) { const txt = 'Ekkert hér passar við „' + q.trim() + '"'; if (tomt.textContent !== txt) tomt.textContent = txt; }
        else tomt.remove();
      }
    });
    const tala = document.getElementById(TALA);
    const txt = ord.length ? fjoldi + ' fundust' : '';
    if (tala && tala.textContent !== txt) tala.textContent = txt;
  }

  // ── reiturinn í hausnum ─────────────────────────────────────────────────
  function festa() {
    const wrapAllar = document.getElementById('pos-showall-wrap');
    if (!wrapAllar) return;
    const haus = wrapAllar.parentElement;
    let inp = document.getElementById(ID);
    if (inp && inp.parentElement === haus) {
      const svc = document.getElementById('pos-services');
      const flisar = !svc || synilegt(svc);          // Listi-hamurinn (299) hefur sína eigin leit
      if ((inp.style.display === 'none') === flisar) inp.style.display = flisar ? '' : 'none';
      return;
    }
    if (inp) inp.remove();
    inp = document.createElement('input');
    inp.id = ID;
    inp.type = 'search';
    inp.placeholder = 'Leita í öllum vörum og þjónustu…';
    inp.setAttribute('aria-label', 'Leita í öllum vörum og þjónustu');
    inp.autocomplete = 'off';
    inp.value = q;
    const tala = document.createElement('span');
    tala.id = TALA;
    const sec = haus.querySelector('.pos-sec');
    if (sec && sec.nextSibling) haus.insertBefore(inp, sec.nextSibling); else haus.insertBefore(inp, wrapAllar);
    haus.insertBefore(tala, wrapAllar);
    // Smellir/lyklar leka ekki upp í Sölu-hlustendur (skanninn hlustar á lyklaborð)
    ['click', 'keydown', 'keyup', 'keypress'].forEach(ev => inp.addEventListener(ev, e => e.stopPropagation()));
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') { inp.value = ''; inp.dispatchEvent(new Event('input')); } });
    inp.addEventListener('input', () => {
      const var_ = q;
      q = inp.value;
      if (q.trim() && !var_.trim()) hefja();
      if (!q.trim() && var_.trim()) ljuka();
      sia();
    });
  }

  // ── vaktir: pos.js teiknar flísarnar upp á nýtt (innerHTML) → síun aftur ──
  let _t = 0;
  function seinna() {
    if (_t) return;
    _t = requestAnimationFrame(() => { _t = 0; festa(); if (q.trim()) sia(); });
  }
  function vakta() {
    const v = document.getElementById('view-sala');
    if (!v || v._sl443) return;
    v._sl443 = true;
    new MutationObserver(seinna).observe(v, { childList: true, subtree: true });
  }
  // Farið af Sölu með virka leit → hakið og „aðrar vörur" fara í fyrri stöðu
  window.addEventListener('hashchange', () => {
    if (!/^#sala\b/.test(location.hash) && q.trim()) {
      q = '';
      const inp = document.getElementById(ID); if (inp) inp.value = '';
      ljuka(); sia();
    }
  });

  function boot() { mountCss(); vakta(); festa(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [400, 1500, 4000].forEach(ms => setTimeout(boot, ms));
  setInterval(() => { if (document.getElementById('view-sala')) { vakta(); festa(); } }, 2000);

  window.SalaLeit = { leita: v => { const i = document.getElementById(ID); if (i) { i.value = v || ''; i.dispatchEvent(new Event('input')); } }, version: '443' };
  console.log('[patch-443] Sala-flísar: leit, myndir, stækkunargler');
})();
/* === END SALA FLÍSAR LEIT === */
