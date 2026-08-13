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
      // x-eldklar-key: innri keðja virkar áfram þegar EDGE_SHARED_KEY-gátt er virkjuð.
      headers: { 'Content-Type': 'application/json', 'x-eldklar-key': process.env.EDGE_SHARED_KEY || '' },
      body: '{}',
    });
    const data = await r.json().catch(() => ({ error: 'Ógilt svar (HTTP ' + r.status + ')' }));
    console.log('[payday-sync-cron]', r.status, JSON.stringify(data));
    // 2026-07-10: uppfæra líka Payday-spegilinn (payday_invoices_slokk) svo
    // Payday-númerin í „Fyrri viðskipti" séu alltaf fersk (síðustu ~180 dagar;
    // eldri raðir standa — allt sagan sótt einu sinni með ?all=1).
    let mirror = null;
    try {
      const m = await fetch(base + '/api/payday-pull-slokk', { headers: { 'x-eldklar-key': process.env.EDGE_SHARED_KEY || '' } });
      mirror = await m.json().catch(() => ({ error: 'Ógilt svar (HTTP ' + m.status + ')' }));
      console.log('[payday-sync-cron] mirror', m.status, JSON.stringify(mirror));
    } catch (e2) { console.error('[payday-sync-cron] mirror error', e2); }

    // ── Rukkunar-eftirlit (2026-08-13, sjá docs/RUKKUNARKEDJAN.md) ───────────
    // rukkun_eftirlit() í gagnagrunninum skilar 8 gátlistum sem eiga ALLIR að
    // vera tómir/0: númeraárekstrar (skjöl + sölur), rukkað-ekki-final, void
    // sem fékk greiðslu, byte-eins tvítök, rukkað án kt, rukkað án netfangs,
    // félög án afhendingarleiðar. Frávik → póstur á Agnar. Villa í eftirlitinu
    // sjálfu fellir ALDREI greiðslusamstillinguna (try/catch, best-effort).
    let eftirlit = null;
    try {
      const er = await fetch(process.env.SUPABASE_URL + '/rest/v1/rpc/rukkun_eftirlit', {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      eftirlit = await er.json().catch(() => null);
      if (eftirlit) {
        const issues = [];
        const arr = (k) => Array.isArray(eftirlit[k]) ? eftirlit[k] : [];
        if (arr('doc_nr_a_fleiri_felog').length) issues.push('🔴 Reikningsnúmer á FLEIRI en eitt félag (rangt-PDF hætta): ' + arr('doc_nr_a_fleiri_felog').map(x => x.invoice_number + ' (' + x.felog + ' félög)').join(', '));
        if (arr('tvinotud_num').length) issues.push('🔴 Tvínotuð sölunúmer: ' + arr('tvinotud_num').map(x => x.num).join(', '));
        if (arr('rukkad_ekki_final').length) issues.push('🟡 Rukkað en ekki final: ' + arr('rukkad_ekki_final').map(x => x.num + ' (' + x.status + ')').join(', '));
        if (arr('void_greitt').length) issues.push('🔴 Void-sala fékk greiðslu: ' + arr('void_greitt').map(x => x.num).join(', '));
        if (arr('byte_eins_tvitok').length) issues.push('🟡 Byte-eins tvítök enn virk: ' + arr('byte_eins_tvitok').map(x => x.num_a + '/' + x.num_b + ' ' + x.customer_nafn).join(', '));
        if (Number(eftirlit.rukkad_an_kt) > 0) issues.push('🟡 Rukkað án customer_base_id: ' + eftirlit.rukkad_an_kt + ' sölur');
        if (arr('rukkad_an_netfangs').length) issues.push('🟡 Rukkað á félag án netfangs: ' + arr('rukkad_an_netfangs').map(x => x.num).join(', '));
        if (Number(eftirlit.felog_an_afhendingar) > 0) issues.push('⚪ Félög í þjónustu án payday_delivery: ' + eftirlit.felog_an_afhendingar);
        if (issues.length) {
          console.warn('[payday-sync-cron] eftirlit frávik:', issues.length);
          try {
            await fetch(base + '/api/email-send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: ['aggisigurds@gmail.com'],
                subject: '⚠ Rukkunar-eftirlit: ' + issues.length + ' frávik (' + new Date().toISOString().slice(0, 10) + ')',
                html: '<h3>Rukkunar-eftirlit Slökkvitækja</h3><ul>' + issues.map(i => '<li>' + i + '</li>').join('') + '</ul>'
                  + '<p style="color:#64748b;font-size:12px">Full sundurliðun: SELECT jsonb_pretty(rukkun_eftirlit()); — sjá docs/RUKKUNARKEDJAN.md í slokkvitaeki-repo.</p>',
              }),
            });
          } catch (e4) { console.error('[payday-sync-cron] eftirlit-póstur brást', e4); }
        }
      }
    } catch (e3) { console.error('[payday-sync-cron] eftirlit error', e3); }

    return { statusCode: 200, body: JSON.stringify({ ok: true, ranAt: new Date().toISOString(), result: data, mirror, eftirlit }) };
  } catch (e) {
    console.error('[payday-sync-cron] error', e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
