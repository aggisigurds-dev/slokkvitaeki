/* 457 — Staðirnir á Ársskoðun sem SPJÖLD (11.10.2026, Agnar: „card view … sem myndi sýna upplýsingarnar allar
 *       sem eru í núverandi listaview hjá mér í ársskoðun").
 *
 *   Aðeins CSS ofan á töfluna sem 153 teiknar — engin önnur teikning, enginn hnútur færður. Hver <tr._ars-row>
 *   verður stálspjald (Brunastál C: hvítt spjald, dökkur hnoðaður málmhaus) og hver <td> fær sitt svæði í grind
 *   spjaldsins. Því fylgja ÖLL merki og takkar óbreytt: póstmerkið (295), ársplöturnar '23–'26 (187), aksturinn
 *   (267), forgangur (175), GÓ (418), Í vinnslu-hakið og staðan (153), endurheimt, ferðanótan (153 + 394) — og
 *   smellur á spjaldið opnar staðinn eins og röðin gerði. Dálkahausarnir verða röðunarflísar ofan við spjöldin.
 *
 *   Rofinn „Spjöld / Listi" situr í hlutahausnum hjá „Númer" og kortinu (394 .arsm-verkf). Listinn er ALLTAF
 *   sjálfgefinn (Agnar 11.10: „hafa samt lista default á báðum stöðum") — valið lifir aðeins þar til síðan er
 *   endurhlaðin og er hvergi vistað.
 *
 *   Uppsetning spjalds (grind 4 dálka):
 *     1  MYNDIN af húsinu (11.10.2026, Agnar: „Myndin áttu núna að vera aðalatriðið"): sama mynd og í
 *        fyrirtækjabannernum (367, AppSettings co_bygging_mynd; annars fyrirtaeki.eign.mynd), smækkuð
 *        í 720 px um myndaþjónustu Supabase. Ofan á henni: SKOÐUN <mánuður> efst til vinstri, póstmerkið
 *        neðst til vinstri, Í vinnslu-hak + staða neðst til hægri. Án myndar: málmplata með húsatákni.
 *        11.10.2026 (Agnar: „smækka aðeins í 4-5 á breidd"): spjaldið er ~250 px, myndin 150 px há.
 *     2  nafn (Playfair) · kt · merki
 *     3  heimilisfang (póstnúmer feitt)
 *     4  ferðanóta (fyllir afgangsplássið svo fóturinn situr alltaf neðst)
 *     5  '23 · '24 · '25 · '26 — skoðanir og skjöl
 *     6  SLT · BSL · RS · ÆTL
 *     7  fótur: Forg. · GÓ · Akstur · Endurheimt
 *
 *   Myndin er sett með einni CSS-breytu per stað (--spj-mynd) í eigin stílblaði — enginn hnútur 153 er snertur.
 *   Stillingin „Heil mynd / Fylla ramma" (Agnar 11.10: „lætur alla myndina sjást … bætist bara við hvítt sem fyllir
 *   upp í rammann"): heil mynd (contain á hvítu) er sjálfgefin; valið er útlitsval vafrans (localStorage
 *   `spj_mynd_heil_v1`, '0' = fylla) og klasinn html.spj-heil gildir líka um spjöld skoðunarsíðnanna (458).
 *
 *   Aðeins borðtölva (min-width:901px) — síminn teiknar sín eigin _arsm-row spjöld (331/382).
 */
