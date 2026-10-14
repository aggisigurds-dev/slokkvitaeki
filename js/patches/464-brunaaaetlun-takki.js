/* 464 — BRUNAÁÆTLUN-TAKKI Á FYRIRTÆKJAPRÓFÍL (13.10.2026)
 *
 * Opnar smiðinn /brunaaaetlun/?fyrirtaeki=<id> í nýjum flipa: viðbragðs- og rýmingaráætlun, eigið eldvarnaeftirlit,
 * flóttaáætlanir (IS/EN, ein á hvert herbergi), SHS-samningur og gátlistar — reitir, textar og merkingar á teikningu
 * hverrar hæðar (teikning_bord) eru fylltar þar og geymdar í töflunni brunaaaetlun. Agnar 13.10.2026: „útbúa form
 * generator sem við getum sett inn fleiri merkingum … svo við getum klárað svona sjálf".
 *
 * Sama mynstur og 370 (Hreyfingaryfirlit): á tölvu í Brunastáli situr takkinn í .co-banner .b405-knappar, annars í
 * takkaröðinni. 464 á hnútinn og staðinn; setja() skrifar ekkert ef takkinn er þegar á réttum stað. 462 kallar á
 * setja() í sama tifi og borðinn teiknast (SKREF), svo takkinn hoppar ekki inn eftir á.
 */
