// vinnusamantekt-saga.cjs — dagleg saga mælinganna í Vinnusamantekt (489), svo mælarnir sýni hvort tala fer upp eða niður.
//
// Agnar 18.11.2026: „hafa líka þarna í kössunum nýtt í dag hvort talan fer upp eða niður“.
//
// HVERS VEGNA FALL: mælingarnar eru reiknaðar í vafranum (29 mæliföll í 489) og áttu enga sögu — hver heimsókn sá aðeins
// töluna núna. Vafrinn sendir því tölur dagsins hingað eftir hverja mælingu; taflan `vinnusamantekt_saga` geymir EINA röð á
// mælingu á dag (fyrsta gildi dagsins + það nýjasta). Taflan er RLS-læst án reglna, svo aðeins þetta fall (þjónustuhlutverk)
// les og skrifar, og það krefst innskráningar STJÓRNANDA (_starfshlid.cjs, sama regla og tekjur-beint).
//
//   GET  /api/vinnusamantekt-saga                       → { ok, i_dag, fyrri: { <maeling>: { gildi, dags } }, fyrst: { <maeling>: gildi } }
//   POST /api/vinnusamantekt-saga { maelingar: [{ id, gildi, tala, sev }] } → skráir tölur dagsins, skilar sama og GET (+ skrad)
//
//   fyrri = nýjasta röð FYRIR daginn í dag (í gær, eða síðasti dagur sem borðið var opið, mest 21 dag aftur)
//   fyrst = fyrsta gildi dagsins í dag — viðmið fyrsta daginn, áður en nokkur fyrri dagur er til
// Dagurinn er UTC: Ísland er á UTC allt árið (sama regla og í 489).
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');

const ID_RE = /^[a-z0-9_:-]{1,60}$/;
const SEV = ['alv', 'athuga', 'ok', 'upp', 'oma'];
const HAMARK = 80;          // mælingarnar eru um 30; þak svo beiðni geti ekki fyllt töfluna
const DAGAR_AFTUR = 21;

const dagsUtc = (d) => (d || new Date()).toISOString().slice(0, 10);

// Það sem vafrinn sendir er ótraust: aðeins þekkt auðkennisform, endanleg tala, hver mæling einu sinni.
function hreinsa(listi) {
  const ut = [], sed = new Set();
  for (const x of Array.isArray(listi) ? listi.slice(0, HAMARK * 3) : []) {
    if (!x || typeof x !== 'object') continue;
    const id = String(x.id == null ? '' : x.id);
    const g = typeof x.gildi === 'number' ? x.gildi : NaN;
    if (!ID_RE.test(id) || !Number.isFinite(g) || Math.abs(g) > 1e13 || sed.has(id)) continue;
    sed.add(id);
    ut.push({ id, gildi: Math.round(g * 1000) / 1000, tala: String(x.tala == null ? '' : x.tala).slice(0, 80), sev: SEV.includes(x.sev) ? x.sev : '' });
    if (ut.length >= HAMARK) break;
  }
  return ut;
}

// Viðmiðin úr röðunum: nýjasta röð fyrri daga á hverja mælingu, og fyrsta gildi dagsins í dag.
function vidmid(rodir, iDag) {
  const fyrri = {}, fyrst = {};
  for (const r of Array.isArray(rodir) ? rodir : []) {
    if (!r || !r.maeling || !r.dags) continue;
    const d = String(r.dags).slice(0, 10);
    if (d === iDag) { const f = Number(r.fyrst_gildi); if (Number.isFinite(f)) fyrst[r.maeling] = f; continue; }
    const g = Number(r.gildi);
    if (d < iDag && Number.isFinite(g) && (!fyrri[r.maeling] || d > fyrri[r.maeling].dags)) fyrri[r.maeling] = { gildi: g, dags: d };
  }
  return { fyrri, fyrst };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });
  // Aðeins STJÓRNANDI: Vinnusamantektin sést aðeins á borði Agnars, og sagan stýrir örvunum sem hann les. Annar
  // innskráður notandi á hvorki að lesa tölurnar né geta skrifað gildi inn í þær (rýni 18.11.2026).
  const g = (await H.stjornandi(event)).villa;
  if (g) return g;
  const iDag = dagsUtc();
  try {
    let skrad = null;
    if (event.httpMethod === 'POST') {
      let b;
      try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
      const l = hreinsa(b && b.maelingar);
      if (!l.length) return P.json(400, { error: 'Engar gildar mælingar' });
      const w = await P.sbPost('rpc/vs_saga_skra', { p_dags: iDag, p_maelingar: l });
      if (!w.ok) throw new Error('Supabase ' + w.status + ': ' + (await w.text()).slice(0, 160));
      skrad = l.length;
    }
    const fra = dagsUtc(new Date(Date.now() - DAGAR_AFTUR * 864e5));
    const r = await P.sbGet('vinnusamantekt_saga?select=dags,maeling,gildi,fyrst_gildi&dags=gte.' + fra + '&order=dags.desc&limit=3000');
    if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()).slice(0, 160));
    const v = vidmid(await r.json(), iDag);
    return P.json(200, { ok: true, i_dag: iDag, skrad, fyrri: v.fyrri, fyrst: v.fyrst });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e).slice(0, 200) });
  }
};
module.exports._hreinsa = hreinsa;
module.exports._vidmid = vidmid;
module.exports._dagsUtc = dagsUtc;
