// innflutningur.cjs — Innflutningur í Birgðum (16.11.2026, Agnar: „nýjan flipa … um innfluttning og útreikninginn á
// öllu innfluttu sem við síðan uppfærum við núverandi birgðir").
//
//   GET  /api/innflutningur                                   → { sendingar[], vorur[] }  (hver sending ber `reikningur`)
//   GET  /api/innflutningur?vara=<id>                         → { vara, hreyfingar[], sala[] }  hreyfingalisti einnar vöru
//   POST { action:'vista', sending:{ id?, updated_at?, … } }  → { sending }   drög; ný röð ef ekkert id
//   POST { action:'eyda', id }                                → { ok }        aðeins drög
//   POST { action:'faera', id, val, forskoda?, omaelt_ok? }   → { aaetlun } / { sending, faersla }
//   POST { action:'afturkalla', id }                          → { sending, afturkallad, sleppt }
//
// Taflan `innflutningur` (sql/innflutningur.sql) er með RLS og engar reglur: aðeins þetta fall les hana og skrifar,
// með þjónustulyklinum, á bak við starfsmannahliðið. Útreikningurinn býr í _innflutningur-reikna.cjs (hreinn, prófaður)
// svo það sem birtist og það sem fer á vörurnar er sama talan.
//
// Færsla á birgðir skrifar `vorur.kostnadarverd` (og `vorur.birgdir` ef valið er að bæta magninu við) — sömu reiti og
// Birgðir, Vörur og þjónusta og Sala lesa. Hver skrift er skilyrt á gildið sem var lesið, svo breyting frá annarri vél
// á milli lestrar og skriftar er ekki yfirskrifuð heldur sögð. Færslan og afturköllunin skrást í `saga` sendingarinnar.
// Kostnaður: eitt kall per hleðslu flipans og per breytingu — engin vöktun.

const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const R = require('./_innflutningur-reikna.cjs');

const ENGAR_BIRGDIR = ['Þjónusta', 'Vinna og akstur', 'Leiga'];

