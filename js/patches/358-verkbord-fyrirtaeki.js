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
    // Varaleiðin (Companies.list ekki hlaðinn enn): `.range(0, 2999)` skilar aðeins
    // 1000 röðum — PostgREST-þakið, þögult og villulaust. Mælt 10.09.2026: fyrirtaeki
    // = 1311 raðir. Þau 311 sem duttu út hefðu fengið „finnst hvorki í fyrirtækjaskrá
    // né viðskiptavinaskrá" í reitnum þótt fyrirtækið sé til. Síðuskipta því alltaf.
    const sel = (a, b) => SB.from('fyrirtaeki').select('id,nafn,kennitala,er_i_thjonustu,afslattur_pct,netfang,customer_base_id').is('deleted_at', null).range(a, b);
    coCache = (window.DB && DB.fetchAll) ? await DB.fetchAll(sel) : ((await sel(0, 2999)).data || []);
    coCacheAt = Date.now();
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
    const r = await SB.from('uttaeki').select('type,size,status,next_insp').eq('fyrirtaeki_id', fid).range(0, 1999);
    const rows = r.data || [];
    const virk = {}, falin = {}, urelt = {}, falinSt = {};
    rows.forEach(u => {
      const heiti = [u.type, u.size].filter(Boolean).join(' ') || '(ótilgreint)';
      const st = String(u.status || '').trim().toLowerCase();
      const bin = st === 'active' ? virk : st === 'urelt' ? urelt : falin;
      bin[heiti] = (bin[heiti] || 0) + 1;
      if (bin === falin) { const k = u.status || '(tómt)'; falinSt[k] = (falinSt[k] || 0) + 1; }
    });
    // Skynjari: næsta skoðun (virk tæki) og hve mörg eru komin fram yfir
    const today = new Date().toISOString().slice(0, 10);
    let naesta = null, framYfir = 0;
    rows.forEach(u => { if (String(u.status || '').toLowerCase() !== 'active' || !u.next_insp) return; const d = String(u.next_insp).slice(0, 10); if (d < today) framYfir++; if (!naesta || d < naesta) naesta = d; });
    return { virk, falin, urelt, falinSt, alls: rows.length, naesta, framYfir, villa: r.error ? r.error.message : null };
  }
  async function sidastaSala(co) {
    const SB = getSB(); if (!SB) return null;
    let q = SB.from('solur').select('num,created_at,samtals,source,invoiced_at,customer_nafn').eq('source', 'uttekt');
    if (co.kennitala) q = q.eq('customer_kt', co.kennitala); else q = q.eq('customer_nafn', co.nafn);
    const r = await q.order('created_at', { ascending: false }).limit(1);
    return (r.data && r.data[0]) || null;
  }

  /* ── skynjarar (06.09.2026): nemur það sem bíður á kúnnanum — hver sókn sjálfstæð, bilun = null ── */
  const HUB = 'https://brunaholf.netlify.app';
  async function skynjarar(co) {
    const SB = getSB();
    const kt = String(co.kennitala || '').replace(/\D/g, '');
    const out = { kost: null, krofur: null, postur: null, punktar: null };
    await Promise.all([
      (async () => { try { if (window.KostVidvorun && KostVidvorun.bidur) { const j = await KostVidvorun.bidur(kt, co.nafn); if (j && j.samtals && j.samtals.n) out.kost = { n: j.samtals.n, kr: Math.round(j.samtals.endurkrafa_an_vsk || 0), rows: j.rows || [] }; } } catch (_) {} })(),
      (async () => { try { if (!SB) return; let q = SB.from('solur').select('id,num,samtals,created_at,krafa_sent_at').eq('status', 'final').is('paid_at', null); q = kt.length >= 10 ? q.eq('customer_kt', kt) : q.eq('customer_nafn', co.nafn); const r = await q.order('created_at', { ascending: true }).limit(50); const rows = (r.data || []).filter(x => !x.is_credit && !x.hidden); if (rows.length) out.krofur = { n: rows.length, kr: Math.round(rows.reduce((a, x) => a + (Number(x.samtals) || 0), 0)), elst: rows[0].created_at, nums: rows.map(x => x.num).slice(0, 4) }; } catch (_) {} })(),
      (async () => { try { const d = window.CompanyMail && CompanyMail.data ? CompanyMail.data(co.id) : null; if (d && d.unreplied) out.postur = { subject: d.subject || '(engin efnislína)', from: d.from || '', dags: d.received_at }; } catch (_) {} })(),
      (async () => { try { const r = await fetch(HUB + '/api/reikningspunktar?status=nytt,flokkad&worksite=' + encodeURIComponent(co.nafn) + '&limit=20', { cache: 'no-store' }); const j = await r.json(); const rows = (j.rows || []).filter(x => x.felag === 'slokkvitaeki'); if (rows.length) out.punktar = { n: rows.length, linur: rows.slice(0, 3).map(x => String(x.raw || '').split('\n')[0].slice(0, 90)) }; } catch (_) {} })(),
    ]);
    return out;
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
    const co = d.co, t = d.taeki, k = d.skyn || {};
    const virkAlls = sum(t.virk), falinAlls = sum(t.falin), ureltAlls = sum(t.urelt);
    const vidv = !!(k.kost || k.krofur || k.postur || (t.framYfir > 0));
    const dags = s => { if (!s) return ''; const x = new Date(s); return isNaN(x) ? '' : String(x.getDate()).padStart(2, '0') + '.' + String(x.getMonth() + 1).padStart(2, '0') + '.' + x.getFullYear(); };
    const skynHtml =
      '<div style="margin-top:6px;border-top:1px dashed var(--brd,#d9dee5);padding-top:6px"><span style="' + S.lbl + '">Skynjarar</span>' + (vidv ? ' <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#b91c1c;vertical-align:middle" title="Eitthvað bíður"></span>' : '') +
        '<div style="display:grid;gap:2px;margin-top:3px">' +
        (k.kost ? '<div>🧾 <b style="' + S.warn + '">' + k.kost.n + ' kostnaðarreikning' + (k.kost.n === 1 ? 'ur bíður' : 'ar bíða') + ' endurrukkunar</b> · ' + isk(k.kost.kr) + ' kr án vsk</div>' : '<div style="' + S.dim + '">🧾 Engir kostnaðarreikningar bíða</div>') +
        (k.krofur ? '<div>💳 <b style="' + S.warn + '">' + k.krofur.n + ' ógreidd' + (k.krofur.n === 1 ? '' : 'ar') + ' sal' + (k.krofur.n === 1 ? 'a' : 'ur') + '</b> · ' + isk(k.krofur.kr) + ' kr · elst ' + dags(k.krofur.elst) + ' · ' + esc(k.krofur.nums.join(', ')) + '</div>' : '<div style="' + S.dim + '">💳 Engar ógreiddar sölur</div>') +
        (k.postur ? '<div>✉️ <b style="' + S.warn + '">Ósvaraður póstur</b> · ' + esc(k.postur.subject) + ' · ' + dags(k.postur.dags) + '</div>' : '<div style="' + S.dim + '">✉️ Enginn ósvaraður póstur (skv. umferðarljósi)</div>') +
        (t.naesta ? '<div>📅 Næsta skoðun ' + dags(t.naesta) + (t.framYfir ? ' · <b style="' + S.warn + '">' + t.framYfir + ' tæki komin fram yfir</b>' : '') + '</div>' : '<div style="' + S.dim + '">📅 Engin skoðunardagsetning á virkum tækjum</div>') +
        (k.punktar ? '<div>📝 <b>' + k.punktar.n + ' punkt' + (k.punktar.n === 1 ? 'ur bíður' : 'ar bíða') + ' í Drög-stöð</b><div style="' + S.dim + ';padding-left:18px">' + k.punktar.linur.map(esc).join('<br>') + '</div></div>' : '<div style="' + S.dim + '">📝 Engir punktar í Drög-stöð</div>') +
        '</div></div>';
    const v = d.vis;
    const visHtml = !v ? '' :
      '<div style="margin-top:6px;border-top:1px dashed var(--brd,#d9dee5);padding-top:6px"><span style="' + S.lbl + '">Vísbendingar um afgreiðslu</span> <span style="' + S.dim + '">— eftir að málið varð til ' + dags(d.malStofnad) + '. Sönnunargögn, ekki dómur: þú lokar.</span>' +
        '<div style="display:grid;gap:3px;margin-top:3px">' +
        (v.solur.length
          ? v.solur.map(x => '<div>🧾 <b>' + esc(x.num) + '</b> · ' + dags(x.d) + ' · ' + isk(x.kr) + ' kr · <span style="' + (x.teg === 'úttekt' ? S.ok : S.warn) + '">' + esc(x.teg) + '</span>' + (x.linur.length ? '<div style="' + S.dim + ';padding-left:18px">' + esc(x.linur.join(' · ')) + '</div>' : '') + '</div>').join('')
          : '<div style="' + S.dim + '">🧾 Engin sala á kúnnann eftir að málið varð til</div>') +
        (v.skyrslur.length
          ? v.skyrslur.map(x => '<div>📄 ' + esc(x.doc || 'skjal') + (x.ar ? ' ' + esc(x.ar) : '') + ' · ' + dags(x.d) + (x.nr ? ' · ' + esc(x.nr) : '') + '</div>').join('')
          : '<div style="' + S.dim + '">📄 Engin skýrsla/skjal skráð eftir að málið varð til</div>') +
        '</div></div>';
    const hooksHtml =
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
        '<button type="button" class="btn btn-sm" data-vbf="sala" data-fid="' + co.id + '" data-kt="' + esc(co.kennitala || '') + '" data-nafn="' + esc(co.nafn) + '" data-afsl="' + esc(co.afslattur_pct || 0) + '" title="Opna Sölu með þennan kúnna valinn">🧾 Nýr reikningur</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-vbf="punktur" data-nafn="' + esc(co.nafn) + '" title="Skrá punkt á kúnnann í Drög-stöð">📝 Punktur í Drög-stöð</button>' +
        (co.netfang ? '<a class="btn btn-outline btn-sm" href="mailto:' + esc(co.netfang) + '" title="' + esc(co.netfang) + '">✉️ Senda póst</a>' : '') +
      '</div>';
    const falinSt = Object.keys(t.falinSt || {}).map(s => '„' + esc(s) + '" ' + t.falinSt[s]).join(', ');
    return '<div style="' + S.wrap + '">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px">' +
          '<button type="button" class="btn btn-sm" data-vbf="opna" data-fid="' + co.id + '">🏢 Opna fyrirtæki</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-vbf="saga" data-fid="' + co.id + '" data-src="fyrirtaeki" data-kt="' + esc(co.kennitala || '') + '" data-nafn="' + esc(co.nafn) + '">📄 Fyrri viðskipti</button>' +
          '<span style="' + S.dim + '">#' + co.id + ' · ' + esc(co.kennitala || 'kt vantar') + ' · ' +
            (co.er_i_thjonustu ? '<span style="' + S.ok + '">í þjónustu</span>' : '<span style="' + S.warn + '">EKKI í þjónustu</span>') + '</span>' +
          (d.fest ? '<span style="' + S.ok + ';font-size:11.5px" title="Málið geymir auðkenni fyrirtækisins (fyrirtaeki_id) — tengingin er óháð stafsetningu nafnsins">🔗 fest tenging</span>'
                  : (d.tid ? '<button type="button" class="btn btn-outline btn-sm" data-vbf="festa" data-tid="' + d.tid + '" data-fid="' + co.id + '" title="Skrifa auðkenni fyrirtækisins á málið — tengingin heldur þótt nafnið breytist">📌 Festa tengingu</button>' : '')) +
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
        skynHtml + visHtml + hooksHtml +
      '</div>';
  }

  /* ── málið: fyrirtaeki_id (07.09.2026) — fest tenging trompar nafn ───────── */
  const TICKET = new Map();   // tid → { t, fid, nafn }
  async function ticketInfo(tid) {
    if (!tid) return null;
    const c = TICKET.get(tid); if (c && Date.now() - c.t < 60000) return c;
    const SB = getSB(); if (!SB) return null;
    try {
      const r = await SB.from('thjonustubeidni').select('fyrirtaeki_id,customer_nafn,created_at,title').eq('id', tid).maybeSingle();
      const v = { t: Date.now(), fid: r.data ? (r.data.fyrirtaeki_id || null) : null, nafn: r.data ? (r.data.customer_nafn || '') : '', created: r.data ? r.data.created_at : null, title: r.data ? (r.data.title || '') : '' };
      TICKET.set(tid, v); return v;
    } catch (_) { return null; }
  }
  async function festa(tid, co) {
    const SB = getSB(); if (!SB || !tid || !co) return false;
    const r = await SB.from('thjonustubeidni').update({ fyrirtaeki_id: co.id, customer_base_id: co.customer_base_id || null, updated_at: new Date().toISOString() }).eq('id', tid);
    if (r.error) throw r.error;
    TICKET.delete(tid); return true;
  }

  /* ── vísbendingar um afgreiðslu (07.09.2026): SÝNA sönnunargögn, aldrei loka sjálfkrafa ── */
  const TEG = { uttekt: 'úttekt', bud: 'búðarsala', ovisst: 'óvisst', brunakerfi: 'brunakerfi' };
  async function visbendingar(co, since) {
    const SB = getSB(); if (!SB || !co || !since) return null;
    const kt = String(co.kennitala || '').replace(/\D/g, '');
    const out = { solur: [], skyrslur: [] };
    await Promise.all([
      (async () => { try {
        let q = SB.from('solur').select('num,created_at,samtals,source,vidskiptategund,linur,customer_id,customer_kt').eq('status', 'final').gt('created_at', since);
        q = kt.length >= 10 ? q.or('customer_id.eq.' + co.id + ',customer_kt.eq.' + kt) : q.eq('customer_id', co.id);
        const r = await q.order('created_at', { ascending: true }).limit(8);
        out.solur = (r.data || []).filter(x => !x.hidden).map(x => ({ num: x.num, d: x.created_at, kr: Number(x.samtals) || 0, teg: TEG[x.vidskiptategund] || x.vidskiptategund || x.source || '', linur: (Array.isArray(x.linur) ? x.linur : []).map(l => String(l.desc || l.lysing || '').trim()).filter(Boolean).slice(0, 4) }));
      } catch (_) {} })(),
      (async () => { try {
        const r = await SB.from('customer_documents').select('doc_type,year,created_at,invoice_number').eq('fyrirtaeki_id', co.id).gt('created_at', since).order('created_at', { ascending: true }).limit(8);
        out.skyrslur = (r.data || []).map(x => ({ doc: x.doc_type, ar: x.year, d: x.created_at, nr: x.invoice_number }));
      } catch (_) {} })(),
    ]);
    return out;
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
      const eb = co.querySelector('[data-act="editco"][data-id]');
      return { el: co, nafn, mode: 'sel', tid: eb ? Number(eb.getAttribute('data-id')) || null : null };
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
    const tinfo = a.tid ? await ticketInfo(a.tid) : null;
    const fid = tinfo && tinfo.fid ? tinfo.fid : null;
    if (!nafn && !fid) { const h = document.getElementById(HOST_ID); if (h) h.remove(); return; }
    const host = placeHost(a);
    const key = (a.tid ? 't' + a.tid + '|' : '') + (fid ? 'f' + fid : nafn);
    host.dataset.nafn = key;
    const c = CACHE[key];
    if (c) { host.innerHTML = c.html; if (Date.now() - c.t < CACHE_MS) return; }
    else host.innerHTML = '<div style="' + S.wrap + ';' + S.dim + '">Sæki tækjalista…</div>';
    const my = ++seq;
    let html;
    try {
      let f = await finnaFyrirtaeki(nafn);
      if (fid) { const all = await companies(); const hit = all.find(x => Number(x.id) === Number(fid)); if (hit) f = { stada: 'eitt', hits: [hit], fest: true }; }
      if (f.stada === 'ekkert') {
        const e = await finnaEinstakling(nafn);
        html = e ? htmlFor({ einst: e })
                 : htmlFor({ villa: '„' + nafn + '" finnst hvorki í fyrirtækjaskrá né viðskiptavinaskrá.', hint: 'Nafnið verður að stemma við fyrirtaeki.nafn — ✏️ Tengja til að velja rétt nafn, annars tengist málið engu.' });
      } else if (f.stada === 'margt') {
        html = htmlFor({ villa: 'Nafnið „' + nafn + '" á við ' + f.hits.length + ' fyrirtæki (' + f.hits.map(h => '#' + h.id).join(', ') + ').', hint: '✏️ Tengja og veldu nákvæmara nafn.' });
      } else {
        const co = f.hits[0];
        const [taeki, sala, skyn, vis] = await Promise.all([taekiFyrir(co.id), sidastaSala(co), skynjarar(co), (tinfo && tinfo.created) ? visbendingar(co, tinfo.created) : Promise.resolve(null)]);
        html = (taeki && taeki.villa) ? htmlFor({ villa: 'Náði ekki í tækjalistann: ' + taeki.villa })
                                      : htmlFor({ co, taeki: taeki || { virk: {}, falin: {}, urelt: {}, falinSt: {}, alls: 0 }, sala, skyn, fest: !!f.fest, tid: a.tid || null, vis, malStofnad: tinfo && tinfo.created ? tinfo.created : null });
      }
    } catch (e) { html = htmlFor({ villa: 'Náði ekki í tækjalistann: ' + (e && e.message ? e.message : e) }); }
    if (my !== seq) return;
    CACHE[key] = { t: Date.now(), html };
    const a2 = findAnchor();
    if (a2 && (a2.tid === a.tid) && (a2.nafn === nafn || fid)) { const h2 = placeHost(a2); h2.dataset.nafn = key; h2.innerHTML = html; }
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
    if (act === 'sala') {
      // sama leið og 352 (karfa úr Drög-stöð): skipta á Sölu, setja kúnnann í POS-ástandið og reitina
      const kt = t.getAttribute('data-kt') || '', nafn = t.getAttribute('data-nafn') || '', afsl = Number(t.getAttribute('data-afsl')) || 0;
      try { App.switchView('sala'); } catch (_) {}
      setTimeout(() => {
        try {
          const st = window.POS && POS.getState ? POS.getState() : null; if (!st) return;
          st.customer = Object.assign(st.customer || {}, { mode: 'kt', kt, nafn, co_id: fid || null, afslattur_pct: afsl });
          st.discount_pct = afsl;
          const ktEl = document.getElementById('pos-kt'), nEl = document.getElementById('pos-nafn');
          if (ktEl && kt) { ktEl.value = kt; ktEl.dispatchEvent(new Event('input', { bubbles: true })); }
          if (nEl) { nEl.value = nafn; nEl.dispatchEvent(new Event('input', { bubbles: true })); }
          if (POS.rerenderDynamic) POS.rerenderDynamic();
          if (window.Toast && Toast.show) Toast.show('🧾 ' + nafn + ' valinn í Sölu');
        } catch (e) { console.warn('[358] sala', e); }
      }, 450);
      return;
    }
    if (act === 'festa') {
      const tid = Number(t.getAttribute('data-tid')), cfid = Number(t.getAttribute('data-fid'));
      t.disabled = true;
      companies().then(all => festa(tid, all.find(x => Number(x.id) === cfid))).then(ok => {
        if (window.Toast && Toast.show) Toast.show(ok ? '🔗 Tenging fest við mál #' + tid : '⚠ Tókst ekki að festa');
        Object.keys(CACHE).forEach(k => { if (k.startsWith('t' + tid + '|')) delete CACHE[k]; });
        byggja();
      }).catch(e => { t.disabled = false; if (window.Toast && Toast.show) Toast.show('⚠ ' + (e && e.message || e)); });
      return;
    }
    if (act === 'punktur') {
      const nafn = t.getAttribute('data-nafn') || '';
      // 09.09.2026 (ósk Agnars: „enginn texti má nokkurntíma tínast").
      // Áður: eitt `prompt()`, og mistækist POST-ið var textinn horfinn með
      // glugganum — notandinn fékk aðeins „⚠ Tókst ekki að skrá punkt" og varð
      // að muna og skrifa allt upp á nýtt. Nú er reynt aftur með textann
      // forskrifaðan, svo hann glatist ekki þótt netið eða hub-inn klikki.
      (function skra(forskrift) {
        const raw = prompt('Punktur á ' + nafn + ' (Drög-stöð):', forskrift || '');
        if (raw == null || !raw.trim()) return;            // Hætta við = meðvituð ákvörðun
        const texti = raw.trim();
        fetch(HUB + '/api/reikningspunktar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'add', raw: texti, felag: 'slokkvitaeki', worksite_name: nafn, source: 'hub', author: 'Þjónustuborð' }) })
          .then(r => r.json())
          .then(j => {
            if (j && j.row) {
              if (window.Toast && Toast.show) Toast.show('📝 Punktur skráður á ' + nafn);
              const host = document.getElementById(HOST_ID); if (host) { delete CACHE[nafn]; byggja(); }
              return;
            }
            throw new Error((j && j.error) || 'hub tók ekki við punktinum');
          })
          .catch(e => {
            try { if (window.logProblem) window.logProblem('verkbord_punktur_failed', nafn + ' — ' + ((e && e.message) || e)); } catch (_) {}
            if (window.Toast && Toast.show) Toast.show('⚠ Punkturinn vistaðist EKKI — textinn kemur aftur');
            // Aftur með textann inni: ekkert tapast þótt notandinn hætti við núna.
            setTimeout(() => skra(texti), 250);
          });
      })('');
      return;
    }
    if (act === 'saga' && window.SalaCustomerHistory && SalaCustomerHistory.open) {
      SalaCustomerHistory.open({ id: String(fid || ''), source: t.getAttribute('data-src') || 'fyrirtaeki', kt: t.getAttribute('data-kt') || '', nafn: t.getAttribute('data-nafn') || '' });
    }
  }, true);

  // 231 teiknar VALIÐ MÁL upp á nýtt við val/vistun — fylgjast með DOM og setja reitinn aftur inn.
  // ATH: síðan mælist með ~1.750 DOM-breytingar/s (has-mobnav/vnav-stimplun, mesta bil 79 ms) svo
  // debounce (bíða eftir ró) hleypur ALDREI — nota throttle: athuga í mesta lagi á 400 ms fresti.
  function athuga() {
    const a = findAnchor();
    const host = document.getElementById(HOST_ID);
    if (!a || !a.nafn) { if (host) host.remove(); return; }
    const want = (a.tid ? 't' + a.tid + '|' : '');
    if (!host || !host.isConnected || !(host.dataset.nafn || '').startsWith(want) || (!a.tid && host.dataset.nafn !== a.nafn)) byggja(a);
  }
  let bidin = null, sidast = 0;
  function tikk() { bidin = null; sidast = Date.now(); try { athuga(); } catch (_) {} }
  const obs = new MutationObserver(function () {
    if (bidin) return;
    bidin = setTimeout(tikk, Math.max(60, 400 - (Date.now() - sidast)));
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  // val á röð (selrow) → athuga strax á eftir endurteikningu 231
  document.addEventListener('click', function (e) {
    const r = e.target.closest && e.target.closest('[data-act="selrow"],[data-act="expand"],[data-act="selco-save"]');
    if (r && r.getAttribute('data-act') === 'selco-save') { TICKET.clear(); Object.keys(CACHE).forEach(k => { if (k.startsWith('t')) delete CACHE[k]; }); }
    if (r) [350, 1200].forEach(t => setTimeout(() => { try { athuga(); } catch (_) {} }, t));
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-field') === 'customer_nafn') setTimeout(() => byggja(), 300);
  });

  // VALIÐ MÁL getur verið teiknað ÁÐUR en þessi pappi hleðst (engin breyting á DOM á eftir) — byggja við ræsingu
  // og við sýnaskipti; MutationObserver sér um afganginn.
  [1200, 4000].forEach(t => setTimeout(() => { try { byggja(); } catch (_) {} }, t));
  window.addEventListener('hashchange', () => setTimeout(() => { try { byggja(); } catch (_) {} }, 800));
  window.VbFyrirtaeki = { byggja, findAnchor, finnaFyrirtaeki, taekiFyrir, skynjarar, version: '358g' };
  console.log('[358-verkbord-fyrirtaeki] virkur');
})();
/* === END ÞJÓNUSTUBORÐ → FYRIRTÆKI === */
