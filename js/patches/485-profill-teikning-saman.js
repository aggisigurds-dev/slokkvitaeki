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

  const opid = () => { try { return !!(window.Vidmot && Vidmot.lesa(KEY, false) === true); } catch (_) { return false; } };
  const setjaOpid = v => { try { if (window.Vidmot) Vidmot.setja(KEY, !!v); } catch (_) {} };

  function still() {
    if (document.getElementById('_t485-css')) return;
    const st = document.createElement('style'); st.id = '_t485-css';
    const S = '#co-fp-section.t485';
    st.textContent = '' +
      S + ' > ._tf-haus{display:none!important}' +
      '#t485-sam{display:flex;flex-direction:column;gap:2px;padding:8px 12px;background:#faf9f6;border-bottom:1px solid #e3e1dc;font:500 13px/1.35 system-ui,sans-serif;color:#2b2a27;cursor:pointer}' +
      '#t485-sam .l{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}' +
      '#t485-sam .l1 b{font:700 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#4a4740}' +
      '#t485-sam .l2 b{font:700 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#4a4740}' +
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
      S + ':not(.t485-nanar) #co-bgr .bgr-b>*:not(.bgr-s):not(.bgr-bl){display:none!important}' +
      S + ' #co-fp-hdir{padding:10px!important}' +
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
    const l1 = '<div class="l l1"><b>Teikning</b><span>' + (d.haedir ? d.haedir + (d.haedir === 1 ? ' hæð' : ' hæðir') : '') + (d.haedir && d.stad != null ? ' · ' : '') + (d.stad != null ? d.stad + ' staðsetningar' : '') + '</span><span class="sp"></span>' +
      '<button type="button" data-a="teikn">Opna Teikningu</button><button type="button" class="v">' + (o ? 'Fella' : 'Sýna') + ' <i>▾</i></button></div>';
    const l2 = d.bgr ? '<div class="l l2"><b>Búnaðargreining</b>' + (d.stada ? '<em>' + esc(d.stada) + '</em>' : '') + (d.dags ? '<small>' + esc(d.dags) + '</small>' : '') + d.t + '<span class="sp"></span>' +
      (o ? '<button type="button" data-a="nanar">' + (sec.classList.contains('t485-nanar') ? 'Fela nánari greiningu' : 'Nánari greining') + '</button>' : '') + '</div>' : '';
    const h = l1 + l2 + '|' + o;
    if (bar._h !== h) { bar._h = h; bar.innerHTML = l1 + l2; }
  }

  function stadsetja(sec) {
    const sam = document.querySelector('#companies-main > ._samskipti-host');
    if (!sam || !sam.parentNode || sam.parentNode !== sec.parentNode) return;
    if (sec.previousElementSibling !== sam) sam.parentNode.insertBefore(sec, sam.nextSibling);
  }

  function tikk() {
    const sec = document.getElementById('co-fp-section'); if (!sec) return;
    still(); flytja();
    if (!sec.classList.contains('t485')) { sec.classList.add('t485'); sec.classList.toggle('t485-opid', opid()); }
    const o = opid(); if (sec.classList.contains('t485-opid') !== o) sec.classList.toggle('t485-opid', o);
    stadsetja(sec);
    fylla(sec, bua(sec));
  }

  // Borðinn er endursmíðaður við hverja opnun prófíls og greiningin teiknast eftir á: inngjöf (≤ 120 ms) + varðhundur — skrifar aðeins ef eitthvað breyttist
  function seinka() { if (bid) return; bid = setTimeout(() => { bid = 0; try { tikk(); } catch (e) { console.warn('[485]', e && e.message); } }, 120); }
  try { new MutationObserver(seinka).observe(document.getElementById('companies-main') || document.body, { childList: true, subtree: true }); } catch (_) {}
  setInterval(seinka, 1500);
  window.ProfTeiknSaman = { tikk };
})();
