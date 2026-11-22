// tekjulidir.cjs — TEKJULIÐIR SLÖKKVITÆKIS (fasi 3, Agnar 22.11.2026: „hafðu þetta aðgengilegt og vel tengt“).
//
//   Aðeins STJÓRNANDI (rola Admin): óinnskráður 401, önnur rola 403 (sama hlið og tekjur-beint / rekstur-yfirlit).
//   GET /api/tekjulidir → { maelt_at, manudir[], flokkar[15]{id,heiti,hopur,man{},samtals,stk?,i_vinnslu,fyrir_yfirtoku,topp[]}, hopar[6], solutegundir[4],
//                           samtals_man{}, samtals, i_vinnslu, fyrir_yfirtoku, heild, heild_solur, stemmir, skilgreining }
//
// Reglurnar (EITT flokkunarfall) búa í _tekjulidir.cjs; mánuðir fylgja „Unnið“ (_unnid-sl.cjs). Lesturinn er sá sami og hjá rekstur-yfirlit.cjs
// (_sl-lestur.cjs). Rekstrarskýrsla Brunahólfs (brunaholf /api/tekjulidir) kallar á þetta fall með köku kallandans (aðeins hub_user).
// Tómur lestur eða bilun = 503 með ástæðu (aldrei tölur sem líta út eins og 0). 7 s tímamörk. Engin nöfn kúnna: línuheiti úr vörulista eða
// textar sem koma fyrir oftar en einu sinni; stakar línur eru ekki sýndar hver fyrir sig.
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const TL = require('./_tekjulidir.cjs');
const { lesaSolugogn } = require('./_sl-lestur.cjs');

async function lesa(nu) {
  const g = await lesaSolugogn({ vorur: true });
  const nuIso = nu.toISOString();
  const r = TL.tekjulidir(g, nuIso);
  return { maelt_at: nuIso, ...r, skilgreining: TL.SKILGREINING, hopar_heiti: TL.HOPAR };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.stjornandi(event);
  if (hver.villa) return hver.villa;
  try {
    return P.json(200, await lesa(new Date()));
  } catch (e) {
    const m = String((e && e.message) || e);
    console.error('[tekjulidir]', m.slice(0, 200));
    // tómur lestur: ástæðan er örugg (engin gögn úr Supabase-svari); annað: almenn villa
    if (/skilaði engu/.test(m)) return P.json(503, { error: 'Tekjuliðir ómældir — ' + m });
    return P.json(503, { error: e && e.name === 'TimeoutError' ? 'Tekjuliðir svöruðu of seint — reyndu aftur' : 'Tekjuliðir náðust ekki — reyndu aftur eftir smá stund' });
  }
};
exports._lesa = lesa;
