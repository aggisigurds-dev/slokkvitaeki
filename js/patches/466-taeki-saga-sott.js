/* === 466 — TÆKJASAGA VIÐ SÓTT ✓ (14.10.2026) ====================================================
 *
 * Afköst-mælaborðið (brunaholf) telur skoðuð („skodad") og hlaðin („hladid") tæki per dag úr
 * `taeki_saga`. Til 14.10.2026 skrifaði ENGINN í þá töflu í rauntíma — hún var bakfyllt einu sinni
 * 12.10.2026 (created_by='claude', heimild „bakfylling 12.10.2026 …") og síðan stóð hún kyrr, svo
 * mælaborðið giskaði. Hér er atburðaskráin tengd við raunverulega atburðinn: þegar verkbeiðni er
 * merkt Sótt ✓ í 121 fer EIN röð per afhentan verklið í `taeki_saga`.
 *
 * Flokkun eftir `verklidur.service` (frjáls texti):
 *   · hleðsla / áfylling / „CO₂ 100"            → 'hladid'
 *   · yfirferð / skoðun                          → 'skodad'      (bæði → tvær raðir)
 *   · annað („Kapall", „Vinna", …)              → 'thjonustad'
 *
 * Reglur:
 *   · Aðeins afhentir verkliðir (hakað í Sótt-glugganum). Bilaðir / eyddir sleppa.
 *   · Idempotent: töflunni er varin með tveimur hlut-einkvæmum vísum — (uttaeki_id, ar, vidburdur)
 *     og (serial, ar, vidburdur) þegar uttaeki_id vantar. PostgREST `on_conflict` nær ekki á
 *     hlut-vísa, svo hér er EKKI upsert: bunka-insert, og bregðist hann er hver röð sett inn stök;
 *     23505 (tvítak) = „þegar skráð" og telst í lagi. Endurtekning skrifar því ekkert tvisvar.
 *   · `serial` er NOT NULL í töflunni; verkliður án raðnúmers fær stöðuga vara-tölu
 *     „VL-<verkliður.id>" svo röðin komist inn og haldi einkvæmninni.
 *   · Bilun stöðvar ALDREI söluna: 121 kallar án await, hér er allt gripið, talið og skráð með
 *     window.logProblem('taeki_saga_sott', …) — engin kt í texta (ORYGGISNET regla 3 og 6).
 *
 * Opið: window.TaekiSaga.skraSott(jobs, units, ctx) → Promise<{skrifad, sleppt, villur, radir}>
 *        window.TaekiSaga.radir(jobs, units, ctx)    → hreint fall, engin skrif (fyrir próf)
 *        window.TaekiSaga.vidburdir(service)         → ['hladid'|'skodad'|'thjonustad', …]
 *   jobs  = verkbeidnir-raðir ({id, num, …}) — allJobs í 121
 *   units = unitState í 121: [{jobId, unit: verklidur-röð, checked}]
 *   ctx   = { starfsmadur?, dags?, sala? } — allt valkvætt
 */
