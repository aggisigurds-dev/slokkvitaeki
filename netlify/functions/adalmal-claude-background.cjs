// adalmal-claude-background.cjs — „Biddu Claude" á Aðalmálum (16.11.2026). Bakgrunnsfall (allt að 15 mín.).
//
// Kallað af afgreidsla.cjs (adgerd 'adalmal', gerd 'claude') eftir að innskráður stjórnandi skráði beiðnina á röð atriðisins
// með einnota nonce. HEIMILDIN ER RÖÐIN: fallið vinnur aðeins ef { lykill, nonce } passar við beiðni sem bíður (i_vinnslu,
// yngri en 15 mín.) — án þess gerir það ekkert. Það skrifar aðeins nidurstada.claude á þá röð; ekkert fer út á við.
// Vinnan sjálf er í _adalmal-claude.cjs (gögn → Claude → staðfesting).
'use strict';

const C = require('./_adalmal-claude.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (_) { return { statusCode: 400, body: '' }; }
  const lykill = String(b.lykill || ''), nonce = String(b.nonce || '');
  if (!/^adalmal:\d+-[a-z]{1,4}-\d+$/.test(lykill) || !/^[a-f0-9]{32}$/.test(nonce)) return { statusCode: 400, body: '' };
  const r = await C.vinna(lykill, nonce).catch((e) => ({ ok: false, villa: String((e && e.message) || e) }));
  console.log('[adalmal-claude] ' + lykill + ' → ' + (r.ok ? 'tilbúið' : (r.villa || r.astaeda)));
  return { statusCode: 202, body: '' };
};
