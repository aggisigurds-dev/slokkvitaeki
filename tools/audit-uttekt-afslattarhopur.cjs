#!/usr/bin/env node
/*
 * audit-uttekt-afslattarhopur.cjs — úttekt fer aldrei út án hópafsláttar (kóðahlutinn, án nets).
 *
 * 14.10.2026 (úttekt með agentum, netvörður: CUTS-A-WIRE → skilyrði A/B/C):
 * Companies.list gat verið MJÓR — 114 fyllir 12 leitarsúlur í tóman lista, og hand-hamur 431
 * hleypti select('*') aldrei í gegn eftir það. Þá var `discount_tier_id` undefined á röðinni,
 * 129 `loadTierFor` geymdi tier=null í skyndiminni, og úttektartaflan (sem 165 les í reikninginn)
 * fór út á fullu verði. Center Hótel 192 mældist 160.878 kr í stað 145.931 kr.
 * Enginn vörður sá það: audit-textatap undanskilur 114 á skráarstigi („vörður á skrá í stað atriðis",
 * MAELINGAR.md), og audit-pos-kt-discount ver aðeins POS.
 *
 * Þessi vörður keyrir RAUNVERULEGA kóðann úr skránum í Node vm — ekki afrit:
 *   A. 129 loadTierFor: mjó röð skilar hópnum · villa fer ekki í skyndiminni og kallar logProblem ·
 *      félag án hóps skilar null · viðvörunarlínan hefur færri en 6 reiti (165 scrapeCostRows sleppir henni).
 *   B. 431 vefjaLoad: hand-hamur + mjór listi → nákvæmlega ein full sókn · breiður listi → engin ·
 *      [0] breið en restin mjó → ein · breiður + SYND-röð + ein ný mjó → engin. Sama fyrir af-ham.
 *   D. rest-samnyting (í vm): select('*').eq('id') á mjórri röð fer á netið, á breiðri úr minni.
 *   E. 00-legacy Breyta-glugginn sendir aðeins breytta reiti; 157 ⚑ og sameining lesa raðir ferskar; 431 breikkar.
 *   C. 14 openEdit: sækir ferska breiða röð, sendir ekki óþekkta, óbreytta reiti í vistun, og Vista-takkinn
 *      er virkur við hverja opnun (vel heppnuð vistun skildi hann eftir óvirkan).
 * Gagnahlutinn (raunverulegir reikningar) er audit-uttekt-afslattarhopur-gogn.cjs — sér skrá svo
 * þessi keyri líka í CI (`audit-all --static` sleppir skrám sem sækja á net).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rot = path.join(__dirname, '..');
const lesa = f => fs.readFileSync(path.join(rot, f), 'utf8');
const rautt = [];
const fail = m => rautt.push(m);

// ── A. 129 loadTierFor ──────────────────────────────────────────────────────
const src129 = lesa('js/patches/129-company-total-cost.js');
const m129 = src129.match(/\n  let _tierCache = [\s\S]*?\n  async function loadTierFor\(coId\) \{[\s\S]*?\n  \}\n/);

const GOGN = {
  fyrirtaeki: { 192: { discount_tier_id: 2 }, 837: { discount_tier_id: null } },
  discount_tiers: { 2: { id: 2, tier_name: 'Center Hotels', virkt: true } }
};
function gerviSb(stada) {
  return {
    from(t) {
      const q = { t, id: null };
      const o = {
        select() { return o; },
        eq(c, v) { q.id = v; return o; },
        async maybeSingle() {
          stada.koll.push(t);
          if (stada.bilun === t) return { data: null, error: { message: 'gervibilun' } };
          const r = (GOGN[t] || {})[q.id];
          return { data: r ? Object.assign({}, r) : null, error: null };
        }
      };
      return o;
    }
  };
}
async function profa129(rodir, coId, bilun) {
  const stada = { koll: [], bilun: bilun || null };
  const logg = [];
  const ctx = vm.createContext({ console, Promise });
  ctx.window = ctx;
  ctx.Companies = { list: rodir };
  ctx.DB = { sb: gerviSb(stada) };
  ctx.logProblem = (k, d) => logg.push(k + ': ' + d);
  vm.runInContext(m129[0] + '\nthis.loadTierFor = loadTierFor; this.skyndi = () => _tierCache; this.villa = () => (typeof _tierVilla === \'undefined\' ? undefined : _tierVilla);', ctx);
  const t1 = await ctx.loadTierFor(coId);
  const skyndi1 = ctx.skyndi(), villa1 = ctx.villa(), koll1 = stada.koll.length;
  stada.bilun = null;
  const t2 = await ctx.loadTierFor(coId);
  return { t1, t2, skyndi1, villa1, villa2: ctx.villa(), koll1, koll2: stada.koll.length - koll1, logg };
}

(async () => {
  if (!m129) {
    fail('129: fann ekki `let _tierCache … async function loadTierFor(coId)` — vörðurinn getur ekki keyrt raunverulega fallið.');
  } else {
    const mjo192 = [{ id: 192, nafn: 'Center Hótel', kennitala: '', afslattur_pct: 0 }];
    const breid192 = [Object.assign({ discount_tier_id: 2, status: 'virkur' }, mjo192[0])];
    const mjo837 = [{ id: 837, nafn: 'Félag án hóps', kennitala: '', afslattur_pct: 0 }];

    let r = await profa129(mjo192, 192);
    if (!r.t1 || r.t1.id !== 2) fail('129: MJÓ röð (discount_tier_id vantar) skilar ekki hópnum — úttekt færi út án hópafsláttar.');
    if (r.koll2 !== 0) fail('129: annað kall á sama félag sækir aftur (' + r.koll2 + ' köll) — skyndiminnið virkar ekki.');

    r = await profa129(breid192, 192);
    if (!r.t1 || r.t1.id !== 2) fail('129: BREIÐ röð skilar ekki hópnum.');
    if (r.koll1 !== 1) fail('129: breið röð á aðeins að sækja discount_tiers (1 kall), sótti ' + r.koll1 + '.');

    r = await profa129(mjo837, 837);
    if (r.t1 !== null) fail('129: félag án hóps fékk hóp.');
    if (r.koll2 !== 0) fail('129: „enginn hópur" fer ekki í skyndiminni — sækir aftur við hverja teikningu.');

    r = await profa129(mjo192, 192, 'fyrirtaeki');
    if (r.t1 !== null) fail('129: netbilun á fyrirtaeki-sókn skilaði samt hópi?');
    if (r.skyndi1 && r.skyndi1.coId === 192) fail('129: netbilun fór Í SKYNDIMINNIÐ — úttekt yrði án afsláttar út lotuna.');
    if (!r.logg.some(l => /^uttekt_tier_saekja_brast/.test(l))) fail('129: netbilun á fyrirtaeki-sókn kallar ekki logProblem(uttekt_tier_saekja_brast).');
    if (r.villa1 !== 192) fail('129: _tierVilla ekki sett við netbilun — viðvörunarlínan birtist ekki.');
    if (!r.t2 || r.t2.id !== 2) fail('129: eftir netbilun skilar næsta kall ekki hópnum.');
    if (r.villa2 !== null) fail('129: _tierVilla situr eftir þótt næsta sókn hafi tekist.');

    r = await profa129(breid192, 192, 'discount_tiers');
    if (r.skyndi1 && r.skyndi1.coId === 192) fail('129: bilun á discount_tiers-sókn fór í skyndiminnið.');
    if (!r.logg.some(l => /^uttekt_tier_saekja_brast/.test(l))) fail('129: bilun á discount_tiers-sókn kallar ekki logProblem.');
  }

  // Viðvörunarlínan: einn reitur (colspan), svo 165 scrapeCostRows (`tds.length < 6`) taki hana ekki í reikninginn.
  const linuM = src129.match(/if \(_tierVilla === coId\) rows\.push\(([\s\S]*?)\);\n/);
  if (!linuM) fail('129: viðvörunarlínan „Afsláttarhópur náðist ekki" er horfin úr töflunni.');
  else {
    const tdFjoldi = (linuM[1].match(/<td\b/g) || []).length;
    if (tdFjoldi >= 6) fail('129: viðvörunarlínan hefur ' + tdFjoldi + ' reiti — 165 myndi lesa hana sem reikningslínu.');
  }
  if (!/const tds = tr\.querySelectorAll\('td'\);\s*\n\s*if \(tds\.length < 6\) return;/.test(lesa('js/patches/165-visit-workflow.js')))
    fail('165: scrapeCostRows sleppir ekki lengur línum með færri en 6 reiti — viðvörunarlína 129 gæti lent á reikningi.');

  // ── B. 431 vefjaLoad ──────────────────────────────────────────────────────
  const src431 = lesa('js/patches/431-uppferslubord.js');
  async function profa431(hamur, rodir) {
    const ls = new Map([['slokk_uppfærslur', JSON.stringify({ fyrirtaeki: { mode: hamur, ms: 120000 } })]]);
    let sott = 0;
    const Companies = {
      list: rodir,
      load() { sott++; this.list = rodir.filter(x => !x.__sydar).map(x => Object.assign({ status: 'virkur', discount_tier_id: null }, x)); return Promise.resolve(); },
      render() {}, _detailOpen() { return true; }, currentId: 192
    };
    const document = { hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
    const win = {
      Companies, document,
      localStorage: { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)) },
      location: { hash: '' }, addEventListener() {}, fetch: () => Promise.resolve()
    };
    win.window = win;
    vm.runInContext(src431, vm.createContext(Object.assign(win, {
      console: { log() {}, warn() {}, error() {} }, setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, Response: function () {}
    })));
    if (!Companies.load.__ub431) return null;
    for (let i = 0; i < 5; i++) await Companies.load();
    return sott;
  }
  const mjor = Array.from({ length: 1234 }, (_, i) => ({ id: i + 1, nafn: 'F' + i, kennitala: '', afslattur_pct: 0 }));
  const breidd = x => Object.assign({ status: 'virkur', discount_tier_id: null }, x);
  const tilvik = [
    ['mjór listi', () => mjor.map(x => Object.assign({}, x)), 1],
    ['breiður listi', () => mjor.map(x => breidd(Object.assign({}, x))), 0],
    ['[0] breið, restin mjó', () => { const L = mjor.map(x => Object.assign({}, x)); L[0] = breidd(L[0]); return L; }, 1],
    ['breiður + SYND-röð + 1 ný mjó', () => { const L = mjor.map(x => breidd(Object.assign({}, x))); L.push({ id: -999, nafn: 'Greining', __sydar: true }); L[5] = { id: 6, nafn: 'Nytt' }; return L; }, 0]
  ];
  for (const hamur of ['hand', 'af']) {
    for (const [lysing, gera, vaent] of tilvik) {
      const n = await profa431(hamur, gera());
      if (n === null) { fail('431: vefjaLoad vafði ekki Companies.load (__ub431 vantar) — prófið nær ekki til kóðans.'); break; }
      if (n !== vaent) fail('431 ' + hamur + '-hamur, ' + lysing + ': full sókn keyrð ' + n + '× af 5, átti að vera ' + vaent + '×.');
    }
  }

  // ── C. 14 openEdit ────────────────────────────────────────────────────────
  const src14 = lesa('js/patches/14-companies-openedit.js');
  if (!/from\('fyrirtaeki'\)\.select\('\*'\)\.eq\('id'/.test(src14))
    fail('14: openEdit sækir ekki ferska breiða röð — formið fyllist úr mjóum lista og Vista þurrkar reiti út.');
  if (!/const thekktir = new Set\(Object\.keys\(co\)\)/.test(src14) || !/!thekktir\.has\(k\)/.test(src14))
    fail('14: Vista sleppir ekki lengur óþekktum, óbreyttum reitum — mjó röð gæti skrifað tómt yfir gögn.');
  if (!/saveBtn\.textContent = 'Vista breytingar';[\s\S]{0,400}?saveBtn\.disabled = false;/.test(src14))
    fail('14: openEdit virkjar ekki Vista-takkann — eftir vel heppnaða vistun fær næsta fyrirtæki óvirkan takka (ALLTAF LEYFA VISTUN).');

  // ── D. rest-samnyting: select('*').eq('id') má aldrei svara með MJÓRRI röð ──
  // (14.10.2026 mælt: „Breyta"-glugginn í 00-legacy fékk tómt tengiliður og Vista skrifaði "" yfir „Melissa".)
  const srcRest = lesa('js/rest-samnyting.js');
  async function profaRest(rod) {
    const net = [];
    const URL0 = 'https://x.supabase.co';
    const win = {
      SUPABASE_URL: URL0, Companies: { list: [rod] },
      localStorage: { getItem: () => null, setItem() {} },
      fetch: (u) => { net.push(String(u)); return Promise.resolve(new Response(JSON.stringify([{ id: rod.id, nafn: 'NET' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
    };
    win.window = win;
    const ctx = vm.createContext(Object.assign(win, { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, Promise, Response, Map, Date, JSON }));
    vm.runInContext(srcRest, ctx);
    // Vafða kallið sótt í breytu: audit-all --static sleppir skrám sem kalla beint á það, og þessi á að keyra í CI.
    const vafid = win.fetch;
    const r = await vafid(URL0 + '/rest/v1/fyrirtaeki?select=*&id=eq.' + rod.id, { headers: { Accept: 'application/vnd.pgrst.object+json' } });
    const j = await r.json();
    return { net: net.length, nafn: j && (j.nafn || (j[0] && j[0].nafn)) };
  }
  {
    const mjo = await profaRest({ id: 5, nafn: 'MINNI', kennitala: '', simi: '' });
    if (mjo.net !== 1) fail('rest-samnyting: select(\'*\') á MJÓRRI röð var svarað úr minni (' + mjo.net + ' netköll) — tómir reitir fara í form og Vista skrifar þá yfir gögn.');
    const breid = await profaRest({ id: 5, nafn: 'MINNI', discount_tier_id: null, status: 'virkur', 'tengiliður': 'X' });
    const synd = await profaRest({ id: 5, nafn: 'MINNI', __sydar: true });
    if (synd.net !== 0) fail('rest-samnyting: SYND-röð (451, ekki í grunninum) fór á netið og fékk [] — reitir Greiningar fasteignar tæmast.');
    if (breid.net !== 0 || breid.nafn !== 'MINNI') fail('rest-samnyting: select(\'*\') á BREIÐRI röð fór á netið — minnið (03.10.2026, 42 köll í stað 58) er hætt að virka.');
  }

  // ── E. Vistunarform og 157 sem lesa raðir úr Companies.list ───────────────
  const src00 = lesa('js/patches/00-legacy.js');
  if (!/var upphaf=lesa\(\);[\s\S]{0,300}?if\(update\[k\]===upphaf\[k\]\) delete update\[k\]/.test(src00))
    fail('00-legacy openEditModal: Vista sendir aftur ALLA reiti — reitur sem kom tómur (mjó röð) er skrifaður yfir gögn í grunninum.');
  const src157 = lesa('js/patches/157-allir-vidskiptavinir.js');
  if (!/select\('review_flag,review_note'\)\.eq\('id', coId\)/.test(src157))
    fail('157 toggleReview: les ekki review_flag/review_note ferskt — flaggað félag sýnist óflaggað og nótan er skrifuð yfir (mælt á 1463).');
  if (!/select\('\*'\)\.in\('id', \[keeper\.id, loser\.id\]\)/.test(src157))
    fail('157 doMerge: les ekki raðirnar ferskar — á mjóum lista sleppir sameiningin skjölum og beiðnum (customer_base_id).');
  // 431 breikkun keyrð í vm (prófun netvarðar 14.10.2026): ein sókn þótt þrír tímastillar keyri, sömu hlutir,
  // súlur sem vantaði lagðar á, staðbundin gildi ekki yfirskrifuð, SYND-röð ósnert, bilun endurreynd.
  async function profaBreikkun(bilanir) {
    const timar = [];
    const ls = new Map([['slokk_uppfærslur', JSON.stringify({ fyrirtaeki: { mode: 'hand', ms: 120000 } })]]);
    const mjor = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, nafn: 'F' + i, kennitala: '', athugasemdir: 'mjo' }));
    mjor.push({ id: -987654321, nafn: 'Greining', __sydar: true });
    const breid = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, nafn: 'F' + i, kennitala: '', athugasemdir: 'DB', status: 'virkur', discount_tier_id: i === 191 ? 2 : null, 'tengiliður': 'T' + i }));
    let koll = 0;
    const Companies = { list: mjor, load() { return Promise.resolve(); }, render() {}, _detailOpen() { return true; }, currentId: null };
    const DB = { sb: { from() { const o = { select() { return o; }, is() { return o; }, order() { return o; }, range() { return o; } }; return o; } },
      fetchAll() { koll++; return koll <= bilanir ? Promise.reject(new Error('gervibilun')) : Promise.resolve(breid.map(x => Object.assign({}, x))); } };
    const document = { hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
    const win = { Companies, DB, document, localStorage: { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)) },
      location: { hash: '' }, addEventListener() {}, fetch: () => Promise.resolve(), requestIdleCallback: (f) => f() };
    win.window = win;
    vm.runInContext(src431, vm.createContext(Object.assign(win, { console: { log() {}, warn() {}, error() {} },
      setTimeout: (f, ms) => { timar.push([ms, f]); return 0; }, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, Response: function () {} })));
    const hlutur = Companies.list[191];
    Companies.list[5].athugasemdir = 'STADBUNDID';
    // Breikkunin skráir þrjá tímastilla í röð (8 s, 20 s, 60 s); 431 á líka annan 8 s tímastilli, svo röðin er fundin.
    let i0 = -1; for (let i = 0; i + 2 < timar.length; i++) if (timar[i][0] === 8000 && timar[i + 1][0] === 20000 && timar[i + 2][0] === 60000) { i0 = i; break; }
    const breikk = i0 < 0 ? [] : timar.slice(i0, i0 + 3);
    for (const [, f] of breikk) { f(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); }
    return { L: Companies.list, hlutur, koll, timar: breikk.length };
  }
  {
    const r = await profaBreikkun(0);
    if (r.timar !== 3) fail('431: breikkun mjós lista er ekki tímasett (8/20/60 s) — listinn helst mjór alla lotuna þegar ræst er á Verkborði/POS.');
    else {
      if (r.koll !== 1) fail('431 breikkun: ' + r.koll + ' sóknir í stað EINNAR.');
      if (r.L[191] !== r.hlutur || r.L[191].discount_tier_id !== 2 || r.L[191]['tengiliður'] !== 'T191') fail('431 breikkun: súlur sem vantaði ekki lagðar á SÖMU hlutina.');
      if (r.L[5].athugasemdir !== 'STADBUNDID') fail('431 breikkun: skrifaði yfir gildi sem var til í listanum (staðbundin breyting tapast).');
      const syn = r.L.find(x => x.__sydar);
      if (!syn || 'status' in syn) fail('431 breikkun: SYND-röðin (451) var snert.');
      const r2 = await profaBreikkun(1);
      if (r2.koll !== 2 || r2.L[191].discount_tier_id !== 2) fail('431 breikkun: bilun í fyrstu tilraun er ekki endurreynd.');
    }
  }

  if (rautt.length) {
    rautt.forEach(x => console.log('  ✗ ' + x));
    console.log('RED: ' + rautt.length + ' brot — úttekt gæti farið út án hópafsláttar (sjá docs/ORYGGISNET.md).');
    process.exit(1);
  }
  console.log('✅ GRÆNT úttekt-afsláttarhópur: 129 sækir hópinn á mjórri röð og geymir aldrei villu · 431 hleypir einni fullri sókn á mjóan lista og breikkar hann · 14/00-legacy vista aðeins þekkta/breytta reiti · rest-samnyting svarar ekki * með mjórri röð · 157 les ferskt.');
})().catch(e => { console.log('RED: vörðurinn hrundi — ' + (e && e.message || e)); process.exit(1); });
