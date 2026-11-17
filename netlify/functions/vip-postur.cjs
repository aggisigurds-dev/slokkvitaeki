// vip-postur.cjs — VIP-vaktlistinn á Þjónustuborðinu (lota 8, 17.11.2026). Aðeins innskráðir starfsmenn (_starfshlid).
//
//   GET /api/vip-postur  →  { ok, nu, felog, thraedir, inntak }
//
// Af hverju á þjóninum en ekki í vafranum: eitt VIP-félag skrifar nú mest á slokkvitaeki@brunaholf.is (15 af 30 VIP-póstum
// síðustu 60 daga, mælt 17.11.2026), og RLS hleypir vafranum EKKI í það hólf (aðeins eldklar@ og innhólf bokhald@).
// Hér les þjónustulykillinn öll þrjú hólfin og allan sendan póst — en skilar AÐEINS VIP-þráðum, og aðeins starfsmanni.
// Tengiliðir (charlize_contacts) fara aldrei út héðan; aðeins félagsheiti, kennitala félags og pörunarleiðin.
//
// Rökfræðin (pörun, ósvarað, klukka) er í _vip-postur.cjs og prófuð í test/vip-postur.test.cjs. Ekkert er skrifað hér.
'use strict';

const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const V = require('./_vip-postur.cjs');

const DAGAR = 14;
const VAKT_HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is', 'slokkvitaeki@brunaholf.is', 'Slokkvitaeki@brunaholf.is'];
const DALKAR = 'id,message_id,account,folder,thread_id,sender_name,sender_email,to_addresses,subject,snippet,body_preview,received_at,fetched_at,labels';

