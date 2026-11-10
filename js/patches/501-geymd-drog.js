/* === GEYMD DRÖG ÚR SÖLU v1 (10.11.2026) ===
 *
 * Agnar 10.11.2026: „Nú er ég að gera reikning, sem á eftir að bæta við … yrði hægt að setja neðst niðri, geyma sem drög …
 * og þá að þau séu inn í Drög flipanum sem Geymd Drög, í sér flokki ofanlega."
 *
 * „Geyma sem drög" (neðst vinstra megin í greiðsluglugganum, 07-sala-checkout-dialog.js) geymir KÖRFUNA — kúnna, línur (með
 * línu-afslætti og verkbeiðna-merkjum óbreyttum), sölu-afslátt, „Vegna"-texta, starfsmanna-nótu og Beiðninúmer — í töflunni
 * `sala_geymd` á þjóni (sql/sala_geymd.sql) svo hún sést á öllum vélum. Þetta er ÉKKI sala: ekkert R-númer er tekið, engin
 * greiðsluaðferð valin og ekkert snertir `solur`, Bókhald, Kröfu yfirlit eða Payday. Salan verður til í Sölu á venjulegan hátt
 * (afsláttar-konvensjón, kennitala, PDF — allt óbreytt) þegar drögin eru opnuð aftur.
 *
 * Drög-flipinn (143) sýnir þau sem flokkinn „Geymd drög" efst. „Opna í Sölu" hleður körfuna eins og 352 (karfa úr Drög-stöð) og
 * merkir röðina eydda (deleted_at) — „Sýna eydd" í Drög endurheimtir hana. Karfan er tæmd AÐEINS eftir að röðin er staðfest á þjóni;
 * misheppnist vistun er karfan óbreytt og villan sögð (ALLTAF LEYFA VISTUN — ekkert er stöðvað).
 *
 * API: window.GeymdDrog = { vista, opna, eyda, endurheimta, listi }
 */
