/* === TEIKNING: SÍMASTJÓRN (442) ===========================================
 *
 * Agnar 04.10.2026 (S26): „lækka hæðina á merkjastýringunni, hafa merkin collapsable,
 * bæta við + þar sem ég get valið hvaða merki séu á borðinu, og gera toppinn
 * collapsable líka — svo ég geti séð kortið betur."
 *
 *  · Merki: haus „▾ Merki" fellir merkin + stærðarsleðann saman; á síma ein lárétt
 *    skrunröð af litlum merkjum í stað tveggja raða af stórum hnöppum.
 *  · ＋ : velja hvaða merki eru á borðinu (falin merki hverfa úr röðinni, ekki af teikningunni).
 *  · Toppur (aðeins sími): ▴ fellir takkaraðirnar — titill og ✕ standa eftir.
 *
 * Allt þetta er viðmótsval, ekki gögn — í Vidmot per tækjaflokk (472), eitt gildi fyrir allar vélar (regla 15.10.2026).
 * 433 teiknar #fp-stimpil sjálft upp á nýtt; hér er AÐEINS bætt við haus fyrir framan
 * það og falið með CSS, svo endurteikning 433 þurrkar ekkert út.
 *
 * Lifandi prófun 07.10.2026 (375×812): hæðaflipar 383 brotnuðu í FJÓRAR línur (dálk) efst til vinstri og huldu horn
 * vinnumyndarinnar og tækin þar; 📷 QR-takkinn (57) lá ofan á „Vista", 💬 og EN á tækjaræmunni og leiðbeiningunni.
 *  · Sími: flipar í EINNI línu efst sem skrunast lárétt, þysjunin í sömu línu hægra megin (36 px eins og áður).
 *    „Endurteikna" í þysjunarhópnum víkur á síma — 3D-takkinn í sýnarvalinu gerir það sama (opna3d → Festa) og
 *    „úrelt"-línan heldur sínum takka.
 *  · rymi(main): hve mikið stýringarnar taka efst (flipar + þysjun) og neðst (sýnarval) — 445 fellir vinnumyndina og
 *    383 2D-teikninguna í svæðið á milli, svo ekkert hylji hana. Aðeins sími; tölvan óbreytt.
 *  · Meðan glugginn er opinn á síma: html.fp-simi-opid felur 📷 / 💬 / EN / Aa (sama og 327 gerir á Sölu). Þeir
 *    koma aftur um leið og glugganum er lokað.
 *
 * HAMIR (22.10.2026, S26). Agnar: „Ég myndi helst vilja að kortið fengi tvöfalt pláss … helling sem yrði hægt að þjappa í
 * opnanlega valmynd“ · „maður gerir bara eitt í einu. Ná teikningu inn. Síðan næsta ham: raða inn tækjum. Og næsta ham:
 * raða inn merkingum. Kannski skipta upp í 3–4 hami.“ Á síma er nú ein lína af hömum efst yfir kortinu og aðeins það sem
 * hamurinn þarf er sýnt:
 *    Teikning — takkaraðirnar efst (sækja teikningu, skýrari veggir, finna húsið, hlaða upp …), ekkert fyrir neðan kortið
 *    Tæki     — toppurinn felldur; búnaðurinn í EINNI skrunröð + stærð tákna + tækjalistinn (tækin sem á að setja)
 *    Merki    — toppurinn felldur; merkin (+ velja hver) og stærð tákna
 *    Skoða    — allt fellt: kortið fyllir gluggann (Vinnumynd · 2D · 3D og Búnaðargreining-lagið eru á kortinu sjálfu)
 *  Hamurinn er viðmótsval símans (Vidmot per tækjaflokk, eins og aðrar símalæsingar hér) — aldrei gögn. Tölvan óbreytt.
 * ========================================================================== */
