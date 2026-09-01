// trio-cron.js — daglega keyrslan á tríó-mælitækinu.
//
// Keyrt einu sinni á sólarhring skv. netlify.toml [functions."trio-cron"].
// Kallar á /api/trio?skra=1 sem ber saman ÞRJÁR óháðar heimildir um tækjafjölda
// hvers fyrirtækis — prófílinn, úttektarskýrsluna og reikninginn — og skráir
// hverja breytingu í `trio_saga` með alarmi þegar staðfest tríó rofnar.
//
// HVERS VEGNA ÁÆTLUN EN EKKI Á SPJALDINU: Agnar, 01.09.2026 — „ef ég er að
// hoppa á milli fyrirtækja þá getur þetta truflað og er óþarfi að checka tugi
// skipta á dag… láta frekar renna check á öðrum tíma." Fyrirtækjaspjaldið LES
// því aðeins síðustu staðfestingu (ein indexuð röð); þessi keyrsla og
// „Tríó-keyrsla"-takkinn í mælaborðinu eru einu staðirnir sem BÚA hana til.
//
// Mælt 01.09.2026: öll keyrslan tekur 2,4 s og er ein umferð yfir gögnin, svo
// hún kostar ekkert að ráði og rúmast vel innan tímamarka fallsins. Hún skrifar
// EKKERT þegar ekkert hefur breyst — `skrad: 0` er eðlileg útkoma og þýðir að
// tríóin standa óhögguð frá því í gær.
//
// Klukkan er sett á 06:00 UTC: eftir næturvinnslur, á undan vinnudeginum, svo
// talan sem spjaldið sýnir að morgni sé dagsfersk.
//
// Aðeins keyrt á PRODUCTION — áætlanir keyra ekki á deploy-previews.

exports.handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  try {
    const t0 = Date.now();
    const r = await fetch(base + '/api/trio?skra=1', {
      headers: { accept: 'application/json', 'x-eldklar-key': process.env.EDGE_SHARED_KEY || '' },
    });
    const d = await r.json().catch(() => null);

    if (!r.ok || !d || d.villa) {
      // Villa má ALDREI líta út eins og „ekkert misræmi". Skilum 500 svo hún
      // sjáist í loggi Netlify frekar en að þegja og skilja eftir gamla tölu.
      const skilabod = (d && d.villa) || ('HTTP ' + r.status);
      console.error('[trio-cron] tríó-keyrslan brást:', skilabod);
      return { statusCode: 500, body: JSON.stringify({ error: skilabod }) };
    }

    const hlutf = d.profill_vs_skyrsla
      ? Math.round(d.profill_vs_skyrsla_sammala / d.profill_vs_skyrsla * 100) : 0;
    console.log('[trio-cron] ' + d.profill_vs_skyrsla_sammala + '/' + d.profill_vs_skyrsla
      + ' staðfest (' + hlutf + '%), ' + d.vikja + ' víkja, '
      + d.skrad + ' breytingar skráðar, ' + (Date.now() - t0) + ' ms');

    if (Array.isArray(d.alarm) && d.alarm.length) {
      // Rofið tríó er það eina sem kallar á mann. Prentum hvert og eitt svo
      // loggið segi HVAÐ gerðist, ekki bara að eitthvað hafi gerst.
      console.warn('[trio-cron] ⚠ ' + d.alarm.length + ' tríó ROFNUÐU:');
      d.alarm.forEach(a => console.warn('   · ' + (a.nafn || ('fid ' + a.id)) + ' — ' + a.hvad));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        keyrt: new Date().toISOString(),
        stadfest: d.profill_vs_skyrsla_sammala,
        af: d.profill_vs_skyrsla,
        vikja: d.vikja,
        skrad: d.skrad,
        alarm: (d.alarm || []).length,
      }),
    };
  } catch (e) {
    console.error('[trio-cron] error', e);
    return { statusCode: 500, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
