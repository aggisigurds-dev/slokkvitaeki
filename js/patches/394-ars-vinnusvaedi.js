/* === ÁRSSKOÐUN: VINNUSVÆÐI — STRIMILL, SÍUSTIKA, BIL (394) — 22.09.2026 ===
 *
 * Hönnunin sem Agnar samþykkti (https://claude.ai/artifact/KbvQMth5FzXN5vQHdj86k1),
 * í húsalitunum. 393 sá um málminn á töflunni; hér koma hlutarnir sem eru MEIRA en stíll:
 *
 *   1. Mánaðastrimill — súlur í stað flísa, hæðin = fjöldi staða, mánuðurinn sem stendur
 *      yfir í gulli. Segir á augabragði hvar álagið liggur á árinu.
 *   2. Síustikan úr hönnuninni — ein silfurstika með sex daglegu síunum (virk = málmur),
 *      „Fleiri síur" með hinum níu, og virkar aukasíur sem stálflísar með ✕.
 *   3. Hlutahaus „Staðirnir" og þétt bil — kortatakkinn og póstnúmera-sían deila línu.
 *
 * 153 ER EKKI SNERT (vörðuð lína). Þetta er hjúpur: hann LES flísarnar sem 153 teiknar og
 * SMELLIR á þær — engin sía, ekkert ástand og engin gögn eru afrituð hingað. Þess vegna
 * helst hegðunin nákvæmlega eins og áður, líka þegar 153 breytist.
 *
 * ENGIN BLIKK (Agnar 22.09: „og ekkert blikk"). Fyrsta útgáfan faldi upprunalegu raðirnar
 * EFTIR að hún hafði teiknað sínar eigin — og þar sem 153 endurteiknar sýnina við hverja
 * síubreytingu sást gamla flísaröðin í ~260 ms í hvert sinn áður en strimillinn tók við.
 * Nú fela stílarnir raðirnar STRAX, en aðeins þegar `<html data-arsm="1">` stendur, og það
 * merki er sett við FYRSTU heppnuðu smíði og tekið af ef smíðin fellur. Falli hjúpurinn
 * út birtast því upprunalegu raðirnar aftur óbreyttar — aldrei síðulaus sía.
 */
