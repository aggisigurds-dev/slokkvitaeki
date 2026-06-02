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
          <button id="_vd-back" type="button" style="padding:6px 12px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">‹ Til baka</button>
          ${(hasArs || hasBru) ? `
          <button id="_vd-complete-visit" type="button" title="Skrá heimsókn: merkir öll virk tæki sem skoðuð í dag og opnar úttektarskýrslu" style="padding:9px 16px;background:#16a34a;color:#fff;border:1px solid #15803d;border-radius:10px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;box-shadow:0 1px 2px rgba(22,163,74,0.25)">
            ✓ Klára heimsókn
          </button>
          ` : ''}
          <div style="font-size:11px;color:#94a3b8">#${esc(c.id)}</div>
        </div>

        <!-- Quick action buttons (when subscribed to either service) -->
        ${(hasArs || hasBru) ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <button id="_vd-action-report" type="button" title="Útektarskýrsla fyrir þessa heimsókn (prentanleg)" style="padding:7px 13px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">📋 Úttektarskýrsla</button>
          <button id="_vd-action-floorplan" type="button" title="Teikning af staðsetningu tækja" style="padding:7px 13px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">📐 Teikning</button>
          <button id="_vd-action-fullpage" type="button" title="Full fyrirtækisíða með öllum aðgerðum (Mörg tæki, Bæta við tæki, o.s.frv.)" style="padding:7px 13px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">🏢 Opna fyrirtækisíðu →</button>
        </div>
        ` : ''}

        <!-- Customer card -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,0.03)">
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:54px;height:54px;flex-shrink:0;border-radius:50%;background:${avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px">${esc(initial)}</div>
            <div style="min-width:0;flex:1">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:800;color:#0f172a;line-height:1.2">${esc(c.nafn || '—')}</h1>
              ${c.kennitala ? `<div style="font-size:12px;color:#64748b;font-family:monospace">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:14px;font-size:12.5px;color:#475569">
            ${c.heimilisfang ? `<div><span style="color:#94a3b8">📍 Heimilisfang</span><br><span style="color:#0f172a;font-weight:600">${esc(c.heimilisfang)}</span></div>` : ''}
            ${c.simi || c.farsimi ? `<div><span style="color:#94a3b8">📞 Sími</span><br><span style="color:#0f172a;font-weight:600">${esc(c.simi || c.farsimi)}</span></div>` : ''}
            ${c.netfang ? `<div style="min-width:0"><span style="color:#94a3b8">✉️ Netfang</span><br><span style="color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block">${esc(c.netfang)}</span></div>` : ''}
            ${c.tengiliður ? `<div><span style="color:#94a3b8">👤 Tengiliður</span><br><span style="color:#0f172a;font-weight:600">${esc(c.tengiliður)}</span></div>` : ''}
          </div>
        </div>

        <!-- Service subscriptions -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:14px">

          <!-- Fyrirtækjaþjónusta card -->
          <div style="background:${hasArs?'#fef2f2':'#fff'};border:1px solid ${hasArs?'#fecaca':'#e2e8f0'};border-radius:12px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-weight:700;color:${hasArs?'#b91c1c':'#475569'};font-size:14px;display:flex;align-items:center;gap:7px">
                <span style="font-size:18px">🔥</span><span>Fyrirtækjaþjónusta</span>
              </div>
              ${hasArs
                ? '<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid #bbf7d0">✓ Skráð</span>'
                : '<span style="background:#f1f5f9;color:#64748b;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid #cbd5e1">Ekki skráð</span>'
              }
            </div>
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
                return `<div style="font-size:11.5px;color:#92400e;margin-bottom:10px">Skráð í árlega slökkvitækjaskoðun, en engin tæki á samningi ennþá.</div>`;
              }
              return `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <div style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Tæki á samningi</div>
                    <div style="color:#b91c1c;font-size:11.5px;font-weight:700">${total} alls</div>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">
                    ${nonZero.map(([k, label]) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #fecaca;border-radius:6px;padding:4px 8px;font-size:11px">
                        <span style="color:#475569;font-weight:600">${esc(label)}</span>
                        <span style="color:#0f172a;font-weight:800;font-variant-numeric:tabular-nums">${+eq[k]}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            })() : `
              <div style="font-size:11.5px;color:#64748b;margin-bottom:10px">Skráðu viðskiptavin í árlega slökkvitækjaskoðun og fáðu aðgang að tækjavinnu, kortastaðsetningu, og skýrslugerð.</div>
            `}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${hasArs
                ? `<button class="_vd-toggle" data-svc="ars" data-action="remove" type="button" style="flex:1;padding:7px 12px;background:#fff;color:#b91c1c;border:1px solid #fecaca;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Fjarlægja</button>
                   <button class="_vd-open-ars" type="button" style="flex:1;padding:7px 12px;background:#b91c1c;color:#fff;border:1px solid #b91c1c;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna í Fyrirtækjaþjónustu →</button>`
                : `<button class="_vd-toggle" data-svc="ars" data-action="add" type="button" style="flex:1;padding:7px 12px;background:#b91c1c;color:#fff;border:1px solid #b91c1c;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">+ Skrá í fyrirtækjaþjónustu</button>`
              }
            </div>
          </div>

          <!-- Brunakerfi card -->
          <div style="background:${hasBru?'#eff6ff':'#fff'};border:1px solid ${hasBru?'#bfdbfe':'#e2e8f0'};border-radius:12px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-weight:700;color:${hasBru?'#1d4ed8':'#475569'};font-size:14px;display:flex;align-items:center;gap:7px">
                <span style="font-size:18px">🚨</span><span>Brunakerfi</span>
              </div>
              ${hasBru
                ? '<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid #bbf7d0">✓ Skráð</span>'
                : '<span style="background:#f1f5f9;color:#64748b;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid #cbd5e1">Ekki skráð</span>'
              }
            </div>
            ${hasBru ? `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px;margin-bottom:10px">
                <div>
                  <div style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase">Skoðunarmánuður</div>
                  <div style="color:#0f172a;font-weight:600">${esc(MONTHS_IS[(+bru.inspect_month || 1) - 1] || '—')}</div>
                </div>
                <div>
                  <div style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase">Skynjarar</div>
                  <div style="color:#0f172a;font-weight:600">${bru.unit_count || '—'}</div>
                </div>
              </div>
            ` : `
              <div style="font-size:11.5px;color:#64748b;margin-bottom:10px">Skráðu viðskiptavin í brunakerfisþjónustu fyrir kerfisstaðsetningar, skynjaravinnu og árlegar skoðanir.</div>
            `}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${hasBru
                ? `<button class="_vd-toggle" data-svc="bru" data-action="remove" type="button" style="flex:1;padding:7px 12px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Fjarlægja</button>
                   <button class="_vd-open-bru" type="button" style="flex:1;padding:7px 12px;background:#1d4ed8;color:#fff;border:1px solid #1d4ed8;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna í Brunakerfisþjónustu →</button>`
                : `<button class="_vd-toggle" data-svc="bru" data-action="add" type="button" style="flex:1;padding:7px 12px;background:#1d4ed8;color:#fff;border:1px solid #1d4ed8;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">+ Skrá í brunakerfi</button>`
              }
            </div>
          </div>
        </div>

        ${units.length > 0 ? `
        <!-- Slökkvitæki list -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0;font-size:14px;font-weight:700;color:#0f172a">🧯 Slökkvitæki <span style="color:#94a3b8;font-weight:500">(${units.length})</span></h3>
            <button class="_vd-open-field" type="button" style="padding:5px 10px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Opna fyrirtækisíðu →</button>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11.5px">
              <thead>
                <tr style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:10px;font-weight:700">
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Raðnr</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Tegund</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Stærð</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Staðsetning</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Næsta skoðun</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0">Staða</th>
                </tr>
              </thead>
              <tbody>
                ${units.slice(0, 50).map(u => `
                  <tr>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:600">${esc(u.serial || u.radnumer || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${esc(u.type || u.gerd || 'Óþekkt')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${esc(u.size || u.staerd || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${esc(u.location || u.stadsetning || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${esc(u.next_insp || '—')}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9"><span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px">${esc(u.status || 'active')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${units.length > 50 ? `<div style="margin-top:8px;font-size:11px;color:#94a3b8;text-align:center">Sýni 50 af ${units.length}. <button class="_vd-open-field" type="button" style="background:none;border:none;color:#1d4ed8;text-decoration:underline;cursor:pointer;font:inherit">Opna fyrirtækisíðu</button> til að sjá allt.</div>` : ''}
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
              <div style="background:#fffbeb;border:1px dashed #fde68a;border-radius:12px;padding:18px;margin-bottom:14px;text-align:center;color:#92400e;font-size:12.5px">
                🧯 Engin slökkvitæki skráð fyrir þennan viðskiptavin ennþá. <button class="_vd-open-field" type="button" style="margin-left:6px;padding:4px 10px;background:#fff;color:#92400e;border:1px solid #fde68a;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">Opna fyrirtækisíðu →</button>
              </div>
            `;
          }
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
                <h3 style="margin:0;font-size:14px;font-weight:700;color:#0f172a">🧯 Slökkvitæki <span style="color:#94a3b8;font-weight:500">(${totalEq} skv. samningi)</span></h3>
                <span style="background:#fef3c7;color:#92400e;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid #fde68a">⚠ Engin raðnúmer í kerfinu</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">
                ${eqRows.map(([k, label]) => {
                  const v = +eq[k] || 0;
                  if (!v) return '';
                  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:8px 10px">
                    <div style="font-size:9.5px;color:#64748b;font-weight:600">${esc(label)}</div>
                    <div style="font-size:18px;font-weight:800;color:#0f172a">${v}</div>
                  </div>`;
                }).filter(Boolean).join('')}
              </div>
              <div style="margin-top:10px;font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 11px;line-height:1.5">
                <strong>Athugaðu:</strong> tölurnar koma úr síðasta árlegri úttekt (PDF) — engin tæki eru með raðnúmer skráð í kerfinu ennþá.
                Smelltu á <button class="_vd-open-field" type="button" style="background:#fff;color:#92400e;border:1px solid #fde68a;border-radius:5px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600;margin:0 2px">Opna fyrirtækisíðu →</button>
                og bættu þeim við með <strong>Mörg tæki</strong> hnappnum.
              </div>
            </div>
          `;
        })() : '')}

        ${c.athugasemdir ? `
        <!-- Notes -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px">
          <h3 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#0f172a">📝 Athugasemdir</h3>
          <div style="font-size:12.5px;color:#475569;white-space:pre-wrap;line-height:1.45">${esc(c.athugasemdir)}</div>
        </div>
        ` : ''}

        <div style="margin-top:20px;font-size:10.5px;color:#94a3b8;text-align:center">
          Viðskiptavinur ID #${c.id} · uppfært samstundis
        </div>
      </div>
    `;

    // Wire interactions
    main.querySelector('#_vd-back')?.addEventListener('click', goBack);
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
  }

  // Expose
  window.VidskDetail = {
    show, render, getCompany, version: 'v1'
  };

  console.log('[vidsk-detail v1] installed');
})();
/* === END VIÐSKIPTAVINUR — UNIFIED DETAIL === */
