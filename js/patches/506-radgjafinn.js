/* === RÁÐGJAFINN (506) — 15.11.2026 ==============================================================
 *
 * Agnar 15.11.2026 (skjáskot af Þjónustuborði, ör undir Vinnusamantekt): „ert bara sem aðalráðgjafinn í fyrirtækinu að
 * leiðbeina mér … ekkert að setja 2000 atriða lista … nokkuð stóran glugga þarna inn á bara Agnars þjónustuborð … með top
 * updates og síðan frá besta rekstrarráðgjafa heims ráðleggingar hvað ég ætti að einbeita mér að fyrir daginn" og
 * „updatin eru úr tölvupóstunum milli Heimaleigu og síðan Center Hotel".
 *
 * HVAÐ ÞETTA ER: einn stór gluggi beint undir Vinnusamantekt (489), aðeins hjá Agnari, í rödd Tony Stark
 * (.claude/agents/tony-stark.md — Agnar 15.11.2026: „nýjan agent fyrir the master top ráðgjafann. Tony Stark"):
 *   · fyrirsögn dagsins — það mikilvægasta í einni setningu;
 *   · Í dag — einbeittu þér að: 1–3 ráð (hvað, af hverju, fyrsta skref);
 *   · Úr póstinum: Heimaleiga og Center Hotels — staða + mest 4 fréttir hvor;
 *   · Betri leið: ein tillaga um betra vinnulag, síðu eða virkni (núna → betra, fyrsta skref) — eða engin.
 * Hvert atriði sýnir heimildina sína (póstur, dagsetning, efni) — atriði án heimildar er hent á þjóninum.
 *
 * HVAÐAN: Claude skrifar þetta kl. 06:45 á hverjum morgni úr póstinum, reikningsstöðu, Charlize og forgangsmálum
 * (netlify/functions/_radgjafinn.cjs). Glugginn LES aðeins — /api/radgjafinn — og ↻ biður um ný skrif
 * (/.netlify/functions/radgjafinn-background, 1–2 mín.). Ekkert annað er skrifað.
 *
 * STÖÐUGT VIÐMÓT: ekkert vafra-skyndiminni (póstefni viðskiptavina á ekki heima í localStorage). Glugginn teiknast fyrir
 * neðan sýnilega svæðið við opnun. CLS sér EKKI hopp á borðinu (368 skiptir öllum hnútum út — kerfisrýni 15.11.2026), svo
 * hoppið er leyst beint: þegar svarið berst og notandinn er skrunaður niður fyrir topp gluggans er skrun hýsilsins leiðrétt
 * um hæðarmuninn (teiknaStodugt). Borðið er aðeins teiknað þegar eitthvað breyttist (ekki við hverja könnun ↻).
 * Samanbrotið er viðmótsval → Vidmot (472, eins á öllum vélum). 368 teiknar gluggann (Radgjafinn.html(n)) og sendir smelli
 * með data-t5="rg-…" hingað (Radgjafinn.smellur); fókusinn fer aftur á takkann eftir teikningu.
 * Sími og app-hamur: gámafyrirspurn á .t5 (borðið sjálft), ekki @media — í app-ham er síðan 980 px en borðið mjótt.
 *
 * RÁÐNINGIN (Agnar 15.11.2026, kvöld): Tony er aðalfyrirtækjaráðgjafi — „tvöfalda tekjurnar og 3falda hagnaðinn" (fyrir
 * nóv. 2027), „helst ekki meira en top 10 málin", „2 mánaða plan". Glugginn sýnir því, í þessari röð:
 *   · fyrirsögn · MARKMIÐSRÖND (tekjur sl. 3 heila mánuði á móti markmiðinu, hagnaður — „ómælt" þar til hann er mældur;
 *     tölurnar koma úr gögnunum á þjóninum, aldrei úr texta Claude) · Í DAG — TOP 10 (flokkur, hvað, af hverju, fyrsta skref)
 *     · 2 MÁNAÐA PLANIÐ (staða hvers atriðis + „Tillaga" þar til Agnar samþykkir) við hlið PÓSTSINS · betri leið.
 * ============================================================================================== */
