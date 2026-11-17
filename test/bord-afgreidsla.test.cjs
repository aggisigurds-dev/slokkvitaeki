// Próf einingarinnar „Tilbúin verk" á Þjónustuborðinu (511, 16.11.2026). Keyrsla: node --test test/bord-afgreidsla.test.cjs
//
// AF HVERJU: einingin FRAMKVÆMIR (sendir póst, sendir kröfu) úr borðinu. Það sem má aldrei bila:
//   1. einn smellur framkvæmir aldrei — fyrri smellur vopnar, sá seinni sendir;
//   2. verk sem stenst ekki athugun þjónsins fær óvirkan takka og sendir ekkert, sama hve oft er ýtt;
//   3. breyttur texti fer með í sendinguna (ekki sá gamli);
//   4. netvilla er aldrei túlkuð sem „ekkert gerðist";
//   5. texti úr gögnunum er alltaf afmáður (escape) og tenglar aðeins http(s) eða slóð á þessum vef.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SKRA = path.join(__dirname, '..', 'js', 'patches', '511-bord-afgreidsla.js');
const KODI = fs.readFileSync(SKRA, 'utf8');

function verk(yfir) {
  return Object.assign({ id: 22, tegund: 'tolvupostur', titill: 'Svara fyrirspurn', takki: 'Senda svarið', hvad_gerist: 'Svarið fer úr pósthólfi félagsins.',
    af_hverju: [{ texti: 'Kúnninn skrifaði', heimild: 'Póstur · email_digest 1', slod: { url: 'https://mail.google.com/mail/u/#all/abc', texti: 'Pósturinn í Gmail' } }],
    virdi_kr: 12345, athuganir: [{ texti: 'Ekkert nýrra skeyti í þræðinum', ok: true }], ok: true, urelt: null,
    post: { account: 'posthus@example.is', to: ['kunni@example.is'], cc: [], subject: 'Re: Fyrirspurn', texti: 'Góðan dag.', vidhengi: [] },
    svar_vid: { fra: 'Kúnni', dags: '2026-01-02 10:00', efni: 'Fyrirspurn', texti: 'Getið þið…', slod: null } }, yfir || {});
}

// Hleður eininguna ferska í eigin vm-samhengi (eins og vafrinn: engin module, enginn window → hún festir sig á hnattræna
// hlutinn) með gervi-fetch. `svor` er fall (aðferð, body) → { status, json } eða kastar (netvilla).
function hlada(svor) {
  const kollud = [], teiknad = { n: 0 }, tost = [];
  const heimur = { setTimeout, clearTimeout, console };
  heimur.fetch = (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : null;
    kollud.push({ url, method: (opts && opts.method) || 'GET', body });
    let s;
    try { s = svor((opts && opts.method) || 'GET', body); } catch (e) { return Promise.reject(e); }
    return Promise.resolve({ status: s.status, json: () => (s.json === undefined ? Promise.reject(new Error('ekki JSON')) : Promise.resolve(s.json)) });
  };
  heimur.Bord368 = { render: () => { teiknad.n++; }, toast: (t, villa) => tost.push({ t, villa: !!villa }) };
  vm.runInNewContext(KODI, heimur, { filename: SKRA });
  return { BA: heimur.BordAfgreidsla, kollud, teiknad, tost, heimur };
}
// Gervi-smellur: element með closest() sem skilar sjálfu sér.
const smella = (BA, a, id, auka) => {
  const attr = Object.assign({ 'data-baf': a, 'data-id': id == null ? null : String(id) }, auka || {});
  const el = { getAttribute: (k) => (k in attr ? attr[k] : null) };
  el.closest = () => el;
  return BA.smellur({ target: el });
};
const bida = () => new Promise((r) => setImmediate(r));

