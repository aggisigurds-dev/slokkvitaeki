// markmid-cron.cjs — morgunmæling markmiða (16.11.2026). Mælir öll mælanleg markmið einu sinni á dag svo talan á
// Markmiðum sé fersk þegar Agnar mætir, og sagan (markmid_maelingar) fái einn punkt á dag. Áætlun: netlify.toml.
// Eitt SQL-kall per markmið (≈15), innan 30 sek. þaks áætlaðra falla.
const M = require('./markmid.cjs');

exports.handler = async () => {
  try {
    const maelt = await M.maelaAllt();
    console.log('[markmid-cron] mælt', maelt.length, JSON.stringify(maelt));
    return { statusCode: 200, body: JSON.stringify({ ok: true, maelt: maelt.length }) };
  } catch (e) {
    console.error('[markmid-cron]', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e && e.message || e) }) };
  }
};
