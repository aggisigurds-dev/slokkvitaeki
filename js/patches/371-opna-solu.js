/* 371 — 🧾 OPNA SÖLU: eitt hjálparfall fyrir öll borð og lista (11.09.2026)
 *
 *   window.OpnaSolu.opna(solurId)  →  Promise<{ ok, id, num, tegund, astaeda }>
 *     tegund: 'drog' | 'lokud' | 'ogild' | 'kredit'  (null ef salan fannst ekki)
 *     Kastar aldrei — villur fara í Toast og `astaeda` segir hvað gerðist.
 *
 * Fyrsti kallandinn er Þjónustuborð 2 (#bord, 368/369): röð sem á sölu → opna(id).
 *
 * HVERT FER SALAN — kannað í kóðanum, ekki ágiskað:
 *   • Sölu-ritillinn (142, SaleEditor.openById) er EINA leiðin til að halda áfram með drög
 *     og klára þau: „✅ Klára sölu" setur status 'final' á SÖMU röð, sama númer. Lokaðar
 *     sölur og kreditreikninga sýnir hann læsta (🔒) — það er sölu-sýnin. Drög (143),
 *     Bókhald (11), Hreyfingarlisti (167), Yfirferð greiðslna (193), Reikninga-póstur (240),
 *     Brunakerfi (291) og kröfuglugginn (369) opna sölu svona, ofan á síðunni sem er opin.
 *     Við gerum eins: borðið helst undir og notandinn er kominn þangað aftur við lokun.
 *   • Söluborðið (pos.js) getur ekki tekið drög aftur inn: showReceipt() er lokað inni og
 *     prentar kvittun með deginum í dag, og körfu-hleðsla 352 kemur úr Drög-stöð hubbsins —
 *     afgreiðsla þaðan býr til NÝJA sölu með nýju númeri. POS-karfan er aldrei snert hér.
 *   • #sale/<num> (235) opnar prentútgáfu í sprettiglugga, ekki staðinn sem afgreiðir söluna.
 *
 * ÖRYGGI
 *   • Opnun SKRIFAR EKKERT: ein SELECT hér (+ ein fyrir númer kreditsins), ein í 142.
 *     Ritillinn skrifar aðeins þegar notandinn ýtir sjálfur á Vista eða Klára.
 *   • Ritillinn er einn og buildDialog() fjarlægir opinn glugga ÞEGJANDI — óvistaðar línur og
 *     athugasemdir myndu glatast. Sé hann opinn neitum við og segjum hvers vegna.
 *   • Hleðst 142 ekki: sá listi sem geymir söluna (Drög / Bókhald), númerið sett í leitina.
 */
