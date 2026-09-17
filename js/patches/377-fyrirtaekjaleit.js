/* === FYRIRTÆKJALEIT Í TILBOÐSFORM v1 ===
 *
 * Agnar 17.09.2026: „Mátt í bæði slökkvitæki - Tilboð og brunakerfi- tilboð setja
 * góðan fyrirtækjaleitar glugga sem fynnur fyrirtæki í rsk eða keldan.. Keldan
 * næstum betri hægt að finna með heimilisfangi þar."
 *
 * Áður: aðeins „🔍 Fletta upp" sem krafðist þess að kennitalan væri þegar slegin
 * inn. Það hjálpar ekki þegar maður veit nafnið en ekki kennitöluna — sem er
 * venjulega tilfellið.
 *
 * Nú: skrifaðu í Viðskiptavinur-reitinn og listi opnast með TVEIMUR heimildum:
 *
 *   1. OKKAR KÚNNAR (Companies.list, 1.189 staðir) — engin netsókn, birtist
 *      strax, og leitar líka í HEIMILISFANGI. Það er einmitt það sem Agnar sagði
 *      að Keldan gerði betur, og við eigum gögnin sjálf.
 *   2. FYRIRTÆKJASKRÁ RSK (/api/kt-lookup?nafn=) — opinbera skráin, sótt með
 *      300 ms töf svo hver stafur kalli ekki.
 *
 * Keldan er ekki sótt: hún er lokuð áskriftarþjónusta, RSK er opinbera heimildin
 * og hana höfum við þegar. Sama regla og gildir um Já.is.
 *
 * Val fyllir nafn, kennitölu og heimilisfang og sendir `input`-atburð á hvern
 * reit svo formið sem á þá reikni sig upp á nýtt.
 *
 * Opinbert viðmót:
 *   window.FyrirtaekjaLeit.tengja(nafnReitur, { kt, addr })
 *     - nafnReitur : <input> (eða id)
 *     - kt, addr   : valfrjálsir <input> (eða id) sem fyllast með
 */
