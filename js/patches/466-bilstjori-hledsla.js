/* === 466 — HLEÐSLUSPÁ Í BÍLSTJÓRA-APPINU (14.10.2026) ========================
 *
 * Agnar 13.10.2026: „compact tablet that can be seen somewhere on the company profile and later in the driver apps".
 * Fyrirtækjasíðan fékk spjaldið (467, áður 465). Þetta er bílstjórahliðin, tvennt:
 *   1. STOPPIN (219 cardHtml): ein lína undir stöðulínunni — „Hleðsla: 12 til hleðslu · L 15 · D 2 · CO₂ 0 · síðast
 *      hlaðið 2026". „≤" fyrir framan töluna þegar sagan nær ekki 5 ár aftur (efri mörk). Rautt þegar helmingur
 *      tækjanna eða fleiri eiga að fara á verkstæðið — þá þarf pláss í bílnum.
 *   2. FYRIRTÆKJASPJALDIÐ (._bs-sheet): kort „HLEÐSLUSPÁ" undir takkaröðinni með litlu töflunni eftir tegund
 *      (tæki · hlaðin/ný 5 ár · til hleðslu) og sögunni ár fyrir ár á einni línu.
 *
 * Gögnin koma öll gegnum 467 (`Hledsluspa.saekjaSpar` fyrir listann — ein sókn per 200 staði — og `Hledsluspa.saekja`
 * fyrir spjaldið). 219 teiknar listann með innerHTML; línan er sett inn aftur í sama rAF-tifi (fyrir málun) og
 * fyrst með „…" svo plássið sé tekið frá áður en talan kemur. Spjaldið geymir ekki auðkenni staðarins (openCompany
 * er lokað fall í 219), svo það er fundið á heitinu: stoppið með sama nafni í listanum, annars viewið á nafni + kt.
 * Finnist það ekki ótvírætt segir kortið það — giskar aldrei á annan stað.
 */