test('listinn: sækir verkin, telur eftir tegund og afmáir texta úr gögnunum', async () => {
  const { BA } = hlada(() => ({ status: 200, json: { tilbuin: [verk({ titill: '<img src=x onerror=alert(1)> Svara' }), verk({ id: 23, tegund: 'simtal', titill: 'Hringja', takki: 'Hringt', simtal: { hverjum: 'Jón', simi: '555 0100', handrit: '1. Sæll' }, virdi_kr: null })] } }));
  assert.strictEqual(BA.samantekt(), 'Sæki verkin…');
  await BA.S.loading; await bida();
  assert.strictEqual(BA.samantekt(), '2 tilbúin · 1 póstur · 1 símtal');
  const h = BA.listi();
  assert.ok(!/<img src=x/.test(h), 'titill úr gögnunum má aldrei verða að HTML');
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt; Svara/);
  assert.match(h, /12\.345 kr\./, 'áætlað virði sýnt');
  assert.match(h, /data-baf="opna" data-id="22" aria-expanded="false"/);
  assert.ok(!/baf-d-22/.test(h), 'ekkert opið fyrr en smellt er');
});

test('opið verk: rök með heimild og tengli, efni, athuganir og takkinn', async () => {
  const { BA } = hlada(() => ({ status: 200, json: { tilbuin: [verk()] } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  const h = BA.listi();
  assert.match(h, /Þetta gerist þegar þú ýtir/);
  assert.match(h, /baf-hd/);          // haus með spurningunni yfir báðum dálkum
  assert.match(h, /baf-kt/);          // tölu-flís (áætlað virði / aldur)
  assert.match(h, /href="https:\/\/mail\.google\.com\/mail\/u\/#all\/abc" target="_blank" rel="noopener">Pósturinn í Gmail ↗/);
  assert.match(h, /data-baf-texti="22" data-ritun="1"[^>]*>Góðan dag\.<\/textarea>/, 'svarið er í reit sem má breyta og 368 frestar teikningu á (data-ritun)');
  assert.match(h, /data-baf="framkvaema" data-id="22"[^>]*>Senda svarið<\/button>/);
  assert.ok(!/data-baf="framkvaema" data-id="22" disabled/.test(h));
  smella(BA, 'opna', 22);
  assert.ok(!/baf-d-22/.test(BA.listi()), 'annar smellur á línuna lokar verkinu');
});

test('tenglar: aðeins http(s) eða slóð á þessum vef', async () => {
  const rok = [
    { texti: 'a', slod: { url: 'javascript:alert(1)', texti: 'X1' } },
    { texti: 'b', slod: { url: '//annar.vefur/x', texti: 'X2' } },
    { texti: 'c', slod: { url: 'data:text/html,x', texti: 'X3' } },
    { texti: 'd', slod: { url: '/?mal=5#bord', texti: 'Mál #5' } },
  ];
  const { BA } = hlada(() => ({ status: 200, json: { tilbuin: [verk({ af_hverju: rok })] } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  const h = BA.listi();
  assert.ok(!/X1|X2|X3/.test(h), 'hættulegar slóðir verða aldrei að tengli');
  assert.match(h, /href="\/\?mal=5#bord"[^>]*>Mál #5 ↗/);
});

test('framkvæmd: fyrri smellur vopnar, seinni sendir — með textanum eins og hann stendur í reitnum', async () => {
  const { BA, kollud, tost } = hlada((m, b) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk(), verk({ id: 30, titill: 'Annað' })] } } : { status: 200, json: { ok: true, verk: { id: b.id, stada: 'framkvaemt' } } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  BA.innslattur({ target: { getAttribute: (k) => (k === 'data-baf-texti' ? '22' : null), value: 'Góðan dag. Breytt.' } });
  smella(BA, 'framkvaema', 22);
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 0, 'einn smellur sendir ekkert');
  assert.match(BA.listi(), /Ýttu aftur til að staðfesta/);
  assert.match(BA.listi(), />Góðan dag\. Breytt\.<\/textarea>/, 'drögin lifa endurteikningu');
  await smella(BA, 'framkvaema', 22);
  const post = kollud.filter((k) => k.method === 'POST');
  assert.strictEqual(post.length, 1);
  assert.deepStrictEqual(post[0].body, { id: 22, adgerd: 'framkvaema', texti: 'Góðan dag. Breytt.' });
  assert.strictEqual(BA.S.tilbuin.length, 1, 'verkið hverfur af listanum þegar þjónninn staðfestir');
  assert.deepStrictEqual(tost, [{ t: 'Gert: Svara fyrirspurn', villa: false }]);
  BA.S.vopnT && clearTimeout(BA.S.vopnT);
});

test('vopnun: flokkaskipti eða annað verk afvopnar', async () => {
  const { BA, kollud } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk(), verk({ id: 30 })] } } : { status: 200, json: { ok: true } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22); smella(BA, 'framkvaema', 22);
  assert.strictEqual(BA.S.vopnad, 'framkvaema:22');
  smella(BA, 'opna', 30);
  assert.strictEqual(BA.S.vopnad, null);
  smella(BA, 'framkvaema', 22);   // vopnar aftur — sendir ekki
  smella(BA, 'fl', null, { 'data-f': 'verk' });
  assert.strictEqual(BA.S.vopnad, null);
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 0);
});

test('athugun stóðst ekki: takkinn er óvirkur og ekkert er sent', async () => {
  const { BA, kollud } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk({ ok: false, athuganir: [{ texti: 'Þráður óþekktur', ok: false }] })] } } : { status: 200, json: { ok: true } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  const h = BA.listi();
  assert.match(h, /data-baf="framkvaema" data-id="22" disabled/);
  assert.match(h, /Athugun stóðst ekki — ekkert verður gert/);
  smella(BA, 'framkvaema', 22); smella(BA, 'framkvaema', 22); smella(BA, 'framkvaema', 22);
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 0);
  assert.strictEqual(BA.S.vopnad, null);
});

