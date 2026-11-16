// einkaritari-background.cjs — safnar staðreyndum, kallar á Claude, staðfestir og vistar (16.11.2026)
//
// ARKITEKTÚRA: sama skrifa()-mynstur og _radgjafinn.cjs — lás (takaLas/sleppaLas), safna → kalla → stadfesta → vista.
// Einkaritarinn er persónulegur ritari Agnars, ekki ráðgjafi: hann skrifar samantekt vikunnar, forgangsröðun dagsins
// og staðu samninga — aldrei ráð eða betri leiðir.
//
// Kallað af: einkaritari-cron.cjs (morgunáætlun) eða POST /api/einkaritari?action=skrifa (↻ takki).
// Svartími: 5–30 s (safna) + 10–60 s (Claude) = 15–90 s. Netlify-þakið er 900 s.

'use strict';

const P = require('./_portal.cjs');
const H = require('./_radgjafinn-hlid.cjs');
const S = require('./_einkaritari-stadreyndir.cjs');

const MODEL = 'claude-opus-5-5';
const BID_MIN = 5;
const LAS_MIN = 10;
const MORGUN_MIN = 60;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ── Claude kerfi-skilaboð ──────────────────────────────────────────────────────── */
const KERFI = [
  'Þú ert Einkaritari Agnars — persónulegur ritari sem tekur saman vikuna og forgangsraðar daginn.',
  'Agnar á Slökkvitæki ehf. (eftirlit og sala slökkvitækja) og Brunahólf ehf. (brunaþéttingar).',
  'Þú skrifar á íslensku, hnitmiðað og beinskeyttur. Engin emoji.',
  '',
  'REGLUR:',
  '- Notaðu AÐEINS það sem stendur í gögnunum. Engar ágiskanir. Engin tala sem stendur ekki í gögnunum.',
  '- Hvert atriði vísar í auðkenni úr gögnunum.',
  '- merki "OMAELT" eða null þýðir ÓMÆLT — aldrei núll og aldrei „í lagi".',
  '- Netföng, símanúmer, kennitölur og bankareikningar hafa verið hulin ([netfang], [sími] …). Reyndu aldrei að endurgera þau.',
  '- Stutt og skýrt. Nefndu fólk og fyrirtæki með nafni eins og það stendur í gögnunum.',
  '',
  'ÞÚ SKRIFAR:',
  '1. **i_dag**: 3–5 atriði sem Agnar á að einbeita sér að í dag, hvert með „af_hverju" (talan úr gögnunum) og „hlekkur" (hvar í kerfinu).',
  '2. **samningar**: Heimaleiga og Center Hotels — staða í einni setningu, opin mál, næsta skref.',
  '3. **topp_vikunnar**: Mest 10 atriði sem skiptu máli í vikunni: peningar, viðskiptavinir, borð, kerfið. Hvert með „texti" og „heimild".',
  '4. **aminningar_texti**: Samantekt á áminningum (eindagar, forgangsmál, skoðanir á fresti) í 2–4 setningum.',
  '5. **fyrirsogn**: Ein setning — það mikilvægasta í dag.',
  '',
  '- Tölurnar í „Vikan í tölum" (greitt, sendar, nýir) skrifar KÓÐINN — þú nefnir þær EKKI.',
  '- Kröfur á bið (a_bid, ⏸) eru ákvörðun Agnars — aldrei leggja til innheimtu á þeim.',
].join('\n');

/* ── Claude JSON-skema ──────────────────────────────────────────────────────────── */
const STRENGUR = { type: 'string' };
const SKEMA = {
  type: 'object', additionalProperties: false,
  required: ['fyrirsogn', 'i_dag', 'samningar', 'topp_vikunnar', 'aminningar_texti'],
  properties: {
    fyrirsogn: STRENGUR,
    i_dag: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['titill', 'af_hverju', 'hlekkur'],
      properties: { titill: STRENGUR, af_hverju: STRENGUR, hlekkur: STRENGUR } } },
    samningar: { type: 'object', additionalProperties: false, required: ['heimaleiga', 'center'],
      properties: {
        heimaleiga: { type: 'object', additionalProperties: false, required: ['stada', 'opin_mal', 'naesta_skref'],
          properties: { stada: STRENGUR, opin_mal: STRENGUR, naesta_skref: STRENGUR } },
        center: { type: 'object', additionalProperties: false, required: ['stada', 'opin_mal', 'naesta_skref'],
          properties: { stada: STRENGUR, opin_mal: STRENGUR, naesta_skref: STRENGUR } },
      } },
    topp_vikunnar: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['texti', 'heimild'],
      properties: { texti: STRENGUR, heimild: STRENGUR } } },
    aminningar_texti: STRENGUR,
  },
};

