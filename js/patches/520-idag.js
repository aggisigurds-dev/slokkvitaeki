/* === Í DAG (520, 18.11.2026) — efsta lagið á Þjónustuborðinu =========================================================
 *
 * Agnar 18.11.2026 (hönnunaryfirferð á borðinu): borðið mælir vel en forgangsraðar ekki. Mælt sama dag á lifandi
 * borðinu: 7.354 px há síða (8,2 skjáir), 29 mælingar í einni flatri röð, SJÖ þeirra merktar ALVARLEGT samtímis,
 * 335 takkar og 34× „Fela · Skýring". Þegar sjö hlutir hrópa hrópar enginn.
 *
 * HVAÐ ÞETTA ER: eining 31 „Í dag" — efsta lagið af þremur (Í dag · Staðan · Listarnir). Hún sýnir AÐEINS það sem
 * þarf Agnar sjálfan í dag, mest sjö línur, og hver lína ber EINA aðgerð sem fer þangað sem hluturinn er unninn.
 * Hún er ekki ný mæling og ekki ný tafla: hún les það sem borðið og Vinnusamantektin hafa þegar sótt.
 *
 * HVAÐAN GÖGNIN KOMA — ekkert nýtt sótt:
 *   1. Forgangsmál og ný skilaboð (merkin `forgangsmal` / `skilabod`) — 368 á þau og réttir þau hingað (idagMal()).
 *      Sama Fela-lykil og eining 28 (`forgangsmal:mal:<id>`), svo falið mál er falið á báðum stöðum.
 *   2. Rauðu mælingarnar úr Vinnusamantekt (489): `Vinnusamantekt.S.res[id].sev === 'alv'` með tengli hverrar
 *      mælingar (MAEL[].slod). Mælist ekkert er einingin einfaldlega styttri — hún mælir aldrei sjálf.
 *
 * REGLAN SEM HÚN STENDUR Á: ein rauð lína er merki, sjö eru skraut. Þess vegna er ÞAK: fjögur mál og þrjár mælingar.
 * Sé meira í gangi stendur „+ N til viðbótar" og vísar niður á einingarnar sem eiga þau.
 *
 * ÚTLIT: engin ný litaspjöld — borðsins eigin breytur (--terra fyrir rautt, --g8 fyrir gult, --key/--edge á takka),
 * svo hún fylgir hamnum sem er valinn (Boss eða V2, sjá 507). Engin emoji. Snertifletir 36–44 px eins og annars staðar.
 * ================================================================================================================== */
