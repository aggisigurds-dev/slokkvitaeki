/* _afgreidsla-dyr.cjs — DYR á hverjum lið Afgreiðslunnar (Agnar 18.11.2026).
 *
 * Orð Agnars: „Afgreiðslan virkar ekki, og ennþá næstum ekkert hægt að gera í flestum liðum þarna, ennþá bara
 * upplýsingagluggi“ · „Þetta er bara alls ekki vinnuborð“ · „Þetta á að vera portal, sendir mig þá þangað sem ég get gert
 * eitthvað beint“ · „Ég vil helst geta gert allt beint þaðan af borðinu, að ég þurfi ekki að ýta á hliðarstikuna og leita“.
 *
 * Mælt sama dag: af 50 liðum buðu 42 aðeins „Lesið — loka“, „Búið“ eða „Setja á Verkefnalistann“. Samt báru þeir það sem
 * þarf til að opna dyr: málsnúmer, reikningsnúmer, símanúmer, kennitölu, lista af félögum. Þetta breytir þeim auðkennum í
 * DYR — { teg, id, heiti, slod } — sem viðmótið sýnir sem takka. Í appinu opnar takkinn færsluna OFAN Á borðinu
 * (js/patches/521-gatt.js, Gatt.opna); úr /afgreidsla.html er slóðin notuð.
 *
 * REGLUR (þær sömu og um aðrar tilvísanir, sjá leysaTilvisanir í afgreidsla.cjs):
 *   · Aðeins auðkenni sem STANDA í liðnum sjálfum og FINNAST í grunninum verða dyr. Aldrei nafnagisk: félag er aðeins
 *     tengt um fyrirtaeki_id, sölu (solur.customer_id), mál (thjonustubeidni.fyrirtaeki_id) eða kennitölu sem á sér
 *     NÁKVÆMLEGA einn stað. Rekstrarfélag með marga staði á sömu kennitölu fær engar félagsdyr af kennitölunni.
 *   · Lokað, eytt eða geymt mál fær engar dyr — þær lofuðu þá einhverju sem gerist ekki.
 *   · Dyr sem agent setur sjálfur (gogn.dyr) fara aðeins í gegn með þekktri tegund og heiltöluauðkenni.
 *   · Ekkert hér skrifar; allt er lestur. Bregðist uppflettingin koma liðirnir samt, án dyra. */
'use strict';

const RNR = /\bR-\d{6}\b/g;                    // Slökkvitæki: sex stafa reikningsnúmer (solur.num)
const MAL = /mál\s*#\s*(\d{1,6})\b/gi;
const TEGUNDIR = ['mal', 'felag', 'sala', 'krafa', 'gleymt', 'arsskodun', 'verkbeidni'];
const MEST_REIKN = 3, MEST_MAL = 3, MEST_LISTI = 80;

const einstok = (a) => [...new Set(a)];
const heil = (x) => { const n = Number(x); return Number.isInteger(n) && n > 0 ? n : 0; };
const stutt = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

/* Símanúmer → tel:-slóð. Fyrsta íslenska númerið í strengnum (7 stafir, með eða án +354 / bila / bandstriks). */
function simaslod(s) {
  const m = /(?:\+?354[\s-]?)?\b(\d{3})[\s-]?(\d{4})\b/.exec(String(s || ''));
  return m ? { slod: 'tel:+354' + m[1] + m[2], numer: m[1] + ' ' + m[2] } : null;
}

/* Auðkennin sem liðurinn ber. Titillinn ræður mestu: reikningurinn eða málið sem STENDUR Í TITLINUM er það sem liðurinn
 * snýst um; annað í rökum og lýsingu er samhengi. Þess vegna titill fyrst, svo gögnin, síðast annar texti. */
