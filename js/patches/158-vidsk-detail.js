/* === VIÐSKIPTAVINUR — UNIFIED DETAIL v1 ===
 *
 * Built 2026-05-18 morning. One page per customer showing EVERYTHING
 * about them in one solid layout — the platform foundation the user
 * asked for:
 *   "Þjónustutækis company informations are really just a bunch of addons"
 *
 * Sections (top to bottom):
 *   1. Header  — avatar, name, kennitala, Til baka button
 *   2. Base info — address, phone, email, contact (the always-true facts)
 *   3. Service subscriptions — two big toggle cards (Fyrirtækjaþjónusta,
 *      Brunakerfi). Click to subscribe / unsubscribe. Same buttons as the
 *      inline ones on the master list, but bigger and explained.
 *   4. Fyrirtækjaþjónusta details (visible only if subscribed):
 *      • Inspect month, last inspected year, estimated yearly
 *      • Units list (uttaeki rows filtered by client === name)
 *      • Quick links: Úttektarskýrsla, Teikning, Opna í Fyrirtæki í Þjónustu
 *   5. Brunakerfi details (visible only if subscribed):
 *      • Inspect month, unit count, notes
 *      • Quick link: Opna í Brunakerfisþjónustu
 *   6. Notes / Athugasemdir (the company-level notes field)
 *
 * How it's reached:
 *   • From Allir Viðskiptavinir master list: click a card → opens here
 *   • Programmatic: window.VidskDetail.show(coId)
 *
 * Replaces: nothing yet — Companies.openDetail and Arsskodun.openDetail
 * still exist for direct deep links. Eventually those can redirect here.
 */