(() => {
  if (window.__teiknSimastjorn) return;
  window.__teiknSimastjorn = true;

  // 15.10.2026: símalæsingarnar búa í Vidmot per tækjaflokk (lesaTaeki/setjaTaeki, 472) — eitt gildi fyrir allar vélar; þær eru
  // eðlislægt símaval (hæðaval læst, merki læst, falin merki). Gömlu localStorage-lyklarnir fp_hd_lokad/fp_merki_lokad/fp_merki_falin
  // eru fluttir einu sinni sem upphafsgildi.
  const LS_HD = 'teikning.hdLokad', LS_MERKI = 'teikning.merkiLokad', LS_FALIN = 'teikning.merkiFalin', LS_HAM = 'teikning.ham';
  const HAMIR = [['teikn', 'Teikning'], ['taeki', 'Tæki'], ['merki', 'Merki'], ['skoda', 'Skoða']];
  try {
    if (window.Vidmot) {
      const t = '@' + Vidmot.taeki();
      Vidmot.flytja(LS_HD + t, 'fp_hd_lokad', v => (typeof v === 'boolean' ? v : undefined));
      Vidmot.flytja(LS_MERKI + t, 'fp_merki_lokad', v => (typeof v === 'boolean' ? v : undefined));
      Vidmot.flytja(LS_FALIN + t, 'fp_merki_falin', v => (Array.isArray(v) && v.length ? v : undefined));
    }
  } catch (_) {}
  // Breidd þysjunarhópsins á síma (− · 100% · + · ⤢ á 36 px, sbr. 383/445): flipalínan endar fyrir framan hann.
  const ZOOM_B = 170;
  const les = (k, d) => { try { if (!window.Vidmot) return d; const v = Vidmot.lesaTaeki(k, d); return v == null ? d : v; } catch (_) { return d; } };
  const skr = (k, v) => { try { if (window.Vidmot) Vidmot.setjaTaeki(k, v); } catch (_) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stimplar = () => (window.TeiknMerking && TeiknMerking.stimplar) || [];

  function still() {
    if (document.getElementById('t442-css')) return;
    const st = document.createElement('style'); st.id = 't442-css';
    st.textContent =
      // merkja-haus
      '#t442-haus{display:flex;align-items:center;gap:6px;margin:0 0 6px}' +
      '#t442-haus .t442-fella{flex:1 1 auto;display:flex;align-items:center;gap:6px;background:none;border:0;padding:2px 0;color:rgba(255,255,255,.55);font:700 10px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-align:left}' +
      '#t442-haus .t442-fella i{font-style:normal;font-size:12px;transition:transform .15s}' +
      '#modal-floorplan.t442-merki-lokad #t442-haus .t442-fella i{transform:rotate(-90deg)}' +
      '#t442-haus .t442-plus{flex:none;width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#f1ede4;font:700 17px/1 system-ui,sans-serif;cursor:pointer}' +
      '#t442-haus .t442-plus[aria-expanded="true"]{border-color:#c9a54a;color:#c9a54a}' +
      '#t442-val{display:none;flex-wrap:wrap;gap:5px;margin:0 0 8px;padding:8px;border-radius:10px;border:1px solid rgba(201,165,74,.35);background:rgba(201,165,74,.06)}' +
      '#t442-val.opid{display:flex}' +
      '#t442-val label{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.85);font:600 12px system-ui,sans-serif;cursor:pointer;user-select:none}' +
      '#t442-val input{accent-color:#c9a54a;width:16px;height:16px;margin:0}' +
      '#modal-floorplan.t442-virkt #fp-stimpil>.fp-stimpil-lbl{display:none}' +
      '#modal-floorplan.t442-merki-lokad #fp-stimpil,#modal-floorplan.t442-merki-lokad #fp-stimpil-staerd-wrap,#modal-floorplan.t442-merki-lokad #t442-val{display:none!important}' +
      // SÍMI: ein lág skrunröð af merkjum, sleðinn í einni línu
      '#modal-floorplan.fp-simi #fp-stimpil{flex-wrap:nowrap!important;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:5px;margin:0 0 6px;padding-bottom:2px}' +
      '#modal-floorplan.fp-simi #fp-stimpil .fp-stimpill{flex:none!important;padding:3px 8px 3px 3px;font-size:11px;white-space:nowrap}' +
      '#modal-floorplan.fp-simi #fp-stimpil .fp-stimpill-ico{width:20px!important;height:20px!important}' +
      '#modal-floorplan.fp-simi #fp-stimpil-staerd-wrap{display:flex;align-items:center;gap:8px;margin:0 0 4px;padding:0 2px;border:0!important;background:none!important}' +
      '#modal-floorplan.fp-simi #fp-stimpil-staerd-wrap .fp-stimpil-lbl{width:auto!important;margin:0!important;white-space:nowrap}' +
      '#modal-floorplan.fp-simi #fp-stimpil-staerd-wrap .fp-staerd-rod{flex:1 1 auto}' +
      // app-hamurinn (261/simi-compact-layer) blæs öll input upp í 52 px — tvöfalt auðkenni + !important
      '#modal-floorplan.fp-simi #fp-panel #fp-stimpil-staerd{height:22px!important;min-height:0!important;padding:0!important;margin:0!important;font-size:12px!important}' +
      // SÍMI: toppurinn fellanlegur
      '#t442-hd{display:none}' +
      '#modal-floorplan.fp-simi #t442-hd{display:flex;position:absolute;top:8px;right:10px;z-index:4;width:34px;height:30px;align-items:center;justify-content:center;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:#14120f;color:#f1ede4;font:700 14px system-ui,sans-serif;cursor:pointer}' +
      '#modal-floorplan.fp-simi .modal-hd{position:relative}' +
      '#modal-floorplan.fp-simi .modal-hd h2{padding-right:44px}' +
      '#modal-floorplan.fp-simi.t442-hd-lokad .modal-hd{flex-direction:row!important;align-items:center!important;padding-top:6px!important;padding-bottom:6px!important}' +
      '#modal-floorplan.fp-simi.t442-hd-lokad .modal-hd h2{flex:1 1 auto;min-width:0;padding-right:0}' +
      '#modal-floorplan.fp-simi.t442-hd-lokad .fp-hd-grp{margin-left:0!important;overflow:visible!important;padding:0!important;flex:none!important}' +
      '#modal-floorplan.fp-simi.t442-hd-lokad .fp-hd-grp>*:not(.modal-x){display:none!important}' +
      '#modal-floorplan.fp-simi.t442-hd-lokad #t442-hd{position:static;margin:0 6px 0 0;flex:none}' +
      // Fest útlit: „776 veggjastrik úr PDF-inu …"-stikan er talning sem Agnar bað um að fjarlægja og hún hylur
      // neðsta hluta teikningarinnar — á festu blaði er ekkert að greina.
      '#modal-floorplan.fp-fest #fp-hreinsa-stika{display:none!important}' +
      // SÍMI: hæðaflipar í EINNI línu efst sem skrunast lárétt — ekki dálkur yfir horni myndarinnar. Þysjunin (2D og
      // vinnumynd) í sömu línu hægra megin; flipalínan endar áður en hún byrjar.
      '#modal-floorplan.fp-simi #fp-main>#fp-haedir{left:8px!important;top:6px!important;right:auto!important;max-width:calc(100% - ' + (ZOOM_B + 22) + 'px)!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:5px!important;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x}' +
      '#modal-floorplan.fp-simi #fp-main>#fp-haedir::-webkit-scrollbar{display:none}' +
      '#modal-floorplan.fp-simi #fp-main>#fp-haedir>button{flex:none!important;white-space:nowrap!important;height:36px!important}' +
      '#modal-floorplan.fp-simi #fp-main>#fp-zoom,#modal-floorplan.fp-simi #fp-vinnusyn>#fp-vm-zoom{top:6px!important;right:8px!important;flex-wrap:nowrap!important;max-width:none!important;gap:4px!important}' +
      '#modal-floorplan.fp-simi #fp-vinnusyn>#fp-vm-zoom>.fp-vm-endur{display:none!important}' +
      // Fljótandi takkar appsins meðan Teikning-glugginn er opinn á síma: þeir lágu á „Vista", tækjaræmunni og
      // leiðbeiningunni — og „Aa" (333, síðustærð) á ⤢ þegar toppurinn er felldur. html.fp-simi-opid er sett hér að neðan (aldrei :has() á rótinni — sbr. 327).
      'html.fp-simi-opid:not(#_h) body #qr-fab:not(#_p1),html.fp-simi-opid:not(#_h) body #_ad-fab:not(#_p1),html.fp-simi-opid:not(#_h) body #_sz-aa:not(#_p1),html.fp-simi-opid:not(#_h) body #_slokk_langbtn:not(#_p1):not(#_p2):not(#_p3){display:none!important}' +
      // HAMIR (sími): ein lína efst yfir kortinu; ▴ toppsins víkur (hamurinn fellir toppinn); gæðavalið er ekki á síma (sjálfgefið Full gæði)
      '#t442-hamir{display:none}' +
      '#modal-floorplan.fp-simi #t442-hamir{display:flex;flex:none;margin:0 0 6px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.25)}' +
      '#modal-floorplan.fp-simi #t442-hamir button{flex:1 1 0;min-width:0;height:38px!important;padding:0 6px!important;margin:0!important;border:0!important;border-left:1px solid rgba(255,255,255,.18)!important;border-radius:0!important;background:#14120f!important;color:#fff!important;font:700 13px system-ui,sans-serif!important;cursor:pointer;white-space:nowrap;box-shadow:none!important}' +
      '#modal-floorplan.fp-simi #t442-hamir button:first-child{border-left:0!important}' +
      '#modal-floorplan.fp-simi #t442-hamir button[aria-pressed="true"]{background:#c9a54a!important;color:#14120f!important}' +
      '#modal-floorplan.fp-simi.t442-ham #t442-hd,#modal-floorplan.fp-simi #fp-gaedi{display:none!important}' +
      // Teikning: takkahópurinn byrjar við vinstri brún (383 sótti hann 54 px til vinstri fyrir gamla 64 px spássíu — 437 minnkaði hana í 14 og fyrsti takki klipptist) og ✕ fer upp í titillínuna í stað þess að taka heila línu
      '#modal-floorplan.fp-simi.t442-h-teikn .fp-hd-grp{margin-left:0!important;margin-top:12px}' +
      // titillinn víkur fyrir valmyndartakka appsins (#_mnav_btn, fastur 44×44 efst til vinstri) — 437 minnkaði vinstri spássíuna og takkinn lá yfir titlinum og fyrsta takka
      '#modal-floorplan.fp-simi.t442-ham .modal-hd h2{padding-left:50px}' +
      '#modal-floorplan.fp-simi.t442-h-teikn .fp-hd-grp .modal-x{position:absolute!important;top:6px;right:10px;box-shadow:none!important}' +
      // Teikning / Skoða: ekkert fyrir neðan kortið
      '#modal-floorplan.fp-simi.t442-h-teikn #fp-panel,#modal-floorplan.fp-simi.t442-h-skoda #fp-panel{display:none!important}' +
      // Tæki: búnaðurinn í einni skrunröð (eins og merkin) — merkin sjálf falin
      '#modal-floorplan.fp-simi.t442-h-taeki #t442-haus,#modal-floorplan.fp-simi.t442-h-taeki #t442-val,#modal-floorplan.fp-simi.t442-h-taeki #fp-stimpil{display:none!important}' +
      '#modal-floorplan.fp-simi.t442-h-taeki #fp-bunadur{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:5px;margin:0 0 6px;padding-bottom:2px}' +
      '#modal-floorplan.fp-simi.t442-h-taeki #fp-bunadur>.fp-stimpil-lbl{display:none}' +
      '#modal-floorplan.fp-simi.t442-h-taeki #fp-bunadur .fp-stimpill{flex:none!important;width:auto!important;padding:3px 8px 3px 3px;font-size:11px;white-space:nowrap}' +
      '#modal-floorplan.fp-simi.t442-h-taeki #fp-bunadur .fp-stimpill-ico{width:20px!important;height:20px!important}' +
      // Merki: búnaður og tækjalisti falin; merkin alltaf opin (samanbrot merkjanna er óþarft þegar hamurinn velur þau)
      '#modal-floorplan.fp-simi.t442-h-merki #fp-bunadur,#modal-floorplan.fp-simi.t442-h-merki #fp-unit-list{display:none!important}' +
      '#modal-floorplan.fp-simi.t442-ham .t442-fella{pointer-events:none}#modal-floorplan.fp-simi.t442-ham .t442-fella i{display:none}' +
      '';
    document.head.appendChild(st);
  }
  function falinStill() {
    let st = document.getElementById('t442-falin');
    if (!st) { st = document.createElement('style'); st.id = 't442-falin'; document.head.appendChild(st); }
    const f = les(LS_FALIN, []);
    const css = f.map(id => '#fp-stimpil .fp-stimpill[data-sign="' + String(id).replace(/["\\]/g, '') + '"]{display:none!important}').join('');
    if (st.textContent !== css) st.textContent = css;
  }

  function valHtml() {
    const f = les(LS_FALIN, []);
    return stimplar().map(s => '<label><input type="checkbox" data-t442="' + esc(s.id) + '"' + (f.indexOf(s.id) < 0 ? ' checked' : '') + '>' + esc(s.nafn) + '</label>').join('');
  }

  function tryggja() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.classList.contains('open')) return;
    still(); falinStill();
    m.classList.add('t442-virkt');
    // Á síma ræður hamurinn hvað er fellt (toppur felldur nema í Teikning, merkin alltaf opin); á tölvu eins og áður
    const simi = m.classList.contains('fp-simi'), ham = simi ? hamNu() : '';
    m.classList.toggle('t442-ham', simi);
    HAMIR.forEach(x => m.classList.toggle('t442-h-' + x[0], simi && ham === x[0]));
    m.classList.toggle('t442-merki-lokad', !simi && !!les(LS_MERKI, false));
    m.classList.toggle('t442-hd-lokad', simi ? ham !== 'teikn' : false);
    if (simi) tryggjaHamir(m, ham);

    // merkja-haus fyrir framan #fp-stimpil
    const rod = document.getElementById('fp-stimpil');
    if (rod && rod.parentNode) {
      let haus = document.getElementById('t442-haus');
      if (!haus) {
        haus = document.createElement('div'); haus.id = 't442-haus';
        haus.innerHTML = '<button type="button" class="t442-fella" aria-label="Fella merkin saman eða opna"><i>▾</i>Merki</button>' +
          '<button type="button" class="t442-plus" aria-expanded="false" aria-label="Velja hvaða merki eru á borðinu" title="Velja hvaða merki eru á borðinu">+</button>';
        haus.querySelector('.t442-fella').addEventListener('click', e => {
          e.preventDefault(); const lokad = !les(LS_MERKI, false); skr(LS_MERKI, lokad);
          const mm = document.getElementById('modal-floorplan'); if (mm) mm.classList.toggle('t442-merki-lokad', lokad);
          endurteikna();
        });
        haus.querySelector('.t442-plus').addEventListener('click', e => {
          e.preventDefault();
          const v = document.getElementById('t442-val'); if (!v) return;
          const opid = !v.classList.contains('opid');
          if (opid) { v.innerHTML = valHtml(); skr(LS_MERKI, false); const mm = document.getElementById('modal-floorplan'); if (mm) mm.classList.remove('t442-merki-lokad'); }
          v.classList.toggle('opid', opid); e.currentTarget.setAttribute('aria-expanded', opid ? 'true' : 'false');
          endurteikna();
        });
      }
      // 13.10.2026 (mælt: báðir hnútar færðir í HVERJU tifi): hausinn átti að standa beint á undan röðinni, en valið fer svo
      // á milli þeirra — næsta tif færði hausinn aftur, þá valið, o.s.frv. Rétta röðin er haus · val · röð.
      const valNu = document.getElementById('t442-val');
      const rett = haus.parentNode === rod.parentNode && (haus.nextSibling === rod || (valNu && haus.nextSibling === valNu && valNu.nextSibling === rod));
      if (!rett) rod.parentNode.insertBefore(haus, rod);
      let val = document.getElementById('t442-val');
      if (!val) {
        val = document.createElement('div'); val.id = 't442-val';
        val.addEventListener('change', e => {
          const inn = e.target.closest('input[data-t442]'); if (!inn) return;
          const id = inn.getAttribute('data-t442');
          const f = les(LS_FALIN, []).filter(x => x !== id);
          if (!inn.checked) f.push(id);
          skr(LS_FALIN, f); falinStill();
        });
      }
      if (val.previousSibling !== haus) haus.parentNode.insertBefore(val, haus.nextSibling);
    }

    // toppurinn (sími)
    const hd = m.querySelector('.modal-hd');
    if (hd) {
      let t = document.getElementById('t442-hd');
      if (!t) {
        t = document.createElement('button'); t.type = 'button'; t.id = 't442-hd';
        t.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          const lokad = !les(LS_HD, false); skr(LS_HD, lokad);
          const mm = document.getElementById('modal-floorplan'); if (mm) mm.classList.toggle('t442-hd-lokad', lokad);
          uppfaeraHd(); endurteikna();
        });
      }
      const grp = hd.querySelector('.fp-hd-grp');
      // Í samanbrotnu ástandi situr takkinn á undan ✕-hópnum; annars efst til hægri (absolute)
      if (t.parentNode !== hd) hd.insertBefore(t, grp || null);
      else if (grp && t.nextSibling !== grp) hd.insertBefore(t, grp);
      uppfaeraHd();
    }
    m.__t442k = m.className;
  }
  function hamNu() {
    const v = les(LS_HAM, null);
    return HAMIR.some(x => x[0] === v) ? v : 'taeki';
  }
  // Hamalínan er fyrsta barn .modal-bd (yfir kortinu). Aðeins þetta fall snertir hana — færð aðeins þegar hún er á röngum stað.
  function tryggjaHamir(m, ham) {
    const bd = m.querySelector(':scope > .modal-bd'); if (!bd) return;
    let b = document.getElementById('t442-hamir');
    if (!b) {
      b = document.createElement('div'); b.id = 't442-hamir'; b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'Hamur');
      b.innerHTML = HAMIR.map(x => '<button type="button" data-ham="' + x[0] + '" aria-pressed="false">' + x[1] + '</button>').join('');
      b.addEventListener('click', e => {
        const t = e.target.closest('button[data-ham]'); if (!t) return;
        e.preventDefault(); e.stopPropagation();
        if (hamNu() === t.dataset.ham) return;
        skr(LS_HAM, t.dataset.ham); tryggja(); endurteikna(); setTimeout(endurteikna, 300);
      });
    }
    if (b.parentNode !== bd || bd.firstElementChild !== b) bd.insertBefore(b, bd.firstChild);
    b.querySelectorAll('button[data-ham]').forEach(x => { const on = String(x.dataset.ham === ham); if (x.getAttribute('aria-pressed') !== on) x.setAttribute('aria-pressed', on); });
  }
  function uppfaeraHd() {
    const t = document.getElementById('t442-hd'); if (!t) return;
    const lokad = !!les(LS_HD, false);
    const txt = lokad ? '▾' : '▴';
    if (t.textContent !== txt) t.textContent = txt;
    t.setAttribute('aria-label', lokad ? 'Sýna takkana efst' : 'Fela takkana efst — meira pláss fyrir teikninguna');
    t.title = t.getAttribute('aria-label');
  }
  // Teikningin fær nýtt pláss: 383 les stærðina í næsta ramma — ýta á hana strax svo hún fylli rýmið.
  function endurteikna() {
    requestAnimationFrame(() => { try { window.dispatchEvent(new Event('resize')); } catch (_) {} });
  }

  /* Rými stýringanna yfir teikningunni á SÍMA, í staðbundnum px #fp-main (án CSS-zoom 333/353): `efst` = neðri brún
   * flipalínunnar / þysjunarinnar + 6, `nedst` = frá efri brún sýnarvalsins (Vinnumynd · 2D · 3D) + 6. 445 (vinnumynd)
   * og 383 (2D, „Passa") fella teikninguna á milli. Tölva: { 0, 0 } — útlitið þar óbreytt. „Úrelt"-línan og
   * leiðbeiningin teljast ekki með: þær koma og fara, og myndin má ekki hoppa við það (STÖÐUGT VIÐMÓT). */
  function rymi(main) {
    const m = document.getElementById('modal-floorplan');
    if (!main || !m || !m.classList.contains('fp-simi') || !main.offsetHeight) return { efst: 0, nedst: 0 };
    const mr = main.getBoundingClientRect(), zk = mr.height / main.offsetHeight || 1, H = main.offsetHeight;
    const synilegt = el => {
      if (!el || !el.getClientRects().length) return null;
      const cs = getComputedStyle(el);
      return cs.visibility === 'hidden' || cs.display === 'none' ? null : el.getBoundingClientRect();
    };
    let efst = 0, nedst = 0;
    ['#fp-haedir', '#fp-zoom', '#fp-vm-zoom'].forEach(s => {
      const r = synilegt(main.querySelector(s));
      if (r && r.height && (r.top - mr.top) / zk < H * 0.4) efst = Math.max(efst, (r.bottom - mr.top) / zk + 6);
    });
    const sv = synilegt(main.querySelector('#fp-synval'));
    if (sv && sv.height && (sv.bottom - mr.top) / zk > H * 0.6) nedst = Math.max(nedst, (mr.bottom - sv.top) / zk + 6);
    // Teikningin fær aldrei minna en helming hæðarinnar (mjög lágur gluggi: stýringarnar víkja þá frekar)
    if (H - efst - nedst < H * 0.5 && efst + nedst > 0) { const k = (H * 0.5) / (efst + nedst); efst *= k; nedst *= k; }
    return { efst: Math.round(efst), nedst: Math.round(nedst) };
  }

  // Fljótandi takkar appsins víkja meðan glugginn er opinn á síma (klasinn aðeins skrifaður þegar staðan breytist).
  function fljotandi() {
    const m = document.getElementById('modal-floorplan');
    const opid = !!(m && m.classList.contains('open') && m.classList.contains('fp-simi'));
    const r = document.documentElement;
    if (opid) still();
    if (r.classList.contains('fp-simi-opid') !== opid) r.classList.toggle('fp-simi-opid', opid);
  }
  let vakt = null;
  function vakaGlugga() {
    const m = document.getElementById('modal-floorplan');
    if (!m || vakt === m) return;
    // Opnun / lokun / síma-klasi gluggans → strax, ekki eftir næsta púls (annars sást 📷 hálfa sekúndu yfir „Vista")
    vakt = m;
    try { new MutationObserver(() => { fljotandi(); if (m.className !== m.__t442k) tryggja(); }).observe(m, { attributes: true, attributeFilter: ['class'] }); } catch (_) {}
  }

  // Ódýr púls á meðan glugginn er opinn (tryggja() hættir strax þegar allt er á sínum stað).
  setInterval(() => { try { vakaGlugga(); fljotandi(); tryggja(); } catch (e) { console.warn('[442]', e); } }, 500);
  window.TeiknSimastjorn = { tryggja, rymi, ham: hamNu };
})();