async function sb(slod, init = {}) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, {
    ...init,
    headers: {
      apikey: P.SUPABASE_KEY,
      Authorization: `Bearer ${P.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
const skila = { Prefer: 'return=representation' };
const sia = (v) => (v == null ? 'is.null' : `eq.${v}`);
const utSending = (row) => ({ ...row, reikningur: R.reikna(row) });
const idOk = (x) => Number.isInteger(Number(x)) && Number(x) > 0;

async function saekja(id) {
  const rows = await sb(`innflutningur?id=eq.${Number(id)}&select=*`);
  return rows && rows[0];
}

async function vista(b, nafn) {
  const inn = R.hreinsa(b.sending);
  const nu = new Date().toISOString();
  const id = b.sending && b.sending.id;
  if (!id) {
    const [ny] = await sb('innflutningur', { method: 'POST', headers: skila,
      body: JSON.stringify({ ...inn, stada: 'drog', saga: [{ at: nu, af: nafn, adgerd: 'stofnud' }], breytt_af: nafn, updated_at: nu }) });
    return P.json(200, { sending: utSending(ny) });
  }
  if (!idOk(id)) return P.json(400, { error: 'Ógilt auðkenni' });
  const gomul = await saekja(id);
  if (!gomul) return P.json(404, { error: 'Sendingin fannst ekki' });
  if (gomul.stada === 'faert') return P.json(409, { error: 'Sendingin hefur verið færð í birgðir. Afturkallaðu færsluna til að breyta henni.', sending: utSending(gomul) });
  // Önnur vél kann að hafa vistað á meðan: skrifa aðeins ef útgáfan er sú sem vafrinn sá.
  const skilyrdi = b.sending.updated_at ? `&updated_at=eq.${encodeURIComponent(b.sending.updated_at)}` : '';
  const rows = await sb(`innflutningur?id=eq.${Number(id)}&stada=eq.drog${skilyrdi}`, { method: 'PATCH', headers: skila,
    body: JSON.stringify({ ...inn, breytt_af: nafn, updated_at: nu }) });
  if (!rows || !rows.length) {
    const ny = await saekja(id);
    return P.json(409, { error: 'Sendingunni var breytt á annarri vél á meðan. Nýjasta útgáfan er sýnd; settu breytinguna inn aftur.', sending: ny && utSending(ny) });
  }
  return P.json(200, { sending: utSending(rows[0]) });
}

async function eyda(b) {
  if (!idOk(b.id)) return P.json(400, { error: 'Ógilt auðkenni' });
  const rows = await sb(`innflutningur?id=eq.${Number(b.id)}&stada=eq.drog`, { method: 'DELETE', headers: skila });
  if (!rows || !rows.length) return P.json(409, { error: 'Aðeins drögum má eyða. Afturkallaðu færsluna fyrst.' });
  return P.json(200, { ok: true });
}

async function lesaVorur(ids) {
  if (!ids.length) return [];
  return sb(`vorur?id=in.(${ids.map(Number).join(',')})&select=id,nafn,birgdir,kostnadarverd`);
}

async function faera(b, nafn) {
  if (!idOk(b.id)) return P.json(400, { error: 'Ógilt auðkenni' });
  const row = await saekja(b.id);
  if (!row) return P.json(404, { error: 'Sendingin fannst ekki' });
  if (row.stada === 'faert') return P.json(409, { error: 'Sendingin hefur þegar verið færð í birgðir', sending: utSending(row) });
  const reikn = R.reikna(row);
  const vorur = await lesaVorur(R.aVorur(reikn).map((a) => a.vara_id));
  const plan = R.aaetlun(reikn, b.val || {}, vorur);
  if (b.forskoda) return P.json(200, { aaetlun: plan, reikningur: reikn });
  if (reikn.omaeldir.length && b.omaelt_ok !== true) {
    return P.json(400, { error: `Ómældur kostnaður: ${reikn.omaeldir.join(', ')}. Staðfestu að færa samt, eða skráðu upphæðina fyrst.`, omaeldir: reikn.omaeldir });
  }
  if (!plan.linur.length) return P.json(400, { error: 'Ekkert breytist á vörunum með þessu vali' });

  const gert = [];
  const arekstrar = [];
  for (const l of plan.linur) {
    const breyting = {};
    if (l.kostn_eftir !== l.kostn_fyrir) breyting.kostnadarverd = l.kostn_eftir;
    if (l.birgdir_eftir !== l.birgdir_fyrir) breyting.birgdir = Math.round(l.birgdir_eftir);
    const rows = await sb(`vorur?id=eq.${l.vara_id}&kostnadarverd=${sia(l.kostn_fyrir)}&birgdir=${sia(l.birgdir_fyrir)}`,
      { method: 'PATCH', headers: skila, body: JSON.stringify(breyting) });
    if (rows && rows.length) gert.push(l);
    else arekstrar.push({ vara_id: l.vara_id, nafn: l.nafn, astaeda: 'Kaupverði eða lager var breytt á meðan — ekkert skrifað á þessa vöru' });
  }
  if (!gert.length) return P.json(409, { error: 'Engu var breytt: vörunum var breytt á meðan. Hladdu flipanum aftur.', arekstrar });

  const nu = new Date().toISOString();
  // Hreyfingalisti hverrar vöru (vorur_hreyfingar): ein röð per vöru sendingarinnar, líka þær sem halda eldra kaupverði.
  // Bregðist skriftin stendur færslan (kaupverðið er komið á vörurnar og `faersla` geymir það) — sagt frá í svarinu.
  let hreyfingarVilla = null;
  try {
    await sb('vorur_hreyfingar', { method: 'POST', body: JSON.stringify(R.hreyfingar(row, reikn, gert, vorur, nafn)) });
  } catch (e) { hreyfingarVilla = e && e.message ? e.message : String(e); console.error('[innflutningur] hreyfingar', e); }
  const faersla = { at: nu, af: nafn, linur: gert, arekstrar, omaeldir: reikn.omaeldir };
  const saga = (Array.isArray(row.saga) ? row.saga : []).concat([{ at: nu, af: nafn, adgerd: 'faert', fjoldi: gert.length }]);
  const [ny] = await sb(`innflutningur?id=eq.${row.id}`, { method: 'PATCH', headers: skila,
    body: JSON.stringify({ stada: 'faert', faersla, saga, breytt_af: nafn, updated_at: nu }) });
  return P.json(200, { sending: utSending(ny), faersla, hreyfingar_villa: hreyfingarVilla });
}

async function afturkalla(b, nafn) {
  if (!idOk(b.id)) return P.json(400, { error: 'Ógilt auðkenni' });
  const row = await saekja(b.id);
  if (!row) return P.json(404, { error: 'Sendingin fannst ekki' });
  if (row.stada !== 'faert' || !row.faersla) return P.json(409, { error: 'Sendingin hefur ekki verið færð í birgðir' });
  const linur = Array.isArray(row.faersla.linur) ? row.faersla.linur : [];
  const vorur = await lesaVorur(linur.map((l) => l.vara_id));
  const eftirId = new Map((vorur || []).map((v) => [Number(v.id), v]));
  const afturkallad = [];
  const sleppt = [];
  for (const l of linur) {
    const v = eftirId.get(Number(l.vara_id));
    if (!v) { sleppt.push({ vara_id: l.vara_id, nafn: l.nafn, astaeda: 'Varan fannst ekki' }); continue; }
    const kNu = v.kostnadarverd == null ? null : Number(v.kostnadarverd);
    const bNu = v.birgdir == null ? null : Number(v.birgdir);
    const breyting = {};
    const ath = [];
    // Kaupverð fer aðeins til baka ef enginn hefur breytt því síðan; lager dregst frá um það sem var bætt við
    // (sala eftir færsluna stendur).
    if (l.kostn_eftir !== l.kostn_fyrir) {
      if (kNu === l.kostn_eftir) breyting.kostnadarverd = l.kostn_fyrir;
      else ath.push('kaupverði var breytt síðan og stendur');
    }
    if (l.baeta && l.birgdir_eftir !== l.birgdir_fyrir) {
      breyting.birgdir = Math.round((bNu || 0) - (l.birgdir_eftir - (l.birgdir_fyrir || 0)));
    }
    if (!Object.keys(breyting).length) { sleppt.push({ vara_id: l.vara_id, nafn: l.nafn, astaeda: ath.join('; ') || 'Ekkert að afturkalla' }); continue; }
    const rows = await sb(`vorur?id=eq.${l.vara_id}&kostnadarverd=${sia(kNu)}&birgdir=${sia(bNu)}`,
      { method: 'PATCH', headers: skila, body: JSON.stringify(breyting) });
    if (rows && rows.length) afturkallad.push({ vara_id: l.vara_id, nafn: l.nafn, ath });
    else sleppt.push({ vara_id: l.vara_id, nafn: l.nafn, astaeda: 'Vörunni var breytt á meðan — reyndu aftur' });
  }
  const nu = new Date().toISOString();
  try {
    await sb(`vorur_hreyfingar?innflutningur_id=eq.${row.id}&afturkallad_at=is.null`, { method: 'PATCH', body: JSON.stringify({ afturkallad_at: nu }) });
  } catch (e) { console.error('[innflutningur] hreyfingar afturkallaðar', e); }
  const saga = (Array.isArray(row.saga) ? row.saga : []).concat([{ at: nu, af: nafn, adgerd: 'afturkallad', fjoldi: afturkallad.length, sleppt: sleppt.length }]);
  const [ny] = await sb(`innflutningur?id=eq.${row.id}`, { method: 'PATCH', headers: skila,
    body: JSON.stringify({ stada: 'drog', faersla: null, saga, breytt_af: nafn, updated_at: nu }) });
  return P.json(200, { sending: utSending(ny), afturkallad, sleppt });
}

// Hreyfingalisti einnar vöru: varan sjálf, hreyfingarnar (nýjast fyrst) og salan eftir mánuðum (sömu föll og „Selt"
// í Birgðum). Náist salan ekki er hún sögð ómæld (sala_villa) — hún er aldrei sýnd sem núll.
async function voruSaga(id) {
  const [vorur, hreyfingar, sala] = await Promise.all([
    sb(`vorur?id=eq.${id}&select=id,nafn,flokkur,birgdir,kostnadarverd,listaverd,verd_an_vsk,vsk_prosenta,birgi`),
    sb(`vorur_hreyfingar?vara_id=eq.${id}&select=*&order=created_at.desc,id.desc&limit=300`),
    sb('rpc/vara_solusaga', { method: 'POST', body: JSON.stringify({ p_vara: id }) }).catch((e) => { console.error('[innflutningur] sölusaga', e); return null; }),
  ]);
  if (!vorur || !vorur[0]) return P.json(404, { error: 'Varan fannst ekki' });
  return P.json(200, { vara: vorur[0], hreyfingar: hreyfingar || [], sala: sala || [], sala_villa: sala == null });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.starfsmadur(event);
  if (hver.villa) return hver.villa;

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      if (q.vara != null && q.vara !== '') {
        if (!idOk(q.vara)) return P.json(400, { error: 'Ógilt vörunúmer' });
        return await voruSaga(Number(q.vara));
      }
      const [sendingar, vorur] = await Promise.all([
        sb('innflutningur?select=*&order=dags.desc.nullsfirst,id.desc&limit=200'),
        sb('vorur?select=id,nafn,flokkur,birgdir,kostnadarverd,listaverd,verd_an_vsk,vsk_prosenta,birgi,virkt&order=nafn&limit=2000'),
      ]);
      return P.json(200, {
        sendingar: (sendingar || []).map(utSending),
        vorur: (vorur || []).filter((v) => !ENGAR_BIRGDIR.includes(v.flokkur || '')),
      });
    }
    if (event.httpMethod !== 'POST') return P.json(405, { error: 'Aðeins GET og POST' });
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
    if (b.action === 'vista') return await vista(b, hver.nafn);
    if (b.action === 'eyda') return await eyda(b);
    if (b.action === 'faera') return await faera(b, hver.nafn);
    if (b.action === 'afturkalla') return await afturkalla(b, hver.nafn);
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) {
    console.error('[innflutningur]', e);
    return P.json(502, { error: 'Náði ekki í gögn: ' + (e && e.message ? e.message : String(e)) });
  }
};
