/* === KARFA ÚR DRÖG-STÖÐ v1 (05.09.2026) ===
 *
 * Drög-stöðin í hubbnum (brunaholf.netlify.app/#drogstod) á „draft-körfur" á punktum
 * (reikningspunktar.karfa) — krassblað sem flækist ekki í neitt. „Senda í körfu" þar opnar
 * söluborðið hér með ?karfa=<punktur-id>; þessi plástur sækir körfuna úr hub-API-inu og
 * hleður línunum + kúnnanum í POS-körfuna (window.POS.getState()). Reikningurinn verður
 * svo til HÉR, á venjulegan hátt — afsláttar-konvensjón, PDF, Payday, allt óbreytt.
 *
 * Ekkert skrifast í solur fyrr en afgreitt er í söluborðinu. Reglan „ALLTAF LEYFA VISTUN"
 * er virt: við hlöðum bara í körfuna, stoppum ekkert.
 */
(() => {
  if (window.KarfaUrDrogstod) return;
  const HUB = 'https://brunaholf.netlify.app';
  const toast = t => { if (window.Toast && Toast.show) Toast.show(t); };
  const sl = ms => new Promise(r => setTimeout(r, ms));

  function karfaId() {
    try { const q = new URLSearchParams(location.search).get('karfa'); if (q) return q; } catch (_) {}
    const m = (location.hash || '').match(/[?&]karfa=(\d+)/); return m ? m[1] : null;
  }
  async function saekja(id) {
    const r = await fetch(HUB + '/api/reikningspunktar?id=' + encodeURIComponent(id), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
    return j.row;
  }
  const tilbuid = () => !!(window.POS && POS.getState && document.getElementById('pos-checkout'));
  async function bida(ms) { const t0 = Date.now(); while (!tilbuid() && Date.now() - t0 < ms) await sl(250); return tilbuid(); }

  async function hlada(row) {
    const k = row && row.karfa;
    if (!k || !Array.isArray(k.lines) || !k.lines.length) { toast('Karfan úr Drög-stöð er tóm'); return false; }
    const st = POS.getState();
    if (st.lines.length && !confirm('Það er þegar eitthvað í körfunni. Skipta því út fyrir körfuna úr Drög-stöð (#' + row.id + ')?')) return false;
    const ku = k.kunni || {};
    st.customer = { mode: 'kt', kt: ku.kt || '', nafn: ku.nafn || row.worksite_name || '', simi: '', co_id: ku.id || null, afslattur_pct: Number(ku.afslattur_pct) || 0, athugasemdir: '' };
    st.lines = k.lines.map(l => ({
      type: l.type === 'service' ? 'service' : 'product',
      desc: String(l.desc || '').trim() || (l.type === 'service' ? 'Þjónusta' : 'Vara'),
      qty: Number(l.qty) || 1,
      unit_price_ex_vat: Number(l.unit_price_ex_vat) || 0,
      vsk_pct: Number(l.vsk_pct) || 24,
      product_id: l.product_id ? Number(l.product_id) : undefined,
      ref: '', krefst_verkbeidni: false,
      disc_pct: Number(l.disc_pct) || 0
    }));
    st.discount = 0;
    st.discount_pct = Number(k.discount_pct) || Number(ku.afslattur_pct) || 0;
    st.staffNotes = ((st.staffNotes || '') + '\nÚr Drög-stöð, karfa #' + row.id).trim();   // innri nóta — prentast ekki
    // Sýna kúnnann í reitunum. Kt-reiturinn lætur söluborðið fletta honum upp sjálft
    // (afsláttur, heimilisfang) — við festum svo co_id/nafn körfunnar aftur á eftir, því
    // sama kt getur átt fleiri en eitt fyrirtæki (Vélrás!).
    const ktEl = document.getElementById('pos-kt'), nEl = document.getElementById('pos-nafn');
    if (ktEl && st.customer.kt) { ktEl.value = st.customer.kt; ktEl.dispatchEvent(new Event('input', { bubbles: true })); }
    if (nEl) { nEl.value = st.customer.nafn; nEl.dispatchEvent(new Event('input', { bubbles: true })); }
    POS.rerenderDynamic();
    setTimeout(() => {
      try {
        const s = POS.getState();
        if (ku.id) { s.customer.co_id = ku.id; s.customer.nafn = ku.nafn || s.customer.nafn; }
        if (Number(k.discount_pct) > 0) s.discount_pct = Number(k.discount_pct);
        if (nEl && ku.nafn) nEl.value = ku.nafn;
        POS.rerenderDynamic();
      } catch (_) {}
    }, 1800);
    toast('🧺 Karfa #' + row.id + ' — ' + (st.customer.nafn || 'kúnni') + ' · ' + st.lines.length + ' lín' + (st.lines.length === 1 ? 'a' : 'ur'));
    return true;
  }

  async function boot() {
    const id = karfaId(); if (!id) return;
    try { if (window.App && App.switchView) App.switchView('sala'); else location.hash = '#sala'; } catch (_) { location.hash = '#sala'; }
    if (!(await bida(20000))) { toast('Söluborðið hlóðst ekki — opnaðu Sala og reyndu aftur'); return; }
    await sl(400);   // vörulistinn + kúnnareitir klárir
    try { const row = await saekja(id); await hlada(row); }
    catch (e) { alert('Náði ekki körfunni úr Drög-stöð: ' + (e.message || e)); }
    try { history.replaceState(null, '', location.pathname + '#sala'); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 800)); else setTimeout(boot, 800);

  window.KarfaUrDrogstod = { hlada, saekja, version: 'v1' };
})();
