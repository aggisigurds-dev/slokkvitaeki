// _gatt-eq.cjs — skipting slökkvitækja / brunaslangna fyrir Þjónustuvefinn.
//
// Sýnishornið (?demo=1, Center Hótel) sýnir tvo aðskilda dálka: Slökkvitæki og
// Brunaslöngur. Lifandi gáttin las aðeins total_devices (sem INNIHELDUR slöngur)
// og harðkóðaði Brunaslöngur sem „—". Hér er formúlan sem passar við sýnishornið:
//
//   slo  = skýrslu-fjöldi (arsskodun_report_facts.equipment.brunaslongur) ef > 0
//          annars virk tæki af gerð Brunaslanga (v_uttaeki_fid_rollup.bsl)
//   slt  = total_devices − slo   (skýrslu-heildin inniheldur slöngurnar)
//
// 0 og null verða að null svo frumurnar teiknist sem „—" eins og í sýnishorninu.
'use strict';

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickHose(factBsl, liveBsl) {
  const fact = toNum(factBsl);
  const live = toNum(liveBsl) || 0;
  if (fact != null && fact > 0) return fact;
  if (live > 0) return live;
  return null;
}

function slokkMinusHose(totalDevices, slo) {
  const t = toNum(totalDevices);
  if (t == null) return null;
  return Math.max(0, t - (slo || 0));
}

module.exports = { pickHose, slokkMinusHose, toNum };
