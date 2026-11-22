// _tekjulidir.cjs — TEKJULIÐIR SLÖKKVITÆKIS (fasi 3, Agnar 22.11.2026: „hafðu þetta aðgengilegt og vel tengt“). Hrein föll, ekkert net.
//
// EITT flokkunarfall (flokkaLinu) fyrir ALLA staði: Rekstrarskýrsla Brunahólfs (kafli „Tekjuliðir Slökkvitækis“ — fær gögnin gegnum
// brunaholf /api/tekjulidir sem kallar á slokkvitaeki /api/tekjulidir) og Tekjur í beinni (3–5 stærstu flokkarnir). Ekkert afrit.
//
// FLOKKUN — 15 flokkar í 6 hópa. Hver sölulína fer í FYRSTA flokk sem passar (röðin hér að neðan ræður). Gildi línu = qty × unit_price_ex_vat ×
// upphaed_an_vsk ÷ Σ(qty × unit_price_ex_vat) sölunnar, svo sölu-AFSLÁTTUR dreifist hlutfallslega á línurnar og flokkarnir leggja upp í
// nákvæmlega upphaed_an_vsk (staðfest í grunni 22.11.2026: 28.739.251 kr. frá 04.05 = Σ solur final, kredit dregið frá).
//   05 Brunakerfi            vt 'brunakerfi' (ÖLL salan; skoðunarlínur bera ekki tegund tækis)
//   01 Yfirferð              d 'Yfirferð ·…' eða Þjónusta-vara með 'yfirferð'
//   02 Hleðsla               d 'Hleðsla ·…' eða Þjónusta-vara með 'hleðsla'
//   03 Ný slökkvitæki        vara í vörulista (solulinaVara) með flokk 'Slökkvitæki'
//   04 Ný án vörutengingar   d 'Nýtt ·…' eða 'Slökkvitæki …'
//   06 Skýrslugerð úttekta   d inniheldur 'skýrslu'
//   07 CO₂ hylki og kútar    vara/d byrjar á 'CO₂' eða 'CO2'
//   08 Akstur                d 'Akstur…'
//   09 Vinna, uppsetning     vörulistaflokkur 'Vinna og akstur' eða d byrjar á vinna|uppsetning|sérfræði|útkall
//   10 Reykskynjarar         d byrjar á 'reykskynjari'  ·  vörulistaflokkur 'Skynjarar og rafhlöður'
//   11 Skilti og skoðunarmiðar  d byrjar á 'skilti' eða 'skoðunarmiðar'  ·  vörulistaflokkur 'Skilti, ljós og miðar'
//   12 Leiga                 vörulistaflokkur 'Leiga'
//   13 Eldvarnarvörur o.fl.  flokkar Eldvarnir/Slökkvitækjafestingar/Brunaslöngurhjól/Varahlutir/Sjúkratöskur/Ýmsar vörur
//   14 Skoðun slökkvikerfa   vt 'slokkvikerfi'
//   15 Smávörur/annað        allt annað
//
// MÁNUÐIR fylgja sömu reglum og „Unnið“ (_unnid-sl.cjs): skoðun (ársþjónusta, brunakerfi, slökkvikerfi) í skoðunarmánuði, verkstæðishluti á
// klart_at, kreditnóta á dag frumsölu. Línur sölu dreifast á mánuði sölunnar í HLUTFALLI við mánaðahluta hennar (verkstæðishluti sem
// færist milli mánaða fer FYRST á yfirferðar-, hleðslu- og CO₂-línur sölunnar (verkstæðisvinnan), afgangurinn dreifist hlutfallslega). Heildin er alltaf = Σ solur final:
// „í vinnslu“ (verkstæði ekki klárt) og „fyrir yfirtöku“ (skoðun fyrir 05.2026) eru eigin dálkar, aldrei hent.
// Fyrirvarar (birtast í ⓘ): línur án vörutengingar eru flokkaðar eftir texta; CO₂-fjöldi er hylki/stykki, ekki tæki; reikningar sem eru gerðir
// beint í Payday (ekki í kerfinu) eru ekki með; afsláttur er dreifður hlutfallslega.
'use strict';

