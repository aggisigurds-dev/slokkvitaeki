/* === HLIÐARSTIKA Í MIÐAKERFINU (391) — 22.09.2026 ===
 *
 * Agnar um Kröfu-hönnunina (https://claude.ai/artifact/5CojrbMEcML7ZpkhkV6ruj):
 * „no to the sidepannel … meaning the mjó útgáfa. the other looks great. do that"
 * → FULLA stikan (240 px útgáfan með hlutaheitum), EKKI 72 px mjóa útgáfan.
 *
 * AÐEINS útlit. DOM-ið eiga aðrir og halda því:
 *   68  raðar hnöppunum með CSS `order` og merkir hópa með .nav-grp-start
 *   171 sérsnið (sidebar_order / sidebar_hidden á þjóni) · 189 vörður
 *   15/241 fjöldamerkin · 292 byggingarstimpillinn · 56 leitarhnappurinn
 * Hér: stílblað + ein lítil lota sem setur `data-sbm-sec` (heiti hlutans) á
 * fyrsta hnapp hvers hóps, reiknað af því hvaða síður hópurinn geymir. Enginn
 * hnappur er færður, falinn eða endurnefndur; vistuð röð notandans er ósnert.
 * Stílstjóra-reglur Agnars (_pe-overrides, hærri sérhæfni) ráða áfram.
 *
 * Aðeins tölvuskjár (≥ 901 px) og ekki uppsett öpp — síma-skúffan (mobile.css,
 * 263) er óbreytt.
 */
