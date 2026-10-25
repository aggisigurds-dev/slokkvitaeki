/* === 468 — BYGGINGARUPPLÝSINGAR Á FYRIRTÆKJASÍÐUNNI (14.10.2026) ==============================================
 *
 * Agnar 14.10.2026 02:43, eftir hópgreininguna (tools/greina-hop.cjs): „Já máttu fylla inn og bæta við þar
 * upplýsingum" — það sem Greining fasteignar (451) les úr skjalasöfnum sveitarfélaganna á að sjást á sjálfri
 * fyrirtækjasíðunni, ekki aðeins á #greining/<heimilisfang>.
 *
 * HVAÐ ÞETTA SÝNIR. Eitt stálspjald (442 .ssp) „Byggingarupplýsingar" undir Kerfi-spjaldinu (450): brúttó, birt
 * flatarmál, rúmmál, hæðir (með m² á hæð), eignir, byggingarár, stigagangar — hvert með vissu-ljósi úr summuprófun
 * skráningartöflunnar — og brunavarnirnar úr byggingarlýsingunni (brunaviðvörunarkerfi, vatnsúðakerfi, brunahólfun,
 * flóttaleiðir, slökkvitæki, slöngur, neyðarlýsing …) með fyrstu setningunni orðrétt. Skjölin í safninu talin
 * (lesin / ólesin) og staða OCR-beiðnar á skrifstofutölvunni ef hún bíður eða er í vinnslu.
 *
 * HVAÐAN. Skyndiminnisröðin sem 451 og greina-hop.cjs skrifa í fasteign_greining (tegund 'eign', gogn.adr =
 * heimilisfang staðarins). Spjaldið LES AÐEINS — engin sókn í skjalasöfnin við opnun prófílsins (HT-3.10: prófíllinn
 * á að vera hraður). Tveir takkar: „Greining" opnar 451 fyrir heimilisfangið; „Uppfæra" sækir bygging-uppl og
 * endurskrifar skyndiminnisröðina (sama snið og 451 vistaSkyndi) — notandaaðgerð, ekki sjálfvirk.
 *
 * REGLA AGNARS (451): sjálfsótt gögn eru merkt „sjálfsótt" og skrifast ALDREI í fyrirtaeki eða reiti hans. Þetta
 * spjald skrifar aðeins fasteign_greining (tegund 'eign') og aðeins þegar ýtt er á Uppfæra.
 *
 * STÖÐUGT VIÐMÓT: beinagrind með frátekinni hæð í sama tifi og borðinn (462 SKREF '468'); hnúturinn er einn og
 * aldrei endurbyggður — búkurinn er settur þegar strengurinn breytist; félag breytist → sami hnútur, ný gildi.
 * Staðsetning: beint á eftir #_kt450 (Kerfi · þjónusta), annars á eftir Samskiptum / borðanum — aðeins fært þegar rangt.
 */
