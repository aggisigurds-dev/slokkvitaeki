#!/usr/bin/env node
/* BLÁIR PUNKTAR → GRÆNIR: úttekt sem AÐEINS reikningur sannar.
 *
 * Agnar 08.09.2026: „öll fyrirtækin þarna með bláan punkt, sem þýðir að þeir eru
 * með invoice fyrir úttektinni … fyrri eigandi var oft ekki að gera
 * úttektarskýrslur þegar það voru bara eitt slökkvitæki á staðnum … getur þú
 * gert restina af bláu punktunum og skráð fjölda tækja á þau og staðfest
 * skoðunina svo hún verði græn."
 *
 * HVAÐ BLÁTT ÞÝÐIR: `v_uttekt_ar.heimild = 'reikningur'` — úttektarreikningur er
 * til fyrir árið en ENGIN úttektarskýrsla. Merkið í patch 187 les þetta beint.
 *
 * TVENNT ER SKRIFAÐ
 *   1. TÆKI — aðeins á félög sem eiga ENGIN (systurregla
 *      `generera-taeki-ur-skyrslu.cjs`; sama KORT, sömu TMP-raðnúmer). Talan og
 *      sundurliðunin koma úr `uttekt_reikningur_facts.equipment`, lesin úr
 *      reikningnum sjálfum. Félag sem á tæki er ALDREI snert — röng tala á félagi
 *      sem á tæki er sérstakt mál og krefst dóms.
 *   2. PÖRUN — `document_pairs` með status 'klarad' fyrir stað+ár. Það er eina
 *      leiðin sem 187 telur græna án skýrslu (`isKlarad`). Ný úttektarskýrsla er
 *      ALDREI búin til: skýrslan var aldrei gerð og það má ekki þykjast.
 *
 * ÖRYGGISRAMMI
 *   · Aðeins félög í þjónustu, óeydd, ekki í endurheimt (`ovisst`).
 *   · Fjölstaða-kennitölur eru í lagi hér: `v_uttekt_ar` er þegar per stað.
 *   · Afrit af öllu sem snert er fer í tools/bakk-graen-<dags>.json.
 *
 *   node tools/uttekt-graen-af-reikningi.cjs            (þurrkeyrsla)
 *   node tools/uttekt-graen-af-reikningi.cjs --keyra    (skrifar)
 *   node tools/uttekt-graen-af-reikningi.cjs --fid 1732 (eitt félag)
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const KEYRA = process.argv.includes('--keyra');
const EITT = (process.argv.indexOf('--fid') >= 0) ? parseInt(process.argv[process.argv.indexOf('--fid') + 1], 10) : null;

// Orðaforðinn eins og hann ER í gögnunum — aldrei ný afbrigði (sbr. systurtólið).
const KORT = {
  lettvatn:       { type: 'Léttvatn',       size: '6 L'  },
  brunaslongur:   { type: 'Brunaslanga',    size: null   },
  brunaslanga:    { type: 'Brunaslanga',    size: null   },
  reykskynjarar:  { type: 'Reykskynjari',   size: null   },
  duft6_12:       { type: 'ABC Duft',       size: '6 kg' },
  co2_5:          { type: 'CO2',            size: '5 kg' },
  co2_2:          { type: 'CO2',            size: '2 kg' },
  duft2:          { type: 'ABC Duft',       size: '2 kg' },
  eldvarnarteppi: { type: 'Eldvarnarteppi', size: null   },
};

async function sb(slod, valkostir) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H, ...(valkostir || {}) });
  if (!r.ok) throw new Error(((valkostir && valkostir.method) || 'GET') + ' ' + slod.slice(0, 70) + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 220));
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const d = await sb(q + (q.indexOf('?') >= 0 ? '&' : '?') + 'offset=' + f + '&limit=1000');
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}

(async () => {
  const [bla, rf, ut, co, docs, pairs] = await Promise.all([
    allar('v_uttekt_ar?select=fyrirtaeki_id,ar,nr,dags&heimild=eq.reikningur'),
    allar('uttekt_reikningur_facts?select=fyrirtaeki_id,invoice_number,invoice_year,invoice_date,inspect_month,equipment,total_devices'),
    allar('uttaeki?select=fyrirtaeki_id,status,serial'),
    allar('fyrirtaeki?select=id,nafn,kennitala,customer_base_id,er_i_thjonustu,ovisst&deleted_at=is.null'),
    allar('customer_documents?select=id,invoice_number,fyrirtaeki_id&doc_type=eq.reikningur'),
    allar('document_pairs?select=id,fyrirtaeki_id,customer_base_id,year,service_type,status'),
  ]);

  const N = new Map(co.map(c => [c.id, c]));
  const T = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id != null && u.status !== 'urelt') T.set(u.fyrirtaeki_id, (T.get(u.fyrirtaeki_id) || 0) + 1); });
  const RF = new Map(); rf.forEach(r => RF.set(String(r.fyrirtaeki_id) + '|' + r.invoice_year, r));
  const RFN = new Map(); rf.forEach(r => RFN.set(String(r.invoice_number).replace(/^R-/, ''), r));
  const D = new Map(); docs.forEach(d => { if (d.invoice_number) D.set(String(d.invoice_number).replace(/^R-/, ''), d); });
  const P = new Map(); pairs.forEach(p => { if (p.fyrirtaeki_id != null) P.set(p.fyrirtaeki_id + '|' + p.year + '|' + p.service_type, p); });

  const verk = [];
  bla.forEach(b => {
    const c = N.get(b.fyrirtaeki_id);
    if (!c) return;
    if (EITT && c.id !== EITT) return;
    if (c.er_i_thjonustu !== true) return;   // sofandi skráning fær ekki grænt
    if (c.ovisst) return;                    // í endurheimt — bíður ákvörðunar
    const r = RFN.get(String(b.nr)) || RF.get(String(b.fyrirtaeki_id) + '|' + b.ar) || null;
    const doc = D.get(String(b.nr)) || null;
    const par = P.get(b.fyrirtaeki_id + '|' + b.ar + '|uttekt') || null;
    const aTaeki = (T.get(b.fyrirtaeki_id) || 0) > 0;
    const e = (r && r.equipment) || {};
    // brunaslongur/brunaslanga eru sami tækjaflokkur — sameina svo ekki tvítelji.
    const samein = {};
    Object.keys(KORT).forEach(k => {
      const n = +e[k] || 0;
      if (!n) return;
      const v = KORT[k];
      const lykill = v.type + '|' + (v.size || '');
      samein[lykill] = (samein[lykill] || 0) + n;
    });
    const lin = Object.keys(samein).map(k => ({ type: k.split('|')[0], size: k.split('|')[1] || null, n: samein[k] }));
    verk.push({
      c, ar: b.ar, nr: b.nr, dags: b.dags, rf: r, doc, par, aTaeki,
      taeki: aTaeki ? 0 : lin.reduce((a, x) => a + x.n, 0),
      lin: aTaeki ? [] : lin,
    });
  });

  // Félag getur átt bláan punkt á FLEIRI en einu ári (Crinis 2025 OG 2026).
  // Tækin eru TALA, ekki saga — þau má aðeins generera EINU SINNI, annars fær
  // félagið tvöfalda tölu. Nýjasta árið ræður; pörunin er skrifuð fyrir öll árin.
  const nyTaeki = [];
  const seen = new Set();
  verk.filter(v => v.taeki > 0).sort((a, b) => b.ar - a.ar).forEach(v => {
    if (seen.has(v.c.id)) return;
    seen.add(v.c.id);
    nyTaeki.push(v);
  });
  const nyPor = verk.filter(v => !v.par || v.par.status !== 'klarad');
  console.log('BLÁIR PUNKTAR: ' + verk.length + ' stað+ár hjá ' + new Set(verk.map(v => v.c.id)).size + ' félögum í þjónustu');
  console.log('  -> tæki verða skráð á ' + nyTaeki.length + ' (félög sem eiga ENGIN tæki í dag)');
  console.log('  -> pörun (klarad) skrifuð fyrir ' + nyPor.length + ' stað+ár');
  console.log('');
  nyTaeki.forEach(v => console.log('   fid ' + String(v.c.id).padEnd(6) + String(v.taeki).padStart(3) + ' tæki  R-' + v.nr + ' ' + v.ar + '  '
    + String(v.c.nafn).slice(0, 32).padEnd(33)
    + v.lin.map(l => l.n + 'x ' + l.type + (l.size ? ' ' + l.size : '')).join(', ')));
  const anRf = verk.filter(v => !v.rf);
  if (anRf.length) console.log('\n   ATH ' + anRf.length + ' stað+ár án lesinnar reikningstölu: ' + anRf.map(v => v.c.id + '/' + v.ar).join(', '));

  if (!KEYRA) { console.log('\nÞurrkeyrsla — ekkert skrifað. Bættu við --keyra.'); return; }

  let haest = 0;
  ut.forEach(u => { const m = /^TMP-(\d+)$/.exec(String(u.serial || '')); if (m) haest = Math.max(haest, +m[1]); });
  const idag = new Date().toISOString().slice(0, 10);
  const radir = [];
  nyTaeki.forEach(v => {
    const man = Math.min(12, Math.max(1, +(v.rf && v.rf.inspect_month) || +String(v.dags || '').slice(5, 7) || 6));
    const last = v.ar + '-' + String(man).padStart(2, '0') + '-01';
    const next = (+v.ar + 1) + '-' + String(man).padStart(2, '0') + '-01';
    v.lin.forEach(l => {
      for (let i = 0; i < l.n; i++) radir.push({
        fyrirtaeki_id: v.c.id,
        customer_base_id: v.c.customer_base_id == null ? null : v.c.customer_base_id,
        client: v.c.nafn, type: l.type, size: l.size, status: 'active',
        last_insp: last, next_insp: next, serial: 'TMP-' + (++haest),
        notes: 'Generað ' + idag + ' úr úttektarreikningi R-' + v.nr + ' (' + v.ar + ') — skýrsla var aldrei gerð',
      });
    });
  });

  const bakk = path.join(__dirname, 'bakk-graen-' + idag + '.json');
  fs.writeFileSync(bakk, JSON.stringify({ radir, por: nyPor.map(v => ({ fid: v.c.id, ar: v.ar, fyrri: v.par })) }, null, 1), 'utf8');

  for (let i = 0; i < radir.length; i += 200) {
    await sb('uttaeki', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(radir.slice(i, i + 200)) });
  }
  console.log('\nOK ' + radir.length + ' tæki skráð');

  let nyr = 0, uppf = 0;
  for (const v of nyPor) {
    const rod = {
      customer_base_id: v.c.customer_base_id == null ? null : v.c.customer_base_id,
      fyrirtaeki_id: v.c.id, year: +v.ar, service_type: 'uttekt', status: 'klarad',
      matched_by: 'reikningur-eingongu-' + idag,
      invoice_doc_id: v.doc ? v.doc.id : null,
      updated_at: new Date().toISOString(),
    };
    if (v.par) { await sb('document_pairs?id=eq.' + v.par.id, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(rod) }); uppf++; }
    else { await sb('document_pairs', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(rod) }); nyr++; }
  }
  console.log('OK pörun: ' + nyr + ' nýjar, ' + uppf + ' uppfærðar · afrit: ' + path.relative(rot, bakk));
})().catch(e => { console.error('VILLA: ' + e.message); process.exit(1); });
