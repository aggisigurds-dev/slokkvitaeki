/* === 516 SKÝRSLA FYLGIR SÖLU — ein leið eftir hverja breytingu (17.11.2026) ===
 *
 * Agnar 17.11.2026: „Mátt reyna laga þetta svo það sé ekki alltaf vesen.“ Reikningur sem var leiðréttur, endurgerður,
 * færður á aðra kennitölu eða fékk fleiri tæki hélt gömlu úttektarskýrslunni (gamalt nafn, gömul kt). Fimm leiðir
 * breyta sölu; engin þeirra spurði hvort skýrslan stemmdi enn.
 *
 * Nú fara þær ALLAR um þetta eina fall:
 *   SkyrslaSolu.eftirBreytingu(saleId, astaeda)
 *     → spyr payday-push (skyrsla_athugun — sama val og sami dómur og sendingin sjálf, _skyrsla-solu.cjs; ekkert
 *       fer til Payday) hvort skýrslan sem fylgir stemmi við söluna (kt · nafn · staður · tæki);
 *     → stemmi hún ekki: býður „Búa til nýja skýrslu" — ALDREI sjálfvirkt, aldrei blokkað („Seinna" skilur allt eftir;
 *       sendiskjárinn segir þá frá og payday-push stöðvar sendingu með rangri skýrslu).
 *   SkyrslaSolu.endurnyja(coId) — EINA leiðin að nýrri skýrslu: 168 vistar nýja þótt skýrsla sé til (CIR_NY) og merkir
 *       eldri „leyst af hólmi" (111 supersede). Engu eytt.
 *
 * Hverjir kalla: 142 ritillinn (atburðurinn 'sale-edited' — Vista/Klára á ósendri sölu, Leiðrétta-drög, færa kt,
 * gleymdur afsláttur, tækjum bætt við), 165 Klára heimsókn (endurgerð), 488 viðbótarúttekt (endurnyja), 166 sendiskjárinn
 * (endurnyja). Aðrar leiðir (Claude í krofu_verkferli, SQL) grípur sendiskjárinn, hliðið og gagnavörðurinn
 * tools/audit-skyrsla-solu.cjs.
 */
(function () {
  'use strict';
  if (window.SkyrslaSolu) return;

  async function athuga(saleId) {
    const r = await fetch('/api/payday-push', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale_id: saleId, skyrsla_athugun: true }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.athugun) throw new Error((j && j.error) || ('HTTP ' + r.status));
    return j;
  }

  // Skilar loforði (488 bíður eftir að glugginn opnist og grípur villuna).
  async function endurnyja(coId, opts) {
    if (!coId) return false;
    if (!window.CompanyInspectionReport || !CompanyInspectionReport.open) throw new Error('CompanyInspectionReport vantar');
    // Viðbótarúttekt (488) hefur sitt eigið merki (CIR_VIDBOT) — það gildir þá og CIR_NY er ekki sett ofan á.
    if (!(window.CIR_VIDBOT && String(window.CIR_VIDBOT.coId) === String(coId))) {
      window.CIR_NY = { coId: coId, until: Date.now() + 10 * 60 * 1000, astaeda: (opts && opts.astaeda) || '' };
    }
    try { await CompanyInspectionReport.open(coId, opts && opts.cir); } catch (e) { window.CIR_NY = null; throw e; }
    return true;
  }

  // Á að bjóða nýja skýrslu? Skýrslan er um ANNAN stað (stodvar: kt OG nafn önnur, eða #staður), eða tækjum fjölgaði.
  // Kt EÐA nafn eitt og sér (nýr greiðandi, leiðrétt kt, rekstrarfélag) truflar ekki — sendiskjárinn sýnir það gult.
  // Engin skýrsla / annað ár / viðbót: nei — þá er venjulega skýrsluskrefið (eða 488) eftir.
  const bjoda = (m) => m.stodvar || m.svid === 'taeki';

  const _iGangi = new Set();
  // opts.alltafNy (165 endurgerð — önnur úttekt ársins): ný úttekt = ný skýrsla, líka þótt sú gamla stemmi að nafni og kt.
  async function eftirBreytingu(saleId, astaeda, opts) {
    if (!saleId || _iGangi.has(String(saleId))) return null;
    _iGangi.add(String(saleId));
    try {
      let j;
      try { j = await athuga(saleId); } catch (_) { return null; }   // athugunin brást → engin truflun; sendiskjárinn spyr aftur
      if (!j.fylgir || j.send || !j.skyrsla || !j.customer_id) return j;
      const mis = (j.skyrsla.misraemi || []).filter(bjoda);
      const alltaf = !!(opts && opts.alltafNy);
      if (!mis.length && !alltaf) return j;
      const sk = j.skyrsla.lysing;
      const msg = mis.length
        ? 'Úttektarskýrslan sem fylgir ' + (j.num || 'sölunni') + ' stemmir ekki lengur við söluna:\n\n• ' + mis.map((m) => m.texti).join('\n• ') +
          '\n\nBúa til NÝJA úttektarskýrslu núna? Hún fær nafn, kennitölu og tæki sölunnar og fylgir kröfunni. ' +
          'Gamla skýrslan er ekki snert — hún er merkt „leyst af hólmi" og fylgir ekki framar.'
        : (opts.texti || 'Þetta var önnur úttekt ársins.') + '\n\n' + (sk ? 'Skýrslan sem fylgir núna er frá ' + (sk.dags || '?') + '. ' : '') +
          'Búa til NÝJA úttektarskýrslu svo hún stemmi við nýja reikninginn? Gamla skýrslan er ekki snert — hún er merkt „leyst af hólmi".';
      const ok = (window.Confirm && Confirm.show) ? await Confirm.show(msg, { okText: 'Búa til skýrslu', cancelText: 'Seinna' }) : window.confirm(msg);
      if (ok) endurnyja(j.customer_id, { astaeda: astaeda || 'breyting' }).catch((e) => { try { window.logProblem && logProblem('skyrsla_endurnyjun_brast', String(saleId) + ': ' + String((e && e.message) || e).slice(0, 120)); } catch (_) {} });
      else if (window.Toast && Toast.show) Toast.show('⚠ Mundu nýja úttektarskýrslu áður en krafan er send — sending með rangri skýrslu stöðvast.');
      return j;
    } finally {
      setTimeout(() => _iGangi.delete(String(saleId)), 3000);
    }
  }

  // 142 sendir 'sale-edited' eftir hverja vistun í ritlinum (Vista breytingar / Vista sem drög / Klára sölu).
  document.addEventListener('sale-edited', (e) => { const d = e && e.detail; if (d && d.id) eftirBreytingu(d.id, 'ritill'); });
  // Aðrar leiðir mega senda 'sala-breytt' { id, astaeda } — sama meðhöndlun.
  document.addEventListener('sala-breytt', (e) => { const d = e && e.detail; if (d && d.id) eftirBreytingu(d.id, d.astaeda || 'breyting'); });

  window.SkyrslaSolu = { athuga, endurnyja, eftirBreytingu };
  console.log('[patch-516] skyrsla-solu installed — window.SkyrslaSolu.{athuga,endurnyja,eftirBreytingu}');
})();
/* === END 516 SKÝRSLA FYLGIR SÖLU === */
