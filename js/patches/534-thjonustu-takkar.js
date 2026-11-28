/* === 534 — ÞJÓNUSTU-TAKKAR Á FYRIRTÆKJAPRÓFÍLNUM — 26.11.2026 =====================================================
 *
 * Agnar 26.11.2026: „vil bara helvítis takka bæta í þjónustu í brunakerfinu og slökkvikerfinu." Hann stóð á prófíl
 * Völuteigs 29 og fann enga leið til að setja eignina SJÁLFUR í Slökkvitækjaþjónustu eða Brunakerfisþjónustu — „+ Bæta
 * við þjónustu" opnaði bara kerfaskráninguna (450), sem er annað (hvaða kerfi eru til staðar), ekki þjónustuaðild.
 *
 * Þessi patch bætir EINNI rönd efst á prófílinn (beint undir hausnum) með tveimur hnöppum:
 *   ＋ Slökkvitækjaþjónusta   ·   ＋ Brunakerfisþjónusta
 * Smellur skráir/fjarlægir eignina úr þjónustunni — NÁKVÆMLEGA sama vistun og 157 `toggleService`:
 *   ars → AppSettings.arsskodun_customers  (equipment-hluturinn er það sem _hasArs les)
 *   bk  → AppSettings.brunakerfi_customers
 * Er eignin þegar í þjónustu sýnir hnappurinn „✓ … í þjónustu" og smellur fjarlægir hana (með staðfestingu).
 *
 * Sjálfstætt: engin breyting á 500. Röndin er beint barn #companies-main án `data-p2t`, svo hún sést á ÖLLUM flipum
 * (merkja() í 500 lætur óþekkt spjöld í friði). inline order:1 → undir haus, ofan við flipaefnið.
 * ================================================================================================================ */
