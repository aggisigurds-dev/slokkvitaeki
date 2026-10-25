/* === PRÓFÍLL: TEIKNING OG BÚNAÐARGREINING Í EINUM GLUGGA UNDIR SAMSKIPTUM (485) ==================
 *
 * Agnar 25.10.2026: „Færa teikningaflipann fyrir neðan Samskipti, sýna bara 3 teikningar mest í röð, aðrar hæðir í collapsed ásamt nánari greiningunni …
 * Það mætti tvinna þessa 2 glugga saman, hafa eina tvær línur með helstu upplýsingum og annað collapsed default … auk gera svipað í símaham og Öpp ham."
 *
 * Teikningaborðinn (#co-fp-section: hæðaspjöld 456 + Búnaðargreiningar-spjald 474) er nú:
 *   · fluttur undir Samskipti (rétt á eftir ._samskipti-host);
 *   · tvær línur með helstu upplýsingum — 1) Teikning · fjöldi hæða · staðsetningar · 2) Búnaðargreining · staða · dagsetning · tölurnar (handslökkvitæki, slöngukefli, útgangar) —
 *     og allt annað (hæðaspjöldin, 3 í röð með hinar á bak við „Sjá fleiri hæðir“, og greiningin) fellt saman þar til smellt er á línuna;
 *   · „Nánari greining“ (athugasemdir, heimildir, óteiknuð tæki) enn ein fella þegar spjaldið er opið.
 * Samanbrotið vistast á þjóninum (Vidmot 'profill.teikningSaman', eins á öllum vélum). Sama gildir á síma og í Öppum — aðeins DOM-flutningur og CSS, engin gögn sótt eða skrifuð.
 * ================================================================================= */
