// tekjur-beint.cjs — Tekjur í beinni (lota 4, 17.11.2026, Agnar: „finna út tekjur og hagnað nokkuð svona live").
//
//   GET  /api/tekjur-beint                                   → { slokkvitaeki, brunaholf, skilgreining, maelt_at }
//   POST { action:'forsenda', felag, lykill, kr }            → sama og GET   lykill = laun | annar; kr = tala ≥ 0 eða null
//
// Hvort félag sér, án VSK: mánuður til dags, ár til dags, síðasti heili mánuður, „í pípunni" (drög / ósent) og hagnaður.
// Reglurnar búa í _tekjur.cjs (sama skilgreining og markmiðsrönd Ráðgjafans). Aðeins samtölur fara út — engin nöfn kúnna.
// Hagnaður: null (ómælt) þar til Agnar slær inn launakostnað og annan kostnað á mánuði hvors félags (app_kv tekjur_forsendur).
// Kostnaður: eitt kall per opnun síðunnar; 4 Supabase-fyrirspurnir + Kröfu yfirlit Brunahólfs (sama tala og þar).
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const T = require('./_tekjur.cjs');
const HUB = require('./hub-adgangar.cjs');   // þegar krafist af _starfshlid — engin ný tenging í fallamenginu

const KV = 'tekjur_forsendur';
const FELOG = ['slokkvitaeki', 'brunaholf'];
const BH = (process.env.BRUNAHOLF_URL || 'https://brunaholf.netlify.app').replace(/\/$/, '');

async function sb(slod, init = {}) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, {
    ...init,
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
}
async function sbOll(slod) {
  const ut = [];
  for (let off = 0; off < 50000; off += 1000) {
    const r = await sb(`${slod}&limit=1000&offset=${off}`);
    ut.push(...r);
    if (r.length < 1000) break;
  }
  return ut;
}
async function lesaForsendur() {
  const r = await sb(`app_kv?select=value&key=eq.${KV}`);
  return (r && r[0] && r[0].value) || {};
}
// Brunahólf „Ósent" = sama tala og Kröfu yfirlit sýnir (þrep 2, m. VSK, falið utan). Náist ekki í það: ómælt með ástæðu.
// Lota 13 (17.11.2026) lokar krofu-yfirlit-bru óinnskráðum: þjónn sendir tóka `x-hub-toki` sem hub-adgangar.hubApiToki()
// myntar (session_secret, sameiginlegt báðum vefjum). Fallið er greint en ekki krafist — fyrir sameiningu lotu 13 er
// kallað án tóka og opna fallið svarar; eftir lokun án tóka: 401 → ómælt, aldrei 0.
async function bhOsent() {
  try {
    const headers = { accept: 'application/json' };
    if (typeof HUB.hubApiToki === 'function') {
      const toki = await HUB.hubApiToki().catch(() => '');
      if (toki) headers[HUB.HUB_TOKI_HAUS || 'x-hub-toki'] = toki;
    }
    const r = await fetch(`${BH}/api/krofu-yfirlit-bru`, { headers });
    if (!r.ok) return { omaelt: `Kröfu yfirlit Brunahólfs svaraði ${r.status}${r.status === 401 || r.status === 403 ? ' (lokað — tóki vantar eða ógildur)' : ''}` };
    const d = await r.json();
    const t2 = d && d.tier2;
    return t2 && Number.isFinite(Number(t2.total)) ? { kr_m_vsk: T.kr(t2.total), fjoldi: Number(t2.n) || 0 } : { omaelt: 'Kröfu yfirlit Brunahólfs: óvænt snið' };
  } catch (e) { return { omaelt: 'Kröfu yfirlit Brunahólfs náðist ekki' }; }
}

