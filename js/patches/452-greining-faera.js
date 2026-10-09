/* === GREINING FASTEIGNAR → PRÓFÍLLINN (452) ================================================================
 *
 * Agnar 09.10.2026: „Já snilld að geta fært upplýsingar inn í company profile ef fyrirtækin eru í þjónustu. Jafnvel
 * stofna fyrirtæki þaðan hvort það sé bara án þjónustu. Ársskoðun slökkvitækja. Brunakerfisskoðun. Slökkvikerfi
 * skoðun" — og: „Kannski líka setja lítinn hnapp í fyrirtækjaprófílinn. Greining. Sem þá sækir öll gögnin. Og maður
 * getur valið bæta upplýsingum á síðu".
 *
 * EINN íhlutur, ein skrifleið:
 *   · GreiningFaera.opna(coId, g)      — „Færa í prófíl" úr Greiningu fasteignar (451, viðskiptavinur á staðnum)
 *   · GreiningFaera.opnaProfil(coId)   — „Greining" í Óskráð-línu prófílsins (363/411): sækir gögnin (Greining451.
 *                                         gognFyrirProfil, sama sókn og skyndiminni) og sýnir þau INNI á prófílnum
 *   · GreiningFaera.stofna(g)          — „Stofna sem viðskiptavin" (451, ekki viðskiptavinur á staðnum)
 *
 * REGLUR (prófaðar í tools/greining-vafri.cjs, varðar í tools/audit-greining.cjs):
 *   1. Skrifar AÐEINS í TÓMA reiti. Reitur sem er fylltur er ALDREI yfirskrifaður — báðum gildum er stillt upp og
 *      notandinn breytir reitnum sjálfur ef sjálfsótta gildið er rétt. Reiturinn er lesinn aftur rétt fyrir skrif.
 *   2. Sama vistunarleið og prófíllinn: BannerUpplysingar.vistaReit (363 — biðröð per reit, app_settings_merge) og
 *      Flokkun.leidrettaTegund (449a) fyrir tegund rekstrar (aðeins ef ekkert handval er til). Teikningar fara um
 *      „Setja í Teikningu" (451 → Teikning + Finna allt húsið; vistast aðeins með Vista þar).
 *   3. Merkt 🏛 með uppruna (skjal + dags) — banner_upplysingar_uppruni (363 sýnir merkið á meðan gildið stendur).
 *   4. Ein staðfesting: listinn yfir það sem breytist, svo „Staðfesta".
 *   5. Stofnun fer um „Nýtt fyrirtæki"-glugga appsins (Companies.openNew + Companies.submitNew — features.js/
 *      fixcompanysave.js + 17 villuprófun). Þjónusta um stjórntæki hvers kerfis: ársskoðun = „Setja í þjónustu"
 *      á prófílnum (280), brunakerfi = „+ Bæta við fyrirtæki" (147, saveOne), slökkvikerfi = „＋ Nýtt kerfi" (385).
 *      Engin innsetning framhjá þeim.
 *   6. Aldrei á sýndarfyrirtækið (-987654321).
 * ======================================================================================================== */
