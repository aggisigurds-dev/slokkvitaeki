/* === SÖLUBORÐ · MÁLMHAUSAR + FLOKKASÍA (497) — 04.11.2026 ===
 *
 * Agnar 04.11.2026, á mockupinu „Söluborð endurbætt“ (Design-striginn): „byrjum rólega, mátt bara breyta top
 * bannerunum á boxunum, gera þá svona á litinn eins og í mockuppinu, mátt setja Filterinn, taka burt beta
 * prufuútlit, bíða aðeins með að setja category línur allstaðar og passaðu að rugla ekki í útreikningahlutanum
 * í karfa“.
 *
 *   1. HAUSAR — titillínur spjaldanna Viðskiptavinur, Þjónusta, Vörur og Karfa verða málmhaus Stálspjalds
 *      (Brunastál C: grad-metal-black, 46 px, hnoð til hliðanna, ljóst mono-heiti). AÐEINS CSS — enginn hnútur er
 *      færður eða endurskrifaður, svo pos.js og pappar sem hengja hluti í hausana (443 leit, 451 Greining, 81
 *      flýtitakkar) halda sínu. Takkarnir í hausunum fá aðeins lit (málmtakki); stærðir haldast.
 *   2. FLOKKASÍA — röð af flísum (Allt · Þjónusta: Hleðsla/Yfirferð/Áfylling · Vörur: vöruflokkarnir) efst í
 *      Þjónustu-spjaldinu. Síar flísarnar sem pos.js teiknar með EINU stílblaði (felur auðkenni sem eru utan flokks),
 *      svo endurteikning pos.js heldur síunni án þess að nokkur flís sé snert. Þjónustuflokkarnir eru lesnir úr
 *      heiti (allar þjónustur heita flokkinum „Þjónusta“ í vorur.flokkur); vöruflokkarnir eru vorur.flokkur.
 *      Engir kaflar/línur í flísaveggnum (Agnar: „bíða aðeins“).
 *   3. Valið er tímabundin staða (eins og opinn flipi): lifir í breytu, núllstillist við endurhleðslu. Ekkert skrifað.
 *   4. VÖRUMYNDIR (04.11.2026, Agnar: „stækka myndasvæðið eitthvað aðeins meira og láta sumar myndirnar með allt of
 *      mikinn hvítann bakgrunn fylla betur út í … sést svo illa þarna“) — myndareitur vöruflísa 56 → 76 px hár og allt að
 *      100 px breiður (tölva; sími/app óbreytt að stærð). Hvít/gegnsæ spássía hverrar myndar er mæld á striga (myndirnar
 *      eru data:-slóðir í vorur.mynd) og skorin af með `object-view-box` — myndin sjálf og gögnin óbreytt. Mælingin
 *      geymist í minni og er sett aftur á í sama tifi þegar pos.js teiknar flísarnar upp á nýtt.
 *
 * ÓSNERT: pos.js (vörðuð leið), karfan, línurnar, #pos-totals, afslættir, ÁFRAM. Ekkert les eða skrifar gögn
 * nema POS.getState() (lestur) til að vita flokk hverrar flísar.
 */