test('þjónninn hafnar: verkið stendur með skilaboðum og nýjum athugunum; úrelt verk er tekið úr röðinni', async () => {
  let svar = { status: 409, json: { error: 'Athugun stóðst ekki — ekkert var sent.', athuganir: [{ texti: 'Nýtt skeyti kom í þráðinn', ok: false }] } };
  const { BA, tost } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk(), verk({ id: 30, tegund: 'krafa', titill: 'Senda kröfu', takki: 'Senda kröfuna', krafa: { r_numer: 'R-1' } })] } } : svar));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22); smella(BA, 'framkvaema', 22); await smella(BA, 'framkvaema', 22);
  assert.strictEqual(BA.S.tilbuin.length, 2, 'verkið er enn í röðinni');
  assert.match(BA.listi(), /Athugun stóðst ekki — ekkert var sent\./);
  assert.match(BA.listi(), /data-baf="framkvaema" data-id="22" disabled/, 'takkinn læsist á nýju athuguninni');
  svar = { status: 409, json: { error: 'Salan er þegar greidd', urelt: true } };
  smella(BA, 'opna', 30); smella(BA, 'framkvaema', 30); await smella(BA, 'framkvaema', 30);
  assert.deepStrictEqual(Array.from(BA.S.tilbuin, (v) => v.id), [22]);
  assert.deepStrictEqual(tost, [{ t: 'Salan er þegar greidd — tekið úr röðinni.', villa: true }]);
});

test('netvilla í framkvæmd: aldrei „ekkert gerðist" — staðan er sótt aftur', async () => {
  let get = 0;
  const { BA, kollud } = hlada((m) => { if (m === 'GET') { get++; return { status: 200, json: { tilbuin: [verk()] } }; } throw new Error('Failed to fetch'); });
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22); smella(BA, 'framkvaema', 22); await smella(BA, 'framkvaema', 22);
  assert.match(BA.listi(), /óvíst hvort verkið fór í gegn/);
  await BA.S.loading; await bida();
  assert.strictEqual(get, 2, 'staðan er lesin aftur af þjóninum');
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 1, 'ekki reynt aftur sjálfkrafa');
});

