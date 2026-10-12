// _gatt-verkfaeri.cjs — þjónsútgáfa verkfæraskrárinnar (sjá gatt/verkfaeri.js — SÖMU lyklar, vörður audit-gatt-verkfaeri).
// Aðeins lyklar, sjálfgefin gildi og hvort tólið sé tilbúið: textarnir búa í gatt/verkfaeri.js.
const VERKFAERI = [
  ['teikningar', true, true], ['threed', true, true], ['nidurhal', true, true], ['greining', true, true], ['taeki', true, true], ['skjol', true, true],
  ['kerfi', true, true], ['fasteign', true, true], ['saga', true, true],
  ['erindi', true, true], ['verkbeidni', true, true], ['punktar', true, true], ['qr', true, true], ['eldvarnabok', true, true], ['vinnusvaedi', true, true],
  ['checklisti', true, true], ['verkefni', true, true], ['dagatal', true, true], ['vidhald', true, true], ['kort', true, true], ['baeta_eign', true, true],
  ['csv', true, true], ['skjol_hlekkir', true, true], ['leit', true, true], ['einkunn', true, true], ['skyrsla', true, true], ['vikupostur', false, true],
  ['verktakar', false, false], ['kostnadur', false, false], ['rymi', false, false], ['lyklar', false, false], ['orkumaelar', false, false], ['api', false, false], ['snjallkerfi', false, false],
];
const LYKLAR = VERKFAERI.map((v) => v[0]);
const SYN_DEF = {}; VERKFAERI.forEach((v) => { SYN_DEF[v[0]] = v[1] && v[2]; });
const TILBUID = new Set(VERKFAERI.filter((v) => v[2]).map((v) => v[0]));
// Sameinar okkar rofa (syn) og hvað er tilbúið: ótilbúið tól er alltaf slökkt, hvað sem syn segir.
function lesaSyn(acct) {
  const syn = Object.assign({}, SYN_DEF);
  const s = acct && acct.syn && typeof acct.syn === 'object' ? acct.syn : {};
  LYKLAR.forEach((k) => { if (typeof s[k] === 'boolean') syn[k] = s[k] && TILBUID.has(k); });
  return syn;
}
module.exports = { VERKFAERI, LYKLAR, SYN_DEF, TILBUID, lesaSyn };
