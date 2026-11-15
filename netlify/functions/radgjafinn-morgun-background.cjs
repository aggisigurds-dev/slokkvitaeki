// radgjafinn-morgun-background.cjs — RÁÐGJAFINN, morgunskrifin (15.11.2026). Kjarninn og skýringin: _radgjafinn.cjs.
// Áætlun í netlify.toml (kl. 06:45 á hverjum degi, Ísland = UTC) svo yfirlitið sé tilbúið þegar Agnar mætir.
// Áætluð föll svara ekki HTTP — ↻ á borðinu fer um radgjafinn-background.cjs.

const R = require('./_radgjafinn.cjs');

exports.handler = async () => {
  try {
    const ut = await R.skrifa({ kalladAf: 'morgun' });
    console.log('[radgjafinn-morgun] skrifað', ut && ut.skrifad_at, '·', ut && ut.rad && ut.rad.length, 'ráð');
  } catch (e) {
    console.error('[radgjafinn-morgun] villa', (e && e.message) || e);
  }
};
