// _innflutningur-reikna.cjs — kostnaðarverð innfluttrar sendingar (16.11.2026, Agnar: „nýjan flipa … um innfluttning
// og útreikninginn á öllu innfluttu sem við síðan uppfærum við núverandi birgðir").
//
// Hreint: engin net- eða gagnagrunnsköll. Fallið innflutningur.cjs les og skrifar; hér er aðeins reiknað, svo
// sami útreikningur ræður því sem birtist og því sem fer á vörurnar. Próf: node --test test/innflutningur.test.cjs
//
// Sending = vörulínur (magn × einingaverð í erlendri mynt) + kostnaðarliðir í krónum.
//   · Vörur í kr: það sem var GREITT (vorur_isk, t.d. bankafærslan) ef það er skráð, annars línur × gengi.
//     Gengið sem greiðslan gefur (vorur_isk / erlend upphæð) er notað á hverja línu, svo línurnar summast í greiðsluna.
//   · Kostnaðarliður hefur tegund:
//       kostnadur  — fer á kostnaðarverð vöru (flutningur, úrvinnslugjald, tollur, tollskýrslugerð, afgreiðsla)
//       innskattur — VSK við innflutning: greiddur, en dreginn frá sem innskattur, svo hann er EKKI kostnaður
//       ekki       — skráður til upplýsingar en ekki talinn (t.d. vátrygging sem er aðeins reiknuð í tollverði)
//     Liður án upphæðar er ÓMÆLDUR: hann er ekki talinn sem 0 heldur birtur sem gat, og sendingin segir frá því.
//   · Kostnaði er skipt á línur eftir verðhlutfalli (sjálfgefið) eða fjölda stykkja.

const TEGUNDIR = ['kostnadur', 'innskattur', 'ekki'];
const SKIPTING = ['verd', 'fjoldi'];
const KAUPVERD_VAL = ['nytt', 'medal', 'obreytt'];

// Tala eins og hún er slegin inn á íslensku: „2.270.919", „2.270.919 kr", „21,60", „144,2", „491923".
// Komma = aukastafir; punktur = þúsundaskil þegar komma er líka, þegar punktarnir eru fleiri en einn, eða þegar nákvæmlega
// þrír tölustafir fylgja (1.500 = 1500). Annars er punkturinn aukastafur (21.6 úr eldri gögnum).
function tala(x) {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  let t = String(x).replace(/\s|kr\.?|€|eur|isk/gi, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g) || []).length > 1 || /^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Hreinsar sendingu sem kemur úr vafranum: aðeins þekktir reitir, tölur sem tölur, takmörk á lengd og fjölda.
function hreinsa(s) {
  s = s && typeof s === 'object' ? s : {};
  const txt = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);
  const linur = (Array.isArray(s.linur) ? s.linur : []).slice(0, 200).map((l) => ({
    vara_id: Number.isInteger(Number(l && l.vara_id)) && Number(l.vara_id) > 0 ? Number(l.vara_id) : null,
    heiti: txt(l && l.heiti, 160),
    magn: tala(l && l.magn),
    einingaverd: tala(l && l.einingaverd),
  }));
  const kostnadur = (Array.isArray(s.kostnadur) ? s.kostnadur : []).slice(0, 50).map((k) => ({
    heiti: txt(k && k.heiti, 160),
    upphaed: tala(k && k.upphaed),
    tegund: TEGUNDIR.includes(k && k.tegund) ? k.tegund : 'kostnadur',
  }));
  const dags = typeof s.dags === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.dags) ? s.dags : null;
  return {
    tilvisun: txt(s.tilvisun, 80) || 'Ný sending',
    birgir: txt(s.birgir, 160),
    land: txt(s.land, 60),
    mynt: (txt(s.mynt, 8) || 'EUR').toUpperCase(),
    gengi: tala(s.gengi),
    vorur_isk: tala(s.vorur_isk),
    skipting: SKIPTING.includes(s.skipting) ? s.skipting : 'verd',
    dags,
    athugasemd: txt(s.athugasemd, 4000),
    linur,
    kostnadur,
  };
}

