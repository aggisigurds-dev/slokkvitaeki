// Próf: dálkalistar gagnasöfnunar agentanna (_adalmal-claude.cjs) verða að vera RAUNVERULEGIR dálkar (18.11.2026).
//   node --test test/adalmal-claude-dalkar.test.cjs
// Fannst 18.11.2026: söluuppflettingin valdi „…samtals,dags,status…“ en `dags` er EKKI dálkur í solur. PostgREST svarar þá
// 400, lesaHljott gleypti villuna og agentinn fékk ALDREI sölufærslu — mælt í grunninum: 0 S-heimildir í öllum umferðum
// „Merkja og keyra“, þótt Payday-færslur sömu R-númera kæmu (9 P-heimildir). Gervi-PostgREST prófanna hunsar `select`,
// svo ekkert próf sá þetta. Hér er dálkalistinn borinn við raunverulegu dálkana (information_schema, 18.11.2026) og
// uppflettingin keyrð á gervi sem HAFNAR óþekktum dálkum eins og PostgREST gerir.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const F = require('./_fake-postgrest.cjs');
const P = require('../netlify/functions/_portal.cjs');
const CL = require('../netlify/functions/_adalmal-claude.cjs');

// Raunverulegir dálkar (public), lesnir úr information_schema 18.11.2026. Bætist dálkur við þarf ekkert að gera hér;
// hverfi dálkur eða sé rangt nafn valið fellur prófið — það er tilgangurinn.
const DALKAR = {
  solur: 'id num starfsmadur customer_nafn customer_id linur upphaed_an_vsk vsk_upphaed afslattur samtals greitt_med athugasemdir created_at paid_at paid_method status credit_of is_credit updated_at invoiced_at dk_invoice_id invoice_batch_id customer_base_id hidden hidden_at krafa_sent_at greitt_med_prev customer_kt krafa_note source vidskiptategund kredit_a krafa_sendir_at an_stofnunar'.split(' '),
  customer_documents: 'id customer_base_id doc_type year drive_file_id storage_path source found_by found_at amount notes created_at invoice_number doc_date customer_name fyrirtaeki_id is_duplicate dup_of reviewed reviewed_at link_ok link_checked_at link_status needs_site vidskiptategund file_name stolpi_stada stolpi_skyring skodun_ar_man skyrsla_texti skyrsla_vidbot skyrsla_taeki_alls'.split(' '),
  uttaeki: ['id', 'fyrirtaeki_id', 'last_insp', 'status', 'created_at'],   // aðeins þeir sem valdir eru (taflan á fleiri)
};
const SRC = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'functions', '_adalmal-claude.cjs'), 'utf8');

// Öll „tafla?select=…“ í skránni, með ${FASTA} leyst upp úr útflutningi skrárinnar.
function valin(tafla) {
  const ut = [];
  const re = new RegExp('`' + tafla + '\\?select=([^&`]+)', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const listi = m[1].replace(/\$\{(\w+)\}/g, (_, k) => { assert.ok(typeof CL[k] === 'string', 'fastinn ' + k + ' er ekki útfluttur'); return CL[k]; });
    ut.push(listi.split(',').map((c) => c.trim()).filter(Boolean));
  }
  return ut;
}

test('hver dálkur sem valinn er úr solur, customer_documents og uttaeki er til', () => {
  for (const t of Object.keys(DALKAR)) {
    const listar = valin(t);
    assert.ok(listar.length >= 1, 'fann enga uppflettingu í ' + t);
    for (const l of listar) for (const c of l) assert.ok(DALKAR[t].includes(c), t + '.' + c + ' er ekki dálkur — PostgREST svarar 400 og agentinn fær ENGIN gögn úr ' + t);
  }
  assert.ok(valin('solur').length >= 2, 'bæði R-númera-uppflettingin og úttektaruppflettingin eiga að finnast');
  assert.ok(!/solur\?select=[^&`]*\bdags\b/.test(SRC), '`dags` er ekki dálkur í solur');
});

test('sala sem atriðið nefnir (R-númer) skilar sér til agentsins — á gervi sem hafnar óþekktum dálkum eins og PostgREST', async () => {
  const fake = F.bua({ solur: [{ id: 9001, num: 'R-001234', customer_nafn: 'Prufufélag ehf.', samtals: 48900, created_at: '2026-09-26T09:00:00+00:00', status: 'open', is_credit: false, hidden: false,
    krafa_sent_at: '2026-09-26T12:00:00+00:00', paid_at: null }] });
  const aftur = F.tengja(P, fake);
  const g0 = P.sbGet;
  const hafnad = [];
  P.sbGet = async (qs) => {
    const [t, q = ''] = qs.split('?');
    const sel = (q.split('&').find((x) => x.startsWith('select=')) || '').slice(7);
    if (DALKAR[t] && sel && sel !== '*') {
      const rangt = decodeURIComponent(sel).split(',').map((c) => c.trim()).filter((c) => !DALKAR[t].includes(c));
      if (rangt.length) { hafnad.push(t + '.' + rangt.join(',')); return { ok: false, status: 400, json: async () => ({ code: '42703' }), text: async () => 'column ' + t + '.' + rangt[0] + ' does not exist' }; }
    }
    return g0(qs);
  };
  try {
    const s = await CL.safna({ texti: 'Krafa R-001234 er ógreidd', hluti_heiti: 'Þjónustuborð' }, { id: 1, title: 'Mál' }, '');
    assert.deepStrictEqual(hafnad, [], 'uppfletting með óþekktum dálki: ' + hafnad.join(' · '));
    const S = s.gogn.gogn.filter((x) => /^S\d/.test(x.id));
    assert.strictEqual(S.length, 1, 'sölufærslan verður að skila sér');
    assert.deepStrictEqual([S[0].sala, S[0].samtals_kr, S[0].dags, S[0].krafa_send, S[0].greidd], ['R-001234', 48900, '2026-09-26', '26.09.2026', null]);
    assert.deepStrictEqual(s.kort[S[0].id].opna, { tegund: 'sala', id: 9001 });
  } finally { P.sbGet = g0; aftur(); }
});
