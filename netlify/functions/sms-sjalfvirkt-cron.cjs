// sms-sjalfvirkt-cron.cjs — dagleg sjálfvirk SMS-áminning um tilbúin tæki.
//
// Áætlað kl. 10:00 skv. netlify.toml [functions."sms-sjalfvirkt-cron"] (UTC = Ísland allt árið).
// Sendir AÐEINS ef kveikt er á sjálfvirkni í stillingum (stillingar.sms.sjalfvirkt.virkt, sjálfgefið
// slökkt) og Twilio er stillt á þjóni. Allar reglur og tvísendingarvarnir eru í _sms-sjalfvirkt.cjs.
// Aðeins keyrt á PRODUCTION (áætlanir keyra ekki á deploy-previews).
const K = require('./_sms-sjalfvirkt.cjs');

exports.handler = async () => {
  try {
    const u = await K.keyra({ commit: true });
    console.log('[sms-sjalfvirkt-cron]', JSON.stringify({
      virkt: u.stillingar.virkt, aaetlad: u.aaetlad.length, send: u.send, mistokst: u.mistokst, stodvad: u.stodvad,
    }));
    return { statusCode: 200, body: JSON.stringify({ ok: true, send: u.send.length, mistokst: u.mistokst.length, stodvad: u.stodvad }) };
  } catch (e) {
    console.error('[sms-sjalfvirkt-cron] villa', e);
    return { statusCode: 500, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
