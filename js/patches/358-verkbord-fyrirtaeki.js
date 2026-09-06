/* === ÞJÓNUSTUBORÐ → FYRIRTÆKI: alvöru tenging + lifandi tækjalisti (358) ==================
 *
 * Verkefnalisti e3e61225 (Cowork-lota 06.09.2026 21:49, forgangur 1) — Agnar: „tengjaaaa — hvað
 * þarf ég að biðja um til að virknin virki". Á opna spjaldinu á Þjónustuborðinu (231-verkbord,
 * `input[data-field="customer_nafn"]`) er Viðskiptavinur bara TEXTAREITUR: enginn hnappur til að
 * opna fyrirtækið og ekkert samhengi við tækjaskrána. Hlekkurinn sem er til (data-act="openco")
 * situr aðeins í lista-hausnum (rowHeadHTML) og sést ekki þegar spjaldið er opið.
 *
 * Þessi pappi bætir við undir Viðskiptavinur-reitnum — snertir EKKI 231:
 *   1. „🏢 Opna fyrirtæki" (window._openCompanySafe, varaleið #company/<id> → 357) og
 *      „📄 Fyrri viðskipti" (SalaCustomerHistory.open, sama og 231 notar).
 *   2. LIFANDI tækjalista: talið beint úr uttaeki (fyrirtaeki_id) í hvert sinn sem spjald opnast.
 *   3. Viðvörun um tæki á status sem telst hvergi — „Í lagi" (154 í grunni 06.09.2026) og „ok" (74)
 *      síast burt úr öllum listum (gallinn sem faldi duftin á Kirkjuvöllum). ÚRELT (481) er
 *      lögmæt staða og sýnd dauf, EKKI sem viðvörun (leiðrétting á tillögunni).
 *   4. Síðasta úttektarsala (num, dags, upphæð) og hvort hún sé óbókfærð (invoiced_at tómt).
 *
 * Nafnauppfletting: 231 krefst NÁKVÆMRAR samsvörunar (c.nafn === val). Hér afmáð: lágstafir,
 * broddar burt, bil jöfnuð; finnist ekkert eða fleiri en eitt segir spjaldið það berum orðum.
 * Tillagan var skrifuð sem 350 — það númer var þegar tekið (350-bord-starfsmenn). Ekkert skrifað
 * í grunninn; 153/187 ÓSNERT.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__vbFyrirtaeki358) return;
  window.__vbFyrirtaeki358 = true;

  const getSB = () => (window.DB && window.DB.sb) || null;
  const HOST_ID = 'vb-fyrirtaeki-panel';
  const HIDDEN_STATUS = s => { const v = String(s || '').trim().toLowerCase(); return v !== 'active' && v !== 'urelt'; };

  function fold(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[ð]/g, 'd').replace(/[þ]/g, 'th').replace(/[æ]/g, 'ae')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isk = n => (Number(n) || 0).toLocaleString('is-IS', { maximumFractionDigits: 0 });
  const dags = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };

  /* ── uppfletting ─────────────────────────────────────────────────────── */
  let coCache = null, coCacheAt = 0;
  async function companies() {
    const SB = getSB(); if (!SB) return [];
    if (coCache && Date.now() - coCacheAt < 120000) return coCache;
    if (window.Companies && Array.isArray(Companies.list) && Companies.list.length) { coCache = Companies.list; coCacheAt = Date.now(); return coCache; }
    const r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,er_i_thjonustu').is('deleted_at', null).range(0, 2999);
    coCache = r.data || []; coCacheAt = Date.now();
    return coCache;
  }
  async function finnaFyrirtaeki(nafn) {
    const key = fold(nafn);
    if (!key) return { stada: 'tomt', hits: [] };
    const all = await companies();
    let hits = all.filter(c => c.nafn === nafn);                        // nákvæmt fyrst (sama og 231)
    if (!hits.length) hits = all.filter(c => fold(c.nafn) === key);
    if (!hits.length) hits = all.filter(c => { const f = fold(c.nafn); return f.indexOf(key) === 0 || key.indexOf(f) === 0; });
    if (!hits.length) return { stada: 'ekkert', hits: [] };
    if (hits.length > 1) return { stada: 'margt', hits };
    return { stada: 'eitt', hits };
  }
  async function taekiFyrir(fid) {
    const SB = getSB(); if (!SB) return null;
    const r = await SB.from('uttaeki').select('type,size,status').eq('fyrirtaeki_id', fid).range(0, 1999);
    const rows = r.data || [];
    const virk = {}, falin = {}, urelt = {};
    rows.forEach(u => {
      const heiti = [u.type, u.size].filter(Boolean).join(' ') || '(ótilgreint)';
      const st = String(u.status || '').trim().toLowerCase();
      const bin = st === 'active' ? virk : st === 'urelt' ? urelt : falin;
      bin[heiti] = (bin[heiti] || 0) + 1;
      if (bin === falin) falin.__st = Object.assign(falin.__st || {}, { [u.status || '(tómt)']: ((falin.__st || {})[u.status || '(tómt)'] || 0) + 1 });
    });
    return { virk, falin, urelt, alls: rows.length, villa: r.error ? r.error.message : null };
  }
  async function sidastaSala(co) {
    const SB = getSB(); if (!SB) return null;
    let q = SB.from('solur').select('num,created_at,samtals,source,invoiced_at,customer_nafn').eq('source', 'uttekt');
    if (co.kennitala) q = q.eq('customer_kt', co.kennitala); else q = q.eq('customer_nafn', co.nafn);
    const r = await q.order('created_at', { ascending: false }).limit(1);
    return (r.data && r.data[0]) || null;
  }

  /* ── útlit (þema appsins: .btn-klasar + var(--…) með varalitum) ───────── */
  const S = {
    wrap: 'margin-top:6px;border:1px solid var(--brd,#d9dee5);border-left:4px solid #b91c1c;border-radius:8px;padding:9px 11px;background:var(--surface,#fff);font-size:12.5px;line-height:1.5;color:var(--text,#0f172a)',
    lbl: 'font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#7b848d);font-weight:700',
    warn: 'color:#b91c1c;font-weight:700',
    ok: 'color:#15803d',
    dim: 'color:var(--muted,#7b848d)'
  };
  function talnalisti(m) {
    const k = Object.keys(m).filter(x => x !== '__st').sort();
    if (!k.length) return '<span style="' + S.dim + '">engin</span>';
    return k.map(t => esc(t) + ' <b>' + m[t] + '</b>').join(' · ');
  }
  const sum = m => Object.keys(m).filter(x => x !== '__st').reduce((a, k) => a + m[k], 0);

  function render(host, d) {
    if (d.villa) { host.innerHTML = '<div style="' + S.wrap + '"><span style="' + S.warn + '">' + esc(d.villa) + '</span></div>'; return; }
    const co = d.co, t = d.taeki;
    const virkAlls = sum(t.virk), falinAlls = sum(t.falin), ureltAlls = sum(t.urelt);
    const falinSt = t.falin.__st ? Object.keys(t.falin.__st).map(s => '„' + esc(s) + '" ' + t.falin.__st[s]).join(', ') : '';
    host.innerHTML =
      '<div style="' + S.wrap + '">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px">' +
          '<button type="button" class="btn btn-sm" data-vbf="opna" data-fid="' + co.id + '">🏢 Opna fyrirtæki</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-vbf="saga" data-fid="' + co.id + '" data-kt="' + esc(co.kennitala || '') + '" data-nafn="' + esc(co.nafn) + '">📄 Fyrri viðskipti</button>' +
          '<span style="' + S.dim + '">#' + co.id + ' · ' + esc(co.kennitala || 'kt vantar') + ' · ' +
            (co.er_i_thjonustu ? '<span style="' + S.ok + '">í þjónustu</span>' : '<span style="' + S.warn + '">EKKI í þjónustu</span>') + '</span>' +
        '</div>' +
        '<div><span style="' + S.lbl + '">Tækjalisti núna</span> — ' + virkAlls + ' virk' + (ureltAlls ? ' <span style="' + S.dim + '">· ' + ureltAlls + ' úrelt</span>' : '') + '<br>' + talnalisti(t.virk) + '</div>' +
        (falinAlls
          ? '<div style="margin-top:5px"><span style="' + S.lbl + '">Telst hvergi</span> — <span style="' + S.warn + '">' + falinAlls + ' tæki</span> á status sem síast burt úr öllum listum (' + falinSt + ')<br>' + talnalisti(t.falin) + '</div>'
          : '') +
        '<div style="margin-top:5px"><span style="' + S.lbl + '">Síðasta úttektarsala</span> — ' +
          (d.sala
            ? esc(d.sala.num) + ' · ' + dags(d.sala.created_at) + ' · ' + isk(d.sala.samtals) + ' kr' + (d.sala.invoiced_at ? '' : ' · <span style="' + S.warn + '">óbókfærð</span>')
            : '<span style="' + S.warn + '">engin</span>') +
        '</div>' +
      '</div>';
  }

  /* ── tenging við spjaldið ────────────────────────────────────────────── */
  let sidastaNafn = null, seq = 0;
  async function byggja(inp) {
    const nafn = String(inp.value || '').trim();
    let host = document.getElementById(HOST_ID);
    if (!host) { host = document.createElement('div'); host.id = HOST_ID; inp.parentNode.appendChild(host); }
    if (!nafn) { host.innerHTML = ''; sidastaNafn = null; return; }
    if (nafn === sidastaNafn && host.innerHTML) return;
    sidastaNafn = nafn;
    const my = ++seq;
    host.innerHTML = '<div style="' + S.wrap + ';' + S.dim + '">Sæki tækjalista…</div>';
    try {
      const f = await finnaFyrirtaeki(nafn);
      if (my !== seq) return;
      if (f.stada === 'ekkert') return render(host, { villa: 'Fyrirtækið „' + nafn + '" finnst ekki í fyrirtækjaskránni. Nafnið verður að stemma við fyrirtaeki.nafn — annars tengist spjaldið engu.' });
      if (f.stada === 'margt') return render(host, { villa: 'Nafnið „' + nafn + '" á við ' + f.hits.length + ' fyrirtæki (' + f.hits.map(h => '#' + h.id).join(', ') + '). Veldu nákvæmara nafn.' });
      const co = f.hits[0];
      const [taeki, sala] = await Promise.all([taekiFyrir(co.id), sidastaSala(co)]);
      if (my !== seq) return;
      if (taeki && taeki.villa) return render(host, { villa: 'Náði ekki í tækjalistann: ' + taeki.villa });
      render(host, { co, taeki: taeki || { virk: {}, falin: {}, urelt: {}, alls: 0 }, sala });
    } catch (e) {
      if (my === seq) render(host, { villa: 'Náði ekki í tækjalistann: ' + (e && e.message ? e.message : e) });
    }
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest && e.target.closest('[data-vbf]');
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const act = t.getAttribute('data-vbf');
    const fid = Number(t.getAttribute('data-fid'));
    if (act === 'opna') {
      if (fid && window._openCompanySafe) window._openCompanySafe(fid);
      else if (fid) location.hash = '#company/' + fid;
      return;
    }
    if (act === 'saga' && window.SalaCustomerHistory && SalaCustomerHistory.open) {
      SalaCustomerHistory.open({ id: String(fid || ''), source: 'fyrirtaeki', kt: t.getAttribute('data-kt') || '', nafn: t.getAttribute('data-nafn') || '' });
    }
  }, true);

  // Spjaldið er teiknað upp á nýtt við hverja breytingu — fylgjast með DOM (debounce).
  let bidin = null;
  const obs = new MutationObserver(function () {
    clearTimeout(bidin);
    bidin = setTimeout(function () {
      const inp = document.querySelector('input[data-field="customer_nafn"]');
      if (!inp) { sidastaNafn = null; return; }
      if (!document.getElementById(HOST_ID) || inp.value.trim() !== sidastaNafn) byggja(inp);
    }, 180);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-field') === 'customer_nafn') { sidastaNafn = null; setTimeout(() => byggja(e.target), 300); }
  });

  window.VbFyrirtaeki = { byggja, finnaFyrirtaeki, taekiFyrir, version: '358' };
  console.log('[358-verkbord-fyrirtaeki] virkur');
})();
/* === END ÞJÓNUSTUBORÐ → FYRIRTÆKI === */
