/* === FASTEIGNAUPPLÝSINGAR ÚR TEIKNINGAGÖGNUM (432) =========================
 *
 * Agnar 01.10.2026: grunnmyndirnar á spjaldinu virka, en hæðir, kjallari,
 * herbergi og þess háttar vantar við hliðina — og teikningagögnin eiga ekki
 * að sækjast aftur í hvert skipti sem prófíllinn opnast.
 *
 * hus-upplysingar skilar tillogur.haedir / kjallari / jardhaed / ris úr
 * grunnmyndum. Það er allt sem opinber leið án áskriftar gefur. Herbergi,
 * fermetrar, byggingarár og byggingarefni eru ekki í svarinu (Fasteignaskrá
 * HMS er í áskrift, api.hms.is 403). Þessir reitir birtast aðeins þegar
 * gildið stendur í svarinu. Tómt = „vantar heimild", aldrei ágiskað.
 *
 * VARANLEGT: hus_upplysingar_cache (sama tafla og fallið skrifar). Opnun
 * les eina röð. Takkinn „Sækja fasteignaupplýsingar" sækir einu sinni fyrir
 * opna félagið þegar röðin vantar, og sleppir ef hún er til. 404 er skrifað
 * í sömu töflu svo næsta opnun kalli ekki aftur. Engin lykkja, ekkert á Hlaða.
 * ========================================================================== */
