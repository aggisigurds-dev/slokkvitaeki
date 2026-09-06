/* === ÁRSGRINDIN (Staða eftir ári, 199) Á SÍMA — SNYRTILEGRA (356) ===============
 *
 * Agnar 06.09.2026 (skjáskot úr Fjármál-appinu, fyrirtækjasíða): „geturðu gert þetta
 * eitthvað snyrtilegra". Það sem var að: (1) tvö þjónustuspjöld hlið við hlið í ~330 px
 * dálkum — skjalanöfn skárust („Bílaverkstæði Íslands - Suðurhellu 6, 2…"), valmyndin
 * „— hvaða reikningu" líka; (2) app-hamurinn (261) blæs ALLA takka í .view í 50 px með
 * 12 px fyllingu — flísarnar ✓ / ＋ / ✕ / skjöl / „+ skýrsla" urðu að stórum kössum með
 * merkimiða á reiki; (3) tómt spjald („engin brunakerfisþjónusta") tók hálfa breiddina.
 *
 * Hér, aðeins á síma/appi (body.appmode · html[data-viewmode=mobile] · html.slokk-phone-dev
 * — EKKI @media, sem kviknar ekki á 980 px viewporti símans):
 *   • eitt þjónustuspjald í röð undir hverju ári; tómt spjald = ein lág lína með „+ skýrsla"
 *   • flísar í flísastærð (34 px), skjalaflís teygist yfir breiddina og styttist með …
 *   • haus: nafn · staða · Senda/Þjónustusíða vefjast snyrtilega, merkimiðinn (skýrsla /
 *     reikningur) aftast í línunni
 * Gögn, atburðir og 199 sjálft eru ÓSNERT — CSS eitt. Falsk-id keðja (sjá 349) svo reglurnar
 * vinni 261 (body.appmode .view button … !important). 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__arsgrindSimi356) return;
  window.__arsgrindSimi356 = true;

  const STYLE_ID = 'arsgrind-simi-356';
  const P = ':not(#_p356a):not(#_p356b)';
  const SCOPES = ['body.appmode #companies-main ', 'html[data-viewmode="mobile"] #companies-main ', 'html.slokk-phone-dev #companies-main '];
  const r = (sels, css) => SCOPES.map(s => sels.map(sel => s + sel + P).join(',')).join(',') + '{' + css + '}';

  const CSS = [
    // ── öryggisnet fyrir alla síðuna: ekkert spjald víkkar síðuna — breitt efni skrunar innan síns spjalds ──
    SCOPES.map(s => s + '> *' + P).join(',') + '{max-width:100%!important;box-sizing:border-box!important;overflow-x:auto!important}',
    r(['._samskipti-card', '._samskipti-host', '.card.pad'], 'width:auto!important;max-width:100%!important;min-width:0!important'),
    // ── eitt spjald í röð ────────────────────────────────────────────────
    // minmax(0,1fr) + min-width:0: grid-hólf með min-width:auto stækka annars upp í min-content
    // breiðasta barnsins (nowrap-flís) og spjaldið flæðir út fyrir skjáinn
    // Agnar 06.09 (kvöld): „fannst nú betra að hafa hlið við hlið, finnst þetta taka svo mikið pláss" → tveir dálkar
    // áfram, en þéttir; einn dálkur aðeins þegar grindin sjálf er þrengri en 520px (venjulegur sími án Tölvusíðu-hams).
    r(['.sk-svc-grid'], 'grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;max-width:100%!important'),
    r(['.sk-svc-card'], 'padding:8px 9px 7px!important;border-radius:10px!important;min-width:0!important;max-width:100%!important;overflow:hidden!important'),
    r(['.sk-yrblock'], 'max-width:100%!important;min-width:0!important;padding:8px 0!important'),
    r(['.sk-yrwrap'], 'max-width:100%!important;min-width:0!important'),
    // ílátið er spjaldið sjálft svo samnings-grindin (utan .sk-yrwrap) fylgi líka
    r(['._dyg-section.sk-card'], 'container-type:inline-size'),
    '@container (max-width:520px){' + r(['.sk-svc-grid'], 'grid-template-columns:minmax(0,1fr)!important') + '}',
    // tómt spjald = ein lína: haus + „engin …" + „+ skýrsla" í sömu línu
    r(['.sk-svc-card.sk-svc-empty'], 'opacity:.85!important;padding:6px 11px!important'),
    r(['.sk-svc-card.sk-svc-empty .sk-svc-hd'], 'margin-bottom:0!important;flex-wrap:wrap!important;gap:6px!important'),
    r(['.sk-svc-card.sk-svc-empty .sk-svc-row'], 'display:inline-flex!important;margin:0 0 0 4px!important;font-size:12px!important;color:var(--ink4)!important;font-style:italic'),

    // ── haus: nafn · staða · takkar ──────────────────────────────────────
    r(['.sk-svc-hd'], 'flex-wrap:wrap!important;gap:5px!important;margin-bottom:5px!important;font-size:13px!important'),
    r(['.sk-svc-hd b'], 'font-size:14px!important'),
    r(['.sk-svc-st'], 'margin-left:0!important;font-size:10.5px!important;padding:3px 9px!important'),
    r(['.sk-svc-send'], 'margin-left:auto!important'),
    r(['.sk-svc-ws'], 'margin-left:0!important'),
    r(['.sk-svc-hd:has(.sk-svc-ws):not(:has(.sk-svc-send)) .sk-svc-ws'], 'margin-left:auto!important'),

    // ── línur: punktur · flísar sem fylla breiddina · merkimiði aftast ───
    r(['.sk-svc-row'], 'display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:5px!important;margin:4px 0!important'),
    r(['.sk-svc-row .sk-svc-tag'], 'margin-left:auto!important;font-size:9.5px!important;padding:2px 7px!important'),
    r(['.sk-svc-row .sk-att-wrap'], 'flex:1 1 120px!important;max-width:100%!important;min-width:0!important'),
    r(['.sk-svc-row .sk-att-wrap .sk-doc'], 'flex:1 1 auto!important;min-width:0!important;max-width:100%!important'),
    r(['.sk-svc-row > .sk-doc.rep', '.sk-svc-row > .sk-doc.inv', '.sk-svc-row > a.sk-doc'], 'max-width:100%!important;flex:1 1 120px!important;min-width:0!important'),
    r(['.sk-link-wrap'], 'flex:1 1 100%!important;flex-wrap:wrap!important;gap:5px!important'),
    r(['.sk-link-wrap .sk-link-sel'], 'flex:1 1 120px!important;max-width:100%!important'),

    // ── flísar í flísastærð (261 blæs takka í .view í 50 px) ─────────────
    r(['.sk-card button', '.sk-card .sk-doc', '.sk-card a.sk-doc'], 'min-height:32px!important;height:auto!important;padding:4px 9px!important;font-size:12px!important;line-height:1.25!important;border-radius:8px!important;box-sizing:border-box!important'),
    r(['.sk-card .sk-att-x'], 'padding:4px 7px!important;border-radius:0 8px 8px 0!important;min-width:0!important'),
    r(['.sk-card .sk-att-wrap .sk-doc'], 'border-radius:8px 0 0 8px!important'),
    r(['.sk-card .sk-doc.add'], 'font-weight:600!important;border-style:dashed!important'),
    r(['.sk-card .sk-dot'], 'flex:0 0 9px!important'),
    r(['.sk-card .sk-svc-send', '.sk-card .sk-svc-ws', '.sk-card .sk-link-btn', '.sk-card .sk-link-peek', '.sk-card .sk-svc-btn'], 'font-size:11.5px!important;padding:5px 10px!important;min-height:34px!important'),
    r(['.sk-card .sk-add-btn'], 'padding:7px 12px!important;min-height:36px!important'),
    r(['.sk-card .sk-h'], 'padding:10px 12px!important;flex-wrap:wrap!important;gap:8px!important'),
    r(['.sk-card .sk-strip'], 'gap:8px!important;padding:9px 12px!important;flex-wrap:wrap!important'),
    r(['.sk-card .sk-strip-l'], 'min-width:0!important'),
    // Samnings-/skjala-strimlar: innri flex-röð (nowrap) var 463 px — vefja og halda sig innan spjaldsins
    r(['.sk-card .sk-strip-r'], 'min-width:0!important;max-width:100%!important;flex:1 1 100%!important'),
    r(['.sk-card .sk-strip-r > div', '.sk-card .sk-strip-r > span'], 'flex-wrap:wrap!important;max-width:100%!important;min-width:0!important'),
    r(['.sk-card .sk-strip-r .sk-att-wrap'], 'max-width:100%!important;min-width:0!important'),
    r(['.sk-card .sk-strip-r .sk-att-wrap .sk-doc'], 'min-width:0!important;max-width:100%!important;flex:1 1 auto!important'),
    r(['.sk-yrwrap'], 'padding:2px 10px 10px!important'),
    r(['.sk-yr-label'], 'font-size:14px!important;margin-bottom:6px!important'),
  ].join('\n');

  function mount() {
    let s = document.getElementById(STYLE_ID);
    if (!s) { s = document.createElement('style'); s.id = STYLE_ID; (document.head || document.documentElement).appendChild(s); }
    if (s.textContent !== CSS) s.textContent = CSS;
    // aftast í <head> — 199/261/330/338 skrifa á sömu velli
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }
  mount();
  document.addEventListener('slokk-viewmode', mount);
  document.addEventListener('DOMContentLoaded', mount);
  [400, 1500, 3000].forEach(ms => setTimeout(mount, ms));
  window.ArsgrindSimi = { mount, version: '356' };
  console.log('[patch-356] ársgrind á síma: snyrtilegra');
})();
/* === END ÁRSGRIND Á SÍMA === */
