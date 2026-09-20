/* === KÚNNALEIT ÚR PÓSTI (381) ================================================
 *
 * Agnar 19.09.2026: „Samt ekkert adstodar tarna ad finna reikninginn"
 *
 * MÆLT áður en nokkuð var byggt, á 17 raunverulegum reikningsbeiðnum:
 *
 *     gamla tengingin í 240   ->  5 af 17 fundu kúnna
 *     samskiptanetið          ->  4 af 22 (tengir eftir NÁKVÆMU netfangi, 'single')
 *
 * Hvorugt dugði, svo „enginn kúnni fannst" stóð á nær hverri röð og ✉️ Senda
 * birtist ekki. Þá er ekki hægt að senda reikninginn — sem var allt erindið.
 *
 * Þrjár reglur bætast við, og MÆLD útkoma er 5 -> 13 af 17:
 *
 *   NAFN (6)     Nafn fyrirtækisins stendur í efninu eða textanum.
 *                „Ósk um afrit af tveimur reikningum – Véltindar ehf."
 *                Félagsorð (ehf/hf/húsfélagið …) eru strípuð og krafist er 6+
 *                stafa, svo „hf" eitt og sér para ekki við hálft skráarsafnið.
 *
 *   ÞRÁÐUR (1)   Auðkennið er í FYRSTA póstinum, ekki svarinu.
 *                „Re: Árskógar 6-8, húsfélag / vantar reikning" ber enga
 *                kennitölu — en upphaflegi pósturinn gerir það. Þráðurinn erfir.
 *
 *   LÉN (1)      Sendandalénið á sér EINN kúnna. gudbjorg@bustravel.is -> …
 *                Aðeins þegar lénið er einkvæmt; gmail/hotmail/outlook/simnet
 *                o.þ.h. eru undanskilin, annars pöruðust óskyldir kúnnar saman.
 *
 * Þeir fjórir sem eftir standa EIGA að standa: Würth og Hringdu eru reikningar
 * TIL OKKAR (ekki beiðni um okkar reikning) og einn Gmail-póstur ber ekkert
 * auðkenni. Að para þá við kúnna væri ágiskun.
 *
 * Af hverju sér skrá en ekki inni í 240: Agnar 19.09.2026 — „Þessi sida er
 * svoldid gömul. Kom adurven vidvsettum upp þjonustubordid og samskiptanetid".
 * Leitin er því sjálfstæð og kallanleg hvaðan sem er; 240 notar hana sem
 * fallbakka og nýrri fletir geta gert það líka án þess að afrita regluna.
 *
 * Opinbert API:
 *   KunnaLeit.finna(postur, allirPostar)  -> { nafn, kt, coId, hvernig } | null
 *   KunnaLeit.hladid()                    -> satt þegar uppflettingin er til
 * ========================================================================== */
