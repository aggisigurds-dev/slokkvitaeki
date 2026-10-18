'use strict';
// _rukkun-eftirlit-diff.cjs — hreinn kjarni „hvað er NÝTT í Rukkunar-eftirlitinu" (18.10.2026).
//
// Agnar: „Fæ þetta bara alltaf. Fullt gamallt bull. Veit ekki hvað er nýtt." Pósturinn prentaði ALLAR niðurstöður gátlistanna
// í hvert sinn (tvisvar á dag) og því drukknaði það nýja í því gamla. Hér er borið saman við síðasta póst:
//   NÝTT      atriði sem eru til núna en voru ekki í síðasta samanburði
//   LEYST     atriði sem voru til en eru horfin
//   ÓBREYTT   aðeins fjöldi per gátlista — engin atriði talin upp
// Engin I/O hér: payday-sync-cron.cjs les/skrifar app_kv.rukkun_eftirlit_sidast og sendir póstinn.
// Prófað með tools/_test-rukkun-eftirlit-diff.cjs.

// [lykill, merki, heiti, auðkenni(x), lýsing(x)]
const GATLISTAR = [
  ['doc_nr_a_fleiri_felog', '🔴', 'Reikningsnúmer á FLEIRI en eitt félag (rangt-PDF hætta)', x => String(x.invoice_number), x => x.invoice_number + ' (' + x.felog + ' félög)'],
  ['tvinotud_num', '🔴', 'Tvínotuð sölunúmer', x => String(x.num), x => String(x.num)],
  ['rukkad_ekki_final', '🟡', 'Rukkað en ekki final', x => String(x.num), x => x.num + ' (' + x.status + ')'],
  ['void_greitt', '🔴', 'Void-sala fékk greiðslu', x => String(x.num), x => String(x.num)],
  ['byte_eins_tvitok', '🟡', 'Byte-eins tvítök enn virk', x => x.num_a + '/' + x.num_b, x => x.num_a + '/' + x.num_b + ' ' + (x.customer_nafn || '')],
  ['rukkad_an_netfangs', '🟡', 'Rukkað á félag án netfangs', x => String(x.num), x => String(x.num)],
  ['greitt_sidar_gamalt', '🟡', '„Greitt síðar" eldra en 14 daga', x => String(x.num), x => x.num + ' ' + (x.customer_nafn || '') + ' (' + x.dagar + 'd)'],
  ['sott_ekki_final', '🔴', 'Sótt verk með sölu sem er EKKI final', x => String(x.verk), x => x.verk + ' → ' + x.sala + ' (' + x.status + ')'],
];
// Gátlistar sem bera aðeins tölu (engin atriði)
const TOLUR = [
  ['rukkad_an_kt', '🟡', 'Rukkað án customer_base_id (sölur)'],
  ['felog_an_afhendingar', '⚪', 'Félög í þjónustu án payday_delivery'],
];

function lesaListi(eftirlit, k) {
  const v = eftirlit && eftirlit[k];
  if (v && Array.isArray(v.daemi)) return { alls: Number(v.alls) || v.daemi.length, daemi: v.daemi };
  if (Array.isArray(v)) return { alls: v.length, daemi: v };
  return { alls: 0, daemi: [] };
}

// Mynd af niðurstöðunni sem er geymd milli keyrslna: { lyklar: {k: [auðkenni]}, tolur: {k: n}, lysing: {k: {auðkenni: texti}} }
function mynd(eftirlit) {
  const lyklar = {}, lysing = {}, tolur = {};
  for (const [k, , , id, lys] of GATLISTAR) {
    const l = lesaListi(eftirlit, k);
    lyklar[k] = []; lysing[k] = {};
    for (const x of l.daemi) { const i = id(x); lyklar[k].push(i); lysing[k][i] = lys(x); }
    lyklar[k] = Array.from(new Set(lyklar[k]));
  }
  for (const [k] of TOLUR) tolur[k] = Number(eftirlit && eftirlit[k]) || 0;
  return { lyklar, lysing, tolur };
}

// prev = geymd mynd (eða null í fyrstu keyrslu), cur = mynd(eftirlit)
function samanburdur(prev, cur) {
  const ny = {}, leyst = {}, obreytt = {}, tolubreyting = {};
  let nyAlls = 0, leystAlls = 0, obreyttAlls = 0;
  for (const [k] of GATLISTAR) {
    const fyrri = new Set((prev && prev.lyklar && prev.lyklar[k]) || []);
    const nuna = new Set(cur.lyklar[k] || []);
    ny[k] = [...nuna].filter(i => !fyrri.has(i));
    leyst[k] = [...fyrri].filter(i => !nuna.has(i));
    obreytt[k] = [...nuna].filter(i => fyrri.has(i)).length;
    nyAlls += ny[k].length; leystAlls += leyst[k].length; obreyttAlls += obreytt[k];
  }
  for (const [k] of TOLUR) {
    const d = (cur.tolur[k] || 0) - ((prev && prev.tolur && prev.tolur[k]) || 0);
    tolubreyting[k] = d;
    if (d > 0) nyAlls += d; else leystAlls += -d;
    obreyttAlls += Math.min(cur.tolur[k] || 0, (prev && prev.tolur && prev.tolur[k]) || 0);
  }
  return { ny, leyst, obreytt, tolubreyting, nyAlls, leystAlls, obreyttAlls };
}