async function rest(slod) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, { headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : [];
}
// PostgREST sker í 1000 og segir ekki frá — blaðsíðufletta (audit-pagination).
async function allt(slod) {
  const ut = [];
  for (let fra = 0; fra < 20000; fra += 1000) {
    const s = await rest(slod + (slod.includes('?') ? '&' : '?') + `limit=1000&offset=${fra}`);
    ut.push(...s);
    if (s.length < 1000) break;
  }
  return ut;
}
const inLista = (l) => 'in.(' + l.map((x) => '"' + String(x).replace(/["\\]/g, '') + '"').join(',') + ')';
async function iBunkum(l, fn) { const ut = []; for (let i = 0; i < l.length; i += 80) ut.push(...await fn(l.slice(i, i + 80))); return ut; }

// Hvar „ósvarað“ er EKKI mælanlegt núna: Gmail-hólfin ef enginn vel heppnaður gmail-ingest í 3 klst.; slokkvitaeki@ (M365,
// lesið af luna-bridge úr Thunderbird) ef lesari segir það fast eða ekkert hefur verið lesið úr því í sólarhring.
const dkl = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return isNaN(d) ? '?' : p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + ' kl. ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
function ovisstHolf(lesarar, holfin, nuna) {
  const ut = {};
  const gm = lesarar.filter((l) => l.lesari === 'gmail-ingest' && l.stada === 'ok').map((l) => Date.parse(l.sidast)).filter(Boolean);
  if (!gm.length || nuna.getTime() - Math.max(...gm) > 3 * 36e5) {
    V.GMAIL_HOLF.forEach((a) => { ut[a] = 'Gmail-innlesturinn hefur ekki keyrt í 3 klst. — svar úr Gmail sést ekki hér fyrr en hann keyrir'; });
  }
  const sl = holfin.find((h) => h.holf === 'slokkvitaeki@brunaholf.is');
  const fast = lesarar.some((l) => l.lesari === 'luna-bridge' && /FÖST PÓSTHÓLF:[^.]*slokkvitaeki@brunaholf\.is/i.test(l.skilabod || ''));
  const gamalt = !sl || !sl.sidast_lesid || nuna.getTime() - Date.parse(sl.sidast_lesid) > 864e5;
  if (fast || gamalt) ut['slokkvitaeki@brunaholf.is'] = 'slokkvitaeki@ hefur ekki verið lesið síðan ' + (sl && sl.sidast_lesid ? dkl(sl.sidast_lesid) : '—') + (fast ? ' (lesarinn segir hólfið fast)' : '') + ' — svar gæti hafa farið úr Outlook án þess að sjást hér';
  return ut;
}

async function reikna(nu) {
  const nuna = nu instanceof Date ? nu : new Date();
  const fra = new Date(nuna.getTime() - DAGAR * 864e5).toISOString();
  const vipRadir = await rest('fyrirtaeki?select=id,nafn,kennitala,netfang,vip,vip_svartimi_min&vip=eq.true&deleted_at=is.null&order=id');
  const kts = [...new Set(vipRadir.map((r) => String(r.kennitala || '').replace(/\D/g, '')).filter((k) => k.length === 10))];
  const ktForm = kts.flatMap((k) => [k, k.slice(0, 6) + '-' + k.slice(6)]);
  const tengl = ktForm.length ? await rest('charlize_contacts?select=kennitala,netfang,len,status&kennitala=' + inLista(ktForm)) : [];
  const visir = V.byggjaVisi(vipRadir, tengl);

  const [vaktPostar, sendir] = await Promise.all([
    allt(`email_digest?select=${DALKAR}&account=${inLista(VAKT_HOLF)}&received_at=gte.${encodeURIComponent(fra)}&order=id`),
    allt(`email_digest?select=${DALKAR}&folder=eq.SENT&received_at=gte.${encodeURIComponent(fra)}&order=id`),
  ]);
  const sed = new Set(), postar = [];
  vaktPostar.concat(sendir).forEach((m) => { if (!sed.has(m.id)) { sed.add(m.id); postar.push(m); } });

  // Umferð 1: hvaða þræðir eru VIP. Umferð 2: samhengi (svarað-skráning, falið, mál) aðeins fyrir þá.
  const fyrst = V.thraedir(postar, {}, visir, nuna);
  const lyklar = new Set(fyrst.map((t) => t.k));
  const inn = postar.filter((m) => m.folder !== 'SENT' && lyklar.has(V.thradLykill(m)));
  const mids = [...new Set(inn.map((m) => m.message_id).filter(Boolean))];
  const ids = inn.map((m) => m.id);
  const [act, fal, mal] = await Promise.all([
    iBunkum(mids, (b) => rest('reikninga_postur_activity?select=message_id&message_id=' + inLista(b))),
    iBunkum(mids, (b) => rest('reikninga_postur_hidden?select=message_id&message_id=' + inLista(b))),
    iBunkum(ids, (b) => rest('thjonustubeidni?select=id,status,svarad_at,updated_at,channel_ref&deleted_at=is.null&channel_ref=' + inLista(b.map((i) => 'email:' + i)))),
  ]);
  const malMap = new Map();
  mal.sort((a, b) => b.id - a.id).forEach((r) => { const id = String(r.channel_ref || '').slice(6); if (id && !malMap.has(id)) malMap.set(id, r); });
  // Innlestur: síðasta keyrsla hvers lesara + síðasta innlesna skeyti hvers hólfs (klukkan sér aðeins það sem er komið inn).
  const [keyrslur, ...holfin] = await Promise.all([
    rest('automation_runs?select=job_name,source,status,started_at,detail&job_name=in.(luna-bridge,gmail-ingest)&started_at=gte.' + encodeURIComponent(new Date(nuna.getTime() - 864e5).toISOString()) + '&order=started_at.desc&limit=400'),
    ...['eldklar@eldklar.is', 'bokhald@eldklar.is', 'slokkvitaeki@brunaholf.is'].map((a) => rest(`email_digest?select=fetched_at&account=ilike.${encodeURIComponent(a)}&order=fetched_at.desc.nullslast&limit=1`).then((r) => ({ holf: a, sidast_lesid: (r[0] && r[0].fetched_at) || null }))),
  ]);
  const lesarar = {};
  keyrslur.forEach((k) => { const l = k.job_name + '|' + k.source; if (!lesarar[l]) lesarar[l] = { lesari: k.job_name, vel: String(k.source || '').replace(/^luna-bridge:/, ''), sidast: k.started_at, stada: k.status, skilabod: String(k.detail || '').slice(0, 160) }; });
  const ovisst = ovisstHolf(Object.values(lesarar), holfin, nuna);

  const ctx = { activity: new Set(act.map((x) => x.message_id)), falid: new Set(fal.map((x) => x.message_id)), mal: malMap, ovisst };
  const listi = V.thraedir(postar, ctx, visir, nuna);
  const bidur = listi.filter((t) => t.bidur).map((t) => {
    const m = postar.find((x) => x.id === t.digest_id) || {};
    return Object.assign({}, t, { texti: String(m.body_preview || m.snippet || '').slice(0, 1500) });
  });

  return {
    ok: true, nu: nuna.toISOString(), dagar: DAGAR,
    felog: visir.felog.map((f) => ({ nafn: f.nafn, kt: f.kt, radir: f.radir.length, svartimi: f.svartimi })),
    thraedir: bidur,
    svarad: listi.filter((t) => !t.bidur).map((t) => ({ k: t.k, felag: t.felag })),
    inntak: { lesarar: Object.values(lesarar), holf: holfin },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  const g = await H.krefjastStarfsmanns(event); if (g) return g;
  if (!P.dbReady()) return P.json(503, { error: 'Gagnagrunnur ekki tengdur' });
  try {
    const d = await reikna(new Date());
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(d) };
  } catch (e) {
    return P.json(500, { error: 'VIP-vaktin náði ekki í gögnin: ' + ((e && e.message) || e) });
  }
};
exports._reikna = reikna;
exports._ovisstHolf = ovisstHolf;