(() => {
  'use strict';
  // 14.10.2026: 460-taeki-saga.js á sama hlut (saekja, linaHtml …) — sameina, ekki yfirtaka, og aldrei hætta við
  // þótt hinn sé kominn (sjá villuskrá #1212: „TaekiSaga.saekja is not a function" þegar þessi hlóðst fyrst).
  if (window.TaekiSaga && window.TaekiSaga.skraSott) return;

  const HLEDSLA = /hle[ðd]sl|áfylling|afylling|CO₂ 100|CO2 100/i;
  const SKODUN = /yfirfer|skoð|skod/i;
  const TVITAK = '23505';

  const sb = () => (window.DB && DB.sb) || null;
  const todayISO = () => new Date().toISOString().slice(0, 10);

  // Sama röð og 386/361/villuvakt nota: innskráður notandi → geymt starfsmannsnafn → 'app'.
  function notandi() {
    try {
      if (window.CurrentUser && CurrentUser.name) return String(CurrentUser.name).trim() || 'app';
      const n = localStorage.getItem('vb_starfsmadur') || localStorage.getItem('starfsmadur');
      if (n && n.trim()) return n.trim();
    } catch (_) {}
    return 'app';
  }

  function vidburdir(service) {
    const s = String(service || '');
    const ut = [];
    if (HLEDSLA.test(s)) ut.push('hladid');
    if (SKODUN.test(s)) ut.push('skodad');
    if (!ut.length) ut.push('thjonustad');
    return ut;
  }

  function radir(jobs, units, ctx) {
    ctx = ctx || {};
    const ar = new Date().getFullYear();
    const dags = ctx.dags || todayISO();
    const hver = ctx.starfsmadur || notandi();
    const numAf = new Map();
    (jobs || []).forEach(j => { if (j && j.id != null) numAf.set(String(j.id), j.num || j.id); });
    const ut = [];
    const sed = new Set();
    for (const s of (units || [])) {
      const u = s && s.unit;
      if (!u || !s.checked) continue;
      if (u.status === 'broken' || u.status === 'eytt') continue;
      const num = numAf.get(String(s.jobId)) || (jobs && jobs[0] && (jobs[0].num || jobs[0].id)) || ctx.sala || '?';
      const serial = (u.serial && String(u.serial).trim()) || ('VL-' + u.id);
      const uid = u.uttaeki_id != null && u.uttaeki_id !== '' ? Number(u.uttaeki_id) : null;
      const skyring = (u.service && String(u.service).trim()) || null;
      for (const v of vidburdir(u.service)) {
        // Sama lykill tvisvar í einum bunka (t.d. tveir liðir á sama tæki) → fyrsta röð gildir.
        const lykill = (uid != null ? 'u' + uid : 's' + serial) + '|' + ar + '|' + v;
        if (sed.has(lykill)) continue;
        sed.add(lykill);
        ut.push({
          serial: serial,
          uttaeki_id: uid,
          ar: ar,
          vidburdur: v,
          dags: dags,
          skyring: skyring,
          heimild: 'sótt ' + num + ' · verkliður #' + u.id,
          created_by: hver
        });
      }
    }
    return ut;
  }

  const erTvitak = e => !!e && (String(e.code) === TVITAK || /duplicate key/i.test(e.message || ''));

  function skraVillu(hvad, villa) {
    try { if (window.logProblem) window.logProblem('taeki_saga_sott', hvad + ': ' + ((villa && villa.message) || villa)); } catch (_) {}
    console.warn('[TaekiSaga] ' + hvad, villa);
  }

  async function skraSott(jobs, units, ctx) {
    const nid = { skrifad: 0, sleppt: 0, villur: 0, radir: [] };
    try {
      nid.radir = radir(jobs, units, ctx);
      if (!nid.radir.length) return nid;
      const SB = sb();
      if (!SB) { nid.villur = nid.radir.length; skraVillu('engin DB-tenging — ' + nid.radir.length + ' raðir ekki skráðar', ''); return nid; }

      // 1) Bunki. Tekst hann eru allar raðir nýjar.
      const r = await SB.from('taeki_saga').insert(nid.radir);
      if (!r || !r.error) { nid.skrifad = nid.radir.length; return lokid(nid); }

      // 2) Bunkinn féll (oftast tvítak við endurtekningu) → hver röð fyrir sig.
      for (const row of nid.radir) {
        try {
          const r1 = await SB.from('taeki_saga').insert(row);
          if (r1 && r1.error) throw r1.error;
          nid.skrifad++;
        } catch (e) {
          if (erTvitak(e)) { nid.sleppt++; continue; }
          nid.villur++;
          skraVillu('röð ekki skráð (' + row.heimild + ', ' + row.vidburdur + ')', e);
        }
      }
      return lokid(nid);
    } catch (e) {
      nid.villur++;
      skraVillu('skraSott féll', e);
      return nid;
    }
  }

  function lokid(nid) {
    try { console.info('[TaekiSaga] sótt → taeki_saga: ' + nid.skrifad + ' skrifað · ' + nid.sleppt + ' þegar til · ' + nid.villur + ' villur'); } catch (_) {}
    return nid;
  }

  window.TaekiSaga = Object.assign(window.TaekiSaga || {}, { skraSott, radir, vidburdir, notandi });
})();