/* ── Kalla á Claude ─────────────────────────────────────────────────────────────── */
async function kalla(stadreyndir) {
  const lykill = process.env.ANTHROPIC_API_KEY;
  if (!lykill) throw new Error('ANTHROPIC_API_KEY vantar á Netlify');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': lykill, 'anthropic-version': '2026-10-21', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SKEMA } },
      system: KERFI,
      messages: [{ role: 'user', content: `Í dag er ${stadreyndir.vikudagur} ${stadreyndir.dags}. Gögnin (JSON):\n${JSON.stringify(stadreyndir)}` }],
    }),
    signal: AbortSignal.timeout(3 * 60 * 1000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Claude ${r.status}: ${String((data.error && data.error.message) || '').slice(0, 200)}`);
  if (data.stop_reason === 'refusal') throw new Error('Claude hafnaði beiðninni');
  if (data.stop_reason === 'max_tokens') throw new Error('Svar Claude var of langt (max_tokens)');
  const texti = (data.content || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('');
  let svar;
  try { svar = JSON.parse(texti); } catch (_) { throw new Error('Svar Claude var ekki gilt JSON'); }
  return { svar, model: data.model || MODEL, usage: data.usage || null };
}

/* ── Staðfesta — HALFVISSA og tóm atriði hent ──────────────────────────────────── */
const HALFVISSA = /\b(virðist|líklega|sennilega|gæti verið|mögulega|kannski)\b/i;
function stadfesta(svar) {
  let hent = 0;
  if (svar.i_dag) { const f = svar.i_dag.filter((x) => x.titill && !HALFVISSA.test(x.af_hverju)); hent += svar.i_dag.length - f.length; svar.i_dag = f.slice(0, 5); }
  if (svar.topp_vikunnar) { const f = svar.topp_vikunnar.filter((x) => x.texti && !HALFVISSA.test(x.texti)); hent += svar.topp_vikunnar.length - f.length; svar.topp_vikunnar = f.slice(0, 10); }
  return { ...svar, hent };
}

/* ── Lás (sama mynstur og _radgjafinn.cjs) ──────────────────────────────────────── */
const ms = (e) => String((e && e.message) || e).slice(0, 300);
async function takaLas(key, kalladAf) {
  const nu = new Date(), nuIso = nu.toISOString();
  const lasKey = `${key}_las`;
  const value = { fra: nuIso, til: new Date(+nu + LAS_MIN * 60000).toISOString(), kallad_af: kalladAf };
  const Hd = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  const r1 = await fetch(`${SB_URL}/rest/v1/app_kv?on_conflict=key`, {
    method: 'POST', headers: { ...Hd, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ key: lasKey, value, updated_at: nuIso }),
  });
  if (!r1.ok) throw new Error(`lás: ${r1.status} ${(await r1.text()).slice(0, 120)}`);
  if ((await r1.json()).length) return { lasKey, value };
  let sia = `key=eq.${encodeURIComponent(lasKey)}&value->>til=lt.${encodeURIComponent(nuIso)}`;
  if (kalladAf !== 'morgun') sia += `&value->>fra=lt.${encodeURIComponent(new Date(+nu - BID_MIN * 60000).toISOString())}`;
  const r2 = await fetch(`${SB_URL}/rest/v1/app_kv?${sia}`, {
    method: 'PATCH', headers: { ...Hd, Prefer: 'return=representation' }, body: JSON.stringify({ value, updated_at: nuIso }),
  });
  if (!r2.ok) throw new Error(`lás: ${r2.status} ${(await r2.text()).slice(0, 120)}`);
  return (await r2.json()).length ? { lasKey, value } : null;
}

async function sleppaLas(las) {
  const nu = Date.now();
  await fetch(`${SB_URL}/rest/v1/app_kv?key=eq.${encodeURIComponent(las.lasKey)}`, {
    method: 'PATCH', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ value: { ...las.value, til: new Date(nu - 1000).toISOString() }, updated_at: new Date(nu).toISOString() }),
  });
}

/* ── Skrifa (allt ferlið) ──────────────────────────────────────────────────────── */
async function skrifa({ kalladAf = 'agnar', prufa = false, nu = new Date() } = {}) {
  const key = prufa ? `${S.LYKILL}_prufa` : S.LYKILL;
  const t0 = Date.now(), byrjad = new Date().toISOString();
  let las;
  try { las = await takaLas(key, kalladAf); }
  catch (e) { await S.skra('error', byrjad, 'Náði ekki lásnum: ' + ms(e)); throw e; }
  if (!las) return { sleppt: kalladAf === 'morgun' ? 'önnur keyrsla er í gangi' : `skrif í gangi, eða reynt fyrir minna en ${BID_MIN} mín.` };
  try {
    let fyrri;
    try { fyrri = (await S.lesaKv(S.LYKILL)) || {}; }
    catch (e) { await S.skra('error', byrjad, 'Las ekki fyrri skrif: ' + ms(e)); throw e; }
    if (kalladAf === 'morgun' && fyrri.nyjast && fyrri.nyjast.kallad_af === 'morgun' && (Date.now() - Date.parse(fyrri.nyjast.skrifad_at)) < MORGUN_MIN * 60000) {
      return { sleppt: `morgunskrifin fóru fram fyrir minna en ${MORGUN_MIN} mín.` };
    }
    return await skrifaUr(fyrri, { key, kalladAf, prufa, nu, t0, byrjad });
  } finally {
    await sleppaLas(las).catch(() => {});
  }
}

async function skrifaUr(fyrri, { key, kalladAf, prufa, nu, t0, byrjad }) {
  try {
    const f = await S.safna({ nu });
    const { svar, model, usage } = await kalla(f);
    const gilt = stadfesta(svar);
    const rec = {
      skrifad_at: new Date().toISOString(), kallad_af: kalladAf, model, ms: Date.now() - t0,
      omaelt: f.omaelt,
      tolur: { greitt: f.greitt, sendar: f.sendar, nyir_i_thjonustu: f.nyir_i_thjonustu },
      aminningar: f.aminningar,
      tokn: usage ? { inn: usage.input_tokens, ut: usage.output_tokens } : null,
      hent: gilt.hent,
      ...gilt,
    };
    await S.skrifaKv(S.GOGN_LYKILL + (prufa ? '_prufa' : ''), { skrifad_at: rec.skrifad_at, stadreyndir: f });
    const saga = [rec, ...((fyrri.saga) || [])].slice(0, 14).map((x) => ({
      skrifad_at: x.skrifad_at, kallad_af: x.kallad_af, fyrirsogn: x.fyrirsogn,
    }));
    await S.skrifaKv(key, { nyjast: rec, saga, sidasta_villa: null });
    await S.skra('ok', byrjad, `${kalladAf}${prufa ? ' (prufa)' : ''} · ${(rec.i_dag || []).length} forgangsatriði · ${(rec.topp_vikunnar || []).length} vikunnar · ${rec.hent} hent · ${rec.ms} ms`);
    return rec;
  } catch (e) {
    const villa = { kl: new Date().toISOString(), texti: String((e && e.message) || e).slice(0, 300), kallad_af: kalladAf };
    await S.skrifaKv(key, { ...fyrri, sidasta_villa: villa }).catch(() => {});
    await S.skra('error', byrjad, villa.texti);
    throw e;
  }
}

/* ── Lesa ──────────────────────────────────────────────────────────────────────── */
async function lesa({ prufa = false } = {}) {
  return (await S.lesaKv(prufa ? `${S.LYKILL}_prufa` : S.LYKILL)) || { nyjast: null, saga: [], sidasta_villa: null };
}

/* ── HTTP handler ──────────────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'POST only' });
  if (!P.dbReady()) return P.json(503, { error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY vantar' });

  const erMorgun = H.erMorgunKall(event);
  if (!erMorgun) {
    const g = await H.hlid(event);
    if (g) return g;
  }

  const q = event.queryStringParameters || {};
  const prufa = q.prufa === '1' || q.dry === '1';
  const kalladAf = erMorgun ? 'morgun' : 'agnar';

  try {
    const r = await skrifa({ kalladAf, prufa });
    return P.json(200, r, { 'cache-control': 'no-store' });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e).slice(0, 300) });
  }
};

module.exports = { ...module.exports, skrifa, lesa, kalla, stadfesta, SKEMA, KERFI, MODEL };