const T = require('./_tekjur.cjs');
const U = require('./_unnid-sl.cjs');

const FLOKKAR = [
  { id: '01', heiti: 'Yfirferð', hopur: 'thjonusta' },
  { id: '02', heiti: 'Hleðsla', hopur: 'thjonusta' },
  { id: '06', heiti: 'Skýrslugerð úttekta', hopur: 'thjonusta' },
  { id: '08', heiti: 'Akstur', hopur: 'thjonusta' },
  { id: '03', heiti: 'Ný slökkvitæki (vörulisti)', hopur: 'ny' },
  { id: '04', heiti: 'Ný slökkvitæki (án vörutengingar)', hopur: 'ny' },
  { id: '05', heiti: 'Brunakerfi', hopur: 'brunakerfi' },
  { id: '14', heiti: 'Skoðun slökkvikerfa', hopur: 'brunakerfi' },
  { id: '07', heiti: 'CO₂ hylki og kútar', hopur: 'co2' },
  { id: '10', heiti: 'Reykskynjarar og rafhlöður', hopur: 'vorur' },
  { id: '11', heiti: 'Skilti, ljós og skoðunarmiðar', hopur: 'vorur' },
  { id: '13', heiti: 'Eldvarnarvörur, festingar, varahlutir', hopur: 'vorur' },
  { id: '15', heiti: 'Smávörur og annað', hopur: 'vorur' },
  { id: '09', heiti: 'Vinna, uppsetning og ráðgjöf', hopur: 'vinna' },
  { id: '12', heiti: 'Leiga', hopur: 'vinna' },
];
const HOPAR = [
  { id: 'thjonusta', heiti: 'Þjónusta á tækjum' }, { id: 'ny', heiti: 'Ný tæki' }, { id: 'brunakerfi', heiti: 'Brunakerfi' },
  { id: 'co2', heiti: 'CO₂' }, { id: 'vorur', heiti: 'Vörur og búnaður' }, { id: 'vinna', heiti: 'Vinna og leiga' },
];
const FL_HEITI = Object.fromEntries(FLOKKAR.map((f) => [f.id, f.heiti]));
const FL_HOPUR = Object.fromEntries(FLOKKAR.map((f) => [f.id, f.hopur]));
const VERKSTAEDISFLOKKAR = new Set(['01', '02', '07']);        // verkstæðisvinna: yfirferð, hleðsla, CO₂ — V-hluti sölu fer fyrst á þessar línur
const TAEKJAFLOKKAR = new Set(['01', '02', '03', '04']);     // stk = fjöldi tækja í þessum flokkum
const SOLUTEGUNDIR = [
  { id: 'uttektir', heiti: 'Úttektir (ársþjónusta)' }, { id: 'afgreidsla', heiti: 'Afgreiðsla' }, { id: 'brunakerfi', heiti: 'Brunakerfi' }, { id: 'annad', heiti: 'Annað' },
];
const TEGUND_UR_VT = { uttekt: 'uttektir', bud: 'afgreidsla', brunakerfi: 'brunakerfi' };

// ── vörulisti → sölulína (= public.solulina_vara, eins og brunaholf _rekstur.js solulinaVara) ──────────────────────────────────────
function vorurKort(vorur) {
  const byId = new Map(), byNafn = new Map();
  const rodud = [...(vorur || [])].sort((a, b) => (b.virkt === true) - (a.virkt === true) || Number(a.id) - Number(b.id));
  for (const v of rodud) {
    byId.set(Number(v.id), v);
    const k = String(v.nafn || '').trim().toLowerCase();
    if (k && !byNafn.has(k)) byNafn.set(k, v);
  }
  return { byId, byNafn };
}
function solulinaVara(l, kort) {
  const pid = l && l.product_id != null ? String(l.product_id) : '';
  if (/^\d+$/.test(pid)) return kort.byId.get(Number(pid)) || null;
  if (pid !== '') return null;
  const nafn = String((l && l.desc) || '').replace(/^\s*(Nýtt|Vara)\s*·\s*/i, '').replace(/\s*·\s*[−-]\s*\d+([.,]\d+)?\s*%.*$/, '').trim().toLowerCase();
  return kort.byNafn.get(nafn) || null;
}

