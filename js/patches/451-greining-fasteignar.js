/* === GREINING FASTEIGNAR (451) — 09.10.2026 =====================================================================
 *
 * Agnar 09.10.2026: „Væri einhvernstaðar hægt að gera page þar sem maður getur sett inn heimilisfang og sett í
 * „Greining fasteignar“ kannski lítill linkur frá söluborði yfir á þá síðu. Sem myndi sækja bara öll gögn sem hægt er að
 * nálgast og gerir samantekt. Sýnir floorplan og allt" · „Næstum því bara eins og fyrirtækjaprófíll nema að maður geti
 * breytt um heimilisfang og ýtt á sækja" · „Já eiginlega bara setja tóman prófíl með smá extra“ · „Samnýtt með teikningar“.
 *
 * HVAÐ ÞETTA ER. Slóðin #greining/<heimilisfang | landnúmer | kennitala> opnar RAUNVERULEGA fyrirtækjaprófílinn
 * (Companies.openDetail — sama teikning, borði, upplýsingabox 363, loftmynd 367 og Brunastál 402–405 og #company/<id>)
 * fyrir SÝNDARFYRIRTÆKI með auðkennið -987654321 og heimilisfanginu sem nafni. Ofan á hann koma aukaspjöldin (442 .ssp):
 * Samantekt · Hjá okkur · Byggingarupplýsingar · Brunavarnir úr byggingarlýsingu · Kröfur eftir tegund · Teikningar ·
 * Rekstur og fyrirtækið · Heimildir og hömlur. Í hausnum (málmhaus borðans) er breytanlegt heimilisfang með tillögum
 * og „Sækja“. Sé heimilisfangið viðskiptavinur sýnir „Hjá okkur“ hann með „Opna prófíl“ (raunverulegur #company/<id>).
 *
 * ÖRYGGI — SÝNDARFYRIRTÆKIÐ SKRIFAR ALDREI. (a) js/sydarvordur.js (hlaðið á undan db.js) stöðvar hvert skrif sem ber
 * töluna 987654321 — á lægsta stigi, fyrir alla pappa; (b) takkar sem eiga ekki við sýndarprófíl (Breyta, + Bæta við tæki,
 * Athugasemd, Þjónustusamningur, Teikning, ⋯) eru faldir með CSS á #companies-main.gr-sydar; (c) röðin fer úr
 * Companies.list um leið og farið er af síðunni; (d) teikningahlekkir 363 opna forskoðunina (384) ÁN félags, svo
 * „Opna í TurboPaint“ búi ekki til borð fyrir sýndarauðkennið. Mælt í tools/greining-vafri.cjs: 0 skrif við opnun, smelli
 * og 30 s kyrrstöðu.
 *
 * SAMNÝTT MEÐ TEIKNINGU (Agnar 09.10.2026): leitin er 374 (TeiknSaekja.finna / .flokka) óbreytt; viðskiptavinur með hæðir
 * í teikning_bord fær SÍNAR hæðir (skurður, tæki, föst vinnumynd 445, síðasta Designer-3D-mynd) og „Opna í Teikningu“ /
 * „3D“; viðskiptavinur án hæða fær „Setja í Teikningu“, sem opnar Teikningu félagsins og „Finna allt húsið“ (383) — EKKERT
 * vistast nema ýtt sé á Vista þar, um TeiknVistun (375). Engin önnur skrifleið í teikning_bord.
 *
 * SKRIF SEM SÍÐAN Á: (1) skyndiminnisröð í fasteign_greining (tegund 'eign', lykill 'eign:<landnr>[:<heitinr>]') — svar
 * bygging-uppl og samantekt teikninga, svo næsta uppfletting birtist strax og nýtist þegar staðurinn verður viðskiptavinur;
 * (2) beiðni í automation_triggers (workflow 'bygging-ocr') þegar ýtt er á „Lesa skjölin“ — brúin (luna-bridge) les
 * skjölin á skrifstofutölvunni og skrifar lesturinn í fasteign_greining (tegund 'skjal'). Annað: ekkert.
 * Sjálfsótt gögn eru merkt „sjálfsótt“ með uppruna og ALDREI skrifuð í fyrirtaeki eða aðrar okkar töflur.
 *
 * STÖÐUGT VIÐMÓT: hvert spjald er smíðað í föstu formi við opnun (haus + búkur með frátekinni hæð) og fyllt um leið og
 * SÍN gögn koma — engin endurteikning annarra spjalda. Staða hvers hluta (sæki / ekkert fannst / villa + Reyna aftur)
 * sést í haus spjaldsins; tómt svar er aldrei sett fram sem staðreynd. Skyndiminni lotunnar (Map) fyrir sömu uppflettingu.
 * ================================================================================================================ */
(() => {
  if (window.Greining451) return;

  const SYND = (window.Sydarvordur && Sydarvordur.ID) || -987654321;
  const ROUTE = 'greining';
  const ID = '_gr451';
  const LISTI = '/.netlify/functions/teikn-listi';
  const MYND = '/.netlify/functions/teikn-mynd';
  const PDFF = '/.netlify/functions/teikn-pdf';
  const SER = '/.netlify/functions/seruppdrattir';
  // „Skoða í TurboPaint" (Agnar 09.10.2026: opna skjalasafnsteikningu „í hæstu gæðum í TurboPaint án þess að búa til borð").
  // Slóðarsniðmátið kemur úr kjarna (PR #181) — {url} = FRUMSLÓÐ blaðsins (…pdf.info / .tif.info / bein PDF kortasjár, svo
  // TurboPaint fái hæstu upplausn), {titill} = „<heimilisfang> — <blað> (<dags>)". Aðeins blöð úr skjalasafni bera slóð —
  // hæðir „Í notkun hjá okkur" fá engan takka (þar er „Opna í Teikningu"). Opnast í nýjum flipa; ekkert borð búið til.
  const TP_SKODA = 'https://kjarni.vercel.app/kjarni/turbopaint?skoda={url}&titill={titill}';
  const tpSlod = (it) => (TP_SKODA && it && it.slod ? TP_SKODA.replace('{url}', encodeURIComponent(it.slod)).replace('{titill}', encodeURIComponent(it.tpTitill || it.titill || '')) : null);
  const BYGG = '/.netlify/functions/bygging-uppl';
  const FOPIN = '/.netlify/functions/fasteign-opin';
  const HUS = '/.netlify/functions/hus-upplysingar';
  const KT = '/api/kt-lookup';
  const HEIMILDIR_SKRA = '/js/data/greining-heimildir.json';
  const FLOKKAR_GRUNNAR = ['/reglur/', '/.claude/skills/arnold/references/'];
  const OCR_BIL = 3000, OCR_HAMARK = 25 * 60000;
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const DARK = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sb = () => (window.DB && DB.sb) || null;
  const segja = (t) => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  // Íslenskt snið óháð stað vafrans (1.821,0)
  const tala = (n, d) => {
    if (n == null || n === '' || !isFinite(n)) return '—';
    d = d == null ? 0 : d;
    const [h, a] = Math.abs(Number(n)).toFixed(d).split('.');
    return (n < 0 ? '−' : '') + h.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (a && +a ? ',' + a : '');
  };
  const dags = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s ? String(s) : ''); };
  const kl = (t) => { const d = new Date(t); const p = (n) => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' kl. ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const afbr = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/gi, 'd').replace(/þ/gi, 'th').replace(/æ/gi, 'ae').replace(/ö/gi, 'o').toLowerCase();
  const svg = (d, w) => '<svg width="' + (w || 14) + '" height="' + (w || 14) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IK = { leit: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', ut: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>' };

  /* ── ÁSTAND ─────────────────────────────────────────────────────────────────────────────────────────────── */
  const S = {
    arg: '',            // það sem stendur í slóðinni / reitnum
    adr: '',            // heimilisfang sem var flett upp (eins og slegið inn eða úr kt)
    kt: '',             // kennitala ef leitað var eftir henni
    virkt: false,       // sýndarprófíllinn er á skjánum
    nr: 0,              // uppflettingarnúmer — eldri svör hunsuð
    g: null,            // gögn núverandi uppflettingar: { eign, bygg, hja, teikn, krofur, rekstur, ... }
    tegundVal: null,    // handval tegundar (aðeins útlit, ekki vistað)
    ocr: null,          // { id, stada, texti, byrjad, landnr, timer }
    opidHaed: {},       // `${cid}:${hid}` → 'vm' | '2d'
    fskSafn: [],        // myndasafn spjaldsins sem er í teikningu (bendir á SAFN[fskK]) — stóra myndin flettir um það
    fskK: 'teikn',
  };
  // Atburðaskrá (síðustu 100) — til greiningar á ræsingu: window.__gr451log
  const atb = (t) => { try { const a = (window.__gr451log = window.__gr451log || []); a.push([Math.round(performance.now()), t]); if (a.length > 100) a.shift(); } catch (_) {} };
  const LOTA = new Map();       // lotu-skyndiminni: lykill → loforð
  function lota(lykill, fn) {
    if (!LOTA.has(lykill)) {
      const p = Promise.resolve().then(fn);
      LOTA.set(lykill, p);
      p.catch(() => { if (LOTA.get(lykill) === p) LOTA.delete(lykill); });
    }
    return LOTA.get(lykill);
  }
  async function saekjaJson(url, ms) {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms || 25000) });
    let j = null;
    try { j = await r.json(); } catch (_) { j = null; }
    if (!r.ok && !(j && (j.eign || j.results))) throw new Error((j && (j.error || j.villa)) || ('svar ' + r.status));
    return j;
  }
  async function tengdur() {
    for (let i = 0; i < 200; i++) { if (sb() && window.Companies) return sb(); await new Promise((r) => setTimeout(r, 100)); }
    throw new Error('Gagnagrunnurinn er ekki tengdur');
  }

  /* ── CSS ─────────────────────────────────────────────────────────────────────────────────────────────────── */
  function css() {
    // Gervi-auðkennin slá út !important-reglur 442 (4 auðkenni) og síma-laganna.
    const K = ':not(#_g451a):not(#_g451b):not(#_g451c):not(#_g451d):not(#_g451e)';
    const R = '#' + ID + K;
    const svgU = (x) => 'url("data:image/svg+xml,' + encodeURIComponent(x) + '")';
    // Síma-lögin (402 p(): 6 auðkenni, 338/356/261) gefa borðanum display með !important — sjö gervi-auðkenni slá þau út
    const MS = 'html[data-viewmode="mobile"] body #companies-main.gr-sydar:not(#_g451m1):not(#_g451m2):not(#_g451m3):not(#_g451m4):not(#_g451m5):not(#_g451m6):not(#_g451m7)';
    const M = 'html body #companies-main.gr-sydar:not(#_g451m1):not(#_g451m2):not(#_g451m3):not(#_g451m4):not(#_g451m5):not(#_g451m6):not(#_g451m7)';
    return [
      // sýndarprófíll: takkar sem skrifa á fyrirtækið faldir (vörðurinn stöðvar þá hvort eð er)
      M + ' [data-co-id],' + M + ' #_co-endurnyja,' + M + ' button[onclick*="Companies.openEdit"]:not(._co-edit-anchor),' + M + ' .b405-vm,' + M + ' .b405-plata,' +
        M + ' .co-banner-right,' + M + ' .b405-knappar,' + M + ' .co-banner-badge,' + M + ' ._co-svc-toggle,' + M + ' ._co-delete,' + M + ' ._co-nytt-toggle,' +
        M + ' .co-mynd-upp,' + M + ' .ut-bulk,' + M + ' ._co-vinnsla,' + M + ' [data-vinnsla],' + M + ' .co-bupp ._bupp-vixl,' + M + ' .co-bupp-reitur{display:none!important}',
      M + ' .co-bupp ._bupp-flis{pointer-events:none!important;opacity:.85}',
      'a.gr-prof.gr-falid' + K + '{visibility:hidden!important;pointer-events:none!important}',
      // sími: borðinn má ekki breyta hæð þegar 363/367 fá svör (spjöldin fyrir neðan hoppuðu 0,11 + 0,18 í mælingu)
      // loftmyndin (367) er sett inn ~0,4 s EFTIR borðanum og ýtti öllu niður (0,18) — á síma er hún falin á sýndarprófílnum
      MS + ' .co-mynd{display:none!important}',
      // 367-flísin getur ekki sýnt mynd á sýndarprófílnum (vistun hennar er stöðvuð → „engin mynd“) — loftmyndin býr í Eigninni
      M + ' .co-mynd{display:none!important}',
      M + ' > .co-banner{grid-template-columns:minmax(0,1fr) 0!important}',
      // S26 (980 px) með hliðarstiku: 420 px loftmyndardálkur 402 kreisti upplýsingaboxið í ~150 px — á sýndarprófílnum víkur hann
      // …og Uppfærsluborð 431 (.co-bupp) fær línurnar „Tillaga“ og „Teikningar“ ~1 og ~2,5 s eftir borðanum: 34 → 72 → 104 px
      // ýtti öllum spjöldunum niður á 980 px (mælt 09.10: borðinn 201 → 233 → 271, layout-shift 0,14–0,36) — plássið frátekið
      // 431 setur Uppfærsluborðið (.co-bupp) inn ~0,8 s á eftir borðanum og það fær línur í ~2,5 s: borðinn stækkaði
      // 171 → 277 (1600 px) / 201 → 301 (980 px) og ýtti Samantektinni, þegar birtri, ~100 px niður (mælt 09.10).
      // Staðgengill á sama grid-svæði (bupp) heldur plássinu þar til 431 kemur; borðið sjálft fær sömu lágmarkshæð.
      '.gr-bupp-st' + K + '{display:none}',
      M + ' > .co-banner > .gr-bupp-st{display:block!important;grid-area:bupp;height:72px;margin:0 0 0 12px;pointer-events:none}',
      M + ' > .co-banner > .co-bupp{min-height:72px!important}',
      // ≤1180 px og sími: þrjár línur (102 px) — sömu valveljarar svo röðin ræður en ekki sértæknin (72 vann 102 í mælingu)
      '@media (max-width: 1180px){' + M + ' > .co-banner > .gr-bupp-st{height:102px}' + M + ' > .co-banner > .co-bupp{min-height:102px!important}}',
      MS + ' > .co-banner > .gr-bupp-st{height:102px!important;margin:0!important}',
      MS + ' > .co-banner > .co-bupp{min-height:102px!important}',
      // hausinn: reiturinn með heimilisfanginu
      M + ' .co-banner-id{flex-wrap:wrap!important;row-gap:10px!important}',
      '.gr-leit' + K + '{position:relative;margin-left:auto;display:flex;align-items:center;gap:8px;flex:1 1 360px;max-width:780px;min-width:0}',
      '.gr-leit .gr-inn' + K + '{flex:1 1 auto;min-width:0;height:38px!important;min-height:0!important;box-sizing:border-box;padding:0 12px 0 34px!important;border-radius:8px!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(0,0,0,.35)!important;color:#fff!important;font:500 14px/1.2 ' + SANS + '!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.45)!important;outline:none;width:auto!important;margin:0!important}',
      '.gr-leit .gr-inn' + K + '::placeholder{color:rgba(255,255,255,.5)}',
      '.gr-leit .gr-inn' + K + ':focus{border-color:rgba(217,183,98,.7)!important}',
      '.gr-leit .gr-innwrap{position:relative;flex:1 1 auto;min-width:0;display:flex}',
      '.gr-leit .gr-glr{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.55);pointer-events:none;display:flex;z-index:1}',
      // Brunastál C: rauða málmmerkið er EINA aðalaðgerð síðunnar (Sækja); silfur fyrir aukaaðgerð (Opna prófíl)
      '.gr-leit .gr-saekja' + K + '{flex:none;height:38px!important;min-height:0!important;padding:0 18px!important;border-radius:8px!important;border:1px solid rgba(190,32,28,.55)!important;background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)!important;color:#fff!important;font:700 13px/1 ' + SANS + '!important;cursor:pointer;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16)!important;width:auto!important;margin:0!important;text-shadow:0 1px 1px rgba(0,0,0,.55)!important}',
      'a.gr-prof' + K + '{flex:none;display:inline-flex!important;align-items:center;height:38px;padding:0 14px!important;border-radius:8px;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.2)!important;color:#11141c!important;font:700 13px/1 ' + SANS + '!important;text-decoration:none!important;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(0,0,0,.4);text-shadow:none}',
      '.gr-leit' + K + '{flex-wrap:wrap;row-gap:8px}',
      '.gr-leit .gr-innwrap' + K + '{flex:1 1 220px}',
      '.gr-leit .gr-tillogur{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;background:#fff;border:1px solid #000;border-radius:10px;box-shadow:0 18px 40px -12px rgba(0,0,0,.6);max-height:300px;overflow:auto;padding:4px}',
      '.gr-leit .gr-tillogur[hidden]{display:none}',
      '.gr-leit .gr-till' + K + '{display:flex!important;align-items:center;gap:8px;width:100%!important;min-height:36px!important;height:auto!important;padding:6px 10px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#141822!important;font:500 13px/1.3 ' + SANS + '!important;text-align:left!important;cursor:pointer;box-shadow:none!important;margin:0!important}',
      '.gr-leit .gr-till' + K + ':hover,.gr-leit .gr-till.virk' + K + '{background:#eef1f6!important}',
      '.gr-leit .gr-till small{margin-left:auto;font:700 10.5px ' + MONO + ';color:#6b7483;white-space:nowrap}',
      '.gr-merki' + K + '{flex:none;display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:4px;background:rgba(217,183,98,.16);border:1px solid rgba(217,183,98,.45);color:#f0d48a;font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}',
      // spjöldin
      R + '{margin:12px 0;display:flex;flex-direction:column;gap:0;container-type:inline-size;font-family:' + SANS + '}',
      R + ' *{box-sizing:border-box}',
      R + ' [hidden]{display:none!important}',
      R + ' .ssp{margin:0 0 12px!important}',
      R + ' .gr-buk{min-height:var(--gr-h,96px)}',
      // hausinn er FASTUR á hæð (46 px, ein lína): undirtitill sem kemur seinna má ekki brjóta hann í fleiri línur og ýta búknum
      R + ' .ssp-haus{flex-wrap:nowrap!important;height:46px;overflow:hidden}',
      R + ' .ssp-haus .ssp-titill{flex:none}',
      R + ' .ssp-haus .ssp-undir{flex:1 1 auto;min-width:0!important}',
      R + ' .ssp-haus .ssp-hlid{flex:0 1 auto;min-width:0;max-width:55%;overflow:hidden}',
      R + ' .gr-stada{overflow:hidden;text-overflow:ellipsis;min-width:0}',
      R + ' .gr-stada{display:inline-flex;align-items:center;gap:6px;font:600 11px ' + MONO + ';color:#cfd5de;white-space:nowrap}',
      R + ' .gr-tomt{font:500 13px/1.5 ' + SANS + ';color:#3a4250;padding:6px 2px}',
      R + ' .gr-villa{font:500 13px/1.5 ' + SANS + ';color:#b42318;padding:6px 2px}',
      R + ' .gr-uppruni{font:500 11px/1.45 ' + MONO + ';color:#6b7483;margin-top:6px;overflow-wrap:anywhere}',
      R + ' .gr-uppruni a{color:#3a4250;text-decoration:underline;text-decoration-color:rgba(20,24,34,.3);text-underline-offset:2px}',
      R + ' .gr-sjalf' + K + '{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:#eceff4;color:#1f2530;font:700 10.5px ' + MONO + ';margin-left:6px;vertical-align:middle;white-space:nowrap}',
      R + ' .ssp-plata.gr-dokk{background:' + DARK + '!important;border-color:#000!important;color:#eef1f4!important}',
      R + ' a.gr-hl{color:#141822;text-decoration:underline;text-decoration-color:rgba(20,24,34,.35);text-underline-offset:2px}',
      R + ' a.gr-hl:hover{color:#8f1d13}',
      // samantekt — Playfair-tölur eins og hausar prófílsins
      R + ' .gr-kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}',
      R + ' .gr-k{background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:8px 10px;min-height:74px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}',
      R + ' .gr-k b{font:800 26px/1.05 ' + DISP + ';color:#141822;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      R + ' .gr-k span{font:700 10px/1.3 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b}',
      R + ' .gr-k i{font:500 10.5px/1.3 ' + SANS + ';font-style:normal;color:#6b7483;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      R + ' .gr-setn{margin:10px 2px 0;font:500 14px/1.55 ' + SANS + ';color:#141822;min-height:44px}',
      R + ' .gr-punktar{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;min-height:262px}',
      R + ' .gr-punktar li{display:grid;grid-template-columns:132px minmax(0,1fr);gap:10px;align-items:baseline;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1);padding:7px 10px;font:500 13px/1.45 ' + SANS + ';color:#141822}',
      R + ' .gr-punktar li > span:first-child{font:700 10.5px/1.3 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#3a4250}',
      // listar / reitir
      R + ' .gr-reitir{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
      R + ' .gr-reitir .ssp-lina{grid-template-columns:104px minmax(0,1fr)}',
      R + ' .gr-eign{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:stretch}',
      R + ' .gr-eign-reitir{grid-template-columns:minmax(0,1fr)!important}',
      R + ' .gr-kort{height:220px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12);background:#e8ebf0;position:relative;z-index:0}',
      R + ' .gr-loft{height:220px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12);background:#e8ebf0;position:relative;cursor:zoom-in}',
      R + ' .gr-loft img{display:block;width:100%;height:100%;object-fit:cover}',
      R + ' .gr-loft-merki{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);padding:2px 7px;border-radius:5px;background:rgba(10,14,22,.72);color:#fff;font:600 10.5px/1.4 ' + MONO + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '@container (max-width: 999px){' + R + ' .gr-eign{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}' + R + ' .gr-eign-reitir{grid-column:1 / -1}}',
      '@container (max-width: 560px){' + R + ' .gr-eign{grid-template-columns:minmax(0,1fr)}}',
      R + ' .gr-meira{margin-top:4px}',
      R + ' .gr-meira summary{cursor:pointer;font:600 12px ' + MONO + ';color:#3a4250;padding:4px 2px;list-style:none}',
      R + ' .gr-meira summary::-webkit-details-marker{display:none}',
      R + ' .gr-meira summary::before{content:"+ "}',
      R + ' .gr-meira[open] summary::before{content:"− "}',
      R + ' table.gr-tafla{width:100%!important;max-width:none!important;table-layout:auto}',
      R + ' .gr-tafla{width:100%;border-collapse:separate;border-spacing:0 4px;font:500 13px/1.4 ' + SANS + ';color:#141822}',
      // tafla C: hausröðin er málmsvört með mono-hástöfum (brunastal-c.md · Töflur)
      R + ' .gr-tafla th{font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#cfd5de;text-align:left;padding:9px 8px;background:' + METAL + ';text-shadow:0 1px 1px rgba(0,0,0,.6)}',
      R + ' .gr-tafla th:first-child{border-radius:8px 0 0 8px}',
      R + ' .gr-tafla th:last-child{border-radius:0 8px 8px 0}',
      R + ' .gr-tafla td{background:#fff;padding:7px 8px;vertical-align:top;box-shadow:inset 0 1px 0 rgba(20,24,34,.06),inset 0 -1px 0 rgba(20,24,34,.06);overflow-wrap:anywhere}',
      R + ' .gr-tafla td:first-child{border-radius:6px 0 0 6px;box-shadow:inset 1px 0 0 rgba(20,24,34,.1),inset 0 1px 0 rgba(20,24,34,.06),inset 0 -1px 0 rgba(20,24,34,.06)}',
      R + ' .gr-tafla td:last-child{border-radius:0 6px 6px 0}',
      R + ' .gr-tafla .gr-num{text-align:right;font-family:' + MONO + ';white-space:nowrap}',
      R + ' .gr-led{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle;background:#8a929e;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      R + ' .gr-led.g{background:#2fbf6b;box-shadow:0 0 6px rgba(47,191,107,.8),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .gr-led.y{background:#d9b762;box-shadow:0 0 6px rgba(217,183,98,.8),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .gr-led.r{background:#e0453c;box-shadow:0 0 6px rgba(224,69,60,.8),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .gr-varud{margin-top:8px;padding:8px 10px;border-radius:6px;background:#fff7e6;box-shadow:inset 0 0 0 1px rgba(181,138,43,.35);font:500 12.5px/1.45 ' + SANS + ';color:#5c4507}',
      R + ' .gr-takkar{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}',
      R + ' .gr-framvinda{font:600 12px/1.4 ' + MONO + ';color:#3a4250}',
      // brunavarnir
      R + ' .gr-bv{display:flex;flex-direction:column;gap:6px}',
      R + ' .gr-bv-rod{background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1);padding:8px 10px}',
      R + ' .gr-bv-rod > b{font:700 13px ' + SANS + ';color:#141822}',
      R + ' .gr-bv-rod q{display:block;margin-top:4px;font:400 13px/1.45 Georgia,serif;color:#2b313c;quotes:"„" "“"}',
      R + ' .gr-bv-rod q.neit{color:#8a929e;text-decoration:line-through;text-decoration-color:rgba(20,24,34,.25)}',
      // teikningar
      R + ' .gr-myndir{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}',
      R + ' .gr-mynd{position:relative;display:flex;flex-direction:column;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12);overflow:hidden;cursor:pointer;min-width:0;text-align:left;border:0;padding:0;font:inherit}',
      R + ' .gr-mynd .gr-flis{height:124px;background:#11141c center/contain no-repeat;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.45);font:700 11px ' + MONO + '}',
      R + ' .gr-mynd .gr-mt{padding:6px 8px 8px;font:600 12px/1.35 ' + SANS + ';color:#141822}',
      R + ' .gr-mynd .gr-mt small{display:block;font:500 10.5px ' + MONO + ';color:#6b7483;margin-top:2px}',
      R + ' .gr-haedir{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}',
      R + ' .gr-haed{background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12);overflow:hidden;min-width:0}',
      R + ' .gr-haed-haus{display:flex;align-items:center;gap:6px;padding:6px 8px;font:700 12.5px ' + SANS + ';color:#141822}',
      R + ' .gr-haed-haus .ssp-btn{margin-left:auto}',
      R + ' .gr-skurdur{position:relative;width:100%;overflow:hidden;background:#fff;cursor:zoom-in}',
      R + ' .gr-skurdur img{position:absolute;max-width:none!important;max-height:none!important;display:block}',
      R + ' .gr-skurdur .gr-pt{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#e11d2e;box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.5)}',
      R + ' .gr-skurdur .gr-pt.st{background:#15803d}',
      R + ' .gr-pdf-bida{cursor:pointer;background:repeating-linear-gradient(135deg,#f4f6f9 0 10px,#eceff4 10px 20px)}',
      R + ' .gr-pdf-bida .gr-pt{opacity:.55}',
      R + ' .gr-pdf-texti{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 12px ' + SANS + ';color:#3a4250;text-align:center;padding:8px}',
      R + ' .gr-vm{display:block;width:100%;height:auto;background:#fff}',
      R + ' .gr-listi{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}',
      R + ' .gr-listi li{background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1);padding:6px 10px;font:500 12.5px/1.4 ' + SANS + ';color:#141822;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}',
      R + ' .gr-listi li small{font:500 11px ' + MONO + ';color:#6b7483}',
      R + ' .gr-3d{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
      R + ' .gr-3d img{height:120px;width:auto;border-radius:6px;box-shadow:0 0 0 1px rgba(20,24,34,.2);background:#fff;cursor:zoom-in}',
      // forskoðun: föst stærð á hverri flís — smámyndin sem kemur seinna ýtir engu (Stöðugt viðmót)
      R + ' .gr-fsk-grind{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:8px}',
      R + ' .gr-fsk{display:flex;flex-direction:column;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12);overflow:hidden;cursor:zoom-in;min-width:0;text-align:left;border:0;padding:0;margin:0;font:inherit;color:inherit}',
      R + ' .gr-fsk:hover{box-shadow:inset 0 0 0 1px rgba(20,24,34,.32),0 3px 8px rgba(10,14,22,.18)}',
      R + ' .gr-fsk-mynd{position:relative;display:block;height:150px;background:#f4f6f9;overflow:hidden;box-shadow:inset 0 -1px 0 rgba(20,24,34,.1)}',
      R + ' .gr-fsk-mynd > img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;z-index:1}',
      R + ' .gr-fsk-bid{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;font:600 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#8a929e;pointer-events:none}',
      R + ' .gr-fsk-heiti{display:block;padding:6px 8px 0;font:700 13px/1.3 ' + SANS + ';color:#141822;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      R + ' .gr-fsk-undir{display:block;height:2.8em;padding:2px 8px 0;margin-bottom:7px;font:500 10.5px/1.4 ' + MONO + ';color:#6b7483;overflow:hidden}',
      R + ' .gr-fsk-ath{margin:6px 0 0;font:500 12px/1.45 ' + SANS + ';color:#525b6b}',
      R + ' details.gr-eldri{margin-top:8px}',
      R + ' details.gr-eldri > summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;list-style:none;padding:4px 0;font:600 12px ' + SANS + ';color:#3a4250}',
      R + ' details.gr-eldri > summary::-webkit-details-marker{display:none}',
      R + ' details.gr-eldri > summary::before{content:"\\25B8";font-size:11px;color:#6b7483}',
      R + ' details.gr-eldri[open] > summary::before{content:"\\25BE"}',
      R + ' details.gr-eldri .gr-fsk-grind{margin-top:6px}',
      R + ' .gr-skurdur > .gr-fsk-bid,' + R + ' .gr-haed-pdf > .gr-fsk-bid{background:repeating-linear-gradient(135deg,#f4f6f9 0 10px,#eceff4 10px 20px)}',
      R + ' .gr-haed-pdf{height:220px;cursor:zoom-in;box-shadow:none}',
      R + ' .gr-haed-3d{display:flex;flex-direction:column}',
      R + ' .gr-3d-flis{position:relative;display:block;width:100%;aspect-ratio:4/3;border:0;padding:0;margin:0;background:#11141c;cursor:zoom-in;overflow:hidden}',
      R + ' .gr-3d-flis img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}',
      R + ' .gr-3d-fleiri{display:flex;gap:6px;padding:6px 8px 8px}',
      R + ' .gr-3d-fleiri button{flex:1 1 0;height:56px;border:0;padding:0;margin:0;border-radius:5px;overflow:hidden;background:#11141c;cursor:zoom-in}',
      R + ' .gr-3d-fleiri img{width:100%;height:100%;object-fit:contain;display:block}',
      // ── myndrænt (Agnar 09.10.2026: „ekki bara textar“) — allir kassar fastir að stærð, myndin sem kemur seinna ýtir engu
      R + ' .gr-myndraen{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;height:250px;margin:0 0 10px}',
      R + ' .gr-hero{position:relative;display:block;width:100%;height:250px;border:0;padding:0;margin:0;border-radius:10px;overflow:hidden;background:#11141c;cursor:zoom-in;box-shadow:inset 0 0 0 1px rgba(20,24,34,.2),0 2px 6px rgba(10,14,22,.2)}',
      R + ' .gr-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
      R + ' .gr-hero-tom{cursor:default}',
      R + ' .gr-hero .gr-fsk-bid{color:rgba(255,255,255,.55)}',
      R + ' .gr-myndraen-h{display:flex;flex-direction:column;gap:4px;min-width:0}',
      R + ' .gr-mskilti{font:700 10px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#525b6b;height:14px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
      R + ' .gr-raema{display:flex;gap:8px;height:142px;overflow-x:auto;overflow-y:hidden;align-items:stretch;scrollbar-width:thin}',
      R + ' .gr-raema .gr-fsk{flex:0 0 140px;width:140px}',
      R + ' .gr-raema .gr-fsk-mynd{height:92px}',
      R + ' .gr-raema .gr-fsk-undir{height:1.45em;margin-bottom:5px}',
      R + ' .gr-raema-skurdur{display:flex!important;align-items:center;justify-content:center;background:#fff}',
      R + ' .gr-raema-skurdur > .gr-skurdur{position:relative;overflow:hidden;max-width:100%;max-height:100%}',
      R + ' .gr-raema-skurdur > .gr-skurdur > img{position:absolute;max-width:none!important;max-height:none!important}',
      R + ' .gr-kerfi{display:flex;gap:6px;height:62px;overflow-x:auto;overflow-y:hidden;align-items:stretch;scrollbar-width:thin}',
      R + ' .gr-kerfi-tomt{align-self:center;font:500 12px ' + SANS + ';color:#6b7483}',
      R + ' .gr-kt{flex:0 0 64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:#fff;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);cursor:help}',
      R + ' .gr-kt small{font:700 10px ' + MONO + ';color:#141822;line-height:1.1}',
      R + ' .gr-kt i{font:600 9px ' + SANS + ';font-style:normal;line-height:1.1;color:#525b6b;white-space:nowrap}',
      R + ' .gr-kt.st-til i{color:#15803d}', R + ' .gr-kt.st-vantar i{color:#b42318}', R + ' .gr-kt.st-ovitad i{color:#8a5a00}',
      R + ' .gr-kt.st-vantar{box-shadow:inset 0 0 0 1px rgba(180,35,24,.45)}',
      R + ' .gr-kerfi-tal{height:16px;font:600 11px ' + MONO + ';color:#3a4250;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden}',
      R + ' .gr-takn{display:inline-block;vertical-align:middle;flex:none}',
      R + ' .gr-takn-txt{display:inline-flex;align-items:center;justify-content:center;border-radius:6px;color:#fff;font:700 9px ' + MONO + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 1px 2px rgba(0,0,0,.3)}',
      R + ' .gr-kerfi-heiti{display:inline-flex;align-items:center;gap:6px}',
      R + ' .gr-bv-rod .gr-takn{margin-right:6px;vertical-align:-6px}',
      R + ' .gr-st{display:inline-block;padding:1px 8px;border-radius:9px;font:700 10.5px/1.6 ' + MONO + ';white-space:nowrap}',
      R + ' .gr-st.st-til{background:#e6f4ea;color:#14532d}', R + ' .gr-st.st-vantar{background:#fde8e6;color:#7a1012}', R + ' .gr-st.st-ovitad{background:#fdf0d5;color:#7a4b00}', R + ' .gr-st.st-skilyrt{background:#eef1f6;color:#3a4250}',
      R + ' .gr-med-skjal{display:grid;grid-template-columns:minmax(0,1fr) 172px;gap:12px;align-items:start}',
      R + ' .gr-skjal-fl .gr-fsk{width:100%}',
      R + ' .gr-skjal-rod{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;margin:0 0 10px;scrollbar-width:thin}',
      R + ' .gr-skjal-rod > .gr-fsk{flex:0 0 172px;width:172px}',
      R + ' .gr-fsk-bida{cursor:default}',
      R + ' .gr-fsk-skemmt{cursor:not-allowed;box-shadow:inset 0 0 0 1px rgba(180,35,24,.45)!important}',
      R + ' .gr-fsk-skemmt .gr-fsk-bid{color:#b42318}',
      R + ' .gr-krofu-haus{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:8px}',
      R + ' .gr-krofu-haus > label{flex:1 1 auto;min-width:0}',
      R + ' .gr-skjal-litil{flex:0 0 156px;width:156px}',
      R + ' .gr-skjal-litil .gr-fsk-mynd{height:108px}',
      R + ' .gr-sulur{display:flex;flex-direction:column;gap:4px}',
      R + ' .gr-sula{display:grid;grid-template-columns:120px minmax(0,1fr) 110px;gap:8px;align-items:center;font:600 12px ' + SANS + ';color:#141822}',
      R + ' .gr-sula-t{height:14px;border-radius:7px;background:#e6e9ef;box-shadow:inset 0 1px 2px rgba(10,14,22,.15);overflow:hidden}',
      R + ' .gr-sula-t i{display:block;height:100%;border-radius:7px;background:linear-gradient(180deg,#a3191b,#6c0d10);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
      R + ' .gr-sula-v{font:600 12px ' + MONO + ';text-align:right;white-space:nowrap}',
      R + ' details.gr-allar{margin-top:10px}',
      R + ' details.gr-allar > summary{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;cursor:pointer;list-style:none;padding:6px 0}',
      R + ' details.gr-allar > summary::-webkit-details-marker{display:none}',
      R + ' .gr-allar-takki{display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:8px;border:1px solid #000;background:' + METAL + ';color:#eef1f4;font:700 12.5px/1 ' + SANS + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.35)}',
      R + ' details.gr-allar[open] .gr-allar-takki::after{content:" — loka";font-weight:500;opacity:.7}',
      R + ' .gr-allar-yfir{font:500 11.5px ' + MONO + ';color:#525b6b}',
      R + ' .gr-allar-yfir b{color:#b42318}',
      R + ' .gr-allar-hopur{margin-top:10px}',
      R + ' .gr-allar-haus{display:flex;align-items:center;gap:8px;padding:6px 10px;margin:0 0 6px;border-radius:6px;background:' + METAL + ';color:#fff;font:700 12px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase}',
      R + ' .gr-allar-haus b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:18px;padding:0 6px;border-radius:9px;background:rgba(255,255,255,.16);font:700 11px ' + MONO + '}',
      R + ' .gr-allar-haus span{font:500 10.5px ' + SANS + ';letter-spacing:0;text-transform:none;opacity:.75}',
      R + ' .gr-adrar .gr-fsk-heiti{color:#7a1012}',
      R + ' .gr-hluti-haus{display:flex;align-items:baseline;gap:10px;margin:14px 0 8px;padding:8px 12px;border-radius:8px;background:' + METAL + ';color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 2px 6px rgba(0,0,0,.3)}',
      R + ' .gr-hluti-haus:first-child{margin-top:0}',
      R + ' .gr-hluti-haus span{font:700 12px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase}',
      R + ' .gr-hluti-haus small{font:500 11.5px ' + SANS + ';color:rgba(255,255,255,.7);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      R + ' .gr-tp-bord{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}',
      R + ' .gr-tp{display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 4px rgba(10,14,22,.12)}',
      R + ' .gr-tp b{font:700 13px ' + SANS + ';color:#141822}', R + ' .gr-tp span{font:500 11px ' + MONO + ';color:#525b6b}',
      R + ' .gr-fsk{position:relative}',
      R + ' .gr-fsk-tp{position:absolute;top:6px;right:6px;z-index:2;padding:2px 7px;border-radius:6px;background:' + METAL + ';color:#fff!important;font:700 10px ' + MONO + ';text-decoration:none!important}',
      // ── Brunavarnir á teikningu (5h): föst hæð sviðs, skýringa og stöðulína — ekkert ýtist þegar teikningin kemur
      R + ' .gr-bat{--bat-h:600px;margin:14px 0 6px}', R + ' .gr-bat > .gr-hluti-haus{margin-top:0}',
      R + ' .gr-bat-haedir{display:flex;align-items:center;gap:6px;height:38px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;margin:0 0 8px;scrollbar-width:thin}',
      R + ' .gr-bat-hd{flex:none;height:30px;padding:0 12px;margin:0;border-radius:7px;border:1px solid #000;background:' + METAL + ';color:#e4e7ec;font:700 12px/1 ' + SANS + ';cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 5px rgba(0,0,0,.3)}',
      R + ' .gr-bat-hd.on{background:linear-gradient(180deg,#d6262c 0%,#a3141a 55%,#7d0d12 100%);color:#fff;box-shadow:0 0 12px -2px rgba(210,30,30,.6),inset 0 1px 0 rgba(255,255,255,.25)}',
      R + ' .gr-bat-hd-undir{flex:none;margin-left:6px;font:500 11px ' + MONO + ';color:#6b7483}',
      R + ' .gr-bat-grind{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:12px;align-items:start}', R + ' .gr-bat-grind.ein{grid-template-columns:minmax(0,1fr)}',
      R + ' .gr-bat-svid{position:relative;height:var(--bat-h);display:flex;align-items:center;justify-content:center;background:#fff;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.14),0 2px 6px rgba(10,14,22,.12);overflow:hidden}',
      R + ' .gr-bat-bid{font:600 13px ' + SANS + ';color:#6b7483;padding:0 16px;text-align:center}', R + ' .gr-bat-bid.villa{color:#b42318}',
      R + ' .gr-bat-blad{position:relative;z-index:1;max-height:100%;overflow:hidden;background:transparent;flex:none}',
      R + ' .gr-bat-svid.mynd::before{content:"Sæki mynd…";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 13px ' + SANS + ';color:#8a929e;z-index:0}',
      R + ' .gr-bat-blad > img:first-child{position:absolute;left:0;top:0;width:100%;height:100%;display:block;max-width:none!important;max-height:none!important}',
      R + ' .gr-bat-blad.heil{width:100%;height:100%}', R + ' .gr-bat-blad.heil > img:first-child{object-fit:contain}',
      R + ' .gr-bat-m{position:absolute;max-width:none!important;max-height:none!important;opacity:0;transition:opacity .18s;pointer-events:none}', R + ' .gr-bat-m.on{opacity:1}',
      R + ' .gr-bat-hr{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid transparent;pointer-events:none;transition:border-color .18s,box-shadow .18s}',
      R + ' .gr-bat-hr.on{border-color:rgba(232,106,18,.95);box-shadow:0 0 0 4px rgba(232,106,18,.25)}',
      R + ' .gr-bat-r{position:absolute;transform:translate(-50%,-50%);padding:1px 6px;border-radius:5px;background:rgba(20,22,28,.82);color:#fff;font:700 10.5px/1.35 ' + SANS + ';white-space:nowrap;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.4);z-index:2}',
      R + ' .gr-bat-r.on{background:#e86a12;box-shadow:0 0 0 2px #fff,0 0 10px rgba(232,106,18,.8)}', R + ' .gr-bat-blad.val .gr-bat-r:not(.on){opacity:.4}',
      R + ' .gr-bat-d{position:absolute;height:7px;min-width:8px;border-radius:4px;background:#0a8f3c;box-shadow:0 0 0 1.5px #fff,0 0 8px rgba(10,143,60,.8);z-index:1}',
      R + ' .gr-bat-d.stor{background:repeating-linear-gradient(90deg,#0a8f3c 0 6px,#5fd08a 6px 9px)}',
      R + ' .gr-bat-i{position:absolute;width:20px;height:20px;transform:translate(-50%,-50%);border-radius:4px;background-size:100% 100%;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));max-width:none!important;z-index:3}',
      R + ' .gr-bat-i.okkar{outline:2px solid #d9b762;outline-offset:1px}', R + ' .gr-bat-i.lys{outline:1.5px dashed #a86a12;outline-offset:1px}',
      R + ' .i-utg{background-image:' + svgU("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='.6' y='.6' width='22.8' height='22.8' rx='3.2' fill='#0a8f3c' stroke='#fff' stroke-width='1.2'/><path d='M15.2 4.2h4.6v15.6h-4.6' fill='none' stroke='#fff' stroke-width='1.5'/><circle cx='10.6' cy='5.3' r='1.75' fill='#fff'/><path d='M9.6 7.9 6.3 10.3l.9 1.2 2.4-1.6.5 3.1-2.7 3.4 1.2 1 3-3.6 1.7 1.9v3.9h1.6v-4.5l-2.1-2.4-.5-2.3 1.3 1.1 2.4-.5-.3-1.5-1.7.3z' fill='#fff'/></svg>") + '}',
      R + ' .i-neyd{background-image:' + svgU("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='.6' y='.6' width='22.8' height='22.8' rx='3.2' fill='#a86a12' stroke='#fff' stroke-width='1.2'/><rect x='6' y='10' width='12' height='5.2' rx='1.6' fill='#fff'/><path d='M12 4.2v3M6.3 6l1.8 1.8M17.7 6l-1.8 1.8' stroke='#fff' stroke-width='1.6' stroke-linecap='round'/><path d='M8 17.8h8' stroke='#fff' stroke-width='1.4'/></svg>") + '}',
      R + ' .i-reykluga{background-image:' + svgU("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='.6' y='.6' width='22.8' height='22.8' rx='3.2' fill='#3a3f48' stroke='#fff' stroke-width='1.2'/><path d='M3.8 17.5 12 11.5l8.2 6' fill='none' stroke='#fff' stroke-width='1.6'/><path d='M12 15V4.6M8.8 7.7 12 4.5l3.2 3.2' fill='none' stroke='#ffb347' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/></svg>") + '}',
      R + ' .i-bjorgun{background-image:' + svgU("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='.6' y='.6' width='22.8' height='22.8' rx='3.2' fill='#0a8f3c' stroke='#fff' stroke-width='1.2'/><rect x='4.6' y='6' width='8.6' height='12' fill='none' stroke='#fff' stroke-width='1.5'/><path d='M10.5 12h8.2M15.8 9l3 3-3 3' fill='none' stroke='#fff' stroke-width='1.6'/></svg>") + '}',
      R + ' .i-pin{background:#b42318;border-radius:50%!important;box-shadow:0 0 0 2px #fff}',
      R + ' .gr-bat-skyr{display:flex;gap:6px;height:36px;align-items:center;overflow-x:auto;overflow-y:hidden;white-space:nowrap;margin:8px 0 4px;scrollbar-width:thin}',
      R + ' .gr-bat-sk{flex:none;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px 0 5px;border-radius:7px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.13);font:600 11.5px ' + SANS + ';color:#141822}',
      R + ' .gr-bat-sk b{font:700 11.5px ' + MONO + ';color:#141822}', R + ' .gr-bat-sk.tomt{color:#6b7483;padding:0 10px;font-weight:500}',
      R + ' .gr-bat-ik{position:static!important;display:inline-block;width:18px;height:18px;transform:none!important;flex:none;background-size:100% 100%;border-radius:3px;max-width:none!important}',
      R + ' .gr-bat-ik.i-dyr{background:#0a8f3c;height:7px;width:20px;border-radius:4px;box-shadow:0 0 0 1.5px #fff,0 0 0 2.5px rgba(0,0,0,.2)}',
      R + ' .gr-bat-ik.okkar{outline:2px solid #d9b762;outline-offset:1px}', R + ' .gr-bat-ik.lys{outline:1.5px dashed #a86a12;outline-offset:1px}',
      R + ' .gr-bat-stada{height:20px;line-height:20px;font:500 12px ' + SANS + ';color:#3b4250;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}', R + ' .gr-bat-stada.val{color:#b4530f;font-weight:700}',
      R + ' .gr-bat-hlid{height:var(--bat-h);overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;scrollbar-width:thin}',
      R + ' .gr-bat-fyrir{font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#6b7483;margin:4px 0 0}',
      R + ' .gr-bat-tal{flex:none;display:flex;flex-direction:column;gap:3px;text-align:left;padding:8px 10px;margin:0;width:100%;border:0;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.13);cursor:pointer;font:inherit;color:#141822}',
      R + ' .gr-bat-tal1{font:600 12.5px/1.35 ' + SANS + '}', R + ' .gr-bat-tal1 b{margin-right:4px}',
      R + ' .gr-bat-tal2{font:500 11.5px/1.35 ' + SANS + ';color:#3b4250;height:2.7em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      R + ' .gr-bat-tal.st-ok{box-shadow:inset 3px 0 0 #2fbf6b,inset 0 0 0 1px rgba(20,24,34,.13)}', R + ' .gr-bat-tal.st-nei{box-shadow:inset 3px 0 0 #e0453c,inset 0 0 0 1px rgba(20,24,34,.13)}',
      R + ' .gr-bat-tal.st-ovisst{box-shadow:inset 3px 0 0 #d9b762,inset 0 0 0 1px rgba(20,24,34,.13)}',
      R + ' .gr-bat-q{flex:none;display:block;text-align:left;padding:7px 10px;margin:0;width:100%;border:0;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.13);cursor:pointer;font:500 12.5px/1.45 ' + SANS + ';color:#141822}',
      R + ' .gr-bat-q q{quotes:"\\201E" "\\201C"}', R + ' .gr-bat-q small{display:block;margin-top:3px;font:700 10.5px ' + MONO + ';color:#b4530f;letter-spacing:.03em}', R + ' .gr-bat-q.neit{color:#6b7483}',
      R + ' .gr-bat-q.on,' + R + ' .gr-bat-tal.on{background:#fff4ea;box-shadow:inset 0 0 0 2px #e86a12}',
      R + ' .gr-bv q.gr-bat-qq{cursor:pointer}', R + ' .gr-bv q.gr-bat-qq.on{background:#fff4ea;box-shadow:0 0 0 2px #e86a12;border-radius:4px}',
      '@container (max-width: 860px){' + R + ' .gr-bat{--bat-h:440px}' + R + ' .gr-bat-grind{grid-template-columns:minmax(0,1fr)}' + R + ' .gr-bat-hlid{height:auto;overflow:visible}}',
      '@container (max-width: 560px){' + R + ' .gr-bat{--bat-h:340px}' + R + ' .gr-bat-i{width:15px;height:15px}' + R + ' .gr-bat-r{font-size:9px;padding:0 4px}' + R + ' .gr-bat-hd-undir{display:none}}',
      '@container (max-width: 860px){' + R + ' .gr-myndraen{grid-template-columns:220px minmax(0,1fr)}' + R + ' .gr-sula{grid-template-columns:90px minmax(0,1fr) 96px}}',
      '@container (max-width: 560px){' + R + ' .gr-myndraen{grid-template-columns:minmax(0,1fr);height:auto}' + R + ' .gr-hero{height:190px}' + R + ' .gr-med-skjal{grid-template-columns:minmax(0,1fr)}' + R + ' .gr-med-skjal > .gr-skjal-fl{order:-1;max-width:200px}' + R + ' .gr-krofu-haus{flex-direction:column}' + R + ' .gr-skjal-litil{width:100%;max-width:200px}}',
      // haus borðans: loftmynd í stað upphafsstafanna — sama hæð (56 px tölva / 36 px sími)
      M + ' .co-banner-id > .co-banner-mono{display:none!important}',
      '.gr-haus-mynd' + K + '{flex:none;display:inline-flex;align-items:center;justify-content:center;width:84px;height:56px;padding:0!important;margin:0!important;border-radius:10px!important;overflow:hidden;border:1px solid rgba(190,32,28,.55)!important;background:' + METAL + '!important;color:#fff!important;font:800 22px/1 Georgia,serif!important;cursor:zoom-in;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16)!important;min-height:0!important}',
      '.gr-haus-mynd img' + K + '{width:100%;height:100%;object-fit:cover;display:block}',
      MS + ' .co-banner-id > .gr-haus-mynd{width:54px!important;height:36px!important;border-radius:8px!important;font-size:15px!important}',
      // heimildir og hömlur
      R + ' .gr-heim{display:flex;flex-direction:column;gap:4px}',
      R + ' .gr-hrod{background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1)}',
      R + ' .gr-hrod summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px;cursor:pointer;list-style:none;font:500 13px/1.4 ' + SANS + ';color:#141822}',
      R + ' .gr-hrod summary::-webkit-details-marker{display:none}',
      R + ' .gr-hrod summary b{font-weight:600}',
      R + ' .gr-hgefur{flex:1 1 200px;min-width:0;color:#525b6b;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      R + ' .gr-hher{font:600 11px ' + MONO + ';color:#1f2530;background:#eef1f6;border-radius:4px;padding:2px 6px;white-space:nowrap}',
      R + ' .gr-hbuk{padding:2px 12px 10px 26px;font:400 12.5px/1.5 ' + SANS + ';color:#2b313c}',
      R + ' .gr-hbuk p{margin:4px 0}',
      R + ' .gr-hbuk .ssp-merki{margin-right:6px}',
      // þröngt: S26 (980) og sími (375)
      '@container (max-width: 860px){' + R + ' .gr-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}' + R + ' .gr-reitir{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@container (max-width: 860px){' +
        R + ' .gr-tafla thead{display:none}' + R + ' .gr-tafla,' + R + ' .gr-tafla tbody,' + R + ' .gr-tafla tr,' + R + ' .gr-tafla td{display:block;width:100%}' + R + ' .gr-tafla tr{margin-bottom:6px}' +
        R + ' .gr-tafla td{border-radius:0!important;box-shadow:inset 1px 0 0 rgba(20,24,34,.1),inset -1px 0 0 rgba(20,24,34,.1)!important}' + R + ' .gr-tafla td:first-child{border-radius:6px 6px 0 0!important}' + R + ' .gr-tafla td:last-child{border-radius:0 0 6px 6px!important}' +
        R + ' .gr-tafla .gr-num{text-align:left}' + R + ' .gr-tafla td[data-l]::before{content:attr(data-l);display:block;font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b;margin-bottom:2px}' + '}',
      '@container (max-width: 560px){' + R + ' .ssp-haus .ssp-undir{display:none!important}' + R + ' .gr-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}' + R + ' .gr-reitir{grid-template-columns:minmax(0,1fr)}' + R + ' .gr-punktar li{grid-template-columns:minmax(0,1fr);gap:2px}' + R + ' .gr-punktar{min-height:420px}' + R + ' .gr-setn{min-height:88px}' +
        R + ' .gr-myndir{grid-template-columns:repeat(2,minmax(0,1fr))}' + R + ' .gr-fsk-grind{grid-template-columns:repeat(2,minmax(0,1fr))}' + R + ' .gr-fsk-mynd{height:124px}' + R + ' .gr-haedir{grid-template-columns:minmax(0,1fr)}' + R + ' .gr-k b{font-size:22px}}',
      '@media (max-width: 700px){.gr-leit' + K + '{flex-basis:100%;max-width:none;margin-left:0}.gr-leit .gr-inn' + K + '{font-size:16px!important;height:44px!important}.gr-leit .gr-saekja' + K + '{height:44px!important}}',
      // ljósakassi
      '#gr-ljos{position:fixed;inset:0;z-index:100050;background:rgba(10,12,16,.92);display:flex;flex-direction:column}',
      '#gr-ljos .gr-lh{display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff;font:600 13px ' + SANS + ';background:' + METAL + ';border-bottom:1px solid #000}',
      '#gr-ljos .gr-lh{flex-wrap:wrap;row-gap:6px}',
      '#gr-ljos .gr-ltitill{font:700 14px ' + SANS + '}',
      '#gr-ljos .gr-lundir{font:500 11.5px ' + MONO + ';color:rgba(255,255,255,.65);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60vw}',
      '#gr-ljos .gr-lbil{flex:1}',
      '#gr-ljos .gr-lteljari{font:600 12px ' + MONO + ';color:rgba(255,255,255,.8)}',
      '#gr-ljos .gr-lbid{color:rgba(255,255,255,.75);font:600 13px ' + SANS + '}',
      '#gr-ljos .gr-lb img[hidden]{display:none}',
      '#gr-ljos .gr-lor{position:absolute;top:50%;width:46px;height:68px;margin-top:-34px;border:1px solid rgba(255,255,255,.28);border-radius:9px;background:' + METAL + ';color:#fff;font:700 30px/1 ' + SANS + ';cursor:pointer;z-index:2;box-shadow:0 4px 14px rgba(0,0,0,.5)}',
      '#gr-ljos .gr-lor.v{left:12px}', '#gr-ljos .gr-lor.h{right:12px}',
      '#gr-ljos .gr-lor[disabled]{opacity:.28;cursor:default}',
      '@media (max-width: 700px){#gr-ljos .gr-lor{width:38px;height:56px;margin-top:-28px;font-size:24px}#gr-ljos .gr-lor.v{left:4px}#gr-ljos .gr-lor.h{right:4px}#gr-ljos .gr-lundir{max-width:100%;flex-basis:100%;order:5}}',
      '#gr-ljos{touch-action:none;overscroll-behavior:contain}',
      '#gr-ljos .gr-lb{flex:1;position:relative;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:zoom-in}',
      '#gr-ljos .gr-lb.zm{cursor:grab}', '#gr-ljos .gr-lb.drag{cursor:grabbing}',
      '#gr-ljos .gr-lb img{position:absolute;left:0;top:0;max-width:none!important;max-height:none!important;background:#fff;pointer-events:none;-webkit-user-drag:none;user-select:none;box-shadow:0 6px 30px rgba(0,0,0,.5)}',
      '#gr-ljos .gr-lb .gr-lbid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none}',
      '#gr-ljos .gr-lhr{position:absolute;right:12px;bottom:12px;z-index:3;padding:5px 11px;border-radius:7px;background:rgba(10,12,16,.85);border:1px solid rgba(255,255,255,.22);color:#fff;font:600 12px ' + SANS + ';pointer-events:none}',
      '#gr-ljos .gr-lhr[hidden]{display:none}',
      '#gr-ljos .gr-lz{display:inline-flex;align-items:center;gap:4px}',
      '#gr-ljos .gr-lz .ssp-btn{min-width:34px;justify-content:center}',
      '#gr-ljos .gr-lzt{min-width:48px;text-align:center;font:600 12px ' + MONO + ';color:rgba(255,255,255,.85)}',
      // tenglar á Sölu og í Teikningu
      'a.gr-sala-hl' + K + '{display:inline-flex!important;align-items:center;gap:5px;height:26px;padding:0 10px!important;margin-left:8px;border-radius:6px;border:1px solid rgba(20,24,34,.18);background:' + SILVER + ';color:#1f2530!important;font:600 12px/1 ' + SANS + '!important;text-decoration:none!important;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12)}',
    ].join('\n');
  }
  function injectCss() {
    let st = document.getElementById('_gr451-css');
    if (!st) { st = document.createElement('style'); st.id = '_gr451-css'; (document.head || document.documentElement).appendChild(st); }
    const c = css();
    if (st.textContent !== c) st.textContent = c;
  }

  /* ── HEIMILISFÖNG ────────────────────────────────────────────────────────────────────────────────────────── */
  // „Skútuvogi 2, 104 Reykjavík“ → { gata:'skutuvogi', nr:'2', bokst:'', postnr:'104' }
  function thatta(s) {
    const t = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const fyrst = t.split(',')[0].trim();
    const m = /^(.+?)\s+(\d{1,4})\s*([a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ])?\b/.exec(fyrst);
    const pn = (/\b(\d{3})\b/.exec(t.slice(fyrst.length)) || [])[1] || '';
    if (!m) return { gata: afbr(fyrst).replace(/[^a-z]/g, ''), nr: '', bokst: '', postnr: pn };
    return { gata: afbr(m[1]).replace(/[^a-z]/g, ''), nr: m[2], bokst: afbr(m[3] || ''), postnr: pn };
  }
  // Sama gata í nefnifalli og þágufalli: sameiginlegur stofn nær yfir allt nema mest 3 síðustu stafi hvors.
  // Afgangurinn eftir sameiginlegan stofn verður að vera beygingarending („Skútuvog|ur" / „Skútuvog|i", „Hlíðasmár|i" /
  // „Hlíðasmár|a") — annars er þetta önnur gata („Hraunb|ær" / „Hraunb|erg").
  const ENDINGAR = new Set(['', 'i', 'ur', 'a', 'u', 'ar', 'r', 'ir', 'ri', 'um', 'num', 'nni', 'unni', 'inum', 'ins', 's', 'ann', 'inn', 'n']);
  function samaGata(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i >= 4 && ENDINGAR.has(a.slice(i)) && ENDINGAR.has(b.slice(i));
  }
  // Póstnúmer: skráð póstnúmer okkar er stundum rangt (Center Hótel Miðgarður: „Laugavegur 120, 101" — Staðfangaskrá
  // segir 105). Ólík póstnúmer á SAMA svæði (fyrsti stafur eins: 1xx Reykjavík, 2xx nágrannabæir) eru því leyfð en merkt;
  // ólík svæði (sama götuheiti í öðrum landshluta) aldrei.
  function samaHeimili(a, b) {
    const x = thatta(a), y = thatta(b);
    if (!x.nr || x.nr !== y.nr) return false;
    if (x.bokst && y.bokst && x.bokst !== y.bokst) return false;
    if (x.postnr && y.postnr && x.postnr !== y.postnr && x.postnr[0] !== y.postnr[0]) return false;
    return samaGata(x.gata, y.gata);
  }
  const postnrOlik = (a, b) => { const x = thatta(a), y = thatta(b); return !!(x.postnr && y.postnr && x.postnr !== y.postnr); };
  const erKt = (s) => /^\d{6}-?\d{4}$/.test(String(s || '').trim());
  const erLandnr = (s) => /^L?\s?\d{5,7}$/i.test(String(s || '').trim());

  /* ── SÝNDARFYRIRTÆKIÐ ────────────────────────────────────────────────────────────────────────────────────── */
  function nafnAf(adr) { return String(adr || '').split(',')[0].trim() || 'Greining fasteignar'; }
  function setjaSynd(adr) {
    if (!window.Companies) return null;
    if (!Array.isArray(Companies.list)) Companies.list = [];
    let c = Companies.list.find((x) => x && +x.id === SYND);
    if (!c) { c = { id: SYND }; Companies.list.push(c); }
    Object.assign(c, { id: SYND, nafn: nafnAf(adr), heimilisfang: adr || '', kennitala: '', simi: '', netfang: '', banner_note: '', __sydar: true, deleted_at: null });
    return c;
  }
  function fjarlaegjaSynd() {
    try { if (window.Companies && Array.isArray(Companies.list)) Companies.list = Companies.list.filter((x) => !(x && +x.id === SYND)); } catch (_) {}
  }
  function synileg() {
    const main = document.getElementById('companies-main');
    const v = document.getElementById('view-companies');
    return !!(main && v && v.classList.contains('active') && main.querySelector('button[onclick*="Companies.openEdit(' + SYND + ')"]'));
  }
  function slokkva() {
    if (!S.virkt) return;
    atb('slokkva ' + location.hash.slice(0, 30));
    S.virkt = false;
    if (window.Sydarvordur) Sydarvordur.virkt = false;
    fjarlaegjaSynd();
    const main = document.getElementById('companies-main');
    if (main) main.classList.remove('gr-sydar');
    const k = document.getElementById(ID); if (k) k.remove();
    if (S.ocr && S.ocr.timer) clearTimeout(S.ocr.timer);
  }

  /* ── OPNUN ───────────────────────────────────────────────────────────────────────────────────────────────── */
  function slodFyrir(arg) { return '#' + ROUTE + (arg ? '/' + encodeURIComponent(arg) : ''); }
  function lesaSlod(hash) {
    const h = String(hash != null ? hash : (location.hash || ''));
    if (h === '#' + ROUTE) return '';
    const m = /^#greining\/(.*)$/.exec(h);
    if (!m) return null;
    // 235 (SubRoutes.setHash) kóðar hlutann AFTUR eftir opnun („%25C3%25B3") — afkóðað þar til ekkert breytist
    let t = m[1];
    for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(t); i++) { try { const n = decodeURIComponent(t); if (n === t) break; t = n; } catch (_) { break; } }
    return t;
  }
  function setjaSlod(arg) { try { const w = slodFyrir(arg); if (location.hash !== w) history.replaceState(null, '', location.pathname + location.search + w); } catch (_) {} }

  async function tilbuid() {
    for (let i = 0; i < 300; i++) {
      if (window.Companies && typeof Companies.openDetail === 'function' && window._openCompanySafe && sb() && Array.isArray(Companies.list) && Companies.list.length > 50) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return !!(window.Companies && window._openCompanySafe);
  }

  // Greinir inntakið (heimilisfang / landnúmer / kennitala) í heimilisfang. Skilar { adr, kt, villa }.
  async function leysa(arg) {
    const t = String(arg || '').trim();
    if (!t) return { adr: '' };
    if (erKt(t)) {
      const kt = t.replace(/\D/g, '');
      const okkar = (Companies.list || []).filter((c) => c && +c.id !== SYND && String(c.kennitala || '').replace(/\D/g, '') === kt && !c.deleted_at);
      if (okkar.length && okkar[0].heimilisfang) return { adr: okkar[0].heimilisfang, kt };
      try {
        const gm = ktGeymt(kt);
        const u = gm || await lota('kt|' + kt, () => ktUppfletting(kt, false));
        const d = u && u.d;
        if (d && d.heimilisfang_full) return { adr: d.heimilisfang_full, kt };
        return { adr: '', kt, villa: 'Kennitalan fannst ekki eða hefur ekkert lögheimili í fyrirtækjaskrá.' };
      } catch (e) { return { adr: '', kt, villa: 'Uppfletting kennitölu brást: ' + ((e && e.message) || e) }; }
    }
    if (erLandnr(t)) {
      const nr = t.replace(/\D/g, '');
      try {
        const r = await fetch('/.netlify/functions/landnr?leit=' + encodeURIComponent(nr), { signal: AbortSignal.timeout(12000) });
        const d = await r.json();
        const x = ((d && d.results) || []).find((y) => String(y.landnr) === nr) || null;
        if (x) { const m = /^(.*?)\s*\((\d{3})\)/.exec(x.label || ''); return { adr: m ? m[1].trim() + ', ' + m[2] : String(x.label || '').replace(/\s*-\s*L\s*\d+$/, ''), landnr: +nr }; }
      } catch (_) {}
      return { adr: '', villa: 'Landnúmerið ' + nr + ' fannst ekki í Landeignaskrá.' };
    }
    return { adr: t };
  }

  // Næstu húsnúmer við götuna, sömu megin fyrst: „Vegamótastígur 9" → Vegamótastígur 7, 4 (Staðfangaskrá: tillogur fasteign-opin)
  function naestu(adr, tillogur) {
    const m = /\s(\d+)\s*[a-záðéíóúýþæö]?(?=[\s,]|$)/i.exec(String(adr || ''));
    const n = m ? +m[1] : null;
    const nr = (t) => { const x = /\s(\d+)/.exec(String(t || '')); return x ? +x[1] : null; };
    const fj = (t) => { const k = nr(t); return n == null || k == null ? 999 : Math.abs(k - n) + (k % 2 !== n % 2 ? 0.5 : 0); };
    return (tillogur || []).slice().sort((a, b) => fj(a) - fj(b));
  }
  let _opnar = null;
  // Sýndarprófíllinn aftur á skjáinn (eftir ræsilendingu sem skipti um sýn) — sama uppfletting, engin ný sókn
  function endurvekja() {
    atb('endurvekja ' + location.hash.slice(0, 30));
    setjaSynd(S.adr);
    S.virkt = true;
    if (window.Sydarvordur) Sydarvordur.virkt = true;
    try { window._openCompanySafe(SYND); } catch (_) {}
    setjaSlod(S.arg);
    festa();
  }
  async function opna(arg, o) {
    o = o || {};
    S.arg = String(arg == null ? '' : arg).trim();
    S.iOpnun = Date.now();
    atb('opna ' + S.arg);
    setjaSlod(S.arg);
    injectCss();
    if (!(await tilbuid())) { S.iOpnun = 0; atb('ekki tilbúið'); return; }
    atb('tilbúið ' + ((window.Companies && Companies.list) || []).length);
    const nr = ++S.nr;
    const lausn = await leysa(S.arg);
    if (nr !== S.nr) return;
    S.adr = lausn.adr || '';
    S.kt = lausn.kt || '';
    S.tegundVal = null;
    S.g = { nr, arg: S.arg, adr: S.adr, kt: S.kt, villa: lausn.villa || null, landnrInn: lausn.landnr || null, parts: {} };
    setjaSynd(S.adr || '');
    S.virkt = true;
    S.opnad = Date.now();
    if (window.Sydarvordur) Sydarvordur.virkt = true;
    // Opnað eins og smellur á fyrirtæki (mapfix _openCompanySafe): sama sýn, sama teikning — #company/<id> án skrifa.
    // Sé sýndarprófíllinn þegar á skjánum (Sækja með nýju heimilisfangi) hættir _openCompanySafe strax (sama félag) —
    // þá er teiknað beint svo borðinn (nafn, staður, 363, 367) fái nýja heimilisfangið.
    try {
      if (synileg() && Companies.openDetail) { Companies._openedAt = 0; Companies.openDetail(SYND); }
      else window._openCompanySafe(SYND);
    } catch (e) { console.warn('[451] opnun', e); }
    setjaSlod(S.arg);
    festa();
    // Ræsilendingar (Sala um t≈1,5 s) og Companies.load() geta skrifað yfir prófílinn — opnað aftur þar til notandinn snertir
    if (_opnar) clearInterval(_opnar);
    // Mælt 09.10.2026 (Laugavegur 120, 1600 px): ræsilendingin skipti yfir á Sölu EFTIR opnun, setti #sala í slóðina,
    // og vaktin hætti af því að slóðin var ekki lengur #greining — síðan sat á Sölu. Nú (eins og 357 gerir fyrir
    // #company/<id>): þar til notandinn snertir síðuna, eða í 9 s, er sýndarprófíllinn endurvakinn og slóðin sett aftur.
    let n = 0;
    _opnar = setInterval(() => {
      const snert = window.UrlRouting && UrlRouting.userTouched && UrlRouting.userTouched();
      // 25 s: á hlaðinni vél (Blender + OCR á sömu tölvu) kom ræsilendingin allt að ~10 s eftir opnun
      if (++n > 84 || nr !== S.nr || snert || o.ekkiAftur) { clearInterval(_opnar); _opnar = null; return; }
      if (!synileg()) endurvekja(); else setjaSlod(S.arg);
    }, 300);
    S.iOpnun = 0;
    hlada(nr);
  }

  /* ── FESTING Á PRÓFÍLINN (MutationObserver á #companies-main, beinum börnum) ─────────────────────────────── */
  function festa() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const banner = main.querySelector(':scope > .co-banner');
    const erSynd = !!(banner && main.querySelector('button[onclick*="Companies.openEdit(' + SYND + ')"]'));
    if (!erSynd) {
      if (main.classList.contains('gr-sydar')) main.classList.remove('gr-sydar');
      const k = document.getElementById(ID); if (k && k.parentNode === main) k.remove();
      // annað fyrirtæki eða listinn opnaðist → sýndarprófíllinn er farinn
      if (S.virkt && banner && Companies.currentId !== SYND) slokkva();
      return;
    }
    if (!S.virkt) return;
    if (!main.classList.contains('gr-sydar')) main.classList.add('gr-sydar');
    setjaSlod(S.arg);
    hausReitur(banner);
    buppStadgengill(banner);
    let k = document.getElementById(ID), nytt = false;
    if (!k) { k = smidaSpjold(); nytt = true; }
    // staður: beint á eftir borðanum — aðeins hreyft ef rangt (Stöðugt viðmót, regla 4)
    if (k.parentNode !== main || k.previousElementSibling !== banner) banner.after(k);
    // fyllt EFTIR innsetningu — spjald(lyk) finnur aðeins hnút sem er í skjalinu
    if (nytt) fyllaAllt();
    hlekkir363(main);
  }
  let _vaktTilr = 0;
  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) { if (++_vaktTilr < 80) setTimeout(vakta, 400); return; }
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO((ms) => {
      for (const m of ms) {
        const breytt = [...m.addedNodes, ...m.removedNodes].some((x) => x.nodeType === 1 && x.id !== ID);
        if (breytt) { try { festa(); } catch (e) { console.warn('[451] festa', e); } return; }
      }
    }).observe(main, { childList: true });
  }

  // 363-teikningahlekkir á sýndarprófílnum: forskoðun ÁN félags (annars opnar „Opna í TurboPaint“ borð fyrir -987654321)
  function hlekkir363(main) {
    if (main.__gr363) return;
    main.__gr363 = true;
    window.addEventListener('click', (e) => {
      if (!S.virkt) return;
      const t = e.target && e.target.closest ? e.target.closest('._bupp-teikn') : null;
      if (!t || !t.closest('#companies-main.gr-sydar')) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const eign = S.g && S.g.eign;
      const landnr = t.dataset.landnr || (eign && eign.landnr);
      if (!landnr || !window.TeikningaForskodun) { segja('Teikningar hússins eru í spjaldinu „Teikningar“ hér fyrir neðan.'); return; }
      const svf = t.dataset.svf || (eign && eign.svf);
      TeikningaForskodun.opna(landnr, (eign && eign.label) || S.adr, null, svf ? { svf, heitinr: t.dataset.heitinr || (eign && eign.heitinr) || 0, sia: 'grunn' } : { sia: 'grunn' });
    }, true);
  }

  // Staðgengill fyrir Uppfærsluborð 431 (.co-bupp) — sama grid-svæði og hæð, víkur í sama tifi og 431 setur borðið inn
  // (MutationObserver keyrir á undan málun, svo ramminn milli þeirra sést aldrei). Hverfur sjálfur eftir 15 s komi 431 ekki.
  function buppStadgengill(banner) {
    const til = banner.querySelector(':scope > .co-bupp');
    let st = banner.querySelector(':scope > .gr-bupp-st');
    if (til) { if (st) st.remove(); return; }
    if (st || banner.__grBuppLokid) return;
    st = document.createElement('div');
    st.className = 'gr-bupp-st';
    st.setAttribute('aria-hidden', 'true');
    const fyrir = banner.querySelector(':scope > .co-banner-right') || banner.querySelector(':scope > .b405-knappar') || banner.querySelector(':scope > .b405-facts');
    if (fyrir) banner.insertBefore(st, fyrir); else banner.appendChild(st);
    let t = 0;
    const mo = new MutationObserver(() => { if (banner.querySelector(':scope > .co-bupp')) lok(); });
    const lok = () => { banner.__grBuppLokid = true; mo.disconnect(); clearTimeout(t); if (st.isConnected) st.remove(); };
    mo.observe(banner, { childList: true });
    t = setTimeout(lok, 15000);
  }

  /* ── HAUSINN: breytanlegt heimilisfang + tillögur + Sækja ──────────────────────────────────────────────────── */
  function hausReitur(banner) {
    const id = banner.querySelector('.co-banner-id');
    if (!id) return;
    let f = id.querySelector(':scope > .gr-leit');
    if (f) { const inp = f.querySelector('.gr-inn'); if (inp && document.activeElement !== inp && inp.value !== S.arg) inp.value = S.arg; return; }
    f = document.createElement('form');
    f.className = 'gr-leit';
    f.setAttribute('role', 'search');
    f.innerHTML = '<span class="gr-merki" title="Sýndarprófíll — ekkert er vistað á fyrirtæki">Greining fasteignar</span>' +
      '<div class="gr-innwrap"><span class="gr-glr">' + svg(IK.leit, 15) + '</span>' +
      '<input class="gr-inn" type="search" name="heimilisfang" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="Heimilisfang, landnúmer eða kennitala" placeholder="Heimilisfang, landnúmer eða kennitala" value="' + esc(S.arg) + '">' +
      '<div class="gr-tillogur" role="listbox" hidden></div></div>' +
      '<button type="submit" class="gr-saekja">Sækja</button>';
    id.appendChild(f);
    if (!id.querySelector(':scope > .gr-haus-mynd')) {
      const hm = document.createElement('button');
      hm.type = 'button'; hm.className = 'gr-haus-mynd'; hm.setAttribute('aria-label', 'Mynd af húsinu');
      hm.innerHTML = '<span>' + esc(String(S.arg || '').slice(0, 2).toUpperCase()) + '</span>';
      hm.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const u = hm.getAttribute('data-gr-ljos'); if (u) ljos(u, hm.getAttribute('data-gr-titill') || 'Mynd af húsinu'); });
      const mono = id.querySelector(':scope > .co-banner-mono');
      if (mono) id.insertBefore(hm, mono); else id.insertBefore(hm, id.firstChild);
      hausMynd(S.g);
    }
    hausProfill(S.g && S.g.hja && S.g.hja.listi ? S.g.hja.listi.map((r) => r.co) : []);
    const inp = f.querySelector('.gr-inn'), till = f.querySelector('.gr-tillogur');
    ['click', 'keydown', 'keyup', 'keypress', 'input'].forEach((ev) => inp.addEventListener(ev, (e) => e.stopPropagation()));
    let seq = 0, tof = 0, virkI = -1, radir = [];
    const loka = () => { if (!till.hidden) till.hidden = true; virkI = -1; };
    const syna = () => {
      till.innerHTML = radir.map((r, i) => '<button type="button" class="gr-till' + (i === virkI ? ' virk' : '') + '" role="option" data-i="' + i + '">' + esc(r.texti) + (r.merki ? '<small>' + esc(r.merki) + '</small>' : '') + '</button>').join('');
      till.hidden = !radir.length;
    };
    const velja = (r) => { inp.value = r.gildi; S.hausInn = null; S.hausFokus = false; loka(); opna(r.gildi); };
    // 367 getur teiknað borðann upp á nýtt meðan slegið er inn — þá fylgir innslátturinn og fókusinn nýja reitnum
    inp.addEventListener('focus', () => { S.hausFokus = true; });
    inp.addEventListener('blur', () => setTimeout(() => { if (inp.isConnected) S.hausFokus = false; }, 0));
    if (S.hausFokus && S.hausInn != null && S.hausInn !== S.arg) {
      inp.value = S.hausInn;
      setTimeout(() => { if (!inp.isConnected) return; inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (_) {} inp.dispatchEvent(new Event('input')); }, 0);
    }
    inp.addEventListener('input', () => {
      clearTimeout(tof);
      S.hausInn = inp.value;
      const q = inp.value.trim();
      if (q.length < 3 || erKt(q)) { radir = []; loka(); return; }
      tof = setTimeout(async () => {
        const my = ++seq;
        // okkar staðir fyrst (nafn eða heimilisfang), svo Landeignaskrá (sama leit og 325 Landnr.search)
        const qa = afbr(q);
        const okkar = (Companies.list || []).filter((c) => c && +c.id !== SYND && !c.deleted_at && (afbr(c.heimilisfang).includes(qa) || afbr(c.nafn).includes(qa))).slice(0, 4)
          .map((c) => ({ texti: (c.heimilisfang || c.nafn), merki: c.nafn, gildi: c.heimilisfang || c.nafn }));
        const sameina = (hms) => {
          const sed = new Set();
          radir = okkar.concat(hms).filter((r) => { const k = afbr(r.gildi); if (sed.has(k)) return false; sed.add(k); return true; }).slice(0, 10);
          virkI = -1; syna();
        };
        if (okkar.length) sameina([]);   // okkar skrá strax — Landeignaskrá bætist við þegar hún svarar
        let hms = [];
        try {
          const rows = window.Landnr && Landnr.search ? await Landnr.search(q) : [];
          hms = rows.slice(0, 8).map((r) => {
            const m = /^(.*?)\s*\((\d{3})\)/.exec(r.label || '');
            const gildi = m ? m[1].trim() + ', ' + m[2] : String(r.label || '').replace(/\s*-\s*L\s*\d+$/, '');
            return { texti: gildi, merki: 'L ' + r.landnr, gildi };
          });
        } catch (_) {}
        if (my !== seq) return;
        sameina(hms);
      }, 280);
    });
    inp.addEventListener('keydown', (e) => {
      if (till.hidden) { if (e.key === 'Escape' && inp.value) { inp.value = ''; } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); virkI = Math.min(radir.length - 1, virkI + 1); syna(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); virkI = Math.max(-1, virkI - 1); syna(); }
      else if (e.key === 'Escape') { e.preventDefault(); loka(); }
      else if (e.key === 'Enter' && virkI >= 0) { e.preventDefault(); velja(radir[virkI]); }
    });
    till.addEventListener('mousedown', (e) => e.preventDefault());
    till.addEventListener('click', (e) => { const b = e.target.closest('.gr-till'); if (b) velja(radir[+b.dataset.i]); });
    inp.addEventListener('blur', () => setTimeout(loka, 120));
    f.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); S.hausInn = null; S.hausFokus = false; loka(); opna(inp.value); });
  }

  /* ── SPJÖLDIN — smíðuð einu sinni, fyllt hvert fyrir sig ─────────────────────────────────────────────────── */
  const SPJOLD = [
    ['samantekt', 'Samantekt', 210],
    ['eign', 'Eignin', 230],
    ['hja', 'Hjá okkur', 64],
    ['bygg', 'Byggingarupplýsingar', 150],
    ['bruna', 'Brunavarnir úr byggingarlýsingu', 96],
    ['krofur', 'Kröfur eftir tegund', 180],
    ['teikn', 'Teikningar', 190],
    ['rekstur', 'Rekstur og fyrirtækið', 80],
    ['heimildir', 'Heimildir og hömlur', 120],
  ];
  function smidaSpjold() {
    const k = document.createElement('section');
    k.id = ID;
    k.setAttribute('aria-label', 'Greining fasteignar');
    k.innerHTML = SPJOLD.map(([lyk, heiti, h]) =>
      '<div class="ssp gr-spjald" data-gr="' + lyk + '">' +
        '<div class="ssp-haus"><span class="ssp-titill">' + esc(heiti) + '</span><span class="ssp-undir" data-gr-undir></span>' +
        '<span class="ssp-hlid"><span class="gr-stada" data-gr-stada></span></span></div>' +
        '<div class="ssp-buk gr-buk" style="--gr-h:' + h + 'px" data-gr-buk><div class="gr-tomt">Sæki…</div></div></div>').join('');
    k.addEventListener('click', smellur);
    return k;
  }
  const spjald = (lyk) => { const k = document.getElementById(ID); return k ? k.querySelector('[data-gr="' + lyk + '"]') : null; };
  function setjaStodu(lyk, stada, texti) {
    const s = spjald(lyk); if (!s) return;
    const el = s.querySelector('[data-gr-stada]');
    const led = stada === 'saeki' ? 'gull' : stada === 'villa' ? 'rautt' : stada === 'komid' ? 'graent' : '';
    const html = (led ? '<i class="ssp-led ' + led + '"></i>' : '<i class="ssp-led"></i>') + esc(texti || '');
    if (el && el._h !== html) { el.innerHTML = html; el._h = html; }
  }
  function setjaUndir(lyk, texti) {
    const s = spjald(lyk); if (!s) return;
    const el = s.querySelector('[data-gr-undir]');
    if (el && el.textContent !== (texti || '')) el.textContent = texti || '';
  }
  // BIRTING Í RÖÐ (Stöðugt viðmót): spjald sýnir efni sitt aðeins þegar SÍN gögn eru komin OG öll spjöld fyrir ofan eru
  // birt. Þá ýtir spjald sem stækkar aðeins frátekinni hæð (staðgenglum) niður — aldrei efni sem notandinn er þegar að lesa.
  // Samantektin efst er föst að stærð og birtist strax. Hausinn (staða) uppfærist alltaf — hann er fastur á hæð.
  const KORT_HLUTAR = { samantekt: [], eign: ['opin', 'bygg'], hja: ['hja'], bygg: ['bygg', 'opin'], bruna: ['bygg', 'teikn'], krofur: ['krofur', 'bygg', 'hja', 'opin', 'rekstur', 'teikn'], teikn: ['teikn', 'bygg'], rekstur: ['rekstur', 'opin', 'teikn'], heimildir: ['heimildir'] };
  function hlutiLokid(g, l) {
    const p = g.parts[l];
    if (!p) return !g.adr;                          // án heimilisfangs eru hlutarnir ekki sóttir
    if (p.stada !== 'saeki') return true;
    return l === 'bygg' && !!g.byggGeymt;          // geymt svar af þjóninum er birt meðan ferskt er sótt
  }
  // Merki á hvern reit (data-l = haus dálksins) — í síma verður taflan að spjöldum og hausinn hverfur
  function tdMerki(html) {
    const hausar = []; const m = /<thead>([\s\S]*?)<\/thead>/.exec(html);
    if (m) m[1].replace(/<th>([\s\S]*?)<\/th>/g, (_, t) => { hausar.push(t.replace(/<[^>]+>/g, '')); return _; });
    if (!hausar.length) return html;
    return html.replace(/<tr>([\s\S]*?)<\/tr>/g, (rod, inn) => { let i = 0; return '<tr>' + inn.replace(/<td(\s|>)/g, (_, c) => { const h = hausar[i++]; return h ? '<td data-l="' + h + '"' + c : _; }) + '</tr>'; });
  }
  function setjaBuk(lyk, html) {
    const s = spjald(lyk); if (!s) return;
    const b = s.querySelector('[data-gr-buk]');
    if (!b) return;
    b._ny = html;
    birta();
  }
  function birta() {
    const g = S.g, k = document.getElementById(ID);
    if (!g || !k) return;
    let fyrriBirt = true;
    for (const [lyk] of SPJOLD) {
      const s = k.querySelector('[data-gr="' + lyk + '"]'); if (!s) continue;
      const b = s.querySelector('[data-gr-buk]');
      const mitt = (KORT_HLUTAR[lyk] || []).every((l) => hlutiLokid(g, l));
      const ma = fyrriBirt && mitt;
      if (ma && b._ny != null && b._h !== b._ny) {
        const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(b) : null;
        b.innerHTML = b._ny; b._h = b._ny;
        if (b.dataset.birt !== '1') b.dataset.birt = '1';   // mælingin (tools/greining-vafri) greinir birt efni frá staðgenglum
        if (lyk === 'eign') { kortFesta(b); loftFesta(b); }
        fskFesta(b);
        if (lyk === 'bruna') { batFesta(b); batMerkja(); }
        if (aftur) aftur();
      }
      fyrriBirt = ma && b._h != null;
    }
  }
  function fyllaAllt() {
    const g = S.g;
    if (!g) return;
    Object.keys(TEIKNA).forEach((lyk) => { try { TEIKNA[lyk](g); } catch (e) { console.warn('[451] teikna ' + lyk, e); } });
  }
  function teikna(lyk) { const g = S.g; if (!g || !TEIKNA[lyk]) return; try { TEIKNA[lyk](g); } catch (e) { console.warn('[451] teikna ' + lyk, e); } }

  /* ── HLEÐSLA — hver hluti sjálfstæður ───────────────────────────────────────────────────────────────────── */
  function hlada(nr) {
    const g = S.g;
    if (!g || g.nr !== nr) return;
    const eftir = (lyk, p) => {
      g.parts[lyk] = { stada: 'saeki' };
      ['samantekt', lyk].forEach(teikna);
      return p.then((v) => { if (S.g !== g) return; g.parts[lyk] = { stada: 'komid', t: Date.now() }; g[lyk] = v; }, (e) => {
        if (S.g !== g) return;
        g.parts[lyk] = { stada: 'villa', villa: (e && e.message) || String(e) };
        try { if (window.logProblem) window.logProblem('greining_' + lyk, g.parts[lyk].villa); } catch (_) {}
      }).then(() => { if (S.g === g) { teikna(lyk); teikna('samantekt'); afleidd(lyk); } });
    };
    if (!g.adr) {
      ['bygg', 'teikn', 'rekstur', 'hja'].forEach((l) => { g.parts[l] = { stada: g.villa ? 'villa' : 'tomt', villa: g.villa }; });
      fyllaAllt();
      eftir('heimildir', heimildirSkra());
      eftir('krofur', krofurGogn());
      return;
    }
    eftir('hja', hjaOkkur(g));
    eftir('bygg', byggingGogn(g));
    eftir('opin', opinGogn(g));
    eftir('krofur', krofurGogn());
    eftir('heimildir', heimildirSkra());
    // teikningar og rekstur bíða eftir „hjá okkur“ (viðskiptavinur með hæðir → hans hæðir; kt fyrir fyrirtækjaskrá)
    eftir('teikn', hjaOkkur(g).catch(() => null).then((hja) => teikningar(g, hja)));
    eftir('rekstur', hjaOkkur(g).catch(() => null).then((hja) => rekstur(g, hja)));
  }
  // Afleidd gögn sem fleiri spjöld nota (tegund, áætlaður tækjafjöldi) og skyndiminni á þjóninum
  function afleidd(lyk) {
    const g = S.g; if (!g) return;
    if (lyk === 'bygg' || lyk === 'hja' || lyk === 'rekstur' || lyk === 'krofur' || lyk === 'opin') { teikna('krofur'); teikna('samantekt'); }
    if (lyk === 'opin') { teikna('bygg'); teikna('rekstur'); vefTitlar(g); }
    if (lyk === 'bygg') teikna('bruna');
    if (lyk === 'bygg' || lyk === 'opin') teikna('eign');
    if (lyk === 'bygg' || lyk === 'teikn') vistaSkyndi(g);
    if (lyk === 'teikn') { teikna('bygg'); teikna('bruna'); teikna('krofur'); teikna('rekstur'); hausMynd(g); }
    if (lyk === 'opin' || lyk === 'bygg') loftSaekja(g);
    teikna('heimildir');
  }

  const TEIKNA = {};   // lyk → teikningarfall spjalds (skilgreint hér á undan öllum TEIKNA.x)

  /* 0 · EIGNIN — staðfang, landnúmer, sveitarfélag, matshlutar, lóð og kort (Esri, eins og restin af appinu) ─────── */
  const SVF = { '0000': 'Reykjavík', '1000': 'Kópavogur', '1100': 'Seltjarnarnes', '1300': 'Garðabær', '1400': 'Hafnarfjörður', '1604': 'Mosfellsbær', '2000': 'Reykjanesbær', '3000': 'Akranes', '6000': 'Akureyri' };
  TEIKNA.eign = (g) => {
    const po = g.parts.opin || {}, pb = g.parts.bygg || {};
    if (!g.adr) {
      setjaStodu('eign', 'tomt', g.villa ? 'villa' : 'bíður');
      // landnúmer sem er ekki (lengur) í Landeignaskrá — oft sameinuð lóð: teikningar þess geta samt verið í skjalasafninu
      const ln = erLandnr(g.arg) ? String(g.arg).replace(/\D/g, '') : '';
      setjaBuk('eign', '<div class="' + (g.villa ? 'gr-villa' : 'gr-tomt') + '">' + esc(g.villa || 'Ekkert heimilisfang.') + (ln ? ' Lóðin gæti hafa verið sameinuð annarri — sláðu inn heimilisfang eða næsta húsnúmer í hausnum.' : '') + '</div>' +
        (ln && window.TeikningaForskodun ? '<div class="gr-takkar" style="margin-top:6px"><button type="button" class="ssp-btn" data-gr-a="teikn-landnr" data-l="' + esc(ln) + '">Teikningar L' + esc(ln) + ' í skjalasafni</button></div>' : ''));
      return;
    }
    if ((po.stada === 'saeki' || !po.stada) && (pb.stada === 'saeki' || !pb.stada)) { setjaStodu('eign', 'saeki', 'sæki Staðfangaskrá…'); return; }
    const o = g.opin && g.opin.eign, e = (g.bygg && g.bygg.eign) || g.eignHus || {};
    if (!o && !e.landnr) {
      setjaStodu('eign', po.stada === 'villa' ? 'villa' : 'tomt', 'fannst ekki');
      const till = naestu(g.adr, g.opinTillogur);
      setjaBuk('eign', '<div class="gr-tomt"><b>„' + esc(g.adr) + '" fannst ekki í Staðfangaskrá HMS.</b> Athugaðu húsnúmer og póstnúmer — tillögur birtast líka meðan slegið er inn í hausnum.</div>' +
        (till.length ? '<div class="ssp-skilti">Staðföng sem eru til á götunni</div><div class="gr-takkar" style="margin-top:4px">' + till.map((t) => '<button type="button" class="ssp-btn" data-gr-a="opna" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' : ''));
      return;
    }
    const landnr = (o && o.landnr) || e.landnr, heitinr = (o && o.heitinr) || e.heitinr;
    const svfnr = (o && o.svfnr) || '';
    const svf = SVF[svfnr] || (e.svf ? ({ 1000: 'Kópavogur', 1100: 'Seltjarnarnes', 1300: 'Garðabær', 1400: 'Hafnarfjörður' })[e.svf] : '') || (svfnr ? 'svf. ' + svfnr : '—');
    const st = g.bygg && g.bygg.skraningartafla;
    const mhl = [...new Set([].concat(st && st.matshluti ? [st.matshluti] : [], (g.opin && g.opin.einingar && g.opin.einingar.mhl) || []))];
    const lod = g.opin && g.opin.lod;
    setjaStodu('eign', 'komid', 'L' + landnr);
    setjaUndir('eign', (o && o.label) || e.label || '');
    const lina = (m, v) => '<div class="ssp-lina"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi">' + v + '</span></div>';
    const lat = o && isFinite(o.lat) ? o.lat : null, lon = o && isFinite(o.lon) ? o.lon : null;
    setjaBuk('eign', '<div class="gr-eign"><div class="ssp-reitir gr-eign-reitir">' +
      lina('Staðfang', esc((o && o.label) || e.label || g.adr) + (((o && o.postnr) || e.postnr) ? ', ' + esc((o && o.postnr) || e.postnr) : '')) +
      lina('Landnúmer', '<a class="gr-hl" href="https://geo.fasteignaskra.is/landeignaskra/' + encodeURIComponent(landnr) + '" target="_blank" rel="noopener">L' + esc(landnr) + '</a>') +
      lina('Heitinúmer', heitinr ? esc(heitinr) : '—') +
      lina('Sveitarfélag', esc(svf) + (e.safn ? ' <span class="ssp-daufur">· ' + esc(e.safn) + '</span>' : '')) +
      lina('Matshlutar', mhl.length ? esc(mhl.join(', ')) + (st && st.matshluti ? ' <span class="ssp-daufur">(tafla: ' + esc(st.matshluti) + ')</span>' : '') : '—') +
      lina('Lóð', lod && (lod.skrad_m2 || lod.maeld_m2) ? tala(lod.skrad_m2 || lod.maeld_m2) + ' m²' + (lod.gerd ? ' <span class="ssp-daufur">' + esc(lod.gerd) + '</span>' : '') : '—') +
      '</div><div class="gr-kort" data-gr-kort' + (lat != null ? ' data-lat="' + lat + '" data-lon="' + lon + '"' : '') + '>' + (lat == null ? '<div class="gr-tomt" style="padding:12px">Hnit fengust ekki' + (po.stada === 'villa' ? ' (' + esc(po.villa) + ')' : '') + '.</div>' : '') + '</div>' +
      '<div class="gr-loft" data-gr-loft data-adr="' + esc(loftAdr(g, o, e)) + '"><div class="gr-tomt" style="padding:12px">Sæki loftmynd…</div></div></div>' +
      '<div class="gr-uppruni">Staðfangaskrá og Landeignaskrá HMS (opið WFS) · kort: Flísar © Esri, HERE, Garmin, © OpenStreetMap contributors · loftmynd: Borgarvefsjá 2018 (Reykjavík) / map.is (Kópavogur, Garðabær, Hafnarfjörður)<span class="gr-sjalf">sjálfsótt</span></div>');
  };
  // Loftmynd hússins — /api/husmynd (Borgarvefsjá 2018 í Reykjavík · map.is í Kópavogi, Garðabæ og Hafnarfirði; notkun map.is
  // samþykkt af Agnari 09.10.2026). EIN sókn á uppflettingu, geymd í lotunni (blob-slóð) — hófleg notkun, engin fjöldasókn.
  function loftAdr(g, o, e) {
    const lab = (o && o.label) || e.label, pn = (o && o.postnr) || e.postnr;
    return lab ? lab + (pn ? ', ' + pn : '') : g.adr;
  }
  function loftmynd(adr) {
    return lota('loft|' + afbr(adr), async () => {
      const r = await fetch('/api/husmynd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: adr }) });
      const j = await r.json().catch(() => null);
      if (!j || !j.ok || !j.image) return { ok: false, villa: (j && j.error) || ('HTTP ' + r.status) };
      const bin = atob(j.image), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return { ok: true, url: URL.createObjectURL(new Blob([u8], { type: j.contentType || 'image/jpeg' })), attr: j.attribution || 'Loftmynd' };
    });
  }
  function loftFesta(b) {
    const el = b && b.querySelector('[data-gr-loft]');
    if (!el || !el.dataset.adr) return;
    const adr = el.dataset.adr;
    const tomt = (t) => '<div class="gr-tomt" style="padding:12px">' + t + '</div>';
    loftmynd(adr).then((m) => {
      // „Heimildir og hömlur" segir hvað kom fyrir ÞETTA heimilisfang — óbirt spjald teiknað upp á nýtt, birt uppfært á staðnum
      const g = S.g;
      if (g && !(g.loft && g.loft.adr === adr)) {
        g.loft = { adr, ok: m.ok, attr: m.attr || '', villa: m.villa || '', url: m.url || null };
        teikna('samantekt'); hausMynd(g);
        const hb = document.querySelector('#' + ID + ' [data-gr="heimildir"] [data-gr-buk]');
        if (hb && hb.dataset.birt !== '1') teikna('heimildir');
        else document.querySelectorAll('#' + ID + ' [data-gr-hher]').forEach((sp) => { const t = herna(sp.getAttribute('data-gr-hher'), g); if (t && sp.textContent !== 'Hér: ' + t) sp.textContent = 'Hér: ' + t; });
      }
      if (!el.isConnected) return;
      if (!m.ok) { el.style.cursor = 'default'; el.innerHTML = tomt(m.villa === 'engin-mynd' ? 'Engin loftmynd — utan þekju (Reykjavík 2018 · map.is: Kópavogur, Garðabær, Hafnarfjörður).' : 'Loftmynd fékkst ekki (' + esc(m.villa) + ').'); return; }
      el.innerHTML = '<img alt="Loftmynd af ' + esc(adr) + '" src="' + m.url + '"><span class="gr-loft-merki">' + esc(m.attr) + ' · sjálfsótt</span>';
      el.setAttribute('data-gr-ljos', m.url); el.setAttribute('data-gr-titill', 'Loftmynd — ' + adr + ' · ' + m.attr);
      el.title = 'Loftmynd að ofan — smelltu til að stækka';
    }, (err) => { if (el.isConnected) el.innerHTML = tomt('Loftmynd fékkst ekki (' + esc((err && err.message) || err) + ').'); });
  }
  // Sama loftmynd fyrir Samantekt og haus — sótt um leið og eignin er þekkt, óháð því hvenær Eignin birtist
  function loftSaekja(g) {
    if (!g || g.loftBid || (g.loft && g.loft.adr)) return;
    const o = g.opin && g.opin.eign, e = (g.bygg && g.bygg.eign) || g.eignHus || {};
    if (!o && !e.label) return;
    const adr = loftAdr(g, o, e);
    g.loftBid = true;
    loftmynd(adr).then((m) => {
      if (S.g !== g || (g.loft && g.loft.adr)) return;
      g.loft = { adr, ok: m.ok, attr: m.attr || '', villa: m.villa || '', url: m.url || null };
      teikna('samantekt'); hausMynd(g);
    }, () => { g.loftBid = false; });
  }
  // Leaflet-kortið sett í fasta hólfið (220 px) eftir að spjaldið birtist — eitt kort, endurnýtt
  let _kort = null, _lfP = null;
  // Leaflet er ekki í index.html — hlaðið eftir þörf eins og 155/178 gera (sama útgáfa, sama slóð). Mælt 09.10: án þessa
  // var kortahólfið autt grátt á öllum prófum (window.L undefined).
  function lfHlada() {
    if (window.L && L.map) return Promise.resolve();
    if (_lfP) return _lfP;
    _lfP = new Promise((resolve, reject) => {
      if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      }
      const til = document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]');
      const sc = til || document.createElement('script');
      sc.addEventListener('load', () => resolve());
      sc.addEventListener('error', () => { _lfP = null; reject(new Error('Leaflet hlóðst ekki')); });
      if (!til) { sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; document.head.appendChild(sc); }
      else if (window.L && L.map) resolve();
    });
    return _lfP;
  }
  function kortFesta(b) {
    const el = b && b.querySelector('[data-gr-kort][data-lat]');
    if (!el) return;
    if (!window.L || !L.map) { lfHlada().then(() => { if (el.isConnected) kortFesta(b); }, (e) => console.warn('[451] kort', e)); return; }
    const lat = +el.dataset.lat, lon = +el.dataset.lon;
    try {
      if (_kort) { try { _kort.remove(); } catch (_) {} _kort = null; }
      _kort = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([lat, lon], 17);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: 'Flísar © Esri, HERE, Garmin, © OpenStreetMap contributors', maxZoom: 19 }).addTo(_kort);
      L.circleMarker([lat, lon], { radius: 9, color: '#fff', weight: 2, fillColor: '#b42318', fillOpacity: 1 }).addTo(_kort);
    } catch (e) { console.warn('[451] kort', e); }
  }

  /* 1 · HJÁ OKKUR ────────────────────────────────────────────────────────────────────────────────────────── */
  function hjaOkkur(g) {
    return lota('hja|' + afbr(g.adr) + '|' + g.kt, async () => {
      await tengdur();
      const listi = (Companies.list || []).filter((c) => c && +c.id !== SYND && !c.deleted_at &&
        ((g.adr && c.heimilisfang && samaHeimili(c.heimilisfang, g.adr)) || (g.kt && String(c.kennitala || '').replace(/\D/g, '') === g.kt)));
      const ids = listi.map((c) => +c.id).slice(0, 12);
      if (!ids.length) return { listi: [], ids: [], leitad: (Companies.list || []).length };
      const c = sb();
      // 1000-raða þakið: rekstrarfélag með marga staði getur átt > 1000 tæki — blaðsíðuflett (DB.fetchAll)
      const [uRadir, tb, fl] = await Promise.all([
        DB.fetchAll((f, t) => c.from('uttaeki').select('id,fyrirtaeki_id,status,last_insp').in('fyrirtaeki_id', ids).order('id').range(f, t)),
        c.from('teikning_bord').select('company_id,haedir,image_url,markers,updated_at').in('company_id', ids),
        window.Flokkun ? Promise.all(ids.map((id) => Flokkun.stadur(id).catch(() => null))) : Promise.resolve([]),
      ]);
      if (tb.error) throw tb.error;
      const radir = listi.slice(0, 12).map((co, i) => {
        const tk = (uRadir || []).filter((x) => +x.fyrirtaeki_id === +co.id && String(x.status) !== 'urelt');
        const sid = tk.map((x) => x.last_insp).filter(Boolean).sort().pop() || null;
        const bord = (tb.data || []).find((x) => +x.company_id === +co.id) || null;
        const st = fl[i] || null;
        return { co, taeki: tk.length, sidast: sid, bord, flokkun: st && st.flokkun, kerfi: (st && st.kerfi) || [] };
      });
      return { listi: radir, ids, leitad: (Companies.list || []).length };
    });
  }
  // Viðskiptavinur á heimilisfanginu → „Opna prófíl" í hausnum (raunverulegur #company/<id>), annars ekkert
  function hausProfill(cos) {
    const f = document.querySelector('#companies-main.gr-sydar .gr-leit'); if (!f) return;
    let a = f.querySelector('.gr-prof');
    // hnappurinn er ALLTAF í hausnum (falinn, en tekur sitt pláss) — annars brotnar hausinn í nýja línu þegar svarið kemur
    if (!a) { a = document.createElement('a'); a.className = 'gr-prof'; f.appendChild(a); }
    if (!cos.length) { a.classList.add('gr-falid'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; a.removeAttribute('data-gr-a'); if (!a.textContent) a.textContent = 'Opna prófíl'; return; }
    a.classList.remove('gr-falid'); a.removeAttribute('aria-hidden'); a.removeAttribute('tabindex');
    const html = cos.length === 1 ? 'Opna prófíl' : cos.length + ' staðir hjá okkur';
    a.href = cos.length === 1 ? '#company/' + (+cos[0].id) : '#' + ID;
    a.title = cos.map((c) => c.nafn).join(', ');
    if (cos.length === 1) { a.setAttribute('data-gr-a', 'profill'); a.setAttribute('data-id', String(+cos[0].id)); } else { a.removeAttribute('data-gr-a'); }
    if (a.textContent !== html) a.textContent = html;
  }
  TEIKNA.hja = (g) => {
    const p = g.parts.hja || {};
    if (!g.adr && !g.kt) { setjaStodu('hja', 'tomt', 'bíður heimilisfangs'); setjaBuk('hja', '<div class="gr-tomt">Sláðu inn heimilisfang, landnúmer eða kennitölu í hausnum og ýttu á Sækja.</div>'); return; }
    if (p.stada === 'saeki' || !p.stada) { setjaStodu('hja', 'saeki', 'leita í okkar skrá…'); return; }
    if (p.stada === 'villa') { setjaStodu('hja', 'villa', 'villa'); setjaBuk('hja', '<div class="gr-villa">Náði ekki í okkar skrá: ' + esc(p.villa) + '</div><div class="gr-takkar"><button type="button" class="ssp-btn" data-gr-a="aftur" data-l="hja">Reyna aftur</button></div>'); return; }
    const h = g.hja || { listi: [] };
    if (!h.listi.length) {
      setjaStodu('hja', 'tomt', 'ekki viðskiptavinur');
      hausProfill([]);
      setjaUndir('hja', 'Nei');
      setjaBuk('hja', '<div class="gr-tomt"><b>Viðskiptavinur hjá okkur: Nei.</b> Ekkert virkt fyrirtæki í okkar skrá á þessu heimilisfangi' + (g.kt ? ' eða með kennitölunni' : '') + ' (leitað í ' + tala(h.leitad) + ' færslum eftir götu og húsnúmeri, nefnifalli og þágufalli).</div>' +
        '<div class="gr-takkar"><button type="button" class="ssp-btn malm" data-gr-a="stofna" title="Stofnar fyrirtækið með „Nýtt fyrirtæki“-leið appsins og skráir í þá þjónustu sem þú velur — staðfest í glugganum">Stofna sem viðskiptavin</button>' +
        '<span class="ssp-daufur" style="font-size:12px">Nafn, kennitala og heimilisfang fyllast út — þú velur þjónustu og staðfestir.</span></div>');
      return;
    }
    hausProfill(h.listi.map((r) => r.co));
    setjaStodu('hja', 'komid', h.listi.length + (h.listi.length === 1 ? ' staður' : ' staðir'));
    setjaUndir('hja', 'Já');
    const tegundTxt = (f) => f ? esc(f.tegund_heiti || f.tegund || '') + (f.notkunarflokkur ? ' · fl. ' + esc(f.notkunarflokkur) : '') : '<span class="ssp-daufur">óflokkað</span>';
    const kerfiTxt = (k) => {
      if (!k || !k.length) return '<span class="ssp-daufur">engin kerfaskrá</span>';
      const n = { a: 0, b: 0, c: 0, d: 0 };
      k.forEach((x) => { if (x.taekifaeri && n[x.taekifaeri] != null) n[x.taekifaeri]++; });
      const bvk = k.find((x) => x.kerfi === 'brunavidvorunarkerfi');
      return [n.d ? n.d + ' okkar' : '', n.b ? n.b + ' hjá öðrum' : '', n.a ? n.a + ' skylt — vantar' : '', n.c ? n.c + ' óvitað' : ''].filter(Boolean).join(' · ') +
        (bvk ? '<br><span class="ssp-daufur">Brunaviðvörunarkerfi: ' + esc(({ ja: 'Já', nei: 'Nei', ovitad: 'Óvitað' })[bvk.til_stadar] || bvk.til_stadar || '—') + (bvk.thjonustuadili ? ' · ' + esc(bvk.thjonustuadili) : '') + '</span>' : '');
    };
    setjaBuk('hja', tdMerki('<table data-_pm-status-done="1" class="gr-tafla"><thead><tr><th>Staður</th><th>Tæki</th><th>Síðasta skoðun</th><th>Flokkun</th><th>Kerfi og þjónusta</th><th>Teikning</th><th></th></tr></thead><tbody>' +
      h.listi.map((r) => '<tr><td><b>' + esc(r.co.nafn) + '</b><br><span class="ssp-daufur">' + esc(r.co.heimilisfang || '') + (r.co.kennitala ? ' · kt. ' + esc(r.co.kennitala) : '') + '</span>' +
        (postnrOlik(r.co.heimilisfang, g.adr) ? '<br><span class="ssp-plata" title="Sama gata og húsnúmer, ólíkt póstnúmer — annað hvort er rangt">póstnr. ólíkt: ' + esc(thatta(r.co.heimilisfang).postnr) + ' / ' + esc(thatta(g.adr).postnr) + '</span>' : '') + '</td>' +
        '<td class="gr-num">' + tala(r.taeki) + '</td><td class="gr-num">' + (r.sidast ? esc(dags(r.sidast)) : '—') + '</td>' +
        '<td>' + tegundTxt(r.flokkun) + '</td><td>' + kerfiTxt(r.kerfi) + '</td>' +
        '<td>' + (r.bord && Array.isArray(r.bord.haedir) && r.bord.haedir.length ? tala(r.bord.haedir.length) + (r.bord.haedir.length === 1 ? ' hæð' : ' hæðir') : '<span class="ssp-daufur">engin</span>') + '</td>' +
        '<td><div class="gr-takkar" style="margin:0;flex-wrap:nowrap"><a class="ssp-btn malm" href="#company/' + +r.co.id + '" data-gr-a="profill" data-id="' + +r.co.id + '">Opna prófíl</a>' +
        '<button type="button" class="ssp-btn" data-gr-a="faera" data-id="' + +r.co.id + '" title="Velja sjálfsótt atriði (m², hæðir, eignir …) sem fara í tóma reiti á prófílnum — ekkert yfirskrifast">Færa í prófíl</button></div></td></tr>').join('') +
      '</tbody></table>'));
  };

  /* 1b · OPIN GÖGN (fasteign-opin: hnit, lóð, rými í Reykjavík, rekstur í OpenStreetMap) ──────────────────── */
  // Overpass (rekstur) er sér kall á þjóninum (?osm=1, skyndiminni 14 d.) — hæg Overpass-svör tefja ekki eignina
  function osmGogn(g, j) {
    const hn = j && j.eign && j.eign.heitinr; if (!hn || j._osm) return;
    j._osm = true; j.reksturBid = true;
    lota('osm|' + hn, () => saekjaJson(FOPIN + '?osm=1&heitinr=' + encodeURIComponent(hn), 15000)).then((r) => {
      j.reksturBid = false;
      if (r && r.rekstur) { j.rekstur = r.rekstur; if (j.villur) delete j.villur.rekstur; }
      else if (!j.rekstur) { j.villur = j.villur || {}; j.villur.rekstur = (r && r.villa) || 'svaraði ekki'; }
    }, (e) => { j.reksturBid = false; if (!j.rekstur) { j.villur = j.villur || {}; j.villur.rekstur = (e && e.message) || String(e); } })
      .then(() => { if (S.g === g) { teikna('rekstur'); teikna('krofur'); teikna('samantekt'); teikna('heimildir'); vefTitlar(g); } });
  }
  function opinGogn(g) {
    const p = opinGogn0(g);
    p.then((j) => { if (j && j.reksturSaekja) osmGogn(g, j); }, () => {});
    return p;
  }
  function opinGogn0(g) {
    return lota('opin|' + afbr(g.adr), async () => {
      const r = await fetch(FOPIN + '?heimilisfang=' + encodeURIComponent(g.adr), { signal: AbortSignal.timeout(15000) });
      let j = null; try { j = await r.json(); } catch (_) {}
      if (!j || (j.error && !j.eign)) {
        // staðfang sem er ekki til → staðföngin sem ERU á götunni (Nónhæð 10 → Nónhæð 1, 2, 3, 4, 6)
        if (j && Array.isArray(j.tillogur)) g.opinTillogur = j.tillogur;
        const e = new Error((j && j.error) || ('svar ' + r.status)); e.ekkertFannst = r.status === 404; throw e;
      }
      return j;
    });
  }
  // Titill og lýsing af forsíðu fyrirtækis (ein sókn per vef, mest 3) — lotu-skyndiminni
  function vefTitlar(g) {
    const listi = (g.opin && g.opin.rekstur && g.opin.rekstur.listi) || [];
    const vefir = [...new Set(listi.map((x) => x.vefur).filter(Boolean))].slice(0, 3);
    if (!g.vefir) g.vefir = {};
    vefir.forEach((v) => {
      if (g.vefir[v]) return;
      g.vefir[v] = { saeki: true };
      lota('vefur|' + v, () => saekjaJson(FOPIN + '?vefur=' + encodeURIComponent(v), 9000)).then((j) => { g.vefir[v] = j || {}; }, () => { g.vefir[v] = { villa: true }; })
        .then(() => { if (S.g === g) teikna('rekstur'); });
    });
  }

  /* 2 · BYGGINGARUPPLÝSINGAR (bygging-uppl + skyndiminni fasteign_greining) ─────────────────────────────── */
  const lykillEignar = (e) => e && e.landnr ? 'eign:' + e.landnr + (e.svf && e.heitinr ? ':' + e.heitinr : '') : null;
  function byggingGogn(g, ferskt) {
    const k = 'bygg|' + afbr(g.adr);
    if (ferskt) LOTA.delete(k);
    return lota(k, async () => {
      // skyndiminni þjónsins fyrst (birtist strax), ferskt svar síðan
      const j = await saekjaJson(BYGG + '?heimilisfang=' + encodeURIComponent(g.adr), 28000);
      if (j && j.error && !j.eign) { const e = new Error(j.error); e.ekkertFannst = true; throw e; }
      return j;
    });
  }
  async function lesaSkyndi(e) {
    const lyk = lykillEignar(e); if (!lyk || !sb()) return null;
    const r = await sb().from('fasteign_greining').select('gogn,updated_at').eq('lykill', lyk).maybeSingle();
    return r && !r.error && r.data ? r.data : null;
  }
  let _vistad = new Map();
  async function vistaSkyndi(g) {
    try {
      if (!g.bygg || !g.bygg.eign || !sb()) return;
      const e = g.bygg.eign, lyk = lykillEignar(e);
      if (!lyk) return;
      const teikn = g.teikn && g.teikn.dr ? { fjoldi: g.teikn.dr.length, grunn: g.teikn.grunn ? g.teikn.grunn.length : null, safn: (g.teikn.eign && (g.teikn.eign.heimildNafn || g.teikn.eign.heimild)) || null } : null;
      const gogn = { bygg: g.bygg, teikn, adr: g.adr, saott: new Date().toISOString(), utgafa: 1 };
      const fingur = JSON.stringify([g.bygg.heimildir, g.bygg.m2, g.bygg.brunavarnir && g.bygg.brunavarnir.slod, teikn]);
      if (_vistad.get(lyk) === fingur) return;
      const r = await sb().from('fasteign_greining').upsert({ lykill: lyk, tegund: 'eign', landnr: e.landnr, heitinr: e.svf ? e.heitinr : null, heimilisfang: e.label || g.adr, gogn, uppruni: 'greining-fasteignar' }, { onConflict: 'lykill' }).select('lykill');
      if (r.error) { console.warn('[451] skyndiminni', r.error.message); return; }
      _vistad.set(lyk, fingur);
    } catch (err) { console.warn('[451] skyndiminni', err); }
  }
  // Langur listi: N fyrstu sjást, restin í <details> (opnast við smell — notandaaðgerð, ekki hopp)
  function listiMedMeira(atridi, n) {
    if (!atridi.length) return '';
    const fyrst = '<ul class="gr-listi">' + atridi.slice(0, n).join('') + '</ul>';
    if (atridi.length <= n) return fyrst;
    return fyrst + '<details class="gr-meira"><summary>Sýna ' + (atridi.length - n) + ' fleiri</summary><ul class="gr-listi">' + atridi.slice(n).join('') + '</ul></details>';
  }
  const VISSA_LED = (v) => v === 'há' ? 'g' : v ? 'y' : '';
  const vissaTxt = (v) => v === 'há' ? 'há vissa — summur töflunnar stemma' : v === 'miðlungs' ? 'miðlungs vissa — lesið, óstaðfest' : v === 'lágt' ? 'lág vissa' : 'engin vissa';
  function skjalHlekkur(slod, texti) {
    if (!slod) return esc(texti || '');
    const pdf = /\.pdf$/i.test(slod) && !/skjalasafn\.reykjavik/i.test(slod);
    const href = pdf ? PDFF + '?url=' + encodeURIComponent(slod) : slod;
    return '<a class="gr-hl" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(texti || 'skjal') + '</a>';
  }
  TEIKNA.bygg = (g) => {
    const p = g.parts.bygg || {};
    if (!g.adr) { setjaStodu('bygg', 'tomt', g.villa ? 'villa' : 'bíður'); setjaBuk('bygg', '<div class="' + (g.villa ? 'gr-villa' : 'gr-tomt') + '">' + esc(g.villa || 'Ekkert heimilisfang.') + '</div>'); return; }
    if (p.stada === 'saeki' || !p.stada) {
      setjaStodu('bygg', 'saeki', 'sæki skráningartöflu…');
      if (!g._skyndiReynt) {
        g._skyndiReynt = true;
        // geymt svar á þjóninum (sama landnúmer) birtist strax meðan ferska svarið er á leiðinni
        fetch(HUS + '?heimilisfang=' + encodeURIComponent(g.adr), { signal: AbortSignal.timeout(15000) }).then((r) => r.json()).then(async (h) => {
          if (S.g !== g || !h || !h.eign) return;
          g.eignHus = h.eign;
          const s = await lesaSkyndi(h.eign);
          if (S.g !== g || !s || !s.gogn || !s.gogn.bygg || (g.parts.bygg && g.parts.bygg.stada !== 'saeki')) return;
          g.bygg = s.gogn.bygg; g.byggGeymt = s.updated_at;
          teikna('bygg'); teikna('bruna'); teikna('samantekt'); teikna('krofur');
        }).catch(() => {});
      }
      if (g.bygg && g.byggGeymt) byggHtml(g, 'geymt ' + kl(g.byggGeymt) + ' — uppfæri…');
      return;
    }
    if (p.stada === 'villa') {
      setjaStodu('bygg', 'villa', 'villa');
      setjaBuk('bygg', '<div class="gr-villa">' + esc(p.villa) + '</div><div class="gr-takkar"><button type="button" class="ssp-btn" data-gr-a="aftur" data-l="bygg">Reyna aftur</button></div>');
      return;
    }
    byggHtml(g);
  };
  /* 2b · HERBERGI OG ÍBÚÐIR (Agnar 09.10.2026: „ef þú sérð eða getur fundið út hvað það eru mörg herbergi á hótelunum, eða
   * íbúðir í fjölbýlishúsum, þá væri frábært að fá það inn á company profile")
   *   herbergi  byggingarlýsing (brúin: tolur.herbergi_nefnd, OCR eða textalag) → varaleið: talning herbergjaheita í textalagi
   *             grunnmynda (smellt — „áætlað úr teikningu"). Aðeins sjálfgefið í prófílinn fyrir gistingu (annars getur talan
   *             verið „3 herbergja íbúð").
   *   íbúðir    eignarhlutar skráningartöflunnar á hæðum 01+ (00 = kjallari: geymslur/bílastæði) í íbúðarhúsi/íbúðagistingu.
   *             Notkun hvers hluta er ekki lesin → vissa miðlungs (há ef allar summur töflunnar stemma). Annars aðeins
   *             „eignir (ekki endilega íbúðir)". */
  const GISTING = /^(hotel|gistiheimili|gisting|hostel|ibudagisting)/;
  const IBUDARHUS = /^(fjolbyli|ibud)/;
  const HTAL = new Map();   // heimilisfang → talning herbergja í textalagi grunnmynda
  function einingar(g) {
    const b = (g && g.bygg) || {}, teg = String((g && (g.tegundFelags || (g.tegund && g.tegund.tegund))) || '');
    const ut = { gisting: GISTING.test(teg), ibudarhus: IBUDARHUS.test(teg), teg };
    if (b.herbergi && +b.herbergi.fjoldi > 0) {
      ut.herbergi = { fjoldi: +b.herbergi.fjoldi, dags: b.herbergi.dags || null, slod: b.herbergi.slod || null,
        heimild: 'Byggingarlýsing' + (b.herbergi.dags ? ' ' + dags(b.herbergi.dags) : '') + (b.herbergi.heimild === 'textalag' ? ' (textalag)' : ' (OCR)'),
        vissa: ut.gisting ? 'miðlungs' : 'lágt' };
    } else {
      const t = g && HTAL.get(afbr(g.adr));
      if (t && t.stada === 'komid' && t.fjoldi > 0) ut.herbergi = { fjoldi: t.fjoldi, aaetlad: true, heimild: 'Áætlað úr teikningu — ' + t.haedir.filter((h) => h.n).map((h) => h.heiti + ' ' + h.n).join(', '), vissa: 'lágt' };
    }
    const eh = Array.isArray(b.eignarhlutar) ? b.eignarhlutar.filter((x) => /^\d{4}$/.test(String(x))) : [];
    if (eh.length) {
      const ofan = eh.filter((x) => +String(x).slice(0, 2) >= 1), sp = /^(\d+)\/(\d+)$/.exec(String((b.skraningartafla && b.skraningartafla.summuprof) || ''));
      const summur = !!(sp && +sp[2] > 0 && +sp[1] === +sp[2]);
      ut.ibudir = { fjoldi: ofan.length, alls: eh.length, kjallari: eh.length - ofan.length, summur, vissa: ut.ibudarhus ? (summur ? 'há' : 'miðlungs') : 'lágt',
        heimild: 'Skráningartafla' + (b.skraningartafla && b.skraningartafla.dags ? ' ' + dags(b.skraningartafla.dags) : '') + ' — eignarhlutar á hæðum' };
    }
    if (b.hamarksfjoldi && +b.hamarksfjoldi.fjoldi > 0) ut.hamarksfjoldi = b.hamarksfjoldi;
    return ut;
  }
  // Varaleið (smellt): herbergjaheiti í textalagi grunnmyndanna („Herb.", „Gistiherb. 104", „Hótelherbergi") — skönnuð blöð ekki talin
  const HERB_RE = /(^|[\s.])(herb\.?|herbergi|gistiherb\w*|hótelherb\w*|hotelherb\w*|svíta|svita|suite)(?=$|[\s.\d])/i;
  function teljaHerbergi(g) {
    const lyk = afbr(g.adr);
    if (HTAL.has(lyk) && HTAL.get(lyk).stada !== 'villa') return;
    const t = { stada: 'saeki', haedir: [], fjoldi: 0, skannad: 0 };
    HTAL.set(lyk, t);
    teikna('bygg');
    (async () => {
      await pdfjsHlada();
      const hs = batHaedir(g).filter((h) => h.pdf).slice(0, 10);
      for (const h of hs) {
        try {
          const r = await fetch(PDFF + '?url=' + encodeURIComponent(h.pdf), { signal: AbortSignal.timeout(45000) });
          if (!r.ok) continue;
          const baeti = new Uint8Array(await r.arrayBuffer()); if (baeti.length < 5000) continue;
          const doc = await window.pdfjsLib.getDocument({ data: baeti }).promise;
          try {
            const s = await doc.getPage(1), vp = s.getViewport({ scale: 1 }), tc = await s.getTextContent();
            const ord = batOrd(tc, vp);
            if (ord.filter((o) => /[A-Za-zÀ-ſ]{2,}/.test(o.t)).length < 12) { t.skannad++; continue; }
            const n = ord.filter((o) => HERB_RE.test(o.t) && o.t.length <= 28).length;
            t.haedir.push({ heiti: h.heiti, n });
            t.fjoldi += n;
          } finally { try { doc.destroy(); } catch (_) {} }
        } catch (_) {}
      }
      t.stada = 'komid'; t.hs = hs.length;
    })().catch((e) => { t.stada = 'villa'; t.villa = (e && e.message) || String(e); }).then(() => { if (S.g === g) teikna('bygg'); });
  }
  function byggHtml(g, geymt) {
    const b = g.bygg || {};
    const e = b.eign || {};
    if (e.label) setjaUndir('bygg', e.label + (e.landnr ? ' · L' + e.landnr : '') + (e.safn ? ' · ' + e.safn : ''));
    const lesnar = (b.heimildir || []).filter((h) => h.lesin).length, alls = (b.heimildir || []).length;   // líka lesin skjöl sem reyndust ekki tafla (mælt Skútuvogur 2: 8 lesin, 6 töflur)
    setjaStodu('bygg', geymt ? 'saeki' : (b.m2 != null ? 'komid' : alls ? 'tomt' : 'tomt'), geymt || (alls ? lesnar + ' af ' + alls + ' skjölum lesin' : 'engin skjöl'));
    const st = b.skraningartafla;
    const linur = [];
    const lina = (m, v, ved, auka) => '<div class="ssp-lina"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi">' + (ved ? '<i class="gr-led ' + VISSA_LED(ved) + '" title="' + esc(vissaTxt(ved)) + '"></i>' : '') + v + (auka || '') + '</span></div>';
    if (b.m2 != null || b.haedir || b.byggingarar) {
      linur.push(lina('Brúttó', tala(b.m2, 1) + ' m²', b.oryggi && b.oryggi.m2));
      linur.push(lina('Birt flatarmál', b.m2_birt != null ? tala(b.m2_birt, 1) + ' m²' : '—', b.oryggi && b.oryggi.m2));
      linur.push(lina('Rúmmál', b.rummal_m3 != null ? tala(b.rummal_m3, 1) + ' m³' : '—', b.oryggi && (b.oryggi.rummal || b.oryggi.m2)));
      const h = b.haedir;
      linur.push(lina('Hæðir', h ? [h.kjallari ? 'kjallari' : '', h.ofanjardar ? h.ofanjardar + (h.ofanjardar === 1 ? ' hæð' : ' hæðir') + ' ofanjarðar' : '', h.ris ? 'ris' : ''].filter(Boolean).join(' + ') || '—' : '—', b.oryggi && b.oryggi.haedir));
      linur.push(lina('Eignir', b.eignir != null ? tala(b.eignir) : '—', b.oryggi && b.oryggi.eignir));
      linur.push(lina('Byggingarár', b.byggingarar ? esc(b.byggingarar) : '—', b.oryggi && b.oryggi.byggingarar, b.byggingarar ? ' <span class="ssp-daufur">(úr byggingarlýsingu)</span>' : ''));
      linur.push(lina('Stigagangar', b.stigagangar ? tala(b.stigagangar) : '—', b.stigagangar ? b.oryggi && b.oryggi.stigagangar : null));
    }
    // herbergi / íbúðir / hámarksfjöldi — sýnt þótt engin tafla sé lesin (lýsingin getur verið lesin ein)
    const ei = einingar(g);
    if (ei.ibudir && (ei.ibudarhus || (!ei.gisting && ei.ibudir.fjoldi > 1))) {
      const ib = ei.ibudir;
      linur.push(ei.ibudarhus
        ? lina('Íbúðir', tala(ib.fjoldi), ib.vissa, ' <span class="ssp-daufur">(eignarhlutar á hæðum' + (ib.kjallari ? ' — ' + ib.kjallari + ' í kjallara ekki taldir' : '') + (ib.summur ? '' : ' · notkun hvers hluta ekki lesin') + ')</span>')
        : lina('Íbúðir', '—', null, ' <span class="ssp-daufur">(' + tala(ib.fjoldi) + ' eignir á hæðum — ekki endilega íbúðir)</span>'));
    }
    if (ei.herbergi) {
      const hb = ei.herbergi;
      linur.push(lina('Herbergi', tala(hb.fjoldi) + ' herb.', hb.vissa, ' <span class="ssp-daufur">(' + (hb.slod ? skjalHlekkur(hb.slod, esc(hb.heimild)) : esc(hb.heimild)) + (ei.gisting || hb.aaetlad ? '' : ' — nefnt í lýsingu, ekki víst að eigi við gistingu') + ')</span>'));
    } else if (ei.gisting) {
      const t = HTAL.get(afbr(g.adr));
      const tst = !t ? '<button type="button" class="ssp-btn" data-gr-a="telja-herb" style="height:24px!important;padding:0 8px!important;font-size:11.5px!important;margin-left:6px">Telja á teikningum</button>'
        : t.stada === 'saeki' ? ' <span class="ssp-daufur">telur herbergjaheiti í textalagi grunnmynda…</span>'
        : t.stada === 'villa' ? ' <span class="ssp-daufur">talning brást: ' + esc(t.villa || '') + '</span>'
        : ' <span class="ssp-daufur">ekkert herbergjaheiti í textalagi ' + (t.hs || 0) + ' grunnmynda' + (t.skannad ? ' (' + t.skannad + ' skönnuð — ekki talin)' : '') + '</span>';
      linur.push(lina('Herbergi', '—', null, ' <span class="ssp-daufur">(byggingarlýsingin nefnir enga tölu eða er ólesin)</span>' + tst));
    }
    if (ei.hamarksfjoldi) linur.push(lina('Hámarksfjöldi', tala(ei.hamarksfjoldi.fjoldi) + ' manns', null, ' <span class="ssp-daufur">(' + skjalHlekkur(ei.hamarksfjoldi.slod, 'byggingarlýsing ' + (dags(ei.hamarksfjoldi.dags) || '')) + ')</span>'));
    // opin gögn (fasteign-opin): lóðarstærð úr Landeignaskrá og rými úr Borgarvefsjá — sýnd þótt engin tafla sé lesin
    const op = g.opin;
    if (op && op.lod && (op.lod.skrad_m2 || op.lod.maeld_m2)) linur.push(lina('Lóð', tala(op.lod.skrad_m2 || op.lod.maeld_m2) + ' m²', null, ' <span class="ssp-daufur">(Landeignaskrá)</span>'));
    if (op && op.einingar && op.einingar.fjoldi) linur.push(lina('Rými', tala(op.einingar.fjoldi) + (op.einingar.fastanumer ? ' · ' + op.einingar.fastanumer + ' fastanr.' : ''), null, ' <span class="ssp-daufur">(Borgarvefsjá' + (op.einingar.haedir && op.einingar.haedir.length ? ', hæðakóðar ' + esc(op.einingar.haedir.join(', ')) : '') + ')</span>'));
    let haedaTafla = '';
    if (b.haedir && Array.isArray(b.haedir.listi) && b.haedir.listi.length) {
      // m² á hæð sem súlur (Agnar 09.10: „ekki bara textar“) — sama tafla, sami lestur
      const mest = Math.max(...b.haedir.listi.map((x) => +x.brutto_m2 || 0), 1);
      haedaTafla = '<div class="ssp-skilti">Hæðir í skráningartöflu</div><div class="gr-sulur">' + b.haedir.listi.map((x) =>
        '<div class="gr-sula"><span class="gr-sula-h">' + esc(x.heiti || x.kodi) + '</span><span class="gr-sula-t"><i style="width:' + Math.max(2, Math.round((+x.brutto_m2 || 0) / mest * 100)) + '%"></i></span><span class="gr-sula-v">' + tala(x.brutto_m2, 1) + ' m²</span></div>').join('') + '</div>';
    }
    const uppruni = st ? '<div class="gr-uppruni">Skráningartafla ' + skjalHlekkur(st.slod, dags(st.dags) || 'skjal') + (st.matshluti ? ' · matshluti ' + esc(st.matshluti) : '') + (st.a_bladi ? ' · á blaðinu: „' + esc(st.a_bladi) + '“' : '') +
      (st.summuprof ? ' · summupróf ' + esc(st.summuprof) : '') + (st.lesid_af ? ' · ' + esc(st.lesid_af) : '') + '<span class="gr-sjalf" title="Sótt úr skjalasafni sveitarfélagsins — ekki okkar skráning">sjálfsótt</span></div>' : '';
    const varud = [];
    if (st && st.samsvorun && st.samsvorun !== 'heimilisfang á blaðinu') varud.push('Taflan var valin sem ' + esc(st.samsvorun) + ' — heimilisfangið á blaðinu las ekki örugglega; athugaðu að hún eigi við rétt hús.');
    (b.athugasemdir || []).forEach((a) => { if (!/Kaupskrá/.test(a)) varud.push(esc(a)); });
    const olesin = (b.olesin || []);
    const ocr = ocrHtml(g, olesin);
    const skjalaListi = (b.heimildir || []).length ? '<div class="ssp-skilti">Skjöl í safninu</div>' + listiMedMeira(b.heimildir.map((h) =>
      '<li><i class="gr-led ' + (h.lesin ? (h.ekki_tafla ? '' : 'g') : '') + '" title="' + (h.lesin ? (h.ekki_tafla ? 'lesið — ekki skráningartafla' : 'lesið') : 'ólesið') + '"></i>' +
      (h.tegund === 'skraningartafla' ? 'Skráningartafla' : 'Byggingarlýsing') + ' · ' + skjalHlekkur(h.slod, dags(h.dags) || 'skjal') +
      (h.matshluti ? ' <small>mhl. ' + esc(h.matshluti) + '</small>' : '') + (h.a_bladi ? ' <small>„' + esc(h.a_bladi) + '“</small>' : '') + (h.merking ? ' <small>merkt: ' + esc(h.merking) + '</small>' : '') +
      (h.lesin ? '' : ' <small>ólesið</small>') + '</li>'), 6) : '';
    safnByrja('bygg');
    const tafla = st && st.slod ? skjalFlis(st.slod, 'Skráningartafla', [dags(st.dags), st.matshluti ? 'mhl. ' + st.matshluti : ''].filter(Boolean).join(' · '), 'skjal') : '';
    setjaBuk('bygg', (linur.length ? (tafla ? '<div class="gr-med-skjal"><div class="gr-reitir">' + linur.join('') + '</div><div class="gr-skjal-fl">' + tafla + '</div></div>' : '<div class="gr-reitir">' + linur.join('') + '</div>') + uppruni : '<div class="gr-tomt">' + (alls ? 'Engar tölur lesnar enn úr skjölum hússins.' : 'Engin skráningartafla eða byggingarlýsing fannst í skjalasafninu fyrir ' + esc(e.label || g.adr) + '.') + '</div>') +
      haedaTafla + (varud.length ? '<div class="gr-varud">' + varud.join('<br>') + '</div>' : '') + ocr + skjalaListi);
  }

  /* 2b · OCR Á SKRIFSTOFUTÖLVUNNI (luna-bridge workflow 'bygging-ocr') ───────────────────────────────────── */
  function ocrHtml(g, olesin) {
    const o = S.ocr && S.g && S.ocr.landnr === (g.bygg && g.bygg.eign && g.bygg.eign.landnr) ? S.ocr : null;
    if (o && !['done', 'error', 'timi'].includes(o.stada)) {
      return '<div class="gr-takkar"><span class="gr-framvinda"><i class="gr-led y"></i>' + esc(o.stada === 'bida' ? 'Bíður eftir skrifstofutölvunni…' : (o.texti || 'Les skjölin…')) +
        ' · ' + Math.round((Date.now() - o.byrjad) / 1000) + ' s</span></div>';
    }
    let lok = '';
    if (o && o.stada === 'done') lok = '<div class="gr-uppruni">Lestri lokið ' + esc(kl(o.lauk || Date.now())) + (o.texti ? ' — ' + esc(o.texti) : '') + '. Geymt á þjóni.</div>';
    if (o && (o.stada === 'error' || o.stada === 'timi')) lok = '<div class="gr-villa">' + esc(o.stada === 'timi' ? 'Lesturinn kláraðist ekki á 25 mín.' : ('Lestur brást: ' + (o.texti || 'villa'))) + '</div>';
    if (!olesin.length) return lok;
    const n = Math.min(6, olesin.length), min = Math.max(2, Math.round(n * ((g.bygg && g.bygg.ocr_min_skjal) || 2.5)));
    return lok + '<div class="gr-takkar"><button type="button" class="ssp-btn malm" data-gr-a="ocr">Lesa skjölin (OCR á skrifstofutölvunni, ~' + min + ' mín)</button>' +
      '<span class="ssp-daufur" style="font-size:12px">' + olesin.length + (olesin.length === 1 ? ' ólesið skjal' : ' ólesin skjöl') + (olesin.length > 6 ? ' — 6 nýjustu í einu' : '') + '. Niðurstaðan geymist á þjóninum.</span></div>';
  }
  async function ocrBidja() {
    const g = S.g; if (!g || !g.bygg || !g.bygg.eign) return;
    const e = g.bygg.eign;
    const c = await tengdur();
    // verk í gangi fyrir sama landnúmer (líka úr öðrum vafra) → fylgja því, ekki senda annað
    const fra = new Date(Date.now() - 30 * 60000).toISOString();
    const q = await c.from('automation_triggers').select('id,status,result,requested_at').eq('workflow', 'bygging-ocr').eq('gogn->>landnr', String(e.landnr))
      .in('status', ['bida', 'pending', 'running']).gt('requested_at', fra).order('id', { ascending: false }).limit(1);
    let id = q && !q.error && q.data && q.data[0] && q.data[0].id;
    if (!id) {
      const skjol = (g.bygg.olesin || []).slice(0, 6);
      const r = await c.from('automation_triggers').insert({ workflow: 'bygging-ocr', status: 'bida', requested_by: 'greining-fasteignar', gogn: { landnr: e.landnr, heitinr: e.heitinr || null, svf: e.svf || null, heimilisfang: e.label ? e.label + (e.postnr ? ', ' + e.postnr : '') : g.adr, skjol } }).select('id');
      if (r.error || !r.data || !r.data[0]) { segja('Beiðnin vistaðist ekki: ' + ((r.error && r.error.message) || 'ekkert auðkenni')); return; }
      id = r.data[0].id;
    }
    S.ocr = { id, stada: 'bida', texti: '', byrjad: Date.now(), landnr: e.landnr, adr: g.adr };
    teikna('bygg'); teikna('bruna');
    S.ocr.timer = setTimeout(ocrKanna, 600);
  }
  async function ocrKanna() {
    const o = S.ocr; if (!o || ['done', 'error', 'timi'].includes(o.stada)) return;
    clearTimeout(o.timer);
    if (Date.now() - o.byrjad > OCR_HAMARK) { o.stada = 'timi'; teikna('bygg'); return; }
    try {
      const r = await sb().from('automation_triggers').select('status,result').eq('id', o.id).limit(1);
      const row = r && r.data && r.data[0];
      if (row) {
        const st = row.status === 'pending' ? 'bida' : row.status;
        if (st === 'done') {
          o.stada = 'done'; o.lauk = Date.now();
          let j = null; try { const t = String(row.result || ''); j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (_) {}
          const ok = j && Array.isArray(j.lesin) ? j.lesin.filter((x) => x.ok).length : null;
          o.texti = j ? (ok + ' skjöl lesin' + (j.eftir ? ', ' + j.eftir + ' eftir' : '') + (j.sek ? ' á ' + Math.round(j.sek / 60) + ' mín' : '')) : '';
          // ferskt svar — lesturinn er nú í fasteign_greining
          const g = S.g;
          if (g && g.adr === o.adr) {
            g.parts.bygg = { stada: 'saeki' }; teikna('bygg');
            byggingGogn(g, true).then((v) => { if (S.g === g) { g.bygg = v; g.parts.bygg = { stada: 'komid', t: Date.now() }; } }, (e) => { if (S.g === g) g.parts.bygg = { stada: 'villa', villa: e.message }; })
              .then(() => { if (S.g === g) { teikna('bygg'); teikna('bruna'); teikna('samantekt'); afleidd('bygg'); } });
          }
        } else if (st === 'error' && /^Unknown workflow/i.test(String(row.result || '')) && Date.now() - (o.hafnad || (o.hafnad = Date.now())) < 3 * 60000) {
          o.stada = 'bida';   // eldri brú hafnaði — skrifstofutölvan tekur beiðnina yfir á næstu mínútu (watcher.js getHafnad)
        } else if (st === 'error') { o.stada = 'error'; o.texti = /^Unknown workflow/i.test(String(row.result || '')) ? 'engin brúartölva með OCR tók beiðnina — skrifstofutölvan þarf að vera í gangi' : row.result; }
        else { o.stada = st === 'running' ? 'running' : 'bida'; o.texti = st === 'running' ? row.result : ''; }
      }
    } catch (e) { console.warn('[451] OCR-staða', e); }
    teikna('bygg');
    if (!['done', 'error', 'timi'].includes(o.stada)) o.timer = setTimeout(ocrKanna, OCR_BIL);
  }

  /* 3 · BRUNAVARNIR ÚR BYGGINGARLÝSINGU ─────────────────────────────────────────────────────────────────── */
  const EFNI = [
    ['brunaholfun', 'Brunahólfun'], ['brunavidvorunarkerfi', 'Brunaviðvörunarkerfi'], ['vatnsudakerfi', 'Vatnsúðakerfi'],
    ['neydarlysing', 'Neyðarlýsing'], ['handslokkvitaeki', 'Slökkvitæki'], ['brunaslongur', 'Brunaslöngur / slöngukefli'],
    ['flottaleidir', 'Flóttaleiðir'], ['reyklosun', 'Reyklosun'], ['thjonustusamningur', 'Þjónustusamningur'], ['brunahonnun', 'Brunahönnun'],
    ['stigahus', 'Stigahús'], ['lyfta', 'Lyfta'],
  ];
  // Staðsetningar búnaðar úr lýsingunni (brúin, stadir.py) — tillögur, aldrei staðreynd
  const STADIR_HEITI = { slokkvitaeki: 'Slökkvitæki', handslokkvitaeki: 'Slökkvitæki', brunaslongur: 'Slöngukefli', slongukefli: 'Slöngukefli', neydarlysing: 'Neyðarlýsing', reyklosun: 'Reyklosun', flottaleidir: 'Flóttaleiðir', brunavidvorunarkerfi: 'Brunaviðvörunarkerfi', reykskynjarar: 'Reykskynjarar', vatnsudakerfi: 'Vatnsúðakerfi' };
  function stadirHtml(bv) {
    const s = bv && bv.stadir;
    if (!s || typeof s !== 'object' || !Object.keys(s).length) return '';
    const linur = [];
    Object.keys(s).forEach((k) => (Array.isArray(s[k]) ? s[k] : []).slice(0, 4).forEach((x) => {
      const rymi = (x.rymi || []).filter(Boolean).join(', '), krafa = (x.krafa || []).filter(Boolean).join(', ');
      if (!rymi && !krafa && !x.magn) return;
      linur.push('<li><b>' + esc(STADIR_HEITI[k] || k) + '</b> ' + esc(rymi) + (x.magn ? ' <small>' + esc(x.magn) + ' stk.</small>' : '') + (krafa ? ' <small>' + esc(krafa) + '</small>' : '') + (x.skv_teikningu ? ' <small>skv. teikningu</small>' : '') + '</li>');
    }));
    if (!linur.length) return '';
    return '<div class="ssp-skilti">Staðsetning búnaðar — tillaga úr lýsingunni</div><ul class="gr-listi">' + linur.slice(0, 14).join('') + '</ul>' +
      '<div class="gr-uppruni">' + esc(bv.stadir_athugasemd || 'Lesið úr setningum lýsingarinnar — ekki staðfest.') + (bv.heimild === 'textalag' ? '' : ' Skönnuð lýsing: aðeins ~16% staða lesast rétt.') + '</div>';
  }
  TEIKNA.bruna = (g) => {
    const p = g.parts.bygg || {};
    if (!g.adr) { setjaStodu('bruna', 'tomt', 'bíður'); setjaBuk('bruna', '<div class="gr-tomt">Ekkert heimilisfang.</div>'); return; }
    if ((p.stada === 'saeki' || !p.stada) && !(g.bygg && g.byggGeymt)) { setjaStodu('bruna', 'saeki', 'sæki byggingarlýsingu…'); return; }
    if (p.stada === 'villa') { setjaStodu('bruna', 'villa', 'villa'); setjaBuk('bruna', '<div class="gr-villa">' + esc(p.villa) + '</div>'); return; }
    const b = g.bygg || {}, bv = b.brunavarnir;
    const lys = (b.heimildir || []).filter((h) => h.tegund === 'byggingarlysing');
    if (!bv) {
      setjaStodu('bruna', 'tomt', lys.length ? 'ólesin' : 'engin lýsing');
      safnByrja('bruna');
      const bt0 = bestaBrunablad(g.teikn).slice(0, 4);
      if (S.batG !== g) { S.batG = g; S.batQ = -1; }
      S.batTilv = [];
      setjaBuk('bruna', (bt0.length ? '<div class="gr-skjal-rod">' + bt0.map((x) => fskFlis(x, 'Brunavarnir', false, { hopur: 'bruna-skjal', undir: undirAf(x) })).join('') + '</div>' : '') + batHtml(g, []) + '<div class="gr-tomt">' + (lys.length ? lys.length + (lys.length === 1 ? ' byggingarlýsing fannst' : ' byggingarlýsingar fundust') + ' en engin hefur verið lesin enn — „Lesa skjölin“ í Byggingarupplýsingum les hana á skrifstofutölvunni.' : 'Engin byggingarlýsing fannst í skjalasafninu.') + '</div>');
      return;
    }
    const efni = bv.efni || {};
    const til = EFNI.filter(([k]) => efni[k] && (efni[k].fjoldi || (efni[k].daemi || []).length));
    safnByrja('bruna');
    const bt = bestaBrunablad(g.teikn).slice(0, 3);
    const skjolRod = '<div class="gr-skjal-rod">' + skjalFlis(bv.slod, 'Byggingarlýsing', dags(bv.dags), 'bruna-skjal') + bt.map((x) => fskFlis(x, 'Brunavarnir', false, { hopur: 'bruna-skjal', undir: undirAf(x) })).join('') + '</div>';
    if (S.batG !== g) { S.batG = g; S.batQ = -1; }
    const tilv = batTilvitnanir(bv); S.batTilv = tilv;
    const tIdx = new Map(tilv.map((x) => [x.texti, x.i]));
    setjaStodu('bruna', 'komid', til.length + ' atriði');
    setjaUndir('bruna', 'Byggingarlýsing ' + dags(bv.dags));
    setjaBuk('bruna', skjolRod + batHtml(g, tilv) + '<div class="gr-bv">' + til.map(([k, h]) => {
      const x = efni[k], d = (x.daemi || []).slice(0, 3);
      const allarNeit = d.length && d.every((y) => y.neitun);
      return '<div class="gr-bv-rod">' + (EFNI_GLYFF[k] ? taknHtml(EFNI_GLYFF[k], allarNeit ? 'nei' : 'til', '', 22) : '') + '<b>' + esc(h) + '</b> <span class="ssp-daufur" style="font:500 11px ' + MONO + '">' + (x.fjoldi || d.length) + '× nefnt' + (allarNeit ? ' — aðeins með neitun' : '') + '</span>' +
        d.map((y) => {
          const qi = tIdx.has(String(y.setning || '').replace(/\s+/g, ' ').trim()) ? tIdx.get(String(y.setning || '').replace(/\s+/g, ' ').trim()) : -1;
          const tt = [y.neitun ? 'Setningin inniheldur neitun — ekki til staðar / ekki krafa' : '', qi >= 0 ? 'Smelltu til að lýsa upp rýmin á teikningunni' : ''].filter(Boolean).join(' · ');
          return '<q class="' + [y.neitun ? 'neit' : '', qi >= 0 ? 'gr-bat-qq' + (S.batQ === qi ? ' on' : '') : ''].filter(Boolean).join(' ') + '"' + (qi >= 0 ? ' data-gr-a="bat-q" data-q="' + qi + '"' : '') + (tt ? ' title="' + tt + '"' : '') + '>' + esc(y.setning) + '</q>';
        }).join('') + '</div>';
    }).join('') + '</div>' + stadirHtml(bv) +
      '<div class="gr-uppruni">Orðrétt úr byggingarlýsingu ' + skjalHlekkur(bv.slod, dags(bv.dags) || 'skjal') + ' · ' + (bv.heimild === 'textalag' ? 'textalag PDF (nákvæmt)' : 'OCR af skannaðri mynd — getur verið rangt lesið') +
      (b.skraningartafla && b.skraningartafla.dags && bv.dags && b.skraningartafla.dags !== bv.dags ? ' · ATH: taflan er frá ' + esc(dags(b.skraningartafla.dags)) + ', lýsingin frá ' + esc(dags(bv.dags)) + ' (ólíkar umsóknir)' : '') +
      (bv.lesid_af ? ' · ' + esc(bv.lesid_af) : '') + '<span class="gr-sjalf">sjálfsótt</span></div>');
  };

  /* 4 · KRÖFUR EFTIR TEGUND ─────────────────────────────────────────────────────────────────────────────── */
  let _flokkar = null;
  function flokkarJson() {
    if (_flokkar) return _flokkar;
    _flokkar = (async () => {
      for (const g of FLOKKAR_GRUNNAR) {
        try { const r = await fetch(g + 'flokkar.json', { cache: 'force-cache' }); if (r.ok) return await r.json(); } catch (_) {}
      }
      return [];
    })();
    return _flokkar;
  }
  function krofurGogn() {
    return lota('krofur', async () => {
      if (!window.Flokkun || !Flokkun.krofur) throw new Error('Flokkunargögnin (449a) eru ekki hlaðin');
      const [kr, fl] = await Promise.all([Flokkun.krofur(), flokkarJson().catch(() => [])]);
      return { kr, flokkar: Array.isArray(fl) ? fl : [] };
    });
  }
  // Líkleg tegund: (1) flokkun viðskiptavinar á staðnum, (2) ÍSAT fyrirtækja á staðnum, (3) nöfn, (4) annað
  function likTegund(g) {
    const k = g.krofur; if (!k) return null;
    const hja = g.hja && g.hja.listi || [];
    const fl = hja.map((r) => r.flokkun).find((f) => f && f.tegund && f.tegund !== 'annad');
    if (fl) return { tegund: fl.tegund, rok: 'flokkun viðskiptavinar (' + (hja[0] && hja[0].co.nafn) + ', vissa ' + (fl.vissa || '?') + ')' };
    const rek = (g.rekstur && g.rekstur.felog) || [];
    for (const f of rek) {
      const isat = String((f.skra && f.skra.isat && f.skra.isat[0]) || '');
      const kodi = (isat.match(/^\s*(\d{2}(?:\.\d{1,3})?)/) || [])[1];
      if (!kodi) continue;
      let best = null;
      k.flokkar.forEach((t) => (t.isat || []).forEach((p) => { if (kodi.startsWith(p) && (!best || p.length > best.p.length)) best = { t, p }; }));
      if (best) return { tegund: best.t.tegund, rok: 'ÍSAT ' + kodi + ' (' + f.nafn + ')' };
    }
    // OpenStreetMap: tegund rekstrar á staðnum (shop/office/amenity/tourism …) eða gerð byggingar
    const osm = ((g.opin && g.opin.rekstur && g.opin.rekstur.listi) || []).filter((x) => x.osm_tag);
    const m2 = g.bygg && g.bygg.m2;
    const OSM = (t, x) => {
      const k = t.k, v = String(t.v || '');
      if (k === 'shop' && /car_repair|tyres|car_parts/.test(v)) return 'bilaverkstaedi';
      if (k === 'shop') return m2 && m2 > 1000 ? 'verslun_stor' : 'verslun_litil';
      if (k === 'office') return 'skrifstofa';
      if (k === 'craft') return 'idnadur';
      if (k === 'amenity' && /restaurant|cafe|fast_food|food_court/.test(v)) return 'veitingastadur';
      if (k === 'amenity' && /bar|pub|nightclub/.test(v)) return 'bar_skemmtistadur';
      if (k === 'amenity' && /kindergarten|childcare/.test(v)) return 'leikskoli';
      if (k === 'amenity' && /school|college|university/.test(v)) return 'skoli';
      if (k === 'amenity' && /nursing_home|social_facility|hospital/.test(v)) return 'hjukrunarheimili';
      if (k === 'amenity' && /place_of_worship|theatre|cinema|community_centre|arts_centre/.test(v)) return 'samkomuhus';
      if (k === 'amenity' && /car_repair/.test(v)) return 'bilaverkstaedi';
      if (k === 'tourism' && /hotel|guest_house|hostel|motel/.test(v)) return 'hotel';
      if (k === 'tourism' && /apartment/.test(v)) return 'ibudagisting';
      if (k === 'leisure' && /sports_centre|fitness_centre|swimming_pool|sports_hall/.test(v)) return 'ithrottahus';
      if (k === 'building' && /apartments|residential/.test(v)) return (+x.haedir || 0) >= 5 ? 'fjolbyli_hatt' : 'fjolbyli_lagt';
      if (k === 'building' && /house|detached|terrace|semidetached/.test(v)) return 'einbyli';
      return null;
    };
    // Margir rekstraraðilar (Laugavegur 120: hótel + veitingastaður + verslanir): sá með hæsta notkunarflokk ræður
    // (hótel 4 > veitingar 2 > verslun 1) — kröfurnar eru strangastar þar. Byggingargerð (building=…) aðeins ef enginn rekstur.
    const nf = (teg) => { const t = k.kr.tegundir.get(teg); const v = t && t.notkunarflokkur; const n = String(v || '').match(/\d+/g); return n ? Math.max(...n.map(Number)) : 0; };
    const kandidat = (listi) => listi.map((x) => ({ x, teg: OSM(x.osm_tag, x) })).filter((y) => y.teg && k.kr.tegundir.has(y.teg)).sort((a, b) => nf(b.teg) - nf(a.teg))[0];
    const best = kandidat(osm.filter((y) => y.osm_tag.k !== 'building')) || kandidat(osm.filter((y) => y.osm_tag.k === 'building'));
    if (best) { const x = best.x; return { tegund: best.teg, rok: 'OpenStreetMap: ' + (x.nafn ? x.nafn + ' (' + x.osm_tag.k + '=' + x.osm_tag.v + ')' : x.osm_tag.k + '=' + x.osm_tag.v + (x.haedir ? ', ' + x.haedir + ' hæðir' : '')) }; }
    const nofn = hja.map((r) => r.co.nafn).concat(rek.map((f) => f.nafn)).join(' ').toLowerCase();
    if (nofn) for (const t of k.flokkar) { const s = (t.samheiti || []).find((w) => w && nofn.includes(String(w).toLowerCase())); if (s) return { tegund: t.tegund, rok: 'nafn inniheldur „' + s + '“' }; }
    const nfl = g.bygg && g.bygg.notkunarflokkur_lysing;
    return { tegund: 'annad', rok: nfl ? 'óþekktur rekstur — byggingarlýsingin segir notkunarflokk ' + nfl : 'enginn rekstur þekktur á staðnum — veldu tegund' };
  }
  // m² á hæð: skráningartafla (hver hæð) → annars brúttó / hæðir
  function haedaFletir(g) {
    const b = g.bygg; if (!b) return null;
    if (b.haedir && Array.isArray(b.haedir.listi) && b.haedir.listi.length) return { listi: b.haedir.listi.map((x) => ({ heiti: x.heiti || x.kodi, m2: +x.brutto_m2 || 0 })), heimild: 'skráningartafla' };
    const n = (b.haedir && b.haedir.ofanjardar) || null;
    if (b.m2 && n) return { listi: Array.from({ length: n }, (_, i) => ({ heiti: (i + 1) + '. hæð', m2: b.m2 / n })), heimild: 'brúttó deilt á hæðir' };
    return null;
  }
  function aaetlaTaeki(g) {
    const f = haedaFletir(g); if (!f) return null;
    const efni = (g.bygg && g.bygg.brunavarnir && g.bygg.brunavarnir.efni) || {};
    const til = (k) => efni[k] && (efni[k].daemi || []).some((d) => !d.neitun);
    const helma = til('vatnsudakerfi') || til('brunaslongur');
    let alls = 0;
    const per = f.listi.map((h) => {
      const m2 = h.m2 || 0;
      let n;
      if (m2 <= 0) n = 0;
      else if (m2 <= 100) n = 1;
      else { const A = Math.max(26, (helma ? 0.0325 : 0.065) * m2); n = Math.max(2, Math.ceil(A / 13)); }
      alls += n;
      return { heiti: h.heiti, m2, n };
    });
    return { alls, per, heimild: f.heimild, helma };
  }
  const EFNI_KERFI = { slokkvitaeki: 'handslokkvitaeki', slongukefli: 'brunaslongur', brunavidvorunarkerfi: 'brunavidvorunarkerfi', vatnsudakerfi: 'vatnsudakerfi', neydarlysing: 'neydarlysing', reyklosun: 'reyklosun' };
  function skilyrdiHint(txt, g) {
    const t = String(txt || ''), b = g.bygg || {};
    const m2 = b.m2, hd = b.haedir && b.haedir.ofanjardar;
    const bitar = [];
    const mm = t.match(/(\d[\d.]*)\s*m²/);
    if (mm && m2) { const mork = +mm[1].replace(/\./g, ''); if (isFinite(mork)) bitar.push((m2 > mork ? 'á við' : 'á ekki við') + ' — ' + tala(m2) + ' m² ' + (m2 > mork ? '>' : '≤') + ' ' + tala(mork) + ' m²'); }
    const hm = t.match(/(\d+)\s*h(æ|ae)ð/);
    if (hm && hd) bitar.push(hd + ' hæðir ofanjarðar');
    return bitar.join(' · ');
  }
  TEIKNA.krofur = (g) => {
    const p = g.parts.krofur || {};
    if (p.stada === 'saeki' || !p.stada) { setjaStodu('krofur', 'saeki', 'sæki kröfur…'); return; }
    if (p.stada === 'villa') { setjaStodu('krofur', 'villa', 'villa'); setjaBuk('krofur', '<div class="gr-villa">' + esc(p.villa) + '</div>'); return; }
    const k = g.krofur; if (!k || !k.kr) return;
    const lik = likTegund(g) || { tegund: 'annad', rok: '' };
    const teg = S.tegundVal || lik.tegund;
    const t = k.kr.tegundir.get(teg) || k.kr.tegundir.get('annad');
    if (!t) { setjaBuk('krofur', '<div class="gr-tomt">Engar kröfur skráðar fyrir tegundina.</div>'); return; }
    g.tegund = { tegund: t.tegund, heiti: t.heiti, notkunarflokkur: t.notkunarflokkur, rok: S.tegundVal ? 'handvalið hér (ekki vistað)' : lik.rok };
    setjaStodu('krofur', 'komid', t.heiti);
    setjaUndir('krofur', t.notkunarflokkur ? 'notkunarflokkur ' + t.notkunarflokkur : '');
    const ae = aaetlaTaeki(g);
    g.aaetlun = ae;
    const efni = (g.bygg && g.bygg.brunavarnir && g.bygg.brunavarnir.efni) || {};
    const F = window.Flokkun;
    const kerfi = (F && F.KERFI ? F.KERFI : []).map((x) => ({ x, r: t.kerfi.get(x.k) })).filter((y) => y.r && y.r.skylt && y.r.skylt !== 'nei');
    const nefnt = (kk) => { const e = efni[EFNI_KERFI[kk]]; if (!e) return ''; const ja = (e.daemi || []).some((d) => !d.neitun); return ja ? 'nefnt' : 'aðeins með neitun'; };
    const stodur = new Map((kerfiStodur(g) || []).map((x) => [x.k, x]));
    const sel = '<label class="gr-takkar" style="margin-top:0"><span class="ssp-merki" style="margin-right:4px">Tegund</span><select class="ssp-reitur" data-gr-a="tegund" style="max-width:340px">' +
      k.kr.listi.map((x) => '<option value="' + esc(x.tegund) + '"' + (x.tegund === t.tegund ? ' selected' : '') + '>' + esc(x.heiti) + (x.tegund === lik.tegund ? ' (líkleg)' : '') + '</option>').join('') + '</select>' +
      '<span class="ssp-daufur" style="font-size:12px">' + esc(S.tegundVal ? 'Handvalið hér — ekki vistað.' : 'Líkleg: ' + lik.rok) + '</span></label>';
    const aeHtml = ae ? '<div class="gr-varud" style="background:#f4f6f9;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);color:#141822"><b>Slökkvitæki ≈ ' + ae.alls + '</b> (áætlað, miðað við 13A tæki — léttvatn 9 l): ' +
      ae.per.map((h) => esc(h.heiti) + ' ' + tala(h.m2) + ' m² → ' + h.n).join(' · ') + '. Regla: ≥ 2 á hæð, samanlagt slökkvigildi ≥ 0,065 × m² hæðar, aldrei < 26A' + (ae.helma ? '; slöngukefli/úðakerfi í lýsingu helmingar þörfina' : '') +
      '; gönguleið ≤ 25 m getur kallað á fleiri (165.BR1, 112/2012 9.4.4). m² úr ' + esc(ae.heimild) + '.</div>' : '<div class="gr-uppruni">Áætlaður tækjafjöldi þarf m² á hæð — engin lesin skráningartafla enn.</div>';
    safnByrja('krofur');
    const kBt = bestaBrunablad(g.teikn)[0];
    setjaBuk('krofur', '<div class="gr-krofu-haus">' + sel + (kBt ? '<div class="gr-skjal-fl gr-skjal-litil">' + fskFlis(kBt, 'Brunateikning', false, { hopur: 'krofur', undir: undirAf(kBt) }) + '</div>' : '') + '</div>' + kerfaRodHtml(g) + tdMerki('<table data-_pm-status-done="1" class="gr-tafla"><thead><tr><th>Kerfi</th><th>Krafa</th><th>Skilyrði / magn</th><th>Hér</th><th>Í byggingarlýsingu</th></tr></thead><tbody>' +
      kerfi.map(({ x, r }) => {
        const hint = r.skylt === 'skilyrt' ? skilyrdiHint((r.skilyrdi || '') + ' ' + (r.magn || ''), g) : '';
        const her = x.k === 'slokkvitaeki' && ae ? '≈ ' + ae.alls + ' tæki (áætlað)' : hint;
        const sx = stodur.get(x.k);
        return '<tr><td><span class="gr-kerfi-heiti">' + (sx ? taknHtml(sx.glyff, sx.stada, x.stutt || '', 22) : '') + '<b>' + esc(x.heiti) + '</b></span></td><td><span class="ssp-plata' + (r.skylt === 'ja' ? ' gr-dokk' : '') + '">' + esc(({ ja: 'Skylt', skilyrt: 'Skilyrt' })[r.skylt] || r.skylt) + '</span></td>' +
          '<td>' + esc(r.skilyrdi || '') + (r.magn ? '<br><span class="ssp-daufur">' + esc(r.magn) + '</span>' : '') + (r.heimild && r.heimild !== '—' ? '<br>' + (r.url ? '<a class="gr-hl" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.heimild) + '</a>' : esc(r.heimild)) : '') + '</td>' +
          '<td>' + (sx ? '<span class="gr-st st-' + sx.stada + '">' + esc(STADA_TXT[sx.stada]) + '</span><br><span class="ssp-daufur">' + esc(sx.hvadan) + '</span>' + (her ? '<br>' : '') : '') + esc(her || (sx ? '' : '—')) + '</td><td>' + esc(nefnt(x.k) || '—') + '</td></tr>';
      }).join('') + '</tbody></table>') + aeHtml +
      '<div class="gr-uppruni">Kröfur úr flokkar_krofur (reglusafn Arnolds) · leiðbeinandi — endanlegt samþykki er hjá hönnuði og slökkviliði.</div>');
  };

  /* 5 · TEIKNINGAR (374 TeiknSaekja / teikning_bord viðskiptavinar) ──────────────────────────────────────── */
  async function teikningar(g, hja) {
    const medBord = (hja && hja.listi || []).filter((r) => r.bord && Array.isArray(r.bord.haedir) && r.bord.haedir.length);
    const anBords = (hja && hja.listi || []).filter((r) => !(r.bord && Array.isArray(r.bord.haedir) && r.bord.haedir.length));
    const ut = { bord: [], dr: null, eign: null, villa: null, anBords: anBords.map((r) => r.co) };
    if (medBord.length) {
      // Hæðir viðskiptavinar eins og Teikning á þær + síðasta Designer-3D-mynd félagsins
      for (const r of medBord.slice(0, 3)) {
        let bl = null;
        try {
          const q = await sb().from('automation_triggers').select('id,result,finished_at').eq('workflow', 'blender').eq('gogn->>company_id', String(r.co.id)).eq('status', 'done').order('id', { ascending: false }).limit(4);
          if (!q.error) for (const x of q.data || []) { try { const t = String(x.result || ''); const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); if (j && Array.isArray(j.myndir) && j.myndir.length) { bl = { myndir: j.myndir, t: x.finished_at }; break; } } catch (_) {} }
        } catch (_) {}
        ut.bord.push({ co: r.co, bord: r.bord, blender: bl, taeki: r.taeki });
      }
    }
    // TurboPaint-borð félaganna á staðnum (turbopaint_boards: doc.objects[*].uttekt.companyId = félagið) — aðeins lesið
    const vids = ((hja && hja.listi) || []).map((r) => r.co).slice(0, 4);
    ut.tp = [];
    const tpP = Promise.all(vids.map(async (co) => {
      try {
        const q = await sb().from('turbopaint_boards').select('id,name,updated_at,objects:doc->objects').eq('deleted', false)
          .filter('doc', 'cs', JSON.stringify({ objects: [{ uttekt: { companyId: +co.id } }] })).order('updated_at', { ascending: false }).limit(6);
        if (q.error) return;
        (q.data || []).forEach((b) => {
          const obj = Array.isArray(b.objects) ? b.objects : [];
          const takn = obj.filter((o) => o && o.type === 'symbol');
          const teg = {}; takn.forEach((o) => { const n = String(o.name || o.symbolId || 'tákn'); teg[n] = (teg[n] || 0) + 1; });
          ut.tp.push({ co, id: b.id, nafn: b.name || 'Borð', uppfaert: b.updated_at, takn: takn.length, tegundir: Object.entries(teg).sort((a, z) => z[1] - a[1]).slice(0, 4), myndir: obj.filter((o) => o && o.type === 'image').length, haedir: tpHaedir(obj) });
        });
      } catch (_) {}
    }));
    // Skjalasafnið — líka fyrir viðskiptavini með hæðir (Agnar 09.10.2026: „sýndu bæði hæðirnar hans OG skjalasafnið")
    const safnP = (async () => {
      if (!window.TeiknSaekja || !TeiknSaekja.finna) throw new Error('Teikningaleitin (374) er ekki hlaðin');
      setjaSynd(S.adr);
      const r = await lota('teikn|' + afbr(g.adr), () => TeiknSaekja.finna(SYND));
      if (r && r.dr) { ut.dr = r.dr; ut.eign = r.eign || null; }
      else ut.villa = (r && r.villa) || 'Engin svör frá teikningaskránni';
      const e = ut.eign;
      const aukar = [];
      // Reykjavík: séruppdrættir (safn 5004) — blöðin sjálf með forskoðun
      if (e && e.landnr && (e.heimild === 'reykjavik' || (!e.svf && /reykjav/i.test(String(e.label || ''))))) {
        aukar.push(lota('ser|' + e.landnr, () => saekjaJson(SER + '?listi=1&landnr=' + encodeURIComponent(e.landnr), 25000)).then((j) => {
          if (j && j.error) ut.serVilla = 'Séruppdrættir Reykjavíkur svöruðu ekki (' + j.error + ')';
          let b = (j && Array.isArray(j.blod)) ? j.blod : [];
          const her = String(e.label || '').split('(')[0].trim().toLowerCase();
          const baraHer = b.filter((x) => !x.heimilisfang || String(x.heimilisfang).trim().toLowerCase() === her);
          if (baraHer.length) b = baraHer;
          ut.ser = b; ut.serCache = !!(j && j.cache);
        }, (err) => { ut.serVilla = 'Séruppdrættir Reykjavíkur svöruðu ekki (' + ((err && err.message) || err) + ')'; }));
      }
      // Kópavogur / Garðabær / Hafnarfjörður: stærð hvers PDF-blaðs (HEAD) — skemmd blöð sýnd sem skemmd, ekki falin
      const beinir = (ut.dr || []).filter((d) => d && !d.urelt && erBeintPdf(d.infoUrl));
      if (beinir.length) {
        aukar.push(lota('staerd|' + ((e && e.landnr) || afbr(g.adr)), () => saekjaJson(FOPIN + '?staerdir=1&' + beinir.slice(0, 120).map((d) => 'u=' + encodeURIComponent(d.infoUrl)).join('&'), 15000)).then((j) => {
          const st = (j && j.staerdir) || {};
          let n = 0;
          beinir.forEach((d) => { const b = st[d.infoUrl]; if (b != null && b < 5000) { d.skemmt = true; d.baeti = b; n++; } });
          ut.skemmd = n; ut.staerdKannad = Object.keys(st).length;
        }, () => {}));
      }
      await Promise.all(aukar);
    })();
    if (medBord.length) await safnP.catch((err) => { ut.villa = (err && err.message) || String(err); });
    else await safnP;
    await tpP;
    if (ut.dr) {
      const adal = (d) => /aðalupp|bygginga?nefnd/i.test(String(d.tegund || ''));
      let gild = ut.dr.filter((d) => d && d.infoUrl && !d.urelt);
      if (gild.some(adal)) gild = gild.filter(adal);
      const fl = gild.map((d) => ({ d, f: TeiknSaekja.flokka(d) }));
      const nyj = (a, b) => String(b.d.dags || '').localeCompare(String(a.d.dags || ''));
      ut.grunn = fl.filter((x) => x.f.grunn).sort(nyj);
      ut.snid = fl.filter((x) => !x.f.grunn && (x.f.snid || x.f.utlit)).sort(nyj);
      ut.adrir = ut.dr.filter((d) => /skr[áa]ning|byggingarl[ýy]sing/i.test(String(d.lysing || '') + ' ' + String(d.gerd || '')));
    }
    return ut;
  }
  const myndSlod = (u) => MYND + '?url=' + encodeURIComponent(u);
  const erBeintPdf = (u) => /\.pdf$/i.test(String(u || '')) && !/skjalasafn\.reykjavik/i.test(String(u || ''));
  /* 5a · HEITI HÆÐA OG FLOKKUN BLAÐA (Agnar 09.10.2026: „geturðu líka sett preview á hæðirnar og mikilvægar teikningar
   * með heitunum 1. hæð, 2. hæð og framvegis"). Hæðagreiningin er sú sama og „Finna allt húsið“ (383 fahLykill /
   * fahNafn / fahRod ofan á 374 TeiknSaekja.flokka); þak telst með risi og milligólf fær sitt heiti. */
  const HL = {
    lykill(t0) {
      const t = String(t0 || '').toLowerCase();
      if (/kjall/.test(t)) return 'K';
      if (/millig[óo]lf|millipall/.test(t)) return 'M';
      if (/(^|[^a-zþæöðáéíóúý])(ris|þak)/.test(t)) return 'R';
      const m = t.match(/(\d+)\.?\s*h(æ|ae)ð/) || t.match(/^(\d+)/);
      return m ? String(+m[1]) : t;
    },
    rod: (k) => (k === 'K' ? -1 : k === 'M' ? 1.5 : k === 'R' ? 999 : (/^\d+$/.test(String(k)) ? +k : 500)),
  };
  function haedaHeiti(keys, ris) {
    const k = keys.slice().sort((a, b) => HL.rod(a) - HL.rod(b));
    const tolur = k.filter((x) => /^\d+$/.test(x)).map(Number);
    let tl = '';
    if (tolur.length >= 3 && tolur[tolur.length - 1] - tolur[0] === tolur.length - 1) tl = tolur[0] + '.–' + tolur[tolur.length - 1] + '. hæð';
    else if (tolur.length === 2) tl = tolur[0] + '. og ' + tolur[1] + '. hæð';
    else if (tolur.length) tl = tolur.map((n) => n + '.').join(', ') + ' hæð';
    const hl = [];
    if (k.includes('K')) hl.push('Kjallari');
    if (tl) hl.push(tl);
    if (k.includes('M')) hl.push('Milligólf');
    if (k.includes('R')) hl.push(ris ? 'Ris' : 'Þak');
    const lag = hl.map((h, i) => (i && /^[A-ZÞÆÖÁÉÍÓÚÝÐ][a-zþæöðáéíóúý]/.test(h) ? h.charAt(0).toLowerCase() + h.slice(1) : h));
    return lag.length === 2 ? lag[0] + ' og ' + lag[1] : lag.join(', ');
  }
  // „A-B - Útlitsmyndir-vestur/suður hliðar A:02.07.13 Bætt inn … ,1:100" → „Útlitsmyndir-vestur/suður hliðar"
  const hreinsaTitil = (t) => String(t || '').replace(/^[A-ZÁÐÉÍÓÚÝÞÆÖ](?:-[A-ZÁÐÉÍÓÚÝÞÆÖ])*\s*-\s*/, '').replace(/\s+[A-Z]:\d{2}\.\d{2}\.\d{2,4}.*$/, '').replace(/\s*,\s*1:\d+.*$/, '').trim();
  // Garðabær skilur lýsinguna eftir tóma og setur tegund blaðsins í gerd („Grunnmynd, afstaða"); Hafnarfjörður setur „Óskráð"
  const blodTexti = (d) => [d.lysing, d.gerd && !/^(óskráð|annað)$/i.test(String(d.gerd).trim()) ? d.gerd : ''].filter(Boolean).join(' · ') || d.tegund || d.filename || '';
  const TEKNI = /raflagn|lagna|burðarv|sérupp|loftræs|járna|undirst|hita|fráveit|vatns|mæliblað|hæðablað/i;
  const arFra = (dags, n) => (dags && /^\d{4}/.test(dags) ? (+dags.slice(0, 4) + n) + dags.slice(4) : '');
  function flokkaBlod(dr, bygg) {
    const adal = (d) => /aðalupp|bygginga?nefnd/i.test(String(d.tegund || ''));
    const gild0 = (dr || []).filter((d) => d && d.infoUrl && !d.urelt);
    const gild = gild0.some(adal) ? gild0.filter(adal) : gild0.filter((d) => !TEKNI.test(String(d.tegund || '') + ' ' + String(d.gerd || '')));
    const rad = gild.map((d) => {
      const txt = blodTexti(d), tl = txt.toLowerCase();
      const f = (window.TeiknSaekja && TeiknSaekja.flokka) ? TeiknSaekja.flokka(Object.assign({}, d, { lysing: txt }))
        : { grunn: !!d.grunnmynd, snid: false, utlit: false, haed: [], kjallari: false, ris: false };
      const keys = f.grunn ? [].concat(f.kjallari ? ['K'] : [], (f.haed || []).map(String), /millig[óo]lf|millipall/.test(tl) ? ['M'] : [],
        (f.ris || /(^|[^a-zþæöðáéíóúý])þak/.test(tl)) ? ['R'] : []) : [];
      return { d, f, txt, titill: hreinsaTitil(txt), keys: [...new Set(keys)], ris: !!f.ris, dags: String(d.dags || ''),
        afstada: /afst[öo]ðu|afstaða|l[óo]ðarmynd|h[úu]s [áa] l[óo]ð/.test(tl), skraning: /skr[áa]ningartafl/.test(tl), lysing: /byggingarl[ýy]sing/.test(tl) };
    });
    const grunn = rad.filter((x) => x.f.grunn);
    const nefnd = grunn.filter((x) => x.keys.length);
    // Skráningartaflan (bygging-uppl) segir hve margar hæðir húsið hefur — blöð utan þess eru oftast eldra hús á lóðinni
    // (Fiskislóð 41: „Grunnmynd 7-8. hæð" 2006 og „kjallara K2" 2005 við hliðina á 2023-uppdráttum tveggja hæða húss).
    const bh = bygg && bygg.haedir, vis = !!(bh && bh.ofanjardar > 0 && bygg.oryggi && /há|miðl/.test(String(bygg.oryggi.haedir || '')));
    const utan = (k) => vis && ((/^\d+$/.test(k) && +k > bh.ofanjardar) || (k === 'K' && bh.kjallari === false));
    // nýjasta gilda blað hverrar hæðar fremst (sama dagsetning → blaðið sem nær yfir færri hæðir, eins og 383 velur)
    const bestur = new Map();
    nefnd.forEach((x) => x.keys.forEach((k) => {
      if (utan(k)) return;
      const b = bestur.get(k);
      if (!b || x.dags > b.dags || (x.dags === b.dags && x.keys.length < b.keys.length)) bestur.set(k, x);
    }));
    const adalBlod = new Map();
    bestur.forEach((x, k) => { if (!adalBlod.has(x)) adalBlod.set(x, []); adalBlod.get(x).push(k); });
    const haedir = [...adalBlod].map(([x, ks]) => ({ x, keys: ks.sort((a, b) => HL.rod(a) - HL.rod(b)) })).sort((a, b) => HL.rod(a.keys[0]) - HL.rod(b.keys[0]));
    const nyjast = nefnd.reduce((m, x) => (x.dags > m ? x.dags : m), '');
    const onefnd = grunn.filter((x) => !x.keys.length).sort((a, b) => String(a.d.filename || a.d.infoUrl).localeCompare(String(b.d.filename || b.d.infoUrl), 'is', { numeric: true }));
    // ónefnd grunnmyndablöð (Garðabær skráir ekki hæð) eru aðalatriði ef engin hæð er nefnd, annars aðeins jafnnýleg
    const onefndAdal = nefnd.length ? onefnd.filter((x) => x.dags && nyjast && x.dags >= arFra(nyjast, -1)) : onefnd;
    const nyrra = (a, b) => b.dags.localeCompare(a.dags);
    const passarEkki = nefnd.filter((x) => !adalBlod.has(x) && x.keys.every(utan)).sort(nyrra);
    const eldri = nefnd.filter((x) => !adalBlod.has(x) && !x.keys.every(utan)).concat(onefnd.filter((x) => !onefndAdal.includes(x))).sort(nyrra);
    // önnur blöð: gildandi útgáfa = blöð innan árs frá því nýjasta í flokknum; eldri undir „Eldri útgáfur"
    // („Útlit, snið“ á einu blaði er aðeins undir Sniði)
    const flokkur = (sia) => {
      const r = rad.filter((x) => !x.f.grunn && sia(x)).sort(nyrra);
      const n = r.length && r[0].dags ? arFra(r[0].dags, -1) : '';
      return { nyjar: r.filter((x) => !n || !x.dags || x.dags >= n), eldri: r.filter((x) => n && x.dags && x.dags < n) };
    };
    return {
      haedir, onefnd: onefndAdal, eldri, passarEkki, bh: vis ? bh : null, alls: gild.length,
      snid: flokkur((x) => x.f.snid), utlit: flokkur((x) => x.f.utlit && !x.f.snid), afstada: flokkur((x) => x.afstada),
      skraning: flokkur((x) => x.skraning), lysing: flokkur((x) => x.lysing),
    };
  }
  // „3 hæðir + kjallari, 2 snið, 4 útlit" — línan í Samantekt
  function teiknTeljari(fl) {
    const ks = new Set(); fl.haedir.forEach((h) => h.keys.forEach((k) => ks.add(k)));
    const tolur = [...ks].filter((k) => /^\d+$/.test(k)).length;
    const aukar = [ks.has('K') ? 'kjallari' : '', ks.has('M') ? 'milligólf' : '', ks.has('R') ? 'ris/þak' : ''].filter(Boolean);
    let s = (tolur ? tolur + (tolur === 1 ? ' hæð' : ' hæðir') : '') + (aukar.length ? (tolur ? ' + ' : '') + aukar.join(' + ') : '');
    if (!s && fl.onefnd.length) s = fl.onefnd.length + (fl.onefnd.length === 1 ? ' grunnmynd' : ' grunnmyndir') + ' (hæð óskráð)';
    const adrir = [[fl.snid.nyjar.length, 'snið', 'snið'], [fl.utlit.nyjar.length, 'útlit', 'útlit'], [fl.afstada.nyjar.length, 'afstöðumynd', 'afstöðumyndir']]
      .filter((x) => x[0]).map((x) => x[0] + ' ' + (x[0] === 1 ? x[1] : x[2]));
    return [s].concat(adrir).filter(Boolean).join(', ');
  }

  /* 5b · FORSKOÐUN — smámyndir hlaðnar latt (aðeins þær sem sjást), mest 2 PDF-teikningar í einu, geymdar í lotunni */
  const FSK = { io: null, bid: [], virk: 0, mest: 0, byrjad: 0, lokid: 0, villur: 0, HAMARK: 2 };
  const FSK_MYND = new Map();   // `${slóð}|${px}` → loforð um blob-slóð (lotan)
  const FSK_BUID = new Map();   // sama lykill → tilbúin blob-slóð (svo endurteikning sýni myndina strax, án blikks)
  // Eitt myndasafn per spjald: smellur (data-k + data-i) opnar rétt safn þótt annað spjald hafi teiknast á milli
  const SAFN = { teikn: [] };
  function safnByrja(k) { SAFN[k] = []; S.fskSafn = SAFN[k]; S.fskK = k; }
  let _pdfjsP = null;
  function pdfjsHlada() {
    if (window.pdfjsLib) return Promise.resolve();
    if (_pdfjsP) return _pdfjsP;
    // sama útgáfa og slóð og 383 saekjaPdfJs / 384 hladaPdfJs
    const P = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    _pdfjsP = new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = P + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = P + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => { _pdfjsP = null; rej(new Error('pdf.js hlóðst ekki')); };
      document.head.appendChild(sk);
    });
    return _pdfjsP;
  }
  // Fyrsta síða PDF-teikningar (Kópavogur, Garðabær, Hafnarfjörður — engin smámynd í skránni) í mynd, lengri hlið = px
  function pdfSmamynd(slod, px) {
    const k = slod + '|' + px;
    if (!FSK_MYND.has(k)) {
      const p = (async () => {
        await pdfjsHlada();
        const r = await fetch(PDFF + '?url=' + encodeURIComponent(slod), { signal: AbortSignal.timeout(45000) });
        if (!r.ok) throw new Error('PDF fékkst ekki (' + r.status + ')');
        const baeti = new Uint8Array(await r.arrayBuffer());
        if (baeti.length < 5000) { const e = new Error('skemmt'); e.skemmt = baeti.length; throw e; }
        const doc = await window.pdfjsLib.getDocument({ data: baeti }).promise;
        try {
          const s = await doc.getPage(1), v0 = s.getViewport({ scale: 1 });
          const vp = s.getViewport({ scale: px / Math.max(v0.width, v0.height, 1) });
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(vp.width)); cv.height = Math.max(1, Math.round(vp.height));
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
          await s.render({ canvasContext: cx, viewport: vp }).promise;
          const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.84));
          if (!blob) throw new Error('mynd varð ekki til');
          const url = URL.createObjectURL(blob);
          FSK_BUID.set(k, url);
          return url;
        } finally { try { doc.destroy(); } catch (_) {} }
      })();
      FSK_MYND.set(k, p);
      p.catch(() => FSK_MYND.delete(k));
    }
    return FSK_MYND.get(k);
  }
  function fskFesta(rot) {
    if (!rot) return;
    if (!FSK.io && 'IntersectionObserver' in window) {
      FSK.io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { FSK.io.unobserve(en.target); fskHlada(en.target); } }), { rootMargin: '250px 0px' });
    }
    rot.querySelectorAll('[data-gr-fskm]:not([data-fsk-ath])').forEach((el) => { el.setAttribute('data-fsk-ath', '1'); if (FSK.io) FSK.io.observe(el); else fskHlada(el); });
  }
  function fskHlada(el) {
    const beint = el.getAttribute('data-th') || el.getAttribute('data-mynd');
    if (beint) { fskSetja(el, beint); return; }   // smámynd skjalasafnsins — vafrinn sækir hana sjálfur
    if (el.getAttribute('data-pdf')) { FSK.bid.push(el); fskNaesta(); }
  }
  function fskNaesta() {
    while (FSK.virk < FSK.HAMARK && FSK.bid.length) {
      const el = FSK.bid.shift();
      if (!el.isConnected) continue;
      FSK.virk++; FSK.byrjad++; if (FSK.virk > FSK.mest) FSK.mest = FSK.virk;
      el.setAttribute("data-fsk-byrjad", "1");   // prófin sjá hvaða reitir fóru af stað (aðeins þeir sem sáust)
      pdfSmamynd(el.getAttribute('data-pdf'), +(el.getAttribute('data-px') || 380))
        .then((u) => { FSK.lokid++; fskSetja(el, u); }, (e) => { FSK.villur++; fskVilla(el, e); })
        .finally(() => { FSK.virk--; fskNaesta(); });
    }
  }
  function fskSetja(el, src) {
    if (!el.isConnected || el.querySelector(':scope > img')) return;
    const im = new Image(); im.alt = ''; im.decoding = 'async';
    const st = el.getAttribute('data-still'); if (st) im.setAttribute('style', st);
    im.onload = () => { const b = el.querySelector(':scope > .gr-fsk-bid'); if (b) b.remove(); };
    im.onerror = () => { im.remove(); fskVilla(el); };
    im.src = src;
    el.insertBefore(im, el.firstChild);
  }
  function fskVilla(el, e) {
    const b = el.querySelector(':scope > .gr-fsk-bid'); if (b) b.textContent = e && e.skemmt ? 'Skemmt hjá sveitarfélagi (' + e.skemmt + ' bæti)' : 'Engin forskoðun — smelltu til að opna';
  }
  // Bein <img> í smámynd sem brást (skjalasafnið niðri) → staðgengill segir það, engin brotin mynd
  document.addEventListener('error', (e) => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.parentElement || !im.parentElement.hasAttribute('data-gr-fskm')) return;
    const el = im.parentElement; im.remove(); fskVilla(el);
  }, true);
  // Smámynd eins blaðs; skráð í myndasafn spjaldsins (S.fskSafn) svo smellur opni stóru myndina með örvum milli blaða
  function fskFlis(x, heiti, eldri, opt) {
    opt = opt || {};
    const d = x.d, pdf = erBeintPdf(d.infoUrl);
    const undir = opt.undir != null ? opt.undir : [dags(d.dags) || 'án dags.', x.titill].filter(Boolean).join(' · ');
    if (d.skemmt) {
      return '<div class="gr-fsk gr-fsk-skemmt" title="' + esc(heiti + ' — skjalið er skemmt hjá sveitarfélaginu (' + (d.baeti || '?') + ' bæti) og opnast ekki') + '"><span class="gr-fsk-mynd"><span class="gr-fsk-bid">Skemmt hjá sveitarfélagi' + (d.baeti ? ' (' + d.baeti + ' bæti)' : '') + '</span></span>' +
        '<span class="gr-fsk-heiti">' + esc(heiti) + '</span><span class="gr-fsk-undir">' + esc(undir) + '</span></div>';
    }
    const i = S.fskSafn.length;
    const lys = x.titill && x.titill !== heiti ? x.titill : '';
    const tpTitill = [(S.g && S.g.adr) || '', heiti + (lys ? ': ' + lys : '')].filter(Boolean).join(' — ') + (d.dags ? ' (' + dags(d.dags) + ')' : '');
    S.fskSafn.push({ titill: heiti, undir, slod: d.infoUrl, tpTitill, pdf: pdf ? d.infoUrl : null, mynd: pdf ? null : (d.stor || myndSlod(d.infoUrl)), forsk: !d.ser5004, eldri: !!eldri, hopur: opt.hopur || (eldri ? 'eldri' : 'adal') });
    // litla TurboPaint-táknið aðeins á smámyndum „Úr skjalasafni“ (Teikningar-spjaldið); stóri skoðarinn sýnir takkann alls staðar
    const tu = S.fskK === 'teikn' ? tpSlod({ slod: d.infoUrl, tpTitill }) : null;
    const buid = pdf ? FSK_BUID.get(d.infoUrl + '|380') : null;
    const src = d.thumb || buid;
    const m = src ? ' data-fsk-ath="1"' : (pdf ? ' data-pdf="' + esc(d.infoUrl) + '"' : ' data-mynd="' + esc(myndSlod(d.infoUrl)) + '"');
    return '<button type="button" class="gr-fsk" data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + i + '" title="' + esc(heiti + ' — ' + undir) + '">' +
      '<span class="gr-fsk-mynd" data-gr-fskm' + m + '>' + (src ? '<img alt="" loading="lazy" decoding="async" src="' + esc(src) + '">' : '') + '<span class="gr-fsk-bid">' + (pdf ? 'Teikna forskoðun…' : 'Sæki forskoðun…') + '</span></span>' +
      '<span class="gr-fsk-heiti">' + esc(heiti) + '</span><span class="gr-fsk-undir">' + esc(undir) + '</span>' +
      (tu ? '<span class="gr-fsk-tp" role="link" data-tp="' + esc(tu) + '" title="Skoða í TurboPaint í hæstu gæðum — ekkert borð búið til">TurboPaint</span>' : '') + '</button>';
  }

  /* 5c · STÓR MYND MEÐ ÖRVUM (← → milli hæða og blaða, Esc lokar) */
  const STOR = new Map();
  function skeraMynd(src, sk, fr, hamark) {
    return new Promise((res, rej) => {
      const im = new Image();
      try { if (new URL(src, location.href).origin !== location.origin && !/^(blob|data):/.test(src)) im.crossOrigin = 'anonymous'; } catch (_) {}
      im.onload = () => {
        try {
          const W = im.naturalWidth, H = im.naturalHeight;
          const x = sk.x / fr.b * W, y = sk.y / fr.h * H, w = sk.w / fr.b * W, h = sk.h / fr.h * H;
          const k = Math.min(1, (hamark || 3200) / Math.max(w, h, 1));
          const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(im, x, y, w, h, 0, 0, cv.width, cv.height);
          cv.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('skurður'))), 'image/jpeg', 0.9);
        } catch (e) { rej(e); }
      };
      im.onerror = () => rej(new Error('mynd'));
      im.src = src;
    });
  }
  function storMynd(it) {
    const lyk = (it.pdf || it.mynd || '') + (it.skurdur ? '#' + [it.skurdur.x, it.skurdur.y, it.skurdur.w, it.skurdur.h].join(',') : '');
    if (!STOR.has(lyk)) {
      const p = (async () => {
        const src = it.pdf ? await pdfSmamynd(it.pdf, 2600) : it.mynd;
        if (!it.skurdur || !it.frum) return src;
        try { return await skeraMynd(src, it.skurdur, it.frum); } catch (_) { return src; }   // menguð mynd → allt blaðið
      })();
      STOR.set(lyk, p); p.catch(() => STOR.delete(lyk));
    }
    return STOR.get(lyk);
  }
  // Háupplausnarútgáfa blaðs fyrir aðdrátt (Agnar 09.10.2026: „það er bara ein zoomstilling … Væri frábært ef ég gæti notað
  // scrollhjólið á músinni til að zooma inn og út og hreyft viewið í zoominu"): vigur-PDF teiknað aftur með pdf.js í mikilli
  // upplausn (skarpur texti), TIF/JPEG úr skjalasafni í fullri upplausn um teikn-mynd. Skurður hæðar (Teikning) skorinn úr
  // háupplausnarmyndinni. null = engin betri útgáfa til (Designer-3D, vinnumynd, loftmynd).
  const HAUPPL = new Map();
  function haupplausn(it) {
    const PX = (window.innerWidth || 1200) < 700 ? 4200 : 5600;
    const innri = (u) => { try { const x = new URL(u, location.href); return /teikn-(mynd|pdf)/.test(x.pathname) ? (x.searchParams.get('url') || '') : ''; } catch (_) { return ''; } };
    const frum = it.slod || innri(it.mynd || '') || '';
    const lyk = (it.pdf || frum || it.mynd || '') + (it.skurdur ? '#' + [it.skurdur.x, it.skurdur.y, it.skurdur.w, it.skurdur.h].join(',') : '') + '|hr';
    if (HAUPPL.has(lyk)) return HAUPPL.get(lyk);
    const pdfSlod = it.pdf || (/\.pdf(\.info)?$/i.test(frum) ? frum : '');
    let p = null;
    if (pdfSlod) p = pdfSmamynd(pdfSlod, PX);
    else if (frum && /^https:\/\/(skjalasafn\.reykjavik\.is|teikningar\.hafnarfjordur\.is)\//.test(frum)) p = Promise.resolve(myndSlod(frum));
    else if (it.mynd && it.skurdur && it.frum) p = Promise.resolve(it.mynd);
    else return null;
    if (it.skurdur && it.frum) p = p.then((src) => skeraMynd(src, it.skurdur, it.frum, 7000));
    HAUPPL.set(lyk, p); p.catch(() => HAUPPL.delete(lyk));
    return p;
  }
  let _ljosLok = null;
  function ljosSafn(safn0, i0) {
    if (_ljosLok) _ljosLok();
    // örvarnar fara um gildandi blöð — eða um eldri útgáfurnar sé ein þeirra opnuð
    const byrjun = safn0[i0] || safn0[0];
    const hopurAf = (x) => (x && x.hopur) || (x && x.eldri ? 'eldri' : 'adal');
    const safn = safn0.filter((x) => hopurAf(x) === hopurAf(byrjun));
    const fjoldi = safn.length;
    const o = document.createElement('div');
    o.id = 'gr-ljos'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="gr-lh"><span class="gr-ltitill"></span><span class="gr-lundir"></span><span class="gr-lbil"></span>' +
      (fjoldi > 1 ? '<span class="gr-lteljari"></span>' : '') +
      '<span class="gr-lz" role="group" aria-label="Aðdráttur"><button type="button" class="ssp-btn" data-gr-lz="-1" title="Minnka (−)" aria-label="Minnka">−</button><span class="gr-lzt">100 %</span>' +
      '<button type="button" class="ssp-btn" data-gr-lz="1" title="Stækka (+) — líka skrunhjól og tvísmellur" aria-label="Stækka">+</button><button type="button" class="ssp-btn" data-gr-lz="0" title="Passa í glugga (0)">Passa</button></span>' +
      '<a class="ssp-btn" data-gr-ltp hidden target="_blank" rel="noopener">Skoða í TurboPaint</a>' +
      '<button type="button" class="ssp-btn" data-gr-lfsk hidden title="Opnar forskoðun teikninganna (384): þysja, prenta, sækja í fullum gæðum">Forskoðun</button><button type="button" class="ssp-btn" data-gr-loka>Loka</button></div>' +
      '<div class="gr-lb"><span class="gr-lbid">Sæki mynd…</span><img alt="" hidden draggable="false"><span class="gr-lhr" hidden>Hleð skarpri útgáfu…</span></div>' +
      (fjoldi > 1 ? '<button type="button" class="gr-lor v" data-gr-lor="-1" aria-label="Fyrri teikning">‹</button><button type="button" class="gr-lor h" data-gr-lor="1" aria-label="Næsta teikning">›</button>' : '');
    document.body.appendChild(o);
    const img = o.querySelector('.gr-lb img'), bid = o.querySelector('.gr-lbid'), lb = o.querySelector('.gr-lb'), hrM = o.querySelector('.gr-lhr'), zt = o.querySelector('.gr-lzt');
    let nr = -1, kall = 0;
    // ── AÐDRÁTTUR: z = 1 er „passa í glugga" (bw × bh); myndin er staðsett með left/top/width/height (alltaf skörp — engin
    //    teygð rasta úr transform). Aðdráttur um punkt heldur punktinum undir bendlinum kyrrum.
    const V = { z: 1, tx: 0, ty: 0, bw: 0, bh: 0, ar: 0, syntNr: -1, hr: false, hrBid: false };
    const ZMIN = 1, ZMAX = 12, BIL = 10;
    const kassi = () => lb.getBoundingClientRect();
    const passa = () => {
      const k = kassi(); if (!V.ar || !k.width) return;
      const w = Math.max(40, k.width - 2 * BIL), h = Math.max(40, k.height - 2 * BIL);
      if (w / h > V.ar) { V.bh = h; V.bw = h * V.ar; } else { V.bw = w; V.bh = w / V.ar; }
    };
    const midja = () => { const k = kassi(); V.z = 1; V.tx = (k.width - V.bw) / 2; V.ty = (k.height - V.bh) / 2; };
    // myndin má aldrei hverfa: a.m.k. 30 % af glugganum (eða myndinni, ef hún er minni) sést alltaf
    const halda = () => {
      const k = kassi(), W = V.bw * V.z, H = V.bh * V.z, mx = Math.min(W, k.width) * 0.3, my = Math.min(H, k.height) * 0.3;
      V.tx = Math.min(k.width - mx, Math.max(mx - W, V.tx)); V.ty = Math.min(k.height - my, Math.max(my - H, V.ty));
    };
    const beita = () => {
      if (!V.bw) return;
      img.style.width = (V.bw * V.z).toFixed(2) + 'px'; img.style.height = (V.bh * V.z).toFixed(2) + 'px';
      img.style.left = V.tx.toFixed(2) + 'px'; img.style.top = V.ty.toFixed(2) + 'px';
      lb.classList.toggle('zm', V.z > 1.001);
      if (zt) zt.textContent = Math.round(V.z * 100) + ' %';
      if (V.z > 1.5) skarpari();
    };
    const zoom = (f, px, py) => {
      if (img.hidden || !V.bw) return false;
      const z2 = Math.min(ZMAX, Math.max(ZMIN, V.z * f));
      if (Math.abs(z2 - V.z) < 1e-4) return false;
      const ux = (px - V.tx) / (V.bw * V.z), uy = (py - V.ty) / (V.bh * V.z);
      V.z = z2; V.tx = px - ux * V.bw * z2; V.ty = py - uy * V.bh * z2;
      if (V.z <= 1.0001) midja(); else halda();
      beita();
      return true;
    };
    const iMidju = (f) => { const k = kassi(); zoom(f, k.width / 2, k.height / 2); };
    const vixla = (cx, cy) => { const k = kassi(); if (V.z > 1.05) { midja(); beita(); } else zoom(2.5 / V.z, cx - k.left, cy - k.top); };
    // skarpari útgáfa yfir 1,5× — sama rúmfræði (bw × bh), aðeins upplausn myndarinnar breytist
    const skarpari = () => {
      if (V.hr || V.hrBid) return;
      // blað sem er þegar í fullri upplausn (frumrit ≥ 4000 px, t.d. TIF úr skjalasafni) er skarpt — ekkert sótt aftur
      if (Math.max(img.naturalWidth, img.naturalHeight) >= 4000) { V.hr = true; img.dataset.hr = 'frumrit'; return; }
      const it = safn[nr]; const p = it ? haupplausn(it) : null;
      if (!p) { V.hr = true; return; }
      V.hrBid = true; hrM.hidden = false;
      const k = kall;
      p.then((src) => {
        if (k !== kall) return;
        if (!src || src === img.getAttribute('src')) { V.hr = true; V.hrBid = false; hrM.hidden = true; return; }
        const pre = new Image();
        pre.onload = () => { if (k !== kall) return; img.src = src; img.dataset.hr = '1'; V.hr = true; V.hrBid = false; hrM.hidden = true; };
        pre.onerror = () => { if (k === kall) { V.hr = true; V.hrBid = false; hrM.hidden = true; } };
        pre.src = src;
      }, () => { if (k === kall) { V.hr = true; V.hrBid = false; hrM.hidden = true; } });
    };
    img.addEventListener('load', () => {
      if (V.syntNr === nr) return;   // háupplausnin kom — rúmfræðin stendur
      V.syntNr = nr; V.ar = img.naturalWidth / Math.max(1, img.naturalHeight);
      passa(); midja(); beita();
    });
    const syna = (n) => {
      if (n < 0 || n >= fjoldi || n === nr) return;
      nr = n; const it = safn[n], k = ++kall;
      o.querySelector('.gr-ltitill').textContent = it.titill || 'Mynd';
      o.querySelector('.gr-lundir').textContent = it.undir || '';
      const tj = o.querySelector('.gr-lteljari'); if (tj) tj.textContent = (n + 1) + ' / ' + fjoldi;
      o.setAttribute('aria-label', it.titill || 'Mynd');
      o.querySelectorAll('[data-gr-lor]').forEach((b) => { const s = n + +b.getAttribute('data-gr-lor'); b.disabled = s < 0 || s >= fjoldi; });
      const fb = o.querySelector('[data-gr-lfsk]'); if (fb) fb.hidden = !it.forsk;
      const tp = o.querySelector('[data-gr-ltp]'), tu = tpSlod(it); if (tp) { tp.hidden = !tu; if (tu) tp.href = tu; else tp.removeAttribute('href'); }
      // nýtt blað: aðdráttur endurstilltur
      Object.assign(V, { z: 1, syntNr: -1, hr: false, hrBid: false }); hrM.hidden = true; delete img.dataset.hr;
      lb.classList.remove('zm'); if (zt) zt.textContent = '100 %';
      img.hidden = true; bid.hidden = false; bid.textContent = it.pdf ? 'Teikna PDF-teikninguna…' : 'Sæki mynd…';
      storMynd(it).then((src) => {
        if (k !== kall) return;
        img.onload = () => { if (k === kall) { img.hidden = false; bid.hidden = true; } };
        img.onerror = () => { if (k === kall) bid.textContent = 'Myndin fékkst ekki.'; };
        img.removeAttribute('src'); img.src = src;
      }, (e) => { if (k === kall) bid.textContent = 'Myndin fékkst ekki (' + ((e && e.message) || e) + ').'; });
    };
    // ── skrunhjól: aðdráttur um bendilinn; síðan sjálf skrunar aldrei meðan skoðarinn er opinn
    o.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!e.target.closest || !e.target.closest('.gr-lb')) return;
      const r = kassi(), d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      zoom(Math.exp(-Math.max(-300, Math.min(300, d)) * 0.0018), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    // ── músardráttur / snerting (pointer events): einn bendill hliðrar, tveir fingur klípa, tvípikk víxlar
    const ptr = new Map();
    let drag = null, klipa = null, hreyft = false, sidastaPik = null, sidastaTeg = 'mouse';
    lb.addEventListener('pointerdown', (e) => {
      sidastaTeg = e.pointerType || 'mouse';
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (img.hidden) return;
      try { lb.setPointerCapture(e.pointerId); } catch (_) {}
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) hreyft = false;
      if (ptr.size >= 2) { const [a, b] = [...ptr.values()]; klipa = { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; }
      else { drag = { x: e.clientX, y: e.clientY }; if (V.z > 1.001) lb.classList.add('drag'); }
    });
    lb.addEventListener('pointermove', (e) => {
      if (!ptr.has(e.pointerId)) return;
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (klipa && ptr.size >= 2) {
        const [a, b] = [...ptr.values()], d = Math.hypot(b.x - a.x, b.y - a.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = kassi();
        V.tx += mx - klipa.mx; V.ty += my - klipa.my;   // hliðrun með miðpunkti fingranna
        const f = d / klipa.d;
        klipa = { d, mx, my }; hreyft = true;
        if (!zoom(f, mx - r.left, my - r.top)) { halda(); beita(); }
        return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) hreyft = true;
        if (V.z > 1.001) { V.tx += dx; V.ty += dy; halda(); beita(); }
        drag = { x: e.clientX, y: e.clientY };
      }
    });
    const upp = (e) => {
      if (!ptr.has(e.pointerId)) return;
      ptr.delete(e.pointerId);
      if (ptr.size < 2) klipa = null;
      if (ptr.size === 1) { const a = [...ptr.values()][0]; drag = { x: a.x, y: a.y }; }
      if (!ptr.size) {
        drag = null; lb.classList.remove('drag');
        if (e.type === 'pointerup' && e.pointerType !== 'mouse' && !hreyft) {
          const nu = Date.now();
          if (sidastaPik && nu - sidastaPik.t < 330 && Math.hypot(e.clientX - sidastaPik.x, e.clientY - sidastaPik.y) < 30) { vixla(e.clientX, e.clientY); sidastaPik = null; }
          else sidastaPik = { t: nu, x: e.clientX, y: e.clientY };
        }
      }
    };
    lb.addEventListener('pointerup', upp); lb.addEventListener('pointercancel', upp);
    lb.addEventListener('dblclick', (e) => { e.preventDefault(); if (sidastaTeg === 'mouse' && !img.hidden) vixla(e.clientX, e.clientY); });
    const nyStaerd = () => { if (!V.ar) return; passa(); midja(); beita(); };
    window.addEventListener('resize', nyStaerd);
    const lykill = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); loka(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); syna(nr + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); syna(nr - 1); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); iMidju(1.25); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); iMidju(0.8); }
      else if (e.key === '0') { e.preventDefault(); e.stopPropagation(); if (V.bw) { midja(); beita(); } }
    };
    const loka = () => { o.remove(); document.removeEventListener('keydown', lykill, true); window.removeEventListener('resize', nyStaerd); _ljosLok = null; };
    o.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-gr-loka]')) { loka(); return; }
      const lor = t.closest('[data-gr-lor]'); if (lor) { syna(nr + +lor.getAttribute('data-gr-lor')); return; }
      const lz = t.closest('[data-gr-lz]'); if (lz) { const v = +lz.getAttribute('data-gr-lz'); if (!v) { if (V.bw) { midja(); beita(); } } else iMidju(v > 0 ? 1.25 : 0.8); return; }
      if (t.closest('[data-gr-lfsk]')) { loka(); opnaForskodun(); return; }
      // smellur á auðan flöt utan myndarinnar lokar — ekki eftir drátt, og aldrei á myndina sjálfa
      if (t === lb && !hreyft) {
        const r = img.getBoundingClientRect();
        if (img.hidden || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) loka();
      }
    });
    document.addEventListener('keydown', lykill, true);
    _ljosLok = loka;
    o.__skodari = { V, zoom, beita, midja };   // prófin lesa stöðuna
    syna(Math.max(0, safn.indexOf(byrjun)));
  }

  /* 5d · HÆÐIR VIÐSKIPTAVINAR ÚR TEIKNINGU (skurður, tæki, vinnumynd 445) */
  function haedHtml(co, h, i) {
    const lyk = co.id + ':' + (h.id || i);
    const vm = h.vinnumynd && h.vinnumynd.url;
    const hamur = S.opidHaed[lyk] || (vm ? 'vm' : '2d');
    const mk = (Array.isArray(h.markers) ? h.markers : []);
    const taeki = mk.filter((m) => !(m && (m.kind === 'sign' || String(m.unitId || '').indexOf('s:') === 0))).length;
    const nafn = h.nafn || ('Hæð ' + (i + 1));
    const haus = '<div class="gr-haed-haus">' + esc(nafn) + ' <span class="ssp-daufur" style="font:500 11px ' + MONO + '">' + taeki + ' tæki merkt</span>' +
      (vm ? '<button type="button" class="ssp-btn" data-gr-a="vm" data-k="' + esc(lyk) + '" style="height:26px!important;padding:0 8px!important;font-size:11.5px!important">' + (hamur === 'vm' ? '2D með tækjum' : 'Vinnumynd') + '</button>' : '') + '</div>';
    const nr = S.fskSafn.length;
    const titill = co.nafn + ' — ' + nafn;
    // hlutföll myndarinnar fyrirfram (vinnumynd ber b/h) — myndin sem hleðst seinna ýtir engu niður
    const vmHlutf = h.vinnumynd && h.vinnumynd.b > 0 && h.vinnumynd.h > 0 ? ' style="aspect-ratio:' + (h.vinnumynd.b / h.vinnumynd.h).toFixed(4) + '"' : '';
    if (hamur === 'vm' && vm) {
      S.fskSafn.push({ titill, undir: 'Vinnumynd úr Teikningu · ' + taeki + ' tæki merkt', mynd: vm });
      return '<div class="gr-haed">' + haus + '<img class="gr-vm" loading="lazy" alt=""' + vmHlutf + ' src="' + esc(vm) + '" data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + nr + '"></div>';
    }
    const url = h.image_url;
    if (!url || /^data:/.test(url) && url.length > 4e6) return '<div class="gr-haed">' + haus + '<div class="gr-tomt" style="padding:10px">Engin mynd á hæðinni.</div></div>';
    const fr = h.frum && h.frum.b && h.frum.h ? h.frum : null;
    const sk = h.skurdur && h.skurdur.w > 0 && h.skurdur.h > 0 && fr ? h.skurdur : (fr ? { x: 0, y: 0, w: fr.b, h: fr.h } : null);
    // Bein PDF-teikning (Hafnarfjörður, Kópavogur, Garðabær): <img> getur ekki birt PDF — fyrsta síðan er teiknuð með pdf.js
    // þegar hæðin sést (latt, mest 2 í einu), ekki lengur „smelltu til að birta“.
    const innri = (() => { try { return new URL(url, location.href).searchParams.get('url') || url; } catch (_) { return url; } })();
    const pdfHaed = erBeintPdf(innri);
    S.fskSafn.push({ titill, undir: 'Teikning · ' + taeki + ' tæki merkt' + (h.uppruni && h.uppruni.dags ? ' · blað ' + dags(h.uppruni.dags) : ''), mynd: pdfHaed ? null : url, pdf: pdfHaed ? innri : null, skurdur: sk && fr ? sk : null, frum: fr });
    const smella = ' data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + nr + '"';
    if (!sk || !fr) {
      if (pdfHaed) return '<div class="gr-haed">' + haus + '<span class="gr-fsk-mynd gr-haed-pdf" data-gr-fskm data-pdf="' + esc(innri) + '" data-px="1100"' + smella + '><span class="gr-fsk-bid">Teikna forskoðun…</span></span></div>';
      return '<div class="gr-haed">' + haus + '<img class="gr-vm" loading="lazy" alt="" src="' + esc(url) + '"' + smella + '></div>';
    }
    const pct = (v) => (Math.round(v * 10000) / 100) + '%';
    const pts = mk.filter((m) => m && isFinite(m.x) && isFinite(m.y) && m.x >= sk.x && m.x <= sk.x + sk.w && m.y >= sk.y && m.y <= sk.y + sk.h)
      .map((m) => '<i class="gr-pt' + ((m.kind === 'sign' || String(m.unitId || '').indexOf('s:') === 0) ? ' st' : '') + '" style="left:' + pct((m.x - sk.x) / sk.w) + ';top:' + pct((m.y - sk.y) / sk.h) + '"></i>').join('');
    const imgStill = 'width:' + pct(fr.b / sk.w) + ';height:' + pct(fr.h / sk.h) + ';left:' + pct(-sk.x / sk.w) + ';top:' + pct(-sk.y / sk.h);
    const hlutf = ' style="aspect-ratio:' + (sk.w / sk.h).toFixed(4) + '"';
    if (pdfHaed) return '<div class="gr-haed">' + haus + '<div class="gr-skurdur"' + hlutf + ' data-gr-fskm data-pdf="' + esc(innri) + '" data-px="1800" data-still="' + esc(imgStill) + '"' + smella + '><span class="gr-fsk-bid">Teikna forskoðun…</span>' + pts + '</div></div>';
    return '<div class="gr-haed">' + haus + '<div class="gr-skurdur"' + hlutf + smella + '>' +
      '<img loading="lazy" alt="" src="' + esc(url) + '" style="' + imgStill + '">' + pts + '</div></div>';
  }
  function thrivHtml(b) {
    const bl = b.blender;
    if (!bl || !Array.isArray(bl.myndir) || !bl.myndir.length) return '';
    const ms = bl.myndir.slice(0, 3);
    const nr0 = S.fskSafn.length;
    ms.forEach((m) => S.fskSafn.push({ titill: 'Designer-3D — ' + b.co.nafn, undir: kl(bl.t) + (m.heiti ? ' · ' + m.heiti : ''), mynd: m.url }));
    return '<div class="gr-haed gr-haed-3d"><div class="gr-haed-haus">Designer-3D <span class="ssp-daufur" style="font:500 11px ' + MONO + '">' + esc(kl(bl.t)) + '</span></div>' +
      '<button type="button" class="gr-3d-flis" data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + nr0 + '" title="Stækka"><img loading="lazy" alt="' + esc(ms[0].heiti || 'Designer-3D') + '" src="' + esc(ms[0].url) + '"></button>' +
      (ms.length > 1 ? '<div class="gr-3d-fleiri">' + ms.slice(1).map((m, j) => '<button type="button" data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + (nr0 + 1 + j) + '" title="' + esc(m.heiti || '') + '"><img loading="lazy" alt="" src="' + esc(m.url) + '"></button>').join('') + '</div>' : '') + '</div>';
  }

  /* 5e · SÉRTEIKNINGAR (Agnar 09.10.2026: „geturðu látið sjást preview af þessum sérteikningum, yfirlit, brunakerfi,
   * pípulagnir, og þess háttar. Eitthvað svona meira myndrænt") — flokkar raðaðir eftir gagnsemi fyrir okkur.
   * Reykjavík: séruppdrættir eru í FotoWeb-safni 5004 (seruppdrattir?listi=1 — Raflagnir, Lagnir, Burður, Sérteikningar;
   * safnið gefur hvorki lýsingu né dagsetningu, aðeins byggingarnefndarnúmer) + brunablöð og afstöðumyndir úr
   * aðaluppdráttum (5000). Kópavogur / Garðabær / Hafnarfjörður: `tegund` og lýsing í teikn-listi. */
  const SER_FLOKKAR = [['bruna', 'Brunavarnir'], ['yfirlit', 'Yfirlit og afstöðumynd'], ['raf', 'Raflagnir'], ['lagnir', 'Lagnir — pípur, vatn, hiti, úðakerfi'], ['loft', 'Loftræsting'], ['burdur', 'Burðarvirki'], ['annad', 'Annað']];
  const SER_HEITI = { raf: 'Raflagnir', lagnir: 'Lagnir', loft: 'Loftræsting', burdur: 'Burðarvirki', annad: 'Sérteikning', bruna: 'Brunavarnir', yfirlit: 'Yfirlit' };
  const SER_BRUNA = /bruna|eldvarn|fl[óo]ttalei|r[ýy]mingar|reykr[æa]st|reyklos|reykl[úu]g/;
  const SER_YFIRLIT = /afst[öo][ðd]u|afsta[ðd]a|l[óo][ðd]arm|l[óo][ðd]arbl|m[æa]libl|h[æa][ðd]abl|h[úu]s [áa] l[óo][ðd]|yfirlit|fr[áa]gangur l[óo]/;
  const SER_LOFT = /loftr[æa]s|loftun|loftlagn/;
  const SER_TOFLU = /t[öo]flu|tafla|t[öo]flur|rafmagnst|lj[óo]s og tengl|tenglar/;
  const dagsGild = (s) => (parseInt(String(s || ''), 10) >= 1850 ? String(s) : '');   // „1753-01-01" = óskráð í Hafnarfirði
  function serFlokkur(d) {
    const tg = String(d.tegund || ''), txt = (tg + ' ' + (d.gerd || '') + ' ' + (d.lysing || '')).toLowerCase();
    if (/skr[áa]ningartafl|byggingarl[ýy]sing/.test(txt) && !SER_YFIRLIT.test(txt)) return null;
    if (SER_BRUNA.test(txt)) return 'bruna';
    if (/aðalupp|bygginga?nefnd/i.test(tg)) return SER_YFIRLIT.test(txt) ? 'yfirlit' : null;   // grunnmyndir/snið/útlit eru ofar
    if (/rafl/i.test(tg)) return 'raf';
    if (/lagn/i.test(tg)) return SER_LOFT.test(txt) ? 'loft' : 'lagnir';
    if (/bur[ðd]/i.test(tg)) return 'burdur';
    if (SER_YFIRLIT.test(txt) || /m[æa]li|h[æa][ðd]a/i.test(tg)) return 'yfirlit';
    if (SER_LOFT.test(txt)) return 'loft';
    if (/rafl|l[áa]gspenn|sm[áa]spenn/.test(txt)) return 'raf';
    if (/lagn|fr[áa]renns|fr[áa]veit|vatnsl|hital/.test(txt)) return 'lagnir';
    if (/bur[ðd]|j[áa]rna|undirst/.test(txt)) return 'burdur';
    return 'annad';
  }
  // Öll sérblöð hússins, flokkuð og röðuð: { flokkar: Map(k → [x]), alls }
  function serListi(t) {
    const fl = new Map(SER_FLOKKAR.map(([k]) => [k, []]));
    if (!t) return { flokkar: fl, alls: 0 };
    const bnDags = new Map();
    (t.dr || []).forEach((d) => { if (d && d.bnnr && dagsGild(d.dags) && !bnDags.has(String(d.bnnr))) bnDags.set(String(d.bnnr), d.dags); });
    (t.dr || []).forEach((d) => {
      if (!d || !d.infoUrl || d.urelt) return;
      const k = serFlokkur(d); if (!k) return;
      const txt = blodTexti(d);
      fl.get(k).push({ d: Object.assign({}, d, { dags: dagsGild(d.dags) }), k, titill: hreinsaTitil(txt) || SER_HEITI[k], tafla: k === 'raf' && SER_TOFLU.test(txt.toLowerCase()) });
    });
    (t.ser || []).forEach((b) => {
      const k = b.flokkur === 'ser' ? 'annad' : b.flokkur;
      if (!fl.has(k)) return;
      const d = { infoUrl: b.infoUrl, thumb: b.thumb, stor: b.stor, tegund: b.tegund, lysing: '', dags: bnDags.get(String(b.bnnr || '')) || '', bnnr: b.bnnr, ser5004: true };
      fl.get(k).push({ d, k, titill: SER_HEITI[k] + (b.bnnr ? ' ' + b.bnnr : '') + (b.blad ? ' · blað ' + b.blad : ''), bn: String(b.bnnr || ''), blad: b.blad || 0, hofundur: b.hofundur });
    });
    const bnTala = (s) => +(String(s || '').match(/\d+/) || [0])[0];
    fl.forEach((a, k) => a.sort((x, y) => ((k === 'raf' ? (+!!y.tafla) - (+!!x.tafla) : 0)) || String(y.d.dags || '').localeCompare(String(x.d.dags || '')) || (bnTala(y.bn) - bnTala(x.bn)) || ((x.blad || 0) - (y.blad || 0))));
    let alls = 0; fl.forEach((a) => { alls += a.length; });
    return { flokkar: fl, alls };
  }
  // Agnar 09.10.2026 (Nesdekk, Dalshraun 10): „kannski velja 5 „Aðrar teikningar" — sýna húsnæðið í heild, einhver teikning
  // þarna og eitthvað — og geta síðan expandað til að sjá allt á þessu blaði". Valið, raðað eftir gagnsemi fyrir
  // slökkvitækjaþjónustu: brunatengt (ef til) · heildarmynd hússins · raflagnir með töflum · nýjasta útlit · snið ·
  // (annars lagnir/vatnsúði). „Sjá allar (N)" opnar heildaryfirlitið flokkað eins og blaðið hans (haus + fjöldi).
  const undirAf = (x) => [x.d.dags ? dags(x.d.dags) : (x.bn ? 'BN ' + x.bn.replace(/^BN/i, '') : 'án dags.'), x.d.ser5004 ? (x.hofundur || '') : x.titill].filter(Boolean).join(' · ');
  function adalBlodListi(t) {
    return (t.dr || []).filter((d) => d && d.infoUrl && !d.urelt && /aðalupp|bygginga?nefnd/i.test(String(d.tegund || '')))
      .map((d) => { const txt = blodTexti(d); return { d: Object.assign({}, d, { dags: dagsGild(d.dags) }), txt, titill: hreinsaTitil(txt) || 'Aðaluppdráttur' }; })
      .sort((a, b) => String(b.d.dags || '').localeCompare(String(a.d.dags || '')));
  }
  function veljaAdrar(g, t, fl, sl) {
    const notad = new Set(), val = [];
    const baeta = (x, hlutverk) => { if (!x || !x.d || !x.d.infoUrl || notad.has(x.d.infoUrl) || x.d.skemmt) return false; notad.add(x.d.infoUrl); val.push({ x, hlutverk }); return true; };
    const adal = adalBlodListi(t);
    const bruna = sl.flokkar.get('bruna');
    const heild = adal.find((x) => /afst[öo][ðd]u|afsta[ðd]a|grunnmyndir|allt h[úu]s|heildar|yfirlit/i.test(x.txt))
      || (fl.haedir.slice().sort((a, b) => b.keys.length - a.keys.length)[0] || {}).x || sl.flokkar.get('yfirlit')[0];
    const raf = sl.flokkar.get('raf')[0];
    const utlit = fl.utlit.nyjar[0] || fl.utlit.eldri[0] || adal.find((x) => /[úu]tlit/i.test(x.txt));
    const snid = fl.snid.nyjar[0] || fl.snid.eldri[0] || adal.find((x) => /sni[ðd]/i.test(x.txt) && !(heild && x.d.infoUrl === heild.d.infoUrl));
    const lagnir = sl.flokkar.get('lagnir');
    const udi = lagnir.find((x) => /[úu][ðd]akerf|sprinkl|vatns[úu][ðd]/i.test(blodTexti(x.d))) || lagnir[0];
    if (bruna.length) baeta(bruna[0], 'Brunavarnir');
    baeta(heild, 'Húsið í heild');
    if (raf) baeta(raf, raf.tafla ? 'Raflagnir — töflur' : 'Raflagnir');
    baeta(utlit, 'Útlit');
    baeta(snid, 'Snið');
    if (!bruna.length) baeta(udi, /[úu][ðd]akerf|sprinkl/i.test(udi ? blodTexti(udi.d) : '') ? 'Vatnsúðakerfi' : 'Lagnir');
    // færri en 5 → fyllt úr öðrum flokkum í gagnsemisröð
    ['yfirlit', 'loft', 'lagnir', 'burdur', 'annad'].forEach((k) => { if (val.length < 5) (sl.flokkar.get(k) || []).some((x) => val.length < 5 && baeta(x, SER_HEITI[k])); });
    return val.slice(0, 5);
  }
  function adrarHtml(g, t, fl, sl) {
    const val = veljaAdrar(g, t, fl, sl);
    if (!val.length) return '';
    return '<div class="ssp-skilti">Aðrar teikningar — valdar</div><div class="gr-fsk-grind gr-adrar">' +
      val.map(({ x, hlutverk }) => fskFlis(x, hlutverk, false, { hopur: 'adrar', undir: [x.titill && x.titill !== hlutverk ? x.titill : '', x.d.dags ? dags(x.d.dags) : (x.bn ? 'BN ' + x.bn : '')].filter(Boolean).join(' · ') || 'án dags.' })).join('') + '</div>';
  }
  function allarHtml(g, t, fl, sl) {
    const notad = new Set();
    const ein = (a) => (a || []).filter((x) => x && x.d && x.d.infoUrl && !notad.has(x.d.infoUrl) && notad.add(x.d.infoUrl));
    const grunnar = [].concat(fl.haedir.map((h) => Object.assign({}, h.x, { titill: haedaHeiti(h.keys, h.x.ris) + ' · ' + h.x.titill })), fl.onefnd, fl.eldri, fl.passarEkki);
    const hopar = [
      ['bruna', 'Brunavarnir', sl.flokkar.get('bruna')],
      ['yfirlit', 'Yfirlit og afstöðumyndir', sl.flokkar.get('yfirlit')],
      ['grunn', 'Grunnmyndir (aðaluppdrættir)', grunnar],
      ['raf', 'Raflagnir', sl.flokkar.get('raf')],
      ['lagnir', 'Lagnir — pípur, vatn, hiti, úðakerfi', sl.flokkar.get('lagnir')],
      ['loft', 'Loftræsting', sl.flokkar.get('loft')],
      ['utlit', 'Útlit', fl.utlit.nyjar.concat(fl.utlit.eldri)],
      ['snid', 'Snið', fl.snid.nyjar.concat(fl.snid.eldri)],
      ['skjol', 'Skráningartafla og byggingarlýsing', fl.skraning.nyjar.concat(fl.skraning.eldri, fl.lysing.nyjar, fl.lysing.eldri)],
      ['burdur', 'Burðarvirki', sl.flokkar.get('burdur')],
      ['annad', 'Annað', sl.flokkar.get('annad')],
    ].map(([k, nafn, a]) => [k, nafn, ein(a)]).filter((h) => h[2].length);
    const N = hopar.reduce((s, h) => s + h[2].length, 0);
    if (!N) return '';
    const skemmd = hopar.reduce((s, h) => s + h[2].filter((x) => x.d.skemmt).length, 0);
    const yfirlit = hopar.map(([, nafn, a]) => esc(nafn.split(' — ')[0]) + ' ' + a.length).join(' · ');
    return '<details class="gr-allar" data-gr-allar><summary><span class="gr-allar-takki">Sjá allar (' + N + ')</span><span class="gr-allar-yfir">' + yfirlit + (skemmd ? ' · <b>' + skemmd + ' skemmd</b>' : '') + '</span></summary>' +
      hopar.map(([k, nafn, a]) => '<div class="gr-allar-hopur" data-hopur="' + k + '"><div class="gr-allar-haus">' + esc(nafn) + ' <b>' + a.length + '</b>' +
        (k === 'raf' && a.some((x) => x.tafla) ? ' <span>töflur fremst</span>' : '') + '</div><div class="gr-fsk-grind">' +
        a.map((x) => fskFlis(x, x.titill || SER_HEITI[k] || nafn, false, { hopur: 'allar-' + k, undir: undirAf(x) })).join('') + '</div></div>').join('') +
      '<div class="gr-uppruni">' + ((t.ser || []).length ? 'Séruppdrættir: Skjalasafn Reykjavíkur, safn 5004 — safnið skráir hvorki lýsingu né dagsetningu, byggingarnefndarnúmer í staðinn' + (t.serCache ? ' (úr skyndiminni)' : '') + ' · ' : '') +
      (skemmd ? skemmd + (skemmd === 1 ? ' blað er skemmt' : ' blöð eru skemmd') + ' hjá sveitarfélaginu (PDF undir 5 kB) — sýnd en ekki opnanleg · ' : '') +
      'flokkað eftir tegund og lýsingu blaðs, nýjast fremst<span class="gr-sjalf">sjálfsótt</span></div></details>';
  }

  /* 5f · TÁKN KERFA (sömu tákn og Teikning/TurboPaint — 434 TeiknTakn) með lit eftir stöðu */
  const KERFI_GLYFF = { slokkvitaeki: 'extinguisher', slongukefli: 'hose', reykskynjarar: 'detector', brunavidvorunarkerfi: 'alarm', vatnsudakerfi: 'hydrant', neydarlysing: 'exit', utljos: 'exit', slokkvikerfi_eldhus: 'extinguisher', rymingaruppdrattur: 'exit' };
  const EFNI_GLYFF = { handslokkvitaeki: 'extinguisher', brunaslongur: 'hose', brunavidvorunarkerfi: 'alarm', neydarlysing: 'exit', flottaleidir: 'exit', vatnsudakerfi: 'hydrant' };
  const STADA_LITUR = { til: '#15803d', vantar: '#b42318', ovitad: '#b7791f', skilyrt: '#6b7483', nei: '#6b7483' };
  const STADA_TXT = { til: 'Til staðar', vantar: 'Vantar', ovitad: 'Óvitað', skilyrt: 'Skilyrt', nei: 'Aðeins neitun' };
  const TAKN_MYND = new Map();
  function taknMynd(glyff, bg) {
    if (!glyff) return null;
    const k = glyff + bg;
    if (TAKN_MYND.has(k)) return TAKN_MYND.get(k);
    let u = null;
    try {
      if (window.TeiknTakn && TeiknTakn.teiknaTakn) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        TeiknTakn.teiknaTakn(c.getContext('2d'), glyff, { bg, fg: '#fff' }, 32, 32, 54);
        u = c.toDataURL('image/png');
      }
    } catch (_) { u = null; }
    TAKN_MYND.set(k, u);
    return u;
  }
  function taknHtml(glyff, stada, stutt, staerd) {
    const u = taknMynd(glyff, STADA_LITUR[stada] || STADA_LITUR.ovitad);
    const s = staerd || 28;
    return u ? '<img class="gr-takn" alt="" width="' + s + '" height="' + s + '" src="' + u + '">'
      : '<b class="gr-takn gr-takn-txt" style="width:' + s + 'px;height:' + s + 'px;background:' + (STADA_LITUR[stada] || STADA_LITUR.ovitad) + '">' + esc(String(stutt || '?').slice(0, 5)) + '</b>';
  }
  // Staða hvers skylds/skilyrts kerfis: kerfaskrá viðskiptavinar → byggingarlýsing → óvitað
  function kerfiStodur(g) {
    const F = window.Flokkun;
    if (!F || !F.KERFI || !g.krofur || !g.krofur.kr || !g.tegund) return null;
    const tt = g.krofur.kr.tegundir.get(g.tegund.tegund); if (!tt) return null;
    const efni = (g.bygg && g.bygg.brunavarnir && g.bygg.brunavarnir.efni) || {};
    const vk = new Map();
    ((g.hja && g.hja.listi) || []).forEach((r) => (r.kerfi || []).forEach((k) => { if (!vk.has(k.kerfi)) vk.set(k.kerfi, k); }));
    return F.KERFI.map((x) => ({ x, r: tt.kerfi.get(x.k) })).filter((y) => y.r && (y.r.skylt === 'ja' || y.r.skylt === 'skilyrt')).map(({ x, r }) => {
      const v = vk.get(x.k), e = efni[EFNI_KERFI[x.k]];
      const nefnt = !!(e && (e.daemi || []).some((d) => !d.neitun));
      let stada = r.skylt === 'skilyrt' ? 'skilyrt' : 'ovitad', hvadan = r.skylt === 'skilyrt' ? 'fer eftir skilyrðum' : 'ekki vitað';
      if (v && (v.taekifaeri === 'd' || v.taekifaeri === 'b' || v.til_stadar === 'ja')) { stada = 'til'; hvadan = v.taekifaeri === 'd' ? 'okkar' : v.thjonustuadili ? 'hjá ' + v.thjonustuadili : 'kerfaskrá'; }
      else if (v && (v.taekifaeri === 'a' || v.til_stadar === 'nei')) { stada = 'vantar'; hvadan = 'kerfaskrá'; }
      else if (nefnt) { stada = 'til'; hvadan = 'byggingarlýsing'; }
      return { k: x.k, heiti: x.heiti, stutt: x.stutt, skylt: r.skylt, stada, hvadan, glyff: KERFI_GLYFF[x.k] || null };
    });
  }
  function kerfaRodHtml(g, tomt) {
    const ks = kerfiStodur(g);
    if (!ks) return '<div class="gr-kerfi"><span class="gr-kerfi-tomt">' + esc(tomt || 'Kröfur birtast þegar tegund er þekkt…') + '</span></div>';
    if (!ks.length) return '<div class="gr-kerfi"><span class="gr-kerfi-tomt">Engin skyld kerfi fyrir tegundina.</span></div>';
    const n = { til: 0, vantar: 0, ovitad: 0 };
    ks.forEach((x) => { if (n[x.stada] != null) n[x.stada]++; });
    return '<div class="gr-kerfi" role="list" aria-label="Staða kerfa">' + ks.map((x) => '<span class="gr-kt st-' + x.stada + '" role="listitem" title="' + esc(x.heiti + ' — ' + (x.skylt === 'ja' ? 'skylt' : 'skilyrt') + ' · ' + STADA_TXT[x.stada] + ' (' + x.hvadan + ')') + '">' +
      taknHtml(x.glyff, x.stada, x.stutt) + '<small>' + esc(x.stutt) + '</small><i>' + esc(STADA_TXT[x.stada]) + '</i></span>').join('') + '</div>' +
      '<div class="gr-kerfi-tal"><i class="gr-led g"></i>' + n.til + ' til staðar · <i class="gr-led r"></i>' + n.vantar + ' vantar · <i class="gr-led y"></i>' + n.ovitad + ' óvitað</div>';
  }

  /* 5h · BRUNAVARNIR Á TEIKNINGU (Agnar 09.10.2026) — stór hæðarmynd með yfirlagi:
   *   útgangar   „ÚT" úr textalagi teikningarinnar + útidyr greindar úr veggjalínum Teikningar (383 rist) + ÚT-merki
   *              úr Teikningu/TurboPaint — grænt, útgangstákn í anda ISO 7010 E001/E002
   *   rými       sem byggingarlýsingin nefnir (stigahús, tækni-/inntaksrými, stjórnrými vatnsúðakerfis, dekkjalager,
   *              skrifstofur, svalir …) staðsett með rýmisheitum textalagsins (383 raunUrSidu; 446 flokkur fyrir stigahús)
   *              — smellur á tilvitnun lýsir þau upp (flötur úr veggjalínum þegar hæðin er í Teikningu)
   *   tákn       skammstafanir teikningarinnar eftir HENNAR EIGIN skýringum („HSL = Handslökkvitæki") — aldrei
   *              giskað á merkingu; neyðarlýsing og reyklúgur við rýmin sem setning lýsingarinnar nefnir (merkt „úr lýsingu")
   *   talning    „Þrjár flóttaleiðir eru frá dekkjalager, þar af tvær beint út" borið saman við dyr rýmisins á
   *              teikningunni — sjálfvirkt og merkt óvíst þar sem rýmismörk lokast ekki
   * Viðskiptavinur með hæðir í Teikningu: hæðir hans (skornar eins og í Teikningu, 383 frum/skurður). Annars nýjasta
   * grunnmynd hverrar hæðar úr skjalasafninu. Skönnuð teikning (ekkert textalag): aðeins það sem fannst + tilvitnanir. */
  const BAT = new Map();   // lykill hæðar → greining (lotan)
  // [lykill, heiti, í setningu lýsingar, á teikningu]
  const BAT_RYMI = [
    ['stigahus', 'Stigahús', /stigah[úu]s/, /stigah|stigag|(^|\s)stigi(\s|$)/],
    ['udi', 'Stjórnrými vatnsúðakerfis', /stj[óo]rnr[ýy]m/, /vatns[úu][ðd]|[úu][ðd]akerf|sprinkl/],
    ['taekni', 'Tækni- og inntaksrými', /t[æa]kni-|t[æa]knir[ýy]m|inntaksr[ýy]m/, /t[æa]knir|t[æa]kniher|inntak|lagnar[ýy]m|rafmagnst|t[öo]fluher/],
    ['dekkjalager', 'Dekkjalager', /dekkjalag|dekkjageyms/, /dekkjalag|dekkjageyms/],
    ['dekkjaverkst', 'Dekkjaverkstæði', /dekkjaverkst/, /dekkjaverkst/],
    ['skrifstofa', 'Skrifstofur', /skrifstof/, /skrifst/],
    ['svalir', 'Svalir', /sval(ir|a|anna)\b|sv[öo]lum/, /sval|sv[öo]l/],
    ['lyfta', 'Lyfta', /lyft(a|u|ur|unni)\b/, /(^|\s)lyfta/],
    ['anddyri', 'Anddyri', /anddyr/, /anddyr/],
    ['kaffistofa', 'Kaffistofa', /kaffistof|matsal|m[öo]tuneyt/, /kaffist|matsal|m[öo]tuneyt/],
  ];
  const BAT_RYMI_HEITI = Object.fromEntries(BAT_RYMI.map((r) => [r[0], r[1]]));
  // búnaður sem setning lýsingarinnar staðsetur í rýmum („Neyðarlýsing … í stigahúsum", „reyklúgu í þaki")
  const BAT_BUN = [['neyd', 'Neyðarlýsing', /ney[ðd]arl[ýy]s|ney[ðd]arlj[óo]s/], ['reykluga', 'Reyklúga', /reykl[úu]g/]];
  // merking skammstöfunar (úr skýringum blaðsins) → tákn
  const BAT_SKYR = [
    [/merkt(ur)? [úu]tgang|[úu]tgangur|ney[ðd]ar[úu]tg/, 'utg'], [/sl[öo]kkvit[æa]k/, 'extinguisher'], [/brunasl[öo]ng|sl[öo]ngukef/, 'hose'],
    [/reykskynj/, 'detector'], [/handbo[ðd]|brunabo[ðd]|stj[óo]rnst[öo][ðd] brunavi/, 'alarm'], [/ney[ðd]arlj[óo]s|ney[ðd]arl[ýy]s/, 'neyd'],
    [/bj[öo]rgunarop/, 'bjorgun'], [/reykl[úu]g|reykr[æa]s/, 'reykluga'],
  ];
  // merki úr Teikningu / TurboPaint (sign / symbolId „teikn:<x>") → tákn 434 + heiti
  const BAT_TEG = { taeki: ['pin', 'Okkar tæki (Teikning)'], hose: ['hose', 'Brunaslanga'], slanga: ['hose', 'Brunaslanga'], bjalla: ['alarm', 'Bjalla / brunaviðvörun'], skilti_slt: ['sign-extinguisher', 'Skilti slökkvitækis'],
    skilti_slanga: ['sign-hose', 'Skilti brunaslöngu'], lettvatn: ['extinguisher', 'Léttvatnstæki'], duft: ['extinguisher', 'Dufttæki'], co2: ['extinguisher', 'CO₂-tæki'], rafmagn: ['electric', 'Rafmagn'],
    reykskynjari: ['detector', 'Reykskynjari'], hitaskynjari: ['detector', 'Hitaskynjari'], segull: ['magnet', 'Segull'] };
  const batTeg = (t) => BAT_TEG[t] || ['pin', String(t || 'Merki').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())];
  const ER_UT = (t) => t === 'ut' || t === 'neydarutgangur';
  const TOLUORD = { ein: 1, eina: 1, einn: 1, 'tvær': 2, tveir: 2, 'þrjár': 3, 'þrír': 3, 'fjórar': 4, 'fjórir': 4, fimm: 5, sex: 6 };
  const tolu = (w) => (/^\d+$/.test(w) ? +w : TOLUORD[String(w || '').toLowerCase()] || null);
  function batLykill(texti, setning) {
    const t = String(texti || '').toLowerCase();
    const r = BAT_RYMI.find((x) => (setning ? x[2] : x[3]).test(t));
    if (r) return r[0];
    if (!setning) { try { const f = window.TeiknSameign && TeiknSameign.flokkur(texti); if (f && (f.teg === 'stigahus' || f.teg === 'taekni')) return f.teg; } catch (_) {} }
    return '';
  }
  // „Þrjár flóttaleiðir eru frá dekkjalager, þar af tvær beint út." → { n: 3, beint: 2, fra: 'dekkjalager', key }
  function batTalning(s) {
    const m = /(\d+|ein|eina|tvær|þrjár|fjórar|fimm|sex)\s+(?:óháðar\s+|sjálfstæðar\s+)?flóttalei[ðd]ir?\s+(?:er|eru)\s+(?:frá|úr)\s+([^,.;]+?)\s*(?=[,.;]|$)/i.exec(String(s || ''));
    if (!m) return null;
    const n = tolu(m[1]); if (!n) return null;
    const b = /þar af\s+(\d+|ein|tvær|þrjár|fjórar)\s+beint\s+út/i.exec(s);
    return { n, beint: b ? tolu(b[1]) : null, fra: m[2].trim(), key: batLykill(m[2], true) };
  }
  // Setningar lýsingarinnar sem nefna rými eða telja flóttaleiðir (hver einu sinni)
  const _batTilv = new WeakMap();
  function batTilvitnanir(bv) {
    if (!bv || typeof bv !== 'object') return [];
    if (_batTilv.has(bv)) return _batTilv.get(bv);
    const efni = bv.efni || {}, sed = new Map();
    Object.keys(efni).forEach((k) => ((efni[k] && efni[k].daemi) || []).forEach((d) => { const s = String((d && d.setning) || '').replace(/\s+/g, ' ').trim(); if (s && !sed.has(s)) sed.set(s, !!d.neitun); }));
    const ut = [];
    sed.forEach((neitun, s) => {
      const t = s.toLowerCase();
      const rymi = BAT_RYMI.filter((r) => r[2].test(t)).map((r) => r[0]);
      const tal = batTalning(s);
      if (!rymi.length && !tal) return;
      const bunR = {};
      BAT_BUN.forEach(([b, , re]) => {
        const m = re.exec(t); if (!m) return;
        // reyklúga: „Reykræsing frá X … um reyklúgur í þaki og opnast með hnappi frá stjórnrými" — X, ekki stjórnrýmið
        const k = BAT_RYMI.filter((r) => { const q = r[2].exec(t); return q && (b !== 'reykluga' || q.index < m.index); }).map((r) => r[0]);
        if (k.length) bunR[b] = k;
      });
      ut.push({ i: ut.length, texti: s, neitun, rymi, tal, bunR });
    });
    _batTilv.set(bv, ut);
    return ut;
  }
  // TurboPaint-tákn hæðarinnar: myndin ber uttekt.haedId; tákn eru börn hennar (miðja = x + size/2) → hlutföll síðu
  function tpHaedir(obj) {
    return obj.filter((o) => o && o.type === 'image' && o.uttekt && o.uttekt.haedId && !o.rotation && +o.width > 0 && +o.height > 0).map((im) => ({
      haedId: String(im.uttekt.haedId),
      takn: obj.filter((o) => o && o.type === 'symbol' && !o.hidden && o.parentId === im.id).map((o) => {
        const s = +o.size || 24;
        return { u: (+o.x + s / 2 - +im.x) / +im.width, v: (+o.y + s / 2 - +im.y) / +im.height, teg: String(o.uttektSign || String(o.symbolId || '').replace(/^teikn:/, '')), unitId: o.uttektUnitId ? String(o.uttektUnitId) : '' };
      }).filter((x) => isFinite(x.u) && isFinite(x.v) && x.u >= 0 && x.u <= 1 && x.v >= 0 && x.v <= 1),
    }));
  }
  function batHaedir(g) {
    const t = (g && g.teikn) || {}, ut = [];
    (t.bord || []).forEach((b) => (b.bord.haedir || []).map((h, i) => ({ h, i })).sort((a, z) => (HL.rod(HL.lykill(a.h.nafn)) - HL.rod(HL.lykill(z.h.nafn))) || (a.i - z.i)).forEach(({ h, i }) => {
      const url = h.image_url || '';
      if (!url || /^data:/.test(url)) return;
      const innri = (() => { try { return new URL(url, location.href).searchParams.get('url') || url; } catch (_) { return url; } })();
      const pdf = /\.pdf(\.info)?(\?|#|$)/i.test(innri) ? innri : null;
      const fr = h.frum && h.frum.b > 0 && h.frum.h > 0 ? h.frum : null;
      const sk = fr && h.skurdur && h.skurdur.w > 0 && h.skurdur.h > 0 ? h.skurdur : (fr ? { x: 0, y: 0, w: fr.b, h: fr.h } : null);
      const tp = [];
      (t.tp || []).filter((x) => x.co && +x.co.id === +b.co.id).forEach((x) => (x.haedir || []).forEach((hh) => { if (hh.haedId === String(h.id)) tp.push.apply(tp, hh.takn); }));
      ut.push({ lykill: 'b' + b.co.id + ':' + (h.id || i), heiti: h.nafn || ('Hæð ' + (i + 1)), undir: b.co.nafn + ' · Teikning', kind: 'bord', h, pdf, mynd: pdf ? null : url, fr, sk, tp });
    }));
    if (!ut.length && t.dr) {
      flokkaBlod(t.dr, g.bygg).haedir.forEach(({ x, keys }) => {
        const d = x.d; if (!d || d.skemmt) return;
        const pdf = /\.pdf(\.info)?$/i.test(String(d.infoUrl || '')) ? d.infoUrl : null;
        ut.push({ lykill: 's' + d.infoUrl, heiti: haedaHeiti(keys, x.ris), undir: (dags(d.dags) || 'án dags.') + ' · skjalasafn', kind: 'safn', d, pdf, mynd: pdf ? null : (d.stor || myndSlod(d.infoUrl)) });
      });
    }
    return ut.slice(0, 10);
  }
  // Textabútar síðunnar: miðja (x, y), upphaf grunnlínu (ox, oy), lesstefna (dx, dy) og leturhæð — í punktum síðunnar
  function batOrd(tc, vp) {
    const vt = vp.transform, ap = (x, y) => [vt[0] * x + vt[2] * y + vt[4], vt[1] * x + vt[3] * y + vt[5]];
    const ut = [];
    ((tc && tc.items) || []).forEach((it) => {
      const t = String(it.str || '').replace(/\s+/g, ' ').trim(); if (!t) return;
      const m = it.transform || [1, 0, 0, 1, 0, 0], dl = Math.hypot(m[0], m[1]) || 1, fs = Math.hypot(m[2], m[3]) || 1, w = +it.width || 0;
      const p = ap(m[4] + m[0] / dl * w / 2 + m[2] * 0.32, m[5] + m[1] / dl * w / 2 + m[3] * 0.32);
      const o = ap(m[4], m[5]), d = ap(m[4] + m[0] / dl, m[5] + m[1] / dl);
      const dx = d[0] - o[0], dy = d[1] - o[1], dn = Math.hypot(dx, dy) || 1;
      ut.push({ t, x: p[0], y: p[1], ox: o[0], oy: o[1], dx: dx / dn, dy: dy / dn, fs });
    });
    return ut;
  }
  const SKST = /^[A-ZÁÐÉÍÓÚÝÞÆÖ]{1,4}\d?$/;
  function batTexti(ut, tc, vp, ord, pts) {
    const B = vp.width, H = vp.height;
    // skýringar blaðsins: „HSL" og „= Handslökkvitæki" á sömu línu (lesstefna skiptir máli — Fiskislóð er öll 90°)
    const legI = new Set();
    ord.forEach((e) => {
      if (!/^=\s*\S/.test(e.t)) return;
      let b = -1, bd = Infinity;
      ord.forEach((a, i) => {
        if (!SKST.test(a.t)) return;
        const ox = e.ox - a.ox, oy = e.oy - a.oy, lang = ox * a.dx + oy * a.dy, thv = Math.abs(ox * a.dy - oy * a.dx);
        if (lang > 0 && lang < a.fs * 8 && thv < a.fs * 0.7 && lang < bd) { bd = lang; b = i; }
      });
      if (b >= 0) { legI.add(b); if (!ut.skyr[ord[b].t]) ut.skyr[ord[b].t] = e.t.replace(/^=\s*/, '').trim(); }
    });
    ord.forEach((o, i) => {
      if (legI.has(i)) return;
      const u = o.x / B, v = o.y / H;
      if (/^[ÚU]T$/.test(o.t)) { ut.ut.push({ u, v, upp: 'teikning', heiti: 'ÚT' + (ut.skyr[o.t] ? ' = ' + ut.skyr[o.t] : '') }); pts.push([u, v]); return; }
      if (!SKST.test(o.t)) return;
      const mean = ut.skyr[o.t]; if (!mean) return;
      const gl = BAT_SKYR.find((x) => x[0].test(mean.toLowerCase()));
      if (!gl) return;
      if (gl[1] === 'utg') { ut.ut.push({ u, v, upp: 'teikning', heiti: o.t + ' = ' + mean }); pts.push([u, v]); return; }
      ut.takn.push({ u, v, glyff: gl[1], heiti: mean, skst: o.t, upp: 'teikning' }); pts.push([u, v]);
    });
    let herb = [];
    try { herb = (window.Teikn3D && Teikn3D.raun && Teikn3D.raun.urSidu) ? (Teikn3D.raun.urSidu(tc, null, vp).herbergi || []) : []; } catch (e) { console.warn('[451] rými úr textalagi', e); }
    herb.forEach((h) => {
      if (/^=/.test(h.texti) || !isFinite(h.u) || !isFinite(h.v)) return;
      ut.herb.push({ texti: h.texti, nr: h.nr || '', key: batLykill(h.texti), u: h.u, v: h.v, utNaest: 0 });
      pts.push([h.u, h.v]);
    });
    // ÚT-merki næst hverju rými (nálgun þegar rýmismörk eru ekki lesin)
    if (ut.herb.length) ut.ut.forEach((x) => {
      let b = null, bd = Infinity;
      ut.herb.forEach((h) => { const d = Math.hypot((h.u - x.u) * B, (h.v - x.v) * H); if (d < bd) { bd = d; b = h; } });
      if (b) b.utNaest++;
    });
  }
  // sjálfvirkur skurður blaðs úr skjalasafni: utan um rými, ÚT og tákn (titilreitur og skýringar utan)
  function batSkurdur(pts) {
    if (pts.length < 4) return { x: 0, y: 0, w: 1, h: 1 };
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    pts.forEach(([u, v]) => { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); });
    const m = 0.045; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(1, x1 + m); y1 = Math.min(1, y1 + m);
    if (x1 - x0 < 0.25 || y1 - y0 < 0.25) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // Veggjalínur Teikningar (px frummyndar): útidyr + flötur og dyr hvers rýmis sem lýsingin getur nefnt
  function batRymi(ut, h, fr) {
    const vl = Array.isArray(h.veggjaLinur) ? h.veggjaLinur : [];
    const rist = window.Teikn3D && Teikn3D.raun && Teikn3D.raun.rist;
    if (vl.length < 8 || !rist) return;
    const V = [], Gl = [], Hu = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    vl.forEach((l) => {
      const p = l && l.p; if (!Array.isArray(p) || p.length < 4 || !p.slice(0, 4).every((n) => isFinite(+n))) return;
      const r = [+p[0], +p[1], +p[2], +p[3], Math.max(6, +l.t || 6)];
      (l.tegund === 'hurd' ? Hu : l.tegund === 'gler' ? Gl : V).push(r);
      x0 = Math.min(x0, r[0], r[2]); x1 = Math.max(x1, r[0], r[2]); y0 = Math.min(y0, r[1], r[3]); y1 = Math.max(y1, r[1], r[3]);
    });
    if (V.length < 4 || !Hu.length) return;
    const st = Math.max(x1 - x0, y1 - y0), VIK = Math.max(8, st * 0.006), BIL = st * 0.15, allar = V.concat(Gl, Hu);
    // göt í útvegg (gluggar sem greindust ekki sem gler) lokuð á útlínu-ramma hússins — annars lekur hvert rými út
    [['x', x0], ['x', x1], ['y', y0], ['y', y1]].forEach(([as, gildi]) => {
      const bil = allar.filter((r) => (as === 'x' ? Math.abs(r[0] - gildi) < VIK && Math.abs(r[2] - gildi) < VIK : Math.abs(r[1] - gildi) < VIK && Math.abs(r[3] - gildi) < VIK))
        .map((r) => (as === 'x' ? [Math.min(r[1], r[3]), Math.max(r[1], r[3])] : [Math.min(r[0], r[2]), Math.max(r[0], r[2])])).sort((a, b) => a[0] - b[0]);
      let e0 = -Infinity;
      bil.forEach((b, i) => { if (i && b[0] - e0 > 2 && b[0] - e0 < BIL) V.push(as === 'x' ? [gildi, e0, gildi, b[0], 6] : [e0, gildi, b[0], gildi, 6]); e0 = Math.max(e0, b[1]); });
    });
    const golf = { x: (x0 + x1) / 2, z: (y0 + y1) / 2, w: x1 - x0 + 120, h: y1 - y0 + 120 };
    const R = rist(V, Gl, Hu, golf, Math.max(4, Math.round(Math.max(golf.w, golf.h) / 520)));
    const rs = R.rs, lokad = new Map();
    // hlið dyra: innan lokaðs rýmis (gríma) eða úti (flóðfylling nær út á jaðar)
    const hlid = (x, y) => { const k = Math.round(x / rs) + ',' + Math.round(y / rs); if (!lokad.has(k)) lokad.set(k, R.herbergi(x, y, Infinity)); return lokad.get(k); };
    const breidd = Hu.map((d) => Math.hypot(d[2] - d[0], d[3] - d[1])).sort((a, b) => a - b), mid = breidd[Math.floor(breidd.length / 2)] || 1;
    const dyr = Hu.map((d) => {
      const mx = (d[0] + d[2]) / 2, my = (d[1] + d[3]) / 2, L = Math.hypot(d[2] - d[0], d[3] - d[1]) || 1, nx = -(d[3] - d[1]) / L, ny = (d[2] - d[0]) / L, f = d[4] / 2 + rs * 2.5;
      const a = [mx + nx * f, my + ny * f], b = [mx - nx * f, my - ny * f], ma = hlid(a[0], a[1]), mb = hlid(b[0], b[1]);
      return { mx, my, L, a, b, uti: !!ma !== !!mb, stor: L > mid * 1.8, ang: Math.atan2(d[3] - d[1], d[2] - d[0]) * 180 / Math.PI };
    });
    ut.veggir = true;
    ut.dyr = dyr.filter((d) => d.uti).map((d) => ({ u: d.mx / fr.b, v: d.my / fr.h, L: d.L / fr.b, ang: d.ang, stor: d.stor }));
    const hamark = golf.w * golf.h * 0.7, x0g = golf.x - golf.w / 2 - 1, z0g = golf.z - golf.h / 2 - 1;
    ut.herb.forEach((r) => {
      if (!r.key) return;
      const m = R.herbergi(r.u * fr.b, r.v * fr.h, hamark);
      if (!m) { r.lekur = true; return; }
      const min = dyr.filter((d) => R.inni(m, d.a[0], d.a[1]) || R.inni(m, d.b[0], d.b[1]));
      const gang = min.filter((d) => !d.stor), stor = min.filter((d) => d.stor);
      r.st = { dyr: gang.length, uti: gang.filter((d) => d.uti).length, stor: stor.length, storUti: stor.filter((d) => d.uti).length, utInni: ut.ut.filter((x) => R.inni(m, x.u * fr.b, x.v * fr.h)).length };
      try {
        const cv = document.createElement('canvas'); cv.width = R.nx; cv.height = R.nz;
        const cx = cv.getContext('2d'), id = cx.createImageData(R.nx, R.nz), px = id.data;
        for (let i = 0; i < m.length; i++) if (m[i]) { const j = i * 4; px[j] = 232; px[j + 1] = 106; px[j + 2] = 18; px[j + 3] = 118; }
        cx.putImageData(id, 0, 0);
        r.maska = { src: cv.toDataURL('image/png'), u: x0g / fr.b, v: z0g / fr.h, uw: R.nx * rs / fr.b, vh: R.nz * rs / fr.h };
      } catch (_) {}
    });
  }
  async function batGreina(src) {
    const ut = { stada: 'komid', texti: false, mynd: null, still: null, ar: 0, c: null, herb: [], ut: [], takn: [], dyr: [], merki: [], skyr: {}, veggir: false, skannad: false, kind: src.kind };
    const fr = src.fr, sk = src.sk;
    let c = fr && sk ? { x: sk.x / fr.b, y: sk.y / fr.h, w: sk.w / fr.b, h: sk.h / fr.h } : null;
    const pts = [];
    // merki úr Teikningu (px frummyndar) og TurboPaint (hlutföll síðu) — TurboPaint-tákn sem bera sama unitId og
    // Teikningar-merki eru sama merkið (samstillt) og teljast einu sinni
    const merki = [];
    if (fr && src.h && Array.isArray(src.h.markers)) src.h.markers.forEach((m) => {
      if (!m || !isFinite(m.x) || !isFinite(m.y)) return;
      const sign = m.kind === 'sign' || String(m.unitId || '').indexOf('s:') === 0;
      merki.push({ u: m.x / fr.b, v: m.y / fr.h, teg: sign ? String(m.sign || String(m.unitId).split(':')[1] || '') : 'taeki', unitId: String(m.unitId || ''), upp: 'Teikning' });
    });
    const ids = new Set(merki.map((m) => m.unitId).filter(Boolean));
    (src.tp || []).forEach((t) => { if (t.unitId && ids.has(t.unitId)) return; merki.push({ u: t.u, v: t.v, teg: t.teg, unitId: t.unitId, upp: 'TurboPaint' }); });
    if (src.pdf) {
      await pdfjsHlada();
      const r = await fetch(PDFF + '?url=' + encodeURIComponent(src.pdf), { signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error('PDF fékkst ekki (' + r.status + ')');
      const baeti = new Uint8Array(await r.arrayBuffer());
      if (baeti.length < 5000) throw new Error('skjalið er skemmt hjá sveitarfélaginu (' + baeti.length + ' bæti)');
      const doc = await window.pdfjsLib.getDocument({ data: baeti }).promise;
      try {
        const s = await doc.getPage(1), vp = s.getViewport({ scale: 1 });
        const tc = await s.getTextContent();
        const ord = batOrd(tc, vp);
        ut.texti = ord.filter((o) => /[A-Za-zÀ-ſ]{2,}/.test(o.t)).length >= 12;
        if (ut.texti) batTexti(ut, tc, vp, ord, pts);
        if (ut.texti && fr && src.h) { try { batRymi(ut, src.h, fr); } catch (e) { console.warn('[451] veggjalínur', e); } }
        if (!c) c = batSkurdur(pts);
        const B = vp.width, H = vp.height, W = (window.innerWidth || 1200) < 700 ? 1100 : 1700;
        const sc = W / Math.max(1, c.w * B);
        const rv = s.getViewport({ scale: sc, offsetX: -c.x * B * sc, offsetY: -c.y * H * sc });
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(c.w * B * sc)); cv.height = Math.max(1, Math.round(c.h * H * sc));
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        await s.render({ canvasContext: cx, viewport: rv }).promise;
        const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
        if (!blob) throw new Error('mynd varð ekki til');
        ut.mynd = URL.createObjectURL(blob); ut.ar = cv.width / cv.height;
      } finally { try { doc.destroy(); } catch (_) {} }
    } else if (src.mynd) {
      ut.mynd = src.mynd;
      if (c && fr) { ut.still = { w: 1 / c.w, h: 1 / c.h, x: -c.x / c.w, y: -c.y / c.h }; ut.ar = (c.w * fr.b) / (c.h * fr.h); }
    }
    ut.skannad = !ut.texti;
    if (!c) c = { x: 0, y: 0, w: 1, h: 1 };
    ut.c = c;
    const P = (u, v) => ({ x: (u - c.x) / c.w, y: (v - c.y) / c.h });
    const kort = (a) => a.map((o) => Object.assign({}, o, P(o.u, o.v))).filter((o) => o.x >= -0.005 && o.x <= 1.005 && o.y >= -0.005 && o.y <= 1.005);
    ut.herb = kort(ut.herb).map((h) => { if (h.maska) { const k = h.maska; h.maska = { src: k.src, x: (k.u - c.x) / c.w, y: (k.v - c.y) / c.h, w: k.uw / c.w, h: k.vh / c.h }; } return h; });
    ut.ut = kort(ut.ut); ut.takn = kort(ut.takn);
    ut.dyr = kort(ut.dyr).map((d) => Object.assign(d, { l: d.L / c.w }));
    ut.merki = ut.ar ? kort(merki) : [];
    // ÚT-merki úr Teikningu/TurboPaint teljast með útgöngum
    ut.merki.filter((m) => ER_UT(m.teg)).forEach((m) => ut.ut.push({ x: m.x, y: m.y, upp: m.upp, heiti: 'Útgangur — merki í ' + m.upp }));
    ut.merki = ut.merki.filter((m) => !ER_UT(m.teg));
    ut.pdfHam = !!src.pdf;
    return ut;
  }
  function batByrja(lyk) {
    if (!lyk || BAT.has(lyk) || !S.g) return;
    const g = S.g, src = batHaedir(g).find((h) => h.lykill === lyk);
    if (!src) return;
    BAT.set(lyk, { stada: 'saeki' });
    batGreina(src).then((r) => { BAT.set(lyk, r); }, (e) => { BAT.set(lyk, { stada: 'villa', villa: (e && e.message) || String(e) }); console.warn('[451] brunavarnir á teikningu', e); })
      .then(() => { if (S.g === g) teikna('bruna'); });
  }
  let _batIo = null;
  function batFesta(rot) {
    const el = rot && rot.querySelector('[data-gr-bat-svid][data-bat-bid]');
    if (!el) return;
    if (!_batIo && 'IntersectionObserver' in window) {
      _batIo = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { _batIo.unobserve(en.target); batByrja(en.target.getAttribute('data-gr-bat-svid')); } }), { rootMargin: '200px 0px' });
    }
    if (_batIo) _batIo.observe(el); else batByrja(el.getAttribute('data-gr-bat-svid'));
  }
  // Tilvitnun valin → rýmin hennar lýst upp (beint í DOM, engin endurteikning — sama staða fer í næstu teikningu)
  function batMerkja() {
    const k = spjald('bruna'); if (!k) return;
    const x = (S.batTilv || [])[S.batQ];
    const keys = new Set(x ? x.rymi.concat(x.tal && x.tal.key ? [x.tal.key] : []) : []);
    k.querySelectorAll('.gr-bat [data-rymi]').forEach((el) => el.classList.toggle('on', keys.has(el.getAttribute('data-rymi'))));
    k.querySelectorAll('[data-gr-a="bat-q"]').forEach((el) => el.classList.toggle('on', +el.getAttribute('data-q') === S.batQ));
    const bl = k.querySelector('.gr-bat-blad'); if (bl) bl.classList.toggle('val', !!x);
    const s = k.querySelector('[data-bat-val]');
    if (s) {
      const synd = [...keys].filter((key) => k.querySelector('.gr-bat-blad [data-rymi="' + key + '"]'));
      const txt = !x ? '' : (synd.length ? 'Lýst upp: ' + synd.map((key) => BAT_RYMI_HEITI[key] || key).join(', ') : 'Rými tilvitnunarinnar eru ekki merkt á þessari hæð') +
        ([...keys].filter((key) => !synd.includes(key)).length && synd.length ? ' · ekki á þessari hæð: ' + [...keys].filter((key) => !synd.includes(key)).map((key) => BAT_RYMI_HEITI[key] || key).join(', ') : '');
      if (s.textContent !== txt) s.textContent = txt;
    }
  }
  function batBera(cl, r, haedNafn) {
    if (!cl.key) return { st: 'ovisst', txt: 'Rýmið („' + cl.fra + '“) er ekki merkt svo á teikningunni' };
    if (!r || r.stada === 'saeki') return { st: 'bid', txt: 'Teikning: les…' };
    if (r.stada !== 'komid') return { st: 'ovisst', txt: 'Teikningin fékkst ekki' };
    if (!r.texti) return { st: 'ovisst', txt: 'Teikningin er skönnuð — ekki talið' };
    const h = r.herb.find((x) => x.key === cl.key);
    if (!h) return { st: 'ovisst', txt: 'Ekki á þessari hæð (' + haedNafn + ')' };
    const s = h.st;
    if (s) {
      const ok = s.dyr === cl.n && (cl.beint == null || s.uti === cl.beint);
      return { st: ok ? 'ok' : 'nei', txt: 'Teikning (' + haedNafn + '): ' + s.dyr + (s.dyr === 1 ? ' gönguhurð' : ' gönguhurðir') + ' úr rýminu, ' + s.uti + ' beint út' + (s.stor ? ' + ' + s.stor + ' innkeyrsluhurðir (' + s.storUti + ' út)' : '') + ' · ' + s.utInni + ' ÚT-merki — ' + (ok ? 'stemmir' : 'ber ekki saman, skoða á staðnum') };
    }
    return { st: 'ovisst', txt: 'Teikning (' + haedNafn + '): ≈ ' + h.utNaest + ' ÚT-merki næst rýminu — nálgun, rýmismörk ' + (h.lekur ? 'lokast ekki' : 'ekki lesin') };
  }
  const BAT_IK = { utg: 'i-utg', neyd: 'i-neyd', reykluga: 'i-reykluga', bjorgun: 'i-bjorgun' };
  const batIkon = (glyff, bg, cls, extra) => (BAT_IK[glyff] ? '<i class="' + cls + ' ' + BAT_IK[glyff] + '"' + (extra || '') + '></i>'
    : (() => { const u = taknMynd(glyff, bg); return u ? '<img class="' + cls + '" alt="" src="' + u + '"' + (extra || '') + '>' : '<i class="' + cls + ' i-pin"' + (extra || '') + '></i>'; })());
  function batHtml(g, tilv) {
    const hs = batHaedir(g);
    if (!hs.length) return '';
    const val = hs.find((h) => h.lykill === S.batHaed) || hs[0];
    const r = BAT.get(val.lykill);
    const pc = (v) => (Math.round(v * 10000) / 100) + '%';
    const stadur = (o) => 'left:' + pc(o.x) + ';top:' + pc(o.y);
    const valin = tilv[S.batQ], valKeys = new Set(valin ? valin.rymi.concat(valin.tal && valin.tal.key ? [valin.tal.key] : []) : []);
    const nefnd = new Set(); tilv.forEach((x) => { x.rymi.forEach((k) => nefnd.add(k)); if (x.tal && x.tal.key) nefnd.add(x.tal.key); });
    const komid = r && r.stada === 'komid';
    // ── sviðið (föst hæð — ekkert ýtist þegar teikningin kemur)
    let svid;
    if (!r || r.stada === 'saeki') svid = '<span class="gr-bat-bid">Les teikninguna — textalag, rými og útganga…</span>';
    else if (r.stada === 'villa') svid = '<span class="gr-bat-bid villa">Teikningin fékkst ekki: ' + esc(r.villa) + '</span>';
    else if (!r.mynd) svid = '<span class="gr-bat-bid">Engin mynd á hæðinni.</span>';
    else if (!r.ar) svid = '<div class="gr-bat-blad heil"><img alt="" src="' + esc(r.mynd) + '"></div>';
    else {
      const lag = [];
      // rými sem lýsingin nefnir: flötur (gríma úr veggjalínum) + nafnspjald
      r.herb.filter((h) => h.key && nefnd.has(h.key)).forEach((h) => {
        const on = valKeys.has(h.key) ? ' on' : '';
        if (h.maska) lag.push('<img class="gr-bat-m' + on + '" data-rymi="' + h.key + '" alt="" src="' + h.maska.src + '" style="left:' + pc(h.maska.x) + ';top:' + pc(h.maska.y) + ';width:' + pc(h.maska.w) + ';height:' + pc(h.maska.h) + '">');
        else lag.push('<i class="gr-bat-hr' + on + '" data-rymi="' + h.key + '" style="' + stadur(h) + '"></i>');
      });
      r.dyr.forEach((d) => lag.push('<i class="gr-bat-d' + (d.stor ? ' stor' : '') + '" style="' + stadur(d) + ';width:' + pc(d.l) + ';transform:translate(-50%,-50%) rotate(' + Math.round(d.ang) + 'deg)" title="' + (d.stor ? 'Innkeyrsluhurð út' : 'Útidyr') + ' — greint úr veggjalínum Teikningar"></i>'));
      r.herb.filter((h) => h.key && nefnd.has(h.key)).forEach((h) => lag.push('<strong class="gr-bat-r' + (valKeys.has(h.key) ? ' on' : '') + '" data-rymi="' + h.key + '" style="' + stadur({ x: Math.min(0.94, Math.max(0.06, h.x)), y: Math.min(0.97, Math.max(0.03, h.y)) }) + '">' + esc(h.texti) + '</strong>'));
      r.takn.forEach((t) => lag.push(batIkon(t.glyff, '#b42318', 'gr-bat-i', ' style="' + stadur(t) + '" title="' + esc(t.skst + ' = ' + t.heiti + ' (á teikningunni)') + '"')));
      r.merki.forEach((m) => { const tg = batTeg(m.teg); lag.push(batIkon(tg[0], '#2a2a30', 'gr-bat-i okkar', ' style="' + stadur(m) + '" title="' + esc(tg[1] + ' — merki í ' + m.upp) + '"')); });
      r.ut.forEach((x) => lag.push('<i class="gr-bat-i i-utg' + (x.upp !== 'teikning' ? ' okkar' : '') + '" style="' + stadur(x) + '" title="' + esc(x.heiti || 'Útgangur') + '"></i>'));
      // neyðarlýsing / reyklúga við rýmin sem setningin nefnir — „úr lýsingu", ekki staðsetning búnaðar
      const merkt = new Set();
      tilv.forEach((x) => Object.keys(x.bunR).forEach((b) => x.bunR[b].forEach((key) => r.herb.filter((h) => h.key === key).forEach((h) => {
        const lk = b + '|' + h.x.toFixed(3) + '|' + h.y.toFixed(3); if (merkt.has(lk)) return; merkt.add(lk);
        const n = [...merkt].filter((q) => q.endsWith('|' + h.x.toFixed(3) + '|' + h.y.toFixed(3))).length - 1;
        lag.push('<i class="gr-bat-i lys ' + BAT_IK[b] + '" data-rymi="' + key + '" style="' + stadur(h) + ';transform:translate(calc(-50% + ' + (n * 22 - 11) + 'px),calc(-50% - 22px))" title="' + esc((b === 'neyd' ? 'Neyðarlýsing' : 'Reyklúga') + ' í rýminu skv. byggingarlýsingu: „' + x.texti + '“') + '"></i>');
      }))));
      const still = r.still ? ' style="position:absolute;max-width:none;width:' + pc(r.still.w) + ';height:' + pc(r.still.h) + ';left:' + pc(r.still.x) + ';top:' + pc(r.still.y) + '"' : '';
      svid = '<div class="gr-bat-blad' + (valin ? ' val' : '') + '" style="aspect-ratio:' + r.ar.toFixed(4) + ';width:min(100%,calc(var(--bat-h) * ' + r.ar.toFixed(4) + '))"><img alt="" src="' + esc(r.mynd) + '"' + still + '>' + lag.join('') + '</div>';
    }
    // ── skýringar (föst hæð, ein lína sem skrunar lárétt)
    const sk = [];
    const chip = (ik, txt, n, t) => sk.push('<span class="gr-bat-sk"' + (t ? ' title="' + esc(t) + '"' : '') + '>' + ik + '<span>' + esc(txt) + '</span><b>' + n + '</b></span>');
    if (komid) {
      const utT = r.ut.filter((x) => x.upp === 'teikning').length, utO = r.ut.length - utT;
      if (utT) chip('<i class="gr-bat-ik i-utg"></i>', 'Útgangur (ÚT á teikningu)', utT);
      if (r.dyr.length) chip('<i class="gr-bat-ik i-dyr"></i>', 'Útidyr greindar' + (r.dyr.some((d) => d.stor) ? ' (þ.a. ' + r.dyr.filter((d) => d.stor).length + ' innkeyrslu)' : ''), r.dyr.length, 'Dyr á útvegg — sjálfvirkt úr veggjalínum Teikningar');
      if (utO) chip('<i class="gr-bat-ik i-utg okkar"></i>', 'ÚT-merki okkar', utO);
      const tg = new Map(); r.takn.forEach((t) => { const k = t.skst + ' = ' + t.heiti; tg.set(k, (tg.get(k) || 0) + 1); });
      tg.forEach((n, k) => { const t = r.takn.find((x) => x.skst + ' = ' + x.heiti === k); chip(batIkon(t.glyff, '#b42318', 'gr-bat-ik'), k, n, 'Skammstöfun teikningarinnar eftir skýringum blaðsins'); });
      const mg = new Map(); r.merki.forEach((m) => { const k = batTeg(m.teg)[1]; mg.set(k, (mg.get(k) || 0) + 1); });
      mg.forEach((n, k) => { const m = r.merki.find((x) => batTeg(x.teg)[1] === k); chip(batIkon(batTeg(m.teg)[0], '#2a2a30', 'gr-bat-ik okkar'), k, n, 'Merki í Teikningu / TurboPaint'); });
      BAT_BUN.forEach(([b, heiti]) => { const keys = new Set(); tilv.forEach((x) => (x.bunR[b] || []).forEach((k) => keys.add(k))); const n = r.herb.filter((h) => keys.has(h.key)).length; if (n) chip('<i class="gr-bat-ik lys ' + BAT_IK[b] + '"></i>', heiti + ' — skv. lýsingu', n + ' rými', 'Sett við rýmin sem setning byggingarlýsingarinnar nefnir — ekki staðsetning búnaðarins'); });
    }
    const skyr = '<div class="gr-bat-skyr">' + (sk.length ? sk.join('') : '<span class="gr-bat-sk tomt">' + (komid ? 'Engin útgangamerki eða tákn lesin á þessari hæð' : 'Skýringar birtast þegar teikningin er lesin') + '</span>') + '</div>';
    // ── staða (ein lína)
    let stada = '';
    if (komid) {
      if (r.skannad) stada = (r.pdfHam ? 'Skönnuð teikning' : 'Teikningin er mynd') + ' — ekkert textalag: útgangar og rýmisheiti eru ekki lesin, ekkert giskað' + (r.merki.length || r.ut.length ? ' · ' + (r.merki.length + r.ut.length) + ' merki úr Teikningu/TurboPaint sýnd' : '') + '.';
      else {
        const her = [...nefnd].filter((k) => r.herb.some((h) => h.key === k)), vant = [...nefnd].filter((k) => !her.includes(k));
        stada = (her.length ? 'Rými úr lýsingunni á teikningunni: ' + her.map((k) => (BAT_RYMI_HEITI[k] || k) + (r.herb.filter((h) => h.key === k).length > 1 ? ' ×' + r.herb.filter((h) => h.key === k).length : '')).join(', ') : (nefnd.size ? 'Ekkert rými lýsingarinnar merkt á þessari hæð' : r.herb.length + ' rými lesin á teikningunni')) +
          (vant.length && her.length ? ' · ekki á þessari hæð: ' + vant.map((k) => BAT_RYMI_HEITI[k] || k).join(', ') : '');
      }
    } else stada = r && r.stada === 'villa' ? 'Teikningin fékkst ekki.' : 'Les teikninguna…';
    // ── talning og tilvitnanir (þekkt úr lýsingunni fyrirfram — breytast ekki þegar teikningin kemur)
    const tal = tilv.filter((x) => x.tal).map((x) => {
      const v = batBera(x.tal, r, val.heiti), led = { ok: 'g', nei: 'r', ovisst: 'y' }[v.st] || '';
      return '<button type="button" class="gr-bat-tal st-' + v.st + (S.batQ === x.i ? ' on' : '') + '" data-gr-a="bat-q" data-q="' + x.i + '" title="' + esc('„' + x.texti + '“ — ' + v.txt) + '">' +
        '<span class="gr-bat-tal1"><b>' + esc(x.tal.key ? BAT_RYMI_HEITI[x.tal.key] : x.tal.fra) + '</b> Lýsing: ' + x.tal.n + ' flóttaleiðir' + (x.tal.beint != null ? ', þar af ' + x.tal.beint + ' beint út' : '') + '</span>' +
        '<span class="gr-bat-tal2"><i class="gr-led ' + led + '"></i>' + esc(v.txt) + '</span></button>';
    });
    const qs = tilv.map((x) => '<button type="button" class="gr-bat-q' + (S.batQ === x.i ? ' on' : '') + (x.neitun ? ' neit' : '') + '" data-gr-a="bat-q" data-q="' + x.i + '"><q>' + esc(x.texti) + '</q>' +
      (x.rymi.length ? '<small>' + esc(x.rymi.map((k) => BAT_RYMI_HEITI[k]).join(' · ')) + '</small>' : '') + '</button>');
    const hlid = tilv.length ? '<div class="gr-bat-hlid">' + (tal.length ? '<div class="gr-bat-fyrir">Talning flóttaleiða — lýsing borin við teikninguna</div>' + tal.join('') : '') +
      '<div class="gr-bat-fyrir">Tilvitnanir — smelltu til að lýsa upp rýmin</div>' + qs.join('') + '</div>' : '';
    const flipar = '<div class="gr-bat-haedir" role="group" aria-label="Hæð">' + hs.map((h) => '<button type="button" class="gr-bat-hd' + (h === val ? ' on' : '') + '" data-gr-a="bat-haed" data-l="' + esc(h.lykill) + '" aria-pressed="' + (h === val) + '" title="' + esc(h.undir) + '">' + esc(h.heiti) + '</button>').join('') +
      '<span class="gr-bat-hd-undir">' + esc(val.undir) + '</span></div>';
    return '<div class="gr-bat" data-gr-bat="' + esc(val.lykill) + '">' +
      '<div class="gr-hluti-haus"><span>Brunavarnir á teikningu</span><small>útgangar · rými úr lýsingu · búnaður</small></div>' + flipar +
      '<div class="gr-bat-grind' + (hlid ? '' : ' ein') + '"><div class="gr-bat-vinstri"><div class="gr-bat-svid' + (r && r.mynd ? ' mynd' : '') + '" data-gr-bat-svid="' + esc(val.lykill) + '"' + (r ? '' : ' data-bat-bid="1"') + '>' + svid + '</div>' +
      skyr + '<div class="gr-bat-stada" title="' + esc(stada) + '">' + esc(stada) + '</div><div class="gr-bat-stada val" data-bat-val></div></div>' + hlid + '</div>' +
      '<div class="gr-uppruni">Útgangar og tákn úr textalagi teikningarinnar (skammstafanir eftir skýringum blaðsins) · útidyr, rýmisfletir og talning úr veggjalínum Teikningar — sjálfvirkt, staðfesta á staðnum · neyðarlýsing og reyklúgur eftir orðalagi lýsingarinnar · á skannaðri teikningu er ekkert giskað<span class="gr-sjalf">sjálfsótt</span></div></div>';
  }

  /* 5g · SKJAL SEM TALAN KEMUR ÚR — smámynd skráningartöflu / byggingarlýsingar / brunateikningar við texta spjaldanna */
  function skjalD(slod) {
    if (!slod) return null;
    const t = S.g && S.g.teikn;
    const d = ((t && t.dr) || []).find((x) => x && x.infoUrl === slod);
    if (d) return d;
    return erBeintPdf(slod) ? { infoUrl: slod } : null;
  }
  function skjalFlis(slod, heiti, undir, hopur) {
    const d = skjalD(slod);
    if (!d) return '<div class="gr-fsk gr-fsk-bida" title="' + esc(heiti) + '"><span class="gr-fsk-mynd"><span class="gr-fsk-bid">' + (S.g && S.g.teikn ? 'Forskoðun ekki í skránni' : 'Sæki forskoðun…') + '</span></span><span class="gr-fsk-heiti">' + esc(heiti) + '</span><span class="gr-fsk-undir">' + esc(undir || '') + '</span></div>';
    return fskFlis({ d, titill: '' }, heiti, false, { hopur: hopur || 'skjal', undir: undir || '' });
  }
  function bestaBrunablad(t) {
    const a = serListi(t).flokkar.get('bruna');
    return a && a.length ? a : [];
  }
  function nyjastaUtlit(g) {
    const t = g.teikn; if (!t || !t.dr) return null;
    const fl = flokkaBlod(t.dr, g.bygg);
    return (fl.utlit.nyjar[0] || fl.snid.nyjar.find((x) => x.f.utlit)) || null;
  }

  /* 5h · MYNDRÆN SAMANTEKT — forsíðumynd, ræma með bestu teikningunum og staða kerfa (táknin) */
  function heroGogn(g) {
    const bl = g.teikn && (g.teikn.bord || []).map((b) => b.blender).find((b) => b && b.myndir && b.myndir.length);
    if (bl) return { url: bl.myndir[0].url, merki: 'Designer-3D · ' + kl(bl.t), titill: 'Designer-3D' };
    if (g.loft && g.loft.ok && g.loft.url) return { url: g.loft.url, merki: g.loft.attr + ' · sjálfsótt', titill: 'Loftmynd' };
    const u = nyjastaUtlit(g);
    if (u && u.d.thumb) return { url: u.d.thumb, stor: myndSlod(u.d.infoUrl), merki: 'Útlit · ' + (dags(u.d.dags) || ''), titill: 'Útlit' };
    return null;
  }
  function skurdurSmatt(h, smella) {
    const fr = h.frum && h.frum.b && h.frum.h ? h.frum : null;
    const sk = h.skurdur && h.skurdur.w > 0 && h.skurdur.h > 0 && fr ? h.skurdur : (fr ? { x: 0, y: 0, w: fr.b, h: fr.h } : null);
    const url = h.image_url;
    const innri = (() => { try { return new URL(url, location.href).searchParams.get('url') || url; } catch (_) { return url; } })();
    const pdf = erBeintPdf(innri);
    if (!sk || !fr) return pdf ? '<span class="gr-fsk-mynd" data-gr-fskm data-pdf="' + esc(innri) + '" data-px="700"' + smella + '><span class="gr-fsk-bid">Teikna…</span></span>' : '<span class="gr-fsk-mynd"' + smella + '><img alt="" loading="lazy" src="' + esc(url) + '"></span>';
    const pct = (v) => (Math.round(v * 10000) / 100) + '%';
    const still = 'width:' + pct(fr.b / sk.w) + ';height:' + pct(fr.h / sk.h) + ';left:' + pct(-sk.x / sk.w) + ';top:' + pct(-sk.y / sk.h);
    const breidd = sk.w / sk.h > 132 / 92;
    const kassi = 'aspect-ratio:' + (sk.w / sk.h).toFixed(4) + ';' + (breidd ? 'width:100%' : 'height:100%');
    return '<span class="gr-fsk-mynd gr-raema-skurdur"' + smella + '><span class="gr-skurdur" style="' + kassi + '"' + (pdf ? ' data-gr-fskm data-pdf="' + esc(innri) + '" data-px="1400" data-still="' + esc(still) + '"' : '') + '>' +
      (pdf ? '<span class="gr-fsk-bid">Teikna…</span>' : '<img alt="" loading="lazy" src="' + esc(url) + '" style="' + still + '">') + '</span></span>';
  }
  function raemaHtml(g) {
    const t = g.teikn;
    if (!t) return '<div class="gr-raema"><span class="gr-kerfi-tomt">Sæki teikningar…</span></div>';
    const tiles = [];
    const k = S.fskK;
    const flisHaed = (x, heiti) => fskFlis(x, heiti, false, { hopur: 'raema', undir: dags(x.d.dags) || '' });
    // viðskiptavinur: hæðir hans úr Teikningu (vinnumynd eða skurður)
    (t.bord || []).slice(0, 1).forEach((b) => {
      const hs = (b.bord.haedir || []).map((h, i) => ({ h, i })).sort((a, z) => (HL.rod(HL.lykill(a.h.nafn)) - HL.rod(HL.lykill(z.h.nafn))) || (a.i - z.i)).slice(0, 4);
      hs.forEach(({ h, i }) => {
        const nr = S.fskSafn.length, nafn = h.nafn || ('Hæð ' + (i + 1));
        const vm = h.vinnumynd && h.vinnumynd.url;
        const fr = h.frum && h.frum.b && h.frum.h ? h.frum : null;
        const sk = h.skurdur && h.skurdur.w > 0 && fr ? h.skurdur : null;
        const innri = (() => { try { return new URL(h.image_url, location.href).searchParams.get('url') || h.image_url; } catch (_) { return h.image_url; } })();
        S.fskSafn.push(vm ? { titill: b.co.nafn + ' — ' + nafn, undir: 'Vinnumynd úr Teikningu', mynd: vm, hopur: 'raema' } : { titill: b.co.nafn + ' — ' + nafn, undir: 'Teikning', mynd: erBeintPdf(innri) ? null : h.image_url, pdf: erBeintPdf(innri) ? innri : null, skurdur: sk, frum: fr, hopur: 'raema' });
        const smella = ' data-gr-a="fsk" data-k="' + k + '" data-i="' + nr + '"';
        tiles.push('<button type="button" class="gr-fsk"' + smella + ' title="' + esc(nafn) + '">' + (vm ? '<span class="gr-fsk-mynd"><img alt="" loading="lazy" src="' + esc(vm) + '"></span>' : skurdurSmatt(h, '')) +
          '<span class="gr-fsk-heiti">' + esc(nafn) + '</span><span class="gr-fsk-undir">úr Teikningu</span></button>');
      });
    });
    if (t.dr) {
      const fl = flokkaBlod(t.dr, g.bygg);
      if (!(t.bord || []).length) {
        fl.haedir.slice(0, 4).forEach((h) => tiles.push(flisHaed(h.x, haedaHeiti(h.keys, h.x.ris))));
        if (!fl.haedir.length) fl.onefnd.slice(0, 3).forEach((x, i, a) => tiles.push(flisHaed(x, a.length > 1 ? 'Grunnmynd ' + (i + 1) : 'Grunnmynd')));
      }
      const br = bestaBrunablad(t)[0];
      if (br) tiles.push(fskFlis(br, 'Brunavarnir', false, { hopur: 'raema', undir: br.titill }));
      const u = nyjastaUtlit(g);
      if (u) tiles.push(fskFlis(u, 'Útlit', false, { hopur: 'raema', undir: dags(u.d.dags) || u.titill }));
    }
    if (!tiles.length) return '<div class="gr-raema"><span class="gr-kerfi-tomt">' + esc(t.villa || 'Engar teikningar fundust.') + '</span></div>';
    return '<div class="gr-raema">' + tiles.slice(0, 7).join('') + '</div>';
  }
  function myndraenHtml(g) {
    const h = heroGogn(g);
    let hero = '<div class="gr-hero gr-hero-tom"><span class="gr-fsk-bid">' + (g.loft && !g.loft.ok ? 'Engin loftmynd' : 'Sæki mynd af húsinu…') + '</span></div>';
    if (h) {
      const nr = S.fskSafn.length;
      S.fskSafn.push({ titill: h.titill + ' — ' + (g.adr || ''), undir: h.merki, mynd: h.stor || h.url, hopur: 'hero' });
      hero = '<button type="button" class="gr-hero" data-gr-a="fsk" data-k="' + S.fskK + '" data-i="' + nr + '" title="' + esc(h.titill) + ' — smelltu til að stækka"><img alt="' + esc(h.titill) + '" src="' + esc(h.url) + '"><span class="gr-loft-merki">' + esc(h.merki) + '</span></button>';
    }
    return '<div class="gr-myndraen">' + hero + '<div class="gr-myndraen-h">' +
      '<div class="gr-mskilti">Teikningar</div>' + raemaHtml(g) +
      '<div class="gr-mskilti">Kerfi — skylt eftir tegund' + (g.tegund ? ' (' + esc(g.tegund.heiti) + ')' : '') + '</div>' + kerfaRodHtml(g) +
      '</div></div>';
  }
  // Loftmynd í haus borðans: kemur í stað upphafsstafanna (co-banner-mono), sama pláss — ekkert hopp
  function hausMynd(g) {
    const el = document.querySelector('#companies-main.gr-sydar .co-banner-id .gr-haus-mynd');
    if (!el) return;
    const u = g && g.loft && g.loft.ok && g.loft.url ? { url: g.loft.url, t: 'Loftmynd · ' + g.loft.attr } : (() => { const x = g && nyjastaUtlit(g); return x && x.d.thumb ? { url: x.d.thumb, t: 'Útlit · ' + (dags(x.d.dags) || '') } : null; })();
    const nu = u ? u.url : '';
    if (el.dataset.src === nu) return;
    el.dataset.src = nu;
    el.innerHTML = u ? '<img alt="" src="' + esc(u.url) + '">' : '<span>' + esc(((g && g.adr) || '').slice(0, 2).toUpperCase()) + '</span>';
    el.title = u ? u.t + ' — smelltu til að stækka' : '';
    if (u) { el.setAttribute('data-gr-ljos', u.url); el.setAttribute('data-gr-titill', u.t); } else { el.removeAttribute('data-gr-ljos'); }
  }

  /* 5i · TEIKNINGAR-SPJALDIÐ: hæðir viðskiptavinar (Teikning) OG skjalasafnið — aðaluppdrættir og sérteikningar */
  TEIKNA.teikn = (g) => {
    const p = g.parts.teikn || {};
    if (!g.adr) { setjaStodu('teikn', 'tomt', 'bíður'); setjaBuk('teikn', '<div class="gr-tomt">Ekkert heimilisfang.</div>'); return; }
    if (p.stada === 'saeki' || !p.stada) { setjaStodu('teikn', 'saeki', 'leita í skjalasafni…'); return; }
    if (p.stada === 'villa') { setjaStodu('teikn', 'villa', 'villa'); setjaBuk('teikn', '<div class="gr-villa">Náði ekki í teikningar: ' + esc(p.villa) + '</div><div class="gr-takkar"><button type="button" class="ssp-btn" data-gr-a="aftur" data-l="teikn">Reyna aftur</button></div>'); return; }
    const t = g.teikn || {};
    safnByrja('teikn');
    const hl = [];
    const bord = t.bord || [];
    // Agnar 09.10.2026: „Hafa síðan annan yfirdálk með teikningunum sem við erum að nota" — tveir hlutar með eigin haus
    const vidsk = (g.hja && g.hja.listi) || [];
    const tpBord = t.tp || [];
    const hlutiHaus = (nafn, undir) => '<div class="gr-hluti-haus"><span>' + esc(nafn) + '</span>' + (undir ? '<small>' + esc(undir) + '</small>' : '') + '</div>';
    if (vidsk.length) hl.push(hlutiHaus('Í notkun hjá okkur', vidsk.map((r) => r.co.nafn).join(' · ')));
    if (vidsk.length && !bord.length && !tpBord.length) hl.push('<div class="gr-tomt">Engar hæðir í Teikningu enn hjá ' + esc(vidsk.map((r) => r.co.nafn).join(', ')) + '.</div>' + setjaITeikninguHtml(t));
    if (tpBord.length) hl.push('<div class="ssp-skilti"' + (bord.length ? '' : ' style="margin-top:0"') + '>TurboPaint-borð — ' + tpBord.length + '</div><div class="gr-tp-bord">' + tpBord.map((b) =>
      '<div class="gr-tp" title="' + esc(b.nafn + ' — ' + b.takn + ' tákn, ' + b.myndir + ' myndir · aðeins lesið') + '"><b>' + esc(b.nafn) + '</b><span>' + b.takn + ' tákn · uppfært ' + esc(kl(b.uppfaert)) + '</span>' +
      '<span class="gr-tp-teg">' + b.tegundir.map(([n, c]) => esc(n) + ' ' + c).join(' · ') + '</span></div>').join('') + '</div>');
    if (bord.length) {
      hl.push(bord.map((b) => {
        // hæðirnar neðst → efst (Kjallari, 1., 2. … Ris) — óþekkt heiti halda sínum stað innbyrðis
        const hs = (b.bord.haedir || []).map((h, i) => ({ h, i })).sort((a, z) => (HL.rod(HL.lykill(a.h.nafn)) - HL.rod(HL.lykill(z.h.nafn))) || (a.i - z.i));
        return '<div class="ssp-skilti" style="margin-top:0">' + esc(b.co.nafn) + ' — ' + hs.length + (hs.length === 1 ? ' hæð' : ' hæðir') + ' í Teikningu · uppfært ' + esc(kl(b.bord.updated_at)) + '</div>' +
          '<div class="gr-haedir">' + thrivHtml(b) + hs.map(({ h, i }) => haedHtml(b.co, h, i)).join('') + '</div>' +
          '<div class="gr-takkar"><button type="button" class="ssp-btn malm" data-gr-a="teikning" data-id="' + +b.co.id + '">Opna í Teikningu</button><button type="button" class="ssp-btn" data-gr-a="3d" data-id="' + +b.co.id + '">3D</button>' +
          '<span class="ssp-daufur" style="font-size:12px">Smelltu á hæð til að stækka (← → milli hæða). Rauðir punktar = tæki, grænir = merki.</span></div>';
      }).join(''));
    }
    const safn = (t.eign && (t.eign.heimildNafn || (t.eign.heimild === 'reykjavik' ? 'Skjalasafn Reykjavíkur' : ''))) || '';
    if (!t.dr) {
      setjaStodu('teikn', bord.length ? 'komid' : 'tomt', bord.length ? 'úr Teikningu' : 'ekkert fannst');
      setjaUndir('teikn', bord.map((b) => b.co.nafn).join(' · '));
      setjaBuk('teikn', hl.join('') + hlutiHaus('Úr skjalasafni', safn || '') + '<div class="gr-tomt">' + esc(t.villa || 'Engar teikningar fundust í skjalasafninu.') + '</div>' + (vidsk.length ? '' : setjaITeikninguHtml(t)));
      return;
    }
    const fl = flokkaBlod(t.dr, g.bygg);
    setjaStodu('teikn', 'komid', (bord.length ? 'úr Teikningu · ' : '') + t.dr.length + ' blöð' + ((t.ser || []).length ? ' + ' + t.ser.length + ' sér' : ''));
    setjaUndir('teikn', bord.length ? bord.map((b) => b.co.nafn).join(' · ') + (safn ? ' · ' + safn : '') : safn);
    const grind = (a) => '<div class="gr-fsk-grind">' + a.join('') + '</div>';
    const fela = (listi, heitiF, titill, skyring) => listi.length
      ? '<details class="gr-eldri"><summary>' + esc(titill) + ' (' + listi.length + ')</summary>' + (skyring ? '<div class="gr-fsk-ath">' + skyring + '</div>' : '') + grind(listi.map((x) => fskFlis(x, heitiF(x), true))) + '</details>' : '';
    // hæðir — grunnmyndir gildandi aðaluppdrátta, neðst → efst
    const onefndHeiti = (x, i, a) => (/grunnmyndir|allt h[úu]s/i.test(x.txt) ? 'Grunnmyndir (allt húsið)' : (fl.haedir.length ? 'Grunnmynd (hæð óskráð)' : (a.length > 1 ? 'Grunnmynd ' + (i + 1) + ' af ' + a.length : 'Grunnmynd')));
    const sl = serListi(t);
    hl.push(hlutiHaus('Úr skjalasafni', safn || 'skjalasafn sveitarfélagsins'));
    {
      const hFlisar = fl.haedir.map((h) => fskFlis(h.x, haedaHeiti(h.keys, h.x.ris)));
      const oFlisar = fl.onefnd.map((x, i, a) => fskFlis(x, onefndHeiti(x, i, a)));
      hl.push('<div class="ssp-skilti" style="margin-top:0">Hæðir — grunnmyndir gildandi aðaluppdrátta</div>' +
        (hFlisar.length || oFlisar.length ? grind(hFlisar.concat(oFlisar)) : '<div class="gr-tomt">Engin gildandi grunnmynd í skránni.</div>') +
        (!fl.haedir.length && fl.onefnd.length ? '<div class="gr-fsk-ath">Skráin merkir ekki hæð á þessi blöð (' + esc(safn || 'sveitarfélagið') + ') — opnaðu blaðið til að sjá hvaða hæð það sýnir.</div>' : '') +
        fela(fl.eldri, (x) => (x.keys.length ? haedaHeiti(x.keys, x.ris) : 'Grunnmynd'), 'Eldri útgáfur') +
        fela(fl.passarEkki, (x) => haedaHeiti(x.keys, x.ris), 'Passa ekki við skráningartöfluna',
          fl.bh ? 'Skráningartaflan segir ' + fl.bh.ofanjardar + (fl.bh.ofanjardar === 1 ? ' hæð' : ' hæðir') + ' ofanjarðar' + (fl.bh.kjallari === false ? ' og engan kjallara' : '') + ' — þessi blöð eru líklega af eldra húsi á lóðinni.' : ''));
    }
    hl.push(adrarHtml(g, t, fl, sl));
    hl.push(allarHtml(g, t, fl, sl));
    if (t.serVilla) hl.push('<div class="gr-varud">' + esc(t.serVilla) + '</div>');
    setjaBuk('teikn', hl.join('') +
      '<div class="gr-takkar"><button type="button" class="ssp-btn" data-gr-a="forskodun">Öll ' + t.dr.length + ' blöð aðaluppdrátta í forskoðun</button>' + (vidsk.length ? '' : setjaITeikninguHtml(t, true)) + '</div>' +
      '<div class="gr-uppruni">Sama leit og „Sækja teikningu“ í Teikningu (374), sama hæðagreining og „Finna allt húsið“ (383) · ' + esc(safn || 'skjalasafn sveitarfélagsins') +
      ' · smelltu á blað til að stækka (← → milli blaða)<span class="gr-sjalf">sjálfsótt</span></div>');
  };
  function setjaITeikninguHtml(t, inni) {
    const an = (t && t.anBords) || [];
    if (!an.length) return '';
    return an.slice(0, 3).map((co) => '<button type="button" class="ssp-btn malm" data-gr-a="setja" data-id="' + +co.id + '" title="Opnar Teikningu ' + esc(co.nafn) + ' og „Finna allt húsið“ — ekkert vistast fyrr en ýtt er á Vista þar">Setja í Teikningu' + (an.length > 1 ? ' — ' + esc(co.nafn) : '') + '</button>').join('') + (inni ? '' : '');
  }

  /* 6 · REKSTUR OG FYRIRTÆKIÐ ───────────────────────────────────────────────────────────────────────────── */
  // Kennitala → fyrirtækjaskrá. (1) Svarið sem prófíllinn geymir í þessum vafra (features.js: localStorage ktskra3:<kt>),
  // (2) annars /api/kt-lookup — en 431 (Uppfærsluborð) hleypir uppflettingu á ÞEKKTA kennitölu aðeins í gegn við
  // notandasmell (Endurnýja). Þá skilar hemillinn 503 '{}' og spjaldið býður „Sækja úr fyrirtækjaskrá" (einn smellur =
  // ein uppfletting, sami samningur og Endurnýja: __coEndurnyja.notad.kt merkt áður en fetch fer).
  const KT_GEYMSLA = 'ktskra3:';
  function ktGeymt(kt) {
    try { const j = JSON.parse(localStorage.getItem(KT_GEYMSLA + kt) || 'null'); return j && j.d ? { d: j.d, t: j.t || null } : null; } catch (_) { return null; }
  }
  async function ktUppfletting(kt, smellt) {
    if (smellt) window.__coEndurnyja = { id: SYND, notad: { kt: true } };
    const r = await fetch(KT + '?kt=' + kt + '&skra=3', { signal: AbortSignal.timeout(15000) });
    let j = null; try { j = await r.json(); } catch (_) {}
    if (r.status === 503 && j && !Object.keys(j).length) return { hemill: true };
    if (!r.ok || !j || j.error) return { villa: (j && j.error) || ('svar ' + r.status) };
    // Ekkert skrifað í vafrann (enginn nýr vafralykill — audit-vafrastada): kt-lookup geymir svarið sjálft í
    // kt_lookup_cache á þjóninum, og lotu-skyndiminnið (LOTA) heldur því meðan síðan er opin.
    return { d: j, t: Date.now() };
  }
  async function rekstur(g, hja) {
    const okkar = (hja && hja.listi || []).map((r) => r.co);
    const kts = [...new Set(okkar.map((c) => String(c.kennitala || '').replace(/\D/g, '')).filter((k) => k.length === 10 && k !== '9999999999').concat(g.kt ? [g.kt] : []))].slice(0, 5);
    const felog = [];
    for (const kt of kts) {
      let skra = null, villa = null, hemill = false, geymt = null;
      const gm = ktGeymt(kt);
      if (gm) { skra = gm.d; geymt = gm.t; }
      else {
        try {
          const u = await lota('kt|' + kt, () => ktUppfletting(kt, false));
          if (u.d) skra = u.d; else if (u.hemill) hemill = true; else villa = u.villa;
        } catch (e) { villa = (e && e.message) || String(e); }
      }
      const stodvar = (Companies.list || []).filter((c) => c && +c.id !== SYND && !c.deleted_at && String(c.kennitala || '').replace(/\D/g, '') === kt);
      const nafn = (skra && skra.nafn) || (okkar.find((c) => String(c.kennitala || '').replace(/\D/g, '') === kt) || {}).nafn || kt;
      felog.push({ kt, nafn, skra, villa, hemill, geymt, stodvar });
    }
    return { felog, okkar };
  }
  function ktHlekkir(kt) {
    const erFelag = +kt.slice(0, 2) >= 41;
    const a = (href, t, titill) => '<a class="ssp-plata" href="' + esc(href) + '" target="_blank" rel="noopener" title="' + esc(titill) + '">' + esc(t) + '</a>';
    return (erFelag ? a('https://keldan.is/Fyrirtaeki/Yfirlit/' + kt, 'Keldan', 'Keldan — fjárhagur og ársreikningar (áskrift fyrir meira)') : '') +
      a('https://1819.is/?q=' + kt.slice(0, 6) + '-' + kt.slice(6), '1819', '1819 — sími, opnunartími, vefsíða') +
      (erFelag ? a('https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/' + kt, 'Fyrirtækjaskrá', 'Fyrirtækjaskrá Skattsins') : '');
  }
  TEIKNA.rekstur = (g) => {
    const p = g.parts.rekstur || {}, po = g.parts.opin || {};
    if (!g.adr && !g.kt) { setjaStodu('rekstur', 'tomt', 'bíður'); setjaBuk('rekstur', '<div class="gr-tomt">Ekkert heimilisfang.</div>'); return; }
    const r = g.rekstur || { felog: [] };
    const osm = (g.opin && g.opin.rekstur && g.opin.rekstur.listi) || [];
    const osmFyrirt = osm.filter((x) => x.nafn && x.osm_tag && x.osm_tag.k !== 'building');
    const hluti = [], osmHluti = [];
    // c) rekstur á staðnum úr OpenStreetMap — aftast, merktur „getur verið úreltur" (síðasta breyting færslunnar úr Overpass meta)
    if (po.stada === 'saeki' || (!po.stada && g.adr) || (g.opin && g.opin.reksturBid && !g.opin.rekstur)) osmHluti.push('<div class="ssp-skilti">Á staðnum (OpenStreetMap)</div><div class="gr-tomt">Sæki rekstur úr OpenStreetMap…</div>');
    else if (po.stada === 'villa') osmHluti.push('<div class="ssp-skilti">Á staðnum (OpenStreetMap)</div><div class="gr-villa">' + esc(po.villa) + '</div>');
    else if (g.opin && g.opin.villur && g.opin.villur.rekstur) osmHluti.push('<div class="ssp-skilti">Á staðnum (OpenStreetMap)</div><div class="gr-villa">Overpass svaraði ekki (' + esc(g.opin.villur.rekstur) + ') — ekki sama og „enginn rekstur“.</div><div class="gr-takkar"><button type="button" class="ssp-btn" data-gr-a="aftur" data-l="opin">Reyna aftur</button></div>');
    else if (g.opin) {
      const vef = g.vefir || {};
      osmHluti.push('<div class="ssp-skilti">Á staðnum (OpenStreetMap) — ' + (osmFyrirt.length ? osmFyrirt.length + (osmFyrirt.length === 1 ? ' rekstraraðili' : ' rekstraraðilar') : 'enginn skráður') + '</div>' +
        (osmFyrirt.length ? '<ul class="gr-listi">' + osmFyrirt.slice(0, 12).map((x) => {
          const v = x.vefur ? vef[x.vefur] : null;
          return '<li><b>' + esc(x.nafn) + '</b> <small>' + esc(x.tegund || '') + (x.gata ? ' · ' + esc(x.gata + ' ' + (x.nr || '')) : '') + '</small>' +
            (x.opid ? ' <small>opið: ' + esc(x.opid) + '</small>' : '') + (x.simi ? ' <small>sími ' + esc(x.simi) + '</small>' : '') +
            (x.vefur ? ' <a class="gr-hl" href="' + esc(x.vefur) + '" target="_blank" rel="noopener">' + esc(x.vefur.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>' : '') +
            (x.breytt ? ' <small class="ssp-daufur">OSM breytt ' + esc(dags(x.breytt)) + '</small>' : '') +
            (v && v.titill ? '<br><small>„' + esc(v.titill) + '“' + (v.lysing ? ' — ' + esc(v.lysing) : '') + '</small>' : '') + '</li>';
        }).join('') + '</ul>' : '<div class="gr-tomt">Enginn rekstur skráður í OpenStreetMap við húsið (skráin er ekki tæmandi).</div>') +
        '<div class="gr-varud" style="margin-top:6px">OpenStreetMap er skráð af sjálfboðaliðum og <b>getur verið úrelt</b>' + (() => { const d = osmFyrirt.map((x) => x.breytt).filter(Boolean).sort().pop(); return d ? ' — síðast breytt ' + esc(dags(d)) : ''; })() + '. Okkar skrá og fyrirtækjaskrá ganga fyrir; nýjustu rekstraraðilar eru á Já.is (hnappurinn hér fyrir neðan).</div>' +
        '<div class="gr-uppruni">' + esc(g.opin.rekstur ? g.opin.rekstur.heimild : 'OpenStreetMap') + (g.opin.rekstur && g.opin.rekstur.ur_skyndiminni ? ' · úr skyndiminni þjónsins' + (g.opin.rekstur.aldur_dagar ? ' (' + g.opin.rekstur.aldur_dagar + ' daga)' : '') + (g.opin.rekstur.gamalt ? ' — Overpass svaraði ekki núna' : '') : '') + ' · titill af forsíðu: ein sókn per vef<span class="gr-sjalf">sjálfsótt</span></div>');
    }
    // b) félögin (kennitölur á staðnum hjá okkur, eða slegin inn) — fyrirtækjaskrá
    if (p.stada === 'saeki' || !p.stada) hluti.push('<div class="ssp-skilti">Fyrirtækjaskrá</div><div class="gr-tomt">Sæki…</div>');
    else if (p.stada === 'villa') hluti.push('<div class="ssp-skilti">Fyrirtækjaskrá</div><div class="gr-villa">' + esc(p.villa) + '</div>');
    else if (!r.felog.length) hluti.push('<div class="ssp-skilti">Fyrirtækjaskrá</div><div class="gr-tomt">Engin kennitala þekkt á staðnum í okkar skrá. Fyrirtækjaskrá Skattsins leitar aðeins eftir kennitölu — sláðu inn kennitölu rekstraraðila í hausnum til að sjá skráninguna.</div>');
    else hluti.push(r.felog.map((f) => {
      const s = f.skra || {};
      const linur = [
        ['Kennitala', esc(f.kt.slice(0, 6) + '-' + f.kt.slice(6))],
        ['Lögheimili', s.heimilisfang_full ? esc((s.bt_adili ? 'b.t. ' + s.bt_adili + ' · ' : '') + s.heimilisfang_full) : '—'],
        ['Rekstrarform', s.rekstrarform ? esc(s.rekstrarform) : '—'],
        ['ÍSAT', s.isat && s.isat.length ? esc(s.isat.join(' · ')) : '—'],
        ['Stofnað', s.stofnad ? esc(s.stofnad) : '—'],
        ['Staða', s.stada && s.stada.length ? '<span style="color:#b42318;font-weight:700">' + esc(s.stada.join(' · ')) + '</span>' : (f.skra ? 'virkt (engin afskráning)' : '—')],
      ];
      const stodvar = f.stodvar.length ? '<div class="ssp-skilti">Starfsstöðvar hjá okkur (' + f.stodvar.length + ')</div><ul class="gr-listi">' + f.stodvar.slice(0, 10).map((c) => '<li><a class="gr-hl" href="#company/' + +c.id + '" data-gr-a="profill" data-id="' + +c.id + '">' + esc(c.nafn) + '</a> <small>' + esc(c.heimilisfang || '') + '</small></li>').join('') + '</ul>' : '';
      return '<div class="ssp-skilti">' + esc(f.nafn) + ' — fyrirtækjaskrá</div><div class="gr-reitir">' + linur.map(([m, v]) => '<div class="ssp-lina"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi">' + v + '</span></div>').join('') + '</div>' +
        '<div class="gr-takkar">' + (f.hemill && !f.skra ? '<button type="button" class="ssp-btn malm" data-gr-a="kt" data-kt="' + esc(f.kt) + '" title="Ein uppfletting í fyrirtækjaskrá — sama og Endurnýja á prófílnum">Sækja úr fyrirtækjaskrá</button>' : '') + ktHlekkir(f.kt) + '</div>' + stodvar +
        '<div class="gr-uppruni">' + (f.skra ? 'Fyrirtækjaskrá Skattsins (kt-lookup' + (f.geymt ? ', geymt í þessum vafra ' + esc(kl(f.geymt)) : ', ein uppfletting') + ')' :
          f.hemill ? 'Fyrirtækjaskrá ekki sótt sjálfkrafa — kennitalan er þekkt hjá okkur og Uppfærsluborðið (431) leyfir uppflettingu aðeins við smell' :
          'Fyrirtækjaskrá svaraði ekki' + (f.villa ? ': ' + esc(f.villa) : '')) + ' · fjöldi starfsfólks og velta eru aðeins í áskriftarþjónustum (sjá Heimildir og hömlur)<span class="gr-sjalf">sjálfsótt</span></div>';
    }).join(''));
    const iGangi = p.stada === 'saeki' || po.stada === 'saeki';
    setjaStodu('rekstur', iGangi ? 'saeki' : (osmFyrirt.length || r.felog.length ? 'komid' : 'tomt'), iGangi ? 'sæki…' : (osmFyrirt.length + r.felog.length ? (osmFyrirt.length ? osmFyrirt.length + ' á staðnum' : '') + (osmFyrirt.length && r.felog.length ? ' · ' : '') + (r.felog.length ? r.felog.length + (r.felog.length === 1 ? ' félag' : ' félög') : '') : 'ekkert þekkt'));
    // a) okkar eigin félög á heimilisfanginu (fyrirtaeki) — fyrst, með tengli á prófíl og þjónustu
    const okkar = (g.hja && g.hja.listi) || [];
    const okkarHtml = okkar.length
      ? '<div class="ssp-skilti" style="margin-top:0">Hjá okkur á heimilisfanginu — ' + okkar.length + '</div><ul class="gr-listi">' + okkar.map((r) => {
        const kf = (r.kerfi || []).filter((k) => k.taekifaeri === 'd').map((k) => ((window.Flokkun && Flokkun.KERFI_MAP && Flokkun.KERFI_MAP.get(k.kerfi)) || { heiti: k.kerfi }).heiti);
        return '<li><a class="gr-hl" href="#company/' + +r.co.id + '" data-gr-a="profill" data-id="' + +r.co.id + '"><b>' + esc(r.co.nafn) + '</b></a>' +
          (r.co.kennitala ? ' <small>kt. ' + esc(r.co.kennitala) + '</small>' : '') + ' <small>' + (r.co.er_i_thjonustu ? 'í þjónustu' : 'ekki í þjónustu') + ' · ' + tala(r.taeki) + ' tæki' + (r.sidast ? ' · skoðað ' + esc(dags(r.sidast)) : '') + '</small>' +
          (kf.length ? '<br><small>Okkar kerfi: ' + esc(kf.join(', ')) + '</small>' : '') + '</li>';
      }).join('') + '</ul><div class="gr-uppruni">Okkar skrá (fyrirtaeki) — rekstraraðili sem við þjónustum á staðnum</div>'
      : (g.hja ? '<div class="ssp-skilti" style="margin-top:0">Hjá okkur á heimilisfanginu</div><div class="gr-tomt">Ekkert félag í okkar skrá á heimilisfanginu.</div>' : '');
    // d) Já.is — nýjustu rekstraraðilar, en sjálfvirk sókn er ekki leyfð (robots.txt; samþykki Agnars vantar): aðeins hnappur
    const jaHtml = g.adr ? '<div class="gr-takkar"><a class="ssp-btn" href="https://ja.is/?q=' + encodeURIComponent(g.adr) + '" target="_blank" rel="noopener" title="Já.is sýnir nýjustu rekstraraðila á heimilisfanginu — opnast í nýjum flipa, ekkert sótt sjálfvirkt">Opna á Já.is</a>' +
      '<span class="ssp-daufur" style="font-size:12px">Já.is er ekki sótt sjálfvirkt (robots.txt — þarf samþykki/leyfi, sjá Heimildir og hömlur).</span></div>' : '';
    hluti.unshift(okkarHtml);
    hluti.push.apply(hluti, osmHluti);
    hluti.push(jaHtml);
    safnByrja('rekstur');
    const ut0 = nyjastaUtlit(g);
    setjaBuk('rekstur', ut0 ? '<div class="gr-med-skjal"><div>' + hluti.join('') + '</div><div class="gr-skjal-fl">' + fskFlis(ut0, 'Útlit hússins', false, { hopur: 'rekstur', undir: dags(ut0.d.dags) || ut0.titill }) + '</div></div>' : hluti.join(''));
  };

  /* 7 · HEIMILDIR OG HÖMLUR (js/data/greining-heimildir.json) ───────────────────────────────────────────── */
  function heimildirSkra() {
    return lota('heimildir', async () => {
      const r = await fetch(HEIMILDIR_SKRA, { cache: 'no-cache' });
      if (!r.ok) throw new Error('heimildaskráin svaraði ' + r.status);
      const j = await r.json();
      return Array.isArray(j) ? j : (j.heimildir || []);
    });
  }
  // Hvað hver heimild skilaði fyrir NÚVERANDI heimilisfang (aðeins þær sem síðan kallar á)
  function herna(id, g) {
    const p = (l) => (g.parts[l] || {}).stada;
    const b = g.bygg, t = g.teikn, h = g.hja, r = g.rekstur;
    switch (id) {
      case 'stadfangaskra': case 'landeignaskra-leit': return b && b.eign ? 'L' + b.eign.landnr + (b.eign.heitinr ? ' · H' + b.eign.heitinr : '') : p('bygg') === 'saeki' ? 'sæki…' : p('bygg') === 'villa' || (g.adr && p('bygg') === 'komid') ? 'fannst ekki' : '—';
      case 'skjalasafn-teikningar': return t ? (t.dr ? t.dr.length + ' blöð' + ((t.ser || []).length ? ' + ' + t.ser.length + ' séruppdrættir' : '') + (t.skemmd ? ' · ' + t.skemmd + ' skemmd hjá sveitarfélaginu' : '') : (t.bord && t.bord.length ? 'hæðir í Teikningu · skjalasafnið svaraði ekki' : 'ekkert')) : p('teikn') === 'saeki' ? 'sæki…' : '—';
      case 'skraningartafla': return b ? ((b.heimildir || []).filter((x) => x.tegund === 'skraningartafla').length + ' töflur, ' + (b.heimildir || []).filter((x) => x.tegund === 'skraningartafla' && x.lesin).length + ' lesnar') : '—';
      case 'byggingarlysing': return b ? ((b.heimildir || []).filter((x) => x.tegund === 'byggingarlysing').length + ' lýsingar, ' + (b.heimildir || []).filter((x) => x.tegund === 'byggingarlysing' && x.lesin).length + ' lesnar') : '—';
      case 'ocr-skrifstofa': return b ? ((b.olesin || []).length ? (b.olesin || []).length + ' ólesin' : 'allt lesið') : '—';
      case 'kt-lookup': return r ? (r.felog.length ? r.felog.filter((f) => f.skra).length + ' af ' + r.felog.length + ' félögum' : 'engin kennitala á staðnum') : '—';
      case 'okkar-skra': return h ? (h.listi.length ? h.listi.length + ' staðir' : 'ekki viðskiptavinur') : '—';
      case 'flokkar-krofur': return g.tegund ? g.tegund.heiti : '—';
      case 'husmynd': case 'mapis-loftmynd': {
        const L = g.loft;
        if (!L) return p('opin') === 'saeki' || p('bygg') === 'saeki' ? 'sæki…' : 'sæki loftmynd…';
        const mapis = /map\.is/i.test(L.attr);
        if (!L.ok) return L.villa === 'engin-mynd' ? 'engin loftmynd á þessum stað' : 'svaraði ekki';
        if (id === 'mapis-loftmynd') return mapis ? 'loftmynd í Eigninni' : 'á ekki við (Reykjavík → Borgarvefsjá)';
        return mapis ? 'um map.is (næsta lína)' : 'loftmynd 2018 í Eigninni';
      }
      case 'mapis-teiknigrunn': {
        const safn = (b && b.eign && b.eign.safn) || '';
        if (/Reykjav/i.test(safn)) return 'á ekki við (Reykjavík → Skjalasafn)';
        return t ? (t.bord && t.bord.length ? 'ekki sótt — hæðir þegar í Teikningu' : t.dr ? t.dr.length + ' blöð' : 'ekkert') : p('teikn') === 'saeki' ? 'sæki…' : '—';
      }
      case 'landeignaskra-wfs': return g.opin ? (g.opin.lod && (g.opin.lod.skrad_m2 || g.opin.lod.maeld_m2) ? 'lóð ' + tala(g.opin.lod.skrad_m2 || g.opin.lod.maeld_m2) + ' m²' : 'ekkert') : p('opin') === 'saeki' ? 'sæki…' : '—';
      case 'rvk-fastanumer': return g.opin ? (g.opin.einingar ? (g.opin.einingar.fjoldi ? g.opin.einingar.fjoldi + ' rými' : 'engin rými skráð') : 'á ekki við (utan Reykjavíkur)') : '—';
      case 'ja-is': return g.adr ? 'hnappur „Opna á Já.is“ — ekki sótt sjálfvirkt' : '—';
      case 'overpass-osm': if (g.opin && g.opin.reksturBid && !g.opin.rekstur) return 'sæki…'; return g.opin ? (g.opin.rekstur && g.opin.rekstur.ur_skyndiminni ? 'skyndiminni · ' : '') + (g.opin.villur && g.opin.villur.rekstur ? 'svaraði ekki' : ((g.opin.rekstur && g.opin.rekstur.listi) || []).filter((x) => x.nafn && x.osm_tag && x.osm_tag.k !== 'building').length + ' rekstraraðilar') : p('opin') === 'saeki' ? 'sæki…' : '—';
      case 'fyrirtaeki-vefsida': { const v = g.vefir ? Object.values(g.vefir).filter((x) => x && x.titill).length : 0; return v ? v + ' vefir lesnir' : '—'; }
      default: return '';
    }
  }
  const STADA_LED = { 'virk': 'g', 'notað': 'g', 'þarf lykil': 'y', 'þarf innskráningu': 'y', 'þarf áskrift': 'y', 'takmarkað magn': 'y', 'lokað': 'r', 'bannað (skilmálar)': 'r', 'skilmálar óyfirfarnir': 'r' };
  TEIKNA.heimildir = (g) => {
    const p = g.parts.heimildir || {};
    if (p.stada === 'saeki' || !p.stada) { setjaStodu('heimildir', 'saeki', 'sæki lista…'); return; }
    if (p.stada === 'villa') { setjaStodu('heimildir', 'villa', 'villa'); setjaBuk('heimildir', '<div class="gr-villa">' + esc(p.villa) + '</div>'); return; }
    const listi = g.heimildir || [];
    const virk = listi.filter((x) => x.stada === 'virk' || x.stada === 'notað').length;
    setjaStodu('heimildir', 'komid', virk + ' virkar af ' + listi.length);
    // Þrír flokkar: í notkun · hægt að fá (lykill, innskráning, áskrift, takmarkað) · lokað eða óheimilt. Hver lína er
    // ein röð; smellur opnar hömlurnar og hvað þarf til að laga eða kaupa (details — notandaaðgerð, ekki hopp).
    const FLOKKAR = [
      ['I notkun eða opið', (x) => x.stada === 'notað' || x.stada === 'virk'],
      ['Hægt að fá — lykill, innskráning eða kaup', (x) => /lykil|innskrán|áskrift|takmarkað/.test(x.stada || '')],
      ['Lokað eða óheimilt án leyfis', (x) => /lokað|bannað|skilmál/.test(x.stada || '')],
    ];
    const notad = new Set();
    const hluti = FLOKKAR.map(([heiti, sia]) => {
      const radir = listi.filter((x) => !notad.has(x.id) && sia(x));
      radir.forEach((x) => notad.add(x.id));
      if (!radir.length) return '';
      return '<div class="ssp-skilti">' + esc(heiti.replace(/^I /, 'Í ')) + ' (' + radir.length + ')</div><div class="gr-heim">' + radir.map((x) => {
        const her = herna(x.id, g) || '';
        return '<details class="gr-hrod"><summary><i class="gr-led ' + (STADA_LED[x.stada] || '') + '"></i><b>' + esc(x.heiti) + '</b>' +
          '<span class="ssp-plata">' + esc(x.stada || '') + '</span><span class="gr-hgefur">' + esc((x.gefur || []).join(', ')) + '</span>' +
          (her ? '<span class="gr-hher" data-gr-hher="' + esc(x.id) + '" title="Hvað heimildin skilaði fyrir þetta heimilisfang">Hér: ' + esc(her) + '</span>' : '') + '</summary>' +
          '<div class="gr-hbuk">' +
            (x.homlur ? '<p><span class="ssp-merki">Hömlur</span> ' + esc(x.homlur) + '</p>' : '') +
            (x.laga && x.laga !== '—' ? '<p><span class="ssp-merki">Til að laga / kaupa</span> ' + esc(x.laga) + '</p>' : '') +
            (x.lykill_fer && x.lykill_fer !== '—' ? '<p><span class="ssp-merki">Lykill fer í</span> ' + esc(x.lykill_fer) + ' — aldrei í kóða</p>' : '') +
            (x.i_appinu ? '<p><span class="ssp-merki">Í appinu</span> ' + esc(x.i_appinu) + '</p>' : '') +
            (x.slod ? '<p><a class="gr-hl" href="' + esc(x.slod) + '" target="_blank" rel="noopener">' + esc(x.slod.replace(/^https?:\/\//, '').slice(0, 70)) + '</a> <small class="ssp-daufur">kannað ' + esc(dags(x.kannad)) + '</small></p>' : '') +
          '</div></details>';
      }).join('') + '</div>';
    }).join('');
    setjaBuk('heimildir', hluti +
      '<div class="gr-uppruni">Ein gagnaskrá (js/data/greining-heimildir.json) — uppfærð þegar heimild er keypt eða löguð. Smelltu á línu fyrir hömlur og hvað þarf.</div>');
  };

  /* 8 · SAMANTEKT — reglubundin, hver tala með uppruna ─────────────────────────────────────────────────── */
  TEIKNA.samantekt = (g) => {
    if (!g.adr && !g.kt) { setjaStodu('samantekt', 'tomt', 'bíður'); setjaBuk('samantekt', '<div class="gr-tomt">' + esc(g.villa || 'Sláðu inn heimilisfang, landnúmer eða kennitölu í hausnum og ýttu á Sækja.') + '</div>'); return; }
    const b = g.bygg || null, hja = g.hja, t = g.teikn, ae = g.aaetlun, teg = g.tegund;
    safnByrja('samantekt');
    loftSaekja(g);
    const iGangi = Object.keys(g.parts).filter((k) => (g.parts[k] || {}).stada === 'saeki').length;
    setjaStodu('samantekt', iGangi ? 'saeki' : 'komid', iGangi ? 'sæki ' + iGangi + ' hluta…' : 'tilbúið');
    if (b && b.eign) setjaUndir('samantekt', (b.eign.label || g.adr) + (b.eign.postnr ? ', ' + b.eign.postnr : ''));
    const st = b && b.skraningartafla;
    const vH = b && b.oryggi;
    const kpi = (gildi, merki, upp) => '<div class="gr-k"><b>' + gildi + '</b><span>' + esc(merki) + '</span><i title="' + esc(upp || '') + '">' + esc(upp || '') + '</i></div>';
    const hd = b && b.haedir;
    const haedTxt = hd ? String((hd.ofanjardar || 0) + (hd.kjallari ? 1 : 0)) : '—';
    const erVidsk = hja && hja.listi && hja.listi.length;
    const kpis = [
      kpi(b && b.m2 != null ? tala(b.m2) : '—', 'm² brúttó', b && b.m2 != null ? 'skráningartafla ' + dags(st && st.dags) + ' · ' + (vH && vH.m2 === 'há' ? 'há vissa' : 'miðlungs') : (g.parts.bygg || {}).stada === 'saeki' ? 'sæki…' : 'ekki lesið'),
      kpi(haedTxt, hd && hd.kjallari ? 'hæðir m. kjallara' : 'hæðir', hd ? 'skráningartafla · ' + (vH && vH.haedir === 'há' ? 'há vissa' : 'miðlungs') : 'ekki lesið'),
      kpi(b && b.byggingarar ? esc(b.byggingarar) : '—', 'byggt', b && b.byggingarar ? 'byggingarlýsing · óvíst' : 'ekki í lesnum skjölum'),
      kpi(ae ? '≈ ' + ae.alls : '—', 'slökkvitæki', ae ? 'áætlað · ' + ae.heimild : 'þarf m² á hæð'),
      kpi(hja ? (erVidsk ? 'Já' : 'Nei') : '…', 'viðskiptavinur', erVidsk ? hja.listi.map((r) => r.co.nafn).join(', ') : hja ? 'okkar skrá' : 'leita…'),
    ];
    // setningin
    const bitar = [];
    if (teg) bitar.push(esc(teg.heiti));
    if (hd) bitar.push(((hd.ofanjardar || 0) + (hd.kjallari ? ' hæðir + kjallari' : (hd.ofanjardar === 1 ? ' hæð' : ' hæðir'))));
    if (b && b.m2 != null) bitar.push(tala(b.m2) + ' m²');
    if (b && b.byggingarar) bitar.push('byggt ' + esc(b.byggingarar));
    let setn = bitar.length ? bitar.join(', ') : 'Engar byggingartölur lesnar enn';
    if (teg && teg.notkunarflokkur) setn += ' · notkunarflokkur ' + esc(teg.notkunarflokkur);
    setn += ' · Viðskiptavinur hjá okkur: ' + (hja ? (erVidsk ? 'Já' : 'Nei') : '…');
    const punktar = [];
    // skylt
    if (g.krofur && teg) {
      const tt = g.krofur.kr.tegundir.get(teg.tegund);
      const F = window.Flokkun;
      if (tt && F && F.KERFI) {
        const skylt = F.KERFI.filter((x) => { const r = tt.kerfi.get(x.k); return r && r.skylt === 'ja'; }).map((x) => x.k === 'slokkvitaeki' && ae ? 'slökkvitæki (≈ ' + ae.alls + ' tæki)' : x.heiti.toLowerCase());
        const skil = F.KERFI.filter((x) => { const r = tt.kerfi.get(x.k); return r && r.skylt === 'skilyrt'; }).map((x) => x.heiti.toLowerCase());
        if (skylt.length) punktar.push(['Skylt', esc(skylt.join(', ')) + (skil.length ? '<br><span class="ssp-daufur">Skilyrt: ' + esc(skil.join(', ')) + '</span>' : '')]);
        punktar.push(['Tegund', esc(teg.heiti) + ' <span class="ssp-daufur">(' + esc(teg.rok || '') + ')</span>']);
      }
    }
    const bv = b && b.brunavarnir;
    if (bv) {
      const efni = bv.efni || {};
      const nefnd = EFNI.filter(([k]) => efni[k] && (efni[k].daemi || []).some((d) => !d.neitun) && ['brunavidvorunarkerfi', 'vatnsudakerfi', 'neydarlysing', 'brunaslongur', 'reyklosun', 'thjonustusamningur', 'handslokkvitaeki'].includes(k)).map(([, h]) => h.toLowerCase());
      if (nefnd.length) punktar.push(['Í byggingarlýsingu', esc(nefnd.join(', ')) + ' <span class="ssp-daufur">(' + esc(dags(bv.dags)) + ')</span>']);
    }
    // tækifæri
    const taek = [];
    if (erVidsk) {
      hja.listi.forEach((r) => (r.kerfi || []).forEach((k) => { if (k.taekifaeri === 'a' || k.taekifaeri === 'b') taek.push((window.Flokkun && Flokkun.KERFI_MAP.get(k.kerfi) || { heiti: k.kerfi }).heiti + (k.taekifaeri === 'a' ? ' (skylt — vantar)' : ' (hjá öðrum' + (k.thjonustuadili ? ': ' + k.thjonustuadili : '') + ')')); }));
      if (!taek.length) taek.push('engin opin tækifæri í kerfaskrá ' + hja.listi.map((r) => r.co.nafn).join(', '));
    } else if (hja) {
      taek.push('nýr viðskiptavinur' + (ae ? ' — slökkvitæki ≈ ' + ae.alls + ' + árleg yfirferð' : ''));
      if (bv && bv.efni && (bv.efni.brunavidvorunarkerfi || {}).daemi && bv.efni.brunavidvorunarkerfi.daemi.some((d) => !d.neitun)) taek.push('brunaviðvörunarkerfi í lýsingu — þjónusta/skoðun');
      if (bv && bv.efni && (bv.efni.neydarlysing || {}).daemi && bv.efni.neydarlysing.daemi.some((d) => !d.neitun)) taek.push('neyðarlýsing — árleg prófun');
    }
    if (taek.length) punktar.push(['Tækifæri', esc(taek.join(' · '))]);
    if (t) {
      let tx = 'engar fundust';
      if (t.bord && t.bord.length) {
        tx = t.bord.map((x) => {
          const hs = (x.bord.haedir || []).slice().sort((a, b) => HL.rod(HL.lykill(a.nafn)) - HL.rod(HL.lykill(b.nafn)));
          return x.co.nafn + ': ' + hs.length + (hs.length === 1 ? ' hæð' : ' hæðir') + ' í Teikningu' + (hs.length ? ' (' + hs.map((h) => h.nafn).filter(Boolean).slice(0, 8).join(', ') + ')' : '') + (x.blender ? ' + Designer-3D' : '');
        }).join(' · ');
      } else if (t.dr) { const tj = teiknTeljari(flokkaBlod(t.dr, g.bygg)); tx = (tj || 'engin gildandi grunnmynd') + ' · ' + t.dr.length + ' blöð í skjalasafni'; }
      punktar.push(['Teikningar', esc(tx)]);
    }
    if (b && (b.olesin || []).length) punktar.push(['Ólesið', esc((b.olesin || []).length + ' skjöl — „Lesa skjölin“ les þau á skrifstofutölvunni')]);
    setjaBuk('samantekt', myndraenHtml(g) + '<div class="gr-kpi">' + kpis.join('') + '</div><p class="gr-setn">' + setn + '</p>' +
      '<ul class="gr-punktar">' + punktar.map(([m, v]) => '<li><span>' + esc(m) + '</span><span>' + v + '</span></li>').join('') + '</ul>' +
      '<div class="gr-uppruni">Reglubundin samantekt úr spjöldunum hér fyrir neðan — sjálfsótt úr opinberum skrám, merkt með uppruna; ekkert skrifað í okkar skrá.</div>');
  };

  /* ── SMELLIR Í SPJÖLDUNUM ────────────────────────────────────────────────────────────────────────────────── */
  function smellur(e) {
    const tpEl = e.target.closest && e.target.closest('.gr-fsk-tp[data-tp]');
    if (tpEl) { e.preventDefault(); e.stopPropagation(); window.open(tpEl.getAttribute('data-tp'), '_blank', 'noopener'); return; }
    const el = e.target.closest('[data-gr-a],[data-gr-ljos]');
    if (!el) return;
    const a = el.getAttribute('data-gr-a');
    if (!a && el.hasAttribute('data-gr-ljos')) { e.preventDefault(); ljos(el.getAttribute('data-gr-ljos'), el.getAttribute('data-gr-titill') || ''); return; }
    const g = S.g;
    if (a === 'aftur') {
      e.preventDefault();
      const l = el.getAttribute('data-l');
      [...LOTA.keys()].forEach((k) => { if (k.startsWith(l + '|') || (l === 'teikn' && k.startsWith('hja|'))) LOTA.delete(k); });
      hlada(g.nr);
    } else if (a === 'profill') {
      e.preventDefault();
      const id = +el.getAttribute('data-id');
      slokkva();
      location.hash = '#company/' + id;
    } else if (a === 'ocr') {
      e.preventDefault(); el.disabled = true;
      ocrBidja().catch((err) => { segja('Beiðnin fór ekki: ' + ((err && err.message) || err)); el.disabled = false; });
    } else if (a === 'blad') {
      e.preventDefault();
      const u = el.getAttribute('data-url');
      if (erBeintPdf(u)) { opnaForskodun(); return; }
      ljos(myndSlod(u), el.getAttribute('data-titill') || '');
    } else if (a === 'forskodun') { e.preventDefault(); opnaForskodun(); }
    else if (a === 'telja-herb') { e.preventDefault(); if (g) teljaHerbergi(g); }
    else if (a === 'teikn-landnr') { e.preventDefault(); const l = +el.getAttribute('data-l'); if (l && window.TeikningaForskodun) TeikningaForskodun.opna(l, 'L' + l, null, { sia: 'grunn' }); }
    else if (a === 'faera') {
      e.preventDefault();
      if (window.GreiningFaera && g) GreiningFaera.opna(+el.getAttribute('data-id'), g, { fra: 'greining' });
    } else if (a === 'stofna') {
      e.preventDefault();
      if (window.GreiningFaera && g) GreiningFaera.stofna(g);
    }
    else if (a === 'fsk') {
      e.preventDefault();
      const i = +el.getAttribute('data-i'), L = SAFN[el.getAttribute('data-k') || 'teikn'];
      if (L && L[i]) ljosSafn(L, i);
    }
    else if (a === 'teikning' || a === '3d') {
      e.preventDefault();
      opnaTeikningu(+el.getAttribute('data-id'), a === '3d');
    } else if (a === 'setja') {
      e.preventDefault();
      setjaITeikningu(+el.getAttribute('data-id'));
    } else if (a === 'opna') {
      e.preventDefault();
      opna(el.getAttribute('data-v'));
    } else if (a === 'kt') {
      e.preventDefault(); el.disabled = true;
      const kt = el.getAttribute('data-kt');
      LOTA.delete('kt|' + kt);
      ktUppfletting(kt, true).then((u) => {
        if (u && u.d) LOTA.set('kt|' + kt, Promise.resolve(u));   // gildir út lotuna
        const f = g && g.rekstur && g.rekstur.felog.find((x) => x.kt === kt);
        if (f) { if (u.d) { f.skra = u.d; f.nafn = u.d.nafn || f.nafn; f.hemill = false; f.villa = null; } else { f.villa = u.hemill ? 'Uppfærsluborðið (431) hafnaði — stilling „Af"?' : u.villa; } }
        teikna('rekstur'); teikna('krofur'); teikna('samantekt');
      }, (err) => { segja('Uppfletting brást: ' + ((err && err.message) || err)); el.disabled = false; });
    } else if (a === 'bat-haed') {
      e.preventDefault();
      const l = el.getAttribute('data-l');
      // hæð valin með smelli: greind strax (smellurinn er beiðnin — ekki beðið eftir að sviðið sjáist)
      if (l && l !== S.batHaed) { S.batHaed = l; batByrja(l); teikna('bruna'); }
    } else if (a === 'bat-q') {
      e.preventDefault();
      const q = +el.getAttribute('data-q');
      S.batQ = S.batQ === q ? -1 : q;
      batMerkja();
    } else if (a === 'vm') {
      e.preventDefault();
      const k = el.getAttribute('data-k');
      const nu = S.opidHaed[k];
      S.opidHaed[k] = (nu === '2d') ? 'vm' : (nu === 'vm' ? '2d' : '2d');
      teikna('teikn');
    }
  }
  document.addEventListener('change', (e) => {
    const s = e.target && e.target.closest ? e.target.closest('#' + ID + ' select[data-gr-a="tegund"]') : null;
    if (!s) return;
    const lik = S.g ? likTegund(S.g) : null;
    S.tegundVal = (s.value && !(lik && lik.tegund === s.value)) ? s.value : null;
    teikna('krofur'); teikna('samantekt');
  });
  function opnaForskodun() {
    const g = S.g; if (!g || !window.TeikningaForskodun) return;
    const e = (g.teikn && g.teikn.eign) || (g.bygg && g.bygg.eign) || g.eignHus;
    if (!e || !e.landnr) { TeikningaForskodun.opnaHeimilisfang(g.adr, null); return; }
    const svf = e.svf || null;
    TeikningaForskodun.opna(e.landnr, e.label || g.adr, null, svf ? { svf, heitinr: e.heitinr || 0, sia: 'grunn' } : { sia: 'grunn' });
  }
  async function opnaTeikningu(cid, thriv) {
    try {
      if (window.DB && typeof DB._primeCompany === 'function') { try { await DB._primeCompany(cid); } catch (_) {} }
      if (!window.Companies || !Companies.opnaTeikningu) return;
      Companies.opnaTeikningu(cid);
      if (thriv) {
        let n = 0;
        const t = setInterval(() => {
          const b = document.querySelector('#modal-floorplan .fp-3d-btn');
          if (b && window.FloorPlan && FloorPlan.bgImage) { clearInterval(t); b.click(); }
          else if (++n > 60) clearInterval(t);
        }, 250);
      }
    } catch (err) { segja('Teikning opnaðist ekki: ' + ((err && err.message) || err)); }
  }
  // „Setja í Teikningu“: Teikning félagsins + „Finna allt húsið“ (383). Tillaga — ekkert vistast fyrr en ýtt er á Vista þar
  // (TeiknVistun.skrifa, 375). Engin skrifleið hér.
  async function setjaITeikningu(cid) {
    // Teikningin á heima á prófíl félagsins: 374 flettir heimilisfangi FÉLAGSINS upp (þágufall → hus-upplysingar), og
    // Uppfærsluborðið (431) leyfir þá uppflettingu aðeins þegar prófíll þess félags er opinn — mælt 09.10 á 1237: á
    // sýndarprófílnum fékk 374 503 og sagði „Fann ekki húsið". Því: raunverulegi prófíllinn fyrst, svo Teikning.
    slokkva();
    location.hash = '#company/' + cid;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (window.Companies && +Companies.currentId === +cid && Companies._detailOpen && Companies._detailOpen(cid)) break;
    }
    await opnaTeikningu(cid, false);
    let n = 0;
    const t = setInterval(() => {
      const m = document.getElementById('modal-floorplan');
      if (++n > 60) { clearInterval(t); return; }
      if (!m || !window.TeiknBord || !TeiknBord.finnaAlltHusid || n < 4) return;
      clearInterval(t);
      const y = document.getElementById('fp-teikn-yfir'); if (y) y.style.display = 'none';   // 374 listinn víkur fyrir tillögunni
      TeiknBord.finnaAlltHusid().catch((err) => console.warn('[451] finna allt húsið', err));
    }, 300);
  }
  function ljos(url, titill) { ljosSafn([{ mynd: url, titill: titill || 'Mynd' }], 0); }

  /* ── LEIÐIR INN: slóð, Sala, Teikning ───────────────────────────────────────────────────────────────────── */
  function fraSlod() {
    const a = lesaSlod();
    if (a == null) { if (S.virkt && !/^#company\//.test(location.hash)) slokkva(); return false; }
    if (a === S.arg && ((S.virkt && synileg()) || (S.iOpnun && Date.now() - S.iOpnun < 20000))) return true;
    opna(a);
    return true;
  }
  // EKKI skráð í SubRoutes (235): apply() kóðar slóðarhlutann AFTUR eftir opnun („%25C3%25B3") — mælt 09.10. Hashchange og
  // ræsing eru hér (fraSlod + navigation-færslan), svo 235 á ekkert að gera með #greining.
  function skraLeid() {}

  // App.switchView burt frá fyrirtækjum / annað fyrirtæki opnað → sýndarröðin fer
  function vefja() {
    if (window.App && App.switchView && !App.switchView.__gr451) {
      const o = App.switchView;
      const w = function (v) {
        if (S.virkt && v !== 'companies') {
          // Ræsilending (kóði, ekki notandi) fyrstu 25 s eftir opnun: sýnin skiptir, en sýndarprófíllinn er settur aftur
          const snert = window.UrlRouting && UrlRouting.userTouched && UrlRouting.userTouched();
          if (!snert && S.opnad && Date.now() - S.opnad < 25000) { const r = o.apply(this, arguments); setTimeout(endurvekja, 0); return r; }
          slokkva();
        }
        return o.apply(this, arguments);
      };
      for (const k in o) { try { w[k] = o[k]; } catch (_) {} }
      w.__gr451 = true;
      App.switchView = w;
    }
    if (window.Companies && Companies.openDetail && !Companies.openDetail.__gr451) {
      const o = Companies.openDetail;
      const w = function (id) { if (S.virkt && +id !== SYND) slokkva(); return o.apply(this, arguments); };
      for (const k in o) { try { w[k] = o[k]; } catch (_) {} }
      w.__gr451 = true;
      Companies.openDetail = w;
    }
    if (window.Companies && Companies.load && !Companies.load.__gr451) {
      // listinn endurhlaðinn meðan sýndarprófíllinn er opinn → röðin aftur inn (annars finna 363/367 ekki heimilisfangið)
      const o = Companies.load;
      const w = function () { const p = o.apply(this, arguments); Promise.resolve(p).then(() => { if (S.virkt) setjaSynd(S.adr); }); return p; };
      for (const k in o) { try { w[k] = o[k]; } catch (_) {} }
      w.__gr451 = true;
      Companies.load = w;
    }
  }
  // Sala: lítill hlekkur í haus flísanna (við leitina, 443) → #greining með heimilisfangi valins viðskiptavinar
  function salaHlekkur() {
    const wrap = document.getElementById('pos-showall-wrap');
    if (!wrap || !wrap.parentElement) return;
    const haus = wrap.parentElement;
    let a = haus.querySelector(':scope > a.gr-sala-hl');
    if (a) return;
    injectCss();
    a = document.createElement('a');
    a.className = 'gr-sala-hl';
    a.href = '#greining';
    a.title = 'Greining fasteignar — sækir opinber gögn um heimilisfang (teikningar, m², brunavarnir, kröfur)';
    a.innerHTML = svg('<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>', 13) + 'Greining fasteignar';
    a.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      let adr = '';
      try { const st = window.POS && POS.getState && POS.getState(); adr = (st && st.customer && st.customer.heimilisfang) || ''; } catch (_) {}
      location.hash = slodFyrir(adr);
    });
    haus.appendChild(a);
  }
  function salaVakt() {
    const v = document.getElementById('view-sala');
    if (!v) { setTimeout(salaVakt, 1500); return; }
    if (v.__gr451) return;
    v.__gr451 = true;
    let raf = 0;
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; salaHlekkur(); }); }).observe(v, { childList: true, subtree: true });
    salaHlekkur();
  }
  // Teikning: lítill hnappur „Greining fasteignar“ í haus gluggans (eins og 374 bætir Sækja teikningu við)
  function teikningHnappur() {
    if (!window.FloorPlan || typeof FloorPlan.open !== 'function') return false;
    if (FloorPlan.__gr451) return true;
    const o = FloorPlan.open;
    FloorPlan.open = function () {
      const r = o.apply(this, arguments);
      try {
        const hd = document.querySelector('#modal-floorplan .modal-hd');
        const grp = hd && hd.lastElementChild;
        if (grp && !grp.querySelector('.fp-greining-btn')) {
          const cid = this.companyId;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn-outline btn-sm fp-greining-btn';
          b.textContent = 'Greining fasteignar';
          b.title = 'Opnar Greiningu fasteignar fyrir heimilisfang staðarins';
          b.onclick = () => {
            const c = (Companies.list || []).find((x) => x && +x.id === +cid);
            const adr = (c && c.heimilisfang) || '';
            try { if (typeof window.closeFP === 'function') closeFP(); else if (window.Modal) Modal.close('modal-floorplan'); } catch (_) {}
            location.hash = slodFyrir(adr);
          };
          grp.insertBefore(b, grp.firstChild);
        }
      } catch (_) {}
      return r;
    };
    FloorPlan.__gr451 = true;
    return true;
  }

  function start() {
    injectCss();
    vakta();
    skraLeid();
    vefja();
    salaVakt();
    let n = 0;
    (function bida() { vefja(); skraLeid(); const ok = teikningHnappur(); if ((!ok || !(window.App && App.switchView && App.switchView.__gr451)) && ++n < 60) setTimeout(bida, 250); })();
    window.addEventListener('hashchange', () => { try { fraSlod(); } catch (e) { console.warn('[451]', e); } });
    // Djúptengill við ræsingu. Mælt 09.10.2026 (2 af 5 ræsingum): 88 applyStartingView skiptir á Sölu ~0,6 s og 218 setur
    // #sala í slóðina ÁÐUR en þessi defer-skrifta keyrir — þá sá síðan aldrei #greining. Upprunalega slóðin er því lesin úr
    // navigation-færslunni (sama og 357 gerir fyrir #company/<id>) og opnuð nema notandinn hafi þegar snert síðuna.
    let boot = lesaSlod();
    if (boot == null) { try { const n = performance.getEntriesByType('navigation')[0]; const h = n && n.name && n.name.indexOf('#') >= 0 ? n.name.slice(n.name.indexOf('#')) : ''; boot = lesaSlod(h); } catch (_) {} }
    if (boot != null) setTimeout(() => {
      try {
        const snert = window.UrlRouting && UrlRouting.userTouched && UrlRouting.userTouched();
        if (!S.virkt && !S.iOpnun && !snert) { atb('ræsing ' + boot); setjaSlod(boot); opna(boot); }
      } catch (_) {}
    }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // „Greining" á raunverulega prófílnum (452): sömu gögn og síðan sækir — bygging-uppl, fasteign-opin, kröfuskrá —
  // í sama lotu-skyndiminni (LOTA). Líkleg tegund úr OpenStreetMap/nafni (fyrirtækjaskrá ekki kölluð hér).
  async function gognFyrirProfil(adr, nafn) {
    const g = { adr: String(adr || '').trim(), parts: {}, hja: { listi: [] }, rekstur: { felog: [] } };
    if (!g.adr) throw new Error('Ekkert heimilisfang á félaginu');
    const [b, o, k] = await Promise.allSettled([byggingGogn(g), opinGogn(g), krofurGogn()]);
    g.bygg = b.status === 'fulfilled' ? b.value : null;
    g.opin = o.status === 'fulfilled' ? o.value : null;
    g.krofur = k.status === 'fulfilled' ? k.value : null;
    g.villur = { bygg: b.status === 'rejected' ? String((b.reason && b.reason.message) || b.reason) : null, opin: o.status === 'rejected' ? String((o.reason && o.reason.message) || o.reason) : null };
    if (nafn) g.rekstur.felog.push({ nafn });
    try { g.tegund = g.krofur ? likTegund(g) : null; } catch (_) { g.tegund = null; }
    if (g.tegund && g.krofur && g.krofur.kr && g.krofur.kr.tegundir) { const t = g.krofur.kr.tegundir.get(g.tegund.tegund); g.tegund.heiti = t ? t.heiti : g.tegund.tegund; }
    return g;
  }
  window.Greining451 = {
    gognFyrirProfil,
    einingar: (g) => { try { return einingar(g); } catch (_) { return {}; } },
    naestu, leysa: (arg) => leysa(arg),
    opna: (arg) => { location.hash = slodFyrir(arg || ''); },
    opnaNu: opna,
    stada: () => ({ virkt: S.virkt, arg: S.arg, adr: S.adr, parts: S.g ? JSON.parse(JSON.stringify(S.g.parts)) : null }),
    gogn: () => S.g,
    likTegund: (g) => { try { return likTegund(g); } catch (_) { return null; } },
    bat: () => { const hs = S.g ? batHaedir(S.g) : []; const val = hs.find((h) => h.lykill === S.batHaed) || hs[0]; return { haedir: hs.map((h) => ({ lykill: h.lykill, heiti: h.heiti, kind: h.kind, pdf: !!h.pdf })), valin: val ? val.lykill : null, q: S.batQ, tilv: (S.batTilv || []).map((x) => ({ i: x.i, rymi: x.rymi, tal: x.tal })), greining: [...BAT].map(([k, v]) => ({ k, stada: v.stada, villa: v.villa || null, texti: !!v.texti, skannad: !!v.skannad, veggir: !!v.veggir, ar: v.ar || 0, ut: (v.ut || []).length, utTeikn: (v.ut || []).filter((x) => x.upp === 'teikning').length, dyr: (v.dyr || []).length, takn: (v.takn || []).map((t) => t.skst), merki: (v.merki || []).map((m) => m.teg), skyr: v.skyr || {}, herb: (v.herb || []).map((h) => ({ texti: h.texti, key: h.key, st: h.st || null, utNaest: h.utNaest, maska: !!h.maska })) })) }; },
    forsk: () => ({ virk: FSK.virk, bid: FSK.bid.length, mest: FSK.mest, byrjad: FSK.byrjad, lokid: FSK.lokid, villur: FSK.villur, safn: (SAFN.teikn || []).length }),
    samaHeimili, thatta,
    SYND,
    version: '451',
  };
  console.log('[451] Greining fasteignar');
})();
/* === END GREINING FASTEIGNAR === */
