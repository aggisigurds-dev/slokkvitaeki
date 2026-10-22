// _gatt-bgr.cjs — Búnaðargreining (tafla bunadargreining) → kúnna-örugg gögn fyrir Þjónustugáttina (gatt/bunadargreining.js).
// Aðeins það sem má sjást: hæðirnar sem greiningin las (mynd, skurður, merki), fjöldi, brunavarnatexti úr byggingarlýsingu og
// heimildir. ALDREI `athugasemdir` (innri), `af`, `skyrsla` eða verð. Flokkun merkja = sama og 474 (flokkur/bunadur).
const YL_SLOD = /^https:\/\/osfdzskyvisifcwyjkuk\.supabase\.co\/storage\/v1\/object\/public\/turbopaint\/bgr-yfirlag\//;
const LITIR = { sl: '#e11d2e', bs: '#2563eb', ut: '#15803d', r: '#9333ea', bk: '#6d28d9', hiti: '#ea580c' };

function flokkurTki(t) {
  const fl = String(t && t.flokkur || '');
  const bun = String(t && t.bunadur || '');
  if (fl === 'flotti') return 'ut';
  if (fl === 'brunakerfi') return /hita/i.test(bun) ? 'hiti' : /reykskynj/i.test(bun) ? 'r' : 'bk';
  return /slang|kefli/i.test(bun) ? 'bs' : 'sl';
}

// r = röð úr bunadargreining, bord = teikning_bord.haedir (til vara þegar greiningin á enga sér teikningu)
function bgrSnid(r, bord) {
  if (!r || typeof r !== 'object') return null;
  const tki = Array.isArray(r.tki) ? r.tki.filter((t) => t && typeof t === 'object') : [];
  if (!tki.length) return null;
  const bordM = {};
  (Array.isArray(bord) ? bord : []).forEach((h) => { if (h && h.id) bordM[h.id] = h; });
  const haedir = [], kort = {};
  const nyHaed = (id, nafn, mynd, frum, skurdur) => {
    if (!id || !mynd || kort[id]) return kort[id] || null;
    kort[id] = { id, nafn: nafn || '', mynd, frum: frum && frum.b > 0 ? { b: frum.b, h: frum.h } : null,
      skurdur: skurdur && skurdur.w > 8 && skurdur.h > 8 ? { x: skurdur.x, y: skurdur.y, w: skurdur.w, h: skurdur.h } : null,
      merki: [], tel: { sl: 0, bs: 0, ut: 0, r: 0, bk: 0, hiti: 0 } };
    haedir.push(kort[id]);
    return kort[id];
  };
  (Array.isArray(r.teikningar) ? r.teikningar : []).forEach((t) => { if (t) nyHaed(t.id, '', t.mynd, t.frum, t.skurdur); });
  // hæðarheitið: úr atriðunum sjálfum („3. hæð“), annars af borðinu — ekki „… — aðaluppdráttur 2018 (blað 3/7)“
  tki.forEach((t) => {
    const id = t.blad || t.haed_id;
    let h = kort[id];
    if (!h && bordM[id]) h = nyHaed(id, bordM[id].nafn, bordM[id].image_url, bordM[id].frum, bordM[id].skurdur);
    if (h && !h.nafn) h.nafn = String(t.haed || (bordM[id] && bordM[id].nafn) || '');
  });
  let utan = 0;
  tki.forEach((t) => {
    const fl = flokkurTki(t), id = t.blad || t.haed_id, h = kort[id];
    if (!h) { utan++; return; }
    h.tel[fl]++;
    const x = +t.bx, y = +t.by;
    if (t.bx != null && t.by != null && isFinite(x) && isFinite(y)) {
      const merki = fl === 'bk' || fl === 'hiti' || fl === 'r' ? '' : String(t.audkenni || '');
      h.merki.push([Math.round(x), Math.round(y), LITIR[fl], merki, fl, String(t.stadur || '').slice(0, 120)]);
    }
  });
  haedir.forEach((h) => { if (!h.nafn) h.nafn = 'Hæð'; });
  // TILLÖGUR ARNOLDS (bunadargreining.tillogur): áætluð þörf + staðsetning slökkvitækja/slöngukefla þar sem teikningin tilgreinir engin.
  // Aldrei blandað í tki/tel — eigin teljarar (till_sl/till_bs) og eigið merkjalag, svo kúnninn sjái hvað er hannað og hvað er áætlað.
  const tl = r.tillogur && typeof r.tillogur === 'object' ? r.tillogur : null;
  if (tl && Array.isArray(tl.tki)) {
    const byId = {}; haedir.forEach((h) => { byId[h.id] = h; });
    tl.tki.forEach((t) => {
      const h = t && byId[t.blad]; const x = t && +t.bx, y = t && +t.by;
      if (!h || (t.flokkur !== 'sl' && t.flokkur !== 'bs') || !isFinite(x) || !isFinite(y)) return;
      (h.till = h.till || []).push([Math.round(x), Math.round(y), LITIR[t.flokkur], t.flokkur, String(t.stadur || '').slice(0, 120)]);
      h.tel['till_' + t.flokkur] = (h.tel['till_' + t.flokkur] || 0) + 1;
    });
    const kr = tl.krofur && typeof tl.krofur === 'object' ? tl.krofur : {};
    haedir.forEach((h) => { const k = kr[h.id]; if (k && typeof k === 'object') h.krafa = { m2: +k.m2 > 0 ? Math.round(+k.m2) : null, sl: +k.sl || 0, bs: +k.bs || 0 }; });
  }
  // mynd hæðarinnar með greiningunni teiknaðri ofan á (bunadargreining.yfirlag → turbopaint/bgr-yfirlag): aðeins slóðir úr okkar eigin möppu
  const yl = (Array.isArray(r.yfirlag) ? r.yfirlag : []).filter((x) => x && typeof x.url === 'string' && YL_SLOD.test(x.url));
  haedir.forEach((h) => { const m = yl.find((x) => x.haed_id && x.haed_id === h.id) || yl.find((x) => x.haed && h.nafn && x.haed === h.nafn); if (m) { h.yl = m.url; if (h.nafn && m.haed && m.haed !== h.nafn && m.haed.indexOf(h.nafn) === 0) h.nafn = String(m.haed).slice(0, 80); } });   // „1. hæð, Þingholtsstræti 5“ þegar tvö blöð heita „1. hæð“
  const texti = (Array.isArray(r.texti) ? r.texti : []).map((t) => ({
    titill: String(t && t.titill || ''), heimild: String(t && t.heimild || ''),
    kaflar: (Array.isArray(t && t.kaflar) ? t.kaflar : []).filter((k) => k && k.texti).map((k) => ({ fyrirsogn: String(k.fyrirsogn || ''), texti: String(k.texti), lykill: !!k.lykill })),
  })).filter((t) => t.kaflar.length);
  const heimildir = (Array.isArray(r.heimildir) ? r.heimildir : []).filter((h) => h && h.titill && h.gildir !== false)
    .map((h) => ({ titill: String(h.titill), dags: h.dags || null })).slice(0, 8);
  const till = tl && haedir.some((h) => h.till && h.till.length) ? { at: String(tl.at || '').slice(0, 10), nota: String(tl.nota || '').slice(0, 400) } : null;
  return { dags: r.created_at || null, yfirfarin: r.stada === 'yfirfarin', haedir, utan, texti, heimildir, till };
}

module.exports = { bgrSnid, flokkurTki, LITIR };