(() => {
  if (window.__profTeiknSaman) return;
  window.__profTeiknSaman = true;

  const KEY = 'profill.teikningSaman', MIG = 'profill.teikningSaman.mig1', SYNA = 'profill.teikningSyna';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = e => String((e && e.textContent) || '').replace(/\s+/g, ' ').trim();
  let nanar = false, bid = 0;

  // sjálfgefið OPIÐ (Agnar 25.10.2026: „sýna 2 hæðir í preview glugga“) — hæðaspjöldin sjást; „Nánari greining“ er fellt. Valið vistast um leið og skipt er.
  const opid = () => { try { const v = window.Vidmot ? Vidmot.lesa(KEY, null) : null; return v === null || v === undefined ? true : v === true; } catch (_) { return true; } };
  const setjaOpid = v => { try { if (window.Vidmot) Vidmot.setja(KEY, !!v); } catch (_) {} };

  function still() {
    if (document.getElementById('_t485-css')) return;
    const st = document.createElement('style'); st.id = '_t485-css';
    const S = '#co-fp-section.t485';
    st.textContent = '' +
      S + ' > ._tf-haus{display:none!important}' +
      // 405 (B27) felur borðann með hæð 0 þar til „Teikning“-takkinn í banner er notaður — línurnar tvær eiga alltaf að sjást (líka á síma og í Öppum)
      'html #companies-main #co-fp-section.t485.t485{height:auto!important;min-height:0!important;overflow:visible!important;opacity:1!important;pointer-events:auto!important;margin:8px 0!important;padding:0!important;border:1px solid #e3e1dc!important;border-radius:12px!important;background:#fff!important;box-shadow:none!important}' +
      '#t485-sam{display:flex;flex-direction:column;gap:2px;padding:8px 12px;background:#faf9f6;border-bottom:1px solid #e3e1dc;font:500 13px/1.35 system-ui,sans-serif;color:#2b2a27;cursor:pointer}' +
      '#t485-sam .l{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}' +
      '#t485-sam .lb{font:700 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#4a4740;flex:none}' +
      '#t485-sam em{font-style:normal;font:700 10.5px system-ui;padding:1px 7px;border-radius:999px;background:#fff3d6;border:1px solid #e0b95a;color:#7a5a0f}' +
      '#t485-sam small{color:#7a766d;font:500 11.5px system-ui}' +
      '#t485-sam .t{display:inline-flex;gap:4px;align-items:baseline;padding:1px 8px;border:1px solid #e3e1dc;border-radius:7px;background:#fff;font:600 12px system-ui}' +
      '#t485-sam .t strong{font:700 14px/1 Georgia,serif}' +
      '#t485-sam .sp{flex:1}' +
      '#t485-sam button{height:26px;padding:0 10px;border:1px solid #cfccc4;border-radius:7px;background:#fff;color:#2b2a27;font:600 11.5px system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
      '#t485-sam button:hover{border-color:#2b2a27}' +
      '#t485-sam .v{display:inline-flex;align-items:center;gap:5px}' +
      '#t485-sam .v i{display:inline-block;font-style:normal;transition:transform .2s}' +
      S + '.t485-opid #t485-sam .v i{transform:rotate(180deg)}' +
      // allt annað fellt þar til opnað
      S + ':not(.t485-opid) > #co-fp-hdir,' + S + ':not(.t485-opid) > #co-bgr{display:none!important}' +
      // nánari greining (athugasemdir, heimildir, óteiknuð tæki) fellt nema um hana sé beðið
      // greiningarspjaldið (Prenta · Turbo · Greina aftur · athugasemdir · heimildir) er allt „Nánari greining“ — línan 2 hér að ofan segir það helsta
      S + ':not(.t485-nanar) > #co-bgr{display:none!important}' +
      '#co-fp-section.t485.t485-n2 > #co-fp-hdir{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
      // á breiðum skjá fylla tvær hæðir ekki 700 px hvor — forskoðunin helst ~420 px breið (Agnar: „preview glugga“, ekki heil síða)
      '@container (min-width:900px){#co-fp-section.t485.t485 > #co-fp-hdir,#co-fp-section.t485.t485.t485-n2 > #co-fp-hdir{grid-template-columns:repeat(3,minmax(0,430px))!important;justify-content:start}}' +
      S + ' #co-fp-hdir{padding:10px!important}' +
      // TVÍTALNINGAR BURT: Teikningar-röðin og Hæðir-röðin í banner (HÚS-línan og Teikning-glugginn sýna það sama), „Sýna teikningu“-takki 405 (línan hefur sinn), flísar greiningarinnar (komnar uppi), Greining fasteignar í Byggingarupplýsingum (er í Óskráð-línunni), Tengiliður-flís Samskipta (er í banner)
      'html body #companies-main .co-banner .co-bupp ._bupp-lina._bupp-teikn-lina,html body #companies-main .co-banner ._bupp-teikn-lina,html body #companies-main .co-banner ._fasteign.t485-fal{display:none!important}' +
      '#b405-fpt{display:none!important}' +
      S + ' #co-bgr .bgr-s{display:none!important}' +
      '@media (max-width:700px){html body #companies-main ._gr-profil-takki{color:#2b3140!important;opacity:1!important;text-decoration:none!important;border:1px solid #cfccc4;border-radius:8px;padding:6px 10px;background:#fff}}' +
      S + ' #co-bgr .bgr-h strong,' + S + ' #co-bgr .bgr-h em{display:none!important}' +
      '#_bs468 [data-bs="greining"]{display:none!important}' +
      'html body #companies-main ._samskipti-card ._skx-tile.t485-fal{display:none!important}' +
      // spjöldin fyrir neðan banner sitja þétt saman (Agnar: „allt of dreift“)
      'html body #companies-main > #co-fp-section.t485,html body #companies-main > #_kt450,html body #companies-main > #_bs468{margin-top:6px!important;margin-bottom:0!important}' +
      '@media (max-width:700px){#t485-sam{padding:7px 9px;font-size:12.5px}#t485-sam .t{padding:1px 6px}}';
    (document.head || document.documentElement).appendChild(st);
  }

  // Vidmot-gildið „Sýna teikningu“ (405) var sjálfgefið ósatt — hér á teikningin að sjást sem tvær línur; breytt einu sinni (vistast á þjóninn)
  function flytja() {
    try {
      if (!window.Vidmot || Vidmot.lesa(MIG, false) === true) return;
      Vidmot.setja(MIG, true);
      if (Vidmot.lesa(SYNA, false) !== true) Vidmot.setja(SYNA, true);
    } catch (_) {}
  }

  function hnitaTolur(sec) {
    const haus = sec.querySelector('._tf-haus span'), m = String(txt(haus)).match(/(\d+)\s*sta/i);
    const stad = m ? +m[1] : null;
    const haedir = sec.querySelectorAll('#co-fp-hdir .cfh-k').length;
    const bgr = sec.querySelector('#co-bgr');
    const em = bgr && bgr.querySelector('.bgr-h em'), sm = bgr && bgr.querySelector('.bgr-h small');
    const dags = sm ? txt(sm).split(' · ')[0] : '';
    const t = bgr ? [...bgr.querySelectorAll('.bgr-s > b')].map(b => {
      const s = b.querySelector('strong'), tala = s ? txt(s) : '', rest = txt(b).replace(tala, '').trim();
      return '<span class="t"><strong>' + esc(tala) + '</strong>' + esc(rest) + '</span>';
    }).join('') : '';
    return { stad, haedir, bgr: !!bgr, stada: em ? txt(em) : '', dags, t };
  }

  function bua(sec) {
    let bar = sec.querySelector(':scope > #t485-sam');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 't485-sam'; bar.title = 'Smelltu til að opna eða fella teikningarnar og greininguna';
      bar.addEventListener('click', e => {
        const b = e.target.closest('button[data-a]');
        if (b && b.dataset.a === 'teikn') { e.stopPropagation(); try { if (window.Companies && Companies.opnaTeikningu && window._currentCompanyId != null) Companies.opnaTeikningu(window._currentCompanyId); } catch (_) {} return; }
        if (b && b.dataset.a === 'nanar') { e.stopPropagation(); nanar = !nanar; sec.classList.toggle('t485-nanar', nanar); bar._h = ''; fylla(sec, bar); return; }
        const nu = !sec.classList.contains('t485-opid'); sec.classList.toggle('t485-opid', nu); setjaOpid(nu); bar._h = ''; fylla(sec, bar);
        if (nu) { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }
      });
      sec.insertBefore(bar, sec.firstChild);
    }
    return bar;
  }

  function fylla(sec, bar) {
    const d = hnitaTolur(sec), o = sec.classList.contains('t485-opid');
    const l1 = '<div class="l l1"><span class="lb">Teikningar</span><span>' + (d.haedir ? d.haedir + (d.haedir === 1 ? ' hæð' : ' hæðir') : '') + (d.haedir && d.stad != null ? ' · ' : '') + (d.stad != null ? d.stad + ' staðsetningar' : '') + '</span><span class="sp"></span>' +
      '<button type="button" class="v">' + (o ? 'Fella' : 'Sýna') + ' <i>▾</i></button></div>';
    const l2 = d.bgr ? '<div class="l l2"><span class="lb">Búnaðargreining</span>' + (d.stada ? '<em>' + esc(d.stada) + '</em>' : '') + (d.dags ? '<small>' + esc(d.dags) + '</small>' : '') + '<span class="sp"></span>' +
      (o ? '<button type="button" data-a="nanar">' + (sec.classList.contains('t485-nanar') ? 'Fela nánari greiningu' : 'Nánari greining') + '</button>' : '') + '</div>' : '';
    const h = l1 + l2 + '|' + o;
    if (bar._h !== h) { bar._h = h; bar.innerHTML = l1 + l2; }
  }

  function stadsetja(sec) {
    const sam = document.querySelector('#companies-main > ._samskipti-host');
    if (!sam || !sam.parentNode || sam.parentNode !== sec.parentNode) return;
    if (sec.previousElementSibling !== sam) sam.parentNode.insertBefore(sec, sam.nextSibling);
  }

  /* ── LÍNAN UPPI Í AÐALGLUGGANUM: helstu upplýsingar úr greiningunni + magn búnaðar sbr. teikningum (Agnar 25.10.2026) ── */
  function toppurStill() {
    if (document.getElementById('_t485-top-css')) return;
    const st = document.createElement('style'); st.id = '_t485-top-css';
    st.textContent = '' +
      '.co-banner > #t485-top{grid-area:top!important;margin:2px 12px 4px 12px;display:flex;flex-direction:column;gap:3px;padding:7px 10px;border:1px solid #e3e1dc;border-radius:10px;background:#faf9f6;font:500 12.5px/1.35 system-ui,sans-serif;color:#2b2a27;min-width:0}' +
      '#t485-top .r{display:flex;align-items:center;gap:6px 8px;flex-wrap:wrap;min-width:0}' +
      '#t485-top .r>.lb{flex:none;min-width:84px;font:700 10.5px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b665b}' +
      '#t485-top .k{display:inline-flex;align-items:baseline;gap:5px;padding:1px 8px;border:1px solid #e3e1dc;border-radius:7px;background:#fff;white-space:nowrap}' +
      '#t485-top .k i{font-style:normal;font:600 10.5px system-ui;color:#7a766d}' +
      '#t485-top .k strong{font:700 14px/1 Georgia,serif}' +
      '#t485-top em{font-style:normal;font:700 10.5px system-ui;padding:1px 7px;border-radius:999px;background:#fff3d6;border:1px solid #e0b95a;color:#7a5a0f}' +
      '#t485-top small{color:#7a766d;font:500 11.5px system-ui}' +
      '#t485-top .sp{flex:1}' +
      '#t485-top button{height:24px;padding:0 9px;border:1px solid #cfccc4;border-radius:7px;background:#fff;color:#2b2a27;font:600 11.5px system-ui;cursor:pointer}' +
      '@media (max-width:700px){.co-banner > #t485-top{margin:4px 0;padding:6px 8px;font-size:12px}#t485-top .r>.lb{min-width:0;width:100%}}';
    (document.head || document.documentElement).appendChild(st);
  }
  function toppur() {
    const ban = document.querySelector('#companies-main > .co-banner'); if (!ban) return;
    toppurStill();
    let el = ban.querySelector(':scope > #t485-top');
    if (!el) { el = document.createElement('div'); el.id = 't485-top'; el.addEventListener('click', e => { const b = e.target.closest('button[data-a="teikn"]'); if (!b) return; const s = document.getElementById('co-fp-section'); if (s) { if (!s.classList.contains('t485-opid')) { s.classList.add('t485-opid'); setjaOpid(true); } s.scrollIntoView({ block: 'start', behavior: 'smooth' }); try { window.dispatchEvent(new Event('resize')); } catch (_) {} } }); ban.appendChild(el); }
    const bs = document.getElementById('_bs468');
    const reitir = bs ? [...bs.querySelectorAll('.bs-reitir .ssp-lina')].map(l => ({ n: txt(l.querySelector('.ssp-merki')), v: txt(l.querySelector('.ssp-gildi')) })).filter(x => x.n && x.v && !/^[–—-]$/.test(x.v)) : [];
    // HÚS-línan (reitir banner) sýnir þegar hæðir og m² — sama tala er ekki sýnd tvisvar (Agnar 25.10.2026: „allt of mikið af tvítalningum“)
    const talur = v => String(v || '').split('').filter(ch => ch >= '0' && ch <= '9').join('');
    const husInp = [...ban.querySelectorAll('._bupp-lina:not(._bupp-tomt) input')].slice(0, 2).map(i => talur(i.value));
    const tal = talur;
    const VELJA = ['Brúttó', 'Birt flatarmál', 'Rúmmál', 'Hæðir', 'Eignir', 'Byggingarár'];
    const bygg = VELJA.map(n => reitir.find(x => x.n === n)).filter(Boolean)
      .filter(x => !(x.n === 'Brúttó' && husInp[1] && tal(String(x.v).split(',')[0]) === husInp[1]))
      .filter(x => !(x.n === 'Hæðir' && husInp[0] && talur(String(x.v).split(' ')[0]) === husInp[0])).map(x => '<span class="k"><i>' + esc(x.n) + '</i>' + esc(x.v) + '</span>').join('');
    const bgr = document.getElementById('co-bgr');
    const chips = bgr ? [...bgr.querySelectorAll('.bgr-s > b')].map(b => { const s = b.querySelector('strong'), tala = s ? txt(s) : '', rest = txt(b).replace(tala, '').trim(); return '<span class="k"><strong>' + esc(tala) + '</strong>' + esc(rest) + '</span>'; }).join('') : '';
    const em = bgr && bgr.querySelector('.bgr-h em'), sm = bgr && bgr.querySelector('.bgr-h small');
    const dags = sm ? txt(sm).split(' · ')[0] : '';
    const l1 = bygg ? '<div class="r"><span class="lb">Bygging</span>' + bygg + '</div>' : '';
    const l2 = chips ? '<div class="r"><span class="lb">Búnaður sbr. teikningum</span>' + chips + '</div>' : '';
    const h = l1 + l2;
    if (el._h !== h) { el._h = h; el.innerHTML = h; }
    el.style.display = h ? '' : 'none';
  }

  /* ── BYGGINGARUPPLÝSINGAR (468): fellt saman sjálfgefið — helstu tölurnar eru komnar upp í aðalgluggann; haus + smellur opnar ── */
  const BKEY = 'profill.byggingOpid';
  function byggingStill() {
    if (document.getElementById('_t485-bs-css')) return;
    const st = document.createElement('style'); st.id = '_t485-bs-css';
    st.textContent = '#_bs468:not(.t485-bopid) > .ssp-buk{display:none!important}' +
      '#_bs468:not(.t485-bopid){min-height:0!important}' +
      '#_bs468 > .ssp-haus{cursor:pointer}' +
      '#_bs468 > .ssp-haus::after{content:"▾";margin-left:10px;color:#e8e2d4;font-size:13px;transition:transform .2s;flex:none}' +
      '#_bs468.t485-bopid > .ssp-haus::after{transform:rotate(180deg)}';
    (document.head || document.documentElement).appendChild(st);
  }
  function bygging() {
    const bs = document.getElementById('_bs468'); if (!bs) return;
    byggingStill();
    let o = false; try { o = !!(window.Vidmot && Vidmot.lesa(BKEY, false) === true); } catch (_) {}
    if (bs.classList.contains('t485-bopid') !== o && !bs._t485klikk) bs.classList.toggle('t485-bopid', o);
    const hd = bs.querySelector(':scope > .ssp-haus');
    if (hd && !hd._t485) {
      hd._t485 = true;
      hd.addEventListener('click', e => {
        if (e.target.closest('button,a,input,label,select')) return;
        const nu = !bs.classList.contains('t485-bopid'); bs.classList.toggle('t485-bopid', nu);
        try { if (window.Vidmot) Vidmot.setja(BKEY, nu); } catch (_) {}
      });
    }
  }

  // inline !important: stílblöð Brunastáls (411/363) setja display með !important og meiri sérhæfni en nokkur regla héðan
  function fal(e, on) {
    if (!e) return;
    const er = e.getAttribute('data-t485-fal') === '1';
    if (on && !er) { e.setAttribute('data-t485-fal', '1'); e.style.setProperty('display', 'none', 'important'); }
    else if (!on && er) { e.removeAttribute('data-t485-fal'); e.style.removeProperty('display'); }
  }
  function fela() {
    const ban = document.querySelector('#companies-main > .co-banner');
    if (ban) {
      fal(ban.querySelector('._bupp-teikn-lina'), !!document.getElementById('co-fp-section'));
      const inp = ban.querySelector('._bupp-lina:not(._bupp-tomt) input');
      fal(ban.querySelector('._fasteign'), !!(inp && String(inp.value || '').trim()));
    }
    document.querySelectorAll('._samskipti-card ._skx-tile').forEach(t => fal(t, /^tengili/i.test(txt(t))));
    const main = document.getElementById('companies-main');
    if (main) {
      // „+ Bæta við tæki“ tvisvar (Agnar 25.10.2026: „2 bæta við tækjum“): 73 setur bulk-takka með sama nafni og upprunalegi takkinn átti að fara — hann sést enn í sumum hömum
      const bulk = main.querySelector('._bulkadd_btn');
      main.querySelectorAll('button.btn-primary').forEach(b => { if (/^Companies[.]addUnit/.test(b.getAttribute('onclick') || '') && /^[+]? *Bæta við tæki/.test(txt(b))) fal(b, !!(bulk && bulk.getBoundingClientRect().width > 0)); });
      // tómur hnappur í hausnum á Byggingarupplýsingum (OCR-takki án texta) — hvít ferningur sem ekkert gerir sýnilegt
      main.querySelectorAll('#_bs468 [data-bs="ocr"]').forEach(b => fal(b, !txt(b)));
      main.querySelectorAll('#_bs468 [data-bs="greining"]').forEach(b => fal(b, true));   // „Greining fasteignar“ er í Óskráð-línunni — ekki tvisvar
      // „Greining fasteignar“ á síma: hvítur texti á ljósum bakgrunni sást ekki
      main.querySelectorAll('._gr-profil-takki').forEach(b => {
        const m = (getComputedStyle(b).color.match(/[0-9.]+/g) || []).map(Number);
        if (m.length >= 3 && m[0] + m[1] + m[2] > 560 && !b._t485) { b._t485 = 1; b.style.setProperty('color', '#2b3140', 'important'); b.style.setProperty('opacity', '1', 'important'); b.style.setProperty('background', '#fff', 'important'); b.style.setProperty('border', '1px solid #cfccc4', 'important'); b.style.setProperty('border-radius', '8px', 'important'); b.style.setProperty('padding', '6px 10px', 'important'); b.style.setProperty('text-decoration', 'none', 'important'); }
      });
    }
    // 362 („Fella“ í gamla hausnum) vistaði fellt ástand sem felur spjöldin þótt línan segi opið — línan í 485 ræður nú
    try { if (document.documentElement.getAttribute('data-teikning') === 'fellt') { document.documentElement.removeAttribute('data-teikning'); if (window.Vidmot && Vidmot.lesa('profill.teikningFellt', false) === true) Vidmot.setja('profill.teikningFellt', false); } } catch (_) {}
  }

  function tikk() {
    try { fela(); } catch (e) { console.warn('[485] fela', e && e.message); }
    try { toppur(); } catch (e) { console.warn('[485] topp', e && e.message); }
    try { bygging(); } catch (e) { console.warn('[485] bygging', e && e.message); }
    const sec = document.getElementById('co-fp-section'); if (!sec) return;
    still(); flytja();
    if (!sec.classList.contains('t485')) { sec.classList.add('t485'); sec.classList.toggle('t485-opid', opid()); }
    const o = opid(); if (sec.classList.contains('t485-opid') !== o) sec.classList.toggle('t485-opid', o);
    const n2 = sec.querySelectorAll('#co-fp-hdir > .cfh-k').length === 2; if (sec.classList.contains('t485-n2') !== n2) sec.classList.toggle('t485-n2', n2);
    stadsetja(sec);
    fylla(sec, bua(sec));
  }

  // Borðinn er endursmíðaður við hverja opnun prófíls og greiningin teiknast eftir á: inngjöf (≤ 120 ms) + varðhundur — skrifar aðeins ef eitthvað breyttist
  function seinka() { if (bid) return; bid = setTimeout(() => { bid = 0; try { tikk(); } catch (e) { console.warn('[485]', e && e.message); } }, 120); }
  try { new MutationObserver(seinka).observe(document.getElementById('companies-main') || document.body, { childList: true, subtree: true }); } catch (_) {}
  setInterval(seinka, 1500);
  window.ProfTeiknSaman = { tikk };
})();
