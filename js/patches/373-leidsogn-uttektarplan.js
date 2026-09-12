/* === 373 LEIÐSÖGN · ÚTTEKTARPLAN ===
 *
 * Agnar 12.09.2026 („Hvað finnst þér mikilvægast að gera næst" → „Mátt gera nr 1"): skipuleggja úttektir
 * ársins. Sannreyna hvað er raunverulega ógert og hafa lánstæki og aðkomu við hvern stað þar sem leiðin
 * er skipulögð — í Leiðsögn, ekki á nýrri síðu.
 *
 * Bætir merkjum á „Eftir að skoða"-listann og sprettiglugga kortsins í Leiðsögn (161). Gögnin koma úr
 * Supabase-yfirlitinu `v_uttektarplan` (ein röð per samningsstað í Ársskoðun):
 *   🔋 N lánstæki         hleðsluhæf tæki í Ársskoðun − tæki hlaðin eða ný síðustu 4 ár fyrir næstu úttekt
 *                         (lesnir Stólpa-reikningar + sölur appsins; sama regla og brunaholf/hledsluaaetlun.html)
 *   ✓ Úttekt 2026: …      Ársskoðun segir ógert, en reikningur/sala með yfirferð eða skýrsluskjal sýnir úttekt
 *                         á árinu — þarf ekki að fara
 *   💰 Enginn reikningur  skoðað eða tekið út á árinu, en engin sala eða reikningur á staðnum eða kennitölunni
 *   🚶/🔔/⏰ aðkoma        úr aðkomuskrá staðarins (363)
 * Og samantektarlínu efst í listanum fyrir það sem sést: staðir, lánstæki alls, staðfestar úttektir, órukkað.
 *
 * Breytir ENGU í 161 og skrifar ekkert í gögn. 161 teiknar listann upp á nýtt við hverja síu, svo merkin
 * bætast aftur við: observer á listann sjálfan (ekki body — frontend-profiler 06.09) + tifari 1,2 s sem
 * gerir ekkert nema Leiðsögn sé opin (sama lækning og prófíl-innspýtingar, sjá 199/370).
 */
