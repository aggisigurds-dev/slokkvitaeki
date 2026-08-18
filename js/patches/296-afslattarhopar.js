/* === AFSLÁTTARHÓPAR v1 (patch 296, 2026-08-05) ==============================
 *
 * Ósk Agnars: „Vantar að geta búið til afsláttarflokka fyrir viðskiptavini …
 * x% af öllum hleðslum af slökkvitækjum, x% af yfirferð slökkvitækja, af
 * yfirferð á brunaslöngum, af yfirferð og þjónustu á reykskynjurum, af öllum
 * þjónustuliðum, af nýjum tækjum … en öll þessi afsláttarhópar ganga framar
 * heldur en afsláttur af öllu ef slík tala er sett."
 *
 * Þrennt:
 *
 * 1) 🏷️ AFSLÁTTARHÓPUR á fyrirtækisspjaldi — fellilisti beint fyrir ofan
 *    „🎯 Sjálfvirkur afsláttur" (patch 255). Vistar `discount_tier_id` á
 *    fyrirtaeki OG á allar raðir með sömu kennitölu (líka í vidskiptavinir),
 *    nákvæmlega eins og 255 gerir við afslattur_pct — annars nær Sala ekki í
 *    hópinn hjá rekstrarfélögum með margar starfsstöðvar.
 *
 * 2) ⚙️ HÓPA-SÝSLA (modal) — búa til/breyta/eyða hópum með sex prósentu-
 *    reitum. AUÐUR reitur = almenni afslátturinn gildir á þann flokk;
 *    talan 0 = enginn afsláttur (hópurinn gengur samt framar). Neðst er
 *    „hvaða vörur lenda hvar" listi svo flokkunin sé sannreynanleg.
 *
 * 3) SALA-tenging — hver karfa-lína er flokkuð (js/discount-engine.js) og fær
 *    hóps-prósentuna sem LÍNU-afslátt (`disc_pct`, 2026-07-31 konvensjónin),
 *    svo hún bakast sjálfkrafa inn í reikninginn gegnum bakedLines(). Körfu-
 *    afslátturinn (almenni) er svo VIGTAÐUR niður svo línur sem fengu hóps-
 *    afslátt fái hann ekki tvisvar — sama aðferð og 255 notar fyrir tilboðsverð.
 *    Handvirkur línu-afsláttur afgreiðslumanns er aldrei yfirskrifaður.
 *
 * SQL: sql/2026-08-05_afslattarhopar.sql (discount_tiers + discount_tier_id).
 * ========================================================================== */