// ── EITT flokkunarfall ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function flokkaLinu(l, vt, vara) {
  const d = String((l && l.desc) || '').trim().toLowerCase();
  const vn = vara ? String(vara.nafn || '').toLowerCase() : '';
  const vf = vara ? String(vara.flokkur || '') : '';
  if (vt === 'brunakerfi') return '05';
  if (d.startsWith('yfirferð ·') || (vf === 'Þjónusta' && vn.includes('yfirferð'))) return '01';
  if (d.startsWith('hleðsla ·') || (vf === 'Þjónusta' && vn.includes('hleðsla'))) return '02';
  if (vf === 'Slökkvitæki') return '03';
  if (d.startsWith('nýtt ·') || d.startsWith('slökkvitæki ')) return '04';
  if (d.includes('skýrslu')) return '06';
  if ((vn || d).startsWith('co₂') || d.startsWith('co₂') || /^co2/.test(d)) return '07';
  if (d.startsWith('akstur')) return '08';
  if (vf === 'Vinna og akstur' || /^(vinna|uppsetning|sérfræði|útkall)/.test(d)) return '09';
  if (vf === 'Skynjarar og rafhlöður' || d.startsWith('reykskynjari')) return '10';
  if (vf === 'Skilti, ljós og miðar' || d.startsWith('skilti') || d.startsWith('skoðunarmiðar')) return '11';
  if (vf === 'Leiga') return '12';
  if (['Eldvarnir', 'Slökkvitækjafestingar', 'Brunaslöngurhjól', 'Varahlutir', 'Sjúkratöskur', 'Ýmsar vörur'].includes(vf)) return '13';
  if (vt === 'slokkvikerfi') return '14';
  return '15';
}

// Hreint heiti línu fyrir „topp 8“: vöruheiti úr lista, annars línutexti án afsláttar og án forskeytis (Yfirferð · / Hleðsla · / Nýtt · / Vara ·).
function heitiLinu(l, vara) {
  if (vara && vara.nafn) return String(vara.nafn).trim();
  return String((l && l.desc) || '').replace(/^\s*(Yfirferð|Hleðsla|Nýtt|Vara)\s*·\s*/i, '').replace(/\s*·\s*[−-]\s*\d+([.,]\d+)?\s*%.*$/, '').trim().slice(0, 70) || '(án heitis)';
}

const kr = (n) => Math.round(Number(n) || 0);
const BUCKETS = ['i_vinnslu', 'fyrir_yfirtoku'];

