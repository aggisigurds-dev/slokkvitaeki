// _afgreidsla-ferskleiki.cjs — ENDURMÆLING Dagsverka og Símtala við hverja opnun (27.11.2026).
//
// Agnar 27.11.2026 (með skjáskotum af Tilbúnum verkum): „Úrelt, heimsk svör, ennnnngin hjálp."
// Mælt sama dag: 70 af 72 tilbúnum verkum voru búin til 16.–19.11 og aldrei endurmæld. Aðeins pósti og kröfum var flett
// upp aftur (athuga() í afgreidsla.cjs). Dagsverkið „Nesdekk, Dalshraun 10: brunaþéttingadrögin bíða efnisins" stóð enn,
// þótt drög #342 hefðu farið út sem reikningur 391 (481.415 kr, sama kt) — og símtalshandritið sagði Óla að sá reikningur
// væri „ekki farinn".
//
// Hér er það sem verkið vísar í lesið NÚNA:
//   • „Drög #N"  → invoice_drafts. Farin í Payday (payday_invoice_id) eða sendur/greiddur Payday-reikningur með SÖMU kt og
//                   SAMA heildarverði → verkið er úrelt og hverfur.
//   • „R-364", „reikningur 386" → solur (R-000364) og Payday (tilvísun 364). Aðeins parað ef UPPHÆÐIN í textanum passar við
//                   reikninginn (R-364 er til í báðum félögum). Greiddur → úrelt. Ógreiddur → lína með stöðunni í dag.
//   • Aldur      → „Mælt dd.mm — N dagar síðan" svo gamalt verk segi sjálft hvað það er gamalt.
// Hreint les; engin skrif. Upplýsingalínurnar eru ok:true (þær loka engum takka); aðeins `urelt` fjarlægir verkið.
'use strict';

