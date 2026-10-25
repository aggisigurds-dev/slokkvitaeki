/* === BÚNAÐARGREINING — myndir hæðanna á fyrirtækjaprófílnum (477) — 22.10.2026 ====================================
 *
 * Agnar 22.10.2026 (skjáskot af prófíl Klappar í Brunakerfi-appinu með hring um bilið milli Samskipta og „Kerfi og þjónusta"):
 * „geturðu síðan sett teikningarnar þarna". Teikningarnar = fastar myndir hverrar hæðar með búnaðargreiningunni teiknaðri ofan á
 * (bunadargreining.yfirlag → turbopaint/bgr-yfirlag, sömu myndir og Þjónustugáttin sýnir). Áður sátu þær neðst í Teikningu-hlutanum (474).
 *
 * Stálspjald (442 .ssp) beint á eftir Samskiptum (eða borðanum) og á undan „Kerfi og þjónusta" (450):
 *   haus      BÚNAÐARGREINING · „6 hæðir · 2 SL + 33 tillaga · 69 ÚT" · Sjá fleiri hæðir (n)
 *   búkur     ein röð af myndum (4 á breiðu spjaldi, 3, 2 á síma) á burstaðri stálplötu; smellur opnar myndina í fullri stærð
 *             undir hverri: hæðarheiti + fjöldi (SL · BS · ÚT · R); tillögur Arnolds merktar sér (hvítur hringur á myndinni)
 * Spjaldið er aðeins til þegar félagið á greiningu með myndum — aldrei tóm plata. Hvaða félög eiga myndir er sótt einu sinni (ein
 * lítil fyrirspurn), svo plássið er tekið frá í SAMA tifi og prófíllinn teiknast og ekkert hoppar þegar myndirnar koma (Brunastál C
 * „Stöðugt viðmót" 2 og 4).
 *
 * Staðsetning: 450 festir sig á eftir mér þegar ég er til (hann les mig sem akkeri), ég á eftir Samskiptum/borðanum — enginn togast
 * á um hnútinn (regla 5). Aðeins útlit; engin skrif, ekkert í localStorage (opið/lokað er tímabundin staða í breytu).
 * ========================================================================================================== */