(() => {
  if (typeof window === 'undefined') return;
  if (window.__kunnaLeitInstalled) return;
  window.__kunnaLeitInstalled = true;

  const sb = () => (window.DB && window.DB.sb) || null;

  // Lén sem margir ótengdir kúnnar deila — þau mega ALDREI para.
  const ALMENN_LEN = /^(gmail|hotmail|outlook|live|yahoo|icloud|me|simnet|internet|visir|mac)\./i;
  // Félagsorð strípuð úr nafni áður en leitað er í texta.
  const FELAGSORD = /\b(ehf|hf|slf|sf|ses|ohf|bs|húsfélagið|husfelagid|húsfélag|husfelag|hússjóður|hussjodur)\b\.?/g;
  const MIN_NAFN = 6;

  let _g = null;        // { byKt, byMail, byDom, nofn, bySale }
  let _bid = null;

  const ktD = s => String(s || '').replace(/\D/g, '');
  const hey = m => ((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toLowerCase();
  const thrad = s => String(s || '').toLowerCase()
    .replace(/^((re|sv|svar|fw|fwd|áfram|aframsending)\s*:\s*)+/g, '').replace(/\s+/g, ' ').trim();

  async function hlada() {
    if (_g) return _g;
    if (_bid) return _bid;
    _bid = (async () => {
      const c = sb();
      if (!c) throw new Error('Engin tenging við gagnagrunn');
      // 19.09.2026 — HÉR STÓÐ `.limit(5000)` OG `.limit(4000)`. audit-pagination
      // greip það: PostgREST sker í 1000 og SEGIR EKKI FRÁ. Uppflettingin hefði
      // því verið byggð á broti af skránni og leitin sagt „enginn kúnni" um
      // fyrirtæki sem eru til — nákvæmlega sú þögla bilun sem ég var að laga.
      // DB.fetchAll blaðsíðuflettir; `.order` á einkvæman dálk er skilyrði.
      const asRes = p => p.then(data => ({ data, error: null }), error => ({ data: null, error }));
      const [fy, sl] = await Promise.all([
        asRes(window.DB.fetchAll((from, to) => c.from('fyrirtaeki')
          .select('id,nafn,kennitala,netfang,er_i_thjonustu').is('deleted_at', null).order('id').range(from, to))),
        asRes(window.DB.fetchAll((from, to) => c.from('solur')
          .select('num,customer_nafn,customer_kt,customer_base_id').order('id').range(from, to))),
      ]);
      // Óskoðaður lestur er verri en óskoðað skrif: brygðist þetta og við létum
      // `data: null` líða hjá myndi leitin þegja og segja „enginn kúnni" um alla.
      if (fy.error) throw fy.error;
      if (sl.error) throw sl.error;

      const byKt = {}, byMail = {}, domTal = {}, nofn = [], bySale = {};
      (fy.data || []).forEach(x => {
        const rec = { nafn: x.nafn, kt: x.kennitala, coId: x.id, iThjonustu: x.er_i_thjonustu === true };
        const k = ktD(x.kennitala);
        if (k.length === 10 && !byKt[k]) byKt[k] = rec;
        const e = String(x.netfang || '').toLowerCase().trim();
        if (e) {
          // 20.09.2026 — FÉLAG Í ÞJÓNUSTU GENGUR FYRIR Á SAMA NETFANGI.
          // Hótel Hjarðarból á tvö félög með info@hjardarbol.is: #578 utan
          // þjónustu með eina skýrslu frá 2024, og #697 í þjónustu með 15 tæki,
          // skýrslu 2026 og reikninginn. Fyrsti-vinnur greip #578 og glugginn bauð
          // því ekki skýrsluna sem kúnninn var að biðja um. Þar sem tækin og
          // skjölin liggja er nánast alltaf félagið sem átt er við.
          if (!byMail[e] || (rec.iThjonustu && !byMail[e].iThjonustu)) byMail[e] = rec;
          const d = e.split('@')[1];
          if (d && !ALMENN_LEN.test(d)) (domTal[d] = domTal[d] || []).push(rec);
        }
        const leit = String(x.nafn || '').toLowerCase().replace(FELAGSORD, '').replace(/\s+/g, ' ').trim();
        if (leit.length >= MIN_NAFN) nofn.push({ leit, rec });
      });
      // Aðeins EINKVÆM lén para. Deili tvö félög léni segir það ekkert.
      const byDom = {};
      Object.keys(domTal).forEach(d => { if (domTal[d].length === 1) byDom[d] = domTal[d][0]; });
      // Lengstu nöfnin fyrst: „Vélrás Sléttuhraun" á að vinna yfir „Vélrás".
      nofn.sort((a, b) => b.leit.length - a.leit.length);
      (sl.data || []).forEach(s => { if (s.num) bySale[String(s.num).toUpperCase()] = s; });

      _g = { byKt, byMail, byDom, nofn, bySale };
      return _g;
    })();
    try { return await _bid; } finally { _bid = null; }
  }

  // Bein merki í EINUM pósti — sömu þrjú og 240 notar, endurtekin hér svo
  // þráðar-reglan geti spurt um systkini án þess að kalla aftur í 240.
  // 19.09.2026 — VIÐ ERUM ALDREI KÚNNINN. Póstur sem svarar reikningi frá okkur
  // ber OKKAR kennitölu, svo kennitölu-reglan paraði hann við okkur sjálf og leitaði
  // svo að reikningum á Brunahólf. Mælt á hjalti@skeljungur.is: skilaði
  // „Brunahólf Slökkvitæki ehf." þótt Skeljungur sé skráður með nákvæmlega hans
  // netfang og eigi tvo reikninga. Þetta beið í hverju einasta svari við reikningi.
  const OKKAR_KT = ['6005080400', '5204172300'];
  const erOkkar = (c) => !!c && OKKAR_KT.indexOf(String(c.kt || c.kennitala || '').replace(/\D/g, '')) >= 0;

  function beint(g, m) {
    const h = hey(m);
    // SENDANDINN Á UNDAN KENNITÖLU Í TEXTA. Netfang sendandans er sterkari
    // vísbending en tala sem vitnað er í inni í pósti — hún getur verið okkar,
    // bankans eða þriðja aðila sem nefndur er í þræðinum.
    const e = String(m.sender_email || '').toLowerCase().trim();
    if (e && g.byMail[e] && !erOkkar(g.byMail[e])) return { ...g.byMail[e], hvernig: 'netfang' };
    const km = h.match(/\b(\d{6})-?(\d{4})\b/);
    if (km && g.byKt[km[1] + km[2]] && !erOkkar(g.byKt[km[1] + km[2]])) return { ...g.byKt[km[1] + km[2]], hvernig: 'kennitala' };
    const rm = h.match(/\br-0\d{5}\b/i);
    if (rm) {
      const s = g.bySale[rm[0].toUpperCase()];
      if (s) {
        const k = ktD(s.customer_kt);
        const c = (k && g.byKt[k]) || { nafn: s.customer_nafn, kt: s.customer_kt, coId: null };
        return { ...c, hvernig: 'reikningur' };
      }
    }
    return null;
  }

  function finna(m, allir) {
    if (!_g || !m) return null;
    const g = _g;

    const b = beint(g, m);
    if (b) return b;

    // NAFN — lengstu nöfnin fyrst (sjá röðun að ofan).
    const h = hey(m);
    const hit = g.nofn.find(x => h.indexOf(x.leit) >= 0);
    if (hit && !erOkkar(hit.rec)) return { ...hit.rec, hvernig: 'nafn' };

    // LÉN — aðeins einkvæmt.
    const d = String(m.sender_email || '').toLowerCase().split('@')[1];
    if (d && g.byDom[d] && !erOkkar(g.byDom[d])) return { ...g.byDom[d], hvernig: 'lén' };

    // ÞRÁÐUR — erfa auðkenni úr systkini í sama þræði.
    if (Array.isArray(allir) && allir.length) {
      const t = thrad(m.subject);
      if (t) {
        for (const x of allir) {
          if (x === m || thrad(x.subject) !== t) continue;
          const s = beint(g, x);
          if (s) return { ...s, hvernig: 'þráður (' + s.hvernig + ')' };
        }
      }
    }
    return null;
  }

  // Hlaða snemma svo fyrsta teikning 240 hafi uppflettinguna. `DB.sb` verður til
  // á DOMContentLoaded — beðið eins og annars staðar í þessu appi.
  let _bidDB = 0;
  let _vakti = false;
  function raesa() {
    if (!sb()) { if (++_bidDB <= 50) setTimeout(raesa, 300); return; }
    hlada().then(() => {
      // 19.09.2026 — KAPPHLAUP, mælt: blaðsíðuflettingin (sem kom í stað hins
      // ranga .limit(5000)) er hægari, svo 240 var búið að flokka póstinn ÁÐUR en
      // uppflettingin var til. `KunnaLeit.hladid()` var þá ósatt í classify og
      // nýju leiðirnar duttu allar út — „enginn kúnni" fór úr 38 í 71 og
      // ✉️ Senda úr 53 í 24. Listinn er því vakinn EINU SINNI þegar leitin er
      // tilbúin. Einu sinni: annars vekur endurlesturinn sjálfan sig.
      // 19.09.2026, mælt á tæki Agnars: hér stóð `_vakti = true` ÁÐUR en athugað
      // var hvort 240 væri til. Væri það ekki komið brann eina skotið og listinn
      // var aldrei vakinn — hann sat með „enginn kúnni fannst" þótt leitin fyndi
      // Reykjavíkurborg (nafn) og Gára ehf. (lén) fyrir sömu póstana. Flaggið er
      // nú sett EFTIR að vakningin hefur raunverulega gerst, og beðið í allt að
      // 15 sek eftir 240.
      let n = 0;
      const vekja = () => {
        if (_vakti) return;
        const RP = window.ReikningaPostur;
        if (!RP || typeof RP.reload !== 'function') {
          if (++n <= 50) setTimeout(vekja, 300);
          return;
        }
        _vakti = true;
        try { RP.reload(); } catch (_) {}
      };
      vekja();
    }).catch(e => {
      if (window.console) console.warn('[381-kunnaleit] uppfletting brást:', (e && e.message) || e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', raesa);
  else raesa();

  window.KunnaLeit = {
    finna,
    hladid: () => !!_g,
    hlada,
  };
})();
