/* === TEIKNING: FLIPAR Í HLIÐARSPJALDINU — Tæki · Búnaður · Merki (483) ===========================
 *
 * Agnar 25.10.2026 (skjámynd með rauðum útstrikunum: „þetta er alllt of mikið af óþarfa doti … samræma aðeins á milli síma og desktop, setja Hama þarna líka,
 * búnaður, merki, svo ég sjái efst bara tækin … Nýtt óskráð + léttvatn, duft, co2, brunaslanga allt í mjóum raunverulegum icons … í línunni fyrir neðan sömu
 * tækin sem segja töluna á búnaðargreiningunni og hve mörg eru skráð og hve mörg af þeim merkt inn … síðan skráðu tækin fyrir neðan, óskráðu tækin birtast efst").
 *
 * TÆKI (sjálfgefinn flipi):  Nýtt óskráð ▸ fjórar raunverulegar myndir (léttvatn · duft · CO₂ · slanga) hlið við hlið — þær eru sömu hnappar og í Búnaði
 *                            (dragðir á teikninguna), aðeins endurstíluð · talnalína undir: greining · skráð · merkt inn · síðan óskráð („Nýtt“-merki á
 *                            hæðinni) og tækjaspjöldin (skráð tæki).
 * BÚNAÐUR:                   allur búnaðurinn sem hægt er að staðsetja óskráðan (skynjarar, bjalla, segulloki …).
 * MERKI:                     skilti og stimplar, stærð merkja.
 * Á síma ræður efsta flipalínan (442): Tæki = sama útlit og hér; Merki = búnaður + merki. Aðeins útlit og tvær lesnar fyrirspurnir (búnaðargreining) — ekkert skrifað.
 * ================================================================================= */