(() => {
  if (window.__sbmInstalled) return;
  window.__sbmInstalled = true;

  // Hlutarnir. Hópur fær heiti þess hluta sem flestar síður hans tilheyra;
  // sama heiti og hópurinn á undan → bara dauf lína (t.d. Sala → Afgreiðsla).
  const SEC = [
    ['Sala',           ['sala', 'counter', 'workshop', 'vorur', 'opp', 'turbopaint']],
    ['Viðskiptavinir', ['arsskodun', 'rekstrarfelog', 'brunayfirlit', 'allir-vidsk', 'vidskiptavinir', 'companies', 'tengilidir']],
    ['Fjármál',        ['krofu-yfirlit', 'hreyfingarlisti', 'drog', 'kostnadur', 'payrev', 'income', 'bokhalds-yfirlit', 'reikninga-postur', 'aging-report']],
    ['Vettvangur',     ['thjonustu-verkstaedi', 'leidsogn', 'bilstjori', 'aksturslisti', 'mottaka', 'vertid', 'field']],
    ['Tilboð',         ['tilbod', 'samningar', 'tilbodhub']],
    ['Skoðanir',       ['brunaskra', 'slokkvikerfi', 'brunakerfi', 'verkdagbok']],
    ['Kerfi',          ['settings', 'stadan', 'maelabord', 'bakendi', 'adstod', 'sameining', 'minar-sidur', 'stjornstod']],
    ['Birgðir',        ['geymsla', 'birgdir', 'lanstaeki']],
  ];
  const SEC_OF = {};
  SEC.forEach(([name, views]) => views.forEach(v => { SEC_OF[v] = name; }));

  const RED_METAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const BELL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'/%3E%3C/svg%3E\")";

  function injectCss() {
    if (document.getElementById('_sbm-css')) return;
    if (!document.getElementById('_sbm-font')) {
      const lf = document.createElement('link');
      lf.id = '_sbm-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@700&display=swap';
      (document.head || document.documentElement).appendChild(lf);
    }
    const P = 'html body:not(.appmode) .topbar';
    const N = P + ' nav.view-nav';
    const B = N + ' .vnav-btn';
    // Lína hægra megin við heitið: mono 10 px + .18em bil ≈ 7,8 px á staf.
    const labelW = SEC.map(([name]) =>
      B + '.nav-grp-start[data-sbm-sec="' + name + '"]::after{background-size:calc(100% - ' + (Math.ceil(name.length * 7.8) + 10) + 'px) 1px!important}').join('\n');
    const css = [
      // Spjaldið
      P + '{background:linear-gradient(180deg,#15161a 0%,#0c0d10 100%)!important;border-right:1px solid #050506!important;box-shadow:none!important}',
      // Merkið
      P + ' .brand{order:0;display:flex!important;align-items:center!important;gap:11px!important;padding:16px 16px 13px!important;border-bottom:1px solid #1f2126!important}',
      P + ' .brand-logo{flex:none!important;width:38px!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#0a0b0d!important;border:1px solid #25272d!important;border-radius:4px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important}',
      P + ' .brand-logo svg{width:18px!important;height:24px!important}',
      P + ' .brand-logo img{max-width:28px!important;max-height:28px!important}',
      P + ' .brand-name{font-family:Sora,' + SANS + '!important;font-size:15px!important;font-weight:700!important;letter-spacing:-.01em!important;color:#f3f5f8!important}',
      P + ' .brand-sub{font-size:11px!important;font-weight:400!important;color:#8f98a8!important;margin-top:1px!important}',
      // Leit — upp undir merkið
      P + ' > #gs-trigger{order:1;flex:none!important;display:flex!important;align-items:center!important;gap:8px!important;height:36px!important;margin:12px 14px 4px!important;padding:0 10px!important;background:#0a0b0d!important;border:1px solid #25272d!important;border-radius:3px!important;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)!important;color:#8f98a8!important;font:400 12.5px/1 ' + SANS + '!important;text-align:left!important;opacity:1!important}',
      P + ' > #gs-trigger:hover{border-color:#3a3d44!important;color:#c9ced6!important}',
      P + ' > #gs-trigger svg{flex:none}',
      P + ' > #gs-trigger .sbm-gs-t{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P + ' > #gs-trigger kbd{margin-left:auto!important;padding:1px 5px!important;border:1px solid #2c2f36!important;border-radius:3px!important;background:transparent!important;color:#aeb6c4!important;font:700 10.5px/1.3 ' + MONO + '!important}',
      // Valmyndin
      N + '{order:2;padding:6px 10px 10px!important;gap:2px!important}',
      // NB: `display` er ALDREI sett hér. app.css gefur .vnav-btn `display:flex`;
      // 68 felur hnappa með inline `display:none` og 162/181 o.fl. með CSS-reglum
      // — `display:flex!important` dró þá ALLA fram (mælt: 17 faldir hnappar birtust).
      B + '{position:relative!important;overflow:visible!important;align-items:center!important;gap:11px!important;height:36px!important;min-height:36px!important;box-sizing:border-box!important;padding:0 10px 0 26px!important;margin-top:0;border:1px solid transparent!important;border-radius:3px!important;background:transparent!important;box-shadow:none!important;text-shadow:none!important;color:#eaedf2!important;font:500 14.5px/1.2 ' + SANS + '!important;letter-spacing:0!important;text-align:left!important;-webkit-font-smoothing:antialiased}',
      B + ' svg{flex:none!important;width:16px!important;height:16px!important;margin:0!important}',
      B + ' > svg[stroke="currentColor"],' + B + ' > span > svg[stroke="currentColor"]{color:#8f98a8!important}',
      B + ' .vnav-icon-norm{flex:none!important;width:16px!important;margin:0!important;font-size:14px!important;line-height:1!important;text-align:center!important}',
      // Agnar 01.10.2026: „stafina aðeins hvítari, taka burtu iconið og stækka stafina
      // aðeins" — heitin #c9ced6 → #eaedf2 og 13,5 → 14,5 px (reglan hér að ofan), og
      // táknin falin. Bara falin, ekki fjarlægð: 171/68 og íkona-normið (ico-norm) eiga
      // þau áfram, og síma-skúffan (utan þessa blaðs) heldur sínum.
      B + ' > svg,' + B + ' > span > svg,' + B + ' .vnav-icon-norm{display:none!important}',
      // „Sjá meira" (Agnar 01.10.2026): allt sem raðast á eftir Öpp er á bak við eina
      // línu, lokað sjálfgefið. Virka síðan sést alltaf (:not(.active)). Meðan label()
      // mælir er data-sbm-maela á nav — annars teldi hún földu hnappana horfna, tæki
      // merkin af, og þeir birtust aftur (blikk).
      N + ':not([data-sbm-opin]):not([data-sbm-maela]) > .vnav-btn[data-sbm-meira]:not(.active),' +
        N + ':not([data-sbm-opin]):not([data-sbm-maela]) > .qlinks-section[data-sbm-meira]{display:none!important}',
      N + ' > .sbm-meira-tgl{display:flex!important;align-items:center!important;gap:10px!important;height:26px!important;margin:14px 0 2px!important;padding:0 8px!important;cursor:pointer!important;user-select:none!important;font:700 10px/14px ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#9aa3b2!important;white-space:nowrap!important}',
      N + ' > .sbm-meira-tgl::after{content:""!important;flex:1 1 auto!important;height:1px!important;background:#2b2e35!important}',
      N + ' > .sbm-meira-tgl:hover{color:#fff!important}',
      N + ' > .sbm-meira-tgl:focus-visible{outline:2px solid #f0584c!important;outline-offset:1px!important}',
      // Fyrsti hnappur undir línunni: hópalínan hans væri tvöföld við „Sjá meira"-línuna.
      B + '[data-sbm-meira="1"].nav-grp-start:not([data-sbm-sec]){margin-top:2px!important}',
      B + '[data-sbm-meira="1"].nav-grp-start:not([data-sbm-sec])::after{display:none!important}',
      B + ':hover:not(.active){background:rgba(255,255,255,.045)!important;color:#fff!important}',
      B + ':hover:not(.active) > svg[stroke="currentColor"]{color:#c9ced6!important}',
      B + ':focus-visible{outline:2px solid #f0584c!important;outline-offset:1px!important}',
      // Virkur hnappur — rauður málmur með ljósdíóðu
      B + '.active{height:38px!important;min-height:38px!important;background:' + RED_METAL + '!important;border:1px solid rgba(190,32,28,.55)!important;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16)!important;color:#fff!important;font-weight:600!important}',
      B + '.active > svg[stroke="currentColor"],' + B + '.active > span > svg[stroke="currentColor"]{color:#fff!important}',
      B + '.active::before{content:""!important;position:absolute!important;inset:auto!important;left:10px!important;top:50%!important;width:6px!important;height:6px!important;margin-top:-3px!important;border-radius:50%!important;background:#ffb3ab!important;box-shadow:0 0 8px #f0584c!important;transform:none!important;opacity:1!important}',
      // Fjöldamerki — ferköntuð mono-flís (241/15/166/drög/reikninga-póstur)
      B + ' .sb-badge,' + B + ' .ky-badge,' + B + ' ._rb-ljos,' + B + ' [class*="badge"]:not([class*="dot"]):not(#alert-badge)' +
        '{display:inline-block!important;flex:0 0 auto!important;margin-left:auto!important;min-width:0!important;height:auto!important;padding:1px 6px!important;border:1px solid #30333a!important;border-radius:3px!important;background:#24262c!important;box-shadow:none!important;color:#d5dbe6!important;font:700 10.5px/1.35 ' + MONO + '!important;font-variant-numeric:tabular-nums!important;letter-spacing:0!important}',
      B + '.active .sb-badge,' + B + '.active .ky-badge,' + B + '.active ._rb-ljos,' + B + '.active [class*="badge"]:not([class*="dot"])' +
        '{background:rgba(0,0,0,.35)!important;border-color:transparent!important;color:#fff!important}',
      B + ' .sb-badge:empty,' + B + ' .sb-badge.zero,' + B + ' .sb-badge.mip-badge{display:none!important}',
      // Hópar: dauf lína; með heiti → mono-yfirskrift + lína hægra megin
      B + '.nav-grp-start{margin-top:12px!important;border-top:1px solid transparent!important}',
      B + '.nav-grp-start::after{content:""!important;position:absolute!important;inset:auto!important;left:8px!important;right:0!important;top:-8px!important;height:1px!important;background:#23252b!important;pointer-events:none!important;opacity:1!important}',
      B + '.nav-grp-start[data-sbm-sec]{margin-top:32px!important}',
      B + '.nav-grp-start[data-sbm-sec]::after{content:attr(data-sbm-sec)!important;top:-25px!important;height:14px!important;background:linear-gradient(#23252b,#23252b) no-repeat right center!important;background-size:calc(100% - 90px) 1px!important;font:700 10px/14px ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#6f7888!important;white-space:nowrap!important;text-shadow:none!important}',
      labelW,
      // Aðlaga-hnappurinn og Tenglar neðst í listanum
      B + '._sc-launcher{color:#8f98a8!important;font-size:12.5px!important}',
      N + ' .qlinks-section{margin-top:18px!important;padding:0!important;background:transparent!important;border:0!important}',
      N + ' .qlinks-label{padding:4px 8px 6px!important;font:700 10px/14px ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#6f7888!important}',
      N + ' .qlinks-btn{display:flex!important;align-items:center!important;gap:11px!important;height:32px!important;padding:0 10px 0 26px!important;border-radius:3px!important;background:transparent!important;border:0!important;color:#aeb6c4!important;font:500 12.5px/1.2 ' + SANS + '!important;text-decoration:none!important}',
      N + ' .qlinks-btn:hover{background:rgba(255,255,255,.045)!important;color:#fff!important}',
      // Byggingarstimpillinn (292) — límdur neðst í listann, dempaður mono
      N + ' > ._build-stamp{order:99999!important;position:sticky!important;bottom:-10px!important;z-index:2;margin:12px -10px -10px!important;padding:7px 14px 9px!important;border-radius:0!important;border-top:1px solid #1f2126!important;background:#0c0d10!important;color:#5c6473!important;font:500 10px/1.3 ' + MONO + '!important;text-align:left!important;word-break:normal!important}',
      N + ' > ._build-stamp:hover{color:#8f98a8!important}',
      // Notandinn neðst: [JS] Jón S. / • Tengt ……… [bjalla]
      P + ' > .topbar-right{order:3;display:grid!important;grid-template-columns:32px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:10px!important;row-gap:1px!important;align-items:center!important;flex:none!important;padding:12px 62px 12px 14px!important;border-top:1px solid #1f2126!important;background:transparent!important}',
      P + ' > .topbar-right > #sync-dot,' + P + ' > .topbar-right > .alert-badge{display:none!important}',
      P + ' > .topbar-right .user-chip{display:contents!important}',
      P + ' > .topbar-right .user-avatar{grid-column:1!important;grid-row:1 / span 2!important;width:32px!important;height:32px!important;border-radius:50%!important;background:linear-gradient(145deg,#6c0d10,#c92a2a)!important;color:#fff!important;font:700 11.5px/1 ' + SANS + '!important;display:flex!important;align-items:center!important;justify-content:center!important}',
      P + ' > .topbar-right .user-chip > span{grid-column:2!important;grid-row:1!important;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eef1f4!important;font:600 13px/1.25 ' + SANS + '!important}',
      P + ' > .topbar-right .online-chip{grid-column:2!important;grid-row:2!important;display:flex!important;align-items:center!important;gap:5px!important;padding:0!important;color:#8f98a8!important;font:400 11px/1.3 ' + SANS + '!important}',
      P + ' > .topbar-right .online-chip .sync-dot{width:6px!important;height:6px!important;box-shadow:0 0 6px currentColor}',
      P + ' > #notif-bell{order:4;position:absolute!important;right:14px!important;bottom:calc(var(--sbm-tray,0px) + 10px)!important;top:auto!important;left:auto!important;width:36px!important;height:36px!important;margin:0!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #25272d!important;border-radius:3px!important;background:#0a0b0d!important;color:#c9ced6!important;font-size:0!important;line-height:0!important;box-shadow:none!important}',
      P + ' > #notif-bell::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:' + BELL + ' center/contain no-repeat;mask:' + BELL + ' center/contain no-repeat}',
      P + ' > #notif-bell:hover{border-color:#3a3d44!important;color:#fff!important}',
      P + ' > #notif-bell .notif-badge{position:absolute!important;top:-6px!important;right:-8px!important;left:auto!important;bottom:auto!important;min-width:0!important;height:auto!important;padding:1px 4px!important;border:0!important;border-radius:3px!important;background:#c92a2a!important;color:#fff!important;font:700 9.5px/1.3 ' + MONO + '!important;box-shadow:none!important}',
      P + ' > #notif-bell .notif-badge:empty{display:none!important}',
      // CG-hnappurinn (fastur neðst til vinstri) fær eigin rönd svo hann hylji ekki notandann
      'html body:not(.appmode):has(#cg-sk-trigger) .topbar{--sbm-tray:44px;padding-bottom:44px!important}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_sbm-css';
    // „Sjá meira"-línan er aðeins á tölvuskjá; síma-skúffa og uppsett öpp sjá hana ekki.
    st.textContent = '.sbm-meira-tgl{display:none}\n@media (min-width: 901px){\n' + css + '\n}';
    (document.head || document.documentElement).appendChild(st);
  }

  // Leitarhnappurinn (56) er búinn til einu sinni — tákn + „Leita eða fara á…".
  function dressSearch() {
    const b = document.getElementById('gs-trigger');
    if (!b || b.dataset.sbm === '1') return !!b;
    b.dataset.sbm = '1';
    b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<span class="sbm-gs-t">Leita eða fara á…</span><kbd>⌘K</kbd>';
    return true;
  }

  // Tákn sem standa sem TEXTI fremst í heitinu („📱 Öpp", „📊 Staðan") — 243 pakkar
  // þeim í .vnav-icon-norm en missir af hnöppum sem fá textann eftir að hann merkti þá.
  // Sami pakki hér, svo CSS-reglan sem felur táknin nái þeim líka. textContent óbreytt.
  const EMOJI_RE = /^(\s*)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{20E3}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]*)(\s*)/u;
  function felaEmoji(btns) {
    btns.forEach(btn => {
      const w = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.parentElement && n.parentElement.closest('.vnav-icon-norm,[class*="badge"],._rb-ljos'))
          ? NodeFilter.FILTER_REJECT
          : (String(n.nodeValue || '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
      });
      const tn = w.nextNode();
      const m = tn ? EMOJI_RE.exec(tn.nodeValue) : null;
      if (!m) return;
      // textContent verður að haldast STAFRÉTT: 68 felur hnappa án data-view eftir
      // textanum („#🏷️ prenta qr miða"). Fyrsta útgáfan át bilið á eftir tákninu og
      // „Prenta QR miða" (falinn í sidebar_hidden) birtist aftur (mælt 01.10). Því er
      // aðeins táknið sjálft klofið frá — bilin standa kyrr í textanum.
      const tak = m[1] ? tn.splitText(m[1].length) : tn;
      tak.splitText(m[2].length);
      const s = document.createElement('span');
      s.className = 'vnav-icon-norm';
      tak.parentNode.insertBefore(s, tak);
      s.appendChild(tak);
    });
  }

  // „Sjá meira" (Agnar 01.10.2026: „bæta við einni línu … sem gerir allt fyrir neðan
  // collapsed … collapsed as default … fyrirsögnina Sjá meira"). Línan fylgir Öpp í
  // RÖÐ NOTANDANS (171/68 á þjóni), ekki föstum lista: allt sem raðast á eftir Öpp fer
  // undir hana. Opið/lokað lifir aðeins þessa setu (data-sbm-opin á nav).
  const MEIRA_EFTIR = 'opp';
  function sjaMeira(nav, btns) {
    const k = btns.findIndex(el => el.getAttribute('data-view') === MEIRA_EFTIR);
    const eftir = k >= 0 ? btns.slice(k + 1) : [];
    let tgl = nav.querySelector(':scope > .sbm-meira-tgl');
    if (!eftir.length) {
      nav.querySelectorAll(':scope > [data-sbm-meira]').forEach(el => el.removeAttribute('data-sbm-meira'));
      if (tgl) tgl.remove();
      return;
    }
    const undir = new Set(eftir);
    nav.querySelectorAll(':scope > .vnav-btn[data-sbm-meira]').forEach(el => { if (!undir.has(el)) el.removeAttribute('data-sbm-meira'); });
    eftir.forEach((el, i) => { const v = i === 0 ? '1' : ''; if (el.getAttribute('data-sbm-meira') !== v) el.setAttribute('data-sbm-meira', v); });
    const opp = btns[k];
    const ord = String(opp.style.order || getComputedStyle(opp).order || '0');
    // Tenglar (qlinks, order 9001) teljast með þegar þeir raðast á eftir Öpp.
    const ql = nav.querySelector(':scope > .qlinks-section');
    if (ql) {
      const ofar = (parseFloat(ql.style.order || getComputedStyle(ql).order) || 0) > (parseFloat(ord) || 0);
      if (ofar && !ql.hasAttribute('data-sbm-meira')) ql.setAttribute('data-sbm-meira', '');
      if (!ofar && ql.hasAttribute('data-sbm-meira')) ql.removeAttribute('data-sbm-meira');
    }
    if (!tgl) {
      tgl = document.createElement('div');
      tgl.className = 'sbm-meira-tgl';
      tgl.setAttribute('role', 'button');
      tgl.tabIndex = 0;
      tgl.addEventListener('click', () => vixlaMeira(nav));
      tgl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vixlaMeira(nav); } });
    }
    // Sama `order` og Öpp + beint á eftir því í DOM → flex setur línuna strax undir Öpp.
    if (tgl.style.order !== ord) tgl.style.order = ord;
    if (opp.nextElementSibling !== tgl) opp.after(tgl);
    merkjaMeira(nav, tgl);
  }
  function vixlaMeira(nav) {
    if (nav.hasAttribute('data-sbm-opin')) nav.removeAttribute('data-sbm-opin');
    else nav.setAttribute('data-sbm-opin', '');
    merkjaMeira(nav, nav.querySelector(':scope > .sbm-meira-tgl'));
  }
  function merkjaMeira(nav, tgl) {
    if (!tgl) return;
    const opin = nav.hasAttribute('data-sbm-opin');
    const txt = opin ? 'Sjá minna ▴' : 'Sjá meira ▾';
    if (tgl.textContent !== txt) tgl.textContent = txt;
    if (tgl.getAttribute('aria-expanded') !== String(opin)) tgl.setAttribute('aria-expanded', String(opin));
  }

  // Heiti hlutanna á fyrsta hnapp hvers hóps. Les sömu röð og notandinn sér
  // (CSS `order` frá 68, svo DOM-röð) og skrifar aðeins ef eitthvað breyttist.
  function label() {
    const nav = document.querySelector('.topbar nav.view-nav');
    if (!nav) return;
    // Mælt án „Sjá meira"-felunnar (sjá CSS). data-* á nav er utan vaktarans hér að neðan.
    nav.setAttribute('data-sbm-maela', '');
    let btns;
    try {
      btns = Array.from(nav.querySelectorAll(':scope > .vnav-btn'))
        .map((el, i) => ({ el, i, ord: parseFloat(el.style.order || getComputedStyle(el).order) || 0 }))
        .filter(x => x.el.style.display !== 'none' && getComputedStyle(x.el).display !== 'none')
        .sort((a, b) => (a.ord - b.ord) || (a.i - b.i))
        .map(x => x.el);
    } finally { nav.removeAttribute('data-sbm-maela'); }
    try { felaEmoji(btns); } catch (_) {}
    try { sjaMeira(nav, btns); } catch (_) {}
    const groups = [];
    btns.forEach((el, k) => {
      if (k === 0 || el.classList.contains('nav-grp-start')) groups.push([]);
      groups[groups.length - 1].push(el);
    });
    const used = new Set();
    groups.forEach((g, gi) => {
      const head = g[0];
      let name = null;
      if (gi > 0 && head.classList.contains('nav-grp-start')) {
        const votes = {};
        g.forEach(el => { const s = SEC_OF[el.getAttribute('data-view') || '']; if (s) votes[s] = (votes[s] || 0) + 1; });
        let best = 0;
        Object.keys(votes).forEach(s => { if (votes[s] > best) { best = votes[s]; name = s; } });
        // Heiti birtist AÐEINS einu sinni — fleiri hópar úr sama hluta fá línuna eina.
        if (name && used.has(name)) name = null;
      }
      if (name) used.add(name);
      if ((head.getAttribute('data-sbm-sec') || null) !== name) {
        if (name) head.setAttribute('data-sbm-sec', name); else head.removeAttribute('data-sbm-sec');
      }
      g.slice(1).forEach(el => { if (el.hasAttribute('data-sbm-sec')) el.removeAttribute('data-sbm-sec'); });
    });
  }

  // Tóm talningarmerki (t.d. `<span class="sb-badge zero">` á Sölu) birtust sem
  // pínulítið strik hægra megin. Mælt 22.09.2026: hvorki `display:none!important`
  // frá 241 né héðan hafði áhrif á þau — EINA leiðin sem dugði var inline
  // !important. Þess vegna er það gert hér, og tekið af um leið og tala kemur.
  function hideEmptyBadges(nav) {
    nav.querySelectorAll('.vnav-btn .sb-badge').forEach(b => {
      const tomt = !String(b.textContent || '').trim();
      if (tomt) { if (b.style.display !== 'none') b.style.setProperty('display', 'none', 'important'); }
      else if (b.style.display === 'none') b.style.removeProperty('display');
    });
  }

  // 25.09.2026 (afköst): label() les getComputedStyle á ~60 hnöppum (þvingar stílendurreikning á öllu
  // skjalinu) og keyrði við HVERJA breytingu á talningarmerkjum (sb-badge texti/klasi, margoft á mínútu).
  // Merkin hafa engin áhrif á hópa/röð — þá er aðeins hideEmptyBadges keyrt.
  let t = null, needLabel = true;
  function onNav(recs) {
    if (!recs || recs.some(r => { const x = r.target.nodeType === 1 ? r.target : r.target.parentElement; return !(x && x.closest && x.closest('.sb-badge,._drog-badge,.ky-badge')); })) needLabel = true;
    schedule();
  }
  function schedule() {
    if (t) return;
    t = setTimeout(() => {
      t = null;
      const nav = document.querySelector('.topbar nav.view-nav');
      if (needLabel) { needLabel = false; try { label(); } catch (_) {} }
      try { if (nav) hideEmptyBadges(nav); } catch (_) {}
      try { dressSearch(); } catch (_) {}
    }, 250);
  }

  function start() {
    injectCss();
    schedule();
    const nav = document.querySelector('.topbar nav.view-nav');
    if (nav) {
      // class/style (68 raðar með order + nav-grp-start), nýir hnappar og texti
      // í talningarmerkjunum (15/166/…). Ekkert annað — stikan er lítið tré.
      new MutationObserver(onNav).observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }
    // 56 býr leitarhnappinn til eftir ~1,5 s
    let n = 0; const iv = setInterval(() => { if (dressSearch() || ++n > 40) clearInterval(iv); }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.HlidarstikaMidar = { label, SEC };
  console.log('[391] hliðarstika í Miðakerfinu');
})();
/* === END HLIÐARSTIKA Í MIÐAKERFINU === */