(() => {
  if (window.__vidskDetailInstalled) return;
  window.__vidskDetailInstalled = true;

  const VIEW_ID = 'view-vidsk-detail';

  let _currentId = null;

  // ── Helpers ────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function fmtKt(kt) {
    const s = String(kt || '').replace(/\D/g, '');
    return s.length === 10 ? s.slice(0,6) + '-' + s.slice(6) : (kt || '');
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    if (!v) return '—';
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];

  // ── Data ───────────────────────────────────────────────────────────────
  function getCompany(coId) {
    const companies = (window.Companies && Companies.list) || [];
    return companies.find(c => +c.id === +coId) || null;
  }
  function getArs(coId) {
    const m = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    return m[String(coId)] || null;
  }
  function getBru(coId) {
    const m = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    return m[String(coId)] || null;
  }
  function getUnitsFor(coName) {
    if (!coName) return [];
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    return units.filter(u => u.status === 'active' && u.client === coName);
  }
  function ktDigits(kt) { return String(kt || '').replace(/[^0-9]/g, ''); }

  // ── Verð & viðskipti — works for ANY customer (not gated behind
  //    er_i_thjonustu). Reuses the SAME stores as the Fyrirtæki page so the
  //    office↔Sala stays consistent:
  //      • Tilboðsverð  → window.CompanyPricing.list/save (patch 113,
  //        AppSettings.company_pricing[co_id]) — auto-applies in Sala.
  //      • Sjálfvirkur afsláttur % → fyrirtaeki.afslattur_pct (patch 255) —
  //        auto-fills state.discount_pct when the customer is picked in Sala.
  //      • Hreyfingar → #hreyfingarlisti/<kt> deep-link (patch 253/167).
  //    Rule (Agnar): sérverð EÐA fastur afsláttur á vöru — aldrei bæði.
  function getPricingList(coId) {
    try { return (window.CompanyPricing && CompanyPricing.list(coId)) || []; }
    catch (_) { return []; }
  }
  function renderTilbodRows(coId) {
    const list = getPricingList(coId);
    if (!list.length) {
      return '<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--ink4);font-size:12px;font-style:italic">Engin tilboðsverð skráð — bættu við hér að ofan</td></tr>';
    }
    return list.map(p => {
      const inc = (+p.price_ex_vat || 0) * (1 + (+p.vsk_pct || 24) / 100);
      return '<tr data-id="' + esc(p.id) + '" style="border-top:1px solid var(--brd)">' +
        '<td style="padding:7px 10px;font-size:12.5px;font-weight:600;color:var(--ink1)">' + esc(p.name) +
          (p.notes ? '<span style="color:var(--ink3);font-weight:400;font-size:11px"> · ' + esc(p.notes) + '</span>' : '') + '</td>' +
        '<td style="padding:7px 10px;font-size:12.5px;text-align:right;color:var(--brand);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap">' + fmtKr(p.price_ex_vat) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:right;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap">' + fmtKr(inc) + '</td>' +
        '<td style="padding:7px 10px;text-align:center"><button class="_vd-cpr-del" data-id="' + esc(p.id) + '" type="button" title="Eyða tilboðsverði" style="background:var(--surface);border:1px solid var(--red-bd);color:var(--red);border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:11px;line-height:1">✕</button></td>' +
      '</tr>';
    }).join('');
  }
  function renderCommerceCard(c) {
    const coId = c.id;
    const kt = ktDigits(c.kennitala);
    const disc = Math.max(0, Math.min(100, +c.afslattur_pct || 0));
    const tilbodCnt = getPricingList(coId).length;
    return `
      <div style="background:var(--surface);border:1px solid var(--brd);border-left:3px solid var(--brand);border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--ink1);display:flex;align-items:center;gap:7px"><span style="font-size:17px">💼</span> Verð &amp; afsláttur</h3>
          ${kt.length === 10 ? `<button id="_vd-hreyf" type="button" title="Öll viðskipti / reikningar þessa viðskiptavinar" style="padding:7px 13px;background:var(--bg);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px">📊 Hreyfingar →</button>` : ''}
        </div>

        <!-- Sjálfvirkur afsláttur -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;background:var(--bg);border:1px solid var(--brd);border-radius:10px;margin-bottom:12px">
          <span style="font-size:13px;font-weight:700;color:var(--grn)">🎯 Sjálfvirkur afsláttur</span>
          <span style="font-size:10.5px;color:var(--ink3)">gildir sjálfkrafa á allt í Sölu</span>
          <span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">
            <input id="_vd-disc-inp" type="number" min="0" max="100" step="1" value="${disc || ''}" placeholder="0" style="width:66px;padding:6px 8px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;background:var(--surface);color:var(--ink1)">
            <span style="font-size:13px;color:var(--ink2);font-weight:700">%</span>
            <button id="_vd-disc-save" type="button" style="padding:7px 14px;background:var(--brand);color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Vista</button>
          </span>
        </div>

        <!-- Tilboðsverð -->
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--brand)">💰 Tilboðsverð</span>
          <span style="font-size:11px;font-weight:700;color:var(--brand);background:var(--red-bg);border:1px solid var(--red-bd);border-radius:99px;padding:1px 8px">${tilbodCnt}</span>
          <span style="font-size:10.5px;color:var(--ink3)">sérverð sem yfirstíga búðarverð í Sölu</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 110px 66px auto;gap:6px;align-items:center;margin-bottom:8px">
          <div style="display:flex;gap:4px;min-width:0">
            <input id="_vd-cpr-name" type="text" placeholder="t.d. Hleðsla tilboðsverð" style="flex:1;min-width:0;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12.5px;background:var(--surface);color:var(--ink1)">
            <button class="_vd-cpr-pick" type="button" title="Leita að vöru / þjónustu" style="padding:6px 9px;background:var(--bg);border:1px solid var(--brd2);color:var(--brand);border-radius:7px;cursor:pointer;font-size:13px;flex-shrink:0">🔍</button>
          </div>
          <input id="_vd-cpr-price" type="number" placeholder="Verð án VSK" min="0" step="1" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12.5px;text-align:right;background:var(--surface);color:var(--ink1)">
          <input id="_vd-cpr-vsk" type="number" value="24" min="0" max="100" title="VSK %" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:12.5px;text-align:center;background:var(--surface);color:var(--ink1)">
          <button class="_vd-cpr-add" type="button" style="padding:7px 13px;background:var(--brand);color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;white-space:nowrap">+ Bæta við</button>
        </div>
        <div style="background:var(--surface);border:1px solid var(--brd);border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <thead style="background:var(--bg)"><tr>
              <th style="padding:6px 10px;text-align:left;font-size:9.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">Vara / þjónusta</th>
              <th style="padding:6px 10px;text-align:right;font-size:9.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">Án vsk</th>
              <th style="padding:6px 10px;text-align:right;font-size:9.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">M/vsk</th>
              <th style="padding:6px 10px;width:40px"></th>
            </tr></thead>
            <tbody id="_vd-cpr-list">${renderTilbodRows(coId)}</tbody>
          </table>
        </div>
        <div style="margin-top:7px;font-size:10.5px;color:var(--ink3)">💡 Sérverð <strong>eða</strong> fastur afsláttur á vöru — ekki bæði á sömu vöru.</div>
      </div>
    `;
  }

  // ── Container ──────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-arsskodun') ||
                   document.getElementById('view-allir-vidsk') ||
                   document.getElementById('view-counter');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_vd-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function activate() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => {
      v.style.display = 'none'; v.classList.remove('active');
    });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.remove('active'));
  }

  function show(coId) {
    _currentId = +coId;
    activate();
    render();
  }

  function goBack() {
    if (window.App && App.switchView) {
      App.switchView('allir-vidsk');
    }
  }

  // ── Soft-delete this customer ──────────────────────────────────────────
  // Sets fyrirtaeki.deleted_at so the row drops out of every list (the loaders
  // filter `deleted_at IS NULL`). Reversible from SQL if needed — nothing is
  // hard-deleted, and any linked úttæki keep their place in the equipment list.
  async function deleteCurrent() {
    const co = ((window.Companies && Companies.list) || []).find(x => +x.id === _currentId)
      || { id: _currentId, nafn: '' };
    const nafn = co.nafn || ('#' + _currentId);
    const units = (window.DB && DB.cache && Array.isArray(DB.cache.units))
      ? DB.cache.units.filter(u => u.client === co.nafn).length : 0;
    let msg = 'Eyða viðskiptavininum "' + nafn + '"?\n\nHann hverfur úr öllum listum.';
    if (co.er_i_thjonustu === true) msg += '\n\n⚠ Þessi viðskiptavinur er í þjónustu.';
    if (units > 0) msg += '\n\n⚠ ' + units + ' skráð tæki halda sér í tækjalistanum.';
    if (!window.confirm(msg)) return;
    const sb = window.DB && DB.sb;
    if (!sb) { if (window.Toast && Toast.show) Toast.show('Engin nettenging'); return; }
    try {
      const r = await sb.from('fyrirtaeki').update({ deleted_at: new Date().toISOString() }).eq('id', _currentId);
      if (r.error) throw r.error;
      // Drop it from the in-memory list so the view it returns to is instantly correct.
      if (window.Companies && Array.isArray(Companies.list)) {
        Companies.list = Companies.list.filter(x => +x.id !== _currentId);
      }
      if (window.Toast && Toast.show) Toast.show('🗑 ' + nafn + ' eytt');
      goBack();
    } catch (e) {
      alert('Villa við eyðingu: ' + ((e && e.message) || e));
    }
  }

  // ── Klára heimsókn — one-click visit completion ────────────────────────
  // Driver workflow tonight (2026-05-18): after visiting a customer and
  // checking the equipment, the driver clicks "✓ Klára heimsókn". This:
  //
  //   1. Asks for the technician name (saved per browser).
  //   2. Asks: do you want to mark ALL units inspected today? Or pick?
  //      • If "All": bulk-update every active unit's last_insp/next_insp.
  //      • If "Pick": opens the company profile (view-companies) where
  //        per-unit dropdowns let driver mark some as done, others as
  //        "needs refill" → those go through Verkstæði → patch 122 receive
  //        flow → patch 121 pickup checkout (which also bumps next_insp).
  //   3. Updates the company's last_year_inspected so it falls out of the
  //      Ársskoðun "needs work this year" filter.
  //   4. Opens patch 102's Úttektarskýrsla pre-filled — driver prints or
  //      emails the report.
  //
  // Net effect: the daily-route case (everything OK) is one button.
  // The exception case (some units need refill) is one click to switch
  // contexts to the per-unit page — still much faster than the paper
  // alternative the drivers were threatening.
  const LS_TECH = 'visit_tech_name';

  async function completeVisit() {
    if (!_currentId) return;
    const c = getCompany(_currentId);
    if (!c) return;

    const units = getUnitsFor(c.nafn);
    if (units.length === 0) {
      const ok = confirm('Engin tæki skráð á "' + c.nafn + '". Viltu samt skrá heimsóknina (uppfærir síðasta ár í Fyrirtækjaþjónustu) og opna úttektarskýrslu?');
      if (!ok) return;
      await markCompanyVisited(c);
      openReport(c.id);
      return;
    }

    // Ask for technician name (cached)
    let tech = localStorage.getItem(LS_TECH) || '';
    tech = prompt('Hver gerði skoðunina?', tech);
    if (!tech) return;
    tech = tech.trim();
    if (tech) localStorage.setItem(LS_TECH, tech);

    // Confirmation: all-inspected vs pick
    const msg = 'Skrá ' + units.length + ' tæki sem skoðuð í dag hjá "' + c.nafn + '"?\n\n' +
                '• Smelltu OK til að merkja ÖLL sem skoðuð (heilsuvinsla)\n' +
                '• Smelltu Hætta til að fara á fyrirtækjasíðuna og velja tæki';
    if (!confirm(msg)) {
      // Driver wants per-unit control — bounce them to the legacy company
      // profile where the row dropdowns and Sækja-inn flow live.
      if (window._openCompanySafe) window._openCompanySafe(_currentId);
      return;
    }

    const today = new Date().toISOString().slice(0,10);
    const nextYear = (parseInt(today.slice(0,4))+1) + today.slice(4);
    const SB = window.DB && window.DB.sb;

    let updated = 0;
    let failed = 0;

    // Bulk update in DB if online; otherwise just local cache.
    if (SB) {
      try {
        const ids = units.map(u => u.id);
        const { error } = await SB.from('uttaeki').update({
          last_insp: today,
          next_insp: nextYear
        }).in('id', ids);
        if (error) {
          console.error('[vidsk-detail] bulk update failed:', error);
          alert('Vista mistókst: ' + error.message);
          return;
        }
        updated = ids.length;
        // Best-effort skodunar_saga history rows. Failure here doesn't block
        // the visit completion — the unit updates already landed.
        try {
          const histRows = ids.map(uid => ({
            unit_id: uid,
            date: today,
            tech: tech,
            result: 'pass'
          }));
          await SB.from('skodunar_saga').insert(histRows);
        } catch (e) { console.warn('[vidsk-detail] saga insert failed', e); }
      } catch (e) {
        failed = units.length;
        alert('Vista mistókst: ' + (e.message || e));
        return;
      }
    }

    // Update local cache so the page reflects new dates without a refresh.
    units.forEach(u => {
      u.last_insp = today;
      u.next_insp = nextYear;
    });

    await markCompanyVisited(c);

    if (window.Toast && window.Toast.show) {
      window.Toast.show('✓ Heimsókn skráð — ' + updated + ' tæki uppfærð', 'success');
    }

    // Re-render so the unit table dates refresh
    render();

    // Open the Úttektarskýrsla pre-filled. Patch 102 picks up technician
    // name from localStorage; we just saved it.
    openReport(c.id);
  }

  // Stamp the company as visited this year so it leaves Ársskoðun's "due"
  // filter immediately. Doesn't touch arsskodun if the customer isn't
  // subscribed — caller should handle that.
  async function markCompanyVisited(c) {
    if (!window.AppSettings || !window.AppSettings.save) return;
    const arsMap = Object.assign({}, window.AppSettings.path('arsskodun_customers') || {});
    const existing = arsMap[String(c.id)];
    if (!existing) return; // not an arsskodun customer; nothing to update
    const curYear = new Date().getFullYear();
    arsMap[String(c.id)] = Object.assign({}, existing, {
      last_year_inspected: curYear
    });
    await window.AppSettings.save({ arsskodun_customers: arsMap });
  }

  function openReport(coId) {
    setTimeout(() => {
      if (window.VisitReport && typeof window.VisitReport.open === 'function') {
        // Patch 102's modal expects to find the company via _openCompanySafe
        // context (it reads window.Companies.current). Switch view first so
        // the report has the right company in scope.
        if (window._openCompanySafe) {
          window._openCompanySafe(coId);
          setTimeout(() => window.VisitReport.open(coId), 400);
        } else {
          window.VisitReport.open(coId);
        }
      } else if (window._openCompanySafe) {
        // Fallback: bounce to company profile, driver clicks the visit
        // report button themselves.
        window._openCompanySafe(coId);
      }
    }, 300);
  }

  // ── Subscribe / unsubscribe ────────────────────────────────────────────
  async function toggleService(svc, action) {
    if (!_currentId) return;
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return;
    }
    const STORAGE_KEY = svc === 'ars' ? 'arsskodun_customers' : 'brunakerfi_customers';
    const map = Object.assign({}, window.AppSettings.path(STORAGE_KEY) || {});
    const c = getCompany(_currentId);
    const name = (c && c.nafn) || ('co#' + _currentId);

    if (action === 'add') {
      const svcLabel = svc === 'ars' ? 'fyrirtækjaþjónustu' : 'brunakerfi';
      if (!confirm('Skrá "' + name + '" í ' + svcLabel + '?')) return;
      if (svc === 'ars') {
        // 2026-05-21: explicit `subscribed: true` so patch 153 knows this is a
        // real subscription (not a migration leftover with empty equipment).
        // Fixes "I assigned Hátún 8 but it won't show in Fyrirtæki í þjónustu".
        map[String(_currentId)] = Object.assign({}, map[String(_currentId)] || {}, {
          equipment: (map[String(_currentId)] && map[String(_currentId)].equipment) || {},
          inspect_month: (map[String(_currentId)] && map[String(_currentId)].inspect_month) || 0,
          last_year_inspected: (map[String(_currentId)] && map[String(_currentId)].last_year_inspected) || 0,
          subscribed: true
        });
      } else {
        map[String(_currentId)] = Object.assign({}, map[String(_currentId)] || {}, {
          co_id: +_currentId,
          inspect_month: (map[String(_currentId)] && map[String(_currentId)].inspect_month) || 0,
          unit_count: (map[String(_currentId)] && map[String(_currentId)].unit_count) || 0
        });
      }
    } else if (action === 'remove') {
      const svcLabel = svc === 'ars' ? 'fyrirtækjaþjónustu' : 'brunakerfi';
      if (!confirm('Fjarlægja "' + name + '" úr ' + svcLabel + '?\n\n(Gögn um búnað haldast — bara samningsmerkið fer.)')) return;
      // AppSettings.save() deep-merges, so `delete map[id]` doesn't
      // propagate — the existing key would survive the merge. Set the
      // value to null instead. Our subscription checks treat null as
      // "not subscribed" (_hasArs requires .equipment; _hasBru requires
      // a truthy value).
      map[String(_currentId)] = null;
    }
    const ok = await window.AppSettings.save({ [STORAGE_KEY]: map });
    if (!ok) { alert('Vista mistókst'); return; }
    // 2026-06-02: ársþjónusta subscription now ALSO lives on the real
    // fyrirtaeki.er_i_thjonustu column — a per-row write that can't be
    // clobbered by another computer's stale save of the whole settings blob.
    if (svc === 'ars') {
      try {
        const sb = window.DB && window.DB.sb;
        if (sb) await sb.from('fyrirtaeki').update({ er_i_thjonustu: action === 'add' }).eq('id', _currentId);
      } catch (e) { console.warn('[vidsk-detail] er_i_thjonustu update failed', e); }
    }
    render();
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('_vd-main');
    if (!main) return setTimeout(render, 200);
    if (!_currentId) {
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b">Enginn viðskiptavinur valinn</div>';
      return;
    }
    const c = getCompany(_currentId);
    if (!c) {
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b">Viðskiptavinur fannst ekki (id ' + _currentId + ')</div>';
      return;
    }
    const ars = getArs(_currentId);
    const bru = getBru(_currentId);
    const hasArs = !!(ars && ars.equipment);
    const hasBru = !!bru;
    const units = getUnitsFor(c.nafn);
    const initial = (c.nafn || '?').trim().charAt(0).toUpperCase();
    const avatarColor = hasArs && hasBru ? '#7c3aed' :
                        hasArs ? '#b91c1c' :
                        hasBru ? '#1d4ed8' : '#64748b';

    main.innerHTML = `
      <div style="max-width:980px;margin:0 auto;padding:18px 20px 60px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;flex-wrap:wrap">
          <button id="_vd-back" type="button" style="padding:6px 12px;background:var(--surface);color:var(--ink2);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">‹ Til baka</button>
          ${(hasArs || hasBru) ? `
          <button id="_vd-complete-visit" type="button" title="Skrá heimsókn: merkir öll virk tæki sem skoðuð í dag og opnar úttektarskýrslu" style="padding:9px 16px;background:var(--grn);color:#fff;border:1px solid var(--grn);border-radius:10px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;box-shadow:var(--shadow-sm)">
            ✓ Klára heimsókn
          </button>
          ` : ''}
          <div style="display:flex;align-items:center;gap:10px">
            <button id="_vd-delete" type="button" title="Eyða þessum viðskiptavin (felur hann úr öllum listum)" style="padding:6px 12px;background:var(--surface);color:var(--red);border:1px solid var(--red-bd);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">🗑 Eyða</button>
            <div style="font-size:11px;color:var(--ink4)">#${esc(c.id)}</div>
          </div>
        </div>

        <!-- Quick action buttons (when subscribed to either service) -->
        ${(hasArs || hasBru) ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <button id="_vd-action-report" type="button" title="Útektarskýrsla fyrir þessa heimsókn (prentanleg)" style="padding:7px 13px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">📋 Úttektarskýrsla</button>
          <button id="_vd-action-floorplan" type="button" title="Teikning af staðsetningu tækja" style="padding:7px 13px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">📐 Teikning</button>
          <button id="_vd-action-fullpage" type="button" title="Full fyrirtækisíða með öllum aðgerðum (Mörg tæki, Bæta við tæki, o.s.frv.)" style="padding:7px 13px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">🏢 Opna fyrirtækisíðu →</button>
        </div>
        ` : ''}

        <!-- Customer card -->
        <div style="background:var(--surface);border:1px solid var(--brd);border-radius:14px;padding:18px 20px;margin-bottom:14px;box-shadow:var(--shadow-sm)">
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:54px;height:54px;flex-shrink:0;border-radius:50%;background:${avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;box-shadow:var(--shadow-sm)">${esc(initial)}</div>
            <div style="min-width:0;flex:1">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:800;color:var(--ink1);line-height:1.2">${esc(c.nafn || '—')}</h1>
              ${c.kennitala ? `<div style="font-size:12px;color:var(--ink3);font-family:var(--mono,monospace)">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:14px;font-size:12.5px;color:var(--ink2)">
            ${c.heimilisfang ? `<div><span style="color:var(--ink3)">📍 Heimilisfang</span><br><span style="color:var(--ink1);font-weight:600">${esc(c.heimilisfang)}</span></div>` : ''}
            ${c.simi || c.farsimi ? `<div><span style="color:var(--ink3)">📞 Sími</span><br><span style="color:var(--ink1);font-weight:600">${esc(c.simi || c.farsimi)}</span></div>` : ''}
            ${c.netfang ? `<div style="min-width:0"><span style="color:var(--ink3)">✉️ Netfang</span><br><span style="color:var(--ink1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block">${esc(c.netfang)}</span></div>` : ''}
            ${c.tengiliður ? `<div><span style="color:var(--ink3)">👤 Tengiliður</span><br><span style="color:var(--ink1);font-weight:600">${esc(c.tengiliður)}</span></div>` : ''}
          </div>
        </div>

        <!-- Service subscriptions -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:14px">

          <!-- Fyrirtækjaþjónusta card -->
          <div style="background:var(--surface);border:1px solid var(--brd);border-left:3px solid ${hasArs?'var(--red)':'var(--brd2)'};border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-weight:700;color:${hasArs?'var(--red)':'var(--ink2)'};font-size:14px;display:flex;align-items:center;gap:7px">
                <span style="font-size:18px">🔥</span><span>Fyrirtækjaþjónusta</span>
              </div>
              ${hasArs
                ? '<span style="background:var(--grn-bg);color:var(--grn);font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--grn-bd)">✓ Skráð</span>'
                : '<span style="background:var(--bg);color:var(--ink3);font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--brd)">Ekki skráð</span>'
              }
            </div>
            ${hasArs ? (() => {
              // 2026-06-16: inspection-year status — mirrors the list/leiðsögn so
              // "Tekið út 2026 (skjöl eftir)" / "Skoðað 2026" shows here too, instead
              // of the detail silently disagreeing with the main list.
              const curYear = new Date().getFullYear();
              const lastYr = +((ars||{}).last_year_inspected) || 0;
              const fieldYr = +((ars||{}).field_inspected_year) || 0;
              const im = +((ars||{}).inspect_month) || 0;
              const moLabel = im >= 1 && im <= 12 ? MONTHS_IS[im-1] : '';
              const base = 'font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;';
              let pill;
              if (lastYr === curYear) pill = `<span style="${base}background:var(--grn-bg);color:var(--grn);border:1px solid var(--grn-bd)">✓ Skoðað ${curYear}</span>`;
              else if (fieldYr === curYear) pill = `<span style="${base}background:var(--blu-bg);color:var(--blu);border:1px solid var(--blu-bd)">🔵 Tekið út ${curYear} — skjöl eftir</span>`;
              else if (lastYr > 0) pill = `<span style="${base}background:var(--amb-bg);color:var(--amb);border:1px solid var(--amb-bd)">Síðast skoðað ${lastYr}</span>`;
              else pill = `<span style="${base}background:var(--bg);color:var(--ink3);border:1px solid var(--brd)">Engin skoðun skráð</span>`;
              return `<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${pill}${moLabel ? `<span style="font-size:10.5px;color:var(--ink3)">📅 ${esc(moLabel)}</span>` : ''}</div>`;
            })() : ''}
            ${hasArs ? (() => {
              // 2026-05-19: simplified top-left box. Date info (skoðunarmánuður,
              // síðasta skoðun, áætlaðar tekjur) was duplicating what shows in
              // the units table and athugasemdir memo. Replace with a compact
              // equipment-count grid — that's what the user actually wants to
              // see at a glance.
              const eq = (ars && ars.equipment) || {};
              const eqRows = [
                ['lettvatn', 'Léttvatn'],
                ['duft2', 'Duft 2kg'],
                ['duft6_12', 'Duft 6-12kg'],
                ['co2_2', 'CO₂ 2kg'],
                ['co2_5', 'CO₂ 5kg'],
                ['brunaslongur', 'Brunaslöngur'],
                ['eldvarnarteppi', 'Eldvarnarteppi'],
                ['reykskynjarar', 'Reykskynjarar']
              ];
              const nonZero = eqRows.filter(([k]) => +eq[k] > 0);
              const total = nonZero.reduce((s, [k]) => s + (+eq[k] || 0), 0);
              if (!nonZero.length) {
                return `<div style="font-size:11.5px;color:var(--amb);margin-bottom:10px">Skráð í árlega slökkvitækjaskoðun, en engin tæki á samningi ennþá.</div>`;
              }
              return `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <div style="color:var(--ink3);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Tæki á samningi</div>
                    <div style="color:var(--red);font-size:11.5px;font-weight:700">${total} alls</div>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">
                    ${nonZero.map(([k, label]) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--brd);border-radius:6px;padding:4px 8px;font-size:11px">
                        <span style="color:var(--ink2);font-weight:600">${esc(label)}</span>
                        <span style="color:var(--ink1);font-weight:800;font-variant-numeric:tabular-nums">${+eq[k]}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            })() : `
              <div style="font-size:11.5px;color:var(--ink3);margin-bottom:10px">Skráðu viðskiptavin í árlega slökkvitækjaskoðun og fáðu aðgang að tækjavinnu, kortastaðsetningu, og skýrslugerð.</div>
            `}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${hasArs
                ? `<button class="_vd-toggle" data-svc="ars" data-action="remove" type="button" style="flex:1;padding:7px 12px;background:var(--surface);color:var(--red);border:1px solid var(--red-bd);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Fjarlægja</button>
                   <button class="_vd-open-ars" type="button" style="flex:1;padding:7px 12px;background:var(--red);color:#fff;border:1px solid var(--red);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna í Fyrirtækjaþjónustu →</button>`
                : `<button class="_vd-toggle" data-svc="ars" data-action="add" type="button" style="flex:1;padding:7px 12px;background:var(--red);color:#fff;border:1px solid var(--red);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">+ Skrá í fyrirtækjaþjónustu</button>`
              }
            </div>
          </div>

          <!-- Brunakerfi card -->
          <div style="background:var(--surface);border:1px solid var(--brd);border-left:3px solid ${hasBru?'var(--blu)':'var(--brd2)'};border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-weight:700;color:${hasBru?'var(--blu)':'var(--ink2)'};font-size:14px;display:flex;align-items:center;gap:7px">
                <span style="font-size:18px">🚨</span><span>Brunakerfi</span>
              </div>
              ${hasBru
                ? '<span style="background:var(--grn-bg);color:var(--grn);font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--grn-bd)">✓ Skráð</span>'
                : '<span style="background:var(--bg);color:var(--ink3);font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--brd)">Ekki skráð</span>'
              }
            </div>
            ${hasBru ? `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px;margin-bottom:10px">
                <div>
                  <div style="color:var(--ink3);font-size:10px;font-weight:700;text-transform:uppercase">Skoðunarmánuður</div>
                  <div style="color:var(--ink1);font-weight:600">${esc(MONTHS_IS[(+bru.inspect_month || 1) - 1] || '—')}</div>
                </div>
                <div>
                  <div style="color:var(--ink3);font-size:10px;font-weight:700;text-transform:uppercase">Skynjarar</div>
                  <div style="color:var(--ink1);font-weight:600">${bru.unit_count || '—'}</div>
                </div>
              </div>
            ` : `
              <div style="font-size:11.5px;color:var(--ink3);margin-bottom:10px">Skráðu viðskiptavin í brunakerfisþjónustu fyrir kerfisstaðsetningar, skynjaravinnu og árlegar skoðanir.</div>
            `}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${hasBru
                ? `<button class="_vd-toggle" data-svc="bru" data-action="remove" type="button" style="flex:1;padding:7px 12px;background:var(--surface);color:var(--blu);border:1px solid var(--blu-bd);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Fjarlægja</button>
                   <button class="_vd-open-bru" type="button" style="flex:1;padding:7px 12px;background:var(--blu);color:#fff;border:1px solid var(--blu);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna í Brunakerfisþjónustu →</button>`
                : `<button class="_vd-toggle" data-svc="bru" data-action="add" type="button" style="flex:1;padding:7px 12px;background:var(--blu);color:#fff;border:1px solid var(--blu);border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">+ Skrá í brunakerfi</button>`
              }
            </div>
          </div>
        </div>

        <!-- Verð & afsláttur & viðskipti (works for ANY customer) -->
        ${renderCommerceCard(c)}

        ${units.length > 0 ? `
        <!-- Slökkvitæki list -->
        <div style="background:var(--surface);border:1px solid var(--brd);border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:var(--shadow-sm)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--ink1)">🧯 Slökkvitæki <span style="color:var(--ink3);font-weight:500">(${units.length})</span></h3>
            <button class="_vd-open-field" type="button" style="padding:5px 10px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Opna fyrirtækisíðu →</button>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11.5px">
              <thead>
                <tr style="background:var(--bg);color:var(--ink3);text-transform:uppercase;font-size:10px;font-weight:700">
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Raðnr</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Tegund</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Stærð</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Staðsetning</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Næsta skoðun</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--brd)">Staða</th>
                </tr>
              </thead>
              <tbody>
                ${units.slice(0, 50).map(u => `
                  <tr>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd);font-family:var(--mono,monospace);font-weight:600;color:var(--ink1)">${esc(u.serial || u.radnumer || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd);color:var(--ink2)">${esc(u.type || u.gerd || 'Óþekkt')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd);color:var(--ink2)">${esc(u.size || u.staerd || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd);color:var(--ink2)">${esc(u.location || u.stadsetning || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd);color:var(--ink2)">${esc(u.next_insp || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid var(--brd)"><span style="background:var(--grn-bg);color:var(--grn);font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px">${esc(u.status || 'active')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${units.length > 50 ? `<div style="margin-top:8px;font-size:11px;color:var(--ink3);text-align:center">Sýni 50 af ${units.length}. <button class="_vd-open-field" type="button" style="background:none;border:none;color:var(--blu);text-decoration:underline;cursor:pointer;font:inherit">Opna fyrirtækisíðu</button> til að sjá allt.</div>` : ''}
          </div>
        </div>
        ` : (hasArs ? (() => {
          // No uttaeki rows for this customer — but if they have arsskodun
          // equipment counts (from the PDF master sheet), show those so the
          // user sees something instead of an empty page. The counts come
          // from the contract, not from the database — clearly labeled.
          const eq = (ars && ars.equipment) || {};
          const eqRows = [
            ['lettvatn', 'Léttvatn 6 ltr.'],
            ['duft2', 'Duft 2 kg.'],
            ['duft6_12', 'Duft 6-12 kg.'],
            ['co2_2', 'CO₂ 2 kg.'],
            ['co2_5', 'CO₂ 5 kg.'],
            ['brunaslongur', 'Brunaslöngur'],
            ['eldvarnarteppi', 'Eldvarnarteppi'],
            ['reykskynjarar', 'Reykskynjarar']
          ];
          const totalEq = eqRows.reduce((s, [k]) => s + (+eq[k] || 0), 0);
          if (totalEq === 0) {
            return `
              <div style="background:var(--amb-bg);border:1px dashed var(--amb-bd);border-radius:12px;padding:18px;margin-bottom:14px;text-align:center;color:var(--amb);font-size:12.5px">
                🧯 Engin slökkvitæki skráð fyrir þennan viðskiptavin ennþá. <button class="_vd-open-field" type="button" style="margin-left:6px;padding:4px 10px;background:var(--surface);color:var(--amb);border:1px solid var(--amb-bd);border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">Opna fyrirtækisíðu →</button>
              </div>
            `;
          }
          return `
            <div style="background:var(--surface);border:1px solid var(--brd);border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:var(--shadow-sm)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
                <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--ink1)">🧯 Slökkvitæki <span style="color:var(--ink3);font-weight:500">(${totalEq} skv. samningi)</span></h3>
                <span style="background:var(--amb-bg);color:var(--amb);font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--amb-bd)">⚠ Engin raðnúmer í kerfinu</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">
                ${eqRows.map(([k, label]) => {
                  const v = +eq[k] || 0;
                  if (!v) return '';
                  return `<div style="background:var(--bg);border:1px solid var(--brd);border-radius:7px;padding:8px 10px">
                    <div style="font-size:9.5px;color:var(--ink3);font-weight:600">${esc(label)}</div>
                    <div style="font-size:18px;font-weight:800;color:var(--ink1)">${v}</div>
                  </div>`;
                }).filter(Boolean).join('')}
              </div>
              <div style="margin-top:10px;font-size:11.5px;color:var(--amb);background:var(--amb-bg);border:1px solid var(--amb-bd);border-radius:8px;padding:8px 11px;line-height:1.5">
                <strong>Athugaðu:</strong> tölurnar koma úr síðasta árlegri úttekt (PDF) — engin tæki eru með raðnúmer skráð í kerfinu ennþá.
                Smelltu á <button class="_vd-open-field" type="button" style="background:var(--surface);color:var(--amb);border:1px solid var(--amb-bd);border-radius:5px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600;margin:0 2px">Opna fyrirtækisíðu →</button>
                og bættu þeim við með <strong>Mörg tæki</strong> hnappnum.
              </div>
            </div>
          `;
        })() : '')}

        ${c.athugasemdir ? `
        <!-- Notes -->
        <div style="background:var(--surface);border:1px solid var(--brd);border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:var(--shadow-sm)">
          <h3 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:var(--ink1)">📝 Athugasemdir</h3>
          <div style="font-size:12.5px;color:var(--ink2);white-space:pre-wrap;line-height:1.45">${esc(c.athugasemdir)}</div>
        </div>
        ` : ''}

        <div style="margin-top:20px;font-size:10.5px;color:var(--ink4);text-align:center">
          Viðskiptavinur ID #${c.id} · uppfært samstundis
        </div>
      </div>
    `;

    // Wire interactions
    main.querySelector('#_vd-back')?.addEventListener('click', goBack);
    main.querySelector('#_vd-delete')?.addEventListener('click', () => deleteCurrent());
    main.querySelector('#_vd-complete-visit')?.addEventListener('click', () => completeVisit());
    main.querySelector('#_vd-action-report')?.addEventListener('click', () => {
      if (window.VisitReport && typeof window.VisitReport.open === 'function') {
        // Patch 102's modal reads from window.Companies.current; switch
        // context first so the report has the right company.
        if (window._openCompanySafe) {
          window._openCompanySafe(_currentId);
          setTimeout(() => window.VisitReport.open(_currentId), 300);
        } else {
          window.VisitReport.open(_currentId);
        }
      } else if (window._openCompanySafe) {
        window._openCompanySafe(_currentId);
      }
    });
    main.querySelector('#_vd-action-floorplan')?.addEventListener('click', () => {
      const c = getCompany(_currentId);
      if (!c) return;
      const units = getUnitsFor(c.nafn);
      if (window.FloorPlan && typeof window.FloorPlan.load === 'function' && typeof window.FloorPlan.open === 'function') {
        try { window.FloorPlan.load(_currentId); } catch (_) {}
        try { window.FloorPlan.open(_currentId, c.nafn, units); } catch (e) {
          // Fallback: just open the company page where the Teikning button exists
          if (window._openCompanySafe) window._openCompanySafe(_currentId);
        }
      } else if (window._openCompanySafe) {
        window._openCompanySafe(_currentId);
      }
    });
    main.querySelector('#_vd-action-fullpage')?.addEventListener('click', () => {
      if (window._openCompanySafe) window._openCompanySafe(_currentId);
    });
    main.querySelectorAll('._vd-toggle').forEach(b => b.addEventListener('click', () => {
      toggleService(b.dataset.svc, b.dataset.action);
    }));
    // "Opna í Fyrirtækjaþjónustu →" — goes to the FULL company profile
    // page (Þjónustufyrirtæki), where the per-unit table + Úttektarskýrsla
    // + Mörg tæki / Bæta við tæki / Merkja skoðun / Teikning all live.
    // Previously routed to the Ársskoðun list page which only shows
    // summary equipment counts. _openCompanySafe is the helper used by
    // patches 13/18/77 and mapfix.js to navigate there safely.
    main.querySelectorAll('._vd-open-ars').forEach(b => b.addEventListener('click', () => {
      if (window._openCompanySafe) {
        window._openCompanySafe(_currentId);
      } else if (window.Companies && typeof Companies.openDetail === 'function') {
        Companies.openDetail(_currentId);
      } else if (window.App && App.switchView) {
        App.switchView('companies');
      }
    }));
    // "Opna í Brunakerfisþjónustu →" — open the brunakerfi-specific
    // customer profile (patch 147 exposes openCompanyDetail). Fallback
    // to plain view-switch if not loaded.
    main.querySelectorAll('._vd-open-bru').forEach(b => b.addEventListener('click', () => {
      if (window.Brunakerfi && typeof Brunakerfi.openCompanyDetail === 'function') {
        Brunakerfi.openCompanyDetail(_currentId);
      } else if (window.App && App.switchView) {
        App.switchView('brunakerfi');
      }
    }));
    // "Opna í Þjónustutæki →" (from the units section) — also goes to
    // the company profile so the user lands directly on the unit table
    // + report button rather than on the map.
    main.querySelectorAll('._vd-open-field').forEach(b => b.addEventListener('click', () => {
      if (window._openCompanySafe) {
        window._openCompanySafe(_currentId);
      } else if (window.App && App.switchView) {
        App.switchView('field');
      }
    }));

    // ── Commerce card wiring (Sjálfvirkur afsláttur · Tilboðsverð · Hreyfingar) ──
    wireCommerce(main, c);
  }

  // ── Commerce card behaviour ────────────────────────────────────────────
  function wireCommerce(main, c) {
    const coId = c.id;
    const sb = (window.DB && DB.sb) || null;

    // Load the current afslattur_pct from the DB (Companies.list may not carry
    // it) and fill the input if the user hasn't started typing.
    if (sb) {
      sb.from('fyrirtaeki').select('afslattur_pct').eq('id', coId).single()
        .then(r => {
          const inp = main.querySelector('#_vd-disc-inp');
          if (inp && document.activeElement !== inp && r && r.data) {
            const v = +r.data.afslattur_pct || 0;
            inp.value = v ? String(v) : '';
            // keep the local object in sync so a re-render shows the saved value
            c.afslattur_pct = v;
          }
        }).catch(() => {});
    }

    // 📊 Hreyfingar — deep-link to this customer's account statement.
    main.querySelector('#_vd-hreyf')?.addEventListener('click', () => {
      const kt = ktDigits(c.kennitala);
      if (kt.length !== 10) return;
      try {
        if (window.SalaCustomerHistory && typeof SalaCustomerHistory.urlFor === 'function') {
          location.hash = SalaCustomerHistory.urlFor(kt).replace(/^#/, '#');
        } else {
          location.hash = '#hreyfingarlisti/' + encodeURIComponent(kt);
        }
      } catch (_) {
        location.hash = '#hreyfingarlisti/' + encodeURIComponent(kt);
      }
    });

    // 🎯 Sjálfvirkur afsláttur — save to fyrirtaeki.afslattur_pct.
    main.querySelector('#_vd-disc-save')?.addEventListener('click', async () => {
      const inp = main.querySelector('#_vd-disc-inp');
      const btn = main.querySelector('#_vd-disc-save');
      let v = parseFloat(inp && inp.value);
      v = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
      if (!sb) { if (window.Toast && Toast.show) Toast.show('Engin gagnabankatenging.'); return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Vista…'; }
      try {
        const r = await sb.from('fyrirtaeki').update({ afslattur_pct: v }).eq('id', coId);
        if (r.error) throw r.error;
        // 2026-07-08 (afsláttar-úttekt): POS lookupKt takes the HIGHEST
        // afslattur_pct across ALL rows sharing the kt — propagate so
        // lowering/clearing actually takes effect (see patch 255).
        try {
          const ktd = String(c.kennitala || '').replace(/[^0-9]/g, '');
          if (ktd.length === 10 && ktd !== '9999999999') {
            const pats = [ktd, ktd.slice(0, 6) + '-' + ktd.slice(6)];
            await sb.from('fyrirtaeki').update({ afslattur_pct: v }).in('kennitala', pats);
            await sb.from('vidskiptavinir').update({ afslattur_pct: v }).in('kennitala', pats);
          }
        } catch (_) {}
        c.afslattur_pct = v;
        // keep the in-memory Companies.list row current so Sala picks it up
        const row = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
        if (row) row.afslattur_pct = v;
        if (window.Toast && Toast.show) Toast.show(v > 0 ? ('🎯 Sjálfvirkur afsláttur vistaður: ' + v + '%') : 'Afsláttur núllstilltur.');
        // Nudge the live Sala cart if this customer is open there.
        try { if (window.AutoDiscount && AutoDiscount.sync) { AutoDiscount.sync(); } } catch (_) {}
      } catch (err) {
        if (window.Toast && Toast.show) Toast.show('Villa við vistun: ' + ((err && err.message) || err));
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Vista'; }
      }
    });

    // 💰 Tilboðsverð — pick from vörulisti.
    main.querySelector('._vd-cpr-pick')?.addEventListener('click', () => {
      if (window.VorurPicker && typeof VorurPicker.open === 'function') {
        VorurPicker.open(p => {
          const nameInp = main.querySelector('#_vd-cpr-name');
          const priceInp = main.querySelector('#_vd-cpr-price');
          const vskInp = main.querySelector('#_vd-cpr-vsk');
          if (nameInp) nameInp.value = p.nafn || '';
          if (priceInp) priceInp.value = String(Math.round(+p.verd_an_vsk || 0));
          if (vskInp) vskInp.value = String(+p.vsk_prosenta || 24);
          if (priceInp) { priceInp.focus(); priceInp.select(); }
        });
      } else {
        alert('Vörulisti ekki tilbúinn — endurhladdu síðunni.');
      }
    });

    // 💰 Tilboðsverð — add.
    main.querySelector('._vd-cpr-add')?.addEventListener('click', async () => {
      const nameInp = main.querySelector('#_vd-cpr-name');
      const priceInp = main.querySelector('#_vd-cpr-price');
      const vskInp = main.querySelector('#_vd-cpr-vsk');
      const name = (nameInp && nameInp.value || '').trim();
      const price = parseFloat(priceInp && priceInp.value);
      const vsk = parseFloat(vskInp && vskInp.value);
      if (!name) { alert('Sláðu inn nafn vöru/þjónustu.'); return; }
      if (!Number.isFinite(price) || price < 0) { alert('Sláðu inn gilt verð.'); return; }
      if (!window.CompanyPricing || !CompanyPricing.save) { alert('Tilboðsverð-kerfi ekki tilbúið.'); return; }
      const list = getPricingList(coId).slice();
      list.push({
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name,
        price_ex_vat: price,
        vsk_pct: Number.isFinite(vsk) ? vsk : 24,
        notes: ''
      });
      await CompanyPricing.save(coId, list);
      refreshTilbod(main, coId);
      if (nameInp) nameInp.value = '';
      if (priceInp) priceInp.value = '';
      if (vskInp) vskInp.value = '24';
      if (window.Toast && Toast.show) Toast.show('💰 Tilboðsverð vistað');
    });

    // 💰 Tilboðsverð — delete (delegated on the list body).
    main.querySelector('#_vd-cpr-list')?.addEventListener('click', async e => {
      const del = e.target.closest('._vd-cpr-del');
      if (!del) return;
      if (!window.CompanyPricing || !CompanyPricing.save) return;
      const id = del.dataset.id;
      const list = getPricingList(coId).filter(p => p.id !== id);
      await CompanyPricing.save(coId, list);
      refreshTilbod(main, coId);
    });
  }

  function refreshTilbod(main, coId) {
    const body = main.querySelector('#_vd-cpr-list');
    if (body) body.innerHTML = renderTilbodRows(coId);
    // keep the count badge honest
    const badge = main.querySelector('#_vd-commerce-count');
    if (badge) badge.textContent = String(getPricingList(coId).length);
  }

  // Expose
  window.VidskDetail = {
    show, render, getCompany, version: 'v1'
  };

  console.log('[vidsk-detail v1] installed');
})();
/* === END VIÐSKIPTAVINUR — UNIFIED DETAIL === */
