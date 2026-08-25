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
      const m = await fetch(base + '/api/payday-pull-slokk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-eldklar-key': process.env.EDGE_SHARED_KEY || '' },
        body: '{}',
      });
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
        // 2026-08-14 (Agnar — „talan á aldrei að vera lægri en veruleikinn"):
        // gátlistarnir bera nú { alls, daemi } — pósturinn segir HEILDARTÖLUNA
        // og merkir „(sýni N)" þegar dæmin ná ekki yfir allt. Gamla hreina
        // fylkja-formið er stutt áfram til öryggis.
        const lst = (k) => {
          const v = eftirlit[k];
          if (v && Array.isArray(v.daemi)) return { alls: Number(v.alls) || v.daemi.length, daemi: v.daemi };
          if (Array.isArray(v)) return { alls: v.length, daemi: v };
          return { alls: 0, daemi: [] };
        };
        const tala = (l) => l.alls + (l.alls > l.daemi.length ? ' (sýni ' + l.daemi.length + ')' : '');
        const push = (l, merki, heiti, fmt) => { if (l.alls > 0) issues.push(merki + ' ' + heiti + ': ' + tala(l) + ' — ' + l.daemi.map(fmt).join(', ')); };
        push(lst('doc_nr_a_fleiri_felog'), '🔴', 'Reikningsnúmer á FLEIRI en eitt félag (rangt-PDF hætta)', x => x.invoice_number + ' (' + x.felog + ' félög)');
        push(lst('tvinotud_num'), '🔴', 'Tvínotuð sölunúmer', x => x.num);
        push(lst('rukkad_ekki_final'), '🟡', 'Rukkað en ekki final', x => x.num + ' (' + x.status + ')');
        push(lst('void_greitt'), '🔴', 'Void-sala fékk greiðslu', x => x.num);
        push(lst('byte_eins_tvitok'), '🟡', 'Byte-eins tvítök enn virk', x => x.num_a + '/' + x.num_b + ' ' + x.customer_nafn);
        if (Number(eftirlit.rukkad_an_kt) > 0) issues.push('🟡 Rukkað án customer_base_id: ' + eftirlit.rukkad_an_kt + ' sölur');
        push(lst('rukkad_an_netfangs'), '🟡', 'Rukkað á félag án netfangs', x => x.num);
        if (Number(eftirlit.felog_an_afhendingar) > 0) issues.push('⚪ Félög í þjónustu án payday_delivery: ' + eftirlit.felog_an_afhendingar);
        // Verkstæðis-vöktunin (14.08): óútkljáð „greitt síðar" + sótt án final sölu.
        push(lst('greitt_sidar_gamalt'), '🟡', '„Greitt síðar" eldra en 14 daga (óútkljáð uppgjör)', x => x.num + ' ' + (x.customer_nafn || '') + ' (' + x.dagar + 'd)');
        push(lst('sott_ekki_final'), '🔴', 'Sótt verk með sölu sem er EKKI final', x => x.verk + ' → ' + x.sala + ' (' + x.status + ')');
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