(() => {
  if (window.Radgjafinn) return;

  const EIGANDI = 'Agnar';
  const LES = '/api/radgjafinn';
  const SKRIFA = '/.netlify/functions/radgjafinn-background';
  const FELLT_LYKILL = 'radgjafinn_fellt';         // viðmótsval → Vidmot (samstillt á allar vélar)
  const ENDURLES_MS = 5 * 60 * 1000, KONNUN_MS = 8000, KONNUN_MAX_MS = 4 * 60 * 1000, BID_MIN = 5;

  const S = { gogn: null, at: 0, loading: false, villa: null, skrifar: null, skrifVilla: null, skrifVillaFra: 0, fellt: null };

  // BAKGRUNNUR (atvik 15.11.2026 kl. 18:30–18:36): appið fór í bakgrunn eftir ↻ (skipt yfir í annað app) og Android stöðvaði
  // netið hjá síðunni. Netlify skráði aðeins 3 GET á 8 mín. — ~30 kannanir fóru aldrei úr símanum („Failed to fetch"),
  // könnunin gafst upp eftir 4 mín. þótt skrifin hefðu tekist eftir 72 s, og ↻ nr. 2 kostaði óþarfa Claude-kall.
  // Nú: engin sókn meðan síðan er falin, aðeins tími í forgrunni telst upp í KONNUN_MAX_MS, og glugginn heldur strax
  // áfram (eða sækir upp á nýtt) þegar appið kemur aftur í forgrunn.
  const falin = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const notify = () => { try { if (window.Bord368 && Bord368.render) Bord368.render(); } catch (_) {} };
  const VIKA = ['sun.', 'mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.'];
  const MAN = ['jan.', 'feb.', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'sept.', 'okt.', 'nóv.', 'des.'];
  const dagsTxt = (s) => { const d = new Date(s); return VIKA[d.getDay()] + ' ' + d.getDate() + '. ' + MAN[d.getMonth()]; };
  const klst = (s) => { const d = new Date(s); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const stuttDags = (iso) => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) : '');

  // Hvað glugginn sýnir — teiknað er aðeins þegar þetta breytist (könnun ↻ á 8 s fresti teiknar annars borðið ~30 sinnum).
  const undirskrift = () => JSON.stringify([!!S.at, S.villa, S.gogn && S.gogn.nyjast && S.gogn.nyjast.skrifad_at,
    S.gogn && S.gogn.sidasta_villa && S.gogn.sidasta_villa.kl]);

  // Hopp: þegar svarið berst breytist hæð gluggans (staðgengill 300 px → mælt 730 px venjulega og 1.836 px mest á tölvu).
  // Sé notandinn skrunaður niður fyrir topp gluggans færist allt fyrir neðan — skrun hýsilsins er leiðrétt um muninn.
  // FÖST TALA, sett strax og aftur í rAF: 368 endurheimtir gamla skrunið í eigin rAF, og „+=" sem keyrði á undan næstu
  // teikningu var afturkallað (kerfisrýni 15.11.2026: +1.372 px á síma þegar ↻ kláraðist).
  const hysill = () => document.getElementById('view-bord');
  const rgRect = () => { const v = hysill(), s = v && v.shadowRoot && v.shadowRoot.querySelector('section.rg'); return s ? s.getBoundingClientRect() : null; };
  function teiknaStodugt() {
    const v = hysill(), fyrir = rgRect();
    const skrunar = v && v.scrollHeight > v.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(v).overflowY);
    const sk = skrunar ? v : (document.scrollingElement || document.documentElement);
    const efst = skrunar ? v.getBoundingClientRect().top : 0;
    const st0 = sk.scrollTop;
    notify();
    const eftir = rgRect();
    if (!fyrir || !eftir) return;
    const munur = eftir.height - fyrir.height;
    if (!munur || fyrir.top >= efst) return;   // glugginn byrjar á skjánum eða neðar — ekkert sýnilegt færist
    const z = skrunar ? (parseFloat(getComputedStyle(v).zoom) || 1) : 1;   // skrun hýsilsins er í óaðdregnum px
    const mark = st0 + munur / z;
    sk.scrollTop = mark;
    requestAnimationFrame(() => { sk.scrollTop = mark; });
  }

  async function load(force, teikna = true) {
    if (S.loading && !force) return;
    const adur = undirskrift();
    S.loading = true;
    try {
      const r = await fetch(LES, { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) throw new Error('innskráning vantar');
      if (r.status === 403) throw new Error('aðeins fyrir stjórnanda');
      if (!r.ok) throw new Error('svar ' + r.status);
      const g = await r.json();
      S.gogn = g; S.villa = null;
      // Gömul villa („tóku of langan tíma") hverfur þegar skrifin sem hún átti við hafa borist.
      if (S.skrifVilla && S.skrifVillaFra && g && g.nyjast && Date.parse(g.nyjast.skrifad_at) >= S.skrifVillaFra) { S.skrifVilla = null; S.skrifVillaFra = 0; }
    } catch (e) { S.villa = (e && e.name === 'TypeError') ? 'náði ekki sambandi við þjóninn' : ((e && e.message) || String(e)); }
    // S.at er líka sett þegar sókn bilar — annars kallaði hver teikning á nýja sókn (sama regla og 489).
    S.at = Date.now(); S.loading = false;
    if (teikna && undirskrift() !== adur) teiknaStodugt();
  }

  // ↻ — biður þjóninn um ný skrif og kannar svo á 8 sek. fresti þar til þau koma (eða villa / 4 mín. í forgrunni).
  async function skrifaAftur() {
    if (S.skrifar) return;
    const fra = Date.now();
    S.skrifar = { fra, virkt: 0, tima: 0, kanna: null }; S.skrifVilla = null; S.skrifVillaFra = 0; notify();
    try {
      const r = await fetch(SKRIFA, { method: 'POST', credentials: 'same-origin' });
      if (r.status === 401) throw new Error('innskráning vantar');
      if (r.status === 403) throw new Error('aðeins fyrir stjórnanda');
      if (!r.ok && r.status !== 202) throw new Error('svar ' + r.status);
    } catch (e) { S.skrifar = null; S.skrifVilla = (e && e.message) || String(e); teiknaStodugt(); return; }
    // Könnunin SÆKIR án þess að teikna; borðið er teiknað EINU SINNI þegar niðurstaðan liggur fyrir (ein teikning = ein
    // skrunleiðrétting sem ekkert afturkallar).
    const kanna = async () => {
      const sk = S.skrifar;
      if (!sk) return;
      if (falin()) return;                    // bíður: visibilitychange heldur áfram þegar appið sést aftur
      sk.virkt += KONNUN_MS;
      await load(true, false);
      if (S.skrifar !== sk) return;
      const n = S.gogn && S.gogn.nyjast, v = S.gogn && S.gogn.sidasta_villa;
      let lok = null;
      if (n && Date.parse(n.skrifad_at) >= fra) lok = { villa: null };
      else if (v && Date.parse(v.kl) >= fra) lok = { villa: v.texti };
      else if (sk.virkt > KONNUN_MAX_MS) lok = { villa: 'skrifin tóku of langan tíma — reyndu aftur síðar' };
      if (lok) { S.skrifar = null; S.skrifVilla = lok.villa; S.skrifVillaFra = lok.villa ? fra : 0; teiknaStodugt(); return; }
      sk.tima = setTimeout(kanna, KONNUN_MS);
    };
    S.skrifar.kanna = kanna;
    S.skrifar.tima = setTimeout(kanna, KONNUN_MS);
  }

  // Aftur í forgrunn: halda könnun strax áfram, eða sækja upp á nýtt ef síðasta sókn brást eða er orðin gömul.
  // Aðeins þar sem glugginn hefur hlaðist (S.at) — þ.e. hjá Agnari.
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (falin() || !S.at) return;
    const sk = S.skrifar;
    if (sk && sk.kanna) { clearTimeout(sk.tima); sk.kanna(); return; }
    if (S.villa || Date.now() - S.at > 60000) load(true);
  });

  const CSS = '<style id="_rg506-css">' +
    '.rg{margin:0 0 14px;padding:0}' +
    '.rg-fyrir,.rg-t,.rg-a,.rg-s,.rg-stada,.rg-fr,.rg-tomt,.rg-ft,.rg-hop h4{overflow-wrap:anywhere}' +
    '.rg-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:11px 14px;border-bottom:1px solid var(--rule)}' +
    '.rg-h h2{margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase}.rg-mute{color:var(--mute);font-size:12.5px}.rg-h .grow{flex:1 1 auto}' +
    '.rg-fyrir{margin:0;padding:14px 16px 12px;font-family:var(--serif,"Playfair Display",Georgia,serif);font-size:21px;line-height:1.3;font-weight:700;color:var(--ink);border-bottom:1px solid var(--rule2)}' +
    '.rg-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:0}' +
    '.rg-dalkur{padding:12px 16px 14px;min-width:0}.rg-dalkur+.rg-dalkur{border-left:1px solid var(--rule2)}' +
    '.rg-dalkur>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.rg-rad{list-style:none;margin:0;padding:0;counter-reset:rg}.rg-rad>li{counter-increment:rg;display:grid;grid-template-columns:30px minmax(0,1fr);gap:2px 10px;padding:10px 0;border-top:1px dashed var(--rule2)}.rg-rad>li:first-child{border-top:0;padding-top:2px}' +
    '.rg-rad>li::before{content:counter(rg);grid-row:1/span 4;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--ink);border:1px solid var(--edge);background:var(--panel)}' +
    '.rg-t{font-size:14.5px;font-weight:700;color:var(--ink)}.rg-a{font-size:13px;color:var(--ink2);line-height:1.45}.rg-s{font-size:12.5px;color:var(--ink)}.rg-s b{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700;margin-right:6px}' +
    '.rg-hop+.rg-hop{margin-top:12px;padding-top:10px;border-top:1px solid var(--rule2)}.rg-hop h4{margin:0 0 3px;font-size:13px;font-weight:700;color:var(--ink)}.rg-hop h4 span{font-weight:400;color:var(--mute);font-size:12px}' +
    '.rg-stada{margin:0 0 5px;font-size:12.5px;color:var(--ink2);font-style:italic}.rg-fr{margin:0;padding:0 0 0 16px;font-size:13px;color:var(--ink);line-height:1.45}.rg-fr li{margin:3px 0}' +
    '.rg-hm{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}.rg-hm span{font-size:10.5px;line-height:1.6;padding:0 6px;border:1px solid var(--rule2);border-radius:3px;color:var(--mute);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.rg-betri{padding:12px 16px 14px;border-top:1px solid var(--rule2)}.rg-betri>h3{margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.rg-betri .rg-a{margin-top:3px}.rg-betri .rg-a b{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700;margin-right:6px}' +
    '.rg-ft{padding:8px 16px 11px;border-top:1px solid var(--rule2);font-size:11.5px;color:var(--mute)}.rg-ft .err{color:#b3220f}.rg-tomt{padding:16px;color:var(--mute);font-size:13px;min-height:220px}' +
    '.rg-bid{min-height:300px}' +
    '.rg-grid.rg-ein{grid-template-columns:minmax(0,1fr)}' +
    // Markmiðsröndin: smáar flísar (minnisregla: samtölur sem litlar flísar, engar stórar töflur).
    '.rg-mm{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-bottom:1px solid var(--rule2)}' +
    '.rg-mm>div{flex:1 1 150px;min-width:0;padding:6px 10px;border:1px solid var(--rule2);border-radius:4px}' +
    '.rg-mm b{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700}' +
    '.rg-mm span{display:block;font-size:17px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}.rg-mm small{display:block;font-size:11.5px;color:var(--mute);overflow-wrap:anywhere}' +
    '.rg-topp{padding:12px 16px 6px;border-bottom:1px solid var(--rule2)}.rg-topp>h3,.rg-plan>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.rg-topp .rg-rad{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:22px}.rg-topp .rg-rad>li:nth-child(2){border-top:0;padding-top:2px}' +
    '.rg-fl{display:inline-block;margin-right:6px;padding:0 5px;font-size:10px;line-height:1.6;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--edge);border-radius:3px;color:var(--mute);font-weight:700;vertical-align:1px}' +
    '.rg-pl{list-style:none;margin:0;padding:0}.rg-pl>li{padding:7px 0;border-top:1px dashed var(--rule2)}.rg-pl>li:first-child{border-top:0;padding-top:0}' +
    '.rg-pl .rg-t{font-size:13.5px}.rg-pl .rg-t i{font-style:normal;font-weight:400;color:var(--mute);font-size:12px}' +
    '.rg-st{display:inline-block;margin-left:6px;padding:0 6px;font-size:10.5px;line-height:1.6;border-radius:3px;border:1px solid var(--rule2);color:var(--mute);font-weight:700;white-space:nowrap}' +
    '.rg-st.eftir{border-color:#b3220f;color:#b3220f}.rg-st.aaetlun{border-color:#2f7d32;color:#2f7d32}.rg-st.lokid{color:var(--ink)}' +
    '.rg-tillaga{display:inline-block;margin-left:8px;padding:0 6px;font-size:10.5px;letter-spacing:.06em;border:1px dashed var(--edge);border-radius:3px;color:var(--ink);text-transform:none}' +
    '@container t5 (max-width:760px){.rg-h .btn{min-height:44px;min-width:44px}.rg-grid{grid-template-columns:minmax(0,1fr)}.rg-dalkur+.rg-dalkur{border-left:0;border-top:1px solid var(--rule2)}.rg-fyrir{font-size:18px}' +
      '.rg-topp .rg-rad{grid-template-columns:minmax(0,1fr)}.rg-topp .rg-rad>li:nth-child(2){border-top:1px dashed var(--rule2);padding-top:10px}}' +
    '@media (pointer:coarse){.rg-h .btn{min-height:44px;min-width:44px}}' +
    '</style>';

  // Heimild sem merki: póstur → „12.11 · efni"; annað → hvað það er. Merkið er upplýsing, ekki tengill.
  function heimildir(ids, n) {
    const p = (n && n.postar) || {};
    const heiti = { HR: 'Reikningar Heimaleigu', CR: 'Reikningar Center Hotels', G: 'Greitt í vikunni', M: 'Tekjur og markmið', O: 'Ógreitt alls', T1: 'Úttektarplanið' };
    const peningalina = (id) => ((n && n.peningar) || []).find((x) => x.id === id);
    const planAtridi = (id) => ((n && n.aaetlun && n.aaetlun.atridi) || []).find((x) => x.id === id);
    const mrk = (ids || []).slice(0, 4).map((id) => {
      if (p[id]) return '<span title="' + esc((p[id].att === 'frá okkur' ? 'Frá okkur' : 'Frá ' + (p[id].fra || '')) + ' · ' + p[id].dags) + '">' + esc(stuttDags(p[id].dags) + ' · ' + p[id].efni) + '</span>';
      if (heiti[id]) return '<span>' + esc(heiti[id]) + '</span>';
      if (/^F\d+$/.test(id)) return '<span>Forgangsmál</span>';
      if (/^[HC]K\d+$/.test(id)) return '<span>Úr þekkingunni</span>';
      if (/^P\d+$/.test(id)) { const l = peningalina(id); return '<span>' + esc(l ? l.heiti : 'Peningalína') + '</span>'; }
      if (/^K\d+$/.test(id)) return '<span>Sjálfvirkni sem brást</span>';
      if (/^A\d+$/.test(id)) { const a = planAtridi(id); return '<span>' + esc('Planið · ' + (a ? a.titill : id)) + '</span>'; }
      return '';
    }).join('');
    return mrk ? '<div class="rg-hm" aria-label="Heimildir">' + mrk + '</div>' : '';
  }

  function hopurHtml(nafn, h, fjoldi, n) {
    const fr = (h && h.frettir) || [];
    const f = Number(fjoldi);
    const tala = fjoldi == null || !Number.isFinite(f) ? '' : ' <span>· ' + f + ' póst' + (f === 1 ? 'ur' : 'ar') + ' sl. 14 daga</span>';
    return '<div class="rg-hop"><h4>' + esc(nafn) + tala + '</h4>' +
      (h && h.stada ? '<p class="rg-stada">' + esc(h.stada) + '</p>' : '') +
      (fr.length ? '<ul class="rg-fr">' + fr.map((x) => '<li>' + esc(x.texti) + heimildir(x.heimildir, n) + '</li>').join('') + '</ul>' : '') + '</div>';
  }

  function html(nafn) {
    if (nafn !== EIGANDI) return '';
    if (S.fellt == null) { try { S.fellt = !!(window.Vidmot && Vidmot.lesaTaeki && Vidmot.lesaTaeki(FELLT_LYKILL, false)); } catch (_) { S.fellt = false; } }
    if (!S.at || Date.now() - S.at > ENDURLES_MS) load();
    const g = S.gogn, n = g && g.nyjast;
    // Þjónninn sleppir ↻ innan BID_MIN mín. frá síðustu TILRAUN (líka misheppnaðri) — takkinn segir það sama.
    const nyleg = (t) => !!t && (Date.now() - Date.parse(t)) < BID_MIN * 60000;
    const nyskrifad = nyleg(n && n.skrifad_at) || nyleg(g && g.sidasta_villa && g.sidasta_villa.kl);
    const stada = S.skrifar ? 'skrifar… (1–2 mín.)' : n ? dagsTxt(n.skrifad_at) + ' · skrifað kl. ' + klst(n.skrifad_at) : S.loading ? 'sæki…' : '';
    // 15.11.2026 (Agnar: „bara ýtt á staðfesta eða senda"): Afgreiðslan er þar sem ráðin verða að verkum — forunnin, eitt í einu.
    const haus = '<header class="rg-h"><h2>Tony Stark · Ráðgjafinn</h2><span class="rg-mute" role="status">' + esc(stada) + '</span><span class="grow"></span>' +
      '<a class="btn iv sm" href="/afgreidsla.html" title="Forunnin verk: takkinn framkvæmir það sem á honum stendur">Afgreiðsla</a>' +
      '<button type="button" class="btn iv sm" data-t5="rg-skrifa"' + (S.skrifar || nyskrifad ? ' disabled' : '') +
        ' title="' + (nyskrifad ? 'Nýskrifað eða nýreynt — hægt að skrifa aftur eftir nokkrar mínútur' : 'Láta Tony skrifa upp á nýtt úr nýjasta póstinum (1–2 mín.)') + '">↻ Skrifa aftur</button>' +
      '<button type="button" class="btn iv sm tog" data-t5="rg-fella" aria-expanded="' + !S.fellt + '" aria-label="' + (S.fellt ? 'Opna' : 'Fella saman') + ' ráðgjafann">' + (S.fellt ? '▾' : '▴') + '</button></header>';
    if (S.fellt) return CSS + '<section class="panel rg" tabindex="-1" aria-label="Ráðgjafinn Tony Stark">' + haus + '</section>';

    if (!n) {
      const txt = S.villa ? 'Náði ekki í ráðgjafann: ' + S.villa
        : S.loading || !S.at ? 'Sæki ráðgjafann…'
        : 'Tony hefur ekki skrifað enn. Fyrsta yfirlitið kemur kl. 06:45 — eða ýttu á ↻ Skrifa aftur.';
      return CSS + '<section class="panel rg rg-bid" tabindex="-1" aria-label="Ráðgjafinn Tony Stark">' + haus + '<p class="rg-tomt">' + esc(txt) + '</p>' + villuLina(g) + '</section>';
    }

    const rad = (n.rad || []).map((r) => '<li><div class="rg-t">' + (r.flokkur ? '<span class="rg-fl">' + esc(r.flokkur) + '</span>' : '') + esc(r.titill) + '</div><div class="rg-a">' + esc(r.af_hverju) + '</div>' +
      (r.fyrsta_skref ? '<div class="rg-s"><b>Fyrsta skref</b>' + esc(r.fyrsta_skref) + '</div>' : '') + heimildir(r.heimildir, n) + '</li>').join('');
    const b = n.betri_leid;
    const betri = b ? '<section class="rg-betri" aria-label="Betri leið"><h3>Betri leið</h3><div class="rg-t">' + esc(b.titill) + '</div>' +
      (b.nuna ? '<div class="rg-a"><b>Núna</b>' + esc(b.nuna) + '</div>' : '') +
      (b.betra ? '<div class="rg-a"><b>Betra</b>' + esc(b.betra) + '</div>' : '') +
      (b.fyrsta_skref ? '<div class="rg-s"><b>Fyrsta skref</b>' + esc(b.fyrsta_skref) + '</div>' : '') + heimildir(b.heimildir, n) + '</section>' : '';
    const fjoldi = n.fjoldi || {};
    const ft = '<div class="rg-ft">Skrifað af Claude í rödd Tony Stark úr tekjum, peningalínum, sjálfvirkninni, úttektarplaninu, 2 mánaða planinu, ' +
      'póstinum við Heimaleigu og Center Hotels og forgangsmálum' +
      (n.kallad_af === 'agnar' ? ' · skrifað aftur að beiðni' : '') + '. Ráð og tillögur — þú ákveður.' +
      ((n.omaelt && n.omaelt.length) ? '<br><span class="err">Ekki mælt: ' + esc(n.omaelt.map((o) => o.hluti).join(', ')) + '</span>' : '') +
      '</div>' + villuLina(g);
    // Eldri skrif (fyrir ráðninguna) bera hvorki markmið né plan — þá teiknast glugginn eins og áður, bara án þeirra kafla.
    const planid = planHtml(n);
    return CSS + '<section class="panel rg" tabindex="-1" aria-label="Ráðgjafinn Tony Stark">' + haus +
      (n.fyrirsogn ? '<p class="rg-fyrir">' + esc(n.fyrirsogn) + '</p>' : '') + markmidHtml(n.markmid) +
      '<section class="rg-topp" aria-label="Í dag"><h3>Í dag — einbeittu þér að' + ((n.rad || []).length > 3 ? ' · top ' + n.rad.length : '') + '</h3>' +
        (rad ? '<ol class="rg-rad">' + rad + '</ol>' : '<p class="rg-mute">Engin ráð í dag.</p>') + '</section>' +
      '<div class="rg-grid' + (planid ? '' : ' rg-ein') + '">' +
        (planid ? '<section class="rg-dalkur rg-plan" aria-label="2 mánaða planið">' + planid + '</section>' : '') +
        '<section class="rg-dalkur" aria-label="Úr póstinum"><h3>Úr póstinum</h3>' +
          hopurHtml('Heimaleiga', n.heimaleiga, fjoldi.heimaleiga, n) + hopurHtml('Center Hotels', n.center, fjoldi.center, n) + '</section>' +
      '</div>' + betri + ft + '</section>';
  }

  // Milljónir með íslenskri kommu: 18708725 → „18,7 m". null/óþekkt → „ómælt" (þögn er ekki núll).
  const mkr = (v) => (v == null || !Number.isFinite(Number(v)) ? 'ómælt' : (Number(v) / 1e6).toFixed(1).replace('.', ',') + ' m');
  const manTxt = (m) => { const [a, b] = String(m || '').split('-'); return b ? MAN[Number(b) - 1] + ' ' + a : ''; };

  function markmidHtml(m) {
    if (!m) return '';
    const s = m.sidustu3 || {};
    const tim = (s.manudir || []).length ? manTxt(s.manudir[0]).split(' ')[0] + '–' + manTxt(s.manudir[s.manudir.length - 1]) : '';
    return '<div class="rg-mm" role="group" aria-label="Markmiðið" title="' + esc(m.skilgreining || '') + '">' +
      '<div><b>Tekjur á mánuði</b><span>' + esc(mkr(s.a_manudi)) + '</span><small>meðaltal ' + esc(tim) + ' · án VSK</small></div>' +
      '<div><b>Markmið ' + esc(manTxt(m.markmid_fyrir)) + '</b><span>' + esc(mkr(m.markmid_a_manudi)) + '</span><small>' +
        (m.hlutfall_af_markmidi != null ? esc(m.hlutfall_af_markmidi + ' % náð · 2× tekjur') : '2× tekjur · grunnlína ómæld') + '</small></div>' +
      '<div><b>Slökkvitæki · Brunahólf</b><span>' + esc(mkr(s.slokkvitaeki != null ? s.slokkvitaeki / Math.max(1, (s.manudir || []).length) : null)) + ' · ' +
        esc(mkr(s.brunaholf != null ? s.brunaholf / Math.max(1, (s.manudir || []).length) : null)) + '</span><small>á mánuði · Brunahólf bráðabirgða</small></div>' +
      '<div><b>Hagnaður</b><span>' + esc(mkr(m.hagnadur)) + '</span><small>' + esc(m.hagnadur == null ? 'markmið 3× — fyrst þarf að mæla hann' : '') + '</small></div>' +
    '</div>';
  }

  const STADA_KLASI = { 'á eftir': 'eftir', 'á áætlun': 'aaetlun', 'lokið': 'lokid', 'ómælt': '' };
  function planHtml(n) {
    const a = n.aaetlun;
    if (!a || !(a.atridi || []).length) return '';
    const st = {};
    for (const x of n.plan_stada || []) st[x.id] = x;
    const tim = a.timabil ? stuttDags(a.timabil.fra) + '–' + stuttDags(a.timabil.til) : '';
    const li = a.atridi.map((x) => {
      const s = st[x.id];
      return '<li><div class="rg-t">' + esc(x.titill) + (x.eigandi ? ' <i>· ' + esc(x.eigandi) + '</i>' : '') +
        (s ? '<span class="rg-st ' + (STADA_KLASI[s.stada] || '') + '">' + esc(s.stada) + '</span>' : '') + '</div>' +
        (s && s.texti ? '<div class="rg-a">' + esc(s.texti) + '</div>' : '') + '</li>';
    }).join('');
    return '<h3>2 mánaða planið' + (tim ? ' · ' + esc(tim) : '') +
      (a.samthykkt ? '' : '<span class="rg-tillaga" title="Tony lagði planið til — segðu já í spjallinu og það er samþykkt">Tillaga — bíður samþykkis</span>') + '</h3>' +
      '<ol class="rg-pl">' + li + '</ol>';
  }

  function villuLina(g) {
    const v = S.skrifVilla || (g && g.sidasta_villa && (!g.nyjast || Date.parse(g.sidasta_villa.kl) > Date.parse(g.nyjast.skrifad_at)) ? g.sidasta_villa.texti : null);
    return v ? '<div class="rg-ft"><span class="err">Síðustu skrif tókust ekki: ' + esc(v) + '</span></div>' : '';
  }

  // Smellir sem 368 sendir hingað (data-t5="rg-*"). Skilar true ef smellurinn var okkar.
  // 368 skiptir öllum hnútum út við teikningu og endurheimtir aðeins fókus á [data-k]-reitum — án þessa fer fókusinn á BODY
  // eftir Enter á takka (kerfisrýni 15.11.2026). ↻ verður óvirkur meðan skrifað er, þá fær glugginn sjálfur fókusinn.
  function fokusAftur(t5) {
    try {
      const v = hysill(), rot = v && v.shadowRoot; if (!rot) return;
      const b = rot.querySelector('[data-t5="' + t5 + '"]:not([disabled])') || rot.querySelector('section.rg');
      if (b) b.focus({ preventScroll: true });
    } catch (_) {}
  }
  function smellur(el) {
    const a = el && el.dataset && el.dataset.t5;
    if (!a || a.indexOf('rg-') !== 0) return false;
    if (a === 'rg-skrifa') { skrifaAftur(); fokusAftur('rg-skrifa'); return true; }
    if (a === 'rg-fella') { S.fellt = !S.fellt; try { if (window.Vidmot && Vidmot.setjaTaeki) Vidmot.setjaTaeki(FELLT_LYKILL, S.fellt); } catch (_) {} notify(); fokusAftur('rg-fella'); return true; }
    return false;
  }

  window.Radgjafinn = { html, load, smellur, S, EIGANDI, version: '2026-11-16a' };
})();
