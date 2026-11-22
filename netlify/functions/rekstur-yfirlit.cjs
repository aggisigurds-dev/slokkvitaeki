// rekstur-yfirlit.cjs — „Hvernig gengur reksturinn?“ (22.11.2026, beiðni Agnars), efst í Tekjur í beinni.
//
//   Aðeins STJÓRNANDI (rola Admin): óinnskráður 401, önnur rola 403 (sama hlið og tekjur-beint).
//   GET /api/rekstur-yfirlit → { maelt_at, idag, slokkvitaeki, brunaholf, skilgreining }
//
// Hvort félag sér (aldrei lögð saman): sex heilir mánuðir á undan + líðandi mánuður til dags — UNNIÐ · REIKNINGSFÆRT · GREITT og „ógefið út“;
// ÓGREITT núna; INNHEIMTUHLUTFALL og GREIÐSLUHRAÐI; ein skýr setning + (merkt) áætlun. Reglurnar búa í _rekstur-yfirlit.cjs og _unnid-sl.cjs
// (hrein föll, prófuð). Brunahólfs-hlutinn kemur úr EINU kalli á brunaholf /api/rekstur-manudir (kaka kallandans áfram — aðeins hub_user).
// Sjálfstætt fall (ekki hluti af tekjur-beint): þungu lestrarnir fá eigin tímamörk og seinka ekki flísunum. Hver heimild sér:
// bregðist hún er hún `{ omaelt: ástæða }` — aldrei 0 — og hinar standa. 7 s tímamörk á öllum lestrum (fallið hefur 10 s).
// Engin nöfn kúnna fara út — aðeins samtölur.
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const HUB = require('./hub-adgangar.cjs');
const T = require('./_tekjur.cjs');
const Y = require('./_rekstur-yfirlit.cjs');
const TL = require('./_tekjulidir.cjs');

const BH = (process.env.BRUNAHOLF_URL || 'https://brunaholf.netlify.app').replace(/\/$/, '');
const KR = (n) => Math.round(Number(n) || 0);
const dagur = (x) => String(x || '').slice(0, 10);

const { sbOll, lesaSolugogn } = require('./_sl-lestur.cjs');
const timeout = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined);
const astaeda = (nafn, e) => (e && e.name === 'TimeoutError' ? `${nafn} svaraði of seint` : `${nafn} náðist ekki`);

// ── Slökkvitæki ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function lesaSl(nu) {
  let g;
  try { g = await lesaSolugogn({ payday: true, paydayFra: Y.INNHEIMTA_FRA, osent: true, vorur: true, vorurValfrjalst: true }, (() => { const s = timeout(); return s ? { signal: s } : undefined; })()); }
  catch (e) { if (/skilaði engu/.test(String(e && e.message))) return { omaelt: e.message }; throw e; }
  const { solur, voidIds, skyrslur, verkbeidnir, verklidir, payday, osentRadir, frumsolur, vorur } = g;
  const nuIso = nu.toISOString();
  const paydayOk = payday.length > 0;
  const r = Y.reksturSl({ solur, voidIds, frumsolur, skyrslur, verkbeidnir, verklidir, payday: paydayOk ? payday : null, paydayOmaelt: 'Payday-lesturinn skilaði engu' }, nuIso);
  let tekjulidirTopp = null;
  if (Array.isArray(vorur) && vorur.length) {
    try {
      const tl = TL.tekjulidir({ solur, voidIds, frumsolur, skyrslur, verkbeidnir, verklidir, vorur }, nuIso);
      const m = tl.nu_manudur;
      tekjulidirTopp = { man: m, samtals: tl.samtals_man[m] || 0, topp: TL.toppFlokkar(tl, m, 5), stemmir: tl.stemmir, heild: tl.heild };
    } catch (e) { tekjulidirTopp = { omaelt: 'tekjuliðir náðust ekki' }; }
  } else tekjulidirTopp = { omaelt: 'vörulistinn náðist ekki — án hans eru flokkarnir ekki réttir' };
  const idag = dagur(nuIso);
  const inn = paydayOk ? Y.ogreittOgInnheimta(payday, idag, Y.INNHEIMTA_FRA) : null;
  return {
    man: r.man, kredit_an_frumsolu: r.kredit_an_frumsolu, tekjulidir: tekjulidirTopp,
    ogreitt: inn ? { kr_an_vsk: inn.sent_kr, kr_m_vsk: inn.sent_m_vsk, n: inn.sent_n, gjaldfallid_kr: inn.gjaldfallid_kr, gjaldfallid_n: inn.gjaldfallid_n, yfir45_kr: inn.yfir45_kr, yfir45_n: inn.yfir45_n,
      osent: Array.isArray(osentRadir) ? { kr_m_vsk: osentRadir.reduce((a, x) => a + KR(x.samtals), 0), n: osentRadir.length } : { omaelt: 'ósent-lesturinn náðist ekki' } }
      : { omaelt: 'Payday-lesturinn skilaði engu' },
    // ferskleiki Payday-gagnanna: líðandi mánuður getur sýnt of lítið reikningsfært ef samstillingin er gömul (rýni 22.11)
    ferskleiki: paydayOk ? { payday_samstillt: payday.reduce((a, x) => (x.updated_at && x.updated_at > a ? x.updated_at : a), '') || null, nyjasti_reikningur: payday.reduce((a, x) => (x.created_date && x.created_date > a ? x.created_date : a), '') || null } : null,
    innheimta: inn ? { hlutfall: inn.hlutfall, hradi_midgildi: inn.hradi_midgildi, hradi_n: inn.hradi_n, greitt_kr: inn.greitt_kr, gjaldfallid_kr: inn.gjaldfallid_kr, fra: inn.fra } : { omaelt: 'Payday-lesturinn skilaði engu' },
  };
}