(() => {
  if (window.__uttektarplan373) return;
  window.__uttektarplan373 = true;

  const VIEW_ID = 'view-leidsogn';
  const ALDUR_MS = 5 * 60 * 1000;
  const ARID = new Date().getFullYear();
  const OGERT = { utrunnid: 1, thessi_manudur: 1, framundan: 1, engin_dags: 1 };
  const ADKOMA = { maeta: '🚶 Mæta', hringja_boka: '🔔 Bóka tíma', fastur_timi: '⏰ Fastur tími' };

  let gogn = null;          // Map fid → röð úr v_uttektarplan
  let sott = 0;
  let saeki = null;
  let panelMedObserver = null;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function client() {
    if (window.DB && DB.sb) return DB.sb;
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY) {
      window.__up373sb = window.__up373sb || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
      return window.__up373sb;
    }
    return null;
  }

  function saekja() {
    if (saeki) return saeki;
    const c = client();
    if (!c) return Promise.resolve();
    saeki = (async () => {
      try {
        // Síðuflett í 1000 raða skrefum — PostgREST sker hverja fyrirspurn við 1000 raðir (audit-pagination).
        const m = new Map();
        for (let fra = 0; ; fra += 1000) {
          const { data, error } = await c.from('v_uttektarplan')
            .select('fid,stada,sonnun,taeki_skodud,reikningur_a_arinu,hledsluhaef,lanstaeki,velta,adkoma,tengilidur,adkoma_ath')
            .order('fid')
            .range(fra, fra + 999);
          if (error) throw error;
          (data || []).forEach(r => m.set(String(r.fid), r));
          if (!data || data.length < 1000) break;
        }
        gogn = m;
        sott = Date.now();
        // ný gögn → teikna merkin upp á nýtt
        document.querySelectorAll('#' + VIEW_ID + ' ._up373').forEach(n => n.remove());
      } catch (e) {
        console.warn('[373] úttektarplan náðist ekki:', (e && e.message) || e);
        sott = Date.now() - ALDUR_MS + 60 * 1000;   // reyna aftur eftir mínútu, ekki á hverju tifi
      } finally {
        saeki = null;
      }
    })();
    return saeki;
  }

  const dagsIs = d => String(d || '').slice(0, 10).split('-').reverse().join('.');
  const skodadAnReiknings = r => (r.stada === 'merkt_buid' || r.stada === 'tekid_ut' || !!r.taeki_skodud) && !r.reikningur_a_arinu;
  const stadfestOgert = r => !!(OGERT[r.stada] && r.sonnun);

  function flis(texti, bg, bd, fg, titill) {
    return '<span title="' + esc(titill || '') + '" style="display:inline-flex;align-items:center;font-size:10.5px;font-weight:700;' +
      'line-height:1;padding:3px 7px;border-radius:999px;white-space:nowrap;background:' + bg + ';border:1px solid ' + bd +
      ';color:' + fg + '">' + esc(texti) + '</span>';
  }

  function merkiHtml(r) {
    if (!r) return '';
    const ut = [];
    if (r.lanstaeki > 0) {
      ut.push(flis('🔋 ' + r.lanstaeki + ' lánstæki', '#ecfeff', '#a5f3fc', '#0e7490',
        r.lanstaeki + ' af ' + r.hledsluhaef + ' hleðsluhæfum tækjum eru komin á hleðslu (5 ára hringur). Áætlun úr reikningum og sölum.'));
    }
    if (stadfestOgert(r)) {
      ut.push(flis('✓ Úttekt ' + ARID + ': ' + r.sonnun, '#f0fdf4', '#bbf7d0', '#15803d',
        'Ársskoðun er ekki merkt, en ' + r.sonnun + ' sýnir úttekt á árinu. Þarf ekki að fara.'));
    }
    if (skodadAnReiknings(r)) {
      ut.push(flis('💰 Enginn reikningur ' + ARID, '#fffbeb', '#fde68a', '#a16207',
        'Skoðað eða tekið út á árinu' + (r.taeki_skodud ? ' (tæki skoðuð ' + dagsIs(r.taeki_skodud) + ')' : '') +
        ', en engin sala eða reikningur á staðnum eða kennitölunni.'));
    }
    if (r.adkoma && ADKOMA[r.adkoma]) {
      ut.push(flis(ADKOMA[r.adkoma], '#f1f5f9', '#cbd5e1', '#334155', [r.tengilidur, r.adkoma_ath].filter(Boolean).join(' · ')));
    }
    return ut.join('');
  }

  function merkjaHnut(html, margin) {
    const d = document.createElement('div');
    d.className = '_up373';
    d.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:' + margin + 'px';
    d.innerHTML = html;
    return d;
  }

  // ── „Eftir að skoða"-listinn ───────────────────────────────────────────────
  function skreytaLista(view) {
    const panel = view.querySelector('#_lds-due-panel');
    if (!panel) return;
    if (panelMedObserver !== panel) {
      const o = new MutationObserver(() => { clearTimeout(o._t); o._t = setTimeout(skreyta, 40); });
      o.observe(panel, { childList: true });
      panelMedObserver = panel;
    }
    let stadir = 0, lan = 0, stadf = 0, oruk = 0;
    panel.querySelectorAll('._lds-due-row[data-co-id]').forEach(row => {
      const r = gogn.get(String(row.dataset.coId));
      stadir++;
      if (r) {
        lan += r.lanstaeki || 0;
        if (stadfestOgert(r)) stadf++;
        if (skodadAnReiknings(r)) oruk++;
      }
      if (row.querySelector('._up373')) return;
      const html = merkiHtml(r);
      const info = row.children[1];
      if (html && info) info.appendChild(merkjaHnut(html, 4));
    });

    const texti = stadir
      ? 'Úttektarplan · ' + stadir + ' staðir á listanum · 🔋 ' + lan + ' lánstæki' +
        (stadf ? ' · ✓ ' + stadf + ' með staðfesta úttekt (þarf ekki að fara)' : '') +
        (oruk ? ' · 💰 ' + oruk + ' án reiknings' : '')
      : '';
    let sum = panel.querySelector(':scope > ._up373-sum');
    if (!texti) { if (sum) sum.remove(); return; }
    if (!sum) {
      sum = document.createElement('div');
      sum.className = '_up373-sum';
      sum.title = 'Úr v_uttektarplan: lánstæki = hleðsluhæf tæki − hlaðin/ný síðustu 4 ár; staðfest úttekt = reikningur/sala/skýrsla á árinu.';
      sum.style.cssText = 'padding:7px 14px;font-size:11.5px;font-weight:600;color:#0f172a;background:#f8fafc;border-bottom:1px solid #e2e8f0';
      panel.insertBefore(sum, panel.firstChild);
    }
    if (sum.textContent !== texti) sum.textContent = texti;
  }

  // ── Sprettigluggar kortsins ────────────────────────────────────────────────
  function skreytaSprettiglugga(view) {
    view.querySelectorAll('.leaflet-popup-content').forEach(pc => {
      if (pc.querySelector('._up373')) return;
      const takki = pc.querySelector('._lds-route-add[data-co-id], ._lds-route-remove[data-co-id], ._lds-open-co[data-co-id]');
      if (!takki) return;
      const html = merkiHtml(gogn.get(String(takki.dataset.coId)));
      if (!html) return;
      const takkarod = takki.parentElement;
      const rot = pc.firstElementChild || pc;
      const hnutur = merkjaHnut(html, 8);
      if (takkarod && takkarod.parentElement === rot) rot.insertBefore(hnutur, takkarod);
      else rot.appendChild(hnutur);
    });
  }

  function skreyta() {
    const view = document.getElementById(VIEW_ID);
    if (!view || view.offsetParent === null) return;          // Leiðsögn ekki opin → ekkert
    if (!gogn || Date.now() - sott > ALDUR_MS) {
      const bid = saekja();
      if (!gogn) { bid.then(() => { if (gogn) skreyta(); }); return; }
    }
    try {
      skreytaLista(view);
      skreytaSprettiglugga(view);
    } catch (e) {
      console.warn('[373] skreyting:', e);
    }
  }

  setInterval(skreyta, 1200);

  window.Uttektarplan = {
    gogn: () => gogn,
    endurhlada: async () => { sott = 0; gogn = null; await saekja(); skreyta(); },
    version: 1
  };
})();