(() => {
  if (window.__teiknFlipar) return;
  window.__teiknFlipar = true;

  const FP = () => window.FloorPlan;
  const GERDIR = [['l', 'lettvatn', 'Léttvatn'], ['duft', 'duft', 'Duft'], ['co2', 'co2', 'CO₂'], ['slanga_rod', 'slanga', 'Slanga']];
  const FLIPAR = [['taeki', 'Tæki'], ['bunadur', 'Búnaður'], ['merki', 'Merki']];
  let flipi = 'taeki', alltOskrad = false, grSkyndi = null, grCid = null, grBid = 0;
  const norm = t => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // tegund tækis → mynd (img/taeki)
  const ikonTegund = t => { const n = norm(t); return /co2/.test(n) ? 'co2' : /duft|abc/.test(n) ? 'duft' : /slang|kefli/.test(n) ? 'slanga_rod' : /hitask/.test(n) ? 'hitaskynjari' : /reyk/.test(n) ? 'reykskynjari' : 'l'; };
  const modal = () => document.getElementById('modal-floorplan');
  const spjald = () => document.getElementById('fp-panel');

  function still() {
    if (document.getElementById('_t482-css')) return;
    const st = document.createElement('style'); st.id = '_t482-css';
    const T4 = ['b:lettvatn', 'b:duft', 'b:co2', 'b:slanga'].map(x => '#fp-bunadur .fp-stimpill[data-sign="' + x + '"]');
    st.textContent = '' +
      '#fp-pn-tabs{display:flex;gap:4px;margin:0 0 8px;padding:3px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)}' +
      '#fp-pn-tabs button{flex:1;height:32px;border:0!important;border-radius:8px!important;background:transparent!important;color:#e2ddd0!important;font:700 12.5px system-ui,sans-serif!important;cursor:pointer;padding:0 6px!important;box-shadow:none!important}' +
      '#fp-pn-tabs button[aria-pressed="true"]{background:#c9a54a!important;color:#14120f!important}' +
      '#modal-floorplan.fp-simi #fp-pn-tabs{display:none!important}' +
      '#fp-panel>.fp-pn-hd0{display:none!important}' +
      // hvað sést í hverjum flipa
      '#modal-floorplan.fp-pn-taeki #t442-haus,#modal-floorplan.fp-pn-taeki #t442-val,#modal-floorplan.fp-pn-taeki #fp-stimpil,#modal-floorplan.fp-pn-taeki #fp-stimpil-staerd-wrap,#modal-floorplan.fp-pn-taeki #fp-nytt{display:none!important}' +
      '#modal-floorplan.fp-pn-bunadur #fp-pn-tolur,#modal-floorplan.fp-pn-bunadur #fp-pn-oskrad,#modal-floorplan.fp-pn-bunadur #fp-unit-list,#modal-floorplan.fp-pn-bunadur #fp-tl-sia,#modal-floorplan.fp-pn-bunadur #t442-haus,#modal-floorplan.fp-pn-bunadur #t442-val,#modal-floorplan.fp-pn-bunadur #fp-stimpil,#modal-floorplan.fp-pn-bunadur #fp-stimpil-staerd-wrap{display:none!important}' +
      '#modal-floorplan.fp-pn-merki #fp-bunadur,#modal-floorplan.fp-pn-merki #fp-pn-tolur,#modal-floorplan.fp-pn-merki #fp-pn-oskrad,#modal-floorplan.fp-pn-merki #fp-unit-list,#modal-floorplan.fp-pn-merki #fp-tl-sia{display:none!important}' +
      '#modal-floorplan:not(.fp-pn-taeki):not(.fp-pn-bunadur):not(.fp-pn-merki) #fp-pn-tolur,#modal-floorplan:not(.fp-pn-taeki):not(.fp-pn-bunadur):not(.fp-pn-merki) #fp-pn-oskrad{display:none!important}' +
      // valið merki í Tæki: aðeins nafn og Snúa / Fjarlægja
      '#modal-floorplan.fp-pn-taeki #fp-merki-adgerd .fp-stimpil-lbl,#modal-floorplan.fp-pn-taeki #fp-merki-adgerd .fp-vm-stimp{display:none!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-merki-adgerd{padding:5px 8px!important;margin:0 0 6px!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-merki-adgerd .fp-merki-nafn{font-size:12.5px!important;margin:0 0 4px!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-merki-adgerd .fp-merki-acts button{height:32px!important}' +
      // NÝTT ÓSKRÁÐ: fjórar raunverulegar myndir hlið við hlið (sömu hnappar og í Búnaði — dragast á teikninguna)
      '#modal-floorplan.fp-pn-taeki #fp-bunadur{display:grid!important;grid-template-columns:78px repeat(4,1fr);gap:6px;align-items:center;margin:0 0 2px!important;padding:6px 6px 2px!important;overflow:visible!important;flex-wrap:nowrap!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur>.fp-stimpil-lbl{display:block!important;font-size:0!important;line-height:0!important;margin:0!important;padding:0!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur>.fp-stimpil-lbl::before{content:"Nýtt óskráð";display:block;font:700 11px/1.2 system-ui,sans-serif;color:#e8e2d4;letter-spacing:.01em}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill{display:none!important}' +
      '#modal-floorplan.fp-pn-taeki ' + T4.join(',#modal-floorplan.fp-pn-taeki ') + '{display:flex!important;justify-content:center;width:100%!important;min-width:0!important;height:54px!important;padding:0!important;font-size:0!important;border-radius:9px!important;background-color:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.22)!important;background-repeat:no-repeat!important;background-position:center!important;background-size:auto 42px!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill-ico{display:none!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill[data-sign="b:lettvatn"]{background-image:url(/img/taeki/l.png)!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill[data-sign="b:duft"]{background-image:url(/img/taeki/duft.png)!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill[data-sign="b:co2"]{background-image:url(/img/taeki/co2.png)!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill[data-sign="b:slanga"]{background-image:url(/img/taeki/slanga_rod.png)!important;background-size:auto 36px!important}' +
      '#modal-floorplan.fp-pn-taeki #fp-bunadur .fp-stimpill:hover{border-color:#d9b45a!important}' +
      // talnalínan: greining · skráð · merkt inn
      '#fp-pn-tolur{display:grid;grid-template-columns:78px repeat(4,1fr);gap:2px 6px;align-items:center;padding:2px 6px 8px}' +
      '#fp-pn-tolur .tl-l{font:700 10.5px/1.2 system-ui,sans-serif;white-space:nowrap}' +
      '#fp-pn-tolur .tl-l i{font-style:normal;font-weight:700}' +
      '#fp-pn-tolur .tl-c{display:flex;justify-content:center;font:700 13px/1.2 system-ui,sans-serif;color:#fff;white-space:nowrap}' +

      '#fp-pn-tolur .g,#fp-pn-tolur .tl-l .g{color:#e9c76e}#fp-pn-tolur .s,#fp-pn-tolur .tl-l .s{color:#fff}#fp-pn-tolur .m,#fp-pn-tolur .tl-l .m{color:#62e6a3}' +
      '#fp-pn-tolur .vantar{color:#ff9d8a}' +
      // óskráð tæki (Nýtt-merki) efst
      '#fp-pn-oskrad{margin:0 0 8px;border-radius:10px;border:1px solid rgba(170,170,255,.4);background:rgba(79,70,229,.12);overflow:hidden}' +
      '#fp-pn-oskrad .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 9px;font:700 12px system-ui,sans-serif;color:#d6d8ff}' +
      '#fp-pn-oskrad .hd button{height:22px;padding:0 8px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#f1ede4;font:700 11px system-ui;cursor:pointer}' +
      '#fp-pn-oskrad .r{display:flex;align-items:center;gap:9px;padding:4px 9px;cursor:pointer;color:#fff;font:600 12.5px system-ui,sans-serif;border-top:1px solid rgba(255,255,255,.08)}' +
      '#fp-pn-oskrad .r:hover{background:rgba(255,255,255,.07)}' +
      '#fp-pn-oskrad .r img{height:26px;width:26px;object-fit:contain;flex:none}' +
      '#fp-pn-oskrad .r small{margin-left:auto;font:600 10px system-ui;color:#b9bcf5;opacity:.85}' +
      '#modal-floorplan.fp-simi #fp-pn-oskrad .r{padding:6px 9px}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── gögn: búnaðargreining (ein fyrirspurn, 5 mín skyndiminni) ── */
  function saekjaGreiningu(cid) {
    const sb = window.DB && DB.sb; if (!sb || !cid) return;
    if (grCid === cid && Date.now() - grBid < 5 * 60 * 1000) return;
    grCid = cid; grBid = Date.now();
    Promise.resolve(sb.from('bunadargreining').select('tki,tillogur').eq('company_id', cid).is('fjarlaegt_at', null).limit(1)).then(q => {
      const r = q && q.data && q.data[0];
      if (!r) { grSkyndi = { cid, n: null }; return; }
      const n = { l: 0, duft: 0, co2: 0, slanga_rod: 0 };
      const tel = (flokkur, bunadur, tegund) => {
        if (flokkur === 'brunakerfi' || flokkur === 'flotti') return;
        const b = norm(bunadur), g = norm(tegund);
        const k = /lang|efli/.test(b) ? 'slanga_rod' : /co2/.test(g) ? 'co2' : /duft|abc/.test(g) ? 'duft' : 'l';
        n[k]++;
      };
      (r.tki || []).forEach(t => tel(String(t.flokkur || ''), t.bunadur, t.tegund));
      ((r.tillogur && r.tillogur.tki) || []).forEach(t => { if (t.flokkur === 'bs') n.slanga_rod++; else tel('', '', t.tegund); });
      grSkyndi = { cid, n };
      uppfaera();
    }, () => { grSkyndi = { cid, n: null }; });
  }

  /* ── uppbygging ── */
  function smida() {
    const m = modal(), p = spjald();
    if (!m || !p) return false;
    still();
    if (!p.firstElementChild) return false;
    if (!p.firstElementChild.classList.contains('fp-pn-hd0') && p.firstElementChild.id !== 'fp-pn-tabs') p.firstElementChild.classList.add('fp-pn-hd0');
    let tabs = document.getElementById('fp-pn-tabs');
    const hd0 = p.querySelector(':scope > .fp-pn-hd0');
    if (!tabs) {
      tabs = document.createElement('div'); tabs.id = 'fp-pn-tabs';
      tabs.innerHTML = FLIPAR.map(f => '<button type="button" data-f="' + f[0] + '" aria-pressed="false">' + f[1] + '</button>').join('');
      tabs.addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; flipi = b.getAttribute('data-f'); klasar(); });
      ['pointerdown', 'mousedown'].forEach(ev => tabs.addEventListener(ev, e => e.stopPropagation()));
    }
    if (tabs.parentNode !== p || (hd0 && tabs.previousElementSibling !== hd0)) { if (hd0 && hd0.nextSibling) p.insertBefore(tabs, hd0.nextSibling); else p.appendChild(tabs); }
    const bun = document.getElementById('fp-bunadur');
    let tolur = document.getElementById('fp-pn-tolur');
    if (!tolur) { tolur = document.createElement('div'); tolur.id = 'fp-pn-tolur'; }
    if (bun && (tolur.parentNode !== p || bun.nextElementSibling !== tolur)) p.insertBefore(tolur, bun.nextSibling);
    const listi = document.getElementById('fp-unit-list');
    let osk = document.getElementById('fp-pn-oskrad');
    if (!osk) {
      osk = document.createElement('div'); osk.id = 'fp-pn-oskrad';
      osk.addEventListener('click', e => {
        if (e.target.closest('[data-all]')) { alltOskrad = !alltOskrad; uppfaera(); return; }
        const r = e.target.closest('[data-ix]'); if (!r) return;
        const mk = oskrad()[+r.getAttribute('data-ix')]; if (!mk) return;
        try { if (window.TeiknBord && TeiknBord.faraAd) TeiknBord.faraAd(mk.x, mk.y); } catch (_) {}
        try { if (window.TeiknMerking && TeiknMerking.velja) TeiknMerking.velja(mk); } catch (_) {}
      });
    }
    // óskráðu efst: rétt á undan tækjalistanum (leitin liggur þar á undan)
    if (listi && (osk.parentNode !== p || listi.previousElementSibling !== osk)) p.insertBefore(osk, listi);
    return true;
  }

  function klasar() {
    const m = modal(); if (!m) return;
    const simi = m.classList.contains('fp-simi');
    const vil = simi ? (m.classList.contains('t442-h-taeki') ? 'taeki' : '') : flipi;
    ['taeki', 'bunadur', 'merki'].forEach(k => { const a = vil === k; if (m.classList.contains('fp-pn-' + k) !== a) m.classList.toggle('fp-pn-' + k, a); });
    const tabs = document.getElementById('fp-pn-tabs');
    if (tabs) tabs.querySelectorAll('button[data-f]').forEach(b => { const a = b.getAttribute('data-f') === flipi; if (b.getAttribute('aria-pressed') !== String(a)) b.setAttribute('aria-pressed', String(a)); });
  }

  // „Nýtt“-merki á hæðinni sem sjást (síunni virt)
  function oskrad() {
    const F = FP(), pl = F && F.companyId != null && F.plans && F.plans[F.companyId];
    const ml = (pl && pl.markers) || [];
    const sia = window.TeiknSia;
    return ml.filter(m => m && (m.nytt === true || (typeof m.unitId === 'string' && m.unitId.indexOf('n:') === 0)) && !(sia && sia.falid && sia.falid(m, F.units)));
  }

  function uppfaera() {
    const F = FP(), p = spjald(); if (!F || !p || !F.companyId) return;
    const bun = document.getElementById('fp-bunadur'), tolur = document.getElementById('fp-pn-tolur'), osk = document.getElementById('fp-pn-oskrad');
    if (!tolur || !osk || !bun) return;
    saekjaGreiningu(F.companyId);
    const units = F.units || [], pl = F.plans && F.plans[F.companyId];
    const hs = (window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir()) || [], virk = (window.TeiknBord && TeiknBord.virk && TeiknBord.virk()) || 0;
    const merkt = new Set();
    hs.forEach((h, j) => ((j === virk ? (pl && pl.markers) : h.markers) || []).forEach(mk => { if (mk && typeof mk.unitId === 'number') merkt.add(mk.unitId); }));
    const skr = { l: 0, duft: 0, co2: 0, slanga_rod: 0 }, mk = { l: 0, duft: 0, co2: 0, slanga_rod: 0 };
    units.forEach(u => { const k = ikonTegund(u.type); if (skr[k] == null) return; skr[k]++; if (merkt.has(u.id)) mk[k]++; });
    const gr = grSkyndi && grSkyndi.cid === F.companyId ? grSkyndi.n : null;
    const rada = (kl, nafn, fn) => '<div class="tl-l"><i class="' + kl + '">' + nafn + '</i></div>' + GERDIR.map(g => { const k = g[0], v = fn(k); return '<div class="tl-c" title="' + esc(g[2] + ' — ' + nafn.toLowerCase()) + '"><span class="' + kl + (kl === 's' && gr && gr[k] != null && skr[k] < gr[k] ? ' vantar' : '') + '">' + v + '</span></div>'; }).join('');
    const html = rada('g', 'Greining', k => (gr ? gr[k] : '–')) + rada('s', 'Skráð', k => skr[k]) + rada('m', 'Merkt inn', k => mk[k]);
    if (tolur._h !== html) { tolur._h = html; tolur.innerHTML = html; }
    const o = oskrad(), sydd = alltOskrad ? o : o.slice(0, 6);
    const oh = !o.length ? '' : '<div class="hd"><span>Óskráð · ' + o.length + '</span>' + (o.length > 6 ? '<button type="button" data-all="1">' + (alltOskrad ? 'Færri' : 'Öll ' + o.length) + '</button>' : '') + '</div>' +
      sydd.map((m, i) => '<div class="r" data-ix="' + i + '"><img src="/img/taeki/' + ikonTegund(m.tegund) + '.png" alt="">Nýtt · ' + esc(m.tegund || 'tæki') + (typeof m.unitId === 'string' && /:g/.test(m.unitId) ? '<small>greining</small>' : '') + '</div>').join('');
    if (osk._h !== oh) { osk._h = oh; osk.innerHTML = oh; }
    osk.style.display = o.length ? '' : 'none';
  }

  function tikk() {
    try { if (smida()) { klasar(); uppfaera(); } } catch (e) { console.warn('[483]', e && e.message); }
  }

  function tengja() {
    const F = FP();
    if (!F || F.__flipar || typeof F._renderPanel !== 'function') return false;
    const panel = F._renderPanel.bind(F);
    F._renderPanel = function () { panel.apply(this, arguments); setTimeout(tikk, 120); };
    F.__flipar = true;
    return true;
  }
  if (!tengja()) { const t = setInterval(() => { if (tengja()) clearInterval(t); }, 500); setTimeout(() => clearInterval(t), 60000); }
  // glugginn opnaður / síminn skiptir um flipa / merki færast: ódýr athugun (aðeins samanburður, skrifar bara ef eitthvað breyttist)
  setInterval(() => { if (modal() && modal().classList.contains('open')) tikk(); }, 1200);
  window.TeiknFlipar = { tikk, flipi: () => flipi };
})();
