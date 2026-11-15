// radgjafinn-background.cjs — RÁÐGJAFINN, skrifa núna (15.11.2026). Kjarninn og skýringin: _radgjafinn.cjs.
//
//   POST /.netlify/functions/radgjafinn-background           → skrifar nýtt morgunyfirlit (↻ í glugganum á borðinu)
//   POST /.netlify/functions/radgjafinn-background?prufa=1   → prufuskrif í app_kv['radgjafinn_prufa'] (sjást ekki á borðinu)
//
// Bakgrunnsfall: Netlify svarar 202 strax og keyrir þetta í allt að 15 mín (Claude-kallið tekur ~1–2 mín).
// Starfsmanna-hliðið gildir, og skrif oftar en á BID_MIN mín. fresti gera ekkert — hvert skrif er Claude-kall.

const P = require('./_portal.cjs');
const R = require('./_radgjafinn.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return;
  if (P.requireStaff(event)) return;
  if (!P.dbReady()) return;
  const q = event.queryStringParameters || {};
  try {
    const ut = await R.skrifa({ kalladAf: 'agnar', prufa: q.prufa === '1' });
    console.log('[radgjafinn]', ut && ut.sleppt ? 'sleppt: ' + ut.sleppt : 'skrifað ' + (ut && ut.skrifad_at));
  } catch (e) {
    console.error('[radgjafinn] villa', (e && e.message) || e);
  }
};
