// _gatt-serkjor.cjs — Akstur og Skýrslugerð í „Sérkjör og verðskrá" (Þjónustuvefurinn, gatt.cjs).
//
// Agnar 09.11.2026: „hafa alment samkvæmt verðskrá, nema þegar samið er um annað". Verðskráin er listinn „Slökkvit. þjónusta — verð"
// í appinu (patch 410); Akstur og Skýrslugerð þar búa í app_settings.slokk_visit_defaults og eru SAMA heimild og úttektarskoðunin (129),
// reikningsleiðin (165) og viðbótarúttektin (488) lesa. Áður las gáttin þær af vorur-línunum „Akstur" og „Skýrslugerð og vottun."
// (3.500 / 3.500) en úttektin rukkaði 3.600 / 5.600 — kúnninn sá annað verð en reikningurinn.
//
// Hér er aðeins listaverðið (og heitið) ákveðið. Samningsverð kúnnans (portal_users.stillingar.serkjor.akstur / .skyrsla) og flatur
// afsláttur (.pct) leggjast ofan á í gatt.cjs eins og áður: „samið um annað" gengur áfram, og kúnninn borgar aldrei meira en listaverð.
// vorur-línurnar eru enn notaðar til að finna vara_id og vsk-hlutfall (ef þær eru til) — verðið og heitið koma ekki lengur þaðan.
//
// SVD_KODI er sama sjálfgildi og `SlokkVisitDefaults` í 129 og `SVD_KODI` í 410 (það sem gildir þegar ekkert er vistað á þjóni);
// tools/test-gatt-serkjor.cjs ber þau saman svo þau fari ekki í sundur.
'use strict';

const SVD_KODI = { akstur: 3600, skyrslugerd: 5600 };
const SVD_HEITI = { akstur: 'Akstur', skyrslugerd: 'Skýrslugerð' };

function tala(v, kodi) {
  if (v === null || v === undefined || v === '') return kodi;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : kodi;
}
function heiti(v, kodi) {
  const t = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return t || kodi;
}

// svd = app_settings.settings.slokk_visit_defaults (eða undefined) · vorur = línur úr vorur (id, nafn, vsk_prosenta, flokkur)
// Skilar [{ flokkur: 'skyrsla' | 'akstur', v: { id, nafn, verd_an_vsk, vsk_prosenta, flokkur } }] — v er í sama formi og vorur-röð
// svo `baeta()` / `kjorVerd()` í gatt.cjs vinni með það óbreytt.
function aksturSkyrsla(svd, vorur) {
  const s = svd && typeof svd === 'object' ? svd : {};
  const finna = (re) => (vorur || []).filter((x) => x && x.flokkur === 'Vinna og akstur' && re.test(String(x.nafn || '').trim()))[0] || null;
  return [['skyrsla', 'skyrslugerd', /^Skýrslugerð/i], ['akstur', 'akstur', /^Akstur$/i]].map(([flokkur, lykill, re]) => {
    const m = finna(re);
    return {
      flokkur,
      v: {
        id: m ? m.id : null,
        nafn: heiti(s[lykill + '_heiti'], SVD_HEITI[lykill]),
        verd_an_vsk: tala(s[lykill], SVD_KODI[lykill]),
        vsk_prosenta: (m && Number(m.vsk_prosenta)) || 24,
        flokkur: 'Vinna og akstur',
      },
    };
  });
}

module.exports = { aksturSkyrsla, SVD_KODI, SVD_HEITI };
