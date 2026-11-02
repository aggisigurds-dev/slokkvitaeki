/* 493 — TeiknVal: aðalteikningar húss VALDAR AF HANDI (Agnar 02.11.2026: „Jafnvel að ég geti bara valið þarna hvað verða
 * aðalteikningarnar" — Greining fasteignar, Nýbýlavegur 4).
 *
 * ÁÐUR: sjálfvirk flokkun (451 flokkaBlod, 374 flokka) velur nýjasta „Aðaluppdrátt" hverrar hæðar eftir `haed`, `grunnmynd`,
 * `dags` og `urelt` úr teikn-listi. Rétt oftast, en ekki alltaf — og eina leiðin til að laga það var að bíða eftir næstu
 * útgáfu reglunnar.
 * NÚ: Agnar velur blaðið sjálfur. Valið gildir fyrir HÚSIÐ (landnr[:heitinr]) — öll félög í sama húsi sjá það sama
 * (Tokyo, ABC, Pizzan, Nýbýlavegur 4-8 ehf …) — og er notað ALLS STAÐAR þar sem sjálfvirka valið var notað:
 *   · 451 Greining fasteignar: hæðaspjöldin, „Aðrar teikningar", Brunavarnir á teikningu, Samantektar-ræman;
 *   · 384 forskoðun (prófíll 363 „1. hæð"-takkarnir, „Öll blöð í forskoðun"): valin blöð fremst í hverri hæð;
 *   · 374 „Veldu teikningu" (Teikning-glugginn): valin blöð fremst, merkt „Valin";
 *   · 383 „Finna allt húsið": valda blaðið er blaðið fyrir hæðina.
 * Þessi skrá á GÖGNIN og HJÁLPARANA; valglugginn sjálfur (smámyndir, hnappar) býr í 451 því hann notar smámyndavél hennar.
 *
 * GAGNALÍKAN. Tafla `fasteign_greining`, röð með lykil `val:<landnr>[:<heitinr>]` (sama mynstur og `eign:` — heitinr aðeins
 * ef sveitarfélag er skráð). ATH: spurt var um tegund 'val', en CHECK-skorðan `fasteign_greining_tegund_check` leyfir aðeins
 * 'skjal' og 'eign' og RLS-reglan leyfir vafranum aðeins tegund 'eign' (sql/fasteign_greining.sql, staðfest á lifandi
 * gagnagrunni 02.11.2026). Röðin er því tegund 'eign' með lykilforskeytið `val:`; hún er aldrei lesin sem skyndiminni
 * (engin gogn.adr, heimilisfang NULL — 468/474 spyrja á gogn->>adr og heimilisfang, þau finna hana ekki).
 *   gogn = { utgafa: 1,
 *            haedir: { "<hæðarheiti>": "<skráarnafn>" | null },   // null = hæðin fjarlægð úr spjaldinu; vantar = sjálfvirkt
 *            adrar:  ["<skráarnafn>", …] | null,                  // „Aðrar teikningar"; null = sjálfvirkt
 *            breytt: ISO, af: "…", heimili: "<staðfang>" }
 * Hæðarheiti: „Kjallari", „1. hæð" … „Milligólf", „Ris" — eða frjálst nafn (handbætt hæð, t.d. „Bílakjallari").
 * Blað er auðkennt með skráarnafni (d.filename; infoUrl ef það vantar).
 *
 * SKRIF aðeins við beinan smell á „Vista" í valglugganum (451) — aldrei við opnun, aldrei í lykkju. Lesið-breytt-skrifað:
 * rétt fyrir vistun er röðin lesin aftur og AÐEINS breytti lykillinn felldur inn, svo önnur vél sem breytti annarri hæð á
 * meðan glugginn var opinn missir ekkert. „Aftur í sjálfvirkt" er skrif á tómum reitum (RLS leyfir ekki DELETE).
 *
 * HRAÐI. Valið er lesið úr SÖMU fasteign_greining-fyrirspurn og síðan gerir fyrir (451 lesaSkyndi: `lykill in (eign:…, val:…)`
 * — engin aukaferð) og annars einu sinni í lotu samhliða teikningaleitinni. Síðasta svar er geymt í localStorage
 * (`teikn_val_skyndi`, skyndiminni sem þjónninn endurhleður — ekki staða gagna) svo hæðaspjöldin teiknist strax rétt.
 * Berist annað svar en skyndiminnið sagði kemur atburðurinn `teiknval:breytt` og 451 teiknar upp á nýtt. */
