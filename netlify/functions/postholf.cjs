/* postholf.cjs — PÓSTHÓLFIN: hvenær var lesið úr hverju, hvort lesarinn virkar, og endurlestur (19.11.2026).
 *
 * TILEFNIÐ (Agnar): „maður þarf kannski að hafa litla stiku sem sýnir hvenær var lesið úr hverju póstfangi og hvort
 * virki. Og refresh á þeim.“ Áður stóð aðeins ein lína í VIP-vaktinni um EITT hólf, og hún sagði rangt frá:
 *
 *   MÆLT 19.11.2026: `email_digest.fetched_at` hækkar AÐEINS þegar nýtt skeyti er skrifað. Hólf sem er lesið á 15 mín.
 *   fresti en fær engan póst lítur því út eins og það hafi ekki verið lesið í tvo daga. Þannig stóð „⚠ slokkvitaeki@
 *   ólesið síðan 17.11“ á borðinu þótt lesarinn hefði keyrt 140 sinnum síðan.
 *
 * ÞESS VEGNA er „lesið“ hér mælt á KEYRSLUM lesaranna (`automation_runs`), ekki á póstinum:
 *   · luna-bridge skrifar eina röð á hverja keyrslu og telur hvert hólf í `detail`
 *     („0 ný í þessari keyrslu (bokhald@brunaholf.is:0, Brunaholf@brunaholf.is:2, …)“) — hólf sem er nefnt VAR lesið.
 *   · gmail-ingest keyrir í skýinu og nefnir hólfin sín eins.
 * Nýjasti pósturinn og fjöldi dagsins koma svo úr `email_digest` — tvær ólíkar spurningar, tvö ólík svör.
 *
 *   GET  /api/postholf              → { holf: [...], lesarar: [...], nuna }
 *   POST /api/postholf {holf}       → endurlestur á EINU hólfi. Aðeins innskráður starfsmaður og aðeins Gmail-hólf:
 *                                     þau eru lesin í skýinu (brunaholf /api/gmail-ingest) og því hægt að kalla á þau
 *                                     héðan. Thunderbird-hólfin les luna-bridge á vélunum hans — þau fá engan takka,
 *                                     því takki sem gerir ekkert er verri en enginn takki.
 *
 * ENGU ER BREYTT NEMA PÓSTI SEM SOGAST INN: endurlestur skrifar aðeins í email_digest (sama og tímakeyrslan gerir).
 * Ekkert er sent, engu eytt. */
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');

const BH = 'https://brunaholf.netlify.app';

/* Hólfin sem kerfið les. `bil_min` = hve þétt lesarinn á að keyra; staðan er mæld á því, ekki á fastri klukkustund.
 * `endurlestur` segir hvort hægt sé að kalla á lestur héðan (Gmail í skýinu já, Thunderbird á vélunum nei). */
const HOLF = [
  { holf: 'eldklar@eldklar.is', stytt: 'eldklar@', hlutverk: 'Aðalhólf Slökkvitækja', lesari: 'gmail-ingest', bil_min: 120, endurlestur: true },
  { holf: 'bokhald@eldklar.is', stytt: 'bokhald@eldklar', hlutverk: 'Bókhald Slökkvitækja', lesari: 'gmail-ingest', bil_min: 120, endurlestur: true },
  { holf: 'slokkvitaeki@brunaholf.is', stytt: 'slokkvitaeki@', hlutverk: 'Útköll og þjónusta', lesari: 'luna-bridge', bil_min: 15, endurlestur: false },
  { holf: 'Brunaholf@brunaholf.is', stytt: 'Brunaholf@', hlutverk: 'Aðalhólf Brunahólfs', lesari: 'luna-bridge', bil_min: 15, endurlestur: false },
  { holf: 'bokhald@brunaholf.is', stytt: 'bokhald@bh', hlutverk: 'Bókhald Brunahólfs', lesari: 'luna-bridge', bil_min: 15, endurlestur: false },
];
const lag = (s) => String(s || '').trim().toLowerCase();

async function lesa(qs) {
  const r = await P.sbGet(qs);
  return Array.isArray(r) ? r : [];
}

/* Síðasta KEYRSLA sem las hólfið: nýjasta heppnaða röðin þar sem hólfið er nefnt í `detail`.
 * Sé hólfið hvergi nefnt (eldri útgáfa lesarans taldi ekki hólfin) gildir síðasta heppnaða keyrsla lesarans. */
function lesidUr(keyrslur, h) {
  const minar = keyrslur.filter((k) => k.job_name === h.lesari);
  const nefnt = minar.filter((k) => lag(k.detail).includes(lag(h.holf)));
  const heppnad = (l) => l.filter((k) => k.status === 'success' || k.status === 'ok');
  const val = heppnad(nefnt)[0] || heppnad(minar)[0] || null;
  return val ? { at: val.started_at, vel: String(val.source || '').replace(/^luna-bridge:/, ''), nefnt: nefnt.length > 0, stada: val.status } : null;
}