(() => {
  if (window.GreiningFaera) return;
  const SYND = (window.Sydarvordur && Sydarvordur.ID) || -987654321;
  const DLG = 'gr-faera';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const RAUTT = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tala = (n) => (n == null || n === '' || !isFinite(+n) ? '—' : Math.round(+n).toLocaleString('de-DE'));
  const dags = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s ? String(s) : ''); };
  const segja = (t) => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const bida = (ms) => new Promise((r) => setTimeout(r, ms));
  const coAf = (id) => ((window.Companies && Companies.list) || []).find((c) => +c.id === +id) || null;
  const lagleg = (coId) => +coId > 0 && +coId !== SYND && +coId !== Math.abs(SYND);
  const bu = () => window.BannerUpplysingar;

  /* ── ATRIÐIN: sjálfsótt gildi → reitir prófílsins (363 REITIR) ──────────────────────────────────────────── */
  function atridiFra(g) {
    const b = (g && g.bygg) || {};
    const o = b.oryggi || {};
    const st = b.skraningartafla || null;
    const tafla = 'Skráningartafla' + (st && st.dags ? ' ' + dags(st.dags) : '') + (st && st.matshluti ? ' · mhl. ' + st.matshluti : '');
    const ut = [];
    const h = b.haedir || {};
    const baeta = (x) => ut.push(Object.assign({ vissa: null }, x));
    if (+h.ofanjardar > 0) baeta({ reitur: 'haedir', merki: 'Hæðir ofan jarðar', gildi: String(+h.ofanjardar), birt: h.ofanjardar + (+h.ofanjardar === 1 ? ' hæð' : ' hæðir'), heimild: tafla, vissa: o.haedir });
    if (h.kjallari === true) baeta({ reitur: 'kjallari', merki: 'Kjallari', gildi: 'yes', birt: 'já', heimild: tafla, vissa: o.haedir });
    if (+b.m2 > 0) baeta({ reitur: 'm2', merki: 'Stærð (m² brúttó)', gildi: String(Math.round(+b.m2)), birt: tala(b.m2) + ' m²', heimild: tafla, vissa: o.m2 });
    if (+b.eignir > 0) baeta({ reitur: 'eignir', merki: 'Eignir í húsinu', gildi: String(+b.eignir), birt: b.eignir + ' eignir', heimild: tafla, vissa: o.eignir });
    if (+b.stigagangar > 0) baeta({ reitur: 'stiga', merki: 'Stigagangar', gildi: String(+b.stigagangar), birt: b.stigagangar + ' stigag.', heimild: tafla, vissa: o.stigagangar });
    // byggingarár: aðeins úr lesinni byggingarlýsingu (Kaupskrá HMS er ekki notuð)
    if (+b.byggingarar > 1800) baeta({ reitur: 'byggar', merki: 'Byggingarár', gildi: String(+b.byggingarar), birt: String(+b.byggingarar), heimild: 'Byggingarlýsing', vissa: o.byggingarar });
    if (g && g.tegund && g.tegund.tegund && g.tegund.tegund !== 'annad') baeta({ teg: true, reitur: 'tegund', merki: 'Tegund rekstrar', gildi: g.tegund.tegund, birt: g.tegund.heiti || g.tegund.tegund, heimild: g.tegund.rok || 'Greining fasteignar' });
    return ut;
  }
  const tomtNu = (coId, reitur) => !String((bu() && bu().gildi(coId, reitur)) || '').trim();
  const birtGildi = (reitur, v) => (reitur === 'kjallari' ? (v === 'yes' ? 'já' : v) : v);

  // Staða hvers atriðis gagnvart prófílnum: 'tomt' (bætist við) · 'eins' · 'annad' (stangast á — ekkert skrifað)
  async function stodur(coId, atr) {
    let fl = null, flVilla = null;
    if (atr.some((a) => a.teg)) {
      try { fl = window.Flokkun && Flokkun.stadur ? await Flokkun.stadur(coId) : null; } catch (e) { flVilla = (e && e.message) || String(e); }
    }
    return atr.map((a) => {
      if (a.teg) {
        const f = fl && fl.flokkun;
        if (flVilla) return Object.assign({}, a, { stada: 'villa', nuna: '', skyring: 'Flokkunin svaraði ekki: ' + flVilla });
        if (!f) return Object.assign({}, a, { stada: 'enginn', nuna: '', skyring: 'Staðurinn er ekki enn í flokkunartöflunni — tegund vistast þegar flokkunin hefur keyrt.' });
        if (f.tegund_handval) return Object.assign({}, a, { stada: f.tegund_handval === a.gildi ? 'eins' : 'annad', nuna: f.tegund_heiti || f.tegund_handval, skyring: 'handvalið' });
        return Object.assign({}, a, { stada: 'tomt', nuna: f.tegund_heiti ? f.tegund_heiti + ' (sjálfvirkt)' : '', sjalfvirk: f.tegund_sjalfvirk || f.tegund || null });
      }
      const v = String((bu() && bu().gildi(coId, a.reitur)) || '').trim();
      if (!v) return Object.assign({}, a, { stada: 'tomt', nuna: '' });
      return Object.assign({}, a, { stada: v === a.gildi ? 'eins' : 'annad', nuna: birtGildi(a.reitur, v) });
    });
  }

  /* ── SKRIF — eina leiðin: 363 vistaReit / 449a leidrettaTegund, aðeins í tóma reiti ─────────────────────── */
  async function skrifa(coId, valin) {
    if (!lagleg(coId)) throw new Error('Ógilt fyrirtæki — ekkert vistað');
    const B = bu();
    if (!B || !B.vistaReit || !B.vistaUppruna) throw new Error('Banner-upplýsingarnar (363) eru ekki hlaðnar — ekkert vistað');
    const ut = [];
    const t = new Date().toISOString();
    for (const a of valin) {
      if (a.teg) {
        try {
          // handval lesið aftur rétt fyrir skrif — fyllt handval er aldrei yfirskrifað
          const f = await Flokkun.stadur(coId);
          if (!f || !f.flokkun) { ut.push({ a, ok: false, villa: 'ekki í flokkunartöflunni' }); continue; }
          if (f.flokkun.tegund_handval) { ut.push({ a, ok: false, villa: 'handval er þegar til (' + (f.flokkun.tegund_heiti || f.flokkun.tegund_handval) + ') — ekkert yfirskrifað' }); continue; }
          await Flokkun.leidrettaTegund(coId, a.gildi);
          ut.push({ a, ok: true });
        } catch (e) { ut.push({ a, ok: false, villa: (e && e.message) || String(e) }); }
        continue;
      }
      // ALDREI yfirskrift: reiturinn lesinn aftur rétt fyrir skrif (önnur vél / notandinn gæti hafa fyllt hann)
      if (!tomtNu(coId, a.reitur)) { ut.push({ a, ok: false, villa: 'reiturinn er fylltur — ekkert yfirskrifað' }); continue; }
      const ok = await B.vistaReit(coId, a.reitur, a.gildi);
      if (ok) {
        const uok = await B.vistaUppruna(coId, a.reitur, { gildi: a.gildi, heimild: a.heimild || '', af: 'Greining fasteignar', t });
        ut.push({ a, ok: true, merkt: uok });
      } else ut.push({ a, ok: false, villa: 'vistaðist ekki — bíður í vistunarbiðröð' });
    }
    try { if (B.haldaVid) B.haldaVid(); } catch (_) {}
    return ut;
  }

  /* ── GLUGGINN ───────────────────────────────────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_gr452-css')) return;
    const K = ':not(#_g452a):not(#_g452b):not(#_g452c)';
    const R = '#' + DLG + K;
    const st = document.createElement('style');
    st.id = '_gr452-css';
    st.textContent = [
      R + '{position:fixed;inset:0;z-index:100100;background:rgba(8,10,14,.62);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px 16px;overflow:auto;font:400 13px/1.45 ' + SANS + ';color:#141822}',
      R + ' .gr-fgl{width:min(860px,100%);margin:0;container-type:inline-size}',
      R + ' .ssp-buk{max-height:none}',
      R + ' .gr-ftafla{width:100%;border-collapse:separate;border-spacing:0 4px}',
      R + ' .gr-ftafla th{padding:4px 8px;text-align:left;font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b}',
      R + ' .gr-ftafla td{padding:7px 8px;background:#fff;vertical-align:top;box-shadow:inset 0 1px 0 rgba(20,24,34,.08),inset 0 -1px 0 rgba(20,24,34,.08)}',
      R + ' .gr-ftafla td:first-child{border-radius:6px 0 0 6px;box-shadow:inset 1px 1px 0 rgba(20,24,34,.08),inset 0 -1px 0 rgba(20,24,34,.08);width:28px}',
      R + ' .gr-ftafla td:last-child{border-radius:0 6px 6px 0}',
      R + ' .gr-ftafla small{display:block;font:500 10.5px/1.35 ' + MONO + ';color:#6b7483;margin-top:2px}',
      R + ' .gr-ftafla input[type=checkbox]{width:18px;height:18px;margin:1px 0 0;accent-color:#7a1012;cursor:pointer}',
      R + ' .gr-fst{display:inline-block;padding:1px 8px;border-radius:9px;font:700 10.5px/1.6 ' + MONO + ';white-space:nowrap}',
      R + ' .gr-fst.tomt{background:#e6f4ea;color:#14532d}', R + ' .gr-fst.eins{background:#eef1f6;color:#3a4250}',
      R + ' .gr-fst.annad{background:#fdf0d5;color:#7a4b00}', R + ' .gr-fst.villa,' + R + ' .gr-fst.enginn{background:#f4f6f9;color:#6b7483}',
      R + ' .gr-ftakkar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}',
      R + ' .gr-ftakkar .gr-fbil{flex:1}',
      R + ' .gr-frautt{display:inline-flex;align-items:center;height:34px;padding:0 16px;border-radius:8px;border:1px solid rgba(190,32,28,.55);background:' + RAUTT + ';color:#fff;font:700 13px/1 ' + SANS + ';cursor:pointer;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      R + ' .gr-frautt[disabled]{opacity:.4;cursor:default}',
      R + ' .gr-fath{margin:0 0 8px;font:500 12px/1.5 ' + SANS + ';color:#525b6b}',
      R + ' .gr-fvar{margin:8px 0;padding:8px 10px;border-radius:6px;background:#fdf6e3;box-shadow:inset 0 0 0 1px rgba(122,75,0,.25);font:500 12.5px/1.5 ' + SANS + ';color:#4a3000}',
      R + ' .gr-flisti{margin:6px 0 0;padding:0 0 0 18px;font:500 13px/1.6 ' + SANS + '}',
      R + ' .gr-fform{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}',
      R + ' .gr-fform label{display:flex;flex-direction:column;gap:3px;font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b}',
      R + ' .gr-fform input[type=text]{height:36px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.2);background:#fff;font:500 14px ' + SANS + ';color:#141822;box-shadow:inset 0 2px 4px rgba(10,14,22,.08);text-transform:none;letter-spacing:0}',
      R + ' .gr-fform .heil{grid-column:1 / -1}',
      R + ' .gr-fthj{display:flex;flex-wrap:wrap;gap:6px 14px;font:500 13px ' + SANS + ';color:#141822;text-transform:none;letter-spacing:0}',
      R + ' .gr-fthj label{flex-direction:row;align-items:center;gap:6px;font:500 13px ' + SANS + ';letter-spacing:0;text-transform:none;color:#141822;cursor:pointer}',
      R + ' .gr-fnaest{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
      R + ' .gr-fnaest > div{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1)}',
      R + ' .gr-fnaest > div > b{flex:1;font:600 13px ' + SANS + '}',
      R + ' .gr-fhl{color:#7a1012;font-weight:600}',
      R + ' .gr-fnaestu{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      R + ' .gr-fannad{display:flex;gap:8px;align-items:center;margin:0 0 10px}',
      R + ' .gr-fannad input{flex:1;min-width:0;height:32px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.2);background:#fff;font:500 13px ' + SANS + ';color:#141822;box-shadow:inset 0 2px 4px rgba(10,14,22,.08)}',
      // sími: hver röð er spjald — hakið vinstra megin, atriði · sjálfsótt · á prófílnum · staða staflað hægra megin
      '@container (max-width: 560px){' + R + ' .gr-fform{grid-template-columns:minmax(0,1fr)}' + R + ' .gr-ftafla thead{display:none}' + R + ' .gr-ftafla,' + R + ' .gr-ftafla tbody{display:block}' + R + ' .gr-ftafla tr{display:grid;grid-template-columns:34px minmax(0,1fr);margin-bottom:6px;border-radius:6px;overflow:hidden;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1)}' + R + ' .gr-ftafla td{display:block;box-shadow:none!important;border-radius:0!important;padding:4px 10px 4px 0;width:auto!important}' + R + ' .gr-ftafla td:first-child{grid-row:1 / span 4;padding:8px 0 0 8px}' + R + ' .gr-ftafla td:nth-child(2){padding-top:8px}' + R + ' .gr-ftafla td:last-child{padding-bottom:8px}}',
    ].join('\n');
    document.head.appendChild(st);
  }
  let _lok = null;
  function gluggi(titill, undir) {
    css();
    if (_lok) _lok();
    const o = document.createElement('div');
    o.id = DLG; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', titill);
    o.innerHTML = '<div class="ssp gr-fgl"><div class="ssp-haus"><span class="ssp-titill">' + esc(titill) + '</span><span class="ssp-undir">' + esc(undir || '') + '</span>' +
      '<span class="ssp-hlid"><button type="button" class="ssp-btn" data-f="loka" title="Loka (Esc)">Loka</button></span></div><div class="ssp-buk" data-f="buk"></div></div>';
    document.body.appendChild(o);
    const lykill = (e) => { if (e.key === 'Escape' && !document.getElementById('_cfm-dialog')) { e.preventDefault(); loka(); } };
    const loka = () => { o.remove(); document.removeEventListener('keydown', lykill, true); if (_lok === loka) _lok = null; };
    o.addEventListener('click', (e) => { if (e.target === o || (e.target.closest && e.target.closest('[data-f="loka"]'))) loka(); });
    document.addEventListener('keydown', lykill, true);
    _lok = loka;
    return { o, buk: o.querySelector('[data-f="buk"]'), loka };
  }

  /* ── „FÆRA Í PRÓFÍL" ────────────────────────────────────────────────────────────────────────────────────── */
  async function opna(coId, g, opts) {
    opts = opts || {};
    if (!lagleg(coId)) { segja('Ógilt fyrirtæki'); return; }
    const co = coAf(coId);
    const w = gluggi(opts.titill || 'Færa í prófíl', co ? co.nafn + (co.heimilisfang ? ' · ' + co.heimilisfang : '') : '#' + coId);
    w.buk.innerHTML = '<div class="gr-fath">Les reiti prófílsins…</div>';
    const atr = atridiFra(g);
    const rad = await stodur(coId, atr);
    if (!w.o.isConnected) return;
    teiknaVal(w, coId, g, rad, opts);
  }
  function teiknaVal(w, coId, g, rad, opts) {
    const co = coAf(coId);
    const adr = (g && g.adr) || (co && co.heimilisfang) || '';
    const haegt = rad.filter((r) => r.stada === 'tomt');
    const stadaHtml = (r) => r.stada === 'tomt' ? '<span class="gr-fst tomt">tómt — bætist við</span>'
      : r.stada === 'eins' ? '<span class="gr-fst eins">eins — ekkert að gera</span>'
      : r.stada === 'annad' ? '<span class="gr-fst annad">stangast á — ekkert yfirskrifað</span><small>Breyttu reitnum sjálfur á prófílnum ef sjálfsótta gildið er rétt.</small>'
      : '<span class="gr-fst ' + esc(r.stada) + '">' + (r.stada === 'enginn' ? 'ekki hægt' : 'villa') + '</span><small>' + esc(r.skyring || '') + '</small>';
    const sjalfgefid = (r) => r.stada === 'tomt' && r.vissa !== 'lágt' && !(r.teg && r.sjalfvirk && r.sjalfvirk !== 'annad');
    const teiknBord = !!(opts.bordHaedir);
    // Staðfangið fannst ekki (Midtown Hotel, „Vegamótastígur 9": lóðirnar sameinaðar — húsið heitir Vegamótastígur 7 í
    // Staðfangaskrá): næstu húsnúmer við götuna (sömu megin fyrst) + reitur fyrir aðra lóð (heimilisfang eða landnúmer).
    // Valið greinir AÐRA lóð en heimilisfang félagsins — ekkert fer á prófílinn nema notandinn velji „Bæta á síðu".
    const profill = opts.fra === 'profill';
    const ekki = profill && g && !((g.opin && g.opin.eign) || (g.bygg && g.bygg.eign));
    const naest = ekki ? ((window.Greining451 && Greining451.naestu) ? Greining451.naestu(adr, g.opinTillogur) : (g.opinTillogur || [])) : [];
    const leit = profill ? (ekki ? '<div class="gr-fvar" data-f="fannst-ekki"><b>„' + esc(adr) + '“ finnst ekki í Staðfangaskrá HMS.</b> Lóðir eru stundum sameinaðar eða húsið skráð á annað númer — veldu næsta húsnúmer við götuna eða sláðu inn aðra lóð.' +
        (naest.length ? '<div class="gr-fnaestu">' + naest.slice(0, 6).map((t) => '<button type="button" class="ssp-btn" data-f="adr" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' : '') + '</div>' : '') +
      (opts.felagAdr && opts.felagAdr !== adr ? '<div class="gr-fath" data-f="onnur">Greint eftir <b>' + esc(adr) + '</b> — ekki heimilisfangi félagsins (' + esc(opts.felagAdr) + '). Ekkert fer á síðuna nema þú veljir það.</div>' : '') +
      '<form class="gr-fannad" data-f="annad"><input type="text" name="annad" autocomplete="off" placeholder="Önnur lóð: heimilisfang eða landnúmer (t.d. L205361)" aria-label="Önnur lóð: heimilisfang eða landnúmer"><button type="submit" class="ssp-btn">Greina</button></form>' : '';
    w.buk.innerHTML = leit +
      '<div class="gr-fath">Sjálfsótt úr opinberum skrám (skráningartafla, byggingarlýsing, OpenStreetMap). Aðeins <b>tómir</b> reitir fyllast; fylltum reit er aldrei breytt. Hvert gildi ber 🏛 og uppruna á prófílnum.</div>' +
      (rad.length ? '<table data-_pm-status-done="1" class="gr-ftafla"><thead><tr><th></th><th>Atriði</th><th>Sjálfsótt</th><th>Á prófílnum</th><th>Staða</th></tr></thead><tbody>' +
        rad.map((r, i) => '<tr><td>' + (r.stada === 'tomt' ? '<input type="checkbox" data-i="' + i + '"' + (sjalfgefid(r) ? ' checked' : '') + ' aria-label="' + esc(r.merki) + '">' : '') + '</td>' +
          '<td><b>' + esc(r.merki) + '</b></td><td>' + esc(r.birt) + '<small>' + esc(r.heimild || '') + (r.vissa ? ' · vissa ' + esc(r.vissa) : '') + '</small></td>' +
          '<td>' + (r.nuna ? esc(r.nuna) : '<span class="ssp-daufur">tómt</span>') + '</td><td>' + stadaHtml(r) + '</td></tr>').join('') +
        '</tbody></table>'
      : '<div class="gr-fvar">Engin sjálfsótt gögn fundust fyrir ' + esc(adr || 'heimilisfangið') + (g && g.villur && (g.villur.bygg || g.villur.opin) ? ' (' + esc([g.villur.bygg, g.villur.opin].filter(Boolean).join(' · ')) + ')' : '') + '.</div>') +
      (opts.teikning ? '<div class="gr-fnaest"><div><b>Teikningar — ' + esc(opts.teikning) + '</b><button type="button" class="ssp-btn malm" data-f="teikn">Setja í Teikningu</button></div></div>' : '') +
      '<div class="gr-ftakkar">' + (adr ? '<a class="gr-fhl" href="#greining/' + encodeURIComponent(adr) + '" data-f="full">Opna fulla greiningu</a>' : '') +
      '<span class="gr-fbil"></span><button type="button" class="ssp-btn" data-f="loka">Hætta við</button>' +
      '<button type="button" class="gr-frautt" data-f="baeta"' + (haegt.length ? '' : ' disabled') + '>Bæta á síðu</button></div>';
    const uppfaera = () => {
      const n = [...w.buk.querySelectorAll('input[type=checkbox]:checked')].length;
      const b = w.buk.querySelector('[data-f="baeta"]');
      b.disabled = !n; b.textContent = n ? 'Bæta á síðu (' + n + ')' : 'Bæta á síðu';
    };
    w.buk.addEventListener('change', uppfaera);
    uppfaera();
    w.buk.querySelector('[data-f="baeta"]').onclick = () => {
      const valin = [...w.buk.querySelectorAll('input[type=checkbox]:checked')].map((x) => rad[+x.dataset.i]).filter((r) => r && r.stada === 'tomt');
      if (valin.length) teiknaStadfesting(w, coId, g, rad, valin, opts);
    };
    const tk = w.buk.querySelector('[data-f="teikn"]');
    if (tk) tk.onclick = () => { w.loka(); if (opts.setjaITeikningu) opts.setjaITeikningu(coId); };
    const full = w.buk.querySelector('[data-f="full"]');
    if (full) full.onclick = () => w.loka();
    w.buk.querySelectorAll('[data-f="adr"]').forEach((b) => { b.onclick = () => opnaProfil(coId, { adr: b.getAttribute('data-v') }); });
    const fa = w.buk.querySelector('[data-f="annad"]');
    if (fa) fa.onsubmit = (e) => { e.preventDefault(); const v = String(fa.elements.annad.value || '').trim(); if (v) opnaProfil(coId, { adr: v }); };
    void teiknBord;
  }
  // EIN staðfesting: listinn yfir það sem breytist
  function teiknaStadfesting(w, coId, g, rad, valin, opts) {
    const co = coAf(coId);
    w.buk.innerHTML = '<div class="gr-fath">Þetta bætist á <b>' + esc(co ? co.nafn : '#' + coId) + '</b> — aðeins í tóma reiti, merkt 🏛 með uppruna:</div>' +
      '<ul class="gr-flisti">' + valin.map((a) => '<li><b>' + esc(a.merki) + ':</b> ' + esc(a.birt) + ' <span class="ssp-daufur">(' + esc(a.heimild || '') + ')</span>' + (a.teg ? ' <span class="ssp-daufur">— vistast sem handval tegundar</span>' : '') + '</li>').join('') + '</ul>' +
      '<div class="gr-ftakkar"><span class="gr-fbil"></span><button type="button" class="ssp-btn" data-f="aftur">Til baka</button><button type="button" class="gr-frautt" data-f="stadfesta">Staðfesta</button></div>';
    w.buk.querySelector('[data-f="aftur"]').onclick = () => teiknaVal(w, coId, g, rad, opts);
    w.buk.querySelector('[data-f="stadfesta"]').onclick = async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'Vistar…';
      let ut;
      try { ut = await skrifa(coId, valin); } catch (err) { ut = valin.map((a) => ({ a, ok: false, villa: (err && err.message) || String(err) })); }
      if (!w.o.isConnected) return;
      const ok = ut.filter((x) => x.ok).length;
      w.buk.innerHTML = '<div class="gr-fath">' + ok + ' af ' + ut.length + ' vistuð á prófílnum.</div>' +
        '<ul class="gr-flisti">' + ut.map((x) => '<li>' + (x.ok ? '✓ ' : '✗ ') + '<b>' + esc(x.a.merki) + ':</b> ' + esc(x.a.birt) + (x.ok ? '' : ' — <span style="color:#7a1012">' + esc(x.villa || 'villa') + '</span>') + '</li>').join('') + '</ul>' +
        '<div class="gr-ftakkar"><span class="gr-fbil"></span>' + (opts.fra === 'greining' ? '<button type="button" class="ssp-btn malm" data-f="profill">Opna prófíl</button>' : '') +
        '<button type="button" class="ssp-btn" data-f="loka">Loka</button></div>';
      const p = w.buk.querySelector('[data-f="profill"]');
      if (p) p.onclick = () => { w.loka(); location.hash = '#company/' + (+coId); };
      if (opts.eftir) try { opts.eftir(ut); } catch (_) {}
    };
  }

  /* ── „GREINING" Á PRÓFÍLNUM (takkinn í Hús-línu 432) ─────────────────────────────────────────────────────── */
  async function opnaProfil(coId, o) {
    o = o || {};
    if (!lagleg(coId)) return;
    const co = coAf(coId);
    const felagAdr = String((co && co.heimilisfang) || '').trim();
    let adr = String(o.adr || felagAdr).trim();
    const w = gluggi('Greining', co ? co.nafn + (adr ? ' · ' + adr : '') : '#' + coId);
    if (!adr) { w.buk.innerHTML = '<div class="gr-fvar">Ekkert heimilisfang á félaginu — skráðu það á prófílnum fyrst.</div>'; return; }
    if (!window.Greining451 || !Greining451.gognFyrirProfil) { w.buk.innerHTML = '<div class="gr-fvar">Greining fasteignar (451) er ekki hlaðin.</div>'; return; }
    // landnúmer í reitnum → heimilisfang úr Landeignaskrá; finnist það ekki (sameinuð lóð) bjóðast teikningar þess í skjalasafni
    if (/^L?\s?\d{5,7}$/i.test(adr) && Greining451.leysa) {
      w.buk.innerHTML = '<div class="gr-fath">Fletti landnúmerinu upp í Landeignaskrá…</div>';
      const l = await Greining451.leysa(adr);
      if (!w.o.isConnected) return;
      if (!l || !l.adr) {
        const nr = adr.replace(/\D/g, '');
        w.buk.innerHTML = '<div class="gr-fvar" data-f="landnr-ekki">' + esc((l && l.villa) || ('Landnúmerið ' + nr + ' fannst ekki.')) + ' Lóðin gæti hafa verið sameinuð annarri — teikningar hennar geta samt verið í skjalasafninu.</div>' +
          '<div class="gr-ftakkar">' + (window.TeikningaForskodun ? '<button type="button" class="ssp-btn" data-f="ltk">Teikningar L' + esc(nr) + ' í skjalasafni</button>' : '') + '<span class="gr-fbil"></span><button type="button" class="ssp-btn" data-f="aftur">Til baka</button></div>';
        const t = w.buk.querySelector('[data-f="ltk"]'); if (t) t.onclick = () => { w.loka(); TeikningaForskodun.opna(+nr, 'L' + nr, null, { sia: 'grunn' }); };
        w.buk.querySelector('[data-f="aftur"]').onclick = () => opnaProfil(coId, {});
        return;
      }
      adr = l.adr;
      const u = w.o.querySelector('.ssp-undir'); if (u) u.textContent = co ? co.nafn + ' · ' + adr : adr;
    }
    w.buk.innerHTML = '<div class="gr-fath">Sæki skráningartöflu, byggingarlýsingu, Staðfangaskrá og OpenStreetMap fyrir ' + esc(adr) + '…</div>';
    let g, bord = null;
    try {
      [g, bord] = await Promise.all([
        Greining451.gognFyrirProfil(adr, co && co.nafn),
        (async () => { try { const r = await window.DB.sb.from('teikning_bord').select('company_id,haedir').eq('company_id', +coId).maybeSingle(); return r && !r.error ? r.data : null; } catch (_) { return null; } })(),
      ]);
    } catch (e) { if (w.o.isConnected) w.buk.innerHTML = '<div class="gr-fvar">Gögnin fengust ekki: ' + esc((e && e.message) || e) + '</div>'; return; }
    if (!w.o.isConnected) return;
    const haedir = bord && Array.isArray(bord.haedir) ? bord.haedir.length : 0;
    const atr = atridiFra(g);
    const rad = await stodur(coId, atr);
    if (!w.o.isConnected) return;
    teiknaVal(w, coId, g, rad, {
      fra: 'profill', bordHaedir: haedir, felagAdr,
      teikning: haedir ? '' : 'engar hæðir í Teikningu enn',
      setjaITeikningu: (id) => { if (window.Companies && Companies.opnaTeikningu) { Companies.opnaTeikningu(id); setTimeout(() => { try { if (window.TeiknBord && TeiknBord.finnaAlltHusid) TeiknBord.finnaAlltHusid().catch(() => {}); } catch (_) {} }, 1500); } },
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('button._gr-profil-takki[data-co],button._greining-takki[data-co]') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    opnaProfil(+b.getAttribute('data-co'));
  }, true);

  /* ── „STOFNA SEM VIÐSKIPTAVIN" — „Nýtt fyrirtæki" appsins + stjórntæki þjónustukerfanna ───────────────────── */
  const THJ = [
    { k: 'ars', merki: 'Ársskoðun slökkvitækja' },
    { k: 'bru', merki: 'Brunakerfisskoðun' },
    { k: 'slokk', merki: 'Slökkvikerfisskoðun' },
  ];
  const ktTolur = (kt) => String(kt || '').replace(/\D/g, '');
  function tvisk(nafn, kt, adr) {
    const sama = window.Greining451 && Greining451.samaHeimili;
    const k = ktTolur(kt);
    return ((window.Companies && Companies.list) || []).filter((c) => c && +c.id > 0 && !c.deleted_at && (
      (k.length === 10 && ktTolur(c.kennitala) === k) || (adr && c.heimilisfang && sama && sama(c.heimilisfang, adr)) ||
      (nafn && String(c.nafn || '').trim().toLowerCase() === String(nafn).trim().toLowerCase())));
  }
  function stofna(g) {
    const felog = ((g && g.rekstur && g.rekstur.felog) || []).filter((f) => f && (f.kt || (f.skra && f.skra.nafn)));
    const fyrsta = felog[0] || null;
    const osmNafn = ((g && g.opin && g.opin.rekstur && g.opin.rekstur.listi) || []).filter((x) => x.nafn && x.osm_tag && x.osm_tag.k !== 'building').map((x) => x.nafn);
    const nafn0 = (fyrsta && ((fyrsta.skra && fyrsta.skra.nafn) || fyrsta.nafn)) || (osmNafn.length === 1 ? osmNafn[0] : '');
    const kt0 = (fyrsta && fyrsta.kt) || '';
    const adr0 = (g && g.adr) || '';
    const w = gluggi('Stofna sem viðskiptavin', adr0);
    w.buk.innerHTML =
      '<div class="gr-fath">Fyrirtækið er stofnað með „Nýtt fyrirtæki“-leið appsins (sama form og vistun). Þjónustan er skráð í hverju kerfi með þess eigin takka strax á eftir — hvert skref staðfest.</div>' +
      '<div class="gr-fform">' +
        '<label class="heil">Nafn *<input type="text" data-f="nafn" value="' + esc(nafn0) + '" placeholder="Nafn fyrirtækis eða staðar"></label>' +
        '<label>Kennitala<input type="text" data-f="kt" value="' + esc(kt0) + '" placeholder="000000-0000"></label>' +
        '<label>Heimilisfang<input type="text" data-f="adr" value="' + esc(adr0) + '"></label>' +
        (felog.length > 1 ? '<div class="heil gr-fath" style="margin:0">Fleiri félög á staðnum: ' + felog.slice(1, 5).map((f) => '<button type="button" class="ssp-btn" data-f="velja" data-kt="' + esc(f.kt || '') + '" data-nafn="' + esc((f.skra && f.skra.nafn) || f.nafn || '') + '">' + esc((f.skra && f.skra.nafn) || f.nafn || f.kt) + '</button>').join(' ') + '</div>' : '') +
        '<div class="heil"><div class="gr-fthj" role="group" aria-label="Þjónusta">' +
          '<label><input type="checkbox" data-thj="an" checked> Án þjónustu</label>' +
          THJ.map((t) => '<label><input type="checkbox" data-thj="' + t.k + '"> ' + esc(t.merki) + '</label>').join('') +
        '</div></div>' +
      '</div>' +
      '<div data-f="tvisk"></div>' +
      '<div class="gr-ftakkar"><span class="gr-fbil"></span><button type="button" class="ssp-btn" data-f="loka">Hætta við</button><button type="button" class="gr-frautt" data-f="stofna">Stofna fyrirtæki</button></div>';
    const $ = (sel) => w.buk.querySelector(sel);
    const tviskTeikna = () => {
      const t = tvisk($('[data-f="nafn"]').value, $('[data-f="kt"]').value, $('[data-f="adr"]').value);
      $('[data-f="tvisk"]').innerHTML = t.length
        ? '<div class="gr-fvar"><b>Mögulega tvískráð:</b> ' + t.length + (t.length === 1 ? ' fyrirtæki ber' : ' fyrirtæki bera') + ' sama nafn, kennitölu eða heimilisfang:<ul class="gr-flisti">' +
          t.slice(0, 6).map((c) => '<li><a class="gr-fhl" href="#company/' + (+c.id) + '" data-f="loka">' + esc(c.nafn) + '</a> <span class="ssp-daufur">' + esc([c.kennitala, c.heimilisfang].filter(Boolean).join(' · ')) + '</span></li>').join('') + '</ul>' +
          '<label style="display:flex;gap:6px;align-items:center;margin-top:6px;cursor:pointer"><input type="checkbox" data-f="samt"> Stofna samt (t.d. nýr staður rekstrarfélags — hver staður sín röð)</label></div>'
        : '';
      uppf();
    };
    const uppf = () => {
      const samt = $('[data-f="samt"]');
      $('[data-f="stofna"]').disabled = !$('[data-f="nafn"]').value.trim() || (samt && !samt.checked);
    };
    w.buk.addEventListener('input', (e) => { if (e.target.matches('[data-f="nafn"],[data-f="kt"],[data-f="adr"]')) tviskTeikna(); });
    w.buk.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-thj="an"]') && t.checked) w.buk.querySelectorAll('[data-thj]:not([data-thj="an"])').forEach((x) => { x.checked = false; });
      else if (t.matches('[data-thj]') && t.checked) $('[data-thj="an"]').checked = false;
      if (![...w.buk.querySelectorAll('[data-thj]')].some((x) => x.checked)) $('[data-thj="an"]').checked = true;
      uppf();
    });
    w.buk.addEventListener('click', (e) => {
      const v = e.target.closest('[data-f="velja"]'); if (!v) return;
      $('[data-f="kt"]').value = v.dataset.kt; if (v.dataset.nafn) $('[data-f="nafn"]').value = v.dataset.nafn; tviskTeikna();
    });
    tviskTeikna();
    $('[data-f="stofna"]').onclick = async (e) => {
      const b = e.currentTarget;
      const form = { nafn: $('[data-f="nafn"]').value.trim(), kt: $('[data-f="kt"]').value.trim(), adr: $('[data-f="adr"]').value.trim(),
        thj: THJ.filter((t) => $('[data-thj="' + t.k + '"]').checked).map((t) => t.k) };
      b.disabled = true; b.textContent = 'Stofnar…';
      let id = null;
      try { id = await stofnaUmNyttFyrirtaeki(form); } catch (err) { segja('Stofnun brást: ' + ((err && err.message) || err)); }
      if (!id) { if (w.o.isConnected) { b.disabled = false; b.textContent = 'Stofna fyrirtæki'; } return; }
      w.loka();
      NAEST.set(id, { form, g, gert: {} });
      await opnaNyjaProfil(id);
      naestuSkref(id);
    };
  }
  // „Nýtt fyrirtæki"-glugginn sjálfur: sama form (nf-*), sama vistun (Companies.submitNew)
  async function stofnaUmNyttFyrirtaeki(form) {
    if (!window.Companies || !Companies.openNew || !Companies.submitNew) throw new Error('„Nýtt fyrirtæki“ (features.js) er ekki hlaðið');
    if (!form.nafn) throw new Error('Nafn vantar');
    const fyrir = new Set(((Companies.list) || []).map((c) => +c.id));
    Companies.openNew();
    const setja = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v || ''; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    setja('nf-nafn', form.nafn); setja('nf-kt', form.kt); setja('nf-heimilisfang', form.adr);
    await Companies.submitNew();
    for (let i = 0; i < 40; i++) {
      const nyr = ((Companies.list) || []).find((c) => c && !fyrir.has(+c.id) && String(c.nafn || '').trim() === form.nafn);
      if (nyr) return +nyr.id;
      await bida(150);
    }
    return null;   // villuprófun (17) eða þjónninn hafnaði — glugginn segir frá og stendur opinn
  }
  async function opnaNyjaProfil(id) {
    await bida(450);   // fixcompanysave skiptir yfir á „companies" 200 ms eftir vistun — prófíllinn opnast á eftir því
    location.hash = '#company/' + id;
    for (let i = 0; i < 20; i++) {
      await bida(150);
      if (window.Companies && +Companies.currentId === +id && document.querySelector('#companies-main .co-banner')) return true;
    }
    try { if (window._openCompanySafe) window._openCompanySafe(id); } catch (_) {}
    for (let i = 0; i < 20; i++) { await bida(150); if (document.querySelector('#companies-main .co-banner')) return true; }
    return false;
  }

  /* ── NÆSTU SKREF eftir stofnun: þjónusta um stjórntæki kerfanna + „Færa í prófíl" ───────────────────────── */
  const NAEST = new Map();
  function naestuSkref(id) {
    const st = NAEST.get(id); if (!st) return;
    const co = coAf(id);
    const w = gluggi('Næstu skref', (co ? co.nafn : '#' + id) + ' · stofnað');
    const lina = (k, merki, takki, gert) => '<div><b>' + esc(merki) + '</b>' + (gert ? '<span class="gr-fst tomt">' + esc(gert) + '</span>' : '<button type="button" class="ssp-btn malm" data-f="' + k + '">' + esc(takki) + '</button>') + '</div>';
    const valin = st.form.thj;
    w.buk.innerHTML = '<div class="gr-fath"><b>' + esc(co ? co.nafn : '') + '</b> er stofnað. Hvert skref notar takka kerfisins sjálfs og spyr áður en það vistar.</div>' +
      '<div class="gr-fnaest">' +
        (valin.includes('ars') ? lina('ars', 'Ársskoðun slökkvitækja', 'Setja í þjónustu', st.gert.ars) : '') +
        (valin.includes('bru') ? lina('bru', 'Brunakerfisskoðun', 'Bæta við í Brunakerfi', st.gert.bru) : '') +
        (valin.includes('slokk') ? lina('slokk', 'Slökkvikerfisskoðun', 'Skrá slökkvikerfi', st.gert.slokk) : '') +
        (!valin.length ? '<div><b>Án þjónustu</b><span class="gr-fst eins">ekkert skráð</span></div>' : '') +
        lina('faera', 'Byggingarupplýsingar á prófílinn', 'Færa í prófíl', st.gert.faera) +
      '</div>' +
      '<div class="gr-ftakkar"><span class="gr-fbil"></span><button type="button" class="ssp-btn" data-f="loka">Loka</button></div>';
    const smella = (k, fn) => { const b = w.buk.querySelector('[data-f="' + k + '"]'); if (b) b.onclick = fn; };
    smella('ars', async () => {
      // 280: „⬆ Setja í þjónustu" á prófílnum — hann spyr (Confirm) og skrifar er_i_thjonustu + arsskodun_customers
      const t = document.querySelector('#companies-main ._co-svc-toggle');
      if (!t) { segja('„Setja í þjónustu“-takkinn fannst ekki á prófílnum'); return; }
      if (t.dataset.inservice === '1') { st.gert.ars = 'í þjónustu'; naestuSkref(id); return; }
      w.loka();
      t.click();
      for (let i = 0; i < 400; i++) { await bida(150); if (!document.getElementById('_cfm-dialog') && i > 2) break; }
      for (let i = 0; i < 20; i++) { if (t.dataset.inservice === '1') break; await bida(150); }
      if (t.dataset.inservice === '1') st.gert.ars = 'í þjónustu';
      naestuSkref(id);
    });
    smella('bru', async () => {
      // 147: „+ Bæta við fyrirtæki“ í Brunakerfisskoðun — leitin forfyllt með nafninu; smellur á röðina vistar
      // (saveOne: ÞRÖNGUR patch, aðeins þetta félag í brunakerfi_customers) og opnar spjald félagsins þar.
      if (!window.App || !App.switchView || !window.Brunakerfi) { segja('Brunakerfisskoðun (147) er ekki hlaðin'); return; }
      w.loka();
      App.switchView('brunakerfi');
      try { if (Brunakerfi.show) Brunakerfi.show(); } catch (_) {}
      let a = null;
      for (let i = 0; i < 60 && !a; i++) { await bida(150); a = document.querySelector('#brunakerfi-main ._bk-add'); }
      if (!a) { segja('„+ Bæta við fyrirtæki“ fannst ekki í Brunakerfisskoðun'); return; }
      a.click();
      let leit = null;
      for (let i = 0; i < 30 && !leit; i++) { await bida(100); leit = document.getElementById('_bk-a-search'); }
      if (!leit) { segja('Leitarglugginn opnaðist ekki'); return; }
      const nafn = (co && co.nafn) || st.form.nafn;
      leit.value = nafn; leit.dispatchEvent(new Event('input', { bubbles: true }));
      st.gert.bru = 'opnað — veldu félagið í listanum';
      st.minna = true;   // Næstu skref birtast aftur þegar prófíll félagsins opnast
    });
    smella('slokk', async () => {
      // 385: „＋ Nýtt kerfi" — fyrirtækið forvalið í leitinni; heiti, tegund og mánuður fyllast þar og „Skrá kerfi" vistar
      if (!window.Slokkvikerfi || !Slokkvikerfi.open) { segja('Slökkvikerfisskoðun (385) er ekki hlaðin'); return; }
      w.loka();
      Slokkvikerfi.open();
      let n = null;
      for (let i = 0; i < 40 && !n; i++) { await bida(150); n = document.getElementById('_sk-nytt'); }
      if (!n) { segja('„Nýtt kerfi“ fannst ekki'); return; }
      n.click();
      let leit = null;
      for (let i = 0; i < 30 && !leit; i++) { await bida(100); leit = document.getElementById('_skn-leit'); }
      if (!leit) { segja('„Nýtt slökkvikerfi“-glugginn opnaðist ekki'); return; }
      const nafn = (co && co.nafn) || st.form.nafn;
      for (let i = 0; i < 5 && leit.isConnected && leit.value !== nafn; i++) { leit.value = nafn; leit.dispatchEvent(new Event('input', { bubbles: true })); await bida(120); }
      st.gert.slokk = 'opnað — kláraðu í glugganum';
      st.minna = true;
    });
    smella('faera', () => { w.loka(); opna(id, st.g, { fra: 'stofnun', eftir: () => { st.gert.faera = 'gert'; } }); });
  }

  // Aftur á prófíl nýja félagsins eftir skref í öðru kerfi → Næstu skref aftur (einu sinni per heimkomu)
  window.addEventListener('hashchange', () => {
    const m = String(location.hash || '').match(/^#company\/(\d+)/); if (!m) return;
    const id = +m[1], st = NAEST.get(id);
    if (!st || !st.minna) return;
    st.minna = false;
    setTimeout(() => { if (+((location.hash.match(/^#company\/(\d+)/) || [])[1]) === id && !document.getElementById(DLG)) naestuSkref(id); }, 1200);
  });

  window.GreiningFaera = { opna, opnaProfil, stofna, naestuSkref, atridiFra, stodur, version: '452' };
  console.log('[452] Greining → prófíll');
})();
/* === END GREINING FASTEIGNAR → PRÓFÍLLINN === */