// g = { solur, voidIds, frumsolur, skyrslur, verkbeidnir, verklidir, vorur } → tekjuliðir eftir mánuðum
function tekjulidir(g, nuIso) {
  const nuMan = T.manudur(nuIso);
  const un = U.unnidManudir(g, nuIso);
  const kort = vorurKort(g.vorur);
  const gildar = T.slokkvitaekiGildar(g.solur, g.voidIds);
  const mansSet = new Set();
  const fl = {};                         // id → { man:{m:kr}, stk_man:{m:n}, kr, stk }
  const tg = {};                         // sölutegund → { man:{m:kr} }
  const topp = {};                       // id → Map(heiti → { kr, stk, n, vara })
  let heildSolur = 0;
  const bæta = (o, m, v) => { o[m] = (o[m] || 0) + v; };
  const flTom = (id) => (fl[id] = fl[id] || { man: {}, stk_man: {} });
  for (const s of gildar) {
    const san = Number(s.upphaed_an_vsk) || 0;
    heildSolur += san;
    const vt = s.vidskiptategund;
    const linur = Array.isArray(s.linur) ? s.linur : [];
    const summa = linur.reduce((a, l) => a + (Number(l.qty != null ? l.qty : 1) || 0) * (Number(l.unit_price_ex_vat) || 0), 0);
    const hlutir = [];                    // [{ id, val, q, heiti, vara }]
    if (summa !== 0 && linur.length) {
      for (const l of linur) {
        const q = Number(l.qty != null ? l.qty : 1) || 0, p = Number(l.unit_price_ex_vat) || 0;
        const vara = solulinaVara(l, kort);
        hlutir.push({ id: flokkaLinu(l, vt, vara), val: (q * p * san) / summa, q, heiti: heitiLinu(l, vara), vara: !!vara && vara.flokkur !== 'Ýmsar vörur' });   // „Ýmsar vörur“ geta borið heiti kúnna: þær lúta n≥2-reglunni eins og ótengdar línur
      }
    } else if (san !== 0) {
      hlutir.push({ id: flokkaLinu({}, vt, null), val: san, q: 0, heiti: '(sala án lína)', vara: false });   // sala án verðlína: öll upphæðin í einn flokk eftir sölutegund
    }
    const dr = (un.dreifing && un.dreifing[s.id]) || [{ man: T.manudur(s.created_at), fl: 'grunn', hlutfall: 1 }];
    const tegund = TEGUND_UR_VT[vt] || 'annad';
    // Verkstæðishluti sölu (V, færist á klart_at) fer FYRST á línur sem eru verkstæðisvinna (yfirferð, hleðsla, CO₂); það sem er eftir af honum
    // og allt hitt dreifist hlutfallslega eftir mánaðahlutum sölunnar (heildin óbreytt).
    // blönduð formerki (t.d. kredit-lína í sölu): V-fyrst á ekki við — hlutfallsleg dreifing á alla mánaðahluta (heildin óbreytt)
    const blandad = hlutir.some((h) => h.val !== 0 && san !== 0 && Math.sign(h.val) !== Math.sign(san));
    const vH = blandad ? [] : dr.filter((d) => d.fl === 'verkstaedi'), gH = blandad ? dr : dr.filter((d) => d.fl !== 'verkstaedi');
    const wv = vH.reduce((a, d) => a + d.hlutfall, 0), wg = gH.reduce((a, d) => a + d.hlutfall, 0);
    let laug = Math.abs(wv * san);                                          // V-pottur (án formerkis)
    const skipt = hlutir.map((h) => ({ h, v: 0 }));
    if (vH.length && laug > 0) {
      for (const x of skipt.filter((y) => VERKSTAEDISFLOKKAR.has(y.h.id))) {
        const tak = Math.min(Math.abs(x.h.val), laug); x.v = Math.sign(x.h.val) * tak; laug -= tak;
      }
      const restHlutir = skipt.filter((y) => Math.abs(y.h.val) - Math.abs(y.v) > 1e-9);
      const restSumma = restHlutir.reduce((a, y) => a + Math.abs(y.h.val) - Math.abs(y.v), 0);
      if (laug > 1e-9 && restSumma > 0) for (const y of restHlutir) y.v += Math.sign(y.h.val) * laug * ((Math.abs(y.h.val) - Math.abs(y.v)) / restSumma);
    }
    for (const x of skipt) {
      const h = x.h, vHlutur = wv * san !== 0 ? x.v / (wv * san) : 0;       // hlutur línu af V-pottinum
      const f = flTom(h.id);
      const leggja = (m, v, q) => {
        if (!v && !q) return;
        mansSet.add(m); bæta(f.man, m, v);
        if (TAEKJAFLOKKAR.has(h.id)) bæta(f.stk_man, m, q);
        bæta((tg[tegund] = tg[tegund] || { man: {} }).man, m, v);
      };
      for (const d of vH) leggja(d.man, x.v * (d.hlutfall / wv), h.q * vHlutur * (d.hlutfall / wv));
      const afgangur = h.val - x.v, afgQ = h.q * (1 - vHlutur);
      for (const d of gH) leggja(d.man, wg !== 0 ? afgangur * (d.hlutfall / wg) : 0, wg !== 0 ? afgQ * (d.hlutfall / wg) : 0);
      if (!vH.length && !gH.length) leggja('i_vinnslu', h.val, h.q);
      const t = (topp[h.id] = topp[h.id] || new Map());
      const k = h.heiti.toLowerCase();
      const e = t.get(k) || { heiti: h.heiti, kr: 0, stk: 0, n: 0, vara: h.vara };
      e.kr += h.val; e.stk += h.q; e.n++; t.set(k, e);
    }
  }
  const manudir = [...mansSet].filter((m) => !BUCKETS.includes(m)).sort();
  const sumMan = (o) => Object.keys(o).filter((m) => !BUCKETS.includes(m)).reduce((a, m) => a + o[m], 0);
  const flokkar = FLOKKAR.map((d) => {
    const f = fl[d.id] || { man: {}, stk_man: {} };
    const man = {};
    for (const m of manudir) man[m] = kr(f.man[m]);
    const e = { id: d.id, heiti: d.heiti, hopur: d.hopur, man, samtals: manudir.reduce((a, m) => a + man[m], 0), i_vinnslu: kr(f.man.i_vinnslu), fyrir_yfirtoku: kr(f.man.fyrir_yfirtoku) };
    if (TAEKJAFLOKKAR.has(d.id)) { e.stk = Math.round(Object.keys(f.stk_man).reduce((a, m) => a + f.stk_man[m], 0)); }
    // topp 8: línur sem koma fyrir ≥ 2 sinnum eða eru tengdar vörulista (stakar, ótengdar línur geta verið texti sem á ekki að sjást) — afgangur = „stakar línur“
    const lista = [...(topp[d.id] || new Map()).values()];
    const sjanlegar = lista.filter((x) => x.n >= 2 || x.vara), stakar = lista.filter((x) => !(x.n >= 2 || x.vara));
    const tl = sjanlegar.sort((a, b) => Math.abs(b.kr) - Math.abs(a.kr)).slice(0, 8).map((x) => ({ heiti: x.heiti, stk: Math.round(x.stk * 10) / 10, kr: kr(x.kr) }));
    if (stakar.length) tl.push({ heiti: 'Stakar línur (ekki sýndar hver fyrir sig)', stk: Math.round(stakar.reduce((a, x) => a + x.stk, 0) * 10) / 10, kr: kr(stakar.reduce((a, x) => a + x.kr, 0)), stakar: stakar.length });
    e.topp = tl;
    return e;
  });
  const hopar = HOPAR.map((h) => {
    const medlimir = flokkar.filter((f) => f.hopur === h.id);
    const man = {};
    for (const m of manudir) man[m] = medlimir.reduce((a, f) => a + f.man[m], 0);
    return { id: h.id, heiti: h.heiti, flokkar: medlimir.map((f) => f.id), man, samtals: medlimir.reduce((a, f) => a + f.samtals, 0), i_vinnslu: medlimir.reduce((a, f) => a + f.i_vinnslu, 0), fyrir_yfirtoku: medlimir.reduce((a, f) => a + f.fyrir_yfirtoku, 0) };
  });
  const samtalsMan = {};
  for (const m of manudir) samtalsMan[m] = flokkar.reduce((a, f) => a + f.man[m], 0);
  const samtals = flokkar.reduce((a, f) => a + f.samtals, 0), iVinnslu = flokkar.reduce((a, f) => a + f.i_vinnslu, 0), fyrirYf = flokkar.reduce((a, f) => a + f.fyrir_yfirtoku, 0);
  const solutegundir = SOLUTEGUNDIR.map((t) => {
    const o = (tg[t.id] || { man: {} }).man;
    const man = {};
    for (const m of manudir) man[m] = kr(o[m]);
    return { id: t.id, heiti: t.heiti, man, samtals: kr(sumMan(o)), i_vinnslu: kr(o.i_vinnslu), fyrir_yfirtoku: kr(o.fyrir_yfirtoku) };
  });
  const heild = samtals + iVinnslu + fyrirYf;
  return {
    manudir, flokkar, hopar, solutegundir, samtals_man: samtalsMan, samtals, i_vinnslu: iVinnslu, fyrir_yfirtoku: fyrirYf, heild,
    heild_solur: kr(heildSolur), stemmir: Math.abs(heild - kr(heildSolur)) <= 30,    // rúnun á 15 × 9 reitum getur munað fáeinum krónum; raðir leggjast alltaf upp (samtals = Σ rúnnaðra reita)
    kredit_an_frumsolu: un.annad.kredit_an_frumsolu, nu_manudur: nuMan,
  };
}

