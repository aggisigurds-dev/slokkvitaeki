// postur-jafnodum-cron.cjs — áætlun JAFNÓÐUM (26.11.2026).
//
// Ræst á 30 mín. fresti (netlify.toml [functions."postur-jafnodum-cron"]). Kveikir á bakgrunnsfallinu
// (postur-jafnodum-background) sem semur drög og býr til „Tilbúið verk"-spjöld fyrir nýja póstinn — svo þau bíði Agnars
// jafnóðum, án þess að hann þurfi að opna neitt. Sama mynstur og radgjafinn-morgun → radgjafinn-background.
// EKKERT er sent héðan: spjaldið er drög sem Agnar sendir sjálfur. Engin ný spurning → bakgrunnsfallið gerir ekkert.
'use strict';

exports.handler = async () => {
  const grunnur = String(process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  try {
    await fetch(grunnur + '/.netlify/functions/postur-jafnodum-background', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000),
    });
  } catch (_) { /* næsta keyrsla tekur það — aldrei fall sem stöðvar áætlunina */ }
  return { statusCode: 200, body: 'ok' };
};
