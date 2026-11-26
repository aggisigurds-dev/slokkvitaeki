// postur-jafnodum.cjs — HTTP-hlið JAFNÓÐUM (26.11.2026). Innskráður starfsmaður.
//
//   GET /api/postur-jafnodum?prufa=1   → { frambjodendur[], sleppt, opin, budget }  — AÐEINS lestur, engin drög, ekkert spjald
//   GET /api/postur-jafnodum           → ræsir bakgrunnsfallið (sama og cron) og skilar 202
//
// Sjálf vinnan (skönnun + drög + spjöld) er í postur-jafnodum-background.cjs. Hér er dyraeftirlit + prufa-sýn fyrir Agnar
// og prófun. Prufan er örugg hvar sem er: hún les bara hvað YRÐI samið, kallar hvorki á Sonnet né skrifar spjald.
'use strict';

const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const BG = require('./postur-jafnodum-background.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(500, { error: 'Supabase env vantar' });
  const g = await H.krefjastStarfsmanns(event); if (g) return g;   // lokað sjálfgefið — aðeins innskráður starfsmaður
  const qs = event.queryStringParameters || {};
  try {
    if (qs.prufa != null) {
      const s = await BG.skanna(BG.NY_I_KEYRSLU);
      return P.json(200, {
        ok: true, prufa: true, opin: s.opin, budget: s.budget, thak_opin: BG.THAK_OPIN,
        frambjodendur: s.candidates.map((e) => ({ digest_id: e.id, fra: e.sender_name || e.sender_email, netfang: e.sender_email, efni: e.subject, dags: String(e.received_at).slice(0, 16).replace('T', ' ') })),
        sleppt: s.sleppt,
      });
    }
    // Samstillt keyrsla (greining / handvirkt): bíður eftir vinnunni og skilar niðurstöðu MEÐ villum. Smá budget svo
    // það haldist innan tímamarka samstillts falls. Notað til að sjá nákvæmlega hvað brást (villur-fylkið).
    if (qs.keyra === 'sync') {
      const r = await BG.vinna({ budget: Math.min(3, Number(qs.budget) || BG.NY_I_KEYRSLU) });
      return P.json(200, Object.assign({ ok: true, synced: true }, r));
    }
    // Handvirk keyrsla: ræsa bakgrunnsfallið (15 mín. þak þar) og skila strax — ekkert beðið eftir Sonnet.
    const grunnur = String(process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
    const r = await fetch(grunnur + '/.netlify/functions/postur-jafnodum-background', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) }).catch(() => null);
    return P.json(202, { ok: true, raest: true, svar: r ? r.status : null });
  } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
};
