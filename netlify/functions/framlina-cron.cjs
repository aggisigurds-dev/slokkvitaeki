// framlina-cron.cjs — flokkar nýjan póst fyrir Framlínuna á 30 mín fresti á vinnutíma (netlify.toml).
// Kallar beint á flokkaNytt() í framlina.cjs (sama vinnan og „flokka“ á síðunni); gerir ekkert þegar enginn póstur er nýr
// (tvær litlar Supabase-fyrirspurnir, ekkert AI-kall). Hreinsar líka flokkunarraðir eldri en 21 dags úr app_kv.
const F = require('./framlina.cjs');

exports.handler = async () => {
  try {
    const stada = await F.flokkaNytt(3);
    let hreinsad = null;
    try {
      const fyrir = new Date(Date.now() - 21 * 864e5).toISOString();
      const r = await fetch(process.env.SUPABASE_URL + '/rest/v1/app_kv?key=like.' + encodeURIComponent('framlina:') + '*&key=neq.' + encodeURIComponent('framlina:stada') + '&updated_at=lt.' + encodeURIComponent(fyrir), {
        method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, Prefer: 'return=minimal' } });
      hreinsad = r.status;
    } catch (_) {}
    console.log('[framlina-cron]', JSON.stringify(stada), 'hreinsun', hreinsad);
    return { statusCode: 200, body: JSON.stringify(stada) };
  } catch (e) {
    console.log('[framlina-cron] VILLA', String((e && e.message) || e));
    return { statusCode: 500, body: String((e && e.message) || e) };
  }
};
