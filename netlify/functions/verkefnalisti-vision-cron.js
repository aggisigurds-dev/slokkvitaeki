// verkefnalisti-vision-cron.js — sjálfvirk myndlýsing á Verkefnalistanum.
//
// Keyrt á 15 mín fresti skv. netlify.toml [functions."verkefnalisti-vision-cron"].
// Kallar á /api/verkefnalisti-vision í sópunar-ham: finnur OPIN verk sem eiga
// límda skjámynd en enga lýsingu og skrifar hana í claude_notes.
//
// Hitt fallið er BAKGRUNNSFALL og svarar 202 samstundis — þetta kall bíður því
// ekki eftir vinnunni og útkoman sést í loggi verkefnalisti-vision-background.
// 10 verk á ~25 s hvert = ~4 mín, vel innan bæði 15-mín þaks fallsins og
// 15-mín bilsins milli keyrslna, svo tvær sópanir skarast ekki.
//
// Þetta er ástæðan fyrir því að ENGA breytingu þarf á brunaholf-framendanum —
// mynd sem límd er inn fær lýsingu af sjálfu sér innan stundarfjórðungs. Vilji
// maður hana samstundis við upload kallar framendinn beint á
// POST /api/verkefnalisti-vision með { id }.
//
// Aðeins keyrt á PRODUCTION (áætlanir keyra ekki á deploy-previews).

exports.handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  try {
    const r = await fetch(base + '/api/verkefnalisti-vision', {
      method: 'POST',
      // x-eldklar-key: innri keðja virkar áfram þegar EDGE_SHARED_KEY-gátt er virkjuð.
      headers: { 'Content-Type': 'application/json', 'x-eldklar-key': process.env.EDGE_SHARED_KEY || '' },
      body: JSON.stringify({ limit: 10 }),
    });
    // 202 = bakgrunnsvinnan er ræst. Ekkert nýtilegt er í svarbúknum.
    console.log('[verkefnalisti-vision-cron] ræst, HTTP', r.status);
    return { statusCode: 200, body: JSON.stringify({ ok: true, ranAt: new Date().toISOString(), starta: r.status }) };
  } catch (e) {
    console.error('[verkefnalisti-vision-cron] error', e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
