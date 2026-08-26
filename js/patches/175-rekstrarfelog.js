/* === REKSTRARFÉLÖG v1 ===
 * Adds a "Rekstrarfélög" nav tab (after Allir Viðskiptavinir) + a view that lists
 * management/parent companies that operate many buildings/húsfélög.
 *
 * - Data lives in AppSettings.rekstrarfelog (shared, server-backed, editable).
 *   Seeds once from the email-mined defaults if empty.
 * - Per firm: billing emails, building list (with kennitölur), doc counts.
 * - Each building links to its company record via Companies.openDetail(id).
 *   Live rows carry fyrirtaeki.id as co_id — one kennitala may own many
 *   independent sites (Heimaleiga, Center Hótel). NEVER match/merge by kt.
 * - Attach / view documents per firm using window.CompanyAttachments,
 *   keyed to a synthetic firm id, plus quick links to each building's own
 *   attachments.
 * Self-contained add-on — does not edit any core file.
 */
(function(){
  'use strict';
  if (window.__rekstrarfelogInstalled) return;
  window.__rekstrarfelogInstalled = true;

  var SEED = {"Eignaumsjón": {"domain": "eignaumsjon.is", "emails": ["gjaldkeri@eignaumsjon.is", "reikningar@eignaumsjon.is", "solrun@eignaumsjon.is"], "buildings": [{"kt": "5007070110", "nafn": "17.júní Torg 1-7, húsfélag"}, {"kt": "6407891239", "nafn": "Aflagrandi 40,húsfélag"}, {"kt": "5010891769", "nafn": "Bílskýli Dalseli 6-22"}, {"kt": "4410872769", "nafn": "Bólstaðarhlíð 40,húsfélag"}, {"kt": "4309901019", "nafn": "Dofraberg 11, húsfélag"}, {"kt": "4902120190", "nafn": "Flétturimi 10-16,húsfélag"}, {"kt": "6104932389", "nafn": "Flétturimi 16,húsfélag"}, {"kt": "6611191520", "nafn": "Hverfisgata 40, húsfélag"}, {"kt": "4702891989", "nafn": "Húsfélagið Skipholti 50b"}, {"kt": "6105140300", "nafn": "Kirkjulundur 12-14, húsfélag"}, {"kt": "4404023480", "nafn": "Kórsalir 3,húsfélag"}, {"kt": "5612090570", "nafn": "Maltakur 3,húsfélag"}, {"kt": "5009760129", "nafn": "Seljabraut 42, húsfélag"}, {"kt": "6811780159", "nafn": "Skaftahlíð 4-10,húsfélag"}, {"kt": "4406992869", "nafn": "Stigahlíð 26, húsfélag"}, {"kt": "5203240700", "nafn": "Suðurhraun 10, rekstrarfélag"}, {"kt": "4802962579", "nafn": "Sóleyjarhlíð 1, húsfélag"}, {"kt": "5204190120", "nafn": "Tangabryggja 13-15, húsfélag"}, {"kt": "6009740179", "nafn": "Tjarnarból 2, húsfélag"}, {"kt": "5710872199", "nafn": "Tjarnarból 6,húsfélag"}, {"kt": "4810741349", "nafn": "Torfufell 50, húsfélag"}, {"kt": "5606171190", "nafn": "Tungusel 1-7, húsfélag"}, {"kt": "4210081240", "nafn": "Álfaskeið 78-80, húsfélag"}, {"kt": "4409003210", "nafn": "Álfholt 2a,b,c,húsfélag"}, {"kt": "6201850439", "nafn": "Álftamýri 24-30, húsfélag"}, {"kt": "5303911089", "nafn": "Ásholt 2,húsfélag"}], "drive": "https://drive.google.com/drive/folders/15XSiBnb18k8DBFO60uGl2F6RrHWyV6B7"}, "Rekstrarumsjón": {"domain": "rekstrarumsjon.is", "emails": ["reikningar@rekstrarumsjon.is", "umsjon@rekstrarumsjon.is"], "buildings": [{"kt": "5903043440", "nafn": "Burknavellir 5, húsfélag"}, {"kt": "4309901019", "nafn": "Dofraberg 11, húsfélag"}, {"kt": "6706061980", "nafn": "Eskivellir 1, húsfélag"}, {"kt": "5312050490", "nafn": "Eskivellir 5,húsfélag"}, {"kt": "4802962579", "nafn": "Sóleyjarhlíð 1, húsfélag"}, {"kt": "4710023050", "nafn": "Álfaskeið 82-84,húsfélag"}, {"kt": "5311750859", "nafn": "Álfaskeið 98-100, húsfélag"}, {"kt": "4704868139", "nafn": "Álftahólar 4, húsfélag"}], "drive": "https://drive.google.com/drive/folders/1jswqJR8d7Veq2OBvGTmjkowlItoEgnoi"}, "Eignarekstur": {"domain": "eignarekstur.is", "emails": ["eignarekstur@eignarekstur.is", "reikningar@eignarekstur.is"], "buildings": [{"kt": "4804867309", "nafn": "Furugrund 73,húsfélag"}, {"kt": "6301032310", "nafn": "Húsfélagið Bæjarlind 12"}, {"kt": "5208190290", "nafn": "Árskógar 1-3, húsfélag"}, {"kt": "5102932079", "nafn": "Árskógar 6-8,húsfélag"}, {"kt": "6009911169", "nafn": "Þverholt 24,húsfélag"}], "drive": "https://drive.google.com/drive/folders/1OAbAZIc_ImXUp9Dlq7Y2qZkz3Mr9UML-"}, "Heimaleiga": {"domain": "heimaleiga.is", "emails": ["dimka@heimaleiga.is", "erna@heimaleiga.is"], "buildings": [{"kt": "6810130830", "nafn": "Aegina ehf."}, {"kt": "6502220400", "nafn": "EA Law Practice ehf."}, {"kt": "6110962599", "nafn": "Húsfélagið Laugavegi 42"}, {"kt": "6411150100", "nafn": "S&H Invest ehf."}], "drive": "https://drive.google.com/drive/folders/1CZehyhNFnIcO5KaXgKqE5BJRh8Q-FjVx"}, "Fjöleignir": {"domain": "fjoleignir.is", "emails": ["fjoleignir@fjoleignir.is"], "buildings": [{"kt": "5605952559", "nafn": "Gullsmári 11,húsfélag"}, {"kt": "4511901569", "nafn": "Háaleitisbraut 54,húsfélag"}, {"kt": "4701912019", "nafn": "Þúfubarð 19,húsfélag"}], "drive": "https://drive.google.com/drive/folders/1vvOogg-JhQG6BgbMf6vBW8zdkZMe2UAi"}, "Leiguval": {"domain": "leiguval.is", "emails": ["stefan@leiguval.is"], "buildings": [], "drive": "https://drive.google.com/drive/folders/12sTb775IuxDYSkZD76Yz4tDeXVP0ha9T"}};

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmtKt(k){ if(!k) return ''; var c=String(k).replace(/\D/g,''); return c.length>=10? c.slice(0,6)+'-'+c.slice(6,10):c; }
  function digits(s){ return String(s||'').replace(/\D/g,''); }

  // ── SAMHLIÐA blaðsíðu-sókn (2026-07-30, Agnar: „load time … takes forever") ──
  // Supabase skilar í mesta lagi 1000 röðum per kall, svo stórar töflur þurfa
  // margar sóknir. Áður voru þær RAÐBUNDNAR (while-lykkja sem beið eftir hverri
  // síðu): uttaeki er 5.843 raðir = 6 sóknir, og ein sókn mælist ~0,6 s → ~3,8 s
  // í BIÐ fyrir eina töflu. Öll síðan gerði ~14 raðbundnar sóknir ≈ 8-12 s.
  //
  // Hér er fyrsta síðan sótt með `count:'exact'` (þá vitum við heildina strax) og
  // ALLAR eftirstandandi síður sóttar SAMHLIÐA. Þar með kostar taflan EINA
  // umferðartíð í stað N. Skilar nákvæmlega sömu röðum og lykkjan gerði.
  async function fetchAllRows(SB, table, cols, tweak){
    var PAGE = 1000;
    try {
      var q = SB.from(table).select(cols, { count: 'exact' });
      if (tweak) q = tweak(q);
      var first = await q.range(0, PAGE - 1);
      if (first.error) {
        console.warn('[rekstrarfelog] fetchAllRows', table, first.error);
        return [];
      }
      var rows = (first.data || []).slice();
      var total = (typeof first.count === 'number') ? first.count : rows.length;
      if (rows.length < PAGE || total <= PAGE) return rows;
      var offs = [];
      for (var off = PAGE; off < total && off <= 40000; off += PAGE) offs.push(off);
      var rest = await Promise.all(offs.map(function(o){
        var q2 = SB.from(table).select(cols);
        if (tweak) q2 = tweak(q2);
        return q2.range(o, o + PAGE - 1).then(function(r){ return r.data || []; })
                 .catch(function(){ return []; });
      }));
      rest.forEach(function(a){ rows = rows.concat(a); });
      return rows;
    } catch (e) { console.warn('[rekstrarfelog] fetchAllRows', table, e); return []; }
  }
  // PostgREST `.in()` fer í query-strenginn — of langur listi → 414 / tóm
  // niðurstaða og staðir detta út (Heimaleiga sást þá AÐEINS úr curated-blob).
  // 80 id per kall er öruggt; síður sóttar með fetchAllRows.
  async function fetchAllIn(SB, table, cols, column, ids, extraTweak){
    var CHUNK = 80, out = [];
    if (!ids || !ids.length) return out;
    for (var i = 0; i < ids.length; i += CHUNK) {
      var slice = ids.slice(i, i + CHUNK);
      var rows = await fetchAllRows(SB, table, cols, function(q){
        q = q.in(column, slice);
        return extraTweak ? extraTweak(q) : q;
      });
      out = out.concat(rows);
    }
    return out;
  }

  // ---- inline SVG icons (Lucide-style) + scoped styles for the redesigned cards ----
  // 2026-06-19: cleaner master cards (icon avatar + email chips + building count)
  // + a tidier detail table. Colours come from var(--brand) so the active theme
  // (ember by default, or the user's custom accent) is respected — nothing hardcoded.
  var SVG = {
    building:'<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9h.01M9 12h.01M9 15h.01M9 18h.01"/></svg>',
    layers:'<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>',
    mail:'<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
    globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>',
    hash:'<svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
    phone:'<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    user:'<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    chev:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'
  };
  // 2026-07-15: full re-skin to the Claude Design v3 accordion comp
  // (css/theme-handoff/rekstrarfelog-v3/). All rules scoped under
  // #view-rekstrarfelog — theme.css is intentionally NOT loaded globally
  // (its .btn/.pill/.chip names collide with the app), so the needed
  // classes are inlined here with an rf-/rfa- prefix.
  function injectStyles(){
    if(document.getElementById('_rf-styles-v5')) return;
    ['_rf-styles','_rf-styles-v3','_rf-styles-v4'].forEach(function(id){ var o=document.getElementById(id); if(o) o.remove(); });
    var s=document.createElement('style'); s.id='_rf-styles-v5';
    var P='#view-rekstrarfelog ';
    var METB='linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318)';
    var HERO='linear-gradient(110deg,#0c1018 0%,#13203f 45%,#274a9e 100%)';
    s.textContent=[
      "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');",
      // page band: dark → grey gradient, the view itself
      '#view-rekstrarfelog{padding:0!important;background:linear-gradient(180deg,#060607 0,#060607 95px,#aeb4be 360px,#9ba1ad 100%)!important;overflow-x:hidden;max-width:100%}',
      // 2026-08-06 (ósk Agnars: "adjust the width so everything is in the same
      // wide" — borðið/status-kassarnir litu mjórri út en restin af síðunni af
      // því 1560px hámarkið var mun þrengra en breidd skjásins leyfði). Ekkert
      // hámark lengur — síðan fyllir sömu breidd og restin af skelinni, sama
      // padding hvorum megin og áður.
      P+'.rf-page{max-width:none;margin:0 auto;padding:20px 24px 60px;font-family:"Space Grotesk",system-ui,-apple-system,sans-serif}',
      // header
      P+'.rf-phead{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}',
      P+'.rf-ptitle{margin:0;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.15}',
      P+'.rf-psub{margin:2px 0 0;font-family:"Space Mono",monospace;font-size:12.5px;color:rgba(255,255,255,.55)}',
      P+'.rf-search{margin-left:auto;position:relative;width:260px;display:flex;align-items:center;height:42px;padding:0 14px;border-radius:12px;background:#fff;box-shadow:0 8px 20px -14px rgba(0,0,0,.5)}',
      P+'.rf-search svg{margin-right:9px;flex:none}',
      P+'.rf-search input{flex:1;min-width:0;border:0;background:transparent;font-family:inherit;font-size:13.5px;color:#141822;outline:none;padding:0}',
      // dark-metal buttons
      P+'.rf-btn{height:38px;padding:0 16px;border-radius:10px;border:1px solid #0a0b0d;background:'+METB+';color:#fff;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:7px;text-decoration:none;white-space:nowrap}',
      P+'.rf-btn:hover{filter:brightness(1.18)}',
      P+'.rf-btn.is-on{border-color:#4a6ae8;box-shadow:0 0 0 1px #4a6ae8,inset 0 1px 0 rgba(255,255,255,.12)}',
      // pills (dark metal)
      P+'.rf-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#fff;padding:4px 11px;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 4px -2px rgba(0,0,0,.4);text-shadow:0 1px 1px rgba(0,0,0,.3);white-space:nowrap}',
      P+'.rf-pill--ghost{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:5px 13px;font-size:12.5px;box-shadow:none;text-shadow:none}',
      P+'.rf-pill--done{background:linear-gradient(145deg,#2f9d63,#0f6e3a 60%,#062815);border:1px solid #062815;font-size:11.5px}',
      P+'.rf-pill--pending{background:linear-gradient(145deg,#d4a94f,#8a5310 60%,#3f2905);border:1px solid #3f2905;font-size:11.5px}',
      P+'.rf-pill--overdue{background:linear-gradient(145deg,#e2555f,#a01820 60%,#5a0c10);border:1px solid #4a0a0e;font-weight:700}',
      P+'.rf-pill--bru{background:linear-gradient(145deg,#8a1c22,#560c10 55%,#1a0304);border:1px solid #1a0304;font-weight:700}',
      // accordion card
      P+'.rf-acclist{display:flex;flex-direction:column;gap:14px}',
      P+'.rfa{border-radius:18px;overflow:hidden;box-shadow:0 16px 40px -22px rgba(10,20,50,.65);transition:box-shadow .18s ease}',
      P+'.rfa__head{width:100%;border:0;cursor:pointer;text-align:left;display:flex;align-items:center;gap:16px;padding:18px 22px;background:'+HERO+';font-family:inherit}',
      P+'.rfa__logo{width:48px;height:48px;flex:none;border-radius:13px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;color:#fff}',
      P+'.rfa__logo svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
      P+'.rfa__id{flex:1;min-width:0;display:flex;flex-direction:column}',
      P+'.rfa__name{font-size:19px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rfa__sub{font-family:"Space Mono",monospace;font-size:12px;color:rgba(255,255,255,.6);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rfa__pills{display:flex;align-items:center;gap:9px;flex:none}',
      P+'.rfa__chev{width:32px;height:32px;flex:none;border-radius:9px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;transition:transform .28s ease}',
      P+'.rfa.is-open .rfa__chev{transform:rotate(180deg)}',
      P+'.rfa{max-width:100%}',
      P+'.rfa__body{max-height:0;opacity:0;overflow:hidden;background:#fff;transition:opacity .24s ease}',
      // 2026-08-26: 6000px klippti neðstu Heimaleiga-húsin (háar Sími-raðir).
      // Ekkert þak — rfa overflow:hidden heldur töflunni innan síðunnar.
      P+'.rfa.is-open .rfa__body{max-height:none;opacity:1}',
      P+'.rfa__pad{padding:16px 18px}',
      P+'.rf-chiprow{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}',
      // Gullkassi — áætlaðar árs-tekjur (yfirferð + hleðsla), stillanlegur.
      P+'.rf-gold{margin-left:auto;position:relative;cursor:pointer;min-width:186px;border-radius:12px;padding:7px 14px;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border:1px solid rgba(255,220,130,.45);box-shadow:0 6px 16px -8px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,240,190,.28);color:#fff8e6}',
      P+'.rf-gold__l{font-size:9.5px;font-weight:800;letter-spacing:.05em;color:#ffe9a8}',
      P+'.rf-gold__v{font-size:20px;font-weight:800;line-height:1.05;margin-top:1px;color:#fff}',
      P+'.rf-gold__s{font-size:10px;color:#f4e2ac;margin-top:3px}',
      P+'.rf-gold__ed{position:absolute;top:100%;right:0;z-index:30;margin-top:6px;width:220px;background:#141821;border:1px solid #3a4150;border-radius:10px;padding:11px 12px;box-shadow:0 14px 34px -8px rgba(0,0,0,.7);cursor:default;text-align:left}',
      P+'.rf-gold__ed label{display:block;font-size:11px;color:#aeb6c6;margin-bottom:8px;font-weight:600}',
      P+'.rf-gold__ed input{width:100%;box-sizing:border-box;margin-top:3px;padding:6px 8px;border:1px solid #3a4150;border-radius:7px;background:#0e1219;color:#fff;font:inherit;font-size:13px}',
      P+'.rf-gold__ed button{width:100%;margin-top:2px;padding:7px;border:0;border-radius:7px;background:linear-gradient(150deg,#c99a1e,#8a6410);color:#fff;font:inherit;font-weight:700;font-size:13px;cursor:pointer}',
      // buildings table (dark-metal head, zebra, rails)
      P+'.rf-tblwrap{border-radius:13px;border:1px solid rgba(20,24,34,.1);overflow:hidden;background:#fff;max-width:100%}',
      P+'.rf-tblscroll{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}',
      // table-layout:fixed + <colgroup> (2026-08-20) — eins og listi Fyrirtækja í
      // þjónustu (153). Fastar súlubreiddir gera raðirnar jafnar og láta löng
      // byggingaheiti stytta sig með „…" í stað þess að vefjast í 2-3 línur (það
      // var stærsti hæðargjafinn í nýju útliti). Breiddirnar búa í <colgroup> við
      // töfluna sjálfa.
      P+'.rf-tbl{width:100%;min-width:1160px;border-collapse:collapse;font-size:13px;table-layout:fixed}',
      P+'.rf-tbl thead tr{background:'+METB+'}',
      P+'.rf-tbl th{text-align:left;padding:10px 12px;font-size:10.5px;font-weight:700;letter-spacing:.08em;color:#f0f2f5;white-space:nowrap;text-transform:uppercase;border:0}',
      P+'.rf-tbl th.c{text-align:center}',
      P+'.rf-tbl tbody tr{transition:background .12s ease;background:#fff}',
      P+'.rf-tbl tbody tr:nth-child(even){background:#fbfcfe}',
      P+'.rf-tbl tbody tr:hover{background:#f3f6fc}',
      P+'.rf-tbl tbody tr:hover .rf-rail{background:#2f5fe0}',
      // 2026-08-06 (ósk Agnars: "tighten the view, adaptable row height" —
      // sjá rf-stack/rf-cnt/rf-ycell fyrir neðan): grunn-padding lækkað úr
      // 11px í 7px svo raðir sem AÐEINS eru í slökkvitækjaþjónustu (ein lína í
      // rf-stack, sjá stackTd/bHasData) verði greinilega lægri en raðir sem
      // eru líka í brunakerfisþjónustu (tvær línur) — sami háttur og áður,
      // bara þéttari svo munurinn sjáist.
      P+'.rf-tbl td{padding:4px 12px;border:0}',
      P+'.rf-tbl td.c{text-align:center}',
      P+'.rf-cellname{position:relative;padding-left:16px!important;display:flex;align-items:center;gap:4px;min-height:44px}',
      P+'.rf-nameid{min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center}',
      P+'.rf-rail{position:absolute;left:0;top:6px;bottom:6px;width:4px;border-radius:3px;background:#dbe0e9}',
      P+'.rf-rail--done{background:#1f9d57}',
      P+'.rf-rail--overdue{background:#e23232}',
      P+'.rf-rail--none{background:#dbe0e9}',
      // Brunastál density (153 .data-table): one-line name + kt, ellipsis, title
      // holds the full string. Wrapping (PR 701) made Heimaleiga rows ~3× too tall.
      P+'.rf-bname{display:block;font-size:13px;font-weight:600;color:#11141c;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rf-bname a{color:#11141c;text-decoration:none;font-weight:600}',
      P+'.rf-boldlinks{display:block;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rf-bname a:hover{color:#2f5fe0}',
      // 2026-08-20 (ósk Agnars „more compact / decrease row height / not all over
      // the place"): kt undir nafni (eins og ._kt í 153), heimilisfang OG nóta
      // hvort í SÍNUM dálki — svo þau bæti ekki hæð/línubroti á nafnfrumuna eins
      // og þegar þau sátu öll þrjú stöfluð þar inni. Sami þéttleiki og listi
      // Fyrirtækja í þjónustu (153 .data-table: td 7px/44px · ._co 13 / ._kt 10).
      P+'.rf-bkt{display:block;font-family:"Space Mono",monospace;font-size:10px;color:#9098a6;letter-spacing:.02em;line-height:1.3;white-space:nowrap}',
      P+'.rf-bmeta{display:flex;flex-wrap:nowrap;gap:4px 8px;margin-top:1px;align-items:baseline;overflow:hidden}',
      P+'.rf-bnr{font-family:"Space Mono",monospace;font-size:10px;color:#5b6475;font-weight:700}',
      P+'.rf-bpd{font-family:"Space Mono",monospace;font-size:10px;color:#1d4ed8;font-weight:600;white-space:nowrap}',
      P+'.rf-bpd.is-paid{color:#15803d}',
      P+'.rf-baddr{display:block;font-size:12px;color:#5b6472;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rf-baddr--empty{color:#c3c9d3}',
      // Nóta-dálkur — ferðanótan (fyrirtaeki.plan_note), sami reitur og ._note í 153.
      P+'.rf-plannote{display:block;width:100%;min-width:120px;height:24px;border:1px solid transparent;border-radius:7px;background:transparent;color:#3a4250;font:inherit;font-size:11.5px;padding:0 8px;box-sizing:border-box;outline:none;transition:background .12s,border-color .12s}',
      P+'.rf-plannote::placeholder{color:#c7ccd6}',
      P+'.rf-plannote:hover{border-color:#e6e9ef;background:#fbfcfd}',
      P+'.rf-plannote:focus{border-color:#2f5fe0;background:#fff;color:#0f172a}',
      // auðkennis-dálkarnir tveir (heimilisfang/nóta) mega EKKI hverfa við
      // samanþjöppun (ólíkt gagna-dálkunum sem is-collapsed felur) — miðjað lóðrétt.
      P+'.rf-tbl td.rf-addrcell,'+P+'.rf-tbl td.rf-notacell{vertical-align:middle}',
      // ── per-building collapse (2026-08-05, leiðrétt sama dag — sjálfgefið
      // samanþjappað gerði 2023-2026 dálkana að tómum í fljótu bragði, sem leit
      // út eins og gögnin hyrfu): SJÁLFGEFIÐ ÚTVÍKKAÐ (öll smáatriði sýnileg,
      // nákvæmlega eins og áður) — ▸-takki (eða „Fela allar") felur niður í EINA
      // samantektarfrumu (rf-bldsum-cell) fyrir þann sem VILL þjappa saman.
      P+'.rf-bldtoggle{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;min-width:18px;min-height:28px;text-align:center;color:#9098a6;font-size:11px;margin-right:0;transition:transform .12s ease}',
      P+'.rf-bldtoggle:hover{color:#2f5fe0}',
      P+'.rf-bldrow:not(.is-collapsed) .rf-bldtoggle{transform:rotate(90deg)}',
      P+'.rf-bldsum-cell{display:none;color:#5b6472;font-size:12.5px;white-space:nowrap}',
      P+'.rf-bldrow.is-collapsed .rf-bldsum-cell{display:table-cell}',
      P+'.rf-bldrow.is-collapsed>td.rf-cnt-cell,'+P+'.rf-bldrow.is-collapsed>td.rf-yh-cell,'+P+'.rf-bldrow.is-collapsed>td._rf_akcell,'+P+'.rf-bldrow.is-collapsed>td.rf-nextcell,'+P+'.rf-bldrow.is-collapsed>td.rf-actionscell{display:none}',
      P+'.rf-sum-chip{display:inline-block;font-family:"Space Mono",monospace;font-weight:700;margin-right:8px}',
      P+'.rf-sum-chip.is-zero{color:#cbd2dc}',
      P+'.rf-sum-next{display:inline-block;color:#5b6472}',
      P+'.rf-sum-next.is-over{color:#c0241f;font-weight:700}',
      P+'.rf-sum-none{color:#cbd2dc;font-style:italic}',
      P+'.rf-mono{font-family:"Space Mono",monospace;font-size:12px;color:#5b6472;white-space:nowrap}',
      P+'.rf-taeki{font-family:"Space Mono",monospace;font-size:13px;font-weight:700;color:#11141c}',
      P+'.rf-taeki.is-zero{color:#cbd2dc}',
      // year status pills
      P+'.rf-ycell{display:inline-flex;align-items:center;gap:4px;font-family:"Space Mono",monospace;font-size:11.5px;font-weight:700;color:#fff;border-radius:6px;padding:1px 7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 4px -2px rgba(0,0,0,.4);text-shadow:0 1px 1px rgba(0,0,0,.3)}',
      P+'.rf-ycell{white-space:nowrap}',
      P+'.rf-ycell i{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}',
      P+'.rf-ycell a{color:inherit;text-decoration:none;white-space:nowrap}',
      P+'.rf-ycell--done{background:linear-gradient(145deg,#2f9d63,#0f6e3a 60%,#062815);border:1px solid #062815}',
      P+'.rf-ycell--done i{background:#4fd08a}',
      P+'.rf-ycell--hist{background:linear-gradient(145deg,#3a6ae8,#1c3d8c 60%,#0a1a3a);border:1px solid #0a1a3a}',
      P+'.rf-ycell--hist i{background:#8fb0ff}',
      P+'.rf-ycell--todo{background:linear-gradient(145deg,#3a3e46,#23262d 60%,#111318);border:1px solid #0a0b0d}',
      P+'.rf-ycell--todo i{background:#cdd4de}',
      // 2026-08-06 (ósk Agnars): árs-dálkur þessa árs sýndi bara „·" áður en
      // skýrslan var komin — engin leið að sjá hvort staðurinn er á áætlun eða
      // dottinn af. Sömu lit-kvarðar og efstu samantektarpillurnar (rf-pill--
      // pending/--overdue): gult = vantar enn en ekki liðið, rautt = liðið.
      P+'.rf-ycell--due{background:linear-gradient(145deg,#d4a94f,#8a5310 60%,#3f2905);border:1px solid #3f2905}',
      P+'.rf-ycell--due i{background:#f3cf85}',
      P+'.rf-ycell--overdue{background:linear-gradient(145deg,#e2555f,#a01820 60%,#5a0c10);border:1px solid #5a0c10}',
      P+'.rf-ycell--overdue i{background:#ffb3b8}',
      P+'.rf-ycell--none{color:#cbd2dc;background:none;box-shadow:none;text-shadow:none;font-weight:400;border:0}',
      // ── compact ártala-strimill (2026-08-21, ósk Agnars: „same as fyrirtæki í
      // þjónustu") — í stað fjögurra breiðra árs-dálka: EINN dálkur með láréttum
      // strimli af litlum ártölu-pillum (34×20). Litur pillunnar ber stöðuna:
      // grænt=skýrsla á skrá · blátt=aðeins búnaðarsaga · gull=þetta ár á áætlun
      // (ókomið) · rautt=liðið án skýrslu · grátt=ekkert. Ósk Agnars 2026-08-22:
      // TVEIR örpunktar undir hverri pillu eins og í Ársskoðun (grænn=skýrsla á
      // skrá, blár=reikningur paraður) — sjá .rf-dd og _yrDot neðar.
      // FÖST súlu-jöfnun (ósk Agnars „straight line downward, not zic zac"): hver
      // pilla situr í jafn-breiðri (38px) frumu og 🧯/🚨-táknið í fastri 15px súlu
      // á HVERRI röð, svo árin 23/24/25/26 mynda beinar lóðréttar línur niður alla
      // töfluna. 🧾-merkið er absolute í horninu svo það ýti EKKI pillunum til.
      P+'.rf-yrs{display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:nowrap;white-space:nowrap}',
      P+'.rf-yrs+.rf-yrs{margin-top:5px}',
      // FASTAR breiddir með !important — patch 245 (Brunastál-skin) málar .view a
      // með padding svo hlekk-pillur (ár með skýrslu) urðu breiðari en span-pillur
      // og súlurnar ráku í sundur. Föst 34px pilla + 38px fruma + 15px tákn á
      // öllum → nákvæmlega jafnar súlur.
      P+'.rf-yrs__ic{width:15px!important;flex:none!important;text-align:center;font-size:11px;line-height:20px;margin:0!important;padding:0!important}',
      // .rf-dd = föst 38px súlu-fruma; pillan efst og TVEIR örpunktar undir (eins
      // og ._dd í Ársskoðun/153). Punktarnir 5px miðjaðir → breidd frumunnar
      // breytist ekki og árin standa áfram í beinum lóðréttum súlum.
      P+'.rf-dd{position:relative;width:38px!important;flex:none!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin:0!important;padding:0!important}',
      P+'.rf-dd>u{display:flex;gap:3px;text-decoration:none;line-height:0}',
      P+'.rf-dd>u>i{width:5px;height:5px;border-radius:50%;background:#dfe3ea;flex:none}',
      P+'.rf-dd>u>i.rep{background:#1f9d57}',
      P+'.rf-dd>u>i.inv{background:#2f5fe0}',
      P+'.rf-dd .rf-bundle-tag{position:absolute;top:-5px;right:-1px;margin:0;font-size:8px;line-height:1;pointer-events:none}',
      P+'.rf-yr{display:inline-flex!important;align-items:center;justify-content:center;width:34px!important;min-width:34px!important;max-width:34px!important;height:20px!important;padding:0!important;margin:0!important;border-radius:6px;font-family:"Space Mono",monospace;font-size:11px;font-weight:700;color:#aab3c0;background:#f4f6f9;border:1px solid #e7eaf0;text-decoration:none;cursor:default;box-sizing:border-box}',
      P+'a.rf-yr{cursor:pointer}',
      P+'.rf-yr--none{color:#c3c9d3!important;background:#f7f8fa!important;border-color:#eef0f4!important}',
      P+'.rf-yr--hist{color:#fff!important;background:linear-gradient(145deg,#5a86e0,#2f5fe0 42%,#1a3a8c 72%,#2d55c4)!important;border-color:#12296b!important;text-shadow:0 1px 1px rgba(0,0,0,.3)}',
      P+'.rf-yr--done{color:#fff!important;background:linear-gradient(145deg,#1c7a45,#0f4f2b 42%,#062815 72%,#0c3f22)!important;border-color:#041c0e!important;text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      P+'.rf-yr--due{color:#fff8e6!important;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08)!important;border-color:rgba(255,220,130,.45)!important;text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      P+'.rf-yr--overdue{color:#fff!important;background:linear-gradient(145deg,#d84f4a,#b0201b 42%,#6e100d 72%,#9c1d18)!important;border-color:#4d0a08!important;text-shadow:0 1px 1px rgba(0,0,0,.26)}',
      P+'.rf-yrs a.rf-yr{text-decoration:none!important;box-shadow:none!important}',
      // 🧾 örlítið merki: reikningur ÞESSA árs/þjónustu er þegar paraður við skýrsluna.
      P+'.rf-bundle-tag{font-size:8.5px;margin-left:1px;line-height:1;filter:drop-shadow(0 1px 0 rgba(0,0,0,.4))}',
      // næsta skoðun
      P+'.rf-next{font-family:"Space Mono",monospace;font-size:12.5px;white-space:nowrap}',
      P+'.rf-next--ok{color:#3a4250}',
      P+'.rf-next--overdue{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:#fff;background:linear-gradient(145deg,#e2555f,#a01820 60%,#5a0c10);border:1px solid #4a0a0e;border-radius:7px;padding:2px 9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 4px -2px rgba(0,0,0,.4);text-shadow:0 1px 1px rgba(0,0,0,.3)}',
      P+'.rf-next--none{color:#cbd2dc}',
      // note input inside the white body
      P+'._rf_note{display:block;width:100%;padding:7px 10px;border:1px solid rgba(20,24,34,.14);border-radius:8px;font:inherit;font-size:12.5px;background:#fff;box-sizing:border-box;margin-bottom:12px;color:#141822}',
      // ── BRUNAKERFI Í SAMA YFIRLITI (2026-07-27, Claude Design „Brunayfirlit-v2") ──
      // Þjónusturofi (Bæði / 🧯 Slökkvitæki / 🚨 Brunakerfi), tölfluspjöld og
      // tvískiptar frumur — efri lína = slökkvitæki, neðri = brunakerfi.
      P+'.rf-svcbar{border-radius:13px;border:1px solid rgba(20,24,34,.25);background:linear-gradient(180deg,#d6dbe4,#c2c9d5);box-shadow:inset 0 2px 6px rgba(20,30,60,.22),inset 0 -1px 0 rgba(255,255,255,.75);padding:12px 14px;margin-bottom:12px}',
      P+'.rf-svcrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      P+'.rf-svclab{font-size:11px;font-weight:700;letter-spacing:.1em;color:#5b6472}',
      P+'.rf-svcbtn{height:34px;padding:0 14px;border-radius:20px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#3a4250;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}',
      P+'.rf-svcbtn:hover{filter:brightness(1.05)}',
      P+'.rf-svcbtn.is-on{border-color:#0a0b0d;background:'+METB+';color:#fff}',
      P+'.rf-svcsep{width:1px;height:24px;background:rgba(20,24,34,.14);margin:0 2px}',
      P+'.rf-leg{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:#3a4250}',
      P+'.rf-leg i{width:11px;height:11px;border-radius:3px;display:inline-block;flex:none}',
      P+'.rf-bsearch{margin-left:auto;display:flex;align-items:center;gap:7px;min-width:200px;height:34px;padding:0 12px;border-radius:9px;background:#fff;border:1px solid rgba(20,24,34,.14)}',
      P+'.rf-bsearch input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:12.5px;color:#141822;outline:none;padding:0}',
      P+'.rf-stats{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}',
      P+'.rf-stat{flex:1 1 165px;min-width:165px;border-radius:14px;padding:12px 14px;box-shadow:inset 0 2px 0 rgba(255,255,255,.22),inset 0 -5px 10px -5px rgba(0,0,0,.55),0 12px 24px -14px rgba(0,0,0,.6)}',
      P+'.rf-stat__l{font-size:10px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.65)}',
      P+'.rf-stat__v{font-family:"Space Mono",monospace;font-size:20px;font-weight:700;color:#fff;margin-top:4px}',
      P+'.rf-stat__s{font-family:"Space Grotesk",system-ui,sans-serif;font-size:11px;font-weight:400;color:rgba(255,255,255,.5);margin-left:8px}',
      P+'.rf-stat--byg{background:linear-gradient(180deg,#33373f,#1b1e24 55%,#0a0b0e);border:1px solid #0a0b0d}',
      P+'.rf-stat--sl{background:linear-gradient(180deg,#1c3d8c,#12296b 55%,#060f2e);border:1px solid #060f2e}',
      P+'.rf-stat--br{background:linear-gradient(180deg,#6c1014,#450a0d 55%,#1a0304);border:1px solid #1a0304}',
      P+'.rf-stat--od{background:linear-gradient(180deg,#8a6414,#5e430c 55%,#241804);border:1px solid #241804}',
      P+'.rf-stack{display:flex;flex-direction:column;align-items:center;gap:2px}',
      P+'.rf-stack>span{min-height:17px;display:flex;align-items:center;justify-content:center}',
      P+'.rf-tbl td.rf-nextcell .rf-stack{align-items:flex-start}',
      P+'.rf-cnt{height:17px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-family:"Space Mono",monospace;font-size:11px;font-weight:700;color:#fff;border-radius:6px;padding:0 8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 4px -2px rgba(0,0,0,.4);text-shadow:0 1px 1px rgba(0,0,0,.3);white-space:nowrap}',
      P+'.rf-cnt em{font-style:normal;font-size:9px}',
      P+'.rf-cnt--sl{background:linear-gradient(145deg,#2a4c8f,#12296b 55%,#060f2e);border:1px solid #060f2e}',
      P+'.rf-cnt--br{background:linear-gradient(145deg,#8a1c22,#560c10 55%,#1a0304);border:1px solid #1a0304}',
      P+'.rf-cnt.is-zero{color:rgba(255,255,255,.42)}',
      P+'.rf-yh__k{display:flex;flex-direction:column;gap:2px;margin-top:5px}',
      P+'.rf-yh__k i{font-style:normal;font-size:9px;font-weight:700;letter-spacing:.06em}',
      P+'.rf-yh__k i.sl{color:#8fb0ff}',
      P+'.rf-yh__k i.br{color:#ff9a92}',
      P+'.rf-tblfoot{display:flex;align-items:center;gap:12px;padding:10px 15px;background:linear-gradient(180deg,#f1f4f9,#e7ebf2);border-top:1px solid rgba(20,24,34,.09);font-size:12px;color:#6b7686;flex-wrap:wrap}',
      P+'.rf-tblfoot b{color:#3a4250}',
      P+'.rf-nores{padding:16px;text-align:center;color:#9098a6;font-size:13px}',
      // mobile
      '@media(max-width:640px){'+
        P+'.rf-search{width:100%;margin-left:0}'+
        P+'.rf-page{padding:16px 12px 50px}'+
        P+'.rf-bsearch{margin-left:0;width:100%}'+
        // 390px: sticky name so the site identity stays readable while the
        // rest of the Brunastál table still scrolls horizontally — no new UI.
        P+'.rf-tbl{min-width:760px;font-size:13px}'+
        P+'.rf-tbl th:first-child,'+P+'.rf-tbl td.rf-cellname{position:sticky;left:0;z-index:1;background:#fff;box-shadow:4px 0 8px -6px rgba(10,20,50,.35)}'+
        P+'.rf-tbl thead th:first-child{background:'+METB+'!important;z-index:2}'+
        P+'.rf-tbl tbody tr:nth-child(even) td.rf-cellname{background:#fbfcfe}'+
        P+'.rf-tbl tbody tr:hover td.rf-cellname{background:#f3f6fc}'+
        P+'.rf-tbl tbody td{padding:5px 8px!important}'+
        P+'.rf-bname{font-size:16px}'+
        P+'.rf-baddr{font-size:14px}'+
        P+'.rf-bldrow{min-height:44px}'+
        P+'.rf-cellname{min-height:44px}'+
        P+'.rf-bldtoggle{width:44px;min-width:44px;min-height:44px}'+
        P+'.rfa__pad{padding:10px 10px}'+
      '}',
      // Síma-úttekt 2026-07-30 (mælt): .rfa__pills var flex:none svo pillu-röðin
      // hélt fullri breidd og NAFNIÐ (flex:1 + ellipsis) fór í 0 px — félags-
      // nöfnin ólæsileg á síma. Pillurnar vefjast nú og víkja fyrir nafninu.
      // #_rf_add (haus-hnappurinn) stóð 67 px út fyrir skjáinn — hausinn fær
      // wrap og hnapparnir fulla breidd í röðinni.
      '@media(max-width:560px){'+
        P+'.rfa__pills{flex:0 1 auto;flex-wrap:wrap;justify-content:flex-end;max-width:55%}'+
        P+'.rfa__name{min-width:120px}'+
        P+'.rf-phead>*{min-width:0}'+
        P+'.rf-phead .rf-btn{flex:1 1 auto;justify-content:center}'+
        // Hnappa-spanið í hausnum ber INLINE margin-left:auto;display:inline-flex
        // (sjá render í mode()) — inline vinnur nema með !important. Á síma fer
        // spanið í fulla breidd og vefur, svo #_rf_add endi ekki utan skjás.
        P+'.rf-phead>span{margin-left:0!important;display:flex!important;flex-wrap:wrap!important;flex:1 1 100%;gap:8px!important;min-width:0}'+
        P+'.rf-btn{min-height:44px!important;height:44px!important;font-size:16px!important}'+
        P+'.rfa__name{font-size:16px}'+
      '}',
      // --- vörn gegn patch 245 (Brunastál content-skin) sem málar .view
      //     input/thead/table með !important — okkar útlit VERÐUR að vinna ---
      P+'.rf-search input, '+P+'.rf-search input[type="text"]{background:transparent!important;border:0!important;box-shadow:none!important;height:auto!important;padding:0!important;border-radius:0!important;color:#141822!important}',
      P+'.rf-tbl thead tr, '+P+'.rf-tbl thead{background:'+METB+'!important}',
      P+'.rf-tbl thead th{background:transparent!important;color:#f0f2f5!important;box-shadow:none!important;padding:10px 12px!important;font-size:10.5px!important;letter-spacing:.08em!important}',
      // 2026-08-07 (Agnar: „reduce the height by 20% per line") — lóðrétta
      // paddingið var stærsti hæðargjafinn (11px × 2 = 22px af ~54px röð).
      // 6px × 2 + þéttara línubil á nafn/heimilisfang = ~20% lægri röð.
      // 2026-08-26 (Heimaleiga): Brunastál 153 row = 7px/44px nowrap. Override
      // the 6px padding with the same density so wrapping names don't inflate
      // the accordion past the fold.
      P+'.rf-tbl tbody td{border:0!important;padding:5px 10px!important;background:transparent!important;vertical-align:middle!important}',
      P+'.rf-tbl tbody tr{min-height:44px}',
      P+'.rf-tbl tbody tr:nth-child(even){background:#fbfcfe!important}',
      P+'.rf-tbl tbody tr:hover{background:#f3f6fc!important}',
      P+'.rfa__head{background:'+HERO+'!important;border:0!important;box-shadow:none!important;text-shadow:none!important;border-radius:0!important;height:auto!important}',
      P+'.rfa__chev, '+P+'.rfa__logo{background:rgba(255,255,255,.1)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:none!important}',
      P+'.rf-btn{background:'+METB+'!important;color:#fff!important;border:1px solid #0a0b0d!important;text-shadow:none!important;box-shadow:none!important;border-radius:10px!important;height:38px!important}',
      P+'.rf-btn.is-on{border-color:#4a6ae8!important;box-shadow:0 0 0 1px #4a6ae8,inset 0 1px 0 rgba(255,255,255,.12)!important}',
      P+'.rf-cellname{padding-left:16px!important}',
      // sömu varnir fyrir nýju brunakerfis-hlutana (245 málar .view input/th/button)
      P+'.rf-bsearch input, '+P+'.rf-bsearch input[type="text"]{background:transparent!important;border:0!important;box-shadow:none!important;height:auto!important;padding:0!important;border-radius:0!important;color:#141822!important}',
      P+'.rf-tbl thead th.rf-yh{font-family:"Space Mono",monospace!important;font-size:12.5px!important;letter-spacing:0!important;text-transform:none!important;color:#fff!important;vertical-align:middle!important;padding:8px 6px!important}',
      P+'.rf-svcbtn{text-shadow:none!important;box-shadow:none!important;height:34px!important;border-radius:20px!important}',
      P+'.rf-svcbtn.is-on{background:'+METB+'!important;color:#fff!important;border:1px solid #0a0b0d!important}',
      // Sími/appmode (261): .view button{min-height:50px} + input{52px} blésu
      // hverja byggingaröð. Sama undantekning og #ars-main í 261.
      'body.appmode #view-rekstrarfelog .rf-tbl button:not(.rf-bldtoggle),body.appmode #view-rekstrarfelog .rf-svcbtn{min-height:0!important;height:auto!important;padding-top:2px!important;padding-bottom:2px!important;font-size:13px!important;line-height:1.1!important}',
      'body.appmode #view-rekstrarfelog .rf-tbl input.rf-plannote,body.appmode #view-rekstrarfelog .rf-tbl input._rf-plannote{min-height:24px!important;height:24px!important;font-size:13px!important;padding-top:0!important;padding-bottom:0!important}',
      'body.appmode #view-rekstrarfelog .rf-tbl td{font-size:13px!important;padding:5px 8px!important}',
      'body.appmode #view-rekstrarfelog .rf-bname{font-size:16px!important}',
      'body.appmode #view-rekstrarfelog .rf-btn{min-height:44px!important;height:44px!important;font-size:16px!important;padding-top:0!important;padding-bottom:0!important}',
      'body.appmode #view-rekstrarfelog .rf-tbl .rf-bldtoggle{min-width:44px!important;min-height:44px!important;height:44px!important;padding:0!important}',
      '@media(max-width:560px){'+
        P+'.rf-btn{min-height:44px!important;height:44px!important;font-size:16px!important;padding-top:0!important;padding-bottom:0!important}'+
        P+'.rf-bname{font-size:16px!important}'+
        P+'.rfa__name{font-size:16px!important}'+
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---- data load/save via AppSettings (fallback to localStorage) ----
  function getRawData(){
    try {
      if (window.AppSettings && typeof AppSettings.path==='function'){
        var b = AppSettings.path('rekstrarfelog');
        if (b && typeof b==='object' && Object.keys(b).length) return b;
      }
    } catch(e){}
    try { var l=JSON.parse(localStorage.getItem('_slokk_rekstrarfelog')||'null'); if(l) return l; } catch(e){}
    return SEED;
  }

  // 2026-07-12 (verkefnalisti ca49007e): nýju rekstrarfélögin (Pizzan, Colas,
  // Aðalskoðun, Steypustöðin, Center Hótel, Endurvinnslan, Vélrás, Vélsmiðja
  // Orms og Víglundar …) voru sett á customers_base.rekstrarfelag EN birtust
  // ekki því síðan las AÐEINS handvirka AppSettings-listann (getRawData). Nú
  // lesum við líka LIFANDI rekstrarfélög úr gagnagrunninum og fléttum þeim inn:
  //  · alveg ný rekstrarfélög → bætast við með öllum staðum sínum.
  //  · rekstrarfélög sem eru þegar til (curated) → staðir sem vantar bætast
  //    við (dedup á kt::nafn) svo nýmerktar byggingar birtist, en handvirku
  //    tölvupóstarnir/drive-hlekkirnir haldast ósnertir.
  // Staðirnir eru rekstrarfélög-með-margar-staðsetningar → ALDREI sameinaðir.
  var _liveRF = null; // { name: [{kt,nafn,heimilisfang}] }
  var _liveRFPromise = null;
  async function ensureLiveRF(){
    if (_liveRF) return _liveRF;
    if (_liveRFPromise) return _liveRFPromise;
    _liveRFPromise = (async function(){
      var out = {};
      var SB = window.__vdaSB || (window.DB && DB.sb);
      if (!SB) { _liveRF = out; return out; }
      try {
        // base rows carrying a rekstrarfelag
        var bases = {}; // base_id -> rekstrarfelag
        // báðar töflur sóttar með samhliða blaðsíðum (var 2+2 raðbundnar sóknir)
        var baseRows = await fetchAllRows(SB, 'customers_base', 'id,nafn,kennitala,heimilisfang,rekstrarfelag',
          function(q){ return q.not('rekstrarfelag','is',null); });
        baseRows.forEach(function(b){
          if(!b.rekstrarfelag) return;
          bases[b.id] = b.rekstrarfelag;
          (out[b.rekstrarfelag]||(out[b.rekstrarfelag]=[]));
        });
        // fyrirtaeki locations that belong to those bases → the buildings/sites
        var baseIds = Object.keys(bases).map(function(x){return parseInt(x,10);});
        if (baseIds.length){
          var siteCols = 'id,nafn,kennitala,heimilisfang,netfang,simi,customer_base_id,bokunarnumer,stadur_nr,plan_note';
          var alive = function(q){ return q.is('deleted_at', null); };
          var siteRows = await fetchAllIn(SB, 'fyrirtaeki', siteCols, 'customer_base_id', baseIds, alive);
          // Recover sites that share a tagged base's kennitala but are not
          // linked (customer_base_id null). Never steal a site already pinned
          // to another base. Never merge rows — kt+stadur_nr is the identity.
          var ktToRek = {}, ktList = [];
          baseRows.forEach(function(b){
            var d = digits(b.kennitala);
            if (d && d.length === 10 && b.rekstrarfelag) {
              ktToRek[d] = b.rekstrarfelag;
              var dash = d.slice(0,6)+'-'+d.slice(6);
              if (ktList.indexOf(dash) < 0) ktList.push(dash);
              if (ktList.indexOf(d) < 0) ktList.push(d);
            }
          });
          if (ktList.length) {
            var byKt = await fetchAllIn(SB, 'fyrirtaeki', siteCols, 'kennitala', ktList, alive);
            var seen = {};
            siteRows.forEach(function(f){ if (f && f.id != null) seen[f.id] = 1; });
            byKt.forEach(function(f){
              if (!f || f.id == null || seen[f.id]) return;
              if (f.customer_base_id != null) return; // linked elsewhere — don't steal
              seen[f.id] = 1;
              siteRows.push(f);
            });
          }
          var pushed = {};
          siteRows.forEach(function(f){
            if (!f || f.id == null || pushed[f.id]) return;
            var rek = bases[f.customer_base_id];
            if (!rek && (f.customer_base_id == null || f.customer_base_id === '')) rek = ktToRek[digits(f.kennitala)];
            if (!rek) return;
            pushed[f.id] = 1;
            (out[rek]||(out[rek]=[])).push({
              co_id: f.id,
              kt: f.kennitala||'',
              nafn: f.nafn||'',
              heimilisfang: f.heimilisfang||'',
              netfang: f.netfang||'',
              simi: f.simi||'',
              customer_base_id: f.customer_base_id,
              bokunarnumer: f.bokunarnumer||'',
              stadur_nr: f.stadur_nr,
              plan_note: f.plan_note||''
            });
          });
          // Base tagged as rekstrarfélag but with no fyrirtaeki row yet (SAB ehf
          // / Naustavör 18) — still list it so the Heimaleiga set is complete.
          baseRows.forEach(function(b){
            if (!b.rekstrarfelag) return;
            var list = out[b.rekstrarfelag] || (out[b.rekstrarfelag]=[]);
            var has = list.some(function(s){
              return s.customer_base_id===b.id || (digits(s.kt) && digits(s.kt)===digits(b.kennitala));
            });
            if (has) return;
            list.push({
              co_id: null,
              kt: b.kennitala||'',
              nafn: b.nafn||'',
              heimilisfang: b.heimilisfang||'',
              customer_base_id: b.id,
              stadur_nr: null,
              _fromBase: true
            });
          });
        }
      } catch(e){ console.warn('[rekstrarfelog] live load', e); }
      _liveRF = out; return out;
    })().catch(function(e){ console.warn('[rekstrarfelog] live load', e); _liveRFPromise=null; _liveRF={}; return _liveRF; });
    return _liveRFPromise;
  }

  // 2026-07-30 (Agnar: „zero info"): Upplýsinga-spjaldið stóð tómt („—" í öllum
  // reitum) á félögum sem eru AÐEINS til lifandi — live-færslan er búin til án
  // kt/netfanga/síma (sjá getData), svo Center Hótel sýndi ekkert þótt allar 10
  // byggingar þess beri kt 450905-1430. Hér eru gildin LEIDD út úr byggingunum
  // þegar ekkert hefur verið handskráð:
  //   · kt      — AÐEINS þegar allar byggingar bera SÖMU kennitölu (ótvírætt).
  //               Fjöl-kt félög (Eignaumsjón: 65 húsfélög) fá ekkert giskað kt.
  //   · netföng — öll ólík netföng af fyrirtaeki-röðum félagsins
  //   · sími    — fyrsta skráða símanúmerið
  // Leidd gildi eru MERKT í sýninni og forfyllt í ritlinum svo „Vista" festi þau.
  function derivedInfo(info){
    var blds = (info && info.buildings) || [];
    var kts = {}, ems = {}, sims = [];
    blds.forEach(function(b){
      var k = digits(b.kt || ''); if (k && k.length === 10) kts[k] = (b.kt || '');
      String(b.netfang || '').split(/[,;\s]+/).forEach(function(x){
        x = x.trim().toLowerCase(); if (x.indexOf('@') > 0) ems[x] = 1;
      });
      var s = String(b.simi || '').trim(); if (s && sims.indexOf(s) < 0) sims.push(s);
    });
    var kk = Object.keys(kts);
    return { kt: kk.length === 1 ? kts[kk[0]] : '', emails: Object.keys(ems), simi: sims[0] || '' };
  }

  function getData(){
    var data = getRawData();
    if (!_liveRF) return data;                 // ekki enn hlaðið → hráa gögnin
    // Fléttum lifandi rekstrarfélögum inn án þess að breyta upprunalega blobinu.
    var merged = {};
    Object.keys(data).forEach(function(k){ merged[k]=data[k]; });
    // kt → which live rekstrarfélag already owns it. Seed leftovers (Aegina ehf,
    // Húsfélagið Laugavegi 42) must not reappear under Heimaleiga when that kt
    // already lives on this or another operator list.
    var liveKtOwner = {};
    Object.keys(_liveRF).forEach(function(nm){
      (_liveRF[nm]||[]).forEach(function(s){
        var d = digits(s.kt); if (d) liveKtOwner[d] = nm;
      });
    });
    Object.keys(_liveRF).forEach(function(name){
      var sites = _liveRF[name] || [];
      if (!merged[name]){
        merged[name] = { domain:'', emails:[], buildings: sites.slice(), drive:'', _live:true };
        return;
      }
      // 2026-07-28 (Agnar villa 4 — „sama bygging birtist margoft"): dedupið var
      // á NÁKVÆMU `kt::nafn`, svo hvert einasta stafsetningar-brigði slapp í
      // gegn og varð að auka-röð: „Midtown hotel" við hlið „Midtown Hotel",
      // „Bríetartún 9 og 11" við hlið „Bríetartún 9-11", „Laugavegur 1 (Ice
      // Apartments)" við hlið „Laugavegur 1".
      //
      // Nú er byrjað á LIFANDI stöðunum (hver þeirra = ein fyrirtaeki-röð, þeir
      // eru aldrei felldir saman — sbr. regluna um að staðir rekstrarfélags megi
      // aldrei sameinast) og handskráð færsla er sleppt ef hún vísar augljóslega
      // á sama stað. Tvö sjálfstæð próf, hvort um sig krefst SÖMU kennitölu:
      //   · fold-að nafn eins  (hástafir/bandstrik/broddar hunsuð)
      //   · fold-að heimilisfang eins
      // Ólík kennitala ⇒ alltaf tvær raðir (t.d. „Húsfélagið Laugavegi 42" og
      // „Heimaleiga - Laugavegur 42" eru sitt hvor lögaðilinn á sama húsi).
      var info = merged[name];
      var curated = Array.isArray(info.buildings) ? info.buildings.slice() : [];
      var liveNm = {}, liveAddr = {}, liveKtN = {}, liveAddrAny = {}, liveSiteNm = {};
      var liveCo = {};
      sites.forEach(function(s){
        var d = digits(s.kt);
        liveNm[d+'::'+foldNm(s.nafn)] = 1;
        liveNm[d+'::'+foldSiteNm(s.nafn)] = 1;
        var sn = foldSiteNm(s.nafn); if (sn) liveSiteNm[sn] = 1;
        var a = foldAddr(s.heimilisfang) || foldNm(s.heimilisfang);
        if (a) { liveAddr[d+'::'+a] = 1; liveAddrAny[a] = 1; }
        if (d) liveKtN[d] = (liveKtN[d]||0)+1;
        if (s.co_id != null) liveCo[String(s.co_id)] = 1;
      });
      var blds = sites.map(function(s){ return Object.assign({}, s, { _live:true }); });
      var seen = {};
      curated.forEach(function(b){
        var d = digits(b.kt);
        var kNm = d+'::'+foldSiteNm(b.nafn);
        var kNmRaw = d+'::'+foldNm(b.nafn);
        var a = foldAddr(b.heimilisfang) || foldNm(b.heimilisfang);
        var kAddr = a ? (d+'::'+a) : null;
        var sn = foldSiteNm(b.nafn);
        if (b.co_id != null && liveCo[String(b.co_id)]) return;
        if (liveNm[kNm] || liveNm[kNmRaw]) return;
        if (kAddr && liveAddr[kAddr]) return;
        if (a && liveAddrAny[a] && !b.co_id) return;
        if (d && liveKtN[d] >= 1 && !b.co_id) return;
        if (sn && liveSiteNm[sn] && !b.co_id) return;
        // AppSettings leftovers without a pin: "Heimaleiga ehf", "SAB ehf.",
        // "Máni Apartments" with no kt — production showed 25 rows, 10 of them
        // "(ekki í skrá)". Live fyrirtaeki rows are the list.
        if (sites.length && !b.co_id && (!d || !a)) return;
        if (d && liveKtOwner[d] && liveKtOwner[d] !== name) return;
        if (seen[kNm] || seen[kNmRaw]) return;
        seen[kNm] = 1; seen[kNmRaw] = 1;
        blds.push(b);
      });
      merged[name] = Object.assign({}, info, { buildings: blds });
    });
    return merged;
  }
  // `onlyKey` (2026-07-30): sendir AÐEINS það félag sem var ritstýrt í
  // AppSettings. Áður fór öll curated-varpan með í hverri vistun, svo nóta sem
  // þú skrifaðir hér skrifaði yfir breytingar hinna vélanna á ÖÐRUM félögum
  // (deepMerge yfirskrifar, hún sameinar ekki). localStorage-afritið heldur
  // áfram að geyma alla vörpuna — það er staðbundið og skaðlaust.
  async function saveData(d, onlyKey){
    // Persistum EKKI ósnertar lifandi færslur (þær sem fléttuðust inn úr
    // gagnagrunninum og hafa engin handvirk gögn) — annars frystist lifandi
    // listinn í AppSettings-blobið og hættir að uppfærast. Um leið og notandi
    // ritstýrir rekstrarfélagi (bætir við tölvupósti/drive/nótu) fær það alvöru
    // gögn og er þá geymt (ættleitt sem curated).
    var clean = {};
    Object.keys(d||{}).forEach(function(k){
      var info = d[k] || {};
      var touched = (info.emails && info.emails.length) || info.domain || info.drive || info.note || info.notes;
      if (info._live && !touched) return; // sleppa hreinni lifandi færslu
      var copy = Object.assign({}, info); delete copy._live;
      // 2026-07-28 (rót villu 4): áður var ALLUR fléttaði byggingalistinn
      // vistaður aftur — líka staðirnir sem komu úr gagnagrunninum. Þeir frusu
      // þar með inn í handskráða blobið, og næst þegar nafni var breytt í
      // fyrirtaeki-töflunni bættist NÝ röð við hliðina á þeirri frosnu. Þannig
      // urðu „Midtown hotel" + „Midtown Hotel" til. Lifandi staðir eru nú
      // strípaðir burt við vistun; aðeins raunverulega handskráðar byggingar
      // (og þær sem notandinn hefur ritstýrt) sitja eftir í blobinu.
      if (Array.isArray(copy.buildings)) {
        copy.buildings = copy.buildings
          .filter(function(b){ return !(b && b._live); })
          .map(function(b){ var c = Object.assign({}, b); delete c._live; return c; });
      }
      clean[k] = copy;
    });
    try { localStorage.setItem('_slokk_rekstrarfelog', JSON.stringify(clean)); } catch(e){}
    var patch = clean;
    if (onlyKey != null) {
      patch = {};
      if (Object.prototype.hasOwnProperty.call(clean, onlyKey)) patch[onlyKey] = clean[onlyKey];
    }
    try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ rekstrarfelog: patch }); } catch(e){}
  }

  function companyByKt(kt){
    var list = (window.Companies && Companies.list) || [];
    var d = digits(kt);
    return list.find(function(c){ return digits(c.kennitala)===d; }) || null;
  }
  // 2026-07-15 (Agnar: „þetta fer bara alltaf inn í hotel grandi") + 2026-08-25:
  // ein kt á mörgum húsum. Live-raðir bera co_id = fyrirtaeki.id — það ER
  // skoðunar-einingin (Máni #869 ≠ Midtown #1486, sama kt, sama hús, ólíkar hæðir).
  // Nafn/kt er AÐEINS fyrir gamlar handskráðar raðir án pinnans. Ekkert einstakt
  // match → null (ósmelanlegt), ALDREI fyrsta hitt.
  function foldNm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function foldSiteNm(s){
    return foldNm(s)
      .replace(/^(heimaleiga|eignaumsjon|eignarekstur|rekstrarumsjon|centerhotel|pizzan)+/,'')
      .replace(/(ehf|slf|sf|svf)$/,'');
  }
  function foldAddr(s){
    return foldNm(s)
      .replace(/laugarvegur/g,'laugavegur')
      .replace(/vegi/g,'vegur')
      .replace(/mula/g,'muli')
      .replace(/gotu/g,'gata')
      .replace(/(bilskur|[0-9]+haed).*$/,'');
  }
  function companyForBld(b){
    var list = (window.Companies && Companies.list) || [];
    // Handfest tenging (✏️ eða live-hleðsla) trompar ALLA sjálfvirkni — b.co_id.
    if (b && b.co_id != null) {
      var pinned = list.find(function(c){ return String(c.id)===String(b.co_id); });
      if (pinned) return pinned;
      // Companies.list ekki tilbúið / vantar röðina — pinninn nægir samt svo
      // skýrslur, CanonStadur og Payday lyklast á RÉTTUM stað, ekki á nafni.
      return {
        id: b.co_id,
        kennitala: b.kt,
        nafn: b.nafn,
        heimilisfang: b.heimilisfang,
        netfang: b.netfang,
        simi: b.simi,
        customer_base_id: b.customer_base_id,
        bokunarnumer: b.bokunarnumer,
        stadur_nr: b.stadur_nr,
        plan_note: b.plan_note || ''
      };
    }
    var fn = foldNm(b && b.nafn);
    if (fn) {
      var hits = list.filter(function(c){ return foldNm(c.nafn)===fn && !c.deleted_at; });
      if (hits.length === 1) return hits[0];
      if (hits.length > 1) {
        var d0 = digits(b.kt);
        var kh = hits.filter(function(c){ return digits(c.kennitala)===d0; });
        if (kh.length === 1) return kh[0];
        return null;
      }
    }
    var d = digits(b && b.kt);
    if (d) {
      var ktHits = list.filter(function(c){ return digits(c.kennitala)===d && !c.deleted_at; });
      if (ktHits.length === 1) return ktHits[0];   // einkvæm kt → öruggt
      // 2026-08-25 (Agnar): rekstrarfélög = kennitala + staðurinnúmer.
      // Plaza nr. 2 ≠ Máni nr. 2 — nr. eitt er ekki nóg; parið er einkvæmt.
      if (ktHits.length > 1) {
        var nr = (b.stadur_nr!=null && b.stadur_nr!=='') ? b.stadur_nr : null;
        if (nr!=null) {
          var nrHits = ktHits.filter(function(c){ return String(c.stadur_nr)===String(nr); });
          if (nrHits.length === 1) return nrHits[0];
        }
      }
    }
    return null;
  }

  // ── Stofna RAUNVERULEGT fyrirtæki í þjónustu (fyrirtaeki-röð) fyrir nýja
  //    byggingu/stað rekstrarfélags. Sama insert-mynstur og patch 188
  //    (promote-customer): find/create customers_base eftir kt, insert fyrirtaeki
  //    með er_i_thjonustu=true + customer_base_id. Skilar nýju röðinni (m/ id).
  async function createServiceCompany(nafn, ktRaw, heim){
    var SB = window.__vdaSB || (window.DB && DB.sb);
    if(!SB) throw new Error('Enginn gagnagrunns-tengill');
    var dd = digits(ktRaw);
    var ktDash = (dd && dd.length===10) ? (dd.slice(0,6)+'-'+dd.slice(6)) : String(ktRaw||'').trim();
    if(!ktDash) throw new Error('Kennitölu vantar');
    // find/create base eftir kt (aldrei tvítaka — Center Hótel base er þegar til)
    var baseId = null;
    try {
      var q = await SB.from('customers_base').select('id').eq('kennitala', ktDash).limit(1);
      if(q && q.data && q.data[0]) baseId = q.data[0].id;
      if(baseId == null){
        var ins = await SB.from('customers_base').insert({ kennitala: ktDash, nafn: nafn, heimilisfang: heim||'' }).select('id').single();
        if(ins.error) throw ins.error;
        baseId = ins.data ? ins.data.id : null;
      }
    } catch(e){ throw new Error('base: '+(e.message||e)); }
    var row = { nafn: nafn, kennitala: ktDash, status:'virkur', er_i_thjonustu:true, customer_base_id: baseId };
    if(heim) row.heimilisfang = heim;
    try {
      var nq = await SB.from('fyrirtaeki').select('stadur_nr').or('kennitala.eq.'+ktDash+',kennitala.eq.'+dd).is('deleted_at',null);
      var maxN = 0;
      ((nq && nq.data) || []).forEach(function(x){
        var n = parseInt(x.stadur_nr, 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      });
      row.stadur_nr = maxN + 1;
    } catch(_) {}
    var r = await SB.from('fyrirtaeki').insert(row).select().single();
    if(r.error) throw r.error;
    var co = r.data;
    // láta Companies.list vita strax svo companyForBld tengi bygginguna rétt
    try { if(window.Companies && Array.isArray(Companies.list)) Companies.list.push(co); } catch(_){}
    return co;
  }

  // ── Aksturslistar á rekstrarfélagi (deila með „Fyrirtæki í þjónustu") ──────
  // Sama gagnastaður og patch 267/153: arsskodun_customers[staður_id].akstur
  // (0 = enginn / 1 / 2 / 3). Þegar rekstrarfélagi er úthlutað akstursleið fá
  // ALLIR staðir þess (fyrirtaeki-id) sama gildi → þeir birtast með 🚗N á aðal-
  // borðinu. Rotandi smellur eins og á aðal-borðinu (0→1→2→3→0).
  function _arsAll(){ try{ return (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {}; }catch(e){ return {}; } }
  function _aksturOf(id){ var a=_arsAll()[String(id)]; var v=+((a||{}).akstur)||0; return (v>=1&&v<=3)?v:0; }
  function coIdsForBlds(blds){
    var out=[]; (blds||[]).forEach(function(b){ var c=companyForBld(b); if(c&&c.id!=null) out.push(c.id); });
    return out;
  }
  // Fulltrúa-gildi félagsins = algengasta úthlutaða gildið á stöðunum (0 ef ekkert).
  function rfAksturVal(coIds){
    var cnt={}, best=0, bn=0;
    (coIds||[]).forEach(function(id){ var v=_aksturOf(id); if(v){ cnt[v]=(cnt[v]||0)+1; if(cnt[v]>bn){bn=cnt[v];best=v;} } });
    return best;
  }
  async function setRfAkstur(coIds, v){
    if(!coIds||!coIds.length||!window.AppSettings||!AppSettings.save) return false;
    var patch={}; coIds.forEach(function(id){ patch[String(id)]={akstur:v}; });
    try{ var ok=await AppSettings.save({arsskodun_customers:patch}); return ok!==false; }catch(e){ return false; }
  }
  // idsProvider: annaðhvort fylki af co-id-um eða fall sem skilar slíku fylki.
  // Félags-chip → allir staðir; per-röð chip → einn staður ([co.id]).
  function makeRfAksturChip(idsProvider){
    var BLUE={bg:'#38bdf8',bd:'#0ea5e9',fg:'#ffffff'}, GREY={bg:'#eef2f7',bd:'#cbd5e1',fg:'#94a3b8'};
    var chip=document.createElement('span'); chip.className='_rf_akstur';
    var saveT=null;
    function ids(){ try{ return (typeof idsProvider==='function'?idsProvider():idsProvider)||[]; }catch(e){ return []; } }
    function paint(v){
      var c=v?BLUE:GREY; chip.dataset.ak=String(v);
      chip.textContent = v ? ('🚗'+v) : '🚗';
      chip.title = v ? ('Akstursleið '+v+' — allir staðir félagsins · smelltu til að breyta')
                     : 'Setja rekstrarfélag á akstursleið (allir staðir) · smelltu';
      chip.style.cssText='display:inline-flex;align-items:center;justify-content:center;gap:1px;min-width:38px;'+
        'height:26px;padding:0 8px;box-sizing:border-box;border-radius:99px;cursor:pointer;'+
        'font-size:12px;font-weight:800;line-height:1;user-select:none;'+
        'border:1px solid '+c.bd+';background:'+c.bg+';color:'+c.fg+';'+
        (v?'box-shadow:0 1px 4px -1px rgba(14,165,233,.6);':'opacity:.9;')+'transition:transform .12s';
    }
    paint(rfAksturVal(ids()));
    // Companies.list kann að hlaðast rétt eftir fyrsta render → endur-máln stutt síðar.
    setTimeout(function(){ if(!saveT && chip.isConnected) paint(rfAksturVal(ids())); }, 500);
    chip.addEventListener('click', function(e){
      e.stopPropagation(); e.preventDefault();
      var cur=+chip.dataset.ak||0, next=(cur+1)%4;
      paint(next);
      chip.style.transform='scale(1.15)'; setTimeout(function(){ chip.style.transform='scale(1)'; }, 130);
      clearTimeout(saveT);
      saveT=setTimeout(function(){
        saveT=null;
        var list=ids();
        if(!list.length){ if(window.Toast&&Toast.show) Toast.show('⚠ Engir staðir tengdir í skrá'); return; }
        setRfAkstur(list, next).then(function(ok){
          if(!window.Toast||!Toast.show) return;
          if(ok) Toast.show(next ? ('✓ Akstursleið '+next+' · '+list.length+(list.length===1?' staður':' staðir')) : '✓ Tekið af akstursleið');
          else Toast.show('⚠ Villa við vistun aksturslista');
        });
      }, 900);
    });
    return chip;
  }

  // ---- attachments helpers (reuse app's CompanyAttachments) ----
  function firmAttachId(firm){ return 'rf:'+firm; } // synthetic id namespace
  async function listFirmDocs(firm){
    try { if(window.CompanyAttachments && CompanyAttachments.list) return (await CompanyAttachments.list(firmAttachId(firm)))||[]; } catch(e){}
    return [];
  }
  // Per-building attach key: the company record id when the building is in the
  // customer registry, else a synthetic 'rfb:<kt>' namespace (same
  // company_attachments storage either way).
  function bldAttachKey(b, co){
    if(co) return String(co.id);
    var d=digits(b.kt); return 'rfb:'+(d||_compact(b.nafn||''));
  }
  // 2026-06-10: per-building úttektarskýrslu link key. Several buildings can
  // share ONE kennitala (e.g. Heimaleiga ehf operates Laugavegur 1/18,
  // Urðarhvarf 2/4, Hamraborg 7, …) so a kt-only key would collapse them onto
  // the same link. Key by kt + the exact building name instead; the lookups
  // fall back to the legacy kt-only key so existing single-building links keep
  // working untouched.
  function bldLinkKey(b){ return digits(b.kt)+'::'+String(b.nafn||''); }
  // Year-tagged uploaded file for a (building, year): explicit tag wins, then
  // filename detection for untagged files; year==='0' = explicitly cleared.
  function fileForYear(caMap, key, y){
    var list = caMap[key]; if(!Array.isArray(list)) return null;
    return list.find(function(x){ return String(x.year)===y; }) ||
           list.find(function(x){ return x.year==null && new RegExp('\\b'+y+'\\b').test(String(x.name||'')); }) || null;
  }
  function getCaMap(){
    try { if(window.AppSettings&&AppSettings.path) return AppSettings.path('company_attachments')||{}; } catch(e){}
    return {};
  }

  // ---- equipment / inspection index (uttaeki.last_insp / next_insp) ----
  // Each fire unit records its most recent inspection (last_insp) and next-due
  // date (next_insp). We match a building name to its units (handling the messy
  // free-text client field) and roll up per-year counts + the earliest next-due.
  var _equip=null, _equipPromise=null, _equipAt=0;
  // Tækja-vísitalan skannar ALLA uttaeki-töfluna (7000+ raðir, 8 síður) — hún er
  // því endurnýjuð með tímamörkum (sjá showOurView) en ekki í hvert sinn.
  function invalidateEquip(){ _equip=null; _equipPromise=null; _equipAt=0; }
  function _norm(s){ return String(s||'').toLowerCase()
      .replace(/húsfélagið|húsfélag|húsf\.?|rekstrarfélag|bílskýli|bílageymsla|sameign/g,'')
      .replace(/ehf\.?|slf\.?|sf\.?|svf\.?/g,'')
      .replace(/\b\d{3}\s+[a-záðéíóúýþæö]+\.?$/,'')   // trailing postcode + city
      .replace(/[^a-z0-9áðéíóúýþæö]+/g,' ').replace(/\s+/g,' ').trim(); }
  function _compact(s){ return _norm(s).replace(/\s+/g,''); }
  function _streetnum(s){ var n=_norm(s); var m=n.match(/([a-záðéíóúýþæö]{3,})\s*(\d+)/); return m?(m[1]+m[2]):''; }
  function _blank(){ return {units:0,y2024:0,y2025:0,y2026:0,next:null}; }
  // Bætir FORREIKNAÐRI samantekt (ein röð per client-streng úr
  // v_uttaeki_client_rollup) í hólf. Áður var þetta kallað einu sinni per TÆKI
  // með hráum uttaeki-röðum; stærðfræðin er sú sama, bara summuð í grunninum.
  function _add(e,u){
    e.units += (u.units|0) || 0;
    e.y2024 += (u.y2024|0) || 0;
    e.y2025 += (u.y2025|0) || 0;
    e.y2026 += (u.y2026|0) || 0;
    if(u.next_insp&&(!e.next||u.next_insp<e.next)) e.next=u.next_insp;
  }
  // Sama, en fyrir HRÁA uttaeki-röð (worksite-tengdu tækin eru fá og sótt hrá).
  function _addRaw(e,u){
    e.units++;
    var y=u.last_insp?String(u.last_insp).slice(0,4):null;
    if(y==='2024')e.y2024++; else if(y==='2025')e.y2025++; else if(y==='2026')e.y2026++;
    if(u.next_insp&&(!e.next||u.next_insp<e.next)) e.next=u.next_insp;
  }
  async function getEquipIndex(){
    if(_equip) return _equip;
    if(_equipPromise) return _equipPromise;
    _equipPromise=(async function(){
      var SB=window.__vdaSB||(window.DB&&DB.sb);
      if(!SB){ _equip={match:function(){return null;}}; return _equip; }
      // 2026-07-30: var 5.843 hráar uttaeki-raðir í 6 RAÐBUNDNUM sóknum (~3,8 s)
      // bara til að TELJA þær í vafranum. Grunnurinn telur núna: 629 raðir í
      // EINNI sókn (9,3× færri), nákvæmlega sömu tölur (sannreynt).
      // 2026-07-30 (Verkefnalisti 93677d13): auk nafna-hólfanna sækjum við nú
      // per-STAÐAR sannleikann — arsskodun_report_facts (total_devices síðustu
      // skýrslu, PK fyrirtaeki_id) og worksite-tengdu tækin (uttaeki.worksite_id,
      // ~200 raðir) — svo byggingaröð þurfi ekki að treysta nafna-giskinu einu.
      // 2026-08-24 (Agnar ein-uppspretta): canonical mánuður/fjöldi kemur nú frá
      // sameiginlega brunninum CanonStadur (312) — EINN staður, EIN formúla, deilt með
      // 185/companieslist/89/77. 175 sækir v_stadur_yfirlit ekki lengur sér (engin
      // tvítekin formúla sem getur rekið í sundur).
      try{ if(window.CanonStadur) await CanonStadur.ready(); }catch(e){}
      var _res = await Promise.all([
        fetchAllRows(SB, 'v_uttaeki_client_rollup',
                     'client,units,y2024,y2025,y2026,next_insp'),
        fetchAllRows(SB, 'arsskodun_report_facts',
                     'fyrirtaeki_id,total_devices,report_year'),
        fetchAllRows(SB, 'uttaeki', 'worksite_id,last_insp,next_insp',
                     function(q){ return q.not('worksite_id','is',null); })
      ]);
      var rows=_res[0], factRows=_res[1], wsRows=_res[2];
      var base={},comp={},street={};
      rows.forEach(function(u){ var b=_norm(u.client); if(!b)return; var c=_compact(u.client), s=_streetnum(u.client);
        (base[b]||(base[b]=_blank())); _add(base[b],u);
        (comp[c]||(comp[c]=_blank())); _add(comp[c],u);
        if(s){ (street[s]||(street[s]=_blank())); _add(street[s],u); } });
      var ws={}, facts={};
      wsRows.forEach(function(u){ if(u.worksite_id==null)return; var k=String(u.worksite_id);
        (ws[k]||(ws[k]=_blank())); _addRaw(ws[k],u); });
      factRows.forEach(function(f){ if(f&&f.fyrirtaeki_id!=null) facts[String(f.fyrirtaeki_id)]=f; });
      // 2026-07-16 (Agnar): TÆKI = nákvæmlega tækin sem standa á fyrirtækinu
      // (sama og prófíllinn sýnir) — götu+númer-giskið safnaði gömlum
      // client-strengja-útgáfum saman (Hamraborg 7 sýndi 30 í stað 14).
      _equip={ match:function(name){ var b=_norm(name); if(base[b])return base[b];
        var c=_compact(name); if(comp[c])return comp[c]; return null; },
        wsOf:function(id){ return id==null?null:(ws[String(id)]||null); },
        factOf:function(id){ return id==null?null:(facts[String(id)]||null); },
        canonOf:function(id){ return (id!=null&&window.CanonStadur)?CanonStadur.rowOf(id):null; } };
      _equipAt=Date.now();
      return _equip;
    })().catch(function(e){
      // 2026-06-12: höfnuð promise sat áður föst í cache-inu — hver einasta
      // útvíkkun eftir það strandaði á „Hleð…". Hreinsa svo retry virki.
      console.warn('[rekstrarfelog] equip index', e);
      _equipPromise=null;
      return { match:function(){return null;} };
    });
    return _equipPromise;
  }
  // 2026-07-30 (Verkefnalisti 93677d13, VILLA „summa á kennitölu"): tækjafjöldi
  // byggingaraðar var AÐEINS nafna-gisk á client-strengnum — þegar tvær byggingar
  // sömu kennitölu bera sama (eða fold-jafnt) nafn rann talningin saman í eitt
  // hólf og BÁÐAR raðir sýndu kt-summuna (Máni 61 + Midtown 61 → „122" á báðum;
  // tvær „Jaðarleiti"-raðir eins). Nú telur hver röð SÍNA byggingu í forgangsröð:
  //   (a) arsskodun_report_facts.total_devices — per-staðar sannleikur síðustu
  //       skýrslu (PK fyrirtaeki_id) trompar TALNINGUNA þegar hann er til,
  //   (b) uttaeki með worksite_id = staðurinn (bein tenging),
  //   (c) nafna-match á client-streng (óbreytt fallback — nákvæmt fold-að nafn,
  //       ALDREI summa yfir kennitöluna).
  // Ártala-sagan (y2024–26) + næsta skoðun fylgja (b)/(c) — facts bera þær ekki.
  // Félags-HAUSINN (rollup-línan) summar áfram yfir byggingarnar — rétt þar.
  function bldEquipSt(equip, b, co){
    var st = (equip && equip.match) ? equip.match(b && b.nafn) : null;   // (c)
    if(co && equip){
      var w = equip.wsOf ? equip.wsOf(co.id) : null;                     // (b)
      if(w && w.units>0) st = w;
      var f = equip.factOf ? equip.factOf(co.id) : null;                 // (a)
      if(f && +f.total_devices>0) st = Object.assign({}, st||_blank(), { units:+f.total_devices });
      // 2026-08-23 (Agnar ein-uppspretta / öryggismál): canonical brunnur
      // v_stadur_yfirlit RÆÐUR tækjafjölda + skoðunarmánuði (skýrsla > reikningur;
      // virk/dauð tæki ALDREI). Yfirskrifar nafn/worksite-giskið svo Rekstrarfélög
      // sýni NÁKVÆMLEGA sama og fyrirtækjaprófíllinn (Arnarhvoll: ágúst, ekki janúar
      // sem nafn-strengs-rollupinn gaf). Ártala-dálkarnir (y2024–26) haldast.
      var c = equip.canonOf ? equip.canonOf(co.id) : null;
      if(c){
        st = Object.assign({}, st||_blank());
        // TÆKJAFJÖLDI: canonical (skýrsla > reikningur > handvirkt) þegar hann er til.
        // Sé hann ekki til höldum við fyrri best-giski (facts→worksite→nafn) frekar en
        // að falsa „0" — 0 læsi sem „engin tæki" á stað sem á skýrslu óútdregna í facts.
        var cu = window.CanonStadur ? CanonStadur.countOf(co.id) : null;
        if(cu!=null) st.units = cu;
        // SKOÐUNARMÁNUÐUR (öryggismál): AÐEINS canonical (skýrsla/reikningur). Sé hann
        // ekki til → óþekkt (null). ALDREI nafna-strengs-dagsetningin (t.d. janúar hjá
        // Arnarhvoli) — rangur mánuður = gleymd skoðun = brunahætta. Formúlan býr í 312.
        st.next = window.CanonStadur ? CanonStadur.nextDateOf(co.id) : null;
      }
    }
    return st || null;
  }
  function _todayStr(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  // ---- Supabase Storage → opinbert URL (notað bæði af úttektar- og brunakerfis-skjölum) ----
  function storageUrl(p){
    if(!p) return '';
    var base=String(window.SUPABASE_URL||'').replace(/\/+$/,''); if(!base) return '';
    var s=String(p).replace(/^\/+/,''); var i=s.indexOf('/'); if(i<1) return '';
    return base+'/storage/v1/object/public/'+s.slice(0,i)+'/'+s.slice(i+1).split('/').map(encodeURIComponent).join('/');
  }
  // Storage-first opnun: opinbert Supabase-URL ef til, annars authed Drive-proxy
  // (á brunaholf) — aldrei hrár drive/view hlekkur, aldrei 'sb:'-forskeyti.
  function docUrl(d){
    if(!d) return '';
    var su=storageUrl(d.storage_path); if(su) return su;
    var did=d.drive_file_id;
    if(did && String(did).indexOf('sb:')!==0) return 'https://brunaholf.netlify.app/api/skjal?id='+encodeURIComponent(did);
    return '';
  }

  // ── BRUNAKERFIS-VÍSITALA (2026-07-27, ósk Agnars: „geta líka séð þau sem eru
  //    í brunakerfisþjónustu") ────────────────────────────────────────────────
  // Rekstrarfélaga-síðan sýndi AÐEINS slökkvitækja-hliðina, svo staðir sem eru
  // í brunakerfisþjónustu (t.d. 9 af 10 Center Hótel-húsum) litu út fyrir að
  // vera tómir. Lesum NÁKVÆMLEGA sömu heimildir og Brunakerfi-yfirlit (272) /
  // brunakerfis-prófíllinn (274) — engin ný tafla, engin tvíritun:
  //   · AppSettings.brunakerfi_customers → þjónustukortið (unit_count,
  //     inspect_month, last_inspected) — lykill = fyrirtaeki.id
  //   · customer_documents doc_type='brunakerfi' → ársskýrslur (Drive/Storage)
  //   · brunakerfi_skyrslur → skýrslur sem appið sjálft býr til (draft/final)
  // Næsta skoðun = ár síðustu skoðunar + 1, í skoðunarmánuði félagsins.
  var _bru=null, _bruPromise=null;
  // 2026-07-28 (Agnar: „byrtist þarna líka strax og verður grænn"): vísitalan
  // var áður geymd út alla vafra-lotuna, svo ný skýrsla sem sett var inn á
  // fyrirtækjaprófílinn birtist EKKI hér fyrr en síðan var endurhlaðin. Nú er
  // hún hreinsuð í hvert sinn sem síðan er opnuð (og með ↻ Uppfæra-takkanum) —
  // þetta eru tvær litlar fyrirspurnir, ekki full skönnun.
  function invalidateBru(){ _bru=null; _bruPromise=null; }
  async function getBruIndex(){
    if(_bru) return _bru;
    if(_bruPromise) return _bruPromise;
    _bruPromise=(async function(){
      var byCo={};
      function rec(id){ var k=String(id); return byCo[k]||(byCo[k]={inService:false,units:0,years:{},months:{},latest:0,last:'',month:0,next:null}); }
      try{
        var map=(window.AppSettings&&AppSettings.path&&AppSettings.path('brunakerfi_customers'))||{};
        Object.keys(map).forEach(function(k){
          var m=map[k]; if(!m) return;
          var e=rec(k); e.inService=true;
          e.units=+((m.unit_count)||0)||0;
          e.month=+((m.inspect_month)||0)||0;
          if(m.last_inspected) e.last=String(m.last_inspected);
        });
      }catch(e){}
      var SB=window.__vdaSB||(window.DB&&DB.sb);
      if(SB){
        try{
          var bkRows = await fetchAllRows(SB, 'customer_documents',
            'fyrirtaeki_id,year,drive_file_id,storage_path,doc_date,is_duplicate',
            function(q){ return q.eq('doc_type','brunakerfi').not('fyrirtaeki_id','is',null); });
          {
            bkRows.forEach(function(d){
              if(d.is_duplicate||!d.year) return;
              var e=rec(d.fyrirtaeki_id), y=String(d.year);
              var u=docUrl(d);
              if(!e.years[y]||u) e.years[y]={url:u||'',kind:'rep'};
              var m=d.doc_date?(new Date(d.doc_date).getUTCMonth()+1):0;
              if(m) e.months[y]=m;
              if(+y>e.latest) e.latest=+y;
            });
          }
        }catch(e){ console.warn('[rekstrarfelog] brunakerfi skjöl', e); }
        try{
          var rs=await SB.from('brunakerfi_skyrslur').select('fyrirtaeki_id,year,status');
          (rs.data||[]).forEach(function(s){
            if(s.fyrirtaeki_id==null||!s.year) return;
            var e=rec(s.fyrirtaeki_id), y=String(s.year);
            // Skýrsla úr appinu: 'final' = á skrá (grænn), 'draft' = í vinnslu (blár).
            if(!e.years[y]) e.years[y]={url:'',kind:(s.status==='final'?'rep':'hist')};
            else if(s.status==='final') e.years[y].kind='rep';   // uppfærir drög í „á skrá"
            if(+y>e.latest) e.latest=+y;
          });
        }catch(e){ console.warn('[rekstrarfelog] brunakerfi skýrslur', e); }
      }
      Object.keys(byCo).forEach(function(k){
        var e=byCo[k];
        var baseY = e.last ? +String(e.last).slice(0,4) : e.latest;
        if(!baseY) return;
        var m = e.month || e.months[String(baseY)] || (e.last?+String(e.last).slice(5,7):0) || 1;
        e.next = (baseY+1)+'-'+('0'+m).slice(-2)+'-01';
      });
      _bru={ get:function(id){ return id==null?null:(byCo[String(id)]||null); } };
      return _bru;
    })().catch(function(e){
      console.warn('[rekstrarfelog] brunakerfis-vísitala', e);
      _bruPromise=null;
      return { get:function(){ return null; } };
    });
    return _bruPromise;
  }

  // 2026-06-14 (Todoist): shared-kennitala report bleed. Heimaleiga ehf (kt
  // 510117-0690) runs many buildings (Freyjugata 16, Laugavegur 1/18, Urðarhvarf
  // 2/4, Hamraborg 7 …). Úttektarskýrslur are attached to the *company* record
  // (matched by kt), so every sibling building showed the same report — e.g.
  // Freyjugata's on all of them. For a SHARED kt we now only show a report whose
  // file name matches that building's street + house-number. Unique-kt buildings
  // are completely untouched (fall through to the original fileForYear).
  function sharedKtSet(){
    var data=getData(), counts={}, set={};
    Object.keys(data).forEach(function(n){ (((data[n]||{}).buildings)||[]).forEach(function(b){
      var d=digits(b.kt); if(d) counts[d]=(counts[d]||0)+1; }); });
    Object.keys(counts).forEach(function(d){ if(counts[d]>1) set[d]=true; });
    return set;
  }
  // street prefix (declension-proof) + house number that identifies one building.
  // Bókstafurinn (13 vs 13A) er HLUTI af merkinu — áður féllu Ármúli 13 og 13A
  // á sama num="13".
  function _bldSig(b){
    var m=_norm(((b&&b.nafn)||'')+' '+((b&&b.heimilisfang)||'')).match(/([a-záðéíóúýþæö]{4,})\s*(\d+)([a-d])?/);
    return m ? { street:m[1].slice(0,6), num:m[2], letter:(m[3]||'').toLowerCase() } : null;
  }
  function fileMatchesBuilding(file,b){
    var hay=_norm(file&&(file.name||file.file||'')); if(!hay) return false;
    // (a) street prefix + house number both present in the file name
    var sig=_bldSig(b);
    if(sig && hay.indexOf(sig.street)>=0){
      var numPat = sig.letter
        ? new RegExp('(^|\\D)'+sig.num+sig.letter+'(\\D|$)','i')
        : new RegExp('(^|\\D)'+sig.num+'(?![a-d])(\\D|$)','i');
      if(numPat.test(hay)) return true;
    }
    // (b) a parenthetical building alias, e.g. "Laugavegur 1 (Ice Apartments)"
    //     → matches a report named "ice apartments …" that carries no address.
    var al=(String((b&&b.nafn)||'').match(/\(([^)]+)\)/)||[])[1];
    if(al){ al=_norm(al); if(al.length>=4 && hay.indexOf(al)>=0) return true; }
    return false;
  }
  // building-aware fileForYear: when the kt is shared, require the file name to
  // match THIS building; otherwise identical to the plain fileForYear.
  function fileForYearBld(caMap,key,y,b,ktShared){
    if(!ktShared) return fileForYear(caMap,key,y);
    var list=caMap[key]; if(!Array.isArray(list)) return null;
    return list.find(function(x){ return String(x.year)===y && fileMatchesBuilding(x,b); }) ||
           list.find(function(x){ return x.year==null && new RegExp('\\b'+y+'\\b').test(String(x.name||'')) && fileMatchesBuilding(x,b); }) || null;
  }

  // ---- view rendering ----
  // sortKey/'sortDir': röðun yfirlitstöflunnar — '' = sjálfgefin (félag+bygging)
  // svc = hvaða þjónusta sést í byggingatöflunni: 'both' | 'sl' | 'br' (vistað)
  var _state={ q:'', mode:'firms', fltr:'all', sortKey:'', sortDir:1,
    svc:(function(){ try{ var v=localStorage.getItem('_rf_svc_view'); return (v==='sl'||v==='br'||v==='both')?v:'both'; }catch(e){ return 'both'; } })() };
  function setSvc(v){ _state.svc=v; try{ localStorage.setItem('_rf_svc_view',v); }catch(e){} }
  function viewEl(){ return document.getElementById('view-rekstrarfelog'); }

  async function renderView(){
    var v=viewEl(); if(!v) return;
    injectStyles();
    // Sækjum lifandi rekstrarfélög fyrir fyrstu málun; ef þau eru ekki komin
    // (fyrsta opnun) málum við samt strax með hráu gögnunum og endurmálum þegar
    // lifandi listinn er tilbúinn (getData fléttar hann þá inn).
    if (!_liveRF) { ensureLiveRF().then(function(){ try{ var el=viewEl(); if(el && (el.classList.contains('active') || el.style.display!=='none')) renderView(); }catch(e){} }); }
    var data=getData();
    var nFirms=Object.keys(data).length;
    var html='';
    html+='<div class="rf-page">';
    html+='<div class="rf-phead">'+
          '<button id="_rf_back" class="rf-btn" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>Til baka</button>'+
          '<div style="min-width:0"><h1 class="rf-ptitle">Rekstrarfélög</h1>'+
          '<p class="rf-psub">'+nFirms+' félög · smelltu til að opna</p></div>'+
          '<div class="rf-search">'+
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9aa3b5" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>'+
            '<input id="_rf_q" placeholder="Leita að félagi…" value="'+esc(_state.q)+'">'+
          '</div></div>';
    html+='<div class="rf-phead" style="margin-bottom:18px">'+
          '<button id="_rf_m_firms" class="rf-btn _rf_modebtn" type="button">🏢 Eftir félögum</button>'+
          '<button id="_rf_m_all" class="rf-btn _rf_modebtn" type="button">📋 Allar byggingar</button>'+
          '<span style="margin-left:auto;display:inline-flex;gap:8px">'+
          '<button id="_rf_refresh" class="rf-btn" type="button" title="Sækja skýrslur og tæki upp á nýtt úr gagnagrunni">↻ Uppfæra</button>'+
          '<a href="/rekstrarfelog-uttektir.xlsx" download class="rf-btn">📊 Aðgerðalisti</a>'+
          '<button id="_rf_add" class="rf-btn" type="button">+ Nýtt rekstrarfélag</button></span>'+
          '</div>';
    html+='<div id="_rf_list" class="rf-acclist"></div><div id="_rf_overview" style="display:none"></div></div>';
    v.innerHTML=html;
    var backBtn=v.querySelector('#_rf_back');
    if(backBtn) backBtn.addEventListener('click', function(){
      try{ if(window.App&&App.switchView){ App.switchView('companies'); return; } }catch(e){}
      history.back();
    });
    function styleModeBtns(){
      [['_rf_m_firms','firms'],['_rf_m_all','all']].forEach(function(p){
        var b=v.querySelector('#'+p[0]); if(!b) return;
        b.classList.toggle('is-on', _state.mode===p[1]);
      });
    }
    function applyMode(){
      var list=v.querySelector('#_rf_list'), ov=v.querySelector('#_rf_overview');
      if(_state.mode==='all'){ list.style.display='none'; ov.style.display=''; renderOverview(); }
      else { ov.style.display='none'; list.style.display=''; renderList(); }
      styleModeBtns();
    }
    v.querySelector('#_rf_q').addEventListener('input', function(e){ _state.q=e.target.value; if(_state.mode==='all') renderOverview(); else renderList(); });
    v.querySelector('#_rf_add').addEventListener('click', addFirm);
    // ↻ Uppfæra — hendir ÖLLUM vísitölum og sækir allt upp á nýtt (skýrslur,
    // tæki og lifandi rekstrarfélög úr gagnagrunni).
    var refBtn=v.querySelector('#_rf_refresh');
    if(refBtn) refBtn.addEventListener('click', async function(){
      refBtn.disabled=true; var old=refBtn.textContent; refBtn.textContent='↻ Sæki…';
      invalidateBru(); invalidateEquip();
      _liveRF=null; _liveRFPromise=null;
      try{ await ensureLiveRF(); }catch(e){}
      await renderView();
      if(window.Toast&&Toast.show) Toast.show('✓ Uppfært úr gagnagrunni');
      var nb=viewEl()&&viewEl().querySelector('#_rf_refresh');
      if(nb){ nb.disabled=false; nb.textContent=old; }
    });
    v.querySelector('#_rf_m_firms').addEventListener('click', function(){ _state.mode='firms'; applyMode(); });
    v.querySelector('#_rf_m_all').addEventListener('click', function(){ _state.mode='all'; applyMode(); });
    applyMode();
  }

  // ---- combined overview: all buildings across all firms (totals + flat table) ----
  function computeBldStatus(b, equip, attMap, linkMap, today, caMap, sharedKt){
    var co=companyForBld(b);
    // Per-byggingar talning (facts → worksite → nafn) — sjá bldEquipSt að ofan.
    var st=bldEquipSt(equip, b, co);
    var ktShared=!!(sharedKt&&sharedKt[digits(b.kt)]);
    var att=((!ktShared)&&co&&(attMap[co.id]||attMap[String(co.id)]))||[0,0,0];
    var lks=linkMap[bldLinkKey(b)]||(ktShared?null:linkMap[digits(b.kt)])||{};
    var akey=bldAttachKey(b,co);
    var f23=fileForYearBld(caMap,akey,'2023',b,ktShared),f24=fileForYearBld(caMap,akey,'2024',b,ktShared),
        f25=fileForYearBld(caMap,akey,'2025',b,ktShared),f26=fileForYearBld(caMap,akey,'2026',b,ktShared);
    var units=st?st.units:0;
    var e24=st?st.y2024:0,e25=st?st.y2025:0,e26=st?st.y2026:0;
    var d24=(e24>0)||!!att[0]||!!lks['2024']||!!f24, d25=(e25>0)||!!att[1]||!!lks['2025']||!!f25, d26=(e26>0)||!!att[2]||!!lks['2026']||!!f26;
    var hasRep=!!(att[0]||att[1]||att[2]||f24||f25||f26);
    var lkYears=Object.keys(lks);
    var hasData=units>0||hasRep||d24||d25||d26||lkYears.length>0||!!f23;
    var next=st?st.next:null;
    var overdue=!!(next&&next<today&&hasData);
    var cls = !hasData?'none':(d26?'done':((d24||d25)?'need':'other'));
    return {co:co,units:units,att:att,lks:lks,akey:akey,f23:f23,f24:f24,f25:f25,f26:f26,d23:(!!lks['2023'])||!!f23,d24:d24,d25:d25,d26:d26,hasRep:hasRep,next:next,overdue:overdue,cls:cls,hasData:hasData};
  }
  // shared link renderer for a year-tagged file: Drive-external files
  // (drive_url, no Storage path) link straight out; Storage uploads open via
  // a signed URL through patch 187's _yr-att handler.
  function fileLinkA(file, y, label){
    var title=esc(file.name||'')+' — skjal tengt við '+y+' í fyrirtækinu';
    if(file.drive_url||file.url) return '<a href="'+esc(file.drive_url||file.url)+'" target="_blank" rel="noopener" title="'+title+'" style="color:inherit;text-decoration:none">'+label+' 📄↗</a>';
    return '<a href="#" class="_yr-att" data-path="'+esc(file.path||'')+'" title="'+title+'" style="color:inherit;text-decoration:none">'+label+' 📄</a>';
  }
  function yCellO(done, rep, units, url, file, y){
    var bd='1px solid var(--brd)';
    if(!done) return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center;color:var(--ink4)">·</td>';
    var v=units>0?units:'✓'; var greenish=rep||url||file;
    var col=greenish?'#15803d':'var(--brand)', dot=greenish?'#1C8F60':'#3b82f6';
    var inner=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">'+v+' 📄↗</a>'
      : (file?fileLinkA(file,y,v)
      : (v+(rep?' 📄':'')));
    return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center">'+
      '<span style="display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:12.5px;color:'+col+'">'+
      '<span style="width:6px;height:6px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>'+inner+'</span></td>';
  }
  async function renderOverview(){
    var v=viewEl(); if(!v) return; var box=v.querySelector('#_rf_overview'); if(!box) return;
    box.innerHTML='<div style="color:var(--ink4);padding:16px">Hleð…</div>';
    var data=getData(); var equip=await getEquipIndex();
    var attMap={},linkMap={};
    try{ if(window.AppSettings&&AppSettings.path){ attMap=AppSettings.path('rf_uttekt_att')||{}; linkMap=AppSettings.path('rf_uttekt_links')||{}; } }catch(e){}
    var caMap=getCaMap();
    var sharedKt=sharedKtSet();
    var today=_todayStr();
    var all=[], firms=0;
    Object.keys(data).forEach(function(name){ var blds=(data[name].buildings)||[]; if(blds.length) firms++;
      blds.forEach(function(b,bi){ all.push({firm:name,b:b,bi:bi,s:computeBldStatus(b,equip,attMap,linkMap,today,caMap,sharedKt)}); }); });
    var tot={byg:all.length,done:0,need:0,none:0,overdue:0};
    all.forEach(function(r){ if(r.s.cls==='done')tot.done++; else if(r.s.cls==='need')tot.need++; else if(r.s.cls==='none')tot.none++; if(r.s.overdue)tot.overdue++; });
    var f=_state.fltr||'all', q=_state.q.toLowerCase().trim();
    var rows=all.filter(function(r){
      if(q && !(r.firm.toLowerCase().indexOf(q)>=0 || (r.b.nafn||'').toLowerCase().indexOf(q)>=0 || digits(r.b.kt).indexOf(q.replace(/\D/g,''))>=0)) return false;
      if(f==='done')return r.s.cls==='done'; if(f==='need')return r.s.cls==='need'; if(f==='none')return r.s.cls==='none'; if(f==='overdue')return r.s.overdue; return true;
    });
    // 2026-06-12 (Todoist): smellt á dálkhaus raðar eftir honum (▲/▼ togglar);
    // án vals gildir gamla röðunin félag → bygging.
    function sortVal(r,k){
      switch(k){
        case 'firm':  return r.firm||'';
        case 'byg':   return r.b.nafn||'';
        case 'kt':    return digits(r.b.kt)||'';
        case 'taeki': return +r.s.units||0;
        case 'y23':   return (r.s.d23?1:0)*100000+(+r.s.units||0);
        case 'y24':   return (r.s.d24?1:0)*100000+(+r.s.units||0);
        case 'y25':   return (r.s.d25?1:0)*100000+(+r.s.units||0);
        case 'y26':   return (r.s.d26?1:0)*100000+(+r.s.units||0);
        case 'next':  return r.s.next||'9999-12-31';
        default: return '';
      }
    }
    rows.sort(function(a,b){
      if(_state.sortKey){
        var va=sortVal(a,_state.sortKey), vb=sortVal(b,_state.sortKey);
        var c = (typeof va==='number' && typeof vb==='number') ? (va-vb) : String(va).localeCompare(String(vb),'is');
        if(c!==0) return c*_state.sortDir;
      }
      if(a.firm!==b.firm)return a.firm<b.firm?-1:1; return (a.b.nafn||'')<(b.b.nafn||'')?-1:1;
    });
    // 2026-06-18: calmer stat bar — one card with dot-coded stats + dividers,
    // instead of five separate multicolour "sticker" boxes.
    function stat(dot,num,lab,col){
      return '<div style="display:flex;align-items:center;gap:8px">'+
        (dot?'<span style="width:8px;height:8px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>':'')+
        '<span style="font-size:18px;font-weight:800;color:'+(col||'var(--ink1)')+';font-variant-numeric:tabular-nums">'+num+'</span>'+
        '<span style="font-size:12px;color:var(--ink3)">'+lab+'</span></div>';
    }
    var sep='<span style="width:1px;height:26px;background:var(--brd)"></span>';
    var totHtml='<div class="_ovr-totals" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--brd);border-radius:12px;padding:12px 18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04)">'+
      stat('',firms,'félög')+sep+stat('var(--hairline)',tot.byg,'byggingar')+sep+
      stat('#1C8F60',tot.done,'með úttekt 2026','#15803d')+
      stat('#D99206',tot.need,'vantar 2026','#b7791f')+
      stat('#f97316',tot.none,'engin gögn','#b45309')+
      stat('#ef4444',tot.overdue,'skoðun liðin','#b91c1c')+
      '</div>';
    function chip(key,label){ var on=f===key; return '<button class="_rf_fchip" data-f="'+key+'" style="padding:6px 12px;border:1px solid '+(on?'var(--brand)':'var(--brd2)')+';background:'+(on?'var(--brand)':'var(--surface)')+';color:'+(on?'#fff':'var(--ink2)')+';border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer">'+label+'</button>'; }
    var chips='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+
      chip('all','Allir ('+all.length+')')+chip('done','✓ Með úttekt 2026 ('+tot.done+')')+chip('need','⏳ Vantar 2026 ('+tot.need+')')+chip('none','⚠ Engin gögn ('+tot.none+')')+chip('overdue','⏰ Skoðun liðin ('+tot.overdue+')')+'</div>';
    var bd='1px solid var(--brd)';
    var trs=rows.map(function(r){
      var b=r.b, s=r.s;
      var bname = s.co ? '<a href="#" data-coid="'+s.co.id+'" class="_rf_open" style="color:var(--brand);text-decoration:none">'+esc(b.nafn)+'</a>' : esc(b.nafn)+' <span style="color:var(--brd2);font-size:11px">(ekki í skrá)</span>';
      if (b.stadur_nr!=null && b.stadur_nr!=='') bname += ' <span style="color:#5b6475;font-size:11px;font-family:\'Space Mono\',monospace">nr. '+esc(String(b.stadur_nr))+'</span>';
      var unitCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(s.units>0?'font-weight:600':'color:#b45309')+'">'+(s.units>0?s.units:(s.hasRep?'–':'0'))+'</td>';
      var y23=yCellO(s.d23,false,s.units,s.lks['2023'],s.f23,'2023'),y24=yCellO(s.d24,!!s.att[0],s.units,s.lks['2024'],s.f24,'2024'),y25=yCellO(s.d25,!!s.att[1],s.units,s.lks['2025'],s.f25,'2025'),y26=yCellO(s.d26,!!s.att[2],s.units,s.lks['2026'],s.f26,'2026');
      var nextCell = s.next ? '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(s.overdue?'background:#fef2f2;color:#b91c1c;':'color:var(--ink2);')+'font-variant-numeric:tabular-nums;white-space:nowrap">'+esc(s.next)+(s.overdue?' ⚠':'')+'</td>' : '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;color:var(--brd2)">—</td>';
      return '<tr>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+';color:var(--ink2);white-space:nowrap">'+esc(r.firm)+'</td>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+'">'+bname+'</td>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+';color:var(--ink3);font-variant-numeric:tabular-nums;white-space:nowrap">'+fmtKt(b.kt)+'</td>'+
        unitCell+y23+y24+y25+y26+nextCell+'</tr>';
    }).join('');
    if(!trs) trs='<tr><td colspan="9" style="padding:16px;text-align:center;color:var(--ink4)">Ekkert fannst.</td></tr>';
    box.innerHTML='<div class="noprint" style="display:flex;justify-content:flex-end;margin-bottom:8px"><button id="_rf_print" style="padding:7px 13px;border:1px solid var(--brand);background:var(--brand);color:#fff;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">🖨 Prenta skýrslu</button></div>'+totHtml+chips+
      '<div style="overflow-x:auto;background:var(--surface);border:1px solid var(--brd);border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>'+
      sth('firm','Rekstrarfélag','left','6px')+
      sth('byg','Bygging','left','6px')+
      sth('kt','Kennitala','left','6px')+
      sth('taeki','Tæki','center','4px')+
      sth('y23','2023','center','4px')+
      sth('y24','2024','center','4px')+
      sth('y25','2025','center','4px')+
      sth('y26','2026','center','4px')+
      sth('next','Næsta skoðun','center','6px')+
      '</tr></thead><tbody>'+trs+'</tbody></table></div>';
    function sth(k,label,align,pad){
      var on=_state.sortKey===k;
      var arrow=on?(_state.sortDir===1?' ▲':' ▼'):'';
      return '<th class="_rf_sth" data-k="'+k+'" title="Raða eftir '+esc(label)+'" style="text-align:'+align+';color:'+(on?'var(--ink1)':'var(--ink3)')+';font-size:12px;padding:8px '+pad+';border-bottom:1px solid var(--brd);cursor:pointer;user-select:none;white-space:nowrap">'+esc(label)+arrow+'</th>';
    }
    box.querySelectorAll('._rf_sth').forEach(function(h){ h.addEventListener('click', function(){
      var k=h.getAttribute('data-k');
      if(_state.sortKey===k){ if(_state.sortDir===1){ _state.sortDir=-1; } else { _state.sortKey=''; _state.sortDir=1; } }
      else { _state.sortKey=k; _state.sortDir=1; }
      renderOverview();
    }); });
    box.querySelectorAll('._rf_fchip').forEach(function(c){ c.addEventListener('click', function(){ _state.fltr=c.getAttribute('data-f'); renderOverview(); }); });
    box.querySelectorAll('._rf_open').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    var _pb=box.querySelector('#_rf_print'); if(_pb) _pb.onclick=function(){ if(window.SlokkPrint) window.SlokkPrint('Rekstrarfélög — byggingar og úttektir', box, true); };
  }

  async function renderList(){
    var v=viewEl(); if(!v) return; var box=v.querySelector('#_rf_list'); if(!box) return;
    var data=getData(); var q=_state.q.toLowerCase().trim();
    var names=Object.keys(data);
    box.innerHTML='';
    var shown=0;
    // Hero-yfirferðartölur (⚠ liðin skoðun per félag) — sama status-lógík og
    // yfirlitið, reiknað einu sinni fyrir öll félög.
    var overdueByFirm={}, bruByFirm={};
    try {
      var equip=await getEquipIndex();
      var bruIx=await getBruIndex();
      var attMap={},linkMap={};
      try{ if(window.AppSettings&&AppSettings.path){ attMap=AppSettings.path('rf_uttekt_att')||{}; linkMap=AppSettings.path('rf_uttekt_links')||{}; } }catch(e){}
      var caMap=getCaMap(), sharedKt=sharedKtSet(), today=_todayStr();
      names.forEach(function(name){
        var n=0, seenBru={};
        ((data[name]||{}).buildings||[]).forEach(function(b){
          try{ if(computeBldStatus(b,equip,attMap,linkMap,today,caMap,sharedKt).overdue) n++; }catch(e){}
          // 2026-07-27: hversu margir staðir félagsins eru í brunakerfisþjónustu
          // (hver fyrirtækja-röð talin einu sinni — sjá firstTime í _fillBodyInner)
          try{ var c=companyForBld(b), x=c?bruIx.get(c.id):null;
            if(x && (x.inService || Object.keys(x.years||{}).length)) seenBru[c.id]=1; }catch(e){}
        });
        overdueByFirm[name]=n; bruByFirm[name]=Object.keys(seenBru).length;
      });
    } catch(e){ console.warn('[rekstrarfelog] hero counts', e); }
    if(box!==((viewEl()||{}).querySelector? viewEl().querySelector('#_rf_list'):box)) return; // view re-rendered meanwhile
    names.forEach(function(name){
      var info=data[name]; var blds=info.buildings||[];
      var match=!q || name.toLowerCase().indexOf(q)>=0 || (info.emails||[]).some(function(e){return e.toLowerCase().indexOf(q)>=0;}) ||
        blds.some(function(b){return (b.nafn||'').toLowerCase().indexOf(q)>=0 || digits(b.kt).indexOf(q.replace(/\D/g,''))>=0;});
      if(!match) return; shown++;
      var card=document.createElement('div');
      card.className='_rf_card rfa';
      var subBits=[];
      if(info.kt) subBits.push('kt. '+fmtKt(info.kt));
      if((info.emails||[]).length) subBits.push(info.emails[0]);
      else if(info.domain) subBits.push(info.domain);
      var ov=overdueByFirm[name]||0, nb=bruByFirm[name]||0;
      card.innerHTML=
        '<button class="_rf_head rfa__head" type="button">'+
          '<span class="rfa__logo"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg></span>'+
          '<span class="rfa__id">'+
            '<span class="rfa__name">'+esc(name)+'</span>'+
            '<span class="rfa__sub">'+esc(subBits.join(' · ')||'—')+'</span>'+
          '</span>'+
          '<span class="rfa__pills">'+
            '<span class="rf-pill rf-pill--ghost">🏢 '+blds.length+' byggingar</span>'+
            (nb>0?'<span class="rf-pill rf-pill--bru" title="Staðir félagsins í brunakerfisþjónustu">🚨 '+nb+'</span>':'')+
            (ov>0?'<span class="rf-pill rf-pill--overdue">⚠ '+ov+'</span>':'')+
            '<span class="rfa__chev">⌄</span>'+
          '</span>'+
        '</button>'+
        '<div class="rfa__body"><div class="rfa__pad">'+
          // 2026-06-12 (Todoist): athugasemd beint á borðanum — vistast sjálfkrafa
          '<input class="_rf_note" value="'+esc(info.notes||'')+'" placeholder="Athugasemd um rekstraraðilann — vistast sjálfkrafa">'+
          '<div class="_rf_body"></div>'+
        '</div></div>';
      var body=card.querySelector('._rf_body');
      function flip(){
        var open=!card.classList.contains('is-open');
        card.classList.toggle('is-open',open);
        if(open && !body.dataset.filled){ body.dataset.filled='1'; fillBody(body,name,info); }
      }
      card.querySelector('._rf_head').addEventListener('click',flip);
      var noteInp=card.querySelector('._rf_note');
      noteInp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); noteInp.blur(); } });
      noteInp.addEventListener('blur',async function(){
        var val=noteInp.value.trim();
        var d=getData(); if(!d[name]) d[name]=info;
        if((d[name].notes||'')===val) return;
        d[name].notes=val; info.notes=val;
        await saveData(d, name);
        if(window.Toast&&Toast.show) Toast.show('✓ Vistað');
      });
      // Rotandi akstursleið-chip á félaginu (úthlutar öllum stöðum þess) — situr
      // fremst í pillu-röðinni, vinstra megin við ⌄. Smellur flettur (stopPropagation).
      try{
        var pills=card.querySelector('.rfa__pills');
        if(pills){ var chev=pills.querySelector('.rfa__chev'); var akc=makeRfAksturChip(function(){return coIdsForBlds(blds);});
          if(chev) pills.insertBefore(akc, chev); else pills.appendChild(akc); }
      }catch(e){}
      box.appendChild(card);
    });
    if(!shown) box.innerHTML='<div style="color:#3a4250;background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 16px 40px -22px rgba(10,20,50,.65)">Ekkert fannst.</div>';
  }

  // 2026-06-12 (Todoist „wont open"): fillBody gat strandað á „Hleð…" að
  // eilífu ef eitthvað í samsetningunni kastaði (equip-index, skjalalisti,
  // gölluð byggingarröð). Nú: try/catch utan um allt + ↺ Reyna aftur.
  async function fillBody(body, name, info){
    body.innerHTML='<div style="color:var(--ink4);font-size:13px">Hleð…</div>';
    try {
      // Always re-read live merge so an accordion opened on the seed snapshot
      // (4 Heimaleiga aliases) picks up all 15 sites once ensureLiveRF finishes.
      var fresh = (getData()[name]) || info;
      await _fillBodyInner(body, name, fresh);
    } catch (e) {
      console.warn('[rekstrarfelog] fillBody', e);
      body.innerHTML='<div style="color:#b91c1c;font-size:13px;padding:6px 0">⚠ Villa við að hlaða: '+esc((e&&e.message)||String(e))+
        ' <button class="_rf_retry" type="button" style="margin-left:8px;padding:4px 10px;border:1px solid var(--brd2);background:var(--surface);border-radius:6px;cursor:pointer;font:inherit;font-size:12px">↺ Reyna aftur</button></div>';
      var rb=body.querySelector('._rf_retry');
      if(rb) rb.onclick=function(){ fillBody(body,name,info); };
    }
  }
  async function _fillBodyInner(body, name, info){
    var blds=info.buildings||[];
    blds.sort(function(a,c){
      var na=parseInt(a.stadur_nr,10), nc=parseInt(c.stadur_nr,10);
      var ha=a.stadur_nr!=null && a.stadur_nr!=='' && Number.isFinite(na);
      var hc=c.stadur_nr!=null && c.stadur_nr!=='' && Number.isFinite(nc);
      if (ha && hc && na!==nc) return na-nc;
      if (ha && !hc) return -1;
      if (!ha && hc) return 1;
      return String(a.nafn||'').localeCompare(String(c.nafn||''),'is');
    });
    var equip=await getEquipIndex();
    var attMap={}; try{ if(window.AppSettings&&AppSettings.path){ attMap=AppSettings.path('rf_uttekt_att')||{}; } }catch(e){}
    var linkMap={}; try{ if(window.AppSettings&&AppSettings.path){ linkMap=AppSettings.path('rf_uttekt_links')||{}; } }catch(e){}
    var caMap=getCaMap();
    var sharedKt=sharedKtSet();
    var today=_todayStr();
    // per-firm tally
    var n2026=0, nNeed=0, nNone=0, nOverdue=0;
    var bd='1px solid var(--brd)';
    // 2026-07-27: brunakerfið kemur inn við hliðina á slökkvitækjunum.
    var bru = await getBruIndex();
    var CURY = String(new Date().getFullYear());
    var showSl = _state.svc!=='br', showBr = _state.svc!=='sl';
    var totSl=0, totBr=0, slDoneCur=0, brDoneCur=0, nBruSvc=0;
    // 2026-07-29 (ósk Agnars): raunverulegar heimsóknartölur (Samtals m. vsk úr
    // kostnaðartöflunni, geymdar af 129 í slokk_trip_<coId>.computed) safnast hér
    // og trompa áætlunina í gullkassanum fyrir þær byggingar sem eiga þær.
    var realSum=0, realN=0, realUnits=0;
    // Tekjuforsendur félagsins (hoistað upp fyrir byggingalykkju svo áætlun
    // hverrar byggingar geti notað hennar EIGIN tilboðsverð + fastan afslátt).
    function _noteNum(re){ var m=String(info.notes||'').match(re); return m?+String(m[1]).replace(/\./g,''):0; }
    var revY = (info.rev_yfirferd!=null&&info.rev_yfirferd!=='') ? +info.rev_yfirferd : (_noteNum(/yfirfer[ðd][^0-9]{0,10}(\d[\d.]*)/i)||2700);
    var revH = (info.rev_hledsla!=null&&info.rev_hledsla!=='') ? +info.rev_hledsla : (_noteNum(/hle[ðd]sla[^0-9]{0,10}(\d[\d.]*)/i)||4400);
    var revHpct = (info.rev_hledsla_pct!=null&&info.rev_hledsla_pct!=='') ? +info.rev_hledsla_pct : 20;
    var estMix=0, estOvN=0;
    // Tvær byggingar geta lent á SAMA fyrirtæki (t.d. „Center Hótel - Grandi"
    // og „Center Hótel – Grandi" — bandstrik vs. þankastrik falla saman í
    // companyForBld/equip-nafnaleitinni). Raðirnar standa áfram hvor í sínu
    // lagi, en tölfluspjöldin telja hvern stað BARA EINU SINNI.
    var _counted={};
    function firstTime(co,b){
      var k = co ? ('co:'+co.id) : ('nm:'+_compact(b&&b.nafn));
      if(_counted[k]) return false;
      _counted[k]=1; return true;
    }
    // ── árs-frumur (dark-metal ycell pills) ───────────────────────────────────
    // grænn = skýrsla á skrá (hlekkur/viðhengi), blár = aðeins í búnaðarsögu /
    // í vinnslu, · = ekkert. Í „Bæði"-sýn er EFRI línan slökkvitæki og NEÐRI
    // brunakerfi — sama röð og dálkhausinn segir (🧯 SLÖKKVI / 🚨 BRUNA).
    // Örlítið "🧾" merki í hverri pillu þegar reikningur ÞESSA árs/þjónustu er
    // þegar paraður við skýrsluna (Brunahólf's document_pairs, sjá patch 199)
    // — 2026-08-05, ósk Agnars: "add tiny marking that shows that invoice is
    // in the bundle". Reiknað per rekstrarfélag (batch) rétt fyrir row-lykkjuna.
    function bundleTag(bundled){ return bundled ? '<b class="rf-bundle-tag" title="Reikningur paraður við skýrsluna (bundle)">🧾</b>' : ''; }
    function yPillSl(done, rep, units, url, file, y, bundled){
      if(!done) return '<span class="rf-ycell rf-ycell--none">·</span>';
      var v = units>0 ? String(units) : '✓';
      var greenish = rep || url || file;
      var kind = greenish ? 'done' : 'hist';
      var tip = (greenish?'Úttektarskýrsla á skrá':'Aðeins skráð í búnaðarsögu')+' · slökkvitæki · '+y+(bundled?' · 🧾 reikningur paraður':'');
      var inner = url ? '<a href="'+esc(url)+'" target="_blank" rel="noopener" title="Opna úttektarskýrslu í Google Drive">'+v+' 📄↗</a>'
        : (file ? fileLinkA(file,y,v)
        : (v+(rep?' 📄':'')));
      return '<span class="rf-ycell rf-ycell--'+kind+'" title="'+esc(tip)+'"><i></i>'+inner+bundleTag(bundled)+'</span>';
    }
    function yPillBr(cell, units, y, bundled){
      if(!cell) return '<span class="rf-ycell rf-ycell--none">·</span>';
      var kind = cell.kind==='rep' ? 'done' : 'hist';
      var v = units>0 ? String(units) : '✓';
      var tip = (kind==='done'?'Brunakerfisskýrsla á skrá':'Brunakerfisskýrsla í vinnslu')+' · '+y+(bundled?' · 🧾 reikningur paraður':'');
      var inner = cell.url ? '<a href="'+esc(cell.url)+'" target="_blank" rel="noopener" title="Opna brunakerfisskýrslu">'+v+' 📄↗</a>' : (v+' 📄');
      return '<span class="rf-ycell rf-ycell--'+kind+'" title="'+esc(tip)+'"><i></i>'+inner+bundleTag(bundled)+'</span>';
    }
    // 2026-08-06 (ósk Agnars): fyrir ÞETTA ÁR — í stað tóms „·" þegar skýrslan
    // er ekki komin enn, sýnum lit-kóðaðan status miðað við næstu skoðunar-
    // dagsetningu: gult = á áætlun (skoðun ókomin), rautt = liðið. Sömu tvö
    // stig og efstu samantektarpillurnar (rf-pill--pending/--overdue).
    function yPillDue(hasNext, overdue){
      var kind = overdue ? 'overdue' : 'due';
      var tip = overdue ? 'Skoðun liðin — engin skýrsla enn' : (hasNext ? 'Á áætlun — skoðun ókomin' : 'Skýrsla ekki komin enn');
      return '<span class="rf-ycell rf-ycell--'+kind+'" title="'+esc(tip)+'"><i></i>'+(overdue?'⚠':'…')+'</span>';
    }
    // ── compact ártölu-pillur fyrir „Skoðanir · Skjöl" strimilinn (eins og 153/187) ──
    // ártalan sjálf er merkið; skjala-örpunktur (grænn) undir segir að skýrsla sé
    // á skrá. Pillan er hlekkur þegar skýrsla er til (Drive-url eða upphlaðið skjal
    // gegnum patch 187's _yr-att-höndlara), annars stakur reitur.
    function _yrPill(cls, tip, yy, url, file){
      var t = esc(tip);
      if(url) return '<a href="'+esc(url)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="'+cls+'" title="'+t+'">'+yy+'</a>';
      if(file){
        var fu = file.drive_url||file.url;
        if(fu) return '<a href="'+esc(fu)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="'+cls+'" title="'+t+'">'+yy+'</a>';
        return '<a href="#" class="'+cls+' _yr-att" data-path="'+esc(file.path||'')+'" onclick="event.stopPropagation()" title="'+t+'">'+yy+'</a>';
      }
      return '<span class="'+cls+'" title="'+t+'">'+yy+'</span>';
    }
    function _yrDot(pillHtml, hasRep, bundled){
      // 2026-08-22 (ósk Agnars „bæta punktunum við"): TVEIR örpunktar undir hverri
      // pillu eins og í Ársskoðun — grænn = úttektarskýrsla á skrá, blár =
      // reikningur ÞESSA árs paraður. Pillan helst föst 34px og punktarnir 5px
      // miðjaðir í 38px frumunni svo árin standi áfram í beinum lóðréttum súlum
      // (uppfærir „engir punktar"-ákvörðunina frá 21.08). Staðan sést líka í titli.
      return '<span class="rf-dd">'+pillHtml+
        '<u><i class="'+(hasRep?'rep':'')+'"></i><i class="'+(bundled?'inv':'')+'"></i></u>'+
        '</span>';
    }
    // slökkvitæki ártölu-pilla fyrir eitt ár
    function yrMiniSl(y, done, rep, url, file, units, bundled, isCur, hasData, over, hasNext){
      var yy=y.slice(-2), state, tip;
      if(isCur && !done && hasData){ state = over?'overdue':'due';
        tip = over?('Skoðun liðin — engin skýrsla enn · '+y):(hasNext?('Á áætlun — skoðun ókomin · '+y):('Skýrsla ekki komin enn · '+y)); }
      else if(!done){ state='none'; tip='Engin skýrsla · slökkvitæki · '+y; }
      else { var greenish=rep||url||file; state=greenish?'done':'hist';
        tip=(greenish?'Úttektarskýrsla á skrá':'Aðeins skráð í búnaðarsögu')+' · slökkvitæki · '+y+(units>0?(' · '+units+' tæki'):'')+(bundled?' · 🧾 reikningur paraður':''); }
      var pill = (state==='none'||state==='due'||state==='overdue')
        ? '<span class="rf-yr rf-yr--'+state+'" title="'+esc(tip)+'">'+yy+'</span>'
        : _yrPill('rf-yr rf-yr--'+state, tip, yy, url, file);
      return _yrDot(pill, state==='done', bundled && state==='done');
    }
    // brunakerfi ártölu-pilla fyrir eitt ár
    function yrMiniBr(y, cell, units, bundled, isCur, hasData, over, hasNext){
      var yy=y.slice(-2), state, tip, url=cell?cell.url:'';
      if(isCur && !cell && hasData){ state=over?'overdue':'due';
        tip=over?('Brunakerfisskoðun liðin — engin skýrsla enn · '+y):(hasNext?('Á áætlun — brunakerfisskoðun ókomin · '+y):('Brunakerfisskýrsla ekki komin enn · '+y)); }
      else if(!cell){ state='none'; tip='Engin brunakerfisskýrsla · '+y; }
      else { state=cell.kind==='rep'?'done':'hist';
        tip=(state==='done'?'Brunakerfisskýrsla á skrá':'Brunakerfisskýrsla í vinnslu')+' · '+y+(units>0?(' · '+units+' búnaður'):'')+(bundled?' · 🧾 reikningur paraður':''); }
      var pill = (state==='none'||state==='due'||state==='overdue')
        ? '<span class="rf-yr rf-yr--'+state+'" title="'+esc(tip)+'">'+yy+'</span>'
        : _yrPill('rf-yr rf-yr--'+state, tip, yy, url, null);
      return _yrDot(pill, state==='done', bundled && state==='done');
    }
    // Staflar slökkvitækja-/brunakerfis-frumu eftir völdum þjónusturofa.
    // brOn=false → sleppa brunakerfis-línunni fyrir byggingu sem er EKKI í
    // brunakerfisþjónustu (ósk Agnars 2026-07-28: „taka út brunakerfisþjónustu
    // hjá þeim sem eru ekki skráð í þá þjónustu"). Sjálfgefið true.
    function stackTd(slHtml, brHtml, cls, brOn){
      var p=[];
      if(showSl) p.push('<span>'+slHtml+'</span>');
      if(showBr && brOn!==false) p.push('<span>'+brHtml+'</span>');
      return '<td class="c'+(cls?' '+cls:'')+'"><div class="rf-stack">'+p.join('')+'</div></td>';
    }
    // Tvílínu-lykill undir dálkhaus (🧯 SLÖKKVI / 🚨 BRUNA) — fylgir rofanum,
    // svo röðin í hausnum sé alltaf sama röð og frumurnar fyrir neðan.
    function svcKey(){
      if(_state.svc!=='both') return '';
      return '<span class="rf-yh__k"><i class="sl">🧯 SLÖKKVI</i><i class="br">🚨 BRUNA</i></span>';
    }
    function nextPill(date, svc, overdue){
      var icon = svc==='sl' ? '🧯' : '🚨';
      if(!date) return '<span class="rf-next rf-next--none">'+icon+' —</span>';
      return overdue
        ? '<span class="rf-next rf-next--overdue">'+icon+' ⚠ '+esc(date)+'</span>'
        : '<span class="rf-next rf-next--ok">'+icon+' '+esc(date)+'</span>';
    }
    // 2026-07-15 (Agnar: „skjölin uppfærast aldrei … eldgömul nöfn og tengingar"):
    // lesum úttektarskýrslur LIFANDI úr customer_documents (sama uppspretta og
    // Kerfis-kort + öll tengitól dagsins skrifa í) — per staðar-id (fyrirtaeki_id).
    // Gömlu handfærslurnar (linkMap/viðhengi) halda sér sem fallback.
    var liveDocs = {};   // co.id → { '2026': driveUrl, … }
    var coIds = blds.map(function(b){ var c=companyForBld(b); return c?c.id:null; }).filter(function(x){return x!=null;});
    try {
      if (coIds.length && window.DB && DB.sb) {
        // Skýrslur sem appið/Cowork býr til liggja í Supabase Storage og bera AÐEINS
        // `storage_path` (ekkert drive_file_id) — þær duttu því út úr árs-dálkunum
        // og litu út fyrir að vanta. Taka báðar gerðir með (sbr. patch 187/199).
        var ld = await DB.sb.from('customer_documents')
          .select('fyrirtaeki_id,year,drive_file_id,storage_path,doc_type,is_duplicate')
          .in('fyrirtaeki_id', coIds).eq('doc_type','uttektarskyrsla');
        (ld.data||[]).forEach(function(d){
          if (d.is_duplicate || !d.year) return;
          var u = docUrl(d);
          if (!u) return;
          var k = String(d.fyrirtaeki_id);
          (liveDocs[k] = liveDocs[k] || {})[String(d.year)] = u;
        });
      }
    } catch(e) { console.warn('[rekstrarfelog] liveDocs', e); }
    // ── document_pairs — sama regla og 187/199: pör MEÐ fyrirtaeki_id tilheyra
    // AÐEINS þeim stað. Áður var lyklað á customer_base_id → eitt 2026-par á
    // Heimaleigu (base 293) kveikti 🧾 á ÖLLUM 10 húsunum. Pör ÁN staðar
    // (eldri raðir) eru aðeins notuð þegar sú kt á nákvæmlega EINN stað hér.
    var baseByKt={}, pairByCo={}, pairByBaseLoose={}, sitesPerBase={};
    try {
      var ktDigits = blds.reduce(function(acc,b){ var d=digits(b.kt); if(d&&d.length>=10&&d!=='9999999999'&&acc.indexOf(d)<0) acc.push(d); return acc; }, []);
      if (ktDigits.length && window.DB && DB.sb) {
        var dashKts = ktDigits.map(function(d){ return d.slice(0,6)+'-'+d.slice(6); });
        var br = await DB.sb.from('customers_base').select('id,kennitala').in('kennitala', dashKts);
        (br.data||[]).forEach(function(x){ baseByKt[digits(x.kennitala)] = x.id; });
        blds.forEach(function(b){
          var bid = (b.customer_base_id!=null ? b.customer_base_id : baseByKt[digits(b.kt)]);
          if (bid!=null) sitesPerBase[bid] = (sitesPerBase[bid]||0)+1;
        });
        var baseIds = Object.keys(baseByKt).map(function(k){ return baseByKt[k]; }).filter(function(v,i,a){ return a.indexOf(v)===i; });
        if (baseIds.length) {
          var pr = await DB.sb.from('document_pairs').select('customer_base_id,fyrirtaeki_id,year,service_type,invoice_doc_id,solur_id').in('customer_base_id', baseIds);
          var tegByInv = {};
          var invIds = [];
          (pr.data||[]).forEach(function(x){ if (x && x.invoice_doc_id) invIds.push(x.invoice_doc_id); });
          try {
            for (var ii = 0; ii < invIds.length; ii += 100) {
              var chunk = invIds.slice(ii, ii + 100);
              var tr = await DB.sb.from('customer_documents').select('id,vidskiptategund').in('id', chunk).limit(chunk.length);
              (tr.data||[]).forEach(function(d){ tegByInv[d.id] = String(d.vidskiptategund||'').toLowerCase(); });
            }
          } catch (e) {
            if (typeof window.logProblem === 'function') {
              window.logProblem('rekstrarfelog', 'pair_invoice_tegund_failed');
            }
          }
          (pr.data||[]).forEach(function(x){
            if (!(x.invoice_doc_id || x.solur_id)) return;
            // Cross-typed pair (úttekt-par á brunakerfis-reikningi) kveikir EKKI
            // 🧾 á rangri strimlu. Óþekkt tegund = fail-open.
            if (x.invoice_doc_id && tegByInv[x.invoice_doc_id]) {
              var t = tegByInv[x.invoice_doc_id];
              if (t === 'bud') return;
              if (t === 'brunakerfi' && x.service_type !== 'brunakerfi') return;
              if (t === 'uttekt' && x.service_type !== 'uttekt') return;
            }
            var key = x.year+'|'+x.service_type;
            if (x.fyrirtaeki_id != null) {
              (pairByCo[String(x.fyrirtaeki_id)] = pairByCo[String(x.fyrirtaeki_id)] || {})[key] = true;
            } else if (x.customer_base_id != null) {
              (pairByBaseLoose[x.customer_base_id] = pairByBaseLoose[x.customer_base_id] || {})[key] = true;
            }
          });
        }
      }
    } catch(e) { console.warn('[rekstrarfelog] bundlePairs', e); }
    // Payday per STAÐ: R-númer úr solur.customer_id (= fyrirtaeki.id), svo PD-númer
    // úr speglinum á reference. Aldrei „allar kröfur kennitölunnar" á hverja línu
    // (Urðarhvarf 2 = R-000719/PD 208; Máni á ekkert af Heimaleigu-kröfunum).
    var pdByCo = {};
    try {
      if (coIds.length && window.DB && DB.sb) {
        var sr = await DB.sb.from('solur').select('num,customer_id,created_at').in('customer_id', coIds).order('created_at', { ascending: false }).limit(800);
        var latest = {};
        (sr.data||[]).forEach(function(s){
          if (s.customer_id==null || !s.num) return;
          var k = String(s.customer_id);
          if (!latest[k]) latest[k] = s.num;
        });
        var refs = Object.keys(latest).map(function(k){ return latest[k]; });
        var pdMap = {};
        if (refs.length) {
          var pdr = await DB.sb.from('payday_invoices_slokk').select('number,reference,paid_date').in('reference', refs);
          (pdr.data||[]).forEach(function(p){ if (p.reference) pdMap[String(p.reference)] = p; });
        }
        Object.keys(latest).forEach(function(k){
          var rnum = latest[k];
          var p = pdMap[rnum];
          pdByCo[k] = { r: rnum, pd: p ? String(p.number||'') : '', paid: !!(p && p.paid_date) };
        });
      }
    } catch(e) { console.warn('[rekstrarfelog] paydayBySite', e); }
    // building table
    var rows=blds.map(function(b,_bi){
      var co=companyForBld(b);
      var link= co ? '<a href="#" data-coid="'+co.id+'" class="_rf_open" title="'+esc(b.nafn)+'">'+esc(b.nafn)+'</a>'
                   : '<span title="'+esc(b.nafn)+'">'+esc(b.nafn)+'</span> <span style="color:#9098a6;font-size:11px;font-weight:400">(ekki í skrá)</span>';
      var doc = co ? '<a href="#" data-coid="'+co.id+'" class="_rf_docs" style="font-size:12px;color:#1d4ed8;text-decoration:underline">skjöl</a>' : '';
      // Per-byggingar talning (facts → worksite → nafn) — sjá bldEquipSt að ofan.
      // Áður equip.match(b.nafn) eitt og sér: sam-nefndar byggingar sömu kt
      // sýndu þá báðar kt-summuna í Tæki-dálknum.
      var st = bldEquipSt(equip, b, co);
      var ktShared = !!(sharedKt && sharedKt[digits(b.kt)]);
      var att = ((!ktShared) && co && (attMap[co.id]||attMap[String(co.id)])) || [0,0,0];
      var lks = linkMap[bldLinkKey(b)] || (ktShared?null:linkMap[digits(b.kt)]) || {};
      // Lifandi skjöl úr customer_documents trompa gamlar handfærslur.
      if (co && liveDocs[String(co.id)]) { lks = Object.assign({}, lks, liveDocs[String(co.id)]); }
      var akey = bldAttachKey(b, co);
      var f23=fileForYearBld(caMap,akey,'2023',b,ktShared), f24=fileForYearBld(caMap,akey,'2024',b,ktShared),
          f25=fileForYearBld(caMap,akey,'2025',b,ktShared), f26=fileForYearBld(caMap,akey,'2026',b,ktShared);
      var units = st ? st.units : 0;
      var e24=st?st.y2024:0, e25=st?st.y2025:0, e26=st?st.y2026:0;
      var d23=!!lks['2023']||!!f23;
      var d24=(e24>0)||!!att[0]||!!lks['2024']||!!f24, d25=(e25>0)||!!att[1]||!!lks['2025']||!!f25, d26=(e26>0)||!!att[2]||!!lks['2026']||!!f26;
      var hasRep = !!(att[0]||att[1]||att[2]||f24||f25||f26);
      var lkYears = Object.keys(lks);
      var slHasData = units>0 || hasRep || d24 || d25 || d26 || lkYears.length>0 || !!f23;
      // ── brunakerfis-hlið sömu byggingar (sami staður = sama fyrirtaeki-röð) ──
      var bx = co ? bru.get(co.id) : null;
      var bUnits = bx ? (bx.units||0) : 0;
      var bY = bx ? (bx.years||{}) : {};
      var bHasData = !!(bx && (bx.inService || Object.keys(bY).length));
      // „Í brunakerfisþjónustu" = skráð í þjónustukortið (brunakerfi_customers → inService),
      // EKKI bara að stakt brunakerfis-skjal sé til í kerfinu. Ósk Agnars 2026-08-20:
      // „dont show the brunakerfisþjónusta in companies that dont have them" — svo
      // brunakerfis-línan (🚨) birtist AÐEINS fyrir byggingar sem eru raunverulega í
      // þjónustunni; hinar falla saman í eina línu (slökkvitæki). bHasData er áfram
      // notað fyrir samtölur/röð-rönd (staks-skjals byggingar teljast enn með gögn).
      var bruInSvc = !!(bx && bx.inService);
      var bOver = !!(bx && bx.next && bx.next < today);
      if (firstTime(co,b)) {
        if (bHasData) nBruSvc++;
        totSl += units; totBr += bUnits;
        if (d26) slDoneCur++;
        if (bY[CURY] && bY[CURY].kind==='rep') brDoneCur++;
        // raunveruleg heimsóknartala þessa árs (frá 129), ef til
        // Raunveruleg heimsóknartala þessa árs (frá 129) dekkar tækin sem hún
        // náði yfir; tæki umfram það (líka í sömu byggingu — fuzzy-talning
        // getur eignað einni byggingu tæki alls félagsins) fara í áætlun.
        var _estUnits = units;
        if (co) { try {
          var _tc = JSON.parse(localStorage.getItem('slokk_trip_'+co.id)||'{}');
          if (_tc.computed && +_tc.computed.total > 0 && String(_tc.computed.at||'').slice(0,4) === CURY) {
            var _cov = Math.min(units, Math.max(1, +_tc.computed.units || 0));
            realSum += +_tc.computed.total; realN++;
            realUnits += _cov;
            _estUnits = units - _cov;
          }
        } catch(_) {} }
        // áætlun (óraunreiknuðu tækin) — með tilboðsverðum byggingarinnar
        // (Yfirferð/Hleðsla úr company_pricing, kt-samnýtt í Sölu/129) og
        // föstum afslætti þar sem ekkert sérverð er.
        if (_estUnits > 0) {
          // Regla Agnars 29.07: sérverð er ENDANLEGT — fasti afslátturinn (_d)
          // leggst aðeins á liði sem hafa EKKI tilboðsverð.
          var _y=revY, _h=revH, _d=0, _ovY=false, _ovH=false;
          if (co) {
            _d = Math.max(0, Math.min(100, +co.afslattur_pct || 0));
            try {
              var _cp = (window.AppSettings && AppSettings.path && AppSettings.path('company_pricing')) || {};
              (_cp[co.id] || _cp[String(co.id)] || []).forEach(function(o){
                var n = String(o.name||'').toLowerCase();
                if (n.indexOf('yfirfer') >= 0) { _y = +o.price_ex_vat || _y; _ovY = true; }
                if (n.indexOf('hleðsl') >= 0 || n.indexOf('hledsl') >= 0) { _h = +o.price_ex_vat || _h; _ovH = true; }
              });
            } catch(_) {}
          }
          if (_ovY || _ovH || _d > 0) estOvN++;
          estMix += _estUnits*_y*(_ovY?1:(1-_d/100)) + Math.round(_estUnits*(revHpct/100))*_h*(_ovH?1:(1-_d/100));
        }
      }
      // Samtölur borðans fylgja völdum þjónusturofa.
      var hasData = (showSl&&slHasData) || (showBr&&bHasData);
      var curDone = (showSl&&d26) || (showBr&&!!bY[CURY]);
      var anyOlder = (showSl&&(d24||d25)) || (showBr&&(!!bY[String(+CURY-1)]||!!bY[String(+CURY-2)]));
      if(!hasData) nNone++; else if(curDone) n2026++; else if(anyOlder) nNeed++;
      // links for years outside the 2023-2026 columns (e.g. older skýrslur) shown after the name
      var oldLinks = lkYears.filter(function(y){return y<'2023';}).sort().map(function(y){
        return ' <a href="'+esc(lks[y])+'" target="_blank" rel="noopener" title="Úttektarskýrsla '+y+' í Drive" style="font-size:11px;color:#15803d;text-decoration:none;white-space:nowrap">📄'+y+'↗</a>'; }).join('');
      // TÆKI: 🧯 slökkvitæki + 🚨 brunakerfis-búnaður, hvor á sinni línu
      var slCntTxt = units>0 ? String(units) : (hasRep||lkYears.length?'–':'0');
      var brCntTxt = bUnits>0 ? String(bUnits) : (bHasData?'–':'0');
      var unitCell = stackTd(
        '<span class="rf-cnt rf-cnt--sl'+(units>0?'':' is-zero')+'" title="Slökkvitæki á staðnum"><em>🧯</em>'+slCntTxt+'</span>',
        '<span class="rf-cnt rf-cnt--br'+(bUnits>0?'':' is-zero')+'" title="'+(bHasData?'Brunakerfisbúnaður á staðnum':'Ekki í brunakerfisþjónustu')+'"><em>🚨</em>'+brCntTxt+'</span>', 'rf-cnt-cell', bruInSvc);
      var bldBaseId = (co && co.customer_base_id != null) ? co.customer_base_id
                    : (b.customer_base_id != null ? b.customer_base_id : baseByKt[digits(b.kt)]);
      var bldPairs = {};
      if (co && pairByCo[String(co.id)]) Object.assign(bldPairs, pairByCo[String(co.id)]);
      if (bldBaseId != null && sitesPerBase[bldBaseId] === 1 && pairByBaseLoose[bldBaseId]) {
        Object.assign(bldPairs, pairByBaseLoose[bldBaseId]);
      }
      // Sett upp HÉR (ekki eftir lykkjuna) svo þetta-árs dálkurinn geti notað
      // sömu liðin-reikninginn og "næsta skoðun"-fruman fyrir neðan.
      var isOver=false;
      if(st && st.next){ isOver = st.next < today; }
      var slPills='', brPills='';
      ['2023','2024','2025','2026'].forEach(function(y,i){
        var done=[d23,d24,d25,d26][i], rep=[false,!!att[0],!!att[1],!!att[2]][i], file=[f23,f24,f25,f26][i];
        var slBundled = !!(bldPairs && bldPairs[y+'|uttekt']);
        var brBundled = !!(bldPairs && bldPairs[y+'|brunakerfi']);
        slPills += yrMiniSl(y, done, rep, lks[y], file, units, slBundled, y===CURY, slHasData, isOver, !!(st&&st.next));
        brPills += yrMiniBr(y, bY[y], bUnits, brBundled, y===CURY, bHasData, bOver, !!(bx&&bx.next));
      });
      // EINN „Skoðanir · Skjöl" dálkur með láréttum ártölu-strimli — eins og
      // „Fyrirtæki í þjónustu". Í „Bæði"-sýn: efri strimill = 🧯 slökkvitæki,
      // neðri = 🚨 brunakerfi (aðeins fyrir byggingar í brunakerfisþjónustu).
      // 🧯/🚨-táknið er ALLTAF með (líka á byggingum með aðeins eina þjónustu) svo
      // 15px táknsúlan sé frátekin á hverri röð → pillurnar standa í beinum súlum.
      var _yStrips='';
      if(showSl) _yStrips += '<div class="rf-yrs" title="🧯 Slökkvitæki"><b class="rf-yrs__ic">🧯</b>'+slPills+'</div>';
      if(showBr && bruInSvc) _yStrips += '<div class="rf-yrs" title="🚨 Brunakerfi"><b class="rf-yrs__ic">🚨</b>'+brPills+'</div>';
      var yTds = '<td class="c rf-yh-cell rf-yrs-cell">'+_yStrips+'</td>';
      if((showSl&&isOver&&slHasData)||(showBr&&bOver)) nOverdue++;
      var nextCell = stackTd(
        nextPill(st&&st.next?st.next:null,'sl',isOver&&slHasData),
        nextPill(bx?bx.next:null,'br',bOver), 'rf-nextcell', bruInSvc);
      // 4px litarönd vinstra megin: rauð = skoðun liðin, græn = eitthvert ár
      // með úttekt/skýrslu, annars grá (blánar á hover gegnum CSS).
      var anyDone = (showSl&&(d23||d24||d25||d26)) || (showBr&&Object.keys(bY).length>0);
      var anyOver = (showSl&&isOver&&slHasData) || (showBr&&bOver);
      var railCls = anyOver ? 'rf-rail--overdue' : (anyDone ? 'rf-rail--done' : 'rf-rail--none');
      // ── collapsed-row summary (2026-08-05, ósk Agnars: "meshy collection mesh"
      // — mörg byggingar-röð með fullt af litlum reitum í einu er þreytandi að
      // lesa). Sjálfgefið er hver röð samanþjöppuð í EINA línu (tæki + núverandi
      // ár + næsta skoðun); ▸-takki opnar sömu frumur og áður (tæki/ár-dálkar/
      // akstur/næst/aðgerðir) — engu var eytt, bara falið þar til smellt er.
      var sumParts=[];
      if(showSl) sumParts.push('<span class="rf-sum-chip'+(units<=0?' is-zero':'')+'">🧯'+(units>0?units:'–')+(d26?' ✓'+CURY:(slHasData?' …':''))+'</span>');
      if(showBr && bHasData) sumParts.push('<span class="rf-sum-chip">🚨'+(bUnits>0?bUnits:'–')+(bY[CURY]?' ✓'+CURY:' …')+'</span>');
      var sumNextDate = (st&&st.next) || (bx&&bx.next) || null;
      var sumOver = (showSl&&isOver&&slHasData)||(showBr&&bOver);
      if(sumNextDate) sumParts.push('<span class="rf-sum-next'+(sumOver?' is-over':'')+'">'+(sumOver?'⚠ ':'')+esc(sumNextDate)+'</span>');
      var summaryCell='<td class="rf-bldsum-cell" colspan="8">'+(sumParts.join(' ')||'<span class="rf-sum-none">engin gögn</span>')+'</td>';
      var detailCells=unitCell+yTds+
             '<td class="c _rf_akcell"'+(co?(' data-rf-akstur="'+co.id+'"'):'')+'></td>'+
             nextCell+
             '<td class="rf-actionscell" style="text-align:right;white-space:nowrap">'+doc+
             ' <a href="#" class="_rf_editb" data-bi="'+_bi+'" title="Breyta byggingu / tengja rétt fyrirtæki" style="text-decoration:none;font-size:12px;margin-left:6px">✏️</a>'+
             ' <a href="#" class="_rf_delb" data-bi="'+_bi+'" title="Fjarlægja byggingu" style="color:#dc2626;text-decoration:none;font-size:12px;margin-left:6px">✕</a></td>';
      return '<tr class="rf-bldrow" data-rfq="'+esc(((b.nafn||'')+' '+(b.heimilisfang||'')+' '+digits(b.kt)).toLowerCase())+'">'+
             '<td class="rf-cellname"><span class="rf-rail '+railCls+'"></span>'+
               '<button type="button" class="rf-bldtoggle" data-bi="'+_bi+'" title="Sýna/fela smáatriði">▸</button>'+
               '<span class="rf-nameid">'+
               '<span class="rf-bname" title="'+esc(b.nafn||'')+'">'+link+'</span>'+
               '<span class="rf-bmeta">'+
               (b.kt?'<span class="rf-bkt">'+esc(fmtKt(b.kt))+(function(){
                 var nr = (b.stadur_nr!=null && b.stadur_nr!=='') ? b.stadur_nr
                        : (co && co.stadur_nr!=null && co.stadur_nr!=='' ? co.stadur_nr : null);
                 return nr!=null ? ' · nr. '+esc(String(nr)) : '';
               })()+'</span>':'')+
               (function(){
                 var nr = (b.stadur_nr!=null && b.stadur_nr!=='') ? b.stadur_nr
                        : (co && co.stadur_nr!=null && co.stadur_nr!=='' ? co.stadur_nr : null);
                 var bok = (b.bokunarnumer||(co&&co.bokunarnumer)||'').toString().trim();
                 var pd = co ? pdByCo[String(co.id)] : null;
                 var bits=[];
                 if (!b.kt && nr!=null) bits.push('<span class="rf-bnr" title="Staðurinnúmer innan rekstrarfélagsins">nr. '+esc(String(nr))+'</span>');
                 if (bok) bits.push('<span class="rf-bnr" title="Bókunarnúmer / kostnaðarstöð í Payday">'+esc(bok)+'</span>');
                 if (pd) bits.push('<span class="rf-bpd'+(pd.paid?' is-paid':'')+'" title="Nýjasta krafa ÞESSARAR byggingar (solur.customer_id='+esc(String(co.id))+') — ekki allar kröfur kennitölunnar">'+esc(pd.r)+(pd.pd?' · PD '+esc(pd.pd):'')+(pd.paid?' ✓':'')+'</span>');
                 return bits.join('');
               })()+
               '</span>'+
               (oldLinks?'<span class="rf-boldlinks">'+oldLinks+'</span>':'')+
               '</span>'+
             '</td>'+
             // heimilisfang — eiginn dálkur (2026-08-20), nowrap+ellipsis svo það
             // vindi ekki upp á hæðina eins og þegar það sat inni í nafnfrumunni.
             '<td class="rf-addrcell">'+(b.heimilisfang?'<span class="rf-baddr" title="'+esc(b.heimilisfang)+'">📍 '+esc(b.heimilisfang)+'</span>':'<span class="rf-baddr rf-baddr--empty">—</span>')+'</td>'+
             // ✈ nóta — eiginn dálkur (2026-08-20). SAMI reitur og ferðanótan á
             // Fyrirtæki í Þjónustu (fyrirtaeki.plan_note; class _rf-plannote svo
             // vökvunar-/vistunar-lykkjan neðar nái í hann). Aðeins tengdar byggingar.
             '<td class="rf-notacell">'+(co?'<input class="_rf-plannote rf-plannote" data-co-id="'+co.id+'" value="'+esc(co.plan_note||'')+'" placeholder="✈ nóta…" maxlength="140">':'')+'</td>'+
             summaryCell+
             detailCells+
             '</tr>';
    }).join('');
    // ── Áætlaðar árs-tekjur (gullkassi) — totSl tæki × yfirferð + hlutfall × hleðsla.
    // Verð koma úr vistuðum forsendum félagsins, annars úr athugasemdinni
    // („yfirferð 2.700 · Hleðsla 4.400"), annars sjálfgefið. Allt stillanlegt.
    function _rfKr(n){ return String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' kr'; }
    // Raunverulegar heimsóknartölur (m. vsk, frá kostnaðartöflu 129) trompa
    // áætlunina; áætlaði hlutinn (estMix, reiknaður per byggingu í lykkjunni
    // með tilboðsverðum + föstum afslætti hverrar byggingar) ×1,24 (vsk).
    var remSl = Math.max(0, totSl - realUnits);
    var estRev = realSum + Math.round(estMix*1.24);
    var goldSub = realN
      ? realN+' byggingar raunreiknaðar ('+_rfKr(realSum)+') + '+remSl+' tæki áætluð'+(estOvN?' ('+estOvN+' m. sérverði/afsl.)':'')
      : totSl+' tæki · yfirferð '+_rfKr(revY)+' + hleðsla '+revHpct+'%'+(estOvN?' · '+estOvN+' byggingar m. sérverði/afslætti':'');
    var goldBox =
      '<div class="rf-gold" id="_rf_gold" title="Árs-tekjur m. vsk — raunverulegar heimsóknartölur þar sem þær eru til, annars áætlun. Smelltu til að stilla forsendur.">'+
        '<div class="rf-gold__l">ÁRS-TEKJUR M. VSK'+(realN?'':' (ÁÆTLUN)')+'</div>'+
        '<div class="rf-gold__v">'+_rfKr(estRev)+'</div>'+
        '<div class="rf-gold__s">'+goldSub+'</div>'+
        '<div class="rf-gold__ed" style="display:none">'+
          '<label>Yfirferð á tæki<input class="_rf_rev_y" type="number" min="0" value="'+revY+'"></label>'+
          '<label>Hleðsla á tæki<input class="_rf_rev_h" type="number" min="0" value="'+revH+'"></label>'+
          '<label>Hleðsla — hlutfall tækja (%)<input class="_rf_rev_p" type="number" min="0" max="100" value="'+revHpct+'"></label>'+
          '<button type="button" class="_rf_rev_save">💾 Vista forsendur</button>'+
        '</div>'+
      '</div>';
    // "_ovr-totals" til viðbótar við "rf-chiprow" — sama flokks-nafn og
    // renderOverview notar fyrir samantektarkassann sinn, svo SlokkPrint
    // (186-print-overview.js) tíni þennan kassa með sjálfkrafa án breytinga
    // þar (það leitar að fyrsta ._ovr-totals + fyrsta <table> í boxinu).
    var summary='<div class="rf-chiprow _ovr-totals">'+
      '<span class="rf-pill rf-pill--done">✓ '+n2026+' með úttekt</span>'+
      '<span class="rf-pill rf-pill--pending">⚠ '+nNeed+' vantar</span>'+
      '<span class="rf-pill rf-pill--overdue">🔴 '+nOverdue+' liðin</span>'+
      goldBox+
      '</div>';
    // ── þjónusturofi + skýring + leit innan félagsins ─────────────────────────
    function svcBtn(k,label){ return '<button type="button" class="rf-svcbtn _rf_svc'+(_state.svc===k?' is-on':'')+'" data-svc="'+k+'">'+label+'</button>'; }
    var svcBar='<div class="rf-svcbar"><div class="rf-svcrow">'+
      '<span class="rf-svclab">SÝNA</span>'+
      svcBtn('both','Bæði')+svcBtn('sl','🧯 Slökkvitæki')+svcBtn('br','🚨 Brunakerfi')+
      '<span class="rf-svcsep"></span>'+
      '<span class="rf-leg"><i style="background:linear-gradient(145deg,#2f9d63,#0f6e3a 60%,#062815)"></i>skýrsla á skrá</span>'+
      '<span class="rf-leg"><i style="background:linear-gradient(145deg,#3a6ae8,#1c3d8c 60%,#0a1a3a)"></i>aðeins í búnaðarsögu</span>'+
      '<span class="rf-leg"><i style="background:linear-gradient(145deg,#e2555f,#a01820 60%,#5a0c10)"></i>skoðun liðin</span>'+
      '<button type="button" class="rf-svcbtn _rf_expandall" title="Sýna/fela smáatriði allra bygginga í einu">▸ Fela allar</button>'+
      '<button type="button" class="rf-svcbtn _rf_printco" title="Prenta skýrslu fyrir þetta rekstrarfélag">🖨 Prenta</button>'+
      '<span class="rf-bsearch">'+
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#9aa3b5" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>'+
        '<input class="_rf_bq" placeholder="Leita að byggingu…">'+
      '</span>'+
      '</div></div>';
    function statCard(cls,label,val,sub){
      return '<div class="rf-stat rf-stat--'+cls+'"><div class="rf-stat__l">'+label+'</div>'+
        '<div class="rf-stat__v">'+val+'<span class="rf-stat__s">'+esc(sub)+'</span></div></div>';
    }
    var statsHtml='<div class="rf-stats">'+
      statCard('byg','BYGGINGAR',blds.length,'í yfirliti')+
      statCard('sl','🧯 SLÖKKVITÆKI',totSl,slDoneCur+' skýrslur '+CURY)+
      statCard('br','🚨 BRUNAKERFI',totBr,brDoneCur+' skýrslur '+CURY)+
      statCard('od','SKOÐUN LIÐIN',nOverdue,'byggingar með liðna skoðun')+
      '</div>';
    var docs=[];
    try{ docs=(await listFirmDocs(name))||[]; }catch(e){ console.warn('[rekstrarfelog] docs',e); }
    var docHtml=docs.length? docs.map(function(d){
      var nm=d.name||d.file||'skjal'; var url=d.drive_url||d.url||'#';
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--brd);font-size:13px">'+
             '<span>📄 '+esc(nm)+'</span>'+(url&&url!=='#'?'<a href="'+esc(url)+'" target="_blank" style="color:var(--brand)">opna</a>':'')+'</div>';
    }).join('') : '<div style="color:var(--ink4);font-size:13px;padding:4px 0">Engin skjöl skráð á félagið ennþá.</div>';

    // Editable rekstrarfélag info card (kennitala / netföng / lén / nótur).
    // Handskráð gildi ganga alltaf fyrir; annars leiðum við út úr byggingunum.
    var der=derivedInfo(info);
    var effKt=info.kt||der.kt;
    var effEmails=(info.emails&&info.emails.length)?info.emails:der.emails;
    var effSimi=info.simi||der.simi;
    var derTag=' <span style="font-size:10.5px;font-weight:700;color:var(--ink3);background:var(--brd);border-radius:99px;padding:1px 7px;white-space:nowrap">úr byggingum</span>';
    var ktDer=!info.kt&&!!der.kt, emDer=!(info.emails&&info.emails.length)&&der.emails.length>0, siDer=!info.simi&&!!der.simi;
    var fEmails=effEmails.join(', ');
    var emails=effEmails.map(function(e){return '<a href="mailto:'+esc(e)+'" style="color:var(--ink1);text-decoration:none;font-weight:600">'+esc(e)+'</a>';}).join(' · ');
    var inS='width:100%;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;margin-top:2px';
    var infoPanel=
      '<div class="_rf_info" style="background:var(--surface);border:1px solid var(--brd);border-radius:10px;padding:12px 14px;margin-bottom:14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
          '<div style="font-size:11px;font-weight:700;color:var(--ink1);text-transform:uppercase;letter-spacing:.04em">Upplýsingar um rekstrarfélag</div>'+
          '<button class="_rf_info_edit" type="button" style="font-size:12px;padding:4px 10px;background:var(--surface);border:1px solid var(--brd2);border-radius:7px;color:var(--ink1);font-weight:600;cursor:pointer">✏️ Breyta</button>'+
        '</div>'+
        '<div class="_rf_info_view" style="font-size:13px;color:var(--ink1);line-height:1.6">'+
          '<div><b style="color:var(--ink1)">Kennitala:</b> '+(effKt?esc(fmtKt(effKt))+(ktDer?derTag:''):'—')+'</div>'+
          '<div><b style="color:var(--ink1)">Netföng:</b> '+(emails||'—')+(emDer?derTag:'')+(info.domain?' &nbsp;·&nbsp; <span style="color:var(--ink2)">'+esc(info.domain)+'</span>':'')+'</div>'+
          '<div><b style="color:var(--ink1)">Sími:</b> '+(effSimi?esc(effSimi)+(siDer?derTag:''):'—')+' &nbsp;·&nbsp; <b style="color:var(--ink1)">Tengiliður:</b> '+(info.tengilidur?esc(info.tengilidur):'—')+'</div>'+
          '<div style="margin-top:4px"><b style="color:var(--ink1)">Athugasemdir:</b><div style="white-space:pre-wrap;color:var(--ink1);margin-top:2px">'+(info.notes?esc(info.notes):'—')+'</div></div>'+
        '</div>'+
        '<div class="_rf_info_form" style="display:none">'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Kennitala<input class="_rf_f_kt" value="'+esc(effKt||'')+'" placeholder="000000-0000" style="'+inS+'"></label>'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Lén<input class="_rf_f_domain" value="'+esc(info.domain||'')+'" placeholder="domain.is" style="'+inS+'"></label>'+
          '</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Sími<input class="_rf_f_simi" value="'+esc(effSimi||'')+'" placeholder="555-0000" style="'+inS+'"></label>'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Tengiliður<input class="_rf_f_tengil" value="'+esc(info.tengilidur||'')+'" placeholder="Nafn tengiliðar" style="'+inS+'"></label>'+
          '</div>'+
          '<label style="display:block;font-size:12px;color:var(--ink2);margin-bottom:8px">Netföng (aðgreind með kommu)<input class="_rf_f_emails" value="'+esc(fEmails)+'" placeholder="reikningar@... , umsjon@..." style="'+inS+'"></label>'+
          '<label style="display:block;font-size:12px;color:var(--ink2);margin-bottom:8px">Athugasemdir / viðbótargögn<textarea class="_rf_f_notes" rows="4" style="'+inS+';resize:vertical">'+esc(info.notes||'')+'</textarea></label>'+
          '<div style="display:flex;gap:8px;justify-content:flex-end">'+
            '<button class="_rf_info_cancel" type="button" style="padding:6px 14px;background:var(--surface);border:1px solid var(--brd2);border-radius:7px;color:var(--ink2);font-weight:600;font-size:12.5px;cursor:pointer">Hætta við</button>'+
            '<button class="_rf_info_save" type="button" style="padding:6px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12.5px;cursor:pointer">💾 Vista</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    body.innerHTML=
      infoPanel+
      '<div class="_rf_samskipti_slot"></div>'+
      '<div style="display:flex;gap:18px;flex-wrap:wrap">'+
        '<div style="flex:1 1 100%;min-width:280px">'+
          '<div style="font-weight:600;font-size:13px;color:var(--ink2);margin-bottom:6px">Byggingar / húsfélög — úttektir</div>'+
          summary+ svcBar + statsHtml +
          '<div class="rf-tblwrap"><div class="rf-tblscroll"><table class="rf-tbl">'+
          // fastar súlubreiddir (table-layout:fixed) — jafnar raðir, nöfn styttast
          // með „…" í stað þess að vefjast. Summa = 1210px (sbr. min-width).
          '<colgroup>'+
            '<col style="width:236px">'+   // Bygging (nafn + kt)
            '<col style="width:210px">'+   // Heimilisfang
            '<col style="width:150px">'+   // Nóta
            '<col style="width:76px">'+    // Tæki
            '<col style="width:200px">'+  // Skoðanir · Skjöl (ártölu-strimill 2023–2026)
            '<col style="width:46px">'+    // 🚗
            '<col style="width:152px">'+   // Næsta skoðun
            '<col style="width:90px">'+    // aðgerðir
          '</colgroup>'+
          '<thead><tr>'+
          '<th>Bygging</th>'+
          '<th>Heimilisfang</th>'+
          '<th>Nóta</th>'+
          '<th class="c">Tæki'+svcKey()+'</th>'+
          '<th class="c rf-yh rf-yrs-th" title="Skoðunarár 2023–2026 · smelltu á ár til að opna skýrsluna">Skoðanir · Skjöl</th>'+
          '<th class="c" title="Akstursleið — smelltu til að setja stað á leið 1/2/3">🚗</th>'+
          '<th>Næsta skoðun'+svcKey()+'</th>'+
          '<th></th></tr></thead><tbody>'+rows+
          '<tr class="_rf_norow" style="display:none"><td colspan="8" class="rf-nores">Engin bygging passar við leitina.</td></tr>'+
          '</tbody></table></div>'+
          '<div class="rf-tblfoot"><span><b>'+blds.length+'</b> byggingar'+
            (showSl?' · <b style="color:#1f9d57">'+slDoneCur+'</b> slökkvitækjaskýrslur '+CURY:'')+
            (showBr?' · <b style="color:#c0241f">'+brDoneCur+'</b> brunakerfisskýrslur '+CURY:'')+
            (showBr?' · <b>'+nBruSvc+'</b> í brunakerfisþjónustu':'')+
          '</span></div></div>'+
          '<button class="_rf_addb" style="margin-top:8px;padding:6px 12px;background:var(--surface);border:1px dashed var(--brd2);border-radius:8px;color:var(--brand);font-weight:600;font-size:12.5px;cursor:pointer">+ Bæta við byggingu / fyrirtæki</button>'+
          '<div style="font-size:11px;color:var(--ink4);margin-top:6px">Efri strimill = <b>🧯 slökkvitæki</b>, neðri = <b>🚨 brunakerfi</b> (skiptu með rofanum að ofan). Ártölu-strimillinn sýnir skoðunarárin <b>‘23–‘26</b> — smelltu á ár til að opna skýrsluna; fjöldi tækja sést í «Tæki» og þegar bent er á árið. <span style="color:#15803d">Grænt</span> = skýrsla á skrá; <span style="color:var(--brand)">blátt</span> = aðeins búnaðarsaga / í vinnslu; <span style="color:#a97514">gull</span> = þetta ár á áætlun (ókomið); <span style="color:#c0241f">rautt</span> = liðið án skýrslu. «Næsta skoðun» = fyrsti gjalddagi, ⚠ = liðinn. Brunakerfis-gögnin koma úr sömu heimild og «🔥 Brunakerfi yfirlit».</div>'+
        '</div>'+
        '<div style="flex:1;min-width:260px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
            '<div style="font-weight:600;font-size:13px;color:var(--ink2)">Skjöl félagsins</div>'+
            '<button class="_rf_upload btn btn-ghost btn-sm" style="font-size:12px;padding:4px 10px">+ Hlaða upp</button></div>'+
          (info.drive? '<a href="'+esc(info.drive)+'" target="_blank" style="display:inline-block;margin-bottom:8px;font-size:13px;color:var(--brand);font-weight:600;text-decoration:none">📁 Opna skjalamöppu í Drive →</a>':'')+
          '<div class="_rf_doclist">'+docHtml+'</div>'+
          '<input type="file" class="_rf_file" style="display:none">'+
        '</div>'+
      '</div>';

    // wire the editable rekstrarfélag info card
    var infoEditBtn=body.querySelector('._rf_info_edit');
    var infoViewEl=body.querySelector('._rf_info_view');
    var infoFormEl=body.querySelector('._rf_info_form');
    function showInfoForm(on){ if(!infoFormEl||!infoViewEl||!infoEditBtn) return;
      infoFormEl.style.display=on?'':'none'; infoViewEl.style.display=on?'none':'';
      infoEditBtn.textContent=on?'✕ Loka':'✏️ Breyta'; }
    if(infoEditBtn) infoEditBtn.addEventListener('click', function(){ showInfoForm(infoFormEl.style.display==='none'); });
    var infoCancel=body.querySelector('._rf_info_cancel');
    if(infoCancel) infoCancel.addEventListener('click', function(){ showInfoForm(false); });
    var infoSave=body.querySelector('._rf_info_save');
    if(infoSave) infoSave.addEventListener('click', async function(){
      var kt=(body.querySelector('._rf_f_kt').value||'').trim();
      var domain=(body.querySelector('._rf_f_domain').value||'').trim();
      var simi=(body.querySelector('._rf_f_simi').value||'').trim();
      var tengil=(body.querySelector('._rf_f_tengil').value||'').trim();
      var emailsRaw=(body.querySelector('._rf_f_emails').value||'').trim();
      var notes=(body.querySelector('._rf_f_notes').value||'');
      var emailsArr=emailsRaw?emailsRaw.split(/[,;\n]+/).map(function(s){return s.trim();}).filter(Boolean):[];
      infoSave.disabled=true; infoSave.textContent='Vista…';
      var d=getData(); if(!d[name]) d[name]=info;
      d[name].kt=kt; d[name].domain=domain; d[name].emails=emailsArr; d[name].notes=notes;
      d[name].simi=simi; d[name].tengilidur=tengil;
      try{ await saveData(d, name); }catch(e){}
      info.kt=kt; info.domain=domain; info.emails=emailsArr; info.notes=notes;
      info.simi=simi; info.tengilidur=tengil;
      if(window.Toast&&Toast.show) Toast.show('✓ Upplýsingar vistaðar');
      fillBody(body,name,info); // re-render with the new values
    });

    // Gullkassi — smella opnar/lokar forsendu-ritli; Vista skrifar í félagsgögnin
    // (saveData → AppSettings, samstillist milli tækja) og endurteiknar.
    var goldEl=body.querySelector('#_rf_gold');
    if(goldEl){
      var edEl=goldEl.querySelector('.rf-gold__ed');
      goldEl.addEventListener('click', function(e){
        if(e.target.closest('.rf-gold__ed')) return;   // smellur inni í ritli lokar ekki
        if(edEl) edEl.style.display = (edEl.style.display==='none') ? '' : 'none';
      });
      var revSave=goldEl.querySelector('._rf_rev_save');
      if(revSave) revSave.addEventListener('click', async function(ev){
        ev.stopPropagation();
        var y=+((goldEl.querySelector('._rf_rev_y')||{}).value)||0;
        var h=+((goldEl.querySelector('._rf_rev_h')||{}).value)||0;
        var p=+((goldEl.querySelector('._rf_rev_p')||{}).value)||0;
        revSave.disabled=true; revSave.textContent='Vista…';
        var d=getData(); if(!d[name]) d[name]=info;
        d[name].rev_yfirferd=y; d[name].rev_hledsla=h; d[name].rev_hledsla_pct=p;
        try{ await saveData(d, name); }catch(e){}
        info.rev_yfirferd=y; info.rev_hledsla=h; info.rev_hledsla_pct=p;
        if(window.Toast&&Toast.show) Toast.show('✓ Tekjuforsendur vistaðar');
        fillBody(body,name,info);   // endurteikna með nýju tölunum
      });
    }

    // þjónusturofi: Bæði / 🧯 Slökkvitæki / 🚨 Brunakerfi — valið er vistað og
    // gildir fyrir ÖLL félög (sama og notandinn býst við þegar hann flettir).
    body.querySelectorAll('._rf_svc').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var k=btn.getAttribute('data-svc');
        if(!k || k===_state.svc) return;
        setSvc(k);
        fillBody(body, name, info);
      });
    });
    // leit að byggingu innan félagsins — síar raðirnar beint í DOM-inu
    // (engin ný gagnasókn, svarar strax).
    var bq=body.querySelector('._rf_bq');
    if(bq) bq.addEventListener('input', function(){
      var q=(bq.value||'').toLowerCase().trim();
      var none=body.querySelector('._rf_norow'), hits=0;
      body.querySelectorAll('.rf-tbl tbody tr[data-rfq]').forEach(function(tr){
        var ok = !q || (tr.getAttribute('data-rfq')||'').indexOf(q)>=0;
        tr.style.display = ok ? '' : 'none';
        if(ok) hits++;
      });
      if(none) none.style.display = hits ? 'none' : '';
    });

    // wire building -> company record
    body.querySelectorAll('._rf_open').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    body.querySelectorAll('._rf_docs').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    // ▸ per-building collapse toggle — pure CSS class flip, no re-render.
    body.querySelectorAll('.rf-bldtoggle').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var tr=btn.closest('tr.rf-bldrow'); if(!tr) return;
        tr.classList.toggle('is-collapsed');
      });
    });
    // ▾▸ Opna allar / Fela allar — hnappur í leitarröðinni togglar allar raðir félagsins í einu.
    var expAllBtn=body.querySelector('._rf_expandall');
    if(expAllBtn) expAllBtn.addEventListener('click', function(){
      var rows=body.querySelectorAll('.rf-tbl tbody tr.rf-bldrow');
      var anyCollapsed=Array.prototype.some.call(rows, function(tr){ return tr.classList.contains('is-collapsed'); });
      rows.forEach(function(tr){ tr.classList.toggle('is-collapsed', !anyCollapsed); });
      expAllBtn.textContent = anyCollapsed ? '▸ Fela allar' : '▾ Opna allar';
    });
    // 🖨 Prenta — eitt fyrir HVERT rekstrarfélag (ósk Agnars 2026-08-06), sama
    // SlokkPrint-glugginn og yfirlits-flipinn notar (186-print-overview.js):
    // tínir fyrsta <table> + fyrsta ._ovr-totals innan úr `body`-boxinu (sjá
    // "_ovr-totals" flokkinn á rf-chiprow hér fyrir ofan) — svo hver útprentun
    // sýnir AÐEINS þetta eina félag, ekki öll rekstrarfélögin.
    var printBtn=body.querySelector('._rf_printco');
    if(printBtn) printBtn.addEventListener('click', function(){
      if(window.SlokkPrint) SlokkPrint('Rekstrarfélag — '+name, body, true);
    });
    // Akstursleið-chip á hverja byggingu (per staður) — sama gagnastaður og
    // félags-chip + aðal-borðið (arsskodun_customers[staður_id].akstur).
    body.querySelectorAll('td._rf_akcell[data-rf-akstur]').forEach(function(cell){
      var coId = parseInt(cell.getAttribute('data-rf-akstur'), 10);
      if(!coId) return;
      cell.appendChild(makeRfAksturChip([coId]));
    });
    // ✈ Byggingar-nótan — vökvun + vistun (debounced í fyrirtaeki.plan_note,
    // sama og ferðanótan í 153). Companies.list ber ekki alltaf plan_note svo
    // gildin eru sótt fersk; reitur í notkun (focus) er ekki yfirskrifaður.
    (function(){
      var inputs = body.querySelectorAll('._rf-plannote');
      if(!inputs.length) return;
      var ids = Array.prototype.map.call(inputs, function(i){ return parseInt(i.getAttribute('data-co-id'),10); }).filter(Boolean);
      try {
        SB.from('fyrirtaeki').select('id,plan_note').in('id', ids).then(function(r){
          if(r.error||!r.data) return;
          var m={}; r.data.forEach(function(x){ m[x.id]=x.plan_note||''; });
          inputs.forEach(function(inp){
            var id=parseInt(inp.getAttribute('data-co-id'),10);
            if(m[id]!=null && document.activeElement!==inp) inp.value=m[id];
          });
        });
      } catch(_){}
      inputs.forEach(function(inp){
        var t=null;
        inp.addEventListener('click', function(e){ e.stopPropagation(); });
        inp.addEventListener('keydown', function(e){ e.stopPropagation(); if(e.key==='Enter') inp.blur(); });
        inp.addEventListener('input', function(){
          if(t) clearTimeout(t);
          t=setTimeout(async function(){
            var id=parseInt(inp.getAttribute('data-co-id'),10);
            var val=inp.value.trim()||null;
            if(!id) return;
            try {
              var r=await SB.from('fyrirtaeki').update({plan_note:val}).eq('id',id);
              if(r.error) throw r.error;
              try { var c=((window.Companies&&Companies.list)||[]).find(function(x){return +x.id===id;}); if(c) c.plan_note=val; } catch(_){}
            } catch(err){ console.warn('[rekstrarfelog] plan_note', err); }
          },600);
        });
      });
    })();

    // wire add / remove building — self-service editing, no code needed
    var addB = body.querySelector('._rf_addb');
    if (addB) addB.addEventListener('click', async function(){
      var nafn = prompt('Nafn byggingar / fyrirtækis:'); if(!nafn || !nafn.trim()) return;
      nafn = nafn.trim();
      // Sjálfgefin kt = rekstrarfélagsins (t.d. Center Hótel 450905-1430) svo allir
      // staðir lendi undir sama base; má breyta/sleppa.
      var kt   = (prompt('Kennitala (sjálfgefið kt rekstrarfélagsins — má breyta/sleppa):', info.kt||'')||'').trim();
      var heim = (prompt('Heimilisfang (má sleppa):','')||'').trim();
      var bld  = { nafn:nafn, kt:kt, heimilisfang:heim };
      // Bjóða að stofna sem RAUNVERULEGT fyrirtæki Í ÞJÓNUSTU (fyrirtaeki-röð).
      var ktForCo = (kt || info.kt || '').trim();
      if (ktForCo && confirm('Stofna „'+nafn+'" sem fyrirtæki Í ÞJÓNUSTU?\n\nBýr til raunverulega fyrirtækja-röð (kt '+fmtKt(ktForCo)+') sem birtist í aksturslista, heldur tækjum og fær úttektarskýrslur.\n\nÝttu „Hætta við" til að vista bara sem nótu.')){
        try {
          var co = await createServiceCompany(nafn, ktForCo, heim);
          if (co && co.id != null){ bld.co_id = co.id; if(window.Toast&&Toast.show) Toast.show('✓ '+nafn+' stofnað í þjónustu'); }
        } catch(e){ alert('Villa við stofnun fyrirtækis: '+(e.message||e)+'\n\nByggingin er samt vistuð sem nóta.'); }
      }
      var d = getData(); if(!d[name]) d[name]=info;
      d[name].buildings = (d[name].buildings||[]).concat([bld]);
      await saveData(d, name);
      info.buildings = d[name].buildings;
      fillBody(body, name, info);
    });
    // ✏️ Breyta byggingu: nafn / kt / heimilisfang / HANDFEST fyrirtækja-tenging
    // (b.co_id — trompar alla sjálfvirka uppflettingu, sjá companyForBld).
    body.querySelectorAll('._rf_editb').forEach(function(x){
      x.addEventListener('click', async function(e){
        e.preventDefault();
        var bi = parseInt(x.getAttribute('data-bi'),10);
        var b = (info.buildings||[])[bi]; if(!b) return;
        var nafn = prompt('Nafn byggingar:', b.nafn||''); if(nafn===null) return;
        var kt   = prompt('Kennitala:', b.kt||''); if(kt===null) return;
        var heim = prompt('Heimilisfang:', b.heimilisfang||''); if(heim===null) return;
        var cur = companyForBld(b);
        var pick = prompt('Tengt fyrirtæki í skránni (nafn eða id — tómt = sjálfvirk uppfletting):', cur ? (cur.nafn||('#'+cur.id)) : '');
        if(pick===null) return;
        var co_id = null;
        var pv = (pick||'').trim();
        if (pv) {
          var list = (window.Companies && Companies.list) || [];
          var hit = /^#?\d+$/.test(pv) ? list.find(function(c){ return String(c.id)===pv.replace('#',''); }) : null;
          if (!hit) { var fp = foldNm(pv); hit = list.find(function(c){ return foldNm(c.nafn)===fp; }) || list.find(function(c){ return foldNm(c.nafn).indexOf(fp)>=0; }); }
          if (!hit) { alert('Fann ekkert fyrirtæki sem passar við „'+pv+'" — tengingin óbreytt.'); }
          else {
            co_id = hit.id;
            if(!confirm('Festa tengingu á: '+(hit.nafn||'')+' (#'+hit.id+' · '+(hit.heimilisfang||'án heimilisfangs')+')?')) return;
          }
        }
        var d = getData(); if(!d[name]) d[name]=info;
        var arr = d[name].buildings||[]; if(!arr[bi]) return;
        arr[bi].nafn = nafn.trim(); arr[bi].kt = kt.trim(); arr[bi].heimilisfang = heim.trim();
        // 2026-07-28: röð sem kom úr fyrirtækjaskránni er merkt _live og er
        // strípuð við vistun (sjá saveData). Um leið og notandinn ritstýrir
        // henni er hún ÆTTLEIDD sem handskráð — annars hyrfi breytingin þegjandi.
        delete arr[bi]._live;
        if (pv && co_id != null) arr[bi].co_id = co_id;
        else if (!pv) delete arr[bi].co_id;   // tómt = aftur í sjálfvirka uppflettingu
        await saveData(d, name);
        info.buildings = arr;
        if(window.Toast&&Toast.show) Toast.show('✓ Bygging uppfærð');
        fillBody(body, name, info);
      });
    });
    body.querySelectorAll('._rf_delb').forEach(function(x){
      x.addEventListener('click', async function(e){
        e.preventDefault();
        var bi = parseInt(x.getAttribute('data-bi'),10);
        var b = (info.buildings||[])[bi]; if(!b) return;
        // 2026-07-28: staðir sem koma úr fyrirtækjaskránni (customers_base
        // .rekstrarfelag) er ekki hægt að fjarlægja héðan — þeir kæmu strax
        // aftur við næstu hleðslu. Segjum það hreint út í stað þess að láta
        // ✕ líta út fyrir að virka og gera svo ekkert.
        if (b._live) {
          alert('„'+(b.nafn||'')+'" kemur úr fyrirtækjaskránni, ekki úr handskráða listanum.\n\n'+
                'Til að taka staðinn af félaginu þarf að fjarlægja rekstrarfélags-merkinguna á fyrirtækinu sjálfu '+
                '(customers_base.rekstrarfelag) — t.d. gegnum Bakendi eða Sameining.');
          return;
        }
        if(!confirm('Fjarlægja "'+(b.nafn||'')+'" úr félaginu?')) return;
        var d = getData();
        if(d[name] && Array.isArray(d[name].buildings)){ d[name].buildings.splice(bi,1); await saveData(d, name); info.buildings=d[name].buildings; }
        fillBody(body, name, info);
      });
    });

    // wire firm upload
    var fileInput=body.querySelector('._rf_file');
    body.querySelector('._rf_upload').addEventListener('click', function(){ fileInput.click(); });
    fileInput.addEventListener('change', async function(){
      if(!fileInput.files || !fileInput.files.length) return;
      var btn=body.querySelector('._rf_upload'); btn.textContent='Hleð upp…'; btn.disabled=true;
      try {
        for (var i=0;i<fileInput.files.length;i++){
          if(window.CompanyAttachments && CompanyAttachments.upload) await CompanyAttachments.upload(firmAttachId(name), fileInput.files[i]);
        }
      } catch(e){ alert('Villa við upphal: '+(e.message||e)); }
      btn.textContent='+ Hlaða upp'; btn.disabled=false;
      fillBody(body,name,info); // refresh
    });
  }

  var _cameFromRf = false;
  function openCompany(id){
    if(!id) return;
    var nid = isNaN(id)? id : parseInt(id,10);
    // Hide our view first — Companies.openDetail switches views
    // programmatically (no nav-button click), so without this the
    // rekstrarfélög content stays visible beside the company page.
    var v=viewEl();
    if(v){ v.style.display='none'; v.classList.remove('active'); }
    var ourBtn=document.querySelector('[data-view="rekstrarfelog"]');
    if(ourBtn) ourBtn.classList.remove('active');
    _cameFromRf = true;
    try {
      if(window.Companies && Companies.openDetail){ Companies.openDetail(nid); return; }
      if(window.App && App.switchView){ App.switchView('companies'); }
    } catch(e){ console.warn('openCompany failed', e); }
  }
  // "Til baka" on a company page opened FROM rekstrarfélög returns here
  // instead of the companies list. Capture phase so we win over the detail
  // page's own back handler. Any nav-button click cancels the breadcrumb.
  document.addEventListener('click', function(e){
    var el=e.target.closest('button, a');
    if(!el) return;
    if(el.classList && el.classList.contains('vnav-btn')){ _cameFromRf=false; return; }
    if(!_cameFromRf) return;
    if(!/til baka/i.test(el.textContent||'')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    _cameFromRf=false;
    if(window.openRekstrarfelog) window.openRekstrarfelog();
  }, true);

  async function addFirm(){
    var name=prompt('Nafn rekstrarfélags:'); if(!name) return;
    var email=prompt('Reikninga-netfang (má sleppa):')||'';
    var data=getData();
    if(data[name]){ alert('Félag með þessu nafni er þegar til.'); return; }
    data[name]={ domain:(email.split('@')[1]||''), emails: email?[email]:[], buildings:[] };
    await saveData(data, name); renderList();
  }

  // ---- nav tab injection (mirrors vidskiptavinir.js pattern) ----
  // NOTE: the app re-renders its nav bar (counts update etc.), which wipes any
  // injected button. So we do NOT latch a one-time flag — instead injectTab runs
  // on an interval and re-adds the button whenever it is missing.
  function showOurView(btn){
    document.querySelectorAll('[id^=view-]').forEach(function(v){ v.style.display='none'; v.classList.remove('active'); });
    var v=viewEl();
    if(!v){ v=document.createElement('div'); v.id='view-rekstrarfelog'; v.className='view'; v.style.cssText='padding:0';
      var ref=document.getElementById('view-companies')||document.getElementById('view-allir-vidsk');
      if(ref&&ref.parentNode) ref.parentNode.insertBefore(v,ref.nextSibling); else document.body.appendChild(v); }
    v.style.display=''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    // 2026-07-28 (Agnar): skýrsla sem sett er inn á fyrirtækjaprófílinn á að
    // vera komin hingað — og orðin græn — um leið og maður kemur til baka.
    // Brunakerfis-vísitalan er því alltaf sótt upp á nýtt þegar síðan er opnuð
    // (2 litlar fyrirspurnir); tækja-vísitalan (7000+ raðir) aðeins ef hún er
    // orðin eldri en 2 mínútur. ↻ Uppfæra hreinsar allt strax.
    invalidateBru();
    if(Date.now()-_equipAt > 120000) invalidateEquip();
    renderView();
  }
  function injectTab(){
    var btns=Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    // prefer to sit right after "Allir Viðskiptavinir"; fall back to companies btn
    var anchor=btns.find(function(b){return b.dataset.view==='allir-vidsk';})
             || btns.find(function(b){return b.dataset.view==='companies';});
    if(!anchor || !anchor.parentElement) return;
    var existing=document.querySelector('[data-view="rekstrarfelog"]');
    if(existing){
      // 2026-06-09: already present → do NOTHING. The old behaviour yanked the
      // button back next to the anchor on every 1.2s tick, which fought patch
      // 68's (custom) ordering forever — the sidebar visibly reshuffled on
      // every refresh. Position is patch 68's job, not ours.
      return;
    }
    var btn=anchor.cloneNode(true);
    btn.dataset.view='rekstrarfelog';
    btn.classList.remove('active');
    // robust label: most nav buttons wrap text in a <span>; otherwise set textContent
    var span=btn.querySelector('span');
    if(span){ span.textContent='🏢 Rekstrarfélög'; } else { btn.textContent='🏢 Rekstrarfélög'; }
    // remove any cloned badge/counter nodes
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(function(n){ n.remove(); });
    btn.removeAttribute('onclick');
    btn.onclick=function(){ showOurView(btn); };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    // hide our view when another nav button is clicked
    document.querySelectorAll('.vnav-btn').forEach(function(b){ if(b===btn) return; b.addEventListener('click', function(){ var v=viewEl(); if(v){ v.style.display='none'; v.classList.remove('active'); } btn.classList.remove('active'); }); });
    console.log('[Rekstrarfélög] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);
  window.openRekstrarfelog=function(){ injectTab(); var b=document.querySelector('[data-view="rekstrarfelog"]'); if(b) b.click(); };

  // Boot deep-link re-assert (sama mynstur og 219/231): sala.js boot-landerinn
  // yfirskrifar #rekstrarfelog áður en flipinn er til — ef upphafs-hashið var
  // þessi síða, opnum hana aftur eftir að allt er ræst.
  (function(){
    var want = /^#(rekstrarfelog|rekstrarfélog)$/i.test(location.hash||'');
    if (!want) return;
    // 219-mynstrið: endur-fullyrða þar til NOTANDINN tekur við — annars stelur
    // sala.js boot-landerinn (fer af stað ~1,5s inn) deep-linknum.
    var userTook = false;
    ['pointerdown','mousedown','keydown','touchstart'].forEach(function(ev){
      window.addEventListener(ev, function(){ userTook = true; }, { capture:true, passive:true });
    });
    var t = setInterval(function(){
      if (userTook){ clearInterval(t); return; }
      var v = viewEl();
      var visible = v && getComputedStyle(v).display !== 'none';
      if (!visible){
        try { window.openRekstrarfelog(); } catch(e){}
        try { history.replaceState(null,'','#rekstrarfelog'); } catch(e){}
      }
    }, 400);
    setTimeout(function(){ clearInterval(t); }, 20000); // öryggis-stopp
  })();

  // 2026-07-12 (verkefnalisti systemic): EITT sameiginlegt hjálparfall svo
  // rekstrarfélaga-gögnin (handvirku netföng/drive OFAN Á lifandi customers_base
  // +fyrirtaeki) séu aldrei fryst í tveimur eintökum. Bæði þessi síða OG patch
  // 184 (rekstrarfélags-merkið á kúnna) lesa nú héðan — nýtt rekstrarfélag í
  // gagnagrunni birtist samstundis á báðum stöðum.
  //   ensureLive()  → async, hleður lifandi listann (skilar {name:[sites]})
  //   getMerged()   → sync, merged {name:{emails,buildings,drive,…}} (lifandi+curated)
  //   byKt(kt)      → { firm, emails, drive } | null   (fyrir 184-merkið)
  window.RekstrarfelagData = {
    ensureLive: ensureLiveRF,
    getMerged: getData,
    getRaw: getRawData,
    // 2026-07-28: hendir vísitölunum svo næsta opnun/teikning sæki ferskt úr
    // gagnagrunni. Kalla á þetta eftir að skýrsla/skjal er vistað annars staðar.
    invalidate: function(){ invalidateBru(); invalidateEquip(); },
    byKt: function(kt){
      var d = digits(kt); if (d.length < 10) return null;
      var data = getData();
      for (var firm in data){
        var rec = data[firm] || {};
        var blds = rec.buildings || [];
        for (var i=0;i<blds.length;i++){
          if (digits(blds[i] && blds[i].kt) === d){
            return { firm: firm, emails: Array.isArray(rec.emails)?rec.emails:[], drive: rec.drive||'' };
          }
        }
      }
      return null;
    }
  };
})();
