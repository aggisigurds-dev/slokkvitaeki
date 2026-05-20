/* Heildarkostnaður næstu þjónustu — neðst á fyrirtækisspjaldi.
 *
 * Aggregar per-unit val (Hleðsla / Yfirferð / Sleppa — frá patch 131)
 * í kostnaðarútlit:
 *   • Hver tegund+stærð er sýnd með fjölda í hverri þjónustu
 *     (t.d. "ABC Duft 2 kg — 10× Hleðsla + 4× Yfirferð")
 *   • Verðlisti úr `vorur` (Þjónusta-flokkur)
 *   • Tilboðsverð yfirstígur (patch 113)
 *   • Aksturskostnaður user-editable (vistast per fyrirtæki)
 *
 * Vistun: localStorage[`slokk_trip_<coId>`] = { units: {uid: 'hledsla'|...}, drive: kr }.
 */
(() => {
  if (window.__companyTotalCostInstalled) return;
  window.__companyTotalCostInstalled = true;

  let _services = null;
  let _servicesPromise = null;

  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // 2026-05-19: collapse brand variants into a canonical family label.
  // "ABC Duft", "PFC Duft", "Duft" all bill the same — should bucket as
  // one "Duft" line in the cost table. Mirrors patch 131's typeBucket()
  // but returns a human-readable label instead of a slug.
  function normalizeTypeFamily(t) {
    const s = String(t || '').toLowerCase();
    if (!s.trim()) return '—';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(s)) return 'Duft';
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(s)) return 'CO₂';
    if (/léttv|lettv|abf|froð|frod/.test(s)) return 'Léttvatn';
    // brunaslang/brunaslöng singular+plural, but NOT 'slönguskápur' (separate fixture).
    if (/brunaslang|brunaslöng|brunaslong|hose/.test(s)) return 'Brunaslanga';
    if (/reykskynj|smoke/.test(s)) return 'Reykskynjari';
    if (/teppi|blanket/.test(s)) return 'Eldvarnateppi';
    // Unknown — keep original label so it still shows in the table.
    return t || '—';
  }

  async function loadServices() {
    if (_services) return _services;
    if (_servicesPromise) return _servicesPromise;
    _servicesPromise = (async () => {
      const sb = window.DB && window.DB.sb;
      if (!sb) return [];
      const { data } = await sb.from('vorur')
        .select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,virkt')
        .eq('virkt', true);
      // 2026-05-11: Include ALL active vörur, not just Þjónusta. Items like
      // Eldvarnateppi live under flokkur='Eldvarnir' but still represent the
      // price the customer is charged when one needs replacing — we just
      // can't match them via hleðsla/yfirferð token, so they fall through
      // a secondary lookup path (see findReplacementProduct below).
      _services = (data || []);
      return _services;
    })();
    return _servicesPromise;
  }

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ð/g, 'd').replace(/þ/g, 'th')
      .replace(/æ/g, 'ae').replace(/[áàâ]/g, 'a').replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i').replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u')
      .replace(/[ýỳ]/g, 'y').replace(/ö/g, 'o')
      // 2026-05-14: Normalize Unicode subscript digits (U+2080..U+2089) to
      // ASCII 0-9 so "CO₂" / "H₂O" etc. match against "CO2" / "H2O" tokens.
      // Same for superscript digits (U+2070..U+2079) just in case.
      .replace(/[₀-₉]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 0x30))
      .replace(/[⁰¹²³⁴-⁹]/g, ch => {
        const map = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9' };
        return map[ch] || ch;
      })
      .replace(/[._,()]/g, ' ')
      // Split "5kg" → "5 kg" so number+unit tokenize separately.
      .replace(/(\d)([a-z])/g, '$1 $2')
      // 2026-05-19: DO NOT split letter+digit like "co2" → "co 2". That
      // breaks chemical-compound tokens (CO2, H2O) into 1-2-char fragments
      // which then fail the strongMatches >=3 check, so all CO2 services
      // get rejected. Chemical names are real distinguishing tokens and
      // should stay intact. "kg5"/"ltr5"-style anti-patterns don't exist
      // in the actual product names.
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Stem-based token match: short tokens must match exactly, longer tokens
  // match if either is a prefix of the other (or one contains the other).
  // This is how we get "brunaslöngur" (query) to match "Yfirferð Brunaslanga"
  // (service name) without a full stemmer for Icelandic.
  function tokenMatches(qTok, nTok) {
    if (qTok === nTok) return true;
    if (qTok.length < 4 || nTok.length < 4) return false;
    const stemLen = Math.min(qTok.length, nTok.length, 5);
    const qs = qTok.slice(0, stemLen);
    const ns = nTok.slice(0, stemLen);
    if (qs === ns) return true;
    // Also accept substring containment for compound words.
    if (qTok.includes(nTok) || nTok.includes(qTok)) return true;
    return false;
  }

  function findMatchingServices(type, size, services) {
    const qTokens = norm(type + ' ' + size).split(' ').filter(Boolean);
    // Boost: distinguishing tokens (non-generic, length>=4) carry more weight
    // than short / generic ones like "kg" or "l".
    const candidates = [];
    for (const p of services) {
      const n = norm(p.nafn);
      const isHledsla = /hledsla/.test(n);
      const isYfirferd = /yfirferd/.test(n);
      if (!isHledsla && !isYfirferd) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0;
      let strongMatches = 0;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) {
          matched++;
          // 2026-05-19: lowered from >=4 to >=3 so "co2" qualifies as a
          // strong token. Was rejecting all CO2 matches because the token
          // is only 3 chars long.
          if (q.length >= 3) strongMatches++;
        }
      }
      // Need at least one "strong" semantic token match (e.g. brunaslang,
      // duft, co2 — not just kg / 6). Pure size matches don't qualify.
      if (strongMatches === 0) continue;
      const score = matched / Math.max(1, qTokens.length);
      if (score >= 0.5) candidates.push({ product: p, score, kind: isHledsla ? 'hledsla' : 'yfirferd' });
    }
    candidates.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'hledsla' ? -1 : 1;
      return b.score - a.score;
    });
    return candidates.map(c => c.product);
  }

  function pickByKind(matching, kind) {
    for (const p of matching) {
      const n = norm(p.nafn);
      if (kind === 'hledsla' && /hledsla/.test(n)) return p;
      if (kind === 'yfirferd' && /yfirferd/.test(n)) return p;
    }
    return matching[0] || null;
  }

  // Fallback: when there's no hleðsla/yfirferð service for this type+size,
  // find a product whose name shares the same stem. Used for items like
  // Eldvarnateppi where the customer is charged the replacement price.
  function findReplacementProduct(type, size, services) {
    const qTokens = norm(type + ' ' + size).split(' ').filter(Boolean);
    let best = null;
    for (const p of services) {
      const n = norm(p.nafn);
      // Skip hleðsla/yfirferð — those go through the main matcher.
      if (/hledsla|yfirferd/.test(n)) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0;
      let strongMatches = 0;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) {
          matched++;
          // 2026-05-19: lowered from >=4 to >=3 so "co2" qualifies as a
          // strong token. Was rejecting all CO2 matches because the token
          // is only 3 chars long.
          if (q.length >= 3) strongMatches++;
        }
      }
      if (strongMatches === 0) continue;
      const score = matched / Math.max(1, qTokens.length);
      if (score >= 0.5 && (!best || score > best.score)) {
        best = { product: p, score };
      }
    }
    return best ? best.product : null;
  }

  function findOverride(coId, productName) {
    if (!coId || !productName) return null;
    if (!window.CompanyPricing || !window.CompanyPricing.list) return null;
    const list = window.CompanyPricing.list(coId);
    if (!list || !list.length) return null;
    const n = String(productName).toLowerCase().trim();
    let best = null;
    for (const o of list) {
      const oName = String(o.name || '').toLowerCase().trim();
      if (!oName) continue;
      if (n.indexOf(oName) >= 0 || oName.indexOf(n) >= 0) {
        if (!best || oName.length > String(best.name).length) best = o;
      }
    }
    return best;
  }

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }
  function getCompanyName() {
    if (!window.Companies || !Companies.list) return '';
    const id = getCompanyId();
    if (!id) return '';
    const c = (Companies.list || []).find(x => x.id === id);
    return c ? c.nafn : '';
  }

  function tripStateKey(coId) { return 'slokk_trip_' + coId; }
  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem(tripStateKey(coId)) || '{}'); }
    catch (_) { return {}; }
  }
  function saveTripState(coId, state) {
    try { localStorage.setItem(tripStateKey(coId), JSON.stringify(state)); } catch (_) {}
  }
  function getUnitChoice(coId, unitId) {
    if (window.UnitServicePicker && window.UnitServicePicker.getChoice) {
      return window.UnitServicePicker.getChoice(coId, unitId);
    }
    const st = loadTripState(coId);
    return (st.units && st.units[unitId]) || 'hledsla';
  }

  async function fetchUnits(client) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return [];
    let all = [];
    let from = 0, pageSize = 1000;
    while (true) {
      // 2026-05-19: only 'active' counts toward the next-service total.
      // Was returning i_vinnslu + active = inflated counts (e.g. IKEA
      // showed 72 instead of 71 because of one in-workshop unit).
      const { data, error } = await sb.from('uttaeki')
        .select('id,serial,type,size,status')
        .eq('client', client)
        .eq('status', 'active')
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  let _lastKey = '';
  let _rendering = false;
  let _lastRender = 0;

  async function render() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    const coNafn = getCompanyName();
    if (!coId || !coNafn) return;

    const units = await fetchUnits(coNafn);
    const services = await loadServices();
    const tripState = loadTripState(coId);
    // 2026-05-19: defaults for in-service Fyrirtækjaþjónustu customers —
    //   Akstur:      3000 kr ex VSK (× 1 — multiplier 2 = 6000)
    //   Skýrslugerð: 3500 kr ex VSK
    // Only seeded when the entry is brand new (=== undefined). User can
    // clear them to 0 in the inputs if not applicable for a given trip.
    const driveCost      = (tripState.drive      != null) ? Number(tripState.drive)      : 3000;
    const skyrslugerdEx  = (tripState.skyrslugerd != null) ? Number(tripState.skyrslugerd) : 3500;

    // Aggregate by type+size, AND split count by chosen kind.
    // 2026-05-19: normalize type-family so "ABC Duft", "PFC Duft", and "Duft"
    // all bucket together — they are billed identically (the brand prefix is
    // just a label, the service price is the same Hleðsla/Yfirferð Duft).
    // Same for CO₂ vs "CO2", Léttvatn vs "ABF Léttvatn", etc.
    const agg = {};
    units.forEach(u => {
      const typeNorm = normalizeTypeFamily(u.type);
      const key = typeNorm + '|' + (u.size || '');
      if (!agg[key]) agg[key] = { key, type: typeNorm, size: u.size || '', hledsla: 0, yfirferd: 0, skip: 0 };
      const choice = getUnitChoice(coId, u.id);
      if (choice === 'hledsla') agg[key].hledsla++;
      else if (choice === 'yfirferd') agg[key].yfirferd++;
      else agg[key].skip++;
    });
    const groups = Object.values(agg)
      .filter(g => g.hledsla + g.yfirferd + g.skip > 0)
      .sort((a, b) => (b.hledsla + b.yfirferd) - (a.hledsla + a.yfirferd));

    let section = main.querySelector('#_ctc-section');
    if (!section) {
      section = document.createElement('div');
      section.id = '_ctc-section';
      section.style.cssText =
        'margin:22px 0 26px;padding:18px;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)';
      main.appendChild(section);
    }

    if (!groups.length) {
      section.innerHTML = '<div style="font-size:13px;color:#166534;font-weight:700">💵 Heildarkostnaður næstu þjónustu</div>' +
        '<div style="padding:14px 0;color:#94a3b8;font-style:italic">Engin skráð tæki — kostnaður er 0 kr.</div>';
      return;
    }

    let totalSubEx = 0;
    let totalVsk = 0;
    let unmatched = [];
    const rows = [];

    groups.forEach(g => {
      const matching = findMatchingServices(g.type, g.size, services);
      if (!matching.length && (g.hledsla > 0 || g.yfirferd > 0)) {
        // Fallback: try replacement product (Eldvarnateppi, Reykskynjari etc.)
        const replacement = findReplacementProduct(g.type, g.size, services);
        if (replacement) {
          const override = findOverride(coId, replacement.nafn);
          const unitPrice = override ? +override.price_ex_vat : +replacement.verd_an_vsk;
          const vskPct = override ? (+override.vsk_pct || 24) : (+replacement.vsk_prosenta || 24);
          const total = g.hledsla + g.yfirferd;
          const subEx = unitPrice * total;
          const vskKr = subEx * (vskPct / 100);
          totalSubEx += subEx;
          totalVsk += vskKr;
          rows.push('<tr>' +
            '<td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) +
              '<div style="font-size:11px;color:#64748b">' + esc(replacement.nafn) + '</div></td>' +
            '<td style="padding:7px 10px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums">' + total + '</td>' +
            '<td style="padding:7px 10px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#f3e8ff;color:#6b21a8">Vara</span></td>' +
            '<td style="padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums">' + fmtKr(unitPrice) +
              (override ? ' <span style="margin-left:4px;padding:1px 5px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;font-size:9px;font-weight:700">💰</span>' : '') + '</td>' +
            '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">' + vskPct + '%</td>' +
            '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(subEx) + '</td>' +
          '</tr>');
          return;
        }
        unmatched.push(g);
        rows.push('<tr><td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) + '</td>' +
          '<td colspan="5" style="padding:7px 10px;color:#dc2626;font-size:12px;font-style:italic">⚠ Engin matchandi þjónusta í verðlista</td></tr>');
        return;
      }
      // Each kind that has count > 0 gets its own row.
      [['hledsla', 'Hleðsla'], ['yfirferd', 'Yfirferð']].forEach(([kindKey, kindLabel]) => {
        const n = g[kindKey];
        if (!n) return;
        const product = pickByKind(matching, kindKey);
        if (!product) return;
        const override = findOverride(coId, product.nafn);
        const unitPrice = override ? +override.price_ex_vat : +product.verd_an_vsk;
        const vskPct = override ? (+override.vsk_pct || 24) : (+product.vsk_prosenta || 24);
        const subEx = unitPrice * n;
        const vskKr = subEx * (vskPct / 100);
        totalSubEx += subEx;
        totalVsk += vskKr;
        rows.push('<tr>' +
          '<td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) +
            '<div style="font-size:11px;color:#64748b">' + esc(product.nafn) + '</div></td>' +
          '<td style="padding:7px 10px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums">' + n + '</td>' +
          '<td style="padding:7px 10px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;' +
            (kindKey === 'hledsla' ? 'background:#dcfce7;color:#166534' : 'background:#dbeafe;color:#1e40af') + '">' +
            kindLabel + '</span></td>' +
          '<td style="padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums">' + fmtKr(unitPrice) +
            (override ? ' <span title="' + esc(override.notes || '') + '" style="margin-left:4px;padding:1px 5px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;font-size:9px;font-weight:700">💰</span>' : '') + '</td>' +
          '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">' + vskPct + '%</td>' +
          '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(subEx) + '</td>' +
        '</tr>');
      });
      if (g.skip > 0) {
        rows.push('<tr style="opacity:.55">' +
          '<td style="padding:5px 10px;font-size:12px;color:#94a3b8">' + esc(g.type) + ' / ' + esc(g.size) + '</td>' +
          '<td style="padding:5px 10px;text-align:center;font-size:12px;color:#94a3b8">' + g.skip + '</td>' +
          '<td style="padding:5px 10px"><span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;background:#f1f5f9;color:#64748b">Sleppt</span></td>' +
          '<td colspan="3" style="padding:5px 10px;color:#94a3b8;font-size:11px;font-style:italic">(Ekki í þessari ferð)</td>' +
        '</tr>');
      }
    });

    // Skýrslugerð row (3500 + VSK by default).
    const skyrsluVskPct = 24;
    const skyrsluVskKr = skyrslugerdEx * (skyrsluVskPct / 100);
    totalSubEx += skyrslugerdEx;
    totalVsk += skyrsluVskKr;
    rows.push(
      '<tr style="border-top:1px dashed #86efac;background:#f0fdf4">' +
        '<td colspan="3" style="padding:7px 10px;font-size:13px;color:#0f172a">📋 Skýrslugerð</td>' +
        '<td style="padding:7px 10px;text-align:right">' +
          '<input id="_ctc-skyrslu" type="number" min="0" step="1" value="' + Math.round(skyrslugerdEx) + '" ' +
          'style="width:90px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;font-variant-numeric:tabular-nums" placeholder="0"> kr' +
        '</td>' +
        '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">24%</td>' +
        '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(skyrslugerdEx) + '</td>' +
      '</tr>'
    );

    // Akstur row (3000 + VSK by default).
    const driveVskPct = 24;
    const driveVskKr = driveCost * (driveVskPct / 100);
    totalSubEx += driveCost;
    totalVsk += driveVskKr;
    rows.push(
      '<tr style="border-top:1px dashed #86efac;background:#f0fdf4">' +
        '<td colspan="3" style="padding:7px 10px;font-size:13px;color:#0f172a">🚗 Akstur</td>' +
        '<td style="padding:7px 10px;text-align:right">' +
          '<input id="_ctc-drive" type="number" min="0" step="1" value="' + Math.round(driveCost) + '" ' +
          'style="width:90px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;font-variant-numeric:tabular-nums" placeholder="0"> kr' +
        '</td>' +
        '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">24%</td>' +
        '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(driveCost) + '</td>' +
      '</tr>'
    );

    const totalInc = totalSubEx + totalVsk;
    const activeUnits = units.length - groups.reduce((s, g) => s + g.skip, 0);

    section.innerHTML =
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">' +
        '<div>' +
          '<div style="font-size:13px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:.05em">💵 Heildarkostnaður næstu þjónustu</div>' +
          '<div style="font-size:11px;color:#15803d;margin-top:2px">' + activeUnits + ' af ' + units.length + ' tæki í þessari ferð · Veldu Hleðsla / Yfirferð / Sleppa fyrir hvert tæki í töflunni að ofan</div>' +
        '</div>' +
        '<div style="font-size:24px;font-weight:800;color:#166534;font-variant-numeric:tabular-nums">' + fmtKr(totalInc) + '</div>' +
      '</div>' +
      '<div style="background:#fff;border:1px solid #86efac;border-radius:8px;overflow:hidden">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead style="background:#dcfce7"><tr>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Tegund / Stærð</th>' +
            '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;width:60px">Fjöldi</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;width:90px">Þjónusta</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Per stk</th>' +
            '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;width:50px">VSK</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Samtals</th>' +
          '</tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
          '<tfoot>' +
            '<tr style="border-top:2px solid #166534;background:#f0fdf4">' +
              '<td colspan="5" style="padding:8px 10px;font-size:12px;color:#475569;text-align:right">Án vsk:</td>' +
              '<td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">' + fmtKr(totalSubEx) + '</td>' +
            '</tr>' +
            '<tr><td colspan="5" style="padding:5px 10px;font-size:12px;color:#475569;text-align:right">VSK:</td>' +
              '<td style="padding:5px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(totalVsk) + '</td></tr>' +
            '<tr style="background:#dcfce7"><td colspan="5" style="padding:10px;font-size:14px;font-weight:800;color:#166534;text-align:right">SAMTALS M. VSK:</td>' +
              '<td style="padding:10px;text-align:right;font-weight:800;color:#166534;font-size:16px;font-variant-numeric:tabular-nums">' + fmtKr(totalInc) + '</td></tr>' +
          '</tfoot>' +
        '</table>' +
      '</div>' +
      (unmatched.length ? '<div style="margin-top:8px;padding:8px 10px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#78350f">⚠ ' + unmatched.length + ' tegund(ir) fundu ekki matchandi þjónustu í verðlista. Bæta við í <b>Vörur og þjónusta</b>.</div>' : '');

    // Wire driving input.
    const driveInp = section.querySelector('#_ctc-drive');
    if (driveInp) {
      const onDrive = () => {
        const v = parseFloat(driveInp.value) || 0;
        const st = loadTripState(coId);
        st.drive = v;
        saveTripState(coId, st);
        _lastKey = '';
        render();
      };
      driveInp.addEventListener('change', onDrive);
      driveInp.addEventListener('blur', onDrive);
    }
    // Wire Skýrslugerð input.
    const skyrsluInp = section.querySelector('#_ctc-skyrslu');
    if (skyrsluInp) {
      const onSkyrslu = () => {
        const v = parseFloat(skyrsluInp.value) || 0;
        const st = loadTripState(coId);
        st.skyrslugerd = v;
        saveTripState(coId, st);
        _lastKey = '';
        render();
      };
      skyrsluInp.addEventListener('change', onSkyrslu);
      skyrsluInp.addEventListener('blur', onSkyrslu);
    }
  }

  async function maybeRender() {
    if (_rendering) return;
    if (Date.now() - _lastRender < 800) return;
    const coId = getCompanyId();
    const coNafn = getCompanyName();
    if (!coId || !coNafn) return;
    const key = String(coId);
    if (key === _lastKey && document.getElementById('_ctc-section')) return;
    _lastKey = key;
    _rendering = true;
    try {
      await render();
      _lastRender = Date.now();
    } finally {
      _rendering = false;
    }
  }

  window.recomputeCompanyTotalCost = () => { _lastKey = ''; return maybeRender(); };

  function attach() {
    const main = document.getElementById('companies-main');
    const view = document.getElementById('view-companies');
    if (!main || !view) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver((muts) => {
      if (!view.classList.contains('active')) return;
      const allOurs = muts.every(m => {
        const t = m.target;
        return t && (t.id === '_ctc-section' || (t.closest && t.closest('#_ctc-section')));
      });
      if (allOurs) return;
      clearTimeout(_t);
      _t = setTimeout(maybeRender, 400);
    }).observe(main, { childList: true, subtree: true });
    setTimeout(maybeRender, 1500);
  }
  attach();

  console.log('[company-total-cost] v3 installed — per-unit aggregation');
})();