async function stada(nuna) {
  const fra = new Date(nuna.getTime() - 36 * 36e5).toISOString();   // 36 klst. aftur — nóg fyrir hvaða bil sem er
  const [keyrslur, ...gogn] = await Promise.all([
    lesa('automation_runs?select=job_name,source,status,started_at,detail&job_name=in.(luna-bridge,gmail-ingest)&started_at=gte.' + encodeURIComponent(fra) + '&order=started_at.desc&limit=600'),
    ...HOLF.map((h) => lesa(`email_digest?select=received_at&account=ilike.${encodeURIComponent(h.holf)}&order=received_at.desc.nullslast&limit=1`)),
    ...HOLF.map((h) => lesa(`email_digest?select=id&account=ilike.${encodeURIComponent(h.holf)}&received_at=gte.${encodeURIComponent(new Date(nuna.getTime() - 24 * 36e5).toISOString())}&limit=200`)),
  ]);
  const n = HOLF.length;
  const holf = HOLF.map((h, i) => {
    const les = lesidUr(keyrslur, h);
    const minutur = les ? Math.round((nuna.getTime() - Date.parse(les.at)) / 60000) : null;
    // Þrjú þrep, mæld á bilinu sem lesarinn á að keyra á: í lagi · seinn · þegir.
    let st = 'villa', skyring = 'Engin keyrsla lesarans síðustu 36 klst. — pósturinn kemst ekki inn.';
    if (les && minutur != null) {
      if (les.stada !== 'success' && les.stada !== 'ok') { st = 'villa'; skyring = 'Síðasta keyrsla lesarans brást (' + les.stada + ').'; }
      else if (minutur <= h.bil_min * 1.5) { st = 'ok'; skyring = 'Lesið reglulega — ' + h.lesari + ' keyrir á um ' + h.bil_min + ' mín. fresti.'; }
      else if (minutur <= h.bil_min * 4) { st = 'seinn'; skyring = 'Lesarinn er seinn: ' + minutur + ' mín. síðan síðast, á að vera á ' + h.bil_min + ' mín. fresti.'; }
      else { st = 'villa'; skyring = 'Ekkert lesið í ' + minutur + ' mín. — lesarinn á að keyra á ' + h.bil_min + ' mín. fresti.'; }
      if (st === 'ok' && !les.nefnt) skyring += ' (Keyrslan nefnir ekki hólfið sérstaklega — mælt á lesaranum í heild.)';
    }
    return { holf: h.holf, stytt: h.stytt, hlutverk: h.hlutverk, lesari: h.lesari, bil_min: h.bil_min, endurlestur: h.endurlestur,
      lesid_at: les ? les.at : null, lesid_min: minutur, vel: les ? les.vel : null, nefnt: !!(les && les.nefnt),
      nyjasti_postur: (gogn[i][0] && gogn[i][0].received_at) || null, sidasta_solarhring: gogn[n + i].length, stada: st, skyring };
  });
  const sed = {};
  const lesarar = keyrslur.filter((k) => { const l = k.job_name + '|' + k.source; if (sed[l]) return false; sed[l] = 1; return true; })
    .map((k) => ({ lesari: k.job_name, vel: String(k.source || '').replace(/^luna-bridge:/, ''), sidast: k.started_at, stada: k.status, skilabod: String(k.detail || '').slice(0, 200) }));
  return { holf, lesarar, nuna: nuna.toISOString() };
}

/* Endurlestur: kallað á lestur Brunahólfs fyrir EITT Gmail-hólf, bæði INBOX og SENT (sama og tímakeyrslan gerir).
 * Þjónn-í-þjón, svo vafrinn fari ekki yfir á annan vef. Bregðist annað kallið kemur hitt samt til skila. */
async function keyra(holfNafn) {
  const h = HOLF.find((x) => lag(x.holf) === lag(holfNafn));
  if (!h) return P.json(400, { error: 'Óþekkt pósthólf' });
  if (!h.endurlestur) return P.json(400, { error: h.stytt + ' er lesið af luna-bridge á vélunum þínum — ekki hægt að kalla á það héðan.' });
  const sakja = async (mappa) => {
    const slod = BH + '/api/gmail-ingest?account=' + encodeURIComponent(h.holf) + '&days=2' + (mappa ? '&folder=' + mappa : '');
    const r = await fetch(slod, { headers: { accept: 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(String(j.error || ('svar ' + r.status)).slice(0, 200));
    return j;
  };
  try {
    const inn = await sakja('');
    const sent = await sakja('sent').catch(() => null);
    const ny = Number(inn.inserted || inn.ny || 0) + Number((sent && (sent.inserted || sent.ny)) || 0);
    return P.json(200, { ok: true, holf: h.holf, ny, skilabod: ny ? ny + (ny === 1 ? ' nýtt skeyti' : ' ný skeyti') + ' sótt' : 'Ekkert nýtt — hólfið er uppfært' });
  } catch (e) {
    return P.json(502, { error: 'Náði ekki að lesa ' + h.stytt + ': ' + String((e && e.message) || e).slice(0, 200) });
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod === 'GET') {
    try { return P.json(200, await stada(new Date())); }
    catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
  }
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });
  // Endurlestur sogar póst inn í grunninn — aðeins innskráður starfsmaður.
  const g = await H.krefjastStarfsmanns(event);
  if (g) return g;
  let b; try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
  try { return await keyra(b.holf); }
  catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
};

module.exports.HOLF = HOLF;
module.exports._stada = stada;
module.exports._lesidUr = lesidUr;
