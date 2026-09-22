/* === BRUNAKERFIS SKOÐUN — sama síða og Slökkvikerfis skoðun, fóðruð brunakerfisgögnum (2026-09-21) ===
 *
 * Agnar 21.09.2026: „Spurning að bæta bara brunaviðvörunarkerfinu inn líka sem þriðji valkosturinn. það kerfi
 * er ekki nægilega gott." → „Brunakerfi yfirlit" (272) fær arftaka á íhlutnum úr 385
 * (window.Thjonustuskra.buaTil). Þessi pappi er AÐEINS gagnamillistykkið; allt útlit og hegðun býr í 385.
 * 272 stendur óbreytt VIÐ HLIÐINA þar til Agnar hefur borið síðurnar saman — ekkert er tekið af.
 *
 * Það sem 272 vantaði og kemur hér (allt mælt í kóðanum 21.09):
 *   • SKIPULAGÐUR skoðunarmánuður: brunakerfi_customers[fid].inspect_month er til hjá 23 af 24 áskrifendum en
 *     272 las hann aldrei — mánaðarsían þar fór eftir mánuði SÍÐUSTU skýrslu.
 *   • Staða eftir gjalddaga (Fram yfir / Þessi mánuður / Framundan) og „Órukkað": skýrsla ársins til en enginn
 *     brunakerfisreikningur á árinu. Engin „gleymst að rukka"-vörn var til fyrir þennan flokk.
 *   • „Í vinnslu" kemur úr brunakerfi_skyrslur (drög ársins) — 272 skrifaði það inn í arsskodun_customers,
 *     þ.e. í gögn SLÖKKVITÆKJANNA (272:380). Þessi síða skrifar aldrei þangað.
 *   • Breið nóta á hverri línu (brunakerfi_customers[fid].notes).
 *
 * LES: customer_documents (doc_type 'brunakerfi' = skýrslur; 'reikningur' + vidskiptategund 'brunakerfi' =
 *      reikningar), brunakerfi_skyrslur (drög/lokið í appinu), solur (source 'brunakerfi'), fyrirtaeki,
 *      AppSettings.brunakerfi_customers (áskriftarlistinn, 147).
 * SKRIFAR: aðeins notes og inspect_month EINS fyrirtækis í einu (AppSettings.save með einum lykli — aldrei
 *      allt kortið, sbr. 153:2598) og les gildið til baka áður en sagt er „vistað".
 * Fyrirtæki með skýrslu en EKKI á áskriftarlistanum sjást sem „Ekki á áskriftarlista"; nóta/mánuður vistast
 *      ekki á þau, því skrifin myndu búa til færslu á listanum og setja þau þögult í þjónustu.
 */
