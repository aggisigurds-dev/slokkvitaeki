/* === SÉRUPPDRÆTTIR REYKJAVÍKUR (432) =======================================
 *
 * Við hliðina á aðaluppdráttunum: Raflagnir, Lagnir (pípur, hiti, loft),
 * Burðarþol og Sérteikningar úr FotoWeb-safni 5004. Aðeins Reykjavík.
 * Tómir flokkar sjást ekki. Aðaluppdrættirnir standa óbreyttir.
 *
 * Sótt EINU SINNI á landnúmer. Næsta opnun les hus_upplysingar_cache
 * (lykill seradr:<heimilisfang>) og kallar ekki á fallið, og fallið kallar
 * ekki á FotoWeb. Endurnýja á prófílnum, eða takkinn hér, sækir aftur.
 * Hlaða opnar ekki prófíla og kemst því ekki hingað.
 *
 * Skráningartöflur eru þegar í aðaluppdráttalistanum. Takkinn opnar þær
 * í forskoðuninni (384) án þess að lesa þær með OCR.
 * ========================================================================== */
(() => {
  if (window.Seruppdrattir) return;

  const UTGAFA = 'serupp-1';
  const FALL = '/.netlify/functions/seruppdrattir';
  const RVK = new Set([101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 116, 121, 123, 124, 125, 127, 128, 129, 130, 132, 155, 161, 162]);
  const MAPIS = new Set([200, 201, 202, 203, 210, 211, 212, 225, 220, 221]);
  const minni = new Map();
  const bid = new Set();
  let sbBeid = 0;
  let sbReynt = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function coIdNu() {
    const m = String(location.hash || '').match(/#(?:company|companies|fyrirtaeki)\/(\d+)/);
    return m ? +m[1] : 0;
  }
  function heimilisfang(coId) {
    try {
      const c = ((window.Companies && Companies.list) || []).find((x) => +x.id === +coId);
      return c ? String(c.heimilisfang || '').trim() : null;
    } catch (_) { return null; }
  }
  function lykillAf(adr) {
    return String(adr || '').normalize('NFC').trim().toLowerCase();
  }
  function postnrAf(adr) {
    const t = String(adr || '');
    const eftir = t.split(',').slice(1).join(' ');
    const m = /\b(\d{3})\b/.exec(eftir) || /\b(\d{3})\b/.exec(t);
    const n = m ? +m[1] : 0;
    return n >= 100 && n <= 999 ? n : 0;
  }
  function erReykjavik(adr) {
    const pn = postnrAf(adr);
    if (MAPIS.has(pn)) return false;
    if (RVK.has(pn)) return true;
    return /reykjav[ií]k/i.test(String(adr || ''));
  }
  function boxFyrir(id) {
    return document.querySelector('#companies-main .co-bupp[data-co="' + id + '"]')
      || document.querySelector('.co-bupp[data-co="' + id + '"]');
  }

  function stilar() {
    if (document.getElementById('_serupp-css')) return;
    const s = document.createElement('style');
    s.id = '_serupp-css';
    s.textContent =
      '._serupp-inn{display:flex;flex-wrap:wrap;gap:4px 12px;min-width:0;align-items:baseline}' +
      'a._serupp-l,button._serupp-l{margin:0!important;padding:0!important;border:0!important;background:none!important;' +
      'background-color:transparent!important;box-shadow:none!important;color:#93c5fd!important;font:inherit!important;' +
      'font-size:11.5px!important;font-weight:400!important;line-height:19px!important;text-decoration:none!important;' +
      'cursor:pointer!important;white-space:nowrap!important}' +
      'a._serupp-l:hover,button._serupp-l:hover{color:#fff!important;text-decoration:underline!important}' +
      'button._serupp-l:disabled{opacity:.55!important;cursor:default!important}';
    (document.head || document.documentElement).appendChild(s);
  }

  function markup(svar, saeki) {
    if (saeki && !(svar && svar.flokkar)) {
      return '<div class="_bupp-lina _serupp-lina"><span class="_bupp-merki">Séruppdrættir</span>' +
        '<span class="_serupp-inn"><span class="_bupp-afsl">Sæki…</span></span></div>';
    }
    if (!svar || svar.utan) return '';
    if (svar.error && !(svar.flokkar && svar.flokkar.length)) {
      return '<div class="_bupp-lina _serupp-lina"><span class="_bupp-merki">Séruppdrættir</span>' +
        '<span class="_serupp-inn"><button type="button" class="_serupp-l" data-ser="endur">Reyna aftur</button></span></div>';
    }
    const fl = (svar.flokkar || []).filter((f) => f && f.fjoldi > 0);
    const linur = [];
    if (fl.length) {
      linur.push('<div class="_bupp-lina _serupp-lina"><span class="_bupp-merki">Séruppdrættir</span><span class="_serupp-inn">' +
        fl.map((f) => '<a class="_serupp-l" href="' + esc(f.slod) + '" target="_blank" rel="noopener" title="' +
          esc(f.merki + ' · ' + f.fjoldi + ' blöð í skjalasafni Reykjavíkur') + '">' +
          esc(f.merki) + ' · ' + esc(f.fjoldi) + '</a>').join('') +
        '<button type="button" class="_serupp-l" data-ser="endur" title="Sækja séruppdrættina aftur fyrir þetta landnúmer">Endurnýja</button>' +
        '</span></div>');
    }
    if (svar.landnr) {
      linur.push('<div class="_bupp-lina _serupp-lina"><span class="_bupp-merki">Skráningartöflur</span><span class="_serupp-inn">' +
        '<button type="button" class="_serupp-l" data-ser="skra" title="Fermetrar og herbergjafjöldi eru teiknaðir á blaðinu í aðaluppdráttunum.">Opna</button>' +
        '</span></div>');
    }
    return linur.join('');
  }

  async function lesaSb(adr) {
    const sb = window.DB && DB.sb;
    if (!sb) return null;
    const r = await sb.from('hus_upplysingar_cache').select('svar').eq('lykill', 'seradr:' + lykillAf(adr)).eq('utgafa', UTGAFA).limit(1);
    if (r.error) return null;
    const svar = r.data && r.data[0] && r.data[0].svar;
    return svar && (svar.flokkar || svar.utan) ? svar : null;
  }

  async function saekja(id, adr, endurnyja) {
    const lykill = lykillAf(adr);
    if (!endurnyja && minni.has(lykill)) return minni.get(lykill);
    if (bid.has(lykill)) return minni.get(lykill) || null;
    // Bíð eftir clientinum. Annars færi 404 á fallinu í minnið áður en skyndiminnið
    // er lesið, og næsta teikning reyndi ekki aftur.
    if (!endurnyja && !(window.DB && DB.sb)) return null;
    bid.add(lykill);
    syna();
    try {
      if (!endurnyja) {
        const c = await lesaSb(adr);
        if (c) { minni.set(lykill, c); return c; }
      }
      const r = await fetch(FALL + '?heimilisfang=' + encodeURIComponent(adr) + (endurnyja ? '&endurnyja=1' : ''), { signal: AbortSignal.timeout(20000) });
      let svar = null;
      try { svar = await r.json(); } catch (_) { svar = null; }
      if (!svar) svar = { error: 'Ekkert svar' };
      if (!r.ok && !svar.error) svar.error = 'Svar ' + r.status;
      minni.set(lykill, svar);
      return svar;
    } catch (e) {
      const svar = { error: (e && e.message) || 'Náði ekki í séruppdrætti' };
      minni.set(lykill, svar);
      return svar;
    } finally {
      bid.delete(lykill);
      syna();
    }
  }

  function syna() {
    const id = coIdNu();
    if (!id) return;
    const box = boxFyrir(id);
    if (!box) return;
    const adr = heimilisfang(id);
    if (adr == null) return;
    let el = box.querySelector('._serupp');
    if (!adr || !/\d/.test(adr) || !erReykjavik(adr)) {
      if (el) el.remove();
      return;
    }
    const lykill = lykillAf(adr);
    const svar = minni.get(lykill);
    const saeki = bid.has(lykill);
    const villEndur = !!(window.__coEndurnyja && +window.__coEndurnyja.id === +id && !(window.__coEndurnyja.notad && window.__coEndurnyja.notad.serupp));
    const ma = () => !!(window.__coMaEndurnyja && window.__coMaEndurnyja(id, 'serupp'));
    if (!svar && !saeki) {
      if (!(window.DB && DB.sb)) {
        if (sbReynt++ < 20) { clearTimeout(sbBeid); sbBeid = setTimeout(syna, 400); }
        return;
      }
      saekja(id, adr, villEndur && ma());
    } else if (villEndur && !saeki) saekja(id, adr, ma());
    const html = markup(svar, saeki || (!svar && !minni.has(lykill)));
    const sig = (saeki ? 's' : '') + (svar ? JSON.stringify(svar.flokkar || svar.error || (svar.utan ? 'u' : '')) : '');
    if (!html) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.className = '_serupp';
      const teikn = box.querySelector('._bupp-teikn-lina');
      const vixl = box.querySelector('._bupp-vixl');
      if (teikn) teikn.insertAdjacentElement('afterend', el);
      else if (vixl) box.insertBefore(el, vixl);
      else box.appendChild(el);
    }
    if (el.dataset.sig === sig && el.innerHTML) return;
    el.dataset.sig = sig;
    el.innerHTML = html;
    el.querySelectorAll('[data-ser]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (b.dataset.ser === 'endur') {
          minni.delete(lykill);
          saekja(id, adr, true);
          return;
        }
        const nu = minni.get(lykill);
        const land = nu && nu.landnr;
        if (!land || !window.TeikningaForskodun || !TeikningaForskodun.opna) return;
        TeikningaForskodun.opna(land, nu.label || adr, id, { sia: 'skraning' });
      });
    });
  }

  function vakta() {
    stilar();
    const rot = document.getElementById('companies-main');
    if (!rot) { setTimeout(vakta, 400); return; }
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(syna, 40);
    }).observe(rot, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => setTimeout(syna, 60));
    syna();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.Seruppdrattir = { syna };
})();