(() => {
  if (window.__afslattarhoparInstalled) return;
  window.__afslattarhoparInstalled = true;

  const E = () => window.DiscountEngine;
  const SB = () => (window.DB && DB.sb) || null;
  const digits = s => String(s || '').replace(/[^0-9]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };
  const near = (a, b) => Math.abs((+a || 0) - (+b || 0)) < 0.05;
  // Tákn úr js/ui-icons.js — engin emoji (osk Agnars 2026-08-05).
  const ic = (n, sz) => (window.UIIcons ? UIIcons.svg(n, { size: sz || 14 }) : '');
  const icc = (key, sz) => (window.UIIcons ? UIIcons.categorySvg(key, { size: sz || 14 }) : '');

  // ── Hópa-geymsla (discount_tiers) ─────────────────────────────────────────
  let _tiers = [], _tiersTs = 0, _inflight = null, _tableMissing = false;
  const TIERS_TTL = 60000;

  function loadTiers(force) {
    if (!force && _tiersTs && (Date.now() - _tiersTs) < TIERS_TTL) return Promise.resolve(_tiers);
    if (_inflight) return _inflight;
    const sb = SB();
    if (!sb) return Promise.resolve([]);
    _inflight = sb.from('discount_tiers').select('*').order('tier_name')
      .then(r => {
        if (r.error) {
          // 42P01 = taflan er ekki til → SQL-skjalið ókeyrt.
          if (/does not exist|42P01/i.test(r.error.message || '')) _tableMissing = true;
          return _tiers;
        }
        _tableMissing = false;
        _tiers = r.data || [];
        _tiersTs = Date.now();
        return _tiers;
      })
      .catch(() => _tiers)
      .then(t => { _inflight = null; return t; });
    return _inflight;
  }
  const tierById = id => _tiers.find(t => String(t.id) === String(id)) || null;

  // ── Handvirk flokkun vara (app_settings.afslattarflokkar_vorur) ───────────
  // { "<vöru-id>": "ext_refill" | … | "none" | null }. Slær sjálfvirku
  // nafna-regluna út, svo Agnar getur fært vöru milli flokka eða tekið hana
  // alveg út úr hópsafslættinum.
  const OVR_KEY = 'afslattarflokkar_vorur';
  function overrides() {
    const m = (window.AppSettings && AppSettings.path && AppSettings.path(OVR_KEY)) || {};
    return (m && typeof m === 'object') ? m : {};
  }
  async function setOverride(id, key) {
    if (!window.AppSettings || !AppSettings.save) { toast('AppSettings ekki tilbúið.'); return false; }
    // ÞRÖNG vistun — aðeins þessi eina vara, svo við skrifum ekki yfir það sem
    // aðrar vélar breyttu á meðan glugginn var opinn (sama regla og patch 113).
    return await AppSettings.save({ [OVR_KEY]: { [String(id)]: key || null } });
  }

  function ktPatterns(kt) {
    const d = digits(kt);
    if (d.length !== 10 || d === '9999999999') return null;
    return [d, d.slice(0, 6) + '-' + d.slice(6)];
  }

  // ── Hópur viðskiptavinar (kt → tier) ──────────────────────────────────────
  const _custTier = new Map();     // kt → tierId | null
  const _custPending = new Set();

  function resolveTierFor(cust) {
    // Skilar hóp SAMSTUNDIS ef hann er í minni; annars null + sækir í bakgrunni.
    if (!cust) return null;
    const kt = digits(cust.kt);
    if (!kt) return null;
    if (_custTier.has(kt)) {
      const id = _custTier.get(kt);
      return id ? tierById(id) : null;
    }
    if (!_custPending.has(kt)) {
      _custPending.add(kt);
      fetchTierFor(kt, cust.co_id).then(() => {
        _custPending.delete(kt);
        applyCart();
      }).catch(() => _custPending.delete(kt));
    }
    return null;
  }

  async function fetchTierFor(kt, coId) {
    const sb = SB();
    if (!sb) return null;
    await loadTiers();
    if (_tableMissing) { _custTier.set(kt, null); return null; }
    let id = null;
    const pats = ktPatterns(kt);
    try {
      if (pats) {
        const [fy, vk] = await Promise.all([
          sb.from('fyrirtaeki').select('discount_tier_id').in('kennitala', pats).not('discount_tier_id', 'is', null).limit(1),
          sb.from('vidskiptavinir').select('discount_tier_id').in('kennitala', pats).not('discount_tier_id', 'is', null).limit(1)
        ]);
        id = (fy.data && fy.data[0] && fy.data[0].discount_tier_id) ||
             (vk.data && vk.data[0] && vk.data[0].discount_tier_id) || null;
      }
      if (!id && coId) {
        const r = await sb.from('fyrirtaeki').select('discount_tier_id').eq('id', coId).single();
        id = (r.data && r.data.discount_tier_id) || null;
      }
    } catch (_) {}
    _custTier.set(kt, id);
    return id ? tierById(id) : null;
  }

  function forgetCustomerCache() { _custTier.clear(); }

  // ── SALA: hóps-afsláttur á línur ──────────────────────────────────────────
  function lineItem(l, st) {
    // Flokkun byggir á vörunni sjálfri þegar hún finnst (flokkur úr `vorur`),
    // annars á texta línunnar.
    if (l && l.product_id && st) {
      const all = (st.products || []).concat(st.services || []);
      const p = all.find(x => x.id === l.product_id);
      if (p) return { id: p.id, nafn: p.nafn, flokkur: p.flokkur, type: l.type };
    }
    return { id: (l && l.product_id) || null, nafn: (l && l.desc) || '', type: (l && l.type) || '' };
  }

  function unitExAfterLine(l) {
    const d = Math.max(0, Math.min(100, parseFloat(l && l.disc_pct) || 0));
    const b = +((l && l.unit_price_ex_vat)) || 0;
    return d > 0 ? Math.round(b * (1 - d / 100)) : b;
  }

  // Vigtaður körfu-afsláttur: almenna prósentan á BARA að ná á línur sem fengu
  // hvorki hóps-afslátt né tilboðsverð (patch 113/255 sömu reglu).
  function weightedFlat(st, flat) {
    if (!flat) return 0;
    let tot = 0, open = 0;
    (st.lines || []).forEach(l => {
      const s = (Math.max(0, +l.qty || 0)) * unitExAfterLine(l);
      tot += s;
      if (l._hopurPct == null && !l._tilbod) open += s;
    });
    if (tot <= 0) return flat;
    return Math.round(flat * open / tot * 10) / 10;
  }

  function applyCart() {
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    const POS = window.POS;
    if (!POS || typeof POS.getState !== 'function' || !E()) return;
    const st = POS.getState();
    if (!st || !st.customer || !Array.isArray(st.lines)) return;

    const tier = resolveTierFor(st.customer);
    const ovr = overrides();
    let changed = false;

    st.lines.forEach(l => {
      const cat = E().classifyItem(lineItem(l, st), ovr);
      // 2026-08-17: fast hópsverð (kr án vsk) gengur framar prósentunni —
      // þýtt yfir í nákvæma línuprósentu svo endanlega línuverðið lendi upp á
      // krónu á samningsverðinu (t.d. Center: 3.150 → 2.600 = 17,4603%).
      let pct = tier ? E().tierPct(tier, cat) : null;
      let fastKr = null;
      const baseEx = +l.unit_price_ex_vat || 0;
      const fast = (tier && E().tierFast) ? E().tierFast(tier, cat) : null;
      if (fast !== null && baseEx > 0 && fast <= baseEx) {
        pct = Math.round((1 - fast / baseEx) * 100000) / 1000;
        fastKr = Math.round(fast);
      }
      const mine = (l._hopurPct == null) ? null : +l._hopurPct;
      const cur = Math.max(0, parseFloat(l.disc_pct) || 0);

      if (pct === null) {
        // Enginn hóps-afsláttur á þessa línu — hreinsum OKKAR gildi (ekki
        // handvirkt gildi afgreiðslumanns).
        if (mine != null) {
          if (near(cur, mine)) { l.disc_pct = 0; changed = true; }
          l._hopurPct = null; l._hopur = null;
        }
        return;
      }
      // Skrifum bara yfir tómt gildi eða okkar eigið — handvirkur afsláttur helst.
      if (cur === 0 || (mine != null && near(cur, mine))) {
        if (!near(cur, pct)) { l.disc_pct = pct; changed = true; }
        l._hopurPct = pct;
        const c = E().byKey(cat);
        l._hopur = (tier.tier_name || 'Afsláttarhópur') + ' · ' + ((c && c.stutt) || cat) +
                   (fastKr != null ? ' fast verð ' + fastKr + ' kr'
                     : (pct > 0 ? ' −' + E().fmtPct(pct) + '%' : ' 0%'));
      }
    });

    // Hópurinn gengur framar almenna afslættinum: vigtum hann niður.
    if (tier) {
      const flat = Math.max(0, Math.min(100, +st.customer.afslattur_pct || 0));
      const eff = weightedFlat(st, flat);
      if (!near(+st.discount_pct || 0, eff)) { st.discount_pct = eff; changed = true; }
    }

    if (changed && typeof POS.rerenderDynamic === 'function') { POS.rerenderDynamic(); return; }
    decorateBadges(st);
  }

  // Grænt „🏷️" merki á línur sem fengu hóps-afslátt (sama aðferð og 113).
  function decorateBadges(st) {
    const cart = document.getElementById('pos-lines');
    if (!cart) return;
    const lines = (st && st.lines) || [];
    cart.querySelectorAll('input.pos-disc-edit').forEach(di => {
      const idx = +di.getAttribute('data-idx');
      const card = di.closest('div[style*="border-left"]');
      if (!card) return;
      const tag = lines[idx] && lines[idx]._hopur;
      const existing = card.querySelector('._ahop-badge');
      if (tag && !existing) {
        const descEl = card.querySelector('div[style*="font-weight:700"]');
        if (descEl) {
          const b = document.createElement('span');
          b.className = '_ahop-badge';
          b.title = 'Afsláttarhópur: ' + tag;
          b.style.cssText = 'display:inline-flex;align-items:center;gap:3px;vertical-align:middle;margin-left:6px;padding:1px 6px;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:99px;font-size:10px;font-weight:700';
          b.innerHTML = (window.UIIcons ? UIIcons.svg('tag', { size: 10 }) : '') + '<span>Hópur</span>';
          descEl.appendChild(b);
        }
      } else if (!tag && existing) {
        existing.remove();
      }
    });
  }

  function attachPos() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attachPos, 800); return; }
    let t = 0;
    new MutationObserver(() => {
      if (!view.classList.contains('active')) return;
      clearTimeout(t);
      // 260ms — keyrir Á EFTIR 255 (120) og 113 (150) svo okkar vigtaða
      // körfu-prósenta standi eftir.
      t = setTimeout(applyCart, 260);
    }).observe(view, { childList: true, subtree: true });
    setTimeout(applyCart, 900);
  }
  attachPos();

  // ── Fyrirtækisspjald: 🏷️ Afsláttarhópur ──────────────────────────────────
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const btn = main.querySelector('button[onclick*="openEdit"]');
    if (btn) { const m = btn.getAttribute('onclick').match(/openEdit\((\d+)\)/); if (m) return +m[1]; }
    return null;
  }

  function chipsFor(tier) {
    if (!tier) return '';
    return E().CATEGORIES.map(c => {
      const fv = E().parseVerd ? E().parseVerd(tier[c.colVerd]) : null;
      const p = E().parsePct(tier[c.col]);
      // Fast verð birtist framar prósentunni — það er líka forgangurinn í vélinni.
      if (fv !== null) {
        return '<span title="' + esc(c.label) + ' — fast verð án vsk" style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:99px;padding:2px 8px;font-size:10.5px;font-weight:700;color:#1e40af">' +
          icc(c.key, 11) + '<span>' + Math.round(fv) + ' kr</span></span>';
      }
      if (p === null) return '';
      return '<span title="' + esc(c.label) + '" style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--brd);border-radius:99px;padding:2px 8px;font-size:10.5px;font-weight:700;color:' + (p > 0 ? '#166534' : '#94a3b8') + '">' +
        icc(c.key, 11) + '<span>' + E().fmtPct(p) + '%</span></span>';
    }).join(' ');
  }

  function renderSection(sec, coId, tierId, busy) {
    const opts = ['<option value="">— enginn hópur —</option>'].concat(
      _tiers.map(t => '<option value="' + t.id + '"' + (String(t.id) === String(tierId) ? ' selected' : '') + '>' +
        esc(t.tier_name) + '</option>')
    ).join('');
    const tier = tierId ? tierById(tierId) : null;
    const warn = _tableMissing
      ? '<div style="margin-top:8px;font-size:11px;color:#b45309">⚠ Taflan <code>discount_tiers</code> er ekki til — keyrðu <code>sql/2026-08-05_afslattarhopar.sql</code> í Supabase.</div>'
      : '';
    sec.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#1e3a8a">' + ic('tag', 15) + 'Afsláttarhópur</span>' +
        '<span style="font-size:10.5px;color:var(--ink3)">gengur framar sjálfvirkum afslætti</span>' +
        '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">' +
          '<select class="_ahop-sel"' + (busy ? ' disabled' : '') + ' style="padding:6px 8px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:13px;background:var(--surface);color:var(--ink1);min-width:170px">' + opts + '</select>' +
          '<button class="_ahop-manage" type="button" title="Sýsla með afsláttarhópa" style="padding:7px 12px;background:var(--surface2);border:1px solid var(--brd);color:var(--brand);border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px">' + ic('sliders', 14) + 'Hópar</button>' +
        '</span>' +
      '</div>' +
      (tier ? '<div style="margin-top:8px;display:flex;gap:5px;flex-wrap:wrap">' + chipsFor(tier) +
        '<span style="font-size:10.5px;color:var(--ink3);align-self:center">· auðir flokkar → almennur afsláttur</span></div>' : '') +
      warn;
  }

  async function saveTierOnCompany(coId, tierId) {
    const sb = SB();
    if (!sb) { toast('Engin gagnabankatenging.'); return false; }
    const val = tierId ? +tierId : null;
    const r = await sb.from('fyrirtaeki').update({ discount_tier_id: val }).eq('id', coId);
    if (r.error) throw r.error;
    // Sama kennitala getur átt margar raðir (starfsstöðvar) og legið í báðum
    // töflum — Sala les hæsta/fyrsta gildið, svo allt verður að fylgjast að.
    try {
      const co = await sb.from('fyrirtaeki').select('kennitala').eq('id', coId).single();
      const pats = ktPatterns(co.data && co.data.kennitala);
      if (pats) {
        await sb.from('fyrirtaeki').update({ discount_tier_id: val }).in('kennitala', pats);
        await sb.from('vidskiptavinir').update({ discount_tier_id: val }).in('kennitala', pats);
      }
    } catch (_) {}
    forgetCustomerCache();
    return true;
  }

  function injectSection() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    if (main.querySelector('._ahop-section')) return;
    // 2026-08-18 (Agnar, Center Arnarhvoll: „get ekki valið afsláttarhópinn"):
    // DiscountEngine (discount-engine.js) getur hlaðist EFTIR að síðasta DOM-
    // breyting kveikti á injectSection — þá hætti fallið þögult og veljarinn
    // birtist aldrei (engin frekari mutation til að reyna aftur). Núna er
    // bókað retry svo hann komi um leið og vélin er tilbúin.
    if (!E()) { setTimeout(injectSection, 400); return; }

    const sec = document.createElement('div');
    sec.className = '_ahop-section';
    sec.dataset.coId = coId;
    sec.style.cssText = 'margin:14px 0 10px;padding:10px 14px;border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    renderSection(sec, coId, null, false);

    // Beint fyrir ofan „🎯 Sjálfvirkur afsláttur" (255) → „💰 Tilboðsverð" (113).
    const cad = main.querySelector('._cad-section');
    const cpr = main.querySelector('._cpr-section');
    const cat = main.querySelector('._cat-section');
    const anchor = cad || cpr || cat;
    if (anchor) anchor.parentNode.insertBefore(sec, anchor); else main.appendChild(sec);

    Promise.all([loadTiers(), SB() ? SB().from('fyrirtaeki').select('discount_tier_id').eq('id', coId).single() : null])
      .then(([, r]) => {
        const id = (r && r.data && r.data.discount_tier_id) || null;
        sec.dataset.tierId = id || '';
        renderSection(sec, coId, id, false);
      })
      .catch(() => renderSection(sec, coId, null, false));

    sec.addEventListener('change', async e => {
      const sel = e.target.closest('._ahop-sel');
      if (!sel) return;
      const val = sel.value || null;
      renderSection(sec, coId, val, true);
      try {
        await saveTierOnCompany(coId, val);
        sec.dataset.tierId = val || '';
        renderSection(sec, coId, val, false);
        toast(val ? ('Afsláttarhópur vistaður: ' + (tierById(val) || {}).tier_name) : 'Afsláttarhópur fjarlægður.');
        applyCart();
      } catch (err) {
        renderSection(sec, coId, sec.dataset.tierId || null, false);
        toast('Villa við vistun: ' + (err.message || err));
      }
    });

    sec.addEventListener('click', e => {
      if (e.target.closest('._ahop-manage')) { e.stopPropagation(); openManager(coId, sec); }
    });
  }

  function attachCard() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attachCard, 800); return; }
    const view = document.getElementById('view-companies');
    let t = 0;
    new MutationObserver(() => {
      if (view && !view.classList.contains('active')) return;
      clearTimeout(t);
      t = setTimeout(injectSection, 280);
    }).observe(main, { childList: true, subtree: true });
    setTimeout(injectSection, 1500);
  }
  attachCard();

  // ── Modal: sýsla með afsláttarhópa ────────────────────────────────────────
  let _editing = null;   // tier-hlutur í vinnslu, eða null

  function pctInput(cat, tier) {
    const v = tier ? E().parsePct(tier[cat.col]) : null;
    // 2026-08-17 (Center Hótel): fast verð (kr ÁN vsk) per línu í flokknum —
    // gengur framar prósentunni. Tómt = ekkert fast verð.
    const fv = tier && E().parseVerd ? E().parseVerd(tier[cat.colVerd]) : null;
    return '<label style="display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--brd);border-radius:9px;background:var(--surface)">' +
      '<span style="display:flex;justify-content:center;width:22px;color:var(--ink2)">' + icc(cat.key, 16) + '</span>' +
      '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--ink1)">' + esc(cat.label) + '</span>' +
      '<input class="_ahop-pct" data-col="' + cat.col + '" type="text" inputmode="decimal" placeholder="—" ' +
        'value="' + (v === null ? '' : E().fmtPct(v)) + '" ' +
        'style="width:58px;padding:5px 7px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:13px;text-align:right;font-variant-numeric:tabular-nums">' +
      '<span style="font-size:12px;color:var(--ink2);font-weight:700">%</span>' +
      '<input class="_ahop-verd" data-col="' + cat.colVerd + '" type="text" inputmode="decimal" placeholder="fast kr" ' +
        'title="Fast verð ÁN VSK á hverja línu í flokknum — gengur framar prósentunni (t.d. Center: yfirferð 2600)" ' +
        'value="' + (fv === null ? '' : String(fv).replace('.', ',')) + '" ' +
        'style="width:72px;padding:5px 7px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:13px;text-align:right;font-variant-numeric:tabular-nums">' +
      '<span style="font-size:12px;color:var(--ink2);font-weight:700">kr</span>' +
    '</label>';
  }

  function managerHTML() {
    const list = _tiers.length ? _tiers.map(t =>
      '<div style="display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid var(--brd);border-radius:10px;background:var(--surface);margin-bottom:7px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13.5px;font-weight:700;color:var(--ink1)">' + esc(t.tier_name) + (t.virkt === false ? ' <span style="font-size:10px;color:#dc2626">(óvirkur)</span>' : '') + '</div>' +
          '<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">' + (chipsFor(t) || '<span style="font-size:11px;color:var(--ink4);font-style:italic">engar prósentur skráðar</span>') + '</div>' +
          (t.athugasemd ? '<div style="margin-top:3px;font-size:10.5px;color:var(--ink3)">' + esc(t.athugasemd) + '</div>' : '') +
        '</div>' +
        '<button class="_ahop-edit" data-id="' + t.id + '" type="button" title="Breyta" style="background:var(--surface2);border:1px solid var(--brd);border-radius:7px;padding:5px 8px;cursor:pointer;line-height:0" title="Breyta">' + ic('pencil', 14) + '</button>' +
        '<button class="_ahop-del" data-id="' + t.id + '" type="button" title="Eyða" style="background:var(--surface);border:1px solid #fecaca;color:#dc2626;border-radius:7px;padding:5px 8px;cursor:pointer;line-height:0" title="Eyða">' + ic('trash', 14) + '</button>' +
      '</div>'
    ).join('') : '<div style="padding:16px;text-align:center;color:var(--ink4);font-size:13px;font-style:italic">Enginn afsláttarhópur skráður — búðu til þann fyrsta hér að neðan.</div>';

    const t = _editing;
    const form =
      '<div style="margin-top:12px;padding:12px;border:1px solid var(--brd);border-radius:12px;background:var(--surface2)">' +
        '<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;margin-bottom:9px">' +
          (t && t.id ? ic('pencil', 13) + 'Breyta hóp' : ic('plus', 13) + 'Nýr afsláttarhópur') + '</div>' +
        '<input id="_ahop-name" type="text" placeholder="Nafn hóps — t.d. Stórnotendur 2026" value="' + esc((t && t.tier_name) || '') + '" ' +
          'style="width:100%;padding:9px 11px;border:1px solid var(--brd2);border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;margin-bottom:9px">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:7px">' +
          E().CATEGORIES.map(c => pctInput(c, t)).join('') +
        '</div>' +
        '<div style="margin-top:7px;font-size:10.5px;color:var(--ink3)">' +
          'Auður reitur = <b>almenni afslátturinn</b> gildir á þann flokk. Talan <b>0</b> = enginn afsláttur (hópurinn gengur samt framar). ' +
          '<b>Fast kr</b> = samningsverð ÁN VSK á hverja línu í flokknum — gengur framar prósentunni og lækkar aðeins (hækkar aldrei verð).' +
        '</div>' +
        '<input id="_ahop-note" type="text" placeholder="Athugasemd (valkvætt)" value="' + esc((t && t.athugasemd) || '') + '" ' +
          'style="width:100%;margin-top:9px;padding:8px 11px;border:1px solid var(--brd2);border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box">' +
        '<div style="display:flex;gap:8px;margin-top:11px">' +
          '<button class="_ahop-save" type="button" style="padding:9px 18px;background:var(--brand);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:700">Vista hóp</button>' +
          (t && t.id ? '<button class="_ahop-cancel" type="button" style="padding:9px 16px;background:var(--surface);border:1px solid var(--brd);color:var(--ink2);border-radius:8px;cursor:pointer;font-size:13.5px">Hætta við</button>' : '') +
        '</div>' +
      '</div>';

    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">' +
        '<div style="display:flex;align-items:center;gap:7px;font-size:16px;font-weight:800;color:var(--ink1)">' + ic('tag', 17) + 'Afsláttarhópar</div>' +
        '<div style="font-size:11px;color:var(--ink3)">prósenta per flokki — gengur framar afslætti af öllu</div>' +
        '<button class="_ahop-close" type="button" style="margin-left:auto;background:var(--surface2);border:1px solid var(--brd);border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;line-height:1">✕</button>' +
      '</div>' +
      list + form +
      '<div style="margin-top:14px;border-top:1px solid var(--brd);padding-top:11px">' +
        '<button class="_ahop-preview" type="button" style="background:none;border:none;color:var(--brand);cursor:pointer;font-size:12.5px;font-weight:700;padding:0;display:inline-flex;align-items:center;gap:6px">' + ic('layers', 14) + 'Flokkun vara — hvaða vörur lenda í hvaða flokki (breytanlegt)</button>' +
        '<div class="_ahop-preview-body" style="display:none;margin-top:9px"></div>' +
      '</div>';
  }

  function openManager(coId, sec) {
    let ov = document.getElementById('_ahop-modal');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = '_ahop-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:28px 14px;overflow:auto';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:100%;max-width:820px;background:var(--surface,#fff);color:var(--ink1,#0f172a);border-radius:16px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.35)';
    ov.appendChild(panel);
    document.body.appendChild(ov);
    _editing = null;

    const draw = () => { panel.innerHTML = managerHTML(); };
    loadTiers(true).then(draw);
    draw();

    ov.addEventListener('click', async e => {
      if (e.target === ov || e.target.closest('._ahop-close')) { ov.remove(); return; }

      const edit = e.target.closest('._ahop-edit');
      if (edit) { _editing = tierById(edit.dataset.id); draw(); return; }

      const cancel = e.target.closest('._ahop-cancel');
      if (cancel) { _editing = null; draw(); return; }

      const del = e.target.closest('._ahop-del');
      if (del) {
        const t = tierById(del.dataset.id);
        if (!t) return;
        if (!confirm('Eyða afsláttarhópnum „' + t.tier_name + '"?\n\nViðskiptavinir sem eru í honum missa hópinn (almennur afsláttur tekur við).')) return;
        try {
          const r = await SB().from('discount_tiers').delete().eq('id', t.id);
          if (r.error) throw r.error;
          forgetCustomerCache();
          _editing = null;
          await loadTiers(true);
          draw();
          if (sec) renderSection(sec, coId, sec.dataset.tierId, false);
          toast('Hóp eytt.');
        } catch (err) { alert('Villa: ' + (err.message || err)); }
        return;
      }

      const prev = e.target.closest('._ahop-preview');
      if (prev) {
        const body = panel.querySelector('._ahop-preview-body');
        if (!body) return;
        if (body.style.display === 'none') {
          body.style.display = 'block';
          body.innerHTML = '<div style="font-size:12px;color:var(--ink3)">Sæki vörulistann…</div>';
          loadVorur().then(() => renderFlokkun(body));
        } else { body.style.display = 'none'; }
        return;
      }

      // „+ Bæta við vöru" — velur vöru úr vörulistanum og setur hana í flokkinn.
      const addV = e.target.closest('._ahop-addvara');
      if (addV) {
        e.stopPropagation();
        const cat = addV.dataset.cat;
        if (!window.VorurPicker || !VorurPicker.open) { alert('Vörulistinn er ekki tilbúinn — endurhladdu síðunni.'); return; }
        VorurPicker.open(async p => {
          if (!p || p.id == null) return;
          await setOverride(p.id, cat);
          await loadVorur(true);
          const body = panel.querySelector('._ahop-preview-body');
          if (body) renderFlokkun(body);
          applyCart();
          const c = E().byKey(cat);
          toast(p.nafn + ' → ' + ((c && c.stutt) || 'utan flokka'));
        });
        return;
      }

      // ✕ á vöruflís = taka hana út úr hópsafslættinum.
      const rmV = e.target.closest('._ahop-chip-x');
      if (rmV) {
        e.stopPropagation();
        await setOverride(rmV.dataset.vid, E().NONE);
        const body = panel.querySelector('._ahop-preview-body');
        if (body) renderFlokkun(body);
        applyCart();
        return;
      }

      const save = e.target.closest('._ahop-save');
      if (save) {
        const name = (panel.querySelector('#_ahop-name').value || '').trim();
        if (!name) { alert('Sláðu inn nafn á hópnum.'); return; }
        const row = { tier_name: name, athugasemd: (panel.querySelector('#_ahop-note').value || '').trim() || null };
        panel.querySelectorAll('._ahop-pct').forEach(inp => {
          row[inp.dataset.col] = E().parsePct(inp.value);   // tómt → null
        });
        panel.querySelectorAll('._ahop-verd').forEach(inp => {
          row[inp.dataset.col] = E().parseVerd(inp.value);  // tómt → null (fast verð án vsk)
        });
        try {
          const sb = SB();
          let r;
          if (_editing && _editing.id) {
            row.updated_at = new Date().toISOString();
            r = await sb.from('discount_tiers').update(row).eq('id', _editing.id);
          } else {
            r = await sb.from('discount_tiers').insert(row);
          }
          if (r.error) throw r.error;
          _editing = null;
          forgetCustomerCache();
          await loadTiers(true);
          draw();
          if (sec) renderSection(sec, coId, sec.dataset.tierId, false);
          applyCart();
          toast('Hópur vistaður: ' + name);
        } catch (err) {
          alert('Villa við vistun: ' + (err.message || err) +
            (/does not exist/i.test(err.message || '') ? '\n\nKeyrðu sql/2026-08-05_afslattarhopar.sql í Supabase fyrst.' : ''));
        }
      }
    });

    // Fellilisti á vöruflís → færa vöruna í annan flokk (eða aftur í sjálfvirkt).
    ov.addEventListener('change', async e => {
      const sel = e.target.closest('._ahop-move');
      if (!sel) return;
      const vid = sel.dataset.vid;
      const val = sel.value || null;     // tómt = ↺ sjálfvirkt
      sel.disabled = true;
      try {
        await setOverride(vid, val);
        const body = panel.querySelector('._ahop-preview-body');
        if (body) renderFlokkun(body);
        applyCart();
      } catch (err) {
        sel.disabled = false;
        alert('Villa við vistun: ' + (err.message || err));
      }
    });
  }

  // ── Flokkun vara — RITANLEG ───────────────────────────────────────────────
  // Vörurnar raðast sjálfkrafa í flokkana sex eftir nafni + vöruflokki, en
  // hver einasta vara er færanleg: fellilisti á flísinni færir hana, ✕ tekur
  // hana út, og „+ Bæta við vöru" sækir vöru úr vörulistanum inn í flokkinn.
  let _vorur = null;
  async function loadVorur(force) {
    if (!force && _vorur) return _vorur;
    const sb = SB();
    if (!sb) return (_vorur = []);
    try {
      const r = await sb.from('vorur').select('id,nafn,flokkur,verd_an_vsk,virkt').eq('virkt', true).order('nafn');
      _vorur = r.data || [];
    } catch (_) { _vorur = _vorur || []; }
    return _vorur;
  }

  function allBuckets() {
    return E().CATEGORIES.concat([
      { key: E().NONE, label: 'Utan flokka — enginn hópsafsláttur', stutt: 'Utan flokka' }
    ]);
  }

  function chipHTML(p, curKey, manual) {
    const opts = ['<option value=""' + (manual ? '' : ' selected') + '>↺ sjálfvirkt</option>']
      .concat(allBuckets().map(c =>
        '<option value="' + c.key + '"' + (manual && curKey === c.key ? ' selected' : '') + '>' +
        esc(c.stutt) + '</option>'))
      .join('');
    return '<span class="_ahop-chip" style="display:inline-flex;align-items:center;gap:4px;margin:0 5px 5px 0;padding:3px 4px 3px 9px;border:1px solid ' +
        (manual ? 'var(--brand)' : 'var(--brd)') + ';border-radius:99px;background:var(--surface);' +
        (manual ? 'box-shadow:0 0 0 1px var(--brand) inset;' : '') + '">' +
      '<span style="font-size:11.5px;color:var(--ink1);font-weight:' + (manual ? '700' : '500') + '">' +
        (manual ? '• ' : '') + esc(p.nafn) + '</span>' +
      // ⇄ táknið er sýnilega merkið; fellilistinn liggur ósýnilegur ofan á því
      // svo flísin haldist þröng en smellur opni samt venjulegan valmyndalista.
      '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:var(--surface2);color:var(--ink3);font-size:10px" title="Færa í annan flokk">⇄' +
        '<select class="_ahop-move" data-vid="' + p.id + '" ' +
          'style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:12px">' +
          opts + '</select>' +
      '</span>' +
      '<button class="_ahop-chip-x" data-vid="' + p.id + '" type="button" title="Taka út úr hópsafslætti" ' +
        'style="border:none;background:transparent;color:var(--ink4);cursor:pointer;font-size:11px;line-height:1;padding:2px 4px">✕</button>' +
    '</span>';
  }

  function renderFlokkun(body) {
    const ovr = overrides();
    const cats = allBuckets();
    const buckets = {};
    cats.forEach(c => { buckets[c.key] = []; });
    (_vorur || []).forEach(p => {
      const k = E().classifyItem(p, ovr);
      (buckets[k] || (buckets[k] = [])).push(p);
    });
    const manualCount = Object.keys(ovr).filter(k => ovr[k]).length;

    body.innerHTML =
      '<div style="font-size:11px;color:var(--ink3);margin-bottom:8px">' +
        'Vörurnar raðast sjálfkrafa, en þú mátt breyta öllu: <b>fellilistinn</b> á flísinni færir vöru milli flokka, ' +
        '<b>✕</b> tekur hana út, <b>+ Bæta við vöru</b> sækir vöru úr vörulistanum. ' +
        (manualCount ? '<b>' + manualCount + '</b> vörur eru handstilltar (merktar •).' : 'Engin vara handstillt enn.') +
      '</div>' +
      cats.map(c =>
        '<div style="margin-bottom:8px;padding:9px 11px;border:1px solid var(--brd);border-radius:10px;background:' +
            (c.key === E().NONE ? 'var(--surface2)' : 'var(--surface)') + '">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
            '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:var(--ink1)">' + icc(c.key, 15) + esc(c.label) + '</span>' +
            '<span style="font-size:11px;color:var(--ink3);font-weight:600">(' + buckets[c.key].length + ')</span>' +
            '<button class="_ahop-addvara" data-cat="' + c.key + '" type="button" ' +
              'style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--surface2);border:1px solid var(--brd);color:var(--brand);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">' + ic('plus', 12) + 'Bæta við vöru</button>' +
          '</div>' +
          '<div style="line-height:1.9">' +
            (buckets[c.key].length
              ? buckets[c.key].map(p => chipHTML(p, c.key, !!ovr[String(p.id)])).join('')
              : '<i style="color:var(--ink4);font-size:11px">engar vörur</i>') +
          '</div>' +
        '</div>'
      ).join('');
  }

  window.Afslattarhopar = {
    tiers: () => _tiers,
    reload: () => loadTiers(true),
    forget: forgetCustomerCache,
    apply: applyCart,
    open: () => openManager(getCompanyId(), document.querySelector('._ahop-section'))
  };
  console.log('[patch-296] 🏷️ Afsláttarhópar — hópur per viðskiptavin, 6 flokkar, gengur framar afslætti af öllu');
})();
/* === END AFSLÁTTARHÓPAR === */
