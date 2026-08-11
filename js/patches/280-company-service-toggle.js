/* === COMPANY SERVICE TOGGLE (Taka úr / Setja í þjónustu) v1 ===
 *
 * Bætir „⬇ Taka úr þjónustu" (eða „⬆ Setja í þjónustu") takka á
 * fyrirtækisspjaldið (Companies.openDetail, í #companies-main) — við hlið
 * Breyta/Eyða. Færir fyrirtæki milli „Fyrirtæki í þjónustu" og „Allir
 * viðskiptavinir" ÁN þess að snerta nein gögn (tæki, reikningar, saga,
 * skjöl haldast öll — þau eru lykluð á fyrirtækið/kt, ekki á þjónustumerkið).
 *
 * „Í þjónustu" er tvennt (sbr. patch 153 hasArs):
 *   1) fyrirtaeki.er_i_thjonustu = true, OG/EÐA
 *   2) AppSettings.arsskodun_customers[id].subscribed = true (eða búnaður skráður)
 * Þess vegna hreinsar „úr þjónustu" BÆÐI merkin (eins og patch 153
 * takeOutOfService) — annars birtist fyrirtækið áfram í listanum.
 *
 * Sett inn um MutationObserver á #companies-main, nákvæmlega eins og patch
 * 160 (company-delete) gerir með Eyða-takkann.
 */
(() => {
  if (window.__companyServiceToggleInstalled) return;
  window.__companyServiceToggleInstalled = true;

  const STORAGE_KEY = 'arsskodun_customers';
  function SB() { return (window.DB && DB.sb) || null; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[svc-toggle]', m); }
  function coName(coId) {
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    return co ? (co.nafn || ('#' + coId)) : ('#' + coId);
  }

  function mapEntry(coId) {
    try {
      const map = (window.AppSettings && AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
      return map[String(coId)] || null;
    } catch (_) { return null; }
  }
  // Sama regla og patch 153 hasArs: í þjónustu ef DB-dálkurinn er true EÐA
  // settings-blobbið merkir subscribed / með skráðan búnað.
  async function isInService(coId) {
    const a = mapEntry(coId);
    const mapIn = !!(a && (a.subscribed === true || (a.equipment && Object.keys(a.equipment).length)));
    let colIn = false;
    try {
      const sb = SB();
      if (sb) {
        const r = await sb.from('fyrirtaeki').select('er_i_thjonustu').eq('id', coId).maybeSingle();
        colIn = !!(r && r.data && r.data.er_i_thjonustu);
      }
    } catch (_) {}
    return colIn || mapIn;
  }

  function refreshLists(coId, toService) {
    // Speglað á in-memory röðina svo listar sýni strax rétt.
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    if (co) co.er_i_thjonustu = toService;
    try { if (typeof window.refreshCompaniesList === 'function') window.refreshCompaniesList(); } catch (_) {}
    // Best-effort: endurhlaða þjónustulistann + Allir viðskiptavinir ef opnir.
    ['Arsskodun', 'ArsSkodun', 'AllirVidskiptavinir', 'Allir'].forEach(k => {
      try { const o = window[k]; if (o && typeof o.reload === 'function') o.reload(); } catch (_) {}
    });
  }

  async function setService(coId, toService, btn) {
    const name = coName(coId);
    const msg = toService
      ? 'Setja „' + name + '" í þjónustu?\n\nFyrirtækið birtist þá í „Fyrirtæki í þjónustu".'
      : 'Taka „' + name + '" úr þjónustu?\n\nFyrirtækið helst í „Allir viðskiptavinir" með ÖLL gögn — tæki, reikninga, sögu og skjöl. Þú getur kveikt aftur hvenær sem er.';
    const svcOk = (window.Confirm && Confirm.show) ? await Confirm.show(msg) : window.confirm(msg);
    if (!svcOk) return;
    const sb = SB();
    if (!sb) { toast('Engin nettenging'); return; }
    const oldLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      // 1) DB-dálkurinn (per-row, óklóbberanlegt)
      const r = await sb.from('fyrirtaeki').update({ er_i_thjonustu: toService }).eq('id', coId);
      if (r.error) throw r.error;
      // 2) Settings-merkið (subscribed) — AppSettings.save deep-merge-ar, svo við
      //    setjum bara þennan eina lykil. Úr þjónustu => subscribed:false.
      if (window.AppSettings && AppSettings.save) {
        const patch = toService
          ? { subscribed: true }
          : { subscribed: false, removed_from_service_at: new Date().toISOString().slice(0, 10) };
        try { await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: patch } }); } catch (_) {}
      }
      // 3) Audit-slóð (sama og patch 153) — valfrjálst.
      try {
        await sb.from('override_log').insert({
          co_id: +coId, co_nafn: name, field: 'er_i_thjonustu',
          old_value: String(!toService), new_value: String(toService), page: 'fyrirtaeki-profil'
        });
      } catch (_) {}

      refreshLists(coId, toService);
      toast((toService ? '⬆ ' + name + ' sett í þjónustu' : '⬇ ' + name + ' tekið úr þjónustu — er í Allir viðskiptavinir'));
      if (btn) applyButtonState(btn, coId, !toService); // flippa í hina áttina
    } catch (e) {
      const m = (e && e.message) || String(e);
      toast('Villa: ' + m);
      if (btn) { btn.disabled = false; btn.textContent = oldLabel; }
    }
  }

  // Setur útlit + hegðun takkans eftir því hvort fyrirtækið er í þjónustu.
  function applyButtonState(btn, coId, inService) {
    btn.disabled = false;
    btn.dataset.inservice = inService ? '1' : '0';
    // Útlitið er klónað af Breyta-hnappnum (sjá injectButton) — hér breytum við
    // AÐEINS textanum eftir stöðu, svo takkinn haldist eins og systkini sín.
    if (inService) {
      btn.textContent = '⬇ Taka úr þjónustu';
      btn.title = 'Færa í Allir viðskiptavinir — öll gögn haldast';
    } else {
      btn.textContent = '⬆ Setja í þjónustu';
      btn.title = 'Bæta í Fyrirtæki í þjónustu';
    }
  }

  function injectButton() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
    if (!editBtn) return;
    const actionsRow = editBtn.parentElement;
    if (!actionsRow || actionsRow.querySelector('._co-svc-toggle')) return;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];

    const btn = document.createElement('button');
    btn.type = 'button';
    // Sami stíll og hnappurinn við hliðina (Breyta) — klónum class + inline-stíl
    // af honum svo takkinn falli inn í hausinn (ósk Agnars: „same as the button
    // it is on side with").
    btn.className = (editBtn.className || 'btn btn-outline btn-sm') + ' _co-svc-toggle';
    const _es = editBtn.getAttribute('style');
    if (_es) btn.setAttribute('style', _es);
    // Sjálfgefið: í þjónustu (langoftast opnað af þjónustulistanum); leiðréttist async.
    applyButtonState(btn, coId, true);
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const inService = btn.dataset.inservice === '1';
      setService(coId, !inService, btn);
    });
    // Vinstra megin við Breyta (þar sem Agnar merkti).
    actionsRow.insertBefore(btn, editBtn);

    // Leiðrétta útlitið eftir raunverulegri stöðu (async).
    isInService(coId).then(inSvc => { if (btn.isConnected) applyButtonState(btn, coId, inSvc); }).catch(() => {});
  }

  function watch() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(() => injectButton()).observe(main, { childList: true, subtree: true });
    injectButton();
  }
  watch();

  console.log('[company-service-toggle] installed');
})();
/* === END COMPANY SERVICE TOGGLE === */