test('ekki þess virði: tveir smellir, athugasemdin fylgir sem ástæða', async () => {
  const { BA, kollud } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk()] } } : { status: 200, json: { ok: true } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  BA.innslattur({ target: { getAttribute: (k) => (k === 'data-baf-ath' ? '22' : null), value: ' Búið að semja í síma ' } });
  smella(BA, 'sleppa', 22);
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 0);
  assert.match(BA.listi(), /Ýttu aftur — kemur ekki aftur/);
  await smella(BA, 'sleppa', 22);
  assert.deepStrictEqual(kollud.filter((k) => k.method === 'POST')[0].body, { id: 22, adgerd: 'sleppa', varanlegt: true, astaeda: 'Búið að semja í síma' });
  assert.strictEqual(BA.S.tilbuin.length, 0);
  assert.match(BA.listi(), /Allt afgreitt/);
});

test('athugasemd: vistast á verkið, bilun skilur textann eftir í reitnum', async () => {
  let svar = { status: 500, json: { error: 'bilun' } };
  const { BA } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk()] } } : svar));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  BA.innslattur({ target: { getAttribute: (k) => (k === 'data-baf-ath' ? '22' : null), value: 'Verð 120.000' } });
  await smella(BA, 'ath-vista', 22);
  assert.match(BA.listi(), /Vistaðist ekki: bilun — textinn er enn í reitnum/);
  assert.match(BA.listi(), />Verð 120\.000<\/textarea>/);
  svar = { status: 200, json: { ok: true, athugasemd: 'Verð 120.000', athugasemd_af: 'Agnar', athugasemd_at: '2026-11-16T19:00:00Z' } };
  await smella(BA, 'ath-vista', 22);
  assert.strictEqual(BA.S.tilbuin[0].athugasemd, 'Verð 120.000');
  assert.match(BA.listi(), /Vistað \d\d\.11 kl\. \d\d:00 · Agnar/);
});

