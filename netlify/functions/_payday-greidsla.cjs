// _payday-greidsla.cjs — hvenær telst Payday-reikningur GREIÐSLA á sölu?
//
// 13.09.2026: payday-sync-paid taldi hverja Payday-færslu með greiðsludagsetningu
// greiðslu. Kreditreikningur (staða CREDIT) fær greiðsludagsetningu þegar hann er
// jafnaður á móti afturkölluðum reikningi — og ber SAMA tilvísun (R-númer). Þannig
// urðu afturkallaðar sölur „greiddar" í appinu án þess að króna kæmi inn:
// R-000716 Þangbakki 190.987 kr, R-000363, R-000407, R-000415, R-000778 Pizzan,
// R-000728 Eclipse 1.226.121 kr o.fl. paid_at var í öllum tilvikum dagsetning
// kreditreikningsins.
//
// Reglan: staða CREDIT / CANCELLED / DRAFT eða neikvæð upphæð er ALDREI greiðsla.
// Þekkt staða ræður; greiðsludagsetning ein dugar aðeins ef Payday skilar engri stöðu.
// Vörður: tools/audit-payday-greidsla.cjs.
'use strict';

function pickStr(raw, ...keys) {
  for (const k of keys) { const v = raw && raw[k]; if (v != null && String(v).trim()) return String(v).trim(); }
  return '';
}

// Sömu reitir og payday-pull-slokk.js les í amount_total (með VSK), svo amount_ex til vara.
function upphaedAf(raw) {
  for (const k of ['amountIncludingVat', 'amountWithTax', 'total', 'totalAmount', 'grossAmount', 'amountExcludingVat', 'amount']) {
    const v = raw && raw[k];
    if (v == null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function erGreidsla(raw, paidDate) {
  if (!raw || typeof raw !== 'object') return false;
  const stada = pickStr(raw, 'status', 'state', 'paymentStatus').toLowerCase();
  const upphaed = upphaedAf(raw);
  if (upphaed != null && upphaed < 0) return false;                          // kreditreikningur
  if (/credit|kredit|cancel|void|draft|ógild|ogild|afturk/.test(stada)) return false;
  if (stada) return /^(paid|greitt|greidd|greiddur)$/.test(stada);          // þekkt staða ræður („unpaid" ≠ greitt)
  return !!paidDate;                                                          // engin staða: dagsetningin ein
}

module.exports = { erGreidsla, upphaedAf };
