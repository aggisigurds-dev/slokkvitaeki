// radgjafinn-morgun.cjs — RÁÐGJAFINN, morgunskrifin (15.11.2026). Kjarninn: _radgjafinn.cjs · hliðið: _radgjafinn-hlid.cjs.
//
// Áætlun í netlify.toml: kl. 06:45 á hverjum degi (Ísland = UTC), svo yfirlitið sé tilbúið þegar Agnar mætir.
// Áætluð föll hafa 30 sek. þak (docs.netlify.com → Scheduled functions) en Claude-kallið tekur 1–2 mín. Þetta fall
// RÆSIR því aðeins radgjafinn-background.cjs (15 mín.) yfir HTTP — sama mynstur og trio-cron. Með fylgir tíma-tóki
// undirritaður með þjónustulyklinum, svo morgunskrifin komist fram hjá innskráningarhliðinu en enginn annar.
// Áætlanir keyra aðeins á birtri útgáfu, ekki á deploy-previews.

const H = require('./_radgjafinn-hlid.cjs');
const R = require('./_radgjafinn.cjs');

exports.handler = async () => {
  const base = (process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  const byrjad = new Date().toISOString();
  try {
    const r = await fetch(base + '/.netlify/functions/radgjafinn-background', {
      method: 'POST', headers: { [H.MORGUN_HAUS]: H.morgunToki() }, signal: AbortSignal.timeout(20000),
    });
    if (r.status !== 202) throw new Error('radgjafinn-background svaraði ' + r.status);
    console.log('[radgjafinn-morgun] morgunskrifin ræst');
    return { statusCode: 200, body: 'ræst' };
  } catch (e) {
    // Villa má aldrei líta út eins og „ekkert að": skráð í automation_runs svo Vinnusamantekt og Kerfisheilsa sjái hana.
    const texti = 'Morgunskrifin fóru ekki af stað: ' + String((e && e.message) || e);
    console.error('[radgjafinn-morgun]', texti);
    await R.skraKeyrslu('error', byrjad, texti);
    return { statusCode: 500, body: texti };
  }
};