(() => {
  if (window.__arsVinnusvaediInstalled) return;
  window.__arsVinnusvaediInstalled = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const STEELBAR = 'linear-gradient(180deg,#e2e6ec 0%,#8f98a8 40%,#555d6b 60%,#737c8b 100%)';
  const GOLDBAR = 'linear-gradient(180deg,#ffe9b0 0%,#d3ab4e 40%,#7a5608 60%,#a67f22 100%)';
  const AMBERBAR = 'linear-gradient(180deg,#ffe0a0 0%,#e0a93e 40%,#935f0d 60%,#b27b1c 100%)';
  const REDBAR = 'linear-gradient(180deg,#ff9d95 0%,#e25555 40%,#971515 60%,#b52020 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';

  // Síurnar sem eru notaðar daglega standa í stikunni; hinar fara í hólfið.
  // (Heitin koma úr 153: „Allt", „✅ Búið 2026 355", „⏳ Eftir 158", „🗓️ Eftir 2026 270", …)
  // Borðið sýnir NÁKVÆMLEGA fimm: Allt · Búið 2026 · Eftir 2026 · Í vinnslu · Aksturslisti.
  // (Stakt „⏳ Eftir" — öll ár — fer með hinum í hólfið.)
  const ADAL = [/^allt$/i, /búið/i, /eftir\s*20/i, /í vinnslu/i, /aksturslisti/i];

  function css() {
    const V = 'html body #view-arsskodun ';
    // TVÖFALDUR ID VILJANDI: 153 skrifar sjálft `#view-arsskodun#view-arsskodun …
    // {display:flex!important}` (lína ~3434) og sá selector er sterkari en `html body
    // #view-arsskodun …`. Mælt 22.09: gamla mánaðaröðin stóð eftir undir strimlinum
    // þangað til ID-ið var tvöfaldað hér líka.
    const W = 'html body #view-arsskodun#view-arsskodun ';
    const F = 'html[data-arsm="1"] body #view-arsskodun#view-arsskodun ';
    return [
      // ── Upprunalegu raðirnar víkja UM LEIÐ og hjúpurinn er virkur ──────────
      F + '._ars-morow{display:none!important}',
      F + '._ars-statusrow{display:none!important}',

      // ── 1 · mánaðastrimill ────────────────────────────────────────────────
      V + '.arsm-strip{display:grid;gap:6px;align-items:end;padding:12px 16px 14px;margin:0 0 10px;border-top:3px solid #555d6b;border-radius:2px;background-image:' + STRIPE + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 30px -14px rgba(0,0,0,.7)}',
      V + '.arsm-head{grid-column:1/-1;display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}',
      V + '.arsm-head b{font:700 10.5px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#d3ab4e}',
      V + '.arsm-head span{font:500 11.5px/1.4 ' + MONO + ';color:#aeb6c4}',
      V + '.arsm-head span b{font-size:11.5px;letter-spacing:0;text-transform:none;color:#fff}',
      V + '.arsm-b{display:flex;flex-direction:column;align-items:center;gap:6px;padding:0;border:0;background:transparent;cursor:pointer}',
      V + '.arsm-b i{display:block;width:100%;border-radius:1px;background:' + STEELBAR + ';transition:filter .12s}',
      V + '.arsm-b:hover i{filter:brightness(1.15)}',
      V + '.arsm-b em{font:700 11px/1 ' + MONO + ';font-style:normal;color:#fff}',
      V + '.arsm-b u{font:500 10.5px/1 ' + MONO + ';text-decoration:none;color:#aeb6c4}',
      V + '.arsm-b.is-nu i{background:' + GOLDBAR + ';box-shadow:0 0 16px -4px rgba(211,171,78,.8)}',
      V + '.arsm-b.is-nu em,' + V + '.arsm-b.is-nu u{color:#ffd27a}',
      V + '.arsm-b.is-on i{background:' + REDBAR + ';box-shadow:0 0 16px -4px rgba(226,85,85,.75)}',
      V + '.arsm-b.is-on em,' + V + '.arsm-b.is-on u{color:#ff9d95}',
      V + '.arsm-b.is-all i{background:repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 3px,rgba(255,255,255,.03) 3px 6px);border:1px solid rgba(255,255,255,.14);box-sizing:border-box}',
      V + '.arsm-b.is-tom i{background:' + AMBERBAR + '}',
      V + '.arsm-b.is-tom em,' + V + '.arsm-b.is-tom u{color:#e0a93e}',

      // ── 2 · síustikan ─────────────────────────────────────────────────────
      // Röðin á borðinu: síur · Fleiri síur · LEITIN sem fyllir út í · Bílstjóri.
      // Leitarreiturinn er EKKI færður til í DOM-inu — aðeins `order` — því 153
      // endurteiknar við innslátt og fluttur reitur myndi missa bendilinn.
      F + '._ars-filterstrip{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;margin:0 0 8px!important}',
      F + '#_ars-search{order:3!important;flex:1 1 220px!important;min-width:180px!important;max-width:none!important}',
      F + '.arsm-seg{order:1}',
      F + '.arsm-more{order:2}',
      F + '#_ars-searchall{order:2}',
      // Kort/Listi-parið fer (Agnar 22.09: „það má taka út hönnunarham og kort/listi“);
      // kortið er opnað með takkanum í hlutahausnum eins og á borðinu.
      F + '._ars-vm{display:none!important}',
      F + '#_ars-pnr-row{display:none!important}',
      V + '.arsm-seg{display:flex;height:44px;border:1px solid rgba(20,24,34,.22);border-radius:3px;overflow:hidden;background:' + SILVER + ';box-shadow:0 6px 16px -12px rgba(0,0,0,.5)}',
      // Merkimiði yfir tölu — eins og á borðinu.
      V + '.arsm-seg button{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0 17px;border:0;border-left:1px solid rgba(20,24,34,.14);background:transparent;color:#3a4250;font:600 12.5px ' + SANS + ';line-height:1.15;white-space:nowrap;cursor:pointer}',
      V + '.arsm-seg button:first-child{border-left:0}',
      V + '.arsm-seg button:hover{background:rgba(20,24,34,.06)}',
      V + '.arsm-seg button span{font:700 11.5px ' + MONO + ';color:#6b7483}',
      V + '.arsm-seg button.is-on{background-image:' + STRIPE + METAL + ';color:#fff;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      V + '.arsm-seg button.is-on:hover{background-image:' + STRIPE + METAL + '}',
      V + '.arsm-seg button.is-on span{color:rgba(255,255,255,.78)}',
      V + '.arsm-more{position:relative;display:inline-flex}',
      V + '.arsm-more>button{height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid rgba(20,24,34,.16);border-radius:3px;background:' + SILVER + ';color:#3a4250;font:600 12.5px ' + SANS + ';cursor:pointer}',
      V + '.arsm-more>button b{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:2px;background:' + RED + ';color:#fff;font:700 10px ' + MONO + '}',
      V + '.arsm-menu{position:absolute;top:42px;left:0;z-index:60;width:264px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:3px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5)}',
      V + '.arsm-menu[hidden]{display:none}',
      V + '.arsm-menu button{display:flex;align-items:center;gap:9px;height:34px;padding:0 9px;border:0;border-radius:2px;background:transparent;color:#1f2530;font:500 13px ' + SANS + ';text-align:left;cursor:pointer}',
      V + '.arsm-menu button:hover{background:#f1f4f8}',
      V + '.arsm-menu button.is-on{background-image:' + RED + ';color:#fff}',
      V + '.arsm-menu button span{margin-left:auto;font:700 11px ' + MONO + ';color:#6b7483}',
      V + '.arsm-menu button.is-on span{color:#ffd8d4}',
      // clear:right — Bílstjóri flýtur til hægri og lagðist ella OFAN á þessa röð.
      V + '.arsm-tags{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;clear:right}',
      V + '.arsm-tags>i{font:700 10.5px/1 ' + MONO + ';font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:#1f2530}',
      V + '.arsm-tag{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 10px 0 0;border:1px solid rgba(20,24,34,.16);border-radius:3px;background:' + SILVER + ';color:#3a4250;font:600 11.5px ' + SANS + ';overflow:hidden;cursor:pointer}',
      V + '.arsm-tag i{width:4px;align-self:stretch;background:' + REDBAR + '}',
      V + '.arsm-tag b{font:700 11px ' + MONO + ';color:#6b7483}',
      V + '.arsm-tag u{text-decoration:none;color:#8a93a3;margin-left:2px}',
      // leitarreiturinn í sama takti og stikan (153 gefur honum 8px hæð minna)
      W + '#_ars-search{height:44px!important;box-sizing:border-box!important;max-width:none!important;border-radius:3px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.18)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.14)!important}',

      // ── Hetjuspjaldið: skiptistikan og skýringin af borðinu ───────────────
      V + '.arsm-herobar{display:flex;gap:3px;height:8px;margin:4px 0 2px}',
      V + '.arsm-herobar span{flex-basis:0;border-radius:2px}',
      V + '.arsm-heroleg{display:flex;flex-wrap:wrap;gap:6px 26px;font:500 12px ' + MONO + ';color:#d5dbe6;margin-top:2px}',
      V + '.arsm-heroleg em{display:inline-flex;align-items:center;gap:8px;font-style:normal}',
      V + '.arsm-heroleg i{width:9px;height:9px;border-radius:1px;display:block}',
      V + '.arsm-heroleg b{color:#fff}',
      V + '.bstal-hero .arsm-mkr{font-family:' + SANS + '!important;font-size:18px!important;font-weight:700!important;color:#aeb6c4!important;letter-spacing:0!important}',
      // Tölur síanna bera lit síunnar, eins og á borðinu.
      V + '.arsm-seg button[data-lit="graent"] span{color:#0b6b3a}',
      V + '.arsm-seg button[data-lit="gult"] span{color:#845400}',

      // ── 3 · hlutahaus og bilið ────────────────────────────────────────────
      V + '.arsm-sec{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:2px 2px 8px}',
      V + '.arsm-sec h2{margin:0;font:800 24px/1.1 ' + DISPLAY + ';letter-spacing:-.02em;color:#11141c}',
      V + '.arsm-sec span{font:500 11.5px/1.4 ' + MONO + ';color:#2b313c}',
      // Agnar 22.09 („allt of mikið bil"): kortatakkinn og póstnúmera-sían voru tvær
      // næstum tómar raðir hvor undir annarri, 90 px af engu milli strimils og töflu.
      // Takkinn flýtur nú til hægri svo raðirnar deila einni línu.
      // NB: hvort tveggja er AUÐKENNI í 153 (`id="_arsmap-wrapper"`, `id="_ars-pnr-row"`),
      // ekki klasi — punktaútgáfan hitti ekkert og bilið stóð óbreytt.
      // Agnar 22.09 („allt of mikið bil"): kortatakkinn og póstnúmera-sían voru tvær
      // næstum tómar raðir, 90 px af engu milli strimils og töflu. Takkarnir sitja nú
      // í hlutahausnum (eins og „Númer ▾ · Raða ▾" á borðinu) og raðirnar hverfa.
      F + '#_arsmap-wrapper{margin:0!important}',
      V + '.arsm-sec .arsm-verkf{display:flex;align-items:center;gap:8px;margin-left:auto}',
      V + '.arsm-sec .arsm-verkf>*{margin:0!important}',
    ].join('\n');
  }

  function injectCss() {
    if (document.getElementById('_arsv-css')) return;
    const st = document.createElement('style');
    st.id = '_arsv-css';
    st.textContent = '@media (min-width: 901px){\n' + css() + '\n}';
    (document.head || document.documentElement).appendChild(st);
  }

  const talaAf = el => {
    const m = String(el.textContent || '').match(/(\d[\d.]*)\s*$/);
    return m ? +m[1].replace(/\./g, '') : 0;
  };
  const heitiAf = el => String(el.textContent || '').replace(/\s*\d[\d.]*\s*$/, '').trim();
  const erVirk = el => (el.getAttribute('style') || '').indexOf('--brand') !== -1;
  const merkja = on => { document.documentElement.setAttribute('data-arsm', on ? '1' : '0'); };

  /* Takkar sem við FÆRUM (Bílstjóri, Númer, Sýna kort) eiga aðra eigendur — 153 og
   * 317/318. Fyrsta útgáfan fjarlægði einfaldlega sína eigin gáma við endurbyggingu
   * og tók þá með sér: „📍 Númer" og „🗺️ Sýna kort" HURFU af síðunni og komu ekki
   * aftur fyrr en við næstu heilu hleðslu (mælt 22.09). Þess vegna man þessi vörpun
   * hvar hver takki á heima og skilar honum þangað áður en gámur er fjarlægður. */
  const HEIM = new WeakMap();
  function faera(node, gamur) {
    if (!node || !gamur) return null;
    if (!HEIM.has(node)) HEIM.set(node, node.parentElement);
    node.style.removeProperty('display');      // gæti hafa verið lagður til hliðar falinn
    gamur.appendChild(node);
    return node;
  }
  function heimskila(gamur) {
    if (!gamur) return;
    const vara = document.querySelector('#view-arsskodun #ars-main');
    Array.from(gamur.children).forEach(ch => {
      const heim = HEIM.get(ch);
      // Sé heimilið horfið (153 endurteiknaði) er takkinn samt EKKI látinn fylgja
      // gámnum í ruslið — hann er lagður í sýnina svo næsta smíði finni hann aftur.
      if (heim && heim.isConnected) heim.appendChild(ch);
      else if (vara) { ch.style.setProperty('display', 'none', 'important'); vara.appendChild(ch); }
    });
  }

  // ── 1 · mánaðastrimill ────────────────────────────────────────────────────
  function strimill(root) {
    const row = root.querySelector('._ars-morow');
    if (!row) return;
    const gomul = root.querySelector('.arsm-strip');
    // Merkið eitt dugar ekki sem „þegar smíðað": eftir ferð niður í símabreidd er
    // röðin enn merkt en strimillinn farinn, og þá stæði síðan mánaðarlaus.
    if (gomul && row.dataset.arsm === 'falid') return;
    const chips = Array.from(row.querySelectorAll('._ars-mo'));
    if (chips.length < 6) return;                     // ekki það sem við héldum — snertum ekkert
    if (gomul) gomul.remove();

    const tolur = chips.map(talaAf);
    // Kvarðinn nær yfir MÁNUÐINA eina og byrjar á lægsta mánuðinum, ekki á núlli:
    // 36 á móti 76 lítur eins út frá núlli, og þá segir strimillinn ekkert.
    const manTolur = tolur.slice(1, -1).filter(n => n > 0);
    const lagst = manTolur.length ? Math.min.apply(null, manTolur) : 0;
    const haest = manTolur.length ? Math.max.apply(null, manTolur) : 1;
    const bil = Math.max(1, haest - lagst);
    const manSum = tolur.slice(1, -1).reduce((a, b) => a + b, 0);
    const anMan = tolur[tolur.length - 1] || 0;

    const strip = document.createElement('div');
    strip.className = 'arsm-strip';
    strip.style.gridTemplateColumns = 'repeat(' + chips.length + ',minmax(0,1fr))';
    const haus = document.createElement('div');
    haus.className = 'arsm-head';
    const nuHeiti = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'][new Date().getMonth()];
    const hb = document.createElement('b');
    hb.textContent = 'Skoðunarmánuður · ' + new Date().getFullYear();
    const hs = document.createElement('span');
    haus.appendChild(hb); haus.appendChild(hs);
    strip.appendChild(haus);

    chips.forEach((c, i) => {
      const n = tolur[i];
      const heiti = heitiAf(c);
      const erAllir = /allir/i.test(heiti);
      const erTom = /án mánaðar/i.test(heiti);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'arsm-b' + (erAllir ? ' is-all' : '') + (erTom ? ' is-tom' : '') +
        (c.getAttribute('aria-pressed') === 'true' ? ' is-on' : '') +
        (!erAllir && !erTom && heiti.toLowerCase().slice(0, 3) === nuHeiti.slice(0, 3) ? ' is-nu' : '');
      b.title = heiti + (n ? ' — ' + n + ' staðir' : '');
      // Klemmt við 58: „Án mánaðar" er utan kvarðans og getur annars orðið margfalt
      // hærri en strimillinn — mælt 236 px þegar sían „Engin tæki" skildi eftir 16
      // án mánaðar á móti 4 í hæsta mánuði.
      const h = erAllir ? 58 : (n ? Math.min(58, Math.max(12, Math.round(16 + ((n - lagst) / bil) * 44))) : 6);
      b.innerHTML = '<i style="height:' + h + 'px"></i><em></em><u></u>';
      b.querySelector('em').textContent = erTom ? 'Án mán.' : heiti;
      b.querySelector('u').textContent = n ? String(n) : (erAllir ? String(manSum + anMan) : '0');
      b.addEventListener('click', () => c.click());        // 153 á síuna — við smellum bara
      strip.appendChild(b);
    });

    const nuChip = chips.find(c => heitiAf(c).toLowerCase().slice(0, 3) === nuHeiti.slice(0, 3));
    hs.textContent = manSum + ' með mánuð · ' + anMan + ' án mánaðar';
    if (nuChip) {
      hs.appendChild(document.createTextNode(' · ' + heitiAf(nuChip) + ' '));
      const nb = document.createElement('b');
      nb.textContent = String(talaAf(nuChip));
      hs.appendChild(nb);
      hs.appendChild(document.createTextNode(' í dag'));
    }

    row.parentNode.insertBefore(strip, row);
    row.dataset.arsm = 'falid';
  }

  // ── 2 · síustikan (segmentuð stika + Fleiri síur + virkar flísar) ─────────
  function siur(root) {
    const row = root.querySelector('._ars-statusrow');
    if (!row) return false;
    const chips = Array.from(row.querySelectorAll('._ars-st'));
    if (chips.length < 8) return false;
    const adal = chips.filter(c => ADAL.some(re => re.test(heitiAf(c))));
    const auka = chips.filter(c => !ADAL.some(re => re.test(heitiAf(c))));
    if (!adal.length || !auka.length) return false;

    // Stikan SJÁLF er filterstrip 153 — við bætum í hana og röðum með `order`,
    // svo leitarreiturinn haldi bendlinum við innslátt.
    const bar = row.closest('._ars-filterstrip') || row.parentNode;
    root.querySelectorAll('.arsm-verk').forEach(heimskila);
    root.querySelectorAll('.arsm-seg,.arsm-more,.arsm-tags,.arsm-verk').forEach(n => n.remove());

    // Daglegu síurnar — ein silfurstika, virk sía í málmi (eins og á borðinu).
    const seg = document.createElement('div');
    seg.className = 'arsm-seg';
    seg.setAttribute('role', 'tablist');
    adal.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      const virk = erVirk(c);
      b.setAttribute('aria-selected', String(virk));
      if (virk) b.className = 'is-on';
      const heiti = heitiAf(c);
      b.textContent = heiti;
      if (/búið/i.test(heiti)) b.dataset.lit = 'graent';
      else if (/eftir/i.test(heiti)) b.dataset.lit = 'gult';
      const n = talaAf(c);
      if (n) { const s = document.createElement('span'); s.textContent = String(n); b.appendChild(s); }
      b.addEventListener('click', () => c.click());
      seg.appendChild(b);
    });
    bar.appendChild(seg);

    // Hólfið með hinum síunum
    const virkAuka = auka.filter(erVirk);
    const wrap = document.createElement('div');
    wrap.className = 'arsm-more';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(document.createTextNode('Fleiri síur'));
    if (virkAuka.length) {
      const bb = document.createElement('b');
      bb.textContent = String(virkAuka.length);
      btn.appendChild(bb);
    }
    const arrow = document.createElement('span');
    arrow.style.color = '#8a93a3';
    arrow.textContent = '▾';
    btn.appendChild(arrow);

    const menu = document.createElement('div');
    menu.className = 'arsm-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    auka.forEach(c => {
      const it = document.createElement('button');
      it.type = 'button';
      it.setAttribute('role', 'menuitem');
      if (erVirk(c)) it.className = 'is-on';
      it.textContent = heitiAf(c);
      const n = talaAf(c);
      if (n) { const s = document.createElement('span'); s.textContent = String(n); it.appendChild(s); }
      it.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); c.click(); });
      menu.appendChild(it);
    });

    // „☐ fela" hakið situr INNI í stöðuröðinni (153 setur það á eftir „Slepptir í
    // fyrra"). Það fylgir þeirri síu, svo það fer með í hólfið.
    const fela = root.querySelector('#_ars-skiphide');
    if (fela) {
      const it = document.createElement('button');
      it.type = 'button';
      it.setAttribute('role', 'menuitem');
      if (fela.getAttribute('aria-checked') === 'true') it.className = 'is-on';
      it.textContent = String(fela.textContent || '').trim() + ' slepptu';
      it.title = fela.getAttribute('title') || '';
      it.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); fela.click(); });
      menu.appendChild(it);
    }

    btn.addEventListener('click', () => {
      const opid = menu.hidden;
      menu.hidden = !opid;
      btn.setAttribute('aria-expanded', String(opid));
    });
    document.addEventListener('pointerdown', e => {
      if (!menu.hidden && !wrap.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    }, true);
    wrap.appendChild(btn); wrap.appendChild(menu);
    bar.appendChild(wrap);

    // Bílstjóri (og Hönnunarhamur) fara út í hægri kantinn á sömu línu — á borðinu
    // stendur „Bílstjóri" þar. Röðin sem hýsti þá verður tóm og víkur.
    // Bílstjóri/Hönnunarhamur (317/318) eru EKKI færðir — aðeins fleytt til hægri þar
    // sem þeir standa. Fyrsta atlagan flutti þá inn í stikuna og þeir hurfu alveg af
    // síðunni: eigendurnir bæta þeim við einu sinni, svo þegar endurbygging fjarlægði
    // gáminn minn fóru takkarnir með. Þeir bera hvorki klasa né auðkenni þegar hér er
    // komið (mælt: `class=""`), svo þeir eru fundnir á textanum og aðeins stílaðir.
    Array.from(bar.parentElement.children).forEach(el => {
      if (el.tagName !== 'BUTTON') return;
      const t = el.textContent || '';
      // Hönnunarhamur er ekki á borðinu (Agnar: „það má taka út hönnunarham og
      // kort/listi"). Hann er falinn, ekki fjarlægður — Stílstjórinn er enn til staðar.
      if (/Hönnunarham/.test(t)) { el.style.setProperty('display', 'none', 'important'); return; }
      if (!/Bílstjóri/.test(t)) return;
      el.style.setProperty('float', 'right', 'important');
      el.style.setProperty('margin', '0 0 8px 7px', 'important');
    });

    if (virkAuka.length) {
      const tags = document.createElement('div');
      tags.className = 'arsm-tags';
      const kick = document.createElement('i');
      kick.textContent = 'Virkar síur';
      tags.appendChild(kick);
      virkAuka.forEach(c => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'arsm-tag';
        t.title = 'Slökkva á síunni';
        t.innerHTML = '<i></i>';
        t.appendChild(document.createTextNode(heitiAf(c)));
        const n = talaAf(c);
        if (n) { const b2 = document.createElement('b'); b2.textContent = String(n); t.appendChild(b2); }
        const x = document.createElement('u'); x.textContent = '✕'; t.appendChild(x);
        t.addEventListener('click', () => { const allt = chips[0]; if (allt) allt.click(); });
        tags.appendChild(t);
      });
      bar.parentNode.insertBefore(tags, bar.nextSibling);
    }
    return true;
  }

  // ── 2b · hetjuspjaldið: skiptistika + skýring (eins og á borðinu) ────────
  // Talan „28,3M" segir ekki hvað er búið og hvað er eftir; borðið sýnir það sem
  // eina rönd. Hér er EKKERT reiknað upp á nýtt: heildin og „þar af búið" eru lesin
  // úr textanum sem 153 skrifar, og staðafjöldinn úr grænu og rauðu spjöldunum.
  function hero(root) {
    const h = root.querySelector('.bstal-hero');
    if (!h || h.querySelector('.arsm-herobar')) return;
    const num = h.children[1], cap = h.children[2];
    if (!num || !cap) return;
    const les = s => {
      const m = String(s || '').match(/([\d.]+,?\d*)\s*M/i);
      return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
    };
    const heild = les(num.textContent);
    const buid = les(cap.textContent);
    if (!isFinite(heild) || !isFinite(buid) || heild <= 0) return;
    const eftir = Math.max(0, heild - buid);
    const kr = n => n.toFixed(1).replace('.', ',') + ' m.kr';
    const stadir = sel => {
      const el = root.querySelector(sel);
      return el ? String(el.textContent || '').trim() : '';
    };
    const GB = 'linear-gradient(180deg,#7fe0a8 0%,#23a35a 40%,#0b5a2e 60%,#137a41 100%)';
    const AB = 'linear-gradient(180deg,#ffe0a0 0%,#e0a93e 40%,#935f0d 60%,#b27b1c 100%)';
    const raun = (String(cap.textContent || '').match(/(\d+)\s*raunreikn/i) || [])[1];

    const bar = document.createElement('div');
    bar.className = 'arsm-herobar';
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', 'Skipting: búið ' + kr(buid) + ', eftir ' + kr(eftir));
    bar.innerHTML = '<span style="flex-grow:' + Math.round(buid * 10) + ';background:' + GB + '"></span>' +
      '<span style="flex-grow:' + Math.max(1, Math.round(eftir * 10)) + ';background:' + AB + '"></span>';

    const leg = document.createElement('div');
    leg.className = 'arsm-heroleg';
    const lina = (grad, heiti, tala, fjoldi) => {
      const em = document.createElement('em');
      em.innerHTML = '<i style="background:' + grad + '"></i>';
      em.appendChild(document.createTextNode(heiti + ' '));
      const b = document.createElement('b'); b.textContent = tala; em.appendChild(b);
      if (fjoldi) em.appendChild(document.createTextNode(' · ' + fjoldi + ' staðir'));
      return em;
    };
    leg.appendChild(lina(GB, 'Búið', kr(buid), stadir('._kpi--graent ._kpi-n')));
    leg.appendChild(lina(AB, 'Eftir', kr(eftir), stadir('._kpi--rautt ._kpi-n')));
    if (raun) {
      const em = document.createElement('em');
      em.style.color = '#aeb6c4';
      em.textContent = raun + ' raunreiknuð';
      leg.appendChild(em);
    }
    // „28,3M" → „28,3 m.kr" eins og á borðinu (einingin í minna letri).
    const mt = String(num.textContent || '').trim().match(/^([\d.]+,?\d*)\s*M\.?$/i);
    if (mt) {
      num.textContent = mt[1] + ' ';
      const ein = document.createElement('span');
      ein.className = 'arsm-mkr';
      ein.textContent = 'm.kr';
      num.appendChild(ein);
    }

    cap.style.setProperty('display', 'none', 'important');
    h.appendChild(bar);
    h.appendChild(leg);
  }

  // ── 3 · hlutahaus yfir töflunni ───────────────────────────────────────────
  function hlutahaus(root) {
    const wrap = root.querySelector('.data-table-wrap, ._ars-tblscroll');
    if (!wrap) return;
    const gamall = root.querySelector('.arsm-sec');
    if (gamall) { heimskila(gamall.querySelector('.arsm-verkf')); gamall.remove(); }
    // Talan er ekki reiknuð hér — hún er LESIN af línunni sem 153 skrifar sjálft
    // („Sýni 632 af 655 viðskiptavinum"). Tvær talningar á sama hlut reka í sundur.
    let talning = '';
    const lina = Array.from(root.querySelectorAll('div')).find(
      d => d.children.length <= 2 && !d.closest('.arsm-sec') &&
        /^\s*Sýni\s+[\d.]+\s+af\s/.test(d.textContent || '')
    );
    if (lina) {
      // Orðalag borðsins: „53 af 632 í þessari síu" (153 skrifar „Sýni 53 af 632
      // viðskiptavinum" — sömu tölur, bara borðið sitt snið).
      const t = String(lina.textContent || '').trim().replace(/\s+/g, ' ');
      const m = t.match(/Sýni\s+([\d.]+)\s+af\s+([\d.]+)/);
      talning = m ? (m[1] + ' af ' + m[2] + ' í þessari síu') : t;
      lina.style.setProperty('display', 'none', 'important');
    } else {
      talning = root.querySelectorAll('table.data-table tbody tr').length + ' raðir';
    }
    const sec = document.createElement('div');
    sec.className = 'arsm-sec';
    const h = document.createElement('h2'); h.textContent = 'Staðirnir';
    const s = document.createElement('span'); s.textContent = talning;
    sec.appendChild(h); sec.appendChild(s);

    // Verkfærin sem stóðu í tveimur hálftómum röðum (póstnúmera-sían og kortatakkinn)
    // setjast hér til hægri — eins og „Númer ▾ · Raða ▾" á borðinu.
    const verkf = document.createElement('div');
    verkf.className = 'arsm-verkf';
    const pnrBtn = root.querySelector('#_ars-pnr-btn');
    const pnrClear = root.querySelector('#_ars-pnr-clear');
    const mapBtn = (() => {
      const w = document.getElementById('_arsmap-wrapper');
      return w ? w.querySelector('button') : null;
    })();
    faera(pnrBtn, verkf);
    faera(pnrClear, verkf);
    faera(mapBtn, verkf);
    if (verkf.children.length) sec.appendChild(verkf);

    const mark = wrap.closest('.thm') || wrap;
    mark.parentNode.insertBefore(sec, mark);
  }

  const OKKAR = '.arsm-strip,.arsm-seg,.arsm-more,.arsm-tags,.arsm-sec,.arsm-herobar,.arsm-heroleg';

  let t = null, inni = false;
  function bygg() {
    const root = document.querySelector('#view-arsskodun #ars-main');
    if (!root || !root.offsetParent) return;
    // Opin valmynd er ekki endurbyggð undan notandanum. (Mælt: að opna hana breytir
    // DOM-inu, sem vakti vaktarann, sem smíðaði hólfið upp á nýtt — lokað.)
    if (root.querySelector('.arsm-menu:not([hidden])')) return;
    // Síminn heldur sínum eigin strimli (331/382): stílarnir hér eru allir í
    // @media(min-width:901px), svo hjúpurinn stendur ósmíðaður þar.
    if (innerWidth < 901) { root.querySelectorAll(OKKAR).forEach(n => n.remove()); merkja(false); return; }
    inni = true;
    try {
      strimill(root);
      const iLagi = siur(root);
      hero(root);
      hlutahaus(root);
      merkja(iLagi !== false);
    } catch (e) {
      // Fellur hjúpurinn — upprunalegu raðirnar koma strax aftur, engin síulaus síða.
      merkja(false);
      console.warn('[394] hjúpur féll — upprunalegu raðirnar birtar aftur', e);
    }
    inni = false;
  }
  function schedule() { if (t || inni) return; t = setTimeout(() => { t = null; bygg(); }, 140); }

  function start() {
    injectCss();
    const v = document.getElementById('view-arsskodun');
    if (!v) { setTimeout(start, 1000); return; }
    schedule();
    // Aðeins breytingar sem 153 gerir telja. Breytingar innan okkar eigin hluta
    // (súlur, stika, flísar, haus) eru hunsaðar, annars elti hjúpurinn sjálfan sig.
    new MutationObserver(ms => {
      for (const m of ms) {
        const el = m.target && m.target.nodeType === 1 ? m.target : (m.target && m.target.parentElement);
        if (el && el.closest && el.closest(OKKAR)) continue;
        schedule();
        return;
      }
    }).observe(v, { childList: true, subtree: true });
    addEventListener('resize', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1200));
  else setTimeout(start, 1200);

  window.ArsVinnusvaedi = { bygg };
  console.log('[394] Ársskoðun: strimill + síustika');
})();
/* === END ÁRSSKOÐUN VINNUSVÆÐI === */
