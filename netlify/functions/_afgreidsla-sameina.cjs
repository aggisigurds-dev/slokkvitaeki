// _afgreidsla-sameina.cjs — hrein rökfræði nýju afgreidsla-tegundarinnar 'sameina' (Verkefnavaktin, 16.11.2026).
//
// AF HVERJU SÉR MÓDÚL: afgreidsla.cjs dregur inn _portal, hlið, hub-adgangar og _adalmal-claude. Rökfræði
// 'sameina' (athuganir, það sem skjárinn fær, höfnunar-feedback, beiðnin í automation_triggers) er HÉR svo
// hana megi prófa án þeirra módúla og án nets — föllin taka inndælt `lesa` (GET) í stað hnattræns.
//
// Flæðið: vaktin setur verk í `i_yfirferd` og býr til afgreidsla-röð { tegund:'sameina', gogn:{verk_id, grein,
// vefur, lysing, sannprof, skjaskot_url} }. Eining 30 sýnir hana; „Sameina og birta" -> trigger 'verkefna-sameina';
// „Hafna" -> feedback á verkefnalistann og verkið aftur í `beidni`.
'use strict';

const GREIN_RE = /^vakt\/[A-Za-z0-9._\-\/]{1,80}$/;        // aðeins greinar vaktarinnar — aldrei master/main
const HTTPS_RE = /^https:\/\/[^\s"'<>]+$/;                 // skjáskot-slóð verður að vera https (opna í vafra)
const VEFIR = ['slokkvitaeki', 'brunaholf'];

// Hvaða grein merkir hvaða master/main? (til í skilaboðum og triggernum.)
const adalgrein = (vefur) => (vefur === 'brunaholf' ? 'main' : 'master');

// Athuganir keyrðar þegar spjaldið er sýnt OG aftur rétt fyrir framkvæmd. `lesa(qs)` er GET sem skilar fylki.
// Skilar { a:[{texti,ok}], urelt } — urelt þýðir „sýndu þetta ekki lengur / taktu úr röðinni".
async function sameinaAthuganir(gogn, lesa) {
  const g = gogn || {};
  const a = [];
  let urelt = null;
  const grein = String(g.grein || '');
  const vefur = String(g.vefur || '');
  const vid = g.verk_id;
  a.push({ texti: grein ? 'Grein: ' + grein : 'Grein vantar', ok: GREIN_RE.test(grein) });
  a.push({ texti: 'Vefur: ' + (vefur || '?'), ok: VEFIR.includes(vefur) });
  if (vid) {
    const vrows = await lesa(`verkefnalisti?select=status,title&id=eq.${encodeURIComponent(vid)}&limit=1`).catch(() => []);
    const v = vrows && vrows[0];
    if (!v) { a.push({ texti: 'Verkið finnst ekki á Verkefnalistanum', ok: false }); urelt = 'Verkið finnst ekki lengur'; }
    else if (v.status !== 'i_yfirferd') {
      a.push({ texti: 'Verkið er ekki lengur í yfirferð (staða „' + v.status + '")', ok: false });
      urelt = v.status === 'klarad' ? 'Verkið er þegar klárað og sameinað' : 'Verkið er ekki lengur í yfirferð — sæktu borðið aftur';
    } else { a.push({ texti: 'Verkið bíður yfirferðar (í_yfirferð)', ok: true }); }
  } else { a.push({ texti: 'verk_id vantar', ok: false }); urelt = 'verk_id vantar — ekkert að sameina'; }
  // Engin sameining má vera í gangi fyrir sama verk (tvísmellur / tvær vélar).
  if (vid) {
    const trig = await lesa(`automation_triggers?select=id,status&workflow=eq.verkefna-sameina&gogn->>verk_id=eq.${encodeURIComponent(vid)}&status=in.(bida,pending,running)&order=id.desc&limit=1`).catch(() => []);
    if (trig && trig.length) { a.push({ texti: 'Sameining er þegar í gangi fyrir þetta verk', ok: false }); urelt = urelt || 'Sameining er þegar í gangi'; }
  }
  return { a, urelt };
}

// Það sem skjárinn fær af 'sameina'-röð — ekkert úr gögnunum sem skjárinn þarf ekki. Skjáskot aðeins ef https.
function synilegt(gogn) {
  const g = gogn || {};
  const skjaskot = (typeof g.skjaskot_url === 'string' && HTTPS_RE.test(g.skjaskot_url)) ? g.skjaskot_url : null;
  return {
    verk_id: g.verk_id || null,
    grein: String(g.grein || ''),
    vefur: String(g.vefur || ''),
    lysing: String(g.lysing || ''),
    sannprof: String(g.sannprof || ''),
    skjaskot_url: skjaskot,
    verk_slod: g.verk_id ? { url: 'https://brunaholf.netlify.app/verkefnalisti.html', texti: 'Verkið á Verkefnalistanum' } : null,
  };
}

// Beiðnin sem „Sameina og birta" skrifar í automation_triggers.
function triggerBody(gogn, hver, afgreidslaId) {
  const g = gogn || {};
  return { workflow: 'verkefna-sameina', status: 'bida', requested_by: ('afgreidsla:' + (hver || '?')).slice(0, 120),
    gogn: { verk_id: g.verk_id, grein: g.grein, vefur: g.vefur, afgreidsla_id: afgreidslaId || null } };
}

// Höfnun: athugasemd Agnars bætist (tímastimpluð) við feedback verksins og verkið fer aftur í `beidni` (assigned_agent
// áfram 'vakt' svo vaktin taki það aftur og lesi feedback fyrst). Skilar { feedback, patch } — patch er það sem fer á röðina.
function hafnaFeedback(cur, athugasemd, hver, nu) {
  const d = nu instanceof Date ? nu : new Date();
  const stamp = d.toISOString().slice(0, 16).replace('T', ' ');
  const ath = String(athugasemd || '').trim() || '(engin athugasemd)';
  const line = '[' + stamp + '] Hafnað á borðinu (' + (hver || '?') + '): ' + ath;
  const feedback = ((cur && cur.feedback) ? cur.feedback + '\n' : '') + line;
  return { feedback, patch: { feedback, status: 'beidni', assigned_agent: 'vakt' } };
}

module.exports = { sameinaAthuganir, synilegt, triggerBody, hafnaFeedback, adalgrein, GREIN_RE, HTTPS_RE, VEFIR };