// Stærstu flokkarnir í mánuði (Tekjur í beinni): [{ id, heiti, kr, hlutfall }] — aðeins flokkar með jákvæða tölu, stærstir fyrst
function toppFlokkar(res, man, n) {
  const tot = res.samtals_man[man] || 0;
  return res.flokkar.filter((f) => (f.man[man] || 0) > 0).sort((a, b) => b.man[man] - a.man[man]).slice(0, n || 5)
    .map((f) => ({ id: f.id, heiti: f.heiti, hopur: f.hopur, kr: f.man[man], hlutfall: tot > 0 ? Math.round((1000 * f.man[man]) / tot) / 10 : null }));
}

// Skýringin í ⓘ (ein heimild, prófuð)
const SKILGREINING = {
  almennt: 'Tekjuliðir Slökkvitækis eru sölulínur lokaðra sala (án vsk) flokkaðar í 15 flokka í 6 hópa. Hver lína fer í fyrsta flokk sem passar. Heildin er alltaf sama talan og lokaðar sölur í kerfinu (kreditnótur dregnar frá, bakfært og drög ekki talin).',
  manudir: 'Mánuðir fylgja sömu reglum og „Unnið“: skoðanir (ársþjónusta, brunakerfi, slökkvikerfi) í mánuði skoðunarinnar skv. skýrslunni, verkstæðishluti þegar tækið er klárt og sent í afgreiðslu (klart_at; tómt = söludagur), kreditnóta á dag frumsölunnar. Verkstæði sem er ekki klárt er í dálknum „á verkstæði“ og skoðun fyrir 05.2026 í „fyrir yfirtöku“ — aldrei hent.',
  afslattur: 'Sölu-afsláttur er dreifður hlutfallslega á línur sölunnar (lína × upphæð sölu ÷ Σ línuverð), svo flokkarnir leggja upp í nákvæmlega upphæð sölunnar.',
  fyrirvarar: 'Línur án vörutengingar eru flokkaðar eftir texta. CO₂-talan er fjöldi hylkja/stykkja, ekki tæki. Verkstæðishluti sölu sem færist milli mánaða fer fyrst á yfirferðar-, hleðslu- og CO₂-línur sölunnar, afgangurinn hlutfallslega. Reikningar sem eru gerðir beint í Payday (ekki í kerfinu) eru ekki með. Stakar línur með texta sem kemur aðeins einu sinni fyrir eru ekki sýndar hver fyrir sig.',
  flokkar: 'Flokkun: 05 Brunakerfi (öll salan) · 01 Yfirferð · 02 Hleðsla · 03 Ný slökkvitæki úr vörulista · 04 Ný án vörutengingar · 06 Skýrslugerð · 07 CO₂ · 08 Akstur · 09 Vinna/uppsetning/ráðgjöf · 10 Reykskynjarar · 11 Skilti og skoðunarmiðar · 12 Leiga · 13 Eldvarnarvörur/festingar/varahlutir · 14 Skoðun slökkvikerfa · 15 Smávörur/annað.',
};

module.exports = { SKILGREINING, FLOKKAR, HOPAR, FL_HEITI, FL_HOPUR, SOLUTEGUNDIR, flokkaLinu, heitiLinu, vorurKort, solulinaVara, tekjulidir, toppFlokkar };
