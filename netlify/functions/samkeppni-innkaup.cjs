// samkeppni-innkaup.cjs — verðin sem við höfum borgað birgjum, fyrir flipann „Samkeppnisaðilar – Vörur" í Birgðum (510).
//
//   GET /api/samkeppni-innkaup  →  { innkaup: { sott, linur[], ekki_lesid[] } | null, updated_at }
//
// Gögnin (línur af birgjareikningum: birgir, reikningur, dags, listaverð, afsláttur, nettó á stykki) liggja í `app_kv` undir
// lyklinum `samkeppni_innkaup`. Taflan er með RLS og engar reglur, svo AÐEINS þetta fall les hana, með þjónustulyklinum, á
// bak við starfsmannahliðið. Ástæðan: GitHub-repóið er OPIÐ og kostnaðarverð og afslættir birgja eiga ekki að vera í skrá þar.
// Aðeins lestur — fallið skrifar ekkert.

const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');

const LYKILL = 'samkeppni_innkaup';

// Línurnar eru geymdar með stuttum lyklum (s=seljandi, r=reikningur, d=dags, n=vörunr., l=lýsing, m=magn, p=listaverð án VSK,
// a=afsláttur %, v=nettó á stykki án VSK, i=Drive-skrá, o=vara hjá okkur, c=athugasemd); flipinn fær læsilegu nöfnin.
const utvikka = (v) => (!v || !Array.isArray(v.linur) ? v : {
  ...v,
  linur: v.linur.map((l) => (l.seljandi ? l : {
    seljandi: l.s, reikningur: l.r, dags: l.d, vorunr: l.n, lysing: l.l, magn: l.m, lista_an_vsk: l.p, afslattur_pct: l.a,
    netto_eining_an_vsk: l.v, drive_id: l.i || null, okkar_id: l.o == null ? null : l.o, athugasemd: l.c || '',
  })),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.starfsmadur(event);
  if (hver.villa) return hver.villa;
  try {
    const r = await fetch(`${P.SUPABASE_URL}/rest/v1/app_kv?key=eq.${LYKILL}&select=value,updated_at`, {
      headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` },
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 160)}`);
    const rows = t ? JSON.parse(t) : [];
    const rad = rows && rows[0];
    return P.json(200, { innkaup: rad ? utvikka(rad.value) : null, updated_at: rad ? rad.updated_at : null });
  } catch (e) {
    console.error('[samkeppni-innkaup]', e);
    return P.json(502, { error: 'Náði ekki í innkaupagögn: ' + (e && e.message ? e.message : String(e)) });
  }
};
