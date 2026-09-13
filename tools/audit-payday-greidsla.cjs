#!/usr/bin/env node
/* VÖRÐUR: kreditreikningur í Payday er ALDREI greiðsla (13.09.2026).
 *
 * payday-sync-paid taldi hverja Payday-færslu með greiðsludagsetningu greiðslu.
 * Kreditreikningur fær greiðsludagsetningu þegar hann er jafnaður á móti
 * afturkölluðum reikningi og ber sama R-númer — svo afturkallaðar sölur urðu
 * „greiddar" í appinu: R-000716 Þangbakki 190.987 kr, R-000778 Pizzan, R-000728
 * Eclipse 1.226.121 kr o.fl. Þær hurfu úr öllum ógreiddum listum.
 *
 * Kóða-vörður (ekkert net): prófar reglu _payday-greidsla.cjs á raundæmum úr
 * Payday-speglinum og að payday-sync-paid noti hana. Gagnahliðin (hvort skaðinn
 * er í gögnunum) er í audit-payday-samraeming.cjs, próf T3.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { erGreidsla } = require(path.join(ROOT, 'netlify/functions/_payday-greidsla.cjs'));

let prof = 0, rautt = 0;
function mal(lysing, fekk, atti) {
  prof++;
  if (fekk === atti) console.log('  OK  ' + lysing);
  else { console.log('  RED ' + lysing + ' — fékk ' + fekk + ', átti að vera ' + atti); rautt++; }
}

// Raundæmi úr payday_invoices_slokk 13.09.2026
mal('CREDIT með greiðsludagsetningu (nr. 285, Eclipse)', erGreidsla({ status: 'CREDIT', amountIncludingVat: -1226121, paidDate: '2026-09-13' }, '2026-09-13'), false);
mal('CREDIT án upphæðar en með dagsetningu', erGreidsla({ status: 'CREDIT', paidDate: '2026-09-04' }, '2026-09-04'), false);
mal('CANCELLED (nr. 213, Eclipse)', erGreidsla({ status: 'CANCELLED', amountIncludingVat: 1226121 }, ''), false);
mal('PAID (nr. 214, Pizzan R-000740)', erGreidsla({ status: 'PAID', amountIncludingVat: 38034, paidDate: '2026-09-04' }, '2026-09-04'), true);
mal('SENT án greiðslu (nr. 267)', erGreidsla({ status: 'SENT', amountIncludingVat: 36300 }, ''), false);
mal('DRAFT', erGreidsla({ status: 'DRAFT', amountIncludingVat: 5000 }, ''), false);
mal('neikvæð upphæð þótt staðan segi PAID', erGreidsla({ status: 'PAID', amountIncludingVat: -500, paidDate: '2026-09-01' }, '2026-09-01'), false);
mal('„UNPAID" telst ekki greitt', erGreidsla({ status: 'UNPAID', amountIncludingVat: 1000 }, ''), false);
mal('engin staða + greiðsludagsetning + jákvæð upphæð', erGreidsla({ amountIncludingVat: 1000, paidDate: '2026-09-01' }, '2026-09-01'), true);

prof++;
const sync = fs.readFileSync(path.join(ROOT, 'netlify/functions/payday-sync-paid.js'), 'utf8');
if (/require\(\s*['"]\.\/_payday-greidsla\.cjs['"]\s*\)/.test(sync) && /erGreidsla\(\s*raw/.test(sync) && !/isPaid\s*=\s*!!paidDate/.test(sync)) {
  console.log('  OK  payday-sync-paid notar erGreidsla');
} else {
  console.log('  RED payday-sync-paid notar ekki erGreidsla — gamla reglan (greiðsludagsetning = greitt) gæti verið komin aftur');
  rautt++;
}

if (rautt) {
  console.log('\nRED: kreditreikningur/afturkallaður reikningur getur merkt sölu greidda (' + rautt + ' af ' + prof + ' prófum).');
  process.exit(1);
}
console.log('OK — kreditreikningur eða afturkallaður reikningur í Payday merkir aldrei sölu greidda (' + prof + ' próf).');
