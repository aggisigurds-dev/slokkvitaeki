// payday-sync-cron.js — dagleg sjálfvirk greiðslu-samstilling úr Payday.
//
// Áætlað kl. 10:00 að morgni skv. netlify.toml [functions."payday-sync-cron"]
// (cron er í UTC; Ísland = UTC allt árið, svo 10:00 UTC = 10:00 að staðartíma).
//
// Kallar einfaldlega á /api/payday-sync-paid (non-dry) — NÁKVÆMLEGA sama vinnan
// og 🔄 „Athuga greiðslur í Payday" takkinn á Kröfu yfirlit gerir: finnur greidda
// reikninga í Payday og setur solur.paid_at → greiddar kröfur færast sjálfkrafa í
// „Greiddar". Aðeins keyrt á PRODUCTION (áætlanir keyra ekki á deploy-previews).

exports.handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  try {
    const r = await fetch(base + '/api/payday-sync-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await r.json().catch(() => ({ error: 'Ógilt svar (HTTP ' + r.status + ')' }));
    console.log('[payday-sync-cron]', r.status, JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify({ ok: true, ranAt: new Date().toISOString(), result: data }) };
  } catch (e) {
    console.error('[payday-sync-cron] error', e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