const p2 = (n) => String(n).padStart(2, '0');
const dags = (d) => { const x = new Date(d); return isNaN(x) ? '?' : p2(x.getDate()) + '.' + p2(x.getMonth() + 1) + '.' + x.getFullYear(); };
const kr = (n) => Math.round(Number(n) || 0);
const krIs = (n) => String(kr(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';   // toLocaleString('is-IS') lýgur á Node án ICU
const dagarFra = (d, nu) => Math.floor(((nu || Date.now()) - Date.parse(d)) / 864e5);

function textiVerks(row) {
  const g = row.gogn || {};
  return [row.titill, row.hvad_gerist, g.lysing, g.handrit].filter(Boolean).join('\n');
}

// Hrein: dregur tilvísanir úr texta. Prófanleg án grunns.
function tilvisanir(texti) {
  const t = String(texti || '');
  const drog = [...new Set([...t.matchAll(/dr[öo]g\s*#\s*(\d{2,6})/gi)].map((m) => Number(m[1])))];
  const reikn = new Set();
  for (const m of t.matchAll(/\bR-0*(\d{1,6})\b/g)) reikn.add(Number(m[1]));
  for (const m of t.matchAll(/\breikning(?:ur|i|s|num)?\s+(?:nr\.?\s*)?(\d{3,6})\b/gi)) reikn.add(Number(m[1]));
  const upphaedir = new Set();
  for (const m of t.matchAll(/(\d{1,3}(?:\.\d{3})+|\d{4,})\s*(?:kr|m\.kr)/gi)) upphaedir.add(Number(m[1].replace(/\./g, '')));
  return { drog, reikn: [...reikn].filter((n) => n > 0), upphaedir: [...upphaedir] };
}

const passar = (upph, a) => upph.some((u) => Math.abs(u - kr(a)) <= 1);

async function athugaFerskleika(row, lesa, nu) {
  const a = [];
  let urelt = null;
  const { drog, reikn, upphaedir } = tilvisanir(textiVerks(row));

  // 1. Drög
  for (const id of drog.slice(0, 4)) {
    const d = (await lesa(`invoice_drafts?select=id,kennitala,total_m_vsk,status,payday_invoice_id,customer_name&id=eq.${id}&limit=1`))[0];
    if (!d) continue;
    if (d.payday_invoice_id) { urelt = 'Drög #' + id + ' eru farin í Payday'; break; }
    const kt = String(d.kennitala || '').replace(/\D/g, '');
    if (kt.length === 10 && kr(d.total_m_vsk) > 0) {
      const ktF = kt.slice(0, 6) + '-' + kt.slice(6);
      const inv = await lesa(`invoices?select=tilvisun,upphaed_total,status,utgafudagur,greidsla_date&source=eq.payday&kt_greidanda=in.(${ktF},${kt})` +
        `&status=in.(SENT,PAID)&order=utgafudagur.desc&limit=20`);
      const sama = inv.find((i) => Math.abs(kr(i.upphaed_total) - kr(d.total_m_vsk)) <= 1);
      if (sama) {
        urelt = 'Drög #' + id + ' fóru út sem reikningur ' + sama.tilvisun + ' (' + krIs(sama.upphaed_total) + ', útg. ' + dags(sama.utgafudagur) + ')' +
          (sama.status === 'PAID' ? ' og hann er greiddur' : '');
        break;
      }
      a.push({ texti: 'Drög #' + id + ' (' + (d.customer_name || '?') + ', ' + krIs(d.total_m_vsk) + ') eru enn ófarin — mælt núna', ok: true });
    }
  }

  // 2. Reikningar sem verkið nefnir — aðeins þeir sem upphæðin í textanum staðfestir
  if (!urelt && reikn.length && upphaedir.length) {
    const nums = reikn.slice(0, 6);
    const [sol, inv] = await Promise.all([
      lesa(`solur?select=num,samtals,paid_at,krafa_sent_at,status&num=in.(${nums.map((n) => 'R-' + String(n).padStart(6, '0')).join(',')})`).catch(() => []),
      lesa(`invoices?select=tilvisun,upphaed_total,status,eindagi,greidsla_date&source=eq.payday&tilvisun=in.(${nums.join(',')})`).catch(() => []),
    ]);
    const fundnir = [];
    for (const s of sol) if (s.status !== 'void' && passar(upphaedir, s.samtals)) fundnir.push({ heiti: s.num, greitt: s.paid_at, kr: s.samtals });
    for (const i of inv) if (passar(upphaedir, i.upphaed_total) && i.status !== 'CANCELLED' && i.status !== 'CREDIT') {
      fundnir.push({ heiti: 'reikningur ' + i.tilvisun, greitt: i.status === 'PAID' ? (i.greidsla_date || true) : null, kr: i.upphaed_total, eindagi: i.eindagi });
    }
    if (fundnir.length && fundnir.every((f) => f.greitt)) {
      urelt = fundnir.map((f) => f.heiti + ' greiddur' + (f.greitt !== true ? ' ' + dags(f.greitt) : '')).join(', ');
    } else {
      for (const f of fundnir.filter((x) => !x.greitt)) {
        const yfir = f.eindagi ? dagarFra(f.eindagi, nu) : null;
        a.push({ texti: f.heiti + ' (' + krIs(f.kr) + ') er enn ógreiddur' + (yfir != null && yfir > 0 ? ', ' + yfir + ' dögum eftir eindaga' : '') + ' — mælt núna', ok: true });
      }
    }
  }

  // 3. Aldur
  const aldur = row.created_at ? dagarFra(row.created_at, nu) : null;
  if (!urelt && aldur != null && aldur >= 3) {
    a.push({ texti: 'Verkið var tekið saman ' + dags(row.created_at) + ' — ' + aldur + ' dagar síðan. Tölur í textanum eru frá þeim degi nema lína hér segi „mælt núna"', ok: true });
  }
  return { a, urelt };
}

module.exports = { athugaFerskleika, tilvisanir, textiVerks };