(() => {
  if (window.FyrirtaekjaLeit) return;

  const el = (x) => (typeof x === 'string' ? document.getElementById(x) : x) || null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Íslensk fletting: broddar og sérstafir mega ekki stoppa leit.
  const fold = (s) => String(s || '').toLocaleLowerCase('is').normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  const tolur = (s) => String(s || '').replace(/\D/g, '');
  const ktSnid = (s) => { const d = tolur(s); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (s || ''); };

  let box = null, virkur = null, valid = -1, radir = [], sidastLeit = '', timer = 0;

  function loka() {
    if (box) { box.remove(); box = null; }
    virkur = null; valid = -1; radir = [];
    window.removeEventListener('scroll', setja, true);
    window.removeEventListener('resize', setja);
  }

  function setja() {
    if (!box || !virkur) return;
    const r = virkur.getBoundingClientRect();
    box.style.left = r.left + 'px';
    box.style.top = (r.bottom + 2) + 'px';
    box.style.width = Math.max(320, r.width) + 'px';
  }

  function teikna() {
    if (!box) return;
    if (!radir.length) { box.innerHTML = '<div class="fl-tom">Ekkert fannst</div>'; return; }
    let haus = '';
    box.innerHTML = radir.map((r, i) => {
      const nyrHaus = r.hluti !== haus ? '<div class="fl-haus">' + esc(r.hluti) + '</div>' : '';
      haus = r.hluti;
      return nyrHaus
        + '<div class="fl-rod' + (i === valid ? ' val' : '') + (r.afskrad ? ' afskrad' : '') + '" data-i="' + i + '">'
        +   '<div class="fl-nafn">' + esc(r.nafn) + (r.afskrad ? '<span class="fl-merki">afskráð</span>' : '') + '</div>'
        +   '<div class="fl-undir">' + esc([r.kt ? 'kt. ' + ktSnid(r.kt) : '', r.addr].filter(Boolean).join(' · ') || '—') + '</div>'
        + '</div>';
    }).join('');
    box.querySelectorAll('.fl-rod').forEach((d) => {
      d.onmousedown = (e) => { e.preventDefault(); velja(+d.dataset.i); };
    });
  }

  function velja(i) {
    const r = radir[i];
    if (!r || !virkur) return;
    const m = virkur._flMid || {};
    const setInn = (node, gildi) => {
      if (!node || gildi == null || gildi === '') return;
      node.value = gildi;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setInn(virkur, r.nafn);
    setInn(el(m.kt), r.kt ? ktSnid(r.kt) : '');
    setInn(el(m.addr), r.addr);
    loka();
  }

  async function leita(q) {
    const f = fold(q), d = tolur(q);
    const okkar = [];
    const listi = (window.Companies && Array.isArray(Companies.list)) ? Companies.list : [];
    for (const c of listi) {
      if (okkar.length >= 6) break;
      const nafn = String(c.nafn || ''), adr = String(c.heimilisfang || ''), kt = String(c.kennitala || '');
      // Leitar í nafni, heimilisfangi OG kennitölu — heimilisfangið er það sem
      // Agnar saknaði og það er aðeins til hjá okkur, ekki í nafnleit RSK.
      if (fold(nafn).indexOf(f) < 0 && fold(adr).indexOf(f) < 0 && !(d.length >= 3 && tolur(kt).indexOf(d) >= 0)) continue;
      okkar.push({ hluti: 'Okkar kúnnar', nafn, kt, addr: adr });
    }
    radir = okkar;
    valid = radir.length ? 0 : -1;
    teikna();

    if (q.trim().length < 2) return;
    let skra = [];
    try {
      const r = await fetch('/api/kt-lookup?nafn=' + encodeURIComponent(q.trim()));
      const j = await r.json();
      skra = Array.isArray(j.results) ? j.results : [];
    } catch (_) { /* engin skrá er ekki villa — okkar kúnnar standa */ }
    if (sidastLeit !== q || !box) return;                 // notandinn hélt áfram að skrifa
    const komid = new Set(okkar.map((x) => tolur(x.kt)).filter(Boolean));
    radir = okkar.concat(skra.filter((x) => !komid.has(tolur(x.kennitala))).slice(0, 8).map((x) => ({
      hluti: 'Fyrirtækjaskrá', nafn: x.nafn, kt: x.kennitala, addr: x.heimilisfang_full || '', afskrad: !!x.afskrad,
    })));
    if (valid < 0 && radir.length) valid = 0;
    teikna();
  }

  function opna(inp) {
    if (box && virkur === inp) return;
    loka();
    virkur = inp;
    box = document.createElement('div');
    box.className = 'fl-box';
    box.style.cssText = 'position:fixed;z-index:100001;max-height:320px;overflow:auto;background:#fff;'
      + 'border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 14px 34px rgba(15,23,42,.22);font:inherit';
    document.body.appendChild(box);
    setja();
    window.addEventListener('scroll', setja, true);
    window.addEventListener('resize', setja);
  }

  function tengja(nafnReitur, mid) {
    const inp = el(nafnReitur);
    if (!inp || inp._flTengt) return;
    inp._flTengt = true;
    inp._flMid = mid || {};
    inp.setAttribute('autocomplete', 'off');

    inp.addEventListener('input', () => {
      const q = inp.value;
      sidastLeit = q;
      clearTimeout(timer);
      if (q.trim().length < 2) { loka(); return; }
      opna(inp);
      box.innerHTML = '<div class="fl-tom">Leita…</div>';
      timer = setTimeout(() => { if (sidastLeit === q) leita(q); }, 300);
    });
    inp.addEventListener('keydown', (e) => {
      if (!box) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!radir.length) return;
        valid = (valid + (e.key === 'ArrowDown' ? 1 : -1) + radir.length) % radir.length;
        teikna();
        const v = box.querySelector('.fl-rod.val'); if (v) v.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (valid >= 0) { e.preventDefault(); velja(valid); }
      } else if (e.key === 'Escape') { loka(); }
    });
    inp.addEventListener('blur', () => setTimeout(loka, 120));
  }

  const CSS = '.fl-box .fl-haus{padding:6px 11px 3px;font-size:10px;font-weight:700;letter-spacing:.06em;'
    + 'text-transform:uppercase;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #eef2f7}'
    + '.fl-box .fl-rod{padding:7px 11px;cursor:pointer;border-bottom:1px solid #f1f5f9}'
    + '.fl-box .fl-rod:hover,.fl-box .fl-rod.val{background:#fff7ed}'
    + '.fl-box .fl-rod.afskrad{opacity:.55}'
    + '.fl-box .fl-nafn{font-size:13px;font-weight:600;color:#0f172a}'
    + '.fl-box .fl-undir{font-size:11.5px;color:#64748b;margin-top:1px}'
    + '.fl-box .fl-merki{margin-left:6px;font-size:10px;font-weight:700;color:#b91c1c;background:#fee2e2;'
    + 'border-radius:4px;padding:1px 5px;vertical-align:middle}'
    + '.fl-box .fl-tom{padding:10px 12px;font-size:12.5px;color:#94a3b8}';
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  window.FyrirtaekjaLeit = { tengja, loka };
})();
/* === END FYRIRTÆKJALEIT === */