(() => {
  'use strict';
  if (window.__salaHausar497) return;
  window.__salaHausar497 = true;

  const V = '#view-sala';
  const K = ':not(#_s497a):not(#_s497b):not(#_s497c):not(#_s497d)';
  const MOB = ['html[data-viewmode="mobile"] ', 'body.appmode '];
  const mob = sel => MOB.map(z => sel.split(',').map(x => z + x.trim()).join(',')).join(',');
  const ROW = '_s497-flokkar';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const RIVET = 'content:"";position:absolute;top:50%;width:7px;height:7px;margin-top:-3.5px;border-radius:50%;'
    + 'background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none';

  // ── 1. Hausarnir ──────────────────────────────────────────────────────────
  // Spjaldhaus = fyrsta barn spjalds sem ber .pos-sec (Viðskiptavinur, Þjónusta), .pos-sec sjálft þar sem það er
  // fyrsta barnið (Vörur), og fyrsta barn körfunnar. Fyllingin er breyta svo neikvæða spássían passi bæði tölvu
  // (16 px, pos.js) og síma/app (8 / 10 px, 338).
  const H_ROW = V + ' .pos-col-left > div > div:first-child:has(> .pos-sec)' + K;
  const H_SEC = V + ' .pos-col-left > div > .pos-sec:first-child' + K;
  const H_CART = V + ' .pos-cart > div:first-child' + K;
  const HEADS = [H_ROW, H_SEC, H_CART];
  const each = (list, suffix) => list.map(s => s + suffix).join(',');
  const TITLE = 'color:#d9dee6!important;font-family:' + MONO + '!important;font-size:12px!important;font-weight:700!important;'
    + 'letter-spacing:.2em!important;text-transform:uppercase!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important';
  const METAL_BTN = 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border:1px solid #000!important;'
    + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)!important;color:#eef1f4!important;text-shadow:none!important';
  const HEAD_BTNS = ['#pos-scan-top', '#pos-add-service', '#pos-hreyf', '#pos-drog'].map(id => V + ' ' + id + K);

  const CSS_HAUS = [
    V + ' .pos-col-left > div' + K + '{--s497-pad:16px}',
    V + ' .pos-cart' + K + '{--s497-pad:16px}',
    mob(V + ' .pos-col-left > div' + K) + '{--s497-pad:8px}',
    mob(V + ' .pos-cart' + K) + '{--s497-pad:10px}',
    HEADS.join(',') + '{position:relative!important;box-sizing:border-box!important;min-height:46px!important;'
      + 'margin:calc(-1 * var(--s497-pad,16px)) calc(-1 * var(--s497-pad,16px)) 12px!important;padding:5px 20px!important;'
      + 'align-items:center!important;background:' + METAL + '!important;border:0!important;border-bottom:1px solid #000!important;'
      + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.14)!important;border-top-left-radius:inherit!important;border-top-right-radius:inherit!important;'
      + 'color:#d9dee6!important}',
    // Sími/app: hnoðin þurfa sitt pláss (22 px), og Þjónustu-hausinn (heiti · leit · hak · Greining) brotnar í tvær
    // línur í stað þess að skríða út fyrir spjaldið.
    mob(H_ROW + ',' + H_SEC + ',' + H_CART) + '{margin-bottom:8px!important;padding:6px 22px!important}',
    mob(H_ROW) + '{flex-wrap:wrap!important;gap:6px 8px!important}',
    H_SEC + '{display:flex!important;' + TITLE + '}',
    each(HEADS, '::before') + '{' + RIVET + ';left:7px}',
    each(HEADS, '::after') + '{' + RIVET + ';right:7px}',
    // heitin
    V + ' .pos-sec' + K + '{' + TITLE + '}',
    V + ' .pos-cart > div:first-child > div:first-child > span:first-child' + K + '{' + TITLE + '}',
    // ljóst letur á málmi í Þjónustu-hausnum (hakið + teljarar 443)
    V + ' #pos-showall-wrap' + K + '{color:#d9dee6!important}',
    V + ' #pos-showall-count' + K + ',' + V + ' #_sl-tala' + K + '{color:#aeb6c4!important}',
    // takkar í hausum: málmtakki (aðeins litur — stærðir haldast)
    HEAD_BTNS.join(',') + '{' + METAL_BTN + '}',
    HEAD_BTNS.map(s => s + ':hover').join(',') + '{filter:brightness(1.2)}'
  ];

  // ── 2. Flokkasían ─────────────────────────────────────────────────────────
  const C = '#' + ROW + K;
  const CSS_SIA = [
    C + '{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 8px!important;margin:0 0 12px!important;padding:0!important}',
    C + ' .-chip{display:inline-flex!important;align-items:center!important;gap:7px!important;height:36px!important;min-height:0!important;'
      + 'padding:0 13px!important;margin:0!important;border-radius:99px!important;cursor:pointer;font:600 13px/1 ' + SANS + '!important;'
      + 'background:' + SILVER + '!important;color:#2b313c!important;border:1px solid rgba(20,24,34,.16)!important;'
      + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;white-space:nowrap!important;text-shadow:none!important;'
      + 'width:auto!important;min-width:0!important;transform:none!important}',
    C + ' .-chip:hover{filter:brightness(1.04)}',
    C + ' .-chip[aria-pressed="true"]{background:' + METAL + '!important;color:#fff!important;border-color:#0a0b0d!important;'
      + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important}',
    C + ' .-chip:focus-visible{outline:none!important;box-shadow:0 0 0 3px rgba(190,32,28,.55)!important}',
    C + ' .-n{font:500 11.5px/1 ' + MONO + '!important;color:#5b6472!important}',
    C + ' .-chip[aria-pressed="true"] .-n{color:#d9dee6!important}',
    C + ' .-chip.-tomt{opacity:.5}',
    C + ' .-hop{font:700 10.5px/1 ' + MONO + '!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#525b6b!important;margin:0 2px 0 4px!important}',
    C + ' .-skil{width:1px!important;height:22px!important;background:rgba(20,24,34,.16)!important;margin:0 2px!important}',
    // sími / app: ein lárétt skrunanleg röð (sparar hæð), sömu flísar
    mob(C) + '{flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;margin-bottom:8px!important;scrollbar-width:none}',
    mob(C + '::-webkit-scrollbar') + '{display:none}',
    mob(C + ' .-chip') + '{flex:0 0 auto!important;height:36px!important;font-size:12.5px!important}'
  ];

  // ── 4. Vörumyndir: stærri reitur (tölva) ─────────────────────────────────
  // 74 setur 56 px á `.pos-prod img`, _mIS hvítan grunn + contain. Sími/app (338/443/pos-vm) eiga sitt útlit og haldast.
  const TOLVA = 'html:not([data-viewmode="mobile"]) body:not(.appmode) ';
  const CSS_MYNDIR = [
    TOLVA + V + ' .pos-prod > img' + K + '{width:min(100px, calc(100% - 56px))!important;height:76px!important;padding:3px!important;'
      + 'box-sizing:border-box!important;object-fit:contain!important;background:#fff!important;border-radius:10px!important}'
  ];

  function css() {
    let s = document.getElementById('_s497-css');
    const txt = CSS_HAUS.concat(CSS_SIA, CSS_MYNDIR).join('\n');
    if (!s) { s = document.createElement('style'); s.id = '_s497-css'; (document.head || document.documentElement).appendChild(s); }
    if (s.textContent !== txt) s.textContent = txt;
    // Mono 700 og Plex 600 (sama hlekkur og 389 — hlaðinn einu sinni)
    if (!document.getElementById('_tbm-font') && document.head) {
      const lf = document.createElement('link');
      lf.id = '_tbm-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600;700&family=JetBrains+Mono:wght@500;700&family=Playfair+Display:wght@700;800&display=swap';
      document.head.appendChild(lf);
    }
  }
  css();   // strax — hausarnir eru í lokaútliti frá fyrsta ramma Sölu

  // ── gögn: flokkur hverrar flísar ──────────────────────────────────────────
  const norm = x => String(x == null ? '' : x).toLowerCase()
    .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '');   // CO₂ → co2, á → a
  const SVC = [
    { k: 'hledsla', nafn: 'Hleðsla', re: /hledsl/ },
    { k: 'yfirferd', nafn: 'Yfirferð', re: /yfirfer/ },
    { k: 'afylling', nafn: 'Áfylling', re: /afyll|co2\s*100\s*gr/ },
    { k: 'annad', nafn: 'Önnur', re: null }
  ];
  const svcFlokkur = nafn => { const n = norm(nafn); for (const f of SVC) if (f.re && f.re.test(n)) return f.k; return 'annad'; };
  const vFlokkur = p => (String((p && p.flokkur) || '').trim() || 'Annað');
  function gogn() {
    const st = (window.POS && POS.getState && POS.getState()) || {};
    return { svc: st.services || [], prod: st.products || [] };
  }
  const erFlis = e => !!(e && e.classList && (e.classList.contains('pos-svc') || e.classList.contains('pos-prod')));
  const flisar = id => { const g = document.getElementById(id); return g ? Array.prototype.filter.call(g.children, erFlis) : []; };

  let val = 'allt';   // 'allt' | 's:<lykill>' | 'p:<vöruflokkur>'
  let sig = '';

  function likan() {
    const { svc, prod } = gogn();
    const sMap = new Map(svc.map(s => [String(s.id), svcFlokkur(s.nafn)]));
    const pMap = new Map(prod.map(p => [String(p.id), vFlokkur(p)]));
    const hop = new Map();            // lykill → { ids:Set, syn:Set }
    const allt = { ids: new Set(), syn: new Set() };
    const telja = (k, uid, syn) => {
      if (!hop.has(k)) hop.set(k, { ids: new Set(), syn: new Set() });
      const h = hop.get(k); h.ids.add(uid); if (syn) h.syn.add(uid);
      allt.ids.add(uid); if (syn) allt.syn.add(uid);
    };
    flisar('pos-services').forEach(t => {
      const id = t.getAttribute('data-id') || '';
      telja('s:' + (sMap.get(id) || 'annad'), 's' + id, !t.hasAttribute('data-sl-falid'));
    });
    ['pos-products', 'pos-adrar-grid'].forEach(gid => flisar(gid).forEach(t => {
      const id = t.getAttribute('data-id') || '';
      if (t.classList.contains('pos-svc')) { telja('s:' + (sMap.get(id) || 'annad'), 's' + id, !t.hasAttribute('data-sl-falid')); return; }
      telja('p:' + (pMap.get(id) || 'Annað'), 'p' + id, !t.hasAttribute('data-sl-falid'));
    }));
    const sChips = SVC.filter(f => hop.has('s:' + f.k)).map(f => ({ k: 's:' + f.k, nafn: f.nafn }));
    const pChips = [...hop.keys()].filter(k => k.startsWith('p:')).sort((a, b) => a.localeCompare(b, 'is'))
      .map(k => ({ k, nafn: k.slice(2) }));
    return { hop, allt, sChips, pChips };
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chipHtml = (k, nafn) => '<button type="button" class="-chip" data-k="' + esc(k) + '" aria-pressed="false">' + esc(nafn) + '<span class="-n"></span></button>';

  function siaCss() {
    if (val === 'allt') return '';
    const { svc, prod } = gogn();
    const ids = arr => arr.map(x => '[data-id="' + String(x.id).replace(/"/g, '') + '"]').join(',');
    const fela = sel => sel + '{display:none!important}';
    if (val.startsWith('s:')) {
      const inn = svc.filter(s => 's:' + svcFlokkur(s.nafn) === val);
      const not = inn.length ? ':not(' + ids(inn) + ')' : '';
      return [
        fela(V + ' #pos-services > .pos-svc' + not + K),
        fela(V + ' .pos-col-left > div:has(> #pos-products)' + K)
      ].join('\n');
    }
    const inn = prod.filter(p => 'p:' + vFlokkur(p) === val);
    const not = inn.length ? ':not(' + ids(inn) + ')' : '';
    return [
      fela(V + ' #pos-services' + K),
      fela([V + ' #pos-products > .pos-prod' + not + K, V + ' #pos-adrar-grid > .pos-prod' + not + K,
        V + ' #pos-adrar-grid > :not(.pos-prod):not(.pos-svc)' + K, V + ' #pos-products > .pos-svc' + K].join(','))
    ].join('\n');
  }
  function skrifaSia() {
    let s = document.getElementById('_s497-sia');
    const txt = siaCss();
    if (!s) { s = document.createElement('style'); s.id = '_s497-sia'; (document.head || document.documentElement).appendChild(s); }
    if (s.textContent !== txt) s.textContent = txt;
  }

  // Uppfærir röðina á staðnum: byggir hana aðeins upp á nýtt þegar flokkasettið breytist, annars bara tölur og val.
  function uppfaera() {
    const row = document.getElementById(ROW);
    if (!row) return;
    const m = likan();
    const keys = ['allt'].concat(m.sChips.map(c => c.k), m.pChips.map(c => c.k));
    const nySig = keys.join('|');
    // Meðan leitað er (443) opnar leitin „Sjá aðrar vörur“ og fleiri flokkar birtast — röðin má ekki stækka þá og
    // ýta flísunum niður á meðan skrifað er. Settið frýs; aðeins tölurnar breytast. Tæmist leitin gildir settið aftur.
    const leitReitur = document.getElementById('_sl-leit');
    const leitar = !!(leitReitur && String(leitReitur.value || '').trim());
    if (nySig !== sig && !(leitar && sig)) {
      sig = nySig;
      row.innerHTML = chipHtml('allt', 'Allt')
        + (m.sChips.length ? '<span class="-skil" aria-hidden="true"></span><span class="-hop">Þjónusta</span>' + m.sChips.map(c => chipHtml(c.k, c.nafn)).join('') : '')
        + (m.pChips.length ? '<span class="-skil" aria-hidden="true"></span><span class="-hop">Vörur</span>' + m.pChips.map(c => chipHtml(c.k, c.nafn)).join('') : '');
    }
    if (val !== 'allt' && keys.indexOf(val) < 0) val = 'allt';   // valinn flokkur horfinn (t.d. hakið tekið af)
    row.querySelectorAll('.-chip').forEach(b => {
      const k = b.getAttribute('data-k');
      const h = k === 'allt' ? m.allt : m.hop.get(k);
      const n = h ? h.syn.size : 0;
      const nEl = b.querySelector('.-n');
      if (nEl && nEl.textContent !== String(n)) nEl.textContent = String(n);
      const pr = k === val ? 'true' : 'false';
      if (b.getAttribute('aria-pressed') !== pr) b.setAttribute('aria-pressed', pr);
      const tomt = n === 0 && k !== val;
      if (b.classList.contains('-tomt') !== tomt) b.classList.toggle('-tomt', tomt);
    });
    skrifaSia();
  }

  function festa() {
    const g = document.getElementById('pos-services');
    const card = g && g.parentElement;
    if (!card) return;
    let row = document.getElementById(ROW);
    if (row && row.parentElement === card) return;      // á sínum stað — ekkert snert
    if (!row) { row = document.createElement('div'); row.id = ROW; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Flokkar'); sig = ''; }
    card.insertBefore(row, g);
  }

  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('#' + ROW + ' .-chip');
    if (!b) return;
    const k = b.getAttribute('data-k') || 'allt';
    val = (k === val && k !== 'allt') ? 'allt' : k;      // smellur aftur á valinn flokk = Allt
    uppfaera();
  });
  // Leit (443) nær yfir ALLT: þegar byrjað er að skrifa í tóman reit fer sían á Allt.
  let leitTom = true;
  document.addEventListener('input', e => {
    if (!e.target || e.target.id !== '_sl-leit') return;
    const tom = !String(e.target.value || '').trim();
    if (leitTom && !tom && val !== 'allt') { val = 'allt'; uppfaera(); }
    leitTom = tom;
  }, true);

  // ── 4b. Vörumyndir: skera hvíta spássíu ───────────────────────────────────
  // Hver mynd er mæld einu sinni (≤160 px strigi): bakgrunnur = litur hornanna ef þau eru ljós eða gegnsæ; reiturinn
  // sem eftir stendur (+3 % loft) verður `object-view-box`. Mynd á dökkum/lituðum grunni, eða mynd sem fyllir þegar
  // út í (>85 %), er látin vera. Skrifar aðeins stíl á <img> sem pos.js teiknaði — vaktin hlustar ekki á `style`.
  const KANN_OVB = !!(window.CSS && CSS.supports && CSS.supports('object-view-box', 'inset(1% 1% 1% 1%)'));
  const KLIPPA = new Map();   // src → 'inset(…)' | '' (ekkert að skera)
  const BIDUR = new Map();    // src → [img] meðan mælt er
  function reikna(im) {
    const W = im.naturalWidth, H = im.naturalHeight;
    if (!W || !H) return '';
    const sk = Math.min(1, 160 / Math.max(W, H));
    const w = Math.max(4, Math.round(W * sk)), h = Math.max(4, Math.round(H * sk));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const horn = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].map(([a, b]) => (b * w + a) * 4);
    let r = 0, g = 0, bl = 0, n = 0, gegns = 0;
    for (const i of horn) {
      if (d[i + 3] < 24) { gegns++; continue; }
      if (d[i] + d[i + 1] + d[i + 2] < 3 * 205) return '';          // dökkt/litað horn — raunveruleg ljósmynd, látin vera
      r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++;
    }
    if (n) { r /= n; g /= n; bl /= n; } else { r = g = bl = 255; }
    const erBak = i => d[i + 3] < 24 || (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - bl)) < 42;
    const rod = new Array(h).fill(0), dalk = new Array(w).fill(0);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (!erBak((yy * w + xx) * 4)) { rod[yy]++; dalk[xx]++; }
    const lagm = Math.max(1, Math.round(Math.min(w, h) * 0.01));   // stakir JPEG-punktar teljast ekki með
    let y0 = rod.findIndex(v => v >= lagm), x0 = dalk.findIndex(v => v >= lagm);
    if (y0 < 0 || x0 < 0) return '';
    let y1 = h - 1; while (y1 > y0 && rod[y1] < lagm) y1--;
    let x1 = w - 1; while (x1 > x0 && dalk[x1] < lagm) x1--;
    const loft = Math.max(1, Math.round(Math.max(w, h) * 0.03));
    x0 = Math.max(0, x0 - loft); y0 = Math.max(0, y0 - loft);
    x1 = Math.min(w, x1 + 1 + loft); y1 = Math.min(h, y1 + 1 + loft);
    if ((x1 - x0) * (y1 - y0) > 0.85 * w * h) return '';
    const p = v => (Math.round(v * 10) / 10) + '%';
    return 'inset(' + p(y0 / h * 100) + ' ' + p((w - x1) / w * 100) + ' ' + p((h - y1) / h * 100) + ' ' + p(x0 / w * 100) + ')';
  }
  function beita(img, v) {
    img.__s497 = 1;   // afgreidd — næsta tikk sleppir henni (engin uppfletting á löngu data:-slóðinni)
    if (v && img.style.getPropertyValue('object-view-box') !== v) img.style.setProperty('object-view-box', v);
  }
  function klippaMyndir() {
    if (!KANN_OVB) return;
    document.querySelectorAll('#view-sala .pos-prod > img').forEach(img => {
      if (img.__s497) return;
      const src = img.getAttribute('src') || '';
      if (!src) return;
      if (KLIPPA.has(src)) { beita(img, KLIPPA.get(src)); return; }
      if (BIDUR.has(src)) { if (BIDUR.get(src).indexOf(img) < 0) BIDUR.get(src).push(img); return; }
      BIDUR.set(src, [img]);
      const im = new Image();
      if (!/^data:/.test(src)) im.crossOrigin = 'anonymous';
      const lok = v => { KLIPPA.set(src, v); (BIDUR.get(src) || []).forEach(i => { if (i.isConnected) beita(i, v); }); BIDUR.delete(src); };
      im.onload = () => { let v = ''; try { v = reikna(im); } catch (_) { v = ''; } lok(v); };   // ytri mynd án CORS: óbreytt
      im.onerror = () => lok('');
      im.src = src;
    });
  }

  function tikk() {
    const v = document.getElementById('view-sala');
    if (!v || !document.getElementById('pos-services')) return;
    festa();
    uppfaera();
    klippaMyndir();
  }
  function vakta() {
    const v = document.getElementById('view-sala');
    if (!v) { setTimeout(vakta, 500); return; }
    // Óinngjöfuð vakt (252): röðin kemur inn í SAMA verki og pos.js teiknar flísarnar — ekkert hopp.
    // Hún skrifar aðeins það sem breyttist (tölur, val), svo eigin skrif vekja ekki nýja vinnu.
    const MO = window.__NativeMutationObserver || window.MutationObserver;
    new MO(muts => {
      const row = document.getElementById(ROW);
      if (row && muts.every(m => row.contains(m.target))) return;   // eigin verk
      tikk();
    }).observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sl-falid'] });
    tikk();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();

  window.SalaFlokkar497 = { val: () => val, velja: k => { val = k || 'allt'; uppfaera(); } };
})();