(() => {
  if (window.__bgrMyndir477) return;
  window.__bgrMyndir477 = true;

  const ID = '_bgm477';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const FERSKT_MS = 60000;
  const SLOD = /^https:\/\/osfdzskyvisifcwyjkuk\.supabase\.co\/storage\/v1\/object\/public\/turbopaint\/bgr-yfirlag\//;
  const LITIR = { sl: '#d4412b', bs: '#1f5fbf', ut: '#2e7d32', r: '#8e24aa' };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SB = () => window.DB && DB.sb;

  /* ── ÁSTAND ─────────────────────────────────────────────────────────────────────────────────────────── */
  const _minni = new Map();      // cid → { rod: [yfirlag…], till: 'YYYY-MM-DD'|null, t }
  const _saekir = new Map();     // cid → promise
  const _allar = new Map();      // cid → true: allar hæðir sýndar (lifir endurteikningu prófílsins, ekki milli lota)
  let _hefurMyndir = null;       // Set af cid sem eiga myndir (null = ekki sótt enn)
  let _hefurP = null;

  function saekjaMengi() {
    if (_hefurMyndir) return Promise.resolve(_hefurMyndir);
    if (_hefurP) return _hefurP;
    if (!SB()) return Promise.resolve(null);
    _hefurP = Promise.resolve(SB().from('bunadargreining').select('company_id,yfirlag').is('fjarlaegt_at', null).not('yfirlag', 'is', null).limit(1000))
      .then((r) => {
        if (r.error) throw r.error;
        const s = new Set();
        (r.data || []).forEach((x) => { if (Array.isArray(x.yfirlag) && x.yfirlag.length) s.add(String(x.company_id)); });
        _hefurMyndir = s; return s;
      }, () => null)
      .then((s) => { _hefurP = null; return s; });
    return _hefurP;
  }
  function saekja(cid) {
    if (_saekir.has(cid)) return _saekir.get(cid);
    if (!SB()) return Promise.resolve(null);
    const p = Promise.resolve(SB().from('bunadargreining').select('yfirlag,tillogur').eq('company_id', cid).is('fjarlaegt_at', null).order('id', { ascending: false }).limit(1))
      .then((r) => {
        if (r.error) throw r.error;
        const row = (r.data && r.data[0]) || null;
        const L = row && Array.isArray(row.yfirlag) ? row.yfirlag.filter((x) => x && typeof x.url === 'string' && SLOD.test(x.url)) : [];
        const m = { rod: L, till: row && row.tillogur && row.tillogur.at ? String(row.tillogur.at).slice(0, 10) : null, t: Date.now() };
        _minni.set(cid, m); return m;
      })
      .then((v) => { _saekir.delete(cid); return v; }, (e) => { _saekir.delete(cid); throw e; });
    _saekir.set(cid, p);
    return p;
  }

  /* ── TEXTI ──────────────────────────────────────────────────────────────────────────────────────────── */
  const sum = (L, k) => L.reduce((n, x) => n + (+x[k] || 0), 0);
  function dagsBirt(d) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  // „2 SL + 33 tillaga" · „33 SL tillaga" · „2 SL" — tillögur aldrei blandaðar við það sem hönnuður teiknaði
  function flokkTexti(teiknad, till, skst) {
    if (teiknad && till) return teiknad + ' ' + skst + ' + ' + till + ' tillaga';
    if (till) return till + ' ' + skst + ' tillaga';
    if (teiknad) return teiknad + ' ' + skst;
    return '';
  }
  function haus(L) {
    const o = [L.length + (L.length === 1 ? ' hæð' : ' hæðir')];
    [['sl', 'till_sl', 'SL'], ['bs', 'till_bs', 'BS']].forEach((k) => { const t = flokkTexti(sum(L, k[0]), sum(L, k[1]), k[2]); if (t) o.push(t); });
    const ut = sum(L, 'ut'); if (ut) o.push(ut + ' ÚT');
    return o.join(' · ');
  }
  function punktur(lit, hol) {
    return '<i class="bgm-p' + (hol ? ' hol' : '') + '" style="' + (hol ? 'border-color:' + lit : 'background:' + lit) + '"></i>';
  }
  function tala(x) {
    const hlutar = [];
    [['sl', 'SL'], ['bs', 'BS'], ['ut', 'ÚT'], ['r', 'R']].forEach((k) => { const n = +x[k[0]] || 0; if (n) hlutar.push('<span>' + punktur(LITIR[k[0]]) + n + ' ' + k[1] + '</span>'); });
    [['till_sl', 'sl', 'SL'], ['till_bs', 'bs', 'BS']].forEach((k) => { const n = +x[k[0]] || 0; if (n) hlutar.push('<span class="bgm-till">' + punktur(LITIR[k[1]], true) + n + ' ' + k[2] + ' tillaga</span>'); });
    if (+x.skrad > 0) hlutar.push('<span><i class="bgm-p" style="background:#1c1e23"></i>' + x.skrad + ' skráð á stað</span>');
    return hlutar.join('') || '<span class="bgm-daufur">engin merki</span>';
  }

  /* ── CSS (eigið gildissvið #_bgm477 ofan á .ssp úr 442) ─────────────────────────────────────────────── */
  function css() {
    const R = '#' + ID + ':not(#_g477a):not(#_g477b):not(#_g477c):not(#_g477d)';
    return [
      R + '{margin:12px 0!important;font-family:' + SANS + '}',
      R + ' *{box-sizing:border-box}',
      R + ' .bgm-haus{flex-wrap:nowrap!important;height:46px;overflow:hidden}',
      R + ' .bgm-haus .ssp-titill{flex:none}',
      R + ' .bgm-haus .ssp-undir{flex:1 1 auto}',
      R + ' .bgm-haus .ssp-hlid{flex:none}',
      R + ' .bgm-buk{min-height:96px}',
      R + ' .bgm-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}',
      R + ':not(.alt) .bgm-t:nth-child(n+5){display:none}',
      '@container (max-width:900px){' + R + ' .bgm-g{grid-template-columns:repeat(3,minmax(0,1fr))}' + R + ':not(.alt) .bgm-t:nth-child(n+4){display:none}}',
      '@container (max-width:560px){' + R + ' .bgm-g{grid-template-columns:repeat(2,minmax(0,1fr))}' + R + ':not(.alt) .bgm-t:nth-child(n+3){display:none}}',
      R + ' .bgm-t{display:flex;flex-direction:column;min-width:0;background:#fff;border-radius:8px;overflow:hidden;text-decoration:none!important;color:#141822!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}',
      R + ' .bgm-t:hover{box-shadow:inset 0 0 0 1px rgba(20,24,34,.34),0 3px 8px rgba(10,14,22,.2)}',
      R + ' .bgm-t:focus-visible{outline:2px solid #1f5fbf;outline-offset:2px}',
      R + ' .bgm-m{display:block;position:relative;aspect-ratio:4/3;background:#fff;border-bottom:1px solid rgba(20,24,34,.1)}',
      R + ' .bgm-m img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;max-width:none!important}',
      R + ' .bgm-f{display:flex;flex-direction:column;gap:5px;padding:8px 10px 9px;min-width:0}',
      R + ' .bgm-f b{font:600 13px/1.25 ' + SANS + '!important;color:#141822!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      R + ' .bgm-n{display:flex;flex-wrap:wrap;gap:2px 10px;font:500 11px/1.35 ' + MONO + '!important;color:#3a4250!important}',
      R + ' .bgm-n span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      R + ' .bgm-p{display:inline-block;width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      R + ' .bgm-p.hol{background:#fff;border:2px solid;box-shadow:none}',
      R + ' .bgm-daufur{color:#6b7483}',
      R + ' .bgm-nota{margin:10px 2px 0;font:500 11.5px/1.45 ' + SANS + '!important;color:#3a4250!important}',
      R + ' .bgm-bid{display:flex;align-items:center;height:72px;padding:0 4px;font:500 11.5px ' + MONO + '!important;color:#6b7483!important}',
      R + ' [hidden]{display:none!important}'
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById(ID + '-css')) return;
    const s = document.createElement('style'); s.id = ID + '-css'; s.textContent = css();
    document.head.appendChild(s);
  }

  /* ── SPJALDIР ─────────────────────────────────────────────────────────────────────────────────────── */
  function smida(cid) {
    const kort = document.createElement('section');
    kort.id = ID; kort.className = 'ssp bgm477'; kort.dataset.cid = String(cid);
    kort.setAttribute('aria-labelledby', ID + '-t');
    kort.innerHTML =
      '<header class="ssp-haus bgm-haus"><span class="ssp-titill" id="' + ID + '-t">Búnaðargreining</span><span class="ssp-undir" data-bgm="undir"></span>' +
        '<span class="ssp-hlid"><button type="button" class="ssp-btn" data-bgm="fleiri" hidden></button></span></header>' +
      '<div class="ssp-buk bgm-buk" data-bgm="buk"><div class="bgm-bid">Sæki hæðir…</div></div>';
    kort.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-bgm="fleiri"]'); if (!b) return;
      const c = kort.dataset.cid;
      if (_allar.get(c)) _allar.delete(c); else _allar.set(c, true);
      uppfaeraTakka(kort);
    });
    return kort;
  }
  function perRod(kort) { const w = kort.clientWidth; return w > 900 ? 4 : w > 560 ? 3 : 2; }
  function uppfaeraTakka(kort) {
    const cid = kort.dataset.cid, m = _minni.get(cid);
    const b = kort.querySelector('[data-bgm="fleiri"]'); if (!b || !m) return;
    const alls = _allar.get(cid) === true, n = m.rod.length, p = perRod(kort);
    kort.classList.toggle('alt', alls);
    if (n <= 2) { b.hidden = true; return; }
    b.hidden = false;
    b.textContent = alls ? 'Sýna færri' : 'Sjá fleiri hæðir (' + Math.max(0, n - p) + ')';
    b.setAttribute('aria-expanded', alls ? 'true' : 'false');
    if (!alls && n <= p) b.hidden = true;
  }
  function fylla(kort, cid) {
    const m = _minni.get(cid); if (!m) return;
    const undir = kort.querySelector('[data-bgm="undir"]'), buk = kort.querySelector('[data-bgm="buk"]');
    const t = haus(m.rod);
    if (undir.textContent !== t) undir.textContent = t;
    const til = m.rod.some((x) => (+x.till_sl || 0) + (+x.till_bs || 0) > 0);
    const html = '<div class="bgm-g">' + m.rod.map((x) =>
      '<a class="bgm-t" href="' + esc(x.url) + '" target="_blank" rel="noopener" title="Opna í fullri stærð — ' + esc(x.haed || '') + '">' +
        '<span class="bgm-m"><img loading="lazy" decoding="async" alt="' + esc(x.haed || '') + '" src="' + esc(x.url) + '"></span>' +
        '<span class="bgm-f"><b>' + esc(x.haed || '') + '</b><span class="bgm-n">' + tala(x) + '</span></span></a>').join('') + '</div>' +
      (til ? '<p class="bgm-nota">Tillögur Arnolds' + (m.till ? ' (' + dagsBirt(m.till) + ')' : '') + ' eru áætlun út frá reglum um slökkvibúnað (gr. 9.4.4–9.4.5, 165.BR1) þar sem teikningin sýnir engin slökkvitæki eða slöngukefli — ekki hönnun. Staðfest á staðnum við næstu skoðun.</p>' : '');
    if (kort._html !== html) { kort._html = html; buk.innerHTML = html; }
    uppfaeraTakka(kort);
  }

  /* ── FESTING Á PRÓFÍLNUM ─────────────────────────────────────────────────────────────────────────── */
  const opidCid = () => {
    const n = parseInt(window._currentCompanyId != null ? window._currentCompanyId : (window.Companies && Companies.currentId), 10);
    return isFinite(n) && n > 0 ? String(n) : null;
  };
  function festa() {
    const main = document.getElementById('companies-main'); if (!main) return;
    const banner = main.querySelector(':scope > .co-banner');
    let kort = document.getElementById(ID);
    if (!banner) return;                       // ekki prófíll (listinn eða annað)
    const cid = opidCid(); if (!cid) return;
    const m = _minni.get(cid);
    if (_hefurMyndir === null) {
      saekjaMengi().then(() => { try { festa(); } catch (e) { console.warn('[477]', e); } });
      return;                                  // veit ekki enn hvort félagið á myndir — ekkert sett inn (engin tóm plata)
    }
    const a = _hefurMyndir.has(cid) && !(m && !m.rod.length);
    if (!a) { if (kort) kort.remove(); return; }
    injectCss();
    if (kort && kort.dataset.cid !== cid) { kort.remove(); kort = null; }
    if (!kort) kort = smida(cid);
    const sam = main.querySelector(':scope > ._samskipti-host');
    const teikn = main.querySelector(':scope > #co-fp-section.t485');   // 485: Teikning + Búnaðargreining í einum glugga rétt undir Samskiptum — akkeri keðjunnar (annars togast þau á um sama stað)
    const akkeri = teikn || sam || banner;
    if (kort.previousElementSibling !== akkeri || kort.parentNode !== main) akkeri.after(kort);
    if (m) fylla(kort, cid);
    if (!m || Date.now() - m.t > FERSKT_MS) {
      saekja(cid).then((r) => {
        const k = document.getElementById(ID);
        if (!k || k.dataset.cid !== cid) return;
        if (!r || !r.rod.length) { k.remove(); return; }
        fylla(k, cid);
      }, () => {
        const k = document.getElementById(ID);
        if (k && k.dataset.cid === cid && !_minni.get(cid)) k.querySelector('.bgm-bid').textContent = 'Náðist ekki að sækja hæðirnar';
      });
    }
  }

  let _tilraunir = 0;
  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) { if (++_tilraunir < 60) setTimeout(vakta, 500); return; }
    const MO = window.__NativeMutationObserver || MutationObserver;
    // Aðeins bein börn #companies-main, óinngjöfuð — spjaldið er komið fyrir málun (sama aðferð og 450).
    new MO((ms) => {
      for (const x of ms) {
        const breytt = [...x.addedNodes, ...x.removedNodes].some((n) => n.nodeType === 1 && n.id !== ID);
        if (breytt) { try { festa(); } catch (err) { console.warn('[477]', err); } return; }
      }
    }).observe(main, { childList: true });
    try { festa(); } catch (err) { console.warn('[477]', err); }
  }
  // Breidd spjaldsins breytist (snúningur, þrengri gluggi) → „Sjá fleiri" telur upp á nýtt
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { const k = document.getElementById(ID); if (k && k._html) uppfaeraTakka(k); });
    const bida = setInterval(() => { const k = document.getElementById(ID); if (k && !k._ro) { k._ro = true; ro.observe(k); } }, 1500);
    window.addEventListener('pagehide', () => clearInterval(bida), { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();
})();