(() => {
  if (window.GeymdDrog) return;
  const TAFLA = 'sala_geymd';
  const sb = () => (window.DB && DB.sb) || null;
  const toast = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const kr = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';   // toLocaleString('is-IS') fellur stundum í en-US
  const clone = o => JSON.parse(JSON.stringify(o));
  const POSok = () => !!(window.POS && POS.getState);
  const tilbuid = () => POSok() && !!document.getElementById('pos-checkout');
  const breytt = () => { try { document.dispatchEvent(new CustomEvent('geymd-drog-breytt')); } catch (_) {} };
  async function spyrja(texti, opts) {
    if (window.Confirm && Confirm.show) return await Confirm.show(texti, opts);
    return window.confirm(texti);
  }
  async function bida(ms) { const t0 = Date.now(); while (!tilbuid() && Date.now() - t0 < ms) await sl(250); return tilbuid(); }

  // ── snjómynd af körfunni (POS-state) ───────────────────────────────────────────────────────────────────────
  function snjomynd() {
    const st = POS.getState();
    const lines = clone(st.lines || []);
    const cu = clone(st.customer || {});
    let samtals = 0; try { samtals = Math.round(POS.totals().total) || 0; } catch (_) {}
    const lysing = l => (Number(l.qty) > 1 ? l.qty + '× ' : '') + String(l.desc || '').replace(/\s+/g, ' ').trim();
    const yfirlit = lines.slice(0, 5).map(lysing).filter(Boolean).join(' · ') + (lines.length > 5 ? ' · …' : '');
    return {
      customer_nafn: String(cu.nafn || '').trim() || null,
      customer_kt: String(cu.kt || '').trim() || null,
      customer_id: cu.co_id || null,
      samtals: samtals,
      linur_fjoldi: lines.length,
      yfirlit: yfirlit.slice(0, 400),
      karfa: {
        customer: cu, lines: lines,
        discount: Number(st.discount) || 0, discount_pct: Number(st.discount_pct) || 0, discount_gross: st.discount_gross !== false,
        notes: st.notes || '', staffNotes: st.staffNotes || '', beidninumer: st.beidninumer || ''
      }
    };
  }

  // Karfan tæmd eins og eftir sölu (pos.js POS.resetCart); varaleið ef pos.js er eldra.
  function taema() {
    if (POS.resetCart) { POS.resetCart(); return; }
    const st = POS.getState();
    st.customer = { mode: 'kt', kt: '', nafn: '', simi: '', co_id: null, afslattur_pct: 0, athugasemdir: '' };
    st.lines = []; st.notes = ''; st.staffNotes = ''; st.discount = 0; st.discount_pct = 0; st.beidninumer = '';
    ['pos-kt', 'pos-nafn', 'pos-simi', 'pos-notes', 'pos-notes-staff'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    POS.rerenderDynamic();
  }

  // ── Geyma sem drög (frá greiðsluglugganum) ────────────────────────────────────────────────────────────────
  async function vista() {
    if (!POSok()) { alert('Söluborðið er ekki tilbúið'); return false; }
    const st = POS.getState();
    if (!st.lines || !st.lines.length) { toast('Karfan er tóm — ekkert til að geyma'); return false; }
    const S = sb();
    if (!S) { alert('Engin gagnabankatenging — drögin vistuðust EKKI. Karfan er óbreytt.'); return false; }
    const row = snjomynd();
    let r;
    try { r = await S.from(TAFLA).insert(row).select('id').single(); } catch (e) { r = { error: e }; }
    if (!r || r.error || !r.data) {
      const m = (r && r.error && (r.error.message || r.error)) || 'engin röð skilaði sér';
      alert('Drögin vistuðust EKKI — karfan er óbreytt.\n\n' + m);
      return false;
    }
    taema();   // aðeins eftir að röðin er staðfest á þjóni
    toast('✓ Geymt sem drög — ' + row.linur_fjoldi + (row.linur_fjoldi === 1 ? ' lína' : ' línur') + ' · ' + kr(row.samtals) + (row.customer_nafn ? ' · ' + row.customer_nafn : '') + '. Sjá Drög → Geymd drög.');
    breytt();
    return true;
  }

  // ── Opna geymd drög í körfu (sama aðferð og 352 — karfa úr Drög-stöð) ────────────────────────────────────────
  function hlada(k) {
    const st = POS.getState();
    st.customer = Object.assign({ mode: 'kt', kt: '', nafn: '', simi: '', co_id: null, afslattur_pct: 0, athugasemdir: '' }, clone(k.customer || {}));
    st.lines = clone(k.lines);
    st.discount = Number(k.discount) || 0;
    st.discount_pct = Number(k.discount_pct) || 0;
    st.discount_gross = k.discount_gross !== false;
    st.notes = k.notes || '';
    st.staffNotes = k.staffNotes || '';
    st.beidninumer = k.beidninumer || '';
    // Reitirnir aðeins SÝNDIR — enginn input-atburður, svo kt-uppfletting söluborðsins skrifi ekki yfir co_id / afslátt / nafn körfunnar.
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v == null ? '' : v; };
    set('pos-kt', st.customer.kt); set('pos-nafn', st.customer.nafn); set('pos-simi', st.customer.simi);
    set('pos-notes', st.notes); set('pos-notes-staff', st.staffNotes);
    POS.rerenderDynamic();
    festaAfslatt(Number(k.discount_pct) || 0);
  }
  // 255 (sjálfvirkur fyrirtækjaafsláttur) og 296 (afsláttarhópar) setja state.discount_pct á „kúnni skipti" — sem er einmitt það sem
  // gerist þegar kennitalan kemur inn með körfunni — og skrifa þá yfir afsláttinn sem var geymdur (mælt 10.11.2026: geymt 5 % → 0 %
  // eftir að karfan opnaðist). Hér er geymda gildið fest aftur eftir að þær hafa keyrt (MutationObserver í 255 bíður 120 ms); eftir það
  // lítur 255 á gildið sem handvirkt og lætur það í friði. Sama aðferð og 352 (karfa úr Drög-stöð).
  function festaAfslatt(vilja) {
    [400, 1000, 2000].forEach(ms => setTimeout(() => {
      try {
        const s = POS.getState();
        if (Math.abs((+s.discount_pct || 0) - vilja) > 0.001) { s.discount_pct = vilja; POS.rerenderDynamic(); }
      } catch (_) {}
    }, ms));
  }
  async function saekja(id) {
    const S = sb(); if (!S) throw new Error('Engin gagnabankatenging');
    const r = await S.from(TAFLA).select('*').eq('id', id).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function opna(id) {
    let row;
    try { row = await saekja(id); } catch (e) { alert('Náði ekki geymdu drögunum: ' + (e.message || e)); return false; }
    const k = row && row.karfa;
    if (!k || !Array.isArray(k.lines) || !k.lines.length) { alert('Geymdu drögin eru tóm eða finnast ekki.'); return false; }
    try { if (window.App && App.switchView) App.switchView('sala'); else location.hash = '#sala'; } catch (_) { location.hash = '#sala'; }
    if (!(await bida(20000))) { toast('Söluborðið hlóðst ekki — opnaðu Sala og reyndu aftur'); return false; }
    await sl(300);   // vörulistinn + kúnnareitir klárir
    const st = POS.getState();
    if (st.lines.length && !(await spyrja('Það er þegar eitthvað í körfunni. Skipta því út fyrir geymdu drögin?', { okText: 'Skipta út', cancelText: 'Hætta við' }))) return false;
    hlada(k);
    // Drögin eru nú í körfu → merkt eydd; „Sýna eydd" í Drög endurheimtir þau ef karfan glatast.
    const S = sb();
    let er = null;
    try { const r = await S.from(TAFLA).update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id); er = r && r.error; } catch (e) { er = e; }
    toast('Geymd drög opnuð — ' + (st.customer.nafn || 'kúnni') + ' · ' + st.lines.length + (st.lines.length === 1 ? ' lína' : ' línur') +
      (er ? ' (drögin sitja enn á listanum: ' + (er.message || er) + ')' : ''));
    breytt();
    return true;
  }

  async function eyda(id) {
    const ok = await spyrja('Eyða geymdum drögum?\n\nÞau hverfa af listanum en hægt er að endurheimta (haka í „Sýna eydd").');
    if (!ok) return false;
    const S = sb(); if (!S) return false;
    try {
      const r = await S.from(TAFLA).update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
      if (r.error) throw r.error;
    } catch (e) { alert('Tókst ekki að eyða: ' + (e.message || e)); return false; }
    toast('Geymdum drögum eytt'); breytt();
    return true;
  }
  async function endurheimta(id) {
    const S = sb(); if (!S) return false;
    try {
      const r = await S.from(TAFLA).update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('id', id);
      if (r.error) throw r.error;
    } catch (e) { alert('Tókst ekki að endurheimta: ' + (e.message || e)); return false; }
    toast('Geymd drög endurheimt'); breytt();
    return true;
  }

  // Listi fyrir Drög-flipann (án körfu-JSON): nýjast fyrst, eydd aðeins ef beðið er um þau.
  async function listi(o) {
    const S = sb(); if (!S) return [];
    let q = S.from(TAFLA).select('id,created_at,updated_at,deleted_at,customer_nafn,customer_kt,samtals,linur_fjoldi,yfirlit');
    if (!(o && o.medEyddum)) q = q.is('deleted_at', null);
    const r = await q.order('created_at', { ascending: false }).limit(100);
    if (r.error) { console.warn('[geymd-drog] listi:', r.error.message || r.error); return []; }
    return r.data || [];
  }

  window.GeymdDrog = { vista, opna, eyda, endurheimta, listi, version: 'v1' };
})();