async function lesa(nu = new Date()) {
  const nuIso = nu.toISOString();
  const ar = nuIso.slice(0, 4);
  const fraSl = `${ar}-01-01` > '2026-05-01' ? `${ar}-01-01` : '2026-05-01';
  const fm = T.fyrriMan(nuIso.slice(0, 7));
  const fraBil = (fm + '-01') < fraSl ? fm + '-01' : fraSl;                 // nær alltaf yfir síðasta mánuð líka
  const fraBh = (fm + '-01') < `${ar}-01-01` ? fm + '-01' : `${ar}-01-01`;
  const [sl, voidIds, bh, drog, forsendur, osent] = await Promise.all([
    sbOll(`solur?select=id,status,credit_of,upphaed_an_vsk,created_at&status=eq.final&created_at=gte.${fraBil}&order=id.asc`),
    sbOll('solur?select=id&status=eq.void&order=id.asc').then((r) => r.map((x) => x.id)),
    sbOll(`invoices?select=status,source,hofudstoll,gjalddagi,utgafudagur&source=eq.payday&status=in.(PAID,SENT)&or=(utgafudagur.gte.${fraBh},and(utgafudagur.is.null,gjalddagi.gte.${fraBh}))&order=id.asc`),
    sbOll('solur?select=upphaed_an_vsk&status=eq.drog&hidden=is.false&order=id.asc'),
    lesaForsendur(),
    bhOsent(),
  ]);
  // Framlegð vöru (aðeins Slökkvitæki): síðasti heili mánuður + líðandi mánuður, línur með kostnaðarverði.
  const [linur, vorur] = await Promise.all([
    sbOll(`solur?select=status,credit_of,linur,created_at&status=eq.final&credit_of=is.null&created_at=gte.${fm}-01&order=id.asc`),
    sbOll('vorur?select=id,kostnadarverd&kostnadarverd=gt.0&order=id.asc'),
  ]);
  const kv = {};
  for (const v of vorur) kv[String(v.id)] = Number(v.kostnadarverd);
  const iMan = (m) => linur.filter((r) => T.manudur(r.created_at) === m);

  const slMan = T.slokkvitaekiManudir(sl, voidIds);
  const bhMan = T.brunaholfManudir(bh);
  // Tómur lestur er EKKI 0: bæði félög gefa út reikninga í hverjum mánuði og bilið nær alltaf yfir síðasta mánuð, svo
  // engin röð þýðir að lesturinn brást (aðgangsregla, rangur lykill — mælt 17.11.2026: RLS á invoices án reglu gaf [] með
  // opinbera lyklinum). Þá ómælt (null) með ástæðu; drög mega hins vegar vera 0.
  const omaelt = (t, astaeda) => ({ ...t, manudur_til_dags: null, fyrri_manudur: null, ar_til_dags: null, omaelt: astaeda });
  const slT = sl.length ? T.tolur(slMan, nuIso, T.SL_FRA) : omaelt(T.tolur({}, nuIso, T.SL_FRA), 'sölulesturinn skilaði engu');
  const bhT = bh.length ? T.tolur(bhMan, nuIso, null) : omaelt(T.tolur({}, nuIso, null), 'reikningalesturinn skilaði engu');
  const f = forsendur || {};
  return {
    maelt_at: nuIso,
    slokkvitaeki: {
      ...slT,
      pipa: { heiti: 'Drög (ekki reikningsfært)', kr_an_vsk: T.kr(drog.reduce((a, r) => a + (Number(r.upphaed_an_vsk) || 0), 0)), fjoldi: drog.length },
      framlegd_voru: { fyrri_manudur: T.framlegdVoru(iMan(slT.fyrri_man), kv), manudur: T.framlegdVoru(iMan(slT.manudur), kv) },
      hagnadur: T.hagnadur(slT.fyrri_manudur, f.slokkvitaeki),
    },
    brunaholf: {
      ...bhT,
      pipa: osent && osent.kr_m_vsk != null ? { heiti: 'Ósent (sama og Kröfu yfirlit, m. VSK)', kr_m_vsk: osent.kr_m_vsk, fjoldi: osent.fjoldi } : { heiti: 'Ósent', kr_m_vsk: null, omaelt: (osent && osent.omaelt) || 'Kröfu yfirlit Brunahólfs svaraði ekki' },
      hagnadur: T.hagnadur(bhT.fyrri_manudur, f.brunaholf),
    },
    skilgreining: {
      slokkvitaeki: 'Án VSK. Sölur (final) eftir skráningardegi; kreditnótur dregnar frá; bakfært og drög ekki talin; kreditnóta á bakfærða sölu ekki talin. Mælt frá yfirtöku 04.05.2026 (eldra er hjá Stólpa).',
      brunaholf: 'Án VSK. Payday-reikningar greiddir eða sendir, höfuðstóll, eftir útgáfudegi. NLSH: 95 % — 5 % öryggisfé telst þegar það er reikningsfært.',
      hagnadur: 'Tekjur síðasta heila mánaðar − launakostnaður − annar kostnaður (tölur úr bókhaldi, slegnar inn hér). Laun eru ekki í kerfinu.',
    },
  };
}

async function vistaForsendu(b, nafn) {
  const felag = String(b.felag || ''), lykill = String(b.lykill || '');
  if (!FELOG.includes(felag)) return P.json(400, { error: 'felag: slokkvitaeki eða brunaholf' });
  if (!Object.prototype.hasOwnProperty.call(T.FORSENDUR, lykill)) return P.json(400, { error: 'lykill: laun eða annar' });
  const tala = b.kr === null || b.kr === '' || b.kr === undefined ? null : Number(String(b.kr).replace(/[.\s]/g, '').replace(',', '.'));
  if (tala !== null && !(Number.isFinite(tala) && tala >= 0 && tala < 1e10)) return P.json(400, { error: 'kr: tala ≥ 0 eða tómt' });
  const nuv = await lesaForsendur();
  const fe = { ...(nuv[felag] || {}) };
  fe[lykill] = tala === null ? null : Math.round(tala);
  fe.skrad = { af: nafn || null, at: new Date().toISOString() };
  const value = { ...nuv, [felag]: fe };
  await sb('app_kv?on_conflict=key', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: KV, value, updated_at: new Date().toISOString() }),
  });
  return P.json(200, await lesa());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.starfsmadur(event);
  if (hver.villa) return hver.villa;
  try {
    if (event.httpMethod === 'GET') return P.json(200, await lesa());
    if (event.httpMethod !== 'POST') return P.json(405, { error: 'Aðeins GET og POST' });
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
    if (b.action === 'forsenda') return await vistaForsendu(b, hver.nafn);
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) {
    console.error('[tekjur-beint]', e);
    return P.json(500, { error: String((e && e.message) || e).slice(0, 200) });
  }
};
exports._lesa = lesa;
