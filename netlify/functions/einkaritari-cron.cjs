// einkaritari-cron.cjs — EINKARITARINN, morgunskrifin (16.11.2026).
//
// Áætlun í netlify.toml: kl. 06:45 á hverjum degi (UTC = Ísland).
// Áætluð föll hafa 30 sek. þak — þetta fall RÆSIR einkaritari-background (15 mín.) yfir HTTP,
// sama mynstur og radgjafinn-morgun.cjs. Tíma-tóki undirritaður með þjónustulyklinum.

const H = require('./_radgjafinn-hlid.cjs');
const S = require('./_einkaritari-stadreyndir.cjs');

exports.handler = async () => {
  const base = (process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  const byrjad = new Date().toISOString();
  try {
    const r = await fetch(base + '/.netlify/functions/einkaritari-background', {
      method: 'POST', headers: { [H.MORGUN_HAUS]: H.morgunToki() }, signal: AbortSignal.timeout(20000),
    });
    if (r.status !== 202) throw new Error('einkaritari-background svaraði ' + r.status);
    console.log('[einkaritari-cron] morgunskrifin ræst');
    return { statusCode: 200, body: 'ræst' };
  } catch (e) {
    const texti = 'Einkaritari-morgunskrifin fóru ekki af stað: ' + String((e && e.message) || e);
    console.error('[einkaritari-cron]', texti);
    await S.skra('error', byrjad, texti);
    return { statusCode: 500, body: texti };
  }
};