(() => {
  if (window.__opnaSolu) return;
  window.__opnaSolu = true;

  const sb = () => (window.DB && DB.sb) || null;
  let _iGangi = null;             // id sem er verið að sækja — tvísmellur opnar ekki tvisvar

  function toast(t) {
    try { if (window.Toast && Toast.show && document.getElementById('toast')) { Toast.show(t); return; } } catch (_) {}
    alert(t);                     // #toast vantar (önnur síða) — samt aldrei þögult
  }
  const bilun = (id, astaeda, s, tegund) =>
    ({ ok: false, id: id == null ? null : id, num: (s && s.num) || null, tegund: tegund || null, astaeda });

  // Sama regla og 142 isDraft() — lesin þaðan þegar hún er til svo reglurnar reki ekki í sundur.
  function tegundAf(s) {
    if (s.is_credit) return 'kredit';
    let drog = null;
    try { if (window.SaleEditor && typeof SaleEditor.isDraft === 'function') drog = !!SaleEditor.isDraft(s); } catch (_) {}
    if (drog == null) drog = s.status !== 'final' && !s.paid_at && (s.status === 'drog' || !s.status);
    if (drog) return 'drog';
    return s.status === 'void' ? 'ogild' : 'lokud';
  }

  // Sölunúmerið í opnum ritli, lesið úr hausnum („✏️ Breyta sölu · R-000923").
  function opinnRitill() {
    const d = document.getElementById('_se-dlg');
    if (!d) return null;
    const h = d.querySelector('h2');
    const m = /·\s*([^\s<]+)/.exec(h ? h.textContent : '');
    return { num: m ? m[1] : '' };
  }

  // Stutt skýring þegar eitthvað sést ekki strax í ritlinum (kredit, bakfærð, eydd/falin).
  async function skyring(c, s, tegund) {
    const n = s.num || ('#' + s.id);
    if (tegund === 'kredit') {
      let af = '';
      if (s.credit_of) {
        try { const r = await c.from('solur').select('num').eq('id', s.credit_of).maybeSingle(); af = (r && r.data && r.data.num) || ''; } catch (_) {}
      }
      return '↩ Kreditreikningur ' + n + (af ? ' · bakfærir ' + af : '') + ' — til skoðunar, ekki hægt að breyta';
    }
    if (tegund === 'ogild') return '↩ ' + n + ' er bakfærð (void) — til skoðunar, ekki hægt að breyta';
    if (s.hidden) {
      return tegund === 'drog'
        ? '🗑 ' + n + ' er merkt eydd — sést aðeins með „Sýna eydd“ á Drög-listanum'
        : '🙈 ' + n + ' er falin úr Bókhaldi';
    }
    return '';
  }

  // Varaleið ef 142 hlóðst ekki: listinn sem geymir söluna, númerið sett í leitarreitinn
  // (143 #_drog-q og 11 #by-search hlusta báðir á 'input'; hvorugur geymir leitina).
  function varaleid(s, tegund) {
    const drog = tegund === 'drog';
    const n = s.num || ('#' + s.id);
    // Bókhald (11) sækir hvorki bakfærðar né faldar sölur (.neq void / hidden) — ekki benda þangað.
    if (!drog && (tegund === 'ogild' || s.hidden)) {
      toast('⚠ Sölu-ritillinn hlóðst ekki og ' + n + ' er ' + (tegund === 'ogild' ? 'bakfærð' : 'falin') +
        ' (sést ekki í Bókhaldi) — endurhladdu síðuna og reyndu aftur');
      return bilun(s.id, 'ritill-vantar', s, tegund);
    }
    try { if (window.App && App.switchView) App.switchView(drog ? 'drog' : 'bokhalds-yfirlit'); } catch (_) {}
    let k = 0;
    const t = setInterval(() => {
      const inp = document.getElementById(drog ? '_drog-q' : 'by-search');
      if (!inp && ++k < 20) return;
      clearInterval(t);
      if (inp && s.num) { inp.value = s.num; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 150);
    toast('⚠ Sölu-ritillinn hlóðst ekki — leitaðu að ' + n + (drog
      ? ' á Drög-listanum' + (s.hidden ? ' (haka í „Sýna eydd“)' : '')
      : ' í Bókhalds yfirliti (víkkaðu dagsetningabilið ef hún sést ekki)'));
    return bilun(s.id, 'ritill-vantar', s, tegund);
  }

  async function opnaInnra(solurId) {
    const id = Number(solurId);
    if (!Number.isInteger(id) || id <= 0) {
      toast('⚠ Ógilt sölu-auðkenni (' + String(solurId) + ') — ekkert opnað');
      return bilun(null, 'ogilt-id');
    }
    if (_iGangi === id) return bilun(id, 'i-gangi');
    const c = sb();
    if (!c) { toast('⚠ Engin gagnabankatenging enn — reyndu aftur eftir augnablik'); return bilun(id, 'engin-tenging'); }

    _iGangi = id;
    try {
      // Fersk lesning — borðið getur verið margra mínútna gamalt.
      let r;
      try {
        r = await c.from('solur').select('id,num,status,greitt_med,starfsmadur,customer_nafn,samtals,paid_at,is_credit,credit_of,hidden').eq('id', id).maybeSingle();
      } catch (e) { r = { error: e }; }
      if (r.error) { toast('⚠ Náði ekki í sölu #' + id + ': ' + (r.error.message || r.error)); return bilun(id, 'villa'); }
      const s = r.data;
      if (!s) { toast('⚠ Sala #' + id + ' fannst ekki — henni gæti hafa verið eytt'); return bilun(id, 'fannst-ekki'); }

      const tegund = tegundAf(s);
      const n = s.num || ('#' + s.id);
      if (!window.SaleEditor || typeof SaleEditor.openById !== 'function') return varaleid(s, tegund);

      const opinn = opinnRitill();
      if (opinn) {
        if (opinn.num && opinn.num === s.num) {
          toast(n + ' er þegar opin í sölu-ritlinum');
          return { ok: true, id: s.id, num: s.num || null, tegund, astaeda: 'thegar-opin' };
        }
        toast('⚠ Sölu-ritillinn er opinn' + (opinn.num ? ' með ' + opinn.num : '') + ' — lokaðu honum fyrst svo óvistaðar breytingar glatist ekki');
        return bilun(s.id, 'ritill-opinn', s, tegund);
      }

      await SaleEditor.openById(s.id);
      if (!document.getElementById('_se-dlg')) {
        toast('⚠ Sölu-ritillinn opnaðist ekki fyrir ' + n);
        return bilun(s.id, 'ritill-opnadist-ekki', s, tegund);
      }
      const sk = await skyring(c, s, tegund);
      if (sk) toast(sk);
      return { ok: true, id: s.id, num: s.num || null, tegund, astaeda: '' };
    } finally {
      _iGangi = null;
    }
  }

  async function opna(solurId) {
    try { return await opnaInnra(solurId); }
    catch (e) { toast('⚠ Salan opnaðist ekki: ' + ((e && e.message) || e)); return bilun(null, 'villa'); }
  }

  window.OpnaSolu = { opna, version: '371a' };
  console.log('[371-opna-solu] installed');
})();
