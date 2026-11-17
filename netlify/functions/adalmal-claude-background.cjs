// adalmal-claude-background.cjs — „Biddu Claude" á Aðalmálum (16.11.2026). Bakgrunnsfall (allt að 15 mín.).
//
// Kallað af afgreidsla.cjs (adgerd 'adalmal', gerd 'claude') eftir að innskráður stjórnandi skráði beiðnina á röð atriðisins
// með einnota nonce. HEIMILDIN ER RÖÐIN: fallið vinnur aðeins ef { lykill, nonce } passar við beiðni sem bíður (i_vinnslu,
// yngri en 15 mín.) — án þess gerir það ekkert. Það skrifar aðeins nidurstada.claude á þá röð; ekkert fer út á við.
// Vinnan sjálf er í _adalmal-claude.cjs (gögn → Claude → staðfesting).
//
// MERKJA OG KEYRA (17.11.2026, 519): sama fall vinnur merkta línu á Þjónustuborðinu — { merki_id, nonce } (afgreidsla.cjs
// adgerd 'merkja_keyra'). Sama heimildarregla: nonce verður að standa á bord_merkingar-röðinni (i_keyrslu, < 15 mín.).
// Vinnan er í _merkja.cjs vinnaMerki (CL.safna → CL.kalla → CL.stadfesta → mat Óðins → tilbúið verk). Ekkert fer út.
'use strict';

const C = require('./_adalmal-claude.cjs');
const M = require('./_merkja.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (_) { return { statusCode: 400, body: '' }; }
  const nonce = String(b.nonce || '');
  if (!/^[a-f0-9]{32}$/.test(nonce)) return { statusCode: 400, body: '' };
  if (b.merki_id != null) {
    const id = Number(b.merki_id);
    if (!Number.isInteger(id) || id <= 0) return { statusCode: 400, body: '' };
    const r = await M.vinnaMerki(id, nonce).catch((e) => ({ ok: false, villa: String((e && e.message) || e) }));
    console.log('[merkja] #' + id + ' → ' + (r.ok ? (r.marktaekt ? 'klárað' : 'vantar svar') : (r.villa || r.astaeda)));
    return { statusCode: 202, body: '' };
  }
  const lykill = String(b.lykill || '');
  if (!/^adalmal:\d+-[a-z]{1,4}-\d+$/.test(lykill)) return { statusCode: 400, body: '' };
  const r = await C.vinna(lykill, nonce).catch((e) => ({ ok: false, villa: String((e && e.message) || e) }));
  console.log('[adalmal-claude] ' + lykill + ' → ' + (r.ok ? 'tilbúið' : (r.villa || r.astaeda)));
  return { statusCode: 202, body: '' };
};