(() => {
  'use strict';
  if (window.ByggingSpjald) return;
  const ID = '_bs468';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const BYGG = '/.netlify/functions/bygging-uppl';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (window.DB && DB.sb) || null;
  const tala = (v, d) => v == null || isNaN(+v) ? '—' : (+v).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d || 0 });
  const dags = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const hreinsa = a => String(a || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const gata = a => hreinsa(a).split(',')[0].trim();
  const VISSA = { 'há': 'graent', 'hátt': 'graent', 'miðlungs': 'gull', 'lágt': 'rautt' };
  const EFNI = [['brunavidvorunarkerfi', 'Brunaviðvörunarkerfi'], ['vatnsudakerfi', 'Vatnsúðakerfi'], ['brunaholfun', 'Brunahólfun'], ['flottaleidir', 'Flóttaleiðir'], ['reyklosun', 'Reyklosun'],
    ['handslokkvitaeki', 'Slökkvitæki'], ['slokkvitaeki', 'Slökkvitæki'], ['brunaslongur', 'Brunaslöngur'], ['neydarlysing', 'Neyðarlýsing'], ['stigahus', 'Stigahús'], ['lyfta', 'Lyfta'], ['brunahonnun', 'Brunahönnun'], ['thjonusta', 'Þjónusta']];

  const css = [
    '#' + ID + '{min-height:132px}',
    '#' + ID + ' .ssp-buk{font-family:' + SANS + '}',
    '#' + ID + ' .bs-reitir{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}',
    '#' + ID + ' .ssp-lina{grid-template-columns:104px minmax(0,1fr)}',
    '#' + ID + ' .bs-led{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:middle;background:#8a929e;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
    '#' + ID + ' .bs-led.graent{background:#2fbf6b}#' + ID + ' .bs-led.gull{background:#d9b762}#' + ID + ' .bs-led.rautt{background:#e0453c}',
    '#' + ID + ' .bs-haedir{display:flex;flex-wrap:wrap;gap:4px 12px;font:500 11.5px ' + MONO + ';color:#3a4250;margin-top:6px}',
    '#' + ID + ' .bs-haedir b{color:#141822}',
    '#' + ID + ' .bs-bv{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px;margin-top:4px}',
    '#' + ID + ' .bs-bv-rod{background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:7px 10px;min-width:0}',
    '#' + ID + ' .bs-bv-rod b{display:block;font:700 12px ' + SANS + ';color:#141822}',
    '#' + ID + ' .bs-bv-rod small{font:500 10.5px ' + MONO + ';color:#6b7483;margin-left:6px}',
    '#' + ID + ' .bs-bv-rod q{display:block;quotes:"„" "“";font:400 12px/1.4 ' + SANS + ';color:#3a4250;margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '#' + ID + ' .bs-bv-rod q.neit{color:#845400}',
    '#' + ID + ' .bs-uppruni{font:500 11px ' + MONO + ';color:#6b7483;margin-top:8px;line-height:1.5}',
    '#' + ID + ' .bs-uppruni a{color:#3a4250}',
    '#' + ID + ' .bs-sjalf{display:inline-block;margin-left:8px;padding:0 6px;border-radius:3px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#845400;font:700 10px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;vertical-align:middle}',
    '#' + ID + ' .bs-tomt{font:500 12.5px ' + SANS + ';color:#3a4250;padding:4px 2px;line-height:1.5}',
    '#' + ID + ' .bs-villa{font:500 12px ' + SANS + ';color:#b42318;padding:4px 2px}'
  ].join('\n');
  const st = document.createElement('style'); st.id = ID + '-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // ---------------------------------------------------------------- gögn
  const felog = new Map();      // fid → { nafn, heimilisfang }
  const minni = new Map();      // adr → { rod, beidni } | { villa }
  const bid = new Map();
  async function felag(fid) {
    if (felog.has(fid)) return felog.get(fid);
    const SB = sb(); if (!SB) return null;
    const r = await SB.from('fyrirtaeki').select('id,nafn,heimilisfang').eq('id', fid).maybeSingle();
    const f = r && !r.error && r.data ? r.data : null; if (f) felog.set(fid, f); return f;
  }
  async function saekja(adr, ferskt) {
    if (!ferskt && minni.has(adr)) return minni.get(adr);
    if (bid.has(adr)) return bid.get(adr);
    const SB = sb(); if (!SB) return null;
    const p = (async () => {
      try {
        let r = await SB.from('fasteign_greining').select('lykill,landnr,heimilisfang,gogn,updated_at').eq('tegund', 'eign').eq('gogn->>adr', adr).order('updated_at', { ascending: false }).limit(1);
        if (r.error) throw new Error(r.error.message);
        let rod = r.data && r.data[0];
        if (!rod) { r = await SB.from('fasteign_greining').select('lykill,landnr,heimilisfang,gogn,updated_at').eq('tegund', 'eign').eq('heimilisfang', gata(adr)).order('updated_at', { ascending: false }).limit(1); if (!r.error) rod = r.data && r.data[0]; }
        let beidni = null;
        if (rod && rod.landnr) { const q = await SB.from('automation_triggers').select('id,status,result,requested_at,finished_at').eq('workflow', 'bygging-ocr').eq('gogn->>landnr', String(rod.landnr)).order('id', { ascending: false }).limit(1); if (!q.error && q.data && q.data[0]) beidni = q.data[0]; }
        const u = { rod: rod || null, beidni }; minni.set(adr, u); return u;
      } catch (e) { return { villa: String(e && e.message || e) }; } finally { bid.delete(adr); }
    })();
    bid.set(adr, p); return p;
  }
  // Uppfæra: sama og 451 vistaSkyndi — bygging-uppl → skyndiminnisröð (teikn-samantekt haldið)
  async function uppfaera(adr) {
    const SB = sb(); if (!SB) throw new Error('engin tenging');
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 45000);
    let j; try { j = await (await fetch(BYGG + '?heimilisfang=' + encodeURIComponent(adr), { signal: ctl.signal })).json(); } finally { clearTimeout(t); }
    if (!j || (j.error && !j.eign)) throw new Error((j && j.error) || 'ekkert svar');
    const e = j.eign || {};
    if (j.oviss || e.oviss || !e.landnr) throw new Error('óvíst staðfang — veldu lóð í Greiningu fasteignar');
    const lyk = 'eign:' + e.landnr + (e.svf && e.heitinr ? ':' + e.heitinr : '');
    const f = await SB.from('fasteign_greining').select('gogn').eq('lykill', lyk).maybeSingle();
    const teikn = f && f.data && f.data.gogn && f.data.gogn.teikn ? f.data.gogn.teikn : null;
    const gogn = { bygg: j, teikn, adr, saott: new Date().toISOString(), utgafa: 1 };
    const r = await SB.from('fasteign_greining').upsert({ lykill: lyk, tegund: 'eign', landnr: e.landnr, heitinr: e.svf ? e.heitinr : null, heimilisfang: e.label || adr, gogn, uppruni: 'bygging-spjald' }, { onConflict: 'lykill' });
    if (r.error) throw new Error(r.error.message);
    minni.delete(adr);
  }

  // ---------------------------------------------------------------- spjaldið
  function skel() {
    const el = document.createElement('section'); el.className = 'ssp'; el.id = ID; el.setAttribute('aria-label', 'Byggingarupplýsingar');
    el.innerHTML = '<header class="ssp-haus"><span class="ssp-titill">Byggingarupplýsingar</span><span class="ssp-undir" data-bs="undir"></span>' +
      '<span class="ssp-hlid"><span class="ssp-plata" data-bs="skjol" hidden></span><span class="ssp-plata" data-bs="ocr" hidden></span>' +
      '<button type="button" class="ssp-btn" data-bs="greining" title="Opna Greiningu fasteignar fyrir heimilisfangið">Greining</button>' +
      '<button type="button" class="ssp-btn malm" data-bs="uppfaera" title="Sækja nýjustu tölur úr skjalasafninu og geyma á þjóni">Uppfæra</button></span></header>' +
      '<div class="ssp-buk" data-bs="buk"><div class="bs-tomt">Sæki…</div></div>';
    el.addEventListener('click', async ev => {
      const b = ev.target.closest('button[data-bs]'); if (!b) return;
      const adr = el.dataset.adr; if (!adr) return;
      if (b.dataset.bs === 'greining') { location.hash = '#greining/' + encodeURIComponent(adr); return; }
      if (b.dataset.bs === 'uppfaera') {
        b.disabled = true; const t0 = b.textContent; b.textContent = 'Sæki…';
        try { await uppfaera(adr); delete el.dataset.fyllt; schedule(); } catch (e) { const buk = el.querySelector('[data-bs="buk"]'); buk.insertAdjacentHTML('afterbegin', '<div class="bs-villa">Uppfærsla brást: ' + esc(e.message || e) + '</div>'); }
        finally { b.disabled = false; b.textContent = t0; }
      }
    });
    return el;
  }
  const setT = (el, sel, v) => { const n = el.querySelector(sel); if (n && n.textContent !== String(v)) n.textContent = String(v); };
  const setP = (el, sel, v, led) => { const n = el.querySelector(sel); if (!n) return; n.hidden = !v; if (v) { const html = (led ? '<i class="ssp-led ' + led + '"></i>' : '') + esc(v); if (n.dataset.html !== html) { n.dataset.html = html; n.innerHTML = html; } } };
  const lina = (m, v, vissa, auka) => '<div class="ssp-lina"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi">' + (vissa ? '<i class="bs-led ' + (VISSA[vissa] || '') + '" title="Vissa: ' + esc(vissa) + '"></i>' : '') + v + (auka || '') + '</span></div>';
  const hlekkur = (slod, txt) => slod ? '<a href="' + esc(String(slod).replace(/\.info$/i, '')) + '" target="_blank" rel="noopener">' + esc(txt) + '</a>' : esc(txt);

  function bukHtml(u, adr) {
    if (!u) return '<div class="bs-tomt">Sæki…</div>';
    if (u.villa) return '<div class="bs-villa">Engin tenging: ' + esc(u.villa) + '</div>';
    if (!u.rod) return '<div class="bs-tomt">Engin greining til fyrir „' + esc(adr) + '“ enn. <b>Greining</b> opnar Greiningu fasteignar (sækir skjölin úr safni sveitarfélagsins og geymir), <b>Uppfæra</b> sækir beint hingað.</div>';
    const b = (u.rod.gogn && u.rod.gogn.bygg) || {}, e = b.eign || {}, o = b.oryggi || {};
    const heim = b.heimildir || [], lesin = heim.filter(h => h.lesin).length;
    const linur = [];
    if (b.m2 != null || b.haedir || b.byggingarar || b.eignir != null) {
      linur.push(lina('Brúttó', tala(b.m2, 1) + ' m²', o.m2));
      linur.push(lina('Birt flatarmál', b.m2_birt != null ? tala(b.m2_birt, 1) + ' m²' : '—', b.m2_birt != null ? o.m2 : null));
      linur.push(lina('Rúmmál', b.rummal_m3 != null ? tala(b.rummal_m3, 1) + ' m³' : '—', b.rummal_m3 != null ? (o.rummal || o.m2) : null));
      const h = b.haedir;
      linur.push(lina('Hæðir', h ? [h.kjallari ? 'kjallari' : '', h.ofanjardar ? h.ofanjardar + (h.ofanjardar === 1 ? ' hæð' : ' hæðir') + ' ofanjarðar' : '', h.ris ? 'ris' : ''].filter(Boolean).join(' + ') || '—' : '—', h ? o.haedir : null));
      linur.push(lina('Eignir', b.eignir != null ? tala(b.eignir) : '—', b.eignir != null ? o.eignir : null));
      linur.push(lina('Byggingarár', b.byggingarar ? esc(b.byggingarar) : '—', b.byggingarar ? o.byggingarar : null, b.byggingarar ? ' <span class="ssp-daufur">(úr byggingarlýsingu)</span>' : ''));
      if (b.stigagangar) linur.push(lina('Stigagangar', tala(b.stigagangar), o.stigagangar));
    }
    const haedir = b.haedir && Array.isArray(b.haedir.listi) && b.haedir.listi.length ? '<div class="bs-haedir">' + b.haedir.listi.map(x => '<span><b>' + esc(x.heiti || x.kodi) + '</b> ' + tala(x.brutto_m2, 1) + ' m²</span>').join('') + '</div>' : '';
    const stt = b.skraningartafla;
    const uppr = stt ? '<div class="bs-uppruni">Skráningartafla ' + hlekkur(stt.slod, dags(stt.dags) || 'skjal') + (stt.matshluti ? ' · matshluti ' + esc(stt.matshluti) : '') + (stt.summuprof ? ' · summupróf ' + esc(stt.summuprof) : '') + (stt.a_bladi ? ' · á blaðinu: „' + esc(stt.a_bladi) + '“' : '') + '<span class="bs-sjalf" title="Sótt úr skjalasafni sveitarfélagsins — ekki okkar skráning, skrifast aldrei í reiti fyrirtækisins">sjálfsótt</span></div>' : '';
    // brunavarnir úr byggingarlýsingu
    const bv = b.brunavarnir && typeof b.brunavarnir === 'object' ? b.brunavarnir : null;
    let bruna = '';
    if (bv && bv.efni) {
      const efni = bv.efni, sed = new Set();
      const rodir = EFNI.filter(([k]) => efni[k] && (efni[k].fjoldi || (efni[k].daemi || []).length) && !sed.has(efni[k]) && sed.add(efni[k])).map(([k, h]) => {
        const x = efni[k], d = (x.daemi || [])[0];
        return '<div class="bs-bv-rod"><b>' + esc(h) + '<small>' + (x.fjoldi || (x.daemi || []).length) + '× nefnt</small></b>' + (d ? '<q class="' + (d.neitun ? 'neit' : '') + '" title="' + esc(d.setning) + '">' + esc(d.setning) + '</q>' : '') + '</div>';
      });
      if (rodir.length) bruna = '<div class="ssp-skilti">Brunavarnir úr byggingarlýsingu ' + esc(dags(bv.dags)) + '</div><div class="bs-bv">' + rodir.join('') + '</div>' +
        '<div class="bs-uppruni">Orðrétt úr byggingarlýsingu ' + hlekkur(bv.slod, dags(bv.dags) || 'skjal') + ' · ' + (bv.heimild === 'textalag' ? 'textalag PDF (nákvæmt)' : 'OCR af skannaðri mynd — getur verið rangt lesið') + '<span class="bs-sjalf">sjálfsótt</span></div>';
    }
    // tómt — segir satt um hvar lesturinn stendur: beiðni bíður / í vinnslu / lauk eftir að röðin var sótt (→ Uppfæra) / brást / ekki pantaður
    const bd = u.beidni, saottT = u.rod.gogn && u.rod.gogn.saott ? Date.parse(u.rod.gogn.saott) : 0;
    let ocrTxt = '. Lestur er pantaður með „Greining“.';
    if (bd && /bida|pending|running/.test(bd.status)) ocrTxt = ' — OCR-beiðni ' + (bd.status === 'running' ? 'í vinnslu' : 'bíður') + ' á skrifstofutölvunni; ýttu á Uppfæra þegar henni lýkur.';
    else if (bd && bd.status === 'done' && bd.finished_at && Date.parse(bd.finished_at) > saottT) ocrTxt = ' — OCR-lestri lauk ' + dags(bd.finished_at) + ', eftir að þessi röð var sótt: ýttu á <b>Uppfæra</b>.';
    else if (bd && bd.status === 'done') ocrTxt = ' — OCR-lestur ' + dags(bd.finished_at || bd.requested_at) + ' fann enga töflu sem stemmir; opnaðu Greiningu til að sjá skjölin.';
    else if (bd && bd.status === 'error') ocrTxt = ' — OCR-lestur brást ' + dags(bd.finished_at || bd.requested_at) + '; pantaðu aftur í Greiningu.';
    const tomt = !linur.length && !bruna ? '<div class="bs-tomt">' + (heim.length ? 'Engar tölur lesnar enn úr ' + heim.length + (heim.length === 1 ? ' skjali' : ' skjölum') + ' hússins' + ocrTxt : 'Engin skráningartafla eða byggingarlýsing fannst í skjalasafni sveitarfélagsins fyrir þetta heimilisfang.') + '</div>' : '';
    const saott = u.rod.gogn && u.rod.gogn.saott ? '<div class="bs-uppruni">Sótt ' + esc(dags(u.rod.gogn.saott)) + (e.safn ? ' úr ' + esc(e.safn) : '') + ' · ' + heim.length + (heim.length === 1 ? ' skjal' : ' skjöl') + ' í safninu, ' + lesin + ' lesin · skrifast aldrei í reiti fyrirtækisins</div>' : '';
    return (linur.length ? '<div class="bs-reitir">' + linur.join('') + '</div>' + haedir + uppr : '') + bruna + tomt + saott;
  }
  function fylla(el, fid, f, u) {
    el.dataset.fid = String(fid);
    const adr = f ? hreinsa(f.heimilisfang) : ''; el.dataset.adr = adr;
    if (!f) { setT(el, '[data-bs="undir"]', ''); return; }
    const rod = u && u.rod, b = rod && rod.gogn && rod.gogn.bygg || {}, e = b.eign || {};
    setT(el, '[data-bs="undir"]', rod ? (e.label || rod.heimilisfang || adr) + (rod.landnr ? ' · L' + rod.landnr : '') + (e.safn ? ' · ' + e.safn : '') : adr);
    const heim = b.heimildir || [], lesin = heim.filter(h => h.lesin).length;
    setP(el, '[data-bs="skjol"]', rod ? (heim.length ? lesin + ' af ' + heim.length + ' skjölum lesin' : 'engin skjöl') : '', rod && heim.length ? (lesin === heim.length ? 'graent' : lesin ? 'gull' : '') : '');
    const bd = u && u.beidni;
    setP(el, '[data-bs="ocr"]', bd && /bida|pending|running/.test(bd.status) ? 'OCR ' + (bd.status === 'running' ? 'í vinnslu' : 'bíður') : '', bd && bd.status === 'running' ? 'gull' : '');
    const html = bukHtml(u, adr); const buk = el.querySelector('[data-bs="buk"]');
    if (buk.dataset.html !== html) { buk.dataset.html = html; buk.innerHTML = html; }
  }

  // ---------------------------------------------------------------- uppröðun
  function fidNu(main) {
    const el = main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section):not(._cpr-section):not(._dpb-company)');
    if (el) { const v = el.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    return +(window.Companies && Companies.currentId) || 0;
  }
  let inni = false;
  function tick() {
    if (inni || document.hidden) return; inni = true;
    try {
      const main = document.getElementById('companies-main'); if (!main) return;
      const banner = main.querySelector(':scope > .co-banner');
      let el = document.getElementById(ID);
      if (!banner) { if (el) el.hidden = true; return; }
      const fid = fidNu(main); if (!fid) return;
      if (fid < 0) { if (el) el.hidden = true; return; }                  // sýndarfyrirtæki 451 — það á sín spjöld
      if (!el) el = skel();
      if (el.hidden) el.hidden = false;
      const kt = main.querySelector(':scope > #_kt450'), sam = main.querySelector(':scope > ._samskipti-host');
      const teikn = main.querySelector(':scope > #co-fp-section.t485');   // 485: Teikning + Búnaðargreining í einum glugga rétt undir Samskiptum — akkeri keðjunnar (annars togast þau á um sama stað)
      const akkeri = kt || teikn || sam || banner;
      if (el.previousElementSibling !== akkeri || el.parentNode !== main) akkeri.after(el);
      if (el.dataset.fid === String(fid) && el.dataset.fyllt) return;
      const f = felog.get(fid);
      if (!f) { fylla(el, fid, null, null); felag(fid).then(() => schedule()); return; }
      const adr = hreinsa(f.heimilisfang);
      const u = adr ? minni.get(adr) : { rod: null };
      fylla(el, fid, f, u || null);
      if (u) el.dataset.fyllt = '1'; else { delete el.dataset.fyllt; saekja(adr).then(() => schedule()); }
    } catch (e) { console.error('[468]', e); } finally { inni = false; }
  }
  function schedule() { if (schedule.q) return; schedule.q = true; requestAnimationFrame(() => { schedule.q = false; tick(); }); }
  (function watch() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(ms => { if (document.hidden) return; for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('#' + ID)) continue; schedule(); return; } }).observe(main, { childList: true, subtree: true });
    tick();
  })();
  setInterval(() => { if (!document.hidden) tick(); }, 1500);
  window.ByggingSpjald = { tick, gleyma: adr => { minni.delete(hreinsa(adr)); const el = document.getElementById(ID); if (el) delete el.dataset.fyllt; schedule(); } };
})();
