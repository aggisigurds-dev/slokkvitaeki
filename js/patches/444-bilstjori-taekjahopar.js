/* === BÍLSTJÓRI: TÆKJAHÓPAR Á SPJALDTÖLVU (444) — 07.10.2026 ================
 *
 * Agnar: „setja nokkuð þægilegt tablet viðmót í anda Ársskoðun company profile …
 * en með meiri fókus bara á að geta hakað við tækin nokkuð þægilega“ — og
 * tæki eru FJÖLDI, ekki raðnúmer (project_taeki_eru_fjoldi).
 *
 * Tækjalistinn í fyrirtækjaspjaldi Bílstjóra (219 → #_bs-units) er eitt spjald
 * per tæki með fimm tökkum hvert: 19 tæki = 95 takkar og þrír skjáir af skruni.
 * Á ≥900 px leggst þetta ofan á: HÓPAR eftir tegund + stærð — „ABC Duft 6 kg × 12“
 * — með einum grænum „Haka við öll“, framvindustiku og teljurum Hleðsla · Nýtt ·
 * Ónýtt (− n +) sem taka frá úr hópnum. Örin ▾ sýnir tækin í hópnum eins og áður.
 *
 * ENGIN NÝ SKRIFLEIÐ. Hver aðgerð hér SMELLIR á takkana sem 219 teiknaði (._bs-uact,
 * ._bs-usvc, ._bs-uonytt) — sömu föll, sömu skrif (uttaeki.status um arsSave /
 * þjónustuval um 131), sama endurteikning. „Haka við öll“ smellir einu í einu og
 * bíður eftir endurteikningu 219 á milli, því ✓ Yfirfarið er async skrif.
 *
 * Síminn (<900 px) sér ekkert af þessu. Ekkert hreyfist í 219.
 * ========================================================================== */