(() => {
  if (window.FasteignFacts) return;

  const UTGAFA = '2026-09-14';
  const SESSION = 'bupp_skrar_v1_';
  const minni = new Map();     // lykill heimilisfangs -> { svar } | { tomt:true } | { villa:true }
  const bid = new Set();
  const saekibid = new Set();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function coIdNu() {
    const m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    return m ? +m[1] : null;
  }
  function heimilisfang(coId) {
    try {
      const c = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
      return c ? String(c.heimilisfang || '').trim() : null;
    } catch (_) { return null; }
  }
  function lykillAf(adr) {
    return String(adr || '').normalize('NFC').trim().toLowerCase();
  }
  function skrifaSession(coId, adr, svar) {
    try {
      sessionStorage.setItem(SESSION + coId, JSON.stringify({ heimilisfang: adr, svar, sott: Date.now() }));
    } catch (_) {}
  }
  function endurteikna() {
    try { if (window.BannerUpplysingar && BannerUpplysingar.haldaVid) BannerUpplysingar.haldaVid(); } catch (_) {}
  }

  function linurUrSvari(svar) {
    const t = (svar && svar.tillogur && typeof svar.tillogur === 'object') ? svar.tillogur : {};
    const ut = [];
    const haedir = String(t.haedir == null ? '' : t.haedir).trim();
    if (/^\d{1,2}$/.test(haedir) && +haedir > 0 && +haedir < 60) ut.push(['Hæðir', haedir]);
    if (t.kjallari === 'yes') ut.push(['Kjallari', 'já']);
    if (t.jardhaed === 'yes') ut.push(['Jarðhæð', 'já']);
    if (t.ris === 'yes') ut.push(['Ris', 'já']);
    return ut;
  }

  async function lesa(adr) {
    const lykill = lykillAf(adr);
    if (!lykill || minni.has(lykill) || bid.has(lykill)) return;
    const sb = window.DB && DB.sb;
    if (!sb) return;
    bid.add(lykill);
    try {
      const r = await sb.from('hus_upplysingar_cache').select('svar').eq('lykill', lykill).eq('utgafa', UTGAFA).limit(1);
      if (r.error) { minni.set(lykill, { villa: true }); return; }
      const svar = r.data && r.data[0] && r.data[0].svar;
      minni.set(lykill, svar ? { svar } : { tomt: true });
    } catch (_) {
      minni.set(lykill, { villa: true });
    } finally {
      bid.delete(lykill);
      const id = coIdNu();
      const nu = id && heimilisfang(id);
      if (nu && lykillAf(nu) === lykill) {
        const h = minni.get(lykill);
        if (h && h.svar) skrifaSession(id, nu, h.svar);
        if (h && h.svar) endurteikna();
        syna();
      }
    }
  }

  function markup(adr, h) {
    if (!h) return '';
    if (h.svar) {
      const linur = linurUrSvari(h.svar);
      const heimild = String(h.svar.heimild || 'Teikningagögn');
      if (linur.length) {
        return linur.map(([merki, gildi]) =>
          '<div class="_bupp-lina _fasteign-lina"><span class="_bupp-merki">' + esc(merki) + '</span>' +
          '<span class="_fasteign-gildi" title="' + esc(heimild) + '">' + esc(gildi) + '</span></div>'
        ).join('');
      }
      return '<div class="_bupp-lina _fasteign-lina"><span class="_bupp-merki">Hús</span>' +
        '<span class="_fasteign-gildi" title="Teikningagögnin hafa hvorki hæðir né herbergi. Fermetrar, byggingarár og byggingarefni eru í Fasteignaskrá HMS sem er í áskrift.">vantar heimild</span></div>';
    }
    if (h.tomt || h.villa) {
      const i = saekibid.has(lykillAf(adr));
      return '<div class="_bupp-lina _fasteign-lina"><span class="_bupp-merki">Hús</span>' +
        '<button type="button" class="_fasteign-takki"' + (i ? ' disabled' : '') + '>' +
        (i ? 'Sæki…' : 'Sækja fasteignaupplýsingar') + '</button></div>';
    }
    return '';
  }

  let _adrRett = 0;
  function syna() {
    const id = coIdNu();
    if (!id) return;
    const box = document.querySelector('#companies-main .co-bupp[data-co="' + id + '"]') ||
      document.querySelector('.co-bupp[data-co="' + id + '"]');
    if (!box) return;
    const adr = heimilisfang(id);
    // Listinn kemur stundum á eftir bannerinum. Engin netumferð á meðan.
    if (adr == null) {
      if (_adrRett < 25) { _adrRett++; setTimeout(syna, 400); }
      return;
    }
    _adrRett = 0;
    if (!adr || !/\d/.test(adr)) return;
    const lykill = lykillAf(adr);
    lesa(adr);
    const h = minni.get(lykill);
    const sig = (h && h.svar ? 's:' + linurUrSvari(h.svar).map(x => x.join('=')).join('|') + (linurUrSvari(h.svar).length ? '' : ':vantar') : h && h.tomt ? 'tomt' : h && h.villa ? 'villa' : 'bid') +
      (saekibid.has(lykill) ? ':sæki' : '');
    let el = box.querySelector('._fasteign');
    const html = markup(adr, h);
    if (!html) { if (el) el.remove(); return; }
    if (el && el.dataset.sig === sig) return;
    if (!el) {
      el = document.createElement('div');
      el.className = '_fasteign';
      const teikn = box.querySelector('._bupp-teikn-lina');
      const vixl = box.querySelector(':scope > ._bupp-vixl');
      if (teikn) teikn.insertAdjacentElement('afterend', el);
      else if (vixl) vixl.insertAdjacentElement('beforebegin', el);
      else box.appendChild(el);
    }
    el.dataset.sig = sig;
    el.innerHTML = html;
    const btn = el.querySelector('._fasteign-takki');
    if (btn) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        saekja(id, adr);
      });
    }
  }

  async function saekja(id, adr) {
    const lykill = lykillAf(adr);
    const til = minni.get(lykill);
    if (til && til.svar) return;
    if (saekibid.has(lykill)) return;
    saekibid.add(lykill);
    syna();
    try {
      const r = await fetch('/.netlify/functions/hus-upplysingar?heimilisfang=' + encodeURIComponent(adr));
      let svar = null;
      try { svar = await r.json(); } catch (_) { svar = null; }
      const timabundid = !svar || !!(svar && svar.reynaAftur) || r.status >= 500;
      if (timabundid) return;
      minni.set(lykill, { svar });
      skrifaSession(id, adr, svar);
      const sb = window.DB && DB.sb;
      const fallSkrifadi = r.ok && svar && svar.eign && !svar.reynaAftur;
      if (sb && !fallSkrifadi) {
        const v = await sb.from('hus_upplysingar_cache').upsert({
          lykill, heimilisfang: adr, utgafa: UTGAFA, svar, uppfaert: new Date().toISOString()
        }, { onConflict: 'lykill' });
        if (v && v.error) console.warn('[432] vistun', v.error.message);
      }
      endurteikna();
    } catch (e) {
      console.warn('[432] fasteign', e && e.message);
    } finally {
      saekibid.delete(lykill);
      syna();
    }
  }

  function stilar() {
    if (document.getElementById('_fasteign-css')) return;
    const s = document.createElement('style');
    s.id = '_fasteign-css';
    s.textContent =
      'button._fasteign-takki{margin:0!important;padding:0!important;border:0!important;background:none!important;background-color:transparent!important;' +
      'box-shadow:none!important;color:rgba(255,255,255,.72)!important;font:inherit!important;font-size:11.5px!important;font-weight:400!important;' +
      'line-height:19px!important;text-decoration:underline!important;text-underline-offset:3px!important;cursor:pointer!important;white-space:nowrap!important}' +
      'button._fasteign-takki:hover{color:#fff!important}' +
      'button._fasteign-takki:disabled{opacity:.6!important;cursor:default!important}' +
      '._fasteign-gildi{flex:1 1 auto;min-width:0;font-size:11.5px;line-height:19px;color:rgba(255,255,255,.72);padding:0 2px;white-space:nowrap}';
    (document.head || document.documentElement).appendChild(s);
  }

  function vakta() {
    const rot = document.getElementById('companies-main') || document.body;
    if (!document.getElementById('companies-main')) { setTimeout(vakta, 400); return; }
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(syna, 50);
    }).observe(rot, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => setTimeout(syna, 80));
    syna();
  }

  stilar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.FasteignFacts = { syna };
})();
