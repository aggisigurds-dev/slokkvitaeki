/* === SAMÞYKKJA — SÍMASÍÐA (446) — 08.10.2026 ================================
 *
 * Agnar: „gera sér öpp-page með samþykktir og reyna útfæra hana svo það sé
 * nokkuð auðvelt að vinna með það í síma — og setja hana inn í öpp Þjónustuborð“.
 *
 * Samþykkja-hamurinn í Þjónustuborði 2 (368aa) er tveggja dálka vinnusvæði með
 * öllu spjaldinu — í 375 px síma er það þrír skjáir á hvert mál. Þessi síða er
 * SAMA listinn (mál á borði þess sem er við vélina sem bíða svars, í sömu fjórum
 * hlutum og sömu röð) en eitt mál = eitt spjald í fullri breidd með fingurstórum
 * svörum: ✓ Samþykkja · ▶ Í vinnslu · ✕ Hafna · 💬 Skýring. Afgreitt mál fær „✓ Loka“.
 * Spjaldið opnast við snertingu og sýnir lýsinguna og nótuna.
 *
 * ENGIN NÝ SKRIFLEIÐ: öll svör fara um window.Samthykkja (út úr 368): svara() =
 * svaraSamthykki (ferskt lesið, skilyrt á updated_at, lesið til baka, Afturkalla),
 * loka() = done(). Listinn er S.rows úr 368 load() — sama gagnasókn. Endurteiknað
 * þegar 368 teiknar (Samthykkja._eftir).
 *
 * Síða í öppum: 261 PAGES 'samthykkja' + sett á Þjónustuborðs-appið (verkefni).
 * Slóð #samthykkja; hliðarstika fær engan hnapp (Samþykkja er hamur á borðinu á tölvu).
 * ========================================================================== */