(() => {
  if (window.__brunakerfiSkraInstalled) return;
  window.__brunakerfiSkraInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  async function fetchAll(mk) {
    if (window.DB && DB.fetchAll) return DB.fetchAll(mk, 1000);
    const out = []; let from = 0;
    for (;;) { const r = await mk(from, from + 999); if (r && r.error) throw r.error; const d = (r && r.data) || []; out.push(...d); if (d.length < 1000) break; from += 1000; }
    return out;
  }
  function driveUrl(id) { return id && String(id).indexOf('sb:') !== 0 ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(id) : ''; }
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, ''); if (!base) return '';
    const s = String(p).replace(/^\/+/, ''); const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' + s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }
  // Sama regla og 272: raunveruleg skýrsla = opnanleg skrá, ekki HTML-rusl úr samningar-bucket.
  function reportUrl(d) {
    const path = String((d && d.storage_path) || '');
    if (/\.html?(\b|$)/i.test(path)) return '';
    const url = storageUrl(path) || driveUrl(d && d.drive_file_id);
    return (!url || url === '#') ? '' : url;
  }
  async function askriftarkort() {
    const AS = window.AppSettings; if (!AS || !AS.path) return {};
    let m = AS.path('brunakerfi_customers');
    if (m == null && AS.load) { try { await AS.load(); } catch (_) {} m = AS.path('brunakerfi_customers'); }
    return m || {};
  }
  const erDags = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));

  async function saekja() {
    const sb = SB(); if (!sb) throw new Error('Engin tenging við gagnagrunn');
    const arNu = new Date().getFullYear();
    const [docs, reikn, drog, solur, kort] = await Promise.all([
      fetchAll((a, b) => sb.from('customer_documents').select('id,fyrirtaeki_id,year,drive_file_id,storage_path,doc_date')
        .eq('doc_type', 'brunakerfi').not('fyrirtaeki_id', 'is', null).order('id').range(a, b)),
      fetchAll((a, b) => sb.from('customer_documents').select('id,fyrirtaeki_id,year,doc_date,amount,invoice_number,is_duplicate')
        .eq('doc_type', 'reikningur').eq('vidskiptategund', 'brunakerfi').eq('year', arNu).not('fyrirtaeki_id', 'is', null).order('id').range(a, b)),
      fetchAll((a, b) => sb.from('brunakerfi_skyrslur').select('id,fyrirtaeki_id,year,status,updated_at').eq('year', arNu).order('id').range(a, b)),
      fetchAll((a, b) => sb.from('solur').select('id,customer_id,created_at,status,samtals,is_credit,num').eq('source', 'brunakerfi').order('id').range(a, b)),
      askriftarkort()
    ]);
    const aLista = {}; Object.keys(kort).forEach(k => { if (kort[k] && typeof kort[k] === 'object') aLista[+k] = kort[k]; });
    const ids = [...new Set(docs.map(d => +d.fyrirtaeki_id).concat(Object.keys(aLista).map(Number)).filter(Boolean))];
    const cos = [];
    for (let i = 0; i < ids.length; i += 300) {
      const r = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer,er_i_thjonustu').in('id', ids.slice(i, i + 300));
      if (r.error) throw r.error; cos.push(...(r.data || []));
    }
    return cos.map(c => {
      const a = aLista[c.id] || null;
      const min = docs.filter(d => +d.fyrirtaeki_id === c.id).map(d => ({ d, u: reportUrl(d) })).filter(x => x.u && x.d.year);
      const arSlod = {}; min.forEach(x => { arSlod[+x.d.year] = x.u; });
      const dags = min.map(x => x.d.doc_date).filter(erDags).sort();
      const iAr = min.filter(x => +x.d.year === arNu).map(x => x.d.doc_date).filter(erDags).sort().pop() || (arSlod[arNu] ? arNu + '-01-01' : null);
      const dr = drog.find(x => +x.fyrirtaeki_id === c.id) || null;
      const rk = reikn.filter(x => +x.fyrirtaeki_id === c.id && !x.is_duplicate)[0] || null;
      const sl = solur.filter(x => +x.customer_id === c.id && !x.is_credit && x.status === 'final' && String(x.created_at || '').slice(0, 4) === String(arNu))[0] || null;
      const n = a && +a.unit_count ? +a.unit_count : 0;
      return {
        kerfi_id: c.id, fyrirtaeki_id: c.id, nafn: c.nafn || '', kennitala: c.kennitala || '', heimilisfang: c.heimilisfang || '', postnumer: c.postnumer || '',
        heiti: 'Brunaviðvörunarkerfi', tegund: n ? n + (n === 1 ? ' eining' : ' einingar') : '',
        skodunarmanudur: a && +a.inspect_month >= 1 && +a.inspect_month <= 12 ? +a.inspect_month : null,
        nota: (a && a.notes) || '', i_thjonustu: !!a, utan_lista: !a, i_arsskodun: !!c.er_i_thjonustu, ar_nu: arNu,
        fyrri_adili: null, fyrri_skodun: null,
        sidast_okkar: dags.length ? dags[dags.length - 1] : (a && erDags(a.last_inspected) ? String(a.last_inspected).slice(0, 10) : null),
        ar_med_skyrslu: Object.keys(arSlod).map(Number).sort(), ar_slod: arSlod,
        skodun_id: dr ? dr.id : null, skodun_status: dr ? dr.status : (iAr ? 'final' : null),
        skodad_at: iAr || (dr && dr.status === 'final' ? dr.updated_at : null), skyrsla_at: iAr, send_at: null,
        reikningur_at: rk ? (rk.doc_date || arNu + '-01-01') : sl ? sl.created_at : null,
        verd_fast: rk && rk.amount != null ? +rk.amount : sl && sl.samtals != null ? +sl.samtals : null,
        kostnadur: {}
      };
    });
  }

  // nota / skodunarmanudur → notes / inspect_month á EINU fyrirtæki. save() skilar true/false og kastar ekki
  // (85-app-settings) — svarið er lesið OG gildið lesið til baka. Djúp-sameiningin getur ekki eytt lyklum,
  // svo tómt er skrifað sem '' / 0, aldrei delete.
  async function vista(rod, patch) {
    const AS = window.AppSettings;
    if (!AS || !AS.save || !AS.path) return { ok: false, villa: 'Stillingageymslan (AppSettings) er ekki hlaðin' };
    if (!rod) return { ok: false, villa: 'Röðin fannst ekki' };
    if (rod.utan_lista) return { ok: false, villa: 'Fyrirtækið er ekki á áskriftarlista brunakerfa — bættu því við í „Brunakerfisþjónusta" fyrst' };
    const fid = String(rod.fyrirtaeki_id), sent = {};
    if ('nota' in patch) sent.notes = patch.nota == null ? '' : String(patch.nota);
    if ('skodunarmanudur' in patch) sent.inspect_month = +patch.skodunarmanudur || 0;
    if (!Object.keys(sent).length) return { ok: false, villa: 'Ekkert til að vista' };
    const svar = await AS.save({ brunakerfi_customers: { [fid]: sent } });
    if (svar === false) return { ok: false, villa: 'Vistun stillinga mistókst (save skilaði false)' };
    const nu = (AS.path('brunakerfi_customers') || {})[fid] || {};
    const stemmir = Object.keys(sent).every(k => String(nu[k] == null ? '' : nu[k]) === String(sent[k]));
    return stemmir ? { ok: true } : { ok: false, villa: 'Gildið í stillingunum stemmir ekki við það sem var sent' };
  }

  function opna(rod) {
    const fid = +rod.fyrirtaeki_id;
    // Prófíllinn efst eins og í hinum flokkunum: 386 hýsir vinnusíðuna undir 🚨-flipanum.
    if (window.SlokkvikerfiSkyrsla && window._openCompanySafe) {
      window.__slokkvikerfiOpna = { fid, flipi: 'bru', at: Date.now() };
      return window._openCompanySafe(fid);
    }
    if (window.BrunakerfiFyrirtaeki && BrunakerfiFyrirtaeki.open) {   // vinnusíðan úr 274 (yfirlag; lokast ofan af þessari síðu)
      BrunakerfiFyrirtaeki.open(fid);
      // 274 endurhleður aðeins gamla yfirlitið (272) við lokun — þessi síða hlustar sjálf eftir því að yfirlagið
      // sé falið og sækir þá nýja stöðu (ný skýrsla / reikningsdrög geta hafa orðið til þar inni).
      setTimeout(() => {
        const ov = document.getElementById('_bkc-overlay'); if (!ov) return;
        const mo = new MutationObserver(() => {
          if (ov.style.display === 'none') { mo.disconnect(); try { if (window.BrunakerfiSkra) BrunakerfiSkra.reload(); } catch (_) {} }
        });
        mo.observe(ov, { attributes: true, attributeFilter: ['style'] });
      }, 600);
      return;
    }
    if (window._openCompanySafe) window._openCompanySafe(fid);
  }

  function boot() {
    if (!window.Thjonustuskra || !Thjonustuskra.buaTil) { setTimeout(boot, 300); return; }
    window.BrunakerfiSkra = Thjonustuskra.buaTil({
      key: 'brunaskra', titill: 'Brunakerfis skoðun', takn: '', navEftir: 'brunayfirlit',
      saekja, vista, opna, nytt: false, felaSjalfgefid: false, verdHaus: 'Reikningur', verdTomt: '—', verdKpi: false,
      skref: [['skodad_at', 'Skoðað'], ['skyrsla_at', 'Skýrsla'], ['reikningur_at', 'Reikningur']],
      tomt: 'Ekkert fyrirtæki er á áskriftarlista brunakerfa og engin brunakerfisskýrsla fannst.'
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  console.log('[patch-388] Brunakerfis skoðun (millistykki) installed');
})();
/* === END BRUNAKERFIS SKOÐUN === */