(() => {
  if (window.__thjonustuTakkar534) return;
  window.__thjonustuTakkar534 = true;

  const ID = '_svc534';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const AS = () => window.AppSettings;

  const opidFid = () => {
    const n = parseInt(window._currentCompanyId != null ? window._currentCompanyId : (window.Companies && Companies.currentId), 10);
    return isFinite(n) && n > 0 ? n : null;
  };
  const company = (fid) => ((window.Companies && Companies.list) || []).find((c) => +c.id === +fid) || null;

  /* ── AÐILD (sama rök og 157 _hasArs / _hasBru) ──────────────────────────────────────────────────────────── */
  function inBk(fid) {
    const m = (AS() && AS().path && AS().path('brunakerfi_customers')) || {};
    return !!m[String(fid)];
  }
  function inArs(fid) {
    const c = company(fid);
    if (c && c.er_i_thjonustu === true) return true;
    const m = (AS() && AS().path && AS().path('arsskodun_customers')) || {};
    const a = m[String(fid)];
    if (!a) return false;
    if (a.removed_from_service_at || a.subscribed === false) return false;
    return a.subscribed === true || (!!a.equipment && typeof a.equipment === 'object');
  }

  /* ── VISTUN — nákvæmlega eins og 158 toggleService ──────────────────────────────────────────────────────────
   * ars: AppSettings.arsskodun_customers (equipment-blobbið) OG per-röð skrif á fyrirtaeki.er_i_thjonustu — það er
   *      HIÐ raunverulega þjónustuflokks-merki (153:595), ónæmt fyrir stale settings-blobbi annarrar vélar.
   * bk:  AppSettings.brunakerfi_customers. null fjarlægir (deepMerge fjarlægir ekki lykil).
   * Þröngur patch: AÐEINS þetta félag fer í vistun. */
  async function toggle(fid, svc, add) {
    if (!AS() || !AS().save) { alert('AppSettings ekki tilbúið'); return false; }
    const KEY = svc === 'ars' ? 'arsskodun_customers' : 'brunakerfi_customers';
    const map = Object.assign({}, (AS().path && AS().path(KEY)) || {});
    const cur = map[String(fid)] || {};
    if (add) {
      if (svc === 'ars') {
        map[String(fid)] = Object.assign({}, cur, {
          equipment: cur.equipment || {},
          inspect_month: cur.inspect_month || 0,
          last_year_inspected: cur.last_year_inspected || 0,
        });
      } else {
        map[String(fid)] = Object.assign({}, cur, {
          co_id: +fid,
          inspect_month: cur.inspect_month || 0,
          unit_count: cur.unit_count || 0,
        });
      }
    } else {
      map[String(fid)] = null;   // null = „ekki í þjónustu" (_hasArs krefst .equipment, _hasBru er !!gildi)
    }
    let ok;
    try { ok = (await AS().save({ [KEY]: map })) !== false; }
    catch (_) { ok = false; }
    if (!ok) return false;
    // Slökkvitækjaþjónusta lifir LÍKA á fyrirtaeki.er_i_thjonustu (158:470) — per-röð skrif sem stale blob annarrar
    // vélar getur ekki yfirskrifað. Án þessa stæði eignin áfram „í þjónustu" (flaggið satt) þótt blobbið væri hreinsað.
    if (svc === 'ars') {
      try {
        const sb = window.DB && window.DB.sb;
        if (sb) {
          const r = await sb.from('fyrirtaeki').update({ er_i_thjonustu: add }).eq('id', fid);
          if (r && r.error) throw r.error;
          const c = company(fid); if (c) c.er_i_thjonustu = add;   // speglað í minni → 157/153 listar sýna strax
          try { await sb.from('override_log').insert({ co_id: +fid, co_nafn: (company(fid) || {}).nafn || null, field: 'er_i_thjonustu', old_value: String(!add), new_value: String(add), page: 'thjonustu-takkar' }); } catch (_) {}
        }
      } catch (e) { console.warn('[534] er_i_thjonustu', e); return false; }
    }
    return true;
  }

  /* ── CSS ────────────────────────────────────────────────────────────────────────────────────────────────── */
  function injectCss() {
    if (document.getElementById(ID + '-css')) return;
    const st = document.createElement('style'); st.id = ID + '-css';
    st.textContent = [
      '#' + ID + '{order:1;display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:10px 0;padding:9px 13px;' +
        'background:linear-gradient(180deg,#f4f6f9,#e5e9ef);border-radius:11px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 0 0 1px rgba(20,24,34,.12);font-family:' + SANS + '}',
      '#' + ID + ' .svc-lbl{font:600 11px ' + MONO + ';letter-spacing:.15em;text-transform:uppercase;color:#5a6472;margin-right:2px}',
      '#' + ID + ' .svc-b{cursor:pointer;border-radius:9px;padding:9px 15px;font:700 13.5px ' + SANS + ';border:1.5px solid;display:inline-flex;align-items:center;gap:7px;transition:filter .12s}',
      '#' + ID + ' .svc-b:hover{filter:brightness(1.05)}',
      '#' + ID + ' .svc-b:disabled{opacity:.6;cursor:default}',
      '#' + ID + ' .svc-b.off[data-svc="ars"]{background:#fff;color:#15733a;border-color:#bcd9c6}',
      '#' + ID + ' .svc-b.off[data-svc="bk"]{background:#fff;color:#9a1c1c;border-color:#e6c2c2}',
      '#' + ID + ' .svc-b.on{color:#fff;border-color:transparent;box-shadow:0 2px 5px rgba(10,14,22,.18)}',
      // 28.11.2026 (Agnar: „laga litinn í Slökkvitækjaþjónusta í svona dýpri dark metal lit"): flati græni liturinn varð dökkur
      // grænn málmur — SAMI 145° halli og Sækja/Búnaðargreining annars staðar í appinu (SAEKJA). Brunakerfið fær dökkrauðan málm
      // (BSTAL) svo parið haldist samstætt. Staðan stendur áfram í orðunum („✓ Í … þjónustu"), liturinn er aldrei eini burðarmaðurinn.
      '#' + ID + ' .svc-b.on[data-svc="ars"]{background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);border-color:rgba(52,168,98,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      '#' + ID + ' .svc-b.on[data-svc="bk"]{background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);border-color:rgba(190,32,28,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 14px -5px rgba(160,16,16,.55),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      // Búnaðargreining flutt hingað af myndinni (Agnar, skjáskot með ör) — hlutlaus dökkur málmur: þetta er AÐGERÐ, ekki þjónustustaða.
      '#' + ID + ' .svc-b.bgr{background:linear-gradient(180deg,#3d4048,#1c1e23);color:#eef1f4;border-color:#000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.35)}',
      '@media (max-width:560px){#' + ID + ' .svc-b{flex:1 1 100%;justify-content:center;padding:12px 15px}}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── TEIKNING ───────────────────────────────────────────────────────────────────────────────────────────── */
  function btnHtml(fid) {
    const a = inArs(fid), b = inBk(fid);
    return '<span class="svc-lbl">Þjónusta</span>' +
      '<button type="button" class="svc-b ' + (a ? 'on' : 'off') + '" data-svc="ars" data-add="' + (a ? '0' : '1') + '">' +
        (a ? '✓ Í slökkvitækjaþjónustu' : '＋ Slökkvitækjaþjónusta') + '</button>' +
      '<button type="button" class="svc-b ' + (b ? 'on' : 'off') + '" data-svc="bk" data-add="' + (b ? '0' : '1') + '">' +
        (b ? '✓ Í brunakerfisþjónustu' : '＋ Brunakerfisþjónusta') + '</button>' +
      // data-p2="bgr": 500 hlustar á smelli á #companies-main og opnar greininguna (umbod → #bgr-takki) — engin ný rök hér.
      '<button type="button" class="svc-b bgr" data-p2="bgr">Búnaðargreining</button>';
  }
  function fylla(bar, fid) {
    const h = btnHtml(fid);
    if (bar._svc !== h) { bar._svc = h; bar.innerHTML = h; }
    bar.dataset.fid = String(fid);
  }

  function tengja(bar) {
    bar.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-svc]');
      if (!b || !bar.contains(b) || b.disabled) return;
      const fid = opidFid(); if (!fid) return;
      const svc = b.dataset.svc, add = b.dataset.add === '1';
      const label = svc === 'ars' ? 'slökkvitækjaþjónustu' : 'brunakerfisþjónustu';
      const name = (company(fid) || {}).nafn || ('fyrirtæki ' + fid);
      if (!window.confirm((add ? 'Skrá „' + name + '" í ' : 'Fjarlægja „' + name + '" úr ') + label + '?' +
        (add ? '' : '\n\n(Gögn um búnað haldast — bara þjónustumerkið fer.)'))) return;
      const fyrriTexti = b.textContent;
      b.disabled = true; b.textContent = 'Vista…';
      const ok = await toggle(fid, svc, add);
      if (!ok) {
        b.disabled = false; b.textContent = fyrriTexti;
        alert('Vista mistókst — reyndu aftur.');
        return;
      }
      if (window.Toast && Toast.show) Toast.show((add ? '✓ Skráð í ' : 'Fjarlægt úr ') + label);
      fylla(bar, fid);   // les ferska aðild úr AppSettings → hnappur flettist
    });
  }

  /* ── FESTING Á PRÓFÍLINN (sama mynstur og 450) ──────────────────────────────────────────────────────────── */
  function festa() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const banner = main.querySelector(':scope > .co-banner');
    if (!banner) return;                       // ekki prófíll (listinn) — röndin á ekki heima þar
    const fid = opidFid();
    if (!fid) return;
    injectCss();
    let bar = document.getElementById(ID);
    if (!bar || bar.parentNode !== main) {
      if (bar) bar.remove();
      bar = document.createElement('div');
      bar.id = ID;
      tengja(bar);
    }
    // 500 raðar börnum #companies-main með `order` (haus=1, KPI=2 …) og regla þess ber hærri specificity en #id í
    // stílblaði — svo röðin verður að koma INLINE (vinnur alltaf). order:1 = með hausnum, strax ofan við KPI-spjöldin.
    if (bar.style.order !== '1') bar.style.order = '1';
    if (bar.parentNode !== main) main.appendChild(bar);
    fylla(bar, fid);
  }

  let _tilraunir = 0;
  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) { if (++_tilraunir < 60) setTimeout(vakta, 500); return; }
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO((ms) => {
      for (const m of ms) {
        const breytt = [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1 && n.id !== ID);
        if (breytt) { try { festa(); } catch (err) { console.warn('[534]', err); } return; }
      }
    }).observe(main, { childList: true });
    try { festa(); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.ThjonustuTakkar = { festa, version: '534' };
})();
/* === END ÞJÓNUSTU-TAKKAR === */