function audkenni(row) {
  const g = (row && row.gogn && typeof row.gogn === 'object') ? row.gogn : {};
  const titill = String((row && row.titill) || '');
  const annad = [typeof row.af_hverju === 'string' ? row.af_hverju : JSON.stringify(row.af_hverju || ''), row.hvad_gerist, g.lysing].map((x) => String(x || '')).join(' ');
  const malUr = (t) => [...t.matchAll(MAL)].map((m) => heil(m[1])).filter(Boolean);
  const mal = einstok([heil(g.mal_id), ...malUr(titill), ...malUr(annad)].filter(Boolean)).slice(0, MEST_MAL);
  const gognR = [g.r_numer].concat(Array.isArray(g.reikningar) ? g.reikningar.map((x) => (x && typeof x === 'object' ? (x.num || x.numer || x.r_numer) : x)) : [])
    .map((x) => String(x || '')).filter((x) => /^R-\d{6}$/.test(x));
  let r = einstok(titill.match(RNR) || []);
  if (!r.length) r = einstok(gognR);
  if (!r.length) r = einstok(annad.match(RNR) || []);
  const kt = String(g.kt || '').replace(/\D/g, '');
  const felog = (Array.isArray(g.felog) ? g.felog : []).filter((o) => o && typeof o === 'object').slice(0, MEST_LISTI);
  return {
    mal, reikn: r.slice(0, MEST_REIKN), fleiriReikn: Math.max(0, r.length - MEST_REIKN),
    sale_id: heil(g.sale_id), kt: kt.length === 10 ? kt : '', fyrirtaeki_id: heil(g.fyrirtaeki_id),
    felog, simi: g.simi || '', hverjum: g.hverjum || '',
    eigin: (Array.isArray(g.dyr) ? g.dyr : []).filter((d) => d && typeof d === 'object' && TEGUNDIR.includes(d.teg) && heil(d.id)).slice(0, 4),
  };
}

/* Ein umferð fyrir ALLA liðina (fá köll, hversu margir sem liðirnir eru). lesa(slóð) → fylki; kastar má — þá tómt. */
async function saekja(rows, lesa) {
  const A = rows.map(audkenni);
  const tryggt = (p) => p.catch(() => []);
  // Dyr sem agent setti sjálfur (gogn.dyr) eru líka sannreyndar: málið, salan og félagið verða að finnast.
  const eigin = (teg) => A.flatMap((a) => a.eigin.filter((d) => teg.includes(d.teg)).map((d) => heil(d.id)));
  const malIds = einstok(A.flatMap((a) => a.mal).concat(eigin(['mal'])));
  const nums = einstok(A.flatMap((a) => a.reikn));
  const saleIds = einstok(A.map((a) => a.sale_id).concat(eigin(['sala', 'krafa'])).filter(Boolean));
  const kts = einstok(A.map((a) => a.kt).filter(Boolean));
  const ktGildi = kts.flatMap((k) => [k, k.slice(0, 6) + '-' + k.slice(6)]);
  const [mal, solurNum, solurId, ktFelog] = await Promise.all([
    malIds.length ? tryggt(lesa(`thjonustubeidni?select=id,status,deleted_at,archived_at,fyrirtaeki_id&id=in.(${malIds.join(',')})`)) : [],
    nums.length ? tryggt(lesa(`solur?select=id,num,customer_id&num=in.(${nums.join(',')})`)) : [],
    saleIds.length ? tryggt(lesa(`solur?select=id,num,customer_id&id=in.(${saleIds.join(',')})`)) : [],
    ktGildi.length ? tryggt(lesa(`fyrirtaeki?select=id,nafn,kennitala&deleted_at=is.null&kennitala=in.(${ktGildi.join(',')})`)) : [],
  ]);
  const solur = solurNum.concat(solurId);
  const fIds = einstok([].concat(
    A.map((a) => a.fyrirtaeki_id), A.flatMap((a) => a.felog.map((f) => heil(f.fyrirtaeki_id))),
    A.flatMap((a) => a.eigin.filter((d) => ['felag', 'gleymt', 'arsskodun'].includes(d.teg)).map((d) => heil(d.id))),
    solur.map((s) => heil(s.customer_id)), mal.map((m) => heil(m.fyrirtaeki_id))).filter(Boolean));
  const felog = [];
  for (let i = 0; i < fIds.length; i += 150) {   // langur listi → í bútum, svo slóðin verði ekki of löng
    felog.push(...await tryggt(lesa(`fyrirtaeki?select=id,nafn&deleted_at=is.null&id=in.(${fIds.slice(i, i + 150).join(',')})`)));
  }
  return { mal, solur, ktFelog, felog };
}

const slodFyrir = (teg, id) => (teg === 'mal' ? '/?mal=' + id + '#bord' : teg === 'felag' ? '/#company/' + id : '/?opna=' + teg + ':' + id + '#bord');
const HEITI = { krafa: 'Vinna kröfuna', gleymt: 'Gleymst að rukka?', arsskodun: 'Opna ársskoðunina', verkbeidni: 'Opna verkbeiðnina' };

/* Dyr eins liðar úr því sem saekja() fann. Röðin er röð takkanna: símtalið fyrst (það ER verkið í símtalslið), svo dyr
 * sem agentinn setti sjálfur, málið, reikningurinn, félagið. */