(() => {
  if (window.BordIDag) return;

  const MAX_MAL = 4;        // þak á málum (forgangsmál + skilaboð)
  const MAX_MAEL = 3;       // þak á rauðum mælingum
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── rauðu mælingarnar úr 489 ───────────────────────────────────────────────────── */
  function falid(lykill) {
    try { const a = window.Bord368 && window.Bord368.felaApi; return !!(a && a.erFalid(lykill)); } catch (_) { return false; }
  }
  function maelingar() {
    const VS = window.Vinnusamantekt;
    if (!VS || !VS.S || !VS.S.res) return [];
    return (VS.MAEL || [])
      .map(m => ({ m, r: VS.S.res[m.id] }))
      .filter(x => x.r && x.r.sev === 'alv' && !falid('yfirlit:mael:' + x.m.id));
  }

  /* ── aðgerðartakki mælingar: nákvæmlega sá tengill sem mælingin sjálf á (MAEL[].slod) ── */
  function maelTakki(m) {
    const s = m.slod || {};
    const heiti = esc(s.t || 'Opna');
    if (s.ham) return '<button type="button" class="btn iv sm idg-b" data-t5="mode" data-mode="' + esc(s.ham) + '" title="Opna ' + heiti + ' — þar sem þetta er unnið">' + heiti + '</button>';
    if (s.view) return '<button type="button" class="btn iv sm idg-b" data-t5="vs-opna" data-v="' + esc(s.view) + '" title="Opna ' + heiti + ' — þar sem þetta er unnið">' + heiti + '</button>';
    if (s.url) return '<a class="btn iv sm idg-b" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" title="Opna ' + heiti + ' (nýr flipi)">' + heiti + ' ↗</a>';
    return '';
  }

  /* ── ein lína ───────────────────────────────────────────────────────────────────── */
  function rod(merki, sev, titill, undir, tala, takki) {
    return '<div class="idg-r" data-sev="' + esc(sev) + '">' +
      '<span class="idg-m" data-sev="' + esc(sev) + '">' + esc(merki) + '</span>' +
      '<div class="idg-t"><b>' + esc(titill) + '</b>' + (undir ? '<span class="idg-u">' + esc(undir) + '</span>' : '') + '</div>' +
      (tala ? '<span class="idg-n">' + esc(tala) + '</span>' : '') +
      (takki || '') + '</div>';
  }
  // Aldursmerki málsins: dagar frá stofnun, í orðum (ekki lit einum saman).
  function aldur(d) {
    if (d == null) return 'Nýtt';
    if (d <= 0) return 'Í dag';
    return d === 1 ? '1 dagur' : d + ' dagar';
  }
  const sevAf = d => (d != null && d >= 14 ? 'alv' : 'athuga');

  function malRadir(ctx) {
    const mal = (ctx && ctx.forgang ? ctx.forgang : []).concat(ctx && ctx.skilabod ? ctx.skilabod : []);
    return mal.slice(0, MAX_MAL).map(x => rod(
      x.teg === 'skilabod' ? 'Skilaboð' : aldur(x.dagar),
      x.teg === 'skilabod' ? 'athuga' : sevAf(x.dagar),
      x.titill || 'Mál ' + x.id,
      x.lina,
      '',
      '<button type="button" class="btn iv sm idg-b" data-t5="idag-mal" data-id="' + esc(x.id) + '" title="Opna málið á borðinu">Opna málið</button>'
    )).join('');
  }

  function samantekt(ctx) {
    const f = (ctx && ctx.forgang ? ctx.forgang.length : 0) + (ctx && ctx.skilabod ? ctx.skilabod.length : 0);
    const m = maelingar().length;
    const alls = Math.min(f, MAX_MAL) + Math.min(m, MAX_MAEL);
    if (!alls) return 'ekkert bíður þín';
    return alls + (alls === 1 ? ' atriði' : ' atriði') + ' · ' + f + (f === 1 ? ' mál' : ' mál') + ' · ' + m + (m === 1 ? ' rautt' : ' rauð');
  }

  function takkar() {
    return '<button type="button" class="btn iv sm" data-t5="vs-endurhlada" title="Telja mælingarnar upp á nýtt">↻ Endurmæla</button>';
  }

  function listi(ctx) {
    const mr = malRadir(ctx);
    const mael = maelingar();
    const maelR = mael.slice(0, MAX_MAEL).map(x => rod('Alvarlegt', 'alv', x.m.heiti, x.r.undir || '', x.r.tala || '', maelTakki(x.m))).join('');
    const fjMal = (ctx && ctx.forgang ? ctx.forgang.length : 0) + (ctx && ctx.skilabod ? ctx.skilabod.length : 0);
    const umfram = Math.max(0, fjMal - MAX_MAL) + Math.max(0, mael.length - MAX_MAEL);
    if (!mr && !maelR) {
      return '<div class="idg-tomt">Ekkert bíður þín í dag. Forgangsmál, ný skilaboð og rauðar mælingar birtast hér — allt annað er mælt neðar á borðinu.</div>';
    }
    return '<div class="idg">' +
      (mr ? '<div class="idg-sect">Mál á þínu borði</div>' + mr : '') +
      (maelR ? '<div class="idg-sect">Rautt í mælingum</div>' + maelR : '') +
      (umfram ? '<div class="idg-meir">+ ' + umfram + ' til viðbótar — í Forgangsmálum og Vinnusamantekt hér fyrir neðan</div>' : '') +
      '</div>';
  }

  /* ── stíll og smellir festir á skuggarót borðsins (sama mynstur og 511) ─────────── */
  function css() {
    return '.idg{padding:0}' +
      '.idg-sect{padding:9px 16px 5px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
      '.idg-r{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:11px 16px;border-top:1px solid var(--rule2)}' +
      '.idg-m{flex:0 0 auto;padding:2px 8px;border:1px solid var(--edge);border-radius:2px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}' +
      '.idg-m[data-sev="alv"]{border-color:var(--terra);color:#8d2f12}' +
      '.idg-m[data-sev="athuga"]{border-color:var(--g8);color:#6d5010}' +
      '.idg-t{flex:999 1 280px;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.idg-t>b{font-size:13.5px;font-weight:600;color:var(--ink)}' +
      '.idg-u{font-size:12px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.idg-n{flex:0 0 auto;font-family:var(--mono);font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink)}' +
      '.idg-b{flex:0 0 auto;min-height:36px;text-decoration:none}' +
      '.idg-meir{padding:9px 16px 11px;border-top:1px solid var(--rule2);font-size:12px;color:var(--mute)}' +
      '.idg-tomt{padding:12px 16px;font-size:13px;color:var(--mute)}' +
      '@media (max-width:640px){.idg-u{white-space:normal}.idg-b{flex:1 1 100%}}';
  }
  function smellur(e) {
    const el = e.target && e.target.closest ? e.target.closest('[data-t5="idag-mal"]') : null;
    if (!el) return;
    const id = Number(el.dataset.id);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    try { if (window.Bord368 && window.Bord368.opnaMal) window.Bord368.opnaMal(id); } catch (_) {}
  }
  function festa(root) {
    if (!root) return;
    if (!root.querySelector('#idg-still')) {
      const st = document.createElement('style');
      st.id = 'idg-still';
      st.textContent = css();
      root.appendChild(st);
    }
    if (root.__idgFest) return;
    root.__idgFest = true;
    root.addEventListener('click', smellur, true);
  }

  window.BordIDag = { festa, samantekt, listi, takkar, version: '2026-11-18' };
})();