(() => {
  if (window.BrunaaaetlunTakki) return;
  const KLASI = '_ba-takki';

  function opna(coId) { window.open('/brunaaaetlun/?fyrirtaeki=' + encodeURIComponent(coId), '_blank', 'noopener'); }

  function setja() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const rod = main.querySelector('div[data-co-id]:not(._cat-section)');
    if (!rod) return;
    const coId = rod.getAttribute('data-co-id');
    if (!/^\d+$/.test(String(coId || ''))) return;
    setjaLinu(coId);
    if (!main.querySelector('.co-banner .b405-knappar') && window.Efsta405 && Efsta405.scope()) { try { Efsta405.tick(); } catch (_) {} }
    const heim = main.querySelector('.co-banner .b405-knappar') || rod;
    const til = main.querySelector('.' + KLASI);
    if (til && til.dataset.co === coId && til.parentElement === heim) return;
    if (til) til.remove();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm ' + KLASI + (heim !== rod ? ' b405-knappur' : '');
    b.dataset.co = coId;
    b.title = 'Brunaáætlun — viðbragðs- og rýmingaráætlun, eigið eldvarnaeftirlit og flóttaáætlanir (opnast í nýjum flipa)';
    b.setAttribute('aria-label', 'Brunaáætlun');
    if (heim !== rod) {
      // Í spjaldinu er takkaröðin 428 px og brotnar aldrei (411) — orðið myndi stytta Þjónustusamning og Hreyfingaryfirlit
      // með „…". Hér er því aðeins tákn (útgangur) í fastri breidd; inline !important vinnur flex-reglu 411.
      b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="3" width="11" height="18" rx="1"/><circle cx="17.5" cy="6.5" r="1.6"/><path d="M17 9.5l-2 4 3 2 1 4M15 13.5l-3-1M18 15.5l3-1"/></svg>';
      b.style.setProperty('flex', '0 0 auto', 'important');
      b.style.setProperty('padding', '0 10px', 'important');
    } else b.textContent = 'Brunaáætlun';
    b.addEventListener('click', () => opna(coId));
    heim.appendChild(b);
  }

  // ── Rýmingaráætlun-reitur í upplýsingagrindinni (Agnar 14.10.2026: „takki hægra megin við Hús og undir Teikningum
  // sem heitir Rýmingaráætlun … og sé þá til fyrir öll fyrirtæki í þjónustu á sama stað"). Bein .co-bupp > ._bupp-lina
  // tekur tvo af fjórum dálkum (411), og sest beint á eftir Hús-hópnum (._fasteign, display:contents) eða Teikningum.
  // 464 á hnútinn; hann er aðeins færður sé hann á röngum stað, og textinn uppfærður í SAMA hnút (engin endurbygging).
  const LINA = '_ba-lina';
  const _stada = new Map();          // coId -> 'saeki' | 'engin' | ISO-dags síðustu vistunar
  function iThjonustu(coId) {
    try { const c = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId); return !!(c && c.er_i_thjonustu === true); }
    catch (_) { return false; }
  }
  function dagsStutt(iso) { const d = new Date(iso); return isNaN(d) ? '' : ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function textiFyrir(coId) {
    const s = _stada.get(String(coId));
    if (!s || s === 'saeki') return 'Opna';
    if (s === 'engin') return 'Hefja áætlun';
    return 'Opna · vistuð ' + dagsStutt(s);
  }
  function saekjaStodu(coId) {
    const k = String(coId);
    if (_stada.has(k)) return;
    _stada.set(k, 'saeki');
    const sb = window.DB && DB.sb;
    if (!sb) return;
    Promise.resolve(sb.from('brunaaaetlun').select('updated_at').eq('company_id', +coId).maybeSingle()).then(r => {
      if (r && r.error) { _stada.delete(k); return; }
      _stada.set(k, r && r.data && r.data.updated_at ? r.data.updated_at : 'engin');
      const t = document.querySelector('.co-bupp .' + LINA + '[data-co="' + k + '"] ._ba-lina-takki');
      if (t) t.textContent = textiFyrir(k);
    }).catch(() => _stada.delete(k));
  }
  function setjaLinu(coId) {
    const box = document.querySelector('#companies-main .co-bupp[data-co="' + coId + '"]');
    const til = document.querySelectorAll('.co-bupp .' + LINA);
    til.forEach(n => { if (!box || n.parentElement !== box || n.dataset.co !== String(coId)) n.remove(); });
    if (!box || !iThjonustu(coId)) { if (box) { const n = box.querySelector(':scope > .' + LINA); if (n) n.remove(); } return; }
    let el = box.querySelector(':scope > .' + LINA);
    if (!el) {
      el = document.createElement('div');
      el.className = '_bupp-lina ' + LINA;
      el.dataset.co = String(coId);
      el.innerHTML = '<span class="_bupp-merki">Rýmingaráætlun</span><button type="button" class="_ba-lina-takki" title="Opnar Brunaáætlunar-smiðinn í nýjum flipa: rýmingaráætlun, eigið eldvarnaeftirlit og flóttaáætlanir">' + textiFyrir(coId) + '</button>';
      el.querySelector('button').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); opna(coId); });
    }
    const fyrir = box.querySelector(':scope > ._fasteign') || box.querySelector(':scope > ._serupp') || box.querySelector(':scope > ._bupp-teikn-lina');
    if (fyrir) { if (fyrir.nextElementSibling !== el) fyrir.insertAdjacentElement('afterend', el); }
    else {
      const oskrad = box.querySelector(':scope > .b411-oskrad');
      if (oskrad) { if (oskrad.previousElementSibling !== el) oskrad.insertAdjacentElement('beforebegin', el); }
      else if (el.parentElement !== box) box.appendChild(el);
    }
    saekjaStodu(coId);
  }
  function stilarLinu() {
    if (document.getElementById('_ba-lina-css')) return;
    const s = document.createElement('style');
    s.id = '_ba-lina-css';
    s.textContent =
      '.co-bupp button._ba-lina-takki{margin:0!important;padding:0 2px!important;border:0!important;background:none!important;box-shadow:none!important;' +
      'font:inherit!important;font-size:11.5px!important;font-weight:600!important;line-height:19px!important;color:#b3211c!important;' +
      'text-decoration:underline!important;text-underline-offset:3px!important;cursor:pointer!important;white-space:nowrap!important;' +
      'overflow:hidden!important;text-overflow:ellipsis!important;min-width:0!important}' +
      '.co-bupp button._ba-lina-takki:hover{color:#141822!important}';
    (document.head || document.documentElement).appendChild(s);
  }
  stilarLinu();

  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) return false;
    new MutationObserver(setja).observe(main, { childList: true });
    let _t = 0;
    new MutationObserver(() => { clearTimeout(_t); _t = setTimeout(() => { const c = main.querySelector('.co-bupp[data-co]'); if (c) setjaLinu(c.getAttribute('data-co')); }, 30); })
      .observe(main, { childList: true, subtree: true });
    setja();
    return true;
  }
  if (!vakta()) document.addEventListener('DOMContentLoaded', vakta, { once: true });
  // #companies-main er skipt út eftir ræsingu (sjá 370) — tifarinn kostar eitt querySelector og skrifar ekkert í kyrrstöðu.
  setInterval(() => {
    const v = document.getElementById('view-companies');
    if (v && !v.classList.contains('active')) return;
    setja();
  }, 1200);

  window.BrunaaaetlunTakki = { opna, setja };
})();