test('breyttur póstur vistast þegar farið er úr reitnum og athuganir þjónsins koma til baka', async () => {
  const { BA, kollud } = hlada((m, b) => (m === 'GET' ? { status: 200, json: { tilbuin: [verk()] } } : { status: 200, json: { ok: true, verk: { athuganir: [{ texti: 'Eyða ófyllt í textanum: [___]', ok: false }], ok: false } } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  const reitur = { getAttribute: (k) => (k === 'data-baf-texti' ? '22' : null), value: 'Góðan dag. [___]' };
  BA.innslattur({ target: reitur });
  await BA.ur_reit({ target: reitur });
  assert.deepStrictEqual(kollud.filter((k) => k.method === 'POST')[0].body, { id: 22, adgerd: 'vista', texti: 'Góðan dag. [___]' });
  assert.strictEqual(BA.S.tilbuin[0].ok, false);
  assert.match(BA.listi(), /data-baf="framkvaema" data-id="22" disabled/);
  // Óbreyttur texti sendir ekkert.
  const fyrir = kollud.length;
  BA.innslattur({ target: reitur });
  assert.strictEqual(await BA.ur_reit({ target: reitur }), null);
  assert.strictEqual(kollud.length, fyrir);
});

test('óinnskráður eða ekki stjórnandi: skýr skilaboð, engin verk og engin endalaus endursókn', async () => {
  let get = 0;
  const a = hlada(() => { get++; return { status: 401, json: { need_login: true } }; });
  a.BA.samantekt(); await a.BA.S.loading;
  assert.strictEqual(a.BA.samantekt(), 'Innskráning vantar');
  assert.match(a.BA.listi(), /href="\/innskraning\.html\?next=%2F%23bord"/);
  a.BA.samantekt(); a.BA.samantekt();
  assert.strictEqual(get, 1, 'villa er ekki sótt aftur við hverja teikningu');
  const b = hlada(() => ({ status: 500, json: undefined }));
  b.BA.samantekt(); await b.BA.S.loading;
  assert.strictEqual(b.BA.samantekt(), 'Náði ekki í verkin');
  assert.match(b.BA.listi(), /Náði ekki í verkin: villa 500/);
});

test('opna(id) úr Einkaritaranum: false þegar einingin er ekki á borðinu, annars opnast verkið', async () => {
  const { BA, heimur } = hlada(() => ({ status: 200, json: { tilbuin: [verk()] } }));
  assert.strictEqual(BA.opna(22), false, 'engin opnaEiningu á borðinu → varaleiðin (tengillinn) ræður');
  heimur.Bord368.opnaEiningu = (k) => k === 'tilbuin';
  heimur.Bord368.root = () => null;
  assert.strictEqual(BA.opna(22), true);
  await BA.S.loading; await bida();
  assert.strictEqual(BA.S.opid, 22);
});

test('þak: mest 8 línur í einu, „sýna öll" opnar restina og opið verk neðan þaks sést alltaf', async () => {
  const morg = Array.from({ length: 11 }, (_, i) => verk({ id: 100 + i, titill: 'Verk nr. ' + (i + 1) }));
  const { BA } = hlada(() => ({ status: 200, json: { tilbuin: morg } }));
  BA.samantekt(); await BA.S.loading;
  const fj = (h) => (h.match(/data-baf="opna"/g) || []).length;
  assert.strictEqual(fj(BA.listi()), 8);
  assert.match(BA.listi(), /\+ 3 til viðbótar — sýna öll 11/);
  BA.S.opid = 110;   // ellefta verkið, opnað úr Einkaritaranum
  assert.strictEqual(fj(BA.listi()), 9, 'opna verkið bætist við neðan þaks');
  assert.match(BA.listi(), /baf-d-110/);
  assert.match(BA.listi(), /\+ 2 til viðbótar — sýna öll 11/);
  smella(BA, 'allt', null);
  assert.strictEqual(fj(BA.listi()), 11);
  assert.match(BA.listi(), /Sýna færri/);
});

// ── tegund 'sameina' (Verkefnavaktin, 16.11.2026) ──────────────────────────────────────────────────────
function sam(yfir) {
  return Object.assign({ id: 70, tegund: 'sameina', titill: 'Breyting: prufusíða', takki: 'Sameina og birta',
    hvad_gerist: 'Grein vakt/abc verður sameinuð og birt.', af_hverju: [{ texti: 'Vaktin vann verkið', heimild: 'Verkefnavaktin' }],
    virdi_kr: null, athuganir: [{ texti: 'Verkið bíður yfirferðar', ok: true }], ok: true, urelt: null,
    sameina: { verk_id: 'abc-123', grein: 'vakt/abc123', vefur: 'slokkvitaeki', lysing: 'Bætti við línu á prufusíðu',
      sannprof: 'node --test, fail 0', skjaskot_url: 'https://x.supabase.co/storage/v1/object/public/verkefnalisti/result/1.png',
      verk_slod: { url: 'https://brunaholf.netlify.app/verkefnalisti.html', texti: 'Verkið á Verkefnalistanum' } } }, yfir || {});
}

test('sameina: birtist í listanum og opið verk sýnir hvað var gert, grein og skjáskot (https)', async () => {
  const { BA } = hlada(() => ({ status: 200, json: { tilbuin: [sam()] } }));
  BA.samantekt(); await BA.S.loading; await bida();
  assert.match(BA.samantekt(), /1 tilbúin · 1 breyting/);
  smella(BA, 'opna', 70);
  const h = BA.listi();
  assert.match(h, /Hvað var gert/);
  assert.match(h, /Bætti við línu á prufusíðu/);
  assert.match(h, /Hvernig það var sannreynt/);
  assert.match(h, /<code class="baf-grein">vakt\/abc123<\/code>/);
  assert.match(h, /<img class="baf-skot" src="https:\/\/x\.supabase\.co[^"]*\/result\/1\.png"/, 'skjáskot birtist sem mynd');
  assert.match(h, /data-baf="framkvaema" data-id="70"[^>]*>Sameina og birta<\/button>/);
});

test('sameina: skjáskot aðeins https — data:/http verða aldrei að mynd', async () => {
  for (const u of ['data:image/png;base64,AAAA', 'http://x/y.png', '//annar/x.png', 'javascript:alert(1)']) {
    const { BA } = hlada(() => ({ status: 200, json: { tilbuin: [sam({ sameina: Object.assign(sam().sameina, { skjaskot_url: u }) })] } }));
    BA.samantekt(); await BA.S.loading; smella(BA, 'opna', 70);
    assert.ok(!/baf-skot/.test(BA.listi()), 'engin mynd fyrir ' + u);
  }
});

test('sameina: höfnunartakkinn segir aftur-í-vinnu og sendir sleppa með athugasemd', async () => {
  const { BA, kollud } = hlada((m) => (m === 'GET' ? { status: 200, json: { tilbuin: [sam()] } } : { status: 200, json: { ok: true } }));
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 70);
  const h = BA.listi();
  assert.match(h, /data-baf="sleppa" data-id="70"[^>]*>Hafna ›<\/button>/, 'höfnun heitir „Hafna", ekki „Ekki þess virði"');
  assert.ok(!/Ekki þess virði/.test(h));
  BA.innslattur({ target: { getAttribute: (k) => (k === 'data-baf-ath' ? '70' : null), value: 'Nota annað orð' } });
  smella(BA, 'sleppa', 70);                       // fyrri smellur vopnar
  assert.match(BA.listi(), /Ýttu aftur — fer aftur í vinnu/);
  await smella(BA, 'sleppa', 70);                 // seinni sendir
  assert.deepStrictEqual(kollud.filter((k) => k.method === 'POST')[0].body, { id: 70, adgerd: 'sleppa', varanlegt: true, astaeda: 'Nota annað orð' });
});

// Kóðarýni 17.11.2026: óstaðfest ágiskun er rauð og ber tvo takka — staðfesta, eða taka netfangið út og senda án þess.
test('ágiskun: rauð athugun með tveimur tökkum; staðfesting sendir adgerd agiskun og uppfærir verkið', async () => {
  const ag = { texti: '⚠ ÁGISKUN, óstaðfest: bokhald@example.is', ok: false, agiskun: 'bokhald@example.is' };
  const { BA, kollud, heimur } = hlada((m, b) => b && b.adgerd === 'agiskun'
    ? { status: 200, json: { ok: true, verk: verk({ athuganir: [{ texti: 'Ágiskað netfang staðfest af Agnar: bokhald@example.is', ok: true }], ok: true }) } }
    : { status: 200, json: { tilbuin: [verk({ athuganir: [ag], ok: false })] } });
  BA.samantekt(); await BA.S.loading;
  smella(BA, 'opna', 22);
  const h = BA.listi();
  assert.match(h, /data-baf="agiskun" data-val="stadfesta" data-id="22" data-netfang="bokhald@example\.is"/);
  assert.match(h, /data-baf="agiskun" data-val="fjarlaegja" data-id="22" data-netfang="bokhald@example\.is"/);
  assert.match(h, /baf-nei[^]*ÁGISKUN/, 'ágiskunin er rauð (✗), ekki grænt ✓');
  heimur.window = { confirm: () => true };
  await smella(BA, 'agiskun', 22, { 'data-netfang': 'bokhald@example.is', 'data-val': 'stadfesta' });
  await bida();
  const k = kollud.find((x) => x.body && x.body.adgerd === 'agiskun');
  assert.deepStrictEqual(k && k.body, { id: 22, adgerd: 'agiskun', netfang: 'bokhald@example.is', val: 'stadfesta' });
  assert.match(BA.listi(), /staðfest af Agnar/);
  heimur.window = { confirm: () => false };
  const fyrir = kollud.length;
  await smella(BA, 'agiskun', 22, { 'data-netfang': 'bokhald@example.is', 'data-val': 'fjarlaegja' });
  assert.strictEqual(kollud.length, fyrir, 'hætt við í staðfestingarglugga → ekkert kall');
});