function reikna(sending) {
  const s = hreinsa(sending);
  const linur = s.linur.map((l) => ({ ...l, magn: l.magn || 0, einingaverd: l.einingaverd || 0 }));
  const erl = linur.reduce((a, l) => a + l.magn * l.einingaverd, 0);
  const vorurIsk = s.vorur_isk != null ? s.vorur_isk : erl * (s.gengi || 0);
  const gengi = erl > 0 ? vorurIsk / erl : s.gengi || 0;
  const magn = linur.reduce((a, l) => a + l.magn, 0);

  const omaeldir = s.kostnadur.filter((k) => k.upphaed == null && k.heiti).map((k) => k.heiti);
  const sum = (t) => s.kostnadur.filter((k) => k.tegund === t && k.upphaed != null).reduce((a, k) => a + k.upphaed, 0);
  const kostnadurAlls = sum('kostnadur');
  const innskattur = sum('innskattur');

  // Verðhlutfall nema ekkert verð sé skráð — þá fjöldi, svo kostnaðurinn týnist ekki.
  const skipting = s.skipting === 'verd' && vorurIsk > 0 ? 'verd' : 'fjoldi';
  const ut = linur.map((l) => {
    const isk = l.magn * l.einingaverd * gengi;
    const hlutur = skipting === 'verd' ? isk / vorurIsk : magn > 0 ? l.magn / magn : 0;
    const alag = kostnadurAlls * hlutur;
    return {
      ...l,
      vorur_isk: isk,
      alag,
      samtals: isk + alag,
      kostnadarverd: l.magn > 0 ? (isk + alag) / l.magn : null,
    };
  });

  const vantar = [];
  if (!linur.length) vantar.push('Engar vörulínur');
  ut.forEach((l, i) => {
    if (!l.vara_id) vantar.push(`Lína ${i + 1}${l.heiti ? ` (${l.heiti})` : ''} er ekki tengd vöru`);
    if (!(l.magn > 0)) vantar.push(`Lína ${i + 1}${l.heiti ? ` (${l.heiti})` : ''}: magn vantar`);
  });
  if (erl > 0 && s.vorur_isk == null && !(s.gengi > 0)) vantar.push('Gengi eða greidd upphæð vantar');
  omaeldir.forEach((h) => vantar.push(`Ómælt: ${h}`));

  return {
    linur: ut,
    erl,
    vorur_isk: vorurIsk,
    gengi,
    magn,
    skipting,
    kostnadur_alls: kostnadurAlls,
    innskattur,
    heild: vorurIsk + kostnadurAlls,
    alag_pct: vorurIsk > 0 ? kostnadurAlls / vorurIsk : 0,
    omaeldir,
    vantar,
  };
}

// Kostnaðarverð á hverja vöru: línur sem vísa á sömu vöru renna saman (vegið eftir magni).
function aVorur(reikningur) {
  const m = new Map();
  for (const l of reikningur.linur) {
    if (!l.vara_id || !(l.magn > 0)) continue;
    const v = m.get(l.vara_id) || { vara_id: l.vara_id, magn: 0, samtals: 0, heiti: l.heiti };
    v.magn += l.magn;
    v.samtals += l.samtals;
    m.set(l.vara_id, v);
  }
  return [...m.values()].map((v) => ({ ...v, kostnadarverd: v.samtals / v.magn }));
}

// Vegið meðaltal við lagerinn. Sé magn sendingarinnar EKKI bætt við (birgðirnar telja það þegar) eru eldri stykkin
// birgðir − sendingin; annars allar núverandi birgðir. Ekkert eldra verð eða enginn eldri lager → nýja verðið.
function medalverd({ birgdir, kostnadarverd, magn, nytt, baeta }) {
  const b = Number(birgdir) || 0;
  const eldri = Math.max(0, baeta ? b : b - magn);
  if (kostnadarverd == null || !(Number(kostnadarverd) > 0) || eldri <= 0) return nytt;
  return (eldri * Number(kostnadarverd) + magn * nytt) / (eldri + magn);
}

// Áætlun færslu á vörurnar: { vara_id: { kaupverd: 'nytt'|'medal'|'obreytt', baeta: bool } } → hvað breytist.
// vorur = núverandi raðir { id, nafn, birgdir, kostnadarverd }. Skilar aðeins línum sem breyta einhverju.
function aaetlun(reikningur, val, vorur) {
  const eftirId = new Map((vorur || []).map((v) => [Number(v.id), v]));
  const linur = [];
  const sleppt = [];
  for (const a of aVorur(reikningur)) {
    const v = eftirId.get(a.vara_id);
    if (!v) { sleppt.push({ vara_id: a.vara_id, astaeda: 'Varan fannst ekki' }); continue; }
    const o = (val && val[a.vara_id]) || {};
    const kaupverd = KAUPVERD_VAL.includes(o.kaupverd) ? o.kaupverd : (v.kostnadarverd == null ? 'nytt' : 'obreytt');
    const baeta = o.baeta === true;
    const kFyrir = v.kostnadarverd == null ? null : Number(v.kostnadarverd);
    const bFyrir = v.birgdir == null ? null : Number(v.birgdir);
    const nytt = Math.round(a.kostnadarverd);
    const kEftir = kaupverd === 'nytt' ? nytt
      : kaupverd === 'medal' ? Math.round(medalverd({ birgdir: bFyrir, kostnadarverd: kFyrir, magn: a.magn, nytt: a.kostnadarverd, baeta }))
      : kFyrir;
    const bEftir = baeta ? (bFyrir || 0) + a.magn : bFyrir;
    if (kEftir === kFyrir && bEftir === bFyrir) continue;
    linur.push({ vara_id: a.vara_id, nafn: v.nafn || a.heiti, magn: a.magn, kaupverd, baeta,
      kostn_fyrir: kFyrir, kostn_eftir: kEftir, birgdir_fyrir: bFyrir, birgdir_eftir: bEftir });
  }
  return { linur, sleppt };
}

module.exports = { hreinsa, reikna, aVorur, medalverd, aaetlun, tala, TEGUNDIR, SKIPTING, KAUPVERD_VAL };