(() => {
  if (window.TeiknVal) return;
  const TAFLA = 'fasteign_greining', LS = 'teikn_val_skyndi', LS_MAX = 40;
  const sb = () => (window.DB && DB.sb) || null;
  const MEM = new Map();            // lykill → { v: stöðluð val | null, sott: bool }  (sott = staðfest af þjóni í þessari lotu)
  const BIDA = new Map();           // lykill → loforð (ein sókn í einu)

  const lykill = (e) => (e && e.landnr ? 'val:' + e.landnr + (e.svf && e.heitinr ? ':' + e.heitinr : '') : null);

  /* ── hæðarheiti ↔ lykill (sama lykill og 451 HL.lykill / 383 fahLykill: K, '1', '2', 'M', 'R') ── */
  function golfLykill(nafn) {
    const t = String(nafn || '').trim(), l = t.toLowerCase();
    if (/^kjall/.test(l)) return 'K';
    if (/^millig[óo]lf|^millipall/.test(l)) return 'M';
    if (/^(ris|þak)(\s|$)/.test(l)) return 'R';
    const m = l.match(/^(\d{1,2})\.?\s*h(æ|ae)ð\.?$/) || l.match(/^(\d{1,2})\.?$/);
    return m ? String(+m[1]) : 'n:' + t;
  }
  function golfNafn(k) {
    k = String(k);
    return k === 'K' ? 'Kjallari' : k === 'M' ? 'Milligólf' : k === 'R' ? 'Ris' : /^n:/.test(k) ? k.slice(2) : k + '. hæð';
  }
  const golfRod = (k) => (k === 'K' ? -1 : k === 'M' ? 1.5 : k === 'R' ? 999 : (/^\d+$/.test(String(k)) ? +k : 500));
  const blKey = (d) => String((d && (d.filename || d.infoUrl)) || '');
  const finnaBlad = (dr, nafn) => {
    if (!nafn) return null;
    const a = (dr || []).filter((d) => d && d.infoUrl && (d.filename === nafn || d.infoUrl === nafn));
    return a.find((d) => !d.urelt) || a[0] || null;
  };

  /* ── stöðlun ── */
  function stodla(g) {
    if (!g || typeof g !== 'object') return null;
    const haedir = {};
    if (g.haedir && typeof g.haedir === 'object') {
      Object.keys(g.haedir).forEach((n) => {
        const v = g.haedir[n], nafn = String(n || '').trim();
        if (!nafn) return;
        if (v === null) haedir[nafn] = null;
        else if (typeof v === 'string' && v) haedir[nafn] = v;
      });
    }
    const adrar = Array.isArray(g.adrar) ? g.adrar.filter((x) => typeof x === 'string' && x) : null;
    if (!Object.keys(haedir).length && !adrar) return null;
    return { haedir, adrar, breytt: g.breytt || null, af: g.af || null };
  }

  /* ── geymsla í vafra (skyndiminni — þjónninn er sannleikurinn) ── */
  let _ls = null;
  function lesaLs() {
    if (_ls) return _ls;
    _ls = {};
    try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && typeof o === 'object') _ls = o; } catch (_) {}
    Object.keys(_ls).forEach((k) => { if (!MEM.has(k)) MEM.set(k, { v: stodla(_ls[k] && _ls[k].g), sott: false }); });
    return _ls;
  }
  function skrifaLs(lyk, g) {
    try {
      const ls = lesaLs();
      if (g) ls[lyk] = { g, t: Date.now() }; else delete ls[lyk];
      const ks = Object.keys(ls);
      if (ks.length > LS_MAX) ks.sort((a, b) => (ls[a].t || 0) - (ls[b].t || 0)).slice(0, ks.length - LS_MAX).forEach((k) => delete ls[k]);
      localStorage.setItem(LS, JSON.stringify(ls));
    } catch (_) {}
  }
  const tilkynna = (lyk) => { try { window.dispatchEvent(new CustomEvent('teiknval:breytt', { detail: { lykill: lyk } })); } catch (_) {} };

  function setja(lyk, rawGogn, fraThjoni) {
    lesaLs();
    const nu = stodla(rawGogn), fyrri = MEM.get(lyk);
    const breytist = !fyrri || JSON.stringify(fyrri.v) !== JSON.stringify(nu);
    MEM.set(lyk, { v: nu, sott: !!fraThjoni || (fyrri && fyrri.sott) });
    if (fraThjoni) skrifaLs(lyk, nu ? { utgafa: 1, haedir: nu.haedir, adrar: nu.adrar, breytt: nu.breytt, af: nu.af } : null);
    if (breytist && (fyrri || nu)) tilkynna(lyk);
    return breytist;
  }

  /* ── lestur ── */
  function fyrirEign(e) {
    const lyk = lykill(e); if (!lyk) return null;
    lesaLs();
    const m = MEM.get(lyk);
    return m ? m.v : null;
  }
  const erSott = (e) => { const lyk = lykill(e); lesaLs(); const m = lyk && MEM.get(lyk); return !!(m && m.sott); };
  const erTilSkyndi = (e) => { const lyk = lykill(e); lesaLs(); return !!(lyk && MEM.has(lyk)); };
  // 451 lesaSkyndi sækir röðina með í sömu fyrirspurn: gefa hana hingað (rad = { lykill, gogn } eða null = engin röð)
  function matSkyndi(e, rad) {
    const lyk = lykill(e); if (!lyk) return;
    setja(lyk, rad && rad.gogn, true);
  }
  function saekja(e, ferskt) {
    const lyk = lykill(e); if (!lyk || !sb()) return Promise.resolve(fyrirEign(e));
    lesaLs();
    const m = MEM.get(lyk);
    if (m && m.sott && !ferskt) return Promise.resolve(m.v);
    if (BIDA.has(lyk)) return BIDA.get(lyk);
    const p = (async () => {
      try {
        const r = await sb().from(TAFLA).select('gogn').eq('lykill', lyk).maybeSingle();
        if (r && !r.error) setja(lyk, r.data && r.data.gogn, true);
        else if (r && r.error) console.warn('[493] val', r.error.message);
      } catch (err) { console.warn('[493] val', err); }
      return fyrirEign(e);
    })().finally(() => BIDA.delete(lyk));
    BIDA.set(lyk, p);
    return p;
  }

  /* ── skrif (aðeins við smell) ──
   * fall(drog) breytir drögunum { haedir: {…}, adrar: […]|null } og skilar þeim (eða breytir á staðnum).
   * Skilar { ok, villa?, val }. */
  async function uppfaera(e, heimili, fall) {
    const lyk = lykill(e);
    if (!lyk) return { ok: false, villa: 'Engin lóð (landnúmer vantar)' };
    if (!sb()) return { ok: false, villa: 'Engin gagnagrunnstenging' };
    try {
      // ferskt úr þjóni rétt fyrir skrif — aðeins breytti lykillinn felldur inn
      const f = await sb().from(TAFLA).select('gogn').eq('lykill', lyk).maybeSingle();
      if (f.error) return { ok: false, villa: f.error.message };
      const fyrri = stodla(f.data && f.data.gogn) || { haedir: {}, adrar: null };
      const drog = { haedir: Object.assign({}, fyrri.haedir), adrar: fyrri.adrar ? fyrri.adrar.slice() : null };
      const ut = fall(drog) || drog;
      const haedir = {};
      Object.keys(ut.haedir || {}).forEach((n) => { const v = ut.haedir[n]; if (v === null || (typeof v === 'string' && v)) haedir[n] = v; });
      const adrar = Array.isArray(ut.adrar) ? ut.adrar.filter((x) => typeof x === 'string' && x) : null;
      const gogn = { utgafa: 1, haedir, adrar, breytt: new Date().toISOString(), af: 'Greining fasteignar', heimili: heimili || (e && e.label) || null };
      const r = await sb().from(TAFLA).upsert({ lykill: lyk, tegund: 'eign', landnr: e.landnr, heitinr: e.svf ? (e.heitinr || null) : null, heimilisfang: null, gogn, uppruni: 'teikn-val' }, { onConflict: 'lykill' }).select('lykill');
      if (r.error) return { ok: false, villa: r.error.message };
      if (!r.data || !r.data.length) return { ok: false, villa: 'Skrifið komst ekki inn (engin röð skilaði sér)' };
      setja(lyk, gogn, true);
      return { ok: true, val: fyrirEign(e) };
    } catch (err) { return { ok: false, villa: (err && err.message) || String(err) }; }
  }

  /* ── hjálparar fyrir 374 / 384 / 383 (litlir og öruggir: skila alltaf inntakinu óbreyttu ef ekkert val er til) ── */
  // valin blöð í röð: hæðir (neðst → efst), svo „Aðrar teikningar"
  function valinBlod(dr, e) {
    const v = fyrirEign(e); if (!v) return [];
    const ut = [], sett = new Set();
    const baeta = (d, merki) => { if (d && !sett.has(d)) { sett.add(d); ut.push({ d, merki }); } };
    Object.keys(v.haedir).map((n) => ({ n, k: golfLykill(n) })).sort((a, b) => golfRod(a.k) - golfRod(b.k)).forEach(({ n }) => {
      if (v.haedir[n]) baeta(finnaBlad(dr, v.haedir[n]), n);
    });
    (v.adrar || []).forEach((f) => baeta(finnaBlad(dr, f), 'Aðrar teikningar'));
    return ut;
  }
  // 374: valin blöð fremst (og með þótt sían feldi þau), óvalin í sömu röð á eftir
  function blanda(syna, dr, e) {
    const vb = valinBlod(dr, e); if (!vb.length) return syna;
    const valin = vb.map((x) => x.d);
    return valin.concat(syna.filter((d) => valin.indexOf(d) < 0));
  }
  const merki = (d, dr, e) => { const x = valinBlod(dr, e).find((y) => y.d === d); return x ? x.merki : ''; };
  // 384: sia = 'h:2' | 's:Kjallari' | 's:Ris' | 'grunn' (annað óbreytt). listi = allt safnið, syn = það sem verður sýnt.
  function forskodun(syn, listi, sia, e) {
    const v = fyrirEign(e); if (!v || !syn) return syn;
    let k = null;
    if (/^h:\d+$/.test(sia || '')) k = String(+sia.slice(2));
    else if (sia === 's:Kjallari') k = 'K';
    else if (sia === 's:Ris') k = 'R';
    else if (sia !== 'grunn') return syn;
    const nofn = Object.keys(v.haedir).filter((n) => v.haedir[n] && (k === null || golfLykill(n) === k)).sort((a, b) => golfRod(golfLykill(a)) - golfRod(golfLykill(b)));
    const fremst = nofn.map((n) => finnaBlad(listi, v.haedir[n])).filter(Boolean);
    if (!fremst.length) return syn;
    return fremst.concat(syn.filter((d) => fremst.indexOf(d) < 0));
  }
  // 383 Finna allt húsið: val (Map hæð → { d, f, lyklar }) fær valin blöð í stað sjálfvirku. Aðeins venjulegar hæðir
  // (K, 1, 2 … R) — handbættar hæðir (frjálst nafn) hafa ekkert hæðarnúmer í Teikningu. flokka = TeiknSaekja.flokka.
  function finnaAlltHusid(val, dr, e, flokka) {
    const v = fyrirEign(e); if (!v) return val;
    const perBlad = new Map();
    Object.keys(v.haedir).forEach((n) => {
      const k = golfLykill(n);
      if (/^n:|^M$/.test(k)) return;
      if (v.haedir[n] === null) { val.delete(k); return; }
      const d = finnaBlad(dr, v.haedir[n]); if (!d) return;
      if (!perBlad.has(d)) perBlad.set(d, { d, f: flokka(d), lyklar: [] });
      perBlad.get(d).lyklar.push(k);
    });
    perBlad.forEach((x) => x.lyklar.forEach((k) => val.set(k, x)));
    return val;
  }

  window.TeiknVal = {
    lykill, golfLykill, golfNafn, golfRod, blKey, finnaBlad,
    fyrirEign, erSott, erTilSkyndi, matSkyndi, saekja, uppfaera,
    valinBlod, blanda, merki, forskodun, finnaAlltHusid,
  };
})();