(() => {
  'use strict';
  if (window.BilstjoriHledsla) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = new Date().getFullYear();

  const st = document.createElement('style'); st.id = 'bilstjori-hledsla-466';
  st.textContent = [
    '.bt .stop__hledsla{font-family:var(--mono);font-size:11.5px;color:var(--faint);min-height:16px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bt .stop__hledsla b{color:var(--ink-2);font-weight:700}',
    '.bt .stop__hledsla[data-t="raudt"] b{color:#c0241f}',
    '._bs-hledsla table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12.5px;font-variant-numeric:tabular-nums}',
    '._bs-hledsla th{font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--faint);text-align:right;padding:0 6px 6px;white-space:nowrap}',
    '._bs-hledsla th:first-child,._bs-hledsla td:first-child{text-align:left}',
    '._bs-hledsla td{padding:6px;border-top:1px solid #edf0f4;text-align:right;color:var(--ink)}',
    '._bs-hledsla td:first-child{font-family:var(--font);font-weight:700}',
    '._bs-hledsla td.dauft{color:#aab1bb}',
    '._bs-hledsla tr.alls td{font-weight:800;background:#f7f8fa}',
    '._bs-hledsla td.stor{font-size:17px;font-weight:800}',
    '._bs-hledsla .teg{display:inline-flex;align-items:center;gap:6px}',
    '._bs-hledsla .teg i{width:9px;height:9px;border-radius:2px;display:inline-block;background:var(--t,#8f98a8)}',
    '._bs-hledsla .teg[data-teg="lettvatn"]{--t:#2f7fd4}._bs-hledsla .teg[data-teg="duft"]{--t:#c9372c}._bs-hledsla .teg[data-teg="co2"]{--t:#3a3a41}',
    '._bs-hledsla .saga{margin-top:9px;font-family:var(--mono);font-size:11.5px;color:var(--muted);line-height:1.5}',
    '._bs-hledsla .saga b{color:var(--ink)}',
    '._bs-hledsla .ath{margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--faint)}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  const efri = s => !!(s && /efri mörk|engin saga/.test(s.ath || ''));
  const raudt = s => !!(s && s.taeki && s.til_hledslu >= Math.max(5, s.taeki * 0.5));
  function linaHtml(s) {
    if (s === null) return 'Hleðsla: engin saga';
    if (!s.taeki) return 'Hleðsla: engin tæki skráð';
    return 'Hleðsla: <b>' + (efri(s) ? '≤ ' : '') + s.til_hledslu + '</b> til hleðslu' +
      (s.taeki ? ' · L ' + s.til_hledslu_lettvatn + ' · D ' + s.til_hledslu_duft + ' · CO₂ ' + s.til_hledslu_co2 : '') +
      (s.sidasta_hledsla ? ' · síðast hlaðið ' + s.sidasta_hledsla : '');
  }

  // ---------------------------------------------------------------- 1. stoppin
  function skreytaStopp() {
    const H = window.Hledsluspa; if (!H) return;
    const cards = document.querySelectorAll('#_bs-list .stop[data-co-id]'); if (!cards.length) return;
    const vantar = [];
    cards.forEach(card => {
      const fid = +card.dataset.coId; if (!fid) return;
      let el = card.querySelector('.stop__hledsla');
      if (!el) {
        const meta = card.querySelector('.stop__meta'); const rod = meta && meta.parentElement; if (!rod) return;
        el = document.createElement('div'); el.className = 'stop__hledsla'; el.textContent = 'Hleðsla: …';
        rod.insertAdjacentElement('afterend', el);
      }
      const s = H.spa(fid);
      if (s === undefined) { vantar.push(fid); return; }
      const html = linaHtml(s);
      if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; el.dataset.t = raudt(s) ? 'raudt' : ''; }
    });
    if (vantar.length) H.saekjaSpar(vantar).then(schedule);
  }

  // ---------------------------------------------------------------- 2. spjaldið
  const tala = v => '<td' + (v ? '' : ' class="dauft"') + '>' + (v || '—') + '</td>';
  function spjaldHtml(r) {
    const s = r && r.spa;
    if (!s) return '<div class="ath">Engin gögn um þennan stað í hleðsluspánni.</div>';
    const teg = [['lettvatn', 'Léttvatn', s.taeki_lettvatn, s.nyleg_lettvatn, s.til_hledslu_lettvatn], ['duft', 'Duft', s.taeki_duft, s.nyleg_duft, s.til_hledslu_duft], ['co2', 'Kolsýra', s.taeki_co2, s.nyleg_co2, s.til_hledslu_co2]];
    const arin = (window.Hledsluspa.arin ? window.Hledsluspa.arin(r.saga) : []);
    return '<table><thead><tr><th>Heimsókn ' + (s.naesta_heimsokn || AR) + '</th><th>Tæki</th><th>Hlaðin/ný 5 ár</th><th>Til hleðslu</th></tr></thead><tbody>' +
      teg.map(([t, h, alls, nyleg, til]) => '<tr><td><span class="teg" data-teg="' + t + '"><i></i>' + h + '</span></td>' + tala(alls) + tala(nyleg) + (alls ? '<td class="stor' + (til ? '' : ' dauft') + '">' + til + '</td>' : '<td class="dauft">—</td>') + '</tr>').join('') +
      '<tr class="alls"><td>Alls' + (s.nyleg_oskilgreint ? ' <span style="font-weight:400;color:var(--muted);font-size:11px">+' + s.nyleg_oskilgreint + ' ót.</span>' : '') + '</td>' + tala(s.taeki) + tala(s.nyleg_lettvatn + s.nyleg_duft + s.nyleg_co2 + s.nyleg_oskilgreint) + '<td class="stor' + (s.til_hledslu ? '' : ' dauft') + '">' + (efri(s) ? '≤ ' : '') + s.til_hledslu + '</td></tr>' +
      '</tbody></table>' +
      (arin.length ? '<div class="saga">' + arin.map(a => '<b>' + a.ar + '</b> ' + (a.taeki != null ? a.taeki + ' tæki · ' : '') + a.yf + ' yf' + (a.hl ? ' · ' + a.hl + ' hl' : '') + (a.ny ? ' · ' + a.ny + ' ný' : '')).join('&nbsp; | &nbsp;') + '</div>' : '') +
      '<div class="ath">' + esc(s.ath || '') + (s.sidasta_hledsla ? ' · síðast hlaðið ' + s.sidasta_hledsla + ', næst ' + (s.sidasta_hledsla + 5) : '') + ' · hlaðið á 5 ára fresti</div>';
  }
  async function finnaFid(title, kt) {
    let fid = 0, n = 0;
    document.querySelectorAll('#_bs-list .stop[data-co-id]').forEach(c => { if (((c.querySelector('.stop__name') || {}).textContent || '').trim() === title) { n++; fid = +c.dataset.coId; } });
    if (n === 1 && fid) return fid;
    if (!(window.DB && DB.sb) || !title) return 0;
    try {
      const r = await DB.sb.from('v_hledsluspa').select('fyrirtaeki_id,kennitala').eq('nafn', title).limit(5);
      const rows = (r.data || []).filter(x => !kt || String(x.kennitala || '').replace(/\D/g, '') === kt);
      return rows.length === 1 ? +rows[0].fyrirtaeki_id : 0;
    } catch (_) { return 0; }
  }
  function skreytaSpjald() {
    const H = window.Hledsluspa; if (!H) return;
    const sheet = document.querySelector('._bs-sheet'); if (!sheet || sheet.querySelector('._bs-hledsla')) return;
    const stack = sheet.querySelector('.stack'); if (!stack) return;
    const title = ((sheet.querySelector('.topbar__title') || {}).textContent || '').trim();
    const kt = ((sheet.querySelector('.topbar__sub') || {}).textContent || '').replace(/\D/g, '');
    const card = document.createElement('div'); card.className = 'card pad _bs-hledsla';
    card.innerHTML = '<div class="sec-label" style="margin-bottom:10px">HLEÐSLUSPÁ</div><div class="_bs-hledsla-b" style="min-height:150px"><div class="ath">Sæki…</div></div>';
    const fyrsta = stack.firstElementChild; if (fyrsta) fyrsta.insertAdjacentElement('afterend', card); else stack.appendChild(card);
    const body = card.querySelector('._bs-hledsla-b');
    (async () => {
      const fid = await finnaFid(title, kt);
      if (!fid) { body.innerHTML = '<div class="ath">Fann ekki staðinn ótvírætt í hleðsluspánni — opnaðu fyrirtækið í appinu.</div>'; return; }
      const r = await H.saekja(fid);
      if (!card.isConnected) return;
      body.innerHTML = (r && !r.villa) ? spjaldHtml(r) : '<div class="ath">Engin tenging við hleðsluspána.</div>';
    })();
  }

  // ---------------------------------------------------------------- vaktin
  function tick() { try { skreytaStopp(); skreytaSpjald(); } catch (e) { console.error('[466]', e); } }
  function schedule() { if (schedule.q) return; schedule.q = true; requestAnimationFrame(() => { schedule.q = false; tick(); }); }
  new MutationObserver(ms => {
    if (document.hidden) return;
    for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('.stop__hledsla,._bs-hledsla')) continue; schedule(); return; }
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { if (!document.hidden) tick(); }, 2000);
  tick();
  window.BilstjoriHledsla = { tick };
})();
