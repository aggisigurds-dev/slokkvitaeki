/* 527 — VIÐVÖRUN þegar nafn, heimilisfang eða kennitala fyrirtækis breytist (Agnar 23.11.2026).
 *
 * „Þetta má ekki vera svona flókið fyrir okkur starfsfólkið að breyta svona … þetta á líka við heimilisfang og nafn fyrirtækis ..
 *  þá má ekkert fara í rugl við það, settu einhverskonar viðvörun, varnir svo það gerist aldrei.“
 *
 * Starfsfólk breytir reitnum á spjaldinu (Breyta fyrirtæki) og vistar. Gagnagrunnskeðjan (sql/2026-11-23_audkenni_vidvorun.sql +
 * sql/2026-11-23_kt_breyting_faerist.sql) færir það sem má færa; þessi skrá SEGIR frá:
 *   1) áður en vistað er: gul athugasemd undir eyðublaðinu um hvað fylgir með og hvað þarf mannshönd (forskoðun, engu breytt);
 *   2) eftir vistun: kassi neðst á skjánum með því sem þarf mannshönd (ósendur reikningur → „Leiðrétta“, sendur ógreiddur → afturkalla +
 *      bakfæra, skýrsla ársins → ný skýrsla, deildur/annar greiðandi → Agnar).
 * Allt kemur úr RPC audkenni_afleidingar (lesfall). ALLTAF LEYFA VISTUN: þessi skrá stöðvar aldrei vistun, kastar aldrei villu út
 * og sýnir ekkert þegar kallið bregst. Hún skrifar ekkert í grunninn. Leiðarvísir: docs/BREYTA-AUDKENNUM-FYRIRTAEKIS.md.
 */
