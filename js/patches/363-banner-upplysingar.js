/* === BANNER-UPPLÝSINGAR — daufar línur um verið á fyrirtækjabannerinn ===
 *
 * Agnar 09.09.2026 (beiðni B5): „Mátt bæta við nokkrum daufum textalínum á
 * fyrirtækjabannerinn.. sem ég get sett helstu upplýsingar um verin.... fjöldi
 * íbúða,, fjöldi hæða,,, hringja á undan, og þannig. Þú mættir líka leita uppi
 * stólpi afsláttartölunni sem er oft inn í edit."
 *
 * Þetta eru upplýsingarnar sem tæknimaðurinn þarf ÁÐUR en hann leggur af stað
 * — hversu stórt verið er og hvort þurfi að hringja á undan — og þær áttu
 * hvergi heima. Þær fara í auða svæðið vinstra megin við ✍ Athugasemd-boxið,
 * daufar, svo þær taki ekki athyglina frá nafninu.
 *
 * ── VISTUN (harðkóðaða reglan frá 05.09.2026) ──────────────────────────────
 * Fjórar vélar vinna í sömu gögnum. Þetta lýsir STÖÐU gagna (hvernig verið er),
 * ekki útliti eins vafra, svo það VERÐUR að skrifast á þjóninn og lesast þaðan
 * — aldrei aðeins í localStorage. `fyrirtaeki` á engan dálk fyrir þetta og
 * enginn hér má keyra DDL, svo geymslan er AppSettings með sér-lykli:
 *
 *     banner_upplysingar = { "<coId>": { ibudir, haedir, hringja,
 *                                        frjalst1_merki, frjalst1, ... } }
 *
 * `AppSettings.save` sameinar á SERVERNUM (`app_settings_merge` →
 * `jsonb_deep_merge`), svo aðeins reiturinn sem breyttist fer á línuna: tvær
 * vélar mega skrifa sitt hvorn reitinn — eða sitt hvort fyrirtækið — á sömu
 * sekúndu án þess að stíga hvor á aðra. Sama mynstur og patch 153 notar fyrir
 * `arsskodun_customers`.
 *
 * VARÚÐ (mælt í patch 261 sama dag): `AppSettings.save()` er ÓSAMSTILLT og
 * `AppSettings.get()` skilar GAMLA gildinu þar til RPC-ið svarar. Endurteiknum
 * við strax eftir vistun sjáum við gamla gildið og það lítur út fyrir að
 * ekkert hafi gerst. `_ny` heldur því sem VIÐ skrifuðum síðast þar til
 * serverinn skilar sama gildi — þá er því sleppt, svo breyting af annarri vél
 * nái í gegn. Sjá `_ovNy` í js/patches/261-app-profiles.js.
 *
 * Vistað er bæði á `blur` OG debounced á `input` gegnum EITT fall, svo textinn
 * tapist ekki þótt notandinn fari beint af síðunni. Mistakist vistun er það
 * SÝNILEGT (rauð undirstrikun + titill + logProblem), aldrei þögult.
 *
 * ── AFSLÁTTARLÍNAN ─────────────────────────────────────────────────────────
 * Engin „Stólpi-afsláttartala" er til í kerfinu (Stólpi = gamla bókhaldið;
 * þaðan komu skjöl og reikningar, engir afslættir — sjá docs/STADREYNDIR.md).
 * Talan sem Agnar man eftir „inni í edit" er ÞREPASTIGINN á fyrirtækjaprófílnum:
 *
 *     💰 Tilboðsverð (113)  ›  🏷️ Afsláttarhópur (296)  ›  🎯 Sjálfvirkur % (255)
 *
 * Efsta virka þrepið ræður verðinu í Sölu. Línan hér er LESIN ÚR ÞEIM KÖSSUM
 * SJÁLFUM — nákvæmlega eins og patch 307 gerir — svo hún geti ekki rekið í
 * sundur við það sem rukkað er eftir. Séu kassarnir ekki teiknaðir enn er
 * `fyrirtaeki.afslattur_pct` úr Companies.list notað sem varaleið (sama gildi
 * og window.CtcDiscount.companyPct í patch 129 notar). Línan er LESTAKA — hún
 * er ekki ritanleg hér, breytingin á áfram heima í afsláttarkassanum.
 */
