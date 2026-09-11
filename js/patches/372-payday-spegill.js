/* 372 — Payday-spegill: „uppfæra núna" (Agnar 11.09.2026)
 *
 * „það vantar síðan refresh á payday.. það er ekkert í draft núna. ég sendi allar áðan, en næ ekki að
 *  refresha hérna,, hérna er ennþá 13 í drafts"
 *
 * Staða reikninga í appinu (drög / send / greitt) er lesin úr speglinum payday_invoices_slokk, sem
 * payday-sync-cron uppfærði AÐEINS kl. 10 og 15. 🔄 í Kröfuyfirliti keyrði payday-sync-paid, sem merkir
 * greiðslur en snertir ekki spegilinn — svo send drög sátu áfram sem „Drög" til næstu keyrslu.
 * Mælt 11.09.2026: POST /api/payday-pull-slokk = 4,3 s, 279 reikningar; drögin fóru úr 13 í 1.
 *
 * API: window.PaydaySpegill = { uppfaera({ afl }), sidast(), version }
 *   • uppfaera() deilir einni keyrslu milli allra sem kalla samtímis og keyrir ekki aftur innan 60 s
 *     nema afl: true (handvirkur takki). Skilar { ok, upserted, fetched } eða { ok: false, villa }.
 *   • Telst aðeins hafa tekist ef fallið svarar ok OG spegillinn er lesinn til baka (nýjasta updated_at
 *     frá því keyrslan hófst, 2 mín vikmörk fyrir klukkuskekkju vélar og þjóns).
 *   • Tókst → atburðurinn 'payday-spegill' á window, svo borð (368/369) geti sótt aftur.
 * Skrifar hvorki sölur né kröfur; sama POST og cron-keyrslan.
 */
(() => {
  if (window.__paydaySpegill372) return;
  window.__paydaySpegill372 = true;

  const BIL = 60 * 1000;
  let _bid = null, _sidast = 0, _svar = null;

  async function lesaTilBaka(fra) {
    const c = window.DB && DB.sb;
    if (!c) return false;
    const r = await c.from('payday_invoices_slokk').select('updated_at').order('updated_at', { ascending: false }).limit(1);
    if (r.error || !r.data || !r.data.length) return false;
    return new Date(r.data[0].updated_at).getTime() >= fra - 120000;
  }

  function uppfaera(opts) {
    const afl = !!(opts && opts.afl);
    if (_bid) return _bid;
    if (!afl && _sidast && Date.now() - _sidast < BIL) return Promise.resolve(Object.assign({ nylegt: true }, _svar));
    _bid = (async () => {
      const fra = Date.now();
      try {
        const res = await fetch('/api/payday-pull-slokk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const d = await res.json().catch(() => ({ error: 'Ógilt svar frá þjóni (HTTP ' + res.status + ')' }));
        if (!res.ok || d.error || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
        if (!(await lesaTilBaka(fra))) throw new Error('Payday svaraði, en spegillinn uppfærðist ekki (lesið til baka)');
        _sidast = Date.now();
        _svar = { ok: true, upserted: d.upserted || 0, fetched: d.fetched || 0 };
        try { window.dispatchEvent(new CustomEvent('payday-spegill', { detail: _svar })); } catch (_) {}
        return _svar;
      } catch (e) {
        console.warn('[372-payday-spegill]', e);
        return { ok: false, villa: (e && e.message) || String(e) };
      } finally {
        _bid = null;
      }
    })();
    return _bid;
  }

  window.PaydaySpegill = { uppfaera, sidast: () => _sidast, version: '372a' };
  console.log('[372-payday-spegill] installed');
})();
