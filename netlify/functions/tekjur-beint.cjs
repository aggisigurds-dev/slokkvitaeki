// tekjur-beint.cjs — Tekjur í beinni (lota 4, 17.11.2026, Agnar: „finna út tekjur og hagnað nokkuð svona live").
//
//   Aðeins STJÓRNANDI (rola Admin): óinnskráður 401, önnur rola 403 (kóðarýni 17.11.2026).
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
const UN = require('./_unnid-sl.cjs');       // Slökkvitæki „Unnið“ (reglur Agnars 21.–22.11.2026): hrein föll
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
async function sbOll(slod, init) {
  const ut = [];
  for (let off = 0; off < 50000; off += 1000) {
    const r = await sb(`${slod}&limit=1000&offset=${off}`, init);
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

// Brunahólf „Unnið" (Agnar 21.11.2026: tekjur Brunahólfs miðast við hvenær verk var unnið skv. tímaskýrslu og Ajour Done-degi):
// áunnið virði úr Rekstrarskýrslu Brunahólfs (reglurnar búa í brunaholf _rekstur.js — stimplaðir tímar × taxti verkstaðar og
// kláruð göt). Skýrslan krefst hub_user-kökunnar; sama undirritaða kakan gildir á báðum vefjum, svo kaka kallandans er send
// áfram (aðeins hún). Náist hún ekki: ómælt með ástæðu, aldrei 0. Útgáfudagstalan (invoices) heitir nú „Reikningsfært".
async function bhUnnid(event) {
  if (event === false) return null;          // „Vista forsendu“ þarf ekki skýrsluna — viðmótið heldur fyrri Unnið-tölu
  try {
    const hra = (event && event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
    const m = /(?:^|;\s*)hub_user=([^;]+)/.exec(String(hra));
    if (!m) return { omaelt: 'innskráningarkökuna vantar' };
    // Tímamörk (5 s): skýrslan tekur nokkrar sekúndur og má aldrei seinka eða fella Tekjur-flísina — þá er Unnið ómælt, hitt stendur.
    const sig = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined;
    const r = await fetch(`${BH}/api/rekstrarskyrsla`, { headers: { cookie: `hub_user=${m[1]}`, accept: 'application/json' }, signal: sig });
    if (!r.ok) return { omaelt: `Rekstrarskýrsla Brunahólfs svaraði ${r.status}` };
    const j = await r.json();
    const v = j && j.bh && j.bh.virdi, g = j && j.bh && j.bh.greitt, t = j && j.timabil;
    if (!Array.isArray(v) || v.length < 5 || !Number.isFinite(Number(v[3])) || !Number.isFinite(Number(v[4])) || !Array.isArray(t) || !t[3]) {
      return { omaelt: 'Rekstrarskýrsla Brunahólfs: óvænt snið' };
    }
    const fe = (j && j.ferskleiki) || {};
    return {
      manudur_til_dags: T.kr(v[3]),
      fyrri_manudur: T.kr(v[4]),
      greitt_manudur_til_dags: Array.isArray(g) && Number.isFinite(Number(g[3])) ? T.kr(g[3]) : null,
      fra: t[3].fra || null, til: t[3].til || null,
      ajour_til: (fe.ajour && fe.ajour.nyjast) || null,
    };
  } catch (e) { return { omaelt: e && e.name === 'TimeoutError' ? 'Rekstrarskýrsla Brunahólfs svaraði of seint' : 'Rekstrarskýrsla Brunahólfs náðist ekki' }; }
}

// Slökkvitæki „Unnið“ (Agnar 21.–22.11.2026): skoðanir (ársþjónusta, brunakerfi, slökkvikerfi) eftir skoðunarmánuði skv. skýrslunni,
// verkstæði þegar tæki er merkt klárt og sent í afgreiðslu (verkbeidnir.klart_at). Reglurnar búa í _unnid-sl.cjs (hrein föll).
// 5 s tímamörk á ÖLLUM lestrunum saman og ómælt með ástæðu ef eitthvað bregst — aldrei 0 og má aldrei seinka eða fella flísina.
// Tómur lestur á töflu sem hlýtur að hafa raðir (skýrslur, verkbeiðnir) er ómælt: annars birtist allt sem „án skýrslu“.
async function slUnnid(nu, voidP) {
  try {
    const sig = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined;
    const init = sig ? { signal: sig } : undefined;
    const fra = T.SL_FRA + '-01';
    const [solur, voidIds, skyrslur, verkbeidnir, verklidir] = await Promise.all([
      sbOll(`solur?select=id,num,status,credit_of,is_credit,vidskiptategund,upphaed_an_vsk,created_at,customer_base_id,customer_id,linur&status=eq.final&created_at=gte.${fra}&order=id.asc`, init),
      voidP,
      sbOll('customer_documents?select=id,doc_type,doc_date,customer_base_id,fyrirtaeki_id,is_duplicate,skodun_ar_man,notes&doc_type=in.(uttektarskyrsla,brunakerfi,slokkvikerfi)&source=eq.app&is_duplicate=not.is.true&doc_date=gte.2026-02-01&order=id.asc', init),
      sbOll(`verkbeidnir?select=id,num,status,verd,klart_at,eytt_at&eytt_at=is.null&created_at=gte.${fra}&order=id.asc`, init),
      sbOll(`verklidur?select=job_id,service,status,eytt_at&eytt_at=is.null&created_at=gte.${fra}&order=id.asc`, init),
    ]);
    if (!solur.length) return { omaelt: 'sölulesturinn skilaði engu' };
    if (!skyrslur.length) return { omaelt: 'skýrslulesturinn skilaði engu — án hans yrði allt „án skýrslu“' };
    if (!verkbeidnir.length) return { omaelt: 'verkbeiðnalesturinn skilaði engu' };
    if (!verklidir.length) return { omaelt: 'verkliðalesturinn skilaði engu — án hans yrðu tæki verkstæðis 0' };
    return UN.unnidTolur(UN.unnidManudir({ solur, voidIds, skyrslur, verkbeidnir, verklidir }, nu.toISOString()), nu.toISOString());
  } catch (e) {
    console.error('[tekjur-beint] unnid', e && e.message);
    return { omaelt: e && e.name === 'TimeoutError' ? 'Slökkvitækjahluti Unnið svaraði of seint' : 'Slökkvitækjahluti Unnið náðist ekki' };
  }
}

async function lesa(nu = new Date(), event = null) {
  const nuIso = nu.toISOString();
  const ar = nuIso.slice(0, 4);
  const fraSl = `${ar}-01-01` > '2026-05-01' ? `${ar}-01-01` : '2026-05-01';
  const fm = T.fyrriMan(nuIso.slice(0, 7));
  const fraBil = (fm + '-01') < fraSl ? fm + '-01' : fraSl;                 // nær alltaf yfir síðasta mánuð líka
  const fraBh = (fm + '-01') < `${ar}-01-01` ? fm + '-01' : `${ar}-01-01`;
  const unnidP = bhUnnid(event);               // ræst strax, svo 5 s bið seinkar ekki hinum lestrunum (rýni 22.11)
  const voidP = sbOll('solur?select=id&status=eq.void&order=id.asc').then((r) => r.map((x) => x.id));
  const slUnnidP = event === false ? Promise.resolve(null) : slUnnid(nu, voidP);   // Vista forsendu sækir ekki Unnið: viðmótið heldur fyrri tölu
  const [sl, voidIds, bh, drog, forsendur, osent] = await Promise.all([
    sbOll(`solur?select=id,status,credit_of,is_credit,upphaed_an_vsk,created_at&status=eq.final&created_at=gte.${fraBil}&order=id.asc`),
    voidP,
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
  const unnid = await unnidP;                  // kastar aldrei (allur búkurinn í try)
  const slUnnidSvar = await slUnnidP;          // kastar aldrei (allur búkurinn í try)
  const kv = {};
  for (const v of vorur) kv[String(v.id)] = Number(v.kostnadarverd);
  const iMan = (m) => linur.filter((r) => T.manudur(r.created_at) === m);

  // Kreditnóta miðast við dagsetningu FRUMSÖLUNNAR (Agnar 22.11.2026). Frumsala sem er eldri en lesturinn (t.d. nóta í janúar á desembersölu) er sótt sér.
  const hef = new Set(sl.map((r) => String(r.id))), voidSet = new Set((voidIds || []).map(String));
  const vantar = [...new Set(sl.filter((r) => r.credit_of != null && !hef.has(String(r.credit_of)) && !voidSet.has(String(r.credit_of))).map((r) => Number(r.credit_of)).filter((n) => Number.isInteger(n) && n > 0))];
  let frumsolur = [];
  try { for (let i = 0; i < vantar.length; i += 150) frumsolur.push(...await sbOll(`solur?select=id,created_at&id=in.(${vantar.slice(i, i + 150).join(',')})&order=id.asc`)); } catch (e) { frumsolur = []; }
  const slFr = T.slokkvitaekiManudirFrumsala(sl, voidIds, frumsolur);
  const slMan = slFr.man;
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
      unnid: slUnnidSvar,
      kredit_an_frumsolu: slFr.kredit_an_frumsolu,
      pipa: { heiti: 'Drög (ekki reikningsfært)', kr_an_vsk: T.kr(drog.reduce((a, r) => a + (Number(r.upphaed_an_vsk) || 0), 0)), fjoldi: drog.length },
      framlegd_voru: { fyrri_manudur: T.framlegdVoru(iMan(slT.fyrri_man), kv), manudur: T.framlegdVoru(iMan(slT.manudur), kv) },
      hagnadur: T.hagnadur(slT.fyrri_manudur, f.slokkvitaeki),
    },
    brunaholf: {
      ...bhT,
      unnid,
      pipa: osent && osent.kr_m_vsk != null ? { heiti: 'Ósent (sama og Kröfu yfirlit, m. VSK)', kr_m_vsk: osent.kr_m_vsk, fjoldi: osent.fjoldi } : { heiti: 'Ósent', kr_m_vsk: null, omaelt: (osent && osent.omaelt) || 'Kröfu yfirlit Brunahólfs svaraði ekki' },
      hagnadur: T.hagnadur(bhT.fyrri_manudur, f.brunaholf),
    },
    skilgreining: {
      slokkvitaeki_unnid: 'UNNIÐ (regla Agnars 21.–22.11.2026), án VSK: SKOÐANIR (ársþjónusta, brunakerfi, slökkvikerfi) telja í mánuði skoðunarinnar skv. skýrslunni, þótt ógreiddar; skýrsla gerð mánuðinum á eftir breytir því ekki. Án skýrslu: söludagur, flaggað „án skýrslu“; skýrslur með ólíkum mánuði: flaggað „óviss“. VERKSTÆÐI telst þegar tæki er skráð klárt og sent í afgreiðslu (klart_at); tómt (eldri raðir): söludagur, flaggað „áætlað“; í vinnslu telst ekki enn. Salan telur afganginn án V-hluta verkstæðis. TÆKI: yfirfarin, hlaðin og ný — skoðanir eftir skoðunarmánuði, verkstæði eftir klart_at. Samtals úr báðum.',
      slokkvitaeki: 'Án VSK. Sölur (final) eftir skráningardegi; kreditnótur dregnar frá í mánuði FRUMSÖLUNNAR (nóta og sala jafnast út); bakfært og drög ekki talin; kreditnóta á bakfærða sölu ekki talin. Mælt frá yfirtöku 04.05.2026 (eldra er hjá Stólpa).',
      brunaholf: 'Án VSK. REIKNINGSFÆRT: Payday-reikningar greiddir eða sendir, höfuðstóll, eftir útgáfudegi. NLSH: 95 % — 5 % öryggisfé telst þegar það er reikningsfært. UNNIÐ (áætlun, regla Agnars 21.11.2026): stimplaðir tímar úr Tímaveru × dagvinnutaxti verkstaðar (9.951 kr. ef verkstað vantar) + kláruð göt úr Ajour eftir Done-degi, eins og Rekstrarskýrsla Brunahólfs. Yfirvinna, efni og akstur eru ekki í Unnið. GREITT: Payday-greiddir og handfærðir reikningar (greiðsla skráð í Kröfu yfirliti).',
      hagnadur: 'Tekjur síðasta heila mánaðar − launakostnaður − annar kostnaður (tölur úr bókhaldi, slegnar inn hér). Laun eru ekki í kerfinu.',
    },
  };
}

async function vistaForsendu(b, nafn, event) {
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
  return P.json(200, await lesa(undefined, false));   // án skýrslunnar: viðmótið heldur Unnið-töluna frá síðustu opnun
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  // Aðeins stjórnandi (Admin): tekjur og hagnaður beggja félaga + forsendur Agnars. Óinnskráður 401, önnur rola 403.
  const hver = await H.stjornandi(event);
  if (hver.villa) return hver.villa;
  try {
    if (event.httpMethod === 'GET') return P.json(200, await lesa(undefined, event));
    if (event.httpMethod !== 'POST') return P.json(405, { error: 'Aðeins GET og POST' });
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
    if (b.action === 'forsenda') return await vistaForsendu(b, hver.nafn, event);
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) {
    // Hrátexti úr Supabase-svari fer aldrei í vafrann — aðeins í fallaskrána.
    console.error('[tekjur-beint]', e);
    return P.json(500, { error: 'Tekjur náðust ekki — reyndu aftur eftir smá stund' });
  }
};
exports._lesa = lesa;
