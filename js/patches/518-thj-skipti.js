/* === ÞJÓNUSTUSKIPTI (518) — hleðsla ⇄ yfirferð: EIN heimild um hvaða vara á við tæki · 17.11.2026 ===
 *
 * Agnar 17.11.2026: „þegar fólk er að sækja tækin í sótt, þá verð ég að geta svissað á milli hvort það hafi verið
 * hlaðið eða yfirfarið eða ónýtt, settu bara svipað og í ársskoðun".
 *
 * Rofinn býr á tveimur stöðum: í afhendingunni (121 Sótt) og í Verkspjaldinu (430). Báðir þurfa að svara sömu
 * spurningu: „hvaða vara er hin þjónustan fyrir þetta tæki, og hvaða sölulína rukkar fyrir það?" Hér er svarið á
 * einum stað.
 *
 * AF HVERJU EKKI EFTIR HEITI: 430 skipti fyrst orðinu í heitinu („… hleðsla" ⇄ „… yfirferð"). Vörulistinn er ekki
 * samkvæmur sjálfum sér (mælt 17.11.2026): „Léttvatnstækis 6L. hleðsla" á móti „Léttvatnstæki 6L. yfirferð",
 * „CO₂ 5 kg. yfirferd" án ð, „Slökkvitæki 9L léttvatn yfirferð", og eldri verkliðir bera aðeins orðið („yfirferð")
 * með tegund og stærð í eigin dálkum. Því er parað eftir þrennu sem lesin er úr textanum:
 *   fl  = tegund   (duft · co2 · lett · froda)
 *   st  = stærð    („6kg", „6l", „100g")
 *   teg = þjónusta („hleðsla" — líka áfylling — eða „yfirferð")
 * Hrein föll, engin skrif. Eini lesturinn er vörulistinn (flokkur Þjónusta), sóttur einu sinni.
 */
(() => {
  'use strict';
  if (window.ThjSkipti) return;

  const BAKAD = /\s*·\s*[−-]\s*(\d+(?:[.,]\d+)?)\s*%\s*afsl\.?\s*$/i;   // pos.js bakar línuafslátt í heitið
  const lykill = s => String(s || '').replace(BAKAD, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const fl = s => {
    s = String(s || '').toLowerCase();
    return /co2|co₂|kols[ýy]r/.test(s) ? 'co2' : /l[ée]ttvatn/.test(s) ? 'lett' : /fro[ðd]|abf/.test(s) ? 'froda' : /duft|abc/.test(s) ? 'duft' : '';
  };
  const st = s => {
    const m = /(\d+(?:[.,]\d+)?)\s*(kgr|kg|gr|g|ltr|l|ml)(?![a-záðéíóúýþæö])/i.exec(String(s || ''));
    if (!m) return '';
    const e = m[2].toLowerCase();
    return String(+m[1].replace(',', '.')) + (e === 'ml' ? 'ml' : e[0] === 'k' ? 'kg' : e[0] === 'l' ? 'l' : 'g');
  };
  const teg = s => /hle[ðd]sl|[áa]fyll/i.test(String(s || '')) ? 'hleðsla' : /yfirfer[ðd]/i.test(String(s || '')) ? 'yfirferð' : '';
  const lysa = s => ({ fl: fl(s), st: st(s), teg: teg(s) });
  // Tæki (verkliður): þjónustuheitið ræður; vanti tegund eða stærð í það koma þær úr dálkum tækisins.
  const lysaTaeki = (u, nafn) => {
    const d = lysa(nafn != null ? nafn : (u && u.service));
    if (!d.fl) d.fl = fl(u && u.type);
    if (!d.st) d.st = st(u && u.size);
    return d;
  };
  const sama = (a, b) => !!(a && b && a.fl && a.st && a.fl === b.fl && a.st === b.st && a.teg === b.teg);
  const mVsk = p => (+p.verd_an_vsk || 0) * (1 + (p.vsk_prosenta == null ? 24 : +p.vsk_prosenta) / 100);

  let LISTI = null, P = null;
  // Vörulistinn (virkar þjónustuvörur). Samtíma kallarar deila einni sókn; villa er ekki geymd (næsta kall reynir aftur).
  function saekja() {
    if (LISTI) return Promise.resolve(LISTI);
    if (!(window.DB && DB.sb)) return Promise.reject(new Error('engin gagnatenging'));
    if (!P) P = DB.sb.from('vorur').select('id,nafn,flokkur,virkt,verd_an_vsk,vsk_prosenta').then(r => {
      if (r.error) throw r.error;
      LISTI = (r.data || []).filter(p => p.virkt !== false && /þjón/i.test(p.flokkur || ''));
      return LISTI;
    }).catch(e => { P = null; throw e; });
    return P;
  }
  // Varan fyrir tegund + stærð d með þjónustuna t. null = engin slík vara (eða listinn ósóttur).
  const vara = (d, t) => (!LISTI || !d || !d.fl || !d.st || !t) ? null
    : (LISTI.find(p => { const x = lysa(p.nafn); return x.fl === d.fl && x.st === d.st && x.teg === t; }) || null);
  // Varan sem tækið ber núna: nákvæmt heiti fyrst, annars sama þrenna.
  const varaNu = (nafn, d) => !LISTI ? null : (LISTI.find(p => lykill(p.nafn) === lykill(nafn)) || vara(d, d && d.teg));

  // Sölulínan (magn > 0) sem rukkar fyrir þjónustu tækis: nákvæmt heiti fyrst, annars sama þrenna.
  function finnaLinu(linur, nafn, d) {
    const L = linur || [], k = lykill(nafn);
    let i = k ? L.findIndex(l => (+l.qty || 0) > 0 && lykill(l.desc) === k) : -1;
    if (i < 0 && d && d.fl && d.st && d.teg) i = L.findIndex(l => (+l.qty || 0) > 0 && sama(lysa(l.desc), d));
    return i;
  }
  // Færir EINA einingu línu i yfir á vöruna ny, í sama fylki. Lína með magn > 1 klofnar. Línuafsláttur (discount_pct)
  // heldur sér; bakaður afsláttur („· −15% afsl.") fylgir nýja verðinu. Skilar sæti nýju línunnar.
  function skiptaLinu(linur, i, ny) {
    const L = linur[i], bm = BAKAD.exec(L.desc || '');
    const bakad = bm ? Math.max(0, Math.min(100, parseFloat(bm[1].replace(',', '.')) || 0)) : 0;
    const anVsk = +ny.verd_an_vsk || 0;
    const nyL = Object.assign({}, L, {
      qty: 1, desc: String(ny.nafn).trim() + (bm ? bm[0] : ''), product_id: ny.id,
      vsk_pct: ny.vsk_prosenta == null ? 24 : +ny.vsk_prosenta,
      unit_price_ex_vat: bakad ? Math.round(anVsk * (1 - bakad / 100) * 100) / 100 : anVsk
    });
    if ((+L.qty || 1) > 1) { L.qty = (+L.qty) - 1; linur.splice(i + 1, 0, nyL); return i + 1; }
    linur[i] = nyL;
    return i;
  }

  window.ThjSkipti = { BAKAD, lykill, lysa, lysaTaeki, sama, mVsk, saekja, listi: () => LISTI, vara, varaNu, finnaLinu, skiptaLinu };
})();
