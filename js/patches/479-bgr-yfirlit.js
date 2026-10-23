/* === BÚNAÐARGREINING SEM LÚMSKUR LJÓMI (479) ===================================
 *
 * Agnar 23.10.2026: „þegar búnaðargreining er til fyrir alla fasteignina … merkið lýsist aðeins upp … smá glow eða álíka … aðallega fyrir
 * bara mig að sjá hvað er komið" og „veistu um einhverja leið til að setja svona lúmskt þarna inn líka" (Ársskoðun · Staðirnir, TÆKI-dálkurinn).
 *
 * Eitt sameiginlegt yfirlit: `BgrYfirlit.get(fyrirtaekiId)` → { blod, slokkvibunadur, brunakerfi, ut, tillogur, raunstadir } úr v_bgr_yfirlit (aðeins
 * talningar; ein fyrirspurn, endurnýjuð á 5 mín fresti). Rekstrarfélög (175) nota gögnin inline; hér er DOM-yfirferðin fyrir Ársskoðun:
 * lítil græn „pera“ fremst við SLT-töluna þegar greiningin hefur slökkvitæki (teiknuð, tillaga eða raunstaðir) og við RS-töluna þegar hún
 * hefur brunakerfi (slökkt og dauf annars). Breytir engu öðru; engin skrif.
 * ============================================================================== */
(() => {
  if (window.BgrYfirlit) return;
  let kort = null, lofa = null, kl = 0;
  const hlada = () => {
    if (lofa && Date.now() - kl < 5 * 60 * 1000) return lofa;
    kl = Date.now();
    const sb = window.DB && DB.sb;
    if (!sb) { lofa = null; return Promise.resolve(null); }
    lofa = Promise.resolve(sb.from('v_bgr_yfirlit').select('company_id,blod,slokkvibunadur,brunakerfi,ut,tillogur,raunstadir')).then(q => {
      const m = {}; ((q && q.data) || []).forEach(r => { if (r && r.company_id != null) m[String(r.company_id)] = r; });
      kort = m; return m;
    }, () => { lofa = null; return null; });
    return lofa;
  };
  const get = id => (kort && id != null) ? (kort[String(id)] || null) : null;
  const sl = b => !!(b && (+b.slokkvibunadur > 0 || +b.tillogur > 0 || +b.raunstadir > 0));
  const br = b => !!(b && +b.brunakerfi > 0);
  const lysing = b => b ? 'Búnaðargreining til: ' + b.blod + (+b.blod === 1 ? ' blað' : ' blöð') + ', ' + b.slokkvibunadur + ' slökkvitæki/slöngur teiknuð, ' + b.tillogur + ' tillögur, ' + b.raunstadir + ' raunstaðir, ' + b.brunakerfi + ' brunakerfi, ' + b.ut + ' ÚT' : '';

  // lítil „pera“ vinstra megin við SLT- og RS-töluna: græn og lýsandi þegar greining er til, annars dauf og slökkt (Agnar 23.10.2026)
  const CSS = '' +
    '._devs>div:nth-child(1),._devs>div:nth-child(3){position:relative}' +
    '._devs>div:nth-child(1)::before,._devs>div:nth-child(3)::before{content:"";position:absolute;left:3px;top:4px;width:6px;height:6px;border-radius:50%;box-sizing:border-box;border:1px solid rgba(120,130,145,.6);opacity:.3;pointer-events:none}' +
    '._devs._bgr-sl>div:nth-child(1)::before,._devs._bgr-br>div:nth-child(3)::before{background:radial-gradient(circle at 35% 30%,#b6ffd6,#2fc973 55%,#0f7a3e);border-color:#0b5a2c;opacity:1;box-shadow:0 0 3px rgba(60,225,135,.85)}';
  const stilla = () => {
    if (document.getElementById('_bgr-479-css')) return;
    const s = document.createElement('style'); s.id = '_bgr-479-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  };

  let bid = 0;
  function merkja() {
    const rod = document.querySelectorAll('tr._ars-row[data-co-id]');
    if (!rod.length) return;
    stilla();
    if (!kort) { hlada().then(() => merkja()); return; }
    rod.forEach(tr => {
      const d = tr.querySelector('._devs'); if (!d) return;
      const b = get(tr.getAttribute('data-co-id')), a = sl(b), c = br(b);
      if (d.classList.contains('_bgr-sl') !== a) d.classList.toggle('_bgr-sl', a);
      if (d.classList.contains('_bgr-br') !== c) d.classList.toggle('_bgr-br', c);
      const ls = lysing(b), f = d.children[0], r = d.children[2];
      if (f && a && f.dataset.bgr !== ls) { f.dataset.bgr = ls; f.title = 'Slökkvitæki · ' + ls; }
      if (r && c && r.dataset.bgr !== ls) { r.dataset.bgr = ls; r.title = 'Reykskynjarar · ' + ls; }
    });
  }
  const seinka = () => { clearTimeout(bid); bid = setTimeout(merkja, 350); };

  window.BgrYfirlit = { get, ready: hlada, sl, br, lysing, merkja };
  try { new MutationObserver(seinka).observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch (_) {}
  setInterval(merkja, 4000);
})();