(() => {
  if (window.__samthykkjaSimi446) return;
  window.__samthykkjaSimi446 = true;

  const VIEW_ID = 'view-samthykkja', NAV_KEY = 'samthykkja';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  const kr = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  const API = () => window.Samthykkja || null;

  const opin = new Set();          // opnuð spjöld (lifir milli teikninga — ekki í DOM)
  // 08.10.2026 (Agnar: „4 sort stillingar — allavega nýjast, mikilvægast, verðmætast og 1–2 í viðbót"): röðun innan
  // hvers hluta. „Sjálfgefið" er röð borðsins (áríðandi → upphæð → frestur → elst). Val eins vafra → localStorage.
  const ROD_LYKILL = 'samthykkja_rodun';
  const RADANIR = [
    ['sjalf', 'Sjálfgefið', 'Eins og á borðinu: áríðandi, svo upphæð, svo frestur'],
    ['nyjast', 'Nýjast', 'Nýjasta málið efst'],
    ['mikilv', 'Mikilvægast', 'Áríðandi mál efst, svo röð borðsins'],
    ['verdm', 'Verðmætast', 'Hæsta upphæð efst'],
    ['elst', 'Lengst beðið', 'Elsta málið efst — það sem hefur beðið lengst'],
    ['postur', 'Svara pósti', 'Mál úr tölvupósti sem bíða svars efst — nýjast fyrst']   // Agnar 08.10: „taka út frest og setja svara pósti“
  ];
  let rodun = 'sjalf';
  try { const v = localStorage.getItem(ROD_LYKILL); if (RADANIR.some(x => x[0] === v)) rodun = v; } catch (_) {}
  const ts = s => { const n = Date.parse(s || ''); return isFinite(n) ? n : 0; };
  function rada(listi, A) {
    if (rodun === 'sjalf') return listi;
    const idx = new Map(listi.map((r, i) => [r.id, i]));
    const d = (a, b) => idx.get(a.id) - idx.get(b.id);
    const l = listi.slice();
    if (rodun === 'nyjast') l.sort((a, b) => (ts(b.created_at) - ts(a.created_at)) || d(a, b));
    else if (rodun === 'elst') l.sort((a, b) => (ts(a.created_at) - ts(b.created_at)) || d(a, b));
    else if (rodun === 'mikilv') l.sort((a, b) => ((b.important ? 1 : 0) - (a.important ? 1 : 0)) || d(a, b));
    else if (rodun === 'verdm') l.sort((a, b) => (A.upphaed(b) - A.upphaed(a)) || d(a, b));
    else if (rodun === 'postur') { const p = r => (r.source === 'email' || /^email:/.test(String(r.channel_ref || ''))) ? 1 : 0; l.sort((a, b) => (p(b) - p(a)) || (p(a) ? ts(b.created_at) - ts(a.created_at) : 0) || d(a, b)); }
    return l;
  }
  const rodHtml = () => '<div class="sm-rod" role="tablist" aria-label="Röðun">' + RADANIR.map(x => '<button type="button" data-sm="rod" data-v="' + x[0] + '" class="' + (rodun === x[0] ? '_on' : '') + '" title="' + esc(x[2]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
  const sky = {};                  // skýringar í ritun per mál
  let _poll = 0;

  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding:0 0 110px!important;max-width:none!important}',
      V + ' .sm-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .sm-haus>div{min-width:0;flex:1 1 auto}',   // nafnarofinn klipptist af hægri brún þegar undirtextinn var langur
      V + ' .sm-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .sm-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;white-space:normal;line-height:1.4}',   // „sótt kl.“ klipptist af brún — má brotna
      V + ' .sm-haus .hver{flex:none;margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font-size:12.5px;font-weight:700;white-space:nowrap}',
      V + ' .sm-haus .uppf{flex:none;width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-size:16px;cursor:pointer}',
      V + ' .sm-rod{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 12px 2px;-webkit-overflow-scrolling:touch}',
      V + ' .sm-rod::-webkit-scrollbar{display:none}',
      V + ' .sm-rod button{flex:none;height:34px;padding:0 13px;border-radius:8px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12.5px ' + SANS + ';cursor:pointer;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .sm-rod button._on{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;border-color:#000;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}',
      V + ' .sm-teljari{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 12px 0}',
      V + ' .sm-teljari button{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border-radius:9px;border:1px solid rgba(20,24,34,.22);background:linear-gradient(180deg,#fdfdfe,#e6e9ef);color:#1f2530;font:600 12px ' + SANS + ';text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .sm-teljari button b{font-family:' + DISP + ';font-size:22px;line-height:1;min-width:28px;text-align:center}',
      V + ' .sm-teljari button small{display:block;font:500 10.5px ' + MONO + ';color:#5b6577!important;letter-spacing:.03em;margin-top:2px}',
      V + ' .sm-teljari button._claude{grid-column:1 / -1;background:linear-gradient(180deg,#1f6b3c 0%,#145229 100%);color:#fff;border-color:#0b3519;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}',
      V + ' .sm-teljari button._claude small{color:#bfe3c9!important}',
      V + ' .sm-teljari button._gull b{color:#8a6218}',
      V + ' .sm-hluti{scroll-margin-top:72px;display:flex;align-items:center;gap:8px;margin:14px 12px 6px;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.14em;color:#525b6b;text-transform:uppercase}',
      V + ' .sm-hluti b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 6px;border-radius:5px;background:#1f2530;color:#fff;font-size:11px;letter-spacing:0}',
      V + ' .sm-hluti._gull b{background:#c99a3a;color:#1c1608}',
      V + ' .sm-hluti._ok b{background:#16783f}',
      V + ' .sm-mal{margin:0 12px 8px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.14);box-shadow:0 1px 2px rgba(0,0,0,.06);overflow:hidden}',
      V + ' .sm-mal._buid{border-color:#9bd7b2}',
      V + ' .sm-mal._svarad{opacity:.72}',
      V + ' .sm-top{display:block;width:100%;text-align:left;padding:12px 14px 10px;border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      V + ' .sm-kr{display:inline-block;font-family:' + MONO + ';font-size:12px;font-weight:700;color:#8a5a0c;background:#fff8e8;border:1px solid #e4cf9a;border-radius:5px;padding:2px 7px;margin-bottom:6px}',
      V + ' .sm-tt{font-weight:700;font-size:15px;line-height:1.3;color:#11141c}',
      V + ' .sm-sonn{display:block;margin-top:6px;font-size:12.5px;color:#525b6b}',
      V + ' .sm-sonn._ok{color:#0f5c33;font-weight:600}',
      V + ' .sm-ef{display:block;margin-top:6px;font-size:12.5px;line-height:1.4;color:#3a4250;white-space:pre-line}',
      V + ' .sm-mal:not(._opid) .sm-ef{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      V + ' .sm-undir{display:flex;align-items:center;gap:8px;margin-top:8px;font-family:' + MONO + ';font-size:11px;color:#6b7483}',
      V + ' .sm-undir .merki{color:#0f5c33;font-weight:700}',
      V + ' .sm-undir .orv{margin-left:auto;color:#9aa1ab}',
      // Sönnunarmyndir (08.10.2026): lárétt ræma af skjáskotum/myndum undir efsta hluta spjaldsins, sýnileg líka samanbrotin.
      V + ' .sm-myndir-k{font-family:' + MONO + ';font-size:10px;letter-spacing:.14em;color:#6b7483;text-transform:uppercase;padding:0 14px 6px}',
      V + ' .sm-myndir{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 14px 12px;-webkit-overflow-scrolling:touch}',
      V + ' .sm-myndir::-webkit-scrollbar{display:none}',
      V + ' .sm-myndir>a{flex:none;width:168px;height:104px;border-radius:9px;overflow:hidden;border:1px solid rgba(20,24,34,.22);background:#eef1f5;box-shadow:0 1px 2px rgba(0,0,0,.1),inset 0 0 0 1px rgba(255,255,255,.6);-webkit-tap-highlight-color:transparent}',
      V + ' .sm-myndir>a img{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}',
      V + ' .sm-myndir>a.fil{width:auto;height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:8px;background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12.5px ' + SANS + ';text-decoration:none;white-space:nowrap}',
      V + ' .sm-lysing{display:none;padding:0 14px 12px;border-top:1px dashed rgba(20,24,34,.16)}',
      V + ' .sm-mal._opid .sm-lysing{display:block}',
      V + ' .sm-lysing .k{font-family:' + MONO + ';font-size:10px;letter-spacing:.14em;color:#6b7483;margin:10px 0 4px}',
      V + ' .sm-lysing .t{font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#1f2530;max-height:260px;overflow:auto}',
      V + ' .sm-lysing .opna{display:inline-flex;align-items:center;height:36px;padding:0 12px;margin-top:10px;border-radius:8px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12.5px ' + SANS + ';text-decoration:none;cursor:pointer}',
      V + ' .sm-svor{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 10px 10px}',
      V + ' .sm-svor._eitt{grid-template-columns:1fr}',
      V + ' .sm-svor button{height:48px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .sm-svor button._gull{background:linear-gradient(180deg,#e9c76a,#b8912f 55%,#8a6a1e);border-color:#6e5316;color:#1c1608;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}',
      V + ' .sm-svor button._graen{background:linear-gradient(180deg,#1f9d5a,#0f6e3a);border-color:#0c5e30;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
      V + ' .sm-svor button._raud{color:#b42318}',
      V + ' .sm-svor button:disabled{opacity:.5;cursor:default}',
      V + ' .sm-sky{display:none;padding:0 10px 10px}',
      V + ' .sm-mal._sky .sm-sky{display:block}',
      V + ' .sm-sky textarea{display:block;width:100%;box-sizing:border-box;min-height:84px;padding:10px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:#fff;font:14px/1.45 ' + SANS + ';color:#1f2530;resize:vertical}',
      V + ' .sm-sky .r{display:flex;gap:6px;margin-top:6px}',
      V + ' .sm-sky .r button{flex:1;height:44px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font:700 13.5px ' + SANS + ';color:#1f2530;cursor:pointer}',
      V + ' .sm-sky .r button._gull{background:linear-gradient(180deg,#e9c76a,#b8912f 55%,#8a6a1e);border-color:#6e5316;color:#1c1608}',
      V + ' .sm-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.5}',
      V + ' .sm-villa{margin:12px;padding:10px 12px;border-radius:9px;background:#fff1f1;border:1px solid #e4b3b3;color:#8f1d13;font-size:13px}',
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById('_sm446-css')) return;
    const st = document.createElement('style'); st.id = '_sm446-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    v.innerHTML = '<div id="_sm446-root"></div>';
    v.addEventListener('click', smellur);
    v.addEventListener('input', e => { const ta = e.target.closest('textarea[data-sm-sky]'); if (ta) sky[ta.dataset.smSky] = ta.value; });
    document.body.appendChild(v);
    return v;
  }

  // 08.10.2026 — sönnunarmyndir (fylgiskjöl málsins) beint á spjaldið, líka samanbrotið: Agnar sá málin um
  // Ajour/Landsbankann/aggi@ með skjáskotum sem sáust aðeins bak við „Opna á Þjónustuborði". Myndir í láréttri
  // ræmu (snerting opnar í fullri stærð), önnur skjöl sem flögur. Gögnin koma úr A.skjolMap (ein fyrirspurn fyrir listann).
  function myndirHtml(r, skjol) {
    const l = (skjol && skjol.data && skjol.data[r.id]) || [];
    if (!l.length) return '';
    const myndir = l.filter(f => A_erMynd(f)), onnur = l.filter(f => !A_erMynd(f));
    return '<div class="sm-myndir-k">📎 Sönnun · ' + (myndir.length ? myndir.length + (myndir.length === 1 ? ' mynd' : ' myndir') : '') + (myndir.length && onnur.length ? ' · ' : '') + (onnur.length ? onnur.length + (onnur.length === 1 ? ' skjal' : ' skjöl') : '') + '</div>' +
      '<div class="sm-myndir">' +
        myndir.map(f => '<a href="' + esc(f.url) + '" target="_blank" rel="noopener" title="' + esc(f.name || 'Opna mynd') + '"><img src="' + esc(f.url) + '" alt="' + esc(f.name || 'Sönnunarmynd') + '" loading="lazy"></a>').join('') +
        onnur.map(f => '<a class="fil" href="' + esc(f.url || '#') + '" target="_blank" rel="noopener">📄 ' + esc(f.name || 'skjal') + '</a>').join('') +
      '</div>';
  }
  let A_erMynd = f => !!(f && f.url) && (/^image\//.test(String(f.mime_type || '')) || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(String(f.name || f.url || '')));
  function malHtml(r, A, skjol) {
    const u = A.upphaed(r), s = A.sonn(r), buid = A.erBuid(r), samt = A.erSamthykki(r);
    const svar = A.svarMals(r), bid = A.busy(r.id);
    const ef = A.aiLine(r);
    const undir = [A.whereOf(r), A.ageDays(r) + ' d.'].filter(Boolean).join(' · ');
    const op = opin.has(r.id);
    const k = (v, cls, texti) => '<button type="button" data-sm="svar" data-v="' + v + '" data-id="' + r.id + '" class="' + cls + '"' + (bid ? ' disabled' : '') + '>' + texti + '</button>';
    let svor = '';
    if (samt && buid) svor = '<div class="sm-svor _eitt">' + '<button type="button" data-sm="loka" data-id="' + r.id + '" class="_graen"' + (bid ? ' disabled' : '') + '>' + (bid ? 'Augnablik…' : '✓ Loka — afgreitt') + '</button></div>';
    else if (samt) svor = '<div class="sm-svor">' + k('samthykkt', '_gull', bid ? 'Augnablik…' : '✓ Samþykkja') + k('vinnsla', '', '▶ Í vinnslu') + k('hafnad', '_raud', '✕ Hafna') +
      '<button type="button" data-sm="sky" data-id="' + r.id + '"' + (bid ? ' disabled' : '') + '>💬 Skýring</button></div>' +
      '<div class="sm-sky"><textarea data-sm-sky="' + r.id + '" placeholder="Skýring til Claude — hann fer aftur yfir málið og endurmetur tillöguna">' + esc(sky[r.id] || '') + '</textarea>' +
      '<div class="r"><button type="button" data-sm="sky-x" data-id="' + r.id + '">Hætta við</button><button type="button" class="_gull" data-sm="sky-senda" data-id="' + r.id + '"' + (bid ? ' disabled' : '') + '>Senda til Claude</button></div></div>';
    return '<article class="sm-mal' + (buid ? ' _buid' : '') + (!samt ? ' _svarad' : '') + (op ? ' _opid' : '') + '" data-sm-mal="' + r.id + '">' +
      '<button type="button" class="sm-top" data-sm="opna" data-id="' + r.id + '" aria-expanded="' + op + '">' +
        (u ? '<span class="sm-kr" title="Upphæð lesin úr texta málsins — vísbending, ekki bókhald">≈ ' + esc(kr(u)) + '</span>' : '') +
        '<div class="sm-tt">' + esc(r.title || '(ónefnt mál)') + '</div>' +
        (s && s.texti ? '<span class="sm-sonn' + (buid ? ' _ok' : '') + '">' + (buid ? '✓ ' : '') + esc(s.texti) + '</span>' : '') +
        (ef ? '<span class="sm-ef">' + esc(ef) + '</span>' : '') +
        '<div class="sm-undir"><span>' + esc(undir) + '</span>' + (svar && A.SVOR[svar] ? '<span class="merki">' + esc(A.SVOR[svar].merki) + '</span>' : '') + '<span class="orv">' + (op ? '▴' : '▾') + '</span></div>' +
      '</button>' +
      myndirHtml(r, skjol) +
      '<div class="sm-lysing">' +
        (r.notes ? '<div class="k">LÝSING OG ATHUGASEMDIR</div><div class="t">' + esc(r.notes) + '</div>' : '<div class="k">ENGIN LÝSING</div>') +
        '<a class="opna" href="#bord" data-sm="bord" data-id="' + r.id + '">Opna á Þjónustuborði ›</a>' +
      '</div>' + svor + '</article>';
  }

  // 08.10.2026 (Agnar: „counter af hvað ég er búinn að svara mörgum sem Claude á síðan eftir að vinna úr“): teljarar undir
  // röðuninni. Græni teljarinn = mál sem hann hefur svarað (samþykkt / í vinnslu / endurmeta) og Claude á eftir að vinna úr
  // — sömu mál og hlutinn „Svarað · bíður Claude“ (hluti 2 í 368). Smellur skrunar að hlutanum. Hafnað fer af borðinu og telst ekki.
  function teljariHtml(listi, A) {
    const n = h => listi.filter(r => A.hluti(r) === h).length;
    const sv = {}; listi.filter(r => A.hluti(r) === 2).forEach(r => { const s = A.svarMals ? A.svarMals(r) : null; sv[s] = (sv[s] || 0) + 1; });
    const sund = [['samthykkt', 'samþykkt'], ['vinnsla', 'í vinnslu'], ['endurmeta', 'skýring']].filter(x => sv[x[0]]).map(x => sv[x[0]] + ' ' + x[1]).join(' · ');
    const b = (h, cls, texti, undir) => '<button type="button" data-sm="hoppa" data-v="' + h + '" class="' + cls + '"><b>' + n(h) + '</b><span>' + texti + (undir ? '<small>' + esc(undir) + '</small>' : '') + '</span></button>';
    return '<div class="sm-teljari">' +
      b(2, '_claude', 'Svarað — Claude á eftir að vinna úr', sund || 'ekkert bíður') +
      b(0, '_gull', 'Tilbúið', 'bara samþykkja') + b(1, '', 'Spurningar', 'þarf svar frá þér') + '</div>';
  }

  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById('_sm446-root');
    const A = API();
    const n = A ? A.nu() : '';
    let body = '';
    if (!A) body = '<div class="sm-villa">Þjónustuborðið (368) er ekki hlaðið — Samþykkja byggir á því.</div>';
    else if (!A.loaded()) body = '<div class="sm-tomt">Sæki mál…</div>';
    else {
      const listi = A.listi();
      const HL = [['Þegar afgreitt samkvæmt gögnum — bara loka', -1, '_ok'], ['Tilbúið — bara samþykkja', 0, '_gull'], ['Þarf svar frá þér', 1, ''], ['Svarað · bíður Claude', 2, '']];
      if (!listi.length) body = '<div class="sm-tomt">Ekkert bíður svars hjá ' + esc(n) + '.<br>Nýjar tillögur birtast hér um leið og þær eru tilbúnar.</div>';
      else {
        const skjol = A.skjolMap ? A.skjolMap(listi.map(r => r.id)) : null;   // ein fyrirspurn, skyndiminni í 368
        if (A.erMynd) A_erMynd = A.erMynd;
        body = HL.map(h => { const m = rada(listi.filter(r => A.hluti(r) === h[1]), A); return m.length ? '<div class="sm-hluti ' + h[2] + '" id="_sm-h' + h[1] + '"><b>' + m.length + '</b>' + h[0] + '</div>' + m.map(r => malHtml(r, A, skjol)).join('') : ''; }).join('');
      }
    }
    const listi = A && A.loaded() ? A.listi() : [];
    const t = A ? [listi.filter(r => A.hluti(r) === 0).length + ' tilbúin', listi.filter(r => A.hluti(r) === 1).length + ' spurningar', listi.filter(r => A.hluti(r) === 2).length + ' hjá Claude'].join(' · ') : '';
    const sott = (A && A.loadedAt && A.loadedAt()) ? ' · sótt kl. ' + String(A.loadedAt().getHours()).padStart(2, '0') + ':' + String(A.loadedAt().getMinutes()).padStart(2, '0') : '';
    const html = '<div class="sm-haus"><div><div class="tt">Samþykkja</div><div class="st">' + esc(t + (A && A.loading && A.loading() ? ' · sæki…' : sott)) + '</div></div>' +
      '<span class="hver">' + esc(n || '—') + '</span><button type="button" class="uppf" data-sm="uppf" title="Sækja aftur">↻</button></div>' + (A && A.loaded() && listi.length ? rodHtml() + teljariHtml(listi, A) : '') + body;
    // Skrunstaða og fókus (textarea í ritun) lifa teikninguna — 388 Stodugt.vernda ef hann er til.
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    if (root._h !== html) { root.innerHTML = html; root._h = html; }
    if (aftur) aftur();
  }

  function smellur(e) {
    const b = e.target.closest('[data-sm]'); if (!b) return;
    const A = API(); if (!A) return;
    const a = b.dataset.sm, id = +b.dataset.id;
    if (a === 'uppf') { saekja(A, true); return; }
    if (a === 'hoppa') { const h = document.getElementById('_sm-h' + b.dataset.v); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'rod') { rodun = b.dataset.v; try { localStorage.setItem(ROD_LYKILL, rodun); } catch (_) {} render(); return; }
    if (a === 'bord') { e.preventDefault(); try { A.velja(id); } catch (_) {} if (window.App && App.switchView) App.switchView('bord'); else location.hash = '#bord'; return; }
    e.preventDefault();
    const mal = b.closest('[data-sm-mal]');
    if (a === 'opna') { if (opin.has(id)) opin.delete(id); else opin.add(id); render(); return; }
    if (a === 'sky') { if (mal) mal.classList.add('_sky'); const ta = mal && mal.querySelector('textarea'); if (ta) ta.focus(); return; }
    if (a === 'sky-x') { if (mal) mal.classList.remove('_sky'); return; }
    if (a === 'sky-senda') { const txt = String(sky[id] || '').trim(); if (!txt) { alert('Skrifaðu skýringuna fyrst — svo fer málið til Claude.'); return; } Promise.resolve(A.svara(id, 'endurmeta', txt)).then(() => { delete sky[id]; render(); }); return; }
    if (a === 'loka') { A.loka(id); return; }
    if (a === 'svar') { A.svara(id, b.dataset.v); return; }
  }

  // Sókn um 368: endurhlada() losar S.loading sem situr fast; teiknum sjálf þegar svarið kemur, því load(true) teiknar
  // aðeins ef eitthvað breyttist í undirskrift borðsins (og þá aðeins borðið sjálft).
  function saekja(A, thvinga) {
    try { const p = thvinga && A.endurhlada ? A.endurhlada() : A.load(); render(); Promise.resolve(p).then(() => render(), () => render()); } catch (_) { render(); }
  }

  function open() {
    injectCss();
    ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    const A = API();
    if (A) saekja(A, false);
    clearInterval(_poll);
    _poll = setInterval(() => { const vv = document.getElementById(VIEW_ID); if (!vv || !vv.classList.contains('active') || document.hidden) return; const B = API(); if (B) saekja(B, false); }, 60000);
    // Síminn vaknar / flipinn kemur fram: sækja strax (gögnin á borðinu geta verið frá því áður en hann sofnaði).
    if (!window.__sm446Vakt) { window.__sm446Vakt = true; document.addEventListener('visibilitychange', () => { if (document.hidden) return; const vv = document.getElementById(VIEW_ID); if (vv && vv.classList.contains('active')) { const B = API(); if (B) saekja(B, true); } }); }
  }
  function hide() {
    try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {}
    clearInterval(_poll); _poll = 0;
  }

  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._samthykkjaPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._samthykkjaPatched = true;
  }
  function tengja() {
    const A = API();
    if (!A) { setTimeout(tengja, 500); return; }
    if (A._eftir.indexOf(render) < 0) A._eftir.push(render);
  }
  function boot() {
    patchSwitchView();
    tengja();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.SamthykkjaSimi = { open, render, version: '446' };
  console.log('[446] Samþykkja — símasíða');
})();