(() => {
  if (window.__bannerUpplysingarInstalled) return;
  window.__bannerUpplysingarInstalled = true;

  const LYKILL = 'banner_upplysingar';
  const HOLF = 'co-bupp';

  // Föstu línurnar sem Agnar bað um. Frjálsu línurnar tvær fá RITANLEGT merki
  // svo hann geti nefnt þær sjálfur — annars vissi hann ekki hvað færi hvar.
  const LINUR = [
    { reitur: 'ibudir',  merki: 'Fjöldi íbúða',   hint: '—' },
    { reitur: 'haedir',  merki: 'Fjöldi hæða',    hint: '—' },
    { reitur: 'hringja', merki: 'Hringja á undan', hint: 'nafn / sími' },
    { reitur: 'frjalst1', merkiReitur: 'frjalst1_merki', merkiHint: 'Merki…', hint: '—' },
    { reitur: 'frjalst2', merkiReitur: 'frjalst2_merki', merkiHint: 'Merki…', hint: '—' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Hvaða fyrirtæki er opið? Sama leið og patch 361 notar.
  function coIdNu() {
    const m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    if (m) return +m[1];
    const el = document.querySelector('#companies-main [data-co-id]');
    const v = el && +el.getAttribute('data-co-id');
    return v || null;
  }

  // ── Gögn: server + staðbundið bergmál ────────────────────────────────────
  function serverKort() {
    try {
      const o = (window.AppSettings && AppSettings.get) ? AppSettings.get(LYKILL) : null;
      return (o && typeof o === 'object') ? o : {};
    } catch (_) { return {}; }
  }
  function serverGildi(coId, reitur) {
    const f = serverKort()[String(coId)];
    const v = (f && typeof f === 'object') ? f[reitur] : '';
    return (v == null) ? '' : String(v);
  }

  // Það sem VIÐ skrifuðum síðast — gildir þar til serverinn skilar því sama.
  const _ny = new Map();                       // "coId|reitur" -> gildi
  function gildi(coId, reitur) {
    const k = coId + '|' + reitur;
    const sv = serverGildi(coId, reitur);
    if (_ny.has(k)) {
      if (_ny.get(k) === sv) _ny.delete(k);    // serverinn náði okkur
      else return _ny.get(k);
    }
    return sv;
  }

  // ── Vistun — EITT fall fyrir bæði debounce og blur ───────────────────────
  async function vista(inp) {
    const box = inp.closest('.' + HOLF);
    const coId = box && +box.dataset.co;
    const reitur = inp.dataset.reitur;
    if (!coId || !reitur) return;
    const val = inp.value.trim();
    if (inp.dataset.saved === val) return;                  // óbreytt → sleppa
    if (!window.AppSettings || !AppSettings.save) { villa(inp, 'Engar stillingar tiltækar'); return; }
    _ny.set(coId + '|' + reitur, val);                      // gildir strax, líka fyrir næstu teiknun
    const patch = {};
    patch[LYKILL] = {}; patch[LYKILL][String(coId)] = {}; patch[LYKILL][String(coId)][reitur] = val;
    let ok = false;
    try { ok = await AppSettings.save(patch); }
    catch (e) { console.warn('[363] vistun kastaði', e); ok = false; }
    if (ok) {
      inp.dataset.saved = val;
      inp.classList.remove('_villa'); inp.title = '';
      // Systkini-reitir í öðrum teiknunum sama fyrirtækis (t.d. eftir að
      // bannerinn var endurteiknaður) fá gildið líka.
      document.querySelectorAll('.' + HOLF + '[data-co="' + coId + '"] .co-bupp-reitur[data-reitur="' + reitur + '"]').forEach(o => {
        if (o === inp || document.activeElement === o) return;
        o.value = val; o.dataset.saved = val;
      });
    } else {
      villa(inp, 'Vistaðist EKKI — reyndu aftur');
    }
  }
  function villa(inp, skilabod) {
    inp.classList.add('_villa');
    inp.title = skilabod;
    try { if (window.logProblem) window.logProblem('banner_upplysingar_save_failed', 'co ' + ((inp.closest('.' + HOLF) || {}).dataset || {}).co + ' · ' + inp.dataset.reitur); } catch (_) {}
  }

  // ── Afsláttarlínan — lesin úr afsláttarkössunum (ein staðreynd) ──────────
  function afslattur(coId) {
    const main = document.getElementById('companies-main');
    const sel = main && main.querySelector('._ahop-sel');          // 296 hópur
    const inp = main && main.querySelector('._cad-inp');            // 255 %
    const cpr = main && main.querySelector('._cpr-toggle');         // 113 tilboðsverð
    let tilbod = 0;
    if (cpr) { const m = cpr.textContent.match(/Tilboðsverð\s*(\d+)/); if (m) tilbod = +m[1]; }
    const hopur = (sel && sel.value) ? (((sel.options[sel.selectedIndex] || {}).text) || '') : '';
    // Kassinn er sannleikurinn þegar hann er teiknaður; annars fyrirtækjaröðin
    // (sama gildi og patch 129 sækir í window.CtcDiscount.companyPct).
    let pct;
    if (inp) pct = parseFloat(inp.value) || 0;
    else {
      const c = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
      pct = c ? Math.max(0, Math.min(100, Number(c.afslattur_pct) || 0)) : 0;
    }
    // „—" má ALDREI standa eitt sér þegar hærra þrep er virkt: Center Hotels-
    // félögin eru öll með 0% í sjálfvirka reitnum en fá samningsprósentur úr
    // hópnum, svo „—" hefði sagt „enginn afsláttur" um kúnna sem er með 32%.
    let texti;
    if (pct > 0) texti = pct + '%' + (tilbod > 0 ? ' · tilboðsverð' : (hopur ? ' · hópur' : ''));
    else if (hopur) texti = 'hópur: ' + hopur + (tilbod > 0 ? ' · tilboðsverð' : '');
    else if (tilbod > 0) texti = 'tilboðsverð (' + tilbod + ')';
    else texti = '—';
    const titill = 'Sjálfvirkur afsláttur af öllu: ' + (pct > 0 ? pct + '%' : 'enginn') +
      (hopur ? ' · Afsláttarhópur: ' + hopur : '') +
      (tilbod > 0 ? ' · Tilboðsverð: ' + tilbod + ' vörur' : '') +
      ' — efsta virka þrepið ræður verðinu í Sölu. Breytt í 💸 Afslættir & verð neðar á síðunni.';
    return { texti, titill };
  }

  // ── Stílar: DAUFT — hvítur texti með lágri ógegnsæi, þunn undirstrikun.
  // Sama hugsun og .rf-plannote (patch 175), bara á dökkum grunni. Enginn
  // rammi, enginn kassi — þetta má ekki keppa við nafnið.
  //
  // 2026-09-09, MÆLT Á LIFANDI SÍÐU: fyrsta útgáfan varð að HVÍTUM KÖSSUM með
  // svörtum texta — ósýnilegum á dökkum bannernum. Þemalagið stimplar
  //   html[data-thm-preset="brunastal"] .view input:not(...):not(...):not(...)
  //   { background:#eef1f6!important;border:...!important;color:#141822!important }
  // sem er (0,5,2) MEÐ !important, svo hógvært `.co-bupp .co-bupp-reitur` átti
  // aldrei séns (sama gildra og skráð er í minnisbókinni: „!important eitt og
  // sér tapar fyrir compact-lögunum"). Þess vegna eru reita-reglurnar hér
  // skrifaðar með UPPBLÁSNU vægi: annars vegar með auðkenninu #companies-main
  // (1,x,y) og hins vegar með langri klasakeðju fyrir hvern þann stað þar sem
  // bannerinn kynni að standa utan þess. Breytir engu öðru en OKKAR reitum.
  function stilar() {
    if (document.getElementById('_bupp-css')) return;
    // Tvær forskeytis-leiðir að sömu reglunum — báðar þyngri en þemalagið.
    const P = ['html body #companies-main .' + HOLF + ' ',
               'html[data-thm-preset] body .view .co-banner .' + HOLF + ' '];
    const R = (endir, css) => P.map(p => p + endir + '{' + css + '}').join('\n      ');
    const s = document.createElement('style');
    s.id = '_bupp-css';
    s.textContent = `
      .${HOLF}{display:flex;flex-direction:column;gap:2px;margin-left:auto;min-width:0;flex:0 1 300px;align-self:flex-start;padding-top:2px}
      ${R('._bupp-lina', 'display:flex;align-items:center;gap:8px;min-width:0')}
      ${R('._bupp-merki', 'flex:none;width:96px;text-align:right;font-size:10.5px;line-height:1.5;color:rgba(255,255,255,.45)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}
      ${R('input.co-bupp-reitur', 'flex:1 1 auto;min-width:0;height:19px;background:transparent!important;background-color:transparent!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.20)!important;border-radius:0!important;box-shadow:none!important;color:rgba(255,255,255,.85)!important;font:inherit;font-size:11.5px;line-height:19px;padding:0 2px;margin:0;box-sizing:border-box;outline:none;overflow:hidden;text-overflow:ellipsis')}
      ${R('input.co-bupp-reitur::placeholder', 'color:rgba(255,255,255,.28)!important;opacity:1')}
      ${R('input.co-bupp-reitur:hover', 'border-bottom-color:rgba(255,255,255,.45)!important')}
      ${R('input.co-bupp-reitur:focus', 'border-bottom-color:rgba(255,255,255,.9)!important;color:#fff!important;background:rgba(255,255,255,.06)!important')}
      ${R('input._bupp-merki-inp', 'flex:none;width:96px;text-align:right;font-size:10.5px;color:rgba(255,255,255,.45)!important;border-bottom-color:rgba(255,255,255,.12)!important')}
      /* Vistun mistókst — SÝNILEGT, ekki þögult. Þetta er klasi en ekki inline
         stíll af því að reglurnar hér að ofan bera !important og myndu annars
         éta inline-rauða litinn (mælt á lifandi síðu 09.09.2026). Stendur EFTIR
         :focus-reglunni svo hún hverfi ekki meðan reiturinn er í fókus. */
      ${R('input.co-bupp-reitur._villa', 'border-bottom-color:#f87171!important;color:#fecaca!important')}
      ${R('input.co-bupp-reitur._villa:focus', 'border-bottom-color:#ef4444!important;color:#fee2e2!important;background:rgba(220,38,38,.14)!important')}
      ${R('input._bupp-merki-inp::placeholder', 'color:rgba(255,255,255,.25)!important;opacity:1')}
      ${R('._bupp-afsl', 'flex:1 1 auto;min-width:0;font-size:11.5px;line-height:19px;color:rgba(255,255,255,.62)!important;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}
      /* Sími/app: bannerinn staflast, línurnar taka fulla breidd. 16px letur
         svo iOS þysji ekki inn þegar smellt er í reit. */
      @media (max-width:760px){
        .${HOLF}{flex-basis:100%;margin-left:0;margin-top:10px}
      }
      html[data-viewmode="mobile"] .${HOLF},body.appmode .${HOLF}{flex-basis:100%;margin-left:0;margin-top:10px}
      ${R('input.co-bupp-reitur._simi', 'font-size:16px;height:24px;line-height:24px')}
    `;
    (document.head || document.documentElement).appendChild(s);
  }
  // Símahamur: 16px letur á reitina (annars þysjar iOS inn við fókus). Sett sem
  // klasi fremur en sér-regla svo uppblásna vægið gildi líka þar.
  function simiHamur() {
    try {
      return document.documentElement.getAttribute('data-viewmode') === 'mobile' ||
        (document.body && document.body.classList.contains('appmode'));
    } catch (_) { return false; }
  }

  // ── Teiknun ──────────────────────────────────────────────────────────────
  function teikna(box, coId) {
    const a = afslattur(coId);
    box.innerHTML =
      LINUR.map(l => {
        const v = esc(gildi(coId, l.reitur));
        const merki = l.merkiReitur
          ? '<input class="co-bupp-reitur _bupp-merki-inp" data-reitur="' + l.merkiReitur + '" maxlength="22" ' +
            'value="' + esc(gildi(coId, l.merkiReitur)) + '" placeholder="' + esc(l.merkiHint) + '" ' +
            'title="Merki línunnar — þú ræður hvað fer hér">'
          : '<span class="_bupp-merki" title="' + esc(l.merki) + '">' + esc(l.merki) + '</span>';
        return '<div class="_bupp-lina">' + merki +
          '<input class="co-bupp-reitur" data-reitur="' + l.reitur + '" maxlength="80" ' +
          'value="' + v + '" placeholder="' + esc(l.hint) + '" ' +
          'title="' + esc(l.merki || 'Frjáls lína') + ' — vistast strax"></div>';
      }).join('') +
      '<div class="_bupp-lina">' +
        '<span class="_bupp-merki">Afsláttur</span>' +
        '<span class="_bupp-afsl" title="' + esc(a.titill) + '">' + esc(a.texti) + '</span>' +
      '</div>';

    box.querySelectorAll('.co-bupp-reitur').forEach(inp => {
      inp.dataset.saved = inp.value;
      if (simiHamur()) inp.classList.add('_simi');
      // Smellur/lyklar mega ekki leka upp í bannerinn (djúptengingar og
      // fella-saman-hegðun annarra patcha hlusta þar).
      inp.addEventListener('click', e => e.stopPropagation());
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
      inp.addEventListener('input', () => {
        inp.classList.remove('_villa'); inp.title = '';
        clearTimeout(inp._t); inp._t = setTimeout(() => vista(inp), 500);
      });
      inp.addEventListener('blur', () => { clearTimeout(inp._t); vista(inp); });
    });
  }

  // Uppfæra gildi sem komu að utan (önnur vél / AppSettings hlóðst) án þess að
  // sópa burt því sem notandinn er að skrifa: aldrei snerta reit í fókus og
  // aldrei reit sem á óvistaða breytingu.
  function samstilla(box, coId) {
    const simi = simiHamur();
    box.querySelectorAll('.co-bupp-reitur').forEach(inp => {
      inp.classList.toggle('_simi', simi);          // hamur má skipta án endurteiknunar
      if (document.activeElement === inp) return;
      if (inp.value !== inp.dataset.saved) return;          // óvistuð breyting bíður
      const v = gildi(coId, inp.dataset.reitur);
      if (inp.value !== v) { inp.value = v; inp.dataset.saved = v; }
    });
    const afsl = box.querySelector('._bupp-afsl');
    if (afsl) {
      const a = afslattur(coId);
      if (afsl.textContent !== a.texti) afsl.textContent = a.texti;
      if (afsl.title !== a.titill) afsl.title = a.titill;
    }
  }

  function haldaVid() {
    const banner = document.querySelector('#companies-main .co-banner') || document.querySelector('.co-banner');
    if (!banner) return;
    const coId = coIdNu();
    if (!coId) return;
    stilar();
    let box = banner.querySelector('.' + HOLF);
    if (box && +box.dataset.co === coId) { samstilla(box, coId); return; }
    if (box) box.remove();
    box = document.createElement('div');
    box.className = HOLF;
    box.dataset.co = String(coId);
    teikna(box, coId);
    // Vinstra megin við ✍ Athugasemd-boxið — í auða svæðið sem Agnar merkti.
    const haegri = banner.querySelector('.co-banner-right');
    if (haegri) banner.insertBefore(box, haegri); else banner.appendChild(box);
  }

  setInterval(haldaVid, 1200);
  document.addEventListener('DOMContentLoaded', haldaVid);
  haldaVid();

  window.BannerUpplysingar = { haldaVid, gildi, LYKILL };
  console.log('[patch-363] 🏢 Banner-upplýsingar — íbúðir/hæðir/hringja + afsláttarlína');
})();
