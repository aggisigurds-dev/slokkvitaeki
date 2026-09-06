/* === ÞJÓNUSTUBORÐ → FYRIRTÆKI: alvöru tenging + lifandi tækjalisti (358) ==================
 *
 * Verkefnalisti e3e61225 (Cowork-lota 06.09.2026 21:49, forgangur 1) — Agnar: „tengjaaaa — hvað
 * þarf ég að biðja um til að virknin virki". Á VALIÐ MÁL á Þjónustuborðinu (231-verkbord) er
 * fyrirtækið bara nafn með „✏️ Tengja"-hnappi (selCoHTML → #vb-sel-co) og í fulla ritlinum (⋯ Meira)
 * bara textareitur (`input[data-field="customer_nafn"]`). Enginn hnappur opnar fyrirtækið og
 * ekkert samhengi við tækjaskrána. Hlekkurinn sem er til (data-act="openco") situr aðeins í
 * lista-hausnum og sést ekki þegar málið er valið.
 *
 * Þessi pappi bætir reit við BEINT UNDIR fyrirtækislínuna í VALIÐ MÁL (og undir textareitinn í
 * ritlinum ef hann er opinn) — snertir EKKI 231:
 *   1. „🏢 Opna fyrirtæki" (window._openCompanySafe, varaleið #company/<id> → 357) og
 *      „📄 Fyrri viðskipti" (SalaCustomerHistory.open, sama og 231 notar).
 *   2. LIFANDI tækjalista: talið beint úr uttaeki (fyrirtaeki_id) í hvert sinn sem mál er valið.
 *   3. Viðvörun um tæki á status sem telst hvergi — „Í lagi" (154 í grunni 06.09.2026) og „ok" (74)
 *      síast burt úr öllum listum (gallinn sem faldi duftin á Kirkjuvöllum). ÚRELT (481) er
 *      lögmæt staða og sýnd dauf, EKKI sem viðvörun (leiðrétting á tillögunni).
 *   4. Síðasta úttektarsala (num, dags, upphæð) og hvort hún sé óbókfærð (invoiced_at tómt).
 *   5. Einstaklingur (vidskiptavinir) fær kt + Fyrri viðskipti; finnist nafnið hvergi segir reiturinn
 *      það berum orðum og bendir á ✏️ Tengja.
 *
 * Nafnauppfletting: 231 krefst NÁKVÆMRAR samsvörunar (c.nafn === val). Hér afmáð: lágstafir,
 * broddar burt, bil jöfnuð; finnist fleiri en eitt segir reiturinn það.
 * 231 endurteiknar VALIÐ MÁL oft (tikk, vistun) og þurrkar reitinn út — þess vegna er síðasta
 * teikning geymd per nafn og sett aftur inn samstundis (án nýrrar sóknar innan 60 s).
 * Tillagan var skrifuð sem 350 — það númer var þegar tekið (350-bord-starfsmenn). Ekkert skrifað
 * í grunninn; 153/187 ÓSNERT.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__vbFyrirtaeki358) return;
  window.__vbFyrirtaeki358 = true;

  const getSB = () => (window.DB && window.DB.sb) || null;
  const HOST_ID = 'vb-fyrirtaeki-panel';
  const CACHE_MS = 60000;

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
  async function finnaEinstakling(nafn) {
    const SB = getSB(); if (!SB || !nafn) return null;
    try {
      const r = await SB.from('vidskiptavinir').select('id,nafn,kennitala').is('deleted_at', null).ilike('nafn', nafn).limit(2);
      return (r.data && r.data.length === 1) ? r.data[0] : null;
    } catch (_) { return null; }
  }
  async function taekiFyrir(fid) {
    const SB = getSB(); if (!SB) return null;
    const r = await SB.from('uttaeki').select('type,size,status').eq('fyrirtaeki_id', fid).range(0, 1999);
    const rows = r.data || [];
    const virk = {}, falin = {}, urelt = {}, falinSt = {};
    rows.forEach(u => {
      const heiti = [u.type, u.size].filter(Boolean).join(' ') || '(ótilgreint)';
      const st = String(u.status || '').trim().toLowerCase();
      const bin = st === 'active' ? virk : st === 'urelt' ? urelt : falin;
      bin[heiti] = (bin[heiti] || 0) + 1;
      if (bin === falin) { const k = u.status || '(tómt)'; falinSt[k] = (falinSt[k] || 0) + 1; }
    });
    return { virk, falin, urelt, falinSt, alls: rows.length, villa: r.error ? r.error.message : null };
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
    wrap: 'margin-top:6px;border:1px solid var(--brd,#d9dee5);border-left:4px solid #b91c1c;border-radius:8px;padding:9px 11px;background:var(--surface,#fff);font-size:12.5px;line-height:1.5;color:var(--text,#0f172a);text-align:left',
    lbl: 'font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#7b848d);font-weight:700',
    warn: 'color:#b91c1c;font-weight:700',
    ok: 'color:#15803d',
    dim: 'color:var(--muted,#7b848d)'
  };
  function talnalisti(m) {
    const k = Object.keys(m).sort();
    if (!k.length) return '<span style="' + S.dim + '">engin</span>';
    return k.map(t => esc(t) + ' <b>' + m[t] + '</b>').join(' · ');
  }
  const sum = m => Object.keys(m).reduce((a, k) => a + m[k], 0);

  function htmlFor(d) {
    if (d.villa) return '<div style="' + S.wrap + '"><span style="' + S.warn + '">' + esc(d.villa) + '</span>' + (d.hint ? ' <span style="' + S.dim + '">' + esc(d.hint) + '</span>' : '') + '</div>';
    if (d.einst) {
      const v = d.einst;
      return '<div style="' + S.wrap + '"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        '<button type="button" class="btn btn-outline btn-sm" data-vbf="saga" data-fid="' + v.id + '" data-src="vidskiptavinir" data-kt="' + esc(v.kennitala || '') + '" data-nafn="' + esc(v.nafn) + '">📄 Fyrri viðskipti</button>' +
        '<span style="' + S.dim + '">Einstaklingur · viðskiptavinir #' + v.id + ' · ' + esc(v.kennitala || 'kt vantar') + ' · engin tækjaskrá</span></div></div>';
    }
    const co = d.co, t = d.taeki;
    const virkAlls = sum(t.virk), falinAlls = sum(t.falin), ureltAlls = sum(t.urelt);
    const falinSt = Object.keys(t.falinSt || {}).map(s => '„' + esc(s) + '" ' + t.falinSt[s]).join(', ');
    return '<div style="' + S.wrap + '">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px">' +
          '<button type="button" class="btn btn-sm" data-vbf="opna" data-fid="' + co.id + '">🏢 Opna fyrirtæki</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-vbf="saga" data-fid="' + co.id + '" data-src="fyrirtaeki" data-kt="' + esc(co.kennitala || '') + '" data-nafn="' + esc(co.nafn) + '">📄 Fyrri viðskipti</button>' +
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

  /* ── akkeri: VALIÐ MÁL (#vb-sel-co) fyrst, annars textareiturinn í ritlinum ─ */
  function findAnchor() {
    const co = document.getElementById('vb-sel-co');
    if (co) {
      const inp = co.querySelector('#vb-sel-co-inp');
      if (inp) return { el: co, nafn: '', mode: 'sel-edit' };          // ✏️ Tengja opið — ekkert á meðan
      const span = co.querySelector('span');
      const txt = span ? span.textContent.trim() : '';
      const nafn = /Engin tenging/.test(txt) ? '' : txt.replace(/^🗂\s*/, '').trim();
      return { el: co, nafn, mode: 'sel' };
    }
    const inp = document.querySelector('input[data-field="customer_nafn"]');
    if (inp) return { el: inp, nafn: String(inp.value || '').trim(), mode: 'ed' };
    return null;
  }
  function placeHost(a) {
    let host = document.getElementById(HOST_ID);
    if (host && host.isConnected) return host;
    if (host) host.remove();
    host = document.createElement('div'); host.id = HOST_ID;
    if (a.mode === 'ed') a.el.parentNode.appendChild(host); else a.el.insertAdjacentElement('afterend', host);
    return host;
  }

  const CACHE = {};   // nafn → { t, html }
  let seq = 0;
  async function byggja(a) {
    a = a || findAnchor(); if (!a) return;
    const nafn = a.nafn;
    if (!nafn) { const h = document.getElementById(HOST_ID); if (h) h.remove(); return; }
    const host = placeHost(a);
    host.dataset.nafn = nafn;
    const c = CACHE[nafn];
    if (c) { host.innerHTML = c.html; if (Date.now() - c.t < CACHE_MS) return; }
    else host.innerHTML = '<div style="' + S.wrap + ';' + S.dim + '">Sæki tækjalista…</div>';
    const my = ++seq;
    let html;
    try {
      const f = await finnaFyrirtaeki(nafn);
      if (f.stada === 'ekkert') {
        const e = await finnaEinstakling(nafn);
        html = e ? htmlFor({ einst: e })
                 : htmlFor({ villa: '„' + nafn + '" finnst hvorki í fyrirtækjaskrá né viðskiptavinaskrá.', hint: 'Nafnið verður að stemma við fyrirtaeki.nafn — ✏️ Tengja til að velja rétt nafn, annars tengist málið engu.' });
      } else if (f.stada === 'margt') {
        html = htmlFor({ villa: 'Nafnið „' + nafn + '" á við ' + f.hits.length + ' fyrirtæki (' + f.hits.map(h => '#' + h.id).join(', ') + ').', hint: '✏️ Tengja og veldu nákvæmara nafn.' });
      } else {
        const co = f.hits[0];
        const [taeki, sala] = await Promise.all([taekiFyrir(co.id), sidastaSala(co)]);
        html = (taeki && taeki.villa) ? htmlFor({ villa: 'Náði ekki í tækjalistann: ' + taeki.villa })
                                      : htmlFor({ co, taeki: taeki || { virk: {}, falin: {}, urelt: {}, falinSt: {}, alls: 0 }, sala });
      }
    } catch (e) { html = htmlFor({ villa: 'Náði ekki í tækjalistann: ' + (e && e.message ? e.message : e) }); }
    if (my !== seq) return;
    CACHE[nafn] = { t: Date.now(), html };
    const a2 = findAnchor();
    if (a2 && a2.nafn === nafn) { const h2 = placeHost(a2); h2.dataset.nafn = nafn; h2.innerHTML = html; }
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
      SalaCustomerHistory.open({ id: String(fid || ''), source: t.getAttribute('data-src') || 'fyrirtaeki', kt: t.getAttribute('data-kt') || '', nafn: t.getAttribute('data-nafn') || '' });
    }
  }, true);

  // 231 teiknar VALIÐ MÁL upp á nýtt við tikk/vistun — fylgjast með DOM og setja reitinn aftur inn.
  let bidin = null;
  const obs = new MutationObserver(function () {
    clearTimeout(bidin);
    bidin = setTimeout(function () {
      const a = findAnchor();
      const host = document.getElementById(HOST_ID);
      if (!a || !a.nafn) { if (host) host.remove(); return; }
      if (!host || !host.isConnected || host.dataset.nafn !== a.nafn) byggja(a);
    }, 150);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-field') === 'customer_nafn') setTimeout(() => byggja(), 300);
  });

  window.VbFyrirtaeki = { byggja, findAnchor, finnaFyrirtaeki, taekiFyrir, version: '358b' };
  console.log('[358-verkbord-fyrirtaeki] virkur');
})();
/* === END ÞJÓNUSTUBORÐ → FYRIRTÆKI === */