function dyrFyrir(row, V) {
  const a = audkenni(row), v = V || { mal: [], solur: [], ktFelog: [], felog: [] };
  const dyr = [], sed = new Set();
  const baeta = (teg, id, heiti) => { const k = teg + ':' + id; if (!id || sed.has(k)) return; sed.add(k); dyr.push({ teg, id, heiti: stutt(heiti, 60), slod: slodFyrir(teg, id) }); };
  const felag = (id) => v.felog.find((f) => heil(f.id) === heil(id));

  const s = simaslod(a.simi);
  if (s) dyr.push({ teg: 'simi', id: 0, heiti: stutt('Hringja' + (a.hverjum ? ' í ' + String(a.hverjum).split(/[,(—–]/)[0].trim() : ''), 44) + ' · ' + s.numer, slod: s.slod });

  for (const d of a.eigin) {
    if (d.teg === 'mal' && !v.mal.some((m) => heil(m.id) === heil(d.id) && m.status !== 'lokad' && !m.deleted_at && !m.archived_at)) continue;
    if (['felag', 'gleymt', 'arsskodun'].includes(d.teg) && !felag(d.id)) continue;
    if (['sala', 'krafa'].includes(d.teg) && !v.solur.some((x) => heil(x.id) === heil(d.id))) continue;
    baeta(d.teg, heil(d.id), d.heiti || HEITI[d.teg] || (d.teg === 'mal' ? 'Opna mál #' + heil(d.id) : d.teg === 'sala' ? 'Opna reikninginn' : 'Opna félagið'));
  }

  for (const id of a.mal) {
    const m = v.mal.find((x) => heil(x.id) === id);
    if (m && m.status !== 'lokad' && !m.deleted_at && !m.archived_at) baeta('mal', id, 'Opna mál #' + id);
  }
  const solur = [];
  if (a.sale_id) { const x = v.solur.find((q) => heil(q.id) === a.sale_id); if (x) solur.push(x); }
  for (const nr of a.reikn) { const x = v.solur.find((q) => q.num === nr); if (x && !solur.includes(x)) solur.push(x); }
  for (const x of solur) baeta('sala', heil(x.id), 'Opna reikning ' + x.num);

  // Félagið: aðeins þegar nákvæmlega EITT félag kemur til greina eftir öruggustu heimild sem til er.
  const fraSolu = einstok(solur.map((x) => heil(x.customer_id)).filter(Boolean));
  const fraMali = einstok(a.mal.map((id) => { const m = v.mal.find((x) => heil(x.id) === id); return m ? heil(m.fyrirtaeki_id) : 0; }).filter(Boolean));
  const fraKt = a.kt ? v.ktFelog.filter((f) => String(f.kennitala || '').replace(/\D/g, '') === a.kt).map((f) => heil(f.id)) : [];
  const kostir = a.fyrirtaeki_id ? [a.fyrirtaeki_id] : fraSolu.length ? fraSolu : fraMali.length ? fraMali : fraKt;
  if (kostir.length === 1) { const f = felag(kostir[0]) || v.ktFelog.find((q) => heil(q.id) === kostir[0]); if (f) baeta('felag', heil(f.id), 'Opna ' + f.nafn); }

  // Listi af félögum: hver lína verður dyr að sínu félagi (og símtal ef númer fylgir). Aðeins félög sem finnast fá slóð.
  const listi = a.felog.map((f) => {
    const id = heil(f.fyrirtaeki_id), til = id ? felag(id) : null, sm = simaslod(f.simi);
    const auka = [f.hvad_a_ad_spyrja, f.sonnun, f.sidasta_skodun ? 'Síðast skoðað ' + String(f.sidasta_skodun).slice(0, 10) : '',
      f.arsvelta_kr ? Math.round(Number(f.arsvelta_kr)).toLocaleString('is-IS') + ' kr. á ári' : '', f.kr ? Math.round(Number(f.kr)).toLocaleString('is-IS') + ' kr.' : '',
      f.taeki_skrad != null && f.taeki_skrad !== '' ? f.taeki_skrad + ' tæki' : '', f.tegund, f.sidast_merkt ? 'Síðast merkt ' + String(f.sidast_merkt).slice(0, 10) : '']
      .map((x) => String(x == null ? '' : x).trim()).filter(Boolean).slice(0, 2).join(' · ');
    return { nafn: stutt((til && til.nafn) || f.nafn || (id ? 'Félag #' + id : '?'), 70), auka: stutt(auka, 110),
      teg: til ? 'felag' : null, id: til ? id : 0, slod: til ? slodFyrir('felag', id) : null, simi: sm ? sm.slod : null, simanumer: sm ? sm.numer : null };
  });
  return { dyr: dyr.slice(0, 6), fleiri_reikningar: a.fleiriReikn, listi };
}

module.exports = { audkenni, saekja, dyrFyrir, simaslod, slodFyrir, TEGUNDIR };
