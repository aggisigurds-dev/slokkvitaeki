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
 *
 * ── v2 12.09.2026: AÐKOMUSKRÁ (Agnar) ──────────────────────────────────────
 * „Hvort tæki séu í sameign eða inn í herbergjum. Erum oft ekki viss hvort það
 * þurfi á stöðunum að hringja fyrst og bóka tíma. Eða koma á ákveðnum tíma til
 * að fara inn í hótelherbergin. Eða hvort við bara mætum. Fjöldi hæða og annað."
 *
 * Mælt sama dag: úttektarskýrslurnar geyma ekkert af þessu (0 af 8 stærstu —
 * aðeins fjöldi per tegund og frjáls texti), uttaeki.location ber staðsetningu
 * innan húss í 32 röðum af 5.686, og ~34 staðir hafa brot af þessu í
 * `athugasemdir`. Þetta er því skráð HÉR, einu sinni á hvern stað.
 *
 * Reitirnir heita það SAMA og í tilboðstólinu (brunaholf/public/tilbod: stiga,
 * ibudir, haedir, jardhaed, kjallari — 'yes' = já) svo ein skráning á húsinu
 * nýtist þar líka síðar. Nýir lyklar í sama `banner_upplysingar[coId]`:
 *     stiga, herbergi, jardhaed ('yes'|''), kjallari ('yes'|''),
 *     stadsetning ('sameign'|'inni'|'blandad'|''),
 *     adkoma ('maeta'|'hringja_boka'|'fastur_timi'|''), adkoma_ath
 * `ibudir`, `haedir` og `hringja` halda lyklunum sínum; `hringja` heitir nú
 * „Tengiliður" í viðmótinu (sama gildi).
 *
 * TILLÖGUR: það sem finnst í athugasemdum staðarins („51 íbúð", „~40 herbergi",
 * „14 stigagöngum", „Betra að hringja á undan", „slökkvitæki í sameign",
 * „hringja í 8623425") birtist sem gul flís með brotalínu í línunni „Tillaga"
 * — ALDREI vistað sjálfkrafa; smellur = nota. Aðgangskóðar eru ekki lagðir til:
 * þeir standa þegar í ✍ athugasemdaboxinu (banner_note).
 */
(() => {
  if (window.__bannerUpplysingarInstalled) return;
  window.__bannerUpplysingarInstalled = true;

  const LYKILL = 'banner_upplysingar';
  const HOLF = 'co-bupp';

  // Talnalínur og flísar (v2). Sömu lyklar og tilboðstólið.
  const TOLUR = [
    { merki: 'Hús',
      reitir: [{ reitur: 'haedir', eining: 'hæðir', titill: 'Hæðir ofan jarðar' }],
      flisar: [
        { reitur: 'jardhaed', gildi: 'yes', merki: 'jarðhæð', titill: 'Jarðhæð með tækjum' },
        { reitur: 'kjallari', gildi: 'yes', merki: 'kjallari', titill: 'Kjallari með sameign — geymslur, þvottahús eða sorpgeymsla' }
      ] },
    { merki: 'Einingar',
      reitir: [
        { reitur: 'stiga',    eining: 'stigag.', titill: 'Fjöldi stigaganga' },
        { reitur: 'ibudir',   eining: 'íb.',     titill: 'Fjöldi íbúða' },
        { reitur: 'herbergi', eining: 'herb.',   titill: 'Fjöldi herbergja (hótel, gisting)' }
      ] }
  ];
  const VALLINUR = [
    { merki: 'Tæki', flisar: [
      { reitur: 'stadsetning', gildi: 'sameign', merki: 'Sameign',      titill: 'Tækin eru í sameign — stigagangar, gangar, kjallari' },
      { reitur: 'stadsetning', gildi: 'inni',    merki: 'Inni í rýmum', titill: 'Tækin eru inni í íbúðum, herbergjum eða skrifstofum — þarf aðgang' },
      { reitur: 'stadsetning', gildi: 'blandad', merki: 'Bæði',         titill: 'Bæði í sameign og inni í rýmum' }
    ] },
    { merki: 'Aðkoma', flisar: [
      { reitur: 'adkoma', gildi: 'maeta',        merki: 'Mæta',        titill: 'Má bara mæta' },
      { reitur: 'adkoma', gildi: 'hringja_boka', merki: 'Bóka tíma',   titill: 'Hringja fyrst og bóka tíma' },
      { reitur: 'adkoma', gildi: 'fastur_timi',  merki: 'Fastur tími', titill: 'Koma á ákveðnum tíma (t.d. hótelherbergi) — skrifaðu tímann í „Aðkoma nánar"' }
    ] }
  ];
  // Textalínur. Frjálsu línurnar tvær fá RITANLEGT merki svo Agnar geti nefnt
  // þær sjálfur — annars vissi hann ekki hvað færi hvar.
  const LINUR_ADKOMA = [
    { reitur: 'hringja',    merki: 'Tengiliður',   hint: 'nafn / sími' },
    { reitur: 'adkoma_ath', merki: 'Aðkoma nánar', hint: 't.d. herbergi kl. 11–14' }
  ];
  const LINUR_FRJALS = [
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

  // ── Tillögur úr athugasemdum — sýndar, ALDREI vistaðar sjálfkrafa ────────
  function tillogur(coId) {
    let texti = '';
    try {
      const c = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
      if (c) texti = String(c.athugasemdir || '') + '\n' + String(c.banner_note || '');
    } catch (_) {}
    if (!texti.trim()) return [];
    const ut = [];
    const heimild = m => {
      const i = Math.max(0, m.index - 25);
      return '„…' + texti.slice(i, m.index + m[0].length + 25).replace(/\s+/g, ' ').trim() + '…"';
    };
    const baeta = (reitur, g, merki, m) => {
      if (gildi(coId, reitur)) return;                       // þegar skráð → engin tillaga
      if (ut.some(t => t.reitur === reitur)) return;
      ut.push({ reitur, gildi: g, merki, heimild: heimild(m) });
    };
    let m;
    if ((m = /(\d{1,3})\s*íbúð/i.exec(texti))) baeta('ibudir', m[1], m[1] + ' íb.', m);
    if ((m = /(\d{1,3})\s*herberg/i.exec(texti))) baeta('herbergi', m[1], m[1] + ' herb.', m);
    if ((m = /(\d{1,2})\s*stigag[aö]ng/i.exec(texti))) baeta('stiga', m[1], m[1] + ' stigag.', m);
    if ((m = /(\d{1,2})\s*hæð(?:a|ir)\b/i.exec(texti))) baeta('haedir', m[1], m[1] + ' hæðir', m);
    if ((m = /hringja\s+(?:á\s+undan|fyrst)|bóka\s+tíma|panta\s+tíma/i.exec(texti))) baeta('adkoma', 'hringja_boka', 'Bóka tíma', m);
    if ((m = /hringja\s+í\s+(\d{3}[\s-]?\d{4})/i.exec(texti))) baeta('hringja', m[1], 'sími ' + m[1], m);
    // Hótel/gisting nefna herbergi — þá er „í sameign" aðeins hluti myndarinnar.
    if (!/herberg/i.test(texti) && (m = /(?:tæki|slökkvitæki|reykskynjar\w*|slöngur)\s+í\s+sameign/i.exec(texti))) {
      baeta('stadsetning', 'sameign', 'Sameign', m);
    }
    return ut;
  }

  // ── Vistun — EITT fall fyrir reiti og flísar ─────────────────────────────
  async function vistaReit(coId, reitur, val) {
    _ny.set(coId + '|' + reitur, val);                       // gildir strax, líka fyrir næstu teiknun
    const patch = {};
    patch[LYKILL] = {}; patch[LYKILL][String(coId)] = {}; patch[LYKILL][String(coId)][reitur] = val;
    try { return !!(await AppSettings.save(patch)); }
    catch (e) { console.warn('[363] vistun kastaði', e); return false; }
  }
  async function vista(inp) {
    const box = inp.closest('.' + HOLF);
    const coId = box && +box.dataset.co;
    const reitur = inp.dataset.reitur;
    if (!coId || !reitur) return;
    const val = inp.value.trim();
    if (inp.dataset.saved === val) return;                  // óbreytt → sleppa
    if (!window.AppSettings || !AppSettings.save) { villa(inp, 'Engar stillingar tiltækar'); return; }
    const ok = await vistaReit(coId, reitur, val);
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
    uppfaeraTomt(box, coId);
  }
  function skraVillu(coId, reitur) {
    try { if (window.logProblem) window.logProblem('banner_upplysingar_save_failed', 'co ' + coId + ' · ' + reitur); } catch (_) {}
  }
  function villa(inp, skilabod) {
    inp.classList.add('_villa');
    inp.title = skilabod;
    skraVillu(((inp.closest('.' + HOLF) || {}).dataset || {}).co, inp.dataset.reitur);
  }

  // ── Flísar ───────────────────────────────────────────────────────────────
  function flisHtml(coId, f, till) {
    const on = !till && gildi(coId, f.reitur) === f.gildi;
    const titill = till ? 'Tillaga úr athugasemd: ' + f.heimild + ' — smelltu til að nota' : f.titill;
    return '<button type="button" class="_bupp-flis' + (on ? ' _on' : '') + (till ? ' _till' : '') + '"' +
      ' data-reitur="' + esc(f.reitur) + '" data-gildi="' + esc(f.gildi) + '" data-titill="' + esc(titill) + '"' +
      ' aria-pressed="' + (on ? 'true' : 'false') + '" title="' + esc(titill) + '">' + esc(f.merki) + '</button>';
  }
  function merkjaFlisar(box, coId) {
    box.querySelectorAll('._bupp-flis:not(._till)').forEach(b => {
      const on = gildi(coId, b.dataset.reitur) === b.dataset.gildi;
      if (b.classList.contains('_on') !== on) b.classList.toggle('_on', on);
      const aria = on ? 'true' : 'false';
      if (b.getAttribute('aria-pressed') !== aria) b.setAttribute('aria-pressed', aria);
    });
  }
  async function smellaFlis(btn) {
    const box = btn.closest('.' + HOLF);
    const coId = box && +box.dataset.co;
    const reitur = btn.dataset.reitur, g = btn.dataset.gildi;
    if (!coId || !reitur) return;
    const till = btn.classList.contains('_till');
    if (!window.AppSettings || !AppSettings.save) {
      btn.classList.add('_villa'); btn.title = 'Engar stillingar tiltækar'; skraVillu(coId, reitur);
      return;
    }
    if (till) {
      // Tillaga fer í sinn eigin reit — sama vistunarleið og þegar skrifað er.
      const inp = box.querySelector('input.co-bupp-reitur[data-reitur="' + reitur + '"]');
      btn.remove();
      const tl = box.querySelector('._bupp-till-lina');
      if (tl && !tl.querySelector('._bupp-flis')) tl.remove();
      if (inp) { inp.value = g; inp.classList.remove('_villa'); await vista(inp); return; }
    }
    const nytt = till ? g : (gildi(coId, reitur) === g ? '' : g);   // smellur á valda flís = afvelja
    const bid = vistaReit(coId, reitur, nytt);                       // _ny sett samstundis
    merkjaFlisar(box, coId);
    const ok = await bid;
    box.querySelectorAll('._bupp-flis[data-reitur="' + reitur + '"]').forEach(b => {
      b.classList.toggle('_villa', !ok);
      b.title = ok ? (b.dataset.titill || '') : 'Vistaðist EKKI — smelltu aftur';
    });
    if (!ok) skraVillu(coId, reitur);
    uppfaeraTomt(box, coId);
  }

  // Lína telst auð þegar enginn reitanna hennar (`data-reitir`) ber gildi.
  function uppfaeraTomt(box, coId) {
    if (!box) return;
    box.querySelectorAll('._bupp-lina[data-reitir]').forEach(l => {
      const tomt = l.dataset.reitir.split(',').every(r => !gildi(coId, r));
      if (l.classList.contains('_bupp-tomt') !== tomt) l.classList.toggle('_bupp-tomt', tomt);
    });
  }

  // ── Afsláttarlínan — lesin úr afsláttarkössunum (ein staðreynd) ──────────
  function afslattur(coId) {
    const main = document.getElementById('companies-main');
    // Kassarnir þrír bera `data-co-id`. Þeir mega ALDREI lesast fyrir annað
    // félag en það sem bannerinn sýnir — meðan skipt er um fyrirtæki stendur
    // gamli kassinn augnablik eftir, og þá hefði 15% frá fyrri kúnna birst á
    // þeim næsta. Beri kaflinn annað auðkenni skilum við engu og föllum á
    // fyrirtækjaröðina í staðinn.
    const urKafla = (kafli, innri) => {
      if (!main) return null;
      const rettur = main.querySelector(kafli + '[data-co-id="' + coId + '"]');
      if (rettur) return rettur.querySelector(innri);
      const annar = main.querySelector(kafli);
      if (annar && annar.getAttribute('data-co-id')) return null;   // tilheyrir ÖÐRU félagi
      return main.querySelector(innri);                             // ómerktur kafli (eldra snið)
    };
    const sel = urKafla('._ahop-section', '._ahop-sel');            // 296 hópur
    const inp = urKafla('._cad-section', '._cad-inp');              // 255 %
    const cpr = urKafla('._cpr-section', '._cpr-toggle');           // 113 tilboðsverð
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
    return { texti, titill, pct, hopur, tilbod };
  }

  // 2026-09-09, LEIÐRÉTTING: fyrsta yfirferð sagði „enginn Stólpa-afsláttur er
  // til" af því leitað var að töflu eða dálki. Agnar benti á að hann kemur
  // „oftast undir sem svona Áminning (Stolpi)" — og það er rétt: 52 virk félög
  // bera slíka línu í `athugasemdir`, 30 þeirra með prósentu. 23 stemma við
  // `afslattur_pct` (einhver hefur flutt þær yfir), 7 ekki. Textinn er líka
  // OFT AFMARKAÐUR („30% af vöru", „50% af Co2") meðan afslattur_pct er flatur
  // á allt — þess vegna má hann ekki afritast sjálfkrafa; hann er sýndur.
  function stolpi(coId) {
    let ath = null;
    try {
      const c = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
      ath = c ? c.athugasemdir : null;
    } catch (_) {}
    const m = String(ath || '').match(/Áminning\s*\(Stolpi\)\s*:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
    if (!m) return null;
    const texti = m[1].trim().replace(/\s*\n\s*/g, ' · ');
    const pm = texti.match(/(\d{1,2})\s*%/);
    return { texti, pct: pm ? +pm[1] : null };
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
  // v2: flísarnar eru takkar, og þemabrúin (229) stimplar líka `.view button`
  // — því bera flísareglurnar sama uppblásna vægi og !important.
  function stilar() {
    if (document.getElementById('_bupp-css')) return;
    // Tvær forskeytis-leiðir að sömu reglunum — báðar þyngri en þemalagið.
    const P = ['html body #companies-main .' + HOLF + ' ',
               'html[data-thm-preset] body .view .co-banner .' + HOLF + ' '];
    const R = (endir, css) => P.map(p => p + endir + '{' + css + '}').join('\n      ');
    // Sama vægi, en klasinn límdur á .co-bupp sjálft (ekkert bil).
    const RB = (endir, css) => P.map(p => p.slice(0, -1) + endir + '{' + css + '}').join('\n      ');
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
      /* Gult, ekki rautt — þetta er ábending um ósamræmi, ekki bilun. Bundið
         við BÁÐA klasana svo það slái ._bupp-afsl út (jafnt vægi tapar fyrir
         þeirri sem stendur síðar — mælt á lifandi síðu). */
      ${R('._bupp-afsl._bupp-misr', 'color:#fcd34d!important')}
      /* v2 — talnareitir með einingu og flísar (hús, tæki, aðkoma, tillögur). */
      ${R('._bupp-innri', 'display:flex;flex-wrap:wrap;align-items:center;gap:3px 6px;flex:1 1 auto;min-width:0')}
      ${R('._bupp-talapar', 'display:inline-flex;align-items:baseline;gap:3px')}
      ${R('input.co-bupp-reitur._bupp-tala', 'flex:none;width:30px;text-align:right;padding:0 3px')}
      ${R('._bupp-eining', 'font-size:10.5px;color:rgba(255,255,255,.45)!important;white-space:nowrap')}
      ${R('button._bupp-flis', 'display:inline-flex;align-items:center;height:18px!important;min-height:0!important;min-width:0!important;width:auto!important;margin:0!important;padding:0 7px!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:9px!important;background:transparent!important;background-color:transparent!important;box-shadow:none!important;color:rgba(255,255,255,.55)!important;font:inherit;font-size:10.5px!important;font-weight:400!important;line-height:16px!important;letter-spacing:normal!important;text-transform:none!important;white-space:nowrap;cursor:pointer')}
      ${R('button._bupp-flis:hover', 'border-color:rgba(255,255,255,.5)!important;color:rgba(255,255,255,.85)!important')}
      ${R('button._bupp-flis:focus-visible', 'outline:1px solid rgba(255,255,255,.8)!important;outline-offset:1px')}
      ${R('button._bupp-flis._on', 'background:rgba(255,255,255,.18)!important;background-color:rgba(255,255,255,.18)!important;border-color:rgba(255,255,255,.75)!important;color:#fff!important')}
      ${R('button._bupp-flis._till', 'border-style:dashed!important;border-color:rgba(252,211,77,.6)!important;color:#fcd34d!important')}
      ${R('button._bupp-flis._villa', 'border-color:#f87171!important;color:#fecaca!important')}
      /* Sími/app: bannerinn staflast, línurnar taka fulla breidd. 16px letur
         svo iOS þysji ekki inn þegar smellt er í reit. */
      @media (max-width:760px){
        .${HOLF}{flex-basis:100%;margin-left:0;margin-top:10px}
      }
      html[data-viewmode="mobile"] .${HOLF},body.appmode .${HOLF}{flex-basis:100%;margin-left:0;margin-top:10px}
      /* Hæðin kemur frá símalaginu (min-height 44px snertiflötur, mælt 48px) —
         við setjum aðeins leturstærðina svo iOS þysji ekki inn. */
      ${R('input.co-bupp-reitur._simi', 'font-size:16px')}
      ${RB('._bupp-simi input.co-bupp-reitur._bupp-tala', 'width:44px')}
      ${RB('._bupp-simi button._bupp-flis', 'height:32px!important;line-height:30px!important;font-size:13px!important;padding:0 12px!important;border-radius:16px!important')}
      /* MÆLT 09.09.2026: sex línur bæta 271 px við bannerinn í símaham —
         nær þrefalda hæð hans — og oftast eru þær AUÐAR. Agnar bað um daufar
         línur, ekki 271 px af tómum merkimiðum ofan á hverju félagi í símanum.
         Þar sýnum við því aðeins línur sem BERA eitthvað (auk afsláttarins);
         víxl-takkinn opnar hinar þegar á að skrifa. Á tölvuskjá er nóg pláss
         og allt sést. Þetta er útlitsval eins vafra → localStorage má. */
      ${RB('._bupp-simi._bupp-thjappad ._bupp-lina._bupp-tomt', 'display:none')}
      ${R('._bupp-vixl', 'display:none')}
      ${RB('._bupp-simi ._bupp-vixl', 'display:block')}
      ${R('._bupp-vixl', 'align-self:flex-start;margin-top:3px;padding:2px 0;background:none;border:0;font:inherit;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;text-decoration:underline;text-underline-offset:3px')}
      ${R('._bupp-vixl:hover', 'color:rgba(255,255,255,.8)')}
    `;
    (document.head || document.documentElement).appendChild(s);
  }
  // Símahamur: 16px letur á reitina (annars þysjar iOS inn við fókus). Sett sem
  // klasi fremur en sér-regla svo uppblásna vægið gildi líka þar.
  const OPID_LYKILL = 'bupp_opid';
  function opid() { try { return localStorage.getItem(OPID_LYKILL) === '1'; } catch (_) { return false; } }
  function setjaOpid(v) { try { localStorage.setItem(OPID_LYKILL, v ? '1' : '0'); } catch (_) {} }
  function simiHamur() {
    try {
      return document.documentElement.getAttribute('data-viewmode') === 'mobile' ||
        (document.body && document.body.classList.contains('appmode'));
    } catch (_) { return false; }
  }

  // ── Teiknun ──────────────────────────────────────────────────────────────
  function linaHtml(merki, reitir, innihald, aukaKlasi) {
    return '<div class="_bupp-lina' + (aukaKlasi ? ' ' + aukaKlasi : '') + '"' +
      (reitir ? ' data-reitir="' + esc(reitir.join(',')) + '"' : '') + '>' +
      '<span class="_bupp-merki" title="' + esc(merki) + '">' + esc(merki) + '</span>' +
      '<span class="_bupp-innri">' + innihald + '</span></div>';
  }
  function talaHtml(coId, r) {
    return '<span class="_bupp-talapar">' +
      '<input class="co-bupp-reitur _bupp-tala" data-reitur="' + r.reitur + '" inputmode="numeric" maxlength="6" ' +
      'value="' + esc(gildi(coId, r.reitur)) + '" placeholder="–" title="' + esc(r.titill) + ' — vistast strax">' +
      '<span class="_bupp-eining">' + esc(r.eining) + '</span></span>';
  }
  function textalinaHtml(coId, l) {
    const v = esc(gildi(coId, l.reitur));
    const merki = l.merkiReitur
      ? '<input class="co-bupp-reitur _bupp-merki-inp" data-reitur="' + l.merkiReitur + '" maxlength="22" ' +
        'value="' + esc(gildi(coId, l.merkiReitur)) + '" placeholder="' + esc(l.merkiHint) + '" ' +
        'title="Merki línunnar — þú ræður hvað fer hér">'
      : '<span class="_bupp-merki" title="' + esc(l.merki) + '">' + esc(l.merki) + '</span>';
    return '<div class="_bupp-lina" data-reitir="' + esc(l.reitur) + '">' + merki +
      '<input class="co-bupp-reitur" data-reitur="' + l.reitur + '" maxlength="80" ' +
      'value="' + v + '" placeholder="' + esc(l.hint) + '" ' +
      'title="' + esc(l.merki || 'Frjáls lína') + ' — vistast strax"></div>';
  }

  function teikna(box, coId) {
    const a = afslattur(coId);
    const st = stolpi(coId);
    // ⚠ aðeins þegar áminningin nefnir prósentu SEM ER ÖNNUR en sú virka og
    // ekkert hærra þrep skýrir muninn (Center Hotels bera 0% í reitnum en fá
    // sínar prósentur úr hópnum — það er ekki misræmi, bara önnur geymsla).
    const stMisr = !!(st && st.pct != null && !a.hopur && st.pct !== a.pct);
    const stTitill = 'Áminning úr Stólpa (gamla bókhaldinu), geymd í athugasemdum: ' + (st ? st.texti : '') +
      (stMisr ? ' — ATH: áminningin segir ' + st.pct + '% en virki afslátturinn er ' +
        (a.pct > 0 ? a.pct + '%' : 'enginn') + '. Textinn er oft afmarkaður við ákveðna vöru, svo hann er sýndur en aldrei afritaður sjálfkrafa.' : '');
    const till = tillogur(coId);
    box.dataset.tillSig = till.map(t => t.reitur + '=' + t.gildi).join('|');
    box.innerHTML =
      TOLUR.map(t => linaHtml(t.merki,
        t.reitir.map(r => r.reitur).concat((t.flisar || []).map(f => f.reitur)),
        t.reitir.map(r => talaHtml(coId, r)).join('') + (t.flisar || []).map(f => flisHtml(coId, f)).join(''))).join('') +
      VALLINUR.map(v => linaHtml(v.merki, [v.flisar[0].reitur], v.flisar.map(f => flisHtml(coId, f)).join(''))).join('') +
      LINUR_ADKOMA.map(l => textalinaHtml(coId, l)).join('') +
      (till.length ? linaHtml('Tillaga', null, till.map(f => flisHtml(coId, f, true)).join(''), '_bupp-till-lina') : '') +
      LINUR_FRJALS.map(l => textalinaHtml(coId, l)).join('') +
      '<div class="_bupp-lina">' +
        '<span class="_bupp-merki">Afsláttur</span>' +
        '<span class="_bupp-afsl" title="' + esc(a.titill) + '">' + esc(a.texti) + '</span>' +
      '</div>' +
      (st
        ? '<div class="_bupp-lina">' +
            '<span class="_bupp-merki">📌 Stólpi</span>' +
            '<span class="_bupp-afsl' + (stMisr ? ' _bupp-misr' : '') + '" title="' + esc(stTitill) + '">' +
              (stMisr ? '⚠ ' : '') + esc(st.texti) + '</span>' +
          '</div>'
        : '') +
      '<button type="button" class="_bupp-vixl">' + (opid() ? '− Fela auðar línur' : '+ Fleiri upplýsingar') + '</button>';
    uppfaeraTomt(box, coId);
    thjappa(box);

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
    box.querySelectorAll('._bupp-flis').forEach(b => {
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); smellaFlis(b); });
      b.addEventListener('keydown', e => e.stopPropagation());
    });
    const vixl = box.querySelector('._bupp-vixl');
    if (vixl) {
      vixl.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        setjaOpid(!opid());
        vixl.textContent = opid() ? '− Fela auðar línur' : '+ Fleiri upplýsingar';
        thjappa(box);
      });
      vixl.addEventListener('keydown', e => e.stopPropagation());
    }
  }

  // Þjappað = auðar línur faldar. Báðir klasarnir eru settir í JS (ekki með
  // ham-selectori í CSS) svo reglurnar geti farið gegnum R() og borið sama
  // uppblásna vægi og hinar — annars tapa þær fyrir ._bupp-lina-reglunni.
  function thjappa(box) {
    box.classList.toggle('_bupp-simi', simiHamur());
    box.classList.toggle('_bupp-thjappad', !opid());
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
    merkjaFlisar(box, coId);
    uppfaeraTomt(box, coId);
    thjappa(box);
    // Tillögurnar breytast þegar reitur fyllist (hér eða á annarri vél) eða
    // athugasemd breytist — teiknum þá upp á nýtt, en aldrei ofan í innslátt.
    const sig = tillogur(coId).map(t => t.reitur + '=' + t.gildi).join('|');
    if ((box.dataset.tillSig || '') !== sig && !box.contains(document.activeElement)) { teikna(box, coId); return; }
    const afsl = box.querySelector('._bupp-afsl');
    if (afsl) {
      const a = afslattur(coId);
      if (afsl.textContent !== a.texti) afsl.textContent = a.texti;
      if (afsl.title !== a.titill) afsl.title = a.titill;
    }
    // Stólpi-línan verður til/hverfur með félaginu — hún er aðeins á þeim 52
    // sem bera áminningu, svo endurteiknum þegar tilvist hennar breytist.
    const stNu = stolpi(coId);
    const erLina = Array.prototype.some.call(box.querySelectorAll('._bupp-merki'), e => /Stólpi/.test(e.textContent || ''));
    if (!!stNu !== erLina) { teikna(box, coId); return; }
    const stSpan = box.querySelector('._bupp-lina ._bupp-afsl[title*="Stólpa"]');
    if (stNu && stSpan) {
      const a2 = afslattur(coId);
      const misr = !!(stNu.pct != null && !a2.hopur && stNu.pct !== a2.pct);
      stSpan.classList.toggle('_bupp-misr', misr);
      const nyr = (misr ? '⚠ ' : '') + stNu.texti;
      if (stSpan.textContent !== nyr) stSpan.textContent = nyr;
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

  window.BannerUpplysingar = { haldaVid, gildi, tillogur, LYKILL };
  console.log('[patch-363] 🏢 Banner-upplýsingar v2 — hús, tæki, aðkoma, tillögur + afsláttarlína');
})();