(function () {
  'use strict';
  if (window.__arsSpjold457) return;
  window.__arsSpjold457 = true;

  var P = 'html.ars-spjold body #view-arsskodun ';
  var F = ':not(#_p457a):not(#_p457b):not(#_p457c):not(#_p457d):not(#_p457e):not(#_p457f):not(#_p457g):not(#_p457h)';
  var T = '._ars-tblscroll table.data-table ';
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
  var SANS = '"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  // Tákn Brunastáls C (sömu gildi og 413: METAL, LINE, SILVER_BTN)
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var LINE_SH = 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var SILVER_SH = 'inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)';
  // Án myndar: daufur hústákn á málmi (sama tákn og eignir gáttarinnar)
  var HUS = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b717c" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 21V6l7.5-3 7.5 3v15"/><path d="M2.5 21h19"/><path d="M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M10.5 21v-4h3v4"/></svg>') + '")';
  var SKYGGING = 'linear-gradient(180deg,rgba(8,8,10,.5) 0%,rgba(8,8,10,0) 32%,rgba(8,8,10,0) 68%,rgba(8,8,10,.42) 100%)';

  // Hver regla fær forskeytið og gervi-auðkennin á hvern lið (415/394 nota 6 — hér 8, og !important alls staðar).
  function r(sel, css) {
    return sel.split(',').map(function (x) {
      x = x.trim();
      var i = x.indexOf('::');
      return i < 0 ? P + x + F : P + x.slice(0, i) + F + x.slice(i);
    }).join(',') + '{' + css.split(';').filter(Boolean).map(function (d) {
      return /!important\s*$/.test(d) ? d : d + '!important';
    }).join(';') + '}';
  }

  function css() {
    if (document.getElementById('_ars-spjold-css')) return;
    var R = [
      // ── hólfið: gegnsætt, ekkert skrun — spjöldin liggja á síðunni sjálfri
      r('.data-table-wrap,._ars-tblscroll,.data-table-scroll', 'background:transparent;border:0;border-radius:0;box-shadow:none;overflow:visible;max-height:none;height:auto;padding:0'),
      r(T, 'display:block;width:100%;min-width:0;max-width:none;border:0;background:transparent;table-layout:auto'),
      r(T + 'colgroup', 'display:none'),

      // ── dálkahausarnir verða röðunarflísar
      r(T + 'thead', 'display:block;position:static;background:transparent;box-shadow:none;border:0'),
      r(T + 'thead tr', 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:0 0 14px;background:transparent;box-shadow:none;border:0;height:auto'),
      r(T + 'thead tr::before', 'content:"Raða eftir";font:700 10px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#8e97a6;margin-right:4px'),
      r(T + 'thead th', 'display:none'),
      r(T + 'thead th._ars-sort,' + T + 'thead th._ars-mailsort',
        'display:inline-flex;align-items:center;gap:5px;position:static;top:auto;height:30px;width:auto;min-width:0;padding:0 11px;' +
        'border-radius:3px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:' + SILVER_SH + ';' +
        'font:700 10px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#1f2530;cursor:pointer;white-space:nowrap'),
      r(T + 'thead th._ars-sort:hover,' + T + 'thead th._ars-mailsort:hover', 'border-color:rgba(20,24,34,.4)'),
      r(T + 'thead th .sort-ar', 'color:#5b6472;margin-left:2px'),

      // ── spjaldagrindin
      r(T + 'tbody', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:14px;padding:2px 0 18px;background:transparent'),
      r(T + 'tbody tr._ars-row',
        'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:150px auto auto 1fr auto auto 50px;' +
        'column-gap:6px;row-gap:0;position:relative;padding:0 12px;height:auto;min-height:0;background:#fff;' +
        'border:1px solid #000;border-radius:12px;overflow:hidden;cursor:pointer;' +
        'box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12)'),
      r(T + 'tbody tr._ars-row:hover', 'box-shadow:0 0 0 1px #000,0 18px 40px -12px rgba(10,14,22,.55),0 2px 6px rgba(10,14,22,.14)'),
      r(T + 'tbody tr._ars-row:focus-visible', 'outline:2px solid #b8912f;outline-offset:2px'),
      // MYNDIN — gervistak í grindinni (röð 1), teygt út yfir fyllinguna. --spj-mynd kemur úr stílblaði myndanna;
      // vanti hana stendur hústáknið á málmi. Skygging efst og neðst svo merkin ofan á lesist á hvaða mynd sem er.
      r(T + 'tbody tr._ars-row::before',
        'content:"";display:block;grid-row:1;grid-column:1/-1;margin:0 -12px;border-bottom:1px solid #000;' +
        'background-color:#1c1d21;background-image:' + SKYGGING + ',var(--spj-mynd,' + HUS + '),' + METAL + ';' +
        'background-size:100% 100%,var(--spj-str,52px 52px),100% 100%;background-position:center,center,center;background-repeat:no-repeat'),
      r(T + 'tbody tr._ars-row.overdue::before', 'border-bottom:3px solid #b0201b'),
      // Heil mynd: öll myndin sést (contain) og hvítt fyllir upp í rammann; engin skygging yfir hvítu. Án myndar: óbreytt.
      'html.ars-spjold.spj-heil body #view-arsskodun ' + T + 'tbody tr._ars-row' + F + '::before{' +
        'background-image:linear-gradient(transparent,transparent),var(--spj-mynd,' + HUS + '),var(--spj-heil-bak,' + METAL + ')!important;' +
        'background-size:100% 100%,var(--spj-heil-str,52px 52px),100% 100%!important}',
      // fóturinn (röð 7): ljós stubbur með línu að ofan
      r(T + 'tbody tr._ars-row::after',
        'content:"";display:block;grid-row:7;grid-column:1/-1;margin:0 -12px;background:linear-gradient(180deg,#f6f8fb,#eef1f6);border-top:1px solid #e3e7ee'),

      // ── reitirnir: enginn sebralitur, engin föst hæð, engar línur
      r(T + 'tbody tr._ars-row > td',
        'display:flex;align-items:center;min-width:0;width:auto;height:auto;min-height:0;padding:0;margin:0;border:0;' +
        'background:transparent;box-shadow:none;position:relative;text-align:left;vertical-align:baseline'),

      // 1 · merkin ofan á myndinni: mánuður efst t.v., póstmerki neðst t.v., staða neðst t.h.
      r(T + 'tbody tr._ars-row > td._ars-mailcol',
        'grid-row:1;grid-column:1/-1;justify-self:start;align-self:end;margin-bottom:8px;padding:2px 7px;gap:4px;z-index:1;' +
        'border-radius:99px;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.3)'),
      r(T + 'tbody tr._ars-row > td._ars-mailcol:empty', 'display:none'),
      r(T + 'tbody tr._ars-row > td:has(> ._mo)',
        'grid-row:1;grid-column:1/-1;justify-self:start;align-self:start;margin-top:9px;height:23px;padding:0 9px;gap:6px;z-index:1;' +
        'border-radius:99px;background:rgba(12,12,14,.74);box-shadow:0 2px 8px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)'),
      r(T + 'tbody tr._ars-row > td:has(> ._mo)::before', 'content:"Skoðun";font:700 8px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#aab1bb'),
      r(T + 'tbody tr._ars-row > td > ._mo', 'font:700 11px/1 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#fff;text-shadow:none'),
      r(T + 'tbody tr._ars-row > td > ._mo[style*="c0241f"]', 'color:#ff8a7a'),
      r(T + 'tbody tr._ars-row > td:has(> ._stcell)', 'grid-row:1;grid-column:1/-1;justify-self:end;align-self:end;margin-bottom:8px;z-index:1'),
      r(T + 'tbody tr._ars-row > td > ._stcell > ._chk', 'box-shadow:0 2px 8px rgba(0,0,0,.35)'),
      r(T + 'tbody tr._ars-row > td > ._stcell', 'display:inline-flex;align-items:center;gap:5px;width:auto'),
      r(T + 'tbody tr._ars-row > td > ._stcell > span:empty', 'display:none'),
      r(T + 'tbody tr._ars-row > td > ._stcell > ._st', 'width:auto;min-width:0;min-height:24px;padding:3px 9px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35)'),

      // 2 · nafn, kt og merki
      r(T + 'tbody tr._ars-row > td._ars-namecell', 'grid-row:2;grid-column:1/-1;display:block;padding-top:11px'),
      r(T + 'tbody tr._ars-row > td._ars-namecell ._co',
        'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;' +
        'font:800 16px/1.15 ' + DISPLAY + ';font-variant-numeric:lining-nums;letter-spacing:-.01em;color:#11141c'),
      r(T + 'tbody tr._ars-row > td._ars-namecell ._kt', 'display:inline-block;margin-top:3px;font:500 10.5px/1.2 ' + MONO + ';color:#5b6472'),
      r(T + 'tbody tr._ars-row > td._ars-namecell input._ars-note-under', 'display:none'),

      // 3 · heimilisfang
      r(T + 'tbody tr._ars-row > td._ars-addrcell', 'grid-row:3;grid-column:1/-1;padding-top:5px'),
      r(T + 'tbody tr._ars-row > td._ars-addrcell ._addr', 'display:inline;white-space:normal;font:500 11px/1.35 ' + MONO + ';color:#2b313c'),
      r(T + 'tbody tr._ars-row > td._ars-addrcell ._post', 'font-weight:700;color:#1d5bbf;margin-right:6px'),

      // 4 · ferðanóta — röðin fyllir afganginn (1fr) svo fóturinn er neðst í öllum spjöldum; reiturinn heldur eigin hæð
      r(T + 'tbody tr._ars-row > td._ars-notacell', 'grid-row:4;grid-column:1/-1;align-items:flex-start;align-self:start;margin-top:8px;min-height:20px;padding:3px 7px;border-radius:6px;border:1px dashed rgba(20,24,34,.16);background:#fbfcfd'),
      r(T + 'tbody tr._ars-row > td._ars-notacell._er-med', 'border-style:solid;border-color:rgba(184,145,47,.4);background:#fffbf0'),
      r(T + 'tbody tr._ars-row > td._ars-notacell ._ars-nota3', '-webkit-line-clamp:3;font:400 11.5px/1.4 ' + SANS + ';color:#3a4250'),

      // 5 · '23 '24 '25 '26 — sjálfvirk röðun í dálka 1–4 (sama röð og í töflunni)
      r(T + 'tbody tr._ars-row > td[data-yrcell]', 'grid-row:5;justify-content:center;padding-top:10px;overflow:visible'),
      r(T + 'tbody tr._ars-row > td[data-yrcell] ._yr', 'width:100%;min-width:0;max-width:52px'),

      // 6 · tækin og áætlunin
      r(T + 'tbody tr._ars-row > td:has(> ._devs)', 'grid-row:6;grid-column:1/-1;flex-wrap:wrap;gap:5px;padding:9px 0 11px'),
      r(T + 'tbody tr._ars-row > td > ._devs', 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;flex:1 1 100%;width:100%;margin:0'),
      r(T + 'tbody tr._ars-row > td > ._devs > div',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;height:40px;padding:0;margin:0;' +
        'background:#fff;border-radius:6px;box-shadow:' + LINE_SH),
      r(T + 'tbody tr._ars-row > td > ._devs > div.off', 'opacity:.5'),
      // 342 hægrijafnar ÆTL-reitinn og gefur b/i 100% breidd — hér er allt miðjað
      r(T + 'tbody tr._ars-row > td > ._devs > div > b', 'display:block;width:auto;text-align:center;font:800 17px/1 ' + DISPLAY + ';font-variant-numeric:lining-nums;color:#11141c'),
      r(T + 'tbody tr._ars-row > td > ._devs > div > i', 'display:block;width:auto;text-align:center;font:700 8px/1 ' + MONO + ';font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:#5b6472'),
      // ÆTL á silfri, ekki málmi: 313-birtuskanninn skrifar dökkt inline-blek (!important) á merkið, sem hverfur á svörtu
      r(T + 'tbody tr._ars-row > td > ._devs > div._estcell', 'background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.18),0 2px 4px rgba(10,14,22,.16)'),
      r(T + 'tbody tr._ars-row > td > ._devs > div._estcell > b', 'font-size:14.5px'),

      // 7 · fótur — lítið merki fyrir ofan hvern takka (í töflunni sagði hausinn hvað þeir eru)
      r(T + 'tbody tr._ars-row > td:has(> ._pri-btn),' + T + 'tbody tr._ars-row > td:has(> ._go-btn),' + T + 'tbody tr._ars-row > td._arsak-cell,' + T + 'tbody tr._ars-row > td:has(> ._ars-endur)',
        'grid-row:7;flex-direction:column;justify-content:center;gap:3px;z-index:1'),
      r(T + 'tbody tr._ars-row > td:has(> ._pri-btn)::before,' + T + 'tbody tr._ars-row > td:has(> ._go-btn)::before,' + T + 'tbody tr._ars-row > td._arsak-cell::before,' + T + 'tbody tr._ars-row > td:has(> ._ars-endur)::before',
        'font:700 8px/1 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#5b6472;white-space:nowrap'),
      r(T + 'tbody tr._ars-row > td:has(> ._pri-btn)', 'grid-column:1;justify-self:start'),
      r(T + 'tbody tr._ars-row > td:has(> ._pri-btn)::before', 'content:"Forg."'),
      r(T + 'tbody tr._ars-row > td:has(> ._go-btn)', 'grid-column:2;justify-self:center'),
      r(T + 'tbody tr._ars-row > td:has(> ._go-btn)::before', 'content:"GÓ"'),
      r(T + 'tbody tr._ars-row > td._arsak-cell', 'grid-column:3;justify-self:center'),
      r(T + 'tbody tr._ars-row > td._arsak-cell::before', 'content:"Akstur"'),
      r(T + 'tbody tr._ars-row > td:has(> ._ars-endur)', 'grid-column:4;justify-self:end'),
      r(T + 'tbody tr._ars-row > td:has(> ._ars-endur)::before', 'content:"Endurh."'),

      // ── síðufóturinn (Sýni 1–50 af n · Fyrri/Næsta) sem reitur
      r('._tfoot', 'border:0;border-radius:8px;background:#fff;box-shadow:' + LINE_SH),

      // ── rofinn sjálfur (situr í 394-hlutahausnum; útlitið gildir í báðum stillingum)
      'html body #view-arsskodun #_ars-spjold-btn' + F + ',html body #view-arsskodun #_ars-mynd-btn' + F + '{display:inline-flex!important;align-items:center!important;gap:7px!important;height:34px!important;padding:0 12px!important;' +
        'border-radius:8px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;box-shadow:' + SILVER_SH + '!important;' +
        'font:700 11px/1 ' + MONO + '!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#1f2530!important;cursor:pointer!important;white-space:nowrap!important}',
      'html body #view-arsskodun #_ars-spjold-btn' + F + ':hover,html body #view-arsskodun #_ars-mynd-btn' + F + ':hover{border-color:rgba(20,24,34,.4)!important}',
      'html body #view-arsskodun #_ars-spjold-btn svg' + F + ',html body #view-arsskodun #_ars-mynd-btn svg' + F + '{width:15px!important;height:15px!important;flex:none!important}',
      // myndastillingin sést aðeins í spjaldaham
      'html:not(.ars-spjold) body #view-arsskodun #_ars-mynd-btn' + F + '{display:none!important}'
    ];
    var s = document.createElement('style');
    s.id = '_ars-spjold-css';
    s.textContent = '@media (min-width:901px){\n' + R.join('\n') + '\n}';
    document.head.appendChild(s);
  }

  // ── Myndablaðið: ein regla per stað með mynd → --spj-mynd. Lesið úr sömu heimild og bannerinn (367).
  // Supabase-myndir eru sóttar smækkaðar (render/image, 720 px) — upprunaskráin er óbreytt.
  function myndSlod(u) {
    u = String(u || '').trim();
    if (!/^https:\/\//i.test(u)) return '';
    if (u.indexOf('/storage/v1/object/public/') > -1) {
      u = u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      u += (u.indexOf('?') > -1 ? '&' : '?') + 'width=720&quality=72';
    } else if (/images\.prismic\.io/i.test(u)) {
      u += (u.indexOf('?') > -1 ? '&' : '?') + 'w=720';
    }
    return u.replace(/["\\\s]/g, encodeURIComponent);
  }
  // Fylla: cover á málmi · Heil: contain á hvítu (html.spj-heil velur hvort er notað)
  var MYND_BREYTUR = '--spj-str:cover;--spj-heil-str:contain;--spj-heil-bak:linear-gradient(#fff,#fff)';
  var _myndSig = '';
  function myndir() {
    var map = {};
    try { map = (window.AppSettings && AppSettings.path && AppSettings.path('co_bygging_mynd')) || {}; } catch (_) {}
    var listi = [];
    try { listi = (window.Arsskodun && Arsskodun._cache && Arsskodun._cache.list) || []; } catch (_) {}
    var reglur = [], sed = {};
    Object.keys(map).forEach(function (id) {
      // slóðin ræður: handvalin mynd ofan á eldri „engin mynd"-færslu ber enn engin:true (deep-merge, 367)
      var m = map[id], u = m && m.url ? myndSlod(m.url) : '';
      if (u && /^\d+$/.test(id)) { sed[id] = 1; reglur.push('#view-arsskodun tr._ars-row[data-co-id="' + id + '"]{--spj-mynd:url("' + u + '");' + MYND_BREYTUR + '}'); }
    });
    listi.forEach(function (c) {
      if (!c || sed[c.id] || !c.eign || !c.eign.mynd) return;
      var u = myndSlod(c.eign.mynd);
      if (u) reglur.push('#view-arsskodun tr._ars-row[data-co-id="' + (+c.id) + '"]{--spj-mynd:url("' + u + '");' + MYND_BREYTUR + '}');
    });
    var texti = reglur.join('\n');
    var sig = reglur.length + ':' + texti.length;
    if (sig === _myndSig) return;
    _myndSig = sig;
    var st = document.getElementById('_ars-spjold-myndir');
    if (!st) { st = document.createElement('style'); st.id = '_ars-spjold-myndir'; document.head.appendChild(st); }
    st.textContent = texti;
  }

  function setja(on) {
    document.documentElement.classList.toggle('ars-spjold', on);
    if (on) myndir();
    takki();
  }

  var IC_SPJOLD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>';
  var LYKILL_HEIL = 'spj_mynd_heil_v1';
  function lesaHeil() { try { return localStorage.getItem(LYKILL_HEIL) !== '0'; } catch (_) { return true; } }
  function setjaHeil(on) {
    try { localStorage.setItem(LYKILL_HEIL, on ? '1' : '0'); } catch (_) {}
    document.documentElement.classList.toggle('spj-heil', on);
    takki();
  }
  var IC_HEIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="7.5" y="8.5" width="9" height="7" rx="1"/></svg>';
  var IC_FYLLA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/></svg>';
  var IC_LISTI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>';

  // Rofinn í hlutahausnum. 394 smíðar .arsm-sec upp á nýtt þegar sýnin breytist og fjarlægir gamla hausinn —
  // þá er rofinn settur aftur inn (aðeins þegar hann vantar; vaktin hunsar eigið verk).
  function takki() {
    var verkf = document.querySelector('#view-arsskodun .arsm-sec .arsm-verkf');
    if (!verkf) return;
    var b = document.getElementById('_ars-spjold-btn');
    if (!b || b.parentElement !== verkf) {
      if (b) b.remove();
      b = document.createElement('button');
      b.id = '_ars-spjold-btn';
      b.type = 'button';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setja(!document.documentElement.classList.contains('ars-spjold')); });
      verkf.appendChild(b);
    }
    var on = document.documentElement.classList.contains('ars-spjold');
    var html = on ? IC_LISTI + '<span>Listi</span>' : IC_SPJOLD + '<span>Spjöld</span>';
    if (b.innerHTML !== html) b.innerHTML = html;
    var t = on ? 'Sýna staðina sem töflu' : 'Sýna staðina sem spjöld — sömu upplýsingar og taflan';
    if (b.title !== t) b.title = t;
    // Myndastillingin, strax á eftir spjaldarofanum (falin í listaham)
    var mb = document.getElementById('_ars-mynd-btn');
    if (!mb || mb.parentElement !== verkf || mb.previousElementSibling !== b) {
      if (mb) mb.remove();
      mb = document.createElement('button');
      mb.id = '_ars-mynd-btn';
      mb.type = 'button';
      mb.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setjaHeil(!document.documentElement.classList.contains('spj-heil')); });
      b.insertAdjacentElement('afterend', mb);
    }
    var heil = document.documentElement.classList.contains('spj-heil');
    var mh = heil ? IC_FYLLA + '<span>Fylla ramma</span>' : IC_HEIL + '<span>Heil mynd</span>';
    if (mb.innerHTML !== mh) mb.innerHTML = mh;
    var mt = heil ? 'Myndirnar fylla rammann (skornar til)' : 'Sýna alla myndina — hvítt fyllir upp í rammann';
    if (mb.title !== mt) mb.title = mt;
  }

  function vakta() {
    var v = document.getElementById('view-arsskodun');
    if (!v) { setTimeout(vakta, 600); return; }
    takki();
    new MutationObserver(function () {
      var verkf = v.querySelector('.arsm-sec .arsm-verkf');
      if (verkf && (!verkf.querySelector('#_ars-spjold-btn') || !verkf.querySelector('#_ars-mynd-btn'))) takki();
    }).observe(v, { childList: true, subtree: true });
  }

  // Myndaslóðin er líka notuð af spjöldum skoðunarsíðnanna (458)
  window.SpjaldMynd = { slod: myndSlod };

  css();
  document.documentElement.classList.toggle('spj-heil', lesaHeil());
  document.addEventListener('ars:render', function () { try { takki(); myndir(); } catch (_) {} });
  // Ný mynd á fyrirtækjasíðunni (367) eða af annarri vél → myndablaðið endurreiknað strax
  try { if (window.AppSettings && typeof AppSettings.onChange === 'function') AppSettings.onChange(function () { try { myndir(); } catch (_) {} }); } catch (_) {}
  // AppSettings getur borist eftir fyrstu teikningu — myndablaðið er endurreiknað (aðeins ef eitthvað breyttist)
  [1500, 5000, 15000].forEach(function (t) { setTimeout(function () { try { myndir(); } catch (_) {} }, t); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();
})();