(() => {
  if (window.__bsTaekjahopar444) return;
  window.__bsTaekjahopar444 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const LITIR = { duft: '#dc2626', co2: '#1f2530', vatn: '#dc2626', froda: '#dc2626', slang: '#6b7483', teppi: '#6b7483', annad: '#c99a3a' };

  function css() {
    const H = 'html body ._bs-sheet #_bs-hopar';
    return '@media (min-width:900px){' + [
      'html body ._bs-sheet._hopar-on #_bs-units{display:none!important}',
      'html body ._bs-sheet._hopar-on._hopar-opin #_bs-units{display:block!important}',
      'html body ._bs-sheet._hopar-opin #_bs-units .dev:not(._hop-syna){display:none!important}',
      H + '{display:flex;flex-direction:column;gap:8px;padding:10px 12px;font-family:' + SANS + '}',
      H + ' .hp-haus{display:flex;align-items:center;gap:12px;padding:4px 2px 6px}',
      H + ' .hp-haus .k{font-family:' + MONO + ';font-size:10px;letter-spacing:.16em;color:#6b7483}',
      H + ' .hp-haus .fr{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#11141c}',
      H + ' .hp-stika{width:140px;height:8px;border-radius:4px;background:#e4e8ee;overflow:hidden}',
      H + ' .hp-stika i{display:block;height:100%;background:linear-gradient(90deg,#23a35a,#7fe0a8)}',
      H + ' .hp-oll{margin-left:auto;height:38px;padding:0 14px;border-radius:8px;border:1px solid #0c5e30;background:linear-gradient(180deg,#1f9d5a,#0f6e3a);color:#fff;font:700 13px ' + SANS + ';cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
      H + ' .hp-oll:disabled{opacity:.55;cursor:default}',
      H + ' .hp{border-radius:10px;background:#fff;border:1px solid rgba(20,24,34,.14);box-shadow:0 1px 2px rgba(0,0,0,.05);overflow:hidden}',
      H + ' .hp._ok{border-color:#9bd7b2}',
      H + ' .hp-r{display:grid;grid-template-columns:34px minmax(0,1fr) 120px auto auto;align-items:center;gap:10px;padding:9px 10px}',
      H + ' .hp-ik{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f3f5f8;border:1px solid rgba(20,24,34,.12)}',
      H + ' .hp-nm{font-weight:700;font-size:14.5px;line-height:1.15;color:#11141c}',
      H + ' .hp-nm span{font-weight:500;color:#525b6b}',
      H + ' .hp-su{font-family:' + MONO + ';font-size:11px;color:#525b6b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      H + ' .hp-fr{display:flex;flex-direction:column;gap:4px}',
      H + ' .hp-fr .t{font-family:' + MONO + ';font-size:11px;color:#1f2530}',
      H + ' .hp-fr .t b{font-size:13px}',
      H + ' .hp-fr .hp-stika{width:auto;height:6px}',
      H + ' .hp-ok{height:44px;padding:0 14px;border-radius:9px;border:1px solid #0c5e30;background:linear-gradient(180deg,#1f9d5a,#0f6e3a);color:#fff;font:700 13.5px ' + SANS + ';cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
      H + ' .hp-ok._bu{background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#0f5c33;border-color:#9bd7b2}',
      H + ' .hp-ok:disabled{opacity:.5;cursor:default}',
      H + ' .hp-opna{width:38px;height:44px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:#fff;font-size:15px;color:#3a4250;cursor:pointer}',
      H + ' .hp-tel{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 10px 10px}',
      H + ' .tel{display:flex;align-items:center;height:42px;border-radius:9px;border:1px solid rgba(20,24,34,.18);background:#f7f8fa;overflow:hidden}',
      H + ' .tel .l{flex:1;padding:0 10px;font-size:12.5px;font-weight:700;color:#3a4250;white-space:nowrap}',
      H + ' .tel .l small{display:block;font-weight:500;font-size:10px;color:#6b7483}',
      H + ' .tel button{width:40px;height:42px;border:0;border-left:1px solid rgba(20,24,34,.14);background:#fff;font:700 18px ' + SANS + ';color:#1f2530;cursor:pointer}',
      H + ' .tel button:disabled{color:#c3cad6;cursor:default}',
      H + ' .tel b{width:32px;text-align:center;font-family:' + MONO + ';font-size:15px;border-left:1px solid rgba(20,24,34,.14);height:42px;display:inline-flex;align-items:center;justify-content:center;background:#fff}',
      H + ' .tel._on{border-color:#c99a3a;background:#fff8e8}' + H + ' .tel._on b{color:#8a5a0c}',
      H + ' .tel._nytt._on{border-color:#2563eb;background:#eef3ff}' + H + ' .tel._nytt._on b{color:#1d4ed8}',
      H + ' .tel._onytt._on{border-color:#c92a2a;background:#fff1f1}' + H + ' .tel._onytt._on b{color:#b42318}',
      H + ' .hp-verk{display:inline-flex;align-items:center;gap:5px;margin-top:3px;font-family:' + MONO + ';font-size:10.5px;color:#1d4ed8}',
      H + ' .hp-ars{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 10px;border-radius:10px;background:#fff;border:1px solid rgba(20,24,34,.14)}',
      H + ' .hp-ars .k{font-family:' + MONO + ';font-size:10px;letter-spacing:.16em;color:#6b7483;margin-right:4px}',
      H + ' .hp-ars .yr{display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 11px;border-radius:7px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font-family:' + MONO + ';font-size:12.5px;font-weight:700;color:#3a4250;cursor:pointer}',
      H + ' .hp-ars .yr::before{content:"";width:7px;height:7px;border-radius:50%;background:rgba(0,0,0,.14)}',
      H + ' .hp-ars .yr._lit{background:linear-gradient(180deg,#1f9d5a,#0f6e3a);color:#fff;border-color:#0c5e30}' + H + ' .hp-ars .yr._lit::before{background:#7df0b4;box-shadow:0 0 5px rgba(125,240,180,.9)}',
      H + ' .hp-ars .vinnsla{margin-left:auto;height:36px;padding:0 12px;border-radius:7px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font:700 12.5px ' + SANS + ';color:#1f2530;cursor:pointer}',
      H + ' .hp-ars .vinnsla._on{background:linear-gradient(180deg,#60a5fa,#2563eb 48%,#1e40af);color:#fff;border-color:#1e3a8a}',
      H + ' .hp-allt{display:flex;align-items:center;gap:8px;padding:4px 2px 0;font-size:12px;color:#525b6b}',
      H + ' .hp-allt button{height:30px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font:700 12px ' + SANS + ';color:#1f2530;cursor:pointer}',
      H + ' .hp-allt button._on{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;border-color:#000}',
    ].join('\n') + '}';
  }
  function injectCss() {
    if (document.getElementById('_bshopar-css')) return;
    const st = document.createElement('style'); st.id = '_bshopar-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* Lesa hvert tæki úr DOM 219 — stöður ERU takkarnir. */
  function lesa(units) {
    return Array.from(units.querySelectorAll('.dev')).map(d => {
      const name = (d.querySelector('.dev__name') || {}).textContent || 'Tæki';
      const meta = (d.querySelector('.dev__meta') || {}).textContent || '';
      const size = meta.split(' · ')[0] || '';
      const yf = d.querySelector('._bs-uact[data-act="yfirfarid"]');
      const vs = d.querySelector('._bs-uact[data-act="verkstaedi"]');
      const on = d.querySelector('._bs-uonytt');
      const svcOn = d.querySelector('._bs-usvc.is-on');
      return { el: d, key: name.trim() + '|' + size.trim(), name: name.trim(), size: size.trim(),
        yf: !!(yf && yf.classList.contains('is-on')), vs: !!(vs && vs.classList.contains('is-on')),
        onytt: !!(on && on.classList.contains('is-on')), svc: svcOn ? svcOn.dataset.v : 'yfirferd',
        btnYf: yf, btnOn: on, btnSvc: v => d.querySelector('._bs-usvc[data-v="' + v + '"]') };
    });
  }
  function litur(name) {
    const n = name.toLowerCase();
    if (/co2|co₂|kolsýr/.test(n)) return LITIR.co2;
    if (/slang|kefli/.test(n)) return LITIR.slang;
    if (/teppi/.test(n)) return LITIR.teppi;
    if (/duft|vatn|froð|frod/.test(n)) return LITIR.duft;
    return LITIR.annad;
  }
  const ikon = name => '<svg width="18" height="26" viewBox="0 0 20 28" aria-hidden="true"><path d="M7 3h6M10 3v3" stroke="#1f2530" stroke-width="2" stroke-linecap="round"/><rect x="4" y="6" width="12" height="20" rx="4" fill="' + litur(name) + '" stroke="#5a1212" stroke-width="1"/><rect x="6" y="12" width="8" height="6" rx="1" fill="#fff" opacity=".85"/></svg>';

  /* Félagið á spjaldinu: 219 skrifar kt. í haus spjaldsins — sama kt. finnur félagið í Companies.list. */
  function felag() {
    const sheet = document.querySelector('._bs-sheet'); if (!sheet) return null;
    const m = ((sheet.querySelector('.topbar') || {}).textContent || '').match(/kt.s*([d-]{6,11})/);
    const kt = m ? m[1].replace(/D/g, '') : '';
    if (!kt) return null;
    return ((window.Companies && Companies.list) || []).find(c => String(c.kennitala || '').replace(/D/g, '') === kt) || null;
  }
  function ars(c) { try { return (AppSettings.path('arsskodun_customers') || {})[String(c.id)] || {}; } catch (_) { return {}; } }
  // SAMA skrifleið og 219 arsSave(): AppSettings.save({ arsskodun_customers: { [id]: patch } }) — samstillt skrifstofa ↔ bílstjóri.
  async function arsSkrifa(c, patch) {
    try { const ok = await AppSettings.save({ arsskodun_customers: { [String(c.id)]: patch } }); if (!ok) throw new Error('save=false'); return true; }
    catch (e) { alert('Vistun mistókst — reyndu aftur. (' + (e.message || e) + ')'); return false; }
  }
  function arsHtml() {
    const c = felag(); if (!c) return '';
    const a = ars(c), cy = new Date().getFullYear();
    const last = +a.last_year_inspected || 0, vinnsla = +a.field_inspected_year === cy;
    const yrs = [cy - 4, cy - 3, cy - 2, cy - 1, cy].map(y => '<button type="button" class="yr' + (last === y ? ' _lit' : '') + '" data-hp="ar" data-y="' + y + '" title="Síðast farið ' + y + '">' + String(y).slice(2) + '</button>').join('');
    return '<div class="hp-ars"><span class="k">SÍÐAST FARIÐ</span>' + yrs +
      '<button type="button" class="vinnsla' + (vinnsla ? ' _on' : '') + '" data-hp="vinnsla">' + (vinnsla ? '🔵 Í vinnslu ' + cy + ' — taka úr' : 'Setja í vinnslu ' + cy) + '</button></div>';
  }

  let opnir = new Set();     // hópar sem sýna tækin sín (lifir milli endurteikninga)
  let syna = 'hopar';        // 'hopar' | 'taeki' — Agnar getur alltaf skipt í gamla listann
  let bid = false;           // „Haka við öll“ í gangi

  function teikna() {
    const sheet = document.querySelector('._bs-sheet');
    const units = document.getElementById('_bs-units');
    if (!sheet || !units) return;
    if (innerWidth < 900 || syna === 'taeki') {
      sheet.classList.remove('_hopar-on', '_hopar-opin');
      const g = document.getElementById('_bs-hopar'); if (g && syna !== 'taeki') g.remove();
      if (syna === 'taeki' && g) g.innerHTML = alltHtml(lesa(units));
      return;
    }
    const taeki = lesa(units);
    if (!taeki.length) { sheet.classList.remove('_hopar-on'); const g = document.getElementById('_bs-hopar'); if (g) g.remove(); return; }
    const hopar = [];
    taeki.forEach(t => { let h = hopar.find(x => x.key === t.key); if (!h) { h = { key: t.key, name: t.name, size: t.size, t: [] }; hopar.push(h); } h.t.push(t); });
    const yfA = taeki.filter(t => t.yf).length;
    let html = arsHtml() + '<div class="hp-haus"><span class="k">TÆKJALISTI</span><span class="fr">Yfirfarin ' + yfA + ' / ' + taeki.length +
      '<span class="hp-stika"><i style="width:' + Math.round(yfA / taeki.length * 100) + '%"></i></span></span>' +
      '<button class="hp-oll" type="button" data-hp="oll"' + (bid || yfA === taeki.length ? ' disabled' : '') + '>' + (bid ? '⏳ Haka við…' : 'Haka við öll sem yfirfarin') + '</button></div>';
    hopar.forEach(h => {
      const n = h.t.length, yf = h.t.filter(t => t.yf).length, vs = h.t.filter(t => t.vs).length;
      const hl = h.t.filter(t => !t.onytt && t.svc === 'hledsla').length, ny = h.t.filter(t => !t.onytt && t.svc === 'nyitt').length, on = h.t.filter(t => t.onytt).length;
      const allOk = yf === n;
      const afgr = yf + vs; // tæki sem hafa fengið stöðu
      const opinn = opnir.has(h.key);
      if (opinn) h.t.forEach(t => t.el.classList.add('_hop-syna')); else h.t.forEach(t => t.el.classList.remove('_hop-syna'));
      const serials = h.t.map(t => ((t.el.querySelector('.dev__meta') || {}).textContent || '').split(' · ')[1]).filter(Boolean);
      const sub = serials.length ? serials[0] + (serials.length > 1 ? ' … ' + serials[serials.length - 1] : '') : (h.size || '');
      const tel = (k, v, lbl, small, minus, plus) => '<div class="tel _' + k + (v ? ' _on' : '') + '"><span class="l">' + lbl + '<small>' + small + '</small></span>' +
        '<button type="button" data-hp="' + k + '-" data-key="' + esc(h.key) + '"' + (minus ? '' : ' disabled') + '>−</button><b>' + v + '</b>' +
        '<button type="button" data-hp="' + k + '+" data-key="' + esc(h.key) + '"' + (plus ? '' : ' disabled') + '>+</button></div>';
      html += '<div class="hp' + (afgr === n ? ' _ok' : '') + '">' +
        '<div class="hp-r"><span class="hp-ik">' + ikon(h.name) + '</span>' +
          '<div style="min-width:0"><div class="hp-nm">' + esc(h.name) + (h.size ? ' ' + esc(h.size) : '') + ' <span>× ' + n + '</span></div><div class="hp-su">' + esc(sub) + '</div>' +
            (vs ? '<span class="hp-verk">🔧 ' + vs + ' á verkstæði</span>' : '') + '</div>' +
          '<div class="hp-fr"><span class="t"><b>' + yf + '</b> / ' + n + ' yfirfarin</span><span class="hp-stika"><i style="width:' + Math.round(yf / n * 100) + '%"></i></span></div>' +
          '<button class="hp-ok' + (allOk ? ' _bu' : '') + '" type="button" data-hp="ok" data-key="' + esc(h.key) + '"' + (bid ? ' disabled' : '') + '>' + (allOk ? '✓ Öll yfirfarin' : '✓ Haka við öll ' + n) + '</button>' +
          '<button class="hp-opna" type="button" data-hp="opna" data-key="' + esc(h.key) + '" title="Sýna hvert tæki">' + (opinn ? '▴' : '▾') + '</button></div>' +
        '<div class="hp-tel">' +
          tel('hledsla', hl, 'Hleðsla', 'fara með í hleðslu', hl > 0, hl + ny + on < n) +
          tel('nytt', ny, 'Nýtt', 'selt í staðinn', ny > 0, hl + ny + on < n) +
          tel('onytt', on, 'Ónýtt', 'tekið úr umferð', on > 0, hl + ny + on < n) +
        '</div></div>';
    });
    html += alltHtml(taeki);
    let box = document.getElementById('_bs-hopar');
    if (!box) { box = document.createElement('div'); box.id = '_bs-hopar'; units.parentNode.insertBefore(box, units); box.addEventListener('click', smellur); }
    if (box._h !== html) { box.innerHTML = html; box._h = html; }
    sheet.classList.add('_hopar-on');
    sheet.classList.toggle('_hopar-opin', opnir.size > 0);
  }
  function alltHtml(taeki) {
    return '<div class="hp-allt">Sýn: <button type="button" data-hp="syn" data-v="hopar"' + (syna === 'hopar' ? ' class="_on"' : '') + '>Hópar</button>' +
      '<button type="button" data-hp="syn" data-v="taeki"' + (syna === 'taeki' ? ' class="_on"' : '') + '>Hvert tæki (' + taeki.length + ')</button></div>';
  }

  /* Bíða eftir að 219 endurteikni #_bs-units (draw() skiptir um innerHTML). */
  function bidaTeikningar() {
    return new Promise(res => {
      const units = document.getElementById('_bs-units'); if (!units) return res();
      const mo = new MutationObserver(() => { mo.disconnect(); res(); });
      mo.observe(units, { childList: true });
      setTimeout(() => { mo.disconnect(); res(); }, 4000);
    });
  }
  async function hakaVidOll(key) {
    if (bid) return;
    bid = true; teikna();
    try {
      for (let i = 0; i < 200; i++) {
        const units = document.getElementById('_bs-units'); if (!units) break;
        const t = lesa(units).find(x => (!key || x.key === key) && !x.yf && !x.vs && x.btnYf);
        if (!t) break;
        const p = bidaTeikningar();
        t.btnYf.click();
        await p; await sleep(40);
      }
    } finally { bid = false; teikna(); }
  }
  function smellur(e) {
    const b = e.target.closest('[data-hp]'); if (!b) return;
    e.stopPropagation();
    const a = b.dataset.hp, key = b.dataset.key;
    if (a === 'syn') { syna = b.dataset.v; teikna(); return; }
    if (a === 'ar' || a === 'vinnsla') {
      const c = felag(); if (!c) return;
      const cur = ars(c), cy = new Date().getFullYear();
      b.disabled = true;
      const patch = a === 'ar'
        ? { last_year_inspected: (+cur.last_year_inspected === +b.dataset.y) ? 0 : +b.dataset.y }   // sama ár aftur → afhaka
        : { field_inspected_year: (+cur.field_inspected_year === cy) ? 0 : cy };
      arsSkrifa(c, patch).then(() => { try { if (window.Bilstjori && Bilstjori.renderList) Bilstjori.renderList(); } catch (_) {} const box = document.getElementById('_bs-hopar'); if (box) box._h = null; teikna(); });
      return;
    }
    if (a === 'opna') { if (opnir.has(key)) opnir.delete(key); else opnir.add(key); teikna(); return; }
    if (a === 'oll') { hakaVidOll(null); return; }
    if (a === 'ok') {
      const units = document.getElementById('_bs-units'); const h = lesa(units).filter(x => x.key === key);
      if (h.length && h.every(x => x.yf)) { // afhaka: 219 víxlar is-on → óskoðað við smell á virkan takka
        (async () => { bid = true; teikna(); try { for (const t of h) { const p = bidaTeikningar(); t.btnYf.click(); await p; await sleep(40); } } finally { bid = false; teikna(); } })();
      } else hakaVidOll(key);
      return;
    }
    const units = document.getElementById('_bs-units'); const h = lesa(units).filter(x => x.key === key);
    const k = a.slice(0, -1), d = a.slice(-1);
    if (k === 'onytt') {
      const t = d === '+' ? h.find(x => !x.onytt && x.svc === 'yfirferd') || h.find(x => !x.onytt) : h.slice().reverse().find(x => x.onytt);
      if (t && t.btnOn) t.btnOn.click();
    } else {
      const v = k === 'nytt' ? 'nyitt' : 'hledsla';
      const t = d === '+' ? h.find(x => !x.onytt && x.svc === 'yfirferd') : h.slice().reverse().find(x => !x.onytt && x.svc === v);
      const btn = t && t.btnSvc(d === '+' ? v : 'yfirferd');
      if (btn) btn.click();
    }
    // svcSet + draw() í 219 eru samstillt — vaktin hér fyrir neðan teiknar hópana upp á nýtt
  }

  let t = null;
  function puls() { clearTimeout(t); t = setTimeout(() => { try { teikna(); } catch (e) { console.warn('[444]', e); } }, 30); }
  function start() {
    injectCss();
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO(ms => {
      for (const m of ms) {
        if (m.type !== 'childList') continue;
        const tgt = m.target;
        if (tgt.id === '_bs-units' || (tgt.closest && tgt.closest('._bs-sheet') && !tgt.closest('#_bs-hopar')) || Array.from(m.addedNodes).some(n => n.nodeType === 1 && (n.classList.contains('_bs-sheet') || n.querySelector && n.querySelector('#_bs-units')))) { puls(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
    // is-on klasarnir breytast án childList (uact smellur → draw() skiptir þó um innerHTML; usvc líka) — attribute-vakt til öryggis
    new MO(() => puls()).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    addEventListener('resize', puls);
    puls();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1200));
  else setTimeout(start, 1200);
  console.log('[444] Bílstjóri: tækjahópar á spjaldtölvu');
})();