(function () {
  'use strict';
  if (window.AudkenniVidvorun) return;

  const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  const trim = (s) => String(s == null ? '' : s).trim();

  // Hvað er breytt (sama regla og í grunninum: kt aðeins þegar báðar eru 10 stafa og ólíkar; nafn/heimilisfang aðeins þegar hvort tveggja er til).
  function munur(prev, nytt) {
    prev = prev || {}; nytt = nytt || {};
    const okt = digits(prev.kennitala), nkt = digits(nytt.kennitala);
    return {
      kt: okt.length === 10 && nkt.length === 10 && okt !== nkt,
      nafn: !!trim(prev.nafn) && !!trim(nytt.nafn) && trim(prev.nafn) !== trim(nytt.nafn),
      heimilisfang: !!trim(prev.heimilisfang) && !!trim(nytt.heimilisfang) && trim(prev.heimilisfang) !== trim(nytt.heimilisfang)
    };
  }
  const eitthvad = (m) => !!(m && (m.kt || m.nafn || m.heimilisfang));

  // RPC → {tharf:[…], sjalfkrafa:[…]} eða null (bilun og „ekkert breytt“ gefa bæði null — aldrei villa).
  async function athuga(sb, id, prev, nytt, nyttErNuverandi) {
    try {
      if (!sb || !sb.rpc || !id) return null;
      prev = prev || {};
      const arg = {
        p_id: id,
        p_gamalt_nafn: prev.nafn || null, p_gamalt_kt: prev.kennitala || null, p_gamalt_heimilisfang: prev.heimilisfang || null,
        p_gamall_base: prev.customer_base_id || null
      };
      if (!nyttErNuverandi) {
        nytt = nytt || {};
        arg.p_nytt_nafn = nytt.nafn || null; arg.p_nytt_kt = nytt.kennitala || null; arg.p_nytt_heimilisfang = nytt.heimilisfang || null;
      }
      const r = await sb.rpc('audkenni_afleidingar', arg);
      if (!r || r.error || !r.data || r.data.breytt !== true) return null;
      return {
        tharf: Array.isArray(r.data.tharf_adgerd) ? r.data.tharf_adgerd.map(String) : [],
        sjalfkrafa: Array.isArray(r.data.gert_sjalfkrafa) ? r.data.gert_sjalfkrafa.map(String) : []
      };
    } catch (_) { return null; }
  }

  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;   // alltaf sem texti, aldrei sem HTML: textinn kemur úr grunninum
    return e;
  }
  function fyllaLinur(boxur, res) {
    res.tharf.forEach((t) => boxur.appendChild(el('div', 'margin:4px 0;color:#92400e;font-weight:600', '⚠ ' + t)));
    res.sjalfkrafa.forEach((t) => boxur.appendChild(el('div', 'margin:4px 0;color:#475569', '✓ ' + t)));
  }

  // 1) Forskoðun undir eyðublaðinu.
  function festaVidForm(o) {
    try {
      const sb = o && o.sb, id = o && o.id, co = (o && o.co) || {}, lesa = o && o.lesaForm;
      if (!sb || !id || typeof lesa !== 'function') return;
      const ids = ['nf-nafn', 'nf-kt', 'nf-heimilisfang'];
      const heim = document.getElementById('nf-heimilisfang');
      if (!heim) return;
      let hint = document.getElementById('audkenni-forskodun');
      if (!hint) {
        hint = el('div', 'display:none;margin:10px 0;padding:10px 12px;border:1px solid #fcd34d;background:#fffbeb;border-radius:8px;font-size:12.5px;line-height:1.45');
        hint.id = 'audkenni-forskodun';
        const anchor = heim.closest('.form-row, .field, .modal-row, .nf-row') || heim.parentElement;
        if (!anchor || !anchor.parentElement) return;
        anchor.parentElement.insertBefore(hint, anchor.nextSibling);
      }
      let rod = 0;
      const keyra = async () => {
        const mynd = ++rod;
        const nytt = lesa();
        const m = munur(co, nytt);
        if (!eitthvad(m)) { hint.style.display = 'none'; hint.textContent = ''; return; }
        const res = await athuga(sb, id, co, nytt, false);
        if (mynd !== rod) return;                       // nýrra kall komið
        hint.textContent = '';
        if (!res || (!res.tharf.length && !res.sjalfkrafa.length)) { hint.style.display = 'none'; return; }
        hint.appendChild(el('div', 'font-weight:700;margin-bottom:2px;color:#78350f', 'Áður en þú vistar — hvað gerist við þessa breytingu:'));
        fyllaLinur(hint, res);
        hint.style.display = 'block';
      };
      ids.forEach((i) => {
        const x = document.getElementById(i);
        if (x && !x._audkenniWired) { x._audkenniWired = true; x.addEventListener('change', keyra); x.addEventListener('blur', keyra); }
      });
    } catch (_) { /* aldrei stöðva eyðublaðið */ }
  }

  // 2) Eftir vistun: kassi neðst á skjánum (hverfur aðeins með „Skilið“ þegar eitthvað þarf mannshönd).
  async function eftirVistun(sb, id, prev, vistad) {
    try {
      const m = munur(prev, vistad);
      if (!eitthvad(m)) return null;
      const res = await athuga(sb, id, prev, vistad, true);
      if (!res || (!res.tharf.length && !res.sjalfkrafa.length)) return null;
      const gamall = document.getElementById('audkenni-vidvorun');
      if (gamall) gamall.remove();
      const tharf = res.tharf.length > 0;
      const box = el('div', 'position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:100000;width:min(560px,94vw);max-height:60vh;overflow:auto;' +
        'padding:14px 16px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.28);font-size:13px;line-height:1.45;' +
        'background:' + (tharf ? '#fffbeb' : '#ecfdf5') + ';border:2px solid ' + (tharf ? '#f59e0b' : '#10b981'));
      box.id = 'audkenni-vidvorun';
      box.setAttribute('role', 'alert');
      box.appendChild(el('div', 'font-weight:800;font-size:14px;margin-bottom:4px;color:' + (tharf ? '#78350f' : '#065f46'),
        tharf ? 'Breytingin er vistuð — en þetta þarf mannshönd:' : 'Breytingin er vistuð og allt fylgdi með:'));
      fyllaLinur(box, res);
      const takki = el('button', 'margin-top:8px;padding:6px 14px;border:0;border-radius:8px;background:' + (tharf ? '#f59e0b' : '#10b981') + ';color:#fff;font-weight:700;cursor:pointer', 'Skilið');
      takki.type = 'button';
      takki.addEventListener('click', () => box.remove());
      box.appendChild(takki);
      document.body.appendChild(box);
      if (!tharf) setTimeout(() => { if (box.parentNode) box.remove(); }, 9000);
      return res;
    } catch (_) { return null; }
  }

  window.AudkenniVidvorun = { festaVidForm, eftirVistun, athuga, munur, _digits: digits };
})();