const CAP = 25; // mest svo mörg atriði per gátlista í hverjum pósti
function dmy(d) { const iso = d.toISOString(); return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4); }
function hhmm(d) { return d.toISOString().slice(11, 16); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function listaTexti(ids, lysing) {
  const sed = ids.slice(0, CAP).map(i => esc(lysing[i] || i));
  return sed.join(', ') + (ids.length > CAP ? ' … og ' + (ids.length - CAP) + ' í viðbót' : '');
}

// Skilar { senda, efni, html, tegund } — tegund: 'nytt' | 'grunnlina' | 'vikulegt' | 'ekkert'
function buaTilPost(prev, cur, nu, opt) {
  opt = opt || {};
  const s = samanburdur(prev, cur);
  const dags = dmy(nu);
  const alls = Object.values(cur.lyklar).reduce((a, l) => a + l.length, 0) + Object.values(cur.tolur).reduce((a, n) => a + n, 0);
  const oObreyttHtml = () => {
    const bita = [];
    for (const [k, , heiti] of GATLISTAR) if ((cur.lyklar[k] || []).length) bita.push((cur.lyklar[k] || []).length + ' ' + esc(heiti.toLowerCase()));
    for (const [k, , heiti] of TOLUR) if (cur.tolur[k]) bita.push(cur.tolur[k] + ' ' + esc(heiti.toLowerCase()));
    return bita.join(' · ') || 'engin';
  };
  const fotur = '<p style="color:#64748b;font-size:12px">Full sundurliðun: SELECT jsonb_pretty(rukkun_eftirlit_allt()); — sjá docs/RUKKUNARKEDJAN.md í slokkvitaeki-repo.</p>';

  if (!prev) {
    return {
      senda: true, tegund: 'grunnlina',
      efni: 'Rukkunar-eftirlit: grunnlína skráð, hér eftir aðeins NÝ frávik (' + dags + ')',
      html: '<h3>Rukkunar-eftirlit Slökkvitækja</h3><p>Frá og með núna færðu aðeins það sem er <b>nýtt</b> síðan síðasti póstur. Núverandi staða er skráð sem grunnlína (' + alls + ' frávik, talin sem óbreytt):</p><p>' + oObreyttHtml() + '</p>'
        + '<p>Enginn póstur kemur þegar ekkert nýtt hefur bæst við. Vikuleg staða kemur á mánudögum.</p>' + fotur,
    };
  }

  if (s.nyAlls > 0) {
    const hlutar = [];
    for (const [k, merki, heiti] of GATLISTAR) {
      if (!s.ny[k].length) continue;
      hlutar.push('<li>' + merki + ' <b>' + esc(heiti) + '</b> (+' + s.ny[k].length + '): ' + listaTexti(s.ny[k], cur.lysing[k]) + '</li>');
    }
    for (const [k, merki, heiti] of TOLUR) if (s.tolubreyting[k] > 0) hlutar.push('<li>' + merki + ' <b>' + esc(heiti) + '</b>: +' + s.tolubreyting[k] + ' (nú ' + cur.tolur[k] + ')</li>');
    const leyst = [];
    for (const [k, , heiti] of GATLISTAR) if (s.leyst[k].length) leyst.push(s.leyst[k].length + ' ' + esc(heiti.toLowerCase()));
    for (const [k, , heiti] of TOLUR) if (s.tolubreyting[k] < 0) leyst.push((-s.tolubreyting[k]) + ' ' + esc(heiti.toLowerCase()));
    const sidast = prev.t ? new Date(prev.t) : null;
    return {
      senda: true, tegund: 'nytt',
      efni: '🆕 Rukkunar-eftirlit: ' + s.nyAlls + ' ný frávik (' + dags + ')',
      html: '<h3>🆕 Nýtt síðan ' + (sidast ? dmy(sidast) + ' kl. ' + hhmm(sidast) : 'síðast') + '</h3><ul>' + hlutar.join('') + '</ul>'
        + (leyst.length ? '<p>✅ Leyst síðan þá: ' + leyst.join(' · ') + '</p>' : '')
        + '<p style="color:#64748b">Óbreytt frá áður (ekki talið upp): ' + oObreyttHtml() + '</p>' + fotur,
    };
  }

  if (opt.vikulegt && alls > 0) {
    return {
      senda: true, tegund: 'vikulegt',
      efni: 'Rukkunar-eftirlit, vikuleg staða: ' + alls + ' óbreytt frávik (' + dags + ')',
      html: '<h3>Vikuleg staða — ekkert nýtt þessa viku</h3><p>' + oObreyttHtml() + '</p>' + (s.leystAlls ? '<p>✅ Leyst síðan síðast: ' + s.leystAlls + '</p>' : '') + fotur,
    };
  }
  return { senda: false, tegund: 'ekkert', efni: '', html: '' };
}

module.exports = { GATLISTAR, TOLUR, lesaListi, mynd, samanburdur, buaTilPost };