// ── Brunahólf ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Eitt kall á brunaholf /api/rekstur-manudir — sex mánuðir í einu (rekstrarskýrslan skilar aðeins mánuð til dags og þrjá heila).
async function bhManudir(event) {
  const hra = (event && event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const m = /(?:^|;\s*)hub_user=([^;]+)/.exec(String(hra));
  if (!m) return { omaelt: 'innskráningarkökuna vantar' };
  const r = await fetch(`${BH}/api/rekstur-manudir`, { headers: { cookie: `hub_user=${m[1]}`, accept: 'application/json' }, signal: timeout() });
  if (!r.ok) return { omaelt: `Rekstur-mánuðir Brunahólfs svaraði ${r.status}` };
  const j = await r.json();
  if (!j || !Array.isArray(j.man) || j.man.length < 7 || !j.man.every((x) => x && Number.isFinite(Number(x.unnid)) && Number.isFinite(Number(x.greitt)))) return { omaelt: 'Rekstur-mánuðir Brunahólfs: óvænt snið' };
  return { man: j.man, innheimta: j.innheimta || { omaelt: 'innheimta fylgdi ekki' }, ferskleiki: j.ferskleiki || null };
}
// Reikningsfært Brunahólfs: sama tafla og regla og tekjur-beint (invoices PAID+SENT eftir útgáfudegi, höfuðstóll)
async function bhReikningsfaert() {
  const fra = T.SL_FRA + '-01';
  const rows = await sbOll(`invoices?select=status,source,hofudstoll,gjalddagi,utgafudagur&source=eq.payday&status=in.(PAID,SENT)&or=(utgafudagur.gte.${fra},and(utgafudagur.is.null,gjalddagi.gte.${fra}))&order=id.asc`, (() => { const s = timeout(); return s ? { signal: s } : undefined; })());
  return rows.length ? { rows } : { omaelt: 'reikningalesturinn skilaði engu' };
}
// Ógreitt núna hjá BH = sama tala og Kröfu yfirlit (þrep 1, m. vsk) — eins og yfirsyn.cjs. Gjaldfallið/yfir 45 d úr gjalddaga reikninganna.
async function bhOgreitt() {
  const headers = { accept: 'application/json' };
  if (typeof HUB.hubApiToki === 'function') {
    const toki = await HUB.hubApiToki().catch(() => '');
    if (toki) headers[HUB.HUB_TOKI_HAUS || 'x-hub-toki'] = toki;
  }
  const r = await fetch(`${BH}/api/krofu-yfirlit-bru`, { headers, signal: timeout() });
  if (!r.ok) return { omaelt: `Kröfu yfirlit Brunahólfs svaraði ${r.status}${r.status === 401 || r.status === 403 ? ' (lokað — tóki vantar eða ógildur)' : ''}` };
  const d = await r.json();
  const t1 = d && d.tier1;
  if (!t1 || !Number.isFinite(Number(t1.total))) return { omaelt: 'Kröfu yfirlit Brunahólfs: óvænt snið' };
  const idag = dagur(new Date().toISOString()), t0 = Date.parse(idag);
  const ogr = [];
  (t1.debtors || []).forEach((db) => (db.invoices || []).forEach((i) => { if (!i.hidden && !i.done) ogr.push(i); }));   // sama mengi og samtala Kröfu yfirlits
  const dagarFraGj = (i) => (i.gjalddagi ? Math.floor((t0 - Date.parse(dagur(i.gjalddagi))) / 86400000) : null);
  const fallin = ogr.filter((i) => (dagarFraGj(i) || 0) > 0), eldri = ogr.filter((i) => (dagarFraGj(i) || 0) > 45);
  return {
    kr_m_vsk: KR(t1.total), n: Number(t1.n) || 0,
    gjaldfallid_kr_m_vsk: fallin.reduce((a, i) => a + KR(i.amount), 0), gjaldfallid_n: fallin.length,
    yfir45_kr_m_vsk: eldri.reduce((a, i) => a + KR(i.amount), 0), yfir45_n: eldri.length,
    osent: d.tier2 && Number.isFinite(Number(d.tier2.total)) ? { kr_m_vsk: KR(d.tier2.total), n: Number(d.tier2.n) || 0 } : { omaelt: 'ósent vantar í Kröfu yfirliti' },
  };
}
async function mael(nafn, f) {
  try { return await f(); } catch (e) { console.error('[rekstur-yfirlit]', nafn, String((e && e.message) || e).slice(0, 200)); return { omaelt: astaeda(nafn, e) }; }
}

function setningFyrir(man, nuIso) {
  const m = man[man.length - 1], f = man[man.length - 2];
  return Y.manadarSetning({
    man: m.man, unnid: m.unnid, omaelt: m.omaelt, fyrri_man: f.man, fyrri: f.unnid, vd: Y.vinnudagar(m.man, nuIso),
  });
}

async function lesa(nu, event) {
  const nuIso = nu.toISOString();
  const [sl, bhM, bhRf, bhOg] = await Promise.all([
    mael('Slökkvitækjahluti', () => lesaSl(nu)),
    mael('Rekstur Brunahólfs', () => bhManudir(event)),
    mael('Reikningar Brunahólfs', bhReikningsfaert),
    mael('Kröfu yfirlit Brunahólfs', bhOgreitt),
  ]);
  let slut = sl;
  if (!sl.omaelt) slut = { ...sl, setning: setningFyrir(sl.man, nuIso) };
  // Brunahólf: unnið/greitt úr rekstur-manudir, reikningsfært úr invoices — hvort fyrir sig ómælt með ástæðu
  const bh = Y.reksturBh(bhM.omaelt ? null : bhM.man, bhRf.omaelt ? null : bhRf.rows, nuIso, bhM.omaelt, bhRf.omaelt);
  const bhut = {
    ...bh,
    ogreitt: bhOg,
    innheimta: bhM.omaelt ? { omaelt: bhM.omaelt } : bhM.innheimta,
    setning: setningFyrir(bh.man, nuIso),
  };
  return {
    maelt_at: nuIso, idag: dagur(nuIso),
    slokkvitaeki: slut,
    brunaholf: bhut,
    skilgreining: Y.SKILGREINING,
    athugasemd: 'Hvort félag sér, án VSK (nema „Ógreitt“ hjá Brunahólfi: m. VSK eins og Kröfu yfirlit). Félögin eru aldrei lögð saman. Vinnudagar: mán–fös, frídagar ekki dregnir frá.',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.stjornandi(event);
  if (hver.villa) return hver.villa;
  try {
    return P.json(200, await lesa(new Date(), event));
  } catch (e) {
    console.error('[rekstur-yfirlit]', e);
    return P.json(500, { error: 'Reksturinn náðist ekki — reyndu aftur eftir smá stund' });
  }
};
exports._lesa = lesa;
