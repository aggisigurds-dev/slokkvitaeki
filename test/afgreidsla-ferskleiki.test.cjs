// Próf: _afgreidsla-ferskleiki — verk/símtöl endurmæld (27.11.2026). Gögnin eru úr raunverulegu tilfellunum sama dag,
// lesin í grunninum (Nesdekk drög #342 → Payday 391; Deluxe Lodges R-364 ógreiddur), en hér í minni — engin nettenging.
const assert = require('assert');
const F = require('../netlify/functions/_afgreidsla-ferskleiki.cjs');

let fail = 0, ok = 0;
const t = async (nafn, fn) => { try { await fn(); ok++; console.log('ok  ', nafn); } catch (e) { fail++; console.log('FAIL', nafn, '—', e.message); } };

const NU = Date.parse('2026-11-27T02:00:00Z');
const DROG = { id: 342, kennitala: '420296-2079', total_m_vsk: 481415, status: 'draft', payday_invoice_id: null, customer_name: 'Nesdekk ehf.' };
const INV391 = { tilvisun: '391', upphaed_total: 481415, status: 'SENT', utgafudagur: '2026-10-31', greidsla_date: null };
const INV364 = { tilvisun: '364', upphaed_total: 1006129, status: 'SENT', eindagi: '2026-09-15', greidsla_date: null };

function lesaMock(svor) {
  const kollud = [];
  const f = async (qs) => { kollud.push(qs); for (const [m, v] of svor) if (qs.startsWith(m)) return typeof v === 'function' ? v(qs) : v; return []; };
  f.kollud = kollud; return f;
}

(async () => {
  await t('tilvisanir: drög, R-númer, reikningur N og upphæðir', () => {
    const r = F.tilvisanir('Drög #342 (Brunahólf): 358.918 kr. — R-364 (1.006.129 kr.) og reikningur 386 upp á 2.589.597 kr.');
    assert.deepStrictEqual(r.drog, [342]);
    assert.deepStrictEqual(r.reikn.sort((a, b) => a - b), [364, 386]);
    assert.ok(r.upphaedir.includes(1006129) && r.upphaedir.includes(358918) && r.upphaedir.includes(2589597));
  });

  await t('Nesdekk dagsverk: drög #342 farin sem reikningur 391 → úrelt', async () => {
    const lesa = lesaMock([['invoice_drafts', [DROG]], ['invoices', [INV391]]]);
    const row = { tegund: 'verk', titill: 'Nesdekk, Dalshraun 10: brunaþéttingadrögin bíða efnisins (358.918 kr. án efnis)',
      gogn: { lysing: 'Drög #342 (Brunahólf): 26,71 klst.' }, created_at: '2026-11-19T10:00:00Z' };
    const s = await F.athugaFerskleika(row, lesa, NU);
    assert.ok(s.urelt && /reikningur 391/.test(s.urelt) && /481\.415 kr/.test(s.urelt), String(s.urelt));
    assert.ok(lesa.kollud.some((q) => /kt_greidanda=in\.\(420296-2079,4202962079\)/.test(q)), 'leitar á kt drögnanna');
  });

  await t('Nesdekk símtal #65: drög farin EN R-001198 ógreiddur → stendur, með línu um drögin', async () => {
    const lesa = lesaMock([['invoice_drafts', [DROG]], ['invoices?select=tilvisun,upphaed_total,status,utgafudagur', [INV391]],
      ['solur', [{ num: 'R-001198', samtals: 364807, paid_at: null, krafa_sent_at: '2026-11-09', status: 'final' }]], ['invoices', []]]);
    const row = { tegund: 'simtal', titill: 'Nesdekk (Óli): svara pósti', gogn: { handrit: 'Drög #342 ... Reikningur R-001198 fyrir skoðun, 364.807 kr., fór sem krafa' }, created_at: '2026-11-17T10:00:00Z' };
    const s = await F.athugaFerskleika(row, lesa, NU);
    assert.strictEqual(s.urelt, null, String(s.urelt));
    assert.ok(s.a.some((x) => /reikningur 391.*sá hluti verksins er búinn/.test(x.texti)), JSON.stringify(s.a));
    assert.ok(s.a.some((x) => /R-001198 \(364\.807 kr\) er enn ógreiddur/.test(x.texti)), JSON.stringify(s.a));
  });

  await t('Drög enn ófarin → ekki úrelt, lína „mælt núna"', async () => {
    const lesa = lesaMock([['invoice_drafts', [DROG]], ['invoices', []]]);
    const s = await F.athugaFerskleika({ tegund: 'verk', titill: 'Drög #342 bíða', gogn: {}, created_at: '2026-11-26T10:00:00Z' }, lesa, NU);
    assert.strictEqual(s.urelt, null);
    assert.ok(s.a.some((x) => /enn ófarin/.test(x.texti)));
  });

  await t('Deluxe símtal: R-364 ógreiddur → stendur, dagafjöldi reiknaður núna (73 dagar)', async () => {
    const lesa = lesaMock([['solur', []], ['invoices', [INV364]]]);
    const row = { tegund: 'simtal', titill: 'Hringja í Sigurð hjá Deluxe Lodges: R-364 (1.006.129 kr.) ógreiddur 62 dögum eftir eindaga', gogn: {}, created_at: '2026-11-16T10:00:00Z' };
    const s = await F.athugaFerskleika(row, lesa, NU);
    assert.strictEqual(s.urelt, null);
    assert.ok(s.a.some((x) => /enn ógreiddur, 73 dögum eftir eindaga/.test(x.texti)), JSON.stringify(s.a));
    assert.ok(s.a.some((x) => /16\.11\.2026 — 10 dagar/.test(x.texti)), 'aldurslína');
  });

  await t('R-364 greiddur → úrelt', async () => {
    const lesa = lesaMock([['solur', []], ['invoices', [Object.assign({}, INV364, { status: 'PAID', greidsla_date: '2026-11-25' })]]]);
    const s = await F.athugaFerskleika({ tegund: 'simtal', titill: 'R-364 (1.006.129 kr.) ógreiddur', gogn: {} }, lesa, NU);
    assert.ok(s.urelt && /greiddur 25\.11\.2026/.test(s.urelt), String(s.urelt));
  });

  await t('Sama númer en önnur upphæð (hitt félagið) → ekki parað, ekki úrelt', async () => {
    const lesa = lesaMock([['solur', [{ num: 'R-000364', samtals: 12000, paid_at: '2026-06-01', status: 'final' }]], ['invoices', []]]);
    const s = await F.athugaFerskleika({ tegund: 'simtal', titill: 'R-364 (1.006.129 kr.) ógreiddur', gogn: {} }, lesa, NU);
    assert.strictEqual(s.urelt, null);
  });

  await t('Engin upphæð í texta → R-númeri ekki flett upp (ekki giskað)', async () => {
    const lesa = lesaMock([]);
    const s = await F.athugaFerskleika({ tegund: 'verk', titill: 'Krókur 77: R-360 er falinn', gogn: {} }, lesa, NU);
    assert.strictEqual(s.urelt, null);
    assert.strictEqual(lesa.kollud.length, 0);
  });

  console.log(`\n${ok} ok, fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
